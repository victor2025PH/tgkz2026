"""
登入安全服務

優化設計：
1. IP 白名單/黑名單
2. 登入歷史記錄
3. 異常檢測和告警
4. 帳戶鎖定策略
"""

import os
import sqlite3
import logging
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict
from ipaddress import ip_address, ip_network
import asyncio

logger = logging.getLogger(__name__)


@dataclass
class LoginAttempt:
    """登入嘗試記錄"""
    id: str
    user_id: str
    ip_address: str
    user_agent: str
    success: bool
    failure_reason: str = ''
    location: str = ''  # 地理位置（可選）
    created_at: str = ''
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class IpRule:
    """IP 規則"""
    id: str
    user_id: str  # 空表示全局規則
    ip_pattern: str  # IP 或 CIDR
    rule_type: str  # whitelist, blacklist
    description: str = ''
    created_at: str = ''
    expires_at: str = ''  # 空表示永不過期
    
    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class SecurityAlert:
    """安全告警"""
    id: str
    user_id: str
    alert_type: str
    message: str
    severity: str  # low, medium, high, critical
    ip_address: str = ''
    resolved: bool = False
    created_at: str = ''
    resolved_at: str = ''


class SecurityService:
    """安全服務"""
    
    # 配置
    MAX_LOGIN_ATTEMPTS = 5  # 最大登入失敗次數
    LOCKOUT_DURATION = 30  # 鎖定時間（分鐘）
    SUSPICIOUS_THRESHOLD = 3  # 可疑活動閾值
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or os.environ.get(
            'DATABASE_PATH',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
        )
        self._init_db()
    
    def _init_db(self):
        """初始化數據庫表"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 登入歷史表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS login_history (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    success INTEGER,
                    failure_reason TEXT,
                    location TEXT,
                    created_at TEXT
                )
            ''')
            
            # IP 規則表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ip_rules (
                    id TEXT PRIMARY KEY,
                    user_id TEXT,
                    ip_pattern TEXT NOT NULL,
                    rule_type TEXT NOT NULL,
                    description TEXT,
                    created_at TEXT,
                    expires_at TEXT
                )
            ''')
            
            # 安全告警表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS security_alerts (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    alert_type TEXT NOT NULL,
                    message TEXT,
                    severity TEXT,
                    ip_address TEXT,
                    resolved INTEGER DEFAULT 0,
                    created_at TEXT,
                    resolved_at TEXT
                )
            ''')
            
            # 帳戶鎖定表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS account_lockouts (
                    user_id TEXT PRIMARY KEY,
                    locked_until TEXT,
                    attempt_count INTEGER DEFAULT 0,
                    last_attempt TEXT
                )
            ''')
            
            # 索引
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_login_user ON login_history(user_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_login_ip ON login_history(ip_address)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_user ON security_alerts(user_id)')
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Security DB init error: {e}")
    
    # ==================== 登入歷史 ====================
    
    async def record_login_attempt(
        self,
        user_id: str,
        ip_address: str,
        user_agent: str,
        success: bool,
        failure_reason: str = ''
    ) -> LoginAttempt:
        """記錄登入嘗試"""
        import uuid
        
        attempt = LoginAttempt(
            id=f"login_{uuid.uuid4().hex[:12]}",
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            failure_reason=failure_reason,
            created_at=datetime.utcnow().isoformat()
        )
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO login_history 
                (id, user_id, ip_address, user_agent, success, failure_reason, location, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                attempt.id, attempt.user_id, attempt.ip_address,
                attempt.user_agent, 1 if attempt.success else 0,
                attempt.failure_reason, attempt.location, attempt.created_at
            ))
            
            conn.commit()
            conn.close()
            
            # 檢查異常
            if not success:
                await self._check_suspicious_activity(user_id, ip_address)
            
            return attempt
        except Exception as e:
            logger.error(f"Record login attempt error: {e}")
            raise
    
    async def get_login_history(
        self,
        user_id: str,
        limit: int = 50
    ) -> List[LoginAttempt]:
        """獲取登入歷史"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM login_history 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            ''', (user_id, limit))
            
            history = []
            for row in cursor.fetchall():
                history.append(LoginAttempt(
                    id=row['id'],
                    user_id=row['user_id'],
                    ip_address=row['ip_address'] or '',
                    user_agent=row['user_agent'] or '',
                    success=bool(row['success']),
                    failure_reason=row['failure_reason'] or '',
                    location=row['location'] or '',
                    created_at=row['created_at'] or ''
                ))
            
            conn.close()
            return history
        except Exception as e:
            logger.error(f"Get login history error: {e}")
            return []
    
    # ==================== 帳戶鎖定 ====================
    
    async def is_account_locked(self, user_id: str) -> bool:
        """檢查帳戶是否被鎖定"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute(
                'SELECT locked_until FROM account_lockouts WHERE user_id = ?',
                (user_id,)
            )
            row = cursor.fetchone()
            conn.close()
            
            if row and row[0]:
                locked_until = datetime.fromisoformat(row[0])
                if locked_until > datetime.utcnow():
                    return True
                # 鎖定已過期，清除
                await self._clear_lockout(user_id)
            
            return False
        except Exception as e:
            logger.error(f"Check account locked error: {e}")
            return False
    
    async def increment_failed_attempts(self, user_id: str) -> Dict[str, Any]:
        """增加失敗次數"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            now = datetime.utcnow()
            
            # 獲取當前狀態
            cursor.execute(
                'SELECT attempt_count, last_attempt FROM account_lockouts WHERE user_id = ?',
                (user_id,)
            )
            row = cursor.fetchone()
            
            if row:
                attempt_count = row[0] + 1
                last_attempt = row[1]
                
                # 如果上次嘗試超過鎖定時間，重置計數
                if last_attempt:
                    last_dt = datetime.fromisoformat(last_attempt)
                    if (now - last_dt).total_seconds() > self.LOCKOUT_DURATION * 60:
                        attempt_count = 1
            else:
                attempt_count = 1
            
            # 更新或插入
            if attempt_count >= self.MAX_LOGIN_ATTEMPTS:
                locked_until = (now + timedelta(minutes=self.LOCKOUT_DURATION)).isoformat()
                cursor.execute('''
                    INSERT OR REPLACE INTO account_lockouts 
                    (user_id, locked_until, attempt_count, last_attempt)
                    VALUES (?, ?, ?, ?)
                ''', (user_id, locked_until, attempt_count, now.isoformat()))
                
                # 創建告警
                await self._create_alert(
                    user_id,
                    'account_locked',
                    f'帳戶因連續 {attempt_count} 次登入失敗被鎖定',
                    'high'
                )
                
                result = {
                    'locked': True,
                    'locked_until': locked_until,
                    'attempts': attempt_count
                }
            else:
                cursor.execute('''
                    INSERT OR REPLACE INTO account_lockouts 
                    (user_id, locked_until, attempt_count, last_attempt)
                    VALUES (?, NULL, ?, ?)
                ''', (user_id, attempt_count, now.isoformat()))
                
                result = {
                    'locked': False,
                    'attempts': attempt_count,
                    'remaining': self.MAX_LOGIN_ATTEMPTS - attempt_count
                }
            
            conn.commit()
            conn.close()
            return result
        except Exception as e:
            logger.error(f"Increment failed attempts error: {e}")
            return {'locked': False}
    
    async def _clear_lockout(self, user_id: str):
        """清除鎖定狀態"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute(
                'DELETE FROM account_lockouts WHERE user_id = ?',
                (user_id,)
            )
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Clear lockout error: {e}")
    
    async def clear_failed_attempts(self, user_id: str):
        """清除失敗次數（登入成功時調用）"""
        await self._clear_lockout(user_id)
    
    # ==================== IP 規則 ====================
    
    async def add_ip_rule(
        self,
        user_id: str,
        ip_pattern: str,
        rule_type: str,
        description: str = '',
        expires_in_days: int = None
    ) -> IpRule:
        """添加 IP 規則"""
        import uuid
        
        now = datetime.utcnow()
        expires_at = ''
        if expires_in_days:
            expires_at = (now + timedelta(days=expires_in_days)).isoformat()
        
        rule = IpRule(
            id=f"ip_{uuid.uuid4().hex[:12]}",
            user_id=user_id,
            ip_pattern=ip_pattern,
            rule_type=rule_type,
            description=description,
            created_at=now.isoformat(),
            expires_at=expires_at
        )
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO ip_rules 
                (id, user_id, ip_pattern, rule_type, description, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                rule.id, rule.user_id, rule.ip_pattern,
                rule.rule_type, rule.description, rule.created_at, rule.expires_at
            ))
            
            conn.commit()
            conn.close()
            return rule
        except Exception as e:
            logger.error(f"Add IP rule error: {e}")
            raise
    
    async def check_ip_allowed(self, user_id: str, ip: str) -> Dict[str, Any]:
        """
        檢查 IP 是否允許
        
        返回:
        - allowed: bool
        - reason: str
        - rule: IpRule or None
        """
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            now = datetime.utcnow().isoformat()
            
            # 獲取所有有效規則（全局 + 用戶特定）
            cursor.execute('''
                SELECT * FROM ip_rules 
                WHERE (user_id = ? OR user_id = '' OR user_id IS NULL)
                AND (expires_at = '' OR expires_at IS NULL OR expires_at > ?)
            ''', (user_id, now))
            
            rules = cursor.fetchall()
            conn.close()
            
            # 檢查黑名單
            for row in rules:
                if row['rule_type'] == 'blacklist':
                    if self._ip_matches(ip, row['ip_pattern']):
                        return {
                            'allowed': False,
                            'reason': 'IP is blacklisted',
                            'rule_id': row['id']
                        }
            
            # 檢查白名單（如果存在用戶特定白名單，則只允許白名單中的 IP）
            user_whitelists = [r for r in rules if r['rule_type'] == 'whitelist' and r['user_id'] == user_id]
            if user_whitelists:
                for row in user_whitelists:
                    if self._ip_matches(ip, row['ip_pattern']):
                        return {'allowed': True, 'reason': 'IP in whitelist'}
                return {
                    'allowed': False,
                    'reason': 'IP not in whitelist',
                    'has_whitelist': True
                }
            
            return {'allowed': True, 'reason': 'No restrictions'}
            
        except Exception as e:
            logger.error(f"Check IP allowed error: {e}")
            return {'allowed': True, 'reason': 'Error checking, allowing by default'}
    
    def _ip_matches(self, ip: str, pattern: str) -> bool:
        """檢查 IP 是否匹配模式"""
        try:
            # CIDR 格式
            if '/' in pattern:
                return ip_address(ip) in ip_network(pattern, strict=False)
            # 精確匹配
            return ip == pattern
        except Exception:
            return False
    
    async def get_ip_rules(self, user_id: str = None) -> List[IpRule]:
        """獲取 IP 規則列表"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            if user_id:
                cursor.execute(
                    'SELECT * FROM ip_rules WHERE user_id = ? OR user_id = "" ORDER BY created_at DESC',
                    (user_id,)
                )
            else:
                cursor.execute('SELECT * FROM ip_rules ORDER BY created_at DESC')
            
            rules = []
            for row in cursor.fetchall():
                rules.append(IpRule(
                    id=row['id'],
                    user_id=row['user_id'] or '',
                    ip_pattern=row['ip_pattern'],
                    rule_type=row['rule_type'],
                    description=row['description'] or '',
                    created_at=row['created_at'] or '',
                    expires_at=row['expires_at'] or ''
                ))
            
            conn.close()
            return rules
        except Exception as e:
            logger.error(f"Get IP rules error: {e}")
            return []
    
    async def delete_ip_rule(self, rule_id: str, user_id: str = None) -> bool:
        """刪除 IP 規則"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            if user_id:
                cursor.execute(
                    'DELETE FROM ip_rules WHERE id = ? AND user_id = ?',
                    (rule_id, user_id)
                )
            else:
                cursor.execute('DELETE FROM ip_rules WHERE id = ?', (rule_id,))
            
            deleted = cursor.rowcount > 0
            conn.commit()
            conn.close()
            return deleted
        except Exception as e:
            logger.error(f"Delete IP rule error: {e}")
            return False
    
    # ==================== 異常檢測 ====================
    
    async def _check_suspicious_activity(self, user_id: str, ip_address: str):
        """檢查可疑活動"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 檢查最近 1 小時內的失敗登入
            one_hour_ago = (datetime.utcnow() - timedelta(hours=1)).isoformat()
            
            cursor.execute('''
                SELECT COUNT(*) FROM login_history 
                WHERE user_id = ? AND success = 0 AND created_at > ?
            ''', (user_id, one_hour_ago))
            
            failed_count = cursor.fetchone()[0]
            
            # 檢查不同 IP 的登入嘗試
            cursor.execute('''
                SELECT COUNT(DISTINCT ip_address) FROM login_history 
                WHERE user_id = ? AND created_at > ?
            ''', (user_id, one_hour_ago))
            
            unique_ips = cursor.fetchone()[0]
            conn.close()
            
            # 可疑活動告警
            if failed_count >= self.SUSPICIOUS_THRESHOLD:
                await self._create_alert(
                    user_id,
                    'suspicious_login',
                    f'最近 1 小時內有 {failed_count} 次失敗登入嘗試',
                    'medium',
                    ip_address
                )
            
            if unique_ips >= 5:
                await self._create_alert(
                    user_id,
                    'multiple_ip_login',
                    f'最近 1 小時內從 {unique_ips} 個不同 IP 嘗試登入',
                    'high',
                    ip_address
                )
                
        except Exception as e:
            logger.error(f"Check suspicious activity error: {e}")
    
    async def _create_alert(
        self,
        user_id: str,
        alert_type: str,
        message: str,
        severity: str,
        ip_address: str = ''
    ):
        """創建安全告警"""
        import uuid
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO security_alerts 
                (id, user_id, alert_type, message, severity, ip_address, resolved, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 0, ?)
            ''', (
                f"alert_{uuid.uuid4().hex[:12]}",
                user_id, alert_type, message, severity, ip_address,
                datetime.utcnow().isoformat()
            ))
            
            conn.commit()
            conn.close()
            
            logger.warning(f"Security alert: [{severity}] {user_id} - {message}")
        except Exception as e:
            logger.error(f"Create alert error: {e}")
    
    async def get_security_alerts(
        self,
        user_id: str = None,
        resolved: bool = None,
        limit: int = 50
    ) -> List[SecurityAlert]:
        """獲取安全告警"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            query = 'SELECT * FROM security_alerts WHERE 1=1'
            params = []
            
            if user_id:
                query += ' AND user_id = ?'
                params.append(user_id)
            
            if resolved is not None:
                query += ' AND resolved = ?'
                params.append(1 if resolved else 0)
            
            query += ' ORDER BY created_at DESC LIMIT ?'
            params.append(limit)
            
            cursor.execute(query, params)
            
            alerts = []
            for row in cursor.fetchall():
                alerts.append(SecurityAlert(
                    id=row['id'],
                    user_id=row['user_id'],
                    alert_type=row['alert_type'],
                    message=row['message'] or '',
                    severity=row['severity'] or 'medium',
                    ip_address=row['ip_address'] or '',
                    resolved=bool(row['resolved']),
                    created_at=row['created_at'] or '',
                    resolved_at=row['resolved_at'] or ''
                ))
            
            conn.close()
            return alerts
        except Exception as e:
            logger.error(f"Get security alerts error: {e}")
            return []
    
    async def resolve_alert(self, alert_id: str) -> bool:
        """解決告警"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE security_alerts 
                SET resolved = 1, resolved_at = ? 
                WHERE id = ?
            ''', (datetime.utcnow().isoformat(), alert_id))
            
            updated = cursor.rowcount > 0
            conn.commit()
            conn.close()
            return updated
        except Exception as e:
            logger.error(f"Resolve alert error: {e}")
            return False


# ==================== 單例訪問 ====================

_security_service: Optional[SecurityService] = None


def get_security_service() -> SecurityService:
    global _security_service
    if _security_service is None:
        _security_service = SecurityService()
    return _security_service
