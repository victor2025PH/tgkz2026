"""
Phase 9-3: AI generation, local AI, knowledge, collaboration
Extracted from BackendService in main.py.

🔧 P3-1: 模块级导入清理 — 消除方法内重复导入
"""
import re
import sys
import json
import time
import random
import asyncio
import traceback
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from text_utils import safe_json_dumps

# Re-use main.py's db and module accessors
from database import db
from config import config, IS_DEV_MODE

def _get_module(name: str):
    """Safe lazy module accessor."""
    from lazy_imports import lazy_imports
    return lazy_imports.get(name)


# ====================================================================
# 🔧 P3-1: 延迟导入获取器 — 避免循环依赖
# ====================================================================

def _get_ai_auto_chat():
    """延迟获取 ai_auto_chat 单例"""
    try:
        return _get_module('ai_auto_chat').ai_auto_chat
    except Exception:
        return None

def _get_telegram_rag():
    """延迟获取 telegram_rag 单例"""
    try:
        return _get_module('telegram_rag_system').telegram_rag
    except Exception:
        return None

def _get_KnowledgeType():
    """延迟获取 KnowledgeType 枚举"""
    try:
        return _get_module('telegram_rag_system').KnowledgeType
    except Exception:
        return None

def _get_group_search_service():
    """延迟获取 group_search_service 单例"""
    try:
        return _get_module('group_search_service').group_search_service
    except Exception:
        return None

