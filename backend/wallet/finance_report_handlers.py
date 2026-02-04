"""
財務報表 API 處理器
Finance Report API Handlers
"""

import logging
import os
import jwt
from aiohttp import web
from typing import Optional, Dict
from .finance_report_service import get_finance_report_service

logger = logging.getLogger(__name__)

JWT_SECRET = os.environ.get('JWT_SECRET', 'tgmatrix-jwt-secret-2026')


class FinanceReportHandlers:
    """財務報表 API 處理器"""
    
    def __init__(self):
        self.service = get_finance_report_service()
    
    def _verify_admin_token(self, request: web.Request) -> Optional[Dict]:
        """驗證管理員令牌"""
        auth_header = request.headers.get('Authorization', '')
        
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header[7:]
        
        try:
            # 使用 auth.utils 的驗證方法
            from auth.utils import verify_token as auth_verify_token
            return auth_verify_token(token)
        except ImportError:
            pass
        
        # 備用：PyJWT
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            return payload
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return None
    
    async def get_dashboard(self, request: web.Request) -> web.Response:
        """
        獲取財務儀表板概覽
        
        GET /api/admin/finance/dashboard
        
        Returns:
            今日/本週/本月統計
        """
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response(
                {"success": False, "message": "未授權"},
                status=401
            )
        
        try:
            overview = self.service.get_dashboard_overview()
            
            return web.json_response({
                "success": True,
                "data": overview
            })
            
        except Exception as e:
            logger.error(f"Get dashboard error: {e}")
            return web.json_response(
                {"success": False, "message": str(e)},
                status=500
            )
    
    async def get_channel_analysis(self, request: web.Request) -> web.Response:
        """
        獲取支付渠道分析
        
        GET /api/admin/finance/channels?days=30
        
        Returns:
            各渠道使用情況
        """
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response(
                {"success": False, "message": "未授權"},
                status=401
            )
        
        try:
            days = int(request.query.get('days', 30))
            analysis = self.service.get_channel_analysis(days)
            
            return web.json_response({
                "success": True,
                "data": analysis
            })
            
        except Exception as e:
            logger.error(f"Get channel analysis error: {e}")
            return web.json_response(
                {"success": False, "message": str(e)},
                status=500
            )
    
    async def get_daily_trend(self, request: web.Request) -> web.Response:
        """
        獲取每日趨勢
        
        GET /api/admin/finance/trend?days=14
        
        Returns:
            每日統計數據
        """
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response(
                {"success": False, "message": "未授權"},
                status=401
            )
        
        try:
            days = int(request.query.get('days', 14))
            trend = self.service.get_daily_trend(days)
            
            return web.json_response({
                "success": True,
                "data": trend
            })
            
        except Exception as e:
            logger.error(f"Get daily trend error: {e}")
            return web.json_response(
                {"success": False, "message": str(e)},
                status=500
            )
    
    async def get_address_report(self, request: web.Request) -> web.Response:
        """
        獲取收款地址使用報告
        
        GET /api/admin/finance/addresses
        
        Returns:
            地址使用統計
        """
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response(
                {"success": False, "message": "未授權"},
                status=401
            )
        
        try:
            report = self.service.get_address_usage_report()
            
            return web.json_response({
                "success": True,
                "data": report
            })
            
        except Exception as e:
            logger.error(f"Get address report error: {e}")
            return web.json_response(
                {"success": False, "message": str(e)},
                status=500
            )
    
    # ==================== 兼容 http_server.py 的方法別名 ====================
    
    async def get_overview(self, request: web.Request) -> web.Response:
        """概覽（別名：get_dashboard）"""
        return await self.get_dashboard(request)
    
    async def get_daily_report(self, request: web.Request) -> web.Response:
        """每日報告"""
        return await self.get_dashboard(request)
    
    async def get_range_report(self, request: web.Request) -> web.Response:
        """範圍報告"""
        return await self.get_channel_analysis(request)
    
    async def get_trend(self, request: web.Request) -> web.Response:
        """趨勢（別名：get_daily_trend）"""
        return await self.get_daily_trend(request)
    
    async def get_category_stats(self, request: web.Request) -> web.Response:
        """分類統計"""
        return await self.get_channel_analysis(request)
    
    async def get_top_users(self, request: web.Request) -> web.Response:
        """TOP 用戶（佔位）"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({"success": False, "message": "未授權"}, status=401)
        
        return web.json_response({
            "success": True,
            "data": {"users": [], "message": "待實現"}
        })
    
    async def get_monthly_summary(self, request: web.Request) -> web.Response:
        """月度摘要"""
        return await self.get_dashboard(request)
    
    async def export_report(self, request: web.Request) -> web.Response:
        """導出報表（佔位）"""
        admin = self._verify_admin_token(request)
        if not admin:
            return web.json_response({"success": False, "message": "未授權"}, status=401)
        
        return web.json_response({
            "success": True,
            "data": {"message": "導出功能待實現"}
        })


# ==================== 路由設置 ====================

def setup_finance_report_routes(app: web.Application):
    """設置財務報表路由"""
    handlers = FinanceReportHandlers()
    
    app.router.add_get('/api/admin/finance/dashboard', handlers.get_dashboard)
    app.router.add_get('/api/admin/finance/channels', handlers.get_channel_analysis)
    app.router.add_get('/api/admin/finance/trend', handlers.get_daily_trend)
    app.router.add_get('/api/admin/finance/addresses', handlers.get_address_report)
    
    logger.info("✅ Finance Report API routes registered")


# 全局處理器實例
finance_report_handlers: Optional[FinanceReportHandlers] = None


def get_finance_report_handlers() -> FinanceReportHandlers:
    """獲取財務報表處理器實例"""
    global finance_report_handlers
    if finance_report_handlers is None:
        finance_report_handlers = FinanceReportHandlers()
    return finance_report_handlers
