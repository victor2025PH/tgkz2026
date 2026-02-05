"""
TG-Matrix Backend Configuration
Handles application configuration and environment variables
"""
import os
import sys
from pathlib import Path
from typing import Optional, Dict, Any

# Base directory for the backend (code location)
BASE_DIR = Path(__file__).parent

# 🆕 用戶數據目錄（從環境變量獲取，用於持久化存儲）
# 在打包後，數據應該存儲在用戶目錄而不是安裝目錄
USER_DATA_PATH = os.environ.get('TG_USER_DATA_PATH', '')
DATA_DIR_FROM_ENV = os.environ.get('TG_DATA_DIR', '')
SESSIONS_DIR_FROM_ENV = os.environ.get('TG_SESSIONS_DIR', '')

# 🆕 開發模式檢測
# 優先級：TG_DEV_MODE > IS_PACKAGED > 檢測 node_modules 存在
IS_DEV_MODE = os.environ.get('TG_DEV_MODE', '').lower() in ('true', '1', 'yes')
IS_PACKAGED = os.environ.get('IS_PACKAGED', '').lower() in ('true', '1', 'yes')

# 如果沒有明確設置，通過檢測環境判斷
if not IS_DEV_MODE and not IS_PACKAGED:
    # 檢測是否存在 node_modules（表示開發環境）
    node_modules_exists = (BASE_DIR.parent / "node_modules").exists()
    # 檢測是否在 resources/app 路徑下（表示打包環境）
    in_resources = "resources" in str(BASE_DIR).lower() and "app" in str(BASE_DIR).lower()
    IS_DEV_MODE = node_modules_exists and not in_resources

# 🆕 強制開發模式使用本地路徑
if IS_DEV_MODE:
    # 開發模式：強制使用 backend/data/ 和 backend/sessions/
    DATABASE_DIR = BASE_DIR / "data"
    SESSIONS_DIR = BASE_DIR / "sessions"
    print(f"[Config] ========== 開發模式 ==========", file=sys.stderr)
    print(f"[Config] Using LOCAL data dir: {DATABASE_DIR}", file=sys.stderr)
    print(f"[Config] Using LOCAL sessions dir: {SESSIONS_DIR}", file=sys.stderr)
else:
    # 生產模式：使用 Electron 傳遞的用戶數據目錄
    if DATA_DIR_FROM_ENV and os.path.isabs(DATA_DIR_FROM_ENV):
        DATABASE_DIR = Path(DATA_DIR_FROM_ENV)
        print(f"[Config] Using user data dir from env: {DATABASE_DIR}", file=sys.stderr)
    else:
        DATABASE_DIR = BASE_DIR / "data"
        print(f"[Config] Using local data dir (fallback): {DATABASE_DIR}", file=sys.stderr)
    
    if SESSIONS_DIR_FROM_ENV and os.path.isabs(SESSIONS_DIR_FROM_ENV):
        SESSIONS_DIR = Path(SESSIONS_DIR_FROM_ENV)
        print(f"[Config] Using sessions dir from env: {SESSIONS_DIR}", file=sys.stderr)
    else:
        SESSIONS_DIR = BASE_DIR / "sessions"
        print(f"[Config] Using local sessions dir (fallback): {SESSIONS_DIR}", file=sys.stderr)

# Database configuration
DATABASE_PATH = DATABASE_DIR / "tgmatrix.db"

# 🆕 啟動時診斷信息
print(f"[Config] ========== 數據路徑配置 ==========", file=sys.stderr)
print(f"[Config] IS_DEV_MODE: {IS_DEV_MODE}", file=sys.stderr)
print(f"[Config] DATABASE_DIR: {DATABASE_DIR}", file=sys.stderr)
print(f"[Config] DATABASE_PATH: {DATABASE_PATH}", file=sys.stderr)
print(f"[Config] SESSIONS_DIR: {SESSIONS_DIR}", file=sys.stderr)
print(f"[Config] Database exists: {DATABASE_PATH.exists()}", file=sys.stderr)
print(f"[Config] ====================================", file=sys.stderr)

# Logs directory (也放在用戶數據目錄)
if USER_DATA_PATH and not IS_DEV_MODE:
    LOGS_DIR = Path(USER_DATA_PATH) / "logs"
