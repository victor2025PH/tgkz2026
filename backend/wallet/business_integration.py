"""
業務整合服務
Business Integration Service

將錢包系統與各業務模塊深度整合：
1. 會員購買 - 使用錢包餘額
2. IP 代理購買 - 使用錢包餘額
3. 配額包購買 - 使用錢包餘額
4. 自動退款 - 業務失敗時自動退款

優化設計：
1. 統一購買接口，事務性保證
2. 購買 + 業務激活原子操作
3. 失敗自動退款
4. 購買記錄關聯
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass
from enum import Enum

from .consume_service import get_consume_service, ConsumeRequest

logger = logging.getLogger(__name__)


class BusinessType(Enum):
    """業務類型"""
    MEMBERSHIP = "membership"
    IP_PROXY = "ip_proxy"
    QUOTA_PACK = "quota_pack"


@dataclass
class PurchaseRequest:
    """購買請求"""
    user_id: str
    business_type: str
    item_id: str
    amount: int                    # 金額（分）
    item_name: str = ""
    item_description: str = ""
    metadata: Optional[Dict] = None
    ip_address: str = ""


@dataclass
class PurchaseResult:
    """購買結果"""
    success: bool
    message: str
    order_id: str = ""
    transaction_id: str = ""
    business_result: Optional[Dict] = None


class BusinessIntegrationService:
    """業務整合服務"""
    
    def __init__(self):
        self.consume_service = get_consume_service()
    
    async def purchase(self, request: PurchaseRequest) -> PurchaseResult:
        """
        統一購買接口
        
        流程：
        1. 檢查餘額
        2. 執行扣款
        3. 調用業務激活
        4. 失敗則退款
        """
        # 生成訂單號
        order_id = self._generate_order_id(request.business_type)
        
        # 1. 執行消費扣款
        consume_req = ConsumeRequest(
            user_id=request.user_id,
            amount=request.amount,
            category=request.business_type,
            description=request.item_name or f"購買 {request.item_id}",
            reference_id=request.item_id,
            reference_type=request.business_type,
            order_id=order_id,
            ip_address=request.ip_address,
            skip_password=True
        )
        
        consume_result = self.consume_service.consume(consume_req)
        
        if not consume_result.success:
            return PurchaseResult(
                success=False,
                message=consume_result.message,
                order_id=order_id
            )
        
        # 2. 調用業務激活
        try:
            business_result = await self._activate_business(request, order_id)
            
            if business_result.get('success'):
                logger.info(
                    f"Purchase success: user={request.user_id}, "
                    f"type={request.business_type}, item={request.item_id}, "
                    f"order={order_id}"
                )
                
                return PurchaseResult(
                    success=True,
                    message="購買成功",
                    order_id=order_id,
                    transaction_id=consume_result.transaction_id,
                    business_result=business_result
                )
            else:
                # 業務激活失敗，執行退款
                error_msg = business_result.get('error', '業務激活失敗')
                await self._refund_purchase(
                    request.user_id, 
                    order_id, 
                    f"業務激活失敗: {error_msg}"
                )
                
                return PurchaseResult(
                    success=False,
                    message=error_msg,
                    order_id=order_id
                )
                
        except Exception as e:
            # 異常情況，執行退款
            logger.error(f"Business activation error: {e}")
            await self._refund_purchase(
                request.user_id,
                order_id,
                f"系統異常: {str(e)}"
            )
            
            return PurchaseResult(
                success=False,
                message=f"購買失敗: {str(e)}",
                order_id=order_id
            )
    
    async def _activate_business(
        self, 
        request: PurchaseRequest, 
        order_id: str
    ) -> Dict[str, Any]:
        """
        調用業務激活
        
        根據業務類型調用對應的激活邏輯
        """
        if request.business_type == BusinessType.MEMBERSHIP.value:
            return await self._activate_membership(request, order_id)
        
        elif request.business_type == BusinessType.IP_PROXY.value:
            return await self._activate_ip_proxy(request, order_id)
        
        elif request.business_type == BusinessType.QUOTA_PACK.value:
            return await self._activate_quota_pack(request, order_id)
        
        else:
            return {'success': False, 'error': '未知的業務類型'}
    
    async def _activate_membership(
        self, 
        request: PurchaseRequest, 
        order_id: str
    ) -> Dict[str, Any]:
        """激活會員"""
        try:
            # 解析會員方案
            metadata = request.metadata or {}
            plan_id = request.item_id
            duration_days = metadata.get('duration_days', 30)
            tier = metadata.get('tier', 'basic')
            
            # TODO: 調用會員服務激活
            # 這裡模擬激活邏輯，實際應調用 MembershipService
            
            logger.info(
                f"Activating membership: user={request.user_id}, "
                f"plan={plan_id}, tier={tier}, days={duration_days}"
            )
            
            # 計算到期時間
            expires_at = (
                datetime.now() + timedelta(days=duration_days)
            ).isoformat()
            
            return {
                'success': True,
                'membership': {
                    'plan_id': plan_id,
                    'tier': tier,
                    'duration_days': duration_days,
                    'expires_at': expires_at,
                    'order_id': order_id
                }
            }
            
        except Exception as e:
            logger.error(f"Activate membership error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _activate_ip_proxy(
        self, 
        request: PurchaseRequest, 
        order_id: str
    ) -> Dict[str, Any]:
        """分配 IP 代理"""
        try:
            metadata = request.metadata or {}
            package_id = request.item_id
            region = metadata.get('region', 'US')
            proxy_type = metadata.get('type', 'static')
            duration_days = metadata.get('duration_days', 30)
            
            # TODO: 調用代理服務分配 IP
            # 這裡模擬分配邏輯，實際應調用 ProxyService
            
            logger.info(
                f"Allocating IP proxy: user={request.user_id}, "
                f"package={package_id}, region={region}, days={duration_days}"
            )
            
            # 模擬分配 IP
            assigned_ip = f"192.168.{hash(request.user_id) % 255}.{hash(order_id) % 255}"
            expires_at = (
                datetime.now() + timedelta(days=duration_days)
            ).isoformat()
            
            return {
                'success': True,
                'proxy': {
                    'package_id': package_id,
                    'ip_address': assigned_ip,
                    'region': region,
                    'type': proxy_type,
                    'port': 1080,
                    'username': f"user_{request.user_id[:8]}",
                    'password': order_id[-8:],
                    'expires_at': expires_at,
                    'order_id': order_id
                }
            }
            
        except Exception as e:
            logger.error(f"Activate IP proxy error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _activate_quota_pack(
        self, 
        request: PurchaseRequest, 
        order_id: str
    ) -> Dict[str, Any]:
        """添加配額"""
        try:
            metadata = request.metadata or {}
            pack_id = request.item_id
            quota_amount = metadata.get('quota_amount', 1000)
            bonus_amount = metadata.get('bonus_amount', 0)
            
            # TODO: 調用配額服務添加配額
            # 這裡模擬添加邏輯，實際應調用 QuotaService
            
            total_quota = quota_amount + bonus_amount
            
            logger.info(
                f"Adding quota: user={request.user_id}, "
                f"pack={pack_id}, amount={total_quota}"
            )
            
            return {
                'success': True,
                'quota': {
                    'pack_id': pack_id,
                    'added_amount': quota_amount,
                    'bonus_amount': bonus_amount,
                    'total_added': total_quota,
                    'order_id': order_id
                }
            }
            
        except Exception as e:
            logger.error(f"Activate quota pack error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _refund_purchase(
        self, 
        user_id: str, 
        order_id: str, 
        reason: str
    ):
        """退款"""
        try:
            result = self.consume_service.refund(
                user_id=user_id,
                original_order_id=order_id,
                reason=reason
            )
            
            if result.success:
                logger.info(f"Refund success: order={order_id}, reason={reason}")
            else:
                logger.error(
                    f"Refund failed: order={order_id}, "
                    f"reason={reason}, error={result.message}"
                )
                
        except Exception as e:
            logger.error(f"Refund error: order={order_id}, error={e}")
    
    def _generate_order_id(self, business_type: str) -> str:
        """生成訂單號"""
        import uuid
        import time
        
        prefix_map = {
            'membership': 'MEM',
            'ip_proxy': 'PXY',
            'quota_pack': 'QTA'
        }
        prefix = prefix_map.get(business_type, 'ORD')
        timestamp = int(time.time())
        random_part = uuid.uuid4().hex[:6].upper()
        
        return f"{prefix}{timestamp}{random_part}"
    
    # ==================== 快捷購買方法 ====================
    
    async def purchase_membership(
        self,
        user_id: str,
        plan_id: str,
        plan_name: str,
        price: int,
        tier: str,
        duration_days: int,
        ip_address: str = ""
    ) -> PurchaseResult:
        """購買會員"""
        return await self.purchase(PurchaseRequest(
            user_id=user_id,
            business_type=BusinessType.MEMBERSHIP.value,
            item_id=plan_id,
            amount=price,
            item_name=f"{plan_name} ({duration_days}天)",
            metadata={
                'tier': tier,
                'duration_days': duration_days
            },
            ip_address=ip_address
        ))
    
    async def purchase_ip_proxy(
        self,
        user_id: str,
        package_id: str,
        package_name: str,
        price: int,
        region: str,
        proxy_type: str,
        duration_days: int,
        ip_address: str = ""
    ) -> PurchaseResult:
        """購買 IP 代理"""
        return await self.purchase(PurchaseRequest(
            user_id=user_id,
            business_type=BusinessType.IP_PROXY.value,
            item_id=package_id,
            amount=price,
            item_name=f"{package_name} ({duration_days}天)",
            metadata={
                'region': region,
                'type': proxy_type,
                'duration_days': duration_days
            },
            ip_address=ip_address
        ))
    
    async def purchase_quota_pack(
        self,
        user_id: str,
        pack_id: str,
        pack_name: str,
        price: int,
        quota_amount: int,
        bonus_amount: int = 0,
        ip_address: str = ""
    ) -> PurchaseResult:
        """購買配額包"""
        return await self.purchase(PurchaseRequest(
            user_id=user_id,
            business_type=BusinessType.QUOTA_PACK.value,
            item_id=pack_id,
            amount=price,
            item_name=pack_name,
            metadata={
                'quota_amount': quota_amount,
                'bonus_amount': bonus_amount
            },
            ip_address=ip_address
        ))


# ==================== 全局實例 ====================

_business_service: Optional[BusinessIntegrationService] = None


def get_business_service() -> BusinessIntegrationService:
    """獲取業務整合服務實例"""
    global _business_service
    if _business_service is None:
        _business_service = BusinessIntegrationService()
    return _business_service
