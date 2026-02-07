"""
🔧 P11-3: 可觀測性橋接器

打通三大子系統：
  AnomalyDetectionManager → AlertService → NotificationLog

當異常檢測發現問題時，自動：
1. 將 Anomaly 轉換為 AlertService 的 send_alert 調用
2. 根據嚴重程度決定告警級別
3. 應用告警抑制規則（防止相同問題重複告警）
4. 記錄到告警歷史

🔧 P11-4: 資源趨勢分析 + 擴縮容建議
基於 PerformanceAnalyzer 的歷史指標生成建議

🔧 P11-5: 日誌異常模式聚類
基於錯誤日誌的自動分組與去重
"""

import asyncio
import logging
import time
import threading
from typing import Dict, Any, List, Optional
from collections import defaultdict
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


# ==================== P11-3: 異常→告警橋接 ====================

class AnomalyAlertBridge:
    """
    將 AnomalyDetectionManager 的異常事件橋接到 AlertService
    
    嚴重程度映射：
      critical → AlertLevel.CRITICAL
      high     → AlertLevel.CRITICAL
      medium   → AlertLevel.WARNING
      low      → AlertLevel.INFO
    """
    
    # 最近告警抑制（同一指標 + 同一類型，30 分鐘內不重複告警）
    _suppress_window_seconds = 1800  # 30 分鐘
    _last_alerts: Dict[str, float] = {}
    _lock = threading.Lock()
    
    @classmethod
    def handle_anomaly(cls, anomaly) -> None:
        """
        異常處理回調（同步，由 AnomalyDetectionManager 調用）
        
        內部啟動異步任務發送告警
        """
        try:
            # 抑制檢查
            suppress_key = f"{anomaly.metric_name}:{anomaly.anomaly_type.value}"
            now = time.time()
            
            with cls._lock:
                last_time = cls._last_alerts.get(suppress_key, 0)
                if now - last_time < cls._suppress_window_seconds:
                    return  # 抑制重複告警
                cls._last_alerts[suppress_key] = now
            
            # 映射嚴重程度
            severity = anomaly.severity.value if hasattr(anomaly.severity, 'value') else str(anomaly.severity)
            
            from admin.alert_service import AlertLevel
            level_map = {
                'critical': AlertLevel.CRITICAL,
                'high': AlertLevel.CRITICAL,
                'medium': AlertLevel.WARNING,
                'low': AlertLevel.INFO,
            }
            alert_level = level_map.get(severity, AlertLevel.WARNING)
            
            # 構建告警內容
            alert_type = f"anomaly.{anomaly.metric_name}"
            message = (
                f"[{severity.upper()}] 指標 {anomaly.metric_name} 異常\n"
                f"類型: {anomaly.anomaly_type.value}\n"
                f"當前值: {anomaly.value:.2f}  期望值: {anomaly.expected_value:.2f}\n"
                f"偏差: {anomaly.deviation:.2f}\n"
                f"檢測方法: {anomaly.detection_method.value}"
            )
            
            details = anomaly.to_dict() if hasattr(anomaly, 'to_dict') else {
                'metric': anomaly.metric_name,
                'value': anomaly.value,
                'severity': severity,
            }
            
            suggestion = _generate_suggestion(anomaly)
            
            # 異步發送告警（在事件循環中）
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(_async_send_alert(alert_type, message, alert_level, details, suggestion))
            except RuntimeError:
                # 沒有運行中的事件循環，跳過異步告警
                logger.warning(f"[AnomalyAlertBridge] No event loop, alert skipped: {alert_type}")
                
        except Exception as e:
            logger.error(f"[AnomalyAlertBridge] Error handling anomaly: {e}")


async def _async_send_alert(alert_type, message, level, details, suggestion):
    """異步發送告警"""
    try:
        from admin.alert_service import get_alert_service
        service = get_alert_service()
        result = await service.send_alert(
            alert_type=alert_type,
            message=message,
            level=level,
            details=details,
            suggestion=suggestion,
        )
        if result.get('sent'):
            logger.info(f"[AnomalyAlertBridge] Alert sent: {alert_type}")
    except Exception as e:
        logger.error(f"[AnomalyAlertBridge] Failed to send alert: {e}")


