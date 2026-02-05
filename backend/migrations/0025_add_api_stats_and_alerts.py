"""
Migration: 添加 API 统计和告警历史表

功能：
1. api_stats_daily - 每日统计汇总
2. api_stats_hourly - 每小时统计
3. login_attempts - 登录尝试记录
4. alert_history - 告警历史
5. audit_logs - 操作审计日志
"""

from migrations.migration_base import Migration


class Migration0025(Migration):
    """添加 API 统计和告警历史表"""
    
    version = 25
    description = "添加 API 统计和告警历史表"
    
    async def up(self, db) -> None:
        """执行迁移"""
        
        # 1. API 每日统计表
        await db.execute("""
            CREATE TABLE IF NOT EXISTS api_stats_daily (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                api_id TEXT NOT NULL,
                total_attempts INTEGER DEFAULT 0,
                successful INTEGER DEFAULT 0,
                failed INTEGER DEFAULT 0,
                errors INTEGER DEFAULT 0,
                avg_duration REAL DEFAULT 0,
                success_rate REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(date, api_id)
            )
        """)
        
        # 索引
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_api_stats_daily_date 
            ON api_stats_daily(date)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_api_stats_daily_api_id 
            ON api_stats_daily(api_id)
        """)
        
        # 2. API 每小时统计表
        await db.execute("""
            CREATE TABLE IF NOT EXISTS api_stats_hourly (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hour TEXT NOT NULL,
                api_id TEXT NOT NULL,
                attempts INTEGER DEFAULT 0,
                successful INTEGER DEFAULT 0,
                failed INTEGER DEFAULT 0,
                errors INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(hour, api_id)
            )
        """)
        
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_api_stats_hourly_hour 
            ON api_stats_hourly(hour)
        """)
        
        # 3. 登录尝试记录表
        await db.execute("""
            CREATE TABLE IF NOT EXISTS login_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT NOT NULL,
                api_id TEXT NOT NULL,
                success INTEGER DEFAULT 0,
                error TEXT,
                duration REAL DEFAULT 0,
                step TEXT,
                ip_address TEXT,
                user_agent TEXT,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_login_attempts_phone 
            ON login_attempts(phone)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_login_attempts_api_id 
            ON login_attempts(api_id)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at 
            ON login_attempts(created_at)
        """)
        
        # 4. 告警历史表
        await db.execute("""
            CREATE TABLE IF NOT EXISTS alert_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_id TEXT NOT NULL UNIQUE,
                alert_type TEXT NOT NULL,
                level TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT,
                api_id TEXT,
                resolved INTEGER DEFAULT 0,
                resolved_at TIMESTAMP,
                resolved_by TEXT,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_alert_history_level 
            ON alert_history(level)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_alert_history_resolved 
            ON alert_history(resolved)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_alert_history_created_at 
            ON alert_history(created_at)
        """)
        
        # 5. 操作审计日志表
        await db.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL,
                resource_type TEXT NOT NULL,
                resource_id TEXT,
                user_id TEXT,
                user_name TEXT,
                ip_address TEXT,
                old_value TEXT,
                new_value TEXT,
                details TEXT,
                success INTEGER DEFAULT 1,
                error TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
            ON audit_logs(action)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_audit_logs_resource 
            ON audit_logs(resource_type, resource_id)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
            ON audit_logs(user_id)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
            ON audit_logs(created_at)
        """)
        
        # 6. API 健康快照表（用于趋势分析）
        await db.execute("""
            CREATE TABLE IF NOT EXISTS api_health_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                api_id TEXT NOT NULL,
                status TEXT NOT NULL,
                success_rate REAL DEFAULT 0,
                error_rate REAL DEFAULT 0,
                avg_response_time REAL DEFAULT 0,
                consecutive_failures INTEGER DEFAULT 0,
                snapshot_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_api_health_snapshots_api_id 
            ON api_health_snapshots(api_id)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_api_health_snapshots_time 
            ON api_health_snapshots(snapshot_time)
        """)
        
        print("[Migration 0025] ✅ 创建 API 统计和告警历史表完成")
    
    async def down(self, db) -> None:
        """回滚迁移"""
        await db.execute("DROP TABLE IF EXISTS api_health_snapshots")
        await db.execute("DROP TABLE IF EXISTS audit_logs")
        await db.execute("DROP TABLE IF EXISTS alert_history")
        await db.execute("DROP TABLE IF EXISTS login_attempts")
        await db.execute("DROP TABLE IF EXISTS api_stats_hourly")
        await db.execute("DROP TABLE IF EXISTS api_stats_daily")
        
        print("[Migration 0025] ✅ 回滚完成")


# 导出迁移
migration = Migration0025()
