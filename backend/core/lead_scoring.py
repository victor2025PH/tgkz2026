"""
🔧 P12-1: 線索自動評分引擎

基於可配置規則對 unified_contacts 中的線索進行自動評分。

評分維度：
1. 資料完整度 (0-20分)
2. 互動活躍度 (0-25分)  
3. 意向信號 (0-30分)
4. 賬號質量 (0-15分)
5. 時效性 (0-10分)

總分 0-100 → 自動映射意向等級：
  hot(>75) / warm(50-75) / neutral(25-50) / cold(<25)
"""

import logging
import time
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


# ==================== 評分規則配置 ====================

@dataclass
class ScoringRule:
    """評分規則"""
    name: str
    category: str  # profile, engagement, intent, quality, recency
    weight: float
    max_points: float
    description: str = ''


# 默認評分規則
DEFAULT_RULES: List[Dict[str, Any]] = [
    # 資料完整度 (max 20)
    {'field': 'has_username',      'points': 5,  'category': 'profile', 'desc': '有用戶名'},
    {'field': 'has_display_name',  'points': 3,  'category': 'profile', 'desc': '有顯示名稱'},
    {'field': 'has_phone',         'points': 5,  'category': 'profile', 'desc': '有手機號碼'},
    {'field': 'has_bio',           'points': 3,  'category': 'profile', 'desc': '有個人簡介'},
    {'field': 'has_photo',         'points': 2,  'category': 'profile', 'desc': '有頭像'},
    {'field': 'is_premium',        'points': 2,  'category': 'profile', 'desc': '高級會員'},

    # 互動活躍度 (max 25)
    {'field': 'has_messages',      'points': 10, 'category': 'engagement', 'desc': '有消息記錄'},
    {'field': 'high_interaction',  'points': 8,  'category': 'engagement', 'desc': '互動次數 >5'},
    {'field': 'has_response',      'points': 7,  'category': 'engagement', 'desc': '有回覆'},

    # 意向信號 (max 30)
    {'field': 'keyword_match',     'points': 15, 'category': 'intent', 'desc': '匹配關鍵詞'},
    {'field': 'multi_keyword',     'points': 5,  'category': 'intent', 'desc': '多關鍵詞匹配'},
    {'field': 'in_target_group',   'points': 10, 'category': 'intent', 'desc': '在目標群組中'},

    # 賬號質量 (max 15)
    {'field': 'not_bot',           'points': 5,  'category': 'quality', 'desc': '非機器人'},
    {'field': 'low_risk',          'points': 5,  'category': 'quality', 'desc': '低風險'},
    {'field': 'verified',          'points': 3,  'category': 'quality', 'desc': '已驗證'},
    {'field': 'mature_account',    'points': 2,  'category': 'quality', 'desc': '賬號年齡>30天'},

    # 時效性 (max 10)
    {'field': 'recent_online',     'points': 5,  'category': 'recency', 'desc': '最近在線'},
    {'field': 'recent_capture',    'points': 5,  'category': 'recency', 'desc': '最近捕獲'},
]


