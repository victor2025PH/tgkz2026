"""
多租戶上下文管理

優化設計：
1. 請求級別的租戶隔離
2. 線程安全的上下文存儲
3. 自動注入用戶 ID 到查詢
4. 支持 Electron（單用戶）和 SaaS（多用戶）模式
"""

import os
import contextvars
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime
import logging

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
    
    自動為查詢添加 user_id 過濾
    """
    
    def __init__(self, table_name: str):
        self.table = table_name
        self.conditions = []
        self.params = []
    
    def where(self, condition: str, *params):
        """添加條件"""
        self.conditions.append(condition)
        self.params.extend(params)
        return self
    
    def with_tenant(self):
        """添加租戶過濾"""
        user_id = get_user_id()
        if user_id:
            self.conditions.append("user_id = ?")
            self.params.append(user_id)
        return self
    
    def select(self, columns: str = "*") -> tuple:
        """構建 SELECT 查詢"""
        sql = f"SELECT {columns} FROM {self.table}"
        if self.conditions:
            sql += " WHERE " + " AND ".join(self.conditions)
        return sql, tuple(self.params)
    
    def insert(self, data: Dict[str, Any]) -> tuple:
        """構建 INSERT 查詢，自動添加 user_id"""
        user_id = get_user_id()
        if user_id and 'user_id' not in data:
            data['user_id'] = user_id
        
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


def tenant_query(table: str) -> TenantAwareQuery:
    """創建租戶感知查詢"""
    return TenantAwareQuery(table)
