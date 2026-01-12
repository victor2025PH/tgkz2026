"""
AI Context Manager
Manages infinite context through intelligent message selection and memory
"""
import json
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from database import db


class AIContextManager:
    """Manages AI conversation context with infinite history support"""
    
    def __init__(self):
        self.max_context_tokens = 4000  # Reserve tokens for context
        self.max_recent_messages = 20   # Sliding window size
        self.summary_threshold = 50     # Summarize after this many messages
        
    async def build_context(self, user_id: str, system_prompt: str = None,
                            max_messages: int = None) -> List[Dict[str, str]]:
        """
        Build conversation context for AI
        
        優化的上下文結構：
        1. System prompt（基礎指令）
        2. 用戶畫像摘要（一直存在）
        3. 對話摘要（舊對話的精華）
        4. 關鍵記憶點（重要信息）
        5. 最近 N 條原始消息
        """
        messages = []
        max_msgs = max_messages or self.max_recent_messages
        
        # 1. System prompt
        if system_prompt:
            messages.append({
                "role": "system",
                "content": system_prompt
            })
        
        # 2. Get user profile and add as context
        profile = await db.get_user_profile(user_id)
        profile_context = ""
        if profile:
            profile_context = self._build_enhanced_profile_context(profile)
        
        # 3. Get conversation summaries (摘要類型的記憶)
        summaries = await db.get_ai_memories(user_id, memory_type='summary', limit=3)
        summary_text = ""
        if summaries:
            summary_text = self._format_summaries(summaries)
        
        # 4. Get key memories (非摘要類型)
        memories = await db.get_ai_memories(user_id, limit=5)
        key_memories = [m for m in memories if m.get('memory_type') != 'summary']
        memory_text = ""
        if key_memories:
            memory_text = self._format_memories(key_memories)
        
        # 構建增強的上下文塊
        context_parts = []
        if profile_context:
            context_parts.append(f"【用戶資料】\n{profile_context}")
        if summary_text:
            context_parts.append(f"【歷史對話摘要】\n{summary_text}")
        if memory_text:
            context_parts.append(f"【重要記憶】\n{memory_text}")
        
        if context_parts:
            messages.append({
                "role": "system",
                "content": "\n\n".join(context_parts)
            })
        
        # 5. Get recent chat history
        history = await db.get_chat_history(user_id, limit=max_msgs)
        for msg in history:
            messages.append({
                "role": msg['role'],
                "content": msg['content']
            })
        
        return messages
    
    def _build_enhanced_profile_context(self, profile: Dict[str, Any]) -> str:
        """構建增強的用戶畫像上下文"""
        parts = []
        
        # 基本信息
        name_parts = []
        if profile.get('username'):
            name_parts.append(f"@{profile['username']}")
        if profile.get('first_name'):
            name_parts.append(profile['first_name'])
        if name_parts:
            parts.append(f"用戶: {' / '.join(name_parts)}")
        
        # 對話階段
        stage_names = {
            'new': '新客戶',
            'contacted': '已聯繫',
            'replied': '已回復',
            'interested': '有興趣',
            'negotiating': '洽談中',
            'follow_up': '需跟進',
            'converted': '已成交',
            'churned': '已流失'
        }
        stage = profile.get('funnel_stage', 'new')
        parts.append(f"階段: {stage_names.get(stage, stage)}")
        
        # 興趣程度
        interest = profile.get('interest_level', 1)
        interest_desc = ['很低', '低', '中等', '高', '很高']
        if 1 <= interest <= 5:
            parts.append(f"興趣度: {interest_desc[interest-1]} ({interest}/5)")
        
        # 標籤
        if profile.get('tags'):
            parts.append(f"標籤: {profile['tags']}")
        
        # 來源
        if profile.get('source_group'):
            parts.append(f"來源群組: {profile['source_group']}")
        if profile.get('source_keyword'):
            parts.append(f"觸發關鍵詞: {profile['source_keyword']}")
        
        # 統計
        if profile.get('total_messages'):
            parts.append(f"歷史消息數: {profile['total_messages']}")
        
        # 備註
        if profile.get('personality_notes'):
            parts.append(f"備註: {profile['personality_notes']}")
        
        # VIP 標識
        if profile.get('is_vip'):
            parts.append("⭐ VIP 用戶")
        
        return '\n'.join(parts)
    
    def _format_summaries(self, summaries: List[Dict[str, Any]]) -> str:
        """格式化對話摘要"""
        lines = []
        for i, s in enumerate(summaries, 1):
            content = s.get('content', '')
            # 截取摘要的關鍵部分
            if len(content) > 200:
                content = content[:200] + '...'
            lines.append(f"{i}. {content}")
        return '\n'.join(lines)
    
    def _build_profile_context(self, profile: Dict[str, Any]) -> str:
        """Build context string from user profile"""
        parts = []
        
        if profile.get('username'):
            parts.append(f"用戶名: @{profile['username']}")
        if profile.get('first_name'):
            name = profile['first_name']
            if profile.get('last_name'):
                name += f" {profile['last_name']}"
            parts.append(f"姓名: {name}")
        if profile.get('tags'):
            parts.append(f"標籤: {profile['tags']}")
        if profile.get('conversation_stage'):
            parts.append(f"對話階段: {profile['conversation_stage']}")
        if profile.get('personality_notes'):
            parts.append(f"備註: {profile['personality_notes']}")
        if profile.get('total_messages'):
            parts.append(f"歷史消息數: {profile['total_messages']}")
        
        return '\n'.join(parts)
    
    def _format_memories(self, memories: List[Dict[str, Any]]) -> str:
        """Format memories for context"""
        lines = []
        for mem in memories:
            mem_type = {
                'fact': '事實',
                'preference': '偏好',
                'instruction': '指示',
                'summary': '摘要'
            }.get(mem['memory_type'], mem['memory_type'])
            lines.append(f"- [{mem_type}] {mem['content']}")
        return '\n'.join(lines)
    
    async def add_message(self, user_id: str, role: str, content: str,
                          account_phone: str = None, source_group: str = None,
                          message_id: str = None) -> int:
        """Add a message to chat history"""
        msg_id = await db.add_chat_message(
            user_id=user_id,
            role=role,
            content=content,
            account_phone=account_phone,
            source_group=source_group,
            message_id=message_id
        )
        
        # Check if we need to summarize old messages
        await self._check_and_summarize(user_id)
        
        return msg_id
    
    async def _check_and_summarize(self, user_id: str):
        """Check if old messages need to be summarized"""
        # Get chat stats
        stats = await db.get_chat_stats(user_id)
        if not stats or stats['total_messages'] < self.summary_threshold:
            return
        
        # Get unsummarized messages count
        history = await db.get_full_chat_history(user_id)
        unsummarized = [m for m in history if not m.get('is_summarized')]
        
        if len(unsummarized) > self.summary_threshold:
            # Mark older messages for summarization (keep recent ones)
            to_summarize = unsummarized[:-self.max_recent_messages]
            if to_summarize:
                message_ids = [m['id'] for m in to_summarize]
                await db.mark_messages_summarized(message_ids)
                
                # Create a summary memory
                summary = self._create_summary(to_summarize)
                if summary:
                    await db.add_ai_memory(
                        user_id=user_id,
                        memory_type='summary',
                        content=summary,
                        importance=0.7
                    )
    
    def _create_summary(self, messages: List[Dict[str, Any]]) -> str:
        """Create a summary of messages"""
        if not messages:
            return ""
        
        # 提取用戶和助手消息
        user_msgs = [m['content'] for m in messages if m['role'] == 'user']
        assistant_msgs = [m['content'] for m in messages if m['role'] == 'assistant']
        
        if not user_msgs:
            return ""
        
        first_time = messages[0].get('timestamp', 'unknown')
        last_time = messages[-1].get('timestamp', 'unknown')
        
        # 提取關鍵信息
        topics = self._extract_topics(user_msgs)
        questions = self._extract_questions(user_msgs)
        
        summary = f"對話摘要 ({first_time[:10] if len(str(first_time)) > 10 else first_time} 至 {last_time[:10] if len(str(last_time)) > 10 else last_time}):\n"
        summary += f"- 共 {len(messages)} 條消息（用戶 {len(user_msgs)} / AI {len(assistant_msgs)}）\n"
        
        if topics:
            summary += f"- 話題: {', '.join(topics[:5])}\n"
        if questions:
            summary += f"- 用戶問題: {'; '.join(questions[:3])}\n"
        
        # 最後一條用戶消息
        if user_msgs:
            summary += f"- 最後話題: {user_msgs[-1][:100]}..."
        
        return summary
    
    def _extract_topics(self, messages: List[str]) -> List[str]:
        """從消息中提取話題關鍵詞"""
        topics = set()
        
        # 常見業務關鍵詞
        business_keywords = {
            '價格', '價錢', '多少錢', '費用', '收費',
            '支付', '付款', '轉賬', '匯款',
            '換匯', '換U', 'USDT', 'BTC', '比特幣',
            '投資', '理財', '收益', '利息',
            '時間', '多久', '什麼時候',
            '怎麼', '如何', '方法', '流程',
            '安全', '可靠', '信任', '保證'
        }
        
        all_text = ' '.join(messages).lower()
        
        for kw in business_keywords:
            if kw.lower() in all_text:
                topics.add(kw)
        
        return list(topics)
    
    def _extract_questions(self, messages: List[str]) -> List[str]:
        """提取用戶的問題"""
        questions = []
        question_markers = ['?', '？', '嗎', '呢', '怎麼', '如何', '什麼', '多少', '哪裡', '為什麼', '能不能', '可以', '有沒有']
        
        for msg in messages:
            if any(marker in msg for marker in question_markers):
                # 截取問題（最多 50 字）
                q = msg[:50] + ('...' if len(msg) > 50 else '')
                questions.append(q)
        
        return questions
    
    async def extract_and_save_memory(self, user_id: str, content: str, 
                                       memory_type: str = 'fact',
                                       importance: float = 0.5):
        """Extract important information and save as memory"""
        return await db.add_ai_memory(user_id, memory_type, content, importance)
    
    async def analyze_and_extract_insights(self, user_id: str, message: str, role: str = 'user') -> Dict[str, Any]:
        """
        分析消息並提取關鍵信息，自動更新用戶畫像
        
        Returns:
            Dict with extracted insights including:
            - topics: 話題關鍵詞
            - needs: 用戶需求
            - questions: 用戶問題
            - sentiment: 情感（positive/negative/neutral）
            - interest_level: 興趣度評分 (1-5)
            - suggested_stage: 建議的漏斗階段
            - importance: 消息重要性
            - saved_memories: 保存的記憶 ID
        """
        insights = {
            'topics': [],
            'needs': [],
            'questions': [],
            'sentiment': 'neutral',
            'interest_level': 3,
            'suggested_stage': None,
            'importance': 0.5,
            'saved_memories': [],
            'auto_tags': []
        }
        
        if role != 'user' or not message:
            return insights
        
        msg_lower = message.lower()
        
        # ========== 1. 提取需求 ==========
        need_patterns = {
            '想要': 'want',
            '需要': 'need',
            '找': 'looking_for',
            '有沒有': 'inquiry',
            '能不能': 'can_do',
            '可以': 'can_do',
            '幫我': 'help',
            '急': 'urgent',
            '馬上': 'urgent',
            '盡快': 'urgent'
        }
        
        for pattern, need_type in need_patterns.items():
            if pattern in msg_lower:
                insights['needs'].append({
                    'type': need_type,
                    'context': message[:100]
                })
        
        # ========== 2. 提取話題 ==========
        insights['topics'] = self._extract_topics([message])
        
        # ========== 3. 提取問題 ==========
        insights['questions'] = self._extract_questions([message])
        
        # ========== 4. 情感分析 ==========
        positive_words = ['好', '讚', '謝謝', '太棒', '滿意', '開心', '感謝', '不錯', '可以', 'ok', 'good', 'great', 'thanks', 'nice']
        negative_words = ['不要', '不行', '差', '爛', '失望', '生氣', '不滿', '算了', '取消', 'no', 'bad', 'poor', 'cancel']
        
        # ========== 5. 漏斗階段判斷 ==========
        # 成交信號
        conversion_signals = ['付款', '轉賬', '已付', '付了', '打款', '轉了', '支付成功', '確認收到']
        # 高意向信號
        high_intent_signals = ['多少錢', '怎麼付', '付款方式', '銀行卡', '收款', '下單', '購買', '要買', '給我']
        # 有興趣信號
        interest_signals = ['介紹', '了解', '詳細', '說說', '告訴我', '什麼服務', '有什麼', '怎麼做']
        # 回復信號
        reply_signals = ['好的', '嗯', '行', 'ok', '明白', '知道了', '收到']
        # 流失信號
        churn_signals = ['不需要', '不用了', '再見', '拜拜', '算了', '沒興趣', '不要', '取消', 'bye', 'no thanks']
        
        if any(s in msg_lower for s in conversion_signals):
            insights['suggested_stage'] = 'converted'
            insights['interest_level'] = 5
        elif any(s in msg_lower for s in churn_signals):
            insights['suggested_stage'] = 'churned'
            insights['interest_level'] = 1
        elif any(s in msg_lower for s in high_intent_signals):
            insights['suggested_stage'] = 'negotiating'
            insights['interest_level'] = 4
        elif any(s in msg_lower for s in interest_signals):
            insights['suggested_stage'] = 'interested'
            insights['interest_level'] = 3
        elif any(s in msg_lower for s in reply_signals):
            insights['suggested_stage'] = 'replied'
            insights['interest_level'] = 2
        
        # ========== 6. 自動標籤 ==========
        tag_patterns = {
            '換匯': ['換匯', '換U', 'usdt', '美元', '港幣', '人民幣', '匯率'],
            '支付': ['支付', '付款', '轉賬', '收款', '打款'],
            '投資': ['投資', '理財', '收益', '利息', '回報'],
            '貸款': ['貸款', '借錢', '借款', '周轉'],
            '諮詢': ['諮詢', '問一下', '請問', '了解'],
            '急需': ['急', '馬上', '盡快', '立刻', '趕緊'],
            'VIP潛力': ['大額', '大單', '長期', '穩定']
        }
        
        for tag, keywords in tag_patterns.items():
            if any(kw in msg_lower for kw in keywords):
                insights['auto_tags'].append(tag)
        
        pos_count = sum(1 for w in positive_words if w in msg_lower)
        neg_count = sum(1 for w in negative_words if w in msg_lower)
        
        if pos_count > neg_count:
            insights['sentiment'] = 'positive'
        elif neg_count > pos_count:
            insights['sentiment'] = 'negative'
        
        # 計算重要性
        if insights['needs'] or insights['questions']:
            insights['importance'] = 0.7
        if '急' in msg_lower or '馬上' in msg_lower:
            insights['importance'] = 0.9
        
        # 自動保存重要記憶
        if insights['importance'] >= 0.7:
            for need in insights['needs'][:2]:  # 最多保存 2 個需求
                memory_content = f"用戶需求: {need['context']}"
                mem_id = await db.add_ai_memory(user_id, 'fact', memory_content, insights['importance'])
                insights['saved_memories'].append(mem_id)
        
        # ========== 7. 自動更新用戶畫像 ==========
        await self._auto_update_profile(user_id, insights)
        
        return insights
    
    async def _auto_update_profile(self, user_id: str, insights: Dict[str, Any]):
        """根據分析結果自動更新用戶畫像"""
        try:
            # 獲取當前畫像
            current_profile = await db.get_user_profile(user_id) or {}
            
            update_data = {}
            
            # 更新情感分數
            if insights['sentiment'] == 'positive':
                current_score = current_profile.get('sentiment_score', 0.5)
                update_data['sentiment_score'] = min(1.0, current_score + 0.1)
            elif insights['sentiment'] == 'negative':
                current_score = current_profile.get('sentiment_score', 0.5)
                update_data['sentiment_score'] = max(0.0, current_score - 0.1)
            
            # 更新興趣程度（只升級，不降級，除非流失）
            current_interest = current_profile.get('interest_level', 1)
            new_interest = insights.get('interest_level', current_interest)
            
            if insights.get('suggested_stage') == 'churned':
                update_data['interest_level'] = 1
            elif new_interest > current_interest:
                update_data['interest_level'] = new_interest
            
            # 更新漏斗階段（使用階段順序判斷是否升級）
            if insights.get('suggested_stage'):
                current_stage = current_profile.get('funnel_stage', 'new')
                suggested_stage = insights['suggested_stage']
                
                current_order = self.FUNNEL_STAGES.get(current_stage, {}).get('order', 1)
                suggested_order = self.FUNNEL_STAGES.get(suggested_stage, {}).get('order', 1)
                
                # 只在階段前進時更新（除非是流失）
                if suggested_order > current_order or suggested_stage == 'churned' or suggested_stage == 'converted':
                    await db.set_user_funnel_stage(user_id, suggested_stage)
            
            # 合併自動標籤
            if insights.get('auto_tags'):
                current_tags = current_profile.get('tags', '')
                current_tag_set = set(current_tags.split(',')) if current_tags else set()
                current_tag_set.update(insights['auto_tags'])
                current_tag_set.discard('')  # 移除空字符串
                update_data['tags'] = ','.join(list(current_tag_set)[:15])  # 最多保留 15 個標籤
            
            # 執行更新
            if update_data:
                await db.update_user_profile(user_id, update_data)
                
        except Exception as e:
            import sys
            print(f"[AIContextManager] Error updating profile: {e}", file=sys.stderr)
    
    # 漏斗階段定義
    FUNNEL_STAGES = {
        'new': {'name': '新客戶', 'order': 1, 'color': 'blue'},
        'contacted': {'name': '已聯繫', 'order': 2, 'color': 'cyan'},
        'replied': {'name': '已回復', 'order': 3, 'color': 'green'},
        'interested': {'name': '有興趣', 'order': 4, 'color': 'yellow'},
        'negotiating': {'name': '洽談中', 'order': 5, 'color': 'orange'},
        'follow_up': {'name': '需跟進', 'order': 6, 'color': 'purple'},
        'converted': {'name': '已成交', 'order': 7, 'color': 'emerald'},
        'churned': {'name': '已流失', 'order': 8, 'color': 'red'},
    }
    
    async def analyze_conversation_stage(self, user_id: str, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze conversation and determine stage, interest level, and suggestions"""
        if not messages:
            return {
                "stage": "new",
                "stage_name": "新客戶",
                "interest_level": 1,
                "suggestions": ["發送友好問候", "了解客戶需求"],
                "next_actions": ["介紹產品/服務"],
                "auto_action": "greeting"
            }
        
        # 統計消息
        total_messages = len(messages)
        user_messages = sum(1 for m in messages if m.get('role') == 'user')
        ai_messages = sum(1 for m in messages if m.get('role') == 'assistant')
        
        # 獲取最近消息時間
        last_msg_time = None
        for m in reversed(messages):
            if m.get('timestamp'):
                try:
                    last_msg_time = datetime.fromisoformat(m['timestamp'].replace('Z', '+00:00'))
                except:
                    pass
                break
        
        # 計算沉默時間
        hours_since_last = 0
        if last_msg_time:
            hours_since_last = (datetime.now(last_msg_time.tzinfo) - last_msg_time).total_seconds() / 3600
        
        # 分析文本內容
        all_text = " ".join([m.get('content', '') for m in messages]).lower()
        last_user_text = ""
        for m in reversed(messages):
            if m.get('role') == 'user':
                last_user_text = m.get('content', '').lower()
                break
        
        # === 流失判斷 ===
        churn_keywords = ['不要', '不需要', '不用了', '再見', '拜拜', '算了', '沒興趣', 
                          'no thanks', 'not interested', 'bye', '取消', '退訂']
        if any(kw in last_user_text for kw in churn_keywords):
            return self._build_stage_result('churned', 0, total_messages, user_messages, ai_messages,
                suggestions=["記錄流失原因", "保持禮貌告別", "留下聯繫方式"],
                auto_action="farewell")
        
        # 長時間未回復也判斷為流失風險
        if hours_since_last > 72 and user_messages > 0:  # 3天未回復
            return self._build_stage_result('follow_up', 2, total_messages, user_messages, ai_messages,
                suggestions=["發送跟進消息", "提供優惠刺激", "詢問是否還有需求"],
                auto_action="follow_up_reminder")
        
        # === 成交判斷 ===
        converted_keywords = ['成交', '付款了', '已轉帳', '交易完成', '收到了', '確認收款',
                              'paid', 'done', 'confirmed', '好的成交', '可以成交']
        if any(kw in all_text for kw in converted_keywords):
            return self._build_stage_result('converted', 5, total_messages, user_messages, ai_messages,
                suggestions=["感謝客戶", "提供售後支持", "邀請好評"],
                auto_action="thank_you")
        
        # === 洽談中 ===
        negotiating_keywords = ['價格', '多少錢', '優惠', '折扣', '便宜', '報價', '怎麼付',
                                'price', 'discount', 'how much', '可以便宜', '最低']
        if any(kw in last_user_text for kw in negotiating_keywords):
            return self._build_stage_result('negotiating', 4, total_messages, user_messages, ai_messages,
                suggestions=["提供報價單", "強調價值", "限時優惠"],
                auto_action="quote")
        
        # === 有興趣 ===
        interested_keywords = ['想了解', '怎麼用', '功能', '介紹', '詳細', '有什麼',
                               'how to', 'what is', 'tell me more', '想知道']
        if any(kw in last_user_text for kw in interested_keywords):
            return self._build_stage_result('interested', 3, total_messages, user_messages, ai_messages,
                suggestions=["詳細介紹", "提供案例", "解答疑問"],
                auto_action="introduce")
        
        # === 已回復 ===
        if user_messages > 0:
            return self._build_stage_result('replied', 2, total_messages, user_messages, ai_messages,
                suggestions=["繼續對話", "了解需求", "建立信任"],
                auto_action="continue_chat")
        
        # === 已聯繫 ===
        if ai_messages > 0:
            return self._build_stage_result('contacted', 1, total_messages, user_messages, ai_messages,
                suggestions=["等待回復", "準備跟進"],
                auto_action="wait")
        
        # === 新客戶 ===
        return self._build_stage_result('new', 1, total_messages, user_messages, ai_messages,
            suggestions=["發送問候", "自我介紹"],
            auto_action="greeting")
    
    def _build_stage_result(self, stage: str, interest: int, total: int, 
                            user_msgs: int, ai_msgs: int,
                            suggestions: List[str], auto_action: str) -> Dict[str, Any]:
        """構建階段分析結果"""
        stage_info = self.FUNNEL_STAGES.get(stage, {'name': stage, 'order': 0, 'color': 'gray'})
        return {
            "stage": stage,
            "stage_name": stage_info['name'],
            "stage_order": stage_info['order'],
            "stage_color": stage_info['color'],
            "interest_level": interest,
            "message_count": total,
            "user_messages": user_msgs,
            "ai_messages": ai_msgs,
            "suggestions": suggestions,
            "next_actions": suggestions[:2],
            "auto_action": auto_action
        }
    
    async def auto_process_stage(self, user_id: str, lead_id: int, 
                                  analysis: Dict[str, Any]) -> Optional[str]:
        """根據階段自動執行操作"""
        action = analysis.get('auto_action')
        stage = analysis.get('stage')
        
        # 更新漏斗階段
        await self.update_conversation_stage(user_id, stage)
        
        # 根據 action 生成對應的消息
        action_prompts = {
            'greeting': '生成一條友好的問候消息，簡短自然，15-30字',
            'continue_chat': '根據對話繼續聊天，保持友好，回應用戶的問題',
            'introduce': '簡單介紹產品/服務的核心價值，不要太長',
            'quote': '提供報價信息，強調優惠和價值',
            'follow_up_reminder': '生成一條溫和的跟進消息，詢問是否還有需求',
            'thank_you': '生成感謝消息，提供售後支持信息',
            'farewell': '禮貌告別，表示隨時歡迎再次聯繫',
        }
        
        return action_prompts.get(action)
    
    async def update_conversation_stage(self, user_id: str, stage: str):
        """Update the conversation stage"""
        await db.set_conversation_stage(user_id, stage)
        await db.update_conversation_state(user_id, stage=stage)
    
    async def get_user_context(self, user_id: str) -> Dict[str, Any]:
        """Get full user context including profile, state, and stats"""
        profile = await db.get_user_profile(user_id)
        state = await db.get_conversation_state(user_id)
        stats = await db.get_chat_stats(user_id)
        memories = await db.get_ai_memories(user_id, limit=10)
        
        return {
            'profile': profile,
            'state': state,
            'stats': stats,
            'memories': memories
        }


# Global instance
ai_context = AIContextManager()
