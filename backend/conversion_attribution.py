"""
轉化歸因分析系統
Conversion Attribution Analysis

功能:
1. 分析轉化來源和路徑
2. 多觸點歸因模型
3. 渠道貢獻度計算
4. 轉化路徑可視化
"""

import sys
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
from collections import defaultdict


class AttributionModel(Enum):
    """歸因模型"""
    FIRST_TOUCH = "first_touch"       # 首次觸點
    LAST_TOUCH = "last_touch"         # 最後觸點
    LINEAR = "linear"                  # 線性歸因
    TIME_DECAY = "time_decay"          # 時間衰減
    POSITION_BASED = "position_based"  # 位置歸因（U型）


class TouchpointType(Enum):
    """觸點類型"""
    KEYWORD_MATCH = "keyword_match"     # 關鍵詞匹配
    GROUP_JOIN = "group_join"           # 群組加入
    DIRECT_MESSAGE = "direct_message"   # 直接消息
    AI_GREETING = "ai_greeting"         # AI 問候
    MANUAL_CONTACT = "manual_contact"   # 人工聯繫
    FOLLOW_UP = "follow_up"             # 跟進
    PROMOTION = "promotion"             # 促銷活動
    REFERRAL = "referral"               # 推薦


@dataclass
class Touchpoint:
    """觸點"""
    id: str
    lead_id: int
    type: TouchpointType
    source: str                         # 來源（群組名、帳號等）
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    credit: float = 0.0                 # 歸因分數


@dataclass
class ConversionPath:
    """轉化路徑"""
    lead_id: int
    touchpoints: List[Touchpoint] = field(default_factory=list)
    converted: bool = False
    conversion_value: float = 0.0
    conversion_time: Optional[datetime] = None
    
    @property
    def path_length(self) -> int:
        return len(self.touchpoints)
    
    @property
    def time_to_conversion(self) -> Optional[timedelta]:
        if not self.converted or not self.touchpoints:
            return None
        return self.conversion_time - self.touchpoints[0].timestamp


@dataclass
class AttributionResult:
    """歸因結果"""
    model: AttributionModel
    source_credits: Dict[str, float]        # 來源 -> 歸因分數
    type_credits: Dict[str, float]          # 類型 -> 歸因分數
    total_conversions: int
    total_value: float
    avg_path_length: float
    avg_time_to_conversion: float           # 平均轉化時間（小時）


