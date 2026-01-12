"""
TG-Matrix Multi-Channel Statistics
Aggregates statistics from all marketing modules for unified dashboard
"""
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional


class MultiChannelStats:
    """
    Multi-channel statistics aggregator
    
    Features:
    - Aggregate stats from all modules
    - Unified dashboard metrics
    - Trend analysis across channels
    - Performance comparisons
    """
    
    def __init__(self, db):
        self.db = db
    
    async def get_unified_overview(self, days: int = 7) -> Dict[str, Any]:
        """
        Get unified overview statistics from all channels
        
        Args:
            days: Number of days to analyze
            
        Returns:
            Unified statistics across all modules
        """
        since = (datetime.now() - timedelta(days=days)).isoformat()
        
        try:
            overview = {
                "period": f"{days} days",
                "generatedAt": datetime.now().isoformat(),
                "discovery": await self._get_discovery_stats(since),
                "monitoring": await self._get_monitoring_stats(since),
                "ads": await self._get_ads_stats(since),
                "tracking": await self._get_tracking_stats(since),
                "leads": await self._get_leads_stats(since),
                "campaigns": await self._get_campaigns_stats(since)
            }
            
            # Calculate overall metrics
            overview["totals"] = {
                "resourcesDiscovered": overview["discovery"]["totalResources"],
                "leadsGenerated": overview["leads"]["total"],
                "adsSent": overview["ads"]["totalSent"],
                "usersTracked": overview["tracking"]["totalUsers"],
                "highValueGroups": overview["tracking"]["highValueGroups"],
                "activeCampaigns": overview["campaigns"]["active"]
            }
            
            return {"success": True, **overview}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _get_discovery_stats(self, since: str) -> Dict[str, Any]:
        """Get resource discovery statistics"""
        try:
            # Total resources
            total_row = await self.db.fetch_one('''
                SELECT COUNT(*) as count FROM discovered_resources
            ''')
            total = total_row['count'] if total_row else 0
            
            # By type
            type_rows = await self.db.fetch_all('''
                SELECT resource_type, COUNT(*) as count 
                FROM discovered_resources
                GROUP BY resource_type
            ''')
            by_type = {row['resource_type']: row['count'] for row in type_rows}
            
            # By status
            status_rows = await self.db.fetch_all('''
                SELECT status, COUNT(*) as count 
                FROM discovered_resources
                GROUP BY status
            ''')
            by_status = {row['status']: row['count'] for row in status_rows}
            
            # Recent discoveries
            recent_row = await self.db.fetch_one('''
                SELECT COUNT(*) as count FROM discovered_resources
                WHERE discovered_at >= ?
            ''', (since,))
            recent = recent_row['count'] if recent_row else 0
            
            return {
                "totalResources": total,
                "recentDiscovered": recent,
                "byType": by_type,
                "byStatus": by_status,
                "joinedGroups": by_status.get("joined", 0)
            }
            
        except Exception:
            return {"totalResources": 0, "recentDiscovered": 0, "byType": {}, "byStatus": {}}
    
    async def _get_monitoring_stats(self, since: str) -> Dict[str, Any]:
        """Get monitoring statistics"""
        try:
            # Active monitoring groups
            groups_row = await self.db.fetch_one('''
                SELECT COUNT(*) as count FROM monitored_groups WHERE is_active = 1
            ''')
            active_groups = groups_row['count'] if groups_row else 0
            
            # Keyword matches
            matches_row = await self.db.fetch_one('''
                SELECT COUNT(*) as count FROM keyword_matches
                WHERE matched_at >= ?
            ''', (since,))
            keyword_matches = matches_row['count'] if matches_row else 0
            
            # Active keywords
            keywords_row = await self.db.fetch_one('''
                SELECT COUNT(*) as count FROM keywords WHERE is_active = 1
            ''')
            active_keywords = keywords_row['count'] if keywords_row else 0
            
            return {
                "activeGroups": active_groups,
                "keywordMatches": keyword_matches,
                "activeKeywords": active_keywords
            }
            
        except Exception:
            return {"activeGroups": 0, "keywordMatches": 0, "activeKeywords": 0}
    
    async def _get_ads_stats(self, since: str) -> Dict[str, Any]:
        """Get advertising statistics"""
        try:
            # Total sends
            sends_row = await self.db.fetch_one('''
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
                FROM ad_send_logs
                WHERE sent_at >= ?
            ''', (since,))
            
            total = sends_row['total'] if sends_row else 0
            success = sends_row['success'] if sends_row else 0
            
            # Active templates
            templates_row = await self.db.fetch_one('''
                SELECT COUNT(*) as count FROM ad_templates WHERE is_active = 1
            ''')
            active_templates = templates_row['count'] if templates_row else 0
            
            # Active schedules
            schedules_row = await self.db.fetch_one('''
                SELECT COUNT(*) as count FROM ad_schedules WHERE is_active = 1
            ''')
            active_schedules = schedules_row['count'] if schedules_row else 0
            
            return {
                "totalSent": total,
                "successfulSends": success,
                "failedSends": (sends_row['failed'] or 0) if sends_row else 0,
                "successRate": round((success / total * 100) if total > 0 else 0, 1),
                "activeTemplates": active_templates,
                "activeSchedules": active_schedules
            }
            
        except Exception:
            return {"totalSent": 0, "successfulSends": 0, "failedSends": 0, "successRate": 0}
    
    async def _get_tracking_stats(self, since: str) -> Dict[str, Any]:
        """Get user tracking statistics"""
        try:
            # Total tracked users
            users_row = await self.db.fetch_one('''
                SELECT COUNT(*) as count FROM tracked_users
            ''')
            total_users = users_row['count'] if users_row else 0
            
            # High value users
            hv_row = await self.db.fetch_one('''
                SELECT COUNT(*) as count FROM tracked_users
                WHERE value_level IN ('high', 'vip')
            ''')
            high_value_users = hv_row['count'] if hv_row else 0
            
            # Groups discovered
            groups_row = await self.db.fetch_one('''
                SELECT COUNT(DISTINCT group_id) as count FROM user_groups
            ''')
            total_groups = groups_row['count'] if groups_row else 0
            
            # High value groups
            hvg_row = await self.db.fetch_one('''
                SELECT COUNT(DISTINCT group_id) as count FROM user_groups
                WHERE is_high_value = 1
            ''')
            high_value_groups = hvg_row['count'] if hvg_row else 0
            
            # Recent tracking
            recent_row = await self.db.fetch_one('''
                SELECT COUNT(*) as count FROM user_tracking_logs
                WHERE timestamp >= ? AND status = 'completed'
            ''', (since,))
            recent_tracked = recent_row['count'] if recent_row else 0
            
            return {
                "totalUsers": total_users,
                "highValueUsers": high_value_users,
                "totalGroupsDiscovered": total_groups,
                "highValueGroups": high_value_groups,
                "recentTracked": recent_tracked
            }
            
        except Exception:
            return {"totalUsers": 0, "highValueUsers": 0, "totalGroupsDiscovered": 0}
    
    async def _get_leads_stats(self, since: str) -> Dict[str, Any]:
        """Get leads statistics"""
        try:
            # Total leads
            total_row = await self.db.fetch_one('''
                SELECT COUNT(*) as count FROM leads
            ''')
            total = total_row['count'] if total_row else 0
            
            # Recent leads
            recent_row = await self.db.fetch_one('''
                SELECT COUNT(*) as count FROM leads
                WHERE timestamp >= ?
            ''', (since,))
            recent = recent_row['count'] if recent_row else 0
            
            # By status
            status_rows = await self.db.fetch_all('''
                SELECT status, COUNT(*) as count FROM leads
                GROUP BY status
            ''')
            by_status = {row['status']: row['count'] for row in status_rows}
            
            # By funnel stage
            funnel_rows = await self.db.fetch_all('''
                SELECT funnel_stage, COUNT(*) as count FROM leads
                WHERE funnel_stage IS NOT NULL
                GROUP BY funnel_stage
            ''')
            by_funnel = {row['funnel_stage']: row['count'] for row in funnel_rows}
            
            return {
                "total": total,
                "recent": recent,
                "byStatus": by_status,
                "byFunnelStage": by_funnel,
                "newLeads": by_status.get("new", 0),
                "contactedLeads": by_status.get("contacted", 0),
                "convertedLeads": by_status.get("converted", 0)
            }
            
        except Exception:
            return {"total": 0, "recent": 0, "byStatus": {}, "byFunnelStage": {}}
    
    async def _get_campaigns_stats(self, since: str) -> Dict[str, Any]:
        """Get campaigns statistics"""
        try:
            # Total campaigns
            total_row = await self.db.fetch_one('''
                SELECT COUNT(*) as count FROM campaigns
            ''')
            total = total_row['count'] if total_row else 0
            
            # By status
            status_rows = await self.db.fetch_all('''
                SELECT status, COUNT(*) as count FROM campaigns
                GROUP BY status
            ''')
            by_status = {row['status']: row['count'] for row in status_rows}
            
            return {
                "total": total,
                "active": by_status.get("running", 0),
                "completed": by_status.get("completed", 0),
                "draft": by_status.get("draft", 0),
                "paused": by_status.get("paused", 0)
            }
            
        except Exception:
            return {"total": 0, "active": 0, "completed": 0}
    
    async def get_daily_trends(self, days: int = 30) -> Dict[str, Any]:
        """Get daily trends across all channels"""
        try:
            since = (datetime.now() - timedelta(days=days)).isoformat()
            
            trends = {
                "period": f"{days} days",
                "leads": await self._get_daily_leads(since),
                "ads": await self._get_daily_ads(since),
                "tracking": await self._get_daily_tracking(since)
            }
            
            return {"success": True, **trends}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _get_daily_leads(self, since: str) -> List[Dict[str, Any]]:
        """Get daily lead generation data"""
        try:
            rows = await self.db.fetch_all('''
                SELECT DATE(timestamp) as date, COUNT(*) as count
                FROM leads
                WHERE timestamp >= ?
                GROUP BY DATE(timestamp)
                ORDER BY date ASC
            ''', (since,))
            
            return [{"date": row['date'], "count": row['count']} for row in rows]
        except:
            return []
    
    async def _get_daily_ads(self, since: str) -> List[Dict[str, Any]]:
        """Get daily ad sending data"""
        try:
            rows = await self.db.fetch_all('''
                SELECT 
                    DATE(sent_at) as date, 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success
                FROM ad_send_logs
                WHERE sent_at >= ?
                GROUP BY DATE(sent_at)
                ORDER BY date ASC
            ''', (since,))
            
            return [
                {"date": row['date'], "total": row['total'], "success": row['success'] or 0} 
                for row in rows
            ]
        except:
            return []
    
    async def _get_daily_tracking(self, since: str) -> List[Dict[str, Any]]:
        """Get daily user tracking data"""
        try:
            rows = await self.db.fetch_all('''
                SELECT 
                    DATE(timestamp) as date, 
                    COUNT(*) as tracks,
                    SUM(groups_found) as groups_found
                FROM user_tracking_logs
                WHERE timestamp >= ? AND status = 'completed'
                GROUP BY DATE(timestamp)
                ORDER BY date ASC
            ''', (since,))
            
            return [
                {"date": row['date'], "tracks": row['tracks'], "groupsFound": row['groups_found'] or 0} 
                for row in rows
            ]
        except:
            return []
    
    async def get_channel_performance(self) -> Dict[str, Any]:
        """Get performance comparison across channels"""
        try:
            last_7_days = (datetime.now() - timedelta(days=7)).isoformat()
            last_30_days = (datetime.now() - timedelta(days=30)).isoformat()
            
            performance = {
                "discovery": {
                    "7d": await self._count_discoveries(last_7_days),
                    "30d": await self._count_discoveries(last_30_days)
                },
                "leads": {
                    "7d": await self._count_leads(last_7_days),
                    "30d": await self._count_leads(last_30_days)
                },
                "ads": {
                    "7d": await self._count_ads(last_7_days),
                    "30d": await self._count_ads(last_30_days)
                },
                "tracking": {
                    "7d": await self._count_tracking(last_7_days),
                    "30d": await self._count_tracking(last_30_days)
                }
            }
            
            return {"success": True, "performance": performance}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _count_discoveries(self, since: str) -> int:
        try:
            row = await self.db.fetch_one(
                'SELECT COUNT(*) as count FROM discovered_resources WHERE discovered_at >= ?',
                (since,)
            )
            return row['count'] if row else 0
        except:
            return 0
    
    async def _count_leads(self, since: str) -> int:
        try:
            row = await self.db.fetch_one(
                'SELECT COUNT(*) as count FROM leads WHERE timestamp >= ?',
                (since,)
            )
            return row['count'] if row else 0
        except:
            return 0
    
    async def _count_ads(self, since: str) -> int:
        try:
            row = await self.db.fetch_one(
                "SELECT COUNT(*) as count FROM ad_send_logs WHERE sent_at >= ? AND status = 'sent'",
                (since,)
            )
            return row['count'] if row else 0
        except:
            return 0
    
    async def _count_tracking(self, since: str) -> int:
        try:
            row = await self.db.fetch_one(
                "SELECT COUNT(*) as count FROM user_tracking_logs WHERE timestamp >= ? AND status = 'completed'",
                (since,)
            )
            return row['count'] if row else 0
        except:
            return 0
    
    async def get_funnel_analysis(self) -> Dict[str, Any]:
        """Get marketing funnel analysis"""
        try:
            # Full funnel: Discovery -> Monitoring -> Leads -> Contacted -> Converted
            
            # Resources discovered
            resources_row = await self.db.fetch_one(
                'SELECT COUNT(*) as count FROM discovered_resources'
            )
            resources = resources_row['count'] if resources_row else 0
            
            # Groups joined
            joined_row = await self.db.fetch_one(
                "SELECT COUNT(*) as count FROM discovered_resources WHERE status = 'joined'"
            )
            joined = joined_row['count'] if joined_row else 0
            
            # Total leads
            leads_row = await self.db.fetch_one(
                'SELECT COUNT(*) as count FROM leads'
            )
            leads = leads_row['count'] if leads_row else 0
            
            # Contacted leads
            contacted_row = await self.db.fetch_one(
                "SELECT COUNT(*) as count FROM leads WHERE status IN ('contacted', 'qualified', 'converted')"
            )
            contacted = contacted_row['count'] if contacted_row else 0
            
            # Converted leads
            converted_row = await self.db.fetch_one(
                "SELECT COUNT(*) as count FROM leads WHERE status = 'converted'"
            )
            converted = converted_row['count'] if converted_row else 0
            
            funnel = [
                {
                    "stage": "資源發現",
                    "count": resources,
                    "conversionRate": 100
                },
                {
                    "stage": "群組加入",
                    "count": joined,
                    "conversionRate": round((joined / resources * 100) if resources > 0 else 0, 1)
                },
                {
                    "stage": "潛在客戶",
                    "count": leads,
                    "conversionRate": round((leads / joined * 100) if joined > 0 else 0, 1)
                },
                {
                    "stage": "已聯繫",
                    "count": contacted,
                    "conversionRate": round((contacted / leads * 100) if leads > 0 else 0, 1)
                },
                {
                    "stage": "已成交",
                    "count": converted,
                    "conversionRate": round((converted / contacted * 100) if contacted > 0 else 0, 1)
                }
            ]
            
            return {
                "success": True,
                "funnel": funnel,
                "overallConversion": round((converted / resources * 100) if resources > 0 else 0, 2)
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}


# Global instance
multi_channel_stats: Optional[MultiChannelStats] = None


def init_multi_channel_stats(db) -> MultiChannelStats:
    """Initialize multi-channel stats"""
    global multi_channel_stats
    multi_channel_stats = MultiChannelStats(db)
    return multi_channel_stats


def get_multi_channel_stats() -> Optional[MultiChannelStats]:
    """Get multi-channel stats instance"""
    return multi_channel_stats
