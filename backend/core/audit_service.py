"""
运维操作审计日志服务

功能：
1. 记录所有运维操作
2. 操作分类和标签
3. 操作回溯和查询
4. 安全审计报告
"""

import sys
import time
import asyncio
import json
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
from functools import wraps
import logging

logger = logging.getLogger(__name__)


class AuditAction(Enum):
    """审计操作类型"""
    # API 池操作
    API_ADD = "api.add"                     # 添加 API
    API_REMOVE = "api.remove"               # 移除 API
    API_ENABLE = "api.enable"               # 启用 API
    API_DISABLE = "api.disable"             # 禁用 API
    API_UPDATE = "api.update"               # 更新 API
    
    # 账号操作
    ACCOUNT_LOGIN = "account.login"         # 账号登录
    ACCOUNT_LOGOUT = "account.logout"       # 账号登出
    ACCOUNT_ADD = "account.add"             # 添加账号
    ACCOUNT_REMOVE = "account.remove"       # 移除账号
    
    # 告警操作
    ALERT_RESOLVE = "alert.resolve"         # 解决告警
    ALERT_CLEAR = "alert.clear"             # 清除告警
    ALERT_CONFIGURE = "alert.configure"     # 配置告警规则
    
    # 系统操作
    SYSTEM_CONFIG = "system.config"         # 系统配置变更
    SYSTEM_RESTART = "system.restart"       # 系统重启
    SYSTEM_BACKUP = "system.backup"         # 系统备份
    
    # 用户操作
    USER_LOGIN = "user.login"               # 用户登录
    USER_LOGOUT = "user.logout"             # 用户登出
    USER_CREATE = "user.create"             # 创建用户
    USER_UPDATE = "user.update"             # 更新用户
    USER_DELETE = "user.delete"             # 删除用户
    
    # 数据操作
    DATA_EXPORT = "data.export"             # 数据导出
    DATA_IMPORT = "data.import"             # 数据导入
    DATA_DELETE = "data.delete"             # 数据删除


class ResourceType(Enum):
    """资源类型"""
    API = "api"
    ACCOUNT = "account"
    ALERT = "alert"
    USER = "user"
    SYSTEM = "system"
    DATA = "data"


@dataclass
class AuditEntry:
    """审计条目"""
    id: str
    action: AuditAction
    resource_type: ResourceType
    resource_id: str = ""
    user_id: str = ""
    user_name: str = ""
    ip_address: str = ""
    old_value: Any = None
    new_value: Any = None
    details: str = ""
    success: bool = True
    error: str = ""
    timestamp: float = field(default_factory=time.time)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'action': self.action.value,
            'resource_type': self.resource_type.value,
            'resource_id': self.resource_id,
            'user_id': self.user_id,
            'user_name': self.user_name,
            'ip_address': self.ip_address,
            'old_value': self.old_value,
            'new_value': self.new_value,
            'details': self.details,
            'success': self.success,
            'error': self.error,
            'timestamp': self.timestamp
        }


