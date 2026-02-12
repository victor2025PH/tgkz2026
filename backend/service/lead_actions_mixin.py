"""
P0: Lead 捕獲後的動作 — 問候、觸發規則、活動
保證監控到 Lead 後鏈路不斷：_handle_ai_auto_greeting、execute_matching_trigger_rules、execute_matching_campaigns
P0 優化：統一模板變量替換、同一事件只執行一條觸發規則、Lead+規則冷卻去重。
"""
import sys
import json
import asyncio
import time
from typing import Dict, Any, List, Optional

from database import db

# P1 冷卻：同一 (user_id, rule_id) 在 COOLDOWN_SEC 內只發一條
_lead_rule_cooldown: Dict[tuple, float] = {}
_COOLDOWN_SEC = 600  # 10 分鐘


def _get_MessagePriority():
    try:
        from message_queue import MessagePriority
        return MessagePriority
    except Exception:
        from enum import IntEnum
        class _F(IntEnum):
            HIGH = 1
            NORMAL = 2
            LOW = 3
        return _F


def _get_ai_auto_chat():
    try:
        from service_locator import ai_auto_chat
        return ai_auto_chat
    except Exception:
        return None


class LeadActionsMixin:
    """Mixin：Lead 捕獲後執行問候、觸發規則、活動。需與 BackendService 混用（提供 message_queue, send_log, send_event）。"""

    async def _handle_ai_auto_greeting(self, lead_data: Dict[str, Any], lead_id: int) -> None:
        """
        對新 Lead 或尚未問候的現有 Lead 發送 AI 問候（或回退模板）。
        使用 ai_auto_chat 生成問候語，通過 message_queue 發送。
        """
        try:
            user_id = str(lead_data.get('user_id', ''))
            username = lead_data.get('username', '') or lead_data.get('first_name', '') or '你'
            source_group = lead_data.get('source_group_url') or lead_data.get('source_group', '')
            account_phone = lead_data.get('account_phone', '')
            first_name = lead_data.get('first_name', '') or username

            if not user_id:
                self.send_log("[問候] 跳過：user_id 為空", "warning")
                return
            if not getattr(self, 'message_queue', None):
                self.send_log("[問候] 跳過：message_queue 未就緒", "warning")
                return

            # 1) 嘗試 AI 生成問候
            greeting_text: Optional[str] = None
            ai = _get_ai_auto_chat()
            if ai and getattr(ai, '_generate_response_with_prompt', None):
                try:
                    prompt = f"用一句簡短友好的話問候這位剛在群裡發過言的新朋友，他叫 {first_name or username}。不要長篇大論，一句話即可。"
                    greeting_text = await ai._generate_response_with_prompt(
                        user_id=user_id,
                        user_message=f"請生成一句問候語，對象：{first_name or username}",
                        custom_prompt=prompt,
                        usage_type='dailyChat'
                    )
                except Exception as e:
                    print(f"[LeadActions] AI 問候生成失敗: {e}", file=sys.stderr)
                    self.send_log(f"[問候] AI 生成失敗，使用默認問候: {e}", "warning")

            if not greeting_text or not greeting_text.strip():
                greeting_text = f"你好呀 {first_name or username}～ 剛在群裡看到你的消息，有什麼可以幫到你？"

            # 2) 選擇發送帳號：優先 Sender，否則任意在線
            accounts = await db.get_all_accounts()
            sender = None
            for acc in accounts:
                if acc.get('status') == 'Online' and acc.get('role') == 'Sender':
                    sender = acc
                    break
            if not sender:
                for acc in accounts:
                    if acc.get('status') == 'Online':
                        sender = acc
                        break
            if not sender:
                self.send_log("[問候] 無在線發送帳號，問候未發送", "warning")
                await db.add_log("問候未發送：無在線帳號", "warning")
                return

            phone = sender.get('phone')
            # 3) 入隊發送（與 handle_send_message 一致）
            await self.message_queue.add_message(
                phone=phone,
                user_id=user_id,
                text=greeting_text.strip(),
                attachment=None,
                source_group=source_group,
                target_username=username,
                priority=_get_MessagePriority().NORMAL,
                scheduled_at=None,
                callback=self._on_message_sent_callback(lead_id)
            )
            self.send_log(f"[問候] 已入隊 → {user_id} (@{username})", "success")
            await db.add_log(f"問候已入隊 lead_id={lead_id} user_id={user_id}", "info")
        except Exception as e:
            print(f"[LeadActions] _handle_ai_auto_greeting error: {e}", file=sys.stderr)
            self.send_log(f"[問候] 失敗: {e}", "error")
            await db.add_log(f"問候失敗 lead_id={lead_id}: {e}", "error")

    async def execute_matching_trigger_rules(self, lead_id: int, lead_data: Dict[str, Any]) -> None:
        """
        執行匹配的觸發規則。P0 優化：同一關鍵詞匹配只執行優先級最高的一條規則；
        模板使用統一變量替換（{{username}}/{{keyword}}/{{date}} 等）；Lead+規則冷卻去重。
        """
        try:
            from core.template_render import render_template_content, build_lead_context
        except ImportError:
            render_template_content = None
            build_lead_context = None

        tenant_token = None
        try:
            rules = await db.get_all_trigger_rules()
            active = [r for r in rules if r.get('isActive', r.get('is_active', True))]
            if not active:
                print(f"[LeadActions] 觸發規則: 無活躍規則（共 {len(rules)} 條），未發送。請在「觸發規則」中啟用至少一條。", file=sys.stderr)
                self.send_log("[觸發規則] 無活躍規則，未發送。請在「觸發規則」中啟用至少一條。", "info")
                return

            user_id = str(lead_data.get('user_id', ''))
            username = lead_data.get('username', '') or ''
            source_group = lead_data.get('source_group_url') or lead_data.get('source_group', '')
            if not user_id:
                return
            if not getattr(self, 'message_queue', None):
                return

            # P1: 使用規則所屬用戶的租戶上下文取帳號與 AI 設置，確保多用戶下用對發送號
            rule = active[0]
            owner_user_id = rule.get('owner_user_id') or ''
            if owner_user_id:
                try:
                    from core.tenant_context import TenantContext, set_current_tenant, clear_current_tenant
                    tenant = TenantContext(user_id=owner_user_id)
                    tenant_token = set_current_tenant(tenant)
                except Exception:
                    pass

            accounts = await db.get_all_accounts()
            sender = None
            for acc in accounts:
                if acc.get('status') == 'Online' and acc.get('role') == 'Sender':
                    sender = acc
                    break
            if not sender:
                for acc in accounts:
                    if acc.get('status') == 'Online':
                        sender = acc
                        break
            if not sender:
                self.send_log("[觸發規則] 無在線發送帳號", "warning")
                return

            phone = sender.get('phone')
            first_name = lead_data.get('first_name', '') or username
            triggered_keyword = lead_data.get('triggered_keyword', '')
            context = build_lead_context(lead_data, triggered_keyword, '') if build_lead_context else {}

            # P0：同一事件只執行一條規則（已按 priority DESC 排序，取第一條）；rule 已在上方取得
            rule_id = rule.get('id')
            # P1 冷卻：同一 user_id + rule_id 在冷卻期內不重複發
            cooldown_key = (user_id, rule_id)
            now_ts = time.time()
            if cooldown_key in _lead_rule_cooldown and (now_ts - _lead_rule_cooldown[cooldown_key]) < _COOLDOWN_SEC:
                self.send_log(f"[觸發規則] 冷卻中，跳過 rule={rule.get('name')} → {user_id}", "info")
                return
            # 清理過期冷卻鍵
            for k in list(_lead_rule_cooldown.keys()):
                if now_ts - _lead_rule_cooldown[k] >= _COOLDOWN_SEC:
                    _lead_rule_cooldown.pop(k, None)

            try:
                response_type = rule.get('responseType', rule.get('response_type', 'ai_chat'))
                response_config = rule.get('responseConfig', rule.get('response_config')) or {}
                if isinstance(response_config, str):
                    try:
                        response_config = json.loads(response_config)
                    except Exception:
                        response_config = {}

                text: Optional[str] = None
                if response_type == 'template' and response_config.get('templateId'):
                    tpl_id = response_config.get('templateId')
                    tpl = None
                    try:
                        if hasattr(db, 'fetch_one'):
                            row = await db.fetch_one('SELECT id, content, name FROM chat_templates WHERE id = ?', (tpl_id,))
                            if row:
                                tpl = dict(row) if hasattr(row, 'keys') else {'content': row[1] if len(row) > 1 else ''}
                    except Exception:
                        pass
                    if tpl and tpl.get('content'):
                        raw = (tpl.get('content') or '').strip()
                        if render_template_content and context:
                            text = render_template_content(raw, context)
                        else:
                            text = raw.replace('{{username}}', context.get('username', username)).replace('{{firstName}}', context.get('firstName', first_name)).replace('{{keyword}}', context.get('keyword', triggered_keyword)).replace('{username}', username).replace('{firstName}', first_name).replace('{keyword}', triggered_keyword)
                        if not text:
                            text = raw
                if not text and (response_type == 'ai_chat' or not text):
                    ai = _get_ai_auto_chat()
                    if ai and getattr(ai, '_generate_response_with_prompt', None):
                        text = await ai._generate_response_with_prompt(
                            user_id=user_id,
                            user_message=f"用戶剛觸發關鍵詞「{triggered_keyword}」，請用一句話友好回覆。",
                            custom_prompt="簡短友好一句話回覆，不要長篇。",
                            usage_type='dailyChat'
                        )
                    if not text:
                        text = f"你好 {first_name or username}，看到你對「{triggered_keyword}」感興趣，有需要可以私聊我～"

                if not text or not text.strip():
                    return
                await self.message_queue.add_message(
                    phone=phone,
                    user_id=user_id,
                    text=text.strip(),
                    attachment=None,
                    source_group=source_group,
                    target_username=username,
                    priority=_get_MessagePriority().NORMAL,
                    scheduled_at=None,
                    callback=self._on_message_sent_callback(lead_id, rule_id=rule_id)
                )
                _lead_rule_cooldown[cooldown_key] = time.time()
                self.send_log(f"[觸發規則] 已入隊 rule={rule.get('name', rule.get('id'))} → {user_id}", "success")
            except Exception as rule_err:
                print(f"[LeadActions] trigger rule error: {rule_err}", file=sys.stderr)
                self.send_log(f"[觸發規則] 單條失敗: {rule_err}", "warning")
                await db.add_log(f"觸發規則執行失敗 lead_id={lead_id} rule_id={rule.get('id')}: {rule_err}", "error")
        except Exception as e:
            print(f"[LeadActions] execute_matching_trigger_rules error: {e}", file=sys.stderr)
            self.send_log(f"[觸發規則] 失敗: {e}", "error")
            await db.add_log(f"觸發規則失敗 lead_id={lead_id}: {e}", "error")
        finally:
            if tenant_token:
                try:
                    from core.tenant_context import clear_current_tenant
                    clear_current_tenant(tenant_token)
                except Exception:
                    pass

    async def execute_matching_campaigns(self, lead_id: int, lead_data: Dict[str, Any]) -> None:
        """
        執行匹配的活動（Campaigns）：取啟用活動，若有首條消息則發送。
        P0：最小實現 — 僅處理有 message_template 或首條文案的活動。
        """
        try:
            campaigns = await db.get_all_campaigns()
            if not campaigns:
                return
            # 活動表可能無 is_active 或字段名不同
            active = []
            for c in campaigns:
                if c.get('isActive', c.get('is_active', False)):
                    active.append(c)

            user_id = str(lead_data.get('user_id', ''))
            username = lead_data.get('username', '') or ''
            source_group = lead_data.get('source_group_url') or lead_data.get('source_group', '')
            if not user_id:
                return
            if not getattr(self, 'message_queue', None):
                return

            accounts = await db.get_all_accounts()
            sender = None
            for acc in accounts:
                if acc.get('status') == 'Online':
                    sender = acc
                    if acc.get('role') == 'Sender':
                        break
            if not sender:
                return

            phone = sender.get('phone')
            first_name = lead_data.get('first_name', '') or username

            try:
                from core.template_render import render_template_content, build_lead_context
            except ImportError:
                render_template_content = None
                build_lead_context = None
            ctx = build_lead_context(lead_data, lead_data.get('triggered_keyword', ''), '') if build_lead_context else {'username': username, 'firstName': first_name, 'firstname': first_name, 'keyword': lead_data.get('triggered_keyword', '')}

            for camp in active:
                try:
                    # 活動可能含 message_template、message、first_message 等
                    text = camp.get('message') or camp.get('first_message') or camp.get('messageTemplate', '')
                    if isinstance(text, dict):
                        text = text.get('content', text.get('text', '')) or ''
                    template_id = camp.get('templateId', camp.get('template_id'))
                    if not text and template_id:
                        try:
                            row = await db.fetch_one('SELECT id, content FROM chat_templates WHERE id = ?', (template_id,))
                            if row:
                                tpl = dict(row) if hasattr(row, 'keys') else {'content': row[1] if len(row) > 1 else ''}
                                text = tpl.get('content', '')
                        except Exception:
                            pass
                    if not text or not text.strip():
                        continue
                    if render_template_content and ctx:
                        text = render_template_content(text, ctx)
                    else:
                        text = text.replace('{firstName}', first_name).replace('{username}', username).replace('{{username}}', username).replace('{{firstName}}', first_name)
                    await self.message_queue.add_message(
                        phone=phone,
                        user_id=user_id,
                        text=text.strip(),
                        attachment=None,
                        source_group=source_group,
                        target_username=username,
                        priority=_get_MessagePriority().NORMAL,
                        scheduled_at=None,
                        callback=self._on_message_sent_callback(lead_id)
                    )
                    self.send_log(f"[活動] 已入隊 campaign={camp.get('name', camp.get('id'))} → {user_id}", "success")
                except Exception as camp_err:
                    print(f"[LeadActions] campaign error: {camp_err}", file=sys.stderr)
                    await db.add_log(f"活動執行失敗 lead_id={lead_id} campaign_id={camp.get('id')}: {camp_err}", "error")
        except Exception as e:
            print(f"[LeadActions] execute_matching_campaigns error: {e}", file=sys.stderr)
            self.send_log(f"[活動] 失敗: {e}", "error")
            await db.add_log(f"活動失敗 lead_id={lead_id}: {e}", "error")
