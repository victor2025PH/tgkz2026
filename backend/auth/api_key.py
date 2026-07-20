"""
API 密鑰管理

優化設計：
1. 安全的密鑰生成和存儲
2. 權限範圍控制
3. 使用量追蹤
4. 過期和撤銷機制
"""

import os
import secrets
import hashlib
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from enum import Enum

# 🔧 合法連接模塊（見 .cursorrules 合法連接模塊清單）：
# 同步輔助查詢統一經由 core.db_utils，不再直接 sqlite3.connect()。
from core.db_utils import get_connection, resolve_db_path

logger = logging.getLogger(__name__)


class ApiKeyScope(str, Enum):
    """API 密鑰權限範圍"""
    READ = 'read'              # 只讀
    WRITE = 'write'            # 讀寫
    ACCOUNTS = 'accounts'      # 帳號管理
    MESSAGES = 'messages'      # 消息發送
    MONITORING = 'monitoring'  # 監控功能
    ALL = 'all'                # 全部權限


@dataclass
class ApiKey:
    """API 密鑰"""
    id: str
    user_id: str
    name: str
    key_prefix: str  # 密鑰前綴（用於識別）
    key_hash: str    # 密鑰哈希（用於驗證）
    scopes: List[str] = field(default_factory=list)
    last_used: str = ''
    usage_count: int = 0
    created_at: str = ''
    expires_at: str = ''  # 空表示永不過期
    is_active: bool = True
    
    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'name': self.name,
            'key_prefix': self.key_prefix,
            'scopes': self.scopes,
            'last_used': self.last_used,
            'usage_count': self.usage_count,
            'created_at': self.created_at,
            'expires_at': self.expires_at,
            'is_active': self.is_active
        }


