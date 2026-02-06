# TG-AI智控王 部署驗證報告

**日期**: 2026-02-05

## ✅ 已完成的驗證

### 1. 構建修復與成功
- **修復內容**:
  - `src/services/realtime-events.service.ts`: 修正 ElectronIpcService 導入路徑 (`./` → `../`)
  - `src/components/alert-notification.component.ts`: 將 `send` 改為 `invoke` 以正確獲取異步響應
  - `src/admin/system-alerts.component.ts`: 同上
- **構建結果**: ✅ `npm run build:saas` 成功
- **輸出位置**: `d:\tgkz2026\dist\`

### 2. 後端測試
- **部分通過**: 148 個測試中，AB Testing、Marketing Task、Validators、WebSocket 等核心模組通過
- **需環境**: 部分測試需要 Redis、數據庫等依賴（如 test_api.py, test_database.py）

### 3. 部署配置驗證
- **GitHub Actions**: `.github/workflows/deploy.yml` 配置正確
  - 觸發: push to main 或手動觸發
  - 構建: `npm run build --configuration=saas`
  - 目標服務器: 165.154.210.154
  - 部署路徑: /opt/tg-matrix
- **Docker Compose**: `docker-compose.yml` 含 web (nginx)、api、redis 服務

## 📋 部署步驟

### 方式一：GitHub Actions 自動部署
```bash
# 推送到 main 分支觸發自動部署
git add .
git commit -m "fix: 修復構建錯誤，準備部署"
git push origin main
```

或前往 GitHub 倉庫 → Actions → "Deploy to Production" → Run workflow

### 方式二：一鍵部署（License Server）
```bash
# 執行 Windows 批處理
deploy\one-click-deploy.bat
```

### 方式三：本地 Docker 部署
```bash
# 1. 確保已構建
npm run build:saas

# 2. 啟動服務
docker compose up -d

# 3. 健康檢查
curl http://localhost/api/health
```

## 🔧 E2E 測試說明

E2E 測試需要：
1. **安裝 Playwright 瀏覽器**: `npx playwright install chromium`
2. **先手動啟動開發服務器**: `npm run dev`（在另一個終端）
3. **運行測試**: `npx playwright test e2e/tests/core-flows.spec.ts`

注意：Playwright 的 baseURL 在部分環境下可能需調整為完整 URL。

## 📊 新功能對照（v2.1.0 CHANGELOG）

| 功能 | 狀態 |
|------|------|
| 歷史消息用戶收集增強 | ✅ 構建包含 |
| 專用配置對話框 | ✅ |
| 時間/活躍度篩選 | ✅ |
| 快速模板 | ✅ |
| 後端 get-history-collection-stats API | ✅ |
| 後端 collect-users-from-history-advanced API | ✅ |
| 群組詳情頁用戶收集區域重設計 | ✅ |

## ⚠️ 待處理項目

1. **Angular 單元測試**: 項目未配置 `test` architect target
2. **E2E baseURL**: 若遇 "invalid URL" 錯誤，可將測試中的 `page.goto('/')` 改為 `page.goto('http://localhost:4200/')`
