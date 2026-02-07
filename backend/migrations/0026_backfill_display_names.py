"""
Migration 0026: 回填 display_name 為空的用戶

🔧 P3-5: 存量數據修補
- 將所有 display_name 為空/NULL 的用戶，用 telegram_first_name 或 username 填充
- 確保 API 返回的 display_name 永不為空
"""

from .migration_base import Migration


class Migration0026(Migration):
    def __init__(self):
        super().__init__(
            version=26,
            description="Backfill empty display_name with telegram_first_name or username"
        )
    
    async def up(self, db) -> None:
        """填充空的 display_name"""
        try:
            # 統計受影響的行數
            count_result = db.execute('''
                SELECT COUNT(*) as count FROM users 
                WHERE display_name IS NULL OR TRIM(display_name) = ''
            ''').fetchone()
            affected = count_result['count'] if count_result else 0
            
            if affected == 0:
                print(f"[Migration 0026] No users with empty display_name, skipping")
                return
            
            print(f"[Migration 0026] Found {affected} users with empty display_name, backfilling...")
            
            # Step 1: 優先用 telegram_first_name 填充
            db.execute('''
                UPDATE users 
                SET display_name = telegram_first_name,
                    updated_at = CURRENT_TIMESTAMP
                WHERE (display_name IS NULL OR TRIM(display_name) = '')
                  AND telegram_first_name IS NOT NULL 
                  AND TRIM(telegram_first_name) != ''
            ''')
            step1_changes = db.total_changes
            
            # Step 2: 其餘用 username 填充
            db.execute('''
                UPDATE users 
                SET display_name = username,
                    updated_at = CURRENT_TIMESTAMP
                WHERE (display_name IS NULL OR TRIM(display_name) = '')
                  AND username IS NOT NULL 
                  AND TRIM(username) != ''
            ''')
            step2_changes = db.total_changes - step1_changes
            
            # Step 3: 最後兜底，仍為空的用 '用戶' 填充
            db.execute('''
                UPDATE users 
                SET display_name = '用戶',
                    updated_at = CURRENT_TIMESTAMP
                WHERE display_name IS NULL OR TRIM(display_name) = ''
            ''')
            
            db.commit()
            print(f"[Migration 0026] Backfill complete: "
                  f"{step1_changes} from telegram_first_name, "
                  f"{step2_changes} from username, "
                  f"total {affected} users updated")
            
        except Exception as e:
            print(f"[Migration 0026] Error: {e}")
            # 不拋異常，允許應用繼續啟動
    
    async def down(self, db) -> None:
        """回滾：無法精確回滾，因為不知道原始值"""
        print("[Migration 0026] Down migration not applicable - display_name backfill is not reversible")
        pass
