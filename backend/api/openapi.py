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


def generate_openapi_spec() -> Dict[str, Any]:
    """生成完整的 OpenAPI 規範"""
    return {
        "openapi": OPENAPI_VERSION,
        "info": API_INFO,
        "servers": SERVERS,
        "paths": API_PATHS,
        "components": {
            "schemas": COMMON_SCHEMAS,
            "responses": COMMON_RESPONSES,
            "securitySchemes": SECURITY_SCHEMES
        },
        "tags": [
            {"name": "認證", "description": "用戶認證相關 API"},
            {"name": "帳號管理", "description": "Telegram 帳號管理"},
            {"name": "訂閱", "description": "訂閱和付款"},
            {"name": "使用量", "description": "使用量統計"},
            {"name": "系統", "description": "系統狀態和監控"}
        ]
    }


def get_openapi_json() -> str:
    """獲取 OpenAPI JSON 字符串"""
    spec = generate_openapi_spec()
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
