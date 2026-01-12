"""
TG-Matrix Global Error Handler
Provides unified error classification and handling
"""
from enum import Enum
from typing import Optional, Dict, Any, Callable, Type
from datetime import datetime
import traceback


class ErrorType(Enum):
    """Error type classification"""
    NETWORK_ERROR = "network_error"
    API_ERROR = "api_error"
    DATABASE_ERROR = "database_error"
    VALIDATION_ERROR = "validation_error"
    BUSINESS_ERROR = "business_error"
    UNKNOWN_ERROR = "unknown_error"


class AppError(Exception):
    """Base application error with classification"""
    
    def __init__(
        self,
        message: str,
        error_type: ErrorType,
        original_error: Optional[Exception] = None,
        context: Optional[Dict[str, Any]] = None,
        retryable: bool = False
    ):
        super().__init__(message)
        self.error_type = error_type
        self.original_error = original_error
        self.context = context or {}
        self.retryable = retryable
        self.timestamp = datetime.now()
        self.traceback_str = traceback.format_exc() if original_error else None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary"""
        return {
            "message": str(self),
            "type": self.error_type.value,
            "retryable": self.retryable,
            "context": self.context,
            "timestamp": self.timestamp.isoformat(),
            "traceback": self.traceback_str
        }


class NetworkError(AppError):
    """Network-related errors"""
    
    def __init__(self, message: str, original_error: Optional[Exception] = None, context: Optional[Dict[str, Any]] = None):
        super().__init__(message, ErrorType.NETWORK_ERROR, original_error, context, retryable=True)


class APIError(AppError):
    """API-related errors (Telegram API, etc.)"""
    
    def __init__(
        self,
        message: str,
        original_error: Optional[Exception] = None,
        context: Optional[Dict[str, Any]] = None,
        retryable: bool = False
    ):
        super().__init__(message, ErrorType.API_ERROR, original_error, context, retryable=retryable)


class DatabaseError(AppError):
    """Database-related errors"""
    
    def __init__(self, message: str, original_error: Optional[Exception] = None, context: Optional[Dict[str, Any]] = None):
        super().__init__(message, ErrorType.DATABASE_ERROR, original_error, context, retryable=True)


class ValidationError(AppError):
    """Validation errors (invalid input, etc.)"""
    
    def __init__(self, message: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(message, ErrorType.VALIDATION_ERROR, None, context, retryable=False)


class BusinessError(AppError):
    """Business logic errors"""
    
    def __init__(self, message: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(message, ErrorType.BUSINESS_ERROR, None, context, retryable=False)


class ErrorHandler:
    """Global error handler"""
    
    def __init__(self, log_callback: Optional[Callable] = None):
        """
        Initialize error handler
        
        Args:
            log_callback: Optional callback function for logging errors
                         Signature: log_callback(error_type: str, message: str, details: Dict)
        """
        self.log_callback = log_callback
        self.error_handlers: Dict[Type[Exception], callable] = {}
        self._register_default_handlers()
    
    def _register_default_handlers(self):
        """Register default error handlers"""
        import aiosqlite
        from pyrogram.errors import (
            FloodWait, Flood, RPCError
        )
        # ConnectionError might not exist in all Pyrogram versions
        try:
            from pyrogram.errors import ConnectionError as PyrogramConnectionError
        except ImportError:
            # Use Python's built-in ConnectionError as fallback
            from builtins import ConnectionError as PyrogramConnectionError
        
        # ProxyConnectionError might not exist in all Pyrogram versions
        try:
            from pyrogram.errors import ProxyConnectionError
        except ImportError:
            ProxyConnectionError = PyrogramConnectionError  # Use ConnectionError as fallback
        
        # Network errors
        self.register_handler(PyrogramConnectionError, self._handle_network_error)
        self.register_handler(ProxyConnectionError, self._handle_network_error)
        # Also register Python's built-in ConnectionError
        from builtins import ConnectionError
        self.register_handler(ConnectionError, self._handle_network_error)
        self.register_handler(TimeoutError, self._handle_network_error)
        
        # API errors
        self.register_handler(FloodWait, self._handle_flood_wait)
        self.register_handler(Flood, self._handle_flood)
        self.register_handler(RPCError, self._handle_rpc_error)
        
        # Database errors
        self.register_handler(aiosqlite.Error, self._handle_database_error)
        self.register_handler(aiosqlite.OperationalError, self._handle_database_error)
        self.register_handler(aiosqlite.IntegrityError, self._handle_database_error)
        
        # Python built-in errors
        self.register_handler(ValueError, self._handle_validation_error)
        self.register_handler(KeyError, self._handle_validation_error)
        self.register_handler(TypeError, self._handle_validation_error)
    
    def register_handler(self, exception_type: Type[Exception], handler: Callable):
        """Register a custom error handler"""
        self.error_handlers[exception_type] = handler
    
    def handle(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> AppError:
        """
        Handle an exception and convert to AppError
        
        Args:
            error: The exception to handle
            context: Additional context information
        
        Returns:
            AppError instance
        """
        error_type = type(error)
        
        # Check for registered handler
        if error_type in self.error_handlers:
            return self.error_handlers[error_type](error, context)
        
        # Check parent classes
        for exc_type, handler in self.error_handlers.items():
            if isinstance(error, exc_type):
                return handler(error, context)
        
        # Default handling
        return self._handle_unknown_error(error, context)
    
    def _handle_network_error(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> NetworkError:
        """Handle network errors"""
        message = f"Network error: {str(error)}"
        app_error = NetworkError(message, error, context)
        self._log_error(app_error)
        return app_error
    
    def _handle_flood_wait(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> APIError:
        """Handle FloodWait errors"""
        wait_seconds = getattr(error, 'value', 0)
        message = f"Flood wait: {wait_seconds} seconds"
        app_error = APIError(message, error, context, retryable=True)
        self._log_error(app_error)
        return app_error
    
    def _handle_flood(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> APIError:
        """Handle Flood errors"""
        message = f"Flood error: {str(error)}"
        app_error = APIError(message, error, context, retryable=True)
        self._log_error(app_error)
        return app_error
    
    def _handle_rpc_error(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> APIError:
        """Handle RPC errors"""
        error_code = getattr(error, 'code', None)
        
        # Determine if retryable based on error code
        retryable_codes = [500, 502, 503, 504, 429]  # Temporary errors
        retryable = error_code in retryable_codes if error_code else False
        
        message = f"RPC error (code: {error_code}): {str(error)}"
        app_error = APIError(message, error, context, retryable=retryable)
        self._log_error(app_error)
        return app_error
    
    def _handle_database_error(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> DatabaseError:
        """Handle database errors"""
        message = f"Database error: {str(error)}"
        app_error = DatabaseError(message, error, context)
        self._log_error(app_error)
        return app_error
    
    def _handle_validation_error(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> ValidationError:
        """Handle validation errors"""
        message = f"Validation error: {str(error)}"
        app_error = ValidationError(message, context)
        self._log_error(app_error)
        return app_error
    
    def _handle_unknown_error(self, error: Exception, context: Optional[Dict[str, Any]] = None) -> AppError:
        """Handle unknown errors"""
        message = f"Unknown error: {str(error)}"
        app_error = AppError(message, ErrorType.UNKNOWN_ERROR, error, context, retryable=False)
        self._log_error(app_error)
        return app_error
    
    def _log_error(self, app_error: AppError):
        """Log error using callback if available"""
        if self.log_callback:
            try:
                self.log_callback(
                    app_error.error_type.value,
                    str(app_error),
                    app_error.to_dict()
                )
            except Exception:
                pass  # Don't fail if logging fails


# Global error handler instance (will be initialized in main.py)
error_handler: Optional[ErrorHandler] = None


def init_error_handler(log_callback: Optional[Callable] = None) -> ErrorHandler:
    """Initialize global error handler"""
    global error_handler
    error_handler = ErrorHandler(log_callback)
    return error_handler


def get_error_handler() -> ErrorHandler:
    """Get global error handler"""
    global error_handler
    if error_handler is None:
        error_handler = ErrorHandler()
    return error_handler


def handle_error(error: Exception, context: Optional[Dict[str, Any]] = None) -> AppError:
    """Convenience function to handle errors"""
    return get_error_handler().handle(error, context)
