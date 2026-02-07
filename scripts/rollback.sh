#!/bin/bash
# 🔧 P10-6: 緊急回滾腳本
#
# 用法：
#   ./scripts/rollback.sh                    # 回滾到上一個版本
#   ./scripts/rollback.sh <commit_hash>      # 回滾到指定版本
#   ./scripts/rollback.sh --with-db <hash>   # 回滾代碼+數據庫
#
# 注意：此腳本會停止服務，需要管理員權限

set -euo pipefail

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# 配置
APP_DIR="${APP_DIR:-/opt/tg-matrix}"
DATA_DIR="${DATA_DIR:-/app/data}"
DB_FILE="${DATA_DIR}/tgmatrix.db"
BACKUP_DIR="${DATA_DIR}/backups"
HEALTH_URL="${HEALTH_URL:-http://localhost:8000/api/v1/health}"

ROLLBACK_DB=false
TARGET_COMMIT=""

# 解析參數
while [[ $# -gt 0 ]]; do
    case $1 in
        --with-db)
            ROLLBACK_DB=true
            shift
            ;;
        *)
            TARGET_COMMIT="$1"
            shift
            ;;
    esac
done

echo "================================================="
echo "  TG-Matrix 緊急回滾"
echo "================================================="
echo ""

# 1. 確認操作
log_warn "此操作將停止服務並回滾代碼"
if [ "$ROLLBACK_DB" = true ]; then
    log_warn "同時將回滾數據庫到最近備份"
fi
echo ""
read -p "確認執行回滾？(y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "已取消"
    exit 0
fi

# 2. 記錄當前狀態
CURRENT_COMMIT=$(cd "$APP_DIR" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
log_info "當前版本: ${CURRENT_COMMIT}"

# 3. 確定回滾目標
if [ -z "$TARGET_COMMIT" ]; then
    TARGET_COMMIT=$(cd "$APP_DIR" && git rev-parse --short HEAD~1 2>/dev/null || echo "")
    if [ -z "$TARGET_COMMIT" ]; then
        log_error "無法確定回滾目標"
        exit 1
    fi
fi
log_info "回滾目標: ${TARGET_COMMIT}"

# 4. 停止服務
log_info "停止服務..."
if command -v docker-compose &> /dev/null; then
    cd "$APP_DIR" && docker-compose stop api 2>/dev/null || true
elif command -v systemctl &> /dev/null; then
    systemctl stop tg-matrix 2>/dev/null || true
fi
sleep 2

# 5. 數據庫回滾（如需）
if [ "$ROLLBACK_DB" = true ]; then
    log_info "回滾數據庫..."
    
    # 備份當前數據庫
    if [ -f "$DB_FILE" ]; then
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        cp "$DB_FILE" "${BACKUP_DIR}/pre_rollback_${TIMESTAMP}.db"
        log_info "已備份當前數據庫: pre_rollback_${TIMESTAMP}.db"
    fi
    
    # 找到最近的備份
    LATEST_BACKUP=$(ls -t "${BACKUP_DIR}"/*.db 2>/dev/null | grep -v "pre_rollback" | head -1 || echo "")
    if [ -z "$LATEST_BACKUP" ]; then
        log_error "找不到可用的數據庫備份"
        exit 1
    fi
    
    log_info "恢復備份: $(basename "$LATEST_BACKUP")"
    cp "$LATEST_BACKUP" "$DB_FILE"
    
    # 驗證恢復後的數據庫
    if command -v sqlite3 &> /dev/null; then
        INTEGRITY=$(sqlite3 "$DB_FILE" "PRAGMA quick_check;" 2>/dev/null)
        if [ "$INTEGRITY" = "ok" ]; then
            log_info "數據庫完整性檢查通過"
        else
            log_error "數據庫完整性檢查失敗: $INTEGRITY"
            exit 1
        fi
    fi
fi

# 6. 代碼回滾
log_info "回滾代碼到 ${TARGET_COMMIT}..."
cd "$APP_DIR"
git checkout "$TARGET_COMMIT" -- . 2>/dev/null || {
    git reset --hard "$TARGET_COMMIT" 2>/dev/null || {
        log_error "代碼回滾失敗"
        exit 1
    }
}

# 7. 重啟服務
log_info "重啟服務..."
if command -v docker-compose &> /dev/null; then
    cd "$APP_DIR" && docker-compose up -d --build
elif command -v systemctl &> /dev/null; then
    systemctl start tg-matrix
fi

# 8. 等待服務就緒
log_info "等待服務就緒..."
RETRIES=0
MAX_RETRIES=30
while [ $RETRIES -lt $MAX_RETRIES ]; do
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        log_info "服務已就緒"
        break
    fi
    RETRIES=$((RETRIES + 1))
    sleep 2
done

if [ $RETRIES -ge $MAX_RETRIES ]; then
    log_error "服務啟動超時，請手動檢查"
    exit 1
fi

# 9. 輸出結果
NEW_COMMIT=$(cd "$APP_DIR" && git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo ""
echo "================================================="
log_info "回滾完成"
echo "  從:  ${CURRENT_COMMIT}"
echo "  到:  ${NEW_COMMIT}"
if [ "$ROLLBACK_DB" = true ]; then
    echo "  數據庫: 已回滾"
fi
echo "================================================="
