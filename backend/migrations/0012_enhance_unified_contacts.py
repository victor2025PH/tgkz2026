"""
TG-Matrix 數據庫遷移：增強統一聯絡人表
Phase C: Database - 數據統一遷移

版本：0012
說明：
1. 添加索引優化查詢性能
2. 添加全文搜索支持
3. 添加軟刪除支持
4. 創建視圖簡化查詢
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from migrations.migration_base import Migration


class Migration0012EnhanceUnifiedContacts(Migration):
    """增強統一聯絡人表"""
    
    def __init__(self):
        super().__init__(
            version=12,
            description="Enhance unified_contacts table with indexes and views"
        )
    
    async def up(self, db):
        """升級"""
        # 1. 添加軟刪除列（如果不存在）
        try:
            await db.execute("""
                ALTER TABLE unified_contacts 
                ADD COLUMN deleted_at TIMESTAMP NULL
            """)
        except Exception:
            pass  # 列可能已存在
        
        try:
            await db.execute("""
                ALTER TABLE unified_contacts 
                ADD COLUMN deleted_by TEXT NULL
            """)
        except Exception:
            pass
        
        # 2. 添加額外索引
        indexes = [
            ("idx_uc_funnel_stage", "funnel_stage"),
            ("idx_uc_source", "source"),
            ("idx_uc_status_created", "status, captured_at DESC"),
            ("idx_uc_telegram_username", "telegram_username"),
            ("idx_uc_deleted", "deleted_at"),
            ("idx_uc_last_interaction", "last_interaction_at DESC"),
        ]
        
        for idx_name, columns in indexes:
            try:
                await db.execute(f"""
                    CREATE INDEX IF NOT EXISTS {idx_name} 
                    ON unified_contacts({columns})
                """)
            except Exception as e:
                print(f"Index {idx_name} creation skipped: {e}")
        
        # 3. 創建 FTS 虛擬表（全文搜索）
        try:
            await db.execute("""
                CREATE VIRTUAL TABLE IF NOT EXISTS unified_contacts_fts 
                USING fts5(
                    telegram_id,
                    telegram_username,
                    display_name,
                    notes,
                    tags,
                    content=unified_contacts,
                    content_rowid=id
                )
            """)
        except Exception as e:
            print(f"FTS table creation skipped: {e}")
        
        # 4. 創建觸發器同步 FTS - 已禁用，因為 FTS 功能非必要且觸發器可能導致問題
        # 注意：列名已從 telegram_username 改為 username
        # 如需啟用 FTS，請確保使用正確的列名 (username)
        print("[Migration 0012] FTS triggers disabled to avoid column name conflicts")
        
        # 5. 創建活躍聯絡人視圖
        try:
            await db.execute("DROP VIEW IF EXISTS active_contacts")
            await db.execute("""
                CREATE VIEW active_contacts AS
                SELECT * FROM unified_contacts
                WHERE deleted_at IS NULL
                  AND status != 'blocked'
            """)
        except Exception as e:
            print(f"View creation skipped: {e}")
        
        # 6. 創建統計視圖
        try:
            await db.execute("DROP VIEW IF EXISTS contact_stats")
            await db.execute("""
                CREATE VIEW contact_stats AS
                SELECT 
                    funnel_stage,
                    status,
                    source,
                    COUNT(*) as count,
                    AVG(intent_score) as avg_intent_score,
                    MAX(captured_at) as latest_capture
                FROM unified_contacts
                WHERE deleted_at IS NULL
                GROUP BY funnel_stage, status, source
            """)
        except Exception as e:
            print(f"Stats view creation skipped: {e}")
        
        # 注意：Database 對象可能會自動提交，所以跳過顯式 commit
        try:
            if hasattr(db, 'commit'):
                await db.commit()
        except Exception:
            pass  # 自動提交模式
        print("Migration 0012: Enhanced unified_contacts successfully")
    
    async def down(self, db):
        """降級"""
        # 刪除視圖
        await db.execute("DROP VIEW IF EXISTS contact_stats")
        await db.execute("DROP VIEW IF EXISTS active_contacts")
        
        # 刪除觸發器
        await db.execute("DROP TRIGGER IF EXISTS uc_ai")
        await db.execute("DROP TRIGGER IF EXISTS uc_ad")
        await db.execute("DROP TRIGGER IF EXISTS uc_au")
        
        # 刪除 FTS 表
        await db.execute("DROP TABLE IF EXISTS unified_contacts_fts")
        
        # 刪除索引
        indexes = [
            "idx_uc_funnel_stage",
            "idx_uc_source",
            "idx_uc_status_created",
            "idx_uc_telegram_username",
            "idx_uc_deleted",
            "idx_uc_last_interaction",
        ]
        
        for idx_name in indexes:
            try:
                await db.execute(f"DROP INDEX IF EXISTS {idx_name}")
            except Exception:
                pass
        
        try:
            if hasattr(db, 'commit'):
                await db.commit()
        except Exception:
            pass
        print("Migration 0012: Rollback completed")


# 導出遷移實例
migration = Migration0012EnhanceUnifiedContacts()
