"""
靜態代理池管理模塊

功能：
- 批量管理靜態代理
- 自動分配代理給帳號
- 代理健康檢測
- 帳號-代理綁定關係
"""

import sqlite3
import uuid
import asyncio
import aiohttp
import logging
from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime
import os
import sys

logger = logging.getLogger(__name__)


class ProxyStatus(str, Enum):
    """代理狀態"""
    AVAILABLE = "available"      # 可用（未分配）
    ASSIGNED = "assigned"        # 已分配給帳號
    TESTING = "testing"          # 正在測試
    FAILED = "failed"            # 測試失敗
    DISABLED = "disabled"        # 已禁用


class ProxyType(str, Enum):
    """代理類型"""
    SOCKS5 = "socks5"
    HTTP = "http"
    HTTPS = "https"


@dataclass
class StaticProxy:
    """靜態代理數據類"""
    id: str
    proxy_type: ProxyType
    host: str
    port: int
    username: Optional[str] = None
    password: Optional[str] = None
    country: Optional[str] = None
    provider: Optional[str] = None
    status: ProxyStatus = ProxyStatus.AVAILABLE
    assigned_account_id: Optional[str] = None
    assigned_phone: Optional[str] = None
    last_check: Optional[str] = None
    last_check_latency: Optional[int] = None  # ms
    created_at: Optional[str] = None
    note: Optional[str] = None

    def to_url(self) -> str:
        """轉換為 URL 格式"""
        auth = ""
        if self.username and self.password:
            auth = f"{self.username}:{self.password}@"
        elif self.username:
            auth = f"{self.username}@"
        return f"{self.proxy_type}://{auth}{self.host}:{self.port}"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "proxy_type": self.proxy_type.value if isinstance(self.proxy_type, ProxyType) else self.proxy_type,
            "host": self.host,
            "port": self.port,
            "username": self.username,
            "password": "***" if self.password else None,  # 隱藏密碼
            "country": self.country,
            "provider": self.provider,
            "status": self.status.value if isinstance(self.status, ProxyStatus) else self.status,
            "assigned_account_id": self.assigned_account_id,
            "assigned_phone": self.assigned_phone,
            "last_check": self.last_check,
            "last_check_latency": self.last_check_latency,
            "created_at": self.created_at,
            "note": self.note,
            "url": self.to_url()
        }


