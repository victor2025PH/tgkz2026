"""
Integration tests for command handling
"""
import pytest
import json
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

# Skip integration tests if telegram_client import fails
try:
    from main import BackendService
    INTEGRATION_TESTS_AVAILABLE = True
except ImportError as e:
    INTEGRATION_TESTS_AVAILABLE = False
    INTEGRATION_IMPORT_ERROR = str(e)


@pytest.mark.skipif(not INTEGRATION_TESTS_AVAILABLE, reason=f"Integration tests unavailable: {INTEGRATION_IMPORT_ERROR if not INTEGRATION_TESTS_AVAILABLE else ''}")
class TestCommandHandling:
    """Tests for command handling integration"""
    
    @pytest.mark.asyncio
    async def test_add_account_command(self, temp_db):
        """Test add-account command"""
        service = BackendService()
        
        # Mock send_event and send_log
        service.send_event = MagicMock()
        service.send_log = MagicMock()
        
        # Replace the global db instance for testing
        from database import db
        original_db = db
        # Use temp_db for this test
        import database
        database.db = temp_db
        
        try:
            payload = {
                'phone': '+1234567890',
                'apiId': '12345',
                'apiHash': 'abcdef1234567890',
                'role': 'LEAD_CAPTURE',
                'group': 'Test Group'
            }
            
            await service.handle_add_account(payload)
            
            # Verify account was added
            accounts = await temp_db.get_all_accounts()
            assert any(acc['phone'] == payload['phone'] for acc in accounts)
            
            # Verify event was sent
            service.send_event.assert_called()
            service.send_log.assert_called()
        finally:
            # Restore original db
            database.db = original_db
    
    @pytest.mark.asyncio
    async def test_add_keyword_set_command(self, temp_db):
        """Test add-keyword-set command"""
        service = BackendService()
        
        service.send_event = MagicMock()
        service.send_log = MagicMock()
        
        # Replace the global db instance for testing
        from database import db
        original_db = db
        import database
        database.db = temp_db
        
        try:
            payload = {'name': 'Test Keyword Set'}
            
            await service.handle_add_keyword_set(payload)
            
            # Verify keyword set was added
            keyword_sets = await temp_db.get_all_keyword_sets()
            assert any(ks['name'] == payload['name'] for ks in keyword_sets)
        finally:
            database.db = original_db
    
    @pytest.mark.asyncio
    async def test_add_template_command(self, temp_db):
        """Test add-template command"""
        service = BackendService()
        
        service.send_event = MagicMock()
        service.send_log = MagicMock()
        
        # Replace the global db instance for testing
        from database import db
        original_db = db
        import database
        database.db = temp_db
        
        try:
            payload = {
                'name': 'Test Template',
                'content': 'Hello {{name}}',
                'enabled': True
            }
            
            await service.handle_add_template(payload)
            
            # Verify template was added
            templates = await temp_db.get_all_templates()
            assert any(t['name'] == payload['name'] for t in templates)
        finally:
            database.db = original_db
    
    @pytest.mark.asyncio
    async def test_bulk_operations(self, temp_db):
        """Test bulk operations"""
        service = BackendService()
        
        service.send_event = MagicMock()
        service.send_log = MagicMock()
        
        # Replace the global db instance for testing
        from database import db
        original_db = db
        import database
        database.db = temp_db
        
        try:
            # Add multiple accounts
            account_ids = []
            for i in range(3):
                payload = {
                    'phone': f'+123456789{i}',
                    'apiId': '12345',
                    'apiHash': 'abcdef1234567890',
                    'role': 'LEAD_CAPTURE',
                    'group': 'Test Group'
                }
                await service.handle_add_account(payload)
                accounts = await temp_db.get_all_accounts()
                account = next(acc for acc in accounts if acc['phone'] == payload['phone'])
                account_ids.append(account['id'])
            
            # Test bulk assign role
            payload = {
                'accountIds': account_ids,
                'role': 'ADMIN'
            }
            
            await service.handle_bulk_assign_role(payload)
            
            # Verify roles were updated
            accounts = await temp_db.get_all_accounts()
            for account_id in account_ids:
                account = next(acc for acc in accounts if acc['id'] == account_id)
                assert account['role'] == 'ADMIN'
        finally:
            database.db = original_db

