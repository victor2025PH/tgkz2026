"""
⏰ 智能時機系統 - Smart Timing Service

功能：
1. 最佳回覆時間分析 - 根據用戶活躍時間決定何時回覆
2. 跟進時機判斷 - AI 自動判斷跟進節點
3. 沉默客戶喚醒 - 自動識別並激活沉默客戶
4. 發送節奏控制 - 防止過於頻繁打擾

效果：不回覆超3天的客戶 → 自動發送喚醒消息
"""

import json
import sys
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum

# 導入數據庫
try:
    from database import db
except ImportError:
    db = None


class TimingAction(Enum):
    """時機動作"""
    REPLY_NOW = "reply_now"           # 立即回覆
    DELAY_REPLY = "delay_reply"       # 延遲回覆
    FOLLOW_UP = "follow_up"           # 跟進
    WAKE_UP = "wake_up"               # 喚醒沉默客戶
    COOL_DOWN = "cool_down"           # 冷卻期
    SCHEDULE = "schedule"             # 排程發送


class FollowUpReason(Enum):
    """跟進原因"""
    NO_REPLY = "no_reply"             # 未回覆
    UNFINISHED = "unfinished"         # 對話未完成
    INTEREST_SHOWN = "interest_shown" # 表現興趣
    QUOTE_SENT = "quote_sent"         # 已發報價
    OBJECTION = "objection"           # 提出異議
    COLD = "cold"                     # 冷淡期


@dataclass
class TimingDecision:
    """時機決策"""
    action: TimingAction
    delay_seconds: int = 0
    scheduled_time: Optional[datetime] = None
    reason: str = ""
    message_template: str = ""
    priority: int = 5


@dataclass
class UserActivity:
    """用戶活動模式"""
    user_id: str
    active_hours: List[int] = field(default_factory=list)  # 活躍小時 0-23
    active_days: List[int] = field(default_factory=list)   # 活躍星期 0-6
    avg_response_time: float = 0.0                          # 平均回覆時間（分鐘）
    last_seen: datetime = field(default_factory=datetime.now)
    message_count: int = 0
    silent_days: int = 0