class ProxyPoolManager:
    """代理池管理器（單例）"""

    _instance = None
    _db_path: str = None

    def __new__(cls, db_path: str = None):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, db_path: str = None):
        if self._initialized:
            return
        
        if db_path:
            self._db_path = db_path
        else:
            # 默認數據庫路徑
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            self._db_path = os.path.join(base_dir, 'data', 'tgmatrix.db')
        
        self._init_table()
        self._initialized = True

    def _get_connection(self) -> sqlite3.Connection:
        """獲取數據庫連接"""
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_table(self):
        """初始化代理表"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS static_proxies (
                    id TEXT PRIMARY KEY,
                    proxy_type TEXT NOT NULL DEFAULT 'socks5',
                    host TEXT NOT NULL,
                    port INTEGER NOT NULL,
                    username TEXT,
                    password TEXT,
                    country TEXT,
                    provider TEXT,
                    status TEXT DEFAULT 'available',
                    assigned_account_id TEXT,
                    assigned_phone TEXT,
                    last_check TEXT,
                    last_check_latency INTEGER,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    note TEXT,
                    UNIQUE(host, port, username)
                )
            ''')
            
            # 創建索引
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_proxy_status ON static_proxies(status)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_proxy_assigned ON static_proxies(assigned_account_id)')
            
            conn.commit()
            logger.info("Static proxies table initialized")
        finally:
            conn.close()

    def add_proxy(
        self,
        proxy_type: str,
        host: str,
        port: int,
        username: Optional[str] = None,
        password: Optional[str] = None,
        country: Optional[str] = None,
        provider: Optional[str] = None,
        note: Optional[str] = None
    ) -> StaticProxy:
        """添加單個代理"""
        proxy_id = f"proxy_{uuid.uuid4().hex[:12]}"
        
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO static_proxies 
                (id, proxy_type, host, port, username, password, country, provider, note)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (proxy_id, proxy_type, host, port, username, password, country, provider, note))
            conn.commit()
            
            return StaticProxy(
                id=proxy_id,
                proxy_type=ProxyType(proxy_type),
                host=host,
                port=port,
                username=username,
                password=password,
                country=country,
                provider=provider,
                note=note
            )
        finally:
            conn.close()

    def add_proxies_batch(self, proxies: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        批量添加代理
        
        支持格式：
        - URL: "socks5://user:pass@host:port"
        - 字典: {"type": "socks5", "host": "x.x.x.x", "port": 1080, ...}
        """
        success = 0
        failed = 0
        errors = []
        
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            for proxy_data in proxies:
                try:
                    # 解析代理數據
                    if isinstance(proxy_data, str):
                        parsed = self._parse_proxy_url(proxy_data)
                    else:
                        parsed = proxy_data
                    
                    if not parsed:
                        failed += 1
                        errors.append(f"無法解析: {proxy_data}")
                        continue
                    
                    proxy_id = f"proxy_{uuid.uuid4().hex[:12]}"
                    cursor.execute('''
                        INSERT OR IGNORE INTO static_proxies 
                        (id, proxy_type, host, port, username, password, country, provider, note)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        proxy_id,
                        parsed.get('type', 'socks5'),
                        parsed['host'],
                        parsed['port'],
                        parsed.get('username'),
                        parsed.get('password'),
                        parsed.get('country'),
                        parsed.get('provider'),
                        parsed.get('note')
                    ))
                    
                    if cursor.rowcount > 0:
                        success += 1
                    else:
                        failed += 1
                        errors.append(f"已存在: {parsed['host']}:{parsed['port']}")
                        
                except Exception as e:
                    failed += 1
                    errors.append(f"錯誤: {str(e)}")
            
            conn.commit()
        finally:
            conn.close()
        
        return {
            "success": success,
            "failed": failed,
            "errors": errors[:10]  # 只返回前10個錯誤
        }

    def _parse_proxy_url(self, url: str) -> Optional[Dict[str, Any]]:
        """解析代理 URL"""
        from urllib.parse import urlparse
        
        try:
            # 處理簡化格式：host:port
            if '://' not in url:
                url = f"socks5://{url}"
            
            parsed = urlparse(url)
            
            return {
                "type": parsed.scheme or "socks5",
                "host": parsed.hostname,
                "port": parsed.port or 1080,
                "username": parsed.username,
                "password": parsed.password
            }
        except Exception:
            return None

    def get_proxies(
        self,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """獲取代理列表"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 構建查詢
            where_clause = ""
            params = []
            if status:
                where_clause = "WHERE status = ?"
                params.append(status)
            
            # 總數
            cursor.execute(f"SELECT COUNT(*) FROM static_proxies {where_clause}", params)
            total = cursor.fetchone()[0]
            
            # 分頁
            offset = (page - 1) * page_size
            cursor.execute(f'''
                SELECT * FROM static_proxies 
                {where_clause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ''', params + [page_size, offset])
            
            rows = cursor.fetchall()
            proxies = []
            for row in rows:
                proxy = StaticProxy(
                    id=row['id'],
                    proxy_type=ProxyType(row['proxy_type']) if row['proxy_type'] in [e.value for e in ProxyType] else ProxyType.SOCKS5,
                    host=row['host'],
                    port=row['port'],
                    username=row['username'],
                    password=row['password'],
                    country=row['country'],
                    provider=row['provider'],
                    status=ProxyStatus(row['status']) if row['status'] in [e.value for e in ProxyStatus] else ProxyStatus.AVAILABLE,
                    assigned_account_id=row['assigned_account_id'],
                    assigned_phone=row['assigned_phone'],
                    last_check=row['last_check'],
                    last_check_latency=row['last_check_latency'],
                    created_at=row['created_at'],
                    note=row['note']
                )
                proxies.append(proxy.to_dict())
            
            # 統計
            cursor.execute('''
                SELECT status, COUNT(*) as count 
                FROM static_proxies 
                GROUP BY status
            ''')
            stats = {row['status']: row['count'] for row in cursor.fetchall()}
            
            return {
                "proxies": proxies,
                "pagination": {
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "total_pages": (total + page_size - 1) // page_size
                },
                "stats": {
                    "total": total,
                    "available": stats.get('available', 0),
                    "assigned": stats.get('assigned', 0),
                    "failed": stats.get('failed', 0),
                    "disabled": stats.get('disabled', 0)
                }
            }
        finally:
            conn.close()

    def delete_proxy(self, proxy_id: str) -> bool:
        """刪除代理"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM static_proxies WHERE id = ?', (proxy_id,))
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def update_proxy_status(
        self,
        proxy_id: str,
        status: ProxyStatus,
        latency: Optional[int] = None
    ) -> bool:
        """更新代理狀態"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE static_proxies 
                SET status = ?, last_check = datetime('now'), last_check_latency = ?
                WHERE id = ?
            ''', (status.value, latency, proxy_id))
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def assign_proxy_to_account(
        self,
        account_id: str,
        phone: str,
        proxy_id: Optional[str] = None
    ) -> Optional[StaticProxy]:
        """
        分配代理給帳號
        
        如果 proxy_id 為 None，自動分配一個可用代理
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 檢查帳號是否已有代理
            cursor.execute('''
                SELECT * FROM static_proxies 
                WHERE assigned_account_id = ? OR assigned_phone = ?
            ''', (account_id, phone))
            existing = cursor.fetchone()
            
            if existing:
                # 已有代理，返回現有的
                return StaticProxy(
                    id=existing['id'],
                    proxy_type=ProxyType(existing['proxy_type']),
                    host=existing['host'],
                    port=existing['port'],
                    username=existing['username'],
                    password=existing['password'],
                    country=existing['country'],
                    provider=existing['provider'],
                    status=ProxyStatus(existing['status']),
                    assigned_account_id=existing['assigned_account_id'],
                    assigned_phone=existing['assigned_phone']
                )
            
            # 查找可用代理
            if proxy_id:
                cursor.execute('''
                    SELECT * FROM static_proxies 
                    WHERE id = ? AND status = 'available'
                ''', (proxy_id,))
            else:
                # 自動選擇一個可用代理（優先選擇延遲低的）
                cursor.execute('''
                    SELECT * FROM static_proxies 
                    WHERE status = 'available'
                    ORDER BY 
                        CASE WHEN last_check_latency IS NOT NULL THEN last_check_latency ELSE 9999 END ASC,
                        created_at ASC
                    LIMIT 1
                ''')
            
            row = cursor.fetchone()
            if not row:
                return None  # 沒有可用代理
            
            # 分配代理
            cursor.execute('''
                UPDATE static_proxies 
                SET status = 'assigned', assigned_account_id = ?, assigned_phone = ?
                WHERE id = ?
            ''', (account_id, phone, row['id']))
            conn.commit()
            
            return StaticProxy(
                id=row['id'],
                proxy_type=ProxyType(row['proxy_type']),
                host=row['host'],
                port=row['port'],
                username=row['username'],
                password=row['password'],
                country=row['country'],
                provider=row['provider'],
                status=ProxyStatus.ASSIGNED,
                assigned_account_id=account_id,
                assigned_phone=phone
            )
        finally:
            conn.close()

    def release_proxy(self, account_id: str = None, phone: str = None) -> bool:
        """釋放帳號的代理"""
        if not account_id and not phone:
            return False
        
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            if account_id:
                cursor.execute('''
                    UPDATE static_proxies 
                    SET status = 'available', assigned_account_id = NULL, assigned_phone = NULL
                    WHERE assigned_account_id = ?
                ''', (account_id,))
            else:
                cursor.execute('''
                    UPDATE static_proxies 
                    SET status = 'available', assigned_account_id = NULL, assigned_phone = NULL
                    WHERE assigned_phone = ?
                ''', (phone,))
            
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()

    def get_proxy_for_account(self, account_id: str = None, phone: str = None) -> Optional[StaticProxy]:
        """獲取帳號綁定的代理"""
        if not account_id and not phone:
            return None
        
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            if account_id:
                cursor.execute('''
                    SELECT * FROM static_proxies 
                    WHERE assigned_account_id = ?
                ''', (account_id,))
            else:
                cursor.execute('''
                    SELECT * FROM static_proxies 
                    WHERE assigned_phone = ?
                ''', (phone,))
            
            row = cursor.fetchone()
            if not row:
                return None
            
            return StaticProxy(
                id=row['id'],
                proxy_type=ProxyType(row['proxy_type']),
                host=row['host'],
                port=row['port'],
                username=row['username'],
                password=row['password'],
                country=row['country'],
                provider=row['provider'],
                status=ProxyStatus(row['status']),
                assigned_account_id=row['assigned_account_id'],
                assigned_phone=row['assigned_phone']
            )
        finally:
            conn.close()

    async def test_proxy(self, proxy_id: str) -> Dict[str, Any]:
        """測試代理連通性"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM static_proxies WHERE id = ?', (proxy_id,))
            row = cursor.fetchone()
            
            if not row:
                return {"success": False, "error": "代理不存在"}
            
            proxy = StaticProxy(
                id=row['id'],
                proxy_type=ProxyType(row['proxy_type']),
                host=row['host'],
                port=row['port'],
                username=row['username'],
                password=row['password']
            )
            
            # 更新狀態為測試中
            cursor.execute(
                'UPDATE static_proxies SET status = ? WHERE id = ?',
                (ProxyStatus.TESTING.value, proxy_id)
            )
            conn.commit()
        finally:
            conn.close()
        
        # 測試連接
        try:
            import time
            start_time = time.time()
            
            # 使用 aiohttp 測試 HTTP 代理
            proxy_url = proxy.to_url()
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    'https://api.telegram.org/',
                    proxy=proxy_url if proxy.proxy_type in [ProxyType.HTTP, ProxyType.HTTPS] else None,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    latency = int((time.time() - start_time) * 1000)
                    
                    if response.status == 200:
                        self.update_proxy_status(proxy_id, ProxyStatus.AVAILABLE, latency)
                        return {
                            "success": True,
                            "latency": latency,
                            "status": "available"
                        }
        except Exception as e:
            self.update_proxy_status(proxy_id, ProxyStatus.FAILED)
            return {
                "success": False,
                "error": str(e),
                "status": "failed"
            }
        
        # SOCKS5 代理測試
        try:
            import socket
            import time
            
            start_time = time.time()
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(10)
            sock.connect((proxy.host, proxy.port))
            latency = int((time.time() - start_time) * 1000)
            sock.close()
            
            self.update_proxy_status(proxy_id, ProxyStatus.AVAILABLE, latency)
            return {
                "success": True,
                "latency": latency,
                "status": "available"
            }
        except Exception as e:
            self.update_proxy_status(proxy_id, ProxyStatus.FAILED)
            return {
                "success": False,
                "error": str(e),
                "status": "failed"
            }


# 單例實例
proxy_pool: Optional[ProxyPoolManager] = None


def get_proxy_pool(db_path: str = None) -> ProxyPoolManager:
    """獲取代理池管理器實例"""
    global proxy_pool
    if proxy_pool is None:
        proxy_pool = ProxyPoolManager(db_path)
    return proxy_pool
