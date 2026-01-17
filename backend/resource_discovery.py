"""
Resource Discovery System - 資源發現系統
自動發現和管理 Telegram 群組/頻道資源

功能：
- 關鍵詞搜索群組/頻道
- 資源評估和評分
- 自動加入隊列管理
- 資源狀態追蹤
"""
import sys
import asyncio
import json
import re
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum

from database import db


class ResourceType(Enum):
    """資源類型"""
    GROUP = "group"
    SUPERGROUP = "supergroup"
    CHANNEL = "channel"


class ResourceStatus(Enum):
    """資源狀態"""
    DISCOVERED = "discovered"      # 已發現，未加入
    QUEUED = "queued"              # 已加入隊列等待加入
    JOINING = "joining"            # 正在加入
    JOINED = "joined"              # 已加入
    MONITORING = "monitoring"      # 監控中
    LEFT = "left"                  # 已退出
    BLOCKED = "blocked"            # 被封禁/無法加入
    INVALID = "invalid"            # 無效（已刪除等）


class DiscoverySource(Enum):
    """發現來源"""
    SEARCH = "search"              # 關鍵詞搜索
    USER_TRACK = "user_track"      # 用戶追蹤
    MANUAL = "manual"              # 手動添加
    REFERRAL = "referral"          # 推薦/引薦
    COMPETITOR = "competitor"      # 競品分析