class ApiKeyService:
    """API 密鑰服務"""
    
    # 密鑰格式：tgm_前綴 + 隨機字符
    KEY_PREFIX = 'tgm_'
    KEY_LENGTH = 32
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or resolve_db_path()
        self._init_db()

    def _init_db(self):
        """初始化數據庫表"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            
            with get_connection(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS api_keys (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        key_prefix TEXT NOT NULL,
                        key_hash TEXT NOT NULL,
                        scopes TEXT,
                        last_used TEXT,
                        usage_count INTEGER DEFAULT 0,
                        created_at TEXT,
                        expires_at TEXT,
                        is_active INTEGER DEFAULT 1
                    )
                ''')
                
                # 🔧 Bug 修復：舊資料庫可能已被 auth/service.py 的舊版 schema
                # （欄位為 prefix/last_used_at，且無 usage_count）搶先建表——
                # CREATE TABLE IF NOT EXISTS 對已存在的表是 no-op，所以這裡自我修復欄位名稱，
                # 確保無論哪個模塊先初始化，最終欄位都與本檔案的 CRUD 邏輯一致。
                self._migrate_legacy_columns(conn, cursor)
                
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_apikeys_user ON api_keys(user_id)')
                cursor.execute('CREATE INDEX IF NOT EXISTS idx_apikeys_prefix ON api_keys(key_prefix)')
                
                conn.commit()
        except Exception as e:
            logger.error(f"API Key DB init error: {e}")

    def _migrate_legacy_columns(self, conn, cursor):
        """
        遷移舊版 api_keys 表結構

        既有 bug：auth/service.py 曾用不同欄位名稱建立同一張表
        （prefix 對應本檔案的 key_prefix；last_used_at 對應 last_used；
        且缺少 usage_count），若該版本先初始化，本檔案的 create()/verify()
        會因欄位不存在而報錯。這裡用 ALTER TABLE ... RENAME COLUMN
        （SQLite 3.25+）就地遷移，不重建表、不影響既有資料，且冪等可重複執行。
        """
        try:
            cursor.execute("PRAGMA table_info(api_keys)")
            columns = {row[1] for row in cursor.fetchall()}
            
            if 'prefix' in columns and 'key_prefix' not in columns:
                cursor.execute('ALTER TABLE api_keys RENAME COLUMN prefix TO key_prefix')
                logger.info("API Key DB 遷移：prefix -> key_prefix")
                columns.discard('prefix')
                columns.add('key_prefix')
            
            if 'last_used_at' in columns and 'last_used' not in columns:
                cursor.execute('ALTER TABLE api_keys RENAME COLUMN last_used_at TO last_used')
                logger.info("API Key DB 遷移：last_used_at -> last_used")
                columns.discard('last_used_at')
                columns.add('last_used')
            
            if 'usage_count' not in columns:
                cursor.execute('ALTER TABLE api_keys ADD COLUMN usage_count INTEGER DEFAULT 0')
                logger.info("API Key DB 遷移：新增 usage_count 欄位")
            
            conn.commit()
        except Exception as e:
            logger.error(f"API Key DB legacy column migration error: {e}")
    
    # ==================== 密鑰生成 ====================
    
    def generate_key(self) -> str:
        """生成新的 API 密鑰"""
        random_part = secrets.token_urlsafe(self.KEY_LENGTH)
        return f"{self.KEY_PREFIX}{random_part}"
    
    def hash_key(self, key: str) -> str:
        """哈希 API 密鑰"""
        return hashlib.sha256(key.encode()).hexdigest()
    
    def get_prefix(self, key: str) -> str:
        """獲取密鑰前綴（用於識別）"""
        # 返回 tgm_ + 前 8 個字符
        if key.startswith(self.KEY_PREFIX):
            return key[:12]  # tgm_ + 8 chars
        return key[:8]
    
    # ==================== 密鑰管理 ====================
    
    async def create(
        self,
        user_id: str,
        name: str,
        scopes: List[str] = None,
        expires_in_days: int = None
    ) -> Dict[str, Any]:
        """
        創建 API 密鑰
        
        注意：返回的密鑰只會顯示一次，之後無法再獲取
        """
        import uuid
        import json
        
        # 生成密鑰
        key = self.generate_key()
        key_hash = self.hash_key(key)
        key_prefix = self.get_prefix(key)
        
        now = datetime.utcnow()
        expires_at = ''
        if expires_in_days:
            expires_at = (now + timedelta(days=expires_in_days)).isoformat()
        
        api_key = ApiKey(
            id=f"key_{uuid.uuid4().hex[:12]}",
            user_id=user_id,
            name=name,
            key_prefix=key_prefix,
            key_hash=key_hash,
            scopes=scopes or [ApiKeyScope.READ.value],
            created_at=now.isoformat(),
            expires_at=expires_at
        )
        
        try:
            with get_connection(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO api_keys 
                    (id, user_id, name, key_prefix, key_hash, scopes, 
                     usage_count, created_at, expires_at, is_active)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    api_key.id, api_key.user_id, api_key.name,
                    api_key.key_prefix, api_key.key_hash,
                    json.dumps(api_key.scopes), 0,
                    api_key.created_at, api_key.expires_at, 1
                ))
                
                conn.commit()
            
            # 返回完整密鑰（只這一次）
            return {
                'success': True,
                'key': key,  # 完整密鑰，只顯示一次
                'api_key': api_key.to_dict()
            }
        except Exception as e:
            logger.error(f"Create API key error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def verify(self, key: str) -> Optional[Dict[str, Any]]:
        """
        驗證 API 密鑰
        
        返回密鑰信息和用戶 ID，如果無效則返回 None
        """
        if not key or not key.startswith(self.KEY_PREFIX):
            return None
        
        key_hash = self.hash_key(key)
        key_prefix = self.get_prefix(key)
        
        try:
            import json
            with get_connection(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT id, user_id, name, scopes, expires_at, is_active
                    FROM api_keys 
                    WHERE key_hash = ? AND key_prefix = ?
                ''', (key_hash, key_prefix))
                
                row = cursor.fetchone()
                
                if not row:
                    return None
                
                key_id, user_id, name, scopes_json, expires_at, is_active = row
                
                # 檢查是否激活
                if not is_active:
                    return None
                
                # 檢查是否過期
                if expires_at:
                    if datetime.fromisoformat(expires_at) < datetime.utcnow():
                        return None
                
                # 更新使用統計
                now = datetime.utcnow().isoformat()
                cursor.execute('''
                    UPDATE api_keys 
                    SET last_used = ?, usage_count = usage_count + 1 
                    WHERE id = ?
                ''', (now, key_id))
                
                conn.commit()
                
                return {
                    'id': key_id,
                    'user_id': user_id,
                    'name': name,
                    'scopes': json.loads(scopes_json) if scopes_json else []
                }
            
        except Exception as e:
            logger.error(f"Verify API key error: {e}")
            return None
    
    async def list_keys(self, user_id: str) -> List[ApiKey]:
        """列出用戶的 API 密鑰"""
        try:
            import json
            with get_connection(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT * FROM api_keys 
                    WHERE user_id = ? 
                    ORDER BY created_at DESC
                ''', (user_id,))
                
                keys = []
                for row in cursor.fetchall():
                    keys.append(ApiKey(
                        id=row['id'],
                        user_id=row['user_id'],
                        name=row['name'],
                        key_prefix=row['key_prefix'],
                        key_hash='',  # 不返回哈希
                        scopes=json.loads(row['scopes']) if row['scopes'] else [],
                        last_used=row['last_used'] or '',
                        usage_count=row['usage_count'] or 0,
                        created_at=row['created_at'] or '',
                        expires_at=row['expires_at'] or '',
                        is_active=bool(row['is_active'])
                    ))
                
                return keys
        except Exception as e:
            logger.error(f"List API keys error: {e}")
            return []
    
    async def revoke(self, user_id: str, key_id: str) -> Dict[str, Any]:
        """撤銷 API 密鑰"""
        try:
            with get_connection(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE api_keys 
                    SET is_active = 0 
                    WHERE id = ? AND user_id = ?
                ''', (key_id, user_id))
                
                updated = cursor.rowcount > 0
                conn.commit()
            
            if updated:
                return {'success': True}
            return {'success': False, 'error': '密鑰不存在'}
        except Exception as e:
            logger.error(f"Revoke API key error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def delete(self, user_id: str, key_id: str) -> Dict[str, Any]:
        """刪除 API 密鑰"""
        try:
            with get_connection(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    DELETE FROM api_keys 
                    WHERE id = ? AND user_id = ?
                ''', (key_id, user_id))
                
                deleted = cursor.rowcount > 0
                conn.commit()
            
            if deleted:
                return {'success': True}
            return {'success': False, 'error': '密鑰不存在'}
        except Exception as e:
            logger.error(f"Delete API key error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def update_scopes(
        self,
        user_id: str,
        key_id: str,
        scopes: List[str]
    ) -> Dict[str, Any]:
        """更新密鑰權限範圍"""
        try:
            import json
            with get_connection(self.db_path) as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE api_keys 
                    SET scopes = ? 
                    WHERE id = ? AND user_id = ?
                ''', (json.dumps(scopes), key_id, user_id))
                
                updated = cursor.rowcount > 0
                conn.commit()
            
            if updated:
                return {'success': True}
            return {'success': False, 'error': '密鑰不存在'}
        except Exception as e:
            logger.error(f"Update API key scopes error: {e}")
            return {'success': False, 'error': str(e)}
    
    def has_scope(self, key_info: Dict, scope: str) -> bool:
        """檢查密鑰是否有指定權限"""
        scopes = key_info.get('scopes', [])
        
        # all 權限包含所有
        if ApiKeyScope.ALL.value in scopes:
            return True
        
        # write 包含 read
        if scope == ApiKeyScope.READ.value and ApiKeyScope.WRITE.value in scopes:
            return True
        
        return scope in scopes


# ==================== 單例訪問 ====================

_api_key_service: Optional[ApiKeyService] = None


def get_api_key_service() -> ApiKeyService:
    global _api_key_service
    if _api_key_service is None:
        _api_key_service = ApiKeyService()
    return _api_key_service
