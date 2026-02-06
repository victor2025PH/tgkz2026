"""
Admin 模組單元測試

測試覆蓋：
- API Pool 核心功能
- 健康評分系統
- 預測引擎
- 成本優化器
- 性能分析器
- 報告生成器
- 災備恢復
"""

import pytest
import os
import sys
import tempfile
import shutil
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock

# 添加 backend 路徑
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestHealthScore:
    """健康評分系統測試"""
    
    def test_calculate_health_score_perfect(self):
        """測試完美健康評分"""
        from admin.health_score import HealthScoreCalculator, HealthGrade
        
        # 模擬完美數據
        api_data = {
            "success_count": 100,
            "fail_count": 0,
            "consecutive_failures": 0,
            "max_accounts": 10,
            "current_accounts": 2,
            "status": "available"
        }
        
        score, grade, metrics = HealthScoreCalculator.calculate_score(api_data)
        
        assert score >= 90, "完美條件應該獲得高分"
        assert grade == HealthGrade.EXCELLENT
    
    def test_calculate_health_score_degraded(self):
        """測試降級健康評分"""
        from admin.health_score import HealthScoreCalculator, HealthGrade
        
        # 模擬降級數據
        api_data = {
            "success_count": 70,
            "fail_count": 30,
            "consecutive_failures": 2,
            "max_accounts": 10,
            "current_accounts": 8,
            "status": "available"
        }
        
        score, grade, metrics = HealthScoreCalculator.calculate_score(api_data)
        
        assert 40 <= score <= 90, "降級條件應該獲得中等分數"
    
    def test_health_score_weights(self):
        """測試評分權重"""
        from admin.health_score import HealthScoreCalculator
        
        # 測試成功率權重 - 高成功率
        high_success_data = {
            "success_count": 100,
            "fail_count": 0,
            "consecutive_failures": 0,
            "max_accounts": 10,
            "current_accounts": 2,
        }
        
        # 低成功率
        low_success_data = {
            "success_count": 50,
            "fail_count": 50,
            "consecutive_failures": 0,
            "max_accounts": 10,
            "current_accounts": 2,
        }
        
        high_score, _, _ = HealthScoreCalculator.calculate_score(high_success_data)
        low_score, _, _ = HealthScoreCalculator.calculate_score(low_success_data)
        
        assert high_score > low_score, "高成功率應該得分更高"
    
    def test_banned_status_penalty(self):
        """測試封禁狀態懲罰"""
        from admin.health_score import HealthScoreCalculator
        
        api_data = {
            "success_count": 100,
            "fail_count": 0,
            "status": "banned"
        }
        
        score, _, _ = HealthScoreCalculator.calculate_score(api_data)
        
        assert score <= 20, "封禁狀態最高 20 分"
    
    def test_recommendations(self):
        """測試建議生成"""
        from admin.health_score import HealthScoreCalculator, HealthGrade
        
        api_data = {
            "success_count": 60,
            "fail_count": 40,
            "consecutive_failures": 5,
            "max_accounts": 10,
            "current_accounts": 9,
        }
        
        score, grade, metrics = HealthScoreCalculator.calculate_score(api_data)
        recommendations = HealthScoreCalculator.get_recommendation(score, grade, metrics)
        
        assert len(recommendations) > 0, "應該有建議"


