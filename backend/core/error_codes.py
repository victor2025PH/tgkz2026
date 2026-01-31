"""
TG-Matrix 統一錯誤代碼體系
Phase A: 錯誤反饋優化

錯誤代碼範圍：
- 1000-1999: 帳號相關錯誤
- 2000-2999: 消息相關錯誤
- 3000-3999: 自動化相關錯誤
- 4000-4999: AI 相關錯誤
- 5000-5999: 系統相關錯誤
- 6000-6999: 數據庫相關錯誤
- 7000-7999: 安全相關錯誤
"""

from enum import IntEnum
from dataclasses import dataclass
from typing import Optional, Dict, Any
import json


class ErrorCode(IntEnum):
    """統一錯誤代碼枚舉"""
    
    # ========== 帳號錯誤 (1000-1999) ==========
    # 登入相關 (1000-1099)
    ACCOUNT_LOGIN_FAILED = 1001
    ACCOUNT_CODE_EXPIRED = 1002
    ACCOUNT_CODE_INVALID = 1003
    ACCOUNT_2FA_REQUIRED = 1004
    ACCOUNT_2FA_INVALID = 1005
    ACCOUNT_PHONE_INVALID = 1006
    ACCOUNT_PHONE_BANNED = 1007
    ACCOUNT_PHONE_FLOOD = 1008
    ACCOUNT_SESSION_EXPIRED = 1009
    ACCOUNT_SESSION_LOCKED = 1010
    
    # 連接相關 (1100-1199)
    ACCOUNT_CONNECT_FAILED = 1101
    ACCOUNT_CONNECT_TIMEOUT = 1102
    ACCOUNT_DISCONNECT_FAILED = 1103
    ACCOUNT_ALREADY_CONNECTED = 1104
    ACCOUNT_NOT_CONNECTED = 1105
    ACCOUNT_CONNECTION_LOST = 1106
    
    # 狀態相關 (1200-1299)
    ACCOUNT_NOT_FOUND = 1201
    ACCOUNT_ALREADY_EXISTS = 1202
    ACCOUNT_LIMIT_REACHED = 1203
    ACCOUNT_ROLE_INVALID = 1204
    ACCOUNT_DISABLED = 1205
    ACCOUNT_HEALTH_LOW = 1206
    
    # API 憑證 (1300-1399)
    ACCOUNT_API_INVALID = 1301
    ACCOUNT_API_MISSING = 1302
    ACCOUNT_API_REVOKED = 1303
    
    # ========== 消息錯誤 (2000-2999) ==========
    # 發送相關 (2000-2099)
    MESSAGE_SEND_FAILED = 2001
    MESSAGE_SEND_TIMEOUT = 2002
    MESSAGE_SEND_FLOOD = 2003
    MESSAGE_SEND_BLOCKED = 2004
    MESSAGE_CONTENT_INVALID = 2005
    MESSAGE_CONTENT_TOO_LONG = 2006
    MESSAGE_RECIPIENT_INVALID = 2007
    MESSAGE_RECIPIENT_BLOCKED = 2008
    
    # 隊列相關 (2100-2199)
    MESSAGE_QUEUE_FULL = 2101
    MESSAGE_QUEUE_PAUSED = 2102
    MESSAGE_QUEUE_ERROR = 2103
    MESSAGE_RETRY_EXHAUSTED = 2104
    
    # 模板相關 (2200-2299)
    MESSAGE_TEMPLATE_NOT_FOUND = 2201
    MESSAGE_TEMPLATE_INVALID = 2202
    MESSAGE_TEMPLATE_VARIABLE_MISSING = 2203
    
    # ========== 自動化錯誤 (3000-3999) ==========
    # 監控相關 (3000-3099)
    MONITOR_START_FAILED = 3001
    MONITOR_STOP_FAILED = 3002
    MONITOR_NO_LISTENER = 3003
    MONITOR_GROUP_NOT_FOUND = 3004
    MONITOR_GROUP_ACCESS_DENIED = 3005
    
    # 關鍵詞相關 (3100-3199)
    KEYWORD_SET_NOT_FOUND = 3101
    KEYWORD_SET_EMPTY = 3102
    KEYWORD_SET_INVALID = 3103
    KEYWORD_MATCH_FAILED = 3104
    
    # 規則相關 (3200-3299)
    RULE_NOT_FOUND = 3201
    RULE_INVALID = 3202
    RULE_CONFLICT = 3203
    RULE_EXECUTION_FAILED = 3204
    
    # 工作流相關 (3300-3399)
    WORKFLOW_NOT_FOUND = 3301
    WORKFLOW_INVALID = 3302
    WORKFLOW_EXECUTION_FAILED = 3303
    WORKFLOW_TIMEOUT = 3304
    
    # ========== AI 錯誤 (4000-4999) ==========
    # 模型相關 (4000-4099)
    AI_MODEL_UNAVAILABLE = 4001
    AI_MODEL_TIMEOUT = 4002
    AI_MODEL_RATE_LIMITED = 4003
    AI_MODEL_QUOTA_EXCEEDED = 4004
    AI_MODEL_ERROR = 4005
    
    # 內容相關 (4100-4199)
    AI_CONTENT_FILTERED = 4101
    AI_CONTENT_UNSAFE = 4102
    AI_CONTEXT_TOO_LONG = 4103
    
    # 配置相關 (4200-4299)
    AI_API_KEY_INVALID = 4201
    AI_API_KEY_MISSING = 4202
    AI_PROVIDER_NOT_CONFIGURED = 4203
    
    # ========== 系統錯誤 (5000-5999) ==========
    # 一般錯誤 (5000-5099)
    SYSTEM_INTERNAL_ERROR = 5001
    SYSTEM_UNAVAILABLE = 5002
    SYSTEM_MAINTENANCE = 5003
    SYSTEM_OVERLOADED = 5004
    
    # 配置相關 (5100-5199)
    CONFIG_NOT_FOUND = 5101
    CONFIG_INVALID = 5102
    CONFIG_LOAD_FAILED = 5103
    CONFIG_SAVE_FAILED = 5104
    
    # 文件相關 (5200-5299)
    FILE_NOT_FOUND = 5201
    FILE_READ_FAILED = 5202
    FILE_WRITE_FAILED = 5203
    FILE_LOCKED = 5204
    FILE_TOO_LARGE = 5205
    
    # 網絡相關 (5300-5399)
    NETWORK_ERROR = 5301
    NETWORK_TIMEOUT = 5302
    NETWORK_UNREACHABLE = 5303
    PROXY_ERROR = 5304
    
    # ========== 數據庫錯誤 (6000-6999) ==========
    DATABASE_CONNECTION_FAILED = 6001
    DATABASE_QUERY_FAILED = 6002
    DATABASE_WRITE_FAILED = 6003
    DATABASE_INTEGRITY_ERROR = 6004
    DATABASE_LOCKED = 6005
    DATABASE_MIGRATION_FAILED = 6006
    DATABASE_BACKUP_FAILED = 6007
    DATABASE_RESTORE_FAILED = 6008
    
    # ========== 安全錯誤 (7000-7999) ==========
    SECURITY_AUTH_FAILED = 7001
    SECURITY_PERMISSION_DENIED = 7002
    SECURITY_TOKEN_EXPIRED = 7003
    SECURITY_TOKEN_INVALID = 7004
    SECURITY_RATE_LIMITED = 7005
    SECURITY_INPUT_INVALID = 7006
    SECURITY_ENCRYPTION_FAILED = 7007
    SECURITY_DECRYPTION_FAILED = 7008


