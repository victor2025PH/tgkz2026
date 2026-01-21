# TG-AI智控王 管理後台

🤖 TG-AI智控王的網頁管理後台，用於管理用戶、卡密、訂單等。

## 🚀 部署方式

### 方式一：GitHub Pages（推薦）

1. Fork 此倉庫
2. 進入 Settings → Pages
3. Source 選擇 "GitHub Actions"
4. 推送代碼後自動部署

訪問地址：`https://<username>.github.io/<repo-name>/`

### 方式二：本地部署

```bash
# 啟動後台 API 服務器
cd ../backend
python start_admin_server.py --port 8080

# 訪問
open http://localhost:8080/login.html
```

## ⚙️ 配置說明

### GitHub Pages 配置

由於 GitHub Pages 只能託管靜態文件，需要單獨部署 API 服務器。

**首次訪問時：**
1. 系統會彈出配置對話框
2. 輸入你的 API 服務器地址（如：`https://api.example.com`）
3. 點擊保存

**手動配置：**
```javascript
// 在瀏覽器控制台執行
localStorage.setItem('api_server', 'https://your-api-server.com');
location.reload();
```

## 📋 功能列表

| 功能 | 說明 |
|------|------|
| 📊 儀表盤 | 統計總覽、實時數據 |
| 👥 用戶管理 | 查看、封禁、延期 |
| 🎟️ 卡密管理 | 生成、禁用、導出 |
| 💰 訂單管理 | 確認支付、記錄查詢 |
| 💹 收入報表 | 日/週/月統計 |
| 💻 設備管理 | 設備綁定、撤銷授權 |
| 📢 公告管理 | 創建、編輯、發布 |
| ⚙️ 系統設置 | 價格、通知配置 |

## 🔐 默認帳號

- **用戶名：** `admin`
- **密碼：** `admin123`

⚠️ 請在首次登錄後立即修改密碼！

## 📄 License

MIT License
