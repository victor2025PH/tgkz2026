"""
TG-Matrix A/B 測試框架
Phase E: Functionality - A/B 測試

功能：
1. 實驗定義
2. 變體分配
3. 結果追蹤
4. 統計分析
"""

import os
import json
import random
import hashlib
import asyncio
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Callable, TypeVar
import math

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.logging import get_logger

logger = get_logger("ab_testing")

T = TypeVar('T')


class ExperimentStatus(Enum):
    """實驗狀態"""
    DRAFT = "draft"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class AllocationStrategy(Enum):
    """分配策略"""
    RANDOM = "random"            # 純隨機
    HASH_BASED = "hash_based"    # 基於用戶 ID 哈希
    WEIGHTED = "weighted"        # 加權分配
    SEQUENTIAL = "sequential"    # 順序分配


@dataclass
class Variant:
    """實驗變體"""
    id: str
    name: str
    description: str = ""
    weight: float = 1.0  # 分配權重
    config: Dict[str, Any] = field(default_factory=dict)
    
    # 統計
    participants: int = 0
    conversions: int = 0
    total_value: float = 0
    
    @property
    def conversion_rate(self) -> float:
        return self.conversions / self.participants if self.participants > 0 else 0
    
    @property
    def average_value(self) -> float:
        return self.total_value / self.participants if self.participants > 0 else 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "weight": self.weight,
            "config": self.config,
            "participants": self.participants,
            "conversions": self.conversions,
            "conversion_rate": round(self.conversion_rate * 100, 2),
            "total_value": self.total_value,
            "average_value": round(self.average_value, 2)
        }


@dataclass
class Experiment:
    """實驗"""
    id: str
    name: str
    description: str
    variants: List[Variant]
    
    status: ExperimentStatus = ExperimentStatus.DRAFT
    allocation_strategy: AllocationStrategy = AllocationStrategy.HASH_BASED
    
    # 時間
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    
    # 目標
    target_sample_size: int = 1000
    target_confidence: float = 0.95
    
    # 分配記錄
    _assignments: Dict[str, str] = field(default_factory=dict)
    
    def get_variant(self, variant_id: str) -> Optional[Variant]:
        for v in self.variants:
            if v.id == variant_id:
                return v
        return None
    
    @property
    def total_participants(self) -> int:
        return sum(v.participants for v in self.variants)
    
    @property
    def control(self) -> Optional[Variant]:
        return self.variants[0] if self.variants else None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "status": self.status.value,
            "allocation_strategy": self.allocation_strategy.value,
            "variants": [v.to_dict() for v in self.variants],
            "total_participants": self.total_participants,
            "target_sample_size": self.target_sample_size,
            "target_confidence": self.target_confidence,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "ended_at": self.ended_at.isoformat() if self.ended_at else None
        }


@dataclass
class ExperimentResult:
    """實驗結果"""
    experiment_id: str
    winner: Optional[str]
    confidence: float
    lift: float
    p_value: float
    sample_size: int
    duration_days: int
    is_significant: bool
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "experiment_id": self.experiment_id,
            "winner": self.winner,
            "confidence": round(self.confidence * 100, 2),
            "lift": round(self.lift * 100, 2),
            "p_value": round(self.p_value, 4),
            "sample_size": self.sample_size,
            "duration_days": self.duration_days,
            "is_significant": self.is_significant
        }


