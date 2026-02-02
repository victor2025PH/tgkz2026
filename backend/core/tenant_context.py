"""
多租戶上下文管理

優化設計：
1. 請求級別的租戶隔離
2. 線程安全的上下文存儲
3. 自動注入用戶 ID 到查詢
4. 支持 Electron（單用戶）和 SaaS（多用戶）模式

🆕 v2.0 優化：
5. 統一表定義引用（從 tenant_schema 導入）
6. 改進錯誤處理（拋異常而非返回 None）
7. 類型安全增強
"""

import os
import contextvars
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime
import logging

# 導入統一表定義和異常
from .tenant_schema import TENANT_TABLES, SYSTEM_TABLES, is_tenant_table, is_system_table
from .tenant_exceptions import (
    TenantConnectionError,
    TenantContextError,
    TenantNotAuthenticatedError
)

logger = logging.getLogger(__name__)

# 上下文變量 - 線程安全
_current_tenant: contextvars.ContextVar[Optional['TenantContext']] = contextvars.ContextVar(
    'current_tenant', default=None
)


@dataclass
class TenantContext:
    """租戶上下文"""
    user_id: str = ""
    email: str = ""
    role: str = "free"
    subscription_tier: str = "free"
    
    # 配額
    max_accounts: int = 3
    max_api_calls: int = 1000
    
    # 請求信息
    request_id: str = ""
    ip_address: str = ""
    
    # 統計
    api_calls_today: int = 0
    accounts_count: int = 0
    
    # 時間戳
    created_at: datetime = field(default_factory=datetime.now)
    
    @property
    def is_authenticated(self) -> bool:
        return bool(self.user_id)
    
    @property
    def is_electron_mode(self) -> bool:
        """是否為 Electron 本地模式"""
        return os.environ.get('ELECTRON_MODE', 'false').lower() == 'true'
    
    @property
    def can_add_account(self) -> bool:
        """是否可以添加更多帳號"""
        if self.is_electron_mode:
            return True  # 本地版不限制
        return self.accounts_count < self.max_accounts
    
    @property
    def has_api_quota(self) -> bool:
        """是否還有 API 配額"""
        if self.is_electron_mode:
            return True
        if self.max_api_calls == -1:  # 無限
            return True
        return self.api_calls_today < self.max_api_calls
    
    def check_feature(self, feature: str) -> bool:
        """檢查功能權限"""
        if self.is_electron_mode:
            return True
        
        tier_features = {
            'free': ['basic_monitoring', 'basic_ai'],
            'basic': ['basic_monitoring', 'basic_ai', 'templates', 'data_export'],
            'pro': ['basic_monitoring', 'basic_ai', 'templates', 'data_export', 
                    'full_monitoring', 'advanced_ai', 'team', 'api_access', 'multi_role'],
            'enterprise': ['all']
        }
        
        features = tier_features.get(self.subscription_tier, [])
        return 'all' in features or feature in features


def get_current_tenant() -> Optional[TenantContext]:
    """獲取當前租戶上下文"""
    return _current_tenant.get()


def set_current_tenant(tenant: TenantContext) -> contextvars.Token:
    """設置當前租戶上下文"""
    return _current_tenant.set(tenant)


def clear_current_tenant(token: contextvars.Token = None):
    """清除當前租戶上下文"""
    if token:
        _current_tenant.reset(token)
    else:
        _current_tenant.set(None)


def get_user_id() -> str:
    """獲取當前用戶 ID"""
    tenant = get_current_tenant()
    if tenant:
        return tenant.user_id
    # Electron 模式使用默認用戶
    if os.environ.get('ELECTRON_MODE', 'false').lower() == 'true':
        return 'local_user'
    return ''


