"""
🔧 P11: 可觀測性與智能運維 — 測試套件

覆蓋：
- P11-1: 中間件→性能分析器打通（端點歸一化）
- P11-2: Prometheus 指標收集器
- P11-3: 異常→告警橋接器
- P11-4: 資源趨勢分析
- P11-5: 錯誤模式聚類
- P11-6: 運維 Dashboard API 結構
"""

import os
import sys
import time
import threading
import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).parent.parent))


# ==================== P11-1: 端點歸一化 ====================

class TestEndpointNormalization:
    """測試中間件的端點路徑歸一化"""

    def test_normalize_uuid(self):
        from api.middleware import _normalize_endpoint
        result = _normalize_endpoint('GET', '/api/v1/users/550e8400-e29b-41d4-a716-446655440000')
        assert ':id' in result
        assert '550e8400' not in result

    def test_normalize_numeric_id(self):
        from api.middleware import _normalize_endpoint
        result = _normalize_endpoint('DELETE', '/api/v1/backups/12345')
        assert ':id' in result
        assert '12345' not in result

    def test_normalize_hex_hash(self):
        from api.middleware import _normalize_endpoint
        result = _normalize_endpoint('GET', '/api/v1/accounts/abcdef1234567890')
        assert ':id' in result

    def test_preserves_static_paths(self):
        from api.middleware import _normalize_endpoint
        result = _normalize_endpoint('GET', '/api/v1/admin/users')
        assert result == 'GET /api/v1/admin/users'

    def test_includes_method(self):
        from api.middleware import _normalize_endpoint
        result = _normalize_endpoint('POST', '/api/v1/accounts')
        assert result.startswith('POST ')


# ==================== P11-2: Prometheus 指標收集器 ====================

class TestMetricsCollector:
    """測試 Prometheus 指標收集器"""

    def test_import(self):
        from core.metrics_exporter import MetricsCollector, get_metrics_collector
        assert MetricsCollector is not None
        assert get_metrics_collector is not None

    def test_singleton(self):
        from core.metrics_exporter import get_metrics_collector
        c1 = get_metrics_collector()
        c2 = get_metrics_collector()
        assert c1 is c2

    def test_observe_duration(self):
        from core.metrics_exporter import get_metrics_collector
        mc = get_metrics_collector()
        mc.observe_duration('GET /api/test', 150.0, 200)
        assert mc._endpoint_requests.get('GET /api/test', 0) > 0

    def test_observe_error(self):
        from core.metrics_exporter import get_metrics_collector
        mc = get_metrics_collector()
        old_errors = mc._counters.get('tgmatrix_http_errors_total', 0)
        mc.observe_duration('GET /api/fail', 50.0, 500)
        new_errors = mc._counters.get('tgmatrix_http_errors_total', 0)
        assert new_errors > old_errors

    def test_export_metrics_format(self):
        from core.metrics_exporter import get_metrics_collector
        mc = get_metrics_collector()
        mc.observe_duration('GET /api/format_test', 100.0, 200)
        output = mc.export_metrics()
        assert '# HELP' in output
        assert '# TYPE' in output
        assert 'tgmatrix_uptime_seconds' in output
        assert 'tgmatrix_http_requests_total' in output

    def test_inc_counter(self):
        from core.metrics_exporter import get_metrics_collector
        mc = get_metrics_collector()
        mc.inc_counter('test_counter', 5)
        assert mc._counters['test_counter'] >= 5

    def test_set_gauge(self):
        from core.metrics_exporter import get_metrics_collector
        mc = get_metrics_collector()
        mc.set_gauge('test_gauge', 42.5)
        assert mc._gauges['test_gauge'] == 42.5

    def test_thread_safety(self):
        """多線程同時寫入不應崩潰"""
        from core.metrics_exporter import get_metrics_collector
        mc = get_metrics_collector()
        errors = []

        def writer(n):
            try:
                for i in range(100):
                    mc.observe_duration(f'GET /thread/{n}', float(i), 200)
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=writer, args=(i,)) for i in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert len(errors) == 0


# ==================== P11-3: 異常→告警橋接 ====================

class TestAnomalyAlertBridge:
    """測試異常到告警的橋接"""

    def test_import(self):
        from core.observability_bridge import AnomalyAlertBridge, setup_anomaly_alert_bridge
        assert AnomalyAlertBridge is not None

    def test_suppress_duplicate_alerts(self):
        """同一異常在 30 分鐘內不應重複告警"""
        from core.observability_bridge import AnomalyAlertBridge

        # 模擬一個 anomaly
        mock_anomaly = MagicMock()
        mock_anomaly.metric_name = 'test_suppress'
        mock_anomaly.anomaly_type.value = 'spike'
        mock_anomaly.severity.value = 'medium'
        mock_anomaly.value = 100.0
        mock_anomaly.expected_value = 50.0
        mock_anomaly.deviation = 2.0
        mock_anomaly.detection_method.value = 'z_score'
        mock_anomaly.to_dict.return_value = {}

        # 清除之前的抑制記錄
        AnomalyAlertBridge._last_alerts.clear()

        # 第一次調用（會嘗試發送，雖然沒有事件循環）
        AnomalyAlertBridge.handle_anomaly(mock_anomaly)
        first_time = AnomalyAlertBridge._last_alerts.get('test_suppress:spike', 0)
        assert first_time > 0

        # 第二次調用（應被抑制）
        AnomalyAlertBridge.handle_anomaly(mock_anomaly)
        # 時間戳不應改變（被抑制了）
        assert AnomalyAlertBridge._last_alerts['test_suppress:spike'] == first_time

    def test_generate_suggestion(self):
        from core.observability_bridge import _generate_suggestion
        mock_anomaly = MagicMock()
        mock_anomaly.metric_name = 'api_latency'
        mock_anomaly.anomaly_type.value = 'spike'
        suggestion = _generate_suggestion(mock_anomaly)
        assert '數據庫' in suggestion or '緩存' in suggestion


