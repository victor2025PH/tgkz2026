"""
AI 團隊執行引擎
AI Team Executor

功能：
1. 連接消息隊列發送真實消息
2. 選擇目標用戶
3. 使用營銷模板生成個性化消息
4. 監聽回覆並動態調整策略
"""

import asyncio
import random
import sys
from datetime import datetime
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field


@dataclass
class AITeamExecution:
    """AI 團隊執行狀態"""
    id: str
    goal: str
    intent: Dict[str, Any]
    strategy: Dict[str, Any]
    roles: List[Dict[str, Any]]
    marketing_data: Optional[Dict[str, Any]]
    status: str = 'running'  # running, paused, stopped, completed
    messages_sent: int = 0
    responses_received: int = 0
    current_phase: int = 0
    target_users: List[Dict[str, Any]] = field(default_factory=list)
    sent_to: List[str] = field(default_factory=list)  # 已發送的用戶 ID
    

class AITeamExecutor:
    """AI 團隊執行器"""
    
    def __init__(
        self,
        message_queue: Any,
        database: Any,
        send_event: Callable,
        send_log: Callable
    ):
        self.message_queue = message_queue
        self.db = database
        self.send_event = send_event
        self.send_log = send_log
        
        # 活躍的執行任務
        self.executions: Dict[str, AITeamExecution] = {}
        
        # 消息回覆回調
        self.reply_handlers: Dict[str, Callable] = {}
        
    async def start_execution(self, payload: Dict[str, Any]) -> bool:
        """啟動執行任務"""
        try:
            execution_id = payload.get('executionId')
            goal = payload.get('goal')
            intent = payload.get('intent', {})
            strategy = payload.get('strategy', {})
            roles = payload.get('roles', [])
            marketing_data = payload.get('marketingData')
            
            print(f"[AITeamExecutor] 啟動執行: {execution_id}", file=sys.stderr)
            print(f"[AITeamExecutor] 目標: {goal}", file=sys.stderr)
            
            # 創建執行狀態
            execution = AITeamExecution(
                id=execution_id,
                goal=goal,
                intent=intent,
                strategy=strategy,
                roles=roles,
                marketing_data=marketing_data
            )
            
            self.executions[execution_id] = execution
            
            # 選擇目標用戶
            await self.select_target_users(execution)
            
            if not execution.target_users:
                self.send_log("⚠️ 沒有找到目標用戶", "warning")
                return False
            
            self.send_log(f"🎯 找到 {len(execution.target_users)} 個目標用戶", "info")
            
            # 開始執行
            asyncio.create_task(self.run_execution(execution_id))
            
            return True
            
        except Exception as e:
            print(f"[AITeamExecutor] 啟動失敗: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            self.send_log(f"❌ AI 團隊啟動失敗: {e}", "error")
            return False
    
    async def select_target_users(self, execution: AITeamExecution):
        """選擇目標用戶"""
        try:
            # 優先從 unified_contacts 獲取
            from unified_contacts import get_unified_contacts_manager
            
            manager = get_unified_contacts_manager(self.db)
            
            # 根據策略篩選用戶
            filters = {
                'contact_type': 'user',
                'status': ['new', 'contacted']  # 新用戶和已聯繫的
            }
            
            # 如果有關鍵詞，可以進一步篩選（未來擴展）
            
            result = await manager.get_contacts(filters, limit=50)
            
            if result.get('success') and result.get('contacts'):
                execution.target_users = result['contacts']
                print(f"[AITeamExecutor] 從 unified_contacts 獲取 {len(execution.target_users)} 個用戶", file=sys.stderr)
            else:
                # 回退到 captured_leads
                leads = await self.db.get_all_leads()
                execution.target_users = [
                    {
                        'telegram_id': str(lead.get('user_id', '')),
                        'username': lead.get('username', ''),
                        'first_name': lead.get('first_name', ''),
                        'last_name': lead.get('last_name', ''),
                        'source_name': lead.get('source_group', '')
                    }
                    for lead in leads
                    if lead.get('status') != 'Closed-Won'  # 排除已成交
                ]
                print(f"[AITeamExecutor] 從 captured_leads 獲取 {len(execution.target_users)} 個用戶", file=sys.stderr)
                
        except Exception as e:
            print(f"[AITeamExecutor] 選擇用戶失敗: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
    
    async def run_execution(self, execution_id: str):
        """運行執行任務"""
        try:
            execution = self.executions.get(execution_id)
            if not execution:
                return
            
            strategy = execution.strategy or {}
            phases = strategy.get('phases', [])
            marketing_data = execution.marketing_data or {}
            message_templates = marketing_data.get('messageTemplates', {})
            
            # 獲取可用帳號
            accounts = await self.db.get_all_accounts()
            available_accounts = [a for a in accounts if a.get('status') == 'active']
            
            if not available_accounts:
                self.send_log("⚠️ 沒有可用的帳號執行 AI 任務", "warning")
                return
            
            print(f"[AITeamExecutor] 可用帳號: {len(available_accounts)}", file=sys.stderr)
            
            # 執行各個階段
            for phase_idx, phase in enumerate(phases if phases else [{'name': '默認階段'}]):
                if not self._is_running(execution_id):
                    print(f"[AITeamExecutor] 執行已暫停或停止", file=sys.stderr)
                    break
                
                phase_name = phase.get('name', f'階段 {phase_idx + 1}')
                print(f"[AITeamExecutor] 進入階段: {phase_name}", file=sys.stderr)
                
                # 通知前端階段變化
                self.send_event("ai-team:phase-changed", {
                    "executionId": execution_id,
                    "phase": phase_idx,
                    "phaseName": phase_name
                })
                
                execution.current_phase = phase_idx
                
                # 選擇本階段的消息模板
                if phase_idx == 0:
                    template = message_templates.get('firstTouch', '')
                elif phase_idx == len(phases) - 1:
                    template = message_templates.get('closing', '')
                else:
                    template = message_templates.get('followUp', '')
                
                # 向目標用戶發送消息
                await self.send_phase_messages(
                    execution,
                    phase_idx,
                    template,
                    available_accounts
                )
                
                # 階段間隔
                if self._is_running(execution_id):
                    interval = random.randint(60, 180)
                    print(f"[AITeamExecutor] 階段間隔: {interval}秒", file=sys.stderr)
                    await asyncio.sleep(interval)
            
            # 執行完成
            if execution_id in self.executions:
                execution = self.executions[execution_id]
                execution.status = 'completed'
                
                self.send_event("ai-team:execution-completed", {
                    "executionId": execution_id,
                    "totalSent": execution.messages_sent,
                    "totalResponses": execution.responses_received
                })
                
                self.send_log(f"✅ AI 團隊任務完成: 發送 {execution.messages_sent} 條消息", "success")
            
        except Exception as e:
            print(f"[AITeamExecutor] 執行錯誤: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            self.send_log(f"❌ AI 團隊執行錯誤: {e}", "error")
    
    async def send_phase_messages(
        self,
        execution: AITeamExecution,
        phase_idx: int,
        template: str,
        accounts: List[Dict]
    ):
        """發送階段消息"""
        # 選擇本階段要發送的用戶（未發送過的）
        users_to_send = [
            u for u in execution.target_users
            if u.get('telegram_id') not in execution.sent_to
        ]
        
        # 限制每階段發送數量
        max_per_phase = min(10, len(users_to_send))
        users_to_send = users_to_send[:max_per_phase]
        
        if not users_to_send:
            print(f"[AITeamExecutor] 階段 {phase_idx}: 沒有新用戶可發送", file=sys.stderr)
            return
        
        print(f"[AITeamExecutor] 階段 {phase_idx}: 準備發送給 {len(users_to_send)} 個用戶", file=sys.stderr)
        
        for user in users_to_send:
            if not self._is_running(execution.id):
                break
            
            try:
                # 生成個性化消息
                message = self.generate_personalized_message(template, user, execution)
                
                # 選擇帳號（輪換）
                account = random.choice(accounts)
                phone = account.get('phone')
                
                user_id = user.get('telegram_id')
                username = user.get('username', '')
                
                print(f"[AITeamExecutor] 發送消息: {phone} -> {user_id} ({username})", file=sys.stderr)
                
                # 通過消息隊列發送
                message_id = await self.message_queue.add_message(
                    phone=phone,
                    user_id=user_id,
                    text=message,
                    attachment=None,
                    source_group=user.get('source_name', ''),
                    target_username=username
                )
                
                # 更新統計
                execution.messages_sent += 1
                execution.sent_to.append(user_id)
                
                # 通知前端
                self.send_event("ai-team:message-sent", {
                    "executionId": execution.id,
                    "totalSent": execution.messages_sent,
                    "message": message[:50],
                    "targetUser": username or user_id
                })
                
                # 發送間隔（隨機 30-90 秒）
                interval = random.randint(30, 90)
                await asyncio.sleep(interval)
                
            except Exception as e:
                print(f"[AITeamExecutor] 發送失敗: {e}", file=sys.stderr)
                self.send_log(f"⚠️ 發送失敗: {e}", "warning")
    
    def generate_personalized_message(
        self,
        template: str,
        user: Dict[str, Any],
        execution: AITeamExecution
    ) -> str:
        """生成個性化消息"""
        if not template:
            # 使用默認模板
            marketing_data = execution.marketing_data or {}
            industry = marketing_data.get('industry', '這個行業')
            template = f"您好！我是專注於{industry}的顧問，看到您在群裡的發言，很高興認識您！方便聊聊嗎？"
        
        # 變量替換
        first_name = user.get('first_name', '')
        last_name = user.get('last_name', '')
        username = user.get('username', '')
        display_name = first_name or username or '朋友'
        
        message = template
        message = message.replace('{first_name}', first_name)
        message = message.replace('{last_name}', last_name)
        message = message.replace('{username}', username)
        message = message.replace('{name}', display_name)
        message = message.replace('{display_name}', display_name)
        
        return message
    
    def _is_running(self, execution_id: str) -> bool:
        """檢查執行是否仍在運行"""
        execution = self.executions.get(execution_id)
        return execution is not None and execution.status == 'running'
    
    def pause_execution(self, execution_id: str) -> bool:
        """暫停執行"""
        if execution_id in self.executions:
            self.executions[execution_id].status = 'paused'
            self.send_log(f"⏸️ AI 團隊任務已暫停", "info")
            return True
        return False
    
    def resume_execution(self, execution_id: str) -> bool:
        """恢復執行"""
        if execution_id in self.executions:
            self.executions[execution_id].status = 'running'
            self.send_log(f"▶️ AI 團隊任務已恢復", "info")
            # 繼續執行
            asyncio.create_task(self.run_execution(execution_id))
            return True
        return False
    
    def stop_execution(self, execution_id: str) -> bool:
        """停止執行"""
        if execution_id in self.executions:
            self.executions[execution_id].status = 'stopped'
            del self.executions[execution_id]
            self.send_log(f"⏹️ AI 團隊任務已停止", "info")
            return True
        return False
    
    async def handle_user_reply(self, user_id: str, message_text: str):
        """處理用戶回覆"""
        # 找到對應的執行任務
        for execution_id, execution in self.executions.items():
            if user_id in execution.sent_to:
                execution.responses_received += 1
                
                # 分析回覆意圖
                intent = self.analyze_reply_intent(message_text)
                
                # 計算興趣度
                interest_score = self.calculate_interest_score(intent, execution)
                
                # 通知前端
                self.send_event("ai-team:response-received", {
                    "executionId": execution_id,
                    "totalResponses": execution.responses_received,
                    "interestScore": interest_score,
                    "userId": user_id,
                    "intent": intent
                })
                
                self.send_log(f"💬 收到回覆: {message_text[:30]}... (意圖: {intent})", "info")
                
                # TODO: 根據意圖動態調整策略
                break
    
    def analyze_reply_intent(self, message_text: str) -> str:
        """分析回覆意圖"""
        text = message_text.lower()
        
        # 正面意圖
        positive_keywords = ['好', '可以', '行', '有興趣', '想了解', '怎麼', '價格', '多少']
        if any(kw in text for kw in positive_keywords):
            return 'interested'
        
        # 負面意圖
        negative_keywords = ['不', '沒', '不要', '不需要', '別', '滾', '騙子']
        if any(kw in text for kw in negative_keywords):
            return 'rejected'
        
        # 詢問意圖
        question_keywords = ['什麼', '怎麼', '為什麼', '哪裡', '誰', '?', '？']
        if any(kw in text for kw in question_keywords):
            return 'question'
        
        return 'neutral'
    
    def calculate_interest_score(self, intent: str, execution: AITeamExecution) -> int:
        """計算興趣度分數"""
        base_score = 50
        
        if intent == 'interested':
            base_score += 30
        elif intent == 'question':
            base_score += 15
        elif intent == 'rejected':
            base_score -= 20
        
        # 根據回覆率調整
        if execution.messages_sent > 0:
            reply_rate = execution.responses_received / execution.messages_sent
            base_score += int(reply_rate * 20)
        
        return min(100, max(0, base_score))


# 全局實例
_ai_team_executor: Optional[AITeamExecutor] = None


def get_ai_team_executor(
    message_queue: Any = None,
    database: Any = None,
    send_event: Callable = None,
    send_log: Callable = None
) -> AITeamExecutor:
    """獲取 AI 團隊執行器實例"""
    global _ai_team_executor
    
    if _ai_team_executor is None and message_queue:
        _ai_team_executor = AITeamExecutor(
            message_queue=message_queue,
            database=database,
            send_event=send_event,
            send_log=send_log
        )
    
    return _ai_team_executor
