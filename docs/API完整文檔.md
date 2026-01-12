# TG-AI智控王 API 完整文檔

> **版本**: 2.0.0  
> **Base URL**: `https://tgkz.usdt2026.cc/api`  
> **更新日期**: 2026年1月12日

---

## 📋 目錄

1. [認證說明](#認證說明)
2. [公開 API](#公開-api)
3. [用戶 API](#用戶-api)
4. [管理員 API](#管理員-api)
5. [錯誤碼說明](#錯誤碼說明)

---

## 認證說明

### JWT Token 認證

大部分 API 需要在請求頭中攜帶 JWT Token：

```http
Authorization: Bearer <token>
```

### 獲取 Token

#### 用戶 Token
通過卡密激活或登錄獲取：
```http
POST /api/license/activate
```

#### 管理員 Token
通過管理員登錄獲取：
```http
POST /api/admin/login
```

### Token 有效期

| 類型 | 有效期 |
|------|--------|
| 用戶 Token | 30 天 |
| 管理員 Token | 24 小時 |

---

## 公開 API

無需認證即可訪問的 API。

### 健康檢查

檢查 API 服務是否正常運行。

```http
GET /api/health
```

**響應示例：**
```json
{
  "success": true,
  "message": "TG-AI智控王 服務運行正常",
  "version": "v2.0",
  "timestamp": "2026-01-12T15:30:00.000Z"
}
```

---

### 驗證卡密

驗證卡密是否有效（不激活）。

```http
POST /api/license/validate
Content-Type: application/json
```

**請求參數：**
```json
{
  "license_key": "TGAI-G2-ABCD-EFGH-IJKL"
}
```

**成功響應：**
```json
{
  "success": true,
  "valid": true,
  "data": {
    "level": "gold",
    "levelName": "🥇 黃金大師",
    "durationType": "month",
    "durationDays": 30,
    "status": "unused"
  }
}
```

**失敗響應：**
```json
{
  "success": false,
  "valid": false,
  "message": "卡密不存在或已被使用"
}
```

---

### 激活卡密

激活卡密並綁定設備。

```http
POST /api/license/activate
Content-Type: application/json
```

**請求參數：**
```json
{
  "license_key": "TGAI-G2-ABCD-EFGH-IJKL",
  "machine_id": "DEVICE-UUID-12345",
  "email": "user@example.com",
  "invite_code": "INV123456"  // 可選，邀請碼
}
```

**成功響應：**
```json
{
  "success": true,
  "message": "卡密激活成功",
  "data": {
    "userId": "USR-20260112-XXXX",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "level": "gold",
    "levelName": "🥇 黃金大師",
    "levelIcon": "🥇",
    "expiresAt": "2026-02-12T15:30:00.000Z",
    "quotas": {
      "accounts": 10,
      "daily_messages": 300,
      "ai_calls": 200,
      "groups": 30,
      "data_retention_days": 30
    },
    "features": {
      "auto_reply": true,
      "smart_marketing": true,
      "api_access": false,
      "priority_support": false,
      "early_access": false
    }
  }
}
```

---

### 心跳上報

客戶端定期上報狀態，維持在線狀態。

```http
POST /api/heartbeat
Content-Type: application/json
Authorization: Bearer <token>
```

**請求參數：**
```json
{
  "machine_id": "DEVICE-UUID-12345",
  "usage": {
    "messages": 50,
    "ai_calls": 10
  }
}
```

**響應：**
```json
{
  "success": true,
  "data": {
    "serverTime": "2026-01-12T15:30:00.000Z",
    "expiresAt": "2026-02-12T15:30:00.000Z",
    "daysLeft": 30,
    "quotaUsed": {
      "messages": 150,
      "ai_calls": 45
    },
    "announcements": []
  }
}
```

---

### 獲取產品列表

獲取所有可購買的產品。

```http
GET /api/products
```

**響應：**
```json
{
  "success": true,
  "data": [
    {
      "id": "silver_month",
      "level": "silver",
      "levelName": "🥈 白銀精英",
      "levelIcon": "🥈",
      "duration": "month",
      "durationName": "月卡",
      "price": 49,
      "quotas": {
        "accounts": 5,
        "daily_messages": 100
      },
      "features": {
        "auto_reply": true
      }
    }
    // ... 更多產品
  ]
}
```

---

### 創建支付訂單

創建一個支付訂單。

```http
POST /api/payment/create
Content-Type: application/json
```

**請求參數：**
```json
{
  "product_id": "gold_month",
  "payment_method": "usdt",
  "machine_id": "DEVICE-UUID-12345",
  "user_id": "USR-20260112-XXXX",
  "coupon_code": "NEWYEAR2026"  // 可選
}
```

**響應：**
```json
{
  "success": true,
  "data": {
    "orderId": "TGO1736693400ABCD1234",
    "product": {
      "id": "gold_month",
      "level": "gold",
      "levelName": "🥇 黃金大師",
      "levelIcon": "🥇",
      "duration": "month",
      "durationDays": 30,
      "originalPrice": 99,
      "price": 89
    },
    "discount": 10,
    "amount": 89,
    "currency": "CNY",
    "status": "pending",
    "expiresIn": 1800,
    "usdt": {
      "amount": 12.36,
      "network": "TRC20",
      "address": "TYourWalletAddress",
      "rate": 7.2,
      "memo": "TGO1736693400ABCD1234"
    }
  }
}
```

---

### 查詢訂單狀態

```http
GET /api/order/status?order_id=TGO1736693400ABCD1234
```

**響應：**
```json
{
  "success": true,
  "data": {
    "orderId": "TGO1736693400ABCD1234",
    "status": "paid",
    "productName": "🥇 黃金大師月卡",
    "amount": 89,
    "paidAt": "2026-01-12T15:35:00.000Z",
    "licenseKey": "TGAI-PAY-1234-5678-9ABC"
  }
}
```

---

### 獲取公告列表

```http
GET /api/announcements
```

**響應：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "新年特惠活動",
      "content": "全場會員 8 折優惠...",
      "type": "promotion",
      "is_pinned": true,
      "created_at": "2026-01-10T10:00:00.000Z"
    }
  ]
}
```

---

### 獲取彈窗公告

```http
GET /api/announcements/popup
```

返回需要彈窗顯示的公告（最多 5 條）。

---

## 用戶 API

需要用戶 Token 認證。

### 會員到期提醒

```http
GET /api/user/expiry-check
Authorization: Bearer <token>
```

**響應：**
```json
{
  "success": true,
  "data": {
    "reminders": [
      {
        "type": "expiring_soon",
        "title": "會員即將過期",
        "message": "您的會員將在 3 天後過期，請及時續費。",
        "days": 3,
        "level": "warning"
      }
    ],
    "expiresAt": "2026-01-15T15:30:00.000Z",
    "daysLeft": 3,
    "isLifetime": false,
    "currentLevel": "gold",
    "upgradeOptions": [
      {
        "level": "diamond",
        "name": "💎 鑽石王牌",
        "icon": "💎",
        "monthlyPrice": 199
      }
    ]
  }
}
```

---

## 管理員 API

需要管理員 Token 認證。

### 管理員登錄

```http
POST /api/admin/login
Content-Type: application/json
```

**請求參數：**
```json
{
  "username": "admin",
  "password": "admin888"
}
```

**成功響應：**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "admin": {
      "id": 1,
      "username": "admin",
      "name": "管理員",
      "role": "admin"
    }
  }
}
```

**失敗響應（帳號鎖定）：**
```json
{
  "success": false,
  "message": "帳號已鎖定，請 15 分鐘後再試"
}
```

---

### 獲取儀表盤數據

```http
GET /api/admin/dashboard
Authorization: Bearer <admin_token>
```

**響應：**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1500,
    "newUsersToday": 25,
    "activeUsers": 320,
    "totalRevenue": 158000,
    "todayRevenue": 2580,
    "totalLicenses": 2000,
    "unusedLicenses": 500,
    "pendingOrders": 5,
    "levelDistribution": {
      "bronze": 800,
      "silver": 350,
      "gold": 200,
      "diamond": 100,
      "star": 40,
      "king": 10
    }
  }
}
```

---

### 用戶管理

#### 獲取用戶列表

```http
GET /api/admin/users?level=gold&status=active&limit=50&offset=0
Authorization: Bearer <admin_token>
```

#### 獲取用戶詳情

```http
GET /api/admin/users/{user_id}
Authorization: Bearer <admin_token>
```

#### 更新用戶信息

```http
PUT /api/admin/users/{user_id}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "membership_level": "diamond",
  "notes": "VIP 客戶"
}
```

#### 延長用戶會員

```http
POST /api/admin/users/{user_id}/extend
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "days": 30,
  "reason": "活動贈送"
}
```

#### 封禁/解封用戶

```http
POST /api/admin/users/{user_id}/ban
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "違規使用"
}
```

```http
POST /api/admin/users/{user_id}/unban
Authorization: Bearer <admin_token>
```

---

### 卡密管理

#### 生成卡密

```http
POST /api/admin/licenses/generate
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "level": "gold",
  "duration": "month",
  "count": 10,
  "batch": "新年優惠-2026",
  "notes": "新年活動卡密"
}
```

**響應：**
```json
{
  "success": true,
  "message": "成功生成 10 個卡密",
  "data": {
    "count": 10,
    "licenses": [
      "TGAI-G2-ABCD-EFGH-IJKL",
      "TGAI-G2-MNOP-QRST-UVWX"
      // ...
    ]
  }
}
```

#### 獲取卡密列表

```http
GET /api/admin/licenses?status=unused&level=gold&limit=100
Authorization: Bearer <admin_token>
```

#### 禁用卡密

```http
POST /api/admin/licenses/{license_key}/disable
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "reason": "客戶退款"
}
```

---

### 訂單管理

#### 獲取訂單列表

```http
GET /api/admin/orders?status=pending&limit=100
Authorization: Bearer <admin_token>
```

#### 手動確認支付

```http
POST /api/admin/orders/confirm
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "order_id": "TGO1736693400ABCD1234"
}
```

---

### 收入報表

```http
GET /api/admin/revenue-report?days=30&group_by=day
Authorization: Bearer <admin_token>
```

**參數：**
- `days`: 統計天數 (7/30/90)
- `group_by`: 分組方式 (day/week/month)

**響應：**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_orders": 150,
      "total_revenue": 25800,
      "unique_buyers": 120,
      "avg_order_value": 172,
      "growth_rate": 15.5,
      "prev_revenue": 22340
    },
    "trend": [
      {"period": "2026-01-12", "order_count": 15, "revenue": 2580, "unique_users": 12}
    ],
    "byLevel": [
      {"product_level": "gold", "order_count": 50, "revenue": 8500}
    ],
    "byDuration": [
      {"duration_type": "month", "order_count": 80, "revenue": 12000}
    ],
    "period": "近30天"
  }
}
```

