"""
Phase 9-2: Account management (tgmatrix.db)
Mixin class for Database — merged via multiple inheritance.
"""
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import json
import sys
import sqlite3

# 🔧 同步回退分支改用合法連接模塊 core.db_utils（見 .cursorrules 合法連接模塊清單）。
from core.db_utils import create_connection

# 異步數據庫支持
try:
    import aiosqlite
    HAS_AIOSQLITE = True
except ImportError:
    HAS_AIOSQLITE = False
    aiosqlite = None

# 從 config 導入數據庫路徑（避免與 database.py 循環導入）
from config import DATABASE_PATH
ACCOUNTS_DB_PATH = DATABASE_PATH

# 🔍 本檔案同步/異步雙套邏輯查證結論（2026-07 排查，詳見報告）：
# - 這「不是」兩套服務不同呼叫場景的並行邏輯，而是同一個 async def 方法內部依
#   HAS_AIOSQLITE 做的防禦性分支：aiosqlite 缺失時（理論上幾乎不會發生，因為
#   requirements.txt 已鎖定 aiosqlite>=0.19.0）才會落入同步 sqlite3 回退路徑。
#   此寫法與 database.py（三大庫「唯一合法」async 連接來源）自身採用的
#   `if not HAS_AIOSQLITE:` 防禦性回退模式完全一致，並非本檔案獨有的技術債。
# - 同步回退分支：已改用 core.db_utils.create_connection()（僅替換連線建立方式，
#   呼叫時機/回傳值/資料表結構完全不變）。
# - 異步主邏輯：評估後維持直連 aiosqlite.connect()，不遷移到 db_connection_pool.py。
#   原因：① db_connection_pool.init_connection_pool() 在全專案「從未被呼叫過」，
#   目前是完全休眠、未經生產驗證的全域單例，若在帳號管理主流程首次啟用，風險遠高於
#   單次任務應承擔的範圍；② 本檔案多個方法（_ensure_accounts_table 的多語句
#   CREATE+ALTER 序列、get_all_accounts 的查詢失敗後降級重試）依賴同一條連線
#   跨多個語句的順序性，直連短生命週期連線在语义上更貼近現狀、風險更低。
# - 路徑解析：ACCOUNTS_DB_PATH 已經是 from config import DATABASE_PATH，等同
#   core.db_utils.resolve_db_path() 的解析結果（已交叉比對 dev/Docker/Electron
#   三種環境，結論一致），不屬於「硬編碼路徑」，故不需改動。


