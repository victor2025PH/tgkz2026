"""
統一消費服務
Unified Consume Service

提供統一的消費接口，處理各種業務場景的扣費邏輯

優化設計：
1. 統一消費入口，確保所有扣費經過同一處理
2. 預扣費機制（先凍結，後確認）
3. 消費額度控制（單日/單筆限額）
4. 退款流程標準化
5. 消費與業務實體關聯
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from enum import Enum
from dataclasses import dataclass

from .wallet_service import get_wallet_service
from .models import ConsumeCategory, TransactionType

logger = logging.getLogger(__name__)


# 消費限額配置
CONSUME_LIMITS = {
    'default': {
        'single_max': 100000,      # 單筆上限 $1000
        'daily_max': 500000,       # 單日上限 $5000
        'password_threshold': 50000  # 超過 $500 需要密碼確認
    },
    'membership': {
        'single_max': 50000,       # 會員單筆上限 $500
        'daily_max': 50000,
        'password_threshold': 20000
    },
    'ip_proxy': {
        'single_max': 100000,      # IP 代理單筆上限 $1000
        'daily_max': 200000,
        'password_threshold': 50000
    },
    'quota_pack': {
        'single_max': 50000,
        'daily_max': 100000,
        'password_threshold': 20000
    }
}


class ConsumeError(Exception):
    """消費錯誤"""
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


@dataclass
class ConsumeRequest:
    """消費請求"""
    user_id: str
    amount: int                    # 金額（分）
    category: str                  # 消費類別
    description: str               # 消費描述
    reference_id: str = ""         # 業務關聯ID
    reference_type: str = ""       # 業務類型
    order_id: str = ""             # 業務訂單號
    metadata: Optional[Dict] = None  # 額外元數據
    skip_password: bool = False    # 跳過密碼驗證（內部調用）
    ip_address: str = ""           # 客戶端IP


@dataclass
class ConsumeResult:
    """消費結果"""
    success: bool
    message: str
    transaction_id: str = ""
    order_id: str = ""
    balance_before: int = 0
    balance_after: int = 0
    amount: int = 0
    bonus_used: int = 0
    requires_password: bool = False


class ConsumeService:
    """統一消費服務"""
    
    def __init__(self):
        self.wallet_service = get_wallet_service()
    
    def _get_limits(self, category: str) -> Dict[str, int]:
        """獲取消費限額"""
        return CONSUME_LIMITS.get(category, CONSUME_LIMITS['default'])
    
    def _check_limits(self, user_id: str, amount: int, category: str) -> Tuple[bool, str]:
        """
        檢查消費限額
        
        Returns:
            (passed, error_message)
        """
        limits = self._get_limits(category)
        
        # 檢查單筆限額
        if amount > limits['single_max']:
            max_display = f"${limits['single_max'] / 100:.2f}"
            return False, f"單筆消費超過上限 {max_display}"
        
        # 檢查單日限額
        today_consumed = self._get_today_consumed(user_id, category)
        if today_consumed + amount > limits['daily_max']:
            remaining = limits['daily_max'] - today_consumed
            remaining_display = f"${max(0, remaining) / 100:.2f}"
            return False, f"今日消費額度剩餘 {remaining_display}"
        
        return True, ""
    
    def _get_today_consumed(self, user_id: str, category: str = None) -> int:
        """獲取用戶今日消費金額"""
        conn = self.wallet_service._get_connection()
        cursor = conn.cursor()
        
        try:
            today_start = datetime.now().replace(
                hour=0, minute=0, second=0, microsecond=0
            ).isoformat()
            
            if category:
                cursor.execute('''
                    SELECT COALESCE(SUM(ABS(amount)), 0)
                    FROM wallet_transactions
                    WHERE user_id = ? 
                    AND type = 'consume'
                    AND category = ?
                    AND created_at >= ?
                ''', (user_id, category, today_start))
            else:
                cursor.execute('''
                    SELECT COALESCE(SUM(ABS(amount)), 0)
                    FROM wallet_transactions
                    WHERE user_id = ? 
                    AND type = 'consume'
                    AND created_at >= ?
                ''', (user_id, today_start))
            
            return cursor.fetchone()[0]
        finally:
            conn.close()
    
    def requires_password(self, user_id: str, amount: int, category: str) -> bool:
        """
        檢查是否需要密碼確認
        """
        limits = self._get_limits(category)
        return amount >= limits['password_threshold']
    
    def check_balance(self, user_id: str, amount: int) -> Dict[str, Any]:
        """
        檢查餘額是否足夠
        
        Returns:
            {
                sufficient: bool,
                available: int,
                required: int,
                shortfall: int,
                recommended_recharge: int
            }
        """
        wallet = self.wallet_service.get_or_create_wallet(user_id)
        available = wallet.available_balance
        shortfall = max(0, amount - available)
        
        # 計算推薦充值金額（向上取整到最近的充值檔位）
        recommended = 0
        if shortfall > 0:
            recharge_amounts = [500, 1000, 2000, 3000, 5000, 10000]  # 分
            for recharge in recharge_amounts:
                if recharge >= shortfall:
                    recommended = recharge
                    break
            if recommended == 0:
                recommended = ((shortfall // 5000) + 1) * 5000
        
        return {
            'sufficient': available >= amount,
            'available': available,
            'available_display': f"${available / 100:.2f}",
            'required': amount,
            'required_display': f"${amount / 100:.2f}",
            'shortfall': shortfall,
            'shortfall_display': f"${shortfall / 100:.2f}" if shortfall > 0 else "",
            'recommended_recharge': recommended,
            'recommended_display': f"${recommended / 100:.2f}" if recommended > 0 else ""
        }
    
    def consume(self, request: ConsumeRequest) -> ConsumeResult:
        """
        執行消費
        
        統一消費入口，所有業務消費都應調用此方法
        """
        # 1. 檢查限額
        passed, error = self._check_limits(
            request.user_id, request.amount, request.category
        )
        if not passed:
            return ConsumeResult(
                success=False,
                message=error,
                amount=request.amount
            )
        
        # 2. 檢查餘額
        balance_info = self.check_balance(request.user_id, request.amount)
        if not balance_info['sufficient']:
            return ConsumeResult(
                success=False,
                message=f"餘額不足，還需 {balance_info['shortfall_display']}",
                amount=request.amount,
                balance_before=balance_info['available']
            )
        
        # 3. 檢查是否需要密碼（由調用方處理）
        if not request.skip_password and self.requires_password(
            request.user_id, request.amount, request.category
        ):
            return ConsumeResult(
                success=False,
                message="需要密碼確認",
                requires_password=True,
                amount=request.amount
            )
        
        # 4. 執行扣費
        success, message, transaction = self.wallet_service.consume(
            user_id=request.user_id,
            amount=request.amount,
            category=request.category,
            description=request.description,
            order_id=request.order_id or None,
            reference_id=request.reference_id,
            reference_type=request.reference_type,
            ip_address=request.ip_address
        )
        
        if success and transaction:
            logger.info(
                f"Consume success: user={request.user_id}, "
                f"amount={request.amount}, category={request.category}, "
                f"tx={transaction.id}"
            )
            
            return ConsumeResult(
                success=True,
                message="消費成功",
                transaction_id=transaction.id,
                order_id=transaction.order_id,
                balance_before=transaction.balance_before,
                balance_after=transaction.balance_after,
                amount=abs(transaction.amount),
                bonus_used=abs(transaction.bonus_amount) if transaction.bonus_amount < 0 else 0
            )
        else:
            return ConsumeResult(
                success=False,
                message=message or "消費失敗",
                amount=request.amount
            )
    
    def refund(
        self,
        user_id: str,
        original_order_id: str,
        amount: int = None,
        reason: str = ""
    ) -> ConsumeResult:
        """
        退款
        
        Args:
            user_id: 用戶ID
            original_order_id: 原消費訂單號
            amount: 退款金額（默認全額）
            reason: 退款原因
        """
        success, message, transaction = self.wallet_service.refund(
            user_id=user_id,
            original_order_id=original_order_id,
            amount=amount,
            reason=reason
        )
        
        if success and transaction:
            return ConsumeResult(
                success=True,
                message="退款成功",
                transaction_id=transaction.id,
                order_id=transaction.order_id,
                balance_after=transaction.balance_after,
                amount=transaction.amount
            )
        else:
            return ConsumeResult(
                success=False,
                message=message or "退款失敗"
            )
    
    # ==================== 業務消費快捷方法 ====================
    
    def consume_for_membership(
        self,
        user_id: str,
        amount: int,
        plan_name: str,
        plan_id: str,
        duration_days: int,
        ip_address: str = ""
    ) -> ConsumeResult:
        """
        會員購買消費
        """
        return self.consume(ConsumeRequest(
            user_id=user_id,
            amount=amount,
            category=ConsumeCategory.MEMBERSHIP.value,
            description=f"購買 {plan_name} ({duration_days}天)",
            reference_id=plan_id,
            reference_type="membership_plan",
            ip_address=ip_address,
            skip_password=True  # 會員購買在前端已確認
        ))
    
    def consume_for_ip_proxy(
        self,
        user_id: str,
        amount: int,
        proxy_type: str,
        region: str,
        proxy_id: str,
        duration_days: int,
        ip_address: str = ""
    ) -> ConsumeResult:
        """
        IP 代理購買消費
        """
        return self.consume(ConsumeRequest(
            user_id=user_id,
            amount=amount,
            category=ConsumeCategory.IP_PROXY.value,
            description=f"購買 {region} {proxy_type} ({duration_days}天)",
            reference_id=proxy_id,
            reference_type="static_proxy",
            ip_address=ip_address,
            skip_password=True
        ))
    
    def consume_for_quota_pack(
        self,
        user_id: str,
        amount: int,
        pack_name: str,
        pack_id: str,
        quota_amount: int,
        ip_address: str = ""
    ) -> ConsumeResult:
        """
        配額包購買消費
        """
        return self.consume(ConsumeRequest(
            user_id=user_id,
            amount=amount,
            category=ConsumeCategory.QUOTA_PACK.value,
            description=f"購買 {pack_name} (+{quota_amount})",
            reference_id=pack_id,
            reference_type="quota_pack",
            ip_address=ip_address,
            skip_password=True
        ))
    
    # ==================== 統計查詢 ====================
    
    def get_consume_summary(self, user_id: str, days: int = 30) -> Dict[str, Any]:
        """獲取用戶消費摘要"""
        conn = self.wallet_service._get_connection()
        cursor = conn.cursor()
        
        try:
            start_date = (datetime.now() - timedelta(days=days)).isoformat()
            
            # 按類別統計
            cursor.execute('''
                SELECT 
                    category,
                    COUNT(*) as count,
                    COALESCE(SUM(ABS(amount)), 0) as total
                FROM wallet_transactions
                WHERE user_id = ?
                AND type = 'consume'
                AND created_at >= ?
                GROUP BY category
            ''', (user_id, start_date))
            
            by_category = {}
            total_amount = 0
            total_count = 0
            
            for row in cursor.fetchall():
                cat, count, total = row
                by_category[cat or 'other'] = {
                    'count': count,
                    'total': total,
                    'total_display': f"${total / 100:.2f}"
                }
                total_amount += total
                total_count += count
            
            return {
                'period_days': days,
                'total_amount': total_amount,
                'total_display': f"${total_amount / 100:.2f}",
                'total_count': total_count,
                'by_category': by_category,
                'today_consumed': self._get_today_consumed(user_id)
            }
            
        finally:
            conn.close()


# ==================== 全局實例 ====================

_consume_service: Optional[ConsumeService] = None


def get_consume_service() -> ConsumeService:
    """獲取消費服務實例"""
    global _consume_service
    if _consume_service is None:
        _consume_service = ConsumeService()
    return _consume_service
