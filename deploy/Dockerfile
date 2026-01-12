# TG-Matrix License Server Dockerfile
# 王者榮耀風格會員等級系統

FROM python:3.11-slim

# 設置工作目錄
WORKDIR /app

# 安裝依賴
RUN pip install --no-cache-dir \
    aiohttp \
    aiosqlite \
    pyjwt \
    cryptography \
    python-dotenv \
    psutil

# 複製應用文件
COPY backend/license_server.py .
COPY backend/license_generator.py .
COPY backend/membership.py .
COPY backend/payment_gateway.py .

# 複製管理後台
COPY admin-panel/ /app/admin-panel/

# 創建數據目錄
RUN mkdir -p /app/data /app/logs

# 環境變量
ENV HOST=0.0.0.0
ENV PORT=8080
ENV JWT_SECRET=change-this-secret
ENV DB_PATH=/app/data/license_server.db

# 暴露端口
EXPOSE 8080

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# 啟動命令
CMD ["python", "license_server.py", "run"]
