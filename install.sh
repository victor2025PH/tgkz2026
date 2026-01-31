#!/bin/bash
# TG-Matrix 一鍵部署腳本
# 使用方法: curl -sSL https://raw.githubusercontent.com/victor2025PH/tgkz2026/main/install.sh | bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}"
echo "======================================"
echo "  TG-Matrix 一鍵部署"
echo "======================================"
echo -e "${NC}"

# 檢查 root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}請使用 root 權限運行${NC}"
    exit 1
fi

# 安裝 Docker
echo -e "${GREEN}[1/5] 安裝 Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# 安裝 Docker Compose
echo -e "${GREEN}[2/5] 安裝 Docker Compose...${NC}"
apt-get update
apt-get install -y docker-compose git

# 克隆代碼
echo -e "${GREEN}[3/5] 下載代碼...${NC}"
mkdir -p /opt/tg-matrix
cd /opt/tg-matrix
if [ -d ".git" ]; then
    git pull origin main
else
    git clone https://github.com/victor2025PH/tgkz2026.git .
fi

# 創建目錄
echo -e "${GREEN}[4/5] 創建數據目錄...${NC}"
mkdir -p data/sessions data/logs

# 啟動服務
echo -e "${GREEN}[5/5] 啟動服務...${NC}"
docker-compose up -d --build

# 完成
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_IP")
echo ""
echo -e "${GREEN}======================================"
echo "  部署完成！"
echo "======================================${NC}"
echo ""
echo -e "訪問地址: ${YELLOW}http://${PUBLIC_IP}${NC}"
echo ""
echo "常用命令:"
echo "  查看日誌: cd /opt/tg-matrix && docker-compose logs -f"
echo "  重啟服務: cd /opt/tg-matrix && docker-compose restart"
echo "  停止服務: cd /opt/tg-matrix && docker-compose down"
echo ""
