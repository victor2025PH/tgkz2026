"""
Migration 0014: 創建統一營銷任務表

整合多角色協作和AI中心的功能，提供統一的任務數據模型：
- 統一任務生命週期管理
- 統一效果追蹤指標
- 支持多種任務類型（協作、自動聊天、策略執行）
- 單一數據源原則（Single Source of Truth）
"""

from .migration_base import Migration


class Migration0014(Migration):
    """創建統一營銷任務表"""
    
    version = 14
    description = "創建統一營銷任務表 - 整合多角色協作與AI中心"
    
    def up(self, conn):
        cursor = conn.cursor()
        
        # 1. 營銷任務主表 - 統一的任務入口
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS marketing_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                
                -- 任務基本信息
                name TEXT NOT NULL,
                description TEXT,
                goal_type TEXT NOT NULL DEFAULT 'conversion',  -- conversion/retention/engagement/support
                
                -- AI 配置關聯
                ai_config_id TEXT,
                execution_mode TEXT DEFAULT 'hybrid',  -- scripted/hybrid/scriptless
                
                -- 任務狀態
                status TEXT DEFAULT 'draft',  -- draft/scheduled/running/paused/completed/failed
                current_stage TEXT,
                
                -- 目標配置
                target_count INTEGER DEFAULT 0,
                target_criteria TEXT,  -- JSON: 目標用戶篩選條件
                
                -- 角色配置
                role_config TEXT,  -- JSON: 角色分配配置
                script_id TEXT,  -- 關聯的劇本ID（如果是劇本模式）
                
                -- 執行配置
                schedule_config TEXT,  -- JSON: 計劃任務配置
                trigger_conditions TEXT,  -- JSON: 觸發條件
                
                -- 統計指標
                stats_total_contacts INTEGER DEFAULT 0,
                stats_contacted INTEGER DEFAULT 0,
                stats_replied INTEGER DEFAULT 0,
                stats_converted INTEGER DEFAULT 0,
                stats_messages_sent INTEGER DEFAULT 0,
                stats_ai_cost REAL DEFAULT 0.0,
                
                -- 時間戳
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                -- 創建者
                created_by TEXT
            )
        ''')
        
        # 2. 任務目標用戶關聯表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS marketing_task_targets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                
                -- 用戶信息
                telegram_id TEXT NOT NULL,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                
                -- 狀態追蹤
                status TEXT DEFAULT 'pending',  -- pending/contacted/replied/converted/failed
                intent_score INTEGER DEFAULT 0,
                
                -- 執行信息
                assigned_role TEXT,
                last_message_at TIMESTAMP,
                message_count INTEGER DEFAULT 0,
                
                -- 結果
                outcome TEXT,  -- converted/rejected/no_response/pending
                outcome_notes TEXT,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (task_id) REFERENCES marketing_tasks(id) ON DELETE CASCADE
            )
        ''')
        
        # 3. 任務執行日誌表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS marketing_task_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                target_id INTEGER,
                
                -- 日誌類型
                log_type TEXT NOT NULL,  -- status_change/message_sent/ai_decision/role_switch/error
                
                -- 日誌內容
                action TEXT,
                details TEXT,  -- JSON: 詳細信息
                
                -- 執行者
                actor_type TEXT,  -- ai/role/system/human
                actor_id TEXT,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (task_id) REFERENCES marketing_tasks(id) ON DELETE CASCADE
            )
        ''')
        
        # 4. 任務角色分配表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS marketing_task_roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                
                -- 角色信息
                role_type TEXT NOT NULL,  -- expert/satisfied_customer/support/manager/etc
                role_name TEXT,
                
                -- 帳號綁定
                account_id INTEGER,
                account_phone TEXT,
                
                -- AI 配置
                persona_prompt TEXT,
                speaking_style TEXT,
                
                -- 執行統計
                messages_sent INTEGER DEFAULT 0,
                last_active_at TIMESTAMP,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (task_id) REFERENCES marketing_tasks(id) ON DELETE CASCADE
            )
        ''')
        
        # 5. 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_marketing_tasks_status ON marketing_tasks(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_marketing_tasks_goal_type ON marketing_tasks(goal_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_marketing_tasks_created_at ON marketing_tasks(created_at DESC)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_marketing_task_targets_task_id ON marketing_task_targets(task_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_marketing_task_targets_status ON marketing_task_targets(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_marketing_task_targets_telegram_id ON marketing_task_targets(telegram_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_marketing_task_logs_task_id ON marketing_task_logs(task_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_marketing_task_logs_target_id ON marketing_task_logs(target_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_marketing_task_roles_task_id ON marketing_task_roles(task_id)')
        
        conn.commit()
        return True
    
    def down(self, conn):
        cursor = conn.cursor()
        cursor.execute('DROP TABLE IF EXISTS marketing_task_roles')
        cursor.execute('DROP TABLE IF EXISTS marketing_task_logs')
        cursor.execute('DROP TABLE IF EXISTS marketing_task_targets')
        cursor.execute('DROP TABLE IF EXISTS marketing_tasks')
        conn.commit()
        return True


# 導出遷移類
migration = Migration0014()
