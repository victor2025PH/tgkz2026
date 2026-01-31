"""
郵件服務

優化設計：
1. 支持多種郵件提供商（SMTP、SendGrid、AWS SES）
2. 郵件模板系統
3. 異步發送
4. 發送記錄和重試
"""

import os
import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime
import logging
import json

logger = logging.getLogger(__name__)


@dataclass
class EmailConfig:
    """郵件配置"""
    provider: str = 'smtp'  # smtp, sendgrid, ses
    
    # SMTP 配置
    smtp_host: str = ''
    smtp_port: int = 587
    smtp_user: str = ''
    smtp_password: str = ''
    smtp_use_tls: bool = True
    
    # SendGrid 配置
    sendgrid_api_key: str = ''
    
    # AWS SES 配置
    ses_region: str = 'us-east-1'
    ses_access_key: str = ''
    ses_secret_key: str = ''
    
    # 發送者信息
    from_email: str = 'noreply@tg-matrix.com'
    from_name: str = 'TG-Matrix'
    
    @classmethod
    def from_env(cls) -> 'EmailConfig':
        """從環境變量加載配置"""
        return cls(
            provider=os.environ.get('EMAIL_PROVIDER', 'smtp'),
            smtp_host=os.environ.get('SMTP_HOST', ''),
            smtp_port=int(os.environ.get('SMTP_PORT', '587')),
            smtp_user=os.environ.get('SMTP_USER', ''),
            smtp_password=os.environ.get('SMTP_PASSWORD', ''),
            smtp_use_tls=os.environ.get('SMTP_USE_TLS', 'true').lower() == 'true',
            sendgrid_api_key=os.environ.get('SENDGRID_API_KEY', ''),
            ses_region=os.environ.get('AWS_REGION', 'us-east-1'),
            ses_access_key=os.environ.get('AWS_ACCESS_KEY_ID', ''),
            ses_secret_key=os.environ.get('AWS_SECRET_ACCESS_KEY', ''),
            from_email=os.environ.get('EMAIL_FROM', 'noreply@tg-matrix.com'),
            from_name=os.environ.get('EMAIL_FROM_NAME', 'TG-Matrix')
        )


# 郵件模板
EMAIL_TEMPLATES = {
    'verification': {
        'subject': '驗證您的 TG-Matrix 帳戶',
        'html': '''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 32px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { padding: 32px; }
        .code { background: #f0f4f8; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0; }
        .code span { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a; }
        .button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
        .footer { padding: 24px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📱 TG-Matrix</h1>
        </div>
        <div class="content">
            <h2>驗證您的電子郵件</h2>
            <p>感謝您註冊 TG-Matrix！請使用以下驗證碼完成註冊：</p>
            <div class="code">
                <span>{{code}}</span>
            </div>
            <p>驗證碼將在 10 分鐘後過期。</p>
            <p>如果您沒有請求此驗證碼，請忽略此郵件。</p>
        </div>
        <div class="footer">
            <p>&copy; 2026 TG-Matrix. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        ''',
        'text': '''
TG-Matrix 驗證碼

您的驗證碼是：{{code}}

驗證碼將在 10 分鐘後過期。

如果您沒有請求此驗證碼，請忽略此郵件。
        '''
    },
    'password_reset': {
        'subject': '重置您的 TG-Matrix 密碼',
        'html': '''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 32px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { padding: 32px; }
        .button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
        .footer { padding: 24px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📱 TG-Matrix</h1>
        </div>
        <div class="content">
            <h2>重置您的密碼</h2>
            <p>我們收到了重置您密碼的請求。點擊下方按鈕設置新密碼：</p>
            <p style="text-align: center; margin: 32px 0;">
                <a href="{{reset_link}}" class="button">重置密碼</a>
            </p>
            <p>此鏈接將在 1 小時後過期。</p>
            <p>如果您沒有請求重置密碼，請忽略此郵件，您的密碼不會被更改。</p>
        </div>
        <div class="footer">
            <p>&copy; 2026 TG-Matrix. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        ''',
        'text': '''
TG-Matrix 密碼重置

點擊以下鏈接重置密碼：
{{reset_link}}

此鏈接將在 1 小時後過期。

如果您沒有請求重置密碼，請忽略此郵件。
        '''
    },
    'welcome': {
        'subject': '歡迎加入 TG-Matrix！',
        'html': '''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 32px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { padding: 32px; }
        .feature { display: flex; align-items: center; gap: 16px; margin: 16px 0; }
        .feature-icon { font-size: 24px; }
        .button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
        .footer { padding: 24px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📱 歡迎加入 TG-Matrix！</h1>
        </div>
        <div class="content">
            <h2>Hi {{name}}，</h2>
            <p>感謝您選擇 TG-Matrix！以下是您可以開始使用的功能：</p>
            
            <div class="feature">
                <span class="feature-icon">🤖</span>
                <div>
                    <strong>AI 智能對話</strong>
                    <p style="margin: 4px 0; color: #666;">讓 AI 幫您自動回覆消息</p>
                </div>
            </div>
            
            <div class="feature">
                <span class="feature-icon">📊</span>
                <div>
                    <strong>數據分析</strong>
                    <p style="margin: 4px 0; color: #666;">深度洞察用戶行為</p>
                </div>
            </div>
            
            <div class="feature">
                <span class="feature-icon">🔄</span>
                <div>
                    <strong>自動化營銷</strong>
                    <p style="margin: 4px 0; color: #666;">批量操作，效率倍增</p>
                </div>
            </div>
            
            <p style="text-align: center; margin: 32px 0;">
                <a href="{{dashboard_link}}" class="button">開始使用</a>
            </p>
        </div>
        <div class="footer">
            <p>&copy; 2026 TG-Matrix. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        ''',
        'text': '''
歡迎加入 TG-Matrix！

Hi {{name}}，

感謝您選擇 TG-Matrix！您現在可以：

- 使用 AI 智能對話自動回覆消息
- 查看數據分析洞察用戶行為
- 使用自動化營銷提升效率

開始使用：{{dashboard_link}}
        '''
    },
    'quota_warning': {
        'subject': 'TG-Matrix 配額提醒',
        'html': '''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; }
        .header { background: #f59e0b; padding: 24px; text-align: center; }
        .header h1 { color: white; margin: 0; }
        .content { padding: 32px; }
        .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ 配額提醒</h1>
        </div>
        <div class="content">
            <p>您的 {{quota_type}} 已使用 {{usage_percent}}%</p>
            <p>當前：{{current}} / {{limit}}</p>
            <p style="text-align: center; margin: 24px 0;">
                <a href="{{upgrade_link}}" class="button">升級方案</a>
            </p>
        </div>
    </div>
</body>
</html>
        ''',
        'text': '您的 {{quota_type}} 已使用 {{usage_percent}}%。當前：{{current}} / {{limit}}。升級方案：{{upgrade_link}}'
    }
}


