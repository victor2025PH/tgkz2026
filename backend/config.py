"""
TG-Matrix Backend Configuration
Handles application configuration and environment variables
"""
import os
from pathlib import Path
from typing import Optional

# Base directory for the backend
BASE_DIR = Path(__file__).parent

# Database configuration
DATABASE_PATH = BASE_DIR / "data" / "tgmatrix.db"
DATABASE_DIR = BASE_DIR / "data"

# Sessions directory for Pyrogram session files
SESSIONS_DIR = BASE_DIR / "sessions"

# Logs directory
LOGS_DIR = BASE_DIR / "logs"

# Excel templates directory
TEMPLATES_DIR = BASE_DIR / "templates"

# Ensure directories exist
for directory in [DATABASE_DIR, SESSIONS_DIR, LOGS_DIR, TEMPLATES_DIR]:
    directory.mkdir(parents=True, exist_ok=True)


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
    
    @classmethod
    def get_session_path(cls, phone: str) -> Path:
        """Get session file path for a phone number"""
        from config_loader import get_config
        app_config = get_config()
        sessions_dir = Path(app_config.telegram.sessions_dir)
        # Sanitize phone number for filename
        safe_phone = phone.replace("+", "").replace("-", "").replace(" ", "")
        return sessions_dir / f"{safe_phone}.session"
    
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
