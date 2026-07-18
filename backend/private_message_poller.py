"""
Private Message Poller - 私信輪詢服務
雙重保險機制：事件驅動 + 輪詢備份
確保 100% 接收用戶私信並觸發 AI 自動回覆
"""
import sys
import asyncio
from typing import Dict, Set, Optional, Callable, Any
from datetime import datetime, timedelta
from pyrogram import Client
from pyrogram.enums import ChatType
from database import db
# 🎯 精簡獲客模式：AI 依賴改為透過 service_locator 懶加載（原本是頂層 `from
# ai_auto_chat import ai_auto_chat` / `from auto_funnel_manager import auto_funnel`，
# 會在本模塊被 import 時就無條件真實加載重量級 AI 模塊，繞過 ENABLE_AI 開關）。
# ENABLE_AI=True 時 service_locator 代理的行為與原直接 import 完全一致。
from service_locator import ai_auto_chat, auto_funnel


class PrivateMessagePoller:
    """私信輪詢服務 - 確保不遺漏任何用戶私信"""
    
    def __init__(self, event_callback: Optional[Callable] = None):
        self.event_callback = event_callback
        self._polling_tasks: Dict[str, asyncio.Task] = {}
        self._processed_message_ids: Set[str] = set()  # 去重：已處理的消息 ID
        self._max_processed_cache = 10000  # 最多緩存 10000 個消息 ID
        self._polling_interval = 5  # 輪詢間隔（秒）
        self._running = False
        self._clients: Dict[str, Client] = {}
    
    def log(self, message: str, level: str = "info"):
        """記錄日誌"""
        formatted = f"[PrivatePoller] {message}"
        print(formatted, file=sys.stderr)
        if self.event_callback:
            self.event_callback("log-entry", {
                "message": formatted,
                "type": level
            })
    
    def _make_message_key(self, phone: str, chat_id: int, message_id: int) -> str:
        """生成消息唯一鍵（用於去重）"""
        return f"{phone}:{chat_id}:{message_id}"
    
    def _is_processed(self, phone: str, chat_id: int, message_id: int) -> bool:
        """檢查消息是否已處理"""
        key = self._make_message_key(phone, chat_id, message_id)
        return key in self._processed_message_ids
    
    def _mark_processed(self, phone: str, chat_id: int, message_id: int):
        """標記消息為已處理"""
        key = self._make_message_key(phone, chat_id, message_id)
        self._processed_message_ids.add(key)
        
        # 防止內存溢出：清理過舊的記錄
        if len(self._processed_message_ids) > self._max_processed_cache:
            # 移除一半的舊記錄
            to_remove = list(self._processed_message_ids)[:self._max_processed_cache // 2]
            for item in to_remove:
                self._processed_message_ids.discard(item)
    
    async def start_polling(self, clients: Dict[str, Client]):
        """
        啟動輪詢服務
        
        Args:
            clients: 所有在線客戶端 {phone: Client}
        """
        if self._running:
            self.log("輪詢服務已在運行中", "warning")
            return
        
        self._running = True
        self._clients = clients
        
        self.log(f"🚀 啟動私信輪詢服務，監控 {len(clients)} 個帳號，間隔 {self._polling_interval} 秒")
        
        # 為每個帳號啟動輪詢任務
        for phone, client in clients.items():
            if phone not in self._polling_tasks or self._polling_tasks[phone].done():
                task = asyncio.create_task(self._poll_account(phone, client))
                self._polling_tasks[phone] = task
                self.log(f"✓ 帳號 {phone} 輪詢任務已啟動")
    
    async def stop_polling(self):
        """停止輪詢服務"""
        self._running = False
        
        # 取消所有輪詢任務
        for phone, task in self._polling_tasks.items():
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                self.log(f"✓ 帳號 {phone} 輪詢任務已停止")
        
        self._polling_tasks.clear()
        self.log("🛑 私信輪詢服務已停止")
    
    async def add_client(self, phone: str, client: Client):
        """添加新客戶端到輪詢"""
        if not self._running:
            return
        
        self._clients[phone] = client
        
        if phone not in self._polling_tasks or self._polling_tasks[phone].done():
            task = asyncio.create_task(self._poll_account(phone, client))
            self._polling_tasks[phone] = task
            self.log(f"✓ 動態添加帳號 {phone} 到輪詢")
    
    async def remove_client(self, phone: str):
        """從輪詢移除客戶端"""
        if phone in self._polling_tasks:
            task = self._polling_tasks[phone]
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            del self._polling_tasks[phone]
        
        if phone in self._clients:
            del self._clients[phone]
    
    async def _poll_account(self, phone: str, client: Client):
        """
        輪詢單個帳號的私信
        
        Args:
            phone: 帳號電話
            client: Telegram 客戶端
        """
        self.log(f"開始輪詢帳號 {phone} 的私信...")
        
        while self._running:
            try:
                await self._check_private_messages(phone, client)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.log(f"輪詢錯誤 ({phone}): {e}", "error")
            
            # 等待下次輪詢
            await asyncio.sleep(self._polling_interval)
    
    async def _check_private_messages(self, phone: str, client: Client):
        """
        檢查帳號的私信
        
        Args:
            phone: 帳號電話
            client: Telegram 客戶端
        """
        try:
            # 確保客戶端已連接
            if not client.is_connected:
                self.log(f"客戶端 {phone} 未連接，跳過本次輪詢", "warning")
                return
            
            # 獲取最近的對話列表（只獲取私聊）
            dialogs = []
            async for dialog in client.get_dialogs(limit=50):
                if dialog.chat.type == ChatType.PRIVATE:
                    # 檢查是否有未讀消息
                    if dialog.unread_messages_count > 0:
                        dialogs.append(dialog)
            
            if not dialogs:
                return  # 沒有未讀私信
            
            self.log(f"📬 發現 {len(dialogs)} 個有未讀消息的私聊")
            
            # 處理每個有未讀消息的對話
            for dialog in dialogs:
                chat = dialog.chat
                unread_count = dialog.unread_messages_count
                
                try:
                    # 獲取未讀消息
                    messages = []
                    async for message in client.get_chat_history(
                        chat.id, 
                        limit=min(unread_count, 10)  # 最多處理 10 條
                    ):
                        # 只處理對方發送的消息（非自己發送的）
                        if not message.outgoing:
                            messages.append(message)
                    
                    # 按時間順序處理（從舊到新）
                    messages.reverse()
                    
                    for message in messages:
                        await self._process_message(phone, client, message)
                    
                    # 標記消息已讀
                    try:
                        await client.read_chat_history(chat.id)
                    except Exception as read_err:
                        self.log(f"標記已讀失敗: {read_err}", "warning")
                        
                except Exception as chat_err:
                    self.log(f"處理對話 {chat.id} 錯誤: {chat_err}", "error")
                    
        except Exception as e:
            # 忽略常見的錯誤
            error_str = str(e).lower()
            if 'flood' in error_str:
                self.log(f"API 限流，等待後重試...", "warning")
                await asyncio.sleep(30)
            elif 'disconnect' in error_str or 'connection' in error_str:
                self.log(f"連接問題: {e}", "warning")
            else:
                raise
    
    async def _process_message(self, phone: str, client: Client, message):
        """
        處理單條私信
        
        Args:
            phone: 帳號電話
            client: Telegram 客戶端
            message: 消息對象
        """
        try:
            # 去重檢查
            if self._is_processed(phone, message.chat.id, message.id):
                return  # 已處理過，跳過
            
            # 標記為已處理
            self._mark_processed(phone, message.chat.id, message.id)
            
            # 獲取消息內容
            text = message.text or message.caption or ""
            if not text.strip():
                return  # 空消息，跳過
            
            # 獲取發送者信息
            user = message.from_user
            if not user:
                return
            
            user_id = str(user.id)
            username = user.username or ""
            first_name = user.first_name or ""
            last_name = user.last_name or ""
            display_name = username or first_name or f"User_{user_id}"
            
            self.log(f"📨 收到私信 [{phone}] @{display_name} (ID:{user_id}): {text[:50]}...")
            
            # 發送前端事件
            if self.event_callback:
                self.log(f"🔔 發送 private-message-received 事件，userId={user_id}")
                self.event_callback("private-message-received", {
                    "phone": phone,
                    "userId": user_id,
                    "username": username,
                    "firstName": first_name,
                    "text": text,
                    "messageId": message.id,
                    "timestamp": datetime.now().isoformat()
                })
            else:
                self.log(f"⚠️ event_callback 未設置，無法發送事件", "warning")
            
            # 🎯 精簡獲客模式：AI 全局關閉時直接跳過（不論 DB 中 auto_chat_enabled 設置為何）
            try:
                from config import ENABLE_AI
            except Exception:
                ENABLE_AI = True
            if not ENABLE_AI:
                self.log("精簡獲客模式：跳過 AI 自動回覆（漏斗分析/AI回覆均不執行）", "debug")
                return

            # 檢查 AI 自動回覆設置
            ai_settings = await db.get_ai_settings()
            auto_chat_enabled = ai_settings.get('auto_chat_enabled', 0) == 1
            auto_chat_mode = ai_settings.get('auto_chat_mode', 'semi')
            
            self.log(f"AI 設置: enabled={auto_chat_enabled}, mode={auto_chat_mode}")
            
            if not auto_chat_enabled:
                self.log(f"AI 自動聊天未啟用，跳過自動回覆", "info")
                return
            
            # 保存消息到聊天歷史
            try:
                await db.add_chat_message(
                    user_id=user_id,
                    role="user",
                    content=text,
                    account_phone=phone
                )
            except Exception as save_err:
                self.log(f"保存消息錯誤: {save_err}", "warning")
            
            # 🆕 更新 AI 回覆效果評估（用於持續學習）
            try:
                await db.update_response_effectiveness(user_id, text)
            except Exception as eff_err:
                pass  # 效果評估失敗不影響主流程
            
            # 獲取或創建用戶資料
            user_profile = await db.get_user_profile(user_id)
            if not user_profile:
                # 創建新用戶資料
                try:
                    await db._connection.execute("""
                        INSERT INTO user_profiles 
                        (user_id, username, first_name, last_name, funnel_stage, interest_level, created_at)
                        VALUES (?, ?, ?, ?, 'new', 1, CURRENT_TIMESTAMP)
                    """, (user_id, username, first_name, last_name))
                    await db._connection.commit()
                    user_profile = await db.get_user_profile(user_id)
                except Exception as create_err:
                    self.log(f"創建用戶資料錯誤: {create_err}", "warning")
            
            # 分析消息並更新漏斗階段
            try:
                analysis = await auto_funnel.analyze_message(text, user_id)
                self.log(f"漏斗分析: stage={analysis.get('suggested_stage')}, advance={analysis.get('should_advance')}")
                
                if analysis.get('should_advance') and user_profile:
                    new_stage = analysis.get('suggested_stage', user_profile.get('funnel_stage', 'new'))
                    await db.update_funnel_stage(user_id, new_stage)
                    self.log(f"✓ 用戶 @{display_name} 漏斗階段更新: {new_stage}")
            except Exception as funnel_err:
                self.log(f"漏斗分析錯誤: {funnel_err}", "warning")
            
            # 根據模式處理
            if auto_chat_mode == 'full':
                # 全自動模式：直接生成並發送回覆
                await self._send_ai_reply(phone, client, user, text, message.chat.id)
            else:
                # 半自動模式：只生成回覆，不發送
                await self._generate_ai_suggestion(phone, user, text)
                
        except Exception as e:
            self.log(f"處理消息錯誤: {e}", "error")
            import traceback
            traceback.print_exc(file=sys.stderr)
    
    async def _send_ai_reply(self, phone: str, client: Client, user, user_message: str, chat_id: int):
        """
        生成並發送 AI 回覆（全自動模式）
        
        Args:
            phone: 帳號電話
            client: Telegram 客戶端
            user: 用戶對象
            user_message: 用戶消息
            chat_id: 聊天 ID
        """
        # 🎯 精簡獲客模式：AI 關閉時跳過私信 AI 自動回覆生成（纵深防御；
        # service_locator 的空對象即使被繞過也不會拋異常，這裡只是提前短路並打日誌）。
        try:
            from config import ENABLE_AI
        except Exception:
            ENABLE_AI = True
        if not ENABLE_AI:
            self.log("精簡獲客模式：跳過 AI 自動回覆", "debug")
            return

        try:
            user_id = str(user.id)
            username = user.username or user.first_name or f"User_{user_id}"
            
            self.log(f"🤖 開始為 @{username} 生成 AI 回覆...")
            
            # 🔧 確保 AI 服務已初始化（從 ai_models 表載入）
            if not ai_auto_chat.local_ai_endpoint:
                await ai_auto_chat.initialize()
                if ai_auto_chat.local_ai_endpoint:
                    provider = getattr(ai_auto_chat, 'provider', 'custom')
                    self.log(f"✓ 已載入 AI 配置: {provider} - {ai_auto_chat.local_ai_model}")
            
            provider = getattr(ai_auto_chat, 'provider', 'custom')
            self.log(f"AI 端點: {provider} - {ai_auto_chat.local_ai_endpoint[:50] if ai_auto_chat.local_ai_endpoint else '未配置'}...")
            
            # 生成 AI 回覆（使用 get_suggested_response 方法）
            reply_text = await ai_auto_chat.get_suggested_response(
                user_id=user_id,
                user_message=user_message
            )
            
            if not reply_text:
                self.log(f"AI 生成失敗: 返回空回覆，將使用備用回覆", "warning")
                # 使用備用回覆
                reply_text = ai_auto_chat._get_fallback_response([
                    {"role": "user", "content": user_message}
                ])
            
            if not reply_text:
                self.log(f"備用回覆也失敗", "error")
                return
            if not reply_text.strip():
                self.log(f"AI 生成了空回覆，跳過發送", "warning")
                return
            
            self.log(f"✓ AI 生成回覆: {reply_text[:50]}...")
            
            # 發送回覆
            try:
                sent_message = await client.send_message(chat_id, reply_text)
                self.log(f"✅ 已發送 AI 回覆給 @{username} (msg_id={sent_message.id})")
                
                # 保存 AI 回覆到聊天歷史
                try:
                    await db.add_chat_message(
                        user_id=user_id,
                        role="assistant",
                        content=reply_text,
                        account_phone=phone
                    )
                except Exception as save_err:
                    self.log(f"保存 AI 回覆錯誤: {save_err}", "warning")
                
                # 🆕 追蹤 AI 回覆效果（用於持續學習）
                try:
                    await db.track_ai_response(
                        user_id=user_id,
                        ai_message=reply_text,
                        triggered_keyword=None,  # TODO: 傳遞觸發關鍵詞
                        source_group=None
                    )
                except Exception as track_err:
                    pass  # 追蹤失敗不影響主流程
                
                # 🔧 P1 優化: 提取並保存對話記憶
                try:
                    from conversation_memory import get_memory_service
                    memory_service = get_memory_service()
                    memories = await memory_service.extract_and_store_memories(
                        user_id=user_id,
                        message=user_message,
                        ai_response=reply_text,
                        context={'phone': phone, 'username': username}
                    )
                    if memories:
                        self.log(f"✓ 提取並保存 {len(memories)} 條對話記憶")
                except Exception as mem_err:
                    self.log(f"對話記憶保存錯誤: {mem_err}", "warning")
                
                # 發送前端事件
                if self.event_callback:
                    self.event_callback("ai-response-sent", {
                        "userId": user_id,
                        "username": username,
                        "response": reply_text,
                        "phone": phone,
                        "timestamp": datetime.now().isoformat()
                    })
                    
            except Exception as send_err:
                self.log(f"發送回覆失敗: {send_err}", "error")
                
        except Exception as e:
            self.log(f"AI 回覆流程錯誤: {e}", "error")
            import traceback
            traceback.print_exc(file=sys.stderr)
    
    async def _generate_ai_suggestion(self, phone: str, user, user_message: str):
        """
        生成 AI 建議回覆（半自動模式）
        
        Args:
            phone: 帳號電話
            user: 用戶對象
            user_message: 用戶消息
        """
        # 🎯 精簡獲客模式：AI 關閉時跳過私信 AI 建議回覆生成
        try:
            from config import ENABLE_AI
        except Exception:
            ENABLE_AI = True
        if not ENABLE_AI:
            self.log("精簡獲客模式：跳過 AI 建議回覆", "debug")
            return

        try:
            user_id = str(user.id)
            username = user.username or user.first_name or f"User_{user_id}"
            
            self.log(f"💡 為 @{username} 生成 AI 建議...")
            
            # 生成 AI 回覆建議（使用 get_suggested_response 方法）
            suggestion = await ai_auto_chat.get_suggested_response(
                user_id=user_id,
                user_message=user_message
            )
            
            if suggestion:
                
                # 發送建議到前端
                if self.event_callback:
                    self.event_callback("ai-suggestion-ready", {
                        "userId": user_id,
                        "username": username,
                        "userMessage": user_message,
                        "suggestion": suggestion,
                        "phone": phone,
                        "timestamp": datetime.now().isoformat()
                    })
                
                # 🔧 P1 優化: 半自動模式也提取記憶（用於下次對話）
                try:
                    from conversation_memory import get_memory_service
                    memory_service = get_memory_service()
                    await memory_service.extract_and_store_memories(
                        user_id=user_id,
                        message=user_message,
                        ai_response=suggestion,  # 使用建議作為預期回覆
                        context={'phone': phone, 'mode': 'semi-auto'}
                    )
                except Exception:
                    pass  # 記憶提取失敗不影響主流程
                
                self.log(f"✓ AI 建議已生成: {suggestion[:50]}...")
            else:
                self.log(f"AI 建議生成失敗", "warning")
                
        except Exception as e:
            self.log(f"生成 AI 建議錯誤: {e}", "error")


# 創建全局實例
private_message_poller = PrivateMessagePoller()
