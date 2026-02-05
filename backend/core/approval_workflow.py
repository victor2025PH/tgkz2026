"""
操作审批流程
============

功能：
1. 敏感操作需要审批
2. 审批工作流管理
3. 审批记录和审计
4. 超时自动处理

需要审批的操作：
- 批量禁用 API
- 删除 API
- 批量账号操作
- 系统配置变更
- 清除数据
"""

import sys
import time
from typing import Any, Callable, Dict, List, Optional, Set
from dataclasses import dataclass, field
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ApprovalStatus(Enum):
    """审批状态"""
    PENDING = "pending"       # 待审批
    APPROVED = "approved"     # 已批准
    REJECTED = "rejected"     # 已拒绝
    EXPIRED = "expired"       # 已过期
    CANCELLED = "cancelled"   # 已取消
    EXECUTED = "executed"     # 已执行


class OperationType(Enum):
    """操作类型"""
    # API 操作
    API_BATCH_DISABLE = "api.batch_disable"
    API_DELETE = "api.delete"
    API_BATCH_DELETE = "api.batch_delete"
    
    # 账号操作
    ACCOUNT_BATCH_DELETE = "account.batch_delete"
    ACCOUNT_BATCH_DISABLE = "account.batch_disable"
    
    # 系统操作
    SYSTEM_CONFIG_CHANGE = "system.config_change"
    SYSTEM_RESET = "system.reset"
    DATA_CLEAR = "data.clear"
    
    # 扩缩容
    SCALING_EXECUTE = "scaling.execute"


