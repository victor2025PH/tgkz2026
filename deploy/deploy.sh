#!/bin/bash
#
# TG-Matrix 服務器自動部署腳本
# 適用於 Ubuntu 20.04+ / Debian 11+
#
# 使用方法:
#   chmod +x deploy.sh
#   sudo ./deploy.sh
#

set -e

# ============ 配置 ============
APP_NAME="tg-matrix"
APP_DIR="/opt/tg-matrix-server"
DATA_DIR="/opt/tg-matrix-server/data"
LOG_DIR="/opt/tg-matrix-server/logs"
ADMIN_DIR="/opt/tg-matrix-server/admin-panel"
VENV_DIR="/opt/tg-matrix-server/venv"

# 服務配置
LICENSE_PORT=8080
ADMIN_PORT=3000

# 顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============ 函數 ============

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "請使用 root 權限運行此腳本"
        log_info "使用: sudo ./deploy.sh"
        exit 1
    fi
}

# ============ 安裝依賴 ============

install_dependencies() {
    log_info "更新系統包..."
    apt update && apt upgrade -y
    
    log_info "安裝基礎軟件..."
    apt install -y \
        python3 \
        python3-pip \
        python3-venv \
        nginx \
        certbot \
        python3-certbot-nginx \
        git \
        curl \
        wget \
        ufw \
        sqlite3 \
        supervisor
    
    log_success "依賴安裝完成"
}

# ============ 創建目錄 ============

create_directories() {
    log_info "創建應用目錄..."
    
    mkdir -p "$APP_DIR"
    mkdir -p "$DATA_DIR"
    mkdir -p "$LOG_DIR"
    mkdir -p "$ADMIN_DIR"
    
    log_success "目錄創建完成"
}

# ============ 複製文件 ============

copy_files() {
    log_info "複製應用文件..."
    
    # 獲取腳本所在目錄
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
    
    # 複製後端文件
    cp -r "$PROJECT_DIR/backend/"* "$APP_DIR/"
    
    # 複製管理後台
    if [ -d "$PROJECT_DIR/admin-panel" ]; then
        cp -r "$PROJECT_DIR/admin-panel/"* "$ADMIN_DIR/"
    fi
    
    log_success "文件複製完成"
}

# ============ 配置 Python 環境 ============

setup_python() {
    log_info "配置 Python 虛擬環境..."
    
    python3 -m venv "$VENV_DIR"
    source "$VENV_DIR/bin/activate"
    
    pip install --upgrade pip
    pip install \
        aiohttp \
        aiosqlite \
        pyjwt \
        cryptography \
        python-dotenv \
        psutil
    
    deactivate
    
    log_success "Python 環境配置完成"
}

# ============ 創建配置文件 ============

create_config() {
    log_info "創建配置文件..."
    
    cat > "$APP_DIR/config.env" << 'EOF'
# TG-Matrix License Server 配置

# 服務器設置
HOST=0.0.0.0
PORT=8080

# JWT 密鑰（請修改為隨機字符串！）
JWT_SECRET=CHANGE_THIS_TO_A_RANDOM_STRING

# 數據庫路徑
DB_PATH=/opt/tg-matrix-server/data/license_server.db

# 支付寶配置
ALIPAY_APP_ID=
ALIPAY_PRIVATE_KEY=
ALIPAY_PUBLIC_KEY=
ALIPAY_NOTIFY_URL=https://your-domain.com/api/callback/alipay

# 微信支付配置
WECHAT_APP_ID=
WECHAT_MCH_ID=
WECHAT_API_KEY=
WECHAT_NOTIFY_URL=https://your-domain.com/api/callback/wechat

# USDT 配置
USDT_TRC20_ADDRESS=
USDT_ERC20_ADDRESS=
USDT_RATE=7.2

# 易支付配置（可選）
EPAY_URL=
EPAY_PID=
EPAY_KEY=
EPAY_NOTIFY_URL=https://your-domain.com/api/callback/epay
EOF
    
    chmod 600 "$APP_DIR/config.env"
    
    log_warning "請編輯 $APP_DIR/config.env 設置您的密鑰和支付配置"
    log_success "配置文件創建完成"
}

# ============ 創建 Systemd 服務 ============

create_systemd_service() {
    log_info "創建 Systemd 服務..."
    
    cat > /etc/systemd/system/tg-matrix-license.service << EOF
[Unit]
Description=TG-Matrix License Server
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/config.env
ExecStart=$VENV_DIR/bin/python license_server.py run --host 127.0.0.1 --port $LICENSE_PORT
Restart=always
RestartSec=5
StandardOutput=append:$LOG_DIR/license-server.log
StandardError=append:$LOG_DIR/license-server-error.log

[Install]
WantedBy=multi-user.target
EOF
    
    # 設置目錄權限
    chown -R www-data:www-data "$APP_DIR"
    chown -R www-data:www-data "$DATA_DIR"
    chown -R www-data:www-data "$LOG_DIR"
    
    # 重載並啟動服務
    systemctl daemon-reload
    systemctl enable tg-matrix-license
    systemctl start tg-matrix-license
    
    log_success "Systemd 服務創建完成"
}

# ============ 配置 Nginx ============

