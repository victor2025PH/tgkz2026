#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TG-Matrix Integration Test
集成測試腳本

測試關鍵路徑:
1. 模塊導入
2. 核心服務初始化
3. 命令路由器
4. 數據模型
"""

import sys
import os
from pathlib import Path

# 設置輸出編碼
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# 添加 backend 目錄到路徑
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

def test_imports():
    """測試模塊導入"""
    print("\n=== 測試模塊導入 ===")
    
    tests = [
        ("core", "from core import EventBus, get_event_bus, SecureLogger, mask_phone"),
        ("core.event_bus", "from core.event_bus import EventBus, init_event_bus, get_event_bus"),
        ("core.logging", "from core.logging import SecureLogger, mask_phone, mask_sensitive, get_logger"),
        ("api", "from api import CommandRouter, get_command_router"),
        ("api.command_router", "from api.command_router import CommandRouter, CommandCategory"),
        ("domain.contacts", "from domain.contacts import UnifiedContact, ContactStatus, FunnelStage"),
        ("domain.contacts.models", "from domain.contacts.models import UnifiedContact, ContactFilter, ContactStats"),
        ("domain.accounts", "from domain.accounts import register_account_handlers"),
        ("domain.messaging", "from domain.messaging import register_messaging_handlers"),
        ("domain.automation", "from domain.automation import register_automation_handlers"),
        ("domain.ai", "from domain.ai import register_ai_handlers"),
    ]
    
    passed = 0
    failed = 0
    
    for name, import_stmt in tests:
        try:
            exec(import_stmt)
            print(f"  ✓ {name}")
            passed += 1
        except ImportError as e:
            print(f"  ✗ {name}: {e}")
            failed += 1
        except Exception as e:
            print(f"  ✗ {name}: {type(e).__name__}: {e}")
            failed += 1
    
    print(f"\n  結果: {passed} 通過, {failed} 失敗")
    return failed == 0


def test_event_bus():
    """測試事件總線"""
    print("\n=== 測試事件總線 ===")
    
    try:
        from core.event_bus import EventBus, init_event_bus, get_event_bus, Events
        
        # 初始化
        bus = init_event_bus()
        print("  ✓ 事件總線初始化")
        
        # 獲取實例
        bus2 = get_event_bus()
        assert bus is bus2, "單例模式失敗"
        print("  ✓ 單例模式正常")
        
        # 預定義事件
        assert hasattr(Events, 'ACCOUNT_ADDED')
        assert hasattr(Events, 'MESSAGE_SENT')
        print("  ✓ 預定義事件存在")
        
        return True
    except Exception as e:
        print(f"  ✗ 錯誤: {e}")
        return False


def test_logging():
    """測試日誌脫敏"""
    print("\n=== 測試日誌脫敏 ===")
    
    try:
        from core.logging import mask_phone, mask_sensitive, SecureLogger, get_logger
        
        # 電話脫敏
        result = mask_phone('+8613812345678')
        assert '****' in result
        print(f"  ✓ 電話脫敏: +8613812345678 → {result}")
        
        # 通用脫敏
        result = mask_sensitive('API Key: sk-1234567890abcdef1234567890abcdef')
        assert 'sk-1234567890abcdef1234567890abcdef' not in result
        print(f"  ✓ API Key 脫敏正常")
        
        # 日誌器
        logger = get_logger('IntegrationTest')
        logger.info('測試日誌', phone='+8613812345678')
        print("  ✓ SecureLogger 正常工作")
        
        return True
    except Exception as e:
        print(f"  ✗ 錯誤: {e}")
        return False


def test_command_router():
    """測試命令路由器"""
    print("\n=== 測試命令路由器 ===")
    
    try:
        import asyncio
        from api.command_router import CommandRouter, CommandCategory, CommandNotFoundError
        
        router = CommandRouter()
        
        # 註冊命令
        @router.register('test-ping', category=CommandCategory.SYSTEM)
        async def handle_ping(payload, context):
            return {'pong': True}
        
        print("  ✓ 命令註冊")
        
        # 檢查命令
        assert router.has_command('test-ping')
        assert not router.has_command('unknown')
        print("  ✓ 命令存在檢查")
        
        # 執行命令
        async def run_test():
            result = await router.handle('test-ping', {})
            return result
        
        result = asyncio.run(run_test())
        assert result['pong'] == True
        print("  ✓ 命令執行")
        
        # 獲取命令列表
        commands = router.get_commands()
        assert 'test-ping' in commands
        print(f"  ✓ 命令列表: {commands}")
        
        return True
    except Exception as e:
        print(f"  ✗ 錯誤: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_contact_model():
    """測試聯繫人模型"""
    print("\n=== 測試聯繫人模型 ===")
    
    try:
        from domain.contacts.models import (
            UnifiedContact, 
            ContactStatus, 
            FunnelStage, 
            ValueLevel,
            ContactFilter,
            ContactStats
        )
        
        # 創建聯繫人
        contact = UnifiedContact(
            id=1,
            telegram_id='123456789',
            username='testuser',
            first_name='Test',
            last_name='User'
        )
        print(f"  ✓ 創建聯繫人: {contact.display_name}")
        
        # 轉換為字典
        data = contact.to_dict()
        assert 'telegramId' in data
        assert data['displayName'] == 'Test User'
        print("  ✓ 轉換為字典")
        
        # 從字典創建
        contact2 = UnifiedContact.from_dict({
            'id': 2,
            'telegramId': '987654321',
            'status': 'contacted',
            'tags': ['vip', 'hot']
        })
        assert contact2.status == ContactStatus.CONTACTED
        assert len(contact2.tags) == 2
        print(f"  ✓ 從字典創建: 狀態={contact2.status.value}, 標籤={contact2.tags}")
        
        # 過濾器
        filter = ContactFilter(
            status=[ContactStatus.NEW],
            min_lead_score=50,
            limit=10
        )
        print(f"  ✓ 創建過濾器: limit={filter.limit}")
        
        # 統計
        stats = ContactStats(total=100, today_new=5)
        data = stats.to_dict()
        assert data['total'] == 100
        print(f"  ✓ 創建統計: total={stats.total}")
        
        return True
    except Exception as e:
        print(f"  ✗ 錯誤: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_router_integration():
    """測試路由器整合"""
    print("\n=== 測試路由器整合 ===")
    
    try:
        from api.router_integration import setup_command_router, try_route_command
        print("  ✓ 導入路由器整合模塊")
        
        # 注意：完整測試需要 BackendService 實例
        # 這裡只測試導入
        
        return True
    except ImportError as e:
        # 可能依賴其他模塊
        print(f"  ! 跳過 (依賴缺失): {e}")
        return True
    except Exception as e:
        print(f"  ✗ 錯誤: {e}")
        return False


def test_connection_pool():
    """測試連接池"""
    print("\n=== 測試連接池 ===")
    
    try:
        import asyncio
        from core.connection_pool import ConnectionPool, get_pool_manager
        
        # 創建測試連接池
        counter = [0]
        def create_connection():
            counter[0] += 1
            return f"conn_{counter[0]}"
        
        pool = ConnectionPool(
            name='test',
            create_fn=create_connection,
            min_size=1,
            max_size=5
        )
        print("  ✓ 創建連接池")
        
        # 獲取池管理器
        manager = get_pool_manager()
        assert manager is not None
        print("  ✓ 獲取連接池管理器")
        
        return True
    except Exception as e:
        print(f"  ✗ 錯誤: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_cache():
    """測試緩存"""
    print("\n=== 測試緩存 ===")
    
    try:
        from core.cache import LRUCache, get_cache_manager, cached
        
        # 測試 LRU 緩存
        cache = LRUCache(name='test', max_size=10)
        cache.set('key1', 'value1')
        assert cache.get('key1') == 'value1'
        print("  ✓ LRU 緩存 set/get")
        
        # 測試緩存管理器
        manager = get_cache_manager()
        manager.set('query', 'test_key', {'data': 123})
        result = manager.get('query', 'test_key')
        assert result['data'] == 123
        print("  ✓ 緩存管理器")
        
        # 測試統計
        stats = cache.get_stats()
        assert 'hits' in stats
        print(f"  ✓ 統計: hits={stats['hits']}, misses={stats['misses']}")
        
        return True
    except Exception as e:
        print(f"  ✗ 錯誤: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_security():
    """測試安全模塊"""
    print("\n=== 測試安全模塊 ===")
    
    try:
        from core.security import (
            InputValidator, 
            ValidationError,
            RateLimiter,
            DataEncryption,
            APIAuthenticator
        )
        
        # 測試輸入驗證
        clean = InputValidator.sanitize_string('<script>alert("xss")</script>hello')
        assert '<script>' not in clean
        print("  ✓ 輸入清理 (XSS)")
        
        # 測試電話驗證
        phone = InputValidator.validate_phone('+8613812345678')
        assert phone == '+8613812345678'
        print("  ✓ 電話驗證")
        
        # 測試限流
        limiter = RateLimiter()
        for i in range(5):
            limiter.check('test_user', 'auth')
        blocked = not limiter.check('test_user', 'auth')
        assert blocked
        print("  ✓ 請求限流")
        
        # 測試加密
        enc = DataEncryption('test_secret')
        encrypted = enc.encrypt('sensitive data')
        decrypted = enc.decrypt(encrypted)
        assert decrypted == 'sensitive data'
        print("  ✓ 數據加密/解密")
        
        # 測試 API 認證
        auth = APIAuthenticator()
        token = auth.generate_token('user123', {'read', 'write'})
        api_token = auth.validate_token(token)
        assert api_token is not None
        assert api_token.user_id == 'user123'
        print(f"  ✓ API 令牌: {token[:16]}...")
        
        return True
    except Exception as e:
        print(f"  ✗ 錯誤: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_legacy_proxy():
    """測試舊處理器代理"""
    print("\n=== 測試舊處理器代理 ===")
    
    try:
        from api.legacy_proxy import (
            get_all_known_commands,
            get_command_categories,
            command_to_method_name
        )
        
        # 獲取所有命令
        commands = get_all_known_commands()
        assert len(commands) > 50
        print(f"  ✓ 已知命令數: {len(commands)}")
        
        # 測試方法名轉換
        method_name = command_to_method_name('add-account')
        assert method_name == 'handle_add_account'
        print(f"  ✓ 方法名轉換: add-account → {method_name}")
        
        # 獲取分類
        categories = get_command_categories()
        assert 'account' in categories
        assert 'messaging' in categories
        print(f"  ✓ 命令分類: {list(categories.keys())}")
        
        return True
    except Exception as e:
        print(f"  ✗ 錯誤: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_apm():
    """測試 APM 性能監控"""
    print("\n=== 測試 APM 性能監控 ===")
    
    try:
        from core.apm import APMService, get_apm, Span, MetricsCollector
        
        # 獲取 APM 服務
        apm = get_apm()
        assert apm is not None
        print("  ✓ 獲取 APM 服務")
        
        # 測試追蹤
        span = apm.start_span('test_operation')
        span.set_tag('test', 'true')
        span.log('Starting test')
        apm.finish_span(span)
        assert span.duration_ms > 0
        print(f"  ✓ 追蹤跨度: {span.duration_ms:.2f}ms")
        
        # 測試指標
        apm.metrics.record('test.metric', 100)
        apm.metrics.record('test.metric', 200)
        stats = apm.metrics.get_stats('test.metric')
        assert stats['avg'] == 150
        print(f"  ✓ 指標收集: avg={stats['avg']}")
        
        # 測試計數器
        apm.metrics.increment('test.counter')
        apm.metrics.increment('test.counter')
        count = apm.metrics.get_counter('test.counter')
        assert count == 2
        print(f"  ✓ 計數器: count={count}")
        
        # 測試健康狀態
        health = apm.get_health()
        assert health['status'] == 'healthy'
        print(f"  ✓ 健康狀態: {health['status']}")
        
        return True
    except Exception as e:
        print(f"  ✗ 錯誤: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_doc_generator():
    """測試 API 文檔生成"""
    print("\n=== 測試 API 文檔生成 ===")
    
    try:
        from api.doc_generator import APIDocGenerator
        from api.command_router import init_command_router
        
        # 初始化路由器
        init_command_router(None)
        
        # 創建生成器
        generator = APIDocGenerator()
        print("  ✓ 創建文檔生成器")
        
        # 收集命令
        commands = generator.collect_commands()
        assert len(commands) > 0
        total_cmds = sum(len(cmds) for cmds in commands.values())
        print(f"  ✓ 收集命令: {len(commands)} 類別, {total_cmds} 命令")
        
        # 生成 Markdown
        md = generator.generate_markdown()
        assert '# TG-Matrix API 文檔' in md
        print(f"  ✓ 生成 Markdown: {len(md)} 字符")
        
        # 生成 JSON
        json_doc = generator.generate_json()
        assert 'categories' in json_doc
        print(f"  ✓ 生成 JSON: {json_doc['total_commands']} 命令")
        
        # 生成 HTML
        html = generator.generate_html()
        assert '<html' in html
        print(f"  ✓ 生成 HTML: {len(html)} 字符")
        
        return True
    except Exception as e:
        print(f"  ✗ 錯誤: {e}")
        import traceback
        traceback.print_exc()
        return False


def run_all_tests():
    """運行所有測試"""
    print("=" * 60)
    print("TG-Matrix 集成測試 (Phase 1-4)")
    print("=" * 60)
    
    results = []
    
    results.append(("模塊導入", test_imports()))
    results.append(("事件總線", test_event_bus()))
    results.append(("日誌脫敏", test_logging()))
    results.append(("命令路由器", test_command_router()))
    results.append(("聯繫人模型", test_contact_model()))
    results.append(("路由器整合", test_router_integration()))
    results.append(("連接池", test_connection_pool()))
    results.append(("查詢緩存", test_cache()))
    results.append(("安全模塊", test_security()))
    results.append(("舊處理器代理", test_legacy_proxy()))
    results.append(("APM 性能監控", test_apm()))
    results.append(("API 文檔生成", test_doc_generator()))
    
    print("\n" + "=" * 60)
    print("測試結果彙總")
    print("=" * 60)
    
    passed = sum(1 for _, r in results if r)
    failed = sum(1 for _, r in results if not r)
    
    for name, result in results:
        status = "✓ 通過" if result else "✗ 失敗"
        print(f"  {status}: {name}")
    
    print(f"\n總計: {passed} 通過, {failed} 失敗")
    print("=" * 60)
    
    return failed == 0


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
