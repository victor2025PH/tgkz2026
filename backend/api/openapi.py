"""
OpenAPI 規範生成器

優化設計：
1. 自動從路由生成 API 文檔
2. 支持 Swagger UI 和 ReDoc
3. 請求/響應 Schema 定義
4. 認證流程文檔
"""

import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field, asdict

# OpenAPI 版本
OPENAPI_VERSION = "3.0.3"

# API 信息
API_INFO = {
    "title": "TG-Matrix API",
    "description": """
# TG-Matrix API 文檔

TG-Matrix 是一個強大的 Telegram 營銷自動化平台。

## 認證

所有 API 請求（除了公開端點）都需要通過 Bearer Token 認證：

```
Authorization: Bearer <access_token>
```

## 錯誤處理

所有錯誤響應都遵循統一格式：

```json
{
  "success": false,
  "error": "錯誤描述",
  "code": "ERROR_CODE"
}
```

## 速率限制

- 免費用戶：100 請求/天
- Basic：1,000 請求/天
- Pro：10,000 請求/天
- Enterprise：無限制
""",
    "version": "1.0.0",
    "contact": {
        "name": "TG-Matrix Support",
        "email": "support@tg-matrix.com"
    },
    "license": {
        "name": "Proprietary",
        "url": "https://tg-matrix.com/license"
    }
}

# 服務器配置
SERVERS = [
    {
        "url": "https://tgw.usdt2026.cc",
        "description": "生產環境"
    },
    {
        "url": "http://localhost:8000",
        "description": "開發環境"
    }
]

# 安全方案
SECURITY_SCHEMES = {
    "BearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT 認證令牌"
    },
    "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key",
        "description": "API 密鑰認證"
    }
}

