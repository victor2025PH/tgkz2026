"""
統一聯繫人管理器 - Unified Contacts Manager
整合 extracted_members, discovered_resources 數據

功能：
1. 統一視圖查詢
2. 數據同步
3. 去重邏輯
4. 標籤管理
5. 篩選排序
"""

import sys
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Tuple
from pathlib import Path

# 聯繫人來源類型
SOURCE_TYPES = {
    'member': '群組成員',
    'resource': '資源發現',
    'lead': '營銷漏斗',      # 🆕 發送控制台的 leads
    'manual': '手動添加',
    'import': '批量導入'
}

# 🆕 Lead狀態 → Contact狀態 映射
LEAD_STATUS_MAPPING = {
    'New': 'new',
    'Contacted': 'contacted',
    'Replied': 'interested',
    'Interested': 'interested',
    'Follow-up': 'negotiating',
    'Negotiating': 'negotiating',
    'Closed-Won': 'converted',
    'Closed-Lost': 'lost',
    'Unsubscribed': 'blocked'
}

# 🆕 Contact狀態 → Lead狀態 映射（反向）
CONTACT_STATUS_TO_LEAD = {
    'new': 'New',
    'contacted': 'Contacted',
    'interested': 'Interested',
    'negotiating': 'Follow-up',
    'converted': 'Closed-Won',
    'lost': 'Closed-Lost',
    'blocked': 'Unsubscribed'
}

# 聯繫人狀態
CONTACT_STATUS = {
    'new': '新發現',
    'contacted': '已聯繫',
    'interested': '有意向',
    'negotiating': '洽談中',
    'converted': '已成交',
    'lost': '已流失',
    'blocked': '已封鎖'
}

# 標籤預設
DEFAULT_TAGS = [
    '高意向', '待跟進', '已成交', '流失風險', 'VIP',
    '新發現', '已聯繫', '需要報價', '技術諮詢', '潛在大客戶'
]


