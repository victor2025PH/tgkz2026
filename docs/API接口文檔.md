# API 對接池 - 接口文檔

## 概述

本文檔描述 API 對接池系統的所有 HTTP 接口。所有接口均需要 Bearer Token 認證（除特別說明外）。

**基礎 URL**: `http://your-server:8080/api`

**認證方式**: 
```
Authorization: Bearer <token>
```

---

## 1. API 池管理

### 1.1 獲取所有 API

**GET** `/admin/api-pool`

**查詢參數**:
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| status | string | 否 | 過濾狀態 (available/in_use/disabled/banned) |
| group_id | string | 否 | 過濾分組 |

**響應示例**:
```json
{
  "success": true,
  "data": {
    "apis": [
      {
        "api_id": "uuid-xxx",
        "name": "API-001",
        "status": "available",
        "max_accounts": 10,
        "current_accounts": 3,
        "success_count": 150,
        "fail_count": 2,
        "health_score": 95.5,
        "group_id": "group-1"
      }
    ],
    "total": 1
  }
}
```

### 1.2 添加 API

**POST** `/admin/api-pool`

**請求體**:
```json
{
  "api_id": "12345678",
  "api_hash": "abcdef123456",
  "name": "API-001",
  "max_accounts": 10,
  "group_id": "group-1"
}
```

**響應示例**:
```json
{
  "success": true,
  "message": "API 添加成功",
  "data": {
    "api_id": "uuid-xxx"
  }
}
```

### 1.3 批量導入 API

**POST** `/admin/api-pool/batch-import`

**請求體**:
```json
{
  "format": "csv",
  "data": "api_id,api_hash,name\n12345,abc123,API-1\n67890,def456,API-2"
}
```

**支持格式**: csv, json, text

### 1.4 更新 API

**PUT** `/admin/api-pool/{api_id}`

**請求體**:
```json
{
  "name": "API-001-Updated",
  "max_accounts": 15,
  "status": "available"
}
```

### 1.5 刪除 API

**DELETE** `/admin/api-pool/{api_id}`

---

## 2. API 分配

### 2.1 分配 API

**POST** `/admin/api-pool/allocate`

**請求體**:
```json
{
  "account_id": "acc-12345",
  "strategy": "balanced",
  "group_id": "group-1"
}
```

**分配策略**:
- `balanced`: 負載均衡
- `success_rate`: 成功率優先
- `least_failures`: 最少失敗
- `round_robin`: 輪詢

**響應示例**:
```json
{
  "success": true,
  "data": {
    "api_id": "uuid-xxx",
    "api_hash": "hash-xxx",
    "allocation_id": "alloc-xxx"
  }
}
```

### 2.2 釋放 API

**POST** `/admin/api-pool/release`

**請求體**:
```json
{
  "account_id": "acc-12345"
}
```

### 2.3 獲取分配歷史

**GET** `/admin/api-pool/allocation-history`

**查詢參數**:
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| limit | int | 否 | 返回數量，默認 100 |
| api_id | string | 否 | 過濾特定 API |
| account_id | string | 否 | 過濾特定帳號 |

---

## 3. API 分組

### 3.1 獲取所有分組

**GET** `/admin/api-pool/groups`

### 3.2 創建分組

**POST** `/admin/api-pool/groups`

**請求體**:
```json
{
  "name": "高級組",
  "description": "高優先級 API",
  "attributes": {
    "priority": "high"
  }
}
```

### 3.3 更新分組

**PUT** `/admin/api-pool/groups/{group_id}`

### 3.4 刪除分組

**DELETE** `/admin/api-pool/groups/{group_id}`

---

## 4. 健康監控

### 4.1 獲取健康狀態

**GET** `/admin/api-pool/health`

**響應示例**:
```json
{
  "success": true,
  "data": {
    "total_apis": 50,
    "average_score": 87.5,
    "overall_grade": "good",
    "grade_distribution": {
      "excellent": 20,
      "good": 25,
      "fair": 3,
      "poor": 2,
      "critical": 0
    },
    "critical_apis": [],
    "needs_attention": 2
  }
}
```

### 4.2 獲取使用統計

**GET** `/admin/api-pool/stats`

**查詢參數**:
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| hours | int | 否 | 統計時間範圍，默認 24 |

---

## 5. 告警管理

### 5.1 獲取告警配置

**GET** `/admin/alerts/config`

### 5.2 更新告警配置

**PUT** `/admin/alerts/config`

**請求體**:
```json
{
  "enabled": true,
  "webhook_url": "https://example.com/webhook",
  "throttle_minutes": 30,
  "min_level": "warning"
}
```

### 5.3 獲取告警歷史

**GET** `/admin/alerts/history`

**查詢參數**:
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| limit | int | 否 | 返回數量 |
| level | string | 否 | 過濾級別 |