# 通用 Schema
COMMON_SCHEMAS = {
    "SuccessResponse": {
        "type": "object",
        "properties": {
            "success": {"type": "boolean", "example": True},
            "data": {"type": "object"}
        }
    },
    "ErrorResponse": {
        "type": "object",
        "properties": {
            "success": {"type": "boolean", "example": False},
            "error": {"type": "string"},
            "code": {"type": "string"}
        }
    },
    "PaginatedResponse": {
        "type": "object",
        "properties": {
            "success": {"type": "boolean"},
            "data": {"type": "array", "items": {}},
            "total": {"type": "integer"},
            "page": {"type": "integer"},
            "page_size": {"type": "integer"}
        }
    },
    "Account": {
        "type": "object",
        "properties": {
            "id": {"type": "string", "description": "帳號 ID"},
            "phone": {"type": "string", "description": "手機號碼"},
            "name": {"type": "string", "description": "顯示名稱"},
            "status": {
                "type": "string",
                "enum": ["online", "offline", "banned", "warming_up"],
                "description": "帳號狀態"
            },
            "created_at": {"type": "string", "format": "date-time"}
        }
    },
    "User": {
        "type": "object",
        "properties": {
            "id": {"type": "string"},
            "email": {"type": "string", "format": "email"},
            "username": {"type": "string"},
            "subscription_tier": {
                "type": "string",
                "enum": ["free", "basic", "pro", "enterprise"]
            },
            "created_at": {"type": "string", "format": "date-time"}
        }
    },
    "Subscription": {
        "type": "object",
        "properties": {
            "id": {"type": "string"},
            "plan_id": {"type": "string"},
            "status": {
                "type": "string",
                "enum": ["active", "cancelled", "past_due", "expired"]
            },
            "current_period_end": {"type": "string", "format": "date-time"}
        }
    },
    "UsageStats": {
        "type": "object",
        "properties": {
            "api_calls": {"type": "integer"},
            "api_calls_limit": {"type": "integer"},
            "accounts_count": {"type": "integer"},
            "accounts_limit": {"type": "integer"},
            "messages_sent": {"type": "integer"}
        }
    },
    # P12-3: 高频端点 Schema 增强
    "Wallet": {
        "type": "object",
        "properties": {
            "user_id": {"type": "string"},
            "balance": {"type": "number", "format": "float", "description": "可用餘額"},
            "frozen_balance": {"type": "number", "format": "float", "description": "凍結餘額"},
            "total_recharged": {"type": "number", "format": "float"},
            "total_consumed": {"type": "number", "format": "float"},
            "currency": {"type": "string", "default": "CNY"},
            "status": {"type": "string", "enum": ["active", "frozen", "disabled"]},
            "created_at": {"type": "string", "format": "date-time"},
            "updated_at": {"type": "string", "format": "date-time"}
        }
    },
    "Transaction": {
        "type": "object",
        "properties": {
            "id": {"type": "string"},
            "user_id": {"type": "string"},
            "type": {"type": "string", "enum": ["recharge", "consume", "refund", "withdraw", "adjust", "reward"]},
            "amount": {"type": "number", "format": "float"},
            "balance_after": {"type": "number", "format": "float"},
            "description": {"type": "string"},
            "reference_no": {"type": "string"},
            "created_at": {"type": "string", "format": "date-time"}
        }
    },
    "RechargeOrder": {
        "type": "object",
        "properties": {
            "order_no": {"type": "string"},
            "user_id": {"type": "string"},
            "amount": {"type": "number", "format": "float"},
            "status": {"type": "string", "enum": ["pending", "paid", "confirmed", "cancelled", "expired"]},
            "payment_method": {"type": "string"},
            "created_at": {"type": "string", "format": "date-time"},
            "paid_at": {"type": "string", "format": "date-time", "nullable": True}
        }
    },
    "AdminUser": {
        "type": "object",
        "properties": {
            "id": {"type": "string"},
            "email": {"type": "string", "format": "email"},
            "username": {"type": "string"},
            "subscription_tier": {"type": "string", "enum": ["free", "basic", "pro", "enterprise"]},
            "is_banned": {"type": "boolean"},
            "expires_at": {"type": "string", "format": "date-time", "nullable": True},
            "accounts_count": {"type": "integer"},
            "last_login": {"type": "string", "format": "date-time", "nullable": True}
        }
    },
    "HealthStatus": {
        "type": "object",
        "properties": {
            "status": {"type": "string", "enum": ["ok", "degraded", "unhealthy"]},
            "service": {"type": "string"},
            "version": {"type": "string"},
            "timestamp": {"type": "string", "format": "date-time"},
            "backend_ready": {"type": "boolean"},
            "wallet_module": {"type": "boolean"},
            "migration": {"type": "object", "nullable": True}
        }
    },
    "BatchOperation": {
        "type": "object",
        "required": ["action", "account_id"],
        "properties": {
            "action": {"type": "string", "enum": ["delete", "login", "logout", "update_status"]},
            "account_id": {"type": "string"},
            "status": {"type": "string", "description": "用於 update_status 操作"}
        }
    },
    "BatchResult": {
        "type": "object",
        "properties": {
            "total": {"type": "integer"},
            "succeeded": {"type": "integer"},
            "failed": {"type": "integer"},
            "results": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "account_id": {"type": "string"},
                        "action": {"type": "string"},
                        "success": {"type": "boolean"},
                        "error": {"type": "string", "nullable": True}
                    }
                }
            }
        }
    },
    "Keyword": {
        "type": "object",
        "properties": {
            "id": {"type": "string"},
            "keywords": {"type": "array", "items": {"type": "string"}},
            "name": {"type": "string"},
            "is_active": {"type": "boolean"},
            "created_at": {"type": "string", "format": "date-time"}
        }
    },
    "Group": {
        "type": "object",
        "properties": {
            "id": {"type": "string"},
            "title": {"type": "string"},
            "chat_id": {"type": "string"},
            "member_count": {"type": "integer"},
            "is_active": {"type": "boolean"}
        }
    },
    "TokenPair": {
        "type": "object",
        "properties": {
            "access_token": {"type": "string", "description": "JWT access token (短期)"},
            "refresh_token": {"type": "string", "description": "Refresh token (長期)"},
            "token_type": {"type": "string", "default": "Bearer"},
            "expires_in": {"type": "integer", "description": "過期時間（秒）"}
        }
    }
}