class UnifiedContactsManager:
    """統一聯繫人管理器"""
    
    def __init__(self, db):
        """
        初始化管理器
        
        Args:
            db: 數據庫實例 (AsyncDatabase)
        """
        self.db = db
        self._initialized = False

    def _owner_id(self):
        """多用户一库：当前租户 ID，用于 INSERT/UPDATE 归属"""
        try:
            from core.tenant_filter import get_owner_user_id
            return get_owner_user_id()
        except ImportError:
            return 'local_user'

    async def initialize(self):
        """初始化 - 驗證 unified_contacts 表存在
        
        注意：表結構統一定義在 database.py 的 _init_db() 方法中
        這裡只負責驗證表存在，不重複創建
        """
        if self._initialized:
            return
        
        try:
            # 驗證表存在（表由 database.py 創建）
            result = await self.db.fetch_one("SELECT name FROM sqlite_master WHERE type='table' AND name='unified_contacts'")
            if not result:
                print("[UnifiedContacts] WARNING: unified_contacts table not found, it should be created by database.py", file=sys.stderr)
            else:
                print("[UnifiedContacts] Table verified", file=sys.stderr)
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_unified_contacts_contact_type 
                ON unified_contacts(contact_type)
            ''')
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_unified_contacts_ai_score 
                ON unified_contacts(ai_score DESC)
            ''')
            
            self._initialized = True
            print(f"[UnifiedContacts] Initialized successfully", file=sys.stderr)
            
        except Exception as e:
            print(f"[UnifiedContacts] Initialize error: {e}", file=sys.stderr)
            raise
    
    async def sync_from_sources(self) -> Dict[str, int]:
        """
        從來源表同步數據到統一視圖
        
        Returns:
            同步統計 {synced: int, updated: int, errors: int}
        """
        print(f"[UnifiedContacts] sync_from_sources() called", file=sys.stderr)
        await self.initialize()
        
        stats = {'synced': 0, 'updated': 0, 'errors': 0, 'from_members': 0, 'from_resources': 0, 'from_leads': 0}
        now = datetime.now().isoformat()
        
        try:
            # 1. 同步 extracted_members (用戶)
            print(f"[UnifiedContacts] Fetching extracted_members...", file=sys.stderr)
            members = await self.db.fetch_all('''
                SELECT * FROM extracted_members ORDER BY created_at DESC
            ''')
            print(f"[UnifiedContacts] Found {len(members)} members to sync", file=sys.stderr)
            
            for member in members:
                try:
                    telegram_id = member.get('user_id')
                    if not telegram_id:
                        continue
                    
                    # 構建顯示名稱
                    first_name = member.get('first_name', '') or ''
                    last_name = member.get('last_name', '') or ''
                    display_name = f"{first_name} {last_name}".strip() or member.get('username') or telegram_id
                    
                    # 解析標籤
                    tags = member.get('tags', '[]')
                    if isinstance(tags, str):
                        try:
                            tags = json.loads(tags)
                        except:
                            tags = []
                    
                    # 狀態映射
                    status = 'new'
                    if member.get('contacted'):
                        status = 'contacted'
                    if member.get('response_status') == 'replied':
                        status = 'interested'
                    
                    owner_id = self._owner_id()
                    existing = await self.db.fetch_one(
                        'SELECT id FROM unified_contacts WHERE telegram_id = ? AND (owner_user_id = ? OR owner_user_id IS NULL)',
                        (telegram_id, owner_id)
                    )
                    if existing:
                        await self.db.execute('''
                            UPDATE unified_contacts SET
                                username = COALESCE(?, username),
                                display_name = COALESCE(?, display_name),
                                first_name = ?,
                                last_name = ?,
                                phone = COALESCE(?, phone),
                                source_type = CASE WHEN source_type = 'member' THEN 'member' ELSE source_type END,
                                source_id = COALESCE(?, source_id),
                                source_name = COALESCE(?, source_name),
                                status = CASE WHEN status = 'new' THEN ? ELSE status END,
                                tags = ?,
                                activity_score = ?,
                                value_level = ?,
                                is_bot = ?,
                                is_premium = ?,
                                is_verified = ?,
                                last_seen = COALESCE(?, last_seen),
                                updated_at = ?,
                                synced_at = ?,
                                owner_user_id = ?
                            WHERE telegram_id = ? AND (owner_user_id = ? OR owner_user_id IS NULL)
                        ''', (
                            member.get('username'),
                            display_name,
                            first_name,
                            last_name,
                            member.get('phone'),
                            member.get('source_chat_id'),
                            member.get('source_chat_title'),
                            status,
                            json.dumps(tags) if isinstance(tags, list) else tags,
                            member.get('activity_score', 0.5),
                            member.get('value_level', 'C'),
                            member.get('is_bot', 0),
                            member.get('is_premium', 0),
                            member.get('is_verified', 0),
                            member.get('last_online'),
                            now,
                            now,
                            owner_id,
                            telegram_id,
                            owner_id,
                        ))
                        stats['updated'] += 1
                    else:
                        print(f"[UnifiedContacts] INSERT member: {telegram_id}, {display_name}", file=sys.stderr)
                        result = await self.db.execute('''
                            INSERT INTO unified_contacts (
                                telegram_id, username, display_name, first_name, last_name, phone,
                                contact_type, source_type, source_id, source_name,
                                status, tags, activity_score, value_level,
                                is_bot, is_premium, is_verified, last_seen,
                                created_at, updated_at, synced_at, captured_at, owner_user_id
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            telegram_id,
                            member.get('username'),
                            display_name,
                            first_name,
                            last_name,
                            member.get('phone'),
                            'user',
                            'member',
                            member.get('source_chat_id'),
                            member.get('source_chat_title'),
                            status,
                            json.dumps(tags) if isinstance(tags, list) else tags,
                            member.get('activity_score', 0.5),
                            member.get('value_level', 'C'),
                            member.get('is_bot', 0),
                            member.get('is_premium', 0),
                            member.get('is_verified', 0),
                            member.get('last_online'),
                            member.get('created_at', now),
                            now,
                            now,
                            member.get('extracted_at', now),
                            owner_id,
                        ))
                        print(f"[UnifiedContacts] INSERT result: {result}", file=sys.stderr)
                        if result == 0:
                            print(f"[UnifiedContacts] WARNING: INSERT returned 0 for {telegram_id}", file=sys.stderr)
                        stats['synced'] += 1
                    
                    stats['from_members'] += 1
                    
                except Exception as e:
                    print(f"[UnifiedContacts] Sync member error: {e}", file=sys.stderr)
                    stats['errors'] += 1
            
            # 2. 同步 discovered_resources (群組/頻道)
            resources = await self.db.fetch_all('''
                SELECT * FROM discovered_resources ORDER BY discovered_at DESC
            ''')
            
            for resource in resources:
                try:
                    telegram_id = resource.get('telegram_id')
                    if not telegram_id:
                        continue
                    
                    # 資源類型映射
                    resource_type = resource.get('resource_type', 'group')
                    contact_type = 'group' if resource_type in ['group', 'supergroup'] else 'channel'
                    
                    display_name = resource.get('title') or resource.get('username') or telegram_id
                    
                    # 狀態映射
                    status = resource.get('status', 'new')
                    if status == 'discovered':
                        status = 'new'
                    elif status == 'joined':
                        status = 'contacted'
                    
                    owner_id = self._owner_id()
                    existing = await self.db.fetch_one(
                        'SELECT id FROM unified_contacts WHERE telegram_id = ? AND (owner_user_id = ? OR owner_user_id IS NULL)',
                        (telegram_id, owner_id)
                    )
                    if existing:
                        await self.db.execute('''
                            UPDATE unified_contacts SET
                                username = COALESCE(?, username),
                                display_name = COALESCE(?, display_name),
                                contact_type = ?,
                                source_type = 'resource',
                                ai_score = ?,
                                activity_score = ?,
                                member_count = ?,
                                bio = COALESCE(?, bio),
                                updated_at = ?,
                                synced_at = ?,
                                owner_user_id = ?
                            WHERE telegram_id = ? AND (owner_user_id = ? OR owner_user_id IS NULL)
                        ''', (
                            resource.get('username'),
                            display_name,
                            contact_type,
                            resource.get('overall_score', 0.5),
                            resource.get('activity_score', 0.5),
                            resource.get('member_count', 0),
                            resource.get('description'),
                            now,
                            now,
                            owner_id,
                            telegram_id,
                            owner_id,
                        ))
                        stats['updated'] += 1
                    else:
                        await self.db.execute('''
                            INSERT INTO unified_contacts (
                                telegram_id, username, display_name,
                                contact_type, source_type, source_id, source_name,
                                status, ai_score, activity_score, member_count, bio,
                                created_at, updated_at, synced_at, captured_at, owner_user_id
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            telegram_id,
                            resource.get('username'),
                            display_name,
                            contact_type,
                            'resource',
                            resource.get('discovery_keyword'),
                            resource.get('discovery_source'),
                            status,
                            resource.get('overall_score', 0.5),
                            resource.get('activity_score', 0.5),
                            resource.get('member_count', 0),
                            resource.get('description'),
                            resource.get('discovered_at', now),
                            now,
                            now,
                            resource.get('discovered_at', now),
                            owner_id,
                        ))
                        stats['synced'] += 1
                    stats['from_resources'] += 1

                except Exception as e:
                    print(f"[UnifiedContacts] Sync resource error: {e}", file=sys.stderr)
                    stats['errors'] += 1
            
            # 3. 🆕 同步 leads (發送控制台數據)
            try:
                leads = await self.db.fetch_all('''
                    SELECT * FROM leads ORDER BY timestamp DESC
                ''')
                print(f"[UnifiedContacts] Found {len(leads)} leads to sync", file=sys.stderr)
            except Exception as e:
                print(f"[UnifiedContacts] Leads table query error: {e}", file=sys.stderr)
                leads = []
            
            for lead in leads:
                try:
                    # leads 表使用 userId 欄位
                    user_id = lead.get('userId') or lead.get('user_id')
                    if not user_id:
                        continue
                    
                    telegram_id = str(user_id)
                    
                    # 構建顯示名稱
                    first_name = lead.get('firstName', '') or lead.get('first_name', '') or ''
                    last_name = lead.get('lastName', '') or lead.get('last_name', '') or ''
                    display_name = f"{first_name} {last_name}".strip() or lead.get('username') or telegram_id
                    
                    # 解析標籤
                    tags = lead.get('tags', '[]')
                    if isinstance(tags, str):
                        try:
                            tags = json.loads(tags)
                        except:
                            tags = []
                    
                    # 狀態映射：Lead狀態 → Contact狀態
                    lead_status = lead.get('status', 'New')
                    status = LEAD_STATUS_MAPPING.get(lead_status, 'new')
                    
                    # 來源信息
                    source_type = lead.get('sourceType', 'lead')
                    if source_type == 'group_extract':
                        source_type = 'member'
                    elif source_type == 'keyword_trigger':
                        source_type = 'lead'
                    else:
                        source_type = 'lead'
                    
                    source_name = lead.get('sourceChatTitle') or lead.get('sourceGroup') or '發送控制台'
                    source_id = lead.get('sourceChatId') or lead.get('campaignId')
                    
                    # 計算互動數據
                    interaction_history = lead.get('interactionHistory', [])
                    if isinstance(interaction_history, str):
                        try:
                            interaction_history = json.loads(interaction_history)
                        except:
                            interaction_history = []
                    message_count = len(interaction_history) if isinstance(interaction_history, list) else 0
                    
                    # 獲取最後聯繫時間
                    last_contact_at = None
                    if interaction_history and len(interaction_history) > 0:
                        last_interaction = interaction_history[-1] if isinstance(interaction_history, list) else None
                        if last_interaction and isinstance(last_interaction, dict):
                            last_contact_at = last_interaction.get('timestamp')
                    
                    # 嘗試插入或更新
                    existing = await self.db.fetch_one(
                        'SELECT id, source_type FROM unified_contacts WHERE telegram_id = ?',
                        (telegram_id,)
                    )
                    
                    if existing:
                        # 更新現有記錄，但保留更有價值的狀態
                        # 如果來源是 lead 且現有狀態較新，則更新
                        await self.db.execute('''
                            UPDATE unified_contacts SET
                                username = COALESCE(?, username),
                                display_name = COALESCE(?, display_name),
                                first_name = COALESCE(?, first_name),
                                last_name = COALESCE(?, last_name),
                                phone = COALESCE(?, phone),
                                source_type = CASE 
                                    WHEN source_type = 'member' THEN source_type 
                                    ELSE ? 
                                END,
                                source_id = COALESCE(?, source_id),
                                source_name = COALESCE(?, source_name),
                                status = CASE 
                                    WHEN status IN ('new', 'contacted') THEN ? 
                                    ELSE status 
                                END,
                                tags = CASE 
                                    WHEN tags = '[]' OR tags IS NULL THEN ? 
                                    ELSE tags 
                                END,
                                message_count = CASE 
                                    WHEN ? > message_count THEN ? 
                                    ELSE message_count 
                                END,
                                last_contact_at = COALESCE(?, last_contact_at),
                                bio = COALESCE(?, bio),
                                updated_at = ?,
                                synced_at = ?
                            WHERE telegram_id = ?
                        ''', (
                            lead.get('username'),
                            display_name,
                            first_name,
                            last_name,
                            lead.get('phone'),
                            source_type,
                            str(source_id) if source_id else None,
                            source_name,
                            status,
                            json.dumps(tags) if isinstance(tags, list) else tags,
                            message_count,
                            message_count,
                            last_contact_at,
                            lead.get('bio'),
                            now,
                            now,
                            telegram_id
                        ))
                        stats['updated'] += 1
                    else:
                        # 插入新記錄 - 🔧 FIX: 添加 captured_at 列
                        await self.db.execute('''
                            INSERT INTO unified_contacts (
                                telegram_id, username, display_name, first_name, last_name, phone,
                                contact_type, source_type, source_id, source_name,
                                status, tags, message_count, last_contact_at, bio,
                                created_at, updated_at, synced_at, captured_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            telegram_id,
                            lead.get('username'),
                            display_name,
                            first_name,
                            last_name,
                            lead.get('phone'),
                            'user',
                            source_type,
                            str(source_id) if source_id else None,
                            source_name,
                            status,
                            json.dumps(tags) if isinstance(tags, list) else tags,
                            message_count,
                            last_contact_at,
                            lead.get('bio'),
                            lead.get('timestamp', now),
                            now,
                            now,
                            lead.get('timestamp', now)  # 🔧 FIX: captured_at
                        ))
                        stats['synced'] += 1
                    
                    stats['from_leads'] += 1
                    
                except Exception as e:
                    print(f"[UnifiedContacts] Sync lead error: {e}", file=sys.stderr)
                    stats['errors'] += 1
            
            print(f"[UnifiedContacts] Sync completed: {stats}", file=sys.stderr)
            
            # 🔧 FIX: 顯式調用 commit 確保數據被提交
            try:
                if hasattr(self.db, '_connection') and self.db._connection:
                    await self.db._connection.commit()
                    print(f"[UnifiedContacts] Explicit commit called", file=sys.stderr)
            except Exception as ce:
                print(f"[UnifiedContacts] Commit error: {ce}", file=sys.stderr)
            
            # 🔧 驗證：檢查數據是否真的寫入了
            try:
                verify_result = await self.db.fetch_one("SELECT COUNT(*) as cnt FROM unified_contacts")
                actual_count = verify_result['cnt'] if verify_result else 0
                print(f"[UnifiedContacts] VERIFY: unified_contacts now has {actual_count} records", file=sys.stderr)
                if actual_count == 0 and stats['synced'] > 0:
                    print(f"[UnifiedContacts] WARNING: synced={stats['synced']} but table is empty! Data may not have been committed.", file=sys.stderr)
            except Exception as ve:
                print(f"[UnifiedContacts] Verify error: {ve}", file=sys.stderr)
            
            return stats
            
        except Exception as e:
            print(f"[UnifiedContacts] Sync error: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            stats['errors'] += 1
            return stats
    
    async def get_contacts(
        self,
        contact_type: str = None,
        source_type: str = None,
        status: str = None,
        tags: List[str] = None,
        search: str = None,
        order_by: str = 'created_at DESC',
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[Dict], int]:
        """
        獲取聯繫人列表
        
        Returns:
            (聯繫人列表, 總數)
        """
        await self.initialize()
        
        conditions = []
        params = []
        
        if contact_type:
            conditions.append('contact_type = ?')
            params.append(contact_type)
        
        if source_type:
            conditions.append('source_type = ?')
            params.append(source_type)
        
        if status:
            conditions.append('status = ?')
            params.append(status)
        
        if tags:
            # 標籤篩選 (JSON 包含)
            tag_conditions = []
            for tag in tags:
                tag_conditions.append("tags LIKE ?")
                params.append(f'%"{tag}"%')
            conditions.append(f"({' OR '.join(tag_conditions)})")
        
        if search:
            conditions.append('''
                (display_name LIKE ? OR username LIKE ? OR telegram_id LIKE ?)
            ''')
            search_pattern = f'%{search}%'
            params.extend([search_pattern, search_pattern, search_pattern])
        
        where_clause = ''
        if conditions:
            where_clause = 'WHERE ' + ' AND '.join(conditions)
        
        # 獲取總數
        count_sql = f'SELECT COUNT(*) as total FROM unified_contacts {where_clause}'
        count_result = await self.db.fetch_one(count_sql, tuple(params))
        total = count_result['total'] if count_result else 0
        
        # 獲取數據
        sql = f'''
            SELECT * FROM unified_contacts 
            {where_clause}
            ORDER BY {order_by}
            LIMIT ? OFFSET ?
        '''
        params.extend([limit, offset])
        
        results = await self.db.fetch_all(sql, tuple(params))
        
        # 解析 JSON 欄位
        contacts = []
        for row in results:
            contact = dict(row)
            try:
                contact['tags'] = json.loads(contact.get('tags', '[]'))
            except:
                contact['tags'] = []
            try:
                contact['metadata'] = json.loads(contact.get('metadata', '{}'))
            except:
                contact['metadata'] = {}
            contacts.append(contact)
        
        return contacts, total
    
    async def get_stats(self) -> Dict[str, Any]:
        """獲取統計數據"""
        await self.initialize()
        
        try:
            # 總數
            total_result = await self.db.fetch_one('SELECT COUNT(*) as total FROM unified_contacts')
            total = total_result['total'] if total_result else 0
            
            # 按類型統計
            type_stats = await self.db.fetch_all('''
                SELECT contact_type, COUNT(*) as count FROM unified_contacts GROUP BY contact_type
            ''')
            by_type = {row['contact_type']: row['count'] for row in type_stats}
            
            # 按狀態統計
            status_stats = await self.db.fetch_all('''
                SELECT status, COUNT(*) as count FROM unified_contacts GROUP BY status
            ''')
            by_status = {row['status']: row['count'] for row in status_stats}
            
            # 按來源統計
            source_stats = await self.db.fetch_all('''
                SELECT source_type, COUNT(*) as count FROM unified_contacts GROUP BY source_type
            ''')
            by_source = {row['source_type']: row['count'] for row in source_stats}
            
            # 本週新增
            week_ago = (datetime.now() - timedelta(days=7)).isoformat()
            recent_result = await self.db.fetch_one(
                'SELECT COUNT(*) as count FROM unified_contacts WHERE created_at >= ?',
                (week_ago,)
            )
            recent_added = recent_result['count'] if recent_result else 0
            
            return {
                'total': total,
                'users': by_type.get('user', 0),
                'groups': by_type.get('group', 0),
                'channels': by_type.get('channel', 0),
                'by_status': by_status,
                'by_source': by_source,
                'recent_added': recent_added
            }
            
        except Exception as e:
            print(f"[UnifiedContacts] Get stats error: {e}", file=sys.stderr)
            return {'total': 0, 'users': 0, 'groups': 0, 'channels': 0, 'by_status': {}, 'by_source': {}, 'recent_added': 0}
    
    async def update_contact(self, telegram_id: str, updates: Dict[str, Any]) -> bool:
        """更新聯繫人"""
        await self.initialize()
        
        try:
            allowed_fields = [
                'status', 'tags', 'notes', 'ai_score', 'value_level',
                'last_contact_at', 'message_count'
            ]
            
            set_clauses = []
            params = []
            
            for field in allowed_fields:
                if field in updates:
                    set_clauses.append(f'{field} = ?')
                    value = updates[field]
                    if isinstance(value, (list, dict)):
                        value = json.dumps(value)
                    params.append(value)
            
            if not set_clauses:
                return False
            
            set_clauses.append('updated_at = ?')
            params.append(datetime.now().isoformat())
            params.append(telegram_id)
            params.append(self._owner_id())
            await self.db.execute(
                f'UPDATE unified_contacts SET {", ".join(set_clauses)} WHERE telegram_id = ? AND owner_user_id = ?',
                tuple(params)
            )
            
            return True
            
        except Exception as e:
            print(f"[UnifiedContacts] Update error: {e}", file=sys.stderr)
            return False
    
    async def add_tags(self, telegram_ids: List[str], new_tags: List[str]) -> int:
        """批量添加標籤"""
        await self.initialize()
        
        owner_id = self._owner_id()
        updated = 0
        for tid in telegram_ids:
            try:
                contact = await self.db.fetch_one(
                    'SELECT tags FROM unified_contacts WHERE telegram_id = ? AND owner_user_id = ?',
                    (tid, owner_id)
                )
                if contact:
                    try:
                        current_tags = json.loads(contact.get('tags', '[]'))
                    except:
                        current_tags = []
                    merged_tags = list(set(current_tags + new_tags))
                    await self.db.execute(
                        'UPDATE unified_contacts SET tags = ?, updated_at = ? WHERE telegram_id = ? AND owner_user_id = ?',
                        (json.dumps(merged_tags), datetime.now().isoformat(), tid, owner_id)
                    )
                    updated += 1
            except Exception as e:
                print(f"[UnifiedContacts] Add tags error for {tid}: {e}", file=sys.stderr)
        
        return updated
    
    async def update_status(self, telegram_ids: List[str], new_status: str) -> int:
        """批量更新狀態"""
        await self.initialize()
        
        if new_status not in CONTACT_STATUS:
            return 0
        
        try:
            owner_id = self._owner_id()
            placeholders = ','.join(['?' for _ in telegram_ids])
            await self.db.execute(
                f'UPDATE unified_contacts SET status = ?, updated_at = ? WHERE telegram_id IN ({placeholders}) AND owner_user_id = ?',
                (new_status, datetime.now().isoformat(), *telegram_ids, owner_id)
            )
            return len(telegram_ids)
        except Exception as e:
            print(f"[UnifiedContacts] Update status error: {e}", file=sys.stderr)
            return 0
    
    async def delete_contacts(self, telegram_ids: List[str]) -> Dict[str, int]:
        """
        批量刪除聯繫人
        同時刪除 unified_contacts 和 extracted_members 表中的數據
        確保資源中心和發送控制台數據一致
        """
        await self.initialize()
        
        result = {
            'unified_deleted': 0,
            'leads_deleted': 0
        }
        
        try:
            if not telegram_ids:
                return result
                
            placeholders = ','.join(['?' for _ in telegram_ids])
            owner_id = self._owner_id()
            await self.db.execute(
                f'DELETE FROM unified_contacts WHERE telegram_id IN ({placeholders}) AND owner_user_id = ?',
                (*telegram_ids, owner_id)
            )
            result['unified_deleted'] = len(telegram_ids)
            
            # 2. 同時刪除 extracted_members 表（發送控制台數據源）
            # extracted_members 使用 user_id 字段存儲 telegram_id
            await self.db.execute(
                f'DELETE FROM extracted_members WHERE user_id IN ({placeholders})',
                tuple(telegram_ids)
            )
            result['leads_deleted'] = len(telegram_ids)
            
            print(f"[UnifiedContacts] Deleted {result['unified_deleted']} from unified_contacts, {result['leads_deleted']} from extracted_members", file=sys.stderr)
            
            return result
        except Exception as e:
            print(f"[UnifiedContacts] Delete error: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()
            return result
    
    async def get_contact_by_id(self, telegram_id: str) -> Optional[Dict]:
        """根據 telegram_id 獲取聯繫人"""
        await self.initialize()
        
        try:
            result = await self.db.fetch_one(
                'SELECT * FROM unified_contacts WHERE telegram_id = ?',
                (telegram_id,)
            )
            if result:
                contact = dict(result)
                try:
                    contact['tags'] = json.loads(contact.get('tags', '[]'))
                except:
                    contact['tags'] = []
                return contact
            return None
        except Exception as e:
            print(f"[UnifiedContacts] Get by id error: {e}", file=sys.stderr)
            return None
    
    # ==================== 🆕 雙向同步方法 ====================
    
    async def sync_status_to_leads(self, telegram_ids: List[str], contact_status: str) -> int:
        """
        將資源中心的狀態同步到發送控制台 (leads 表)
        
        Args:
            telegram_ids: 要同步的 telegram_id 列表
            contact_status: 資源中心的狀態
        
        Returns:
            更新的記錄數
        """
        try:
            # 將 Contact 狀態轉換為 Lead 狀態
            lead_status = CONTACT_STATUS_TO_LEAD.get(contact_status)
            if not lead_status:
                print(f"[UnifiedContacts] Unknown contact status: {contact_status}", file=sys.stderr)
                return 0
            
            updated = 0
            for tid in telegram_ids:
                try:
                    # 更新 leads 表
                    await self.db.execute('''
                        UPDATE leads SET status = ? WHERE userId = ? OR CAST(userId AS TEXT) = ?
                    ''', (lead_status, tid, tid))
                    updated += 1
                except Exception as e:
                    print(f"[UnifiedContacts] Sync to leads error for {tid}: {e}", file=sys.stderr)
            
            print(f"[UnifiedContacts] Synced {updated} contacts status to leads: {contact_status} -> {lead_status}", file=sys.stderr)
            return updated
            
        except Exception as e:
            print(f"[UnifiedContacts] Sync to leads error: {e}", file=sys.stderr)
            return 0
    
    async def sync_from_lead(self, lead_data: Dict[str, Any]) -> bool:
        """
        單筆同步：從 leads 表同步到 unified_contacts
        當發送控制台有新 lead 時調用
        
        Args:
            lead_data: Lead 數據
        
        Returns:
            是否成功
        """
        await self.initialize()
        now = datetime.now().isoformat()
        
        try:
            user_id = lead_data.get('userId') or lead_data.get('user_id')
            if not user_id:
                return False
            
            telegram_id = str(user_id)
            
            first_name = lead_data.get('firstName', '') or ''
            last_name = lead_data.get('lastName', '') or ''
            display_name = f"{first_name} {last_name}".strip() or lead_data.get('username') or telegram_id
            
            lead_status = lead_data.get('status', 'New')
            status = LEAD_STATUS_MAPPING.get(lead_status, 'new')
            
            existing = await self.db.fetch_one(
                'SELECT id FROM unified_contacts WHERE telegram_id = ?',
                (telegram_id,)
            )
            
            if existing:
                await self.db.execute('''
                    UPDATE unified_contacts SET
                        username = COALESCE(?, username),
                        display_name = COALESCE(?, display_name),
                        status = ?,
                        updated_at = ?,
                        synced_at = ?
                    WHERE telegram_id = ?
                ''', (
                    lead_data.get('username'),
                    display_name,
                    status,
                    now,
                    now,
                    telegram_id
                ))
            else:
                # 🔧 FIX: 添加 captured_at 列
                await self.db.execute('''
                    INSERT INTO unified_contacts (
                        telegram_id, username, display_name, first_name, last_name,
                        contact_type, source_type, status,
                        created_at, updated_at, synced_at, captured_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    telegram_id,
                    lead_data.get('username'),
                    display_name,
                    first_name,
                    last_name,
                    'user',
                    'lead',
                    status,
                    now,
                    now,
                    now,
                    now  # 🔧 FIX: captured_at
                ))
            
            return True
            
        except Exception as e:
            print(f"[UnifiedContacts] Sync from lead error: {e}", file=sys.stderr)
            return False
    
    async def sync_members_batch(self, members: List[Dict], source_chat_id: str = '', source_chat_title: str = '') -> Dict[str, int]:
        """
        🆕 Phase3: 增量同步 — 只同步剛提取的成員到 unified_contacts
        比 sync_from_sources() 快 10-100 倍（不掃描全表）
        
        Args:
            members: 提取到的成員列表
            source_chat_id: 來源群組 ID
            source_chat_title: 來源群組名稱
            
        Returns:
            {new: int, updated: int, duplicate: int, errors: int}
        """
        await self.initialize()
        stats = {'new': 0, 'updated': 0, 'duplicate': 0, 'errors': 0}
        now = datetime.now().isoformat()
        
        for member in members:
            try:
                telegram_id = str(member.get('user_id', '') or member.get('telegram_id', ''))
                if not telegram_id:
                    continue
                
                first_name = (member.get('first_name', '') or '')
                last_name = (member.get('last_name', '') or '')
                display_name = f"{first_name} {last_name}".strip() or member.get('username') or telegram_id
                
                tags = member.get('tags', '[]')
                if isinstance(tags, list):
                    tags = json.dumps(tags)
                
                # 查找已有記錄
                existing = await self.db.fetch_one(
                    'SELECT id, updated_at FROM unified_contacts WHERE telegram_id = ?',
                    (telegram_id,)
                )
                
                if existing:
                    # 更新現有記錄（僅更新活躍度和最後在線時間等動態字段）
                    await self.db.execute('''
                        UPDATE unified_contacts SET
                            username = COALESCE(?, username),
                            display_name = COALESCE(?, display_name),
                            first_name = COALESCE(NULLIF(?, ''), first_name),
                            last_name = COALESCE(NULLIF(?, ''), last_name),
                            source_id = COALESCE(?, source_id),
                            source_name = COALESCE(?, source_name),
                            is_bot = ?,
                            is_premium = ?,
                            last_seen = COALESCE(?, last_seen),
                            updated_at = ?,
                            synced_at = ?
                        WHERE telegram_id = ?
                    ''', (
                        member.get('username'),
                        display_name,
                        first_name,
                        last_name,
                        source_chat_id or member.get('source_chat_id'),
                        source_chat_title or member.get('source_chat_title'),
                        member.get('is_bot', 0),
                        member.get('is_premium', 0),
                        member.get('last_online'),
                        now, now,
                        telegram_id
                    ))
                    stats['updated'] += 1
                else:
                    # 插入新聯繫人
                    await self.db.execute('''
                        INSERT INTO unified_contacts (
                            telegram_id, username, display_name, first_name, last_name,
                            contact_type, source_type, source_id, source_name,
                            status, tags, activity_score, value_level,
                            is_bot, is_premium, is_verified, last_seen,
                            created_at, updated_at, synced_at, captured_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        telegram_id,
                        member.get('username'),
                        display_name,
                        first_name, last_name,
                        'user', 'member',
                        source_chat_id or member.get('source_chat_id'),
                        source_chat_title or member.get('source_chat_title'),
                        'new',
                        tags,
                        member.get('activity_score', 0.5),
                        member.get('value_level', 'C'),
                        member.get('is_bot', 0),
                        member.get('is_premium', 0),
                        member.get('is_verified', 0),
                        member.get('last_online'),
                        now, now, now, now
                    ))
                    stats['new'] += 1
                    
            except Exception as e:
                stats['errors'] += 1
                if stats['errors'] <= 3:
                    print(f"[UnifiedContacts] sync_members_batch error: {e}", file=sys.stderr)
        
        stats['duplicate'] = len(members) - stats['new'] - stats['updated'] - stats['errors']
        if stats['duplicate'] < 0:
            stats['duplicate'] = 0
            
        print(f"[UnifiedContacts] sync_members_batch: {stats}", file=sys.stderr)
        return stats

    async def update_status_with_sync(self, telegram_ids: List[str], new_status: str, sync_to_leads: bool = True) -> Dict[str, int]:
        """
        更新狀態並同步到 leads 表
        
        Args:
            telegram_ids: telegram_id 列表
            new_status: 新狀態
            sync_to_leads: 是否同步到 leads 表
        
        Returns:
            {contacts_updated: int, leads_updated: int}
        """
        result = {'contacts_updated': 0, 'leads_updated': 0}
        
        # 更新 unified_contacts
        contacts_updated = await self.update_status(telegram_ids, new_status)
        result['contacts_updated'] = contacts_updated
        
        # 同步到 leads 表
        if sync_to_leads:
            leads_updated = await self.sync_status_to_leads(telegram_ids, new_status)
            result['leads_updated'] = leads_updated
        
        return result


# 全局實例（需要在初始化時設置 db）
unified_contacts_manager: Optional[UnifiedContactsManager] = None


def get_unified_contacts_manager(db) -> UnifiedContactsManager:
    """獲取或創建統一聯繫人管理器實例"""
    global unified_contacts_manager
    if unified_contacts_manager is None:
        unified_contacts_manager = UnifiedContactsManager(db)
    return unified_contacts_manager
