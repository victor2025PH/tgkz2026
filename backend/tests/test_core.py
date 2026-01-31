"""
TG-Matrix Core Module Tests
核心模塊測試

測試:
- 事件總線
- 日誌脫敏
- 命令路由器
"""

import pytest
import asyncio
from datetime import datetime


class TestEventBus:
    """事件總線測試"""
    
    @pytest.fixture
    def event_bus(self):
        from core.event_bus import EventBus
        return EventBus()
    
    @pytest.mark.asyncio
    async def test_subscribe_and_publish(self, event_bus):
        """測試訂閱和發布"""
        received_events = []
        
        async def handler(event):
            received_events.append(event)
        
        await event_bus.subscribe('test.event', handler)
        await event_bus.publish('test.event', {'data': 'test'})
        
        assert len(received_events) == 1
        assert received_events[0].name == 'test.event'
        assert received_events[0].payload['data'] == 'test'
    
    @pytest.mark.asyncio
    async def test_wildcard_subscription(self, event_bus):
        """測試通配符訂閱"""
        received_events = []
        
        async def handler(event):
            received_events.append(event)
        
        await event_bus.subscribe('account.*', handler)
        await event_bus.publish('account.login', {'phone': '+123'})
        await event_bus.publish('account.logout', {'phone': '+123'})
        await event_bus.publish('message.sent', {'content': 'hello'})
        
        # 只應該接收 account.* 事件
        assert len(received_events) == 2
    
    @pytest.mark.asyncio
    async def test_once_subscription(self, event_bus):
        """測試一次性訂閱"""
        received_events = []
        
        async def handler(event):
            received_events.append(event)
        
        await event_bus.subscribe('once.event', handler, once=True)
        await event_bus.publish('once.event', {})
        await event_bus.publish('once.event', {})
        
        # 應該只接收一次
        assert len(received_events) == 1
    
    @pytest.mark.asyncio
    async def test_unsubscribe(self, event_bus):
        """測試取消訂閱"""
        received_events = []
        
        async def handler(event):
            received_events.append(event)
        
        unsubscribe = await event_bus.subscribe('unsub.event', handler)
        await event_bus.publish('unsub.event', {})
        
        unsubscribe()  # 取消訂閱
        await event_bus.publish('unsub.event', {})
        
        # 取消後不應該接收
        assert len(received_events) == 1
    
    def test_get_history(self, event_bus):
        """測試事件歷史"""
        asyncio.run(event_bus.publish('history.event1', {}))
        asyncio.run(event_bus.publish('history.event2', {}))
        
        history = event_bus.get_history()
        assert len(history) >= 2


class TestSecureLogging:
    """日誌脫敏測試"""
    
    def test_mask_phone(self):
        """測試電話號碼脫敏"""
        from core.logging import mask_phone
        
        assert mask_phone('+8613812345678') == '+8613****678'
        assert mask_phone('13812345678') == '1381****678'
        assert mask_phone('123') == '123'  # 太短不脫敏
        assert mask_phone('') == ''
        assert mask_phone(None) == ''
    
    def test_mask_sensitive(self):
        """測試通用敏感信息脫敏"""
        from core.logging import mask_sensitive
        
        # 電話號碼
        assert '****' in mask_sensitive('Phone: +8613812345678')
        
        # API Key
        assert '****' in mask_sensitive('API Key: sk-1234567890abcdef1234567890')
        
        # 郵箱
        result = mask_sensitive('Email: user@example.com')
        assert 'user@example.com' not in result
    
    def test_secure_logger(self):
        """測試安全日誌器"""
        from core.logging import SecureLogger
        
        logger = SecureLogger('Test')
        
        # 應該不會拋出異常
        logger.info('Test message', phone='+8613812345678')
        logger.error('Error message', api_key='sk-secret-key')
        logger.warning('Warning', data={'key': 'value'})


