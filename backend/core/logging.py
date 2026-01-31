"""
TG-Matrix Secure Logging
統一日誌脫敏模塊

提供:
- 電話號碼脫敏
- API 密鑰脫敏
- Session ID 脫敏
- 結構化日誌輸出
"""

import re
import sys
import json
from typing import Any, Dict, Optional
from datetime import datetime
from enum import Enum
from functools import wraps


class LogLevel(Enum):
    """日誌級別"""
    DEBUG = 'debug'
    INFO = 'info'
    WARNING = 'warning'
    ERROR = 'error'
    CRITICAL = 'critical'


def mask_phone(phone: str) -> str:
    """
    將電話號碼脫敏，只顯示前4位和後3位
    
    Examples:
        +8613812345678 -> +861****678
        13812345678 -> 1381****678
    """
    if not phone or len(phone) < 6:
        return phone or ''
    
    # 保留前4位和後3位
    if phone.startswith('+'):
        return f"{phone[:5]}****{phone[-3:]}"
    return f"{phone[:4]}****{phone[-3:]}"


def mask_api_key(key: str) -> str:
    """
    脫敏 API 密鑰
    
    Examples:
        sk-1234567890abcdef -> sk-12****ef
    """
    if not key or len(key) < 8:
        return '****'
    return f"{key[:4]}****{key[-2:]}"


def mask_sensitive(message: str) -> str:
    """
    脫敏日誌消息中的所有敏感信息
    
    處理:
    - 電話號碼 (+開頭的數字串)
    - API 密鑰 (常見格式)
    - Session ID
    - 郵箱地址
    """
    if not message:
        return message
    
    # 電話號碼: +861234567890 -> +861****890
    message = re.sub(
        r'(\+\d{2,4})\d{4,}(\d{3})', 
        r'\1****\2', 
        message
    )
    
    # 純數字電話（11位以上）
    message = re.sub(
        r'\b(\d{4})\d{4,}(\d{3})\b',
        r'\1****\2',
        message
    )
    
    # API 密鑰格式: sk-xxxx, api_xxx, key_xxx
    message = re.sub(
        r'(sk-|api[-_]?|key[-_]?)([A-Za-z0-9]{4})[A-Za-z0-9]{10,}([A-Za-z0-9]{2})',
        r'\1\2****\3',
        message,
        flags=re.IGNORECASE
    )
    
    # 通用長密鑰（20+字符的字母數字串）
    message = re.sub(
        r'([A-Za-z0-9]{4})[A-Za-z0-9]{20,}([A-Za-z0-9]{4})',
        r'\1****\2',
        message
    )
    
    # Session ID
    message = re.sub(
        r'(session[-_]?id[:\s=]*)["\']?[\w-]{10,}["\']?',
        r'\1****',
        message,
        flags=re.IGNORECASE
    )
    
    # 郵箱地址: user@domain.com -> u***@d***.com
    def mask_email(match):
        email = match.group(0)
        parts = email.split('@')
        if len(parts) == 2:
            user = parts[0]
            domain = parts[1]
            masked_user = user[0] + '***' if len(user) > 1 else '***'
            domain_parts = domain.split('.')
            if len(domain_parts) >= 2:
                masked_domain = domain_parts[0][0] + '***.' + domain_parts[-1]
            else:
                masked_domain = '***'
            return f"{masked_user}@{masked_domain}"
        return email
    
    message = re.sub(
        r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
        mask_email,
        message
    )
    
    return message


class SecureLogger:
    """
    安全日誌記錄器
    
    自動脫敏敏感信息，支持結構化日誌輸出
    
    Usage:
        logger = SecureLogger('AccountService')
        logger.info('用戶登錄成功', phone='+8613812345678')
        # Output: [INFO][AccountService] 用戶登錄成功 | phone=+861****678
    """
    
    def __init__(self, module_name: str, enable_json: bool = False):
        self.module_name = module_name
        self.enable_json = enable_json
    
    def _format_context(self, context: Dict[str, Any]) -> str:
        """格式化上下文，自動脫敏敏感字段"""
        if not context:
            return ''
        
        masked = {}
        for key, value in context.items():
            # 自動識別敏感字段名
            if any(sensitive in key.lower() for sensitive in 
                   ['phone', 'password', 'secret', 'key', 'token', 'session', 'api']):
                if isinstance(value, str):
                    if 'phone' in key.lower():
                        masked[key] = mask_phone(value)
                    else:
                        masked[key] = mask_api_key(value)
                else:
                    masked[key] = '****'
            else:
                # 對值進行通用脫敏
                if isinstance(value, str):
                    masked[key] = mask_sensitive(value)
                else:
                    masked[key] = value
        
        return ' | ' + ', '.join(f"{k}={v}" for k, v in masked.items())
    
    def _log(self, level: LogLevel, message: str, **context):
        """內部日誌方法"""
        # 脫敏消息本身
        safe_message = mask_sensitive(message)
        context_str = self._format_context(context)
        
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        if self.enable_json:
            log_entry = {
                'timestamp': timestamp,
                'level': level.value,
                'module': self.module_name,
                'message': safe_message,
                'context': context
            }
            output = json.dumps(log_entry, ensure_ascii=False, default=str)
        else:
            output = f"[{timestamp}][{level.value.upper()}][{self.module_name}] {safe_message}{context_str}"
        
        # 根據級別選擇輸出流
        if level in (LogLevel.ERROR, LogLevel.CRITICAL):
            print(output, file=sys.stderr)
        else:
            print(output, file=sys.stderr)  # 所有日誌輸出到 stderr，避免干擾 IPC
    
    def debug(self, message: str, **context):
        """調試日誌"""
        self._log(LogLevel.DEBUG, message, **context)
    
    def info(self, message: str, **context):
        """信息日誌"""
        self._log(LogLevel.INFO, message, **context)
    
    def warning(self, message: str, **context):
        """警告日誌"""
        self._log(LogLevel.WARNING, message, **context)
    
    def error(self, message: str, **context):
        """錯誤日誌"""
        self._log(LogLevel.ERROR, message, **context)
    
    def critical(self, message: str, **context):
        """嚴重錯誤日誌"""
        self._log(LogLevel.CRITICAL, message, **context)


# 全局日誌器緩存
_loggers: Dict[str, SecureLogger] = {}


def get_logger(module_name: str, enable_json: bool = False) -> SecureLogger:
    """
    獲取模塊專用日誌器
    
    Args:
        module_name: 模塊名稱
        enable_json: 是否啟用 JSON 格式輸出
    
    Returns:
        SecureLogger 實例
    """
    global _loggers
    
    key = f"{module_name}_{enable_json}"
    if key not in _loggers:
        _loggers[key] = SecureLogger(module_name, enable_json)
    
    return _loggers[key]


def log_function_call(logger: Optional[SecureLogger] = None):
    """
    裝飾器：記錄函數調用
    
    Usage:
        @log_function_call()
        async def my_function(arg1, arg2):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            nonlocal logger
            if logger is None:
                logger = get_logger(func.__module__)
            
            func_name = func.__name__
            logger.debug(f"Calling {func_name}", args_count=len(args), kwargs_keys=list(kwargs.keys()))
            
            try:
                result = await func(*args, **kwargs)
                logger.debug(f"Completed {func_name}")
                return result
            except Exception as e:
                logger.error(f"Failed {func_name}", error=str(e))
                raise
        
        return wrapper
    return decorator
