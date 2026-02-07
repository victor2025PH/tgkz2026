"""
🔧 P12: 業務功能增強 — 全量測試套件

覆蓋：
  P12-1: 線索自動評分引擎 (lead_scoring.py)
  P12-2: 線索去重服務 (lead_dedup.py)
  P12-3: 消息重試策略 (message_retry.py)
  P12-4: 業務分析看板 (business_analytics.py)
  P12-5: 模板 A/B 測試 (template_ab_test.py)
"""

import os
import sys
import pytest
import tempfile
import sqlite3
import shutil
from unittest.mock import MagicMock, patch

# 確保 backend 目錄在 sys.path 中
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


# ============================================================
#  P12-1: 線索評分引擎
# ============================================================

class TestLeadScoring:
    """P12-1: 線索評分引擎測試"""

    def test_import_lead_scoring(self):
        from core.lead_scoring import LeadScoringEngine, get_scoring_engine
        assert LeadScoringEngine is not None
        assert callable(get_scoring_engine)

    def test_scoring_engine_singleton(self):
        import core.lead_scoring as mod
        mod._scoring_engine = None  # 重置
        e1 = mod.get_scoring_engine()
        e2 = mod.get_scoring_engine()
        assert e1 is e2
        mod._scoring_engine = None  # 清理

    def test_score_empty_lead(self):
        """空線索應得到最低分"""
        from core.lead_scoring import LeadScoringEngine
        engine = LeadScoringEngine()
        result = engine.score_lead({})
        assert result['lead_score'] >= 0
        assert result['lead_score'] <= 100
        assert result['intent_level'] in ('hot', 'warm', 'neutral', 'cold')
        assert result['value_level'] in ('A', 'B', 'C')

    def test_score_rich_lead(self):
        """資料完整的線索應得到較高分"""
        from core.lead_scoring import LeadScoringEngine
        engine = LeadScoringEngine()
        lead = {
            'display_name': 'John',
            'username': 'john123',
            'phone': '+1234567890',
            'first_name': 'John',
            'last_name': 'Doe',
            'bio': 'Interested in crypto',
            'message_count': 5,
            'reply_count': 3,
            'is_mutual': True,
            'matched_keywords': '["crypto", "invest"]',
            'source_group_id': '123',
            'is_bot': False,
            'ad_risk_score': 0.1,
            'is_verified': True,
            'account_age_days': 60,
        }
        result = engine.score_lead(lead)
        empty_result = engine.score_lead({})
        assert result['lead_score'] > empty_result['lead_score']

    def test_score_result_structure(self):
        """評分結果應包含所有必要字段"""
        from core.lead_scoring import LeadScoringEngine
        engine = LeadScoringEngine()
        result = engine.score_lead({'username': 'test'})
        required_keys = ['lead_score', 'intent_level', 'value_level',
                         'intent_score', 'quality_score', 'activity_score',
                         'breakdown', 'matched_rules']
        for key in required_keys:
            assert key in result, f"Missing key: {key}"

    def test_score_breakdown_categories(self):
        """breakdown 應包含所有分類"""
        from core.lead_scoring import LeadScoringEngine
        engine = LeadScoringEngine()
        result = engine.score_lead({'username': 'test'})
        expected_cats = ['profile', 'engagement', 'intent', 'quality', 'recency']
        for cat in expected_cats:
            assert cat in result['breakdown']

    def test_batch_score(self):
        """批量評分"""
        from core.lead_scoring import LeadScoringEngine
        engine = LeadScoringEngine()
        leads = [
            {'id': 1, 'username': 'a'},
            {'id': 2, 'username': 'b', 'phone': '123'},
            {'id': 3},
        ]
        results = engine.batch_score(leads)
        assert len(results) == 3

    def test_intent_levels(self):
        """驗證意向級別映射"""
        from core.lead_scoring import LeadScoringEngine
        engine = LeadScoringEngine()
        r1 = engine.score_lead({})
        assert r1['intent_level'] in ('hot', 'warm', 'neutral', 'cold')

    def test_value_levels(self):
        """驗證價值級別映射"""
        from core.lead_scoring import LeadScoringEngine
        engine = LeadScoringEngine()
        r = engine.score_lead({})
        assert r['value_level'] in ('A', 'B', 'C')


# ============================================================
#  P12-2: 線索去重服務
# ============================================================

