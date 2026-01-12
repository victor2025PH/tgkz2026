#!/bin/bash
#
# TG-Matrix SSL 證書配置腳本
# 域名: tgkz.usdt2026.cc
#

set -e

DOMAIN="tgkz.usdt2026.cc"
APP_DIR="/opt/tg-matrix-server"

echo "=============================================="
echo "   配置 SSL 證書"
echo "   域名: $DOMAIN"
echo "=============================================="

# 1. 確保項目已部署
if [ ! -d "$APP_DIR" ]; then
    echo "❌ 錯誤: 請先運行部署腳本"
    echo "curl -sSL https://raw.githubusercontent.com/victor2025PH/tgkz2026/main/deploy/remote-deploy.sh | bash"
    exit 1
fi

# 2. 安裝 Certbot
echo "[1/4] 安裝 Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# 3. 配置 Nginx（使用域名）
echo "[2/4] 配置 Nginx..."
sudo tee /etc/nginx/sites-available/tg-matrix << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
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

sudo nginx -t && sudo systemctl reload nginx

# 4. 申請 SSL 證書
echo "[3/4] 申請 SSL 證書..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

# 5. 設置自動續期
echo "[4/4] 配置自動續期..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

echo ""
echo "=============================================="
echo "✅ SSL 配置完成！"
echo "=============================================="
echo ""
echo "🔒 HTTPS 管理後台: https://$DOMAIN"
echo "🔌 API 地址: https://$DOMAIN/api/"
echo ""
echo "📋 證書信息:"
sudo certbot certificates
echo ""