class SmartTimingService:
    """智能時機服務"""
    
    def __init__(self):
        self._user_activities: Dict[str, UserActivity] = {}
        self._pending_followups: List[Dict[str, Any]] = []
        self._initialized = False
        self._running = False
        
        # 時機規則配置
        self.config = {
            # 回覆延遲規則
            'min_reply_delay': 3,       # 最小回覆延遲（秒）- 模擬真人
            'max_reply_delay': 30,      # 最大回覆延遲（秒）
            
            # 跟進規則
            'followup_after_hours': 24,  # 未回覆多少小時後跟進
            'max_followups': 3,          # 最大跟進次數
            'followup_interval_hours': 48,  # 跟進間隔小時數
            
            # 沉默喚醒
            'silent_days_threshold': 3,   # 多少天無互動視為沉默
            'wake_up_enabled': True,      # 是否啟用喚醒
            
            # 冷卻期
            'cooldown_after_messages': 5,  # 連續發送多少條後冷卻
            'cooldown_minutes': 30,        # 冷卻分鐘數
            
            # 活躍時間
            'respect_user_timezone': True,  # 尊重用戶時區
            'quiet_hours_start': 22,        # 安靜時間開始
            'quiet_hours_end': 8,           # 安靜時間結束
        }
        
        # 跟進消息模板
        self._followup_templates = {
            FollowUpReason.NO_REPLY: [
                "Hi，之前發的消息您看到了嗎？有什麼問題可以隨時問我 😊",
                "您好，想確認一下之前的信息您收到了嗎？",
                "Hi，不知道您考慮得怎麼樣了？有什麼顧慮可以跟我說"
            ],
            FollowUpReason.INTEREST_SHOWN: [
                "您好，上次您提到感興趣，想問一下還有其他問題嗎？",
                "Hi，之前您表示想了解更多，我這邊準備了一些資料給您",
                "您好，針對您之前的需求，我有一個方案想跟您分享"
            ],
            FollowUpReason.QUOTE_SENT: [
                "您好，上次發的報價您看過了嗎？有什麼需要調整的嗎？",
                "Hi，想確認一下報價方面還有什麼疑問嗎？",
                "您好，關於之前的報價，如果預算有限我們可以再商量"
            ],
            FollowUpReason.COLD: [
                "好久沒聯繫了，最近還好嗎？😊",
                "Hi，想起您了，不知道之前的需求解決了沒？",
                "您好，我們最近有一些新的優惠活動，想到您可能會感興趣"
            ]
        }
    
    async def initialize(self):
        """初始化"""
        if self._initialized:
            return
        
        try:
            # 創建用戶活動表
            await db.execute("""
                CREATE TABLE IF NOT EXISTS user_activity_patterns (
                    user_id TEXT PRIMARY KEY,
                    active_hours TEXT,
                    active_days TEXT,
                    avg_response_time REAL DEFAULT 0,
                    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    message_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 創建跟進任務表
            await db.execute("""
                CREATE TABLE IF NOT EXISTS followup_tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    scheduled_time TIMESTAMP NOT NULL,
                    message TEXT,
                    priority INTEGER DEFAULT 5,
                    status TEXT DEFAULT 'pending',
                    attempts INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    executed_at TIMESTAMP
                )
            """)
            
            # 創建發送記錄表
            await db.execute("""
                CREATE TABLE IF NOT EXISTS message_send_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    message_type TEXT DEFAULT 'normal'
                )
            """)
            
            # 創建索引
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_followup_status 
                ON followup_tasks(status, scheduled_time)
            """)
            
            self._initialized = True
            print("[SmartTiming] ✓ 智能時機系統已初始化", file=sys.stderr)
            
        except Exception as e:
            print(f"[SmartTiming] ✗ 初始化失敗: {e}", file=sys.stderr)
    
    async def decide_reply_timing(
        self,
        user_id: str,
        message: str,
        is_first_message: bool = False
    ) -> TimingDecision:
        """決定回覆時機"""
        await self.initialize()
        
        # 1. 檢查是否在安靜時間
        if self._is_quiet_hours():
            return TimingDecision(
                action=TimingAction.SCHEDULE,
                scheduled_time=self._next_active_time(),
                reason="目前是安靜時間，排程到明天發送"
            )
        
        # 2. 檢查冷卻期
        cooldown = await self._check_cooldown(user_id)
        if cooldown > 0:
            return TimingDecision(
                action=TimingAction.COOL_DOWN,
                delay_seconds=cooldown,
                reason=f"發送過於頻繁，冷卻 {cooldown} 秒"
            )
        
        # 3. 計算智能延遲
        delay = self._calculate_smart_delay(message, is_first_message)
        
        # 4. 記錄發送
        await self._log_send(user_id)
        
        if delay > 0:
            return TimingDecision(
                action=TimingAction.DELAY_REPLY,
                delay_seconds=delay,
                reason=f"模擬真人打字，延遲 {delay} 秒"
            )
        
        return TimingDecision(
            action=TimingAction.REPLY_NOW,
            reason="立即回覆"
        )
    
    def _is_quiet_hours(self) -> bool:
        """檢查是否是安靜時間"""
        current_hour = datetime.now().hour
        start = self.config['quiet_hours_start']
        end = self.config['quiet_hours_end']
        
        if start > end:
            # 跨夜（如 22-8）
            return current_hour >= start or current_hour < end
        else:
            return start <= current_hour < end
    
    def _next_active_time(self) -> datetime:
        """計算下一個活躍時間"""
        now = datetime.now()
        end_hour = self.config['quiet_hours_end']
        
        if now.hour < end_hour:
            # 今天的活躍時間
            return now.replace(hour=end_hour, minute=0, second=0, microsecond=0)
        else:
            # 明天的活躍時間
            tomorrow = now + timedelta(days=1)
            return tomorrow.replace(hour=end_hour, minute=0, second=0, microsecond=0)
    
    async def _check_cooldown(self, user_id: str) -> int:
        """檢查冷卻期，返回剩餘秒數"""
        try:
            # 查詢最近發送記錄
            cooldown_minutes = self.config['cooldown_minutes']
            max_messages = self.config['cooldown_after_messages']
            
            since = datetime.now() - timedelta(minutes=cooldown_minutes)
            
            result = await db.fetch_one("""
                SELECT COUNT(*) as count, MAX(sent_at) as last_sent
                FROM message_send_log
                WHERE user_id = ? AND sent_at > ?
            """, (user_id, since.isoformat()))
            
            if result and result.get('count', 0) >= max_messages:
                last_sent = result.get('last_sent')
                if last_sent:
                    last_time = datetime.fromisoformat(last_sent)
                    cooldown_end = last_time + timedelta(minutes=cooldown_minutes)
                    remaining = (cooldown_end - datetime.now()).total_seconds()
                    return max(0, int(remaining))
            
            return 0
            
        except Exception as e:
            print(f"[SmartTiming] 檢查冷卻失敗: {e}", file=sys.stderr)
            return 0
    
    def _calculate_smart_delay(self, message: str, is_first_message: bool) -> int:
        """計算智能延遲"""
        import random
        
        base_delay = self.config['min_reply_delay']
        max_delay = self.config['max_reply_delay']
        
        # 首條消息延遲更長（模擬看到消息）
        if is_first_message:
            base_delay += 5
        
        # 根據消息長度調整（長消息需要更多思考時間）
        msg_len = len(message)
        if msg_len > 100:
            base_delay += 5
        elif msg_len > 50:
            base_delay += 3
        
        # 添加隨機因素
        delay = base_delay + random.randint(0, 10)
        
        return min(delay, max_delay)
    
    async def _log_send(self, user_id: str, message_type: str = 'normal'):
        """記錄發送"""
        try:
            await db.execute("""
                INSERT INTO message_send_log (user_id, message_type)
                VALUES (?, ?)
            """, (user_id, message_type))
        except Exception as e:
            print(f"[SmartTiming] 記錄發送失敗: {e}", file=sys.stderr)
    
    async def record_user_activity(
        self,
        user_id: str,
        message_time: datetime = None
    ):
        """記錄用戶活動"""
        await self.initialize()
        
        if message_time is None:
            message_time = datetime.now()
        
        try:
            # 獲取現有記錄
            existing = await db.fetch_one("""
                SELECT * FROM user_activity_patterns WHERE user_id = ?
            """, (user_id,))
            
            hour = message_time.hour
            day = message_time.weekday()
            
            if existing:
                active_hours = json.loads(existing.get('active_hours', '[]'))
                active_days = json.loads(existing.get('active_days', '[]'))
                
                if hour not in active_hours:
                    active_hours.append(hour)
                if day not in active_days:
                    active_days.append(day)
                
                msg_count = existing.get('message_count', 0) + 1
                
                await db.execute("""
                    UPDATE user_activity_patterns SET
                        active_hours = ?,
                        active_days = ?,
                        message_count = ?,
                        last_seen = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                """, (
                    json.dumps(active_hours),
                    json.dumps(active_days),
                    msg_count,
                    message_time.isoformat(),
                    user_id
                ))
            else:
                await db.execute("""
                    INSERT INTO user_activity_patterns
                    (user_id, active_hours, active_days, message_count, last_seen)
                    VALUES (?, ?, ?, 1, ?)
                """, (
                    user_id,
                    json.dumps([hour]),
                    json.dumps([day]),
                    message_time.isoformat()
                ))
                
        except Exception as e:
            print(f"[SmartTiming] 記錄活動失敗: {e}", file=sys.stderr)
    
    async def schedule_followup(
        self,
        user_id: str,
        reason: FollowUpReason,
        delay_hours: int = None,
        custom_message: str = None
    ):
        """排程跟進任務"""
        await self.initialize()
        
        if delay_hours is None:
            delay_hours = self.config['followup_after_hours']
        
        scheduled_time = datetime.now() + timedelta(hours=delay_hours)
        
        # 選擇消息模板
        if custom_message:
            message = custom_message
        else:
            templates = self._followup_templates.get(reason, [])
            import random
            message = random.choice(templates) if templates else "Hi，想跟您確認一下之前的情況"
        
        try:
            await db.execute("""
                INSERT INTO followup_tasks
                (user_id, reason, scheduled_time, message, priority)
                VALUES (?, ?, ?, ?, ?)
            """, (
                user_id,
                reason.value,
                scheduled_time.isoformat(),
                message,
                5
            ))
            
            print(f"[SmartTiming] 已排程跟進: user={user_id}, reason={reason.value}, time={scheduled_time}", file=sys.stderr)
            
        except Exception as e:
            print(f"[SmartTiming] 排程跟進失敗: {e}", file=sys.stderr)
    
    async def get_pending_followups(self) -> List[Dict[str, Any]]:
        """獲取待執行的跟進任務"""
        await self.initialize()
        
        try:
            now = datetime.now().isoformat()
            
            tasks = await db.fetch_all("""
                SELECT * FROM followup_tasks
                WHERE status = 'pending' AND scheduled_time <= ?
                ORDER BY priority DESC, scheduled_time ASC
                LIMIT 50
            """, (now,))
            
            return [dict(t) for t in tasks] if tasks else []
            
        except Exception as e:
            print(f"[SmartTiming] 獲取跟進任務失敗: {e}", file=sys.stderr)
            return []
    
    async def mark_followup_done(self, task_id: int, success: bool = True):
        """標記跟進任務完成"""
        try:
            status = 'completed' if success else 'failed'
            
            await db.execute("""
                UPDATE followup_tasks SET
                    status = ?,
                    executed_at = CURRENT_TIMESTAMP,
                    attempts = attempts + 1
                WHERE id = ?
            """, (status, task_id))
            
        except Exception as e:
            print(f"[SmartTiming] 更新任務狀態失敗: {e}", file=sys.stderr)
    
    async def get_silent_customers(
        self,
        days: int = None
    ) -> List[Dict[str, Any]]:
        """獲取沉默客戶列表"""
        await self.initialize()
        
        if days is None:
            days = self.config['silent_days_threshold']
        
        try:
            threshold = (datetime.now() - timedelta(days=days)).isoformat()
            
            customers = await db.fetch_all("""
                SELECT u.user_id, u.last_seen, u.message_count,
                       cp.intent_grade, cp.intent_score
                FROM user_activity_patterns u
                LEFT JOIN customer_profiles cp ON u.user_id = cp.user_id
                WHERE u.last_seen < ?
                ORDER BY cp.intent_score DESC, u.last_seen DESC
                LIMIT 100
            """, (threshold,))
            
            return [dict(c) for c in customers] if customers else []
            
        except Exception as e:
            print(f"[SmartTiming] 獲取沉默客戶失敗: {e}", file=sys.stderr)
            return []
    
    async def auto_schedule_wakeups(self) -> int:
        """自動排程喚醒任務"""
        if not self.config['wake_up_enabled']:
            return 0
        
        silent_customers = await self.get_silent_customers()
        scheduled = 0
        
        for customer in silent_customers:
            user_id = customer['user_id']
            intent_score = customer.get('intent_score', 0) or 0
            
            # 只喚醒有一定意向的客戶
            if intent_score >= 30:
                await self.schedule_followup(
                    user_id,
                    FollowUpReason.COLD,
                    delay_hours=0  # 立即
                )
                scheduled += 1
        
        return scheduled
    
    async def get_best_send_time(self, user_id: str) -> Optional[datetime]:
        """獲取用戶最佳發送時間"""
        await self.initialize()
        
        try:
            pattern = await db.fetch_one("""
                SELECT * FROM user_activity_patterns WHERE user_id = ?
            """, (user_id,))
            
            if not pattern:
                return None
            
            active_hours = json.loads(pattern.get('active_hours', '[]'))
            
            if not active_hours:
                return None
            
            # 找到最常用的小時
            from collections import Counter
            most_common_hour = Counter(active_hours).most_common(1)[0][0]
            
            now = datetime.now()
            best_time = now.replace(hour=most_common_hour, minute=0, second=0, microsecond=0)
            
            if best_time <= now:
                best_time += timedelta(days=1)
            
            return best_time
            
        except Exception as e:
            print(f"[SmartTiming] 獲取最佳時間失敗: {e}", file=sys.stderr)
            return None
    
    async def start_followup_processor(self):
        """啟動跟進處理器"""
        self._running = True
        print("[SmartTiming] 跟進處理器已啟動", file=sys.stderr)
        
        while self._running:
            try:
                # 獲取待執行任務
                tasks = await self.get_pending_followups()
                
                for task in tasks:
                    # 發送跟進消息
                    # 這裡需要與消息發送服務整合
                    print(f"[SmartTiming] 執行跟進: user={task['user_id']}, msg={task['message'][:30]}...", file=sys.stderr)
                    await self.mark_followup_done(task['id'], True)
                
                # 每分鐘檢查一次
                await asyncio.sleep(60)
                
            except Exception as e:
                print(f"[SmartTiming] 處理器錯誤: {e}", file=sys.stderr)
                await asyncio.sleep(60)
    
    def stop_followup_processor(self):
        """停止跟進處理器"""
        self._running = False
        print("[SmartTiming] 跟進處理器已停止", file=sys.stderr)


# 單例
_timing_service: Optional[SmartTimingService] = None

def get_timing_service() -> SmartTimingService:
    """獲取時機服務單例"""
    global _timing_service
    if _timing_service is None:
        _timing_service = SmartTimingService()
    return _timing_service


# 測試
if __name__ == "__main__":
    import asyncio
    
    async def test():
        service = get_timing_service()
        await service.initialize()
        
        user_id = "test_user_789"
        
        # 測試回覆時機
        decision = await service.decide_reply_timing(user_id, "你好", True)
        print(f"回覆時機: {decision.action.value}, 延遲: {decision.delay_seconds}s")
        
        # 記錄活動
        await service.record_user_activity(user_id)
        
        # 排程跟進
        await service.schedule_followup(user_id, FollowUpReason.INTEREST_SHOWN, 1)
        
        # 獲取沉默客戶
        silent = await service.get_silent_customers(1)
        print(f"沉默客戶: {len(silent)} 個")
        
        # 獲取待跟進
        tasks = await service.get_pending_followups()
        print(f"待跟進任務: {len(tasks)} 個")
    
    asyncio.run(test())
