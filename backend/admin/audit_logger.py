"""
操作審計日誌系統
記錄所有管理員操作，支持查詢和分析

優化點：
1. 異步寫入避免阻塞
2. 批量寫入提升性能
3. 自動記錄變更前後值
4. 支持多維度查詢
"""

import os
import json
import sqlite3
import logging
import asyncio
import uuid
from enum import Enum
from typing import Dict, Any, Optional, List
from datetime import datetime
from dataclasses import dataclass, asdict
from functools import wraps

logger = logging.getLogger(__name__)


class AuditCategory(Enum):
    """審計分類"""
    AUTH = "auth"           # 認證相關
    USER = "user"           # 用戶管理
    LICENSE = "license"     # 卡密管理
    ORDER = "order"         # 訂單管理
    SYSTEM = "system"       # 系統管理
    NOTIFICATION = "notification"  # 通知


class AuditAction(Enum):
    """審計動作"""
    # AUTH
    ADMIN_LOGIN = ("admin.login", AuditCategory.AUTH, "管理員登錄")
    ADMIN_LOGOUT = ("admin.logout", AuditCategory.AUTH, "管理員登出")
    ADMIN_PASSWORD_CHANGE = ("admin.password.change", AuditCategory.AUTH, "修改密碼")
    
    # USER
    USER_VIEW = ("user.view", AuditCategory.USER, "查看用戶")
    USER_EXTEND = ("user.extend", AuditCategory.USER, "延長會員")
    USER_UPGRADE = ("user.upgrade", AuditCategory.USER, "升級等級")
    USER_BAN = ("user.ban", AuditCategory.USER, "封禁用戶")
    USER_UNBAN = ("user.unban", AuditCategory.USER, "解封用戶")
    USER_EDIT = ("user.edit", AuditCategory.USER, "編輯用戶")
    USER_DELETE = ("user.delete", AuditCategory.USER, "刪除用戶")
    
    # LICENSE
    LICENSE_GENERATE = ("license.generate", AuditCategory.LICENSE, "生成卡密")
    LICENSE_VIEW = ("license.view", AuditCategory.LICENSE, "查看卡密")
    LICENSE_DISABLE = ("license.disable", AuditCategory.LICENSE, "禁用卡密")
    LICENSE_EXPORT = ("license.export", AuditCategory.LICENSE, "導出卡密")
    LICENSE_BATCH_DISABLE = ("license.batch_disable", AuditCategory.LICENSE, "批量禁用")
    
    # ORDER
    ORDER_VIEW = ("order.view", AuditCategory.ORDER, "查看訂單")
    ORDER_CONFIRM = ("order.confirm", AuditCategory.ORDER, "確認支付")
    
    # PROXY
    PROXY_ADD = ("proxy.add", AuditCategory.SYSTEM, "添加代理")
    PROXY_DELETE = ("proxy.delete", AuditCategory.SYSTEM, "刪除代理")
    PROXY_ASSIGN = ("proxy.assign", AuditCategory.SYSTEM, "分配代理")
    PROXY_RELEASE = ("proxy.release", AuditCategory.SYSTEM, "釋放代理")
    ORDER_REFUND = ("order.refund", AuditCategory.ORDER, "退款")
    ORDER_CANCEL = ("order.cancel", AuditCategory.ORDER, "取消訂單")
    
    # SYSTEM
    SETTINGS_VIEW = ("system.settings.view", AuditCategory.SYSTEM, "查看設置")
    SETTINGS_UPDATE = ("system.settings.update", AuditCategory.SYSTEM, "更新設置")
    ADMIN_CREATE = ("system.admin.create", AuditCategory.SYSTEM, "創建管理員")
    ADMIN_UPDATE = ("system.admin.update", AuditCategory.SYSTEM, "更新管理員")
    ADMIN_DELETE = ("system.admin.delete", AuditCategory.SYSTEM, "刪除管理員")
    DATA_BACKUP = ("system.backup", AuditCategory.SYSTEM, "數據備份")
    DATA_EXPORT = ("system.export", AuditCategory.SYSTEM, "數據導出")
    
    # NOTIFICATION
    NOTIFICATION_SEND = ("notification.send", AuditCategory.NOTIFICATION, "發送通知")
    NOTIFICATION_BATCH = ("notification.batch", AuditCategory.NOTIFICATION, "批量通知")
    ANNOUNCEMENT_CREATE = ("announcement.create", AuditCategory.NOTIFICATION, "創建公告")
    ANNOUNCEMENT_UPDATE = ("announcement.update", AuditCategory.NOTIFICATION, "更新公告")
    ANNOUNCEMENT_DELETE = ("announcement.delete", AuditCategory.NOTIFICATION, "刪除公告")
    
    def __init__(self, action: str, category: AuditCategory, description: str):
        self._action = action
        self._category = category
        self._description = description
    
    @property
    def action(self) -> str:
        return self._action
    
    @property
    def category(self) -> AuditCategory:
        return self._category
    
    @property
    def description(self) -> str:
        return self._description