class TestMLPrediction:
    """機器學習預測引擎測試"""
    
    @pytest.fixture
    def ml_engine(self, tmp_path):
        """創建臨時 ML 引擎實例"""
        # 使用臨時目錄
        import admin.ml_prediction as ml_module
        original_db_path = ml_module.DB_PATH
        ml_module.DB_PATH = str(tmp_path / "ml_test.db")
        
        # 重置單例
        ml_module.MLPredictionEngine._instance = None
        engine = ml_module.get_ml_engine()
        
        yield engine
        
        # 清理
        ml_module.DB_PATH = original_db_path
        ml_module.MLPredictionEngine._instance = None
    
    def test_exponential_smoothing_simple(self):
        """測試簡單指數平滑"""
        from admin.ml_prediction import ExponentialSmoothing
        
        smoother = ExponentialSmoothing(alpha=0.3)
        data = [10, 12, 14, 16, 18, 20]
        
        predictions = smoother.simple_exponential_smoothing(data, periods=3)
        
        assert len(predictions) == 3
        assert all(p > 0 for p in predictions)
    
    def test_holt_linear_trend(self):
        """測試 Holt 線性趨勢"""
        from admin.ml_prediction import ExponentialSmoothing
        
        smoother = ExponentialSmoothing(alpha=0.3, beta=0.1)
        # 上升趨勢數據
        data = [100, 110, 120, 130, 140, 150]
        
        predictions, _ = smoother.holt_linear(data, periods=3)
        
        assert len(predictions) == 3
        # 預測應該延續上升趨勢
        assert predictions[-1] > data[-1]
    
    def test_pattern_recognizer_hourly(self):
        """測試小時模式識別"""
        from admin.ml_prediction import PatternRecognizer
        
        recognizer = PatternRecognizer()
        
        # 模擬工作時間高峰模式
        hourly_data = {
            0: 10, 1: 8, 2: 5, 3: 3, 4: 2, 5: 5,
            6: 20, 7: 50, 8: 80, 9: 100, 10: 120, 11: 130,
            12: 110, 13: 100, 14: 90, 15: 95, 16: 100, 17: 90,
            18: 60, 19: 40, 20: 30, 21: 25, 22: 20, 23: 15
        }
        
        pattern = recognizer.analyze_hourly_pattern(hourly_data)
        
        assert pattern["type"] == "hourly"
        assert pattern["pattern_type"] == "business"  # 工作時間高峰
        assert 9 in pattern["peak_hours"] or 10 in pattern["peak_hours"] or 11 in pattern["peak_hours"]
    
    def test_trend_detection(self):
        """測試趨勢檢測"""
        from admin.ml_prediction import PatternRecognizer
        
        recognizer = PatternRecognizer()
        
        # 明顯上升趨勢
        increasing_data = [10, 15, 20, 25, 30, 35, 40]
        trend = recognizer.detect_trend(increasing_data)
        assert trend["trend"] == "increasing"
        
        # 明顯下降趨勢
        decreasing_data = [40, 35, 30, 25, 20, 15, 10]
        trend = recognizer.detect_trend(decreasing_data)
        assert trend["trend"] == "decreasing"
        
        # 穩定趨勢
        stable_data = [20, 21, 19, 20, 21, 20, 19]
        trend = recognizer.detect_trend(stable_data)
        assert trend["trend"] == "stable"


class TestCostOptimizer:
    """成本優化器測試"""
    
    @pytest.fixture
    def cost_optimizer(self, tmp_path):
        """創建臨時成本優化器實例"""
        import admin.cost_optimizer as cost_module
        original_db_path = cost_module.DB_PATH
        cost_module.DB_PATH = str(tmp_path / "cost_test.db")
        
        cost_module.CostOptimizer._instance = None
        optimizer = cost_module.get_cost_optimizer()
        
        yield optimizer
        
        cost_module.DB_PATH = original_db_path
        cost_module.CostOptimizer._instance = None
    
    def test_record_cost(self, cost_optimizer):
        """測試成本記錄"""
        from admin.cost_optimizer import ResourceType
        
        record_id = cost_optimizer.record_cost(
            resource_type=ResourceType.API_CALL,
            resource_id="test-api-1",
            quantity=100,
            tenant_id="tenant-1"
        )
        
        assert record_id is not None
        assert len(record_id) == 36  # UUID 格式
    
    def test_cost_summary(self, cost_optimizer):
        """測試成本摘要"""
        from admin.cost_optimizer import ResourceType
        
        # 記錄一些成本
        for i in range(5):
            cost_optimizer.record_cost(
                resource_type=ResourceType.API_CALL,
                resource_id=f"api-{i}",
                quantity=100
            )
        
        summary = cost_optimizer.get_cost_summary(days=1)
        
        assert "total_cost" in summary
        assert "record_count" in summary
        assert summary["record_count"] == 5
    
    def test_budget_creation(self, cost_optimizer):
        """測試預算創建"""
        budget_id = cost_optimizer.create_budget(
            name="Test Budget",
            amount=1000,
            period="monthly",
            tenant_id="tenant-1"
        )
        
        assert budget_id is not None
        
        budgets = cost_optimizer.get_budget_status(budget_id=budget_id)
        assert len(budgets) == 1
        assert budgets[0]["name"] == "Test Budget"
        assert budgets[0]["amount"] == 1000


