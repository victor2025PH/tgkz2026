"""
設備會話管理服務

Phase 4 功能：
1. 記錄用戶登入的設備信息
2. 支持查看所有已登入設備
3. 支持登出指定設備
4. 新設備登入通知

安全特性：
1. 設備指紋識別
2. 地理位置記錄（基於 IP）
3. 可疑設備檢測
"""

import os
import hashlib
import secrets
import logging
import sqlite3
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)


class DeviceType(Enum):
    """設備類型"""
    DESKTOP = 'desktop'
    MOBILE = 'mobile'
    TABLET = 'tablet'
    UNKNOWN = 'unknown'


class SessionStatus(Enum):
    """會話狀態"""
    ACTIVE = 'active'
    EXPIRED = 'expired'
    REVOKED = 'revoked'


@dataclass
class DeviceSession:
    """設備會話數據"""
    id: str
    user_id: str
    device_id: str  # 設備唯一標識（指紋）
    device_name: str  # 設備名稱（如 "Chrome on Windows"）
    device_type: DeviceType
    ip_address: str
    location: Optional[str] = None  # 地理位置
    user_agent: Optional[str] = None
    last_active: Optional[datetime] = None
    created_at: Optional[datetime] = None
    status: SessionStatus = SessionStatus.ACTIVE
    is_current: bool = False  # 是否為當前設備
    
    def to_dict(self) -> dict:
        """轉換為字典（用於 API 響應）"""
        return {
            'id': self.id,
            'device_id': self.device_id[:8] + '...',  # 只顯示部分
            'device_name': self.device_name,
            'device_type': self.device_type.value,
            'ip_address': self._mask_ip(self.ip_address),
            'location': self.location or '未知',
            'last_active': self.last_active.isoformat() if self.last_active else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'status': self.status.value,
            'is_current': self.is_current
        }
    
    @staticmethod
    def _mask_ip(ip: str) -> str:
        """遮蔽 IP 地址部分信息"""
        if not ip:
            return '未知'
        parts = ip.split('.')
        if len(parts) == 4:
            return f"{parts[0]}.{parts[1]}.*.*"
        return ip[:len(ip)//2] + '***'


class DeviceSessionService:
    """
    設備會話管理服務
    
    功能：
    1. 創建設備會話
    2. 查詢用戶所有設備
    3. 撤銷指定設備會話
    4. 檢測新設備登入
    """
    
    # 會話有效期（天）
    SESSION_EXPIRY_DAYS = 30
    # 最大設備數量
    MAX_DEVICES_PER_USER = 10
    
    def __init__(self, db_path: str = None):
        """初始化服務"""
        self.db_path = db_path or os.environ.get(
            'AUTH_DB_PATH',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'auth.db')
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
            db.execute('''
                CREATE TABLE IF NOT EXISTS device_sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    device_id TEXT NOT NULL,
                    device_name TEXT,
                    device_type TEXT DEFAULT 'unknown',
                    ip_address TEXT,
                    location TEXT,
                    user_agent TEXT,
                    refresh_token_hash TEXT,
                    last_active TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP,
                    status TEXT DEFAULT 'active'
                )
            ''')
            
            # 創建索引
            db.execute('CREATE INDEX IF NOT EXISTS idx_device_sessions_user ON device_sessions(user_id)')
            db.execute('CREATE INDEX IF NOT EXISTS idx_device_sessions_device ON device_sessions(device_id)')
            db.execute('CREATE INDEX IF NOT EXISTS idx_device_sessions_status ON device_sessions(status)')
            
            db.commit()
            logger.info("Device sessions table initialized")
        except Exception as e:
            logger.error(f"Failed to initialize device_sessions table: {e}")
        finally:
            db.close()
    
    def create_session(
        self,
        user_id: str,
        ip_address: str = None,
        user_agent: str = None,
        refresh_token: str = None
    ) -> Tuple[DeviceSession, bool]:
        """
        創建設備會話
        
        Args:
            user_id: 用戶 ID
            ip_address: IP 地址
            user_agent: User-Agent
            refresh_token: Refresh Token（用於關聯會話）
        
        Returns:
            (DeviceSession, is_new_device) 元組
        """
        import uuid
        
        # 生成設備指紋
        device_id = self._generate_device_id(ip_address, user_agent)
        
        # 解析設備信息
        device_name, device_type = self._parse_user_agent(user_agent)
        
        # 檢查是否為新設備
        is_new_device = not self._device_exists(user_id, device_id)
        
        # 創建會話
        session_id = str(uuid.uuid4())
        now = datetime.utcnow()
        expires_at = now + timedelta(days=self.SESSION_EXPIRY_DAYS)
        
        # 計算 refresh_token 哈希（用於會話關聯）
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()[:32] if refresh_token else None
        
        session = DeviceSession(
            id=session_id,
            user_id=user_id,
            device_id=device_id,
            device_name=device_name,
            device_type=device_type,
            ip_address=ip_address or '',
            user_agent=user_agent,
            last_active=now,
            created_at=now,
            status=SessionStatus.ACTIVE
        )
        
        db = self._get_db()
        try:
            # 如果設備已存在，更新它
            if not is_new_device:
                db.execute('''
                    UPDATE device_sessions 
                    SET last_active = ?, ip_address = ?, status = ?, refresh_token_hash = ?
                    WHERE user_id = ? AND device_id = ? AND status = 'active'
                ''', (now.isoformat(), ip_address, 'active', token_hash, user_id, device_id))
            else:
                # 檢查設備數量限制
                self._enforce_device_limit(db, user_id)
                
                # 插入新會話
                db.execute('''
                    INSERT INTO device_sessions 
                    (id, user_id, device_id, device_name, device_type, ip_address, 
                     user_agent, refresh_token_hash, last_active, created_at, expires_at, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    session_id, user_id, device_id, device_name, device_type.value,
                    ip_address, user_agent, token_hash, now.isoformat(), now.isoformat(),
                    expires_at.isoformat(), 'active'
                ))
            
            db.commit()
            
            if is_new_device:
                logger.info(f"New device session created for user {user_id}: {device_name}")
            else:
                logger.debug(f"Device session updated for user {user_id}: {device_name}")
                
        except Exception as e:
            logger.error(f"Failed to create device session: {e}")
        finally:
            db.close()
        
        return session, is_new_device
    
    def get_user_devices(self, user_id: str, current_device_id: str = None) -> List[DeviceSession]:
        """
        獲取用戶所有設備
        
        Args:
            user_id: 用戶 ID
            current_device_id: 當前設備 ID（用於標記）
        """
        db = self._get_db()
        devices = []
        
        try:
            cursor = db.execute('''
                SELECT * FROM device_sessions
                WHERE user_id = ? AND status = 'active'
                ORDER BY last_active DESC
            ''', (user_id,))
            
            for row in cursor.fetchall():
                session = DeviceSession(
                    id=row['id'],
                    user_id=row['user_id'],
                    device_id=row['device_id'],
                    device_name=row['device_name'] or '未知設備',
                    device_type=DeviceType(row['device_type']) if row['device_type'] else DeviceType.UNKNOWN,
                    ip_address=row['ip_address'] or '',
                    location=row['location'],
                    user_agent=row['user_agent'],
                    last_active=datetime.fromisoformat(row['last_active']) if row['last_active'] else None,
                    created_at=datetime.fromisoformat(row['created_at']) if row['created_at'] else None,
                    status=SessionStatus(row['status']) if row['status'] else SessionStatus.ACTIVE,
                    is_current=(row['device_id'] == current_device_id) if current_device_id else False
                )
                devices.append(session)
                
        except Exception as e:
            logger.error(f"Failed to get user devices: {e}")
        finally:
            db.close()
        
        return devices
    
    def revoke_session(self, user_id: str, session_id: str) -> bool:
        """
        撤銷指定設備會話
        
        Args:
            user_id: 用戶 ID（用於權限驗證）
            session_id: 會話 ID
        
        Returns:
            是否成功
        """
        db = self._get_db()
        try:
            result = db.execute('''
                UPDATE device_sessions 
                SET status = 'revoked'
                WHERE id = ? AND user_id = ?
            ''', (session_id, user_id))
            db.commit()
            
            if result.rowcount > 0:
                logger.info(f"Session {session_id} revoked for user {user_id}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Failed to revoke session: {e}")
            return False
        finally:
            db.close()
    
    def revoke_all_other_sessions(self, user_id: str, current_session_id: str) -> int:
        """
        撤銷除當前設備外的所有會話
        
        Args:
            user_id: 用戶 ID
            current_session_id: 當前會話 ID（保留）
        
        Returns:
            撤銷的會話數量
        """
        db = self._get_db()
        try:
            result = db.execute('''
                UPDATE device_sessions 
                SET status = 'revoked'
                WHERE user_id = ? AND id != ? AND status = 'active'
            ''', (user_id, current_session_id))
            db.commit()
            
            count = result.rowcount
            if count > 0:
                logger.info(f"Revoked {count} sessions for user {user_id}")
            return count
            
        except Exception as e:
            logger.error(f"Failed to revoke other sessions: {e}")
            return 0
        finally:
            db.close()
    
    def update_last_active(self, user_id: str, device_id: str) -> None:
        """更新設備最後活躍時間"""
        db = self._get_db()
        try:
            db.execute('''
                UPDATE device_sessions 
                SET last_active = ?
                WHERE user_id = ? AND device_id = ? AND status = 'active'
            ''', (datetime.utcnow().isoformat(), user_id, device_id))
            db.commit()
        except Exception as e:
            logger.debug(f"Failed to update last active: {e}")
        finally:
            db.close()
    
    def _generate_device_id(self, ip_address: str, user_agent: str) -> str:
        """
        生成設備指紋
        
        基於 IP + User-Agent 的穩定哈希
        """
        data = f"{ip_address or 'unknown'}:{user_agent or 'unknown'}"
        return hashlib.sha256(data.encode()).hexdigest()[:32]
    
    def _parse_user_agent(self, user_agent: str) -> Tuple[str, DeviceType]:
        """
        解析 User-Agent 獲取設備信息
        
        Returns:
            (device_name, device_type) 元組
        """
        if not user_agent:
            return "未知設備", DeviceType.UNKNOWN
        
        ua = user_agent.lower()
        
        # 檢測設備類型
        if 'mobile' in ua or 'android' in ua or 'iphone' in ua:
            device_type = DeviceType.MOBILE
        elif 'tablet' in ua or 'ipad' in ua:
            device_type = DeviceType.TABLET
        else:
            device_type = DeviceType.DESKTOP
        
        # 檢測瀏覽器
        browser = "未知瀏覽器"
        if 'chrome' in ua and 'edg' not in ua:
            browser = "Chrome"
        elif 'firefox' in ua:
            browser = "Firefox"
        elif 'safari' in ua and 'chrome' not in ua:
            browser = "Safari"
        elif 'edg' in ua:
            browser = "Edge"
        elif 'opera' in ua or 'opr' in ua:
            browser = "Opera"
        
        # 檢測操作系統
        os_name = "未知系統"
        if 'windows' in ua:
            os_name = "Windows"
        elif 'mac os' in ua or 'macos' in ua:
            os_name = "macOS"
        elif 'linux' in ua and 'android' not in ua:
            os_name = "Linux"
        elif 'android' in ua:
            os_name = "Android"
        elif 'iphone' in ua or 'ipad' in ua:
            os_name = "iOS"
        
        device_name = f"{browser} on {os_name}"
        return device_name, device_type
    
    def _device_exists(self, user_id: str, device_id: str) -> bool:
        """檢查設備是否已存在"""
        db = self._get_db()
        try:
            cursor = db.execute('''
                SELECT 1 FROM device_sessions
                WHERE user_id = ? AND device_id = ? AND status = 'active'
                LIMIT 1
            ''', (user_id, device_id))
            return cursor.fetchone() is not None
        finally:
            db.close()
    
    def _enforce_device_limit(self, db, user_id: str) -> None:
        """強制執行設備數量限制"""
        cursor = db.execute('''
            SELECT COUNT(*) as count FROM device_sessions
            WHERE user_id = ? AND status = 'active'
        ''', (user_id,))
        
        row = cursor.fetchone()
        count = row['count'] if row else 0
        
        if count >= self.MAX_DEVICES_PER_USER:
            # 刪除最舊的設備
            db.execute('''
                UPDATE device_sessions 
                SET status = 'revoked'
                WHERE user_id = ? AND status = 'active'
                ORDER BY last_active ASC
                LIMIT 1
            ''', (user_id,))
            logger.info(f"Revoked oldest device for user {user_id} due to limit")
    
    def cleanup_expired(self) -> int:
        """清理過期會話"""
        db = self._get_db()
        try:
            result = db.execute('''
                UPDATE device_sessions 
                SET status = 'expired'
                WHERE expires_at < ? AND status = 'active'
            ''', (datetime.utcnow().isoformat(),))
            db.commit()
            
            count = result.rowcount
            if count > 0:
                logger.info(f"Expired {count} device sessions")
            return count
        finally:
            db.close()


# 全局服務實例
_device_session_service: Optional[DeviceSessionService] = None


def get_device_session_service() -> DeviceSessionService:
    """獲取全局設備會話服務"""
    global _device_session_service
    if _device_session_service is None:
        _device_session_service = DeviceSessionService()
    return _device_session_service
