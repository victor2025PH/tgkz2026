"""
後端國際化服務

優化設計：
1. 多語言錯誤消息
2. 自動語言檢測
3. 郵件模板國際化
4. 動態語言切換
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from functools import lru_cache
from contextvars import ContextVar

logger = logging.getLogger(__name__)

# 當前語言上下文
_current_language: ContextVar[str] = ContextVar('current_language', default='zh-TW')

# 支持的語言
SUPPORTED_LANGUAGES = ['zh-TW', 'zh-CN', 'en']
DEFAULT_LANGUAGE = 'zh-TW'

# ==================== 翻譯字典 ====================

TRANSLATIONS: Dict[str, Dict[str, str]] = {
    # ==================== 認證相關 ====================
    'auth.invalid_credentials': {
        'zh-TW': '帳號或密碼錯誤',
        'zh-CN': '账号或密码错误',
        'en': 'Invalid email or password'
    },
    'auth.user_not_found': {
        'zh-TW': '用戶不存在',
        'zh-CN': '用户不存在',
        'en': 'User not found'
    },
    'auth.email_exists': {
        'zh-TW': '此郵箱已被註冊',
        'zh-CN': '此邮箱已被注册',
        'en': 'Email already registered'
    },
    'auth.username_exists': {
        'zh-TW': '此用戶名已被使用',
        'zh-CN': '此用户名已被使用',
        'en': 'Username already taken'
    },
    'auth.weak_password': {
        'zh-TW': '密碼強度不足，需至少 8 個字符',
        'zh-CN': '密码强度不足，需至少 8 个字符',
        'en': 'Password too weak, minimum 8 characters required'
    },
    'auth.invalid_token': {
        'zh-TW': '無效的認證令牌',
        'zh-CN': '无效的认证令牌',
        'en': 'Invalid authentication token'
    },
    'auth.token_expired': {
        'zh-TW': '認證令牌已過期',
        'zh-CN': '认证令牌已过期',
        'en': 'Authentication token expired'
    },
    'auth.login_required': {
        'zh-TW': '請先登入',
        'zh-CN': '请先登录',
        'en': 'Please login first'
    },
    'auth.permission_denied': {
        'zh-TW': '權限不足',
        'zh-CN': '权限不足',
        'en': 'Permission denied'
    },
    'auth.account_locked': {
        'zh-TW': '帳戶已被鎖定，請稍後再試',
        'zh-CN': '账户已被锁定，请稍后再试',
        'en': 'Account locked, please try again later'
    },
    
    # ==================== 2FA 相關 ====================
    'twofa.invalid_code': {
        'zh-TW': '驗證碼錯誤',
        'zh-CN': '验证码错误',
        'en': 'Invalid verification code'
    },
    'twofa.not_enabled': {
        'zh-TW': '雙因素認證未啟用',
        'zh-CN': '双因素认证未启用',
        'en': 'Two-factor authentication not enabled'
    },
    'twofa.already_enabled': {
        'zh-TW': '雙因素認證已啟用',
        'zh-CN': '双因素认证已启用',
        'en': 'Two-factor authentication already enabled'
    },
    'twofa.setup_required': {
        'zh-TW': '請先設置雙因素認證',
        'zh-CN': '请先设置双因素认证',
        'en': 'Please setup two-factor authentication first'
    },
    'twofa.enabled_success': {
        'zh-TW': '雙因素認證已成功啟用',
        'zh-CN': '双因素认证已成功启用',
        'en': 'Two-factor authentication enabled successfully'
    },
    'twofa.disabled_success': {
        'zh-TW': '雙因素認證已禁用',
        'zh-CN': '双因素认证已禁用',
        'en': 'Two-factor authentication disabled'
    },
    
    # ==================== 配額相關 ====================
    'quota.exceeded': {
        'zh-TW': '已達使用上限',
        'zh-CN': '已达使用上限',
        'en': 'Usage limit exceeded'
    },
    'quota.api_calls_exceeded': {
        'zh-TW': 'API 調用已達今日上限',
        'zh-CN': 'API 调用已达今日上限',
        'en': 'Daily API call limit exceeded'
    },
    'quota.accounts_exceeded': {
        'zh-TW': '帳號數量已達上限',
        'zh-CN': '账号数量已达上限',
        'en': 'Account limit exceeded'
    },
    'quota.upgrade_required': {
        'zh-TW': '請升級方案以解鎖更多功能',
        'zh-CN': '请升级方案以解锁更多功能',
        'en': 'Please upgrade your plan to unlock more features'
    },
    
    # ==================== 訂閱相關 ====================
    'subscription.not_found': {
        'zh-TW': '未找到訂閱信息',
        'zh-CN': '未找到订阅信息',
        'en': 'Subscription not found'
    },
    'subscription.already_cancelled': {
        'zh-TW': '訂閱已取消',
        'zh-CN': '订阅已取消',
        'en': 'Subscription already cancelled'
    },
    'subscription.cancel_success': {
        'zh-TW': '訂閱將在週期結束時取消',
        'zh-CN': '订阅将在周期结束时取消',
        'en': 'Subscription will cancel at period end'
    },
    'subscription.payment_failed': {
        'zh-TW': '付款失敗，請檢查支付方式',
        'zh-CN': '付款失败，请检查支付方式',
        'en': 'Payment failed, please check your payment method'
    },
    
    # ==================== 帳號相關 ====================
    'account.not_found': {
        'zh-TW': '帳號不存在',
        'zh-CN': '账号不存在',
        'en': 'Account not found'
    },
    'account.already_exists': {
        'zh-TW': '此手機號碼已添加',
        'zh-CN': '此手机号码已添加',
        'en': 'Phone number already added'
    },
    'account.login_required': {
        'zh-TW': '請輸入驗證碼登入',
        'zh-CN': '请输入验证码登录',
        'en': 'Please enter verification code to login'
    },
    'account.banned': {
        'zh-TW': '此帳號已被封禁',
        'zh-CN': '此账号已被封禁',
        'en': 'This account has been banned'
    },
    
    # ==================== 備份相關 ====================
    'backup.not_found': {
        'zh-TW': '備份不存在',
        'zh-CN': '备份不存在',
        'en': 'Backup not found'
    },
    'backup.create_success': {
        'zh-TW': '備份創建成功',
        'zh-CN': '备份创建成功',
        'en': 'Backup created successfully'
    },
    'backup.delete_success': {
        'zh-TW': '備份已刪除',
        'zh-CN': '备份已删除',
        'en': 'Backup deleted'
    },
    
    # ==================== API 密鑰相關 ====================
    'apikey.not_found': {
        'zh-TW': '密鑰不存在',
        'zh-CN': '密钥不存在',
        'en': 'API key not found'
    },
    'apikey.invalid': {
        'zh-TW': '無效的 API 密鑰',
        'zh-CN': '无效的 API 密钥',
        'en': 'Invalid API key'
    },
    'apikey.expired': {
        'zh-TW': 'API 密鑰已過期',
        'zh-CN': 'API 密钥已过期',
        'en': 'API key expired'
    },
    'apikey.revoked': {
        'zh-TW': 'API 密鑰已撤銷',
        'zh-CN': 'API 密钥已撤销',
        'en': 'API key revoked'
    },
    
    # ==================== 通用錯誤 ====================
    'error.internal': {
        'zh-TW': '服務器內部錯誤',
        'zh-CN': '服务器内部错误',
        'en': 'Internal server error'
    },
    'error.bad_request': {
        'zh-TW': '請求參數錯誤',
        'zh-CN': '请求参数错误',
        'en': 'Bad request'
    },
    'error.not_found': {
        'zh-TW': '資源不存在',
        'zh-CN': '资源不存在',
        'en': 'Resource not found'
    },
    'error.rate_limited': {
        'zh-TW': '請求過於頻繁，請稍後再試',
        'zh-CN': '请求过于频繁，请稍后再试',
        'en': 'Too many requests, please try again later'
    },
    'error.service_unavailable': {
        'zh-TW': '服務暫時不可用',
        'zh-CN': '服务暂时不可用',
        'en': 'Service temporarily unavailable'
    },
    
    # ==================== 成功消息 ====================
    'success.saved': {
        'zh-TW': '保存成功',
        'zh-CN': '保存成功',
        'en': 'Saved successfully'
    },
    'success.deleted': {
        'zh-TW': '刪除成功',
        'zh-CN': '删除成功',
        'en': 'Deleted successfully'
    },
    'success.updated': {
        'zh-TW': '更新成功',
        'zh-CN': '更新成功',
        'en': 'Updated successfully'
    }
}


# ==================== 郵件模板 ====================

EMAIL_TEMPLATES_I18N = {
    'verification': {
        'zh-TW': {
            'subject': 'TG-Matrix 郵箱驗證',
            'body': '''
您好 {username}，

請使用以下驗證碼完成郵箱驗證：

{code}

此驗證碼 {expiry} 分鐘內有效。

如果您沒有請求此驗證，請忽略此郵件。

TG-Matrix 團隊
'''
        },
        'zh-CN': {
            'subject': 'TG-Matrix 邮箱验证',
            'body': '''
您好 {username}，

请使用以下验证码完成邮箱验证：

{code}

此验证码 {expiry} 分钟内有效。

如果您没有请求此验证，请忽略此邮件。

TG-Matrix 团队
'''
        },
        'en': {
            'subject': 'TG-Matrix Email Verification',
            'body': '''
Hello {username},

Please use the following code to verify your email:

{code}

This code expires in {expiry} minutes.

If you didn't request this, please ignore this email.

TG-Matrix Team
'''
        }
    },
    'password_reset': {
        'zh-TW': {
            'subject': 'TG-Matrix 密碼重置',
            'body': '''
您好 {username}，

您請求重置密碼。請點擊以下鏈接：

{reset_link}

此鏈接 {expiry} 分鐘內有效。

如果您沒有請求重置密碼，請忽略此郵件並確保您的帳戶安全。

TG-Matrix 團隊
'''
        },
        'zh-CN': {
            'subject': 'TG-Matrix 密码重置',
            'body': '''
您好 {username}，

您请求重置密码。请点击以下链接：

{reset_link}

此链接 {expiry} 分钟内有效。

如果您没有请求重置密码，请忽略此邮件并确保您的账户安全。

TG-Matrix 团队
'''
        },
        'en': {
            'subject': 'TG-Matrix Password Reset',
            'body': '''
Hello {username},

You requested a password reset. Click the link below:

{reset_link}

This link expires in {expiry} minutes.

If you didn't request this, please ignore this email and ensure your account is secure.

TG-Matrix Team
'''
        }
    },
    'quota_warning': {
        'zh-TW': {
            'subject': 'TG-Matrix 配額警告',
            'body': '''
您好 {username}，

您的 {quota_type} 使用量已達 {percentage}%。

當前使用：{current} / {limit}

請考慮升級您的方案以獲得更多配額。

TG-Matrix 團隊
'''
        },
        'zh-CN': {
            'subject': 'TG-Matrix 配额警告',
            'body': '''
您好 {username}，

您的 {quota_type} 使用量已达 {percentage}%。

当前使用：{current} / {limit}

请考虑升级您的方案以获得更多配额。

TG-Matrix 团队
'''
        },
        'en': {
            'subject': 'TG-Matrix Quota Warning',
            'body': '''
Hello {username},

Your {quota_type} usage has reached {percentage}%.

Current usage: {current} / {limit}

Consider upgrading your plan for more quota.

TG-Matrix Team
'''
        }
    }
}


# ==================== 核心函數 ====================

def get_language() -> str:
    """獲取當前語言"""
    return _current_language.get()


def set_language(lang: str) -> None:
    """設置當前語言"""
    if lang in SUPPORTED_LANGUAGES:
        _current_language.set(lang)
    else:
        _current_language.set(DEFAULT_LANGUAGE)


def detect_language(accept_language: str = None) -> str:
    """
    從 Accept-Language 頭檢測語言
    
    Accept-Language: zh-TW,zh;q=0.9,en;q=0.8
    """
    if not accept_language:
        return DEFAULT_LANGUAGE
    
    # 解析 Accept-Language
    languages = []
    for part in accept_language.split(','):
        part = part.strip()
        if ';' in part:
            lang, q = part.split(';')
            try:
                q = float(q.split('=')[1])
            except:
                q = 1.0
        else:
            lang = part
            q = 1.0
        languages.append((lang.strip(), q))
    
    # 按優先級排序
    languages.sort(key=lambda x: x[1], reverse=True)
    
    # 匹配支持的語言
    for lang, _ in languages:
        # 精確匹配
        if lang in SUPPORTED_LANGUAGES:
            return lang
        # 語言代碼匹配（如 zh 匹配 zh-TW）
        lang_code = lang.split('-')[0]
        for supported in SUPPORTED_LANGUAGES:
            if supported.startswith(lang_code):
                return supported
    
    return DEFAULT_LANGUAGE


def t(key: str, lang: str = None, **kwargs) -> str:
    """
    獲取翻譯文本
    
    Args:
        key: 翻譯鍵
        lang: 語言代碼（默認使用當前上下文語言）
        **kwargs: 插值參數
    
    Returns:
        翻譯後的文本
    """
    lang = lang or get_language()
    
    translation = TRANSLATIONS.get(key, {})
    text = translation.get(lang) or translation.get(DEFAULT_LANGUAGE) or key
    
    # 插值
    if kwargs:
        try:
            text = text.format(**kwargs)
        except KeyError:
            pass
    
    return text


def get_email_template(template_name: str, lang: str = None) -> Dict[str, str]:
    """獲取郵件模板"""
    lang = lang or get_language()
    
    templates = EMAIL_TEMPLATES_I18N.get(template_name, {})
    return templates.get(lang) or templates.get(DEFAULT_LANGUAGE) or {
        'subject': template_name,
        'body': ''
    }


# ==================== 中間件輔助 ====================

def language_middleware_helper(request) -> str:
    """從請求中提取並設置語言"""
    # 從查詢參數
    lang = request.query.get('lang')
    
    # 從 Header
    if not lang:
        lang = request.headers.get('X-Language')
    
    # 從 Accept-Language
    if not lang:
        accept_lang = request.headers.get('Accept-Language', '')
        lang = detect_language(accept_lang)
    
    # 設置上下文
    if lang:
        set_language(lang)
    
    return get_language()


# ==================== 錯誤類 ====================

class LocalizedError(Exception):
    """支持國際化的錯誤類"""
    
    def __init__(self, key: str, lang: str = None, **kwargs):
        self.key = key
        self.lang = lang
        self.kwargs = kwargs
        super().__init__(self.message)
    
    @property
    def message(self) -> str:
        return t(self.key, self.lang, **self.kwargs)
    
    def __str__(self) -> str:
        return self.message


class AuthError(LocalizedError):
    """認證錯誤"""
    pass


class QuotaError(LocalizedError):
    """配額錯誤"""
    pass


class ValidationError(LocalizedError):
    """驗證錯誤"""
    pass