@dataclass
class DiscoveredResource:
    """發現的資源"""
    id: Optional[int] = None
    resource_type: str = "group"
    telegram_id: str = ""
    username: str = ""
    title: str = ""
    description: str = ""
    member_count: int = 0
    activity_score: float = 0.5
    relevance_score: float = 0.5
    overall_score: float = 0.5
    discovery_source: str = "search"
    discovery_keyword: str = ""
    discovered_by_phone: str = ""
    status: str = "discovered"
    is_public: bool = True
    has_discussion: bool = False
    discussion_id: str = ""
    invite_link: str = ""
    join_attempts: int = 0
    last_join_attempt: Optional[datetime] = None
    joined_at: Optional[datetime] = None
    joined_by_phone: str = ""
    tags: List[str] = field(default_factory=list)
    notes: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ResourceDiscoverySystem:
    """資源發現系統"""
    
    def __init__(self):
        self._initialized = False
        self.event_callback = None
        self._search_lock = asyncio.Lock()
        
        # 評分權重配置（優化版 v2.0）
        self.score_weights = {
            'member_count': 0.25,      # 成員數權重
            'activity': 0.20,          # 活躍度權重
            'relevance': 0.20,         # 相關度權重
            'accessibility': 0.20,     # 可達性權重（有 username/link）
            'data_quality': 0.15       # 數據質量權重
        }

        # 成員數評分區間
        self.member_score_ranges = [
            (100000, 1.0),    # 10萬+ 滿分
            (50000, 0.9),     # 5萬+
            (20000, 0.8),     # 2萬+
            (10000, 0.7),     # 1萬+
            (5000, 0.6),      # 5000+
            (1000, 0.5),      # 1000+
            (500, 0.4),       # 500+
            (100, 0.3),       # 100+
            (0, 0.2)          # 其他
        ]
    
    def set_event_callback(self, callback):
        """設置事件回調"""
        self.event_callback = callback
    
    def log(self, message: str, level: str = "info"):
        """記錄日誌"""
        formatted = f"[ResourceDiscovery] {message}"
        print(formatted, file=sys.stderr)
        if self.event_callback:
            self.event_callback("log-entry", {
                "message": formatted,
                "type": level
            })
    
    async def initialize(self):
        """初始化系統"""
        if self._initialized:
            return
        
        await db.initialize()
        self._initialized = True
        self.log("✅ 資源發現系統初始化完成")
    
    # ==================== 資源管理 ====================
    
    async def add_resource(self, resource: DiscoveredResource) -> int:
        """添加新資源"""
        await self.initialize()
        
        # 檢查是否已存在
        existing = await self.get_resource_by_telegram_id(resource.telegram_id)
        if existing:
            # 更新現有資源
            return await self.update_resource(existing['id'], resource)
        
        # 計算評分
        resource.overall_score = self._calculate_overall_score(resource)
        
        query = """
            INSERT INTO discovered_resources (
                resource_type, telegram_id, username, title, description,
                member_count, activity_score, relevance_score, overall_score,
                discovery_source, discovery_keyword, discovered_by_phone,
                status, is_public, has_discussion, discussion_id, invite_link,
                tags, notes, metadata, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        now = datetime.now().isoformat()
        params = (
            resource.resource_type,
            resource.telegram_id,
            resource.username,
            resource.title,
            resource.description,
            resource.member_count,
            resource.activity_score,
            resource.relevance_score,
            resource.overall_score,
            resource.discovery_source,
            resource.discovery_keyword,
            resource.discovered_by_phone,
            resource.status,
            1 if resource.is_public else 0,
            1 if resource.has_discussion else 0,
            resource.discussion_id,
            resource.invite_link,
            json.dumps(resource.tags),
            resource.notes,
            json.dumps(resource.metadata),
            now,
            now
        )
        
        resource_id = await db.execute(query, params)
        
        self.log(f"➕ 新增資源: {resource.title} ({resource.telegram_id})")
        return resource_id
    
    async def update_resource(self, resource_id: int, resource: DiscoveredResource) -> int:
        """更新資源"""
        resource.overall_score = self._calculate_overall_score(resource)
        
        query = """
            UPDATE discovered_resources SET
                resource_type = ?, username = ?, title = ?, description = ?,
                member_count = ?, activity_score = ?, relevance_score = ?, overall_score = ?,
                is_public = ?, has_discussion = ?, discussion_id = ?,
                tags = ?, notes = ?, metadata = ?, updated_at = ?
            WHERE id = ?
        """
        
        params = (
            resource.resource_type,
            resource.username,
            resource.title,
            resource.description,
            resource.member_count,
            resource.activity_score,
            resource.relevance_score,
            resource.overall_score,
            1 if resource.is_public else 0,
            1 if resource.has_discussion else 0,
            resource.discussion_id,
            json.dumps(resource.tags),
            resource.notes,
            json.dumps(resource.metadata),
            datetime.now().isoformat(),
            resource_id
        )
        
        await db.execute(query, params)
        self.log(f"📝 更新資源: {resource.title}")
        return resource_id
    
    async def update_resource_status(self, resource_id: int, status: str, 
                                     error_code: str = None, error_message: str = None):
        """更新資源狀態"""
        query = """
            UPDATE discovered_resources SET
                status = ?, error_code = ?, error_message = ?, updated_at = ?
            WHERE id = ?
        """
        await db.execute(query, (status, error_code, error_message, 
                                 datetime.now().isoformat(), resource_id))
    
    async def mark_as_joined(self, resource_id: int, phone: str):
        """標記資源為已加入"""
        query = """
            UPDATE discovered_resources SET
                status = 'joined', joined_at = ?, joined_by_phone = ?, updated_at = ?
            WHERE id = ?
        """
        now = datetime.now().isoformat()
        await db.execute(query, (now, phone, now, resource_id))
        self.log(f"✅ 資源已加入: ID={resource_id}, Phone={phone}")
    
    async def mark_join_attempt(self, resource_id: int, success: bool, 
                                error_code: str = None, error_message: str = None):
        """記錄加入嘗試"""
        query = """
            UPDATE discovered_resources SET
                join_attempts = join_attempts + 1,
                last_join_attempt = ?,
                error_code = ?,
                error_message = ?,
                status = ?,
                updated_at = ?
            WHERE id = ?
        """
        now = datetime.now().isoformat()
        status = 'joined' if success else 'discovered'
        if error_code in ['USER_BANNED', 'INVITE_INVALID', 'INVITE_EXPIRED']:
            status = 'blocked'
        
        await db.execute(query, (now, error_code, error_message, status, now, resource_id))
    
    async def get_resource_by_telegram_id(self, telegram_id: str) -> Optional[Dict]:
        """通過 Telegram ID 獲取資源"""
        query = "SELECT * FROM discovered_resources WHERE telegram_id = ?"
        result = await db.fetch_one(query, (telegram_id,))
        if result:
            return self._row_to_dict(result)
        return None
    
    async def get_resource_by_id(self, resource_id: int) -> Optional[Dict]:
        """通過 ID 獲取資源"""
        query = "SELECT * FROM discovered_resources WHERE id = ?"
        result = await db.fetch_one(query, (resource_id,))
        if result:
            return self._row_to_dict(result)
        return None
    
    async def list_resources(self, status: str = None, resource_type: str = None,
                            limit: int = 50, offset: int = 0,
                            order_by: str = "overall_score DESC") -> List[Dict]:
        """列出資源（只返回有公開鏈接的資源）"""
        conditions = []
        params = []
        
        # 只返回有公開鏈接的資源（username 或 invite_link 不為空）
        conditions.append("(username IS NOT NULL AND username != '' OR invite_link IS NOT NULL AND invite_link != '')")
        
        if status:
            conditions.append("status = ?")
            params.append(status)
        
        if resource_type:
            conditions.append("resource_type = ?")
            params.append(resource_type)
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        query = f"""
            SELECT * FROM discovered_resources 
            WHERE {where_clause}
            ORDER BY {order_by}
            LIMIT ? OFFSET ?
        """
        params.extend([limit, offset])
        
        results = await db.fetch_all(query, tuple(params))
        return [self._row_to_dict(r) for r in results]
    
    async def count_resources(self, status: str = None, resource_type: str = None) -> int:
        """統計資源數量（只統計有公開鏈接的資源）"""
        conditions = []
        params = []
        
        # 只統計有公開鏈接的資源
        conditions.append("(username IS NOT NULL AND username != '' OR invite_link IS NOT NULL AND invite_link != '')")
        
        if status:
            conditions.append("status = ?")
            params.append(status)
        
        if resource_type:
            conditions.append("resource_type = ?")
            params.append(resource_type)
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        query = f"SELECT COUNT(*) as count FROM discovered_resources WHERE {where_clause}"
        result = await db.fetch_one(query, tuple(params))
        return result['count'] if result else 0
    
    async def delete_resource(self, resource_id: int):
        """刪除資源"""
        await db.execute("DELETE FROM discovered_resources WHERE id = ?", (resource_id,))
        self.log(f"🗑️ 刪除資源: ID={resource_id}")
    
    async def clear_all_resources(self) -> int:
        """清空所有搜索結果資源"""
        # 獲取當前數量
        result = await db.fetch_one("SELECT COUNT(*) as count FROM discovered_resources")
        count = result['count'] if result else 0
        
        # 刪除所有資源
        await db.execute("DELETE FROM discovered_resources")
        self.log(f"🗑️ 已清空所有資源，共 {count} 條")
        return count
    
    # ==================== 評分系統 ====================
    
    def _calculate_overall_score(self, resource: DiscoveredResource) -> float:
        """
        計算綜合評分 v2.0
        
        評分維度：
        1. 成員數 (25%) - 群組規模
        2. 活躍度 (20%) - 日消息數/在線率
        3. 相關度 (20%) - 關鍵詞匹配度
        4. 可達性 (20%) - 是否有公開鏈接
        5. 數據質量 (15%) - 信息完整度
        """
        # 1. 成員數評分
        member_score = 0.2
        for threshold, score in self.member_score_ranges:
            if resource.member_count >= threshold:
                member_score = score
                break
        
        # 2. 活躍度評分（如果有真實數據則用，否則根據成員數估算）
        activity_score = resource.activity_score
        if activity_score == 0.5:  # 默認值，需要估算
            # 根據成員數粗略估算活躍度（大群組通常更活躍）
            if resource.member_count >= 50000:
                activity_score = 0.75
            elif resource.member_count >= 10000:
                activity_score = 0.65
            elif resource.member_count >= 1000:
                activity_score = 0.55
            else:
                activity_score = 0.45
        
        # 3. 相關度評分
        relevance_score = resource.relevance_score
        
        # 4. 可達性評分（有 username 或 invite_link）
        accessibility_score = 0.3  # 基礎分
        if resource.username:
            accessibility_score = 1.0  # 有公開 username
        elif hasattr(resource, 'invite_link') and resource.invite_link:
            accessibility_score = 0.9  # 有邀請鏈接
        elif resource.telegram_id:
            accessibility_score = 0.5  # 只有 ID
        
        # 5. 數據質量評分（信息完整度）
        data_quality_score = 0.3  # 基礎分
        if resource.title and len(resource.title) > 3:
            data_quality_score += 0.2
        if resource.description and len(resource.description) > 10:
            data_quality_score += 0.2
        if resource.username:
            data_quality_score += 0.15
        if resource.member_count > 0:
            data_quality_score += 0.15
        data_quality_score = min(1.0, data_quality_score)
        
        # 計算加權總分
        overall = (
            member_score * self.score_weights['member_count'] +
            activity_score * self.score_weights['activity'] +
            relevance_score * self.score_weights['relevance'] +
            accessibility_score * self.score_weights['accessibility'] +
            data_quality_score * self.score_weights['data_quality']
        )
        
        return round(min(1.0, max(0.0, overall)), 3)
    
    def calculate_relevance_score(self, title: str, description: str, 
                                  keywords: List[str]) -> float:
        """計算相關度評分"""
        if not keywords:
            return 0.5
        
        text = f"{title} {description}".lower()
        matches = 0
        
        for keyword in keywords:
            if keyword.lower() in text:
                matches += 1
        
        # 基礎分 0.3，每匹配一個關鍵詞加 0.1，最高 1.0
        score = 0.3 + (matches * 0.1)
        return min(1.0, score)
    
    async def recalculate_scores(self, resource_id: int = None):
        """重新計算評分（使用完整資源信息）"""
        if resource_id:
            resources = [await self.get_resource_by_id(resource_id)]
        else:
            resources = await self.list_resources(limit=10000)
        
        for res in resources:
            if not res:
                continue
            
            # 使用完整資源信息計算評分
            resource = DiscoveredResource(
                member_count=res.get('member_count', 0),
                activity_score=res.get('activity_score', 0.5),
                relevance_score=res.get('relevance_score', 0.5),
                username=res.get('username', ''),
                title=res.get('title', ''),
                description=res.get('description', ''),
                telegram_id=res.get('telegram_id', ''),
                invite_link=res.get('invite_link', '')
            )
            new_score = self._calculate_overall_score(resource)
            
            await db.execute(
                "UPDATE discovered_resources SET overall_score = ?, updated_at = ? WHERE id = ?",
                (new_score, datetime.now().isoformat(), res['id'])
            )
        
        self.log(f"🔄 重新計算了 {len(resources)} 個資源的評分")
    
    # ==================== 搜索關鍵詞管理 ====================
    
    async def add_search_keyword(self, keyword: str, category: str = "general", 
                                 priority: int = 5) -> int:
        """添加搜索關鍵詞"""
        query = """
            INSERT OR IGNORE INTO discovery_keywords (keyword, category, priority, created_at)
            VALUES (?, ?, ?, ?)
        """
        keyword_id = await db.execute(query, (keyword, category, priority, datetime.now().isoformat()))
        return keyword_id
    
    async def get_search_keywords(self, category: str = None, 
                                  active_only: bool = True) -> List[Dict]:
        """獲取搜索關鍵詞列表"""
        conditions = []
        params = []
        
        if category:
            conditions.append("category = ?")
            params.append(category)
        
        if active_only:
            conditions.append("is_active = 1")
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        query = f"""
            SELECT * FROM discovery_keywords 
            WHERE {where_clause}
            ORDER BY priority DESC, keyword
        """
        
        results = await db.fetch_all(query, tuple(params))
        return [dict(r) for r in results]
    
    async def update_keyword_stats(self, keyword_id: int, found_count: int):
        """更新關鍵詞統計"""
        query = """
            UPDATE discovery_keywords SET
                last_searched_at = ?,
                total_found = total_found + ?
            WHERE id = ?
        """
        await db.execute(query, (datetime.now().isoformat(), found_count, keyword_id))
    
    # ==================== 加入隊列管理 ====================
    
    async def add_to_join_queue(self, resource_id: int, priority: int = 5,
                                assigned_phone: str = None, 
                                scheduled_at: datetime = None) -> int:
        """添加到加入隊列"""
        # 檢查是否已在隊列中
        existing = await db.fetch_one(
            "SELECT id FROM resource_join_queue WHERE resource_id = ? AND status = 'pending'",
            (resource_id,)
        )
        if existing:
            return existing['id']
        
        query = """
            INSERT INTO resource_join_queue (
                resource_id, assigned_phone, priority, status, scheduled_at, created_at
            ) VALUES (?, ?, ?, 'pending', ?, ?)
        """
        
        scheduled = scheduled_at.isoformat() if scheduled_at else None
        queue_id = await db.execute(query, (
            resource_id, assigned_phone, priority, scheduled, datetime.now().isoformat()
        ))
        
        # 更新資源狀態
        await self.update_resource_status(resource_id, 'queued')
        
        return queue_id
    
    async def get_pending_joins(self, limit: int = 10, 
                                phone: str = None) -> List[Dict]:
        """獲取待加入的資源"""
        conditions = ["q.status = 'pending'"]
        params = []
        
        if phone:
            conditions.append("(q.assigned_phone = ? OR q.assigned_phone IS NULL)")
            params.append(phone)
        
        # 只獲取計劃時間已到的
        conditions.append("(q.scheduled_at IS NULL OR q.scheduled_at <= ?)")
        params.append(datetime.now().isoformat())
        
        where_clause = " AND ".join(conditions)
        
        query = f"""
            SELECT q.*, r.telegram_id, r.username, r.title, r.resource_type, 
                   r.invite_link, r.is_public
            FROM resource_join_queue q
            JOIN discovered_resources r ON q.resource_id = r.id
            WHERE {where_clause}
            ORDER BY q.priority DESC, q.created_at ASC
            LIMIT ?
        """
        params.append(limit)
        
        results = await db.fetch_all(query, tuple(params))
        return [dict(r) for r in results]
    
    async def update_queue_status(self, queue_id: int, status: str, 
                                  error_message: str = None):
        """更新隊列項狀態"""
        now = datetime.now().isoformat()
        
        if status == 'completed':
            query = "UPDATE resource_join_queue SET status = ?, completed_at = ? WHERE id = ?"
            await db.execute(query, (status, now, queue_id))
        elif status == 'failed':
            query = "UPDATE resource_join_queue SET status = ?, error_message = ? WHERE id = ?"
            await db.execute(query, (status, error_message, queue_id))
        else:
            query = "UPDATE resource_join_queue SET status = ?, attempted_at = ? WHERE id = ?"
            await db.execute(query, (status, now, queue_id))
    
    # ==================== 日誌記錄 ====================
    
    async def log_discovery(self, search_type: str, search_query: str,
                           account_phone: str, found: int, new: int,
                           updated: int = 0, duration_ms: int = 0,
                           status: str = "completed", error_message: str = None):
        """記錄搜索日誌"""
        query = """
            INSERT INTO discovery_logs (
                search_type, search_query, account_phone, resources_found,
                resources_new, resources_updated, duration_ms, status,
                error_message, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        await db.execute(query, (
            search_type, search_query, account_phone, found, new, updated,
            duration_ms, status, error_message, datetime.now().isoformat()
        ))
    
    async def get_discovery_logs(self, limit: int = 50) -> List[Dict]:
        """獲取搜索日誌"""
        query = """
            SELECT * FROM discovery_logs
            ORDER BY created_at DESC
            LIMIT ?
        """
        results = await db.fetch_all(query, (limit,))
        return [dict(r) for r in results]
    
    # ==================== 統計 ====================
    
    async def get_statistics(self) -> Dict[str, Any]:
        """獲取統計信息"""
        stats = {
            'total_resources': 0,
            'by_status': {},
            'by_type': {},
            'today_discovered': 0,
            'pending_joins': 0,
            'joined_count': 0,
            'avg_score': 0
        }
        
        # 總數和按狀態分類
        query = """
            SELECT status, COUNT(*) as count FROM discovered_resources GROUP BY status
        """
        results = await db.fetch_all(query)
        for row in results:
            stats['by_status'][row['status']] = row['count']
            stats['total_resources'] += row['count']
        
        # 按類型分類
        query = """
            SELECT resource_type, COUNT(*) as count FROM discovered_resources GROUP BY resource_type
        """
        results = await db.fetch_all(query)
        for row in results:
            stats['by_type'][row['resource_type']] = row['count']
        
        # 今日發現
        today = datetime.now().replace(hour=0, minute=0, second=0).isoformat()
        query = "SELECT COUNT(*) as count FROM discovered_resources WHERE created_at >= ?"
        result = await db.fetch_one(query, (today,))
        stats['today_discovered'] = result['count'] if result else 0
        
        # 待加入數量
        query = "SELECT COUNT(*) as count FROM resource_join_queue WHERE status = 'pending'"
        result = await db.fetch_one(query)
        stats['pending_joins'] = result['count'] if result else 0
        
        # 已加入數量
        stats['joined_count'] = stats['by_status'].get('joined', 0) + stats['by_status'].get('monitoring', 0)
        
        # 平均分數
        query = "SELECT AVG(overall_score) as avg FROM discovered_resources"
        result = await db.fetch_one(query)
        stats['avg_score'] = round(result['avg'], 3) if result and result['avg'] else 0
        
        return stats
    
    # ==================== 輔助方法 ====================
    
    def _row_to_dict(self, row) -> Dict:
        """將數據庫行轉換為字典"""
        if not row:
            return None
        
        d = dict(row)
        
        # 解析 JSON 字段
        if 'tags' in d and d['tags']:
            try:
                d['tags'] = json.loads(d['tags'])
            except:
                d['tags'] = []
        
        if 'metadata' in d and d['metadata']:
            try:
                d['metadata'] = json.loads(d['metadata'])
            except:
                d['metadata'] = {}
        
        # 轉換布爾值
        if 'is_public' in d:
            d['is_public'] = bool(d['is_public'])
        if 'has_discussion' in d:
            d['has_discussion'] = bool(d['has_discussion'])
        
        return d


# 全局實例
resource_discovery = ResourceDiscoverySystem()
