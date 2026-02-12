"""
Migration 0030: Migrate AI run settings from settings table to ai_settings (per-user)

P0 統一數據源：儀表盤與觸發規則從 ai_settings 讀取 AI 開關/模式。
- 將舊表 settings 中 category='ai' 或 auto_chat%/local_ai%/auto_greeting% 的項複製到 ai_settings(user_id='local_user')
- Electron 單機或歷史單用戶升級後，儀表盤可正確顯示「已啟用」
"""

import sys
from migrations.migration_base import Migration


class MigrateAiSettingsFromSettingsMigration(Migration):
    """Copy AI-related keys from settings to ai_settings for local_user"""

    def __init__(self):
        super().__init__(
            version=30,
            description="Migrate AI run settings from settings to ai_settings (per-user)"
        )

    async def up(self, db) -> None:
        print("[Migration 0030] Migrating AI settings from settings to ai_settings...", file=sys.stderr)
        try:
            await db._connection.execute("""
                CREATE TABLE IF NOT EXISTS ai_settings (
                    user_id TEXT DEFAULT '',
                    key TEXT NOT NULL,
                    value TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, key)
                )
            """)
        except Exception as e:
            print(f"[Migration 0030] Create ai_settings: {e}", file=sys.stderr)

        try:
            cursor = await db._connection.execute("""
                SELECT setting_key, setting_value FROM settings
                WHERE category = 'ai'
                   OR setting_key LIKE 'auto_chat%%'
                   OR setting_key LIKE 'local_ai%%'
                   OR setting_key LIKE 'auto_greeting%%'
            """)
            rows = await cursor.fetchall()
        except Exception as e:
            print(f"[Migration 0030] Select from settings: {e}", file=sys.stderr)
            await db._connection.commit()
            return

        user_id = 'local_user'
        migrated = 0
        for row in rows:
            try:
                key = row[0]
                value = row[1] if len(row) > 1 and row[1] is not None else ''
                await db._connection.execute("""
                    INSERT INTO ai_settings (user_id, key, value, updated_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(user_id, key) DO UPDATE SET
                        value = excluded.value,
                        updated_at = CURRENT_TIMESTAMP
                """, (user_id, key, str(value)))
                migrated += 1
            except Exception as e:
                print(f"[Migration 0030] Insert key={key}: {e}", file=sys.stderr)
        await db._connection.commit()
        print(f"[Migration 0030] Migrated {migrated} AI settings to ai_settings for {user_id!r}", file=sys.stderr)

    async def down(self, db) -> None:
        print("[Migration 0030] Rollback: not removing ai_settings rows (safe)", file=sys.stderr)
        await db._connection.commit()
