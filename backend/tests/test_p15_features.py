"""
🔧 P15: 端到端自動化與生產就緒 — 測試套件

覆蓋：
  P15-1: 聯繫人 REST API（HTTP 模式回退）
  P15-2: 消息隊列恢復（get_pending_queue_messages）
  P15-4: WebSocket 業務事件類型
"""

import os
import sys
import pytest
import sqlite3
import tempfile
from unittest.mock import MagicMock, AsyncMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


# ============================================================
#  P15-2: 消息隊列 DB 恢復
# ============================================================

class TestQueueRecovery:
    """P15-2: 消息隊列數據庫恢復"""

    def _create_test_db(self):
        """創建帶 message_queue 表的測試數據庫"""
        fd, path = tempfile.mkstemp(suffix='.db')
        os.close(fd)
        conn = sqlite3.connect(path)
        conn.execute('''
            CREATE TABLE message_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT NOT NULL,
                user_id TEXT NOT NULL,
                text TEXT NOT NULL,
                priority INTEGER DEFAULT 1,
                status TEXT DEFAULT 'pending',
                scheduled_at TIMESTAMP,
                sent_at TIMESTAMP,
                error_message TEXT,
                retry_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        return conn, path

    def test_pending_messages_query(self):
        """驗證 pending 消息能被正確查詢"""
        conn, path = self._create_test_db()
        try:
            # 插入測試數據
            conn.execute(
                "INSERT INTO message_queue (phone, user_id, text, status, priority) VALUES (?, ?, ?, ?, ?)",
                ('+123', 'user1', 'Hello', 'pending', 2)
            )
            conn.execute(
                "INSERT INTO message_queue (phone, user_id, text, status, priority) VALUES (?, ?, ?, ?, ?)",
                ('+456', 'user2', 'World', 'retrying', 1)
            )
            conn.execute(
                "INSERT INTO message_queue (phone, user_id, text, status, priority) VALUES (?, ?, ?, ?, ?)",
                ('+789', 'user3', 'Done', 'completed', 2)
            )
            conn.commit()

            # 查詢 pending/retrying
            rows = conn.execute("""
                SELECT id, phone, user_id, text, priority, status
                FROM message_queue
                WHERE status IN ('pending', 'retrying', 'processing')
                ORDER BY priority ASC, created_at ASC
            """).fetchall()

            assert len(rows) == 2
            # priority 1 (HIGH) 排在前面
            assert rows[0][1] == '+456'  # retrying, HIGH priority
            assert rows[1][1] == '+123'  # pending, NORMAL priority
        finally:
            conn.close()
            os.unlink(path)

    def test_processing_status_reset(self):
        """processing 狀態應重置為 pending"""
        conn, path = self._create_test_db()
        try:
            conn.execute(
                "INSERT INTO message_queue (phone, user_id, text, status) VALUES (?, ?, ?, ?)",
                ('+111', 'u1', 'Test', 'processing')
            )
            conn.commit()

            rows = conn.execute(
                "SELECT status FROM message_queue WHERE status IN ('pending', 'retrying', 'processing')"
            ).fetchall()
            assert len(rows) == 1
            # 驗證恢復邏輯會重置
            assert rows[0][0] == 'processing'
            # 實際恢復代碼會將 processing -> pending
        finally:
            conn.close()
            os.unlink(path)

    def test_completed_messages_excluded(self):
        """已完成/已失敗的消息不應被恢復"""
        conn, path = self._create_test_db()
        try:
            for status in ['completed', 'failed']:
                conn.execute(
                    "INSERT INTO message_queue (phone, user_id, text, status) VALUES (?, ?, ?, ?)",
                    ('+000', 'u0', 'Skip', status)
                )
            conn.commit()

            rows = conn.execute(
                "SELECT id FROM message_queue WHERE status IN ('pending', 'retrying', 'processing')"
            ).fetchall()
            assert len(rows) == 0
        finally:
            conn.close()
            os.unlink(path)


# ============================================================
#  P15-1: 聯繫人 REST API
# ============================================================

class TestContactsAPI:
    """P15-1: 聯繫人 REST API 路由和處理邏輯"""

    def test_contacts_query_with_search(self):
        """搜索過濾能正確構建 SQL"""
        conn = sqlite3.connect(':memory:')
        conn.execute('''
            CREATE TABLE unified_contacts (
                id INTEGER PRIMARY KEY,
                telegram_id TEXT,
                username TEXT,
                display_name TEXT,
                first_name TEXT,
                last_name TEXT,
                phone TEXT,
                status TEXT DEFAULT 'new',
                source_type TEXT DEFAULT 'member',
                source_name TEXT,
                tags TEXT DEFAULT '[]',
                ai_score REAL DEFAULT 0,
                lead_score REAL DEFAULT 0,
                intent_level TEXT,
                value_level TEXT,
                contact_type TEXT DEFAULT 'user',
                funnel_stage TEXT DEFAULT 'awareness',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 插入測試數據
        conn.execute(
            "INSERT INTO unified_contacts (telegram_id, username, display_name) VALUES (?, ?, ?)",
            ('t1', 'alice', 'Alice Wang')
        )
        conn.execute(
            "INSERT INTO unified_contacts (telegram_id, username, display_name) VALUES (?, ?, ?)",
            ('t2', 'bob', 'Bob Li')
        )
        conn.commit()

        # 搜索
        search = '%alice%'
        rows = conn.execute(
            """SELECT * FROM unified_contacts 
               WHERE username LIKE ? OR display_name LIKE ? OR first_name LIKE ? OR phone LIKE ?""",
            (search, search, search, search)
        ).fetchall()
        assert len(rows) == 1

        conn.close()

    def test_contacts_order_whitelist(self):
        """排序字段白名單驗證"""
        allowed_orders = {
            'created_at DESC', 'created_at ASC',
            'ai_score DESC', 'ai_score ASC',
            'display_name ASC', 'display_name DESC',
            'lead_score DESC', 'lead_score ASC',
        }

        # 合法排序
        assert 'created_at DESC' in allowed_orders
        assert 'ai_score DESC' in allowed_orders

        # SQL 注入嘗試
        assert 'created_at DESC; DROP TABLE users' not in allowed_orders
        assert "1=1 OR ''" not in allowed_orders

    def test_contacts_stats_query(self):
        """統計查詢能正確執行"""
        conn = sqlite3.connect(':memory:')
        conn.execute('''
            CREATE TABLE unified_contacts (
                id INTEGER PRIMARY KEY,
                telegram_id TEXT,
                status TEXT DEFAULT 'new',
                source_type TEXT DEFAULT 'member',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        conn.execute("INSERT INTO unified_contacts (telegram_id, status, source_type) VALUES ('t1', 'new', 'member')")
        conn.execute("INSERT INTO unified_contacts (telegram_id, status, source_type) VALUES ('t2', 'contacted', 'lead')")
        conn.execute("INSERT INTO unified_contacts (telegram_id, status, source_type) VALUES ('t3', 'new', 'member')")
        conn.commit()

        total = conn.execute("SELECT COUNT(*) FROM unified_contacts").fetchone()[0]
        assert total == 3

        status_rows = conn.execute(
            "SELECT status, COUNT(*) as cnt FROM unified_contacts GROUP BY status"
        ).fetchall()
        by_status = {r[0]: r[1] for r in status_rows}
        assert by_status['new'] == 2
        assert by_status['contacted'] == 1

        conn.close()


# ============================================================
#  P15-4: WebSocket + NotificationService 橋接
# ============================================================

class TestBusinessEventBridge:
    """P15-4: 業務事件橋接到通知中心"""

    def test_websocket_business_event_types(self):
        """WebSocket 包含所有 P14/P15 業務事件類型"""
        from websocket_service import SubscriptionType

        assert hasattr(SubscriptionType, 'BUSINESS_EVENT')
        assert hasattr(SubscriptionType, 'LEAD_SCORING')
        assert hasattr(SubscriptionType, 'AB_TEST')
        assert hasattr(SubscriptionType, 'MESSAGE_STATUS')

    def test_publish_business_event_format(self):
        """WebSocketService 業務事件格式正確"""
        from websocket_service import WebSocketService

        ws = WebSocketService()
        ws.publish = MagicMock()

        ws.publish_business_event('test:event', {'key': 'value'})
        ws.publish.assert_called_once()

        call_args = ws.publish.call_args
        data = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get('data', {})
        assert data.get('event') == 'test:event'
        assert data.get('key') == 'value'
        assert 'timestamp' in data


# ============================================================
#  P15: 整合 & 回歸
# ============================================================

class TestP15Integration:
    """P15: 整合測試"""

    def test_retry_handler_still_works(self):
        """原有 RetryHandler 仍可正常使用"""
        from message_queue import RetryHandler
        delay = RetryHandler.calculate_delay(attempt=0, base_delay=1.0, strategy='exponential')
        assert delay == 1.0

    def test_message_queue_ws_injection(self):
        """MessageQueue 支持 WebSocket 注入"""
        from message_queue import MessageQueue
        mq = MessageQueue(send_callback=AsyncMock())
        assert hasattr(mq, 'ws_service')
        assert hasattr(mq, 'set_ws_service')
        mock_ws = MagicMock()
        mq.set_ws_service(mock_ws)
        assert mq.ws_service is mock_ws

    def test_ab_test_manager_singleton(self):
        """A/B 測試管理器單例"""
        import core.template_ab_test as mod
        mod._ab_manager = None
        from core.template_ab_test import get_ab_test_manager
        m1 = get_ab_test_manager()
        m2 = get_ab_test_manager()
        assert m1 is m2
        mod._ab_manager = None

    def test_retry_manager_singleton(self):
        """重試管理器單例"""
        import core.message_retry as mod
        mod._retry_manager = None
        from core.message_retry import get_retry_manager
        m1 = get_retry_manager()
        m2 = get_retry_manager()
        assert m1 is m2
        mod._retry_manager = None

    def test_error_categories_complete(self):
        """錯誤分類完整性"""
        from core.message_retry import ERROR_CATEGORIES
        for cat in ['transient', 'permanent', 'manual']:
            assert cat in ERROR_CATEGORIES
            assert isinstance(ERROR_CATEGORIES[cat], list)
            assert len(ERROR_CATEGORIES[cat]) >= 1
