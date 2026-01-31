"""
A/B 測試 API 單元測試
A/B Testing API Unit Tests

🆕 測試優化: 後端單元測試
"""

import pytest
import os
import sys
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ab_testing_api import (
    ABTestingAPI, ABTest, TestVariant, TestAnalysis,
    TestStatus, VariantType, MetricType
)


class MockDatabase:
    """模擬數據庫"""
    
    def __init__(self):
        self._conn = MagicMock()
        self._cursor = MagicMock()
        self._conn.cursor.return_value = self._cursor
    
    def get_connection(self):
        return self
    
    def __enter__(self):
        return self._conn
    
    def __exit__(self, *args):
        pass


class TestABTestingAPI:
    """A/B 測試 API 測試"""
    
    @pytest.fixture
    def db(self):
        """創建測試數據庫"""
        return MockDatabase()
    
    @pytest.fixture
    def api(self, db):
        """創建 API 實例"""
        with patch.object(ABTestingAPI, '_ensure_tables'):
            api = ABTestingAPI(db)
        return api
    
    # ============ 測試創建 ============
    
    def test_create_test_basic(self, api):
        """測試基本創建"""
        with patch.object(api, '_save_test'):
            test = api.create_test(
                name="測試A/B",
                test_type=VariantType.MESSAGE,
                variants=[
                    {"name": "控制組", "weight": 50},
                    {"name": "變體A", "weight": 50}
                ]
            )
        
        assert test is not None
        assert test.name == "測試A/B"
        assert test.type == VariantType.MESSAGE
        assert test.status == TestStatus.DRAFT
        assert len(test.variants) == 2
    
    def test_create_test_with_options(self, api):
        """測試帶選項創建"""
        with patch.object(api, '_save_test'):
            test = api.create_test(
                name="高級測試",
                test_type=VariantType.STRATEGY,
                variants=[
                    {"name": "策略A", "weight": 60, "config": {"approach": "aggressive"}},
                    {"name": "策略B", "weight": 40, "config": {"approach": "conservative"}}
                ],
                options={
                    "description": "比較兩種策略",
                    "primary_metric": "revenue",
                    "target_sample_size": 2000,
                    "confidence_level": 0.99,
                    "auto_optimize": True
                }
            )
        
        assert test.description == "比較兩種策略"
        assert test.primary_metric == MetricType.REVENUE
        assert test.target_sample_size == 2000
        assert test.confidence_level == 0.99
        assert test.auto_optimize is True
    
    def test_weight_normalization(self, api):
        """測試權重標準化"""
        with patch.object(api, '_save_test'):
            test = api.create_test(
                name="權重測試",
                test_type=VariantType.MESSAGE,
                variants=[
                    {"name": "A", "weight": 30},
                    {"name": "B", "weight": 20},
                    {"name": "C", "weight": 50}
                ]
            )
        
        total_weight = sum(v.weight for v in test.variants)
        assert total_weight == 100
    
    # ============ 狀態管理測試 ============
    
    def test_start_test(self, api):
        """測試啟動"""
        mock_test = ABTest(
            id="test-123",
            name="測試",
            description=None,
            status=TestStatus.DRAFT,
            type=VariantType.MESSAGE,
            variants=[]
        )
        
        with patch.object(api, 'get_test', return_value=mock_test):
            with patch.object(api, '_save_test'):
                result = api.start_test("test-123")
        
        assert result.status == TestStatus.RUNNING
        assert result.started_at is not None
    
    def test_pause_test(self, api):
        """測試暫停"""
        mock_test = ABTest(
            id="test-123",
            name="測試",
            description=None,
            status=TestStatus.RUNNING,
            type=VariantType.MESSAGE,
            variants=[]
        )
        
        with patch.object(api, 'get_test', return_value=mock_test):
            with patch.object(api, '_save_test'):
                result = api.pause_test("test-123")
        
        assert result.status == TestStatus.PAUSED
    
    def test_select_winner(self, api):
        """測試選擇獲勝者"""
        mock_test = ABTest(
            id="test-123",
            name="測試",
            description=None,
            status=TestStatus.COMPLETED,
            type=VariantType.MESSAGE,
            variants=[
                TestVariant(id="var-1", name="A", type=VariantType.MESSAGE, config={}),
                TestVariant(id="var-2", name="B", type=VariantType.MESSAGE, config={})
            ]
        )
        
        with patch.object(api, 'get_test', return_value=mock_test):
            with patch.object(api, '_save_test'):
                result = api.select_winner("test-123", "var-1")
        
        assert result.status == TestStatus.WINNER_SELECTED
        assert result.winner_variant_id == "var-1"
    
    # ============ 事件記錄測試 ============
    
    def test_record_impression(self, api):
        """測試記錄曝光"""
        mock_test = ABTest(
            id="test-123",
            name="測試",
            description=None,
            status=TestStatus.RUNNING,
            type=VariantType.MESSAGE,
            variants=[
                TestVariant(id="var-1", name="A", type=VariantType.MESSAGE, config={}, impressions=10)
            ]
        )
        
        with patch.object(api, 'get_test', return_value=mock_test):
            with patch.object(api, '_save_test'):
                with patch.object(api.db, 'get_connection') as mock_conn:
                    mock_cursor = MagicMock()
                    mock_conn.return_value.__enter__.return_value.cursor.return_value = mock_cursor
                    
                    result = api.record_event("test-123", "var-1", "impression")
        
        assert result is True
        assert mock_test.variants[0].impressions == 11
    
    def test_record_conversion(self, api):
        """測試記錄轉化"""
        mock_test = ABTest(
            id="test-123",
            name="測試",
            description=None,
            status=TestStatus.RUNNING,
            type=VariantType.MESSAGE,
            variants=[
                TestVariant(
                    id="var-1", name="A", type=VariantType.MESSAGE, config={},
                    impressions=100, conversions=5, revenue=50.0
                )
            ]
        )
        
        with patch.object(api, 'get_test', return_value=mock_test):
            with patch.object(api, '_save_test'):
                with patch.object(api.db, 'get_connection') as mock_conn:
                    mock_cursor = MagicMock()
                    mock_conn.return_value.__enter__.return_value.cursor.return_value = mock_cursor
                    
                    result = api.record_event("test-123", "var-1", "conversion", 10.0)
        
        assert result is True
        assert mock_test.variants[0].conversions == 6
        assert mock_test.variants[0].revenue == 60.0
    
    def test_record_event_not_running(self, api):
        """測試非運行狀態記錄"""
        mock_test = ABTest(
            id="test-123",
            name="測試",
            description=None,
            status=TestStatus.PAUSED,
            type=VariantType.MESSAGE,
            variants=[]
        )
        
        with patch.object(api, 'get_test', return_value=mock_test):
            result = api.record_event("test-123", "var-1", "impression")
        
        assert result is False
    
    # ============ 流量分配測試 ============
    
    def test_get_variant_for_test(self, api):
        """測試獲取變體"""
        mock_test = ABTest(
            id="test-123",
            name="測試",
            description=None,
            status=TestStatus.RUNNING,
            type=VariantType.MESSAGE,
            variants=[
                TestVariant(id="var-1", name="A", type=VariantType.MESSAGE, config={}, weight=50),
                TestVariant(id="var-2", name="B", type=VariantType.MESSAGE, config={}, weight=50)
            ]
        )
        
        with patch.object(api, 'get_test', return_value=mock_test):
            variant = api.get_variant_for_test("test-123")
        
        assert variant is not None
        assert variant.id in ["var-1", "var-2"]
    
    def test_get_variant_not_running(self, api):
        """測試非運行狀態獲取變體"""
        mock_test = ABTest(
            id="test-123",
            name="測試",
            description=None,
            status=TestStatus.DRAFT,
            type=VariantType.MESSAGE,
            variants=[]
        )
        
        with patch.object(api, 'get_test', return_value=mock_test):
            variant = api.get_variant_for_test("test-123")
        
        assert variant is None
    
    # ============ 分析測試 ============
    
    def test_analyze_significant(self, api):
        """測試顯著性分析"""
        mock_test = ABTest(
            id="test-123",
            name="測試",
            description=None,
            status=TestStatus.RUNNING,
            type=VariantType.MESSAGE,
            variants=[
                TestVariant(
                    id="var-1", name="控制組", type=VariantType.MESSAGE, config={},
                    impressions=1000, conversions=50, conversion_rate=5.0
                ),
                TestVariant(
                    id="var-2", name="變體A", type=VariantType.MESSAGE, config={},
                    impressions=1000, conversions=80, conversion_rate=8.0
                )
            ],
            confidence_level=0.95
        )
        
        with patch.object(api, 'get_test', return_value=mock_test):
            analysis = api.analyze_test("test-123")
        
        assert analysis.improvement > 0
        assert "var-2" in str(analysis.recommendation) or analysis.winner_variant_id == "var-2"
    
    def test_analyze_not_significant(self, api):
        """測試非顯著性分析"""
        mock_test = ABTest(
            id="test-123",
            name="測試",
            description=None,
            status=TestStatus.RUNNING,
            type=VariantType.MESSAGE,
            variants=[
                TestVariant(
                    id="var-1", name="控制組", type=VariantType.MESSAGE, config={},
                    impressions=10, conversions=1, conversion_rate=10.0
                ),
                TestVariant(
                    id="var-2", name="變體A", type=VariantType.MESSAGE, config={},
                    impressions=10, conversions=2, conversion_rate=20.0
                )
            ],
            confidence_level=0.95,
            target_sample_size=1000
        )
        
        with patch.object(api, 'get_test', return_value=mock_test):
            analysis = api.analyze_test("test-123")
        
        assert analysis.is_significant is False
        assert "樣本" in analysis.recommendation
    
    def test_analyze_insufficient_variants(self, api):
        """測試變體不足"""
        mock_test = ABTest(
            id="test-123",
            name="測試",
            description=None,
            status=TestStatus.RUNNING,
            type=VariantType.MESSAGE,
            variants=[
                TestVariant(id="var-1", name="唯一變體", type=VariantType.MESSAGE, config={})
            ]
        )
        
        with patch.object(api, 'get_test', return_value=mock_test):
            analysis = api.analyze_test("test-123")
        
        assert analysis.is_significant is False
        assert "兩個" in analysis.recommendation


