# TG-AI智控王 服務器部署方案 - Web 化改造

> 版本：v1.0  
> 日期：2026-01-13  
> 目標：將 Electron 桌面應用轉換為 Web 應用，支持多用戶在線使用

---

## 一、架構轉換總覽

### 1.1 現有架構（Electron 桌面）

```
┌─────────────────────────────────────┐
│     Angular Frontend (Electron)     │
│  ─────────────────────────────────  │
│  • IPC 通信                         │
│  • 本地存儲 (IndexedDB/LocalStorage)│
└──────────────┬──────────────────────┘
               │ IPC
┌──────────────▼──────────────────────┐
│     Electron Main Process            │
│  ─────────────────────────────────  │
│  • Python 進程管理                  │
│  • stdin/stdout 通信                │
└──────────────┬──────────────────────┘
               │ stdin/stdout (JSON)
┌──────────────▼──────────────────────┐
│        Python Backend                │
│  ─────────────────────────────────  │
│  • Pyrogram                          │
│  • SQLite (本地)                    │
└─────────────────────────────────────┘
```

### 1.2 目標架構（Web 服務器）

```
┌─────────────────────────────────────────────────────────┐
│                    Web Browser                          │
│  ─────────────────────────────────────────────────────  │
│  • Angular Web App (單頁應用)                           │
│  • HTTP/WebSocket 通信                                  │
└──────────────┬──────────────────────────────────────────┘
               │ HTTPS/WSS
               │
┌──────────────▼──────────────────────────────────────────┐
│              Nginx (反向代理 + SSL)                      │
│  ─────────────────────────────────────────────────────  │
│  • 靜態資源服務                                         │
│  • API 轉發                                             │
│  • WebSocket 代理                                       │
└──────┬───────────────────────┬──────────────────────────┘
       │                       │
       │                       │
┌──────▼──────────┐  ┌────────▼──────────────────────────┐
│  Angular App    │  │   FastAPI Backend (Python)        │
│  (靜態文件)     │  │  ───────────────────────────────  │
│                 │  │  • RESTful API                    │
│  dist/          │  │  • WebSocket 實時通信             │
│  index.html     │  │  • 用戶認證 (JWT)                 │
│  assets/        │  │  • 會話管理                       │
└─────────────────┘  └──────┬─────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
       ┌────────▼──┐ ┌─────▼────┐ ┌───▼─────────┐
       │ PostgreSQL │ │  Redis   │ │ Pyrogram    │
       │            │ │          │ │ Workers     │
       │ • 用戶數據  │ │ • Session│ │ • Telegram  │
       │ • 業務數據  │ │ • 緩存   │ │   API 管理  │
       │ • 多租戶   │ │ • 隊列   │ │             │
       └────────────┘ └──────────┘ └─────────────┘
```

---

## 二、技術棧選擇

### 2.1 前端（保持 Angular）

| 組件 | 技術 | 說明 |
|------|------|------|
| 框架 | Angular 21 | 保持現有框架 |
| HTTP | HttpClient | 替代 IPC |
| WebSocket | RxJS WebSocket | 實時通信 |
| 狀態管理 | Signals | 保持現有 |
| 認證 | JWT + Interceptor | HTTP 攔截器 |

### 2.2 後端（改造 Python）

| 組件 | 技術 | 說明 |
|------|------|------|
| Web 框架 | FastAPI | 高性能 API 框架 |
| 數據庫 | PostgreSQL | 替代 SQLite，支持多租戶 |
| 緩存/會話 | Redis | Session 存儲、任務隊列 |
| 認證 | JWT + bcrypt | 用戶認證 |
| WebSocket | FastAPI WebSocket | 實時通信 |
| 任務隊列 | Celery + Redis | 異步任務處理 |
| ORM | SQLAlchemy | 數據庫 ORM |

### 2.3 基礎設施

| 組件 | 技術 | 說明 |
|------|------|------|
| Web 服務器 | Nginx | 反向代理、SSL |
| 容器化 | Docker + Docker Compose | 部署管理 |
| 監控 | Prometheus + Grafana | 系統監控 |
| 日誌 | ELK Stack | 日誌收集 |

---

## 三、核心改造方案

### 3.1 用戶認證系統

#### 數據庫設計