def _generate_suggestion(anomaly) -> str:
    """根據異常類型生成修復建議"""
    metric = anomaly.metric_name
    atype = anomaly.anomaly_type.value if hasattr(anomaly.anomaly_type, 'value') else str(anomaly.anomaly_type)
    
    suggestions = {
        'api_latency': {
            'spike': '檢查數據庫查詢性能，確認是否有慢查詢。考慮增加緩存。',
            'threshold_breach': 'API 響應超過閾值，檢查服務器負載和數據庫連接池。',
        },
        'api_error_count': {
            'spike': '錯誤激增，檢查最近部署是否引入了 bug。查看錯誤日誌獲取詳情。',
            'threshold_breach': '錯誤計數超過閾值，可能存在服務降級。',
        },
        'capacity_usage': {
            'threshold_breach': '資源容量即將用盡，考慮擴容或清理過期數據。',
        },
    }
    
    metric_suggestions = suggestions.get(metric, {})
    return metric_suggestions.get(atype, f'指標 {metric} 出現 {atype} 異常，請檢查相關服務。')


def setup_anomaly_alert_bridge():
    """
    設置異常→告警橋接
    
    在應用啟動時調用一次
    """
    try:
        from admin.anomaly_detection import get_anomaly_manager
        am = get_anomaly_manager()
        am.register_handler(AnomalyAlertBridge.handle_anomaly)
        logger.info("[ObservabilityBridge] Anomaly → Alert bridge registered")
    except Exception as e:
        logger.warning(f"[ObservabilityBridge] Failed to setup bridge: {e}")


# ==================== P11-4: 資源趨勢分析 + 擴縮容建議 ====================

class ResourceAnalyzer:
    """
    分析系統資源趨勢，生成擴縮容建議
    
    數據來源：
    - PerformanceAnalyzer 的歷史延遲數據
    - HealthService 的資源指標（CPU/內存/磁盤）
    - MetricsCollector 的請求量趨勢
    """
    
    @staticmethod
    def analyze_trends() -> Dict[str, Any]:
        """
        分析當前資源趨勢
        
        Returns:
            {
                'cpu': { 'current': float, 'trend': str, 'risk': str },
                'memory': { 'current': float, 'trend': str, 'risk': str },
                'disk': { 'current': float, 'trend': str, 'risk': str },
                'request_load': { 'current': float, 'trend': str },
                'suggestions': [ str, ... ],
                'overall_risk': str,  # low/medium/high/critical
            }
        """
        result = {
            'cpu': {'current': 0, 'trend': 'stable', 'risk': 'low'},
            'memory': {'current': 0, 'trend': 'stable', 'risk': 'low'},
            'disk': {'current': 0, 'trend': 'stable', 'risk': 'low'},
            'request_load': {'current': 0, 'trend': 'stable'},
            'suggestions': [],
            'overall_risk': 'low',
            'timestamp': datetime.utcnow().isoformat(),
        }
        
        # 收集系統指標
        try:
            import psutil
            
            # CPU
            cpu_pct = psutil.cpu_percent(interval=0.1)
            result['cpu']['current'] = cpu_pct
            if cpu_pct > 90:
                result['cpu']['risk'] = 'critical'
                result['cpu']['trend'] = 'overloaded'
                result['suggestions'].append('CPU 使用率 > 90%，建議增加 CPU 核心或優化高 CPU 操作')
            elif cpu_pct > 70:
                result['cpu']['risk'] = 'high'
                result['suggestions'].append('CPU 使用率偏高，考慮優化計算密集型任務')
            
            # 內存
            mem = psutil.virtual_memory()
            result['memory']['current'] = mem.percent
            if mem.percent > 90:
                result['memory']['risk'] = 'critical'
                result['suggestions'].append('內存使用率 > 90%，建議增加內存或排查內存洩漏')
            elif mem.percent > 80:
                result['memory']['risk'] = 'high'
                result['suggestions'].append('內存使用率偏高，考慮增加容器記憶體限制')
            
            # 磁盤
            disk = psutil.disk_usage('/')
            result['disk']['current'] = disk.percent
            if disk.percent > 90:
                result['disk']['risk'] = 'critical'
                result['suggestions'].append('磁盤使用率 > 90%，緊急清理日誌/備份或擴容')
            elif disk.percent > 80:
                result['disk']['risk'] = 'high'
                result['suggestions'].append('磁盤空間偏低，建議清理舊備份和日誌')
        except ImportError:
            result['suggestions'].append('psutil 未安裝，無法收集系統指標')
        except Exception as e:
            logger.warning(f"Resource analysis error: {e}")
        
        # 請求負載
        try:
            from core.metrics_exporter import get_metrics_collector
            mc = get_metrics_collector()
            total_requests = mc._counters.get('tgmatrix_http_requests_total', 0)
            uptime = time.time() - mc._start_time
            if uptime > 0:
                rps = total_requests / uptime
                result['request_load']['current'] = round(rps, 2)
                if rps > 100:
                    result['suggestions'].append(f'平均 RPS 為 {rps:.1f}，考慮增加後端副本或啟用負載均衡')
        except Exception:
            pass
        
        # 計算總體風險
        risks = [result['cpu']['risk'], result['memory']['risk'], result['disk']['risk']]
        risk_levels = {'low': 0, 'medium': 1, 'high': 2, 'critical': 3}
        max_risk = max(risk_levels.get(r, 0) for r in risks)
        result['overall_risk'] = {0: 'low', 1: 'medium', 2: 'high', 3: 'critical'}[max_risk]
        
        if not result['suggestions']:
            result['suggestions'].append('所有資源指標正常，無需調整')
        
        return result


