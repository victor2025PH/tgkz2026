"""
Auto Funnel Manager - 全自動銷售漏斗管理器
處理用戶的跟進、成交、流失全流程自動化

漏斗階段:
- new: 新客戶
- contacted: 已聯繫
- replied: 已回復
- interested: 有興趣
- negotiating: 洽談中
- follow_up: 需跟進
- converted: 已成交
- churned: 已流失
"""
import asyncio
import sys
import json
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, timedelta
from database import db


class AutoFunnelManager:
    """全自動銷售漏斗管理器"""
    
    # 漏斗階段定義
    STAGES = {
        'new': {'name': '新客戶', 'order': 1, 'color': 'blue', 'auto_action': 'greeting'},
        'contacted': {'name': '已聯繫', 'order': 2, 'color': 'cyan', 'auto_action': 'wait'},
        'replied': {'name': '已回復', 'order': 3, 'color': 'green', 'auto_action': 'engage'},
        'interested': {'name': '有興趣', 'order': 4, 'color': 'yellow', 'auto_action': 'introduce'},
        'negotiating': {'name': '洽談中', 'order': 5, 'color': 'orange', 'auto_action': 'quote'},
        'follow_up': {'name': '需跟進', 'order': 6, 'color': 'purple', 'auto_action': 'follow_up'},
        'converted': {'name': '已成交', 'order': 7, 'color': 'emerald', 'auto_action': 'thank'},
        'churned': {'name': '已流失', 'order': 8, 'color': 'red', 'auto_action': 'farewell'},
    }
    
    # 跟進策略配置
    FOLLOW_UP_CONFIG = {
        'contacted': {  # 已聯繫但未回復
            'check_after_hours': 24,  # 24小時後檢查
            'max_attempts': 3,
            'message_templates': [
                '嗨~ 之前的消息你看到了嗎？有什麼我可以幫忙的嗎？😊',
                '不好意思打擾，想確認一下你是否有收到我的消息？',
                '最後一次跟進~ 如果有任何問題隨時找我聊 👋',
            ],
            'next_stage_on_fail': 'churned',
        },
        'interested': {  # 有興趣但沒有繼續
            'check_after_hours': 48,
            'max_attempts': 2,
            'message_templates': [
                '之前聊到你感興趣的內容，還有什麼想了解的嗎？',
                '有任何顧慮都可以說，我幫你解答~',
            ],
            'next_stage_on_fail': 'follow_up',
        },
        'negotiating': {  # 洽談中但沒有成交
            'check_after_hours': 72,
            'max_attempts': 2,
            'message_templates': [
                '之前報價的方案考慮得怎麼樣了？',
                '限時優惠即將結束，有什麼我能幫你的嗎？',
            ],
            'next_stage_on_fail': 'follow_up',
        },
        'follow_up': {  # 需要跟進的用戶
            'check_after_hours': 168,  # 7天
            'max_attempts': 1,
            'message_templates': [
                '好久沒聯繫了，最近怎麼樣？有什麼需要幫忙的嗎？',
            ],
            'next_stage_on_fail': 'churned',
        },
    }
    
    # 關鍵詞分析配置
    INTENT_KEYWORDS = {
        'positive': {
            'interested': ['想了解', '怎麼用', '功能', '介紹', '詳細', 'how to', 'what is', 'tell me'],
            'negotiating': ['價格', '多少錢', '優惠', '折扣', '報價', 'price', 'discount', 'how much'],
            'converted': ['成交', '付款', '轉帳', '確認', '購買', 'paid', 'done', 'confirmed', 'buy'],
        },
        'negative': {
            'churned': ['不要', '不需要', '沒興趣', '算了', '拜拜', 'no thanks', 'not interested', 'bye'],
        }
    }
    
    def __init__(self):
        self.is_running = False
        self.send_callback: Optional[Callable] = None
        self.log_callback: Optional[Callable] = None
        self.event_callback: Optional[Callable] = None
        self._follow_up_task: Optional[asyncio.Task] = None
        
    def set_callbacks(self, send_callback: Callable = None, 
                      log_callback: Callable = None,
                      event_callback: Callable = None):
        """設置回調函數"""
        if send_callback:
            self.send_callback = send_callback
        if log_callback:
            self.log_callback = log_callback
        if event_callback:
            self.event_callback = event_callback
    
    def log(self, message: str, level: str = "info"):
        """記錄日誌"""
        formatted = f"[AutoFunnel] {message}"
        if self.log_callback:
            self.log_callback(formatted, level)
        else:
            print(formatted, file=sys.stderr)
    
    async def start(self):
        """啟動自動漏斗管理"""
        if self.is_running:
            return
        
        self.is_running = True
        self._follow_up_task = asyncio.create_task(self._follow_up_loop())
        self.log("自動漏斗管理器已啟動", "success")
    
    async def stop(self):
        """停止自動漏斗管理"""
        self.is_running = False
        if self._follow_up_task:
            self._follow_up_task.cancel()
            try:
                await self._follow_up_task
            except asyncio.CancelledError:
                pass
        self.log("自動漏斗管理器已停止")
    
    async def _follow_up_loop(self):
        """定時跟進循環"""
        while self.is_running:
            try:
                await self._process_follow_ups()
                # 每30分鐘檢查一次
                await asyncio.sleep(1800)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.log(f"跟進循環錯誤: {e}", "error")
                await asyncio.sleep(60)
    
    async def _process_follow_ups(self):
        """處理所有需要跟進的用戶"""
        self.log("開始檢查需要跟進的用戶...")
        
        for stage, config in self.FOLLOW_UP_CONFIG.items():
            users = await self._get_users_need_follow_up(stage, config['check_after_hours'])
            
            for user in users:
                await self._auto_follow_up(user, stage, config)
                # 避免發送太快
                await asyncio.sleep(5)
        
        self.log("跟進檢查完成")
    
    async def _get_users_need_follow_up(self, stage: str, hours: int) -> List[Dict[str, Any]]:
        """獲取需要跟進的用戶列表"""
        cursor = await db._connection.execute("""
            SELECT up.*, 
                   (SELECT COUNT(*) FROM funnel_history fh 
                    WHERE fh.user_id = up.user_id AND fh.from_stage = ? 
                    AND fh.reason LIKE '%自動跟進%') as follow_up_count
            FROM user_profiles up
            WHERE up.funnel_stage = ?
            AND up.last_interaction < datetime('now', '-' || ? || ' hours')
            AND (up.auto_follow_up_enabled IS NULL OR up.auto_follow_up_enabled = 1)
        """, (stage, stage, hours))
        
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    
    async def _auto_follow_up(self, user: Dict[str, Any], stage: str, config: Dict[str, Any]):
        """自動跟進用戶"""
        user_id = user['user_id']
        follow_up_count = user.get('follow_up_count', 0)
        max_attempts = config['max_attempts']
        
        if follow_up_count >= max_attempts:
            # 達到最大跟進次數，轉入下一階段
            next_stage = config['next_stage_on_fail']
            await self.transition_stage(
                user_id, next_stage,
                reason=f"跟進 {max_attempts} 次無回應，自動標記為 {self.STAGES[next_stage]['name']}"
            )
            return
        
        # 選擇跟進消息
        templates = config['message_templates']
        message = templates[follow_up_count % len(templates)]
        
        # 發送跟進消息
        if self.send_callback:
            try:
                await self.send_callback(
                    target_user_id=user_id,
                    message=message,
                    is_follow_up=True
                )
                
                # 記錄跟進歷史
                await db._connection.execute("""
                    INSERT INTO funnel_history (user_id, from_stage, to_stage, reason, auto_triggered)
                    VALUES (?, ?, ?, ?, 1)
                """, (user_id, stage, stage, f"自動跟進 #{follow_up_count + 1}"))
                
                # 更新最後互動時間
                await db._connection.execute("""
                    UPDATE user_profiles 
                    SET last_interaction = CURRENT_TIMESTAMP 
                    WHERE user_id = ?
                """, (user_id,))
                
                await db._connection.commit()
                
                self.log(f"已發送跟進消息給用戶 {user_id} (第 {follow_up_count + 1} 次)")
                
            except Exception as e:
                self.log(f"發送跟進消息失敗: {e}", "error")
    
    async def analyze_message(self, user_id: str, message: str, 
                               is_from_user: bool = True) -> Dict[str, Any]:
        """
        分析消息並確定漏斗階段
        
        Args:
            user_id: 用戶ID
            message: 消息內容
            is_from_user: 是否來自用戶
        
        Returns:
            包含階段、興趣度、建議等的分析結果
        """
        msg_lower = message.lower()
        
        # 獲取當前用戶資料
        profile = await db.get_user_profile(user_id)
        current_stage = profile.get('funnel_stage', 'new') if profile else 'new'
        current_interest = profile.get('interest_level', 1) if profile else 1
        
        # 分析意圖
        detected_stage = None
        intent_type = 'neutral'
        
        # 檢查正面關鍵詞
        for stage, keywords in self.INTENT_KEYWORDS['positive'].items():
            if any(kw in msg_lower for kw in keywords):
                detected_stage = stage
                intent_type = 'positive'
                break
        
        # 檢查負面關鍵詞
        if not detected_stage:
            for stage, keywords in self.INTENT_KEYWORDS['negative'].items():
                if any(kw in msg_lower for kw in keywords):
                    detected_stage = stage
                    intent_type = 'negative'
                    break
        
        # 根據是否有用戶回復來更新階段
        if is_from_user and current_stage in ['new', 'contacted']:
            detected_stage = detected_stage or 'replied'
        
        # 計算新的興趣度
        new_interest = current_interest
        if intent_type == 'positive':
            new_interest = min(5, current_interest + 1)
        elif intent_type == 'negative':
            new_interest = max(1, current_interest - 2)
        elif is_from_user:
            new_interest = min(5, current_interest + 0.5)
        
        # 確定最終階段
        final_stage = detected_stage or current_stage
        
        # 獲取階段信息
        stage_info = self.STAGES.get(final_stage, self.STAGES['new'])
        
        # 生成建議
        suggestions = self._get_stage_suggestions(final_stage, new_interest)
        
        result = {
            'user_id': user_id,
            'previous_stage': current_stage,
            'current_stage': final_stage,
            'suggested_stage': final_stage,
            'stage_name': stage_info['name'],
            'stage_color': stage_info['color'],
            'interest_level': int(new_interest),
            'intent_type': intent_type,
            'auto_action': stage_info['auto_action'],
            'suggestions': suggestions,
            'should_transition': final_stage != current_stage,
            'should_advance': final_stage != current_stage,  # 別名，用於私信處理器
        }
        
        # 如果階段變化，自動更新
        if result['should_transition']:
            await self.transition_stage(
                user_id, final_stage,
                reason=f"AI 分析: {intent_type} 意圖 - {message[:50]}..."
            )
        
        # 更新興趣度
        if int(new_interest) != current_interest:
            await db.update_user_interest(user_id, int(new_interest))
        
        return result
    
    def _get_stage_suggestions(self, stage: str, interest: int) -> List[str]:
        """根據階段和興趣度生成建議"""
        suggestions_map = {
            'new': ['發送友好問候', '了解用戶需求', '介紹產品/服務'],
            'contacted': ['等待用戶回復', '準備跟進消息'],
            'replied': ['深入了解需求', '建立信任關係', '提供有價值信息'],
            'interested': ['詳細介紹功能', '提供案例展示', '解答疑問'],
            'negotiating': ['強調產品價值', '提供優惠方案', '處理異議'],
            'follow_up': ['發送溫和提醒', '提供特別優惠', '了解顧慮'],
            'converted': ['感謝客戶', '提供售後支持', '邀請好評推薦'],
            'churned': ['禮貌告別', '保留聯繫方式', '記錄流失原因'],
        }
        
        base_suggestions = suggestions_map.get(stage, ['繼續對話'])
        
        # 根據興趣度調整
        if interest >= 4 and stage not in ['converted', 'churned']:
            base_suggestions.insert(0, '🔥 高興趣度！積極推進成交')
        elif interest <= 2 and stage not in ['churned']:
            base_suggestions.insert(0, '⚠️ 興趣度較低，需要提供更多價值')
        
        return base_suggestions
    
    async def transition_stage(self, user_id: str, new_stage: str, 
                                reason: str = None) -> Dict[str, Any]:
        """
        轉換用戶漏斗階段
        
        Args:
            user_id: 用戶ID
            new_stage: 新階段
            reason: 轉換原因
        
        Returns:
            轉換結果
        """
        if new_stage not in self.STAGES:
            return {'success': False, 'error': f'無效的階段: {new_stage}'}
        
        # 獲取當前階段
        profile = await db.get_user_profile(user_id)
        old_stage = profile.get('funnel_stage', 'new') if profile else 'new'
        
        if old_stage == new_stage:
            return {'success': True, 'message': '階段未變化'}
        
        # 更新階段
        await db.update_funnel_stage(user_id, new_stage, reason)
        
        # 特殊階段處理
        if new_stage == 'converted':
            await self._handle_conversion(user_id)
        elif new_stage == 'churned':
            await self._handle_churn(user_id)
        
        stage_info = self.STAGES[new_stage]
        result = {
            'success': True,
            'user_id': user_id,
            'from_stage': old_stage,
            'to_stage': new_stage,
            'stage_name': stage_info['name'],
            'reason': reason,
            'auto_action': stage_info['auto_action'],
        }
        
        # 發送事件通知
        if self.event_callback:
            self.event_callback('funnel-transition', result)
        
        self.log(f"用戶 {user_id} 階段轉換: {old_stage} → {new_stage}")
        
        return result
    
    async def _handle_conversion(self, user_id: str):
        """處理成交"""
        # 更新成交時間
        await db._connection.execute("""
            UPDATE user_profiles 
            SET converted_at = CURRENT_TIMESTAMP,
                lifetime_value = COALESCE(lifetime_value, 0) + 1
            WHERE user_id = ?
        """, (user_id,))
        
        # 🎓 觸發知識學習：從成功對話中學習
        try:
            from knowledge_learner import knowledge_learner
            
            # 獲取對話歷史
            cursor = await db._connection.execute("""
                SELECT role, content, timestamp 
                FROM chat_history 
                WHERE user_id = ? 
                ORDER BY timestamp ASC
                LIMIT 50
            """, (user_id,))
            rows = await cursor.fetchall()
            
            if rows:
                messages = [{'role': r['role'], 'content': r['content']} for r in rows]
                
                # 從成功對話中學習
                learn_result = await knowledge_learner.learn_from_conversation(
                    user_id=user_id,
                    messages=messages,
                    outcome='converted'
                )
                
                if learn_result.get('total_knowledge', 0) > 0:
                    self.log(f"✓ 從成交對話學習了 {learn_result['total_knowledge']} 條知識", "success")
        except Exception as e:
            self.log(f"學習失敗: {e}", "warning")
        await db._connection.commit()
        
        # 記錄成交到 leads
        await db._connection.execute("""
            UPDATE leads SET status = 'Closed-Won' WHERE user_id = ?
        """, (user_id,))
        await db._connection.commit()
        
        self.log(f"🎉 用戶 {user_id} 成交！")
    
    async def _handle_churn(self, user_id: str):
        """處理流失"""
        # 更新流失時間
        await db._connection.execute("""
            UPDATE user_profiles 
            SET churned_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        """, (user_id,))
        await db._connection.commit()
        
        # 記錄流失到 leads
        await db._connection.execute("""
            UPDATE leads SET status = 'Closed-Lost' WHERE user_id = ?
        """, (user_id,))
        await db._connection.commit()
        
        self.log(f"用戶 {user_id} 已標記為流失")
    
    async def get_funnel_overview(self) -> Dict[str, Any]:
        """獲取漏斗總覽"""
        stats = await db.get_funnel_stats()
        
        # 計算轉化率
        total = sum(stats.values())
        converted = stats.get('converted', 0)
        churned = stats.get('churned', 0)
        
        overview = {
            'stages': {},
            'total_users': total,
            'conversion_rate': round(converted / total * 100, 2) if total > 0 else 0,
            'churn_rate': round(churned / total * 100, 2) if total > 0 else 0,
        }
        
        for stage_id, info in self.STAGES.items():
            count = stats.get(stage_id, 0)
            overview['stages'][stage_id] = {
                'name': info['name'],
                'color': info['color'],
                'order': info['order'],
                'count': count,
                'percentage': round(count / total * 100, 2) if total > 0 else 0,
            }
        
        return overview
    
    async def get_user_journey(self, user_id: str) -> List[Dict[str, Any]]:
        """獲取用戶漏斗旅程"""
        history = await db.get_funnel_history(user_id, limit=50)
        
        journey = []
        for item in history:
            from_info = self.STAGES.get(item['from_stage'], {'name': item['from_stage']})
            to_info = self.STAGES.get(item['to_stage'], {'name': item['to_stage']})
            
            journey.append({
                'timestamp': item['created_at'],
                'from_stage': item['from_stage'],
                'from_name': from_info.get('name', item['from_stage']),
                'to_stage': item['to_stage'],
                'to_name': to_info.get('name', item['to_stage']),
                'reason': item['reason'],
                'auto_triggered': item['auto_triggered'],
            })
        
        return journey
    
    async def get_action_prompt(self, stage: str, context: Dict[str, Any] = None) -> str:
        """獲取階段對應的 AI 提示詞"""
        prompts = {
            'greeting': '生成一條友好簡短的問候消息（15-30字），像朋友打招呼。',
            'wait': '用戶尚未回復，暫時等待。如需跟進，生成一條溫和提醒。',
            'engage': '用戶已回復，繼續對話，了解更多需求。回復簡短自然。',
            'introduce': '用戶表現出興趣，簡單介紹產品/服務的核心價值（30-50字）。',
            'quote': '用戶在詢問價格，提供報價並強調價值。可以提供優惠。',
            'follow_up': '用戶需要跟進，發送溫和的提醒消息，詢問是否還有需求。',
            'thank': '感謝用戶成交，提供售後支持信息，邀請推薦。',
            'farewell': '用戶表示不感興趣，禮貌告別，保持良好印象。',
        }
        
        action = self.STAGES.get(stage, {}).get('auto_action', 'engage')
        base_prompt = prompts.get(action, '繼續自然對話。')
        
        # 添加上下文信息
        if context:
            if context.get('username'):
                base_prompt += f" 用戶名: @{context['username']}。"
            if context.get('interest_level', 1) >= 4:
                base_prompt += " 用戶興趣度高，可以積極推進。"
            elif context.get('interest_level', 1) <= 2:
                base_prompt += " 用戶興趣度較低，需要提供更多價值。"
        
        return base_prompt
    
    async def batch_update_stages(self, user_ids: List[str], new_stage: str, 
                                   reason: str = None) -> Dict[str, Any]:
        """批量更新用戶階段"""
        results = {
            'success': [],
            'failed': [],
        }
        
        for user_id in user_ids:
            try:
                result = await self.transition_stage(user_id, new_stage, reason)
                if result.get('success'):
                    results['success'].append(user_id)
                else:
                    results['failed'].append({'user_id': user_id, 'error': result.get('error')})
            except Exception as e:
                results['failed'].append({'user_id': user_id, 'error': str(e)})
        
        return results


# 全局實例
auto_funnel = AutoFunnelManager()