```sql
-- 用戶表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    membership_level VARCHAR(20) DEFAULT 'free',
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    settings JSONB DEFAULT '{}'
);

-- 會話表
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用戶配額表
CREATE TABLE user_quotas (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    search_count INTEGER DEFAULT 0,
    member_extraction_count INTEGER DEFAULT 0,
    message_sent_count INTEGER DEFAULT 0,
    ai_call_count INTEGER DEFAULT 0,
    reset_date DATE DEFAULT CURRENT_DATE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 認證流程

```typescript
// 前端: src/auth.service.ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  private tokenKey = 'tgai-auth-token';
  
  // 登錄
  async login(username: string, password: string): Promise<AuthResult> {
    const response = await this.http.post<AuthResponse>(`${this.apiUrl}/api/auth/login`, {
      username,
      password
    }).toPromise();
    
    // 保存 token
    localStorage.setItem(this.tokenKey, response.access_token);
    localStorage.setItem('refresh-token', response.refresh_token);
    
    return { success: true, user: response.user };
  }
  
  // 註冊
  async register(data: RegisterData): Promise<AuthResult> {
    // ...
  }
  
  // 自動刷新 token
  async refreshToken(): Promise<string | null> {
    const refreshToken = localStorage.getItem('refresh-token');
    if (!refreshToken) return null;
    
    try {
      const response = await this.http.post<{ access_token: string }>(
        `${this.apiUrl}/api/auth/refresh`,
        { refresh_token: refreshToken }
      ).toPromise();
      
      localStorage.setItem(this.tokenKey, response.access_token);
      return response.access_token;
    } catch {
      this.logout();
      return null;
    }
  }
  
  // HTTP 攔截器
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem(this.tokenKey);
    
    if (token) {
      req = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }
    
    return next.handle(req).pipe(
      catchError(err => {
        if (err.status === 401) {
          return this.refreshToken().pipe(
            switchMap(newToken => {
              if (newToken) {
                req = req.clone({
                  setHeaders: { Authorization: `Bearer ${newToken}` }
                });
                return next.handle(req);
              }
              return throwError(() => err);
            })
          );
        }
        return throwError(() => err);
      })
    );
  }
}
```

```python
# 後端: backend/web/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/register")
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # 檢查用戶名是否存在
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="用戶名已存在")
    
    # 創建新用戶
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password,
        membership_level=user_data.membership_level or "free"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # 創建配額記錄
    quota = UserQuota(user_id=new_user.id)
    db.add(quota)
    db.commit()
    
    return {"message": "註冊成功", "user_id": new_user.id}

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用戶名或密碼錯誤"
        )
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="用戶已被禁用")
    
    # 生成 token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    # 更新最後登錄時間
    user.last_login_at = datetime.utcnow()
    db.commit()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "membership_level": user.membership_level
        }
    }

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="無法驗證憑證"
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user
```

---

### 3.2 多租戶數據隔離

#### 數據庫設計

```sql
-- 所有業務表添加 user_id
ALTER TABLE telegram_accounts ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE search_history ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE extracted_members ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE message_history ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- 創建索引
CREATE INDEX idx_accounts_user_id ON telegram_accounts(user_id);
CREATE INDEX idx_search_user_id ON search_history(user_id);
CREATE INDEX idx_members_user_id ON extracted_members(user_id);
```

#### 後端中間件

```python
# backend/web/middleware.py
from fastapi import Request, HTTPException
from sqlalchemy.orm import Session

class TenantMiddleware:
    """自動注入用戶 ID 到查詢"""
    
    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id
    
    def filter_by_user(self, query):
        """為查詢添加用戶過濾"""
        if hasattr(query.column_descriptions[0]['entity'], 'user_id'):
            return query.filter(query.column_descriptions[0]['entity'].user_id == self.user_id)
        return query

# 依賴注入
def get_current_user_tenant(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> TenantContext:
    return TenantContext(db=db, user_id=current_user.id)
```

---

### 3.3 前端改造（IPC → HTTP）

#### 創建 HTTP 服務層

```typescript
// src/services/api.service.ts
@Injectable({ providedIn: 'root' })
export class ApiService {
  private apiUrl = environment.apiUrl;
  
  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}
  
  // Telegram 賬戶管理
  async getAccounts(): Promise<TelegramAccount[]> {
    return this.http.get<TelegramAccount[]>(`${this.apiUrl}/api/accounts`).toPromise();
  }
  
  async addAccount(data: AddAccountData): Promise<TelegramAccount> {
    return this.http.post<TelegramAccount>(`${this.apiUrl}/api/accounts`, data).toPromise();
  }
  
  async loginAccount(accountId: string): Promise<LoginResult> {
    return this.http.post<LoginResult>(
      `${this.apiUrl}/api/accounts/${accountId}/login`,
      {}
    ).toPromise();
  }
  
  // 群組搜索
  async searchGroups(query: SearchQuery): Promise<GroupResult[]> {
    return this.http.post<GroupResult[]>(
      `${this.apiUrl}/api/search/groups`,
      query
    ).toPromise();
  }
  
  // WebSocket 連接（實時更新）
  connectWebSocket(): Observable<any> {
    const token = localStorage.getItem('tgai-auth-token');
    const wsUrl = environment.wsUrl.replace('http', 'ws');
    
    return webSocket({
      url: `${wsUrl}?token=${token}`,
      openObserver: {
        next: () => console.log('WebSocket 已連接')
      }
    });
  }
}
```

#### 替換 IPC 調用

```typescript
// 原 IPC 調用
// this.ipc.send('get-accounts');

