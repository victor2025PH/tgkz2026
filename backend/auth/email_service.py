"""
郵件發送服務

支持多種郵件發送方式：
1. SMTP（Gmail、企業郵箱）
2. SendGrid API
3. Resend API（推薦）

安全特性：
1. 驗證碼有效期限制
2. 發送頻率限制
3. 模板化郵件內容
"""

import os
import ssl
import logging
import asyncio
import secrets
import hashlib
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)


@dataclass
class EmailConfig:
    """郵件配置"""
    provider: str = 'smtp'  # smtp, sendgrid, resend
    
    # SMTP 配置
    smtp_host: str = ''
    smtp_port: int = 587
    smtp_user: str = ''
    smtp_password: str = ''
    smtp_use_tls: bool = True
    
    # API 配置（SendGrid/Resend）
    api_key: str = ''
    
    # 發送者信息
    from_email: str = ''
    from_name: str = 'TG-AI 智控王'
    
    # 應用配置
    app_name: str = 'TG-AI 智控王'
    app_url: str = ''
    
    @classmethod
    def from_env(cls) -> 'EmailConfig':
        """從環境變量加載配置"""
        return cls(
            provider=os.environ.get('EMAIL_PROVIDER', 'smtp'),
            smtp_host=os.environ.get('SMTP_HOST', 'smtp.gmail.com'),
            smtp_port=int(os.environ.get('SMTP_PORT', '587')),
            smtp_user=os.environ.get('SMTP_USER', ''),
            smtp_password=os.environ.get('SMTP_PASSWORD', ''),
            smtp_use_tls=os.environ.get('SMTP_USE_TLS', 'true').lower() == 'true',
            api_key=os.environ.get('EMAIL_API_KEY', ''),
            from_email=os.environ.get('EMAIL_FROM', ''),
            from_name=os.environ.get('EMAIL_FROM_NAME', 'TG-AI 智控王'),
            app_name=os.environ.get('APP_NAME', 'TG-AI 智控王'),
            app_url=os.environ.get('APP_URL', 'https://tgkz.example.com')
        )


