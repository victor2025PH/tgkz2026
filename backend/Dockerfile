# TG-AI智控王 License Server Docker 配置
FROM python:3.11-slim

WORKDIR /app

# 安裝依賴
COPY requirements-server.txt .
RUN pip install --no-cache-dir -r requirements-server.txt

# 複製代碼
COPY database.py .
COPY license_server.py .
COPY start_admin_server.py .

# 創建數據目錄
RUN mkdir -p /app/data

# 環境變量
ENV PYTHONUNBUFFERED=1
ENV JWT_SECRET=your-secret-key-change-this

# 暴露端口
EXPOSE 8080

# 啟動服務器
CMD ["python", "start_admin_server.py", "--host", "0.0.0.0", "--port", "8080"]
