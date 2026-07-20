"""
Group Message Poller - 群組消息輪詢服務
🔧 Phase 1: 使用輪詢模式替代事件驅動，確保群組 AI 回覆可靠性
"""
import sys
import asyncio
import random
from typing import Dict, Set, Optional, Callable, Any, List
from datetime import datetime, timedelta
from pyrogram import Client
from pyrogram.enums import ChatType


class GroupMessagePoller:
    """群組消息輪詢服務 - 確保多角色協作中的群聊 AI 回覆"""
    
    def __init__(self, event_callback: Optional[Callable] = None):
        self.event_callback = event_callback
        self._polling_tasks: Dict[str, asyncio.Task] = {}  # group_id -> task
        self._processed_message_ids: Set[str] = set()
        self._max_processed_cache = 5000
        self._polling_interval = 3  # 群聊輪詢間隔（秒）
        self._running = False
        
        # 活躍的群組協作配置
        self._active_collabs: Dict[str, Dict[str, Any]] = {}
        # group_id -> {
        #   'roles': [...],
        #   'clients': {phone: Client},
        #   'main_phone': str,
        #   'last_responder': str,
        #   'own_user_ids': Set[int],  # 所有角色帳號的用戶 ID
        # }
    
    def log(self, message: str, level: str = "info"):
        """記錄日誌"""
        formatted = f"[GroupPoller] {message}"
        print(formatted, file=sys.stderr)
        if self.event_callback:
            self.event_callback("log-entry", {
                "message": formatted,
                "type": level
            })
    
    def _make_message_key(self, group_id: str, message_id: int) -> str:
        """生成消息唯一鍵"""
        return f"{group_id}:{message_id}"
    
    def _is_processed(self, group_id: str, message_id: int) -> bool:
        """檢查消息是否已處理"""
        return self._make_message_key(group_id, message_id) in self._processed_message_ids
    
    def _mark_processed(self, group_id: str, message_id: int):
        """標記消息為已處理"""
        key = self._make_message_key(group_id, message_id)
        self._processed_message_ids.add(key)
        
        # 防止內存溢出
        if len(self._processed_message_ids) > self._max_processed_cache:
            to_remove = list(self._processed_message_ids)[:self._max_processed_cache // 2]
            for item in to_remove:
                self._processed_message_ids.discard(item)
    
    async def start_group_collab(
        self,
        group_id: str,
        roles: List[Dict[str, Any]],
        clients: Dict[str, Client],
        main_phone: str
    ):
        """
        啟動群組協作監控
        
        Args:
            group_id: 群組 ID
            roles: 角色配置列表 [{phone, roleName, prompt, ...}]
            clients: 所有客戶端 {phone: Client}
            main_phone: 主帳號電話
        """
        group_id = str(group_id)
        
        self.log(f"🚀 啟動群組 {group_id} 協作監控，角色數: {len(roles)}")
        
        # 收集所有角色帳號的用戶 ID
        own_user_ids = set()
        for role in roles:
            phone = role.get('phone')
            client = clients.get(phone)
            if client and client.is_connected:
                try:
                    me = await client.get_me()
                    own_user_ids.add(me.id)
                    self.log(f"  ✓ 角色 {role.get('roleName', phone)}: user_id={me.id}")
                except Exception as e:
                    self.log(f"  ⚠ 獲取 {phone} 用戶 ID 失敗: {e}", "warning")
        
        # 保存協作配置
        self._active_collabs[group_id] = {
            'roles': roles,
            'clients': clients,
            'main_phone': main_phone,
            'last_responder': None,
            'own_user_ids': own_user_ids,
            'started_at': datetime.now().isoformat()
        }
        
        # 啟動輪詢任務
        if group_id in self._polling_tasks and not self._polling_tasks[group_id].done():
            self._polling_tasks[group_id].cancel()
        
        self._running = True
        task = asyncio.create_task(self._poll_group(group_id))
        self._polling_tasks[group_id] = task
        
        self.log(f"✓ 群組 {group_id} 輪詢任務已啟動，監控 {len(own_user_ids)} 個角色帳號")
        
        return {"success": True, "roles": len(roles), "ownUserIds": list(own_user_ids)}
    
    async def stop_group_collab(self, group_id: str):
        """停止群組協作監控"""
        group_id = str(group_id)
        
        if group_id in self._polling_tasks:
            task = self._polling_tasks[group_id]
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            del self._polling_tasks[group_id]
        
        if group_id in self._active_collabs:
            del self._active_collabs[group_id]
        
        self.log(f"🛑 群組 {group_id} 協作監控已停止")
    
    async def stop_all(self):
        """停止所有群組監控"""
        self._running = False
        
        for group_id in list(self._polling_tasks.keys()):
            await self.stop_group_collab(group_id)
        
        self.log("🛑 所有群組協作監控已停止")
    
    async def _poll_group(self, group_id: str):
        """
        輪詢指定群組的消息
        """
        self.log(f"📡 開始輪詢群組 {group_id}")
        
        while self._running and group_id in self._active_collabs:
            try:
                await self._check_group_messages(group_id)
            except asyncio.CancelledError:
                break
            except Exception as e:
                error_str = str(e).lower()
                if 'flood' in error_str:
                    self.log(f"API 限流，等待 30 秒...", "warning")
                    await asyncio.sleep(30)
                elif 'disconnect' in error_str:
                    self.log(f"連接問題: {e}", "warning")
                    await asyncio.sleep(10)
                else:
                    self.log(f"輪詢錯誤: {e}", "error")
                    import traceback
                    traceback.print_exc(file=sys.stderr)
            
            await asyncio.sleep(self._polling_interval)
        
        self.log(f"📡 群組 {group_id} 輪詢已結束")
    
    async def _check_group_messages(self, group_id: str):
        """檢查群組的新消息"""
        collab = self._active_collabs.get(group_id)
        if not collab:
            return
        
        clients = collab.get('clients', {})
        own_user_ids = collab.get('own_user_ids', set())
        
        # 使用主帳號讀取群組消息
        main_phone = collab.get('main_phone')
        client = clients.get(main_phone)
        
        if not client or not client.is_connected:
            # 嘗試使用其他連接的客戶端
            for phone, c in clients.items():
                if c and c.is_connected:
                    client = c
                    break
        
        if not client or not client.is_connected:
            return
        
        try:
            # 獲取最近的群組消息
            group_id_int = int(group_id)
            messages = []
            
            async for message in client.get_chat_history(group_id_int, limit=10):
                # 只處理文本消息
                if not message.text and not message.caption:
                    continue
                
                # 跳過自己發送的消息
                if message.from_user and message.from_user.id in own_user_ids:
                    continue
                
                # 跳過太舊的消息（超過 5 分鐘）
                if message.date:
                    msg_time = message.date
                    if datetime.now(msg_time.tzinfo) - msg_time > timedelta(minutes=5):
                        continue
                
                messages.append(message)
            
            # 按時間順序處理（從舊到新）
            messages.reverse()
            
            for message in messages:
                await self._process_group_message(group_id, collab, message)
                
        except Exception as e:
            error_str = str(e).lower()
            if 'peer_id_invalid' in error_str or 'chat_not_found' in error_str:
                self.log(f"群組 {group_id} 不存在或無權訪問", "warning")
            else:
                raise
    
    async def _process_group_message(
        self,
        group_id: str,
        collab: Dict[str, Any],
        message
    ):
        """處理單條群組消息"""
        try:
            # 去重檢查
            if self._is_processed(group_id, message.id):
                return
            
            # 標記為已處理
            self._mark_processed(group_id, message.id)
            
            # 獲取消息內容
            text = message.text or message.caption or ""
            if not text.strip():
                return
            
            # 獲取發送者信息
            user = message.from_user
            if not user:
                return
            
            sender_id = user.id
            sender_name = user.first_name or user.username or f"User_{sender_id}"
            
            self.log(f"📨 群組 {group_id} 收到消息: {sender_name}: {text[:50]}...")
            
            # 發送前端事件
            if self.event_callback:
                self.event_callback("group:message-received", {
                    "groupId": group_id,
                    "senderId": str(sender_id),
                    "senderName": sender_name,
                    "text": text,
                    "messageId": message.id,
                    "timestamp": datetime.now().isoformat()
                })
            
            # 選擇角色回覆
            responding_role = self._select_responding_role(collab, text)
            if not responding_role:
                self.log(f"無合適角色回覆此消息", "warning")
                return
            
            # 生成 AI 回覆
            await self._generate_and_send_reply(
                group_id=group_id,
                collab=collab,
                role=responding_role,
                sender_id=sender_id,
                sender_name=sender_name,
                message_text=text
            )
            
        except Exception as e:
            self.log(f"處理群消息失敗: {e}", "error")
            import traceback
            traceback.print_exc(file=sys.stderr)
    
    def _select_responding_role(
        self,
        collab: Dict[str, Any],
        message: str
    ) -> Optional[Dict[str, Any]]:
        """選擇合適的角色回覆"""
        roles = collab.get('roles', [])
        if not roles:
            return None
        
        last_responder = collab.get('last_responder')
        available_roles = roles.copy()
        
        # 優先讓不同角色回覆
        if last_responder and len(available_roles) > 1:
            available_roles = [r for r in available_roles if r.get('roleName') != last_responder]
            if not available_roles:
                available_roles = roles
        
        # 根據消息內容匹配角色
        message_lower = message.lower()
        keyword_role_map = {
            '價格': ['費率分析師', '顧問', '支付顧問'],
            '多少錢': ['費率分析師', '顧問', '支付顧問'],
            '費用': ['費率分析師', '顧問', '支付顧問'],
            '怎麼用': ['技術支持', '客服'],
            '如何': ['技術支持', '客服'],
            '問題': ['技術支持', '客服'],
            '安全': ['安全顧問', '顧問'],
            '可靠': ['安全顧問', '顧問'],
        }
        
        matched_roles = []
        for keyword, role_names in keyword_role_map.items():
            if keyword in message_lower:
                for role in available_roles:
                    if any(name in role.get('roleName', '') for name in role_names):
                        matched_roles.append(role)
        
        if matched_roles:
            selected = random.choice(matched_roles)
        else:
            selected = random.choice(available_roles) if available_roles else None
        
        if selected:
            collab['last_responder'] = selected.get('roleName')
        
        return selected
    
    async def _generate_and_send_reply(
        self,
        group_id: str,
        collab: Dict[str, Any],
        role: Dict[str, Any],
        sender_id: int,
        sender_name: str,
        message_text: str
    ):
        """生成並發送 AI 回覆"""
        # 🎯 精簡獲客模式：AI 關閉時直接跳過群聊多角色 AI 回覆生成，
        # 且不觸發下面 ai_auto_chat 的真實模塊加載（提前 return，纵深防御；
        # 即使此處被繞過，service_locator 的空對象也會兜底，不會拋異常）。
        try:
            from config import ENABLE_AI
        except Exception:
            ENABLE_AI = True
        if not ENABLE_AI:
            self.log("[GroupMessagePoller] 精簡獲客模式：跳過 AI 回覆", "debug")
            return

        from service_locator import ai_auto_chat
        from database import db
        
        role_phone = role.get('phone')
        role_name = role.get('roleName', '助手')
        role_prompt = role.get('prompt', '')
        
        clients = collab.get('clients', {})
        client = clients.get(role_phone)
        main_phone = collab.get('main_phone')
        
        if not client or not client.is_connected:
            self.log(f"角色 {role_name} 的客戶端未連接，嘗試使用主帳號", "warning")
            # 🔧 備用：使用主帳號發送
            client = clients.get(main_phone)
            if not client or not client.is_connected:
                self.log(f"主帳號也未連接，無法發送", "error")
                return
        
        try:
            # 搜索知識庫
            knowledge_context = ""
            try:
                from telegram_rag_system import telegram_rag
                if telegram_rag:
                    rag_context = await telegram_rag.build_rag_context(
                        user_message=message_text,
                        user_id=str(sender_id),
                        max_items=3,
                        max_tokens=500
                    )
                    if rag_context:
                        knowledge_context = rag_context
                        self.log(f"📚 從 RAG 找到相關知識")
                
                if not knowledge_context:
                    knowledge_items = await db.search_knowledge(message_text, limit=3)
                    if knowledge_items:
                        kb_parts = ["【業務知識參考 - 必須使用】"]
                        for item in knowledge_items:
                            kb_parts.append(f"- {item.get('title')}: {item.get('content')}")
                        knowledge_context = "\n".join(kb_parts)
                        self.log(f"📚 從知識庫找到 {len(knowledge_items)} 條知識")
            except Exception as kb_err:
                self.log(f"知識庫搜索失敗: {kb_err}", "warning")
            
            # 🔧 Phase 3：構建簡化的群聊 prompt（確保直接回答）
            # 檢測問句類型
            is_question = any(q in message_text for q in ['怎么', '怎麼', '如何', '什么', '什麼', '哪里', '哪裡', '多少', '能不能', '可以', '？', '?'])
            
            # 簡化 prompt，聚焦回答問題
            group_prompt = f"""你是「{role_name}」。

【最重要規則】
⚠️ 必須直接回答客戶的問題，不要說"感謝關注"之類的套話！

{knowledge_context if knowledge_context else ''}

客戶問：{message_text}

{'這是一個問題，你必須給出具體答案！' if is_question else ''}

用1-2句話直接回答："""

            # 調用 AI 生成回覆
            reply = None
            
            # 🔧 Phase 2 診斷: 限制 prompt 長度
            prompt_length = len(group_prompt)
            if prompt_length > 2000:
                self.log(f"⚠️ Prompt 過長 ({prompt_length} 字符)，截斷到 2000", "warning")
                group_prompt = group_prompt[:2000] + "\n...[內容已截斷]"
            
            if ai_auto_chat:
                try:
                    self.log(f"🤖 調用 AI: user_id={sender_id}, message={message_text[:30]}...")
                    
                    # 🔧 Phase 1 修復: 使用正確的方法名
                    reply = await ai_auto_chat._generate_response_with_prompt(
                        user_id=str(sender_id),
                        user_message=message_text,
                        custom_prompt=group_prompt,
                        usage_type='dailyChat'  # 🔧 使用 dailyChat 確保有模型可用
                    )
                    
                    # 🔧 Phase 2 診斷: 詳細記錄返回值
                    if reply:
                        self.log(f"✅ AI 生成回覆成功: {reply[:80]}...")
                    else:
                        self.log(f"❌ AI 返回 None 或空字串", "warning")
                        
                except Exception as ai_err:
                    self.log(f"❌ AI 生成異常: {type(ai_err).__name__}: {ai_err}", "error")
                    import traceback
                    traceback.print_exc(file=sys.stderr)
            else:
                self.log(f"❌ ai_auto_chat 實例不存在", "error")
            
            # 🔧 Phase 4：智能備用回覆（根據問題類型選擇）
            if not reply or not reply.strip():
                self.log(f"AI 生成回覆為空，使用智能備用回覆", "warning")
                
                msg_lower = message_text.lower()
                
                # 根據問題類型選擇備用回覆
                if '怎么合作' in msg_lower or '怎麼合作' in msg_lower or '如何合作' in msg_lower:
                    reply = f"合作流程很簡單：1️⃣ 告訴我您的業務需求 2️⃣ 我們評估後給您方案 3️⃣ 談好費率就可以開始。您目前是做什麼業務的？"
                elif '价格' in msg_lower or '價格' in msg_lower or '费率' in msg_lower or '費率' in msg_lower or '多少钱' in msg_lower:
                    reply = f"費率要看您的具體業務量，量大更優惠。您方便說下大概日量多少嗎？"
                elif '怎么用' in msg_lower or '怎麼用' in msg_lower or '如何使用' in msg_lower:
                    reply = f"使用很簡單，我可以發個教程給您看。您現在方便看嗎？"
                elif '安全' in msg_lower or '可靠' in msg_lower or '信任' in msg_lower:
                    reply = f"我們做了很多年了，老客戶很多。資金安全這塊您放心，可以先小額試試。"
                elif '?' in message_text or '？' in message_text:
                    # 通用問句回覆
                    reply = f"這個問題我來回答您：具體要看您的需求，方便說說您想了解哪方面嗎？"
                else:
                    # 默認回覆（帶引導性）
                    fallback_replies = [
                        f"收到！您想了解哪方面呢？支付方案、費率還是操作流程？",
                        f"好的，我來幫您解答。您具體想問什麼呢？",
                        f"您說得對，我們這邊可以幫您處理。需要詳細了解嗎？",
                    ]
                    reply = random.choice(fallback_replies)
            
            # 添加隨機延遲（模擬真人）
            delay = random.uniform(2, 5)
            self.log(f"⏳ 等待 {delay:.1f} 秒後回覆...")
            await asyncio.sleep(delay)
            
            # 發送回覆
            # 🔧 修復: 使用正確的群組 ID 格式，嘗試多種方式
            group_id_int = int(group_id)
            sent = False
            
            # 🔧 方法 1: 遍歷所有連接的客戶端，找到能發送的
            for phone, try_client in clients.items():
                if not try_client or not try_client.is_connected:
                    continue
                    
                try:
                    # 從對話列表中找到群組
                    async for dialog in try_client.get_dialogs():
                        if dialog.chat.id == group_id_int:
                            await try_client.send_message(dialog.chat.id, reply)
                            self.log(f"✅ 群組 {group_id} 已回覆 (帳號 {phone}): {role_name}: {reply[:50]}...")
                            sent = True
                            break
                    
                    if sent:
                        break
                        
                except Exception as send_err:
                    self.log(f"⚠️ 帳號 {phone} 發送失敗: {send_err}")
                    continue
            
            if not sent:
                self.log(f"❌ 所有帳號都無法發送群組回覆", "error")
            else:
                # 🔧 只有成功發送時才發送前端事件
                if self.event_callback:
                    self.event_callback("group:ai-reply-sent", {
                        "groupId": group_id,
                        "rolePhone": role_phone,
                        "roleName": role_name,
                        "replyTo": sender_name,
                        "content": reply,
                        "timestamp": datetime.now().isoformat()
                    })
                
                # 更新最後回覆者
                collab['last_responder'] = role_name
            
        except Exception as e:
            self.log(f"發送群組回覆失敗: {e}", "error")
            import traceback
            traceback.print_exc(file=sys.stderr)


# 全局實例
_group_poller: Optional[GroupMessagePoller] = None


def init_group_poller(event_callback: Optional[Callable] = None) -> GroupMessagePoller:
    """初始化全局群組輪詢器"""
    global _group_poller
    _group_poller = GroupMessagePoller(event_callback)
    return _group_poller


def get_group_poller() -> Optional[GroupMessagePoller]:
    """獲取全局群組輪詢器"""
    return _group_poller
