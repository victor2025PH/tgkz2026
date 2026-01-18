"""
預測性分析系統
Predictive Analytics

功能:
1. 轉化概率預測
2. Lead 評分預測
3. 最佳行動預測
4. 流失風險預測
"""

import sys
import math
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict


@dataclass
class LeadFeatures:
    """Lead 特徵"""
    lead_id: int
    
    # 基本特徵
    intent_score: float = 0
    interaction_count: int = 0
    days_since_first_contact: int = 0
    days_since_last_contact: int = 0
    
    # 行為特徵
    replied: bool = False
    reply_speed_minutes: float = 0
    message_length_avg: float = 0
    positive_keywords_count: int = 0
    negative_keywords_count: int = 0
    
    # 來源特徵
    source_type: str = "unknown"
    source_quality_score: float = 0.5
    
    # 時間特徵
    contact_hour: int = 12
    contact_day_of_week: int = 0
    
    @property
    def feature_vector(self) -> List[float]:
        """轉換為特徵向量"""
        return [
            self.intent_score / 100,
            min(self.interaction_count / 10, 1),
            min(self.days_since_first_contact / 30, 1),
            min(self.days_since_last_contact / 7, 1),
            1.0 if self.replied else 0.0,
            min(self.reply_speed_minutes / 60, 1),
            min(self.message_length_avg / 200, 1),
            min(self.positive_keywords_count / 5, 1),
            min(self.negative_keywords_count / 3, 1),
            self.source_quality_score,
            self.contact_hour / 24,
            self.contact_day_of_week / 7
        ]


@dataclass
class Prediction:
    """預測結果"""
    lead_id: int
    conversion_probability: float       # 轉化概率 (0-1)
    churn_risk: float                   # 流失風險 (0-1)
    recommended_action: str             # 推薦行動
    priority_score: float               # 優先級分數 (0-100)
    confidence: float                   # 置信度 (0-1)
    factors: List[str]                  # 影響因素
    next_best_time: Optional[datetime]  # 最佳下次聯繫時間