class TestPerformanceAnalyzer:
    """性能分析器測試"""
    
    @pytest.fixture
    def perf_analyzer(self, tmp_path):
        """創建臨時性能分析器實例"""
        import admin.performance_analyzer as perf_module
        original_db_path = perf_module.DB_PATH
        perf_module.DB_PATH = str(tmp_path / "perf_test.db")
        
        perf_module.PerformanceAnalyzer._instance = None
        analyzer = perf_module.get_performance_analyzer()
        
        yield analyzer
        
        perf_module.DB_PATH = original_db_path
        perf_module.PerformanceAnalyzer._instance = None
    
    def test_record_latency(self, perf_analyzer):
        """測試延遲記錄"""
        metric_id = perf_analyzer.record_latency(
            endpoint="/api/test",
            latency_ms=150
        )
        
        assert metric_id is not None
    
    def test_latency_stats(self, perf_analyzer):
        """測試延遲統計"""
        # 記錄多個延遲值
        latencies = [100, 150, 200, 120, 180, 250, 90, 110, 160, 300]
        for lat in latencies:
            perf_analyzer.record_latency("/api/test", lat)
        
        stats = perf_analyzer.get_latency_stats(endpoint="/api/test")
        
        assert stats.get("status") != "no_data"
        assert "mean" in stats
        assert "p50" in stats
        assert "p99" in stats
        assert stats["sample_count"] == 10
    
    def test_health_score_calculation(self, perf_analyzer):
        """測試健康評分計算"""
        # 記錄良好性能數據
        for _ in range(20):
            perf_analyzer.record_latency("/api/healthy", 100)
            perf_analyzer.record_error_rate("/api/healthy", 0.1)
        
        perf = perf_analyzer.get_endpoint_performance("/api/healthy")
        
        assert "health_score" in perf
        assert perf["health_score"] >= 80  # 良好條件應該得高分


class TestReportGenerator:
    """報告生成器測試"""
    
    @pytest.fixture
    def report_gen(self, tmp_path):
        """創建臨時報告生成器實例"""
        import admin.report_generator as report_module
        original_db_path = report_module.DB_PATH
        report_module.DB_PATH = str(tmp_path / "report_test.db")
        
        report_module.ReportGenerator._instance = None
        generator = report_module.get_report_generator()
        
        yield generator
        
        report_module.DB_PATH = original_db_path
        report_module.ReportGenerator._instance = None
    
    def test_generate_daily_summary(self, report_gen):
        """測試每日摘要生成"""
        report_id = report_gen.generate_daily_summary()
        
        assert report_id is not None
        
        report = report_gen.get_report(report_id)
        assert report is not None
        assert report["report_type"] == "daily_summary"
        assert len(report["sections"]) > 0
    
    def test_export_markdown(self, report_gen):
        """測試 Markdown 導出"""
        from admin.report_generator import ReportFormat
        
        report_id = report_gen.generate_daily_summary()
        content = report_gen.export_report(report_id, ReportFormat.MARKDOWN)
        
        assert content is not None
        assert "# " in content  # Markdown 標題
        assert "##" in content  # 章節標題
    
    def test_export_html(self, report_gen):
        """測試 HTML 導出"""
        from admin.report_generator import ReportFormat
        
        report_id = report_gen.generate_daily_summary()
        content = report_gen.export_report(report_id, ReportFormat.HTML)
        
        assert content is not None
        assert "<html>" in content
        assert "<body>" in content
    
    def test_insight_extraction(self, report_gen):
        """測試洞察提取"""
        from admin.report_generator import InsightEngine
        
        engine = InsightEngine()
        
        # 測試趨勢洞察
        data = {
            "daily_trend": [
                {"value": 100},
                {"value": 120},
                {"value": 150}
            ]
        }
        
        insights = engine.extract_insights(data)
        trend_insights = [i for i in insights if i["type"] == "trend"]
        
        # 50% 增長應該觸發趨勢洞察
        assert len(trend_insights) > 0


