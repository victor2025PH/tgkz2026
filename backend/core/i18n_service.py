"""
國際化服務 (i18n)

功能：
1. 多語言翻譯管理
2. 語言包加載
3. 動態語言切換
4. 翻譯回退機制
"""

import os
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
import threading

logger = logging.getLogger(__name__)


# ==================== 支援的語言 ====================

SUPPORTED_LANGUAGES = {
    'zh-TW': {'name': '繁體中文', 'native': '繁體中文', 'rtl': False},
    'zh-CN': {'name': '簡體中文', 'native': '简体中文', 'rtl': False},
    'en': {'name': 'English', 'native': 'English', 'rtl': False},
    'ja': {'name': 'Japanese', 'native': '日本語', 'rtl': False},
    'ko': {'name': 'Korean', 'native': '한국어', 'rtl': False},
    'vi': {'name': 'Vietnamese', 'native': 'Tiếng Việt', 'rtl': False},
    'th': {'name': 'Thai', 'native': 'ไทย', 'rtl': False},
    'ru': {'name': 'Russian', 'native': 'Русский', 'rtl': False},
}

DEFAULT_LANGUAGE = 'zh-TW'


# ==================== 內建翻譯 ====================

BUILTIN_TRANSLATIONS = {
    'zh-TW': {
        # 通用
        'common.success': '成功',
        'common.error': '錯誤',
        'common.loading': '載入中...',
        'common.save': '儲存',
        'common.cancel': '取消',
        'common.confirm': '確認',
        'common.delete': '刪除',
        'common.edit': '編輯',
        'common.search': '搜尋',
        'common.filter': '篩選',
        'common.refresh': '重新整理',
        'common.back': '返回',
        'common.next': '下一步',
        'common.previous': '上一步',
        'common.submit': '提交',
        'common.reset': '重置',
        
        # 認證
        'auth.login': '登入',
        'auth.logout': '登出',
        'auth.register': '註冊',
        'auth.email': '電子郵件',
        'auth.password': '密碼',
        'auth.forgot_password': '忘記密碼',
        'auth.reset_password': '重置密碼',
        'auth.login_success': '登入成功',
        'auth.login_failed': '登入失敗',
        'auth.invalid_credentials': '帳號或密碼錯誤',
        'auth.session_expired': '登入已過期，請重新登入',
        
        # 訂閱
        'subscription.upgrade': '升級訂閱',
        'subscription.downgrade': '降級訂閱',
        'subscription.pause': '暫停訂閱',
        'subscription.resume': '恢復訂閱',
        'subscription.cancel': '取消訂閱',
        'subscription.renew': '續費',
        'subscription.expires_in': '訂閱將在 {days} 天後到期',
        'subscription.expired': '訂閱已過期',
        'subscription.trial_ends': '試用期將在 {days} 天後結束',
        
        # 配額
        'quota.exceeded': '配額已用完',
        'quota.warning': '配額使用已達 {percent}%',
        'quota.remaining': '剩餘 {count} 次',
        'quota.daily_reset': '每日配額將在 {time} 重置',
        'quota.upgrade_to_unlock': '升級以解鎖更多配額',
        
        # 計費
        'billing.invoice': '發票',
        'billing.payment': '支付',
        'billing.refund': '退款',
        'billing.amount': '金額',
        'billing.status': '狀態',
        'billing.paid': '已支付',
        'billing.pending': '待支付',
        'billing.failed': '支付失敗',
        'billing.payment_method': '支付方式',
        
        # 通知
        'notification.mark_read': '標記為已讀',
        'notification.mark_all_read': '全部已讀',
        'notification.no_notifications': '暫無通知',
        'notification.settings': '通知設置',
        
        # 錯誤
        'error.network': '網絡連接失敗',
        'error.server': '服務器錯誤',
        'error.timeout': '請求超時',
        'error.unauthorized': '請先登入',
        'error.forbidden': '沒有權限',
        'error.not_found': '找不到資源',
        'error.validation': '輸入資料有誤',
        
        # 時間
        'time.just_now': '剛剛',
        'time.minutes_ago': '{count} 分鐘前',
        'time.hours_ago': '{count} 小時前',
        'time.days_ago': '{count} 天前',
        'time.months_ago': '{count} 個月前',
        'time.years_ago': '{count} 年前',
    },
    
    'zh-CN': {
        # 通用
        'common.success': '成功',
        'common.error': '错误',
        'common.loading': '加载中...',
        'common.save': '保存',
        'common.cancel': '取消',
        'common.confirm': '确认',
        'common.delete': '删除',
        'common.edit': '编辑',
        'common.search': '搜索',
        'common.filter': '筛选',
        'common.refresh': '刷新',
        'common.back': '返回',
        'common.next': '下一步',
        'common.previous': '上一步',
        'common.submit': '提交',
        'common.reset': '重置',
        
        # 認證
        'auth.login': '登录',
        'auth.logout': '退出登录',
        'auth.register': '注册',
        'auth.email': '电子邮件',
        'auth.password': '密码',
        'auth.forgot_password': '忘记密码',
        'auth.reset_password': '重置密码',
        'auth.login_success': '登录成功',
        'auth.login_failed': '登录失败',
        'auth.invalid_credentials': '账号或密码错误',
        'auth.session_expired': '登录已过期，请重新登录',
        
        # 訂閱
        'subscription.upgrade': '升级订阅',
        'subscription.downgrade': '降级订阅',
        'subscription.pause': '暂停订阅',
        'subscription.resume': '恢复订阅',
        'subscription.cancel': '取消订阅',
        'subscription.renew': '续费',
        'subscription.expires_in': '订阅将在 {days} 天后到期',
        'subscription.expired': '订阅已过期',
        'subscription.trial_ends': '试用期将在 {days} 天后结束',
        
        # 配額
        'quota.exceeded': '配额已用完',
        'quota.warning': '配额使用已达 {percent}%',
        'quota.remaining': '剩余 {count} 次',
        'quota.daily_reset': '每日配额将在 {time} 重置',
        'quota.upgrade_to_unlock': '升级以解锁更多配额',
        
        # 計費
        'billing.invoice': '发票',
        'billing.payment': '支付',
        'billing.refund': '退款',
        'billing.amount': '金额',
        'billing.status': '状态',
        'billing.paid': '已支付',
        'billing.pending': '待支付',
        'billing.failed': '支付失败',
        'billing.payment_method': '支付方式',
        
        # 通知
        'notification.mark_read': '标记为已读',
        'notification.mark_all_read': '全部已读',
        'notification.no_notifications': '暂无通知',
        'notification.settings': '通知设置',
        
        # 錯誤
        'error.network': '网络连接失败',
        'error.server': '服务器错误',
        'error.timeout': '请求超时',
        'error.unauthorized': '请先登录',
        'error.forbidden': '没有权限',
        'error.not_found': '找不到资源',
        'error.validation': '输入数据有误',
        
        # 時間
        'time.just_now': '刚刚',
        'time.minutes_ago': '{count} 分钟前',
        'time.hours_ago': '{count} 小时前',
        'time.days_ago': '{count} 天前',
        'time.months_ago': '{count} 个月前',
        'time.years_ago': '{count} 年前',
    },
    
    'en': {
        # Common
        'common.success': 'Success',
        'common.error': 'Error',
        'common.loading': 'Loading...',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.confirm': 'Confirm',
        'common.delete': 'Delete',
        'common.edit': 'Edit',
        'common.search': 'Search',
        'common.filter': 'Filter',
        'common.refresh': 'Refresh',
        'common.back': 'Back',
        'common.next': 'Next',
        'common.previous': 'Previous',
        'common.submit': 'Submit',
        'common.reset': 'Reset',
        
        # Auth
        'auth.login': 'Login',
        'auth.logout': 'Logout',
        'auth.register': 'Register',
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.forgot_password': 'Forgot Password',
        'auth.reset_password': 'Reset Password',
        'auth.login_success': 'Login successful',
        'auth.login_failed': 'Login failed',
        'auth.invalid_credentials': 'Invalid email or password',
        'auth.session_expired': 'Session expired, please login again',
        
        # Subscription
        'subscription.upgrade': 'Upgrade Subscription',
        'subscription.downgrade': 'Downgrade Subscription',
        'subscription.pause': 'Pause Subscription',
        'subscription.resume': 'Resume Subscription',
        'subscription.cancel': 'Cancel Subscription',
        'subscription.renew': 'Renew',
        'subscription.expires_in': 'Subscription expires in {days} days',
        'subscription.expired': 'Subscription expired',
        'subscription.trial_ends': 'Trial ends in {days} days',
        
        # Quota
        'quota.exceeded': 'Quota exceeded',
        'quota.warning': 'Quota usage at {percent}%',
        'quota.remaining': '{count} remaining',
        'quota.daily_reset': 'Daily quota resets at {time}',
        'quota.upgrade_to_unlock': 'Upgrade to unlock more quota',
        
        # Billing
        'billing.invoice': 'Invoice',
        'billing.payment': 'Payment',
        'billing.refund': 'Refund',
        'billing.amount': 'Amount',
        'billing.status': 'Status',
        'billing.paid': 'Paid',
        'billing.pending': 'Pending',
        'billing.failed': 'Payment Failed',
        'billing.payment_method': 'Payment Method',
        
        # Notification
        'notification.mark_read': 'Mark as read',
        'notification.mark_all_read': 'Mark all as read',
        'notification.no_notifications': 'No notifications',
        'notification.settings': 'Notification Settings',
        
        # Error
        'error.network': 'Network connection failed',
        'error.server': 'Server error',
        'error.timeout': 'Request timeout',
        'error.unauthorized': 'Please login first',
        'error.forbidden': 'Access denied',
        'error.not_found': 'Resource not found',
        'error.validation': 'Validation error',
        
        # Time
        'time.just_now': 'Just now',
        'time.minutes_ago': '{count} minutes ago',
        'time.hours_ago': '{count} hours ago',
        'time.days_ago': '{count} days ago',
        'time.months_ago': '{count} months ago',
        'time.years_ago': '{count} years ago',
    },
    
    'ja': {
        # 通用
        'common.success': '成功',
        'common.error': 'エラー',
        'common.loading': '読み込み中...',
        'common.save': '保存',
        'common.cancel': 'キャンセル',
        'common.confirm': '確認',
        'common.delete': '削除',
        'common.edit': '編集',
        'common.search': '検索',
        'common.filter': 'フィルター',
        'common.refresh': '更新',
        'common.back': '戻る',
        'common.next': '次へ',
        'common.previous': '前へ',
        'common.submit': '送信',
        'common.reset': 'リセット',
        
        # 認証
        'auth.login': 'ログイン',
        'auth.logout': 'ログアウト',
        'auth.register': '登録',
        'auth.email': 'メールアドレス',
        'auth.password': 'パスワード',
        'auth.forgot_password': 'パスワードをお忘れですか',
        'auth.reset_password': 'パスワードをリセット',
        'auth.login_success': 'ログイン成功',
        'auth.login_failed': 'ログイン失敗',
        'auth.invalid_credentials': 'メールアドレスまたはパスワードが間違っています',
        'auth.session_expired': 'セッションが期限切れです。再ログインしてください',
        
        # Quota
        'quota.exceeded': 'クォータを超えました',
        'quota.warning': 'クォータ使用率が {percent}% に達しました',
        'quota.remaining': '残り {count} 回',
        
        # Notification
        'notification.mark_read': '既読にする',
        'notification.mark_all_read': 'すべて既読にする',
        'notification.no_notifications': '通知はありません',
        
        # Error
        'error.network': 'ネットワーク接続に失敗しました',
        'error.server': 'サーバーエラー',
        'error.timeout': 'タイムアウト',
        'error.unauthorized': 'ログインしてください',
        
        # Time
        'time.just_now': 'たった今',
        'time.minutes_ago': '{count}分前',
        'time.hours_ago': '{count}時間前',
        'time.days_ago': '{count}日前',
    },
}