# ==================== P11-5: 日誌異常模式聚類 ====================

class ErrorPatternCluster:
    """
    日誌異常模式聚類器
    
    自動將錯誤日誌按模式分組，識別：
    - 高頻錯誤模式
    - 新出現的錯誤模式
    - 突增的錯誤模式
    """
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        # 錯誤模式計數: { normalized_pattern: { count, first_seen, last_seen, samples } }
        self._patterns: Dict[str, Dict[str, Any]] = {}
        self._max_patterns = 200
        self._max_samples_per_pattern = 5
        self._data_lock = threading.Lock()
        self._initialized = True
    
    def record_error(self, error_message: str, context: Dict[str, Any] = None):
        """
        記錄一條錯誤日誌
        
        自動歸一化並分組
        """
        import re
        
        # 歸一化：去掉動態部分（注意順序：先 UUID/IP，再數字）
        normalized = error_message.strip()
        # 1. 替換 UUID（必須最先，否則數字替換會破壞 UUID 格式）
        normalized = re.sub(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '<UUID>', normalized)
        # 2. 替換 IP 地址
        normalized = re.sub(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', '<IP>', normalized)
        # 3. 替換文件路徑
        normalized = re.sub(r'(?:/[\w.-]+){3,}', '<PATH>', normalized)
        # 4. 替換大數字（保留 HTTP 狀態碼等短數字）
        normalized = re.sub(r'(?<!\w)\d{5,}(?!\w)', '<NUM>', normalized)
        # 截斷到 200 字符
        if len(normalized) > 200:
            normalized = normalized[:200] + '...'
        
        now = datetime.utcnow().isoformat()
        
        with self._data_lock:
            if normalized not in self._patterns:
                if len(self._patterns) >= self._max_patterns:
                    # 淘汰最老的模式
                    oldest_key = min(self._patterns, key=lambda k: self._patterns[k]['last_seen'])
                    del self._patterns[oldest_key]
                
                self._patterns[normalized] = {
                    'count': 0,
                    'first_seen': now,
                    'last_seen': now,
                    'samples': [],
                    'context': context or {},
                }
            
            entry = self._patterns[normalized]
            entry['count'] += 1
            entry['last_seen'] = now
            if len(entry['samples']) < self._max_samples_per_pattern:
                entry['samples'].append({
                    'message': error_message[:500],
                    'time': now,
                })
    
    def get_top_patterns(self, limit: int = 20) -> List[Dict[str, Any]]:
        """獲取最高頻的錯誤模式"""
        with self._data_lock:
            sorted_patterns = sorted(
                self._patterns.items(),
                key=lambda x: x[1]['count'],
                reverse=True
            )[:limit]
        
        return [
            {
                'pattern': pattern,
                'count': data['count'],
                'first_seen': data['first_seen'],
                'last_seen': data['last_seen'],
                'samples': data['samples'],
            }
            for pattern, data in sorted_patterns
        ]
    
    def get_recent_patterns(self, hours: int = 1, limit: int = 20) -> List[Dict[str, Any]]:
        """獲取最近出現的錯誤模式"""
        cutoff = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
        
        with self._data_lock:
            recent = [
                (pattern, data) for pattern, data in self._patterns.items()
                if data['last_seen'] >= cutoff
            ]
        
        recent.sort(key=lambda x: x[1]['count'], reverse=True)
        return [
            {
                'pattern': pattern,
                'count': data['count'],
                'first_seen': data['first_seen'],
                'last_seen': data['last_seen'],
            }
            for pattern, data in recent[:limit]
        ]
    
    def get_stats(self) -> Dict[str, Any]:
        """獲取聚類統計"""
        with self._data_lock:
            total_patterns = len(self._patterns)
            total_errors = sum(d['count'] for d in self._patterns.values())
        
        return {
            'total_patterns': total_patterns,
            'total_errors': total_errors,
            'top_patterns': self.get_top_patterns(5),
        }
    
    def clear(self):
        """清除所有模式"""
        with self._data_lock:
            self._patterns.clear()


def get_error_cluster() -> ErrorPatternCluster:
    """獲取錯誤模式聚類器實例"""
    return ErrorPatternCluster()
