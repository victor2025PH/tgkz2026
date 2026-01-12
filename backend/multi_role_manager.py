"""
TG-Matrix Multi-Role Manager
Manages account roles for collaborative marketing scenarios
"""
import json
import sys
from datetime import datetime
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, asdict
from enum import Enum


class RoleType(Enum):
    """Role types for collaborative marketing"""
    SELLER = "seller"           # 銷售 - 主動觸達、需求挖掘
    EXPERT = "expert"           # 專家 - 專業解答、技術背書
    SATISFIED = "satisfied"     # 滿意客戶 - 分享好評、推薦產品
    HESITANT = "hesitant"       # 猶豫客戶 - 提出疑問、示範轉化
    CONVERTED = "converted"     # 成交客戶 - 曬單反饋、增加緊迫感
    CURIOUS = "curious"         # 好奇者 - 問問題、帶節奏
    MANAGER = "manager"         # 經理 - 特批優惠、增加緊迫感
    SUPPORT = "support"         # 售後 - 處理問題、增加信任


class SpeakingStyle(Enum):
    """Speaking style presets"""
    PROFESSIONAL = "professional"   # 專業正式
    FRIENDLY = "friendly"           # 友好親切
    CASUAL = "casual"               # 隨意輕鬆
    ENTHUSIASTIC = "enthusiastic"   # 熱情洋溢
    CAREFUL = "careful"             # 謹慎小心
    CURIOUS = "curious"             # 好奇提問


class ResponseSpeed(Enum):
    """Response speed settings"""
    FAST = "fast"           # 1-5 秒
    MEDIUM = "medium"       # 5-15 秒
    SLOW = "slow"           # 15-60 秒
    RANDOM = "random"       # 隨機


