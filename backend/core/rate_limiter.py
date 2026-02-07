"""
API 速率限制服務

功能：
1. 多維度限流（IP、用戶、API Key）
2. 滑動窗口算法
3. 令牌桶算法
4. 動態限流配置
"""

import os
import sqlite3
import logging
import time
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum
import threading
from collections import defaultdict

logger = logging.getLogger(__name__)


# ==================== 限流配置 ====================

class RateLimitScope(str, Enum):
    IP = 'ip'
    USER = 'user'
    API_KEY = 'api_key'
    GLOBAL = 'global'


@dataclass
class RateLimitRule:
    """限流規則"""
    name: str
    scope: RateLimitScope
    requests: int           # 請求數量
    window_seconds: int     # 時間窗口
    
    # 可選限制
    burst: int = 0          # 突發容量（令牌桶）
    
    # 匹配條件
    path_pattern: str = '*'
    methods: List[str] = field(default_factory=list)
    user_tiers: List[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            'name': self.name,
            'scope': self.scope.value,
            'requests': self.requests,
            'window_seconds': self.window_seconds,
            'burst': self.burst,
            'path_pattern': self.path_pattern,
            'methods': self.methods,
            'user_tiers': self.user_tiers
        }


@dataclass
class RateLimitResult:
    """限流結果"""
    allowed: bool
    remaining: int
    reset_at: int           # Unix 時間戳
    retry_after: int = 0    # 秒
    rule_name: str = ''
    
    def to_headers(self) -> Dict[str, str]:
        """轉換為響應頭"""
        headers = {
            'X-RateLimit-Remaining': str(self.remaining),
            'X-RateLimit-Reset': str(self.reset_at)
        }
        if not self.allowed:
            headers['Retry-After'] = str(self.retry_after)
        return headers


# ==================== 默認規則 ====================

DEFAULT_RULES = [
    # 全局限流
    RateLimitRule(
        name='global_default',
        scope=RateLimitScope.GLOBAL,
        requests=10000,
        window_seconds=60
    ),
    
    # IP 限流
    RateLimitRule(
        name='ip_default',
        scope=RateLimitScope.IP,
        requests=100,
        window_seconds=60,
        burst=20
    ),
    # 認證相關讀取（me/devices/usage-stats 等）單頁會並發多個請求，放寬以免正常用戶觸發 429
    RateLimitRule(
        name='ip_auth',
        scope=RateLimitScope.IP,
        requests=60,
        window_seconds=60,
        path_pattern='/api/v1/auth/*'
    ),
    
    # 用戶限流（按等級）
    RateLimitRule(
        name='user_bronze',
        scope=RateLimitScope.USER,
        requests=60,
        window_seconds=60,
        user_tiers=['bronze']
    ),
    RateLimitRule(
        name='user_silver',
        scope=RateLimitScope.USER,
        requests=120,
        window_seconds=60,
        user_tiers=['silver']
    ),
    RateLimitRule(
        name='user_gold',
        scope=RateLimitScope.USER,
        requests=300,
        window_seconds=60,
        user_tiers=['gold']
    ),
    RateLimitRule(
        name='user_diamond',
        scope=RateLimitScope.USER,
        requests=600,
        window_seconds=60,
        user_tiers=['diamond', 'star', 'king']
    ),
    
    # 特殊 API 限流
    RateLimitRule(
        name='ai_calls',
        scope=RateLimitScope.USER,
        requests=30,
        window_seconds=60,
        path_pattern='/api/v1/ai/*'
    ),
    RateLimitRule(
        name='search',
        scope=RateLimitScope.USER,
        requests=20,
        window_seconds=60,
        path_pattern='/api/v1/search/*'
    ),
]


class SlidingWindowCounter:
    """滑動窗口計數器"""
    
    def __init__(self):
        self._windows: Dict[str, List[Tuple[float, int]]] = defaultdict(list)
        self._lock = threading.RLock()
    
    def check_and_increment(
        self,
        key: str,
        limit: int,
        window_seconds: int
    ) -> Tuple[bool, int, int]:
        """
        檢查並增加計數
        返回: (是否允許, 剩餘次數, 重置時間戳)
        """
        with self._lock:
            now = time.time()
            window_start = now - window_seconds
            
            # 清理過期記錄
            self._windows[key] = [
                (ts, count) for ts, count in self._windows[key]
                if ts > window_start
            ]
            
            # 計算當前計數
            current_count = sum(count for _, count in self._windows[key])
            
            if current_count >= limit:
                # 計算需要等待的時間
                oldest = min((ts for ts, _ in self._windows[key]), default=now)
                reset_at = int(oldest + window_seconds)
                return False, 0, reset_at
            
            # 增加計數
            self._windows[key].append((now, 1))
            remaining = limit - current_count - 1
            reset_at = int(now + window_seconds)
            
            return True, remaining, reset_at
    
    def get_count(self, key: str, window_seconds: int) -> int:
        """獲取當前計數"""
        with self._lock:
            now = time.time()
            window_start = now - window_seconds
            
            return sum(
                count for ts, count in self._windows.get(key, [])
                if ts > window_start
            )
    
    def reset(self, key: str):
        """重置計數"""
        with self._lock:
            if key in self._windows:
                del self._windows[key]


