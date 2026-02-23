"""
API 自動化測試

優化設計：
1. 測試所有關鍵 API 端點
2. 認證流程測試
3. 錯誤處理測試
"""

import pytest
import asyncio
import json
import os
import sys
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

# 添加項目路徑
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ==================== 測試配置 ====================

@pytest.fixture
def test_db_path(tmp_path):
    """創建臨時測試數據庫"""
    return str(tmp_path / "test.db")


@pytest.fixture
def mock_request():
    """模擬 HTTP 請求"""
    request = Mock()
    request.query = {}
    request.headers = {}
    request.match_info = {}
    request.get = Mock(return_value=None)
    return request


# ==================== 認證服務測試 ====================

class TestAuthService:
    """認證服務測試"""
    
    @pytest.fixture
    def auth_service(self, test_db_path):
        """創建認證服務實例"""
        from auth.service import AuthService
        service = AuthService(test_db_path)
        return service
    
    @pytest.mark.asyncio
    async def test_register_user(self, auth_service):
        """測試用戶註冊"""
        result = await auth_service.register(
            email='test@example.com',
            password='TestPass123!',
            username='testuser'
        )
        
        assert result['success'] is True
        user = result.get('user') or (result.get('data') or {}).get('user')
        assert user is not None
        assert user.get('email') == 'test@example.com'
    
    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, auth_service):
        """測試重複郵箱註冊"""
        await auth_service.register(
            email='test@example.com',
            password='TestPass123!',
            username='testuser1'
        )
        
        result = await auth_service.register(
            email='test@example.com',
            password='TestPass456!',
            username='testuser2'
        )
        
        assert result['success'] is False
        assert 'error' in result
    
    @pytest.mark.asyncio
    async def test_login_success(self, auth_service):
        """測試成功登入"""
        await auth_service.register(
            email='login@example.com',
            password='TestPass123!',
            username='loginuser'
        )
        
        result = await auth_service.login(
            email='login@example.com',
            password='TestPass123!'
        )
        
        assert result['success'] is True
        data = result.get('data') or result
        assert data.get('access_token') is not None
        assert data.get('refresh_token') is not None

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, auth_service):
        """測試錯誤密碼登入"""
        await auth_service.register(
            email='wrongpass@example.com',
            password='TestPass123!',
            username='wrongpassuser'
        )
        
        result = await auth_service.login(
            email='wrongpass@example.com',
            password='WrongPassword!'
        )
        
        assert result['success'] is False
    
    @pytest.mark.asyncio
    async def test_token_refresh(self, auth_service):
        """測試令牌刷新"""
        await auth_service.register(
            email='refresh@example.com',
            password='TestPass123!',
            username='refreshuser'
        )
        
        login_result = await auth_service.login(
            email='refresh@example.com',
            password='TestPass123!'
        )
        login_data = login_result.get('data') or login_result
        refresh_token = login_data.get('refresh_token')
        assert refresh_token is not None
        result = await auth_service.refresh_token(refresh_token)
        assert result['success'] is True
        out_data = result.get('data') or result
        assert out_data.get('access_token') is not None


# ==================== 安全服務測試 ====================

class TestSecurityService:
    """安全服務測試"""
    
    @pytest.fixture
    def security_service(self, test_db_path):
        """創建安全服務實例"""
        from auth.security import SecurityService
        service = SecurityService(test_db_path)
        return service
    
    @pytest.mark.asyncio
    async def test_record_login_attempt(self, security_service):
        """測試記錄登入嘗試"""
        result = await security_service.record_login_attempt(
            user_id='user123',
            ip_address='192.168.1.1',
            user_agent='Test Browser',
            success=True
        )
        
        assert result.user_id == 'user123'
        assert result.success is True
    
    @pytest.mark.asyncio
    async def test_account_lockout(self, security_service):
        """測試帳戶鎖定"""
        user_id = 'locktest'
        
        # 模擬多次失敗
        for i in range(5):
            await security_service.increment_failed_attempts(user_id)
        
        is_locked = await security_service.is_account_locked(user_id)
        assert is_locked is True
    
    @pytest.mark.asyncio
    async def test_ip_rule_blacklist(self, security_service):
        """測試 IP 黑名單"""
        await security_service.add_ip_rule(
            user_id='',
            ip_pattern='10.0.0.1',
            rule_type='blacklist',
            description='Test blacklist'
        )
        
        result = await security_service.check_ip_allowed('user1', '10.0.0.1')
        assert result['allowed'] is False
    
    @pytest.mark.asyncio
    async def test_ip_rule_whitelist(self, security_service):
        """測試 IP 白名單"""
        await security_service.add_ip_rule(
            user_id='user1',
            ip_pattern='192.168.1.0/24',
            rule_type='whitelist',
            description='Office network'
        )
        
        # 白名單內的 IP
        result1 = await security_service.check_ip_allowed('user1', '192.168.1.100')
        assert result1['allowed'] is True
        
        # 白名單外的 IP
        result2 = await security_service.check_ip_allowed('user1', '10.0.0.1')
        assert result2['allowed'] is False


