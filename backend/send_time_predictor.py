"""
最佳發送時間預測系統
Best Send Time Predictor

功能:
1. 分析用戶歷史活躍時間
2. 預測最佳發送時間
3. 考慮時區和工作日/週末差異
4. 提供發送時間建議
"""

import sys
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict
import random


@dataclass
class TimeSlot:
    """時間段"""
    hour: int                    # 小時 (0-23)
    day_of_week: int             # 星期幾 (0=週一, 6=週日)
    activity_score: float        # 活躍度分數 (0-1)
    response_rate: float         # 響應率 (0-1)
    avg_response_time: float     # 平均響應時間（秒）


@dataclass
class SendTimePrediction:
    """發送時間預測結果"""
    best_hour: int                           # 最佳發送小時
    best_day: int                            # 最佳發送日
    confidence: float                        # 置信度
    suggested_times: List[datetime]          # 建議的具體時間
    activity_pattern: Dict[int, float]       # 活躍度模式
    reason: str                              # 預測理由
    timestamp: datetime = field(default_factory=datetime.now)


class SendTimePredictor:
    """發送時間預測器"""
    
    def __init__(self):
        # 默認活躍時間模式（基於統計數據）
        # 格式: hour -> activity_score
        self.default_weekday_pattern = {
            0: 0.1, 1: 0.05, 2: 0.02, 3: 0.01, 4: 0.01, 5: 0.02,
            6: 0.15, 7: 0.3, 8: 0.5, 9: 0.7, 10: 0.8, 11: 0.75,
            12: 0.6, 13: 0.65, 14: 0.7, 15: 0.75, 16: 0.7, 17: 0.65,
            18: 0.55, 19: 0.6, 20: 0.7, 21: 0.65, 22: 0.45, 23: 0.25
        }
        
        self.default_weekend_pattern = {
            0: 0.15, 1: 0.1, 2: 0.05, 3: 0.02, 4: 0.01, 5: 0.02,
            6: 0.1, 7: 0.2, 8: 0.35, 9: 0.5, 10: 0.65, 11: 0.75,
            12: 0.7, 13: 0.65, 14: 0.7, 15: 0.75, 16: 0.8, 17: 0.75,
            18: 0.7, 19: 0.75, 20: 0.8, 21: 0.75, 22: 0.6, 23: 0.4
        }
        
        # 用戶活躍數據存儲
        self.user_activity_data: Dict[str, List[datetime]] = defaultdict(list)
        
        # 時區偏移（相對於 UTC）
        self.timezone_offset = 8  # 默認 UTC+8 (中國/香港/台灣)
    
    def record_user_activity(self, user_id: str, activity_time: datetime = None):
        """記錄用戶活躍時間"""
        if activity_time is None:
            activity_time = datetime.now()
        
        self.user_activity_data[user_id].append(activity_time)
        
        # 只保留最近 30 天的數據
        cutoff = datetime.now() - timedelta(days=30)
        self.user_activity_data[user_id] = [
            t for t in self.user_activity_data[user_id] if t > cutoff
        ]
    
    def analyze_user_pattern(self, user_id: str) -> Dict[int, float]:
        """分析用戶活躍模式"""
        activities = self.user_activity_data.get(user_id, [])
        
        if len(activities) < 3:
            # 數據不足，返回默認模式
            now = datetime.now()
            if now.weekday() < 5:  # 工作日
                return self.default_weekday_pattern.copy()
            else:
                return self.default_weekend_pattern.copy()
        
        # 統計每小時的活躍次數
        hour_counts = defaultdict(int)
        for activity_time in activities:
            hour_counts[activity_time.hour] += 1
        
        # 歸一化為 0-1 分數
        max_count = max(hour_counts.values()) if hour_counts else 1
        pattern = {}
        for hour in range(24):
            pattern[hour] = hour_counts.get(hour, 0) / max_count
        
        return pattern
    
    def predict_best_time(
        self,
        user_id: str = None,
        target_date: datetime = None,
        urgency: str = "normal"  # low, normal, high
    ) -> SendTimePrediction:
        """
        預測最佳發送時間
        
        Args:
            user_id: 用戶 ID（可選，用於個性化預測）
            target_date: 目標日期（默認今天）
            urgency: 緊急程度
            
        Returns:
            SendTimePrediction 預測結果
        """
        if target_date is None:
            target_date = datetime.now()
        
        # 獲取活躍模式
        if user_id and user_id in self.user_activity_data:
            pattern = self.analyze_user_pattern(user_id)
            confidence_base = 0.8
            reason = "基於用戶歷史活躍數據"
        else:
            # 使用默認模式
            if target_date.weekday() < 5:
                pattern = self.default_weekday_pattern.copy()
            else:
                pattern = self.default_weekend_pattern.copy()
            confidence_base = 0.5
            reason = "基於統計平均數據"
        
        # 找到最佳時間段
        sorted_hours = sorted(pattern.items(), key=lambda x: x[1], reverse=True)
        best_hour = sorted_hours[0][0]
        best_score = sorted_hours[0][1]
        
        # 根據緊急程度調整
        if urgency == "high":
            # 緊急情況，選擇當前時間之後最近的高活躍時段
            current_hour = datetime.now().hour
            for hour, score in sorted_hours:
                if hour >= current_hour and score >= 0.5:
                    best_hour = hour
                    break
            reason += "（緊急調整）"
        elif urgency == "low":
            # 不緊急，可以選擇次優時段避免打擾
            if len(sorted_hours) > 2:
                best_hour = sorted_hours[2][0]
                best_score = sorted_hours[2][1]
            reason += "（低優先級）"
        
        # 生成建議的具體時間
        suggested_times = self._generate_suggested_times(
            target_date, 
            best_hour, 
            pattern
        )
        
        # 計算置信度
        confidence = confidence_base * (0.5 + best_score * 0.5)
        
        return SendTimePrediction(
            best_hour=best_hour,
            best_day=target_date.weekday(),
            confidence=confidence,
            suggested_times=suggested_times,
            activity_pattern=pattern,
            reason=reason
        )
    
    def _generate_suggested_times(
        self,
        base_date: datetime,
        best_hour: int,
        pattern: Dict[int, float]
    ) -> List[datetime]:
        """生成建議的具體時間"""
        suggestions = []
        
        # 最佳時間
        best_time = base_date.replace(
            hour=best_hour, 
            minute=random.randint(0, 30),
            second=0,
            microsecond=0
        )
        suggestions.append(best_time)
        
        # 添加備選時間（活躍度 >= 0.6 的時段）
        sorted_hours = sorted(pattern.items(), key=lambda x: x[1], reverse=True)
        for hour, score in sorted_hours[1:4]:  # 取前 3 個備選
            if score >= 0.5:
                alt_time = base_date.replace(
                    hour=hour,
                    minute=random.randint(0, 30),
                    second=0,
                    microsecond=0
                )
                suggestions.append(alt_time)
        
        # 按時間排序
        suggestions.sort()
        
        # 過濾掉已過去的時間
        now = datetime.now()
        suggestions = [t for t in suggestions if t > now]
        
        # 如果全部過去，添加明天的時間
        if not suggestions:
            tomorrow = base_date + timedelta(days=1)
            suggestions.append(tomorrow.replace(
                hour=best_hour,
                minute=random.randint(0, 30),
                second=0,
                microsecond=0
            ))
        
        return suggestions[:3]  # 最多返回 3 個建議
    
    def get_next_best_time(
        self,
        user_id: str = None,
        after_minutes: int = 30
    ) -> datetime:
        """
        獲取下一個最佳發送時間（快速接口）
        
        Args:
            user_id: 用戶 ID
            after_minutes: 至少在多少分鐘之後
            
        Returns:
            datetime 建議的發送時間
        """
        now = datetime.now()
        min_time = now + timedelta(minutes=after_minutes)
        
        prediction = self.predict_best_time(user_id, min_time)
        
        if prediction.suggested_times:
            return prediction.suggested_times[0]
        else:
            # 默認 1 小時後
            return now + timedelta(hours=1)


# 全局預測器實例
_predictor = None

def get_send_time_predictor() -> SendTimePredictor:
    """獲取全局預測器實例"""
    global _predictor
    if _predictor is None:
        _predictor = SendTimePredictor()
    return _predictor


async def predict_best_send_time(
    user_id: str = None,
    urgency: str = "normal"
) -> Dict[str, Any]:
    """
    預測最佳發送時間（異步接口）
    
    Returns:
        Dict 包含預測結果
    """
    predictor = get_send_time_predictor()
    result = predictor.predict_best_time(user_id=user_id, urgency=urgency)
    
    return {
        "best_hour": result.best_hour,
        "best_day": result.best_day,
        "confidence": result.confidence,
        "suggested_times": [t.isoformat() for t in result.suggested_times],
        "activity_pattern": result.activity_pattern,
        "reason": result.reason
    }


async def get_next_send_time(
    user_id: str = None,
    after_minutes: int = 30
) -> str:
    """
    獲取下一個最佳發送時間（異步接口）
    
    Returns:
        str ISO 格式的時間字符串
    """
    predictor = get_send_time_predictor()
    next_time = predictor.get_next_best_time(user_id, after_minutes)
    return next_time.isoformat()
