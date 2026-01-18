"""
時段效果分析系統
Time-based Performance Analysis

功能:
1. 分析不同時間段的效果
2. 最佳發送時間識別
3. 星期效果對比
4. 趨勢分析
"""

import sys
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict


@dataclass
class TimeSlotStats:
    """時間段統計"""
    hour: int = 0                       # 小時 (0-23)
    day_of_week: int = 0                # 星期幾 (0=週一)
    
    messages_sent: int = 0
    responses_received: int = 0
    conversions: int = 0
    total_response_time: float = 0.0    # 總響應時間（秒）
    
    @property
    def response_rate(self) -> float:
        return self.responses_received / self.messages_sent if self.messages_sent > 0 else 0
    
    @property
    def conversion_rate(self) -> float:
        return self.conversions / self.messages_sent if self.messages_sent > 0 else 0
    
    @property
    def avg_response_time(self) -> float:
        return self.total_response_time / self.responses_received if self.responses_received > 0 else 0
    
    @property
    def effectiveness_score(self) -> float:
        """效果分數 (0-100)"""
        resp_score = self.response_rate * 50
        conv_score = self.conversion_rate * 100
        time_score = max(0, 10 - self.avg_response_time / 3600) * 2  # 響應越快越好
        return min(100, resp_score + conv_score + time_score)


