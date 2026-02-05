"""
自动恢复管理器
==============

功能：
1. 自动检测可恢复的故障
2. 执行恢复策略
3. 恢复结果验证
4. 恢复历史记录

恢复类型：
- API 重试恢复
- 服务重启
- 连接重建
- 降级恢复
"""

import sys
import asyncio
import time
from typing import Any, Callable, Dict, List, Optional, Set
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


class RecoveryType(Enum):
    """恢复类型"""
    RETRY = "retry"                 # 重试
    RESTART = "restart"             # 重启
    RECONNECT = "reconnect"         # 重连
    RESET = "reset"                 # 重置
    FAILOVER = "failover"           # 故障转移
    DEGRADE = "degrade"             # 降级


class RecoveryStatus(Enum):
    """恢复状态"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class RecoveryTarget:
    """恢复目标"""
    id: str
    type: str              # api, service, connection
    name: str
    metadata: Dict = field(default_factory=dict)


@dataclass
class RecoveryAction:
    """恢复动作"""
    id: str
    target: RecoveryTarget
    recovery_type: RecoveryType
    status: RecoveryStatus = RecoveryStatus.PENDING
    
    # 执行信息
    attempts: int = 0
    max_attempts: int = 3
    last_attempt: float = 0
    
    # 结果
    success: bool = False
    error: str = ""
    duration_ms: int = 0
    
    # 时间戳
    created_at: float = field(default_factory=time.time)
    completed_at: float = 0
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "target": {
                "id": self.target.id,
                "type": self.target.type,
                "name": self.target.name
            },
            "recovery_type": self.recovery_type.value,
            "status": self.status.value,
            "attempts": self.attempts,
            "max_attempts": self.max_attempts,
            "success": self.success,
            "error": self.error,
            "duration_ms": self.duration_ms,
            "created_at": self.created_at,
            "completed_at": self.completed_at
        }


@dataclass
class RecoveryPolicy:
    """恢复策略"""
    id: str
    name: str
    enabled: bool = True
    
    # 触发条件
    trigger_on_unhealthy: bool = True
    trigger_on_exhausted: bool = True
    trigger_on_error: bool = True
    
    # 恢复配置
    recovery_type: RecoveryType = RecoveryType.RETRY
    max_attempts: int = 3
    attempt_interval: int = 60      # 重试间隔（秒）
    cooldown: int = 300             # 恢复成功后冷却时间（秒）
    
    # 条件
    min_failure_duration: int = 60  # 故障持续多久才触发恢复
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "enabled": self.enabled,
            "trigger_on_unhealthy": self.trigger_on_unhealthy,
            "trigger_on_exhausted": self.trigger_on_exhausted,
            "trigger_on_error": self.trigger_on_error,
            "recovery_type": self.recovery_type.value,
            "max_attempts": self.max_attempts,
            "attempt_interval": self.attempt_interval,
            "cooldown": self.cooldown,
            "min_failure_duration": self.min_failure_duration
        }


class RecoveryExecutor:
    """恢复执行器"""
    
    def __init__(self):
        self._handlers: Dict[RecoveryType, Callable] = {}
        self._register_default_handlers()
    
    def _register_default_handlers(self) -> None:
        """注册默认处理器"""
        self._handlers[RecoveryType.RETRY] = self._handle_retry
        self._handlers[RecoveryType.RESET] = self._handle_reset
        self._handlers[RecoveryType.RECONNECT] = self._handle_reconnect
    
    def register_handler(
        self, 
        recovery_type: RecoveryType, 
        handler: Callable
    ) -> None:
        """注册自定义处理器"""
        self._handlers[recovery_type] = handler
    
    async def execute(self, action: RecoveryAction) -> bool:
        """执行恢复动作"""
        handler = self._handlers.get(action.recovery_type)
        
        if not handler:
            logger.warning(f"No handler for recovery type: {action.recovery_type}")
            return False
        
        try:
            result = await handler(action)
            return result
        except Exception as e:
            logger.error(f"Recovery execution failed: {e}")
            action.error = str(e)
            return False
    
    async def _handle_retry(self, action: RecoveryAction) -> bool:
        """处理重试恢复"""
        target = action.target
        
        if target.type == "api":
            return await self._retry_api(target.id)
        
        return False
    
    async def _handle_reset(self, action: RecoveryAction) -> bool:
        """处理重置恢复"""
        target = action.target
        
        if target.type == "api":
            return await self._reset_api(target.id)
        
        return False
    
    async def _handle_reconnect(self, action: RecoveryAction) -> bool:
        """处理重连恢复"""
        # 实现重连逻辑
        return True
    
    async def _retry_api(self, api_id: str) -> bool:
        """重试 API"""
        try:
            from core.api_pool import get_api_pool
            pool = get_api_pool()
            
            if pool:
                # 尝试重新启用 API
                result = await pool.enable_api(api_id)
                
                if result:
                    logger.info(f"API {api_id} recovered via retry")
                    return True
        except Exception as e:
            logger.error(f"Retry API failed: {e}")
        
        return False
    
    async def _reset_api(self, api_id: str) -> bool:
        """重置 API 状态"""
        try:
            from core.api_pool import get_api_pool
            pool = get_api_pool()
            
            if pool:
                # 重置 API 计数器等状态
                result = await pool.reset_api_status(api_id)
                
                if result:
                    logger.info(f"API {api_id} reset successfully")
                    return True
        except Exception as e:
            logger.error(f"Reset API failed: {e}")
        
        return False


class AutoRecoveryManager:
    """
    自动恢复管理器
    
    监控故障并自动执行恢复策略
    """
    
    def __init__(
        self,
        enabled: bool = True,
        check_interval: int = 30
    ):
        self.enabled = enabled
        self.check_interval = check_interval
        
        # 恢复策略
        self._policies: Dict[str, RecoveryPolicy] = {}
        self._init_default_policies()
        
        # 执行器
        self._executor = RecoveryExecutor()
        
        # 状态跟踪
        self._failure_start: Dict[str, float] = {}  # target_id -> first_failure_time
        self._recovery_cooldowns: Dict[str, float] = {}  # target_id -> cooldown_until
        self._in_recovery: Set[str] = set()
        
        # 待处理队列
        self._pending_actions: List[RecoveryAction] = []
        
        # 历史记录
        self._history: List[RecoveryAction] = []
        self._max_history = 200
        
        # 统计
        self._stats = {
            "total_recoveries": 0,
            "successful": 0,
            "failed": 0,
            "in_progress": 0
        }
        
        # 监控任务
        self._monitor_task: Optional[asyncio.Task] = None
        self._running = False
        
        logger.info("AutoRecoveryManager initialized")
    
    def _init_default_policies(self) -> None:
        """初始化默认策略"""
        # API 恢复策略
        self._policies["api_recovery"] = RecoveryPolicy(
            id="api_recovery",
            name="API 自动恢复",
            recovery_type=RecoveryType.RETRY,
            max_attempts=3,
            attempt_interval=60,
            cooldown=300
        )
        
        # API 重置策略
        self._policies["api_reset"] = RecoveryPolicy(
            id="api_reset",
            name="API 状态重置",
            recovery_type=RecoveryType.RESET,
            trigger_on_unhealthy=False,
            trigger_on_exhausted=True,
            max_attempts=1,
            cooldown=600
        )
    
    # ==================== 生命周期 ====================
    
    async def start(self) -> None:
        """启动自动恢复"""
        if self._running:
            return
        
        self._running = True
        self._monitor_task = asyncio.create_task(self._monitor_loop())
        
        logger.info("AutoRecoveryManager started")
    
    async def stop(self) -> None:
        """停止自动恢复"""
        self._running = False
        
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
        
        logger.info("AutoRecoveryManager stopped")
    
    async def _monitor_loop(self) -> None:
        """监控循环"""
        while self._running:
            try:
                if self.enabled:
                    await self._check_and_recover()
                
                await asyncio.sleep(self.check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Monitor loop error: {e}")
                await asyncio.sleep(self.check_interval)
    
    # ==================== 故障检测 ====================
    
    def report_failure(
        self,
        target_id: str,
        target_type: str,
        target_name: str,
        failure_type: str,
        metadata: Dict = None
    ) -> Optional[RecoveryAction]:
        """
        报告故障
        
        Returns:
            如果创建了恢复动作则返回
        """
        now = time.time()
        
        # 记录首次故障时间
        if target_id not in self._failure_start:
            self._failure_start[target_id] = now
        
        # 检查是否在冷却期
        if target_id in self._recovery_cooldowns:
            if now < self._recovery_cooldowns[target_id]:
                return None
        
        # 检查是否已在恢复中
        if target_id in self._in_recovery:
            return None
        
        # 查找适用的策略
        policy = self._find_policy(failure_type)
        if not policy or not policy.enabled:
            return None
        
        # 检查故障持续时间
        failure_duration = now - self._failure_start[target_id]
        if failure_duration < policy.min_failure_duration:
            return None
        
        # 创建恢复动作
        action = self._create_action(
            target_id=target_id,
            target_type=target_type,
            target_name=target_name,
            policy=policy,
            metadata=metadata
        )
        
        # 添加到待处理队列
        self._pending_actions.append(action)
        self._in_recovery.add(target_id)
        
        logger.info(f"Recovery action created for {target_id}: {policy.recovery_type.value}")
        
        return action
    
    def report_recovery(self, target_id: str) -> None:
        """报告目标已自行恢复"""
        if target_id in self._failure_start:
            del self._failure_start[target_id]
        
        if target_id in self._in_recovery:
            self._in_recovery.discard(target_id)
    
    def _find_policy(self, failure_type: str) -> Optional[RecoveryPolicy]:
        """查找适用的策略"""
        for policy in self._policies.values():
            if not policy.enabled:
                continue
            
            if failure_type == "unhealthy" and policy.trigger_on_unhealthy:
                return policy
            if failure_type == "exhausted" and policy.trigger_on_exhausted:
                return policy
            if failure_type == "error" and policy.trigger_on_error:
                return policy
        
        return None
    
    def _create_action(
        self,
        target_id: str,
        target_type: str,
        target_name: str,
        policy: RecoveryPolicy,
        metadata: Dict = None
    ) -> RecoveryAction:
        """创建恢复动作"""
        target = RecoveryTarget(
            id=target_id,
            type=target_type,
            name=target_name,
            metadata=metadata or {}
        )
        
        action_id = f"recovery-{int(time.time() * 1000)}"
        
        return RecoveryAction(
            id=action_id,
            target=target,
            recovery_type=policy.recovery_type,
            max_attempts=policy.max_attempts
        )
    
    # ==================== 恢复执行 ====================
    
    async def _check_and_recover(self) -> None:
        """检查并执行恢复"""
        now = time.time()
        completed = []
        
        for action in self._pending_actions:
            # 检查是否可以执行下一次尝试
            if action.last_attempt > 0:
                policy = self._policies.get("api_recovery")
                if policy and now - action.last_attempt < policy.attempt_interval:
                    continue
            
            # 执行恢复
            await self._execute_action(action)
            
            # 检查是否完成
            if action.status in [RecoveryStatus.SUCCESS, RecoveryStatus.FAILED]:
                completed.append(action)
        
        # 移除完成的动作
        for action in completed:
            self._pending_actions.remove(action)
            self._history.append(action)
            self._in_recovery.discard(action.target.id)
            
            # 清理故障记录
            if action.success:
                if action.target.id in self._failure_start:
                    del self._failure_start[action.target.id]
                
                # 设置冷却
                policy = self._policies.get("api_recovery")
                if policy:
                    self._recovery_cooldowns[action.target.id] = now + policy.cooldown
        
        # 清理历史
        if len(self._history) > self._max_history:
            self._history = self._history[-self._max_history:]
    
    async def _execute_action(self, action: RecoveryAction) -> None:
        """执行单个恢复动作"""
        action.status = RecoveryStatus.IN_PROGRESS
        action.attempts += 1
        action.last_attempt = time.time()
        
        self._stats["in_progress"] += 1
        
        start_time = time.time()
        
        try:
            success = await self._executor.execute(action)
            
            action.duration_ms = int((time.time() - start_time) * 1000)
            
            if success:
                action.status = RecoveryStatus.SUCCESS
                action.success = True
                action.completed_at = time.time()
                
                self._stats["successful"] += 1
                self._stats["total_recoveries"] += 1
                
                logger.info(f"Recovery successful: {action.target.id}")
                
                # 发送事件
                self._emit_recovery_event(action, True)
            else:
                if action.attempts >= action.max_attempts:
                    action.status = RecoveryStatus.FAILED
                    action.completed_at = time.time()
                    
                    self._stats["failed"] += 1
                    self._stats["total_recoveries"] += 1
                    
                    logger.warning(f"Recovery failed after {action.attempts} attempts: {action.target.id}")
                    
                    self._emit_recovery_event(action, False)
                else:
                    action.status = RecoveryStatus.PENDING
                    logger.info(f"Recovery attempt {action.attempts} failed, will retry: {action.target.id}")
        
        except Exception as e:
            action.error = str(e)
            action.status = RecoveryStatus.FAILED if action.attempts >= action.max_attempts else RecoveryStatus.PENDING
            logger.error(f"Recovery error: {e}")
        
        finally:
            self._stats["in_progress"] -= 1
    
    def _emit_recovery_event(self, action: RecoveryAction, success: bool) -> None:
        """发送恢复事件"""
        try:
            from core.event_emitter import event_emitter, EventType
            
            if success:
                event_emitter.emit(EventType.API_RECOVERED, {
                    "api_id": action.target.id,
                    "recovery_type": action.recovery_type.value,
                    "attempts": action.attempts
                })
            else:
                event_emitter.emit(EventType.ALERT_NEW, {
                    "type": "recovery_failed",
                    "level": "warning",
                    "title": "自动恢复失败",
                    "message": f"{action.target.name} 恢复失败，已尝试 {action.attempts} 次"
                })
        except:
            pass
    
    # ==================== 手动操作 ====================
    
    async def trigger_recovery(
        self,
        target_id: str,
        target_type: str = "api",
        target_name: str = None,
        recovery_type: RecoveryType = RecoveryType.RETRY
    ) -> RecoveryAction:
        """手动触发恢复"""
        target = RecoveryTarget(
            id=target_id,
            type=target_type,
            name=target_name or target_id
        )
        
        action = RecoveryAction(
            id=f"manual-{int(time.time() * 1000)}",
            target=target,
            recovery_type=recovery_type,
            max_attempts=1
        )
        
        await self._execute_action(action)
        self._history.append(action)
        
        return action
    
    def cancel_recovery(self, target_id: str) -> bool:
        """取消恢复"""
        for action in self._pending_actions:
            if action.target.id == target_id:
                action.status = RecoveryStatus.SKIPPED
                self._pending_actions.remove(action)
                self._in_recovery.discard(target_id)
                return True
        return False
    
    # ==================== 策略管理 ====================
    
    def get_policies(self) -> List[Dict]:
        """获取所有策略"""
        return [p.to_dict() for p in self._policies.values()]
    
    def update_policy(self, policy_id: str, **kwargs) -> Optional[RecoveryPolicy]:
        """更新策略"""
        if policy_id not in self._policies:
            return None
        
        policy = self._policies[policy_id]
        
        for key, value in kwargs.items():
            if hasattr(policy, key):
                setattr(policy, key, value)
        
        return policy
    
    # ==================== 查询接口 ====================
    
    def get_pending_actions(self) -> List[Dict]:
        """获取待处理的恢复动作"""
        return [a.to_dict() for a in self._pending_actions]
    
    def get_history(self, limit: int = 20) -> List[Dict]:
        """获取恢复历史"""
        return [a.to_dict() for a in self._history[-limit:][::-1]]
    
    def get_stats(self) -> Dict:
        """获取统计信息"""
        return {
            **self._stats,
            "enabled": self.enabled,
            "pending_count": len(self._pending_actions),
            "in_cooldown": len(self._recovery_cooldowns),
            "policies_count": len(self._policies)
        }


# ==================== 全局实例 ====================

_manager: Optional[AutoRecoveryManager] = None


def get_recovery_manager() -> AutoRecoveryManager:
    """获取恢复管理器"""
    global _manager
    if _manager is None:
        _manager = AutoRecoveryManager()
    return _manager


async def start_auto_recovery() -> AutoRecoveryManager:
    """启动自动恢复"""
    manager = get_recovery_manager()
    await manager.start()
    return manager
