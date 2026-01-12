"""
TG-Matrix Warmup Manager
账户预热管理器 - 逐步增加账户活动量，降低封禁风险
"""
from typing import Dict, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass


@dataclass
class WarmupStage:
    """Warmup 阶段配置"""
    stage: int
    name: str
    days: int  # 该阶段持续天数
    daily_limit: int  # 每日发送限制
    allowed_actions: List[str]  # 允许的操作：receive_only, reply_only, active, full
    description: str


class WarmupManager:
    """账户预热管理器"""
    
    # Warmup 阶段配置
    STAGES = [
        WarmupStage(
            stage=1,
            name="静默观察期",
            days=3,
            daily_limit=0,
            allowed_actions=["receive_only"],
            description="只接收消息，不发送任何消息。建立账户活跃度基础。"
        ),
        WarmupStage(
            stage=2,
            name="少量回复期",
            days=4,
            daily_limit=5,
            allowed_actions=["receive_only", "reply_only"],
            description="可以回复消息，但每日限制 5 条。保持低频率活动。"
        ),
        WarmupStage(
            stage=3,
            name="逐步活跃期",
            days=7,
            daily_limit=15,
            allowed_actions=["receive_only", "reply_only", "active"],
            description="可以主动发送消息，每日限制 15 条。逐步增加活动量。"
        ),
        WarmupStage(
            stage=4,
            name="正常使用期",
            days=0,  # 0 表示永久
            daily_limit=50,  # 使用账户的默认限制
            allowed_actions=["receive_only", "reply_only", "active", "full"],
            description="可以正常使用，使用账户的默认每日限制。"
        )
    ]
    
    @classmethod
    def get_stage_by_number(cls, stage: int) -> Optional[WarmupStage]:
        """根据阶段号获取阶段配置"""
        for s in cls.STAGES:
            if s.stage == stage:
                return s
        return None
    
    @classmethod
    def calculate_current_stage(
        cls,
        warmup_start_date: datetime,
        current_date: Optional[datetime] = None
    ) -> Dict[str, any]:
        """
        计算账户当前 Warmup 阶段
        
        Args:
            warmup_start_date: Warmup 开始日期
            current_date: 当前日期（可选，默认使用当前时间）
        
        Returns:
            {
                "stage": 阶段号 (1-4),
                "stage_name": 阶段名称,
                "days_completed": 已完成天数,
                "days_remaining": 剩余天数,
                "daily_limit": 每日限制,
                "allowed_actions": 允许的操作,
                "is_completed": 是否完成 Warmup
            }
        """
        if current_date is None:
            current_date = datetime.now()
        
        # 计算已过天数
        days_completed = (current_date - warmup_start_date).days
        
        # 累计各阶段天数
        total_days = 0
        current_stage = cls.STAGES[0]  # 默认第一阶段
        
        for stage in cls.STAGES:
            if stage.days == 0:  # 最后阶段（永久）
                break
            
            if days_completed < total_days + stage.days:
                # 还在当前阶段
                current_stage = stage
                days_remaining = (total_days + stage.days) - days_completed
                break
            
            total_days += stage.days
        else:
            # 所有阶段完成，进入最后阶段
            current_stage = cls.STAGES[-1]
            days_remaining = 0
        
        # 计算当前阶段内的完成天数
        stage_days_completed = days_completed - (total_days - current_stage.days) if current_stage != cls.STAGES[0] else days_completed
        
        return {
            "stage": current_stage.stage,
            "stage_name": current_stage.name,
            "days_completed": days_completed,
            "stage_days_completed": stage_days_completed,
            "days_remaining": days_remaining if current_stage.days > 0 else None,
            "daily_limit": current_stage.daily_limit,
            "allowed_actions": current_stage.allowed_actions,
            "is_completed": current_stage.stage == cls.STAGES[-1].stage,
            "description": current_stage.description
        }
    
    @classmethod
    def should_allow_send(
        cls,
        account_data: Dict,
        message_type: str = "active"  # receive_only, reply_only, active, full
    ) -> Dict[str, any]:
        """
        判断账户是否可以发送消息
        
        Args:
            account_data: 账户数据（包含 warmup 相关字段）
            message_type: 消息类型
        
        Returns:
            {
                "allowed": 是否允许,
                "reason": 原因,
                "current_stage": 当前阶段信息,
                "daily_limit": 当前每日限制
            }
        """
        # 检查是否启用 Warmup
        warmup_enabled = account_data.get('warmupEnabled', False)
        if not warmup_enabled:
            # 未启用 Warmup，使用账户默认限制
            return {
                "allowed": True,
                "reason": "Warmup 未启用",
                "current_stage": None,
                "daily_limit": account_data.get('dailySendLimit', 50)
            }
        
        # 获取 Warmup 开始日期
        warmup_start_date_str = account_data.get('warmupStartDate')
        if not warmup_start_date_str:
            # 没有开始日期，可能是新账户，应该启动 Warmup
            return {
                "allowed": False,
                "reason": "Warmup 未启动，请先登录账户",
                "current_stage": None,
                "daily_limit": 0
            }
        
        # 解析开始日期
        try:
            warmup_start_date = datetime.fromisoformat(warmup_start_date_str.replace('Z', '+00:00'))
        except Exception:
            # 日期格式错误，使用当前日期
            warmup_start_date = datetime.now()
        
        # 计算当前阶段
        stage_info = cls.calculate_current_stage(warmup_start_date)
        
        # 检查是否完成 Warmup
        if stage_info['is_completed']:
            # Warmup 完成，使用账户默认限制
            return {
                "allowed": True,
                "reason": "Warmup 已完成",
                "current_stage": stage_info,
                "daily_limit": account_data.get('dailySendLimit', 50)
            }
        
        # 检查消息类型是否允许
        if message_type not in stage_info['allowed_actions']:
            return {
                "allowed": False,
                "reason": f"当前阶段 ({stage_info['stage_name']}) 不允许 {message_type} 类型的消息",
                "current_stage": stage_info,
                "daily_limit": stage_info['daily_limit']
            }
        
        # 检查每日限制
        daily_send_count = account_data.get('dailySendCount', 0)
        daily_limit = stage_info['daily_limit']
        
        if daily_send_count >= daily_limit:
            return {
                "allowed": False,
                "reason": f"已达到每日限制 ({daily_send_count}/{daily_limit})",
                "current_stage": stage_info,
                "daily_limit": daily_limit
            }
        
        return {
            "allowed": True,
            "reason": "允许发送",
            "current_stage": stage_info,
            "daily_limit": daily_limit
        }
    
    @classmethod
    def start_warmup(cls, account_id: int, start_date: Optional[datetime] = None) -> Dict[str, any]:
        """
        启动账户 Warmup
        
        Args:
            account_id: 账户 ID
            start_date: 开始日期（可选，默认使用当前时间）
        
        Returns:
            Warmup 启动信息
        """
        if start_date is None:
            start_date = datetime.now()
        
        stage_info = cls.calculate_current_stage(start_date)
        
        return {
            "account_id": account_id,
            "warmup_start_date": start_date.isoformat(),
            "warmup_enabled": True,
            "warmup_stage": stage_info['stage'],
            "warmup_days_completed": 0,
            "current_stage_info": stage_info
        }
    
    @classmethod
    def get_warmup_progress(cls, account_data: Dict) -> Dict[str, any]:
        """
        获取账户 Warmup 进度
        
        Args:
            account_data: 账户数据
        
        Returns:
            Warmup 进度信息
        """
        warmup_enabled = account_data.get('warmupEnabled', False)
        if not warmup_enabled:
            return {
                "enabled": False,
                "message": "Warmup 未启用"
            }
        
        warmup_start_date_str = account_data.get('warmupStartDate')
        if not warmup_start_date_str:
            return {
                "enabled": True,
                "message": "Warmup 未启动",
                "stage": None
            }
        
        try:
            warmup_start_date = datetime.fromisoformat(warmup_start_date_str.replace('Z', '+00:00'))
        except Exception:
            return {
                "enabled": True,
                "message": "Warmup 日期格式错误",
                "stage": None
            }
        
        stage_info = cls.calculate_current_stage(warmup_start_date)
        
        # 计算总进度
        total_warmup_days = sum(s.days for s in cls.STAGES if s.days > 0)
        progress_percentage = min(100, (stage_info['days_completed'] / total_warmup_days) * 100) if total_warmup_days > 0 else 100
        
        return {
            "enabled": True,
            "start_date": warmup_start_date_str,
            "stage": stage_info,
            "progress_percentage": progress_percentage,
            "total_days": total_warmup_days,
            "days_completed": stage_info['days_completed']
        }

