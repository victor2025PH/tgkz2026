"""
批量錢包操作服務
Batch Wallet Operations Service

Phase 3.1: 批量用戶錢包操作
- 批量調賬
- 批量凍結/解凍
- 批量發放獎勵
- 批量導入/導出

Phase 3.4: 營銷活動支持
- 活動獎勵發放
- 優惠券批量發放
- 活動統計

優化設計：
1. 事務性批量處理
2. 失敗重試機制
3. 操作進度追蹤
4. 操作日誌記錄
"""

import os
import uuid
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum
import threading

from .wallet_service import get_wallet_service
from .models import WalletStatus, TransactionType

logger = logging.getLogger(__name__)


class BatchOperationType(Enum):
    """批量操作類型"""
    ADJUST_BALANCE = 'adjust_balance'       # 批量調賬
    GRANT_BONUS = 'grant_bonus'             # 批量發獎勵
    FREEZE = 'freeze'                       # 批量凍結
    UNFREEZE = 'unfreeze'                   # 批量解凍
    CAMPAIGN_REWARD = 'campaign_reward'     # 營銷活動獎勵


class BatchOperationStatus(Enum):
    """批量操作狀態"""
    PENDING = 'pending'
    RUNNING = 'running'
    COMPLETED = 'completed'
    FAILED = 'failed'
    CANCELLED = 'cancelled'


