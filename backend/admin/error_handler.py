"""
統一錯誤處理模塊
提供標準化的錯誤響應格式和錯誤代碼體系

優化點：
1. 錯誤代碼分類清晰
2. 支持多語言錯誤消息
3. 包含調試信息（開發模式）
4. 自動日誌記錄
"""

import os
import logging
import traceback
import uuid
from enum import Enum
from typing import Any, Dict, Optional
from datetime import datetime
from aiohttp import web

logger = logging.getLogger(__name__)

# 是否為開發模式
DEBUG = os.environ.get('DEBUG', 'false').lower() == 'true'


class ErrorCode(Enum):
    """錯誤代碼枚舉"""
    
    # AUTH (1xxx) - 認證錯誤
    AUTH_INVALID_TOKEN = (1001, "無效的認證令牌")
    AUTH_TOKEN_EXPIRED = (1002, "認證令牌已過期")
    AUTH_INSUFFICIENT_PERMISSION = (1003, "權限不足")
    AUTH_PASSWORD_INCORRECT = (1004, "密碼錯誤")
    AUTH_USER_NOT_FOUND = (1005, "用戶不存在")
    AUTH_ACCOUNT_LOCKED = (1006, "帳號已鎖定")
    AUTH_PASSWORD_REQUIRED = (1007, "需要修改密碼")
    AUTH_PASSWORD_TOO_WEAK = (1008, "密碼強度不足")
    
    # USER (2xxx) - 用戶錯誤
    USER_NOT_FOUND = (2001, "用戶不存在")
    USER_ALREADY_BANNED = (2002, "用戶已被封禁")
    USER_ALREADY_ACTIVE = (2003, "用戶已處於正常狀態")
    USER_SUBSCRIPTION_EXPIRED = (2004, "訂閱已過期")
    USER_DUPLICATE_EMAIL = (2005, "郵箱已存在")
    USER_INVALID_LEVEL = (2006, "無效的會員等級")
    
    # LICENSE (3xxx) - 卡密錯誤
    LICENSE_NOT_FOUND = (3001, "卡密不存在")
    LICENSE_ALREADY_USED = (3002, "卡密已被使用")
    LICENSE_EXPIRED = (3003, "卡密已過期")
    LICENSE_DISABLED = (3004, "卡密已被禁用")
    LICENSE_INVALID_FORMAT = (3005, "卡密格式無效")
    LICENSE_GENERATION_FAILED = (3006, "卡密生成失敗")
    
    # ORDER (3xxx) - 訂單錯誤
    ORDER_NOT_FOUND = (3501, "訂單不存在")
    ORDER_ALREADY_PAID = (3502, "訂單已支付")
    ORDER_CANCELLED = (3503, "訂單已取消")
    ORDER_EXPIRED = (3504, "訂單已過期")
    
    # DB (4xxx) - 數據庫錯誤
    DB_CONNECTION_FAILED = (4001, "數據庫連接失敗")
    DB_QUERY_FAILED = (4002, "數據庫查詢失敗")
    DB_INTEGRITY_ERROR = (4003, "數據完整性錯誤")
    DB_TABLE_NOT_FOUND = (4004, "數據表不存在")
    
    # VALIDATION (4xxx) - 驗證錯誤
    VALIDATION_REQUIRED_FIELD = (4501, "缺少必填字段")
    VALIDATION_INVALID_FORMAT = (4502, "格式無效")
    VALIDATION_OUT_OF_RANGE = (4503, "數值超出範圍")
    
    # SYSTEM (5xxx) - 系統錯誤
    SYSTEM_INTERNAL_ERROR = (5001, "內部系統錯誤")
    SYSTEM_MAINTENANCE = (5002, "系統維護中")
    SYSTEM_RATE_LIMITED = (5003, "請求過於頻繁")
    SYSTEM_SERVICE_UNAVAILABLE = (5004, "服務暫時不可用")
    
    def __init__(self, code: int, message: str):
        self._code = code
        self._message = message
    
    @property
    def code(self) -> int:
        return self._code
    
    @property
    def message(self) -> str:
        return self._message


class AdminError(Exception):
    """管理後台錯誤基類"""
    
    def __init__(
        self,
        error_code: ErrorCode,
        message: str = None,
        details: Dict[str, Any] = None,
        http_status: int = 400
    ):
        self.error_code = error_code
        self.message = message or error_code.message
        self.details = details or {}
        self.http_status = http_status
        self.request_id = str(uuid.uuid4())[:8]
        super().__init__(self.message)
    
    def to_response(self) -> Dict[str, Any]:
        """轉換為響應字典"""
        response = {
            'success': False,
            'error': {
                'code': self.error_code.name,
                'code_num': self.error_code.code,
                'message': self.message,
            },
            'meta': {
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'request_id': self.request_id
            }
        }
        
        if self.details:
            response['error']['details'] = self.details
        
        # 開發模式下包含更多信息
        if DEBUG:
            response['error']['traceback'] = traceback.format_exc()
        
        return response


def error_response(
    error_code: ErrorCode,
    message: str = None,
    details: Dict[str, Any] = None,
    http_status: int = None
) -> web.Response:
    """
    生成錯誤響應
    
    用法：
        return error_response(ErrorCode.USER_NOT_FOUND)
        return error_response(ErrorCode.VALIDATION_REQUIRED_FIELD, details={'field': 'email'})
    """
    if http_status is None:
        # 根據錯誤代碼自動判斷 HTTP 狀態碼
        code = error_code.code
        if 1000 <= code < 2000:
            http_status = 401  # 認證錯誤
        elif 2000 <= code < 4000:
            http_status = 404  # 資源錯誤
        elif 4000 <= code < 4500:
            http_status = 500  # 數據庫錯誤
        elif 4500 <= code < 5000:
            http_status = 400  # 驗證錯誤
        else:
            http_status = 500  # 系統錯誤
    
    error = AdminError(error_code, message, details, http_status)
    
    # 記錄錯誤日誌
    if http_status >= 500:
        logger.error(f"[{error.request_id}] {error_code.name}: {error.message} | {details}")
    else:
        logger.warning(f"[{error.request_id}] {error_code.name}: {error.message} | {details}")
    
    return web.json_response(error.to_response(), status=http_status)


def success_response(
    data: Any = None,
    message: str = None,
    meta: Dict[str, Any] = None
) -> web.Response:
    """
    生成成功響應
    
    用法：
        return success_response({'users': users})
        return success_response(message="操作成功")
    """
    request_id = str(uuid.uuid4())[:8]
    
    response = {
        'success': True,
        'meta': {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'request_id': request_id
        }
    }
    
    if data is not None:
        response['data'] = data
    
    if message:
        response['message'] = message
    
    if meta:
        response['meta'].update(meta)
    
    return web.json_response(response)


def handle_exception(func):
    """
    異常處理裝飾器
    自動捕獲異常並返回標準錯誤響應
    
    用法：
        @handle_exception
        async def my_handler(self, request):
            ...
    """
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except AdminError as e:
            return web.json_response(e.to_response(), status=e.http_status)
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            logger.exception(f"Unhandled exception in {func.__name__}: {e}\n{tb}")
            # 臨時：總是返回詳細錯誤信息以便調試
            error = AdminError(
                ErrorCode.SYSTEM_INTERNAL_ERROR,
                message=f"{type(e).__name__}: {str(e)}",
                details={'traceback': tb.split('\n')[-5:]} if not DEBUG else {'traceback': tb},
                http_status=500
            )
            return web.json_response(error.to_response(), status=500)
    
    wrapper.__name__ = func.__name__
    wrapper.__doc__ = func.__doc__
    return wrapper
