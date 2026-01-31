"""
使用量追蹤和配額管理

優化設計：
1. 實時使用量統計
2. 配額檢查和限制
3. 使用量歷史記錄
4. 配額告警通知
"""

import sqlite3
import os
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
import logging
import json

from .tenant_context import get_current_tenant, get_user_id

logger = logging.getLogger(__name__)


@dataclass
class UsageStats:
    """使用量統計"""
    user_id: str
    date: date
    
    # API 調用
    api_calls: int = 0
    api_calls_limit: int = 1000
    
    # 帳號
    accounts_count: int = 0
    accounts_limit: int = 3
    
    # 消息
    messages_sent: int = 0
    messages_received: int = 0
    
    # AI 調用
    ai_requests: int = 0
    ai_tokens_used: int = 0
    
    # 存儲
    storage_used_mb: float = 0
    storage_limit_mb: float = 100
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'user_id': self.user_id,
            'date': self.date.isoformat(),
            'api_calls': self.api_calls,
            'api_calls_limit': self.api_calls_limit,
            'api_calls_percentage': round(self.api_calls / max(self.api_calls_limit, 1) * 100, 1),
            'accounts_count': self.accounts_count,
            'accounts_limit': self.accounts_limit,
            'accounts_percentage': round(self.accounts_count / max(self.accounts_limit, 1) * 100, 1),
            'messages_sent': self.messages_sent,
            'messages_received': self.messages_received,
            'ai_requests': self.ai_requests,
            'ai_tokens_used': self.ai_tokens_used,
            'storage_used_mb': self.storage_used_mb,
            'storage_limit_mb': self.storage_limit_mb
        }