# ==================== P11-4: 資源趨勢分析 ====================

class TestResourceAnalyzer:
    """測試資源趨勢分析"""

    def test_import(self):
        from core.observability_bridge import ResourceAnalyzer
        assert ResourceAnalyzer is not None

    def test_analyze_returns_correct_structure(self):
        from core.observability_bridge import ResourceAnalyzer
        result = ResourceAnalyzer.analyze_trends()
        assert 'cpu' in result
        assert 'memory' in result
        assert 'disk' in result
        assert 'request_load' in result
        assert 'suggestions' in result
        assert 'overall_risk' in result

    def test_risk_levels_valid(self):
        from core.observability_bridge import ResourceAnalyzer
        result = ResourceAnalyzer.analyze_trends()
        valid_risks = {'low', 'medium', 'high', 'critical'}
        assert result['overall_risk'] in valid_risks
        assert result['cpu']['risk'] in valid_risks

    def test_always_has_suggestions(self):
        from core.observability_bridge import ResourceAnalyzer
        result = ResourceAnalyzer.analyze_trends()
        assert len(result['suggestions']) > 0


# ==================== P11-5: 錯誤模式聚類 ====================

class TestErrorPatternCluster:
    """測試錯誤模式聚類"""

    def test_import(self):
        from core.observability_bridge import ErrorPatternCluster, get_error_cluster
        assert ErrorPatternCluster is not None

    def test_record_and_retrieve(self):
        from core.observability_bridge import get_error_cluster
        cluster = get_error_cluster()
        cluster.clear()

        cluster.record_error("Connection timeout to 192.168.1.1:5432")
        cluster.record_error("Connection timeout to 10.0.0.1:5432")
        cluster.record_error("Connection timeout to 172.16.0.1:5432")

        patterns = cluster.get_top_patterns(5)
        assert len(patterns) >= 1
        # 三條錯誤應歸一化到同一模式（IP 被替換）
        top = patterns[0]
        assert top['count'] == 3
        assert '<IP>' in top['pattern']

    def test_uuid_normalization(self):
        from core.observability_bridge import get_error_cluster
        cluster = get_error_cluster()
        cluster.clear()

        cluster.record_error("User 550e8400-e29b-41d4-a716-446655440000 not found")
        cluster.record_error("User a1b2c3d4-e5f6-7890-abcd-ef1234567890 not found")

        patterns = cluster.get_top_patterns(5)
        assert patterns[0]['count'] == 2
        assert '<UUID>' in patterns[0]['pattern']

    def test_max_patterns_limit(self):
        from core.observability_bridge import get_error_cluster
        cluster = get_error_cluster()
        cluster.clear()
        cluster._max_patterns = 5

        for i in range(10):
            cluster.record_error(f"Unique error type {i}: {i * 999}")

        assert len(cluster._patterns) <= 5

    def test_get_stats(self):
        from core.observability_bridge import get_error_cluster
        cluster = get_error_cluster()
        cluster.clear()
        cluster.record_error("test error")

        stats = cluster.get_stats()
        assert 'total_patterns' in stats
        assert 'total_errors' in stats
        assert stats['total_errors'] >= 1

    def test_recent_patterns(self):
        from core.observability_bridge import get_error_cluster
        cluster = get_error_cluster()
        cluster.clear()
        cluster.record_error("recent error")

        recent = cluster.get_recent_patterns(hours=1)
        assert len(recent) >= 1


# ==================== 文件結構驗證 ====================

class TestP11FileStructure:
    """驗證 P11 新增/修改的文件"""

    @pytest.fixture
    def project_root(self):
        return Path(__file__).parent.parent.parent

    def test_metrics_exporter_exists(self, project_root):
        assert (project_root / 'backend' / 'core' / 'metrics_exporter.py').exists()

    def test_observability_bridge_exists(self, project_root):
        assert (project_root / 'backend' / 'core' / 'observability_bridge.py').exists()

    def test_middleware_has_p11_functions(self, project_root):
        middleware_path = project_root / 'backend' / 'api' / 'middleware.py'
        content = middleware_path.read_text(encoding='utf-8')
        assert '_record_request_metrics' in content
        assert '_record_prometheus_metrics' in content
        assert '_normalize_endpoint' in content
        assert 'error_cluster' in content or 'get_error_cluster' in content
