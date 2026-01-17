# Web 化改造 - 快速實施步驟

> 版本：v1.0  
> 目標：快速將 Electron 應用轉換為 Web 應用

---

## 一、改造優先級

### 階段 1：基礎架構（1-2 週）

1. ✅ 後端 API 框架搭建
2. ✅ 數據庫遷移（SQLite → PostgreSQL）
3. ✅ 用戶認證系統
4. ✅ 多租戶數據隔離

### 階段 2：核心功能改造（2-3 週）

5. ✅ 前端 IPC → HTTP 轉換
6. ✅ WebSocket 實時通信
7. ✅ Celery 異步任務
8. ✅ 配額和權限系統

### 階段 3：部署和優化（1 週）

9. ✅ Docker 容器化
10. ✅ Nginx 配置
11. ✅ SSL 證書
12. ✅ 監控和備份

---

## 二、關鍵文件修改清單

### 2.1 後端新增文件

```
backend/web/
├── main.py                 # ⭐ FastAPI 應用入口
├── config.py              # ⭐ 配置管理
├── database.py            # ⭐ 數據庫連接
├── requirements.txt       # ⭐ Python 依賴
│
├── models/                # ⭐ SQLAlchemy 模型
│   ├── __init__.py
│   ├── user.py
│   ├── account.py
│   └── ...
│
├── schemas/               # ⭐ Pydantic 模型
│   ├── __init__.py
│   ├── user.py
│   └── ...
│
├── routers/               # ⭐ API 路由
│   ├── __init__.py
│   ├── auth.py
│   ├── accounts.py
│   └── ...
│
├── services/              # 業務邏輯
│   ├── telegram.py
│   └── ...
│
└── websocket/             # WebSocket
    └── handler.py
```

### 2.2 前端修改文件

```
src/
├── services/
│   ├── api.service.ts        # ⭐ 新增：HTTP API 服務
│   ├── websocket.service.ts  # ⭐ 新增：WebSocket 服務
│   └── auth.service.ts       # ⭐ 新增：認證服務
│
├── guards/
│   └── auth.guard.ts         # ⭐ 新增：路由守衛
│
├── interceptors/
│   └── auth.interceptor.ts   # ⭐ 新增：HTTP 攔截器
│
└── components/
    └── login.component.ts    # ⭐ 新增：登錄組件
```

---

## 三、快速開始模板

### 3.1 後端 FastAPI 入口

```python
# backend/web/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app = FastAPI(title="TG-AI智控王 API", version="1.0.0")

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生產環境改為具體域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 導入路由
from routers import auth, accounts, search

app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(search.router)

# 靜態文件服務（Angular 應用）
static_dir = os.path.join(os.path.dirname(__file__), "../../dist")
if os.path.exists(static_dir):
    app.mount("/assets", StaticFiles(directory=f"{static_dir}/assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_angular(full_path: str):
        if full_path and not full_path.startswith("api"):
            file_path = os.path.join(static_dir, full_path)
            if os.path.exists(file_path) and os.path.isfile(file_path):
                return FileResponse(file_path)
        return FileResponse(os.path.join(static_dir, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 3.2 前端 API 服務

```typescript
// src/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl || 'http://localhost:8000/api';
  
  constructor(private http: HttpClient) {}
  
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('tgai-auth-token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    });
  }
  
  // 認證 API
  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, 
      { username, password },
      { headers: this.getHeaders() }
    );
  }
  
  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, data);
  }
  
  // 賬戶 API
  getAccounts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/accounts`, {
      headers: this.getHeaders()
    });
  }
  
  addAccount(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/accounts`, data, {
      headers: this.getHeaders()
    });
  }
  
  loginAccount(accountId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/accounts/${accountId}/login`, {}, {
      headers: this.getHeaders()
    });
  }
  
  // 搜索 API
  searchGroups(query: any): Observable<any[]> {
    return this.http.post<any[]>(`${this.apiUrl}/search/groups`, query, {
      headers: this.getHeaders()
    });
  }
  
  // 成員 API
  extractMembers(groupId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/members/extract`, {
      group_id: groupId
    }, {
      headers: this.getHeaders()
    });
  }
}
```

### 3.3 環境配置

```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://your-domain.com/api',
  wsUrl: 'wss://your-domain.com/ws'
};
```

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api',
  wsUrl: 'ws://localhost:8000/ws'
};
```

