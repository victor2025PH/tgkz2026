"""
TG-Matrix Configuration Loader
Handles loading and validating configuration from files and environment variables
"""
import json
import os
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field, asdict
from config import BASE_DIR


@dataclass
class DatabaseConfig:
    """Database configuration"""
    path: str = str(BASE_DIR / "data" / "tgmatrix.db")
    backup_dir: str = str(BASE_DIR / "data" / "backups")
    backup_retention_days: int = 7
    backup_on_startup: bool = True
    backup_interval_hours: int = 24


@dataclass
class TelegramConfig:
    """Telegram API configuration"""
    api_id: Optional[str] = None
    api_hash: Optional[str] = None
    sessions_dir: str = str(BASE_DIR / "sessions")


@dataclass
class MonitoringConfig:
    """Monitoring configuration"""
    message_check_interval: float = 1.0
    max_concurrent_accounts: int = 10
    health_check_interval: float = 300.0  # 5 minutes
    health_check_enabled: bool = True


@dataclass
class SendingConfig:
    """Message sending configuration"""
    min_delay: int = 30
    max_delay: int = 120
    max_per_minute: int = 20
    max_per_hour: int = 200
    default_daily_limit: int = 50
    default_health_score: int = 100


@dataclass
class RetryConfig:
    """Retry configuration"""
    network_max_attempts: int = 3
    network_initial_delay: float = 1.0
    network_max_delay: float = 30.0
    
    database_max_attempts: int = 3
    database_initial_delay: float = 0.5
    database_max_delay: float = 10.0
    
    api_max_attempts: int = 5
    api_initial_delay: float = 2.0
    api_max_delay: float = 60.0
    
    message_max_attempts: int = 3
    message_initial_delay: float = 5.0
    message_max_delay: float = 120.0


@dataclass
class LoggingConfig:
    """Logging configuration"""
    level: str = "INFO"  # DEBUG, INFO, WARNING, ERROR
    max_entries: int = 100
    log_dir: str = str(BASE_DIR / "logs")
    rotate_on_startup: bool = True
    retention_days: int = 30


