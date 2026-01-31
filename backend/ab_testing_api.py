"""
A/B 測試 API
A/B Testing API

🆕 後端優化: A/B 測試 API

功能：
- 測試創建和管理
- 流量分配
- 統計分析
- 自動優化
"""

import json
import uuid
import math
import random
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
import threading
import logging

from database import Database

logger = logging.getLogger(__name__)


class TestStatus(str, Enum):
    """測試狀態"""
    DRAFT = "draft"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    WINNER_SELECTED = "winner_selected"


class VariantType(str, Enum):
    """變體類型"""
    MESSAGE = "message"
    TIMING = "timing"
    ROLE = "role"
    STRATEGY = "strategy"


class MetricType(str, Enum):
    """指標類型"""
    CONVERSIONS = "conversions"
    CTR = "ctr"
    REVENUE = "revenue"


@dataclass
class TestVariant:
    """測試變體"""
    id: str
    name: str
    type: VariantType
    config: Dict[str, Any]
    weight: int = 50
    
    # 統計
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    revenue: float = 0.0
    
    # 計算指標
    ctr: float = 0.0
    conversion_rate: float = 0.0
    revenue_per_impression: float = 0.0


@dataclass
class ABTest:
    """A/B 測試"""
    id: str
    name: str
    description: Optional[str]
    status: TestStatus
    type: VariantType
    
    # 變體
    variants: List[TestVariant]
    
    # 配置
    primary_metric: MetricType = MetricType.CONVERSIONS
    target_sample_size: int = 1000
    confidence_level: float = 0.95
    auto_optimize: bool = True
    min_sample_per_variant: int = 50
    
    # 時間
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    
    # 結果
    winner_variant_id: Optional[str] = None
    significance: Optional[float] = None


@dataclass
class TestAnalysis:
    """測試分析結果"""
    is_significant: bool
    confidence: float
    winner_variant_id: Optional[str]
    improvement: float
    recommendation: str


