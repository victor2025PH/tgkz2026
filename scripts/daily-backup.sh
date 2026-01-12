#!/bin/bash
# TG-AI智控王 每日備份腳本
# 用於 cron 定時執行

set -e

# 配置
PROJECT_DIR="/opt/tg-matrix-server"
DB_PATH="$PROJECT_DIR/backend/data/tgai_server.db"
BACKUP_DIR="$PROJECT_DIR/backups"
KEEP_DAYS=30  # 保留天數

# 創建備份目錄
mkdir -p $BACKUP_DIR

# 生成備份
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/tgai_server_$TIMESTAMP.db"

echo "[$(date)] 開始備份..."

# 使用 SQLite 的 backup 命令進行安全備份
sqlite3 $DB_PATH ".backup '$BACKUP_FILE'"

# 壓縮備份
gzip $BACKUP_FILE
echo "[$(date)] 備份完成: ${BACKUP_FILE}.gz"

# 清理舊備份
find $BACKUP_DIR -name "*.db.gz" -mtime +$KEEP_DAYS -delete
echo "[$(date)] 已清理 $KEEP_DAYS 天前的備份"

# 生成每日統計 (如果服務運行中)
if systemctl is-active --quiet tg-matrix-license; then
    echo "[$(date)] 生成每日統計..."
    curl -s -X POST http://localhost:8080/api/admin/generate-daily-stats \
        -H "Content-Type: application/json" || echo "[$(date)] 統計生成跳過"
fi

echo "[$(date)] 備份任務完成"
