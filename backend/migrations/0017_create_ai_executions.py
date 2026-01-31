"""
🔧 Phase 4: 創建 AI 執行任務持久化表
解決：AI 團隊執行任務重啟後消失的問題
"""

from .migration_base import Migration


class Migration0017(Migration):
    """創建 AI 執行任務持久化表"""
    
    version = 17
    description = "創建 AI 執行任務持久化表"
    
    async def up(self, db):
        """執行遷移"""
        import sys
        
        # 1. AI 執行任務表
        await db.execute("""
            CREATE TABLE IF NOT EXISTS ai_executions (
                id TEXT PRIMARY KEY,
                execution_type TEXT NOT NULL,
                status TEXT DEFAULT 'running',
                mode TEXT,
                goal TEXT,
                target_users TEXT,
                role_accounts TEXT,
                group_id TEXT,
                group_name TEXT,
                message_history TEXT DEFAULT '[]',
                stats TEXT DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            )
        """)
        print("[Migration 0017] ✓ 已創建 ai_executions 表", file=sys.stderr)
        
        # 2. 創建索引
        try:
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_ai_executions_status 
                ON ai_executions(status)
            """)
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_ai_executions_type 
                ON ai_executions(execution_type)
            """)
            print("[Migration 0017] ✓ 已創建索引", file=sys.stderr)
        except Exception as e:
            print(f"[Migration 0017] ⚠ 創建索引失敗: {e}", file=sys.stderr)
        
        print("[Migration 0017] ✅ 遷移完成", file=sys.stderr)
    
    async def down(self, db):
        """回滾遷移"""
        await db.execute("DROP TABLE IF EXISTS ai_executions")


# 導出遷移實例
migration = Migration0017()