else:
    LOGS_DIR = BASE_DIR / "logs"

# Excel templates directory (保持在代碼目錄)
TEMPLATES_DIR = BASE_DIR / "templates"

# Ensure directories exist
for directory in [DATABASE_DIR, SESSIONS_DIR, LOGS_DIR, TEMPLATES_DIR]:
    try:
        directory.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        print(f"[Config] Warning: Could not create directory {directory}: {e}", file=sys.stderr)


# 🔧 P1: AI 配置常量
class AIConfig:
    """AI 服務配置常量"""
    # 超時設定（秒）
    API_TIMEOUT_SECONDS = 45
    # 最大重試次數
    MAX_RETRIES = 2
    # 重試延遲（秒）
    RETRY_DELAY_SECONDS = 1
    # 最大 Token 數
    DEFAULT_MAX_TOKENS = 500


# ========== 🔒 沙盒隔離配置 ==========
class SandboxConfig:
    """
    多賬號沙盒隔離配置
    確保每個 Telegram 賬號完全獨立運行，防止封號
    """
    
    # 🔒 是否啟用嚴格沙盒模式（強制隔離）
    STRICT_MODE = os.environ.get('TG_SANDBOX_STRICT', '').lower() in ('true', '1', 'yes')
    
    # 🔒 是否強制要求代理（無代理則拒絕啟動）
    REQUIRE_PROXY = os.environ.get('TG_REQUIRE_PROXY', '').lower() in ('true', '1', 'yes')
    
    # 🔒 是否使用獨立目錄結構（每賬號單獨目錄）
    USE_ISOLATED_DIRS = os.environ.get('TG_ISOLATED_DIRS', 'true').lower() in ('true', '1', 'yes')
    
    # 🔒 是否持久化設備指紋（存儲到數據庫）
    PERSIST_FINGERPRINT = os.environ.get('TG_PERSIST_FINGERPRINT', 'true').lower() in ('true', '1', 'yes')
    
    # 🔒 同 IP 下最大賬號數（防止關聯）
    MAX_ACCOUNTS_PER_IP = int(os.environ.get('TG_MAX_ACCOUNTS_PER_IP', '3'))
    
    # 🔒 最大並發客戶端數
    MAX_CONCURRENT_CLIENTS = int(os.environ.get('TG_MAX_CONCURRENT_CLIENTS', '10'))
    
    # 🔒 代理失敗重試閾值
    PROXY_FAILURE_THRESHOLD = int(os.environ.get('TG_PROXY_FAILURE_THRESHOLD', '3'))
    
    @classmethod
    def get_account_dir(cls, phone: str) -> Path:
        """
        獲取賬號專屬目錄（包含 session、cache、temp 等）
        
        結構：
        sessions/
        └── {phone}/
            ├── session.session    # Pyrogram session 文件
            ├── cache/             # 賬號專屬緩存
            ├── temp/              # 臨時文件
            └── media/             # 媒體緩存
        """
        safe_phone = phone.replace("+", "").replace("-", "").replace(" ", "")
        return SESSIONS_DIR / safe_phone
    
    @classmethod
    def get_session_path(cls, phone: str) -> Path:
        """獲取賬號的 session 文件路徑"""
        if cls.USE_ISOLATED_DIRS:
            account_dir = cls.get_account_dir(phone)
            return account_dir / "session.session"
        else:
            # 兼容舊模式
            safe_phone = phone.replace("+", "").replace("-", "").replace(" ", "")
            return SESSIONS_DIR / f"{safe_phone}.session"
    
    @classmethod
    def get_cache_dir(cls, phone: str) -> Path:
        """獲取賬號的緩存目錄"""
        return cls.get_account_dir(phone) / "cache"
    
    @classmethod
    def get_temp_dir(cls, phone: str) -> Path:
        """獲取賬號的臨時文件目錄"""
        return cls.get_account_dir(phone) / "temp"
    
    @classmethod
    def get_media_dir(cls, phone: str) -> Path:
        """獲取賬號的媒體緩存目錄"""
        return cls.get_account_dir(phone) / "media"
    
    @classmethod
    def ensure_account_dirs(cls, phone: str) -> Dict[str, Path]:
        """
        確保賬號的所有目錄都存在
        
        Returns:
            包含所有目錄路徑的字典
        """
        dirs = {
            'base': cls.get_account_dir(phone),
            'cache': cls.get_cache_dir(phone),
            'temp': cls.get_temp_dir(phone),
            'media': cls.get_media_dir(phone),
        }
        
        for name, dir_path in dirs.items():
            try:
                dir_path.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                print(f"[SandboxConfig] Warning: Could not create {name} directory {dir_path}: {e}", file=sys.stderr)
        
        return dirs
    
    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        """獲取沙盒配置狀態"""
        return {
            'strict_mode': cls.STRICT_MODE,
            'require_proxy': cls.REQUIRE_PROXY,
            'use_isolated_dirs': cls.USE_ISOLATED_DIRS,
            'persist_fingerprint': cls.PERSIST_FINGERPRINT,
            'max_accounts_per_ip': cls.MAX_ACCOUNTS_PER_IP,
            'max_concurrent_clients': cls.MAX_CONCURRENT_CLIENTS,
            'proxy_failure_threshold': cls.PROXY_FAILURE_THRESHOLD,
        }