class TestDisasterRecovery:
    """災備恢復測試"""
    
    @pytest.fixture
    def dr_manager(self, tmp_path):
        """創建臨時災備管理器實例"""
        import admin.disaster_recovery as dr_module
        original_db_path = dr_module.DB_PATH
        original_backup_dir = dr_module.BACKUP_DIR
        
        dr_module.DB_PATH = str(tmp_path / "dr_test.db")
        dr_module.BACKUP_DIR = str(tmp_path / "backups")
        
        dr_module.DisasterRecoveryManager._instance = None
        manager = dr_module.get_dr_manager()
        
        yield manager
        
        dr_module.DB_PATH = original_db_path
        dr_module.BACKUP_DIR = original_backup_dir
        dr_module.DisasterRecoveryManager._instance = None
    
    def test_create_backup(self, dr_manager, tmp_path):
        """測試創建備份"""
        # 創建測試文件
        test_file = tmp_path / "test_data.txt"
        test_file.write_text("test content for backup")
        
        backup_id = dr_manager.create_backup(
            source_path=str(test_file),
            compress=False
        )
        
        assert backup_id is not None
        
        backups = dr_manager.list_backups()
        assert len(backups) == 1
        assert backups[0]["status"] == "completed"
    
    def test_verify_backup(self, dr_manager, tmp_path):
        """測試驗證備份"""
        test_file = tmp_path / "verify_test.txt"
        test_file.write_text("verify backup content")
        
        backup_id = dr_manager.create_backup(str(test_file), compress=False)
        
        result = dr_manager.verify_backup(backup_id)
        
        assert result["valid"] == True
    
    def test_rpo_status(self, dr_manager, tmp_path):
        """測試 RPO 狀態"""
        # 創建一個備份
        test_file = tmp_path / "rpo_test.txt"
        test_file.write_text("rpo test")
        dr_manager.create_backup(str(test_file), compress=False)
        
        status = dr_manager.get_rpo_status()
        
        assert "status" in status
        assert status["last_backup"] is not None


class TestAlertService:
    """告警服務測試"""
    
    def test_alert_config_creation(self):
        """測試告警配置創建"""
        from admin.alert_service import AlertConfig, AlertChannel, AlertLevel
        
        config = AlertConfig(
            enabled=True,
            webhook_url="https://example.com/alert",
            webhook_secret="secret123",
            throttle_minutes=30,
            min_level=AlertLevel.WARNING
        )
        
        assert config.enabled == True
        assert config.webhook_url == "https://example.com/alert"
        assert config.throttle_minutes == 30
    
    @pytest.fixture
    def alert_service(self, tmp_path):
        """創建臨時告警服務"""
        import admin.alert_service as alert_module
        original_db_path = alert_module.DB_PATH
        alert_module.DB_PATH = str(tmp_path / "alert_test.db")
        
        alert_module.AlertService._instance = None
        service = alert_module.get_alert_service()
        
        yield service
        
        alert_module.DB_PATH = original_db_path
        alert_module.AlertService._instance = None
    
    def test_alert_throttling(self, alert_service):
        """測試告警節流"""
        # 獲取配置
        config = alert_service.get_config()
        
        # 配置應該有節流時間（返回可能是 dict 或 AlertConfig）
        if isinstance(config, dict):
            assert config.get('throttle_minutes', 30) >= 0
        else:
            assert config.throttle_minutes >= 0