class TestCommandRouter:
    """命令路由器測試"""
    
    @pytest.fixture
    def router(self):
        from api.command_router import CommandRouter, CommandCategory
        router = CommandRouter()
        
        # 註冊測試命令
        @router.register('test-command', category=CommandCategory.SYSTEM)
        async def handle_test(payload, context):
            return {'success': True, 'data': payload}
        
        @router.register('test-error', category=CommandCategory.SYSTEM)
        async def handle_error(payload, context):
            raise ValueError('Test error')
        
        return router
    
    @pytest.mark.asyncio
    async def test_handle_registered_command(self, router):
        """測試處理已註冊的命令"""
        result = await router.handle('test-command', {'key': 'value'})
        
        assert result['success'] == True
        assert result['data']['key'] == 'value'
    
    @pytest.mark.asyncio
    async def test_handle_unknown_command(self, router):
        """測試處理未知命令"""
        from api.command_router import CommandNotFoundError
        
        with pytest.raises(CommandNotFoundError):
            await router.handle('unknown-command', {})
    
    @pytest.mark.asyncio
    async def test_handle_command_error(self, router):
        """測試命令錯誤處理"""
        with pytest.raises(ValueError):
            await router.handle('test-error', {})
    
    def test_has_command(self, router):
        """測試命令存在檢查"""
        assert router.has_command('test-command') == True
        assert router.has_command('unknown') == False
    
    def test_get_commands(self, router):
        """測試獲取命令列表"""
        commands = router.get_commands()
        assert 'test-command' in commands
        assert 'test-error' in commands
    
    def test_get_command_info(self, router):
        """測試獲取命令信息"""
        info = router.get_command_info('test-command')
        assert info is not None
        assert info['name'] == 'test-command'


class TestUnifiedContactModel:
    """統一聯繫人模型測試"""
    
    def test_create_contact(self):
        """測試創建聯繫人"""
        from domain.contacts.models import (
            UnifiedContact, 
            ContactStatus, 
            FunnelStage, 
            ValueLevel
        )
        
        contact = UnifiedContact(
            id=1,
            telegram_id='123456789',
            username='testuser',
            first_name='Test',
            last_name='User',
            status=ContactStatus.NEW,
            funnel_stage=FunnelStage.AWARENESS,
            value_level=ValueLevel.LOW
        )
        
        assert contact.id == 1
        assert contact.telegram_id == '123456789'
        assert contact.display_name == 'Test User'
        assert contact.status == ContactStatus.NEW
    
    def test_contact_to_dict(self):
        """測試聯繫人轉換為字典"""
        from domain.contacts.models import UnifiedContact, ContactStatus
        
        contact = UnifiedContact(
            id=1,
            telegram_id='123456789',
            username='testuser',
            status=ContactStatus.CONTACTED
        )
        
        data = contact.to_dict()
        
        assert data['id'] == 1
        assert data['telegramId'] == '123456789'
        assert data['status'] == 'contacted'
    
    def test_contact_from_dict(self):
        """測試從字典創建聯繫人"""
        from domain.contacts.models import UnifiedContact, ContactStatus
        
        data = {
            'id': 1,
            'telegramId': '123456789',
            'username': 'testuser',
            'status': 'interested',
            'tags': ['tag1', 'tag2']
        }
        
        contact = UnifiedContact.from_dict(data)
        
        assert contact.id == 1
        assert contact.telegram_id == '123456789'
        assert contact.status == ContactStatus.INTERESTED
        assert len(contact.tags) == 2
    
    def test_contact_properties(self):
        """測試聯繫人計算屬性"""
        from domain.contacts.models import UnifiedContact, ValueLevel
        from datetime import datetime, timedelta
        
        contact = UnifiedContact(
            id=1,
            telegram_id='123456789',
            value_level=ValueLevel.VIP,
            ad_risk_score=80,
            last_interaction_at=datetime.now() - timedelta(days=3)
        )
        
        assert contact.is_high_value == True
        assert contact.is_risky == True
        assert contact.is_active == True
        
        # 測試不活躍
        contact.last_interaction_at = datetime.now() - timedelta(days=10)
        assert contact.is_active == False


class TestContactFilter:
    """聯繫人過濾器測試"""
    
    def test_create_filter(self):
        """測試創建過濾器"""
        from domain.contacts.models import (
            ContactFilter, 
            ContactStatus, 
            FunnelStage
        )
        
        filter = ContactFilter(
            status=[ContactStatus.NEW, ContactStatus.CONTACTED],
            funnel_stages=[FunnelStage.AWARENESS],
            min_lead_score=50,
            search_query='test',
            limit=20
        )
        
        assert len(filter.status) == 2
        assert filter.min_lead_score == 50
        assert filter.limit == 20


# 運行測試
if __name__ == '__main__':
    pytest.main([__file__, '-v'])
