"""
API 使用計費系統

功能：
- 定義計費方案（按次/按時長/按配額）
- 使用量追蹤
- 帳單生成
- 費用計算
"""

import logging
import sqlite3
import os
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from enum import Enum
from decimal import Decimal, ROUND_HALF_UP

logger = logging.getLogger(__name__)

# 數據庫路徑
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'billing.db')


class BillingPlanType(str, Enum):
    """計費方案類型"""
    PAY_PER_USE = "pay_per_use"         # 按次計費
    PAY_PER_HOUR = "pay_per_hour"       # 按時長計費
    SUBSCRIPTION = "subscription"        # 訂閱制（固定配額）
    TIERED = "tiered"                   # 階梯計費


class UsageType(str, Enum):
    """使用類型"""
    ALLOCATION = "allocation"            # API 分配
    RELEASE = "release"                  # API 釋放
    SUCCESS_CALL = "success_call"        # 成功調用
    FAILED_CALL = "failed_call"          # 失敗調用


@dataclass
class BillingPlan:
    """計費方案"""
    id: str
    name: str
    plan_type: BillingPlanType
    base_price: float = 0.0              # 基礎費用（月費等）
    per_allocation: float = 0.0          # 每次分配費用
    per_hour: float = 0.0                # 每小時費用
    included_allocations: int = 0        # 包含的分配次數
    included_hours: int = 0              # 包含的使用時長（小時）
    overage_rate: float = 0.0            # 超額費率
    tier_config: Dict[str, Any] = field(default_factory=dict)  # 階梯配置
    is_active: bool = True
    created_at: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "plan_type": self.plan_type.value if isinstance(self.plan_type, BillingPlanType) else self.plan_type,
            "base_price": self.base_price,
            "per_allocation": self.per_allocation,
            "per_hour": self.per_hour,
            "included_allocations": self.included_allocations,
            "included_hours": self.included_hours,
            "overage_rate": self.overage_rate,
            "tier_config": self.tier_config,
            "is_active": self.is_active,
            "created_at": self.created_at
        }


@dataclass
class UsageRecord:
    """使用記錄"""
    id: str
    tenant_id: str
    usage_type: UsageType
    api_id: str
    quantity: float = 1.0
    duration_seconds: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: str = ""


@dataclass
class Invoice:
    """帳單"""
    id: str
    tenant_id: str
    period_start: str
    period_end: str
    plan_id: str
    base_charge: float = 0.0
    usage_charge: float = 0.0
    overage_charge: float = 0.0
    total_amount: float = 0.0
    currency: str = "USD"
    status: str = "pending"  # pending, paid, overdue
    details: Dict[str, Any] = field(default_factory=dict)
    created_at: str = ""
    paid_at: Optional[str] = None