@dataclass
class ErrorInfo:
    """錯誤詳細信息"""
    code: ErrorCode
    message: str
    suggestion: str
    action: Optional[str] = None  # 建議的操作標識
    retryable: bool = False
    severity: str = "error"  # error, warning, info
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "code": self.code.value,
            "name": self.code.name,
            "message": self.message,
            "suggestion": self.suggestion,
            "action": self.action,
            "retryable": self.retryable,
            "severity": self.severity
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)


# 錯誤信息映射表
ERROR_INFO_MAP: Dict[ErrorCode, ErrorInfo] = {
    # 帳號登入錯誤
    ErrorCode.ACCOUNT_LOGIN_FAILED: ErrorInfo(
        code=ErrorCode.ACCOUNT_LOGIN_FAILED,
        message="帳號登入失敗",
        suggestion="請檢查電話號碼和 API 憑證是否正確",
        action="check-credentials",
        retryable=True
    ),
    ErrorCode.ACCOUNT_CODE_EXPIRED: ErrorInfo(
        code=ErrorCode.ACCOUNT_CODE_EXPIRED,
        message="驗證碼已過期",
        suggestion="請重新獲取驗證碼",
        action="resend-code",
        retryable=True
    ),
    ErrorCode.ACCOUNT_CODE_INVALID: ErrorInfo(
        code=ErrorCode.ACCOUNT_CODE_INVALID,
        message="驗證碼錯誤",
        suggestion="請檢查驗證碼是否輸入正確",
        action="retry-code",
        retryable=True
    ),
    ErrorCode.ACCOUNT_2FA_REQUIRED: ErrorInfo(
        code=ErrorCode.ACCOUNT_2FA_REQUIRED,
        message="需要兩步驗證",
        suggestion="請輸入您的兩步驗證密碼",
        action="enter-2fa",
        retryable=True
    ),
    ErrorCode.ACCOUNT_2FA_INVALID: ErrorInfo(
        code=ErrorCode.ACCOUNT_2FA_INVALID,
        message="兩步驗證密碼錯誤",
        suggestion="請確認密碼正確，注意大小寫",
        action="retry-2fa",
        retryable=True
    ),
    ErrorCode.ACCOUNT_PHONE_INVALID: ErrorInfo(
        code=ErrorCode.ACCOUNT_PHONE_INVALID,
        message="電話號碼格式無效",
        suggestion="請使用國際格式，例如 +886912345678",
        action="fix-phone",
        retryable=True
    ),
    ErrorCode.ACCOUNT_PHONE_BANNED: ErrorInfo(
        code=ErrorCode.ACCOUNT_PHONE_BANNED,
        message="此電話號碼已被封禁",
        suggestion="請聯繫 Telegram 支援或使用其他號碼",
        action=None,
        retryable=False
    ),
    ErrorCode.ACCOUNT_PHONE_FLOOD: ErrorInfo(
        code=ErrorCode.ACCOUNT_PHONE_FLOOD,
        message="登入請求過於頻繁",
        suggestion="請等待一段時間後再嘗試",
        action="wait-and-retry",
        retryable=True
    ),
    ErrorCode.ACCOUNT_SESSION_EXPIRED: ErrorInfo(
        code=ErrorCode.ACCOUNT_SESSION_EXPIRED,
        message="會話已過期",
        suggestion="請重新登入此帳號",
        action="relogin",
        retryable=True
    ),
    ErrorCode.ACCOUNT_SESSION_LOCKED: ErrorInfo(
        code=ErrorCode.ACCOUNT_SESSION_LOCKED,
        message="會話文件被鎖定",
        suggestion="請確保沒有其他程序正在使用此帳號",
        action="close-other",
        retryable=True
    ),
    
    # 帳號連接錯誤
    ErrorCode.ACCOUNT_CONNECT_FAILED: ErrorInfo(
        code=ErrorCode.ACCOUNT_CONNECT_FAILED,
        message="連接失敗",
        suggestion="請檢查網絡連接和代理設置",
        action="check-network",
        retryable=True
    ),
    ErrorCode.ACCOUNT_CONNECT_TIMEOUT: ErrorInfo(
        code=ErrorCode.ACCOUNT_CONNECT_TIMEOUT,
        message="連接超時",
        suggestion="網絡可能不穩定，請稍後重試",
        action="retry",
        retryable=True
    ),
    ErrorCode.ACCOUNT_NOT_CONNECTED: ErrorInfo(
        code=ErrorCode.ACCOUNT_NOT_CONNECTED,
        message="帳號未連接",
        suggestion="請先連接此帳號",
        action="connect",
        retryable=True
    ),
    ErrorCode.ACCOUNT_CONNECTION_LOST: ErrorInfo(
        code=ErrorCode.ACCOUNT_CONNECTION_LOST,
        message="連接已斷開",
        suggestion="正在嘗試重新連接...",
        action="reconnect",
        retryable=True,
        severity="warning"
    ),
    
    # 帳號狀態錯誤
    ErrorCode.ACCOUNT_NOT_FOUND: ErrorInfo(
        code=ErrorCode.ACCOUNT_NOT_FOUND,
        message="帳號不存在",
        suggestion="請確認帳號是否已添加",
        action=None,
        retryable=False
    ),
    ErrorCode.ACCOUNT_LIMIT_REACHED: ErrorInfo(
        code=ErrorCode.ACCOUNT_LIMIT_REACHED,
        message="帳號數量已達上限",
        suggestion="請升級會員或刪除不需要的帳號",
        action="upgrade",
        retryable=False,
        severity="warning"
    ),
    
    # API 憑證錯誤
    ErrorCode.ACCOUNT_API_INVALID: ErrorInfo(
        code=ErrorCode.ACCOUNT_API_INVALID,
        message="API 憑證無效",
        suggestion="請前往 my.telegram.org 獲取正確的 API ID 和 Hash",
        action="get-api-credentials",
        retryable=True
    ),
    ErrorCode.ACCOUNT_API_MISSING: ErrorInfo(
        code=ErrorCode.ACCOUNT_API_MISSING,
        message="缺少 API 憑證",
        suggestion="請先配置 API ID 和 API Hash",
        action="configure-api",
        retryable=True
    ),
    
    # 消息發送錯誤
    ErrorCode.MESSAGE_SEND_FAILED: ErrorInfo(
        code=ErrorCode.MESSAGE_SEND_FAILED,
        message="消息發送失敗",
        suggestion="請檢查帳號狀態和網絡連接",
        action="retry-send",
        retryable=True
    ),
    ErrorCode.MESSAGE_SEND_FLOOD: ErrorInfo(
        code=ErrorCode.MESSAGE_SEND_FLOOD,
        message="發送過於頻繁",
        suggestion="系統將自動等待後重試",
        action="wait-and-retry",
        retryable=True,
        severity="warning"
    ),
    ErrorCode.MESSAGE_SEND_BLOCKED: ErrorInfo(
        code=ErrorCode.MESSAGE_SEND_BLOCKED,
        message="對方已阻止您",
        suggestion="無法向此用戶發送消息",
        action=None,
        retryable=False
    ),
    ErrorCode.MESSAGE_CONTENT_TOO_LONG: ErrorInfo(
        code=ErrorCode.MESSAGE_CONTENT_TOO_LONG,
        message="消息內容過長",
        suggestion="請縮短消息內容（最大 4096 字符）",
        action="edit-content",
        retryable=True
    ),
    ErrorCode.MESSAGE_RETRY_EXHAUSTED: ErrorInfo(
        code=ErrorCode.MESSAGE_RETRY_EXHAUSTED,
        message="重試次數已用盡",
        suggestion="消息已移至失敗隊列，可手動重新發送",
        action="view-failed",
        retryable=False,
        severity="warning"
    ),
    
    # 監控錯誤
    ErrorCode.MONITOR_START_FAILED: ErrorInfo(
        code=ErrorCode.MONITOR_START_FAILED,
        message="監控啟動失敗",
        suggestion="請確保至少有一個監聽帳號已連接",
        action="configure-listener",
        retryable=True
    ),
    ErrorCode.MONITOR_NO_LISTENER: ErrorInfo(
        code=ErrorCode.MONITOR_NO_LISTENER,
        message="沒有可用的監聽帳號",
        suggestion="請將至少一個帳號設為監聽角色",
        action="set-listener",
        retryable=True
    ),
    ErrorCode.MONITOR_GROUP_ACCESS_DENIED: ErrorInfo(
        code=ErrorCode.MONITOR_GROUP_ACCESS_DENIED,
        message="無法訪問此群組",
        suggestion="請確保監聽帳號已加入此群組",
        action="join-group",
        retryable=True
    ),
    
    # 關鍵詞錯誤
    ErrorCode.KEYWORD_SET_NOT_FOUND: ErrorInfo(
        code=ErrorCode.KEYWORD_SET_NOT_FOUND,
        message="關鍵詞集不存在",
        suggestion="請先創建關鍵詞集",
        action="create-keyword-set",
        retryable=False
    ),
    ErrorCode.KEYWORD_SET_EMPTY: ErrorInfo(
        code=ErrorCode.KEYWORD_SET_EMPTY,
        message="關鍵詞集為空",
        suggestion="請添加至少一個關鍵詞",
        action="add-keywords",
        retryable=True,
        severity="warning"
    ),
    
    # AI 錯誤
    ErrorCode.AI_MODEL_UNAVAILABLE: ErrorInfo(
        code=ErrorCode.AI_MODEL_UNAVAILABLE,
        message="AI 模型暫時不可用",
        suggestion="系統將使用預設模板回覆",
        action=None,
        retryable=True,
        severity="warning"
    ),
    ErrorCode.AI_MODEL_TIMEOUT: ErrorInfo(
        code=ErrorCode.AI_MODEL_TIMEOUT,
        message="AI 回覆超時",
        suggestion="正在重試...",
        action="retry",
        retryable=True,
        severity="warning"
    ),
    ErrorCode.AI_MODEL_QUOTA_EXCEEDED: ErrorInfo(
        code=ErrorCode.AI_MODEL_QUOTA_EXCEEDED,
        message="AI 配額已用盡",
        suggestion="請檢查 API 餘額或升級套餐",
        action="check-quota",
        retryable=False
    ),
    ErrorCode.AI_API_KEY_INVALID: ErrorInfo(
        code=ErrorCode.AI_API_KEY_INVALID,
        message="AI API Key 無效",
        suggestion="請檢查並更新您的 API Key",
        action="update-api-key",
        retryable=True
    ),
    ErrorCode.AI_API_KEY_MISSING: ErrorInfo(
        code=ErrorCode.AI_API_KEY_MISSING,
        message="未配置 AI API Key",
        suggestion="請在設置中配置 OpenAI 或其他 AI 服務的 API Key",
        action="configure-ai",
        retryable=True
    ),
    
    # 系統錯誤
    ErrorCode.SYSTEM_INTERNAL_ERROR: ErrorInfo(
        code=ErrorCode.SYSTEM_INTERNAL_ERROR,
        message="系統內部錯誤",
        suggestion="請稍後重試，如問題持續請聯繫支援",
        action="report-error",
        retryable=True
    ),
    ErrorCode.SYSTEM_OVERLOADED: ErrorInfo(
        code=ErrorCode.SYSTEM_OVERLOADED,
        message="系統負載過高",
        suggestion="請稍後再執行此操作",
        action="wait-and-retry",
        retryable=True,
        severity="warning"
    ),
    ErrorCode.CONFIG_LOAD_FAILED: ErrorInfo(
        code=ErrorCode.CONFIG_LOAD_FAILED,
        message="配置加載失敗",
        suggestion="將使用默認配置",
        action=None,
        retryable=False,
        severity="warning"
    ),
    ErrorCode.FILE_LOCKED: ErrorInfo(
        code=ErrorCode.FILE_LOCKED,
        message="文件被鎖定",
        suggestion="請確保沒有其他程序正在使用此文件",
        action="close-other",
        retryable=True
    ),
    
    # 網絡錯誤
    ErrorCode.NETWORK_ERROR: ErrorInfo(
        code=ErrorCode.NETWORK_ERROR,
        message="網絡錯誤",
        suggestion="請檢查網絡連接",
        action="check-network",
        retryable=True
    ),
    ErrorCode.NETWORK_TIMEOUT: ErrorInfo(
        code=ErrorCode.NETWORK_TIMEOUT,
        message="網絡超時",
        suggestion="請檢查網絡穩定性",
        action="retry",
        retryable=True
    ),
    ErrorCode.PROXY_ERROR: ErrorInfo(
        code=ErrorCode.PROXY_ERROR,
        message="代理連接失敗",
        suggestion="請檢查代理設置是否正確",
        action="check-proxy",
        retryable=True
    ),
    
    # 數據庫錯誤
    ErrorCode.DATABASE_CONNECTION_FAILED: ErrorInfo(
        code=ErrorCode.DATABASE_CONNECTION_FAILED,
        message="數據庫連接失敗",
        suggestion="請重啟應用程序",
        action="restart",
        retryable=True
    ),
    ErrorCode.DATABASE_LOCKED: ErrorInfo(
        code=ErrorCode.DATABASE_LOCKED,
        message="數據庫被鎖定",
        suggestion="請確保沒有其他程序正在訪問數據庫",
        action="close-other",
        retryable=True
    ),
    ErrorCode.DATABASE_BACKUP_FAILED: ErrorInfo(
        code=ErrorCode.DATABASE_BACKUP_FAILED,
        message="數據庫備份失敗",
        suggestion="請檢查磁盤空間是否充足",
        action="check-disk",
        retryable=True
    ),
    
    # 安全錯誤
    ErrorCode.SECURITY_AUTH_FAILED: ErrorInfo(
        code=ErrorCode.SECURITY_AUTH_FAILED,
        message="認證失敗",
        suggestion="請重新登入",
        action="relogin",
        retryable=True
    ),
    ErrorCode.SECURITY_PERMISSION_DENIED: ErrorInfo(
        code=ErrorCode.SECURITY_PERMISSION_DENIED,
        message="權限不足",
        suggestion="此操作需要更高權限",
        action="upgrade",
        retryable=False
    ),
    ErrorCode.SECURITY_RATE_LIMITED: ErrorInfo(
        code=ErrorCode.SECURITY_RATE_LIMITED,
        message="操作過於頻繁",
        suggestion="請稍等片刻再試",
        action="wait-and-retry",
        retryable=True,
        severity="warning"
    ),
    ErrorCode.SECURITY_INPUT_INVALID: ErrorInfo(
        code=ErrorCode.SECURITY_INPUT_INVALID,
        message="輸入內容無效",
        suggestion="請檢查輸入格式",
        action=None,
        retryable=True
    ),
}


def get_error_info(code: ErrorCode) -> ErrorInfo:
    """獲取錯誤詳細信息"""
    return ERROR_INFO_MAP.get(code, ErrorInfo(
        code=code,
        message="未知錯誤",
        suggestion="請稍後重試或聯繫支援",
        action="report-error",
        retryable=False
    ))


def create_error_response(
    code: ErrorCode,
    details: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """創建標準錯誤響應"""
    info = get_error_info(code)
    response = {
        "success": False,
        "error": {
            "code": code.value,
            "name": code.name,
            "message": info.message,
            "details": details or info.message,
            "suggestion": info.suggestion,
            "action": info.action,
            "retryable": info.retryable,
            "severity": info.severity
        }
    }
    if context:
        response["error"]["context"] = context
    return response


# 導出常用函數
__all__ = [
    'ErrorCode',
    'ErrorInfo',
    'ERROR_INFO_MAP',
    'get_error_info',
    'create_error_response'
]
