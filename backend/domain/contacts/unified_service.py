"""
TG-Matrix 統一聯絡人服務（增強版）
Phase C: Database - 數據統一遷移

功能：
1. CRUD 操作
2. 全文搜索
3. 批量操作
4. 數據遷移
"""

import asyncio
import aiosqlite
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.logging import get_logger
from core.cache import cached, get_cache_manager

logger = get_logger("unified_contacts")


class ContactStatus(Enum):
    """聯絡人狀態"""
    NEW = "new"
    ACTIVE = "active"
    ENGAGED = "engaged"
    CONVERTED = "converted"
    INACTIVE = "inactive"
    BLOCKED = "blocked"


class FunnelStage(Enum):
    """銷售漏斗階段"""
    AWARENESS = "awareness"
    INTEREST = "interest"
    CONSIDERATION = "consideration"
    DECISION = "decision"
    ACTION = "action"
    RETENTION = "retention"


class ContactSource(Enum):
    """聯絡人來源"""
    KEYWORD_MATCH = "keyword_match"
    GROUP_MEMBER = "group_member"
    PRIVATE_MESSAGE = "private_message"
    MANUAL_ADD = "manual_add"
    IMPORT = "import"


@dataclass
class UnifiedContact:
    """統一聯絡人"""
    id: Optional[int] = None
    telegram_id: str = ""
    telegram_username: Optional[str] = None
    display_name: Optional[str] = None
    phone: Optional[str] = None
    
    # 狀態
    status: ContactStatus = ContactStatus.NEW
    funnel_stage: FunnelStage = FunnelStage.AWARENESS
    
    # 來源
    source: ContactSource = ContactSource.KEYWORD_MATCH
    source_group_id: Optional[str] = None
    source_group_name: Optional[str] = None
    captured_by_account: Optional[str] = None
    
    # 時間
    captured_at: datetime = field(default_factory=datetime.now)
    last_interaction_at: Optional[datetime] = None
    
    # 評分與標籤
    intent_score: float = 0.0
    tags: List[str] = field(default_factory=list)
    notes: Optional[str] = None
    
    # 軟刪除
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[str] = None
    
    # 元數據
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "telegram_id": self.telegram_id,
            "telegram_username": self.telegram_username,
            "display_name": self.display_name,
            "phone": self.phone,
            "status": self.status.value,
            "funnel_stage": self.funnel_stage.value,
            "source": self.source.value,
            "source_group_id": self.source_group_id,
            "source_group_name": self.source_group_name,
            "captured_by_account": self.captured_by_account,
            "captured_at": self.captured_at.isoformat() if self.captured_at else None,
            "last_interaction_at": self.last_interaction_at.isoformat() if self.last_interaction_at else None,
            "intent_score": self.intent_score,
            "tags": self.tags,
            "notes": self.notes,
            "deleted_at": self.deleted_at.isoformat() if self.deleted_at else None,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_row(cls, row: tuple, columns: List[str]) -> 'UnifiedContact':
        """從數據庫行創建"""
        data = dict(zip(columns, row))
        
        # 處理枚舉
        status = ContactStatus(data.get("status", "new")) if data.get("status") else ContactStatus.NEW
        funnel_stage = FunnelStage(data.get("funnel_stage", "awareness")) if data.get("funnel_stage") else FunnelStage.AWARENESS
        source = ContactSource(data.get("source", "keyword_match")) if data.get("source") else ContactSource.KEYWORD_MATCH
        
        # 處理日期
        captured_at = datetime.fromisoformat(data["captured_at"]) if data.get("captured_at") else datetime.now()
        last_interaction_at = datetime.fromisoformat(data["last_interaction_at"]) if data.get("last_interaction_at") else None
        deleted_at = datetime.fromisoformat(data["deleted_at"]) if data.get("deleted_at") else None
        
        # 處理標籤
        tags = data.get("tags", "").split(",") if data.get("tags") else []
        tags = [t.strip() for t in tags if t.strip()]
        
        return cls(
            id=data.get("id"),
            telegram_id=data.get("telegram_id", ""),
            telegram_username=data.get("telegram_username"),
            display_name=data.get("display_name"),
            phone=data.get("phone"),
            status=status,
            funnel_stage=funnel_stage,
            source=source,
            source_group_id=data.get("source_group_id"),
            source_group_name=data.get("source_group_name"),
            captured_by_account=data.get("captured_by_account"),
            captured_at=captured_at,
            last_interaction_at=last_interaction_at,
            intent_score=float(data.get("intent_score", 0)),
            tags=tags,
            notes=data.get("notes"),
            deleted_at=deleted_at,
            deleted_by=data.get("deleted_by"),
            metadata={}
        )


