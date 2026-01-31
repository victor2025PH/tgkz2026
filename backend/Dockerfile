# TG-Matrix Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 複製依賴文件
COPY requirements.txt .

# 安裝 Python 依賴
RUN pip install --no-cache-dir -r requirements.txt

# 複製應用代碼
COPY . .

# 創建必要目錄
RUN mkdir -p /app/sessions /app/logs /app/data

# 暴露端口
EXPOSE 8000

# 啟動命令
CMD ["python", "main.py"]