class ABTestingAPI:
    """A/B 測試 API"""
    
    def __init__(self, db: Database):
        self.db = db
        self._lock = threading.Lock()
        self._ensure_tables()
    
    def _ensure_tables(self):
        """確保數據表存在"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            # A/B 測試表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ab_tests (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    status TEXT NOT NULL DEFAULT 'draft',
                    type TEXT NOT NULL,
                    variants TEXT,
                    primary_metric TEXT DEFAULT 'conversions',
                    target_sample_size INTEGER DEFAULT 1000,
                    confidence_level REAL DEFAULT 0.95,
                    auto_optimize INTEGER DEFAULT 1,
                    min_sample_per_variant INTEGER DEFAULT 50,
                    created_at TEXT NOT NULL,
                    started_at TEXT,
                    completed_at TEXT,
                    winner_variant_id TEXT,
                    significance REAL
                )
            """)
            
            # 測試事件表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ab_test_events (
                    id TEXT PRIMARY KEY,
                    test_id TEXT NOT NULL,
                    variant_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    value REAL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (test_id) REFERENCES ab_tests(id)
                )
            """)
            
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_tests_status ON ab_tests(status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_test ON ab_test_events(test_id)")
            
            conn.commit()
    
    # ============ 測試管理 ============
    
    def create_test(
        self,
        name: str,
        test_type: VariantType,
        variants: List[Dict[str, Any]],
        options: Dict[str, Any] = None
    ) -> ABTest:
        """創建測試"""
        test_id = f"test-{uuid.uuid4().hex[:12]}"
        options = options or {}
        
        # 標準化權重
        total_weight = sum(v.get("weight", 50) for v in variants)
        
        test_variants = []
        for i, v in enumerate(variants):
            variant = TestVariant(
                id=f"var-{uuid.uuid4().hex[:8]}",
                name=v.get("name", f"變體 {i+1}"),
                type=test_type,
                config=v.get("config", {}),
                weight=round((v.get("weight", 50) / total_weight) * 100)
            )
            test_variants.append(variant)
        
        test = ABTest(
            id=test_id,
            name=name,
            description=options.get("description"),
            status=TestStatus.DRAFT,
            type=test_type,
            variants=test_variants,
            primary_metric=MetricType(options.get("primary_metric", "conversions")),
            target_sample_size=options.get("target_sample_size", 1000),
            confidence_level=options.get("confidence_level", 0.95),
            auto_optimize=options.get("auto_optimize", True),
            min_sample_per_variant=options.get("min_sample_per_variant", 50)
        )
        
        self._save_test(test)
        
        return test
    
    def get_test(self, test_id: str) -> Optional[ABTest]:
        """獲取測試"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM ab_tests WHERE id = ?", (test_id,))
            row = cursor.fetchone()
            
            if not row:
                return None
            
            return self._row_to_test(row)
    
    def get_all_tests(self, status: Optional[str] = None) -> List[ABTest]:
        """獲取所有測試"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            if status:
                cursor.execute("SELECT * FROM ab_tests WHERE status = ? ORDER BY created_at DESC", (status,))
            else:
                cursor.execute("SELECT * FROM ab_tests ORDER BY created_at DESC")
            
            rows = cursor.fetchall()
            return [self._row_to_test(row) for row in rows]
    
    def update_test(self, test_id: str, updates: Dict[str, Any]) -> Optional[ABTest]:
        """更新測試"""
        test = self.get_test(test_id)
        if not test:
            return None
        
        for key, value in updates.items():
            if hasattr(test, key):
                setattr(test, key, value)
        
        self._save_test(test, is_update=True)
        return test
    
    def delete_test(self, test_id: str) -> bool:
        """刪除測試"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM ab_test_events WHERE test_id = ?", (test_id,))
            cursor.execute("DELETE FROM ab_tests WHERE id = ?", (test_id,))
            conn.commit()
            return cursor.rowcount > 0
    
    # ============ 測試狀態管理 ============
    
    def start_test(self, test_id: str) -> Optional[ABTest]:
        """啟動測試"""
        return self.update_test(test_id, {
            "status": TestStatus.RUNNING,
            "started_at": datetime.now().isoformat()
        })
    
    def pause_test(self, test_id: str) -> Optional[ABTest]:
        """暫停測試"""
        return self.update_test(test_id, {"status": TestStatus.PAUSED})
    
    def resume_test(self, test_id: str) -> Optional[ABTest]:
        """恢復測試"""
        return self.update_test(test_id, {"status": TestStatus.RUNNING})
    
    def complete_test(self, test_id: str) -> Optional[ABTest]:
        """完成測試"""
        test = self.get_test(test_id)
        if not test:
            return None
        
        analysis = self.analyze_test(test_id)
        
        return self.update_test(test_id, {
            "status": TestStatus.COMPLETED,
            "completed_at": datetime.now().isoformat(),
            "winner_variant_id": analysis.winner_variant_id,
            "significance": analysis.confidence
        })
    
    def select_winner(self, test_id: str, variant_id: str) -> Optional[ABTest]:
        """選擇獲勝者"""
        return self.update_test(test_id, {
            "status": TestStatus.WINNER_SELECTED,
            "winner_variant_id": variant_id,
            "completed_at": datetime.now().isoformat()
        })
    
    # ============ 事件記錄 ============
    
    def record_event(
        self, 
        test_id: str, 
        variant_id: str, 
        event_type: str,
        value: float = None
    ) -> bool:
        """記錄事件"""
        test = self.get_test(test_id)
        if not test or test.status != TestStatus.RUNNING:
            return False
        
        # 更新變體統計
        for variant in test.variants:
            if variant.id == variant_id:
                if event_type == "impression":
                    variant.impressions += 1
                elif event_type == "click":
                    variant.clicks += 1
                elif event_type == "conversion":
                    variant.conversions += 1
                    if value:
                        variant.revenue += value
                
                # 更新計算指標
                if variant.impressions > 0:
                    variant.ctr = (variant.clicks / variant.impressions) * 100
                    variant.conversion_rate = (variant.conversions / variant.impressions) * 100
                    variant.revenue_per_impression = variant.revenue / variant.impressions
                
                break
        
        # 保存更新
        self._save_test(test, is_update=True)
        
        # 記錄事件
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO ab_test_events (id, test_id, variant_id, event_type, value, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                f"evt-{uuid.uuid4().hex[:12]}",
                test_id,
                variant_id,
                event_type,
                value,
                datetime.now().isoformat()
            ))
            conn.commit()
        
        # 檢查自動優化
        if test.auto_optimize:
            self._check_auto_optimize(test_id)
        
        return True
    
    def get_variant_for_test(self, test_id: str) -> Optional[TestVariant]:
        """獲取用於流量分配的變體"""
        test = self.get_test(test_id)
        if not test or test.status != TestStatus.RUNNING:
            return None
        
        # 基於權重的隨機選擇
        rand = random.random() * 100
        cum_weight = 0
        
        for variant in test.variants:
            cum_weight += variant.weight
            if rand < cum_weight:
                return variant
        
        return test.variants[0] if test.variants else None
    
    # ============ 統計分析 ============
    
    def analyze_test(self, test_id: str) -> TestAnalysis:
        """分析測試結果"""
        test = self.get_test(test_id)
        if not test:
            return TestAnalysis(
                is_significant=False,
                confidence=0,
                winner_variant_id=None,
                improvement=0,
                recommendation="測試不存在"
            )
        
        variants = test.variants
        if len(variants) < 2:
            return TestAnalysis(
                is_significant=False,
                confidence=0,
                winner_variant_id=None,
                improvement=0,
                recommendation="需要至少兩個變體"
            )
        
        # 獲取指標值
        def get_metric_value(v: TestVariant) -> float:
            if test.primary_metric == MetricType.CONVERSIONS:
                return v.conversion_rate
            elif test.primary_metric == MetricType.CTR:
                return v.ctr
            else:
                return v.revenue_per_impression
        
        # 排序找出最佳
        sorted_variants = sorted(variants, key=get_metric_value, reverse=True)
        winner = sorted_variants[0]
        control = variants[0]  # 假設第一個是對照組
        
        # 計算統計顯著性
        significance = self._calculate_significance(
            winner.conversions, winner.impressions,
            control.conversions, control.impressions
        )
        
        is_significant = significance >= test.confidence_level
        
        # 計算提升
        control_value = get_metric_value(control)
        winner_value = get_metric_value(winner)
        improvement = ((winner_value - control_value) / control_value * 100) if control_value > 0 else 0
        
        # 生成建議
        if not is_significant:
            total_samples = sum(v.impressions for v in variants)
            remaining = test.target_sample_size - total_samples
            if remaining > 0:
                recommendation = f"需要更多樣本（還需約 {remaining} 次曝光）才能得出可靠結論"
            else:
                recommendation = "樣本量已足夠，但未達到統計顯著性"
        elif improvement > 10:
            recommendation = f"建議採用「{winner.name}」，可提升 {improvement:.1f}%"
        elif improvement > 0:
            recommendation = f"「{winner.name}」略勝一籌，提升 {improvement:.1f}%"
        else:
            recommendation = "各變體表現相近，建議繼續測試或保持現狀"
        
        return TestAnalysis(
            is_significant=is_significant,
            confidence=significance,
            winner_variant_id=winner.id if is_significant else None,
            improvement=improvement,
            recommendation=recommendation
        )
    
    def _calculate_significance(
        self,
        success_a: int, total_a: int,
        success_b: int, total_b: int
    ) -> float:
        """計算統計顯著性"""
        if total_a == 0 or total_b == 0:
            return 0
        
        p_a = success_a / total_a
        p_b = success_b / total_b
        p_pooled = (success_a + success_b) / (total_a + total_b)
        
        se = math.sqrt(p_pooled * (1 - p_pooled) * (1/total_a + 1/total_b))
        if se == 0:
            return 0
        
        z = abs(p_a - p_b) / se
        
        # z-score 轉換為置信度
        if z >= 2.576:
            return 0.99
        if z >= 1.96:
            return 0.95
        if z >= 1.645:
            return 0.90
        if z >= 1.28:
            return 0.80
        
        return min(0.79, z / 2)
    
    def _check_auto_optimize(self, test_id: str):
        """檢查自動優化"""
        test = self.get_test(test_id)
        if not test or not test.auto_optimize:
            return
        
        # 檢查是否所有變體都達到最小樣本量
        all_reached_min = all(v.impressions >= test.min_sample_per_variant for v in test.variants)
        if not all_reached_min:
            return
        
        analysis = self.analyze_test(test_id)
        
        if analysis.is_significant and analysis.winner_variant_id:
            self.complete_test(test_id)
            logger.info(f"A/B test {test_id} auto-completed with winner {analysis.winner_variant_id}")
    
    # ============ 私有方法 ============
    
    def _save_test(self, test: ABTest, is_update: bool = False):
        """保存測試"""
        with self.db.get_connection() as conn:
            cursor = conn.cursor()
            
            variants_json = json.dumps([asdict(v) for v in test.variants])
            
            if is_update:
                cursor.execute("""
                    UPDATE ab_tests SET
                        name = ?, description = ?, status = ?, type = ?,
                        variants = ?, primary_metric = ?, target_sample_size = ?,
                        confidence_level = ?, auto_optimize = ?, min_sample_per_variant = ?,
                        started_at = ?, completed_at = ?, winner_variant_id = ?, significance = ?
                    WHERE id = ?
                """, (
                    test.name, test.description, test.status.value, test.type.value,
                    variants_json, test.primary_metric.value, test.target_sample_size,
                    test.confidence_level, 1 if test.auto_optimize else 0, test.min_sample_per_variant,
                    test.started_at, test.completed_at, test.winner_variant_id, test.significance,
                    test.id
                ))
            else:
                cursor.execute("""
                    INSERT INTO ab_tests 
                    (id, name, description, status, type, variants, primary_metric,
                     target_sample_size, confidence_level, auto_optimize, min_sample_per_variant,
                     created_at, started_at, completed_at, winner_variant_id, significance)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    test.id, test.name, test.description, test.status.value, test.type.value,
                    variants_json, test.primary_metric.value, test.target_sample_size,
                    test.confidence_level, 1 if test.auto_optimize else 0, test.min_sample_per_variant,
                    test.created_at, test.started_at, test.completed_at,
                    test.winner_variant_id, test.significance
                ))
            
            conn.commit()
    
    def _row_to_test(self, row) -> ABTest:
        """行轉測試對象"""
        variants = []
        if row[5]:
            for v_data in json.loads(row[5]):
                variants.append(TestVariant(
                    id=v_data["id"],
                    name=v_data["name"],
                    type=VariantType(v_data["type"]),
                    config=v_data.get("config", {}),
                    weight=v_data.get("weight", 50),
                    impressions=v_data.get("impressions", 0),
                    clicks=v_data.get("clicks", 0),
                    conversions=v_data.get("conversions", 0),
                    revenue=v_data.get("revenue", 0.0),
                    ctr=v_data.get("ctr", 0.0),
                    conversion_rate=v_data.get("conversion_rate", 0.0),
                    revenue_per_impression=v_data.get("revenue_per_impression", 0.0)
                ))
        
        return ABTest(
            id=row[0],
            name=row[1],
            description=row[2],
            status=TestStatus(row[3]),
            type=VariantType(row[4]),
            variants=variants,
            primary_metric=MetricType(row[6]) if row[6] else MetricType.CONVERSIONS,
            target_sample_size=row[7] or 1000,
            confidence_level=row[8] or 0.95,
            auto_optimize=bool(row[9]),
            min_sample_per_variant=row[10] or 50,
            created_at=row[11],
            started_at=row[12],
            completed_at=row[13],
            winner_variant_id=row[14],
            significance=row[15]
        )


# ============ IPC 處理器 ============

def register_ab_testing_handlers(ipc_handler, db: Database):
    """註冊 A/B 測試 IPC 處理器"""
    api = ABTestingAPI(db)
    
    @ipc_handler.handle("create-ab-test")
    async def handle_create(data):
        test = api.create_test(
            name=data.get("name", "新測試"),
            test_type=VariantType(data.get("type", "message")),
            variants=data.get("variants", []),
            options=data.get("options", {})
        )
        return {"success": True, "test": asdict(test)}
    
    @ipc_handler.handle("get-ab-tests")
    async def handle_get_all(data):
        tests = api.get_all_tests(status=data.get("status"))
        return {"success": True, "tests": [asdict(t) for t in tests]}
    
    @ipc_handler.handle("get-ab-test")
    async def handle_get(data):
        test = api.get_test(data.get("id"))
        if test:
            return {"success": True, "test": asdict(test)}
        return {"success": False, "error": "Test not found"}
    
    @ipc_handler.handle("start-ab-test")
    async def handle_start(data):
        test = api.start_test(data.get("id"))
        if test:
            return {"success": True, "test": asdict(test)}
        return {"success": False, "error": "Test not found"}
    
    @ipc_handler.handle("pause-ab-test")
    async def handle_pause(data):
        test = api.pause_test(data.get("id"))
        if test:
            return {"success": True, "test": asdict(test)}
        return {"success": False, "error": "Test not found"}
    
    @ipc_handler.handle("complete-ab-test")
    async def handle_complete(data):
        test = api.complete_test(data.get("id"))
        if test:
            return {"success": True, "test": asdict(test)}
        return {"success": False, "error": "Test not found"}
    
    @ipc_handler.handle("select-ab-test-winner")
    async def handle_select_winner(data):
        test = api.select_winner(data.get("id"), data.get("variant_id"))
        if test:
            return {"success": True, "test": asdict(test)}
        return {"success": False, "error": "Test not found"}
    
    @ipc_handler.handle("delete-ab-test")
    async def handle_delete(data):
        success = api.delete_test(data.get("id"))
        return {"success": success}
    
    @ipc_handler.handle("record-ab-test-event")
    async def handle_record_event(data):
        success = api.record_event(
            data.get("test_id"),
            data.get("variant_id"),
            data.get("event_type"),
            data.get("value")
        )
        return {"success": success}
    
    @ipc_handler.handle("get-ab-test-variant")
    async def handle_get_variant(data):
        variant = api.get_variant_for_test(data.get("test_id"))
        if variant:
            return {"success": True, "variant": asdict(variant)}
        return {"success": False, "error": "No variant available"}
    
    @ipc_handler.handle("analyze-ab-test")
    async def handle_analyze(data):
        analysis = api.analyze_test(data.get("id"))
        return {"success": True, "analysis": asdict(analysis)}
    
    return api