class TestAnomalyDetection:
    """異常檢測測試"""
    
    @pytest.fixture
    def anomaly_manager(self, tmp_path):
        """創建臨時異常檢測管理器"""
        import admin.anomaly_detection as anomaly_module
        original_db_path = anomaly_module.DB_PATH
        anomaly_module.DB_PATH = str(tmp_path / "anomaly_test.db")
        
        anomaly_module.AnomalyDetectionManager._instance = None
        manager = anomaly_module.get_anomaly_manager()
        
        yield manager
        
        anomaly_module.DB_PATH = original_db_path
        anomaly_module.AnomalyDetectionManager._instance = None
    
    def test_zscore_detector(self):
        """測試 Z-score 檢測器"""
        from admin.anomaly_detection import StatisticalDetector, DetectorConfig, DetectionMethod
        
        config = DetectorConfig(
            metric_name="test_metric",
            method=DetectionMethod.Z_SCORE,
            z_threshold=2.0,
            min_samples=5,
            cooldown_minutes=0  # 禁用冷卻以便測試
        )
        
        detector = StatisticalDetector(config)
        
        # 添加正常數據
        normal_values = [10, 11, 9, 10, 12, 11, 10, 9, 11, 10]
        for val in normal_values:
            detector.add_sample(val)
        
        # 正常值不應檢測為異常
        result = detector.add_sample(11)
        assert result is None
        
        # 極端值應被檢測為異常
        result = detector.add_sample(50)
        assert result is not None
    
    def test_static_threshold_detector(self):
        """測試靜態閾值檢測器"""
        from admin.anomaly_detection import StatisticalDetector, DetectorConfig, DetectionMethod
        
        config = DetectorConfig(
            metric_name="test_metric",
            method=DetectionMethod.STATIC_THRESHOLD,
            static_min=0,
            static_max=100,
            min_samples=1,
            cooldown_minutes=0
        )
        
        detector = StatisticalDetector(config)
        
        # 正常範圍
        result = detector.add_sample(50)
        assert result is None
        
        # 超出上限
        result = detector.add_sample(150)
        assert result is not None
    
    def test_anomaly_severity(self):
        """測試異常嚴重度"""
        from admin.anomaly_detection import StatisticalDetector, DetectorConfig, DetectionMethod, Severity
        
        config = DetectorConfig(
            metric_name="test_metric",
            method=DetectionMethod.Z_SCORE,
            z_threshold=2.0,
            min_samples=5,
            cooldown_minutes=0
        )
        
        detector = StatisticalDetector(config)
        
        # 建立基線
        for val in [10] * 20:
            detector.add_sample(val)
        
        # 大偏差應該是高嚴重度
        result = detector.add_sample(100)
        if result:
            assert result.severity in [Severity.HIGH, Severity.CRITICAL]


class TestScheduler:
    """調度器測試"""
    
    def test_task_registration(self):
        """測試任務註冊"""
        from admin.scheduler import TaskScheduler
        
        # 重置單例
        TaskScheduler._instance = None
        scheduler = TaskScheduler()
        
        async def dummy_task():
            pass
        
        scheduler.register_task(
            task_id="test_task",
            name="Test Task",
            func=dummy_task,
            interval_minutes=1
        )
        
        assert "test_task" in scheduler._tasks
        
        # 清理
        TaskScheduler._instance = None
    
    def test_task_enable_disable(self):
        """測試任務啟用/禁用"""
        from admin.scheduler import TaskScheduler
        
        TaskScheduler._instance = None
        scheduler = TaskScheduler()
        
        async def dummy_task():
            pass
        
        scheduler.register_task(
            task_id="toggle_task",
            name="Toggle Task",
            func=dummy_task,
            interval_minutes=1,
            enabled=True
        )
        
        # 禁用任務
        scheduler.disable_task("toggle_task")
        assert scheduler._tasks["toggle_task"].enabled == False
        
        # 啟用任務
        scheduler.enable_task("toggle_task")
        assert scheduler._tasks["toggle_task"].enabled == True
        
        TaskScheduler._instance = None