# ==================== 使用量追蹤測試 ====================

class TestUsageTracker:
    """使用量追蹤測試"""
    
    @pytest.fixture
    def usage_tracker(self, test_db_path):
        """創建使用量追蹤實例"""
        from core.usage_tracker import UsageTracker
        tracker = UsageTracker(test_db_path)
        return tracker
    
    @pytest.mark.asyncio
    async def test_track_api_call(self, usage_tracker):
        """測試追蹤 API 調用"""
        await usage_tracker.track_api_call('user1', '/api/test')
        
        today = await usage_tracker.get_today_usage('user1')
        assert today.api_calls >= 1
    
    @pytest.mark.asyncio
    async def test_check_quota(self, usage_tracker):
        """測試配額檢查"""
        # 設置配額
        result = await usage_tracker.check_quota('user1', 'api_calls', 100)
        assert result['allowed'] is True
    
    @pytest.mark.asyncio
    async def test_usage_summary(self, usage_tracker):
        """測試使用量摘要"""
        await usage_tracker.track_api_call('user1', '/api/test')
        await usage_tracker.track_message('user1')
        
        summary = await usage_tracker.get_usage_summary('user1')
        assert 'today' in summary
        assert 'this_month' in summary


# ==================== 緩存服務測試 ====================

class TestCacheService:
    """緩存服務測試"""
    
    @pytest.fixture
    def cache_service(self):
        """創建緩存服務實例"""
        from core.cache import CacheService
        return CacheService()
    
    @pytest.mark.asyncio
    async def test_set_and_get(self, cache_service):
        """測試設置和獲取緩存"""
        await cache_service.set('test_key', {'data': 'value'}, ttl=60)
        
        result = await cache_service.get('test_key')
        assert result == {'data': 'value'}
    
    @pytest.mark.asyncio
    async def test_cache_expiry(self, cache_service):
        """測試緩存過期"""
        await cache_service.set('expire_key', 'value', ttl=1)
        
        # 等待過期
        await asyncio.sleep(1.5)
        
        result = await cache_service.get('expire_key')
        assert result is None
    
    @pytest.mark.asyncio
    async def test_delete(self, cache_service):
        """測試刪除緩存"""
        await cache_service.set('delete_key', 'value')
        await cache_service.delete('delete_key')
        
        result = await cache_service.get('delete_key')
        assert result is None


# ==================== 國際化測試 ====================

class TestI18n:
    """國際化測試"""
    
    def test_translate_zh_tw(self):
        """測試繁體中文翻譯"""
        from core.i18n import t, set_language
        
        set_language('zh-TW')
        result = t('auth.invalid_credentials')
        
        assert '帳號' in result or '密碼' in result
    
    def test_translate_en(self):
        """測試英文翻譯"""
        from core.i18n import t, set_language
        
        set_language('en')
        result = t('auth.invalid_credentials')
        
        assert 'Invalid' in result or 'password' in result
    
    def test_detect_language(self):
        """測試語言檢測"""
        from core.i18n import detect_language
        
        assert detect_language('zh-TW,zh;q=0.9,en;q=0.8') == 'zh-TW'
        assert detect_language('en-US,en;q=0.9') == 'en'
        assert detect_language('zh-CN') == 'zh-CN'


# ==================== 診斷服務測試 ====================

class TestDiagnosticsService:
    """診斷服務測試"""
    
    @pytest.fixture
    def diagnostics_service(self, test_db_path):
        """創建診斷服務實例"""
        from core.diagnostics import DiagnosticsService
        return DiagnosticsService(test_db_path)
    
    @pytest.mark.asyncio
    async def test_check_memory(self, diagnostics_service):
        """測試內存檢查"""
        result = await diagnostics_service.check_memory()
        
        assert result.name == 'memory'
        assert result.status in ['healthy', 'degraded', 'unhealthy']
    
    @pytest.mark.asyncio
    async def test_check_disk(self, diagnostics_service):
        """測試磁盤檢查"""
        result = await diagnostics_service.check_disk()
        
        assert result.name == 'disk'
        assert result.status in ['healthy', 'degraded', 'unhealthy']
    
    @pytest.mark.asyncio
    async def test_quick_health(self, diagnostics_service):
        """測試快速健康檢查"""
        result = await diagnostics_service.get_quick_health()
        
        assert 'status' in result
        assert 'timestamp' in result
        assert 'checks' in result
    
    def test_get_system_info(self, diagnostics_service):
        """測試獲取系統信息"""
        info = diagnostics_service.get_system_info()
        
        assert 'os' in info
        assert 'python_version' in info


# ==================== 運行測試 ====================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
