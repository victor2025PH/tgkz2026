"""
多租戶數據庫管理器

🆕 數據庫級隔離架構：
1. 每個用戶擁有獨立的 SQLite 數據庫文件
2. 系統數據庫存儲全局數據（用戶、訂單、卡密等）
3. 租戶數據庫存儲業務數據（帳號、群組、規則等）
4. 連接池管理器使用 LRU 策略管理多個數據庫連接

🆕 v2.0 優化：
5. 統一表定義引用（從 tenant_schema 導入）
6. 自動連接池清理（後台線程）
7. 增強的錯誤處理（拋異常而非返回 None）
8. 備份與恢復功能增強

架構：
  /app/data/
  ├── system.db           ← 系統級數據（用戶表、訂單、卡密）
  ├── tenants/
  │   ├── tenant_xxx.db   ← 用戶 A 的業務數據
  │   ├── tenant_yyy.db   ← 用戶 B 的業務數據
  │   └── ...
  ├── backups/            ← 🆕 備份目錄
  └── sessions/           ← Telegram 會話文件
"""

import os
import sqlite3
import asyncio
import logging
import threading
import shutil
import atexit
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from collections import OrderedDict
from dataclasses import dataclass, field
from contextlib import contextmanager

# 異步支持
try:
    import aiosqlite
    HAS_AIOSQLITE = True
except ImportError:
    HAS_AIOSQLITE = False
    aiosqlite = None

from config import DATABASE_DIR

# 導入統一表定義和異常
from .tenant_schema import (
    TENANT_TABLES, 
    SYSTEM_TABLES, 
    TENANT_DB_SCHEMA,
    SYSTEM_DB_SCHEMA,
    is_tenant_table,
    is_system_table,
    SCHEMA_VERSION
)
from .tenant_exceptions import (
    TenantConnectionError,
    ConnectionPoolExhaustedError,
    BackupError,
    RestoreError
)

logger = logging.getLogger(__name__)

# ============ 配置常量 ============

# 租戶數據庫目錄
TENANTS_DIR = DATABASE_DIR / "tenants"

# 備份目錄
BACKUPS_DIR = DATABASE_DIR / "backups"

# 系統數據庫路徑
SYSTEM_DB_PATH = DATABASE_DIR / "system.db"

# 連接池配置
MAX_CONNECTIONS = 50           # 最大連接數
CONNECTION_TIMEOUT = 30.0      # 連接超時（秒）
IDLE_TIMEOUT = 300             # 空閒超時（秒）
LRU_CLEANUP_INTERVAL = 60      # LRU 清理間隔（秒）

# Electron 本地用戶標識
LOCAL_USER_ID = "local_user"

# 🆕 表定義現已從 tenant_schema 導入，無需在此重複定義
# SYSTEM_TABLES 和 TENANT_TABLES 已在模組頂部導入


# 🆕 Schema 現已從 tenant_schema 導入
# TENANT_DB_SCHEMA 已在模組頂部導入
# 使用別名保持向後兼容
TENANT_SCHEMA = TENANT_DB_SCHEMA


# ============ 連接池實現 ============

@dataclass
class ConnectionInfo:
    """連接信息"""
    connection: sqlite3.Connection
    tenant_id: str
    created_at: datetime = field(default_factory=datetime.now)
    last_used: datetime = field(default_factory=datetime.now)
    use_count: int = 0
    
    def touch(self):
        """更新最後使用時間"""
        self.last_used = datetime.now()
        self.use_count += 1


