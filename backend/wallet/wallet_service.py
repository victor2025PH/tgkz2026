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
# 🔧 合法連接模塊（見 .cursorrules 合法連接模塊清單）：
# 同步輔助查詢統一經由 core.db_utils，不再直接 sqlite3.connect()。
from core.db_utils import create_connection

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
            # 🔧 修復：使用 tgmatrix.db 與用戶數據統一
            data_dir = Path(__file__).parent.parent / "data"
            data_dir.mkdir(parents=True, exist_ok=True)
            
            # 優先使用 tgmatrix.db（與用戶數據在同一個數據庫）
            tgmatrix_path = data_dir / "tgmatrix.db"
            if tgmatrix_path.exists():
                db_path = str(tgmatrix_path)
            else:
                # 兼容舊版本，使用 wallet.db
                db_path = str(data_dir / "wallet.db")
        
        self.db_path = db_path
        self._use_legacy_table = 'wallet.db' in db_path  # 是否使用舊表結構
        self._init_database()
        self._initialized = True
        logger.info(f"WalletService initialized with db: {db_path}, legacy: {self._use_legacy_table}")
    
    def _get_connection(self) -> sqlite3.Connection:
        """獲取數據庫連接（統一經由 core.db_utils.create_connection，調用方負責關閉）"""
        return create_connection(self.db_path)
    
    @property
    def _wallet_table(self) -> str:
        """獲取錢包表名"""
        return 'user_wallets' if self._use_legacy_table else 'wallets'
    
    @property
    def _balance_column(self) -> str:
        """獲取餘額列名"""
        return 'balance' if self._use_legacy_table else 'main_balance'
    
    def _row_to_wallet(self, row) -> Optional[Wallet]:
        """將數據庫行轉換為 Wallet 對象（適配兩種表結構）"""
        if not row:
            return None
        row_dict = dict(row)
        
        # 適配列名差異
        balance = row_dict.get('balance') or row_dict.get('main_balance', 0)
        wallet_id = str(row_dict.get('id', ''))
        
        return Wallet(
            id=wallet_id,
            user_id=row_dict.get('user_id', ''),
            balance=balance,
            frozen_balance=row_dict.get('frozen_balance', 0),
            bonus_balance=row_dict.get('bonus_balance', 0),
            total_recharged=row_dict.get('total_recharged', 0),
            total_consumed=row_dict.get('total_consumed', 0),
            total_withdrawn=row_dict.get('total_withdrawn', 0),
            currency=row_dict.get('currency', 'USD'),
            status=WalletStatus(row_dict.get('status', 'active')) if row_dict.get('status') else WalletStatus.ACTIVE,
            version=row_dict.get('version', 0),
            created_at=row_dict.get('created_at', ''),
            updated_at=row_dict.get('updated_at', '')
        )
    
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
        
        # 🔧 數據庫遷移：確保 wallet_transactions 表有所有必需的欄位
        migration_columns = [
            ("bonus_amount", "INTEGER DEFAULT 0"),
            ("balance_before", "INTEGER DEFAULT 0"),
            ("balance_after", "INTEGER DEFAULT 0"),
            ("category", "TEXT"),
            ("description", "TEXT"),
            ("reference_id", "TEXT"),
            ("reference_type", "TEXT"),
            ("status", "TEXT DEFAULT 'pending'"),
            ("payment_method", "TEXT"),
            ("payment_channel", "TEXT"),
            ("external_order_id", "TEXT"),
            ("fee", "INTEGER DEFAULT 0"),
            ("operator_id", "TEXT"),
            ("remark", "TEXT"),
            ("ip_address", "TEXT"),
            ("completed_at", "TIMESTAMP"),
        ]
        
        for col_name, col_type in migration_columns:
            try:
                cursor.execute(f"SELECT {col_name} FROM wallet_transactions LIMIT 1")
            except sqlite3.OperationalError:
                logger.info(f"Adding {col_name} column to wallet_transactions table...")
                cursor.execute(f"ALTER TABLE wallet_transactions ADD COLUMN {col_name} {col_type}")
                logger.info(f"✓ {col_name} column added successfully")
        
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
        
        cursor.execute(f'SELECT * FROM {self._wallet_table} WHERE user_id = ?', (user_id,))
        row = cursor.fetchone()
        conn.close()
        
        return self._row_to_wallet(row)
    
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
            if self._use_legacy_table:
                # 舊表結構 (wallet.db)
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
                    wallet.currency, wallet.status.value if hasattr(wallet.status, 'value') else wallet.status,
                    wallet.version, wallet.created_at, wallet.updated_at
                ))
            else:
                # 新表結構 (tgmatrix.db)
                cursor.execute('''
                    INSERT INTO wallets 
                    (user_id, main_balance, bonus_balance, frozen_balance, 
                     total_recharged, total_consumed, status, version)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    wallet.user_id, wallet.balance, wallet.bonus_balance,
                    wallet.frozen_balance, wallet.total_recharged, wallet.total_consumed,
                    wallet.status.value if hasattr(wallet.status, 'value') else 'active',
                    wallet.version
                ))
                # 獲取自增 ID
                wallet.id = str(cursor.lastrowid)
            
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
    
    # ==================== 管理員調賬（繞過狀態檢查） ====================
    
    def admin_adjust_balance(
        self,
        user_id: str,
        amount: int,
        reason: str,
        admin_id: str,
        allow_negative: bool = False,
        ip_address: str = ""
    ) -> Tuple[bool, str, Optional[Transaction]]:
        """
        管理員調賬（繞過錢包狀態檢查）
        
        專用於後台管理員調整用戶餘額，支持：
        1. 自動創建不存在的錢包
        2. 允許對凍結狀態錢包操作
        3. 支持正數（加款）和負數（扣款）
        4. 完整的審計日誌
        
        Args:
            user_id: 用戶ID
            amount: 調賬金額（正數加款，負數扣款）
            reason: 調賬原因
            admin_id: 管理員ID
            allow_negative: 是否允許餘額為負
            ip_address: 操作IP
            
        Returns:
            (success, message, transaction)
        """
        if amount == 0:
            return False, "調賬金額不能為0", None
        
        # 獲取或創建錢包（確保錢包存在）
        wallet = self.get_or_create_wallet(user_id)
        
        # 檢查錢包狀態（只有已關閉的錢包不能操作）
        if wallet.status == WalletStatus.CLOSED.value:
            return False, "錢包已關閉，無法調賬（請先重新激活錢包）", None
        
        # 凍結狀態給出警告但允許繼續
        is_frozen = wallet.status == WalletStatus.FROZEN.value
        
        conn = self._get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('BEGIN IMMEDIATE')
            
            # 生成唯一訂單號
            order_id = f"ADJ_{datetime.now().strftime('%Y%m%d%H%M%S')}_{user_id[:8]}"
            
            # 獲取當前錢包狀態（使用正確的表名和 ID 欄位）
            table_name = self._wallet_table
            balance_col = self._balance_column
            
            # 根據表結構使用不同的查詢方式
            if self._use_legacy_table:
                cursor.execute(f'SELECT * FROM {table_name} WHERE id = ?', (wallet.id,))
            else:
                # 新表使用 user_id 查詢
                cursor.execute(f'SELECT * FROM {table_name} WHERE user_id = ?', (user_id,))
            
            current = cursor.fetchone()
            if not current:
                conn.rollback()
                return False, f"錢包不存在（user_id: {user_id}）", None
            
            current = dict(current)
            
            # 適配不同的欄位名稱
            current_balance = current.get('balance', current.get('main_balance', 0))
            current_bonus = current.get('bonus_balance', 0)
            current_recharged = current.get('total_recharged', 0)
            current_version = current.get('version', 0)
            wallet_id_col = current.get('id', current.get('user_id'))
            
            balance_before = current_balance + current_bonus
            
            # 處理加款或扣款
            if amount > 0:
                # 加款
                new_balance = current_balance + amount
                new_bonus = current_bonus
                new_total_recharged = current_recharged + amount
                tx_type = TransactionType.ADJUST.value
            else:
                # 扣款
                deduct_amount = abs(amount)
                
                # 檢查餘額是否足夠
                if not allow_negative and balance_before < deduct_amount:
                    conn.rollback()
                    return False, f"餘額不足（當前 ${balance_before/100:.2f}，需扣 ${deduct_amount/100:.2f}）", None
                
                # 優先扣贈送餘額
                bonus_deduct = min(current_bonus, deduct_amount)
                main_deduct = deduct_amount - bonus_deduct
                
                new_balance = current_balance - main_deduct
                new_bonus = current_bonus - bonus_deduct
                new_total_recharged = current_recharged
                tx_type = TransactionType.ADJUST.value
            
            new_version = current_version + 1
            now = datetime.now().isoformat()
            
            # 更新錢包（使用正確的表名和欄位名）
            if self._use_legacy_table:
                cursor.execute(f'''
                    UPDATE {table_name} SET
                        balance = ?,
                        bonus_balance = ?,
                        total_recharged = ?,
                        version = ?,
                        updated_at = ?
                    WHERE id = ?
                ''', (
                    new_balance, new_bonus, new_total_recharged,
                    new_version, now, wallet.id
                ))
            else:
                cursor.execute(f'''
                    UPDATE {table_name} SET
                        main_balance = ?,
                        bonus_balance = ?,
                        total_recharged = ?,
                        version = ?
                    WHERE user_id = ?
                ''', (
                    new_balance, new_bonus, new_total_recharged,
                    new_version, user_id
                ))
            
            if cursor.rowcount == 0:
                conn.rollback()
                return False, "更新錢包失敗", None
            
            # 創建交易記錄
            # 適配新表結構：id 是自增整數，wallet_id 也是整數
            wallet_id_int = current.get('id', 0)  # wallets 表的 id 是整數
            
            cursor.execute('''
                INSERT INTO wallet_transactions
                (wallet_id, user_id, order_id, type, amount, bonus_amount,
                 balance_before, balance_after, category, description,
                 reference_id, reference_type, status, ip_address,
                 created_at, completed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                wallet_id_int, user_id,
                order_id, tx_type, amount,
                0, balance_before,
                new_balance + new_bonus, "admin_adjust", f"管理員調賬: {reason}",
                admin_id, "admin_adjust",
                TransactionStatus.SUCCESS.value, ip_address,
                now, now
            ))
            row_id = cursor.lastrowid
            
            conn.commit()
            
            # 構建返回的流水對象（供後台展示）
            transaction = Transaction(
                id=str(row_id) if row_id else "",
                wallet_id=str(wallet_id_int),
                user_id=user_id,
                order_id=order_id,
                type=tx_type,
                amount=amount,
                bonus_amount=0,
                balance_before=balance_before,
                balance_after=new_balance + new_bonus,
                category="admin_adjust",
                description=f"管理員調賬: {reason}",
                reference_id=admin_id,
                reference_type="admin_adjust",
                status=TransactionStatus.SUCCESS.value,
                ip_address=ip_address,
                created_at=now,
                completed_at=now
            )
            
            # 日誌記錄
            status_note = "（錢包已凍結）" if is_frozen else ""
            action = "加款" if amount > 0 else "扣款"
            logger.info(
                f"[AdminAdjust] {admin_id} {action} {user_id}: "
                f"${abs(amount)/100:.2f}, 原因: {reason}{status_note}"
            )
            
            message = f"調賬成功（{action} ${abs(amount)/100:.2f}）"
            if is_frozen:
                message += "（注意：該錢包處於凍結狀態）"
            
            return True, message, transaction
            
        except Exception as e:
            conn.rollback()
            logger.error(f"Admin adjust error: {e}")
            return False, f"調賬失敗: {str(e)}", None
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
