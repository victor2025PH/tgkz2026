"""
數據分析服務

功能：
1. 用戶行為分析
2. 收入趨勢統計
3. 轉化漏斗分析
4. 留存率計算
"""

import os
import sqlite3
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from enum import Enum
import threading

logger = logging.getLogger(__name__)


class MetricType(str, Enum):
    DAU = 'dau'                     # 日活躍用戶
    MAU = 'mau'                     # 月活躍用戶
    REVENUE = 'revenue'             # 收入
    NEW_USERS = 'new_users'         # 新用戶
    CONVERSIONS = 'conversions'     # 轉化數
    RETENTION = 'retention'         # 留存率
    CHURN = 'churn'                 # 流失率


@dataclass
class MetricPoint:
    """指標數據點"""
    date: str
    value: float
    change: float = 0  # 環比變化


class AnalyticsService:
    """數據分析服務"""
    
    _instance: Optional['AnalyticsService'] = None
    _lock = threading.Lock()
    
    def __new__(cls, db_path: str = None):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self, db_path: str = None):
        if self._initialized:
            return
        
        self.db_path = db_path or os.environ.get(
            'DB_PATH',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
        )
        
        self._init_db()
        self._initialized = True
        logger.info("AnalyticsService initialized")
    
    def _init_db(self):
        """初始化數據庫表"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 每日指標快照表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS daily_metrics (
                    date TEXT NOT NULL,
                    metric_type TEXT NOT NULL,
                    value REAL,
                    metadata TEXT,
                    created_at TEXT,
                    PRIMARY KEY (date, metric_type)
                )
            ''')
            
            # 用戶活動日誌表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_activity_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    page TEXT,
                    metadata TEXT,
                    created_at TEXT
                )
            ''')
            
            # 轉化事件表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS conversion_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    funnel_stage TEXT,
                    value INTEGER DEFAULT 0,
                    metadata TEXT,
                    created_at TEXT
                )
            ''')
            
            # 索引
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activity_log(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_activity_date ON user_activity_log(created_at)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_conversion_user ON conversion_events(user_id)')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Init analytics DB error: {e}")
    
    def _get_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    # ==================== 活動追蹤 ====================
    
    def track_activity(
        self,
        user_id: str,
        action: str,
        page: str = None,
        metadata: Dict = None
    ):
        """追蹤用戶活動"""
        try:
            db = self._get_db()
            import json
            
            db.execute('''
                INSERT INTO user_activity_log (user_id, action, page, metadata, created_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                user_id, action, page,
                json.dumps(metadata) if metadata else None,
                datetime.utcnow().isoformat()
            ))
            db.commit()
            db.close()
        except Exception as e:
            logger.warning(f"Track activity error: {e}")
    
    def track_conversion(
        self,
        user_id: str,
        event_type: str,
        funnel_stage: str = None,
        value: int = 0,
        metadata: Dict = None
    ):
        """追蹤轉化事件"""
        try:
            db = self._get_db()
            import json
            
            db.execute('''
                INSERT INTO conversion_events (user_id, event_type, funnel_stage, value, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                user_id, event_type, funnel_stage, value,
                json.dumps(metadata) if metadata else None,
                datetime.utcnow().isoformat()
            ))
            db.commit()
            db.close()
        except Exception as e:
            logger.warning(f"Track conversion error: {e}")
    
    # ==================== 用戶分析 ====================
    
    def get_dau(self, date: str = None) -> int:
        """獲取日活躍用戶數"""
        try:
            db = self._get_db()
            date = date or datetime.utcnow().strftime('%Y-%m-%d')
            
            row = db.execute('''
                SELECT COUNT(DISTINCT user_id) as dau
                FROM user_activity_log
                WHERE date(created_at) = ?
            ''', (date,)).fetchone()
            db.close()
            
            return row['dau'] if row else 0
        except:
            return 0
    
    def get_mau(self, year_month: str = None) -> int:
        """獲取月活躍用戶數"""
        try:
            db = self._get_db()
            if not year_month:
                year_month = datetime.utcnow().strftime('%Y-%m')
            
            row = db.execute('''
                SELECT COUNT(DISTINCT user_id) as mau
                FROM user_activity_log
                WHERE strftime('%Y-%m', created_at) = ?
            ''', (year_month,)).fetchone()
            db.close()
            
            return row['mau'] if row else 0
        except:
            return 0
    
    def get_user_growth(self, days: int = 30) -> List[Dict[str, Any]]:
        """獲取用戶增長趨勢"""
        try:
            db = self._get_db()
            start_date = (datetime.utcnow() - timedelta(days=days)).strftime('%Y-%m-%d')
            
            rows = db.execute('''
                SELECT date(created_at) as date, COUNT(*) as new_users
                FROM users
                WHERE date(created_at) >= ?
                GROUP BY date(created_at)
                ORDER BY date
            ''', (start_date,)).fetchall()
            db.close()
            
            return [{'date': row['date'], 'new_users': row['new_users']} for row in rows]
        except:
            return []
    
    def get_retention_rate(self, cohort_date: str, day_n: int) -> float:
        """計算 N 日留存率"""
        try:
            db = self._get_db()
            
            # 獲取該日期註冊的用戶
            cohort_users = db.execute('''
                SELECT id FROM users WHERE date(created_at) = ?
            ''', (cohort_date,)).fetchall()
            
            if not cohort_users:
                db.close()
                return 0
            
            cohort_size = len(cohort_users)
            user_ids = [u['id'] for u in cohort_users]
            
            # 檢查 N 天後的活躍情況
            target_date = (datetime.fromisoformat(cohort_date) + timedelta(days=day_n)).strftime('%Y-%m-%d')
            
            placeholders = ','.join('?' * len(user_ids))
            retained = db.execute(f'''
                SELECT COUNT(DISTINCT user_id) as count
                FROM user_activity_log
                WHERE user_id IN ({placeholders}) AND date(created_at) = ?
            ''', user_ids + [target_date]).fetchone()
            
            db.close()
            
            retention = retained['count'] / cohort_size if cohort_size > 0 else 0
            return round(retention * 100, 2)
        except:
            return 0
    
    # ==================== 收入分析 ====================
    
    def get_revenue_trend(self, days: int = 30) -> List[Dict[str, Any]]:
        """獲取收入趨勢"""
        try:
            db = self._get_db()
            start_date = (datetime.utcnow() - timedelta(days=days)).strftime('%Y-%m-%d')
            
            rows = db.execute('''
                SELECT date(created_at) as date, 
                       COALESCE(SUM(amount), 0) as revenue,
                       COUNT(*) as transactions
                FROM payment_intents
                WHERE state = 'completed' AND date(created_at) >= ?
                GROUP BY date(created_at)
                ORDER BY date
            ''', (start_date,)).fetchall()
            db.close()
            
            return [{
                'date': row['date'],
                'revenue': row['revenue'],
                'transactions': row['transactions']
            } for row in rows]
        except:
            return []
    
    def get_revenue_by_tier(self, days: int = 30) -> Dict[str, int]:
        """按等級統計收入"""
        try:
            db = self._get_db()
            start_date = (datetime.utcnow() - timedelta(days=days)).strftime('%Y-%m-%d')
            
            rows = db.execute('''
                SELECT u.subscription_tier as tier, COALESCE(SUM(p.amount), 0) as revenue
                FROM payment_intents p
                JOIN users u ON p.user_id = u.id
                WHERE p.state = 'completed' AND date(p.created_at) >= ?
                GROUP BY u.subscription_tier
            ''', (start_date,)).fetchall()
            db.close()
            
            return {row['tier'] or 'unknown': row['revenue'] for row in rows}
        except:
            return {}
    
    def get_arpu(self, month: str = None) -> float:
        """計算 ARPU（每用戶平均收入）"""
        try:
            db = self._get_db()
            if not month:
                month = datetime.utcnow().strftime('%Y-%m')
            
            # 月收入
            revenue_row = db.execute('''
                SELECT COALESCE(SUM(amount), 0) as revenue
                FROM payment_intents
                WHERE state = 'completed' AND strftime('%Y-%m', created_at) = ?
            ''', (month,)).fetchone()
            
            # 月活用戶
            mau = self.get_mau(month)
            
            db.close()
            
            if mau == 0:
                return 0
            
            return round(revenue_row['revenue'] / mau / 100, 2)  # 轉換為元
        except:
            return 0
    
    # ==================== 轉化漏斗 ====================
    
    def get_conversion_funnel(self, days: int = 30) -> Dict[str, Any]:
        """獲取轉化漏斗"""
        try:
            db = self._get_db()
            start_date = (datetime.utcnow() - timedelta(days=days)).strftime('%Y-%m-%d')
            
            # 定義漏斗階段
            stages = ['visit', 'signup', 'trial', 'purchase', 'upgrade']
            
            funnel = {}
            for stage in stages:
                row = db.execute('''
                    SELECT COUNT(DISTINCT user_id) as count
                    FROM conversion_events
                    WHERE funnel_stage = ? AND date(created_at) >= ?
                ''', (stage, start_date)).fetchone()
                funnel[stage] = row['count'] if row else 0
            
            db.close()
            
            # 計算轉化率
            rates = {}
            prev_count = None
            for stage, count in funnel.items():
                if prev_count is not None and prev_count > 0:
                    rates[f'{stage}_rate'] = round(count / prev_count * 100, 2)
                prev_count = count
            
            return {
                'stages': funnel,
                'conversion_rates': rates,
                'overall_rate': round(funnel.get('purchase', 0) / max(funnel.get('visit', 1), 1) * 100, 2)
            }
        except:
            return {'stages': {}, 'conversion_rates': {}, 'overall_rate': 0}
    
    # ==================== 儀表板數據 ====================
    
    def get_dashboard_summary(self) -> Dict[str, Any]:
        """獲取儀表板摘要"""
        try:
            db = self._get_db()
            today = datetime.utcnow().strftime('%Y-%m-%d')
            yesterday = (datetime.utcnow() - timedelta(days=1)).strftime('%Y-%m-%d')
            month_start = datetime.utcnow().replace(day=1).strftime('%Y-%m-%d')
            
            # 今日數據
            today_dau = self.get_dau(today)
            yesterday_dau = self.get_dau(yesterday)
            
            # 新用戶
            new_users_row = db.execute('''
                SELECT COUNT(*) as count FROM users WHERE date(created_at) = ?
            ''', (today,)).fetchone()
            new_users = new_users_row['count'] if new_users_row else 0
            
            # 月收入
            revenue_row = db.execute('''
                SELECT COALESCE(SUM(amount), 0) as revenue
                FROM payment_intents
                WHERE state = 'completed' AND date(created_at) >= ?
            ''', (month_start,)).fetchone()
            monthly_revenue = revenue_row['revenue'] if revenue_row else 0
            
            # 活躍訂閱
            active_subs = db.execute('''
                SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'
            ''').fetchone()
            
            # 總用戶
            total_users = db.execute('SELECT COUNT(*) as count FROM users').fetchone()
            
            db.close()
            
            return {
                'dau': {
                    'value': today_dau,
                    'change': round((today_dau - yesterday_dau) / max(yesterday_dau, 1) * 100, 1)
                },
                'new_users': {
                    'value': new_users
                },
                'monthly_revenue': {
                    'value': monthly_revenue,
                    'display': f'¥{monthly_revenue / 100:.2f}'
                },
                'active_subscriptions': {
                    'value': active_subs['count'] if active_subs else 0
                },
                'total_users': {
                    'value': total_users['count'] if total_users else 0
                },
                'arpu': {
                    'value': self.get_arpu()
                }
            }
        except Exception as e:
            logger.error(f"Get dashboard summary error: {e}")
            return {}
    
    def get_trend_data(self, metric: str, days: int = 30) -> List[Dict[str, Any]]:
        """獲取指標趨勢數據"""
        if metric == 'revenue':
            return self.get_revenue_trend(days)
        elif metric == 'users':
            return self.get_user_growth(days)
        else:
            return []
    
    # ==================== 報表生成 ====================
    
    def generate_weekly_report(self) -> Dict[str, Any]:
        """生成週報"""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=7)
            
            return {
                'period': {
                    'start': start_date.strftime('%Y-%m-%d'),
                    'end': end_date.strftime('%Y-%m-%d')
                },
                'summary': self.get_dashboard_summary(),
                'revenue_trend': self.get_revenue_trend(7),
                'user_growth': self.get_user_growth(7),
                'conversion_funnel': self.get_conversion_funnel(7),
                'revenue_by_tier': self.get_revenue_by_tier(7),
                'generated_at': datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Generate weekly report error: {e}")
            return {}


# ==================== 單例訪問 ====================

_analytics_service: Optional[AnalyticsService] = None


def get_analytics_service() -> AnalyticsService:
    """獲取分析服務"""
    global _analytics_service
    if _analytics_service is None:
        _analytics_service = AnalyticsService()
    return _analytics_service
