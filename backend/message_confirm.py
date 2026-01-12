"""
TG-Matrix Message Confirmation System
Handles message ID assignment, request-response pairing, and timeout detection
"""
import uuid
import time
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, field


class MessageStatus(Enum):
    """Message status"""
    PENDING = "pending"
    SENT = "sent"
    CONFIRMED = "confirmed"
    TIMEOUT = "timeout"
    FAILED = "failed"


@dataclass
class PendingMessage:
    """Represents a pending message waiting for confirmation"""
    message_id: str
    command: str
    payload: Any
    timestamp: datetime = field(default_factory=datetime.now)
    timeout_seconds: float = 60.0
    callback: Optional[Callable] = None
    status: MessageStatus = MessageStatus.PENDING
    retries: int = 0
    max_retries: int = 2


class MessageConfirmationSystem:
    """Manages message confirmation and retry logic"""
    
    def __init__(self):
        self.pending_messages: Dict[str, PendingMessage] = {}
        self.response_handlers: Dict[str, Callable] = {}
        self.message_id_counter = 0
    
    def generate_message_id(self) -> str:
        """Generate a unique message ID"""
        self.message_id_counter += 1
        return f"msg_{int(time.time() * 1000)}_{self.message_id_counter}"
    
    def register_pending_message(
        self,
        command: str,
        payload: Any,
        timeout_seconds: float = 30.0,
        callback: Optional[Callable] = None,
        max_retries: int = 3
    ) -> str:
        """
        Register a pending message and return its ID
        
        Args:
            command: Command name
            payload: Command payload
            timeout_seconds: Timeout in seconds
            callback: Optional callback when confirmed
            max_retries: Maximum number of retries
        
        Returns:
            Message ID
        """
        message_id = self.generate_message_id()
        
        pending = PendingMessage(
            message_id=message_id,
            command=command,
            payload=payload,
            timeout_seconds=timeout_seconds,
            callback=callback,
            max_retries=max_retries
        )
        
        self.pending_messages[message_id] = pending
        return message_id
    
    def confirm_message(self, message_id: str, result: Any = None) -> bool:
        """
        Confirm that a message was processed
        
        Args:
            message_id: Message ID to confirm
            result: Optional result data
        
        Returns:
            True if message was found and confirmed
        """
        if message_id not in self.pending_messages:
            return False
        
        pending = self.pending_messages[message_id]
        pending.status = MessageStatus.CONFIRMED
        
        # Call callback if provided
        if pending.callback:
            try:
                pending.callback(True, result)
            except Exception as e:
                print(f"Error in confirmation callback: {e}")
        
        # Remove from pending
        del self.pending_messages[message_id]
        return True
    
    def fail_message(self, message_id: str, error: Any = None) -> bool:
        """
        Mark a message as failed
        
        Args:
            message_id: Message ID to fail
            error: Optional error information
        
        Returns:
            True if message was found
        """
        if message_id not in self.pending_messages:
            return False
        
        pending = self.pending_messages[message_id]
        pending.status = MessageStatus.FAILED
        
        # Call callback if provided
        if pending.callback:
            try:
                pending.callback(False, error)
            except Exception as e:
                print(f"Error in failure callback: {e}")
        
        # Remove from pending
        del self.pending_messages[message_id]
        return True
    
    def get_pending_message(self, message_id: str) -> Optional[PendingMessage]:
        """Get a pending message by ID"""
        return self.pending_messages.get(message_id)
    
    def check_timeouts(self, current_time: Optional[datetime] = None) -> list[PendingMessage]:
        """
        Check for timed out messages
        
        Args:
            current_time: Current time (defaults to now)
        
        Returns:
            List of timed out messages
        """
        if current_time is None:
            current_time = datetime.now()
        
        timed_out = []
        
        for message_id, pending in list(self.pending_messages.items()):
            elapsed = (current_time - pending.timestamp).total_seconds()
            
            if elapsed > pending.timeout_seconds:
                pending.status = MessageStatus.TIMEOUT
                timed_out.append(pending)
                
                # Call callback if provided
                if pending.callback:
                    try:
                        pending.callback(False, {"reason": "timeout", "elapsed": elapsed})
                    except Exception as e:
                        print(f"Error in timeout callback: {e}")
                
                # Remove from pending
                del self.pending_messages[message_id]
        
        return timed_out
    
    def should_retry(self, pending: PendingMessage) -> bool:
        """Check if a message should be retried"""
        if pending.status != MessageStatus.TIMEOUT:
            return False
        
        return pending.retries < pending.max_retries
    
    def increment_retry(self, message_id: str):
        """Increment retry count for a message"""
        if message_id in self.pending_messages:
            self.pending_messages[message_id].retries += 1
            self.pending_messages[message_id].status = MessageStatus.PENDING
            self.pending_messages[message_id].timestamp = datetime.now()
    
    def get_pending_count(self) -> int:
        """Get count of pending messages"""
        return len(self.pending_messages)
    
    def clear_all(self):
        """Clear all pending messages"""
        self.pending_messages.clear()


# Global instance (will be initialized in main.py)
confirmation_system: Optional[MessageConfirmationSystem] = None


def get_confirmation_system() -> MessageConfirmationSystem:
    """Get global confirmation system"""
    global confirmation_system
    if confirmation_system is None:
        confirmation_system = MessageConfirmationSystem()
    return confirmation_system

