"""
Chat History Indexer - 聊天記錄自動索引服務

功能：
1. 監控新的聊天記錄
2. 自動觸發 RAG 學習
3. 定期批量處理歷史對話
4. 智能識別高價值對話
"""
import sys
import asyncio
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, timedelta
from database import db
from telegram_rag_system import telegram_rag, ConversationOutcome, KnowledgeType


class ChatHistoryIndexer:
    """
    聊天記錄自動索引服務
    
    監控聊天記錄並自動觸發 RAG 學習
    """
    
    def __init__(self):
        self.is_running = False
        self.event_callback: Optional[Callable] = None
        self.log_callback: Optional[Callable] = None
        
        # 配置
        self.min_messages_for_learning = 4  # 最少消息數
        self.batch_size = 20  # 批量處理數量
        self.auto_index_interval = 300  # 自動索引間隔（秒）
        
        # 追蹤
        self._last_indexed_time: Optional[datetime] = None
        self._indexed_sessions: set = set()
        self._pending_sessions: List[str] = []
        self._background_task: Optional[asyncio.Task] = None
    
    def log(self, message: str, level: str = "info"):
        """記錄日誌"""
        formatted = f"[ChatIndexer] {message}"
        print(formatted, file=sys.stderr)
        if self.log_callback:
            self.log_callback(formatted, level)
    
    async def initialize(self):
        """初始化索引服務"""
        # 確保 RAG 系統已初始化
        await telegram_rag.initialize()
        
        # 確保數據庫表存在
        await self._ensure_tables()
        
        self.log("✓ 聊天記錄索引服務已初始化", "success")
    
    async def _ensure_tables(self):
        """確保必要的表存在"""
        # 索引追蹤表
        await db._connection.execute("""
            CREATE TABLE IF NOT EXISTS chat_index_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                session_id TEXT,
                message_count INTEGER DEFAULT 0,
                outcome TEXT,
                is_indexed INTEGER DEFAULT 0,
                knowledge_extracted INTEGER DEFAULT 0,
                indexed_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 創建索引
        try:
            await db._connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_chat_index_user ON chat_index_log(user_id)"
            )
            await db._connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_chat_index_indexed ON chat_index_log(is_indexed)"
            )
        except:
            pass
        
        await db._connection.commit()
    
    async def start_background_indexing(self):
        """開始後台自動索引"""
        if self.is_running:
            return
        
        self.is_running = True
        self._background_task = asyncio.create_task(self._background_indexing_loop())
        self.log("後台索引服務已啟動")
    
    async def stop_background_indexing(self):
        """停止後台索引"""
        self.is_running = False
        if self._background_task:
            self._background_task.cancel()
            try:
                await self._background_task
            except asyncio.CancelledError:
                pass
        self.log("後台索引服務已停止")
    
    async def _background_indexing_loop(self):
        """後台索引循環"""
        while self.is_running:
            try:
                # 處理待索引的對話
                await self.index_pending_conversations()
                
                # 等待下一個週期
                await asyncio.sleep(self.auto_index_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.log(f"後台索引錯誤: {e}", "error")
                await asyncio.sleep(60)  # 出錯後等待較長時間
    
    async def on_conversation_ended(
        self,
        user_id: str,
        account_phone: str = "",
        outcome: str = "unknown",
        session_id: str = None
    ):
        """
        當對話結束時調用
        
        Args:
            user_id: 用戶 ID
            account_phone: 帳號電話
            outcome: 對話結果
            session_id: 會話 ID
        """
        try:
            # 獲取對話歷史
            messages = await db.get_chat_history(user_id, limit=100)
            
            if len(messages) < self.min_messages_for_learning:
                self.log(f"對話 {user_id} 消息太少 ({len(messages)})，跳過索引")
                return
            
            # 轉換 outcome
            outcome_enum = self._parse_outcome(outcome)
            
            # 觸發 RAG 學習
            result = await telegram_rag.learn_from_conversation(
                user_id=user_id,
                messages=messages,
                outcome=outcome_enum,
                account_phone=account_phone,
                chat_id=user_id
            )
            
            # 記錄索引日誌
            await self._log_indexing(
                user_id=user_id,
                session_id=session_id,
                message_count=len(messages),
                outcome=outcome,
                knowledge_extracted=result.get('total_knowledge', 0)
            )
            
            if result.get('total_knowledge', 0) > 0:
                self.log(f"✓ 對話 {user_id} 索引完成，提取了 {result['total_knowledge']} 條知識")
                
                # 發送事件
                if self.event_callback:
                    self.event_callback("rag-learning-complete", {
                        "userId": user_id,
                        "outcome": outcome,
                        "knowledgeExtracted": result['total_knowledge'],
                        "qaExtracted": result.get('qa_extracted', 0),
                        "scriptsExtracted": result.get('scripts_extracted', 0)
                    })
            
        except Exception as e:
            self.log(f"索引對話 {user_id} 失敗: {e}", "error")
    
    async def index_pending_conversations(self) -> Dict[str, Any]:
        """
        索引所有待處理的對話
        
        Returns:
            處理結果統計
        """
        result = {
            'conversations_processed': 0,
            'knowledge_extracted': 0,
            'errors': 0
        }
        
        try:
            # 找出有足夠消息但未索引的用戶
            cursor = await db._connection.execute("""
                SELECT DISTINCT ch.user_id, COUNT(*) as msg_count
                FROM chat_history ch
                LEFT JOIN chat_index_log cil ON ch.user_id = cil.user_id
                WHERE cil.id IS NULL OR cil.is_indexed = 0
                GROUP BY ch.user_id
                HAVING msg_count >= ?
                ORDER BY msg_count DESC
                LIMIT ?
            """, (self.min_messages_for_learning, self.batch_size))
            
            pending = await cursor.fetchall()
            
            for row in pending:
                user_id = row['user_id']
                
                try:
                    # 獲取對話歷史
                    messages = await db.get_chat_history(user_id, limit=100)
                    
                    # 推測對話結果
                    outcome = await self._infer_outcome(user_id, messages)
                    
                    # 觸發 RAG 學習
                    learn_result = await telegram_rag.learn_from_conversation(
                        user_id=user_id,
                        messages=messages,
                        outcome=outcome
                    )
                    
                    # 記錄索引
                    await self._log_indexing(
                        user_id=user_id,
                        message_count=len(messages),
                        outcome=outcome.value,
                        knowledge_extracted=learn_result.get('total_knowledge', 0),
                        is_indexed=True
                    )
                    
                    result['conversations_processed'] += 1
                    result['knowledge_extracted'] += learn_result.get('total_knowledge', 0)
                    
                except Exception as e:
                    self.log(f"索引用戶 {user_id} 失敗: {e}", "error")
                    result['errors'] += 1
            
            if result['conversations_processed'] > 0:
                self.log(f"批量索引完成: 處理 {result['conversations_processed']} 個對話，" +
                        f"提取 {result['knowledge_extracted']} 條知識")
            
            return result
            
        except Exception as e:
            self.log(f"批量索引失敗: {e}", "error")
            result['errors'] += 1
            return result
    
    async def reindex_high_value_conversations(
        self,
        min_outcome_score: float = 0.5,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        重新索引高價值對話
        
        Args:
            min_outcome_score: 最低結果評分
            days: 時間範圍（天）
        
        Returns:
            處理結果統計
        """
        result = {
            'conversations_processed': 0,
            'knowledge_extracted': 0
        }
        
        try:
            # 找出高價值對話（已成交或感興趣的用戶）
            cursor = await db._connection.execute("""
                SELECT DISTINCT user_id FROM user_profiles
                WHERE funnel_stage IN ('converted', 'interested', 'negotiating')
                AND updated_at >= datetime('now', '-' || ? || ' days')
                LIMIT 100
            """, (days,))
            
            high_value_users = await cursor.fetchall()
            
            for row in high_value_users:
                user_id = row['user_id']
                
                try:
                    messages = await db.get_chat_history(user_id, limit=100)
                    
                    if len(messages) < self.min_messages_for_learning:
                        continue
                    
                    # 獲取用戶階段
                    profile = await db.get_user_profile(user_id)
                    stage = profile.get('funnel_stage', 'unknown') if profile else 'unknown'
                    outcome = self._parse_outcome(stage)
                    
                    # 強制重新學習
                    learn_result = await telegram_rag.learn_from_conversation(
                        user_id=user_id,
                        messages=messages,
                        outcome=outcome
                    )
                    
                    result['conversations_processed'] += 1
                    result['knowledge_extracted'] += learn_result.get('total_knowledge', 0)
                    
                except Exception as e:
                    self.log(f"重新索引用戶 {user_id} 失敗: {e}", "error")
            
            self.log(f"高價值對話重新索引完成: {result['conversations_processed']} 個對話")
            return result
            
        except Exception as e:
            self.log(f"重新索引失敗: {e}", "error")
            return result
    
    async def _infer_outcome(
        self, 
        user_id: str, 
        messages: List[Dict]
    ) -> ConversationOutcome:
        """推測對話結果"""
        # 先嘗試從用戶畫像獲取
        try:
            profile = await db.get_user_profile(user_id)
            if profile:
                stage = profile.get('funnel_stage', '')
                return self._parse_outcome(stage)
        except:
            pass
        
        # 從消息內容推測
        if not messages:
            return ConversationOutcome.UNKNOWN
        
        all_text = ' '.join([m.get('content', '').lower() for m in messages])
        
        # 成交信號
        if any(kw in all_text for kw in ['已付', '付款了', '成交', '收到', '確認']):
            return ConversationOutcome.CONVERTED
        
        # 洽談信號
        if any(kw in all_text for kw in ['多少錢', '怎麼付', '價格', '優惠']):
            return ConversationOutcome.NEGOTIATING
        
        # 興趣信號
        if any(kw in all_text for kw in ['想了解', '介紹', '詳細', '怎麼做']):
            return ConversationOutcome.INTERESTED
        
        # 流失信號
        if any(kw in all_text for kw in ['不需要', '不用了', '算了', '沒興趣']):
            return ConversationOutcome.CHURNED
        
        # 有回復
        user_msgs = [m for m in messages if m.get('role') == 'user']
        if len(user_msgs) > 0:
            return ConversationOutcome.REPLIED
        
        return ConversationOutcome.CONTACTED
    
    def _parse_outcome(self, outcome_str: str) -> ConversationOutcome:
        """解析結果字符串"""
        outcome_map = {
            'converted': ConversationOutcome.CONVERTED,
            'interested': ConversationOutcome.INTERESTED,
            'negotiating': ConversationOutcome.NEGOTIATING,
            'replied': ConversationOutcome.REPLIED,
            'contacted': ConversationOutcome.CONTACTED,
            'churned': ConversationOutcome.CHURNED,
            'new': ConversationOutcome.CONTACTED,
            'follow_up': ConversationOutcome.REPLIED,
        }
        return outcome_map.get(outcome_str.lower(), ConversationOutcome.UNKNOWN)
    
    async def _log_indexing(
        self,
        user_id: str,
        session_id: str = None,
        message_count: int = 0,
        outcome: str = "unknown",
        knowledge_extracted: int = 0,
        is_indexed: bool = True
    ):
        """記錄索引日誌"""
        try:
            await db._connection.execute("""
                INSERT INTO chat_index_log 
                (user_id, session_id, message_count, outcome, is_indexed, knowledge_extracted, indexed_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (user_id, session_id, message_count, outcome, int(is_indexed), knowledge_extracted))
            await db._connection.commit()
        except Exception as e:
            self.log(f"記錄索引日誌失敗: {e}", "warning")
    
    async def get_indexing_statistics(self) -> Dict[str, Any]:
        """獲取索引統計"""
        try:
            # 總體統計
            cursor = await db._connection.execute("""
                SELECT 
                    COUNT(*) as total_indexed,
                    SUM(knowledge_extracted) as total_knowledge,
                    AVG(message_count) as avg_messages
                FROM chat_index_log
                WHERE is_indexed = 1
            """)
            total = await cursor.fetchone()
            
            # 按結果分類
            cursor = await db._connection.execute("""
                SELECT 
                    outcome,
                    COUNT(*) as count,
                    SUM(knowledge_extracted) as knowledge
                FROM chat_index_log
                WHERE is_indexed = 1
                GROUP BY outcome
            """)
            by_outcome = await cursor.fetchall()
            
            # 今日統計
            cursor = await db._connection.execute("""
                SELECT 
                    COUNT(*) as count,
                    SUM(knowledge_extracted) as knowledge
                FROM chat_index_log
                WHERE is_indexed = 1 AND indexed_at >= date('now')
            """)
            today = await cursor.fetchone()
            
            return {
                'total_indexed': total['total_indexed'] or 0,
                'total_knowledge': total['total_knowledge'] or 0,
                'avg_messages': round(total['avg_messages'] or 0, 1),
                'by_outcome': {
                    row['outcome']: {
                        'count': row['count'],
                        'knowledge': row['knowledge'] or 0
                    } for row in by_outcome
                },
                'today': {
                    'indexed': today['count'] or 0,
                    'knowledge': today['knowledge'] or 0
                }
            }
            
        except Exception as e:
            self.log(f"獲取統計失敗: {e}", "error")
            return {'error': str(e)}


# 創建全局實例
chat_indexer = ChatHistoryIndexer()
