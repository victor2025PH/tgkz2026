"""
統一等級配置服務

設計原則：
1. 單一配置源 - MEMBERSHIP_LEVELS 為唯一真實來源
2. 向後兼容 - 提供 SUBSCRIPTION_TIERS 格式的兼容層
3. 類型安全 - 使用 dataclass 和 Enum
4. 配額標準化 - 統一所有配額項的定義

優化說明：
- 統一 Electron 版（卡密系統）和 SaaS 版（訂閱系統）的等級配置
- 支持動態配額調整
- 提供配額校驗和查詢方法
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)


# ==================== 等級定義 ====================

class MembershipLevel(Enum):
    """會員等級枚舉"""
    BRONZE = "bronze"    # 青銅戰士 - 免費試用
    SILVER = "silver"    # 白銀精英 - 入門付費
    GOLD = "gold"        # 黃金大師 - 主力產品
    DIAMOND = "diamond"  # 鑽石王牌 - 專業用戶
    STAR = "star"        # 星耀傳說 - 團隊/代理
    KING = "king"        # 榮耀王者 - 企業定制

    @classmethod
    def from_string(cls, value: str) -> 'MembershipLevel':
        """從字符串轉換，支持舊版 SUBSCRIPTION_TIERS 名稱"""
        mapping = {
            'free': cls.BRONZE,
            'basic': cls.SILVER,
            'pro': cls.GOLD,
            'enterprise': cls.KING,
            # 直接映射
            'bronze': cls.BRONZE,
            'silver': cls.SILVER,
            'gold': cls.GOLD,
            'diamond': cls.DIAMOND,
            'star': cls.STAR,
            'king': cls.KING,
        }
        return mapping.get(value.lower(), cls.BRONZE)
    
    def to_subscription_tier(self) -> str:
        """轉換為舊版 SUBSCRIPTION_TIERS 格式（向後兼容）"""
        mapping = {
            self.BRONZE: 'free',
            self.SILVER: 'basic',
            self.GOLD: 'pro',
            self.DIAMOND: 'pro',  # diamond 歸類為 pro
            self.STAR: 'enterprise',
            self.KING: 'enterprise',
        }
        return mapping.get(self, 'free')


class QuotaType(Enum):
    """配額類型枚舉"""
    TG_ACCOUNTS = "tg_accounts"               # TG 帳號數
    DAILY_MESSAGES = "daily_messages"         # 每日消息數
    AI_CALLS = "ai_calls"                     # AI 調用次數
    DEVICES = "devices"                       # 設備數
    GROUPS = "groups"                         # 群組數
    KEYWORD_SETS = "keyword_sets"             # 關鍵詞集數
    AUTO_REPLY_RULES = "auto_reply_rules"     # 自動回覆規則數
    SCHEDULED_TASKS = "scheduled_tasks"       # 定時任務數
    DATA_RETENTION_DAYS = "data_retention_days"  # 數據保留天數
    PLATFORM_API_QUOTA = "platform_api_quota"    # 平台 API 配額
    PLATFORM_API_MAX_ACCOUNTS = "platform_api_max_accounts"  # 平台 API 最大帳號數

    @property
    def display_name(self) -> str:
        """獲取顯示名稱"""
        names = {
            self.TG_ACCOUNTS: 'TG 帳號',
            self.DAILY_MESSAGES: '每日消息',
            self.AI_CALLS: 'AI 調用',
            self.DEVICES: '設備數',
            self.GROUPS: '群組數',
            self.KEYWORD_SETS: '關鍵詞集',
            self.AUTO_REPLY_RULES: '自動回覆',
            self.SCHEDULED_TASKS: '定時任務',
            self.DATA_RETENTION_DAYS: '數據保留',
            self.PLATFORM_API_QUOTA: '平台 API',
            self.PLATFORM_API_MAX_ACCOUNTS: 'API 帳號',
        }
        return names.get(self, self.value)
    
    @property
    def is_daily_reset(self) -> bool:
        """是否每日重置"""
        return self in {
            self.DAILY_MESSAGES,
            self.AI_CALLS,
        }


# ==================== 配額配置 ====================

@dataclass
class QuotaConfig:
    """配額配置"""
    tg_accounts: int = 2
    daily_messages: int = 20
    ai_calls: int = 10
    devices: int = 1
    groups: int = 3
    keyword_sets: int = 0
    auto_reply_rules: int = 1
    scheduled_tasks: int = 0
    data_retention_days: int = 7
    platform_api_quota: int = 0
    platform_api_max_accounts: int = 0

    def get(self, quota_type: QuotaType) -> int:
        """獲取指定配額值"""
        return getattr(self, quota_type.value, 0)
    
    def to_dict(self) -> Dict[str, int]:
        """轉換為字典"""
        return {
            'tg_accounts': self.tg_accounts,
            'daily_messages': self.daily_messages,
            'ai_calls': self.ai_calls,
            'devices': self.devices,
            'groups': self.groups,
            'keyword_sets': self.keyword_sets,
            'auto_reply_rules': self.auto_reply_rules,
            'scheduled_tasks': self.scheduled_tasks,
            'data_retention_days': self.data_retention_days,
            'platform_api_quota': self.platform_api_quota,
            'platform_api_max_accounts': self.platform_api_max_accounts,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, int]) -> 'QuotaConfig':
        """從字典創建"""
        return cls(**{k: v for k, v in data.items() if hasattr(cls, k)})


@dataclass
class PriceConfig:
    """價格配置"""
    week: float = 0
    month: float = 0
    quarter: float = 0
    year: float = 0
    lifetime: float = 0

    def to_dict(self) -> Dict[str, float]:
        return {
            'week': self.week,
            'month': self.month,
            'quarter': self.quarter,
            'year': self.year,
            'lifetime': self.lifetime,
        }


@dataclass
class LevelConfig:
    """等級配置"""
    level: MembershipLevel
    name: str
    name_en: str
    icon: str
    color: str
    order: int
    quotas: QuotaConfig
    prices: PriceConfig
    features: List[str]

    def to_dict(self) -> Dict[str, Any]:
        """轉換為字典"""
        return {
            'level': self.level.value,
            'name': self.name,
            'name_en': self.name_en,
            'icon': self.icon,
            'color': self.color,
            'order': self.order,
            'quotas': self.quotas.to_dict(),
            'prices': self.prices.to_dict(),
            'features': self.features,
        }
    
    def has_feature(self, feature: str) -> bool:
        """檢查是否有指定功能"""
        if 'all' in self.features:
            return True
        return feature in self.features
    
    def to_subscription_tier_format(self) -> Dict[str, Any]:
        """轉換為舊版 SUBSCRIPTION_TIERS 格式（向後兼容）"""
        return {
            'max_accounts': self.quotas.tg_accounts,
            'max_api_calls': self.quotas.ai_calls if self.quotas.ai_calls != -1 else 999999,
            'features': self.features,
            'price': self.prices.month,
        }


# ==================== 統一配置服務 ====================

class LevelConfigService:
    """
    統一等級配置服務
    
    單例模式，提供全局配置訪問
    """
    
    _instance: Optional['LevelConfigService'] = None
    _configs: Dict[MembershipLevel, LevelConfig] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """從 MEMBERSHIP_LEVELS 初始化配置"""
        # 延遲導入避免循環引用
        from ..database import MEMBERSHIP_LEVELS
        
        for level_id, config in MEMBERSHIP_LEVELS.items():
            try:
                level = MembershipLevel(level_id)
                
                # 解析配額
                quota_data = config.get('quotas', {})
                quotas = QuotaConfig(
                    tg_accounts=quota_data.get('tg_accounts', 2),
                    daily_messages=quota_data.get('daily_messages', 20),
                    ai_calls=quota_data.get('ai_calls', 10),
                    devices=quota_data.get('devices', 1),
                    groups=quota_data.get('groups', 3),
                    keyword_sets=quota_data.get('keyword_sets', 0),
                    auto_reply_rules=quota_data.get('auto_reply_rules', 1),
                    scheduled_tasks=quota_data.get('scheduled_tasks', 0),
                    data_retention_days=quota_data.get('data_retention_days', 7),
                    platform_api_quota=quota_data.get('platform_api_quota', 0),
                    platform_api_max_accounts=quota_data.get('platform_api_max_accounts', 0),
                )
                
                # 解析價格
                price_data = config.get('prices', {})
                prices = PriceConfig(
                    week=price_data.get('week', 0),
                    month=price_data.get('month', 0),
                    quarter=price_data.get('quarter', 0),
                    year=price_data.get('year', 0),
                    lifetime=price_data.get('lifetime', 0),
                )
                
                level_config = LevelConfig(
                    level=level,
                    name=config.get('name', level_id),
                    name_en=config.get('name_en', level_id),
                    icon=config.get('icon', ''),
                    color=config.get('color', '#666'),
                    order=config.get('order', 0),
                    quotas=quotas,
                    prices=prices,
                    features=config.get('features', []),
                )
                
                self._configs[level] = level_config
                
            except ValueError as e:
                logger.warning(f"Unknown level: {level_id}, error: {e}")
    
    # ==================== 配置查詢 ====================
    
    def get_level_config(self, level: MembershipLevel) -> Optional[LevelConfig]:
        """獲取指定等級的配置"""
        return self._configs.get(level)
    
    def get_level_config_by_string(self, level_str: str) -> Optional[LevelConfig]:
        """通過字符串獲取等級配置（支持舊格式）"""
        level = MembershipLevel.from_string(level_str)
        return self.get_level_config(level)
    
    def get_all_levels(self) -> List[LevelConfig]:
        """獲取所有等級配置（按 order 排序）"""
        return sorted(self._configs.values(), key=lambda x: x.order)
    
    def get_quota(self, level: MembershipLevel, quota_type: QuotaType) -> int:
        """獲取指定等級的指定配額"""
        config = self.get_level_config(level)
        if config:
            return config.quotas.get(quota_type)
        return 0
    
    def has_feature(self, level: MembershipLevel, feature: str) -> bool:
        """檢查指定等級是否有指定功能"""
        config = self.get_level_config(level)
        if config:
            return config.has_feature(feature)
        return False
    
    # ==================== 向後兼容 ====================
    
    def get_subscription_tiers(self) -> Dict[str, Dict[str, Any]]:
        """
        生成 SUBSCRIPTION_TIERS 格式的兼容數據
        
        用於舊代碼兼容，將 6 級映射為 4 級：
        - free: bronze
        - basic: silver
        - pro: gold (+ diamond)
        - enterprise: star, king
        """
        tiers = {}
        
        mapping = {
            'free': MembershipLevel.BRONZE,
            'basic': MembershipLevel.SILVER,
            'pro': MembershipLevel.GOLD,
            'enterprise': MembershipLevel.KING,
        }
        
        for tier_name, level in mapping.items():
            config = self.get_level_config(level)
            if config:
                tiers[tier_name] = config.to_subscription_tier_format()
        
        return tiers
    
    def normalize_tier_name(self, tier_name: str) -> str:
        """
        規範化等級名稱
        
        將舊版 tier 名稱轉換為新版 level 名稱
        """
        level = MembershipLevel.from_string(tier_name)
        return level.value
    
    # ==================== 配額校驗 ====================
    
    def check_quota_limit(
        self, 
        level: MembershipLevel, 
        quota_type: QuotaType, 
        current_usage: int
    ) -> Dict[str, Any]:
        """
        檢查配額使用情況
        
        返回：
        - allowed: 是否允許繼續使用
        - limit: 配額上限
        - used: 當前使用量
        - remaining: 剩餘配額
        - percentage: 使用百分比
        - warning: 是否達到警告閾值（80%）
        """
        limit = self.get_quota(level, quota_type)
        
        # -1 表示無限
        if limit == -1:
            return {
                'allowed': True,
                'limit': -1,
                'used': current_usage,
                'remaining': -1,
                'percentage': 0,
                'warning': False,
                'unlimited': True,
            }
        
        remaining = max(0, limit - current_usage)
        percentage = (current_usage / limit * 100) if limit > 0 else 0
        
        return {
            'allowed': current_usage < limit,
            'limit': limit,
            'used': current_usage,
            'remaining': remaining,
            'percentage': round(percentage, 1),
            'warning': percentage >= 80,
            'unlimited': False,
        }
    
    # ==================== 等級比較 ====================
    
    def compare_levels(
        self, 
        level1: MembershipLevel, 
        level2: MembershipLevel
    ) -> int:
        """
        比較兩個等級
        
        返回：
        - 負數：level1 < level2
        - 0：相等
        - 正數：level1 > level2
        """
        config1 = self.get_level_config(level1)
        config2 = self.get_level_config(level2)
        
        if config1 and config2:
            return config1.order - config2.order
        return 0
    
    def get_upgrade_options(self, current_level: MembershipLevel) -> List[LevelConfig]:
        """獲取可升級的等級選項"""
        current_config = self.get_level_config(current_level)
        if not current_config:
            return self.get_all_levels()
        
        return [
            config for config in self.get_all_levels()
            if config.order > current_config.order
        ]


# ==================== 全局訪問 ====================

def get_level_config_service() -> LevelConfigService:
    """獲取等級配置服務實例"""
    return LevelConfigService()


# ==================== 向後兼容的 SUBSCRIPTION_TIERS ====================

def get_subscription_tiers() -> Dict[str, Dict[str, Any]]:
    """
    生成向後兼容的 SUBSCRIPTION_TIERS
    
    供舊代碼使用，從 MEMBERSHIP_LEVELS 動態生成
    """
    return get_level_config_service().get_subscription_tiers()


# ==================== 便捷方法 ====================

def get_user_quota(level_str: str, quota_type: str) -> int:
    """
    便捷方法：獲取用戶配額
    
    Args:
        level_str: 等級字符串（支持新舊格式）
        quota_type: 配額類型字符串
    """
    service = get_level_config_service()
    level = MembershipLevel.from_string(level_str)
    
    try:
        qt = QuotaType(quota_type)
        return service.get_quota(level, qt)
    except ValueError:
        logger.warning(f"Unknown quota type: {quota_type}")
        return 0


def check_user_quota(
    level_str: str, 
    quota_type: str, 
    current_usage: int
) -> Dict[str, Any]:
    """
    便捷方法：檢查用戶配額
    
    Args:
        level_str: 等級字符串
        quota_type: 配額類型字符串
        current_usage: 當前使用量
    """
    service = get_level_config_service()
    level = MembershipLevel.from_string(level_str)
    
    try:
        qt = QuotaType(quota_type)
        return service.check_quota_limit(level, qt, current_usage)
    except ValueError:
        return {'allowed': True, 'limit': -1, 'unlimited': True}


def has_user_feature(level_str: str, feature: str) -> bool:
    """
    便捷方法：檢查用戶是否有指定功能
    
    Args:
        level_str: 等級字符串
        feature: 功能名稱
    """
    service = get_level_config_service()
    level = MembershipLevel.from_string(level_str)
    return service.has_feature(level, feature)