class ABTestingService:
    """A/B 測試服務"""
    
    def __init__(self):
        self.experiments: Dict[str, Experiment] = {}
        self._lock = asyncio.Lock()
    
    def create_experiment(
        self,
        name: str,
        description: str,
        variants: List[Dict[str, Any]],
        allocation_strategy: AllocationStrategy = AllocationStrategy.HASH_BASED,
        target_sample_size: int = 1000
    ) -> Experiment:
        """創建實驗"""
        exp_id = f"exp_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{len(self.experiments)}"
        
        variant_objects = []
        for i, v in enumerate(variants):
            variant_objects.append(Variant(
                id=v.get("id", f"variant_{i}"),
                name=v.get("name", f"Variant {i}"),
                description=v.get("description", ""),
                weight=v.get("weight", 1.0),
                config=v.get("config", {})
            ))
        
        experiment = Experiment(
            id=exp_id,
            name=name,
            description=description,
            variants=variant_objects,
            allocation_strategy=allocation_strategy,
            target_sample_size=target_sample_size
        )
        
        self.experiments[exp_id] = experiment
        logger.info(f"Created experiment: {name} ({exp_id})")
        
        return experiment
    
    def start_experiment(self, experiment_id: str) -> bool:
        """啟動實驗"""
        exp = self.experiments.get(experiment_id)
        if not exp:
            return False
        
        if exp.status != ExperimentStatus.DRAFT:
            return False
        
        exp.status = ExperimentStatus.RUNNING
        exp.started_at = datetime.now()
        logger.info(f"Started experiment: {experiment_id}")
        
        return True
    
    def pause_experiment(self, experiment_id: str) -> bool:
        """暫停實驗"""
        exp = self.experiments.get(experiment_id)
        if not exp or exp.status != ExperimentStatus.RUNNING:
            return False
        
        exp.status = ExperimentStatus.PAUSED
        logger.info(f"Paused experiment: {experiment_id}")
        
        return True
    
    def complete_experiment(self, experiment_id: str) -> Optional[ExperimentResult]:
        """完成實驗"""
        exp = self.experiments.get(experiment_id)
        if not exp:
            return None
        
        exp.status = ExperimentStatus.COMPLETED
        exp.ended_at = datetime.now()
        
        result = self.analyze_experiment(experiment_id)
        logger.info(f"Completed experiment: {experiment_id}")
        
        return result
    
    def assign_variant(
        self,
        experiment_id: str,
        user_id: str,
        force_variant: Optional[str] = None
    ) -> Optional[Variant]:
        """為用戶分配變體"""
        exp = self.experiments.get(experiment_id)
        if not exp or exp.status != ExperimentStatus.RUNNING:
            return None
        
        # 檢查是否已分配
        if user_id in exp._assignments:
            variant_id = exp._assignments[user_id]
            return exp.get_variant(variant_id)
        
        # 強制分配
        if force_variant:
            variant = exp.get_variant(force_variant)
            if variant:
                exp._assignments[user_id] = force_variant
                variant.participants += 1
                return variant
        
        # 根據策略分配
        if exp.allocation_strategy == AllocationStrategy.RANDOM:
            variant = self._allocate_random(exp)
        elif exp.allocation_strategy == AllocationStrategy.HASH_BASED:
            variant = self._allocate_hash_based(exp, user_id)
        elif exp.allocation_strategy == AllocationStrategy.WEIGHTED:
            variant = self._allocate_weighted(exp)
        else:
            variant = exp.variants[0]
        
        if variant:
            exp._assignments[user_id] = variant.id
            variant.participants += 1
        
        return variant
    
    def _allocate_random(self, exp: Experiment) -> Variant:
        """隨機分配"""
        return random.choice(exp.variants)
    
    def _allocate_hash_based(self, exp: Experiment, user_id: str) -> Variant:
        """基於哈希分配"""
        hash_input = f"{exp.id}:{user_id}"
        hash_value = int(hashlib.md5(hash_input.encode()).hexdigest(), 16)
        
        total_weight = sum(v.weight for v in exp.variants)
        normalized = (hash_value % 10000) / 10000.0 * total_weight
        
        cumulative = 0
        for variant in exp.variants:
            cumulative += variant.weight
            if normalized <= cumulative:
                return variant
        
        return exp.variants[-1]
    
    def _allocate_weighted(self, exp: Experiment) -> Variant:
        """加權分配"""
        total_weight = sum(v.weight for v in exp.variants)
        r = random.uniform(0, total_weight)
        
        cumulative = 0
        for variant in exp.variants:
            cumulative += variant.weight
            if r <= cumulative:
                return variant
        
        return exp.variants[-1]
    
    def track_conversion(
        self,
        experiment_id: str,
        user_id: str,
        value: float = 1.0
    ) -> bool:
        """追蹤轉化"""
        exp = self.experiments.get(experiment_id)
        if not exp:
            return False
        
        variant_id = exp._assignments.get(user_id)
        if not variant_id:
            return False
        
        variant = exp.get_variant(variant_id)
        if variant:
            variant.conversions += 1
            variant.total_value += value
            return True
        
        return False
    
    def analyze_experiment(self, experiment_id: str) -> Optional[ExperimentResult]:
        """分析實驗結果"""
        exp = self.experiments.get(experiment_id)
        if not exp or len(exp.variants) < 2:
            return None
        
        control = exp.variants[0]
        best_variant = control
        best_lift = 0
        
        for variant in exp.variants[1:]:
            if variant.conversion_rate > control.conversion_rate:
                lift = (variant.conversion_rate - control.conversion_rate) / control.conversion_rate if control.conversion_rate > 0 else 0
                if lift > best_lift:
                    best_lift = lift
                    best_variant = variant
        
        # 計算 p-value (簡化的 Z 檢驗)
        p_value = self._calculate_p_value(control, best_variant)
        is_significant = p_value < (1 - exp.target_confidence)
        
        duration = 0
        if exp.started_at:
            end = exp.ended_at or datetime.now()
            duration = (end - exp.started_at).days
        
        return ExperimentResult(
            experiment_id=experiment_id,
            winner=best_variant.id if is_significant and best_variant != control else None,
            confidence=1 - p_value,
            lift=best_lift,
            p_value=p_value,
            sample_size=exp.total_participants,
            duration_days=duration,
            is_significant=is_significant
        )
    
    def _calculate_p_value(self, control: Variant, treatment: Variant) -> float:
        """計算 p-value (Z 檢驗)"""
        n1, c1 = control.participants, control.conversions
        n2, c2 = treatment.participants, treatment.conversions
        
        if n1 == 0 or n2 == 0:
            return 1.0
        
        p1 = c1 / n1
        p2 = c2 / n2
        p = (c1 + c2) / (n1 + n2)
        
        if p == 0 or p == 1:
            return 1.0
        
        se = math.sqrt(p * (1 - p) * (1/n1 + 1/n2))
        
        if se == 0:
            return 1.0
        
        z = abs(p2 - p1) / se
        
        # 簡化的 p-value 計算
        # 使用標準正態分布的近似
        p_value = 2 * (1 - self._normal_cdf(z))
        
        return max(0, min(1, p_value))
    
    def _normal_cdf(self, x: float) -> float:
        """標準正態分布 CDF 近似"""
        # 使用 Abramowitz and Stegun 近似
        a1 = 0.254829592
        a2 = -0.284496736
        a3 = 1.421413741
        a4 = -1.453152027
        a5 = 1.061405429
        p = 0.3275911
        
        sign = 1 if x >= 0 else -1
        x = abs(x) / math.sqrt(2)
        
        t = 1.0 / (1.0 + p * x)
        y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * math.exp(-x * x)
        
        return 0.5 * (1.0 + sign * y)
    
    def get_experiment(self, experiment_id: str) -> Optional[Experiment]:
        """獲取實驗"""
        return self.experiments.get(experiment_id)
    
    def list_experiments(
        self,
        status: Optional[ExperimentStatus] = None
    ) -> List[Experiment]:
        """列出實驗"""
        if status:
            return [e for e in self.experiments.values() if e.status == status]
        return list(self.experiments.values())
    
    def get_user_assignments(self, user_id: str) -> Dict[str, str]:
        """獲取用戶的所有實驗分配"""
        assignments = {}
        for exp_id, exp in self.experiments.items():
            if user_id in exp._assignments:
                assignments[exp_id] = exp._assignments[user_id]
        return assignments