---

### 用戶分析

```http
GET /api/admin/user-analytics?days=30
Authorization: Bearer <admin_token>
```

**響應：**
```json
{
  "success": true,
  "data": {
    "userGrowth": [
      {"date": "2026-01-12", "new_users": 25}
    ],
    "activeTrend": [
      {"date": "2026-01-12", "active_users": 320}
    ],
    "retention": {
      "day1": 85.5,
      "day7": 62.3,
      "day30": 45.8
    },
    "conversion": {
      "totalUsers": 1500,
      "paidUsers": 700,
      "premiumUsers": 350,
      "paidRate": 46.67,
      "premiumRate": 23.33
    },
    "arpu": 105.33,
    "arppu": 225.71,
    "levelDistribution": {
      "bronze": 800,
      "silver": 350,
      "gold": 200
    },
    "referralStats": {
      "total_referrals": 200,
      "converted_referrals": 85,
      "total_rewards": 2500
    }
  }
}
```

---

### 即將過期用戶

```http
GET /api/admin/expiring-users?days=7
Authorization: Bearer <admin_token>
```

---

### 優惠券管理

#### 獲取優惠券列表

```http
GET /api/admin/coupons
Authorization: Bearer <admin_token>
```

#### 創建優惠券

```http
POST /api/admin/coupons
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "code": "NEWYEAR2026",
  "discount_type": "percent",
  "discount_value": 20,
  "min_amount": 100,
  "max_uses": 100,
  "expires_at": "2026-02-01T00:00:00.000Z"
}
```

