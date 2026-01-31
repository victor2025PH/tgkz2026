"""
TG-Matrix Phase A 測試套件
測試 Phase A 實施的所有核心組件

測試覆蓋：
1. 錯誤代碼體系
2. 備份服務
3. 監控系統
4. 消息可靠性
"""

import sys
import os
import asyncio
import tempfile
import shutil
from datetime import datetime, timedelta
from pathlib import Path

# 設置路徑
sys.path.insert(0, str(Path(__file__).parent.parent))

# 設置 UTF-8 編碼（Windows）
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')


def test_error_codes():
    """測試錯誤代碼體系"""
    print("\n=== 測試錯誤代碼體系 ===")
    
    from core.error_codes import (
        ErrorCode, 
        get_error_info, 
        create_error_response,
        ERROR_INFO_MAP
    )
    
    # 測試錯誤代碼枚舉
    assert ErrorCode.ACCOUNT_LOGIN_FAILED.value == 1001
    assert ErrorCode.MESSAGE_SEND_FAILED.value == 2001
    assert ErrorCode.AI_MODEL_UNAVAILABLE.value == 4001
    print("  [OK] 錯誤代碼枚舉定義正確")
    
    # 測試獲取錯誤信息
    info = get_error_info(ErrorCode.ACCOUNT_CODE_EXPIRED)
    assert info is not None
    assert info.code == ErrorCode.ACCOUNT_CODE_EXPIRED
    assert info.message == "驗證碼已過期"
    assert info.retryable == True
    print("  [OK] 獲取錯誤信息正確")
    
    # 測試創建錯誤響應
    response = create_error_response(ErrorCode.ACCOUNT_API_INVALID, "API Hash 格式錯誤")
    assert response["success"] == False
    assert response["error"]["code"] == 1301
    assert "suggestion" in response["error"]
    print("  [OK] 創建錯誤響應正確")
    
    # 測試錯誤信息映射表覆蓋
    mapped_count = len(ERROR_INFO_MAP)
    assert mapped_count >= 30, f"錯誤信息映射不足: {mapped_count}"
    print(f"  [OK] 錯誤信息映射表包含 {mapped_count} 個錯誤")
    
    print("=== 錯誤代碼體系測試通過 ===")
    return True


def test_backup_service():
    """測試備份服務"""
    print("\n=== 測試備份服務 ===")
    
    from core.backup_service import (
        BackupService,
        BackupConfig,
        BackupType,
        BackupStatus
    )
    
    # 創建臨時目錄
    temp_dir = tempfile.mkdtemp()
    backup_dir = os.path.join(temp_dir, "backups")
    db_path = os.path.join(temp_dir, "test.db")
    
    try:
        # 創建測試數據庫
        import sqlite3
        conn = sqlite3.connect(db_path)
        conn.execute("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)")
        conn.execute("INSERT INTO test (name) VALUES ('test1')")
        conn.execute("INSERT INTO test (name) VALUES ('test2')")
        conn.commit()
        conn.close()
        
        # 初始化備份服務
        config = BackupConfig(
            backup_dir=backup_dir,
            compress=True,
            verify_backup=True
        )
        service = BackupService([db_path], config)
        print("  [OK] 備份服務初始化成功")
        
        # 測試創建備份
        async def run_backup():
            record = await service.create_backup(BackupType.FULL)
            return record
        
        record = asyncio.run(run_backup())
        assert record is not None
        assert record.status in (BackupStatus.COMPLETED, BackupStatus.VERIFIED)
        assert record.file_path is not None
        assert os.path.exists(record.file_path)
        print(f"  [OK] 備份創建成功: {record.file_size} bytes")
        
        # 測試備份狀態
        status = service.get_backup_status()
        assert status["total_backups"] >= 1
        print(f"  [OK] 備份狀態獲取成功: {status['total_backups']} 個備份")
        
        # 測試備份恢復
        restore_path = os.path.join(temp_dir, "restored.db")
        
        async def run_restore():
            success, msg = await service.restore_backup(record.id, restore_path)
            return success, msg
        
        success, msg = asyncio.run(run_restore())
        assert success, f"恢復失敗: {msg}"
        assert os.path.exists(restore_path)
        
        # 驗證恢復的數據
        conn = sqlite3.connect(restore_path)
        cursor = conn.execute("SELECT COUNT(*) FROM test")
        count = cursor.fetchone()[0]
        conn.close()
        assert count == 2, f"數據不完整: {count}"
        print("  [OK] 備份恢復成功，數據完整")
        
    finally:
        # 清理
        shutil.rmtree(temp_dir, ignore_errors=True)
    
    print("=== 備份服務測試通過 ===")
    return True


