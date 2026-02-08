"""
用戶表結構統一適配器
解決 auth/service.py 和 database.py 兩種表結構的兼容問題

優化點：
1. 單例模式避免重複檢測
2. 緩存 schema 信息提升性能
3. 統一的 UserDTO 數據格式
4. 完整的字段映射
"""

import os
import sqlite3
import logging
from enum import Enum
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from datetime import datetime

logger = logging.getLogger(__name__)


class SchemaType(Enum):
    """表結構類型"""
    SAAS = "saas"           # auth/service.py 格式
    LICENSE = "license"      # database.py 格式
    UNKNOWN = "unknown"


@dataclass
class UserDTO:
    """統一用戶數據模型"""
    user_id: str
    email: str = ""
    display_name: str = ""
    level: str = "free"
    expires_at: str = ""
    is_banned: bool = False
    telegram_id: str = ""
    telegram_username: str = ""
    created_at: str = ""
    last_login_at: str = ""
    total_spent: float = 0.0
    invite_code: str = ""
    total_invites: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """轉換為字典"""
        return {
            'userId': self.user_id,
            'email': self.email,
            'nickname': self.display_name,
            'level': self.level,
            'expiresAt': self.expires_at,
            'isBanned': 1 if self.is_banned else 0,
            'telegramId': self.telegram_id,
            'telegramUsername': self.telegram_username,
            'createdAt': self.created_at,
            'lastLoginAt': self.last_login_at,
            'totalSpent': self.total_spent,
            'inviteCode': self.invite_code,
            'totalInvites': self.total_invites
        }