class TestLeadDedup:
    """P12-2: 線索去重服務測試"""

    def _create_test_db(self):
        """創建帶測試數據的臨時 DB"""
        tmpdir = tempfile.mkdtemp()
        db_path = os.path.join(tmpdir, 'test_dedup.db')
        conn = sqlite3.connect(db_path)
        conn.execute('''CREATE TABLE unified_contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT,
            username TEXT,
            display_name TEXT,
            first_name TEXT,
            last_name TEXT,
            phone TEXT,
            bio TEXT,
            source TEXT DEFAULT '',
            status TEXT DEFAULT 'new',
            funnel_stage TEXT DEFAULT 'awareness',
            tags TEXT DEFAULT '',
            lead_score INTEGER DEFAULT 0,
            intent_level TEXT DEFAULT '',
            value_level TEXT DEFAULT '',
            intent_score INTEGER DEFAULT 0,
            quality_score INTEGER DEFAULT 0,
            activity_score REAL DEFAULT 0,
            message_count INTEGER DEFAULT 0,
            reply_count INTEGER DEFAULT 0,
            notes TEXT DEFAULT '',
            custom_fields TEXT DEFAULT '{}',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )''')
        # 插入一些重複數據
        conn.execute("INSERT INTO unified_contacts (telegram_id, username, display_name, phone) VALUES ('123', 'alice', 'Alice A', '+111')")
        conn.execute("INSERT INTO unified_contacts (telegram_id, username, display_name, phone) VALUES ('124', 'alice', 'Alice B', '+111')")
        conn.execute("INSERT INTO unified_contacts (telegram_id, username, display_name, phone) VALUES ('456', 'bob', 'Bob', '+222')")
        conn.execute("INSERT INTO unified_contacts (telegram_id, username, display_name, phone) VALUES ('789', 'charlie', 'Charlie', '+333')")
        conn.commit()
        conn.close()
        return tmpdir, db_path

    def test_import_lead_dedup(self):
        from core.lead_dedup import LeadDeduplicationService, DuplicateGroup
        assert LeadDeduplicationService is not None
        assert DuplicateGroup is not None

    def test_scan_duplicates(self):
        """掃描重複 — username 和 phone 重複應被發現"""
        tmpdir, db_path = self._create_test_db()
        try:
            from core.lead_dedup import LeadDeduplicationService
            service = LeadDeduplicationService(db_path=db_path)
            groups = service.scan_duplicates(limit=50)
            # alice 有 username 重複，+111 有 phone 重複
            assert len(groups) >= 1
            match_types = {g.match_type for g in groups}
            assert 'fuzzy_username' in match_types or 'exact_phone' in match_types
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    def test_merge_duplicates(self):
        """合併後重複記錄應被刪除"""
        tmpdir, db_path = self._create_test_db()
        try:
            from core.lead_dedup import LeadDeduplicationService
            service = LeadDeduplicationService(db_path=db_path)

            # id=1 和 id=2 都是 alice，合併
            result = service.merge_duplicates(1, [2])
            assert 'error' not in result, f"Merge failed: {result}"
            assert result.get('merged') == 1

            # 驗證記錄數減少
            conn = sqlite3.connect(db_path)
            count = conn.execute('SELECT COUNT(*) FROM unified_contacts').fetchone()[0]
            conn.close()
            assert count == 3  # 原4條 → 合併後3條
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    def test_dedup_stats(self):
        """去重統計"""
        tmpdir, db_path = self._create_test_db()
        try:
            from core.lead_dedup import LeadDeduplicationService
            service = LeadDeduplicationService(db_path=db_path)
            stats = service.get_dedup_stats()
            assert 'total_contacts' in stats
            assert stats['total_contacts'] == 4
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    def test_duplicate_group_to_dict(self):
        """DuplicateGroup 序列化"""
        from core.lead_dedup import DuplicateGroup
        g = DuplicateGroup(
            primary_id=1,
            duplicate_ids=[2, 3],
            match_type='exact_telegram_id',
            confidence=0.95,
            details={'reason': 'same telegram_id'}
        )
        d = g.to_dict()
        assert d['primary_id'] == 1
        assert d['duplicate_ids'] == [2, 3]
        assert d['confidence'] == 0.95


# ============================================================
#  P12-3: 消息重試策略
# ============================================================