class AiServiceMixin:
    """Mixin: AI generation, local AI, knowledge, collaboration"""

    async def _get_default_ai_model(self) -> Optional[Dict[str, Any]]:
        """獲取默認的 AI 模型配置"""
        try:
            model = await db.fetch_one(
                """SELECT id, provider, model_name, display_name, api_key, api_endpoint,
                   is_local, is_default, is_connected
                   FROM ai_models WHERE is_default = 1 AND (api_key != '' OR is_local = 1)
                   ORDER BY priority DESC LIMIT 1"""
            )
            if model:
                return {
                    'id': model['id'],
                    'provider': model['provider'],
                    'modelName': model['model_name'],
                    'displayName': model['display_name'] or model['model_name'],
                    'apiKey': model['api_key'],
                    'apiEndpoint': model['api_endpoint'],
                    'isLocal': bool(model['is_local']),
                    'isConnected': bool(model['is_connected'])
                }
            
            # 如果沒有默認模型，嘗試獲取任何可用的模型
            model = await db.fetch_one(
                """SELECT id, provider, model_name, display_name, api_key, api_endpoint,
                   is_local, is_default, is_connected
                   FROM ai_models WHERE (api_key != '' OR is_local = 1)
                   ORDER BY priority DESC, created_at DESC LIMIT 1"""
            )
            if model:
                return {
                    'id': model['id'],
                    'provider': model['provider'],
                    'modelName': model['model_name'],
                    'displayName': model['display_name'] or model['model_name'],
                    'apiKey': model['api_key'],
                    'apiEndpoint': model['api_endpoint'],
                    'isLocal': bool(model['is_local']),
                    'isConnected': bool(model['is_connected'])
                }
            return None
        except Exception as e:
            print(f"[AI] 獲取 AI 模型失敗: {e}", file=__import__('sys').stderr)
            return None

    async def _call_ai_for_text(self, model: Dict[str, Any], prompt: str, max_tokens: int = 500) -> Optional[str]:
        """
        🆕 通用 AI 調用方法
        🔧 P0: 增加超時時間到 45 秒
        """
        import aiohttp
        
        provider = model.get('provider', '').lower()
        api_key = model.get('apiKey', '')
        api_endpoint = model.get('apiEndpoint', '')
        model_name = model.get('modelName', '')
        is_local = model.get('isLocal', False)
        
        # 🔧 P0: 增加超時時間，與前端一致（使用配置常量）
        from config import AIConfig
        timeout = aiohttp.ClientTimeout(total=AIConfig.API_TIMEOUT_SECONDS)
        start_time = time.time()
        print(f"[AI] 開始調用: provider={provider}, model={model_name}, endpoint={api_endpoint[:50] if api_endpoint else 'default'}...", file=sys.stderr)
        
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                if is_local or provider == 'ollama' or provider == 'custom':
                    # Ollama / 本地模型
                    endpoint = api_endpoint or 'http://localhost:11434'
                    
                    # 🔧 修復: 檢查端點是否已包含 /api/chat，避免重複添加
                    if '/api/chat' in endpoint or '/api/generate' in endpoint:
                        chat_url = endpoint
                    else:
                        chat_url = f"{endpoint.rstrip('/')}/api/chat"
                    
                    print(f"[AI] 本地 AI 請求 URL: {chat_url}", file=sys.stderr)
                    
                    async with session.post(chat_url, json={
                        "model": model_name or "llama3",
                        "messages": [{"role": "user", "content": prompt}],
                        "stream": False,
                        "options": {"num_predict": max_tokens}
                    }) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            return data.get('message', {}).get('content', '')
                
                elif provider == 'gemini' or provider == 'google':
                    # Google Gemini
                    endpoint = api_endpoint or 'https://generativelanguage.googleapis.com/v1beta'
                    url = f"{endpoint}/models/{model_name or 'gemini-pro'}:generateContent?key={api_key}"
                    
                    async with session.post(url, json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"maxOutputTokens": max_tokens}
                    }) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            candidates = data.get('candidates', [])
                            if candidates:
                                parts = candidates[0].get('content', {}).get('parts', [])
                                if parts:
                                    return parts[0].get('text', '')
                
                elif provider == 'openai' or provider == 'gpt':
                    # OpenAI GPT
                    endpoint = api_endpoint or 'https://api.openai.com/v1'
                    url = f"{endpoint.rstrip('/')}/chat/completions"
                    
                    headers = {
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    }
                    
                    async with session.post(url, headers=headers, json={
                        "model": model_name or "gpt-3.5-turbo",
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": max_tokens
                    }) as resp:
                        elapsed = time.time() - start_time
                        if resp.status == 200:
                            data = await resp.json()
                            choices = data.get('choices', [])
                            if choices:
                                content = choices[0].get('message', {}).get('content', '')
                                print(f"[AI] ✓ OpenAI 調用成功，耗時 {elapsed:.1f}秒，返回長度 {len(content)}", file=sys.stderr)
                                return content
                        else:
                            error_text = await resp.text()
                            print(f"[AI] ⚠️ OpenAI 返回錯誤: status={resp.status}, error={error_text[:200]}", file=sys.stderr)
                
                elif provider == 'deepseek':
                    # DeepSeek
                    endpoint = api_endpoint or 'https://api.deepseek.com/v1'
                    url = f"{endpoint.rstrip('/')}/chat/completions"
                    
                    headers = {
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    }
                    
                    async with session.post(url, headers=headers, json={
                        "model": model_name or "deepseek-chat",
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": max_tokens
                    }) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            choices = data.get('choices', [])
                            if choices:
                                return choices[0].get('message', {}).get('content', '')
                
                print(f"[AI] 不支持的 provider: {provider}", file=sys.stderr)
                return None
                
        except asyncio.TimeoutError:
            elapsed = time.time() - start_time
            print(f"[AI] ⚠️ API 調用超時: {elapsed:.1f}秒 (provider={provider})", file=sys.stderr)
            return None
        except Exception as e:
            elapsed = time.time() - start_time
            print(f"[AI] ❌ API 調用失敗: {e} (耗時 {elapsed:.1f}秒)", file=sys.stderr)
            return None

    async def _generate_messages_with_ai(self, model: Dict[str, Any], topic: str, style: str, count: int) -> List[str]:
        """使用配置的 AI 生成消息"""
        import aiohttp
        
        style_descriptions = {
            'friendly': '友好親切、輕鬆自然',
            'formal': '正式商務、專業禮貌',
            'humorous': '幽默風趣、輕鬆調侃',
            'concise': '簡潔明了、直奔主題',
            'enthusiastic': '熱情洋溢、充滿活力'
        }
        
        style_desc = style_descriptions.get(style, '友好親切')
        
        prompt = f"""請生成 {count} 條不同的打招呼消息，用於在 Telegram 上向潛在客戶發送第一條消息。

主題：{topic}
風格要求：{style_desc}

要求：
1. 每條消息都要不同，但保持相同的風格
2. 消息要自然、真誠，不要像廣告
3. 使用變量 {{firstName}} 表示對方名字，{{greeting}} 表示問候語（如"早上好"）
4. 每條消息 20-50 字左右
5. 只輸出消息內容，每條消息一行，不要編號

請直接輸出 {count} 條消息："""
        
        provider = model.get('provider', '').lower()
        api_key = model.get('apiKey', '')
        api_endpoint = model.get('apiEndpoint', '')
        model_name = model.get('modelName', '')
        is_local = model.get('isLocal', False)
        
        messages = []
        
        timeout = aiohttp.ClientTimeout(total=30)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            if is_local or provider == 'ollama' or provider == 'custom':
                # 本地 AI (Ollama)
                endpoint = api_endpoint or 'http://localhost:11434'
                chat_url = f"{endpoint.rstrip('/')}/api/chat"
                
                request_body = {
                    "model": model_name or "qwen2:7b",
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False
                }
                
                async with session.post(chat_url, json=request_body) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        content = data.get('message', {}).get('content', '')
                        messages = self._parse_ai_messages(content, count)
                    else:
                        raise Exception(f"Ollama 返回 {resp.status}")
                        
            elif provider == 'openai':
                # OpenAI API
                async with session.post(
                    'https://api.openai.com/v1/chat/completions',
                    headers={
                        'Authorization': f'Bearer {api_key}',
                        'Content-Type': 'application/json'
                    },
                    json={
                        'model': model_name or 'gpt-3.5-turbo',
                        'messages': [{'role': 'user', 'content': prompt}],
                        'max_tokens': 1000,
                        'temperature': 0.8
                    }
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
                        messages = self._parse_ai_messages(content, count)
                    else:
                        error_data = await resp.text()
                        raise Exception(f"OpenAI 返回 {resp.status}: {error_data[:100]}")
            
            else:
                # 通用 OpenAI 兼容格式
                endpoint = api_endpoint or 'http://localhost:11434/v1'
                chat_url = f"{endpoint.rstrip('/')}/chat/completions"
                
                headers = {'Content-Type': 'application/json'}
                if api_key:
                    headers['Authorization'] = f'Bearer {api_key}'
                
                async with session.post(
                    chat_url,
                    headers=headers,
                    json={
                        'model': model_name,
                        'messages': [{'role': 'user', 'content': prompt}],
                        'max_tokens': 1000,
                        'temperature': 0.8
                    }
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
                        messages = self._parse_ai_messages(content, count)
                    else:
                        raise Exception(f"API 返回 {resp.status}")
        
        return messages

    def _parse_ai_messages(self, content: str, count: int) -> List[str]:
        """解析 AI 返回的消息"""
        lines = content.strip().split('\n')
        messages = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            # 移除編號（如 "1." 或 "1、" 或 "1)"）
            line = re.sub(r'^[\d]+[\.\、\)\]\:]\s*', '', line)
            line = line.strip()
            if line and len(line) > 5:  # 過濾太短的行
                messages.append(line)
        
        return messages[:count] if messages else []

    def _get_local_message_templates(self, topic: str, style: str, count: int) -> List[str]:
        """獲取本地消息模板（回退方案）"""
        style_templates = {
            'friendly': [
                "{greeting}！我是在群裡看到你的，想認識一下~",
                "Hi {firstName}！很高興能認識你，希望以後多多交流 😊",
                "{greeting}{firstName}，我覺得我們可能有共同話題，方便聊聊嗎？",
                "嗨！看到你的資料覺得很有趣，想跟你交個朋友~",
                f"{{greeting}}！我對{topic}很感興趣，看到你也在關注這個？"
            ],
            'formal': [
                "{greeting}，很高興認識您。我注意到我們可能有共同的興趣點，不知是否方便交流？",
                f"您好 {{firstName}}，冒昧打擾。我專注於{topic}領域，希望能與您建立聯繫。",
                "{greeting}，我是通過群組認識到您的。如有合作機會，期待進一步溝通。",
                "尊敬的 {firstName}，很榮幸能夠與您取得聯繫。期待未來有機會合作。",
                f"{{greeting}}，我對{topic}很感興趣，看到您也在這個領域，想向您請教。"
            ],
            'humorous': [
                "{greeting}！我不是推銷員，只是覺得你看起來很酷想認識一下 😎",
                "Hi {firstName}！命運的安排讓我們在茫茫網海中相遇 🌊",
                "{greeting}~我發誓我不是機器人，只是一個想交朋友的普通人 🤖❌",
                "嘿！如果這條消息打擾到你了，請假裝沒看到（但其實很期待你的回復）",
                "{greeting}{firstName}！人生何處不相逢，既然相遇不如加個好友？"
            ],
            'concise': [
                "{greeting}，認識一下？",
                f"Hi {{firstName}}，對{topic}有興趣嗎？",
                "{greeting}！方便聊聊嗎？",
                "你好，想跟你交流一下。",
                "{greeting}，可以認識一下嗎？"
            ],
            'enthusiastic': [
                "{greeting}！！太開心能認識你了！！🎉🎉🎉",
                "哇！{firstName}！終於找到志同道合的朋友了！！",
                f"{{greeting}}！我對{topic}超級有熱情的，希望能跟你一起討論！💪",
                "嗨嗨嗨！{firstName}！感覺我們會成為很好的朋友！✨",
                f"太棒了！{{greeting}}！一直在找對{topic}感興趣的人！"
            ]
        }
        
        templates = style_templates.get(style, style_templates['friendly'])
        messages = templates[:count]
        random.shuffle(messages)
        return messages

    async def _handle_collab_group_message(self, client, message, target_group_id: str):
        """
        🆕 處理群聊協作中的消息
        """
        from pyrogram.enums import ChatType
        
        try:
            # 只處理群組消息
            if message.chat.type not in [ChatType.GROUP, ChatType.SUPERGROUP]:
                return
            
            # 只處理目標群組
            if str(message.chat.id) != str(target_group_id):
                return
            
            # 獲取協作配置
            collab = self._active_group_collabs.get(str(target_group_id))
            if not collab:
                return
            
            # 獲取發送者信息
            sender_id = message.from_user.id if message.from_user else None
            sender_name = message.from_user.first_name if message.from_user else "Unknown"
            message_text = message.text or message.caption or ""
            
            if not message_text:
                return
            
            # 檢查是否是角色帳號發的消息（不回覆自己）
            role_phones = [r.get('phone') for r in collab.get('roles', [])]
            for phone in role_phones:
                role_client = self.telegram_manager.clients.get(phone)
                if role_client:
                    try:
                        me = await role_client.get_me()
                        if me.id == sender_id:
                            return  # 不回覆自己
                    except:
                        pass
            
            print(f"[GroupCollab] 收到群消息: from={sender_name}, text={message_text[:50]}...", file=sys.stderr)
            
            # 🔧 P2-1: 選擇合適的角色回覆（避免所有角色同時回覆）
            responding_role = await self._select_responding_role(collab, message_text, sender_id)
            
            if not responding_role:
                print(f"[GroupCollab] 無合適角色回覆此消息", file=sys.stderr)
                return
            
            # 生成 AI 回覆
            role_phone = responding_role.get('phone')
            role_name = responding_role.get('roleName', '助手')
            role_prompt = responding_role.get('prompt', '')
            
            try:
                # 使用 AI 生成回覆（🔧 P3-1: 使用模块级延迟导入）
                ai_auto_chat = _get_ai_auto_chat()
                
                # 🆕 P0-2: 搜索知識庫，獲取相關專業內容
                knowledge_context = ""
                matched_knowledge = []  # 🆕 P1-2: 記錄匹配的知識用於可視化
                
                try:
                    # 方法1: 從 RAG 系統搜索
                    telegram_rag = _get_telegram_rag()
                    if telegram_rag:
                        rag_context = await telegram_rag.build_rag_context(
                            user_message=message_text,
                            user_id=str(sender_id),
                            max_items=3,
                            max_tokens=500
                        )
                        if rag_context:
                            knowledge_context = rag_context
                            matched_knowledge.append({
                                'source': 'RAG',
                                'content': rag_context[:100] + '...' if len(rag_context) > 100 else rag_context
                            })
                            print(f"[GroupCollab] 📚 從 RAG 找到相關知識", file=sys.stderr)
                    
                    # 方法2: 從知識庫表搜索（備用）
                    if not knowledge_context:
                        from database import db
                        knowledge_items = await db.search_knowledge(message_text, limit=3)
                        if knowledge_items:
                            kb_parts = ["【業務知識參考】"]
                            for item in knowledge_items:
                                kb_parts.append(f"- {item.get('title')}: {item.get('content')}")
                                # 🆕 P1-2: 記錄每條匹配的知識
                                matched_knowledge.append({
                                    'source': 'KnowledgeBase',
                                    'id': item.get('id'),
                                    'title': item.get('title'),
                                    'content': item.get('content', '')[:80]
                                })
                            knowledge_context = "\n".join(kb_parts)
                            print(f"[GroupCollab] 📚 從知識庫表找到 {len(knowledge_items)} 條知識", file=sys.stderr)
                except Exception as kb_err:
                    print(f"[GroupCollab] 知識庫搜索失敗: {kb_err}", file=sys.stderr)
                
                # 構建群聊專用 prompt（包含知識庫內容）
                group_prompt = f"""你是群組中的「{role_name}」，正在參與多角色協作服務客戶。

{role_prompt}

{knowledge_context}

【群聊規則】
1. 回覆簡短自然（10-50字），像群聊一樣
2. 不要重複其他角色說過的話
3. 從你的角色角度提供價值
4. 如果知識庫有相關內容，優先參考知識庫回答
5. 語氣輕鬆，像朋友聊天
"""
                
                # 生成回覆
                response = await ai_auto_chat._generate_response_with_prompt(
                    user_id=str(sender_id),
                    user_message=message_text,
                    custom_prompt=group_prompt,
                    usage_type='groupChat'
                )
                
                if response:
                    # 添加隨機延遲，更自然
                    delay = random.uniform(2, 8)
                    await asyncio.sleep(delay)
                    
                    # 發送回覆
                    role_client = self.telegram_manager.clients.get(role_phone)
                    if role_client and role_client.is_connected:
                        await role_client.send_message(int(target_group_id), response)
                        
                        print(f"[GroupCollab] {role_name} 回覆: {response[:50]}...", file=sys.stderr)
                        
                        # 更新統計
                        collab['message_count'] = collab.get('message_count', 0) + 1
                        collab['last_responder'] = role_name
                        
                        # 發送事件（🆕 P1-2: 包含知識引用信息）
                        self.send_event("group:ai-reply-sent", {
                            "groupId": target_group_id,
                            "roleName": role_name,
                            "content": response,
                            "replyTo": message_text[:50],
                            "knowledgeUsed": matched_knowledge if matched_knowledge else None,
                            "hasKnowledgeRef": len(matched_knowledge) > 0
                        })
                        
            except Exception as ai_err:
                print(f"[GroupCollab] AI 回覆生成失敗: {ai_err}", file=sys.stderr)
                
        except Exception as e:
            print(f"[GroupCollab] 處理群消息失敗: {traceback.format_exc()}", file=sys.stderr)

    async def _select_responding_role(
        self, 
        collab: Dict[str, Any], 
        message: str, 
        sender_id: int
    ) -> Optional[Dict[str, Any]]:
        """
        🆕 P2-1: 選擇合適的角色回覆（避免刷屏）
        """
        roles = collab.get('roles', [])
        if not roles:
            return None
        
        last_responder = collab.get('last_responder')
        
        # 規則：
        # 1. 如果只有一個角色，就用它
        # 2. 如果上次是某角色回覆，這次優先讓其他角色回覆
        # 3. 根據消息內容匹配角色（關鍵詞）
        # 🔧 Phase 8: 移除跳過概率，確保群聊協作時一定有回覆
        # 4. 不再使用隨機跳過，改為延遲回覆控制頻率
        
        # 🔧 Phase 8: 添加調試日誌
        print(f"[GroupCollab] 🔍 選擇回覆角色: roles={len(roles)}, last_responder={last_responder}", file=sys.stderr)
        
        available_roles = roles.copy()
        
        # 優先讓不同角色回覆
        if last_responder and len(available_roles) > 1:
            available_roles = [r for r in available_roles if r.get('roleName') != last_responder]
            if not available_roles:
                available_roles = roles  # 如果過濾後沒有了，恢復全部
        
        # 根據消息內容匹配角色
        message_lower = message.lower()
        
        # 簡單的關鍵詞匹配
        keyword_role_map = {
            '價格': ['費率分析師', '顧問'],
            '多少錢': ['費率分析師', '顧問'],
            '費用': ['費率分析師', '顧問'],
            '怎麼用': ['技術支持', '客服'],
            '如何': ['技術支持', '客服'],
            '問題': ['技術支持', '客服'],
            '安全': ['安全顧問', '顧問'],
            '可靠': ['安全顧問', '顧問'],
            '推薦': ['熱心群友', '老用戶'],
            '好用': ['熱心群友', '老用戶'],
        }
        
        matched_roles = []
        for keyword, role_names in keyword_role_map.items():
            if keyword in message_lower:
                for role in available_roles:
                    if any(name in role.get('roleName', '') for name in role_names):
                        matched_roles.append(role)
        
        if matched_roles:
            return random.choice(matched_roles)
        
        # 沒有匹配的，隨機選一個
        return random.choice(available_roles) if available_roles else None

    async def _call_local_ai(self, endpoint: str, model: str, system_prompt: str, user_message: str) -> str:
        """直接調用本地/遠程 AI API"""
        import aiohttp
        import socket
        from urllib.parse import urlparse
        
        print(f"[AI] _call_local_ai called with endpoint: {endpoint}, model: {model}", file=sys.stderr)
        
        # 首先進行連接診斷
        try:
            parsed = urlparse(endpoint)
            host = parsed.hostname
            port = parsed.port or (443 if parsed.scheme == 'https' else 80)
            
            print(f"[AI] Diagnosing connection to {host}:{port}...", file=sys.stderr)
            
            # 測試 TCP 連接
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(5)
                result = sock.connect_ex((host, port))
                sock.close()
                
                if result == 0:
                    print(f"[AI] ✓ TCP connection to {host}:{port} successful", file=sys.stderr)
                else:
                    print(f"[AI] ✗ TCP connection to {host}:{port} failed (error code: {result})", file=sys.stderr)
                    raise Exception(f"無法連接到 AI 服務 {host}:{port}。請檢查：\n1. AI 服務是否正在運行\n2. 防火牆是否允許連接\n3. 網絡是否正常")
            except socket.gaierror as e:
                print(f"[AI] ✗ DNS resolution failed for {host}: {e}", file=sys.stderr)
                raise Exception(f"無法解析主機名 {host}。請檢查網絡設置或 DNS 配置")
            except socket.timeout:
                print(f"[AI] ✗ Connection timeout to {host}:{port}", file=sys.stderr)
                raise Exception(f"連接 {host}:{port} 超時。請檢查：\n1. AI 服務是否正在運行\n2. 防火牆是否阻塞了連接\n3. 網絡路由是否正確")
            except Exception as e:
                print(f"[AI] ✗ Connection test failed: {e}", file=sys.stderr)
                raise Exception(f"連接測試失敗: {str(e)}")
        except Exception as diag_error:
            # 診斷失敗，但繼續嘗試實際請求（可能診斷有誤）
            print(f"[AI] Connection diagnosis failed, but continuing: {diag_error}", file=sys.stderr)
        
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": user_message})
        
        # 嘗試 OpenAI 兼容格式
        request_body = {
            "messages": messages,
            "max_tokens": 500,
            "temperature": 0.7
        }
        if model:
            request_body["model"] = model
        
        # 增加超時時間到 90 秒（AI 生成可能需要更長時間）
        timeout = aiohttp.ClientTimeout(total=90, connect=10)
        
        try:
            start_time = time.time()
            async with aiohttp.ClientSession() as session:
                # 嘗試 /v1/chat/completions 端點
                chat_url = endpoint.rstrip('/')
                if not chat_url.endswith('/v1/chat/completions'):
                    chat_url = chat_url.rstrip('/') + '/v1/chat/completions'
                
                print(f"[AI] Attempting to call AI endpoint: {chat_url}", file=sys.stderr)
                print(f"[AI] Request body: model={model}, messages={len(messages)}, max_tokens=500", file=sys.stderr)
                
                try:
                    request_start = time.time()
                    async with session.post(chat_url, json=request_body, timeout=timeout) as resp:
                        connect_time = time.time() - request_start
                        print(f"[AI] Connection established in {connect_time:.2f}s, status: {resp.status}", file=sys.stderr)
                        
                        if resp.status == 200:
                            data_start = time.time()
                            data = await resp.json()
                            data_time = time.time() - data_start
                            total_time = time.time() - start_time
                            
                            print(f"[AI] Response received in {data_time:.2f}s, total time: {total_time:.2f}s", file=sys.stderr)
                            
                            if 'choices' in data and len(data['choices']) > 0:
                                content = data['choices'][0].get('message', {}).get('content', '')
                                print(f"[AI] ✓ Successfully generated response (length: {len(content)})", file=sys.stderr)
                                return content
                            else:
                                print(f"[AI] ✗ Response missing 'choices' field. Full response: {data}", file=sys.stderr)
                                raise Exception(f"AI 服務返回了無效的響應格式: {list(data.keys())}")
                        else:
                            error_text = await resp.text()
                            print(f"[AI] ✗ Error response (status {resp.status}): {error_text[:500]}", file=sys.stderr)
                            raise Exception(f"AI 服務返回錯誤 (HTTP {resp.status}): {error_text[:200]}")
                            
                except asyncio.TimeoutError:
                    elapsed = time.time() - start_time
                    print(f"[AI] ✗ Request timeout after {elapsed:.2f}s for endpoint: {chat_url}", file=sys.stderr)
                    raise Exception(f"AI 服務響應超時（{elapsed:.1f}秒）。可能原因：\n1. AI 服務響應過慢\n2. 網絡延遲過高\n3. 模型加載中\n請檢查 AI 服務狀態")
                except aiohttp.ClientConnectorError as e:
                    elapsed = time.time() - start_time
                    print(f"[AI] ✗ Connection error after {elapsed:.2f}s: {e}", file=sys.stderr)
                    raise Exception(f"無法連接到 AI 服務 ({host}:{port})。請檢查：\n1. AI 服務是否正在運行\n2. 防火牆是否允許連接\n3. 端點地址是否正確")
                except aiohttp.ClientError as e:
                    elapsed = time.time() - start_time
                    print(f"[AI] ✗ Client error after {elapsed:.2f}s: {e}", file=sys.stderr)
                    # 如果 /v1/chat/completions 失敗，嘗試直接端點
                    if chat_url != endpoint:
                        print(f"[AI] Trying direct endpoint: {endpoint}", file=sys.stderr)
                        try:
                            async with session.post(endpoint, json=request_body, timeout=timeout) as resp2:
                                if resp2.status == 200:
                                    data = await resp2.json()
                                    # 處理各種響應格式
                                    if 'choices' in data:
                                        return data['choices'][0].get('message', {}).get('content', '')
                                    elif 'response' in data:
                                        return data['response']
                                    elif 'content' in data:
                                        return data['content']
                                    elif 'text' in data:
                                        return data['text']
                                else:
                                    error_text = await resp2.text()
                                    print(f"[AI] Direct endpoint error (status {resp2.status}): {error_text[:200]}", file=sys.stderr)
                        except Exception as e2:
                            print(f"[AI] Direct endpoint also failed: {e2}", file=sys.stderr)
                    raise Exception(f"網絡錯誤: {str(e)}")
                    
        except asyncio.TimeoutError:
            raise Exception("AI 服務響應超時，請檢查服務連接或增加超時時間")
        except aiohttp.ClientError as e:
            error_msg = str(e)
            print(f"[AI] Network error: {error_msg}", file=sys.stderr)
            raise Exception(f"無法連接到 AI 服務 ({endpoint}): {error_msg}")
        except Exception as e:
            error_details = traceback.format_exc()
            print(f"[AI] Unexpected error: {error_details}", file=sys.stderr)
            raise

    async def _execute_ai_group_search(self, strategy: Dict[str, Any]):
        """異步執行群組搜索"""
        try:
            keywords = strategy.get('keywords', {})
            search_keywords = keywords.get('highIntent', [])[:5]  # 使用前5個高意向關鍵詞搜索
            
            total_found = 0
            for keyword in search_keywords:
                self.send_event("ai-execution-status", {
                    "isExecuting": True,
                    "phase": "searching",
                    "message": f"正在搜索關鍵詞: {keyword}..."
                })
                
                # 調用群組搜索服務（🔧 P3-1: 延迟导入）
                try:
                    group_search_service = _get_group_search_service()
                    results = await group_search_service.search_groups(keyword, limit=10) if group_search_service else []
                    total_found += len(results) if results else 0
                    
                    self.send_event("ai-execution-stats", {
                        "groupsSearched": total_found,
                        "groupsJoined": 0,
                        "membersScanned": 0,
                        "leadsFound": 0,
                        "messagesSent": 0,
                        "responses": 0
                    })
                    
                    await asyncio.sleep(2)  # 避免頻繁請求
                except Exception as search_error:
                    print(f"[AI Strategy] Search error for {keyword}: {search_error}", file=sys.stderr)
            
            self.send_event("ai-execution-status", {
                "isExecuting": True,
                "phase": "search_complete",
                "message": f"搜索完成，共發現 {total_found} 個相關群組"
            })
            
        except Exception as e:
            print(f"[AI Strategy] Group search failed: {e}", file=sys.stderr)
            self.send_event("ai-execution-status", {
                "isExecuting": False,
                "phase": "error",
                "message": f"搜索失敗: {str(e)}"
            })

    def _parse_ai_knowledge_response(self, response: str) -> list:
        """解析 AI 生成的知識響應"""
        try:
            # 嘗試直接解析 JSON
            if '{' in response and '}' in response:
                # 提取 JSON 部分
                json_match = re.search(r'\{[\s\S]*\}', response)
                if json_match:
                    data = json.loads(json_match.group())
                    return data.get('items', [])
        except json.JSONDecodeError:
            pass
        
        # 如果解析失敗，嘗試按行解析
        items = []
        lines = response.split('\n')
        current_category = 'custom'
        
        for line in lines:
            line = line.strip()
            if '【產品知識】' in line or '【产品知识】' in line:
                current_category = 'product'
            elif '【常見問答】' in line or '【常见问答】' in line:
                current_category = 'faq'
            elif '【銷售話術】' in line or '【销售话术】' in line:
                current_category = 'sales'
            elif '【異議處理】' in line or '【异议处理】' in line:
                current_category = 'objection'
            elif line and not line.startswith('#') and len(line) > 10:
                items.append({
                    'category': current_category,
                    'title': line[:50],
                    'content': line
                })
        
        return items[:20]  # 限制最多 20 條

    def _generate_default_knowledge(self, business_desc: str) -> str:
        """生成默認知識模板"""
        return f'''{{
  "items": [
    {{"category": "product", "title": "服務介紹", "content": "我們提供 {business_desc} 相關服務，致力於為客戶提供專業、高效的解決方案。"}},
    {{"category": "product", "title": "服務優勢", "content": "我們擁有專業團隊、豐富經驗，確保服務質量和客戶滿意度。"}},
    {{"category": "faq", "title": "Q: 如何開始使用？", "content": "A: 您可以直接聯繫我們的客服，我們會為您詳細介紹流程。"}},
    {{"category": "faq", "title": "Q: 服務費用如何？", "content": "A: 我們提供具有競爭力的價格，具體費用根據您的需求而定。"}},
    {{"category": "sales", "title": "開場話術", "content": "您好！很高興為您服務。請問有什麼可以幫助您的？"}},
    {{"category": "sales", "title": "優勢介紹", "content": "我們的服務已經幫助眾多客戶解決問題，您可以放心選擇。"}},
    {{"category": "objection", "title": "價格異議", "content": "我理解您對價格的關注。我們的價格是基於優質服務制定的，您可以先體驗一下。"}},
    {{"category": "objection", "title": "信任異議", "content": "我們已經服務多年，有大量成功案例，您可以查看我們的客戶評價。"}}
  ]
}}'''

    def _parse_rag_knowledge_response(self, response: str) -> list:
        """解析 AI 生成的知識 JSON"""
        # 🔧 P0 修復：空值檢查，避免 NoneType 錯誤
        if not response:
            print("[RAG] ⚠️ AI 回應為空，跳過解析", file=sys.stderr)
            return []
        
        try:
            # 嘗試提取 JSON
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                data = json.loads(json_match.group())
                items = data.get('items', [])
                if items:
                    print(f"[RAG] ✓ JSON 解析成功，獲取 {len(items)} 條知識", file=sys.stderr)
                    return items
        except Exception as json_err:
            print(f"[RAG] JSON 解析失敗: {json_err}", file=sys.stderr)
        
        # 降級：按行解析
        items = []
        try:
            lines = response.strip().split('\n')
            current_q = None
            
            for line in lines:
                line = line.strip()
                if line.startswith('Q:') or line.startswith('問:'):
                    current_q = line[2:].strip()
                elif line.startswith('A:') or line.startswith('答:'):
                    if current_q:
                        items.append({
                            'question': current_q,
                            'answer': line[2:].strip()
                        })
                        current_q = None
            
            if items:
                print(f"[RAG] ✓ 行解析成功，獲取 {len(items)} 條知識", file=sys.stderr)
        except Exception as line_err:
            print(f"[RAG] 行解析失敗: {line_err}", file=sys.stderr)
        
        # 🔧 P0 修復：最終容錯 - 將整個回應作為一條知識
        if not items and response.strip():
            print(f"[RAG] 使用容錯模式，將回應作為單條知識", file=sys.stderr)
            # 嘗試提取第一行作為問題，其餘作為答案
            lines = response.strip().split('\n')
            if len(lines) >= 2:
                items.append({
                    'question': lines[0][:100],  # 取前100字作為問題
                    'answer': '\n'.join(lines[1:])[:500]  # 取後續內容作為答案
                })
            else:
                items.append({
                    'question': '業務知識',
                    'answer': response.strip()[:500]
                })
        
        return items

    def _parse_document_to_knowledge(self, document: str) -> list:
        """
        🆕 P1-1: 直接解析文檔內容為結構化知識（🆕 P0-3: 智能分類）
        
        支持解析格式：
        - 【標題】：內容
        - 標題：內容
        - 數字. 內容
        - 問答格式
        
        自動分類：
        - product: 產品相關
        - price: 價格/費率相關
        - process: 流程/操作相關
        - faq: 常見問答
        - resource: 資源連結
        """
        if not document or len(document.strip()) < 10:
            return []
        
        items = []
        lines = document.strip().split('\n')
        
        # 🆕 P0-3: 分類關鍵詞映射
        category_keywords = {
            'price': ['價格', '費率', '費用', '金額', '成本', '收費', '結算', '手續費', '佣金', '返點', 'D0', 'D1', 'T+'],
            'product': ['產品', '通道', '功能', '服務', '支付', '收款', '代付', 'H5', '微信', '支付寶', 'USDT'],
            'process': ['流程', '步驟', '如何', '怎麼', '對接', '接入', '使用', '操作', '開戶', '申請'],
            'faq': ['問', '答', 'Q:', 'A:', '是否', '可以', '支持', '能不能'],
            'resource': ['群組', '頻道', '官網', '網址', 'http', 't.me', '視頻', '教程', '連結', '鏈接']
        }
        
        def classify_content(title: str, content: str) -> str:
            """根據內容自動分類"""
            combined = (title + ' ' + content).lower()
            
            # 按優先級匹配
            for category, keywords in category_keywords.items():
                for kw in keywords:
                    if kw.lower() in combined:
                        return category
            
            return 'product'  # 默認為產品知識
        
        # 模式1: 解析【】格式的結構化內容
        bracket_pattern = re.compile(r'【(.+?)】[：:]\s*(.+)')
        
        # 模式2: 解析「標題：內容」格式
        colon_pattern = re.compile(r'^([^：:]{2,15})[：:]\s*(.+)$')
        
        # 模式3: 解析「數字. 內容」格式
        number_pattern = re.compile(r'^\d+[\.、]\s*(.+)$')
        
        current_section = None
        section_content = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # 嘗試匹配【】格式
            bracket_match = bracket_pattern.match(line)
            if bracket_match:
                # 保存之前的 section
                if current_section and section_content:
                    answer = '\n'.join(section_content)
                    items.append({
                        'question': f"{current_section}是什麼？",
                        'answer': answer,
                        'context': document[:200],
                        'category': classify_content(current_section, answer)  # 🆕 自動分類
                    })
                
                title = bracket_match.group(1).strip()
                content = bracket_match.group(2).strip()
                
                # 直接作為知識點
                if len(content) > 5:
                    items.append({
                        'question': f"{title}是多少？" if any(c.isdigit() for c in content) else f"{title}是什麼？",
                        'answer': content,
                        'context': document[:200],
                        'category': classify_content(title, content)  # 🆕 自動分類
                    })
                
                current_section = title
                section_content = [content] if content else []
                continue
            
            # 嘗試匹配「標題：內容」格式
            colon_match = colon_pattern.match(line)
            if colon_match:
                title = colon_match.group(1).strip()
                content = colon_match.group(2).strip()
                
                # 過濾常見的非知識標題
                skip_titles = ['群組', '頻道', '官網', '視頻', '網址', 'http']
                if not any(skip in title for skip in skip_titles) and len(content) > 3:
                    # 判斷問題類型
                    if any(c.isdigit() for c in content):
                        question = f"{title}是多少？"
                    elif '~' in content or '-' in content or '到' in content:
                        question = f"{title}範圍是多少？"
                    else:
                        question = f"{title}是什麼？"
                    
                    items.append({
                        'question': question,
                        'answer': content,
                        'context': document[:200],
                        'category': classify_content(title, content)  # 🆕 自動分類
                    })
                continue
            
            # 收集當前 section 的內容
            if current_section:
                section_content.append(line)
        
        # 處理最後一個 section
        if current_section and section_content:
            answer = '\n'.join(section_content)
            items.append({
                'question': f"{current_section}是什麼？",
                'answer': answer,
                'context': document[:200],
                'category': classify_content(current_section, answer)  # 🆕 自動分類
            })
        
        # 🔧 額外：提取 URL 作為資源知識
        url_pattern = re.compile(r'(https?://[^\s]+)')
        urls = url_pattern.findall(document)
        if urls:
            items.append({
                'question': '有哪些相關連結和資源？',
                'answer': '\n'.join(urls),
                'context': '相關資源連結',
                'category': 'resource'  # 🆕 資源分類
            })
        
        # 🆕 P0-3: 打印分類統計
        category_stats = {}
        for item in items:
            cat = item.get('category', 'unknown')
            category_stats[cat] = category_stats.get(cat, 0) + 1
        
        print(f"[RAG] 📄 文檔解析完成: {len(items)} 條知識", file=sys.stderr)
        print(f"[RAG] 📊 分類統計: {category_stats}", file=sys.stderr)
        return items
    
    # ==================== 🆕 P1-2: 導入預覽確認流程 ====================
    
    # 臨時存儲預覽的知識（用於確認導入）
    _pending_import_items: Dict[str, list] = {}

    def _get_advantages_by_industry(self, industry: str) -> list:
        """根據行業返回優勢選項"""
        common = [
            {'id': 'fast', 'label': '⚡ 速度快'},
            {'id': 'cheap', 'label': '💰 價格低'},
            {'id': 'safe', 'label': '🔒 安全可靠'},
            {'id': '24h', 'label': '🕐 24小時服務'}
        ]
        
        industry_specific = {
            'payment': [
                {'id': 'high_rate', 'label': '📈 匯率高'},
                {'id': 'multi_channel', 'label': '💳 多種收付方式'}
            ],
            'ecommerce': [
                {'id': 'quality', 'label': '✨ 品質保證'},
                {'id': 'return', 'label': '🔄 七天退換'}
            ],
            'education': [
                {'id': 'expert', 'label': '👨‍🏫 專家授課'},
                {'id': 'lifetime', 'label': '♾️ 永久有效'}
            ]
        }
        
        return common + industry_specific.get(industry, [])

    def _get_faq_suggestions(self, industry: str) -> list:
        """根據行業返回常見問題建議"""
        suggestions = {
            'payment': ['多久到賬？', '匯率怎麼算？', '手續費多少？', '最低金額是多少？', '安全嗎？'],
            'ecommerce': ['怎麼下單？', '多久發貨？', '可以退換嗎？', '有發票嗎？'],
            'education': ['課程多久？', '可以試聽嗎？', '有證書嗎？', '可以退款嗎？'],
            'finance': ['收益率多少？', '風險大嗎？', '隨時可取嗎？'],
            'service': ['怎麼收費？', '服務範圍是？', '有保障嗎？']
        }
        return suggestions.get(industry, ['怎麼購買？', '價格是多少？', '有售後嗎？'])

    async def _generate_knowledge_from_guided_answers(self, answers: dict):
        """根據引導式問答的答案生成知識（🔧 P3-1: 模块级延迟导入）"""
        telegram_rag = _get_telegram_rag()
        KnowledgeType = _get_KnowledgeType()
        ai_auto_chat = _get_ai_auto_chat()
        
        try:
            industry = answers.get('step1', 'other')
            advantages = answers.get('step2', [])
            products = answers.get('step3', '')
            faqs = answers.get('step4', '')
            style = answers.get('step5', 'friendly')
            
            total_items = 0
            
            # 發送進度
            self.send_event("rag-build-progress", {
                "progress": {"step": 1, "totalSteps": 4, "currentAction": "分析業務信息...", "itemsGenerated": 0}
            })
            
            # 1. 使用 AI 生成產品知識
            if products and ai_auto_chat:
                prompt = f"""根據以下業務描述，生成 5 條產品知識（JSON 格式）:

業務類型: {industry}
產品描述: {products}
優勢: {', '.join(advantages) if isinstance(advantages, list) else advantages}

請返回 JSON: {{"items": [{{"type": "product", "question": "...", "answer": "..."}}]}}"""
                
                response = await ai_auto_chat._generate_response_with_prompt(
                    user_id="system",
                    user_message=prompt,
                    custom_prompt=f"你是專業的知識庫生成助手。請用繁體中文，風格: {style}",
                    usage_type="knowledge"
                )
                
                items = self._parse_rag_knowledge_response(response)
                for item in items:
                    await telegram_rag.add_manual_knowledge(
                        knowledge_type=KnowledgeType.PRODUCT,
                        question=item.get('question', ''),
                        answer=item.get('answer', '')
                    )
                    total_items += 1
            
            self.send_event("rag-build-progress", {
                "progress": {"step": 2, "totalSteps": 4, "currentAction": "生成常見問答...", "itemsGenerated": total_items}
            })
            
            # 2. 根據用戶提供的 FAQ 生成答案
            if faqs:
                faq_list = [q.strip() for q in faqs.split('\n') if q.strip()]
                for faq in faq_list[:10]:
                    if ai_auto_chat:
                        answer = await ai_auto_chat._generate_response_with_prompt(
                            user_id="system",
                            user_message=f"業務：{products[:200]}\n\n問題：{faq}\n\n請給出專業回答。",
                            custom_prompt=f"你是專業客服，風格: {style}。請用繁體中文簡潔回答。",
                            usage_type="knowledge"
                        )
                    else:
                        answer = f"關於您詢問的「{faq}」，我們的回答是..."
                    
                    await telegram_rag.add_manual_knowledge(
                        knowledge_type=KnowledgeType.FAQ,
                        question=faq,
                        answer=answer
                    )
                    total_items += 1
            
            self.send_event("rag-build-progress", {
                "progress": {"step": 3, "totalSteps": 4, "currentAction": "生成銷售話術...", "itemsGenerated": total_items}
            })
            
            # 3. 生成銷售話術
            if ai_auto_chat:
                script_prompt = f"""根據以下信息，生成 5 條銷售話術:

業務: {products[:200]}
優勢: {', '.join(advantages) if isinstance(advantages, list) else advantages}

請返回 JSON: {{"items": [{{"type": "script", "question": "場景", "answer": "話術"}}]}}"""
                
                script_response = await ai_auto_chat._generate_response_with_prompt(
                    user_id="system",
                    user_message=script_prompt,
                    custom_prompt=f"你是銷售話術專家。風格: {style}",
                    usage_type="knowledge"
                )
                
                script_items = self._parse_rag_knowledge_response(script_response)
                for item in script_items:
                    await telegram_rag.add_manual_knowledge(
                        knowledge_type=KnowledgeType.SCRIPT,
                        question=item.get('question', ''),
                        answer=item.get('answer', '')
                    )
                    total_items += 1
            
            self.send_event("rag-build-progress", {
                "progress": {"step": 4, "totalSteps": 4, "currentAction": "完成！", "itemsGenerated": total_items}
            })
            
            # 完成
            self.send_event("rag-build-complete", {
                "success": True,
                "totalItems": total_items,
                "industry": industry
            })
            self.send_log(f"🧠 引導式構建完成，共 {total_items} 條知識", "success")
            
        except Exception as e:
            traceback.print_exc(file=sys.stderr)
            self.send_event("rag-build-complete", {
                "success": False,
                "error": str(e)
            })

