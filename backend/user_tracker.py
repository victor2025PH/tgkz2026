"""
TG-Matrix User Tracker
Tracks high-value users and discovers their group memberships
"""
import asyncio
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable, Set
from dataclasses import dataclass
from enum import Enum


class UserValueLevel(Enum):
    """User value classification levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VIP = "vip"


class TrackingStatus(Enum):
    """User tracking status"""
    PENDING = "pending"
    TRACKING = "tracking"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class TrackedUser:
    """Tracked user data structure"""
    id: int
    user_id: str
    username: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    value_level: UserValueLevel
    tracking_status: TrackingStatus
    groups_count: int
    high_value_groups: int
    last_tracked_at: Optional[str]
    source: str  # 'lead' | 'keyword_match' | 'manual' | 'ad_response'
    source_group_id: Optional[str]
    notes: Optional[str]
    created_at: str
    updated_at: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "userId": self.user_id,
            "username": self.username,
            "firstName": self.first_name,
            "lastName": self.last_name,
            "displayName": self._get_display_name(),
            "valueLevel": self.value_level.value,
            "trackingStatus": self.tracking_status.value,
            "groupsCount": self.groups_count,
            "highValueGroups": self.high_value_groups,
            "lastTrackedAt": self.last_tracked_at,
            "source": self.source,
            "sourceGroupId": self.source_group_id,
            "notes": self.notes,
            "createdAt": self.created_at,
            "updatedAt": self.updated_at
        }
    
    def _get_display_name(self) -> str:
        if self.username:
            return f"@{self.username}"
        if self.first_name or self.last_name:
            return f"{self.first_name or ''} {self.last_name or ''}".strip()
        return f"User {self.user_id}"


@dataclass
class UserGroup:
    """User-Group association"""
    id: int
    user_id: str
    group_id: str
    group_title: str
    group_username: Optional[str]
    member_count: int
    is_high_value: bool
    value_score: float
    discovered_at: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "userId": self.user_id,
            "groupId": self.group_id,
            "groupTitle": self.group_title,
            "groupUsername": self.group_username,
            "memberCount": self.member_count,
            "isHighValue": self.is_high_value,
            "valueScore": self.value_score,
            "discoveredAt": self.discovered_at
        }


class UserTracker:
    """
    User tracking service
    
    Features:
    - Track user's group memberships via get_common_chats
    - Identify high-value groups
    - Auto-add discovered groups to resource pool
    - Value scoring for users and groups
    """
    
    # Scoring thresholds
    HIGH_VALUE_MEMBER_THRESHOLD = 500  # Groups with 500+ members are high value
    MIN_MEMBER_COUNT = 50  # Ignore groups with fewer members
    
    def __init__(
        self,
        db,
        telegram_manager,
        event_callback: Callable = None,
        log_callback: Callable = None
    ):
        self.db = db
        self.telegram_manager = telegram_manager
        self.event_callback = event_callback
        self.log_callback = log_callback or self._default_log
        self._initialized = False
    
    def _default_log(self, message: str, level: str = "info"):
        print(f"[UserTracker] [{level.upper()}] {message}", file=sys.stderr)
    
    def _send_event(self, event_name: str, data: Dict[str, Any]):
        """Send event to frontend"""
        if self.event_callback:
            self.event_callback(event_name, data)
    
    async def initialize(self):
        """Initialize user tracking tables"""
        if self._initialized:
            return
        
        try:
            # Create tracked_users table
            await self.db.execute('''
                CREATE TABLE IF NOT EXISTS tracked_users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT UNIQUE NOT NULL,
                    username TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    value_level TEXT DEFAULT 'low',
                    tracking_status TEXT DEFAULT 'pending',
                    groups_count INTEGER DEFAULT 0,
                    high_value_groups INTEGER DEFAULT 0,
                    last_tracked_at TEXT,
                    source TEXT DEFAULT 'manual',
                    source_group_id TEXT,
                    notes TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            ''')
            
            # Create user_groups table
            await self.db.execute('''
                CREATE TABLE IF NOT EXISTS user_groups (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    group_id TEXT NOT NULL,
                    group_title TEXT,
                    group_username TEXT,
                    member_count INTEGER DEFAULT 0,
                    is_high_value INTEGER DEFAULT 0,
                    value_score REAL DEFAULT 0,
                    discovered_at TEXT NOT NULL,
                    UNIQUE(user_id, group_id)
                )
            ''')
            
            # Create user_tracking_logs table
            await self.db.execute('''
                CREATE TABLE IF NOT EXISTS user_tracking_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    tracked_by_phone TEXT,
                    groups_found INTEGER DEFAULT 0,
                    new_groups INTEGER DEFAULT 0,
                    high_value_groups INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'completed',
                    error_message TEXT,
                    timestamp TEXT NOT NULL
                )
            ''')
            
            # Create indexes
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_tracked_users_value 
                ON tracked_users(value_level)
            ''')
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_user_groups_user 
                ON user_groups(user_id)
            ''')
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_user_groups_high_value 
                ON user_groups(is_high_value)
            ''')
            
            self._initialized = True
            self.log_callback("用戶追蹤系統已初始化", "success")
            
        except Exception as e:
            self.log_callback(f"初始化失敗: {e}", "error")
    
    # ==================== User Management ====================
    
    async def add_user_to_track(
        self,
        user_id: str,
        username: Optional[str] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        source: str = "manual",
        source_group_id: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Add a user to tracking list"""
        now = datetime.now().isoformat()
        
        try:
            # Check if already exists
            existing = await self.db.fetch_one(
                'SELECT id FROM tracked_users WHERE user_id = ?',
                (user_id,)
            )
            
            if existing:
                return {
                    "success": False,
                    "error": "用戶已在追蹤列表中",
                    "userId": user_id
                }
            
            cursor = await self.db.execute('''
                INSERT INTO tracked_users 
                (user_id, username, first_name, last_name, source, source_group_id, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (user_id, username, first_name, last_name, source, source_group_id, notes, now, now))
            
            self.log_callback(f"已添加用戶追蹤: {username or user_id}", "success")
            
            return {
                "success": True,
                "id": cursor.lastrowid,
                "userId": user_id,
                "username": username
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def add_user_from_lead(self, lead_id: int) -> Dict[str, Any]:
        """Add a user from leads table"""
        try:
            lead = await self.db.fetch_one(
                'SELECT * FROM leads WHERE id = ?',
                (lead_id,)
            )
            
            if not lead:
                return {"success": False, "error": "Lead 不存在"}
            
            return await self.add_user_to_track(
                user_id=str(lead['user_id']),
                username=lead.get('username'),
                first_name=lead.get('first_name'),
                last_name=lead.get('last_name'),
                source="lead",
                source_group_id=lead.get('source_group'),
                notes=f"來自 Lead #{lead_id}"
            )
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def remove_user(self, user_id: str) -> Dict[str, Any]:
        """Remove a user from tracking"""
        try:
            await self.db.execute(
                'DELETE FROM user_groups WHERE user_id = ?',
                (user_id,)
            )
            await self.db.execute(
                'DELETE FROM tracked_users WHERE user_id = ?',
                (user_id,)
            )
            
            return {"success": True}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def update_user_notes(self, user_id: str, notes: str) -> Dict[str, Any]:
        """Update user notes"""
        try:
            await self.db.execute('''
                UPDATE tracked_users SET notes = ?, updated_at = ?
                WHERE user_id = ?
            ''', (notes, datetime.now().isoformat(), user_id))
            
            return {"success": True}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def update_user_value_level(self, user_id: str, value_level: str) -> Dict[str, Any]:
        """Update user value level"""
        try:
            # Validate value level
            UserValueLevel(value_level)
            
            await self.db.execute('''
                UPDATE tracked_users SET value_level = ?, updated_at = ?
                WHERE user_id = ?
            ''', (value_level, datetime.now().isoformat(), user_id))
            
            return {"success": True, "valueLevel": value_level}
            
        except ValueError:
            return {"success": False, "error": "無效的價值等級"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_tracked_user(self, user_id: str) -> Optional[TrackedUser]:
        """Get a single tracked user"""
        try:
            row = await self.db.fetch_one(
                'SELECT * FROM tracked_users WHERE user_id = ?',
                (user_id,)
            )
            
            if not row:
                return None
            
            return self._row_to_tracked_user(row)
            
        except Exception as e:
            self.log_callback(f"獲取用戶失敗: {e}", "error")
            return None
    
    async def get_all_tracked_users(
        self,
        value_level: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get all tracked users with filtering"""
        try:
            query = 'SELECT * FROM tracked_users WHERE 1=1'
            params = []
            
            if value_level:
                query += ' AND value_level = ?'
                params.append(value_level)
            
            if status:
                query += ' AND tracking_status = ?'
                params.append(status)
            
            # Get total count
            count_query = query.replace('SELECT *', 'SELECT COUNT(*) as count')
            count_row = await self.db.fetch_one(count_query, tuple(params))
            total = count_row['count'] if count_row else 0
            
            # Get users
            query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?'
            params.extend([limit, offset])
            
            rows = await self.db.fetch_all(query, tuple(params))
            
            users = [self._row_to_tracked_user(row).to_dict() for row in rows]
            
            return {
                "success": True,
                "users": users,
                "total": total,
                "limit": limit,
                "offset": offset
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _row_to_tracked_user(self, row) -> TrackedUser:
        """Convert database row to TrackedUser object"""
        return TrackedUser(
            id=row['id'],
            user_id=row['user_id'],
            username=row['username'],
            first_name=row['first_name'],
            last_name=row['last_name'],
            value_level=UserValueLevel(row['value_level']),
            tracking_status=TrackingStatus(row['tracking_status']),
            groups_count=row['groups_count'],
            high_value_groups=row['high_value_groups'],
            last_tracked_at=row['last_tracked_at'],
            source=row['source'],
            source_group_id=row['source_group_id'],
            notes=row['notes'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )
    
    # ==================== Group Discovery ====================
    
    async def track_user_groups(
        self,
        user_id: str,
        account_phone: str
    ) -> Dict[str, Any]:
        """
        Track user's group memberships using get_common_chats API
        
        Args:
            user_id: Telegram user ID to track
            account_phone: Account to use for tracking
            
        Returns:
            Tracking result with discovered groups
        """
        now = datetime.now().isoformat()
        
        # Update status to tracking
        await self.db.execute('''
            UPDATE tracked_users SET tracking_status = ?, updated_at = ?
            WHERE user_id = ?
        ''', ('tracking', now, user_id))
        
        self._send_event("user-tracking-started", {
            "userId": user_id,
            "accountPhone": account_phone
        })
        
        try:
            # Get client
            client = self.telegram_manager.get_client(account_phone)
            if not client:
                raise Exception(f"帳號 {account_phone} 未連接")
            
            if not client.is_connected:
                await client.connect()
            
            # Get user entity
            try:
                user = await client.get_users(int(user_id))
            except:
                user = await client.get_users(user_id)
            
            if not user:
                raise Exception("無法獲取用戶信息")
            
            # Get common chats
            common_chats = await client.get_common_chats(user)
            
            groups_found = 0
            new_groups = 0
            high_value_count = 0
            discovered_groups = []
            
            for chat in common_chats:
                # Skip non-groups
                if not hasattr(chat, 'id'):
                    continue
                
                group_id = str(chat.id)
                group_title = getattr(chat, 'title', 'Unknown')
                group_username = getattr(chat, 'username', None)
                member_count = getattr(chat, 'members_count', 0) or 0
                
                # Skip small groups
                if member_count < self.MIN_MEMBER_COUNT:
                    continue
                
                groups_found += 1
                
                # Calculate value score
                value_score = self._calculate_group_value(member_count)
                is_high_value = member_count >= self.HIGH_VALUE_MEMBER_THRESHOLD
                
                if is_high_value:
                    high_value_count += 1
                
                # Check if already exists
                existing = await self.db.fetch_one(
                    'SELECT id FROM user_groups WHERE user_id = ? AND group_id = ?',
                    (user_id, group_id)
                )
                
                if not existing:
                    new_groups += 1
                    
                    # Insert new group association
                    await self.db.execute('''
                        INSERT INTO user_groups 
                        (user_id, group_id, group_title, group_username, member_count, 
                         is_high_value, value_score, discovered_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        user_id, group_id, group_title, group_username, member_count,
                        1 if is_high_value else 0, value_score, now
                    ))
                    
                    # Add to resource discovery if high value
                    if is_high_value:
                        await self._add_to_resource_pool(
                            group_id=group_id,
                            group_title=group_title,
                            group_username=group_username,
                            member_count=member_count,
                            source_user_id=user_id
                        )
                
                discovered_groups.append({
                    "groupId": group_id,
                    "title": group_title,
                    "username": group_username,
                    "memberCount": member_count,
                    "isHighValue": is_high_value,
                    "valueScore": value_score,
                    "isNew": not existing
                })
            
            # Update user record
            await self.db.execute('''
                UPDATE tracked_users SET 
                    tracking_status = 'completed',
                    groups_count = ?,
                    high_value_groups = ?,
                    last_tracked_at = ?,
                    updated_at = ?
                WHERE user_id = ?
            ''', (groups_found, high_value_count, now, now, user_id))
            
            # Update value level based on groups
            new_value_level = self._calculate_user_value(groups_found, high_value_count)
            await self.db.execute('''
                UPDATE tracked_users SET value_level = ? WHERE user_id = ?
            ''', (new_value_level, user_id))
            
            # Log the tracking
            await self.db.execute('''
                INSERT INTO user_tracking_logs 
                (user_id, tracked_by_phone, groups_found, new_groups, high_value_groups, status, timestamp)
                VALUES (?, ?, ?, ?, ?, 'completed', ?)
            ''', (user_id, account_phone, groups_found, new_groups, high_value_count, now))
            
            self.log_callback(
                f"用戶追蹤完成: {groups_found} 個群組, {new_groups} 個新群組, {high_value_count} 個高價值",
                "success"
            )
            
            result = {
                "success": True,
                "userId": user_id,
                "groupsFound": groups_found,
                "newGroups": new_groups,
                "highValueGroups": high_value_count,
                "valueLevel": new_value_level,
                "groups": discovered_groups
            }
            
            self._send_event("user-tracking-completed", result)
            
            return result
            
        except Exception as e:
            error_msg = str(e)
            
            # Update status to failed
            await self.db.execute('''
                UPDATE tracked_users SET tracking_status = 'failed', updated_at = ?
                WHERE user_id = ?
            ''', (now, user_id))
            
            # Log the failure
            await self.db.execute('''
                INSERT INTO user_tracking_logs 
                (user_id, tracked_by_phone, groups_found, new_groups, status, error_message, timestamp)
                VALUES (?, ?, 0, 0, 'failed', ?, ?)
            ''', (user_id, account_phone, error_msg, now))
            
            self.log_callback(f"用戶追蹤失敗: {error_msg}", "error")
            
            self._send_event("user-tracking-failed", {
                "userId": user_id,
                "error": error_msg
            })
            
            return {"success": False, "error": error_msg}
    
    async def batch_track_users(
        self,
        user_ids: List[str],
        account_phone: str
    ) -> Dict[str, Any]:
        """Track multiple users in batch"""
        results = {
            "success": True,
            "total": len(user_ids),
            "completed": 0,
            "failed": 0,
            "results": []
        }
        
        for i, user_id in enumerate(user_ids):
            self._send_event("batch-tracking-progress", {
                "current": i + 1,
                "total": len(user_ids),
                "userId": user_id
            })
            
            result = await self.track_user_groups(user_id, account_phone)
            
            if result.get("success"):
                results["completed"] += 1
            else:
                results["failed"] += 1
            
            results["results"].append({
                "userId": user_id,
                **result
            })
            
            # Rate limiting delay
            if i < len(user_ids) - 1:
                await asyncio.sleep(5)  # 5 second delay between tracks
        
        self._send_event("batch-tracking-completed", results)
        
        return results
    
    def _calculate_group_value(self, member_count: int) -> float:
        """Calculate group value score (0-1)"""
        if member_count >= 10000:
            return 1.0
        elif member_count >= 5000:
            return 0.9
        elif member_count >= 1000:
            return 0.7
        elif member_count >= 500:
            return 0.5
        elif member_count >= 100:
            return 0.3
        else:
            return 0.1
    
    def _calculate_user_value(self, groups_count: int, high_value_count: int) -> str:
        """Calculate user value level based on groups"""
        if high_value_count >= 5 or groups_count >= 20:
            return "vip"
        elif high_value_count >= 3 or groups_count >= 10:
            return "high"
        elif high_value_count >= 1 or groups_count >= 5:
            return "medium"
        else:
            return "low"
    
    async def _add_to_resource_pool(
        self,
        group_id: str,
        group_title: str,
        group_username: Optional[str],
        member_count: int,
        source_user_id: str
    ):
        """Add discovered group to resource discovery pool"""
        try:
            # Check if already exists in discovered_resources
            existing = await self.db.fetch_one(
                'SELECT id FROM discovered_resources WHERE telegram_id = ?',
                (group_id,)
            )
            
            if not existing:
                await self.db.execute('''
                    INSERT INTO discovered_resources 
                    (resource_type, telegram_id, username, title, member_count, 
                     activity_score, relevance_score, discovery_source, status, discovered_at)
                    VALUES ('group', ?, ?, ?, ?, 0.5, 0.5, 'user_track', 'discovered', ?)
                ''', (group_id, group_username, group_title, member_count, datetime.now().isoformat()))
                
                self.log_callback(f"新資源已添加到資源池: {group_title}", "info")
                
        except Exception as e:
            self.log_callback(f"添加到資源池失敗: {e}", "warning")
    
    # ==================== User Groups ====================
    
    async def get_user_groups(self, user_id: str) -> Dict[str, Any]:
        """Get all groups for a user"""
        try:
            rows = await self.db.fetch_all('''
                SELECT * FROM user_groups 
                WHERE user_id = ? 
                ORDER BY is_high_value DESC, member_count DESC
            ''', (user_id,))
            
            groups = []
            for row in rows:
                groups.append({
                    "id": row['id'],
                    "groupId": row['group_id'],
                    "groupTitle": row['group_title'],
                    "groupUsername": row['group_username'],
                    "memberCount": row['member_count'],
                    "isHighValue": bool(row['is_high_value']),
                    "valueScore": row['value_score'],
                    "discoveredAt": row['discovered_at']
                })
            
            return {
                "success": True,
                "userId": user_id,
                "groups": groups,
                "total": len(groups)
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_high_value_groups(self, limit: int = 50) -> Dict[str, Any]:
        """Get all high-value groups discovered from user tracking"""
        try:
            rows = await self.db.fetch_all('''
                SELECT group_id, group_title, group_username, 
                       MAX(member_count) as member_count, 
                       MAX(value_score) as value_score,
                       COUNT(DISTINCT user_id) as users_count,
                       MIN(discovered_at) as first_discovered
                FROM user_groups 
                WHERE is_high_value = 1
                GROUP BY group_id
                ORDER BY users_count DESC, member_count DESC
                LIMIT ?
            ''', (limit,))
            
            groups = []
            for row in rows:
                groups.append({
                    "groupId": row['group_id'],
                    "groupTitle": row['group_title'],
                    "groupUsername": row['group_username'],
                    "memberCount": row['member_count'],
                    "valueScore": row['value_score'],
                    "usersCount": row['users_count'],
                    "firstDiscovered": row['first_discovered']
                })
            
            return {
                "success": True,
                "groups": groups,
                "total": len(groups)
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ==================== Statistics ====================
    
    async def get_tracking_stats(self) -> Dict[str, Any]:
        """Get tracking statistics"""
        try:
            # Total users
            total_row = await self.db.fetch_one(
                'SELECT COUNT(*) as count FROM tracked_users'
            )
            total_users = total_row['count'] if total_row else 0
            
            # By value level
            value_rows = await self.db.fetch_all('''
                SELECT value_level, COUNT(*) as count 
                FROM tracked_users 
                GROUP BY value_level
            ''')
            by_value = {row['value_level']: row['count'] for row in value_rows}
            
            # By status
            status_rows = await self.db.fetch_all('''
                SELECT tracking_status, COUNT(*) as count 
                FROM tracked_users 
                GROUP BY tracking_status
            ''')
            by_status = {row['tracking_status']: row['count'] for row in status_rows}
            
            # Total groups discovered
            groups_row = await self.db.fetch_one(
                'SELECT COUNT(DISTINCT group_id) as count FROM user_groups'
            )
            total_groups = groups_row['count'] if groups_row else 0
            
            # High value groups
            hv_row = await self.db.fetch_one(
                'SELECT COUNT(DISTINCT group_id) as count FROM user_groups WHERE is_high_value = 1'
            )
            high_value_groups = hv_row['count'] if hv_row else 0
            
            # Today's tracking
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            today_row = await self.db.fetch_one('''
                SELECT COUNT(*) as count FROM user_tracking_logs 
                WHERE timestamp >= ? AND status = 'completed'
            ''', (today,))
            today_tracked = today_row['count'] if today_row else 0
            
            return {
                "success": True,
                "stats": {
                    "totalUsers": total_users,
                    "byValueLevel": {
                        "vip": by_value.get("vip", 0),
                        "high": by_value.get("high", 0),
                        "medium": by_value.get("medium", 0),
                        "low": by_value.get("low", 0)
                    },
                    "byStatus": {
                        "pending": by_status.get("pending", 0),
                        "tracking": by_status.get("tracking", 0),
                        "completed": by_status.get("completed", 0),
                        "failed": by_status.get("failed", 0)
                    },
                    "totalGroupsDiscovered": total_groups,
                    "highValueGroups": high_value_groups,
                    "todayTracked": today_tracked
                }
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_tracking_logs(
        self,
        user_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get tracking logs"""
        try:
            query = 'SELECT * FROM user_tracking_logs WHERE 1=1'
            params = []
            
            if user_id:
                query += ' AND user_id = ?'
                params.append(user_id)
            
            query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?'
            params.extend([limit, offset])
            
            rows = await self.db.fetch_all(query, tuple(params))
            
            logs = []
            for row in rows:
                logs.append({
                    "id": row['id'],
                    "userId": row['user_id'],
                    "trackedByPhone": row['tracked_by_phone'],
                    "groupsFound": row['groups_found'],
                    "newGroups": row['new_groups'],
                    "highValueGroups": row['high_value_groups'],
                    "status": row['status'],
                    "errorMessage": row['error_message'],
                    "timestamp": row['timestamp']
                })
            
            return {
                "success": True,
                "logs": logs
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}


# Global instance
user_tracker: Optional[UserTracker] = None


async def init_user_tracker(db, telegram_manager, event_callback=None, log_callback=None) -> UserTracker:
    """Initialize user tracker"""
    global user_tracker
    user_tracker = UserTracker(
        db=db,
        telegram_manager=telegram_manager,
        event_callback=event_callback,
        log_callback=log_callback
    )
    await user_tracker.initialize()
    return user_tracker


def get_user_tracker() -> Optional[UserTracker]:
    """Get user tracker instance"""
    return user_tracker