class TestTestVariant:
    """測試變體測試"""
    
    def test_default_values(self):
        """測試默認值"""
        variant = TestVariant(
            id="var-1",
            name="測試變體",
            type=VariantType.MESSAGE,
            config={}
        )
        
        assert variant.weight == 50
        assert variant.impressions == 0
        assert variant.clicks == 0
        assert variant.conversions == 0
        assert variant.revenue == 0.0
        assert variant.ctr == 0.0
        assert variant.conversion_rate == 0.0
    
    def test_with_stats(self):
        """測試帶統計數據"""
        variant = TestVariant(
            id="var-1",
            name="測試變體",
            type=VariantType.MESSAGE,
            config={"text": "Hello"},
            impressions=100,
            clicks=20,
            conversions=5,
            revenue=50.0,
            ctr=20.0,
            conversion_rate=5.0
        )
        
        assert variant.impressions == 100
        assert variant.ctr == 20.0
        assert variant.conversion_rate == 5.0


class TestStatisticalSignificance:
    """統計顯著性計算測試"""
    
    @pytest.fixture
    def api(self):
        """創建 API 實例"""
        db = MockDatabase()
        with patch.object(ABTestingAPI, '_ensure_tables'):
            return ABTestingAPI(db)
    
    def test_high_significance(self, api):
        """測試高顯著性"""
        # 明顯差異
        significance = api._calculate_significance(
            success_a=100, total_a=1000,  # 10%
            success_b=50, total_b=1000     # 5%
        )
        
        assert significance >= 0.95
    
    def test_low_significance(self, api):
        """測試低顯著性"""
        # 小樣本
        significance = api._calculate_significance(
            success_a=2, total_a=10,
            success_b=1, total_b=10
        )
        
        assert significance < 0.95
    
    def test_zero_samples(self, api):
        """測試零樣本"""
        significance = api._calculate_significance(
            success_a=0, total_a=0,
            success_b=0, total_b=0
        )
        
        assert significance == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
