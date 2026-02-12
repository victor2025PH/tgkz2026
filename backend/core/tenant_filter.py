"""
租戶過濾輔助模塊

提供簡單的方法為現有 SQL 查詢添加租戶隔離過濾
支持漸進式遷移：舊代碼無需大量修改即可添加過濾
"""

import os
import sys
from typing import Optional, Tuple, List, Any

# 嘗試導入租戶上下文
try:
    from core.tenant_context import get_current_tenant, get_user_id, TenantAwareQuery
    HAS_TENANT_CONTEXT = True
except ImportError:
    HAS_TENANT_CONTEXT = False
    get_current_tenant = lambda: None
    get_user_id = lambda: 'local_user'


# 需要租戶隔離的表列表
# 多用户一库方案：所有业务数据表按 owner_user_id 行级隔离
TENANT_ISOLATED_TABLES = {
    'accounts',
    'keyword_sets',
    'monitored_groups',
    'leads',
    'campaigns',
    'message_templates',
    'chat_templates',
    'trigger_rules',
    'extracted_members',
    'collected_users',
    'discovered_resources',
    'knowledge_items',
    'api_credentials',
    'unified_contacts',  # 发送控制台客户名单数据源，必须隔离
}


def is_electron_mode() -> bool:
    """檢查是否為 Electron 本地模式"""
    return os.environ.get('ELECTRON_MODE', 'false').lower() == 'true'


def get_owner_user_id() -> str:
    """
    獲取當前用戶 ID 用於數據過濾
    
    Returns:
        用戶 ID，Electron 模式返回 'local_user'
    """
    if is_electron_mode():
        return 'local_user'
    
    user_id = get_user_id()
    return user_id or 'local_user'


def should_apply_tenant_filter(table_name: str) -> bool:
    """
    檢查是否應該對指定表應用租戶過濾
    
    Args:
        table_name: 表名
    
    Returns:
        True 如果需要過濾，False 否則
    """
    # Electron 模式不需要過濾
    if is_electron_mode():
        return False
    
    # 檢查表是否在隔離列表中
    if table_name not in TENANT_ISOLATED_TABLES:
        return False
    
    # 檢查是否有有效的用戶上下文
    user_id = get_user_id()
    return bool(user_id)


def add_tenant_filter(
    query: str, 
    table_name: str,
    params: List[Any] = None,
    column_name: str = 'owner_user_id'
) -> Tuple[str, List[Any]]:
    """
    為 SQL 查詢添加租戶過濾條件
    
    這是主要的輔助函數，用於為現有查詢添加過濾
    
    Args:
        query: 原始 SQL 查詢
        table_name: 主表名（用於判斷是否需要過濾）
        params: 原始參數列表
        column_name: 過濾列名（默認 owner_user_id）
    
    Returns:
        (modified_query, params) 元組
    
    Example:
        # 原始查詢
        query = "SELECT * FROM accounts"
        params = []
        
        # 添加過濾
        query, params = add_tenant_filter(query, 'accounts', params)
        # 結果: "SELECT * FROM accounts WHERE owner_user_id = ?"
        # params: ['current_user_id']
    """
    if params is None:
        params = []
    else:
        params = list(params)  # 複製以避免修改原始列表
    
    # 檢查是否需要過濾
    if not should_apply_tenant_filter(table_name):
        return query, params
    
    # 獲取用戶 ID
    user_id = get_owner_user_id()
    
    # 構建過濾條件
    filter_condition = f"{column_name} = ?"
    
    # 檢查查詢是否已有 WHERE 子句
    query_upper = query.upper()
    
    if 'WHERE' in query_upper:
        # 在現有 WHERE 後添加 AND 條件
        # 找到 WHERE 的位置，然後在其後第一個有意義的條件後添加
        where_pos = query_upper.find('WHERE')
        
        # 簡單處理：在查詢末尾添加 AND（除非有 ORDER BY, GROUP BY, LIMIT 等）
        for clause in ['ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET']:
            clause_pos = query_upper.find(clause)
            if clause_pos > where_pos:
                # 在該子句前插入 AND 條件
                modified_query = (
                    query[:clause_pos] + 
                    f"AND {filter_condition} " + 
                    query[clause_pos:]
                )
                params.append(user_id)
                return modified_query, params
        
        # 沒有其他子句，直接在末尾添加
        modified_query = f"{query} AND {filter_condition}"
    else:
        # 沒有 WHERE，添加新的 WHERE 子句
        # 同樣需要處理 ORDER BY 等子句
        for clause in ['ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET']:
            clause_pos = query_upper.find(clause)
            if clause_pos > 0:
                modified_query = (
                    query[:clause_pos] + 
                    f"WHERE {filter_condition} " + 
                    query[clause_pos:]
                )
                params.append(user_id)
                return modified_query, params
        
        # 沒有其他子句
        modified_query = f"{query} WHERE {filter_condition}"
    
    params.append(user_id)
    return modified_query, params


def add_owner_to_data(
    data: dict, 
    table_name: str,
    column_name: str = 'owner_user_id'
) -> dict:
    """
    為插入數據添加 owner_user_id 字段
    
    Args:
        data: 要插入的數據字典
        table_name: 表名
        column_name: 列名
    
    Returns:
        修改後的數據字典
    """
    # 檢查是否需要添加
    if table_name not in TENANT_ISOLATED_TABLES:
        return data
    
    # 如果已有 owner_user_id，不覆蓋
    if column_name in data:
        return data
    
    # 添加 owner_user_id
    data = dict(data)  # 複製
    data[column_name] = get_owner_user_id()
    
    return data


class TenantFilterMixin:
    """
    租戶過濾 Mixin 類
    
    可以被 Database 類繼承以獲得租戶過濾能力
    
    Usage:
        class Database(TenantFilterMixin):
            async def get_all_accounts(self):
                query = "SELECT * FROM accounts ORDER BY id"
                query, params = self.apply_tenant_filter(query, 'accounts')
                cursor = await self.execute(query, params)
                ...
    """
    
    def apply_tenant_filter(
        self, 
        query: str, 
        table_name: str, 
        params: List[Any] = None
    ) -> Tuple[str, List[Any]]:
        """應用租戶過濾"""
        return add_tenant_filter(query, table_name, params)
    
    def add_owner(self, data: dict, table_name: str) -> dict:
        """為數據添加 owner"""
        return add_owner_to_data(data, table_name)


# 調試輔助函數
def debug_tenant_info():
    """打印當前租戶信息（調試用）"""
    print(f"[TenantFilter] Electron Mode: {is_electron_mode()}", file=sys.stderr)
    print(f"[TenantFilter] Current User ID: {get_owner_user_id()}", file=sys.stderr)
    
    tenant = get_current_tenant()
    if tenant:
        print(f"[TenantFilter] Tenant Context: {tenant}", file=sys.stderr)
    else:
        print(f"[TenantFilter] No tenant context", file=sys.stderr)
