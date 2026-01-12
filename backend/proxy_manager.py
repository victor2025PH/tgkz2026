"""
TG-Matrix Proxy Manager
管理账户的代理分配，确保 IP 地理位置匹配
"""
import hashlib
from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class ProxyConfig:
    """代理配置"""
    proxy: str  # 代理地址，例如：socks5://user:pass@host:port
    country: str  # 国家代码，例如：CN, US, PH
    type: str  # 代理类型：residential, datacenter, mobile
    quality: str  # 质量评级：high, medium, low


class ProxyManager:
    """管理账户的代理分配"""
    
    # 国家代码映射（电话号码前缀 → 国家代码）
    PHONE_TO_COUNTRY = {
        "+86": "CN",   # 中国
        "+1": "US",    # 美国
        "+44": "GB",   # 英国
        "+63": "PH",   # 菲律宾
        "+91": "IN",   # 印度
        "+7": "RU",    # 俄罗斯
        "+81": "JP",   # 日本
        "+82": "KR",   # 韩国
        "+33": "FR",   # 法国
        "+49": "DE",   # 德国
        "+39": "IT",   # 意大利
        "+34": "ES",   # 西班牙
        "+61": "AU",   # 澳大利亚
        "+55": "BR",   # 巴西
        "+52": "MX",   # 墨西哥
    }
    
    @staticmethod
    def get_country_from_phone(phone: str) -> Optional[str]:
        """
        从电话号码提取国家代码
        
        Args:
            phone: 电话号码（例如：+639952947692）
        
        Returns:
            国家代码（例如：PH），如果无法识别则返回 None
        """
        for country_code, country in ProxyManager.PHONE_TO_COUNTRY.items():
            if phone.startswith(country_code):
                return country
        return None
    
    @staticmethod
    def assign_proxy(
        phone: str, 
        proxy_pool: List[ProxyConfig],
        prefer_residential: bool = True
    ) -> Optional[str]:
        """
        为账户分配代理
        
        策略：
        1. 优先选择与电话号码国家匹配的代理
        2. 优先选择住宅代理（如果 prefer_residential=True）
        3. 使用哈希确保同一账户总是得到相同的代理
        
        Args:
            phone: 电话号码
            proxy_pool: 代理池
            prefer_residential: 是否优先选择住宅代理
        
        Returns:
            代理地址，如果没有可用代理则返回 None
        """
        if not proxy_pool:
            return None
        
        country = ProxyManager.get_country_from_phone(phone)
        
        # 使用电话号码生成确定性哈希
        phone_hash = int(hashlib.md5(phone.encode()).hexdigest(), 16)
        
        # 过滤代理
        candidates = proxy_pool
        
        # 优先选择匹配国家的代理
        if country:
            country_proxies = [p for p in proxy_pool if p.country == country]
            if country_proxies:
                candidates = country_proxies
        
        # 优先选择住宅代理
        if prefer_residential:
            residential_proxies = [p for p in candidates if p.type == "residential"]
            if residential_proxies:
                candidates = residential_proxies
        
        # 优先选择高质量代理
        high_quality_proxies = [p for p in candidates if p.quality == "high"]
        if high_quality_proxies:
            candidates = high_quality_proxies
        
        # 根据哈希值选择代理（确保同一账户总是得到相同的代理）
        selected = candidates[phone_hash % len(candidates)]
        
        return selected.proxy
    
    @staticmethod
    def validate_proxy_format(proxy: str) -> bool:
        """
        验证代理格式
        
        支持的格式：
        - socks5://host:port
        - socks5://user:pass@host:port
        - http://host:port
        - http://user:pass@host:port
        - https://host:port
        """
        if not proxy:
            return False
        
        try:
            from urllib.parse import urlparse
            parsed = urlparse(proxy)
            
            # 检查协议
            if parsed.scheme not in ['socks5', 'http', 'https']:
                return False
            
            # 检查主机和端口
            if not parsed.hostname:
                return False
            
            if parsed.port is None:
                # 如果没有端口，使用默认端口
                if parsed.scheme == 'socks5':
                    return True  # 默认 1080
                elif parsed.scheme in ['http', 'https']:
                    return True  # 默认 80/443
            
            return True
        except Exception:
            return False
    
    @staticmethod
    def parse_proxy(proxy: str) -> Optional[Dict[str, str]]:
        """
        解析代理字符串为字典格式
        
        Returns:
            {
                "scheme": "socks5",
                "hostname": "host",
                "port": "1080",
                "username": "user" (可选),
                "password": "pass" (可选)
            }
        """
        if not proxy:
            return None
        
        try:
            from urllib.parse import urlparse
            
            parsed = urlparse(proxy)
            
            if parsed.scheme not in ['socks5', 'http', 'https']:
                return None
            
            result = {
                "scheme": parsed.scheme,
                "hostname": parsed.hostname,
                "port": str(parsed.port or (1080 if parsed.scheme == 'socks5' else 8080))
            }
            
            if parsed.username:
                result["username"] = parsed.username
            if parsed.password:
                result["password"] = parsed.password
            
            return result
        except Exception:
            return None

