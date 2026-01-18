"""
A/B 測試框架
A/B Testing Framework

功能:
1. 消息模板效果對比
2. 自動分配測試組
3. 統計顯著性計算
4. 結果可視化
"""

import sys
import random
import math
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
from collections import defaultdict


class TestStatus(Enum):
    """測試狀態"""
    DRAFT = "draft"           # 草稿
    RUNNING = "running"       # 運行中
    PAUSED = "paused"         # 暫停
    COMPLETED = "completed"   # 已完成
    CANCELLED = "cancelled"   # 已取消


class MetricType(Enum):
    """指標類型"""
    RESPONSE_RATE = "response_rate"     # 響應率
    CLICK_RATE = "click_rate"           # 點擊率
    CONVERSION_RATE = "conversion_rate" # 轉化率
    REPLY_TIME = "reply_time"           # 回覆時間
    ENGAGEMENT_SCORE = "engagement"     # 互動分數


@dataclass
class TestVariant:
    """測試變體"""
    id: str
    name: str
    content: str                            # 消息內容
    template_id: Optional[str] = None       # 關聯的模板 ID
    weight: float = 0.5                     # 分配權重（0-1）
    
    # 統計數據
    sent_count: int = 0
    response_count: int = 0
    click_count: int = 0
    conversion_count: int = 0
    total_reply_time_seconds: float = 0
    
    @property
    def response_rate(self) -> float:
        if self.sent_count == 0:
            return 0.0
        return self.response_count / self.sent_count
    
    @property
    def conversion_rate(self) -> float:
        if self.sent_count == 0:
            return 0.0
        return self.conversion_count / self.sent_count
    
    @property
    def avg_reply_time(self) -> float:
        if self.response_count == 0:
            return 0.0
        return self.total_reply_time_seconds / self.response_count


@dataclass
class ABTest:
    """A/B 測試"""
    id: str
    name: str
    description: str = ""
    variants: List[TestVariant] = field(default_factory=list)
    status: TestStatus = TestStatus.DRAFT
    primary_metric: MetricType = MetricType.RESPONSE_RATE
    
    # 配置
    min_sample_size: int = 100              # 最小樣本量
    confidence_level: float = 0.95          # 置信度
    auto_complete: bool = True              # 達到樣本量後自動完成
    
    # 時間
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    
    # 結果
    winner_variant_id: Optional[str] = None
    statistical_significance: float = 0.0
    
    def get_total_sent(self) -> int:
        return sum(v.sent_count for v in self.variants)
    
    def is_sample_size_reached(self) -> bool:
        return all(v.sent_count >= self.min_sample_size for v in self.variants)
    
    def get_variant_by_id(self, variant_id: str) -> Optional[TestVariant]:
        for v in self.variants:
            if v.id == variant_id:
                return v
        return None


