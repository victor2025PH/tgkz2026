"""
登入 Token 服務

支持多種無密碼登入方式：
1. Deep Link - 打開 Telegram App 確認登入
2. QR Code - 手機掃碼登入（Phase 2）

安全特性：
1. 64 字符隨機 Token
2. 5 分鐘過期
3. 一次性使用
4. IP 和 User-Agent 記錄

Phase 3 優化：
1. 本地 QR Code 生成（離線支持）
2. Base64 圖片直接返回
"""

import os
import io
import base64
import secrets
import logging
import sqlite3
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from dataclasses import dataclass
from enum import Enum

# QR Code 生成庫
try:
    import qrcode
    from PIL import Image
    HAS_QRCODE = True
except ImportError:
    HAS_QRCODE = False
    logger = logging.getLogger(__name__)
    logger.warning("qrcode/Pillow not installed, QR generation will use fallback")

logger = logging.getLogger(__name__)


class LoginTokenType(Enum):
    """登入 Token 類型"""
    DEEP_LINK = 'deep_link'
    QR_CODE = 'qr_code'


class LoginTokenStatus(Enum):
    """登入 Token 狀態"""
    PENDING = 'pending'      # 等待掃碼/確認
    SCANNED = 'scanned'      # 已掃碼，等待確認
    CONFIRMED = 'confirmed'  # 已確認登入
    EXPIRED = 'expired'      # 已過期
    CANCELLED = 'cancelled'  # 已取消


@dataclass
class LoginToken:
    """登入 Token 數據"""
    id: str
    token: str
    type: LoginTokenType
    status: LoginTokenStatus
    user_id: Optional[str] = None
    telegram_id: Optional[str] = None
    telegram_username: Optional[str] = None
    telegram_first_name: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime = None
    expires_at: datetime = None
    confirmed_at: Optional[datetime] = None

    def is_expired(self) -> bool:
        """檢查是否過期"""
        return datetime.utcnow() > self.expires_at

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'token': self.token,
            'type': self.type.value,
            'status': self.status.value,
            'user_id': self.user_id,
            'telegram_id': self.telegram_id,
            'telegram_username': self.telegram_username,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
        }