class RiskLevel(Enum):
    """风险等级"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class ApprovalRule:
    """审批规则"""
    operation_type: OperationType
    risk_level: RiskLevel
    requires_approval: bool = True
    min_approvers: int = 1
    timeout_seconds: int = 3600  # 默认 1 小时
    auto_reject_on_timeout: bool = True
    
    def to_dict(self) -> Dict:
        return {
            "operation_type": self.operation_type.value,
            "risk_level": self.risk_level.value,
            "requires_approval": self.requires_approval,
            "min_approvers": self.min_approvers,
            "timeout_seconds": self.timeout_seconds,
            "auto_reject_on_timeout": self.auto_reject_on_timeout
        }


@dataclass
class ApprovalRequest:
    """审批请求"""
    id: str
    operation_type: OperationType
    status: ApprovalStatus = ApprovalStatus.PENDING
    
    # 请求者信息
    requester_id: str = ""
    requester_name: str = ""
    
    # 操作详情
    title: str = ""
    description: str = ""
    operation_data: Dict = field(default_factory=dict)
    
    # 审批信息
    approvers: List[Dict] = field(default_factory=list)
    required_approvers: int = 1
    
    # 时间
    created_at: float = field(default_factory=time.time)
    expires_at: float = 0
    completed_at: float = 0
    
    # 回调
    on_approve: Optional[str] = None  # 回调函数名
    on_reject: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "operation_type": self.operation_type.value,
            "status": self.status.value,
            "requester_id": self.requester_id,
            "requester_name": self.requester_name,
            "title": self.title,
            "description": self.description,
            "operation_data": self.operation_data,
            "approvers": self.approvers,
            "required_approvers": self.required_approvers,
            "created_at": self.created_at,
            "expires_at": self.expires_at,
            "completed_at": self.completed_at,
            "is_expired": time.time() > self.expires_at if self.expires_at else False
        }


class ApprovalWorkflow:
    """
    审批工作流管理器
    
    管理敏感操作的审批流程
    """
    
    def __init__(self):
        # 审批规则
        self._rules: Dict[OperationType, ApprovalRule] = {}
        self._init_default_rules()
        
        # 审批请求
        self._requests: Dict[str, ApprovalRequest] = {}
        
        # 回调函数注册
        self._callbacks: Dict[str, Callable] = {}
        
        # 历史记录
        self._history: List[ApprovalRequest] = []
        self._max_history = 200
        
        # 计数器
        self._request_count = 0
        
        # 统计
        self._stats = {
            "total_requests": 0,
            "approved": 0,
            "rejected": 0,
            "expired": 0,
            "pending": 0
        }
        
        logger.info("ApprovalWorkflow initialized")
    
    def _init_default_rules(self) -> None:
        """初始化默认规则"""
        rules = [
            ApprovalRule(
                OperationType.API_DELETE,
                RiskLevel.MEDIUM,
                min_approvers=1,
                timeout_seconds=3600
            ),
            ApprovalRule(
                OperationType.API_BATCH_DELETE,
                RiskLevel.HIGH,
                min_approvers=1,
                timeout_seconds=1800
            ),
            ApprovalRule(
                OperationType.API_BATCH_DISABLE,
                RiskLevel.MEDIUM,
                min_approvers=1,
                timeout_seconds=3600
            ),
            ApprovalRule(
                OperationType.ACCOUNT_BATCH_DELETE,
                RiskLevel.HIGH,
                min_approvers=1,
                timeout_seconds=1800
            ),
            ApprovalRule(
                OperationType.SYSTEM_CONFIG_CHANGE,
                RiskLevel.HIGH,
                min_approvers=1,
                timeout_seconds=3600
            ),
            ApprovalRule(
                OperationType.SYSTEM_RESET,
                RiskLevel.CRITICAL,
                min_approvers=2,
                timeout_seconds=7200
            ),
            ApprovalRule(
                OperationType.DATA_CLEAR,
                RiskLevel.CRITICAL,
                min_approvers=2,
                timeout_seconds=7200
            ),
            ApprovalRule(
                OperationType.SCALING_EXECUTE,
                RiskLevel.LOW,
                requires_approval=False
            )
        ]
        
        for rule in rules:
            self._rules[rule.operation_type] = rule
    
    # ==================== 请求管理 ====================
    
    def create_request(
        self,
        operation_type: OperationType,
        title: str,
        description: str,
        operation_data: Dict,
        requester_id: str = "",
        requester_name: str = "",
        on_approve: Callable = None,
        on_reject: Callable = None
    ) -> ApprovalRequest:
        """
        创建审批请求
        
        Args:
            operation_type: 操作类型
            title: 请求标题
            description: 请求描述
            operation_data: 操作数据
            requester_id: 请求者 ID
            requester_name: 请求者名称
            on_approve: 批准回调
            on_reject: 拒绝回调
        
        Returns:
            审批请求对象
        """
        rule = self._rules.get(operation_type)
        
        # 如果不需要审批，直接返回已批准的请求
        if rule and not rule.requires_approval:
            self._request_count += 1
            request = ApprovalRequest(
                id=f"approval-{self._request_count}",
                operation_type=operation_type,
                status=ApprovalStatus.APPROVED,
                requester_id=requester_id,
                requester_name=requester_name,
                title=title,
                description=description,
                operation_data=operation_data,
                completed_at=time.time()
            )
            
            # 直接执行回调
            if on_approve:
                try:
                    on_approve(request)
                except Exception as e:
                    logger.error(f"Approval callback error: {e}")
            
            self._stats["total_requests"] += 1
            self._stats["approved"] += 1
            
            return request
        
        # 创建需要审批的请求
        self._request_count += 1
        request_id = f"approval-{self._request_count}"
        
        # 计算过期时间
        timeout = rule.timeout_seconds if rule else 3600
        expires_at = time.time() + timeout
        
        # 注册回调
        if on_approve:
            self._callbacks[f"{request_id}_approve"] = on_approve
        if on_reject:
            self._callbacks[f"{request_id}_reject"] = on_reject
        
        request = ApprovalRequest(
            id=request_id,
            operation_type=operation_type,
            requester_id=requester_id,
            requester_name=requester_name,
            title=title,
            description=description,
            operation_data=operation_data,
            required_approvers=rule.min_approvers if rule else 1,
            expires_at=expires_at,
            on_approve=f"{request_id}_approve" if on_approve else None,
            on_reject=f"{request_id}_reject" if on_reject else None
        )
        
        self._requests[request_id] = request
        
        self._stats["total_requests"] += 1
        self._stats["pending"] += 1
        
        logger.info(f"Approval request created: {request_id} - {title}")
        
        # 发送通知
        self._notify_pending(request)
        
        return request
    
    def _notify_pending(self, request: ApprovalRequest) -> None:
        """发送待审批通知"""
        try:
            from core.event_emitter import event_emitter, EventType
            event_emitter.emit(EventType.ALERT_NEW, {
                "type": "approval_pending",
                "level": "info",
                "title": "待审批请求",
                "message": f"{request.title} - 等待审批",
                "request_id": request.id
            })
        except:
            pass
    
    # ==================== 审批操作 ====================
    
    def approve(
        self,
        request_id: str,
        approver_id: str,
        approver_name: str = "",
        comment: str = ""
    ) -> Optional[ApprovalRequest]:
        """
        批准请求
        
        Args:
            request_id: 请求 ID
            approver_id: 审批者 ID
            approver_name: 审批者名称
            comment: 审批意见
        
        Returns:
            更新后的请求，如果不存在则返回 None
        """
        request = self._requests.get(request_id)
        if not request:
            return None
        
        if request.status != ApprovalStatus.PENDING:
            return request
        
        # 检查是否过期
        if time.time() > request.expires_at:
            request.status = ApprovalStatus.EXPIRED
            self._stats["pending"] -= 1
            self._stats["expired"] += 1
            return request
        
        # 添加审批者
        request.approvers.append({
            "id": approver_id,
            "name": approver_name,
            "action": "approve",
            "comment": comment,
            "timestamp": time.time()
        })
        
        # 检查是否达到审批人数
        approve_count = sum(1 for a in request.approvers if a["action"] == "approve")
        
        if approve_count >= request.required_approvers:
            request.status = ApprovalStatus.APPROVED
            request.completed_at = time.time()
            
            self._stats["pending"] -= 1
            self._stats["approved"] += 1
            
            # 执行回调
            if request.on_approve and request.on_approve in self._callbacks:
                try:
                    self._callbacks[request.on_approve](request)
                except Exception as e:
                    logger.error(f"Approval callback error: {e}")
            
            # 移动到历史
            self._move_to_history(request)
            
            logger.info(f"Request approved: {request_id}")
        
        return request
    
    def reject(
        self,
        request_id: str,
        approver_id: str,
        approver_name: str = "",
        reason: str = ""
    ) -> Optional[ApprovalRequest]:
        """
        拒绝请求
        
        Args:
            request_id: 请求 ID
            approver_id: 审批者 ID
            approver_name: 审批者名称
            reason: 拒绝原因
        
        Returns:
            更新后的请求
        """
        request = self._requests.get(request_id)
        if not request:
            return None
        
        if request.status != ApprovalStatus.PENDING:
            return request
        
        request.approvers.append({
            "id": approver_id,
            "name": approver_name,
            "action": "reject",
            "reason": reason,
            "timestamp": time.time()
        })
        
        request.status = ApprovalStatus.REJECTED
        request.completed_at = time.time()
        
        self._stats["pending"] -= 1
        self._stats["rejected"] += 1
        
        # 执行回调
        if request.on_reject and request.on_reject in self._callbacks:
            try:
                self._callbacks[request.on_reject](request)
            except Exception as e:
                logger.error(f"Rejection callback error: {e}")
        
        # 移动到历史
        self._move_to_history(request)
        
        logger.info(f"Request rejected: {request_id}")
        
        return request
    
    def cancel(self, request_id: str, reason: str = "") -> Optional[ApprovalRequest]:
        """取消请求（由请求者取消）"""
        request = self._requests.get(request_id)
        if not request:
            return None
        
        if request.status != ApprovalStatus.PENDING:
            return request
        
        request.status = ApprovalStatus.CANCELLED
        request.completed_at = time.time()
        
        self._stats["pending"] -= 1
        
        self._move_to_history(request)
        
        logger.info(f"Request cancelled: {request_id}")
        
        return request
    
    def _move_to_history(self, request: ApprovalRequest) -> None:
        """移动请求到历史"""
        if request.id in self._requests:
            del self._requests[request.id]
        
        self._history.append(request)
        
        if len(self._history) > self._max_history:
            self._history = self._history[-self._max_history:]
        
        # 清理回调
        for key in [request.on_approve, request.on_reject]:
            if key and key in self._callbacks:
                del self._callbacks[key]
    
    # ==================== 过期处理 ====================
    
    def check_expired(self) -> List[ApprovalRequest]:
        """检查并处理过期请求"""
        now = time.time()
        expired = []
        
        for request_id, request in list(self._requests.items()):
            if request.status == ApprovalStatus.PENDING and now > request.expires_at:
                rule = self._rules.get(request.operation_type)
                
                if rule and rule.auto_reject_on_timeout:
                    request.status = ApprovalStatus.EXPIRED
                else:
                    request.status = ApprovalStatus.EXPIRED
                
                request.completed_at = now
                
                self._stats["pending"] -= 1
                self._stats["expired"] += 1
                
                expired.append(request)
                self._move_to_history(request)
                
                logger.info(f"Request expired: {request_id}")
        
        return expired
    
    # ==================== 规则管理 ====================
    
    def get_rules(self) -> List[Dict]:
        """获取所有规则"""
        return [r.to_dict() for r in self._rules.values()]
    
    def update_rule(self, operation_type: OperationType, **kwargs) -> Optional[ApprovalRule]:
        """更新规则"""
        if operation_type not in self._rules:
            return None
        
        rule = self._rules[operation_type]
        
        for key, value in kwargs.items():
            if hasattr(rule, key):
                setattr(rule, key, value)
        
        return rule
    
    def requires_approval(self, operation_type: OperationType) -> bool:
        """检查操作是否需要审批"""
        rule = self._rules.get(operation_type)
        return rule.requires_approval if rule else False
    
    # ==================== 查询接口 ====================
    
    def get_pending_requests(self) -> List[Dict]:
        """获取待审批请求"""
        self.check_expired()  # 先检查过期
        
        pending = [
            r.to_dict() for r in self._requests.values()
            if r.status == ApprovalStatus.PENDING
        ]
        
        return sorted(pending, key=lambda x: x["created_at"], reverse=True)
    
    def get_request(self, request_id: str) -> Optional[Dict]:
        """获取请求详情"""
        if request_id in self._requests:
            return self._requests[request_id].to_dict()
        
        for req in self._history:
            if req.id == request_id:
                return req.to_dict()
        
        return None
    
    def get_history(self, limit: int = 20) -> List[Dict]:
        """获取历史请求"""
        return [r.to_dict() for r in self._history[-limit:][::-1]]
    
    def get_stats(self) -> Dict:
        """获取统计信息"""
        return {
            **self._stats,
            "rules_count": len(self._rules)
        }


# ==================== 全局实例 ====================

_workflow: Optional[ApprovalWorkflow] = None


def get_approval_workflow() -> ApprovalWorkflow:
    """获取审批工作流"""
    global _workflow
    if _workflow is None:
        _workflow = ApprovalWorkflow()
    return _workflow


# ==================== 装饰器 ====================

def requires_approval(operation_type: OperationType, title: str = ""):
    """
    需要审批的装饰器
    
    用法:
        @requires_approval(OperationType.API_DELETE)
        async def delete_api(api_id: str):
            ...
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            workflow = get_approval_workflow()
            
            if not workflow.requires_approval(operation_type):
                return await func(*args, **kwargs)
            
            # 创建审批请求
            request = workflow.create_request(
                operation_type=operation_type,
                title=title or f"执行 {operation_type.value}",
                description=f"参数: {args}, {kwargs}",
                operation_data={"args": list(args), "kwargs": kwargs},
                on_approve=lambda r: func(*args, **kwargs)
            )
            
            return {
                "pending_approval": True,
                "request_id": request.id,
                "message": "操作需要审批，请等待处理"
            }
        
        return wrapper
    return decorator
