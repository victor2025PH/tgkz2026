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
        
        if db_path is None:
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
        
        self._init_db()
        self._initialized = True
        logger.info("QuotaService initialized")
    
    def _get_db(self) -> sqlite3.Connection:
        db = sqlite3.connect(self.db_path)
        db.row_factory = sqlite3.Row
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
        """獲取用戶等級"""
        db = self._get_db()
        try:
            row = db.execute('''
                SELECT subscription_tier FROM user_profiles WHERE user_id = ?
                UNION
                SELECT subscription_tier FROM users WHERE id = ?
            ''', (user_id, user_id)).fetchone()
            return row['subscription_tier'] if row else 'bronze'
        except:
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
            # 1. 檢查自定義配額
            row = db.execute('''
                SELECT custom_value, expires_at FROM user_custom_quotas 
                WHERE user_id = ? AND quota_type = ?
            ''', (user_id, quota_type)).fetchone()
            
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
            
            # 3. 默認值
            return self._get_default_limit(quota_type)
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
            
            # 對於非每日重置的配額，直接統計
            if quota_type == 'tg_accounts':
                row = db.execute('''
                    SELECT COUNT(*) as count FROM accounts 
                    WHERE user_id = ? OR owner_user_id = ?
                ''', (user_id, user_id)).fetchone()
                return row['count'] if row else 0
            
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
        
        if percentage >= 100:
            status = QuotaStatus.EXCEEDED
            message = f"{self._get_quota_display_name(quota_type)}已達上限"
        elif percentage >= self.CRITICAL_THRESHOLD:
            status = QuotaStatus.CRITICAL
            message = f"{self._get_quota_display_name(quota_type)}即將用盡"
        elif percentage >= self.WARNING_THRESHOLD:
            status = QuotaStatus.WARNING
            message = f"{self._get_quota_display_name(quota_type)}使用超過 80%"
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
        
        return True
    
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