class TestMessageRetry:
    """P12-3: 消息重試策略測試"""

    def test_import_message_retry(self):
        from core.message_retry import (
            MessageRetryManager, RetryPolicy, RetryDecision,
            ERROR_CATEGORIES, get_retry_manager
        )
        assert MessageRetryManager is not None
        assert RetryPolicy is not None
        assert RetryDecision is not None

    def test_retry_manager_singleton(self):
        import core.message_retry as mod
        mod._retry_manager = None  # 重置
        m1 = mod.get_retry_manager()
        m2 = mod.get_retry_manager()
        assert m1 is m2
        mod._retry_manager = None  # 清理

    def test_default_policy(self):
        """默認策略合理性"""
        from core.message_retry import get_retry_manager
        manager = get_retry_manager()
        assert manager.policy.max_retries >= 3
        assert manager.policy.base_delay_seconds >= 1
        assert manager.policy.max_delay_seconds <= 3600

    def test_calculate_delay_exponential(self):
        """延遲應指數增長（RetryPolicy 方法）"""
        from core.message_retry import RetryPolicy
        policy = RetryPolicy(max_retries=5, base_delay_seconds=2,
                             max_delay_seconds=120, jitter_factor=0,
                             backoff_multiplier=2.0)
        d1 = policy.calculate_delay(0)
        d2 = policy.calculate_delay(1)
        d3 = policy.calculate_delay(2)
        assert d2 > d1
        assert d3 > d2

    def test_calculate_delay_cap(self):
        """延遲不應超過上限"""
        from core.message_retry import RetryPolicy
        policy = RetryPolicy(max_retries=10, base_delay_seconds=2,
                             max_delay_seconds=60, jitter_factor=0,
                             backoff_multiplier=3.0)
        for attempt in range(10):
            d = policy.calculate_delay(attempt)
            assert d <= 60

    def test_should_retry_transient_error(self):
        """暫時性錯誤應重試"""
        from core.message_retry import MessageRetryManager, RetryDecision
        manager = MessageRetryManager()
        # 注意：should_retry(error_message, current_retry_count)
        decision, delay, reason = manager.should_retry('Connection timeout', 0)
        assert decision == RetryDecision.RETRY
        assert delay > 0

    def test_should_retry_permanent_error(self):
        """永久性錯誤不應重試"""
        from core.message_retry import MessageRetryManager, RetryDecision
        manager = MessageRetryManager()
        decision, delay, reason = manager.should_retry('UserBlocked by user', 0)
        assert decision == RetryDecision.DEAD_LETTER

    def test_should_retry_max_exceeded(self):
        """超過最大重試次數不重試"""
        from core.message_retry import MessageRetryManager, RetryDecision
        manager = MessageRetryManager()
        decision, delay, reason = manager.should_retry('Connection timeout', 999)
        assert decision == RetryDecision.DEAD_LETTER

    def test_should_retry_flood_wait(self):
        """FloodWait 應自動等待指定時間"""
        from core.message_retry import MessageRetryManager, RetryDecision
        manager = MessageRetryManager()
        decision, delay, reason = manager.should_retry('FloodWait: 30 seconds', 0)
        assert decision == RetryDecision.RETRY
        assert delay >= 30

    def test_retry_schedule(self):
        """重試時間表"""
        from core.message_retry import get_retry_manager
        manager = get_retry_manager()
        schedule = manager.get_retry_schedule()
        assert isinstance(schedule, list)
        assert len(schedule) >= 1
        for item in schedule:
            assert 'attempt' in item
            assert 'delay_seconds' in item

    def test_error_categories(self):
        """錯誤分類覆蓋"""
        from core.message_retry import ERROR_CATEGORIES
        assert isinstance(ERROR_CATEGORIES, dict)
        # 包含 transient、permanent、manual 三大類
        assert 'transient' in ERROR_CATEGORIES
        assert 'permanent' in ERROR_CATEGORIES
        assert 'manual' in ERROR_CATEGORIES
        # 每個分類都有條目
        for cat, keywords in ERROR_CATEGORIES.items():
            assert isinstance(keywords, list)
            assert len(keywords) > 0


# ============================================================
#  P12-4: 業務分析看板
# ============================================================

