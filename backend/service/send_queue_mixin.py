"""
Phase 9-3: Message queue, send callbacks, partial updates
Extracted from BackendService in main.py.
"""
import sys
import re
import json
import time
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from pathlib import Path
from text_utils import safe_json_dumps, sanitize_text
from flood_wait_handler import flood_handler, safe_telegram_call

# Re-use main.py's db and module accessors
from database import db
from config import config, IS_DEV_MODE

def _get_module(name: str):
    """Safe lazy module accessor."""
    from lazy_imports import lazy_imports
    return lazy_imports.get(name)


# ====================================================================
# 🔧 P3→P4: 延迟获取器 + 模块级缓存
# ====================================================================

_cache = {}

def _get_WarmupManager():
    if 'WarmupManager' not in _cache:
        try: _cache['WarmupManager'] = _get_module('warmup_manager').WarmupManager
        except Exception: _cache['WarmupManager'] = None
    return _cache['WarmupManager']

def _get_RecoveryAction():
    if 'RecoveryAction' not in _cache:
        try: _cache['RecoveryAction'] = _get_module('error_recovery_manager').RecoveryAction
        except Exception: _cache['RecoveryAction'] = None
    return _cache['RecoveryAction']

def _get_RotationReason():
    if 'RotationReason' not in _cache:
        try: _cache['RotationReason'] = _get_module('proxy_rotation_manager').RotationReason
        except Exception: _cache['RotationReason'] = None
    return _cache['RotationReason']


