"""
TG-Matrix Ad Analytics
Provides analytics and statistics for ad campaigns
"""
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from collections import defaultdict


class AdAnalytics:
    """
    Ad analytics and reporting system
    
    Features:
    - Send statistics (success/fail rates)
    - Template performance metrics
    - Account performance tracking
    - Group engagement analytics
    - Time-based analysis
    """
    
    def __init__(self, db):
        self.db = db
    
    async def get_overview_stats(self, days: int = 7) -> Dict[str, Any]:
        """
        Get overview statistics for the past N days
        
        Args:
            days: Number of days to analyze
            
        Returns:
            Overview statistics dict
        """
        try:
            since = (datetime.now() - timedelta(days=days)).isoformat()
            
            # Total sends
            total_row = await self.db.fetch_one('''
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                    SUM(CASE WHEN status = 'banned' THEN 1 ELSE 0 END) as banned,
                    SUM(CASE WHEN status = 'deleted' THEN 1 ELSE 0 END) as deleted
                FROM ad_send_logs
                WHERE sent_at >= ?
            ''', (since,))
            
            # Today's sends
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
            today_row = await self.db.fetch_one('''
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success
                FROM ad_send_logs
                WHERE sent_at >= ?
            ''', (today,))
            
            # Active templates and schedules
            templates_row = await self.db.fetch_one('''
                SELECT COUNT(*) as count FROM ad_templates WHERE is_active = 1
            ''')
            schedules_row = await self.db.fetch_one('''
                SELECT COUNT(*) as count FROM ad_schedules WHERE is_active = 1
            ''')
            
            # Unique groups reached
            groups_row = await self.db.fetch_one('''
                SELECT COUNT(DISTINCT target_group_id) as count
                FROM ad_send_logs
                WHERE sent_at >= ? AND status = 'sent'
            ''', (since,))
            
            total = total_row['total'] if total_row else 0
            success = total_row['success'] if total_row else 0
            
            return {
                "success": True,
                "period": f"{days} days",
                "overview": {
                    "totalSends": total,
                    "successfulSends": success,
                    "failedSends": (total_row['failed'] or 0) if total_row else 0,
                    "bannedSends": (total_row['banned'] or 0) if total_row else 0,
                    "deletedSends": (total_row['deleted'] or 0) if total_row else 0,
                    "successRate": round((success / total * 100) if total > 0 else 0, 1),
                    "todaySends": today_row['total'] if today_row else 0,
                    "todaySuccess": today_row['success'] if today_row else 0,
                    "activeTemplates": templates_row['count'] if templates_row else 0,
                    "activeSchedules": schedules_row['count'] if schedules_row else 0,
                    "groupsReached": groups_row['count'] if groups_row else 0
                }
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_template_stats(self, template_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Get statistics for templates
        
        Args:
            template_id: Optional specific template ID
            
        Returns:
            Template statistics
        """
        try:
            query = '''
                SELECT 
                    t.id,
                    t.name,
                    t.use_count,
                    t.success_count,
                    t.fail_count,
                    t.created_at,
                    COUNT(l.id) as recent_sends,
                    SUM(CASE WHEN l.status = 'sent' THEN 1 ELSE 0 END) as recent_success
                FROM ad_templates t
                LEFT JOIN ad_send_logs l ON t.id = l.template_id 
                    AND l.sent_at >= datetime('now', '-7 days')
            '''
            
            if template_id:
                query += ' WHERE t.id = ?'
                rows = await self.db.fetch_all(query + ' GROUP BY t.id', (template_id,))
            else:
                rows = await self.db.fetch_all(query + ' GROUP BY t.id ORDER BY t.use_count DESC')
            
            templates = []
            for row in rows:
                use_count = row['use_count'] or 0
                success_count = row['success_count'] or 0
                
                templates.append({
                    "id": row['id'],
                    "name": row['name'],
                    "totalUses": use_count,
                    "totalSuccess": success_count,
                    "totalFail": row['fail_count'] or 0,
                    "successRate": round((success_count / use_count * 100) if use_count > 0 else 0, 1),
                    "recentSends": row['recent_sends'] or 0,
                    "recentSuccess": row['recent_success'] or 0,
                    "createdAt": row['created_at']
                })
            
            return {
                "success": True,
                "templates": templates
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_schedule_stats(self, schedule_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Get statistics for schedules
        
        Args:
            schedule_id: Optional specific schedule ID
            
        Returns:
            Schedule statistics
        """
        try:
            query = '''
                SELECT 
                    s.*,
                    t.name as template_name
                FROM ad_schedules s
                LEFT JOIN ad_templates t ON s.template_id = t.id
            '''
            
            if schedule_id:
                query += ' WHERE s.id = ?'
                rows = await self.db.fetch_all(query, (schedule_id,))
            else:
                rows = await self.db.fetch_all(query + ' ORDER BY s.run_count DESC')
            
            schedules = []
            for row in rows:
                run_count = row['run_count'] or 0
                success_count = row['success_count'] or 0
                
                schedules.append({
                    "id": row['id'],
                    "name": row['name'],
                    "templateId": row['template_id'],
                    "templateName": row['template_name'],
                    "sendMode": row['send_mode'],
                    "scheduleType": row['schedule_type'],
                    "isActive": bool(row['is_active']),
                    "totalRuns": run_count,
                    "successCount": success_count,
                    "failCount": row['fail_count'] or 0,
                    "successRate": round((success_count / run_count * 100) if run_count > 0 else 0, 1),
                    "lastRunAt": row['last_run_at'],
                    "nextRunAt": row['next_run_at']
                })
            
            return {
                "success": True,
                "schedules": schedules
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_account_stats(self, days: int = 7) -> Dict[str, Any]:
        """
        Get statistics by account
        
        Args:
            days: Number of days to analyze
            
        Returns:
            Account statistics
        """
        try:
            since = (datetime.now() - timedelta(days=days)).isoformat()
            
            rows = await self.db.fetch_all('''
                SELECT 
                    account_phone,
                    COUNT(*) as total_sends,
                    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                    SUM(CASE WHEN status = 'banned' THEN 1 ELSE 0 END) as banned,
                    COUNT(DISTINCT target_group_id) as groups_reached,
                    MAX(sent_at) as last_send
                FROM ad_send_logs
                WHERE sent_at >= ?
                GROUP BY account_phone
                ORDER BY total_sends DESC
            ''', (since,))
            
            accounts = []
            for row in rows:
                total = row['total_sends'] or 0
                success = row['success'] or 0
                
                accounts.append({
                    "phone": row['account_phone'],
                    "totalSends": total,
                    "success": success,
                    "failed": row['failed'] or 0,
                    "banned": row['banned'] or 0,
                    "successRate": round((success / total * 100) if total > 0 else 0, 1),
                    "groupsReached": row['groups_reached'] or 0,
                    "lastSend": row['last_send']
                })
            
            return {
                "success": True,
                "period": f"{days} days",
                "accounts": accounts
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_group_stats(self, days: int = 7) -> Dict[str, Any]:
        """
        Get statistics by group
        
        Args:
            days: Number of days to analyze
            
        Returns:
            Group statistics
        """
        try:
            since = (datetime.now() - timedelta(days=days)).isoformat()
            
            rows = await self.db.fetch_all('''
                SELECT 
                    target_group_id,
                    target_group_title,
                    COUNT(*) as total_sends,
                    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success,
                    SUM(CASE WHEN status = 'deleted' THEN 1 ELSE 0 END) as deleted,
                    SUM(CASE WHEN status = 'banned' THEN 1 ELSE 0 END) as banned,
                    MAX(sent_at) as last_send
                FROM ad_send_logs
                WHERE sent_at >= ?
                GROUP BY target_group_id
                ORDER BY total_sends DESC
                LIMIT 100
            ''', (since,))
            
            groups = []
            for row in rows:
                total = row['total_sends'] or 0
                success = row['success'] or 0
                
                groups.append({
                    "groupId": row['target_group_id'],
                    "groupTitle": row['target_group_title'] or row['target_group_id'],
                    "totalSends": total,
                    "success": success,
                    "deleted": row['deleted'] or 0,
                    "banned": row['banned'] or 0,
                    "successRate": round((success / total * 100) if total > 0 else 0, 1),
                    "lastSend": row['last_send']
                })
            
            return {
                "success": True,
                "period": f"{days} days",
                "groups": groups
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_daily_stats(self, days: int = 30) -> Dict[str, Any]:
        """
        Get daily send statistics for charts
        
        Args:
            days: Number of days to analyze
            
        Returns:
            Daily statistics for charting
        """
        try:
            since = (datetime.now() - timedelta(days=days)).isoformat()
            
            rows = await self.db.fetch_all('''
                SELECT 
                    DATE(sent_at) as date,
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
                FROM ad_send_logs
                WHERE sent_at >= ?
                GROUP BY DATE(sent_at)
                ORDER BY date ASC
            ''', (since,))
            
            daily_data = []
            for row in rows:
                daily_data.append({
                    "date": row['date'],
                    "total": row['total'] or 0,
                    "success": row['success'] or 0,
                    "failed": row['failed'] or 0
                })
            
            return {
                "success": True,
                "period": f"{days} days",
                "dailyStats": daily_data
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_hourly_distribution(self, days: int = 7) -> Dict[str, Any]:
        """
        Get hourly distribution of sends
        
        Args:
            days: Number of days to analyze
            
        Returns:
            Hourly distribution data
        """
        try:
            since = (datetime.now() - timedelta(days=days)).isoformat()
            
            rows = await self.db.fetch_all('''
                SELECT 
                    CAST(strftime('%H', sent_at) AS INTEGER) as hour,
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success
                FROM ad_send_logs
                WHERE sent_at >= ?
                GROUP BY hour
                ORDER BY hour ASC
            ''', (since,))
            
            # Fill in all hours
            hourly_data = {i: {"total": 0, "success": 0} for i in range(24)}
            
            for row in rows:
                hour = row['hour']
                hourly_data[hour] = {
                    "total": row['total'] or 0,
                    "success": row['success'] or 0
                }
            
            return {
                "success": True,
                "period": f"{days} days",
                "hourlyDistribution": [
                    {"hour": h, **data}
                    for h, data in sorted(hourly_data.items())
                ]
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}


# Global instance
ad_analytics: Optional[AdAnalytics] = None


def init_ad_analytics(db) -> AdAnalytics:
    """Initialize ad analytics"""
    global ad_analytics
    ad_analytics = AdAnalytics(db)
    return ad_analytics


def get_ad_analytics() -> Optional[AdAnalytics]:
    """Get ad analytics instance"""
    return ad_analytics
