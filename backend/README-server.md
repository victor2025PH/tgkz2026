# TG-AI智控王 License Server

🔐 卡密驗證和管理 API 服務器

## 🚀 部署方式

### 方式一：Docker 部署（推薦）

```bash
# 從 GitHub Container Registry 拉取
docker pull ghcr.io/<username>/<repo>:latest

# 運行
docker run -d \
  --name tgai-license-server \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  -e JWT_SECRET=your-secret-key \
  ghcr.io/<username>/<repo>:latest
```

### 方式二：直接運行

```bash
# 安裝依賴
pip install -r requirements-server.txt

# 運行
python start_admin_server.py --port 8080
```

### 方式三：使用 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  license-server:
    image: ghcr.io/<username>/<repo>:latest
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data
    environment:
      - JWT_SECRET=your-secret-key
    restart: unless-stopped
```

## 📋 API 端點

### 公開 API

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/health` | GET | 健康檢查 |
| `/api/license/validate` | POST | 驗證卡密 |
| `/api/license/activate` | POST | 激活卡密 |
| `/api/license/heartbeat` | POST | 心跳檢測 |

### 管理員 API

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/admin/login` | POST | 管理員登錄 |
| `/api/admin/dashboard` | GET | 儀表盤數據 |
| `/api/admin/users` | GET | 用戶列表 |
| `/api/admin/licenses` | GET | 卡密列表 |
| `/api/admin/licenses/generate` | POST | 生成卡密 |
| `/api/admin/licenses/disable` | POST | 禁用卡密 |

## 🔧 環境變量

| 變量 | 說明 | 默認值 |
|------|------|--------|
| `JWT_SECRET` | JWT 加密密鑰 | `tgai-license-secret-2026` |
| `PORT` | 監聽端口 | `8080` |

## 📁 數據持久化

數據庫文件存儲在 `/app/data/` 目錄，請確保掛載數據卷以持久化數據。

## 🔐 安全建議

1. **修改 JWT_SECRET**：生產環境請使用強密碼
2. **使用 HTTPS**：建議配置反向代理（如 Nginx）並啟用 SSL
3. **修改管理員密碼**：首次登錄後立即修改默認密碼

## 📄 License

MIT License
