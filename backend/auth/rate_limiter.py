"""
登入頻率限制服務

Phase 5 安全功能：
1. 防止暴力破解攻擊
2. IP 級別限制
3. 用戶級別限制
4. 自動解鎖機制

策略：
- 5 分鐘內最多 5 次失敗嘗試
- 超過後鎖定 15 分鐘
- 累計失敗次數影響鎖定時間
"""

import os
import logging
import sqlite3
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class LockoutReason(Enum):
    """鎖定原因"""
    TOO_MANY_ATTEMPTS = 'too_many_attempts'
    SUSPICIOUS_ACTIVITY = 'suspicious_activity'
    MANUAL_LOCK = 'manual_lock'


@dataclass
class RateLimitResult:
    """頻率限制檢查結果"""
    allowed: bool
    remaining_attempts: int
    lockout_until: Optional[datetime] = None
    lockout_seconds: int = 0
    reason: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            'allowed': self.allowed,
            'remaining_attempts': self.remaining_attempts,
            'lockout_until': self.lockout_until.isoformat() if self.lockout_until else None,
            'lockout_seconds': self.lockout_seconds,
            'reason': self.reason
        }


class RateLimiterService:
    """
    登入頻率限制服務
    
    實現多層防護：
    1. IP 級別限制 - 防止同一 IP 暴力破解
    2. 用戶級別限制 - 防止針對特定用戶的攻擊
    3. 全局限制 - 防止分佈式攻擊
    """
    
    # 配置參數（可通過環境變量覆蓋）
    MAX_ATTEMPTS = int(os.environ.get('RATE_LIMIT_MAX_ATTEMPTS', '5'))
    WINDOW_SECONDS = int(os.environ.get('RATE_LIMIT_WINDOW', '300'))  # 5 分鐘
    LOCKOUT_SECONDS = int(os.environ.get('RATE_LIMIT_LOCKOUT', '900'))  # 15 分鐘
    
    # 累計失敗的遞增鎖定時間
    LOCKOUT_MULTIPLIERS = [1, 2, 4, 8, 24]  # 15分, 30分, 1小時, 2小時, 6小時
    
    def __init__(self, db_path: str = None):
        """初始化服務（統一使用 tgmatrix.db）"""
        if db_path:
            self.db_path = db_path
        else:
            try:
                from config import DATABASE_PATH
                self.db_path = str(DATABASE_PATH)
            except ImportError:
                self.db_path = os.environ.get(
                    'DATABASE_PATH',
                    os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
                )
        self._init_db()
    
    def _get_db(self):
        """獲取數據庫連接"""
        db = sqlite3.connect(self.db_path)
        db.row_factory = sqlite3.Row
        return db
    
    def _init_db(self):
        """初始化數據庫表"""
        db = self._get_db()
        try:
            # 登入嘗試記錄表
            db.execute('''
                CREATE TABLE IF NOT EXISTS login_attempts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    identifier TEXT NOT NULL,
                    identifier_type TEXT NOT NULL,
                    success INTEGER DEFAULT 0,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 鎖定記錄表
            db.execute('''
                CREATE TABLE IF NOT EXISTS lockouts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    identifier TEXT NOT NULL,
                    identifier_type TEXT NOT NULL,
                    reason TEXT,
                    locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    unlock_at TIMESTAMP NOT NULL,
                    consecutive_lockouts INTEGER DEFAULT 1,
                    is_active INTEGER DEFAULT 1
                )
            ''')
            
            # 創建索引
            db.execute('CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON login_attempts(identifier, identifier_type)')
            db.execute('CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(created_at)')
            db.execute('CREATE INDEX IF NOT EXISTS idx_lockouts_identifier ON lockouts(identifier, identifier_type)')
            db.execute('CREATE INDEX IF NOT EXISTS idx_lockouts_active ON lockouts(is_active, unlock_at)')
            
            db.commit()
            logger.info("Rate limiter tables initialized")
        except Exception as e:
            logger.error(f"Failed to initialize rate limiter tables: {e}")
        finally:
            db.close()
    
    def check_rate_limit(
        self,
        identifier: str,
        identifier_type: str = 'ip'
    ) -> RateLimitResult:
        """
        檢查是否允許登入嘗試
        
        Args:
            identifier: 標識符（IP 或用戶 ID）
            identifier_type: 標識符類型 ('ip' 或 'user')
        
        Returns:
            RateLimitResult 對象
        """
        db = self._get_db()
        now = datetime.utcnow()
        
        try:
            # 1. 檢查是否被鎖定
            cursor = db.execute('''
                SELECT unlock_at, reason FROM lockouts
                WHERE identifier = ? AND identifier_type = ? 
                AND is_active = 1 AND unlock_at > ?
                ORDER BY unlock_at DESC LIMIT 1
            ''', (identifier, identifier_type, now.isoformat()))
            
            lockout = cursor.fetchone()
            if lockout:
                unlock_at = datetime.fromisoformat(lockout['unlock_at'])
                return RateLimitResult(
                    allowed=False,
                    remaining_attempts=0,
                    lockout_until=unlock_at,
                    lockout_seconds=int((unlock_at - now).total_seconds()),
                    reason=lockout['reason'] or '登入嘗試過多'
                )
            
            # 2. 計算時間窗口內的失敗次數
            window_start = (now - timedelta(seconds=self.WINDOW_SECONDS)).isoformat()
            
            cursor = db.execute('''
                SELECT COUNT(*) as count FROM login_attempts
                WHERE identifier = ? AND identifier_type = ?
                AND success = 0 AND created_at > ?
            ''', (identifier, identifier_type, window_start))
            
            row = cursor.fetchone()
            failed_attempts = row['count'] if row else 0
            
            remaining = max(0, self.MAX_ATTEMPTS - failed_attempts)
            
            return RateLimitResult(
                allowed=remaining > 0,
                remaining_attempts=remaining,
                reason='超過最大嘗試次數' if remaining == 0 else None
            )
            
        except Exception as e:
            logger.error(f"Rate limit check error: {e}")
            # 出錯時允許通過（fail open）
            return RateLimitResult(allowed=True, remaining_attempts=self.MAX_ATTEMPTS)
        finally:
            db.close()
    
    def record_attempt(
        self,
        identifier: str,
        identifier_type: str = 'ip',
        success: bool = False,
        ip_address: str = None,
        user_agent: str = None
    ) -> RateLimitResult:
        """
        記錄登入嘗試
        
        Args:
            identifier: 標識符
            identifier_type: 標識符類型
            success: 是否成功
            ip_address: IP 地址
            user_agent: User-Agent
        
        Returns:
            更新後的限制狀態
        """
        db = self._get_db()
        now = datetime.utcnow()
        
        try:
            # 記錄嘗試
            db.execute('''
                INSERT INTO login_attempts 
                (identifier, identifier_type, success, ip_address, user_agent, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                identifier, identifier_type, 1 if success else 0,
                ip_address, user_agent, now.isoformat()
            ))
            
            if success:
                # 成功登入，清除鎖定
                db.execute('''
                    UPDATE lockouts SET is_active = 0
                    WHERE identifier = ? AND identifier_type = ? AND is_active = 1
                ''', (identifier, identifier_type))
                db.commit()
                return RateLimitResult(allowed=True, remaining_attempts=self.MAX_ATTEMPTS)
            
            # 失敗登入，檢查是否需要鎖定
            window_start = (now - timedelta(seconds=self.WINDOW_SECONDS)).isoformat()
            
            cursor = db.execute('''
                SELECT COUNT(*) as count FROM login_attempts
                WHERE identifier = ? AND identifier_type = ?
                AND success = 0 AND created_at > ?
            ''', (identifier, identifier_type, window_start))
            
            row = cursor.fetchone()
            failed_attempts = row['count'] if row else 0
            
            if failed_attempts >= self.MAX_ATTEMPTS:
                # 觸發鎖定
                lockout_result = self._create_lockout(db, identifier, identifier_type, now)
                db.commit()
                return lockout_result
            
            db.commit()
            
            remaining = max(0, self.MAX_ATTEMPTS - failed_attempts)
            return RateLimitResult(
                allowed=remaining > 0,
                remaining_attempts=remaining
            )
            
        except Exception as e:
            logger.error(f"Record attempt error: {e}")
            return RateLimitResult(allowed=True, remaining_attempts=self.MAX_ATTEMPTS)
        finally:
            db.close()
    
    def _create_lockout(
        self,
        db,
        identifier: str,
        identifier_type: str,
        now: datetime
    ) -> RateLimitResult:
        """
        創建鎖定記錄
        
        使用遞增鎖定時間策略
        """
        # 查詢連續鎖定次數
        cursor = db.execute('''
            SELECT consecutive_lockouts FROM lockouts
            WHERE identifier = ? AND identifier_type = ?
            ORDER BY locked_at DESC LIMIT 1
        ''', (identifier, identifier_type))
        
        row = cursor.fetchone()
        consecutive = (row['consecutive_lockouts'] if row else 0) + 1
        
        # 計算鎖定時間（使用遞增策略）
        multiplier_index = min(consecutive - 1, len(self.LOCKOUT_MULTIPLIERS) - 1)
        multiplier = self.LOCKOUT_MULTIPLIERS[multiplier_index]
        lockout_seconds = self.LOCKOUT_SECONDS * multiplier
        
        unlock_at = now + timedelta(seconds=lockout_seconds)
        
        # 創建鎖定記錄
        db.execute('''
            INSERT INTO lockouts 
            (identifier, identifier_type, reason, locked_at, unlock_at, consecutive_lockouts, is_active)
            VALUES (?, ?, ?, ?, ?, ?, 1)
        ''', (
            identifier, identifier_type,
            LockoutReason.TOO_MANY_ATTEMPTS.value,
            now.isoformat(), unlock_at.isoformat(), consecutive
        ))
        
        logger.warning(f"Lockout created for {identifier_type}:{identifier}, duration: {lockout_seconds}s, consecutive: {consecutive}")
        
        return RateLimitResult(
            allowed=False,
            remaining_attempts=0,
            lockout_until=unlock_at,
            lockout_seconds=lockout_seconds,
            reason=f'登入嘗試過多，請 {lockout_seconds // 60} 分鐘後再試'
        )
    
    def unlock(self, identifier: str, identifier_type: str = 'ip') -> bool:
        """
        手動解鎖
        
        Returns:
            是否成功
        """
        db = self._get_db()
        try:
            result = db.execute('''
                UPDATE lockouts SET is_active = 0
                WHERE identifier = ? AND identifier_type = ? AND is_active = 1
            ''', (identifier, identifier_type))
            db.commit()
            
            if result.rowcount > 0:
                logger.info(f"Manually unlocked {identifier_type}:{identifier}")
                return True
            return False
        finally:
            db.close()
    
    def get_lockout_status(
        self,
        identifier: str,
        identifier_type: str = 'ip'
    ) -> Optional[Dict[str, Any]]:
        """
        獲取鎖定狀態
        """
        db = self._get_db()
        now = datetime.utcnow()
        
        try:
            cursor = db.execute('''
                SELECT locked_at, unlock_at, reason, consecutive_lockouts
                FROM lockouts
                WHERE identifier = ? AND identifier_type = ? 
                AND is_active = 1 AND unlock_at > ?
                ORDER BY unlock_at DESC LIMIT 1
            ''', (identifier, identifier_type, now.isoformat()))
            
            row = cursor.fetchone()
            if row:
                unlock_at = datetime.fromisoformat(row['unlock_at'])
                return {
                    'is_locked': True,
                    'locked_at': row['locked_at'],
                    'unlock_at': row['unlock_at'],
                    'remaining_seconds': int((unlock_at - now).total_seconds()),
                    'reason': row['reason'],
                    'consecutive_lockouts': row['consecutive_lockouts']
                }
            
            return {'is_locked': False}
            
        finally:
            db.close()
    
    def cleanup_old_records(self, days: int = 7) -> int:
        """
        清理舊記錄
        
        Args:
            days: 保留天數
        
        Returns:
            清理的記錄數
        """
        db = self._get_db()
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        try:
            # 清理舊的嘗試記錄
            result = db.execute('''
                DELETE FROM login_attempts WHERE created_at < ?
            ''', (cutoff,))
            attempts_deleted = result.rowcount
            
            # 清理舊的鎖定記錄
            result = db.execute('''
                DELETE FROM lockouts WHERE unlock_at < ? AND is_active = 0
            ''', (cutoff,))
            lockouts_deleted = result.rowcount
            
            db.commit()
            
            total = attempts_deleted + lockouts_deleted
            if total > 0:
                logger.info(f"Cleaned up {total} old rate limit records")
            return total
            
        finally:
            db.close()


# 全局服務實例
_rate_limiter: Optional[RateLimiterService] = None


def get_rate_limiter() -> RateLimiterService:
    """獲取全局頻率限制服務"""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = RateLimiterService()
    return _rate_limiter
