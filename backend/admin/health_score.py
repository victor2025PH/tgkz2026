"""
API 健康評分系統

功能：
- 綜合評估 API 質量（成功率、穩定性、負載）
- 自動計算健康分數（0-100）
- 趨勢分析和異常檢測
- 自動降級/升級建議
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class HealthGrade(str, Enum):
    """健康等級"""
    EXCELLENT = "excellent"    # 90-100
    GOOD = "good"              # 70-89
    FAIR = "fair"              # 50-69
    POOR = "poor"              # 30-49
    CRITICAL = "critical"      # 0-29


@dataclass
class HealthMetrics:
    """健康指標"""
    success_rate: float = 100.0        # 成功率（0-100）
    stability_score: float = 100.0     # 穩定性評分（基於連續失敗次數）
    load_score: float = 100.0          # 負載評分（基於使用率）
    recent_trend: float = 0.0          # 近期趨勢（正=改善，負=惡化）
    days_since_failure: int = 999      # 距離上次失敗的天數
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "success_rate": round(self.success_rate, 1),
            "stability_score": round(self.stability_score, 1),
            "load_score": round(self.load_score, 1),
            "recent_trend": round(self.recent_trend, 2),
            "days_since_failure": self.days_since_failure
        }


class HealthScoreCalculator:
    """
    健康評分計算器
    
    評分權重：
    - 成功率: 40%
    - 穩定性: 30%
    - 負載: 20%
    - 趨勢: 10%
    """
    
    WEIGHTS = {
        "success_rate": 0.40,
        "stability": 0.30,
        "load": 0.20,
        "trend": 0.10
    }
    
    # 閾值配置
    THRESHOLDS = {
        "consecutive_failures_penalty": 20,  # 每次連續失敗扣分
        "high_load_threshold": 80,           # 高負載閾值(%)
        "critical_load_threshold": 95,       # 臨界負載閾值(%)
        "recent_days": 7                     # 趨勢計算的天數
    }
    
    @classmethod
    def calculate_score(cls, api_data: Dict[str, Any], recent_stats: List[Dict] = None) -> Tuple[float, HealthGrade, HealthMetrics]:
        """
        計算 API 健康評分
        
        Args:
            api_data: API 數據（包含 success_count, fail_count, current_accounts 等）
            recent_stats: 最近的統計數據（用於趨勢分析）
            
        Returns:
            (分數, 等級, 詳細指標)
        """
        metrics = HealthMetrics()
        
        # 1. 計算成功率評分 (0-100)
        total_ops = api_data.get('success_count', 0) + api_data.get('fail_count', 0)
        if total_ops > 0:
            metrics.success_rate = (api_data.get('success_count', 0) / total_ops) * 100
        else:
            metrics.success_rate = 100.0  # 無操作視為滿分
        
        # 2. 計算穩定性評分 (0-100)
        consecutive_failures = api_data.get('consecutive_failures', 0) or 0
        metrics.stability_score = max(0, 100 - consecutive_failures * cls.THRESHOLDS["consecutive_failures_penalty"])
        
        # 計算距離上次失敗的天數
        last_error_at = api_data.get('last_error_at')
        if last_error_at:
            try:
                last_error_date = datetime.fromisoformat(last_error_at)
                metrics.days_since_failure = (datetime.now() - last_error_date).days
            except:
                pass
        
        # 3. 計算負載評分 (0-100)
        max_accounts = api_data.get('max_accounts', 1) or 1
        current_accounts = api_data.get('current_accounts', 0) or 0
        load_percent = (current_accounts / max_accounts) * 100
        
        if load_percent >= cls.THRESHOLDS["critical_load_threshold"]:
            metrics.load_score = 20  # 臨界負載
        elif load_percent >= cls.THRESHOLDS["high_load_threshold"]:
            metrics.load_score = 50 + (100 - load_percent)  # 高負載
        else:
            metrics.load_score = 100 - (load_percent * 0.3)  # 正常範圍
        
        # 4. 計算趨勢評分
        if recent_stats and len(recent_stats) >= 2:
            # 比較最近的成功/失敗比率變化
            recent_half = recent_stats[:len(recent_stats)//2]
            older_half = recent_stats[len(recent_stats)//2:]
            
            recent_success = sum(s.get('successes', 0) for s in recent_half)
            recent_fail = sum(s.get('failures', 0) for s in recent_half)
            older_success = sum(s.get('successes', 0) for s in older_half)
            older_fail = sum(s.get('failures', 0) for s in older_half)
            
            recent_rate = recent_success / (recent_success + recent_fail + 1)
            older_rate = older_success / (older_success + older_fail + 1)
            
            metrics.recent_trend = (recent_rate - older_rate) * 100
        
        # 計算綜合評分
        trend_score = 50 + metrics.recent_trend  # 趨勢轉換為 0-100 分
        trend_score = max(0, min(100, trend_score))
        
        final_score = (
            metrics.success_rate * cls.WEIGHTS["success_rate"] +
            metrics.stability_score * cls.WEIGHTS["stability"] +
            metrics.load_score * cls.WEIGHTS["load"] +
            trend_score * cls.WEIGHTS["trend"]
        )
        
        # 特殊情況處理
        status = api_data.get('status', 'available')
        if status == 'banned':
            final_score = min(final_score, 20)  # 封禁狀態最高 20 分
        elif status == 'disabled':
            final_score = min(final_score, 30)  # 禁用狀態最高 30 分
        
        # 確定等級
        grade = cls._score_to_grade(final_score)
        
        return round(final_score, 1), grade, metrics
    
    @classmethod
    def _score_to_grade(cls, score: float) -> HealthGrade:
        """分數轉等級"""
        if score >= 90:
            return HealthGrade.EXCELLENT
        elif score >= 70:
            return HealthGrade.GOOD
        elif score >= 50:
            return HealthGrade.FAIR
        elif score >= 30:
            return HealthGrade.POOR
        else:
            return HealthGrade.CRITICAL
    
    @classmethod
    def get_recommendation(cls, score: float, grade: HealthGrade, metrics: HealthMetrics) -> List[str]:
        """根據評分給出建議"""
        recommendations = []
        
        if metrics.success_rate < 80:
            recommendations.append("⚠️ 成功率低於 80%，建議檢查 API 憑據有效性")
        
        if metrics.stability_score < 60:
            recommendations.append("⚠️ 穩定性較低，存在連續失敗情況，建議暫時禁用並排查")
        
        if metrics.load_score < 50:
            recommendations.append("⚠️ 負載過高，建議減少該 API 的新分配或增加 max_accounts")
        
        if metrics.recent_trend < -10:
            recommendations.append("⚠️ 近期表現下降明顯，建議密切監控")
        
        if grade == HealthGrade.CRITICAL:
            recommendations.append("🚨 健康狀況危急，強烈建議立即禁用並檢查")
        elif grade == HealthGrade.POOR:
            recommendations.append("⚡ 健康狀況較差，建議優先排查問題")
        
        if not recommendations:
            if grade == HealthGrade.EXCELLENT:
                recommendations.append("✅ 運行狀況優秀，無需調整")
            else:
                recommendations.append("✓ 運行狀況正常")
        
        return recommendations


class HealthMonitor:
    """
    健康監控器
    用於定期檢查和更新所有 API 的健康狀態
    """
    
    def __init__(self, api_pool_manager):
        self.pool = api_pool_manager
    
    def get_all_health_scores(self) -> List[Dict[str, Any]]:
        """獲取所有 API 的健康評分"""
        apis = self.pool.get_all_apis(include_hash=False)
        results = []
        
        for api in apis:
            # 獲取最近統計（如果可用）
            try:
                recent_stats = self.pool.get_hourly_stats(hours=168, api_id=api['api_id'])  # 7 天
            except:
                recent_stats = []
            
            score, grade, metrics = HealthScoreCalculator.calculate_score(api, recent_stats)
            recommendations = HealthScoreCalculator.get_recommendation(score, grade, metrics)
            
            results.append({
                "api_id": api['api_id'],
                "name": api.get('name', ''),
                "status": api.get('status', 'unknown'),
                "health_score": score,
                "health_grade": grade.value,
                "metrics": metrics.to_dict(),
                "recommendations": recommendations,
                "group_id": api.get('group_id')
            })
        
        # 按健康分數排序（低分優先，便於關注問題 API）
        results.sort(key=lambda x: x['health_score'])
        
        return results
    
    def get_health_summary(self) -> Dict[str, Any]:
        """獲取健康摘要"""
        all_scores = self.get_all_health_scores()
        
        grade_counts = {grade.value: 0 for grade in HealthGrade}
        total_score = 0
        critical_apis = []
        
        for api in all_scores:
            grade_counts[api['health_grade']] += 1
            total_score += api['health_score']
            
            if api['health_grade'] in ('critical', 'poor'):
                critical_apis.append({
                    "api_id": api['api_id'],
                    "name": api['name'],
                    "score": api['health_score'],
                    "grade": api['health_grade']
                })
        
        avg_score = total_score / len(all_scores) if all_scores else 0
        
        return {
            "total_apis": len(all_scores),
            "average_score": round(avg_score, 1),
            "overall_grade": HealthScoreCalculator._score_to_grade(avg_score).value,
            "grade_distribution": grade_counts,
            "critical_apis": critical_apis[:10],  # 最多顯示 10 個
            "needs_attention": len(critical_apis)
        }
    
    def detect_anomalies(self) -> List[Dict[str, Any]]:
        """檢測異常 API"""
        all_scores = self.get_all_health_scores()
        anomalies = []
        
        for api in all_scores:
            metrics = api['metrics']
            issues = []
            
            # 檢測各種異常
            if metrics['success_rate'] < 50:
                issues.append("嚴重低成功率")
            
            if metrics['stability_score'] < 40:
                issues.append("穩定性危機")
            
            if metrics['recent_trend'] < -20:
                issues.append("性能急劇下降")
            
            if api['health_grade'] == 'critical':
                issues.append("整體健康危急")
            
            if issues:
                anomalies.append({
                    "api_id": api['api_id'],
                    "name": api['name'],
                    "score": api['health_score'],
                    "issues": issues,
                    "recommendations": api['recommendations']
                })
        
        return anomalies
