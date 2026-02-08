"""
代理同步服務

功能：
- proxy_providers 和 proxy_sync_log 表的初始化
- static_proxies 表的字段擴展
- 供應商代理同步（增量對比）
- 定時自動同步（asyncio 後台任務）
- 過期代理清理
- 同步日誌記錄
"""

import asyncio
import json
import logging
import os
import sqlite3
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any

from .proxy_providers.base_provider import (
    BaseProxyProvider, ProviderConfig, ProviderProxy, ProviderBalance,
)
from .proxy_providers.provider_factory import create_provider
from .proxy_pool import ProxyStatus

logger = logging.getLogger(__name__)


class ProxySyncService:
    """
    代理同步服務（單例）

    負責：
    1. 數據庫表初始化與遷移
    2. 供應商配置 CRUD
    3. 從供應商拉取代理並同步到本地
    4. 定時自動同步
    5. 過期代理清理
    """

    _instance = None

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
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            self._db_path = os.path.join(base_dir, 'data', 'tgmatrix.db')

        self._init_tables()
        self._auto_sync_task: Optional[asyncio.Task] = None
        self._sync_lock = asyncio.Lock()
        self._initialized = True

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    # ─── 數據庫初始化 ───

    def _init_tables(self):
        """初始化所有需要的表和字段"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()

            # 1. 創建 proxy_providers 表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS proxy_providers (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    provider_type TEXT NOT NULL DEFAULT 'blurpath',
                    api_base_url TEXT,
                    api_key_encrypted TEXT,
                    api_secret_encrypted TEXT,
                    config_json TEXT DEFAULT '{}',
                    sync_interval_minutes INTEGER DEFAULT 30,
                    last_sync_at TEXT,
                    balance_info TEXT DEFAULT '[]',
                    is_active INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # 2. 創建 proxy_sync_log 表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS proxy_sync_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider_id TEXT,
                    sync_type TEXT DEFAULT 'manual',
                    added_count INTEGER DEFAULT 0,
                    removed_count INTEGER DEFAULT 0,
                    updated_count INTEGER DEFAULT 0,
                    error_message TEXT,
                    duration_ms INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (provider_id) REFERENCES proxy_providers(id) ON DELETE SET NULL
                )
            ''')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_sync_log_provider ON proxy_sync_log(provider_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_sync_log_created ON proxy_sync_log(created_at)')

            # 3. 擴展 static_proxies 表（新增字段）
            existing_cols = set()
            cursor.execute("PRAGMA table_info(static_proxies)")
            for row in cursor.fetchall():
                existing_cols.add(row[1])  # column name

            new_columns = {
                "provider_id": "TEXT",
                "provider_proxy_id": "TEXT",
                "expires_at": "TEXT",
                "proxy_source": "TEXT DEFAULT 'manual'",
            }

            for col_name, col_type in new_columns.items():
                if col_name not in existing_cols:
                    cursor.execute(f"ALTER TABLE static_proxies ADD COLUMN {col_name} {col_type}")
                    logger.info(f"Added column '{col_name}' to static_proxies")

            # 創建索引
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_proxy_provider ON static_proxies(provider_id)')
            cursor.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_proxy_provider_proxy_id ON static_proxies(provider_id, provider_proxy_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_proxy_expires ON static_proxies(expires_at)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_proxy_source ON static_proxies(proxy_source)')

            conn.commit()
            logger.info("Proxy sync tables initialized")
        except Exception as e:
            logger.error(f"Failed to init proxy sync tables: {e}")
            conn.rollback()
        finally:
            conn.close()

    # ─── 供應商配置 CRUD ───

    def _encrypt_key(self, key: str) -> str:
        """加密 API 密鑰（簡單可逆加密，生產環境建議用 AES-256）"""
        import base64
        env_key = os.environ.get("PROXY_PROVIDER_ENCRYPTION_KEY", "tgmatrix-proxy-enc-2026")
        # 簡單 XOR + base64 加密
        encrypted = bytes([
            b ^ ord(env_key[i % len(env_key)])
            for i, b in enumerate(key.encode('utf-8'))
        ])
        return base64.b64encode(encrypted).decode('utf-8')

    def _decrypt_key(self, encrypted: str) -> str:
        """解密 API 密鑰"""
        import base64
        if not encrypted:
            return ""
        env_key = os.environ.get("PROXY_PROVIDER_ENCRYPTION_KEY", "tgmatrix-proxy-enc-2026")
        data = base64.b64decode(encrypted)
        decrypted = bytes([
            b ^ ord(env_key[i % len(env_key)])
            for i, b in enumerate(data)
        ])
        return decrypted.decode('utf-8')

    def add_provider(
        self,
        name: str,
        provider_type: str,
        api_base_url: str = "",
        api_key: str = "",
        api_secret: str = "",
        config: Dict = None,
        sync_interval_minutes: int = 30,
        is_active: bool = True,
    ) -> Dict[str, Any]:
        """新增供應商配置"""
        provider_id = f"prov_{uuid.uuid4().hex[:12]}"
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO proxy_providers
                (id, name, provider_type, api_base_url, api_key_encrypted, api_secret_encrypted,
                 config_json, sync_interval_minutes, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                provider_id, name, provider_type, api_base_url,
                self._encrypt_key(api_key) if api_key else "",
                self._encrypt_key(api_secret) if api_secret else "",
                json.dumps(config or {}),
                sync_interval_minutes,
                1 if is_active else 0,
            ))
            conn.commit()
            return {"success": True, "id": provider_id}
        except Exception as e:
            logger.error(f"Failed to add provider: {e}")
            return {"success": False, "error": str(e)}
        finally:
            conn.close()

    def update_provider(self, provider_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """更新供應商配置"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            set_clauses = []
            params = []

            field_map = {
                "name": "name",
                "provider_type": "provider_type",
                "api_base_url": "api_base_url",
                "sync_interval_minutes": "sync_interval_minutes",
                "is_active": "is_active",
                "config": "config_json",
            }

            for key, col in field_map.items():
                if key in updates:
                    val = updates[key]
                    if key == "config":
                        val = json.dumps(val) if isinstance(val, dict) else val
                    set_clauses.append(f"{col} = ?")
                    params.append(val)

            if "api_key" in updates and updates["api_key"]:
                set_clauses.append("api_key_encrypted = ?")
                params.append(self._encrypt_key(updates["api_key"]))

            if "api_secret" in updates and updates["api_secret"]:
                set_clauses.append("api_secret_encrypted = ?")
                params.append(self._encrypt_key(updates["api_secret"]))

            if not set_clauses:
                return {"success": False, "error": "No valid fields to update"}

            set_clauses.append("updated_at = datetime('now')")
            params.append(provider_id)

            cursor.execute(
                f"UPDATE proxy_providers SET {', '.join(set_clauses)} WHERE id = ?",
                params,
            )
            conn.commit()
            return {"success": True, "updated": cursor.rowcount}
        except Exception as e:
            logger.error(f"Failed to update provider: {e}")
            return {"success": False, "error": str(e)}
        finally:
            conn.close()

    def delete_provider(self, provider_id: str) -> Dict[str, Any]:
        """刪除供應商配置（同步的代理保留但清除 provider_id）"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            # 解除同步代理的供應商關聯，但不刪除代理本身
            cursor.execute('''
                UPDATE static_proxies
                SET provider_id = NULL, proxy_source = 'manual'
                WHERE provider_id = ?
            ''', (provider_id,))

            cursor.execute("DELETE FROM proxy_providers WHERE id = ?", (provider_id,))
            conn.commit()
            return {"success": True, "deleted": cursor.rowcount}
        except Exception as e:
            logger.error(f"Failed to delete provider: {e}")
            return {"success": False, "error": str(e)}
        finally:
            conn.close()

    def get_provider(self, provider_id: str) -> Optional[Dict[str, Any]]:
        """獲取單個供應商配置"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM proxy_providers WHERE id = ?", (provider_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_provider_dict(row)
        finally:
            conn.close()

    def list_providers(self, active_only: bool = False) -> List[Dict[str, Any]]:
        """列出所有供應商"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            query = "SELECT * FROM proxy_providers"
            if active_only:
                query += " WHERE is_active = 1"
            query += " ORDER BY created_at DESC"
            cursor.execute(query)
            return [self._row_to_provider_dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    def _row_to_provider_dict(self, row: sqlite3.Row) -> Dict[str, Any]:
        """行轉字典（脫敏）"""
        d = dict(row)
        # 脫敏 API Key / Secret
        raw_key = self._decrypt_key(d.pop("api_key_encrypted", ""))
        raw_secret = self._decrypt_key(d.pop("api_secret_encrypted", ""))
        d["api_key_masked"] = self._mask_key(raw_key)
        d["api_secret_masked"] = self._mask_key(raw_secret)
        d["has_api_key"] = bool(raw_key)
        d["has_api_secret"] = bool(raw_secret)
        # config_json → dict
        try:
            d["config"] = json.loads(d.pop("config_json", "{}"))
        except (json.JSONDecodeError, TypeError):
            d["config"] = {}
        # balance_info → list
        try:
            d["balance_info"] = json.loads(d.get("balance_info", "[]"))
        except (json.JSONDecodeError, TypeError):
            d["balance_info"] = []
        d["is_active"] = bool(d.get("is_active", 0))
        return d

    def _mask_key(self, key: str) -> str:
        if not key or len(key) <= 8:
            return "****" if key else ""
        return f"{key[:4]}...{key[-4:]}"

    def _build_provider_config(self, provider_id: str) -> Optional[ProviderConfig]:
        """從數據庫構建 ProviderConfig"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM proxy_providers WHERE id = ?", (provider_id,))
            row = cursor.fetchone()
            if not row:
                return None
            d = dict(row)

            try:
                config_dict = json.loads(d.get("config_json", "{}"))
            except (json.JSONDecodeError, TypeError):
                config_dict = {}

            return ProviderConfig(
                id=d["id"],
                name=d["name"],
                provider_type=d["provider_type"],
                api_base_url=d.get("api_base_url", ""),
                api_key=self._decrypt_key(d.get("api_key_encrypted", "")),
                api_secret=self._decrypt_key(d.get("api_secret_encrypted", "")),
                config=config_dict,
                sync_interval_minutes=d.get("sync_interval_minutes", 30),
                is_active=bool(d.get("is_active", 0)),
            )
        finally:
            conn.close()

    # ─── 同步邏輯 ───

    async def sync_provider(
        self, provider_id: str, sync_type: str = "manual"
    ) -> Dict[str, Any]:
        """
        從指定供應商同步代理

        增量同步邏輯：
        1. 拉取遠程代理列表
        2. 對比本地 provider_proxy_id，新增 / 更新 / 標記過期
        3. 已綁定帳號的代理不自動移除
        """
        async with self._sync_lock:
            t0 = time.time()
            added = 0
            removed = 0
            updated = 0
            error_msg = None

            try:
                config = self._build_provider_config(provider_id)
                if not config:
                    return {"success": False, "error": "Provider not found"}

                if not config.is_active:
                    return {"success": False, "error": "Provider is not active"}

                provider = create_provider(config)
                if not provider:
                    return {"success": False, "error": f"Cannot create adapter for type: {config.provider_type}"}

                # 拉取遠程代理列表
                remote_proxies = await provider.fetch_proxies()
                remote_ids = {p.provider_proxy_id for p in remote_proxies}

                conn = self._get_connection()
                try:
                    cursor = conn.cursor()

                    # 獲取本地已同步的代理
                    cursor.execute('''
                        SELECT id, provider_proxy_id, host, port, username, password,
                               status, assigned_account_id
                        FROM static_proxies
                        WHERE provider_id = ?
                    ''', (provider_id,))
                    local_rows = cursor.fetchall()
                    local_map = {row["provider_proxy_id"]: dict(row) for row in local_rows}
                    local_ids = set(local_map.keys())

                    # 新增的代理
                    to_add = remote_ids - local_ids
                    for rp in remote_proxies:
                        if rp.provider_proxy_id in to_add:
                            proxy_id = f"proxy_{uuid.uuid4().hex[:12]}"
                            cursor.execute('''
                                INSERT OR IGNORE INTO static_proxies
                                (id, proxy_type, host, port, username, password, country,
                                 provider, status, provider_id, provider_proxy_id,
                                 expires_at, proxy_source, created_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'api_sync', datetime('now'))
                            ''', (
                                proxy_id, rp.proxy_type, rp.host, rp.port,
                                rp.username, rp.password, rp.country,
                                config.name, ProxyStatus.AVAILABLE.value,
                                provider_id, rp.provider_proxy_id,
                                rp.expires_at,
                            ))
                            if cursor.rowcount > 0:
                                added += 1

                    # 需移除的代理（遠程已不存在）
                    to_remove = local_ids - remote_ids
                    for pp_id in to_remove:
                        local = local_map[pp_id]
                        if local.get("assigned_account_id"):
                            # 已綁定帳號，不刪除，標記為 provider_expired
                            cursor.execute('''
                                UPDATE static_proxies SET note = 'provider_expired'
                                WHERE provider_proxy_id = ? AND provider_id = ?
                            ''', (pp_id, provider_id))
                        else:
                            cursor.execute('''
                                DELETE FROM static_proxies
                                WHERE provider_proxy_id = ? AND provider_id = ?
                            ''', (pp_id, provider_id))
                            if cursor.rowcount > 0:
                                removed += 1

                    # 更新現有代理（IP/Port/認證可能變化）
                    to_update = remote_ids & local_ids
                    for rp in remote_proxies:
                        if rp.provider_proxy_id in to_update:
                            local = local_map[rp.provider_proxy_id]
                            changed = (
                                local.get("host") != rp.host
                                or local.get("port") != rp.port
                                or local.get("username") != rp.username
                                or local.get("password") != rp.password
                            )
                            if changed:
                                cursor.execute('''
                                    UPDATE static_proxies
                                    SET host = ?, port = ?, username = ?, password = ?,
                                        country = ?, expires_at = ?, note = NULL
                                    WHERE provider_proxy_id = ? AND provider_id = ?
                                ''', (
                                    rp.host, rp.port, rp.username, rp.password,
                                    rp.country, rp.expires_at,
                                    rp.provider_proxy_id, provider_id,
                                ))
                                if cursor.rowcount > 0:
                                    updated += 1

                    # 更新供應商的最後同步時間（同一事務）
                    cursor.execute('''
                        UPDATE proxy_providers
                        SET last_sync_at = datetime('now')
                        WHERE id = ?
                    ''', (provider_id,))

                    conn.commit()

                finally:
                    conn.close()

                # 同步餘額信息
                try:
                    balances = await provider.get_balance()
                    if balances:
                        balance_data = [b.to_dict() for b in balances]
                        conn2 = self._get_connection()
                        try:
                            conn2.execute('''
                                UPDATE proxy_providers
                                SET balance_info = ?
                                WHERE id = ?
                            ''', (json.dumps(balance_data), provider_id))
                            conn2.commit()
                        finally:
                            conn2.close()
                except Exception as be:
                    logger.warning(f"Failed to sync balance for {provider_id}: {be}")

            except Exception as e:
                error_msg = str(e)
                logger.error(f"Sync failed for provider {provider_id}: {e}")

            duration_ms = int((time.time() - t0) * 1000)

            # 記錄同步日誌
            self._write_sync_log(
                provider_id=provider_id,
                sync_type=sync_type,
                added_count=added,
                removed_count=removed,
                updated_count=updated,
                error_message=error_msg,
                duration_ms=duration_ms,
            )

            return {
                "success": error_msg is None,
                "added": added,
                "removed": removed,
                "updated": updated,
                "duration_ms": duration_ms,
                "error": error_msg,
            }

    def _write_sync_log(self, **kwargs):
        """寫入同步日誌"""
        conn = self._get_connection()
        try:
            conn.execute('''
                INSERT INTO proxy_sync_log
                (provider_id, sync_type, added_count, removed_count, updated_count,
                 error_message, duration_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                kwargs.get("provider_id"),
                kwargs.get("sync_type", "manual"),
                kwargs.get("added_count", 0),
                kwargs.get("removed_count", 0),
                kwargs.get("updated_count", 0),
                kwargs.get("error_message"),
                kwargs.get("duration_ms", 0),
            ))
            conn.commit()
        except Exception as e:
            logger.error(f"Failed to write sync log: {e}")
        finally:
            conn.close()

    def get_sync_logs(
        self, provider_id: str = None, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """獲取同步日誌"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            if provider_id:
                cursor.execute('''
                    SELECT l.*, p.name as provider_name
                    FROM proxy_sync_log l
                    LEFT JOIN proxy_providers p ON l.provider_id = p.id
                    WHERE l.provider_id = ?
                    ORDER BY l.created_at DESC
                    LIMIT ?
                ''', (provider_id, limit))
            else:
                cursor.execute('''
                    SELECT l.*, p.name as provider_name
                    FROM proxy_sync_log l
                    LEFT JOIN proxy_providers p ON l.provider_id = p.id
                    ORDER BY l.created_at DESC
                    LIMIT ?
                ''', (limit,))
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()

    # ─── 定時自動同步 ───

    async def start_auto_sync(self):
        """啟動自動同步後台任務"""
        if self._auto_sync_task and not self._auto_sync_task.done():
            logger.info("Auto sync already running")
            return

        self._auto_sync_task = asyncio.create_task(self._auto_sync_loop())
        logger.info("Auto sync task started")

    async def stop_auto_sync(self):
        """停止自動同步"""
        if self._auto_sync_task and not self._auto_sync_task.done():
            self._auto_sync_task.cancel()
            try:
                await self._auto_sync_task
            except asyncio.CancelledError:
                pass
            logger.info("Auto sync task stopped")

    async def _auto_sync_loop(self):
        """自動同步循環"""
        consecutive_failures: Dict[str, int] = {}  # provider_id → 連續失敗計數
        _whitelist_checked = False  # 僅首次檢查白名單
        _balance_check_counter = 0  # 每 5 輪檢查一次餘額

        while True:
            try:
                providers = self.list_providers(active_only=True)

                # 首次啟動時自動將服務器 IP 加入白名單
                if not _whitelist_checked and providers:
                    _whitelist_checked = True
                    asyncio.create_task(self._auto_whitelist_server_ip(providers))

                for prov in providers:
                    prov_id = prov["id"]
                    interval = prov.get("sync_interval_minutes", 30)
                    last_sync = prov.get("last_sync_at")

                    # 判斷是否到了同步時間
                    should_sync = False
                    if not last_sync:
                        should_sync = True
                    else:
                        try:
                            last_dt = self._parse_datetime_naive(last_sync)
                            if datetime.utcnow() - last_dt > timedelta(minutes=interval):
                                should_sync = True
                        except (ValueError, TypeError):
                            should_sync = True

                    if should_sync:
                        # 指數退避：連續失敗 N 次後等待更長時間
                        fail_count = consecutive_failures.get(prov_id, 0)
                        if fail_count >= 3:
                            backoff_factor = min(2 ** (fail_count - 2), 16)
                            effective_interval = interval * backoff_factor
                            if last_sync:
                                try:
                                    last_dt = self._parse_datetime_naive(last_sync)
                                    if datetime.utcnow() - last_dt < timedelta(minutes=effective_interval):
                                        continue
                                except (ValueError, TypeError):
                                    pass

                        result = await self.sync_provider(prov_id, sync_type="scheduled")
                        if result.get("success"):
                            consecutive_failures[prov_id] = 0
                            logger.info(
                                f"Auto sync {prov['name']}: "
                                f"+{result['added']} -{result['removed']} ~{result['updated']}"
                            )
                        else:
                            consecutive_failures[prov_id] = fail_count + 1
                            logger.warning(
                                f"Auto sync failed for {prov['name']} "
                                f"({consecutive_failures[prov_id]}x): {result.get('error')}"
                            )

                # 每 5 輪（約 5 分鐘）檢查一次餘額告警 + 清理過期代理
                _balance_check_counter += 1
                if _balance_check_counter >= 5 and providers:
                    _balance_check_counter = 0
                    await self._check_balance_alerts(providers)

                    # 自動清理過期代理（非 dry_run）
                    try:
                        cleanup = self.cleanup_expired_proxies(dry_run=False)
                        if cleanup.get("removed", 0) > 0 or cleanup.get("marked_disabled", 0) > 0:
                            logger.info(
                                f"Auto cleanup: removed {cleanup['removed']}, "
                                f"marked {cleanup['marked_disabled']} expired proxies"
                            )
                    except Exception as ce:
                        logger.debug(f"Auto cleanup error: {ce}")

                # 每 60 秒檢查一次
                await asyncio.sleep(60)

            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.error(f"Auto sync loop error: {e}")
                await asyncio.sleep(120)

    async def _auto_whitelist_server_ip(self, providers: List[Dict]):
        """自動將服務器出口 IP 加入供應商白名單"""
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://api.ipify.org?format=json",
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        server_ip = data.get("ip", "")
                    else:
                        return
        except Exception as e:
            logger.warning(f"Failed to detect server IP for auto-whitelist: {e}")
            return

        if not server_ip:
            return

        logger.info(f"Server outbound IP detected: {server_ip}")

        for prov in providers:
            try:
                existing = await self.get_provider_whitelist(prov["id"])
                if server_ip not in existing:
                    ok = await self.add_provider_whitelist_ip(prov["id"], server_ip)
                    if ok:
                        logger.info(f"Auto-added server IP {server_ip} to {prov['name']} whitelist")
                    else:
                        logger.warning(f"Failed to add server IP to {prov['name']} whitelist")
                else:
                    logger.debug(f"Server IP {server_ip} already in {prov['name']} whitelist")
            except Exception as e:
                logger.warning(f"Whitelist check for {prov['name']} failed: {e}")

    async def _check_balance_alerts(self, providers: List[Dict]):
        """檢查供應商餘額並記錄告警"""
        for prov in providers:
            try:
                balances = prov.get("balance_info", [])
                if not balances:
                    continue

                for b in balances:
                    if not isinstance(b, dict):
                        continue

                    btype = b.get("balance_type", "")
                    remaining = b.get("remaining", 0)
                    total = b.get("total", 0)
                    unit = b.get("unit", "")

                    # 告警邏輯
                    alert = False
                    alert_msg = ""

                    if btype == "traffic" and total > 0:
                        pct = (remaining / total) * 100 if total else 0
                        if pct < 10:
                            alert = True
                            alert_msg = f"流量即將耗盡: {remaining:.2f}{unit} / {total:.2f}{unit} ({pct:.1f}%)"
                    elif btype == "credits" and remaining < 5:
                        alert = True
                        alert_msg = f"帳戶餘額不足: {remaining} {unit}"
                    elif btype == "time":
                        if remaining < 3:
                            alert = True
                            alert_msg = f"即將到期: 剩餘 {remaining} {unit}"
                    elif btype == "ip_count" and total > 0:
                        if remaining == 0:
                            alert = True
                            alert_msg = f"IP 配額已滿: {total} {unit} 全部使用"

                    if alert:
                        logger.warning(f"⚠️ 代理供應商 [{prov['name']}] 餘額告警: {alert_msg}")
                        self._write_balance_alert(prov["id"], prov["name"], alert_msg)

            except Exception as e:
                logger.debug(f"Balance check for {prov.get('name', '?')} error: {e}")

    @staticmethod
    def _parse_datetime_naive(dt_str: str) -> datetime:
        """將時間字符串解析為 naive datetime（統一去除時區信息）"""
        # 移除 Z 尾綴
        cleaned = dt_str.replace("Z", "").replace("+00:00", "").strip()
        return datetime.fromisoformat(cleaned)

    def _write_balance_alert(self, provider_id: str, provider_name: str, message: str):
        """記錄餘額告警到同步日誌"""
        self._write_sync_log(
            provider_id=provider_id,
            sync_type="balance_alert",
            error_message=f"[{provider_name}] {message}",
            duration_ms=0,
        )

    # ─── 過期代理清理 ───

    def cleanup_expired_proxies(self, dry_run: bool = False) -> Dict[str, Any]:
        """清理已過期的代理"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            now = datetime.utcnow().isoformat()

            # 查找已過期的未綁定代理
            cursor.execute('''
                SELECT id, host, port, provider_id, assigned_account_id
                FROM static_proxies
                WHERE expires_at IS NOT NULL
                  AND expires_at < ?
                  AND proxy_source = 'api_sync'
            ''', (now,))
            expired = cursor.fetchall()

            removed = 0
            marked = 0

            if not dry_run:
                for row in expired:
                    if row["assigned_account_id"]:
                        # 已綁定，標記而非刪除
                        cursor.execute('''
                            UPDATE static_proxies
                            SET status = 'disabled', note = 'expired'
                            WHERE id = ?
                        ''', (row["id"],))
                        marked += 1
                    else:
                        cursor.execute("DELETE FROM static_proxies WHERE id = ?", (row["id"],))
                        removed += 1
                conn.commit()

            return {
                "total_expired": len(expired),
                "removed": removed,
                "marked_disabled": marked,
                "dry_run": dry_run,
            }
        finally:
            conn.close()

    # ─── 測試連接 ───

    async def test_provider_connection(self, provider_id: str) -> Dict[str, Any]:
        """測試供應商 API 連接"""
        config = self._build_provider_config(provider_id)
        if not config:
            return {"success": False, "message": "Provider not found"}

        provider = create_provider(config)
        if not provider:
            return {"success": False, "message": f"Cannot create adapter for: {config.provider_type}"}

        return await provider.test_connection()

    # ─── 餘額查詢 ───

    async def get_provider_balance(self, provider_id: str) -> List[Dict[str, Any]]:
        """查詢供應商餘額"""
        config = self._build_provider_config(provider_id)
        if not config:
            return [{"error": "Provider not found"}]

        provider = create_provider(config)
        if not provider:
            return [{"error": "Cannot create adapter"}]

        balances = await provider.get_balance()
        return [b.to_dict() for b in balances]

    # ─── 白名單管理 ───

    async def get_provider_whitelist(self, provider_id: str) -> List[str]:
        """獲取供應商白名單"""
        config = self._build_provider_config(provider_id)
        if not config:
            return []
        provider = create_provider(config)
        if not provider:
            return []
        return await provider.get_whitelist()

    async def add_provider_whitelist_ip(self, provider_id: str, ip: str) -> bool:
        """添加 IP 到供應商白名單"""
        config = self._build_provider_config(provider_id)
        if not config:
            return False
        provider = create_provider(config)
        if not provider:
            return False
        return await provider.add_whitelist_ip(ip)

    async def remove_provider_whitelist_ip(self, provider_id: str, ip: str) -> bool:
        """從供應商白名單移除 IP"""
        config = self._build_provider_config(provider_id)
        if not config:
            return False
        provider = create_provider(config)
        if not provider:
            return False
        return await provider.remove_whitelist_ip(ip)

    # ─── 動態代理請求 ───

    async def request_dynamic_proxy(
        self, provider_id: str = None, country: str = "", session_id: str = ""
    ) -> Optional[Dict[str, Any]]:
        """
        向供應商請求動態代理

        如果未指定 provider_id，自動選擇第一個支持動態代理的活躍供應商。
        """
        if provider_id:
            config = self._build_provider_config(provider_id)
            if not config:
                return None
            configs_to_try = [config]
        else:
            providers = self.list_providers(active_only=True)
            configs_to_try = []
            for p in providers:
                cfg = self._build_provider_config(p["id"])
                if cfg:
                    prod_types = cfg.config.get("product_types", [])
                    if "dynamic_residential" in prod_types or "unlimited_residential" in prod_types:
                        configs_to_try.append(cfg)

        for cfg in configs_to_try:
            provider = create_provider(cfg)
            if not provider:
                continue
            proxy = await provider.get_dynamic_proxy(country=country, session_id=session_id)
            if proxy:
                return {
                    "proxy_type": proxy.proxy_type,
                    "host": proxy.host,
                    "port": proxy.port,
                    "username": proxy.username,
                    "password": proxy.password,
                    "country": proxy.country,
                    "provider_id": cfg.id,
                    "provider_name": cfg.name,
                    "is_dynamic": True,
                }
        return None


# ─── 單例工廠 ───

_sync_service: Optional[ProxySyncService] = None


def get_sync_service(db_path: str = None) -> ProxySyncService:
    """獲取同步服務實例"""
    global _sync_service
    if _sync_service is None:
        _sync_service = ProxySyncService(db_path)
    return _sync_service
