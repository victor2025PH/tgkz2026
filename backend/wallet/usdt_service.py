"""
USDT 支付服務
USDT Payment Service

處理 USDT 充值的地址管理、交易監聯、確認入賬

優化設計：
1. 支持 TRC20 和 ERC20 網絡
2. 交易監聯與確認機制
3. 確認數閾值管理
4. 地址池管理（未來擴展）
5. 匯率管理
"""

import os
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
import aiohttp

logger = logging.getLogger(__name__)


# 配置
USDT_CONFIG = {
    'TRC20': {
        'api_url': 'https://apilist.tronscan.org/api',
        'contract_address': 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',  # USDT TRC20
        'confirmations_required': 20,
        'polling_interval': 30,  # 秒
    },
    'ERC20': {
        'api_url': 'https://api.etherscan.io/api',
        'contract_address': '0xdAC17F958D2ee523a2206206994597C13D831ec7',  # USDT ERC20
        'confirmations_required': 12,
        'polling_interval': 60,  # 秒
        'api_key': os.environ.get('ETHERSCAN_API_KEY', ''),
    }
}

# 最小確認金額（防止垃圾交易）
MIN_AMOUNT_USDT = 1.0


class UsdtPaymentService:
    """USDT 支付服務"""
    
    def __init__(self):
        self.trc20_address = os.environ.get('USDT_TRC20_ADDRESS', '')
        self.erc20_address = os.environ.get('USDT_ERC20_ADDRESS', '')
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """獲取 HTTP 會話"""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session
    
    async def close(self):
        """關閉會話"""
        if self._session and not self._session.closed:
            await self._session.close()
    
    # ==================== TRC20 交易查詢 ====================
    
    async def check_trc20_transaction(
        self,
        address: str,
        expected_amount: float,
        since_timestamp: int,
        order_no: str = ""
    ) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        檢查 TRC20 USDT 交易
        
        Args:
            address: 收款地址
            expected_amount: 預期金額
            since_timestamp: 起始時間戳（毫秒）
            order_no: 訂單號（用於日誌）
            
        Returns:
            (found, transaction_info)
        """
        session = await self._get_session()
        config = USDT_CONFIG['TRC20']
        
        try:
            url = f"{config['api_url']}/token_trc20/transfers"
            params = {
                'toAddress': address,
                'limit': 50,
                'start_timestamp': since_timestamp
            }
            
            async with session.get(url, params=params, timeout=30) as response:
                if response.status != 200:
                    logger.warning(f"TRC20 API error: {response.status}")
                    return False, None
                
                data = await response.json()
            
            # 查找匹配的交易
            for tx in data.get('token_transfers', []):
                # 檢查是否是 USDT
                token_info = tx.get('tokenInfo', {})
                if token_info.get('tokenAbbr') != 'USDT':
                    continue
                
                # 檢查金額
                amount = float(tx.get('quant', 0)) / 1000000  # USDT 有 6 位小數
                
                # 允許 1% 的誤差
                if abs(amount - expected_amount) <= expected_amount * 0.01:
                    tx_hash = tx.get('transaction_id', '')
                    confirmations = tx.get('confirmed', 0)
                    
                    logger.info(
                        f"Found TRC20 transaction for order {order_no}: "
                        f"amount={amount}, tx={tx_hash}, confirmations={confirmations}"
                    )
                    
                    return True, {
                        'tx_hash': tx_hash,
                        'amount': amount,
                        'from_address': tx.get('from_address', ''),
                        'to_address': tx.get('to_address', ''),
                        'confirmations': confirmations,
                        'confirmed': confirmations >= config['confirmations_required'],
                        'timestamp': tx.get('block_ts', 0),
                        'network': 'TRC20'
                    }
            
            return False, None
            
        except asyncio.TimeoutError:
            logger.warning(f"TRC20 API timeout for order {order_no}")
            return False, None
        except Exception as e:
            logger.error(f"TRC20 check error for order {order_no}: {e}")
            return False, None
    
    # ==================== ERC20 交易查詢 ====================
    
    async def check_erc20_transaction(
        self,
        address: str,
        expected_amount: float,
        since_timestamp: int,
        order_no: str = ""
    ) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        檢查 ERC20 USDT 交易
        
        Args:
            address: 收款地址
            expected_amount: 預期金額
            since_timestamp: 起始時間戳（秒）
            order_no: 訂單號
            
        Returns:
            (found, transaction_info)
        """
        session = await self._get_session()
        config = USDT_CONFIG['ERC20']
        
        if not config['api_key']:
            logger.warning("Etherscan API key not configured")
            return False, None
        
        try:
            url = config['api_url']
            params = {
                'module': 'account',
                'action': 'tokentx',
                'contractaddress': config['contract_address'],
                'address': address,
                'startblock': 0,
                'endblock': 99999999,
                'sort': 'desc',
                'apikey': config['api_key']
            }
            
            async with session.get(url, params=params, timeout=30) as response:
                if response.status != 200:
                    logger.warning(f"ERC20 API error: {response.status}")
                    return False, None
                
                data = await response.json()
            
            if data.get('status') != '1':
                return False, None
            
            # 查找匹配的交易
            for tx in data.get('result', []):
                # 檢查時間
                tx_timestamp = int(tx.get('timeStamp', 0))
                if tx_timestamp < since_timestamp:
                    continue
                
                # 檢查是否是接收
                if tx.get('to', '').lower() != address.lower():
                    continue
                
                # 檢查金額
                amount = float(tx.get('value', 0)) / 1000000  # USDT 有 6 位小數
                
                # 允許 1% 的誤差
                if abs(amount - expected_amount) <= expected_amount * 0.01:
                    tx_hash = tx.get('hash', '')
                    confirmations = int(tx.get('confirmations', 0))
                    
                    logger.info(
                        f"Found ERC20 transaction for order {order_no}: "
                        f"amount={amount}, tx={tx_hash}, confirmations={confirmations}"
                    )
                    
                    return True, {
                        'tx_hash': tx_hash,
                        'amount': amount,
                        'from_address': tx.get('from', ''),
                        'to_address': tx.get('to', ''),
                        'confirmations': confirmations,
                        'confirmed': confirmations >= config['confirmations_required'],
                        'timestamp': tx_timestamp,
                        'network': 'ERC20'
                    }
            
            return False, None
            
        except asyncio.TimeoutError:
            logger.warning(f"ERC20 API timeout for order {order_no}")
            return False, None
        except Exception as e:
            logger.error(f"ERC20 check error for order {order_no}: {e}")
            return False, None
    
    # ==================== 統一檢查接口 ====================
    
    async def check_transaction(
        self,
        network: str,
        address: str,
        expected_amount: float,
        since_timestamp: int,
        order_no: str = ""
    ) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        統一交易檢查接口
        
        Args:
            network: 網絡類型 (TRC20/ERC20)
            address: 收款地址
            expected_amount: 預期金額
            since_timestamp: 起始時間戳
            order_no: 訂單號
            
        Returns:
            (found, transaction_info)
        """
        if network == 'TRC20':
            # TRC20 使用毫秒
            return await self.check_trc20_transaction(
                address, expected_amount, since_timestamp * 1000, order_no
            )
        elif network == 'ERC20':
            # ERC20 使用秒
            return await self.check_erc20_transaction(
                address, expected_amount, since_timestamp, order_no
            )
        else:
            logger.warning(f"Unknown network: {network}")
            return False, None
    
    # ==================== 匯率管理 ====================
    
    async def get_usdt_rate(self) -> float:
        """
        獲取 USDT/USD 匯率
        
        Returns:
            1 USDT 對應多少 USD（通常接近 1.0）
        """
        session = await self._get_session()
        
        try:
            # 使用 CoinGecko 免費 API
            url = 'https://api.coingecko.com/api/v3/simple/price'
            params = {
                'ids': 'tether',
                'vs_currencies': 'usd'
            }
            
            async with session.get(url, params=params, timeout=10) as response:
                if response.status == 200:
                    data = await response.json()
                    rate = data.get('tether', {}).get('usd', 1.0)
                    return rate
            
            return 1.0  # 默認 1:1
            
        except Exception as e:
            logger.warning(f"Get USDT rate error: {e}, using default 1.0")
            return 1.0
    
    # ==================== 地址驗證 ====================
    
    def validate_trc20_address(self, address: str) -> bool:
        """驗證 TRC20 地址格式"""
        if not address:
            return False
        
        # TRC20 地址以 T 開頭，34 個字符
        if not address.startswith('T'):
            return False
        
        if len(address) != 34:
            return False
        
        # 基本字符檢查
        import re
        if not re.match(r'^T[1-9A-HJ-NP-Za-km-z]{33}$', address):
            return False
        
        return True
    
    def validate_erc20_address(self, address: str) -> bool:
        """驗證 ERC20 地址格式"""
        if not address:
            return False
        
        # ERC20 地址以 0x 開頭，42 個字符
        if not address.startswith('0x'):
            return False
        
        if len(address) != 42:
            return False
        
        # 基本字符檢查
        import re
        if not re.match(r'^0x[0-9a-fA-F]{40}$', address):
            return False
        
        return True
    
    def validate_address(self, network: str, address: str) -> bool:
        """驗證地址格式"""
        if network == 'TRC20':
            return self.validate_trc20_address(address)
        elif network == 'ERC20':
            return self.validate_erc20_address(address)
        return False


# ==================== 交易監聯任務 ====================

class UsdtPaymentWatcher:
    """USDT 支付監聯器"""
    
    def __init__(self):
        self.usdt_service = UsdtPaymentService()
        self._running = False
        self._task: Optional[asyncio.Task] = None
    
    async def start(self):
        """啟動監聯"""
        if self._running:
            return
        
        self._running = True
        self._task = asyncio.create_task(self._watch_loop())
        logger.info("USDT payment watcher started")
    
    async def stop(self):
        """停止監聯"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        
        await self.usdt_service.close()
        logger.info("USDT payment watcher stopped")
    
    async def _watch_loop(self):
        """監聯循環"""
        from .recharge_service import get_recharge_service
        
        while self._running:
            try:
                recharge_service = get_recharge_service()
                
                # 獲取待確認的 USDT 訂單
                pending_orders = recharge_service.get_pending_usdt_orders()
                
                for order in pending_orders:
                    if not self._running:
                        break
                    
                    await self._check_order(order, recharge_service)
                
                # 過期超時訂單
                recharge_service.expire_orders()
                
            except Exception as e:
                logger.error(f"USDT watcher error: {e}")
            
            # 等待下一輪
            await asyncio.sleep(30)
    
    async def _check_order(self, order, recharge_service):
        """檢查單個訂單"""
        try:
            # 解析訂單創建時間
            created_at = datetime.fromisoformat(order.created_at.replace('Z', '+00:00'))
            since_timestamp = int(created_at.timestamp())
            
            # 查詢交易
            found, tx_info = await self.usdt_service.check_transaction(
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
                        logger.info(f"Order {order.order_no} auto-confirmed via USDT watcher")
                        # TODO: 發送通知給用戶
                    else:
                        logger.warning(f"Order {order.order_no} confirm failed: {message}")
                
                else:
                    # 交易已發現但未達到確認數，標記為已支付
                    if order.status == 'pending':
                        recharge_service.mark_paid(
                            order.order_no,
                            usdt_tx_hash=tx_hash
                        )
                        logger.info(f"Order {order.order_no} marked as paid, waiting for confirmations")
        
        except Exception as e:
            logger.error(f"Check order {order.order_no} error: {e}")


# ==================== 全局實例 ====================

_usdt_service: Optional[UsdtPaymentService] = None
_usdt_watcher: Optional[UsdtPaymentWatcher] = None


def get_usdt_service() -> UsdtPaymentService:
    """獲取 USDT 服務實例"""
    global _usdt_service
    if _usdt_service is None:
        _usdt_service = UsdtPaymentService()
    return _usdt_service


def get_usdt_watcher() -> UsdtPaymentWatcher:
    """獲取 USDT 監聯器實例"""
    global _usdt_watcher
    if _usdt_watcher is None:
        _usdt_watcher = UsdtPaymentWatcher()
    return _usdt_watcher
