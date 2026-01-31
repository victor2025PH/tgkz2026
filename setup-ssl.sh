#!/bin/bash
# SSL 證書設置腳本
# 域名: tgw.usdt2006.cc

DOMAIN="tgw.usdt2006.cc"
EMAIL="admin@usdt2006.cc"  # 請替換為您的郵箱

echo "========================================="
echo "  TG-Matrix SSL 證書設置"
echo "========================================="

# 創建目錄
mkdir -p certbot/conf certbot/www

# 停止現有服務
docker compose down

# 創建臨時 nginx 配置（僅用於證書驗證）
cat > nginx-temp.conf << 'NGINX_CONF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name tgw.usdt2006.cc;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
NGINX_CONF

# 啟動臨時 nginx
docker run -d --name nginx-temp \
    -p 80:80 \
    -v $(pwd)/nginx-temp.conf:/etc/nginx/nginx.conf:ro \
    -v $(pwd)/certbot/www:/var/www/certbot \
    nginx:alpine

echo "等待 nginx 啟動..."
sleep 5

# 申請證書
echo "正在申請 SSL 證書..."
docker run --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    certbot/certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# 停止臨時 nginx
docker stop nginx-temp
docker rm nginx-temp
rm nginx-temp.conf

# 檢查證書是否成功
if [ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo "========================================="
    echo "  SSL 證書申請成功！"
    echo "========================================="
    
    # 啟動服務
    docker compose up -d
    
    echo ""
    echo "請訪問: https://$DOMAIN"
else
    echo "========================================="
    echo "  SSL 證書申請失敗"
    echo "========================================="
    echo "請檢查："
    echo "1. DNS 記錄是否已生效 (A 記錄指向 165.154.210.154)"
    echo "2. 防火牆是否開放 80 端口"
    echo ""
    echo "您可以先使用 HTTP 訪問: http://165.154.210.154"
fi
