#!/bin/bash
# TG-Matrix 部署腳本

set -e

echo "======================================"
echo "  TG-Matrix 自動部署腳本"
echo "======================================"

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 檢查是否為 root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}請使用 root 權限運行此腳本${NC}"
    exit 1
fi

echo -e "${GREEN}[1/6] 更新系統...${NC}"
apt-get update && apt-get upgrade -y

echo -e "${GREEN}[2/6] 安裝 Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo "Docker 已安裝，跳過"
fi

echo -e "${GREEN}[3/6] 安裝 Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    apt-get install -y docker-compose
else
    echo "Docker Compose 已安裝，跳過"
fi

echo -e "${GREEN}[4/6] 創建數據目錄...${NC}"
mkdir -p /opt/tg-matrix/data/sessions
mkdir -p /opt/tg-matrix/data/logs
cd /opt/tg-matrix

echo -e "${GREEN}[5/6] 拉取最新代碼...${NC}"
if [ -d ".git" ]; then
    git pull origin main
else
    echo -e "${YELLOW}請先克隆代碼庫${NC}"
    echo "git clone https://github.com/YOUR_USERNAME/tg-matrix.git ."
    exit 1
fi

echo -e "${GREEN}[6/6] 啟動服務...${NC}"
docker-compose down 2>/dev/null || true
docker-compose build --no-cache
docker-compose up -d

echo ""
echo -e "${GREEN}======================================"
echo "  部署完成！"
echo "======================================${NC}"
echo ""
echo "訪問地址: http://$(curl -s ifconfig.me)"
echo ""
echo "查看日誌: docker-compose logs -f"
echo "停止服務: docker-compose down"
echo ""
