"""
🧠 對話記憶系統 - Conversation Memory System

功能：
1. 短期記憶：跨對話記憶（7天內）
2. 長期記憶：客戶偏好/需求永久存儲
3. 記憶檢索：AI 自動回憶相關歷史
4. 記憶摘要：自動生成對話摘要

效果：AI 能說「上次您提到想了解XX，現在有新方案...」
"""

import json
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from enum import Enum

# 導入數據庫
try:
    from database import db
except ImportError:
    db = None


class MemoryType(Enum):
    """記憶類型"""
    SHORT_TERM = "short_term"      # 短期記憶（7天）
    LONG_TERM = "long_term"        # 長期記憶（永久）
    PREFERENCE = "preference"       # 偏好記憶
    INTENT = "intent"              # 意圖記憶
    TOPIC = "topic"                # 話題記憶
    ACTION = "action"              # 🆕 操作記憶（群邀請、消息發送等）
    GROUP_CONTEXT = "group_context"  # 🆕 群組上下文


class MemoryImportance(Enum):
    """記憶重要性"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class Memory:
    """單條記憶"""
    id: str
    user_id: str
    memory_type: MemoryType
    content: str
    importance: MemoryImportance
    keywords: List[str] = field(default_factory=list)
    context: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    last_accessed: datetime = field(default_factory=datetime.now)
    access_count: int = 0
    expires_at: Optional[datetime] = None


@dataclass
class ConversationSummary:
    """對話摘要"""
    user_id: str
    summary: str
    key_points: List[str]
    unresolved_intents: List[str]
    customer_preferences: Dict[str, Any]
    last_topic: str
    sentiment_trend: str
    created_at: datetime = field(default_factory=datetime.now)


class ConversationMemoryService:
    """對話記憶服務"""
    
    def __init__(self):
        self._memories: Dict[str, List[Memory]] = {}  # user_id -> memories
        self._summaries: Dict[str, ConversationSummary] = {}
        self._initialized = False
        
        # 記憶提取關鍵詞
        self._preference_keywords = [
            '喜歡', '不喜歡', '偏好', '習慣', '經常', '總是', '從不',
            '想要', '需要', '希望', '期望', '關心', '在意', '重視'
        ]
        
        self._intent_keywords = [
            '想了解', '想知道', '請問', '怎麼', '如何', '什麼是',
            '能不能', '可以嗎', '有沒有', '多少錢', '價格', '費用'
        ]
        
        self._topic_keywords = {
            'price': ['價格', '費用', '多少錢', '報價', '優惠', '折扣'],
            'product': ['產品', '服務', '功能', '特點', '優勢'],
            'payment': ['支付', '付款', '收款', 'U', 'USDT', '匯款'],
            'time': ['多久', '時間', '速度', '多快', '什麼時候'],
            'trust': ['安全', '可靠', '保證', '保障', '信任'],
            'comparison': ['對比', '比較', '區別', '不同', '哪個好']
        }
    
    async def initialize(self):
        """初始化，創建數據表"""
        if self._initialized:
            return
        
        try:
            # 創建記憶表
            await db.execute("""
                CREATE TABLE IF NOT EXISTS conversation_memories (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    memory_type TEXT NOT NULL,
                    content TEXT NOT NULL,
                    importance INTEGER DEFAULT 2,
                    keywords TEXT,
                    context TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    access_count INTEGER DEFAULT 0,
                    expires_at TIMESTAMP
                )
            """)
            
            # 創建摘要表
            await db.execute("""
                CREATE TABLE IF NOT EXISTS conversation_summaries (
                    user_id TEXT PRIMARY KEY,
                    summary TEXT,
                    key_points TEXT,
                    unresolved_intents TEXT,
                    customer_preferences TEXT,
                    last_topic TEXT,
                    sentiment_trend TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 🔧 Phase 8: 確保舊表有新增的列（兼容現有數據）
            for col_name, col_def in [
                ('unresolved_intents', "TEXT DEFAULT '[]'"),
                ('customer_preferences', "TEXT DEFAULT '{}'"),
                ('last_topic', "TEXT DEFAULT 'general'"),
                ('sentiment_trend', "TEXT DEFAULT 'neutral'"),
                ('updated_at', "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
            ]:
                try:
                    await db.execute(f"""
                        ALTER TABLE conversation_summaries ADD COLUMN {col_name} {col_def}
                    """)
                    print(f"[ConversationMemory] ✓ 添加列 conversation_summaries.{col_name}", file=sys.stderr)
                except Exception as col_err:
                    if 'duplicate column' not in str(col_err).lower():
                        pass  # 列已存在或其他非致命錯誤
            
            # 創建索引
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_memories_user_id 
                ON conversation_memories(user_id)
            """)
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_memories_type 
                ON conversation_memories(memory_type)
            """)
            
            self._initialized = True
            print("[ConversationMemory] ✓ 記憶系統已初始化", file=sys.stderr)
            
        except Exception as e:
            print(f"[ConversationMemory] ✗ 初始化失敗: {e}", file=sys.stderr)
    
    async def extract_and_store_memories(
        self, 
        user_id: str, 
        message: str, 
        ai_response: str,
        context: Dict[str, Any] = None
    ) -> List[Memory]:
        """從對話中提取並存儲記憶"""
        await self.initialize()
        
        memories = []
        
        # 1. 提取偏好記憶
        preference_memory = self._extract_preference(user_id, message)
        if preference_memory:
            memories.append(preference_memory)
        
        # 2. 提取意圖記憶
        intent_memory = self._extract_intent(user_id, message)
        if intent_memory:
            memories.append(intent_memory)
        
        # 3. 提取話題記憶
        topic_memory = self._extract_topic(user_id, message)
        if topic_memory:
            memories.append(topic_memory)
        
        # 4. 提取關鍵信息（價格、時間等具體信息）
        key_info = self._extract_key_info(user_id, message, ai_response)
        if key_info:
            memories.append(key_info)
        
        # 存儲到數據庫
        for memory in memories:
            await self._save_memory(memory)
        
        # 更新摘要
        await self._update_summary(user_id, message, ai_response, memories)
        
        return memories
    
    def _extract_preference(self, user_id: str, message: str) -> Optional[Memory]:
        """提取偏好記憶"""
        for keyword in self._preference_keywords:
            if keyword in message:
                return Memory(
                    id=f"pref_{user_id}_{datetime.now().timestamp()}",
                    user_id=user_id,
                    memory_type=MemoryType.PREFERENCE,
                    content=message,
                    importance=MemoryImportance.HIGH,
                    keywords=[keyword],
                    context={'trigger_keyword': keyword}
                )
        return None
    
    def _extract_intent(self, user_id: str, message: str) -> Optional[Memory]:
        """提取意圖記憶"""
        for keyword in self._intent_keywords:
            if keyword in message:
                return Memory(
                    id=f"intent_{user_id}_{datetime.now().timestamp()}",
                    user_id=user_id,
                    memory_type=MemoryType.INTENT,
                    content=message,
                    importance=MemoryImportance.MEDIUM,
                    keywords=[keyword],
                    context={'trigger_keyword': keyword},
                    expires_at=datetime.now() + timedelta(days=7)  # 7天後過期
                )
        return None
    
    def _extract_topic(self, user_id: str, message: str) -> Optional[Memory]:
        """提取話題記憶"""
        for topic, keywords in self._topic_keywords.items():
            for keyword in keywords:
                if keyword in message:
                    return Memory(
                        id=f"topic_{user_id}_{datetime.now().timestamp()}",
                        user_id=user_id,
                        memory_type=MemoryType.TOPIC,
                        content=message,
                        importance=MemoryImportance.MEDIUM,
                        keywords=[topic, keyword],
                        context={'topic': topic, 'keyword': keyword},
                        expires_at=datetime.now() + timedelta(days=7)
                    )
        return None
    
    def _extract_key_info(
        self, 
        user_id: str, 
        message: str, 
        ai_response: str
    ) -> Optional[Memory]:
        """提取關鍵信息"""
        key_patterns = {
            'budget': ['預算', '最多', '不超過', '左右'],
            'timeline': ['什麼時候', '多久', '急', '趕'],
            'requirement': ['需要', '必須', '一定要', '關鍵是']
        }
        
        for info_type, patterns in key_patterns.items():
            for pattern in patterns:
                if pattern in message:
                    return Memory(
                        id=f"info_{user_id}_{datetime.now().timestamp()}",
                        user_id=user_id,
                        memory_type=MemoryType.LONG_TERM,
                        content=f"客戶提到: {message}",
                        importance=MemoryImportance.HIGH,
                        keywords=[info_type, pattern],
                        context={
                            'info_type': info_type,
                            'original_message': message,
                            'ai_response': ai_response[:200]
                        }
                    )
        return None
    
    async def _save_memory(self, memory: Memory):
        """保存記憶到數據庫"""
        try:
            await db.execute("""
                INSERT OR REPLACE INTO conversation_memories 
                (id, user_id, memory_type, content, importance, keywords, context, 
                 created_at, last_accessed, access_count, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                memory.id,
                memory.user_id,
                memory.memory_type.value,
                memory.content,
                memory.importance.value,
                json.dumps(memory.keywords),
                json.dumps(memory.context),
                memory.created_at.isoformat(),
                memory.last_accessed.isoformat(),
                memory.access_count,
                memory.expires_at.isoformat() if memory.expires_at else None
            ))
        except Exception as e:
            print(f"[ConversationMemory] 保存記憶失敗: {e}", file=sys.stderr)
    
    async def _update_summary(
        self, 
        user_id: str, 
        message: str, 
        ai_response: str,
        new_memories: List[Memory]
    ):
        """更新對話摘要"""
        try:
            # 獲取現有摘要
            existing = await db.fetch_one(
                "SELECT * FROM conversation_summaries WHERE user_id = ?",
                (user_id,)
            )
            
            if existing:
                key_points = json.loads(existing.get('key_points', '[]'))
                unresolved = json.loads(existing.get('unresolved_intents', '[]'))
                preferences = json.loads(existing.get('customer_preferences', '{}'))
            else:
                key_points = []
                unresolved = []
                preferences = {}
            
            # 更新關鍵點
            for memory in new_memories:
                if memory.memory_type == MemoryType.PREFERENCE:
                    preferences[memory.keywords[0] if memory.keywords else 'general'] = memory.content
                elif memory.memory_type == MemoryType.INTENT:
                    if memory.content not in unresolved:
                        unresolved.append(memory.content)
                elif memory.memory_type == MemoryType.TOPIC:
                    topic = memory.context.get('topic', 'general')
                    key_points.append(f"[{topic}] {memory.content[:50]}")
            
            # 保持列表長度
            key_points = key_points[-10:]
            unresolved = unresolved[-5:]
            
            # 確定最後話題
            last_topic = 'general'
            for memory in new_memories:
                if memory.memory_type == MemoryType.TOPIC:
                    last_topic = memory.context.get('topic', 'general')
                    break
            
            # 保存摘要
            await db.execute("""
                INSERT OR REPLACE INTO conversation_summaries
                (user_id, summary, key_points, unresolved_intents, 
                 customer_preferences, last_topic, sentiment_trend, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (
                user_id,
                f"最近討論: {message[:100]}",
                json.dumps(key_points),
                json.dumps(unresolved),
                json.dumps(preferences),
                last_topic,
                'neutral'
            ))
            
        except Exception as e:
            print(f"[ConversationMemory] 更新摘要失敗: {e}", file=sys.stderr)
    
    async def recall_relevant_memories(
        self, 
        user_id: str, 
        current_message: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """回憶相關記憶"""
        await self.initialize()
        
        try:
            # 1. 清理過期記憶
            await db.execute("""
                DELETE FROM conversation_memories 
                WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP
            """)
            
            # 2. 提取當前消息的關鍵詞
            current_keywords = []
            for topic, keywords in self._topic_keywords.items():
                for kw in keywords:
                    if kw in current_message:
                        current_keywords.append(topic)
                        current_keywords.append(kw)
            
            # 3. 查詢相關記憶
            memories = await db.fetch_all("""
                SELECT * FROM conversation_memories 
                WHERE user_id = ?
                ORDER BY importance DESC, last_accessed DESC
                LIMIT ?
            """, (user_id, limit * 2))
            
            # 4. 根據相關性排序
            scored_memories = []
            for mem in memories:
                score = mem.get('importance', 2)
                mem_keywords = json.loads(mem.get('keywords', '[]'))
                
                # 關鍵詞匹配加分
                for kw in mem_keywords:
                    if kw in current_keywords or kw in current_message:
                        score += 2
                
                # 最近訪問加分
                last_accessed = mem.get('last_accessed')
                if last_accessed:
                    try:
                        days_ago = (datetime.now() - datetime.fromisoformat(last_accessed)).days
                        if days_ago < 1:
                            score += 1
                    except:
                        pass
                
                scored_memories.append((score, mem))
            
            # 5. 排序並返回
            scored_memories.sort(key=lambda x: x[0], reverse=True)
            result = []
            
            for score, mem in scored_memories[:limit]:
                # 更新訪問記錄
                await db.execute("""
                    UPDATE conversation_memories 
                    SET last_accessed = CURRENT_TIMESTAMP, access_count = access_count + 1
                    WHERE id = ?
                """, (mem['id'],))
                
                result.append({
                    'id': mem['id'],
                    'type': mem['memory_type'],
                    'content': mem['content'],
                    'importance': mem['importance'],
                    'keywords': json.loads(mem.get('keywords', '[]')),
                    'context': json.loads(mem.get('context', '{}')),
                    'relevance_score': score
                })
            
            return result
            
        except Exception as e:
            print(f"[ConversationMemory] 回憶失敗: {e}", file=sys.stderr)
            return []
    
    async def get_conversation_summary(self, user_id: str) -> Optional[Dict[str, Any]]:
        """獲取對話摘要"""
        await self.initialize()
        
        try:
            summary = await db.fetch_one(
                "SELECT * FROM conversation_summaries WHERE user_id = ?",
                (user_id,)
            )
            
            if summary:
                return {
                    'user_id': summary['user_id'],
                    'summary': summary.get('summary', ''),
                    'key_points': json.loads(summary.get('key_points', '[]')),
                    'unresolved_intents': json.loads(summary.get('unresolved_intents', '[]')),
                    'customer_preferences': json.loads(summary.get('customer_preferences', '{}')),
                    'last_topic': summary.get('last_topic', 'general'),
                    'sentiment_trend': summary.get('sentiment_trend', 'neutral')
                }
            return None
            
        except Exception as e:
            print(f"[ConversationMemory] 獲取摘要失敗: {e}", file=sys.stderr)
            return None
    
    async def generate_memory_prompt(self, user_id: str, current_message: str) -> str:
        """生成記憶增強 Prompt"""
        memories = await self.recall_relevant_memories(user_id, current_message)
        summary = await self.get_conversation_summary(user_id)
        
        if not memories and not summary:
            return ""
        
        prompt_parts = ["【客戶歷史記憶】"]
        
        # 添加摘要信息
        if summary:
            if summary.get('unresolved_intents'):
                prompt_parts.append(f"- 未解決的問題: {', '.join(summary['unresolved_intents'][:3])}")
            if summary.get('customer_preferences'):
                prefs = list(summary['customer_preferences'].values())[:2]
                prompt_parts.append(f"- 客戶偏好: {'; '.join(prefs)}")
            if summary.get('last_topic') != 'general':
                prompt_parts.append(f"- 上次話題: {summary['last_topic']}")
        
        # 添加相關記憶
        if memories:
            prompt_parts.append("\n【相關歷史對話】")
            for mem in memories[:3]:
                prompt_parts.append(f"- {mem['content'][:80]}...")
        
        prompt_parts.append("\n請根據以上客戶歷史信息，提供更個性化的回覆。")
        
        return "\n".join(prompt_parts)
    
    async def mark_intent_resolved(self, user_id: str, intent_content: str):
        """標記意圖已解決"""
        try:
            summary = await db.fetch_one(
                "SELECT * FROM conversation_summaries WHERE user_id = ?",
                (user_id,)
            )
            
            if summary:
                unresolved = json.loads(summary.get('unresolved_intents', '[]'))
                unresolved = [i for i in unresolved if intent_content not in i]
                
                await db.execute("""
                    UPDATE conversation_summaries 
                    SET unresolved_intents = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                """, (json.dumps(unresolved), user_id))
                
        except Exception as e:
            print(f"[ConversationMemory] 標記意圖失敗: {e}", file=sys.stderr)
    
    # ==================== 🆕 P0 優化: 操作上下文記錄 ====================
    
    async def record_action(
        self,
        user_id: str,
        action_type: str,
        action_details: Dict[str, Any],
        performed_by: str = None
    ) -> bool:
        """
        🆕 記錄對用戶執行的操作（如群邀請）
        
        Args:
            user_id: 目標用戶 ID
            action_type: 操作類型 (group_invite, message_sent, group_created, etc.)
            action_details: 操作詳情
            performed_by: 執行操作的帳號
        """
        await self.initialize()
        
        try:
            import uuid
            memory_id = f"action_{uuid.uuid4().hex[:12]}"
            
            # 構建操作描述
            action_descriptions = {
                'group_invite': f"將用戶邀請到群組「{action_details.get('group_name', '')}」",
                'group_invite_link': f"發送了群組「{action_details.get('group_name', '')}」的邀請連結",
                'group_created': f"創建了群組「{action_details.get('group_name', '')}」",
                'member_added': f"將用戶添加到群組",
                'welcome_message': f"在群組中發送了歡迎消息",
                'private_message': f"發送了私聊消息"
            }
            
            content = action_descriptions.get(action_type, f"執行了 {action_type} 操作")
            
            # 添加詳細信息到 context
            context = {
                'action_type': action_type,
                'details': action_details,
                'performed_by': performed_by,
                'timestamp': datetime.now().isoformat()
            }
            
            # 存儲為 ACTION 類型記憶
            await db.execute("""
                INSERT INTO conversation_memories 
                (id, user_id, memory_type, content, importance, keywords, context, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                memory_id,
                str(user_id),
                MemoryType.ACTION.value,
                content,
                MemoryImportance.HIGH.value,
                json.dumps([action_type, 'action', 'operation']),
                json.dumps(context),
                (datetime.now() + timedelta(days=7)).isoformat()  # 7天後過期
            ))
            
            print(f"[ConversationMemory] ✓ 記錄操作: {action_type} for user {user_id}", file=sys.stderr)
            return True
            
        except Exception as e:
            print(f"[ConversationMemory] ✗ 記錄操作失敗: {e}", file=sys.stderr)
            return False
    
    async def get_recent_actions(
        self,
        user_id: str,
        limit: int = 5,
        action_types: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        🆕 獲取對用戶執行的最近操作
        
        Args:
            user_id: 用戶 ID
            limit: 返回數量
            action_types: 可選，過濾特定操作類型
        
        Returns:
            最近操作列表
        """
        await self.initialize()
        
        try:
            query = """
                SELECT * FROM conversation_memories 
                WHERE user_id = ? AND memory_type = ?
                ORDER BY created_at DESC
                LIMIT ?
            """
            
            memories = await db.fetch_all(query, (str(user_id), MemoryType.ACTION.value, limit))
            
            actions = []
            for mem in memories:
                context = json.loads(mem.get('context', '{}'))
                
                # 過濾操作類型
                if action_types and context.get('action_type') not in action_types:
                    continue
                
                actions.append({
                    'id': mem['id'],
                    'action_type': context.get('action_type', 'unknown'),
                    'content': mem['content'],
                    'details': context.get('details', {}),
                    'performed_by': context.get('performed_by'),
                    'timestamp': context.get('timestamp'),
                    'created_at': mem.get('created_at')
                })
            
            return actions
            
        except Exception as e:
            print(f"[ConversationMemory] 獲取操作記錄失敗: {e}", file=sys.stderr)
            return []
    
    async def generate_action_context_prompt(self, user_id: str) -> str:
        """
        🆕 生成操作上下文 Prompt（用於 AI 知道最近對用戶做了什麼）
        
        Returns:
            操作上下文描述，可注入 AI Prompt
        """
        actions = await self.get_recent_actions(user_id, limit=5)
        
        if not actions:
            return ""
        
        prompt_parts = ["【最近操作記錄】"]
        prompt_parts.append("以下是系統最近對這位用戶執行的操作，請在回覆時考慮這些上下文：")
        
        for action in actions:
            timestamp = action.get('timestamp', '')
            if timestamp:
                try:
                    dt = datetime.fromisoformat(timestamp)
                    time_ago = datetime.now() - dt
                    if time_ago.total_seconds() < 60:
                        time_str = "剛才"
                    elif time_ago.total_seconds() < 3600:
                        time_str = f"{int(time_ago.total_seconds() / 60)} 分鐘前"
                    elif time_ago.total_seconds() < 86400:
                        time_str = f"{int(time_ago.total_seconds() / 3600)} 小時前"
                    else:
                        time_str = f"{time_ago.days} 天前"
                except:
                    time_str = "最近"
            else:
                time_str = "最近"
            
            details = action.get('details', {})
            action_type = action.get('action_type', '')
            
            # 生成詳細描述
            if action_type == 'group_invite':
                group_name = details.get('group_name', '專屬服務群')
                prompt_parts.append(f"- {time_str}：將用戶邀請到了群組「{group_name}」")
            elif action_type == 'group_invite_link':
                group_name = details.get('group_name', '專屬服務群')
                prompt_parts.append(f"- {time_str}：發送了群組「{group_name}」的邀請連結給用戶")
            elif action_type == 'group_created':
                group_name = details.get('group_name', '專屬服務群')
                prompt_parts.append(f"- {time_str}：為用戶創建了專屬群組「{group_name}」")
            else:
                prompt_parts.append(f"- {time_str}：{action.get('content', '')}")
        
        # 添加重要提示
        prompt_parts.append("")
        prompt_parts.append("【重要提示】")
        prompt_parts.append("- 如果用戶問「你拉我進群了嗎」或類似問題，應根據上述記錄如實回答")
        prompt_parts.append("- 如果確實邀請了用戶入群，應說「是的，我們為您創建了專屬服務群，方便為您提供更好的服務！」")
        prompt_parts.append("- 可以引導用戶到群內交流，說「歡迎到群裡聊，那裡有更多專家為您服務」")
        
        return "\n".join(prompt_parts)
    
    # ==================== 🆕 P2-2: 統一對話策略管理 ====================
    
    async def get_unified_strategy_prompt(self, user_id: str, context_type: str = 'private') -> str:
        """
        🆕 獲取統一對話策略 Prompt
        
        根據用戶當前狀態（是否在群組協作中）生成統一的對話策略
        
        Args:
            user_id: 用戶 ID
            context_type: 'private' 或 'group'
        
        Returns:
            策略 Prompt
        """
        await self.initialize()
        
        prompt_parts = []
        
        # 獲取最近的群組相關操作
        group_actions = await self.get_recent_actions(
            user_id, 
            limit=3, 
            action_types=['group_invite', 'group_invite_link', 'group_created']
        )
        
        if group_actions:
            # 用戶正在群組協作流程中
            latest_action = group_actions[0]
            group_name = latest_action.get('details', {}).get('group_name', 'VIP服務群')
            
            prompt_parts.append("【當前協作狀態】")
            prompt_parts.append(f"用戶已加入/被邀請到「{group_name}」群組協作")
            prompt_parts.append("")
            
            if context_type == 'private':
                # 私聊中的策略
                prompt_parts.append("【私聊策略】")
                prompt_parts.append("- 這是私聊，但用戶已在群組協作中")
                prompt_parts.append("- 可以適當引導用戶到群內交流")
                prompt_parts.append("- 說「群裡有更多專家可以幫助您，歡迎到群裡聊」")
                prompt_parts.append("- 但如果用戶私聊有具體問題，也要認真回答")
                prompt_parts.append("- 私聊適合處理敏感問題（如價格談判、個人信息）")
            else:
                # 群聊中的策略
                prompt_parts.append("【群聊策略】")
                prompt_parts.append("- 這是群聊，多個角色正在協作服務客戶")
                prompt_parts.append("- 回覆簡短，留空間給其他角色")
                prompt_parts.append("- 可以 @其他角色 來配合")
                prompt_parts.append("- 群聊適合展示團隊實力和活躍氛圍")
                prompt_parts.append("- 敏感話題（如具體價格）可建議私聊詳談")
            
            prompt_parts.append("")
            prompt_parts.append("【協調原則】")
            prompt_parts.append("1. 私聊和群聊信息要一致，不能自相矛盾")
            prompt_parts.append("2. 群聊中提到的內容，私聊中要知曉")
            prompt_parts.append("3. 私聊中承諾的事，群聊中要跟進")
        
        return "\n".join(prompt_parts) if prompt_parts else ""


# 單例
_memory_service: Optional[ConversationMemoryService] = None

def get_memory_service() -> ConversationMemoryService:
    """獲取記憶服務單例"""
    global _memory_service
    if _memory_service is None:
        _memory_service = ConversationMemoryService()
    return _memory_service


# 測試
if __name__ == "__main__":
    import asyncio
    
    async def test():
        service = get_memory_service()
        await service.initialize()
        
        # 模擬對話
        user_id = "test_user_123"
        
        # 第一輪對話
        await service.extract_and_store_memories(
            user_id,
            "我想了解一下你們的支付服務，價格大概多少？",
            "我們提供多種支付方案，具體價格根據您的需求而定..."
        )
        
        # 第二輪對話
        await service.extract_and_store_memories(
            user_id,
            "我比較喜歡快速到賬的，預算大概5000左右",
            "好的，根據您的需求..."
        )
        
        # 回憶相關記憶
        memories = await service.recall_relevant_memories(user_id, "價格優惠嗎")
        print("回憶的記憶:", memories)
        
        # 獲取摘要
        summary = await service.get_conversation_summary(user_id)
        print("對話摘要:", summary)
        
        # 生成記憶 Prompt
        prompt = await service.generate_memory_prompt(user_id, "有什麼優惠嗎")
        print("記憶 Prompt:", prompt)
    
    asyncio.run(test())
