# TG-Matrix 運維操作手冊

> 最後更新：2026-02-07 | 版本：P10

---

## 目錄

1. [部署指南](#1-部署指南)
2. [日常運維](#2-日常運維)
3. [監控與告警](#3-監控與告警)
4. [故障排查](#4-故障排查)
5. [備份與恢復](#5-備份與恢復)
6. [回滾操作](#6-回滾操作)
7. [安全檢查清單](#7-安全檢查清單)

---

## 1. 部署指南

### 1.1 環境要求

| 組件 | 最低版本 | 推薦 |
|------|---------|------|
| Python | 3.11+ | 3.11 |
| Node.js | 18+ | 20 LTS |
| SQLite | 3.35+ | 系統自帶 |
| Redis | 6.0+ | 7.x |
| Docker | 20.10+ | 最新穩定版 |

### 1.2 Docker 部署（推薦）

```bash
# 1. 克隆代碼
git clone <repo_url> && cd tgkz2026

# 2. 配置環境
cp .env.example .env
# 編輯 .env，修改 SECRET_KEY、JWT_SECRET、ENCRYPTION_KEY

# 3. 構建並啟動
docker-compose up -d --build

# 4. 驗證部署
curl http://localhost:8000/api/v1/health
curl http://localhost:8000/api/v1/status
```

### 1.3 手動部署

```bash
# 後端
cd backend
pip install -r requirements.txt
python main.py

# 前端（SaaS 模式）
npm ci
npm run build:saas
# 將 dist/ 部署到 Nginx
```

### 1.4 數據庫合併（首次部署或測試重置）

測試階段若需重置數據庫，執行合併腳本統一 auth + tgmatrix 為單一主庫：

```bash
cd backend
python -m scripts.merge_db_init --fresh
```

- `--fresh`：刪除現有 tgmatrix.db 並重建（完全重置，不保留數據）
- 不加參數：增量初始化（若表已存在則跳過）

合併後：auth.db 已廢棄，所有認證與會員數據統一存於 tgmatrix.db。

### 1.5 環境變量（必須設置）

| 變量 | 說明 | 預設 |
|------|------|------|
| `SECRET_KEY` | Session 加密密鑰 | **必須修改** |
| `JWT_SECRET` | JWT 認證密鑰 | **必須修改** |
| `ENCRYPTION_KEY` | TG Session 加密密鑰 | **必須修改** |
| `DATABASE_PATH` | SQLite 數據庫路徑 | `/app/data/tgmatrix.db` |
| `REDIS_URL` | Redis 連接 URL | `redis://redis:6379/0` |
| `PORT` | HTTP 服務端口 | `8000` |
| `ENVIRONMENT` | 環境名稱 | `production` |

---

## 2. 日常運維

### 2.1 服務管理

```bash
# Docker 模式
docker-compose ps          # 查看服務狀態
docker-compose logs -f api # 查看後端日誌
docker-compose restart api # 重啟後端
docker-compose down        # 停止所有服務

# Systemd 模式
systemctl status tg-matrix
systemctl restart tg-matrix
journalctl -u tg-matrix -f
```

### 2.2 定期維護任務

| 任務 | 頻率 | 自動/手動 |
|------|------|----------|
| 數據庫備份 | 每 24 小時 | 自動（BackupManager） |
| 備份驗證 | 每日午夜 | 自動（P10-3） |
| 過期數據清理 | 每日 | 自動（daily_reset_task） |
| 日誌輪替 | 每 7 天 | logrotate |
| 安全更新 | 每週 | 手動 |

### 2.3 數據庫維護

```bash
# SQLite 健康檢查
sqlite3 /app/data/tgmatrix.db "PRAGMA quick_check;"

# WAL 模式檢查
sqlite3 /app/data/tgmatrix.db "PRAGMA journal_mode;"

# WAL 檔案清理（如過大）
sqlite3 /app/data/tgmatrix.db "PRAGMA wal_checkpoint(TRUNCATE);"

# 查看表空間
sqlite3 /app/data/tgmatrix.db "SELECT name, COUNT(*) FROM sqlite_master GROUP BY type;"
```

---

## 3. 監控與告警

### 3.1 健康檢查端點

| 端點 | 用途 | 預期狀態 |
|------|------|---------|
| `GET /api/v1/health` | 完整健康檢查 | 200 + `healthy` |
| `GET /api/v1/health/live` | 存活探針（K8s） | 200 |
| `GET /api/v1/health/ready` | 就緒探針（K8s） | 200 + `ready` |
| `GET /api/v1/health/info` | 服務信息 | 200 |
| `GET /api/v1/health/history` | 歷史記錄 | 200 |
| `GET /api/v1/status` | 狀態總覽頁 | 200 |

### 3.2 關鍵監控指標

- **服務健康**: `/api/v1/status` → `status` 字段
- **數據庫延遲**: `checks[db_performance].latency_ms` < 100ms
- **內存使用**: `checks[memory].details.percent` < 80%
- **磁盤使用**: `checks[disk].details.percent` < 85%
- **備份年齡**: `checks[backup].details.age_hours` < 25h
- **穩定性**: `stability_pct` > 95%

### 3.3 Docker 健康檢查

```yaml
# docker-compose.yml 已配置
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health/live"]
  interval: 30s
  timeout: 10s
  retries: 3
```

---

## 4. 故障排查

### 4.1 服務無法啟動

```bash
# 1. 檢查端口佔用
ss -tlnp | grep 8000

# 2. 檢查環境變量
cat .env | grep -v '^#' | grep -v '^$'

# 3. 檢查 Python 依賴
cd backend && pip check

# 4. 檢查數據庫可用性
sqlite3 /app/data/tgmatrix.db "SELECT 1;"

# 5. 查看啟動日誌
docker-compose logs api --tail=50
```

### 4.2 調試 auth/me 終身會員 (is_lifetime)

當前端顯示「剩餘27天」但後台顯示「終身」時，檢查 API 日誌與數據庫：

```bash
# 1. SSH 登錄服務器
ssh ubuntu@165.154.210.154

# 2. 進入項目目錄
cd /opt/tg-matrix

# 3. 實時查看 auth/me 日誌（讓 Vivian 無痕打開頁面觸發一次）
sudo docker compose logs -f api 2>&1 | grep "\[auth/me\]"

# 4. 查詢 Vivian 的 users 表記錄（按 username/nickname/telegram_id）
sudo docker compose exec api python3 -c "
import sqlite3
conn = sqlite3.connect('/app/data/tgmatrix.db')
conn.row_factory = sqlite3.Row
cur = conn.execute(\"SELECT id, user_id, username, nickname, telegram_id, membership_level, expires_at, is_lifetime, subscription_expires FROM users WHERE username='dthb3' OR nickname='Vivian' OR telegram_id='8041810715'\")
for r in cur.fetchall():
    print(dict(r))
conn.close()
"
```

日誌關鍵字段：`user.id`（auth 用）、`DB row is_lifetime`、`no matching row`、`final is_lifetime`。

### 4.3 數據庫鎖定 (Database Locked)

```bash
# 1. 檢查 WAL 模式
sqlite3 /app/data/tgmatrix.db "PRAGMA journal_mode;"
# 應該返回 "wal"

# 2. 檢查鎖狀態
fuser /app/data/tgmatrix.db*

# 3. 清理 WAL
sqlite3 /app/data/tgmatrix.db "PRAGMA wal_checkpoint(PASSIVE);"

# 4. 如果仍然鎖定 - 重啟服務
docker-compose restart api
```

### 4.3 內存不足

```bash
# 1. 檢查系統內存
free -h

# 2. 檢查進程內存
ps aux --sort=-rss | head -10

# 3. 重啟服務釋放內存
docker-compose restart api

# 4. 調整 Docker 記憶體限制
# 在 docker-compose.yml 中添加 deploy.resources.limits.memory
```

### 4.4 API 響應慢

```bash
# 1. 檢查狀態頁
curl http://localhost:8000/api/v1/status | python3 -m json.tool

# 2. 檢查數據庫查詢性能
# 看 checks[db_performance].latency_ms

# 3. 檢查 Redis 連接
redis-cli ping

# 4. 檢查磁盤 I/O
iostat -x 1 5

# 5. 若 SQLite WAL 過大
ls -lh /app/data/tgmatrix.db-wal
sqlite3 /app/data/tgmatrix.db "PRAGMA wal_checkpoint(TRUNCATE);"
```

### 4.5 遷移失敗

```bash
# 1. 查看遷移狀態
# 通過 WebSocket 發送 migration-status 命令

# 2. 手動回滾上一次遷移
# 通過 WebSocket 發送 rollback-migration 命令

# 3. 從預遷移備份恢復
ls -la /app/data/backups/
# 找到 pre-migration 備份，手動恢復
```

### 4.6 502 Bad Gateway（/api、/health 返回 502）

**原因**：Nginx 能收到請求，但上游 `api:8000` 無有效響應（API 容器未運行、崩潰或不可達）。

**在部署機上執行（例如 SSH 到 165.154.210.154 後）：**

```bash
# 1. 進入項目目錄（與 deploy 腳本一致）
cd /opt/tg-matrix

# 2. 查看容器狀態（api 應為 Up）
sudo docker compose ps

# 3. 查看 API 容器最近日誌（看是否報錯、退出）
sudo docker compose logs api --tail=100

# 4. 若 api 未運行或反覆重啟，先重啟並查看日誌
sudo docker compose up -d api
sudo docker compose logs api -f
# 無報錯後 Ctrl+C 退出

# 5. 在服務器本機測試上游是否可達
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health
# 應輸出 200

# 6. 若仍 502，重建 API 鏡像並重啟（代碼或依賴變更後）
sudo docker compose build --no-cache api
sudo docker compose up -d --force-recreate api
sleep 15
sudo docker compose ps
curl -s http://localhost:8000/health
```

**若域名 tgw.usdt2026.cc 指向其他機器**：在該機器上執行上述步驟，並確認該機已用本項目的 `docker-compose.yml` + `nginx.conf` 部署（Nginx 中 `upstream api_backend { server api:8000; }` 與 API 容器在同一 compose 網絡內）。

---

## 5. 備份與恢復

### 5.1 備份類型

| 類型 | 觸發方式 | 描述 |
|------|---------|------|
| scheduled | 自動（24h 間隔） | 定時備份 |
| startup | 服務啟動時 | 啟動前安全備份 |
| pre-migration | 遷移前 | 遷移前保護 |
| manual | API 調用 | 手動觸發 |

### 5.2 手動備份

```bash
# 通過 API
curl -X POST http://localhost:8000/api/v1/backups \
  -H "Authorization: Bearer <token>"

# 通過 SQLite 命令
sqlite3 /app/data/tgmatrix.db ".backup /app/data/backups/manual_$(date +%Y%m%d_%H%M%S).db"

# 壓縮備份
gzip -k /app/data/backups/manual_*.db
```

### 5.3 恢復步驟

```bash
# ⚠️ 恢復前務必停止服務

# 1. 停止服務
docker-compose stop api

# 2. 備份當前數據庫（安全起見）
cp /app/data/tgmatrix.db /app/data/tgmatrix.db.before_restore

# 3. 恢復備份
cp /app/data/backups/<backup_file>.db /app/data/tgmatrix.db

# 4. 驗證恢復後的數據庫
sqlite3 /app/data/tgmatrix.db "PRAGMA quick_check;"
sqlite3 /app/data/tgmatrix.db "SELECT COUNT(*) FROM users;"

# 5. 重啟服務
docker-compose start api

# 6. 驗證服務正常
curl http://localhost:8000/api/v1/health
```

### 5.4 備份保留策略

- 默認保留：**30 天**
- 自動清理：BackupManager 在每次備份時清理過期文件
- 建議：每月手動保存一份到外部存儲

---

## 6. 回滾操作

### 6.1 代碼回滾

```bash
# 1. 查看最近部署的版本
git log --oneline -10

# 2. 回滾到上一版本
git revert HEAD
# 或指定 commit
git checkout <commit_hash>

# 3. 重新部署
docker-compose up -d --build

# 4. 驗證
curl http://localhost:8000/api/v1/health/info
```

### 6.2 數據庫遷移回滾

```bash
# 通過 WebSocket 發送 rollback-migration 命令
# 或手動恢復 pre-migration 備份

# 查看遷移記錄
sqlite3 /app/data/tgmatrix.db "SELECT * FROM schema_version ORDER BY version DESC LIMIT 5;"
```

### 6.3 緊急回滾流程

1. **評估影響** — 確認回滾範圍（代碼/數據庫/配置）
2. **通知團隊** — 告知回滾決定和預計時間
3. **停止服務** — `docker-compose stop api`
4. **恢復代碼** — `git checkout <safe_tag>`
5. **恢復數據庫**（如需）— 見 5.3 恢復步驟
6. **重啟服務** — `docker-compose up -d --build`
7. **驗證** — 檢查健康端點和關鍵功能
8. **記錄** — 記錄回滾原因和後續修復計畫

---

## 7. 安全檢查清單

### 部署前

- [ ] `.env` 中的密鑰已修改（非默認值）
- [ ] 密鑰長度 >= 16 字符
- [ ] `.env` 文件權限設為 `600`
- [ ] `.gitignore` 包含 `.env`、`*.pem`、`*.key`
- [ ] CI 秘密掃描通過
- [ ] HTTPS/SSL 證書有效

### 定期檢查

- [ ] 依賴安全更新（`pip audit` / `npm audit`）
- [ ] 備份正常執行（`/api/v1/status` → backup check）
- [ ] 磁盤空間充足（< 85%）
- [ ] 日誌無異常錯誤模式
- [ ] 速率限制配置正確

---

## 附錄：常用命令速查

```bash
# 服務狀態
curl -s http://localhost:8000/api/v1/status | python3 -m json.tool

# 健康歷史
curl -s http://localhost:8000/api/v1/health/history?limit=10

# 前端審計日誌
curl -s "http://localhost:8000/api/v1/audit/frontend?limit=20"

# 數據庫大小
du -sh /app/data/tgmatrix.db*

# 備份列表
ls -lht /app/data/backups/ | head -10

# Docker 資源使用
docker stats --no-stream
```