class TenantDatabaseManager:
    """
    多租戶數據庫管理器
    
    特性：
    1. LRU 連接池管理
    2. 自動創建租戶數據庫
    3. 線程安全
    4. 支持 Electron 本地模式
    5. 🆕 自動連接池清理（後台線程）
    6. 🆕 備份與恢復功能增強
    """
    
    _instance: Optional['TenantDatabaseManager'] = None
    _lock = threading.Lock()
    
    def __new__(cls):
        """單例模式"""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self._connections: OrderedDict[str, ConnectionInfo] = OrderedDict()
        self._conn_lock = threading.RLock()
        self._system_conn: Optional[sqlite3.Connection] = None
        
        # 🆕 清理線程控制
        self._cleanup_thread: Optional[threading.Thread] = None
        self._cleanup_stop_event = threading.Event()
        
        # 確保目錄存在
        TENANTS_DIR.mkdir(parents=True, exist_ok=True)
        BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
        
        # 初始化系統數據庫
        self._init_system_db()
        
        # 🆕 啟動自動清理線程
        self._start_cleanup_thread()
        
        # 🆕 註冊退出時清理
        atexit.register(self._shutdown)
        
        logger.info(f"[TenantDB] 初始化完成 - 租戶目錄: {TENANTS_DIR}, 備份目錄: {BACKUPS_DIR}")
    
    def _init_system_db(self):
        """初始化系統數據庫"""
        try:
            self._system_conn = sqlite3.connect(
                str(SYSTEM_DB_PATH),
                timeout=CONNECTION_TIMEOUT,
                check_same_thread=False
            )
            self._system_conn.execute("PRAGMA journal_mode=WAL")
            self._system_conn.execute("PRAGMA synchronous=NORMAL")
            self._system_conn.execute("PRAGMA busy_timeout=30000")
            self._system_conn.row_factory = sqlite3.Row
            
            # 🆕 初始化系統數據庫 Schema
            self._system_conn.executescript(SYSTEM_DB_SCHEMA)
            self._system_conn.commit()
            
            logger.info(f"[TenantDB] 系統數據庫已連接: {SYSTEM_DB_PATH}")
        except Exception as e:
            logger.error(f"[TenantDB] 系統數據庫連接失敗: {e}")
            raise TenantConnectionError(
                message=f"系統數據庫連接失敗: {e}",
                details={"path": str(SYSTEM_DB_PATH)}
            )
    
    # ============ 🆕 自動清理線程 ============
    
    def _start_cleanup_thread(self):
        """啟動連接池清理線程"""
        if self._cleanup_thread is not None and self._cleanup_thread.is_alive():
            return
        
        self._cleanup_stop_event.clear()
        self._cleanup_thread = threading.Thread(
            target=self._cleanup_loop,
            name="TenantDB-Cleanup",
            daemon=True
        )
        self._cleanup_thread.start()
        logger.debug("[TenantDB] 清理線程已啟動")
    
    def _cleanup_loop(self):
        """清理線程主循環"""
        while not self._cleanup_stop_event.wait(timeout=LRU_CLEANUP_INTERVAL):
            try:
                self.cleanup_idle_connections()
            except Exception as e:
                logger.warning(f"[TenantDB] 清理連接時出錯: {e}")
    
    def _shutdown(self):
        """關閉管理器（退出時調用）"""
        logger.info("[TenantDB] 正在關閉...")
        
        # 停止清理線程
        self._cleanup_stop_event.set()
        if self._cleanup_thread is not None:
            self._cleanup_thread.join(timeout=5)
        
        # 關閉所有連接
        self.close_all()
    
    def _get_tenant_db_path(self, tenant_id: str) -> Path:
        """獲取租戶數據庫路徑"""
        # Electron 本地模式使用固定文件名
        if tenant_id == LOCAL_USER_ID:
            return DATABASE_DIR / "tgmatrix.db"  # 兼容現有數據
        
        # SaaS 模式：每個用戶獨立數據庫
        safe_id = tenant_id.replace("-", "").replace("_", "")[:32]
        return TENANTS_DIR / f"tenant_{safe_id}.db"
    
    def _create_tenant_db(self, tenant_id: str) -> sqlite3.Connection:
        """創建新的租戶數據庫"""
        db_path = self._get_tenant_db_path(tenant_id)
        
        # 創建連接
        conn = sqlite3.connect(
            str(db_path),
            timeout=CONNECTION_TIMEOUT,
            check_same_thread=False
        )
        
        # 配置數據庫
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA busy_timeout=30000")
        conn.row_factory = sqlite3.Row
        
        # 創建表結構（如果是新數據庫）
        cursor = conn.cursor()
        cursor.executescript(TENANT_SCHEMA)
        conn.commit()
        
        logger.info(f"[TenantDB] 租戶數據庫已創建: {db_path}")
        return conn
    
    def get_tenant_connection(self, tenant_id: str) -> sqlite3.Connection:
        """
        獲取租戶數據庫連接
        
        使用 LRU 策略管理連接池
        """
        if not tenant_id:
            tenant_id = LOCAL_USER_ID
        
        with self._conn_lock:
            # 檢查現有連接
            if tenant_id in self._connections:
                conn_info = self._connections.pop(tenant_id)
                conn_info.touch()
                self._connections[tenant_id] = conn_info  # 移到末尾（最近使用）
                return conn_info.connection
            
            # 檢查連接池大小
            if len(self._connections) >= MAX_CONNECTIONS:
                self._evict_oldest()
            
            # 創建新連接
            db_path = self._get_tenant_db_path(tenant_id)
            
            if db_path.exists():
                # 打開現有數據庫
                conn = sqlite3.connect(
                    str(db_path),
                    timeout=CONNECTION_TIMEOUT,
                    check_same_thread=False
                )
                conn.execute("PRAGMA journal_mode=WAL")
                conn.execute("PRAGMA synchronous=NORMAL")
                conn.execute("PRAGMA busy_timeout=30000")
                conn.row_factory = sqlite3.Row
            else:
                # 創建新數據庫
                conn = self._create_tenant_db(tenant_id)
            
            # 加入連接池
            conn_info = ConnectionInfo(
                connection=conn,
                tenant_id=tenant_id
            )
            self._connections[tenant_id] = conn_info
            
            logger.debug(f"[TenantDB] 新連接已創建: {tenant_id}")
            return conn
    
    def get_system_connection(self) -> sqlite3.Connection:
        """獲取系統數據庫連接"""
        if self._system_conn is None:
            self._init_system_db()
        return self._system_conn
    
    def _evict_oldest(self):
        """淘汰最舊的連接（LRU）"""
        if not self._connections:
            return
        
        # 獲取最舊的連接（OrderedDict 的第一個元素）
        oldest_id = next(iter(self._connections))
        conn_info = self._connections.pop(oldest_id)
        
        try:
            conn_info.connection.close()
            logger.debug(f"[TenantDB] 連接已淘汰: {oldest_id}")
        except Exception as e:
            logger.warning(f"[TenantDB] 關閉連接失敗: {e}")
    
    def cleanup_idle_connections(self, max_idle_seconds: int = IDLE_TIMEOUT):
        """清理空閒連接"""
        now = datetime.now()
        to_remove = []
        
        with self._conn_lock:
            for tenant_id, conn_info in self._connections.items():
                idle_seconds = (now - conn_info.last_used).total_seconds()
                if idle_seconds > max_idle_seconds:
                    to_remove.append(tenant_id)
            
            for tenant_id in to_remove:
                conn_info = self._connections.pop(tenant_id)
                try:
                    conn_info.connection.close()
                except:
                    pass
        
        if to_remove:
            logger.info(f"[TenantDB] 清理了 {len(to_remove)} 個空閒連接")
    
    def close_tenant_connection(self, tenant_id: str):
        """關閉指定租戶的連接"""
        with self._conn_lock:
            if tenant_id in self._connections:
                conn_info = self._connections.pop(tenant_id)
                try:
                    conn_info.connection.close()
                except:
                    pass
    
    def close_all(self):
        """關閉所有連接"""
        with self._conn_lock:
            for conn_info in self._connections.values():
                try:
                    conn_info.connection.close()
                except:
                    pass
            self._connections.clear()
            
            if self._system_conn:
                try:
                    self._system_conn.close()
                except:
                    pass
                self._system_conn = None
        
        logger.info("[TenantDB] 所有連接已關閉")
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取連接池統計信息"""
        with self._conn_lock:
            return {
                'active_connections': len(self._connections),
                'max_connections': MAX_CONNECTIONS,
                'tenants': list(self._connections.keys()),
                'system_db_connected': self._system_conn is not None,
                'tenants_dir': str(TENANTS_DIR),
            }
    
    @contextmanager
    def tenant_session(self, tenant_id: str):
        """
        租戶數據庫會話上下文管理器
        
        用法：
            with db_manager.tenant_session('user_123') as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM accounts")
        """
        conn = self.get_tenant_connection(tenant_id)
        try:
            yield conn
        finally:
            # 連接保持在池中，不關閉
            pass
    
    def provision_tenant(self, tenant_id: str, copy_templates: bool = True) -> bool:
        """
        為新租戶創建數據庫
        
        Args:
            tenant_id: 租戶 ID
            copy_templates: 是否複製默認模板
        
        Returns:
            是否創建成功
        """
        try:
            db_path = self._get_tenant_db_path(tenant_id)
            
            if db_path.exists():
                logger.info(f"[TenantDB] 租戶數據庫已存在: {tenant_id}")
                return True
            
            # 創建數據庫
            conn = self._create_tenant_db(tenant_id)
            
            # 複製默認模板
            if copy_templates:
                self._copy_default_templates(conn)
            
            # 加入連接池
            with self._conn_lock:
                conn_info = ConnectionInfo(
                    connection=conn,
                    tenant_id=tenant_id
                )
                self._connections[tenant_id] = conn_info
            
            logger.info(f"[TenantDB] 租戶已創建: {tenant_id}")
            return True
            
        except Exception as e:
            logger.error(f"[TenantDB] 創建租戶失敗: {e}")
            return False
    
    def _copy_default_templates(self, conn: sqlite3.Connection):
        """複製默認模板到新租戶"""
        default_templates = [
            {
                'name': '歡迎消息',
                'category': 'greeting',
                'content': '你好 {{firstName}}！很高興認識你～',
                'is_active': 1
            },
            {
                'name': '跟進消息',
                'category': 'follow_up',
                'content': 'Hi {{firstName}}，上次聊的事情考慮得怎麼樣了？',
                'is_active': 1
            }
        ]
        
        cursor = conn.cursor()
        for template in default_templates:
            cursor.execute("""
                INSERT INTO message_templates (name, category, content, is_active)
                VALUES (?, ?, ?, ?)
            """, (template['name'], template['category'], template['content'], template['is_active']))
        conn.commit()
    
    def delete_tenant(self, tenant_id: str) -> bool:
        """
        刪除租戶數據庫
        
        注意：此操作不可逆！
        """
        try:
            # 關閉連接
            self.close_tenant_connection(tenant_id)
            
            # 刪除數據庫文件
            db_path = self._get_tenant_db_path(tenant_id)
            if db_path.exists():
                db_path.unlink()
                # 刪除 WAL 文件
                wal_path = db_path.with_suffix('.db-wal')
                shm_path = db_path.with_suffix('.db-shm')
                if wal_path.exists():
                    wal_path.unlink()
                if shm_path.exists():
                    shm_path.unlink()
                
                logger.info(f"[TenantDB] 租戶數據庫已刪除: {tenant_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"[TenantDB] 刪除租戶失敗: {e}")
            return False
    
    def backup_tenant(self, tenant_id: str, backup_path: Path = None) -> Path:
        """
        備份租戶數據庫
        
        Args:
            tenant_id: 租戶 ID
            backup_path: 備份目標路徑（可選，默認使用標準命名）
        
        Returns:
            備份文件路徑
        
        Raises:
            BackupError: 備份失敗時
        """
        try:
            db_path = self._get_tenant_db_path(tenant_id)
            if not db_path.exists():
                raise BackupError(
                    message=f"租戶數據庫不存在: {tenant_id}",
                    path=str(db_path)
                )
            
            # 生成默認備份路徑
            if backup_path is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_path = BACKUPS_DIR / f"tenant_{tenant_id}_{timestamp}.db"
            
            # 確保備份目錄存在
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            
            # 使用 SQLite 備份 API 確保一致性
            with self._conn_lock:
                if tenant_id in self._connections:
                    conn = self._connections[tenant_id].connection
                    backup_conn = sqlite3.connect(str(backup_path))
                    conn.backup(backup_conn)
                    backup_conn.close()
                else:
                    # 直接複製文件
                    shutil.copy2(db_path, backup_path)
            
            logger.info(f"[TenantDB] 租戶備份完成: {tenant_id} -> {backup_path}")
            return backup_path
            
        except BackupError:
            raise
        except Exception as e:
            logger.error(f"[TenantDB] 備份失敗: {e}")
            raise BackupError(
                message=f"備份失敗: {e}",
                path=str(backup_path) if backup_path else None
            )
    
    def restore_tenant(self, tenant_id: str, backup_path: Path) -> bool:
        """
        🆕 從備份恢復租戶數據庫
        
        Args:
            tenant_id: 租戶 ID
            backup_path: 備份文件路徑
        
        Returns:
            是否恢復成功
        
        Raises:
            RestoreError: 恢復失敗時
        """
        try:
            if not backup_path.exists():
                raise RestoreError(
                    message="備份文件不存在",
                    backup_path=str(backup_path)
                )
            
            # 關閉現有連接
            self.close_tenant_connection(tenant_id)
            
            db_path = self._get_tenant_db_path(tenant_id)
            
            # 如果目標存在，先備份當前數據
            if db_path.exists():
                current_backup = BACKUPS_DIR / f"tenant_{tenant_id}_before_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
                shutil.copy2(db_path, current_backup)
                logger.info(f"[TenantDB] 恢復前備份: {current_backup}")
            
            # 恢復備份
            shutil.copy2(backup_path, db_path)
            
            logger.info(f"[TenantDB] 租戶恢復完成: {backup_path} -> {tenant_id}")
            return True
            
        except RestoreError:
            raise
        except Exception as e:
            logger.error(f"[TenantDB] 恢復失敗: {e}")
            raise RestoreError(
                message=f"恢復失敗: {e}",
                backup_path=str(backup_path)
            )
    
    def backup_system(self, backup_path: Path = None) -> Path:
        """
        🆕 備份系統數據庫
        
        Args:
            backup_path: 備份目標路徑（可選）
        
        Returns:
            備份文件路徑
        """
        try:
            if backup_path is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_path = BACKUPS_DIR / f"system_{timestamp}.db"
            
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            
            if self._system_conn:
                backup_conn = sqlite3.connect(str(backup_path))
                self._system_conn.backup(backup_conn)
                backup_conn.close()
            else:
                shutil.copy2(SYSTEM_DB_PATH, backup_path)
            
            logger.info(f"[TenantDB] 系統備份完成: {backup_path}")
            return backup_path
            
        except Exception as e:
            logger.error(f"[TenantDB] 系統備份失敗: {e}")
            raise BackupError(message=f"系統備份失敗: {e}")
    
    def list_backups(self, tenant_id: str = None) -> List[Dict[str, Any]]:
        """
        🆕 列出備份文件
        
        Args:
            tenant_id: 租戶 ID（可選，不指定則列出所有）
        """
        backups = []
        
        if not BACKUPS_DIR.exists():
            return backups
        
        pattern = f"tenant_{tenant_id}_*.db" if tenant_id else "*.db"
        
        for backup_file in BACKUPS_DIR.glob(pattern):
            stat = backup_file.stat()
            backups.append({
                'filename': backup_file.name,
                'path': str(backup_file),
                'size_bytes': stat.st_size,
                'size_mb': round(stat.st_size / 1024 / 1024, 2),
                'created_at': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                'is_system': backup_file.name.startswith('system_'),
            })
        
        # 按創建時間倒序
        backups.sort(key=lambda x: x['created_at'], reverse=True)
        return backups
    
    def cleanup_old_backups(self, max_age_days: int = 30, max_count: int = 10):
        """
        🆕 清理舊備份
        
        Args:
            max_age_days: 最大保留天數
            max_count: 每個租戶最大保留數量
        """
        if not BACKUPS_DIR.exists():
            return
        
        cutoff_date = datetime.now() - timedelta(days=max_age_days)
        removed_count = 0
        
        # 按租戶分組備份
        tenant_backups: Dict[str, List[Path]] = {}
        
        for backup_file in BACKUPS_DIR.glob("tenant_*.db"):
            # 提取租戶 ID
            parts = backup_file.stem.split('_')
            if len(parts) >= 2:
                tenant_id = parts[1]
                if tenant_id not in tenant_backups:
                    tenant_backups[tenant_id] = []
                tenant_backups[tenant_id].append(backup_file)
        
        for tenant_id, files in tenant_backups.items():
            # 按創建時間排序
            files.sort(key=lambda f: f.stat().st_ctime, reverse=True)
            
            for i, backup_file in enumerate(files):
                stat = backup_file.stat()
                created = datetime.fromtimestamp(stat.st_ctime)
                
                # 超過數量限制或超過時間限制
                if i >= max_count or created < cutoff_date:
                    try:
                        backup_file.unlink()
                        removed_count += 1
                    except Exception as e:
                        logger.warning(f"[TenantDB] 刪除備份失敗: {backup_file} - {e}")
        
        if removed_count > 0:
            logger.info(f"[TenantDB] 清理了 {removed_count} 個舊備份")
    
    def list_tenants(self) -> List[Dict[str, Any]]:
        """列出所有租戶"""
        tenants = []
        
        if not TENANTS_DIR.exists():
            return tenants
        
        for db_file in TENANTS_DIR.glob("tenant_*.db"):
            tenant_id = db_file.stem.replace("tenant_", "")
            stat = db_file.stat()
            tenants.append({
                'tenant_id': tenant_id,
                'db_path': str(db_file),
                'size_bytes': stat.st_size,
                'size_mb': round(stat.st_size / 1024 / 1024, 2),
                'created_at': datetime.fromtimestamp(stat.st_ctime).isoformat(),
                'modified_at': datetime.fromtimestamp(stat.st_mtime).isoformat(),
            })
        
        return tenants


# ============ 全局實例 ============

def get_tenant_db_manager() -> TenantDatabaseManager:
    """獲取租戶數據庫管理器單例"""
    return TenantDatabaseManager()


def is_tenant_table(table_name: str) -> bool:
    """檢查是否為租戶級表"""
    return table_name in TENANT_TABLES


def is_system_table(table_name: str) -> bool:
    """檢查是否為系統級表"""
    return table_name in SYSTEM_TABLES


# ============ 便捷函數 ============

def get_connection_for_table(table_name: str, tenant_id: str = None) -> sqlite3.Connection:
    """
    根據表名獲取對應的數據庫連接
    
    Args:
        table_name: 表名
        tenant_id: 租戶 ID（租戶表必需）
    
    Returns:
        數據庫連接
    """
    manager = get_tenant_db_manager()
    
    if is_system_table(table_name):
        return manager.get_system_connection()
    elif is_tenant_table(table_name):
        if not tenant_id:
            tenant_id = LOCAL_USER_ID
        return manager.get_tenant_connection(tenant_id)
    else:
        # 未知表默認使用租戶數據庫
        logger.warning(f"[TenantDB] 未知表 '{table_name}'，使用租戶數據庫")
        return manager.get_tenant_connection(tenant_id or LOCAL_USER_ID)
