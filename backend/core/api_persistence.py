"""
API 数据持久化服务

功能：
1. 定期将统计数据同步到数据库
2. 持久化告警历史
3. 记录登录尝试
4. 操作审计日志
"""

import sys
import time
import asyncio
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class ApiPersistenceService:
    """
    API 数据持久化服务
    
    职责：
    1. 定期同步内存数据到数据库
    2. 提供数据查询接口
    3. 数据清理和归档
    """
    
    def __init__(self, db=None, sync_interval: int = 300):
        self.db = db
        self.sync_interval = sync_interval  # 同步间隔（秒）
        
        # 同步任务
        self._sync_task: Optional[asyncio.Task] = None
        
        # 待写入缓冲
        self._login_buffer: List[Dict[str, Any]] = []
        self._alert_buffer: List[Dict[str, Any]] = []
        self._audit_buffer: List[Dict[str, Any]] = []
        
        # 缓冲大小限制
        self._buffer_limit = 100
        
        print("[ApiPersistenceService] 初始化持久化服务", file=sys.stderr)
    
    def set_db(self, db) -> None:
        """设置数据库连接"""
        self.db = db
    
    # ==================== 登录记录 ====================
    
    async def record_login_attempt(
        self,
        phone: str,
        api_id: str,
        success: bool,
        error: str = "",
        duration: float = 0.0,
        step: str = "",
        ip_address: str = "",
        metadata: Dict[str, Any] = None
    ) -> None:
        """记录登录尝试"""
        record = {
            'phone': phone,
            'api_id': api_id,
            'success': 1 if success else 0,
            'error': error,
            'duration': duration,
            'step': step,
            'ip_address': ip_address,
            'metadata': json.dumps(metadata) if metadata else None,
            'created_at': datetime.now().isoformat()
        }
        
        self._login_buffer.append(record)
        
        # 缓冲区满时立即写入
        if len(self._login_buffer) >= self._buffer_limit:
            await self._flush_login_buffer()
    
    async def _flush_login_buffer(self) -> None:
        """写入登录记录缓冲"""
        if not self.db or not self._login_buffer:
            return
        
        try:
            records = self._login_buffer.copy()
            self._login_buffer.clear()
            
            for record in records:
                await self.db.execute("""
                    INSERT INTO login_attempts 
                    (phone, api_id, success, error, duration, step, ip_address, metadata, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    record['phone'],
                    record['api_id'],
                    record['success'],
                    record['error'],
                    record['duration'],
                    record['step'],
                    record['ip_address'],
                    record['metadata'],
                    record['created_at']
                ))
            
            print(f"[ApiPersistenceService] 写入 {len(records)} 条登录记录", file=sys.stderr)
            
        except Exception as e:
            print(f"[ApiPersistenceService] 写入登录记录失败: {e}", file=sys.stderr)
    
    async def get_login_attempts(
        self,
        phone: str = None,
        api_id: str = None,
        start_date: str = None,
        end_date: str = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """查询登录尝试"""
        if not self.db:
            return []
        
        conditions = []
        params = []
        
        if phone:
            conditions.append("phone = ?")
            params.append(phone)
        if api_id:
            conditions.append("api_id = ?")
            params.append(api_id)
        if start_date:
            conditions.append("created_at >= ?")
            params.append(start_date)
        if end_date:
            conditions.append("created_at <= ?")
            params.append(end_date)
        
        where = " AND ".join(conditions) if conditions else "1=1"
        params.append(limit)
        
        try:
            rows = await self.db.fetch_all(f"""
                SELECT * FROM login_attempts 
                WHERE {where}
                ORDER BY created_at DESC
                LIMIT ?
            """, params)
            
            return [dict(row) for row in rows]
        except Exception as e:
            print(f"[ApiPersistenceService] 查询登录记录失败: {e}", file=sys.stderr)
            return []
    
    # ==================== 告警历史 ====================
    
    async def save_alert(self, alert: Dict[str, Any]) -> None:
        """保存告警"""
        record = {
            'alert_id': alert.get('id', ''),
            'alert_type': alert.get('type', ''),
            'level': alert.get('level', 'info'),
            'title': alert.get('title', ''),
            'message': alert.get('message', ''),
            'api_id': alert.get('api_id', ''),
            'resolved': 1 if alert.get('resolved', False) else 0,
            'resolved_at': alert.get('resolved_at'),
            'metadata': json.dumps(alert.get('metadata', {})),
            'created_at': datetime.fromtimestamp(alert.get('timestamp', time.time())).isoformat()
        }
        
        self._alert_buffer.append(record)
        
        if len(self._alert_buffer) >= self._buffer_limit:
            await self._flush_alert_buffer()
    
    async def _flush_alert_buffer(self) -> None:
        """写入告警缓冲"""
        if not self.db or not self._alert_buffer:
            return
        
        try:
            records = self._alert_buffer.copy()
            self._alert_buffer.clear()
            
            for record in records:
                await self.db.execute("""
                    INSERT OR REPLACE INTO alert_history 
                    (alert_id, alert_type, level, title, message, api_id, resolved, resolved_at, metadata, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    record['alert_id'],
                    record['alert_type'],
                    record['level'],
                    record['title'],
                    record['message'],
                    record['api_id'],
                    record['resolved'],
                    record['resolved_at'],
                    record['metadata'],
                    record['created_at']
                ))
            
            print(f"[ApiPersistenceService] 写入 {len(records)} 条告警记录", file=sys.stderr)
            
        except Exception as e:
            print(f"[ApiPersistenceService] 写入告警记录失败: {e}", file=sys.stderr)
    
    async def get_alert_history(
        self,
        level: str = None,
        resolved: bool = None,
        start_date: str = None,
        end_date: str = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """查询告警历史"""
        if not self.db:
            return []
        
        conditions = []
        params = []
        
        if level:
            conditions.append("level = ?")
            params.append(level)
        if resolved is not None:
            conditions.append("resolved = ?")
            params.append(1 if resolved else 0)
        if start_date:
            conditions.append("created_at >= ?")
            params.append(start_date)
        if end_date:
            conditions.append("created_at <= ?")
            params.append(end_date)
        
        where = " AND ".join(conditions) if conditions else "1=1"
        params.append(limit)
        
        try:
            rows = await self.db.fetch_all(f"""
                SELECT * FROM alert_history 
                WHERE {where}
                ORDER BY created_at DESC
                LIMIT ?
            """, params)
            
            return [dict(row) for row in rows]
        except Exception as e:
            print(f"[ApiPersistenceService] 查询告警历史失败: {e}", file=sys.stderr)
            return []
    
    async def resolve_alert(self, alert_id: str, resolved_by: str = "") -> bool:
        """解决告警"""
        if not self.db:
            return False
        
        try:
            await self.db.execute("""
                UPDATE alert_history 
                SET resolved = 1, resolved_at = ?, resolved_by = ?
                WHERE alert_id = ?
            """, (datetime.now().isoformat(), resolved_by, alert_id))
            
            return True
        except Exception as e:
            print(f"[ApiPersistenceService] 解决告警失败: {e}", file=sys.stderr)
            return False
    
    # ==================== 审计日志 ====================
    
    async def log_audit(
        self,
        action: str,
        resource_type: str,
        resource_id: str = "",
        user_id: str = "",
        user_name: str = "",
        ip_address: str = "",
        old_value: Any = None,
        new_value: Any = None,
        details: str = "",
        success: bool = True,
        error: str = ""
    ) -> None:
        """记录审计日志"""
        record = {
            'action': action,
            'resource_type': resource_type,
            'resource_id': resource_id,
            'user_id': user_id,
            'user_name': user_name,
            'ip_address': ip_address,
            'old_value': json.dumps(old_value) if old_value else None,
            'new_value': json.dumps(new_value) if new_value else None,
            'details': details,
            'success': 1 if success else 0,
            'error': error,
            'created_at': datetime.now().isoformat()
        }
        
        self._audit_buffer.append(record)
        
        if len(self._audit_buffer) >= self._buffer_limit:
            await self._flush_audit_buffer()
    
    async def _flush_audit_buffer(self) -> None:
        """写入审计日志缓冲"""
        if not self.db or not self._audit_buffer:
            return
        
        try:
            records = self._audit_buffer.copy()
            self._audit_buffer.clear()
            
            for record in records:
                await self.db.execute("""
                    INSERT INTO audit_logs 
                    (action, resource_type, resource_id, user_id, user_name, ip_address, 
                     old_value, new_value, details, success, error, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    record['action'],
                    record['resource_type'],
                    record['resource_id'],
                    record['user_id'],
                    record['user_name'],
                    record['ip_address'],
                    record['old_value'],
                    record['new_value'],
                    record['details'],
                    record['success'],
                    record['error'],
                    record['created_at']
                ))
            
            print(f"[ApiPersistenceService] 写入 {len(records)} 条审计日志", file=sys.stderr)
            
        except Exception as e:
            print(f"[ApiPersistenceService] 写入审计日志失败: {e}", file=sys.stderr)
    
    async def get_audit_logs(
        self,
        action: str = None,
        resource_type: str = None,
        user_id: str = None,
        start_date: str = None,
        end_date: str = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """查询审计日志"""
        if not self.db:
            return []
        
        conditions = []
        params = []
        
        if action:
            conditions.append("action = ?")
            params.append(action)
        if resource_type:
            conditions.append("resource_type = ?")
            params.append(resource_type)
        if user_id:
            conditions.append("user_id = ?")
            params.append(user_id)
        if start_date:
            conditions.append("created_at >= ?")
            params.append(start_date)
        if end_date:
            conditions.append("created_at <= ?")
            params.append(end_date)
        
        where = " AND ".join(conditions) if conditions else "1=1"
        params.append(limit)
        
        try:
            rows = await self.db.fetch_all(f"""
                SELECT * FROM audit_logs 
                WHERE {where}
                ORDER BY created_at DESC
                LIMIT ?
            """, params)
            
            return [dict(row) for row in rows]
        except Exception as e:
            print(f"[ApiPersistenceService] 查询审计日志失败: {e}", file=sys.stderr)
            return []
    
    # ==================== 统计数据同步 ====================
    
    async def sync_daily_stats(self, stats_data: Dict[str, Any]) -> None:
        """同步每日统计"""
        if not self.db:
            return
        
        try:
            for date, api_stats in stats_data.items():
                for api_id, stats in api_stats.items():
                    await self.db.execute("""
                        INSERT OR REPLACE INTO api_stats_daily 
                        (date, api_id, total_attempts, successful, failed, errors, success_rate, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    """, (
                        date,
                        api_id,
                        stats.get('total_attempts', 0),
                        stats.get('successful', 0),
                        stats.get('failed', 0),
                        stats.get('errors', 0),
                        stats.get('success_rate', 0)
                    ))
            
            print(f"[ApiPersistenceService] 同步每日统计完成", file=sys.stderr)
            
        except Exception as e:
            print(f"[ApiPersistenceService] 同步每日统计失败: {e}", file=sys.stderr)
    
    async def save_health_snapshot(self, api_id: str, health_data: Dict[str, Any]) -> None:
        """保存健康快照"""
        if not self.db:
            return
        
        try:
            await self.db.execute("""
                INSERT INTO api_health_snapshots 
                (api_id, status, success_rate, error_rate, avg_response_time, consecutive_failures)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                api_id,
                health_data.get('status', 'unknown'),
                health_data.get('success_rate', 0),
                health_data.get('error_rate', 0),
                health_data.get('avg_response_time', 0),
                health_data.get('consecutive_failures', 0)
            ))
        except Exception as e:
            print(f"[ApiPersistenceService] 保存健康快照失败: {e}", file=sys.stderr)
    
    # ==================== 同步任务 ====================
    
    async def start_sync(self) -> None:
        """启动同步任务"""
        if self._sync_task:
            return
        
        self._sync_task = asyncio.create_task(self._sync_loop())
        print("[ApiPersistenceService] 启动同步任务", file=sys.stderr)
    
    async def stop_sync(self) -> None:
        """停止同步任务"""
        if self._sync_task:
            self._sync_task.cancel()
            try:
                await self._sync_task
            except asyncio.CancelledError:
                pass
            self._sync_task = None
        
        # 最后一次刷新缓冲
        await self.flush_all()
    
    async def _sync_loop(self) -> None:
        """同步循环"""
        while True:
            try:
                await asyncio.sleep(self.sync_interval)
                await self.flush_all()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[ApiPersistenceService] 同步错误: {e}", file=sys.stderr)
    
    async def flush_all(self) -> None:
        """刷新所有缓冲"""
        await self._flush_login_buffer()
        await self._flush_alert_buffer()
        await self._flush_audit_buffer()
    
    # ==================== 数据清理 ====================
    
    async def cleanup_old_data(self, days: int = 30) -> Dict[str, int]:
        """清理旧数据"""
        if not self.db:
            return {}
        
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        deleted = {}
        
        try:
            # 清理登录记录
            result = await self.db.execute("""
                DELETE FROM login_attempts WHERE created_at < ?
            """, (cutoff,))
            deleted['login_attempts'] = result.rowcount if hasattr(result, 'rowcount') else 0
            
            # 清理健康快照
            result = await self.db.execute("""
                DELETE FROM api_health_snapshots WHERE snapshot_time < ?
            """, (cutoff,))
            deleted['health_snapshots'] = result.rowcount if hasattr(result, 'rowcount') else 0
            
            print(f"[ApiPersistenceService] 清理 {days} 天前的数据完成: {deleted}", file=sys.stderr)
            
        except Exception as e:
            print(f"[ApiPersistenceService] 数据清理失败: {e}", file=sys.stderr)
        
        return deleted


# ==================== 全局实例 ====================

_persistence: Optional[ApiPersistenceService] = None


def get_persistence_service() -> ApiPersistenceService:
    """获取全局持久化服务"""
    global _persistence
    if _persistence is None:
        _persistence = ApiPersistenceService()
    return _persistence


async def init_persistence_service(db=None, sync_interval: int = 300) -> ApiPersistenceService:
    """初始化持久化服务"""
    global _persistence
    _persistence = ApiPersistenceService(db=db, sync_interval=sync_interval)
    await _persistence.start_sync()
    return _persistence