class TestBusinessAnalytics:
    """P12-4: 業務分析看板測試"""

    def _create_test_db(self):
        """創建帶測試數據的臨時 DB"""
        tmpdir = tempfile.mkdtemp()
        db_path = os.path.join(tmpdir, 'test_analytics.db')
        conn = sqlite3.connect(db_path)

        conn.execute('''CREATE TABLE unified_contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT,
            username TEXT,
            display_name TEXT,
            source TEXT DEFAULT '',
            source_group_title TEXT DEFAULT '',
            funnel_stage TEXT DEFAULT 'awareness',
            lead_score INTEGER DEFAULT 0,
            quality_score INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            user_id TEXT DEFAULT ''
        )''')
        conn.execute('''CREATE TABLE chat_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT DEFAULT '',
            content TEXT DEFAULT '',
            usage_count INTEGER DEFAULT 0,
            success_rate REAL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )''')
        conn.execute('''CREATE TABLE message_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            user_id TEXT DEFAULT ''
        )''')

        from datetime import datetime
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        conn.execute("INSERT INTO unified_contacts (telegram_id, username, source_group_title, funnel_stage, lead_score, created_at) VALUES ('1', 'user1', 'Group A', 'awareness', 30, ?)", (now,))
        conn.execute("INSERT INTO unified_contacts (telegram_id, username, source_group_title, funnel_stage, lead_score, created_at) VALUES ('2', 'user2', 'Group A', 'interest', 60, ?)", (now,))
        conn.execute("INSERT INTO unified_contacts (telegram_id, username, source_group_title, funnel_stage, lead_score, created_at) VALUES ('3', 'user3', 'Group B', 'decision', 85, ?)", (now,))
        conn.execute("INSERT INTO chat_templates (name, content, usage_count, success_rate) VALUES ('Template A', 'Hello {name}', 100, 0.75)")
        conn.execute("INSERT INTO chat_templates (name, content, usage_count, success_rate) VALUES ('Template B', 'Hi {name}', 50, 0.60)")
        conn.execute("INSERT INTO message_queue (status, created_at) VALUES ('sent', ?)", (now,))
        conn.execute("INSERT INTO message_queue (status, created_at) VALUES ('failed', ?)", (now,))
        conn.commit()
        conn.close()
        return tmpdir, db_path

    def test_import_business_analytics(self):
        from core.business_analytics import BusinessAnalytics
        assert BusinessAnalytics is not None

    def test_lead_source_analysis(self):
        tmpdir, db_path = self._create_test_db()
        try:
            from core.business_analytics import BusinessAnalytics
            analytics = BusinessAnalytics(db_path=db_path)
            data = analytics.get_lead_source_analysis(days=30)
            assert isinstance(data, (list, dict))
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    def test_template_performance(self):
        tmpdir, db_path = self._create_test_db()
        try:
            from core.business_analytics import BusinessAnalytics
            analytics = BusinessAnalytics(db_path=db_path)
            data = analytics.get_template_performance(days=30)
            assert isinstance(data, (list, dict))
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    def test_daily_trends(self):
        tmpdir, db_path = self._create_test_db()
        try:
            from core.business_analytics import BusinessAnalytics
            analytics = BusinessAnalytics(db_path=db_path)
            data = analytics.get_daily_trends(days=7)
            assert isinstance(data, (list, dict))
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    def test_funnel_analysis(self):
        tmpdir, db_path = self._create_test_db()
        try:
            from core.business_analytics import BusinessAnalytics
            analytics = BusinessAnalytics(db_path=db_path)
            data = analytics.get_funnel_analysis()
            assert isinstance(data, (list, dict))
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    def test_summary_dashboard(self):
        tmpdir, db_path = self._create_test_db()
        try:
            from core.business_analytics import BusinessAnalytics
            analytics = BusinessAnalytics(db_path=db_path)
            data = analytics.get_summary_dashboard()
            assert isinstance(data, dict)
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)


# ============================================================
#  P12-5: 模板 A/B 測試
# ============================================================

