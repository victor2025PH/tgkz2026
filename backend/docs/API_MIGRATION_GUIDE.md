# API 層遷移指南

## 概述

本指南說明如何將現有 API 處理器從舊的 `owner_user_id` 過濾架構遷移到新的數據庫級隔離架構。

## 新架構優勢

| 特性 | 舊架構 | 新架構 |
|-----|-------|-------|
| 數據隔離 | 行級過濾（owner_user_id） | 數據庫級隔離 |
| 查詢複雜度 | 每個查詢需要添加過濾 | 無需額外過濾 |
| 安全性 | 依賴應用層過濾 | 物理隔離 |
| 性能 | 需要索引 owner_user_id | 無額外開銷 |

## 遷移步驟

### 1. 使用 TenantRequest 獲取上下文

**舊代碼：**
```python
async def my_handler(self, request):
    tenant = request.get('tenant')
    user_id = tenant.user_id if tenant else None
    
    if not user_id:
        return self._json_response({'success': False, 'error': '未登入'}, 401)
    
    # 使用 user_id 進行查詢
```

**新代碼：**
```python
from api.tenant_request import TenantRequest

async def my_handler(self, request):
    ctx = TenantRequest(request)
    
    if not ctx.is_authenticated:
        return web.json_response({'success': False, 'error': '未登入'}, status=401)
    
    user_id = ctx.user_id
    # ...
```

### 2. 使用 TenantDB 進行數據庫操作

**舊代碼：**
```python
# 直接使用 database 模組
from database import Database
db = Database()
accounts = await db.execute_query(
    "SELECT * FROM accounts WHERE owner_user_id = ?",
    (user_id,)
)
```

**新代碼：**
```python
from core.db_operations import TenantDB

db = TenantDB(user_id)
accounts = db.select('accounts').all()  # 無需過濾，已經是隔離的數據庫
```

### 3. 使用 @require_tenant 裝飾器

**簡化認證檢查：**
```python
from api.tenant_request import require_tenant, TenantRequest

@require_tenant
async def my_handler(self, request):
    ctx = TenantRequest(request)
    # 已經確保用戶已認證
    ...
```

### 4. 移除 owner_user_id 過濾

**舊代碼：**
```python
# 查詢
accounts = db.execute_query(
    "SELECT * FROM accounts WHERE owner_user_id = ? AND status = ?",
    (user_id, 'Online')
)

# 插入
db.execute_insert(
    "INSERT INTO accounts (phone, owner_user_id) VALUES (?, ?)",
    (phone, user_id)
)
```

**新代碼：**
```python
db = TenantDB(user_id)

# 查詢（無需 owner_user_id）
accounts = db.select('accounts').where(status='Online').all()

# 插入（無需 owner_user_id）
db.create('accounts', {'phone': phone})
```

## 常用操作對照表

| 操作 | 舊方式 | 新方式 |
|-----|-------|-------|
| 獲取用戶 ID | `request.get('tenant').user_id` | `TenantRequest(request).user_id` |
| 獲取租戶 DB | 無（使用全局 DB） | `ctx.tenant_db` |
| 獲取系統 DB | 無（使用全局 DB） | `ctx.system_db` |
| 查詢所有記錄 | `SELECT * FROM t WHERE owner_user_id = ?` | `db.select('t').all()` |
| 條件查詢 | `WHERE owner_user_id = ? AND status = ?` | `db.select('t').where(status=x).all()` |
| 插入記錄 | 需要添加 owner_user_id | `db.create('t', data)` |
| 更新記錄 | 需要添加 owner_user_id 條件 | `db.update_by_id('t', id, data)` |
| 刪除記錄 | 需要添加 owner_user_id 條件 | `db.delete_by_id('t', id)` |

## 向後兼容

現有代碼仍然可以工作：
- `request.get('tenant')` 仍然返回 TenantContext
- `owner_user_id` 字段仍然存在於數據庫中（用於遷移）
- 舊的查詢方式仍然有效

建議漸進式遷移：
1. 新功能使用新架構
2. 修復 bug 時順便遷移相關代碼
3. 定期批量遷移舊代碼

## 配額檢查

配額檢查仍然需要用戶 ID，但現在可以自動從上下文獲取：

**舊代碼：**
```python
owner_user_id = payload.get('ownerUserId')
quota_check = await self.check_quota('tg_accounts', 1, owner_user_id)
```

**新代碼：**
```python
# check_quota 現在可以自動獲取用戶 ID
quota_check = await self.check_quota('tg_accounts', 1)
# 或者明確指定
quota_check = await self.check_quota('tg_accounts', 1, ctx.user_id)
```

## 注意事項

1. **系統表 vs 租戶表**
   - 系統表（users, orders 等）使用 `system_db`
   - 租戶表（accounts, leads 等）使用 `tenant_db`
   - `TenantDB.select()` 會自動選擇正確的數據庫

2. **事務**
   - 跨數據庫事務不支持
   - 確保事務操作在同一個數據庫內

3. **遷移期間的數據**
   - 新用戶自動使用新架構
   - 舊用戶需要執行數據遷移
   - 遷移過程中兩種方式並存
