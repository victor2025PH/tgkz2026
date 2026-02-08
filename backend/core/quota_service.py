"""
配額服務 - 統一配額管理和限制

設計原則：
1. 與 LevelConfigService 整合，獲取配額限制
2. 支持所有 11 種配額類型
3. 支持自定義配額（管理員調整）
4. 實時配額追蹤和告警
5. 配額預留機制（長時間操作）
6. 高性能緩存（減少數據庫查詢）

優化亮點：
- 延遲加載配額限制
- 批量配額操作支持
- 異步配額記錄
- 智能告警去重
- 配額使用趨勢分析
"""

import sqlite3
import os
import json
import asyncio
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum
from contextlib import contextmanager
import logging
import threading

logger = logging.getLogger(__name__)


# ==================== 配額狀態枚舉 ====================

class QuotaStatus(Enum):
    """配額狀態"""
    OK = "ok"                    # 正常
    WARNING = "warning"          # 警告（80%）
    CRITICAL = "critical"        # 臨界（95%）
    EXCEEDED = "exceeded"        # 超限
    UNLIMITED = "unlimited"      # 無限


class QuotaAction(Enum):
    """配額操作類型"""
    CONSUME = "consume"          # 消耗
    RESERVE = "reserve"          # 預留
    RELEASE = "release"          # 釋放預留
    RESET = "reset"              # 重置


# ==================== 配額結果數據類 ====================

@dataclass
class QuotaCheckResult:
    """配額檢查結果"""
    allowed: bool                        # 是否允許操作
    quota_type: str                      # 配額類型
    status: QuotaStatus                  # 配額狀態
    limit: int                           # 配額上限
    used: int                            # 已使用
    reserved: int = 0                    # 已預留
    remaining: int = 0                   # 剩餘
    percentage: float = 0.0              # 使用百分比
    reset_at: Optional[datetime] = None  # 重置時間
    message: str = ""                    # 提示消息
    upgrade_suggestion: str = ""         # 升級建議
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'allowed': self.allowed,
            'quota_type': self.quota_type,
            'status': self.status.value,
            'limit': self.limit,
            'used': self.used,
            'reserved': self.reserved,
            'remaining': self.remaining,
            'percentage': self.percentage,
            'reset_at': self.reset_at.isoformat() if self.reset_at else None,
            'message': self.message,
            'upgrade_suggestion': self.upgrade_suggestion,
            'unlimited': self.status == QuotaStatus.UNLIMITED,
        }


@dataclass
class QuotaUsageSummary:
    """配額使用摘要"""
    user_id: str
    tier: str
    tier_name: str
    quotas: Dict[str, QuotaCheckResult] = field(default_factory=dict)
    alerts: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'user_id': self.user_id,
            'tier': self.tier,
            'tier_name': self.tier_name,
            'quotas': {k: v.to_dict() for k, v in self.quotas.items()},
            'alerts': self.alerts,
            'has_warnings': any(q.status in {QuotaStatus.WARNING, QuotaStatus.CRITICAL} for q in self.quotas.values()),
            'has_exceeded': any(q.status == QuotaStatus.EXCEEDED for q in self.quotas.values()),
        }


# ==================== 核心配額服務 ====================

