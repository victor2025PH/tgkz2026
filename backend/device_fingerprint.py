"""
TG-Matrix Device Fingerprint Generator
生成唯一的设备指纹，用于防封

功能增強：
1. 支持更多設備型號（最新旗艦機）
2. 桌面設備支持
3. 智能隨機選擇策略（模擬真實市場份額）
4. IP 區域感知的設備分配
"""
import hashlib
import random
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict


@dataclass
class DeviceProfile:
    """设备配置"""
    device_model: str
    system_version: str
    app_version: str
    lang_code: str
    platform: str  # 'ios', 'android', 'desktop'
    weight: float = 1.0  # 權重（用於隨機選擇）


class DeviceFingerprintGenerator:
    """生成唯一的设备指纹"""
    
    # iOS 设备配置库（2024-2025 最新型號）
    IOS_DEVICES = [
        # iPhone 15 系列（最新，高權重）
        DeviceProfile(
            device_model="iPhone 15 Pro Max",
            system_version="iOS 17.4.1",
            app_version="10.12.1",
            lang_code="en",
            platform="ios",
            weight=3.0
        ),
        DeviceProfile(
            device_model="iPhone 15 Pro",
            system_version="iOS 17.4",
            app_version="10.12.0",
            lang_code="en",
            platform="ios",
            weight=3.0
        ),
        DeviceProfile(
            device_model="iPhone 15 Plus",
            system_version="iOS 17.3.1",
            app_version="10.11.5",
            lang_code="en",
            platform="ios",
            weight=2.0
        ),
        DeviceProfile(
            device_model="iPhone 15",
            system_version="iOS 17.3",
            app_version="10.11.2",
            lang_code="en",
            platform="ios",
            weight=2.5
        ),
        # iPhone 14 系列
        DeviceProfile(
            device_model="iPhone 14 Pro Max",
            system_version="iOS 17.2.1",
            app_version="10.10.2",
            lang_code="en",
            platform="ios",
            weight=2.0
        ),
        DeviceProfile(
            device_model="iPhone 14 Pro",
            system_version="iOS 17.1.2",
            app_version="10.9.3",
            lang_code="en",
            platform="ios",
            weight=2.0
        ),
        DeviceProfile(
            device_model="iPhone 14",
            system_version="iOS 17.0.3",
            app_version="10.8.5",
            lang_code="en",
            platform="ios",
            weight=1.5
        ),
        # iPhone 13 系列
        DeviceProfile(
            device_model="iPhone 13 Pro Max",
            system_version="iOS 16.7.5",
            app_version="10.8.3",
            lang_code="en",
            platform="ios",
            weight=1.0
        ),
        DeviceProfile(
            device_model="iPhone 13 Pro",
            system_version="iOS 16.7.2",
            app_version="10.7.5",
            lang_code="en",
            platform="ios",
            weight=1.0
        ),
        DeviceProfile(
            device_model="iPhone 13",
            system_version="iOS 16.6.1",
            app_version="10.6.3",
            lang_code="en",
            platform="ios",
            weight=1.0
        ),
        # 舊型號（低權重）
        DeviceProfile(
            device_model="iPhone 12 Pro",
            system_version="iOS 15.7.9",
            app_version="10.5.2",
            lang_code="en",
            platform="ios",
            weight=0.5
        ),
        DeviceProfile(
            device_model="iPhone SE (3rd generation)",
            system_version="iOS 17.2",
            app_version="10.10.0",
            lang_code="en",
            platform="ios",
            weight=0.3
        ),
    ]
    
    # Android 设备配置库（2024-2025 最新型號）
    ANDROID_DEVICES = [
        # Samsung Galaxy S24 系列（最新旗艦）
        DeviceProfile(
            device_model="Samsung Galaxy S24 Ultra",
            system_version="Android 14",
            app_version="10.12.1",
            lang_code="en",
            platform="android",
            weight=3.0
        ),
        DeviceProfile(
            device_model="Samsung Galaxy S24+",
            system_version="Android 14",
            app_version="10.12.0",
            lang_code="en",
            platform="android",
            weight=2.5
        ),
        DeviceProfile(
            device_model="Samsung Galaxy S24",
            system_version="Android 14",
            app_version="10.11.5",
            lang_code="en",
            platform="android",
            weight=2.5
        ),
        # Samsung Galaxy S23 系列
        DeviceProfile(
            device_model="Samsung Galaxy S23 Ultra",
            system_version="Android 14",
            app_version="10.11.0",
            lang_code="en",
            platform="android",
            weight=2.0
        ),
        DeviceProfile(
            device_model="Samsung Galaxy S23",
            system_version="Android 14",
            app_version="10.10.2",
            lang_code="en",
            platform="android",
            weight=1.5
        ),
        # Google Pixel 系列
        DeviceProfile(
            device_model="Google Pixel 8 Pro",
            system_version="Android 14",
            app_version="10.12.1",
            lang_code="en",
            platform="android",
            weight=2.0
        ),
        DeviceProfile(
            device_model="Google Pixel 8",
            system_version="Android 14",
            app_version="10.11.5",
            lang_code="en",
            platform="android",
            weight=1.5
        ),
        DeviceProfile(
            device_model="Google Pixel 7 Pro",
            system_version="Android 14",
            app_version="10.10.0",
            lang_code="en",
            platform="android",
            weight=1.0
        ),
        # Xiaomi 系列
        DeviceProfile(
            device_model="Xiaomi 14 Pro",
            system_version="Android 14 MIUI 15",
            app_version="10.11.5",
            lang_code="zh",
            platform="android",
            weight=2.0
        ),
        DeviceProfile(
            device_model="Xiaomi 14",
            system_version="Android 14 MIUI 15",
            app_version="10.10.2",
            lang_code="zh",
            platform="android",
            weight=1.5
        ),
        DeviceProfile(
            device_model="Xiaomi 13 Pro",
            system_version="Android 13 MIUI 14",
            app_version="10.8.3",
            lang_code="zh",
            platform="android",
            weight=1.0
        ),
        # OnePlus 系列
        DeviceProfile(
            device_model="OnePlus 12",
            system_version="Android 14 OxygenOS 14",
            app_version="10.11.5",
            lang_code="en",
            platform="android",
            weight=1.5
        ),
        DeviceProfile(
            device_model="OnePlus 11",
            system_version="Android 14 OxygenOS 14",
            app_version="10.9.2",
            lang_code="en",
            platform="android",
            weight=1.0
        ),
        # OPPO 系列
        DeviceProfile(
            device_model="OPPO Find X7 Ultra",
            system_version="Android 14 ColorOS 14",
            app_version="10.11.0",
            lang_code="zh",
            platform="android",
            weight=1.5
        ),
        DeviceProfile(
            device_model="OPPO Find X6 Pro",
            system_version="Android 13 ColorOS 13",
            app_version="10.8.5",
            lang_code="zh",
            platform="android",
            weight=1.0
        ),
        # Vivo 系列
        DeviceProfile(
            device_model="Vivo X100 Pro",
            system_version="Android 14 OriginOS 4",
            app_version="10.11.2",
            lang_code="zh",
            platform="android",
            weight=1.0
        ),
        # Honor 系列
        DeviceProfile(
            device_model="Honor Magic6 Pro",
            system_version="Android 14 MagicOS 8",
            app_version="10.10.5",
            lang_code="zh",
            platform="android",
            weight=1.0
        ),
        # 華為（鴻蒙模擬 Android）
        DeviceProfile(
            device_model="Huawei Mate 60 Pro",
            system_version="Android 12",
            app_version="10.8.0",
            lang_code="zh",
            platform="android",
            weight=0.8
        ),
    ]
    
    # 桌面設備配置庫
    DESKTOP_DEVICES = [
        DeviceProfile(
            device_model="Desktop",
            system_version="Windows 11",
            app_version="4.16.1",
            lang_code="en",
            platform="desktop",
            weight=1.0
        ),
        DeviceProfile(
            device_model="Desktop",
            system_version="Windows 10",
            app_version="4.15.2",
            lang_code="en",
            platform="desktop",
            weight=0.8
        ),
        DeviceProfile(
            device_model="Desktop",
            system_version="macOS 14.4",
            app_version="10.6.2",
            lang_code="en",
            platform="desktop",
            weight=0.6
        ),
        DeviceProfile(
            device_model="Desktop",
            system_version="macOS 13.6",
            app_version="10.5.5",
            lang_code="en",
            platform="desktop",
            weight=0.4
        ),
        DeviceProfile(
            device_model="Desktop",
            system_version="Ubuntu 22.04 LTS",
            app_version="4.16.1",
            lang_code="en",
            platform="desktop",
            weight=0.2
        ),
    ]
    
    # 平台分佈權重（模擬真實市場份額）
    PLATFORM_WEIGHTS = {
        "ios": 0.45,      # iOS 約 45%
        "android": 0.50,  # Android 約 50%
        "desktop": 0.05   # Desktop 約 5%
    }
    
    # 语言代码映射（根据电话号码国家代码）
    PHONE_TO_LANG = {
        "+86": "zh",  # 中国
        "+1": "en",   # 美国
        "+44": "en",  # 英国
        "+63": "en",  # 菲律宾
        "+91": "en",  # 印度
        "+7": "ru",   # 俄罗斯
        "+81": "ja",  # 日本
        "+82": "ko",  # 韩国
        "+33": "fr",  # 法国
        "+49": "de",  # 德国
    }
    
    @classmethod
    def get_lang_from_phone(cls, phone: str) -> str:
        """从电话号码提取语言代码"""
        # 提取国家代码（前1-3位）
        for country_code, lang in cls.PHONE_TO_LANG.items():
            if phone.startswith(country_code):
                return lang
        return "en"  # 默认英语
    
    @classmethod
    def generate_for_phone(cls, phone: str, prefer_platform: str = None) -> Dict[str, str]:
        """
        根据电话号码生成设备配置
        
        Args:
            phone: 电话号码（例如：+639952947692）
            prefer_platform: 首选平台 ('ios' 或 'android')，如果为 None 则随机选择
        
        Returns:
            设备配置字典
        """
        # 使用电话号码生成确定性哈希
        phone_hash = int(hashlib.md5(phone.encode()).hexdigest(), 16)
        
        # 获取语言代码
        lang_code = cls.get_lang_from_phone(phone)
        
        # 选择平台
        if prefer_platform:
            platform = prefer_platform
        else:
            # 根据哈希值选择平台（70% Android, 30% iOS，模拟真实分布）
            platform = "android" if (phone_hash % 10) < 7 else "ios"
        
        # 选择设备库
        if platform == "ios":
            devices = cls.IOS_DEVICES
        else:
            devices = cls.ANDROID_DEVICES
        
        # 过滤匹配语言的设备（如果可能）
        lang_devices = [d for d in devices if d.lang_code == lang_code]
        if not lang_devices:
            lang_devices = devices  # 如果没有匹配的，使用所有设备
        
        # 根据哈希值选择设备配置（确保同一账户总是得到相同的配置）
        profile = lang_devices[phone_hash % len(lang_devices)]
        
        # 生成唯一设备 ID（基于电话号码和平台）
        device_id = f"{platform}_{abs(phone_hash) % 1000000:06d}"
        
        return {
            "device_model": profile.device_model,
            "system_version": profile.system_version,
            "app_version": profile.app_version,
            "lang_code": lang_code,
            "platform": platform,
            "device_id": device_id
        }
    
    @classmethod
    def get_all_profiles(cls) -> List[DeviceProfile]:
        """获取所有设备配置"""
        return cls.IOS_DEVICES + cls.ANDROID_DEVICES + cls.DESKTOP_DEVICES
    
    @classmethod
    def get_profile_count(cls) -> Dict[str, int]:
        """获取设备配置统计"""
        return {
            "ios": len(cls.IOS_DEVICES),
            "android": len(cls.ANDROID_DEVICES),
            "desktop": len(cls.DESKTOP_DEVICES),
            "total": len(cls.IOS_DEVICES) + len(cls.ANDROID_DEVICES) + len(cls.DESKTOP_DEVICES)
        }
    
    @classmethod
    def generate_random(cls) -> DeviceProfile:
        """
        智能隨機生成設備指紋
        根據真實市場份額加權隨機選擇平台和設備
        
        Returns:
            隨機選擇的設備配置
        """
        # 根據平台權重選擇平台
        platforms = list(cls.PLATFORM_WEIGHTS.keys())
        weights = list(cls.PLATFORM_WEIGHTS.values())
        platform = random.choices(platforms, weights=weights, k=1)[0]
        
        return cls.generate_for_platform(platform)
    
    @classmethod
    def generate_for_platform(cls, platform: str) -> DeviceProfile:
        """
        為指定平台生成設備指紋
        使用加權隨機選擇具體設備
        
        Args:
            platform: 平台類型 ('ios', 'android', 'desktop')
            
        Returns:
            選擇的設備配置
        """
        if platform == "ios":
            devices = cls.IOS_DEVICES
        elif platform == "android":
            devices = cls.ANDROID_DEVICES
        elif platform == "desktop":
            devices = cls.DESKTOP_DEVICES
        else:
            # 未知平台，隨機選擇
            return cls.generate_random()
        
        # 使用權重進行加權隨機選擇
        weights = [d.weight for d in devices]
        selected = random.choices(devices, weights=weights, k=1)[0]
        
        # 返回新實例（避免修改原始對象）
        return DeviceProfile(
            device_model=selected.device_model,
            system_version=selected.system_version,
            app_version=selected.app_version,
            lang_code=selected.lang_code,
            platform=selected.platform,
            weight=selected.weight
        )
    
    @classmethod
    def generate_consistent_for_phone(cls, phone: str, prefer_platform: Optional[str] = None) -> DeviceProfile:
        """
        為特定手機號生成一致的設備指紋
        同一手機號始終返回相同的設備配置（用於防封）
        
        Args:
            phone: 手機號碼
            prefer_platform: 首選平台（可選）
            
        Returns:
            一致的設備配置
        """
        # 使用手機號生成確定性哈希
        phone_hash = int(hashlib.md5(phone.encode()).hexdigest(), 16)
        
        # 確定平台
        if prefer_platform and prefer_platform in ["ios", "android", "desktop"]:
            platform = prefer_platform
        else:
            # 根據哈希值確定平台
            platform_rand = (phone_hash % 100) / 100.0
            if platform_rand < cls.PLATFORM_WEIGHTS["ios"]:
                platform = "ios"
            elif platform_rand < cls.PLATFORM_WEIGHTS["ios"] + cls.PLATFORM_WEIGHTS["android"]:
                platform = "android"
            else:
                platform = "desktop"
        
        # 選擇設備庫
        if platform == "ios":
            devices = cls.IOS_DEVICES
        elif platform == "android":
            devices = cls.ANDROID_DEVICES
        else:
            devices = cls.DESKTOP_DEVICES
        
        # 根據哈希值選擇設備（確保一致性）
        device_index = phone_hash % len(devices)
        selected = devices[device_index]
        
        # 獲取語言代碼
        lang_code = cls.get_lang_from_phone(phone)
        
        return DeviceProfile(
            device_model=selected.device_model,
            system_version=selected.system_version,
            app_version=selected.app_version,
            lang_code=lang_code,
            platform=selected.platform,
            weight=selected.weight
        )
    
    @classmethod
    def diversify_for_ip(cls, existing_profiles: List[DeviceProfile], ip: str) -> DeviceProfile:
        """
        為同一 IP 下的帳號生成多樣化設備指紋
        避免同一 IP 下的設備型號過於集中
        
        Args:
            existing_profiles: 該 IP 下已有的設備配置列表
            ip: IP 地址
            
        Returns:
            多樣化的設備配置
        """
        # 統計已使用的平台
        used_platforms = {p.platform for p in existing_profiles}
        used_models = {p.device_model for p in existing_profiles}
        
        # 優先選擇未使用的平台
        available_platforms = []
        for platform in ["ios", "android", "desktop"]:
            if platform not in used_platforms:
                available_platforms.append(platform)
        
        if not available_platforms:
            # 所有平台都有，選擇設備數量最少的平台
            platform_counts = {"ios": 0, "android": 0, "desktop": 0}
            for p in existing_profiles:
                platform_counts[p.platform] = platform_counts.get(p.platform, 0) + 1
            platform = min(platform_counts, key=platform_counts.get)
        else:
            # 從可用平台中隨機選擇（加權）
            weights = [cls.PLATFORM_WEIGHTS.get(p, 0.5) for p in available_platforms]
            platform = random.choices(available_platforms, weights=weights, k=1)[0]
        
        # 在選定平台中選擇未使用的設備型號
        if platform == "ios":
            devices = cls.IOS_DEVICES
        elif platform == "android":
            devices = cls.ANDROID_DEVICES
        else:
            devices = cls.DESKTOP_DEVICES
        
        available_devices = [d for d in devices if d.device_model not in used_models]
        if not available_devices:
            available_devices = devices  # 如果全都用過了，就從頭開始
        
        # 加權隨機選擇
        weights = [d.weight for d in available_devices]
        selected = random.choices(available_devices, weights=weights, k=1)[0]
        
        return DeviceProfile(
            device_model=selected.device_model,
            system_version=selected.system_version,
            app_version=selected.app_version,
            lang_code=selected.lang_code,
            platform=selected.platform,
            weight=selected.weight
        )

