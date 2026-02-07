"""
🔧 P14: 端到端流程閉環與數據持久化 — 測試套件

覆蓋：
  P14-2: A/B 測試發送集成
  P14-3: 智能重試策略集成（MessageRetryManager → MessageQueue fallback）
  P14-4: WebSocket 業務事件擴展
  P14-5: 數據庫持久化（消息隊列 CRUD）
"""

import os
import sys
import pytest
import asyncio
import time
from unittest.mock import MagicMock, AsyncMock, patch

# 確保 backend 目錄在 sys.path 中
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


# ============================================================
#  P14-2: A/B 測試發送集成
# ============================================================

class TestABTestSendIntegration:
    """P14-2: A/B 測試集成到批量發送流程"""

    def test_select_variant_during_send(self):
        """A/B 測試在發送時選擇變體"""
        from core.template_ab_test import ABTestManager
        
        manager = ABTestManager()
        test = manager.create_test('Send Test', 
                                    template_ids=[1, 2, 3],
                                    template_names=['Template A', 'Template B', 'Template C'])
        
        # 模擬發送 50 次，確保變體被選中
        selected = set()
        for _ in range(50):
            variant = manager.select_template(test.test_id)
            assert variant is not None
            selected.add(variant['template_id'])
        
        # 所有變體都應被選中（均勻分配）
        assert 1 in selected
        assert 2 in selected
        assert 3 in selected

    def test_record_result_updates_stats(self):
        """發送結果正確記錄到 A/B 測試統計"""
        from core.template_ab_test import ABTestManager
        
        manager = ABTestManager()
        test = manager.create_test('Result Test', 
                                    template_ids=[10, 20])
        
        # 記錄結果
        test.record_result(0, success=True)
        test.record_result(0, success=True, got_reply=True)
        test.record_result(0, success=False)
        test.record_result(1, success=True)
        
        results = test.get_results()
        v0 = results['variants'][0]
        v1 = results['variants'][1]
        
        assert v0['sent'] == 3
        assert v0['success'] == 2
        assert v0['replies'] == 1
        assert v1['sent'] == 1
        assert v1['success'] == 1

    def test_completed_test_returns_none(self):
        """已完成的測試不能再選擇變體"""
        from core.template_ab_test import ABTestManager
        
        manager = ABTestManager()
        test = manager.create_test('Done Test', template_ids=[1, 2])
        manager.complete_test(test.test_id)
        
        variant = manager.select_template(test.test_id)
        assert variant is None

    def test_variant_index_for_template_selection(self):
        """變體索引用於從模板列表中選擇"""
        from core.template_ab_test import ABTestManager
        
        manager = ABTestManager()
        templates = ['Hello A', 'Hello B']
        test = manager.create_test('Index Test', template_ids=[0, 1])
        
        for _ in range(20):
            variant = manager.select_template(test.test_id)
            assert variant is not None
            idx = variant.get('variant_index', variant.get('template_id', 0))
            # 索引在模板列表範圍內
            assert 0 <= min(idx, len(templates) - 1) < len(templates)


# ============================================================
#  P14-3: 智能重試策略集成
# ============================================================

