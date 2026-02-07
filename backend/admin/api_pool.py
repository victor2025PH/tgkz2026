"""
Telegram API 對接池管理模塊

功能：
- 批量管理 Telegram 官方 API 憑據 (api_id + api_hash)
- 自動分配 API 給帳號
- API 健康監控
- 帳號-API 綁定關係

設計理念：
- 與代理池 (proxy_pool.py) 架構對齊，便於理解和維護
- 每個帳號 = 一組 API 憑據 + 一個代理 IP（雙池隔離）
- 使用 SQLite 存儲，與代理池一致
"""

import sqlite3
import uuid
import asyncio
import logging
from dataclasses import dataclass
from typing import Optional, List, Dict, Any, Tuple
from enum import Enum
from datetime import datetime
import os
import sys

logger = logging.getLogger(__name__)


class ApiPoolStatus(str, Enum):
    """API 憑據狀態"""
    AVAILABLE = "available"      # 可用（未達上限）
    FULL = "full"               # 已滿（達到最大綁定數）
    DISABLED = "disabled"        # 已禁用
    BANNED = "banned"           # 被封禁（Telegram 側）


@dataclass
class TelegramApiCredential:
    """Telegram API 憑據數據類"""
    id: str
    api_id: str                          # Telegram API ID
    api_hash: str                        # Telegram API Hash（加密存儲）
    name: str                            # 別名/備註
    source_phone: Optional[str] = None   # 來源手機號（申請時用的號碼）
    status: ApiPoolStatus = ApiPoolStatus.AVAILABLE
    max_accounts: int = 5                # 每組憑據最大綁定帳號數
    current_accounts: int = 0            # 當前已綁定帳號數
    success_count: int = 0               # 成功登錄次數
    fail_count: int = 0                  # 失敗次數
    last_used: Optional[str] = None      # 最後使用時間
    created_at: Optional[str] = None     # 創建時間
    note: Optional[str] = None           # 備註
    # 🆕 會員等級聯動
    min_member_level: str = "free"       # 最低會員等級要求 (free, bronze, silver, gold, diamond, star, king)
    priority: int = 0                    # 優先級（數字越大優先級越高）
    is_premium: bool = False             # 是否為高級憑據
    # 🆕 分組管理
    group_id: Optional[str] = None       # 所屬分組 ID

    def to_dict(self, include_hash: bool = False) -> Dict[str, Any]:
        """轉換為字典"""
        result = {
            "id": self.id,
            "api_id": self.api_id,
            "name": self.name,
            "source_phone": self.source_phone,
            "status": self.status.value if isinstance(self.status, ApiPoolStatus) else self.status,
            "max_accounts": self.max_accounts,
            "current_accounts": self.current_accounts,
            "success_count": self.success_count,
            "fail_count": self.fail_count,
            "success_rate": self._calc_success_rate(),
            "last_used": self.last_used,
            "created_at": self.created_at,
            "note": self.note,
            "is_available": self.current_accounts < self.max_accounts and self.status == ApiPoolStatus.AVAILABLE,
            # 🆕 會員等級相關
            "min_member_level": self.min_member_level,
            "priority": self.priority,
            "is_premium": self.is_premium,
            # 🆕 分組
            "group_id": self.group_id
        }
        if include_hash:
            # 包含完整 hash（供編輯使用）及脫敏版本
            result["api_hash"] = self.api_hash or ""
            if self.api_hash and len(self.api_hash) > 8:
                result["api_hash_masked"] = f"{self.api_hash[:4]}...{self.api_hash[-4:]}"
            else:
                result["api_hash_masked"] = "***"
        # 額外統計字段（供前端詳情面板使用）
        result["total_requests"] = self.success_count + self.fail_count
        result["failed_requests"] = self.fail_count
        result["health_score"] = self._calc_success_rate()  # 用成功率作為健康分數
        result["last_used_at"] = self.last_used
        return result

    def _calc_success_rate(self) -> float:
        """計算成功率"""
        total = self.success_count + self.fail_count
        if total == 0:
            return 100.0
        return round(self.success_count / total * 100, 1)


@dataclass
class ApiAllocation:
    """API 分配記錄"""
    id: str
    api_credential_id: str     # 關聯的 API 憑據 ID
    api_id: str                # Telegram API ID（冗餘，便於查詢）
    account_phone: str         # 分配給的帳號手機號
    account_id: Optional[str] = None  # 帳號 ID（可選）
    allocated_at: Optional[str] = None
    status: str = "active"     # active, released

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "api_credential_id": self.api_credential_id,
            "api_id": self.api_id,
            "account_phone": self.account_phone,
            "account_id": self.account_id,
            "allocated_at": self.allocated_at,
            "status": self.status
        }


