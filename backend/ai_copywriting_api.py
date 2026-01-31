"""
AI 話術生成 API
AI Copywriting API

🆕 後端優化: AI 話術生成 API

功能：
- 多種話術類型生成
- 風格定制
- 模板管理
- 話術優化
"""

import json
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
import asyncio
import logging

logger = logging.getLogger(__name__)


class CopywritingType(str, Enum):
    """話術類型"""
    GREETING = "greeting"
    REPLY = "reply"
    FOLLOW_UP = "follow_up"
    OBJECTION = "objection"
    CLOSING = "closing"
    RETENTION = "retention"


class CopywritingStyle(str, Enum):
    """話術風格"""
    PROFESSIONAL = "professional"
    FRIENDLY = "friendly"
    CASUAL = "casual"
    URGENT = "urgent"
    EMPATHETIC = "empathetic"


@dataclass
class CopywritingRequest:
    """生成請求"""
    type: CopywritingType
    style: CopywritingStyle = CopywritingStyle.FRIENDLY
    context: Dict[str, Any] = field(default_factory=dict)
    options: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CopywritingResult:
    """生成結果"""
    id: str
    text: str
    type: CopywritingType
    style: CopywritingStyle
    score: int
    tags: List[str]
    created_at: str


class AICopywritingAPI:
    """AI 話術生成 API"""
    
    # 類型描述
    TYPE_PROMPTS = {
        CopywritingType.GREETING: "開場白/問候語",
        CopywritingType.REPLY: "回覆消息",
        CopywritingType.FOLLOW_UP: "跟進消息",
        CopywritingType.OBJECTION: "異議處理話術",
        CopywritingType.CLOSING: "促成成交話術",
        CopywritingType.RETENTION: "挽回客戶話術"
    }
    
    # 風格描述
    STYLE_DESCRIPTIONS = {
        CopywritingStyle.PROFESSIONAL: "專業正式，用詞精準，給人信賴感",
        CopywritingStyle.FRIENDLY: "親切友好，像朋友聊天一樣自然",
        CopywritingStyle.CASUAL: "輕鬆隨意，口語化，不拘謹",
        CopywritingStyle.URGENT: "帶有適度緊迫感，促進決策",
        CopywritingStyle.EMPATHETIC: "富有同理心，理解客戶處境"
    }
    
    # 系統模板
    SYSTEM_TEMPLATES = {
        "greeting_friendly": {
            "type": CopywritingType.GREETING,
            "style": CopywritingStyle.FRIENDLY,
            "template": "嗨 {customer_name}！我是{product_name}的{role}。看到您對我們產品有興趣，想了解更多嗎？😊",
            "variables": ["customer_name", "product_name", "role"]
        },
        "greeting_professional": {
            "type": CopywritingType.GREETING,
            "style": CopywritingStyle.PROFESSIONAL,
            "template": "您好，{customer_name}。我是{company}的{role}，很高興為您服務。請問有什麼可以幫助您的嗎？",
            "variables": ["customer_name", "company", "role"]
        },
        "objection_price": {
            "type": CopywritingType.OBJECTION,
            "style": CopywritingStyle.EMPATHETIC,
            "template": "完全理解您的考慮！很多客戶一開始也有同樣的想法。不過實際使用後，他們發現{benefit}，投資回報其實很可觀。要不我分享幾個成功案例給您看看？",
            "variables": ["benefit"]
        },
        "closing_urgent": {
            "type": CopywritingType.CLOSING,
            "style": CopywritingStyle.URGENT,
            "template": "對了，現在正好有{promotion}活動，{deadline}截止！這個時候入手真的很划算。需要我幫您鎖定名額嗎？",
            "variables": ["promotion", "deadline"]
        },
        "followup_friendly": {
            "type": CopywritingType.FOLLOW_UP,
            "style": CopywritingStyle.FRIENDLY,
            "template": "嗨 {customer_name}，好久不見！上次聊到{topic}，不知道您後來考慮得怎麼樣了？有任何問題都可以隨時問我哦～",
            "variables": ["customer_name", "topic"]
        },
        "retention_empathetic": {
            "type": CopywritingType.RETENTION,
            "style": CopywritingStyle.EMPATHETIC,
            "template": "{customer_name}，好久沒看到您了，有點想念呢！是不是最近太忙了？我們最近推出了{new_feature}，覺得特別適合您，要不要來看看？",
            "variables": ["customer_name", "new_feature"]
        }
    }
    
    def __init__(self, ai_service=None):
        self.ai_service = ai_service
        self._user_templates: Dict[str, Dict] = {}
    
    async def generate(self, request: CopywritingRequest) -> List[CopywritingResult]:
        """生成話術"""
        count = request.options.get("count", 3)
        results = []
        
        # 嘗試使用 AI 生成
        if self.ai_service:
            try:
                prompt = self._build_prompt(request)
                ai_results = await self.ai_service.generate_text(
                    prompt,
                    max_tokens=request.options.get("max_length", 200),
                    count=count
                )
                
                for text in ai_results:
                    result = self._create_result(text, request)
                    results.append(result)
                    
            except Exception as e:
                logger.error(f"AI generation failed: {e}")
        
        # 如果 AI 生成失敗或結果不足，使用模板補充
        if len(results) < count:
            template_results = self._generate_from_templates(request, count - len(results))
            results.extend(template_results)
        
        return results
    
    async def optimize(self, text: str, style: CopywritingStyle) -> str:
        """優化話術"""
        if not self.ai_service:
            return text
        
        prompt = f"""請將以下話術優化為{self.STYLE_DESCRIPTIONS[style]}風格，保持原意但更有吸引力：

原文：{text}

優化後："""
        
        try:
            results = await self.ai_service.generate_text(prompt, max_tokens=300, count=1)
            if results:
                return results[0].strip()
        except Exception as e:
            logger.error(f"Optimization failed: {e}")
        
        return text
    
    async def suggest_reply(
        self, 
        customer_message: str,
        context: Dict[str, Any] = None
    ) -> List[CopywritingResult]:
        """生成回覆建議"""
        request = CopywritingRequest(
            type=CopywritingType.REPLY,
            style=CopywritingStyle.FRIENDLY,
            context={
                "previous_messages": [customer_message],
                **(context or {})
            },
            options={"count": 3}
        )
        
        return await self.generate(request)
    
    # ============ 模板管理 ============
    
    def get_templates(self, type_filter: CopywritingType = None) -> List[Dict]:
        """獲取所有模板"""
        all_templates = []
        
        # 系統模板
        for key, template in self.SYSTEM_TEMPLATES.items():
            if type_filter and template["type"] != type_filter:
                continue
            all_templates.append({
                "id": key,
                "is_system": True,
                **template
            })
        
        # 用戶模板
        for key, template in self._user_templates.items():
            if type_filter and template.get("type") != type_filter:
                continue
            all_templates.append({
                "id": key,
                "is_system": False,
                **template
            })
        
        return all_templates
    
    def save_template(self, template: Dict) -> str:
        """保存用戶模板"""
        template_id = f"user-{uuid.uuid4().hex[:8]}"
        self._user_templates[template_id] = {
            "type": CopywritingType(template.get("type", "greeting")),
            "style": CopywritingStyle(template.get("style", "friendly")),
            "template": template.get("template", ""),
            "variables": template.get("variables", []),
            "name": template.get("name", "自定義模板"),
            "created_at": datetime.now().isoformat()
        }
        return template_id
    
    def delete_template(self, template_id: str) -> bool:
        """刪除用戶模板"""
        if template_id in self._user_templates:
            del self._user_templates[template_id]
            return True
        return False
    
    def apply_template(self, template_id: str, variables: Dict[str, str]) -> str:
        """應用模板"""
        template = None
        
        if template_id in self.SYSTEM_TEMPLATES:
            template = self.SYSTEM_TEMPLATES[template_id]
        elif template_id in self._user_templates:
            template = self._user_templates[template_id]
        
        if not template:
            return ""
        
        result = template["template"]
        for key, value in variables.items():
            result = result.replace(f"{{{key}}}", value or "")
        
        # 清理未替換的變量
        import re
        result = re.sub(r'\{[^}]+\}', '', result)
        
        return result.strip()
    
    # ============ 私有方法 ============
    
    def _build_prompt(self, request: CopywritingRequest) -> str:
        """構建 AI prompt"""
        type_desc = self.TYPE_PROMPTS.get(request.type, "營銷話術")
        style_desc = self.STYLE_DESCRIPTIONS.get(request.style, "")
        
        prompt = f"""作為專業的銷售話術專家，請生成{type_desc}。

風格要求：{style_desc}

"""
        
        context = request.context
        
        if context.get("product_name"):
            prompt += f"產品/服務：{context['product_name']}\n"
        
        if context.get("customer_name"):
            prompt += f"客戶稱呼：{context['customer_name']}\n"
        
        if context.get("previous_messages"):
            prompt += f"\n對話上下文：\n{chr(10).join(context['previous_messages'])}\n"
        
        if context.get("objection"):
            prompt += f"\n客戶異議：{context['objection']}\n"
        
        if context.get("goal"):
            prompt += f"\n目標：{context['goal']}\n"
        
        include_emoji = request.options.get("include_emoji", True)
        
        prompt += f"""
要求：
1. 自然口語化，不要太生硬
2. 簡潔有力，不要太長
3. 有親和力，讓客戶感到舒適
{"4. 適當使用表情符號" if include_emoji else ""}

請直接給出話術，不需要解釋："""
        
        return prompt
    
    def _generate_from_templates(self, request: CopywritingRequest, count: int) -> List[CopywritingResult]:
        """從模板生成"""
        results = []
        
        matching_templates = [
            (key, tpl) for key, tpl in self.SYSTEM_TEMPLATES.items()
            if tpl["type"] == request.type
        ]
        
        for i, (key, template) in enumerate(matching_templates[:count]):
            text = self.apply_template(key, request.context)
            result = CopywritingResult(
                id=f"copy-{uuid.uuid4().hex[:12]}",
                text=text,
                type=request.type,
                style=template["style"],
                score=70,
                tags=["模板"],
                created_at=datetime.now().isoformat()
            )
            results.append(result)
        
        return results
    
    def _create_result(self, text: str, request: CopywritingRequest) -> CopywritingResult:
        """創建結果對象"""
        text = self._post_process(text, request)
        score = self._evaluate_quality(text, request)
        tags = self._extract_tags(request)
        
        return CopywritingResult(
            id=f"copy-{uuid.uuid4().hex[:12]}",
            text=text,
            type=request.type,
            style=request.style,
            score=score,
            tags=tags,
            created_at=datetime.now().isoformat()
        )
    
    def _post_process(self, text: str, request: CopywritingRequest) -> str:
        """後處理"""
        result = text.strip()
        
        # 移除引號
        if result.startswith('"') and result.endswith('"'):
            result = result[1:-1]
        
        # 替換變量
        context = request.context
        if context.get("customer_name"):
            result = result.replace("{customer_name}", context["customer_name"])
        if context.get("product_name"):
            result = result.replace("{product_name}", context["product_name"])
        
        return result
    
    def _evaluate_quality(self, text: str, request: CopywritingRequest) -> int:
        """評估質量"""
        score = 70
        
        # 長度適中
        if 20 <= len(text) <= 200:
            score += 10
        
        # 包含表情
        if request.options.get("include_emoji"):
            import re
            if re.search(r'[\U0001F300-\U0001F9FF]', text):
                score += 5
        
        # 有問句
        if '？' in text or '?' in text:
            score += 5
        
        # 個性化
        if request.context.get("customer_name") and request.context["customer_name"] in text:
            score += 5
        
        return min(100, score)
    
    def _extract_tags(self, request: CopywritingRequest) -> List[str]:
        """提取標籤"""
        tags = [request.type.value]
        
        if request.style:
            tags.append(request.style.value)
        if request.options.get("include_emoji"):
            tags.append("emoji")
        if request.context.get("product_name"):
            tags.append("產品相關")
        
        return tags