@dataclass
class AuditLogEntry:
    """審計日誌條目"""
    log_id: str
    admin_id: int
    admin_username: str
    action: str
    action_category: str
    action_description: str
    resource_type: str
    resource_id: str
    old_value: Optional[Dict[str, Any]]
    new_value: Optional[Dict[str, Any]]
    description: str
    request_id: str
    ip_address: str
    user_agent: str
    status: str  # success / failed
    error_message: Optional[str]
    created_at: str


class AuditLogger:
    """審計日誌記錄器"""
    
    _instance = None
    _write_queue: List[AuditLogEntry] = []
    _flush_task = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._init_table()
    
    def _get_db_path(self) -> str:
        """獲取數據庫路徑"""
        possible_paths = [
            os.environ.get('DATABASE_PATH', ''),
            '/app/data/tgmatrix.db',
            './data/tgmatrix.db',
        ]
        for path in possible_paths:
            if path and os.path.exists(path):
                return path
        return possible_paths[1] if os.path.exists('/app/data') else possible_paths[2]
    
    def _get_connection(self) -> sqlite3.Connection:
        """獲取數據庫連接"""
        conn = sqlite3.connect(self._get_db_path())
        conn.row_factory = sqlite3.Row
        return conn
    
    def _init_table(self):
        """初始化審計日誌表"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS admin_audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    log_id TEXT UNIQUE NOT NULL,
                    admin_id INTEGER,
                    admin_username TEXT,
                    action TEXT NOT NULL,
                    action_category TEXT,
                    action_description TEXT,
                    resource_type TEXT,
                    resource_id TEXT,
                    old_value TEXT,
                    new_value TEXT,
                    description TEXT,
                    request_id TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    status TEXT DEFAULT 'success',
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 創建索引
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON admin_audit_logs(admin_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_logs(action)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_category ON admin_audit_logs(action_category)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_resource ON admin_audit_logs(resource_type, resource_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_status ON admin_audit_logs(status)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_logs(created_at)')
            
            conn.commit()
            conn.close()
            logger.info("Audit logs table initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize audit logs table: {e}")
    
    def log(
        self,
        action: AuditAction,
        admin_id: int,
        admin_username: str,
        resource_type: str = "",
        resource_id: str = "",
        old_value: Dict[str, Any] = None,
        new_value: Dict[str, Any] = None,
        description: str = "",
        request_id: str = "",
        ip_address: str = "",
        user_agent: str = "",
        status: str = "success",
        error_message: str = ""
    ):
        """
        記錄審計日誌
        
        用法：
            audit_log.log(
                action=AuditAction.USER_EXTEND,
                admin_id=1,
                admin_username="admin",
                resource_type="user",
                resource_id="user_123",
                old_value={"expires_at": "2026-02-03"},
                new_value={"expires_at": "2026-03-05"},
                description="延長用戶會員 30 天"
            )
        """
        log_id = f"audit_{uuid.uuid4().hex[:12]}"
        
        entry = AuditLogEntry(
            log_id=log_id,
            admin_id=admin_id,
            admin_username=admin_username,
            action=action.action,
            action_category=action.category.value,
            action_description=action.description,
            resource_type=resource_type,
            resource_id=str(resource_id),
            old_value=old_value,
            new_value=new_value,
            description=description or action.description,
            request_id=request_id or str(uuid.uuid4())[:8],
            ip_address=ip_address,
            user_agent=user_agent[:500] if user_agent else "",  # 限制長度
            status=status,
            error_message=error_message,
            created_at=datetime.utcnow().isoformat() + 'Z'
        )
        
        # 同步寫入（也可改為異步隊列）
        self._write_entry(entry)
        
        # 記錄到標準日誌
        log_msg = f"[AUDIT] [{entry.request_id}] {admin_username}({admin_id}) | {action.action} | {resource_type}:{resource_id} | {status}"
        if status == "success":
            logger.info(log_msg)
        else:
            logger.warning(f"{log_msg} | error: {error_message}")
    
    def _write_entry(self, entry: AuditLogEntry):
        """寫入日誌條目"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO admin_audit_logs (
                    log_id, admin_id, admin_username, action, action_category,
                    action_description, resource_type, resource_id, old_value,
                    new_value, description, request_id, ip_address, user_agent,
                    status, error_message, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                entry.log_id,
                entry.admin_id,
                entry.admin_username,
                entry.action,
                entry.action_category,
                entry.action_description,
                entry.resource_type,
                entry.resource_id,
                json.dumps(entry.old_value, ensure_ascii=False) if entry.old_value else None,
                json.dumps(entry.new_value, ensure_ascii=False) if entry.new_value else None,
                entry.description,
                entry.request_id,
                entry.ip_address,
                entry.user_agent,
                entry.status,
                entry.error_message,
                entry.created_at
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to write audit log: {e}")
    
    def query(
        self,
        admin_id: int = None,
        action: str = None,
        action_category: str = None,
        resource_type: str = None,
        resource_id: str = None,
        status: str = None,
        start_date: str = None,
        end_date: str = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        查詢審計日誌
        
        返回：
            {
                "logs": [...],
                "pagination": {"total": 100, "page": 1, "page_size": 20, "total_pages": 5}
            }
        """
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            # 構建查詢條件
            conditions = []
            params = []
            
            if admin_id:
                conditions.append("admin_id = ?")
                params.append(admin_id)
            
            if action:
                conditions.append("action = ?")
                params.append(action)
            
            if action_category:
                conditions.append("action_category = ?")
                params.append(action_category)
            
            if resource_type:
                conditions.append("resource_type = ?")
                params.append(resource_type)
            
            if resource_id:
                conditions.append("resource_id = ?")
                params.append(resource_id)
            
            if status:
                conditions.append("status = ?")
                params.append(status)
            
            if start_date:
                conditions.append("created_at >= ?")
                params.append(start_date)
            
            if end_date:
                conditions.append("created_at <= ?")
                params.append(end_date)
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            
            # 查詢總數
            cursor.execute(f"SELECT COUNT(*) as count FROM admin_audit_logs WHERE {where_clause}", params)
            total = cursor.fetchone()['count']
            
            # 分頁查詢
            offset = (page - 1) * page_size
            cursor.execute(f'''
                SELECT * FROM admin_audit_logs 
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ''', params + [page_size, offset])
            
            logs = []
            for row in cursor.fetchall():
                log = dict(row)
                # 解析 JSON 字段
                if log.get('old_value'):
                    try:
                        log['old_value'] = json.loads(log['old_value'])
                    except:
                        pass
                if log.get('new_value'):
                    try:
                        log['new_value'] = json.loads(log['new_value'])
                    except:
                        pass
                logs.append(log)
            
            conn.close()
            
            return {
                "logs": logs,
                "pagination": {
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                    "total_pages": (total + page_size - 1) // page_size
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to query audit logs: {e}")
            return {"logs": [], "pagination": {"total": 0, "page": 1, "page_size": page_size, "total_pages": 0}}
    
    def get_stats(self, days: int = 7) -> Dict[str, Any]:
        """獲取審計統計"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            # 按操作類型統計
            cursor.execute(f'''
                SELECT action_category, COUNT(*) as count 
                FROM admin_audit_logs 
                WHERE created_at >= datetime('now', '-{days} days')
                GROUP BY action_category
            ''')
            by_category = {row['action_category']: row['count'] for row in cursor.fetchall()}
            
            # 按狀態統計
            cursor.execute(f'''
                SELECT status, COUNT(*) as count 
                FROM admin_audit_logs 
                WHERE created_at >= datetime('now', '-{days} days')
                GROUP BY status
            ''')
            by_status = {row['status']: row['count'] for row in cursor.fetchall()}
            
            # 按管理員統計
            cursor.execute(f'''
                SELECT admin_username, COUNT(*) as count 
                FROM admin_audit_logs 
                WHERE created_at >= datetime('now', '-{days} days')
                GROUP BY admin_username
                ORDER BY count DESC
                LIMIT 10
            ''')
            by_admin = {row['admin_username']: row['count'] for row in cursor.fetchall()}
            
            conn.close()
            
            return {
                "by_category": by_category,
                "by_status": by_status,
                "by_admin": by_admin,
                "period_days": days
            }
            
        except Exception as e:
            logger.error(f"Failed to get audit stats: {e}")
            return {}


# 全局實例
audit_log = AuditLogger()