class ConversionAttributionAnalyzer:
    """轉化歸因分析器"""
    
    def __init__(self, database=None):
        self.database = database
        self.paths: Dict[int, ConversionPath] = {}  # lead_id -> path
    
    def set_database(self, database):
        """設置數據庫"""
        self.database = database
    
    def record_touchpoint(
        self,
        lead_id: int,
        touchpoint_type: str,
        source: str,
        metadata: Dict[str, Any] = None
    ):
        """記錄觸點"""
        import uuid
        
        if lead_id not in self.paths:
            self.paths[lead_id] = ConversionPath(lead_id=lead_id)
        
        touchpoint = Touchpoint(
            id=str(uuid.uuid4())[:8],
            lead_id=lead_id,
            type=TouchpointType(touchpoint_type) if touchpoint_type in [t.value for t in TouchpointType] else TouchpointType.DIRECT_MESSAGE,
            source=source,
            metadata=metadata or {}
        )
        
        self.paths[lead_id].touchpoints.append(touchpoint)
        print(f"[Attribution] 記錄觸點: Lead {lead_id}, 類型: {touchpoint_type}", file=sys.stderr)
    
    def record_conversion(
        self,
        lead_id: int,
        value: float = 1.0
    ):
        """記錄轉化"""
        if lead_id not in self.paths:
            self.paths[lead_id] = ConversionPath(lead_id=lead_id)
        
        path = self.paths[lead_id]
        path.converted = True
        path.conversion_value = value
        path.conversion_time = datetime.now()
        
        print(f"[Attribution] 記錄轉化: Lead {lead_id}, 價值: {value}", file=sys.stderr)
    
    def analyze(
        self,
        model: AttributionModel = AttributionModel.LINEAR,
        start_date: datetime = None,
        end_date: datetime = None
    ) -> AttributionResult:
        """執行歸因分析"""
        # 過濾路徑
        paths = [p for p in self.paths.values() if p.converted]
        
        if start_date:
            paths = [p for p in paths if p.conversion_time and p.conversion_time >= start_date]
        if end_date:
            paths = [p for p in paths if p.conversion_time and p.conversion_time <= end_date]
        
        if not paths:
            return AttributionResult(
                model=model,
                source_credits={},
                type_credits={},
                total_conversions=0,
                total_value=0,
                avg_path_length=0,
                avg_time_to_conversion=0
            )
        
        # 計算歸因
        source_credits = defaultdict(float)
        type_credits = defaultdict(float)
        
        for path in paths:
            credits = self._calculate_credits(path, model)
            for tp, credit in credits.items():
                source_credits[tp.source] += credit * path.conversion_value
                type_credits[tp.type.value] += credit * path.conversion_value
        
        # 計算統計
        total_conversions = len(paths)
        total_value = sum(p.conversion_value for p in paths)
        avg_path_length = sum(p.path_length for p in paths) / len(paths) if paths else 0
        
        times = [p.time_to_conversion.total_seconds() / 3600 for p in paths if p.time_to_conversion]
        avg_time = sum(times) / len(times) if times else 0
        
        return AttributionResult(
            model=model,
            source_credits=dict(source_credits),
            type_credits=dict(type_credits),
            total_conversions=total_conversions,
            total_value=total_value,
            avg_path_length=avg_path_length,
            avg_time_to_conversion=avg_time
        )
    
    def _calculate_credits(
        self,
        path: ConversionPath,
        model: AttributionModel
    ) -> Dict[Touchpoint, float]:
        """計算歸因分數"""
        if not path.touchpoints:
            return {}
        
        credits = {}
        n = len(path.touchpoints)
        
        if model == AttributionModel.FIRST_TOUCH:
            # 100% 給首次觸點
            credits[path.touchpoints[0]] = 1.0
        
        elif model == AttributionModel.LAST_TOUCH:
            # 100% 給最後觸點
            credits[path.touchpoints[-1]] = 1.0
        
        elif model == AttributionModel.LINEAR:
            # 平均分配
            for tp in path.touchpoints:
                credits[tp] = 1.0 / n
        
        elif model == AttributionModel.TIME_DECAY:
            # 時間衰減（越近的觸點越重要）
            decay_factor = 0.5  # 每個時間單位衰減 50%
            total_weight = 0
            weights = []
            
            for i, tp in enumerate(path.touchpoints):
                weight = pow(decay_factor, n - 1 - i)
                weights.append(weight)
                total_weight += weight
            
            for i, tp in enumerate(path.touchpoints):
                credits[tp] = weights[i] / total_weight if total_weight > 0 else 0
        
        elif model == AttributionModel.POSITION_BASED:
            # U 型歸因：首尾各 40%，中間平分 20%
            if n == 1:
                credits[path.touchpoints[0]] = 1.0
            elif n == 2:
                credits[path.touchpoints[0]] = 0.5
                credits[path.touchpoints[-1]] = 0.5
            else:
                credits[path.touchpoints[0]] = 0.4
                credits[path.touchpoints[-1]] = 0.4
                middle_credit = 0.2 / (n - 2)
                for tp in path.touchpoints[1:-1]:
                    credits[tp] = middle_credit
        
        return credits
    
    def get_top_sources(self, limit: int = 10) -> List[Dict[str, Any]]:
        """獲取頂級來源"""
        result = self.analyze(AttributionModel.LINEAR)
        
        sorted_sources = sorted(
            result.source_credits.items(),
            key=lambda x: x[1],
            reverse=True
        )[:limit]
        
        return [
            {
                "source": source,
                "credit": round(credit, 2),
                "percentage": round(credit / result.total_value * 100, 1) if result.total_value > 0 else 0
            }
            for source, credit in sorted_sources
        ]
    
    def get_conversion_funnel(self) -> Dict[str, Any]:
        """獲取轉化漏斗數據"""
        all_leads = len(self.paths)
        with_touchpoints = len([p for p in self.paths.values() if p.touchpoints])
        multi_touch = len([p for p in self.paths.values() if len(p.touchpoints) > 1])
        converted = len([p for p in self.paths.values() if p.converted])
        
        return {
            "stages": [
                {"name": "所有 Lead", "count": all_leads, "percentage": 100},
                {"name": "有觸點", "count": with_touchpoints, 
                 "percentage": round(with_touchpoints / all_leads * 100, 1) if all_leads > 0 else 0},
                {"name": "多觸點", "count": multi_touch,
                 "percentage": round(multi_touch / all_leads * 100, 1) if all_leads > 0 else 0},
                {"name": "已轉化", "count": converted,
                 "percentage": round(converted / all_leads * 100, 1) if all_leads > 0 else 0}
            ]
        }
    
    def get_path_analysis(self) -> Dict[str, Any]:
        """獲取路徑分析"""
        converted_paths = [p for p in self.paths.values() if p.converted]
        
        if not converted_paths:
            return {"paths": [], "common_sequences": []}
        
        # 分析常見路徑
        path_sequences = defaultdict(int)
        for path in converted_paths:
            sequence = " -> ".join([tp.type.value for tp in path.touchpoints])
            path_sequences[sequence] += 1
        
        sorted_sequences = sorted(
            path_sequences.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]
        
        return {
            "total_paths": len(converted_paths),
            "common_sequences": [
                {"sequence": seq, "count": count, 
                 "percentage": round(count / len(converted_paths) * 100, 1)}
                for seq, count in sorted_sequences
            ]
        }


# 全局實例
_analyzer = None

def get_attribution_analyzer() -> ConversionAttributionAnalyzer:
    """獲取全局歸因分析器"""
    global _analyzer
    if _analyzer is None:
        _analyzer = ConversionAttributionAnalyzer()
    return _analyzer


async def analyze_attribution(
    model: str = "linear",
    days: int = 30
) -> Dict[str, Any]:
    """分析歸因（異步接口）"""
    analyzer = get_attribution_analyzer()
    
    model_enum = AttributionModel(model) if model in [m.value for m in AttributionModel] else AttributionModel.LINEAR
    start_date = datetime.now() - timedelta(days=days)
    
    result = analyzer.analyze(model_enum, start_date)
    
    return {
        "model": result.model.value,
        "sourceCredits": result.source_credits,
        "typeCredits": result.type_credits,
        "totalConversions": result.total_conversions,
        "totalValue": result.total_value,
        "avgPathLength": round(result.avg_path_length, 2),
        "avgTimeToConversion": round(result.avg_time_to_conversion, 2),
        "topSources": analyzer.get_top_sources(),
        "funnel": analyzer.get_conversion_funnel(),
        "pathAnalysis": analyzer.get_path_analysis()
    }