# API 路徑定義
API_PATHS = {
    # ==================== 認證 ====================
    "/api/v1/auth/register": {
        "post": {
            "tags": ["認證"],
            "summary": "用戶註冊",
            "description": "創建新用戶帳號",
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "required": ["email", "password", "username"],
                            "properties": {
                                "email": {"type": "string", "format": "email"},
                                "password": {"type": "string", "minLength": 8},
                                "username": {"type": "string", "minLength": 3}
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "註冊成功",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "success": {"type": "boolean"},
                                    "access_token": {"type": "string"},
                                    "refresh_token": {"type": "string"},
                                    "user": {"$ref": "#/components/schemas/User"}
                                }
                            }
                        }
                    }
                },
                "400": {"$ref": "#/components/responses/BadRequest"}
            }
        }
    },
    "/api/v1/auth/login": {
        "post": {
            "tags": ["認證"],
            "summary": "用戶登入",
            "description": "使用郵箱和密碼登入",
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "required": ["email", "password"],
                            "properties": {
                                "email": {"type": "string", "format": "email"},
                                "password": {"type": "string"}
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "登入成功",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "success": {"type": "boolean"},
                                    "access_token": {"type": "string"},
                                    "refresh_token": {"type": "string"},
                                    "user": {"$ref": "#/components/schemas/User"}
                                }
                            }
                        }
                    }
                },
                "401": {"$ref": "#/components/responses/Unauthorized"}
            }
        }
    },
    "/api/v1/auth/me": {
        "get": {
            "tags": ["認證"],
            "summary": "獲取當前用戶",
            "security": [{"BearerAuth": []}],
            "responses": {
                "200": {
                    "description": "成功",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "success": {"type": "boolean"},
                                    "data": {"$ref": "#/components/schemas/User"}
                                }
                            }
                        }
                    }
                },
                "401": {"$ref": "#/components/responses/Unauthorized"}
            }
        }
    },
    
    # ==================== 帳號管理 ====================
    "/api/v1/accounts": {
        "get": {
            "tags": ["帳號管理"],
            "summary": "獲取帳號列表",
            "security": [{"BearerAuth": []}],
            "responses": {
                "200": {
                    "description": "成功",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "success": {"type": "boolean"},
                                    "data": {
                                        "type": "array",
                                        "items": {"$ref": "#/components/schemas/Account"}
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "post": {
            "tags": ["帳號管理"],
            "summary": "添加帳號",
            "security": [{"BearerAuth": []}],
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "required": ["phone"],
                            "properties": {
                                "phone": {"type": "string", "description": "手機號碼（含國際碼）"},
                                "name": {"type": "string"}
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {"$ref": "#/components/responses/Success"},
                "400": {"$ref": "#/components/responses/BadRequest"},
                "429": {"$ref": "#/components/responses/QuotaExceeded"}
            }
        }
    },
    
    # ==================== 訂閱 ====================
    "/api/v1/subscription": {
        "get": {
            "tags": ["訂閱"],
            "summary": "獲取當前訂閱",
            "security": [{"BearerAuth": []}],
            "responses": {
                "200": {
                    "description": "成功",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "success": {"type": "boolean"},
                                    "data": {"$ref": "#/components/schemas/Subscription"}
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    "/api/v1/subscription/checkout": {
        "post": {
            "tags": ["訂閱"],
            "summary": "創建結帳會話",
            "security": [{"BearerAuth": []}],
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "required": ["plan_id"],
                            "properties": {
                                "plan_id": {
                                    "type": "string",
                                    "enum": ["basic", "pro", "enterprise"]
                                },
                                "billing_cycle": {
                                    "type": "string",
                                    "enum": ["monthly", "yearly"],
                                    "default": "monthly"
                                }
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "成功",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "success": {"type": "boolean"},
                                    "url": {"type": "string", "description": "結帳頁面 URL"}
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    
    # ==================== 使用量 ====================
    "/api/v1/usage": {
        "get": {
            "tags": ["使用量"],
            "summary": "獲取使用量摘要",
            "security": [{"BearerAuth": []}],
            "responses": {
                "200": {
                    "description": "成功",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "success": {"type": "boolean"},
                                    "data": {"$ref": "#/components/schemas/UsageStats"}
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    
    # ==================== 錢包 (P12-3) ====================
    "/api/wallet": {
        "get": {
            "tags": ["錢包"],
            "summary": "獲取錢包信息",
            "security": [{"BearerAuth": []}],
            "responses": {
                "200": {
                    "description": "成功",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "success": {"type": "boolean"},
                                    "data": {"$ref": "#/components/schemas/Wallet"}
                                }
                            }
                        }
                    }
                },
                "401": {"$ref": "#/components/responses/Unauthorized"}
            }
        }
    },
    "/api/wallet/transactions": {
        "get": {
            "tags": ["錢包"],
            "summary": "獲取交易記錄",
            "security": [{"BearerAuth": []}],
            "parameters": [
                {"name": "page", "in": "query", "schema": {"type": "integer", "default": 1}},
                {"name": "page_size", "in": "query", "schema": {"type": "integer", "default": 20, "maximum": 100}},
                {"name": "type", "in": "query", "schema": {"type": "string", "enum": ["recharge", "consume", "refund", "withdraw"]}}
            ],
            "responses": {
                "200": {
                    "description": "成功",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "success": {"type": "boolean"},
                                    "data": {
                                        "type": "array",
                                        "items": {"$ref": "#/components/schemas/Transaction"}
                                    },
                                    "total": {"type": "integer"},
                                    "page": {"type": "integer"}
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    "/api/wallet/recharge/create": {
        "post": {
            "tags": ["錢包"],
            "summary": "創建充值訂單",
            "security": [{"BearerAuth": []}],
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "required": ["amount", "payment_method"],
                            "properties": {
                                "amount": {"type": "number", "minimum": 1, "description": "充值金額"},
                                "payment_method": {"type": "string", "enum": ["usdt_trc20", "usdt_erc20", "alipay", "wechat"]},
                                "package_id": {"type": "string", "description": "套餐 ID（可選）"}
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "訂單創建成功",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "success": {"type": "boolean"},
                                    "data": {"$ref": "#/components/schemas/RechargeOrder"}
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    # ==================== 批量操作 (P12-3) ====================
    "/api/v1/accounts/batch": {
        "post": {
            "tags": ["帳號管理"],
            "summary": "批量帳號操作",
            "description": "批量執行帳號操作（最多 50 個）",
            "security": [{"BearerAuth": []}],
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "required": ["operations"],
                            "properties": {
                                "operations": {
                                    "type": "array",
                                    "items": {"$ref": "#/components/schemas/BatchOperation"},
                                    "maxItems": 50
                                }
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "批量操作結果",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "success": {"type": "boolean"},
                                    "data": {"$ref": "#/components/schemas/BatchResult"}
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    # ==================== 管理後台 (P12-3) ====================
    "/api/admin/login": {
        "post": {
            "tags": ["管理後台"],
            "summary": "管理員登入",
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "required": ["username", "password"],
                            "properties": {
                                "username": {"type": "string"},
                                "password": {"type": "string"}
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "登入成功",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "success": {"type": "boolean"},
                                    "token": {"type": "string"}
                                }
                            }
                        }
                    }
                },
                "401": {"$ref": "#/components/responses/Unauthorized"}
            }
        }
    },
    "/api/admin/users": {
        "get": {
            "tags": ["管理後台"],
            "summary": "獲取用戶列表",
            "security": [{"BearerAuth": []}],
            "parameters": [
                {"name": "page", "in": "query", "schema": {"type": "integer", "default": 1}},
                {"name": "page_size", "in": "query", "schema": {"type": "integer", "default": 20}},
                {"name": "search", "in": "query", "schema": {"type": "string"}},
                {"name": "tier", "in": "query", "schema": {"type": "string", "enum": ["free", "basic", "pro", "enterprise"]}}
            ],
            "responses": {
                "200": {
                    "description": "成功",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "success": {"type": "boolean"},
                                    "data": {
                                        "type": "array",
                                        "items": {"$ref": "#/components/schemas/AdminUser"}
                                    },
                                    "total": {"type": "integer"}
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    # ==================== Token 刷新 (P12-3) ====================
    "/api/v1/auth/refresh": {
        "post": {
            "tags": ["認證"],
            "summary": "刷新令牌",
            "description": "使用 refresh_token 獲取新的 access_token",
            "requestBody": {
                "required": True,
                "content": {
                    "application/json": {
                        "schema": {
                            "type": "object",
                            "required": ["refresh_token"],
                            "properties": {
                                "refresh_token": {"type": "string"}
                            }
                        }
                    }
                }
            },
            "responses": {
                "200": {
                    "description": "刷新成功",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "success": {"type": "boolean"},
                                    "data": {"$ref": "#/components/schemas/TokenPair"}
                                }
                            }
                        }
                    }
                },
                "401": {"$ref": "#/components/responses/Unauthorized"}
            }
        }
    },

    # ==================== 健康檢查 (P12-3 增強) ====================
    "/api/health": {
        "get": {
            "tags": ["健康檢查"],
            "summary": "基礎健康檢查",
            "responses": {
                "200": {
                    "description": "服務正常",
                    "content": {
                        "application/json": {
                            "schema": {"$ref": "#/components/schemas/HealthStatus"}
                        }
                    }
                }
            }
        }
    },

    # ==================== 系統 ====================
    "/api/v1/system/health": {
        "get": {
            "tags": ["系統"],
            "summary": "健康檢查",
            "responses": {
                "200": {
                    "description": "健康",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "status": {
                                        "type": "string",
                                        "enum": ["healthy", "degraded", "unhealthy"]
                                    },
                                    "checks": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "name": {"type": "string"},
                                                "status": {"type": "string"},
                                                "latency_ms": {"type": "number"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "503": {"description": "服務不可用"}
            }
        }
    },
    "/metrics": {
        "get": {
            "tags": ["系統"],
            "summary": "Prometheus 指標",
            "responses": {
                "200": {
                    "description": "指標數據",
                    "content": {
                        "text/plain": {
                            "schema": {"type": "string"}
                        }
                    }
                }
            }
        }
    }
}

# 通用響應
COMMON_RESPONSES = {
    "Success": {
        "description": "操作成功",
        "content": {
            "application/json": {
                "schema": {"$ref": "#/components/schemas/SuccessResponse"}
            }
        }
    },
    "BadRequest": {
        "description": "請求參數錯誤",
        "content": {
            "application/json": {
                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
            }
        }
    },
    "Unauthorized": {
        "description": "未授權",
        "content": {
            "application/json": {
                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
            }
        }
    },
    "Forbidden": {
        "description": "禁止訪問",
        "content": {
            "application/json": {
                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
            }
        }
    },
    "NotFound": {
        "description": "資源不存在",
        "content": {
            "application/json": {
                "schema": {"$ref": "#/components/schemas/ErrorResponse"}
            }
        }
    },
    "QuotaExceeded": {
        "description": "配額超限",
        "content": {
            "application/json": {
                "schema": {
                    "type": "object",
                    "properties": {
                        "success": {"type": "boolean", "example": False},
                        "error": {"type": "string"},
                        "code": {"type": "string", "example": "QUOTA_EXCEEDED"},
                        "quota": {
                            "type": "object",
                            "properties": {
                                "current": {"type": "integer"},
                                "limit": {"type": "integer"}
                            }
                        }
                    }
                }
            }
        }
    }
}


# P11-3: Route-to-tag mapping for auto-generated paths
TAG_RULES = [
    ('/api/v1/auth/', '認證'),
    ('/api/v1/oauth/', '認證'),
    ('/webhook/telegram', '認證'),
    ('/ws/login-token', '認證'),
    ('/api/v1/accounts', '帳號管理'),
    ('/api/v1/credentials', '帳號管理'),
    ('/api/v1/monitoring', '監控'),
    ('/api/v1/keywords', '核心功能'),
    ('/api/v1/groups', '核心功能'),
    ('/api/v1/settings', '核心功能'),
    ('/api/v1/contacts', '核心功能'),
    ('/api/v1/usage', '使用量'),
    ('/api/v1/quota', '配額'),
    ('/api/v1/membership', '配額'),
    ('/api/v1/subscription', '訂閱'),
    ('/api/v1/payment', '支付'),
    ('/api/v1/webhooks', '支付'),
    ('/api/v1/invoices', '發票'),
    ('/api/v1/billing', '計費'),
    ('/api/v1/notifications', '通知'),
    ('/api/v1/i18n', '國際化'),
    ('/api/v1/timezone', '時區'),
    ('/api/v1/leads', '營銷分析'),
    ('/api/v1/analytics', '營銷分析'),
    ('/api/v1/ab-tests', '營銷分析'),
    ('/api/v1/referral', '推薦'),
    ('/api/v1/coupon', '優惠券'),
    ('/api/v1/campaigns', '優惠券'),
    ('/api/v1/export', '數據導出'),
    ('/api/v1/backups', '數據導出'),
    ('/api/v1/admin/', '管理員'),
    ('/api/admin/', '管理後台'),
    ('/api/v1/health', '健康檢查'),
    ('/api/v1/system', '系統監控'),
    ('/api/v1/diagnostics', '診斷'),
    ('/metrics', '系統監控'),
    ('/api/v1/api-keys', 'API 密鑰'),
    ('/api/v1/errors', '前端遙測'),
    ('/api/v1/performance', '前端遙測'),
    ('/api/v1/audit', '審計'),
    ('/api/v1/retry', '營銷分析'),
    ('/api/wallet', '錢包'),
    ('/api/purchase', '購買'),
    ('/health', '健康檢查'),
    ('/api/health', '健康檢查'),
    ('/api/debug', '診斷'),
    ('/api/command', '命令'),
    ('/api/v1/command', '命令'),
    ('/api/docs', '文檔'),
    ('/api/redoc', '文檔'),
    ('/api/openapi', '文檔'),
    ('/api/v1/initial-state', '核心功能'),
    ('/api/status', '系統監控'),
    ('/api/v1/status', '系統監控'),
    ('/ws', 'WebSocket'),
]


def _classify_route(path: str) -> str:
    """Classify a route path into a tag"""
    for prefix, tag in TAG_RULES:
        if path.startswith(prefix):
            return tag
    return '其他'


def _method_to_operation_id(method: str, path: str) -> str:
    """Generate an operation ID from method + path"""
    parts = path.replace('/api/v1/', '').replace('/api/', '').replace('{', '').replace('}', '')
    parts = parts.strip('/').replace('/', '_').replace('-', '_')
    return f"{method}_{parts}"


def generate_openapi_spec(app=None) -> Dict[str, Any]:
    """生成完整的 OpenAPI 規範 — P11-3: 自動掃描已註冊路由"""
    # Start with manually enriched paths
    all_paths = dict(API_PATHS)

    # Auto-scan routes from aiohttp app (if available)
    auto_count = 0
    if app is not None:
        try:
            for resource in app.router.resources():
                info = resource.get_info()
                path = info.get('path') or info.get('formatter', '')
                if not path:
                    continue
                # Convert aiohttp {id} to OpenAPI {id}
                openapi_path = path
                if openapi_path not in all_paths:
                    all_paths[openapi_path] = {}

                for route in resource:
                    method = route.method.lower()
                    if method == '*':
                        continue
                    if method not in all_paths[openapi_path]:
                        tag = _classify_route(openapi_path)
                        handler = route.handler
                        summary = ''
                        if hasattr(handler, '__doc__') and handler.__doc__:
                            summary = handler.__doc__.strip().split('\n')[0]
                        elif hasattr(handler, '__name__'):
                            summary = handler.__name__.replace('_', ' ').title()

                        needs_auth = not any(openapi_path.startswith(p) for p in
                            ['/health', '/api/health', '/api/docs', '/api/redoc',
                             '/api/openapi', '/metrics', '/api/debug', '/api/status',
                             '/api/v1/status', '/webhook/', '/api/v1/auth/register',
                             '/api/v1/auth/login', '/api/v1/health'])

                        operation = {
                            "tags": [tag],
                            "summary": summary or _method_to_operation_id(method, openapi_path),
                            "operationId": _method_to_operation_id(method, openapi_path),
                            "responses": {
                                "200": {"description": "成功"},
                                "401": {"$ref": "#/components/responses/Unauthorized"} if needs_auth else {"description": "N/A"},
                            }
                        }
                        if needs_auth:
                            operation["security"] = [{"BearerAuth": []}]
                        if method in ('post', 'put', 'patch'):
                            operation["requestBody"] = {
                                "content": {"application/json": {"schema": {"type": "object"}}}
                            }

                        all_paths[openapi_path][method] = operation
                        auto_count += 1
        except Exception:
            pass  # Graceful fallback to manual paths only

    # Collect unique tags
    all_tags = set()
    for path_ops in all_paths.values():
        for op in path_ops.values():
            if isinstance(op, dict) and 'tags' in op:
                all_tags.update(op['tags'])

    tag_list = sorted([{"name": t, "description": f"{t}相關 API"} for t in all_tags], key=lambda x: x['name'])

    return {
        "openapi": OPENAPI_VERSION,
        "info": {**API_INFO, "x-auto-generated-routes": auto_count},
        "servers": SERVERS,
        "paths": dict(sorted(all_paths.items())),
        "components": {
            "schemas": COMMON_SCHEMAS,
            "responses": COMMON_RESPONSES,
            "securitySchemes": SECURITY_SCHEMES
        },
        "tags": tag_list
    }


def get_openapi_json(app=None) -> str:
    """獲取 OpenAPI JSON 字符串"""
    spec = generate_openapi_spec(app)
    return json.dumps(spec, ensure_ascii=False, indent=2)


# Swagger UI HTML 模板
SWAGGER_UI_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>TG-Matrix API 文檔</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
    <style>
        body { margin: 0; padding: 0; }
        .swagger-ui .topbar { display: none; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
        window.onload = function() {
            SwaggerUIBundle({
                url: "/api/openapi.json",
                dom_id: '#swagger-ui',
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: "BaseLayout",
                deepLinking: true,
                showExtensions: true,
                showCommonExtensions: true
            });
        };
    </script>
</body>
</html>
"""

# ReDoc HTML 模板
REDOC_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>TG-Matrix API 文檔</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; }
    </style>
</head>
<body>
    <redoc spec-url='/api/openapi.json'></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
</body>
</html>
"""
