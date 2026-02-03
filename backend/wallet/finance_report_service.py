"""
財務報表服務
Finance Report Service

功能：
1. 日報/週報/月報
2. 收入支出統計
3. 用戶消費分析
4. 趨勢圖表數據
5. 導出功能
"""

import os
import logging
import threading
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class DailyReport:
    """日報"""
    date: str
    recharge_count: int = 0
    recharge_amount: int = 0
    consume_count: int = 0
    consume_amount: int = 0
    withdraw_count: int = 0
    withdraw_amount: int = 0
    refund_count: int = 0
    refund_amount: int = 0
    new_users: int = 0
    active_users: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "date": self.date,
            "recharge": {
                "count": self.recharge_count,
                "amount": self.recharge_amount,
                "display": f"${self.recharge_amount / 100:.2f}"
            },
            "consume": {
                "count": self.consume_count,
                "amount": self.consume_amount,
                "display": f"${self.consume_amount / 100:.2f}"
            },
            "withdraw": {
                "count": self.withdraw_count,
                "amount": self.withdraw_amount,
                "display": f"${self.withdraw_amount / 100:.2f}"
            },
            "refund": {
                "count": self.refund_count,
                "amount": self.refund_amount,
                "display": f"${self.refund_amount / 100:.2f}"
            },
            "users": {
                "new": self.new_users,
                "active": self.active_users
            },
            "net_income": self.recharge_amount - self.withdraw_amount - self.refund_amount,
            "net_income_display": f"${(self.recharge_amount - self.withdraw_amount - self.refund_amount) / 100:.2f}"
        }