---

## 四、數據遷移腳本

```python
# scripts/migrate_sqlite_to_postgres.py
import sqlite3
import psycopg2
from psycopg2.extras import execute_values

# SQLite 連接
sqlite_conn = sqlite3.connect('tgai_local.db')
sqlite_cursor = sqlite_conn.cursor()

# PostgreSQL 連接
pg_conn = psycopg2.connect(
    host='localhost',
    database='tgai_db',
    user='tgai_user',
    password='your_password'
)
pg_cursor = pg_conn.cursor()

# 遷移用戶數據（如果有本地用戶）
def migrate_users():
    sqlite_cursor.execute("SELECT * FROM users")
    users = sqlite_cursor.fetchall()
    
    for user in users:
        pg_cursor.execute("""
            INSERT INTO users (username, email, password_hash, membership_level)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (username) DO NOTHING
        """, user[1:])

# 遷移賬戶數據（需要添加 user_id）
def migrate_accounts():
    sqlite_cursor.execute("SELECT * FROM telegram_accounts")
    accounts = sqlite_cursor.fetchall()
    
    # 假設默認用戶 ID 為 1（生產環境需要映射）
    default_user_id = 1
    
    for account in accounts:
        pg_cursor.execute("""
            INSERT INTO telegram_accounts 
            (user_id, phone, api_id, api_hash, status, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (default_user_id,) + account[1:])

pg_conn.commit()
pg_cursor.close()
pg_conn.close()
sqlite_cursor.close()
sqlite_conn.close()
```

---

## 五、Docker 部署腳本

```bash
#!/bin/bash
# deploy.sh

echo "🚀 開始部署 TG-AI智控王 Web 版本..."

# 1. 構建前端
echo "📦 構建前端..."
cd frontend
npm install
npm run build:prod
cd ..

# 2. 複製前端文件
echo "📋 複製前端文件..."
cp -r frontend/dist/* backend/web/static/

# 3. 構建 Docker 鏡像
echo "🐳 構建 Docker 鏡像..."
docker-compose build

# 4. 啟動服務
echo "▶️  啟動服務..."
docker-compose up -d

# 5. 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 10

# 6. 初始化數據庫
echo "🗄️  初始化數據庫..."
docker-compose exec -T backend alembic upgrade head

# 7. 創建管理員用戶
echo "👤 創建管理員用戶..."
docker-compose exec -T backend python scripts/create_admin.py

echo "✅ 部署完成！"
echo "🌐 訪問地址: http://your-domain.com"
```

---

## 六、測試清單

### 6.1 功能測試

- [ ] 用戶註冊/登錄
- [ ] JWT token 刷新
- [ ] 賬戶管理（增刪改查）
- [ ] Telegram 賬戶登錄
- [ ] 群組搜索
- [ ] 成員提取
- [ ] 消息發送
- [ ] WebSocket 實時通信
- [ ] 異步任務狀態

### 6.2 安全測試

- [ ] 未授權訪問攔截
- [ ] 跨用戶數據隔離
- [ ] SQL 注入防護
- [ ] XSS 防護
- [ ] CSRF 防護
- [ ] Rate Limiting

### 6.3 性能測試

- [ ] 並發用戶測試（100+）
- [ ] API 響應時間（<200ms）
- [ ] 數據庫查詢優化
- [ ] WebSocket 連接穩定性

---

## 七、常見問題

### Q1: 如何處理現有的本地數據？

A: 使用數據遷移腳本，將 SQLite 數據導出並導入 PostgreSQL，同時為所有數據分配用戶 ID。

### Q2: Session 文件如何管理？

A: Session 文件存儲在服務器的統一目錄，按用戶 ID 分組，文件路徑：`/sessions/{user_id}/{account_id}.session`

### Q3: 如何處理離線模式？

A: Web 版本不支持完全離線，但可以使用 Service Worker 緩存部分數據，實現離線瀏覽歷史數據。

### Q4: 成本如何？

A: 基礎配置（2核4G）約 $20-30/月，可支持 50-100 並發用戶。隨著用戶增長可水平擴展。

### Q5: 如何備份數據？

A: 使用 PostgreSQL 的 pg_dump 定期備份，可通過 cron 任務自動執行。

---

**文檔結束**