#### 禁用優惠券

```http
POST /api/admin/coupons/{id}/disable
Authorization: Bearer <admin_token>
```

---

### 公告管理

#### 獲取公告列表

```http
GET /api/admin/announcements
Authorization: Bearer <admin_token>
```

#### 創建公告

```http
POST /api/admin/announcements
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "系統維護通知",
  "content": "系統將於今晚進行維護...",
  "type": "system",
  "priority": 10,
  "is_pinned": true,
  "is_popup": true,
  "expire_at": "2026-01-15T00:00:00.000Z"
}
```

#### 更新公告

```http
PUT /api/admin/announcements/{id}
Authorization: Bearer <admin_token>
```

#### 刪除公告

```http
DELETE /api/admin/announcements/{id}
Authorization: Bearer <admin_token>
```

---

### 操作日誌

```http
GET /api/admin/logs?action=generate&limit=100
Authorization: Bearer <admin_token>
```

---

### 系統設置

#### 獲取設置

```http
GET /api/admin/settings
Authorization: Bearer <admin_token>
```

#### 更新設置

```http
PUT /api/admin/settings
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "usdt_trc20_address": "TNewAddress...",
  "usdt_rate": "7.3",
  "maintenance_mode": "false"
}
```

---

### 數據庫備份

```http
POST /api/admin/backup
Authorization: Bearer <admin_token>
```

