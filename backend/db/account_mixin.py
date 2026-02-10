"""
Phase 9-2: Account management (tgmatrix.db)
Mixin class for Database — merged via multiple inheritance.
"""
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import json
import sys


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
                conn = sqlite3.connect(str(accounts_db_path))
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
                conn = sqlite3.connect(str(accounts_db_path))
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
        """
        try:
            accounts_db_path = self._get_accounts_db_path()
            if not accounts_db_path.exists():
                # 確保數據庫和表存在
                await self._ensure_accounts_table(accounts_db_path)
                return []
            
            # 確保表存在
            await self._ensure_accounts_table(accounts_db_path)
            
            # 🆕 獲取租戶上下文
            if owner_user_id is None:
                try:
                    from core.tenant_context import get_current_tenant
                    tenant = get_current_tenant()
                    if tenant and tenant.user_id:
                        owner_user_id = tenant.user_id
                except ImportError:
                    pass
            
            # 🆕 構建查詢（支持多租戶過濾）
            import os
            is_electron = os.environ.get('ELECTRON_MODE', 'false').lower() == 'true'
            
            # 🔧 P3-6: 排除已刪除/已封禁的帳號（與配額計數邏輯對齊）
            excluded_status_clause = "AND (status IS NULL OR LOWER(status) NOT IN ('deleted', 'banned', 'removed'))"
            
            if is_electron or not owner_user_id:
                # Electron 模式或無用戶上下文：返回所有帳號
                query = f'SELECT * FROM accounts WHERE 1=1 {excluded_status_clause} ORDER BY id'
                params = ()
            else:
                # SaaS 模式：返回當前用戶的帳號 + 未綁定/歷史帳號（owner_user_id 為空或 local_user，兼容舊數據）
                query = f'''SELECT * FROM accounts
                    WHERE (owner_user_id = ? OR owner_user_id IS NULL OR owner_user_id = '' OR owner_user_id = 'local_user')
                    {excluded_status_clause}
                    ORDER BY id'''
                params = (owner_user_id,)
            
            if not HAS_AIOSQLITE:
                # 同步回退
                conn = sqlite3.connect(str(accounts_db_path))
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute(query, params)
                rows = cursor.fetchall()
                conn.close()
                return [dict(row) for row in rows]
            
            # 異步方式
            async with aiosqlite.connect(str(accounts_db_path)) as conn:
                conn.row_factory = aiosqlite.Row
                cursor = await conn.execute(query, params)
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            print(f"Error getting all accounts: {e}")
            import traceback
            traceback.print_exc()
            return []
    
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
                conn = sqlite3.connect(str(accounts_db_path))
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
                conn = sqlite3.connect(str(accounts_db_path))
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
                conn = sqlite3.connect(str(accounts_db_path))
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
                conn = sqlite3.connect(str(accounts_db_path))
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
            ]
            
            if not HAS_AIOSQLITE:
                conn = sqlite3.connect(str(db_path))
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
    
    # ============ 異步 SQL 執行方法 ============
