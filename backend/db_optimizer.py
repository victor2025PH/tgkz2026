"""
🔧 Phase 3 優化：數據庫索引和數據清理

功能：
1. 自動創建優化索引
2. 定期清理過期數據
3. 數據庫健康檢查
4. VACUUM 優化
"""

import sys
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

try:
    import aiosqlite
    HAS_AIOSQLITE = True
except ImportError:
    HAS_AIOSQLITE = False


class DatabaseOptimizer:
    """數據庫優化器"""
    
    # 推薦的索引配置
    RECOMMENDED_INDEXES = [
        # accounts 表
        ("idx_accounts_phone", "accounts", "phone"),
        ("idx_accounts_status", "accounts", "status"),
        ("idx_accounts_role", "accounts", "role"),
        
        # messages 表（如果存在）
        ("idx_messages_user_id", "messages", "user_id"),
        ("idx_messages_created_at", "messages", "created_at"),
        ("idx_messages_account_phone", "messages", "account_phone"),
        
        # chat_history 表
        ("idx_chat_history_user_id", "chat_history", "user_id"),
        ("idx_chat_history_account_phone", "chat_history", "account_phone"),
        ("idx_chat_history_timestamp", "chat_history", "timestamp"),
        
        # user_profiles 表
        ("idx_user_profiles_telegram_id", "user_profiles", "telegram_id"),
        ("idx_user_profiles_updated_at", "user_profiles", "updated_at"),
        
        # keyword_sets 表
        ("idx_keyword_sets_account_phone", "keyword_sets", "account_phone"),
        
        # trigger_rules 表
        ("idx_trigger_rules_account_phone", "trigger_rules", "account_phone"),
        ("idx_trigger_rules_is_active", "trigger_rules", "is_active"),
        
        # monitoring_groups 表
        ("idx_monitoring_groups_account_phone", "monitoring_groups", "account_phone"),
        ("idx_monitoring_groups_is_monitoring", "monitoring_groups", "is_monitoring"),
        
        # marketing_tasks 表
        ("idx_marketing_tasks_status", "marketing_tasks", "status"),
        ("idx_marketing_tasks_created_at", "marketing_tasks", "created_at"),
        
        # unified_contacts 表
        ("idx_unified_contacts_telegram_id", "unified_contacts", "telegram_id"),
        ("idx_unified_contacts_source_group", "unified_contacts", "source_group"),
        ("idx_unified_contacts_created_at", "unified_contacts", "created_at"),
    ]
    
    # 數據保留策略（天數）
    DATA_RETENTION = {
        'chat_history': 30,      # 聊天歷史保留 30 天
        'messages': 30,          # 消息保留 30 天
        'usage_logs': 90,        # 使用日誌保留 90 天
        'error_logs': 14,        # 錯誤日誌保留 14 天
        'search_history': 7,     # 搜索歷史保留 7 天
    }
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._connection = None
        self._stats = {
            'indexes_created': 0,
            'rows_cleaned': 0,
            'last_vacuum': None,
            'last_cleanup': None,
        }
    
    async def connect(self):
        """建立連接"""
        if not HAS_AIOSQLITE:
            raise ImportError("aiosqlite is required")
        if self._connection is None:
            self._connection = await aiosqlite.connect(self.db_path, timeout=30.0)
            self._connection.row_factory = aiosqlite.Row
    
    async def close(self):
        """關閉連接"""
        if self._connection:
            await self._connection.close()
            self._connection = None
    
    async def create_indexes(self) -> Dict[str, Any]:
        """創建推薦的索引"""
        await self.connect()
        
        created = []
        skipped = []
        errors = []
        
        for index_name, table_name, column_name in self.RECOMMENDED_INDEXES:
            try:
                # 檢查表是否存在
                cursor = await self._connection.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                    (table_name,)
                )
                table_exists = await cursor.fetchone()
                
                if not table_exists:
                    skipped.append(f"{index_name} (表 {table_name} 不存在)")
                    continue
                
                # 檢查索引是否已存在
                cursor = await self._connection.execute(
                    "SELECT name FROM sqlite_master WHERE type='index' AND name=?",
                    (index_name,)
                )
                index_exists = await cursor.fetchone()
                
                if index_exists:
                    skipped.append(index_name)
                    continue
                
                # 檢查列是否存在
                cursor = await self._connection.execute(f"PRAGMA table_info({table_name})")
                columns = [row[1] for row in await cursor.fetchall()]
                
                if column_name not in columns:
                    skipped.append(f"{index_name} (列 {column_name} 不存在)")
                    continue
                
                # 創建索引
                await self._connection.execute(
                    f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name}({column_name})"
                )
                await self._connection.commit()
                created.append(index_name)
                self._stats['indexes_created'] += 1
                
            except Exception as e:
                errors.append(f"{index_name}: {str(e)}")
        
        result = {
            'created': created,
            'skipped': skipped,
            'errors': errors,
            'total_created': len(created),
        }
        
        if created:
            print(f"[DBOptimizer] ✓ 創建了 {len(created)} 個索引", file=sys.stderr)
        
        return result
    
    async def cleanup_expired_data(self) -> Dict[str, Any]:
        """清理過期數據"""
        await self.connect()
        
        results = {}
        total_cleaned = 0
        
        for table_name, retention_days in self.DATA_RETENTION.items():
            try:
                # 檢查表是否存在
                cursor = await self._connection.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                    (table_name,)
                )
                if not await cursor.fetchone():
                    continue
                
                # 確定時間戳列
                cursor = await self._connection.execute(f"PRAGMA table_info({table_name})")
                columns = [row[1] for row in await cursor.fetchall()]
                
                timestamp_col = None
                for col in ['created_at', 'timestamp', 'created', 'time']:
                    if col in columns:
                        timestamp_col = col
                        break
                
                if not timestamp_col:
                    continue
                
                # 計算截止時間
                cutoff = datetime.now() - timedelta(days=retention_days)
                cutoff_str = cutoff.isoformat()
                
                # 獲取要刪除的行數
                cursor = await self._connection.execute(
                    f"SELECT COUNT(*) FROM {table_name} WHERE {timestamp_col} < ?",
                    (cutoff_str,)
                )
                count = (await cursor.fetchone())[0]
                
                if count > 0:
                    # 刪除過期數據
                    await self._connection.execute(
                        f"DELETE FROM {table_name} WHERE {timestamp_col} < ?",
                        (cutoff_str,)
                    )
                    await self._connection.commit()
                    
                    results[table_name] = count
                    total_cleaned += count
                    print(f"[DBOptimizer] 🧹 {table_name}: 清理了 {count} 條過期數據", file=sys.stderr)
                
            except Exception as e:
                results[table_name] = f"error: {str(e)}"
        
        self._stats['rows_cleaned'] += total_cleaned
        self._stats['last_cleanup'] = datetime.now().isoformat()
        
        return {
            'tables': results,
            'total_cleaned': total_cleaned,
        }
    
    async def vacuum(self) -> Dict[str, Any]:
        """執行 VACUUM 優化"""
        await self.connect()
        
        try:
            # 獲取優化前大小
            cursor = await self._connection.execute("PRAGMA page_count")
            page_count = (await cursor.fetchone())[0]
            cursor = await self._connection.execute("PRAGMA page_size")
            page_size = (await cursor.fetchone())[0]
            size_before = page_count * page_size / 1024 / 1024  # MB
            
            # 執行 VACUUM
            await self._connection.execute("VACUUM")
            
            # 獲取優化後大小
            cursor = await self._connection.execute("PRAGMA page_count")
            page_count = (await cursor.fetchone())[0]
            size_after = page_count * page_size / 1024 / 1024  # MB
            
            saved = size_before - size_after
            self._stats['last_vacuum'] = datetime.now().isoformat()
            
            print(f"[DBOptimizer] ✓ VACUUM 完成，釋放 {saved:.2f}MB", file=sys.stderr)
            
            return {
                'size_before_mb': round(size_before, 2),
                'size_after_mb': round(size_after, 2),
                'saved_mb': round(saved, 2),
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    async def analyze(self) -> Dict[str, Any]:
        """分析數據庫統計信息"""
        await self.connect()
        
        try:
            await self._connection.execute("ANALYZE")
            await self._connection.commit()
            print("[DBOptimizer] ✓ ANALYZE 完成", file=sys.stderr)
            return {'status': 'success'}
        except Exception as e:
            return {'error': str(e)}
    
    async def get_health_report(self) -> Dict[str, Any]:
        """獲取數據庫健康報告"""
        await self.connect()
        
        report = {
            'tables': {},
            'indexes': [],
            'size_mb': 0,
            'integrity': 'unknown',
        }
        
        try:
            # 獲取所有表及其行數
            cursor = await self._connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
            tables = [row[0] for row in await cursor.fetchall()]
            
            for table in tables:
                try:
                    cursor = await self._connection.execute(f"SELECT COUNT(*) FROM {table}")
                    count = (await cursor.fetchone())[0]
                    report['tables'][table] = count
                except Exception:
                    report['tables'][table] = 'error'
            
            # 獲取所有索引
            cursor = await self._connection.execute(
                "SELECT name, tbl_name FROM sqlite_master WHERE type='index'"
            )
            report['indexes'] = [
                {'name': row[0], 'table': row[1]}
                for row in await cursor.fetchall()
            ]
            
            # 獲取數據庫大小
            cursor = await self._connection.execute("PRAGMA page_count")
            page_count = (await cursor.fetchone())[0]
            cursor = await self._connection.execute("PRAGMA page_size")
            page_size = (await cursor.fetchone())[0]
            report['size_mb'] = round(page_count * page_size / 1024 / 1024, 2)
            
            # 完整性檢查
            cursor = await self._connection.execute("PRAGMA integrity_check")
            result = (await cursor.fetchone())[0]
            report['integrity'] = result
            
        except Exception as e:
            report['error'] = str(e)
        
        return report
    
    async def run_full_optimization(self) -> Dict[str, Any]:
        """執行完整優化"""
        print("[DBOptimizer] 開始數據庫優化...", file=sys.stderr)
        
        results = {
            'indexes': await self.create_indexes(),
            'cleanup': await self.cleanup_expired_data(),
            'analyze': await self.analyze(),
            'stats': self._stats,
        }
        
        # 如果清理了大量數據，執行 VACUUM
        if results['cleanup']['total_cleaned'] > 1000:
            results['vacuum'] = await self.vacuum()
        
        print("[DBOptimizer] ✓ 數據庫優化完成", file=sys.stderr)
        return results


# 全局實例
_optimizer: Optional[DatabaseOptimizer] = None


def get_db_optimizer() -> Optional[DatabaseOptimizer]:
    """獲取優化器實例"""
    return _optimizer


async def init_db_optimizer(db_path: str) -> DatabaseOptimizer:
    """初始化數據庫優化器"""
    global _optimizer
    if _optimizer is None:
        _optimizer = DatabaseOptimizer(db_path)
    return _optimizer


async def run_scheduled_optimization(db_path: str):
    """定時優化任務（每天執行一次）"""
    optimizer = await init_db_optimizer(db_path)
    
    while True:
        await asyncio.sleep(86400)  # 24 小時
        try:
            await optimizer.run_full_optimization()
        except Exception as e:
            print(f"[DBOptimizer] 定時優化失敗: {e}", file=sys.stderr)