---

### 每日統計

```http
GET /api/admin/daily-stats?days=30
Authorization: Bearer <admin_token>
```

```http
POST /api/admin/generate-daily-stats
Authorization: Bearer <admin_token>
```

---

## 錯誤碼說明

### HTTP 狀態碼

| 狀態碼 | 說明 |
|--------|------|
| 200 | 請求成功 |
| 400 | 請求參數錯誤 |
| 401 | 未授權 / Token 無效 |
| 403 | 禁止訪問 |
| 404 | 資源不存在 |
| 429 | 請求過於頻繁 |
| 500 | 服務器內部錯誤 |

### 業務錯誤碼

| 錯誤信息 | 說明 |
|---------|------|
| `卡密不存在` | 輸入的卡密格式錯誤或不存在 |
| `卡密已被使用` | 該卡密已經被其他用戶激活 |
| `卡密已被禁用` | 該卡密已被管理員禁用 |
| `機器碼不匹配` | 當前設備與綁定設備不一致 |
| `Token 無效` | JWT Token 過期或無效 |
| `請求過於頻繁` | 觸發 API 限流 (每分鐘 100 次) |
| `帳號已鎖定` | 登錄失敗次數過多，帳號被鎖定 |

### 錯誤響應格式

```json
{
  "success": false,
  "message": "錯誤描述信息",
  "code": "ERROR_CODE"  // 部分 API 會返回
}
```

---

## API 限流

- **限制**: 每 IP 每分鐘 100 次請求
- **超限響應**: HTTP 429

```json
{
  "success": false,
  "message": "請求過於頻繁，請稍後再試"
}
```

---

## SDK / 示例代碼

### Python

```python
import requests

BASE_URL = "https://tgkz.usdt2026.cc/api"

# 驗證卡密
def validate_license(license_key):
    response = requests.post(f"{BASE_URL}/license/validate", json={
        "license_key": license_key
    })
    return response.json()

# 激活卡密
def activate_license(license_key, machine_id, email):
    response = requests.post(f"{BASE_URL}/license/activate", json={
        "license_key": license_key,
        "machine_id": machine_id,
        "email": email
    })
    return response.json()

# 心跳
def heartbeat(token, machine_id, usage):
    response = requests.post(f"{BASE_URL}/heartbeat", 
        headers={"Authorization": f"Bearer {token}"},
        json={
            "machine_id": machine_id,
            "usage": usage
        })
    return response.json()
```

### JavaScript

```javascript
const BASE_URL = 'https://tgkz.usdt2026.cc/api';

// 驗證卡密
async function validateLicense(licenseKey) {
  const response = await fetch(`${BASE_URL}/license/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ license_key: licenseKey })
  });
  return response.json();
}

// 激活卡密
async function activateLicense(licenseKey, machineId, email) {
  const response = await fetch(`${BASE_URL}/license/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      license_key: licenseKey,
      machine_id: machineId,
      email: email
    })
  });
  return response.json();
}

// 心跳
async function heartbeat(token, machineId, usage) {
  const response = await fetch(`${BASE_URL}/heartbeat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      machine_id: machineId,
      usage: usage
    })
  });
  return response.json();
}
```

---

*© 2026 TG-AI智控王. All Rights Reserved.*
