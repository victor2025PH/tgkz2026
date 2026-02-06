"""
智能分配預測系統

功能：
- 基於歷史數據預測未來使用趨勢
- 容量需求預測
- 峰值時段預測
- 智能推薦最優分配時機
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass
from enum import Enum
import statistics

logger = logging.getLogger(__name__)


@dataclass
class PredictionResult:
    """預測結果"""
    predicted_value: float
    confidence: float  # 0-1
    trend: str  # "up", "down", "stable"
    peak_hours: List[int]  # 預測高峰時段
    recommendation: str


class TrendAnalyzer:
    """趨勢分析器"""
    
    @staticmethod
    def moving_average(data: List[float], window: int = 3) -> List[float]:
        """計算移動平均"""
        if len(data) < window:
            return data
        
        result = []
        for i in range(len(data) - window + 1):
            avg = sum(data[i:i+window]) / window
            result.append(avg)
        return result
    
    @staticmethod
    def detect_trend(data: List[float]) -> Tuple[str, float]:
        """
        檢測趨勢
        返回 (趨勢方向, 變化率)
        """
        if len(data) < 3:
            return "stable", 0.0
        
        # 計算簡單線性回歸斜率
        n = len(data)
        x_mean = (n - 1) / 2
        y_mean = sum(data) / n
        
        numerator = sum((i - x_mean) * (data[i] - y_mean) for i in range(n))
        denominator = sum((i - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            return "stable", 0.0
        
        slope = numerator / denominator
        
        # 標準化斜率（相對於平均值）
        if y_mean > 0:
            relative_slope = slope / y_mean
        else:
            relative_slope = slope
        
        if relative_slope > 0.05:
            return "up", relative_slope
        elif relative_slope < -0.05:
            return "down", relative_slope
        else:
            return "stable", relative_slope
    
    @staticmethod
    def find_peak_hours(hourly_data: Dict[int, float]) -> List[int]:
        """找出高峰時段"""
        if not hourly_data:
            return [9, 10, 14, 15, 20, 21]  # 默認高峰時段
        
        avg_value = sum(hourly_data.values()) / len(hourly_data)
        peaks = [hour for hour, value in hourly_data.items() if value > avg_value * 1.3]
        
        return sorted(peaks) if peaks else list(hourly_data.keys())[:3]


class UsagePredictor:
    """使用量預測器"""
    
    def __init__(self, api_pool_manager):
        self.pool = api_pool_manager
        self.analyzer = TrendAnalyzer()
    
    def predict_daily_usage(self, days_ahead: int = 7) -> Dict[str, Any]:
        """
        預測未來每日使用量
        
        Args:
            days_ahead: 預測未來多少天
        """
        # 獲取過去 30 天的每日統計
        try:
            stats = self.pool.get_daily_trend(days=30)
        except:
            stats = []
        
        if len(stats) < 7:
            return {
                "predictions": [],
                "confidence": 0.3,
                "message": "歷史數據不足，預測準確度較低"
            }
        
        # 提取每日分配數
        daily_allocations = [day.get('allocations', 0) for day in stats]
        
        # 趨勢分析
        trend, slope = self.analyzer.detect_trend(daily_allocations)
        
        # 計算移動平均作為基準
        ma = self.analyzer.moving_average(daily_allocations, 7)
        base_value = ma[-1] if ma else statistics.mean(daily_allocations)
        
        # 計算標準差用於置信度
        std_dev = statistics.stdev(daily_allocations) if len(daily_allocations) > 1 else 0
        
        # 生成預測
        predictions = []
        for i in range(1, days_ahead + 1):
            predicted = base_value + (slope * base_value * i)
            predicted = max(0, predicted)  # 不能為負
            
            # 添加星期幾的季節性調整
            future_date = datetime.now() + timedelta(days=i)
            weekday = future_date.weekday()
            
            # 週末通常使用較少
            if weekday >= 5:  # 週六日
                predicted *= 0.85
            elif weekday == 0:  # 週一
                predicted *= 1.1  # 週一通常較忙
            
            predictions.append({
                "date": future_date.strftime("%Y-%m-%d"),
                "weekday": weekday,
                "predicted_allocations": round(predicted),
                "lower_bound": round(max(0, predicted - std_dev)),
                "upper_bound": round(predicted + std_dev)
            })
        
        # 計算置信度
        cv = std_dev / base_value if base_value > 0 else 1  # 變異係數
        confidence = max(0.3, min(0.95, 1 - cv))
        
        return {
            "predictions": predictions,
            "trend": trend,
            "slope": round(slope * 100, 2),  # 轉為百分比
            "confidence": round(confidence, 2),
            "base_value": round(base_value),
            "historical_avg": round(statistics.mean(daily_allocations)),
            "historical_std": round(std_dev, 1)
        }
    
    def predict_capacity_needs(self, target_days: int = 30) -> Dict[str, Any]:
        """
        預測容量需求
        
        預測在未來 N 天內需要多少 API 容量
        """
        # 獲取當前狀態
        try:
            pool_health = self.pool.get_pool_health()
        except:
            pool_health = {}
        
        current_capacity = pool_health.get('total_max_accounts', 100)
        current_used = pool_health.get('total_accounts', 0)
        available = current_capacity - current_used
        
        # 預測未來使用量
        prediction = self.predict_daily_usage(target_days)
        
        total_predicted_allocations = sum(
            p.get('predicted_allocations', 0) 
            for p in prediction.get('predictions', [])
        )
        
        # 考慮釋放率（假設平均帳號生命週期 7 天）
        release_rate = 0.14  # 每天約 14% 會被釋放
        net_growth = total_predicted_allocations * (1 - release_rate * target_days / 2)
        
        # 計算預測使用量
        predicted_used = current_used + net_growth
        predicted_used = max(current_used, predicted_used)  # 不會比當前少
        
        # 計算需要的額外容量
        buffer_ratio = 1.2  # 20% 緩衝
        needed_capacity = predicted_used * buffer_ratio
        additional_needed = max(0, needed_capacity - current_capacity)
        
        # 預測容量耗盡日期
        if prediction['trend'] == 'up' and available > 0:
            daily_net_growth = net_growth / target_days
            if daily_net_growth > 0:
                days_until_full = available / daily_net_growth
            else:
                days_until_full = 999
        else:
            days_until_full = 999 if available > 0 else 0
        
        # 生成建議
        recommendations = []
        if additional_needed > 0:
            recommendations.append(f"建議增加至少 {round(additional_needed)} 個 API 容量槽位")
        
        if days_until_full < 30:
            recommendations.append(f"⚠️ 預計 {round(days_until_full)} 天後容量耗盡")
        
        if prediction['trend'] == 'up':
            recommendations.append("📈 使用量呈上升趨勢，建議提前擴容")
        elif prediction['trend'] == 'down':
            recommendations.append("📉 使用量呈下降趨勢，可適當延後擴容")
        
        utilization = (current_used / current_capacity * 100) if current_capacity > 0 else 0
        if utilization > 80:
            recommendations.append("⚡ 當前使用率超過 80%，建議立即擴容")
        
        return {
            "current_capacity": current_capacity,
            "current_used": current_used,
            "current_available": available,
            "current_utilization": round(utilization, 1),
            "predicted_used_in_days": round(predicted_used),
            "additional_capacity_needed": round(additional_needed),
            "days_until_full": round(days_until_full) if days_until_full < 999 else None,
            "trend": prediction['trend'],
            "confidence": prediction['confidence'],
            "recommendations": recommendations
        }
    
    def find_optimal_allocation_time(self) -> Dict[str, Any]:
        """
        找出最佳分配時間
        
        分析歷史數據，找出成功率最高的時段
        """
        # 獲取過去 7 天的每小時統計
        try:
            hourly_stats = self.pool.get_hourly_stats(hours=168)  # 7 天
        except:
            hourly_stats = []
        
        if not hourly_stats:
            return {
                "peak_hours": [9, 10, 14, 15, 20, 21],
                "optimal_hours": [2, 3, 4, 5, 6],
                "message": "數據不足，使用默認推薦",
                "confidence": 0.3
            }
        
        # 按小時聚合
        hour_allocations = {}
        hour_successes = {}
        hour_failures = {}
        
        for stat in hourly_stats:
            hour = stat.get('hour', 0)
            if hour not in hour_allocations:
                hour_allocations[hour] = 0
                hour_successes[hour] = 0
                hour_failures[hour] = 0
            
            hour_allocations[hour] += stat.get('allocations', 0)
            hour_successes[hour] += stat.get('successes', 0)
            hour_failures[hour] += stat.get('failures', 0)
        
        # 計算每小時成功率
        hour_success_rates = {}
        for hour in range(24):
            total = hour_successes.get(hour, 0) + hour_failures.get(hour, 0)
            if total > 0:
                hour_success_rates[hour] = hour_successes.get(hour, 0) / total
            else:
                hour_success_rates[hour] = 1.0  # 無數據視為 100%
        
        # 找出高峰時段（分配量最高的）
        peak_hours = self.analyzer.find_peak_hours(hour_allocations)
        
        # 找出最佳時段（成功率高且負載低）
        hour_scores = {}
        for hour in range(24):
            load = hour_allocations.get(hour, 0)
            max_load = max(hour_allocations.values()) if hour_allocations else 1
            load_factor = 1 - (load / max_load) if max_load > 0 else 1
            
            success_rate = hour_success_rates.get(hour, 1.0)
            
            # 綜合評分：成功率 * 0.6 + 低負載 * 0.4
            hour_scores[hour] = success_rate * 0.6 + load_factor * 0.4
        
        # 排序找出最佳時段
        optimal_hours = sorted(hour_scores.keys(), key=lambda h: hour_scores[h], reverse=True)[:6]
        optimal_hours = sorted(optimal_hours)  # 按時間順序
        
        return {
            "peak_hours": peak_hours,
            "peak_load_times": [f"{h}:00" for h in peak_hours],
            "optimal_hours": optimal_hours,
            "optimal_allocation_times": [f"{h}:00" for h in optimal_hours],
            "hour_success_rates": {h: round(r * 100, 1) for h, r in hour_success_rates.items()},
            "hour_allocations": hour_allocations,
            "recommendation": f"建議在 {', '.join(f'{h}:00' for h in optimal_hours[:3])} 進行大批量分配",
            "confidence": 0.7 if len(hourly_stats) >= 100 else 0.5
        }
    
    def get_prediction_report(self) -> Dict[str, Any]:
        """生成完整預測報告"""
        daily = self.predict_daily_usage(14)
        capacity = self.predict_capacity_needs(30)
        timing = self.find_optimal_allocation_time()
        
        # 綜合風險評估
        risk_level = "low"
        risk_factors = []
        
        if capacity.get('days_until_full') and capacity['days_until_full'] < 14:
            risk_level = "high"
            risk_factors.append("容量即將耗盡")
        elif capacity.get('days_until_full') and capacity['days_until_full'] < 30:
            risk_level = "medium"
            risk_factors.append("容量較緊張")
        
        if capacity.get('current_utilization', 0) > 90:
            risk_level = "high"
            risk_factors.append("使用率過高")
        elif capacity.get('current_utilization', 0) > 75:
            if risk_level != "high":
                risk_level = "medium"
            risk_factors.append("使用率較高")
        
        if daily.get('trend') == 'up' and daily.get('slope', 0) > 10:
            if risk_level != "high":
                risk_level = "medium"
            risk_factors.append("使用量快速增長")
        
        return {
            "generated_at": datetime.now().isoformat(),
            "daily_prediction": daily,
            "capacity_prediction": capacity,
            "timing_analysis": timing,
            "risk_assessment": {
                "level": risk_level,
                "factors": risk_factors
            },
            "overall_confidence": round(
                (daily.get('confidence', 0.5) + capacity.get('confidence', 0.5)) / 2, 2
            )
        }