class LeadScoringEngine:
    """線索評分引擎"""

    INTENT_LEVELS = {
        'hot':     (75, 100),
        'warm':    (50, 74),
        'neutral': (25, 49),
        'cold':    (0, 24),
    }

    VALUE_LEVELS = {
        'A': 75,  # >= 75
        'B': 50,  # >= 50
        'C': 0,   # < 50
    }

    def __init__(self, rules: List[Dict[str, Any]] = None):
        self.rules = rules or DEFAULT_RULES

    def score_lead(self, lead: Dict[str, Any]) -> Dict[str, Any]:
        """
        對單個線索進行評分

        Args:
            lead: unified_contacts 記錄字典

        Returns:
            {
                'lead_score': int (0-100),
                'intent_level': str,
                'value_level': str,
                'intent_score': int,
                'quality_score': int,
                'activity_score': float,
                'breakdown': { category: points },
                'matched_rules': [ str ],
            }
        """
        breakdown = {'profile': 0, 'engagement': 0, 'intent': 0, 'quality': 0, 'recency': 0}
        matched_rules = []

        for rule in self.rules:
            field_name = rule['field']
            if self._evaluate_rule(field_name, lead):
                category = rule['category']
                breakdown[category] += rule['points']
                matched_rules.append(rule.get('desc', field_name))

        # 確保各分類不超過上限
        caps = {'profile': 20, 'engagement': 25, 'intent': 30, 'quality': 15, 'recency': 10}
        for cat in breakdown:
            breakdown[cat] = min(breakdown[cat], caps.get(cat, 100))

        total_score = sum(breakdown.values())
        total_score = min(total_score, 100)

        intent_level = self._score_to_intent(total_score)
        value_level = self._score_to_value(total_score)

        return {
            'lead_score': total_score,
            'intent_level': intent_level,
            'value_level': value_level,
            'intent_score': breakdown['intent'],
            'quality_score': breakdown['quality'],
            'activity_score': round(breakdown['engagement'] / 25.0, 2),
            'breakdown': breakdown,
            'matched_rules': matched_rules,
        }

    def _evaluate_rule(self, field: str, lead: Dict[str, Any]) -> bool:
        """評估單條規則"""
        try:
            if field == 'has_username':
                return bool(lead.get('username') or lead.get('telegram_username'))
            elif field == 'has_display_name':
                return bool(lead.get('display_name') or lead.get('first_name'))
            elif field == 'has_phone':
                return bool(lead.get('phone'))
            elif field == 'has_bio':
                return bool(lead.get('bio'))
            elif field == 'has_photo':
                return lead.get('has_photo', False) in (True, 1, '1', 'true')
            elif field == 'is_premium':
                return lead.get('is_premium', False) in (True, 1, '1', 'true')
            elif field == 'has_messages':
                return (lead.get('message_count', 0) or 0) > 0
            elif field == 'high_interaction':
                return (lead.get('interactions_count', 0) or 0) > 5
            elif field == 'has_response':
                return (lead.get('messages_received', 0) or 0) > 0
            elif field == 'keyword_match':
                kw = lead.get('matched_keywords') or lead.get('triggered_keyword', '')
                return bool(kw and kw != '[]' and kw != 'null')
            elif field == 'multi_keyword':
                kw = lead.get('matched_keywords', '')
                if isinstance(kw, str) and kw.startswith('['):
                    import json
                    try:
                        return len(json.loads(kw)) > 1
                    except Exception:
                        return False
                return False
            elif field == 'in_target_group':
                return bool(lead.get('source_group_id') or lead.get('source_group_title'))
            elif field == 'not_bot':
                return lead.get('is_bot', False) not in (True, 1, '1', 'true')
            elif field == 'low_risk':
                risk = lead.get('ad_risk_score', 0) or 0
                return float(risk) < 0.3
            elif field == 'verified':
                return lead.get('is_verified', False) in (True, 1, '1', 'true')
            elif field == 'mature_account':
                age = lead.get('account_age_days', 0) or 0
                return int(age) > 30
            elif field == 'recent_online':
                last_seen = lead.get('last_seen') or lead.get('last_online', '')
                if not last_seen:
                    return False
                from datetime import datetime, timedelta
                try:
                    if isinstance(last_seen, str):
                        dt = datetime.fromisoformat(last_seen.replace('Z', '+00:00'))
                    else:
                        dt = last_seen
                    return (datetime.now(dt.tzinfo) if dt.tzinfo else datetime.now()) - dt < timedelta(days=7)
                except Exception:
                    return False
            elif field == 'recent_capture':
                captured = lead.get('created_at') or lead.get('captured_at', '')
                if not captured:
                    return False
                from datetime import datetime, timedelta
                try:
                    if isinstance(captured, str):
                        dt = datetime.fromisoformat(captured.replace('Z', '+00:00'))
                    else:
                        dt = captured
                    return (datetime.now(dt.tzinfo) if dt.tzinfo else datetime.now()) - dt < timedelta(days=14)
                except Exception:
                    return False
            else:
                return False
        except Exception:
            return False

    def _score_to_intent(self, score: int) -> str:
        for level, (low, high) in self.INTENT_LEVELS.items():
            if low <= score <= high:
                return level
        return 'cold'

    def _score_to_value(self, score: int) -> str:
        for level, threshold in sorted(self.VALUE_LEVELS.items(), key=lambda x: x[1], reverse=True):
            if score >= threshold:
                return level
        return 'C'

    def batch_score(self, leads: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """批量評分"""
        return [self.score_lead(lead) for lead in leads]


_scoring_engine: Optional[LeadScoringEngine] = None


def get_scoring_engine() -> LeadScoringEngine:
    """獲取評分引擎單例"""
    global _scoring_engine
    if _scoring_engine is None:
        _scoring_engine = LeadScoringEngine()
    return _scoring_engine
