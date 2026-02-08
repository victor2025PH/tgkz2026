# 數據庫合併方案：auth.db + tgmatrix.db

## 一、現狀分析

### 1.1 庫與用途

| 數據庫 | 路徑 | 使用者 | 主要表/用途 |
|--------|------|--------|-------------|
| **tgmatrix.db** | `/app/data/tgmatrix.db` | AuthService、database.py、admin、http_server | users, licenses, orders, accounts 等 |
| **auth.db** | `/app/data/auth.db` | device_session、rate_limiter、geo_security | login_tokens, rate_limits, trusted_devices 等 |

### 1.2 users 表結構差異

**Auth 期望（auth/service.py）：**
- `id` TEXT PRIMARY KEY（UUID）
- `email`, `username`, `password_hash`, `display_name`
- `subscription_tier`, `subscription_expires`
- `telegram_id`, `telegram_username` 等

**Database 期望（database.py）：**
- `id` INTEGER AUTOINCREMENT
- `user_id` TEXT UNIQUE（UUID）
- `nickname`, `membership_level`, `expires_at`, `is_lifetime`
- `invite_code`, `balance` 等

### 1.3 實際部署

- Docker：`DATABASE_PATH=/app/data/tgmatrix.db`，AuthService 與 database 共用該路徑。
- auth.db 由 `AUTH_DB_PATH` 控制，用於設備會話、限流等子模塊。
- 問題：users 表若只按一種 schema 創建，會導致另一模塊的查詢/寫入異常。

---

## 二、合併策略

### 2.1 目標

- **單一主庫**：僅使用 `tgmatrix.db` 作為業務主庫。
- **統一 users**：一張 users 表，包含認證與會員相關欄位。
- **auth 子表遷移**：將 auth.db 中的 login_tokens、trusted_devices、rate_limits 等遷入 tgmatrix.db。

### 2.2 統一 users 表結構

```sql
-- 合併後的 users 表（包含認證 + 會員）
CREATE TABLE IF NOT EXISTS users (
    -- 主鍵：優先使用 UUID
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE,  -- 與 id 同值，兼容卡密系統
    
    -- 認證
    email TEXT UNIQUE,
    username TEXT UNIQUE,
    password_hash TEXT,
    display_name TEXT,
    auth_provider TEXT DEFAULT 'local',
    oauth_id TEXT,
    
    -- Telegram
    telegram_id TEXT UNIQUE,
    telegram_username TEXT,
    telegram_first_name TEXT,
    telegram_photo_url TEXT,
    
    -- 會員（卡密系統）
    membership_level TEXT DEFAULT 'bronze',
    expires_at TIMESTAMP,
    is_lifetime INTEGER DEFAULT 0,
    
    subscription_tier TEXT DEFAULT 'free',      -- 與 membership_level 對齊
    subscription_expires TIMESTAMP,             -- 與 expires_at 對齊
    
    -- 邀請
    invite_code TEXT UNIQUE,
    invited_by TEXT,
    total_invites INTEGER DEFAULT 0,
    
    -- 財務
    total_spent REAL DEFAULT 0,
    balance REAL DEFAULT 0,
    
    -- 狀態
    status TEXT DEFAULT 'active',
    is_banned INTEGER DEFAULT 0,
    role TEXT DEFAULT 'free',
    max_accounts INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT 1,
    
    -- 時間
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);
```

### 2.3 遷移步驟（零停機思路）

1. **準備階段**：備份、檢查現有 schema、編寫遷移腳本。
2. **遷移腳本**：合併 users、遷移 auth 子表到 tgmatrix.db。
3. **切換**：改 AUTH_DB_PATH 指向 tgmatrix.db（或移除，統一用 DATABASE_PATH）。
4. **驗證**：功能回歸測試。
5. **回滾**：若失敗，恢復備份並還原配置。

---

## 三、詳細遷移計劃

### 階段 0：準備（不影響線上）

- [ ] 備份 `/app/data/tgmatrix.db` 和 `/app/data/auth.db`
- [ ] 在測試環境複製生產數據，執行遷移腳本並驗證
- [ ] 記錄當前 tgmatrix.db 與 auth.db 的 schema（PRAGMA table_info）
- [ ] 確認 Vivian 等關鍵用戶在兩庫中的對應關係