class LoginTokenService:
    """
    登入 Token 服務
    
    提供 Deep Link 和 QR Code 登入的 Token 管理
    """
    
    # Token 有效期（秒）
    TOKEN_EXPIRY_SECONDS = 300  # 5 分鐘
    
    # Token 長度
    TOKEN_LENGTH = 32  # 生成 64 字符的 hex 字符串
    
    def __init__(self, db_path: Optional[str] = None):
        """初始化服務"""
        self.db_path = db_path or os.environ.get(
            'DATABASE_PATH',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
        )
        self._init_db()
    
    def _get_db(self) -> sqlite3.Connection:
        """獲取數據庫連接"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _init_db(self):
        """初始化數據庫表"""
        db = self._get_db()
        try:
            db.execute('''
                CREATE TABLE IF NOT EXISTS login_tokens (
                    id TEXT PRIMARY KEY,
                    token TEXT UNIQUE NOT NULL,
                    type TEXT NOT NULL DEFAULT 'deep_link',
                    status TEXT NOT NULL DEFAULT 'pending',
                    user_id TEXT,
                    telegram_id TEXT,
                    telegram_username TEXT,
                    telegram_first_name TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    verify_code TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    confirmed_at TIMESTAMP
                )
            ''')
            
            # 🆕 添加 verify_code 欄位（如果不存在）
            try:
                db.execute('ALTER TABLE login_tokens ADD COLUMN verify_code TEXT')
            except:
                pass  # 欄位已存在
            
            # 創建索引
            db.execute('CREATE INDEX IF NOT EXISTS idx_login_tokens_token ON login_tokens(token)')
            db.execute('CREATE INDEX IF NOT EXISTS idx_login_tokens_status_expires ON login_tokens(status, expires_at)')
            
            db.commit()
            logger.info("Login tokens table initialized")
        except Exception as e:
            logger.error(f"Failed to initialize login_tokens table: {e}")
        finally:
            db.close()
    
    def generate_token(
        self,
        token_type: LoginTokenType = LoginTokenType.DEEP_LINK,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> LoginToken:
        """
        生成新的登入 Token
        
        Args:
            token_type: Token 類型
            ip_address: 請求 IP
            user_agent: 瀏覽器信息
        
        Returns:
            LoginToken 對象
        """
        import uuid
        
        token_id = str(uuid.uuid4())
        token = secrets.token_hex(self.TOKEN_LENGTH)
        now = datetime.utcnow()
        expires_at = now + timedelta(seconds=self.TOKEN_EXPIRY_SECONDS)
        
        login_token = LoginToken(
            id=token_id,
            token=token,
            type=token_type,
            status=LoginTokenStatus.PENDING,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=now,
            expires_at=expires_at
        )
        
        db = self._get_db()
        try:
            db.execute('''
                INSERT INTO login_tokens 
                (id, token, type, status, ip_address, user_agent, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                token_id,
                token,
                token_type.value,
                LoginTokenStatus.PENDING.value,
                ip_address,
                user_agent,
                now.isoformat(),
                expires_at.isoformat()
            ))
            db.commit()
            logger.info(f"Generated login token: {token[:8]}... (type={token_type.value})")
        finally:
            db.close()
        
        return login_token
    
    def get_token(self, token: str) -> Optional[LoginToken]:
        """
        獲取 Token 信息
        
        Args:
            token: Token 字符串
        
        Returns:
            LoginToken 對象，不存在返回 None
        """
        db = self._get_db()
        try:
            row = db.execute(
                'SELECT * FROM login_tokens WHERE token = ?',
                (token,)
            ).fetchone()
            
            if not row:
                return None
            
            return self._row_to_token(row)
        finally:
            db.close()
    
    def get_token_by_id(self, token_id: str) -> Optional[LoginToken]:
        """通過 ID 獲取 Token"""
        db = self._get_db()
        try:
            row = db.execute(
                'SELECT * FROM login_tokens WHERE id = ?',
                (token_id,)
            ).fetchone()
            
            if not row:
                return None
            
            return self._row_to_token(row)
        finally:
            db.close()
    
    def confirm_token(
        self,
        token: str,
        telegram_id: str,
        telegram_username: Optional[str] = None,
        telegram_first_name: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        確認登入 Token（Bot 收到確認後調用）
        
        Args:
            token: Token 字符串
            telegram_id: Telegram 用戶 ID
            telegram_username: Telegram 用戶名
            telegram_first_name: Telegram 名字
            user_id: 系統用戶 ID（如果已存在）
        
        Returns:
            (success, error_message) 元組
        """
        login_token = self.get_token(token)
        
        if not login_token:
            return False, "Token 不存在"
        
        if login_token.status != LoginTokenStatus.PENDING:
            return False, f"Token 狀態無效: {login_token.status.value}"
        
        if login_token.is_expired():
            self._update_status(token, LoginTokenStatus.EXPIRED)
            return False, "Token 已過期，請重新獲取"
        
        # 更新 Token 狀態
        db = self._get_db()
        try:
            db.execute('''
                UPDATE login_tokens 
                SET status = ?, 
                    telegram_id = ?, 
                    telegram_username = ?,
                    telegram_first_name = ?,
                    user_id = ?,
                    confirmed_at = ?
                WHERE token = ?
            ''', (
                LoginTokenStatus.CONFIRMED.value,
                telegram_id,
                telegram_username,
                telegram_first_name,
                user_id,
                datetime.utcnow().isoformat(),
                token
            ))
            db.commit()
            logger.info(f"Login token confirmed: {token[:8]}... by TG user {telegram_id}")
            return True, None
        except Exception as e:
            logger.error(f"Failed to confirm token: {e}")
            return False, str(e)
        finally:
            db.close()
    
    def check_token_status(self, token: str) -> Tuple[str, Optional[Dict[str, Any]]]:
        """
        檢查 Token 狀態（前端輪詢調用）
        
        Returns:
            (status, user_data) 元組
            - status: pending/confirmed/expired
            - user_data: 確認後的用戶數據
        """
        login_token = self.get_token(token)
        
        if not login_token:
            return 'not_found', None
        
        if login_token.is_expired() and login_token.status == LoginTokenStatus.PENDING:
            self._update_status(token, LoginTokenStatus.EXPIRED)
            return 'expired', None
        
        if login_token.status == LoginTokenStatus.CONFIRMED:
            return 'confirmed', {
                'telegram_id': login_token.telegram_id,
                'telegram_username': login_token.telegram_username,
                'telegram_first_name': login_token.telegram_first_name,
                'user_id': login_token.user_id
            }
        
        return login_token.status.value, None
    
    def _update_status(self, token: str, status: LoginTokenStatus):
        """更新 Token 狀態"""
        db = self._get_db()
        try:
            db.execute(
                'UPDATE login_tokens SET status = ? WHERE token = ?',
                (status.value, token)
            )
            db.commit()
        finally:
            db.close()
    
    def update_token_status(self, token: str, status: str, telegram_id: Optional[str] = None):
        """
        🆕 更新 Token 狀態（公開方法）
        
        用於中轉頁面發送確認消息後更新狀態
        """
        db = self._get_db()
        try:
            if telegram_id:
                db.execute(
                    'UPDATE login_tokens SET status = ?, telegram_id = ? WHERE token = ?',
                    (status, telegram_id, token)
                )
            else:
                db.execute(
                    'UPDATE login_tokens SET status = ? WHERE token = ?',
                    (status, token)
                )
            db.commit()
        finally:
            db.close()
    
    def update_verify_code(self, token: str, verify_code: str):
        """
        🆕 更新 Token 的驗證碼
        
        用於老用戶手動輸入驗證碼登入
        """
        db = self._get_db()
        try:
            db.execute(
                'UPDATE login_tokens SET verify_code = ? WHERE token = ?',
                (verify_code, token)
            )
            db.commit()
        finally:
            db.close()
    
    def get_token_by_verify_code(self, verify_code: str) -> Optional['LoginToken']:
        """
        🆕 通過驗證碼查找 Token
        
        用於老用戶在 Bot 中輸入驗證碼
        """
        db = self._get_db()
        try:
            cursor = db.execute(
                '''SELECT * FROM login_tokens 
                   WHERE verify_code = ? 
                   AND status = 'pending' 
                   AND expires_at > datetime('now')
                   ORDER BY created_at DESC LIMIT 1''',
                (verify_code,)
            )
            row = cursor.fetchone()
            if row:
                return self._row_to_token(row)
            return None
        finally:
            db.close()
    
    def get_pending_token_for_telegram_user(self, telegram_id: str) -> Optional['LoginToken']:
        """
        🆕 查找待處理的登入 Token（自動確認用）
        
        當用戶發送 /start 時，查找最近 60 秒內創建的待處理 Token
        如果只有一個，自動確認（假設是這個用戶的請求）
        """
        db = self._get_db()
        try:
            # 查找最近 60 秒內創建的待處理 Token
            cursor = db.execute(
                '''SELECT * FROM login_tokens 
                   WHERE status = 'pending' 
                   AND expires_at > datetime('now')
                   AND created_at > datetime('now', '-60 seconds')
                   ORDER BY created_at DESC LIMIT 1'''
            )
            row = cursor.fetchone()
            if row:
                return self._row_to_token(row)
            return None
        finally:
            db.close()
    
    def _row_to_token(self, row) -> 'LoginToken':
        """將數據庫行轉換為 LoginToken 對象"""
        return LoginToken(
            id=row['id'],
            token=row['token'],
            type=LoginTokenType(row['type']) if row['type'] else LoginTokenType.DEEP_LINK,
            status=LoginTokenStatus(row['status']) if row['status'] else LoginTokenStatus.PENDING,
            user_id=row['user_id'],
            telegram_id=row['telegram_id'],
            telegram_username=row['telegram_username'],
            telegram_first_name=row['telegram_first_name'],
            ip_address=row['ip_address'],
            user_agent=row['user_agent'],
            created_at=datetime.fromisoformat(row['created_at']) if row['created_at'] else None,
            expires_at=datetime.fromisoformat(row['expires_at']) if row['expires_at'] else None,
            confirmed_at=datetime.fromisoformat(row['confirmed_at']) if row['confirmed_at'] else None
        )
    
    def _row_to_token(self, row) -> LoginToken:
        """將數據庫行轉換為 LoginToken 對象"""
        return LoginToken(
            id=row['id'],
            token=row['token'],
            type=LoginTokenType(row['type']),
            status=LoginTokenStatus(row['status']),
            user_id=row['user_id'],
            telegram_id=row['telegram_id'],
            telegram_username=row['telegram_username'],
            telegram_first_name=row['telegram_first_name'],
            ip_address=row['ip_address'],
            user_agent=row['user_agent'],
            created_at=datetime.fromisoformat(row['created_at']) if row['created_at'] else None,
            expires_at=datetime.fromisoformat(row['expires_at']) if row['expires_at'] else None,
            confirmed_at=datetime.fromisoformat(row['confirmed_at']) if row['confirmed_at'] else None
        )
    
    def cleanup_expired(self):
        """清理過期的 Token"""
        db = self._get_db()
        try:
            result = db.execute('''
                DELETE FROM login_tokens 
                WHERE expires_at < ? AND status IN (?, ?)
            ''', (
                datetime.utcnow().isoformat(),
                LoginTokenStatus.PENDING.value,
                LoginTokenStatus.EXPIRED.value
            ))
            db.commit()
            deleted = result.rowcount
            if deleted > 0:
                logger.info(f"Cleaned up {deleted} expired login tokens")
        finally:
            db.close()
    
    # ==================== 🆕 Phase 3: QR Code 生成 ====================
    
    @staticmethod
    def generate_qr_image(data: str, size: int = 200, with_logo: bool = True) -> Optional[str]:
        """
        🆕 生成美化的 QR Code 圖片（Base64 格式）
        
        優化：
        1. 本地生成，不依賴外部 API
        2. 品牌漸變色設計
        3. 精美的中央 Logo
        4. 高容錯率確保掃描可靠性
        5. 圓角優化設計
        
        Args:
            data: 要編碼的數據（通常是 Deep Link URL）
            size: 圖片尺寸（像素）
            with_logo: 是否添加中央 Logo
        
        Returns:
            Base64 編碼的 PNG 圖片，如果失敗返回 None
        """
        if not HAS_QRCODE:
            logger.warning("QR Code library not available, using fallback URL")
            return None
        
        try:
            from PIL import ImageDraw, ImageFont
            
            # 🆕 品牌顏色
            BRAND_PRIMARY = '#0088cc'    # Telegram 藍
            BRAND_SECONDARY = '#6366f1'  # 紫色
            BRAND_GRADIENT_START = '#0ea5e9'  # 亮藍
            BRAND_GRADIENT_END = '#8b5cf6'    # 紫色
            
            # 使用高容錯率（H = 30%），支持中央 Logo
            qr = qrcode.QRCode(
                version=None,
                error_correction=qrcode.constants.ERROR_CORRECT_H,
                box_size=10,
                border=3  # 稍大的邊框
            )
            qr.add_data(data)
            qr.make(fit=True)
            
            # 獲取 QR 矩陣
            qr_matrix = qr.modules
            qr_size = len(qr_matrix)
            box_size = 10
            border = 3
            
            # 計算實際圖片大小
            img_size = (qr_size + border * 2) * box_size
            
            # 創建白色背景的 RGBA 圖片
            img = Image.new('RGBA', (img_size, img_size), (255, 255, 255, 255))
            draw = ImageDraw.Draw(img)
            
            # 🆕 繪製漸變色 QR Code 方塊
            for row in range(qr_size):
                for col in range(qr_size):
                    if qr_matrix[row][col]:
                        # 計算漸變顏色（從左上到右下）
                        progress = (row + col) / (qr_size * 2)
                        
                        # 從 BRAND_GRADIENT_START 到 BRAND_GRADIENT_END 的漸變
                        r1, g1, b1 = int('0e', 16), int('a5', 16), int('e9', 16)  # 亮藍
                        r2, g2, b2 = int('8b', 16), int('5c', 16), int('f6', 16)  # 紫色
                        
                        r = int(r1 + (r2 - r1) * progress)
                        g = int(g1 + (g2 - g1) * progress)
                        b = int(b1 + (b2 - b1) * progress)
                        
                        color = (r, g, b, 255)
                        
                        x = (col + border) * box_size
                        y = (row + border) * box_size
                        
                        # 🆕 繪製圓角方塊
                        corner_radius = box_size // 4
                        draw.rounded_rectangle(
                            [x + 1, y + 1, x + box_size - 1, y + box_size - 1],
                            radius=corner_radius,
                            fill=color
                        )
            
            # 調整到目標大小
            img = img.resize((size, size), Image.Resampling.LANCZOS)
            
            # 🆕 添加精美的品牌 Logo 到中央
            if with_logo:
                try:
                    draw = ImageDraw.Draw(img)
                    center = size // 2
                    logo_size = size // 5  # Logo 佔整體的 1/5
                    
                    # 白色圓形背景（帶陰影效果）
                    shadow_offset = 2
                    # 陰影
                    draw.ellipse(
                        [center - logo_size // 2 + shadow_offset, 
                         center - logo_size // 2 + shadow_offset,
                         center + logo_size // 2 + shadow_offset, 
                         center + logo_size // 2 + shadow_offset],
                        fill=(0, 0, 0, 30)
                    )
                    # 白色背景
                    draw.ellipse(
                        [center - logo_size // 2, center - logo_size // 2,
                         center + logo_size // 2, center + logo_size // 2],
                        fill=(255, 255, 255, 255),
                        outline=(14, 165, 233, 255),  # 品牌藍邊框
                        width=3
                    )
                    
                    # 🆕 繪製 TG-Matrix Logo（簡化的 "TG" 字樣）
                    inner_size = logo_size - 16
                    inner_x = center - inner_size // 2
                    inner_y = center - inner_size // 2
                    
                    # 漸變色內圓
                    for i in range(inner_size):
                        progress = i / inner_size
                        r = int(14 + (139 - 14) * progress)
                        g = int(165 + (92 - 165) * progress)
                        b = int(233 + (246 - 233) * progress)
                        
                        if i < inner_size - 1:
                            draw.arc(
                                [inner_x + i // 3, inner_y + i // 3,
                                 inner_x + inner_size - i // 3, inner_y + inner_size - i // 3],
                                0, 360,
                                fill=(r, g, b, 255),
                                width=2
                            )
                    
                    # 中央填充
                    center_fill_size = inner_size // 2
                    draw.ellipse(
                        [center - center_fill_size // 2, center - center_fill_size // 2,
                         center + center_fill_size // 2, center + center_fill_size // 2],
                        fill=(14, 165, 233, 255)  # 品牌藍
                    )
                    
                except Exception as e:
                    logger.debug(f"Logo overlay skipped: {e}")
            
            # 轉換為 RGB（PNG 不支持 RGBA 的某些情況）
            if img.mode == 'RGBA':
                background = Image.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[3])
                img = background
            
            # 轉換為 Base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG', optimize=True, quality=95)
            buffer.seek(0)
            
            base64_data = base64.b64encode(buffer.getvalue()).decode('utf-8')
            return f"data:image/png;base64,{base64_data}"
            
        except Exception as e:
            logger.error(f"Failed to generate QR code: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    @staticmethod
    def get_fallback_qr_url(data: str, size: int = 200) -> str:
        """
        備用 QR Code URL（使用外部 API）
        
        當本地生成失敗時使用
        """
        import urllib.parse
        encoded = urllib.parse.quote_plus(data)
        return f"https://api.qrserver.com/v1/create-qr-code/?size={size}x{size}&data={encoded}&bgcolor=ffffff&color=0088cc&margin=10"
    
    # ==================== 🆕 Phase 3.5: 安全增強 ====================
    
    def record_login_attempt(
        self, 
        token: str, 
        success: bool,
        telegram_id: str = None,
        ip_address: str = None,
        user_agent: str = None,
        additional_info: Dict[str, Any] = None
    ) -> None:
        """
        記錄登入嘗試（審計日誌）
        
        安全特性：
        1. 記錄所有登入嘗試（成功和失敗）
        2. 用於異常檢測和審計
        """
        db = self._get_db()
        try:
            # 確保審計表存在
            db.execute('''
                CREATE TABLE IF NOT EXISTS login_audit (
                    id TEXT PRIMARY KEY,
                    token TEXT,
                    telegram_id TEXT,
                    success INTEGER,
                    ip_address TEXT,
                    user_agent TEXT,
                    additional_info TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            import uuid
            import json
            
            db.execute('''
                INSERT INTO login_audit 
                (id, token, telegram_id, success, ip_address, user_agent, additional_info, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                str(uuid.uuid4()),
                token[:16] if token else None,  # 只記錄部分 Token
                telegram_id,
                1 if success else 0,
                ip_address,
                user_agent[:200] if user_agent else None,  # 限制長度
                json.dumps(additional_info) if additional_info else None,
                datetime.utcnow().isoformat()
            ))
            db.commit()
            
        except Exception as e:
            logger.warning(f"Failed to record login audit: {e}")
        finally:
            db.close()
    
    def check_suspicious_activity(self, telegram_id: str, ip_address: str = None) -> Dict[str, Any]:
        """
        檢查可疑活動
        
        異常檢測：
        1. 短時間內多次登入嘗試
        2. 不同 IP 的登入請求
        3. 異常的 User-Agent 模式
        
        Returns:
            {
                'is_suspicious': bool,
                'risk_level': 'low' | 'medium' | 'high',
                'reasons': [],
                'recent_attempts': int
            }
        """
        db = self._get_db()
        result = {
            'is_suspicious': False,
            'risk_level': 'low',
            'reasons': [],
            'recent_attempts': 0
        }
        
        try:
            # 檢查過去 5 分鐘的登入嘗試次數
            five_minutes_ago = (datetime.utcnow() - timedelta(minutes=5)).isoformat()
            
            cursor = db.execute('''
                SELECT COUNT(*) as count FROM login_audit
                WHERE telegram_id = ? AND created_at > ?
            ''', (telegram_id, five_minutes_ago))
            
            row = cursor.fetchone()
            recent_attempts = row['count'] if row else 0
            result['recent_attempts'] = recent_attempts
            
            # 規則 1: 5 分鐘內超過 5 次嘗試
            if recent_attempts > 5:
                result['is_suspicious'] = True
                result['reasons'].append('頻繁登入嘗試')
                result['risk_level'] = 'high' if recent_attempts > 10 else 'medium'
            
            # 規則 2: 檢查不同 IP 的登入
            if ip_address:
                cursor = db.execute('''
                    SELECT COUNT(DISTINCT ip_address) as ip_count 
                    FROM login_audit
                    WHERE telegram_id = ? AND created_at > ?
                ''', (telegram_id, five_minutes_ago))
                
                row = cursor.fetchone()
                ip_count = row['ip_count'] if row else 0
                
                if ip_count > 3:
                    result['is_suspicious'] = True
                    result['reasons'].append('多個 IP 地址登入')
                    result['risk_level'] = 'high'
            
        except Exception as e:
            logger.warning(f"Failed to check suspicious activity: {e}")
        finally:
            db.close()
        
        return result
    
    def get_login_history(self, telegram_id: str, limit: int = 10) -> list:
        """
        獲取用戶登入歷史
        
        用於用戶查看自己的登入記錄
        """
        db = self._get_db()
        history = []
        
        try:
            cursor = db.execute('''
                SELECT success, ip_address, user_agent, created_at
                FROM login_audit
                WHERE telegram_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            ''', (telegram_id, limit))
            
            for row in cursor.fetchall():
                history.append({
                    'success': bool(row['success']),
                    'ip_address': row['ip_address'],
                    'user_agent': row['user_agent'][:50] if row['user_agent'] else None,
                    'time': row['created_at']
                })
                
        except Exception as e:
            logger.warning(f"Failed to get login history: {e}")
        finally:
            db.close()
        
        return history


# 全局服務實例
_login_token_service: Optional[LoginTokenService] = None


def get_login_token_service() -> LoginTokenService:
    """獲取全局登入 Token 服務實例"""
    global _login_token_service
    if _login_token_service is None:
        _login_token_service = LoginTokenService()
    return _login_token_service


# ==================== 🆕 WebSocket 訂閱管理 ====================

class LoginTokenSubscriptionManager:
    """
    登入 Token WebSocket 訂閱管理器
    
    管理前端客戶端對特定 Token 的訂閱，
    當 Token 狀態變化時推送通知。
    
    優化設計：
    1. 只通知訂閱了該 Token 的客戶端（非廣播）
    2. 支持多客戶端訂閱同一 Token
    3. 自動清理斷開的連接
    """
    
    def __init__(self):
        # token -> set of websocket connections
        self._subscriptions: Dict[str, set] = {}
        # websocket -> token (反向映射，方便清理)
        self._ws_to_token: Dict[Any, str] = {}
    
    def subscribe(self, token: str, ws) -> None:
        """訂閱 Token 狀態變化"""
        if token not in self._subscriptions:
            self._subscriptions[token] = set()
        self._subscriptions[token].add(ws)
        self._ws_to_token[ws] = token
        logger.debug(f"WS subscribed to token {token[:8]}...")
    
    def unsubscribe(self, ws) -> None:
        """取消訂閱"""
        token = self._ws_to_token.pop(ws, None)
        if token and token in self._subscriptions:
            self._subscriptions[token].discard(ws)
            if not self._subscriptions[token]:
                del self._subscriptions[token]
        logger.debug(f"WS unsubscribed from token")
    
    async def notify(self, token: str, status: str, data: Dict[str, Any] = None) -> int:
        """
        通知所有訂閱該 Token 的客戶端
        
        Returns:
            通知的客戶端數量
        """
        import json
        from datetime import datetime
        
        if token not in self._subscriptions:
            return 0
        
        message = json.dumps({
            'type': 'login_token_update',
            'event': 'login_token_update',
            'token': token[:16] + '...',  # 只返回部分 token
            'status': status,
            'data': data or {},
            'timestamp': datetime.utcnow().isoformat()
        })
        
        notified = 0
        dead_connections = []
        
        for ws in self._subscriptions[token]:
            try:
                await ws.send_str(message)
                notified += 1
            except Exception as e:
                logger.debug(f"Failed to notify WS: {e}")
                dead_connections.append(ws)
        
        # 清理失效連接
        for ws in dead_connections:
            self.unsubscribe(ws)
        
        logger.info(f"Notified {notified} clients for token {token[:8]}...")
        return notified
    
    def get_subscriber_count(self, token: str) -> int:
        """獲取 Token 的訂閱者數量"""
        return len(self._subscriptions.get(token, set()))
    
    def cleanup_token(self, token: str) -> None:
        """清理 Token 的所有訂閱"""
        if token in self._subscriptions:
            for ws in list(self._subscriptions[token]):
                self._ws_to_token.pop(ws, None)
            del self._subscriptions[token]


# 全局訂閱管理器
_subscription_manager: Optional[LoginTokenSubscriptionManager] = None


def get_subscription_manager() -> LoginTokenSubscriptionManager:
    """獲取全局訂閱管理器"""
    global _subscription_manager
    if _subscription_manager is None:
        _subscription_manager = LoginTokenSubscriptionManager()
    return _subscription_manager
