#!/bin/bash
# 在「運行 API/Bot 的那台機器」上執行，為掃碼登錄配置 INTERNAL_API_URL 並重啟 API 容器
# 用法: 在項目根目錄執行 ./scripts/deploy-bot-env-and-restart.sh
# 或: bash scripts/deploy-bot-env-and-restart.sh

set -e
cd "$(dirname "$0")/.."

ENV_FILE="${ENV_FILE:-.env}"
INTERNAL_URL="${INTERNAL_API_URL:-https://tgw.usdt2026.cc}"

echo "[deploy-bot] 使用環境文件: $ENV_FILE"
if [ -f "$ENV_FILE" ]; then
  if grep -q '^INTERNAL_API_URL=' "$ENV_FILE" 2>/dev/null; then
    sed -i.bak "s|^INTERNAL_API_URL=.*|INTERNAL_API_URL=$INTERNAL_URL|" "$ENV_FILE"
    echo "[deploy-bot] 已更新 INTERNAL_API_URL=$INTERNAL_URL"
  else
    echo "INTERNAL_API_URL=$INTERNAL_URL" >> "$ENV_FILE"
    echo "[deploy-bot] 已寫入 INTERNAL_API_URL=$INTERNAL_URL"
  fi
else
  echo "INTERNAL_API_URL=$INTERNAL_URL" > "$ENV_FILE"
  echo "[deploy-bot] 已創建 $ENV_FILE 並寫入 INTERNAL_API_URL=$INTERNAL_URL"
fi

echo "[deploy-bot] 重啟 API 容器（Bot 在 API 進程內）..."
if command -v docker-compose &>/dev/null; then
  docker-compose up -d --force-recreate api
elif command -v docker &>/dev/null && docker compose version &>/dev/null; then
  docker compose up -d --force-recreate api
else
  echo "[deploy-bot] 未找到 docker-compose / docker compose，請手動執行:"
  echo "  docker compose up -d --force-recreate api"
  echo "  或: docker-compose up -d --force-recreate api"
  exit 1
fi

echo "[deploy-bot] 完成。請在 Telegram 中再次嘗試掃碼登錄。"