### 階段 1：遷移腳本

新增 `backend/scripts/merge_databases.py`：

1. 讀取 tgmatrix.db 和 auth.db。
2. 若 tgmatrix.users 缺少認證欄位，則 ALTER TABLE 添加。
3. 若 auth.users 存在，則將缺失用戶遷入 tgmatrix.users（按 id/email/username 去重）。
4. 遷移 auth.db 的 login_tokens、trusted_devices 等表到 tgmatrix.db（若尚未存在）。
5. 更新 users：`subscription_tier` = `membership_level`，`subscription_expires` = `expires_at`，保證 auth/me 與會員邏輯一致。
6. 對 `is_lifetime = 1` 的用戶，將 `subscription_expires` 設為 NULL。

### 階段 2：代碼適配

- [ ] `auth/service.py`：確保僅使用 `DATABASE_PATH`（tgmatrix.db），不再單獨連 auth.db 的 users。
- [ ] `auth/device_session.py`、`rate_limiter.py`、`geo_security.py`：改為使用 `DATABASE_PATH`，或明確指向 tgmatrix.db 的對應表。
- [ ] `database.py`：保持使用 config.DATABASE_PATH。
- [ ] `http_server._get_admin_db()`：統一使用同一 DATABASE_PATH。
- [ ] 移除 get_current_user 中對「雙庫」的跨庫查詢邏輯，改為單庫查詢。

### 階段 3：部署與切換

1. 選擇低峰時段。
2. 停止 API 容器：`docker compose stop api`
3. 執行合併腳本（測試階段可不保留原始數據）：
   - `python -m scripts.merge_db_init --fresh`（完全重置 tgmatrix.db）
   - 或 `python -m scripts.merge_db_init`（增量初始化）
4. 驗證 tgmatrix.db 完整性：`PRAGMA quick_check;`、抽查 users 表。
5. 重啟 API：`docker compose up -d api`
6. 執行健康檢查與功能測試。

### 階段 4：清理

- [ ] 確認一週內無問題後，可刪除 auth.db 或改為歸檔。
- [ ] 更新文檔與運維手冊。

---

## 四、測試清單

### 4.1 認證

- [ ] 用戶名/密碼登入
- [ ] Telegram 登入
- [ ] Token 刷新
- [ ] 退出登入
- [ ] 修改密碼

### 4.2 用戶信息

- [ ] GET /api/v1/auth/me 返回正確用戶信息
- [ ] 終身會員顯示「終身」，非終身顯示「剩餘 X 天」
- [ ] 個人資料頁載入
- [ ] 會員中心頁載入

### 4.3 卡密與會員

- [ ] 卡密激活
- [ ] 會員等級與到期時間正確
- [ ] 後台用戶列表「到期時間」顯示正確（終身/具體日期）

### 4.4 設備與限流

- [ ] 設備管理列表
- [ ] 登出其他設備
- [ ] 登入限流（若有）

### 4.5 管理後台

- [ ] 用戶管理列表
- [ ] 用戶詳情
- [ ] 編輯用戶（等級、到期時間等）

---

## 五、影響範圍

| 模塊 | 影響 | 改動 |
|------|------|------|
| auth/service.py | 用戶表、會話 | 統一 DB 路徑，適配合併 schema |
| auth/device_session.py | 設備會話 | AUTH_DB_PATH → DATABASE_PATH |
| auth/rate_limiter.py | 限流 | AUTH_DB_PATH → DATABASE_PATH |
| auth/geo_security.py | 地理安全 | AUTH_DB_PATH → DATABASE_PATH |
| database.py | 用戶、卡密 | 可能需 ALTER 適配 id/user_id |
| api/http_server.py | get_current_user, _get_admin_db | 移除跨庫邏輯，單庫查詢 |
| config.py | DATABASE_PATH | 保持不變 |

---

## 六、回滾方案

1. 恢復備份：`cp /app/data/backups/tgmatrix_pre_merge.db /app/data/tgmatrix.db`
2. 若曾改動 AUTH_DB_PATH，恢復為 auth.db
3. 重啟 API
4. 驗證登入與會員展示

---

## 七、時間估計

- 遷移腳本開發與本地驗證：1–2 天
- 測試環境驗證：0.5 天
- 生產部署與驗證：約 1 小時（含備份與回滾演練）
