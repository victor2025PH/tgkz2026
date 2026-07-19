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


# 🔴 履約能力註冊表（fail-closed 核心）
# 只有在此標記 True 的業務類型才允許扣款購買。
#
# 背景：三個 _activate_* 方法原本是「TODO 模擬」——不呼叫任何真實服務、
# 直接 return success=True（假 IP / 假到期 / 假配額），但 purchase() 已經真實
# 扣了用戶錢包餘額，形成「收錢不發貨」資金漏洞。
#
# fail-closed 原則：未接通真實履約的業務，一律在「扣款之前」就拒絕，
# 絕不允許先扣款再假激活。這比「扣款後退款」更優：用戶不會經歷扣了又退的
# 困惑，也不承擔退款失敗（退款鏈失敗目前只打 log）的資金敞口。
#
# 接通某業務的真實履約後，把對應項改為 True，並在 _activate_* 實作真實邏輯。
_FULFILLMENT_ENABLED = {
    BusinessType.MEMBERSHIP.value: False,  # 有 users 表寫入口徑，但無現成服務，待接通
    BusinessType.IP_PROXY.value: False,    # 無面向用戶售賣的代理履約服務
    BusinessType.QUOTA_PACK.value: False,  # QuotaService 無 add；purchase_pack 與限額檢查脫節
}


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
        
        # 🔴 fail-closed：扣款前先檢查該業務是否已接通真實履約。
        # 未接通就拒絕，絕不「先扣款再假激活」（收錢不發貨）。
        if not _FULFILLMENT_ENABLED.get(request.business_type, False):
            logger.warning(
                f"Purchase rejected (fulfillment not enabled): "
                f"user={request.user_id}, type={request.business_type}, item={request.item_id}"
            )
            return PurchaseResult(
                success=False,
                message="該業務暫未開放購買（履約服務尚未接通），未扣款",
                order_id=order_id
            )
        
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
        """激活會員（fail-closed：真實履約尚未接通）"""
        # 🔴 fail-closed：舊代碼在此僅 log + 回傳假到期時間，不寫任何持久化。
        # 正確接通路徑（待實作）：扣款成功後更新 users 表會員等級與到期，
        # 對齊 admin/handlers.extend_user 使用的 schema_adapter.get_update_level_query /
        # get_update_expires_query（同步 membership_level/subscription_tier 與
        # expires_at/subscription_expires），使 GET /api/v1/auth/me 能讀到。
        # 未接通前一律返回失敗，由 purchase() 觸發自動退款（雙重保險，
        # 正常情況下 purchase 入口的 _FULFILLMENT_ENABLED 守衛已先攔下）。
        logger.warning(
            f"_activate_membership called but fulfillment not implemented: "
            f"user={request.user_id}, plan={request.item_id}, order={order_id}"
        )
        return {'success': False, 'error': '會員履約服務尚未接通'}
    
    async def _activate_ip_proxy(
        self, 
        request: PurchaseRequest, 
        order_id: str
    ) -> Dict[str, Any]:
        """分配 IP 代理（fail-closed：無面向用戶的代理售賣履約服務）"""
        # 🔴 fail-closed：舊代碼用 hash 拼一個假 IP（192.168.x.x，內網段，根本不可用）
        # 就回傳成功。現有 ProxyPoolManager.assign_proxy_to_account 是「給 Telegram
        # 帳號分配連線代理」的運維能力，需要 account_id/phone，與「賣 IP 套餐給用戶並
        # 發放獨立憑證/到期」不是同一產品域，硬接會錯域。無合適服務前一律拒絕。
        logger.warning(
            f"_activate_ip_proxy called but no user-facing proxy fulfillment: "
            f"user={request.user_id}, package={request.item_id}, order={order_id}"
        )
        return {'success': False, 'error': 'IP 代理履約服務尚未接通'}
    
    async def _activate_quota_pack(
        self, 
        request: PurchaseRequest, 
        order_id: str
    ) -> Dict[str, Any]:
        """添加配額（fail-closed：加包與限額檢查尚未打通）"""
        # 🔴 fail-closed：舊代碼只回傳假的 total_added，不寫任何庫。
        # QuotaService 沒有 add_quota/grant；BillingService.purchase_pack 雖會寫
        # user_quota_packages，但 QuotaService._get_quota_limit 不讀該表，
        # 「買了包也不會抬高可用上限」。在「配額包 → 限額」打通前一律拒絕。
        logger.warning(
            f"_activate_quota_pack called but pack→limit not wired: "
            f"user={request.user_id}, pack={request.item_id}, order={order_id}"
        )
        return {'success': False, 'error': '配額包履約服務尚未接通'}
    
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
