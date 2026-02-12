"""
Phase 9-3: QR login, config check, diagnostics, resource verification, team execution
Extracted from BackendService in main.py.
"""
import sys
import json
import time
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from pathlib import Path

# Re-use main.py's db and module accessors
from database import db
from config import config, IS_DEV_MODE

def _get_module(name: str):
    """Safe lazy module accessor."""
    from lazy_imports import lazy_imports
    return lazy_imports.get(name)


# ====================================================================
# 🔧 P4-2: 延迟获取器 — 修复 Phase 9 拆分后遗漏的全局引用
# ====================================================================

def _get_jiso_search_service():
    try:
        return _get_module('jiso_search_service').jiso_search_service
    except Exception:
        return None

def _get_private_message_poller():
    try:
        return _get_module('private_message_poller').private_message_poller
    except Exception:
        return None

def _get_flood_handler():
    try:
        from flood_wait_handler import flood_handler
        return flood_handler
    except Exception:
        return None


# 🔧 P1: 從 main.py 延遲導入共享狀態（避免循環依賴）
# 這些模塊級變量在 main.py 中定義，此 mixin 的 handle_get_command_diagnostics 使用
# 使用延遲導入模式：首次訪問時從 main.py 獲取引用

_command_metrics = None
_unknown_command_counter = None
_routing_stats = None
COMMAND_ALIAS_REGISTRY = None
ROUTER_AVAILABLE = False

def _ensure_main_refs():
    """延遲初始化 main.py 的共享引用"""
    global _command_metrics, _unknown_command_counter, _routing_stats, COMMAND_ALIAS_REGISTRY, ROUTER_AVAILABLE
    if _command_metrics is None:
        try:
            import main
            _command_metrics = getattr(main, '_command_metrics', {})
            _unknown_command_counter = getattr(main, '_unknown_command_counter', {})
            _routing_stats = getattr(main, '_routing_stats', {})
            COMMAND_ALIAS_REGISTRY = getattr(main, 'COMMAND_ALIAS_REGISTRY', {})
            ROUTER_AVAILABLE = getattr(main, 'ROUTER_AVAILABLE', False)
        except Exception as e:
            print(f"[ConfigExecMixin] Warning: Cannot import main.py refs: {e}", file=sys.stderr)
            _command_metrics = {}
            _unknown_command_counter = {}
            _routing_stats = {}
            COMMAND_ALIAS_REGISTRY = {}
            ROUTER_AVAILABLE = False

