"""
TG-Matrix Login Scheduler
管理登录时间分布，避免批量登录被检测
"""
import hashlib
import random
from typing import Dict
from datetime import datetime, timedelta


class LoginScheduler:
    """管理登录时间分布"""
    
    @staticmethod
    def calculate_login_delay(phone: str, base_delay_hours: int = 0) -> int:
        """
        为账户计算登录延迟（秒）
        
        策略：
        1. 使用电话号码生成确定性延迟（0-24小时）
        2. 添加随机分钟数（0-60分钟）增加随机性
        3. 确保不同账户在不同时间登录
        
        Args:
            phone: 电话号码
            base_delay_hours: 基础延迟小时数（可选）
        
        Returns:
            延迟秒数
        """
        # 使用电话号码生成确定性哈希
        phone_hash = int(hashlib.md5(phone.encode()).hexdigest(), 16)
        
        # 生成确定性延迟小时数（0-23小时）
        delay_hours = phone_hash % 24
        
        # 添加基础延迟
        delay_hours += base_delay_hours
        
        # 添加随机分钟数（0-60分钟），增加随机性但保持可预测性
        # 使用电话号码作为随机种子，确保同一账户的随机数是固定的
        random.seed(phone_hash)
        delay_minutes = random.randint(0, 60)
        
        total_delay = delay_hours * 3600 + delay_minutes * 60
        
        return total_delay
    
    @staticmethod
    def get_scheduled_login_time(phone: str, base_delay_hours: int = 0) -> datetime:
        """
        获取计划的登录时间
        
        Args:
            phone: 电话号码
            base_delay_hours: 基础延迟小时数
        
        Returns:
            计划的登录时间
        """
        delay_seconds = LoginScheduler.calculate_login_delay(phone, base_delay_hours)
        return datetime.now() + timedelta(seconds=delay_seconds)
    
    @staticmethod
    def should_delay_login(phone: str, max_concurrent_logins: int = 3) -> bool:
        """
        判断是否应该延迟登录
        
        用于控制同时登录的账户数量
        
        Args:
            phone: 电话号码
            max_concurrent_logins: 最大并发登录数
        
        Returns:
            是否应该延迟
        """
        # 这里可以添加更复杂的逻辑
        # 例如：检查当前正在登录的账户数量
        # 如果超过 max_concurrent_logins，返回 True
        
        # 简化实现：根据电话号码的哈希值决定
        phone_hash = int(hashlib.md5(phone.encode()).hexdigest(), 16)
        
        # 如果哈希值较小，立即登录；否则延迟
        # 这样可以分散登录时间
        return (phone_hash % 10) >= max_concurrent_logins
    
    @staticmethod
    def get_login_priority(phone: str) -> int:
        """
        获取登录优先级（1-10，数字越大优先级越高）
        
        可以根据账户重要性、创建时间等因素调整优先级
        """
        phone_hash = int(hashlib.md5(phone.encode()).hexdigest(), 16)
        return (phone_hash % 10) + 1

