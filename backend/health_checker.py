"""
TG-Matrix Connection Health Checker
Monitors Telegram connection health and handles reconnection
"""
import asyncio
import time
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum


class ConnectionStatus(Enum):
    """Connection status"""
    ONLINE = "online"
    OFFLINE = "offline"
    CONNECTING = "connecting"
    ERROR = "error"
    UNKNOWN = "unknown"


@dataclass
class ConnectionHealth:
    """Connection health information"""
    phone: str
    status: ConnectionStatus
    last_heartbeat: Optional[datetime] = None
    last_success: Optional[datetime] = None
    consecutive_failures: int = 0
    total_heartbeats: int = 0
    total_failures: int = 0
    reconnect_attempts: int = 0
    last_error: Optional[str] = None


class HealthChecker:
    """Monitors connection health and handles reconnection"""
    
    def __init__(
        self,
        check_callback: Callable[[str], bool],
        reconnect_callback: Optional[Callable[[str], None]] = None,
        event_callback: Optional[Callable[[str, Dict[str, Any]], None]] = None,
        check_interval: float = 300.0,  # 5 minutes
        timeout: float = 30.0,  # 30 seconds
        max_consecutive_failures: int = 3,
        reconnect_delay: float = 60.0  # 1 minute
    ):
        """
        Initialize health checker
        
        Args:
            check_callback: Function to check connection status (phone) -> bool
            reconnect_callback: Optional function to reconnect (phone) -> None
            event_callback: Optional function to send events (event_name, payload) -> None
            check_interval: Interval between health checks in seconds
            timeout: Timeout for health check in seconds
            max_consecutive_failures: Max failures before attempting reconnect
            reconnect_delay: Delay before reconnecting in seconds
        """
        self.check_callback = check_callback
        self.reconnect_callback = reconnect_callback
        self.event_callback = event_callback
        self.check_interval = check_interval
        self.timeout = timeout
        self.max_consecutive_failures = max_consecutive_failures
        self.reconnect_delay = reconnect_delay
        
        self.health_status: Dict[str, ConnectionHealth] = {}
        self.running = False
        self.check_task: Optional[asyncio.Task] = None
        self.lock = asyncio.Lock()
    
    async def start(self):
        """Start health checking"""
        if self.running:
            return
        
        self.running = True
        self.check_task = asyncio.create_task(self._health_check_loop())
    
    async def stop(self):
        """Stop health checking"""
        self.running = False
        if self.check_task:
            self.check_task.cancel()
            try:
                await self.check_task
            except asyncio.CancelledError:
                pass
    
    async def register_connection(self, phone: str):
        """Register a connection for health checking"""
        async with self.lock:
            if phone not in self.health_status:
                self.health_status[phone] = ConnectionHealth(
                    phone=phone,
                    status=ConnectionStatus.UNKNOWN
                )
    
    async def unregister_connection(self, phone: str):
        """Unregister a connection from health checking"""
        async with self.lock:
            if phone in self.health_status:
                del self.health_status[phone]
    
    async def record_heartbeat(self, phone: str, success: bool = True, error: Optional[str] = None):
        """Record a heartbeat result"""
        async with self.lock:
            if phone not in self.health_status:
                self.register_connection(phone)
            
            health = self.health_status[phone]
            health.total_heartbeats += 1
            
            if success:
                health.status = ConnectionStatus.ONLINE
                health.last_heartbeat = datetime.now()
                health.last_success = datetime.now()
                health.consecutive_failures = 0
                health.last_error = None
            else:
                health.total_failures += 1
                health.consecutive_failures += 1
                health.last_error = error
                
                if health.consecutive_failures >= self.max_consecutive_failures:
                    health.status = ConnectionStatus.ERROR
                else:
                    health.status = ConnectionStatus.OFFLINE
    
    async def _health_check_loop(self):
        """Main health check loop"""
        while self.running:
            try:
                await asyncio.sleep(self.check_interval)
                
                # Get list of phones to check
                async with self.lock:
                    phones_to_check = list(self.health_status.keys())
                
                # Check each connection
                for phone in phones_to_check:
                    if not self.running:
                        break
                    
                    await self._check_connection(phone)
            
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in health check loop: {e}")
                await asyncio.sleep(5)
    
    async def _check_connection(self, phone: str):
        """Check a single connection"""
        try:
                # Perform health check with timeout
            # Check if callback is async
            if asyncio.iscoroutinefunction(self.check_callback):
                success = await asyncio.wait_for(
                    self.check_callback(phone),
                    timeout=self.timeout
                )
            else:
                success = await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(
                        None,
                        lambda: self.check_callback(phone)
                    ),
                    timeout=self.timeout
                )
            
            if success:
                await self.record_heartbeat(phone, success=True)
                
                # Send event if callback provided
                if self.event_callback:
                    self.event_callback("connection-health-update", {
                        "phone": phone,
                        "status": "online",
                        "timestamp": datetime.now().isoformat()
                    })
            else:
                await self.record_heartbeat(phone, success=False, error="Health check failed")
                await self._handle_failure(phone)
        
        except asyncio.TimeoutError:
            await self.record_heartbeat(phone, success=False, error="Health check timeout")
            await self._handle_failure(phone)
        
        except Exception as e:
            await self.record_heartbeat(phone, success=False, error=str(e))
            await self._handle_failure(phone)
    
    async def _handle_failure(self, phone: str):
        """Handle connection failure"""
        async with self.lock:
            if phone not in self.health_status:
                return
            
            health = self.health_status[phone]
            
            # Check if we should attempt reconnection
            if (health.consecutive_failures >= self.max_consecutive_failures and
                self.reconnect_callback):
                
                # Check if enough time has passed since last reconnect attempt
                should_reconnect = True
                if health.last_success:
                    time_since_last_success = (datetime.now() - health.last_success).total_seconds()
                    if time_since_last_success < self.reconnect_delay:
                        should_reconnect = False
                
                if should_reconnect:
                    health.reconnect_attempts += 1
                    health.status = ConnectionStatus.CONNECTING
                    
                    # Send event
                    if self.event_callback:
                        self.event_callback("connection-reconnecting", {
                            "phone": phone,
                            "attempt": health.reconnect_attempts,
                            "timestamp": datetime.now().isoformat()
                        })
                    
                    # Attempt reconnection
                    try:
                        if asyncio.iscoroutinefunction(self.reconnect_callback):
                            await self.reconnect_callback(phone)
                        else:
                            self.reconnect_callback(phone)
                    except Exception as e:
                        print(f"Error reconnecting {phone}: {e}")
                        if self.event_callback:
                            self.event_callback("connection-reconnect-failed", {
                                "phone": phone,
                                "error": str(e),
                                "timestamp": datetime.now().isoformat()
                            })
            
            # Send failure event
            if self.event_callback:
                self.event_callback("connection-health-update", {
                    "phone": phone,
                    "status": health.status.value,
                    "consecutive_failures": health.consecutive_failures,
                    "error": health.last_error,
                    "timestamp": datetime.now().isoformat()
                })
    
    def get_health_status(self, phone: str) -> Optional[ConnectionHealth]:
        """Get health status for a connection"""
        return self.health_status.get(phone)
    
    def get_all_health_status(self) -> Dict[str, ConnectionHealth]:
        """Get health status for all connections"""
        return self.health_status.copy()
    
    async def force_check(self, phone: str):
        """Force an immediate health check for a connection"""
        await self._check_connection(phone)

