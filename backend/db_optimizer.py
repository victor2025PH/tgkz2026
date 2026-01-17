"""
TG-Matrix 數據庫優化器 - Phase 2 性能優化
Database Optimizer with Index Management and Query Analysis

功能:
1. 自動索引管理
2. 查詢性能分析
3. 慢查詢檢測
4. 數據庫健康檢查
"""

import sqlite3
import time
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict
import threading

logger = logging.getLogger(__name__)


@dataclass
class QueryStats:
    """查詢統計信息"""
    query: str
    total_time: float = 0.0
    execution_count: int = 0
    avg_time: float = 0.0
    max_time: float = 0.0
    min_time: float = float('inf')
    last_executed: Optional[datetime] = None
    
    def record(self, execution_time: float):
        """記錄一次執行"""
        self.total_time += execution_time
        self.execution_count += 1
        self.avg_time = self.total_time / self.execution_count
        self.max_time = max(self.max_time, execution_time)
        self.min_time = min(self.min_time, execution_time)
        self.last_executed = datetime.now()


@dataclass
class IndexRecommendation:
    """索引建議"""
    table_name: str
    column_name: str
    reason: str
    estimated_improvement: str
    create_sql: str
    priority: int = 1  # 1=高, 2=中, 3=低


class DatabaseOptimizer:
    """數據庫優化器"""
    
    # 預設的優化索引列表
    RECOMMENDED_INDEXES = [
        # 帳號相關
        ("accounts", "phone", "加速帳號查詢"),
        ("accounts", "status", "加速狀態篩選"),
        ("accounts", "role", "加速角色篩選"),
        
        # 消息相關
        ("messages", "chat_id", "加速聊天記錄查詢"),
        ("messages", "sender_id", "加速發送者查詢"),
        ("messages", "created_at", "加速時間範圍查詢"),
        ("messages", "status", "加速狀態篩選"),
        
        # Leads 相關
        ("leads", "status", "加速狀態篩選"),
        ("leads", "stage", "加速漏斗階段查詢"),
        ("leads", "source_group", "加速來源群組查詢"),
        ("leads", "captured_at", "加速時間範圍查詢"),
        ("leads", "user_id", "加速用戶ID查詢"),
        
        # 關鍵詞相關
        ("keywords", "keyword_set_id", "加速關鍵詞集查詢"),
        ("keyword_sets", "name", "加速關鍵詞集名稱查詢"),
        
        # 群組相關
        ("monitored_groups", "chat_id", "加速群組ID查詢"),
        ("monitored_groups", "keyword_set_id", "加速關鍵詞集關聯"),
        
        # 活動相關
        ("campaigns", "is_active", "加速活躍活動查詢"),
        ("campaign_executions", "campaign_id", "加速活動執行記錄"),
        ("campaign_executions", "executed_at", "加速執行時間查詢"),
        
        # 日誌相關
        ("logs", "type", "加速日誌類型篩選"),
        ("logs", "created_at", "加速日誌時間查詢"),
        
        # 聊天記錄
        ("chat_history", "user_id", "加速用戶聊天查詢"),
        ("chat_history", "timestamp", "加速時間排序"),
        
        # 隊列相關
        ("message_queue", "status", "加速隊列狀態查詢"),
        ("message_queue", "scheduled_time", "加速定時發送查詢"),
        ("message_queue", "account_phone", "加速帳號隊列查詢"),
    ]
    
    # 複合索引
    COMPOSITE_INDEXES = [
        ("messages", ["chat_id", "created_at"], "加速聊天記錄分頁"),
        ("leads", ["status", "captured_at"], "加速狀態+時間查詢"),
        ("leads", ["stage", "score"], "加速漏斗分析"),
        ("message_queue", ["status", "scheduled_time"], "加速隊列處理"),
        ("logs", ["type", "created_at"], "加速日誌篩選"),
    ]
    
    def __init__(self, db_path: Path):
        """
        初始化優化器
        
        Args:
            db_path: 數據庫路徑
        """
        self.db_path = db_path
        self.query_stats: Dict[str, QueryStats] = defaultdict(QueryStats)
        self.slow_query_threshold = 0.1  # 100ms
        self._lock = threading.Lock()
        
    def get_connection(self) -> sqlite3.Connection:
        """獲取數據庫連接"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def analyze_tables(self) -> Dict[str, Any]:
        """
        分析所有表的統計信息
        
        Returns:
            表分析結果
        """
        results = {}
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 獲取所有表
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            for table in tables:
                try:
                    # 獲取行數
                    cursor.execute(f"SELECT COUNT(*) FROM {table}")
                    row_count = cursor.fetchone()[0]
                    
                    # 獲取列信息
                    cursor.execute(f"PRAGMA table_info({table})")
                    columns = [dict(row) for row in cursor.fetchall()]
                    
                    # 獲取索引信息
                    cursor.execute(f"PRAGMA index_list({table})")
                    indexes = [dict(row) for row in cursor.fetchall()]
                    
                    results[table] = {
                        'row_count': row_count,
                        'column_count': len(columns),
                        'columns': columns,
                        'index_count': len(indexes),
                        'indexes': indexes
                    }
                except Exception as e:
                    results[table] = {'error': str(e)}
        
        return results
    
    def get_existing_indexes(self) -> Dict[str, List[str]]:
        """
        獲取現有索引
        
        Returns:
            表名 -> 索引列名列表
        """
        indexes: Dict[str, List[str]] = defaultdict(list)
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 獲取所有索引
            cursor.execute("""
                SELECT tbl_name, name, sql FROM sqlite_master 
                WHERE type='index' AND sql IS NOT NULL
            """)
            
            for row in cursor.fetchall():
                table_name = row[0]
                index_name = row[1]
                indexes[table_name].append(index_name)
        
        return dict(indexes)
    
    def generate_index_recommendations(self) -> List[IndexRecommendation]:
        """
        生成索引建議
        
        Returns:
            索引建議列表
        """
        recommendations = []
        existing = self.get_existing_indexes()
        
        # 獲取所有表
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = set(row[0] for row in cursor.fetchall())
        
        # 檢查單列索引
        for table, column, reason in self.RECOMMENDED_INDEXES:
            if table not in tables:
                continue
            
            index_name = f"idx_{table}_{column}"
            if index_name not in existing.get(table, []):
                recommendations.append(IndexRecommendation(
                    table_name=table,
                    column_name=column,
                    reason=reason,
                    estimated_improvement="中等提升",
                    create_sql=f"CREATE INDEX IF NOT EXISTS {index_name} ON {table}({column})",
                    priority=2
                ))
        
        # 檢查複合索引
        for table, columns, reason in self.COMPOSITE_INDEXES:
            if table not in tables:
                continue
            
            column_str = "_".join(columns)
            index_name = f"idx_{table}_{column_str}"
            if index_name not in existing.get(table, []):
                recommendations.append(IndexRecommendation(
                    table_name=table,
                    column_name=", ".join(columns),
                    reason=reason,
                    estimated_improvement="高度提升",
                    create_sql=f"CREATE INDEX IF NOT EXISTS {index_name} ON {table}({', '.join(columns)})",
                    priority=1
                ))
        
        # 按優先級排序
        recommendations.sort(key=lambda r: r.priority)
        
        return recommendations
    
    def apply_index(self, recommendation: IndexRecommendation) -> bool:
        """
        應用索引建議
        
        Args:
            recommendation: 索引建議
            
        Returns:
            是否成功
        """
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(recommendation.create_sql)
                conn.commit()
                logger.info(f"[DB Optimizer] Created index: {recommendation.create_sql}")
                return True
        except Exception as e:
            logger.error(f"[DB Optimizer] Failed to create index: {e}")
            return False
    
    def apply_all_recommended_indexes(self) -> Dict[str, Any]:
        """
        應用所有推薦的索引
        
        Returns:
            應用結果
        """
        recommendations = self.generate_index_recommendations()
        results = {
            'total': len(recommendations),
            'success': 0,
            'failed': 0,
            'details': []
        }
        
        for rec in recommendations:
            success = self.apply_index(rec)
            if success:
                results['success'] += 1
                results['details'].append({
                    'table': rec.table_name,
                    'column': rec.column_name,
                    'status': 'created'
                })
            else:
                results['failed'] += 1
                results['details'].append({
                    'table': rec.table_name,
                    'column': rec.column_name,
                    'status': 'failed'
                })
        
        return results
    
    def record_query(self, query: str, execution_time: float):
        """
        記錄查詢執行時間
        
        Args:
            query: SQL 查詢（規範化後）
            execution_time: 執行時間（秒）
        """
        with self._lock:
            # 規範化查詢（移除具體值）
            normalized = self._normalize_query(query)
            
            if normalized not in self.query_stats:
                self.query_stats[normalized] = QueryStats(query=normalized)
            
            self.query_stats[normalized].record(execution_time)
            
            # 檢測慢查詢
            if execution_time > self.slow_query_threshold:
                logger.warning(
                    f"[Slow Query] {execution_time:.3f}s: {query[:100]}..."
                )
    
    def _normalize_query(self, query: str) -> str:
        """規範化查詢（用於統計）"""
        import re
        # 移除具體值，保留結構
        normalized = re.sub(r"'[^']*'", "'?'", query)
        normalized = re.sub(r"\d+", "?", normalized)
        normalized = re.sub(r"\s+", " ", normalized)
        return normalized.strip()[:200]  # 限制長度
    
    def get_slow_queries(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        獲取慢查詢列表
        
        Args:
            limit: 返回數量
            
        Returns:
            慢查詢列表
        """
        with self._lock:
            slow_queries = [
                {
                    'query': stats.query,
                    'avg_time': stats.avg_time,
                    'max_time': stats.max_time,
                    'execution_count': stats.execution_count,
                    'total_time': stats.total_time,
                    'last_executed': stats.last_executed.isoformat() if stats.last_executed else None
                }
                for stats in self.query_stats.values()
                if stats.avg_time > self.slow_query_threshold
            ]
        
        # 按平均時間排序
        slow_queries.sort(key=lambda x: x['avg_time'], reverse=True)
        return slow_queries[:limit]
    
    def get_query_statistics(self) -> Dict[str, Any]:
        """
        獲取查詢統計
        
        Returns:
            統計信息
        """
        with self._lock:
            total_queries = sum(s.execution_count for s in self.query_stats.values())
            total_time = sum(s.total_time for s in self.query_stats.values())
            
            return {
                'unique_queries': len(self.query_stats),
                'total_executions': total_queries,
                'total_time': total_time,
                'avg_time': total_time / total_queries if total_queries > 0 else 0,
                'slow_query_count': len([s for s in self.query_stats.values() 
                                        if s.avg_time > self.slow_query_threshold])
            }
    
    def vacuum_database(self) -> Dict[str, Any]:
        """
        執行 VACUUM 優化數據庫
        
        Returns:
            優化結果
        """
        try:
            # 獲取優化前大小
            before_size = self.db_path.stat().st_size if self.db_path.exists() else 0
            
            with self.get_connection() as conn:
                conn.execute("VACUUM")
            
            # 獲取優化後大小
            after_size = self.db_path.stat().st_size if self.db_path.exists() else 0
            
            return {
                'success': True,
                'before_size': before_size,
                'after_size': after_size,
                'saved_bytes': before_size - after_size,
                'saved_percent': ((before_size - after_size) / before_size * 100) if before_size > 0 else 0
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_database(self) -> Dict[str, Any]:
        """
        執行 ANALYZE 更新統計信息
        
        Returns:
            分析結果
        """
        try:
            with self.get_connection() as conn:
                conn.execute("ANALYZE")
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_database_health(self) -> Dict[str, Any]:
        """
        獲取數據庫健康狀態
        
        Returns:
            健康狀態報告
        """
        health = {
            'status': 'healthy',
            'issues': [],
            'recommendations': [],
            'stats': {}
        }
        
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # 檢查完整性
                cursor.execute("PRAGMA integrity_check")
                integrity = cursor.fetchone()[0]
                if integrity != 'ok':
                    health['status'] = 'critical'
                    health['issues'].append(f"完整性檢查失敗: {integrity}")
                
                # 獲取頁面信息
                cursor.execute("PRAGMA page_count")
                page_count = cursor.fetchone()[0]
                
                cursor.execute("PRAGMA page_size")
                page_size = cursor.fetchone()[0]
                
                cursor.execute("PRAGMA freelist_count")
                freelist_count = cursor.fetchone()[0]
                
                health['stats'] = {
                    'page_count': page_count,
                    'page_size': page_size,
                    'database_size': page_count * page_size,
                    'freelist_pages': freelist_count,
                    'fragmentation_percent': (freelist_count / page_count * 100) if page_count > 0 else 0
                }
                
                # 檢查碎片化
                if health['stats']['fragmentation_percent'] > 20:
                    health['status'] = 'warning'
                    health['recommendations'].append("建議執行 VACUUM 減少碎片")
                
                # 檢查索引覆蓋
                index_recs = self.generate_index_recommendations()
                if len(index_recs) > 5:
                    if health['status'] == 'healthy':
                        health['status'] = 'warning'
                    health['recommendations'].append(f"建議創建 {len(index_recs)} 個索引以提升性能")
                
        except Exception as e:
            health['status'] = 'error'
            health['issues'].append(str(e))
        
        return health
    
    def optimize_all(self) -> Dict[str, Any]:
        """
        執行完整優化
        
        Returns:
            優化結果
        """
        results = {
            'timestamp': datetime.now().isoformat(),
            'steps': []
        }
        
        # 1. 創建索引
        logger.info("[DB Optimizer] Step 1: Creating indexes...")
        index_result = self.apply_all_recommended_indexes()
        results['steps'].append({
            'name': 'create_indexes',
            'result': index_result
        })
        
        # 2. 分析統計信息
        logger.info("[DB Optimizer] Step 2: Analyzing database...")
        analyze_result = self.analyze_database()
        results['steps'].append({
            'name': 'analyze',
            'result': analyze_result
        })
        
        # 3. VACUUM 優化
        logger.info("[DB Optimizer] Step 3: Vacuuming database...")
        vacuum_result = self.vacuum_database()
        results['steps'].append({
            'name': 'vacuum',
            'result': vacuum_result
        })
        
        # 4. 健康檢查
        logger.info("[DB Optimizer] Step 4: Health check...")
        health_result = self.get_database_health()
        results['steps'].append({
            'name': 'health_check',
            'result': health_result
        })
        
        logger.info("[DB Optimizer] Optimization complete!")
        return results


# 全局優化器實例
_optimizer_instance: Optional[DatabaseOptimizer] = None


def get_optimizer(db_path: Optional[Path] = None) -> DatabaseOptimizer:
    """獲取全局優化器實例"""
    global _optimizer_instance
    
    if _optimizer_instance is None:
        if db_path is None:
            db_path = Path(__file__).parent / "data" / "tgmatrix.db"
        _optimizer_instance = DatabaseOptimizer(db_path)
    
    return _optimizer_instance


def timed_query(func):
    """
    查詢計時裝飾器
    
    Usage:
        @timed_query
        def get_leads(db, status):
            return db.execute("SELECT * FROM leads WHERE status = ?", (status,))
    """
    import functools
    
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        try:
            result = func(*args, **kwargs)
            return result
        finally:
            elapsed = time.time() - start
            # 嘗試從 args 中提取查詢信息
            query_name = func.__name__
            try:
                optimizer = get_optimizer()
                optimizer.record_query(query_name, elapsed)
            except:
                pass
    
    return wrapper