class TimeAnalyzer:
    """時段分析器"""
    
    def __init__(self):
        # 按小時統計
        self.hourly_stats: Dict[int, TimeSlotStats] = {
            h: TimeSlotStats(hour=h) for h in range(24)
        }
        
        # 按星期統計
        self.daily_stats: Dict[int, TimeSlotStats] = {
            d: TimeSlotStats(day_of_week=d) for d in range(7)
        }
        
        # 按日期統計（用於趨勢）
        self.date_stats: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            "messages_sent": 0,
            "responses": 0,
            "conversions": 0
        })
    
    def record_message(
        self,
        sent_at: datetime = None,
        got_response: bool = False,
        response_time_seconds: float = 0,
        converted: bool = False
    ):
        """記錄消息"""
        if sent_at is None:
            sent_at = datetime.now()
        
        hour = sent_at.hour
        day_of_week = sent_at.weekday()
        date_str = sent_at.strftime("%Y-%m-%d")
        
        # 更新小時統計
        self.hourly_stats[hour].messages_sent += 1
        if got_response:
            self.hourly_stats[hour].responses_received += 1
            self.hourly_stats[hour].total_response_time += response_time_seconds
        if converted:
            self.hourly_stats[hour].conversions += 1
        
        # 更新星期統計
        self.daily_stats[day_of_week].messages_sent += 1
        if got_response:
            self.daily_stats[day_of_week].responses_received += 1
            self.daily_stats[day_of_week].total_response_time += response_time_seconds
        if converted:
            self.daily_stats[day_of_week].conversions += 1
        
        # 更新日期統計
        self.date_stats[date_str]["messages_sent"] += 1
        if got_response:
            self.date_stats[date_str]["responses"] += 1
        if converted:
            self.date_stats[date_str]["conversions"] += 1
    
    def get_hourly_analysis(self) -> Dict[str, Any]:
        """獲取小時分析"""
        hours_data = []
        best_hour = None
        best_score = -1
        
        for hour in range(24):
            stats = self.hourly_stats[hour]
            score = stats.effectiveness_score
            
            hours_data.append({
                "hour": hour,
                "label": f"{hour:02d}:00",
                "messagesSent": stats.messages_sent,
                "responses": stats.responses_received,
                "conversions": stats.conversions,
                "responseRate": round(stats.response_rate * 100, 1),
                "conversionRate": round(stats.conversion_rate * 100, 1),
                "avgResponseTime": round(stats.avg_response_time / 60, 1),  # 轉為分鐘
                "effectivenessScore": round(score, 1)
            })
            
            if score > best_score and stats.messages_sent >= 5:  # 最少 5 條消息才算
                best_score = score
                best_hour = hour
        
        # 找出高峰時段
        peak_hours = sorted(hours_data, key=lambda x: x["effectivenessScore"], reverse=True)[:3]
        off_peak_hours = sorted(hours_data, key=lambda x: x["effectivenessScore"])[:3]
        
        return {
            "data": hours_data,
            "bestHour": best_hour,
            "bestHourLabel": f"{best_hour:02d}:00" if best_hour is not None else None,
            "peakHours": [h["hour"] for h in peak_hours if h["messagesSent"] >= 5],
            "offPeakHours": [h["hour"] for h in off_peak_hours if h["messagesSent"] >= 5]
        }
    
    def get_daily_analysis(self) -> Dict[str, Any]:
        """獲取星期分析"""
        day_names = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"]
        days_data = []
        best_day = None
        best_score = -1
        
        for day in range(7):
            stats = self.daily_stats[day]
            score = stats.effectiveness_score
            
            days_data.append({
                "day": day,
                "label": day_names[day],
                "isWeekend": day >= 5,
                "messagesSent": stats.messages_sent,
                "responses": stats.responses_received,
                "conversions": stats.conversions,
                "responseRate": round(stats.response_rate * 100, 1),
                "conversionRate": round(stats.conversion_rate * 100, 1),
                "avgResponseTime": round(stats.avg_response_time / 60, 1),
                "effectivenessScore": round(score, 1)
            })
            
            if score > best_score and stats.messages_sent >= 5:
                best_score = score
                best_day = day
        
        # 工作日 vs 週末對比
        weekday_stats = [self.daily_stats[d] for d in range(5)]
        weekend_stats = [self.daily_stats[d] for d in range(5, 7)]
        
        weekday_total = sum(s.messages_sent for s in weekday_stats)
        weekday_responses = sum(s.responses_received for s in weekday_stats)
        weekend_total = sum(s.messages_sent for s in weekend_stats)
        weekend_responses = sum(s.responses_received for s in weekend_stats)
        
        return {
            "data": days_data,
            "bestDay": best_day,
            "bestDayLabel": day_names[best_day] if best_day is not None else None,
            "weekdayVsWeekend": {
                "weekday": {
                    "messagesSent": weekday_total,
                    "responses": weekday_responses,
                    "responseRate": round(weekday_responses / weekday_total * 100, 1) if weekday_total > 0 else 0
                },
                "weekend": {
                    "messagesSent": weekend_total,
                    "responses": weekend_responses,
                    "responseRate": round(weekend_responses / weekend_total * 100, 1) if weekend_total > 0 else 0
                }
            }
        }
    
    def get_trend_analysis(self, days: int = 30) -> Dict[str, Any]:
        """獲取趨勢分析"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        trend_data = []
        current_date = start_date
        
        while current_date <= end_date:
            date_str = current_date.strftime("%Y-%m-%d")
            stats = self.date_stats.get(date_str, {
                "messages_sent": 0,
                "responses": 0,
                "conversions": 0
            })
            
            messages = stats.get("messages_sent", 0)
            responses = stats.get("responses", 0)
            conversions = stats.get("conversions", 0)
            
            trend_data.append({
                "date": date_str,
                "messagesSent": messages,
                "responses": responses,
                "conversions": conversions,
                "responseRate": round(responses / messages * 100, 1) if messages > 0 else 0
            })
            
            current_date += timedelta(days=1)
        
        # 計算趨勢
        if len(trend_data) >= 7:
            recent_7d = trend_data[-7:]
            previous_7d = trend_data[-14:-7] if len(trend_data) >= 14 else trend_data[:7]
            
            recent_responses = sum(d["responses"] for d in recent_7d)
            previous_responses = sum(d["responses"] for d in previous_7d)
            
            if previous_responses > 0:
                trend_change = (recent_responses - previous_responses) / previous_responses * 100
            else:
                trend_change = 100 if recent_responses > 0 else 0
        else:
            trend_change = 0
        
        return {
            "data": trend_data,
            "periodDays": days,
            "totalMessages": sum(d["messagesSent"] for d in trend_data),
            "totalResponses": sum(d["responses"] for d in trend_data),
            "totalConversions": sum(d["conversions"] for d in trend_data),
            "trendChange": round(trend_change, 1),
            "trendDirection": "up" if trend_change > 5 else ("down" if trend_change < -5 else "stable")
        }
    
    def get_best_times(self) -> Dict[str, Any]:
        """獲取最佳時間建議"""
        hourly = self.get_hourly_analysis()
        daily = self.get_daily_analysis()
        
        # 組合最佳時間
        best_combinations = []
        
        for day_data in daily["data"]:
            if day_data["messagesSent"] < 5:
                continue
            
            for hour_data in hourly["data"]:
                if hour_data["messagesSent"] < 5:
                    continue
                
                combined_score = (day_data["effectivenessScore"] + hour_data["effectivenessScore"]) / 2
                best_combinations.append({
                    "day": day_data["day"],
                    "dayLabel": day_data["label"],
                    "hour": hour_data["hour"],
                    "hourLabel": hour_data["label"],
                    "combinedScore": round(combined_score, 1)
                })
        
        best_combinations.sort(key=lambda x: x["combinedScore"], reverse=True)
        
        return {
            "bestHour": hourly["bestHour"],
            "bestDay": daily["bestDay"],
            "peakHours": hourly["peakHours"],
            "topCombinations": best_combinations[:5],
            "recommendation": self._generate_recommendation(hourly, daily)
        }
    
    def _generate_recommendation(
        self,
        hourly: Dict[str, Any],
        daily: Dict[str, Any]
    ) -> str:
        """生成時間建議"""
        day_names = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"]
        
        best_day = daily.get("bestDay")
        best_hour = hourly.get("bestHour")
        peak_hours = hourly.get("peakHours", [])
        
        parts = []
        
        if best_day is not None:
            parts.append(f"最佳發送日：{day_names[best_day]}")
        
        if best_hour is not None:
            parts.append(f"最佳發送時間：{best_hour:02d}:00")
        
        if peak_hours:
            peak_str = ", ".join([f"{h:02d}:00" for h in peak_hours[:3]])
            parts.append(f"高效時段：{peak_str}")
        
        weekday_vs = daily.get("weekdayVsWeekend", {})
        weekday_rate = weekday_vs.get("weekday", {}).get("responseRate", 0)
        weekend_rate = weekday_vs.get("weekend", {}).get("responseRate", 0)
        
        if weekday_rate > weekend_rate + 10:
            parts.append("建議優先在工作日發送")
        elif weekend_rate > weekday_rate + 10:
            parts.append("建議優先在週末發送")
        
        return " | ".join(parts) if parts else "數據不足，請繼續收集更多數據"


# 全局實例
_time_analyzer = None

def get_time_analyzer() -> TimeAnalyzer:
    """獲取全局時段分析器"""
    global _time_analyzer
    if _time_analyzer is None:
        _time_analyzer = TimeAnalyzer()
    return _time_analyzer


async def analyze_time_effectiveness() -> Dict[str, Any]:
    """分析時段效果（異步接口）"""
    analyzer = get_time_analyzer()
    
    return {
        "hourly": analyzer.get_hourly_analysis(),
        "daily": analyzer.get_daily_analysis(),
        "trend": analyzer.get_trend_analysis(),
        "bestTimes": analyzer.get_best_times()
    }