class TokenBucket:
    """令牌桶算法"""
    
    def __init__(self):
        self._buckets: Dict[str, Dict[str, float]] = {}
        self._lock = threading.RLock()
    
    def check_and_consume(
        self,
        key: str,
        rate: float,        # 每秒令牌數
        capacity: int,      # 桶容量
        tokens: int = 1     # 消耗令牌數
    ) -> Tuple[bool, int]:
        """
        檢查並消耗令牌
        返回: (是否允許, 剩餘令牌)
        """
        with self._lock:
            now = time.time()
            
            if key not in self._buckets:
                self._buckets[key] = {
                    'tokens': capacity,
                    'last_update': now
                }
            
            bucket = self._buckets[key]
            
            # 計算新增令牌
            elapsed = now - bucket['last_update']
            new_tokens = elapsed * rate
            bucket['tokens'] = min(capacity, bucket['tokens'] + new_tokens)
            bucket['last_update'] = now
            
            if bucket['tokens'] >= tokens:
                bucket['tokens'] -= tokens
                return True, int(bucket['tokens'])
            
            return False, 0
    
    def reset(self, key: str):
        """重置桶"""
        with self._lock:
            if key in self._buckets:
                del self._buckets[key]


class RateLimiter:
    """速率限制服務"""
    
    _instance: Optional['RateLimiter'] = None
    _lock = threading.Lock()
    
    def __new__(cls, db_path: str = None):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self, db_path: str = None):
        if self._initialized:
            return
        
        self.db_path = db_path or os.environ.get(
            'DB_PATH',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
        )
        
        # 限流規則
        self._rules: List[RateLimitRule] = DEFAULT_RULES.copy()
        
        # 滑動窗口計數器
        self._counter = SlidingWindowCounter()
        
        # 令牌桶
        self._token_bucket = TokenBucket()
        
        # 白名單
        self._whitelist: set = set()
        
        # 黑名單（封禁）
        self._blacklist: Dict[str, datetime] = {}
        
        self._init_db()
        self._initialized = True
        logger.info("RateLimiter initialized")
    
    def _init_db(self):
        """初始化數據庫表"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 限流記錄表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS rate_limit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scope TEXT,
                    identifier TEXT,
                    path TEXT,
                    rule_name TEXT,
                    allowed INTEGER,
                    count INTEGER,
                    created_at TEXT
                )
            ''')
            
            # 封禁表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS rate_limit_bans (
                    identifier TEXT PRIMARY KEY,
                    scope TEXT,
                    reason TEXT,
                    banned_at TEXT,
                    expires_at TEXT
                )
            ''')
            
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_rate_logs_time ON rate_limit_logs(created_at)')
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Init rate limiter DB error: {e}")
    
    def _get_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    # ==================== 限流檢查 ====================
    
    def check(
        self,
        ip: str = None,
        user_id: str = None,
        user_tier: str = None,
        api_key: str = None,
        path: str = '/',
        method: str = 'GET'
    ) -> RateLimitResult:
        """檢查請求是否被限流"""
        
        # 白名單檢查
        if ip in self._whitelist or user_id in self._whitelist:
            return RateLimitResult(allowed=True, remaining=999999, reset_at=0)
        
        # 黑名單檢查
        ban_key = ip or user_id
        if ban_key and ban_key in self._blacklist:
            if self._blacklist[ban_key] > datetime.utcnow():
                return RateLimitResult(
                    allowed=False,
                    remaining=0,
                    reset_at=int(self._blacklist[ban_key].timestamp()),
                    retry_after=int((self._blacklist[ban_key] - datetime.utcnow()).total_seconds()),
                    rule_name='banned'
                )
            else:
                del self._blacklist[ban_key]
        
        # 匹配規則並檢查
        for rule in self._rules:
            if not self._match_rule(rule, path, method, user_tier):
                continue
            
            # 構建限流鍵
            key = self._build_key(rule.scope, ip, user_id, api_key, path)
            if not key:
                continue
            
            # 使用滑動窗口檢查
            allowed, remaining, reset_at = self._counter.check_and_increment(
                key, rule.requests, rule.window_seconds
            )
            
            if not allowed:
                retry_after = max(1, reset_at - int(time.time()))
                
                # 記錄日誌
                self._log_rate_limit(rule.scope.value, key, path, rule.name, False)
                
                return RateLimitResult(
                    allowed=False,
                    remaining=0,
                    reset_at=reset_at,
                    retry_after=retry_after,
                    rule_name=rule.name
                )
        
        # 所有規則通過
        return RateLimitResult(allowed=True, remaining=999, reset_at=int(time.time()) + 60)
    
    def _match_rule(
        self,
        rule: RateLimitRule,
        path: str,
        method: str,
        user_tier: str
    ) -> bool:
        """檢查規則是否匹配"""
        # 路徑匹配
        if rule.path_pattern != '*':
            import fnmatch
            if not fnmatch.fnmatch(path, rule.path_pattern):
                return False
        
        # 方法匹配
        if rule.methods and method.upper() not in rule.methods:
            return False
        
        # 用戶等級匹配
        if rule.user_tiers and user_tier and user_tier not in rule.user_tiers:
            return False
        
        return True
    
    def _build_key(
        self,
        scope: RateLimitScope,
        ip: str,
        user_id: str,
        api_key: str,
        path: str
    ) -> Optional[str]:
        """構建限流鍵"""
        if scope == RateLimitScope.IP:
            return f"ip:{ip}" if ip else None
        elif scope == RateLimitScope.USER:
            return f"user:{user_id}" if user_id else None
        elif scope == RateLimitScope.API_KEY:
            return f"apikey:{api_key}" if api_key else None
        elif scope == RateLimitScope.GLOBAL:
            return "global"
        return None
    
    def _log_rate_limit(
        self,
        scope: str,
        identifier: str,
        path: str,
        rule_name: str,
        allowed: bool
    ):
        """記錄限流日誌"""
        try:
            db = self._get_db()
            db.execute('''
                INSERT INTO rate_limit_logs
                (scope, identifier, path, rule_name, allowed, count, created_at)
                VALUES (?, ?, ?, ?, ?, 1, ?)
            ''', (scope, identifier, path, rule_name, 1 if allowed else 0, datetime.utcnow().isoformat()))
            db.commit()
            db.close()
        except Exception as e:
            logger.warning(f"Log rate limit error: {e}")
    
    # ==================== 規則管理 ====================
    
    def add_rule(self, rule: RateLimitRule):
        """添加規則"""
        self._rules.append(rule)
        logger.info(f"Added rate limit rule: {rule.name}")
    
    def remove_rule(self, name: str):
        """移除規則"""
        self._rules = [r for r in self._rules if r.name != name]
    
    def get_rules(self) -> List[Dict]:
        """獲取所有規則"""
        return [r.to_dict() for r in self._rules]
    
    # ==================== 白名單/黑名單 ====================
    
    def add_to_whitelist(self, identifier: str):
        """添加到白名單"""
        self._whitelist.add(identifier)
    
    def remove_from_whitelist(self, identifier: str):
        """從白名單移除"""
        self._whitelist.discard(identifier)
    
    def ban(self, identifier: str, duration_seconds: int, reason: str = ''):
        """封禁"""
        expires_at = datetime.utcnow() + timedelta(seconds=duration_seconds)
        self._blacklist[identifier] = expires_at
        
        # 持久化
        try:
            db = self._get_db()
            db.execute('''
                INSERT OR REPLACE INTO rate_limit_bans
                (identifier, scope, reason, banned_at, expires_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (identifier, 'manual', reason, datetime.utcnow().isoformat(), expires_at.isoformat()))
            db.commit()
            db.close()
        except:
            pass
        
        logger.warning(f"Banned {identifier} for {duration_seconds}s: {reason}")
    
    def unban(self, identifier: str):
        """解除封禁"""
        if identifier in self._blacklist:
            del self._blacklist[identifier]
        
        try:
            db = self._get_db()
            db.execute('DELETE FROM rate_limit_bans WHERE identifier = ?', (identifier,))
            db.commit()
            db.close()
        except:
            pass
    
    # ==================== 統計 ====================
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取統計"""
        try:
            db = self._get_db()
            
            # 最近 1 小時的限流統計
            hour_ago = (datetime.utcnow() - timedelta(hours=1)).isoformat()
            
            row = db.execute('''
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN allowed = 0 THEN 1 ELSE 0 END) as blocked
                FROM rate_limit_logs
                WHERE created_at > ?
            ''', (hour_ago,)).fetchone()
            
            # 按規則統計
            by_rule = db.execute('''
                SELECT rule_name, COUNT(*) as count
                FROM rate_limit_logs
                WHERE created_at > ? AND allowed = 0
                GROUP BY rule_name
                ORDER BY count DESC
            ''', (hour_ago,)).fetchall()
            
            db.close()
            
            return {
                'total_requests': row['total'] or 0,
                'blocked_requests': row['blocked'] or 0,
                'block_rate': round((row['blocked'] or 0) / max(row['total'] or 1, 1) * 100, 2),
                'by_rule': {r['rule_name']: r['count'] for r in by_rule},
                'active_bans': len(self._blacklist),
                'whitelist_size': len(self._whitelist)
            }
        except:
            return {}


# ==================== 單例訪問 ====================

_rate_limiter: Optional[RateLimiter] = None


def get_rate_limiter() -> RateLimiter:
    """獲取限流服務"""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = RateLimiter()
    return _rate_limiter