class ConfigExecMixin:
    """Mixin: QR login, config check, diagnostics, resource verification, team execution"""

    async def _handle_qr_login_account_ready(self, payload: Dict[str, Any]):
        """
        處理 QR 登入成功事件，將帳號添加到數據庫
        
        Args:
            payload: QR 登入返回的帳號數據，包含 phone, api_id, api_hash, session_string, device_fingerprint 等
        """
        try:
            phone = payload.get('phone', '')
            api_id = payload.get('api_id') or payload.get('apiId')  # 支持兩種字段名
            api_hash = payload.get('api_hash') or payload.get('apiHash')  # 支持兩種字段名
            proxy = payload.get('proxy', '')
            session_string = payload.get('session_string', '')
            device_fingerprint = payload.get('device_fingerprint', {})
            user_info = payload.get('user_info', {})
            
            print(f"[Backend] Handling QR login account ready for {phone}", file=sys.stderr)
            print(f"[Backend] QR login payload: api_id={api_id}, api_hash={'***' if api_hash else None}", file=sys.stderr)
            
            if not phone:
                print(f"[Backend] Error: No phone number in QR login payload", file=sys.stderr)
                return
            
            # 確保 API 憑證存在（QR 登入時必須有）
            if not api_id or not api_hash:
                print(f"[Backend] Warning: Missing API credentials in QR login payload. Payload keys: {list(payload.keys())}", file=sys.stderr)
                # 嘗試從 client 獲取（如果 payload 中有 client 信息）
                # 如果還是沒有，使用默認的公共 API 憑證
                if not api_id or not api_hash:
                    print(f"[Backend] Using default public API credentials for QR login", file=sys.stderr)
                    # 使用 Telegram Desktop 的公共 API 憑證作為默認值
                    api_id = api_id or "2040"
                    api_hash = api_hash or "b18441a1ff607e10a989891a5462e627"
            
            # 檢查帳號是否已存在
            existing_account = await db.get_account_by_phone(phone)
            
            if existing_account:
                # 帳號已存在，更新相關信息
                account_id = existing_account.get('id')
                print(f"[Backend] Account {phone} already exists (ID: {account_id}), updating...", file=sys.stderr)
                
                update_data = {
                    'status': 'Online',  # QR 登入成功，設置為在線
                }
                
                # 強制更新 API 憑據（QR 登入時必須有）
                # 優先使用新的 API 憑證，如果沒有則檢查現有帳號是否有
                if api_id and api_hash:
                    update_data['apiId'] = str(api_id)
                    update_data['apiHash'] = str(api_hash)
                    print(f"[Backend] Updating API credentials: apiId={api_id}", file=sys.stderr)
                elif not existing_account.get('apiId') or not existing_account.get('apiHash'):
                    # 如果現有帳號沒有 API 憑證，使用默認公共憑證
                    print(f"[Backend] WARNING: Missing API credentials, using default public credentials", file=sys.stderr)
                    update_data['apiId'] = "2040"
                    update_data['apiHash'] = "b18441a1ff607e10a989891a5462e627"
                else:
                    # 保持現有的 API 憑證
                    print(f"[Backend] Keeping existing API credentials", file=sys.stderr)
                if proxy:
                    update_data['proxy'] = proxy
                
                # 更新設備指紋
                if device_fingerprint:
                    update_data['deviceModel'] = device_fingerprint.get('device_model', '')
                    update_data['systemVersion'] = device_fingerprint.get('system_version', '')
                    update_data['appVersion'] = device_fingerprint.get('app_version', '')
                    update_data['langCode'] = device_fingerprint.get('lang_code', '')
                    update_data['platform'] = device_fingerprint.get('platform', '')
                
                await db.update_account(account_id, update_data)
                self.send_log(f"✅ QR 登入成功，帳號 {phone} 已更新", "success")
            else:
                # 新帳號，添加到數據庫
                print(f"[Backend] Adding new account {phone} from QR login", file=sys.stderr)
                
                # 確保 API 憑證不為空（QR 登入時必須有）
                if not api_id or not api_hash:
                    print(f"[Backend] Error: Cannot add account without API credentials", file=sys.stderr)
                    self.send_log(f"❌ QR 登入失敗：缺少 API 憑證", "error")
                    return
                
                # ========== QR 登入智能角色分配 ==========
                all_accounts = await db.get_all_accounts()
                has_listener = any(a.get('role') == 'Listener' for a in all_accounts)
                has_sender = any(a.get('role') == 'Sender' for a in all_accounts)
                
                auto_role = 'Unassigned'
                role_message = None
                
                if not has_listener:
                    auto_role = 'Listener'
                    role_message = f'已自動將 {phone} 設為「監控號」（用於監控群組消息）'
                elif not has_sender:
                    auto_role = 'Sender'
                    role_message = f'已自動將 {phone} 設為「發送號」（用於發送消息給潛在客戶）'
                # ========== QR 登入智能角色分配結束 ==========

                account_data = {
                    'phone': phone,
                    'apiId': str(api_id),  # 強制轉換為字符串
                    'apiHash': str(api_hash),  # 確保不為空
                    'proxy': proxy or '',
                    'group': '',
                    'role': auto_role,  # 使用自動分配的角色
                    'status': 'Online',  # QR 登入成功，直接設置為在線
                    'twoFactorPassword': '',
                }

                print(f"[Backend] Adding account with API ID: {api_id}, API Hash: {'***' if api_hash else 'MISSING'}, role={auto_role}", file=sys.stderr)

                # 添加設備指紋
                if device_fingerprint:
                    account_data['deviceModel'] = device_fingerprint.get('device_model', '')
                    account_data['systemVersion'] = device_fingerprint.get('system_version', '')
                    account_data['appVersion'] = device_fingerprint.get('app_version', '')
                    account_data['langCode'] = device_fingerprint.get('lang_code', '')
                    account_data['platform'] = device_fingerprint.get('platform', '')

                account_id = await db.add_account(account_data)
                print(f"[Backend] Account {phone} added with ID: {account_id}", file=sys.stderr)

                # 使用 self.send_log 而不是 db.add_log（Database 類沒有這個方法）
                self.send_log(f"✅ QR 登入成功，帳號 {phone} 已添加", "success")
                
                # 顯示角色分配提示
                if role_message:
                    self.send_log(f"🎯 {role_message}", "success")
                else:
                    self.send_log(f"💡 帳號 {phone} 已登入，請在帳號管理中分配角色", "info")
            
            # 發送帳號列表更新事件
            await self._send_accounts_updated()
            
        except Exception as e:
            print(f"[Backend] Error handling QR login account ready: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            self.send_log(f"❌ QR 登入帳號處理失敗: {str(e)}", "error")

    async def check_monitoring_configuration(self) -> Dict[str, Any]:
        """
        完整配置檢查 - 在啟動監控前檢測所有必要配置
        
        Returns:
            Dict containing all check results and recommendations
        """
        checks = {
            "passed": True,
            "critical_issues": [],
            "warnings": [],
            "info": [],
            "details": {}
        }
        
        # ========== 1. 檢查監控帳號 ==========
        accounts = await db.get_all_accounts()
        listener_accounts = [a for a in accounts if a.get('role') == 'Listener']
        online_listeners = [a for a in listener_accounts if a.get('status') == 'Online']
        
        checks["details"]["listener_accounts"] = {
            "total": len(listener_accounts),
            "online": len(online_listeners),
            "accounts": [{"phone": a.get('phone'), "status": a.get('status')} for a in listener_accounts]
        }
        
        if not listener_accounts:
            checks["passed"] = False
            checks["critical_issues"].append({
                "code": "NO_LISTENER",
                "message": "沒有監控帳號（Listener 角色）",
                "fix": "在「帳戶管理」中將帳號角色設為「Listener」"
            })
        elif not online_listeners:
            checks["passed"] = False
            checks["critical_issues"].append({
                "code": "LISTENER_OFFLINE",
                "message": "監控帳號全部離線",
                "fix": "點擊「登入」按鈕使監控帳號上線"
            })
        else:
            checks["info"].append(f"✓ {len(online_listeners)} 個監控帳號在線")
        
        # ========== 2. 檢查發送帳號 ==========
        sender_accounts = [a for a in accounts if a.get('role') == 'Sender']
        online_senders = [a for a in sender_accounts if a.get('status') == 'Online']
        
        checks["details"]["sender_accounts"] = {
            "total": len(sender_accounts),
            "online": len(online_senders),
            "accounts": [{"phone": a.get('phone'), "status": a.get('status'), 
                         "dailySendCount": a.get('dailySendCount', 0),
                         "dailySendLimit": a.get('dailySendLimit', 50)} for a in sender_accounts]
        }
        
        if not sender_accounts:
            checks["warnings"].append({
                "code": "NO_SENDER",
                "message": "沒有發送帳號（Sender 角色）",
                "fix": "在「帳戶管理」中將帳號角色設為「Sender」，否則無法發送消息"
            })
        elif not online_senders:
            checks["warnings"].append({
                "code": "SENDER_OFFLINE",
                "message": "發送帳號全部離線",
                "fix": "點擊「登入」按鈕使發送帳號上線，否則無法發送消息"
            })
        else:
            # Check if any sender has remaining quota
            available_senders = [s for s in online_senders 
                                if s.get('dailySendCount', 0) < s.get('dailySendLimit', 50)]
            if not available_senders:
                checks["warnings"].append({
                    "code": "SENDER_LIMIT_REACHED",
                    "message": "所有發送帳號已達每日發送限額",
                    "fix": "等待明天重置限額，或增加新的發送帳號"
                })
            else:
                checks["info"].append(f"✓ {len(available_senders)} 個發送帳號可用")
        
        # ========== 3. 檢查監控群組 ==========
        monitored_groups = await db.get_all_monitored_groups()
        
        checks["details"]["monitored_groups"] = {
            "total": len(monitored_groups),
            "groups": [{"url": g.get('url'), "keywordSetIds": g.get('keywordSetIds', [])} 
                      for g in monitored_groups]
        }
        
        if not monitored_groups:
            checks["passed"] = False
            checks["critical_issues"].append({
                "code": "NO_GROUPS",
                "message": "沒有監控群組",
                "fix": "在「自動化中心」添加要監控的群組 URL"
            })
        else:
            checks["info"].append(f"✓ {len(monitored_groups)} 個監控群組")
        
        # ========== 4. 檢查關鍵詞集 ==========
        keyword_sets = await db.get_all_keyword_sets()
        
        # 計算總關鍵詞數
        total_keywords = sum(len(ks.get('keywords', [])) for ks in keyword_sets)
        
        checks["details"]["keyword_sets"] = {
            "total": len(keyword_sets),
            "total_keywords": total_keywords,
            "sets": [{"id": ks.get('id'), "name": ks.get('name'), 
                     "keywords": ks.get('keywords', [])} for ks in keyword_sets]
        }
        
        if not keyword_sets:
            checks["passed"] = False
            checks["critical_issues"].append({
                "code": "NO_KEYWORDS",
                "message": "沒有關鍵詞集",
                "fix": "在「自動化中心」創建關鍵詞集並添加關鍵詞"
            })
        elif total_keywords == 0:
            checks["passed"] = False
            checks["critical_issues"].append({
                "code": "EMPTY_KEYWORDS",
                "message": "關鍵詞集沒有任何關鍵詞",
                "fix": "在關鍵詞集中添加要監控的關鍵詞"
            })
        else:
            checks["info"].append(f"✓ {len(keyword_sets)} 個關鍵詞集，共 {total_keywords} 個關鍵詞")
        
        # ========== 5. 檢查群組與關鍵詞綁定 ==========
        groups_without_keywords = [g for g in monitored_groups if not g.get('keywordSetIds')]
        
        if groups_without_keywords and monitored_groups:
            checks["warnings"].append({
                "code": "GROUP_NO_KEYWORD",
                "message": f"{len(groups_without_keywords)} 個群組未綁定關鍵詞集",
                "fix": "在「監控群組」中為群組勾選關鍵詞集"
            })
        
        # ========== 6. 檢查舊版活動（Campaign）- 僅作為向後兼容 ==========
        # 注意：新系統使用「觸發規則」，舊版 Campaign 已被觸發規則取代
        campaigns = await db.get_all_campaigns()
        active_campaigns = [c for c in campaigns if c.get('isActive')]
        
        checks["details"]["campaigns"] = {
            "total": len(campaigns),
            "active": len(active_campaigns),
            "campaigns": [{
                "id": c.get('id'), 
                "name": c.get('name'), 
                "isActive": c.get('isActive'),
                "sourceGroupIds": c.get('trigger', {}).get('sourceGroupIds', []),
                "keywordSetIds": c.get('trigger', {}).get('keywordSetIds', []),
                "templateId": c.get('actions', [{}])[0].get('templateId', 0) if c.get('actions') else 0
            } for c in campaigns]
        }
        
        # 不再對舊版 Campaign 顯示警告，因為用戶應該使用「觸發規則」
        # 如果有舊版活動，只顯示為信息提示
        if active_campaigns:
            checks["info"].append(f"ℹ {len(active_campaigns)} 個舊版活動（建議遷移到觸發規則）")
        
        # ========== 7. 檢查消息模板 ==========
        templates = await db.get_all_templates()
        active_templates = [t for t in templates if t.get('isActive', True)]
        
        checks["details"]["templates"] = {
            "total": len(templates),
            "active": len(active_templates)
        }
        
        if not templates:
            checks["warnings"].append({
                "code": "NO_TEMPLATE",
                "message": "沒有消息模板",
                "fix": "在「自動化中心」創建消息模板"
            })
        else:
            checks["info"].append(f"✓ {len(templates)} 個消息模板")
        
        # ========== 8. 檢查 AI 設置 ==========
        ai_settings = await db.get_ai_settings()
        ai_enabled = ai_settings.get('auto_chat_enabled', 0) == 1
        ai_greeting_enabled = ai_settings.get('auto_greeting', 0) == 1
        ai_mode = ai_settings.get('auto_chat_mode', 'semi')
        
        checks["details"]["ai_settings"] = {
            "auto_chat_enabled": ai_enabled,
            "auto_greeting": ai_greeting_enabled,
            "auto_chat_mode": ai_mode
        }
        
        if ai_enabled:
            mode_names = {'full': '全自動', 'semi': '半自動', 'assist': '輔助', 'keyword': '關鍵詞觸發'}
            checks["info"].append(f"✓ AI 自動聊天已開啟 (模式: {mode_names.get(ai_mode, ai_mode)})")
            if ai_greeting_enabled:
                checks["info"].append("✓ AI 自動問候已開啟")
        else:
            checks["info"].append("ℹ AI 自動聊天未開啟（可在設置中開啟）")
        
        # ========== 檢查觸發規則 ==========
        trigger_rules = await db.get_all_trigger_rules()
        active_rules = [r for r in trigger_rules if r.get('is_active') or r.get('isActive')]
        
        checks["details"]["trigger_rules"] = {
            "total": len(trigger_rules),
            "active": len(active_rules)
        }
        
        if active_rules:
            checks["info"].append(f"✓ {len(active_rules)} 條觸發規則已啟用")
        
        # ========== 生成總結 ==========
        # 判斷是否能發送消息：有在線發送帳號 且 (有活動 或 有觸發規則 或 AI聊天已啟用)
        has_response_config = len(active_campaigns) > 0 or len(active_rules) > 0 or ai_enabled
        checks["summary"] = {
            "can_monitor": checks["passed"],
            "can_send_messages": len(online_senders) > 0 and has_response_config,
            "critical_count": len(checks["critical_issues"]),
            "warning_count": len(checks["warnings"]),
            "info_count": len(checks["info"])
        }
        
        return checks

    async def handle_get_command_diagnostics(self, payload=None):
        """Phase4: 命令診斷看板 — 別名註冊表 + 未知命令 + 執行度量"""
        _ensure_main_refs()  # 🔧 P1: 確保 main.py 共享引用已初始化
        # 計算 Top 命令（按失敗率排序）
        top_failed = sorted(
            [(cmd, m) for cmd, m in _command_metrics.items() if m['failed'] > 0],
            key=lambda x: x[1]['failed'],
            reverse=True
        )[:15]
        
        # 計算 Top 慢命令（按平均耗時排序）
        top_slow = sorted(
            [(cmd, m) for cmd, m in _command_metrics.items() if m['count'] >= 3],
            key=lambda x: x[1]['total_ms'] / max(1, x[1]['count']),
            reverse=True
        )[:10]
        
        total_commands = sum(m['count'] for m in _command_metrics.values())
        total_success = sum(m['success'] for m in _command_metrics.values())
        total_failed = sum(m['failed'] for m in _command_metrics.values())
        
        diagnostics = {
            'alias_registry': {
                'total': len(COMMAND_ALIAS_REGISTRY),
                'aliases': {cmd: f"{mod}.{fn}" for cmd, (mod, fn) in COMMAND_ALIAS_REGISTRY.items()}
            },
            'unknown_commands': dict(sorted(
                _unknown_command_counter.items(),
                key=lambda x: x[1],
                reverse=True
            )[:20]),
            'unknown_total': sum(_unknown_command_counter.values()),
            'router_available': ROUTER_AVAILABLE,
            # 🆕 Phase4: 命令執行度量
            'metrics_summary': {
                'total_commands': total_commands,
                'total_success': total_success,
                'total_failed': total_failed,
                'success_rate': round(total_success / max(1, total_commands) * 100, 1),
                'unique_commands': len(_command_metrics)
            },
            'top_failed_commands': [
                {
                    'command': cmd,
                    'failed': m['failed'],
                    'success': m['success'],
                    'total': m['count'],
                    'fail_rate': round(m['failed'] / max(1, m['count']) * 100, 1),
                    'last_error': m.get('last_error', '')[:200]
                }
                for cmd, m in top_failed
            ],
            'top_slow_commands': [
                {
                    'command': cmd,
                    'avg_ms': round(m['total_ms'] / max(1, m['count']), 1),
                    'count': m['count']
                }
                for cmd, m in top_slow
            ],
            # 🆕 Phase5: 路由方式統計
            'routing_stats': dict(_routing_stats),
            'routing_coverage': {
                'router_pct': round(_routing_stats.get('router', 0) / max(1, total_commands) * 100, 1),
                'alias_pct': round(_routing_stats.get('alias', 0) / max(1, total_commands) * 100, 1),
                'getattr_pct': round(_routing_stats.get('getattr', 0) / max(1, total_commands) * 100, 1),
                'if_elif_pct': round(_routing_stats.get('if_elif', 0) / max(1, total_commands) * 100, 1),
                'unknown_pct': round(_routing_stats.get('unknown', 0) / max(1, total_commands) * 100, 1),
                'explicit_route_pct': round(
                    (_routing_stats.get('router', 0) + _routing_stats.get('alias', 0) + _routing_stats.get('if_elif', 0)) 
                    / max(1, total_commands) * 100, 1
                )  # router + alias + if_elif = 顯式路由百分比
            },
            # Per-command route breakdown (top 30 most called)
            'per_command_routes': {
                cmd: m.get('route', 'unknown')
                for cmd, m in sorted(
                    _command_metrics.items(),
                    key=lambda x: x[1]['count'],
                    reverse=True
                )[:30]
            },
            # 🆕 Phase4: FloodWait 狀態
            'flood_wait_status': {}
        }
        
        # 添加 FloodWait 冷卻狀態
        try:
            _flood = _get_flood_handler()
            import time as _time
            for phone, until in (_flood._flood_wait_until if _flood else {}).items():
                remaining = until - _time.time()
                if remaining > 0:
                    diagnostics['flood_wait_status'][phone[:4] + '****'] = {
                        'remaining_seconds': round(remaining, 1),
                        'until': datetime.fromtimestamp(until).isoformat()
                    }
        except Exception:
            pass
        
        self.send_event("command-diagnostics", diagnostics)
        return diagnostics

    async def _refresh_custom_bots(self):
        """刷新自定義 Bot 列表到 jiso_search_service"""
        try:
            channels = await db.get_custom_search_channels(enabled_only=True)
            custom_bots = [ch['bot_username'] for ch in channels]
            jiso_svc = _get_jiso_search_service()
            if jiso_svc:
                jiso_svc.config.custom_bots = custom_bots
            self.send_log(f"🔄 已刷新自定義 Bot 列表: {len(custom_bots)} 個", "info")
        except Exception as e:
            self.send_log(f"刷新自定義 Bot 列表失敗: {e}", "warning")

    async def _auto_verify_resource_types(self, resources: list):
        """後台自動驗證資源類型"""
        import asyncio
        
        try:
            # 找出未驗證的資源（type_verified = 0 或不存在）
            unverified = [r for r in resources if not r.get('type_verified')]
            
            if not unverified:
                return
            
            # 獲取在線帳號
            accounts = await db.get_all_accounts()
            online_phone = None
            for acc in accounts:
                if acc.get('status') == 'Online':
                    phone = acc.get('phone')
                    if phone in self.telegram_manager.clients:
                        online_phone = phone
                        break
            
            if not online_phone:
                return  # 沒有可用帳號，跳過驗證
            
            client = self.telegram_manager.clients[online_phone]
            
            # 批量驗證（每次最多 5 個，使用智能 FloodWait 處理）
            verified_count = 0
            for resource in unverified[:5]:
                try:
                    username = resource.get('username', '')
                    invite_link = resource.get('invite_link', '')
                    chat_target = username or invite_link
                    
                    if not chat_target:
                        continue
                    
                    # 🆕 使用智能 FloodWait 處理
                    _flood = _get_flood_handler()
                    if _flood:
                        await _flood.wait_before_operation(online_phone, 'get_chat')
                    
                    chat_info = await client.get_chat(chat_target)
                    
                    if chat_info:
                        from pyrogram.enums import ChatType
                        if chat_info.type == ChatType.CHANNEL:
                            new_type = "channel"
                        elif chat_info.type == ChatType.SUPERGROUP:
                            new_type = "supergroup"
                        elif chat_info.type == ChatType.GROUP:
                            new_type = "group"
                        else:
                            new_type = resource.get('resource_type', 'unknown')
                        
                        old_type = resource.get('resource_type', 'unknown')
                        resource_id = resource.get('id')
                        
                        # 更新數據庫
                        await db.execute(
                            "UPDATE discovered_resources SET resource_type = ?, type_verified = 1 WHERE id = ?",
                            (new_type, resource_id)
                        )
                        await db._connection.commit()
                        
                        verified_count += 1
                        
                        if new_type != old_type:
                            # 發送更新事件到前端
                            self.send_event("resource-type-verified", {
                                "success": True,
                                "resourceId": resource_id,
                                "oldType": old_type,
                                "newType": new_type,
                                "title": resource.get('title', '')
                            })
                            
                except Exception as e:
                    error_str = str(e).lower()
                    resource_id = resource.get('id')
                    username = resource.get('username', 'unknown')
                    
                    # 錯誤分類和處理
                    if 'username not found' in error_str or 'not found' in error_str:
                        # 用戶名不存在：標記為無效
                        await db.execute(
                            "UPDATE discovered_resources SET status = 'invalid', type_verified = 1, notes = ? WHERE id = ?",
                            (f"用戶名不存在: {username}", resource_id)
                        )
                        await db._connection.commit()
                        # 只在調試時輸出（避免日誌過多）
                        print(f"[Backend] Resource {resource_id}: Username not found ({username})", file=sys.stderr)
                    elif 'floodwait' in error_str:
                        # FloodWait：跳過，稍後重試
                        print(f"[Backend] FloodWait during verification, skipping remaining", file=sys.stderr)
                        break  # 停止本次驗證，避免觸發更多限制
                    elif 'peer_flood' in error_str or 'flood' in error_str:
                        # 觸發 Flood 限制，停止驗證
                        print(f"[Backend] Flood limit hit, stopping verification", file=sys.stderr)
                        break
                    elif 'forbidden' in error_str or 'access' in error_str:
                        # 權限問題：標記需要手動驗證
                        await db.execute(
                            "UPDATE discovered_resources SET notes = ? WHERE id = ?",
                            (f"需要手動驗證: 權限不足", resource_id)
                        )
                        await db._connection.commit()
                    else:
                        # 其他錯誤：只記錄日誌
                        print(f"[Backend] Auto-verify error for resource {resource_id}: {e}", file=sys.stderr)
                    continue
            
            if verified_count > 0:
                print(f"[Backend] Auto-verified {verified_count} resource types", file=sys.stderr)
                
        except Exception as e:
            print(f"[Backend] Error in auto-verify task: {e}", file=sys.stderr)

    def _get_friendly_join_error(self, error: str) -> str:
        """將技術錯誤轉換為用戶友好的信息（帶 error_code）"""
        error_lower = error.lower()
        
        # 🔧 Phase2: 增強錯誤映射 — 包含 error_code 供前端區分處理
        error_mappings = {
            'flood_wait': ('FLOOD_WAIT', '操作過於頻繁，請稍後再試'),
            'floodwait': ('FLOOD_WAIT', '操作過於頻繁，請稍後再試'),
            'user_already_participant': ('ALREADY_MEMBER', '您已經是該群組的成員'),
            'invite_hash_expired': ('INVITE_EXPIRED', '邀請鏈接已失效或過期，請聯繫群主獲取新鏈接'),
            'invitehashexpired': ('INVITE_EXPIRED', '邀請鏈接已失效或過期，請聯繫群主獲取新鏈接'),
            'invite_hash_invalid': ('INVITE_INVALID', '邀請鏈接無效，可能已被撤銷或格式錯誤'),
            'invitehashinvalid': ('INVITE_INVALID', '邀請鏈接無效，可能已被撤銷或格式錯誤'),
            'invite_request_sent': ('INVITE_PENDING', '已發送加入申請，等待管理員審核'),
            'user_not_participant': ('NOT_MEMBER', '您不是該群組的成員'),
            'chat_write_forbidden': ('WRITE_FORBIDDEN', '沒有權限發送消息到該群組'),
            'peer_id_invalid': ('PEER_INVALID', '群組 ID 無效，該群組可能已被刪除或遷移'),
            'username_not_occupied': ('USERNAME_NOT_FOUND', '找不到該群組，用戶名不存在或已更改'),
            'username_invalid': ('USERNAME_INVALID', '群組用戶名格式無效'),
            'channel_private': ('CHANNEL_PRIVATE', '這是私有群組，需要邀請鏈接才能加入'),
            'channel_invalid': ('CHANNEL_INVALID', '無效的頻道/群組，可能已被刪除'),
            'chat_invalid': ('CHAT_INVALID', '無效的聊天，該群組可能已不存在'),
            'user_banned_in_channel': ('USER_BANNED', '您的帳號已被該群組封禁'),
            'userbannedin': ('USER_BANNED', '您的帳號已被該群組封禁'),
            'chat_admin_required': ('ADMIN_REQUIRED', '需要管理員邀請才能加入'),
            'channels_too_much': ('TOO_MANY_CHANNELS', '已加入太多群組/頻道，請先退出一些'),
            'users_too_much': ('GROUP_FULL', '群組成員已滿，無法加入'),
            'no attribute': ('SYSTEM_ERROR', '功能暫時不可用，請重啟應用後重試'),
            'not connected': ('NOT_CONNECTED', '帳號未連接，請先登錄帳號'),
            'account not connected': ('NOT_CONNECTED', '帳號未連接，請先登錄帳號'),
            '沒有可用的已連接帳號': ('NOT_CONNECTED', '請先在「帳號管理」中登錄至少一個帳號'),
            'timeout': ('TIMEOUT', '連接超時，請檢查網絡後重試'),
        }
        
        for key, (code, friendly_msg) in error_mappings.items():
            if key in error_lower:
                return f"[{code}] {friendly_msg}"
        
        # 如果沒有匹配，返回原始錯誤（但清理技術細節）
        if 'object has no attribute' in error_lower:
            return '[SYSTEM_ERROR] 系統功能異常，請重啟應用後重試'
        
        return f"[UNKNOWN] {error}"

    def get_ai_team_executor(self):
        """獲取或創建 AI 團隊執行器"""
        if self._ai_team_executor is None:
            from ai_team_executor import AITeamExecutor
            self._ai_team_executor = AITeamExecutor(
                message_queue=self.message_queue,
                database=db,
                send_event=self.send_event,
                send_log=self.send_log
            )
        return self._ai_team_executor

    async def _ensure_private_poller_running(self, account_matches: list):
        """🔧 Phase 3: 確保私聊輪詢器運行以接收目標用戶回覆"""
        try:
            private_message_poller = _get_private_message_poller()
            if not private_message_poller:
                print(f"[AITeam] ⚠️ private_message_poller 不可用", file=sys.stderr)
                return
            # 獲取需要監控的帳號
            phones_to_monitor = [m.get('accountPhone') for m in account_matches if m.get('accountPhone')]
            
            if not phones_to_monitor:
                print(f"[AITeam] ⚠️ 沒有帳號需要監控私聊", file=sys.stderr)
                return
            
            print(f"[AITeam] 🔄 確保私聊輪詢器運行，監控帳號: {phones_to_monitor}", file=sys.stderr)
            
            # 獲取在線客戶端
            online_clients = {}
            for phone in phones_to_monitor:
                client = self.telegram_manager.get_client(phone)
                if client and client.is_connected:
                    online_clients[phone] = client
            
            if not online_clients:
                print(f"[AITeam] ⚠️ 沒有在線帳號可用於私聊監控", file=sys.stderr)
                return
            
            # 設置事件回調（如果尚未設置）
            if private_message_poller.event_callback is None:
                def wrapped_event_callback(event_name: str, payload: Any):
                    self.send_event(event_name, payload)
                    if event_name == "private-message-received":
                        asyncio.create_task(self.handle_ai_team_customer_reply(payload))
                private_message_poller.event_callback = wrapped_event_callback
                print(f"[AITeam] ✅ 私聊輪詢器 event_callback 已設置", file=sys.stderr)
            
            # 添加客戶端到輪詢器（如果尚未運行，會自動啟動）
            if not private_message_poller._running:
                await private_message_poller.start_polling(online_clients)
                print(f"[AITeam] ✅ 私聊輪詢器已啟動，監控 {len(online_clients)} 個帳號", file=sys.stderr)
            else:
                # 添加新帳號到現有輪詢
                for phone, client in online_clients.items():
                    if phone not in private_message_poller._clients:
                        await private_message_poller.add_client(phone, client)
                        print(f"[AITeam] ✅ 帳號 {phone} 已添加到私聊輪詢", file=sys.stderr)
            
        except Exception as e:
            print(f"[AITeam] ⚠️ 確保私聊輪詢器運行失敗: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)

    async def _execute_scripted_phase(self, execution_id: str):
        """執行劇本階段"""
        
        execution = self._ai_team_executions.get(execution_id)
        if not execution:
            return
        
        strategy = execution.get('strategy', {})
        phases = strategy.get('phases', [])
        current_phase = execution.get('current_phase', 0)
        
        if current_phase >= len(phases):
            # 所有階段完成
            self.send_event("ai-team:execution-completed", {
                "executionId": execution_id,
                "totalSent": execution.get('message_count', 0),
                "totalResponses": execution.get('response_count', 0)
            })
            return
        
        phase = phases[current_phase]
        phase_name = phase.get('name', f'階段 {current_phase + 1}')
        
        print(f"[AITeam] 執行階段 {current_phase + 1}: {phase_name}", file=sys.stderr)
        self.send_event("ai-team:phase-changed", {
            "executionId": execution_id,
            "phase": current_phase,
            "phaseName": phase_name
        })

    async def _generate_ai_message(
        self,
        role_name: str,
        role_personality: str,
        role_speaking_style: str,
        prompt: str,
        context: Dict[str, Any]
    ) -> Optional[str]:
        """使用 AI 生成消息內容"""
        
        try:
            # 獲取 AI 配置 - 🔧 修復: 使用正確的方法名
            settings = await db.get_all_settings()
            ai_provider = settings.get('ai_provider', 'gemini')
            api_key = settings.get('gemini_api_key') or settings.get('openai_api_key')
            
            if not api_key:
                # 使用預設回覆
                default_messages = [
                    f"大家好呀～",
                    f"今天天氣真不錯！",
                    f"有人在嗎？",
                    f"剛看到一個有意思的話題",
                    f"這個問題我也很感興趣",
                ]
                import random
                return random.choice(default_messages)
            
            # 調用 AI 生成
            if ai_provider == 'gemini' and settings.get('gemini_api_key'):
                return await self._call_gemini_for_message(
                    api_key=settings['gemini_api_key'],
                    prompt=prompt
                )
            elif ai_provider == 'openai' and settings.get('openai_api_key'):
                return await self._call_openai_for_message(
                    api_key=settings['openai_api_key'],
                    prompt=prompt
                )
            else:
                # 備用方案
                return f"你好，有什麼我可以幫忙的嗎？"
                
        except Exception as e:
            print(f"[AITeam] Generate AI message error: {e}", file=sys.stderr)
            return None

    async def _call_gemini_for_message(self, api_key: str, prompt: str) -> Optional[str]:
        """調用 Gemini 生成消息"""
        import aiohttp
        
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {
                            "temperature": 0.8,
                            "maxOutputTokens": 150
                        }
                    },
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        text = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
                        return text.strip() if text else None
                    else:
                        return None
        except Exception as e:
            print(f"[AITeam] Gemini API error: {e}", file=sys.stderr)
            return None

    async def _call_openai_for_message(self, api_key: str, prompt: str) -> Optional[str]:
        """調用 OpenAI 生成消息"""
        import aiohttp
        
        try:
            url = "https://api.openai.com/v1/chat/completions"
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 150,
                        "temperature": 0.8
                    },
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        text = result.get('choices', [{}])[0].get('message', {}).get('content', '')
                        return text.strip() if text else None
                    else:
                        return None
        except Exception as e:
            print(f"[AITeam] OpenAI API error: {e}", file=sys.stderr)
            return None

    def _calculate_typing_delay(self, content: str) -> float:
        """
        計算擬人化打字延遲（秒）
        基於消息長度和隨機因素
        """
        import random
        
        # 基礎打字速度：約 5-8 個字符/秒（考慮思考時間）
        chars_per_second = random.uniform(5, 8)
        
        # 基於消息長度計算基礎延遲
        base_delay = len(content) / chars_per_second
        
        # 最小延遲 1.5 秒，最大延遲 15 秒
        base_delay = max(1.5, min(15, base_delay))
        
        # 添加隨機波動 (±20%)
        variance = base_delay * random.uniform(-0.2, 0.2)
        
        # 額外的「思考時間」（0.5-2秒）
        think_time = random.uniform(0.5, 2.0)
        
        return base_delay + variance + think_time

    def _get_message_interval(self, execution: Dict[str, Any]) -> float:
        """
        獲取消息發送間隔（秒）
        基於帳號健康度和執行模式
        """
        import random
        
        mode = execution.get('mode', 'hybrid')
        message_count = execution.get('message_count', 0)
        
        # 基礎間隔
        if mode == 'scriptless':
            # 無劇本模式：更自然的間隔
            base_interval = random.uniform(30, 90)
        else:
            # 劇本模式：按設定間隔
            base_interval = random.uniform(20, 60)
        
        # 隨著消息增多，適當增加間隔（避免被認為是機器人）
        fatigue_factor = 1 + (message_count // 5) * 0.1  # 每5條消息增加10%間隔
        fatigue_factor = min(2.0, fatigue_factor)  # 最多2倍
        
        return base_interval * fatigue_factor

    async def _generate_ai_suggestion(self, prompt: str) -> str:
        """生成 AI 建議"""
        try:
            # 嘗試使用已配置的 AI 服務 - 🔧 修復: 使用正確的方法名
            settings = await db.get_all_settings()
            provider = settings.get('ai_provider', 'gemini')
            api_key = settings.get('gemini_api_key') or settings.get('openai_api_key')
            
            if not api_key:
                return "（需要配置 AI API 密鑰才能生成建議）"
            
            if provider == 'gemini':
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-1.5-flash')
                response = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: model.generate_content(prompt)
                )
                return response.text.strip() if response.text else ""
            else:
                import openai
                client = openai.OpenAI(api_key=api_key)
                response = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=[{"role": "user", "content": prompt}],
                        max_tokens=200
                    )
                )
                return response.choices[0].message.content.strip() if response.choices else ""
                
        except Exception as e:
            print(f"[AITeam] AI suggestion generation error: {e}", file=sys.stderr)
            return ""