# ============ IPC 處理器 ============

def register_copywriting_handlers(ipc_handler, ai_service=None):
    """註冊話術生成 IPC 處理器"""
    api = AICopywritingAPI(ai_service)
    
    @ipc_handler.handle("ai-generate-copywriting")
    async def handle_generate(data):
        request = CopywritingRequest(
            type=CopywritingType(data.get("type", "greeting")),
            style=CopywritingStyle(data.get("style", "friendly")),
            context=data.get("context", {}),
            options=data.get("options", {})
        )
        
        results = await api.generate(request)
        return {
            "success": True,
            "results": [asdict(r) for r in results]
        }
    
    @ipc_handler.handle("ai-optimize-copywriting")
    async def handle_optimize(data):
        text = data.get("text", "")
        style = CopywritingStyle(data.get("style", "friendly"))
        
        optimized = await api.optimize(text, style)
        return {"success": True, "text": optimized}
    
    @ipc_handler.handle("ai-suggest-reply")
    async def handle_suggest_reply(data):
        results = await api.suggest_reply(
            data.get("customer_message", ""),
            data.get("context")
        )
        return {
            "success": True,
            "results": [asdict(r) for r in results]
        }
    
    @ipc_handler.handle("get-copywriting-templates")
    async def handle_get_templates(data):
        type_filter = None
        if data.get("type"):
            type_filter = CopywritingType(data["type"])
        
        templates = api.get_templates(type_filter)
        return {"success": True, "templates": templates}
    
    @ipc_handler.handle("save-copywriting-template")
    async def handle_save_template(data):
        template_id = api.save_template(data)
        return {"success": True, "template_id": template_id}
    
    @ipc_handler.handle("delete-copywriting-template")
    async def handle_delete_template(data):
        success = api.delete_template(data.get("template_id"))
        return {"success": success}
    
    @ipc_handler.handle("apply-copywriting-template")
    async def handle_apply_template(data):
        text = api.apply_template(
            data.get("template_id"),
            data.get("variables", {})
        )
        return {"success": True, "text": text}
    
    return api
