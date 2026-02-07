"""
🔧 P12-4: 業務分析看板

為普通用戶提供的業務數據分析：
1. 線索來源分析（哪些群組帶來最多線索）
2. 模板效果對比（哪個模板成功率最高）
3. 活動 ROI 分析
4. 時間趨勢分析（日/週/月）
5. 漏斗分析
"""

import logging
import sqlite3
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class BusinessAnalytics:
    """業務分析服務"""

    def __init__(self, db_path: str = None):
        self.db_path = db_path

    def _get_conn(self) -> sqlite3.Connection:
        if self.db_path:
            conn = sqlite3.connect(self.db_path)
        else:
            from core.db_utils import get_connection
            conn = get_connection().__enter__()
        conn.row_factory = sqlite3.Row
        return conn

    def get_lead_source_analysis(self, days: int = 30, user_id: str = None) -> Dict[str, Any]:
        """
        線索來源分析：哪些群組/渠道帶來最多高質量線索
        """
        try:
            conn = self._get_conn()
            cutoff = (datetime.now() - timedelta(days=days)).isoformat()

            # 按來源群組統計
            query = '''
                SELECT 
                    source_group_title,
                    source_type,
                    COUNT(*) as total_leads,
                    AVG(COALESCE(lead_score, 0)) as avg_score,
                    SUM(CASE WHEN intent_level = 'hot' THEN 1 ELSE 0 END) as hot_leads,
                    SUM(CASE WHEN intent_level = 'warm' THEN 1 ELSE 0 END) as warm_leads,
                    SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted
                FROM unified_contacts
                WHERE created_at >= ?
                  AND source_group_title IS NOT NULL
                  AND source_group_title != ''
            '''
            params = [cutoff]
            if user_id:
                query += ' AND user_id = ?'
                params.append(user_id)

            query += '''
                GROUP BY source_group_title, source_type
                ORDER BY total_leads DESC
                LIMIT 20
            '''

            rows = conn.execute(query, params).fetchall()
            sources = [dict(row) for row in rows]

            # 總計
            total_query = 'SELECT COUNT(*) FROM unified_contacts WHERE created_at >= ?'
            total_params = [cutoff]
            if user_id:
                total_query += ' AND user_id = ?'
                total_params.append(user_id)
            total = conn.execute(total_query, total_params).fetchone()[0]

            conn.close()

            return {
                'period_days': days,
                'total_leads': total,
                'sources': sources,
                'top_source': sources[0]['source_group_title'] if sources else None,
            }
        except Exception as e:
            logger.error(f"Lead source analysis error: {e}")
            return {'error': str(e)}

    def get_template_performance(self, days: int = 30) -> Dict[str, Any]:
        """
        模板效果對比
        """
        try:
            conn = self._get_conn()

            rows = conn.execute('''
                SELECT 
                    name,
                    category,
                    usage_count,
                    success_rate,
                    last_used,
                    ROUND(usage_count * COALESCE(success_rate, 0) / 100.0, 1) as estimated_successes
                FROM chat_templates
                WHERE is_active = 1 AND usage_count > 0
                ORDER BY usage_count DESC
                LIMIT 20
            ''').fetchall()

            templates = [dict(row) for row in rows]

            # 計算總體統計
            total_usage = sum(t['usage_count'] for t in templates) if templates else 0
            avg_success = (
                sum(t['success_rate'] * t['usage_count'] for t in templates if t['success_rate'])
                / max(total_usage, 1)
            ) if templates else 0

            conn.close()

            return {
                'templates': templates,
                'total_usage': total_usage,
                'avg_success_rate': round(avg_success, 1),
                'top_template': templates[0]['name'] if templates else None,
            }
        except Exception as e:
            logger.error(f"Template performance error: {e}")
            return {'error': str(e)}

    def get_daily_trends(self, days: int = 30, user_id: str = None) -> Dict[str, Any]:
        """
        每日趨勢：線索數量、消息發送量
        """
        try:
            conn = self._get_conn()
            cutoff = (datetime.now() - timedelta(days=days)).isoformat()

            # 線索趨勢
            lead_query = '''
                SELECT DATE(created_at) as date, COUNT(*) as count
                FROM unified_contacts
                WHERE created_at >= ?
            '''
            params = [cutoff]
            if user_id:
                lead_query += ' AND user_id = ?'
                params.append(user_id)
            lead_query += ' GROUP BY DATE(created_at) ORDER BY date'

            lead_rows = conn.execute(lead_query, params).fetchall()
            lead_trend = [{'date': row['date'], 'count': row['count']} for row in lead_rows]

            # 消息趨勢
            msg_query = '''
                SELECT DATE(created_at) as date,
                       COUNT(*) as total,
                       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as sent,
                       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
                FROM message_queue
                WHERE created_at >= ?
            '''
            msg_params = [cutoff]
            if user_id:
                msg_query += ' AND user_id = ?'
                msg_params.append(user_id)
            msg_query += ' GROUP BY DATE(created_at) ORDER BY date'

            msg_rows = conn.execute(msg_query, msg_params).fetchall()
            msg_trend = [dict(row) for row in msg_rows]

            conn.close()

            return {
                'period_days': days,
                'lead_trend': lead_trend,
                'message_trend': msg_trend,
            }
        except Exception as e:
            logger.error(f"Daily trends error: {e}")
            return {'error': str(e)}

    def get_funnel_analysis(self, user_id: str = None) -> Dict[str, Any]:
        """
        漏斗分析：awareness → interest → consideration → purchase
        """
        try:
            conn = self._get_conn()

            query = 'SELECT funnel_stage, COUNT(*) as count FROM unified_contacts'
            params = []
            if user_id:
                query += ' WHERE user_id = ?'
                params.append(user_id)
            query += ' GROUP BY funnel_stage'

            rows = conn.execute(query, params).fetchall()
            stages = {row['funnel_stage']: row['count'] for row in rows}

            # 定義漏斗順序
            funnel_order = ['awareness', 'interest', 'consideration', 'purchase']
            funnel = []
            prev_count = None
            for stage in funnel_order:
                count = stages.get(stage, 0)
                conversion = round(count / prev_count * 100, 1) if prev_count and prev_count > 0 else 100.0
                funnel.append({
                    'stage': stage,
                    'count': count,
                    'conversion_pct': conversion,
                })
                prev_count = count if count > 0 else prev_count

            total = sum(stages.values())

            conn.close()

            return {
                'funnel': funnel,
                'total_contacts': total,
                'overall_conversion': round(
                    stages.get('purchase', 0) / max(stages.get('awareness', 0), 1) * 100, 1
                ),
            }
        except Exception as e:
            logger.error(f"Funnel analysis error: {e}")
            return {'error': str(e)}

    def get_summary_dashboard(self, user_id: str = None) -> Dict[str, Any]:
        """
        儀表板摘要：一個端點返回所有關鍵指標
        """
        try:
            conn = self._get_conn()

            # 總線索數
            q = 'SELECT COUNT(*) FROM unified_contacts'
            p = []
            if user_id:
                q += ' WHERE user_id = ?'
                p.append(user_id)
            total_leads = conn.execute(q, p).fetchone()[0]

            # 本週新增
            week_ago = (datetime.now() - timedelta(days=7)).isoformat()
            wq = 'SELECT COUNT(*) FROM unified_contacts WHERE created_at >= ?'
            wp = [week_ago]
            if user_id:
                wq += ' AND user_id = ?'
                wp.append(user_id)
            new_this_week = conn.execute(wq, wp).fetchone()[0]

            # 熱門線索
            hq = "SELECT COUNT(*) FROM unified_contacts WHERE intent_level = 'hot'"
            hp = []
            if user_id:
                hq += ' AND user_id = ?'
                hp.append(user_id)
            hot_leads = conn.execute(hq, hp).fetchone()[0]

            # 消息統計（本週）
            mq = 'SELECT COUNT(*) as total, SUM(CASE WHEN status = \'completed\' THEN 1 ELSE 0 END) as sent FROM message_queue WHERE created_at >= ?'
            mp = [week_ago]
            if user_id:
                mq += ' AND user_id = ?'
                mp.append(user_id)
            msg_row = conn.execute(mq, mp).fetchone()
            messages_total = msg_row[0] or 0
            messages_sent = msg_row[1] or 0

            conn.close()

            return {
                'total_leads': total_leads,
                'new_this_week': new_this_week,
                'hot_leads': hot_leads,
                'messages_this_week': messages_total,
                'messages_sent': messages_sent,
                'send_success_rate': round(messages_sent / max(messages_total, 1) * 100, 1),
            }
        except Exception as e:
            logger.error(f"Summary dashboard error: {e}")
            return {'error': str(e)}
