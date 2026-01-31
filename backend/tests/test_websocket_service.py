"""
WebSocket 服務單元測試
WebSocket Service Unit Tests

🆕 測試優化: 後端單元測試
"""

import pytest
import os
import sys
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from websocket_service import (
    WebSocketService, SubscriptionType, Subscription, 
    Connection, RealtimeMessage, get_websocket_service
)


class TestWebSocketService:
    """WebSocket 服務測試"""
    
    @pytest.fixture
    def ws_service(self):
        """創建服務實例"""
        service = WebSocketService()
        service._running = False  # 禁用心跳線程
        return service
    
    # ============ 連接管理測試 ============
    
    def test_connect(self, ws_service):
        """測試連接"""
        conn_id = ws_service.connect()
        
        assert conn_id is not None
        assert conn_id.startswith("conn-")
        assert ws_service.is_connected(conn_id)
        assert ws_service.get_connection_count() == 1
    
    def test_connect_with_custom_id(self, ws_service):
        """測試自定義連接 ID"""
        conn_id = ws_service.connect("my-custom-id")
        
        assert conn_id == "my-custom-id"
        assert ws_service.is_connected("my-custom-id")
    
    def test_disconnect(self, ws_service):
        """測試斷開連接"""
        conn_id = ws_service.connect()
        ws_service.disconnect(conn_id)
        
        assert not ws_service.is_connected(conn_id)
        assert ws_service.get_connection_count() == 0
    
    def test_heartbeat(self, ws_service):
        """測試心跳"""
        conn_id = ws_service.connect()
        
        result = ws_service.heartbeat(conn_id)
        
        assert result is True
    
    def test_heartbeat_invalid_connection(self, ws_service):
        """測試無效連接心跳"""
        result = ws_service.heartbeat("invalid-id")
        
        assert result is False
    
    # ============ 訂閱管理測試 ============
    
    def test_subscribe(self, ws_service):
        """測試訂閱"""
        conn_id = ws_service.connect()
        
        sub_id = ws_service.subscribe(conn_id, SubscriptionType.TASK_STATUS)
        
        assert sub_id is not None
        assert sub_id.startswith("sub-")
    
    def test_subscribe_with_filter(self, ws_service):
        """測試帶過濾器的訂閱"""
        conn_id = ws_service.connect()
        
        sub_id = ws_service.subscribe(
            conn_id, 
            SubscriptionType.TASK_STATUS,
            filter_={"task_id": "task-123"}
        )
        
        assert sub_id is not None
    
    def test_subscribe_invalid_connection(self, ws_service):
        """測試無效連接訂閱"""
        sub_id = ws_service.subscribe("invalid-id", SubscriptionType.TASK_STATUS)
        
        assert sub_id is None
    
    def test_unsubscribe(self, ws_service):
        """測試取消訂閱"""
        conn_id = ws_service.connect()
        sub_id = ws_service.subscribe(conn_id, SubscriptionType.TASK_STATUS)
        
        result = ws_service.unsubscribe(conn_id, sub_id)
        
        assert result is True
    
    def test_unsubscribe_all(self, ws_service):
        """測試取消所有訂閱"""
        conn_id = ws_service.connect()
        ws_service.subscribe(conn_id, SubscriptionType.TASK_STATUS)
        ws_service.subscribe(conn_id, SubscriptionType.TASK_LOG)
        
        ws_service.unsubscribe_all(conn_id)
        
        # 驗證訂閱已清空
        assert conn_id not in ws_service._type_subscriptions[SubscriptionType.TASK_STATUS]
        assert conn_id not in ws_service._type_subscriptions[SubscriptionType.TASK_LOG]
    
    # ============ 消息推送測試 ============
    
    def test_publish(self, ws_service):
        """測試發佈消息"""
        conn_id = ws_service.connect()
        ws_service.subscribe(conn_id, SubscriptionType.TASK_STATUS)
        
        messages_received = []
        ws_service.set_message_handler(lambda cid, msg: messages_received.append((cid, msg)))
        
        ws_service.publish(SubscriptionType.TASK_STATUS, {"task_id": "123", "status": "running"})
        
        assert len(messages_received) == 1
        assert messages_received[0][0] == conn_id
    
    def test_publish_with_filter_match(self, ws_service):
        """測試帶過濾器匹配的發佈"""
        conn_id = ws_service.connect()
        ws_service.subscribe(
            conn_id, 
            SubscriptionType.TASK_STATUS,
            filter_={"task_id": "task-123"}
        )
        
        messages_received = []
        ws_service.set_message_handler(lambda cid, msg: messages_received.append((cid, msg)))
        
        # 匹配的消息
        ws_service.publish(
            SubscriptionType.TASK_STATUS, 
            {"status": "running"},
            filter_match={"task_id": "task-123"}
        )
        
        assert len(messages_received) == 1
    
    def test_publish_with_filter_no_match(self, ws_service):
        """測試過濾器不匹配"""
        conn_id = ws_service.connect()
        ws_service.subscribe(
            conn_id, 
            SubscriptionType.TASK_STATUS,
            filter_={"task_id": "task-123"}
        )
        
        messages_received = []
        ws_service.set_message_handler(lambda cid, msg: messages_received.append((cid, msg)))
        
        # 不匹配的消息
        ws_service.publish(
            SubscriptionType.TASK_STATUS, 
            {"status": "running"},
            filter_match={"task_id": "task-456"}
        )
        
        assert len(messages_received) == 0
    
    def test_broadcast(self, ws_service):
        """測試廣播"""
        conn1 = ws_service.connect()
        conn2 = ws_service.connect()
        
        messages_received = []
        ws_service.set_message_handler(lambda cid, msg: messages_received.append(cid))
        
        ws_service.broadcast({"message": "Hello everyone"})
        
        assert len(messages_received) == 2
        assert conn1 in messages_received
        assert conn2 in messages_received
    
    def test_send_to(self, ws_service):
        """測試定向發送"""
        conn1 = ws_service.connect()
        conn2 = ws_service.connect()
        
        messages_received = []
        ws_service.set_message_handler(lambda cid, msg: messages_received.append(cid))
        
        ws_service.send_to(conn1, {"message": "Hello"})
        
        assert len(messages_received) == 1
        assert messages_received[0] == conn1
    
    # ============ 便捷方法測試 ============
    
    def test_publish_task_status(self, ws_service):
        """測試發佈任務狀態"""
        conn_id = ws_service.connect()
        ws_service.subscribe(conn_id, SubscriptionType.TASK_STATUS)
        
        messages_received = []
        ws_service.set_message_handler(lambda cid, msg: messages_received.append(msg))
        
        ws_service.publish_task_status("task-123", "running", {"name": "Test"})
        
        assert len(messages_received) == 1
        assert messages_received[0]["data"]["task_id"] == "task-123"
        assert messages_received[0]["data"]["status"] == "running"
    
    def test_publish_task_log(self, ws_service):
        """測試發佈任務日誌"""
        conn_id = ws_service.connect()
        ws_service.subscribe(conn_id, SubscriptionType.TASK_LOG)
        
        messages_received = []
        ws_service.set_message_handler(lambda cid, msg: messages_received.append(msg))
        
        ws_service.publish_task_log("task-123", "info", "AI", "Processing...")
        
        assert len(messages_received) == 1
        assert messages_received[0]["data"]["level"] == "info"
        assert messages_received[0]["data"]["category"] == "AI"