def test_monitoring_service():
    """測試監控服務"""
    print("\n=== 測試監控服務 ===")
    
    from core.metrics import (
        MetricsCollector,
        HealthChecker,
        AlertManager,
        AlertRule,
        AlertSeverity,
        HealthCheck,
        HealthStatus,
        MonitoringService,
        init_monitoring,
        get_monitoring
    )
    
    # 測試指標收集器
    collector = MetricsCollector()
    
    # 測試計數器
    collector.increment("test.counter", 1)
    collector.increment("test.counter", 2)
    assert collector.get_counter("test.counter") == 3
    print("  [OK] 計數器功能正常")
    
    # 測試即時值
    collector.gauge("test.gauge", 42.5)
    assert collector.get_gauge("test.gauge") == 42.5
    print("  [OK] 即時值功能正常")
    
    # 測試分佈統計
    for i in range(100):
        collector.histogram("test.histogram", i)
    
    stats = collector.get_histogram_stats("test.histogram")
    assert stats["count"] == 100
    assert stats["min"] == 0
    assert stats["max"] == 99
    assert 45 <= stats["avg"] <= 55  # 約 49.5
    print("  [OK] 分佈統計功能正常")
    
    # 測試計時器
    with collector.timer("test.timer"):
        import time
        time.sleep(0.01)
    
    timer_stats = collector.get_histogram_stats("test.timer")
    assert timer_stats["count"] == 1
    assert timer_stats["min"] >= 10  # 至少 10ms
    print("  [OK] 計時器功能正常")
    
    # 測試告警管理器
    alert_manager = AlertManager(collector)
    
    alert_manager.add_rule(AlertRule(
        name="test_high_value",
        metric_name="test.gauge",
        condition=">=",
        threshold=40,
        severity=AlertSeverity.WARNING,
        message_template="Value too high: {value}"
    ))
    
    async def check_alerts():
        await alert_manager.check_alerts()
    
    asyncio.run(check_alerts())
    
    active_alerts = alert_manager.get_active_alerts()
    assert len(active_alerts) >= 1
    assert active_alerts[0].severity == AlertSeverity.WARNING
    print("  [OK] 告警管理器功能正常")
    
    # 測試健康檢查器
    health_checker = HealthChecker()
    
    async def healthy_check():
        return HealthCheck(
            name="test_service",
            status=HealthStatus.HEALTHY,
            message="Service is healthy"
        )
    
    async def degraded_check():
        return HealthCheck(
            name="slow_service",
            status=HealthStatus.DEGRADED,
            message="Service is slow"
        )
    
    health_checker.register("test_service", healthy_check)
    health_checker.register("slow_service", degraded_check)
    
    async def run_health_checks():
        return await health_checker.run_all()
    
    results = asyncio.run(run_health_checks())
    assert len(results) == 2
    assert results["test_service"].status == HealthStatus.HEALTHY
    assert results["slow_service"].status == HealthStatus.DEGRADED
    
    overall = health_checker.get_overall_status(results)
    assert overall == HealthStatus.DEGRADED
    print("  [OK] 健康檢查器功能正常")
    
    # 測試監控服務初始化
    monitoring = init_monitoring()
    assert monitoring is not None
    assert get_monitoring() is monitoring
    print("  [OK] 監控服務初始化成功")
    
    print("=== 監控服務測試通過 ===")
    return True


