"""
自動化工作流服務
Automation Workflow Service

🆕 Phase 3：全鏈路智能營銷自動化後端

功能：
- 處理 AI 策劃請求
- 自動建群
- 私聊協作執行
- 組群營銷
"""

import asyncio
import logging
import json
import random
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict

logger = logging.getLogger(__name__)


@dataclass
class WorkflowExecution:
    """工作流執行實例"""
    id: str
    workflow_id: str
    target_user_id: str
    target_user_name: str
    current_step: str
    status: str  # pending, running, completed, failed, cancelled
    step_results: Dict[str, Any] = field(default_factory=dict)
    ai_plan_result: Optional[Dict] = None
    session_id: Optional[str] = None
    group_id: Optional[str] = None
    started_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    completed_at: Optional[str] = None
    outcome: Optional[str] = None  # converted, interested, neutral, rejected, no_response


class AutomationWorkflowService:
    """自動化工作流服務"""
    
    def __init__(self, telegram_client=None, ai_service=None):
        self.telegram_client = telegram_client
        self.ai_service = ai_service
        self.executions: Dict[str, WorkflowExecution] = {}
        self._running = False
        
        # 預設角色模板
        self.role_templates = {
            'closer': {
                'id': 'closer',
                'name': '成交專家',
                'icon': '💼',
                'desc': '負責最終成交',
                'style': 'professional',
                'keywords': ['價格', '優惠', '成交']
            },
            'expert': {
                'id': 'expert',
                'name': '產品專家',
                'icon': '🎓',
                'desc': '回答專業問題',
                'style': 'knowledgeable',
                'keywords': ['功能', '技術', '詳情']
            },
            'supporter': {
                'id': 'supporter',
                'name': '客服支持',
                'icon': '🤝',
                'desc': '處理疑慮',
                'style': 'empathetic',
                'keywords': ['問題', '幫助', '支持']
            },
            'testimonial': {
                'id': 'testimonial',
                'name': '見證者',
                'icon': '⭐',
                'desc': '分享使用經驗',
                'style': 'enthusiastic',
                'keywords': ['效果', '經驗', '推薦']
            },
            'connector': {
                'id': 'connector',
                'name': '社交達人',
                'icon': '🌟',
                'desc': '建立信任關係',
                'style': 'friendly',
                'keywords': ['聊天', '朋友', '交流']
            }
        }
        
        logger.info("[AutomationWorkflow] 服務已初始化")
    
    async def handle_ai_plan(self, data: Dict) -> Dict:
        """
        處理 AI 策劃請求
        
        Args:
            data: {
                goal: str,  # 營銷目標
                targetUsers: List[Dict],  # 目標用戶
                autoExecute: bool,  # 是否自動執行
                workflowExecutionId: str  # 工作流執行 ID
            }
        
        Returns:
            策劃結果
        """
        goal = data.get('goal', '促進成交')
        target_users = data.get('targetUsers', [])
        auto_execute = data.get('autoExecute', False)
        
        logger.info(f"[AutomationWorkflow] AI 策劃請求: 目標={goal}, 用戶數={len(target_users)}")
        
        try:
            # 分析目標用戶
            user_count = len(target_users) if target_users else 1
            
            # 根據目標選擇角色組合
            recommended_roles = self._recommend_roles(goal, user_count)
            
            # 生成策略建議
            strategy = self._generate_strategy(goal, recommended_roles)
            
            # 生成話術模板
            scripts = self._generate_scripts(goal, recommended_roles)
            
            result = {
                'success': True,
                'goal': goal,
                'recommendedRoles': recommended_roles,
                'strategy': strategy,
                'scripts': scripts,
                'estimatedDuration': self._estimate_duration(len(recommended_roles)),
                'conversionProbability': self._estimate_conversion(goal),
                'autoExecute': auto_execute
            }
            
            logger.info(f"[AutomationWorkflow] AI 策劃完成: {len(recommended_roles)} 個角色")
            return result
            
        except Exception as e:
            logger.error(f"[AutomationWorkflow] AI 策劃失敗: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _recommend_roles(self, goal: str, user_count: int) -> List[Dict]:
        """根據目標推薦角色組合"""
        
        # 基礎角色配置
        role_configs = {
            '促進成交': ['closer', 'expert', 'testimonial'],
            '品牌推廣': ['connector', 'testimonial', 'expert'],
            '用戶培育': ['supporter', 'expert', 'connector'],
            '收集反饋': ['supporter', 'connector']
        }
        
        role_ids = role_configs.get(goal, ['closer', 'expert', 'supporter'])
        
        # 確保角色數量合理
        max_roles = min(len(role_ids), user_count + 2)
        role_ids = role_ids[:max_roles]
        
        # 構建角色詳情
        roles = []
        for role_id in role_ids:
            template = self.role_templates.get(role_id, self.role_templates['closer'])
            roles.append({
                **template,
                'priority': len(roles) + 1
            })
        
        return roles
    
    def _generate_strategy(self, goal: str, roles: List[Dict]) -> Dict:
        """生成策略建議"""
        
        strategies = {
            '促進成交': {
                'name': '快速成交策略',
                'description': '通過專業產品介紹和見證分享，快速建立信任並促成交易',
                'steps': [
                    '產品專家介紹核心功能',
                    '見證者分享使用經驗',
                    '成交專家提供優惠方案',
                    '處理異議並促成下單'
                ],
                'keyPoints': ['強調價值', '限時優惠', '消除顧慮']
            },
            '品牌推廣': {
                'name': '品牌曝光策略',
                'description': '通過社交互動和價值分享，提升品牌知名度',
                'steps': [
                    '社交達人建立聯繫',
                    '分享行業見解',
                    '展示品牌價值',
                    '引導關注和互動'
                ],
                'keyPoints': ['專業形象', '價值輸出', '互動參與']
            },
            '用戶培育': {
                'name': '長期培育策略',
                'description': '通過持續互動和價值提供，建立深度信任關係',
                'steps': [
                    '客服支持解答問題',
                    '專家提供專業建議',
                    '社交達人保持互動',
                    '適時引導深入了解'
                ],
                'keyPoints': ['耐心培育', '價值優先', '建立信任']
            },
            '收集反饋': {
                'name': '反饋收集策略',
                'description': '通過友好交流收集用戶意見和需求',
                'steps': [
                    '客服建立聯繫',
                    '了解使用情況',
                    '收集改進建議',
                    '記錄反饋數據'
                ],
                'keyPoints': ['真誠溝通', '認真傾聽', '及時回應']
            }
        }
        
        return strategies.get(goal, strategies['促進成交'])
    
    def _generate_scripts(self, goal: str, roles: List[Dict]) -> List[Dict]:
        """生成話術模板"""
        scripts = []
        
        for i, role in enumerate(roles):
            role_id = role.get('id', 'closer')
            
            script = {
                'roleId': role_id,
                'roleName': role.get('name', '角色'),
                'stage': i + 1,
                'templates': self._get_role_scripts(role_id, goal)
            }
            scripts.append(script)
        
        return scripts
    
    def _get_role_scripts(self, role_id: str, goal: str) -> List[Dict]:
        """獲取角色話術"""
        
        all_scripts = {
            'closer': {
                '促進成交': [
                    {'trigger': 'price', 'response': '現在正好有優惠活動，{product}原價{original_price}，活動價只要{sale_price}！'},
                    {'trigger': 'hesitate', 'response': '我理解您的顧慮，很多客戶一開始也有同樣的想法，但使用後都非常滿意'},
                    {'trigger': 'ready', 'response': '太好了！我現在就幫您安排，請問您方便用哪種付款方式？'}
                ]
            },
            'expert': {
                '促進成交': [
                    {'trigger': 'feature', 'response': '這個功能非常實用，主要可以幫您解決{pain_point}的問題'},
                    {'trigger': 'compare', 'response': '相比其他產品，我們的優勢在於{advantage}'},
                    {'trigger': 'technical', 'response': '技術上我們採用{technology}，確保{benefit}'}
                ]
            },
            'supporter': {
                '促進成交': [
                    {'trigger': 'concern', 'response': '您的擔心完全可以理解，我們有{guarantee}保障'},
                    {'trigger': 'help', 'response': '有任何問題隨時找我，我們提供{support_type}服務'},
                    {'trigger': 'issue', 'response': '這個問題我來幫您解決，請給我{time}時間'}
                ]
            },
            'testimonial': {
                '促進成交': [
                    {'trigger': 'experience', 'response': '我用了{duration}了，效果真的很好，特別是{highlight}'},
                    {'trigger': 'recommend', 'response': '我已經推薦給好幾個朋友了，他們都很滿意'},
                    {'trigger': 'result', 'response': '自從用了這個，我的{metric}提升了{improvement}'}
                ]
            },
            'connector': {
                '促進成交': [
                    {'trigger': 'intro', 'response': '很高興認識你！我也是{interest}愛好者'},
                    {'trigger': 'chat', 'response': '對啊，我也有同樣的感覺，{topic}確實很重要'},
                    {'trigger': 'bridge', 'response': '說到這個，我認識一個專家，要不要介紹給你？'}
                ]
            }
        }
        
        role_scripts = all_scripts.get(role_id, {})
        return role_scripts.get(goal, role_scripts.get('促進成交', []))
    
    def _estimate_duration(self, role_count: int) -> str:
        """估算執行時長"""
        base_minutes = 15
        per_role_minutes = 5
        total = base_minutes + (role_count * per_role_minutes)
        return f"{total}-{total + 10} 分鐘"
    
    def _estimate_conversion(self, goal: str) -> float:
        """估算轉化率"""
        rates = {
            '促進成交': 0.35,
            '品牌推廣': 0.15,
            '用戶培育': 0.25,
            '收集反饋': 0.60
        }
        return rates.get(goal, 0.30)
    
    async def handle_analyze_interest(self, data: Dict) -> Dict:
        """
        分析用戶興趣信號
        
        Args:
            data: {
                message: str,  # 用戶消息
                context: str,  # 對話上下文
                analysisType: str  # 分析類型
            }
        """
        message = data.get('message', '')
        context = data.get('context', '')
        
        logger.info(f"[AutomationWorkflow] 分析興趣信號: {message[:50]}...")
        
        # 興趣信號關鍵詞
        interest_signals = {
            'price': ['多少錢', '價格', '費用', '收費', '怎麼收'],
            'buying': ['怎麼買', '在哪買', '我要', '我想買', '下單', '購買'],
            'positive': ['不錯', '挺好', '可以', '行', '好的', '感興趣'],
            'detail': ['怎麼用', '有什麼功能', '詳細介紹', '了解一下'],
            'compare': ['比', '對比', '區別', '差別', '哪個好']
        }
        
        message_lower = message.lower()
        detected_type = None
        detected_keyword = None
        confidence = 0.5
        
        for signal_type, keywords in interest_signals.items():
            for keyword in keywords:
                if keyword in message_lower:
                    detected_type = signal_type
                    detected_keyword = keyword
                    confidence = 0.8 if signal_type in ['price', 'buying'] else 0.7
                    break
            if detected_type:
                break
        
        has_interest = detected_type is not None
        
        return {
            'success': True,
            'hasInterest': has_interest,
            'signalType': detected_type,
            'keyPhrase': detected_keyword,
            'confidence': confidence
        }
    
    async def handle_auto_create_group(self, data: Dict) -> Dict:
        """
        自動創建群組
        
        Args:
            data: {
                groupName: str,  # 群組名稱
                targetUserId: str,  # 目標用戶 ID
                workflowExecutionId: str,  # 工作流執行 ID
                creatorPhone: str,  # 創建者帳號
                memberPhones: List[str]  # 成員帳號列表
            }
        """
        group_name = data.get('groupName', 'VIP 服務群')
        target_user_id = data.get('targetUserId')
        execution_id = data.get('workflowExecutionId')
        creator_phone = data.get('creatorPhone')
        member_phones = data.get('memberPhones', [])
        
        logger.info(f"[AutomationWorkflow] 自動建群: {group_name}, 用戶: {target_user_id}")
        
        try:
            # 嘗試使用真實 Telegram 客戶端
            if self.telegram_client and creator_phone:
                try:
                    # 獲取創建者客戶端
                    creator_client = self.telegram_client.clients.get(creator_phone)
                    
                    if creator_client and creator_client.is_connected:
                        logger.info(f"[AutomationWorkflow] 使用 {creator_phone} 創建群組")
                        
                        # 收集要邀請的用戶
                        users_to_invite = []
                        
                        # 添加目標用戶
                        if target_user_id:
                            users_to_invite.append(int(target_user_id))
                        
                        # 添加成員帳號的用戶 ID
                        for phone in member_phones:
                            member_client = self.telegram_client.clients.get(phone)
                            if member_client and member_client.is_connected:
                                try:
                                    me = await member_client.get_me()
                                    users_to_invite.append(me.id)
                                except Exception as e:
                                    logger.warning(f"[AutomationWorkflow] 無法獲取 {phone} 的用戶 ID: {e}")
                        
                        # 創建群組
                        if users_to_invite:
                            chat = await creator_client.create_group(
                                title=group_name,
                                users=users_to_invite
                            )
                            
                            group_id = str(chat.id)
                            logger.info(f"[AutomationWorkflow] 群組創建成功: {group_id}")
                            
                            # 更新統計
                            self._update_analytics('group_created')
                            
                            return {
                                'success': True,
                                'groupId': group_id,
                                'groupName': group_name,
                                'message': '群組創建成功',
                                'memberCount': len(users_to_invite)
                            }
                        else:
                            logger.warning("[AutomationWorkflow] 沒有可邀請的用戶")
                            
                except Exception as tg_error:
                    logger.error(f"[AutomationWorkflow] Telegram 建群失敗: {tg_error}")
                    # 繼續使用模擬模式
            
            # 模擬建群（用於測試或客戶端不可用時）
            logger.info("[AutomationWorkflow] 使用模擬模式建群")
            group_id = f"group_{int(datetime.now().timestamp())}"
            
            # 更新統計
            self._update_analytics('group_created')
            
            return {
                'success': True,
                'groupId': group_id,
                'groupName': group_name,
                'message': '群組創建成功（模擬模式）',
                'simulated': True
            }
            
        except Exception as e:
            logger.error(f"[AutomationWorkflow] 建群失敗: {e}")
            self._update_analytics('group_failed')
            return {
                'success': False,
                'error': str(e)
            }
    
    def _update_analytics(self, event_type: str) -> None:
        """更新分析數據"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        if not hasattr(self, '_analytics'):
            self._analytics = {
                'daily': {},
                'totals': {
                    'triggers': 0,
                    'plans': 0,
                    'private_chats': 0,
                    'groups_created': 0,
                    'conversions': 0
                }
            }
        
        if today not in self._analytics['daily']:
            self._analytics['daily'][today] = {
                'triggers': 0,
                'plans': 0,
                'private_chats': 0,
                'groups_created': 0,
                'conversions': 0
            }
        
        event_map = {
            'trigger': 'triggers',
            'plan': 'plans',
            'private_chat': 'private_chats',
            'group_created': 'groups_created',
            'group_failed': 'groups_created',  # 也計入嘗試
            'conversion': 'conversions'
        }
        
        key = event_map.get(event_type)
        if key:
            self._analytics['daily'][today][key] = self._analytics['daily'][today].get(key, 0) + 1
            self._analytics['totals'][key] = self._analytics['totals'].get(key, 0) + 1
    
    def get_analytics(self) -> Dict:
        """獲取分析數據"""
        if not hasattr(self, '_analytics'):
            return {'daily': {}, 'totals': {}}
        
        # 計算轉化率
        totals = self._analytics['totals']
        conversion_rate = 0
        if totals.get('triggers', 0) > 0:
            conversion_rate = (totals.get('conversions', 0) / totals['triggers']) * 100
        
        return {
            **self._analytics,
            'conversionRate': round(conversion_rate, 2),
            'activeExecutions': len([e for e in self.executions.values() if e.status == 'running'])
        }
    
    async def handle_start_private_collaboration(self, data: Dict) -> Dict:
        """
        開始私聊協作
        
        Args:
            data: {
                targetUserId: str,
                targetUserName: str,
                aiPlanResult: Dict,
                workflowExecutionId: str
            }
        """
        target_user_id = data.get('targetUserId')
        target_user_name = data.get('targetUserName', 'User')
        ai_plan = data.get('aiPlanResult', {})
        execution_id = data.get('workflowExecutionId')
        
        logger.info(f"[AutomationWorkflow] 開始私聊協作: 用戶={target_user_name}")
        
        try:
            # 創建執行實例
            execution = WorkflowExecution(
                id=execution_id or f"exec_{int(datetime.now().timestamp())}",
                workflow_id='default_marketing',
                target_user_id=target_user_id,
                target_user_name=target_user_name,
                current_step='private_chat',
                status='running',
                ai_plan_result=ai_plan
            )
            
            self.executions[execution.id] = execution
            
            # 獲取推薦角色
            roles = ai_plan.get('recommendedRoles', [])
            
            # 開始協作（實際邏輯需要調用 Telegram 客戶端）
            logger.info(f"[AutomationWorkflow] 協作已開始: {len(roles)} 個角色參與")
            
            return {
                'success': True,
                'executionId': execution.id,
                'rolesCount': len(roles),
                'message': '私聊協作已開始'
            }
            
        except Exception as e:
            logger.error(f"[AutomationWorkflow] 開始私聊失敗: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def handle_start_group_collaboration(self, data: Dict) -> Dict:
        """
        開始組群營銷
        
        Args:
            data: {
                groupId: str,
                aiPlanResult: Dict,
                workflowExecutionId: str
            }
        """
        group_id = data.get('groupId')
        ai_plan = data.get('aiPlanResult', {})
        execution_id = data.get('workflowExecutionId')
        
        logger.info(f"[AutomationWorkflow] 開始組群營銷: 群組={group_id}")
        
        try:
            # 更新執行實例
            if execution_id and execution_id in self.executions:
                self.executions[execution_id].group_id = group_id
                self.executions[execution_id].current_step = 'group_marketing'
            
            roles = ai_plan.get('recommendedRoles', [])
            scripts = ai_plan.get('scripts', [])
            
            logger.info(f"[AutomationWorkflow] 組群營銷已開始: {len(roles)} 個角色")
            
            return {
                'success': True,
                'groupId': group_id,
                'rolesCount': len(roles),
                'scriptsCount': len(scripts),
                'message': '組群營銷已開始'
            }
            
        except Exception as e:
            logger.error(f"[AutomationWorkflow] 開始組群營銷失敗: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_execution(self, execution_id: str) -> Optional[Dict]:
        """獲取執行實例"""
        execution = self.executions.get(execution_id)
        if execution:
            return asdict(execution)
        return None
    
    def get_all_executions(self) -> List[Dict]:
        """獲取所有執行實例"""
        return [asdict(e) for e in self.executions.values()]
    
    def update_execution(self, execution_id: str, updates: Dict) -> bool:
        """更新執行實例"""
        if execution_id not in self.executions:
            return False
        
        execution = self.executions[execution_id]
        for key, value in updates.items():
            if hasattr(execution, key):
                setattr(execution, key, value)
        
        execution.updated_at = datetime.now().isoformat()
        return True
    
    def cancel_execution(self, execution_id: str) -> bool:
        """取消執行"""
        if execution_id not in self.executions:
            return False
        
        execution = self.executions[execution_id]
        execution.status = 'cancelled'
        execution.completed_at = datetime.now().isoformat()
        return True


# 全局實例
automation_workflow_service: Optional[AutomationWorkflowService] = None


def get_automation_workflow_service() -> AutomationWorkflowService:
    """獲取服務實例"""
    global automation_workflow_service
    if automation_workflow_service is None:
        automation_workflow_service = AutomationWorkflowService()
    return automation_workflow_service
