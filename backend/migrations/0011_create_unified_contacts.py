"""
Migration 0011: 創建統一聯繫人表
整合 captured_leads, user_profiles, collected_users, tracked_users 數據
"""

import sys
import json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from migrations.migration_base import Migration


class Migration0011_CreateUnifiedContacts(Migration):
    """創建統一聯繫人表並遷移數據"""
    
    def __init__(self):
        super().__init__(
            version=11,
            description="創建 unified_contacts 表並從多個來源遷移數據"
        )
    
    async def up(self, db) -> None:
        """Apply migration (upgrade)"""
        print(f"[Migration 0011] Creating unified_contacts table...", file=sys.stderr)
        
        # 創建統一聯繫人表
        await db._connection.execute('''
            CREATE TABLE IF NOT EXISTS unified_contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id TEXT UNIQUE NOT NULL,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                phone TEXT,
                bio TEXT,
                
                -- 狀態和階段
                status TEXT DEFAULT 'new',
                funnel_stage TEXT DEFAULT 'awareness',
                value_level TEXT DEFAULT 'low',
                
                -- 來源信息
                source TEXT DEFAULT 'keyword_match',
                source_group_id TEXT,
                source_group_title TEXT,
                matched_keywords TEXT DEFAULT '[]',
                
                -- 互動統計
                interactions_count INTEGER DEFAULT 0,
                messages_sent INTEGER DEFAULT 0,
                messages_received INTEGER DEFAULT 0,
                last_interaction_at TEXT,
                
                -- 風險評估
                ad_risk_score REAL DEFAULT 0,
                is_ad_account INTEGER,
                is_blacklisted INTEGER DEFAULT 0,
                risk_factors TEXT DEFAULT '{}',
                
                -- 帳號特徵
                has_photo INTEGER DEFAULT 0,
                is_premium INTEGER DEFAULT 0,
                is_verified INTEGER DEFAULT 0,
                is_bot INTEGER DEFAULT 0,
                account_age_days INTEGER,
                
                -- 興趣和評分
                interest_level INTEGER DEFAULT 1,
                lead_score INTEGER DEFAULT 0,
                quality_score INTEGER DEFAULT 0,
                
                -- 標籤和備註
                tags TEXT DEFAULT '[]',
                notes TEXT DEFAULT '',
                custom_fields TEXT DEFAULT '{}',
                
                -- 分配信息
                assigned_account_phone TEXT,
                assigned_at TEXT,
                
                -- 時間戳（移除 NOT NULL 約束，避免同步失敗）
                captured_at TEXT DEFAULT CURRENT_TIMESTAMP,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        print(f"[Migration 0011] Created unified_contacts table", file=sys.stderr)
        
        # 創建索引
        await db._connection.execute("CREATE INDEX IF NOT EXISTS idx_uc_telegram_id ON unified_contacts(telegram_id)")
        await db._connection.execute("CREATE INDEX IF NOT EXISTS idx_uc_status ON unified_contacts(status)")
        await db._connection.execute("CREATE INDEX IF NOT EXISTS idx_uc_funnel_stage ON unified_contacts(funnel_stage)")
        await db._connection.execute("CREATE INDEX IF NOT EXISTS idx_uc_value_level ON unified_contacts(value_level)")
        await db._connection.execute("CREATE INDEX IF NOT EXISTS idx_uc_captured_at ON unified_contacts(captured_at)")
        await db._connection.execute("CREATE INDEX IF NOT EXISTS idx_uc_is_blacklisted ON unified_contacts(is_blacklisted)")
        await db._connection.execute("CREATE INDEX IF NOT EXISTS idx_uc_source ON unified_contacts(source)")
        print(f"[Migration 0011] Created indexes", file=sys.stderr)
        
        await db._connection.commit()
        
        # 🔧 P0: 遷移現有數據（使用 try-except 確保單個遷移失敗不會阻止整體完成）
        migration_errors = []
        
        try:
            await self._migrate_captured_leads(db)
        except Exception as e:
            migration_errors.append(f"captured_leads: {e}")
            print(f"[Migration 0011] Warning: captured_leads migration failed: {e}", file=sys.stderr)
        
        try:
            await self._migrate_collected_users(db)
        except Exception as e:
            migration_errors.append(f"collected_users: {e}")
            print(f"[Migration 0011] Warning: collected_users migration failed: {e}", file=sys.stderr)
        
        try:
            await self._migrate_tracked_users(db)
        except Exception as e:
            migration_errors.append(f"tracked_users: {e}")
            print(f"[Migration 0011] Warning: tracked_users migration failed: {e}", file=sys.stderr)
        
        try:
            await self._migrate_user_profiles(db)
        except Exception as e:
            migration_errors.append(f"user_profiles: {e}")
            print(f"[Migration 0011] Warning: user_profiles migration failed: {e}", file=sys.stderr)
        
        if migration_errors:
            print(f"[Migration 0011] Completed with {len(migration_errors)} warnings", file=sys.stderr)
        else:
            print(f"[Migration 0011] Migration completed successfully", file=sys.stderr)
    
    async def _migrate_captured_leads(self, db):
        """從 captured_leads 遷移數據"""
        try:
            # 檢查表是否存在
            cursor = await db._connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='captured_leads'"
            )
            if not await cursor.fetchone():
                print(f"[Migration 0011] captured_leads table not found, skipping", file=sys.stderr)
                return
            
            # 獲取所有 leads
            cursor = await db._connection.execute(
                "SELECT * FROM captured_leads"
            )
            leads = await cursor.fetchall()
            
            if not leads:
                print(f"[Migration 0011] No leads to migrate", file=sys.stderr)
                return
            
            # 獲取列名
            columns = [description[0] for description in cursor.description]
            
            migrated = 0
            for lead in leads:
                lead_dict = dict(zip(columns, lead))
                
                telegram_id = str(lead_dict.get('user_id', ''))
                if not telegram_id:
                    continue
                
                # 檢查是否已存在
                check = await db._connection.execute(
                    "SELECT id FROM unified_contacts WHERE telegram_id = ?",
                    (telegram_id,)
                )
                if await check.fetchone():
                    continue
                
                now = lead_dict.get('captured_at') or lead_dict.get('created_at') or '2024-01-01T00:00:00'
                
                await db._connection.execute('''
                    INSERT INTO unified_contacts (
                        telegram_id, username, first_name, last_name,
                        status, source, source_group_id, matched_keywords,
                        interactions_count, last_interaction_at, notes,
                        captured_at, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    telegram_id,
                    lead_dict.get('username'),
                    lead_dict.get('first_name'),
                    lead_dict.get('last_name'),
                    lead_dict.get('status', 'new'),
                    lead_dict.get('source', 'keyword_match'),
                    lead_dict.get('source_group_id'),
                    json.dumps([lead_dict.get('matched_keyword')]) if lead_dict.get('matched_keyword') else '[]',
                    lead_dict.get('interactions', 0),
                    lead_dict.get('last_interaction_at'),
                    lead_dict.get('notes', ''),
                    now, now, now
                ))
                migrated += 1
            
            await db._connection.commit()
            print(f"[Migration 0011] Migrated {migrated} leads from captured_leads", file=sys.stderr)
            
        except Exception as e:
            print(f"[Migration 0011] Error migrating captured_leads: {e}", file=sys.stderr)
    
    async def _migrate_collected_users(self, db):
        """從 collected_users 遷移數據"""
        try:
            cursor = await db._connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='collected_users'"
            )
            if not await cursor.fetchone():
                print(f"[Migration 0011] collected_users table not found, skipping", file=sys.stderr)
                return
            
            cursor = await db._connection.execute("SELECT * FROM collected_users")
            users = await cursor.fetchall()
            
            if not users:
                print(f"[Migration 0011] No collected_users to migrate", file=sys.stderr)
                return
            
            columns = [description[0] for description in cursor.description]
            
            updated = 0
            inserted = 0
            for user in users:
                user_dict = dict(zip(columns, user))
                
                telegram_id = str(user_dict.get('telegram_id', ''))
                if not telegram_id:
                    continue
                
                # 檢查是否已存在
                check = await db._connection.execute(
                    "SELECT id FROM unified_contacts WHERE telegram_id = ?",
                    (telegram_id,)
                )
                existing = await check.fetchone()
                
                if existing:
                    # 更新風險信息
                    await db._connection.execute('''
                        UPDATE unified_contacts SET
                            ad_risk_score = ?,
                            risk_factors = ?,
                            is_ad_account = ?,
                            is_blacklisted = ?,
                            has_photo = ?,
                            is_premium = ?,
                            is_verified = ?,
                            is_bot = ?,
                            account_age_days = ?,
                            bio = ?
                        WHERE telegram_id = ?
                    ''', (
                        user_dict.get('ad_risk_score', 0),
                        user_dict.get('risk_factors', '{}'),
                        user_dict.get('is_ad_account'),
                        user_dict.get('is_blacklisted', 0),
                        user_dict.get('has_photo', 0),
                        user_dict.get('is_premium', 0),
                        user_dict.get('is_verified', 0),
                        user_dict.get('is_bot', 0),
                        user_dict.get('account_age_days'),
                        user_dict.get('bio'),
                        telegram_id
                    ))
                    updated += 1
                else:
                    now = user_dict.get('first_seen_at') or user_dict.get('created_at') or '2024-01-01T00:00:00'
                    
                    await db._connection.execute('''
                        INSERT INTO unified_contacts (
                            telegram_id, username, first_name, last_name, phone, bio,
                            source, ad_risk_score, risk_factors, is_ad_account, is_blacklisted,
                            has_photo, is_premium, is_verified, is_bot, account_age_days,
                            captured_at, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        telegram_id,
                        user_dict.get('username'),
                        user_dict.get('first_name'),
                        user_dict.get('last_name'),
                        user_dict.get('phone'),
                        user_dict.get('bio'),
                        'group_member',
                        user_dict.get('ad_risk_score', 0),
                        user_dict.get('risk_factors', '{}'),
                        user_dict.get('is_ad_account'),
                        user_dict.get('is_blacklisted', 0),
                        user_dict.get('has_photo', 0),
                        user_dict.get('is_premium', 0),
                        user_dict.get('is_verified', 0),
                        user_dict.get('is_bot', 0),
                        user_dict.get('account_age_days'),
                        now, now, now
                    ))
                    inserted += 1
            
            await db._connection.commit()
            print(f"[Migration 0011] Migrated collected_users: {inserted} inserted, {updated} updated", file=sys.stderr)
            
        except Exception as e:
            print(f"[Migration 0011] Error migrating collected_users: {e}", file=sys.stderr)
    
    async def _migrate_tracked_users(self, db):
        """從 tracked_users 遷移數據"""
        try:
            cursor = await db._connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='tracked_users'"
            )
            if not await cursor.fetchone():
                print(f"[Migration 0011] tracked_users table not found, skipping", file=sys.stderr)
                return
            
            cursor = await db._connection.execute("SELECT * FROM tracked_users")
            users = await cursor.fetchall()
            
            if not users:
                print(f"[Migration 0011] No tracked_users to migrate", file=sys.stderr)
                return
            
            columns = [description[0] for description in cursor.description]
            
            updated = 0
            for user in users:
                user_dict = dict(zip(columns, user))
                
                telegram_id = str(user_dict.get('user_id', ''))
                if not telegram_id:
                    continue
                
                # 更新價值等級
                value_level = user_dict.get('value_level', 'low')
                
                await db._connection.execute('''
                    UPDATE unified_contacts SET
                        value_level = ?,
                        notes = notes || ? 
                    WHERE telegram_id = ?
                ''', (
                    value_level,
                    f"\n[追蹤] {user_dict.get('notes', '')}" if user_dict.get('notes') else '',
                    telegram_id
                ))
                updated += 1
            
            await db._connection.commit()
            print(f"[Migration 0011] Updated {updated} contacts from tracked_users", file=sys.stderr)
            
        except Exception as e:
            print(f"[Migration 0011] Error migrating tracked_users: {e}", file=sys.stderr)
    
    async def _migrate_user_profiles(self, db):
        """從 user_profiles 遷移數據"""
        try:
            cursor = await db._connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='user_profiles'"
            )
            if not await cursor.fetchone():
                print(f"[Migration 0011] user_profiles table not found, skipping", file=sys.stderr)
                return
            
            # 檢查 user_profiles 表的列結構
            cursor = await db._connection.execute("PRAGMA table_info(user_profiles)")
            table_columns = {row[1] for row in await cursor.fetchall()}
            
            cursor = await db._connection.execute("SELECT * FROM user_profiles")
            profiles = await cursor.fetchall()
            
            if not profiles:
                print(f"[Migration 0011] No user_profiles to migrate", file=sys.stderr)
                return
            
            columns = [description[0] for description in cursor.description]
            
            updated = 0
            for profile in profiles:
                profile_dict = dict(zip(columns, profile))
                
                telegram_id = str(profile_dict.get('user_id', ''))
                if not telegram_id:
                    continue
                
                # 只在列存在時才讀取 funnel_stage
                funnel_stage = 'awareness'
                if 'funnel_stage' in table_columns:
                    funnel_stage = profile_dict.get('funnel_stage', 'awareness')
                    stage_mapping = {
                        'new': 'awareness',
                        'contacted': 'interest',
                        'interested': 'consideration',
                        'qualified': 'intent',
                        'negotiating': 'evaluation',
                        'converted': 'purchase',
                    }
                    funnel_stage = stage_mapping.get(funnel_stage, funnel_stage)
                
                # 只在列存在時才讀取 interest_level
                interest_level = 1
                if 'interest_level' in table_columns:
                    interest_level = profile_dict.get('interest_level', 1)
                
                await db._connection.execute('''
                    UPDATE unified_contacts SET
                        funnel_stage = ?,
                        interest_level = ?
                    WHERE telegram_id = ?
                ''', (
                    funnel_stage,
                    interest_level,
                    telegram_id
                ))
                updated += 1
            
            await db._connection.commit()
            print(f"[Migration 0011] Updated {updated} contacts from user_profiles", file=sys.stderr)
            
        except Exception as e:
            print(f"[Migration 0011] Error migrating user_profiles: {e}", file=sys.stderr)
    
    async def down(self, db) -> None:
        """Rollback migration (downgrade)"""
        print(f"[Migration 0011] Rolling back unified_contacts...", file=sys.stderr)
        
        # 刪除索引
        await db._connection.execute('DROP INDEX IF EXISTS idx_uc_telegram_id')
        await db._connection.execute('DROP INDEX IF EXISTS idx_uc_status')
        await db._connection.execute('DROP INDEX IF EXISTS idx_uc_funnel_stage')
        await db._connection.execute('DROP INDEX IF EXISTS idx_uc_value_level')
        await db._connection.execute('DROP INDEX IF EXISTS idx_uc_captured_at')
        await db._connection.execute('DROP INDEX IF EXISTS idx_uc_is_blacklisted')
        await db._connection.execute('DROP INDEX IF EXISTS idx_uc_source')
        
        # 刪除表
        await db._connection.execute('DROP TABLE IF EXISTS unified_contacts')
        
        await db._connection.commit()
        print(f"[Migration 0011] Rollback completed", file=sys.stderr)


# 註冊遷移
migration = Migration0011_CreateUnifiedContacts()