class ABTestingManager:
    """A/B 測試管理器"""
    
    def __init__(self, database=None):
        self.database = database
        self.tests: Dict[str, ABTest] = {}
        self.user_assignments: Dict[str, Dict[str, str]] = {}  # user_id -> {test_id -> variant_id}
    
    def set_database(self, database):
        """設置數據庫"""
        self.database = database
    
    def create_test(
        self,
        name: str,
        variants: List[Dict[str, Any]],
        description: str = "",
        primary_metric: str = "response_rate",
        min_sample_size: int = 100,
        confidence_level: float = 0.95
    ) -> ABTest:
        """創建 A/B 測試"""
        import uuid
        
        test_id = str(uuid.uuid4())[:8]
        
        variant_objects = []
        total_weight = sum(v.get("weight", 1.0) for v in variants)
        
        for i, v in enumerate(variants):
            variant_objects.append(TestVariant(
                id=f"{test_id}_v{i}",
                name=v.get("name", f"變體 {chr(65 + i)}"),
                content=v.get("content", ""),
                template_id=v.get("template_id"),
                weight=v.get("weight", 1.0) / total_weight
            ))
        
        test = ABTest(
            id=test_id,
            name=name,
            description=description,
            variants=variant_objects,
            primary_metric=MetricType(primary_metric),
            min_sample_size=min_sample_size,
            confidence_level=confidence_level
        )
        
        self.tests[test_id] = test
        print(f"[ABTesting] 創建測試: {name} ({len(variant_objects)} 個變體)", file=sys.stderr)
        
        return test
    
    def start_test(self, test_id: str) -> bool:
        """開始測試"""
        test = self.tests.get(test_id)
        if not test or test.status not in [TestStatus.DRAFT, TestStatus.PAUSED]:
            return False
        
        test.status = TestStatus.RUNNING
        test.start_at = datetime.now()
        print(f"[ABTesting] 開始測試: {test.name}", file=sys.stderr)
        return True
    
    def pause_test(self, test_id: str) -> bool:
        """暫停測試"""
        test = self.tests.get(test_id)
        if not test or test.status != TestStatus.RUNNING:
            return False
        
        test.status = TestStatus.PAUSED
        return True
    
    def complete_test(self, test_id: str) -> bool:
        """完成測試"""
        test = self.tests.get(test_id)
        if not test:
            return False
        
        test.status = TestStatus.COMPLETED
        test.completed_at = datetime.now()
        
        # 計算結果
        self._calculate_results(test)
        
        print(f"[ABTesting] 完成測試: {test.name}, 勝出: {test.winner_variant_id}", file=sys.stderr)
        return True
    
    def get_variant_for_user(self, test_id: str, user_id: str) -> Optional[TestVariant]:
        """為用戶分配變體"""
        test = self.tests.get(test_id)
        if not test or test.status != TestStatus.RUNNING:
            return None
        
        # 檢查是否已分配
        if user_id in self.user_assignments:
            if test_id in self.user_assignments[user_id]:
                variant_id = self.user_assignments[user_id][test_id]
                return test.get_variant_by_id(variant_id)
        
        # 根據權重隨機分配
        r = random.random()
        cumulative = 0.0
        selected_variant = test.variants[0]
        
        for variant in test.variants:
            cumulative += variant.weight
            if r <= cumulative:
                selected_variant = variant
                break
        
        # 記錄分配
        if user_id not in self.user_assignments:
            self.user_assignments[user_id] = {}
        self.user_assignments[user_id][test_id] = selected_variant.id
        
        return selected_variant
    
    def record_sent(self, test_id: str, variant_id: str):
        """記錄發送"""
        test = self.tests.get(test_id)
        if not test:
            return
        
        variant = test.get_variant_by_id(variant_id)
        if variant:
            variant.sent_count += 1
            
            # 檢查是否應該自動完成
            if test.auto_complete and test.is_sample_size_reached():
                self.complete_test(test_id)
    
    def record_response(
        self,
        test_id: str,
        variant_id: str,
        reply_time_seconds: float = 0
    ):
        """記錄響應"""
        test = self.tests.get(test_id)
        if not test:
            return
        
        variant = test.get_variant_by_id(variant_id)
        if variant:
            variant.response_count += 1
            variant.total_reply_time_seconds += reply_time_seconds
    
    def record_conversion(self, test_id: str, variant_id: str):
        """記錄轉化"""
        test = self.tests.get(test_id)
        if not test:
            return
        
        variant = test.get_variant_by_id(variant_id)
        if variant:
            variant.conversion_count += 1
    
    def _calculate_results(self, test: ABTest):
        """計算測試結果"""
        if len(test.variants) < 2:
            return
        
        # 找到主指標最高的變體
        best_variant = None
        best_value = -1
        
        for variant in test.variants:
            if test.primary_metric == MetricType.RESPONSE_RATE:
                value = variant.response_rate
            elif test.primary_metric == MetricType.CONVERSION_RATE:
                value = variant.conversion_rate
            elif test.primary_metric == MetricType.REPLY_TIME:
                value = -variant.avg_reply_time  # 時間越短越好
            else:
                value = variant.response_rate
            
            if value > best_value:
                best_value = value
                best_variant = variant
        
        if best_variant:
            test.winner_variant_id = best_variant.id
        
        # 計算統計顯著性（簡化的 Z-test）
        if len(test.variants) == 2:
            test.statistical_significance = self._calculate_significance(
                test.variants[0],
                test.variants[1],
                test.primary_metric
            )
    
    def _calculate_significance(
        self,
        variant_a: TestVariant,
        variant_b: TestVariant,
        metric: MetricType
    ) -> float:
        """計算統計顯著性（簡化版 Z-test）"""
        if metric == MetricType.RESPONSE_RATE:
            p1 = variant_a.response_rate
            p2 = variant_b.response_rate
            n1 = variant_a.sent_count
            n2 = variant_b.sent_count
        elif metric == MetricType.CONVERSION_RATE:
            p1 = variant_a.conversion_rate
            p2 = variant_b.conversion_rate
            n1 = variant_a.sent_count
            n2 = variant_b.sent_count
        else:
            return 0.0
        
        if n1 < 10 or n2 < 10:
            return 0.0
        
        # 計算 pooled proportion
        p_pool = (p1 * n1 + p2 * n2) / (n1 + n2)
        
        if p_pool == 0 or p_pool == 1:
            return 0.0
        
        # 計算標準誤差
        se = math.sqrt(p_pool * (1 - p_pool) * (1/n1 + 1/n2))
        
        if se == 0:
            return 0.0
        
        # 計算 Z 值
        z = abs(p1 - p2) / se
        
        # 轉換為置信度（簡化）
        if z >= 2.576:
            return 0.99
        elif z >= 1.96:
            return 0.95
        elif z >= 1.645:
            return 0.90
        elif z >= 1.28:
            return 0.80
        else:
            return max(0.5, 0.5 + z * 0.15)
    
    def get_test(self, test_id: str) -> Optional[ABTest]:
        """獲取測試"""
        return self.tests.get(test_id)
    
    def get_all_tests(self) -> List[ABTest]:
        """獲取所有測試"""
        return list(self.tests.values())
    
    def get_running_tests(self) -> List[ABTest]:
        """獲取運行中的測試"""
        return [t for t in self.tests.values() if t.status == TestStatus.RUNNING]
    
    def get_test_results(self, test_id: str) -> Optional[Dict[str, Any]]:
        """獲取測試結果"""
        test = self.tests.get(test_id)
        if not test:
            return None
        
        return {
            "testId": test.id,
            "name": test.name,
            "status": test.status.value,
            "primaryMetric": test.primary_metric.value,
            "totalSent": test.get_total_sent(),
            "sampleSizeReached": test.is_sample_size_reached(),
            "winnerVariantId": test.winner_variant_id,
            "statisticalSignificance": test.statistical_significance,
            "variants": [
                {
                    "id": v.id,
                    "name": v.name,
                    "content": v.content[:100] + "..." if len(v.content) > 100 else v.content,
                    "sentCount": v.sent_count,
                    "responseCount": v.response_count,
                    "conversionCount": v.conversion_count,
                    "responseRate": round(v.response_rate * 100, 2),
                    "conversionRate": round(v.conversion_rate * 100, 2),
                    "avgReplyTime": round(v.avg_reply_time, 1),
                    "isWinner": v.id == test.winner_variant_id
                }
                for v in test.variants
            ],
            "startAt": test.start_at.isoformat() if test.start_at else None,
            "completedAt": test.completed_at.isoformat() if test.completed_at else None
        }


# 全局實例
_ab_manager = None

def get_ab_testing_manager() -> ABTestingManager:
    """獲取全局 A/B 測試管理器"""
    global _ab_manager
    if _ab_manager is None:
        _ab_manager = ABTestingManager()
    return _ab_manager


async def create_ab_test(
    name: str,
    variants: List[Dict[str, Any]],
    description: str = "",
    primary_metric: str = "response_rate"
) -> Dict[str, Any]:
    """創建 A/B 測試（異步接口）"""
    manager = get_ab_testing_manager()
    test = manager.create_test(
        name=name,
        variants=variants,
        description=description,
        primary_metric=primary_metric
    )
    
    return {
        "testId": test.id,
        "name": test.name,
        "variantCount": len(test.variants),
        "status": test.status.value
    }