@dataclass
class BatchOperation:
    """批量操作記錄"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    type: str = ''
    total_count: int = 0
    success_count: int = 0
    failed_count: int = 0
    status: str = BatchOperationStatus.PENDING.value
    operator_id: str = ''
    description: str = ''
    params: Dict = field(default_factory=dict)
    results: List[Dict] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    completed_at: str = ''
    error_message: str = ''


class BatchOperationService:
    """批量操作服務"""
    
    def __init__(self):
        self.wallet_service = get_wallet_service()
        self._operations: Dict[str, BatchOperation] = {}
        self._lock = threading.Lock()
    
    def _get_connection(self):
        """獲取數據庫連接"""
        return self.wallet_service._get_connection()
    
    # ==================== 批量調賬 ====================
    
    async def batch_adjust_balance(
        self,
        user_ids: List[str],
        amount: int,
        reason: str,
        operator_id: str,
        is_bonus: bool = False
    ) -> BatchOperation:
        """
        批量調賬
        
        Args:
            user_ids: 用戶ID列表
            amount: 調賬金額（正數加款，負數扣款）
            reason: 調賬原因
            operator_id: 操作人ID
            is_bonus: 是否為贈送餘額
        """
        operation = BatchOperation(
            type=BatchOperationType.ADJUST_BALANCE.value,
            total_count=len(user_ids),
            operator_id=operator_id,
            description=f"批量調賬 ${amount/100:.2f}: {reason}",
            params={'amount': amount, 'reason': reason, 'is_bonus': is_bonus}
        )
        
        with self._lock:
            self._operations[operation.id] = operation
        
        operation.status = BatchOperationStatus.RUNNING.value
        
        for user_id in user_ids:
            try:
                if amount > 0:
                    # 加款
                    if is_bonus:
                        success, msg, tx = self.wallet_service.add_balance(
                            user_id=user_id,
                            amount=0,
                            bonus_amount=amount,
                            order_id=f"BATCH_{operation.id}_{user_id}",
                            description=f"批量操作: {reason}",
                            reference_id=operation.id,
                            reference_type='batch_adjust'
                        )
                    else:
                        success, msg, tx = self.wallet_service.add_balance(
                            user_id=user_id,
                            amount=amount,
                            order_id=f"BATCH_{operation.id}_{user_id}",
                            description=f"批量操作: {reason}",
                            reference_id=operation.id,
                            reference_type='batch_adjust'
                        )
                else:
                    # 扣款
                    success, msg, tx = self.wallet_service.consume(
                        user_id=user_id,
                        amount=abs(amount),
                        category='batch_adjust',
                        description=f"批量操作: {reason}",
                        order_id=f"BATCH_{operation.id}_{user_id}",
                        reference_id=operation.id,
                        reference_type='batch_adjust'
                    )
                
                if success:
                    operation.success_count += 1
                    operation.results.append({
                        'user_id': user_id,
                        'success': True,
                        'transaction_id': tx.id if tx else None
                    })
                else:
                    operation.failed_count += 1
                    operation.results.append({
                        'user_id': user_id,
                        'success': False,
                        'error': msg
                    })
                    
            except Exception as e:
                operation.failed_count += 1
                operation.results.append({
                    'user_id': user_id,
                    'success': False,
                    'error': str(e)
                })
        
        operation.status = BatchOperationStatus.COMPLETED.value
        operation.completed_at = datetime.now().isoformat()
        
        logger.info(
            f"Batch adjust completed: {operation.success_count}/{operation.total_count} succeeded"
        )
        
        return operation
    
    # ==================== 批量凍結/解凍 ====================
    
    async def batch_freeze(
        self,
        user_ids: List[str],
        reason: str,
        operator_id: str
    ) -> BatchOperation:
        """批量凍結錢包"""
        operation = BatchOperation(
            type=BatchOperationType.FREEZE.value,
            total_count=len(user_ids),
            operator_id=operator_id,
            description=f"批量凍結: {reason}",
            params={'reason': reason}
        )
        
        with self._lock:
            self._operations[operation.id] = operation
        
        operation.status = BatchOperationStatus.RUNNING.value
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            for user_id in user_ids:
                try:
                    cursor.execute('''
                        UPDATE user_wallets SET
                            status = ?,
                            updated_at = ?
                        WHERE user_id = ?
                    ''', (WalletStatus.FROZEN.value, datetime.now().isoformat(), user_id))
                    
                    if cursor.rowcount > 0:
                        operation.success_count += 1
                        operation.results.append({
                            'user_id': user_id,
                            'success': True
                        })
                    else:
                        operation.failed_count += 1
                        operation.results.append({
                            'user_id': user_id,
                            'success': False,
                            'error': '錢包不存在'
                        })
                        
                except Exception as e:
                    operation.failed_count += 1
                    operation.results.append({
                        'user_id': user_id,
                        'success': False,
                        'error': str(e)
                    })
            
            conn.commit()
            
        finally:
            conn.close()
        
        operation.status = BatchOperationStatus.COMPLETED.value
        operation.completed_at = datetime.now().isoformat()
        
        return operation
    
    async def batch_unfreeze(
        self,
        user_ids: List[str],
        operator_id: str
    ) -> BatchOperation:
        """批量解凍錢包"""
        operation = BatchOperation(
            type=BatchOperationType.UNFREEZE.value,
            total_count=len(user_ids),
            operator_id=operator_id,
            description="批量解凍"
        )
        
        with self._lock:
            self._operations[operation.id] = operation
        
        operation.status = BatchOperationStatus.RUNNING.value
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            for user_id in user_ids:
                try:
                    cursor.execute('''
                        UPDATE user_wallets SET
                            status = ?,
                            updated_at = ?
                        WHERE user_id = ?
                    ''', (WalletStatus.ACTIVE.value, datetime.now().isoformat(), user_id))
                    
                    if cursor.rowcount > 0:
                        operation.success_count += 1
                        operation.results.append({'user_id': user_id, 'success': True})
                    else:
                        operation.failed_count += 1
                        operation.results.append({
                            'user_id': user_id,
                            'success': False,
                            'error': '錢包不存在'
                        })
                        
                except Exception as e:
                    operation.failed_count += 1
                    operation.results.append({
                        'user_id': user_id,
                        'success': False,
                        'error': str(e)
                    })
            
            conn.commit()
            
        finally:
            conn.close()
        
        operation.status = BatchOperationStatus.COMPLETED.value
        operation.completed_at = datetime.now().isoformat()
        
        return operation
    
    # ==================== 營銷活動獎勵 ====================
    
    async def campaign_reward(
        self,
        campaign_id: str,
        campaign_name: str,
        user_ids: List[str],
        reward_amount: int,
        operator_id: str,
        reward_type: str = 'bonus'
    ) -> BatchOperation:
        """
        營銷活動獎勵發放
        
        Args:
            campaign_id: 活動ID
            campaign_name: 活動名稱
            user_ids: 獲獎用戶列表
            reward_amount: 獎勵金額（分）
            operator_id: 操作人ID
            reward_type: 獎勵類型（bonus=贈送餘額, balance=主餘額）
        """
        operation = BatchOperation(
            type=BatchOperationType.CAMPAIGN_REWARD.value,
            total_count=len(user_ids),
            operator_id=operator_id,
            description=f"活動獎勵: {campaign_name}",
            params={
                'campaign_id': campaign_id,
                'campaign_name': campaign_name,
                'reward_amount': reward_amount,
                'reward_type': reward_type
            }
        )
        
        with self._lock:
            self._operations[operation.id] = operation
        
        operation.status = BatchOperationStatus.RUNNING.value
        
        is_bonus = reward_type == 'bonus'
        
        for user_id in user_ids:
            try:
                if is_bonus:
                    success, msg, tx = self.wallet_service.add_balance(
                        user_id=user_id,
                        amount=0,
                        bonus_amount=reward_amount,
                        order_id=f"CAMP_{campaign_id}_{user_id}",
                        description=f"活動獎勵: {campaign_name}",
                        reference_id=campaign_id,
                        reference_type='campaign_reward'
                    )
                else:
                    success, msg, tx = self.wallet_service.add_balance(
                        user_id=user_id,
                        amount=reward_amount,
                        order_id=f"CAMP_{campaign_id}_{user_id}",
                        description=f"活動獎勵: {campaign_name}",
                        reference_id=campaign_id,
                        reference_type='campaign_reward'
                    )
                
                if success:
                    operation.success_count += 1
                    operation.results.append({
                        'user_id': user_id,
                        'success': True,
                        'transaction_id': tx.id if tx else None
                    })
                else:
                    operation.failed_count += 1
                    operation.results.append({
                        'user_id': user_id,
                        'success': False,
                        'error': msg
                    })
                    
            except Exception as e:
                operation.failed_count += 1
                operation.results.append({
                    'user_id': user_id,
                    'success': False,
                    'error': str(e)
                })
        
        operation.status = BatchOperationStatus.COMPLETED.value
        operation.completed_at = datetime.now().isoformat()
        
        logger.info(
            f"Campaign reward completed: {operation.success_count}/{operation.total_count} succeeded"
        )
        
        return operation
    
    # ==================== 操作查詢 ====================
    
    def get_operation(self, operation_id: str) -> Optional[BatchOperation]:
        """獲取操作詳情"""
        return self._operations.get(operation_id)
    
    def list_operations(
        self,
        operator_id: str = None,
        op_type: str = None,
        limit: int = 50
    ) -> List[BatchOperation]:
        """列出操作記錄"""
        operations = list(self._operations.values())
        
        if operator_id:
            operations = [op for op in operations if op.operator_id == operator_id]
        
        if op_type:
            operations = [op for op in operations if op.type == op_type]
        
        # 按創建時間降序排列
        operations.sort(key=lambda x: x.created_at, reverse=True)
        
        return operations[:limit]


# ==================== 全局實例 ====================

_batch_service: Optional[BatchOperationService] = None


def get_batch_operation_service() -> BatchOperationService:
    """獲取批量操作服務實例"""
    global _batch_service
    if _batch_service is None:
        _batch_service = BatchOperationService()
    return _batch_service
