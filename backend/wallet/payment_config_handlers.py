"""
支付配置管理 API
Payment Configuration Admin Handlers

Phase 1.1 & 1.2 實現：
1. 收款地址 CRUD
2. 支付渠道配置
3. 地址池統計
"""

import os
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from aiohttp import web

from .payment_address_service import get_payment_address_service
from .models import AddressNetwork, AddressStatus

logger = logging.getLogger(__name__)

# JWT 配置
JWT_SECRET = os.environ.get('JWT_SECRET', 'tgmatrix-jwt-secret-2026')
JWT_ALGORITHM = 'HS256'


class PaymentConfigHandlers:
    """支付配置處理器"""
    
    def __init__(self):
        self.address_service = get_payment_address_service()
    
    def _verify_admin(self, request: web.Request) -> Optional[Dict]:
        """驗證管理員身份"""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header[7:]
        
        # 優先使用 auth 模塊的驗證函數
        try:
            from auth.utils import verify_token as auth_verify_token
            payload = auth_verify_token(token)
            if not payload:
                return None
            
            # 檢查是否是管理員
            is_admin = (
                payload.get('is_admin', False) or 
                payload.get('type') == 'admin' or
                payload.get('admin_id') is not None or
                payload.get('role') == 'admin'
            )
            
            if not is_admin:
                return None
            
            return payload
        except ImportError:
            pass
        
        # 備用：使用 PyJWT
        try:
            import jwt
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            is_admin = (
                payload.get('is_admin', False) or 
                payload.get('type') == 'admin' or
                payload.get('admin_id') is not None
            )
            return payload if is_admin else None
        except:
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
    
    # ==================== 地址管理 ====================
    
    async def list_addresses(self, request: web.Request) -> web.Response:
        """
        獲取收款地址列表
        
        GET /api/admin/payment/addresses?network=trc20&status=active&page=1
        """
        try:
            self._require_admin(request)
            
            network = request.query.get('network')
            status = request.query.get('status')
            page = int(request.query.get('page', 1))
            page_size = min(int(request.query.get('page_size', 20)), 100)
            
            addresses, total = self.address_service.list_addresses(
                network=network,
                status=status,
                page=page,
                page_size=page_size
            )
            
            return self._success_response({
                "addresses": [addr.to_dict() for addr in addresses],
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "total_pages": (total + page_size - 1) // page_size
                }
            })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"List addresses error: {e}")
            return self._error_response(str(e), "LIST_ERROR", 500)
    
    async def add_address(self, request: web.Request) -> web.Response:
        """
        添加收款地址
        
        POST /api/admin/payment/addresses
        {
            "network": "trc20",
            "address": "TxxxxxxxxxxxxxxxxxxxxxxxxxxxxE",
            "label": "主要地址",
            "priority": 0,
            "max_usage": 100
        }
        """
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id') or admin.get('sub') or 'admin'
            
            data = await request.json()
            
            network = data.get('network', '').strip()
            address = data.get('address', '').strip()
            label = data.get('label', '')
            priority = int(data.get('priority', 0))
            max_usage = int(data.get('max_usage', 0))
            
            if not network or not address:
                return self._error_response("網絡類型和地址不能為空", "MISSING_FIELDS")
            
            success, message, addr = self.address_service.add_address(
                network=network,
                address=address,
                label=label,
                priority=priority,
                max_usage=max_usage,
                created_by=admin_id
            )
            
            if success:
                logger.info(f"Admin {admin_id} added payment address: {network}/{address[:10]}...")
                return self._success_response(addr.to_dict(), "地址添加成功")
            else:
                return self._error_response(message, "ADD_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Add address error: {e}")
            return self._error_response(str(e), "ADD_ERROR", 500)
    
    async def update_address(self, request: web.Request) -> web.Response:
        """
        更新地址信息
        
        PUT /api/admin/payment/addresses/{address_id}
        {
            "label": "新標籤",
            "status": "active",
            "priority": 1
        }
        """
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id') or admin.get('sub') or 'admin'
            
            address_id = request.match_info.get('address_id')
            if not address_id:
                return self._error_response("地址ID不能為空", "MISSING_ID")
            
            data = await request.json()
            
            success, message = self.address_service.update_address(
                address_id=address_id,
                label=data.get('label'),
                status=data.get('status'),
                priority=data.get('priority'),
                max_usage=data.get('max_usage')
            )
            
            if success:
                logger.info(f"Admin {admin_id} updated payment address: {address_id}")
                return self._success_response(None, message)
            else:
                return self._error_response(message, "UPDATE_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Update address error: {e}")
            return self._error_response(str(e), "UPDATE_ERROR", 500)
    
    async def delete_address(self, request: web.Request) -> web.Response:
        """
        刪除地址（軟刪除）
        
        DELETE /api/admin/payment/addresses/{address_id}
        """
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id') or admin.get('sub') or 'admin'
            
            address_id = request.match_info.get('address_id')
            if not address_id:
                return self._error_response("地址ID不能為空", "MISSING_ID")
            
            success, message = self.address_service.delete_address(address_id)
            
            if success:
                logger.info(f"Admin {admin_id} deleted payment address: {address_id}")
                return self._success_response(None, "地址已刪除")
            else:
                return self._error_response(message, "DELETE_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Delete address error: {e}")
            return self._error_response(str(e), "DELETE_ERROR", 500)
    
    async def batch_add_addresses(self, request: web.Request) -> web.Response:
        """
        批量添加地址
        
        POST /api/admin/payment/addresses/batch
        {
            "network": "trc20",
            "addresses": [
                {"address": "Txxxx1", "label": "地址1"},
                {"address": "Txxxx2", "label": "地址2"}
            ]
        }
        """
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id') or admin.get('sub') or 'admin'
            
            data = await request.json()
            network = data.get('network', '').strip()
            addresses = data.get('addresses', [])
            
            if not network:
                return self._error_response("網絡類型不能為空", "MISSING_NETWORK")
            
            if not addresses:
                return self._error_response("地址列表不能為空", "MISSING_ADDRESSES")
            
            results = []
            success_count = 0
            
            for i, item in enumerate(addresses):
                addr_str = item.get('address', '').strip() if isinstance(item, dict) else str(item).strip()
                label = item.get('label', f'批量導入 #{i+1}') if isinstance(item, dict) else f'批量導入 #{i+1}'
                
                success, message, addr = self.address_service.add_address(
                    network=network,
                    address=addr_str,
                    label=label,
                    created_by=admin_id
                )
                
                results.append({
                    "address": addr_str[:10] + "..." if len(addr_str) > 10 else addr_str,
                    "success": success,
                    "message": message
                })
                
                if success:
                    success_count += 1
            
            logger.info(f"Admin {admin_id} batch added {success_count}/{len(addresses)} addresses")
            
            return self._success_response({
                "total": len(addresses),
                "success_count": success_count,
                "results": results
            }, f"成功添加 {success_count}/{len(addresses)} 個地址")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Batch add addresses error: {e}")
            return self._error_response(str(e), "BATCH_ERROR", 500)
    
    # ==================== 渠道配置 ====================
    
    async def list_channels(self, request: web.Request) -> web.Response:
        """
        獲取支付渠道列表
        
        GET /api/admin/payment/channels
        """
        try:
            self._require_admin(request)
            
            channels = self.address_service.get_all_channels()
            
            return self._success_response({
                "channels": channels
            })
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"List channels error: {e}")
            return self._error_response(str(e), "LIST_ERROR", 500)
    
    async def update_channel(self, request: web.Request) -> web.Response:
        """
        更新支付渠道配置
        
        PUT /api/admin/payment/channels/{channel_type}
        {
            "enabled": true,
            "fee_rate": 0.02,
            "min_amount": 500,
            "max_amount": 100000
        }
        """
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id') or admin.get('sub') or 'admin'
            
            channel_type = request.match_info.get('channel_type')
            if not channel_type:
                return self._error_response("渠道類型不能為空", "MISSING_TYPE")
            
            data = await request.json()
            
            success, message = self.address_service.update_channel(
                channel_type=channel_type,
                enabled=data.get('enabled'),
                fee_rate=data.get('fee_rate'),
                min_amount=data.get('min_amount'),
                max_amount=data.get('max_amount'),
                daily_limit=data.get('daily_limit'),
                priority=data.get('priority')
            )
            
            if success:
                logger.info(f"Admin {admin_id} updated payment channel: {channel_type}")
                return self._success_response(None, message)
            else:
                return self._error_response(message, "UPDATE_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Update channel error: {e}")
            return self._error_response(str(e), "UPDATE_ERROR", 500)
    
    async def toggle_channel(self, request: web.Request) -> web.Response:
        """
        快速啟用/停用渠道
        
        POST /api/admin/payment/channels/{channel_type}/toggle
        """
        try:
            admin = self._require_admin(request)
            admin_id = admin.get('admin_id') or admin.get('sub') or 'admin'
            
            channel_type = request.match_info.get('channel_type')
            if not channel_type:
                return self._error_response("渠道類型不能為空", "MISSING_TYPE")
            
            # 獲取當前狀態
            channels = self.address_service.get_all_channels()
            current = next((c for c in channels if c['channel_type'] == channel_type), None)
            
            if not current:
                return self._error_response("渠道不存在", "NOT_FOUND", 404)
            
            new_enabled = not current['enabled']
            
            success, message = self.address_service.update_channel(
                channel_type=channel_type,
                enabled=new_enabled
            )
            
            if success:
                status_text = "啟用" if new_enabled else "停用"
                logger.info(f"Admin {admin_id} toggled channel {channel_type} to {status_text}")
                return self._success_response({
                    "enabled": new_enabled
                }, f"渠道已{status_text}")
            else:
                return self._error_response(message, "TOGGLE_FAILED")
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Toggle channel error: {e}")
            return self._error_response(str(e), "TOGGLE_ERROR", 500)
    
    # ==================== 統計 ====================
    
    async def get_stats(self, request: web.Request) -> web.Response:
        """
        獲取地址池統計
        
        GET /api/admin/payment/stats
        """
        try:
            self._require_admin(request)
            
            stats = self.address_service.get_address_stats()
            
            return self._success_response(stats)
            
        except web.HTTPUnauthorized:
            raise
        except Exception as e:
            logger.error(f"Get stats error: {e}")
            return self._error_response(str(e), "STATS_ERROR", 500)


# ==================== 路由設置 ====================

def setup_payment_config_routes(app: web.Application):
    """設置支付配置路由"""
    handlers = PaymentConfigHandlers()
    
    # 地址管理
    app.router.add_get('/api/admin/payment/addresses', handlers.list_addresses)
    app.router.add_post('/api/admin/payment/addresses', handlers.add_address)
    app.router.add_post('/api/admin/payment/addresses/batch', handlers.batch_add_addresses)
    app.router.add_put('/api/admin/payment/addresses/{address_id}', handlers.update_address)
    app.router.add_delete('/api/admin/payment/addresses/{address_id}', handlers.delete_address)
    
    # 渠道配置
    app.router.add_get('/api/admin/payment/channels', handlers.list_channels)
    app.router.add_put('/api/admin/payment/channels/{channel_type}', handlers.update_channel)
    app.router.add_post('/api/admin/payment/channels/{channel_type}/toggle', handlers.toggle_channel)
    
    # 統計
    app.router.add_get('/api/admin/payment/stats', handlers.get_stats)
    
    logger.info("✅ Payment Config API routes registered")


# 全局處理器實例
payment_config_handlers = PaymentConfigHandlers()
