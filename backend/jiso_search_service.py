"""
极搜 Bot 搜索服务 - Jiso Search Service
通过 Telegram Bot 搜索中文群组/频道

功能：
- 向极搜 Bot 发送搜索请求
- 监听并解析 Bot 回复
- 提取群组/频道信息
- 支持多种消息格式解析
- 速率控制和账号轮换
"""
import sys
import asyncio
import re
import time
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable, Tuple
from dataclasses import dataclass, field

from pyrogram import Client
from pyrogram.types import Message
from pyrogram.errors import (
    FloodWait, PeerIdInvalid, UsernameNotOccupied,
    UsernameInvalid, UserBannedInChannel
)
from pyrogram.raw import functions, types as raw_types


# ============ 搜索配置常量 ============
# 這些值可以根據需要調整，避免硬編碼分散在代碼各處

SEARCH_DEFAULT_LIMIT = 50           # 默認搜索結果數量
MESSAGE_COLLECT_LIMIT = 30          # Bot 消息收集數量（每次從 Bot 獲取的消息數）
DETAIL_FETCH_BATCH_SIZE = 30        # 詳情獲取批次大小（每次獲取多少個結果的詳情）
CHAT_HISTORY_LIMIT = 30             # 聊天歷史查詢限制
DETAIL_FETCH_DELAY = 0.3            # 詳情獲取間隔（秒），避免觸發 FloodWait


@dataclass
class JisoSearchResult:
    """极搜搜索结果"""
    title: str
    username: Optional[str] = None
    link: Optional[str] = None
    member_count: int = 0
    description: Optional[str] = None
    chat_type: str = "supergroup"  # group, supergroup, channel, bot
    source: str = "jiso"
    # 新增：用於獲取詳情的按鈕索引
    button_index: Optional[int] = None
    # 新增：是否已獲取詳情
    details_fetched: bool = False
    # 新增：語言
    language: Optional[str] = None
    # 新增：更新時間
    updated_at: Optional[str] = None
    # 🔧 P0: 真實 Telegram ID（從 API 獲取，可為 None）
    telegram_id: Optional[int] = None
    
    def to_dict(self) -> Dict[str, Any]:
        # 自動推斷類型（如果還是默認值）
        inferred_type = self._infer_chat_type()
        
        # 🔧 P0: 生成去重 key（僅用於內部去重，不顯示給用戶）
        dedup_key = None
        if self.username:
            dedup_key = f"@{self.username}"
        elif self.link:
            dedup_key = self.link
        else:
            dedup_key = f"title:{self.title}"
        
        # 🔧 P0: 真實 Telegram ID（可能為 None）
        real_telegram_id = self.telegram_id  # 從 API 獲取的真實 ID
        
        return {
            "dedup_key": dedup_key,             # 🔧 去重用（內部使用）
            "telegram_id": real_telegram_id,    # 🔧 真實 Telegram ID（可為 None）
            "title": self.title,
            "username": self.username,
            "link": self.link or (f"https://t.me/{self.username}" if self.username else None),
            "member_count": self.member_count,
            "description": self.description,
            "chat_type": inferred_type,
            "type": inferred_type,
            "source": self.source,
            "details_fetched": self.details_fetched,
            "language": self.language
        }
    
    def _infer_chat_type(self) -> str:
        """根據各種線索推斷資源類型 - 🆕 增強版
        
        重要：類型判斷應該優先使用 Telegram API 驗證結果
        這裡的推斷僅作為備選方案
        """
        # 如果已經有明確的類型（不是默認值），直接返回
        if self.chat_type and self.chat_type not in ["supergroup", "group"]:
            return self.chat_type
        
        title = self.title or ""
        title_lower = title.lower()
        username_lower = (self.username or "").lower()
        description_lower = (self.description or "").lower()
        link = self.link or ""
        
        # 🆕 從標題 emoji 判斷類型（Bot 返回的結果通常帶有這些 emoji）
        channel_emojis = ['📢', '📣', '📺', '🔊', '📡', '🎬', '📻']  # 頻道相關
        group_emojis = ['👥', '💬', '🏠', '🗣️', '👨‍👩‍👧‍👦', '👪']  # 群組相關
        
        for emoji in channel_emojis:
            if emoji in title:
                return "channel"
        
        for emoji in group_emojis:
            if emoji in title:
                return "supergroup"
        
        # 1. 從 username 判斷機器人（最可靠）
        if username_lower.endswith("_bot") or username_lower.endswith("bot"):
            return "bot"
        
        # 2. 機器人關鍵詞
        bot_keywords = ['機器人', '机器人', 'bot', '助手']
        for kw in bot_keywords:
            if kw in title_lower:
                return "bot"
        
        # 3. 頻道的強指標（只有明確是頻道時才標記）
        # 頻道通常有這些特徵：
        # - 標題明確包含"頻道"/"频道"/"channel"
        # - 描述中提到"訂閱"/"订阅"/"subscribe"
        channel_strong_keywords = ['頻道', '频道', 'channel', '廣播', '广播', '直播']
        channel_description_keywords = ['訂閱', '订阅', 'subscribe', 'subscribers']
        
        is_likely_channel = False
        for kw in channel_strong_keywords:
            if kw in title_lower:
                is_likely_channel = True
                break
        
        # 檢查描述
        for kw in channel_description_keywords:
            if kw in description_lower:
                is_likely_channel = True
                break
        
        if is_likely_channel:
            return "channel"
        
        # 4. 群組的強指標
        group_keywords = ['群', '群组', '群組', '聊天', 'chat', '交流', '討論', '讨论', '互動', '互动', 'group']
        for kw in group_keywords:
            if kw in title_lower:
                return "supergroup"
        
        # 5. 從鏈接判斷
        if '+' in link:
            # 私密邀請鏈接通常是群組
            return "supergroup"
        
        # 6. 不確定時默認為超級群組（更保守的選擇）
        # 因為：
        # - 大多數搜索結果是群組
        # - 頻道誤標為群組的影響較小（只是某些功能無法使用）
        # - 群組誤標為頻道的影響較大（功能被錯誤禁用）
        return "supergroup"


@dataclass
class JisoConfig:
    """极搜配置"""
    # 🆕 主力 Bot（並行搜索）- 2026-01 更新
    primary_bots: List[str] = field(default_factory=lambda: [
        "smss",                # 神馬搜索（中文搜索最佳，用戶名必須是 smss）
        "jisou",               # 極搜主號
        "jisou2",              # 極搜備份2
        "jisou3",              # 極搜備份3
    ])
    
    # 备用 Bot（主力都失败时才用）
    backup_bots: List[str] = field(default_factory=lambda: [
        "TGDBsearchbot_bot",   # TelegramDB（備選）
        "SearcheeBot",         # 搜索Bot（備選）
    ])
    
    # 用户自定义 Bot（从数据库加载）
    custom_bots: List[str] = field(default_factory=list)
    
    # 兼容旧代码
    @property
    def bot_usernames(self) -> List[str]:
        return self.primary_bots + self.backup_bots + self.custom_bots
    
    # 超时设置
    response_timeout: float = 30.0      # 等待回复超时（秒）
    collect_timeout: float = 4.0        # 收集多条消息超时（秒）
    
    # 速率限制
    min_search_interval: float = 10.0   # 最小搜索间隔（秒）
    max_searches_per_hour: int = 20     # 每小时最大搜索次数
    max_searches_per_day: int = 100     # 每日最大搜索次数
    
    # 重试设置
    max_retries: int = 2
    retry_delay: float = 5.0


