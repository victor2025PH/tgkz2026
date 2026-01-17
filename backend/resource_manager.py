"""
資料庫管理器 - 後端資源管理
Resource Manager for Backend

功能:
1. 資源CRUD操作
2. 群組成員提取
3. 標籤管理
4. 數據導入導出
"""

import asyncio
import json
import csv
import io
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class ResourceManager:
    """資源管理器"""
    
    def __init__(self, database):
        self.db = database
        self._extraction_tasks: Dict[str, dict] = {}
        self._extraction_cancel_flags: Dict[str, bool] = {}
    
    async def init_tables(self):
        """初始化資源表"""
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS resources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                telegram_id TEXT NOT NULL UNIQUE,
                username TEXT,
                display_name TEXT,
                first_name TEXT,
                last_name TEXT,
                phone TEXT,
                avatar_url TEXT,
                bio TEXT,
                source_type TEXT,
                source_id TEXT,
                source_name TEXT,
                tags TEXT DEFAULT '[]',
                status TEXT DEFAULT 'new',
                is_online INTEGER DEFAULT 0,
                last_seen TEXT,
                message_count INTEGER DEFAULT 0,
                last_contact_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT DEFAULT '{}'
            )
        """)
        
        # 創建索引
        await self.db.execute("""
            CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type)
        """)
        await self.db.execute("""
            CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status)
        """)
        await self.db.execute("""
            CREATE INDEX IF NOT EXISTS idx_resources_source ON resources(source_id, source_type)
        """)
        await self.db.execute("""
            CREATE INDEX IF NOT EXISTS idx_resources_created ON resources(created_at DESC)
        """)
        
        # 標籤表
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS resource_tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                color TEXT DEFAULT '#06b6d4',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 插入默認標籤
        default_tags = [
            ('高意向', '#10b981'),
            ('待跟進', '#f59e0b'),
            ('已成交', '#22c55e'),
            ('流失風險', '#ef4444'),
            ('VIP', '#8b5cf6'),
            ('新發現', '#3b82f6'),
            ('已聯繫', '#06b6d4'),
            ('需要報價', '#f97316'),
            ('技術諮詢', '#6366f1')
        ]
        
        for name, color in default_tags:
            await self.db.execute("""
                INSERT OR IGNORE INTO resource_tags (name, color) VALUES (?, ?)
            """, (name, color))
        
        await self.db.commit()
        logger.info("Resource tables initialized")
    
    # ========== 資源CRUD ==========
    
    async def get_resources(
        self,
        filter: Optional[Dict] = None,
        limit: int = 1000,
        offset: int = 0
    ) -> List[Dict]:
        """獲取資源列表"""
        query = "SELECT * FROM resources WHERE 1=1"
        params = []
        
        if filter:
            if filter.get('type'):
                query += " AND type = ?"
                params.append(filter['type'])
            
            if filter.get('status'):
                if isinstance(filter['status'], list):
                    placeholders = ','.join(['?' for _ in filter['status']])
                    query += f" AND status IN ({placeholders})"
                    params.extend(filter['status'])
                else:
                    query += " AND status = ?"
                    params.append(filter['status'])
            
            if filter.get('source_id'):
                query += " AND source_id = ?"
                params.append(filter['source_id'])
            
            if filter.get('search'):
                search = f"%{filter['search']}%"
                query += " AND (display_name LIKE ? OR username LIKE ? OR telegram_id LIKE ?)"
                params.extend([search, search, search])
            
            if filter.get('tags'):
                # JSON 標籤搜索
                for tag in filter['tags']:
                    query += " AND tags LIKE ?"
                    params.append(f'%"{tag}"%')
        
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        cursor = await self.db.execute(query, params)
        rows = await cursor.fetchall()
        
        resources = []
        for row in rows:
            resource = dict(row)
            resource['tags'] = json.loads(resource.get('tags', '[]'))
            resource['metadata'] = json.loads(resource.get('metadata', '{}'))
            resources.append(resource)
        
        return resources
    
    async def get_resource_by_id(self, resource_id: int) -> Optional[Dict]:
        """根據ID獲取資源"""
        cursor = await self.db.execute(
            "SELECT * FROM resources WHERE id = ?",
            (resource_id,)
        )
        row = await cursor.fetchone()
        if row:
            resource = dict(row)
            resource['tags'] = json.loads(resource.get('tags', '[]'))
            resource['metadata'] = json.loads(resource.get('metadata', '{}'))
            return resource
        return None
    
    async def get_resource_by_telegram_id(self, telegram_id: str) -> Optional[Dict]:
        """根據Telegram ID獲取資源"""
        cursor = await self.db.execute(
            "SELECT * FROM resources WHERE telegram_id = ?",
            (telegram_id,)
        )
        row = await cursor.fetchone()
        if row:
            resource = dict(row)
            resource['tags'] = json.loads(resource.get('tags', '[]'))
            resource['metadata'] = json.loads(resource.get('metadata', '{}'))
            return resource
        return None
    
    async def add_resource(self, resource: Dict) -> int:
        """添加資源"""
        now = datetime.now().isoformat()
        
        cursor = await self.db.execute("""
            INSERT INTO resources (
                type, telegram_id, username, display_name, first_name, last_name,
                phone, avatar_url, bio, source_type, source_id, source_name,
                tags, status, is_online, last_seen, created_at, updated_at, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            resource.get('type', 'user'),
            resource['telegram_id'],
            resource.get('username'),
            resource.get('display_name', ''),
            resource.get('first_name'),
            resource.get('last_name'),
            resource.get('phone'),
            resource.get('avatar_url'),
            resource.get('bio'),
            resource.get('source_type', 'manual'),
            resource.get('source_id'),
            resource.get('source_name'),
            json.dumps(resource.get('tags', [])),
            resource.get('status', 'new'),
            1 if resource.get('is_online') else 0,
            resource.get('last_seen'),
            now,
            now,
            json.dumps(resource.get('metadata', {}))
        ))
        
        await self.db.commit()
        return cursor.lastrowid
    
    async def add_resources_batch(self, resources: List[Dict]) -> Dict:
        """批量添加資源"""
        added = 0
        skipped = 0
        errors = 0
        
        for resource in resources:
            try:
                # 檢查是否已存在
                existing = await self.get_resource_by_telegram_id(resource['telegram_id'])
                if existing:
                    skipped += 1
                    continue
                
                await self.add_resource(resource)
                added += 1
            except Exception as e:
                logger.error(f"Error adding resource: {e}")
                errors += 1
        
        return {
            'added': added,
            'skipped': skipped,
            'errors': errors
        }
    
    async def update_resource(self, resource_id: int, updates: Dict) -> bool:
        """更新資源"""
        if not updates:
            return False
        
        # 處理特殊字段
        if 'tags' in updates:
            updates['tags'] = json.dumps(updates['tags'])
        if 'metadata' in updates:
            updates['metadata'] = json.dumps(updates['metadata'])
        
        updates['updated_at'] = datetime.now().isoformat()
        
        set_clause = ', '.join([f"{k} = ?" for k in updates.keys()])
        values = list(updates.values()) + [resource_id]
        
        await self.db.execute(
            f"UPDATE resources SET {set_clause} WHERE id = ?",
            values
        )
        await self.db.commit()
        return True
    
    async def update_resources_batch(self, ids: List[int], updates: Dict) -> int:
        """批量更新資源"""
        if not ids or not updates:
            return 0
        
        # 處理特殊字段
        if 'tags' in updates:
            updates['tags'] = json.dumps(updates['tags'])
        if 'metadata' in updates:
            updates['metadata'] = json.dumps(updates['metadata'])
        
        updates['updated_at'] = datetime.now().isoformat()
        
        set_clause = ', '.join([f"{k} = ?" for k in updates.keys()])
        placeholders = ','.join(['?' for _ in ids])
        values = list(updates.values()) + ids
        
        cursor = await self.db.execute(
            f"UPDATE resources SET {set_clause} WHERE id IN ({placeholders})",
            values
        )
        await self.db.commit()
        return cursor.rowcount
    
    async def delete_resource(self, resource_id: int) -> bool:
        """刪除資源"""
        await self.db.execute(
            "DELETE FROM resources WHERE id = ?",
            (resource_id,)
        )
        await self.db.commit()
        return True
    
    async def delete_resources_batch(self, ids: List[int]) -> int:
        """批量刪除資源"""
        if not ids:
            return 0
        
        placeholders = ','.join(['?' for _ in ids])
        cursor = await self.db.execute(
            f"DELETE FROM resources WHERE id IN ({placeholders})",
            ids
        )
        await self.db.commit()
        return cursor.rowcount
    
    # ========== 標籤管理 ==========
    
    async def get_tags(self) -> List[Dict]:
        """獲取所有標籤"""
        cursor = await self.db.execute(
            "SELECT * FROM resource_tags ORDER BY name"
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
    
    async def create_tag(self, name: str, color: str = '#06b6d4') -> int:
        """創建標籤"""
        cursor = await self.db.execute(
            "INSERT OR IGNORE INTO resource_tags (name, color) VALUES (?, ?)",
            (name, color)
        )
        await self.db.commit()
        return cursor.lastrowid
    
    async def add_tags_to_resources(self, ids: List[int], tags: List[str]) -> int:
        """給資源添加標籤"""
        updated = 0
        
        for resource_id in ids:
            resource = await self.get_resource_by_id(resource_id)
            if resource:
                current_tags = resource.get('tags', [])
                new_tags = list(set(current_tags + tags))
                
                await self.db.execute(
                    "UPDATE resources SET tags = ?, updated_at = ? WHERE id = ?",
                    (json.dumps(new_tags), datetime.now().isoformat(), resource_id)
                )
                updated += 1
        
        await self.db.commit()
        return updated
    
    async def remove_tags_from_resources(self, ids: List[int], tags: List[str]) -> int:
        """從資源移除標籤"""
        tags_set = set(tags)
        updated = 0
        
        for resource_id in ids:
            resource = await self.get_resource_by_id(resource_id)
            if resource:
                current_tags = resource.get('tags', [])
                new_tags = [t for t in current_tags if t not in tags_set]
                
                await self.db.execute(
                    "UPDATE resources SET tags = ?, updated_at = ? WHERE id = ?",
                    (json.dumps(new_tags), datetime.now().isoformat(), resource_id)
                )
                updated += 1
        
        await self.db.commit()
        return updated
    
    # ========== 統計 ==========
    
    async def get_stats(self) -> Dict:
        """獲取資源統計"""
        # 總數
        cursor = await self.db.execute("SELECT COUNT(*) FROM resources")
        total = (await cursor.fetchone())[0]
        
        # 按類型統計
        cursor = await self.db.execute("""
            SELECT type, COUNT(*) as count FROM resources GROUP BY type
        """)
        type_stats = {row['type']: row['count'] for row in await cursor.fetchall()}
        
        # 按狀態統計
        cursor = await self.db.execute("""
            SELECT status, COUNT(*) as count FROM resources GROUP BY status
        """)
        status_stats = {row['status']: row['count'] for row in await cursor.fetchall()}
        
        # 最近7天新增
        week_ago = (datetime.now() - timedelta(days=7)).isoformat()
        cursor = await self.db.execute(
            "SELECT COUNT(*) FROM resources WHERE created_at >= ?",
            (week_ago,)
        )
        recent_added = (await cursor.fetchone())[0]
        
        # 按來源統計
        cursor = await self.db.execute("""
            SELECT source_name, COUNT(*) as count FROM resources 
            WHERE source_name IS NOT NULL 
            GROUP BY source_name
        """)
        source_stats = {row['source_name']: row['count'] for row in await cursor.fetchall()}
        
        return {
            'total': total,
            'users': type_stats.get('user', 0),
            'groups': type_stats.get('group', 0),
            'channels': type_stats.get('channel', 0),
            'byStatus': status_stats,
            'bySource': source_stats,
            'recentAdded': recent_added
        }
    
    # ========== 群組成員提取 ==========
    
    async def extract_group_members(
        self,
        client,
        group_id: str,
        group_name: str,
        options: Dict,
        progress_callback=None
    ) -> Dict:
        """提取群組成員"""
        task_id = f"extract_{group_id}_{datetime.now().timestamp()}"
        self._extraction_cancel_flags[task_id] = False
        
        result = {
            'task_id': task_id,
            'group_id': group_id,
            'group_name': group_name,
            'total': 0,
            'extracted': 0,
            'skipped': 0,
            'errors': 0
        }
        
        try:
            # 獲取群組成員
            members = []
            async for member in client.get_chat_members(int(group_id)):
                if self._extraction_cancel_flags.get(task_id):
                    break
                
                user = member.user
                
                # 過濾機器人
                if options.get('filter_bots', True) and user.is_bot:
                    continue
                
                # 過濾已刪除帳號
                if options.get('filter_deleted', True) and user.is_deleted:
                    continue
                
                members.append({
                    'type': 'user',
                    'telegram_id': str(user.id),
                    'username': user.username,
                    'display_name': f"{user.first_name or ''} {user.last_name or ''}".strip() or user.username or str(user.id),
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'phone': user.phone_number,
                    'source_type': 'group_member',
                    'source_id': group_id,
                    'source_name': group_name,
                    'tags': options.get('auto_tag', []),
                    'status': 'new'
                })
                
                result['total'] += 1
                
                # 定期報告進度
                if result['total'] % 100 == 0 and progress_callback:
                    await progress_callback({
                        'task_id': task_id,
                        'status': 'running',
                        'progress': 50,  # 提取中
                        'message': f"已發現 {result['total']} 個成員"
                    })
            
            # 批量添加到數據庫
            skip_existing = options.get('skip_existing', True)
            
            for member in members:
                if self._extraction_cancel_flags.get(task_id):
                    break
                
                try:
                    if skip_existing:
                        existing = await self.get_resource_by_telegram_id(member['telegram_id'])
                        if existing:
                            result['skipped'] += 1
                            continue
                    
                    await self.add_resource(member)
                    result['extracted'] += 1
                    
                except Exception as e:
                    logger.error(f"Error adding member: {e}")
                    result['errors'] += 1
            
            if progress_callback:
                await progress_callback({
                    'task_id': task_id,
                    'status': 'completed',
                    'progress': 100,
                    'result': result
                })
            
        except Exception as e:
            logger.error(f"Extraction error: {e}")
            result['error'] = str(e)
            
            if progress_callback:
                await progress_callback({
                    'task_id': task_id,
                    'status': 'failed',
                    'error': str(e)
                })
        
        finally:
            self._extraction_cancel_flags.pop(task_id, None)
        
        return result
    
    def cancel_extraction(self, task_id: str):
        """取消提取任務"""
        self._extraction_cancel_flags[task_id] = True
    
    # ========== 導入導出 ==========
    
    async def export_resources(
        self,
        format: str = 'csv',
        ids: Optional[List[int]] = None
    ) -> str:
        """導出資源"""
        if ids:
            placeholders = ','.join(['?' for _ in ids])
            cursor = await self.db.execute(
                f"SELECT * FROM resources WHERE id IN ({placeholders})",
                ids
            )
        else:
            cursor = await self.db.execute("SELECT * FROM resources")
        
        rows = await cursor.fetchall()
        
        if format == 'json':
            resources = []
            for row in rows:
                resource = dict(row)
                resource['tags'] = json.loads(resource.get('tags', '[]'))
                resource['metadata'] = json.loads(resource.get('metadata', '{}'))
                resources.append(resource)
            return json.dumps(resources, ensure_ascii=False, indent=2)
        
        else:  # CSV
            output = io.StringIO()
            if rows:
                fieldnames = rows[0].keys()
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                for row in rows:
                    writer.writerow(dict(row))
            return output.getvalue()
    
    async def import_resources(self, content: str, filename: str) -> Dict:
        """導入資源"""
        result = {'added': 0, 'skipped': 0, 'errors': 0}
        
        try:
            if filename.endswith('.json'):
                data = json.loads(content)
                if isinstance(data, list):
                    batch_result = await self.add_resources_batch(data)
                    result.update(batch_result)
            
            elif filename.endswith('.csv'):
                reader = csv.DictReader(io.StringIO(content))
                resources = []
                for row in reader:
                    # 處理標籤
                    if 'tags' in row and isinstance(row['tags'], str):
                        try:
                            row['tags'] = json.loads(row['tags'])
                        except:
                            row['tags'] = []
                    resources.append(row)
                
                batch_result = await self.add_resources_batch(resources)
                result.update(batch_result)
        
        except Exception as e:
            logger.error(f"Import error: {e}")
            result['error'] = str(e)
        
        return result


# 單例
_resource_manager: Optional[ResourceManager] = None


def get_resource_manager(database=None) -> ResourceManager:
    """獲取資源管理器單例"""
    global _resource_manager
    if _resource_manager is None and database:
        _resource_manager = ResourceManager(database)
    return _resource_manager
