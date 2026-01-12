#!/bin/bash
# TG-AI智控王 服務器更新腳本
# 在服務器上執行此腳本來更新和重啟服務

set -e

echo "🚀 TG-AI智控王 服務器更新"
echo "========================="

# 配置
PROJECT_DIR="/opt/tg-matrix-server"
VENV_PATH="$PROJECT_DIR/venv"
SERVICE_NAME="tg-matrix-license"

# 進入項目目錄
cd $PROJECT_DIR

# 拉取最新代碼
echo "📥 拉取最新代碼..."
git pull origin main

# 激活虛擬環境
echo "🐍 激活虛擬環境..."
source $VENV_PATH/bin/activate

# 安裝依賴
echo "📦 安裝/更新依賴..."
pip install -r backend/requirements.txt -q

# 初始化/更新數據庫
echo "🗄️ 更新數據庫..."
python backend/license_server.py init

# 重啟服務
echo "🔄 重啟服務..."
sudo systemctl restart $SERVICE_NAME

# 等待服務啟動
sleep 3

# 檢查服務狀態
echo "📊 檢查服務狀態..."
if systemctl is-active --quiet $SERVICE_NAME; then
    echo "✅ 服務已正常運行"
    
    # 健康檢查
    echo "🏥 健康檢查..."
    curl -s http://localhost:8080/api/health | python -m json.tool || echo "⚠️ API 健康檢查失敗"
else
    echo "❌ 服務啟動失敗"
    sudo systemctl status $SERVICE_NAME
    exit 1
fi

# 生成今日統計
echo "📈 生成今日統計..."
curl -s -X POST http://localhost:8080/api/admin/generate-daily-stats \
    -H "Authorization: Bearer $(cat /tmp/admin_token 2>/dev/null || echo '')" \
    -H "Content-Type: application/json" || echo "⚠️ 統計生成跳過 (需要管理員 token)"

echo ""
echo "✨ 更新完成！"
echo "📍 管理後台: https://tgkz.usdt2026.cc/admin/"
echo "📍 API 端點: https://tgkz.usdt2026.cc/api/"