@dataclass
class ContactFilter:
    """查詢過濾器"""
    status: Optional[List[ContactStatus]] = None
    funnel_stage: Optional[List[FunnelStage]] = None
    source: Optional[List[ContactSource]] = None
    tags: Optional[List[str]] = None
    captured_after: Optional[datetime] = None
    captured_before: Optional[datetime] = None
    min_intent_score: Optional[float] = None
    search_text: Optional[str] = None
    include_deleted: bool = False
    limit: int = 50
    offset: int = 0
    order_by: str = "captured_at"
    order_desc: bool = True


class UnifiedContactService:
    """統一聯絡人服務"""
    
    COLUMNS = [
        "id", "telegram_id", "telegram_username", "display_name", "phone",
        "status", "funnel_stage", "source", "source_group_id", "source_group_name",
        "captured_by_account", "captured_at", "last_interaction_at",
        "intent_score", "tags", "notes", "deleted_at", "deleted_by"
    ]
    
    def __init__(self, db_path: str):
        self.db_path = db_path
    
    async def ensure_table(self):
        """確保表存在
        
        注意：表結構統一定義在 database.py 的 _init_db() 方法中
        這裡只負責驗證表存在，不重複創建
        """
        import sys
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='unified_contacts'")
            result = await cursor.fetchone()
            if not result:
                print("[UnifiedService] WARNING: unified_contacts table not found, it should be created by database.py", file=sys.stderr)
            else:
                print("[UnifiedService] Table verified", file=sys.stderr)
    
    async def create(self, contact: UnifiedContact) -> UnifiedContact:
        """創建聯絡人"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("""
                INSERT INTO unified_contacts (
                    telegram_id, telegram_username, display_name, phone,
                    status, funnel_stage, source, source_group_id, source_group_name,
                    captured_by_account, captured_at, last_interaction_at,
                    intent_score, tags, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(telegram_id) DO UPDATE SET
                    telegram_username = excluded.telegram_username,
                    display_name = COALESCE(excluded.display_name, unified_contacts.display_name),
                    last_interaction_at = excluded.captured_at,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                contact.telegram_id,
                contact.telegram_username,
                contact.display_name,
                contact.phone,
                contact.status.value,
                contact.funnel_stage.value,
                contact.source.value,
                contact.source_group_id,
                contact.source_group_name,
                contact.captured_by_account,
                contact.captured_at.isoformat(),
                contact.last_interaction_at.isoformat() if contact.last_interaction_at else None,
                contact.intent_score,
                ",".join(contact.tags),
                contact.notes
            ))
            await db.commit()
            contact.id = cursor.lastrowid
            return contact
    
    async def get_by_id(self, contact_id: int) -> Optional[UnifiedContact]:
        """按 ID 獲取"""
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                f"SELECT {','.join(self.COLUMNS)} FROM unified_contacts WHERE id = ?",
                [contact_id]
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    return UnifiedContact.from_row(row, self.COLUMNS)
        return None
    
    async def get_by_telegram_id(self, telegram_id: str) -> Optional[UnifiedContact]:
        """按 Telegram ID 獲取"""
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(
                f"SELECT {','.join(self.COLUMNS)} FROM unified_contacts WHERE telegram_id = ?",
                [telegram_id]
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    return UnifiedContact.from_row(row, self.COLUMNS)
        return None
    
    async def update(self, contact: UnifiedContact) -> bool:
        """更新聯絡人"""
        if not contact.id:
            return False
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                UPDATE unified_contacts SET
                    telegram_username = ?,
                    display_name = ?,
                    phone = ?,
                    status = ?,
                    funnel_stage = ?,
                    last_interaction_at = ?,
                    intent_score = ?,
                    tags = ?,
                    notes = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (
                contact.telegram_username,
                contact.display_name,
                contact.phone,
                contact.status.value,
                contact.funnel_stage.value,
                contact.last_interaction_at.isoformat() if contact.last_interaction_at else None,
                contact.intent_score,
                ",".join(contact.tags),
                contact.notes,
                contact.id
            ))
            await db.commit()
            return True
    
    async def soft_delete(self, contact_id: int, deleted_by: Optional[str] = None) -> bool:
        """軟刪除"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE unified_contacts SET deleted_at = ?, deleted_by = ? WHERE id = ?",
                [datetime.now().isoformat(), deleted_by, contact_id]
            )
            await db.commit()
            return True
    
    async def restore(self, contact_id: int) -> bool:
        """恢復軟刪除"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE unified_contacts SET deleted_at = NULL, deleted_by = NULL WHERE id = ?",
                [contact_id]
            )
            await db.commit()
            return True
    
    async def query(self, filter: ContactFilter) -> Tuple[List[UnifiedContact], int]:
        """
        查詢聯絡人
        
        Returns:
            (聯絡人列表, 總數)
        """
        conditions = []
        params = []
        
        if not filter.include_deleted:
            conditions.append("deleted_at IS NULL")
        
        if filter.status:
            placeholders = ",".join("?" * len(filter.status))
            conditions.append(f"status IN ({placeholders})")
            params.extend(s.value for s in filter.status)
        
        if filter.funnel_stage:
            placeholders = ",".join("?" * len(filter.funnel_stage))
            conditions.append(f"funnel_stage IN ({placeholders})")
            params.extend(s.value for s in filter.funnel_stage)
        
        if filter.source:
            placeholders = ",".join("?" * len(filter.source))
            conditions.append(f"source IN ({placeholders})")
            params.extend(s.value for s in filter.source)
        
        if filter.tags:
            tag_conditions = []
            for tag in filter.tags:
                tag_conditions.append("tags LIKE ?")
                params.append(f"%{tag}%")
            conditions.append(f"({' OR '.join(tag_conditions)})")
        
        if filter.captured_after:
            conditions.append("captured_at >= ?")
            params.append(filter.captured_after.isoformat())
        
        if filter.captured_before:
            conditions.append("captured_at <= ?")
            params.append(filter.captured_before.isoformat())
        
        if filter.min_intent_score is not None:
            conditions.append("intent_score >= ?")
            params.append(filter.min_intent_score)
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        order = "DESC" if filter.order_desc else "ASC"
        
        async with aiosqlite.connect(self.db_path) as db:
            # 獲取總數
            count_sql = f"SELECT COUNT(*) FROM unified_contacts WHERE {where_clause}"
            async with db.execute(count_sql, params) as cursor:
                total = (await cursor.fetchone())[0]
            
            # 全文搜索
            if filter.search_text:
                # 使用 FTS 搜索
                try:
                    fts_sql = f"""
                        SELECT uc.{',uc.'.join(self.COLUMNS)}
                        FROM unified_contacts uc
                        JOIN unified_contacts_fts fts ON uc.id = fts.rowid
                        WHERE {where_clause} AND unified_contacts_fts MATCH ?
                        ORDER BY rank
                        LIMIT ? OFFSET ?
                    """
                    async with db.execute(fts_sql, params + [filter.search_text, filter.limit, filter.offset]) as cursor:
                        rows = await cursor.fetchall()
                except Exception:
                    # 回退到 LIKE 搜索
                    like_conditions = f"({where_clause}) AND (telegram_username LIKE ? OR display_name LIKE ? OR notes LIKE ?)"
                    search = f"%{filter.search_text}%"
                    data_sql = f"""
                        SELECT {','.join(self.COLUMNS)}
                        FROM unified_contacts
                        WHERE {like_conditions}
                        ORDER BY {filter.order_by} {order}
                        LIMIT ? OFFSET ?
                    """
                    async with db.execute(data_sql, params + [search, search, search, filter.limit, filter.offset]) as cursor:
                        rows = await cursor.fetchall()
            else:
                data_sql = f"""
                    SELECT {','.join(self.COLUMNS)}
                    FROM unified_contacts
                    WHERE {where_clause}
                    ORDER BY {filter.order_by} {order}
                    LIMIT ? OFFSET ?
                """
                async with db.execute(data_sql, params + [filter.limit, filter.offset]) as cursor:
                    rows = await cursor.fetchall()
            
            contacts = [UnifiedContact.from_row(row, self.COLUMNS) for row in rows]
            return contacts, total
    
    async def get_stats(self) -> Dict[str, Any]:
        """獲取統計信息"""
        async with aiosqlite.connect(self.db_path) as db:
            # 總數
            async with db.execute(
                "SELECT COUNT(*) FROM unified_contacts WHERE deleted_at IS NULL"
            ) as cursor:
                total = (await cursor.fetchone())[0]
            
            # 按狀態
            async with db.execute("""
                SELECT status, COUNT(*) FROM unified_contacts 
                WHERE deleted_at IS NULL GROUP BY status
            """) as cursor:
                by_status = dict(await cursor.fetchall())
            
            # 按漏斗階段
            async with db.execute("""
                SELECT funnel_stage, COUNT(*) FROM unified_contacts 
                WHERE deleted_at IS NULL GROUP BY funnel_stage
            """) as cursor:
                by_funnel = dict(await cursor.fetchall())
            
            # 按來源
            async with db.execute("""
                SELECT source, COUNT(*) FROM unified_contacts 
                WHERE deleted_at IS NULL GROUP BY source
            """) as cursor:
                by_source = dict(await cursor.fetchall())
            
            # 今日新增
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            async with db.execute(
                "SELECT COUNT(*) FROM unified_contacts WHERE captured_at >= ? AND deleted_at IS NULL",
                [today.isoformat()]
            ) as cursor:
                today_count = (await cursor.fetchone())[0]
            
            return {
                "total": total,
                "today_new": today_count,
                "by_status": by_status,
                "by_funnel_stage": by_funnel,
                "by_source": by_source
            }
    
    async def bulk_update_status(
        self,
        contact_ids: List[int],
        status: ContactStatus
    ) -> int:
        """批量更新狀態"""
        if not contact_ids:
            return 0
        
        placeholders = ",".join("?" * len(contact_ids))
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                f"UPDATE unified_contacts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN ({placeholders})",
                [status.value] + contact_ids
            )
            await db.commit()
            return cursor.rowcount
    
    async def bulk_add_tag(self, contact_ids: List[int], tag: str) -> int:
        """批量添加標籤"""
        if not contact_ids:
            return 0
        
        count = 0
        async with aiosqlite.connect(self.db_path) as db:
            for cid in contact_ids:
                async with db.execute(
                    "SELECT tags FROM unified_contacts WHERE id = ?", [cid]
                ) as cursor:
                    row = await cursor.fetchone()
                    if row:
                        current_tags = row[0] or ""
                        if tag not in current_tags:
                            new_tags = f"{current_tags},{tag}" if current_tags else tag
                            await db.execute(
                                "UPDATE unified_contacts SET tags = ? WHERE id = ?",
                                [new_tags, cid]
                            )
                            count += 1
            await db.commit()
        return count


# 全局實例
_service: Optional[UnifiedContactService] = None


def init_unified_contact_service(db_path: str) -> UnifiedContactService:
    """初始化服務"""
    global _service
    _service = UnifiedContactService(db_path)
    return _service


def get_unified_contact_service() -> Optional[UnifiedContactService]:
    """獲取服務"""
    return _service


__all__ = [
    'ContactStatus',
    'FunnelStage',
    'ContactSource',
    'UnifiedContact',
    'ContactFilter',
    'UnifiedContactService',
    'init_unified_contact_service',
    'get_unified_contact_service'
]
