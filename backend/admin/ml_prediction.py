"""
智能預測引擎

功能：
- 時間序列預測
- 異常閾值自適應
- 趨勢分析
- 季節性檢測
- 容量預測
- 使用模式識別
"""

import logging
import sqlite3
import os
import json
import uuid
import math
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict

logger = logging.getLogger(__name__)

# 數據庫路徑
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'ml_prediction.db')


class PredictionType(str, Enum):
    """預測類型"""
    USAGE = "usage"           # 使用量預測
    CAPACITY = "capacity"     # 容量預測
    ANOMALY = "anomaly"       # 異常預測
    TREND = "trend"           # 趨勢預測


class SeasonType(str, Enum):
    """季節性類型"""
    HOURLY = "hourly"     # 小時級
    DAILY = "daily"       # 日級
    WEEKLY = "weekly"     # 週級
    MONTHLY = "monthly"   # 月級


@dataclass
class TimeSeriesData:
    """時間序列數據"""
    timestamps: List[float]
    values: List[float]
    labels: List[str] = field(default_factory=list)


@dataclass
class PredictionResult:
    """預測結果"""
    prediction_type: PredictionType
    predicted_values: List[float]
    confidence_intervals: List[Tuple[float, float]]  # (lower, upper)
    timestamps: List[str]
    confidence: float
    model_info: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


class ExponentialSmoothing:
    """指數平滑模型"""
    
    def __init__(self, alpha: float = 0.3, beta: float = 0.1, gamma: float = 0.1):
        self.alpha = alpha  # 水平平滑係數
        self.beta = beta    # 趨勢平滑係數
        self.gamma = gamma  # 季節性平滑係數
    
    def simple_exponential_smoothing(self, data: List[float], periods: int = 7) -> List[float]:
        """簡單指數平滑"""
        if not data:
            return []
        
        result = [data[0]]
        for i in range(1, len(data)):
            result.append(self.alpha * data[i] + (1 - self.alpha) * result[-1])
        
        # 預測
        last = result[-1]
        predictions = [last] * periods
        
        return predictions
    
    def holt_linear(self, data: List[float], periods: int = 7) -> Tuple[List[float], List[float]]:
        """Holt 線性趨勢方法"""
        if len(data) < 2:
            return [data[0]] * periods if data else [], []
        
        # 初始化
        level = data[0]
        trend = data[1] - data[0]
        
        fitted = [level]
        
        for i in range(1, len(data)):
            prev_level = level
            level = self.alpha * data[i] + (1 - self.alpha) * (level + trend)
            trend = self.beta * (level - prev_level) + (1 - self.beta) * trend
            fitted.append(level + trend)
        
        # 預測
        predictions = []
        for h in range(1, periods + 1):
            predictions.append(level + h * trend)
        
        return predictions, fitted
    
    def holt_winters(
        self,
        data: List[float],
        season_length: int = 7,
        periods: int = 7
    ) -> Tuple[List[float], Dict]:
        """Holt-Winters 季節性方法"""
        if len(data) < season_length * 2:
            return self.holt_linear(data, periods)[0], {}
        
        # 初始化
        level = sum(data[:season_length]) / season_length
        trend = (sum(data[season_length:2*season_length]) - sum(data[:season_length])) / (season_length ** 2)
        
        # 季節性因子初始化
        seasonals = []
        for i in range(season_length):
            seasonals.append(data[i] / level if level != 0 else 1)
        
        fitted = []
        
        for i in range(len(data)):
            if i >= season_length:
                prev_level = level
                val = data[i]
                season_idx = i % season_length
                
                level = self.alpha * (val / seasonals[season_idx] if seasonals[season_idx] != 0 else val) + \
                        (1 - self.alpha) * (level + trend)
                trend = self.beta * (level - prev_level) + (1 - self.beta) * trend
                seasonals[season_idx] = self.gamma * (val / level if level != 0 else 1) + \
                                        (1 - self.gamma) * seasonals[season_idx]
            
            fitted.append((level + trend) * seasonals[i % season_length])
        
        # 預測
        predictions = []
        for h in range(1, periods + 1):
            season_idx = (len(data) + h - 1) % season_length
            predictions.append((level + h * trend) * seasonals[season_idx])
        
        model_info = {
            "level": level,
            "trend": trend,
            "seasonals": seasonals,
            "season_length": season_length
        }
        
        return predictions, model_info