class EmojiFrequency(Enum):
    """Emoji usage frequency"""
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# Role templates with default configurations
ROLE_TEMPLATES: Dict[str, Dict[str, Any]] = {
    RoleType.SELLER.value: {
        "icon": "🧑‍💼",
        "displayName": "銷售顧問",
        "defaultPersonality": {
            "proactive": True,
            "persuasive": True,
            "patient": True,
            "solution_oriented": True
        },
        "defaultStyle": SpeakingStyle.PROFESSIONAL.value,
        "defaultEmoji": EmojiFrequency.MEDIUM.value,
        "defaultSpeed": ResponseSpeed.MEDIUM.value,
        "promptTemplate": """你是一位專業的銷售顧問，名叫{name}。
你的目標是：
- 主動了解客戶需求
- 用專業知識解決客戶疑慮
- 引導客戶做出購買決定
- 保持友好但專業的態度

說話風格：{style}
注意事項：
- 不要太過強硬推銷
- 先建立信任再談產品
- 適時使用表情符號增加親和力"""
    },
    RoleType.EXPERT.value: {
        "icon": "👨‍🔬",
        "displayName": "專業顧問",
        "defaultPersonality": {
            "knowledgeable": True,
            "analytical": True,
            "objective": True,
            "helpful": True
        },
        "defaultStyle": SpeakingStyle.PROFESSIONAL.value,
        "defaultEmoji": EmojiFrequency.LOW.value,
        "defaultSpeed": ResponseSpeed.SLOW.value,
        "promptTemplate": """你是一位專業的技術顧問，名叫{name}。
你的目標是：
- 提供專業、客觀的技術解答
- 用數據和案例支持觀點
- 建立專業可信的形象
- 幫助解決技術疑問

說話風格：{style}
注意事項：
- 保持專業客觀
- 可以適當分享行業見解
- 回答要有深度和依據"""
    },
    RoleType.SATISFIED.value: {
        "icon": "😊",
        "displayName": "滿意客戶",
        "defaultPersonality": {
            "enthusiastic": True,
            "helpful": True,
            "genuine": True,
            "positive": True
        },
        "defaultStyle": SpeakingStyle.ENTHUSIASTIC.value,
        "defaultEmoji": EmojiFrequency.HIGH.value,
        "defaultSpeed": ResponseSpeed.RANDOM.value,
        "promptTemplate": """你是一位滿意的老客戶，名叫{name}。
你的目標是：
- 分享自己使用產品的真實體驗
- 回答新客戶的疑問
- 自然地推薦產品
- 表達對產品的滿意

說話風格：{style}
注意事項：
- 像普通用戶一樣說話
- 分享具體的使用場景
- 不要像托兒一樣刻意吹捧
- 可以提到一些小缺點增加可信度"""
    },
    RoleType.HESITANT.value: {
        "icon": "🤔",
        "displayName": "猶豫客戶",
        "defaultPersonality": {
            "cautious": True,
            "questioning": True,
            "practical": True,
            "budget_conscious": True
        },
        "defaultStyle": SpeakingStyle.CAREFUL.value,
        "defaultEmoji": EmojiFrequency.LOW.value,
        "defaultSpeed": ResponseSpeed.SLOW.value,
        "promptTemplate": """你是一位正在考慮購買的潛在客戶，名叫{name}。
你的目標是：
- 提出常見的購買疑慮
- 問出新客戶想問但不敢問的問題
- 在被說服後表示興趣
- 展示從猶豫到信任的轉變過程

說話風格：{style}
注意事項：
- 一開始保持謹慎
- 提出價格、效果、售後等疑問
- 逐漸被其他人說服
- 最後可以表示要考慮購買"""
    },
    RoleType.CONVERTED.value: {
        "icon": "🎉",
        "displayName": "成交客戶",
        "defaultPersonality": {
            "excited": True,
            "grateful": True,
            "sharing": True,
            "supportive": True
        },
        "defaultStyle": SpeakingStyle.ENTHUSIASTIC.value,
        "defaultEmoji": EmojiFrequency.HIGH.value,
        "defaultSpeed": ResponseSpeed.FAST.value,
        "promptTemplate": """你是一位剛剛購買成功的客戶，名叫{name}。
你的目標是：
- 分享購買的喜悅
- 曬出購買證明或使用效果
- 感謝其他人的建議
- 營造購買的緊迫感

說話風格：{style}
注意事項：
- 表現出真實的興奮
- 可以提到優惠或贈品
- 說明購買決定的原因
- 適時催促還在猶豫的人"""
    },
    RoleType.CURIOUS.value: {
        "icon": "❓",
        "displayName": "好奇者",
        "defaultPersonality": {
            "curious": True,
            "engaged": True,
            "open_minded": True,
            "interactive": True
        },
        "defaultStyle": SpeakingStyle.CURIOUS.value,
        "defaultEmoji": EmojiFrequency.MEDIUM.value,
        "defaultSpeed": ResponseSpeed.RANDOM.value,
        "promptTemplate": """你是一位對產品感到好奇的圍觀者，名叫{name}。
你的目標是：
- 問出引導對話的問題
- 活躍群內氣氛
- 帶動討論節奏
- 表達對產品的興趣

說話風格：{style}
注意事項：
- 問簡單直接的問題
- 對回答表示感謝或驚訝
- 適時附和其他人
- 保持活躍但不搶戲"""
    },
    RoleType.MANAGER.value: {
        "icon": "👔",
        "displayName": "經理主管",
        "defaultPersonality": {
            "authoritative": True,
            "generous": True,
            "decisive": True,
            "accommodating": True
        },
        "defaultStyle": SpeakingStyle.PROFESSIONAL.value,
        "defaultEmoji": EmojiFrequency.LOW.value,
        "defaultSpeed": ResponseSpeed.SLOW.value,
        "promptTemplate": """你是銷售團隊的經理，名叫{name}。
你的目標是：
- 在關鍵時刻出現給予特別優惠
- 增加購買的緊迫感
- 顯示誠意和重視
- 促成最終成交

說話風格：{style}
注意事項：
- 表現出有權限做決定
- 特批優惠要有合理理由
- 強調名額有限
- 營造稀缺感"""
    },
    RoleType.SUPPORT.value: {
        "icon": "🛠️",
        "displayName": "售後客服",
        "defaultPersonality": {
            "helpful": True,
            "patient": True,
            "responsible": True,
            "reassuring": True
        },
        "defaultStyle": SpeakingStyle.FRIENDLY.value,
        "defaultEmoji": EmojiFrequency.MEDIUM.value,
        "defaultSpeed": ResponseSpeed.FAST.value,
        "promptTemplate": """你是售後服務團隊成員，名叫{name}。
你的目標是：
- 回答售後相關問題
- 讓客戶對售後服務放心
- 處理可能的投訴顧慮
- 增加購買信心

說話風格：{style}
注意事項：
- 展現專業和耐心
- 強調售後保障
- 分享成功處理案例
- 讓客戶感到被重視"""
    }
}