class BillingManager:
    """計費管理器"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self._init_db()
    
    def _init_db(self):
        """初始化數據庫"""
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 計費方案表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS billing_plans (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                plan_type TEXT NOT NULL,
                base_price REAL DEFAULT 0,
                per_allocation REAL DEFAULT 0,
                per_hour REAL DEFAULT 0,
                included_allocations INTEGER DEFAULT 0,
                included_hours INTEGER DEFAULT 0,
                overage_rate REAL DEFAULT 0,
                tier_config TEXT DEFAULT '{}',
                is_active INTEGER DEFAULT 1,
                created_at TEXT
            )
        ''')
        
        # 租戶計費關聯表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tenant_billing (
                tenant_id TEXT PRIMARY KEY,
                plan_id TEXT,
                billing_start TEXT,
                current_period_start TEXT,
                current_period_end TEXT,
                balance REAL DEFAULT 0,
                FOREIGN KEY (plan_id) REFERENCES billing_plans(id)
            )
        ''')
        
        # 使用記錄表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS usage_records (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                usage_type TEXT NOT NULL,
                api_id TEXT,
                quantity REAL DEFAULT 1,
                duration_seconds INTEGER DEFAULT 0,
                metadata TEXT DEFAULT '{}',
                created_at TEXT
            )
        ''')
        
        # 帳單表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS invoices (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                period_start TEXT,
                period_end TEXT,
                plan_id TEXT,
                base_charge REAL DEFAULT 0,
                usage_charge REAL DEFAULT 0,
                overage_charge REAL DEFAULT 0,
                total_amount REAL DEFAULT 0,
                currency TEXT DEFAULT 'USD',
                status TEXT DEFAULT 'pending',
                details TEXT DEFAULT '{}',
                created_at TEXT,
                paid_at TEXT
            )
        ''')
        
        # 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_usage_tenant ON usage_records(tenant_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_records(created_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id)')
        
        # 創建默認計費方案
        cursor.execute('SELECT COUNT(*) FROM billing_plans')
        if cursor.fetchone()[0] == 0:
            self._create_default_plans(cursor)
        
        conn.commit()
        conn.close()
        logger.info("計費系統數據庫已初始化")
    
    def _create_default_plans(self, cursor):
        """創建默認計費方案"""
        default_plans = [
            {
                "id": "free",
                "name": "免費方案",
                "plan_type": "subscription",
                "base_price": 0,
                "included_allocations": 100,
                "included_hours": 720
            },
            {
                "id": "basic",
                "name": "基礎方案",
                "plan_type": "subscription",
                "base_price": 29.99,
                "included_allocations": 1000,
                "included_hours": 2160,
                "overage_rate": 0.05
            },
            {
                "id": "pro",
                "name": "專業方案",
                "plan_type": "subscription",
                "base_price": 99.99,
                "included_allocations": 5000,
                "included_hours": 7200,
                "overage_rate": 0.03
            },
            {
                "id": "pay_as_you_go",
                "name": "按量付費",
                "plan_type": "pay_per_use",
                "per_allocation": 0.10,
                "per_hour": 0.01
            }
        ]
        
        for plan in default_plans:
            cursor.execute('''
                INSERT INTO billing_plans 
                (id, name, plan_type, base_price, per_allocation, per_hour, 
                 included_allocations, included_hours, overage_rate, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                plan["id"],
                plan["name"],
                plan["plan_type"],
                plan.get("base_price", 0),
                plan.get("per_allocation", 0),
                plan.get("per_hour", 0),
                plan.get("included_allocations", 0),
                plan.get("included_hours", 0),
                plan.get("overage_rate", 0),
                datetime.now().isoformat()
            ))
    
    # ==================== 計費方案管理 ====================
    
    def create_plan(self, plan: BillingPlan) -> bool:
        """創建計費方案"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO billing_plans 
                (id, name, plan_type, base_price, per_allocation, per_hour,
                 included_allocations, included_hours, overage_rate, tier_config, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                plan.id,
                plan.name,
                plan.plan_type.value if isinstance(plan.plan_type, BillingPlanType) else plan.plan_type,
                plan.base_price,
                plan.per_allocation,
                plan.per_hour,
                plan.included_allocations,
                plan.included_hours,
                plan.overage_rate,
                json.dumps(plan.tier_config),
                plan.created_at or datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"創建計費方案失敗: {e}")
            return False
    
    def list_plans(self, active_only: bool = True) -> List[Dict[str, Any]]:
        """列出計費方案"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        if active_only:
            cursor.execute('SELECT * FROM billing_plans WHERE is_active = 1')
        else:
            cursor.execute('SELECT * FROM billing_plans')
        
        rows = cursor.fetchall()
        conn.close()
        
        return [self._row_to_plan(row).to_dict() for row in rows]
    
    def get_plan(self, plan_id: str) -> Optional[BillingPlan]:
        """獲取計費方案"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM billing_plans WHERE id = ?', (plan_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return self._row_to_plan(row)
        return None
    
    def _row_to_plan(self, row) -> BillingPlan:
        return BillingPlan(
            id=row[0],
            name=row[1],
            plan_type=BillingPlanType(row[2]) if row[2] else BillingPlanType.PAY_PER_USE,
            base_price=row[3] or 0,
            per_allocation=row[4] or 0,
            per_hour=row[5] or 0,
            included_allocations=row[6] or 0,
            included_hours=row[7] or 0,
            overage_rate=row[8] or 0,
            tier_config=json.loads(row[9]) if row[9] else {},
            is_active=bool(row[10]),
            created_at=row[11] or ""
        )
    
    # ==================== 租戶計費管理 ====================
    
    def assign_plan_to_tenant(self, tenant_id: str, plan_id: str) -> bool:
        """為租戶分配計費方案"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            now = datetime.now()
            period_end = now + timedelta(days=30)
            
            cursor.execute('''
                INSERT OR REPLACE INTO tenant_billing 
                (tenant_id, plan_id, billing_start, current_period_start, current_period_end)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                tenant_id,
                plan_id,
                now.isoformat(),
                now.isoformat(),
                period_end.isoformat()
            ))
            
            conn.commit()
            conn.close()
            logger.info(f"為租戶 {tenant_id} 分配計費方案 {plan_id}")
            return True
        except Exception as e:
            logger.error(f"分配計費方案失敗: {e}")
            return False
    
    def get_tenant_billing(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        """獲取租戶計費信息"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT tb.*, bp.name as plan_name, bp.plan_type
            FROM tenant_billing tb
            LEFT JOIN billing_plans bp ON tb.plan_id = bp.id
            WHERE tb.tenant_id = ?
        ''', (tenant_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "tenant_id": row[0],
                "plan_id": row[1],
                "billing_start": row[2],
                "current_period_start": row[3],
                "current_period_end": row[4],
                "balance": row[5] or 0,
                "plan_name": row[6],
                "plan_type": row[7]
            }
        return None
    
    # ==================== 使用量記錄 ====================
    
    def record_usage(
        self,
        tenant_id: str,
        usage_type: UsageType,
        api_id: str = "",
        quantity: float = 1.0,
        duration_seconds: int = 0,
        metadata: Dict[str, Any] = None
    ) -> str:
        """記錄使用量"""
        import uuid
        record_id = str(uuid.uuid4())
        
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO usage_records 
                (id, tenant_id, usage_type, api_id, quantity, duration_seconds, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                record_id,
                tenant_id,
                usage_type.value if isinstance(usage_type, UsageType) else usage_type,
                api_id,
                quantity,
                duration_seconds,
                json.dumps(metadata or {}),
                datetime.now().isoformat()
            ))
            
            conn.commit()
            conn.close()
            return record_id
        except Exception as e:
            logger.error(f"記錄使用量失敗: {e}")
            return ""
    
    def get_usage_summary(
        self,
        tenant_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """獲取使用量摘要"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = '''
            SELECT usage_type, COUNT(*) as count, SUM(quantity) as total_qty,
                   SUM(duration_seconds) as total_duration
            FROM usage_records
            WHERE tenant_id = ?
        '''
        params = [tenant_id]
        
        if start_date:
            query += ' AND created_at >= ?'
            params.append(start_date)
        
        if end_date:
            query += ' AND created_at <= ?'
            params.append(end_date)
        
        query += ' GROUP BY usage_type'
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        summary = {}
        total_allocations = 0
        total_hours = 0
        
        for row in rows:
            usage_type = row[0]
            count = row[1] or 0
            qty = row[2] or 0
            duration = row[3] or 0
            
            summary[usage_type] = {
                "count": count,
                "quantity": qty,
                "duration_seconds": duration,
                "duration_hours": round(duration / 3600, 2)
            }
            
            if usage_type == UsageType.ALLOCATION.value:
                total_allocations = count
            
            total_hours += duration / 3600
        
        return {
            "tenant_id": tenant_id,
            "period": {
                "start": start_date,
                "end": end_date
            },
            "by_type": summary,
            "totals": {
                "allocations": total_allocations,
                "hours": round(total_hours, 2)
            }
        }
    
    # ==================== 帳單計算 ====================
    
    def calculate_charges(self, tenant_id: str, period_start: str, period_end: str) -> Dict[str, Any]:
        """計算費用"""
        # 獲取租戶計費信息
        billing_info = self.get_tenant_billing(tenant_id)
        if not billing_info:
            return {"error": "租戶未設置計費方案"}
        
        plan = self.get_plan(billing_info['plan_id'])
        if not plan:
            return {"error": "計費方案不存在"}
        
        # 獲取使用量
        usage = self.get_usage_summary(tenant_id, period_start, period_end)
        
        # 計算費用
        base_charge = Decimal(str(plan.base_price))
        usage_charge = Decimal('0')
        overage_charge = Decimal('0')
        
        allocations = usage['totals']['allocations']
        hours = usage['totals']['hours']
        
        if plan.plan_type == BillingPlanType.PAY_PER_USE:
            # 按次計費
            usage_charge = Decimal(str(allocations)) * Decimal(str(plan.per_allocation))
            usage_charge += Decimal(str(hours)) * Decimal(str(plan.per_hour))
            
        elif plan.plan_type == BillingPlanType.SUBSCRIPTION:
            # 訂閱制
            # 計算超額
            overage_allocations = max(0, allocations - plan.included_allocations)
            overage_hours = max(0, hours - plan.included_hours)
            
            if overage_allocations > 0:
                overage_charge += Decimal(str(overage_allocations)) * Decimal(str(plan.overage_rate))
            if overage_hours > 0:
                overage_charge += Decimal(str(overage_hours)) * Decimal(str(plan.overage_rate))
            
        elif plan.plan_type == BillingPlanType.TIERED:
            # 階梯計費
            tiers = plan.tier_config.get('tiers', [])
            remaining = allocations
            
            for tier in tiers:
                tier_limit = tier.get('limit', float('inf'))
                tier_rate = Decimal(str(tier.get('rate', 0)))
                
                if remaining <= 0:
                    break
                
                billable = min(remaining, tier_limit)
                usage_charge += Decimal(str(billable)) * tier_rate
                remaining -= billable
        
        total = base_charge + usage_charge + overage_charge
        total = total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        return {
            "tenant_id": tenant_id,
            "period": {
                "start": period_start,
                "end": period_end
            },
            "plan": plan.to_dict(),
            "usage": usage['totals'],
            "charges": {
                "base": float(base_charge),
                "usage": float(usage_charge.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)),
                "overage": float(overage_charge.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)),
                "total": float(total)
            },
            "details": {
                "included_allocations": plan.included_allocations,
                "used_allocations": allocations,
                "overage_allocations": max(0, allocations - plan.included_allocations),
                "included_hours": plan.included_hours,
                "used_hours": hours,
                "overage_hours": max(0, hours - plan.included_hours)
            }
        }
    
    def generate_invoice(self, tenant_id: str, period_start: str, period_end: str) -> Optional[Invoice]:
        """生成帳單"""
        import uuid
        
        charges = self.calculate_charges(tenant_id, period_start, period_end)
        
        if 'error' in charges:
            logger.error(f"生成帳單失敗: {charges['error']}")
            return None
        
        invoice = Invoice(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            period_start=period_start,
            period_end=period_end,
            plan_id=charges['plan']['id'],
            base_charge=charges['charges']['base'],
            usage_charge=charges['charges']['usage'],
            overage_charge=charges['charges']['overage'],
            total_amount=charges['charges']['total'],
            details=charges['details'],
            created_at=datetime.now().isoformat()
        )
        
        # 保存帳單
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO invoices 
                (id, tenant_id, period_start, period_end, plan_id, base_charge,
                 usage_charge, overage_charge, total_amount, details, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                invoice.id,
                invoice.tenant_id,
                invoice.period_start,
                invoice.period_end,
                invoice.plan_id,
                invoice.base_charge,
                invoice.usage_charge,
                invoice.overage_charge,
                invoice.total_amount,
                json.dumps(invoice.details),
                invoice.created_at
            ))
            
            conn.commit()
            conn.close()
            logger.info(f"生成帳單: {invoice.id}, 金額: {invoice.total_amount}")
            return invoice
        except Exception as e:
            logger.error(f"保存帳單失敗: {e}")
            return None
    
    def list_invoices(self, tenant_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict[str, Any]]:
        """列出帳單"""
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        query = 'SELECT * FROM invoices WHERE 1=1'
        params = []
        
        if tenant_id:
            query += ' AND tenant_id = ?'
            params.append(tenant_id)
        
        if status:
            query += ' AND status = ?'
            params.append(status)
        
        query += ' ORDER BY created_at DESC'
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [{
            "id": row[0],
            "tenant_id": row[1],
            "period_start": row[2],
            "period_end": row[3],
            "plan_id": row[4],
            "base_charge": row[5],
            "usage_charge": row[6],
            "overage_charge": row[7],
            "total_amount": row[8],
            "currency": row[9],
            "status": row[10],
            "details": json.loads(row[11]) if row[11] else {},
            "created_at": row[12],
            "paid_at": row[13]
        } for row in rows]
    
    def mark_invoice_paid(self, invoice_id: str) -> bool:
        """標記帳單已支付"""
        try:
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE invoices 
                SET status = 'paid', paid_at = ?
                WHERE id = ?
            ''', (datetime.now().isoformat(), invoice_id))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"標記帳單支付失敗: {e}")
            return False


# 獲取單例
def get_billing_manager() -> BillingManager:
    return BillingManager()