---

## 6. 智能預測 (P10)

### 6.1 預測使用量

**GET** `/admin/ml/predict/usage`

**查詢參數**:
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| metric | string | 否 | 指標名，默認 api_calls |
| periods | int | 否 | 預測時段數，默認 24 |

**響應示例**:
```json
{
  "success": true,
  "data": {
    "prediction": {
      "type": "usage",
      "values": [120, 125, 130, ...],
      "timestamps": ["2026-02-06T01:00:00", ...],
      "confidence": 0.85,
      "model_info": {
        "method": "holt_winters"
      }
    }
  }
}
```

### 6.2 預測容量

**POST** `/admin/ml/predict/capacity`

**請求體**:
```json
{
  "current_usage": 75,
  "total_capacity": 100,
  "metric_name": "api_slots"
}
```

### 6.3 分析使用模式

**GET** `/admin/ml/patterns`

---

## 7. 災備恢復 (P10)

### 7.1 創建備份

**POST** `/admin/backup`

**請求體**:
```json
{
  "source_path": "/data/api_pool.db",
  "backup_type": "full",
  "compress": true
}
```

### 7.2 列出備份

**GET** `/admin/backups`

### 7.3 驗證備份

**POST** `/admin/backup/{backup_id}/verify`

### 7.4 恢復備份

**POST** `/admin/backup/{backup_id}/restore`

**請求體**:
```json
{
  "target_path": "/data/api_pool.db",
  "verify_first": true
}
```

### 7.5 獲取 RPO 狀態

**GET** `/admin/dr/rpo`

---

## 8. 成本優化 (P10)

### 8.1 獲取成本摘要

**GET** `/admin/cost/summary`

**查詢參數**:
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| days | int | 否 | 統計天數，默認 30 |
| tenant_id | string | 否 | 過濾租戶 |

### 8.2 獲取成本分解

**GET** `/admin/cost/breakdown`

**查詢參數**:
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| group_by | string | 否 | 分組方式：resource_type/resource_id/tenant_id |

### 8.3 預測成本

**GET** `/admin/cost/forecast`

### 8.4 獲取優化建議

**GET** `/admin/cost/recommendations`

---

## 9. 性能分析 (P10)

### 9.1 獲取延遲統計

**GET** `/admin/performance/latency`

**查詢參數**:
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| endpoint | string | 否 | 過濾端點 |
| hours | int | 否 | 統計時間 |

**響應示例**:
```json
{
  "success": true,
  "data": {
    "sample_count": 1000,
    "min": 50,
    "max": 500,
    "mean": 120,
    "p50": 100,
    "p90": 200,
    "p99": 450
  }
}
```

### 9.2 檢測瓶頸

**POST** `/admin/performance/bottlenecks/detect`

### 9.3 列出瓶頸

**GET** `/admin/performance/bottlenecks`

### 9.4 獲取性能摘要

**GET** `/admin/performance/summary`

---

## 10. 報告生成 (P10)

### 10.1 生成每日報告

**POST** `/admin/reports/daily`

**請求體**:
```json
{
  "date": "2026-02-05",
  "tenant_id": ""
}
```

### 10.2 生成每週報告

**POST** `/admin/reports/weekly`

**請求體**:
```json
{
  "week_start": "2026-01-27"
}
```

### 10.3 獲取報告

**GET** `/admin/reports/{report_id}`

### 10.4 列出報告

**GET** `/admin/reports`

**查詢參數**:
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| type | string | 否 | 報告類型 |
| limit | int | 否 | 返回數量 |

### 10.5 導出報告

**GET** `/admin/reports/{report_id}/export`

**查詢參數**:
| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| format | string | 否 | 導出格式：json/html/markdown/csv |

---

## 11. 服務狀態

### 11.1 獲取服務儀表盤

**GET** `/admin/service-dashboard`

### 11.2 獲取 SLA 狀態

**GET** `/admin/service-dashboard/sla`

### 11.3 獲取公共狀態頁

**GET** `/api/status` (無需認證)

---

## 錯誤碼

| 錯誤碼 | 說明 |
|--------|------|
| 1001 | 認證失敗 |
| 1002 | Token 過期 |
| 2001 | 參數無效 |
| 2002 | 資源不存在 |
| 2003 | 資源已存在 |
| 3001 | API 池已滿 |
| 3002 | 無可用 API |
| 5001 | 內部錯誤 |

---

## 響應格式

### 成功響應
```json
{
  "success": true,
  "data": {...},
  "message": "操作成功"
}
```

### 錯誤響應
```json
{
  "success": false,
  "error": {
    "code": 2001,
    "message": "參數無效"
  }
}
```

---

**文檔版本**: 1.0  
**最後更新**: 2026-02-06