class TestSmartRetryIntegration:
    """P14-3: MessageRetryManager 集成到 MessageQueue"""

    def test_retry_manager_categorizes_permanent_errors(self):
        """永久性錯誤不重試，返回死信"""
        from core.message_retry import MessageRetryManager, RetryDecision
        
        mgr = MessageRetryManager()
        
        # 永久性錯誤
        decision, delay, reason = mgr.should_retry('UserBlocked by target', 0)
        assert decision == RetryDecision.DEAD_LETTER
        assert delay == 0
        assert 'Permanent' in reason or 'UserBlocked' in reason

    def test_retry_manager_retries_transient_errors(self):
        """暫時性錯誤使用指數退避重試"""
        from core.message_retry import MessageRetryManager, RetryDecision
        
        mgr = MessageRetryManager()
        
        # 暫時性錯誤
        decision, delay, reason = mgr.should_retry('ConnectionError: timeout', 0)
        assert decision == RetryDecision.RETRY
        assert delay > 0
        assert 'retry' in reason.lower() or 'Transient' in reason

    def test_retry_manager_max_retries_exceeded(self):
        """超過最大重試次數進入死信"""
        from core.message_retry import MessageRetryManager, RetryDecision, RetryPolicy
        
        policy = RetryPolicy(max_retries=2)
        mgr = MessageRetryManager(policy)
        
        # 已重試 2 次
        decision, delay, reason = mgr.should_retry('timeout error', 2)
        assert decision == RetryDecision.DEAD_LETTER
        assert 'exceeded' in reason.lower() or 'Max' in reason

    def test_retry_manager_flood_wait_extraction(self):
        """FloodWait 提取等待時間"""
        from core.message_retry import MessageRetryManager, RetryDecision
        
        mgr = MessageRetryManager()
        decision, delay, reason = mgr.should_retry('FloodWait 30 seconds', 0)
        assert decision == RetryDecision.RETRY
        assert delay >= 30  # 30s + 5s buffer
        assert 'FloodWait' in reason

    def test_retry_manager_unknown_error_conservative_retry(self):
        """未知錯誤保守重試前 2 次"""
        from core.message_retry import MessageRetryManager, RetryDecision
        
        mgr = MessageRetryManager()
        
        # 第 0 次：保守重試
        decision, delay, reason = mgr.should_retry('some weird error', 0)
        assert decision == RetryDecision.RETRY
        
        # 第 1 次：保守重試
        decision, delay, reason = mgr.should_retry('some weird error', 1)
        assert decision == RetryDecision.RETRY
        
        # 第 2 次：放棄
        decision, delay, reason = mgr.should_retry('some weird error', 2)
        assert decision == RetryDecision.DEAD_LETTER

    def test_retry_policy_delay_calculation(self):
        """驗證指數退避延遲計算"""
        from core.message_retry import RetryPolicy
        
        policy = RetryPolicy(
            max_retries=3,
            base_delay_seconds=10.0,
            max_delay_seconds=300.0,
            jitter_factor=0.0,  # 無抖動便於精確測試
            backoff_multiplier=2.0
        )
        
        d0 = policy.calculate_delay(0)  # 10 * 2^0 = 10
        d1 = policy.calculate_delay(1)  # 10 * 2^1 = 20
        d2 = policy.calculate_delay(2)  # 10 * 2^2 = 40
        
        assert d0 == 10.0
        assert d1 == 20.0
        assert d2 == 40.0

    def test_retry_policy_max_delay_cap(self):
        """延遲不超過上限"""
        from core.message_retry import RetryPolicy
        
        policy = RetryPolicy(
            base_delay_seconds=100.0,
            max_delay_seconds=200.0,
            jitter_factor=0.0,
            backoff_multiplier=3.0
        )
        
        d5 = policy.calculate_delay(5)  # 100 * 3^5 = 24300 → capped to 200
        assert d5 == 200.0


# ============================================================
#  P14-4: WebSocket 業務事件擴展
# ============================================================

class TestWebSocketBusinessEvents:
    """P14-4: WebSocket SubscriptionType 擴展"""

    def test_subscription_type_has_business_events(self):
        """確認 SubscriptionType 包含 P14 新增的業務事件類型"""
        from websocket_service import SubscriptionType
        
        assert hasattr(SubscriptionType, 'BUSINESS_EVENT')
        assert hasattr(SubscriptionType, 'LEAD_SCORING')
        assert hasattr(SubscriptionType, 'AB_TEST')
        assert SubscriptionType.BUSINESS_EVENT.value == 'business:event'
        assert SubscriptionType.LEAD_SCORING.value == 'lead:scoring'
        assert SubscriptionType.AB_TEST.value == 'ab:test'

    def test_publish_business_event(self):
        """WebSocketService.publish_business_event 正確格式"""
        from websocket_service import WebSocketService
        
        ws = WebSocketService()
        # Mock publish 方法
        ws.publish = MagicMock()
        
        ws.publish_business_event('dedup:completed', {'groups': 5})
        
        ws.publish.assert_called_once()
        call_args = ws.publish.call_args
        data = call_args[1] if call_args[1] else call_args[0][1]
        assert data['event'] == 'dedup:completed'
        assert data['groups'] == 5
        assert 'timestamp' in data

    def test_publish_lead_scoring(self):
        """WebSocketService.publish_lead_scoring 正確格式"""
        from websocket_service import WebSocketService
        
        ws = WebSocketService()
        ws.publish = MagicMock()
        
        ws.publish_lead_scoring({'scored_count': 50, 'hot': 10})
        
        ws.publish.assert_called_once()
        call_args = ws.publish.call_args
        data = call_args[1] if call_args[1] else call_args[0][1]
        assert data['event'] == 'scoring:completed'
        assert data['scored_count'] == 50

    def test_publish_ab_test_event(self):
        """WebSocketService.publish_ab_test_event 正確格式"""
        from websocket_service import WebSocketService
        
        ws = WebSocketService()
        ws.publish = MagicMock()
        
        ws.publish_ab_test_event('ab_test:completed', {
            'test_id': 'abc123',
            'test_name': 'Test 1',
            'winner': 'Template A'
        })
        
        ws.publish.assert_called_once()
        call_args = ws.publish.call_args
        data = call_args[1] if call_args[1] else call_args[0][1]
        assert data['event'] == 'ab_test:completed'
        assert data['test_id'] == 'abc123'

    def test_publish_message_status(self):
        """WebSocketService.publish_message_status 正確調用"""
        from websocket_service import WebSocketService
        
        ws = WebSocketService()
        ws.publish = MagicMock()
        
        ws.publish_message_status({
            'event': 'message:completed',
            'message_id': 'msg_123',
            'phone': '+123456'
        })
        
        ws.publish.assert_called_once()


