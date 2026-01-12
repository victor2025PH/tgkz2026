"""
TG-Matrix 文本處理工具
處理 Unicode 編碼問題，確保所有文本可以安全序列化
"""

import re
import json
from typing import Any, Union


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