@dataclass
class AccountRole:
    """Account role configuration"""
    id: int
    account_phone: str
    role_type: str
    role_name: str
    personality: Dict[str, Any]
    speaking_style: str
    emoji_frequency: str
    response_speed: str
    custom_prompt: Optional[str]
    avatar_url: Optional[str]
    bio: Optional[str]
    is_active: bool
    created_at: str
    updated_at: str
    
    def to_dict(self) -> Dict[str, Any]:
        template = ROLE_TEMPLATES.get(self.role_type, {})
        return {
            "id": self.id,
            "accountPhone": self.account_phone,
            "roleType": self.role_type,
            "roleName": self.role_name,
            "icon": template.get("icon", "👤"),
            "personality": self.personality,
            "speakingStyle": self.speaking_style,
            "emojiFrequency": self.emoji_frequency,
            "responseSpeed": self.response_speed,
            "customPrompt": self.custom_prompt,
            "avatarUrl": self.avatar_url,
            "bio": self.bio,
            "isActive": self.is_active,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at
        }


class MultiRoleManager:
    """
    Multi-role management system
    
    Features:
    - Configure accounts with different roles
    - Manage role personalities and speaking styles
    - Generate role-specific AI prompts
    - Support multiple roles per account
    """
    
    def __init__(self, db, event_callback: Callable = None, log_callback: Callable = None):
        self.db = db
        self.event_callback = event_callback
        self.log_callback = log_callback or self._default_log
        self._initialized = False
    
    def _default_log(self, message: str, level: str = "info"):
        print(f"[MultiRole] [{level.upper()}] {message}", file=sys.stderr)
    
    def _send_event(self, event_name: str, data: Dict[str, Any]):
        """Send event to frontend"""
        if self.event_callback:
            self.event_callback(event_name, data)
    
    async def initialize(self):
        """Initialize role management tables"""
        if self._initialized:
            return
        
        try:
            # Create account_roles table
            await self.db.execute('''
                CREATE TABLE IF NOT EXISTS account_roles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    account_phone TEXT NOT NULL,
                    role_type TEXT NOT NULL,
                    role_name TEXT NOT NULL,
                    personality TEXT,
                    speaking_style TEXT DEFAULT 'professional',
                    emoji_frequency TEXT DEFAULT 'medium',
                    response_speed TEXT DEFAULT 'medium',
                    custom_prompt TEXT,
                    avatar_url TEXT,
                    bio TEXT,
                    is_active INTEGER DEFAULT 1,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE(account_phone, role_type)
                )
            ''')
            
            # Create indexes
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_account_roles_phone 
                ON account_roles(account_phone)
            ''')
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_account_roles_type 
                ON account_roles(role_type)
            ''')
            
            self._initialized = True
            self.log_callback("多角色管理器已初始化", "success")
            
        except Exception as e:
            self.log_callback(f"初始化失敗: {e}", "error")
    
    # ==================== Role Templates ====================
    
    def get_role_templates(self) -> Dict[str, Any]:
        """Get all available role templates"""
        templates = {}
        for role_type, template in ROLE_TEMPLATES.items():
            templates[role_type] = {
                "roleType": role_type,
                "icon": template["icon"],
                "displayName": template["displayName"],
                "defaultStyle": template["defaultStyle"],
                "defaultEmoji": template["defaultEmoji"],
                "defaultSpeed": template["defaultSpeed"]
            }
        return templates
    
    # ==================== Account Role CRUD ====================
    
    async def assign_role(
        self,
        account_phone: str,
        role_type: str,
        role_name: str,
        personality: Dict[str, Any] = None,
        speaking_style: str = None,
        emoji_frequency: str = None,
        response_speed: str = None,
        custom_prompt: str = None,
        bio: str = None
    ) -> Dict[str, Any]:
        """Assign a role to an account"""
        
        # Validate role type
        if role_type not in [r.value for r in RoleType]:
            return {"success": False, "error": f"無效的角色類型: {role_type}"}
        
        template = ROLE_TEMPLATES.get(role_type, {})
        now = datetime.now().isoformat()
        
        # Use defaults from template if not provided
        personality = personality or template.get("defaultPersonality", {})
        speaking_style = speaking_style or template.get("defaultStyle", "professional")
        emoji_frequency = emoji_frequency or template.get("defaultEmoji", "medium")
        response_speed = response_speed or template.get("defaultSpeed", "medium")
        
        try:
            # Check if role already exists for this account
            existing = await self.db.fetch_one('''
                SELECT id FROM account_roles 
                WHERE account_phone = ? AND role_type = ?
            ''', (account_phone, role_type))
            
            if existing:
                # Update existing role
                await self.db.execute('''
                    UPDATE account_roles SET
                        role_name = ?,
                        personality = ?,
                        speaking_style = ?,
                        emoji_frequency = ?,
                        response_speed = ?,
                        custom_prompt = ?,
                        bio = ?,
                        is_active = 1,
                        updated_at = ?
                    WHERE account_phone = ? AND role_type = ?
                ''', (
                    role_name,
                    json.dumps(personality),
                    speaking_style,
                    emoji_frequency,
                    response_speed,
                    custom_prompt,
                    bio,
                    now,
                    account_phone,
                    role_type
                ))
                
                self.log_callback(f"已更新角色: {account_phone} -> {role_name}", "info")
                return {"success": True, "roleId": existing['id'], "updated": True}
            
            else:
                # Insert new role
                role_id = await self.db.execute('''
                    INSERT INTO account_roles 
                    (account_phone, role_type, role_name, personality, speaking_style,
                     emoji_frequency, response_speed, custom_prompt, bio, is_active,
                     created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                ''', (
                    account_phone,
                    role_type,
                    role_name,
                    json.dumps(personality),
                    speaking_style,
                    emoji_frequency,
                    response_speed,
                    custom_prompt,
                    bio,
                    now,
                    now
                ))
                
                self.log_callback(f"已分配角色: {account_phone} -> {role_name} ({role_type})", "success")
                return {"success": True, "roleId": role_id, "created": True}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def update_role(
        self,
        role_id: int,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update an existing role configuration"""
        try:
            update_parts = []
            params = []
            
            field_mapping = {
                'roleName': 'role_name',
                'personality': 'personality',
                'speakingStyle': 'speaking_style',
                'emojiFrequency': 'emoji_frequency',
                'responseSpeed': 'response_speed',
                'customPrompt': 'custom_prompt',
                'bio': 'bio',
                'isActive': 'is_active'
            }
            
            for js_field, db_field in field_mapping.items():
                if js_field in updates:
                    value = updates[js_field]
                    if js_field == 'personality':
                        value = json.dumps(value)
                    elif js_field == 'isActive':
                        value = 1 if value else 0
                    update_parts.append(f"{db_field} = ?")
                    params.append(value)
            
            if not update_parts:
                return {"success": False, "error": "沒有要更新的欄位"}
            
            update_parts.append("updated_at = ?")
            params.append(datetime.now().isoformat())
            params.append(role_id)
            
            await self.db.execute(f'''
                UPDATE account_roles SET {', '.join(update_parts)}
                WHERE id = ?
            ''', tuple(params))
            
            return {"success": True, "roleId": role_id}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def remove_role(self, role_id: int) -> Dict[str, Any]:
        """Remove a role assignment"""
        try:
            await self.db.execute('DELETE FROM account_roles WHERE id = ?', (role_id,))
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_account_roles(self, account_phone: str) -> List[AccountRole]:
        """Get all roles for an account"""
        try:
            rows = await self.db.fetch_all('''
                SELECT * FROM account_roles 
                WHERE account_phone = ? AND is_active = 1
                ORDER BY role_type
            ''', (account_phone,))
            
            return [self._row_to_role(row) for row in rows]
            
        except Exception as e:
            self.log_callback(f"獲取角色失敗: {e}", "error")
            return []
    
    async def get_all_roles(
        self,
        role_type: Optional[str] = None,
        active_only: bool = True
    ) -> Dict[str, Any]:
        """Get all role assignments"""
        try:
            query = 'SELECT * FROM account_roles WHERE 1=1'
            params = []
            
            if role_type:
                query += ' AND role_type = ?'
                params.append(role_type)
            
            if active_only:
                query += ' AND is_active = 1'
            
            query += ' ORDER BY account_phone, role_type'
            
            rows = await self.db.fetch_all(query, tuple(params))
            
            roles = [self._row_to_role(row).to_dict() for row in rows]
            
            # Group by account
            by_account = {}
            for role in roles:
                phone = role['accountPhone']
                if phone not in by_account:
                    by_account[phone] = []
                by_account[phone].append(role)
            
            return {
                "success": True,
                "roles": roles,
                "byAccount": by_account,
                "total": len(roles)
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_accounts_by_role(self, role_type: str) -> List[str]:
        """Get all accounts with a specific role"""
        try:
            rows = await self.db.fetch_all('''
                SELECT DISTINCT account_phone FROM account_roles
                WHERE role_type = ? AND is_active = 1
            ''', (role_type,))
            
            return [row['account_phone'] for row in rows]
            
        except Exception:
            return []
    
    def _row_to_role(self, row) -> AccountRole:
        """Convert database row to AccountRole object"""
        return AccountRole(
            id=row['id'],
            account_phone=row['account_phone'],
            role_type=row['role_type'],
            role_name=row['role_name'],
            personality=json.loads(row['personality'] or '{}'),
            speaking_style=row['speaking_style'] or 'professional',
            emoji_frequency=row['emoji_frequency'] or 'medium',
            response_speed=row['response_speed'] or 'medium',
            custom_prompt=row['custom_prompt'],
            avatar_url=row['avatar_url'],
            bio=row['bio'],
            is_active=bool(row['is_active']),
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )
    
    # ==================== AI Prompt Generation ====================
    
    async def generate_role_prompt(
        self,
        account_phone: str,
        role_type: str,
        context: Dict[str, Any] = None
    ) -> Optional[str]:
        """Generate AI prompt for a specific role"""
        try:
            row = await self.db.fetch_one('''
                SELECT * FROM account_roles
                WHERE account_phone = ? AND role_type = ? AND is_active = 1
            ''', (account_phone, role_type))
            
            if not row:
                return None
            
            role = self._row_to_role(row)
            template = ROLE_TEMPLATES.get(role_type, {})
            
            # Use custom prompt if provided
            if role.custom_prompt:
                prompt = role.custom_prompt
            else:
                prompt = template.get("promptTemplate", "")
            
            # Replace placeholders
            style_descriptions = {
                "professional": "專業正式，用詞精準",
                "friendly": "友好親切，像朋友一樣交流",
                "casual": "隨意輕鬆，使用口語化表達",
                "enthusiastic": "熱情洋溢，充滿活力",
                "careful": "謹慎小心，多思考後發言",
                "curious": "充滿好奇，喜歡提問"
            }
            
            prompt = prompt.format(
                name=role.role_name,
                style=style_descriptions.get(role.speaking_style, role.speaking_style)
            )
            
            # Add emoji instructions
            emoji_instructions = {
                "none": "不使用任何表情符號。",
                "low": "偶爾使用表情符號，每2-3句話一個。",
                "medium": "適度使用表情符號，讓對話更生動。",
                "high": "經常使用表情符號，表達豐富情感。"
            }
            prompt += f"\n\n表情符號使用：{emoji_instructions.get(role.emoji_frequency, '')}"
            
            # Add context if provided
            if context:
                if context.get("targetUser"):
                    prompt += f"\n\n目標用戶信息：{context['targetUser']}"
                if context.get("scenario"):
                    prompt += f"\n\n當前場景：{context['scenario']}"
                if context.get("previousMessages"):
                    prompt += f"\n\n之前的對話：{context['previousMessages']}"
            
            return prompt
            
        except Exception as e:
            self.log_callback(f"生成提示詞失敗: {e}", "error")
            return None
    
    async def get_response_delay(self, account_phone: str, role_type: str) -> tuple:
        """Get response delay range based on role settings"""
        import random
        
        try:
            row = await self.db.fetch_one('''
                SELECT response_speed FROM account_roles
                WHERE account_phone = ? AND role_type = ? AND is_active = 1
            ''', (account_phone, role_type))
            
            speed = row['response_speed'] if row else 'medium'
            
            delay_ranges = {
                "fast": (1, 5),
                "medium": (5, 15),
                "slow": (15, 60),
                "random": (random.randint(1, 10), random.randint(20, 60))
            }
            
            return delay_ranges.get(speed, (5, 15))
            
        except Exception:
            return (5, 15)
    
    # ==================== Role Statistics ====================
    
    async def get_role_stats(self) -> Dict[str, Any]:
        """Get statistics about role assignments"""
        try:
            # Total roles
            total_row = await self.db.fetch_one(
                'SELECT COUNT(*) as count FROM account_roles WHERE is_active = 1'
            )
            total = total_row['count'] if total_row else 0
            
            # By role type
            type_rows = await self.db.fetch_all('''
                SELECT role_type, COUNT(*) as count 
                FROM account_roles WHERE is_active = 1
                GROUP BY role_type
            ''')
            by_type = {row['role_type']: row['count'] for row in type_rows}
            
            # Accounts with roles
            accounts_row = await self.db.fetch_one('''
                SELECT COUNT(DISTINCT account_phone) as count 
                FROM account_roles WHERE is_active = 1
            ''')
            accounts_with_roles = accounts_row['count'] if accounts_row else 0
            
            return {
                "success": True,
                "total": total,
                "byType": by_type,
                "accountsWithRoles": accounts_with_roles
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}


# Global instance
multi_role_manager: Optional[MultiRoleManager] = None


async def init_multi_role_manager(db, event_callback=None, log_callback=None) -> MultiRoleManager:
    """Initialize multi-role manager"""
    global multi_role_manager
    multi_role_manager = MultiRoleManager(
        db=db,
        event_callback=event_callback,
        log_callback=log_callback
    )
    await multi_role_manager.initialize()
    return multi_role_manager


def get_multi_role_manager() -> Optional[MultiRoleManager]:
    """Get multi-role manager instance"""
    return multi_role_manager