class SendQueueMixin:
    """Mixin: Message queue, send callbacks, partial updates"""

    async def _queue_send_callback(self, phone: str, user_id: str, text: str, attachment: Any = None, source_group: Optional[str] = None, target_username: Optional[str] = None) -> Dict[str, Any]:
        """
        Callback function for MessageQueue to actually send messages via Telegram
        
        Args:
            phone: Account phone number
            user_id: Target user ID
            text: Message text
            attachment: Optional attachment (path string or {name, type, dataUrl} object)
            source_group: Optional source group ID/URL
            target_username: Optional target username (fallback)
            
        Returns:
            Dict with 'success' (bool) and optionally 'error' (str)
        """
        attachment_info = f"attachment={type(attachment).__name__}" if attachment else "no attachment"
        if attachment and isinstance(attachment, dict):
            attachment_info = f"attachment={{name={attachment.get('name')}, type={attachment.get('type')}}}"
        print(f"[Backend] _queue_send_callback called: phone={phone}, user_id={user_id}, source_group={source_group}, target_username={target_username}, {attachment_info}, text={text[:50] if text else '(empty)'}...", file=sys.stderr)
        self.send_log(f"正在發送消息到 {target_username or user_id}...", "info")
        
        try:
            # Check Warmup status before sending (防封)
            account = await db.get_account_by_phone(phone)
            if account:
                # Determine message type (simplified: assume "active" for now)
                message_type = "active"  # Could be "reply_only" if replying to a message
                
                # Check if sending is allowed
                WarmupManager = _get_WarmupManager()
                if not WarmupManager:
                    warmup_check = {'allowed': True}
                else:
                    warmup_check = WarmupManager.should_allow_send(account, message_type)
                
                if not warmup_check.get('allowed'):
                    reason = warmup_check.get('reason', 'Unknown reason')
                    stage_info = warmup_check.get('current_stage')
                    
                    print(f"[Backend] Warmup check failed for {phone}: {reason}", file=sys.stderr)
                    if stage_info:
                        print(f"[Backend] Current stage: {stage_info.get('stage_name')} (Stage {stage_info.get('stage')})", file=sys.stderr)
                        print(f"[Backend] Daily limit: {warmup_check.get('daily_limit')}", file=sys.stderr)
                    
                    return {
                        "success": False,
                        "error": f"Warmup限制: {reason}",
                        "warmup_info": warmup_check
                    }
            
            # Send message via Pyrogram
            import time
            send_start_time = time.time()
            
            result = await self.telegram_manager.send_message(
                phone=phone,
                user_id=user_id,
                text=text,
                attachment=attachment,
                source_group=source_group,
                target_username=target_username
            )
            
            send_latency = (time.time() - send_start_time) * 1000  # 转换为毫秒
            
            print(f"[Backend] telegram_manager.send_message result: {result}", file=sys.stderr)
            
            if result.get('success'):
                self.send_log(f"✓ 消息發送成功到 {user_id}", "success")
                # Record send performance
                from performance_monitor import get_performance_monitor
                try:
                    monitor = get_performance_monitor()
                    monitor.record_send_performance(phone, send_latency)
                except:
                    pass  # Performance monitor might not be initialized
                
                # Record health metrics (账户健康监控增强)
                if self.enhanced_health_monitor:
                    account = await db.get_account_by_phone(phone)
                    if account:
                        account_id = account.get('id')
                        self.enhanced_health_monitor.record_send_success(account_id, phone, send_latency)
                
                # Record proxy success (智能代理轮换)
                if self.proxy_rotation_manager:
                    account = await db.get_account_by_phone(phone)
                    if account:
                        current_proxy = account.get('proxy')
                        if current_proxy:
                            self.proxy_rotation_manager.record_proxy_success(current_proxy, send_latency)
                
                return result
            else:
                # Handle flood wait
                error = result.get('error', 'Unknown error')
                self.send_log(f"✗ 消息發送失敗: {error}", "error")
                print(f"[Backend] Message send failed: {error}", file=sys.stderr)
                
                # 🔧 FIX: PEER_ID_INVALID 錯誤回退策略 - 嘗試使用其他帳號
                if 'PEER_ID_INVALID' in error or 'peer' in error.lower():
                    print(f"[Backend] PEER_ID_INVALID detected, trying fallback strategy...", file=sys.stderr)
                    
                    # 嘗試找一個在同一群組的帳號
                    fallback_result = await self._try_fallback_send(
                        original_phone=phone,
                        user_id=user_id,
                        text=text,
                        attachment=attachment,
                        source_group=source_group,
                        target_username=target_username
                    )
                    
                    if fallback_result and fallback_result.get('success'):
                        self.send_log(f"✓ 回退策略成功: 使用帳號 {fallback_result.get('used_phone')} 發送", "success")
                        return fallback_result
                    else:
                        fallback_error = fallback_result.get('error', '無可用的回退帳號') if fallback_result else '回退失敗'
                        self.send_log(f"回退策略失敗: {fallback_error}", "warning")
                
                # Record proxy error (智能代理轮换)
                if self.proxy_rotation_manager:
                    account = await db.get_account_by_phone(phone)
                    if account:
                        account_id = account.get('id')
                        current_proxy = account.get('proxy')
                        if current_proxy:
                            self.proxy_rotation_manager.record_proxy_error(current_proxy, error)
                            
                            # 如果是代理错误，尝试自动轮换
                            if 'Proxy' in error or 'proxy' in error or 'Connection' in error:
                                try:
                                    new_proxy = await self.proxy_rotation_manager.rotate_proxy(
                                        account_id=account_id,
                                        phone=phone,
                                        reason=_get_RotationReason().ERROR,
                                        preferred_country=account.get('proxyCountry')
                                    )
                                    if new_proxy and new_proxy != current_proxy:
                                        # 更新数据库中的代理
                                        await db.update_account(account_id, {'proxy': new_proxy})
                                        self.send_log(f"账户 {phone} 代理已自动轮换: {current_proxy[:30]}... -> {new_proxy[:30]}...", "info")
                                except Exception as e:
                                    print(f"[Backend] Failed to auto-rotate proxy: {e}", file=sys.stderr)
                
                # Handle error with recovery manager (错误恢复和自动重试机制)
                account = await db.get_account_by_phone(phone)
                account_id = account.get('id') if account else None
                
                if account_id and self.error_recovery_manager:
                    try:
                        # 处理错误并执行恢复动作
                        error_exception = Exception(error)
                        recovery_result = await self.error_recovery_manager.handle_error(
                            account_id=str(account_id),
                            phone=phone,
                            error=error_exception,
                            attempt=0,  # 这里应该从消息队列获取实际尝试次数
                            context={
                                "user_id": user_id,
                                "message_text": text[:100] if text else None
                            }
                        )
                        
                        # 记录恢复结果
                        if recovery_result.success:
                            self.error_recovery_manager.record_recovery_success(str(account_id), recovery_result.action_taken)
                            RecoveryAction = _get_RecoveryAction()
                            if RecoveryAction and recovery_result.action_taken != RecoveryAction.RETRY:
                                self.send_log(f"账户 {phone} 错误恢复成功: {recovery_result.message}", "info")
                        else:
                            self.error_recovery_manager.record_recovery_failure(str(account_id), recovery_result.action_taken)
                            self.send_log(f"账户 {phone} 错误恢复失败: {recovery_result.message}", "warning")
                        
                        # 如果需要等待，更新结果中的错误信息
                        if recovery_result.retry_after:
                            result['retry_after'] = recovery_result.retry_after
                            result['recovery_action'] = recovery_result.action_taken.value
                    except Exception as e:
                        print(f"[Backend] Error in error recovery: {e}", file=sys.stderr)
                
                # Record health metrics (账户健康监控增强)
                if self.enhanced_health_monitor and account:
                    account_id = account.get('id')
                    self.enhanced_health_monitor.record_send_failure(account_id, phone, error, send_latency)
                
                if 'Flood wait' in error:
                    # Extract wait time from error message
                    import re
                    wait_match = re.search(r'wait (\d+) seconds', error)
                    if wait_match:
                        wait_seconds = int(wait_match.group(1))
                        
                        # Record Flood Wait (账户健康监控增强)
                        if self.enhanced_health_monitor:
                            account = await db.get_account_by_phone(phone)
                            if account:
                                account_id = account.get('id')
                                self.enhanced_health_monitor.record_flood_wait(account_id, phone, wait_seconds)
                        
                        # Update rate limiter in message queue
                        if self.message_queue and phone in self.message_queue.rate_limiters:
                            await self.message_queue.rate_limiters[phone].set_flood_wait(wait_seconds)
                
                return result
                
        except Exception as e:
            error_msg = str(e)
            # Provide user-friendly error messages
            if "not connected" in error_msg.lower() or "client not" in error_msg.lower():
                friendly_msg = f"账户 {phone} 未连接。请先登录该账户。"
            elif "flood" in error_msg.lower():
                friendly_msg = f"账户 {phone} 触发限流保护。系统将自动等待后重试。"
            elif "banned" in error_msg.lower() or "deactivated" in error_msg.lower():
                friendly_msg = f"账户 {phone} 可能被封禁或已停用。请检查账户状态。"
            else:
                friendly_msg = f"发送消息失败 ({phone}): {error_msg}"
            
            self.send_log(friendly_msg, "error")
            return {
                "success": False,
                "error": friendly_msg
            }
        
        # Restore pending messages from database
        await self.message_queue.restore_from_database()

    async def _try_fallback_send(
        self, 
        original_phone: str, 
        user_id: str, 
        text: str, 
        attachment: Any = None, 
        source_group: Optional[str] = None, 
        target_username: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        🔧 回退發送策略：當原始帳號無法發送時，嘗試使用其他帳號
        
        策略優先級：
        1. 嘗試使用監控該群組的 Listener 帳號（它們已經在群組中）
        2. 嘗試使用其他在線的 Sender 帳號
        3. 嘗試使用任何在線帳號
        """
        print(f"[Backend] _try_fallback_send: source_group={source_group}, target_username={target_username}", file=sys.stderr)
        
        try:
            # 獲取所有在線帳號
            accounts = await db.get_all_accounts()
            online_accounts = [a for a in accounts if a.get('status') == 'Online' and a.get('phone') != original_phone]
            
            if not online_accounts:
                return {"success": False, "error": "沒有其他在線帳號可用"}
            
            # 優先級 1：找監控該群組的 Listener 帳號
            if source_group:
                # 檢查哪些帳號在這個群組中
                for acc in online_accounts:
                    if acc.get('role') == 'Listener':
                        phone = acc.get('phone')
                        print(f"[Backend] Trying Listener account: {phone}", file=sys.stderr)
                        
                        result = await self.telegram_manager.send_message(
                            phone=phone,
                            user_id=user_id,
                            text=text,
                            attachment=attachment,
                            source_group=source_group,
                            target_username=target_username
                        )
                        
                        if result.get('success'):
                            result['used_phone'] = phone
                            result['fallback_strategy'] = 'listener'
                            return result
                        else:
                            print(f"[Backend] Listener {phone} also failed: {result.get('error')}", file=sys.stderr)
            
            # 優先級 2：嘗試其他 Sender 帳號
            sender_accounts = [a for a in online_accounts if a.get('role') == 'Sender']
            for acc in sender_accounts:
                phone = acc.get('phone')
                print(f"[Backend] Trying other Sender account: {phone}", file=sys.stderr)
                
                result = await self.telegram_manager.send_message(
                    phone=phone,
                    user_id=user_id,
                    text=text,
                    attachment=attachment,
                    source_group=source_group,
                    target_username=target_username
                )
                
                if result.get('success'):
                    result['used_phone'] = phone
                    result['fallback_strategy'] = 'other_sender'
                    return result
            
            # 優先級 3：嘗試任何在線帳號（包括沒有指定角色的）
            for acc in online_accounts:
                if acc.get('role') not in ['Listener', 'Sender']:
                    phone = acc.get('phone')
                    print(f"[Backend] Trying any online account: {phone}", file=sys.stderr)
                    
                    result = await self.telegram_manager.send_message(
                        phone=phone,
                        user_id=user_id,
                        text=text,
                        attachment=attachment,
                        source_group=source_group,
                        target_username=target_username
                    )
                    
                    if result.get('success'):
                        result['used_phone'] = phone
                        result['fallback_strategy'] = 'any_account'
                        return result
            
            return {"success": False, "error": "所有帳號都無法發送"}
            
        except Exception as e:
            print(f"[Backend] _try_fallback_send error: {e}", file=sys.stderr)
            return {"success": False, "error": str(e)}

    async def _start_browsing_simulation(self, account_id: int, phone: str, group_urls: List[str]):
        """
        启动浏览行为模拟后台任务
        
        Args:
            account_id: 账户 ID
            phone: 电话号码
            group_urls: 群组 URL 列表
        """
        async def browsing_task():
            """浏览行为模拟任务"""
            try:
                # 获取行为模拟器
                behavior_simulator = self.telegram_manager.behavior_simulator
                
                # 获取客户端
                if phone not in self.telegram_manager.clients:
                    return
                client = self.telegram_manager.clients[phone]
                
                # 转换群组 URL 为 ID
                group_ids = []
                for group_url in group_urls:
                    try:
                        if isinstance(group_url, (int, str)) and str(group_url).lstrip('-').isdigit():
                            group_ids.append(int(group_url))
                        else:
                            chat = await client.get_chat(group_url)
                            group_ids.append(chat.id)
                    except Exception:
                        continue
                
                if not group_ids:
                    return
                
                # 持续运行浏览模拟
                while self.running:
                    try:
                        # 检查是否应该浏览
                        if behavior_simulator.should_browse_now(account_id):
                            # 模拟浏览
                            browse_result = await behavior_simulator.simulate_browsing(
                                client=client,
                                account_id=account_id,
                                group_ids=group_ids
                            )
                            
                            if browse_result.get('success'):
                                print(f"[BehaviorSimulator] Account {phone} browsed {browse_result.get('count', 0)} groups", file=sys.stderr)
                        
                        # 等待下次浏览（30-60 分钟）
                        delay = behavior_simulator.get_random_activity_delay()
                        await asyncio.sleep(delay)
                    
                    except asyncio.CancelledError:
                        break
                    except Exception as e:
                        print(f"[BehaviorSimulator] Error in browsing task for {phone}: {e}", file=sys.stderr)
                        # 等待一段时间后重试
                        await asyncio.sleep(300)  # 5 分钟后重试
            
            except Exception as e:
                print(f"[BehaviorSimulator] Browsing task failed for {phone}: {e}", file=sys.stderr)
        
        # 启动后台任务
        task = asyncio.create_task(browsing_task())
        self.background_tasks.append(task)
        print(f"[BehaviorSimulator] Started browsing simulation for account {phone}", file=sys.stderr)

    async def send_keyword_sets_update(self):
        """Send only keyword sets update to frontend with deduplication and error handling"""
        try:
            keyword_sets = await db.get_all_keyword_sets()
            
            if not keyword_sets:
                # 如果沒有關鍵詞集，發送空數組
                self.send_event("keyword-sets-updated", {"keywordSets": []})
                return
            
            # 去重處理：確保沒有重複的關鍵詞集和關鍵詞
            seen_set_ids = set()  # 使用 ID 而不是名稱，因為名稱可能重複
            seen_set_names = {}  # 名稱 -> ID 映射，用於檢測重複名稱
            deduplicated_sets = []
            
            for keyword_set in keyword_sets:
                set_id = keyword_set.get('id')
                set_name = keyword_set.get('name', '')
                
                # 如果關鍵詞集 ID 已處理過，跳過（防止重複）
                if set_id in seen_set_ids:
                    continue
                seen_set_ids.add(set_id)
                
                # 如果關鍵詞集名稱已存在且 ID 不同，記錄警告但保留（因為可能確實有同名但不同的集）
                if set_name and set_name in seen_set_names:
                    if seen_set_names[set_name] != set_id:
                        print(f"[Backend] Warning: Duplicate keyword set name '{set_name}' with different IDs: {seen_set_names[set_name]} and {set_id}", file=sys.stderr)
                seen_set_names[set_name] = set_id
                
                # 對關鍵詞進行去重（基於 keyword + isRegex 組合）
                seen_keywords = set()
                unique_keywords = []
                for keyword in keyword_set.get('keywords', []):
                    keyword_text = keyword.get('keyword', '')
                    is_regex = keyword.get('isRegex', False)
                    keyword_id = keyword.get('id')
                    key = (keyword_text, is_regex)
                    
                    # 如果關鍵詞已存在，跳過（保留第一個）
                    if key in seen_keywords:
                        print(f"[Backend] Warning: Duplicate keyword '{keyword_text}' (isRegex={is_regex}) in set {set_id}, skipping", file=sys.stderr)
                        continue
                    
                    seen_keywords.add(key)
                    unique_keywords.append({
                        'id': keyword_id,
                        'keyword': keyword_text,
                        'isRegex': is_regex
                    })
                
                # 創建去重後的關鍵詞集
                deduplicated_set = {
                    'id': set_id,
                    'name': set_name,
                    'keywords': unique_keywords
                }
                deduplicated_sets.append(deduplicated_set)
            
            # 確保事件被發送
            print(f"[Backend] Sending keyword-sets-updated event with {len(deduplicated_sets)} sets", file=sys.stderr)
            self.send_event("keyword-sets-updated", {"keywordSets": deduplicated_sets})
        except Exception as e:
            print(f"[Backend] Error sending keyword sets update: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            # 即使出錯，也嘗試發送一個空數組或最後已知的狀態，避免前端狀態卡住
            try:
                # 嘗試獲取一個簡化的狀態
                keyword_sets = await db.get_all_keyword_sets()
                self.send_event("keyword-sets-updated", {"keywordSets": keyword_sets if keyword_sets else []})
            except:
                # 如果連這個都失敗，至少發送空數組
                self.send_event("keyword-sets-updated", {"keywordSets": []})

    async def send_groups_update(self):
        """Send monitored groups update to frontend
        🔧 修復：同時發送兩個事件名，確保所有前端監聽器都能收到
        - get-groups-result: monitoring-state.service.ts 主監聽器（字段: groups）
        - groups-updated: 舊事件名，保持向後兼容（字段: monitoredGroups + groups）
        """
        try:
            groups = await db.get_all_groups()
            # 🔧 核心修復：發送前端實際監聽的事件名和字段
            self.send_event("get-groups-result", {"groups": groups})
            # 保持向後兼容（其他組件可能監聽此事件）
            self.send_event("groups-updated", {"monitoredGroups": groups, "groups": groups})
        except Exception as e:
            print(f"[Backend] Error sending groups update: {e}", file=sys.stderr)

    async def send_templates_update(self):
        """Send only message templates update to frontend"""
        try:
            templates = await db.get_all_templates()
            self.send_event("templates-updated", {"messageTemplates": templates, "chatTemplates": templates})
        except Exception as e:
            print(f"[Backend] Error sending templates update: {e}", file=sys.stderr)

    async def send_campaigns_update(self):
        """Send only campaigns update to frontend"""
        try:
            campaigns = await db.get_all_campaigns()
            self.send_event("campaigns-updated", {"campaigns": campaigns})
        except Exception as e:
            print(f"[Backend] Error sending campaigns update: {e}", file=sys.stderr)

    async def send_leads_update(self):
        """Send only leads update to frontend（🆕 包含 total）"""
        try:
            # 🆕 使用 get_leads_with_total 獲取完整數據和總數
            data = await db.get_leads_with_total()
            leads = data.get('leads', [])
            total = data.get('total', len(leads))
            
            for lead in leads:
                if isinstance(lead.get('timestamp'), str):
                    pass
                else:
                    lead['timestamp'] = datetime.fromisoformat(lead['timestamp']).isoformat() + "Z"
                for interaction in lead.get('interactionHistory', []):
                    if isinstance(interaction.get('timestamp'), str):
                        pass
                    else:
                        interaction['timestamp'] = datetime.fromisoformat(interaction['timestamp']).isoformat() + "Z"
            
            self.send_event("leads-updated", {"leads": leads, "total": total})
        except Exception as e:
            print(f"[Backend] Error sending leads update: {e}", file=sys.stderr)
    
    # ========== End Partial Update Functions ==========

    def _on_message_sent_callback(self, lead_id: int, rule_id: Optional[int] = None):
        """Create callback for when message is sent. rule_id 用於觸發規則發送成功後回寫統計。"""
        async def callback(message, result):
            if rule_id is not None:
                try:
                    from database import db
                    await db.increment_trigger_rule_stats(rule_id, success=result.get('success', False))
                except Exception as e:
                    import sys
                    print(f"[Backend] increment_trigger_rule_stats error: {e}", file=sys.stderr)
            if result.get('success'):
                # 🔧 P0：區分確認送達 vs 不確定送達
                is_uncertain = result.get('uncertain', False)
                action_type = 'Message Sent (Uncertain)' if is_uncertain else 'Message Sent'
                
                await db.add_interaction(lead_id, action_type, message.text)
                
                if is_uncertain:
                    await db.add_log(f"Message to lead {lead_id}: delivery uncertain (no message_id)", "warning")
                else:
                    await db.add_log(f"Message sent to lead {lead_id}", "success")
                
                # 🆕 自動狀態流轉：只有確認送達才自動變為「已聯繫」
                lead = await db.get_lead(lead_id)
                status_changed = False
                if lead and lead.get('status') == 'New' and not is_uncertain:
                    await db.update_lead_status(lead_id, 'Contacted')
                    status_changed = True
                    await db.add_log(f"Lead {lead_id} 狀態自動更新: New → Contacted", "info")
                
                # Send success event
                self.send_event("message-sent", {
                    "leadId": lead_id,
                    "accountPhone": message.phone,
                    "userId": message.user_id,
                    "success": True,
                    "uncertain": is_uncertain,
                    "messageId": message.id,
                    "statusChanged": status_changed
                })
                
                # 🆕 如果狀態變更，通知前端刷新 leads 數據
                if status_changed:
                    await self.send_leads_update()
            else:
                error = result.get('error', 'Unknown error')
                await db.add_log(f"Failed to send message to lead {lead_id}: {error}", "error")
                
                # Send failure event
                self.send_event("message-sent", {
                    "leadId": lead_id,
                    "accountPhone": message.phone,
                    "userId": message.user_id,
                    "success": False,
                    "error": error,
                    "messageId": message.id
                })
        
        return callback