class EmailService:
    """郵件服務"""
    
    def __init__(self, config: EmailConfig = None):
        self.config = config or EmailConfig.from_env()
    
    async def send_email(
        self,
        to: str,
        subject: str,
        html: str,
        text: str = None,
        from_email: str = None,
        from_name: str = None
    ) -> bool:
        """發送郵件"""
        from_email = from_email or self.config.from_email
        from_name = from_name or self.config.from_name
        
        try:
            if self.config.provider == 'smtp':
                return await self._send_smtp(to, subject, html, text, from_email, from_name)
            elif self.config.provider == 'sendgrid':
                return await self._send_sendgrid(to, subject, html, text, from_email, from_name)
            else:
                logger.warning(f"Unknown email provider: {self.config.provider}")
                return False
        except Exception as e:
            logger.error(f"Email send error: {e}")
            return False
    
    async def _send_smtp(
        self, to: str, subject: str, html: str, text: str,
        from_email: str, from_name: str
    ) -> bool:
        """通過 SMTP 發送"""
        if not self.config.smtp_host:
            logger.warning("SMTP not configured, email not sent")
            return False
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = to
        
        if text:
            msg.attach(MIMEText(text, 'plain', 'utf-8'))
        msg.attach(MIMEText(html, 'html', 'utf-8'))
        
        # 異步發送
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._smtp_send, msg, to)
        return True
    
    def _smtp_send(self, msg: MIMEMultipart, to: str):
        """同步 SMTP 發送"""
        with smtplib.SMTP(self.config.smtp_host, self.config.smtp_port) as server:
            if self.config.smtp_use_tls:
                server.starttls()
            if self.config.smtp_user:
                server.login(self.config.smtp_user, self.config.smtp_password)
            server.send_message(msg)
    
    async def _send_sendgrid(
        self, to: str, subject: str, html: str, text: str,
        from_email: str, from_name: str
    ) -> bool:
        """通過 SendGrid 發送"""
        # TODO: 實現 SendGrid 發送
        logger.warning("SendGrid not implemented yet")
        return False
    
    # ==================== 模板方法 ====================
    
    async def send_verification_email(self, to: str, code: str) -> bool:
        """發送驗證郵件"""
        template = EMAIL_TEMPLATES['verification']
        html = template['html'].replace('{{code}}', code)
        text = template['text'].replace('{{code}}', code)
        return await self.send_email(to, template['subject'], html, text)
    
    async def send_password_reset_email(self, to: str, reset_link: str) -> bool:
        """發送密碼重置郵件"""
        template = EMAIL_TEMPLATES['password_reset']
        html = template['html'].replace('{{reset_link}}', reset_link)
        text = template['text'].replace('{{reset_link}}', reset_link)
        return await self.send_email(to, template['subject'], html, text)
    
    async def send_welcome_email(self, to: str, name: str, dashboard_link: str) -> bool:
        """發送歡迎郵件"""
        template = EMAIL_TEMPLATES['welcome']
        html = template['html'].replace('{{name}}', name).replace('{{dashboard_link}}', dashboard_link)
        text = template['text'].replace('{{name}}', name).replace('{{dashboard_link}}', dashboard_link)
        return await self.send_email(to, template['subject'], html, text)
    
    async def send_quota_warning(
        self, to: str, quota_type: str, 
        current: int, limit: int, upgrade_link: str
    ) -> bool:
        """發送配額告警郵件"""
        template = EMAIL_TEMPLATES['quota_warning']
        usage_percent = round(current / limit * 100)
        
        html = template['html']\
            .replace('{{quota_type}}', quota_type)\
            .replace('{{usage_percent}}', str(usage_percent))\
            .replace('{{current}}', str(current))\
            .replace('{{limit}}', str(limit))\
            .replace('{{upgrade_link}}', upgrade_link)
        
        text = template['text']\
            .replace('{{quota_type}}', quota_type)\
            .replace('{{usage_percent}}', str(usage_percent))\
            .replace('{{current}}', str(current))\
            .replace('{{limit}}', str(limit))\
            .replace('{{upgrade_link}}', upgrade_link)
        
        return await self.send_email(to, template['subject'], html, text)


# 全局實例
_email_service: Optional[EmailService] = None

def get_email_service() -> EmailService:
    """獲取郵件服務實例"""
    global _email_service
    if _email_service is None:
        _email_service = EmailService()
    return _email_service