class FinanceReportService:
    """財務報表服務"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self, db_path: str = None):
        if hasattr(self, '_initialized') and self._initialized:
            return
        
        import sqlite3
        self.db_path = db_path or os.path.join(
            os.path.dirname(__file__), '..', 'data', 'wallet.db'
        )
        self._initialized = True
        logger.info("FinanceReportService initialized")
    
    def _get_connection(self):
        import sqlite3
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    # ==================== 總覽統計 ====================
    
    def get_overview(self) -> Dict[str, Any]:
        """獲取財務總覽"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # 總餘額
            cursor.execute('''
                SELECT 
                    COALESCE(SUM(balance), 0) as total_balance,
                    COALESCE(SUM(bonus_balance), 0) as total_bonus,
                    COALESCE(SUM(frozen_balance), 0) as total_frozen,
                    COUNT(*) as total_wallets
                FROM user_wallets
            ''')
            wallet_row = cursor.fetchone()
            
            # 總充值
            cursor.execute('''
                SELECT 
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total
                FROM recharge_orders
                WHERE status = 'confirmed'
            ''')
            recharge_row = cursor.fetchone()
            
            # 總消費
            cursor.execute('''
                SELECT 
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total
                FROM wallet_transactions
                WHERE trans_type = 'consume' AND status = 'completed'
            ''')
            consume_row = cursor.fetchone()
            
            # 總提現
            try:
                cursor.execute('''
                    SELECT 
                        COUNT(*) as count,
                        COALESCE(SUM(amount), 0) as total
                    FROM withdraw_orders
                    WHERE status = 'completed'
                ''')
                withdraw_row = cursor.fetchone()
            except:
                withdraw_row = {'count': 0, 'total': 0}
            
            return {
                "wallet": {
                    "total_balance": dict(wallet_row)['total_balance'] if wallet_row else 0,
                    "total_bonus": dict(wallet_row)['total_bonus'] if wallet_row else 0,
                    "total_frozen": dict(wallet_row)['total_frozen'] if wallet_row else 0,
                    "total_wallets": dict(wallet_row)['total_wallets'] if wallet_row else 0
                },
                "recharge": {
                    "count": dict(recharge_row)['count'] if recharge_row else 0,
                    "total": dict(recharge_row)['total'] if recharge_row else 0
                },
                "consume": {
                    "count": dict(consume_row)['count'] if consume_row else 0,
                    "total": dict(consume_row)['total'] if consume_row else 0
                },
                "withdraw": {
                    "count": dict(withdraw_row)['count'] if withdraw_row else 0,
                    "total": dict(withdraw_row)['total'] if withdraw_row else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Get overview error: {e}")
            return {}
        finally:
            conn.close()
    
    # ==================== 日報 ====================
    
    def get_daily_report(self, date: str = None) -> DailyReport:
        """獲取日報"""
        if not date:
            date = datetime.now().strftime('%Y-%m-%d')
        
        date_start = f"{date}T00:00:00"
        date_end = f"{date}T23:59:59"
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            report = DailyReport(date=date)
            
            # 充值統計
            cursor.execute('''
                SELECT 
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total
                FROM recharge_orders
                WHERE status = 'confirmed'
                AND confirmed_at >= ? AND confirmed_at <= ?
            ''', (date_start, date_end))
            row = cursor.fetchone()
            if row:
                row = dict(row)
                report.recharge_count = row['count']
                report.recharge_amount = row['total']
            
            # 消費統計
            cursor.execute('''
                SELECT 
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total
                FROM wallet_transactions
                WHERE trans_type = 'consume' AND status = 'completed'
                AND created_at >= ? AND created_at <= ?
            ''', (date_start, date_end))
            row = cursor.fetchone()
            if row:
                row = dict(row)
                report.consume_count = row['count']
                report.consume_amount = row['total']
            
            # 提現統計
            try:
                cursor.execute('''
                    SELECT 
                        COUNT(*) as count,
                        COALESCE(SUM(amount), 0) as total
                    FROM withdraw_orders
                    WHERE status = 'completed'
                    AND completed_at >= ? AND completed_at <= ?
                ''', (date_start, date_end))
                row = cursor.fetchone()
                if row:
                    row = dict(row)
                    report.withdraw_count = row['count']
                    report.withdraw_amount = row['total']
            except:
                pass
            
            # 退款統計
            cursor.execute('''
                SELECT 
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total
                FROM wallet_transactions
                WHERE trans_type = 'refund' AND status = 'completed'
                AND created_at >= ? AND created_at <= ?
            ''', (date_start, date_end))
            row = cursor.fetchone()
            if row:
                row = dict(row)
                report.refund_count = row['count']
                report.refund_amount = row['total']
            
            # 新用戶數
            cursor.execute('''
                SELECT COUNT(DISTINCT user_id) as count
                FROM user_wallets
                WHERE created_at >= ? AND created_at <= ?
            ''', (date_start, date_end))
            row = cursor.fetchone()
            if row:
                report.new_users = dict(row)['count']
            
            # 活躍用戶數
            cursor.execute('''
                SELECT COUNT(DISTINCT user_id) as count
                FROM wallet_transactions
                WHERE created_at >= ? AND created_at <= ?
            ''', (date_start, date_end))
            row = cursor.fetchone()
            if row:
                report.active_users = dict(row)['count']
            
            return report
            
        except Exception as e:
            logger.error(f"Get daily report error: {e}")
            return DailyReport(date=date)
        finally:
            conn.close()
    
    # ==================== 趨勢數據 ====================
    
    def get_trend_data(
        self,
        days: int = 7,
        metric: str = "recharge"
    ) -> List[Dict[str, Any]]:
        """獲取趨勢數據"""
        result = []
        
        for i in range(days - 1, -1, -1):
            date = (datetime.now() - timedelta(days=i)).strftime('%Y-%m-%d')
            report = self.get_daily_report(date)
            
            if metric == "recharge":
                result.append({
                    "date": date,
                    "value": report.recharge_amount,
                    "count": report.recharge_count
                })
            elif metric == "consume":
                result.append({
                    "date": date,
                    "value": report.consume_amount,
                    "count": report.consume_count
                })
            elif metric == "withdraw":
                result.append({
                    "date": date,
                    "value": report.withdraw_amount,
                    "count": report.withdraw_count
                })
            elif metric == "users":
                result.append({
                    "date": date,
                    "new": report.new_users,
                    "active": report.active_users
                })
            else:
                result.append({
                    "date": date,
                    "recharge": report.recharge_amount,
                    "consume": report.consume_amount,
                    "withdraw": report.withdraw_amount
                })
        
        return result
    
    # ==================== 分類統計 ====================
    
    def get_consume_by_category(
        self,
        start_date: str = None,
        end_date: str = None
    ) -> List[Dict[str, Any]]:
        """按分類統計消費"""
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        if not end_date:
            end_date = datetime.now().strftime('%Y-%m-%d')
        
        date_start = f"{start_date}T00:00:00"
        date_end = f"{end_date}T23:59:59"
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT 
                    category,
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total
                FROM wallet_transactions
                WHERE trans_type = 'consume' AND status = 'completed'
                AND created_at >= ? AND created_at <= ?
                GROUP BY category
                ORDER BY total DESC
            ''', (date_start, date_end))
            
            result = []
            for row in cursor.fetchall():
                row = dict(row)
                result.append({
                    "category": row['category'] or '其他',
                    "count": row['count'],
                    "amount": row['total'],
                    "display": f"${row['total'] / 100:.2f}"
                })
            
            return result
            
        except Exception as e:
            logger.error(f"Get consume by category error: {e}")
            return []
        finally:
            conn.close()
    
    def get_top_users(
        self,
        metric: str = "consume",
        limit: int = 10,
        start_date: str = None,
        end_date: str = None
    ) -> List[Dict[str, Any]]:
        """獲取 Top 用戶"""
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        if not end_date:
            end_date = datetime.now().strftime('%Y-%m-%d')
        
        date_start = f"{start_date}T00:00:00"
        date_end = f"{end_date}T23:59:59"
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            if metric == "consume":
                cursor.execute('''
                    SELECT 
                        user_id,
                        COUNT(*) as count,
                        COALESCE(SUM(amount), 0) as total
                    FROM wallet_transactions
                    WHERE trans_type = 'consume' AND status = 'completed'
                    AND created_at >= ? AND created_at <= ?
                    GROUP BY user_id
                    ORDER BY total DESC
                    LIMIT ?
                ''', (date_start, date_end, limit))
            else:
                cursor.execute('''
                    SELECT 
                        user_id,
                        COUNT(*) as count,
                        COALESCE(SUM(amount), 0) as total
                    FROM recharge_orders
                    WHERE status = 'confirmed'
                    AND confirmed_at >= ? AND confirmed_at <= ?
                    GROUP BY user_id
                    ORDER BY total DESC
                    LIMIT ?
                ''', (date_start, date_end, limit))
            
            result = []
            rank = 1
            for row in cursor.fetchall():
                row = dict(row)
                result.append({
                    "rank": rank,
                    "user_id": row['user_id'],
                    "count": row['count'],
                    "amount": row['total'],
                    "display": f"${row['total'] / 100:.2f}"
                })
                rank += 1
            
            return result
            
        except Exception as e:
            logger.error(f"Get top users error: {e}")
            return []
        finally:
            conn.close()
    
    # ==================== 月度匯總 ====================
    
    def get_monthly_summary(self, year: int = None, month: int = None) -> Dict[str, Any]:
        """獲取月度匯總"""
        if not year:
            year = datetime.now().year
        if not month:
            month = datetime.now().month
        
        # 計算月份範圍
        month_start = f"{year}-{month:02d}-01T00:00:00"
        if month == 12:
            next_month = f"{year + 1}-01-01T00:00:00"
        else:
            next_month = f"{year}-{month + 1:02d}-01T00:00:00"
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # 充值匯總
            cursor.execute('''
                SELECT 
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total,
                    COALESCE(SUM(bonus_amount), 0) as bonus
                FROM recharge_orders
                WHERE status = 'confirmed'
                AND confirmed_at >= ? AND confirmed_at < ?
            ''', (month_start, next_month))
            recharge = dict(cursor.fetchone() or {})
            
            # 消費匯總
            cursor.execute('''
                SELECT 
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total
                FROM wallet_transactions
                WHERE trans_type = 'consume' AND status = 'completed'
                AND created_at >= ? AND created_at < ?
            ''', (month_start, next_month))
            consume = dict(cursor.fetchone() or {})
            
            # 提現匯總
            try:
                cursor.execute('''
                    SELECT 
                        COUNT(*) as count,
                        COALESCE(SUM(amount), 0) as total,
                        COALESCE(SUM(fee), 0) as fee
                    FROM withdraw_orders
                    WHERE status = 'completed'
                    AND completed_at >= ? AND completed_at < ?
                ''', (month_start, next_month))
                withdraw = dict(cursor.fetchone() or {})
            except:
                withdraw = {'count': 0, 'total': 0, 'fee': 0}
            
            # 退款匯總
            cursor.execute('''
                SELECT 
                    COUNT(*) as count,
                    COALESCE(SUM(amount), 0) as total
                FROM wallet_transactions
                WHERE trans_type = 'refund' AND status = 'completed'
                AND created_at >= ? AND created_at < ?
            ''', (month_start, next_month))
            refund = dict(cursor.fetchone() or {})
            
            # 新增用戶
            cursor.execute('''
                SELECT COUNT(DISTINCT user_id) as count
                FROM user_wallets
                WHERE created_at >= ? AND created_at < ?
            ''', (month_start, next_month))
            new_users = dict(cursor.fetchone() or {}).get('count', 0)
            
            return {
                "year": year,
                "month": month,
                "period": f"{year}-{month:02d}",
                "recharge": {
                    "count": recharge.get('count', 0),
                    "amount": recharge.get('total', 0),
                    "bonus": recharge.get('bonus', 0)
                },
                "consume": {
                    "count": consume.get('count', 0),
                    "amount": consume.get('total', 0)
                },
                "withdraw": {
                    "count": withdraw.get('count', 0),
                    "amount": withdraw.get('total', 0),
                    "fee": withdraw.get('fee', 0)
                },
                "refund": {
                    "count": refund.get('count', 0),
                    "amount": refund.get('total', 0)
                },
                "new_users": new_users,
                "net_income": (
                    recharge.get('total', 0) -
                    withdraw.get('total', 0) -
                    refund.get('total', 0)
                )
            }
            
        except Exception as e:
            logger.error(f"Get monthly summary error: {e}")
            return {}
        finally:
            conn.close()


# ==================== 全局實例 ====================

_finance_report_service: Optional[FinanceReportService] = None


def get_finance_report_service() -> FinanceReportService:
    """獲取財務報表服務實例"""
    global _finance_report_service
    if _finance_report_service is None:
        _finance_report_service = FinanceReportService()
    return _finance_report_service
