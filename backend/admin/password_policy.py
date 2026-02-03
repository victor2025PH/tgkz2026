"""
密碼策略模塊
強制密碼修改、強度校驗、歷史記錄

優化點：
1. 可配置的密碼規則
2. 常見弱密碼檢測
3. 密碼歷史防重用
4. 密碼過期策略（可選）
"""

import os
import re
import hashlib
import sqlite3
import logging
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


# 常見弱密碼列表
WEAK_PASSWORDS = {
    'password', 'password123', '123456', '12345678', '123456789',
    'qwerty', 'abc123', '111111', 'admin', 'admin123', 'admin888',
    'root', 'root123', 'test', 'test123', 'guest', 'master',
    'letmein', 'welcome', 'monkey', 'dragon', 'shadow', 'sunshine',
    '1234567890', 'iloveyou', 'trustno1', 'princess', 'password1',
    'qwerty123', 'tgai', 'tgai123', 'tgai888', 'tgmatrix'
}


@dataclass
class PasswordPolicy:
    """密碼策略配置"""
    min_length: int = 8
    max_length: int = 128
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_digit: bool = True
    require_special: bool = False
    special_chars: str = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    min_strength_score: int = 3
    password_history_count: int = 5  # 防止重用最近 N 個密碼
    password_expires_days: int = 0   # 0 表示不過期
    
    def to_dict(self) -> Dict:
        return {
            'min_length': self.min_length,
            'max_length': self.max_length,
            'require_uppercase': self.require_uppercase,
            'require_lowercase': self.require_lowercase,
            'require_digit': self.require_digit,
            'require_special': self.require_special,
            'special_chars': self.special_chars
        }


@dataclass
class PasswordValidationResult:
    """密碼驗證結果"""
    is_valid: bool
    strength_score: int
    strength_label: str  # weak / medium / strong
    errors: List[str]
    suggestions: List[str]
    
    def to_dict(self) -> Dict:
        return {
            'is_valid': self.is_valid,
            'strength_score': self.strength_score,
            'strength_label': self.strength_label,
            'errors': self.errors,
            'suggestions': self.suggestions
        }