# 輸出沙盒配置狀態
print(f"[Config] ========== 沙盒隔離配置 ==========", file=sys.stderr)
print(f"[Config] 嚴格模式: {'啟用' if SandboxConfig.STRICT_MODE else '關閉'}", file=sys.stderr)
print(f"[Config] 強制代理: {'是' if SandboxConfig.REQUIRE_PROXY else '否'}", file=sys.stderr)
print(f"[Config] 獨立目錄: {'是' if SandboxConfig.USE_ISOLATED_DIRS else '否'}", file=sys.stderr)
print(f"[Config] 指紋持久化: {'是' if SandboxConfig.PERSIST_FINGERPRINT else '否'}", file=sys.stderr)
print(f"[Config] 每IP最大賬號: {SandboxConfig.MAX_ACCOUNTS_PER_IP}", file=sys.stderr)
print(f"[Config] 最大並發客戶端: {SandboxConfig.MAX_CONCURRENT_CLIENTS}", file=sys.stderr)
print(f"[Config] ====================================", file=sys.stderr)


# ========== 🔧 Phase 3 優化：內存優化配置 ==========
class MemoryOptConfig:
    """內存優化配置"""
    
    # 🔧 打包版本也默認啟用輕量模式
    # 優先級：環境變量 > 打包模式 > 開發模式
    LIGHTWEIGHT_MODE = (
        os.environ.get('TG_LIGHTWEIGHT_MODE', '').lower() in ('true', '1', 'yes') or
        IS_PACKAGED or  # 打包後默認啟用
        IS_DEV_MODE     # 開發模式默認啟用
    )
    
    # 是否禁用神經網絡嵌入（節省 ~200MB）
    # 打包版本默認禁用，因為移除了 torch/transformers 依賴
    DISABLE_NEURAL_EMBEDDING = (
        os.environ.get('TG_DISABLE_NEURAL_EMBEDDING', '').lower() in ('true', '1', 'yes') or
        IS_PACKAGED or  # 打包後默認禁用（依賴已移除）
        LIGHTWEIGHT_MODE
    )
    
    # 是否禁用 ChromaDB（節省 ~50MB）
    DISABLE_CHROMADB = os.environ.get('TG_DISABLE_CHROMADB', '').lower() in ('true', '1', 'yes')
    
    # 是否禁用性能監控（節省 ~20MB）
    DISABLE_PERFORMANCE_MONITOR = os.environ.get('TG_DISABLE_PERF_MONITOR', '').lower() in ('true', '1', 'yes')
    
    # 最大緩存條目數（減少內存佔用）
    MAX_CACHE_ENTRIES = int(os.environ.get('TG_MAX_CACHE_ENTRIES', '500'))
    
    # GC 觸發閾值（MB）
    GC_THRESHOLD_MB = float(os.environ.get('TG_GC_THRESHOLD_MB', '600'))
    
    # 內存警告閾值（MB）
    MEMORY_WARNING_MB = float(os.environ.get('TG_MEMORY_WARNING_MB', '800'))
    
    # 內存危險閾值（MB）
    MEMORY_CRITICAL_MB = float(os.environ.get('TG_MEMORY_CRITICAL_MB', '1200'))
    
    @classmethod
    def should_use_neural_embedding(cls) -> bool:
        """檢查是否應該使用神經網絡嵌入"""
        return not cls.DISABLE_NEURAL_EMBEDDING
    
    @classmethod
    def get_status(cls) -> dict:
        """獲取內存優化配置狀態"""
        return {
            'lightweight_mode': cls.LIGHTWEIGHT_MODE,
            'neural_embedding_disabled': cls.DISABLE_NEURAL_EMBEDDING,
            'chromadb_disabled': cls.DISABLE_CHROMADB,
            'perf_monitor_disabled': cls.DISABLE_PERFORMANCE_MONITOR,
            'max_cache_entries': cls.MAX_CACHE_ENTRIES,
            'gc_threshold_mb': cls.GC_THRESHOLD_MB,
            'memory_warning_mb': cls.MEMORY_WARNING_MB,
            'memory_critical_mb': cls.MEMORY_CRITICAL_MB,
        }