def test_message_reliability():
    """測試消息可靠性"""
    print("\n=== 測試消息可靠性 ===")
    
    from core.message_reliability import (
        MessageStatus,
        MessagePriority,
        ReliableMessage,
        RetryStrategy,
        MessageStateMachine,
        MessageReliabilityService,
        init_message_reliability
    )
    
    # 測試重試策略
    strategy = RetryStrategy(
        max_retries=3,
        base_delay_seconds=5,
        exponential_base=2,
        jitter=False
    )
    
    assert strategy.should_retry(0) == True
    assert strategy.should_retry(2) == True
    assert strategy.should_retry(3) == False
    print("  [OK] 重試策略判斷正確")
    
    # 測試延遲計算
    delay0 = strategy.get_next_retry_delay(0)
    delay1 = strategy.get_next_retry_delay(1)
    delay2 = strategy.get_next_retry_delay(2)
    
    assert delay0 == 5  # 5 * 2^0 = 5
    assert delay1 == 10  # 5 * 2^1 = 10
    assert delay2 == 20  # 5 * 2^2 = 20
    print(f"  [OK] 重試延遲計算正確: {delay0}s -> {delay1}s -> {delay2}s")
    
    # 測試狀態機
    message = ReliableMessage(
        id="test-msg-1",
        content="Hello",
        recipient_id="user123"
    )
    
    assert message.status == MessageStatus.CREATED
    
    # 測試有效轉換
    assert MessageStateMachine.can_transition(MessageStatus.CREATED, MessageStatus.PENDING)
    assert MessageStateMachine.transition(message, MessageStatus.PENDING)
    assert message.status == MessageStatus.PENDING
    assert len(message.status_history) == 1
    print("  [OK] 狀態機有效轉換正確")
    
    # 測試無效轉換
    assert not MessageStateMachine.can_transition(MessageStatus.PENDING, MessageStatus.READ)
    assert not MessageStateMachine.transition(message, MessageStatus.READ)
    assert message.status == MessageStatus.PENDING  # 狀態未變
    print("  [OK] 狀態機無效轉換被阻止")
    
    # 測試消息可靠性服務
    async def test_service():
        service = MessageReliabilityService()
        
        # 設置模擬發送函數
        send_count = [0]
        
        async def mock_send(msg):
            send_count[0] += 1
            return send_count[0] > 1  # 第一次失敗，第二次成功
        
        service.set_send_function(mock_send)
        
        # 創建消息
        msg = await service.create_message(
            content="Test message",
            recipient_id="user456",
            priority=MessagePriority.HIGH
        )
        
        assert msg.id is not None
        assert msg.priority == MessagePriority.HIGH
        
        # 入隊
        assert await service.enqueue(msg)
        assert msg.status == MessageStatus.PENDING
        
        # 發送（第一次失敗）
        result = await service.send(msg)
        # 由於 mock 第一次返回 False，會進入 FAILED 狀態
        assert msg.status in (MessageStatus.FAILED, MessageStatus.RETRYING)
        
        return True
    
    asyncio.run(test_service())
    print("  [OK] 消息可靠性服務功能正常")
    
    # 測試全局初始化
    service = init_message_reliability()
    assert service is not None
    print("  [OK] 消息可靠性服務初始化成功")
    
    print("=== 消息可靠性測試通過 ===")
    return True


def test_all():
    """運行所有測試"""
    print("=" * 60)
    print("TG-Matrix Phase A 測試套件")
    print("=" * 60)
    
    tests = [
        ("錯誤代碼體系", test_error_codes),
        ("備份服務", test_backup_service),
        ("監控服務", test_monitoring_service),
        ("消息可靠性", test_message_reliability),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        try:
            if test_func():
                passed += 1
            else:
                failed += 1
                print(f"[FAILED] {name}")
        except Exception as e:
            failed += 1
            print(f"[ERROR] {name}: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 60)
    print(f"測試結果: {passed} 通過, {failed} 失敗")
    print("=" * 60)
    
    return failed == 0


if __name__ == "__main__":
    success = test_all()
    sys.exit(0 if success else 1)
