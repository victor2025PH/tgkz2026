"""
TG-Matrix 用戶錢包系統
User Wallet System

提供完整的用戶資金管理功能：
- 餘額管理（可用餘額、凍結餘額、贈送餘額）
- 充值系統（USDT/支付寶/微信/銀行卡）
- 消費系統（會員/IP/配額等）
- 流水記錄（完整審計）
- 提現系統

設計原則：
1. 金額使用整數（分）存儲，避免浮點精度問題
2. 樂觀鎖 + 事務確保資金安全
3. 每筆交易記錄前後餘額
4. 支持多幣種（USD 為主）
"""

from .models import (
    WalletStatus, TransactionType, TransactionStatus,
    PaymentMethod, PaymentChannel, RechargeStatus,
    Wallet, Transaction, RechargeOrder, RechargePackage
)
from .wallet_service import (
    WalletService, get_wallet_service, init_wallet_service
)
from .transaction_service import (
    TransactionService, get_transaction_service
)

__all__ = [
    # 枚舉
    'WalletStatus', 'TransactionType', 'TransactionStatus',
    'PaymentMethod', 'PaymentChannel', 'RechargeStatus',
    # 數據模型
    'Wallet', 'Transaction', 'RechargeOrder', 'RechargePackage',
    # 服務
    'WalletService', 'get_wallet_service', 'init_wallet_service',
    'TransactionService', 'get_transaction_service',
]