class QuotaService:
    """
    統一配額服務
    
    功能：
    - 配額檢查和消耗
    - 配額預留和釋放
    - 自定義配額支持
    - 配額告警
    - 使用量統計
    """
    
    _instance: Optional['QuotaService'] = None
    _lock = threading.Lock()
    
    # 每日重置的配額類型
    DAILY_RESET_QUOTAS = {'daily_messages', 'ai_calls'}
    
    # 告警閾值
    WARNING_THRESHOLD = 80   # 80% 警告
    CRITICAL_THRESHOLD = 95  # 95% 臨界
    
    def __new__(cls, db_path: str = None):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    instance = super().__new__(cls)
                    instance._initialized = False
                    cls._instance = instance
        return cls._instance
    
    def __init__(self, db_path: str = None):
        if self._initialized:
            return
        
        # 🔧 P6-1: 使用統一的數據庫路徑解析
        if db_path is None:
            try:
                from core.db_utils import get_db_path
                db_path = get_db_path()
            except ImportError:
                db_path = os.environ.get('DATABASE_PATH', '/app/data/tgmatrix.db')
        self.db_path = db_path
        
        # 緩存
        self._quota_cache: Dict[str, Dict[str, int]] = {}  # user_id -> {quota_type -> limit}
        self._usage_cache: Dict[str, Dict[str, int]] = {}  # user_id -> {quota_type -> used}
        self._cache_ttl = 60  # 緩存 60 秒
        self._cache_timestamps: Dict[str, datetime] = {}
        
        # 預留配額
        self._reservations: Dict[str, Dict[str, int]] = {}  # user_id -> {quota_type -> reserved}
        
        # 告警去重
        self._alert_cooldown: Dict[str, datetime] = {}  # alert_key -> last_sent_at
        self._alert_cooldown_seconds = 3600  # 1 小時內不重複告警
        
        # 🔧 P6-3: 配額變更回調（用於 WebSocket 推送）
        self._change_callbacks: list = []
        
        self._init_db()
        self._initialized = True
        logger.info("QuotaService initialized")
    
    def on_quota_change(self, callback):
        """
        🔧 P6-3: 註冊配額變更回調
        
        回調簽名: callback(user_id: str, quota_type: str, action: str, result: dict)
        """
        self._change_callbacks.append(callback)
    
    def _notify_change(self, user_id: str, quota_type: str, action: str, result=None):
        """🔧 P6-3: 通知所有已註冊的回調"""
        payload = {
            'user_id': user_id,
            'quota_type': quota_type,
            'action': action,
            'timestamp': datetime.now().isoformat()
        }
        if result and hasattr(result, '__dict__'):
            payload['usage'] = getattr(result, 'current', 0)
            payload['limit'] = getattr(result, 'limit', 0)
            payload['status'] = getattr(result, 'status', 'unknown')
            if hasattr(result.status, 'value'):
                payload['status'] = result.status.value
        
        for cb in self._change_callbacks:
            try:
                cb(user_id, quota_type, action, payload)
            except Exception as e:
                logger.error(f"[QuotaNotify] Callback error: {e}")
    
    def _get_db(self) -> sqlite3.Connection:
        """🔧 P6-1: 標準化連接（WAL 模式 + 性能 PRAGMA）"""
        try:
            from core.db_utils import create_connection
            return create_connection(self.db_path)
        except ImportError:
            pass
        
        # 降級：直接連接但啟用 WAL
        db = sqlite3.connect(self.db_path, timeout=30.0)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA journal_mode=WAL')
        db.execute('PRAGMA synchronous=NORMAL')
        db.execute('PRAGMA busy_timeout=30000')
        return db
    
    def _init_db(self):
        """初始化配額相關表"""
        db = self._get_db()
        try:
            db.executescript('''
                -- 配額使用記錄表（詳細）
                CREATE TABLE IF NOT EXISTS quota_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    quota_type TEXT NOT NULL,
                    date DATE NOT NULL,
                    used INTEGER DEFAULT 0,
                    reserved INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, quota_type, date)
                );
                
                -- 配額操作日誌
                CREATE TABLE IF NOT EXISTS quota_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    quota_type TEXT NOT NULL,
                    action TEXT NOT NULL,
                    amount INTEGER NOT NULL,
                    before_value INTEGER,
                    after_value INTEGER,
                    context TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                -- 配額告警記錄
                CREATE TABLE IF NOT EXISTS quota_alerts_v2 (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    quota_type TEXT NOT NULL,
                    alert_level TEXT NOT NULL,
                    threshold INTEGER,
                    current_value INTEGER,
                    limit_value INTEGER,
                    message TEXT,
                    acknowledged BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                -- 索引
                CREATE INDEX IF NOT EXISTS idx_quota_usage_user_date 
                    ON quota_usage(user_id, date);
                CREATE INDEX IF NOT EXISTS idx_quota_usage_type 
                    ON quota_usage(quota_type, date);
                CREATE INDEX IF NOT EXISTS idx_quota_logs_user 
                    ON quota_logs(user_id, created_at);
                CREATE INDEX IF NOT EXISTS idx_quota_alerts_user 
                    ON quota_alerts_v2(user_id, acknowledged, created_at);
            ''')
            db.commit()
            logger.info("Quota tables initialized")
        except Exception as e:
            logger.error(f"Failed to initialize quota tables: {e}")
        finally:
            db.close()
    
    # ==================== 配額限制獲取 ====================
    
    def _get_user_tier(self, user_id: str) -> str:
        """獲取用戶等級（優先 users.membership_level，與後台/卡密一致）"""
        db = self._get_db()
        try:
            # 1. 優先從 users 表取 membership_level（與 auth/me、後台一致）
            row = db.execute('''
                SELECT COALESCE(membership_level, subscription_tier) AS tier FROM users WHERE id = ? OR user_id = ?
            ''', (user_id, user_id)).fetchone()
            if row and row['tier']:
                return (row['tier'] or '').strip().lower() or 'bronze'
            # 2. 兼容：user_profiles
            row = db.execute('SELECT subscription_tier FROM user_profiles WHERE user_id = ?', (user_id,)).fetchone()
            if row and row['subscription_tier']:
                return (row['subscription_tier'] or '').strip().lower() or 'bronze'
            return 'bronze'
        except Exception:
            return 'bronze'
        finally:
            db.close()
    
    def _get_quota_limit(self, user_id: str, quota_type: str) -> int:
        """
        獲取配額上限
        
        優先級：
        1. 自定義配額（管理員調整）
        2. 等級默認配額
        """
        # 檢查緩存
        cache_key = f"{user_id}:{quota_type}"
        if cache_key in self._cache_timestamps:
            if datetime.now() - self._cache_timestamps[cache_key] < timedelta(seconds=self._cache_ttl):
                if user_id in self._quota_cache and quota_type in self._quota_cache[user_id]:
                    return self._quota_cache[user_id][quota_type]
        
        db = self._get_db()
        try:
            # 1. 檢查自定義配額（表可能尚未創建，容錯）
            try:
                row = db.execute('''
                    SELECT custom_value, expires_at FROM user_custom_quotas 
                    WHERE user_id = ? AND quota_type = ?
                ''', (user_id, quota_type)).fetchone()
            except Exception:
                row = None
            
            if row:
                expires_at = row['expires_at']
                if expires_at is None or datetime.fromisoformat(expires_at) > datetime.now():
                    limit = row['custom_value']
                    self._update_cache(user_id, quota_type, limit)
                    return limit
            
            # 2. 從等級配置獲取
            tier = self._get_user_tier(user_id)
            
            try:
                from .level_config import get_level_config_service, MembershipLevel, QuotaType
                service = get_level_config_service()
                level = MembershipLevel.from_string(tier)
                
                try:
                    qt = QuotaType(quota_type)
                    limit = service.get_quota(level, qt)
                    self._update_cache(user_id, quota_type, limit)
                    return limit
                except ValueError:
                    pass
            except ImportError:
                pass
            
            # 3. 默認值（保證免費用戶至少可添加 1 個 TG 帳號）
            limit = self._get_default_limit(quota_type)
            if quota_type == 'tg_accounts' and limit < 1:
                limit = 1
            return limit
        finally:
            db.close()
    
    def _get_default_limit(self, quota_type: str) -> int:
        """獲取默認配額限制"""
        defaults = {
            'tg_accounts': 2,
            'daily_messages': 20,
            'ai_calls': 10,
            'devices': 1,
            'groups': 3,
            'keyword_sets': 0,
            'auto_reply_rules': 1,
            'scheduled_tasks': 0,
            'data_retention_days': 7,
            'platform_api_quota': 0,
            'platform_api_max_accounts': 0,
        }
        return defaults.get(quota_type, 0)
    
    def _update_cache(self, user_id: str, quota_type: str, limit: int):
        """更新緩存"""
        if user_id not in self._quota_cache:
            self._quota_cache[user_id] = {}
        self._quota_cache[user_id][quota_type] = limit
        self._cache_timestamps[f"{user_id}:{quota_type}"] = datetime.now()
    
    def invalidate_cache(self, user_id: str = None):
        """清除緩存"""
        if user_id:
            self._quota_cache.pop(user_id, None)
            self._usage_cache.pop(user_id, None)
            keys_to_remove = [k for k in self._cache_timestamps if k.startswith(f"{user_id}:")]
            for k in keys_to_remove:
                del self._cache_timestamps[k]
        else:
            self._quota_cache.clear()
            self._usage_cache.clear()
            self._cache_timestamps.clear()
    
    # ==================== 使用量查詢 ====================
    
    def _get_current_usage(self, user_id: str, quota_type: str) -> int:
        """獲取當前使用量"""
        today = date.today().isoformat()
        
        db = self._get_db()
        try:
            # 對於每日重置的配額，查詢今日使用量
            if quota_type in self.DAILY_RESET_QUOTAS:
                row = db.execute('''
                    SELECT used FROM quota_usage 
                    WHERE user_id = ? AND quota_type = ? AND date = ?
                ''', (user_id, quota_type, today)).fetchone()
                return row['used'] if row else 0
            
            # 對於非每日重置的配額，直接統計（accounts 表僅有 owner_user_id）
            if quota_type == 'tg_accounts':
                try:
                    # 🔧 P0 修復：只統計有效帳號，排除已刪除/已封禁/錯誤狀態的帳號
                    # 有效狀態：Online, Offline, Waiting Code, Waiting 2FA, Logging in..., Unassigned
                    # 排除狀態：deleted, banned, error, removed
                    excluded_statuses = ('deleted', 'banned', 'removed')
                    placeholders = ','.join(['?' for _ in excluded_statuses])
                    
                    # 先嘗試帶狀態過濾的查詢
                    row = db.execute(
                        f'''SELECT COUNT(*) as count FROM accounts 
                            WHERE owner_user_id = ? 
                            AND (status IS NULL OR LOWER(status) NOT IN ({placeholders}))''',
                        (user_id, *excluded_statuses)
                    ).fetchone()
                    count = row['count'] if row else 0
                    
                    # 🔧 P0 修復：同時統計包含 local_user 和空 owner 的歷史帳號（兼容舊數據）
                    # 如果用戶 ID 不是 local_user，也要統計 local_user 和空 owner 的帳號
                    if user_id and user_id != 'local_user':
                        row2 = db.execute(
                            f'''SELECT COUNT(*) as count FROM accounts 
                                WHERE (owner_user_id IS NULL OR owner_user_id = '' OR owner_user_id = 'local_user')
                                AND (status IS NULL OR LOWER(status) NOT IN ({placeholders}))''',
                            excluded_statuses
                        ).fetchone()
                        legacy_count = row2['count'] if row2 else 0
                        count += legacy_count
                    
                    logger.info(f"[QuotaService] tg_accounts usage for user {user_id}: {count}")
                    return count
                except Exception as e:
                    logger.warning(f"[QuotaService] Failed to count tg_accounts: {e}")
                    return 0
            
            elif quota_type == 'groups':
                row = db.execute('''
                    SELECT COUNT(*) as count FROM monitored_groups 
                    WHERE owner_user_id = ?
                ''', (user_id,)).fetchone()
                return row['count'] if row else 0
            
            elif quota_type == 'devices':
                row = db.execute('''
                    SELECT COUNT(*) as count FROM user_devices 
                    WHERE user_id = ? AND is_active = 1
                ''', (user_id,)).fetchone()
                return row['count'] if row else 0
            
            elif quota_type == 'keyword_sets':
                row = db.execute('''
                    SELECT COUNT(*) as count FROM keyword_sets 
                    WHERE owner_user_id = ?
                ''', (user_id,)).fetchone()
                return row['count'] if row else 0
            
            elif quota_type == 'auto_reply_rules':
                row = db.execute('''
                    SELECT COUNT(*) as count FROM auto_reply_rules 
                    WHERE user_id = ? OR owner_user_id = ?
                ''', (user_id, user_id)).fetchone()
                return row['count'] if row else 0
            
            elif quota_type == 'scheduled_tasks':
                row = db.execute('''
                    SELECT COUNT(*) as count FROM scheduled_tasks 
                    WHERE user_id = ? OR owner_user_id = ?
                ''', (user_id, user_id)).fetchone()
                return row['count'] if row else 0
            
            # 從 quota_usage 表查詢
            row = db.execute('''
                SELECT used FROM quota_usage 
                WHERE user_id = ? AND quota_type = ? AND date = ?
            ''', (user_id, quota_type, today)).fetchone()
            return row['used'] if row else 0
        except Exception as e:
            logger.warning(f"Failed to get usage for {quota_type}: {e}")
            return 0
        finally:
            db.close()
    
    def _get_reserved(self, user_id: str, quota_type: str) -> int:
        """獲取預留配額"""
        if user_id in self._reservations:
            return self._reservations[user_id].get(quota_type, 0)
        return 0
    
    # ==================== 核心配額操作 ====================
    
    def check_quota(
        self, 
        user_id: str, 
        quota_type: str,
        amount: int = 1
    ) -> QuotaCheckResult:
        """
        檢查配額是否足夠
        
        Args:
            user_id: 用戶 ID
            quota_type: 配額類型
            amount: 需要消耗的數量
        
        Returns:
            QuotaCheckResult 包含檢查結果和狀態
        """
        limit = self._get_quota_limit(user_id, quota_type)
        used = self._get_current_usage(user_id, quota_type)
        reserved = self._get_reserved(user_id, quota_type)
        
        # 無限配額
        if limit == -1:
            return QuotaCheckResult(
                allowed=True,
                quota_type=quota_type,
                status=QuotaStatus.UNLIMITED,
                limit=-1,
                used=used,
                reserved=reserved,
                remaining=-1,
                percentage=0,
                message="配額無限制"
            )
        
        effective_used = used + reserved
        remaining = max(0, limit - effective_used)
        percentage = (effective_used / limit * 100) if limit > 0 else 0
        
        # 判斷狀態
        allowed = effective_used + amount <= limit
        
        # 🔧 P1 修復：提供更詳細的配額信息（包含具體數字）
        display_name = self._get_quota_display_name(quota_type)
        if percentage >= 100:
            status = QuotaStatus.EXCEEDED
            message = f"{display_name}已達上限（{effective_used}/{limit}）"
        elif percentage >= self.CRITICAL_THRESHOLD:
            status = QuotaStatus.CRITICAL
            message = f"{display_name}即將用盡（{effective_used}/{limit}，剩餘 {remaining}）"
        elif percentage >= self.WARNING_THRESHOLD:
            status = QuotaStatus.WARNING
            message = f"{display_name}使用超過 80%（{effective_used}/{limit}）"
        else:
            status = QuotaStatus.OK
            message = ""
        
        # 重置時間
        reset_at = None
        if quota_type in self.DAILY_RESET_QUOTAS:
            tomorrow = date.today() + timedelta(days=1)
            reset_at = datetime.combine(tomorrow, datetime.min.time())
        
        # 升級建議
        upgrade_suggestion = ""
        if not allowed:
            upgrade_suggestion = self._get_upgrade_suggestion(user_id, quota_type)
        
        return QuotaCheckResult(
            allowed=allowed,
            quota_type=quota_type,
            status=status,
            limit=limit,
            used=used,
            reserved=reserved,
            remaining=remaining,
            percentage=round(percentage, 1),
            reset_at=reset_at,
            message=message,
            upgrade_suggestion=upgrade_suggestion
        )
    
    def consume_quota(
        self, 
        user_id: str, 
        quota_type: str,
        amount: int = 1,
        context: str = None,
        check_first: bool = True
    ) -> Tuple[bool, QuotaCheckResult]:
        """
        消耗配額
        
        Args:
            user_id: 用戶 ID
            quota_type: 配額類型
            amount: 消耗數量
            context: 操作上下文（用於日誌）
            check_first: 是否先檢查配額
        
        Returns:
            (success, QuotaCheckResult)
        """
        # 先檢查
        if check_first:
            result = self.check_quota(user_id, quota_type, amount)
            if not result.allowed:
                return False, result
        
        # 對於非每日重置的配額，只檢查不記錄（由業務操作自動增加）
        if quota_type not in self.DAILY_RESET_QUOTAS:
            result = self.check_quota(user_id, quota_type, amount)
            return result.allowed, result
        
        # 記錄消耗
        today = date.today().isoformat()
        db = self._get_db()
        try:
            # 獲取當前值
            before_value = self._get_current_usage(user_id, quota_type)
            after_value = before_value + amount
            
            # 更新使用量
            db.execute('''
                INSERT INTO quota_usage (user_id, quota_type, date, used)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id, quota_type, date) DO UPDATE SET
                    used = used + ?,
                    updated_at = CURRENT_TIMESTAMP
            ''', (user_id, quota_type, today, amount, amount))
            
            # 記錄日誌
            db.execute('''
                INSERT INTO quota_logs 
                (user_id, quota_type, action, amount, before_value, after_value, context)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id, quota_type, QuotaAction.CONSUME.value, 
                amount, before_value, after_value, context
            ))
            
            db.commit()
            
            # 清除緩存
            if user_id in self._usage_cache:
                self._usage_cache[user_id].pop(quota_type, None)
            
            # 檢查是否需要告警
            result = self.check_quota(user_id, quota_type)
            if result.status in {QuotaStatus.WARNING, QuotaStatus.CRITICAL, QuotaStatus.EXCEEDED}:
                self._send_alert(user_id, quota_type, result)
            
            # 🔧 P6-3: 通知配額變更
            self._notify_change(user_id, quota_type, 'consume', result)
            
            return True, result
        except Exception as e:
            logger.error(f"Failed to consume quota: {e}")
            return False, self.check_quota(user_id, quota_type)
        finally:
            db.close()
    
    def reserve_quota(
        self, 
        user_id: str, 
        quota_type: str,
        amount: int,
        reservation_id: str = None
    ) -> Tuple[bool, QuotaCheckResult]:
        """
        預留配額（用於長時間操作）
        
        Args:
            user_id: 用戶 ID
            quota_type: 配額類型
            amount: 預留數量
            reservation_id: 預留 ID（用於釋放）
        
        Returns:
            (success, QuotaCheckResult)
        """
        result = self.check_quota(user_id, quota_type, amount)
        if not result.allowed:
            return False, result
        
        # 添加預留
        if user_id not in self._reservations:
            self._reservations[user_id] = {}
        
        current_reserved = self._reservations[user_id].get(quota_type, 0)
        self._reservations[user_id][quota_type] = current_reserved + amount
        
        # 🔧 P4-4: 記錄預留時間戳，用於超時自動釋放
        reservation_key = f"{user_id}:{quota_type}"
        if not hasattr(self, '_reservation_timestamps'):
            self._reservation_timestamps = {}
        self._reservation_timestamps[reservation_key] = datetime.now()
        
        logger.info(f"Reserved {amount} {quota_type} for user {user_id}")
        
        return True, self.check_quota(user_id, quota_type)
    
    def release_reservation(
        self, 
        user_id: str, 
        quota_type: str,
        amount: int = None,
        consume: bool = False
    ) -> bool:
        """
        釋放預留配額
        
        Args:
            user_id: 用戶 ID
            quota_type: 配額類型
            amount: 釋放數量（None 表示全部）
            consume: 是否將預留轉為消耗
        
        Returns:
            是否成功
        """
        if user_id not in self._reservations:
            return True
        
        current_reserved = self._reservations[user_id].get(quota_type, 0)
        if amount is None:
            amount = current_reserved
        
        release_amount = min(amount, current_reserved)
        
        if consume and release_amount > 0:
            self.consume_quota(user_id, quota_type, release_amount, 
                             context="from_reservation", check_first=False)
        
        self._reservations[user_id][quota_type] = max(0, current_reserved - release_amount)
        
        # 🔧 P4-4: 清理預留時間戳
        reservation_key = f"{user_id}:{quota_type}"
        if hasattr(self, '_reservation_timestamps'):
            self._reservation_timestamps.pop(reservation_key, None)
        
        return True
    
    # ==================== P4-3: 原子化配額操作 ====================
    
    def atomic_check_and_reserve(
        self,
        user_id: str,
        quota_type: str,
        amount: int = 1
    ) -> Tuple[bool, QuotaCheckResult]:
        """
        🔧 P4-3: 原子化的配額檢查 + 預留操作
        
        使用線程鎖 + 數據庫事務防止並發操作導致超額。
        適用於 add-account 等需要先檢查再執行的場景。
        
        流程：
          1. 獲取線程鎖（防止進程內並發）
          2. 清除緩存（確保讀取最新值）
          3. 讀取真實用量（繞過緩存）
          4. 檢查是否滿足配額
          5. 如果滿足，立即預留
        
        Returns:
            (success, QuotaCheckResult)
        """
        with self._lock:
            # 清除該用戶的緩存，確保讀取最新值
            self.invalidate_cache(user_id)
            
            # 檢查配額（此時讀取的是真實值）
            result = self.check_quota(user_id, quota_type, amount)
            
            if not result.allowed:
                logger.info(
                    f"[AtomicQuota] Denied {quota_type} for user {user_id}: "
                    f"used={result.used}, reserved={result.reserved}, limit={result.limit}"
                )
                return False, result
            
            # 立即預留，佔住名額
            if user_id not in self._reservations:
                self._reservations[user_id] = {}
            current_reserved = self._reservations[user_id].get(quota_type, 0)
            self._reservations[user_id][quota_type] = current_reserved + amount
            
            # 記錄預留時間戳
            reservation_key = f"{user_id}:{quota_type}"
            if not hasattr(self, '_reservation_timestamps'):
                self._reservation_timestamps = {}
            self._reservation_timestamps[reservation_key] = datetime.now()
            
            logger.info(
                f"[AtomicQuota] Reserved {amount} {quota_type} for user {user_id}: "
                f"used={result.used}, reserved={current_reserved + amount}, limit={result.limit}"
            )
            
            # 重新計算結果（含新預留）
            updated_result = self.check_quota(user_id, quota_type)
            return True, updated_result
    
    def atomic_commit_or_rollback(
        self,
        user_id: str,
        quota_type: str,
        amount: int = 1,
        commit: bool = True
    ) -> None:
        """
        🔧 P4-3: 原子操作的提交/回滾
        
        在 add-account 成功後調用 commit=True（將預留轉為消耗）；
        在 add-account 失敗後調用 commit=False（釋放預留）。
        
        Args:
            user_id: 用戶 ID
            quota_type: 配額類型
            amount: 預留數量
            commit: True=提交（預留→消耗），False=回滾（釋放預留）
        """
        with self._lock:
            if commit:
                # 成功：釋放預留（業務操作已增加實際帳號數，配額自然遞增）
                self.release_reservation(user_id, quota_type, amount, consume=False)
                logger.info(f"[AtomicQuota] Committed {amount} {quota_type} for user {user_id}")
            else:
                # 失敗：回滾預留
                self.release_reservation(user_id, quota_type, amount, consume=False)
                logger.info(f"[AtomicQuota] Rolled back {amount} {quota_type} for user {user_id}")
            
            # 清除緩存
            self.invalidate_cache(user_id)
        
        # 🔧 P6-3: 通知配額變更（提交或回滾都需通知前端刷新）
        action = 'commit' if commit else 'rollback'
        self._notify_change(user_id, quota_type, action)
    
    # ==================== P4-4: 預留超時自動清理 ====================
    
    def cleanup_expired_reservations(self, timeout_seconds: int = 300) -> Dict[str, Any]:
        """
        🔧 P4-4: 清理超時預留
        
        如果一個預留超過 timeout_seconds（默認 5 分鐘）仍未提交/回滾，
        自動釋放，防止配額被永久佔用。
        
        Returns:
            {'cleaned': int, 'details': [...]}
        """
        if not hasattr(self, '_reservation_timestamps'):
            return {'cleaned': 0, 'details': []}
        
        now = datetime.now()
        expired = []
        
        for key, ts in list(self._reservation_timestamps.items()):
            age = (now - ts).total_seconds()
            if age > timeout_seconds:
                expired.append((key, age))
        
        cleaned = 0
        details = []
        
        for key, age in expired:
            parts = key.split(':', 1)
            if len(parts) == 2:
                uid, qt = parts
                reserved = self._reservations.get(uid, {}).get(qt, 0)
                if reserved > 0:
                    self.release_reservation(uid, qt)
                    self.invalidate_cache(uid)
                    details.append({
                        'user_id': uid,
                        'quota_type': qt,
                        'released': reserved,
                        'age_seconds': round(age, 1)
                    })
                    cleaned += 1
                    logger.warning(
                        f"[QuotaCleanup] Released expired reservation: "
                        f"user={uid}, type={qt}, amount={reserved}, age={age:.0f}s"
                    )
            
            # 清理時間戳
            self._reservation_timestamps.pop(key, None)
        
        if cleaned > 0:
            logger.info(f"[QuotaCleanup] Cleaned {cleaned} expired reservations")
        
        return {'cleaned': cleaned, 'details': details}
    
    # ==================== 批量操作 ====================
    
    def check_multiple_quotas(
        self, 
        user_id: str, 
        quotas: Dict[str, int]
    ) -> Dict[str, QuotaCheckResult]:
        """批量檢查多個配額"""
        results = {}
        for quota_type, amount in quotas.items():
            results[quota_type] = self.check_quota(user_id, quota_type, amount)
        return results
    
    def all_quotas_allowed(
        self, 
        user_id: str, 
        quotas: Dict[str, int]
    ) -> Tuple[bool, Dict[str, QuotaCheckResult]]:
        """檢查所有配額是否都允許"""
        results = self.check_multiple_quotas(user_id, quotas)
        all_allowed = all(r.allowed for r in results.values())
        return all_allowed, results
    
    # ==================== 配額摘要 ====================
    
    def get_usage_summary(self, user_id: str) -> QuotaUsageSummary:
        """獲取用戶配額使用摘要"""
        tier = self._get_user_tier(user_id)
        
        # 獲取等級名稱
        tier_name = tier
        try:
            from .level_config import get_level_config_service, MembershipLevel
            service = get_level_config_service()
            level = MembershipLevel.from_string(tier)
            config = service.get_level_config(level)
            if config:
                tier_name = config.name
        except:
            pass
        
        # 檢查所有配額
        quota_types = [
            'tg_accounts', 'daily_messages', 'ai_calls', 'devices',
            'groups', 'keyword_sets', 'auto_reply_rules', 'scheduled_tasks'
        ]
        
        quotas = {}
        alerts = []
        
        for qt in quota_types:
            result = self.check_quota(user_id, qt)
            quotas[qt] = result
            
            if result.status in {QuotaStatus.WARNING, QuotaStatus.CRITICAL}:
                alerts.append({
                    'type': 'warning',
                    'quota_type': qt,
                    'message': result.message,
                    'percentage': result.percentage
                })
            elif result.status == QuotaStatus.EXCEEDED:
                alerts.append({
                    'type': 'exceeded',
                    'quota_type': qt,
                    'message': result.message,
                    'percentage': 100
                })
        
        return QuotaUsageSummary(
            user_id=user_id,
            tier=tier,
            tier_name=tier_name,
            quotas=quotas,
            alerts=alerts
        )
    
    # ==================== 每日重置 ====================
    
    async def reset_daily_quotas(self):
        """
        重置每日配額
        
        應由定時任務在每日 00:00 調用
        """
        today = date.today().isoformat()
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        
        db = self._get_db()
        try:
            # 獲取昨日有使用記錄的用戶
            rows = db.execute('''
                SELECT DISTINCT user_id FROM quota_usage 
                WHERE date = ? AND quota_type IN (?, ?)
            ''', (yesterday, 'daily_messages', 'ai_calls')).fetchall()
            
            reset_count = 0
            for row in rows:
                user_id = row['user_id']
                
                # 記錄重置日誌
                for quota_type in self.DAILY_RESET_QUOTAS:
                    db.execute('''
                        INSERT INTO quota_logs 
                        (user_id, quota_type, action, amount, before_value, after_value, context)
                        VALUES (?, ?, ?, 0, 
                            (SELECT used FROM quota_usage WHERE user_id = ? AND quota_type = ? AND date = ?),
                            0, 'daily_reset')
                    ''', (user_id, quota_type, QuotaAction.RESET.value, 
                          user_id, quota_type, yesterday))
                
                reset_count += 1
            
            db.commit()
            logger.info(f"Reset daily quotas for {reset_count} users")
            
            # 清除緩存
            self._usage_cache.clear()
            
            return reset_count
        except Exception as e:
            logger.error(f"Failed to reset daily quotas: {e}")
            return 0
        finally:
            db.close()
    
    # ==================== 告警機制 ====================
    
    def _send_alert(
        self, 
        user_id: str, 
        quota_type: str, 
        result: QuotaCheckResult
    ):
        """發送配額告警"""
        alert_key = f"{user_id}:{quota_type}:{result.status.value}"
        
        # 檢查冷卻時間
        if alert_key in self._alert_cooldown:
            if datetime.now() - self._alert_cooldown[alert_key] < timedelta(seconds=self._alert_cooldown_seconds):
                return  # 在冷卻期內，不重複發送
        
        # 記錄告警
        db = self._get_db()
        try:
            db.execute('''
                INSERT INTO quota_alerts_v2 
                (user_id, quota_type, alert_level, threshold, current_value, limit_value, message)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id, quota_type, result.status.value,
                int(result.percentage), result.used, result.limit, result.message
            ))
            db.commit()
            
            # 更新冷卻時間
            self._alert_cooldown[alert_key] = datetime.now()
            
            # 發送實時通知（如果有 WebSocket 連接）
            try:
                from .realtime import notify_user, EventType
                asyncio.create_task(notify_user(
                    user_id, 
                    EventType.QUOTA_WARNING,
                    {
                        'quota_type': quota_type,
                        'status': result.status.value,
                        'message': result.message,
                        'percentage': result.percentage,
                        'upgrade_suggestion': result.upgrade_suggestion
                    }
                ))
            except:
                pass
            
            logger.info(f"Quota alert sent: {user_id} - {quota_type} - {result.status.value}")
        except Exception as e:
            logger.error(f"Failed to send quota alert: {e}")
        finally:
            db.close()
    
    def get_user_alerts(
        self, 
        user_id: str, 
        unacknowledged_only: bool = True
    ) -> List[Dict[str, Any]]:
        """獲取用戶配額告警"""
        db = self._get_db()
        try:
            query = '''
                SELECT * FROM quota_alerts_v2 
                WHERE user_id = ?
            '''
            params = [user_id]
            
            if unacknowledged_only:
                query += ' AND acknowledged = 0'
            
            query += ' ORDER BY created_at DESC LIMIT 50'
            
            rows = db.execute(query, params).fetchall()
            return [dict(row) for row in rows]
        finally:
            db.close()
    
    def acknowledge_alert(self, alert_id: int) -> bool:
        """確認告警"""
        db = self._get_db()
        try:
            db.execute('''
                UPDATE quota_alerts_v2 SET acknowledged = 1 WHERE id = ?
            ''', (alert_id,))
            db.commit()
            return True
        except:
            return False
        finally:
            db.close()
    
    # ==================== 輔助方法 ====================
    
    def _get_quota_display_name(self, quota_type: str) -> str:
        """獲取配額顯示名稱"""
        names = {
            'tg_accounts': 'TG 帳號',
            'daily_messages': '每日消息',
            'ai_calls': 'AI 調用',
            'devices': '設備數',
            'groups': '群組數',
            'keyword_sets': '關鍵詞集',
            'auto_reply_rules': '自動回覆規則',
            'scheduled_tasks': '定時任務',
            'data_retention_days': '數據保留',
            'platform_api_quota': '平台 API',
            'platform_api_max_accounts': 'API 帳號',
        }
        return names.get(quota_type, quota_type)
    
    def _get_upgrade_suggestion(self, user_id: str, quota_type: str) -> str:
        """獲取升級建議"""
        tier = self._get_user_tier(user_id)
        
        try:
            from .level_config import get_level_config_service, MembershipLevel
            service = get_level_config_service()
            current_level = MembershipLevel.from_string(tier)
            
            # 獲取升級選項
            upgrade_options = service.get_upgrade_options(current_level)
            if upgrade_options:
                next_level = upgrade_options[0]
                return f"升級至{next_level.name}可獲得更多配額"
        except:
            pass
        
        return "升級會員等級可獲得更多配額"


    # ==================== P4-2: 數據一致性校驗 ====================
    
    def verify_quota_consistency(self, user_id: str) -> Dict[str, Any]:
        """
        校驗配額計數與實際數據是否一致
        
        🔧 P4-2: 定期或按需執行，返回不一致項和修復建議
        
        Returns:
            {
                'consistent': bool,
                'checks': [{quota_type, expected, actual, status}],
                'auto_fixed': int
            }
        """
        checks = []
        auto_fixed = 0
        
        db = self._get_db()
        try:
            # 1. 校驗 tg_accounts
            quota_used = self._get_current_usage(user_id, 'tg_accounts')
            try:
                excluded = ('deleted', 'banned', 'removed')
                ph = ','.join(['?' for _ in excluded])
                
                # 真實計數（直接查庫，繞過緩存）
                row = db.execute(
                    f'''SELECT COUNT(*) as c FROM accounts 
                        WHERE owner_user_id = ? 
                        AND (status IS NULL OR LOWER(status) NOT IN ({ph}))''',
                    (user_id, *excluded)
                ).fetchone()
                real_count = row['c'] if row else 0
                
                # 加入 legacy 帳號
                if user_id != 'local_user':
                    row2 = db.execute(
                        f'''SELECT COUNT(*) as c FROM accounts 
                            WHERE (owner_user_id IS NULL OR owner_user_id = '' OR owner_user_id = 'local_user')
                            AND (status IS NULL OR LOWER(status) NOT IN ({ph}))''',
                        excluded
                    ).fetchone()
                    real_count += row2['c'] if row2 else 0
                
                status = 'ok' if quota_used == real_count else 'mismatch'
                checks.append({
                    'quota_type': 'tg_accounts',
                    'cached_usage': quota_used,
                    'actual_count': real_count,
                    'status': status
                })
                
                if status == 'mismatch':
                    logger.warning(
                        f"[QuotaConsistency] tg_accounts mismatch for user {user_id}: "
                        f"cached={quota_used}, actual={real_count}"
                    )
                    # 自動修復：清除緩存，下次查詢將讀取真實值
                    self.invalidate_cache(user_id)
                    auto_fixed += 1
                    
            except Exception as e:
                checks.append({
                    'quota_type': 'tg_accounts',
                    'error': str(e),
                    'status': 'error'
                })
            
            # 2. 校驗 quota_usage 表中的每日配額
            today = date.today().isoformat()
            for qt in self.DAILY_RESET_QUOTAS:
                try:
                    row = db.execute(
                        'SELECT used FROM quota_usage WHERE user_id = ? AND quota_type = ? AND date = ?',
                        (user_id, qt, today)
                    ).fetchone()
                    recorded = row['used'] if row else 0
                    
                    # 每日配額不需要額外校驗，記錄即可
                    checks.append({
                        'quota_type': qt,
                        'recorded_usage': recorded,
                        'status': 'ok'
                    })
                except Exception as e:
                    checks.append({
                        'quota_type': qt,
                        'error': str(e),
                        'status': 'error'
                    })
            
            consistent = all(c.get('status') == 'ok' for c in checks)
            
            result = {
                'consistent': consistent,
                'user_id': user_id,
                'checked_at': datetime.now().isoformat(),
                'checks': checks,
                'auto_fixed': auto_fixed
            }
            
            if not consistent:
                logger.warning(f"[QuotaConsistency] Inconsistency found for user {user_id}: {result}")
            else:
                logger.info(f"[QuotaConsistency] All checks passed for user {user_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"[QuotaConsistency] Error during consistency check: {e}")
            return {
                'consistent': False,
                'user_id': user_id,
                'error': str(e),
                'checks': checks,
                'auto_fixed': auto_fixed
            }
        finally:
            db.close()
    
    def run_all_users_consistency_check(self) -> Dict[str, Any]:
        """
        對所有活躍用戶執行一致性校驗
        
        🔧 P4-2: 供定期任務或管理員手動觸發
        """
        db = self._get_db()
        try:
            rows = db.execute(
                "SELECT DISTINCT user_id FROM user_profiles WHERE user_id IS NOT NULL AND user_id != ''"
            ).fetchall()
            
            if not rows:
                # 嘗試從 users 表獲取
                rows = db.execute(
                    "SELECT DISTINCT id as user_id FROM users WHERE is_active = 1"
                ).fetchall()
            
            total = len(rows)
            inconsistent = 0
            fixed = 0
            
            for row in rows:
                uid = row['user_id'] if isinstance(row, dict) else row[0]
                result = self.verify_quota_consistency(uid)
                if not result.get('consistent'):
                    inconsistent += 1
                fixed += result.get('auto_fixed', 0)
            
            summary = {
                'total_users': total,
                'inconsistent': inconsistent,
                'auto_fixed': fixed,
                'checked_at': datetime.now().isoformat()
            }
            
            logger.info(f"[QuotaConsistency] Batch check: {summary}")
            return summary
            
        except Exception as e:
            logger.error(f"[QuotaConsistency] Batch check error: {e}")
            return {'error': str(e)}
        finally:
            db.close()


# ==================== 全局訪問 ====================

_quota_service: Optional[QuotaService] = None

def get_quota_service() -> QuotaService:
    """獲取配額服務實例"""
    global _quota_service
    if _quota_service is None:
        _quota_service = QuotaService()
    return _quota_service


# ==================== 便捷裝飾器 ====================

def require_quota(quota_type: str, amount: int = 1):
    """
    配額檢查裝飾器
    
    用法：
    @require_quota('daily_messages', 1)
    async def send_message(user_id, message):
        ...
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # 嘗試從參數獲取 user_id
            user_id = kwargs.get('user_id')
            if not user_id and args:
                user_id = args[0] if isinstance(args[0], str) else None
            
            if not user_id:
                from .tenant_context import get_user_id
                user_id = get_user_id()
            
            if not user_id:
                raise ValueError("Cannot determine user_id for quota check")
            
            service = get_quota_service()
            result = service.check_quota(user_id, quota_type, amount)
            
            if not result.allowed:
                raise QuotaExceededException(
                    quota_type=quota_type,
                    message=result.message,
                    result=result
                )
            
            # 執行函數
            response = await func(*args, **kwargs)
            
            # 消耗配額
            service.consume_quota(user_id, quota_type, amount)
            
            return response
        return wrapper
    return decorator


class QuotaExceededException(Exception):
    """配額超限異常"""
    def __init__(self, quota_type: str, message: str, result: QuotaCheckResult = None):
        self.quota_type = quota_type
        self.result = result
        super().__init__(message)