class UsageTracker:
    """使用量追蹤器"""
    
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = os.environ.get('DATABASE_PATH', '/app/data/tgmatrix.db')
        self.db_path = db_path
        self._init_db()
    
    def _get_db(self) -> sqlite3.Connection:
        db = sqlite3.connect(self.db_path)
        db.row_factory = sqlite3.Row
        return db
    
    def _init_db(self):
        """初始化數據庫表"""
        db = self._get_db()
        try:
            db.executescript('''
                -- 每日使用量表
                CREATE TABLE IF NOT EXISTS usage_daily (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    date DATE NOT NULL,
                    api_calls INTEGER DEFAULT 0,
                    messages_sent INTEGER DEFAULT 0,
                    messages_received INTEGER DEFAULT 0,
                    ai_requests INTEGER DEFAULT 0,
                    ai_tokens_used INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, date)
                );
                
                -- 使用量事件表（詳細記錄）
                CREATE TABLE IF NOT EXISTS usage_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    event_data TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                -- 配額告警表
                CREATE TABLE IF NOT EXISTS quota_alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    alert_type TEXT NOT NULL,
                    threshold INTEGER,
                    current_value INTEGER,
                    notified BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                
                -- 索引
                CREATE INDEX IF NOT EXISTS idx_usage_daily_user_date ON usage_daily(user_id, date);
                CREATE INDEX IF NOT EXISTS idx_usage_events_user ON usage_events(user_id, created_at);
            ''')
            db.commit()
            logger.info("Usage tracking tables initialized")
        finally:
            db.close()
    
    # ==================== 使用量記錄 ====================
    
    async def track_api_call(self, user_id: str = None, endpoint: str = None):
        """記錄 API 調用"""
        user_id = user_id or get_user_id()
        if not user_id:
            return
        
        today = date.today()
        db = self._get_db()
        try:
            # 更新或插入今日記錄
            db.execute('''
                INSERT INTO usage_daily (user_id, date, api_calls)
                VALUES (?, ?, 1)
                ON CONFLICT(user_id, date) DO UPDATE SET
                    api_calls = api_calls + 1,
                    updated_at = CURRENT_TIMESTAMP
            ''', (user_id, today.isoformat()))
            
            # 記錄事件
            if endpoint:
                db.execute('''
                    INSERT INTO usage_events (user_id, event_type, event_data)
                    VALUES (?, 'api_call', ?)
                ''', (user_id, json.dumps({'endpoint': endpoint})))
            
            db.commit()
        finally:
            db.close()
    
    async def track_message(self, user_id: str = None, direction: str = 'sent'):
        """記錄消息"""
        user_id = user_id or get_user_id()
        if not user_id:
            return
        
        today = date.today()
        column = 'messages_sent' if direction == 'sent' else 'messages_received'
        
        db = self._get_db()
        try:
            db.execute(f'''
                INSERT INTO usage_daily (user_id, date, {column})
                VALUES (?, ?, 1)
                ON CONFLICT(user_id, date) DO UPDATE SET
                    {column} = {column} + 1,
                    updated_at = CURRENT_TIMESTAMP
            ''', (user_id, today.isoformat()))
            db.commit()
        finally:
            db.close()
    
    async def track_ai_request(self, user_id: str = None, tokens: int = 0):
        """記錄 AI 請求"""
        user_id = user_id or get_user_id()
        if not user_id:
            return
        
        today = date.today()
        db = self._get_db()
        try:
            db.execute('''
                INSERT INTO usage_daily (user_id, date, ai_requests, ai_tokens_used)
                VALUES (?, ?, 1, ?)
                ON CONFLICT(user_id, date) DO UPDATE SET
                    ai_requests = ai_requests + 1,
                    ai_tokens_used = ai_tokens_used + ?,
                    updated_at = CURRENT_TIMESTAMP
            ''', (user_id, today.isoformat(), tokens, tokens))
            db.commit()
        finally:
            db.close()
    
    # ==================== 使用量查詢 ====================
    
    async def get_today_usage(self, user_id: str = None) -> UsageStats:
        """獲取今日使用量"""
        user_id = user_id or get_user_id()
        today = date.today()
        
        db = self._get_db()
        try:
            row = db.execute('''
                SELECT * FROM usage_daily WHERE user_id = ? AND date = ?
            ''', (user_id, today.isoformat())).fetchone()
            
            stats = UsageStats(user_id=user_id, date=today)
            if row:
                stats.api_calls = row['api_calls']
                stats.messages_sent = row['messages_sent']
                stats.messages_received = row['messages_received']
                stats.ai_requests = row['ai_requests']
                stats.ai_tokens_used = row['ai_tokens_used']
            
            # 獲取帳號數量
            accounts_count = db.execute('''
                SELECT COUNT(*) as count FROM accounts WHERE user_id = ?
            ''', (user_id,)).fetchone()
            if accounts_count:
                stats.accounts_count = accounts_count['count']
            
            # 獲取用戶配額
            tenant = get_current_tenant()
            if tenant:
                stats.api_calls_limit = tenant.max_api_calls
                stats.accounts_limit = tenant.max_accounts
            
            return stats
        finally:
            db.close()
    
    async def get_usage_history(
        self, 
        user_id: str = None, 
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """獲取使用量歷史"""
        user_id = user_id or get_user_id()
        start_date = date.today() - timedelta(days=days)
        
        db = self._get_db()
        try:
            rows = db.execute('''
                SELECT * FROM usage_daily 
                WHERE user_id = ? AND date >= ?
                ORDER BY date DESC
            ''', (user_id, start_date.isoformat())).fetchall()
            
            return [dict(row) for row in rows]
        finally:
            db.close()
    
    async def get_usage_summary(self, user_id: str = None) -> Dict[str, Any]:
        """獲取使用量摘要"""
        user_id = user_id or get_user_id()
        
        today_stats = await self.get_today_usage(user_id)
        history = await self.get_usage_history(user_id, 30)
        
        # 計算總計
        total_api_calls = sum(h.get('api_calls', 0) for h in history)
        total_messages = sum(h.get('messages_sent', 0) + h.get('messages_received', 0) for h in history)
        total_ai_requests = sum(h.get('ai_requests', 0) for h in history)
        
        return {
            'today': today_stats.to_dict(),
            'last_30_days': {
                'api_calls': total_api_calls,
                'messages': total_messages,
                'ai_requests': total_ai_requests,
                'daily_average': {
                    'api_calls': round(total_api_calls / 30, 1),
                    'messages': round(total_messages / 30, 1)
                }
            },
            'limits': {
                'api_calls': today_stats.api_calls_limit,
                'accounts': today_stats.accounts_limit,
                'api_calls_remaining': max(0, today_stats.api_calls_limit - today_stats.api_calls),
                'accounts_remaining': max(0, today_stats.accounts_limit - today_stats.accounts_count)
            }
        }
    
    # ==================== 配額檢查 ====================
    
    async def check_quota(self, quota_type: str, user_id: str = None) -> Dict[str, Any]:
        """檢查配額"""
        user_id = user_id or get_user_id()
        stats = await self.get_today_usage(user_id)
        
        if quota_type == 'api_calls':
            return {
                'allowed': stats.api_calls < stats.api_calls_limit or stats.api_calls_limit == -1,
                'current': stats.api_calls,
                'limit': stats.api_calls_limit,
                'remaining': max(0, stats.api_calls_limit - stats.api_calls) if stats.api_calls_limit != -1 else -1
            }
        
        elif quota_type == 'accounts':
            return {
                'allowed': stats.accounts_count < stats.accounts_limit,
                'current': stats.accounts_count,
                'limit': stats.accounts_limit,
                'remaining': max(0, stats.accounts_limit - stats.accounts_count)
            }
        
        return {'allowed': True, 'current': 0, 'limit': -1, 'remaining': -1}
    
    async def check_and_alert(self, user_id: str = None):
        """檢查配額並發送告警"""
        user_id = user_id or get_user_id()
        stats = await self.get_today_usage(user_id)
        
        alerts = []
        
        # API 調用達到 80%
        if stats.api_calls_limit > 0:
            usage_pct = stats.api_calls / stats.api_calls_limit * 100
            if usage_pct >= 80:
                alerts.append({
                    'type': 'api_calls_warning',
                    'message': f'API 調用已達到 {usage_pct:.0f}%',
                    'threshold': 80,
                    'current': stats.api_calls
                })
            if usage_pct >= 100:
                alerts.append({
                    'type': 'api_calls_exceeded',
                    'message': 'API 調用已達到限制',
                    'threshold': 100,
                    'current': stats.api_calls
                })
        
        # 帳號達到限制
        if stats.accounts_count >= stats.accounts_limit:
            alerts.append({
                'type': 'accounts_exceeded',
                'message': '帳號數量已達到限制',
                'threshold': stats.accounts_limit,
                'current': stats.accounts_count
            })
        
        # 保存告警
        if alerts:
            db = self._get_db()
            try:
                for alert in alerts:
                    db.execute('''
                        INSERT INTO quota_alerts (user_id, alert_type, threshold, current_value)
                        VALUES (?, ?, ?, ?)
                    ''', (user_id, alert['type'], alert['threshold'], alert['current']))
                db.commit()
            finally:
                db.close()
        
        return alerts


# 全局實例
_usage_tracker: Optional[UsageTracker] = None

def get_usage_tracker() -> UsageTracker:
    """獲取使用量追蹤器實例"""
    global _usage_tracker
    if _usage_tracker is None:
        _usage_tracker = UsageTracker()
    return _usage_tracker