@dataclass
class TranslationContext:
    """翻譯上下文"""
    language: str
    fallback_language: str = DEFAULT_LANGUAGE
    user_id: str = ''


class I18nService:
    """國際化服務"""
    
    _instance: Optional['I18nService'] = None
    _lock = threading.Lock()
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        # 翻譯緩存
        self._translations: Dict[str, Dict[str, str]] = {}
        
        # 加載內建翻譯
        self._load_builtin_translations()
        
        # 用戶語言偏好緩存
        self._user_languages: Dict[str, str] = {}
        
        self._initialized = True
        logger.info("I18nService initialized")
    
    def _load_builtin_translations(self):
        """加載內建翻譯"""
        for lang, translations in BUILTIN_TRANSLATIONS.items():
            if lang not in self._translations:
                self._translations[lang] = {}
            self._translations[lang].update(translations)
    
    def load_translations_from_file(self, language: str, file_path: str):
        """從文件加載翻譯"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                translations = json.load(f)
            
            if language not in self._translations:
                self._translations[language] = {}
            self._translations[language].update(translations)
            
            logger.info(f"Loaded translations for {language} from {file_path}")
        except Exception as e:
            logger.error(f"Load translations error: {e}")
    
    def get_supported_languages(self) -> List[Dict[str, Any]]:
        """獲取支援的語言列表"""
        return [
            {'code': code, **info}
            for code, info in SUPPORTED_LANGUAGES.items()
        ]
    
    def is_supported(self, language: str) -> bool:
        """檢查語言是否支援"""
        return language in SUPPORTED_LANGUAGES
    
    def translate(
        self,
        key: str,
        language: str = None,
        params: Dict[str, Any] = None,
        fallback: str = None
    ) -> str:
        """翻譯文本"""
        language = language or DEFAULT_LANGUAGE
        params = params or {}
        
        # 嘗試獲取翻譯
        text = self._get_translation(key, language)
        
        # 回退到默認語言
        if text is None and language != DEFAULT_LANGUAGE:
            text = self._get_translation(key, DEFAULT_LANGUAGE)
        
        # 回退到英文
        if text is None and language != 'en':
            text = self._get_translation(key, 'en')
        
        # 使用提供的回退或 key 本身
        if text is None:
            text = fallback or key
        
        # 替換參數
        try:
            for param_key, param_value in params.items():
                text = text.replace(f'{{{param_key}}}', str(param_value))
        except Exception:
            pass
        
        return text
    
    def _get_translation(self, key: str, language: str) -> Optional[str]:
        """從緩存獲取翻譯"""
        if language in self._translations:
            return self._translations[language].get(key)
        return None
    
    def t(self, key: str, language: str = None, **params) -> str:
        """translate 的簡短別名"""
        return self.translate(key, language, params)
    
    def set_user_language(self, user_id: str, language: str):
        """設置用戶語言偏好"""
        if self.is_supported(language):
            self._user_languages[user_id] = language
    
    def get_user_language(self, user_id: str) -> str:
        """獲取用戶語言偏好"""
        return self._user_languages.get(user_id, DEFAULT_LANGUAGE)
    
    def detect_language(self, accept_language: str) -> str:
        """從 Accept-Language 頭檢測語言"""
        if not accept_language:
            return DEFAULT_LANGUAGE
        
        # 解析 Accept-Language
        languages = []
        for part in accept_language.split(','):
            lang = part.strip().split(';')[0].strip()
            if lang:
                languages.append(lang)
        
        # 匹配支援的語言
        for lang in languages:
            # 完全匹配
            if lang in SUPPORTED_LANGUAGES:
                return lang
            
            # 語言碼匹配（如 zh 匹配 zh-TW）
            lang_prefix = lang.split('-')[0]
            for supported in SUPPORTED_LANGUAGES:
                if supported.startswith(lang_prefix):
                    return supported
        
        return DEFAULT_LANGUAGE
    
    def get_all_translations(self, language: str) -> Dict[str, str]:
        """獲取某語言的所有翻譯"""
        return self._translations.get(language, {}).copy()
    
    def add_translation(self, language: str, key: str, value: str):
        """添加單個翻譯"""
        if language not in self._translations:
            self._translations[language] = {}
        self._translations[language][key] = value
    
    def batch_add_translations(self, language: str, translations: Dict[str, str]):
        """批量添加翻譯"""
        if language not in self._translations:
            self._translations[language] = {}
        self._translations[language].update(translations)
    
    def format_number(self, value: float, language: str = None) -> str:
        """格式化數字"""
        language = language or DEFAULT_LANGUAGE
        
        if language in ['zh-TW', 'zh-CN', 'ja']:
            # 中日韓使用萬為單位
            if value >= 10000:
                return f'{value / 10000:.1f}萬'
        
        # 西方使用 K, M
        if value >= 1000000:
            return f'{value / 1000000:.1f}M'
        elif value >= 1000:
            return f'{value / 1000:.1f}K'
        
        return str(int(value))
    
    def format_currency(
        self,
        amount: int,
        currency: str = 'CNY',
        language: str = None
    ) -> str:
        """格式化貨幣"""
        language = language or DEFAULT_LANGUAGE
        
        # 金額從分轉換為元
        value = amount / 100
        
        currency_symbols = {
            'CNY': '¥',
            'USD': '$',
            'EUR': '€',
            'JPY': '¥',
            'TWD': 'NT$',
        }
        
        symbol = currency_symbols.get(currency, currency)
        return f'{symbol}{value:.2f}'
    
    def relative_time(self, dt: datetime, language: str = None) -> str:
        """相對時間描述"""
        language = language or DEFAULT_LANGUAGE
        now = datetime.utcnow()
        diff = now - dt
        
        seconds = diff.total_seconds()
        
        if seconds < 60:
            return self.t('time.just_now', language)
        elif seconds < 3600:
            count = int(seconds / 60)
            return self.t('time.minutes_ago', language, count=count)
        elif seconds < 86400:
            count = int(seconds / 3600)
            return self.t('time.hours_ago', language, count=count)
        elif seconds < 2592000:
            count = int(seconds / 86400)
            return self.t('time.days_ago', language, count=count)
        elif seconds < 31536000:
            count = int(seconds / 2592000)
            return self.t('time.months_ago', language, count=count)
        else:
            count = int(seconds / 31536000)
            return self.t('time.years_ago', language, count=count)


# ==================== 單例訪問 ====================

_i18n_service: Optional[I18nService] = None


def get_i18n_service() -> I18nService:
    """獲取 i18n 服務"""
    global _i18n_service
    if _i18n_service is None:
        _i18n_service = I18nService()
    return _i18n_service


def t(key: str, language: str = None, **params) -> str:
    """翻譯快捷函數"""
    return get_i18n_service().translate(key, language, params)