class EmailProvider(ABC):
    """郵件提供者抽象基類"""
    
    @abstractmethod
    async def send(
        self, 
        to_email: str, 
        subject: str, 
        html_content: str,
        text_content: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        發送郵件
        
        Returns:
            (success, error_message)
        """
        pass


class SMTPProvider(EmailProvider):
    """SMTP 郵件提供者"""
    
    def __init__(self, config: EmailConfig):
        self.config = config
    
    async def send(
        self, 
        to_email: str, 
        subject: str, 
        html_content: str,
        text_content: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        try:
            import smtplib
            
            # 創建郵件
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.config.from_name} <{self.config.from_email}>"
            msg['To'] = to_email
            
            # 純文本版本
            if text_content:
                msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
            
            # HTML 版本
            msg.attach(MIMEText(html_content, 'html', 'utf-8'))
            
            # 在線程池中發送（避免阻塞）
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._send_sync, msg, to_email)
            
            logger.info(f"Email sent to {to_email}")
            return True, None
            
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False, str(e)
    
    def _send_sync(self, msg: MIMEMultipart, to_email: str):
        """同步發送郵件"""
        import smtplib
        
        if self.config.smtp_use_tls:
            context = ssl.create_default_context()
            with smtplib.SMTP(self.config.smtp_host, self.config.smtp_port) as server:
                server.starttls(context=context)
                server.login(self.config.smtp_user, self.config.smtp_password)
                server.sendmail(self.config.from_email, to_email, msg.as_string())
        else:
            with smtplib.SMTP_SSL(self.config.smtp_host, self.config.smtp_port) as server:
                server.login(self.config.smtp_user, self.config.smtp_password)
                server.sendmail(self.config.from_email, to_email, msg.as_string())


class ResendProvider(EmailProvider):
    """Resend API 提供者（推薦用於生產環境）"""
    
    def __init__(self, config: EmailConfig):
        self.config = config
        self.api_url = 'https://api.resend.com/emails'
    
    async def send(
        self, 
        to_email: str, 
        subject: str, 
        html_content: str,
        text_content: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        try:
            import aiohttp
            
            payload = {
                'from': f"{self.config.from_name} <{self.config.from_email}>",
                'to': [to_email],
                'subject': subject,
                'html': html_content
            }
            
            if text_content:
                payload['text'] = text_content
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    json=payload,
                    headers={
                        'Authorization': f'Bearer {self.config.api_key}',
                        'Content-Type': 'application/json'
                    }
                ) as response:
                    if response.status == 200:
                        logger.info(f"Email sent to {to_email} via Resend")
                        return True, None
                    else:
                        error = await response.text()
                        logger.error(f"Resend API error: {error}")
                        return False, error
                        
        except Exception as e:
            logger.error(f"Failed to send email via Resend: {e}")
            return False, str(e)


class EmailService:
    """
    郵件服務
    
    統一管理郵件發送、模板渲染、頻率限制
    """
    
    # 驗證碼有效期（分鐘）
    VERIFICATION_CODE_EXPIRY = 30
    PASSWORD_RESET_EXPIRY = 15
    
    # 發送頻率限制（秒）
    RATE_LIMIT_SECONDS = 60
    
    def __init__(self, config: Optional[EmailConfig] = None):
        self.config = config or EmailConfig.from_env()
        self.provider = self._create_provider()
        
        # 頻率限制緩存（生產環境應使用 Redis）
        self._rate_limit_cache: Dict[str, datetime] = {}
    
    def _create_provider(self) -> EmailProvider:
        """根據配置創建郵件提供者"""
        if self.config.provider == 'resend':
            return ResendProvider(self.config)
        else:
            return SMTPProvider(self.config)
    
    def generate_verification_token(self) -> str:
        """生成安全的驗證 Token"""
        return secrets.token_urlsafe(32)
    
    def generate_verification_code(self) -> str:
        """生成 6 位數字驗證碼"""
        return ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    def hash_token(self, token: str) -> str:
        """哈希 Token 用於存儲"""
        return hashlib.sha256(token.encode()).hexdigest()
    
    def check_rate_limit(self, email: str, action: str) -> Tuple[bool, int]:
        """
        檢查發送頻率限制
        
        Returns:
            (can_send, seconds_until_next)
        """
        key = f"{email}:{action}"
        last_sent = self._rate_limit_cache.get(key)
        
        if last_sent:
            elapsed = (datetime.now() - last_sent).total_seconds()
            if elapsed < self.RATE_LIMIT_SECONDS:
                remaining = int(self.RATE_LIMIT_SECONDS - elapsed)
                return False, remaining
        
        return True, 0
    
    def record_send(self, email: str, action: str):
        """記錄發送時間"""
        key = f"{email}:{action}"
        self._rate_limit_cache[key] = datetime.now()
    
    # ==================== 郵件模板 ====================
    
    def _base_template(self, content: str, title: str = '') -> str:
        """基礎郵件模板"""
        return f'''
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background-color: #0f0f0f;
            color: #ffffff;
            margin: 0;
            padding: 20px;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
        }}
        .logo {{
            text-align: center;
            margin-bottom: 30px;
        }}
        .logo h1 {{
            color: #3b82f6;
            font-size: 24px;
            margin: 0;
        }}
        .content {{
            color: #e0e0e0;
            line-height: 1.6;
        }}
        .button {{
            display: inline-block;
            padding: 14px 32px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
        }}
        .code {{
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #3b82f6;
            text-align: center;
            padding: 20px;
            background: rgba(59, 130, 246, 0.1);
            border-radius: 8px;
            margin: 20px 0;
        }}
        .footer {{
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #333;
        }}
        .warning {{
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 8px;
            padding: 12px;
            color: #f87171;
            font-size: 13px;
            margin-top: 20px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <h1>🤖 {self.config.app_name}</h1>
        </div>
        <div class="content">
            {content}
        </div>
        <div class="footer">
            <p>此郵件由系統自動發送，請勿回復</p>
            <p>© 2024 {self.config.app_name}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
'''
    
    def verification_email_template(
        self, 
        username: str, 
        verification_url: str,
        code: str = None
    ) -> Tuple[str, str]:
        """
        郵箱驗證郵件模板
        
        Returns:
            (html_content, text_content)
        """
        if code:
            code_section = f'''
            <p>您的驗證碼是：</p>
            <div class="code">{code}</div>
            <p>或者點擊下方按鈕完成驗證：</p>
            '''
        else:
            code_section = '<p>請點擊下方按鈕完成郵箱驗證：</p>'
        
        html_content = self._base_template(f'''
            <h2>👋 您好，{username}！</h2>
            <p>感謝您註冊 {self.config.app_name}。</p>
            {code_section}
            <p style="text-align: center;">
                <a href="{verification_url}" class="button">驗證郵箱</a>
            </p>
            <p>此鏈接將在 {self.VERIFICATION_CODE_EXPIRY} 分鐘後過期。</p>
            <div class="warning">
                ⚠️ 如果您沒有註冊帳號，請忽略此郵件。
            </div>
        ''', '驗證您的郵箱')
        
        text_content = f'''
您好，{username}！

感謝您註冊 {self.config.app_name}。

請訪問以下鏈接驗證您的郵箱：
{verification_url}

{f"或使用驗證碼：{code}" if code else ""}

此鏈接將在 {self.VERIFICATION_CODE_EXPIRY} 分鐘後過期。

如果您沒有註冊帳號，請忽略此郵件。

{self.config.app_name}
'''
        return html_content, text_content
    
    def password_reset_template(
        self, 
        username: str, 
        reset_url: str,
        code: str = None
    ) -> Tuple[str, str]:
        """
        密碼重置郵件模板
        
        Returns:
            (html_content, text_content)
        """
        if code:
            code_section = f'''
            <p>您的重置驗證碼是：</p>
            <div class="code">{code}</div>
            <p>或者點擊下方按鈕重置密碼：</p>
            '''
        else:
            code_section = '<p>請點擊下方按鈕重置密碼：</p>'
        
        html_content = self._base_template(f'''
            <h2>🔐 密碼重置請求</h2>
            <p>您好，{username}！</p>
            <p>我們收到了您的密碼重置請求。</p>
            {code_section}
            <p style="text-align: center;">
                <a href="{reset_url}" class="button">重置密碼</a>
            </p>
            <p>此鏈接將在 {self.PASSWORD_RESET_EXPIRY} 分鐘後過期。</p>
            <div class="warning">
                ⚠️ 如果您沒有請求重置密碼，請忽略此郵件並確保帳號安全。
            </div>
        ''', '重置您的密碼')
        
        text_content = f'''
您好，{username}！

我們收到了您的密碼重置請求。

請訪問以下鏈接重置密碼：
{reset_url}

{f"或使用驗證碼：{code}" if code else ""}

此鏈接將在 {self.PASSWORD_RESET_EXPIRY} 分鐘後過期。

如果您沒有請求重置密碼，請忽略此郵件。

{self.config.app_name}
'''
        return html_content, text_content
    
    def welcome_email_template(self, username: str) -> Tuple[str, str]:
        """歡迎郵件模板"""
        html_content = self._base_template(f'''
            <h2>🎉 歡迎加入 {self.config.app_name}！</h2>
            <p>您好，{username}！</p>
            <p>您的帳號已成功驗證。現在您可以開始使用所有功能了！</p>
            <p style="text-align: center;">
                <a href="{self.config.app_url}" class="button">開始使用</a>
            </p>
            <h3>📚 快速入門</h3>
            <ul>
                <li>添加您的 Telegram 帳號</li>
                <li>設置自動化營銷任務</li>
                <li>使用 AI 助手提升效率</li>
            </ul>
            <p>如有任何問題，請隨時聯繫我們的支持團隊。</p>
        ''', f'歡迎加入 {self.config.app_name}')
        
        text_content = f'''
歡迎加入 {self.config.app_name}！

您好，{username}！

您的帳號已成功驗證。現在您可以開始使用所有功能了！

訪問：{self.config.app_url}

如有任何問題，請隨時聯繫我們的支持團隊。

{self.config.app_name}
'''
        return html_content, text_content
    
    # ==================== 發送方法 ====================
    
    async def send_verification_email(
        self, 
        to_email: str, 
        username: str,
        token: str,
        code: str = None
    ) -> Tuple[bool, Optional[str]]:
        """
        發送郵箱驗證郵件
        
        Args:
            to_email: 收件人郵箱
            username: 用戶名
            token: 驗證 Token
            code: 可選的數字驗證碼
        """
        # 檢查頻率限制
        can_send, wait_seconds = self.check_rate_limit(to_email, 'verification')
        if not can_send:
            return False, f'請等待 {wait_seconds} 秒後再試'
        
        # 構建驗證 URL
        verification_url = f"{self.config.app_url}/auth/verify-email?token={token}"
        
        # 生成郵件內容
        html_content, text_content = self.verification_email_template(
            username, verification_url, code
        )
        
        # 發送郵件
        success, error = await self.provider.send(
            to_email,
            f'驗證您的 {self.config.app_name} 帳號',
            html_content,
            text_content
        )
        
        if success:
            self.record_send(to_email, 'verification')
        
        return success, error
    
    async def send_password_reset_email(
        self, 
        to_email: str, 
        username: str,
        token: str,
        code: str = None
    ) -> Tuple[bool, Optional[str]]:
        """發送密碼重置郵件"""
        # 檢查頻率限制
        can_send, wait_seconds = self.check_rate_limit(to_email, 'password_reset')
        if not can_send:
            return False, f'請等待 {wait_seconds} 秒後再試'
        
        # 構建重置 URL
        reset_url = f"{self.config.app_url}/auth/reset-password?token={token}"
        
        # 生成郵件內容
        html_content, text_content = self.password_reset_template(
            username, reset_url, code
        )
        
        # 發送郵件
        success, error = await self.provider.send(
            to_email,
            f'重置您的 {self.config.app_name} 密碼',
            html_content,
            text_content
        )
        
        if success:
            self.record_send(to_email, 'password_reset')
        
        return success, error
    
    async def send_welcome_email(
        self, 
        to_email: str, 
        username: str
    ) -> Tuple[bool, Optional[str]]:
        """發送歡迎郵件"""
        html_content, text_content = self.welcome_email_template(username)
        
        return await self.provider.send(
            to_email,
            f'歡迎加入 {self.config.app_name}！',
            html_content,
            text_content
        )


# 全局服務實例
_email_service: Optional[EmailService] = None


def get_email_service() -> EmailService:
    """獲取郵件服務實例"""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service


def init_email_service(config: EmailConfig) -> EmailService:
    """初始化郵件服務"""
    global _email_service
    _email_service = EmailService(config)
    return _email_service
