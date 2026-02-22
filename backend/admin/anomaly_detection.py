"""
智能異常檢測系統

功能：
- 基於統計學的異常檢測
- 多種檢測算法
- 實時監控
- 自動告警觸發
"""

import logging
import sqlite3
import os
import json
import math
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum
from collections import deque

logger = logging.getLogger(__name__)

# 數據庫路徑
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'anomaly_detection.db')


class AnomalyType(str, Enum):
    """異常類型"""
    SPIKE = "spike"               # 尖峰（突然增加）
    DROP = "drop"                 # 驟降
    TREND_CHANGE = "trend_change" # 趨勢變化
    OUTLIER = "outlier"           # 離群值
    PATTERN_BREAK = "pattern_break"  # 模式中斷
    THRESHOLD_BREACH = "threshold_breach"  # 閾值突破


class DetectionMethod(str, Enum):
    """檢測方法"""
    Z_SCORE = "z_score"           # Z 分數
    IQR = "iqr"                   # 四分位距
    MAD = "mad"                   # 中位數絕對偏差
    EWMA = "ewma"                 # 指數加權移動平均
    STATIC_THRESHOLD = "static"   # 靜態閾值


class Severity(str, Enum):
    """嚴重程度"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Anomaly:
    """異常記錄"""
    id: str
    metric_name: str
    anomaly_type: AnomalyType
    severity: Severity
    value: float
    expected_value: float
    deviation: float
    detection_method: DetectionMethod
    context: Dict = field(default_factory=dict)
    detected_at: str = ""
    acknowledged: bool = False
    acknowledged_by: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "metric_name": self.metric_name,
            "anomaly_type": self.anomaly_type.value,
            "severity": self.severity.value,
            "value": self.value,
            "expected_value": self.expected_value,
            "deviation": self.deviation,
            "detection_method": self.detection_method.value,
            "context": self.context,
            "detected_at": self.detected_at,
            "acknowledged": self.acknowledged
        }


@dataclass
class DetectorConfig:
    """檢測器配置"""
    metric_name: str
    method: DetectionMethod = DetectionMethod.Z_SCORE
    window_size: int = 100          # 滑動窗口大小
    z_threshold: float = 3.0        # Z 分數閾值
    iqr_multiplier: float = 1.5     # IQR 倍數
    ewma_alpha: float = 0.3         # EWMA 平滑係數
    static_min: Optional[float] = None
    static_max: Optional[float] = None
    min_samples: int = 10           # 最小樣本數
    cooldown_minutes: int = 5       # 冷卻時間（避免重複告警）
    is_active: bool = True


class StatisticalDetector:
    """統計檢測器"""
    
    def __init__(self, config: DetectorConfig):
        self.config = config
        self.data_window: deque = deque(maxlen=config.window_size)
        self.ewma_value: Optional[float] = None
        self.last_anomaly_time: Optional[datetime] = None
    
    def add_sample(self, value: float) -> Optional[Anomaly]:
        """添加樣本並檢測異常"""
        self.data_window.append(value)
        
        if len(self.data_window) < self.config.min_samples:
            return None
        
        # 檢查冷卻時間
        if self.last_anomaly_time:
            cooldown = timedelta(minutes=self.config.cooldown_minutes)
            if datetime.now() - self.last_anomaly_time < cooldown:
                return None
        
        # 根據方法檢測
        anomaly = None
        
        if self.config.method == DetectionMethod.Z_SCORE:
            anomaly = self._detect_zscore(value)
        elif self.config.method == DetectionMethod.IQR:
            anomaly = self._detect_iqr(value)
        elif self.config.method == DetectionMethod.MAD:
            anomaly = self._detect_mad(value)
        elif self.config.method == DetectionMethod.EWMA:
            anomaly = self._detect_ewma(value)
        elif self.config.method == DetectionMethod.STATIC_THRESHOLD:
            anomaly = self._detect_static(value)
        
        if anomaly:
            self.last_anomaly_time = datetime.now()
        
        return anomaly
    
    def _detect_zscore(self, value: float) -> Optional[Anomaly]:
        """Z 分數檢測"""
        data = list(self.data_window)
        mean = sum(data) / len(data)
        
        # 計算標準差
        variance = sum((x - mean) ** 2 for x in data) / len(data)
        std = math.sqrt(variance) if variance > 0 else 1
        
        # 計算 Z 分數
        z_score = (value - mean) / std if std > 0 else 0
        
        if abs(z_score) > self.config.z_threshold:
            import uuid
            return Anomaly(
                id=str(uuid.uuid4()),
                metric_name=self.config.metric_name,
                anomaly_type=AnomalyType.SPIKE if z_score > 0 else AnomalyType.DROP,
                severity=self._get_severity(abs(z_score), self.config.z_threshold),
                value=value,
                expected_value=mean,
                deviation=z_score,
                detection_method=DetectionMethod.Z_SCORE,
                context={"mean": mean, "std": std, "z_score": z_score},
                detected_at=datetime.now().isoformat()
            )
        return None
    
    def _detect_iqr(self, value: float) -> Optional[Anomaly]:
        """IQR 檢測"""
        data = sorted(self.data_window)
        n = len(data)
        
        q1 = data[n // 4]
        q3 = data[3 * n // 4]
        iqr = q3 - q1
        
        lower_bound = q1 - self.config.iqr_multiplier * iqr
        upper_bound = q3 + self.config.iqr_multiplier * iqr
        
        if value < lower_bound or value > upper_bound:
            import uuid
            deviation = (value - q3) / iqr if value > upper_bound else (q1 - value) / iqr
            
            return Anomaly(
                id=str(uuid.uuid4()),
                metric_name=self.config.metric_name,
                anomaly_type=AnomalyType.OUTLIER,
                severity=self._get_severity(abs(deviation), 1.5),
                value=value,
                expected_value=(q1 + q3) / 2,
                deviation=deviation,
                detection_method=DetectionMethod.IQR,
                context={"q1": q1, "q3": q3, "iqr": iqr, "bounds": [lower_bound, upper_bound]},
                detected_at=datetime.now().isoformat()
            )
        return None
    
    def _detect_mad(self, value: float) -> Optional[Anomaly]:
        """中位數絕對偏差檢測"""
        data = sorted(self.data_window)
        median = data[len(data) // 2]
        
        # 計算 MAD
        deviations = sorted(abs(x - median) for x in data)
        mad = deviations[len(deviations) // 2]
        
        # 修正的 Z 分數
        k = 1.4826  # 常數因子
        modified_z = (value - median) / (k * mad) if mad > 0 else 0
        
        if abs(modified_z) > self.config.z_threshold:
            import uuid
            return Anomaly(
                id=str(uuid.uuid4()),
                metric_name=self.config.metric_name,
                anomaly_type=AnomalyType.OUTLIER,
                severity=self._get_severity(abs(modified_z), self.config.z_threshold),
                value=value,
                expected_value=median,
                deviation=modified_z,
                detection_method=DetectionMethod.MAD,
                context={"median": median, "mad": mad, "modified_z": modified_z},
                detected_at=datetime.now().isoformat()
            )
        return None
    
    def _detect_ewma(self, value: float) -> Optional[Anomaly]:
        """EWMA 檢測"""
        alpha = self.config.ewma_alpha
        
        if self.ewma_value is None:
            self.ewma_value = value
            return None
        
        # 更新 EWMA
        expected = self.ewma_value
        self.ewma_value = alpha * value + (1 - alpha) * self.ewma_value
        
        # 計算偏離程度
        deviation = abs(value - expected) / expected if expected != 0 else 0
        
        # 如果偏離超過一定比例
        if deviation > 0.5:  # 50% 偏離
            import uuid
            return Anomaly(
                id=str(uuid.uuid4()),
                metric_name=self.config.metric_name,
                anomaly_type=AnomalyType.TREND_CHANGE,
                severity=self._get_severity(deviation, 0.5),
                value=value,
                expected_value=expected,
                deviation=deviation,
                detection_method=DetectionMethod.EWMA,
                context={"ewma": self.ewma_value, "deviation_percent": deviation * 100},
                detected_at=datetime.now().isoformat()
            )
        return None
    
    def _detect_static(self, value: float) -> Optional[Anomaly]:
        """靜態閾值檢測"""
        min_val = self.config.static_min
        max_val = self.config.static_max
        
        breached = False
        anomaly_type = AnomalyType.THRESHOLD_BREACH
        
        if min_val is not None and value < min_val:
            breached = True
            deviation = (min_val - value) / min_val if min_val != 0 else 0
        elif max_val is not None and value > max_val:
            breached = True
            deviation = (value - max_val) / max_val if max_val != 0 else 0
        else:
            return None
        
        if breached:
            import uuid
            expected = (min_val or 0 + max_val or 0) / 2 if (min_val or max_val) else value
            
            return Anomaly(
                id=str(uuid.uuid4()),
                metric_name=self.config.metric_name,
                anomaly_type=anomaly_type,
                severity=self._get_severity(abs(deviation), 0.3),
                value=value,
                expected_value=expected,
                deviation=deviation,
                detection_method=DetectionMethod.STATIC_THRESHOLD,
                context={"min": min_val, "max": max_val},
                detected_at=datetime.now().isoformat()
            )
        return None
    
    def _get_severity(self, deviation: float, threshold: float) -> Severity:
        """根據偏離程度確定嚴重程度"""
        ratio = deviation / threshold if threshold > 0 else deviation
        
        if ratio > 3:
            return Severity.CRITICAL
        elif ratio > 2:
            return Severity.HIGH
        elif ratio > 1.5:
            return Severity.MEDIUM
        else:
            return Severity.LOW


class AnomalyDetectionManager:
    """異常檢測管理器"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self._detectors: Dict[str, StatisticalDetector] = {}
        self._anomaly_handlers: List = []
        self._init_db()
    
    def _init_db(self):
        """初始化數據庫"""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 檢測器配置表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS detector_configs (
                metric_name TEXT PRIMARY KEY,
                method TEXT DEFAULT 'z_score',
                window_size INTEGER DEFAULT 100,
                z_threshold REAL DEFAULT 3.0,
                iqr_multiplier REAL DEFAULT 1.5,
                ewma_alpha REAL DEFAULT 0.3,
                static_min REAL,
                static_max REAL,
                min_samples INTEGER DEFAULT 10,
                cooldown_minutes INTEGER DEFAULT 5,
                is_active INTEGER DEFAULT 1
            )
        ''')
        
        # 異常記錄表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS anomalies (
                id TEXT PRIMARY KEY,
                metric_name TEXT NOT NULL,
                anomaly_type TEXT,
                severity TEXT,
                value REAL,
                expected_value REAL,
                deviation REAL,
                detection_method TEXT,
                context TEXT DEFAULT '{}',
                detected_at TEXT,
                acknowledged INTEGER DEFAULT 0,
                acknowledged_by TEXT
            )
        ''')
        
        # 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_anomalies_metric ON anomalies(metric_name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_anomalies_time ON anomalies(detected_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity)')
        
        # 創建默認檢測器配置
        default_metrics = [
            ('api_success_rate', 'z_score', 100, 2.5, 1.5, 0.3, 50.0, None),
            ('api_latency', 'ewma', 50, 3.0, 1.5, 0.2, None, 5000.0),
            ('api_error_count', 'static', 100, 3.0, 1.5, 0.3, None, 10.0),
            ('allocation_rate', 'iqr', 100, 3.0, 1.5, 0.3, None, None),
            ('capacity_usage', 'static', 100, 3.0, 1.5, 0.3, None, 90.0)
        ]
        
        for metric in default_metrics:
            cursor.execute('''
                INSERT OR IGNORE INTO detector_configs 
                (metric_name, method, window_size, z_threshold, iqr_multiplier, ewma_alpha, static_min, static_max)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', metric)
        
        conn.commit()
        conn.close()
        logger.info("異常檢測數據庫已初始化")
        
        # 加載檢測器
        self._load_detectors()
    
    def _load_detectors(self):
        """加載檢測器"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM detector_configs WHERE is_active = 1')
        rows = cursor.fetchall()
        conn.close()
        
        for row in rows:
            config = DetectorConfig(
                metric_name=row[0],
                method=DetectionMethod(row[1]) if row[1] else DetectionMethod.Z_SCORE,
                window_size=row[2] or 100,
                z_threshold=row[3] or 3.0,
                iqr_multiplier=row[4] or 1.5,
                ewma_alpha=row[5] or 0.3,
                static_min=row[6],
                static_max=row[7],
                min_samples=row[8] or 10,
                cooldown_minutes=row[9] or 5,
                is_active=bool(row[10])
            )
            self._detectors[config.metric_name] = StatisticalDetector(config)
        
        logger.info(f"已加載 {len(self._detectors)} 個異常檢測器")
    
    # ==================== 檢測器管理 ====================
    
    def create_detector(self, config: DetectorConfig) -> bool:
        """創建檢測器"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO detector_configs 
                (metric_name, method, window_size, z_threshold, iqr_multiplier, 
                 ewma_alpha, static_min, static_max, min_samples, cooldown_minutes, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                config.metric_name,
                config.method.value if isinstance(config.method, DetectionMethod) else config.method,
                config.window_size, config.z_threshold, config.iqr_multiplier,
                config.ewma_alpha, config.static_min, config.static_max,
                config.min_samples, config.cooldown_minutes, 1 if config.is_active else 0
            ))
            
            conn.commit()
            conn.close()
            
            # 創建運行時檢測器
            self._detectors[config.metric_name] = StatisticalDetector(config)
            
            return True
        except Exception as e:
            logger.error(f"創建檢測器失敗: {e}")
            return False
    
    def list_detectors(self) -> List[Dict]:
        """列出檢測器"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM detector_configs')
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "metric_name": row[0],
            "method": row[1],
            "window_size": row[2],
            "z_threshold": row[3],
            "iqr_multiplier": row[4],
            "ewma_alpha": row[5],
            "static_min": row[6],
            "static_max": row[7],
            "min_samples": row[8],
            "cooldown_minutes": row[9],
            "is_active": bool(row[10])
        } for row in rows]
    
    def toggle_detector(self, metric_name: str, active: bool) -> bool:
        """啟用/禁用檢測器"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE detector_configs SET is_active = ? WHERE metric_name = ?
            ''', (1 if active else 0, metric_name))
            conn.commit()
            conn.close()
            
            if active and metric_name not in self._detectors:
                self._load_detectors()
            elif not active and metric_name in self._detectors:
                del self._detectors[metric_name]
            
            return True
        except Exception as e:
            logger.error(f"切換檢測器狀態失敗: {e}")
            return False
    
    # ==================== 異常檢測 ====================
    
    def detect(self, metric_name: str, value: float) -> Optional[Anomaly]:
        """檢測異常"""
        detector = self._detectors.get(metric_name)
        if not detector:
            return None
        
        anomaly = detector.add_sample(value)
        
        if anomaly:
            # 保存異常
            self._save_anomaly(anomaly)
            
            # 觸發處理器
            for handler in self._anomaly_handlers:
                try:
                    handler(anomaly)
                except Exception as e:
                    logger.error(f"異常處理器錯誤: {e}")
        
        return anomaly
    
    def detect_batch(self, metrics: Dict[str, float]) -> List[Anomaly]:
        """批量檢測"""
        anomalies = []
        
        for metric_name, value in metrics.items():
            anomaly = self.detect(metric_name, value)
            if anomaly:
                anomalies.append(anomaly)
        
        return anomalies
    
    def _save_anomaly(self, anomaly: Anomaly):
        """保存異常"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO anomalies 
            (id, metric_name, anomaly_type, severity, value, expected_value, 
             deviation, detection_method, context, detected_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            anomaly.id, anomaly.metric_name, anomaly.anomaly_type.value,
            anomaly.severity.value, anomaly.value, anomaly.expected_value,
            anomaly.deviation, anomaly.detection_method.value,
            json.dumps(anomaly.context), anomaly.detected_at
        ))
        
        conn.commit()
        conn.close()
    
    # ==================== 異常查詢 ====================
    
    def list_anomalies(
        self,
        metric_name: Optional[str] = None,
        severity: Optional[str] = None,
        acknowledged: Optional[bool] = None,
        hours: int = 24,
        limit: int = 100
    ) -> List[Dict]:
        """列出異常"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        since = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        query = 'SELECT * FROM anomalies WHERE detected_at > ?'
        params = [since]
        
        if metric_name:
            query += ' AND metric_name = ?'
            params.append(metric_name)
        
        if severity:
            query += ' AND severity = ?'
            params.append(severity)
        
        if acknowledged is not None:
            query += ' AND acknowledged = ?'
            params.append(1 if acknowledged else 0)
        
        query += ' ORDER BY detected_at DESC LIMIT ?'
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "metric_name": row[1],
            "anomaly_type": row[2],
            "severity": row[3],
            "value": row[4],
            "expected_value": row[5],
            "deviation": row[6],
            "detection_method": row[7],
            "context": json.loads(row[8]) if row[8] else {},
            "detected_at": row[9],
            "acknowledged": bool(row[10]),
            "acknowledged_by": row[11]
        } for row in rows]
    
    def acknowledge_anomaly(self, anomaly_id: str, user_id: str) -> bool:
        """確認異常"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE anomalies 
                SET acknowledged = 1, acknowledged_by = ?
                WHERE id = ?
            ''', (user_id, anomaly_id))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"確認異常失敗: {e}")
            return False
    
    def get_anomaly_stats(self, hours: int = 24) -> Dict[str, Any]:
        """獲取異常統計"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        since = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        # 按嚴重程度統計
        cursor.execute('''
            SELECT severity, COUNT(*) FROM anomalies 
            WHERE detected_at > ?
            GROUP BY severity
        ''', (since,))
        by_severity = dict(cursor.fetchall())
        
        # 按指標統計
        cursor.execute('''
            SELECT metric_name, COUNT(*) FROM anomalies 
            WHERE detected_at > ?
            GROUP BY metric_name
        ''', (since,))
        by_metric = dict(cursor.fetchall())
        
        # 按類型統計
        cursor.execute('''
            SELECT anomaly_type, COUNT(*) FROM anomalies 
            WHERE detected_at > ?
            GROUP BY anomaly_type
        ''', (since,))
        by_type = dict(cursor.fetchall())
        
        # 未確認數量
        cursor.execute('''
            SELECT COUNT(*) FROM anomalies 
            WHERE detected_at > ? AND acknowledged = 0
        ''', (since,))
        unacknowledged = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "period_hours": hours,
            "total": sum(by_severity.values()),
            "unacknowledged": unacknowledged,
            "by_severity": by_severity,
            "by_metric": by_metric,
            "by_type": by_type
        }
    
    # ==================== 處理器註冊 ====================
    
    def register_handler(self, handler):
        """註冊異常處理器"""
        self._anomaly_handlers.append(handler)
    
    def get_detector_status(self) -> Dict[str, Any]:
        """獲取檢測器狀態"""
        return {
            "active_detectors": len(self._detectors),
            "detectors": {
                name: {
                    "method": detector.config.method.value,
                    "samples": len(detector.data_window),
                    "window_size": detector.config.window_size
                }
                for name, detector in self._detectors.items()
            }
        }


# 獲取單例
def get_anomaly_manager() -> AnomalyDetectionManager:
    return AnomalyDetectionManager()