class PredictiveAnalyzer:
    """預測分析器（使用簡單規則引擎，可替換為 ML 模型）"""
    
    def __init__(self):
        # 特徵權重（可學習調整）
        self.weights = {
            "intent_score": 0.25,
            "interaction_count": 0.15,
            "recency": 0.15,
            "replied": 0.20,
            "reply_speed": 0.10,
            "source_quality": 0.10,
            "keywords": 0.05
        }
        
        # 歷史數據（用於校準）
        self.conversion_history: List[Tuple[LeadFeatures, bool]] = []
    
    def add_historical_data(self, features: LeadFeatures, converted: bool):
        """添加歷史數據"""
        self.conversion_history.append((features, converted))
        
        # 限制歷史數據大小
        if len(self.conversion_history) > 1000:
            self.conversion_history = self.conversion_history[-1000:]
    
    def predict(self, features: LeadFeatures) -> Prediction:
        """預測 Lead 轉化"""
        
        # 計算轉化概率
        conversion_prob = self._calculate_conversion_probability(features)
        
        # 計算流失風險
        churn_risk = self._calculate_churn_risk(features)
        
        # 確定推薦行動
        action, factors = self._determine_best_action(features, conversion_prob, churn_risk)
        
        # 計算優先級分數
        priority = self._calculate_priority(features, conversion_prob, churn_risk)
        
        # 計算最佳聯繫時間
        next_time = self._predict_best_contact_time(features)
        
        # 計算置信度
        confidence = self._calculate_confidence(features)
        
        return Prediction(
            lead_id=features.lead_id,
            conversion_probability=round(conversion_prob, 3),
            churn_risk=round(churn_risk, 3),
            recommended_action=action,
            priority_score=round(priority, 1),
            confidence=round(confidence, 3),
            factors=factors,
            next_best_time=next_time
        )
    
    def _calculate_conversion_probability(self, features: LeadFeatures) -> float:
        """計算轉化概率"""
        prob = 0.0
        
        # 意圖分數影響
        prob += (features.intent_score / 100) * self.weights["intent_score"]
        
        # 互動次數影響（遞減收益）
        interaction_factor = 1 - math.exp(-features.interaction_count / 5)
        prob += interaction_factor * self.weights["interaction_count"]
        
        # 近期聯繫影響（越近越好）
        recency_factor = max(0, 1 - features.days_since_last_contact / 7)
        prob += recency_factor * self.weights["recency"]
        
        # 已回覆大幅提升
        if features.replied:
            prob += self.weights["replied"]
            
            # 回覆速度影響
            if features.reply_speed_minutes > 0:
                speed_factor = max(0, 1 - features.reply_speed_minutes / 60)
                prob += speed_factor * self.weights["reply_speed"]
        
        # 來源質量
        prob += features.source_quality_score * self.weights["source_quality"]
        
        # 關鍵詞影響
        keyword_factor = (features.positive_keywords_count - features.negative_keywords_count * 2) / 5
        keyword_factor = max(-0.5, min(1, keyword_factor))
        prob += keyword_factor * self.weights["keywords"]
        
        # 確保在 0-1 範圍內
        return max(0, min(1, prob))
    
    def _calculate_churn_risk(self, features: LeadFeatures) -> float:
        """計算流失風險"""
        risk = 0.0
        
        # 長時間未聯繫
        if features.days_since_last_contact > 7:
            risk += min(0.4, features.days_since_last_contact / 30)
        
        # 未回覆
        if not features.replied and features.interaction_count > 0:
            risk += 0.2
        
        # 負面關鍵詞
        risk += min(0.2, features.negative_keywords_count * 0.1)
        
        # 低意圖分數
        if features.intent_score < 30:
            risk += 0.2
        
        return max(0, min(1, risk))
    
    def _determine_best_action(
        self,
        features: LeadFeatures,
        conversion_prob: float,
        churn_risk: float
    ) -> Tuple[str, List[str]]:
        """確定最佳行動"""
        factors = []
        
        # 高轉化概率
        if conversion_prob >= 0.7:
            factors.append("高轉化概率")
            return "立即跟進並提供報價", factors
        
        # 高流失風險
        if churn_risk >= 0.6:
            factors.append("高流失風險")
            if features.days_since_last_contact > 3:
                factors.append(f"{features.days_since_last_contact}天未聯繫")
            return "發送挽回消息", factors
        
        # 已回覆但未轉化
        if features.replied and conversion_prob >= 0.4:
            factors.append("已回覆")
            factors.append("中等轉化概率")
            return "深入了解需求", factors
        
        # 中等概率
        if conversion_prob >= 0.4:
            factors.append("中等轉化概率")
            return "發送更多產品資訊", factors
        
        # 新 Lead
        if features.interaction_count == 0:
            factors.append("新客戶")
            return "發送首次問候", factors
        
        # 低概率
        if conversion_prob >= 0.2:
            factors.append("低轉化概率")
            return "加入自動培育流程", factors
        
        factors.append("極低轉化概率")
        return "暫時觀察", factors
    
    def _calculate_priority(
        self,
        features: LeadFeatures,
        conversion_prob: float,
        churn_risk: float
    ) -> float:
        """計算優先級分數"""
        # 基於轉化概率和緊急程度
        priority = conversion_prob * 60
        
        # 高流失風險提升優先級
        if churn_risk > 0.5:
            priority += 20
        
        # 高意圖分數加分
        if features.intent_score >= 70:
            priority += 15
        
        # 已回覆加分
        if features.replied:
            priority += 10
        
        # 近期活躍加分
        if features.days_since_last_contact <= 1:
            priority += 5
        
        return max(0, min(100, priority))
    
    def _predict_best_contact_time(self, features: LeadFeatures) -> datetime:
        """預測最佳聯繫時間"""
        now = datetime.now()
        
        # 如果最近剛聯繫，等待一段時間
        if features.days_since_last_contact == 0:
            return now + timedelta(hours=4)
        
        # 基於歷史聯繫時間
        best_hour = features.contact_hour
        
        # 如果當前時間已過最佳時間，改為明天
        target = now.replace(hour=best_hour, minute=0, second=0, microsecond=0)
        if target <= now:
            target += timedelta(days=1)
        
        return target
    
    def _calculate_confidence(self, features: LeadFeatures) -> float:
        """計算置信度"""
        confidence = 0.5
        
        # 更多互動提高置信度
        confidence += min(0.2, features.interaction_count * 0.05)
        
        # 有回覆提高置信度
        if features.replied:
            confidence += 0.15
        
        # 歷史數據越多越可靠
        history_factor = min(0.15, len(self.conversion_history) / 500 * 0.15)
        confidence += history_factor
        
        return min(1.0, confidence)
    
    def batch_predict(self, features_list: List[LeadFeatures]) -> List[Prediction]:
        """批量預測"""
        return [self.predict(f) for f in features_list]
    
    def get_high_priority_leads(
        self,
        features_list: List[LeadFeatures],
        top_n: int = 10
    ) -> List[Prediction]:
        """獲取高優先級 Lead"""
        predictions = self.batch_predict(features_list)
        predictions.sort(key=lambda p: p.priority_score, reverse=True)
        return predictions[:top_n]
    
    def get_at_risk_leads(
        self,
        features_list: List[LeadFeatures],
        threshold: float = 0.5
    ) -> List[Prediction]:
        """獲取風險 Lead"""
        predictions = self.batch_predict(features_list)
        return [p for p in predictions if p.churn_risk >= threshold]


# 全局實例
_predictor = None

def get_predictor() -> PredictiveAnalyzer:
    """獲取全局預測器"""
    global _predictor
    if _predictor is None:
        _predictor = PredictiveAnalyzer()
    return _predictor


async def predict_lead_conversion(
    lead_id: int,
    intent_score: float = 0,
    interaction_count: int = 0,
    days_since_first_contact: int = 0,
    days_since_last_contact: int = 0,
    replied: bool = False,
    reply_speed_minutes: float = 0,
    source_type: str = "unknown"
) -> Dict[str, Any]:
    """預測 Lead 轉化（異步接口）"""
    predictor = get_predictor()
    
    features = LeadFeatures(
        lead_id=lead_id,
        intent_score=intent_score,
        interaction_count=interaction_count,
        days_since_first_contact=days_since_first_contact,
        days_since_last_contact=days_since_last_contact,
        replied=replied,
        reply_speed_minutes=reply_speed_minutes,
        source_type=source_type
    )
    
    prediction = predictor.predict(features)
    
    return {
        "leadId": prediction.lead_id,
        "conversionProbability": prediction.conversion_probability,
        "churnRisk": prediction.churn_risk,
        "recommendedAction": prediction.recommended_action,
        "priorityScore": prediction.priority_score,
        "confidence": prediction.confidence,
        "factors": prediction.factors,
        "nextBestTime": prediction.next_best_time.isoformat() if prediction.next_best_time else None
    }
