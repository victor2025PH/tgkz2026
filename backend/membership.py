"""
TG-Matrix Membership System (Backend)
會員等級系統 - 後端驗證和配額管理

會員等級（王者榮耀風格）：
⚔️ 青銅戰士 (Bronze) - 免費體驗
🥈 白銀精英 (Silver) - 個人用戶
🥇 黃金大師 (Gold) - 專業用戶
💎 鑽石王牌 (Diamond) - 高級用戶
🌟 星耀傳說 (Star) - 團隊用戶
👑 榮耀王者 (King) - 企業/無限
"""

import json
import hashlib
import secrets
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List
from dataclasses import dataclass, asdict
from enum import Enum


class MembershipLevel(Enum):
    BRONZE = "bronze"     # 青銅 - 免費
    SILVER = "silver"     # 白銀 - VIP
    GOLD = "gold"         # 黃金 - SVIP
    DIAMOND = "diamond"   # 鑽石 - 高級
    STAR = "star"         # 星耀 - 團隊
    KING = "king"         # 王者 - 無限


@dataclass
class Quotas:
    max_accounts: int
    daily_messages: int  # -1 = unlimited
    daily_ai_calls: int  # -1 = unlimited
    max_groups: int
    max_keyword_sets: int
    data_retention_days: int


@dataclass
class FeatureAccess:
    account_management: bool = True
    keyword_monitoring: bool = True
    lead_capture: bool = True
    ai_auto_reply: bool = False
    ad_broadcast: bool = False
    data_export: bool = False
    batch_operations: bool = False
    multi_role: bool = False
    ai_sales_funnel: bool = False
    advanced_analytics: bool = False
    smart_anti_block: bool = False
    api_access: bool = False
    team_management: bool = False
    custom_branding: bool = False
    priority_support: bool = False


@dataclass
class UsageStats:
    today_messages: int = 0
    today_ai_calls: int = 0
    today_date: str = ""
    total_messages: int = 0
    total_ai_calls: int = 0
    total_leads: int = 0


@dataclass
class MembershipInfo:
    level: str
    expires_at: Optional[datetime] = None
    activated_at: Optional[datetime] = None
    license_key: Optional[str] = None
    machine_id: str = ""
    invite_code: str = ""
    invited_by: Optional[str] = None
    invite_count: int = 0
    usage: Optional[UsageStats] = None


# 會員配置（王者榮耀風格）
MEMBERSHIP_CONFIG: Dict[str, Dict[str, Any]] = {
    "bronze": {
        "name": "青銅戰士",
        "icon": "⚔️",
        "rank": 1,
        "price_monthly": 0,
        "price_yearly": 0,
        "quotas": Quotas(
            max_accounts=2,
            daily_messages=20,
            daily_ai_calls=10,
            max_groups=3,
            max_keyword_sets=1,
            data_retention_days=7
        ),
        "features": FeatureAccess(
            ai_auto_reply=True,  # 限額
        )
    },
    "silver": {
        "name": "白銀精英",
        "icon": "🥈",
        "rank": 2,
        "price_monthly": 49,
        "price_yearly": 399,
        "quotas": Quotas(
            max_accounts=5,
            daily_messages=100,
            daily_ai_calls=50,
            max_groups=10,
            max_keyword_sets=3,
            data_retention_days=15
        ),
        "features": FeatureAccess(
            ai_auto_reply=True,
            ad_broadcast=True,
        )
    },
    "gold": {
        "name": "黃金大師",
        "icon": "🥇",
        "rank": 3,
        "price_monthly": 99,
        "price_yearly": 799,
        "quotas": Quotas(
            max_accounts=10,
            daily_messages=300,
            daily_ai_calls=200,
            max_groups=30,
            max_keyword_sets=10,
            data_retention_days=30
        ),
        "features": FeatureAccess(
            ai_auto_reply=True,
            ad_broadcast=True,
            data_export=True,
            batch_operations=True,
        )
    },
    "diamond": {
        "name": "鑽石王牌",
        "icon": "💎",
        "rank": 4,
        "price_monthly": 199,
        "price_yearly": 1599,
        "quotas": Quotas(
            max_accounts=20,
            daily_messages=1000,
            daily_ai_calls=-1,  # 無限
            max_groups=100,
            max_keyword_sets=-1,
            data_retention_days=60
        ),
        "features": FeatureAccess(
            ai_auto_reply=True,
            ad_broadcast=True,
            data_export=True,
            batch_operations=True,
            multi_role=True,
            ai_sales_funnel=True,
            advanced_analytics=True,
        )
    },
    "star": {
        "name": "星耀傳說",
        "icon": "🌟",
        "rank": 5,
        "price_monthly": 399,
        "price_yearly": 2999,
        "quotas": Quotas(
            max_accounts=50,
            daily_messages=-1,
            daily_ai_calls=-1,
            max_groups=-1,
            max_keyword_sets=-1,
            data_retention_days=180
        ),
        "features": FeatureAccess(
            ai_auto_reply=True,
            ad_broadcast=True,
            data_export=True,
            batch_operations=True,
            multi_role=True,
            ai_sales_funnel=True,
            advanced_analytics=True,
            smart_anti_block=True,
            team_management=True,
            priority_support=True,
        )
    },
    "king": {
        "name": "榮耀王者",
        "icon": "👑",
        "rank": 6,
        "price_monthly": 999,
        "price_yearly": 6999,
        "quotas": Quotas(
            max_accounts=-1,  # 無限
            daily_messages=-1,
            daily_ai_calls=-1,
            max_groups=-1,
            max_keyword_sets=-1,
            data_retention_days=365
        ),
        "features": FeatureAccess(
            ai_auto_reply=True,
            ad_broadcast=True,
            data_export=True,
            batch_operations=True,
            multi_role=True,
            ai_sales_funnel=True,
            advanced_analytics=True,
            smart_anti_block=True,
            api_access=True,
            team_management=True,
            custom_branding=True,
            priority_support=True,
        )
    }
}


