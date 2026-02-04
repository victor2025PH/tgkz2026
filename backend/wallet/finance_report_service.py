"""
財務報表服務
Finance Report Service

提供：
1. 每日/每週/每月統計
2. 支付渠道分析
3. 收款地址使用報告
4. 趨勢分析
"""

import sqlite3
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from .recharge_service import get_recharge_service

logger = logging.getLogger(__name__)


class FinanceReportService:
    """財務報表服務"""
    
    def __init__(self, db_path: str = "wallet.db"):
        self.db_path = db_path
    
    def _get_connection(self) -> sqlite3.Connection:
        """獲取數據庫連接"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    # ==================== 概覽統計 ====================
    
    def get_dashboard_overview(self) -> Dict[str, Any]:
        """
        獲取儀表板概覽數據
        
        Returns:
            包含今日、本週、本月統計的字典
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            now = datetime.now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            week_start = (now - timedelta(days=now.weekday())).replace(
                hour=0, minute=0, second=0, microsecond=0
            ).isoformat()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
            
            # 今日統計
            today_stats = self._get_period_stats(cursor, today_start)
            
            # 本週統計
            week_stats = self._get_period_stats(cursor, week_start)
            
            # 本月統計
            month_stats = self._get_period_stats(cursor, month_start)
            
            # 待處理訂單
            cursor.execute('''
                SELECT COUNT(*) FROM recharge_orders WHERE status IN ('pending', 'paid')
            ''')
            pending_orders = cursor.fetchone()[0] or 0
            
            # 累計統計
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_orders,
                    COALESCE(SUM(CASE WHEN status = 'confirmed' THEN actual_amount ELSE 0 END), 0) as total_revenue
                FROM recharge_orders
            ''')
            row = cursor.fetchone()
            
            return {
                "today": {
                    **today_stats,
                    "label": "今日"
                },
                "week": {
                    **week_stats,
                    "label": "本週"
                },
                "month": {
                    **month_stats,
                    "label": "本月"
                },
                "pending_orders": pending_orders,
                "total_orders": row['total_orders'] if row else 0,
                "total_revenue": row['total_revenue'] / 100 if row else 0,
                "total_revenue_display": f"${(row['total_revenue'] or 0) / 100:.2f}" if row else "$0.00",
                "generated_at": now.isoformat()
            }
            
        finally:
            conn.close()
    
    def _get_period_stats(self, cursor, start_time: str) -> Dict[str, Any]:
        """獲取指定時間段的統計"""
        cursor.execute('''
            SELECT 
                COUNT(*) as order_count,
                COALESCE(SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END), 0) as confirmed_count,
                COALESCE(SUM(CASE WHEN status = 'confirmed' THEN actual_amount ELSE 0 END), 0) as confirmed_amount,
                COALESCE(SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END), 0) as expired_count
            FROM recharge_orders
            WHERE created_at >= ?
        ''', (start_time,))
        
        row = cursor.fetchone()
        
        confirmed_count = row['confirmed_count'] if row else 0
        order_count = row['order_count'] if row else 0
        confirmed_amount = row['confirmed_amount'] if row else 0
        
        return {
            "order_count": order_count,
            "confirmed_count": confirmed_count,
            "confirmed_amount": confirmed_amount / 100,
            "confirmed_amount_display": f"${confirmed_amount / 100:.2f}",
            "expired_count": row['expired_count'] if row else 0,
            "conversion_rate": round(confirmed_count / order_count * 100, 1) if order_count > 0 else 0
        }
    
    # ==================== 支付渠道分析 ====================
    
    def get_channel_analysis(self, days: int = 30) -> Dict[str, Any]:
        """
        獲取支付渠道分析
        
        Args:
            days: 分析天數
            
        Returns:
            各渠道使用情況
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            start_time = (datetime.now() - timedelta(days=days)).isoformat()
            
            cursor.execute('''
                SELECT 
                    payment_method,
                    COUNT(*) as order_count,
                    COALESCE(SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END), 0) as confirmed_count,
                    COALESCE(SUM(CASE WHEN status = 'confirmed' THEN actual_amount ELSE 0 END), 0) as confirmed_amount
                FROM recharge_orders
                WHERE created_at >= ?
                GROUP BY payment_method
                ORDER BY confirmed_amount DESC
            ''', (start_time,))
            
            channels = []
            total_amount = 0
            
            for row in cursor.fetchall():
                amount = row['confirmed_amount'] or 0
                total_amount += amount
                
                channels.append({
                    "channel": row['payment_method'],
                    "order_count": row['order_count'],
                    "confirmed_count": row['confirmed_count'],
                    "confirmed_amount": amount / 100,
                    "confirmed_amount_display": f"${amount / 100:.2f}"
                })
            
            # 計算佔比
            for channel in channels:
                channel['share'] = round(
                    channel['confirmed_amount'] / (total_amount / 100) * 100, 1
                ) if total_amount > 0 else 0
            
            return {
                "period_days": days,
                "channels": channels,
                "total_amount": total_amount / 100,
                "total_amount_display": f"${total_amount / 100:.2f}"
            }
            
        finally:
            conn.close()
    
    # ==================== 每日趨勢 ====================
    
    def get_daily_trend(self, days: int = 14) -> Dict[str, Any]:
        """
        獲取每日趨勢數據
        
        Args:
            days: 趨勢天數
            
        Returns:
            每日統計數據
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            trend_data = []
            
            for i in range(days - 1, -1, -1):
                date = datetime.now() - timedelta(days=i)
                date_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
                date_end = date_start + timedelta(days=1)
                
                cursor.execute('''
                    SELECT 
                        COUNT(*) as order_count,
                        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END), 0) as confirmed_count,
                        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN actual_amount ELSE 0 END), 0) as confirmed_amount
                    FROM recharge_orders
                    WHERE created_at >= ? AND created_at < ?
                ''', (date_start.isoformat(), date_end.isoformat()))
                
                row = cursor.fetchone()
                
                trend_data.append({
                    "date": date_start.strftime('%Y-%m-%d'),
                    "date_short": date_start.strftime('%m/%d'),
                    "order_count": row['order_count'] if row else 0,
                    "confirmed_count": row['confirmed_count'] if row else 0,
                    "confirmed_amount": (row['confirmed_amount'] or 0) / 100
                })
            
            return {
                "period_days": days,
                "data": trend_data
            }
            
        finally:
            conn.close()
    
    # ==================== 收款地址報告 ====================
    
    def get_address_usage_report(self) -> Dict[str, Any]:
        """
        獲取收款地址使用報告
        
        Returns:
            地址使用統計
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # 檢查 payment_addresses 表是否存在
            cursor.execute('''
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='payment_addresses'
            ''')
            
            if not cursor.fetchone():
                return {
                    "addresses": [],
                    "summary": {
                        "total": 0,
                        "active": 0,
                        "disabled": 0,
                        "total_received": 0
                    }
                }
            
            cursor.execute('''
                SELECT 
                    id, network, address, label, status,
                    usage_count, total_received, last_used_at
                FROM payment_addresses
                WHERE deleted_at IS NULL
                ORDER BY total_received DESC
            ''')
            
            addresses = []
            total_active = 0
            total_disabled = 0
            total_received = 0.0
            
            for row in cursor.fetchall():
                addr = dict(row)
                addr['address_masked'] = addr['address'][:8] + '...' + addr['address'][-6:]
                addresses.append(addr)
                
                if addr['status'] == 'active':
                    total_active += 1
                else:
                    total_disabled += 1
                
                total_received += addr['total_received'] or 0
            
            return {
                "addresses": addresses,
                "summary": {
                    "total": len(addresses),
                    "active": total_active,
                    "disabled": total_disabled,
                    "total_received": total_received,
                    "total_received_display": f"${total_received:.2f}"
                }
            }
            
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
