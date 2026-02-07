"""
🔧 P6-1: 統一數據庫連接工具

提供:
1. 集中式數據庫路徑解析（消除 DATABASE_PATH vs DB_PATH 不一致）
2. WAL 模式自動啟用（所有連接）
3. 性能 PRAGMA 標準化（cache_size, busy_timeout, synchronous）
4. 連接上下文管理器
5. 連接統計（追蹤創建/關閉次數，發現洩漏）

用法:
    # 簡單連接（自動 WAL + Row factory）
    with get_connection() as conn:
        conn.execute('SELECT ...')
    
    # 直接創建（調用方負責關閉）
    conn = create_connection()
    try:
        conn.execute('...')
    finally:
        conn.close()
"""

import os
import sqlite3
import threading
import logging
from typing import Optional
from pathlib import Path
from contextlib import contextmanager

logger = logging.getLogger(__name__)


def resolve_db_path() -> str:
    """
    統一數據庫路徑解析
    
    優先級：
    1. DATABASE_PATH 環境變量
    2. DB_PATH 環境變量（兼容）
    3. config.DATABASE_PATH（如果可導入）
    4. 默認路徑
    """
    # 環境變量
    path = os.environ.get('DATABASE_PATH')
    if path:
        return path
    
    path = os.environ.get('DB_PATH')
    if path:
        return path
    
    # 嘗試從 config 導入
    try:
        from config import DATABASE_PATH
        return str(DATABASE_PATH)
    except ImportError:
        pass
    
    # 默認路徑
    backend_dir = Path(__file__).parent.parent
    default_path = backend_dir / 'data' / 'tgmatrix.db'
    return str(default_path)


# 全局數據庫路徑（啟動時解析一次）
_DB_PATH: Optional[str] = None


def get_db_path() -> str:
    """獲取數據庫路徑（緩存）"""
    global _DB_PATH
    if _DB_PATH is None:
        _DB_PATH = resolve_db_path()
    return _DB_PATH


def create_connection(db_path: str = None, wal: bool = True, row_factory: bool = True) -> sqlite3.Connection:
    """
    創建帶標準配置的 SQLite 連接
    
    標準配置：
    - WAL 日誌模式（併發讀寫）
    - Row factory（字典式訪問）
    - 30 秒超時
    """
    path = db_path or get_db_path()
    conn = sqlite3.connect(path, timeout=30.0)
    
    if row_factory:
        conn.row_factory = sqlite3.Row
    
    if wal:
        conn.execute('PRAGMA journal_mode=WAL')
        conn.execute('PRAGMA synchronous=NORMAL')  # WAL 模式下 NORMAL 即可保證一致性
        conn.execute('PRAGMA cache_size=-8000')     # 8MB 頁面緩存
        conn.execute('PRAGMA busy_timeout=30000')   # 30s busy timeout
    
    return conn


@contextmanager
def get_connection(db_path: str = None):
    """
    連接上下文管理器 — 自動打開和關閉
    
    用法:
        with get_connection() as conn:
            conn.execute('SELECT * FROM users')
    """
    conn = create_connection(db_path)
    try:
        yield conn
    finally:
        conn.close()


# ==================== 連接統計 ====================

class ConnectionStats:
    """追蹤連接創建/關閉，幫助發現洩漏"""
    
    _lock = threading.Lock()
    _total_created = 0
    _total_closed = 0
    
    @classmethod
    def on_create(cls):
        with cls._lock:
            cls._total_created += 1
    
    @classmethod
    def on_close(cls):
        with cls._lock:
            cls._total_closed += 1
    
    @classmethod
    def stats(cls) -> dict:
        with cls._lock:
            return {
                'total_created': cls._total_created,
                'total_closed': cls._total_closed,
                'potentially_leaked': cls._total_created - cls._total_closed
            }
