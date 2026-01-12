"""
Analytics Engine
高級分析引擎 - 轉化漏斗分析、用戶行為分析、預測模型
"""
import sys
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
import statistics


@dataclass
class FunnelStage:
    """漏斗階段數據"""
    stage: str
    count: int
    conversion_rate: float  # 轉化率（相對於上一階段）
    drop_off_rate: float    # 流失率
    avg_time_hours: float   # 平均停留時間（小時）
    total_time_hours: float  # 總停留時間


@dataclass
class UserJourney:
    """用戶旅程數據"""
    user_id: str
    stages: List[str]  # 經歷的階段
    timestamps: List[datetime]  # 每個階段的時間戳
    duration_hours: List[float]  # 每個階段的停留時間
    key_moments: List[Dict[str, Any]]  # 關鍵時刻
    engagement_score: float  # 參與度分數


class AnalyticsEngine:
    """分析引擎"""
    
    def __init__(self, database):
        """
        初始化分析引擎
        
        Args:
            database: 數據庫實例
        """
        self.db = database
    
    async def analyze_funnel(
        self, 
        days: int = 30,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        分析轉化漏斗
        
        Args:
            days: 分析天數（如果未提供日期範圍）
            start_date: 開始日期
            end_date: 結束日期
            
        Returns:
            漏斗分析結果
        """
        # 確定日期範圍
        if not end_date:
            end_date = datetime.now()
        if not start_date:
            start_date = end_date - timedelta(days=days)
        
        # 獲取所有 Lead
        all_leads = await self.db.get_all_leads()
        
        # 過濾日期範圍
        filtered_leads = [
            lead for lead in all_leads
            if start_date <= datetime.fromisoformat(lead['timestamp']) <= end_date
        ]
        
        # 定義漏斗階段
        stages = ['new', 'contacted', 'replied', 'interested', 'negotiating', 'follow_up', 'converted', 'churned']
        
        # 統計每個階段的數據
        funnel_data = []
        previous_count = len(filtered_leads)  # 從總數開始
        
        for i, stage in enumerate(stages):
            stage_leads = [l for l in filtered_leads if l.get('status', 'New') == stage.capitalize()]
            count = len(stage_leads)
            
            # 計算轉化率（相對於上一階段）
            conversion_rate = (count / previous_count * 100) if previous_count > 0 else 0
            
            # 計算流失率
            drop_off_rate = ((previous_count - count) / previous_count * 100) if previous_count > 0 else 0
            
            # 計算平均停留時間（簡化版，實際需要追蹤階段轉換時間）
            avg_time_hours = 0.0  # 需要從 interaction_history 計算
            
            funnel_data.append(FunnelStage(
                stage=stage,
                count=count,
                conversion_rate=round(conversion_rate, 2),
                drop_off_rate=round(drop_off_rate, 2),
                avg_time_hours=avg_time_hours,
                total_time_hours=0.0
            ))
            
            previous_count = count
        
        # 計算總體轉化率
        total_conversion_rate = 0.0
        if len(filtered_leads) > 0:
            converted_count = len([l for l in filtered_leads if l.get('status') == 'Converted'])
            total_conversion_rate = (converted_count / len(filtered_leads)) * 100
        
        return {
            'stages': [
                {
                    'stage': fd.stage,
                    'count': fd.count,
                    'conversionRate': fd.conversion_rate,
                    'dropOffRate': fd.drop_off_rate,
                    'avgTimeHours': fd.avg_time_hours
                }
                for fd in funnel_data
            ],
            'totalLeads': len(filtered_leads),
            'totalConversionRate': round(total_conversion_rate, 2),
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': days
            }
        }
    
    async def analyze_user_journey(self, user_id: str) -> Dict[str, Any]:
        """
        分析用戶旅程
        
        Args:
            user_id: 用戶ID
            
        Returns:
            用戶旅程分析結果
        """
        # 獲取用戶的所有互動
        interactions = await self.db.get_user_interactions(user_id)
        
        # 獲取用戶資料
        profile = await self.db.get_user_profile(user_id)
        if not profile:
            return {
                'error': 'User not found',
                'user_id': user_id
            }
        
        # 構建時間線
        timeline = []
        current_stage = 'new'
        stage_changes = []
        
        for interaction in sorted(interactions, key=lambda x: x.get('timestamp', '')):
            timestamp = interaction.get('timestamp')
            interaction_type = interaction.get('type', '')
            
            # 檢測階段變化
            if 'Converted' in interaction_type:
                new_stage = 'converted'
            elif 'Interested' in interaction_type:
                new_stage = 'interested'
            elif 'Replied' in interaction_type:
                new_stage = 'replied'
            elif 'Contacted' in interaction_type:
                new_stage = 'contacted'
            else:
                new_stage = current_stage
            
            if new_stage != current_stage:
                stage_changes.append({
                    'from': current_stage,
                    'to': new_stage,
                    'timestamp': timestamp
                })
                current_stage = new_stage
            
            timeline.append({
                'timestamp': timestamp,
                'type': interaction_type,
                'content': interaction.get('content', ''),
                'stage': current_stage
            })
        
        # 識別關鍵時刻
        key_moments = []
        
        # 第一次回復
        first_reply = next((t for t in timeline if 'Reply' in t['type'] or 'Replied' in t['type']), None)
        if first_reply:
            key_moments.append({
                'type': 'first_reply',
                'timestamp': first_reply['timestamp'],
                'description': '用戶首次回復'
            })
        
        # 表現出興趣
        interest_moment = next((t for t in timeline if 'Interested' in t['type'] or 'interest' in t.get('content', '').lower()), None)
        if interest_moment:
            key_moments.append({
                'type': 'interest_shown',
                'timestamp': interest_moment['timestamp'],
                'description': '用戶表現出興趣'
            })
        
        # 成交
        conversion_moment = next((t for t in timeline if 'Converted' in t['type']), None)
        if conversion_moment:
            key_moments.append({
                'type': 'converted',
                'timestamp': conversion_moment['timestamp'],
                'description': '用戶成交'
            })
        
        # 計算參與度分數
        engagement_score = self._calculate_engagement_score(timeline, interactions)
        
        # 預測下一步行動
        next_action_prediction = await self._predict_next_action(user_id, timeline, profile)
        
        return {
            'user_id': user_id,
            'current_stage': profile.get('funnel_stage', 'new'),
            'timeline': timeline,
            'stage_changes': stage_changes,
            'key_moments': key_moments,
            'engagement_score': round(engagement_score, 2),
            'next_action_prediction': next_action_prediction,
            'total_interactions': len(interactions),
            'days_since_first_contact': self._calculate_days_since_first_contact(profile)
        }
    
    def _calculate_engagement_score(
        self, 
        timeline: List[Dict], 
        interactions: List[Dict]
    ) -> float:
        """
        計算參與度分數（0-100）
        
        評分標準：
        - 互動頻率：30%
        - 回復速度：20%
        - 消息長度：20%
        - 階段進展：30%
        """
        if not interactions:
            return 0.0
        
        # 互動頻率分數（基於互動次數）
        interaction_count = len(interactions)
        frequency_score = min(interaction_count * 5, 30)  # 最多30分
        
        # 回復速度分數（簡化版）
        reply_speed_score = 20  # 需要實際計算回復時間
        
        # 消息長度分數（基於平均消息長度）
        avg_length = statistics.mean([len(i.get('content', '')) for i in interactions]) if interactions else 0
        length_score = min(avg_length / 10, 20)  # 最多20分
        
        # 階段進展分數
        stages = ['new', 'contacted', 'replied', 'interested', 'negotiating', 'converted']
        current_stage = timeline[-1]['stage'] if timeline else 'new'
        stage_index = stages.index(current_stage) if current_stage in stages else 0
        stage_score = (stage_index / len(stages)) * 30  # 最多30分
        
        total_score = frequency_score + reply_speed_score + length_score + stage_score
        return min(total_score, 100.0)
    
    async def _predict_next_action(
        self, 
        user_id: str, 
        timeline: List[Dict],
        profile: Dict
    ) -> Dict[str, Any]:
        """
        預測用戶下一步行動
        
        Args:
            user_id: 用戶ID
            timeline: 時間線
            profile: 用戶資料
            
        Returns:
            預測結果
        """
        current_stage = profile.get('funnel_stage', 'new')
        last_interaction = timeline[-1] if timeline else None
        
        # 簡單的預測邏輯（可以後續用 ML 模型增強）
        predictions = {
            'new': {
                'action': 'send_greeting',
                'probability': 0.8,
                'description': '發送問候消息'
            },
            'contacted': {
                'action': 'wait_for_reply',
                'probability': 0.7,
                'description': '等待用戶回復'
            },
            'replied': {
                'action': 'continue_conversation',
                'probability': 0.8,
                'description': '繼續深入交流'
            },
            'interested': {
                'action': 'provide_details',
                'probability': 0.9,
                'description': '提供產品詳情'
            },
            'negotiating': {
                'action': 'close_deal',
                'probability': 0.7,
                'description': '嘗試成交'
            },
            'follow_up': {
                'action': 'gentle_reminder',
                'probability': 0.6,
                'description': '溫和提醒'
            }
        }
        
        prediction = predictions.get(current_stage, {
            'action': 'maintain_contact',
            'probability': 0.5,
            'description': '保持聯繫'
        })
        
        return {
            **prediction,
            'recommended_time': self._calculate_recommended_time(current_stage, last_interaction)
        }
    
    def _calculate_recommended_time(
        self, 
        stage: str, 
        last_interaction: Optional[Dict]
    ) -> Optional[str]:
        """計算建議行動時間"""
        if not last_interaction:
            return "立即"
        
        # 根據階段和最後互動時間計算建議時間
        stage_delays = {
            'new': timedelta(hours=1),
            'contacted': timedelta(hours=24),
            'replied': timedelta(hours=2),
            'interested': timedelta(hours=6),
            'negotiating': timedelta(hours=12),
            'follow_up': timedelta(days=3)
        }
        
        delay = stage_delays.get(stage, timedelta(hours=24))
        if last_interaction.get('timestamp'):
            try:
                last_time = datetime.fromisoformat(last_interaction['timestamp'])
                recommended = last_time + delay
                if recommended > datetime.now():
                    return recommended.isoformat()
                else:
                    return "立即"
            except:
                pass
        
        return "立即"
    
    def _calculate_days_since_first_contact(self, profile: Dict) -> Optional[int]:
        """計算距離首次聯繫的天數"""
        first_contact = profile.get('first_contact_at')
        if first_contact:
            try:
                if isinstance(first_contact, str):
                    first_contact = datetime.fromisoformat(first_contact)
                delta = datetime.now() - first_contact
                return delta.days
            except:
                pass
        return None
    
    async def get_user_interactions(self, user_id: str) -> List[Dict]:
        """獲取用戶互動歷史（輔助方法）"""
        try:
            cursor = await self.db._connection.execute("""
                SELECT id, timestamp, type, content
                FROM interactions
                WHERE lead_id IN (
                    SELECT id FROM leads WHERE userId = ?
                )
                ORDER BY timestamp ASC
            """, (user_id,))
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
        except:
            return []
