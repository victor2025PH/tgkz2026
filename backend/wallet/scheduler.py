"""
錢包定時任務調度器
Wallet Scheduler Service

處理定時任務：
1. 訂單過期清理
2. USDT 交易監聯
3. 每日統計報表
4. 異常告警檢測
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Callable, Dict, Any, List

logger = logging.getLogger(__name__)


class WalletScheduler:
    """錢包定時任務調度器"""
    
    def __init__(self):
        self._running = False
        self._tasks: Dict[str, asyncio.Task] = {}
        self._task_configs: Dict[str, Dict[str, Any]] = {
            'expire_orders': {
                'interval': 60,           # 每分鐘
                'enabled': True,
                'description': '過期訂單清理'
            },
            'usdt_watcher': {
                'interval': 30,           # 每30秒
                'enabled': True,
                'description': 'USDT 交易監聯'
            },
            'daily_stats': {
                'interval': 3600,         # 每小時
                'enabled': True,
                'description': '統計報表更新'
            },
            'anomaly_check': {
                'interval': 300,          # 每5分鐘
                'enabled': True,
                'description': '異常檢測'
            }
        }
    
    async def start(self):
        """啟動調度器"""
        if self._running:
            logger.warning("Scheduler already running")
            return
        
        self._running = True
        logger.info("🚀 Wallet scheduler starting...")
        
        # 啟動各個任務
        for task_name, config in self._task_configs.items():
            if config['enabled']:
                self._start_task(task_name, config)
        
        logger.info("✅ Wallet scheduler started")
    
    async def stop(self):
        """停止調度器"""
        self._running = False
        
        # 取消所有任務
        for task_name, task in self._tasks.items():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            logger.info(f"Task {task_name} stopped")
        
        self._tasks.clear()
        logger.info("Wallet scheduler stopped")
    
    def _start_task(self, task_name: str, config: Dict[str, Any]):
        """啟動單個任務"""
        handler = getattr(self, f'_task_{task_name}', None)
        if not handler:
            logger.warning(f"Task handler not found: {task_name}")
            return
        
        async def task_loop():
            while self._running:
                try:
                    await handler()
                except Exception as e:
                    logger.error(f"Task {task_name} error: {e}")
                
                await asyncio.sleep(config['interval'])
        
        self._tasks[task_name] = asyncio.create_task(task_loop())
        logger.info(f"Task {task_name} started (interval: {config['interval']}s)")
    
    # ==================== 任務處理器 ====================
    
    async def _task_expire_orders(self):
        """過期訂單清理任務"""
        from .recharge_service import get_recharge_service
        
        try:
            service = get_recharge_service()
            expired_count = service.expire_orders()
            
            if expired_count > 0:
                logger.info(f"Expired {expired_count} pending orders")
                
        except Exception as e:
            logger.error(f"Expire orders task error: {e}")
    
    async def _task_usdt_watcher(self):
        """USDT 交易監聯任務"""
        from .usdt_service import get_usdt_service
        from .recharge_service import get_recharge_service
        
        try:
            usdt_service = get_usdt_service()
            recharge_service = get_recharge_service()
            
            # 獲取待確認的 USDT 訂單
            pending_orders = recharge_service.get_pending_usdt_orders()
            
            for order in pending_orders:
                if not self._running:
                    break
                
                await self._check_usdt_order(order, usdt_service, recharge_service)
                
        except Exception as e:
            logger.error(f"USDT watcher task error: {e}")
    
    async def _check_usdt_order(self, order, usdt_service, recharge_service):
        """檢查單個 USDT 訂單"""
        try:
            # 解析訂單創建時間
            created_at = datetime.fromisoformat(
                order.created_at.replace('Z', '+00:00')
            )
            since_timestamp = int(created_at.timestamp())
            
            # 查詢交易
            found, tx_info = await usdt_service.check_transaction(
                network=order.usdt_network,
                address=order.usdt_address,
                expected_amount=order.usdt_amount,
                since_timestamp=since_timestamp,
                order_no=order.order_no
            )
            
            if found and tx_info:
                tx_hash = tx_info.get('tx_hash', '')
                
                if tx_info.get('confirmed', False):
                    # 交易已確認，自動入賬
                    success, message = recharge_service.confirm_order(
                        order.order_no,
                        usdt_tx_hash=tx_hash
                    )
                    
                    if success:
                        logger.info(
                            f"Order {order.order_no} auto-confirmed: "
                            f"{order.usdt_amount} USDT"
                        )
                        # TODO: 發送通知給用戶
                    else:
                        logger.warning(
                            f"Order {order.order_no} confirm failed: {message}"
                        )
                
                else:
                    # 交易已發現但未達到確認數
                    if order.status == 'pending':
                        recharge_service.mark_paid(
                            order.order_no,
                            usdt_tx_hash=tx_hash
                        )
                        logger.info(
                            f"Order {order.order_no} marked as paid, "
                            f"waiting for confirmations"
                        )
                        
        except Exception as e:
            logger.error(f"Check USDT order {order.order_no} error: {e}")
    
    async def _task_daily_stats(self):
        """每日統計任務"""
        from .recharge_service import get_recharge_service
        from .wallet_service import get_wallet_service
        
        try:
            recharge_service = get_recharge_service()
            wallet_service = get_wallet_service()
            
            # 獲取今日充值統計
            recharge_stats = recharge_service.get_today_recharge_stats()
            
            # 記錄統計日誌
            logger.info(
                f"Daily Stats - "
                f"Recharge: {recharge_stats['confirmed_count']} orders, "
                f"{recharge_stats['confirmed_amount_display']}"
            )
            
            # TODO: 保存到統計表，生成報表
            
        except Exception as e:
            logger.error(f"Daily stats task error: {e}")
    
    async def _task_anomaly_check(self):
        """異常檢測任務"""
        from .wallet_service import get_wallet_service
        
        try:
            wallet_service = get_wallet_service()
            conn = wallet_service._get_connection()
            cursor = conn.cursor()
            
            try:
                # 檢查異常消費（單筆超過 $500）
                one_hour_ago = (
                    datetime.now() - timedelta(hours=1)
                ).isoformat()
                
                cursor.execute('''
                    SELECT user_id, COUNT(*) as count, SUM(ABS(amount)) as total
                    FROM wallet_transactions
                    WHERE type = 'consume'
                    AND created_at >= ?
                    AND ABS(amount) > 50000
                    GROUP BY user_id
                    HAVING count > 3
                ''', (one_hour_ago,))
                
                anomalies = cursor.fetchall()
                
                for row in anomalies:
                    user_id, count, total = row
                    logger.warning(
                        f"⚠️ Anomaly detected: user={user_id}, "
                        f"large transactions={count}, total=${total/100:.2f}"
                    )
                    # TODO: 發送告警通知
                    
            finally:
                conn.close()
                
        except Exception as e:
            logger.error(f"Anomaly check task error: {e}")
    
    # ==================== 任務管理 ====================
    
    def get_task_status(self) -> Dict[str, Any]:
        """獲取任務狀態"""
        status = {}
        
        for task_name, config in self._task_configs.items():
            task = self._tasks.get(task_name)
            status[task_name] = {
                'description': config['description'],
                'enabled': config['enabled'],
                'interval': config['interval'],
                'running': task is not None and not task.done() if task else False
            }
        
        return status
    
    def enable_task(self, task_name: str):
        """啟用任務"""
        if task_name in self._task_configs:
            self._task_configs[task_name]['enabled'] = True
            
            if self._running and task_name not in self._tasks:
                self._start_task(task_name, self._task_configs[task_name])
    
    def disable_task(self, task_name: str):
        """禁用任務"""
        if task_name in self._task_configs:
            self._task_configs[task_name]['enabled'] = False
            
            if task_name in self._tasks:
                self._tasks[task_name].cancel()
                del self._tasks[task_name]


# ==================== 全局實例 ====================

_scheduler: Optional[WalletScheduler] = None


def get_scheduler() -> WalletScheduler:
    """獲取調度器實例"""
    global _scheduler
    if _scheduler is None:
        _scheduler = WalletScheduler()
    return _scheduler


async def start_scheduler():
    """啟動調度器"""
    scheduler = get_scheduler()
    await scheduler.start()


async def stop_scheduler():
    """停止調度器"""
    scheduler = get_scheduler()
    await scheduler.stop()