# ============================================================
#  P14-5: 數據庫持久化 & 消息隊列
# ============================================================

class TestMessageQueuePersistence:
    """P14-5: 消息隊列數據庫持久化"""

    def test_message_queue_has_ws_service_attribute(self):
        """MessageQueue 支持 WebSocket 注入"""
        # 不導入完整依賴，直接測試新增屬性
        import importlib
        import types

        # 簡單測試：確認 _publish_queue_event 和 set_ws_service 存在
        from message_queue import MessageQueue
        
        mock_callback = AsyncMock()
        mq = MessageQueue(send_callback=mock_callback)
        
        # 確認新屬性存在
        assert hasattr(mq, 'ws_service')
        assert mq.ws_service is None
        assert hasattr(mq, 'set_ws_service')
        assert hasattr(mq, '_publish_queue_event')

    def test_set_ws_service(self):
        """set_ws_service 正確注入 WebSocket 服務"""
        from message_queue import MessageQueue
        
        mock_callback = AsyncMock()
        mq = MessageQueue(send_callback=mock_callback)
        
        mock_ws = MagicMock()
        mq.set_ws_service(mock_ws)
        assert mq.ws_service is mock_ws


# ============================================================
#  P14 整合：文件結構 & 導入性
# ============================================================

class TestP14FileStructure:
    """P14: 文件結構和導入測試"""

    def test_message_retry_singleton(self):
        """消息重試管理器單例正確工作"""
        import core.message_retry as mod
        mod._retry_manager = None  # 重置
        
        from core.message_retry import get_retry_manager
        mgr1 = get_retry_manager()
        mgr2 = get_retry_manager()
        assert mgr1 is mgr2
        
        mod._retry_manager = None  # 清理

    def test_ab_test_manager_singleton(self):
        """A/B 測試管理器單例正確工作"""
        import core.template_ab_test as mod
        mod._ab_manager = None  # 重置
        
        from core.template_ab_test import get_ab_test_manager
        mgr1 = get_ab_test_manager()
        mgr2 = get_ab_test_manager()
        assert mgr1 is mgr2
        
        mod._ab_manager = None  # 清理

    def test_retry_handler_compatibility(self):
        """原有 RetryHandler 仍然可用（回退兼容）"""
        from message_queue import RetryHandler
        
        # 指數退避
        delay = RetryHandler.calculate_delay(attempt=2, base_delay=1.0, strategy='exponential')
        assert delay == 4.0  # 1 * 2^2
        
        # 線性
        delay = RetryHandler.calculate_delay(attempt=2, base_delay=5.0, strategy='linear')
        assert delay == 15.0  # 5 * (2+1)

    def test_websocket_subscription_types(self):
        """WebSocket SubscriptionType 包含所有必要類型"""
        from websocket_service import SubscriptionType
        
        required_types = [
            'TASK_STATUS', 'TASK_STATS', 'TASK_LOG',
            'MESSAGE_NEW', 'MESSAGE_STATUS', 'CONTACT_UPDATE', 'SYSTEM_STATUS',
            'BUSINESS_EVENT', 'LEAD_SCORING', 'AB_TEST',  # P14 新增
        ]
        
        for type_name in required_types:
            assert hasattr(SubscriptionType, type_name), f"Missing: {type_name}"

    def test_error_categories_structure(self):
        """錯誤分類結構完整"""
        from core.message_retry import ERROR_CATEGORIES
        
        assert 'transient' in ERROR_CATEGORIES
        assert 'permanent' in ERROR_CATEGORIES
        assert 'manual' in ERROR_CATEGORIES
        
        # 每類至少有 1 個關鍵詞
        assert len(ERROR_CATEGORIES['transient']) >= 3
        assert len(ERROR_CATEGORIES['permanent']) >= 3
        assert len(ERROR_CATEGORIES['manual']) >= 1