// 改為 HTTP
this.apiService.getAccounts().then(accounts => {
  this.accounts.set(accounts);
});
```

---

### 3.4 後端 API 設計

#### FastAPI 應用結構

```
backend/web/
├── main.py                 # FastAPI 應用入口
├── config.py              # 配置管理
├── database.py            # 數據庫連接
├── models/                # SQLAlchemy 模型
│   ├── user.py
│   ├── account.py
│   ├── search.py
│   └── ...
├── schemas/               # Pydantic 模型
│   ├── user.py
│   ├── account.py
│   └── ...
├── routers/               # API 路由
│   ├── auth.py
│   ├── accounts.py
│   ├── search.py
│   ├── members.py
│   └── ...
├── services/              # 業務邏輯
│   ├── telegram.py        # Pyrogram 管理
│   ├── search.py
│   └── ...
├── middleware/            # 中間件
│   ├── auth.py
│   └── tenant.py
└── websocket/             # WebSocket 處理
    └── handler.py
```

#### 主要 API 端點

```python
# backend/web/routers/accounts.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/accounts", tags=["accounts"])

@router.get("")
async def get_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """獲取當前用戶的所有賬戶"""
    accounts = db.query(TelegramAccount).filter(
        TelegramAccount.user_id == current_user.id
    ).all()
    return accounts

