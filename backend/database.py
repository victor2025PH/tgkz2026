"""
TG-Matrix Database Operations
Handles all database interactions using aiosqlite
"""
import sys
import aiosqlite
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path
from config import config
from crypto_utils import get_crypto_manager


class Database:
    """Database operations class"""
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or config.DATABASE_URL
        self._connection: Optional[aiosqlite.Connection] = None
    
    async def connect(self):
        """Establish database connection with integrity check"""
        # 如果數據庫文件存在，先檢查完整性
        db_path_obj = Path(self.db_path)
        if db_path_obj.exists():
            try:
                # 嘗試連接並檢查完整性
                test_conn = await aiosqlite.connect(self.db_path, timeout=5.0)
                cursor = await test_conn.execute("PRAGMA integrity_check")
                result = await cursor.fetchone()
                await test_conn.close()
                
                if result and result[0] != 'ok':
                    import sys
                    print(f"[Database] WARNING: Database integrity check failed: {result[0]}", file=sys.stderr)
                    # 不立即失敗，讓調用者決定如何處理
            except Exception as e:
                import sys
                error_str = str(e).lower()
                if "malformed" in error_str or "corrupt" in error_str or "database disk image" in error_str:
                    print(f"[Database] ERROR: Database is corrupted: {e}", file=sys.stderr)
                    raise Exception(f"數據庫已損壞，請使用 rebuild_database.py 重建數據庫")
        
        self._connection = await aiosqlite.connect(
            self.db_path,
            timeout=30.0  # 30秒超時，避免長時間等待
        )
        self._connection.row_factory = aiosqlite.Row
        # 啟用 WAL 模式以支持並發讀寫
        await self._connection.execute("PRAGMA journal_mode = WAL")
        # 設置 busy_timeout 以處理鎖定情況
        await self._connection.execute("PRAGMA busy_timeout = 30000")  # 30秒
        await self._connection.execute("PRAGMA foreign_keys = ON")
        await self._connection.commit()
    
    async def close(self):
        """Close database connection"""
        if self._connection:
            await self._connection.close()
            self._connection = None
    
    async def fetch_all(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Execute a query and return all results as list of dicts"""
        if not self._connection:
            await self.connect()
        try:
            cursor = await self._connection.execute(query, params or ())
            rows = await cursor.fetchall()
            columns = [description[0] for description in cursor.description]
            return [dict(zip(columns, row)) for row in rows]
        except Exception as e:
            if "database is locked" in str(e).lower():
                # 等待並重試一次
                import asyncio
                await asyncio.sleep(0.5)
                cursor = await self._connection.execute(query, params or ())
                rows = await cursor.fetchall()
                columns = [description[0] for description in cursor.description]
                return [dict(zip(columns, row)) for row in rows]
            raise
    
    async def fetch_one(self, query: str, params: tuple = None) -> Optional[Dict[str, Any]]:
        """Execute a query and return one result as dict"""
        if not self._connection:
            await self.connect()
        try:
            cursor = await self._connection.execute(query, params or ())
            row = await cursor.fetchone()
            if row:
                columns = [description[0] for description in cursor.description]
                return dict(zip(columns, row))
            return None
        except Exception as e:
            if "database is locked" in str(e).lower():
                import asyncio
                await asyncio.sleep(0.5)
                cursor = await self._connection.execute(query, params or ())
                row = await cursor.fetchone()
                if row:
                    columns = [description[0] for description in cursor.description]
                    return dict(zip(columns, row))
                return None
            raise
    
    async def execute(self, query: str, params: tuple = None) -> int:
        """Execute a query and return last row id"""
        if not self._connection:
            await self.connect()
        try:
            cursor = await self._connection.execute(query, params or ())
            await self._connection.commit()
            return cursor.lastrowid
        except Exception as e:
            if "database is locked" in str(e).lower():
                import asyncio
                await asyncio.sleep(0.5)
                cursor = await self._connection.execute(query, params or ())
                await self._connection.commit()
                return cursor.lastrowid
            raise
    
    async def execute_many(self, query: str, params_list: List[tuple]):
        """Execute a query with multiple parameter sets"""
        if not self._connection:
            await self.connect()
        try:
            await self._connection.executemany(query, params_list)
            await self._connection.commit()
        except Exception as e:
            if "database is locked" in str(e).lower():
                import asyncio
                await asyncio.sleep(0.5)
                await self._connection.executemany(query, params_list)
                await self._connection.commit()
            else:
                raise
    
    async def initialize(self):
        """Initialize database schema"""
        await self.connect()
        
        # Accounts table
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT NOT NULL UNIQUE,
                api_id TEXT,
                api_hash TEXT,
                proxy TEXT,
                two_factor_password TEXT,
                role TEXT DEFAULT 'Unassigned',
                group_name TEXT,
                status TEXT DEFAULT 'Offline',
                daily_send_count INTEGER DEFAULT 0,
                daily_send_limit INTEGER DEFAULT 50,
                health_score INTEGER DEFAULT 100,
                session_file_path TEXT,
                -- Device fingerprint fields (防封)
                device_model TEXT,
                system_version TEXT,
                app_version TEXT,
                lang_code TEXT DEFAULT 'en',
                platform TEXT DEFAULT 'android',
                device_id TEXT,
                -- Proxy management fields (防封)
                proxy_type TEXT,
                proxy_country TEXT,
                proxy_rotation_enabled INTEGER DEFAULT 0,
                -- Warmup fields (账户预热)
                warmup_enabled INTEGER DEFAULT 0,
                warmup_start_date TIMESTAMP,
                warmup_stage INTEGER DEFAULT 0,
                warmup_days_completed INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Keyword sets table
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS keyword_sets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Keywords table
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS keywords (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                keyword_set_id INTEGER NOT NULL,
                keyword TEXT NOT NULL,
                is_regex INTEGER DEFAULT 0,
                FOREIGN KEY (keyword_set_id) REFERENCES keyword_sets(id) ON DELETE CASCADE,
                UNIQUE(keyword_set_id, keyword, is_regex)
            )
        """)
        
        # Monitored groups table
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS monitored_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Group-keyword set associations
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS group_keyword_sets (
                group_id INTEGER NOT NULL,
                keyword_set_id INTEGER NOT NULL,
                PRIMARY KEY (group_id, keyword_set_id),
                FOREIGN KEY (group_id) REFERENCES monitored_groups(id) ON DELETE CASCADE,
                FOREIGN KEY (keyword_set_id) REFERENCES keyword_sets(id) ON DELETE CASCADE
            )
        """)
        
        # Message templates table
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS message_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                prompt TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create unique indexes to prevent duplicates
        # Note: SQLite doesn't support ALTER TABLE ADD CONSTRAINT, so we use CREATE UNIQUE INDEX IF NOT EXISTS
        try:
            await self._connection.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_monitored_groups_url 
                ON monitored_groups(url)
            """)
        except Exception:
            pass  # Index might already exist or table might have duplicates
        
        try:
            await self._connection.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_message_templates_name 
                ON message_templates(name)
            """)
        except Exception:
            pass  # Index might already exist or table might have duplicates
        
        # Monitoring configuration table (for persistent monitoring state)
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS monitoring_config (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                is_active INTEGER DEFAULT 0,
                last_started_at TIMESTAMP,
                last_stopped_at TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Initialize monitoring config if not exists
        cursor = await self._connection.execute("SELECT COUNT(*) as count FROM monitoring_config")
        result = await cursor.fetchone()
        if result and result['count'] == 0:
            await self._connection.execute("""
                INSERT INTO monitoring_config (id, is_active) VALUES (1, 0)
            """)
            await self._connection.commit()
        
        # Campaigns table
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS campaigns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                is_active INTEGER DEFAULT 0,
                trigger_source_group_ids TEXT,
                trigger_keyword_set_ids TEXT,
                action_template_id INTEGER,
                action_min_delay_seconds INTEGER DEFAULT 30,
                action_max_delay_seconds INTEGER DEFAULT 120,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (action_template_id) REFERENCES message_templates(id)
            )
        """)
        
        # Leads table
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS leads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                source_group TEXT NOT NULL,
                triggered_keyword TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status TEXT DEFAULT 'New',
                online_status TEXT DEFAULT 'Unknown',
                assigned_template_id INTEGER,
                campaign_id INTEGER,
                do_not_contact INTEGER DEFAULT 0,
                FOREIGN KEY (assigned_template_id) REFERENCES message_templates(id),
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
            )
        """)
        
        # Interactions table
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS interactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lead_id INTEGER NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                type TEXT NOT NULL,
                content TEXT NOT NULL,
                FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
            )
        """)
        
        # Logs table
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                message TEXT NOT NULL,
                type TEXT DEFAULT 'info'
            )
        """)
        
        # Do not contact list
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS do_not_contact (
                user_id TEXT PRIMARY KEY,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Settings table
        await self.initialize_settings_table()
        
        # Message queue table
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS message_queue (
                id TEXT PRIMARY KEY,
                phone TEXT NOT NULL,
                user_id TEXT NOT NULL,
                text TEXT NOT NULL,
                attachment TEXT,
                priority TEXT DEFAULT 'NORMAL',
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                scheduled_at TIMESTAMP,
                attempts INTEGER DEFAULT 0,
                max_attempts INTEGER DEFAULT 3,
                last_error TEXT,
                completed_at TIMESTAMP
            )
        """)
        
        # Alerts table
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_type TEXT NOT NULL,
                level TEXT NOT NULL,
                message TEXT NOT NULL,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                acknowledged INTEGER DEFAULT 0,
                acknowledged_at TIMESTAMP,
                resolved INTEGER DEFAULT 0,
                resolved_at TIMESTAMP
            )
        """)
        
        # ==================== AI Auto Chat Tables ====================
        
        # Chat history table (無限上下文)
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                session_id TEXT,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
                content TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                tokens INTEGER DEFAULT 0,
                message_id TEXT,
                account_phone TEXT,
                source_group TEXT,
                is_summarized INTEGER DEFAULT 0
            )
        """)
        
        # User profiles table (用戶畫像 - 擴展版)
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id TEXT PRIMARY KEY,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                preferences TEXT DEFAULT '{}',
                tags TEXT DEFAULT '',
                personality_notes TEXT,
                conversation_stage TEXT DEFAULT 'new',
                funnel_stage TEXT DEFAULT 'new',
                last_interaction DATETIME,
                total_messages INTEGER DEFAULT 0,
                sentiment_score REAL DEFAULT 0.5,
                interest_level INTEGER DEFAULT 1,
                is_vip INTEGER DEFAULT 0,
                source_group TEXT,
                source_keyword TEXT,
                first_contact_at DATETIME,
                last_reply_at DATETIME,
                converted_at DATETIME,
                churned_at DATETIME,
                lifetime_value REAL DEFAULT 0,
                response_rate REAL DEFAULT 0,
                avg_response_time INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 用戶漏斗歷史記錄
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS funnel_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                from_stage TEXT,
                to_stage TEXT NOT NULL,
                reason TEXT,
                auto_triggered INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 遷移：添加 auto_follow_up_enabled 欄位
        try:
            await self._connection.execute("ALTER TABLE user_profiles ADD COLUMN auto_follow_up_enabled INTEGER DEFAULT 1")
        except Exception:
            pass  # 欄位已存在
        
        # AI memories table (長期記憶)
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS ai_memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                memory_type TEXT NOT NULL CHECK(memory_type IN ('fact', 'preference', 'instruction', 'summary')),
                content TEXT NOT NULL,
                importance REAL DEFAULT 0.5,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
                access_count INTEGER DEFAULT 0
            )
        """)
        
        # Conversation states table (對話狀態)
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS conversation_states (
                user_id TEXT PRIMARY KEY,
                current_stage TEXT DEFAULT 'greeting',
                context TEXT DEFAULT '{}',
                pending_action TEXT,
                auto_reply_enabled INTEGER DEFAULT 1,
                last_ai_response DATETIME,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # AI settings table (AI 設置)
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS ai_settings (
                id INTEGER PRIMARY KEY DEFAULT 1,
                auto_chat_enabled INTEGER DEFAULT 0,
                auto_chat_mode TEXT DEFAULT 'semi',
                typing_speed INTEGER DEFAULT 50,
                reply_delay_min INTEGER DEFAULT 2,
                reply_delay_max INTEGER DEFAULT 8,
                system_prompt TEXT DEFAULT '',
                max_context_messages INTEGER DEFAULT 20,
                enable_memory INTEGER DEFAULT 1,
                auto_greeting INTEGER DEFAULT 0,
                greeting_message TEXT DEFAULT '',
                local_ai_endpoint TEXT DEFAULT '',
                local_ai_model TEXT DEFAULT '',
                rag_enabled INTEGER DEFAULT 1,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 遷移：為舊表添加新欄位
        try:
            await self._connection.execute("ALTER TABLE ai_settings ADD COLUMN local_ai_endpoint TEXT DEFAULT ''")
        except Exception:
            pass  # 欄位已存在
        try:
            await self._connection.execute("ALTER TABLE ai_settings ADD COLUMN local_ai_model TEXT DEFAULT ''")
        except Exception:
            pass
        try:
            await self._connection.execute("ALTER TABLE ai_settings ADD COLUMN rag_enabled INTEGER DEFAULT 1")
        except Exception:
            pass
        
        # Initialize AI settings if not exists
        await self._connection.execute("""
            INSERT OR IGNORE INTO ai_settings (id) VALUES (1)
        """)
        
        # Create indexes for chat history
        await self._connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id)
        """)
        await self._connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_chat_history_timestamp ON chat_history(timestamp DESC)
        """)
        await self._connection.execute("""
            CREATE INDEX IF NOT EXISTS idx_ai_memories_user_id ON ai_memories(user_id)
        """)
        
        await self._connection.commit()
        
        # Create additional indexes for better query performance
        # (Called after all tables are created)
        await self._create_indexes()
        
        # Run migrations
        await self._run_migrations()
    
    async def _run_migrations(self):
        """Run database migrations"""
        try:
            from migrations.migration_manager import init_migration_manager, get_migration_manager
            from pathlib import Path
            
            migrations_dir = Path(__file__).parent / "migrations"
            migration_manager = init_migration_manager(self, migrations_dir)
            await migration_manager.initialize()
            
            # Apply pending migrations
            pending = await migration_manager.get_pending_migrations()
            if pending:
                print(f"Found {len(pending)} pending migration(s), applying...", file=sys.stderr)
                success = await migration_manager.migrate()
                if not success:
                    print("Warning: Some migrations may have failed", file=sys.stderr)
            else:
                current_version = await migration_manager.get_current_version()
                print(f"Database is up to date (version {current_version})", file=sys.stderr)
        except Exception as e:
            print(f"Error running migrations: {e}", file=sys.stderr)
            # Don't fail initialization if migrations fail
            # This allows the app to start even if there are migration issues
    
    # ==================== Accounts Operations ====================
    
    async def add_account(self, account_data: Dict[str, Any]) -> int:
        """Add a new account"""
        import aiosqlite
        
        crypto = get_crypto_manager()
        
        # Encrypt sensitive fields
        api_id = crypto.encrypt_field(account_data.get('apiId'))
        api_hash = crypto.encrypt_field(account_data.get('apiHash'))
        two_factor_password = crypto.encrypt_field(account_data.get('twoFactorPassword'))
        
        try:
            cursor = await self._connection.execute("""
                INSERT INTO accounts (phone, api_id, api_hash, proxy, two_factor_password, 
                                     role, group_name, status, daily_send_limit, health_score,
                                     device_model, system_version, app_version, lang_code, platform, device_id,
                                     proxy_type, proxy_country, proxy_rotation_enabled,
                                     warmup_enabled, warmup_start_date, warmup_stage, warmup_days_completed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                account_data.get('phone'),
                api_id,
                api_hash,
                account_data.get('proxy', ''),
                two_factor_password,
                account_data.get('role', 'Unassigned'),
                account_data.get('group', ''),
                account_data.get('status', 'Offline'),
                account_data.get('dailySendLimit', 50),
                account_data.get('healthScore', 100),
                # Device fingerprint fields
                account_data.get('deviceModel'),
                account_data.get('systemVersion'),
                account_data.get('appVersion'),
                account_data.get('langCode', 'en'),
                account_data.get('platform', 'android'),
                account_data.get('deviceId'),
                # Proxy management fields
                account_data.get('proxyType'),
                account_data.get('proxyCountry'),
                account_data.get('proxyRotationEnabled', 0),
                # Warmup fields
                account_data.get('warmupEnabled', 0),
                account_data.get('warmupStartDate'),
                account_data.get('warmupStage', 0),
                account_data.get('warmupDaysCompleted', 0)
            ))
            await self._connection.commit()
            return cursor.lastrowid
        except aiosqlite.IntegrityError as e:
            error_msg = str(e)
            if "UNIQUE constraint failed: accounts.phone" in error_msg or "phone" in error_msg.lower():
                phone = account_data.get('phone', '')
                raise ValueError(f"账户已存在: 电话号码 {phone} 已经在系统中。如需更新账户信息，请使用更新功能。")
            else:
                raise ValueError(f"数据库约束错误: {error_msg}")
    
    async def get_all_accounts(self) -> List[Dict[str, Any]]:
        """Get all accounts"""
        crypto = get_crypto_manager()
        cursor = await self._connection.execute("""
            SELECT id, phone, api_id as apiId, api_hash as apiHash, proxy,
                   role, group_name as "group", status, daily_send_count as dailySendCount,
                   daily_send_limit as dailySendLimit, health_score as healthScore,
                   two_factor_password as twoFactorPassword,
                   device_model as deviceModel, system_version as systemVersion,
                   app_version as appVersion, lang_code as langCode, platform, device_id as deviceId,
                   proxy_type as proxyType, proxy_country as proxyCountry,
                   proxy_rotation_enabled as proxyRotationEnabled,
                   warmup_enabled as warmupEnabled, warmup_start_date as warmupStartDate,
                   warmup_stage as warmupStage, warmup_days_completed as warmupDaysCompleted
            FROM accounts
            ORDER BY id
        """)
        rows = await cursor.fetchall()
        accounts = [dict(row) for row in rows]
        
        # Decrypt sensitive fields
        for account in accounts:
            if account.get('apiId'):
                account['apiId'] = crypto.decrypt_field(account['apiId'])
            if account.get('apiHash'):
                account['apiHash'] = crypto.decrypt_field(account['apiHash'])
            if account.get('twoFactorPassword'):
                account['twoFactorPassword'] = crypto.decrypt_field(account['twoFactorPassword'])
        
        return accounts
    
    async def get_account(self, account_id: int) -> Optional[Dict[str, Any]]:
        """Get account by ID"""
        crypto = get_crypto_manager()
        cursor = await self._connection.execute("""
            SELECT id, phone, api_id as apiId, api_hash as apiHash, proxy,
                   role, group_name as "group", status, daily_send_count as dailySendCount,
                   daily_send_limit as dailySendLimit, health_score as healthScore,
                   two_factor_password as twoFactorPassword, session_file_path as sessionFilePath,
                   device_model as deviceModel, system_version as systemVersion,
                   app_version as appVersion, lang_code as langCode, platform, device_id as deviceId,
                   proxy_type as proxyType, proxy_country as proxyCountry,
                   proxy_rotation_enabled as proxyRotationEnabled,
                   warmup_enabled as warmupEnabled, warmup_start_date as warmupStartDate,
                   warmup_stage as warmupStage, warmup_days_completed as warmupDaysCompleted
            FROM accounts
            WHERE id = ?
        """, (account_id,))
        row = await cursor.fetchone()
        if not row:
            return None
        
        account = dict(row)
        
        # Decrypt sensitive fields
        if account.get('apiId'):
            account['apiId'] = crypto.decrypt_field(account['apiId'])
        if account.get('apiHash'):
            account['apiHash'] = crypto.decrypt_field(account['apiHash'])
        if account.get('twoFactorPassword'):
            account['twoFactorPassword'] = crypto.decrypt_field(account['twoFactorPassword'])
        
        return account
    
    async def get_account_by_phone(self, phone: str) -> Optional[Dict[str, Any]]:
        """Get account by phone number"""
        crypto = get_crypto_manager()
        cursor = await self._connection.execute("""
            SELECT id, phone, api_id as apiId, api_hash as apiHash, proxy,
                   role, group_name as "group", status, daily_send_count as dailySendCount,
                   daily_send_limit as dailySendLimit, health_score as healthScore,
                   two_factor_password as twoFactorPassword, session_file_path as sessionFilePath,
                   device_model as deviceModel, system_version as systemVersion,
                   app_version as appVersion, lang_code as langCode, platform, device_id as deviceId,
                   proxy_type as proxyType, proxy_country as proxyCountry,
                   proxy_rotation_enabled as proxyRotationEnabled,
                   warmup_enabled as warmupEnabled, warmup_start_date as warmupStartDate,
                   warmup_stage as warmupStage, warmup_days_completed as warmupDaysCompleted
            FROM accounts
            WHERE phone = ?
        """, (phone,))
        row = await cursor.fetchone()
        if not row:
            return None
        
        account = dict(row)
        
        # Decrypt sensitive fields
        if account.get('apiId'):
            account['apiId'] = crypto.decrypt_field(account['apiId'])
        if account.get('apiHash'):
            account['apiHash'] = crypto.decrypt_field(account['apiHash'])
        if account.get('twoFactorPassword'):
            account['twoFactorPassword'] = crypto.decrypt_field(account['twoFactorPassword'])
        
        return account
    
    async def update_account(self, account_id: int, updates: Dict[str, Any]):
        """Update account data"""
        set_clauses = []
        values = []
        
        field_mapping = {
            'role': 'role',
            'group': 'group_name',
            'status': 'status',
            'dailySendCount': 'daily_send_count',
            'dailySendLimit': 'daily_send_limit',
            'healthScore': 'health_score',
            'proxy': 'proxy',
            # Device fingerprint fields
            'deviceModel': 'device_model',
            'systemVersion': 'system_version',
            'appVersion': 'app_version',
            'langCode': 'lang_code',
            'platform': 'platform',
            'deviceId': 'device_id',
            # Proxy management fields
            'proxyType': 'proxy_type',
            'proxyCountry': 'proxy_country',
            'proxyRotationEnabled': 'proxy_rotation_enabled',
            # Warmup fields
            'warmupEnabled': 'warmup_enabled',
            'warmupStartDate': 'warmup_start_date',
            'warmupStage': 'warmup_stage',
            'warmupDaysCompleted': 'warmup_days_completed'
        }
        
        for key, value in updates.items():
            if key in field_mapping:
                set_clauses.append(f"{field_mapping[key]} = ?")
                values.append(value)
        
        if set_clauses:
            set_clauses.append("updated_at = CURRENT_TIMESTAMP")
            values.append(account_id)
            
            query = f"UPDATE accounts SET {', '.join(set_clauses)} WHERE id = ?"
            await self._connection.execute(query, values)
            await self._connection.commit()
    
    async def delete_account(self, account_id: int) -> Optional[str]:
        """
        Delete an account and return the phone number for cleanup
        
        Returns:
            Phone number of the deleted account, or None if account not found
        """
        # Get account info before deleting (for cleanup)
        account = await self.get_account(account_id)
        if not account:
            return None
        
        phone = account.get('phone')
        
        # Delete account from database
        await self._connection.execute("DELETE FROM accounts WHERE id = ?", (account_id,))
        
        # Clean up related data
        # 1. Delete queue messages for this account (message_queue uses phone, not account_id)
        try:
            await self._connection.execute("""
                DELETE FROM message_queue 
                WHERE phone = ?
            """, (phone,))
        except Exception as e:
            # Table might not exist, ignore error
            import sys
            print(f"[Database] Warning: Could not delete from message_queue: {e}", file=sys.stderr)
        
        # 2. Delete health metrics for this account (if table exists)
        try:
            await self._connection.execute("""
                DELETE FROM health_metrics 
                WHERE account_id = ?
            """, (account_id,))
        except Exception as e:
            # Table might not exist, ignore error
            import sys
            print(f"[Database] Warning: Could not delete from health_metrics: {e}", file=sys.stderr)
        
        # 3. Delete proxy metrics for this account (if table exists)
        try:
            await self._connection.execute("""
                DELETE FROM proxy_metrics 
                WHERE account_id = ?
            """, (account_id,))
        except Exception as e:
            # Table might not exist, ignore error
            import sys
            print(f"[Database] Warning: Could not delete from proxy_metrics: {e}", file=sys.stderr)
        
        # 4. Delete error recovery events for this account (if table exists)
        try:
            await self._connection.execute("""
                DELETE FROM error_recovery_events 
                WHERE account_id = ?
            """, (account_id,))
        except Exception as e:
            # Table might not exist, ignore error
            import sys
            print(f"[Database] Warning: Could not delete from error_recovery_events: {e}", file=sys.stderr)
        
        await self._connection.commit()
        
        return phone
    
    async def bulk_update_accounts_role(self, account_ids: List[int], role: str):
        """Bulk update accounts role"""
        placeholders = ','.join('?' * len(account_ids))
        await self._connection.execute(f"""
            UPDATE accounts 
            SET role = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id IN ({placeholders})
        """, [role] + account_ids)
        await self._connection.commit()
    
    async def bulk_update_accounts_group(self, account_ids: List[int], group: str):
        """Bulk update accounts group"""
        placeholders = ','.join('?' * len(account_ids))
        await self._connection.execute(f"""
            UPDATE accounts 
            SET group_name = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id IN ({placeholders})
        """, [group] + account_ids)
        await self._connection.commit()
    
    async def bulk_delete_accounts(self, account_ids: List[int]) -> List[str]:
        """
        Bulk delete accounts and return phone numbers for cleanup
        
        Returns:
            List of phone numbers of deleted accounts
        """
        if not account_ids:
            return []
        
        # Get account info before deleting (for cleanup)
        placeholders = ','.join('?' * len(account_ids))
        cursor = await self._connection.execute(f"""
            SELECT phone FROM accounts WHERE id IN ({placeholders})
        """, account_ids)
        rows = await cursor.fetchall()
        phones = [row[0] for row in rows if row[0]]
        
        # Delete accounts from database
        await self._connection.execute(f"DELETE FROM accounts WHERE id IN ({placeholders})", account_ids)
        
        # Clean up related data
        # Get phone numbers for message_queue deletion (it uses phone, not account_id)
        phone_placeholders = ','.join('?' * len(phones)) if phones else ''
        
        # 1. Delete queue messages for these accounts (message_queue uses phone, not account_id)
        if phones and phone_placeholders:
            try:
                await self._connection.execute(f"""
                    DELETE FROM message_queue 
                    WHERE phone IN ({phone_placeholders})
                """, phones)
            except Exception as e:
                # Table might not exist, ignore error
                import sys
                print(f"[Database] Warning: Could not delete from message_queue: {e}", file=sys.stderr)
        
        # 2. Delete health metrics for these accounts (if table exists)
        try:
            await self._connection.execute(f"""
                DELETE FROM health_metrics 
                WHERE account_id IN ({placeholders})
            """, account_ids)
        except Exception as e:
            # Table might not exist, ignore error
            import sys
            print(f"[Database] Warning: Could not delete from health_metrics: {e}", file=sys.stderr)
        
        # 3. Delete proxy metrics for these accounts (if table exists)
        try:
            await self._connection.execute(f"""
                DELETE FROM proxy_metrics 
                WHERE account_id IN ({placeholders})
            """, account_ids)
        except Exception as e:
            # Table might not exist, ignore error
            import sys
            print(f"[Database] Warning: Could not delete from proxy_metrics: {e}", file=sys.stderr)
        
        # 4. Delete error recovery events for these accounts (if table exists)
        try:
            await self._connection.execute(f"""
                DELETE FROM error_recovery_events 
                WHERE account_id IN ({placeholders})
            """, account_ids)
        except Exception as e:
            # Table might not exist, ignore error
            import sys
            print(f"[Database] Warning: Could not delete from error_recovery_events: {e}", file=sys.stderr)
        
        await self._connection.commit()
        
        return phones
    
    # ==================== Keyword Sets Operations ====================
    
    async def add_keyword_set(self, name: str) -> int:
        """Add a new keyword set"""
        try:
            cursor = await self._connection.execute(
                "INSERT INTO keyword_sets (name) VALUES (?)",
                (name,)
            )
            await self._connection.commit()
            return cursor.lastrowid
        except Exception as e:
            # Re-raise with more context
            import sys
            error_str = str(e).lower()
            if "unique" in error_str or "already exists" in error_str:
                raise Exception(f"關鍵詞集 '{name}' 已存在") from e
            elif "no such table" in error_str:
                raise Exception(f"數據庫表 'keyword_sets' 不存在，請檢查數據庫初始化") from e
            elif "database" in error_str and ("locked" in error_str or "corrupt" in error_str or "malformed" in error_str):
                raise Exception(f"數據庫錯誤：{str(e)}") from e
            else:
                raise Exception(f"添加關鍵詞集失敗: {str(e)}") from e
    
    async def get_all_keyword_sets(self) -> List[Dict[str, Any]]:
        """Get all keyword sets with their keywords - optimized to avoid N+1 queries"""
        cursor = await self._connection.execute("SELECT id, name FROM keyword_sets ORDER BY id")
        sets = await cursor.fetchall()
        
        if not sets:
            return []
        
        # Get all keywords in one query
        set_ids = [s['id'] for s in sets]
        placeholders = ','.join('?' * len(set_ids))
        keywords_cursor = await self._connection.execute(f"""
            SELECT keyword_set_id, id, keyword, is_regex as isRegex
            FROM keywords
            WHERE keyword_set_id IN ({placeholders})
            ORDER BY keyword_set_id, id
        """, set_ids)
        keywords = await keywords_cursor.fetchall()
        
        # Build a map of keyword_set_id -> keywords
        keywords_map = {}
        for keyword in keywords:
            set_id = keyword['keyword_set_id']
            if set_id not in keywords_map:
                keywords_map[set_id] = []
            keywords_map[set_id].append({
                'id': keyword['id'],
                'keyword': keyword['keyword'],
                'isRegex': bool(keyword['isRegex'])
            })
        
        # Build result
        result = []
        for keyword_set in sets:
            set_id = keyword_set['id']
            result.append({
                'id': set_id,
                'name': keyword_set['name'],
                'keywords': keywords_map.get(set_id, [])
            })
        
        return result
    
    async def delete_keyword_set(self, set_id: int):
        """Delete a keyword set (cascades to keywords) - idempotent operation"""
        import sys
        try:
            # First check if the keyword set exists
            cursor = await self._connection.execute(
                "SELECT id, name FROM keyword_sets WHERE id = ?", 
                (set_id,)
            )
            row = await cursor.fetchone()
            
            if not row:
                # Already deleted - this is fine (idempotent operation)
                print(f"[Database] Keyword set {set_id} already deleted or not found (idempotent)", file=sys.stderr)
                return  # Don't raise error, just return silently
            
            set_name = row['name'] if row else 'Unknown'
            print(f"[Database] Deleting keyword set {set_id} ({set_name})...", file=sys.stderr)
            
            # Delete keywords first (in case foreign key cascade doesn't work)
            await self._connection.execute("DELETE FROM keywords WHERE keyword_set_id = ?", (set_id,))
            
            # Delete the keyword set
            await self._connection.execute("DELETE FROM keyword_sets WHERE id = ?", (set_id,))
            await self._connection.commit()
            
            print(f"[Database] Keyword set {set_id} ({set_name}) deleted successfully", file=sys.stderr)
            
        except Exception as e:
            import sys
            error_str = str(e).lower()
            if "no such table" in error_str:
                raise Exception(f"數據庫表 'keyword_sets' 不存在，請重建數據庫") from e
            elif "database" in error_str and ("locked" in error_str or "corrupt" in error_str or "malformed" in error_str):
                raise Exception(f"數據庫錯誤：{str(e)}") from e
            else:
                raise Exception(f"刪除關鍵詞集失敗: {str(e)}") from e
    
    async def get_keywords_by_set(self, set_id: int) -> List[Dict[str, Any]]:
        """Get all keywords for a keyword set"""
        cursor = await self._connection.execute("""
            SELECT id, keyword, is_regex as isRegex
            FROM keywords
            WHERE keyword_set_id = ?
            ORDER BY id
        """, (set_id,))
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    
    async def add_keyword(self, set_id: int, keyword: str, is_regex: bool) -> int:
        """Add a keyword to a set (checks for duplicates, uses INSERT OR IGNORE for safety)"""
        # 檢查關鍵詞是否已存在
        cursor = await self._connection.execute("""
            SELECT id FROM keywords 
            WHERE keyword_set_id = ? AND keyword = ? AND is_regex = ?
        """, (set_id, keyword, 1 if is_regex else 0))
        existing = await cursor.fetchone()
        
        if existing:
            # 關鍵詞已存在，返回現有 ID
            return existing['id']
        
        # 使用 INSERT OR IGNORE 防止重複插入（即使檢查通過，也可能因為並發導致重複）
        try:
            cursor = await self._connection.execute("""
                INSERT OR IGNORE INTO keywords (keyword_set_id, keyword, is_regex)
                VALUES (?, ?, ?)
            """, (set_id, keyword, 1 if is_regex else 0))
            await self._connection.commit()
            
            # 如果插入成功，返回新 ID
            if cursor.lastrowid:
                return cursor.lastrowid
            
            # 如果因為 UNIQUE 約束被忽略，再次查詢現有 ID
            cursor = await self._connection.execute("""
                SELECT id FROM keywords 
                WHERE keyword_set_id = ? AND keyword = ? AND is_regex = ?
            """, (set_id, keyword, 1 if is_regex else 0))
            existing = await cursor.fetchone()
            if existing:
                return existing['id']
            
            # 如果仍然找不到，這是一個錯誤
            raise ValueError(f"Failed to add keyword: {keyword} to set {set_id}")
        except Exception as e:
            await self._connection.rollback()
            # 如果因為 UNIQUE 約束失敗，再次查詢現有 ID
            cursor = await self._connection.execute("""
                SELECT id FROM keywords 
                WHERE keyword_set_id = ? AND keyword = ? AND is_regex = ?
            """, (set_id, keyword, 1 if is_regex else 0))
            existing = await cursor.fetchone()
            if existing:
                return existing['id']
            raise
    
    async def remove_keyword(self, keyword_id: int):
        """Remove a keyword"""
        await self._connection.execute("DELETE FROM keywords WHERE id = ?", (keyword_id,))
        await self._connection.commit()
    
    # ==================== Monitored Groups Operations ====================
    
    async def get_group_by_url(self, url: str) -> Optional[Dict[str, Any]]:
        """Get a monitored group by URL"""
        cursor = await self._connection.execute("""
            SELECT id, url, name FROM monitored_groups WHERE url = ?
        """, (url,))
        row = await cursor.fetchone()
        if row:
            return dict(row)
        return None
    
    async def add_group(self, url: str, name: str, keyword_set_ids: List[int]) -> int:
        """Add a monitored group (or update if exists)"""
        # Check if group already exists
        existing = await self.get_group_by_url(url)
        
        if existing:
            # Update existing group's keyword set associations
            group_id = existing['id']
            
            # Delete existing associations
            await self._connection.execute("""
                DELETE FROM group_keyword_sets WHERE group_id = ?
            """, (group_id,))
            
            # Add new associations
            for keyword_set_id in keyword_set_ids:
                await self._connection.execute("""
                    INSERT OR IGNORE INTO group_keyword_sets (group_id, keyword_set_id)
                    VALUES (?, ?)
                """, (group_id, keyword_set_id))
            
            # Update name if provided
            if name and name != existing.get('name'):
                await self._connection.execute("""
                    UPDATE monitored_groups SET name = ? WHERE id = ?
                """, (name, group_id))
            
            await self._connection.commit()
            return group_id
        else:
            # Create new group
            cursor = await self._connection.execute("""
                INSERT INTO monitored_groups (url, name) VALUES (?, ?)
            """, (url, name))
            group_id = cursor.lastrowid
            
            # Add keyword set associations
            for keyword_set_id in keyword_set_ids:
                await self._connection.execute("""
                    INSERT INTO group_keyword_sets (group_id, keyword_set_id)
                    VALUES (?, ?)
                """, (group_id, keyword_set_id))
            
            await self._connection.commit()
            return group_id
    
    async def get_all_groups(self) -> List[Dict[str, Any]]:
        """Get all monitored groups with their keyword set IDs - optimized to avoid N+1 queries"""
        # Get all groups
        cursor = await self._connection.execute("""
            SELECT id, url, name FROM monitored_groups ORDER BY id
        """)
        groups = await cursor.fetchall()
        
        if not groups:
            return []
        
        # Get all keyword set associations in one query
        group_ids = [group['id'] for group in groups]
        placeholders = ','.join('?' * len(group_ids))
        sets_cursor = await self._connection.execute(f"""
            SELECT group_id, keyword_set_id FROM group_keyword_sets 
            WHERE group_id IN ({placeholders})
        """, group_ids)
        associations = await sets_cursor.fetchall()
        
        # Build a map of group_id -> keyword_set_ids
        keyword_sets_map = {}
        for assoc in associations:
            group_id = assoc['group_id']
            if group_id not in keyword_sets_map:
                keyword_sets_map[group_id] = []
            keyword_sets_map[group_id].append(assoc['keyword_set_id'])
        
        # Build result
        result = []
        for group in groups:
            group_id = group['id']
            result.append({
                'id': group_id,
                'url': group['url'],
                'name': group['name'],
                'keywordSetIds': keyword_sets_map.get(group_id, [])
            })
        
        return result
    
    async def get_all_monitored_groups(self) -> List[Dict[str, Any]]:
        """Get all monitored groups (alias for get_all_groups for backward compatibility)"""
        return await self.get_all_groups()
    
    async def delete_group(self, group_id: int):
        """Delete a monitored group"""
        await self._connection.execute("DELETE FROM monitored_groups WHERE id = ?", (group_id,))
        await self._connection.commit()
    
    # ==================== Message Templates Operations ====================
    
    async def get_template_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get a message template by name"""
        cursor = await self._connection.execute("""
            SELECT id, name, prompt, is_active as isActive 
            FROM message_templates WHERE name = ?
        """, (name,))
        row = await cursor.fetchone()
        if row:
            return dict(row)
        return None
    
    async def add_template(self, name: str, prompt: str) -> int:
        """Add a message template (returns existing ID if name already exists)"""
        # Check if template with same name already exists
        existing = await self.get_template_by_name(name)
        
        if existing:
            # Return existing template ID (don't create duplicate)
            return existing['id']
        
        # Create new template
        cursor = await self._connection.execute("""
            INSERT INTO message_templates (name, prompt) VALUES (?, ?)
        """, (name, prompt))
        await self._connection.commit()
        return cursor.lastrowid
    
    async def get_all_templates(self) -> List[Dict[str, Any]]:
        """Get all message templates"""
        cursor = await self._connection.execute("""
            SELECT id, name, prompt, is_active as isActive
            FROM message_templates
            ORDER BY id
        """)
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    
    async def toggle_template_status(self, template_id: int):
        """Toggle template active status"""
        await self._connection.execute("""
            UPDATE message_templates 
            SET is_active = NOT is_active 
            WHERE id = ?
        """, (template_id,))
        await self._connection.commit()
    
    async def delete_template(self, template_id: int):
        """Delete a template"""
        await self._connection.execute("DELETE FROM message_templates WHERE id = ?", (template_id,))
        await self._connection.commit()
    
    # ==================== Campaigns Operations ====================
    
    async def add_campaign(self, campaign_data: Dict[str, Any]) -> int:
        """Add a new campaign (checks for duplicates by name)"""
        name = campaign_data.get('name', '').strip()
        if not name:
            raise ValueError("Campaign name is required")
        
        # 檢查活動名稱是否已存在
        cursor = await self._connection.execute("""
            SELECT id FROM campaigns WHERE name = ?
        """, (name,))
        existing = await cursor.fetchone()
        
        if existing:
            # 活動已存在，返回現有 ID
            return existing['id']
        
        trigger = campaign_data.get('trigger', {})
        action = campaign_data.get('action', {})
        
        # 使用 INSERT OR IGNORE 防止並發重複插入
        try:
            cursor = await self._connection.execute("""
                INSERT OR IGNORE INTO campaigns (name, is_active, trigger_source_group_ids,
                                      trigger_keyword_set_ids, action_template_id,
                                      action_min_delay_seconds, action_max_delay_seconds)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                name,
                1 if campaign_data.get('isActive', False) else 0,
                json.dumps(trigger.get('sourceGroupIds', [])),
                json.dumps(trigger.get('keywordSetIds', [])),
                action.get('templateId'),
                action.get('minDelaySeconds', 30),
                action.get('maxDelaySeconds', 120)
            ))
            await self._connection.commit()
            
            # 如果插入成功，返回新 ID
            if cursor.lastrowid:
                return cursor.lastrowid
            
            # 如果因為 UNIQUE 約束被忽略，再次查詢現有 ID
            cursor = await self._connection.execute("""
                SELECT id FROM campaigns WHERE name = ?
            """, (name,))
            existing = await cursor.fetchone()
            if existing:
                return existing['id']
            
            # 如果仍然找不到，這是一個錯誤
            raise ValueError(f"Failed to add campaign: {name}")
        except Exception as e:
            await self._connection.rollback()
            # 如果因為 UNIQUE 約束失敗，再次查詢現有 ID
            cursor = await self._connection.execute("""
                SELECT id FROM campaigns WHERE name = ?
            """, (name,))
            existing = await cursor.fetchone()
            if existing:
                return existing['id']
            raise
    
    async def get_all_campaigns(self) -> List[Dict[str, Any]]:
        """Get all campaigns"""
        cursor = await self._connection.execute("""
            SELECT id, name, is_active, trigger_source_group_ids,
                   trigger_keyword_set_ids, action_template_id,
                   action_min_delay_seconds, action_max_delay_seconds
            FROM campaigns
            ORDER BY id
        """)
        rows = await cursor.fetchall()
        
        result = []
        for row in rows:
            result.append({
                'id': row['id'],
                'name': row['name'],
                'isActive': bool(row['is_active']),
                'trigger': {
                    'sourceGroupIds': json.loads(row['trigger_source_group_ids'] or '[]'),
                    'keywordSetIds': json.loads(row['trigger_keyword_set_ids'] or '[]')
                },
                'actions': [{
                    'type': 'sendMessage',
                    'templateId': row['action_template_id'],
                    'minDelaySeconds': row['action_min_delay_seconds'],
                    'maxDelaySeconds': row['action_max_delay_seconds']
                }]
            })
        
        return result
    
    async def toggle_campaign_status(self, campaign_id: int):
        """Toggle campaign active status"""
        await self._connection.execute("""
            UPDATE campaigns 
            SET is_active = NOT is_active 
            WHERE id = ?
        """, (campaign_id,))
        await self._connection.commit()
    
    async def delete_campaign(self, campaign_id: int):
        """Delete a campaign"""
        await self._connection.execute("DELETE FROM campaigns WHERE id = ?", (campaign_id,))
        await self._connection.commit()
    
    # ==================== Leads Operations ====================
    
    async def add_lead(self, lead_data: Dict[str, Any]) -> int:
        """Add a new lead"""
        cursor = await self._connection.execute("""
            INSERT INTO leads (user_id, username, first_name, last_name,
                             source_group, triggered_keyword, status,
                             online_status, assigned_template_id, campaign_id,
                             do_not_contact)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            lead_data.get('userId'),
            lead_data.get('username'),
            lead_data.get('firstName'),
            lead_data.get('lastName'),
            lead_data.get('sourceGroup'),
            lead_data.get('triggeredKeyword'),
            lead_data.get('status', 'New'),
            lead_data.get('onlineStatus', 'Unknown'),
            lead_data.get('assignedTemplateId'),
            lead_data.get('campaignId'),
            1 if lead_data.get('doNotContact', False) else 0
        ))
        lead_id = cursor.lastrowid
        
        # Add initial interaction
        await self.add_interaction(lead_id, 'Captured', 
                                  f"Lead captured from {lead_data.get('sourceGroup')}")
        
        await self._connection.commit()
        return lead_id
    
    async def get_all_leads(self) -> List[Dict[str, Any]]:
        """Get all leads with their interaction history"""
        cursor = await self._connection.execute("""
            SELECT id, user_id as userId, username, first_name as firstName,
                   last_name as lastName, source_group as sourceGroup,
                   triggered_keyword as triggeredKeyword, timestamp, status,
                   online_status as onlineStatus, assigned_template_id as assignedTemplateId,
                   campaign_id as campaignId,
                   CASE WHEN do_not_contact = 1 THEN 1 ELSE 0 END as doNotContact
            FROM leads
            ORDER BY timestamp DESC
        """)
        leads = await cursor.fetchall()
        
        result = []
        if not leads:
            return []
        
        # Get all interactions in one query to avoid N+1 problem
        lead_ids = [lead['id'] for lead in leads]
        placeholders = ','.join('?' * len(lead_ids))
        interactions_cursor = await self._connection.execute(f"""
            SELECT lead_id, id, timestamp, type, content
            FROM interactions
            WHERE lead_id IN ({placeholders})
            ORDER BY lead_id, timestamp DESC
        """, lead_ids)
        interactions = await interactions_cursor.fetchall()
        
        # Build a map of lead_id -> interactions
        interactions_map = {}
        for interaction in interactions:
            lead_id = interaction['lead_id']
            if lead_id not in interactions_map:
                interactions_map[lead_id] = []
            interactions_map[lead_id].append({
                'id': interaction['id'],
                'timestamp': interaction['timestamp'],
                'type': interaction['type'],
                'content': interaction['content']
            })
        
        # Build result
        result = []
        for lead in leads:
            lead_id = lead['id']
            result.append({
                **dict(lead),
                'interactionHistory': interactions_map.get(lead_id, [])
            })
        
        return result
    
    async def get_lead(self, lead_id: int) -> Optional[Dict[str, Any]]:
        """Get a lead by ID"""
        cursor = await self._connection.execute("""
            SELECT id, user_id as userId, username, first_name as firstName,
                   last_name as lastName, source_group as sourceGroup,
                   triggered_keyword as triggeredKeyword, timestamp, status,
                   online_status as onlineStatus, assigned_template_id as assignedTemplateId,
                   campaign_id as campaignId,
                   CASE WHEN do_not_contact = 1 THEN 1 ELSE 0 END as doNotContact
            FROM leads
            WHERE id = ?
        """, (lead_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None
    
    async def get_lead_by_user_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a lead by user ID"""
        cursor = await self._connection.execute("""
            SELECT id, user_id as userId, username, first_name as firstName,
                   last_name as lastName, source_group as sourceGroup,
                   triggered_keyword as triggeredKeyword, timestamp, status,
                   online_status as onlineStatus, assigned_template_id as assignedTemplateId,
                   campaign_id as campaignId,
                   CASE WHEN do_not_contact = 1 THEN 1 ELSE 0 END as doNotContact
            FROM leads
            WHERE user_id = ?
            ORDER BY timestamp DESC
            LIMIT 1
        """, (user_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None
    
    async def update_lead_status(self, lead_id: int, new_status: str):
        """Update lead status"""
        await self._connection.execute("""
            UPDATE leads SET status = ? WHERE id = ?
        """, (new_status, lead_id))
        await self._connection.commit()
    
    async def update_lead(self, lead_id: int, updates: Dict[str, Any]):
        """Update lead data"""
        set_clauses = []
        values = []
        
        field_mapping = {
            'status': 'status',
            'campaignId': 'campaign_id',
            'assignedTemplateId': 'assigned_template_id',
            'onlineStatus': 'online_status'
        }
        
        for key, value in updates.items():
            if key in field_mapping:
                set_clauses.append(f"{field_mapping[key]} = ?")
                values.append(value)
        
        if set_clauses:
            values.append(lead_id)
            await self._connection.execute(f"""
                UPDATE leads 
                SET {', '.join(set_clauses)}
                WHERE id = ?
            """, values)
            await self._connection.commit()
    
    async def add_interaction(self, lead_id: int, interaction_type: str, content: str) -> int:
        """Add an interaction to a lead"""
        cursor = await self._connection.execute("""
            INSERT INTO interactions (lead_id, type, content)
            VALUES (?, ?, ?)
        """, (lead_id, interaction_type, content))
        await self._connection.commit()
        return cursor.lastrowid
    
    async def add_to_dnc(self, user_id: str):
        """Add user to do not contact list"""
        try:
            await self._connection.execute("""
                INSERT INTO do_not_contact (user_id) VALUES (?)
            """, (user_id,))
            # Also update existing leads
            await self._connection.execute("""
                UPDATE leads SET do_not_contact = 1 WHERE user_id = ?
            """, (user_id,))
            await self._connection.commit()
        except aiosqlite.IntegrityError:
            # Already in DNC list
            pass
    
    async def is_dnc(self, user_id: str) -> bool:
        """Check if user is in DNC list"""
        cursor = await self._connection.execute("""
            SELECT 1 FROM do_not_contact WHERE user_id = ?
        """, (user_id,))
        return await cursor.fetchone() is not None
    
    async def check_lead_and_dnc(self, user_id: str) -> tuple[Optional[Dict[str, Any]], bool]:
        """
        Batch check: Get lead by user_id and check DNC status in one query
        
        Returns:
            (lead_dict or None, is_dnc: bool)
        """
        # Use a single query with LEFT JOIN to get both lead and DNC status
        cursor = await self._connection.execute("""
            SELECT 
                l.id, l.user_id as userId, l.username, l.first_name as firstName,
                l.last_name as lastName, l.source_group as sourceGroup,
                l.triggered_keyword as triggeredKeyword, l.timestamp, l.status,
                l.online_status as onlineStatus, l.assigned_template_id as assignedTemplateId,
                l.campaign_id as campaignId,
                CASE WHEN l.do_not_contact = 1 THEN 1 ELSE 0 END as doNotContact,
                CASE WHEN dnc.user_id IS NOT NULL THEN 1 ELSE 0 END as isDNC
            FROM leads l
            LEFT JOIN do_not_contact dnc ON l.user_id = dnc.user_id
            WHERE l.user_id = ?
            ORDER BY l.timestamp DESC
            LIMIT 1
        """, (user_id,))
        row = await cursor.fetchone()
        
        if row:
            lead_dict = dict(row)
            is_dnc = bool(lead_dict.pop('isDNC', False))
            return lead_dict, is_dnc
        
        # If no lead found, check DNC separately
        is_dnc = await self.is_dnc(user_id)
        return None, is_dnc
    
    # ==================== Logs Operations ====================
    
    async def add_log(self, message: str, log_type: str = 'info') -> int:
        """Add a log entry"""
        if self._connection is None:
            # Database is closed, just print to stderr
            import sys
            print(f"[Database] (closed) {log_type}: {message}", file=sys.stderr)
            return 0
        cursor = await self._connection.execute("""
            INSERT INTO logs (message, type) VALUES (?, ?)
        """, (message, log_type))
        await self._connection.commit()
        return cursor.lastrowid
    
    async def get_recent_logs(
        self,
        limit: int = 100,
        log_type: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        search_query: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get recent log entries with filtering and search
        
        Args:
            limit: Maximum number of logs to return
            log_type: Filter by log type (info, success, warning, error)
            start_date: Start date (ISO format)
            end_date: End date (ISO format)
            search_query: Search query for message content
        """
        query = "SELECT id, timestamp, message, type FROM logs WHERE 1=1"
        params = []
        
        # Filter by type
        if log_type:
            query += " AND type = ?"
            params.append(log_type)
        
        # Filter by date range
        if start_date:
            query += " AND timestamp >= ?"
            params.append(start_date)
        
        if end_date:
            query += " AND timestamp <= ?"
            params.append(end_date)
        
        # Search in message
        if search_query:
            query += " AND message LIKE ?"
            params.append(f"%{search_query}%")
        
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        cursor = await self._connection.execute(query, params)
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    
    async def get_logs_count(
        self,
        log_type: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        search_query: Optional[str] = None
    ) -> int:
        """Get total count of logs matching filters"""
        query = "SELECT COUNT(*) as count FROM logs WHERE 1=1"
        params = []
        
        if log_type:
            query += " AND type = ?"
            params.append(log_type)
        
        if start_date:
            query += " AND timestamp >= ?"
            params.append(start_date)
        
        if end_date:
            query += " AND timestamp <= ?"
            params.append(end_date)
        
        if search_query:
            query += " AND message LIKE ?"
            params.append(f"%{search_query}%")
        
        cursor = await self._connection.execute(query, params)
        row = await cursor.fetchone()
        return row['count'] if row else 0
    
    async def clear_logs(self):
        """Clear all logs"""
        await self._connection.execute("DELETE FROM logs")
        await self._connection.commit()
    
    # ==================== Message Queue Operations ====================
    
    async def save_queue_message(
        self,
        message_id: str,
        phone: str,
        user_id: str,
        text: str,
        attachment: Optional[str],
        priority: str,
        status: str,
        scheduled_at: Optional[datetime],
        attempts: int,
        max_attempts: int,
        last_error: Optional[str] = None
    ):
        """Save or update a queue message"""
        await self._connection.execute("""
            INSERT OR REPLACE INTO message_queue 
            (id, phone, user_id, text, attachment, priority, status, 
             scheduled_at, attempts, max_attempts, last_error, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 
                    COALESCE((SELECT created_at FROM message_queue WHERE id = ?), CURRENT_TIMESTAMP))
        """, (
            message_id, phone, user_id, text, attachment, priority, status,
            scheduled_at.isoformat() if scheduled_at else None,
            attempts, max_attempts, last_error, message_id
        ))
        await self._connection.commit()
    
    async def update_queue_message_status(
        self,
        message_id: str,
        status: Optional[str] = None,
        last_error: Optional[str] = None,
        priority: Optional[str] = None
    ):
        """Update queue message status"""
        updates = []
        params = []
        
        if status is not None:
            updates.append("status = ?")
            params.append(status)
            updates.append("completed_at = CASE WHEN ? = 'completed' OR ? = 'failed' THEN CURRENT_TIMESTAMP ELSE completed_at END")
            params.extend([status, status])
        
        if last_error is not None:
            updates.append("last_error = ?")
            params.append(last_error)
        
        if priority is not None:
            updates.append("priority = ?")
            params.append(priority)
        
        if updates:
            params.append(message_id)
            await self._connection.execute(f"""
                UPDATE message_queue
                SET {', '.join(updates)}
                WHERE id = ?
            """, params)
            await self._connection.commit()
    
    async def increment_queue_message_attempts(self, message_id: str):
        """Increment message attempt count"""
        await self._connection.execute("""
            UPDATE message_queue
            SET attempts = attempts + 1
            WHERE id = ?
        """, (message_id,))
        await self._connection.commit()
    
    async def batch_update_queue_message_status(
        self,
        updates: List[Dict[str, Any]]
    ):
        """
        Batch update multiple queue message statuses for better performance
        
        Args:
            updates: List of dicts with keys: message_id, status (optional), 
                    last_error (optional), priority (optional)
        """
        if not updates:
            return
        
        # Process updates in a transaction
        for update in updates:
            message_id = update['message_id']
            set_clauses = []
            params = []
            
            if 'status' in update and update['status'] is not None:
                status = update['status']
                set_clauses.append("status = ?")
                params.append(status)
                set_clauses.append("completed_at = CASE WHEN ? = 'completed' OR ? = 'failed' THEN CURRENT_TIMESTAMP ELSE completed_at END")
                params.extend([status, status])
            
            if 'last_error' in update and update['last_error'] is not None:
                set_clauses.append("last_error = ?")
                params.append(update['last_error'])
            
            if 'priority' in update and update['priority'] is not None:
                set_clauses.append("priority = ?")
                params.append(update['priority'])
            
            if set_clauses:
                params.append(message_id)
                await self._connection.execute(f"""
                    UPDATE message_queue
                    SET {', '.join(set_clauses)}
                    WHERE id = ?
                """, params)
        
        await self._connection.commit()
    
    async def get_pending_queue_messages(self) -> List[Dict[str, Any]]:
        """Get all pending and retrying queue messages"""
        cursor = await self._connection.execute("""
            SELECT id, phone, user_id, text, attachment, priority, status,
                   created_at, scheduled_at, attempts, max_attempts, last_error
            FROM message_queue
            WHERE status IN ('pending', 'retrying')
            ORDER BY 
                CASE priority
                    WHEN 'HIGH' THEN 1
                    WHEN 'NORMAL' THEN 2
                    WHEN 'LOW' THEN 3
                END,
                created_at ASC
        """)
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    
    async def get_queue_messages_by_phone(self, phone: str) -> List[Dict[str, Any]]:
        """Get queue messages for a specific phone"""
        cursor = await self._connection.execute("""
            SELECT id, phone, user_id, text, attachment, priority, status,
                   created_at, scheduled_at, attempts, max_attempts, last_error
            FROM message_queue
            WHERE phone = ?
            ORDER BY 
                CASE priority
                    WHEN 'HIGH' THEN 1
                    WHEN 'NORMAL' THEN 2
                    WHEN 'LOW' THEN 3
                END,
                created_at ASC
        """, (phone,))
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    
    async def delete_queue_message(self, message_id: str):
        """Delete a queue message"""
        await self._connection.execute("""
            DELETE FROM message_queue WHERE id = ?
        """, (message_id,))
        await self._connection.commit()
    
    async def cleanup_old_queue_messages(self, days: int = 7):
        """Clean up old completed/failed messages"""
        await self._connection.execute("""
            DELETE FROM message_queue
            WHERE status IN ('completed', 'failed')
            AND completed_at < datetime('now', '-' || ? || ' days')
        """, (days,))
        await self._connection.commit()
    
    # ==================== Analytics & Statistics ====================
    
    async def get_message_sending_stats(self, days: int = 7, phone: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get message sending statistics grouped by day"""
        phone_filter = "AND phone = ?" if phone else ""
        params = [days] + ([phone] if phone else [])
        
        cursor = await self._connection.execute(f"""
            SELECT 
                DATE(completed_at) as date,
                COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                AVG(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) * 100 as success_rate
            FROM message_queue
            WHERE completed_at >= datetime('now', '-' || ? || ' days')
            AND completed_at IS NOT NULL
            {phone_filter}
            GROUP BY DATE(completed_at)
            ORDER BY date ASC
        """, params)
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    
    async def get_queue_length_history(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get queue length history (approximate based on created_at)"""
        cursor = await self._connection.execute("""
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as queue_length
            FROM message_queue
            WHERE created_at >= datetime('now', '-' || ? || ' days')
            AND status IN ('pending', 'processing', 'retrying')
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        """, (days,))
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    
    async def get_account_sending_comparison(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get sending statistics by account"""
        cursor = await self._connection.execute("""
            SELECT 
                phone,
                COUNT(*) as total_sent,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                AVG(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) * 100 as success_rate
            FROM message_queue
            WHERE completed_at >= datetime('now', '-' || ? || ' days')
            AND completed_at IS NOT NULL
            GROUP BY phone
            ORDER BY total_sent DESC
        """, (days,))
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    
    async def get_campaign_performance_stats(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get campaign performance statistics"""
        cursor = await self._connection.execute("""
            SELECT 
                c.id as campaign_id,
                c.name as campaign_name,
                COUNT(DISTINCT l.id) as leads_captured,
                COUNT(DISTINCT CASE WHEN l.status != 'New' THEN l.id END) as leads_contacted,
                COUNT(DISTINCT CASE WHEN l.status IN ('Replied', 'Follow-up', 'Closed-Won', 'Closed-Lost') THEN l.id END) as leads_replied,
                COUNT(DISTINCT CASE WHEN mq.status = 'completed' THEN mq.id END) as messages_sent,
                COUNT(DISTINCT CASE WHEN mq.status = 'failed' THEN mq.id END) as messages_failed
            FROM campaigns c
            LEFT JOIN leads l ON l.campaign_id = c.id AND l.timestamp >= datetime('now', '-' || ? || ' days')
            LEFT JOIN message_queue mq ON mq.user_id = l.user_id AND mq.completed_at >= datetime('now', '-' || ? || ' days')
            GROUP BY c.id, c.name
            ORDER BY leads_captured DESC
        """, (days, days))
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    
    # ==================== Alerts Operations ====================
    
    async def add_alert(self, alert_type: str, level: str, message: str, details: Optional[Dict[str, Any]] = None) -> int:
        """Add a new alert"""
        import json
        details_json = json.dumps(details) if details else None
        
        cursor = await self._connection.execute("""
            INSERT INTO alerts (alert_type, level, message, details)
            VALUES (?, ?, ?, ?)
        """, (alert_type, level, message, details_json))
        await self._connection.commit()
        return cursor.lastrowid
    
    async def acknowledge_alert(self, alert_id: int):
        """Acknowledge an alert"""
        await self._connection.execute("""
            UPDATE alerts
            SET acknowledged = 1, acknowledged_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (alert_id,))
        await self._connection.commit()
    
    async def resolve_alert(self, alert_id: int):
        """Resolve an alert"""
        await self._connection.execute("""
            UPDATE alerts
            SET resolved = 1, resolved_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (alert_id,))
        await self._connection.commit()
    
    async def get_recent_alerts(self, limit: int = 50, level: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get recent alerts"""
        import json
        
        if level:
            cursor = await self._connection.execute("""
                SELECT id, alert_type, level, message, details, timestamp,
                       acknowledged, acknowledged_at, resolved, resolved_at
                FROM alerts
                WHERE level = ?
                ORDER BY timestamp DESC
                LIMIT ?
            """, (level, limit))
        else:
            cursor = await self._connection.execute("""
                SELECT id, alert_type, level, message, details, timestamp,
                       acknowledged, acknowledged_at, resolved, resolved_at
                FROM alerts
                ORDER BY timestamp DESC
                LIMIT ?
            """, (limit,))
        
        rows = await cursor.fetchall()
        result = []
        for row in rows:
            alert_dict = dict(row)
            # Parse details JSON
            if alert_dict.get('details'):
                try:
                    alert_dict['details'] = json.loads(alert_dict['details'])
                except:
                    alert_dict['details'] = {}
            result.append(alert_dict)
        
        return result
    
    async def get_unresolved_alerts(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get unresolved alerts"""
        import json
        
        cursor = await self._connection.execute("""
            SELECT id, alert_type, level, message, details, timestamp,
                   acknowledged, acknowledged_at, resolved, resolved_at
            FROM alerts
            WHERE resolved = 0
            ORDER BY timestamp DESC
            LIMIT ?
        """, (limit,))
        
        rows = await cursor.fetchall()
        result = []
        for row in rows:
            alert_dict = dict(row)
            if alert_dict.get('details'):
                try:
                    alert_dict['details'] = json.loads(alert_dict['details'])
                except:
                    alert_dict['details'] = {}
            result.append(alert_dict)
        
        return result
    
    # ==================== Settings Operations ====================
    
    async def initialize_settings_table(self):
        """Initialize settings table"""
        await self._connection.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await self._connection.commit()
    
    async def get_setting(self, key: str, default: Any = None) -> Any:
        """Get a setting value"""
    # ==================== Monitoring Config Operations ====================
    
    async def get_monitoring_config(self) -> Dict[str, Any]:
        """Get monitoring configuration"""
        cursor = await self._connection.execute("""
            SELECT is_active, last_started_at, last_stopped_at 
            FROM monitoring_config WHERE id = 1
        """)
        row = await cursor.fetchone()
        if row:
            return {
                'isActive': bool(row['is_active']),
                'lastStartedAt': row['last_started_at'],
                'lastStoppedAt': row['last_stopped_at']
            }
        return {'isActive': False, 'lastStartedAt': None, 'lastStoppedAt': None}
    
    async def set_monitoring_active(self, is_active: bool):
        """Set monitoring active status"""
        from datetime import datetime
        now = datetime.now().isoformat()
        
        if is_active:
            await self._connection.execute("""
                UPDATE monitoring_config 
                SET is_active = 1, last_started_at = ?, updated_at = ?
                WHERE id = 1
            """, (now, now))
        else:
            await self._connection.execute("""
                UPDATE monitoring_config 
                SET is_active = 0, last_stopped_at = ?, updated_at = ?
                WHERE id = 1
            """, (now, now))
        
        await self._connection.commit()
    
    # ==================== Settings Operations ====================
    
    async def get_setting(self, key: str) -> Optional[str]:
        """Get a setting value"""
        cursor = await self._connection.execute("""
            SELECT value FROM settings WHERE key = ?
        """, (key,))
        row = await cursor.fetchone()
        if row:
            try:
                return json.loads(row['value'])
            except:
                return row['value']
        return default
    
    async def set_setting(self, key: str, value: Any):
        """Set a setting value"""
        value_str = json.dumps(value) if not isinstance(value, str) else value
        await self._connection.execute("""
            INSERT OR REPLACE INTO settings (key, value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        """, (key, value_str))
        await self._connection.commit()
    
    async def get_all_settings(self) -> Dict[str, Any]:
        """Get all settings"""
        cursor = await self._connection.execute("SELECT key, value FROM settings")
        rows = await cursor.fetchall()
        result = {}
        for row in rows:
            try:
                result[row['key']] = json.loads(row['value'])
            except:
                result[row['key']] = row['value']
        return result
    
    async def _create_indexes(self):
        """Create database indexes for better query performance"""
        indexes = [
            # Accounts indexes
            "CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status)",
            "CREATE INDEX IF NOT EXISTS idx_accounts_role ON accounts(role)",
            "CREATE INDEX IF NOT EXISTS idx_accounts_group_name ON accounts(group_name)",
            
            # Keywords indexes
            "CREATE INDEX IF NOT EXISTS idx_keywords_keyword_set_id ON keywords(keyword_set_id)",
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_keywords_unique ON keywords(keyword_set_id, keyword, is_regex)",
            
            # Groups indexes
            "CREATE INDEX IF NOT EXISTS idx_groups_keyword_set_id ON group_keyword_sets(keyword_set_id)",
            "CREATE INDEX IF NOT EXISTS idx_groups_group_id ON group_keyword_sets(group_id)",
            
            # Campaigns indexes
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_name ON campaigns(name)",
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_name ON campaigns(name)",
            "CREATE INDEX IF NOT EXISTS idx_campaigns_is_active ON campaigns(is_active)",
            "CREATE INDEX IF NOT EXISTS idx_campaigns_action_template_id ON campaigns(action_template_id)",
            
            # Leads indexes - 優化常見查詢模式
            "CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)",
            "CREATE INDEX IF NOT EXISTS idx_leads_timestamp ON leads(timestamp)",
            "CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_leads_status_timestamp ON leads(status, timestamp DESC)",  # 複合索引：按狀態和時間排序
            "CREATE INDEX IF NOT EXISTS idx_leads_user_status ON leads(user_id, status)",  # 複合索引：按用戶和狀態查詢
            "CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id)",
            
            # Message queue indexes - 優化隊列查詢
            "CREATE INDEX IF NOT EXISTS idx_message_queue_phone ON message_queue(phone)",
            "CREATE INDEX IF NOT EXISTS idx_message_queue_status ON message_queue(status)",
            "CREATE INDEX IF NOT EXISTS idx_message_queue_created_at ON message_queue(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_message_queue_phone_status ON message_queue(phone, status)",
            "CREATE INDEX IF NOT EXISTS idx_message_queue_scheduled_at ON message_queue(scheduled_at)",
            "CREATE INDEX IF NOT EXISTS idx_message_queue_status_priority ON message_queue(status, priority DESC, scheduled_at)",  # 複合索引：按狀態、優先級和時間排序
            "CREATE INDEX IF NOT EXISTS idx_message_queue_phone_status_scheduled ON message_queue(phone, status, scheduled_at)",  # 複合索引：按帳號、狀態和時間查詢
            
            # Chat history indexes - 優化聊天記錄查詢（已在上面創建，這裡添加複合索引）
            "CREATE INDEX IF NOT EXISTS idx_chat_history_user_time ON chat_history(user_id, timestamp DESC)",  # 複合索引：按用戶和時間排序（最重要）
            "CREATE INDEX IF NOT EXISTS idx_chat_history_account ON chat_history(account_phone, timestamp DESC)",  # 複合索引：按帳號和時間查詢
            "CREATE INDEX IF NOT EXISTS idx_chat_history_role ON chat_history(role, timestamp DESC)",  # 按角色和時間查詢
            
            # Interactions indexes - 優化互動歷史查詢
            "CREATE INDEX IF NOT EXISTS idx_interactions_lead_id ON interactions(lead_id)",
            "CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp)",
            "CREATE INDEX IF NOT EXISTS idx_interactions_lead_time ON interactions(lead_id, timestamp DESC)",  # 複合索引：按 Lead 和時間排序
            
            # User profiles indexes - 優化用戶資料查詢
            "CREATE INDEX IF NOT EXISTS idx_user_profiles_funnel ON user_profiles(funnel_stage, updated_at DESC)",  # 複合索引：按漏斗階段和更新時間
            "CREATE INDEX IF NOT EXISTS idx_user_profiles_updated ON user_profiles(updated_at DESC)",
            
            # Follow-up tasks indexes (only if table exists - created by migration 0004)
            # These will be created by migration 0004, so we skip them here to avoid errors
            # "CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_user_id ON follow_up_tasks(user_id)",
            # "CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_scheduled_at ON follow_up_tasks(scheduled_at)",
            # "CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_status ON follow_up_tasks(status)",
            # "CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_status_scheduled ON follow_up_tasks(status, scheduled_at)",
            
            # Vector memories indexes (only if table exists - created by migration 0004)
            # "CREATE INDEX IF NOT EXISTS idx_vector_memories_user_time ON vector_memories(user_id, timestamp DESC)",
            
            # Conversation summaries indexes (only if table exists - created by migration 0004)
            # "CREATE INDEX IF NOT EXISTS idx_conversation_summaries_updated_at ON conversation_summaries(updated_at DESC)",
            
            # Logs indexes
            "CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)",
            "CREATE INDEX IF NOT EXISTS idx_logs_type ON logs(type)",
            "CREATE INDEX IF NOT EXISTS idx_logs_type_timestamp ON logs(type, timestamp DESC)",  # 複合索引：按類型和時間查詢
            
            # Alerts indexes
            "CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp)",
            "CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved)",
            "CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged)",
            "CREATE INDEX IF NOT EXISTS idx_alerts_level ON alerts(level)",
            "CREATE INDEX IF NOT EXISTS idx_alerts_alert_type ON alerts(alert_type)",
            "CREATE INDEX IF NOT EXISTS idx_alerts_resolved_acknowledged ON alerts(resolved, acknowledged)",  # 複合索引：查詢未處理告警
            "CREATE INDEX IF NOT EXISTS idx_alerts_type_timestamp ON alerts(alert_type, timestamp DESC)",  # 複合索引：按類型和時間查詢
            
            # Accounts 複合索引
            "CREATE INDEX IF NOT EXISTS idx_accounts_role_status ON accounts(role, status)",  # 複合索引：按角色和狀態查詢
        ]
        
        for index_sql in indexes:
            try:
                await self._connection.execute(index_sql)
            except Exception as e:
                # Log but don't fail if index creation fails (might already exist)
                print(f"[Database] Warning: Failed to create index: {e}", file=sys.stderr)
        
        await self._connection.commit()

    # ==================== AI Chat History Operations ====================
    
    async def add_chat_message(self, user_id: str, role: str, content: str, 
                                session_id: str = None, account_phone: str = None,
                                source_group: str = None, message_id: str = None) -> int:
        """Add a message to chat history"""
        cursor = await self._connection.execute("""
            INSERT INTO chat_history (user_id, session_id, role, content, account_phone, source_group, message_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (user_id, session_id, role, content, account_phone, source_group, message_id))
        await self._connection.commit()
        
        # Update user profile stats
        await self._connection.execute("""
            INSERT INTO user_profiles (user_id, total_messages, last_interaction)
            VALUES (?, 1, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET 
                total_messages = total_messages + 1,
                last_interaction = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
        """, (user_id,))
        await self._connection.commit()
        
        return cursor.lastrowid
    
    async def get_chat_history(self, user_id: str, limit: int = 20, 
                                include_summarized: bool = False) -> List[Dict[str, Any]]:
        """Get chat history for a user with limit"""
        query = """
            SELECT id, role, content, timestamp, session_id
            FROM chat_history 
            WHERE user_id = ?
        """
        if not include_summarized:
            query += " AND is_summarized = 0"
        query += " ORDER BY timestamp DESC LIMIT ?"
        
        cursor = await self._connection.execute(query, (user_id, limit))
        rows = await cursor.fetchall()
        
        # Return in chronological order (oldest first)
        return [dict(row) for row in reversed(rows)]
    
    async def get_full_chat_history(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all chat history for a user"""
        cursor = await self._connection.execute("""
            SELECT id, role, content, timestamp, session_id, is_summarized, account_phone, message_id
            FROM chat_history 
            WHERE user_id = ?
            ORDER BY timestamp ASC
        """, (user_id,))
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    
    async def get_chat_history_paginated(
        self, 
        user_id: str, 
        limit: int = 50, 
        offset: int = 0,
        before_timestamp: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        分頁獲取聊天記錄（優化性能）
        
        Args:
            user_id: 用戶ID
            limit: 每頁記錄數
            offset: 偏移量
            before_timestamp: 只獲取此時間之前的記錄（用於無限滾動）
            
        Returns:
            聊天記錄列表（按時間倒序）
        """
        query = """
            SELECT id, role, content, timestamp, session_id, account_phone, message_id
            FROM chat_history
            WHERE user_id = ?
        """
        params = [user_id]
        
        if before_timestamp:
            query += " AND timestamp < ?"
            params.append(before_timestamp)
        
        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        cursor = await self._connection.execute(query, params)
        rows = await cursor.fetchall()
        
        # 返回時間正序（最舊的在前）
        return [dict(row) for row in reversed(rows)]
    
    async def mark_messages_summarized(self, message_ids: List[int]):
        """Mark messages as summarized"""
        if not message_ids:
            return
        placeholders = ','.join('?' * len(message_ids))
        await self._connection.execute(f"""
            UPDATE chat_history SET is_summarized = 1 WHERE id IN ({placeholders})
        """, message_ids)
        await self._connection.commit()
    
    async def get_chat_stats(self, user_id: str) -> Dict[str, Any]:
        """Get chat statistics for a user"""
        cursor = await self._connection.execute("""
            SELECT 
                COUNT(*) as total_messages,
                SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user_messages,
                SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistant_messages,
                MIN(timestamp) as first_message,
                MAX(timestamp) as last_message
            FROM chat_history WHERE user_id = ?
        """, (user_id,))
        row = await cursor.fetchone()
        return dict(row) if row else {}

    # ==================== User Profile Operations ====================
    
    async def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile"""
        cursor = await self._connection.execute("""
            SELECT * FROM user_profiles WHERE user_id = ?
        """, (user_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None
    
    async def update_user_profile(self, user_id: str, data: Dict[str, Any]) -> bool:
        """Update user profile"""
        # Build update query dynamically
        allowed_fields = ['username', 'first_name', 'last_name', 'preferences', 'tags', 
                         'personality_notes', 'conversation_stage', 'sentiment_score', 'is_vip']
        
        updates = []
        values = []
        for field in allowed_fields:
            if field in data:
                updates.append(f"{field} = ?")
                values.append(data[field] if field != 'preferences' else json.dumps(data[field]))
        
        if not updates:
            return False
        
        updates.append("updated_at = CURRENT_TIMESTAMP")
        values.append(user_id)
        
        await self._connection.execute(f"""
            INSERT INTO user_profiles (user_id, {', '.join(allowed_fields[:len(updates)-1])})
            VALUES (?, {', '.join(['?' for _ in range(len(updates)-1)])})
            ON CONFLICT(user_id) DO UPDATE SET {', '.join(updates)}
        """.replace("INSERT INTO user_profiles (user_id, )", "INSERT INTO user_profiles (user_id)"), 
        [user_id] + values[:-1] + values)
        await self._connection.commit()
        return True
    
    async def set_conversation_stage(self, user_id: str, stage: str):
        """Set conversation stage for a user"""
        # 獲取當前階段
        cursor = await self._connection.execute(
            "SELECT funnel_stage FROM user_profiles WHERE user_id = ?", (user_id,))
        row = await cursor.fetchone()
        old_stage = row['funnel_stage'] if row else None
        
        # 更新階段
        await self._connection.execute("""
            INSERT INTO user_profiles (user_id, conversation_stage, funnel_stage)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET 
                conversation_stage = ?,
                funnel_stage = ?,
                updated_at = CURRENT_TIMESTAMP
        """, (user_id, stage, stage, stage, stage))
        
        # 記錄漏斗變更歷史
        if old_stage != stage:
            await self._connection.execute("""
                INSERT INTO funnel_history (user_id, from_stage, to_stage, auto_triggered)
                VALUES (?, ?, ?, 1)
            """, (user_id, old_stage, stage))
        
        # 特殊階段時間記錄
        if stage == 'converted':
            await self._connection.execute("""
                UPDATE user_profiles SET converted_at = CURRENT_TIMESTAMP WHERE user_id = ?
            """, (user_id,))
        elif stage == 'churned':
            await self._connection.execute("""
                UPDATE user_profiles SET churned_at = CURRENT_TIMESTAMP WHERE user_id = ?
            """, (user_id,))
        elif stage == 'replied':
            await self._connection.execute("""
                UPDATE user_profiles SET last_reply_at = CURRENT_TIMESTAMP WHERE user_id = ?
            """, (user_id,))
        
        await self._connection.commit()
    
    async def update_funnel_stage(self, user_id: str, stage: str, reason: str = None):
        """更新漏斗階段並記錄原因"""
        await self.set_conversation_stage(user_id, stage)
        if reason:
            # SQLite 不支持 UPDATE ... ORDER BY，使用子查詢
            try:
                await self._connection.execute("""
                    UPDATE funnel_history SET reason = ? 
                    WHERE rowid = (
                        SELECT rowid FROM funnel_history 
                        WHERE user_id = ? AND to_stage = ? 
                        ORDER BY created_at DESC LIMIT 1
                    )
                """, (reason, user_id, stage))
                await self._connection.commit()
            except Exception:
                pass  # 忽略更新失敗
    
    async def get_funnel_history(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """獲取用戶漏斗歷史"""
        cursor = await self._connection.execute("""
            SELECT * FROM funnel_history 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        """, (user_id, limit))
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    
    async def get_funnel_stats(self) -> Dict[str, Any]:
        """獲取漏斗統計"""
        cursor = await self._connection.execute("""
            SELECT funnel_stage, COUNT(*) as count 
            FROM user_profiles 
            GROUP BY funnel_stage
        """)
        rows = await cursor.fetchall()
        return {row['funnel_stage'] or 'new': row['count'] for row in rows}
    
    async def update_user_interest(self, user_id: str, interest_level: int):
        """更新用戶興趣程度"""
        await self._connection.execute("""
            UPDATE user_profiles SET 
                interest_level = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        """, (interest_level, user_id))
        await self._connection.commit()
    
    async def get_users_with_profiles(
        self, 
        stage: str = None,
        tags: str = None,
        interest_min: int = None,
        interest_max: int = None,
        search: str = None,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        獲取用戶列表（含畫像），支持篩選
        
        Args:
            stage: 漏斗階段篩選
            tags: 標籤篩選（逗號分隔）
            interest_min: 最小興趣度
            interest_max: 最大興趣度
            search: 搜索關鍵詞（用戶名、名字）
            limit: 每頁數量
            offset: 偏移量
        
        Returns:
            Dict with users list and total count
        """
        query = """
            SELECT 
                up.user_id,
                up.username,
                up.first_name,
                up.last_name,
                up.tags,
                up.funnel_stage,
                up.interest_level,
                up.sentiment_score,
                up.total_messages,
                up.is_vip,
                up.source_group,
                up.source_keyword,
                up.last_interaction,
                up.created_at,
                up.updated_at,
                l.id as lead_id,
                l.status as lead_status
            FROM user_profiles up
            LEFT JOIN leads l ON up.user_id = l.user_id
            WHERE 1=1
        """
        count_query = "SELECT COUNT(DISTINCT up.user_id) as total FROM user_profiles up WHERE 1=1"
        params = []
        count_params = []
        
        # 篩選條件
        if stage:
            query += " AND up.funnel_stage = ?"
            count_query += " AND up.funnel_stage = ?"
            params.append(stage)
            count_params.append(stage)
        
        if tags:
            # 支持多標籤篩選（任意一個匹配）
            tag_list = [t.strip() for t in tags.split(',') if t.strip()]
            if tag_list:
                tag_conditions = " OR ".join(["up.tags LIKE ?" for _ in tag_list])
                query += f" AND ({tag_conditions})"
                count_query += f" AND ({tag_conditions})"
                for tag in tag_list:
                    params.append(f"%{tag}%")
                    count_params.append(f"%{tag}%")
        
        if interest_min is not None:
            query += " AND up.interest_level >= ?"
            count_query += " AND up.interest_level >= ?"
            params.append(interest_min)
            count_params.append(interest_min)
        
        if interest_max is not None:
            query += " AND up.interest_level <= ?"
            count_query += " AND up.interest_level <= ?"
            params.append(interest_max)
            count_params.append(interest_max)
        
        if search:
            query += " AND (up.username LIKE ? OR up.first_name LIKE ? OR up.last_name LIKE ?)"
            count_query += " AND (up.username LIKE ? OR up.first_name LIKE ? OR up.last_name LIKE ?)"
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])
            count_params.extend([search_param, search_param, search_param])
        
        # 排序和分頁
        query += " ORDER BY up.updated_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        # 執行查詢
        cursor = await self._connection.execute(query, params)
        rows = await cursor.fetchall()
        
        count_cursor = await self._connection.execute(count_query, count_params)
        count_row = await count_cursor.fetchone()
        total = count_row['total'] if count_row else 0
        
        return {
            'users': [dict(row) for row in rows],
            'total': total,
            'limit': limit,
            'offset': offset
        }
    
    async def get_detailed_funnel_stats(self) -> Dict[str, Any]:
        """獲取詳細漏斗統計"""
        # 階段統計
        stage_cursor = await self._connection.execute("""
            SELECT 
                funnel_stage,
                COUNT(*) as count,
                AVG(interest_level) as avg_interest,
                AVG(sentiment_score) as avg_sentiment
            FROM user_profiles 
            GROUP BY funnel_stage
        """)
        stage_rows = await stage_cursor.fetchall()
        
        # 標籤統計
        tag_cursor = await self._connection.execute("""
            SELECT tags FROM user_profiles WHERE tags IS NOT NULL AND tags != ''
        """)
        tag_rows = await tag_cursor.fetchall()
        
        # 計算標籤頻率
        tag_counts = {}
        for row in tag_rows:
            tags = row['tags'].split(',')
            for tag in tags:
                tag = tag.strip()
                if tag:
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1
        
        # 興趣度分佈
        interest_cursor = await self._connection.execute("""
            SELECT 
                interest_level,
                COUNT(*) as count
            FROM user_profiles 
            GROUP BY interest_level
            ORDER BY interest_level
        """)
        interest_rows = await interest_cursor.fetchall()
        
        # 今日新增
        today_cursor = await self._connection.execute("""
            SELECT COUNT(*) as count FROM user_profiles 
            WHERE DATE(created_at) = DATE('now')
        """)
        today_row = await today_cursor.fetchone()
        
        # 本週轉化
        converted_cursor = await self._connection.execute("""
            SELECT COUNT(*) as count FROM user_profiles 
            WHERE funnel_stage = 'converted' 
            AND DATE(updated_at) >= DATE('now', '-7 days')
        """)
        converted_row = await converted_cursor.fetchone()
        
        return {
            'stages': {row['funnel_stage'] or 'new': {
                'count': row['count'],
                'avg_interest': round(row['avg_interest'] or 0, 2),
                'avg_sentiment': round(row['avg_sentiment'] or 0.5, 2)
            } for row in stage_rows},
            'tags': sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:20],
            'interest_distribution': {row['interest_level']: row['count'] for row in interest_rows},
            'today_new': today_row['count'] if today_row else 0,
            'week_converted': converted_row['count'] if converted_row else 0
        }
    
    async def bulk_update_user_tags(self, user_ids: List[str], tags: str, action: str = 'add'):
        """
        批量更新用戶標籤
        
        Args:
            user_ids: 用戶 ID 列表
            tags: 要添加/移除的標籤
            action: 'add' 添加 / 'remove' 移除 / 'set' 設置
        """
        for user_id in user_ids:
            profile = await self.get_user_profile(user_id)
            if not profile:
                continue
            
            current_tags = set(profile.get('tags', '').split(',')) if profile.get('tags') else set()
            current_tags.discard('')
            
            new_tags = set(tags.split(',')) if tags else set()
            new_tags.discard('')
            
            if action == 'add':
                current_tags.update(new_tags)
            elif action == 'remove':
                current_tags -= new_tags
            elif action == 'set':
                current_tags = new_tags
            
            await self._connection.execute("""
                UPDATE user_profiles SET tags = ?, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            """, (','.join(current_tags), user_id))
        
        await self._connection.commit()
    
    async def bulk_update_user_stage(self, user_ids: List[str], stage: str):
        """批量更新用戶漏斗階段"""
        placeholders = ','.join('?' * len(user_ids))
        await self._connection.execute(f"""
            UPDATE user_profiles SET funnel_stage = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id IN ({placeholders})
        """, [stage] + user_ids)
        await self._connection.commit()

    # ==================== AI Memory Operations ====================
    
    async def add_ai_memory(self, user_id: str, memory_type: str, content: str, 
                            importance: float = 0.5) -> int:
        """Add an AI memory for a user"""
        cursor = await self._connection.execute("""
            INSERT INTO ai_memories (user_id, memory_type, content, importance)
            VALUES (?, ?, ?, ?)
        """, (user_id, memory_type, content, importance))
        await self._connection.commit()
        return cursor.lastrowid
    
    async def get_ai_memories(self, user_id: str, memory_type: str = None, 
                               limit: int = 10) -> List[Dict[str, Any]]:
        """Get AI memories for a user"""
        query = "SELECT * FROM ai_memories WHERE user_id = ?"
        params = [user_id]
        
        if memory_type:
            query += " AND memory_type = ?"
            params.append(memory_type)
        
        query += " ORDER BY importance DESC, last_accessed DESC LIMIT ?"
        params.append(limit)
        
        cursor = await self._connection.execute(query, params)
        rows = await cursor.fetchall()
        
        # Update access count and time
        if rows:
            memory_ids = [row['id'] for row in rows]
            placeholders = ','.join('?' * len(memory_ids))
            await self._connection.execute(f"""
                UPDATE ai_memories SET 
                    access_count = access_count + 1,
                    last_accessed = CURRENT_TIMESTAMP
                WHERE id IN ({placeholders})
            """, memory_ids)
            await self._connection.commit()
        
        return [dict(row) for row in rows]
    
    async def delete_ai_memory(self, memory_id: int):
        """Delete an AI memory"""
        await self._connection.execute("DELETE FROM ai_memories WHERE id = ?", (memory_id,))
        await self._connection.commit()

    # ==================== Conversation State Operations ====================
    
    async def get_conversation_state(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get conversation state for a user"""
        cursor = await self._connection.execute("""
            SELECT * FROM conversation_states WHERE user_id = ?
        """, (user_id,))
        row = await cursor.fetchone()
        if row:
            result = dict(row)
            result['context'] = json.loads(result['context']) if result['context'] else {}
            return result
        return None
    
    async def update_conversation_state(self, user_id: str, stage: str = None, 
                                         context: Dict = None, pending_action: str = None,
                                         auto_reply_enabled: bool = None):
        """Update conversation state"""
        # First ensure record exists
        await self._connection.execute("""
            INSERT OR IGNORE INTO conversation_states (user_id) VALUES (?)
        """, (user_id,))
        
        updates = ["updated_at = CURRENT_TIMESTAMP"]
        values = []
        
        if stage is not None:
            updates.append("current_stage = ?")
            values.append(stage)
        if context is not None:
            updates.append("context = ?")
            values.append(json.dumps(context))
        if pending_action is not None:
            updates.append("pending_action = ?")
            values.append(pending_action)
        if auto_reply_enabled is not None:
            updates.append("auto_reply_enabled = ?")
            values.append(1 if auto_reply_enabled else 0)
        
        values.append(user_id)
        await self._connection.execute(f"""
            UPDATE conversation_states SET {', '.join(updates)} WHERE user_id = ?
        """, values)
        await self._connection.commit()

    # ==================== AI Settings Operations ====================
    
    async def get_ai_settings(self) -> Dict[str, Any]:
        """Get AI auto chat settings"""
        cursor = await self._connection.execute("SELECT * FROM ai_settings WHERE id = 1")
        row = await cursor.fetchone()
        return dict(row) if row else {}
    
    async def update_ai_settings(self, settings: Dict[str, Any]):
        """Update AI auto chat settings"""
        allowed_fields = ['auto_chat_enabled', 'auto_chat_mode', 'typing_speed',
                         'reply_delay_min', 'reply_delay_max', 'system_prompt',
                         'max_context_messages', 'enable_memory', 'auto_greeting',
                         'greeting_message', 'local_ai_endpoint', 'local_ai_model',
                         'rag_enabled']
        
        updates = ["updated_at = CURRENT_TIMESTAMP"]
        values = []
        
        for field in allowed_fields:
            if field in settings:
                updates.append(f"{field} = ?")
                values.append(settings[field])
        
        if len(updates) > 1:  # More than just updated_at
            await self._connection.execute(f"""
                UPDATE ai_settings SET {', '.join(updates)} WHERE id = 1
            """, values)
            await self._connection.commit()


# Global database instance
db = Database()

