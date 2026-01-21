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
    'manual': '手動添加',
    'import': '批量導入'
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
    
    async def initialize(self):
        """初始化 - 創建統一視圖表"""
        if self._initialized:
            return
        
        try:
            # 創建統一聯繫人表
            await self.db.execute('''
                CREATE TABLE IF NOT EXISTS unified_contacts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    
                    -- 核心標識
                    telegram_id TEXT UNIQUE NOT NULL,
                    username TEXT,
                    display_name TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    phone TEXT,
                    
                    -- 類型：user/group/channel
                    contact_type TEXT DEFAULT 'user',
                    
                    -- 來源信息
                    source_type TEXT DEFAULT 'member',
                    source_id TEXT,
                    source_name TEXT,
                    
                    -- 狀態和標籤
                    status TEXT DEFAULT 'new',
                    tags TEXT DEFAULT '[]',
                    
                    -- 評分
                    ai_score REAL DEFAULT 0.5,
                    activity_score REAL DEFAULT 0.5,
                    value_level TEXT DEFAULT 'C',
                    
                    -- 在線狀態
                    is_online INTEGER DEFAULT 0,
                    last_seen TIMESTAMP,
                    
                    -- 屬性
                    is_bot INTEGER DEFAULT 0,
                    is_premium INTEGER DEFAULT 0,
                    is_verified INTEGER DEFAULT 0,
                    member_count INTEGER DEFAULT 0,
                    
                    -- 互動統計
                    message_count INTEGER DEFAULT 0,
                    last_contact_at TIMESTAMP,
                    last_message_at TIMESTAMP,
                    
                    -- 元數據
                    bio TEXT,
                    notes TEXT,
                    metadata TEXT DEFAULT '{}',
                    
                    -- 時間戳
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    synced_at TIMESTAMP
                )
            ''')
            
            # 創建索引
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_unified_contacts_telegram_id 
                ON unified_contacts(telegram_id)
            ''')
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_unified_contacts_status 
                ON unified_contacts(status)
            ''')
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_unified_contacts_source_type 
                ON unified_contacts(source_type)
            ''')
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
        await self.initialize()
        
        stats = {'synced': 0, 'updated': 0, 'errors': 0, 'from_members': 0, 'from_resources': 0}
        now = datetime.now().isoformat()
        
        try:
            # 1. 同步 extracted_members (用戶)
            members = await self.db.fetch_all('''
                SELECT * FROM extracted_members ORDER BY created_at DESC
            ''')
            
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
                    
                    # 嘗試插入或更新
                    existing = await self.db.fetch_one(
                        'SELECT id FROM unified_contacts WHERE telegram_id = ?',
                        (telegram_id,)
                    )
                    
                    if existing:
                        # 更新現有記錄
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
                                synced_at = ?
                            WHERE telegram_id = ?
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
                            telegram_id
                        ))
                        stats['updated'] += 1
                    else:
                        # 插入新記錄
                        await self.db.execute('''
                            INSERT INTO unified_contacts (
                                telegram_id, username, display_name, first_name, last_name, phone,
                                contact_type, source_type, source_id, source_name,
                                status, tags, activity_score, value_level,
                                is_bot, is_premium, is_verified, last_seen,
                                created_at, updated_at, synced_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                            now
                        ))
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
                    
                    existing = await self.db.fetch_one(
                        'SELECT id FROM unified_contacts WHERE telegram_id = ?',
                        (telegram_id,)
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
                                synced_at = ?
                            WHERE telegram_id = ?
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
                            telegram_id
                        ))
                        stats['updated'] += 1
                    else:
                        await self.db.execute('''
                            INSERT INTO unified_contacts (
                                telegram_id, username, display_name,
                                contact_type, source_type, source_id, source_name,
                                status, ai_score, activity_score, member_count, bio,
                                created_at, updated_at, synced_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                            now
                        ))
                        stats['synced'] += 1
                    
                    stats['from_resources'] += 1
                    
                except Exception as e:
                    print(f"[UnifiedContacts] Sync resource error: {e}", file=sys.stderr)
                    stats['errors'] += 1
            
            print(f"[UnifiedContacts] Sync completed: {stats}", file=sys.stderr)
            return stats
            
        except Exception as e:
            print(f"[UnifiedContacts] Sync error: {e}", file=sys.stderr)
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
            
            await self.db.execute(
                f'UPDATE unified_contacts SET {", ".join(set_clauses)} WHERE telegram_id = ?',
                tuple(params)
            )
            
            return True
            
        except Exception as e:
            print(f"[UnifiedContacts] Update error: {e}", file=sys.stderr)
            return False
    
    async def add_tags(self, telegram_ids: List[str], new_tags: List[str]) -> int:
        """批量添加標籤"""
        await self.initialize()
        
        updated = 0
        for tid in telegram_ids:
            try:
                contact = await self.db.fetch_one(
                    'SELECT tags FROM unified_contacts WHERE telegram_id = ?',
                    (tid,)
                )
                if contact:
                    try:
                        current_tags = json.loads(contact.get('tags', '[]'))
                    except:
                        current_tags = []
                    
                    # 合併標籤
                    merged_tags = list(set(current_tags + new_tags))
                    
                    await self.db.execute(
                        'UPDATE unified_contacts SET tags = ?, updated_at = ? WHERE telegram_id = ?',
                        (json.dumps(merged_tags), datetime.now().isoformat(), tid)
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
            placeholders = ','.join(['?' for _ in telegram_ids])
            await self.db.execute(
                f'UPDATE unified_contacts SET status = ?, updated_at = ? WHERE telegram_id IN ({placeholders})',
                (new_status, datetime.now().isoformat(), *telegram_ids)
            )
            return len(telegram_ids)
        except Exception as e:
            print(f"[UnifiedContacts] Update status error: {e}", file=sys.stderr)
            return 0
    
    async def delete_contacts(self, telegram_ids: List[str]) -> int:
        """批量刪除聯繫人"""
        await self.initialize()
        
        try:
            placeholders = ','.join(['?' for _ in telegram_ids])
            await self.db.execute(
                f'DELETE FROM unified_contacts WHERE telegram_id IN ({placeholders})',
                tuple(telegram_ids)
            )
            return len(telegram_ids)
        except Exception as e:
            print(f"[UnifiedContacts] Delete error: {e}", file=sys.stderr)
            return 0
    
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


# 全局實例（需要在初始化時設置 db）
unified_contacts_manager: Optional[UnifiedContactsManager] = None


def get_unified_contacts_manager(db) -> UnifiedContactsManager:
    """獲取或創建統一聯繫人管理器實例"""
    global unified_contacts_manager
    if unified_contacts_manager is None:
        unified_contacts_manager = UnifiedContactsManager(db)
    return unified_contacts_manager