class PasswordValidator:
    """密碼驗證器"""
    
    def __init__(self, policy: PasswordPolicy = None):
        self.policy = policy or PasswordPolicy()
    
    def validate(self, password: str, username: str = "") -> PasswordValidationResult:
        """
        驗證密碼
        
        返回：
            PasswordValidationResult 包含驗證結果和建議
        """
        errors = []
        suggestions = []
        score = 0
        
        # 基本長度檢查
        if len(password) < self.policy.min_length:
            errors.append(f"密碼長度至少 {self.policy.min_length} 個字符")
        elif len(password) >= 12:
            score += 1
        elif len(password) >= 16:
            score += 2
        
        if len(password) > self.policy.max_length:
            errors.append(f"密碼長度不能超過 {self.policy.max_length} 個字符")
        
        # 複雜度檢查
        has_upper = bool(re.search(r'[A-Z]', password))
        has_lower = bool(re.search(r'[a-z]', password))
        has_digit = bool(re.search(r'\d', password))
        has_special = bool(re.search(f'[{re.escape(self.policy.special_chars)}]', password))
        
        if self.policy.require_uppercase and not has_upper:
            errors.append("需要包含至少一個大寫字母")
        elif has_upper:
            score += 1
        
        if self.policy.require_lowercase and not has_lower:
            errors.append("需要包含至少一個小寫字母")
        elif has_lower:
            score += 1
        
        if self.policy.require_digit and not has_digit:
            errors.append("需要包含至少一個數字")
        elif has_digit:
            score += 1
        
        if self.policy.require_special and not has_special:
            errors.append(f"需要包含至少一個特殊字符 ({self.policy.special_chars})")
        elif has_special:
            score += 1
        
        # 弱密碼檢測
        if password.lower() in WEAK_PASSWORDS:
            errors.append("密碼過於常見，請使用更複雜的密碼")
        
        # 與用戶名相似檢測
        if username and username.lower() in password.lower():
            errors.append("密碼不能包含用戶名")
        
        # 連續字符檢測
        if self._has_sequential_chars(password):
            suggestions.append("避免使用連續字符（如 abc, 123）")
        
        # 重複字符檢測
        if self._has_repeated_chars(password):
            suggestions.append("避免過多重複字符（如 aaa, 111）")
        
        # 建議
        if not has_special:
            suggestions.append("添加特殊字符可以提高安全性")
        if len(password) < 12:
            suggestions.append("使用更長的密碼可以提高安全性")
        
        # 確定強度標籤
        if score <= 2:
            strength_label = "weak"
        elif score <= 4:
            strength_label = "medium"
        else:
            strength_label = "strong"
        
        # 如果有錯誤，標記為無效
        is_valid = len(errors) == 0 and score >= self.policy.min_strength_score
        
        return PasswordValidationResult(
            is_valid=is_valid,
            strength_score=score,
            strength_label=strength_label,
            errors=errors,
            suggestions=suggestions
        )
    
    def _has_sequential_chars(self, password: str, min_length: int = 3) -> bool:
        """檢測連續字符"""
        password_lower = password.lower()
        
        # 字母序列
        for i in range(len(password_lower) - min_length + 1):
            seq = password_lower[i:i + min_length]
            if seq in 'abcdefghijklmnopqrstuvwxyz':
                return True
            if seq in 'zyxwvutsrqponmlkjihgfedcba':
                return True
        
        # 數字序列
        for i in range(len(password) - min_length + 1):
            seq = password[i:i + min_length]
            if seq in '0123456789':
                return True
            if seq in '9876543210':
                return True
        
        return False
    
    def _has_repeated_chars(self, password: str, min_repeat: int = 3) -> bool:
        """檢測重複字符"""
        for i in range(len(password) - min_repeat + 1):
            if len(set(password[i:i + min_repeat])) == 1:
                return True
        return False
    
    def hash_password(self, password: str) -> str:
        """哈希密碼"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def verify_password(self, password: str, password_hash: str) -> bool:
        """驗證密碼"""
        return self.hash_password(password) == password_hash


class PasswordHistoryManager:
    """密碼歷史管理器"""
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or self._get_db_path()
        self._init_table()
    
    def _get_db_path(self) -> str:
        possible_paths = [
            os.environ.get('DATABASE_PATH', ''),
            '/app/data/tgmatrix.db',
            './data/tgmatrix.db',
        ]
        for path in possible_paths:
            if path and os.path.exists(path):
                return path
        return possible_paths[1] if os.path.exists('/app/data') else possible_paths[2]
    
    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _init_table(self):
        """初始化密碼歷史表"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS admin_password_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    admin_id INTEGER NOT NULL,
                    password_hash TEXT NOT NULL,
                    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    changed_by_ip TEXT,
                    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
                )
            ''')
            
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_pwd_history_admin ON admin_password_history(admin_id)')
            
            # 確保 admins 表有必要的字段
            cursor.execute("PRAGMA table_info(admins)")
            columns = [col[1] for col in cursor.fetchall()]
            
            if 'must_change_password' not in columns:
                cursor.execute('ALTER TABLE admins ADD COLUMN must_change_password INTEGER DEFAULT 1')
                logger.info("Added must_change_password column to admins table")
            
            if 'password_changed_at' not in columns:
                cursor.execute('ALTER TABLE admins ADD COLUMN password_changed_at TIMESTAMP')
                logger.info("Added password_changed_at column to admins table")
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to init password history table: {e}")
    
    def add_to_history(self, admin_id: int, password_hash: str, ip_address: str = ""):
        """添加密碼到歷史記錄"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO admin_password_history (admin_id, password_hash, changed_by_ip)
                VALUES (?, ?, ?)
            ''', (admin_id, password_hash, ip_address))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to add password history: {e}")
    
    def check_history(self, admin_id: int, password_hash: str, count: int = 5) -> bool:
        """
        檢查密碼是否在歷史記錄中
        
        返回：True 表示密碼已被使用過
        """
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT password_hash FROM admin_password_history
                WHERE admin_id = ?
                ORDER BY changed_at DESC
                LIMIT ?
            ''', (admin_id, count))
            
            history = [row['password_hash'] for row in cursor.fetchall()]
            conn.close()
            
            return password_hash in history
            
        except Exception as e:
            logger.error(f"Failed to check password history: {e}")
            return False
    
    def update_admin_password(
        self,
        admin_id: int,
        new_password_hash: str,
        ip_address: str = "",
        clear_must_change: bool = True
    ):
        """更新管理員密碼"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            # 更新密碼
            if clear_must_change:
                cursor.execute('''
                    UPDATE admins SET 
                        password_hash = ?,
                        must_change_password = 0,
                        password_changed_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (new_password_hash, admin_id))
            else:
                cursor.execute('''
                    UPDATE admins SET 
                        password_hash = ?,
                        password_changed_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (new_password_hash, admin_id))
            
            # 添加到歷史
            cursor.execute('''
                INSERT INTO admin_password_history (admin_id, password_hash, changed_by_ip)
                VALUES (?, ?, ?)
            ''', (admin_id, new_password_hash, ip_address))
            
            conn.commit()
            conn.close()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to update admin password: {e}")
            return False
    
    def check_must_change(self, admin_id: int) -> bool:
        """檢查是否需要修改密碼"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('SELECT must_change_password FROM admins WHERE id = ?', (admin_id,))
            row = cursor.fetchone()
            conn.close()
            
            if row:
                return bool(row['must_change_password'])
            return True  # 默認需要修改
            
        except Exception as e:
            logger.error(f"Failed to check must_change: {e}")
            return True


# 全局實例
password_validator = PasswordValidator()
password_history = PasswordHistoryManager()