class MembershipManager:
    """會員管理器"""
    
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.membership_file = data_dir / "membership.json"
        self.usage_file = data_dir / "usage.json"
        self._membership: Optional[MembershipInfo] = None
        self._usage: Optional[UsageStats] = None
        self._load()
    
    def _load(self) -> None:
        """加載會員信息"""
        try:
            if self.membership_file.exists():
                with open(self.membership_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self._membership = MembershipInfo(
                        level=data.get('level', 'free'),
                        expires_at=datetime.fromisoformat(data['expires_at']) if data.get('expires_at') else None,
                        activated_at=datetime.fromisoformat(data['activated_at']) if data.get('activated_at') else None,
                        license_key=data.get('license_key'),
                        machine_id=data.get('machine_id', ''),
                        invite_code=data.get('invite_code', self._generate_invite_code()),
                        invited_by=data.get('invited_by'),
                        invite_count=data.get('invite_count', 0),
                    )
            else:
                self._initialize_free()
            
            # 加載使用量
            if self.usage_file.exists():
                with open(self.usage_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self._usage = UsageStats(**data)
                    self._check_reset_daily()
            else:
                self._usage = UsageStats(today_date=datetime.now().strftime('%Y-%m-%d'))
                
        except Exception as e:
            print(f"[Membership] Error loading: {e}")
            self._initialize_free()
    
    def _save(self) -> None:
        """保存會員信息"""
        try:
            if self._membership:
                data = {
                    'level': self._membership.level,
                    'expires_at': self._membership.expires_at.isoformat() if self._membership.expires_at else None,
                    'activated_at': self._membership.activated_at.isoformat() if self._membership.activated_at else None,
                    'license_key': self._membership.license_key,
                    'machine_id': self._membership.machine_id,
                    'invite_code': self._membership.invite_code,
                    'invited_by': self._membership.invited_by,
                    'invite_count': self._membership.invite_count,
                }
                with open(self.membership_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
            
            if self._usage:
                with open(self.usage_file, 'w', encoding='utf-8') as f:
                    json.dump(asdict(self._usage), f, ensure_ascii=False, indent=2)
                    
        except Exception as e:
            print(f"[Membership] Error saving: {e}")
    
    def _initialize_free(self) -> None:
        """初始化免費會員（青銅戰士）"""
        self._membership = MembershipInfo(
            level="bronze",  # 青銅戰士
            activated_at=datetime.now(),
            invite_code=self._generate_invite_code(),
        )
        self._usage = UsageStats(today_date=datetime.now().strftime('%Y-%m-%d'))
        self._save()
    
    def _generate_invite_code(self) -> str:
        """生成邀請碼"""
        return secrets.token_hex(4).upper()
    
    def _check_reset_daily(self) -> None:
        """檢查並重置每日配額"""
        if not self._usage:
            return
        
        today = datetime.now().strftime('%Y-%m-%d')
        if self._usage.today_date != today:
            self._usage.today_messages = 0
            self._usage.today_ai_calls = 0
            self._usage.today_date = today
            self._save()
    
    # ============ 會員狀態 ============
    
    @property
    def level(self) -> str:
        """獲取當前會員等級"""
        return self._membership.level if self._membership else "bronze"
    
    @property
    def is_active(self) -> bool:
        """檢查會員是否有效"""
        if not self._membership:
            return False
        
        if self._membership.level == "bronze":
            return True  # 青銅永遠有效
        
        if self._membership.expires_at:
            return datetime.now() < self._membership.expires_at
        
        return False
    
    @property
    def effective_level(self) -> str:
        """獲取有效會員等級（過期則降為青銅）"""
        if self.is_active:
            return self.level
        return "bronze"
    
    @property
    def quotas(self) -> Quotas:
        """獲取當前配額"""
        return MEMBERSHIP_CONFIG[self.effective_level]["quotas"]
    
    @property
    def features(self) -> FeatureAccess:
        """獲取當前功能權限"""
        return MEMBERSHIP_CONFIG[self.effective_level]["features"]
    
    def get_info(self) -> Dict[str, Any]:
        """獲取會員信息"""
        config = MEMBERSHIP_CONFIG[self.effective_level]
        days_remaining = -1
        
        if self._membership and self._membership.expires_at:
            delta = self._membership.expires_at - datetime.now()
            days_remaining = max(0, delta.days)
        
        return {
            "level": self.effective_level,
            "level_name": config["name"],
            "level_icon": config["icon"],
            "is_active": self.is_active,
            "days_remaining": days_remaining,
            "expires_at": self._membership.expires_at.isoformat() if self._membership and self._membership.expires_at else None,
            "invite_code": self._membership.invite_code if self._membership else "",
            "invite_count": self._membership.invite_count if self._membership else 0,
            "quotas": asdict(self.quotas),
            "usage": asdict(self._usage) if self._usage else {},
        }
    
    # ============ 激活和驗證 ============
    
    def activate(self, license_key: str, machine_id: str = "") -> Tuple[bool, str]:
        """
        激活會員（王者榮耀風格等級）
        
        卡密格式: TGM-[類型]-[XXXX]-[XXXX]-[XXXX]
        類型碼:
          B1/B2/B3 = 白銀 周/月/季卡
          G1/G2/G3 = 黃金 周/月/季卡
          D1/D2/D3 = 鑽石 周/月/季卡
          S1/S2/S3 = 星耀 周/月/季卡
          K1/K2/K3 = 王者 周/月/季卡
          BY/GY/DY/SY/KY = 年卡
        """
        import re
        
        # 驗證格式
        pattern = r'^TGM-([BGDSK][123Y])-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$'
        match = re.match(pattern, license_key.upper())
        
        if not match:
            return False, "卡密格式不正確，請檢查卡密"
        
        type_code = match.group(1)
        
        # 解析等級
        level_map = {
            'B': 'silver',   # 白銀
            'G': 'gold',     # 黃金
            'D': 'diamond',  # 鑽石
            'S': 'star',     # 星耀
            'K': 'king',     # 王者
        }
        
        # 解析時長
        duration_map = {
            '1': 7,      # 周卡
            '2': 30,     # 月卡
            '3': 90,     # 季卡
            'Y': 365,    # 年卡
        }
        
        level_code = type_code[0]
        duration_code = type_code[1]
        
        level = level_map.get(level_code, 'silver')
        duration_days = duration_map.get(duration_code, 30)
        
        # TODO: 在生產環境中，這裡應該調用服務器API驗證卡密
        # response = await self._verify_with_server(license_key, machine_id)
        
        # 計算到期時間
        expires_at = datetime.now()
        if self._membership and self._membership.expires_at and self._membership.expires_at > datetime.now():
            expires_at = self._membership.expires_at
        expires_at += timedelta(days=duration_days)
        
        # 更新會員信息
        self._membership = MembershipInfo(
            level=level,
            expires_at=expires_at,
            activated_at=datetime.now(),
            license_key=license_key.upper(),
            machine_id=machine_id,
            invite_code=self._membership.invite_code if self._membership else self._generate_invite_code(),
            invited_by=self._membership.invited_by if self._membership else None,
            invite_count=self._membership.invite_count if self._membership else 0,
        )
        
        self._save()
        
        config = MEMBERSHIP_CONFIG[level]
        return True, f"{config['icon']} {config['name']} 激活成功！有效期至 {expires_at.strftime('%Y-%m-%d')}"
    
    # ============ 配額檢查 ============
    
    def can_add_account(self, current_count: int) -> Tuple[bool, str]:
        """檢查是否可以添加賬戶"""
        max_accounts = self.quotas.max_accounts
        if max_accounts == -1:
            return True, ""
        
        if current_count >= max_accounts:
            config = MEMBERSHIP_CONFIG[self.effective_level]
            return False, f"{config['icon']} {config['name']} 最多支持 {max_accounts} 個賬戶"
        
        return True, ""
    
    def can_send_message(self) -> Tuple[bool, int, str]:
        """檢查是否可以發送消息，返回 (allowed, remaining, message)"""
        daily = self.quotas.daily_messages
        if daily == -1:
            return True, -1, ""
        
        self._check_reset_daily()
        remaining = daily - (self._usage.today_messages if self._usage else 0)
        
        if remaining <= 0:
            return False, 0, f"今日消息配額已用完 ({daily}條)"
        
        return True, remaining, ""
    
    def can_use_ai(self) -> Tuple[bool, int, str]:
        """檢查是否可以使用AI"""
        daily = self.quotas.daily_ai_calls
        if daily == -1:
            return True, -1, ""
        
        self._check_reset_daily()
        remaining = daily - (self._usage.today_ai_calls if self._usage else 0)
        
        if remaining <= 0:
            return False, 0, f"今日AI配額已用完 ({daily}次)"
        
        return True, remaining, ""
    
    def can_add_group(self, current_count: int) -> Tuple[bool, str]:
        """檢查是否可以添加群組"""
        max_groups = self.quotas.max_groups
        if max_groups == -1:
            return True, ""
        
        if current_count >= max_groups:
            return False, f"群組數量已達上限 ({max_groups}個)"
        
        return True, ""
    
    def has_feature(self, feature: str) -> bool:
        """檢查功能是否可用"""
        features = self.features
        return getattr(features, feature, False)
    
    # ============ 使用量記錄 ============
    
    def record_message(self, count: int = 1) -> None:
        """記錄消息發送"""
        if not self._usage:
            self._usage = UsageStats(today_date=datetime.now().strftime('%Y-%m-%d'))
        
        self._check_reset_daily()
        self._usage.today_messages += count
        self._usage.total_messages += count
        self._save()
    
    def record_ai_call(self, count: int = 1) -> None:
        """記錄AI調用"""
        if not self._usage:
            self._usage = UsageStats(today_date=datetime.now().strftime('%Y-%m-%d'))
        
        self._check_reset_daily()
        self._usage.today_ai_calls += count
        self._usage.total_ai_calls += count
        self._save()
    
    def record_lead(self, count: int = 1) -> None:
        """記錄獲取Lead"""
        if not self._usage:
            self._usage = UsageStats(today_date=datetime.now().strftime('%Y-%m-%d'))
        
        self._usage.total_leads += count
        self._save()


# 全局實例
_membership_manager: Optional[MembershipManager] = None


def get_membership_manager(data_dir: Optional[Path] = None) -> MembershipManager:
    """獲取會員管理器實例"""
    global _membership_manager
    
    if _membership_manager is None:
        if data_dir is None:
            data_dir = Path(__file__).parent / "data"
        data_dir.mkdir(parents=True, exist_ok=True)
        _membership_manager = MembershipManager(data_dir)
    
    return _membership_manager


# 便捷函數
def check_feature(feature: str) -> bool:
    """檢查功能是否可用"""
    return get_membership_manager().has_feature(feature)


def check_quota(quota_type: str, current_count: int = 0) -> Tuple[bool, str]:
    """檢查配額"""
    manager = get_membership_manager()
    
    if quota_type == "account":
        return manager.can_add_account(current_count)
    elif quota_type == "group":
        return manager.can_add_group(current_count)
    elif quota_type == "message":
        allowed, remaining, msg = manager.can_send_message()
        return allowed, msg
    elif quota_type == "ai":
        allowed, remaining, msg = manager.can_use_ai()
        return allowed, msg
    
    return True, ""
