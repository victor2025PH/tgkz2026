"""
🔧 P10-2: 環境變量校驗器

在應用啟動時運行，確保：
1. 必需的環境變量已設置
2. 安全密鑰不是默認值（生產環境）
3. 數據庫路徑可寫
4. 端口號有效
"""

import os
import sys
import logging
from pathlib import Path
from typing import List, Tuple

logger = logging.getLogger(__name__)


# ============ 環境變量規則定義 ============

# (變量名, 是否必需, 默認值, 描述)
ENV_RULES: List[Tuple[str, bool, str, str]] = [
    # 安全 — 生產環境必須修改
    ('SECRET_KEY',      True,  '',  '主密鑰（Session 加密）'),
    ('JWT_SECRET',      True,  '',  'JWT 認證密鑰'),
    ('ENCRYPTION_KEY',  True,  '',  'Telegram Session 加密密鑰'),

    # 數據庫
    ('DATABASE_PATH',   False, '',  'SQLite 數據庫路徑'),
    ('DB_PATH',         False, '',  '備用數據庫路徑'),

    # 應用模式
    ('PORT',            False, '8000',  'HTTP 服務端口'),
    ('DEBUG',           False, 'false', '調試模式'),
    ('ELECTRON_MODE',   False, 'false', '桌面模式'),
    ('ENVIRONMENT',     False, '',      '環境名稱（production/staging/development）'),
]

# 不安全的默認值（生產環境禁止使用）
UNSAFE_DEFAULTS = {
    'your-secret-key-change-this',
    'your-jwt-secret-change-this',
    'your-encryption-key-change-this',
    'changeme',
    'secret',
    'password',
    'default',
    '123456',
    'test',
}

# 最小密鑰長度
MIN_KEY_LENGTH = 16


class EnvValidationResult:
    """校驗結果"""

    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.info: List[str] = []

    @property
    def is_valid(self) -> bool:
        return len(self.errors) == 0

    def add_error(self, msg: str):
        self.errors.append(msg)

    def add_warning(self, msg: str):
        self.warnings.append(msg)

    def add_info(self, msg: str):
        self.info.append(msg)

    def summary(self) -> str:
        lines = []
        if self.errors:
            lines.append(f"❌ {len(self.errors)} error(s):")
            for e in self.errors:
                lines.append(f"   • {e}")
        if self.warnings:
            lines.append(f"⚠️  {len(self.warnings)} warning(s):")
            for w in self.warnings:
                lines.append(f"   • {w}")
        if self.info:
            for i in self.info:
                lines.append(f"   ℹ️  {i}")
        if self.is_valid:
            lines.append("✅ Environment validation passed")
        return '\n'.join(lines)


def validate_environment(strict: bool = False) -> EnvValidationResult:
    """
    校驗環境變量

    Args:
        strict: 嚴格模式（生產環境）— 會將更多警告提升為錯誤

    Returns:
        EnvValidationResult
    """
    result = EnvValidationResult()
    is_production = os.environ.get('ENVIRONMENT', '').lower() == 'production'
    is_electron = os.environ.get('ELECTRON_MODE', 'false').lower() == 'true'

    # 桌面模式放寬要求
    if is_electron:
        result.add_info("Electron mode detected — relaxed validation")

    # 1. 檢查必需變量
    for var_name, required, default, desc in ENV_RULES:
        value = os.environ.get(var_name, '')

        if required and not value and not is_electron:
            if is_production or strict:
                result.add_error(f"Missing required: {var_name} ({desc})")
            else:
                result.add_warning(f"Missing recommended: {var_name} ({desc})")

    # 2. 檢查安全密鑰不是默認值
    for key_var in ('SECRET_KEY', 'JWT_SECRET', 'ENCRYPTION_KEY'):
        value = os.environ.get(key_var, '')
        if value:
            if value.lower() in UNSAFE_DEFAULTS:
                if is_production or strict:
                    result.add_error(f"UNSAFE: {key_var} is using a default/weak value")
                else:
                    result.add_warning(f"{key_var} is using a default value — change before production")

            if len(value) < MIN_KEY_LENGTH:
                result.add_warning(f"{key_var} is too short ({len(value)} chars, recommended >= {MIN_KEY_LENGTH})")

    # 3. 數據庫路徑檢查
    db_path = os.environ.get('DATABASE_PATH') or os.environ.get('DB_PATH', '')
    if db_path:
        db_dir = Path(db_path).parent
        if not db_dir.exists():
            result.add_warning(f"Database directory does not exist: {db_dir}")
        elif not os.access(str(db_dir), os.W_OK):
            result.add_error(f"Database directory not writable: {db_dir}")

    # 4. 端口號檢查
    port_str = os.environ.get('PORT', '8000')
    try:
        port = int(port_str)
        if port < 1 or port > 65535:
            result.add_error(f"Invalid PORT: {port} (must be 1-65535)")
        elif port < 1024 and not is_electron:
            result.add_warning(f"PORT {port} requires root/admin privileges")
    except ValueError:
        result.add_error(f"Invalid PORT value: {port_str}")

    # 5. 環境名稱
    env_name = os.environ.get('ENVIRONMENT', '')
    if env_name:
        result.add_info(f"Environment: {env_name}")
    elif not is_electron:
        result.add_warning("ENVIRONMENT not set — defaults may be used")

    return result


def validate_on_startup() -> bool:
    """
    應用啟動時調用的便捷函數

    Returns:
        True if validation passed, False otherwise
    """
    result = validate_environment()

    # 輸出結果
    summary = result.summary()
    if result.errors:
        print(f"[EnvValidator] {summary}", file=sys.stderr)
        logger.error(f"Environment validation failed:\n{summary}")
    elif result.warnings:
        print(f"[EnvValidator] {summary}", file=sys.stderr)
        logger.warning(f"Environment validation warnings:\n{summary}")
    else:
        print(f"[EnvValidator] ✅ Environment OK", file=sys.stderr)

    return result.is_valid