class TestRealtimeMessage:
    """實時消息測試"""
    
    def test_message_creation(self):
        """測試消息創建"""
        msg = RealtimeMessage(type="test", data={"key": "value"})
        
        assert msg.type == "test"
        assert msg.data == {"key": "value"}
        assert msg.timestamp is not None
    
    def test_message_with_timestamp(self):
        """測試帶時間戳的消息"""
        ts = "2024-01-01T00:00:00"
        msg = RealtimeMessage(type="test", data={}, timestamp=ts)
        
        assert msg.timestamp == ts


class TestConnection:
    """連接測試"""
    
    def test_connection_creation(self):
        """測試連接創建"""
        now = datetime.now().isoformat()
        conn = Connection(
            id="conn-123",
            created_at=now,
            last_heartbeat=now,
            subscriptions={}
        )
        
        assert conn.id == "conn-123"
        assert conn.created_at == now
        assert len(conn.subscriptions) == 0


class TestSubscription:
    """訂閱測試"""
    
    def test_subscription_creation(self):
        """測試訂閱創建"""
        sub = Subscription(
            id="sub-123",
            type=SubscriptionType.TASK_STATUS,
            filter={"task_id": "task-456"}
        )
        
        assert sub.id == "sub-123"
        assert sub.type == SubscriptionType.TASK_STATUS
        assert sub.filter["task_id"] == "task-456"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