configure_nginx() {
    log_info "配置 Nginx..."
    
    read -p "請輸入您的域名 (例如: license.example.com): " DOMAIN
    
    cat > /etc/nginx/sites-available/tg-matrix << EOF
# TG-Matrix License Server

server {
    listen 80;
    server_name $DOMAIN;
    
    # 重定向到 HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL 證書（稍後由 certbot 自動配置）
    # ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # 安全頭
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # License API
    location /api/ {
        proxy_pass http://127.0.0.1:$LICENSE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 管理後台
    location / {
        root $ADMIN_DIR;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
    
    # 靜態文件緩存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        root $ADMIN_DIR;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    # 啟用站點
    ln -sf /etc/nginx/sites-available/tg-matrix /etc/nginx/sites-enabled/
    
    # 刪除默認站點
    rm -f /etc/nginx/sites-enabled/default
    
    # 測試配置
    nginx -t
    
    # 重載 Nginx
    systemctl reload nginx
    
    log_success "Nginx 配置完成"
    
    # 申請 SSL 證書
    read -p "是否現在申請 SSL 證書? (y/n): " APPLY_SSL
    if [ "$APPLY_SSL" = "y" ]; then
        log_info "申請 SSL 證書..."
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@"$DOMAIN"
        log_success "SSL 證書申請完成"
    fi
}

# ============ 配置防火牆 ============

configure_firewall() {
    log_info "配置防火牆..."
    
    ufw allow ssh
    ufw allow http
    ufw allow https
    ufw --force enable
    
    log_success "防火牆配置完成"
}

# ============ 創建管理腳本 ============

create_management_scripts() {
    log_info "創建管理腳本..."
    
    # 生成卡密腳本
    cat > "$APP_DIR/generate-keys.sh" << 'EOF'
#!/bin/bash
# 生成卡密腳本
# 使用: ./generate-keys.sh [類型] [數量]
# 類型: B1/B2/B3/BY, G1/G2/G3/GY, D1/D2/D3/DY, S1/S2/S3/SY, K1/K2/K3/KY

cd /opt/tg-matrix-server
source venv/bin/activate
python license_generator.py generate ${1:-G2} -n ${2:-10}
deactivate
EOF
    chmod +x "$APP_DIR/generate-keys.sh"
    
    # 查看統計腳本
    cat > "$APP_DIR/show-stats.sh" << 'EOF'
#!/bin/bash
# 查看統計腳本

cd /opt/tg-matrix-server
source venv/bin/activate
python license_generator.py stats
python license_server.py stats
deactivate
EOF
    chmod +x "$APP_DIR/show-stats.sh"
    
    # 查看日誌腳本
    cat > "$APP_DIR/show-logs.sh" << 'EOF'
#!/bin/bash
# 查看日誌

echo "=== License Server Logs ==="
tail -f /opt/tg-matrix-server/logs/license-server.log
EOF
    chmod +x "$APP_DIR/show-logs.sh"
    
    # 備份腳本
    cat > "$APP_DIR/backup.sh" << 'EOF'
#!/bin/bash
# 數據備份腳本

BACKUP_DIR="/opt/tg-matrix-server/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# 備份數據庫
cp /opt/tg-matrix-server/data/license_server.db "$BACKUP_DIR/license_server_$DATE.db"
cp /opt/tg-matrix-server/data/licenses.json "$BACKUP_DIR/licenses_$DATE.json" 2>/dev/null || true

# 清理舊備份（保留7天）
find "$BACKUP_DIR" -type f -mtime +7 -delete

echo "✅ 備份完成: $BACKUP_DIR"
EOF
    chmod +x "$APP_DIR/backup.sh"
    
    # 添加定時備份
    (crontab -l 2>/dev/null; echo "0 3 * * * $APP_DIR/backup.sh") | crontab -
    
    log_success "管理腳本創建完成"
}

# ============ 顯示信息 ============

show_info() {
    echo ""
    echo "=================================================="
    echo -e "${GREEN}✅ TG-Matrix License Server 部署完成！${NC}"
    echo "=================================================="
    echo ""
    echo "📁 安裝目錄: $APP_DIR"
    echo "📊 數據目錄: $DATA_DIR"
    echo "📝 日誌目錄: $LOG_DIR"
    echo ""
    echo "🔧 管理命令:"
    echo "  生成卡密: $APP_DIR/generate-keys.sh G2 10"
    echo "  查看統計: $APP_DIR/show-stats.sh"
    echo "  查看日誌: $APP_DIR/show-logs.sh"
    echo "  數據備份: $APP_DIR/backup.sh"
    echo ""
    echo "🔄 服務管理:"
    echo "  啟動: systemctl start tg-matrix-license"
    echo "  停止: systemctl stop tg-matrix-license"
    echo "  重啟: systemctl restart tg-matrix-license"
    echo "  狀態: systemctl status tg-matrix-license"
    echo ""
    echo "⚠️  重要提醒:"
    echo "  1. 請編輯 $APP_DIR/config.env 設置 JWT 密鑰"
    echo "  2. 請配置支付參數"
    echo "  3. 確保域名已正確解析到此服務器"
    echo ""
    echo "📖 API 端點:"
    echo "  POST /api/license/validate - 驗證卡密"
    echo "  POST /api/license/activate - 激活卡密"
    echo "  POST /api/license/heartbeat - 心跳檢測"
    echo "  GET  /api/stats - 獲取統計"
    echo ""
}

# ============ 主流程 ============

main() {
    echo ""
    echo "=================================================="
    echo "   TG-Matrix License Server 自動部署腳本"
    echo "   王者榮耀風格會員等級系統"
    echo "=================================================="
    echo ""
    
    check_root
    
    echo "此腳本將自動安裝和配置:"
    echo "  - Python 3 + 虛擬環境"
    echo "  - Nginx 反向代理"
    echo "  - SSL 證書 (Let's Encrypt)"
    echo "  - Systemd 服務"
    echo "  - 防火牆規則"
    echo ""
    
    read -p "是否繼續? (y/n): " CONFIRM
    if [ "$CONFIRM" != "y" ]; then
        echo "已取消"
        exit 0
    fi
    
    install_dependencies
    create_directories
    copy_files
    setup_python
    create_config
    create_systemd_service
    configure_nginx
    configure_firewall
    create_management_scripts
    show_info
}

main "$@"