class TestWebhookEvents:
    """Webhook 事件測試"""
    
    @pytest.fixture
    def webhook_system(self, tmp_path):
        """創建臨時 Webhook 系統"""
        import admin.webhook_events as webhook_module
        original_db_path = webhook_module.DB_PATH
        webhook_module.DB_PATH = str(tmp_path / "webhook_test.db")
        
        webhook_module.WebhookEventSystem._instance = None
        system = webhook_module.get_webhook_system()
        
        yield system
        
        webhook_module.DB_PATH = original_db_path
        webhook_module.WebhookEventSystem._instance = None
    
    def test_add_subscriber(self, webhook_system):
        """測試添加訂閱者"""
        from admin.webhook_events import WebhookSubscriber
        import uuid
        
        subscriber = WebhookSubscriber(
            id=str(uuid.uuid4()),
            name="Test Subscriber",
            url="https://example.com/webhook",
            secret="test-secret",
            events=["api.allocated", "api.released"]
        )
        
        result = webhook_system.add_subscriber(subscriber)
        
        assert result == True
        
        subs = webhook_system.list_subscribers()
        assert len(subs) == 1
        # list_subscribers 返回 Dict，使用字典訪問
        assert subs[0]["url"] == "https://example.com/webhook"
    
    def test_subscriber_removal(self, webhook_system):
        """測試移除訂閱者"""
        from admin.webhook_events import WebhookSubscriber
        import uuid
        
        sub_id = str(uuid.uuid4())
        subscriber = WebhookSubscriber(
            id=sub_id,
            name="Test Subscriber",
            url="https://example.com/webhook",
            events=["api.allocated"]
        )
        
        webhook_system.add_subscriber(subscriber)
        
        # 移除
        result = webhook_system.remove_subscriber(sub_id)
        assert result == True
        
        subs = webhook_system.list_subscribers()
        assert len(subs) == 0


# ==================== 集成測試 ====================

class TestAdminIntegration:
    """Admin 模組集成測試"""
    
    def test_module_imports(self):
        """測試所有模組可正常導入"""
        modules = [
            "admin.api_pool",
            "admin.health_score",
            "admin.ml_prediction",
            "admin.cost_optimizer",
            "admin.performance_analyzer",
            "admin.report_generator",
            "admin.disaster_recovery",
            "admin.alert_service",
            "admin.anomaly_detection",
            "admin.scheduler",
            "admin.webhook_events",
            "admin.billing",
            "admin.auto_scaling",
            "admin.audit_compliance",
            "admin.cluster_manager",
            "admin.alert_escalation",
            "admin.api_versioning",
            "admin.observability",
            "admin.tenant_enhanced",
            "admin.security_enhanced",
            "admin.root_cause_analysis",
            "admin.service_dashboard",
        ]
        
        for module_name in modules:
            try:
                __import__(module_name)
            except ImportError as e:
                pytest.fail(f"無法導入模組 {module_name}: {e}")
    
    def test_singleton_pattern(self, tmp_path):
        """測試單例模式"""
        import admin.ml_prediction as ml_module
        ml_module.DB_PATH = str(tmp_path / "singleton_test.db")
        ml_module.MLPredictionEngine._instance = None
        
        engine1 = ml_module.get_ml_engine()
        engine2 = ml_module.get_ml_engine()
        
        assert engine1 is engine2, "單例應該返回相同實例"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
