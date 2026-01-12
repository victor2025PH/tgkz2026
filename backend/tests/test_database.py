"""
Unit tests for database operations
"""
import pytest
from datetime import datetime, timedelta


class TestAccountOperations:
    """Tests for account-related database operations"""
    
    @pytest.mark.asyncio
    async def test_add_account(self, temp_db, sample_account):
        """Test adding an account"""
        account_id = await temp_db.add_account(sample_account)
        assert account_id is not None
        assert isinstance(account_id, int)
        
        # Verify account was added
        account = await temp_db.get_account(account_id)
        assert account is not None
        assert account['phone'] == sample_account['phone']
        assert account['apiId'] == sample_account['apiId']
    
    @pytest.mark.asyncio
    async def test_get_account(self, temp_db, sample_account):
        """Test getting an account"""
        account_id = await temp_db.add_account(sample_account)
        account = await temp_db.get_account(account_id)
        
        assert account is not None
        assert account['id'] == account_id
        assert account['phone'] == sample_account['phone']
    
    @pytest.mark.asyncio
    async def test_get_all_accounts(self, temp_db, sample_account):
        """Test getting all accounts"""
        # Add multiple accounts
        account_ids = []
        for i in range(3):
            account = dict(sample_account)  # Create a copy
            account['phone'] = f'+123456789{i}'
            account_id = await temp_db.add_account(account)
            account_ids.append(account_id)
        
        accounts = await temp_db.get_all_accounts()
        assert len(accounts) >= 3
        
        # Verify all added accounts are present
        added_phones = {f'+123456789{i}' for i in range(3)}
        found_phones = {acc['phone'] for acc in accounts if acc['id'] in account_ids}
        assert added_phones == found_phones
    
    @pytest.mark.asyncio
    async def test_update_account(self, temp_db, sample_account):
        """Test updating an account"""
        account_id = await temp_db.add_account(sample_account)
        
        updates = {
            'role': 'ADMIN',
            'group': 'Updated Group'
        }
        await temp_db.update_account(account_id, updates)
        
        account = await temp_db.get_account(account_id)
        assert account['role'] == 'ADMIN'
        assert account['group'] == 'Updated Group'
    
    @pytest.mark.asyncio
    async def test_remove_account(self, temp_db, sample_account):
        """Test removing an account"""
        account_id = await temp_db.add_account(sample_account)
        
        await temp_db.remove_account(account_id)
        
        account = await temp_db.get_account(account_id)
        assert account is None


class TestKeywordSetOperations:
    """Tests for keyword set operations"""
    
    @pytest.mark.asyncio
    async def test_add_keyword_set(self, temp_db, sample_keyword_set):
        """Test adding a keyword set"""
        keyword_set_id = await temp_db.add_keyword_set(sample_keyword_set['name'])
        assert keyword_set_id is not None
        
        keyword_sets = await temp_db.get_all_keyword_sets()
        assert any(ks['id'] == keyword_set_id for ks in keyword_sets)
    
    @pytest.mark.asyncio
    async def test_remove_keyword_set(self, temp_db, sample_keyword_set):
        """Test removing a keyword set"""
        keyword_set_id = await temp_db.add_keyword_set(sample_keyword_set['name'])
        
        await temp_db.remove_keyword_set(keyword_set_id)
        
        keyword_sets = await temp_db.get_all_keyword_sets()
        assert not any(ks['id'] == keyword_set_id for ks in keyword_sets)


class TestKeywordOperations:
    """Tests for keyword operations"""
    
    @pytest.mark.asyncio
    async def test_add_keyword(self, temp_db, sample_keyword_set, sample_keyword):
        """Test adding a keyword"""
        keyword_set_id = await temp_db.add_keyword_set(sample_keyword_set['name'])
        sample_keyword['keywordSetId'] = keyword_set_id
        
        keyword_id = await temp_db.add_keyword(sample_keyword)
        assert keyword_id is not None
        
        keywords = await temp_db.get_keywords_by_set(keyword_set_id)
        assert any(k['id'] == keyword_id for k in keywords)
    
    @pytest.mark.asyncio
    async def test_remove_keyword(self, temp_db, sample_keyword_set, sample_keyword):
        """Test removing a keyword"""
        keyword_set_id = await temp_db.add_keyword_set(sample_keyword_set['name'])
        sample_keyword['keywordSetId'] = keyword_set_id
        keyword_id = await temp_db.add_keyword(sample_keyword)
        
        await temp_db.remove_keyword(keyword_id)
        
        keywords = await temp_db.get_keywords_by_set(keyword_set_id)
        assert not any(k['id'] == keyword_id for k in keywords)


class TestTemplateOperations:
    """Tests for template operations"""
    
    @pytest.mark.asyncio
    async def test_add_template(self, temp_db, sample_template):
        """Test adding a template"""
        template_id = await temp_db.add_template(sample_template)
        assert template_id is not None
        
        templates = await temp_db.get_all_templates()
        assert any(t['id'] == template_id for t in templates)
    
    @pytest.mark.asyncio
    async def test_toggle_template_status(self, temp_db, sample_template):
        """Test toggling template status"""
        template_id = await temp_db.add_template(sample_template)
        
        # Toggle to disabled
        await temp_db.toggle_template_status(template_id, False)
        template = await temp_db.get_template(template_id)
        assert template['enabled'] == 0
        
        # Toggle back to enabled
        await temp_db.toggle_template_status(template_id, True)
        template = await temp_db.get_template(template_id)
        assert template['enabled'] == 1