class AuditService:
    """
    审计日志服务
    
    职责：
    1. 记录所有敏感操作
    2. 提供审计查询
    3. 生成安全报告
    4. 异常操作检测
    """
    
    def __init__(self, persistence=None, max_memory_entries: int = 10000):
        self.persistence = persistence
        self.max_memory_entries = max_memory_entries
        
        # 内存中的审计日志
        self._entries: List[AuditEntry] = []
        
        # 计数器
        self._entry_counter = 0
        
        print("[AuditService] 初始化审计日志服务", file=sys.stderr)
    
    def set_persistence(self, persistence) -> None:
        """设置持久化服务"""
        self.persistence = persistence
    
    # ==================== 记录接口 ====================
    
    async def log(
        self,
        action: AuditAction,
        resource_type: ResourceType,
        resource_id: str = "",
        user_id: str = "",
        user_name: str = "",
        ip_address: str = "",
        old_value: Any = None,
        new_value: Any = None,
        details: str = "",
        success: bool = True,
        error: str = ""
    ) -> AuditEntry:
        """记录审计日志"""
        self._entry_counter += 1
        
        entry = AuditEntry(
            id=f"audit-{self._entry_counter}-{int(time.time())}",
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            user_id=user_id,
            user_name=user_name,
            ip_address=ip_address,
            old_value=old_value,
            new_value=new_value,
            details=details,
            success=success,
            error=error
        )
        
        # 添加到内存
        self._entries.append(entry)
        
        # 清理过旧的条目
        if len(self._entries) > self.max_memory_entries:
            self._entries = self._entries[-self.max_memory_entries:]
        
        # 持久化
        if self.persistence:
            await self.persistence.log_audit(
                action=action.value,
                resource_type=resource_type.value,
                resource_id=resource_id,
                user_id=user_id,
                user_name=user_name,
                ip_address=ip_address,
                old_value=old_value,
                new_value=new_value,
                details=details,
                success=success,
                error=error
            )
        
        # 打印日志
        status = "✅" if success else "❌"
        print(f"[Audit] {status} {action.value} - {resource_type.value}/{resource_id} "
              f"by {user_name or user_id or 'system'}", file=sys.stderr)
        
        return entry
    
    # ==================== 便捷方法 ====================
    
    async def log_api_add(
        self,
        api_id: str,
        user_id: str = "",
        user_name: str = "",
        ip_address: str = "",
        details: str = ""
    ) -> AuditEntry:
        """记录添加 API"""
        return await self.log(
            action=AuditAction.API_ADD,
            resource_type=ResourceType.API,
            resource_id=api_id,
            user_id=user_id,
            user_name=user_name,
            ip_address=ip_address,
            details=details or f"添加 API: {api_id}"
        )
    
    async def log_api_remove(
        self,
        api_id: str,
        user_id: str = "",
        user_name: str = "",
        ip_address: str = "",
        details: str = ""
    ) -> AuditEntry:
        """记录移除 API"""
        return await self.log(
            action=AuditAction.API_REMOVE,
            resource_type=ResourceType.API,
            resource_id=api_id,
            user_id=user_id,
            user_name=user_name,
            ip_address=ip_address,
            details=details or f"移除 API: {api_id}"
        )
    
    async def log_account_login(
        self,
        phone: str,
        user_id: str = "",
        ip_address: str = "",
        success: bool = True,
        error: str = ""
    ) -> AuditEntry:
        """记录账号登录"""
        return await self.log(
            action=AuditAction.ACCOUNT_LOGIN,
            resource_type=ResourceType.ACCOUNT,
            resource_id=phone,
            user_id=user_id,
            ip_address=ip_address,
            success=success,
            error=error,
            details=f"账号登录: {phone}" + (f" - 失败: {error}" if not success else "")
        )
    
    async def log_alert_resolve(
        self,
        alert_id: str,
        user_id: str = "",
        user_name: str = "",
        details: str = ""
    ) -> AuditEntry:
        """记录解决告警"""
        return await self.log(
            action=AuditAction.ALERT_RESOLVE,
            resource_type=ResourceType.ALERT,
            resource_id=alert_id,
            user_id=user_id,
            user_name=user_name,
            details=details or f"解决告警: {alert_id}"
        )
    
    async def log_system_config(
        self,
        config_key: str,
        old_value: Any,
        new_value: Any,
        user_id: str = "",
        user_name: str = ""
    ) -> AuditEntry:
        """记录系统配置变更"""
        return await self.log(
            action=AuditAction.SYSTEM_CONFIG,
            resource_type=ResourceType.SYSTEM,
            resource_id=config_key,
            old_value=old_value,
            new_value=new_value,
            user_id=user_id,
            user_name=user_name,
            details=f"配置变更: {config_key}"
        )
    
    # ==================== 查询接口 ====================
    
    def get_recent(self, limit: int = 50) -> List[Dict[str, Any]]:
        """获取最近的审计日志"""
        return [e.to_dict() for e in reversed(self._entries[-limit:])]
    
    def search(
        self,
        action: AuditAction = None,
        resource_type: ResourceType = None,
        resource_id: str = None,
        user_id: str = None,
        success: bool = None,
        start_time: float = None,
        end_time: float = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """搜索审计日志"""
        results = []
        
        for entry in reversed(self._entries):
            # 应用过滤条件
            if action and entry.action != action:
                continue
            if resource_type and entry.resource_type != resource_type:
                continue
            if resource_id and entry.resource_id != resource_id:
                continue
            if user_id and entry.user_id != user_id:
                continue
            if success is not None and entry.success != success:
                continue
            if start_time and entry.timestamp < start_time:
                continue
            if end_time and entry.timestamp > end_time:
                continue
            
            results.append(entry.to_dict())
            
            if len(results) >= limit:
                break
        
        return results
    
    def get_by_resource(self, resource_type: ResourceType, resource_id: str) -> List[Dict[str, Any]]:
        """获取特定资源的审计日志"""
        return self.search(resource_type=resource_type, resource_id=resource_id)
    
    def get_by_user(self, user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """获取特定用户的操作日志"""
        return self.search(user_id=user_id, limit=limit)
    
    def get_failures(self, limit: int = 50) -> List[Dict[str, Any]]:
        """获取失败的操作"""
        return self.search(success=False, limit=limit)
    
    # ==================== 统计和报告 ====================
    
    def get_summary(self, hours: int = 24) -> Dict[str, Any]:
        """获取审计摘要"""
        cutoff = time.time() - hours * 3600
        
        recent = [e for e in self._entries if e.timestamp >= cutoff]
        
        # 按操作类型统计
        action_counts = {}
        for entry in recent:
            action = entry.action.value
            action_counts[action] = action_counts.get(action, 0) + 1
        
        # 按资源类型统计
        resource_counts = {}
        for entry in recent:
            rtype = entry.resource_type.value
            resource_counts[rtype] = resource_counts.get(rtype, 0) + 1
        
        # 成功/失败统计
        success_count = sum(1 for e in recent if e.success)
        failure_count = len(recent) - success_count
        
        # 活跃用户
        active_users = set(e.user_id for e in recent if e.user_id)
        
        return {
            'period_hours': hours,
            'total_entries': len(recent),
            'success_count': success_count,
            'failure_count': failure_count,
            'success_rate': (success_count / len(recent) * 100) if recent else 100,
            'by_action': action_counts,
            'by_resource': resource_counts,
            'active_users': len(active_users),
            'top_actions': sorted(action_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        }
    
    def detect_anomalies(self) -> List[Dict[str, Any]]:
        """检测异常操作模式"""
        anomalies = []
        now = time.time()
        
        # 检查最近 1 小时
        recent = [e for e in self._entries if e.timestamp >= now - 3600]
        
        # 1. 连续失败
        failures = [e for e in recent if not e.success]
        if len(failures) >= 5:
            anomalies.append({
                'type': 'high_failure_rate',
                'message': f"过去 1 小时有 {len(failures)} 次操作失败",
                'severity': 'warning' if len(failures) < 10 else 'critical',
                'count': len(failures)
            })
        
        # 2. 异常操作频率（同一用户）
        user_counts = {}
        for entry in recent:
            if entry.user_id:
                user_counts[entry.user_id] = user_counts.get(entry.user_id, 0) + 1
        
        for user_id, count in user_counts.items():
            if count > 100:  # 每小时超过 100 次操作
                anomalies.append({
                    'type': 'high_activity_user',
                    'message': f"用户 {user_id} 过去 1 小时有 {count} 次操作",
                    'severity': 'warning',
                    'user_id': user_id,
                    'count': count
                })
        
        # 3. 敏感操作（删除、禁用等）
        sensitive_actions = [
            AuditAction.API_REMOVE,
            AuditAction.API_DISABLE,
            AuditAction.ACCOUNT_REMOVE,
            AuditAction.USER_DELETE,
            AuditAction.DATA_DELETE
        ]
        
        sensitive_ops = [e for e in recent if e.action in sensitive_actions]
        if len(sensitive_ops) >= 5:
            anomalies.append({
                'type': 'high_sensitive_operations',
                'message': f"过去 1 小时有 {len(sensitive_ops)} 次敏感操作",
                'severity': 'warning',
                'count': len(sensitive_ops)
            })
        
        return anomalies
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """获取仪表板数据"""
        return {
            'summary': self.get_summary(hours=24),
            'recent': self.get_recent(limit=20),
            'failures': self.get_failures(limit=10),
            'anomalies': self.detect_anomalies()
        }


# ==================== 装饰器 ====================

def audit_log(
    action: AuditAction,
    resource_type: ResourceType,
    get_resource_id: Callable = None
):
    """
    审计日志装饰器
    
    用法：
        @audit_log(AuditAction.API_ADD, ResourceType.API, lambda args: args[0])
        async def add_api(api_id: str, ...):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            service = get_audit_service()
            
            resource_id = ""
            if get_resource_id:
                try:
                    resource_id = get_resource_id(args, kwargs)
                except:
                    pass
            
            try:
                result = await func(*args, **kwargs)
                await service.log(
                    action=action,
                    resource_type=resource_type,
                    resource_id=str(resource_id),
                    success=True
                )
                return result
            except Exception as e:
                await service.log(
                    action=action,
                    resource_type=resource_type,
                    resource_id=str(resource_id),
                    success=False,
                    error=str(e)
                )
                raise
        
        return wrapper
    return decorator


# ==================== 全局实例 ====================

_audit_service: Optional[AuditService] = None


def get_audit_service() -> AuditService:
    """获取全局审计服务"""
    global _audit_service
    if _audit_service is None:
        _audit_service = AuditService()
    return _audit_service


def init_audit_service(persistence=None, max_entries: int = 10000) -> AuditService:
    """初始化审计服务"""
    global _audit_service
    _audit_service = AuditService(persistence=persistence, max_memory_entries=max_entries)
    return _audit_service
