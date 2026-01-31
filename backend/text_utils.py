"""
TG-Matrix 文本處理工具
處理 Unicode 編碼問題，確保所有文本可以安全序列化
"""

import re
import json
from typing import Any, Union


def mask_api_key(api_key: str, visible_chars: int = 4) -> str:
    """
    🔧 脫敏 API Key，只顯示前後幾個字符
    
    Args:
        api_key: 原始 API Key
        visible_chars: 前後顯示的字符數（默認 4）
        
    Returns:
        脫敏後的字符串，如 "sk-pr...veHx"
        
    Examples:
        >>> mask_api_key("sk-proj-1234567890abcdef")
        "sk-p...cdef"
    """
    if not api_key:
        return ""
    
    if len(api_key) <= visible_chars * 2 + 3:
        # 太短的 key 全部替換為星號
        return "*" * len(api_key)
    
    return f"{api_key[:visible_chars]}...{api_key[-visible_chars:]}"


def mask_sensitive_payload(payload: dict) -> dict:
    """
    🔧 脫敏 payload 中的敏感字段
    
    Args:
        payload: 原始 payload
        
    Returns:
        脫敏後的 payload（淺拷貝）
    """
    if not payload or not isinstance(payload, dict):
        return payload
    
    # 敏感字段列表
    sensitive_fields = ['apiKey', 'api_key', 'password', 'secret', 'token']
    
    masked = payload.copy()
    for field in sensitive_fields:
        if field in masked and masked[field]:
            masked[field] = mask_api_key(str(masked[field]))
    
    return masked


def sanitize_text(text: Union[str, None]) -> str:
    """
    清理文本中的非法 Unicode 字符（代理對等）
    
    Args:
        text: 輸入文本，可能包含 emoji 或特殊字符
        
    Returns:
        清理後的安全文本
    """
    if text is None:
        return ""
    
    if not isinstance(text, str):
        text = str(text)
    
    # 方法1: 編碼再解碼，使用 surrogatepass 處理代理對
    try:
        # 先嘗試正常編碼
        text.encode('utf-8')
        return text
    except UnicodeEncodeError:
        pass
    
    # 方法2: 移除所有代理對字符 (U+D800 到 U+DFFF)
    # 這些字符在 JSON 中是非法的
    cleaned = []
    for char in text:
        code_point = ord(char)
        # 跳過代理對範圍
        if 0xD800 <= code_point <= 0xDFFF:
            cleaned.append('\uFFFD')  # 替換為替換字符
        else:
            cleaned.append(char)
    
    return ''.join(cleaned)


