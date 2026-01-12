"""
TG-Matrix Retry Configuration and Strategy
Provides unified retry configuration and smart retry algorithms
"""
from enum import Enum
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass
import math
import asyncio


class RetryStrategy(Enum):
    """Retry strategy types"""
    LINEAR = "linear"  # Fixed interval
    EXPONENTIAL = "exponential"  # Exponential backoff
    FIBONACCI = "fibonacci"  # Fibonacci sequence
    CUSTOM = "custom"  # Custom function


@dataclass
class RetryConfig:
    """Retry configuration"""
    max_attempts: int = 3
    initial_delay: float = 1.0  # seconds
    max_delay: float = 60.0  # seconds
    multiplier: float = 2.0  # for exponential backoff
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL
    jitter: bool = True  # Add random jitter to delay
    custom_delay_func: Optional[Callable[[int], float]] = None  # Custom delay function


class RetryHandler:
    """Unified retry handler with configurable strategies"""
    
    def __init__(self, config: RetryConfig):
        """
        Initialize retry handler
        
        Args:
            config: Retry configuration
        """
        self.config = config
    
    async def execute_with_retry(
        self,
        func: Callable,
        *args,
        should_retry: Optional[Callable[[Exception], bool]] = None,
        on_retry: Optional[Callable[[int, Exception], None]] = None,
        **kwargs
    ) -> Any:
        """
        Execute a function with retry logic
        
        Args:
            func: Function to execute
            *args: Positional arguments for function
            should_retry: Optional function to determine if exception should be retried
            on_retry: Optional callback called before each retry
            **kwargs: Keyword arguments for function
        
        Returns:
            Function result
        
        Raises:
            Last exception if all retries failed
        """
        last_exception = None
        
        for attempt in range(1, self.config.max_attempts + 1):
            try:
                if asyncio.iscoroutinefunction(func):
                    return await func(*args, **kwargs)
                else:
                    return func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                
                # Check if we should retry this exception
                if should_retry and not should_retry(e):
                    raise e
                
                # Check if we have more attempts
                if attempt >= self.config.max_attempts:
                    break
                
                # Calculate delay
                delay = self._calculate_delay(attempt)
                
                # Call on_retry callback if provided
                if on_retry:
                    if asyncio.iscoroutinefunction(on_retry):
                        await on_retry(attempt, e)
                    else:
                        on_retry(attempt, e)
                
                # Wait before retrying
                await asyncio.sleep(delay)
        
        # All retries failed
        raise last_exception
    
    def _calculate_delay(self, attempt: int) -> float:
        """
        Calculate delay before next retry attempt
        
        Args:
            attempt: Current attempt number (1-based)
        
        Returns:
            Delay in seconds
        """
        delay = self.config.initial_delay
        
        if self.config.strategy == RetryStrategy.LINEAR:
            delay = self.config.initial_delay * attempt
        
        elif self.config.strategy == RetryStrategy.EXPONENTIAL:
            delay = self.config.initial_delay * (self.config.multiplier ** (attempt - 1))
        
        elif self.config.strategy == RetryStrategy.FIBONACCI:
            delay = self.config.initial_delay * self._fibonacci(attempt)
        
        elif self.config.strategy == RetryStrategy.CUSTOM:
            if self.config.custom_delay_func:
                delay = self.config.custom_delay_func(attempt)
            else:
                delay = self.config.initial_delay
        
        # Apply max delay limit
        delay = min(delay, self.config.max_delay)
        
        # Add jitter if enabled
        if self.config.jitter:
            import random
            jitter_range = delay * 0.1  # 10% jitter
            delay = delay + random.uniform(-jitter_range, jitter_range)
            delay = max(0, delay)  # Ensure non-negative
        
        return delay
    
    def _fibonacci(self, n: int) -> int:
        """Calculate Fibonacci number"""
        if n <= 1:
            return 1
        a, b = 1, 1
        for _ in range(2, n):
            a, b = b, a + b
        return b


# Default retry configurations for different operations
DEFAULT_RETRY_CONFIGS: Dict[str, RetryConfig] = {
    "network": RetryConfig(
        max_attempts=3,
        initial_delay=1.0,
        max_delay=30.0,
        multiplier=2.0,
        strategy=RetryStrategy.EXPONENTIAL,
        jitter=True
    ),
    "database": RetryConfig(
        max_attempts=3,
        initial_delay=0.5,
        max_delay=10.0,
        multiplier=2.0,
        strategy=RetryStrategy.EXPONENTIAL,
        jitter=True
    ),
    "api": RetryConfig(
        max_attempts=5,
        initial_delay=2.0,
        max_delay=60.0,
        multiplier=2.0,
        strategy=RetryStrategy.EXPONENTIAL,
        jitter=True
    ),
    "message_send": RetryConfig(
        max_attempts=3,
        initial_delay=5.0,
        max_delay=120.0,
        multiplier=2.0,
        strategy=RetryStrategy.EXPONENTIAL,
        jitter=True
    ),
    "quick": RetryConfig(
        max_attempts=2,
        initial_delay=0.5,
        max_delay=5.0,
        multiplier=1.5,
        strategy=RetryStrategy.LINEAR,
        jitter=False
    )
}


def get_retry_handler(operation_type: str = "network") -> RetryHandler:
    """
    Get a retry handler for a specific operation type
    
    Args:
        operation_type: Type of operation (network, database, api, message_send, quick)
    
    Returns:
        RetryHandler instance
    """
    config = DEFAULT_RETRY_CONFIGS.get(operation_type, DEFAULT_RETRY_CONFIGS["network"])
    return RetryHandler(config)


def create_custom_retry_handler(
    max_attempts: int = 3,
    initial_delay: float = 1.0,
    max_delay: float = 60.0,
    multiplier: float = 2.0,
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL,
    jitter: bool = True
) -> RetryHandler:
    """
    Create a custom retry handler
    
    Args:
        max_attempts: Maximum number of retry attempts
        initial_delay: Initial delay in seconds
        max_delay: Maximum delay in seconds
        multiplier: Multiplier for exponential backoff
        strategy: Retry strategy
        jitter: Whether to add jitter to delays
    
    Returns:
        RetryHandler instance
    """
    config = RetryConfig(
        max_attempts=max_attempts,
        initial_delay=initial_delay,
        max_delay=max_delay,
        multiplier=multiplier,
        strategy=strategy,
        jitter=jitter
    )
    return RetryHandler(config)