class JisoSearchService:
    """极搜搜索服务"""
    
    def __init__(self, config: JisoConfig = None):
        self.config = config or JisoConfig()
        self.event_callback: Optional[Callable] = None
        self._clients: Dict[str, Client] = {}
        
        # 速率限制追踪
        self._last_search_time: Dict[str, float] = {}  # phone -> timestamp
        self._search_counts: Dict[str, List[float]] = {}  # phone -> [timestamps]
        
        # Bot 可用性缓存
        self._bot_availability: Dict[str, bool] = {}
        self._last_bot_check: Dict[str, float] = {}
        
        # 结果缓存
        self._result_cache: Dict[str, Tuple[List[JisoSearchResult], float]] = {}
        self._cache_ttl: float = 300.0  # 缓存5分钟
    
    def set_event_callback(self, callback: Callable):
        """设置事件回调"""
        self.event_callback = callback
    
    def set_clients(self, clients: Dict[str, Client]):
        """设置客户端"""
        self._clients = clients
    
    def log(self, message: str, level: str = "info"):
        """记录日志"""
        formatted = f"[JisoSearch] {message}"
        print(formatted, file=sys.stderr)
        if self.event_callback:
            self.event_callback("log-entry", {
                "message": formatted,
                "type": level
            })
    
    def emit_progress(self, status: str, message: str, data: Dict = None):
        """发送进度事件"""
        if self.event_callback:
            self.event_callback("jiso-search-progress", {
                "status": status,
                "message": message,
                **(data or {})
            })
    
    # ==================== 验证码处理 ====================
    
    def _is_search_result_message(self, message: Message) -> bool:
        """
        检测消息是否是搜索结果（非验证码）
        搜索结果特征：
        - 包含群组列表格式（成员数如 3.0k、25.9k）
        - 有翻页按钮（下一页、下一頁、➡、➜）
        - 包含多个群组名称
        """
        if not message:
            return False
        
        text = message.text or message.caption or ""
        text_lower = text.lower()
        
        # 特征1: 包含成员数格式（如 3.0k, 25.9k, 2.7k）
        member_count_pattern = r'\d+(?:\.\d+)?[kKmMwW万千]\s*(?:\n|$|人|成员|成員)'
        has_member_counts = len(re.findall(member_count_pattern, text)) >= 2
        
        # 特征2: 包含翻页按钮
        has_next_page_btn = False
        if message.reply_markup and hasattr(message.reply_markup, 'inline_keyboard'):
            for row in message.reply_markup.inline_keyboard:
                for btn in row:
                    btn_text = (btn.text or "").lower()
                    if any(kw in btn_text for kw in ['下一页', '下一頁', '➡', '➜', 'next', '下页']):
                        has_next_page_btn = True
                        break
        
        # 特征3: 包含群组列表格式（◇ 开头或数字序号）
        has_group_list = bool(re.search(r'[◇◆●○•]\s*.+?\s*\d+', text)) or \
                        bool(re.search(r'\d+[.、]\s*.+\s+\d+(?:\.\d+)?[kK]', text))
        
        # 特征4: 包含 Telegram 链接
        has_tg_links = 't.me/' in text or '@' in text
        
        # 如果满足2个以上特征，认为是搜索结果
        feature_count = sum([has_member_counts, has_next_page_btn, has_group_list, has_tg_links])
        
        if feature_count >= 2:
            self.log(f"  📋 识别为搜索结果消息 (特征数: {feature_count})")
            return True
        
        return False
    
    def _is_captcha_message(self, message: Message) -> bool:
        """
        检测消息是否是验证码请求
        更严格的检测逻辑：必须同时满足多个条件
        """
        if not message:
            return False
        
        # 🆕 首先检查是否是搜索结果 - 如果是搜索结果，绝对不是验证码
        if self._is_search_result_message(message):
            return False
        
        text = (message.text or message.caption or "").lower()
        
        # 真正的验证码特征：必须包含明确的验证码请求
        # 例如：「请输入验证码」「计算结果是多少」「请选择正确答案」
        captcha_request_patterns = [
            r'请输入.*(?:验证码|答案|结果)',
            r'(?:验证码|答案)[是为：:]\s*\?',
            r'计算.*[=＝].*\?',
            r'\d+\s*[+\-×÷*/]\s*\d+\s*[=＝]\s*\?',
            r'请选择.*(?:正确|答案)',
            r'人机验证',
            r'captcha',
            r'请点击.*(?:数字|按钮).*验证',
        ]
        
        has_captcha_request = False
        for pattern in captcha_request_patterns:
            if re.search(pattern, text):
                has_captcha_request = True
                break
        
        if not has_captcha_request:
            return False
        
        # 还需要有纯数字按钮（用于选择答案）
        if message.reply_markup and hasattr(message.reply_markup, 'inline_keyboard'):
            # 检查是否有纯数字按钮（排除翻页按钮）
            number_buttons = []
            for row in message.reply_markup.inline_keyboard:
                for btn in row:
                    btn_text = (btn.text or "").strip()
                    # 纯数字且不是翻页按钮
                    if btn_text.isdigit() and len(btn_text) <= 3:
                        number_buttons.append(btn_text)
            
            # 验证码通常有多个连续数字按钮作为答案选项
            if len(number_buttons) >= 3:
                self.log(f"检测到验证码消息: {text[:50]}... (数字按钮: {number_buttons[:5]})")
                return True
        
        return False
    
    def _solve_math_captcha(self, text: str) -> Optional[int]:
        """
        解析并计算简单数学验证码
        支持格式: "2+3=?", "10-5=?", "2*3=?", "6/2=?", "2/1=?"
        """
        if not text:
            return None
        
        # 提取数学表达式，支持多种格式
        patterns = [
            (r'(\d+)\s*[+＋]\s*(\d+)', lambda a, b: a + b),       # 加法: 2+3
            (r'(\d+)\s*[-−]\s*(\d+)', lambda a, b: a - b),        # 减法: 10-5
            (r'(\d+)\s*[*×xX]\s*(\d+)', lambda a, b: a * b),      # 乘法: 2*3, 2×3
            (r'(\d+)\s*[/÷]\s*(\d+)', lambda a, b: a // b if b != 0 else 0),  # 除法
        ]
        
        for pattern, op in patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    a = int(match.group(1))
                    b = int(match.group(2))
                    result = op(a, b)
                    self.log(f"识别数学验证码: {match.group(0)} = {result}")
                    return result
                except Exception as e:
                    self.log(f"计算验证码失败: {e}", "warning")
        
        return None
    
    def _extract_captcha_from_image_text(self, message: Message) -> Optional[str]:
        """
        尝试从消息的各个部分提取验证码公式
        注意：如果公式在图片中，无法提取
        """
        # 尝试所有可能包含公式的地方
        sources = [
            message.text,
            message.caption,
        ]
        
        # 合并所有文本
        all_text = " ".join(s for s in sources if s)
        
        if all_text:
            return all_text
        
        return None
    
    async def _handle_captcha(self, client: Client, message: Message) -> bool:
        """
        处理验证码消息
        返回 True 表示成功处理验证码
        """
        if not self._is_captcha_message(message):
            return False
        
        # 提取所有可能的文本
        text = self._extract_captcha_from_image_text(message) or ""
        self.log(f"验证码消息文本: {text[:100]}...")
        
        # 列出所有按钮供调试
        if message.reply_markup and hasattr(message.reply_markup, 'inline_keyboard'):
            buttons = []
            for row in message.reply_markup.inline_keyboard:
                for btn in row:
                    buttons.append(btn.text or "?")
            self.log(f"验证码按钮: {buttons}")
        
        answer = self._solve_math_captcha(text)
        
        if answer is None:
            # 验证码公式可能在图片中，无法自动解析
            self.log("⚠️ 验证码公式在图片中，无法自动解析。请手动在 Telegram 中完成一次验证后重试。", "warning")
            self.emit_progress("captcha_required", "检测到验证码，需要手动验证", {
                "bot": "jisou3",
                "message": "请在 Telegram 客户端中打开 @jisou3 并完成验证码验证，然后重新搜索"
            })
            return False
        
        # 在 inline keyboard 中查找答案按钮
        if not message.reply_markup or not hasattr(message.reply_markup, 'inline_keyboard'):
            self.log("验证码消息没有按钮", "warning")
            return False
        
        answer_str = str(answer)
        
        for row_idx, row in enumerate(message.reply_markup.inline_keyboard):
            for col_idx, button in enumerate(row):
                btn_text = (button.text or "").strip()
                if btn_text == answer_str:
                    self.log(f"找到验证码答案按钮: {answer_str}，点击位置 ({row_idx}, {col_idx})")
                    try:
                        await message.click(row_idx, col_idx)
                        await asyncio.sleep(2.5)  # 等待验证通过
                        self.log("验证码已自动解决 ✓")
                        return True
                    except Exception as e:
                        self.log(f"点击验证码按钮失败: {e}", "warning")
                        return False
        
        self.log(f"未找到答案 {answer_str} 对应的按钮", "warning")
        return False
    
    # ==================== 速率控制 ====================
    
    def _can_search(self, phone: str) -> Tuple[bool, str]:
        """检查是否可以搜索"""
        now = time.time()
        
        # 检查最小间隔
        last_time = self._last_search_time.get(phone, 0)
        if now - last_time < self.config.min_search_interval:
            wait_time = self.config.min_search_interval - (now - last_time)
            return False, f"请等待 {wait_time:.1f} 秒后再搜索"
        
        # 初始化计数器
        if phone not in self._search_counts:
            self._search_counts[phone] = []
        
        # 清理过期记录
        hour_ago = now - 3600
        day_ago = now - 86400
        self._search_counts[phone] = [t for t in self._search_counts[phone] if t > day_ago]
        
        # 检查小时限制
        hour_count = len([t for t in self._search_counts[phone] if t > hour_ago])
        if hour_count >= self.config.max_searches_per_hour:
            return False, f"每小时搜索次数已达上限 ({self.config.max_searches_per_hour}次)"
        
        # 检查日限制
        if len(self._search_counts[phone]) >= self.config.max_searches_per_day:
            return False, f"每日搜索次数已达上限 ({self.config.max_searches_per_day}次)"
        
        return True, ""
    
    def _record_search(self, phone: str):
        """记录搜索操作"""
        now = time.time()
        self._last_search_time[phone] = now
        if phone not in self._search_counts:
            self._search_counts[phone] = []
        self._search_counts[phone].append(now)
    
    # ==================== 缓存管理 ====================
    
    def _get_cached_results(self, keyword: str) -> Optional[List[JisoSearchResult]]:
        """获取缓存结果"""
        cache_key = keyword.lower().strip()
        if cache_key in self._result_cache:
            results, timestamp = self._result_cache[cache_key]
            if time.time() - timestamp < self._cache_ttl:
                self.log(f"使用缓存结果: '{keyword}' ({len(results)}个)")
                return results
            else:
                del self._result_cache[cache_key]
        return None
    
    def _cache_results(self, keyword: str, results: List[JisoSearchResult]):
        """缓存搜索结果"""
        cache_key = keyword.lower().strip()
        self._result_cache[cache_key] = (results, time.time())
    
    # ==================== Bot 管理 ====================
    
    async def _resolve_bot(self, client: Client, bot_username: str, force_check: bool = False) -> Optional[Any]:
        """解析 Bot 用户 - 🆕 使用底層 API 確保成功
        
        Args:
            client: Pyrogram 客戶端
            bot_username: Bot 用戶名
            force_check: 是否強制重新檢測（忽略緩存）
        """
        try:
            cache_key = f"{client.phone_number}_{bot_username}"
            now = time.time()
            
            # 🆕 強制檢測模式：跳過緩存
            if not force_check:
                # 检查缓存（縮短到 3 分鐘）
                if cache_key in self._bot_availability:
                    if now - self._last_bot_check.get(cache_key, 0) < 180:  # 3分钟缓存
                        if not self._bot_availability[cache_key]:
                            self.log(f"Bot @{bot_username} 緩存顯示不可用，跳過", "debug")
                            return None
            else:
                self.log(f"強制重新檢測 Bot @{bot_username}", "info")
            
            # 🆕 使用底層 API 解析 Bot（不依賴 Pyrogram 的內部緩存）
            try:
                resolved = await client.invoke(
                    functions.contacts.ResolveUsername(username=bot_username)
                )
                if resolved and resolved.users:
                    user = resolved.users[0]
                    peer = raw_types.InputPeerUser(
                        user_id=user.id,
                        access_hash=user.access_hash
                    )
                    self._bot_availability[cache_key] = True
                    self._last_bot_check[cache_key] = now
                    self.log(f"✅ Bot @{bot_username} 解析成功（底層 API）", "debug")
                    return peer
                else:
                    raise Exception("No users found")
            except Exception as raw_error:
                self.log(f"底層 API 解析 @{bot_username} 失敗: {raw_error}", "debug")
                # 嘗試自動激活
                activated = await self._auto_activate_bot(client, bot_username)
                if activated:
                    # 激活後再次嘗試底層 API
                    await asyncio.sleep(1.0)  # 等待激活生效
                    try:
                        resolved = await client.invoke(
                            functions.contacts.ResolveUsername(username=bot_username)
                        )
                        if resolved and resolved.users:
                            user = resolved.users[0]
                            peer = raw_types.InputPeerUser(
                                user_id=user.id,
                                access_hash=user.access_hash
                            )
                            self._bot_availability[cache_key] = True
                            self._last_bot_check[cache_key] = time.time()
                            self.log(f"✅ Bot @{bot_username} 激活後解析成功！", "success")
                            return peer
                    except Exception as retry_error:
                        self.log(f"激活後仍無法解析 @{bot_username}: {retry_error}", "warning")
            
            cache_key = f"{client.phone_number}_{bot_username}"
            self._bot_availability[cache_key] = False
            self._last_bot_check[cache_key] = time.time()
            return None
            
        except Exception as e:
            self.log(f"解析 Bot @{bot_username} 失败: {e}", "error")
            return None
    
    async def _auto_activate_bot(self, client: Client, bot_username: str) -> bool:
        """🆕 自動激活 Bot - 使用底層 API 發送 /start 建立聯繫"""
        try:
            self.log(f"🤖 自動激活 Bot @{bot_username}...")
            
            # 方法 1：使用底層 API 解析用戶名
            try:
                resolved = await client.invoke(
                    functions.contacts.ResolveUsername(username=bot_username)
                )
                
                if resolved and resolved.users:
                    user = resolved.users[0]
                    peer = raw_types.InputPeerUser(
                        user_id=user.id,
                        access_hash=user.access_hash
                    )
                    
                    # 發送 /start 消息
                    await client.invoke(
                        functions.messages.SendMessage(
                            peer=peer,
                            message="/start",
                            random_id=random.randint(1, 2**63 - 1)
                        )
                    )
                    await asyncio.sleep(2.0)  # 等待 Bot 響應
                    self.log(f"✅ 已向 @{bot_username} 發送 /start（底層 API）", "success")
                    return True
                else:
                    self.log(f"❌ @{bot_username} 解析失敗：用戶不存在", "warning")
                    return False
                    
            except Exception as resolve_error:
                self.log(f"底層 API 失敗: {resolve_error}，嘗試備用方法...", "debug")
                
                # 方法 2：嘗試通過搜索找到 Bot
                try:
                    async for dialog in client.get_dialogs():
                        if dialog.chat and dialog.chat.username:
                            if dialog.chat.username.lower() == bot_username.lower():
                                await client.send_message(dialog.chat.id, "/start")
                                await asyncio.sleep(2.0)
                                self.log(f"✅ 通過對話列表找到 @{bot_username}", "success")
                                return True
                except Exception as dialog_error:
                    self.log(f"對話列表搜索失敗: {dialog_error}", "debug")
                
                return False
                
        except Exception as e:
            self.log(f"❌ 激活 @{bot_username} 失敗: {e}", "warning")
            return False
    
    async def initialize_search_bots(self, client: Client) -> Dict[str, bool]:
        """🆕 初始化所有搜索 Bot（帳號登錄後自動調用）"""
        results = {}
        bots_to_init = ["smss", "jisou3"]  # 主要的中文搜索 Bot
        
        self.log("🚀 開始初始化搜索 Bot...", "info")
        
        for bot_username in bots_to_init:
            try:
                # 先嘗試解析
                peer = await client.resolve_peer(bot_username)
                results[bot_username] = True
                self.log(f"  ✅ @{bot_username} 已就緒", "success")
            except:
                # 解析失敗，嘗試激活
                activated = await self._auto_activate_bot(client, bot_username)
                results[bot_username] = activated
                if activated:
                    self.log(f"  ✅ @{bot_username} 已激活", "success")
                else:
                    self.log(f"  ⚠️ @{bot_username} 激活失敗", "warning")
        
        self.log(f"🏁 Bot 初始化完成: {sum(results.values())}/{len(results)} 個成功", "info")
        return results
    
    def clear_bot_cache(self):
        """🆕 清除所有 Bot 可用性緩存"""
        self._bot_availability.clear()
        self._last_bot_check.clear()
        self.log("🧹 已清除所有 Bot 可用性緩存", "info")
    
    async def _get_available_bot(self, client: Client) -> Optional[str]:
        """获取可用的 Bot"""
        for bot_username in self.config.bot_usernames:
            peer = await self._resolve_bot(client, bot_username)
            if peer:
                return bot_username
        return None
    
    async def _ensure_bot_started(self, client: Client, bot_username: str):
        """确保 Bot 已启动（每次都发送 /start）"""
        try:
            self.log(f"向 @{bot_username} 发送 /start 确保Bot激活...")
            await client.send_message(bot_username, "/start")
            await asyncio.sleep(3.0)  # 等待 Bot 响应
            self.log(f"@{bot_username} 已激活")
        except Exception as e:
            self.log(f"启动 Bot 失败: {e}", "warning")
    
    # ==================== 消息解析 ====================
    
    def _parse_member_count(self, text: str) -> int:
        """解析成员数量 - 🆕 支持 620.4k 格式"""
        if not text:
            return 0
        
        text = text.strip().lower()
        
        # 🆕 優化：支持更多格式如 "620.4k", "1.3m", "13.3k" 等
        match = re.search(r'([\d,.]+)\s*([kmw万千百億亿])?', text)
        if not match:
            return 0
        
        num_str = match.group(1).replace(',', '').replace('.', '')
        try:
            num = float(match.group(1).replace(',', ''))
        except:
            return 0
        
        # 处理单位
        unit = match.group(2)
        if unit in ['k', '千']:
            num *= 1000
        elif unit in ['w', '万']:
            num *= 10000
        elif unit == 'm':
            num *= 1000000
        
        return int(num)
    
    def _extract_username(self, text: str) -> Optional[str]:
        """从文本中提取用户名"""
        if not text:
            return None
        
        # 🔑 搜索機器人的 username 列表（需要排除）
        search_bot_usernames = [
            'smss', 'jisou', 'jisou2', 'jisou3', 'jiso', 
            'woaiso', 'woaiso2', 'woaisou', 'qunxian', 'cnyes',
            'chengzibot', 'shenmaso', 'telebotso', 'sousuo',
            'qunzu', 'qunzubot', 'qunzuobot'
        ]
        
        # 🔑 檢查是否為消息鏈接格式（t.me/username/messageId）
        # 消息鏈接中的 username 通常是 bot 或頻道，不是群組
        message_link_match = re.search(r't\.me/([a-zA-Z][a-zA-Z0-9_]{3,})/\d+', text)
        if message_link_match:
            # 這是消息鏈接，不提取 username
            return None

        # 从 URL 提取: t.me/username 或 https://t.me/username
        # 注意：排除邀請鏈接（+開頭）和 joinchat
        url_match = re.search(r't\.me/([a-zA-Z][a-zA-Z0-9_]{3,})(?:\?|$)', text)
        if url_match:
            username = url_match.group(1)
            # 排除 joinchat 鏈接
            if username.lower() == 'joinchat':
                return None
            # 🔑 排除搜索機器人 username
            if username.lower() in search_bot_usernames or username.lower().endswith('bot'):
                return None
            return username

        # 从 @ 提取: @username
        at_match = re.search(r'@([a-zA-Z][a-zA-Z0-9_]{3,})', text)
        if at_match:
            username = at_match.group(1)
            # 🔑 排除搜索機器人 username
            if username.lower() in search_bot_usernames or username.lower().endswith('bot'):
                return None
            return username

        # 纯用户名（以字母开头，至少4个字符）
        if re.match(r'^[a-zA-Z][a-zA-Z0-9_]{3,}$', text):
            # 🔑 排除搜索機器人 username
            if text.lower() in search_bot_usernames or text.lower().endswith('bot'):
                return None
            return text

        return None
    
    def _extract_invite_link(self, text: str) -> Optional[str]:
        """從文本中提取邀請鏈接"""
        if not text:
            return None
        
        # 匹配邀請鏈接格式：t.me/+xxx 或 t.me/joinchat/xxx
        invite_match = re.search(r'(https?://)?t\.me/(\+[a-zA-Z0-9_-]+|joinchat/[a-zA-Z0-9_-]+)', text)
        if invite_match:
            full_match = invite_match.group(0)
            if not full_match.startswith('http'):
                return f"https://{full_match}"
            return full_match
        
        return None
    
    def _is_ad_line(self, line: str) -> bool:
        """
        检测是否是广告行（只过滤明确标记的广告）
        
        🆕 優化：保守過濾，只過濾明確的廣告行
        """
        if not line:
            return False
        
        line_stripped = line.strip()
        line_lower = line_stripped.lower()
        
        # 🆕 首先检查是否包含搜索结果特征（成员数）- 不过滤
        if re.search(r'\d+(?:\.\d+)?[kKmMwW万千]', line):
            return False
        
        # 🆕 如果以 ◇◆● 开头，是搜索结果行，不过滤
        if line_stripped and line_stripped[0] in '◇◆●○•':
            return False
        
        # 🆕 如果是数字序号开头（如 1. 2. 3.），是搜索结果，不过滤
        if re.match(r'^\d+[.、]\s*', line_stripped):
            return False
        
        # 只过滤明确标记为"广告"的行（通常是 Bot 自己插入的推广）
        explicit_ad_starts = [
            "广告", "廣告", "广告:", "广告：", 
            "赞助商", "贊助商", "赞助:", "贊助：",
            "推广", "推廣",
        ]
        
        for prefix in explicit_ad_starts:
            if line_lower.startswith(prefix):
                return True
        
        return False
    
    def _filter_ad_lines(self, text: str) -> str:
        """过滤广告行，保留有效内容"""
        if not text:
            return text
        
        lines = text.split('\n')
        filtered = []
        
        for line in lines:
            if not self._is_ad_line(line):
                filtered.append(line)
        
        return '\n'.join(filtered)
    
    def _parse_tgdb_message(self, text: str) -> List[JisoSearchResult]:
        """
        解析 TelegramDB Bot (@tgdb_bot) 的消息格式
        
        TelegramDB 格式示例：
        🔹 @username - Group/Channel Title
        👥 12,345 members | 📢 Channel
        
        或:
        1. @username (12345 members)
           Title of the group
        """
        results = []
        if not text:
            return results
        
        # 格式1: 帶 emoji 的格式
        # 🔹 @username - Title
        # 👥 12,345 members
        pattern1 = r'[🔹📌]\s*@(\w+)\s*[-–]\s*(.+?)(?:\n.*?(\d[\d,]*)\s*members?)?'
        for match in re.finditer(pattern1, text, re.IGNORECASE):
            username = match.group(1)
            title = match.group(2).strip()
            member_str = match.group(3) if match.group(3) else "0"
            member_count = int(member_str.replace(',', '')) if member_str else 0
            
            results.append(JisoSearchResult(
                title=title or username,
                username=username,
                link=f"https://t.me/{username}",
                member_count=member_count,
                source="tgdb",
                details_fetched=True  # TelegramDB 返回的都是真實鏈接
            ))
        
        # 格式2: 數字序號格式
        # 1. @username (12345 members)
        pattern2 = r'(\d+)[.、)]\s*@(\w+)\s*[（(]?([\d,]+)\s*members?[）)]?(?:\s*[-–]\s*(.+?))?(?:\n|$)'
        for match in re.finditer(pattern2, text, re.IGNORECASE):
            username = match.group(2)
            member_str = match.group(3).replace(',', '')
            member_count = int(member_str) if member_str else 0
            title = match.group(4).strip() if match.group(4) else username
            
            if not any(r.username == username for r in results):
                results.append(JisoSearchResult(
                    title=title,
                    username=username,
                    link=f"https://t.me/{username}",
                    member_count=member_count,
                    source="tgdb",
                    details_fetched=True
                ))
        
        # 格式3: 簡單的 @username 列表
        # @group1 @group2 @group3
        simple_pattern = r'@(\w{5,})'  # 至少5個字符的用戶名
        for match in re.finditer(simple_pattern, text):
            username = match.group(1)
            # 過濾常見的非群組用戶名
            if username.lower() in ['tgdb_bot', 'tgdb', 'tgdatabase', 'bot', 'help', 'admin']:
                continue
            if not any(r.username == username for r in results):
                results.append(JisoSearchResult(
                    title=username,
                    username=username,
                    link=f"https://t.me/{username}",
                    member_count=0,
                    source="tgdb",
                    details_fetched=True
                ))
        
        return results
    
    def _parse_text_message(self, text: str) -> List[JisoSearchResult]:
        """解析文本消息"""
        results = []
        
        if not text:
            return results
        
        # 先嘗試 TelegramDB 格式
        tgdb_results = self._parse_tgdb_message(text)
        if tgdb_results:
            return tgdb_results
        
        # 🆕 先过滤纯广告行（但保留可能是搜索结果的行）
        text = self._filter_ad_lines(text)
        
        # 🆕 格式0 (最優先): 神马搜索/极搜 2026 新格式 - ◇ 開頭
        # 例如: ◇ USDT搬砖 日入8000 + 免费加代理 轻轻...
        # 例如: ◇ 中華娱乐◇体育◇真人◇电子◇棋牌◇彩票◇捕... 25.9k
        # 例如: ◇ usdt交流群 3.0k
        # 例如: ◇ usdt 💰 承兑换汇usdt 💰 兑换线下担保交易所 2.7k
        diamond_pattern = r'[◇◆●○]\s*(.+?)(?:\s+(\d+(?:\.\d+)?[kKmMwW万千]?))?(?:\s*\n|$)'
        for match in re.finditer(diamond_pattern, text):
            title = match.group(1).strip()
            member_str = match.group(2) if match.group(2) else ""
            
            # 清理标题：移除末尾的省略号和多余字符
            title = re.sub(r'\.{2,}$', '', title).strip()
            title = re.sub(r'…+$', '', title).strip()
            
            # 🆕 从标题中提取成员数（如果标题末尾有数字k）
            if not member_str:
                tail_match = re.search(r'\s+(\d+(?:\.\d+)?[kKmMwW万千]?)$', title)
                if tail_match:
                    member_str = tail_match.group(1)
                    title = title[:tail_match.start()].strip()
            
            # 提取 @username（如果标题中有）
            username = self._extract_username(title)
            
            if title and len(title) > 2 and not any(r.title == title for r in results):
                results.append(JisoSearchResult(
                    title=title,
                    member_count=self._parse_member_count(member_str) if member_str else 0,
                    username=username
                ))
                self.log(f"  📋 解析到◇格式結果: {title[:30]}... ({member_str or '未知'}人)", "debug")
        
        # 如果 ◇ 格式已经解析到结果，可能就是主要格式，直接返回
        if len(results) >= 3:
            self.log(f"  ◇格式解析到 {len(results)} 個結果")
            return results
        
        # 极搜格式（最重要）: emoji + 群组名 + 空格 + 数字k
        # 例如: 🔥 广州仙女宣 61k
        # 例如: 👄爱心聊【官方频道】3k
        # 例如: 🚗 西安老司机 24k
        jisou_pattern = r'[🔥👄🚗💋🎰🔞💰🎲🎮💎🌟⭐🔹📌🔸▪️•🎯💫🌈🍑🍆💦🔴🟢🟡🔵⚡✨🎁🎊🎉💝💗💕❤️🧡💛💚💙💜🖤🤍🏆👑💯🎭🎪🎢🌸🌺🌻🌼🌷🍀]\s*(.+?)\s+(\d+(?:\.\d+)?[kKmMwW万千]?)\s*(?:\n|$)'
        
        for match in re.finditer(jisou_pattern, text):
            title = match.group(1).strip()
            member_str = match.group(2)
            if title and len(title) > 1 and not any(r.title == title for r in results):
                results.append(JisoSearchResult(
                    title=title,
                    member_count=self._parse_member_count(member_str),
                    username=self._extract_username(title)
                ))
        
        # 极搜格式2: 每行一个群组，末尾带数字k（无emoji前缀）
        # 例如: 广州仙女宣 61k
        line_with_count = r'^([^\n🔥👄🚗💋🎰🔞💰🎲🎮💎🌟⭐🔹📌].+?)\s+(\d+(?:\.\d+)?[kKmMwW万千]?)\s*$'
        for line in text.split('\n'):
            line = line.strip()
            if not line:
                continue
            match = re.match(r'(.+?)\s+(\d+(?:\.\d+)?[kKmMwW万千])$', line)
            if match:
                title = match.group(1).strip()
                # 移除开头的emoji
                title = re.sub(r'^[\U0001F300-\U0001F9FF\U00002600-\U000027BF]+\s*', '', title)
                if title and len(title) > 2 and not any(r.title == title for r in results):
                    results.append(JisoSearchResult(
                        title=title,
                        member_count=self._parse_member_count(match.group(2)),
                        username=self._extract_username(title)
                    ))
        
        # 格式1: 带emoji的块格式
        # 🔹 群组名称
        # 📊 成员: 12345
        # 🔗 t.me/groupname
        block_pattern = r'[🔹📌🔸▪️•]\s*(.+?)(?:\n|$)(?:.*?(?:成员|人数|成員|人數|members?)[：:]\s*([\d,.]+[kKmMwW万千]?))?(?:.*?(t\.me/\w+|@\w+))?'
        
        for match in re.finditer(block_pattern, text, re.IGNORECASE | re.DOTALL):
            title = match.group(1).strip()
            if title and len(title) > 1 and not any(r.title == title for r in results):
                result = JisoSearchResult(
                    title=title,
                    member_count=self._parse_member_count(match.group(2)) if match.group(2) else 0,
                    username=self._extract_username(match.group(3)) if match.group(3) else None
                )
                results.append(result)
        
        # 格式2: @username 群名 (人数)
        simple_pattern = r'@(\w+)\s+(.+?)\s*[（(]([\d,.]+[kKmMwW万千]?)[人）)]'
        for match in re.finditer(simple_pattern, text):
            if not any(r.username == match.group(1) for r in results):
                results.append(JisoSearchResult(
                    username=match.group(1),
                    title=match.group(2).strip(),
                    member_count=self._parse_member_count(match.group(3))
                ))
        
        # 格式3: 纯链接列表
        link_pattern = r'https?://t\.me/(\w+)'
        for match in re.finditer(link_pattern, text):
            username = match.group(1)
            # 避免重复
            if not any(r.username == username for r in results):
                results.append(JisoSearchResult(
                    username=username,
                    title=username,
                    link=match.group(0)
                ))
        
        # 格式4: 带数字序号的列表（通用）
        # 1. 群组名称 @username (12345人)
        numbered_pattern = r'\d+[.、)]\s*(.+?)\s*(?:@(\w+))?\s*[（(]?([\d,.]+[kKmMwW万千]?)[人）)]?'
        for match in re.finditer(numbered_pattern, text):
            title = match.group(1).strip()
            if title and len(title) > 1 and not any(r.title == title for r in results):
                results.append(JisoSearchResult(
                    title=title,
                    username=match.group(2),
                    member_count=self._parse_member_count(match.group(3)) if match.group(3) else 0
                ))
        
        # 🆕 格式5: 神马搜索新格式 - 2026-01 更新
        # 例如: 1. 🏠 [0:53] 柬埔寨租房金边租房
        # 例如: 2. 📁 学会租房看过来租房手册指南帮助小白掌...
        # 例如: 7. 🏠 [0:40] 以租房为由带你投资理财的就是诈骗租房...
        smss_new_pattern = r'^(\d+)[.、]\s*([^\w\s])\s*(?:\[[\d:]+\]\s*)?(.+?)(?:\s*\.{2,})?$'
        for line in text.split('\n'):
            line = line.strip()
            if not line:
                continue
            match = re.match(smss_new_pattern, line)
            if match:
                emoji = match.group(2)
                title = match.group(3).strip()
                # 移除末尾的省略号
                title = re.sub(r'\.{2,}$', '', title).strip()
                
                if title and len(title) > 2 and not any(r.title == title for r in results):
                    results.append(JisoSearchResult(
                        title=title,
                        member_count=0,  # 神馬搜索新格式不顯示成員數
                        username=self._extract_username(title)
                    ))
                    self.log(f"  📋 解析到神馬結果: {title}", "debug")
        
        # 舊格式備用: 数字. emoji 标题 数字k
        # 例如: 2.💗 丘比特【婚恋交友】 火种巴豆 大黄蜂 F... 14.7k
        smss_old_pattern = r'(\d+)[.、]\s*[^\w\s]?\s*(.+?)\s+(\d+(?:\.\d+)?[kKmMwW万千])\s*$'
        for line in text.split('\n'):
            line = line.strip()
            if not line:
                continue
            match = re.match(smss_old_pattern, line)
            if match:
                title = match.group(2).strip()
                # 移除开头的emoji
                title = re.sub(r'^[\U0001F300-\U0001F9FF\U00002600-\U000027BF\u2600-\u27BF]+\s*', '', title)
                # 移除末尾的省略号
                title = re.sub(r'\.{2,}$', '', title).strip()
                member_count = self._parse_member_count(match.group(3))
                
                if title and len(title) > 2 and not any(r.title == title for r in results):
                    results.append(JisoSearchResult(
                        title=title,
                        member_count=member_count,
                        username=self._extract_username(title)
                    ))
        
        return results
    
    def _parse_inline_buttons(self, message: Message) -> List[JisoSearchResult]:
        """解析内联按钮"""
        results = []
        
        if not message.reply_markup:
            return results
        
        # 处理 InlineKeyboardMarkup
        if hasattr(message.reply_markup, 'inline_keyboard'):
            for row in message.reply_markup.inline_keyboard:
                for button in row:
                    if button.url:
                        username = self._extract_username(button.url)
                        if username:
                            # 尝试从按钮文本解析成员数
                            member_count = 0
                            text = button.text or ""
                            member_match = re.search(r'[（(]([\d,.]+[kKmMwW万千]?)[人）)]', text)
                            if member_match:
                                member_count = self._parse_member_count(member_match.group(1))
                                title = re.sub(r'\s*[（(][\d,.]+[kKmMwW万千]?[人）)]', '', text).strip()
                            else:
                                title = text
                            
                            results.append(JisoSearchResult(
                                title=title or username,
                                username=username,
                                link=button.url,
                                member_count=member_count
                            ))
        
        return results
    
    def _parse_message(self, message: Message) -> List[JisoSearchResult]:
        """解析单条消息"""
        results = []
        
        # 🆕 記錄消息基本信息
        text = message.text or message.caption or ""
        text_preview = text[:100].replace('\n', ' ') if text else "(空消息)"
        self.log(f"  🔍 開始解析消息#{message.id}: {text_preview}...")
        
        # 方法1: 優先解析消息實體（TextLink）
        entity_results = self._parse_message_entities(message)
        if entity_results:
            self.log(f"  ✅ 從消息實體中提取到 {len(entity_results)} 個帶鏈接的結果")
            results.extend(entity_results)
        
        # 方法2: 嘗試 HTML 解析（備選）
        if not entity_results:
            html_results = self._parse_html_links(message)
            if html_results:
                self.log(f"  ✅ 從 HTML 中提取到 {len(html_results)} 個帶鏈接的結果")
                results.extend(html_results)
        
        # 方法3: 解析純文本内容（作為補充）
        if text:
            text_results = self._parse_text_message(text)
            if text_results:
                self.log(f"  ✅ 從純文本中提取到 {len(text_results)} 個結果")
                # 只添加之前沒有的結果
                existing_titles = {r.title for r in results}
                added_count = 0
                for r in text_results:
                    if r.title not in existing_titles:
                        results.append(r)
                        added_count += 1
                if added_count > 0:
                    self.log(f"    新增 {added_count} 個不重複的結果")
        
        # 方法4: 解析内联按钮中的 URL
        button_results = self._parse_inline_buttons(message)
        if button_results:
            existing_usernames = {r.username for r in results if r.username}
            added_count = 0
            for r in button_results:
                if r.username and r.username not in existing_usernames:
                    results.append(r)
                    added_count += 1
            if added_count > 0:
                self.log(f"  ✅ 從按鈕中提取到 {added_count} 個新結果")
        
        # 🆕 總結解析結果
        if results:
            self.log(f"  📊 消息#{message.id} 共解析到 {len(results)} 個結果")
        else:
            self.log(f"  ⚠️ 消息#{message.id} 未解析到任何結果")
        
        return results
    
    def _utf16_slice(self, text: str, offset: int, length: int) -> str:
        """
        使用 UTF-16 偏移量從文本中提取子字串
        
        Telegram 的 entity offset/length 使用 UTF-16 code units
        Python 字串使用 Unicode code points
        Emoji 和某些字符在 UTF-16 中是 2 個 code units (surrogate pair)
        但在 Python 中是 1 個 code point
        
        此函數正確處理這種差異
        """
        try:
            # 編碼為 UTF-16-LE (每個 code unit = 2 bytes)
            encoded = text.encode('utf-16-le')
            # 計算 byte 偏移量 (code unit * 2)
            byte_start = offset * 2
            byte_end = (offset + length) * 2
            # 確保不越界
            if byte_start < 0 or byte_end > len(encoded):
                # 回退到簡單索引
                return text[offset:offset+length] if offset < len(text) else ""
            # 提取 bytes 並解碼回字串
            return encoded[byte_start:byte_end].decode('utf-16-le')
        except Exception:
            # 如果出錯，回退到簡單索引（可能不準確但不會崩潰）
            try:
                return text[offset:offset+length] if offset < len(text) else ""
            except:
                return ""
    
    def _parse_message_entities(self, message: Message) -> List[JisoSearchResult]:
        """
        解析消息實體，提取隱藏在文本中的鏈接
        
        神馬搜索的群組名稱是 TextLink 類型的實體，包含隱藏的 t.me URL
        
        重要：Telegram 的 entity offset/length 使用 UTF-16 code units
        """
        results = []
        text = message.text or message.caption or ""
        entities = message.entities or message.caption_entities or []
        
        if not text or not entities:
            return results
        
        # 調試：打印所有實體信息（使用 UTF-16 安全的方式）
        entity_info = []
        for e in entities:
            try:
                etype = str(e.type) if hasattr(e, 'type') else str(type(e))
                url = getattr(e, 'url', None)
                offset = getattr(e, 'offset', 0)
                length = getattr(e, 'length', 0)
                # 使用 UTF-16 安全的切片
                snippet = self._utf16_slice(text, offset, min(length, 20))
                if url or 'link' in etype.lower():
                    entity_info.append(f"{etype}({snippet}... → {url})")
            except:
                pass
        if entity_info:
            self.log(f"  鏈接實體: {entity_info[:5]}")  # 只顯示前5個
        
        for entity in entities:
            # 獲取實體類型（兼容不同版本的 Pyrogram）
            try:
                entity_type = str(entity.type).lower()
            except:
                entity_type = ""
            
            # 檢查是否是 TextLink 類型（隱藏 URL 的文本）
            is_text_link = "text_link" in entity_type or hasattr(entity, 'url')
            
            if is_text_link and getattr(entity, 'url', None):
                url = entity.url
                
                # 只處理 Telegram 鏈接
                if 't.me/' not in url:
                    continue
                
                # 提取對應的文本（使用 UTF-16 安全的切片）
                try:
                    offset = entity.offset
                    length = entity.length
                    link_text = self._utf16_slice(text, offset, length)
                    if not link_text:
                        continue
                except Exception as e:
                    self.log(f"  提取實體文本失敗: {e}", "warning")
                    continue
                
                # 過濾廣告和非群組鏈接
                if self._is_ad_text(link_text):
                    continue
                
                # 從 URL 中提取 username
                username = self._extract_username(url)
                
                # 🆕 優化：從多個位置提取成員數
                member_count = 0
                chat_type = "supergroup"  # 默認類型
                
                # 方法1：查找鏈接文本後面的成員數（如 "群名 1.3k"）
                context_after = self._utf16_slice(text, offset + length, 30)
                member_match = re.search(r'[\s\.·]*(\d+(?:\.\d+)?[kKmMwW万千]?)(?:\s*人)?', context_after)
                if member_match:
                    member_count = self._parse_member_count(member_match.group(1))
                
                # 方法2：從鏈接文本本身提取成員數（如 "求職招聘 620.4k"）
                if member_count == 0:
                    in_text_match = re.search(r'(\d+(?:\.\d+)?[kKmMwW万千]?)(?:\s*人)?$', link_text.strip())
                    if in_text_match:
                        member_count = self._parse_member_count(in_text_match.group(1))
                
                # 方法3：查找鏈接文本前面的成員數（有些 Bot 格式是 "620.4k 群名"）
                if member_count == 0 and offset > 10:
                    context_before = self._utf16_slice(text, max(0, offset - 15), 15)
                    before_match = re.search(r'(\d+(?:\.\d+)?[kKmMwW万千]?)\s*$', context_before)
                    if before_match:
                        member_count = self._parse_member_count(before_match.group(1))
                
                # 🆕 識別類型：從 emoji 和關鍵詞判斷
                if any(emoji in link_text for emoji in ['📢', '📣', '📺', '🔊']):
                    chat_type = "channel"
                elif any(kw in link_text.lower() for kw in ['頻道', '频道', 'channel']):
                    chat_type = "channel"
                elif any(emoji in link_text for emoji in ['👥', '💬', '🏠', '🗣️']):
                    chat_type = "supergroup"
                
                # 清理標題
                title = link_text.strip()
                # 移除開頭的數字和標點
                title = re.sub(r'^\d+[.、)\s]*', '', title)
                # 移除開頭的 emoji
                title = re.sub(r'^[\U0001F300-\U0001F9FF\U00002600-\U000027BF]+\s*', '', title)
                # 移除末尾的成員數（如 "群名 620.4k" → "群名"）
                title = re.sub(r'\s+\d+(?:\.\d+)?[kKmMwW万千]?(?:\s*人)?$', '', title)
                title = title.strip()
                
                if title and len(title) > 1:
                    result = JisoSearchResult(
                        title=title,
                        username=username,
                        link=url,
                        member_count=member_count,
                        chat_type=chat_type,
                        details_fetched=True  # 已經有真實鏈接了
                    )
                    results.append(result)
                    type_label = "📢頻道" if chat_type == "channel" else "👥群組"
                    self.log(f"    ✓ TextLink: {title[:30]}... ({member_count}人 {type_label}) → {url}")
        
        return results
    
    def _is_ad_text(self, text: str) -> bool:
        """
        檢查是否是純廣告文本（不應過濾正常群組名）
        
        🆕 優化：只過濾 Bot 自己插入的廣告行，不過濾群組名中的關鍵詞
        例如「体育交流群」不應被過濾，但「广告 点击购买」應被過濾
        """
        if not text:
            return True
        
        text_lower = text.lower().strip()
        
        # 🆕 首先检查是否是搜索结果格式 - 如果有成员数，就不是广告
        if re.search(r'\d+(?:\.\d+)?[kKmMwW万千]\s*$', text):
            return False
        
        # 🆕 如果包含 @username 或 t.me 链接，可能是群组，不过滤
        if '@' in text or 't.me/' in text:
            return False
        
        # 只過濾明確的廣告標記（通常是 Bot 插入的推廣行）
        explicit_ad_patterns = [
            r'^广告[：:\s]',           # 以"广告"开头
            r'^廣告[：:\s]',           # 以"廣告"开头
            r'^赞助商[：:\s]',         # 以"赞助商"开头
            r'^贊助商[：:\s]',         # 以"贊助商"开头
            r'点击购买广告',           # 购买广告链接
            r'購買廣告',
            r'神马搜索\s*绑定',        # Bot 内部功能
            r'极搜\s*绑定',
        ]
        
        for pattern in explicit_ad_patterns:
            if re.search(pattern, text_lower):
                return True
        
        return False
    
    def _parse_html_links(self, message: Message) -> List[JisoSearchResult]:
        """
        從消息的 HTML 格式中提取鏈接（備選方案）
        
        Telegram 消息可能使用 HTML 格式: <a href="https://t.me/xxx">群組名</a>
        """
        results = []
        
        # 嘗試獲取 HTML 格式的消息
        html_text = None
        try:
            # Pyrogram 2.x 的方式
            if hasattr(message, 'text') and message.text:
                # 使用 entities 重建 HTML
                html_text = self._build_html_from_entities(message.text, message.entities or [])
        except:
            pass
        
        if not html_text:
            return results
        
        # 從 HTML 中提取 <a href="...">...</a>
        pattern = r'<a\s+href=["\']?(https?://t\.me/[^"\'>\s]+)["\']?[^>]*>([^<]+)</a>'
        for match in re.finditer(pattern, html_text, re.IGNORECASE):
            url = match.group(1)
            text = match.group(2).strip()
            
            if not url or not text:
                continue
            
            if self._is_ad_text(text):
                continue
            
            username = self._extract_username(url)
            
            results.append(JisoSearchResult(
                title=text,
                username=username,
                link=url,
                member_count=0,
                details_fetched=True
            ))
            self.log(f"    ✓ HTML Link: {text[:30]}... → {url}")
        
        return results
    
    def _build_html_from_entities(self, text: str, entities: list) -> str:
        """
        從實體構建 HTML 字符串
        
        重要：使用 UTF-16 安全的切片方式處理 Telegram 實體偏移量
        """
        if not entities:
            return text
        
        # 按 offset 排序
        sorted_entities = sorted(entities, key=lambda e: getattr(e, 'offset', 0))
        
        try:
            # 編碼為 UTF-16-LE 進行處理
            encoded = text.encode('utf-16-le')
            result_parts = []
            last_byte_end = 0
            
            for entity in sorted_entities:
                offset = getattr(entity, 'offset', 0)
                length = getattr(entity, 'length', 0)
                url = getattr(entity, 'url', None)
                
                if not url:
                    continue
                
                byte_offset = offset * 2
                byte_length = length * 2
                byte_end = byte_offset + byte_length
                
                # 添加實體前的文本
                if byte_offset > last_byte_end:
                    before_text = encoded[last_byte_end:byte_offset].decode('utf-16-le', errors='replace')
                    result_parts.append(before_text)
                
                # 添加帶鏈接的文本
                entity_bytes = encoded[byte_offset:byte_end]
                entity_text = entity_bytes.decode('utf-16-le', errors='replace')
                result_parts.append(f'<a href="{url}">{entity_text}</a>')
                
                last_byte_end = byte_end
            
            # 添加剩餘文本
            if last_byte_end < len(encoded):
                remaining = encoded[last_byte_end:].decode('utf-16-le', errors='replace')
                result_parts.append(remaining)
            
            return ''.join(result_parts)
            
        except Exception as e:
            # 如果 UTF-16 處理失敗，回退到簡單的字串索引（可能不準確）
            self.log(f"  _build_html_from_entities 回退模式: {e}", "warning")
            result = []
            last_end = 0
            
            for entity in sorted_entities:
                offset = getattr(entity, 'offset', 0)
                length = getattr(entity, 'length', 0)
                url = getattr(entity, 'url', None)
                
                if not url:
                    continue
                
                try:
                    if offset > last_end:
                        result.append(text[last_end:offset])
                    entity_text = text[offset:offset+length]
                    result.append(f'<a href="{url}">{entity_text}</a>')
                    last_end = offset + length
                except:
                    continue
            
            if last_end < len(text):
                result.append(text[last_end:])
            
            return ''.join(result)
    
    # ==================== 詳情獲取（新增） ====================
    
    def _parse_detail_message(self, text: str) -> Dict[str, Any]:
        """
        解析詳情消息，提取真實鏈接和描述
        
        詳情格式示例：
        丘比特【婚恋交友】 火种巴豆 大黄蜂 FB ... 
        👉 https://t.me/IISSA19
        类型: 【📢 频道】
        语言: *
        人数: 14,687
        更新时间: 2026-01-14 07:21:09
        收录时间: 2026-01-13 16:10:50
        描述: 海外欧美、领英、fb、gv、推特、seeking...
        """
        details = {
            "link": None,
            "username": None,
            "chat_type": "supergroup",
            "member_count": 0,
            "description": None,
            "language": None,
            "updated_at": None
        }
        
        if not text:
            return details
        
        # 提取真實鏈接 (最重要)
        link_patterns = [
            r'👉\s*(https?://t\.me/[a-zA-Z][a-zA-Z0-9_]+)',
            r'https?://t\.me/([a-zA-Z][a-zA-Z0-9_]{3,})',
            r't\.me/([a-zA-Z][a-zA-Z0-9_]{3,})'
        ]
        for pattern in link_patterns:
            match = re.search(pattern, text)
            if match:
                if match.group(0).startswith('http'):
                    details["link"] = match.group(1) if match.group(1).startswith('http') else match.group(0)
                else:
                    details["link"] = f"https://t.me/{match.group(1)}"
                # 從鏈接提取 username
                username_match = re.search(r't\.me/([a-zA-Z][a-zA-Z0-9_]+)', details["link"])
                if username_match:
                    details["username"] = username_match.group(1)
                break
        
        # 提取類型
        type_patterns = [
            (r'类型[：:]\s*.*频道', 'channel'),
            (r'类型[：:]\s*.*群[组組]?', 'supergroup'),
            (r'類型[：:]\s*.*頻道', 'channel'),
            (r'【📢\s*频道】', 'channel'),
            (r'【👥\s*群[组組]?】', 'supergroup'),
        ]
        for pattern, chat_type in type_patterns:
            if re.search(pattern, text):
                details["chat_type"] = chat_type
                break
        
        # 提取人數
        member_patterns = [
            r'人[数數][：:]\s*([\d,]+)',
            r'成[员員][：:]\s*([\d,]+)',
            r'members?[：:]\s*([\d,]+)',
        ]
        for pattern in member_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                details["member_count"] = int(match.group(1).replace(',', ''))
                break
        
        # 提取描述
        desc_patterns = [
            r'描述[：:]\s*(.+?)(?:\n|$)',
            r'簡介[：:]\s*(.+?)(?:\n|$)',
            r'description[：:]\s*(.+?)(?:\n|$)',
        ]
        for pattern in desc_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                details["description"] = match.group(1).strip()
                break
        
        # 提取語言
        lang_match = re.search(r'[语語]言[：:]\s*(.+?)(?:\n|$)', text)
        if lang_match:
            details["language"] = lang_match.group(1).strip()
        
        # 提取更新時間
        time_match = re.search(r'更新[时時]间[：:]\s*(.+?)(?:\n|$)', text)
        if time_match:
            details["updated_at"] = time_match.group(1).strip()
        
        return details
    
    def _find_detail_buttons(self, message: Message) -> List[Tuple[int, int, str]]:
        """
        找出消息中的數字按鈕位置 (用於點擊獲取詳情)
        返回: [(row, col, button_text), ...]
        """
        buttons = []
        
        if not message.reply_markup or not hasattr(message.reply_markup, 'inline_keyboard'):
            return buttons
        
        for row_idx, row in enumerate(message.reply_markup.inline_keyboard):
            for col_idx, btn in enumerate(row):
                btn_text = (btn.text or "").strip()
                # 識別數字按鈕（1-99）
                if btn_text.isdigit() and 1 <= int(btn_text) <= 99:
                    buttons.append((row_idx, col_idx, btn_text))
        
        return buttons
    
    async def _fetch_single_detail(
        self,
        client: Client,
        message: Message,
        button_pos: Tuple[int, int, str],
        bot_username: str
    ) -> Optional[Dict[str, Any]]:
        """
        點擊單個按鈕獲取詳情
        
        使用 request_callback_answer 直接發送 callback 請求
        """
        row_idx, col_idx, btn_text = button_pos
        
        try:
            self.log(f"    點擊按鈕 [{btn_text}] 獲取詳情...")
            
            # 先檢查按鈕是否存在
            if not message.reply_markup or not hasattr(message.reply_markup, 'inline_keyboard'):
                self.log(f"    消息沒有按鈕", "warning")
                return None
            
            keyboard = message.reply_markup.inline_keyboard
            if row_idx >= len(keyboard):
                self.log(f"    行索引 {row_idx} 超出範圍 (共 {len(keyboard)} 行)", "warning")
                return None
            
            if col_idx >= len(keyboard[row_idx]):
                self.log(f"    列索引 {col_idx} 超出範圍 (行 {row_idx} 共 {len(keyboard[row_idx])} 列)", "warning")
                return None
            
            button = keyboard[row_idx][col_idx]
            callback_data = getattr(button, 'callback_data', None)
            
            if not callback_data:
                self.log(f"    按鈕沒有 callback_data", "warning")
                return None
            
            # 方法1：使用 Pyrogram 的 click 方法（最簡單可靠）
            click_success = False
            try:
                # 直接使用 message.click()，讓 Pyrogram 處理所有細節
                await message.click(row_idx, col_idx)
                click_success = True
                self.log(f"    click 成功")
            except Exception as e:
                self.log(f"    click 失敗: {e}", "warning")
                
                # 方法2：重新獲取最新消息再點擊
                try:
                    fresh_msg = None
                    async for msg in client.get_chat_history(bot_username, limit=5):
                        if msg.id == message.id:
                            fresh_msg = msg
                            break
                    
                    if fresh_msg and fresh_msg.reply_markup:
                        keyboard = fresh_msg.reply_markup.inline_keyboard
                        if row_idx < len(keyboard) and col_idx < len(keyboard[row_idx]):
                            await fresh_msg.click(row_idx, col_idx)
                            click_success = True
                            self.log(f"    使用刷新消息 click 成功")
                except Exception as e2:
                    self.log(f"    重試也失敗: {e2}", "warning")
            
            if not click_success:
                return None
            
            # 等待 Bot 回復詳情（編輯消息或發送新消息）
            await asyncio.sleep(3.0)
            
            # 嘗試多種方式獲取詳情
            try:
                # 方式1：檢查原消息是否被編輯
                updated_msg = None
                async for msg in client.get_chat_history(bot_username, limit=CHAT_HISTORY_LIMIT):
                    if msg.id == message.id:
                        updated_msg = msg
                        break
                    # 方式2：檢查是否有新的詳情消息
                    text = msg.text or msg.caption or ""
                    if 't.me/' in text and ('👉' in text or '描述' in text or '人数' in text or '類型' in text or '类型' in text):
                        # 這可能是詳情消息
                        details = self._parse_detail_message(text)
                        details["button_index"] = int(btn_text)
                        
                        if details.get("link") or details.get("username"):
                            self.log(f"    ✓ 從新消息獲取到鏈接: {details.get('link')}")
                            
                            # 點擊關閉按鈕返回列表
                            await self._click_close_button(client, msg)
                            
                            return details
                
                # 檢查編輯後的消息
                if updated_msg:
                    text = updated_msg.text or updated_msg.caption or ""
                    self.log(f"    檢查編輯後消息: {text[:100]}...")
                    
                    # 檢查消息是否包含詳情（被編輯後會顯示詳情）
                    if 't.me/' in text:
                        details = self._parse_detail_message(text)
                        details["button_index"] = int(btn_text)
                        
                        if details.get("link") or details.get("username"):
                            self.log(f"    ✓ 獲取到鏈接: {details.get('link')}")
                            
                            # 點擊關閉按鈕返回列表
                            await self._click_close_button(client, updated_msg)
                            
                            return details
                        else:
                            self.log(f"    消息包含 t.me 但解析失敗")
                    else:
                        self.log(f"    編輯後消息不包含 t.me 鏈接")
                        
            except Exception as e:
                self.log(f"    獲取更新消息失敗: {e}", "warning")
            
            self.log(f"    ✗ 未找到有效鏈接")
            return None
            
        except Exception as e:
            self.log(f"    獲取詳情失敗: {e}", "warning")
            return None
    
    async def _click_close_button(self, client: Client, message: Message):
        """點擊關閉按鈕返回搜索列表"""
        try:
            if not message.reply_markup or not hasattr(message.reply_markup, 'inline_keyboard'):
                return
            
            for row_idx, row in enumerate(message.reply_markup.inline_keyboard):
                for col_idx, btn in enumerate(row):
                    btn_text = (btn.text or '').lower()
                    if '关闭' in btn_text or '關閉' in btn_text or 'close' in btn_text or '← ' in btn_text:
                        await message.click(row_idx, col_idx)
                        await asyncio.sleep(0.5)
                        return
        except:
            pass
    
    async def _verify_results_via_telegram(
        self,
        client: Client,
        results: List[JisoSearchResult],
        max_verify: int = 10
    ) -> List[JisoSearchResult]:
        """
        使用 Telegram 官方 API 驗證搜索結果，獲取真實鏈接
        
        策略：用群組名稱通過 contacts.Search 反查，獲取真實的 username
        
        Args:
            client: Telegram 客戶端
            results: 搜索結果列表
            max_verify: 最多驗證多少個
        
        Returns:
            更新後的搜索結果列表（帶真實鏈接）
        """
        if not results:
            return results
        
        # 只驗證沒有真實鏈接的結果
        need_verify = [r for r in results if not r.link and not r.username][:max_verify]
        
        if not need_verify:
            self.log("所有結果都已有鏈接，跳過驗證")
            return results
        
        self.log(f"=== 開始通過 Telegram API 驗證 {len(need_verify)} 個群組 ===")
        
        from pyrogram.raw import functions
        
        verified_count = 0
        for result in need_verify:
            try:
                # 提取搜索關鍵詞（去除常見後綴和特殊字符）
                search_title = result.title
                # 移除 [xxx] 標記
                search_title = re.sub(r'\[.*?\]', '', search_title)
                # 移除 emoji
                search_title = re.sub(r'[\U0001F300-\U0001F9FF\U00002600-\U000027BF]+', '', search_title)
                # 移除多餘空格
                search_title = ' '.join(search_title.split()).strip()
                
                if not search_title or len(search_title) < 2:
                    continue
                
                self.log(f"  🔍 搜索: '{search_title}'")
                
                # 使用 contacts.Search API 搜索
                try:
                    search_result = await client.invoke(
                        functions.contacts.Search(
                            q=search_title[:50],  # 限制搜索長度
                            limit=5
                        )
                    )
                    
                    if hasattr(search_result, 'chats') and search_result.chats:
                        # 嘗試匹配最相似的群組
                        for chat in search_result.chats:
                            chat_title = getattr(chat, 'title', '') or ''
                            chat_username = getattr(chat, 'username', None)
                            
                            if not chat_username:
                                continue
                            
                            # 計算相似度（簡單匹配）
                            title_lower = result.title.lower()
                            chat_title_lower = chat_title.lower()
                            
                            # 如果標題包含關係，認為匹配
                            if (title_lower in chat_title_lower or 
                                chat_title_lower in title_lower or
                                self._title_similarity(title_lower, chat_title_lower) > 0.5):
                                
                                # 找到匹配！更新結果
                                result.username = chat_username
                                result.link = f"https://t.me/{chat_username}"
                                result.details_fetched = True
                                
                                # 更新成員數
                                if hasattr(chat, 'participants_count'):
                                    result.member_count = chat.participants_count or result.member_count
                                
                                # 關鍵：從 Telegram API 獲取真正的類型
                                # broadcast=True 表示頻道, megagroup=True 表示超級群組
                                if hasattr(chat, 'broadcast') and chat.broadcast:
                                    result.chat_type = "channel"
                                    self.log(f"  ✓ 類型確認: 頻道 (broadcast=True)")
                                elif hasattr(chat, 'megagroup') and chat.megagroup:
                                    result.chat_type = "supergroup"
                                    self.log(f"  ✓ 類型確認: 超級群組 (megagroup=True)")
                                elif hasattr(chat, 'gigagroup') and chat.gigagroup:
                                    result.chat_type = "supergroup"
                                    self.log(f"  ✓ 類型確認: 超大群組 (gigagroup=True)")
                                
                                self.log(f"  ✓ 找到匹配: @{chat_username} ({chat_title}) - {result.chat_type}")
                                verified_count += 1
                                break
                        else:
                            self.log(f"  ✗ 未找到匹配的公開群組")
                    else:
                        self.log(f"  ✗ 搜索無結果")
                        
                except Exception as e:
                    self.log(f"  ✗ 搜索失敗: {e}", "warning")
                
                # 避免觸發 FloodWait
                await asyncio.sleep(0.5)
                
            except Exception as e:
                self.log(f"  驗證失敗: {e}", "warning")
                continue
        
        self.log(f"=== 驗證完成: {verified_count}/{len(need_verify)} 個成功 ===")
        return results
    
    def _title_similarity(self, title1: str, title2: str) -> float:
        """計算兩個標題的相似度（簡單實現）"""
        if not title1 or not title2:
            return 0.0
        
        # 分詞
        words1 = set(title1.split())
        words2 = set(title2.split())
        
        if not words1 or not words2:
            return 0.0
        
        # 計算交集
        intersection = words1 & words2
        union = words1 | words2
        
        # Jaccard 相似度
        return len(intersection) / len(union) if union else 0.0
    
    async def fetch_details_for_results(
        self,
        client: Client,
        bot_username: str,
        messages: List[Message],
        results: List[JisoSearchResult],
        max_details: int = 10
    ) -> List[JisoSearchResult]:
        """
        為搜索結果批量獲取詳情（舊方法，保留但不再使用）
        
        Args:
            client: Telegram 客戶端
            bot_username: Bot 用戶名
            messages: 搜索結果消息列表
            results: 解析出的搜索結果
            max_details: 最多獲取多少個詳情（避免過多請求）
        
        Returns:
            更新後的搜索結果列表
        """
        if not messages or not results:
            return results
        
        self.log(f"=== 開始獲取群組詳情（最多 {max_details} 個）===")
        
        # 找出帶有數字按鈕的消息，並打印調試信息
        detail_buttons = []
        for msg in messages:
            # 打印消息的按鈕結構
            if msg.reply_markup and hasattr(msg.reply_markup, 'inline_keyboard'):
                self.log(f"  消息#{msg.id} 按鈕結構:")
                for row_idx, row in enumerate(msg.reply_markup.inline_keyboard):
                    row_texts = []
                    for btn in row:
                        btn_text = (btn.text or "")[:10]
                        has_url = bool(getattr(btn, 'url', None))
                        has_callback = bool(getattr(btn, 'callback_data', None))
                        marker = "U" if has_url else ("C" if has_callback else "?")
                        row_texts.append(f"[{btn_text}:{marker}]")
                    self.log(f"    行{row_idx}: {' '.join(row_texts)}")
            
            buttons = self._find_detail_buttons(msg)
            if buttons:
                self.log(f"  找到 {len(buttons)} 個數字按鈕: {[b[2] for b in buttons[:8]]}...")
                for btn in buttons:
                    detail_buttons.append((msg, btn))
        
        if not detail_buttons:
            self.log("未找到可點擊的詳情按鈕")
            return results
        
        self.log(f"總共找到 {len(detail_buttons)} 個詳情按鈕")
        
        # 限制獲取數量
        detail_buttons = detail_buttons[:max_details]
        
        # 按順序獲取詳情
        fetched_details = []
        for msg, button_pos in detail_buttons:
            detail = await self._fetch_single_detail(client, msg, button_pos, bot_username)
            if detail:
                fetched_details.append(detail)
            
            # 避免觸發限制
            await asyncio.sleep(1.5)
        
        self.log(f"成功獲取 {len(fetched_details)} 個詳情")
        
        # 將詳情匹配回搜索結果
        for detail in fetched_details:
            btn_idx = detail.get("button_index", 0)
            # 按鈕索引對應結果索引 (1-based -> 0-based)
            result_idx = btn_idx - 1
            
            if 0 <= result_idx < len(results):
                result = results[result_idx]
                
                # 更新結果
                if detail.get("link"):
                    result.link = detail["link"]
                if detail.get("username"):
                    result.username = detail["username"]
                if detail.get("description"):
                    result.description = detail["description"]
                if detail.get("member_count") and detail["member_count"] > 0:
                    result.member_count = detail["member_count"]
                if detail.get("chat_type"):
                    result.chat_type = detail["chat_type"]
                if detail.get("language"):
                    result.language = detail["language"]
                if detail.get("updated_at"):
                    result.updated_at = detail["updated_at"]
                
                result.details_fetched = True
                
                self.log(f"  更新結果[{btn_idx}]: {result.title[:20]}... -> {result.link}")
        
        return results
    
    def _filter_relevant_results(self, results: List[JisoSearchResult], keyword: str) -> List[JisoSearchResult]:
        """
        🆕 過濾無關結果 - 保守過濾，優先保留結果
        
        策略：
        1. 如果結果包含關鍵詞 → 保留
        2. 如果結果有真實 Telegram 鏈接 → 保留（Bot 搜索到的）
        3. 如果結果來自可靠來源（有成員數或 username）→ 保留
        4. 只過濾明顯無關的結果
        """
        if not keyword or not results:
            return results
        
        keyword_lower = keyword.lower()
        # 分割關鍵詞（支持空格分隔的多關鍵詞）
        keywords = [k.strip().lower() for k in keyword.split() if k.strip()]
        
        relevant = []
        filtered_count = 0
        
        for result in results:
            title = (result.title or "").lower()
            description = (result.description or "").lower()
            username = (result.username or "").lower()
            link = (result.link or "").lower()
            
            # 檢查是否包含關鍵詞
            contains_keyword = False
            for kw in keywords:
                if kw in title or kw in description or kw in username:
                    contains_keyword = True
                    break
            
            # 🆕 寬鬆保留策略：以下情況都保留
            should_keep = False
            
            if contains_keyword:
                # 情況1：包含關鍵詞
                should_keep = True
            elif result.link or result.username:
                # 情況2：有真實鏈接或 username（Bot 搜索到的可靠結果）
                should_keep = True
            elif result.member_count and result.member_count > 100:
                # 情況3：有成員數且 > 100（可能是相關大群）
                should_keep = True
            elif result.telegram_id:
                # 情況4：有真實 Telegram ID
                should_keep = True
            
            if should_keep:
                relevant.append(result)
            else:
                filtered_count += 1
                self.log(f"  ❌ 過濾無關結果: '{result.title[:30]}...' (無關鍵詞且無可靠來源)", "debug")
        
        if filtered_count > 0:
            self.log(f"  過濾統計: 保留 {len(relevant)} 個，過濾 {filtered_count} 個")
        
        return relevant
    
    def _deduplicate_results(self, results: List[JisoSearchResult]) -> List[JisoSearchResult]:
        """去重结果"""
        seen = {}
        unique = []
        
        for result in results:
            key = result.username or result.title
            if key not in seen:
                seen[key] = result
                unique.append(result)
            else:
                # 保留信息更完整的
                existing = seen[key]
                if result.member_count > existing.member_count:
                    existing.member_count = result.member_count
                if result.username and not existing.username:
                    existing.username = result.username
                if result.description and not existing.description:
                    existing.description = result.description
        
        return unique
    
    # ==================== 搜索核心 ====================
    
    def _menu_button_score(self, text: str) -> int:
        """给 Bot 菜单按钮打分，分数越高越可能是“进入搜索模式”按钮"""
        t = (text or "").strip().lower()
        if not t:
            return 0
        
        # 强匹配
        strong = ["搜索", "找群", "搜群", "搜索群", "群搜索", "开始搜索", "开始", "search"]
        # 弱匹配
        weak = ["群", "群组", "群組", "频道", "资源", "发现", "start"]
        # 负向（避免点到广告/帮助/设置等）
        negative = ["帮助", "說明", "说明", "教程", "设置", "設定", "广告", "廣告", "收费", "付费", "會員", "会员", "充值"]
        
        score = 0
        for k in strong:
            if k in t:
                score += 50
        for k in weak:
            if k in t:
                score += 10
        for k in negative:
            if k in t:
                score -= 30
        
        # 更短更像按钮
        if len(t) <= 6:
            score += 5
        return score
    
    def _pick_best_inline_button(self, message: Message) -> Optional[tuple[int, int, str]]:
        """从 inline keyboard 里选出最像“搜索入口”的按钮 (row, col, text)"""
        rm = getattr(message, "reply_markup", None)
        if not rm or not hasattr(rm, "inline_keyboard") or not rm.inline_keyboard:
            return None
        
        best = None
        best_score = 0
        
        for i, row in enumerate(rm.inline_keyboard):
            for j, btn in enumerate(row):
                btn_text = getattr(btn, "text", "") or ""
                s = self._menu_button_score(btn_text)
                if s > best_score:
                    best_score = s
                    best = (i, j, btn_text)
        
        # 设一个门槛，避免乱点
        if best and best_score >= 30:
            return best
        return None
    
    def _pick_best_reply_keyboard_text(self, message: Message) -> Optional[str]:
        """从 reply keyboard 里选出最像“搜索入口”的按钮文本（用发送文本模拟点击）"""
        rm = getattr(message, "reply_markup", None)
        if not rm or not hasattr(rm, "keyboard") or not rm.keyboard:
            return None
        
        best_text = None
        best_score = 0
        for row in rm.keyboard:
            for btn in row:
                btn_text = getattr(btn, "text", "") or ""
                s = self._menu_button_score(btn_text)
                if s > best_score:
                    best_score = s
                    best_text = btn_text
        
        if best_text and best_score >= 30:
            return best_text
        return None
    
    async def _collect_bot_messages(
        self,
        client: Client,
        bot_username: str,
        bot_id: int,
        my_id: int,
        since_ts: float,
        since_msg_id: Optional[int] = None,
        limit: int = 30,
    ) -> List[Message]:
        """
        拉取最近消息并过滤出 Bot 的回复。
        兼容两种情况：
        - Bot 发送新消息（date >= since_ts）
        - Bot 编辑旧消息（edit_date >= since_ts）
        另外如果 since_msg_id 提供，则也接受 id > since_msg_id 的新消息。
        """
        out: List[Message] = []
        seen: set[int] = set()
        
        try:
            # 🆕 使用 bot_id 代替 bot_username 避免解析問題
            chat_id = bot_id if bot_id else bot_username
            async for m in client.get_chat_history(chat_id, limit=limit):
                if not m.from_user:
                    continue
                if m.from_user.id == my_id:
                    continue
                # 只接受指定 bot（更严格，避免其他转发/服务号）
                if bot_id and m.from_user.id != bot_id:
                    continue
                msg_ts = m.date.timestamp() if m.date else 0
                edit_ts = m.edit_date.timestamp() if getattr(m, "edit_date", None) else 0
                ok = (msg_ts >= since_ts) or (edit_ts >= since_ts)
                if since_msg_id is not None:
                    ok = ok or (m.id > since_msg_id)
                if not ok:
                    continue
                if m.id in seen:
                    continue
                seen.add(m.id)
                out.append(m)
                # 打印详细调试信息
                text_preview = (m.text[:60] + '...') if m.text and len(m.text) > 60 else (m.text or '')
                caption_preview = (m.caption[:60] + '...') if m.caption and len(m.caption) > 60 else (m.caption or '')
                has_photo = bool(getattr(m, 'photo', None))
                has_document = bool(getattr(m, 'document', None))
                has_buttons = bool(getattr(m, 'reply_markup', None))
                
                content_info = []
                if text_preview:
                    content_info.append(f"文本:{text_preview}")
                if caption_preview:
                    content_info.append(f"标题:{caption_preview}")
                if has_photo:
                    content_info.append("有图片")
                if has_document:
                    content_info.append("有文件")
                if has_buttons:
                    # 打印按钮信息
                    rm = m.reply_markup
                    if hasattr(rm, 'inline_keyboard') and rm.inline_keyboard:
                        btn_texts = []
                        for row in rm.inline_keyboard[:3]:  # 最多显示3行
                            for btn in row[:3]:  # 每行最多3个
                                btn_text = getattr(btn, 'text', '') or ''
                                btn_url = getattr(btn, 'url', '') or ''
                                if btn_url:
                                    btn_texts.append(f"[{btn_text}]({btn_url[:30]})")
                                else:
                                    btn_texts.append(f"[{btn_text}]")
                        content_info.append(f"按钮:{','.join(btn_texts)}")
                    elif hasattr(rm, 'keyboard') and rm.keyboard:
                        content_info.append("有回复键盘")
                
                info_str = ' | '.join(content_info) if content_info else '(空消息)'
                self.log(f"  收到Bot消息#{m.id}: {info_str}")
        except FloodWait as e:
            self.log(f"get_chat_history 触发 FloodWait，等待 {e.value} 秒...", "warning")
            await asyncio.sleep(e.value)
            # 重试一次
            try:
                async for m in client.get_chat_history(bot_username, limit=limit):
                    if not m.from_user or m.from_user.id == my_id:
                        continue
                    if bot_id and m.from_user.id != bot_id:
                        continue
                    msg_ts = m.date.timestamp() if m.date else 0
                    edit_ts = m.edit_date.timestamp() if getattr(m, "edit_date", None) else 0
                    ok = (msg_ts >= since_ts) or (edit_ts >= since_ts)
                    if since_msg_id is not None:
                        ok = ok or (m.id > since_msg_id)
                    if not ok:
                        continue
                    if m.id in seen:
                        continue
                    seen.add(m.id)
                    out.append(m)
            except Exception:
                pass
        except Exception as e:
            self.log(f"_collect_bot_messages 出错: {e}", "warning")
        
        return out
    
    async def _auto_enter_search_mode(self, client: Client, bot_username: str, bot_id: int, my_id: int) -> None:
        """
        自动把 Bot 从 /start 菜单状态带到"可输入关键词搜索"的状态。
        - inline keyboard: 自动点 callback 按钮
        - reply keyboard: 自动发送按钮文本
        注意：不依赖 conversation（当前环境不支持）。
        """
        try:
            start_ts = time.time()
            # 🆕 使用 bot_id 代替 bot_username
            chat_id = bot_id if bot_id else bot_username
            await client.send_message(chat_id, "/start")
            await asyncio.sleep(2.5)  # 等久一点让 Bot 回复
            
            # 在 10 秒内等待 Bot 出现带按钮的消息
            deadline = time.time() + 10.0
            last_msgs: List[Message] = []
            while time.time() < deadline:
                last_msgs = await self._collect_bot_messages(
                    client=client,
                    bot_username=bot_username,
                    bot_id=bot_id,
                    my_id=my_id,
                    since_ts=start_ts - 2,
                    since_msg_id=None,
                    limit=15,  # 减少请求数量
                )
                if last_msgs:
                    break
                await asyncio.sleep(2.5)  # 增加间隔
            
            if not last_msgs:
                return
            
            # 找最新一条带按钮的消息
            last_msgs_sorted = sorted(last_msgs, key=lambda x: (x.edit_date.timestamp() if getattr(x, "edit_date", None) else x.date.timestamp()))
            latest = last_msgs_sorted[-1]
            
            # 1) inline keyboard：优先点 callback
            btn_pos = self._pick_best_inline_button(latest)
            if btn_pos:
                i, j, text = btn_pos
                self.log(f"自动点击 @{bot_username} 菜单按钮（callback）: {text!r}")
                try:
                    await latest.click(i, j)
                    await asyncio.sleep(2.0)
                    return
                except Exception as e:
                    self.log(f"点击按钮失败: {e}", "warning")
            
            # 2) reply keyboard：发送按钮文本模拟点击
            reply_text = self._pick_best_reply_keyboard_text(latest)
            if reply_text:
                self.log(f"自动发送 @{bot_username} 菜单按钮文本: {reply_text!r}")
                # 🆕 使用 bot_id
                await client.send_message(chat_id, reply_text)
                await asyncio.sleep(2.0)
                return
        except Exception as e:
            self.log(f"自动进入搜索模式失败: {e}", "warning")
            return
    
    def _build_query_variants(self, bot_username: str, keyword: str) -> List[str]:
        """为不同 Bot 构造可能的查询格式"""
        kw = (keyword or "").strip()
        if not kw:
            return []

        # 特定 Bot 的偏好（经验规则）
        b = (bot_username or "").lower()

        if "tgdb" in b:
            # TelegramDB 類 Bot：使用 /group 或 /search 命令
            return [f"/group {kw}", f"/search {kw}"]
        elif b == "smss":
            # 神马搜索(@smss)：直接发关键词
            return [kw]
        elif "jisou" in b:
            # 极搜：直接发关键词
            return [kw]
        elif "woaiso" in b:
            # 万能搜索：直接发关键词
            return [kw]
        elif "searchee" in b:
            # Searchee：直接发关键词
            return [kw]
        else:
            # 默认：直接发关键词
            return [kw]
    
    async def _send_and_receive(
        self,
        client: Client,
        bot_username: str,
        keyword: str
    ) -> List[Message]:
        """发送搜索请求并接收回复"""
        messages: List[Message] = []
        
        try:
            # 获取当前用户 ID
            me = await client.get_me()
            my_id = me.id
            
            # 🆕 使用底層 API 解析 Bot 用戶名
            bot_id = 0
            bot_peer = None
            try:
                resolved = await client.invoke(
                    functions.contacts.ResolveUsername(username=bot_username)
                )
                if resolved and resolved.users:
                    bot_user = resolved.users[0]
                    bot_id = bot_user.id
                    bot_peer = raw_types.InputPeerUser(
                        user_id=bot_user.id,
                        access_hash=bot_user.access_hash
                    )
                    self.log(f"✅ Bot @{bot_username} 解析成功 (ID: {bot_id})")
                else:
                    self.log(f"❌ Bot @{bot_username} 解析失敗", "warning")
                    return []
            except Exception as resolve_error:
                self.log(f"❌ 解析 @{bot_username} 失敗: {resolve_error}", "warning")
                return []
            
            # 自动点击 /start 菜单，进入"搜索输入"模式（如果 Bot 有按钮）
            await self._auto_enter_search_mode(client, bot_username, bot_id, my_id)
            
            # 通过轮询聊天记录等待 Bot 回复（兼容编辑旧消息）
            self.log("等待 Bot 回复（polling）...")
            query_variants = self._build_query_variants(bot_username, keyword)
            if not query_variants:
                return []
            
            for q in query_variants:
                send_ts = time.time()
                self.log(f"向 @{bot_username} 发送查询: {q!r}")
                
                # 🆕 使用底層 API 發送消息
                try:
                    result = await client.invoke(
                        functions.messages.SendMessage(
                            peer=bot_peer,
                            message=q,
                            random_id=random.randint(1, 2**63 - 1)
                        )
                    )
                    # 從結果中提取消息 ID
                    sent_id = 0
                    if hasattr(result, 'updates'):
                        for update in result.updates:
                            if hasattr(update, 'id'):
                                sent_id = update.id
                                break
                    elif hasattr(result, 'id'):
                        sent_id = result.id
                    self.log(f"✅ 消息已發送 (ID: {sent_id})")
                except Exception as send_error:
                    self.log(f"❌ 發送消息失敗: {send_error}", "error")
                    continue
                
                max_wait = self.config.response_timeout
                check_interval = 3.0  # 增加间隔，避免触发 FloodWait
                elapsed = 0.0
                stable_rounds = 0
                seen: set[int] = set()
                
                while elapsed < max_wait:
                    await asyncio.sleep(check_interval)
                    elapsed += check_interval
                    
                    batch = await self._collect_bot_messages(
                        client=client,
                        bot_username=bot_username,
                        bot_id=bot_id,
                        my_id=my_id,
                        since_ts=send_ts - 2,
                        since_msg_id=sent_id,
                        limit=30,
                    )
                    
                    newly = 0
                    captcha_handled = False
                    for m in batch:
                        if m.id not in seen:
                            seen.add(m.id)
                            
                            # 🆕 消息類型識別日誌
                            msg_text = (m.text or m.caption or "")[:80].replace('\n', ' ')
                            btn_count = 0
                            if m.reply_markup and hasattr(m.reply_markup, 'inline_keyboard'):
                                for row in m.reply_markup.inline_keyboard:
                                    btn_count += len(row)
                            
                            # 🆕 先检查是否是搜索结果
                            is_search_result = self._is_search_result_message(m)
                            is_captcha = self._is_captcha_message(m)
                            
                            if is_search_result:
                                self.log(f"  📋 消息#{m.id} 類型: 搜索結果 (按鈕數: {btn_count})")
                            elif is_captcha:
                                self.log(f"  🔐 消息#{m.id} 類型: 驗證碼 (按鈕數: {btn_count})")
                            else:
                                self.log(f"  📝 消息#{m.id} 類型: 普通消息 | {msg_text[:50]}...")
                            
                            # 检测并处理验证码
                            if is_captcha:
                                self.log("检测到验证码，尝试自动解决...")
                                captcha_solved = await self._handle_captcha(client, m)
                                if captcha_solved:
                                    captcha_handled = True
                                    # 验证码解决后重置，等待新的搜索结果
                                    messages.clear()
                                    seen.clear()
                                    stable_rounds = 0
                                    send_ts = time.time()
                                    # 重新发送搜索关键词
                                    self.log(f"验证码已解决，重新发送搜索: {q!r}")
                                    sent = await client.send_message(bot_username, q)
                                    sent_id = sent.id
                                    await asyncio.sleep(2.0)
                                    break  # 跳出内循环，重新收集消息
                            else:
                                messages.append(m)
                                newly += 1
                    
                    if captcha_handled:
                        continue  # 继续轮询等待新消息
                    
                    if newly == 0:
                        stable_rounds += 1
                    else:
                        stable_rounds = 0
                    
                    # 连续几轮没有新消息，且已有结果：认为收集完成
                    if messages and stable_rounds >= max(2, int(self.config.collect_timeout // check_interval) + 1):
                        break
                
                if messages:
                    break
            
            self.log(f"收到 {len(messages)} 条回复消息")
            
        except FloodWait as e:
            self.log(f"触发限制，需要等待 {e.value} 秒", "warning")
            # 等待后继续（不要直接抛出，这样可以尝试下一个 Bot）
            await asyncio.sleep(min(e.value, 15))
        except Exception as e:
            self.log(f"发送/接收消息失败: {e}", "error")
            # 不要直接抛出，返回空让它尝试下一个 Bot
        
        return messages
    
    async def search(
        self,
        keyword: str,
        phone: str = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        执行极搜搜索
        
        Args:
            keyword: 搜索关键词
            phone: 指定使用的账号（可选）
            limit: 最大结果数
        
        Returns:
            Dict with success, results, error
        """
        self.log(f"开始极搜搜索: '{keyword}'")
        self.emit_progress("starting", f"开始搜索 '{keyword}'...")
        
        # 🆕 首次搜索時清除 Bot 可用性緩存（確保 smss 等 Bot 被重新檢測）
        if not hasattr(self, '_search_count'):
            self._search_count = 0
        self._search_count += 1
        if self._search_count == 1:
            self.clear_bot_cache()
            self.log("🔄 首次搜索，已清除 Bot 緩存")
        
        # 🆕 自動初始化標記（每個帳號只初始化一次）
        if not hasattr(self, '_initialized_accounts'):
            self._initialized_accounts = set()
        
        # 检查缓存
        cached = self._get_cached_results(keyword)
        if cached:
            self.emit_progress("completed", "使用缓存结果", {"cached": True})
            return {
                "success": True,
                "results": [r.to_dict() for r in cached[:limit]],
                "total": len(cached),
                "cached": True,
                "source": "jiso"
            }
        
        # 获取可用客户端
        available_clients = {p: c for p, c in self._clients.items() if c.is_connected}
        if not available_clients:
            return {
                "success": False,
                "error": "没有可用的已连接账号",
                "results": []
            }
        
        # 选择客户端
        if phone and phone in available_clients:
            selected_phone = phone
            client = available_clients[phone]
        else:
            # 选择可用的客户端
            for p, c in available_clients.items():
                can_search, reason = self._can_search(p)
                if can_search:
                    selected_phone = p
                    client = c
                    break
            else:
                # 没有可用的，使用第一个
                selected_phone = list(available_clients.keys())[0]
                client = available_clients[selected_phone]
                can_search, reason = self._can_search(selected_phone)
                if not can_search:
                    return {
                        "success": False,
                        "error": reason,
                        "results": []
                    }
        
        self.log(f"使用账号: {selected_phone}")
        self.emit_progress("searching", f"使用账号 {selected_phone} 搜索中...")
        
        # 🆕 自動初始化搜索 Bot（每個帳號只初始化一次，用戶無感知）
        if selected_phone not in self._initialized_accounts:
            self.log(f"🤖 首次使用此帳號搜索，自動初始化搜索 Bot...")
            self.emit_progress("initializing", "正在準備搜索環境...")
            try:
                init_results = await self.initialize_search_bots(client)
                self._initialized_accounts.add(selected_phone)
                success_count = sum(1 for v in init_results.values() if v)
                self.log(f"✅ 搜索環境準備完成（{success_count}/{len(init_results)} 個 Bot 就緒）")
            except Exception as init_error:
                self.log(f"⚠️ 初始化警告（不影響搜索）: {init_error}", "warning")
                self._initialized_accounts.add(selected_phone)  # 避免重複嘗試
        
        all_results = []
        all_messages = []  # 保存消息用於獲取詳情
        tried_bots = []
        successful_bot = None
        
        # 辅助函数：尝试单个 Bot（🆕 支持自動翻頁）
        async def try_bot(bot_username: str, is_primary: bool, max_pages: int = 3) -> Tuple[List[JisoSearchResult], List[Message]]:
            bot_type = "主力" if is_primary else "备用"
            
            # 检查 Bot 是否可用
            peer = await self._resolve_bot(client, bot_username)
            if not peer:
                self.log(f"[{bot_type}] @{bot_username} 不可用，跳过")
                return [], []
            
            tried_bots.append(bot_username)
            self.log(f"[{bot_type}] 尝试 Bot: @{bot_username}")
            self.emit_progress("searching", f"[{bot_type}] 尝试 @{bot_username}...")
            
            try:
                # 发送搜索并接收回复
                messages = await self._send_and_receive(client, bot_username, keyword)
                
                # 解析所有消息
                bot_results = []
                all_messages_collected = list(messages)
                
                for msg in messages:
                    results = self._parse_message(msg)
                    if results:
                        self.log(f"  从消息#{msg.id}解析出 {len(results)} 个结果:")
                        for r in results[:5]:
                            self.log(f"    - {r.title} ({r.member_count}人)")
                    bot_results.extend(results)
                
                # 🆕 自動翻頁：檢測並點擊「下一頁」按鈕
                if bot_results and messages:
                    current_page = 1
                    while current_page < max_pages:
                        # 找到最後一條有按鈕的消息
                        last_msg_with_buttons = None
                        for msg in reversed(messages):
                            if msg.reply_markup and hasattr(msg.reply_markup, 'inline_keyboard'):
                                last_msg_with_buttons = msg
                                break
                        
                        if not last_msg_with_buttons:
                            break
                        
                        # 查找「下一頁」按鈕
                        next_page_btn = None
                        for row_idx, row in enumerate(last_msg_with_buttons.reply_markup.inline_keyboard):
                            for col_idx, btn in enumerate(row):
                                btn_text = (btn.text or "").lower()
                                # 檢測翻頁按鈕關鍵詞
                                if any(kw in btn_text for kw in ['下一页', '下一頁', 'next', '➡️', '▶️', '>>', '›', '»', '更多']):
                                    next_page_btn = (row_idx, col_idx, btn.text)
                                    break
                            if next_page_btn:
                                break
                        
                        if not next_page_btn:
                            self.log(f"  沒有找到下一頁按鈕，停止翻頁")
                            break
                        
                        # 點擊下一頁
                        current_page += 1
                        self.log(f"  📄 翻到第 {current_page} 頁...")
                        self.emit_progress("searching", f"翻頁中 ({current_page}/{max_pages})...")
                        
                        try:
                            row_idx, col_idx, btn_text = next_page_btn
                            await last_msg_with_buttons.click(row_idx, col_idx)
                            await asyncio.sleep(2.0)  # 等待 Bot 響應
                            
                            # 獲取 Bot ID
                            bot_id = 0
                            try:
                                resolved = await client.invoke(
                                    functions.contacts.ResolveUsername(username=bot_username)
                                )
                                if resolved and resolved.users:
                                    bot_id = resolved.users[0].id
                            except:
                                pass
                            
                            # 收集新消息 - 使用配置常量
                            me = await client.get_me()
                            new_messages = await self._collect_bot_messages(
                                client=client,
                                bot_username=bot_username,
                                bot_id=bot_id,
                                my_id=me.id,
                                since_ts=time.time() - 5,
                                limit=MESSAGE_COLLECT_LIMIT
                            )
                            
                            if new_messages:
                                messages = new_messages
                                all_messages_collected.extend(new_messages)
                                
                                # 解析新結果
                                page_results = []
                                for msg in new_messages:
                                    results = self._parse_message(msg)
                                    page_results.extend(results)
                                
                                if page_results:
                                    self.log(f"  第 {current_page} 頁解析出 {len(page_results)} 個結果")
                                    bot_results.extend(page_results)
                                else:
                                    self.log(f"  第 {current_page} 頁沒有新結果，停止翻頁")
                                    break
                            else:
                                self.log(f"  翻頁後沒有收到新消息")
                                break
                                
                        except Exception as page_error:
                            self.log(f"  翻頁失敗: {page_error}", "warning")
                            break
                
                if bot_results:
                    self.log(f"[{bot_type}] @{bot_username} 返回了 {len(bot_results)} 个结果（{current_page} 頁）")
                else:
                    self.log(f"[{bot_type}] @{bot_username} 没有返回可解析结果")
                
                return bot_results, all_messages_collected
                
            except FloodWait as e:
                self.log(f"[{bot_type}] @{bot_username} 触发限制，等待 {e.value} 秒...")
                await asyncio.sleep(min(e.value, 10))
                return [], []
                
            except Exception as e:
                self.log(f"[{bot_type}] @{bot_username} 出错: {e}")
                return [], []
        
        # 第一步：尝试主力 Bot
        self.log(f"=== 尝试主力 Bot ({len(self.config.primary_bots)}个) ===")
        for bot_username in self.config.primary_bots:
            results, messages = await try_bot(bot_username, is_primary=True)
            if results:
                all_results.extend(results)
                all_messages.extend(messages)
                successful_bot = bot_username
                break  # 主力成功，停止
        
        # 第二步：如果主力都失败，尝试备用 Bot
        if not all_results and self.config.backup_bots:
            self.log(f"=== 主力 Bot 都失败，尝试备用 Bot ({len(self.config.backup_bots)}个) ===")
            for bot_username in self.config.backup_bots:
                results, messages = await try_bot(bot_username, is_primary=False)
                if results:
                    all_results.extend(results)
                    all_messages.extend(messages)
                    successful_bot = bot_username
                    break
        
        # 第三步：如果还没有结果，尝试自定义 Bot
        if not all_results and self.config.custom_bots:
            self.log(f"=== 尝试自定义 Bot ({len(self.config.custom_bots)}个) ===")
            for bot_username in self.config.custom_bots:
                results, messages = await try_bot(bot_username, is_primary=False)
                if results:
                    all_results.extend(results)
                    all_messages.extend(messages)
                    successful_bot = bot_username
                    break
        
        if not tried_bots:
            return {
                "success": False,
                "error": "没有可用的搜索 Bot",
                "results": []
            }
        
        # 记录搜索
        self._record_search(selected_phone)
        
        # 如果所有 Bot 都未返回结果
        if not all_results:
            return {
                "success": False,
                "error": f"Bot 未响应（最后尝试 @{tried_bots[-1] if tried_bots else "unknown"}）。可能需要先在 Telegram 里手动打开该 Bot，发送 /start 并点击其菜单中的“搜索/找群”按钮后再试。",
                "results": [],
                "tried_bots": tried_bots,
                "source": "jiso"
            }
        
        # 第四步：用群組名稱反查真實鏈接（備選方案）
        # 策略：只對沒有從 TextLink 獲取到鏈接的結果進行驗證
        linked_before = sum(1 for r in all_results if r.link or r.username)
        need_verify = sum(1 for r in all_results if not r.link and not r.username)
        
        self.log(f"TextLink 解析結果: {linked_before} 個有鏈接, {need_verify} 個需要驗證")
        
        # 只有當需要驗證的結果較多時才進行
        if need_verify > 0 and need_verify >= len(all_results) * 0.5:
            self.emit_progress("verifying", f"正在驗證 {min(need_verify, 5)} 個群組鏈接...")
            try:
                all_results = await self._verify_results_via_telegram(
                    client=client,
                    results=all_results,
                    max_verify=5  # 最多驗證 5 個
                )
            except Exception as e:
                self.log(f"驗證群組時出錯: {e}", "warning")
        else:
            self.log("大部分結果已有鏈接，跳過驗證")
        
        # 🆕 添加詳細日誌
        self.log(f"🔍 搜索結果統計:")
        self.log(f"  - 原始結果數: {len(all_results)}")
        for i, r in enumerate(all_results[:5]):
            self.log(f"    [{i+1}] {r.title[:30]}... (username={r.username}, link={bool(r.link)})")
        
        # 🆕 過濾無關結果（寬鬆過濾）
        filtered_results = self._filter_relevant_results(all_results, keyword)
        if len(filtered_results) < len(all_results):
            self.log(f"🔍 過濾無關結果: {len(all_results)} → {len(filtered_results)}")
        
        # 去重
        unique_results = self._deduplicate_results(filtered_results)
        self.log(f"  - 去重後結果數: {len(unique_results)}")
        
        # 🔧 P0: 先發送基礎結果（不含詳情），讓前端立即顯示
        linked_count = sum(1 for r in unique_results if r.link or r.username)
        self.log(f"基礎搜索完成: 找到 {len(unique_results)} 个结果，正在獲取詳情...")
        self.emit_progress("basic_results", f"找到 {len(unique_results)} 个結果，正在獲取成員數等詳情...", {
            "results": [r.to_dict() for r in unique_results[:limit]],
            "total": len(unique_results),
            "phase": "basic"
        })
        
        # 🔧 獲取結果的真實詳情（成員數、類型）- 使用配置常量
        if unique_results:
            try:
                await self.fetch_batch_details(client, unique_results, max_count=DETAIL_FETCH_BATCH_SIZE)
            except Exception as e:
                self.log(f"獲取詳情時出錯: {e}", "warning")
        
        # 缓存结果
        if unique_results:
            self._cache_results(keyword, unique_results)
        
        self.log(f"搜索完成: 找到 {len(unique_results)} 个结果，其中 {linked_count} 个有真實鏈接（来自 @{successful_bot}）")
        self.emit_progress("completed", f"找到 {len(unique_results)} 个结果（{linked_count} 个有鏈接）")
        
        return {
            "success": True,
            "results": [r.to_dict() for r in unique_results[:limit]],
            "total": len(unique_results),
            "linked_count": linked_count,
            "cached": False,
            "source": "jiso",
            "bot": successful_bot,
            "tried_bots": tried_bots
        }
    
    async def check_availability(self, phone: str = None) -> Dict[str, Any]:
        """检查极搜服务可用性"""
        available_clients = {p: c for p, c in self._clients.items() if c.is_connected}
        
        if not available_clients:
            return {
                "available": False,
                "reason": "没有已连接的账号"
            }
        
        # 选择客户端
        if phone and phone in available_clients:
            client = available_clients[phone]
        else:
            client = list(available_clients.values())[0]
        
        # 检查 Bot 可用性
        bot_username = await self._get_available_bot(client)
        
        return {
            "available": bot_username is not None,
            "bot": bot_username,
            "reason": None if bot_username else "没有可用的搜索 Bot"
        }
    
    async def fetch_resource_details(self, client: Client, result: JisoSearchResult) -> JisoSearchResult:
        """
        🆕 使用 Telegram API 獲取資源真實詳情（成員數、類型等）
        """
        if not result.username and not result.link:
            return result
        
        try:
            # 獲取 username
            username = result.username
            if not username and result.link:
                username = self._extract_username(result.link)
            
            if not username:
                return result
            
            # 使用 Telegram API 獲取詳情
            chat = await client.get_chat(username)
            
            if chat:
                # 🔧 P0: 更新真實 Telegram ID
                if hasattr(chat, 'id') and chat.id:
                    result.telegram_id = chat.id
                    self.log(f"  🆔 獲取到真實 ID: {chat.id}")
                
                # 更新成員數
                if hasattr(chat, 'members_count') and chat.members_count:
                    result.member_count = chat.members_count
                    self.log(f"  📊 獲取到真實成員數: {chat.members_count}")
                
                # 更新類型
                chat_type_str = str(chat.type).lower() if hasattr(chat, 'type') else ""
                if 'channel' in chat_type_str:
                    result.chat_type = 'channel'
                elif 'supergroup' in chat_type_str:
                    result.chat_type = 'supergroup'
                elif 'group' in chat_type_str:
                    result.chat_type = 'group'
                
                # 更新描述
                if hasattr(chat, 'description') and chat.description:
                    result.description = chat.description[:200]
                
                # 更新標題（如果更準確）
                if hasattr(chat, 'title') and chat.title:
                    result.title = chat.title
                
                # 標記已獲取詳情
                result.details_fetched = True
                
                self.log(f"  ✅ 獲取詳情成功: {result.title} (ID: {result.telegram_id}, {result.member_count}人, {result.chat_type})")
                
        except Exception as e:
            # 忽略錯誤，保持原始數據
            self.log(f"  ⚠️ 獲取詳情失敗: {e}", "warning")
        
        return result
    
    async def fetch_batch_details(self, client: Client, results: List[JisoSearchResult], max_count: int = 10) -> List[JisoSearchResult]:
        """
        🔧 P1: 批量獲取資源詳情（並行化版本：使用 semaphore 控制並發）
        """
        if not results:
            return results
        
        # 只對有 username 的結果獲取詳情
        to_fetch = [r for r in results if r.username or r.link][:max_count]
        
        if not to_fetch:
            return results
        
        total_results = len(results)
        self.log(f"=== 並行獲取 {len(to_fetch)}/{total_results} 個結果的真實詳情 ===")
        self.emit_progress("fetching_details", f"正在獲取詳情 (0/{len(to_fetch)})...")
        
        # 🔧 P1: 使用 Semaphore 控制並發數（避免觸發 FloodWait）
        CONCURRENT_LIMIT = 5  # 最多同時獲取5個
        semaphore = asyncio.Semaphore(CONCURRENT_LIMIT)
        success_count = 0
        completed_count = 0
        
        async def fetch_with_semaphore(result: JisoSearchResult) -> bool:
            nonlocal success_count, completed_count
            async with semaphore:
                try:
                    await self.fetch_resource_details(client, result)
                    success_count += 1
                    completed_count += 1
                    self.emit_progress("fetching_details", f"正在獲取詳情 ({completed_count}/{len(to_fetch)})...")
                    # 短暫延遲避免限流
                    await asyncio.sleep(DETAIL_FETCH_DELAY)
                    return True
                except Exception as e:
                    completed_count += 1
                    self.log(f"  獲取詳情失敗 [{result.username or result.title[:20]}]: {e}", "warning")
                    return False
        
        # 並行執行所有任務
        await asyncio.gather(*[fetch_with_semaphore(r) for r in to_fetch])
        
        self.log(f"=== 詳情獲取完成: {success_count}/{len(to_fetch)} 成功 ===")
        return results


# 创建全局实例
jiso_search_service = JisoSearchService()