@dataclass
class AppConfig:
    """Complete application configuration"""
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    telegram: TelegramConfig = field(default_factory=TelegramConfig)
    monitoring: MonitoringConfig = field(default_factory=MonitoringConfig)
    sending: SendingConfig = field(default_factory=SendingConfig)
    retry: RetryConfig = field(default_factory=RetryConfig)
    logging: LoggingConfig = field(default_factory=LoggingConfig)
    
    @classmethod
    def load_from_file(cls, config_path: Optional[Path] = None) -> 'AppConfig':
        """
        Load configuration from JSON file
        
        Args:
            config_path: Path to config file (default: data/config.json)
        
        Returns:
            AppConfig instance
        """
        if config_path is None:
            config_path = BASE_DIR / "data" / "config.json"
        
        if not config_path.exists():
            # Return default config if file doesn't exist
            return cls()
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return cls.from_dict(data)
        except Exception as e:
            print(f"Error loading config file: {e}")
            return cls()  # Return default on error
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AppConfig':
        """Create AppConfig from dictionary"""
        config = cls()
        
        if 'database' in data:
            config.database = DatabaseConfig(**data['database'])
        if 'telegram' in data:
            config.telegram = TelegramConfig(**data['telegram'])
        if 'monitoring' in data:
            config.monitoring = MonitoringConfig(**data['monitoring'])
        if 'sending' in data:
            config.sending = SendingConfig(**data['sending'])
        if 'retry' in data:
            config.retry = RetryConfig(**data['retry'])
        if 'logging' in data:
            config.logging = LoggingConfig(**data['logging'])
        
        return config
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert AppConfig to dictionary"""
        return {
            'database': asdict(self.database),
            'telegram': asdict(self.telegram),
            'monitoring': asdict(self.monitoring),
            'sending': asdict(self.sending),
            'retry': asdict(self.retry),
            'logging': asdict(self.logging)
        }
    
    def save_to_file(self, config_path: Optional[Path] = None):
        """
        Save configuration to JSON file
        
        Args:
            config_path: Path to config file (default: data/config.json)
        """
        if config_path is None:
            config_path = BASE_DIR / "data" / "config.json"
        
        # Ensure directory exists
        config_path.parent.mkdir(parents=True, exist_ok=True)
        
        try:
            with open(config_path, 'w', encoding='utf-8') as f:
                json.dump(self.to_dict(), f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving config file: {e}")
            raise
    
    def apply_env_overrides(self):
        """Apply environment variable overrides"""
        # Database
        if os.getenv('TG_DB_PATH'):
            self.database.path = os.getenv('TG_DB_PATH')
        if os.getenv('TG_BACKUP_RETENTION_DAYS'):
            self.database.backup_retention_days = int(os.getenv('TG_BACKUP_RETENTION_DAYS'))
        
        # Telegram
        if os.getenv('TELEGRAM_API_ID'):
            self.telegram.api_id = os.getenv('TELEGRAM_API_ID')
        if os.getenv('TELEGRAM_API_HASH'):
            self.telegram.api_hash = os.getenv('TELEGRAM_API_HASH')
        if os.getenv('TELEGRAM_SESSIONS_DIR'):
            self.telegram.sessions_dir = os.getenv('TELEGRAM_SESSIONS_DIR')
        
        # Monitoring
        if os.getenv('TG_MONITOR_INTERVAL'):
            self.monitoring.message_check_interval = float(os.getenv('TG_MONITOR_INTERVAL'))
        if os.getenv('TG_MAX_CONCURRENT'):
            self.monitoring.max_concurrent_accounts = int(os.getenv('TG_MAX_CONCURRENT'))
        
        # Sending
        if os.getenv('TG_MIN_DELAY'):
            self.sending.min_delay = int(os.getenv('TG_MIN_DELAY'))
        if os.getenv('TG_MAX_DELAY'):
            self.sending.max_delay = int(os.getenv('TG_MAX_DELAY'))
        
        # Logging
        if os.getenv('TG_LOG_LEVEL'):
            self.logging.level = os.getenv('TG_LOG_LEVEL').upper()
    
    def validate(self) -> List[str]:
        """
        Validate configuration
        
        Returns:
            List of validation errors (empty if valid)
        """
        errors = []
        
        # Database validation
        if not self.database.path:
            errors.append("Database path is required")
        if self.database.backup_retention_days < 0:
            errors.append("Backup retention days must be non-negative")
        
        # Telegram validation
        # API ID and Hash are optional (can be set per account)
        
        # Monitoring validation
        if self.monitoring.message_check_interval <= 0:
            errors.append("Message check interval must be positive")
        if self.monitoring.max_concurrent_accounts <= 0:
            errors.append("Max concurrent accounts must be positive")
        
        # Sending validation
        if self.sending.min_delay < 0:
            errors.append("Min delay must be non-negative")
        if self.sending.max_delay < self.sending.min_delay:
            errors.append("Max delay must be >= min delay")
        if self.sending.max_per_minute <= 0:
            errors.append("Max per minute must be positive")
        if self.sending.max_per_hour <= 0:
            errors.append("Max per hour must be positive")
        
        # Retry validation
        if self.retry.network_max_attempts <= 0:
            errors.append("Network max attempts must be positive")
        if self.retry.database_max_attempts <= 0:
            errors.append("Database max attempts must be positive")
        
        # Logging validation
        valid_log_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR']
        if self.logging.level not in valid_log_levels:
            errors.append(f"Log level must be one of: {', '.join(valid_log_levels)}")
        
        return errors


# Global config instance
_app_config: Optional[AppConfig] = None


def load_config(config_path: Optional[Path] = None) -> AppConfig:
    """
    Load application configuration
    
    Priority: Environment variables > Config file > Defaults
    
    Args:
        config_path: Optional path to config file
    
    Returns:
        AppConfig instance
    """
    global _app_config
    
    # Load from file
    config = AppConfig.load_from_file(config_path)
    
    # Apply environment variable overrides
    config.apply_env_overrides()
    
    # Validate
    errors = config.validate()
    if errors:
        print("Configuration validation errors:")
        for error in errors:
            print(f"  - {error}")
        # Use defaults for invalid values
        print("Using default values for invalid configuration")
    
    _app_config = config
    return config


def get_config() -> AppConfig:
    """Get global configuration instance"""
    global _app_config
    if _app_config is None:
        _app_config = load_config()
    return _app_config


def save_config(config: AppConfig, config_path: Optional[Path] = None):
    """Save configuration to file"""
    global _app_config
    config.save_to_file(config_path)
    _app_config = config

