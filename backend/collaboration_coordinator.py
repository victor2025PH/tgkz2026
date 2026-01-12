"""
TG-Matrix Collaboration Coordinator
Coordinates multi-account, multi-role collaboration for marketing scenarios
"""
import asyncio
import json
import random
import sys
from datetime import datetime
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass
from enum import Enum


class CollabGroupStatus(Enum):
    """Collaboration group status"""
    WARMING = "warming"       # 預熱中
    ACTIVE = "active"         # 活躍中
    COMPLETED = "completed"   # 已完成
    ARCHIVED = "archived"     # 已歸檔


class CollabPurpose(Enum):
    """Purpose of collaboration group"""
    CONVERSION = "conversion"   # 轉化成交
    SUPPORT = "support"         # 售後支持
    COMMUNITY = "community"     # 社群維護
    ENGAGEMENT = "engagement"   # 互動活躍


@dataclass
class CollabGroup:
    """Collaboration group"""
    id: int
    group_id: str
    group_title: str
    created_by_phone: str
    purpose: str
    status: str
    target_user_id: Optional[str]
    target_username: Optional[str]
    member_count: int
    created_at: str
    completed_at: Optional[str]
    outcome: Optional[str]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "groupId": self.group_id,
            "groupTitle": self.group_title,
            "createdByPhone": self.created_by_phone,
            "purpose": self.purpose,
            "status": self.status,
            "targetUserId": self.target_user_id,
            "targetUsername": self.target_username,
            "memberCount": self.member_count,
            "createdAt": self.created_at,
            "completedAt": self.completed_at,
            "outcome": self.outcome
        }


