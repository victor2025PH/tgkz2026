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
from .recharge_service import (
    RechargeService, get_recharge_service
)
from .usdt_service import (
    UsdtPaymentService, get_usdt_service,
    UsdtPaymentWatcher, get_usdt_watcher
)
from .consume_service import (
    ConsumeService, get_consume_service,
    ConsumeRequest, ConsumeResult, ConsumeError
)
from .scheduler import (
    WalletScheduler, get_scheduler, start_scheduler, stop_scheduler
)
from .admin_handlers import (
    setup_admin_wallet_routes, admin_wallet_handlers
)
from .business_integration import (
    BusinessIntegrationService, get_business_service,
    PurchaseRequest, PurchaseResult
)
from .purchase_handlers import (
    setup_purchase_routes, purchase_handlers
)
from .notification_service import (
    WalletNotificationService, get_notification_service,
    start_notification_service, stop_notification_service
)
from .withdraw_service import (
    WithdrawService, get_withdraw_service
)
from .withdraw_handlers import (
    setup_withdraw_routes, withdraw_handlers
)
from .redeem_service import (
    RedeemService, get_redeem_service
)
from .redeem_handlers import (
    setup_redeem_routes, redeem_handlers
)
from .payment_password_service import (
    PaymentPasswordService, get_pay_password_service
)
from .pay_password_handlers import (
    setup_pay_password_routes, pay_password_handlers
)
from .coupon_service import (
    CouponService, get_coupon_service
)
from .coupon_handlers import (
    setup_coupon_routes, coupon_handlers
)
from .finance_report_service import (
    FinanceReportService, get_finance_report_service
)
from .finance_report_handlers import (
    setup_finance_report_routes, finance_report_handlers
)
from .user_wallet_integration import (
    UserWalletIntegration, get_user_wallet_integration,
    ensure_user_wallet, check_user_balance
)
from .batch_operations import (
    BatchOperationService, get_batch_operation_service,
    BatchOperation, BatchOperationType
)
from .monitoring_service import (
    WalletMonitoringService, get_monitoring_service,
    Alert, AlertType, AlertSeverity
)
from .payment_address_service import (
    PaymentAddressService, get_payment_address_service
)
from .payment_config_handlers import (
    setup_payment_config_routes, payment_config_handlers
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
    'RechargeService', 'get_recharge_service',
    'UsdtPaymentService', 'get_usdt_service',
    'UsdtPaymentWatcher', 'get_usdt_watcher',
    'ConsumeService', 'get_consume_service',
    'ConsumeRequest', 'ConsumeResult', 'ConsumeError',
    'WalletScheduler', 'get_scheduler', 'start_scheduler', 'stop_scheduler',
    'setup_admin_wallet_routes', 'admin_wallet_handlers',
    'BusinessIntegrationService', 'get_business_service',
    'PurchaseRequest', 'PurchaseResult',
    'setup_purchase_routes', 'purchase_handlers',
    'WalletNotificationService', 'get_notification_service',
    'start_notification_service', 'stop_notification_service',
    'WithdrawService', 'get_withdraw_service',
    'setup_withdraw_routes', 'withdraw_handlers',
    'RedeemService', 'get_redeem_service',
    'setup_redeem_routes', 'redeem_handlers',
    'PaymentPasswordService', 'get_pay_password_service',
    'setup_pay_password_routes', 'pay_password_handlers',
    'CouponService', 'get_coupon_service',
    'setup_coupon_routes', 'coupon_handlers',
    'FinanceReportService', 'get_finance_report_service',
    'setup_finance_report_routes', 'finance_report_handlers',
    # Phase 2 & 3: 用戶整合與運營工具
    'UserWalletIntegration', 'get_user_wallet_integration',
    'ensure_user_wallet', 'check_user_balance',
    'BatchOperationService', 'get_batch_operation_service',
    'BatchOperation', 'BatchOperationType',
    'WalletMonitoringService', 'get_monitoring_service',
    'Alert', 'AlertType', 'AlertSeverity',
    # Phase 1.1: 支付地址管理
    'PaymentAddressService', 'get_payment_address_service',
    'setup_payment_config_routes', 'payment_config_handlers',
]