# 輸出內存優化配置狀態
if MemoryOptConfig.LIGHTWEIGHT_MODE:
    mode_reason = "打包版本" if IS_PACKAGED else ("開發模式" if IS_DEV_MODE else "環境變量")
    print(f"[Config] ⚡ 輕量模式已啟用 ({mode_reason}) - 禁用重量級功能以節省內存", file=sys.stderr)
    if MemoryOptConfig.DISABLE_NEURAL_EMBEDDING:
        print(f"[Config]   - 神經網絡嵌入: 禁用 (節省 ~200MB)", file=sys.stderr)
    if MemoryOptConfig.DISABLE_CHROMADB:
        print(f"[Config]   - ChromaDB: 禁用 (節省 ~50MB)", file=sys.stderr)


class Config:
    """Application configuration (legacy - use config_loader for new code)"""
    
    def __init__(self):
        """Initialize config from config_loader"""
        from config_loader import get_config
        app_config = get_config()
        
        # Map to legacy attributes for backward compatibility
        self.DATABASE_URL = app_config.database.path
        self.TELEGRAM_API_ID = app_config.telegram.api_id
        self.TELEGRAM_API_HASH = app_config.telegram.api_hash
        self.MAX_LOG_ENTRIES = app_config.logging.max_entries
        self.DEFAULT_DAILY_SEND_LIMIT = app_config.sending.default_daily_limit
        self.DEFAULT_HEALTH_SCORE = app_config.sending.default_health_score
        self.MESSAGE_CHECK_INTERVAL = app_config.monitoring.message_check_interval
        self.MAX_CONCURRENT_ACCOUNTS = app_config.monitoring.max_concurrent_accounts
        self.MIN_SEND_DELAY = app_config.sending.min_delay
        self.MAX_SEND_DELAY = app_config.sending.max_delay
        
        # Data path for sessions, backups, etc.
        self.DATA_PATH = DATABASE_DIR  # Points to backend/data/
        self.SESSIONS_DIR = SESSIONS_DIR  # Points to backend/sessions/
    
    @classmethod
    def get_session_path(cls, phone: str) -> Path:
        """
        Get session file path for a phone number
        使用 SandboxConfig 的隔離目錄結構
        """
        # 使用沙盒配置的隔離路徑
        return SandboxConfig.get_session_path(phone)
    
    @classmethod
    def get_account_dir(cls, phone: str) -> Path:
        """Get the isolated directory for an account"""
        return SandboxConfig.get_account_dir(phone)
    
    @classmethod
    def ensure_account_dirs(cls, phone: str) -> Dict[str, Path]:
        """Ensure all account directories exist"""
        return SandboxConfig.ensure_account_dirs(phone)
    
    @classmethod
    def load_from_env(cls):
        """Load configuration from environment variables"""
        from config_loader import load_config
        load_config()


# Global config instance (initialized on first access)
_config_instance: Optional[Config] = None

def _get_config() -> Config:
    """Get or create config instance"""
    global _config_instance
    if _config_instance is None:
        _config_instance = Config()
    return _config_instance

# Legacy access pattern
config = type('ConfigProxy', (), {
    '__getattr__': lambda self, name: getattr(_get_config(), name)
})()
