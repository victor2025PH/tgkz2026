"""
Private Message Handler - 私信消息處理器
處理用戶私信回復，觸發 AI 自動回復
"""
import sys
import asyncio
from typing import Dict, Any, Optional
from pyrogram import Client
from pyrogram.types import Message
from pyrogram.handlers import MessageHandler
from pyrogram import filters
from database import db
from ai_auto_chat import ai_auto_chat
from auto_funnel_manager import auto_funnel
from vector_memory import vector_memory
from text_utils import sanitize_text, safe_get_name, safe_get_username


class PrivateMessageHandler:
    """處理私信消息並觸發 AI 自動回復"""
    
    def __init__(self, event_callback=None):
        self.event_callback = event_callback
        self.private_handlers: Dict[str, MessageHandler] = {}
        self._initialized = False
    
    async def initialize(self):
        """初始化處理器"""
        if self._initialized:
            return
        self._initialized = True
    
    def log(self, message: str, level: str = "info"):
        """記錄日誌"""
        formatted = f"[PrivateMessageHandler] {message}"
        print(formatted, file=sys.stderr)
        if self.event_callback:
            self.event_callback("log-entry", {
                "message": formatted,
                "type": level
            })
    
    async def register_handler(self, client: Client, phone: str, account_role: str = "Sender"):
        """
        為帳號註冊私信處理器
        
        Args:
            client: Telegram 客戶端
            phone: 帳號電話
            account_role: 帳號角色 (Listener=監控帳號, Sender=發送帳號)
        """
        # 為所有帳號註冊私信處理器（用戶可能回復給任何帳號）
        print(f"[PrivateMessageHandler] 註冊處理器: phone={phone}, role={account_role}", file=sys.stderr)
        
        # 如果已經註冊，先移除
        if phone in self.private_handlers:
            try:
                client.remove_handler(self.private_handlers[phone])
            except:
                pass
        
        async def handle_private_message(client_instance: Client, message: Message):
            """處理私信消息"""
            try:
                # 🔑 安全獲取消息文本（處理 Unicode 編碼問題）
                try:
                    raw_text = message.text or message.caption or ''
                except (UnicodeDecodeError, UnicodeEncodeError) as e:
                    print(f"[PrivateMessageHandler] Unicode 編碼錯誤: {e}", file=sys.stderr)
                    raw_text = ''
                
                # 記錄所有接收到的消息（用於調試）
                print(f"[PrivateMessageHandler] === 收到消息 ===", file=sys.stderr)
                print(f"[PrivateMessageHandler] Chat Type: {message.chat.type.name}", file=sys.stderr)
                print(f"[PrivateMessageHandler] Outgoing: {message.outgoing}", file=sys.stderr)
                try:
                    from_user_name = message.from_user.username if message.from_user else 'None'
                except:
                    from_user_name = 'Error'
                print(f"[PrivateMessageHandler] From User: {from_user_name}", file=sys.stderr)
                print(f"[PrivateMessageHandler] Text: {sanitize_text(raw_text)[:50]}", file=sys.stderr)
                
                # 只處理私信（非群組消息）
                if message.chat.type.name != "PRIVATE":
                    print(f"[PrivateMessageHandler] 跳過：非私信消息", file=sys.stderr)
                    return
                
                # 跳過自己發送的消息
                if message.outgoing:
                    print(f"[PrivateMessageHandler] 跳過：自己發送的消息", file=sys.stderr)
                    return
                
                # 獲取用戶信息
                user = message.from_user
                if not user:
                    return
                
                user_id = str(user.id)
                username = safe_get_username(user)
                first_name = sanitize_text(user.first_name) if user.first_name else ""
                last_name = sanitize_text(user.last_name) if user.last_name else ""
                # 🔑 使用已安全獲取的 raw_text
                message_text = sanitize_text(raw_text)
                
                if not message_text:
                    return
                
                # 詳細日誌
                print(f"[PrivateMessageHandler] ========== PRIVATE MESSAGE RECEIVED ==========", file=sys.stderr)
                print(f"[PrivateMessageHandler] User ID: {user_id}", file=sys.stderr)
                print(f"[PrivateMessageHandler] Username: @{username}", file=sys.stderr)
                print(f"[PrivateMessageHandler] Name: {first_name} {last_name}", file=sys.stderr)
                print(f"[PrivateMessageHandler] Message: {message_text[:100]}...", file=sys.stderr)
                print(f"[PrivateMessageHandler] Account: {phone}", file=sys.stderr)
                print(f"[PrivateMessageHandler] ==============================================", file=sys.stderr)
                
                self.log(f"收到私信: 用戶 {user_id} (@{username}) 發送: {message_text[:50]}...")
                
                # 🔧 P0 修復: 檢查是否在 DNC 列表（使用正確的方法）
                try:
                    existing_lead, is_dnc = await db.check_lead_and_dnc(user_id)
                except Exception as dnc_err:
                    print(f"[PrivateMessageHandler] DNC 檢查失敗: {dnc_err}", file=sys.stderr)
                    is_dnc = False
                
                if is_dnc:
                    self.log(f"用戶 {user_id} 在 DNC 列表，跳過處理", "warning")
                    print(f"[PrivateMessageHandler] 用戶在 DNC 列表，跳過", file=sys.stderr)
                    return
                
                # 保存消息到聊天歷史
                await db.add_chat_message(
                    user_id=user_id,
                    role='user',
                    content=message_text,
                    account_phone=phone,
                    message_id=str(message.id)
                )
                
                # 記錄互動
                await self._record_interaction(user_id, message_text, phone, 'inbound')
                
                # 檢查用戶是否已互動過（用於發送限額豁免）
                await self._mark_user_interacted(user_id, phone)
                
                # 獲取或創建用戶資料
                profile = await db.get_user_profile(user_id)
                if not profile:
                    # 創建新用戶資料
                    await db._connection.execute("""
                        INSERT INTO user_profiles 
                        (user_id, username, first_name, last_name, funnel_stage, first_contact_at)
                        VALUES (?, ?, ?, ?, 'new', CURRENT_TIMESTAMP)
                    """, (user_id, username, first_name, last_name))
                    await db._connection.commit()
                    profile = await db.get_user_profile(user_id)
                
                # 更新用戶資料
                await db.update_user_profile(user_id, {
                    'username': username,
                    'first_name': first_name,
                    'last_name': last_name,
                })
                
                # 分析消息並更新漏斗階段
                analysis = await auto_funnel.analyze_message(
                    user_id=user_id,
                    message=message_text,
                    is_from_user=True
                )
                
                # 檢查 AI 自動聊天是否啟用 (整數 0/1)
                ai_settings = await db.get_ai_settings()
                auto_chat_enabled = ai_settings.get('auto_chat_enabled', 0) == 1
                auto_chat_mode = ai_settings.get('auto_chat_mode', 'semi')
                
                print(f"[PrivateMessageHandler] AI 設置 - 啟用: {auto_chat_enabled}, 模式: {auto_chat_mode}", file=sys.stderr)
                
                ai_response = None
                
                if not auto_chat_enabled:
                    self.log(f"AI 自動聊天未啟用，跳過自動回復", "info")
                    print(f"[PrivateMessageHandler] AI 自動聊天未啟用", file=sys.stderr)
                else:
                    # 觸發 AI 自動回復
                    print(f"[PrivateMessageHandler] 開始生成 AI 回復...", file=sys.stderr)
                    self.log(f"[AI] 開始為用戶 @{username} 生成回復...")
                    
                    ai_response = await ai_auto_chat.process_incoming_message(
                        user_id=user_id,
                        username=username,
                        message=message_text,
                        account_phone=phone,
                        first_name=first_name
                    )
                    
                    print(f"[PrivateMessageHandler] AI 回復生成結果: {'成功' if ai_response else '失敗'}", file=sys.stderr)
                    if ai_response:
                        self.log(f"[AI] ✓ 已生成回復: {ai_response[:50]}...")
                
                if ai_response:
                    # 根據模式處理
                    mode = ai_auto_chat.settings.get('auto_chat_mode', 'semi')
                    
                    if mode == 'full':
                        # 全自動模式：直接發送消息
                        self.log(f"[AI] 全自動模式：正在發送回復給 @{username}...")
                        
                        try:
                            # 實際發送消息
                            await client_instance.send_message(
                                chat_id=int(user_id),
                                text=ai_response
                            )
                            
                            self.log(f"[AI] ✓ 已發送回復給 @{username}: {ai_response[:50]}...", "success")
                            
                            # 保存 AI 回復到聊天歷史
                            await db.add_chat_message(
                                user_id=user_id,
                                role='assistant',
                                content=ai_response,
                                account_phone=phone
                            )
                            
                            # 更新漏斗階段
                            if analysis.get('should_advance'):
                                new_stage = analysis.get('suggested_stage', analysis.get('current_stage'))
                                await db.update_user_profile(user_id, {
                                    'funnel_stage': new_stage
                                })
                                self.log(f"[漏斗] 用戶 @{username} 階段更新為: {new_stage}")
                            
                            # 發送事件通知前端
                            if self.event_callback:
                                self.event_callback("ai-response-generated", {
                                    "userId": user_id,
                                    "username": username,
                                    "userMessage": message_text,
                                    "aiResponse": ai_response,
                                    "mode": "full",
                                    "autoSent": True,
                                    "funnelStage": analysis.get('current_stage'),
                                    "newStage": analysis.get('suggested_stage'),
                                    "interestLevel": analysis.get('interest_level')
                                })
                                
                        except Exception as send_error:
                            self.log(f"[AI] ✗ 發送失敗: {send_error}", "error")
                            print(f"[PrivateMessageHandler] 發送消息失敗: {send_error}", file=sys.stderr)
                    else:
                        # 半自動/輔助模式：等待人工確認
                        self.log(f"[AI] {mode} 模式：已生成回復，等待人工確認")
                        
                        if self.event_callback:
                            self.event_callback("ai-response-generated", {
                                "userId": user_id,
                                "username": username,
                                "userMessage": message_text,
                                "aiResponse": ai_response,
                                "mode": mode,
                                "autoSent": False,
                                "funnelStage": analysis.get('current_stage'),
                                "interestLevel": analysis.get('interest_level'),
                                "requiresApproval": True
                            })
                
                # 自動提取記憶
                await vector_memory.auto_extract_facts(user_id, message_text)
                
                # 發送聊天記錄更新事件
                if self.event_callback:
                    self.event_callback("chat-message-received", {
                        "userId": user_id,
                        "username": username,
                        "message": message_text,
                        "timestamp": message.date.isoformat() if message.date else None,
                        "accountPhone": phone
                    })
                
            except Exception as e:
                self.log(f"處理私信錯誤: {e}", "error")
                import traceback
                traceback.print_exc()
        
        # 創建私信過濾器（只接收私信）
        # 注意：使用 filters.private 過濾私信，~filters.me 過濾自己發送的消息
        private_filter = filters.private & ~filters.me
        handler = MessageHandler(handle_private_message, private_filter)
        
        # 註冊處理器（使用 group=0 確保優先處理）
        # Pyrogram 按 group 從小到大順序調用處理器
        client.add_handler(handler, group=0)
        self.private_handlers[phone] = handler
        
        self.log(f"✓ 已為帳號 {phone} 註冊私信處理器 (角色: {account_role})")
        print(f"[PrivateMessageHandler] ✓ Handler registered for {phone}, total handlers: {len(self.private_handlers)}", file=sys.stderr)
    
    async def unregister_handler(self, client: Client, phone: str):
        """移除私信處理器"""
        if phone in self.private_handlers:
            try:
                client.remove_handler(self.private_handlers[phone])
                del self.private_handlers[phone]
                self.log(f"已移除帳號 {phone} 的私信處理器")
            except Exception as e:
                self.log(f"移除處理器錯誤: {e}", "warning")
    
    async def _record_interaction(self, user_id: str, content: str, 
                                  account_phone: str, direction: str = 'inbound'):
        """記錄用戶互動"""
        try:
            # 簡單情感分析（關鍵詞）
            positive_words = ['好', '喜歡', '感謝', '謝謝', 'good', 'great', 'thanks']
            negative_words = ['不', '沒', '差', '壞', 'bad', 'no', "don't"]
            
            content_lower = content.lower()
            positive_count = sum(1 for w in positive_words if w in content_lower)
            negative_count = sum(1 for w in negative_words if w in content_lower)
            
            total = positive_count + negative_count
            sentiment = 0.5
            if total > 0:
                sentiment = positive_count / total
            
            # 提取關鍵詞
            import json
            words = content.split()
            keywords = [w for w in words if len(w) > 2][:10]
            
            await db._connection.execute("""
                INSERT INTO user_interactions 
                (user_id, interaction_type, direction, content, sentiment, account_phone, platform)
                VALUES (?, 'message', ?, ?, ?, ?, 'telegram')
            """, (user_id, direction, content, sentiment, account_phone))
            await db._connection.commit()
        except Exception as e:
            self.log(f"記錄互動錯誤: {e}", "warning")
    
    async def _mark_user_interacted(self, user_id: str, account_phone: str):
        """標記用戶已互動（用於發送限額豁免）"""
        try:
            # 在 user_profiles 中標記
            await db._connection.execute("""
                UPDATE user_profiles 
                SET last_interaction = CURRENT_TIMESTAMP,
                    total_messages = total_messages + 1
                WHERE user_id = ?
            """, (user_id,))
            
            # 檢查是否首次互動
            cursor = await db._connection.execute("""
                SELECT COUNT(*) as count FROM chat_history 
                WHERE user_id = ? AND role = 'user'
            """, (user_id,))
            row = await cursor.fetchone()
            message_count = row['count'] if row else 0
            
            # 如果首次互動，記錄首次聯繫時間
            if message_count == 1:
                await db._connection.execute("""
                    UPDATE user_profiles 
                    SET first_contact_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND first_contact_at IS NULL
                """, (user_id,))
            
            await db._connection.commit()
        except Exception as e:
            self.log(f"標記用戶互動錯誤: {e}", "warning")


# 全局實例
private_message_handler = PrivateMessageHandler()
