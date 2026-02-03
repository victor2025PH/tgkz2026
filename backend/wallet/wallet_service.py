"""
錢包核心服務
Wallet Core Service

提供錢包的創建、查詢、餘額操作等核心功能
使用樂觀鎖 + 事務確保資金安全

優化設計：
1. 使用整數（分）存儲金額，避免浮點精度問題
2. 樂觀鎖版本控制，防止並發衝突
3. 每次操作記錄前後餘額，便於審計
4. 支持優先使用贈送餘額配置
"""

import os
import sqlite3
import logging
import threading
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, Tuple, List
from dataclasses import asdict

from .models import (
    Wallet, Transaction, WalletStatus, TransactionType, TransactionStatus,
    ConsumeCategory, RechargePackage, DEFAULT_RECHARGE_PACKAGES
)

logger = logging.getLogger(__name__)


class WalletServiceError(Exception):
    """錢包服務錯誤"""
    def __init__(self, code: str, message: str, details: Dict = None):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(message)


class WalletService:
    """錢包服務（單例）"""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self, db_path: str = None):
        if hasattr(self, '_initialized') and self._initialized:
            return
        
        if db_path is None:
            # 默認使用 data 目錄下的 wallet.db
            data_dir = Path(__file__).parent.parent / "data"
            data_dir.mkdir(parents=True, exist_ok=True)
            db_path = str(data_dir / "wallet.db")
        
        self.db_path = db_path
        self._init_database()
        self._initialized = True
        logger.info(f"WalletService initialized with db: {db_path}")
    
    def _get_connection(self) -> sqlite3.Connection:
        """獲取數據庫連接"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _init_database(self):
        """初始化數據庫表"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        # 用戶錢包表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_wallets (
                id TEXT PRIMARY KEY,
                user_id TEXT UNIQUE NOT NULL,
                balance INTEGER DEFAULT 0,
                frozen_balance INTEGER DEFAULT 0,
                bonus_balance INTEGER DEFAULT 0,
                total_recharged INTEGER DEFAULT 0,
                total_consumed INTEGER DEFAULT 0,
                total_withdrawn INTEGER DEFAULT 0,
                currency TEXT DEFAULT 'USD',
                status TEXT DEFAULT 'active',
                version INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 錢包流水表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS wallet_transactions (
                id TEXT PRIMARY KEY,
                wallet_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                order_id TEXT UNIQUE,
                type TEXT NOT NULL,
                amount INTEGER NOT NULL,
                bonus_amount INTEGER DEFAULT 0,
                balance_before INTEGER NOT NULL,
                balance_after INTEGER NOT NULL,
                category TEXT,
                description TEXT,
                reference_id TEXT,
                reference_type TEXT,
                status TEXT DEFAULT 'pending',
                payment_method TEXT,
                payment_channel TEXT,
                external_order_id TEXT,
                fee INTEGER DEFAULT 0,
                operator_id TEXT,
                remark TEXT,
                ip_address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                FOREIGN KEY (wallet_id) REFERENCES user_wallets(id)
            )
        ''')
        
        # 充值訂單表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS recharge_orders (
                id TEXT PRIMARY KEY,
                order_no TEXT UNIQUE NOT NULL,
                user_id TEXT NOT NULL,
                wallet_id TEXT NOT NULL,
                amount INTEGER NOT NULL,
                bonus_amount INTEGER DEFAULT 0,
                fee INTEGER DEFAULT 0,
                actual_amount INTEGER NOT NULL,
                payment_method TEXT,
                payment_channel TEXT,
                status TEXT DEFAULT 'pending',
                usdt_network TEXT,
                usdt_address TEXT,
                usdt_amount REAL,
                usdt_rate REAL,
                usdt_tx_hash TEXT,
                external_order_id TEXT,
                paid_at TIMESTAMP,
                confirmed_at TIMESTAMP,
                expired_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (wallet_id) REFERENCES user_wallets(id)
            )
        ''')
        
        # 充值套餐表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS recharge_packages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                amount INTEGER NOT NULL,
                bonus_amount INTEGER DEFAULT 0,
                bonus_percent REAL DEFAULT 0,
                is_recommended INTEGER DEFAULT 0,
                display_order INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1,
                min_level TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # 創建索引
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_wallet_user ON user_wallets(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_trans_wallet ON wallet_transactions(wallet_id, created_at DESC)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_trans_user ON wallet_transactions(user_id, created_at DESC)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_trans_order ON wallet_transactions(order_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_recharge_user ON recharge_orders(user_id, created_at DESC)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_recharge_status ON recharge_orders(status, created_at)')
        
        # 初始化默認充值套餐
        cursor.execute('SELECT COUNT(*) FROM recharge_packages')
        if cursor.fetchone()[0] == 0:
            for pkg in DEFAULT_RECHARGE_PACKAGES:
                cursor.execute('''
                    INSERT INTO recharge_packages 
                    (amount, bonus_amount, bonus_percent, is_recommended, display_order)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    pkg['amount'], pkg['bonus_amount'], pkg['bonus_percent'],
                    1 if pkg.get('is_recommended') else 0, pkg['display_order']
                ))
        
        conn.commit()
        conn.close()
        logger.info("Wallet database initialized")
    
    # ==================== 錢包管理 ====================
    
    def get_wallet(self, user_id: str) -> Optional[Wallet]:
        """獲取用戶錢包"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM user_wallets WHERE user_id = ?', (user_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
        
        return Wallet(**dict(row))
    
    def get_or_create_wallet(self, user_id: str) -> Wallet:
        """獲取或創建用戶錢包"""
        wallet = self.get_wallet(user_id)
        if wallet:
            return wallet
        
        # 創建新錢包
        wallet = Wallet(user_id=user_id)
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO user_wallets 
                (id, user_id, balance, frozen_balance, bonus_balance, 
                 total_recharged, total_consumed, total_withdrawn,
                 currency, status, version, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                wallet.id, wallet.user_id, wallet.balance,
                wallet.frozen_balance, wallet.bonus_balance,
                wallet.total_recharged, wallet.total_consumed, wallet.total_withdrawn,
                wallet.currency, wallet.status, wallet.version,
                wallet.created_at, wallet.updated_at
            ))
            conn.commit()
            logger.info(f"Created wallet for user {user_id}: {wallet.id}")
        except sqlite3.IntegrityError:
            # 並發創建，重新獲取
            conn.rollback()
            wallet = self.get_wallet(user_id)
        finally:
            conn.close()
        
        return wallet
    
    def get_wallet_balance(self, user_id: str) -> Dict[str, Any]:
        """獲取用戶餘額信息"""
        wallet = self.get_or_create_wallet(user_id)
        return {
            "balance": wallet.balance,
            "balance_display": wallet.balance_display,
            "frozen_balance": wallet.frozen_balance,
            "bonus_balance": wallet.bonus_balance,
            "bonus_display": wallet.bonus_display,
            "available_balance": wallet.available_balance,
            "total_display": wallet.total_display,
            "currency": wallet.currency,
        }
    
    # ==================== 餘額操作 ====================
    
    def add_balance(
        self,
        user_id: str,
        amount: int,
        bonus_amount: int = 0,
        order_id: str = None,
        description: str = "",
        payment_method: str = "",
        reference_id: str = "",
        reference_type: str = "",
        ip_address: str = ""
    ) -> Tuple[bool, str, Optional[Transaction]]:
        """
        增加餘額（充值/退款等）
        
        Args:
            user_id: 用戶ID
            amount: 金額（分）
            bonus_amount: 贈送金額
            order_id: 業務訂單號（防止重複）
            description: 描述
            payment_method: 支付方式
            reference_id: 關聯ID
            reference_type: 關聯類型
            ip_address: IP地址
            
        Returns:
            (success, message, transaction)
        """
        if amount <= 0 and bonus_amount <= 0:
            return False, "金額必須大於0", None
        
        wallet = self.get_or_create_wallet(user_id)
        
        if wallet.status != WalletStatus.ACTIVE.value:
            return False, "錢包狀態異常", None
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # 開始事務
            cursor.execute('BEGIN IMMEDIATE')
            
            # 檢查訂單號是否重複（冪等性）
            if order_id:
                cursor.execute(
                    'SELECT id FROM wallet_transactions WHERE order_id = ?',
                    (order_id,)
                )
                if cursor.fetchone():
                    conn.rollback()
                    return False, "訂單已處理", None
            
            # 獲取當前錢包（帶鎖）
            cursor.execute('''
                SELECT * FROM user_wallets 
                WHERE id = ? AND version = ?
            ''', (wallet.id, wallet.version))
            
            current = cursor.fetchone()
            if not current:
                conn.rollback()
                return False, "錢包版本衝突，請重試", None
            
            current = dict(current)
            balance_before = current['balance'] + current['bonus_balance']
            
            # 計算新餘額
            new_balance = current['balance'] + amount
            new_bonus = current['bonus_balance'] + bonus_amount
            new_total_recharged = current['total_recharged'] + amount + bonus_amount
            new_version = current['version'] + 1
            now = datetime.now().isoformat()
            
            # 更新錢包
            cursor.execute('''
                UPDATE user_wallets SET
                    balance = ?,
                    bonus_balance = ?,
                    total_recharged = ?,
                    version = ?,
                    updated_at = ?
                WHERE id = ? AND version = ?
            ''', (
                new_balance, new_bonus, new_total_recharged,
                new_version, now, wallet.id, current['version']
            ))
            
            if cursor.rowcount == 0:
                conn.rollback()
                return False, "更新失敗，請重試", None
            
            # 創建流水記錄
            transaction = Transaction(
                wallet_id=wallet.id,
                user_id=user_id,
                order_id=order_id or f"ADD{int(datetime.now().timestamp())}{wallet.id[:8]}",
                type=TransactionType.RECHARGE.value,
                amount=amount,
                bonus_amount=bonus_amount,
                balance_before=balance_before,
                balance_after=new_balance + new_bonus,
                description=description or "餘額充值",
                reference_id=reference_id,
                reference_type=reference_type,
                status=TransactionStatus.SUCCESS.value,
                payment_method=payment_method,
                ip_address=ip_address,
                completed_at=now
            )
            
            cursor.execute('''
                INSERT INTO wallet_transactions
                (id, wallet_id, user_id, order_id, type, amount, bonus_amount,
                 balance_before, balance_after, category, description,
                 reference_id, reference_type, status, payment_method,
                 ip_address, created_at, completed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                transaction.id, transaction.wallet_id, transaction.user_id,
                transaction.order_id, transaction.type, transaction.amount,
                transaction.bonus_amount, transaction.balance_before,
                transaction.balance_after, transaction.category, transaction.description,
                transaction.reference_id, transaction.reference_type,
                transaction.status, transaction.payment_method,
                transaction.ip_address, transaction.created_at, transaction.completed_at
            ))
            
            conn.commit()
            logger.info(f"Added balance for user {user_id}: +{amount} cents, +{bonus_amount} bonus")
            
            return True, "充值成功", transaction
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Add balance error: {e}")
            return False, f"操作失敗: {str(e)}", None
        finally:
            conn.close()
    
    def consume(
        self,
        user_id: str,
        amount: int,
        category: str,
        description: str,
        order_id: str = None,
        reference_id: str = "",
        reference_type: str = "",
        prefer_bonus: bool = True,
        ip_address: str = ""
    ) -> Tuple[bool, str, Optional[Transaction]]:
        """
        消費餘額
        
        Args:
            user_id: 用戶ID
            amount: 消費金額（分）
            category: 消費類目
            description: 描述
            order_id: 業務訂單號
            reference_id: 關聯ID
            reference_type: 關聯類型
            prefer_bonus: 是否優先使用贈送餘額
            ip_address: IP地址
            
        Returns:
            (success, message, transaction)
        """
        if amount <= 0:
            return False, "金額必須大於0", None
        
        wallet = self.get_wallet(user_id)
        if not wallet:
            return False, "錢包不存在", None
        
        if wallet.status != WalletStatus.ACTIVE.value:
            return False, "錢包狀態異常", None
        
        if wallet.available_balance < amount:
            return False, f"餘額不足（需要 ${amount/100:.2f}，當前 ${wallet.available_balance/100:.2f}）", None
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('BEGIN IMMEDIATE')
            
            # 冪等性檢查
            if order_id:
                cursor.execute(
                    'SELECT id FROM wallet_transactions WHERE order_id = ?',
                    (order_id,)
                )
                if cursor.fetchone():
                    conn.rollback()
                    return False, "訂單已處理", None
            
            # 獲取當前錢包
            cursor.execute('''
                SELECT * FROM user_wallets 
                WHERE id = ? AND version = ?
            ''', (wallet.id, wallet.version))
            
            current = cursor.fetchone()
            if not current:
                conn.rollback()
                return False, "錢包版本衝突，請重試", None
            
            current = dict(current)
            balance_before = current['balance'] + current['bonus_balance']
            
            # 再次檢查餘額
            if current['balance'] + current['bonus_balance'] < amount:
                conn.rollback()
                return False, "餘額不足", None
            
            # 計算扣款（優先贈送餘額）
            remaining = amount
            bonus_deduct = 0
            main_deduct = 0
            
            if prefer_bonus:
                # 先扣贈送
                if current['bonus_balance'] >= remaining:
                    bonus_deduct = remaining
                    remaining = 0
                else:
                    bonus_deduct = current['bonus_balance']
                    remaining -= bonus_deduct
                main_deduct = remaining
            else:
                # 先扣主餘額
                if current['balance'] >= remaining:
                    main_deduct = remaining
                    remaining = 0
                else:
                    main_deduct = current['balance']
                    remaining -= main_deduct
                bonus_deduct = remaining
            
            new_balance = current['balance'] - main_deduct
            new_bonus = current['bonus_balance'] - bonus_deduct
            new_total_consumed = current['total_consumed'] + amount
            new_version = current['version'] + 1
            now = datetime.now().isoformat()
            
            # 更新錢包
            cursor.execute('''
                UPDATE user_wallets SET
                    balance = ?,
                    bonus_balance = ?,
                    total_consumed = ?,
                    version = ?,
                    updated_at = ?
                WHERE id = ? AND version = ?
            ''', (
                new_balance, new_bonus, new_total_consumed,
                new_version, now, wallet.id, current['version']
            ))
            
            if cursor.rowcount == 0:
                conn.rollback()
                return False, "更新失敗，請重試", None
            
            # 創建流水記錄
            transaction = Transaction(
                wallet_id=wallet.id,
                user_id=user_id,
                order_id=order_id or f"CSM{int(datetime.now().timestamp())}{wallet.id[:8]}",
                type=TransactionType.CONSUME.value,
                amount=-amount,  # 消費為負數
                bonus_amount=-bonus_deduct if bonus_deduct > 0 else 0,
                balance_before=balance_before,
                balance_after=new_balance + new_bonus,
                category=category,
                description=description,
                reference_id=reference_id,
                reference_type=reference_type,
                status=TransactionStatus.SUCCESS.value,
                ip_address=ip_address,
                completed_at=now
            )
            
            cursor.execute('''
                INSERT INTO wallet_transactions
                (id, wallet_id, user_id, order_id, type, amount, bonus_amount,
                 balance_before, balance_after, category, description,
                 reference_id, reference_type, status, ip_address,
                 created_at, completed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                transaction.id, transaction.wallet_id, transaction.user_id,
                transaction.order_id, transaction.type, transaction.amount,
                transaction.bonus_amount, transaction.balance_before,
                transaction.balance_after, transaction.category, transaction.description,
                transaction.reference_id, transaction.reference_type,
                transaction.status, transaction.ip_address,
                transaction.created_at, transaction.completed_at
            ))
            
            conn.commit()
            logger.info(f"Consumed for user {user_id}: -{amount} cents ({category})")
            
            return True, "扣費成功", transaction
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Consume error: {e}")
            return False, f"操作失敗: {str(e)}", None
        finally:
            conn.close()
    
    def refund(
        self,
        user_id: str,
        original_order_id: str,
        amount: int = None,
        reason: str = "",
        operator_id: str = "",
        ip_address: str = ""
    ) -> Tuple[bool, str, Optional[Transaction]]:
        """
        退款
        
        Args:
            user_id: 用戶ID
            original_order_id: 原訂單號
            amount: 退款金額（None = 全額退款）
            reason: 退款原因
            operator_id: 操作人
            ip_address: IP地址
            
        Returns:
            (success, message, transaction)
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # 查找原訂單
            cursor.execute('''
                SELECT * FROM wallet_transactions 
                WHERE order_id = ? AND user_id = ?
            ''', (original_order_id, user_id))
            
            original = cursor.fetchone()
            if not original:
                return False, "原訂單不存在", None
            
            original = dict(original)
            
            if original['status'] == TransactionStatus.REFUNDED.value:
                return False, "訂單已退款", None
            
            if original['type'] != TransactionType.CONSUME.value:
                return False, "只能退款消費訂單", None
            
            # 計算退款金額（原消費為負數）
            refund_amount = amount if amount else abs(original['amount'])
            if refund_amount > abs(original['amount']):
                return False, "退款金額超過原消費", None
            
            # 獲取錢包
            wallet = self.get_wallet(user_id)
            if not wallet:
                return False, "錢包不存在", None
            
            # 執行退款（增加餘額）
            success, message, transaction = self.add_balance(
                user_id=user_id,
                amount=refund_amount,
                bonus_amount=abs(original['bonus_amount']) if original['bonus_amount'] else 0,
                order_id=f"RFD{original_order_id}",
                description=f"退款: {reason or original['description']}",
                reference_id=original_order_id,
                reference_type="refund",
                ip_address=ip_address
            )
            
            if success:
                # 更新原訂單狀態
                cursor.execute('''
                    UPDATE wallet_transactions SET status = ?
                    WHERE order_id = ?
                ''', (TransactionStatus.REFUNDED.value, original_order_id))
                conn.commit()
                
                # 更新交易類型
                if transaction:
                    cursor.execute('''
                        UPDATE wallet_transactions SET type = ?, operator_id = ?
                        WHERE id = ?
                    ''', (TransactionType.REFUND.value, operator_id, transaction.id))
                    conn.commit()
            
            return success, message, transaction
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Refund error: {e}")
            return False, f"退款失敗: {str(e)}", None
        finally:
            conn.close()
    
    # ==================== 查詢 ====================
    
    def get_transactions(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        type_filter: str = None,
        status_filter: str = None,
        start_date: str = None,
        end_date: str = None
    ) -> Tuple[List[Transaction], int]:
        """
        獲取交易記錄
        
        Returns:
            (transactions, total_count)
        """
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            conditions = ["user_id = ?"]
            params = [user_id]
            
            if type_filter:
                conditions.append("type = ?")
                params.append(type_filter)
            
            if status_filter:
                conditions.append("status = ?")
                params.append(status_filter)
            
            if start_date:
                conditions.append("created_at >= ?")
                params.append(start_date)
            
            if end_date:
                conditions.append("created_at <= ?")
                params.append(end_date)
            
            where_clause = " AND ".join(conditions)
            
            # 獲取總數
            cursor.execute(
                f'SELECT COUNT(*) FROM wallet_transactions WHERE {where_clause}',
                params
            )
            total = cursor.fetchone()[0]
            
            # 獲取分頁數據
            offset = (page - 1) * page_size
            cursor.execute(f'''
                SELECT * FROM wallet_transactions 
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            ''', params + [page_size, offset])
            
            transactions = [Transaction(**dict(row)) for row in cursor.fetchall()]
            
            return transactions, total
            
        finally:
            conn.close()
    
    def get_recharge_packages(self) -> List[RechargePackage]:
        """獲取充值套餐列表"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT * FROM recharge_packages 
                WHERE is_active = 1
                ORDER BY display_order ASC
            ''')
            
            return [RechargePackage(**dict(row)) for row in cursor.fetchall()]
        finally:
            conn.close()
    
    def get_statistics(self, user_id: str) -> Dict[str, Any]:
        """獲取用戶錢包統計"""
        wallet = self.get_wallet(user_id)
        if not wallet:
            return {
                "balance": 0,
                "total_recharged": 0,
                "total_consumed": 0,
                "this_month_consumed": 0,
                "transaction_count": 0,
            }
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            # 本月消費
            month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0).isoformat()
            cursor.execute('''
                SELECT COALESCE(SUM(ABS(amount)), 0) FROM wallet_transactions
                WHERE user_id = ? AND type = 'consume' AND status = 'success'
                AND created_at >= ?
            ''', (user_id, month_start))
            this_month = cursor.fetchone()[0]
            
            # 交易數
            cursor.execute(
                'SELECT COUNT(*) FROM wallet_transactions WHERE user_id = ?',
                (user_id,)
            )
            tx_count = cursor.fetchone()[0]
            
            return {
                "balance": wallet.available_balance,
                "balance_display": wallet.total_display,
                "total_recharged": wallet.total_recharged,
                "total_consumed": wallet.total_consumed,
                "this_month_consumed": this_month,
                "transaction_count": tx_count,
            }
        finally:
            conn.close()


# ==================== 全局實例 ====================

_wallet_service: Optional[WalletService] = None


def init_wallet_service(db_path: str = None) -> WalletService:
    """初始化錢包服務"""
    global _wallet_service
    _wallet_service = WalletService(db_path)
    return _wallet_service


def get_wallet_service() -> WalletService:
    """獲取錢包服務實例"""
    global _wallet_service
    if _wallet_service is None:
        _wallet_service = WalletService()
    return _wallet_service