class ApiPoolManager:
    """
    API 對接池管理器（單例）
    
    與 ProxyPoolManager 設計對齊：
    - 使用 SQLite 存儲
    - 提供增刪改查、分配/釋放功能
    - 狀態管理與統計
    
    🆕 智能分配策略：
    - balanced: 負載均衡（默認）
    - success_rate: 成功率優先
    - least_failures: 最少失敗優先
    - round_robin: 輪詢分配
    """
    
    # 可用的分配策略
    ALLOCATION_STRATEGIES = {
        "balanced": "負載均衡（優先分配負載低的）",
        "success_rate": "成功率優先（優先分配成功率高的）",
        "least_failures": "最少失敗優先（優先分配失敗次數少的）",
        "round_robin": "輪詢分配（按順序輪流分配）"
    }

    _instance = None
    _db_path: str = None
    _default_strategy: str = "balanced"  # 🆕 默認分配策略

    def __new__(cls, db_path: str = None):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, db_path: str = None):
        if self._initialized:
            return
        
        if db_path:
            self._db_path = db_path
        else:
            # 默認數據庫路徑
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            self._db_path = os.path.join(base_dir, 'data', 'tgmatrix.db')
        
        self._init_tables()
        self._initialized = True
        logger.info(f"[ApiPoolManager] Initialized with db: {self._db_path}")

    def _get_connection(self) -> sqlite3.Connection:
        """獲取數據庫連接"""
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_tables(self):
        """初始化數據庫表"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # API 憑據表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS telegram_api_pool (
                    id TEXT PRIMARY KEY,
                    api_id TEXT NOT NULL UNIQUE,
                    api_hash TEXT NOT NULL,
                    name TEXT,
                    source_phone TEXT,
                    status TEXT DEFAULT 'available',
                    max_accounts INTEGER DEFAULT 5,
                    current_accounts INTEGER DEFAULT 0,
                    success_count INTEGER DEFAULT 0,
                    fail_count INTEGER DEFAULT 0,
                    last_used TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    note TEXT,
                    min_member_level TEXT DEFAULT 'free',
                    priority INTEGER DEFAULT 0,
                    is_premium INTEGER DEFAULT 0
                )
            ''')
            
            # 🆕 遷移：添加會員等級相關欄位（如果不存在）
            try:
                cursor.execute('ALTER TABLE telegram_api_pool ADD COLUMN min_member_level TEXT DEFAULT "free"')
            except:
                pass
            try:
                cursor.execute('ALTER TABLE telegram_api_pool ADD COLUMN priority INTEGER DEFAULT 0')
            except:
                pass
            try:
                cursor.execute('ALTER TABLE telegram_api_pool ADD COLUMN is_premium INTEGER DEFAULT 0')
            except:
                pass
            
            # 🆕 P6: 故障轉移相關欄位
            try:
                cursor.execute('ALTER TABLE telegram_api_pool ADD COLUMN consecutive_failures INTEGER DEFAULT 0')
            except:
                pass
            try:
                cursor.execute('ALTER TABLE telegram_api_pool ADD COLUMN consecutive_successes INTEGER DEFAULT 0')
            except:
                pass
            try:
                cursor.execute('ALTER TABLE telegram_api_pool ADD COLUMN last_error TEXT')
            except:
                pass
            try:
                cursor.execute('ALTER TABLE telegram_api_pool ADD COLUMN last_error_at TEXT')
            except:
                pass
            try:
                cursor.execute('ALTER TABLE telegram_api_pool ADD COLUMN last_success_at TEXT')
            except:
                pass
            
            # 🆕 P6: 多租戶支持
            try:
                cursor.execute('ALTER TABLE telegram_api_pool ADD COLUMN tenant_id TEXT DEFAULT "default"')
            except:
                pass
            try:
                cursor.execute('ALTER TABLE telegram_api_groups ADD COLUMN tenant_id TEXT DEFAULT "default"')
            except:
                pass
            
            # 租戶表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS tenants (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    api_quota INTEGER DEFAULT 100,
                    enabled INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 創建默認租戶
            cursor.execute('SELECT COUNT(*) FROM tenants WHERE id = "default"')
            if cursor.fetchone()[0] == 0:
                cursor.execute('''
                    INSERT INTO tenants (id, name, description, api_quota)
                    VALUES ('default', '默認租戶', '系統默認租戶', 1000)
                ''')
            
            # 🆕 API 分組表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS telegram_api_groups (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL UNIQUE,
                    description TEXT,
                    color TEXT DEFAULT '#3B82F6',
                    icon TEXT DEFAULT '📁',
                    sort_order INTEGER DEFAULT 0,
                    is_default INTEGER DEFAULT 0,
                    allocation_strategy TEXT DEFAULT 'balanced',
                    priority_boost INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 🆕 遷移：添加分組策略欄位
            try:
                cursor.execute('ALTER TABLE telegram_api_groups ADD COLUMN allocation_strategy TEXT DEFAULT "balanced"')
            except:
                pass
            try:
                cursor.execute('ALTER TABLE telegram_api_groups ADD COLUMN priority_boost INTEGER DEFAULT 0')
            except:
                pass
            
            # 🆕 遷移：添加分組欄位
            try:
                cursor.execute('ALTER TABLE telegram_api_pool ADD COLUMN group_id TEXT')
            except:
                pass
            
            # 創建默認分組（如果不存在）
            cursor.execute('SELECT COUNT(*) FROM telegram_api_groups WHERE is_default = 1')
            if cursor.fetchone()[0] == 0:
                cursor.execute('''
                    INSERT INTO telegram_api_groups (id, name, description, icon, is_default)
                    VALUES ('default', '默認分組', '未分類的 API 憑據', '📦', 1)
                ''')
            
            # 🆕 P6: API 使用統計表（用於可視化）
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS telegram_api_hourly_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    api_id TEXT NOT NULL,
                    hour_key TEXT NOT NULL,
                    allocations INTEGER DEFAULT 0,
                    releases INTEGER DEFAULT 0,
                    successes INTEGER DEFAULT 0,
                    failures INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(api_id, hour_key)
                )
            ''')
            
            # 創建索引加速查詢
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_hourly_stats_hour ON telegram_api_hourly_stats(hour_key)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_hourly_stats_api ON telegram_api_hourly_stats(api_id)')
            
            # 🆕 P6: 分配規則表
            # rule_type: whitelist, blacklist, binding, restriction
            # target_type: phone, user_id, ip, user_level
            # action: allow, deny, bind, prefer
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS telegram_api_allocation_rules (
                    id TEXT PRIMARY KEY,
                    rule_type TEXT NOT NULL,
                    target_type TEXT NOT NULL,
                    target_value TEXT NOT NULL,
                    api_id TEXT,
                    action TEXT NOT NULL,
                    priority INTEGER DEFAULT 0,
                    enabled INTEGER DEFAULT 1,
                    expires_at TEXT,
                    note TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_rules_type ON telegram_api_allocation_rules(rule_type)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_rules_target ON telegram_api_allocation_rules(target_type, target_value)')
            
            # API 分配記錄表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS telegram_api_allocations (
                    id TEXT PRIMARY KEY,
                    api_credential_id TEXT NOT NULL,
                    api_id TEXT NOT NULL,
                    account_phone TEXT NOT NULL UNIQUE,
                    account_id TEXT,
                    allocated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'active',
                    FOREIGN KEY (api_credential_id) REFERENCES telegram_api_pool(id)
                )
            ''')
            
            # 🆕 分配歷史審計表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS telegram_api_allocation_history (
                    id TEXT PRIMARY KEY,
                    action TEXT NOT NULL,
                    api_credential_id TEXT,
                    api_id TEXT NOT NULL,
                    api_name TEXT,
                    account_phone TEXT NOT NULL,
                    account_id TEXT,
                    operator_id TEXT,
                    operator_name TEXT,
                    strategy_used TEXT,
                    ip_address TEXT,
                    details TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # 創建索引
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_api_pool_status ON telegram_api_pool(status)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_api_pool_api_id ON telegram_api_pool(api_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_api_alloc_phone ON telegram_api_allocations(account_phone)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_api_alloc_cred ON telegram_api_allocations(api_credential_id)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_api_alloc_status ON telegram_api_allocations(status)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_api_history_phone ON telegram_api_allocation_history(account_phone)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_api_history_created ON telegram_api_allocation_history(created_at)')
            
            conn.commit()
            logger.info("[ApiPoolManager] Database tables initialized")
        except Exception as e:
            logger.error(f"[ApiPoolManager] Error initializing tables: {e}")
            raise
        finally:
            conn.close()

    # ==================== 管理功能（增刪改查） ====================

    def add_api(
        self,
        api_id: str,
        api_hash: str,
        name: str = "",
        source_phone: Optional[str] = None,
        max_accounts: int = 5,
        note: Optional[str] = None,
        min_member_level: str = "free",
        priority: int = 0,
        is_premium: bool = False
    ) -> Tuple[bool, str, Optional[TelegramApiCredential]]:
        """
        添加 API 憑據到池中
        
        Args:
            api_id: Telegram API ID（從 my.telegram.org 獲取）
            api_hash: Telegram API Hash
            name: 別名
            source_phone: 來源手機號（申請時用的號碼）
            max_accounts: 最大綁定帳號數
            note: 備註
            min_member_level: 最低會員等級要求 (free/bronze/silver/gold/diamond/star/king)
            priority: 優先級（數字越大越優先）
            is_premium: 是否為高級憑據
            
        Returns:
            (是否成功, 消息, 憑據對象)
        """
        if not api_id or not api_hash:
            return False, "API ID 和 API Hash 不能為空", None
        
        # 清理輸入
        api_id = api_id.strip()
        api_hash = api_hash.strip()
        
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 檢查是否已存在
            cursor.execute('SELECT id FROM telegram_api_pool WHERE api_id = ?', (api_id,))
            if cursor.fetchone():
                return False, f"API ID {api_id} 已存在", None
            
            # 生成唯一 ID
            cred_id = f"api_{uuid.uuid4().hex[:12]}"
            now = datetime.now().isoformat()
            
            # 插入記錄
            cursor.execute('''
                INSERT INTO telegram_api_pool 
                (id, api_id, api_hash, name, source_phone, max_accounts, note, created_at, min_member_level, priority, is_premium)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (cred_id, api_id, api_hash, name or f"API-{api_id}", source_phone, max_accounts, note, now, 
                  min_member_level, priority, 1 if is_premium else 0))
            
            conn.commit()
            
            cred = TelegramApiCredential(
                id=cred_id,
                api_id=api_id,
                api_hash=api_hash,
                name=name or f"API-{api_id}",
                source_phone=source_phone,
                max_accounts=max_accounts,
                note=note,
                created_at=now,
                min_member_level=min_member_level,
                priority=priority,
                is_premium=is_premium
            )
            
            logger.info(f"[ApiPoolManager] Added API: {api_id} ({name})")
            return True, f"已添加 API: {name or api_id}", cred
            
        except sqlite3.IntegrityError as e:
            return False, f"API ID {api_id} 已存在", None
        except Exception as e:
            logger.error(f"[ApiPoolManager] Error adding API: {e}")
            return False, f"添加失敗: {str(e)}", None
        finally:
            conn.close()

    def add_apis_batch(self, apis: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        批量添加 API 憑據
        
        Args:
            apis: API 列表，每項包含 api_id, api_hash, name 等
            
        Returns:
            批量操作結果
        """
        results = {"success": 0, "failed": 0, "errors": [], "duplicates": 0}
        
        for api_data in apis:
            success, msg, _ = self.add_api(
                api_id=api_data.get("api_id", ""),
                api_hash=api_data.get("api_hash", ""),
                name=api_data.get("name", ""),
                source_phone=api_data.get("source_phone"),
                max_accounts=api_data.get("max_accounts", 5),
                note=api_data.get("note")
            )
            if success:
                results["success"] += 1
            else:
                results["failed"] += 1
                if "已存在" in msg:
                    results["duplicates"] += 1
                results["errors"].append({"api_id": api_data.get("api_id"), "error": msg})
        
        return results

    def parse_batch_import_text(self, text: str, default_max_accounts: int = 5) -> List[Dict[str, Any]]:
        """
        解析批量導入文本，支持多種格式
        
        支持格式：
        1. CSV 格式（帶表頭）: api_id,api_hash,name,source_phone,max_accounts
        2. CSV 格式（無表頭）: 12345678,abc123hash456,MyApp,+8613800138000,5
        3. 簡單格式（每行）: api_id:api_hash 或 api_id,api_hash
        4. JSON 格式: [{"api_id": "123", "api_hash": "abc"}, ...]
        
        Args:
            text: 待解析的文本
            default_max_accounts: 默認最大綁定帳號數
            
        Returns:
            解析後的 API 列表
        """
        import csv
        import io
        import json
        import re
        
        apis = []
        text = text.strip()
        
        if not text:
            return apis
        
        # 嘗試 JSON 格式
        if text.startswith('['):
            try:
                parsed = json.loads(text)
                if isinstance(parsed, list):
                    for item in parsed:
                        if isinstance(item, dict) and item.get('api_id') and item.get('api_hash'):
                            apis.append({
                                'api_id': str(item.get('api_id', '')).strip(),
                                'api_hash': str(item.get('api_hash', '')).strip(),
                                'name': str(item.get('name', '')).strip() or None,
                                'source_phone': str(item.get('source_phone', '')).strip() or None,
                                'max_accounts': int(item.get('max_accounts', default_max_accounts)),
                                'note': str(item.get('note', '')).strip() or None
                            })
                    return apis
            except json.JSONDecodeError:
                pass
        
        # 按行解析
        lines = text.strip().split('\n')
        
        # 檢測 CSV 表頭
        first_line = lines[0].strip().lower()
        has_header = 'api_id' in first_line and 'api_hash' in first_line
        
        if has_header:
            # CSV 格式（帶表頭）
            try:
                reader = csv.DictReader(io.StringIO(text))
                for row in reader:
                    api_id = str(row.get('api_id', '')).strip()
                    api_hash = str(row.get('api_hash', '')).strip()
                    if api_id and api_hash:
                        apis.append({
                            'api_id': api_id,
                            'api_hash': api_hash,
                            'name': str(row.get('name', '')).strip() or None,
                            'source_phone': str(row.get('source_phone', row.get('phone', ''))).strip() or None,
                            'max_accounts': int(row.get('max_accounts', default_max_accounts) or default_max_accounts),
                            'note': str(row.get('note', '')).strip() or None
                        })
                return apis
            except Exception:
                pass
        
        # 逐行解析（簡單格式或無表頭 CSV）
        for line in lines:
            line = line.strip()
            if not line or line.startswith('#'):  # 跳過空行和註釋
                continue
            
            # 嘗試多種分隔符：逗號、冒號、Tab、空格
            parts = None
            for sep in [',', ':', '\t', ' ']:
                if sep in line:
                    parts = [p.strip() for p in line.split(sep)]
                    break
            
            if not parts or len(parts) < 2:
                continue
            
            # 跳過可能的表頭行
            if parts[0].lower() == 'api_id':
                continue
            
            api_id = parts[0].strip()
            api_hash = parts[1].strip()
            
            # 驗證：api_id 應為數字，api_hash 應為 32 位十六進制
            if not api_id.isdigit():
                continue
            if not re.match(r'^[a-fA-F0-9]{32}$', api_hash):
                # 如果不是標準 32 位 hash，仍然接受但記錄
                pass
            
            api_data = {
                'api_id': api_id,
                'api_hash': api_hash,
                'name': parts[2].strip() if len(parts) > 2 and parts[2].strip() else None,
                'source_phone': parts[3].strip() if len(parts) > 3 and parts[3].strip() else None,
                'max_accounts': int(parts[4]) if len(parts) > 4 and parts[4].strip().isdigit() else default_max_accounts,
                'note': parts[5].strip() if len(parts) > 5 and parts[5].strip() else None
            }
            apis.append(api_data)
        
        return apis

    def import_from_text(self, text: str, default_max_accounts: int = 5) -> Dict[str, Any]:
        """
        從文本批量導入 API 憑據
        
        Args:
            text: 待導入的文本
            default_max_accounts: 默認最大綁定帳號數
            
        Returns:
            導入結果
        """
        apis = self.parse_batch_import_text(text, default_max_accounts)
        
        if not apis:
            return {
                "success": 0,
                "failed": 0,
                "duplicates": 0,
                "parsed": 0,
                "errors": [{"error": "無法解析任何有效的 API 憑據，請檢查格式"}]
            }
        
        result = self.add_apis_batch(apis)
        result["parsed"] = len(apis)
        return result

    def remove_api(self, api_id: str, force: bool = False) -> Tuple[bool, str]:
        """
        移除 API 憑據
        
        Args:
            api_id: API ID
            force: 是否強制刪除（即使有綁定帳號）
            
        Returns:
            (是否成功, 消息)
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 查找憑據
            cursor.execute('SELECT id, current_accounts, name FROM telegram_api_pool WHERE api_id = ?', (api_id,))
            row = cursor.fetchone()
            if not row:
                return False, f"API {api_id} 不存在"
            
            cred_id, current_accounts, name = row['id'], row['current_accounts'], row['name']
            
            # 檢查是否有綁定帳號
            if current_accounts > 0 and not force:
                return False, f"API {api_id} 仍有 {current_accounts} 個帳號綁定，無法刪除（使用 force=true 強制刪除）"
            
            # 如果強制刪除，先釋放所有分配
            if force and current_accounts > 0:
                cursor.execute('''
                    UPDATE telegram_api_allocations 
                    SET status = 'released' 
                    WHERE api_credential_id = ? AND status = 'active'
                ''', (cred_id,))
            
            # 刪除憑據
            cursor.execute('DELETE FROM telegram_api_pool WHERE id = ?', (cred_id,))
            conn.commit()
            
            logger.info(f"[ApiPoolManager] Removed API: {api_id} ({name})")
            return True, f"已移除 API: {name or api_id}"
            
        except Exception as e:
            logger.error(f"[ApiPoolManager] Error removing API: {e}")
            return False, f"移除失敗: {str(e)}"
        finally:
            conn.close()

    def update_api(
        self,
        api_id: str,
        name: Optional[str] = None,
        api_hash: Optional[str] = None,
        source_phone: Optional[str] = None,
        max_accounts: Optional[int] = None,
        note: Optional[str] = None,
        status: Optional[str] = None,
        min_member_level: Optional[str] = None,
        priority: Optional[int] = None,
        is_premium: Optional[bool] = None,
        group_id: Optional[str] = None
    ) -> Tuple[bool, str]:
        """更新 API 憑據信息（包括會員等級限制）"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 構建更新語句
            updates = []
            params = []
            
            if name is not None:
                updates.append("name = ?")
                params.append(name)
            if api_hash is not None:
                updates.append("api_hash = ?")
                params.append(api_hash)
            if source_phone is not None:
                updates.append("source_phone = ?")
                params.append(source_phone if source_phone else None)
            if max_accounts is not None:
                updates.append("max_accounts = ?")
                params.append(max_accounts)
            if note is not None:
                updates.append("note = ?")
                params.append(note)
            if status is not None:
                updates.append("status = ?")
                params.append(status)
            # 🆕 會員等級相關字段
            if min_member_level is not None:
                updates.append("min_member_level = ?")
                params.append(min_member_level)
            if priority is not None:
                updates.append("priority = ?")
                params.append(priority)
            if is_premium is not None:
                updates.append("is_premium = ?")
                params.append(1 if is_premium else 0)
            if group_id is not None:
                updates.append("group_id = ?")
                params.append(group_id if group_id else None)
            
            if not updates:
                return False, "沒有要更新的字段"
            
            params.append(api_id)
            cursor.execute(
                f'UPDATE telegram_api_pool SET {", ".join(updates)} WHERE api_id = ?',
                params
            )
            
            if cursor.rowcount == 0:
                return False, f"API {api_id} 不存在"
            
            conn.commit()
            logger.info(f"[ApiPoolManager] Updated API: {api_id}")
            return True, f"已更新 API: {api_id}"
            
        except Exception as e:
            logger.error(f"[ApiPoolManager] Error updating API: {e}")
            return False, f"更新失敗: {str(e)}"
        finally:
            conn.close()

    def disable_api(self, api_id: str) -> Tuple[bool, str]:
        """禁用 API（不影響已綁定帳號，僅禁止新分配）"""
        return self.update_api(api_id, status=ApiPoolStatus.DISABLED.value)

    def enable_api(self, api_id: str) -> Tuple[bool, str]:
        """啟用 API"""
        return self.update_api(api_id, status=ApiPoolStatus.AVAILABLE.value)

    def get_api(self, api_id: str, include_hash: bool = False) -> Optional[TelegramApiCredential]:
        """獲取單個 API 憑據"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM telegram_api_pool WHERE api_id = ?', (api_id,))
            row = cursor.fetchone()
            if row:
                return self._row_to_credential(row)
            return None
        finally:
            conn.close()

    def list_apis(
        self,
        status: Optional[str] = None,
        include_hash: bool = False
    ) -> List[Dict[str, Any]]:
        """
        列出所有 API 憑據
        
        Args:
            status: 過濾狀態
            include_hash: 是否包含脫敏的 Hash
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            if status:
                cursor.execute('SELECT * FROM telegram_api_pool WHERE status = ? ORDER BY created_at DESC', (status,))
            else:
                cursor.execute('SELECT * FROM telegram_api_pool ORDER BY created_at DESC')
            
            apis = [self._row_to_credential(row).to_dict(include_hash=include_hash) for row in cursor.fetchall()]
            
            # 填充分組名稱
            try:
                cursor.execute('SELECT id, name, icon FROM api_pool_groups')
                group_map = {row['id']: f"{row['icon']} {row['name']}" if row.get('icon') else row['name'] for row in cursor.fetchall()}
                for api in apis:
                    if api.get('group_id') and api['group_id'] in group_map:
                        api['group_name'] = group_map[api['group_id']]
            except Exception:
                pass  # 分組表可能不存在
            
            return apis
        finally:
            conn.close()

    def get_pool_stats(self) -> Dict[str, Any]:
        """獲取池統計信息"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 總數統計
            cursor.execute('SELECT COUNT(*) as total FROM telegram_api_pool')
            total = cursor.fetchone()['total']
            
            # 按狀態統計
            cursor.execute('''
                SELECT status, COUNT(*) as count 
                FROM telegram_api_pool 
                GROUP BY status
            ''')
            status_counts = {row['status']: row['count'] for row in cursor.fetchall()}
            
            # 可用數（未達上限且狀態為 available）
            cursor.execute('''
                SELECT COUNT(*) as count 
                FROM telegram_api_pool 
                WHERE status = 'available' AND current_accounts < max_accounts
            ''')
            available_for_assign = cursor.fetchone()['count']
            
            # 已分配帳號總數
            cursor.execute('''
                SELECT COUNT(*) as count 
                FROM telegram_api_allocations 
                WHERE status = 'active'
            ''')
            total_allocations = cursor.fetchone()['count']
            
            return {
                "total": total,
                "available": status_counts.get('available', 0),
                "full": status_counts.get('full', 0),
                "disabled": status_counts.get('disabled', 0),
                "banned": status_counts.get('banned', 0),
                "available_for_assign": available_for_assign,
                "total_allocations": total_allocations,
                "allocation_strategy": self._default_strategy,
                "available_strategies": self.ALLOCATION_STRATEGIES
            }
        finally:
            conn.close()

    def get_allocation_strategy(self) -> str:
        """獲取當前分配策略"""
        return self._default_strategy

    def _record_allocation_history(
        self,
        action: str,
        api_id: str,
        account_phone: str,
        api_credential_id: Optional[str] = None,
        api_name: Optional[str] = None,
        account_id: Optional[str] = None,
        operator_id: Optional[str] = None,
        operator_name: Optional[str] = None,
        strategy_used: Optional[str] = None,
        ip_address: Optional[str] = None,
        details: Optional[str] = None
    ):
        """
        記錄分配歷史審計
        
        Args:
            action: 動作類型（allocate, release, manual_allocate, auto_release）
            api_id: API ID
            account_phone: 帳號手機號
            其他參數: 可選的審計信息
        """
        import json
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            record_id = f"hist_{uuid.uuid4().hex[:12]}"
            now = datetime.now().isoformat()
            
            details_json = json.dumps(details) if isinstance(details, dict) else details
            
            cursor.execute('''
                INSERT INTO telegram_api_allocation_history 
                (id, action, api_credential_id, api_id, api_name, account_phone, account_id, 
                 operator_id, operator_name, strategy_used, ip_address, details, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (record_id, action, api_credential_id, api_id, api_name, account_phone, account_id,
                  operator_id, operator_name, strategy_used, ip_address, details_json, now))
            
            conn.commit()
        except Exception as e:
            logger.error(f"[ApiPoolManager] Error recording allocation history: {e}")
        finally:
            conn.close()

    def set_allocation_strategy(self, strategy: str) -> Tuple[bool, str]:
        """
        設置分配策略
        
        Args:
            strategy: 策略名稱
            
        Returns:
            (是否成功, 消息)
        """
        if strategy not in self.ALLOCATION_STRATEGIES:
            return False, f"無效的策略: {strategy}，可用策略: {', '.join(self.ALLOCATION_STRATEGIES.keys())}"
        
        old_strategy = self._default_strategy
        self._default_strategy = strategy
        logger.info(f"[ApiPoolManager] Strategy changed: {old_strategy} -> {strategy}")
        return True, f"分配策略已更改為: {self.ALLOCATION_STRATEGIES[strategy]}"

    def get_available_strategies(self) -> Dict[str, str]:
        """獲取所有可用的分配策略"""
        return self.ALLOCATION_STRATEGIES.copy()

    # ==================== 分配功能 ====================

    # 🆕 會員等級權重（用於過濾可用 API）
    MEMBER_LEVELS = ['free', 'bronze', 'silver', 'gold', 'diamond', 'star', 'king']

    def allocate_api(
        self,
        account_phone: str,
        account_id: Optional[str] = None,
        preferred_api_id: Optional[str] = None,
        strategy: str = "balanced",
        member_level: str = "free",
        group_id: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        為帳號分配 API 憑據（支持智能分配策略、會員等級和分組）
        
        Args:
            account_phone: 帳號手機號
            account_id: 帳號 ID（可選）
            preferred_api_id: 偏好的 API ID（可選，用於手動選擇）
            strategy: 分配策略
                - "balanced": 負載均衡（默認，優先分配負載低的）
                - "success_rate": 成功率優先（優先分配成功率高的）
                - "least_failures": 最少失敗優先（優先分配失敗次數少的）
                - "round_robin": 輪詢分配（按順序輪流分配）
            member_level: 用戶會員等級（用於過濾可用 API）
            group_id: 指定分組 ID（可選，用於從特定分組分配）
            
        Returns:
            (是否成功, 消息, {api_id, api_hash, strategy_used, group_id} 或 None)
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 檢查是否已有分配
            cursor.execute('''
                SELECT a.*, p.api_hash, p.name 
                FROM telegram_api_allocations a
                JOIN telegram_api_pool p ON a.api_credential_id = p.id
                WHERE a.account_phone = ? AND a.status = 'active'
            ''', (account_phone,))
            existing = cursor.fetchone()
            if existing:
                return True, "已有分配", {
                    "api_id": existing['api_id'],
                    "api_hash": existing['api_hash'],
                    "name": existing['name'],
                    "allocation_id": existing['id'],
                    "strategy_used": "existing"
                }
            
            # 🆕 計算用戶可訪問的等級列表
            try:
                user_level_index = self.MEMBER_LEVELS.index(member_level)
            except ValueError:
                user_level_index = 0  # 默認 free
            accessible_levels = self.MEMBER_LEVELS[:user_level_index + 1]
            level_placeholders = ','.join(['?' for _ in accessible_levels])
            
            # 🆕 如果指定了分組，獲取分組的策略設置
            actual_strategy = strategy
            if group_id:
                cursor.execute('SELECT allocation_strategy, priority_boost FROM telegram_api_groups WHERE id = ?', (group_id,))
                group_row = cursor.fetchone()
                if group_row and group_row['allocation_strategy']:
                    actual_strategy = group_row['allocation_strategy']
            
            # 構建分組過濾條件
            group_condition = ""
            group_params = []
            if group_id:
                group_condition = " AND (group_id = ? OR group_id IS NULL)"
                group_params = [group_id]
            
            # 選擇 API 憑據
            if preferred_api_id:
                # 用戶手動選擇（仍然要檢查等級限制）
                cursor.execute(f'''
                    SELECT * FROM telegram_api_pool 
                    WHERE api_id = ? AND status = 'available' AND current_accounts < max_accounts
                    AND (min_member_level IS NULL OR min_member_level IN ({level_placeholders}))
                    {group_condition}
                ''', (preferred_api_id, *accessible_levels, *group_params))
            else:
                # 🆕 智能分配策略（加入等級過濾、優先級和分組）
                base_condition = f'''WHERE status = 'available' AND current_accounts < max_accounts
                    AND (min_member_level IS NULL OR min_member_level = '' OR min_member_level IN ({level_placeholders}))
                    {group_condition}'''
                
                # 組合查詢參數
                query_params = list(accessible_levels) + group_params
                
                if actual_strategy == "success_rate":
                    # 成功率優先：計算成功率並排序
                    cursor.execute(f'''
                        SELECT *, 
                            CASE 
                                WHEN (success_count + fail_count) > 0 
                                THEN CAST(success_count AS REAL) / (success_count + fail_count) 
                                ELSE 1.0 
                            END as success_rate
                        FROM telegram_api_pool 
                        {base_condition}
                        ORDER BY is_premium DESC, priority DESC, success_rate DESC, current_accounts ASC
                        LIMIT 1
                    ''', query_params)
                elif actual_strategy == "least_failures":
                    # 最少失敗優先
                    cursor.execute(f'''
                        SELECT * FROM telegram_api_pool 
                        {base_condition}
                        ORDER BY is_premium DESC, priority DESC, fail_count ASC, success_count DESC, current_accounts ASC
                        LIMIT 1
                    ''', query_params)
                elif actual_strategy == "round_robin":
                    # 輪詢分配：按最後使用時間排序
                    cursor.execute(f'''
                        SELECT * FROM telegram_api_pool 
                        {base_condition}
                        ORDER BY is_premium DESC, priority DESC, last_used ASC NULLS FIRST, id ASC
                        LIMIT 1
                    ''', query_params)
                else:
                    # 默認：balanced（負載均衡）
                    cursor.execute(f'''
                        SELECT * FROM telegram_api_pool 
                        {base_condition}
                        ORDER BY is_premium DESC, priority DESC, current_accounts ASC, 
                            CASE 
                                WHEN (success_count + fail_count) > 0 
                                THEN CAST(success_count AS REAL) / (success_count + fail_count) 
                                ELSE 0.5 
                            END DESC,
                            success_count DESC
                        LIMIT 1
                    ''', query_params)
            
            api_row = cursor.fetchone()
            if not api_row:
                return False, "沒有可用的 API 憑據，請聯繫管理員添加", None
            
            cred = self._row_to_credential(api_row)
            
            # 創建分配記錄
            alloc_id = f"alloc_{uuid.uuid4().hex[:12]}"
            now = datetime.now().isoformat()
            
            cursor.execute('''
                INSERT INTO telegram_api_allocations 
                (id, api_credential_id, api_id, account_phone, account_id, allocated_at, status)
                VALUES (?, ?, ?, ?, ?, ?, 'active')
            ''', (alloc_id, cred.id, cred.api_id, account_phone, account_id, now))
            
            # 更新憑據的使用計數
            new_count = cred.current_accounts + 1
            new_status = ApiPoolStatus.FULL.value if new_count >= cred.max_accounts else ApiPoolStatus.AVAILABLE.value
            
            cursor.execute('''
                UPDATE telegram_api_pool 
                SET current_accounts = ?, status = ?, last_used = ?
                WHERE id = ?
            ''', (new_count, new_status, now, cred.id))
            
            conn.commit()
            
            strategy_used = "manual" if preferred_api_id else actual_strategy
            logger.info(f"[ApiPoolManager] Allocated API {cred.api_id} to {account_phone} (strategy: {strategy_used}, group: {group_id or 'any'})")
            
            # 🆕 記錄審計歷史
            self._record_allocation_history(
                action="allocate",
                api_id=cred.api_id,
                account_phone=account_phone,
                api_credential_id=cred.id,
                api_name=cred.name,
                account_id=account_id,
                strategy_used=strategy_used,
                details={"group_id": group_id, "requested_strategy": strategy}
            )
            
            # 🆕 P6: 記錄小時統計
            self._record_hourly_stat(cred.api_id, "allocations", 1)
            
            return True, f"已分配 API: {cred.name}", {
                "api_id": cred.api_id,
                "api_hash": cred.api_hash,
                "name": cred.name,
                "allocation_id": alloc_id,
                "strategy_used": strategy_used,
                "group_id": cred.group_id
            }
            
        except Exception as e:
            logger.error(f"[ApiPoolManager] Error allocating API: {e}")
            return False, f"分配失敗: {str(e)}", None
        finally:
            conn.close()

    def release_api(self, account_phone: str) -> Tuple[bool, str]:
        """
        釋放帳號的 API 分配
        
        Args:
            account_phone: 帳號手機號
            
        Returns:
            (是否成功, 消息)
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 查找分配記錄
            cursor.execute('''
                SELECT * FROM telegram_api_allocations 
                WHERE account_phone = ? AND status = 'active'
            ''', (account_phone,))
            alloc = cursor.fetchone()
            
            if not alloc:
                return False, f"帳號 {account_phone} 沒有活躍的 API 分配"
            
            api_cred_id = alloc['api_credential_id']
            api_id = alloc['api_id']
            
            # 更新分配狀態
            cursor.execute('''
                UPDATE telegram_api_allocations 
                SET status = 'released' 
                WHERE id = ?
            ''', (alloc['id'],))
            
            # 更新憑據計數
            cursor.execute('''
                UPDATE telegram_api_pool 
                SET current_accounts = MAX(0, current_accounts - 1),
                    status = CASE WHEN current_accounts - 1 < max_accounts THEN 'available' ELSE status END
                WHERE id = ?
            ''', (api_cred_id,))
            
            conn.commit()
            
            logger.info(f"[ApiPoolManager] Released API {api_id} from {account_phone}")
            
            # 🆕 記錄審計歷史
            self._record_allocation_history(
                action="release",
                api_id=api_id,
                account_phone=account_phone,
                api_credential_id=api_cred_id,
                account_id=alloc.get('account_id')
            )
            
            # 🆕 P6: 記錄小時統計
            self._record_hourly_stat(api_id, "releases", 1)
            
            return True, f"已釋放 API 分配"
            
        except Exception as e:
            logger.error(f"[ApiPoolManager] Error releasing API: {e}")
            return False, f"釋放失敗: {str(e)}"
        finally:
            conn.close()

    def get_allocation_for_phone(self, account_phone: str) -> Optional[Dict[str, Any]]:
        """獲取帳號的 API 分配信息"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT a.*, p.api_hash, p.name, p.status as api_status
                FROM telegram_api_allocations a
                JOIN telegram_api_pool p ON a.api_credential_id = p.id
                WHERE a.account_phone = ? AND a.status = 'active'
            ''', (account_phone,))
            row = cursor.fetchone()
            if row:
                return {
                    "allocation_id": row['id'],
                    "api_id": row['api_id'],
                    "api_hash": row['api_hash'],
                    "name": row['name'],
                    "allocated_at": row['allocated_at'],
                    "api_status": row['api_status']
                }
            return None
        finally:
            conn.close()

    def get_allocation_history(
        self,
        account_phone: Optional[str] = None,
        api_id: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        獲取分配歷史記錄
        
        Args:
            account_phone: 按帳號篩選（可選）
            api_id: 按 API ID 篩選（可選）
            action: 按動作類型篩選（可選）
            limit: 返回數量限制
            offset: 分頁偏移
            
        Returns:
            歷史記錄列表和總數
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 構建查詢條件
            conditions = []
            params = []
            
            if account_phone:
                conditions.append("account_phone = ?")
                params.append(account_phone)
            if api_id:
                conditions.append("api_id = ?")
                params.append(api_id)
            if action:
                conditions.append("action = ?")
                params.append(action)
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            
            # 獲取總數
            cursor.execute(f'SELECT COUNT(*) as total FROM telegram_api_allocation_history WHERE {where_clause}', params)
            total = cursor.fetchone()['total']
            
            # 獲取記錄
            cursor.execute(f'''
                SELECT * FROM telegram_api_allocation_history 
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ''', params + [limit, offset])
            
            records = []
            for row in cursor.fetchall():
                records.append({
                    "id": row['id'],
                    "action": row['action'],
                    "api_id": row['api_id'],
                    "api_name": row['api_name'],
                    "account_phone": row['account_phone'],
                    "account_id": row['account_id'],
                    "operator_id": row['operator_id'],
                    "operator_name": row['operator_name'],
                    "strategy_used": row['strategy_used'],
                    "ip_address": row['ip_address'],
                    "details": row['details'],
                    "created_at": row['created_at']
                })
            
            return {
                "records": records,
                "total": total,
                "limit": limit,
                "offset": offset
            }
        finally:
            conn.close()

    def report_success(self, api_id: str) -> None:
        """報告 API 使用成功"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE telegram_api_pool 
                SET success_count = success_count + 1, last_used = ?
                WHERE api_id = ?
            ''', (datetime.now().isoformat(), api_id))
            conn.commit()
        finally:
            conn.close()

    def report_failure(self, api_id: str, error_type: str = "unknown") -> None:
        """報告 API 使用失敗"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE telegram_api_pool 
                SET fail_count = fail_count + 1, last_used = ?
                WHERE api_id = ?
            ''', (datetime.now().isoformat(), api_id))
            conn.commit()
            
            # 如果失敗次數過多，自動禁用
            cursor.execute('SELECT fail_count, success_count FROM telegram_api_pool WHERE api_id = ?', (api_id,))
            row = cursor.fetchone()
            if row and row['fail_count'] > 10 and row['fail_count'] > row['success_count']:
                cursor.execute("UPDATE telegram_api_pool SET status = 'banned' WHERE api_id = ?", (api_id,))
                conn.commit()
                logger.warning(f"[ApiPoolManager] Auto-banned API {api_id} due to high failure rate")
        finally:
            conn.close()

    # ==================== 🆕 容量規劃告警 ====================

    def check_capacity_alerts(self, thresholds: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
        """
        檢查容量告警
        
        Args:
            thresholds: 自定義閾值
                - critical_available: 可用憑據數量低於此值時觸發嚴重告警 (默認 1)
                - warning_available: 可用憑據數量低於此值時觸發警告 (默認 3)
                - critical_utilization: 使用率高於此值時觸發嚴重告警 (默認 95%)
                - warning_utilization: 使用率高於此值時觸發警告 (默認 80%)
                
        Returns:
            告警信息
        """
        if thresholds is None:
            thresholds = {}
        
        critical_available = thresholds.get('critical_available', 1)
        warning_available = thresholds.get('warning_available', 3)
        critical_utilization = thresholds.get('critical_utilization', 95)
        warning_utilization = thresholds.get('warning_utilization', 80)
        
        stats = self.get_pool_stats()
        
        alerts = []
        alert_level = "normal"  # normal, warning, critical
        
        available = stats.get('available_for_assign', 0)
        total = stats.get('total', 0)
        total_allocations = stats.get('total_allocations', 0)
        
        # 計算總容量和使用率
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute('SELECT SUM(max_accounts) as total_capacity, SUM(current_accounts) as used_capacity FROM telegram_api_pool WHERE status = "available"')
            row = cursor.fetchone()
            total_capacity = row['total_capacity'] or 0
            used_capacity = row['used_capacity'] or 0
            utilization = (used_capacity / total_capacity * 100) if total_capacity > 0 else 0
        finally:
            conn.close()
        
        # 檢查可用憑據數量
        if available <= 0:
            alerts.append({
                "level": "critical",
                "type": "no_available",
                "message": "🚨 API 池已耗盡！沒有可用的 API 憑據",
                "suggestion": "請立即添加新的 API 憑據，否則新帳號將無法登入"
            })
            alert_level = "critical"
        elif available <= critical_available:
            alerts.append({
                "level": "critical",
                "type": "low_available",
                "message": f"🚨 API 憑據即將耗盡！僅剩 {available} 個可用",
                "suggestion": "請儘快添加新的 API 憑據"
            })
            alert_level = "critical"
        elif available <= warning_available:
            alerts.append({
                "level": "warning",
                "type": "low_available",
                "message": f"⚠️ API 憑據不足，僅剩 {available} 個可用",
                "suggestion": "建議添加更多 API 憑據以保證服務穩定"
            })
            if alert_level != "critical":
                alert_level = "warning"
        
        # 檢查使用率
        if utilization >= critical_utilization:
            alerts.append({
                "level": "critical",
                "type": "high_utilization",
                "message": f"🚨 API 池使用率已達 {utilization:.1f}%",
                "suggestion": "請擴充 API 池容量或增加單個 API 的最大帳號數"
            })
            alert_level = "critical"
        elif utilization >= warning_utilization:
            alerts.append({
                "level": "warning",
                "type": "high_utilization",
                "message": f"⚠️ API 池使用率較高，已達 {utilization:.1f}%",
                "suggestion": "建議提前規劃容量擴充"
            })
            if alert_level != "critical":
                alert_level = "warning"
        
        # 檢查封禁率
        banned = stats.get('banned', 0)
        if total > 0 and banned / total > 0.3:
            alerts.append({
                "level": "warning",
                "type": "high_ban_rate",
                "message": f"⚠️ 封禁率偏高，{banned}/{total} 個憑據被封禁",
                "suggestion": "請檢查 API 使用是否符合 Telegram 政策"
            })
            if alert_level != "critical":
                alert_level = "warning"
        
        return {
            "alert_level": alert_level,
            "alerts": alerts,
            "stats": {
                "total": total,
                "available": available,
                "total_capacity": total_capacity,
                "used_capacity": used_capacity,
                "utilization": round(utilization, 1),
                "banned": banned,
                "total_allocations": total_allocations
            },
            "thresholds": {
                "critical_available": critical_available,
                "warning_available": warning_available,
                "critical_utilization": critical_utilization,
                "warning_utilization": warning_utilization
            },
            "checked_at": datetime.now().isoformat()
        }

    def get_capacity_forecast(self, days: int = 7) -> Dict[str, Any]:
        """
        容量預測（基於歷史分配速度）
        
        Args:
            days: 預測天數
            
        Returns:
            預測信息
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 獲取過去 7 天的分配記錄
            cursor.execute('''
                SELECT date(created_at) as date, COUNT(*) as count
                FROM telegram_api_allocation_history
                WHERE action = 'allocate' AND created_at >= date('now', '-7 days')
                GROUP BY date(created_at)
                ORDER BY date
            ''')
            daily_allocations = [row['count'] for row in cursor.fetchall()]
            
            # 計算平均每日分配速度
            avg_daily_allocations = sum(daily_allocations) / len(daily_allocations) if daily_allocations else 0
            
            # 獲取當前可用容量
            cursor.execute('''
                SELECT SUM(max_accounts - current_accounts) as remaining_capacity
                FROM telegram_api_pool 
                WHERE status = 'available'
            ''')
            row = cursor.fetchone()
            remaining_capacity = row['remaining_capacity'] or 0
            
            # 預測耗盡天數
            days_until_exhausted = None
            if avg_daily_allocations > 0:
                days_until_exhausted = remaining_capacity / avg_daily_allocations
            
            return {
                "avg_daily_allocations": round(avg_daily_allocations, 1),
                "remaining_capacity": remaining_capacity,
                "days_until_exhausted": round(days_until_exhausted, 1) if days_until_exhausted else None,
                "forecast_warning": days_until_exhausted is not None and days_until_exhausted < days,
                "forecast_message": (
                    f"按當前速度，API 池將在 {round(days_until_exhausted, 1)} 天內耗盡" 
                    if days_until_exhausted and days_until_exhausted < 30 
                    else "容量充足，無需擔心"
                ),
                "calculated_at": datetime.now().isoformat()
            }
        finally:
            conn.close()

    # ==================== 輔助方法 ====================

    def _row_to_credential(self, row: sqlite3.Row) -> TelegramApiCredential:
        """將數據庫行轉換為憑據對象"""
        # 安全獲取新欄位（兼容舊數據庫）
        min_member_level = "free"
        priority = 0
        is_premium = False
        group_id = None
        try:
            min_member_level = row['min_member_level'] or "free"
            priority = row['priority'] or 0
            is_premium = bool(row['is_premium'])
            group_id = row['group_id']
        except (KeyError, IndexError):
            pass
        
        return TelegramApiCredential(
            id=row['id'],
            api_id=row['api_id'],
            api_hash=row['api_hash'],
            name=row['name'],
            source_phone=row['source_phone'],
            status=ApiPoolStatus(row['status']) if row['status'] in [s.value for s in ApiPoolStatus] else ApiPoolStatus.AVAILABLE,
            max_accounts=row['max_accounts'],
            current_accounts=row['current_accounts'],
            success_count=row['success_count'],
            fail_count=row['fail_count'],
            last_used=row['last_used'],
            created_at=row['created_at'],
            note=row['note'],
            min_member_level=min_member_level,
            priority=priority,
            is_premium=is_premium,
            group_id=group_id
        )

    # ==================== 🆕 分組管理 ====================

    def create_group(
        self,
        name: str,
        description: Optional[str] = None,
        color: str = "#3B82F6",
        icon: str = "📁"
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """創建 API 分組"""
        if not name:
            return False, "分組名稱不能為空", None
        
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 檢查名稱是否已存在
            cursor.execute('SELECT id FROM telegram_api_groups WHERE name = ?', (name,))
            if cursor.fetchone():
                return False, f"分組名稱 '{name}' 已存在", None
            
            group_id = f"grp_{uuid.uuid4().hex[:8]}"
            now = datetime.now().isoformat()
            
            cursor.execute('''
                INSERT INTO telegram_api_groups (id, name, description, color, icon, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (group_id, name, description, color, icon, now))
            
            conn.commit()
            
            logger.info(f"[ApiPoolManager] Created group: {name}")
            return True, f"已創建分組: {name}", {
                "id": group_id,
                "name": name,
                "description": description,
                "color": color,
                "icon": icon,
                "created_at": now
            }
        except Exception as e:
            logger.error(f"[ApiPoolManager] Error creating group: {e}")
            return False, f"創建失敗: {str(e)}", None
        finally:
            conn.close()

    def update_group(
        self,
        group_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        color: Optional[str] = None,
        icon: Optional[str] = None,
        sort_order: Optional[int] = None,
        allocation_strategy: Optional[str] = None,
        priority_boost: Optional[int] = None
    ) -> Tuple[bool, str]:
        """更新分組"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            updates = []
            params = []
            
            if name is not None:
                updates.append("name = ?")
                params.append(name)
            if description is not None:
                updates.append("description = ?")
                params.append(description)
            if color is not None:
                updates.append("color = ?")
                params.append(color)
            if icon is not None:
                updates.append("icon = ?")
                params.append(icon)
            if sort_order is not None:
                updates.append("sort_order = ?")
                params.append(sort_order)
            if allocation_strategy is not None:
                if allocation_strategy not in self.ALLOCATION_STRATEGIES:
                    return False, f"無效的分配策略: {allocation_strategy}"
                updates.append("allocation_strategy = ?")
                params.append(allocation_strategy)
            if priority_boost is not None:
                updates.append("priority_boost = ?")
                params.append(priority_boost)
            
            if not updates:
                return False, "沒有要更新的字段"
            
            params.append(group_id)
            cursor.execute(
                f'UPDATE telegram_api_groups SET {", ".join(updates)} WHERE id = ?',
                params
            )
            
            if cursor.rowcount == 0:
                return False, f"分組 {group_id} 不存在"
            
            conn.commit()
            logger.info(f"[ApiPoolManager] Updated group: {group_id}")
            return True, "分組已更新"
        except Exception as e:
            logger.error(f"[ApiPoolManager] Error updating group: {e}")
            return False, f"更新失敗: {str(e)}"
        finally:
            conn.close()

    def delete_group(self, group_id: str, move_to_default: bool = True) -> Tuple[bool, str]:
        """刪除分組"""
        if group_id == 'default':
            return False, "默認分組不能刪除"
        
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 檢查分組是否存在
            cursor.execute('SELECT name FROM telegram_api_groups WHERE id = ?', (group_id,))
            row = cursor.fetchone()
            if not row:
                return False, f"分組 {group_id} 不存在"
            
            group_name = row['name']
            
            # 移動該分組的 API 到默認分組
            if move_to_default:
                cursor.execute(
                    "UPDATE telegram_api_pool SET group_id = 'default' WHERE group_id = ?",
                    (group_id,)
                )
            
            # 刪除分組
            cursor.execute('DELETE FROM telegram_api_groups WHERE id = ?', (group_id,))
            
            conn.commit()
            logger.info(f"[ApiPoolManager] Deleted group: {group_name}")
            return True, f"已刪除分組: {group_name}"
        except Exception as e:
            logger.error(f"[ApiPoolManager] Error deleting group: {e}")
            return False, f"刪除失敗: {str(e)}"
        finally:
            conn.close()

    def list_groups(self) -> List[Dict[str, Any]]:
        """獲取所有分組"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT g.*, 
                    (SELECT COUNT(*) FROM telegram_api_pool WHERE group_id = g.id) as api_count,
                    (SELECT SUM(current_accounts) FROM telegram_api_pool WHERE group_id = g.id) as total_allocations
                FROM telegram_api_groups g
                ORDER BY g.is_default DESC, g.sort_order ASC, g.name ASC
            ''')
            
            groups = []
            for row in cursor.fetchall():
                # 安全獲取新欄位
                allocation_strategy = 'balanced'
                priority_boost = 0
                try:
                    allocation_strategy = row['allocation_strategy'] or 'balanced'
                    priority_boost = row['priority_boost'] or 0
                except (KeyError, IndexError):
                    pass
                
                groups.append({
                    "id": row['id'],
                    "name": row['name'],
                    "description": row['description'],
                    "color": row['color'],
                    "icon": row['icon'],
                    "sort_order": row['sort_order'],
                    "is_default": bool(row['is_default']),
                    "allocation_strategy": allocation_strategy,
                    "priority_boost": priority_boost,
                    "api_count": row['api_count'] or 0,
                    "total_allocations": row['total_allocations'] or 0,
                    "created_at": row['created_at']
                })
            
            return groups
        finally:
            conn.close()

    def assign_api_to_group(self, api_id: str, group_id: str) -> Tuple[bool, str]:
        """將 API 分配到分組"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 檢查分組是否存在
            if group_id:
                cursor.execute('SELECT id FROM telegram_api_groups WHERE id = ?', (group_id,))
                if not cursor.fetchone():
                    return False, f"分組 {group_id} 不存在"
            
            cursor.execute(
                'UPDATE telegram_api_pool SET group_id = ? WHERE api_id = ?',
                (group_id, api_id)
            )
            
            if cursor.rowcount == 0:
                return False, f"API {api_id} 不存在"
            
            conn.commit()
            logger.info(f"[ApiPoolManager] Assigned API {api_id} to group {group_id}")
            return True, "已更新分組"
        except Exception as e:
            logger.error(f"[ApiPoolManager] Error assigning API to group: {e}")
            return False, f"操作失敗: {str(e)}"
        finally:
            conn.close()

    def batch_assign_to_group(self, api_ids: List[str], group_id: str) -> Dict[str, Any]:
        """批量分配 API 到分組"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 檢查分組是否存在
            if group_id:
                cursor.execute('SELECT id FROM telegram_api_groups WHERE id = ?', (group_id,))
                if not cursor.fetchone():
                    return {"success": 0, "failed": len(api_ids), "error": f"分組 {group_id} 不存在"}
            
            success_count = 0
            for api_id in api_ids:
                cursor.execute(
                    'UPDATE telegram_api_pool SET group_id = ? WHERE api_id = ?',
                    (group_id, api_id)
                )
                if cursor.rowcount > 0:
                    success_count += 1
            
            conn.commit()
            logger.info(f"[ApiPoolManager] Batch assigned {success_count} APIs to group {group_id}")
            return {"success": success_count, "failed": len(api_ids) - success_count}
        except Exception as e:
            logger.error(f"[ApiPoolManager] Error batch assigning to group: {e}")
            return {"success": 0, "failed": len(api_ids), "error": str(e)}
        finally:
            conn.close()

    # ==================== 🆕 P6: 統計與可視化 ====================

    def _record_hourly_stat(self, api_id: str, stat_type: str, count: int = 1):
        """記錄小時統計數據"""
        hour_key = datetime.now().strftime("%Y-%m-%d-%H")
        
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 使用 UPSERT 模式
            cursor.execute(f'''
                INSERT INTO telegram_api_hourly_stats (api_id, hour_key, {stat_type})
                VALUES (?, ?, ?)
                ON CONFLICT(api_id, hour_key) 
                DO UPDATE SET {stat_type} = {stat_type} + ?
            ''', (api_id, hour_key, count, count))
            
            conn.commit()
        except Exception as e:
            logger.error(f"[ApiPoolManager] Error recording hourly stat: {e}")
        finally:
            conn.close()

    def get_hourly_stats(self, hours: int = 24, api_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """獲取小時統計數據"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 計算時間範圍
            from datetime import timedelta
            now = datetime.now()
            start_hour = (now - timedelta(hours=hours)).strftime("%Y-%m-%d-%H")
            
            if api_id:
                cursor.execute('''
                    SELECT hour_key, SUM(allocations) as allocations, SUM(releases) as releases,
                           SUM(successes) as successes, SUM(failures) as failures
                    FROM telegram_api_hourly_stats 
                    WHERE api_id = ? AND hour_key >= ?
                    GROUP BY hour_key
                    ORDER BY hour_key ASC
                ''', (api_id, start_hour))
            else:
                cursor.execute('''
                    SELECT hour_key, SUM(allocations) as allocations, SUM(releases) as releases,
                           SUM(successes) as successes, SUM(failures) as failures
                    FROM telegram_api_hourly_stats 
                    WHERE hour_key >= ?
                    GROUP BY hour_key
                    ORDER BY hour_key ASC
                ''', (start_hour,))
            
            stats = []
            for row in cursor.fetchall():
                stats.append({
                    "hour": row['hour_key'],
                    "allocations": row['allocations'] or 0,
                    "releases": row['releases'] or 0,
                    "successes": row['successes'] or 0,
                    "failures": row['failures'] or 0
                })
            
            return stats
        finally:
            conn.close()

    def get_api_load_distribution(self) -> List[Dict[str, Any]]:
        """獲取各 API 負載分布"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT p.api_id, p.name, p.current_accounts, p.max_accounts, p.status,
                       p.success_count, p.fail_count, p.group_id,
                       CASE WHEN p.max_accounts > 0 
                            THEN CAST(p.current_accounts AS REAL) / p.max_accounts * 100 
                            ELSE 0 END as load_percent,
                       CASE WHEN (p.success_count + p.fail_count) > 0 
                            THEN CAST(p.success_count AS REAL) / (p.success_count + p.fail_count) * 100 
                            ELSE 100 END as success_rate
                FROM telegram_api_pool p
                ORDER BY load_percent DESC
            ''')
            
            distribution = []
            for row in cursor.fetchall():
                distribution.append({
                    "api_id": row['api_id'],
                    "name": row['name'],
                    "current_accounts": row['current_accounts'],
                    "max_accounts": row['max_accounts'],
                    "status": row['status'],
                    "success_count": row['success_count'],
                    "fail_count": row['fail_count'],
                    "group_id": row['group_id'],
                    "load_percent": round(row['load_percent'], 1),
                    "success_rate": round(row['success_rate'], 1)
                })
            
            return distribution
        finally:
            conn.close()

    def get_daily_trend(self, days: int = 7) -> List[Dict[str, Any]]:
        """獲取每日趨勢數據"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 按日期聚合歷史記錄
            cursor.execute('''
                SELECT DATE(created_at) as date_key,
                       SUM(CASE WHEN action = 'allocate' THEN 1 ELSE 0 END) as allocations,
                       SUM(CASE WHEN action = 'release' THEN 1 ELSE 0 END) as releases
                FROM telegram_api_allocation_history
                WHERE created_at >= DATE('now', ?)
                GROUP BY date_key
                ORDER BY date_key ASC
            ''', (f'-{days} days',))
            
            trend = []
            for row in cursor.fetchall():
                trend.append({
                    "date": row['date_key'],
                    "allocations": row['allocations'] or 0,
                    "releases": row['releases'] or 0
                })
            
            return trend
        finally:
            conn.close()

    # ==================== 🆕 P6: 故障轉移 ====================
    
    # 故障轉移配置
    FAILOVER_CONFIG = {
        "consecutive_failures_threshold": 3,  # 連續失敗次數閾值
        "auto_disable_on_failure": True,       # 達到閾值自動禁用
        "auto_recovery_check": True,           # 是否自動恢復檢測
        "recovery_success_threshold": 2,       # 恢復需要連續成功次數
        "alert_on_disable": True               # 禁用時發送告警
    }

    def record_api_result(self, api_id: str, success: bool, error_message: Optional[str] = None) -> Dict[str, Any]:
        """
        記錄 API 使用結果（成功/失敗）
        
        Args:
            api_id: API ID
            success: 是否成功
            error_message: 失敗時的錯誤信息
            
        Returns:
            處理結果，包含是否觸發故障轉移
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 獲取當前 API 信息
            cursor.execute('SELECT * FROM telegram_api_pool WHERE api_id = ?', (api_id,))
            api_row = cursor.fetchone()
            
            if not api_row:
                return {"success": False, "error": "API not found"}
            
            result = {
                "api_id": api_id,
                "recorded": True,
                "failover_triggered": False,
                "previous_status": api_row['status']
            }
            
            if success:
                # 記錄成功
                cursor.execute('''
                    UPDATE telegram_api_pool 
                    SET success_count = success_count + 1,
                        consecutive_failures = 0,
                        last_success_at = ?
                    WHERE api_id = ?
                ''', (datetime.now().isoformat(), api_id))
                
                # 記錄小時統計
                self._record_hourly_stat(api_id, "successes", 1)
                
                # 檢查是否需要恢復（如果之前是 banned 狀態）
                if api_row['status'] == ApiPoolStatus.BANNED.value:
                    cursor.execute('SELECT consecutive_successes FROM telegram_api_pool WHERE api_id = ?', (api_id,))
                    # 如果表沒有這個欄位，這裡會失敗，需要遷移
                    try:
                        row = cursor.fetchone()
                        consecutive_successes = (row['consecutive_successes'] or 0) + 1 if row else 1
                        
                        if consecutive_successes >= self.FAILOVER_CONFIG["recovery_success_threshold"]:
                            cursor.execute('''
                                UPDATE telegram_api_pool 
                                SET status = 'available', consecutive_successes = 0
                                WHERE api_id = ?
                            ''', (api_id,))
                            result["recovered"] = True
                            logger.info(f"[ApiPoolManager] API {api_id} recovered from banned status")
                        else:
                            cursor.execute('''
                                UPDATE telegram_api_pool SET consecutive_successes = ?
                                WHERE api_id = ?
                            ''', (consecutive_successes, api_id))
                    except:
                        pass
            else:
                # 記錄失敗
                new_fail_count = api_row['fail_count'] + 1
                consecutive_failures = (api_row.get('consecutive_failures') or 0) + 1
                
                cursor.execute('''
                    UPDATE telegram_api_pool 
                    SET fail_count = ?,
                        consecutive_failures = ?,
                        last_error = ?,
                        last_error_at = ?
                    WHERE api_id = ?
                ''', (new_fail_count, consecutive_failures, error_message, datetime.now().isoformat(), api_id))
                
                # 記錄小時統計
                self._record_hourly_stat(api_id, "failures", 1)
                
                result["consecutive_failures"] = consecutive_failures
                
                # 檢查是否需要觸發故障轉移
                if (self.FAILOVER_CONFIG["auto_disable_on_failure"] and 
                    consecutive_failures >= self.FAILOVER_CONFIG["consecutive_failures_threshold"] and
                    api_row['status'] != ApiPoolStatus.BANNED.value):
                    
                    cursor.execute('''
                        UPDATE telegram_api_pool SET status = 'banned'
                        WHERE api_id = ?
                    ''', (api_id,))
                    
                    result["failover_triggered"] = True
                    result["new_status"] = "banned"
                    
                    logger.warning(f"[ApiPoolManager] API {api_id} auto-disabled after {consecutive_failures} consecutive failures")
                    
                    # 發送告警
                    if self.FAILOVER_CONFIG["alert_on_disable"]:
                        self._send_failover_alert(api_id, consecutive_failures, error_message)
            
            conn.commit()
            return result
            
        except Exception as e:
            logger.error(f"[ApiPoolManager] Error recording API result: {e}")
            return {"success": False, "error": str(e)}
        finally:
            conn.close()

    def _send_failover_alert(self, api_id: str, failures: int, error: Optional[str]):
        """發送故障轉移告警"""
        try:
            from .alert_service import get_alert_service, AlertLevel
            import asyncio
            
            service = get_alert_service()
            
            # 創建異步任務發送告警
            asyncio.create_task(service.send_alert(
                alert_type="api_failover",
                message=f"API {api_id} 連續失敗 {failures} 次，已自動禁用",
                level=AlertLevel.CRITICAL,
                suggestion="請檢查該 API 憑據是否有效，或手動重新啟用",
                details={"api_id": api_id, "consecutive_failures": failures, "last_error": error}
            ))
        except Exception as e:
            logger.error(f"[ApiPoolManager] Error sending failover alert: {e}")

    def get_failed_apis(self, include_banned: bool = True) -> List[Dict[str, Any]]:
        """獲取失敗/封禁的 API 列表"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            if include_banned:
                cursor.execute('''
                    SELECT api_id, name, status, fail_count, consecutive_failures,
                           last_error, last_error_at, success_count
                    FROM telegram_api_pool 
                    WHERE status = 'banned' OR consecutive_failures > 0
                    ORDER BY consecutive_failures DESC, fail_count DESC
                ''')
            else:
                cursor.execute('''
                    SELECT api_id, name, status, fail_count, consecutive_failures,
                           last_error, last_error_at, success_count
                    FROM telegram_api_pool 
                    WHERE consecutive_failures > 0
                    ORDER BY consecutive_failures DESC
                ''')
            
            apis = []
            for row in cursor.fetchall():
                apis.append({
                    "api_id": row['api_id'],
                    "name": row['name'],
                    "status": row['status'],
                    "fail_count": row['fail_count'],
                    "consecutive_failures": row['consecutive_failures'] or 0,
                    "last_error": row['last_error'],
                    "last_error_at": row['last_error_at'],
                    "success_count": row['success_count'],
                    "success_rate": round(row['success_count'] / (row['success_count'] + row['fail_count']) * 100, 1) 
                                   if (row['success_count'] + row['fail_count']) > 0 else 0
                })
            
            return apis
        finally:
            conn.close()

    def reset_api_failures(self, api_id: str, reactivate: bool = True) -> Tuple[bool, str]:
        """重置 API 失敗計數並可選重新激活"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            updates = ["consecutive_failures = 0", "last_error = NULL", "last_error_at = NULL"]
            if reactivate:
                updates.append("status = 'available'")
            
            cursor.execute(f'''
                UPDATE telegram_api_pool 
                SET {", ".join(updates)}
                WHERE api_id = ?
            ''', (api_id,))
            
            if cursor.rowcount == 0:
                return False, f"API {api_id} 不存在"
            
            conn.commit()
            logger.info(f"[ApiPoolManager] Reset failures for API {api_id}, reactivate={reactivate}")
            return True, "已重置失敗計數" + ("並重新激活" if reactivate else "")
        except Exception as e:
            logger.error(f"[ApiPoolManager] Error resetting API failures: {e}")
            return False, str(e)
        finally:
            conn.close()

    # ==================== 🆕 P6: 分配規則引擎 ====================

    RULE_TYPES = ["whitelist", "blacklist", "binding", "restriction"]
    TARGET_TYPES = ["phone", "user_id", "ip", "user_level"]
    RULE_ACTIONS = ["allow", "deny", "bind", "prefer"]

    def create_rule(
        self,
        rule_type: str,
        target_type: str,
        target_value: str,
        action: str,
        api_id: Optional[str] = None,
        priority: int = 0,
        expires_at: Optional[str] = None,
        note: Optional[str] = None
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """創建分配規則"""
        if rule_type not in self.RULE_TYPES:
            return False, f"無效的規則類型: {rule_type}", None
        if target_type not in self.TARGET_TYPES:
            return False, f"無效的目標類型: {target_type}", None
        if action not in self.RULE_ACTIONS:
            return False, f"無效的動作: {action}", None
        
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            rule_id = f"rule_{uuid.uuid4().hex[:8]}"
            now = datetime.now().isoformat()
            
            cursor.execute('''
                INSERT INTO telegram_api_allocation_rules 
                (id, rule_type, target_type, target_value, api_id, action, priority, expires_at, note, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (rule_id, rule_type, target_type, target_value, api_id, action, priority, expires_at, note, now))
            
            conn.commit()
            
            rule = {
                "id": rule_id,
                "rule_type": rule_type,
                "target_type": target_type,
                "target_value": target_value,
                "api_id": api_id,
                "action": action,
                "priority": priority,
                "expires_at": expires_at,
                "note": note,
                "enabled": True,
                "created_at": now
            }
            
            logger.info(f"[ApiPoolManager] Created rule: {rule_type} {action} for {target_type}={target_value}")
            return True, "規則已創建", rule
        except Exception as e:
            logger.error(f"[ApiPoolManager] Error creating rule: {e}")
            return False, str(e), None
        finally:
            conn.close()

    def delete_rule(self, rule_id: str) -> Tuple[bool, str]:
        """刪除規則"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM telegram_api_allocation_rules WHERE id = ?', (rule_id,))
            
            if cursor.rowcount == 0:
                return False, f"規則 {rule_id} 不存在"
            
            conn.commit()
            logger.info(f"[ApiPoolManager] Deleted rule: {rule_id}")
            return True, "規則已刪除"
        except Exception as e:
            logger.error(f"[ApiPoolManager] Error deleting rule: {e}")
            return False, str(e)
        finally:
            conn.close()

    def toggle_rule(self, rule_id: str, enabled: bool) -> Tuple[bool, str]:
        """啟用/禁用規則"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                'UPDATE telegram_api_allocation_rules SET enabled = ? WHERE id = ?',
                (1 if enabled else 0, rule_id)
            )
            
            if cursor.rowcount == 0:
                return False, f"規則 {rule_id} 不存在"
            
            conn.commit()
            return True, f"規則已{'啟用' if enabled else '禁用'}"
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()

    def list_rules(self, rule_type: Optional[str] = None, include_disabled: bool = True) -> List[Dict[str, Any]]:
        """獲取規則列表"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            query = 'SELECT * FROM telegram_api_allocation_rules WHERE 1=1'
            params = []
            
            if rule_type:
                query += ' AND rule_type = ?'
                params.append(rule_type)
            
            if not include_disabled:
                query += ' AND enabled = 1'
            
            query += ' ORDER BY priority DESC, created_at DESC'
            
            cursor.execute(query, params)
            
            rules = []
            for row in cursor.fetchall():
                rules.append({
                    "id": row['id'],
                    "rule_type": row['rule_type'],
                    "target_type": row['target_type'],
                    "target_value": row['target_value'],
                    "api_id": row['api_id'],
                    "action": row['action'],
                    "priority": row['priority'],
                    "enabled": bool(row['enabled']),
                    "expires_at": row['expires_at'],
                    "note": row['note'],
                    "created_at": row['created_at']
                })
            
            return rules
        finally:
            conn.close()

    def check_rules(
        self, 
        phone: str, 
        user_id: Optional[str] = None, 
        ip: Optional[str] = None, 
        user_level: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        檢查分配規則
        
        Returns:
            {
                "allowed": bool,
                "bound_api_id": Optional[str],
                "preferred_api_id": Optional[str],
                "matched_rules": List[Dict]
            }
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            now = datetime.now().isoformat()
            
            # 獲取所有可能匹配的規則
            cursor.execute('''
                SELECT * FROM telegram_api_allocation_rules 
                WHERE enabled = 1 
                AND (expires_at IS NULL OR expires_at > ?)
                ORDER BY priority DESC
            ''', (now,))
            
            result = {
                "allowed": True,
                "bound_api_id": None,
                "preferred_api_id": None,
                "matched_rules": []
            }
            
            for row in cursor.fetchall():
                target_type = row['target_type']
                target_value = row['target_value']
                
                # 檢查是否匹配
                matched = False
                if target_type == 'phone' and target_value == phone:
                    matched = True
                elif target_type == 'user_id' and user_id and target_value == user_id:
                    matched = True
                elif target_type == 'ip' and ip and target_value == ip:
                    matched = True
                elif target_type == 'user_level' and user_level and target_value == user_level:
                    matched = True
                
                if matched:
                    rule_info = {
                        "id": row['id'],
                        "rule_type": row['rule_type'],
                        "action": row['action'],
                        "api_id": row['api_id']
                    }
                    result["matched_rules"].append(rule_info)
                    
                    # 應用規則
                    if row['action'] == 'deny':
                        result["allowed"] = False
                    elif row['action'] == 'bind' and row['api_id']:
                        result["bound_api_id"] = row['api_id']
                    elif row['action'] == 'prefer' and row['api_id']:
                        result["preferred_api_id"] = row['api_id']
            
            return result
        finally:
            conn.close()

    # ==================== 🆕 P6: 備份與恢復 ====================

    def create_backup(self, include_allocations: bool = False, include_history: bool = False) -> Dict[str, Any]:
        """
        創建 API 池完整備份
        
        Args:
            include_allocations: 是否包含分配記錄
            include_history: 是否包含歷史記錄
            
        Returns:
            備份數據（可序列化為 JSON）
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            backup = {
                "version": "1.0",
                "created_at": datetime.now().isoformat(),
                "type": "api_pool_backup",
                "data": {}
            }
            
            # 備份 API 憑據
            cursor.execute('SELECT * FROM telegram_api_pool')
            apis = []
            for row in cursor.fetchall():
                apis.append({
                    "api_id": row['api_id'],
                    "api_hash": row['api_hash'],
                    "name": row['name'],
                    "source_phone": row['source_phone'],
                    "max_accounts": row['max_accounts'],
                    "note": row['note'],
                    "min_member_level": row.get('min_member_level', 'free'),
                    "priority": row.get('priority', 0),
                    "is_premium": bool(row.get('is_premium', 0)),
                    "group_id": row.get('group_id')
                })
            backup["data"]["apis"] = apis
            
            # 備份分組
            cursor.execute('SELECT * FROM telegram_api_groups WHERE is_default = 0')
            groups = []
            for row in cursor.fetchall():
                groups.append({
                    "id": row['id'],
                    "name": row['name'],
                    "description": row['description'],
                    "color": row['color'],
                    "icon": row['icon'],
                    "sort_order": row['sort_order'],
                    "allocation_strategy": row.get('allocation_strategy', 'balanced'),
                    "priority_boost": row.get('priority_boost', 0)
                })
            backup["data"]["groups"] = groups
            
            # 備份規則
            cursor.execute('SELECT * FROM telegram_api_allocation_rules')
            rules = []
            for row in cursor.fetchall():
                rules.append({
                    "rule_type": row['rule_type'],
                    "target_type": row['target_type'],
                    "target_value": row['target_value'],
                    "api_id": row['api_id'],
                    "action": row['action'],
                    "priority": row['priority'],
                    "expires_at": row['expires_at'],
                    "note": row['note']
                })
            backup["data"]["rules"] = rules
            
            # 可選：備份分配記錄
            if include_allocations:
                cursor.execute('SELECT * FROM telegram_api_allocations WHERE status = "active"')
                allocations = []
                for row in cursor.fetchall():
                    allocations.append({
                        "api_id": row['api_id'],
                        "account_phone": row['account_phone'],
                        "account_id": row['account_id']
                    })
                backup["data"]["allocations"] = allocations
            
            backup["stats"] = {
                "apis": len(apis),
                "groups": len(groups),
                "rules": len(rules),
                "allocations": len(backup["data"].get("allocations", []))
            }
            
            logger.info(f"[ApiPoolManager] Created backup: {backup['stats']}")
            return backup
            
        finally:
            conn.close()

    def restore_backup(
        self, 
        backup_data: Dict[str, Any], 
        overwrite: bool = False,
        restore_allocations: bool = False
    ) -> Dict[str, Any]:
        """
        恢復 API 池備份
        
        Args:
            backup_data: 備份數據
            overwrite: 是否覆蓋現有數據
            restore_allocations: 是否恢復分配記錄
            
        Returns:
            恢復結果
        """
        if backup_data.get("type") != "api_pool_backup":
            return {"success": False, "error": "無效的備份格式"}
        
        data = backup_data.get("data", {})
        result = {
            "success": True,
            "restored": {"apis": 0, "groups": 0, "rules": 0, "allocations": 0},
            "skipped": {"apis": 0, "groups": 0, "rules": 0},
            "errors": []
        }
        
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 恢復分組
            for group in data.get("groups", []):
                try:
                    if overwrite:
                        cursor.execute('DELETE FROM telegram_api_groups WHERE id = ?', (group['id'],))
                    
                    cursor.execute('''
                        INSERT OR IGNORE INTO telegram_api_groups 
                        (id, name, description, color, icon, sort_order, allocation_strategy, priority_boost)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (group['id'], group['name'], group.get('description'), 
                          group.get('color', '#3B82F6'), group.get('icon', '📁'),
                          group.get('sort_order', 0), group.get('allocation_strategy', 'balanced'),
                          group.get('priority_boost', 0)))
                    
                    if cursor.rowcount > 0:
                        result["restored"]["groups"] += 1
                    else:
                        result["skipped"]["groups"] += 1
                except Exception as e:
                    result["errors"].append(f"Group {group.get('id')}: {str(e)}")
            
            # 恢復 API 憑據
            for api in data.get("apis", []):
                try:
                    if overwrite:
                        cursor.execute('DELETE FROM telegram_api_pool WHERE api_id = ?', (api['api_id'],))
                    
                    cursor.execute('''
                        INSERT OR IGNORE INTO telegram_api_pool 
                        (id, api_id, api_hash, name, source_phone, max_accounts, note, 
                         min_member_level, priority, is_premium, group_id, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (f"api_{uuid.uuid4().hex[:12]}", api['api_id'], api['api_hash'],
                          api.get('name', f"API-{api['api_id']}"), api.get('source_phone'),
                          api.get('max_accounts', 3), api.get('note'),
                          api.get('min_member_level', 'free'), api.get('priority', 0),
                          1 if api.get('is_premium') else 0, api.get('group_id'),
                          datetime.now().isoformat()))
                    
                    if cursor.rowcount > 0:
                        result["restored"]["apis"] += 1
                    else:
                        result["skipped"]["apis"] += 1
                except Exception as e:
                    result["errors"].append(f"API {api.get('api_id')}: {str(e)}")
            
            # 恢復規則
            for rule in data.get("rules", []):
                try:
                    cursor.execute('''
                        INSERT INTO telegram_api_allocation_rules 
                        (id, rule_type, target_type, target_value, api_id, action, priority, expires_at, note, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (f"rule_{uuid.uuid4().hex[:8]}", rule['rule_type'], rule['target_type'],
                          rule['target_value'], rule.get('api_id'), rule['action'],
                          rule.get('priority', 0), rule.get('expires_at'), rule.get('note'),
                          datetime.now().isoformat()))
                    result["restored"]["rules"] += 1
                except Exception as e:
                    result["errors"].append(f"Rule: {str(e)}")
            
            conn.commit()
            logger.info(f"[ApiPoolManager] Restored backup: {result['restored']}")
            return result
            
        except Exception as e:
            logger.error(f"[ApiPoolManager] Error restoring backup: {e}")
            return {"success": False, "error": str(e)}
        finally:
            conn.close()

    # ==================== 🆕 P6: 多租戶支持 ====================

    def create_tenant(
        self,
        tenant_id: str,
        name: str,
        description: Optional[str] = None,
        api_quota: int = 100
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """創建租戶"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            cursor.execute('SELECT id FROM tenants WHERE id = ?', (tenant_id,))
            if cursor.fetchone():
                return False, f"租戶 {tenant_id} 已存在", None
            
            now = datetime.now().isoformat()
            cursor.execute('''
                INSERT INTO tenants (id, name, description, api_quota, created_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (tenant_id, name, description, api_quota, now))
            
            conn.commit()
            
            tenant = {
                "id": tenant_id,
                "name": name,
                "description": description,
                "api_quota": api_quota,
                "enabled": True,
                "created_at": now
            }
            
            logger.info(f"[ApiPoolManager] Created tenant: {tenant_id}")
            return True, "租戶已創建", tenant
        except Exception as e:
            logger.error(f"[ApiPoolManager] Error creating tenant: {e}")
            return False, str(e), None
        finally:
            conn.close()

    def list_tenants(self) -> List[Dict[str, Any]]:
        """獲取所有租戶"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT t.*, 
                    (SELECT COUNT(*) FROM telegram_api_pool WHERE tenant_id = t.id) as api_count,
                    (SELECT SUM(current_accounts) FROM telegram_api_pool WHERE tenant_id = t.id) as total_allocations
                FROM tenants t
                ORDER BY t.created_at ASC
            ''')
            
            tenants = []
            for row in cursor.fetchall():
                tenants.append({
                    "id": row['id'],
                    "name": row['name'],
                    "description": row['description'],
                    "api_quota": row['api_quota'],
                    "enabled": bool(row['enabled']),
                    "api_count": row['api_count'] or 0,
                    "total_allocations": row['total_allocations'] or 0,
                    "created_at": row['created_at']
                })
            
            return tenants
        finally:
            conn.close()

    def get_tenant_stats(self, tenant_id: str) -> Dict[str, Any]:
        """獲取租戶統計信息"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 基本信息
            cursor.execute('SELECT * FROM tenants WHERE id = ?', (tenant_id,))
            tenant_row = cursor.fetchone()
            if not tenant_row:
                return {"error": "租戶不存在"}
            
            # API 統計
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_apis,
                    SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
                    SUM(CASE WHEN status = 'full' THEN 1 ELSE 0 END) as full,
                    SUM(CASE WHEN status = 'banned' THEN 1 ELSE 0 END) as banned,
                    SUM(current_accounts) as total_allocations,
                    SUM(max_accounts) as total_capacity,
                    SUM(success_count) as total_successes,
                    SUM(fail_count) as total_failures
                FROM telegram_api_pool WHERE tenant_id = ?
            ''', (tenant_id,))
            
            stats_row = cursor.fetchone()
            
            return {
                "tenant": {
                    "id": tenant_row['id'],
                    "name": tenant_row['name'],
                    "api_quota": tenant_row['api_quota'],
                    "enabled": bool(tenant_row['enabled'])
                },
                "stats": {
                    "total_apis": stats_row['total_apis'] or 0,
                    "available": stats_row['available'] or 0,
                    "full": stats_row['full'] or 0,
                    "banned": stats_row['banned'] or 0,
                    "total_allocations": stats_row['total_allocations'] or 0,
                    "total_capacity": stats_row['total_capacity'] or 0,
                    "utilization": round((stats_row['total_allocations'] or 0) / (stats_row['total_capacity'] or 1) * 100, 1),
                    "total_successes": stats_row['total_successes'] or 0,
                    "total_failures": stats_row['total_failures'] or 0,
                    "quota_usage": round((stats_row['total_apis'] or 0) / tenant_row['api_quota'] * 100, 1)
                }
            }
        finally:
            conn.close()

    def assign_api_to_tenant(self, api_id: str, tenant_id: str) -> Tuple[bool, str]:
        """將 API 分配給租戶"""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            
            # 檢查租戶
            cursor.execute('SELECT id, api_quota FROM tenants WHERE id = ?', (tenant_id,))
            tenant = cursor.fetchone()
            if not tenant:
                return False, f"租戶 {tenant_id} 不存在"
            
            # 檢查配額
            cursor.execute('SELECT COUNT(*) FROM telegram_api_pool WHERE tenant_id = ?', (tenant_id,))
            current_count = cursor.fetchone()[0]
            if current_count >= tenant['api_quota']:
                return False, f"租戶已達到 API 配額限制 ({tenant['api_quota']})"
            
            cursor.execute(
                'UPDATE telegram_api_pool SET tenant_id = ? WHERE api_id = ?',
                (tenant_id, api_id)
            )
            
            if cursor.rowcount == 0:
                return False, f"API {api_id} 不存在"
            
            conn.commit()
            logger.info(f"[ApiPoolManager] Assigned API {api_id} to tenant {tenant_id}")
            return True, "已分配到租戶"
        except Exception as e:
            return False, str(e)
        finally:
            conn.close()


# 單例獲取函數
_api_pool_manager: Optional[ApiPoolManager] = None


def get_api_pool_manager(db_path: str = None) -> ApiPoolManager:
    """獲取 API 池管理器實例"""
    global _api_pool_manager
    if _api_pool_manager is None:
        _api_pool_manager = ApiPoolManager(db_path)
    return _api_pool_manager