# 全局實例
_ab_service: Optional[ABTestingService] = None


def get_ab_testing() -> ABTestingService:
    """獲取 A/B 測試服務"""
    global _ab_service
    if _ab_service is None:
        _ab_service = ABTestingService()
    return _ab_service


# ==================== 向後兼容層 ====================
# 為兼容舊版 backend/ab_testing.py 的接口

# 類型別名
ABTestingManager = ABTestingService
TestStatus = ExperimentStatus


def get_ab_testing_manager() -> ABTestingService:
    """
    向後兼容函數
    獲取 A/B 測試管理器（舊接口名稱）
    """
    return get_ab_testing()


async def create_ab_test(
    name: str,
    variants: List[Dict[str, Any]],
    description: str = "",
    primary_metric: str = "response_rate"
) -> Dict[str, Any]:
    """
    創建 A/B 測試（向後兼容的異步接口）
    """
    service = get_ab_testing()
    
    # 轉換變體格式
    variant_objects = []
    for i, v in enumerate(variants):
        variant_objects.append(Variant(
            id=v.get('id', f'variant_{i}'),
            name=v.get('name', f'變體 {chr(65+i)}'),
            description=v.get('description', ''),
            config=v.get('content', v),
            weight=v.get('weight', 1.0 / len(variants) if variants else 1.0)
        ))
    
    # 創建實驗
    experiment = service.create_experiment(
        name=name,
        description=description,
        variants=variant_objects,
        allocation_strategy=AllocationStrategy.RANDOM
    )
    
    return {
        "testId": experiment.id,
        "name": experiment.name,
        "variantCount": len(experiment.variants),
        "status": experiment.status.value
    }


__all__ = [
    # 新接口
    'ExperimentStatus',
    'AllocationStrategy',
    'Variant',
    'Experiment',
    'ExperimentResult',
    'ABTestingService',
    'get_ab_testing',
    # 向後兼容
    'ABTestingManager',
    'TestStatus',
    'get_ab_testing_manager',
    'create_ab_test'
]