class TestCampaignOperations:
    """Tests for campaign operations"""
    
    @pytest.mark.asyncio
    async def test_add_campaign(self, temp_db, sample_template, sample_keyword_set, sample_campaign):
        """Test adding a campaign"""
        # Create dependencies
        template_id = await temp_db.add_template(sample_template)
        keyword_set_id = await temp_db.add_keyword_set(sample_keyword_set['name'])
        
        sample_campaign['templateId'] = template_id
        sample_campaign['triggerKeywordSetId'] = keyword_set_id
        
        campaign_id = await temp_db.add_campaign(sample_campaign)
        assert campaign_id is not None
        
        campaigns = await temp_db.get_all_campaigns()
        assert any(c['id'] == campaign_id for c in campaigns)
    
    @pytest.mark.asyncio
    async def test_toggle_campaign_status(self, temp_db, sample_template, sample_keyword_set, sample_campaign):
        """Test toggling campaign status"""
        template_id = await temp_db.add_template(sample_template)
        keyword_set_id = await temp_db.add_keyword_set(sample_keyword_set['name'])
        
        sample_campaign['templateId'] = template_id
        sample_campaign['triggerKeywordSetId'] = keyword_set_id
        campaign_id = await temp_db.add_campaign(sample_campaign)
        
        # Toggle to disabled
        await temp_db.toggle_campaign_status(campaign_id, False)
        campaign = await temp_db.get_campaign(campaign_id)
        assert campaign['enabled'] == 0


class TestGroupOperations:
    """Tests for group operations"""
    
    @pytest.mark.asyncio
    async def test_add_group(self, temp_db, sample_keyword_set, sample_group):
        """Test adding a group"""
        keyword_set_id = await temp_db.add_keyword_set(sample_keyword_set['name'])
        sample_group['keywordSetId'] = keyword_set_id
        
        group_id = await temp_db.add_group(sample_group)
        assert group_id is not None
        
        groups = await temp_db.get_all_groups()
        assert any(g['id'] == group_id for g in groups)
    
    @pytest.mark.asyncio
    async def test_remove_group(self, temp_db, sample_keyword_set, sample_group):
        """Test removing a group"""
        keyword_set_id = await temp_db.add_keyword_set(sample_keyword_set['name'])
        sample_group['keywordSetId'] = keyword_set_id
        group_id = await temp_db.add_group(sample_group)
        
        await temp_db.remove_group(group_id)
        
        groups = await temp_db.get_all_groups()
        assert not any(g['id'] == group_id for g in groups)


class TestLeadOperations:
    """Tests for lead operations"""
    
    @pytest.mark.asyncio
    async def test_add_lead(self, temp_db):
        """Test adding a lead"""
        lead_data = {
            'userId': '123456789',
            'username': 'testuser',
            'phone': '+1234567890',
            'sourceGroup': 'https://t.me/testgroup',
            'triggeredKeyword': 'test keyword',
            'status': 'NEW'
        }
        
        lead_id = await temp_db.add_lead(lead_data)
        assert lead_id is not None
        
        lead = await temp_db.get_lead(lead_id)
        assert lead is not None
        assert lead['userId'] == lead_data['userId']
    
    @pytest.mark.asyncio
    async def test_update_lead_status(self, temp_db):
        """Test updating lead status"""
        lead_data = {
            'userId': '123456789',
            'username': 'testuser',
            'phone': '+1234567890',
            'sourceGroup': 'https://t.me/testgroup',
            'triggeredKeyword': 'test keyword',
            'status': 'NEW'
        }
        
        lead_id = await temp_db.add_lead(lead_data)
        
        await temp_db.update_lead_status(lead_id, 'CONTACTED')
        
        lead = await temp_db.get_lead(lead_id)
        assert lead['status'] == 'CONTACTED'


class TestLogOperations:
    """Tests for log operations"""
    
    @pytest.mark.asyncio
    async def test_add_log(self, temp_db):
        """Test adding a log entry"""
        log_data = {
            'message': 'Test log message',
            'type': 'info',
            'timestamp': datetime.now()
        }
        
        log_id = await temp_db.add_log(log_data['message'], log_data['type'])
        assert log_id is not None
        
        logs = await temp_db.get_logs(limit=10)
        assert any(log['id'] == log_id for log in logs)
    
    @pytest.mark.asyncio
    async def test_clear_logs(self, temp_db):
        """Test clearing logs"""
        # Add some logs
        for i in range(5):
            await temp_db.add_log(f'Test log {i}', 'info')
        
        # Clear logs
        await temp_db.clear_logs()
        
        logs = await temp_db.get_logs(limit=10)
        assert len(logs) == 0