def require_tenant():
    """裝飾器：要求租戶上下文"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            tenant = get_current_tenant()
            if not tenant or not tenant.is_authenticated:
                # Electron 模式自動創建本地用戶上下文
                if os.environ.get('ELECTRON_MODE', 'false').lower() == 'true':
                    tenant = TenantContext(
                        user_id='local_user',
                        role='admin',
                        subscription_tier='enterprise',
                        max_accounts=9999,
                        max_api_calls=-1
                    )
                    set_current_tenant(tenant)
                else:
                    raise PermissionError("Authentication required")
            return await func(*args, **kwargs)
        return wrapper
    return decorator


class TenantAwareQuery:
    """
    租戶感知的查詢構建器
    
    自動為查詢添加 owner_user_id 過濾
    支持 Electron 本地模式（無限制）和 SaaS 多用戶模式（嚴格隔離）
    
    注意：此類主要用於向後兼容。新代碼應使用數據庫級隔離。
    """
    
    # 🆕 使用統一定義（從 tenant_schema 導入）
    # TENANT_TABLES 已在模組頂部導入
    
    def __init__(self, table_name: str):
        self.table = table_name
        self.conditions = []
        self.params = []
        self._tenant_applied = False
    
    def where(self, condition: str, *params):
        """添加條件"""
        self.conditions.append(condition)
        self.params.extend(params)
        return self
    
    def with_tenant(self, force: bool = False):
        """
        添加租戶過濾
        
        Args:
            force: 強制添加過濾，即使是 Electron 模式
        """
        # 避免重複添加
        if self._tenant_applied:
            return self
        
        # 檢查是否為需要隔離的表（使用統一定義）
        if self.table not in TENANT_TABLES:
            return self
        
        # 獲取當前租戶
        tenant = get_current_tenant()
        
        # Electron 本地模式不需要過濾（除非強制）
        if tenant and tenant.is_electron_mode and not force:
            return self
        
        # 獲取用戶 ID
        user_id = get_user_id()
        if user_id:
            # 使用 owner_user_id 字段
            self.conditions.append("owner_user_id = ?")
            self.params.append(user_id)
            self._tenant_applied = True
        
        return self
    
    def or_shared(self):
        """
        允許訪問共享數據（owner_user_id IS NULL 或 = 'shared'）
        用於系統級共享資源
        """
        if self._tenant_applied and self.conditions:
            # 修改最後一個條件為 OR 共享
            last_condition = self.conditions.pop()
            shared_condition = f"({last_condition} OR owner_user_id IS NULL OR owner_user_id = 'shared')"
            self.conditions.append(shared_condition)
        return self
    
    def select(self, columns: str = "*") -> tuple:
        """構建 SELECT 查詢"""
        sql = f"SELECT {columns} FROM {self.table}"
        if self.conditions:
            sql += " WHERE " + " AND ".join(self.conditions)
        return sql, tuple(self.params)
    
    def insert(self, data: Dict[str, Any]) -> tuple:
        """構建 INSERT 查詢，自動添加 owner_user_id"""
        # 檢查是否為需要隔離的表（使用統一定義）
        if self.table in TENANT_TABLES:
            user_id = get_user_id()
            if user_id and 'owner_user_id' not in data:
                data['owner_user_id'] = user_id
        
        columns = ", ".join(data.keys())
        placeholders = ", ".join(["?" for _ in data])
        sql = f"INSERT INTO {self.table} ({columns}) VALUES ({placeholders})"
        return sql, tuple(data.values())
    
    def update(self, data: Dict[str, Any]) -> tuple:
        """構建 UPDATE 查詢"""
        set_clause = ", ".join([f"{k} = ?" for k in data.keys()])
        sql = f"UPDATE {self.table} SET {set_clause}"
        params = list(data.values())
        
        if self.conditions:
            sql += " WHERE " + " AND ".join(self.conditions)
            params.extend(self.params)
        
        return sql, tuple(params)
    
    def delete(self) -> tuple:
        """構建 DELETE 查詢"""
        sql = f"DELETE FROM {self.table}"
        if self.conditions:
            sql += " WHERE " + " AND ".join(self.conditions)
        return sql, tuple(self.params)
    
    def count(self) -> tuple:
        """構建 COUNT 查詢"""
        sql = f"SELECT COUNT(*) as count FROM {self.table}"
        if self.conditions:
            sql += " WHERE " + " AND ".join(self.conditions)
        return sql, tuple(self.params)


def tenant_query(table: str) -> TenantAwareQuery:
    """創建租戶感知查詢"""
    return TenantAwareQuery(table)


def with_tenant_filter(table: str, base_query: str, params: list = None) -> tuple:
    """
    為現有查詢添加租戶過濾
    
    Args:
        table: 表名
        base_query: 基礎 SQL 查詢
        params: 現有參數列表
    
    Returns:
        (modified_query, params) 元組
    
    注意：在數據庫級隔離架構下，此函數主要用於向後兼容。
    新代碼應該直接使用 get_tenant_connection() 獲取對應的數據庫連接。
    """
    if params is None:
        params = []
    
    # 檢查是否需要隔離（使用統一定義）
    if table not in TENANT_TABLES:
        return base_query, params
    
    # Electron 模式不過濾
    tenant = get_current_tenant()
    if tenant and tenant.is_electron_mode:
        return base_query, params
    
    # 獲取用戶 ID
    user_id = get_user_id()
    if not user_id:
        return base_query, params
    
    # 添加租戶過濾
    if 'WHERE' in base_query.upper():
        modified_query = base_query + " AND owner_user_id = ?"
    else:
        modified_query = base_query + " WHERE owner_user_id = ?"
    
    params.append(user_id)
    return modified_query, params


# ============ 🆕 數據庫級隔離支持 ============

def get_tenant_connection():
    """
    獲取當前租戶的數據庫連接
    
    🆕 數據庫級隔離：每個用戶使用獨立的數據庫文件
    
    Returns:
        sqlite3.Connection: 租戶專屬數據庫連接
    
    Raises:
        TenantConnectionError: 連接獲取失敗時
    
    Usage:
        conn = get_tenant_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM accounts")  # 無需 owner_user_id 過濾
    """
    try:
        from .tenant_database import get_tenant_db_manager
        manager = get_tenant_db_manager()
        tenant_id = get_user_id()
        
        if not tenant_id:
            raise TenantConnectionError(
                message="無法獲取租戶 ID，用戶未認證",
                tenant_id=None
            )
        
        conn = manager.get_tenant_connection(tenant_id)
        if conn is None:
            raise TenantConnectionError(
                message=f"無法獲取租戶數據庫連接",
                tenant_id=tenant_id
            )
        return conn
        
    except ImportError as e:
        logger.error(f"[TenantContext] tenant_database 模塊導入失敗: {e}")
        raise TenantConnectionError(
            message="租戶數據庫模塊未正確配置",
            details={"import_error": str(e)}
        )


def get_system_connection():
    """
    獲取系統數據庫連接
    
    系統數據庫存儲全局數據（用戶、訂單、卡密等）
    
    Returns:
        sqlite3.Connection: 系統數據庫連接
    
    Raises:
        TenantConnectionError: 連接獲取失敗時
    """
    try:
        from .tenant_database import get_tenant_db_manager
        manager = get_tenant_db_manager()
        conn = manager.get_system_connection()
        
        if conn is None:
            raise TenantConnectionError(
                message="無法獲取系統數據庫連接"
            )
        return conn
        
    except ImportError as e:
        logger.error(f"[TenantContext] tenant_database 模塊導入失敗: {e}")
        raise TenantConnectionError(
            message="系統數據庫模塊未正確配置",
            details={"import_error": str(e)}
        )


def get_connection_for_table(table_name: str):
    """
    根據表名自動選擇正確的數據庫連接
    
    Args:
        table_name: 表名
    
    Returns:
        sqlite3.Connection: 對應的數據庫連接
    
    Raises:
        TenantConnectionError: 連接獲取失敗時
    
    Usage:
        conn = get_connection_for_table('accounts')  # 返回租戶數據庫連接
        conn = get_connection_for_table('users')     # 返回系統數據庫連接
    """
    # 使用統一定義判斷表分類
    if is_system_table(table_name):
        return get_system_connection()
    else:
        return get_tenant_connection()
