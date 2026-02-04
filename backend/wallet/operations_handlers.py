"""
運營工具 API 處理器
Operations Tools API Handlers

Phase 3: 運營工具 API
- 批量操作 API
- 監控告警 API
- 營銷活動 API
- 增強財務報表 API

優化設計：
1. RESTful 風格 API
2. 管理員權限驗證
3. 操作審計日誌
4. 響應格式統一
"""

import os
import jwt
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from aiohttp import web

from .batch_operations import get_batch_operation_service, BatchOperationType
from .monitoring_service import get_monitoring_service, AlertSeverity
from .wallet_service import get_wallet_service

logger = logging.getLogger(__name__)

# JWT 配置
JWT_SECRET = os.environ.get('JWT_SECRET', 'tgmatrix-jwt-secret-2026')
JWT_ALGORITHM = 'HS256'


class OperationsHandlers:
    """運營工具處理器"""
    
    def __init__(self):
        self.batch_service = get_batch_operation_service()
        self.monitoring_service = get_monitoring_service()
        self.wallet_service = get_wallet_service()
    
    def _verify_admin(self, request: web.Request) -> Optional[Dict]:
        """驗證管理員身份"""
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
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def _require_admin(self, request: web.Request) -> Dict:
        """要求管理員認證"""
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
    
    # ==================== 批量操作 API ====================
    
    async def batch_adjust_balance(self, request: web.Request) -> web.Response:
        """
        批量調賬
        
        POST /api/admin/wallet/batch/adjust
        {
            "user_ids": ["user1", "user2"],
            "amount": 1000,  // 正數加款，負數扣款
            "reason": "系統補償",
            "is_bonus": false
        }
        """
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id') or admin.get('sub', 'admin')
            
            data = await request.json()
            user_ids = data.get('user_ids', [])
            amount = data.get('amount', 0)
            reason = data.get('reason', '')
            is_bonus = data.get('is_bonus', False)
            
            if not user_ids:
                return self._error_response("用戶列表不能為空", "EMPTY_USERS")
            
            if amount == 0:
                return self._error_response("調賬金額不能為0", "INVALID_AMOUNT")
            
            if len(user_ids) > 1000:
                return self._error_response("單次最多1000個用戶", "TOO_MANY_USERS")
            
            operation = await self.batch_service.batch_adjust_balance(
                user_ids=user_ids,
                amount=amount,
                reason=reason,
                operator_id=admin_id,
                is_bonus=is_bonus
            )
            
            logger.info(
                f"Admin {admin_id} executed batch adjust: "
                f"{operation.success_count}/{operation.total_count} succeeded"
            )
            
            return self._success_response({
                'operation_id': operation.id,
                'total': operation.total_count,
                'success': operation.success_count,
                'failed': operation.failed_count,
                'status': operation.status
            }, f"批量調賬完成: {operation.success_count}/{operation.total_count} 成功")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Batch adjust error: {e}")
            return self._error_response(str(e), "BATCH_ERROR", 500)
    
    async def batch_freeze(self, request: web.Request) -> web.Response:
        """
        批量凍結錢包
        
        POST /api/admin/wallet/batch/freeze
        {
            "user_ids": ["user1", "user2"],
            "reason": "違規操作"
        }
        """
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id') or admin.get('sub', 'admin')
            
            data = await request.json()
            user_ids = data.get('user_ids', [])
            reason = data.get('reason', '')
            
            if not user_ids:
                return self._error_response("用戶列表不能為空", "EMPTY_USERS")
            
            operation = await self.batch_service.batch_freeze(
                user_ids=user_ids,
                reason=reason,
                operator_id=admin_id
            )
            
            logger.warning(
                f"Admin {admin_id} batch freeze: "
                f"{operation.success_count}/{operation.total_count}"
            )
            
            return self._success_response({
                'operation_id': operation.id,
                'total': operation.total_count,
                'success': operation.success_count,
                'failed': operation.failed_count
            }, f"批量凍結完成: {operation.success_count} 個錢包")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Batch freeze error: {e}")
            return self._error_response(str(e), "BATCH_ERROR", 500)
    
    async def batch_unfreeze(self, request: web.Request) -> web.Response:
        """批量解凍錢包"""
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id') or admin.get('sub', 'admin')
            
            data = await request.json()
            user_ids = data.get('user_ids', [])
            
            if not user_ids:
                return self._error_response("用戶列表不能為空", "EMPTY_USERS")
            
            operation = await self.batch_service.batch_unfreeze(
                user_ids=user_ids,
                operator_id=admin_id
            )
            
            return self._success_response({
                'operation_id': operation.id,
                'total': operation.total_count,
                'success': operation.success_count,
                'failed': operation.failed_count
            }, f"批量解凍完成: {operation.success_count} 個錢包")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Batch unfreeze error: {e}")
            return self._error_response(str(e), "BATCH_ERROR", 500)
    
    async def campaign_reward(self, request: web.Request) -> web.Response:
        """
        營銷活動獎勵發放
        
        POST /api/admin/wallet/campaign/reward
        {
            "campaign_id": "camp_001",
            "campaign_name": "新年活動",
            "user_ids": ["user1", "user2"],
            "reward_amount": 500,
            "reward_type": "bonus"
        }
        """
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id') or admin.get('sub', 'admin')
            
            data = await request.json()
            campaign_id = data.get('campaign_id', '')
            campaign_name = data.get('campaign_name', '')
            user_ids = data.get('user_ids', [])
            reward_amount = data.get('reward_amount', 0)
            reward_type = data.get('reward_type', 'bonus')
            
            if not campaign_id or not campaign_name:
                return self._error_response("活動信息不完整", "INVALID_CAMPAIGN")
            
            if not user_ids:
                return self._error_response("用戶列表不能為空", "EMPTY_USERS")
            
            if reward_amount <= 0:
                return self._error_response("獎勵金額必須大於0", "INVALID_AMOUNT")
            
            operation = await self.batch_service.campaign_reward(
                campaign_id=campaign_id,
                campaign_name=campaign_name,
                user_ids=user_ids,
                reward_amount=reward_amount,
                operator_id=admin_id,
                reward_type=reward_type
            )
            
            logger.info(
                f"Admin {admin_id} campaign reward: {campaign_name}, "
                f"{operation.success_count}/{operation.total_count} succeeded"
            )
            
            return self._success_response({
                'operation_id': operation.id,
                'campaign_id': campaign_id,
                'total': operation.total_count,
                'success': operation.success_count,
                'failed': operation.failed_count,
                'total_amount': reward_amount * operation.success_count
            }, f"活動獎勵發放完成: {operation.success_count} 人")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Campaign reward error: {e}")
            return self._error_response(str(e), "CAMPAIGN_ERROR", 500)
    
    async def list_operations(self, request: web.Request) -> web.Response:
        """獲取批量操作記錄"""
        try:
            self._require_admin(request)
            
            op_type = request.query.get('type')
            limit = min(int(request.query.get('limit', 50)), 100)
            
            operations = self.batch_service.list_operations(
                op_type=op_type,
                limit=limit
            )
            
            return self._success_response({
                'operations': [
                    {
                        'id': op.id,
                        'type': op.type,
                        'total': op.total_count,
                        'success': op.success_count,
                        'failed': op.failed_count,
                        'status': op.status,
                        'description': op.description,
                        'operator_id': op.operator_id,
                        'created_at': op.created_at,
                        'completed_at': op.completed_at
                    }
                    for op in operations
                ]
            })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"List operations error: {e}")
            return self._error_response(str(e), "LIST_ERROR", 500)
    
    async def get_operation_detail(self, request: web.Request) -> web.Response:
        """獲取操作詳情"""
        try:
            self._require_admin(request)
            
            operation_id = request.match_info.get('operation_id')
            operation = self.batch_service.get_operation(operation_id)
            
            if not operation:
                return self._error_response("操作不存在", "NOT_FOUND", 404)
            
            return self._success_response({
                'id': operation.id,
                'type': operation.type,
                'total': operation.total_count,
                'success': operation.success_count,
                'failed': operation.failed_count,
                'status': operation.status,
                'description': operation.description,
                'params': operation.params,
                'results': operation.results[:100],  # 最多返回100條結果
                'operator_id': operation.operator_id,
                'created_at': operation.created_at,
                'completed_at': operation.completed_at
            })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get operation error: {e}")
            return self._error_response(str(e), "GET_ERROR", 500)
    
    # ==================== 監控告警 API ====================
    
    async def get_alerts(self, request: web.Request) -> web.Response:
        """獲取告警列表"""
        try:
            self._require_admin(request)
            
            severity = request.query.get('severity')
            alert_type = request.query.get('type')
            user_id = request.query.get('user_id')
            unacknowledged = request.query.get('unacknowledged') == 'true'
            limit = min(int(request.query.get('limit', 50)), 200)
            
            alerts = self.monitoring_service.get_alerts(
                severity=severity,
                alert_type=alert_type,
                user_id=user_id,
                unacknowledged_only=unacknowledged,
                limit=limit
            )
            
            return self._success_response({
                'alerts': [
                    {
                        'id': a.id,
                        'type': a.type,
                        'severity': a.severity,
                        'user_id': a.user_id,
                        'message': a.message,
                        'details': a.details,
                        'acknowledged': a.acknowledged,
                        'created_at': a.created_at
                    }
                    for a in alerts
                ],
                'total': len(alerts)
            })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get alerts error: {e}")
            return self._error_response(str(e), "GET_ERROR", 500)
    
    async def get_alert_summary(self, request: web.Request) -> web.Response:
        """獲取告警統計摘要"""
        try:
            self._require_admin(request)
            
            summary = self.monitoring_service.get_alert_summary()
            
            return self._success_response(summary)
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get alert summary error: {e}")
            return self._error_response(str(e), "GET_ERROR", 500)
    
    async def acknowledge_alert(self, request: web.Request) -> web.Response:
        """確認告警"""
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id') or admin.get('sub', 'admin')
            
            alert_id = request.match_info.get('alert_id')
            
            success = self.monitoring_service.acknowledge_alert(alert_id, admin_id)
            
            if success:
                return self._success_response(None, "告警已確認")
            else:
                return self._error_response("告警不存在", "NOT_FOUND", 404)
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Acknowledge alert error: {e}")
            return self._error_response(str(e), "ACK_ERROR", 500)
    
    async def scan_anomalies(self, request: web.Request) -> web.Response:
        """手動觸發異常掃描"""
        try:
            self._require_admin(request)
            
            alerts = self.monitoring_service.scan_anomalies()
            
            return self._success_response({
                'new_alerts': len(alerts),
                'alerts': [
                    {
                        'id': a.id,
                        'type': a.type,
                        'severity': a.severity,
                        'message': a.message
                    }
                    for a in alerts
                ]
            }, f"掃描完成，發現 {len(alerts)} 個異常")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Scan anomalies error: {e}")
            return self._error_response(str(e), "SCAN_ERROR", 500)
    
    # ==================== 增強統計 API ====================
    
    async def get_wallet_analytics(self, request: web.Request) -> web.Response:
        """獲取錢包統計分析"""
        try:
            self._require_admin(request)
            
            days = int(request.query.get('days', 30))
            
            conn = self.wallet_service._get_connection()
            cursor = conn.cursor()
            
            try:
                # 基礎統計（適配兩種表結構）
                wallet_table = self.wallet_service._wallet_table
                balance_col = self.wallet_service._balance_column
                
                cursor.execute(f'''
                    SELECT 
                        COUNT(*) as total_wallets,
                        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_wallets,
                        COUNT(CASE WHEN status = 'frozen' THEN 1 END) as frozen_wallets,
                        COALESCE(SUM({balance_col} + bonus_balance), 0) as total_balance,
                        COALESCE(SUM(total_recharged), 0) as total_recharged,
                        COALESCE(SUM(total_consumed), 0) as total_consumed
                    FROM {wallet_table}
                ''')
                stats = dict(cursor.fetchone())
                
                # 時間範圍統計
                since = (datetime.now() - timedelta(days=days)).isoformat()
                
                # 檢查 wallet_transactions 表的列結構
                cursor.execute("PRAGMA table_info(wallet_transactions)")
                tx_columns = [col[1] for col in cursor.fetchall()]
                has_bonus = 'bonus_amount' in tx_columns
                has_category = 'category' in tx_columns
                
                # 充值趨勢（按天）
                amount_expr = 'COALESCE(SUM(amount + COALESCE(bonus_amount, 0)), 0)' if has_bonus else 'COALESCE(SUM(amount), 0)'
                cursor.execute(f'''
                    SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as count,
                        {amount_expr} as amount
                    FROM wallet_transactions
                    WHERE type = 'recharge' AND created_at >= ?
                    GROUP BY DATE(created_at)
                    ORDER BY date
                ''', (since,))
                recharge_trend = [dict(row) for row in cursor.fetchall()]
                
                # 消費趨勢（按天）
                cursor.execute('''
                    SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as count,
                        COALESCE(SUM(ABS(amount)), 0) as amount
                    FROM wallet_transactions
                    WHERE type = 'consume' AND created_at >= ?
                    GROUP BY DATE(created_at)
                    ORDER BY date
                ''', (since,))
                consume_trend = [dict(row) for row in cursor.fetchall()]
                
                # 消費類目分布（如果有 category 列）
                category_distribution = []
                if has_category:
                    cursor.execute('''
                        SELECT 
                            category,
                            COUNT(*) as count,
                            COALESCE(SUM(ABS(amount)), 0) as amount
                        FROM wallet_transactions
                        WHERE type = 'consume' AND created_at >= ?
                        GROUP BY category
                        ORDER BY amount DESC
                    ''', (since,))
                    category_distribution = [dict(row) for row in cursor.fetchall()]
                
                # 用戶活躍度（有交易的用戶數）
                cursor.execute('''
                    SELECT COUNT(DISTINCT user_id) as active_users
                    FROM wallet_transactions
                    WHERE created_at >= ?
                ''', (since,))
                active_users = cursor.fetchone()['active_users']
                
                return self._success_response({
                    'overview': {
                        'total_wallets': stats['total_wallets'],
                        'active_wallets': stats['active_wallets'],
                        'frozen_wallets': stats['frozen_wallets'],
                        'total_balance': stats['total_balance'],
                        'total_balance_display': f"${stats['total_balance']/100:.2f}",
                        'total_recharged': stats['total_recharged'],
                        'total_recharged_display': f"${stats['total_recharged']/100:.2f}",
                        'total_consumed': stats['total_consumed'],
                        'total_consumed_display': f"${stats['total_consumed']/100:.2f}"
                    },
                    'period': {
                        'days': days,
                        'active_users': active_users
                    },
                    'recharge_trend': recharge_trend,
                    'consume_trend': consume_trend,
                    'category_distribution': category_distribution
                })
                
            finally:
                conn.close()
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get analytics error: {e}")
            return self._error_response(str(e), "ANALYTICS_ERROR", 500)


