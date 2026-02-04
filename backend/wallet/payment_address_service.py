"""
收款地址池服務
Payment Address Pool Service

Phase 1.1 實現：
1. 地址 CRUD 管理
2. 智能地址分配（輪換策略）
3. 地址狀態追踪
4. 使用統計
"""

import os
import logging
import threading
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple

from .models import PaymentAddress, AddressStatus, AddressNetwork, PaymentChannelConfig, DEFAULT_PAYMENT_CHANNELS

logger = logging.getLogger(__name__)


class PaymentAddressService:
    """收款地址池服務（單例）"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized') and self._initialized:
            return
        
        from .wallet_service import get_wallet_service
        self.wallet_service = get_wallet_service()
        self._init_tables()
        self._initialized = True
        logger.info("PaymentAddressService initialized")
    
    def _get_connection(self):
        """獲取數據庫連接"""
        return self.wallet_service._get_connection()
    
    def _init_tables(self):
        """初始化數據表"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # 收款地址表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS payment_addresses (
                    id TEXT PRIMARY KEY,
                    network TEXT NOT NULL,
                    address TEXT NOT NULL,
                    label TEXT DEFAULT '',
                    status TEXT DEFAULT 'active',
                    priority INTEGER DEFAULT 0,
                    usage_count INTEGER DEFAULT 0,
                    max_usage INTEGER DEFAULT 0,
                    total_received REAL DEFAULT 0,
                    last_used_at TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    created_by TEXT DEFAULT '',
                    UNIQUE(network, address)
                )
            ''')
            
            # 支付渠道配置表
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS payment_channels (
                    id TEXT PRIMARY KEY,
                    channel_type TEXT UNIQUE NOT NULL,
                    display_name TEXT NOT NULL,
                    enabled INTEGER DEFAULT 1,
                    fee_rate REAL DEFAULT 0,
                    min_amount INTEGER DEFAULT 500,
                    max_amount INTEGER DEFAULT 100000,
                    daily_limit INTEGER DEFAULT 0,
                    priority INTEGER DEFAULT 0,
                    config TEXT DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            ''')
            
            # 地址分配記錄表（追蹤哪個訂單使用哪個地址）
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS address_allocations (
                    id TEXT PRIMARY KEY,
                    address_id TEXT NOT NULL,
                    order_no TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    amount REAL DEFAULT 0,
                    status TEXT DEFAULT 'pending',
                    allocated_at TEXT NOT NULL,
                    released_at TEXT,
                    UNIQUE(order_no)
                )
            ''')
            
            # 創建索引
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_payment_addresses_network ON payment_addresses(network)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_payment_addresses_status ON payment_addresses(status)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_address_allocations_order ON address_allocations(order_no)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_address_allocations_status ON address_allocations(status)')
            
            conn.commit()
            
            # 初始化默認渠道配置
            self._init_default_channels(cursor, conn)
            
            logger.info("Payment address tables initialized")
            
        except Exception as e:
            logger.error(f"Failed to init payment address tables: {e}")
            conn.rollback()
        finally:
            conn.close()
    
    def _init_default_channels(self, cursor, conn):
        """初始化默認支付渠道"""
        import json
        
        for channel in DEFAULT_PAYMENT_CHANNELS:
            cursor.execute('''
                INSERT OR IGNORE INTO payment_channels 
                (id, channel_type, display_name, enabled, fee_rate, min_amount, max_amount, priority, config, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                str(__import__('uuid').uuid4()),
                channel['channel_type'],
                channel['display_name'],
                1 if channel.get('enabled', True) else 0,
                channel.get('fee_rate', 0),
                channel.get('min_amount', 500),
                channel.get('max_amount', 100000),
                channel.get('priority', 0),
                json.dumps(channel.get('config', {})),
                datetime.now().isoformat(),
                datetime.now().isoformat()
            ))
        
        conn.commit()
    
    # ==================== 地址管理 ====================
    
    def add_address(
        self,
        network: str,
        address: str,
        label: str = "",
        priority: int = 0,
        max_usage: int = 0,
        created_by: str = ""
    ) -> Tuple[bool, str, Optional[PaymentAddress]]:
        """
        添加收款地址
        
        Args:
            network: 網絡類型 (trc20, erc20, bep20)
            address: 錢包地址
            label: 標籤備註
            priority: 優先級
            max_usage: 最大使用次數
            created_by: 創建者ID
            
        Returns:
            (success, message, address_obj)
        """
        # 驗證網絡類型
        valid_networks = [n.value for n in AddressNetwork]
        if network.lower() not in valid_networks:
            return False, f"不支持的網絡類型: {network}", None
        
        # 驗證地址格式
        address = address.strip()
        if not self._validate_address(network.lower(), address):
            return False, "地址格式無效", None
        
        addr = PaymentAddress(
            network=network.lower(),
            address=address,
            label=label,
            priority=priority,
            max_usage=max_usage,
            created_by=created_by
        )
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO payment_addresses 
                (id, network, address, label, status, priority, usage_count, max_usage,
                 total_received, created_at, updated_at, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                addr.id, addr.network, addr.address, addr.label, addr.status,
                addr.priority, addr.usage_count, addr.max_usage, addr.total_received,
                addr.created_at, addr.updated_at, addr.created_by
            ))
            
            conn.commit()
            logger.info(f"Added payment address: {addr.network}/{addr.address[:10]}...")
            
            return True, "地址添加成功", addr
            
        except Exception as e:
            conn.rollback()
            if "UNIQUE constraint failed" in str(e):
                return False, "該地址已存在", None
            logger.error(f"Add address error: {e}")
            return False, str(e), None
        finally:
            conn.close()
    
    def _validate_address(self, network: str, address: str) -> bool:
        """驗證地址格式"""
        if network == "trc20":
            # TRON 地址以 T 開頭，34 個字符
            return address.startswith('T') and len(address) == 34
        elif network == "erc20":
            # 以太坊地址以 0x 開頭，42 個字符
            return address.startswith('0x') and len(address) == 42
        elif network == "bep20":
            # BSC 地址與以太坊相同
            return address.startswith('0x') and len(address) == 42
        return False
    
    def update_address(
        self,
        address_id: str,
        label: str = None,
        status: str = None,
        priority: int = None,
        max_usage: int = None
    ) -> Tuple[bool, str]:
        """更新地址信息"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            updates = []
            params = []
            
            if label is not None:
                updates.append("label = ?")
                params.append(label)
            
            if status is not None:
                valid_statuses = [s.value for s in AddressStatus]
                if status not in valid_statuses:
                    return False, f"無效的狀態: {status}"
                updates.append("status = ?")
                params.append(status)
            
            if priority is not None:
                updates.append("priority = ?")
                params.append(priority)
            
            if max_usage is not None:
                updates.append("max_usage = ?")
                params.append(max_usage)
            
            if not updates:
                return False, "沒有要更新的內容"
            
            updates.append("updated_at = ?")
            params.append(datetime.now().isoformat())
            params.append(address_id)
            
            cursor.execute(f'''
                UPDATE payment_addresses SET {", ".join(updates)} WHERE id = ?
            ''', params)
            
            if cursor.rowcount == 0:
                return False, "地址不存在"
            
            conn.commit()
            return True, "更新成功"
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Update address error: {e}")
            return False, str(e)
        finally:
            conn.close()
    
    def delete_address(self, address_id: str) -> Tuple[bool, str]:
        """刪除地址（軟刪除 - 標記為 disabled）"""
        return self.update_address(address_id, status=AddressStatus.DISABLED.value)
    
    def get_address(self, address_id: str) -> Optional[PaymentAddress]:
        """獲取單個地址"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('SELECT * FROM payment_addresses WHERE id = ?', (address_id,))
            row = cursor.fetchone()
            
            if not row:
                return None
            
            return self._row_to_address(dict(row))
        finally:
            conn.close()
    
    def list_addresses(
        self,
        network: str = None,
        status: str = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[PaymentAddress], int]:
        """獲取地址列表"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            conditions = []
            params = []
            
            if network:
                conditions.append("network = ?")
                params.append(network.lower())
            
            if status:
                conditions.append("status = ?")
                params.append(status)
            else:
                # 默認不顯示 disabled
                conditions.append("status != 'disabled'")
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            
            # 總數
            cursor.execute(f'SELECT COUNT(*) FROM payment_addresses WHERE {where_clause}', params)
            total = cursor.fetchone()[0]
            
            # 分頁
            offset = (page - 1) * page_size
            cursor.execute(f'''
                SELECT * FROM payment_addresses 
                WHERE {where_clause}
                ORDER BY priority ASC, usage_count ASC, created_at DESC
                LIMIT ? OFFSET ?
            ''', params + [page_size, offset])
            
            addresses = [self._row_to_address(dict(row)) for row in cursor.fetchall()]
            
            return addresses, total
            
        finally:
            conn.close()
    
    def _row_to_address(self, row: Dict) -> PaymentAddress:
        """轉換數據庫行為地址對象"""
        return PaymentAddress(
            id=row.get('id', ''),
            network=row.get('network', ''),
            address=row.get('address', ''),
            label=row.get('label', ''),
            status=row.get('status', 'active'),
            priority=row.get('priority', 0),
            usage_count=row.get('usage_count', 0),
            max_usage=row.get('max_usage', 0),
            total_received=row.get('total_received', 0.0),
            last_used_at=row.get('last_used_at', ''),
            created_at=row.get('created_at', ''),
            updated_at=row.get('updated_at', ''),
            created_by=row.get('created_by', '')
        )
    
    # ==================== 智能地址分配 ====================
    
    def allocate_address(
        self,
        network: str,
        order_no: str,
        user_id: str,
        amount: float = 0
    ) -> Tuple[bool, str, Optional[PaymentAddress]]:
        """
        為訂單分配收款地址
        
        策略優先級：
        1. 優先級最高（priority 最小）
        2. 使用次數最少
        3. 創建時間最早
        
        Args:
            network: 網絡類型
            order_no: 訂單號
            user_id: 用戶ID
            amount: 訂單金額
            
        Returns:
            (success, message, address)
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # 開始事務
            cursor.execute('BEGIN IMMEDIATE')
            
            # 查找可用地址
            cursor.execute('''
                SELECT * FROM payment_addresses
                WHERE network = ?
                AND status = 'active'
                AND (max_usage = 0 OR usage_count < max_usage)
                ORDER BY priority ASC, usage_count ASC, created_at ASC
                LIMIT 1
            ''', (network.lower(),))
            
            row = cursor.fetchone()
            
            if not row:
                conn.rollback()
                return False, f"沒有可用的 {network.upper()} 收款地址", None
            
            address = self._row_to_address(dict(row))
            
            # 更新地址使用統計
            now = datetime.now().isoformat()
            cursor.execute('''
                UPDATE payment_addresses SET
                    usage_count = usage_count + 1,
                    last_used_at = ?,
                    updated_at = ?
                WHERE id = ?
            ''', (now, now, address.id))
            
            # 記錄分配
            cursor.execute('''
                INSERT INTO address_allocations
                (id, address_id, order_no, user_id, amount, status, allocated_at)
                VALUES (?, ?, ?, ?, ?, 'pending', ?)
            ''', (
                str(__import__('uuid').uuid4()),
                address.id,
                order_no,
                user_id,
                amount,
                now
            ))
            
            # 檢查是否達到最大使用次數
            if address.max_usage > 0 and address.usage_count + 1 >= address.max_usage:
                cursor.execute('''
                    UPDATE payment_addresses SET status = 'exhausted' WHERE id = ?
                ''', (address.id,))
                logger.warning(f"Address {address.address[:10]}... exhausted (max usage reached)")
            
            conn.commit()
            
            logger.info(f"Allocated address {address.address[:10]}... for order {order_no}")
            return True, "分配成功", address
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Allocate address error: {e}")
            return False, str(e), None
        finally:
            conn.close()
    
    def release_allocation(self, order_no: str, confirmed: bool = False, amount: float = 0) -> bool:
        """
        釋放地址分配（訂單完成或取消時調用）
        
        Args:
            order_no: 訂單號
            confirmed: 是否確認收款
            amount: 實際收款金額
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # 更新分配狀態
            now = datetime.now().isoformat()
            status = 'confirmed' if confirmed else 'cancelled'
            
            cursor.execute('''
                UPDATE address_allocations SET
                    status = ?,
                    amount = ?,
                    released_at = ?
                WHERE order_no = ?
            ''', (status, amount, now, order_no))
            
            # 如果確認收款，更新地址累計收款
            if confirmed and amount > 0:
                cursor.execute('''
                    UPDATE payment_addresses SET
                        total_received = total_received + ?
                    WHERE id = (SELECT address_id FROM address_allocations WHERE order_no = ?)
                ''', (amount, order_no))
            
            conn.commit()
            return True
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Release allocation error: {e}")
            return False
        finally:
            conn.close()
    
    # ==================== 渠道配置 ====================
    
    def get_enabled_channels(self) -> List[Dict[str, Any]]:
        """獲取已啟用的支付渠道"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT * FROM payment_channels
                WHERE enabled = 1
                ORDER BY priority ASC
            ''')
            
            channels = []
            for row in cursor.fetchall():
                channel = dict(row)
                channel['enabled'] = bool(channel['enabled'])
                channels.append(channel)
            
            return channels
        finally:
            conn.close()
    
    def get_all_channels(self) -> List[Dict[str, Any]]:
        """獲取所有支付渠道"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('SELECT * FROM payment_channels ORDER BY priority ASC')
            
            channels = []
            for row in cursor.fetchall():
                channel = dict(row)
                channel['enabled'] = bool(channel['enabled'])
                channels.append(channel)
            
            return channels
        finally:
            conn.close()
    
    def update_channel(
        self,
        channel_type: str,
        enabled: bool = None,
        fee_rate: float = None,
        min_amount: int = None,
        max_amount: int = None,
        daily_limit: int = None,
        priority: int = None
    ) -> Tuple[bool, str]:
        """更新支付渠道配置"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            updates = []
            params = []
            
            if enabled is not None:
                updates.append("enabled = ?")
                params.append(1 if enabled else 0)
            
            if fee_rate is not None:
                updates.append("fee_rate = ?")
                params.append(fee_rate)
            
            if min_amount is not None:
                updates.append("min_amount = ?")
                params.append(min_amount)
            
            if max_amount is not None:
                updates.append("max_amount = ?")
                params.append(max_amount)
            
            if daily_limit is not None:
                updates.append("daily_limit = ?")
                params.append(daily_limit)
            
            if priority is not None:
                updates.append("priority = ?")
                params.append(priority)
            
            if not updates:
                return False, "沒有要更新的內容"
            
            updates.append("updated_at = ?")
            params.append(datetime.now().isoformat())
            params.append(channel_type)
            
            cursor.execute(f'''
                UPDATE payment_channels SET {", ".join(updates)} WHERE channel_type = ?
            ''', params)
            
            if cursor.rowcount == 0:
                return False, "渠道不存在"
            
            conn.commit()
            logger.info(f"Updated payment channel: {channel_type}")
            return True, "更新成功"
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Update channel error: {e}")
            return False, str(e)
        finally:
            conn.close()
    
    # ==================== 統計 ====================
    
    def get_address_stats(self) -> Dict[str, Any]:
        """獲取地址池統計"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # 按網絡統計
            cursor.execute('''
                SELECT 
                    network,
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                    SUM(CASE WHEN status = 'disabled' THEN 1 ELSE 0 END) as disabled,
                    SUM(CASE WHEN status = 'exhausted' THEN 1 ELSE 0 END) as exhausted,
                    SUM(total_received) as total_received,
                    SUM(usage_count) as total_usage
                FROM payment_addresses
                GROUP BY network
            ''')
            
            by_network = {}
            for row in cursor.fetchall():
                by_network[row['network']] = {
                    'total': row['total'],
                    'active': row['active'],
                    'disabled': row['disabled'],
                    'exhausted': row['exhausted'],
                    'total_received': row['total_received'] or 0,
                    'total_usage': row['total_usage'] or 0
                }
            
            # 今日分配統計
            today_start = datetime.now().replace(hour=0, minute=0, second=0).isoformat()
            cursor.execute('''
                SELECT 
                    COUNT(*) as allocations,
                    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                    SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END) as confirmed_amount
                FROM address_allocations
                WHERE allocated_at >= ?
            ''', (today_start,))
            
            today = cursor.fetchone()
            
            return {
                'by_network': by_network,
                'today': {
                    'allocations': today['allocations'] or 0,
                    'confirmed': today['confirmed'] or 0,
                    'confirmed_amount': today['confirmed_amount'] or 0
                }
            }
            
        finally:
            conn.close()


# ==================== 全局實例 ====================

_payment_address_service: Optional[PaymentAddressService] = None


def get_payment_address_service() -> PaymentAddressService:
    """獲取收款地址服務實例"""
    global _payment_address_service
    if _payment_address_service is None:
        _payment_address_service = PaymentAddressService()
    return _payment_address_service