class AnomalyThresholdAdapter:
    """異常閾值自適應器"""
    
    def __init__(self, sensitivity: float = 2.0):
        self.sensitivity = sensitivity
        self._history: Dict[str, List[float]] = defaultdict(list)
        self._thresholds: Dict[str, Dict] = {}
    
    def update(self, metric_name: str, value: float):
        """更新指標歷史"""
        self._history[metric_name].append(value)
        
        # 限制歷史長度
        if len(self._history[metric_name]) > 1000:
            self._history[metric_name] = self._history[metric_name][-500:]
        
        # 重新計算閾值
        self._recalculate_threshold(metric_name)
    
    def _recalculate_threshold(self, metric_name: str):
        """重新計算閾值"""
        data = self._history[metric_name]
        if len(data) < 10:
            return
        
        # 計算統計量
        mean = sum(data) / len(data)
        variance = sum((x - mean) ** 2 for x in data) / len(data)
        std = math.sqrt(variance) if variance > 0 else 0
        
        # 計算 MAD（更穩健）
        median = sorted(data)[len(data) // 2]
        mad = sorted(abs(x - median) for x in data)[len(data) // 2] * 1.4826
        
        # 使用較穩健的閾值
        robust_std = min(std, mad) if mad > 0 else std
        
        self._thresholds[metric_name] = {
            "mean": mean,
            "std": std,
            "mad": mad,
            "upper": mean + self.sensitivity * robust_std,
            "lower": max(0, mean - self.sensitivity * robust_std),
            "updated_at": datetime.now().isoformat()
        }
    
    def get_threshold(self, metric_name: str) -> Optional[Dict]:
        """獲取閾值"""
        return self._thresholds.get(metric_name)
    
    def is_anomaly(self, metric_name: str, value: float) -> Tuple[bool, str]:
        """判斷是否異常"""
        threshold = self._thresholds.get(metric_name)
        if not threshold:
            return False, "no_threshold"
        
        if value > threshold["upper"]:
            return True, "above_upper"
        elif value < threshold["lower"]:
            return True, "below_lower"
        
        return False, "normal"


class PatternRecognizer:
    """使用模式識別器"""
    
    def __init__(self):
        self._patterns: Dict[str, Dict] = {}
    
    def analyze_hourly_pattern(self, hourly_data: Dict[int, float]) -> Dict:
        """分析小時級模式"""
        if not hourly_data:
            return {}
        
        values = list(hourly_data.values())
        hours = list(hourly_data.keys())
        
        avg = sum(values) / len(values) if values else 0
        
        # 找出高峰和低谷時段
        sorted_hours = sorted(hourly_data.items(), key=lambda x: x[1], reverse=True)
        peak_hours = [h for h, v in sorted_hours[:3]]
        low_hours = [h for h, v in sorted_hours[-3:]]
        
        # 工作時間 vs 非工作時間
        work_hours = [hourly_data.get(h, 0) for h in range(9, 18)]
        non_work = [hourly_data.get(h, 0) for h in list(range(0, 9)) + list(range(18, 24))]
        
        work_avg = sum(work_hours) / len(work_hours) if work_hours else 0
        non_work_avg = sum(non_work) / len(non_work) if non_work else 0
        
        pattern_type = "business" if work_avg > non_work_avg * 1.5 else "consumer" if non_work_avg > work_avg else "flat"
        
        return {
            "type": "hourly",
            "pattern_type": pattern_type,
            "peak_hours": peak_hours,
            "low_hours": low_hours,
            "work_hours_avg": round(work_avg, 2),
            "non_work_avg": round(non_work_avg, 2),
            "average": round(avg, 2)
        }
    
    def analyze_weekly_pattern(self, daily_data: Dict[int, float]) -> Dict:
        """分析週級模式（0=週一, 6=週日）"""
        if not daily_data:
            return {}
        
        weekday_vals = [daily_data.get(i, 0) for i in range(5)]
        weekend_vals = [daily_data.get(i, 0) for i in range(5, 7)]
        
        weekday_avg = sum(weekday_vals) / len(weekday_vals) if weekday_vals else 0
        weekend_avg = sum(weekend_vals) / len(weekend_vals) if weekend_vals else 0
        
        pattern_type = "weekday_heavy" if weekday_avg > weekend_avg * 1.3 else \
                       "weekend_heavy" if weekend_avg > weekday_avg * 1.3 else "balanced"
        
        return {
            "type": "weekly",
            "pattern_type": pattern_type,
            "weekday_avg": round(weekday_avg, 2),
            "weekend_avg": round(weekend_avg, 2),
            "busiest_day": max(daily_data.items(), key=lambda x: x[1])[0] if daily_data else None
        }
    
    def detect_trend(self, data: List[float], window: int = 7) -> Dict:
        """檢測趨勢"""
        if len(data) < window:
            return {"trend": "insufficient_data"}
        
        # 簡單線性回歸
        n = len(data)
        x_mean = (n - 1) / 2
        y_mean = sum(data) / n
        
        numerator = sum((i - x_mean) * (data[i] - y_mean) for i in range(n))
        denominator = sum((i - x_mean) ** 2 for i in range(n))
        
        slope = numerator / denominator if denominator != 0 else 0
        
        # 計算 R²
        y_pred = [y_mean + slope * (i - x_mean) for i in range(n)]
        ss_res = sum((data[i] - y_pred[i]) ** 2 for i in range(n))
        ss_tot = sum((data[i] - y_mean) ** 2 for i in range(n))
        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
        
        # 判斷趨勢
        if abs(slope) < 0.01 * y_mean:
            trend = "stable"
        elif slope > 0:
            trend = "increasing"
        else:
            trend = "decreasing"
        
        # 計算變化率
        if data[0] != 0:
            change_rate = (data[-1] - data[0]) / data[0] * 100
        else:
            change_rate = 0
        
        return {
            "trend": trend,
            "slope": round(slope, 4),
            "r_squared": round(r_squared, 4),
            "change_rate_percent": round(change_rate, 2),
            "confidence": "high" if r_squared > 0.7 else "medium" if r_squared > 0.4 else "low"
        }


class MLPredictionEngine:
    """機器學習預測引擎"""
    
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
        self._init_db()
        self.smoother = ExponentialSmoothing()
        self.threshold_adapter = AnomalyThresholdAdapter()
        self.pattern_recognizer = PatternRecognizer()
    
    def _init_db(self):
        """初始化數據庫"""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 預測歷史表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS prediction_history (
                id TEXT PRIMARY KEY,
                prediction_type TEXT,
                metric_name TEXT,
                predicted_values TEXT,
                actual_values TEXT,
                confidence REAL,
                accuracy REAL,
                model_info TEXT DEFAULT '{}',
                created_at TEXT
            )
        ''')
        
        # 模式記錄表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS pattern_records (
                id TEXT PRIMARY KEY,
                metric_name TEXT NOT NULL,
                pattern_type TEXT,
                pattern_data TEXT DEFAULT '{}',
                detected_at TEXT,
                UNIQUE(metric_name, pattern_type)
            )
        ''')
        
        # 閾值歷史表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS threshold_history (
                id TEXT PRIMARY KEY,
                metric_name TEXT NOT NULL,
                threshold_data TEXT DEFAULT '{}',
                updated_at TEXT
            )
        ''')
        
        # 訓練數據表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS training_data (
                id TEXT PRIMARY KEY,
                metric_name TEXT NOT NULL,
                timestamp TEXT,
                value REAL,
                labels TEXT DEFAULT '[]'
            )
        ''')
        
        # 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_prediction_type ON prediction_history(prediction_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_training_metric ON training_data(metric_name)')
        
        conn.commit()
        conn.close()
        logger.info("ML預測數據庫已初始化")
    
    # ==================== 數據收集 ====================
    
    def add_training_data(
        self,
        metric_name: str,
        value: float,
        timestamp: str = None,
        labels: List[str] = None
    ):
        """添加訓練數據"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO training_data (id, metric_name, timestamp, value, labels)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            str(uuid.uuid4()), metric_name,
            timestamp or datetime.now().isoformat(),
            value, json.dumps(labels or [])
        ))
        
        conn.commit()
        conn.close()
        
        # 更新閾值適配器
        self.threshold_adapter.update(metric_name, value)
    
    def get_training_data(
        self,
        metric_name: str,
        hours: int = 168  # 默認 7 天
    ) -> TimeSeriesData:
        """獲取訓練數據"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        since = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        cursor.execute('''
            SELECT timestamp, value, labels FROM training_data
            WHERE metric_name = ? AND timestamp > ?
            ORDER BY timestamp
        ''', (metric_name, since))
        
        rows = cursor.fetchall()
        conn.close()
        
        timestamps = []
        values = []
        labels = []
        
        for row in rows:
            try:
                ts = datetime.fromisoformat(row[0]).timestamp()
                timestamps.append(ts)
                values.append(row[1])
                labels.append(json.loads(row[2]) if row[2] else [])
            except Exception:
                continue
        
        return TimeSeriesData(timestamps=timestamps, values=values, labels=labels)
    
    # ==================== 預測 ====================
    
    def predict_usage(
        self,
        metric_name: str,
        periods: int = 24,
        use_seasonality: bool = True
    ) -> PredictionResult:
        """預測使用量"""
        data = self.get_training_data(metric_name)
        
        if len(data.values) < 14:
            # 數據不足，使用簡單平滑
            predictions = self.smoother.simple_exponential_smoothing(data.values, periods)
            model_info = {"method": "simple_smoothing", "reason": "insufficient_data"}
        elif use_seasonality and len(data.values) >= 48:
            # 使用 Holt-Winters
            predictions, model_info = self.smoother.holt_winters(data.values, season_length=24, periods=periods)
            model_info["method"] = "holt_winters"
        else:
            # 使用 Holt 線性
            predictions, _ = self.smoother.holt_linear(data.values, periods)
            model_info = {"method": "holt_linear"}
        
        # 計算置信區間
        if data.values:
            variance = sum((x - sum(data.values)/len(data.values))**2 for x in data.values) / len(data.values)
            std = math.sqrt(variance) if variance > 0 else 0
            intervals = [(max(0, p - 1.96 * std), p + 1.96 * std) for p in predictions]
        else:
            intervals = [(0, 0)] * len(predictions)
        
        # 生成時間戳
        now = datetime.now()
        timestamps = [(now + timedelta(hours=i+1)).isoformat() for i in range(periods)]
        
        # 計算置信度
        confidence = min(0.95, len(data.values) / 100)
        
        result = PredictionResult(
            prediction_type=PredictionType.USAGE,
            predicted_values=predictions,
            confidence_intervals=intervals,
            timestamps=timestamps,
            confidence=confidence,
            model_info=model_info
        )
        
        # 保存預測歷史
        self._save_prediction(metric_name, result)
        
        return result
    
    def predict_capacity(
        self,
        current_usage: float,
        total_capacity: float,
        metric_name: str = "default"
    ) -> Dict[str, Any]:
        """預測容量耗盡時間"""
        data = self.get_training_data(metric_name)
        
        if len(data.values) < 7:
            return {
                "status": "insufficient_data",
                "message": "需要至少 7 天的數據"
            }
        
        # 分析趨勢
        trend = self.pattern_recognizer.detect_trend(data.values)
        
        if trend["trend"] == "stable" or trend["slope"] <= 0:
            return {
                "status": "healthy",
                "trend": trend["trend"],
                "message": "容量使用穩定或下降，無需擔心",
                "utilization_percent": round(current_usage / total_capacity * 100, 1) if total_capacity > 0 else 0
            }
        
        # 計算剩餘容量和耗盡時間
        remaining = total_capacity - current_usage
        daily_increase = trend["slope"] * 24  # 轉為每日增長
        
        if daily_increase > 0:
            days_until_full = remaining / daily_increase
        else:
            days_until_full = float('inf')
        
        # 確定風險等級
        if days_until_full <= 7:
            risk_level = "critical"
        elif days_until_full <= 30:
            risk_level = "warning"
        else:
            risk_level = "normal"
        
        return {
            "status": "predicted",
            "trend": trend["trend"],
            "daily_increase": round(daily_increase, 2),
            "days_until_full": round(days_until_full, 1) if days_until_full != float('inf') else None,
            "expected_full_date": (datetime.now() + timedelta(days=days_until_full)).isoformat() if days_until_full < 365 else None,
            "utilization_percent": round(current_usage / total_capacity * 100, 1) if total_capacity > 0 else 0,
            "risk_level": risk_level,
            "recommendation": self._get_capacity_recommendation(risk_level, days_until_full)
        }
    
    def _get_capacity_recommendation(self, risk_level: str, days: float) -> str:
        """獲取容量建議"""
        if risk_level == "critical":
            return f"緊急：預計 {days:.0f} 天內容量耗盡，建議立即擴容或清理資源"
        elif risk_level == "warning":
            return f"警告：預計 {days:.0f} 天內容量耗盡，建議規劃擴容"
        else:
            return "容量充足，持續監控即可"
    
    # ==================== 模式識別 ====================
    
    def analyze_patterns(self, metric_name: str) -> Dict[str, Any]:
        """分析使用模式"""
        data = self.get_training_data(metric_name, hours=168)  # 7 天
        
        if len(data.values) < 24:
            return {"status": "insufficient_data"}
        
        # 按小時聚合
        hourly_data = defaultdict(list)
        daily_data = defaultdict(list)
        
        for ts, val in zip(data.timestamps, data.values):
            dt = datetime.fromtimestamp(ts)
            hourly_data[dt.hour].append(val)
            daily_data[dt.weekday()].append(val)
        
        # 計算平均值
        hourly_avg = {h: sum(v)/len(v) for h, v in hourly_data.items() if v}
        daily_avg = {d: sum(v)/len(v) for d, v in daily_data.items() if v}
        
        # 分析模式
        hourly_pattern = self.pattern_recognizer.analyze_hourly_pattern(hourly_avg)
        weekly_pattern = self.pattern_recognizer.analyze_weekly_pattern(daily_avg)
        trend_analysis = self.pattern_recognizer.detect_trend(data.values)
        
        result = {
            "metric_name": metric_name,
            "data_points": len(data.values),
            "hourly_pattern": hourly_pattern,
            "weekly_pattern": weekly_pattern,
            "trend": trend_analysis,
            "analyzed_at": datetime.now().isoformat()
        }
        
        # 保存模式
        self._save_pattern(metric_name, result)
        
        return result
    
    # ==================== 異常檢測 ====================
    
    def get_adaptive_threshold(self, metric_name: str) -> Optional[Dict]:
        """獲取自適應閾值"""
        return self.threshold_adapter.get_threshold(metric_name)
    
    def check_anomaly(self, metric_name: str, value: float) -> Dict[str, Any]:
        """檢查異常"""
        is_anomaly, reason = self.threshold_adapter.is_anomaly(metric_name, value)
        threshold = self.threshold_adapter.get_threshold(metric_name)
        
        return {
            "is_anomaly": is_anomaly,
            "reason": reason,
            "value": value,
            "threshold": threshold,
            "checked_at": datetime.now().isoformat()
        }
    
    # ==================== 預測評估 ====================
    
    def evaluate_prediction(
        self,
        prediction_id: str,
        actual_values: List[float]
    ) -> Dict[str, Any]:
        """評估預測準確性"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('SELECT predicted_values FROM prediction_history WHERE id = ?', (prediction_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return {"error": "prediction_not_found"}
        
        predicted = json.loads(row[0])
        
        # 計算誤差指標
        n = min(len(predicted), len(actual_values))
        if n == 0:
            conn.close()
            return {"error": "no_data_to_compare"}
        
        # MAE
        mae = sum(abs(predicted[i] - actual_values[i]) for i in range(n)) / n
        
        # RMSE
        mse = sum((predicted[i] - actual_values[i])**2 for i in range(n)) / n
        rmse = math.sqrt(mse)
        
        # MAPE
        mape = sum(abs((actual_values[i] - predicted[i]) / actual_values[i]) 
                   for i in range(n) if actual_values[i] != 0) / n * 100
        
        accuracy = max(0, 100 - mape)
        
        # 更新預測記錄
        cursor.execute('''
            UPDATE prediction_history SET actual_values = ?, accuracy = ? WHERE id = ?
        ''', (json.dumps(actual_values), accuracy, prediction_id))
        
        conn.commit()
        conn.close()
        
        return {
            "prediction_id": prediction_id,
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "mape": round(mape, 2),
            "accuracy": round(accuracy, 2),
            "sample_size": n
        }
    
    def get_model_performance(self, metric_name: str = None) -> Dict[str, Any]:
        """獲取模型性能統計"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = '''
            SELECT prediction_type, AVG(accuracy), COUNT(*), AVG(confidence)
            FROM prediction_history
            WHERE accuracy IS NOT NULL
        '''
        params = []
        
        if metric_name:
            query += ' AND metric_name = ?'
            params.append(metric_name)
        
        query += ' GROUP BY prediction_type'
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        performance = {}
        for row in rows:
            performance[row[0]] = {
                "avg_accuracy": round(row[1], 2) if row[1] else None,
                "prediction_count": row[2],
                "avg_confidence": round(row[3], 2) if row[3] else None
            }
        
        return {
            "metric_name": metric_name,
            "performance_by_type": performance,
            "generated_at": datetime.now().isoformat()
        }
    
    # ==================== 持久化 ====================
    
    def _save_prediction(self, metric_name: str, result: PredictionResult):
        """保存預測結果"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO prediction_history 
            (id, prediction_type, metric_name, predicted_values, confidence, model_info, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            str(uuid.uuid4()), result.prediction_type.value, metric_name,
            json.dumps(result.predicted_values), result.confidence,
            json.dumps(result.model_info), datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
    
    def _save_pattern(self, metric_name: str, pattern: Dict):
        """保存模式"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        for pattern_type in ['hourly_pattern', 'weekly_pattern', 'trend']:
            if pattern_type in pattern:
                cursor.execute('''
                    INSERT OR REPLACE INTO pattern_records 
                    (id, metric_name, pattern_type, pattern_data, detected_at)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    str(uuid.uuid4()), metric_name, pattern_type,
                    json.dumps(pattern[pattern_type]), datetime.now().isoformat()
                ))
        
        conn.commit()
        conn.close()
    
    def get_saved_patterns(self, metric_name: str) -> List[Dict]:
        """獲取保存的模式"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT pattern_type, pattern_data, detected_at FROM pattern_records
            WHERE metric_name = ?
        ''', (metric_name,))
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "pattern_type": row[0],
            "data": json.loads(row[1]) if row[1] else {},
            "detected_at": row[2]
        } for row in rows]


# 獲取單例
def get_ml_engine() -> MLPredictionEngine:
    return MLPredictionEngine()
