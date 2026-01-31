"""
TG-Matrix Unified Contact Service
統一聯繫人服務

整合多個數據源，提供統一的聯繫人管理接口
"""

import sys
import json
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
from dataclasses import asdict

from core.logging import get_logger
from core.event_bus import get_event_bus

from .models import (
    UnifiedContact, 
    ContactFilter, 
    ContactStats,
    ContactStatus,
    FunnelStage,
    ValueLevel,
    ContactSource
)

logger = get_logger('UnifiedContactService')


class UnifiedContactService:
    """
    統一聯繫人服務
    
    整合以下數據源:
    - captured_leads / leads
    - user_profiles
    - collected_users
    - tracked_users
    
    提供統一的 CRUD 接口和高級查詢功能
    """
    
    def __init__(self, database):
        self.db = database
        self._table_initialized = False
    
    async def ensure_table(self):
        """確保統一聯繫人表存在
        
        注意：表結構統一定義在 database.py 的 _init_db() 方法中
        這裡只負責驗證表存在，不重複創建
        """
        if self._table_initialized:
            return
        
        try:
            # 驗證表存在（表由 database.py 創建）
            result = await self.db.fetch_one("SELECT name FROM sqlite_master WHERE type='table' AND name='unified_contacts'")
            if not result:
                import sys
                print("[ContactsService] WARNING: unified_contacts table not found", file=sys.stderr)
            await self.db.execute("CREATE INDEX IF NOT EXISTS idx_uc_is_blacklisted ON unified_contacts(is_blacklisted)")
            
            await self.db.commit()
            self._table_initialized = True
            logger.info("Unified contacts table initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize unified_contacts table: {e}")
    
    async def get_by_id(self, contact_id: int) -> Optional[UnifiedContact]:
        """根據 ID 獲取聯繫人"""
        await self.ensure_table()
        
        row = await self.db.fetch_one(
            "SELECT * FROM unified_contacts WHERE id = ?",
            (contact_id,)
        )
        
        if not row:
            return None
        
        return self._row_to_contact(row)
    
    async def get_by_telegram_id(self, telegram_id: str) -> Optional[UnifiedContact]:
        """根據 Telegram ID 獲取聯繫人"""
        await self.ensure_table()
        
        row = await self.db.fetch_one(
            "SELECT * FROM unified_contacts WHERE telegram_id = ?",
            (str(telegram_id),)
        )
        
        if not row:
            return None
        
        return self._row_to_contact(row)
    
    async def create(self, contact: UnifiedContact) -> int:
        """創建新聯繫人"""
        await self.ensure_table()
        
        now = datetime.now().isoformat()
        
        result = await self.db.execute("""
            INSERT INTO unified_contacts (
                telegram_id, username, first_name, last_name, phone, bio,
                status, funnel_stage, value_level,
                source, source_group_id, source_group_title, matched_keywords,
                interactions_count, messages_sent, messages_received, last_interaction_at,
                ad_risk_score, is_ad_account, is_blacklisted, risk_factors,
                has_photo, is_premium, is_verified, is_bot, account_age_days,
                interest_level, lead_score, quality_score,
                tags, notes, custom_fields,
                assigned_account_phone, assigned_at,
                captured_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            contact.telegram_id,
            contact.username,
            contact.first_name,
            contact.last_name,
            contact.phone,
            contact.bio,
            contact.status.value,
            contact.funnel_stage.value,
            contact.value_level.value,
            contact.source.value,
            contact.source_group_id,
            contact.source_group_title,
            json.dumps(contact.matched_keywords),
            contact.interactions_count,
            contact.messages_sent,
            contact.messages_received,
            contact.last_interaction_at.isoformat() if contact.last_interaction_at else None,
            contact.ad_risk_score,
            1 if contact.is_ad_account else (0 if contact.is_ad_account == False else None),
            1 if contact.is_blacklisted else 0,
            json.dumps(contact.risk_factors),
            1 if contact.has_photo else 0,
            1 if contact.is_premium else 0,
            1 if contact.is_verified else 0,
            1 if contact.is_bot else 0,
            contact.account_age_days,
            contact.interest_level,
            contact.lead_score,
            contact.quality_score,
            json.dumps(contact.tags),
            contact.notes,
            json.dumps(contact.custom_fields),
            contact.assigned_account_phone,
            contact.assigned_at.isoformat() if contact.assigned_at else None,
            contact.captured_at.isoformat() if contact.captured_at else now,
            now,
            now
        ))
        
        await self.db.commit()
        
        # 發布事件
        event_bus = get_event_bus()
        await event_bus.publish('contact.created', contact.to_dict())
        
        logger.info("Contact created", telegram_id=contact.telegram_id)
        return result.lastrowid if hasattr(result, 'lastrowid') else 0
    
    async def update(self, contact: UnifiedContact) -> bool:
        """更新聯繫人"""
        await self.ensure_table()
        
        now = datetime.now().isoformat()
        
        await self.db.execute("""
            UPDATE unified_contacts SET
                username = ?,
                first_name = ?,
                last_name = ?,
                phone = ?,
                bio = ?,
                status = ?,
                funnel_stage = ?,
                value_level = ?,
                source = ?,
                source_group_id = ?,
                source_group_title = ?,
                matched_keywords = ?,
                interactions_count = ?,
                messages_sent = ?,
                messages_received = ?,
                last_interaction_at = ?,
                ad_risk_score = ?,
                is_ad_account = ?,
                is_blacklisted = ?,
                risk_factors = ?,
                has_photo = ?,
                is_premium = ?,
                is_verified = ?,
                is_bot = ?,
                account_age_days = ?,
                interest_level = ?,
                lead_score = ?,
                quality_score = ?,
                tags = ?,
                notes = ?,
                custom_fields = ?,
                assigned_account_phone = ?,
                assigned_at = ?,
                updated_at = ?
            WHERE id = ?
        """, (
            contact.username,
            contact.first_name,
            contact.last_name,
            contact.phone,
            contact.bio,
            contact.status.value,
            contact.funnel_stage.value,
            contact.value_level.value,
            contact.source.value,
            contact.source_group_id,
            contact.source_group_title,
            json.dumps(contact.matched_keywords),
            contact.interactions_count,
            contact.messages_sent,
            contact.messages_received,
            contact.last_interaction_at.isoformat() if contact.last_interaction_at else None,
            contact.ad_risk_score,
            1 if contact.is_ad_account else (0 if contact.is_ad_account == False else None),
            1 if contact.is_blacklisted else 0,
            json.dumps(contact.risk_factors),
            1 if contact.has_photo else 0,
            1 if contact.is_premium else 0,
            1 if contact.is_verified else 0,
            1 if contact.is_bot else 0,
            contact.account_age_days,
            contact.interest_level,
            contact.lead_score,
            contact.quality_score,
            json.dumps(contact.tags),
            contact.notes,
            json.dumps(contact.custom_fields),
            contact.assigned_account_phone,
            contact.assigned_at.isoformat() if contact.assigned_at else None,
            now,
            contact.id
        ))
        
        await self.db.commit()
        
        # 發布事件
        event_bus = get_event_bus()
        await event_bus.publish('contact.updated', contact.to_dict())
        
        logger.info("Contact updated", contact_id=contact.id)
        return True
    
    async def delete(self, contact_id: int) -> bool:
        """刪除聯繫人"""
        await self.ensure_table()
        
        await self.db.execute(
            "DELETE FROM unified_contacts WHERE id = ?",
            (contact_id,)
        )
        await self.db.commit()
        
        # 發布事件
        event_bus = get_event_bus()
        await event_bus.publish('contact.deleted', {'id': contact_id})
        
        logger.info("Contact deleted", contact_id=contact_id)
        return True
    
    async def query(self, filter: ContactFilter) -> Tuple[List[UnifiedContact], int]:
        """
        查詢聯繫人
        
        Returns:
            (聯繫人列表, 總數)
        """
        await self.ensure_table()
        
        conditions = []
        params = []
        
        # 構建查詢條件
        if filter.status:
            placeholders = ','.join('?' * len(filter.status))
            conditions.append(f"status IN ({placeholders})")
            params.extend([s.value for s in filter.status])
        
        if filter.funnel_stages:
            placeholders = ','.join('?' * len(filter.funnel_stages))
            conditions.append(f"funnel_stage IN ({placeholders})")
            params.extend([s.value for s in filter.funnel_stages])
        
        if filter.value_levels:
            placeholders = ','.join('?' * len(filter.value_levels))
            conditions.append(f"value_level IN ({placeholders})")
            params.extend([v.value for v in filter.value_levels])
        
        if filter.sources:
            placeholders = ','.join('?' * len(filter.sources))
            conditions.append(f"source IN ({placeholders})")
            params.extend([s.value for s in filter.sources])
        
        if filter.is_blacklisted is not None:
            conditions.append("is_blacklisted = ?")
            params.append(1 if filter.is_blacklisted else 0)
        
        if filter.is_ad_account is not None:
            conditions.append("is_ad_account = ?")
            params.append(1 if filter.is_ad_account else 0)
        
        if filter.min_risk_score is not None:
            conditions.append("ad_risk_score >= ?")
            params.append(filter.min_risk_score)
        
        if filter.max_risk_score is not None:
            conditions.append("ad_risk_score <= ?")
            params.append(filter.max_risk_score)
        
        if filter.min_interest_level is not None:
            conditions.append("interest_level >= ?")
            params.append(filter.min_interest_level)
        
        if filter.min_lead_score is not None:
            conditions.append("lead_score >= ?")
            params.append(filter.min_lead_score)
        
        if filter.assigned_account:
            conditions.append("assigned_account_phone = ?")
            params.append(filter.assigned_account)
        
        if filter.is_unassigned:
            conditions.append("assigned_account_phone IS NULL")
        
        if filter.search_query:
            search = f"%{filter.search_query}%"
            conditions.append("(username LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR phone LIKE ?)")
            params.extend([search, search, search, search])
        
        if filter.captured_after:
            conditions.append("captured_at >= ?")
            params.append(filter.captured_after.isoformat())
        
        if filter.captured_before:
            conditions.append("captured_at <= ?")
            params.append(filter.captured_before.isoformat())
        
        # 構建 SQL
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        order_dir = "DESC" if filter.sort_desc else "ASC"
        
        # 獲取總數
        count_sql = f"SELECT COUNT(*) as count FROM unified_contacts WHERE {where_clause}"
        count_result = await self.db.fetch_one(count_sql, tuple(params))
        total = count_result['count'] if count_result else 0
        
        # 獲取數據
        query_sql = f"""
            SELECT * FROM unified_contacts 
            WHERE {where_clause}
            ORDER BY {filter.sort_by} {order_dir}
            LIMIT ? OFFSET ?
        """
        params.extend([filter.limit, filter.offset])
        
        rows = await self.db.fetch_all(query_sql, tuple(params))
        contacts = [self._row_to_contact(row) for row in rows]
        
        return contacts, total
    
    async def get_stats(self) -> ContactStats:
        """獲取聯繫人統計"""
        await self.ensure_table()
        
        stats = ContactStats()
        
        # 總數
        result = await self.db.fetch_one("SELECT COUNT(*) as count FROM unified_contacts")
        stats.total = result['count'] if result else 0
        
        # 按狀態統計
        rows = await self.db.fetch_all("""
            SELECT status, COUNT(*) as count FROM unified_contacts GROUP BY status
        """)
        stats.by_status = {row['status']: row['count'] for row in rows}
        
        # 按漏斗階段統計
        rows = await self.db.fetch_all("""
            SELECT funnel_stage, COUNT(*) as count FROM unified_contacts GROUP BY funnel_stage
        """)
        stats.by_funnel_stage = {row['funnel_stage']: row['count'] for row in rows}
        
        # 按價值等級統計
        rows = await self.db.fetch_all("""
            SELECT value_level, COUNT(*) as count FROM unified_contacts GROUP BY value_level
        """)
        stats.by_value_level = {row['value_level']: row['count'] for row in rows}
        
        # 按來源統計
        rows = await self.db.fetch_all("""
            SELECT source, COUNT(*) as count FROM unified_contacts GROUP BY source
        """)
        stats.by_source = {row['source']: row['count'] for row in rows}
        
        # 今日統計
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        
        result = await self.db.fetch_one("""
            SELECT COUNT(*) as count FROM unified_contacts WHERE captured_at >= ?
        """, (today,))
        stats.today_new = result['count'] if result else 0
        
        result = await self.db.fetch_one("""
            SELECT COUNT(*) as count FROM unified_contacts 
            WHERE status = 'contacted' AND updated_at >= ?
        """, (today,))
        stats.today_contacted = result['count'] if result else 0
        
        result = await self.db.fetch_one("""
            SELECT COUNT(*) as count FROM unified_contacts 
            WHERE status = 'converted' AND updated_at >= ?
        """, (today,))
        stats.today_converted = result['count'] if result else 0
        
        # 風險統計
        result = await self.db.fetch_one("""
            SELECT COUNT(*) as count FROM unified_contacts WHERE ad_risk_score > 70
        """)
        stats.high_risk_count = result['count'] if result else 0
        
        result = await self.db.fetch_one("""
            SELECT COUNT(*) as count FROM unified_contacts WHERE is_blacklisted = 1
        """)
        stats.blacklisted_count = result['count'] if result else 0
        
        # 活躍度統計
        week_ago = (datetime.now() - timedelta(days=7)).isoformat()
        month_ago = (datetime.now() - timedelta(days=30)).isoformat()
        
        result = await self.db.fetch_one("""
            SELECT COUNT(*) as count FROM unified_contacts WHERE last_interaction_at >= ?
        """, (week_ago,))
        stats.active_7d = result['count'] if result else 0
        
        result = await self.db.fetch_one("""
            SELECT COUNT(*) as count FROM unified_contacts WHERE last_interaction_at >= ?
        """, (month_ago,))
        stats.active_30d = result['count'] if result else 0
        
        return stats
    
    async def update_status(self, contact_id: int, status: ContactStatus) -> bool:
        """更新聯繫人狀態"""
        await self.ensure_table()
        
        now = datetime.now().isoformat()
        await self.db.execute("""
            UPDATE unified_contacts SET status = ?, updated_at = ? WHERE id = ?
        """, (status.value, now, contact_id))
        await self.db.commit()
        
        # 發布事件
        event_bus = get_event_bus()
        await event_bus.publish('contact.status_changed', {
            'id': contact_id,
            'status': status.value
        })
        
        return True
    
    async def update_funnel_stage(self, contact_id: int, stage: FunnelStage) -> bool:
        """更新漏斗階段"""
        await self.ensure_table()
        
        now = datetime.now().isoformat()
        await self.db.execute("""
            UPDATE unified_contacts SET funnel_stage = ?, updated_at = ? WHERE id = ?
        """, (stage.value, now, contact_id))
        await self.db.commit()
        
        return True
    
    async def add_tags(self, contact_id: int, tags: List[str]) -> bool:
        """添加標籤"""
        contact = await self.get_by_id(contact_id)
        if not contact:
            return False
        
        existing_tags = set(contact.tags)
        existing_tags.update(tags)
        contact.tags = list(existing_tags)
        
        await self.update(contact)
        return True
    
    async def remove_tags(self, contact_id: int, tags: List[str]) -> bool:
        """移除標籤"""
        contact = await self.get_by_id(contact_id)
        if not contact:
            return False
        
        contact.tags = [t for t in contact.tags if t not in tags]
        await self.update(contact)
        return True
    
    async def assign_to_account(self, contact_id: int, account_phone: str) -> bool:
        """分配給帳號"""
        await self.ensure_table()
        
        now = datetime.now().isoformat()
        await self.db.execute("""
            UPDATE unified_contacts SET 
                assigned_account_phone = ?, 
                assigned_at = ?,
                updated_at = ? 
            WHERE id = ?
        """, (account_phone, now, now, contact_id))
        await self.db.commit()
        
        return True
    
    async def record_interaction(self, telegram_id: str, direction: str = 'sent') -> bool:
        """
        記錄互動
        
        Args:
            telegram_id: Telegram 用戶 ID
            direction: 'sent' 或 'received'
        """
        await self.ensure_table()
        
        now = datetime.now().isoformat()
        
        if direction == 'sent':
            await self.db.execute("""
                UPDATE unified_contacts SET 
                    interactions_count = interactions_count + 1,
                    messages_sent = messages_sent + 1,
                    last_interaction_at = ?,
                    updated_at = ?
                WHERE telegram_id = ?
            """, (now, now, str(telegram_id)))
        else:
            await self.db.execute("""
                UPDATE unified_contacts SET 
                    interactions_count = interactions_count + 1,
                    messages_received = messages_received + 1,
                    last_interaction_at = ?,
                    updated_at = ?
                WHERE telegram_id = ?
            """, (now, now, str(telegram_id)))
        
        await self.db.commit()
        return True
    
    async def blacklist(self, contact_id: int, reason: str = '') -> bool:
        """加入黑名單"""
        contact = await self.get_by_id(contact_id)
        if not contact:
            return False
        
        contact.is_blacklisted = True
        contact.status = ContactStatus.BLACKLISTED
        if reason:
            contact.notes = f"{contact.notes}\n[黑名單] {reason}".strip()
        
        await self.update(contact)
        return True
    
    def _row_to_contact(self, row: Dict[str, Any]) -> UnifiedContact:
        """將數據庫行轉換為 UnifiedContact"""
        def parse_json(val):
            if not val:
                return []
            if isinstance(val, (list, dict)):
                return val
            try:
                return json.loads(val)
            except:
                return []
        
        def parse_bool(val):
            if val is None:
                return None
            return bool(val)
        
        def parse_datetime(val):
            if not val:
                return None
            try:
                return datetime.fromisoformat(val)
            except:
                return None
        
        return UnifiedContact(
            id=row['id'],
            telegram_id=row['telegram_id'],
            username=row.get('username'),
            first_name=row.get('first_name'),
            last_name=row.get('last_name'),
            phone=row.get('phone'),
            bio=row.get('bio'),
            
            status=ContactStatus(row.get('status', 'new')),
            funnel_stage=FunnelStage(row.get('funnel_stage', 'awareness')),
            value_level=ValueLevel(row.get('value_level', 'low')),
            
            source=ContactSource(row.get('source', 'keyword_match')),
            source_group_id=row.get('source_group_id'),
            source_group_title=row.get('source_group_title'),
            matched_keywords=parse_json(row.get('matched_keywords')),
            
            interactions_count=row.get('interactions_count', 0) or 0,
            messages_sent=row.get('messages_sent', 0) or 0,
            messages_received=row.get('messages_received', 0) or 0,
            last_interaction_at=parse_datetime(row.get('last_interaction_at')),
            
            ad_risk_score=float(row.get('ad_risk_score', 0) or 0),
            is_ad_account=parse_bool(row.get('is_ad_account')),
            is_blacklisted=bool(row.get('is_blacklisted', 0)),
            risk_factors=parse_json(row.get('risk_factors')) or {},
            
            has_photo=bool(row.get('has_photo', 0)),
            is_premium=bool(row.get('is_premium', 0)),
            is_verified=bool(row.get('is_verified', 0)),
            is_bot=bool(row.get('is_bot', 0)),
            account_age_days=row.get('account_age_days'),
            
            interest_level=row.get('interest_level', 1) or 1,
            lead_score=row.get('lead_score', 0) or 0,
            quality_score=row.get('quality_score', 0) or 0,
            
            tags=parse_json(row.get('tags')) or [],
            notes=row.get('notes', '') or '',
            custom_fields=parse_json(row.get('custom_fields')) or {},
            
            assigned_account_phone=row.get('assigned_account_phone'),
            assigned_at=parse_datetime(row.get('assigned_at')),
            
            captured_at=parse_datetime(row.get('captured_at')) or datetime.now(),
            created_at=parse_datetime(row.get('created_at')) or datetime.now(),
            updated_at=parse_datetime(row.get('updated_at')) or datetime.now(),
        )


# 全局服務實例
_contact_service: Optional[UnifiedContactService] = None


def init_contact_service(database) -> UnifiedContactService:
    """初始化聯繫人服務"""
    global _contact_service
    _contact_service = UnifiedContactService(database)
    return _contact_service


def get_contact_service() -> Optional[UnifiedContactService]:
    """獲取聯繫人服務實例"""
    return _contact_service
