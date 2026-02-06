# 上傳 GitHub 並部署 - 完整流程

> **更新日期**: 2026-02-05  
> **服務器**: 165.154.210.154  
> **用戶**: ubuntu

---

## 一、架構說明

| 組件 | 路徑 | 用途 | 部署方式 |
|------|------|------|----------|
| **主站 API** | `/opt/tg-matrix` | Web 前端 + API + Redis，含添加帳號等功能 | Docker Compose |
| **License Server** | `/opt/tg-matrix-server` | 卡密驗證、會員計費 | `deploy/one-click-deploy.bat` |

**添加帳號** 功能在 **主站 API**，路徑為 `/opt/tg-matrix`。

---

## 二、上傳 GitHub

**在本地項目根目錄 `d:\tgkz2026` 執行：**

```powershell
# 1. 查看改動
git status

# 2. 添加要提交的文件
git add backend/core/api_pool_integration.py backend/main.py backend/validators.py
# 或提交所有：git add .

# 3. 提交
git commit -m "fix: 修復添加帳號 API 憑據驗證"

# 4. 推送（會觸發 GitHub Actions 自動部署）
git push origin main
```

---

## 三、自動部署（GitHub Actions）

推送 `main` 後，`.github/workflows/deploy.yml` 會自動：

1. 構建前端（SaaS 模式）
2. 通過 rsync 同步到服務器 `/opt/tg-matrix/`
3. 在服務器上重建並重啟 `web`、`api` 容器

**前提條件**：

- 倉庫已配置 Secret：`SSH_PRIVATE_KEY`（服務器 SSH 私鑰）
- 服務器上已存在 `/opt/tg-matrix` 且 Docker 可用

查看部署狀態：GitHub 倉庫 → **Actions** 標籤

---

## 四、首次部署（服務器尚未有主站）

若服務器上沒有 `/opt/tg-matrix` 或 Docker 未安裝，需先做**首次初始化**：

```bash
# SSH 登錄
ssh ubuntu@165.154.210.154

# 1. 安裝 Docker（若未安裝）
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker ubuntu
# 登出再登入使 docker 組生效

# 2. 創建目錄並克隆
sudo mkdir -p /opt/tg-matrix
sudo chown ubuntu:ubuntu /opt/tg-matrix
cd /opt/tg-matrix
git clone https://github.com/victor2025PH/tgkz2026.git .

# 3. 創建數據目錄
mkdir -p data data/sessions data/logs

# 4. 啟動全部服務
sudo docker compose up -d --build

# 5. 檢查狀態
sudo docker compose ps
sudo docker compose logs api --tail=30
```

此後，本地 `git push origin main` 會由 GitHub Actions 自動同步並重啟。

---

## 五、手動部署（自動部署失敗時）

### 方式 A：SSH 在服務器上操作

```bash
ssh ubuntu@165.154.210.154

cd /opt/tg-matrix
git pull origin main
sudo docker compose build --no-cache api
sudo docker compose up -d --force-recreate web api
sleep 15
sudo docker compose ps
sudo docker compose logs api --tail=50
```

### 方式 B：本地 rsync 上傳（需已配置 SSH 密鑰）

```powershell
# 在本地 d:\tgkz2026 執行

# 1. 構建前端
npm run build -- --configuration=saas

# 2. 上傳
scp -r dist backend docker-compose.yml nginx.conf admin-panel ubuntu@165.154.210.154:/opt/tg-matrix/

# 3. 遠程重啟
ssh ubuntu@165.154.210.154 "cd /opt/tg-matrix && sudo docker compose build --no-cache api && sudo docker compose up -d --force-recreate web api"
```

---

## 六、驗證部署

```bash
# 在服務器或本地執行
curl -s http://165.154.210.154/api/health
# 期望返回 JSON 健康狀態

curl -s -o /dev/null -w "%{http_code}" http://165.154.210.154/api/v1/auth/me
# 期望 401（未授權），不是 404
```

---

## 七、常見問題

| 問題 | 原因 | 處理 |
|------|------|------|
| `cd /opt/tg-matrix: No such file or directory` | 主站從未部署 | 按「四、首次部署」執行 |
| `no configuration file provided: not found` | 當前目錄沒有 `docker-compose.yml` | 執行 `cd /opt/tg-matrix` 後再執行 docker 命令 |
| `fatal: not a git repository` | 當前目錄不是項目根目錄 | 進入 `/opt/tg-matrix` 或項目根目錄 |
| GitHub Actions 失敗 | 未配置 `SSH_PRIVATE_KEY` | 倉庫 Settings → Secrets → Actions 添加 |
| 添加帳號仍報錯 | API 容器未重建 | 執行 `sudo docker compose build --no-cache api && sudo docker compose up -d --force-recreate api` |

---

## 八、快速命令匯總

**本地推送：**
```powershell
git add .
git commit -m "fix: 修復說明"
git push origin main
```

**服務器手動部署：**
```bash
cd /opt/tg-matrix && git pull origin main && sudo docker compose build --no-cache api && sudo docker compose up -d --force-recreate web api
```
