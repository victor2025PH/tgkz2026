#!/bin/bash
#
# TG-Matrix 遠程部署腳本
# 在服務器上執行此腳本進行自動部署
#

set -e

echo "=============================================="
echo "   TG-Matrix License Server 自動部署"
echo "   王者榮耀風格會員等級系統"
echo "=============================================="

# 配置
APP_DIR="/opt/tg-matrix-server"
GITHUB_REPO="https://github.com/victor2025PH/tgkz2026.git"

# 顏色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}[1/8] 更新系統...${NC}"
sudo apt update && sudo apt upgrade -y

echo -e "${GREEN}[2/8] 安裝依賴...${NC}"
sudo apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx git curl

echo -e "${GREEN}[3/8] 創建目錄...${NC}"
sudo mkdir -p $APP_DIR/{data,logs,backups}
sudo chown -R $USER:$USER $APP_DIR

echo -e "${GREEN}[4/8] 克隆項目...${NC}"
cd /opt
if [ -d "$APP_DIR/.git" ]; then
    cd $APP_DIR
    git pull
else
    rm -rf $APP_DIR
    git clone $GITHUB_REPO $APP_DIR
fi

echo -e "${GREEN}[5/8] 配置 Python 環境...${NC}"
cd $APP_DIR
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install aiohttp aiosqlite pyjwt cryptography python-dotenv psutil
deactivate

echo -e "${GREEN}[6/8] 創建配置文件...${NC}"
if [ ! -f "$APP_DIR/config.env" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    cat > $APP_DIR/config.env << EOF
# TG-Matrix License Server 配置
HOST=0.0.0.0
PORT=8080

# JWT 密鑰
JWT_SECRET=$JWT_SECRET

# 數據庫
DB_PATH=$APP_DIR/data/license_server.db

# USDT 配置
USDT_TRC20_ADDRESS=
USDT_RATE=7.2
EOF
    echo -e "${YELLOW}已創建配置文件: $APP_DIR/config.env${NC}"
    echo -e "${YELLOW}請稍後編輯此文件設置您的 USDT 地址${NC}"
fi

echo -e "${GREEN}[7/8] 創建 Systemd 服務...${NC}"
sudo tee /etc/systemd/system/tg-matrix-license.service > /dev/null << EOF
[Unit]
Description=TG-Matrix License Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR/backend
EnvironmentFile=$APP_DIR/config.env
ExecStart=$APP_DIR/venv/bin/python license_server.py run --host 0.0.0.0 --port 8080
Restart=always
RestartSec=5
StandardOutput=append:$APP_DIR/logs/license-server.log
StandardError=append:$APP_DIR/logs/license-server-error.log

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable tg-matrix-license
sudo systemctl restart tg-matrix-license

echo -e "${GREEN}[8/8] 配置 Nginx...${NC}"
sudo tee /etc/nginx/sites-available/tg-matrix > /dev/null << EOF
server {
    listen 80;
    server_name _;
    
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        
        # CORS
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
        
        if (\$request_method = OPTIONS) {
            return 204;
        }
    }
    
    location / {
        root $APP_DIR/admin-panel;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/tg-matrix /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "=============================================="
echo -e "${GREEN}✅ 部署完成！${NC}"
echo "=============================================="
echo ""
echo "📍 管理後台: http://$(curl -s ifconfig.me)"
echo "📍 API 地址: http://$(curl -s ifconfig.me)/api/"
echo ""
echo "🔧 管理命令:"
echo "  生成卡密: cd $APP_DIR/backend && source ../venv/bin/activate && python license_generator.py generate G2 -n 10"
echo "  查看統計: cd $APP_DIR/backend && source ../venv/bin/activate && python license_generator.py stats"
echo "  查看價格: cd $APP_DIR/backend && source ../venv/bin/activate && python license_generator.py prices"
echo ""
echo "🔄 服務管理:"
echo "  狀態: sudo systemctl status tg-matrix-license"
echo "  日誌: tail -f $APP_DIR/logs/license-server.log"
echo ""
