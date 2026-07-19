"""
錢包購買——服務端權威方案目錄（Server-Authoritative Plan Catalog）

🔴 資金安全核心：購買端點（/api/purchase/*）過去直接信任前端傳來的 price，
用戶可篡改請求以「1 分錢買企業版」。本模組是唯一的權威價格來源：購買時一律
用此處解析出的 price/tier/duration 覆蓋前端傳值，前端傳的金額只用於「是否被
篡改」的告警日誌，絕不作為實際扣款金額。

各業務類型的權威源：
- membership：對齊 core.payment_service.SUBSCRIPTION_PLANS（單位分，tier=basic/pro/enterprise，
  與前端 defaultPlans 的價格完全一致），plan_id 格式 `{tier}_{cycle}`（monthly/yearly）
- quota_pack：對齊 core.billing_service.QUOTA_PACKS（單位分）
- ip_proxy：目前無後端權威套餐表且履約關閉 → 一律解析失敗（購買被拒），
  待建立 PROXY_PACKAGES 權威表後再開放

解析失敗一律回傳 None，呼叫方必須據此拒絕購買（fail-closed）。
"""

import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# plan_id 週期後綴 → 天數
_CYCLE_DAYS = {
    'monthly': 30,
    'month': 30,
    'yearly': 365,
    'year': 365,
    'quarterly': 90,
    'quarter': 90,
    'weekly': 7,
    'week': 7,
}


def resolve_membership_plan(plan_id: str) -> Optional[Dict[str, Any]]:
    """解析會員方案為權威值。

    plan_id 形如 `basic_monthly` / `pro_monthly` / `enterprise_yearly`。
    回傳 {tier, price(分), duration_days, name} 或 None（無效/不可售）。
    """
    if not plan_id or '_' not in plan_id:
        return None
    tier, cycle = plan_id.rsplit('_', 1)
    tier = tier.strip().lower()
    cycle = cycle.strip().lower()

    days = _CYCLE_DAYS.get(cycle)
    if not days:
        return None

    try:
        from core.payment_service import SUBSCRIPTION_PLANS
    except Exception as e:
        logger.error(f"[plan_catalog] 無法載入 SUBSCRIPTION_PLANS: {e}")
        return None

    plan = SUBSCRIPTION_PLANS.get(tier)
    if not plan:
        return None

    # free 不可購買；只接受有正價的付費檔
    if tier == 'free':
        return None

    if cycle in ('yearly', 'year'):
        price = plan.get('price_yearly', 0)
    else:
        # monthly / 其他週期暫統一用月價（季/週未在 SUBSCRIPTION_PLANS 定義獨立價）
        price = plan.get('price_monthly', 0)

    price = int(price or 0)
    if price <= 0:
        return None

    return {
        'tier': tier,
        'price': price,
        'duration_days': days,
        'name': plan.get('name', tier),
    }


def resolve_quota_pack(pack_id: str) -> Optional[Dict[str, Any]]:
    """解析配額包為權威值（對齊 billing QUOTA_PACKS）。

    回傳 {price(分), quota_amount, bonus_amount, name, validity_days} 或 None。
    """
    if not pack_id:
        return None
    try:
        from core.billing_service import QUOTA_PACKS
    except Exception as e:
        logger.error(f"[plan_catalog] 無法載入 QUOTA_PACKS: {e}")
        return None

    pack = QUOTA_PACKS.get(pack_id)
    if not pack:
        return None

    price = int(getattr(pack, 'price', 0) or 0)
    if price <= 0:
        return None

    quotas = getattr(pack, 'quotas', {}) or {}
    quota_amount = int(sum(v for v in quotas.values() if isinstance(v, int) and v > 0))

    return {
        'price': price,
        'quota_amount': quota_amount,
        'bonus_amount': 0,
        'name': getattr(pack, 'name', pack_id),
        'validity_days': int(getattr(pack, 'validity_days', 30) or 30),
    }


def resolve_proxy_package(package_id: str) -> Optional[Dict[str, Any]]:
    """解析代理套餐為權威值。

    目前無後端權威套餐表，且 IP 代理履約仍 fail-closed，故一律回傳 None
    （購買被拒）。待建立權威 PROXY_PACKAGES 表並接通履約後再實作。
    """
    return None
