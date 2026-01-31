"""
TG-Matrix Unified Contact Model
統一聯繫人數據模型

整合以下數據源:
- captured_leads: 捕獲的潛在客戶
- user_profiles: 用戶檔案（漏斗階段）
- collected_users: 收集的用戶（廣告風險）
- tracked_users: 追蹤的用戶（價值評估）
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum


class ContactStatus(Enum):
    """聯繫人狀態"""
    NEW = 'new'                    # 新捕獲
    CONTACTED = 'contacted'        # 已聯繫
    RESPONDED = 'responded'        # 已回應
    INTERESTED = 'interested'      # 有興趣
    QUALIFIED = 'qualified'        # 已資格認證
    NEGOTIATING = 'negotiating'    # 談判中
    CONVERTED = 'converted'        # 已轉化
    LOST = 'lost'                  # 已流失
    DNC = 'dnc'                    # 勿擾
    BLACKLISTED = 'blacklisted'    # 黑名單


class FunnelStage(Enum):
    """漏斗階段"""
    AWARENESS = 'awareness'        # 認知階段
    INTEREST = 'interest'          # 興趣階段
    CONSIDERATION = 'consideration'  # 考慮階段
    INTENT = 'intent'              # 意向階段
    EVALUATION = 'evaluation'      # 評估階段
    PURCHASE = 'purchase'          # 購買階段
    RETENTION = 'retention'        # 留存階段
    ADVOCACY = 'advocacy'          # 推薦階段


class ValueLevel(Enum):
    """價值等級"""
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'
    VIP = 'vip'


class ContactSource(Enum):
    """聯繫人來源"""
    KEYWORD_MATCH = 'keyword_match'    # 關鍵詞匹配
    GROUP_MEMBER = 'group_member'      # 群組成員
    DISCUSSION = 'discussion'          # 討論組
    PRIVATE_MSG = 'private_msg'        # 私信
    MANUAL = 'manual'                  # 手動添加
    IMPORT = 'import'                  # 批量導入
    REFERRAL = 'referral'              # 推薦


@dataclass
class UnifiedContact:
    """
    統一聯繫人模型
    
    整合多個數據源的用戶信息，提供統一的視圖
    """
    
    # 基礎標識
    id: int
    telegram_id: str                           # Telegram 用戶 ID
    username: Optional[str] = None             # @用戶名
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    
    # 狀態和階段
    status: ContactStatus = ContactStatus.NEW
    funnel_stage: FunnelStage = FunnelStage.AWARENESS
    value_level: ValueLevel = ValueLevel.LOW
    
    # 來源信息
    source: ContactSource = ContactSource.KEYWORD_MATCH
    source_group_id: Optional[str] = None
    source_group_title: Optional[str] = None
    matched_keywords: List[str] = field(default_factory=list)
    
    # 互動統計
    interactions_count: int = 0
    messages_sent: int = 0
    messages_received: int = 0
    last_interaction_at: Optional[datetime] = None
    
    # 風險評估
    ad_risk_score: float = 0.0                 # 廣告風險分數 (0-100)
    is_ad_account: Optional[bool] = None
    is_blacklisted: bool = False
    risk_factors: Dict[str, Any] = field(default_factory=dict)
    
    # 帳號特徵
    has_photo: bool = False
    is_premium: bool = False
    is_verified: bool = False
    is_bot: bool = False
    account_age_days: Optional[int] = None
    
    # 興趣和評分
    interest_level: int = 1                    # 興趣等級 (1-5)
    lead_score: int = 0                        # 線索評分 (0-100)
    quality_score: int = 0                     # 質量評分 (0-100)
    
    # 標籤和備註
    tags: List[str] = field(default_factory=list)
    notes: str = ''
    custom_fields: Dict[str, Any] = field(default_factory=dict)
    
    # 分配信息
    assigned_account_phone: Optional[str] = None   # 分配給哪個帳號處理
    assigned_at: Optional[datetime] = None
    
    # 時間戳
    captured_at: datetime = field(default_factory=datetime.now)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    @property
    def display_name(self) -> str:
        """獲取顯示名稱"""
        if self.first_name or self.last_name:
            parts = [p for p in [self.first_name, self.last_name] if p]
            return ' '.join(parts)
        if self.username:
            return f"@{self.username}"
        return f"User {self.telegram_id}"
    
    @property
    def is_high_value(self) -> bool:
        """是否高價值用戶"""
        return self.value_level in (ValueLevel.HIGH, ValueLevel.VIP)
    
    @property
    def is_active(self) -> bool:
        """是否活躍用戶"""
        if not self.last_interaction_at:
            return False
        days_since_interaction = (datetime.now() - self.last_interaction_at).days
        return days_since_interaction < 7
    
    @property
    def is_risky(self) -> bool:
        """是否高風險用戶"""
        return self.ad_risk_score > 70 or self.is_ad_account == True
    
    def to_dict(self) -> Dict[str, Any]:
        """轉換為字典"""
        return {
            'id': self.id,
            'telegramId': self.telegram_id,
            'username': self.username,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'displayName': self.display_name,
            'phone': self.phone,
            'bio': self.bio,
            
            'status': self.status.value,
            'funnelStage': self.funnel_stage.value,
            'valueLevel': self.value_level.value,
            
            'source': self.source.value,
            'sourceGroupId': self.source_group_id,
            'sourceGroupTitle': self.source_group_title,
            'matchedKeywords': self.matched_keywords,
            
            'interactionsCount': self.interactions_count,
            'messagesSent': self.messages_sent,
            'messagesReceived': self.messages_received,
            'lastInteractionAt': self.last_interaction_at.isoformat() if self.last_interaction_at else None,
            
            'adRiskScore': self.ad_risk_score,
            'isAdAccount': self.is_ad_account,
            'isBlacklisted': self.is_blacklisted,
            'riskFactors': self.risk_factors,
            
            'hasPhoto': self.has_photo,
            'isPremium': self.is_premium,
            'isVerified': self.is_verified,
            'isBot': self.is_bot,
            'accountAgeDays': self.account_age_days,
            
            'interestLevel': self.interest_level,
            'leadScore': self.lead_score,
            'qualityScore': self.quality_score,
            
            'tags': self.tags,
            'notes': self.notes,
            'customFields': self.custom_fields,
            
            'assignedAccountPhone': self.assigned_account_phone,
            'assignedAt': self.assigned_at.isoformat() if self.assigned_at else None,
            
            'capturedAt': self.captured_at.isoformat() if self.captured_at else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
            
            # 計算屬性
            'isHighValue': self.is_high_value,
            'isActive': self.is_active,
            'isRisky': self.is_risky,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UnifiedContact':
        """從字典創建"""
        def parse_datetime(val):
            if not val:
                return None
            if isinstance(val, datetime):
                return val
            try:
                return datetime.fromisoformat(val.replace('Z', '+00:00'))
            except:
                return None
        
        def parse_list(val):
            if isinstance(val, list):
                return val
            if isinstance(val, str):
                import json
                try:
                    return json.loads(val)
                except:
                    return [v.strip() for v in val.split(',') if v.strip()]
            return []
        
        def parse_dict(val):
            if isinstance(val, dict):
                return val
            if isinstance(val, str):
                import json
                try:
                    return json.loads(val)
                except:
                    return {}
            return {}
        
        return cls(
            id=data.get('id', 0),
            telegram_id=str(data.get('telegramId') or data.get('telegram_id') or data.get('user_id', '')),
            username=data.get('username'),
            first_name=data.get('firstName') or data.get('first_name'),
            last_name=data.get('lastName') or data.get('last_name'),
            phone=data.get('phone'),
            bio=data.get('bio'),
            
            status=ContactStatus(data.get('status', 'new')),
            funnel_stage=FunnelStage(data.get('funnelStage') or data.get('funnel_stage', 'awareness')),
            value_level=ValueLevel(data.get('valueLevel') or data.get('value_level', 'low')),
            
            source=ContactSource(data.get('source', 'keyword_match')),
            source_group_id=data.get('sourceGroupId') or data.get('source_group_id'),
            source_group_title=data.get('sourceGroupTitle') or data.get('source_group_title'),
            matched_keywords=parse_list(data.get('matchedKeywords') or data.get('matched_keywords', [])),
            
            interactions_count=data.get('interactionsCount') or data.get('interactions', 0),
            messages_sent=data.get('messagesSent') or data.get('messages_sent', 0),
            messages_received=data.get('messagesReceived') or data.get('messages_received', 0),
            last_interaction_at=parse_datetime(data.get('lastInteractionAt') or data.get('last_interaction_at')),
            
            ad_risk_score=float(data.get('adRiskScore') or data.get('ad_risk_score', 0)),
            is_ad_account=data.get('isAdAccount') or data.get('is_ad_account'),
            is_blacklisted=bool(data.get('isBlacklisted') or data.get('is_blacklisted', False)),
            risk_factors=parse_dict(data.get('riskFactors') or data.get('risk_factors', {})),
            
            has_photo=bool(data.get('hasPhoto') or data.get('has_photo', False)),
            is_premium=bool(data.get('isPremium') or data.get('is_premium', False)),
            is_verified=bool(data.get('isVerified') or data.get('is_verified', False)),
            is_bot=bool(data.get('isBot') or data.get('is_bot', False)),
            account_age_days=data.get('accountAgeDays') or data.get('account_age_days'),
            
            interest_level=int(data.get('interestLevel') or data.get('interest_level', 1)),
            lead_score=int(data.get('leadScore') or data.get('lead_score', 0)),
            quality_score=int(data.get('qualityScore') or data.get('quality_score', 0)),
            
            tags=parse_list(data.get('tags', [])),
            notes=data.get('notes', ''),
            custom_fields=parse_dict(data.get('customFields') or data.get('custom_fields', {})),
            
            assigned_account_phone=data.get('assignedAccountPhone') or data.get('assigned_account_phone'),
            assigned_at=parse_datetime(data.get('assignedAt') or data.get('assigned_at')),
            
            captured_at=parse_datetime(data.get('capturedAt') or data.get('captured_at')) or datetime.now(),
            created_at=parse_datetime(data.get('createdAt') or data.get('created_at')) or datetime.now(),
            updated_at=parse_datetime(data.get('updatedAt') or data.get('updated_at')) or datetime.now(),
        )


@dataclass
class ContactFilter:
    """聯繫人過濾條件"""
    
    status: Optional[List[ContactStatus]] = None
    funnel_stages: Optional[List[FunnelStage]] = None
    value_levels: Optional[List[ValueLevel]] = None
    sources: Optional[List[ContactSource]] = None
    
    tags: Optional[List[str]] = None
    exclude_tags: Optional[List[str]] = None
    
    is_blacklisted: Optional[bool] = None
    is_ad_account: Optional[bool] = None
    min_risk_score: Optional[float] = None
    max_risk_score: Optional[float] = None
    
    min_interest_level: Optional[int] = None
    min_lead_score: Optional[int] = None
    
    assigned_account: Optional[str] = None
    is_unassigned: Optional[bool] = None
    
    search_query: Optional[str] = None
    
    captured_after: Optional[datetime] = None
    captured_before: Optional[datetime] = None
    
    limit: int = 50
    offset: int = 0
    
    sort_by: str = 'captured_at'
    sort_desc: bool = True


@dataclass
class ContactStats:
    """聯繫人統計"""
    
    total: int = 0
    
    # 按狀態統計
    by_status: Dict[str, int] = field(default_factory=dict)
    
    # 按漏斗階段統計
    by_funnel_stage: Dict[str, int] = field(default_factory=dict)
    
    # 按價值等級統計
    by_value_level: Dict[str, int] = field(default_factory=dict)
    
    # 按來源統計
    by_source: Dict[str, int] = field(default_factory=dict)
    
    # 今日統計
    today_new: int = 0
    today_contacted: int = 0
    today_converted: int = 0
    
    # 風險統計
    high_risk_count: int = 0
    blacklisted_count: int = 0
    
    # 活躍度統計
    active_7d: int = 0
    active_30d: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'total': self.total,
            'byStatus': self.by_status,
            'byFunnelStage': self.by_funnel_stage,
            'byValueLevel': self.by_value_level,
            'bySource': self.by_source,
            'todayNew': self.today_new,
            'todayContacted': self.today_contacted,
            'todayConverted': self.today_converted,
            'highRiskCount': self.high_risk_count,
            'blacklistedCount': self.blacklisted_count,
            'active7d': self.active_7d,
            'active30d': self.active_30d,
        }
