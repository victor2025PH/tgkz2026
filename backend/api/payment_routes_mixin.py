#!/usr/bin/env python3
"""
P9-1: Payment Routes Mixin
Extracted from http_server.py (~700 lines)

Contains: subscriptions, Stripe/PayPal/Alipay/WeChat webhooks, invoices,
financial reports, quota packs, billing, overage, freeze status

Usage: HttpApiServer(..., PaymentRoutesMixin, ...) inheritance
"""
import logging

logger = logging.getLogger(__name__)


class PaymentRoutesMixin:
    """Payment/subscription route handlers mixin"""

    # ==================== 支付和訂閱 ====================
    
    async def get_subscription(self, request):
        """獲取用戶訂閱"""
        try:
            from core.payment_service import get_payment_service
            service = get_payment_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            sub = await service.get_subscription(user_id)
            if sub:
                return self._json_response({'success': True, 'data': sub.to_dict()})
            return self._json_response({'success': True, 'data': None})
        except Exception as e:
            logger.error(f"Get subscription error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def create_checkout(self, request):
        """創建結帳會話"""
        try:
            from core.payment_service import get_payment_service
            service = get_payment_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            data = await request.json()
            plan_id = data.get('plan_id')
            billing_cycle = data.get('billing_cycle', 'monthly')
            success_url = data.get('success_url', '')
            cancel_url = data.get('cancel_url', '')
            
            result = await service.create_checkout(
                user_id=user_id,
                plan_id=plan_id,
                billing_cycle=billing_cycle,
                success_url=success_url,
                cancel_url=cancel_url
            )
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Create checkout error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def cancel_subscription(self, request):
        """取消訂閱"""
        try:
            from core.payment_service import get_payment_service
            service = get_payment_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            result = await service.cancel_subscription(user_id)
            return self._json_response(result)
        except Exception as e:
            logger.error(f"Cancel subscription error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_plans(self, request):
        """獲取訂閱方案列表"""
        try:
            from core.payment_service import SUBSCRIPTION_PLANS
            return self._json_response({
                'success': True,
                'data': list(SUBSCRIPTION_PLANS.values())
            })
        except Exception as e:
            logger.error(f"Get plans error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_transactions(self, request):
        """獲取交易記錄"""
        try:
            from core.payment_service import get_payment_service
            service = get_payment_service()
            
            tenant = request.get('tenant')
            user_id = tenant.user_id if tenant else None
            
            if not user_id:
                return self._json_response({
                    'success': False,
                    'error': '未登入'
                }, 401)
            
            limit = int(request.query.get('limit', '20'))
            transactions = await service.get_transactions(user_id, limit)
            return self._json_response({
                'success': True,
                'data': [t.to_dict() for t in transactions]
            })
        except Exception as e:
            logger.error(f"Get transactions error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def stripe_webhook(self, request):
        """Stripe Webhook 處理"""
        try:
            from core.payment_service import get_payment_service
            service = get_payment_service()
            
            payload = await request.read()
            signature = request.headers.get('Stripe-Signature', '')
            
            # 驗證簽名
            provider = service.get_provider('stripe')
            if not provider.verify_webhook(payload, signature):
                return self._json_response({
                    'success': False,
                    'error': 'Invalid signature'
                }, 400)
            
            # 解析事件
            import json
            event = json.loads(payload)
            event_type = event.get('type', '')
            event_data = event.get('data', {}).get('object', {})
            
            # 處理事件
            result = await service.handle_webhook(event_type, event_data)
            return self._json_response({'success': True, **result})
        except Exception as e:
            logger.error(f"Stripe webhook error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    # ==================== 統一支付 API ====================
    
    async def create_payment(self, request):
        """創建支付"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            data = await request.json()
            amount = data.get('amount')
            provider = data.get('provider', 'demo')
            payment_type = data.get('payment_type', 'one_time')
            description = data.get('description', '')
            metadata = data.get('metadata', {})
            success_url = data.get('success_url')
            cancel_url = data.get('cancel_url')
            
            if not amount:
                return self._json_response({'success': False, 'error': '缺少金額'}, 400)
            
            from core.unified_payment import (
                get_unified_payment_service, PaymentProvider, PaymentType
            )
            service = get_unified_payment_service()
            
            try:
                provider_enum = PaymentProvider(provider)
            except ValueError:
                provider_enum = PaymentProvider.DEMO
            
            try:
                payment_type_enum = PaymentType(payment_type)
            except ValueError:
                payment_type_enum = PaymentType.ONE_TIME
            
            success, message, intent = await service.create_payment_intent(
                user_id=tenant.user_id,
                amount=amount,
                currency=data.get('currency', 'CNY'),
                provider=provider_enum,
                payment_type=payment_type_enum,
                description=description,
                metadata=metadata,
                success_url=success_url,
                cancel_url=cancel_url
            )
            
            if success and intent:
                return self._json_response({
                    'success': True,
                    'data': intent.to_dict()
                })
            else:
                return self._json_response({'success': False, 'error': message}, 400)
                
        except Exception as e:
            logger.error(f"Create payment error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_payment_status(self, request):
        """獲取支付狀態"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            intent_id = request.query.get('intent_id')
            if not intent_id:
                return self._json_response({'success': False, 'error': '缺少 intent_id'}, 400)
            
            from core.unified_payment import get_unified_payment_service
            service = get_unified_payment_service()
            
            success, state = await service.verify_payment(intent_id)
            intent = await service.get_payment_intent(intent_id)
            
            return self._json_response({
                'success': True,
                'data': {
                    'paid': success,
                    'state': state.value,
                    'intent': intent.to_dict() if intent else None
                }
            })
            
        except Exception as e:
            logger.error(f"Get payment status error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_payment_history(self, request):
        """獲取支付歷史"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            limit = int(request.query.get('limit', 50))
            
            from core.unified_payment import get_unified_payment_service
            import sqlite3
            
            service = get_unified_payment_service()
            db = sqlite3.connect(service.db_path)
            db.row_factory = sqlite3.Row
            
            rows = db.execute('''
                SELECT * FROM payment_intents 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            ''', (tenant.user_id, limit)).fetchall()
            db.close()
            
            payments = []
            for row in rows:
                payments.append({
                    'id': row['id'],
                    'amount': row['amount'],
                    'currency': row['currency'],
                    'provider': row['provider'],
                    'state': row['state'],
                    'description': row['description'],
                    'created_at': row['created_at'],
                    'completed_at': row['completed_at']
                })
            
            return self._json_response({
                'success': True,
                'data': {'payments': payments}
            })
            
        except Exception as e:
            logger.error(f"Get payment history error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def paypal_webhook(self, request):
        """PayPal Webhook 處理"""
        try:
            from core.unified_payment import get_unified_payment_service, PaymentProvider
            service = get_unified_payment_service()
            
            payload = await request.read()
            headers = dict(request.headers)
            
            success, event_type = await service.handle_webhook(
                PaymentProvider.PAYPAL, payload, headers
            )
            
            return self._json_response({'success': success, 'event': event_type})
        except Exception as e:
            logger.error(f"PayPal webhook error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def alipay_webhook(self, request):
        """支付寶 Webhook 處理"""
        try:
            from core.unified_payment import get_unified_payment_service, PaymentProvider
            service = get_unified_payment_service()
            
            payload = await request.read()
            headers = dict(request.headers)
            
            success, event_type = await service.handle_webhook(
                PaymentProvider.ALIPAY, payload, headers
            )
            
            # 支付寶需要返回特定格式
            if success:
                return self._text_response('success')
            return self._text_response('fail')
        except Exception as e:
            logger.error(f"Alipay webhook error: {e}")
            return self._text_response('fail')
    
    async def wechat_webhook(self, request):
        """微信支付 Webhook 處理"""
        try:
            from core.unified_payment import get_unified_payment_service, PaymentProvider
            service = get_unified_payment_service()
            
            payload = await request.read()
            headers = dict(request.headers)
            
            success, event_type = await service.handle_webhook(
                PaymentProvider.WECHAT, payload, headers
            )
            
            # 微信需要返回 XML
            if success:
                return self._xml_response('<xml><return_code>SUCCESS</return_code></xml>')
            return self._xml_response('<xml><return_code>FAIL</return_code></xml>')
        except Exception as e:
            logger.error(f"Wechat webhook error: {e}")
            return self._xml_response('<xml><return_code>FAIL</return_code></xml>')
    
    def _text_response(self, text: str):
        """純文本響應"""
        from aiohttp import web
        return web.Response(text=text, content_type='text/plain')
    
    def _xml_response(self, xml: str):
        """XML 響應"""
        from aiohttp import web
        return web.Response(text=xml, content_type='application/xml')
    
    # ==================== 發票 API ====================
    
    async def get_invoices(self, request):
        """獲取用戶發票列表"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            limit = int(request.query.get('limit', 50))
            
            from core.unified_payment import get_unified_payment_service
            service = get_unified_payment_service()
            
            invoices = await service.get_user_invoices(tenant.user_id, limit)
            
            return self._json_response({
                'success': True,
                'data': {'invoices': [inv.to_dict() for inv in invoices]}
            })
            
        except Exception as e:
            logger.error(f"Get invoices error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_invoice_detail(self, request):
        """獲取發票詳情"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({'success': False, 'error': '需要登入'}, 401)
            
            invoice_id = request.match_info.get('invoice_id')
            
            from core.unified_payment import get_unified_payment_service
            import sqlite3
            
            service = get_unified_payment_service()
            db = sqlite3.connect(service.db_path)
            db.row_factory = sqlite3.Row
            
            row = db.execute(
                'SELECT * FROM invoices WHERE id = ? AND user_id = ?',
                (invoice_id, tenant.user_id)
            ).fetchone()
            db.close()
            
            if not row:
                return self._json_response({'success': False, 'error': '發票不存在'}, 404)
            
            import json
            invoice_data = dict(row)
            invoice_data['items'] = json.loads(invoice_data['items']) if invoice_data['items'] else []
            
            return self._json_response({
                'success': True,
                'data': invoice_data
            })
            
        except Exception as e:
            logger.error(f"Get invoice detail error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    # ==================== 財務報表 API（管理員）====================
    
    async def admin_financial_summary(self, request):
        """管理員 - 財務摘要"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            start_date = request.query.get('start_date')
            end_date = request.query.get('end_date')
            
            if not start_date or not end_date:
                from datetime import datetime, timedelta
                end_date = datetime.utcnow().strftime('%Y-%m-%d')
                start_date = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')
            
            from core.unified_payment import get_unified_payment_service
            service = get_unified_payment_service()
            
            summary = await service.get_financial_summary(start_date, end_date)
            
            return self._json_response({
                'success': True,
                'data': summary
            })
            
        except Exception as e:
            logger.error(f"Admin financial summary error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def admin_export_financial(self, request):
        """管理員 - 導出財務報表"""
        try:
            tenant = request.get('tenant')
            if not tenant or tenant.role != 'admin':
                return self._json_response({'success': False, 'error': '需要管理員權限'}, 403)
            
            start_date = request.query.get('start_date')
            end_date = request.query.get('end_date')
            format_type = request.query.get('format', 'json')
            
            if not start_date or not end_date:
                from datetime import datetime, timedelta
                end_date = datetime.utcnow().strftime('%Y-%m-%d')
                start_date = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')
            
            from core.unified_payment import get_unified_payment_service
            service = get_unified_payment_service()
            
            result = await service.export_financial_report(start_date, end_date, format_type)
            
            if format_type == 'csv':
                from aiohttp import web
                return web.Response(
                    text=result['content'],
                    content_type='text/csv',
                    headers={
                        'Content-Disposition': f'attachment; filename="{result["filename"]}"'
                    }
                )
            
            return self._json_response({
                'success': True,
                'data': result['content']
            })
            
        except Exception as e:
            logger.error(f"Admin export financial error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    # ==================== 計費和配額包 API ====================
    
    async def get_quota_packs(self, request):
        """獲取可購買的配額包"""
        try:
            from core.billing_service import get_billing_service
            service = get_billing_service()
            
            tenant = request.get('tenant')
            user_tier = tenant.subscription_tier if tenant else 'bronze'
            
            packs = service.get_available_packs(user_tier)
            
            return self._json_response({
                'success': True,
                'data': {
                    'packs': [p.to_dict() for p in packs]
                }
            })
        except Exception as e:
            logger.error(f"Get quota packs error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def purchase_quota_pack(self, request):
        """購買配額包"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({
                    'success': False,
                    'error': '需要登入'
                }, 401)
            
            data = await request.json()
            pack_id = data.get('pack_id')
            payment_method = data.get('payment_method', 'balance')
            
            if not pack_id:
                return self._json_response({
                    'success': False,
                    'error': '缺少 pack_id'
                }, 400)
            
            from core.billing_service import get_billing_service
            service = get_billing_service()
            
            result = service.purchase_pack(tenant.user_id, pack_id, payment_method)
            return self._json_response(result)
            
        except Exception as e:
            logger.error(f"Purchase quota pack error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_my_packages(self, request):
        """獲取我的配額包"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({
                    'success': False,
                    'error': '需要登入'
                }, 401)
            
            active_only = request.query.get('active_only', 'true').lower() == 'true'
            
            from core.billing_service import get_billing_service
            service = get_billing_service()
            
            packages = service.get_user_packages(tenant.user_id, active_only)
            
            return self._json_response({
                'success': True,
                'data': {
                    'packages': [p.to_dict() for p in packages]
                }
            })
            
        except Exception as e:
            logger.error(f"Get my packages error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_user_bills(self, request):
        """獲取用戶賬單"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({
                    'success': False,
                    'error': '需要登入'
                }, 401)
            
            status = request.query.get('status')
            billing_type = request.query.get('type')
            limit = int(request.query.get('limit', 50))
            
            from core.billing_service import get_billing_service
            service = get_billing_service()
            
            bills = service.get_user_bills(tenant.user_id, status, billing_type, limit)
            
            return self._json_response({
                'success': True,
                'data': {
                    'bills': [b.to_dict() for b in bills]
                }
            })
            
        except Exception as e:
            logger.error(f"Get user bills error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def pay_bill(self, request):
        """支付賬單"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({
                    'success': False,
                    'error': '需要登入'
                }, 401)
            
            data = await request.json()
            bill_id = data.get('bill_id')
            payment_method = data.get('payment_method', 'balance')
            
            if not bill_id:
                return self._json_response({
                    'success': False,
                    'error': '缺少 bill_id'
                }, 400)
            
            from core.billing_service import get_billing_service
            service = get_billing_service()
            
            result = service.pay_bill(bill_id, payment_method)
            return self._json_response(result)
            
        except Exception as e:
            logger.error(f"Pay bill error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_overage_info(self, request):
        """獲取超額使用信息"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({
                    'success': False,
                    'error': '需要登入'
                }, 401)
            
            from core.billing_service import get_billing_service, OVERAGE_RATES
            from core.quota_service import get_quota_service
            
            billing = get_billing_service()
            quota_service = get_quota_service()
            
            # 獲取當前配額使用情況
            summary = quota_service.get_usage_summary(tenant.user_id)
            
            overage_info = {}
            for qt, rate in OVERAGE_RATES.items():
                quota_info = summary.quotas.get(qt, {})
                used = quota_info.get('used', 0)
                limit = quota_info.get('limit', 0)
                pack_bonus = billing.get_pack_bonus(tenant.user_id, qt)
                
                calc = billing.calculate_overage(tenant.user_id, qt, used, limit, pack_bonus)
                
                overage_info[qt] = {
                    'used': used,
                    'base_limit': limit,
                    'pack_bonus': pack_bonus,
                    'total_limit': limit + pack_bonus if limit != -1 else -1,
                    'overage': calc.get('overage', 0),
                    'charge': calc.get('charge', 0),
                    'rate': {
                        'unit_price': rate.unit_price,
                        'unit_size': rate.unit_size
                    }
                }
            
            return self._json_response({
                'success': True,
                'data': overage_info
            })
            
        except Exception as e:
            logger.error(f"Get overage info error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    
    async def get_freeze_status(self, request):
        """獲取配額凍結狀態"""
        try:
            tenant = request.get('tenant')
            if not tenant or not tenant.user_id:
                return self._json_response({
                    'success': False,
                    'error': '需要登入'
                }, 401)
            
            from core.billing_service import get_billing_service
            service = get_billing_service()
            
            freeze_info = service.is_quota_frozen(tenant.user_id)
            
            return self._json_response({
                'success': True,
                'data': freeze_info
            })
            
        except Exception as e:
            logger.error(f"Get freeze status error: {e}")
            return self._json_response({'success': False, 'error': str(e)}, 500)
    