class AccountMixin:
    """Account management (tgmatrix.db)"""

    # ============ 帳號管理方法（操作 tgmatrix.db）============
    
    def _get_accounts_db_path(self) -> Path:
        """獲取帳號管理數據庫路徑"""
        return ACCOUNTS_DB_PATH
    
    async def get_account_by_phone(self, phone: str) -> Optional[Dict]:
        """根據電話號碼獲取帳號"""
        try:
            accounts_db_path = self._get_accounts_db_path()
            
            # 標準化電話號碼格式
            phone = str(phone).strip()
            if phone.startswith('+'):
                normalized_phone = '+' + ''.join(c for c in phone[1:] if c.isdigit())
            else:
                normalized_phone = '+' + ''.join(c for c in phone if c.isdigit())
            
            # 確保表存在
            await self._ensure_accounts_table(accounts_db_path)
            
            if not HAS_AIOSQLITE:
                # 同步回退
                conn = create_connection(str(accounts_db_path))
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                # 嘗試兩種格式（有 + 和沒有 +）
                cursor.execute('SELECT * FROM accounts WHERE phone = ? OR phone = ?', 
                              (normalized_phone, normalized_phone[1:]))
                row = cursor.fetchone()
                conn.close()
                return dict(row) if row else None
            
            # 異步方式
            async with aiosqlite.connect(str(accounts_db_path)) as conn:
                conn.row_factory = aiosqlite.Row
                # 嘗試兩種格式（有 + 和沒有 +）
                cursor = await conn.execute('SELECT * FROM accounts WHERE phone = ? OR phone = ?', 
                                           (normalized_phone, normalized_phone[1:]))
                row = await cursor.fetchone()
                return dict(row) if row else None
        except Exception as e:
            print(f"Error getting account by phone {phone}: {e}")
            return None
    
    async def add_account(self, account_data: Dict[str, Any]) -> int:
        """添加帳號
        
        🆕 多租戶支持：自動設置 owner_user_id
        """
        try:
            accounts_db_path = self._get_accounts_db_path()
            accounts_db_path.parent.mkdir(parents=True, exist_ok=True)

            # 確保 accounts 表存在
            await self._ensure_accounts_table(accounts_db_path)

            # 標準化電話號碼格式（確保有 + 前綴）
            if 'phone' in account_data:
                phone = str(account_data['phone']).strip()
                # 移除所有非數字字符（除了開頭的 +）
                if phone.startswith('+'):
                    phone = '+' + ''.join(c for c in phone[1:] if c.isdigit())
                else:
                    phone = '+' + ''.join(c for c in phone if c.isdigit())
                account_data['phone'] = phone

            # SQL 保留關鍵字需要用方括號轉義
            def escape_column(col):
                reserved_keywords = {'group', 'order', 'select', 'insert', 'update', 'delete', 'from', 'where', 'table', 'index', 'key'}
                if col.lower() in reserved_keywords:
                    return f'[{col}]'
                return col

            # 🆕 自動設置 owner_user_id（多租戶支持）
            if 'owner_user_id' not in account_data:
                try:
                    from core.tenant_context import get_current_tenant
                    tenant = get_current_tenant()
                    if tenant and tenant.user_id:
                        account_data['owner_user_id'] = tenant.user_id
                    else:
                        account_data['owner_user_id'] = 'local_user'
                except ImportError:
                    account_data['owner_user_id'] = 'local_user'

            # 定義有效的列名（與表結構匹配）
            valid_columns = {
                'phone', 'apiId', 'apiHash', 'proxy', 'group', 'role', 'status',
                'twoFactorPassword', 'deviceModel', 'systemVersion', 'appVersion',
                'langCode', 'platform', 'deviceId', 'proxyType', 'proxyHost',
                'proxyPort', 'proxyUsername', 'proxyPassword', 'proxyCountry',
                'proxyRotationEnabled', 'enableWarmup', 'warmupStatus',
                'dailySendCount', 'dailySendLimit', 'healthScore',
                'nickname', 'notes', 'aiEnabled', 'aiModel', 'aiPersonality',
                'firstName', 'lastName', 'username', 'bio', 'avatarPath', 'telegramId',
                'tags', 'owner_user_id'  # 🆕 添加 owner_user_id
            }

            # tags 需要轉換為 JSON 字符串
            if 'tags' in account_data and isinstance(account_data['tags'], list):
                account_data['tags'] = json.dumps(account_data['tags'])

            # 過濾掉不存在的列
            filtered_data = {k: v for k, v in account_data.items() if k in valid_columns}

            if not HAS_AIOSQLITE:
                # 同步回退
                conn = create_connection(str(accounts_db_path))
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()

                # 構建插入語句（轉義保留關鍵字）
                columns = list(filtered_data.keys())
                escaped_columns = [escape_column(col) for col in columns]
                placeholders = ','.join(['?' for _ in columns])
                values = [filtered_data[col] for col in columns]

                cursor.execute(f'''
                    INSERT INTO accounts ({','.join(escaped_columns)})
                    VALUES ({placeholders})
                ''', values)
                conn.commit()
                account_id = cursor.lastrowid
                conn.close()
                return account_id

            # 異步方式
            async with aiosqlite.connect(str(accounts_db_path)) as conn:
                # 構建插入語句（轉義保留關鍵字）
                columns = list(filtered_data.keys())
                escaped_columns = [escape_column(col) for col in columns]
                placeholders = ','.join(['?' for _ in columns])
                values = [filtered_data[col] for col in columns]

                cursor = await conn.execute(f'''
                    INSERT INTO accounts ({','.join(escaped_columns)})
                    VALUES ({placeholders})
                ''', values)
                await conn.commit()
                return cursor.lastrowid
        except Exception as e:
            print(f"Error adding account: {e}")
            import traceback
            traceback.print_exc()
            raise
    
    async def get_all_accounts(self, owner_user_id: str = None) -> List[Dict]:
        """獲取所有帳號
        
        🆕 多租戶支持：
        - 如果提供 owner_user_id，只返回該用戶的帳號
        - 如果未提供，嘗試從租戶上下文獲取
        - Electron 模式下返回所有帳號
        
        🔧 P1 加固：防御性查詢 —— 如果 owner_user_id 欄位不存在，自動回退到簡單查詢
        """
        try:
            accounts_db_path = self._get_accounts_db_path()
            print(f"[get_all_accounts] DB path: {accounts_db_path}, exists: {accounts_db_path.exists()}", file=sys.stderr)
            
            if not accounts_db_path.exists():
                # 確保數據庫和表存在
                accounts_db_path.parent.mkdir(parents=True, exist_ok=True)
                await self._ensure_accounts_table(accounts_db_path)
                print(f"[get_all_accounts] DB did not exist, created empty table", file=sys.stderr)
                return []
            
            # 確保表存在 + 自動遷移欄位
            await self._ensure_accounts_table(accounts_db_path)
            
            # 🔧 P1: 先檢測 owner_user_id 欄位是否真的存在
            has_owner_column = await self._check_column_exists(accounts_db_path, 'accounts', 'owner_user_id')
            print(f"[get_all_accounts] has_owner_column: {has_owner_column}", file=sys.stderr)
            
            # 🆕 獲取租戶上下文
            if owner_user_id is None:
                try:
                    from core.tenant_context import get_current_tenant
                    tenant = get_current_tenant()
                    if tenant and tenant.user_id:
                        owner_user_id = tenant.user_id
                        print(f"[get_all_accounts] tenant owner_user_id: {owner_user_id}", file=sys.stderr)
                except ImportError:
                    pass
            
            # 🆕 構建查詢（支持多租戶過濾）
            import os
            is_electron = os.environ.get('ELECTRON_MODE', 'false').lower() == 'true'
            
            # 🔧 P3-6: 排除已刪除/已封禁的帳號（與配額計數邏輯對齊）
            excluded_status_clause = "AND (status IS NULL OR LOWER(status) NOT IN ('deleted', 'banned', 'removed'))"
            
            # 🔧 P1 加固：如果 owner_user_id 欄位不存在，強制使用簡單查詢（避免 OperationalError）
            use_tenant_filter = (not is_electron) and owner_user_id and has_owner_column
            
            if use_tenant_filter:
                # SaaS 模式：返回當前用戶的帳號 + 未綁定/歷史帳號（owner_user_id 為空或 local_user，兼容舊數據）
                query = f'''SELECT * FROM accounts
                    WHERE (owner_user_id = ? OR owner_user_id IS NULL OR owner_user_id = '' OR owner_user_id = 'local_user')
                    {excluded_status_clause}
                    ORDER BY id'''
                params = (owner_user_id,)
            else:
                # Electron 模式 / 無用戶上下文 / 欄位不存在：返回所有帳號
                query = f'SELECT * FROM accounts WHERE 1=1 {excluded_status_clause} ORDER BY id'
                params = ()
            
            print(f"[get_all_accounts] use_tenant_filter={use_tenant_filter}, is_electron={is_electron}", file=sys.stderr)
            
            if not HAS_AIOSQLITE:
                # 同步回退
                conn = create_connection(str(accounts_db_path))
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(query, params)
                rows = cursor.fetchall()
                conn.close()
                result = [dict(row) for row in rows]
                print(f"[get_all_accounts] sync returned {len(result)} accounts", file=sys.stderr)
                return result
            
            # 異步方式
            async with aiosqlite.connect(str(accounts_db_path)) as conn:
                conn.row_factory = aiosqlite.Row
                try:
                    cursor = await conn.execute(query, params)
                    rows = await cursor.fetchall()
                    result = [dict(row) for row in rows]
                    print(f"[get_all_accounts] async returned {len(result)} accounts", file=sys.stderr)
                    return result
                except Exception as query_err:
                    # 🔧 P1: 查詢失敗（可能是欄位不存在），回退到最簡單的查詢
                    print(f"[get_all_accounts] ⚠️ Query failed: {query_err}, falling back to simple query", file=sys.stderr)
                    fallback_query = f'SELECT * FROM accounts WHERE 1=1 {excluded_status_clause} ORDER BY id'
                    cursor = await conn.execute(fallback_query)
                    rows = await cursor.fetchall()
                    result = [dict(row) for row in rows]
                    print(f"[get_all_accounts] fallback returned {len(result)} accounts", file=sys.stderr)
                    return result
        except Exception as e:
            print(f"[get_all_accounts] ❌ FATAL error: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            return []
    
    async def _check_column_exists(self, db_path: Path, table: str, column: str) -> bool:
        """檢查數據庫表中是否存在指定欄位"""
        try:
            if not HAS_AIOSQLITE:
                conn = create_connection(str(db_path))
                cursor = conn.cursor()
                cursor.execute(f"PRAGMA table_info({table})")
                columns = {row[1] for row in cursor.fetchall()}
                conn.close()
                return column in columns
            
            async with aiosqlite.connect(str(db_path)) as conn:
                cursor = await conn.execute(f"PRAGMA table_info({table})")
                rows = await cursor.fetchall()
                columns = {row[1] for row in rows}
                return column in columns
        except Exception as e:
            print(f"[_check_column_exists] Error checking column {column}: {e}", file=sys.stderr)
            return False
    
    async def update_account(self, account_id: int, updates: Dict[str, Any]) -> bool:
        """更新帳號"""
        try:
            accounts_db_path = self._get_accounts_db_path()
            if not accounts_db_path.exists():
                return False

            # SQL 保留關鍵字需要用方括號轉義
            def escape_column(col):
                reserved_keywords = {'group', 'order', 'select', 'insert', 'update', 'delete', 'from', 'where', 'table', 'index', 'key'}
                if col.lower() in reserved_keywords:
                    return f'[{col}]'
                return col

            # 定義有效的列名（與表結構匹配）
            valid_columns = {
                'phone', 'apiId', 'apiHash', 'proxy', 'group', 'role', 'status',
                'twoFactorPassword', 'deviceModel', 'systemVersion', 'appVersion',
                'langCode', 'platform', 'deviceId', 'proxyType', 'proxyHost',
                'proxyPort', 'proxyUsername', 'proxyPassword', 'proxyCountry',
                'proxyRotationEnabled', 'enableWarmup', 'warmupStatus',
                'dailySendCount', 'dailySendLimit', 'healthScore',
                'nickname', 'notes', 'aiEnabled', 'aiModel', 'aiPersonality',
                'firstName', 'lastName', 'username', 'bio', 'avatarPath', 'telegramId',
                'tags'  # 標籤（JSON 字符串）
            }

            # tags 需要轉換為 JSON 字符串
            if 'tags' in updates and isinstance(updates['tags'], list):
                updates['tags'] = json.dumps(updates['tags'])

            # 過濾掉不存在的列
            filtered_updates = {k: v for k, v in updates.items() if k in valid_columns}
            
            if not filtered_updates:
                return True  # 沒有有效的更新

            if not HAS_AIOSQLITE:
                # 同步回退
                conn = create_connection(str(accounts_db_path))
                cursor = conn.cursor()

                set_clause = ','.join([f"{escape_column(k)} = ?" for k in filtered_updates.keys()])
                values = list(filtered_updates.values()) + [account_id]

                cursor.execute(f'''
                    UPDATE accounts SET {set_clause}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', values)
                conn.commit()
                success = cursor.rowcount > 0
                conn.close()
                return success

            # 異步方式
            async with aiosqlite.connect(str(accounts_db_path)) as conn:
                set_clause = ','.join([f"{escape_column(k)} = ?" for k in filtered_updates.keys()])
                values = list(filtered_updates.values()) + [account_id]

                cursor = await conn.execute(f'''
                    UPDATE accounts SET {set_clause}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', values)
                await conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            print(f"Error updating account {account_id}: {e}")
            return False
    
    async def batch_update_account_status(self, account_ids: List[int], status: str) -> int:
        """
        🆕 批量更新帳號狀態（優化性能）
        使用單一 SQL 語句更新多個帳號，避免多次數據庫調用
        
        Args:
            account_ids: 要更新的帳號 ID 列表
            status: 新狀態值
            
        Returns:
            更新的帳號數量
        """
        if not account_ids:
            return 0
            
        try:
            accounts_db_path = self._get_accounts_db_path()
            if not accounts_db_path.exists():
                return 0
            
            # 使用 IN 子句一次性更新所有帳號
            placeholders = ','.join(['?' for _ in account_ids])
            values = [status] + account_ids
            
            if not HAS_AIOSQLITE:
                conn = create_connection(str(accounts_db_path))
                cursor = conn.cursor()
                cursor.execute(f'''
                    UPDATE accounts 
                    SET status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id IN ({placeholders})
                ''', values)
                conn.commit()
                count = cursor.rowcount
                conn.close()
                return count
            
            async with aiosqlite.connect(str(accounts_db_path)) as conn:
                cursor = await conn.execute(f'''
                    UPDATE accounts 
                    SET status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id IN ({placeholders})
                ''', values)
                await conn.commit()
                return cursor.rowcount
                
        except Exception as e:
            print(f"Error batch updating account status: {e}")
            return 0
    
    async def get_account(self, account_id: int) -> Optional[Dict]:
        """根據 ID 獲取帳號"""
        try:
            accounts_db_path = self._get_accounts_db_path()
            if not accounts_db_path.exists():
                return None
            
            # 確保表存在
            await self._ensure_accounts_table(accounts_db_path)
            
            if not HAS_AIOSQLITE:
                # 同步回退
                conn = create_connection(str(accounts_db_path))
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute('SELECT * FROM accounts WHERE id = ?', (account_id,))
                row = cursor.fetchone()
                conn.close()
                return dict(row) if row else None
            
            # 異步方式
            async with aiosqlite.connect(str(accounts_db_path)) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.execute('SELECT * FROM accounts WHERE id = ?', (account_id,))
                row = await cursor.fetchone()
                return dict(row) if row else None
        except Exception as e:
            print(f"Error getting account {account_id}: {e}")
            return None
    
    async def remove_account(self, account_id: int) -> bool:
        """刪除帳號"""
        try:
            accounts_db_path = self._get_accounts_db_path()
            if not accounts_db_path.exists():
                return False
            
            if not HAS_AIOSQLITE:
                # 同步回退
                conn = create_connection(str(accounts_db_path))
                cursor = conn.cursor()
                cursor.execute('DELETE FROM accounts WHERE id = ?', (account_id,))
                conn.commit()
                success = cursor.rowcount > 0
                conn.close()
                return success
            
            # 異步方式
            async with aiosqlite.connect(str(accounts_db_path)) as conn:
                cursor = await conn.execute('DELETE FROM accounts WHERE id = ?', (account_id,))
                await conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            print(f"Error removing account {account_id}: {e}")
            return False
    
    async def _ensure_accounts_table(self, db_path: Path):
        """確保 accounts 表存在（如果不存在則創建），並自動添加缺失的欄位"""
        try:
            # 注意：[group] 使用方括號轉義，因為 group 是 SQL 保留關鍵字
            create_table_sql = '''
                CREATE TABLE IF NOT EXISTS accounts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    phone TEXT UNIQUE NOT NULL,
                    apiId TEXT,
                    apiHash TEXT,
                    proxy TEXT,
                    [group] TEXT,
                    role TEXT DEFAULT 'Unassigned',
                    status TEXT DEFAULT 'Offline',
                    twoFactorPassword TEXT,
                    deviceModel TEXT,
                    systemVersion TEXT,
                    appVersion TEXT,
                    langCode TEXT,
                    platform TEXT,
                    deviceId TEXT,
                    proxyType TEXT,
                    proxyHost TEXT,
                    proxyPort INTEGER,
                    proxyUsername TEXT,
                    proxyPassword TEXT,
                    proxyCountry TEXT,
                    proxyRotationEnabled INTEGER DEFAULT 0,
                    enableWarmup INTEGER DEFAULT 0,
                    warmupStatus TEXT,
                    dailySendCount INTEGER DEFAULT 0,
                    dailySendLimit INTEGER DEFAULT 50,
                    healthScore REAL DEFAULT 100.0,
                    nickname TEXT,
                    notes TEXT,
                    aiEnabled INTEGER DEFAULT 0,
                    aiModel TEXT,
                    aiPersonality TEXT,
                    firstName TEXT,
                    lastName TEXT,
                    username TEXT,
                    bio TEXT,
                    avatarPath TEXT,
                    telegramId TEXT,
                    tags TEXT,
                    owner_user_id TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            '''
            
            # 定義所有需要的欄位（用於自動添加缺失欄位）
            required_columns = [
                ("proxyHost", "TEXT"),
                ("proxyPort", "INTEGER"),
                ("proxyUsername", "TEXT"),
                ("proxyPassword", "TEXT"),
                ("proxyCountry", "TEXT"),
                ("proxyRotationEnabled", "INTEGER DEFAULT 0"),
                ("enableWarmup", "INTEGER DEFAULT 0"),
                ("warmupStatus", "TEXT"),
                ("dailySendCount", "INTEGER DEFAULT 0"),
                ("dailySendLimit", "INTEGER DEFAULT 50"),
                ("healthScore", "REAL DEFAULT 100.0"),
                ("nickname", "TEXT"),
                ("notes", "TEXT"),
                ("aiEnabled", "INTEGER DEFAULT 0"),
                ("aiModel", "TEXT"),
                ("aiPersonality", "TEXT"),
                ("firstName", "TEXT"),
                ("lastName", "TEXT"),
                ("username", "TEXT"),
                ("bio", "TEXT"),
                ("avatarPath", "TEXT"),
                ("telegramId", "TEXT"),
                ("tags", "TEXT"),
                ("owner_user_id", "TEXT"),
            ]
            
            if not HAS_AIOSQLITE:
                conn = create_connection(str(db_path))
                cursor = conn.cursor()
                cursor.execute(create_table_sql)
                conn.commit()
                
                # 檢查並添加缺失的欄位
                cursor.execute("PRAGMA table_info(accounts)")
                existing_columns = {row[1] for row in cursor.fetchall()}
                
                for col_name, col_type in required_columns:
                    if col_name not in existing_columns:
                        try:
                            cursor.execute(f"ALTER TABLE accounts ADD COLUMN {col_name} {col_type}")
                            print(f"[Database] Added missing column: {col_name}", file=sys.stderr)
                        except Exception as col_err:
                            # 欄位可能已存在
                            pass
                
                conn.commit()
                conn.close()
                return
            
            # 異步方式
            async with aiosqlite.connect(str(db_path)) as conn:
                await conn.execute(create_table_sql)
                await conn.commit()
                
                # 檢查並添加缺失的欄位
                cursor = await conn.execute("PRAGMA table_info(accounts)")
                rows = await cursor.fetchall()
                existing_columns = {row[1] for row in rows}
                
                for col_name, col_type in required_columns:
                    if col_name not in existing_columns:
                        try:
                            await conn.execute(f"ALTER TABLE accounts ADD COLUMN {col_name} {col_type}")
                            print(f"[Database] Added missing column: {col_name}", file=sys.stderr)
                        except Exception as col_err:
                            # 欄位可能已存在
                            pass
                
                await conn.commit()
        except Exception as e:
            print(f"Error ensuring accounts table: {e}")
    
    # ============ P1-5: 帳號事件記錄（登入/斷開/重連/過期） ============
    
    async def _ensure_account_events_table(self, db_path: Path):
        """確保 account_events 表存在"""
        create_sql = '''
            CREATE TABLE IF NOT EXISTS account_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                event_type TEXT NOT NULL,
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (account_id) REFERENCES accounts(id)
            )
        '''
        try:
            if not HAS_AIOSQLITE:
                conn = sqlite3.connect(str(db_path))
                conn.execute(create_sql)
                conn.commit()
                conn.close()
            else:
                async with aiosqlite.connect(str(db_path)) as conn:
                    await conn.execute(create_sql)
                    await conn.commit()
        except Exception as e:
            print(f"Error ensuring account_events table: {e}", file=sys.stderr)
    
    async def add_account_event(self, account_id: int, event_type: str, reason: Optional[str] = None) -> bool:
        """記錄帳號事件（login / logout / disconnect / session_expired / reconnect_ok）"""
        try:
            db_path = self._get_accounts_db_path()
            await self._ensure_accounts_table(db_path)
            await self._ensure_account_events_table(db_path)
            if not HAS_AIOSQLITE:
                conn = sqlite3.connect(str(db_path))
                conn.execute(
                    'INSERT INTO account_events (account_id, event_type, reason) VALUES (?, ?, ?)',
                    (account_id, event_type, reason or '')
                )
                conn.commit()
                conn.close()
                return True
            async with aiosqlite.connect(str(db_path)) as conn:
                await conn.execute(
                    'INSERT INTO account_events (account_id, event_type, reason) VALUES (?, ?, ?)',
                    (account_id, event_type, reason or '')
                )
                await conn.commit()
            return True
        except Exception as e:
            print(f"Error adding account event: {e}", file=sys.stderr)
            return False
    
    async def get_account_events(self, account_id: int, limit: int = 50) -> List[Dict]:
        """獲取帳號最近事件列表（用於診斷）"""
        try:
            db_path = self._get_accounts_db_path()
            if not db_path.exists():
                return []
            await self._ensure_account_events_table(db_path)
            if not HAS_AIOSQLITE:
                conn = sqlite3.connect(str(db_path))
                conn.row_factory = sqlite3.Row
                cursor = conn.execute(
                    'SELECT id, account_id, event_type, reason, created_at FROM account_events WHERE account_id = ? ORDER BY id DESC LIMIT ?',
                    (account_id, limit)
                )
                rows = cursor.fetchall()
                conn.close()
                return [dict(r) for r in rows]
            async with aiosqlite.connect(str(db_path)) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.execute(
                    'SELECT id, account_id, event_type, reason, created_at FROM account_events WHERE account_id = ? ORDER BY id DESC LIMIT ?',
                    (account_id, limit)
                )
                rows = await cursor.fetchall()
                return [dict(r) for r in rows]
        except Exception as e:
            print(f"Error getting account events: {e}", file=sys.stderr)
            return []
    
    # ============ 異步 SQL 執行方法 ============