class UserSchemaAdapter:
    """用戶表結構適配器 - 單例模式"""
    
    _instance = None
    _schema_cache: Dict[str, SchemaType] = {}
    _columns_cache: Dict[str, List[str]] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def get_db_path(self) -> str:
        """獲取數據庫路徑"""
        possible_paths = [
            os.environ.get('DATABASE_PATH', ''),
            '/app/data/tgmatrix.db',
            './data/tgmatrix.db',
            '../data/tgmatrix.db',
        ]
        
        for path in possible_paths:
            if path and os.path.exists(path):
                return path
        
        # 默認路徑
        default = '/app/data/tgmatrix.db' if os.path.exists('/app/data') else './data/tgmatrix.db'
        os.makedirs(os.path.dirname(default), exist_ok=True)
        return default
    
    def get_connection(self) -> sqlite3.Connection:
        """獲取數據庫連接"""
        conn = sqlite3.connect(self.get_db_path())
        conn.row_factory = sqlite3.Row
        return conn
    
    def detect_schema(self, conn: sqlite3.Connection = None) -> SchemaType:
        """檢測表結構類型"""
        db_path = self.get_db_path()
        
        # 檢查緩存
        if db_path in self._schema_cache:
            return self._schema_cache[db_path]
        
        close_conn = False
        if conn is None:
            conn = self.get_connection()
            close_conn = True
        
        try:
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(users)")
            columns = [col[1] for col in cursor.fetchall()]
            
            # 緩存列信息
            self._columns_cache[db_path] = columns
            
            if not columns:
                schema_type = SchemaType.UNKNOWN
            elif 'subscription_tier' in columns or 'subscription_expires' in columns:
                schema_type = SchemaType.SAAS
            elif 'membership_level' in columns or 'user_id' in columns:
                schema_type = SchemaType.LICENSE
            else:
                schema_type = SchemaType.UNKNOWN
            
            # 緩存結果
            self._schema_cache[db_path] = schema_type
            logger.info(f"Detected schema type: {schema_type.value} for {db_path}")
            
            return schema_type
            
        finally:
            if close_conn:
                conn.close()
    
    def get_columns(self, conn: sqlite3.Connection = None) -> List[str]:
        """獲取用戶表列名"""
        db_path = self.get_db_path()
        
        if db_path in self._columns_cache:
            return self._columns_cache[db_path]
        
        # 觸發檢測以填充緩存
        self.detect_schema(conn)
        return self._columns_cache.get(db_path, [])
    
    def get_user_select_query(self, schema_type: SchemaType = None) -> str:
        """獲取用戶列表查詢語句"""
        if schema_type is None:
            schema_type = self.detect_schema()
        
        if schema_type == SchemaType.SAAS:
            return '''
                SELECT 
                    id as user_id,
                    email,
                    COALESCE(display_name, username, telegram_username, '') as display_name,
                    COALESCE(subscription_tier, 'free') as level,
                    subscription_expires as expires_at,
                    CASE WHEN is_active = 0 THEN 1 ELSE 0 END as is_banned,
                    COALESCE(telegram_id, '') as telegram_id,
                    COALESCE(telegram_username, '') as telegram_username,
                    created_at,
                    last_login_at,
                    0 as total_spent,
                    '' as invite_code,
                    0 as total_invites
                FROM users
                ORDER BY created_at DESC
            '''
        elif schema_type == SchemaType.LICENSE:
            return '''
                SELECT 
                    user_id,
                    COALESCE(email, '') as email,
                    COALESCE(nickname, telegram_first_name, '') as display_name,
                    COALESCE(membership_level, 'bronze') as level,
                    expires_at,
                    COALESCE(is_banned, 0) as is_banned,
                    COALESCE(telegram_id, '') as telegram_id,
                    COALESCE(telegram_username, '') as telegram_username,
                    created_at,
                    last_login_at,
                    COALESCE(total_spent, 0) as total_spent,
                    COALESCE(invite_code, '') as invite_code,
                    COALESCE(total_invites, 0) as total_invites
                FROM users
                ORDER BY created_at DESC
            '''
        else:
            # 嘗試基本查詢
            return 'SELECT * FROM users ORDER BY created_at DESC'
    
    def normalize_user(self, row: sqlite3.Row) -> UserDTO:
        """將數據庫行轉換為統一的 UserDTO"""
        data = dict(row)
        
        return UserDTO(
            user_id=str(data.get('user_id', data.get('id', ''))),
            email=data.get('email', ''),
            display_name=data.get('display_name', data.get('nickname', '')),
            level=data.get('level', data.get('subscription_tier', data.get('membership_level', 'free'))),
            expires_at=str(data.get('expires_at', data.get('subscription_expires', ''))) if data.get('expires_at') or data.get('subscription_expires') else '',
            is_banned=bool(data.get('is_banned', 0)) or not bool(data.get('is_active', 1)),
            telegram_id=data.get('telegram_id', ''),
            telegram_username=data.get('telegram_username', ''),
            created_at=str(data.get('created_at', '')),
            last_login_at=str(data.get('last_login_at', '')) if data.get('last_login_at') else '',
            total_spent=float(data.get('total_spent', 0)),
            invite_code=data.get('invite_code', ''),
            total_invites=int(data.get('total_invites', 0))
        )
    
    def get_user_by_id(self, user_id: str, conn: sqlite3.Connection = None) -> Optional[UserDTO]:
        """根據 ID 獲取用戶"""
        close_conn = False
        if conn is None:
            conn = self.get_connection()
            close_conn = True
        
        try:
            schema_type = self.detect_schema(conn)
            cursor = conn.cursor()
            
            if schema_type == SchemaType.SAAS:
                cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
            else:
                cursor.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
            
            row = cursor.fetchone()
            if row:
                return self.normalize_user(row)
            return None
            
        finally:
            if close_conn:
                conn.close()
    
    def _has_both_schemas(self) -> bool:
        """檢查是否同時存在兩套 schema 的字段"""
        columns = self.get_columns()
        has_saas = 'subscription_tier' in columns and 'subscription_expires' in columns
        has_license = 'membership_level' in columns and 'expires_at' in columns
        return has_saas and has_license

    def get_update_expires_query(self, schema_type: SchemaType = None) -> tuple:
        """獲取更新到期時間的查詢語句和 ID 字段名
        
        🔧 修復：當兩套字段同時存在時，同步更新 subscription_expires 和 expires_at
        """
        if schema_type is None:
            schema_type = self.detect_schema()
        
        both = self._has_both_schemas()
        
        if schema_type == SchemaType.SAAS:
            if both:
                # 同步更新兩套字段，需要兩個 days 參數
                return ('''
                    UPDATE users SET 
                        subscription_expires = datetime(
                            CASE WHEN subscription_expires > datetime('now') 
                                 THEN subscription_expires 
                                 ELSE datetime('now') 
                            END,
                            '+' || ? || ' days'
                        ),
                        expires_at = datetime(
                            CASE WHEN COALESCE(expires_at, subscription_expires) > datetime('now') 
                                 THEN COALESCE(expires_at, subscription_expires) 
                                 ELSE datetime('now') 
                            END,
                            '+' || ? || ' days'
                        ),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', 'id', True)
            else:
                return ('''
                    UPDATE users SET 
                        subscription_expires = datetime(
                            CASE WHEN subscription_expires > datetime('now') 
                                 THEN subscription_expires 
                                 ELSE datetime('now') 
                            END,
                            '+' || ? || ' days'
                        ),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', 'id', False)
        else:
            return ('''
                UPDATE users SET 
                    expires_at = datetime(
                        CASE WHEN expires_at > datetime('now') 
                             THEN expires_at 
                             ELSE datetime('now') 
                        END,
                        '+' || ? || ' days'
                    ),
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            ''', 'user_id', False)
    
    def get_update_level_query(self, schema_type: SchemaType = None) -> tuple:
        """獲取更新等級的查詢語句和 ID 字段名
        
        🔧 修復：當兩套字段同時存在時，同步更新 subscription_tier 和 membership_level
        """
        if schema_type is None:
            schema_type = self.detect_schema()
        
        both = self._has_both_schemas()
        
        if schema_type == SchemaType.SAAS:
            if both:
                # 返回第三個元素 True 表示需要兩個 level 參數
                return ('UPDATE users SET subscription_tier = ?, membership_level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 'id', True)
            else:
                return ('UPDATE users SET subscription_tier = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 'id', False)
        else:
            if both:
                return ('UPDATE users SET membership_level = ?, subscription_tier = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', 'user_id', True)
            else:
                return ('UPDATE users SET membership_level = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', 'user_id', False)
    
    def get_update_ban_query(self, schema_type: SchemaType = None) -> tuple:
        """獲取封禁/解封的查詢語句和 ID 字段名"""
        if schema_type is None:
            schema_type = self.detect_schema()
        
        if schema_type == SchemaType.SAAS:
            # SAAS 格式使用 is_active（0=封禁, 1=正常）
            return ('UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 'id', True)
        else:
            # LICENSE 格式使用 is_banned（1=封禁, 0=正常）
            return ('UPDATE users SET is_banned = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', 'user_id', False)
    
    def get_user_count_query(self, schema_type: SchemaType = None) -> Dict[str, str]:
        """獲取用戶統計查詢"""
        if schema_type is None:
            schema_type = self.detect_schema()
        
        if schema_type == SchemaType.SAAS:
            return {
                'total': 'SELECT COUNT(*) as count FROM users',
                'today': "SELECT COUNT(*) as count FROM users WHERE date(created_at) = date('now')",
                'paid': "SELECT COUNT(*) as count FROM users WHERE subscription_tier NOT IN ('free', 'bronze', '')",
                'level_dist': 'SELECT COALESCE(subscription_tier, "free") as level, COUNT(*) as count FROM users GROUP BY subscription_tier'
            }
        else:
            return {
                'total': 'SELECT COUNT(*) as count FROM users',
                'today': "SELECT COUNT(*) as count FROM users WHERE date(created_at) = date('now')",
                'paid': "SELECT COUNT(*) as count FROM users WHERE membership_level NOT IN ('free', 'bronze', '')",
                'level_dist': 'SELECT COALESCE(membership_level, "bronze") as level, COUNT(*) as count FROM users GROUP BY membership_level'
            }
    
    def clear_cache(self):
        """清除緩存（數據庫結構變更後調用）"""
        self._schema_cache.clear()
        self._columns_cache.clear()
        logger.info("Schema cache cleared")


# 全局實例
user_adapter = UserSchemaAdapter()
