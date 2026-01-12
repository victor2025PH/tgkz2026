"""
TG-Matrix Device Fingerprint Generator
生成唯一的设备指纹，用于防封
"""
import hashlib
import random
from typing import Dict, List
from dataclasses import dataclass


@dataclass
class DeviceProfile:
    """设备配置"""
    device_model: str
    system_version: str
    app_version: str
    lang_code: str
    platform: str  # 'ios' or 'android'


class DeviceFingerprintGenerator:
    """生成唯一的设备指纹"""
    
    # iOS 设备配置库
    IOS_DEVICES = [
        DeviceProfile(
            device_model="iPhone 14 Pro",
            system_version="iOS 17.1.2",
            app_version="10.5.0",
            lang_code="en",
            platform="ios"
        ),
        DeviceProfile(
            device_model="iPhone 14",
            system_version="iOS 17.0.3",
            app_version="10.4.8",
            lang_code="en",
            platform="ios"
        ),
        DeviceProfile(
            device_model="iPhone 13 Pro",
            system_version="iOS 16.7.2",
            app_version="10.4.5",
            lang_code="en",
            platform="ios"
        ),
        DeviceProfile(
            device_model="iPhone 13",
            system_version="iOS 16.6.1",
            app_version="10.4.3",
            lang_code="en",
            platform="ios"
        ),
        DeviceProfile(
            device_model="iPhone 12 Pro",
            system_version="iOS 15.7.9",
            app_version="10.3.8",
            lang_code="en",
            platform="ios"
        ),
    ]
    
    # Android 设备配置库
    ANDROID_DEVICES = [
        DeviceProfile(
            device_model="Samsung Galaxy S23",
            system_version="Android 13",
            app_version="10.4.5",
            lang_code="en",
            platform="android"
        ),
        DeviceProfile(
            device_model="Samsung Galaxy S22",
            system_version="Android 12",
            app_version="10.4.3",
            lang_code="en",
            platform="android"
        ),
        DeviceProfile(
            device_model="Xiaomi 13 Pro",
            system_version="Android 13",
            app_version="10.4.3",
            lang_code="zh",
            platform="android"
        ),
        DeviceProfile(
            device_model="Xiaomi 12",
            system_version="Android 12",
            app_version="10.3.5",
            lang_code="zh",
            platform="android"
        ),
        DeviceProfile(
            device_model="OPPO Find X5",
            system_version="Android 12",
            app_version="10.3.5",
            lang_code="zh",
            platform="android"
        ),
        DeviceProfile(
            device_model="OnePlus 11",
            system_version="Android 13",
            app_version="10.4.2",
            lang_code="en",
            platform="android"
        ),
        DeviceProfile(
            device_model="Google Pixel 7",
            system_version="Android 13",
            app_version="10.4.4",
            lang_code="en",
            platform="android"
        ),
        DeviceProfile(
            device_model="Huawei P50",
            system_version="Android 12",
            app_version="10.3.6",
            lang_code="zh",
            platform="android"
        ),
    ]
    
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
        return cls.IOS_DEVICES + cls.ANDROID_DEVICES
    
    @classmethod
    def get_profile_count(cls) -> Dict[str, int]:
        """获取设备配置统计"""
        return {
            "ios": len(cls.IOS_DEVICES),
            "android": len(cls.ANDROID_DEVICES),
            "total": len(cls.IOS_DEVICES) + len(cls.ANDROID_DEVICES)
        }