class CollaborationCoordinator:
    """
    Collaboration coordinator for multi-account operations
    
    Features:
    - Create and manage collaboration groups
    - Coordinate role assignments
    - Manage group members
    - Generate role-based messages
    - Track collaboration outcomes
    """
    
    def __init__(
        self,
        db,
        telegram_manager=None,
        event_callback: Callable = None,
        log_callback: Callable = None
    ):
        self.db = db
        self.telegram_manager = telegram_manager
        self.event_callback = event_callback
        self.log_callback = log_callback or self._default_log
        self._initialized = False
    
    def _default_log(self, message: str, level: str = "info"):
        print(f"[CollabCoord] [{level.upper()}] {message}", file=sys.stderr)
    
    def _send_event(self, event_name: str, data: Dict[str, Any]):
        """Send event to frontend"""
        if self.event_callback:
            self.event_callback(event_name, data)
    
    async def initialize(self):
        """Initialize collaboration tables"""
        if self._initialized:
            return
        
        try:
            # Create collab_groups table
            await self.db.execute('''
                CREATE TABLE IF NOT EXISTS collab_groups (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    group_id TEXT NOT NULL,
                    group_title TEXT NOT NULL,
                    created_by_phone TEXT NOT NULL,
                    purpose TEXT DEFAULT 'conversion',
                    status TEXT DEFAULT 'warming',
                    target_user_id TEXT,
                    target_username TEXT,
                    member_count INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    completed_at TEXT,
                    outcome TEXT,
                    metadata TEXT
                )
            ''')
            
            # Create collab_group_members table
            await self.db.execute('''
                CREATE TABLE IF NOT EXISTS collab_group_members (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    collab_group_id INTEGER NOT NULL,
                    group_id TEXT NOT NULL,
                    account_phone TEXT NOT NULL,
                    role_type TEXT NOT NULL,
                    joined_at TEXT NOT NULL,
                    left_at TEXT,
                    is_active INTEGER DEFAULT 1,
                    FOREIGN KEY (collab_group_id) REFERENCES collab_groups(id)
                )
            ''')
            
            # Create collab_messages table
            await self.db.execute('''
                CREATE TABLE IF NOT EXISTS collab_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    collab_group_id INTEGER NOT NULL,
                    group_id TEXT NOT NULL,
                    account_phone TEXT NOT NULL,
                    role_type TEXT NOT NULL,
                    message_id INTEGER,
                    content TEXT NOT NULL,
                    is_target_response INTEGER DEFAULT 0,
                    sent_at TEXT NOT NULL,
                    FOREIGN KEY (collab_group_id) REFERENCES collab_groups(id)
                )
            ''')
            
            # Create indexes
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_collab_groups_status 
                ON collab_groups(status)
            ''')
            await self.db.execute('''
                CREATE INDEX IF NOT EXISTS idx_collab_members_group 
                ON collab_group_members(collab_group_id)
            ''')
            
            self._initialized = True
            self.log_callback("協作協調器已初始化", "success")
            
        except Exception as e:
            self.log_callback(f"初始化失敗: {e}", "error")
    
    # ==================== Group Management ====================
    
    async def create_collab_group(
        self,
        group_title: str,
        creator_phone: str,
        purpose: str = "conversion",
        target_user_id: Optional[str] = None,
        target_username: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new collaboration group
        
        This creates a database record. The actual Telegram group creation
        should be handled by the calling code using Telegram API.
        """
        if not group_title:
            return {"success": False, "error": "群組標題不能為空"}
        
        now = datetime.now().isoformat()
        
        try:
            # For now, generate a placeholder group_id
            # In real implementation, this comes from Telegram API response
            placeholder_group_id = f"pending_{int(datetime.now().timestamp())}"
            
            collab_id = await self.db.execute('''
                INSERT INTO collab_groups 
                (group_id, group_title, created_by_phone, purpose, status,
                 target_user_id, target_username, member_count, created_at)
                VALUES (?, ?, ?, ?, 'warming', ?, ?, 1, ?)
            ''', (
                placeholder_group_id,
                group_title,
                creator_phone,
                purpose,
                target_user_id,
                target_username,
                now
            ))
            
            # Add creator as first member
            await self.db.execute('''
                INSERT INTO collab_group_members
                (collab_group_id, group_id, account_phone, role_type, joined_at)
                VALUES (?, ?, ?, 'seller', ?)
            ''', (collab_id, placeholder_group_id, creator_phone, now))
            
            self.log_callback(f"協作群組已創建: {group_title}", "success")
            
            self._send_event("collab-group-created", {
                "collabId": collab_id,
                "groupTitle": group_title,
                "purpose": purpose
            })
            
            return {
                "success": True,
                "collabId": collab_id,
                "groupId": placeholder_group_id
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def update_group_telegram_id(
        self,
        collab_id: int,
        telegram_group_id: str
    ) -> Dict[str, Any]:
        """Update the actual Telegram group ID after creation"""
        try:
            await self.db.execute('''
                UPDATE collab_groups SET group_id = ?
                WHERE id = ?
            ''', (telegram_group_id, collab_id))
            
            await self.db.execute('''
                UPDATE collab_group_members SET group_id = ?
                WHERE collab_group_id = ?
            ''', (telegram_group_id, collab_id))
            
            return {"success": True}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def add_member(
        self,
        collab_id: int,
        account_phone: str,
        role_type: str
    ) -> Dict[str, Any]:
        """Add a member to a collaboration group"""
        try:
            row = await self.db.fetch_one(
                'SELECT group_id, member_count FROM collab_groups WHERE id = ?',
                (collab_id,)
            )
            
            if not row:
                return {"success": False, "error": "群組不存在"}
            
            now = datetime.now().isoformat()
            
            # Check if already member
            existing = await self.db.fetch_one('''
                SELECT id FROM collab_group_members
                WHERE collab_group_id = ? AND account_phone = ? AND is_active = 1
            ''', (collab_id, account_phone))
            
            if existing:
                return {"success": False, "error": "帳號已是成員"}
            
            await self.db.execute('''
                INSERT INTO collab_group_members
                (collab_group_id, group_id, account_phone, role_type, joined_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (collab_id, row['group_id'], account_phone, role_type, now))
            
            # Update member count
            await self.db.execute('''
                UPDATE collab_groups SET member_count = member_count + 1
                WHERE id = ?
            ''', (collab_id,))
            
            self._send_event("collab-member-added", {
                "collabId": collab_id,
                "accountPhone": account_phone,
                "roleType": role_type
            })
            
            return {"success": True}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def remove_member(
        self,
        collab_id: int,
        account_phone: str
    ) -> Dict[str, Any]:
        """Remove a member from collaboration group"""
        try:
            now = datetime.now().isoformat()
            
            await self.db.execute('''
                UPDATE collab_group_members 
                SET is_active = 0, left_at = ?
                WHERE collab_group_id = ? AND account_phone = ?
            ''', (now, collab_id, account_phone))
            
            # Update member count
            await self.db.execute('''
                UPDATE collab_groups SET member_count = member_count - 1
                WHERE id = ? AND member_count > 0
            ''', (collab_id,))
            
            return {"success": True}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_collab_group(self, collab_id: int) -> Optional[CollabGroup]:
        """Get a collaboration group by ID"""
        try:
            row = await self.db.fetch_one(
                'SELECT * FROM collab_groups WHERE id = ?',
                (collab_id,)
            )
            
            if not row:
                return None
            
            return self._row_to_collab_group(row)
            
        except Exception as e:
            self.log_callback(f"獲取群組失敗: {e}", "error")
            return None
    
    async def get_group_members(self, collab_id: int) -> List[Dict[str, Any]]:
        """Get all members of a collaboration group"""
        try:
            rows = await self.db.fetch_all('''
                SELECT * FROM collab_group_members
                WHERE collab_group_id = ? AND is_active = 1
            ''', (collab_id,))
            
            members = []
            for row in rows:
                members.append({
                    "id": row['id'],
                    "accountPhone": row['account_phone'],
                    "roleType": row['role_type'],
                    "joinedAt": row['joined_at']
                })
            
            return members
            
        except Exception:
            return []
    
    async def get_all_collab_groups(
        self,
        status: Optional[str] = None,
        purpose: Optional[str] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get all collaboration groups"""
        try:
            query = 'SELECT * FROM collab_groups WHERE 1=1'
            params = []
            
            if status:
                query += ' AND status = ?'
                params.append(status)
            
            if purpose:
                query += ' AND purpose = ?'
                params.append(purpose)
            
            query += ' ORDER BY created_at DESC LIMIT ?'
            params.append(limit)
            
            rows = await self.db.fetch_all(query, tuple(params))
            
            groups = [self._row_to_collab_group(row).to_dict() for row in rows]
            
            return {"success": True, "groups": groups}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def update_group_status(
        self,
        collab_id: int,
        status: str,
        outcome: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update collaboration group status"""
        try:
            updates = ["status = ?"]
            params = [status]
            
            if status in ['completed', 'archived']:
                updates.append("completed_at = ?")
                params.append(datetime.now().isoformat())
            
            if outcome:
                updates.append("outcome = ?")
                params.append(outcome)
            
            params.append(collab_id)
            
            await self.db.execute(f'''
                UPDATE collab_groups SET {', '.join(updates)}
                WHERE id = ?
            ''', tuple(params))
            
            self._send_event("collab-group-updated", {
                "collabId": collab_id,
                "status": status,
                "outcome": outcome
            })
            
            return {"success": True}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _row_to_collab_group(self, row) -> CollabGroup:
        """Convert database row to CollabGroup object"""
        return CollabGroup(
            id=row['id'],
            group_id=row['group_id'],
            group_title=row['group_title'],
            created_by_phone=row['created_by_phone'],
            purpose=row['purpose'],
            status=row['status'],
            target_user_id=row['target_user_id'],
            target_username=row['target_username'],
            member_count=row['member_count'],
            created_at=row['created_at'],
            completed_at=row['completed_at'],
            outcome=row['outcome']
        )
    
    # ==================== Message Coordination ====================
    
    async def send_coordinated_message(
        self,
        collab_id: int,
        account_phone: str,
        role_type: str,
        content: str,
        delay_range: tuple = (5, 15)
    ) -> Dict[str, Any]:
        """
        Send a coordinated message with typing simulation
        """
        try:
            row = await self.db.fetch_one(
                'SELECT group_id FROM collab_groups WHERE id = ?',
                (collab_id,)
            )
            
            if not row:
                return {"success": False, "error": "群組不存在"}
            
            group_id = row['group_id']
            
            # Random delay for realistic timing
            delay = random.randint(delay_range[0], delay_range[1])
            await asyncio.sleep(delay)
            
            # Simulate typing (would integrate with Telegram API)
            typing_duration = len(content) * 0.05  # ~20 chars per second
            typing_duration = min(max(typing_duration, 1), 10)
            await asyncio.sleep(typing_duration)
            
            # Send message via Telegram (placeholder for actual implementation)
            message_id = None
            if self.telegram_manager:
                # This would call the actual Telegram send method
                # message_id = await self.telegram_manager.send_message(...)
                pass
            
            # Log the message
            now = datetime.now().isoformat()
            await self.db.execute('''
                INSERT INTO collab_messages
                (collab_group_id, group_id, account_phone, role_type, message_id, content, sent_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (collab_id, group_id, account_phone, role_type, message_id, content, now))
            
            self._send_event("collab-message-sent", {
                "collabId": collab_id,
                "accountPhone": account_phone,
                "roleType": role_type,
                "contentPreview": content[:50] + "..." if len(content) > 50 else content
            })
            
            return {"success": True, "messageId": message_id}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def log_target_response(
        self,
        collab_id: int,
        message_content: str
    ) -> Dict[str, Any]:
        """Log a response from the target user"""
        try:
            row = await self.db.fetch_one(
                'SELECT group_id, target_user_id FROM collab_groups WHERE id = ?',
                (collab_id,)
            )
            
            if not row:
                return {"success": False, "error": "群組不存在"}
            
            now = datetime.now().isoformat()
            await self.db.execute('''
                INSERT INTO collab_messages
                (collab_group_id, group_id, account_phone, role_type, content, is_target_response, sent_at)
                VALUES (?, ?, ?, 'target', ?, 1, ?)
            ''', (collab_id, row['group_id'], row['target_user_id'] or '', message_content, now))
            
            self._send_event("collab-target-response", {
                "collabId": collab_id,
                "contentPreview": message_content[:50] + "..." if len(message_content) > 50 else message_content
            })
            
            return {"success": True}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_group_messages(
        self,
        collab_id: int,
        limit: int = 100
    ) -> Dict[str, Any]:
        """Get messages from a collaboration group"""
        try:
            rows = await self.db.fetch_all('''
                SELECT * FROM collab_messages
                WHERE collab_group_id = ?
                ORDER BY sent_at DESC
                LIMIT ?
            ''', (collab_id, limit))
            
            messages = []
            for row in rows:
                messages.append({
                    "id": row['id'],
                    "accountPhone": row['account_phone'],
                    "roleType": row['role_type'],
                    "content": row['content'],
                    "isTargetResponse": bool(row['is_target_response']),
                    "sentAt": row['sent_at']
                })
            
            return {"success": True, "messages": list(reversed(messages))}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ==================== Collaboration Statistics ====================
    
    async def get_collab_stats(self) -> Dict[str, Any]:
        """Get collaboration statistics"""
        try:
            # Total groups
            total_row = await self.db.fetch_one(
                'SELECT COUNT(*) as count FROM collab_groups'
            )
            total = total_row['count'] if total_row else 0
            
            # By status
            status_rows = await self.db.fetch_all('''
                SELECT status, COUNT(*) as count FROM collab_groups
                GROUP BY status
            ''')
            by_status = {row['status']: row['count'] for row in status_rows}
            
            # By outcome
            outcome_rows = await self.db.fetch_all('''
                SELECT outcome, COUNT(*) as count FROM collab_groups
                WHERE outcome IS NOT NULL
                GROUP BY outcome
            ''')
            by_outcome = {row['outcome']: row['count'] for row in outcome_rows}
            
            # Total messages
            msg_row = await self.db.fetch_one(
                'SELECT COUNT(*) as count FROM collab_messages'
            )
            total_messages = msg_row['count'] if msg_row else 0
            
            # Target responses
            resp_row = await self.db.fetch_one(
                'SELECT COUNT(*) as count FROM collab_messages WHERE is_target_response = 1'
            )
            target_responses = resp_row['count'] if resp_row else 0
            
            # Conversion rate
            converted = by_outcome.get('converted', 0)
            completed = by_status.get('completed', 0)
            conversion_rate = round((converted / completed * 100) if completed > 0 else 0, 1)
            
            return {
                "success": True,
                "total": total,
                "byStatus": by_status,
                "byOutcome": by_outcome,
                "totalMessages": total_messages,
                "targetResponses": target_responses,
                "conversionRate": conversion_rate,
                "activeGroups": by_status.get('active', 0) + by_status.get('warming', 0)
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ==================== Role Selection Helpers ====================
    
    async def get_available_roles_for_group(
        self,
        collab_id: int
    ) -> Dict[str, Any]:
        """Get available and assigned roles for a collaboration group"""
        try:
            members = await self.get_group_members(collab_id)
            
            assigned = {m['roleType']: m['accountPhone'] for m in members}
            
            all_roles = [
                'seller', 'expert', 'satisfied', 'hesitant',
                'converted', 'curious', 'manager', 'support'
            ]
            
            available = [r for r in all_roles if r not in assigned]
            
            return {
                "success": True,
                "assigned": assigned,
                "available": available
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def auto_assign_roles(
        self,
        collab_id: int,
        required_roles: List[str],
        exclude_phones: List[str] = None
    ) -> Dict[str, Any]:
        """Automatically assign available accounts to required roles"""
        try:
            from multi_role_manager import get_multi_role_manager
            
            role_manager = get_multi_role_manager()
            if not role_manager:
                return {"success": False, "error": "角色管理器未初始化"}
            
            exclude = set(exclude_phones or [])
            assignments = {}
            
            for role_type in required_roles:
                # Get accounts with this role
                accounts = await role_manager.get_accounts_by_role(role_type)
                
                # Filter out excluded and already assigned
                available = [a for a in accounts if a not in exclude and a not in assignments.values()]
                
                if available:
                    selected = random.choice(available)
                    assignments[role_type] = selected
                    
                    # Add to group
                    await self.add_member(collab_id, selected, role_type)
            
            return {
                "success": True,
                "assignments": assignments,
                "missingRoles": [r for r in required_roles if r not in assignments]
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}


# Global instance
collaboration_coordinator: Optional[CollaborationCoordinator] = None


async def init_collaboration_coordinator(
    db,
    telegram_manager=None,
    event_callback=None,
    log_callback=None
) -> CollaborationCoordinator:
    """Initialize collaboration coordinator"""
    global collaboration_coordinator
    collaboration_coordinator = CollaborationCoordinator(
        db=db,
        telegram_manager=telegram_manager,
        event_callback=event_callback,
        log_callback=log_callback
    )
    await collaboration_coordinator.initialize()
    return collaboration_coordinator


def get_collaboration_coordinator() -> Optional[CollaborationCoordinator]:
    """Get collaboration coordinator instance"""
    return collaboration_coordinator