class TestTemplateABTest:
    """P12-5: 模板 A/B 測試引擎"""

    def test_import_ab_test(self):
        from core.template_ab_test import (
            TemplateABTest, ABTestManager, get_ab_test_manager
        )
        assert TemplateABTest is not None
        assert ABTestManager is not None

    def test_ab_manager_singleton(self):
        import core.template_ab_test as mod
        mod._ab_manager = None
        m1 = mod.get_ab_test_manager()
        m2 = mod.get_ab_test_manager()
        assert m1 is m2
        mod._ab_manager = None

    def test_create_test(self):
        from core.template_ab_test import ABTestManager
        manager = ABTestManager()
        test = manager.create_test(
            name='Test 1',
            template_ids=[1, 2, 3],
            template_names=['A', 'B', 'C']
        )
        assert test.test_id
        assert len(test.variants) == 3
        assert test.status == 'running'

    def test_select_variant(self):
        from core.template_ab_test import ABTestManager
        manager = ABTestManager()
        test = manager.create_test('Test Sel', template_ids=[10, 20])

        selected = set()
        for _ in range(100):
            v = test.select_variant()
            selected.add(v['template_id'])
        assert 10 in selected
        assert 20 in selected

    def test_record_result(self):
        from core.template_ab_test import ABTestManager
        manager = ABTestManager()
        test = manager.create_test('Test Rec', template_ids=[1, 2])

        test.record_result(0, success=True, got_reply=True)
        test.record_result(0, success=True, got_reply=False)
        test.record_result(1, success=False, got_reply=False)

        results = test.get_results()
        v0 = results['variants'][0]
        v1 = results['variants'][1]
        assert v0['sent'] == 2
        assert v0['success'] == 2
        assert v0['replies'] == 1
        assert v1['sent'] == 1
        assert v1['success'] == 0

    def test_get_results_winner(self):
        """至少10次發送才選贏家"""
        from core.template_ab_test import ABTestManager
        manager = ABTestManager()
        test = manager.create_test('Test Win', template_ids=[1, 2])

        for _ in range(5):
            test.record_result(0, success=True)
            test.record_result(1, success=False)
        results = test.get_results()
        assert results['winner'] is None

        for _ in range(5):
            test.record_result(0, success=True)
            test.record_result(1, success=False)
        results = test.get_results()
        assert results['winner'] is not None
        assert results['winner']['variant_index'] == 0

    def test_complete_test(self):
        from core.template_ab_test import ABTestManager
        manager = ABTestManager()
        test = manager.create_test('Test Comp', template_ids=[1, 2])
        result = manager.complete_test(test.test_id)
        assert result is not None
        assert result['status'] == 'completed'

    def test_list_tests(self):
        from core.template_ab_test import ABTestManager
        manager = ABTestManager()
        manager.create_test('T1', template_ids=[1, 2])
        manager.create_test('T2', template_ids=[3, 4])
        tests = manager.list_tests()
        assert len(tests) >= 2

    def test_select_template(self):
        from core.template_ab_test import ABTestManager
        manager = ABTestManager()
        test = manager.create_test('T Sel', template_ids=[100, 200])
        v = manager.select_template(test.test_id)
        assert v is not None
        assert v['template_id'] in (100, 200)

    def test_select_template_completed_returns_none(self):
        from core.template_ab_test import ABTestManager
        manager = ABTestManager()
        test = manager.create_test('T Done', template_ids=[1, 2])
        manager.complete_test(test.test_id)
        v = manager.select_template(test.test_id)
        assert v is None


# ============================================================
#  P12 整合：文件結構驗證
# ============================================================

class TestP12FileStructure:
    """驗證所有 P12 文件存在"""

    REQUIRED_FILES = [
        'core/lead_scoring.py',
        'core/lead_dedup.py',
        'core/message_retry.py',
        'core/business_analytics.py',
        'core/template_ab_test.py',
    ]

    def test_all_p12_files_exist(self):
        backend_dir = os.path.join(os.path.dirname(__file__), '..')
        for f in self.REQUIRED_FILES:
            path = os.path.join(backend_dir, f)
            assert os.path.exists(path), f"Missing: {f}"

    def test_all_modules_importable(self):
        """所有 P12 模組可正常 import"""
        from core.lead_scoring import LeadScoringEngine
        from core.lead_dedup import LeadDeduplicationService
        from core.message_retry import MessageRetryManager
        from core.business_analytics import BusinessAnalytics
        from core.template_ab_test import TemplateABTest, ABTestManager
        assert all([LeadScoringEngine, LeadDeduplicationService,
                     MessageRetryManager, BusinessAnalytics,
                     TemplateABTest, ABTestManager])
