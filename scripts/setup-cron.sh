#!/bin/bash
# TG-AI智控王 定時任務設置腳本
# 設置每日自動備份和統計

set -e

PROJECT_DIR="/opt/tg-matrix-server"
SCRIPTS_DIR="$PROJECT_DIR/scripts"

echo "🕐 設置定時任務..."

# 確保腳本可執行
chmod +x $SCRIPTS_DIR/*.sh

# 創建 cron 任務
CRON_FILE="/tmp/tgai_cron"

cat > $CRON_FILE << 'EOF'
# TG-AI智控王 定時任務
# 每天凌晨 3:00 執行備份
0 3 * * * /opt/tg-matrix-server/scripts/daily-backup.sh >> /var/log/tgai-backup.log 2>&1

# 每小時生成統計（可選）
# 0 * * * * curl -s -X POST http://localhost:8080/api/admin/generate-daily-stats -H "Content-Type: application/json" > /dev/null 2>&1

# 每週日凌晨 4:00 清理日誌
0 4 * * 0 find /var/log -name "tgai-*.log" -mtime +30 -delete
EOF

# 安裝 cron 任務
crontab $CRON_FILE
rm $CRON_FILE

echo "✅ 定時任務設置完成"
echo ""
echo "已設置的任務:"
echo "  - 每天 03:00 自動備份數據庫"
echo "  - 每週日 04:00 清理舊日誌"
echo ""
echo "查看任務: crontab -l"