# ==================== 路由設置 ====================

def setup_operations_routes(app: web.Application):
    """設置運營工具路由"""
    handlers = OperationsHandlers()
    
    # 批量操作
    app.router.add_post('/api/admin/wallet/batch/adjust', handlers.batch_adjust_balance)
    app.router.add_post('/api/admin/wallet/batch/freeze', handlers.batch_freeze)
    app.router.add_post('/api/admin/wallet/batch/unfreeze', handlers.batch_unfreeze)
    app.router.add_post('/api/admin/wallet/campaign/reward', handlers.campaign_reward)
    app.router.add_get('/api/admin/wallet/operations', handlers.list_operations)
    app.router.add_get('/api/admin/wallet/operations/{operation_id}', handlers.get_operation_detail)
    
    # 監控告警
    app.router.add_get('/api/admin/wallet/alerts', handlers.get_alerts)
    app.router.add_get('/api/admin/wallet/alerts/summary', handlers.get_alert_summary)
    app.router.add_post('/api/admin/wallet/alerts/{alert_id}/acknowledge', handlers.acknowledge_alert)
    app.router.add_post('/api/admin/wallet/alerts/scan', handlers.scan_anomalies)
    
    # 統計分析
    app.router.add_get('/api/admin/wallet/analytics', handlers.get_wallet_analytics)
    
    logger.info("✅ Operations API routes registered")


# 全局處理器實例
operations_handlers = OperationsHandlers()
