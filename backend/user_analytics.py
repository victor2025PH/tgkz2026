"""
TG-Matrix User Analytics
Analytics and insights for tracked users and discovered groups
"""
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from collections import defaultdict


class UserAnalytics:
    """
    User analytics and insights service
    
    Features:
    - User value distribution analysis
    - Group overlap analysis (find common groups between users)
    - Tracking effectiveness metrics
    - User source analysis
    - Time-based tracking trends
    """
    
    def __init__(self, db):
        self.db = db
    
    async def get_user_value_distribution(self) -> Dict[str, Any]:
        """Get distribution of users by value level"""
        try:
            rows = await self.db.fetch_all('''
                SELECT 
                    value_level,
                    COUNT(*) as count,
                    AVG(groups_count) as avg_groups,
                    AVG(high_value_groups) as avg_hv_groups
                FROM tracked_users
                GROUP BY value_level
                ORDER BY 
                    CASE value_level 
                        WHEN 'vip' THEN 1 
                        WHEN 'high' THEN 2 
                        WHEN 'medium' THEN 3 
                        ELSE 4 
                    END
            ''')
            
            distribution = []
            for row in rows:
                distribution.append({
                    "valueLevel": row['value_level'],
                    "count": row['count'],
                    "avgGroups": round(row['avg_groups'] or 0, 1),
                    "avgHighValueGroups": round(row['avg_hv_groups'] or 0, 1)
                })
            
            return {
                "success": True,
                "distribution": distribution
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_source_analysis(self) -> Dict[str, Any]:
        """Analyze user sources"""
        try:
            rows = await self.db.fetch_all('''
                SELECT 
                    source,
                    COUNT(*) as count,
                    SUM(CASE WHEN value_level IN ('high', 'vip') THEN 1 ELSE 0 END) as high_value_count,
                    AVG(groups_count) as avg_groups
                FROM tracked_users
                GROUP BY source
                ORDER BY count DESC
            ''')
            
            sources = []
            for row in rows:
                count = row['count'] or 0
                sources.append({
                    "source": row['source'],
                    "count": count,
                    "highValueCount": row['high_value_count'] or 0,
                    "highValueRate": round((row['high_value_count'] or 0) / count * 100, 1) if count > 0 else 0,
                    "avgGroups": round(row['avg_groups'] or 0, 1)
                })
            
            return {
                "success": True,
                "sources": sources
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_group_overlap_analysis(self, min_overlap: int = 2) -> Dict[str, Any]:
        """
        Find groups that appear in multiple users' memberships
        
        Args:
            min_overlap: Minimum number of users that share the group
            
        Returns:
            Groups with high overlap between tracked users
        """
        try:
            rows = await self.db.fetch_all('''
                SELECT 
                    group_id,
                    group_title,
                    group_username,
                    MAX(member_count) as member_count,
                    MAX(value_score) as value_score,
                    COUNT(DISTINCT user_id) as user_overlap,
                    SUM(is_high_value) > 0 as is_high_value
                FROM user_groups
                GROUP BY group_id
                HAVING COUNT(DISTINCT user_id) >= ?
                ORDER BY user_overlap DESC, member_count DESC
                LIMIT 50
            ''', (min_overlap,))
            
            groups = []
            for row in rows:
                groups.append({
                    "groupId": row['group_id'],
                    "groupTitle": row['group_title'],
                    "groupUsername": row['group_username'],
                    "memberCount": row['member_count'],
                    "valueScore": row['value_score'],
                    "userOverlap": row['user_overlap'],
                    "isHighValue": bool(row['is_high_value'])
                })
            
            return {
                "success": True,
                "groups": groups,
                "minOverlap": min_overlap
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_tracking_trends(self, days: int = 30) -> Dict[str, Any]:
        """Get tracking trends over time"""
        try:
            since = (datetime.now() - timedelta(days=days)).isoformat()
            
            rows = await self.db.fetch_all('''
                SELECT 
                    DATE(timestamp) as date,
                    COUNT(*) as total_tracks,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
                    SUM(groups_found) as total_groups,
                    SUM(new_groups) as new_groups,
                    SUM(high_value_groups) as high_value_groups
                FROM user_tracking_logs
                WHERE timestamp >= ?
                GROUP BY DATE(timestamp)
                ORDER BY date ASC
            ''', (since,))
            
            trends = []
            for row in rows:
                trends.append({
                    "date": row['date'],
                    "totalTracks": row['total_tracks'] or 0,
                    "successful": row['successful'] or 0,
                    "totalGroups": row['total_groups'] or 0,
                    "newGroups": row['new_groups'] or 0,
                    "highValueGroups": row['high_value_groups'] or 0
                })
            
            return {
                "success": True,
                "days": days,
                "trends": trends
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_top_groups_by_users(self, limit: int = 20) -> Dict[str, Any]:
        """Get groups with most tracked users"""
        try:
            rows = await self.db.fetch_all('''
                SELECT 
                    ug.group_id,
                    ug.group_title,
                    ug.group_username,
                    MAX(ug.member_count) as member_count,
                    COUNT(DISTINCT ug.user_id) as tracked_users,
                    SUM(CASE WHEN tu.value_level IN ('high', 'vip') THEN 1 ELSE 0 END) as high_value_users
                FROM user_groups ug
                LEFT JOIN tracked_users tu ON ug.user_id = tu.user_id
                GROUP BY ug.group_id
                ORDER BY tracked_users DESC, member_count DESC
                LIMIT ?
            ''', (limit,))
            
            groups = []
            for row in rows:
                groups.append({
                    "groupId": row['group_id'],
                    "groupTitle": row['group_title'],
                    "groupUsername": row['group_username'],
                    "memberCount": row['member_count'],
                    "trackedUsers": row['tracked_users'],
                    "highValueUsers": row['high_value_users']
                })
            
            return {
                "success": True,
                "groups": groups
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_user_network_insights(self, user_id: str) -> Dict[str, Any]:
        """
        Get insights about a specific user's network
        
        Shows users who share groups with the target user
        """
        try:
            # Get groups for this user
            user_groups = await self.db.fetch_all(
                'SELECT group_id FROM user_groups WHERE user_id = ?',
                (user_id,)
            )
            
            if not user_groups:
                return {
                    "success": True,
                    "userId": user_id,
                    "connectedUsers": [],
                    "sharedGroups": 0
                }
            
            group_ids = [row['group_id'] for row in user_groups]
            placeholders = ','.join(['?' for _ in group_ids])
            
            # Find other users who share these groups
            rows = await self.db.fetch_all(f'''
                SELECT 
                    ug.user_id,
                    tu.username,
                    tu.first_name,
                    tu.last_name,
                    tu.value_level,
                    COUNT(DISTINCT ug.group_id) as shared_groups
                FROM user_groups ug
                LEFT JOIN tracked_users tu ON ug.user_id = tu.user_id
                WHERE ug.group_id IN ({placeholders}) AND ug.user_id != ?
                GROUP BY ug.user_id
                ORDER BY shared_groups DESC
                LIMIT 20
            ''', (*group_ids, user_id))
            
            connected_users = []
            for row in rows:
                display_name = row['username'] or f"{row['first_name'] or ''} {row['last_name'] or ''}".strip() or f"User {row['user_id']}"
                connected_users.append({
                    "userId": row['user_id'],
                    "displayName": display_name,
                    "valueLevel": row['value_level'],
                    "sharedGroups": row['shared_groups']
                })
            
            return {
                "success": True,
                "userId": user_id,
                "totalGroups": len(group_ids),
                "connectedUsers": connected_users
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_tracking_effectiveness(self) -> Dict[str, Any]:
        """Calculate tracking effectiveness metrics"""
        try:
            # Overall success rate
            total_row = await self.db.fetch_one('''
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                    AVG(groups_found) as avg_groups,
                    AVG(new_groups) as avg_new,
                    AVG(high_value_groups) as avg_hv
                FROM user_tracking_logs
            ''')
            
            total = total_row['total'] or 0
            completed = total_row['completed'] or 0
            
            # Groups discovery efficiency
            groups_row = await self.db.fetch_one('''
                SELECT 
                    COUNT(DISTINCT group_id) as unique_groups,
                    SUM(is_high_value) as high_value_count
                FROM user_groups
            ''')
            
            return {
                "success": True,
                "effectiveness": {
                    "totalTrackingAttempts": total,
                    "successfulTracks": completed,
                    "failedTracks": total_row['failed'] or 0,
                    "successRate": round(completed / total * 100, 1) if total > 0 else 0,
                    "avgGroupsPerTrack": round(total_row['avg_groups'] or 0, 1),
                    "avgNewGroupsPerTrack": round(total_row['avg_new'] or 0, 1),
                    "avgHighValuePerTrack": round(total_row['avg_hv'] or 0, 1),
                    "uniqueGroupsDiscovered": groups_row['unique_groups'] or 0,
                    "highValueGroupsDiscovered": groups_row['high_value_count'] or 0
                }
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}


# Global instance
user_analytics: Optional[UserAnalytics] = None


def init_user_analytics(db) -> UserAnalytics:
    """Initialize user analytics"""
    global user_analytics
    user_analytics = UserAnalytics(db)
    return user_analytics


def get_user_analytics() -> Optional[UserAnalytics]:
    """Get user analytics instance"""
    return user_analytics
