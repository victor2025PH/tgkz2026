"""
🔧 Phase 6: 修復數據庫缺失列
解決以下錯誤：
1. table rag_knowledge_gaps has no column named source_type
2. table conversation_summaries has no column named unresolved_intents
"""

from .migration_base import Migration


class Migration0016(Migration):
    """修復缺失的數據庫列"""
    
    version = 16
    description = "修復 rag_knowledge_gaps 和 conversation_summaries 缺失的列"
    
    async def up(self, db):
        """執行遷移"""
        import sys
        
        # 1. 為 rag_knowledge_gaps 添加 source_type 和 category 列
        try:
            await db.execute("""
                ALTER TABLE rag_knowledge_gaps 
                ADD COLUMN source_type TEXT DEFAULT 'user'
            """)
            print("[Migration 0016] ✓ 已添加 rag_knowledge_gaps.source_type", file=sys.stderr)
        except Exception as e:
            if "duplicate column" not in str(e).lower():
                print(f"[Migration 0016] ⚠ source_type: {e}", file=sys.stderr)
        
        try:
            await db.execute("""
                ALTER TABLE rag_knowledge_gaps 
                ADD COLUMN category TEXT DEFAULT 'general'
            """)
            print("[Migration 0016] ✓ 已添加 rag_knowledge_gaps.category", file=sys.stderr)
        except Exception as e:
            if "duplicate column" not in str(e).lower():
                print(f"[Migration 0016] ⚠ category: {e}", file=sys.stderr)
        
        # 2. 為 conversation_summaries 添加缺失的列
        # 檢查表是否存在
        try:
            result = await db.execute("""
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='conversation_summaries'
            """)
            table_exists = await result.fetchone()
            
            if table_exists:
                # 添加 unresolved_intents 列
                try:
                    await db.execute("""
                        ALTER TABLE conversation_summaries 
                        ADD COLUMN unresolved_intents TEXT DEFAULT '[]'
                    """)
                    print("[Migration 0016] ✓ 已添加 conversation_summaries.unresolved_intents", file=sys.stderr)
                except Exception as e:
                    if "duplicate column" not in str(e).lower():
                        print(f"[Migration 0016] ⚠ unresolved_intents: {e}", file=sys.stderr)
                
                # 添加 customer_preferences 列
                try:
                    await db.execute("""
                        ALTER TABLE conversation_summaries 
                        ADD COLUMN customer_preferences TEXT DEFAULT '{}'
                    """)
                    print("[Migration 0016] ✓ 已添加 conversation_summaries.customer_preferences", file=sys.stderr)
                except Exception as e:
                    if "duplicate column" not in str(e).lower():
                        print(f"[Migration 0016] ⚠ customer_preferences: {e}", file=sys.stderr)
                
                # 添加 last_topic 列
                try:
                    await db.execute("""
                        ALTER TABLE conversation_summaries 
                        ADD COLUMN last_topic TEXT DEFAULT 'general'
                    """)
                    print("[Migration 0016] ✓ 已添加 conversation_summaries.last_topic", file=sys.stderr)
                except Exception as e:
                    if "duplicate column" not in str(e).lower():
                        print(f"[Migration 0016] ⚠ last_topic: {e}", file=sys.stderr)
                
                # 添加 sentiment_trend 列（如果是舊版遷移創建的表）
                try:
                    await db.execute("""
                        ALTER TABLE conversation_summaries 
                        ADD COLUMN sentiment_trend TEXT DEFAULT 'neutral'
                    """)
                    print("[Migration 0016] ✓ 已添加 conversation_summaries.sentiment_trend (TEXT)", file=sys.stderr)
                except Exception as e:
                    if "duplicate column" not in str(e).lower():
                        print(f"[Migration 0016] ⚠ sentiment_trend: {e}", file=sys.stderr)
                
                # 添加 updated_at 列
                try:
                    await db.execute("""
                        ALTER TABLE conversation_summaries 
                        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    """)
                    print("[Migration 0016] ✓ 已添加 conversation_summaries.updated_at", file=sys.stderr)
                except Exception as e:
                    if "duplicate column" not in str(e).lower():
                        print(f"[Migration 0016] ⚠ updated_at: {e}", file=sys.stderr)
            else:
                # 表不存在，創建完整的表
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS conversation_summaries (
                        user_id TEXT PRIMARY KEY,
                        summary TEXT,
                        key_points TEXT DEFAULT '[]',
                        unresolved_intents TEXT DEFAULT '[]',
                        customer_preferences TEXT DEFAULT '{}',
                        last_topic TEXT DEFAULT 'general',
                        sentiment_trend TEXT DEFAULT 'neutral',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                print("[Migration 0016] ✓ 已創建 conversation_summaries 表", file=sys.stderr)
                
        except Exception as e:
            print(f"[Migration 0016] ❌ conversation_summaries 處理失敗: {e}", file=sys.stderr)
        
        print("[Migration 0016] ✅ 遷移完成", file=sys.stderr)
    
    async def down(self, db):
        """回滾遷移 - SQLite 不支持 DROP COLUMN，跳過"""
        pass


# 導出遷移實例
migration = Migration0016()
