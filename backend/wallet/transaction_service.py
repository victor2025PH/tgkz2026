"""
交易流水服務
Transaction Service

提供交易記錄的查詢、統計、導出等功能

優化設計：
1. 支持多維度查詢（類型、時間、狀態）
2. 支持分頁和排序
3. 提供消費分析統計
4. 支持 CSV 導出
"""

import csv
import io
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from pathlib import Path

from .models import Transaction, TransactionType, TransactionStatus, ConsumeCategory
from .wallet_service import get_wallet_service

logger = logging.getLogger(__name__)


class TransactionService:
    """交易流水服務"""
    
    def __init__(self):
        self.wallet_service = get_wallet_service()
    
    def get_transactions(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        type_filter: str = None,
        category_filter: str = None,
        status_filter: str = None,
        start_date: str = None,
        end_date: str = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Dict[str, Any]:
        """
        獲取交易記錄（增強版）
        
        Returns:
            {
                "transactions": [...],
                "pagination": {...},
                "summary": {...}
            }
        """
        conn = self.wallet_service._get_connection()
        cursor = conn.cursor()
        
        try:
            conditions = ["user_id = ?"]
            params = [user_id]
            
            if type_filter:
                conditions.append("type = ?")
                params.append(type_filter)
            
            if category_filter:
                conditions.append("category = ?")
                params.append(category_filter)
            
            if status_filter:
                conditions.append("status = ?")
                params.append(status_filter)
            
            if start_date:
                conditions.append("created_at >= ?")
                params.append(start_date)
            
            if end_date:
                conditions.append("created_at <= ?")
                params.append(end_date)
            
            where_clause = " AND ".join(conditions)
            
            # 驗證排序字段
            valid_sort_fields = ["created_at", "amount", "type"]
            if sort_by not in valid_sort_fields:
                sort_by = "created_at"
            sort_direction = "DESC" if sort_order.lower() == "desc" else "ASC"
            
            # 獲取總數
            cursor.execute(
                f'SELECT COUNT(*) FROM wallet_transactions WHERE {where_clause}',
                params
            )
            total = cursor.fetchone()[0]
            
            # 計算分頁
            total_pages = (total + page_size - 1) // page_size
            offset = (page - 1) * page_size
            
            # 獲取分頁數據
            cursor.execute(f'''
                SELECT * FROM wallet_transactions 
                WHERE {where_clause}
                ORDER BY {sort_by} {sort_direction}
                LIMIT ? OFFSET ?
            ''', params + [page_size, offset])
            
            transactions = [
                Transaction(**dict(row)).to_dict() 
                for row in cursor.fetchall()
            ]
            
            # 計算摘要
            cursor.execute(f'''
                SELECT 
                    COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_in,
                    COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_out
                FROM wallet_transactions 
                WHERE {where_clause} AND status = 'success'
            ''', params)
            
            summary_row = cursor.fetchone()
            
            return {
                "transactions": transactions,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "total_pages": total_pages,
                    "has_next": page < total_pages,
                    "has_prev": page > 1,
                },
                "summary": {
                    "total_in": summary_row[0] if summary_row else 0,
                    "total_out": summary_row[1] if summary_row else 0,
                    "total_in_display": f"${summary_row[0] / 100:.2f}" if summary_row else "$0.00",
                    "total_out_display": f"${summary_row[1] / 100:.2f}" if summary_row else "$0.00",
                }
            }
            
        finally:
            conn.close()
    
    def get_consume_analysis(
        self,
        user_id: str,
        start_date: str = None,
        end_date: str = None
    ) -> Dict[str, Any]:
        """
        獲取消費分析
        
        Returns:
            按類目分組的消費統計
        """
        conn = self.wallet_service._get_connection()
        cursor = conn.cursor()
        
        try:
            # 默認本月
            if not start_date:
                start_date = datetime.now().replace(day=1, hour=0, minute=0, second=0).isoformat()
            if not end_date:
                end_date = datetime.now().isoformat()
            
            # 按類目統計
            cursor.execute('''
                SELECT 
                    category,
                    COUNT(*) as count,
                    SUM(ABS(amount)) as total
                FROM wallet_transactions
                WHERE user_id = ? 
                    AND type = 'consume' 
                    AND status = 'success'
                    AND created_at >= ?
                    AND created_at <= ?
                GROUP BY category
                ORDER BY total DESC
            ''', (user_id, start_date, end_date))
            
            by_category = []
            total_consumed = 0
            
            for row in cursor.fetchall():
                amount = row[2] or 0
                total_consumed += amount
                by_category.append({
                    "category": row[0] or "other",
                    "category_name": self._get_category_name(row[0]),
                    "count": row[1],
                    "amount": amount,
                    "amount_display": f"${amount / 100:.2f}",
                })
            
            # 計算百分比
            for item in by_category:
                item["percent"] = round(item["amount"] / total_consumed * 100, 1) if total_consumed > 0 else 0
            
            # 按日期統計
            cursor.execute('''
                SELECT 
                    DATE(created_at) as date,
                    SUM(ABS(amount)) as total
                FROM wallet_transactions
                WHERE user_id = ? 
                    AND type = 'consume' 
                    AND status = 'success'
                    AND created_at >= ?
                    AND created_at <= ?
                GROUP BY DATE(created_at)
                ORDER BY date ASC
            ''', (user_id, start_date, end_date))
            
            by_date = [
                {
                    "date": row[0],
                    "amount": row[1] or 0,
                    "amount_display": f"${(row[1] or 0) / 100:.2f}",
                }
                for row in cursor.fetchall()
            ]
            
            return {
                "period": {
                    "start": start_date,
                    "end": end_date,
                },
                "total_consumed": total_consumed,
                "total_display": f"${total_consumed / 100:.2f}",
                "by_category": by_category,
                "by_date": by_date,
            }
            
        finally:
            conn.close()
    
    def _get_category_name(self, category: str) -> str:
        """獲取類目名稱"""
        names = {
            "membership": "會員服務",
            "ip_proxy": "靜態 IP",
            "quota_pack": "配額包",
            "other": "其他",
        }
        return names.get(category, category or "其他")
    
    def get_monthly_summary(self, user_id: str, months: int = 6) -> List[Dict[str, Any]]:
        """
        獲取月度摘要
        
        Args:
            user_id: 用戶ID
            months: 最近幾個月
            
        Returns:
            月度收支統計列表
        """
        conn = self.wallet_service._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT 
                    strftime('%Y-%m', created_at) as month,
                    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
                    SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expense,
                    COUNT(*) as transaction_count
                FROM wallet_transactions
                WHERE user_id = ? 
                    AND status = 'success'
                    AND created_at >= date('now', ? || ' months')
                GROUP BY strftime('%Y-%m', created_at)
                ORDER BY month DESC
            ''', (user_id, -months))
            
            return [
                {
                    "month": row[0],
                    "income": row[1] or 0,
                    "income_display": f"${(row[1] or 0) / 100:.2f}",
                    "expense": row[2] or 0,
                    "expense_display": f"${(row[2] or 0) / 100:.2f}",
                    "net": (row[1] or 0) - (row[2] or 0),
                    "transaction_count": row[3],
                }
                for row in cursor.fetchall()
            ]
            
        finally:
            conn.close()
    
    def get_recent_transactions(self, user_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """獲取最近交易"""
        result = self.get_transactions(user_id, page=1, page_size=limit)
        return result["transactions"]
    
    def export_to_csv(
        self,
        user_id: str,
        start_date: str = None,
        end_date: str = None
    ) -> str:
        """
        導出交易記錄為 CSV
        
        Returns:
            CSV 內容字符串
        """
        conn = self.wallet_service._get_connection()
        cursor = conn.cursor()
        
        try:
            conditions = ["user_id = ?"]
            params = [user_id]
            
            if start_date:
                conditions.append("created_at >= ?")
                params.append(start_date)
            
            if end_date:
                conditions.append("created_at <= ?")
                params.append(end_date)
            
            where_clause = " AND ".join(conditions)
            
            cursor.execute(f'''
                SELECT * FROM wallet_transactions 
                WHERE {where_clause}
                ORDER BY created_at DESC
            ''', params)
            
            rows = cursor.fetchall()
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            # 表頭
            writer.writerow([
                "訂單號", "類型", "金額", "贈送金額", "交易前餘額", "交易後餘額",
                "類目", "描述", "狀態", "創建時間", "完成時間"
            ])
            
            type_names = {
                "recharge": "充值",
                "consume": "消費",
                "refund": "退款",
                "withdraw": "提現",
                "bonus": "贈送",
                "adjust": "調賬",
            }
            
            status_names = {
                "pending": "處理中",
                "success": "成功",
                "failed": "失敗",
                "cancelled": "已取消",
                "refunded": "已退款",
            }
            
            for row in rows:
                row = dict(row)
                writer.writerow([
                    row.get("order_id", ""),
                    type_names.get(row.get("type"), row.get("type")),
                    f"${row.get('amount', 0) / 100:.2f}",
                    f"${row.get('bonus_amount', 0) / 100:.2f}",
                    f"${row.get('balance_before', 0) / 100:.2f}",
                    f"${row.get('balance_after', 0) / 100:.2f}",
                    self._get_category_name(row.get("category")),
                    row.get("description", ""),
                    status_names.get(row.get("status"), row.get("status")),
                    row.get("created_at", ""),
                    row.get("completed_at", ""),
                ])
            
            return output.getvalue()
            
        finally:
            conn.close()


# ==================== 全局實例 ====================

_transaction_service: Optional[TransactionService] = None


def get_transaction_service() -> TransactionService:
    """獲取交易服務實例"""
    global _transaction_service
    if _transaction_service is None:
        _transaction_service = TransactionService()
    return _transaction_service