def sanitize_dict(data: Any) -> Any:
    """
    遞歸清理字典/列表中所有字符串
    
    Args:
        data: 任意數據結構
        
    Returns:
        清理後的數據結構
    """
    if isinstance(data, str):
        return sanitize_text(data)
    elif isinstance(data, dict):
        return {k: sanitize_dict(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_dict(item) for item in data]
    elif isinstance(data, tuple):
        return tuple(sanitize_dict(item) for item in data)
    else:
        return data


def safe_json_dumps(obj: Any, **kwargs) -> str:
    """
    安全的 JSON 序列化，自動處理編碼問題
    
    Args:
        obj: 要序列化的對象
        **kwargs: 傳遞給 json.dumps 的參數
        
    Returns:
        JSON 字符串
    """
    # 設置默認參數
    kwargs.setdefault('ensure_ascii', False)
    kwargs.setdefault('default', str)
    
    # 清理數據
    cleaned_obj = sanitize_dict(obj)
    
    try:
        return json.dumps(cleaned_obj, **kwargs)
    except (UnicodeEncodeError, UnicodeDecodeError) as e:
        # 如果還是失敗，使用 ASCII 模式
        kwargs['ensure_ascii'] = True
        return json.dumps(cleaned_obj, **kwargs)


def safe_get_name(obj: Any, default: str = "未知") -> str:
    """
    安全獲取 Telegram 對象的名稱
    
    Args:
        obj: Telegram 對象 (User, Chat 等)
        default: 默認值
        
    Returns:
        清理後的名稱
    """
    if obj is None:
        return default
    
    # 嘗試不同的屬性
    name = None
    
    if hasattr(obj, 'title'):
        name = obj.title
    elif hasattr(obj, 'first_name'):
        first = obj.first_name or ""
        last = getattr(obj, 'last_name', "") or ""
        name = f"{first} {last}".strip()
    elif hasattr(obj, 'username'):
        name = obj.username
    elif hasattr(obj, 'name'):
        name = obj.name
    
    if name:
        return sanitize_text(name)
    
    return default


def safe_get_username(obj: Any, default: str = "") -> str:
    """
    安全獲取用戶名
    
    Args:
        obj: Telegram 對象
        default: 默認值
        
    Returns:
        清理後的用戶名
    """
    if obj is None:
        return default
    
    username = getattr(obj, 'username', None)
    if username:
        return sanitize_text(username)
    
    return default


def format_chat_info(chat: Any) -> dict:
    """
    格式化聊天信息為安全的字典
    
    Args:
        chat: Pyrogram Chat 對象
        
    Returns:
        包含聊天信息的字典
    """
    if chat is None:
        return {
            "id": 0,
            "title": "未知",
            "username": "",
            "type": "unknown"
        }
    
    return {
        "id": getattr(chat, 'id', 0),
        "title": safe_get_name(chat, "未知群組"),
        "username": safe_get_username(chat),
        "type": str(getattr(chat, 'type', 'unknown')).split('.')[-1].lower(),
        "members_count": getattr(chat, 'members_count', 0) or 0
    }


def format_user_info(user: Any) -> dict:
    """
    格式化用戶信息為安全的字典
    
    Args:
        user: Pyrogram User 對象
        
    Returns:
        包含用戶信息的字典
    """
    if user is None:
        return {
            "id": 0,
            "name": "未知用戶",
            "username": "",
            "is_bot": False
        }
    
    first = sanitize_text(getattr(user, 'first_name', "") or "")
    last = sanitize_text(getattr(user, 'last_name', "") or "")
    name = f"{first} {last}".strip() or "未知用戶"
    
    return {
        "id": getattr(user, 'id', 0),
        "name": name,
        "first_name": first,
        "last_name": last,
        "username": safe_get_username(user),
        "is_bot": getattr(user, 'is_bot', False),
        "phone": sanitize_text(getattr(user, 'phone_number', "") or "")
    }


# ============ 統一日誌格式化 ============

from datetime import datetime
from enum import Enum

class LogLevel(Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    SUCCESS = "SUCCESS"

# 日誌級別對應的 emoji
LOG_EMOJI = {
    LogLevel.DEBUG: "🔍",
    LogLevel.INFO: "ℹ️",
    LogLevel.WARNING: "⚠️",
    LogLevel.ERROR: "❌",
    LogLevel.SUCCESS: "✅"
}

def format_log(module: str, message: str, level: LogLevel = LogLevel.INFO, 
               context: dict = None) -> str:
    """
    統一日誌格式化
    
    Args:
        module: 模塊名稱（如 "AIAutoChat", "PrivatePoller"）
        message: 日誌消息
        level: 日誌級別
        context: 額外上下文信息
        
    Returns:
        格式化的日誌字符串
        
    Examples:
        >>> format_log("AIAutoChat", "生成回覆成功", LogLevel.SUCCESS, {"user": "john"})
        "[2024-01-23 14:30:45] [AIAutoChat] ✅ 生成回覆成功 | user=john"
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    emoji = LOG_EMOJI.get(level, "")
    
    base = f"[{timestamp}] [{module}] {emoji} {message}"
    
    if context:
        # 脫敏敏感字段
        safe_context = mask_sensitive_payload(context) if isinstance(context, dict) else context
        context_str = " | ".join(f"{k}={v}" for k, v in safe_context.items())
        return f"{base} | {context_str}"
    
    return base


def log_ai_event(event_type: str, user_id: str = None, success: bool = True, 
                 details: str = None) -> str:
    """
    專門用於 AI 事件的日誌格式化
    
    Args:
        event_type: 事件類型（如 "生成回覆", "調用API", "發送消息"）
        user_id: 用戶 ID
        success: 是否成功
        details: 詳細信息
        
    Returns:
        格式化的日誌字符串
    """
    level = LogLevel.SUCCESS if success else LogLevel.ERROR
    context = {}
    
    if user_id:
        context["user"] = user_id
    if details:
        context["details"] = details[:100]  # 限制長度
    
    return format_log("AI", event_type, level, context if context else None)
