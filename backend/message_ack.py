"""
TG-Matrix Message Acknowledgment System
Handles request-response pairing and timeout detection
"""
import asyncio
import time
import uuid
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass


@dataclass
class PendingRequest:
    """Represents a pending request waiting for acknowledgment"""
    request_id: str
    command: str
    payload: Any
    timestamp: datetime
    callback: Optional[Callable] = None
    timeout_seconds: float = 60.0
    retry_count: int = 0
    max_retries: int = 2


class MessageAckManager:
    """Manages message acknowledgment and request-response pairing"""
    
    def __init__(self):
        self.pending_requests: Dict[str, PendingRequest] = {}
        self.response_handlers: Dict[str, Callable] = {}
        self.lock = asyncio.Lock()
        self.cleanup_task: Optional[asyncio.Task] = None
        self.running = True
    
    async def start(self):
        """Start the acknowledgment manager"""
        self.running = True
        self.cleanup_task = asyncio.create_task(self._cleanup_timeout_requests())
    
    async def stop(self):
        """Stop the acknowledgment manager"""
        self.running = False
        if self.cleanup_task:
            self.cleanup_task.cancel()
            try:
                await self.cleanup_task
            except asyncio.CancelledError:
                pass
    
    def generate_request_id(self) -> str:
        """Generate a unique request ID"""
        return str(uuid.uuid4())
    
    async def register_request(
        self,
        command: str,
        payload: Any,
        callback: Optional[Callable] = None,
        timeout_seconds: float = 30.0,
        max_retries: int = 3
    ) -> str:
        """
        Register a pending request
        
        Args:
            command: Command name
            payload: Command payload
            callback: Optional callback when response is received
            timeout_seconds: Timeout in seconds
            max_retries: Maximum number of retries
        
        Returns:
            Request ID
        """
        request_id = self.generate_request_id()
        
        async with self.lock:
            self.pending_requests[request_id] = PendingRequest(
                request_id=request_id,
                command=command,
                payload=payload,
                timestamp=datetime.now(),
                callback=callback,
                timeout_seconds=timeout_seconds,
                max_retries=max_retries
            )
        
        return request_id
    
    async def handle_response(self, request_id: str, response: Any, success: bool = True):
        """
        Handle a response for a pending request
        
        Args:
            request_id: Request ID
            response: Response data
            success: Whether the response indicates success
        """
        async with self.lock:
            if request_id not in self.pending_requests:
                # Response for unknown request (may be from previous session)
                return
            
            pending = self.pending_requests.pop(request_id)
            
            # Call callback if provided
            if pending.callback:
                try:
                    if asyncio.iscoroutinefunction(pending.callback):
                        await pending.callback(request_id, response, success)
                    else:
                        pending.callback(request_id, response, success)
                except Exception as e:
                    print(f"Error in response callback: {e}")
    
    async def get_pending_request(self, request_id: str) -> Optional[PendingRequest]:
        """Get a pending request by ID"""
        async with self.lock:
            return self.pending_requests.get(request_id)
    
    async def cancel_request(self, request_id: str):
        """Cancel a pending request"""
        async with self.lock:
            if request_id in self.pending_requests:
                del self.pending_requests[request_id]
    
    async def retry_request(self, request_id: str) -> Optional[str]:
        """
        Retry a timed-out request
        
        Args:
            request_id: Request ID to retry
        
        Returns:
            New request ID if retry is allowed, None otherwise
        """
        async with self.lock:
            if request_id not in self.pending_requests:
                return None
            
            pending = self.pending_requests[request_id]
            
            # Check if we can retry
            if pending.retry_count >= pending.max_retries:
                # Max retries reached, remove request
                del self.pending_requests[request_id]
                return None
            
            # Increment retry count
            pending.retry_count += 1
            pending.timestamp = datetime.now()
            
            # Return original request ID (will be retried with same ID)
            return request_id
    
    async def _cleanup_timeout_requests(self):
        """Background task to clean up timed-out requests"""
        while self.running:
            try:
                await asyncio.sleep(1.0)  # Check every second
                
                now = datetime.now()
                timeout_requests = []
                
                async with self.lock:
                    for request_id, pending in list(self.pending_requests.items()):
                        elapsed = (now - pending.timestamp).total_seconds()
                        if elapsed > pending.timeout_seconds:
                            timeout_requests.append(request_id)
                
                # Handle timeout requests outside lock
                for request_id in timeout_requests:
                    await self._handle_timeout(request_id)
            
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in cleanup task: {e}")
                await asyncio.sleep(5.0)
    
    async def _handle_timeout(self, request_id: str):
        """Handle a timed-out request"""
        async with self.lock:
            if request_id not in self.pending_requests:
                return
            
            pending = self.pending_requests[request_id]
            
            # Check if we can retry
            if pending.retry_count < pending.max_retries:
                # Will be retried
                pending.retry_count += 1
                pending.timestamp = datetime.now()
                
                # Call callback with timeout
                if pending.callback:
                    try:
                        if asyncio.iscoroutinefunction(pending.callback):
                            await pending.callback(request_id, {"error": "timeout"}, False)
                        else:
                            pending.callback(request_id, {"error": "timeout"}, False)
                    except Exception as e:
                        print(f"Error in timeout callback: {e}")
            else:
                # Max retries reached, remove request
                del self.pending_requests[request_id]
                
                # Call callback with final failure
                if pending.callback:
                    try:
                        if asyncio.iscoroutinefunction(pending.callback):
                            await pending.callback(request_id, {"error": "timeout", "max_retries": True}, False)
                        else:
                            pending.callback(request_id, {"error": "timeout", "max_retries": True}, False)
                    except Exception as e:
                        print(f"Error in final failure callback: {e}")
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get statistics about pending requests"""
        async with self.lock:
            return {
                "pending_count": len(self.pending_requests),
                "pending_requests": [
                    {
                        "request_id": req.request_id,
                        "command": req.command,
                        "elapsed_seconds": (datetime.now() - req.timestamp).total_seconds(),
                        "retry_count": req.retry_count
                    }
                    for req in self.pending_requests.values()
                ]
            }


# Global acknowledgment manager instance
_ack_manager: Optional[MessageAckManager] = None


def get_ack_manager() -> MessageAckManager:
    """Get global acknowledgment manager"""
    global _ack_manager
    if _ack_manager is None:
        _ack_manager = MessageAckManager()
    return _ack_manager


async def init_ack_manager():
    """Initialize global acknowledgment manager"""
    global _ack_manager
    if _ack_manager is None:
        _ack_manager = MessageAckManager()
        await _ack_manager.start()
    return _ack_manager

