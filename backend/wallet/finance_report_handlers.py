"""
財務報表 API 處理器
Finance Report API Handlers
"""

import os
import jwt
import csv
import io
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from aiohttp import web

from .finance_report_service import get_finance_report_service

logger = logging.getLogger(__name__)

JWT_SECRET = os.environ.get('JWT_SECRET', 'tgmatrix-jwt-secret-2026')
JWT_ALGORITHM = 'HS256'


class FinanceReportHandlers:
    """財務報表 API 處理器"""
    
    def __init__(self):
        self.report_service = get_finance_report_service()
    
    def _verify_admin(self, request: web.Request) -> Optional[Dict]:
        """驗證管理員身份（兼容主 Admin 系統）"""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header[7:]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            is_admin = (
                payload.get('is_admin', False) or 
                payload.get('type') == 'admin' or
                payload.get('admin_id') is not None
            )
            if not is_admin:
                return None
            return payload
        except:
            return None
    
    def _require_admin(self, request: web.Request) -> Dict:
        admin = self._verify_admin(request)
        if not admin:
            raise web.HTTPUnauthorized(
                text='{"success": false, "error": "需要管理員權限"}',
                content_type='application/json'
            )
        return admin
    
    def _success_response(self, data: Any = None, message: str = "success") -> web.Response:
        return web.json_response({
            "success": True,
            "message": message,
            "data": data
        })
    
    def _error_response(self, message: str, code: str = "ERROR", status: int = 400) -> web.Response:
        return web.json_response({
            "success": False,
            "error": message,
            "code": code
        }, status=status)
    
    # ==================== 報表接口 ====================
    
    async def get_overview(self, request: web.Request) -> web.Response:
        """獲取財務總覽"""
        try:
            self._require_admin(request)
            
            overview = self.report_service.get_overview()
            return self._success_response(overview)
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get overview error: {e}")
            return self._error_response(str(e), "OVERVIEW_ERROR", 500)
    
    async def get_daily_report(self, request: web.Request) -> web.Response:
        """獲取日報"""
        try:
            self._require_admin(request)
            
            date = request.query.get('date')
            report = self.report_service.get_daily_report(date)
            
            return self._success_response(report.to_dict())
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get daily report error: {e}")
            return self._error_response(str(e), "REPORT_ERROR", 500)
    
    async def get_range_report(self, request: web.Request) -> web.Response:
        """獲取日期範圍報表"""
        try:
            self._require_admin(request)
            
            start_date = request.query.get('start_date')
            end_date = request.query.get('end_date')
            
            if not start_date:
                start_date = (datetime.now() - timedelta(days=6)).strftime('%Y-%m-%d')
            if not end_date:
                end_date = datetime.now().strftime('%Y-%m-%d')
            
            # 生成日期範圍內的報表
            reports = []
            current = datetime.strptime(start_date, '%Y-%m-%d')
            end = datetime.strptime(end_date, '%Y-%m-%d')
            
            while current <= end:
                date_str = current.strftime('%Y-%m-%d')
                report = self.report_service.get_daily_report(date_str)
                reports.append(report.to_dict())
                current += timedelta(days=1)
            
            # 計算匯總
            summary = {
                "recharge_count": sum(r['recharge']['count'] for r in reports),
                "recharge_amount": sum(r['recharge']['amount'] for r in reports),
                "consume_count": sum(r['consume']['count'] for r in reports),
                "consume_amount": sum(r['consume']['amount'] for r in reports),
                "withdraw_count": sum(r['withdraw']['count'] for r in reports),
                "withdraw_amount": sum(r['withdraw']['amount'] for r in reports),
                "refund_count": sum(r['refund']['count'] for r in reports),
                "refund_amount": sum(r['refund']['amount'] for r in reports),
                "new_users": sum(r['users']['new'] for r in reports),
                "net_income": sum(r['net_income'] for r in reports)
            }
            
            return self._success_response({
                "start_date": start_date,
                "end_date": end_date,
                "reports": reports,
                "summary": summary
            })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get range report error: {e}")
            return self._error_response(str(e), "REPORT_ERROR", 500)
    
    async def get_trend(self, request: web.Request) -> web.Response:
        """獲取趨勢數據"""
        try:
            self._require_admin(request)
            
            days = int(request.query.get('days', 7))
            metric = request.query.get('metric', 'all')
            
            days = min(max(days, 1), 90)  # 限制 1-90 天
            
            data = self.report_service.get_trend_data(days, metric)
            
            return self._success_response({
                "days": days,
                "metric": metric,
                "data": data
            })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get trend error: {e}")
            return self._error_response(str(e), "TREND_ERROR", 500)
    
    async def get_category_stats(self, request: web.Request) -> web.Response:
        """獲取分類統計"""
        try:
            self._require_admin(request)
            
            start_date = request.query.get('start_date')
            end_date = request.query.get('end_date')
            
            data = self.report_service.get_consume_by_category(start_date, end_date)
            
            return self._success_response({
                "categories": data
            })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get category stats error: {e}")
            return self._error_response(str(e), "CATEGORY_ERROR", 500)
    
    async def get_top_users(self, request: web.Request) -> web.Response:
        """獲取 Top 用戶"""
        try:
            self._require_admin(request)
            
            metric = request.query.get('metric', 'consume')
            limit = int(request.query.get('limit', 10))
            start_date = request.query.get('start_date')
            end_date = request.query.get('end_date')
            
            limit = min(max(limit, 1), 100)
            
            data = self.report_service.get_top_users(
                metric=metric,
                limit=limit,
                start_date=start_date,
                end_date=end_date
            )
            
            return self._success_response({
                "metric": metric,
                "users": data
            })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get top users error: {e}")
            return self._error_response(str(e), "TOP_USERS_ERROR", 500)
    
    async def get_monthly_summary(self, request: web.Request) -> web.Response:
        """獲取月度匯總"""
        try:
            self._require_admin(request)
            
            year = request.query.get('year')
            month = request.query.get('month')
            
            year = int(year) if year else None
            month = int(month) if month else None
            
            data = self.report_service.get_monthly_summary(year, month)
            
            return self._success_response(data)
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get monthly summary error: {e}")
            return self._error_response(str(e), "MONTHLY_ERROR", 500)
    
    async def export_report(self, request: web.Request) -> web.Response:
        """導出報表"""
        try:
            self._require_admin(request)
            
            start_date = request.query.get('start_date')
            end_date = request.query.get('end_date')
            format_type = request.query.get('format', 'csv')
            
            if not start_date:
                start_date = (datetime.now() - timedelta(days=29)).strftime('%Y-%m-%d')
            if not end_date:
                end_date = datetime.now().strftime('%Y-%m-%d')
            
            # 生成報表數據
            reports = []
            current = datetime.strptime(start_date, '%Y-%m-%d')
            end = datetime.strptime(end_date, '%Y-%m-%d')
            
            while current <= end:
                date_str = current.strftime('%Y-%m-%d')
                report = self.report_service.get_daily_report(date_str)
                reports.append(report)
                current += timedelta(days=1)
            
            if format_type == 'csv':
                output = io.StringIO()
                writer = csv.writer(output)
                
                # 寫入標題
                writer.writerow([
                    '日期', '充值筆數', '充值金額', '消費筆數', '消費金額',
                    '提現筆數', '提現金額', '退款筆數', '退款金額',
                    '新增用戶', '活躍用戶', '淨收入'
                ])
                
                # 寫入數據
                for r in reports:
                    writer.writerow([
                        r.date,
                        r.recharge_count, f"${r.recharge_amount/100:.2f}",
                        r.consume_count, f"${r.consume_amount/100:.2f}",
                        r.withdraw_count, f"${r.withdraw_amount/100:.2f}",
                        r.refund_count, f"${r.refund_amount/100:.2f}",
                        r.new_users, r.active_users,
                        f"${(r.recharge_amount - r.withdraw_amount - r.refund_amount)/100:.2f}"
                    ])
                
                output.seek(0)
                
                return web.Response(
                    body=output.getvalue().encode('utf-8-sig'),
                    content_type='text/csv',
                    headers={
                        'Content-Disposition': f'attachment; filename="finance_report_{start_date}_{end_date}.csv"'
                    }
                )
            
            else:
                return self._success_response({
                    "reports": [r.to_dict() for r in reports]
                })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Export report error: {e}")
            return self._error_response(str(e), "EXPORT_ERROR", 500)


# ==================== 路由設置 ====================

def setup_finance_report_routes(app: web.Application):
    """設置財務報表路由"""
    handlers = FinanceReportHandlers()
    
    app.router.add_get('/api/admin/finance/overview', handlers.get_overview)
    app.router.add_get('/api/admin/finance/daily', handlers.get_daily_report)
    app.router.add_get('/api/admin/finance/range', handlers.get_range_report)
    app.router.add_get('/api/admin/finance/trend', handlers.get_trend)
    app.router.add_get('/api/admin/finance/categories', handlers.get_category_stats)
    app.router.add_get('/api/admin/finance/top-users', handlers.get_top_users)
    app.router.add_get('/api/admin/finance/monthly', handlers.get_monthly_summary)
    app.router.add_get('/api/admin/finance/export', handlers.export_report)
    
    logger.info("✅ Finance report API routes registered")


finance_report_handlers = FinanceReportHandlers()