@router.post("")
async def create_account(
    account_data: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """創建新賬戶"""
    # 檢查配額
    quota = db.query(UserQuota).filter(
        UserQuota.user_id == current_user.id
    ).first()
    
    existing_count = db.query(TelegramAccount).filter(
        TelegramAccount.user_id == current_user.id
    ).count()
    
    max_accounts = get_max_accounts(current_user.membership_level)
    if existing_count >= max_accounts:
        raise HTTPException(
            status_code=403,
            detail=f"已達到賬戶數量上限（{max_accounts}）"
        )
    
    # 創建賬戶
    new_account = TelegramAccount(
        user_id=current_user.id,
        phone=account_data.phone,
        api_id=account_data.api_id,
        api_hash=account_data.api_hash
    )
    db.add(new_account)
    db.commit()
    db.refresh(new_account)
    
    return new_account

@router.post("/{account_id}/login")
async def login_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """登錄 Telegram 賬戶"""
    account = db.query(TelegramAccount).filter(
        TelegramAccount.id == account_id,
        TelegramAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(status_code=404, detail="賬戶不存在")
    
    # 使用 Celery 異步處理登錄
    task = login_telegram_account.delay(account_id, current_user.id)
    
    return {"task_id": task.id, "status": "pending"}
```

---

### 3.5 異步任務處理（Celery）

#### Celery 配置

```python
# backend/web/celery_app.py
from celery import Celery
import os

celery_app = Celery(
    "tgai_worker",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379/0")
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

# 任務示例
@celery_app.task(bind=True)
def login_telegram_account(self, account_id: int, user_id: int):
    """異步登錄 Telegram 賬戶"""
    # 初始化 Pyrogram 客戶端
    # 發送驗證碼
    # 更新狀態
    pass

@celery_app.task(bind=True)
def extract_members(self, group_id: str, user_id: int):
    """異步提取群組成員"""
    # 使用 Pyrogram 獲取成員
    # 保存到數據庫
    # 通過 WebSocket 通知前端
    pass
```

---

### 3.6 WebSocket 實時通信

```python
# backend/web/websocket/handler.py
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
    
    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
    
    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_json(message)
    
    async def broadcast(self, message: dict):
        for user_connections in self.active_connections.values():
            for connection in user_connections:
                await connection.send_json(message)

manager = ConnectionManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = None):
    # 驗證 token
    user = await verify_websocket_token(token)
    if not user:
        await websocket.close(code=1008, reason="未授權")
        return
    
    await manager.connect(websocket, user.id)
    
    try:
        while True:
            data = await websocket.receive_text()
            # 處理客戶端消息
            await handle_client_message(user.id, json.loads(data))
    except WebSocketDisconnect:
        manager.disconnect(websocket, user.id)
```

---

## 四、部署方案

### 4.1 Docker Compose 配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL 數據庫
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: tgai_db
      POSTGRES_USER: tgai_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tgai_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

  # FastAPI 後端
  backend:
    build:
      context: ./backend/web
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://tgai_user:${DB_PASSWORD}@postgres:5432/tgai_db
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: ${SECRET_KEY}
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend/sessions:/app/sessions
      - ./backend/logs:/app/logs

  # Celery Worker
  celery-worker:
    build:
      context: ./backend/web
      dockerfile: Dockerfile
    command: celery -A celery_app worker --loglevel=info
    environment:
      DATABASE_URL: postgresql://tgai_user:${DB_PASSWORD}@postgres:5432/tgai_db
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - postgres
      - redis
      - backend
    volumes:
      - ./backend/sessions:/app/sessions

  # Nginx 反向代理
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./dist:/usr/share/nginx/html
    depends_on:
      - backend

volumes:
  postgres_data:
  redis_data:
```

### 4.2 Nginx 配置

```nginx
# nginx/nginx.conf
upstream backend {
    server backend:8000;
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # 靜態文件（Angular 應用）
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # API 轉發
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket 代理
    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4.3 環境變量配置

```bash
# .env
# 數據庫
DB_PASSWORD=your_secure_password

# JWT 密鑰
SECRET_KEY=your_secret_key_here

# Telegram API
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash

# Redis
REDIS_URL=redis://redis:6379/0

# 域名
DOMAIN=your-domain.com
```

---

## 五、部署步驟

### 5.1 準備工作

```bash
# 1. 構建前端
cd frontend
npm install
npm run build:prod

# 2. 準備後端
cd backend/web
pip install -r requirements.txt

# 3. 準備 Docker
docker-compose build
```

### 5.2 部署執行

```bash
# 1. 啟動服務
docker-compose up -d

# 2. 初始化數據庫
docker-compose exec backend alembic upgrade head

# 3. 創建管理員用戶
docker-compose exec backend python scripts/create_admin.py

# 4. 檢查服務狀態
docker-compose ps
```

### 5.3 監控和維護

```bash
# 查看日誌
docker-compose logs -f backend
docker-compose logs -f celery-worker

# 備份數據庫
docker-compose exec postgres pg_dump -U tgai_user tgai_db > backup.sql

# 重啟服務
docker-compose restart backend
```

---

## 六、安全性考慮

### 6.1 認證安全

- ✅ JWT token 過期時間設置
- ✅ Refresh token 輪換
- ✅ 密碼 bcrypt 加密
- ✅ 登錄失敗次數限制
- ✅ IP 白名單（可選）

### 6.2 API 安全

- ✅ HTTPS 強制使用
- ✅ CORS 配置
- ✅ Rate Limiting
- ✅ SQL 注入防護（SQLAlchemy）
- ✅ XSS 防護

### 6.3 數據安全

- ✅ 數據庫加密
- ✅ Session 隔離
- ✅ 敏感數據脫敏
- ✅ 審計日誌

---

## 七、性能優化

### 7.1 數據庫優化

- ✅ 索引優化
- ✅ 查詢緩存（Redis）
- ✅ 連接池管理
- ✅ 讀寫分離（可選）

### 7.2 應用優化

- ✅ 前端資源 CDN
- ✅ API 響應緩存
- ✅ 異步任務隊列
- ✅ WebSocket 連接池

### 7.3 擴展性

- ✅ 水平擴展（多實例）
- ✅ 負載均衡
- ✅ 任務隊列分片
- ✅ 數據庫分庫分表（未來）

---

## 八、遷移檢查清單

- [ ] 數據庫從 SQLite 遷移到 PostgreSQL
- [ ] IPC 調用改為 HTTP API
- [ ] 本地存儲改為服務器存儲
- [ ] 添加用戶認證系統
- [ ] 實現多租戶隔離
- [ ] 配置 WebSocket 通信
- [ ] 設置 Celery 任務隊列
- [ ] 配置 Nginx 反向代理
- [ ] SSL 證書配置
- [ ] 環境變量配置
- [ ] 監控告警設置
- [ ] 備份策略實施

---

## 九、成本估算

### 9.1 服務器配置

| 配置 | 規格 | 月費用（參考） |
|------|------|:--------------:|
| 小型 | 2核4G | $20-30 |
| 中型 | 4核8G | $40-60 |
| 大型 | 8核16G | $80-120 |

### 9.2 域名和 SSL

- 域名: $10-15/年
- SSL 證書: 免費（Let's Encrypt）

### 9.3 其他

- 數據庫備份: 包含在服務器
- CDN: 可選，$5-20/月

---

**文檔結束**
