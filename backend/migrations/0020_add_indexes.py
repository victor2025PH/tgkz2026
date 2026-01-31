"""
數據庫索引優化遷移

添加關鍵索引以提升查詢性能
"""

import sqlite3
import os
import logging

logger = logging.getLogger(__name__)

INDEXES = [
    # ==================== 帳號表 ====================
    ('idx_accounts_user_status', 'accounts', 'user_id, status'),
    ('idx_accounts_phone', 'accounts', 'phone'),
    ('idx_accounts_created', 'accounts', 'created_at'),
    
    # ==================== 消息表 ====================
    ('idx_messages_account', 'messages', 'account_id'),
    ('idx_messages_chat', 'messages', 'chat_id'),
    ('idx_messages_date', 'messages', 'date DESC'),
    ('idx_messages_user_date', 'messages', 'user_id, date DESC'),
    
    # ==================== 聯絡人表 ====================
    ('idx_contacts_user', 'unified_contacts', 'user_id'),
    ('idx_contacts_telegram', 'unified_contacts', 'telegram_id'),
    ('idx_contacts_tags', 'unified_contacts', 'tags'),
    
    # ==================== 使用量表 ====================
    ('idx_usage_user_date', 'usage_stats', 'user_id, date'),
    ('idx_usage_date', 'usage_stats', 'date'),
    
    # ==================== 交易表 ====================
    ('idx_transactions_user_date', 'transactions', 'user_id, created_at DESC'),
    ('idx_transactions_status', 'transactions', 'status'),
    
    # ==================== 訂閱表 ====================
    ('idx_subscriptions_status', 'subscriptions', 'status'),
    ('idx_subscriptions_period', 'subscriptions', 'current_period_end'),
    
    # ==================== 備份表 ====================
    ('idx_backups_user_date', 'backups', 'user_id, created_at DESC'),
    ('idx_backups_expires', 'backups', 'expires_at'),
    
    # ==================== 登入歷史 ====================
    ('idx_login_user_date', 'login_history', 'user_id, created_at DESC'),
    ('idx_login_ip_date', 'login_history', 'ip_address, created_at DESC'),
    
    # ==================== 安全告警 ====================
    ('idx_alerts_user_resolved', 'security_alerts', 'user_id, resolved'),
    ('idx_alerts_type', 'security_alerts', 'alert_type'),
    
    # ==================== 2FA ====================
    ('idx_devices_user_expires', 'trusted_devices', 'user_id, expires_at'),
    
    # ==================== API 密鑰 ====================
    ('idx_apikeys_active', 'api_keys', 'is_active, expires_at'),
    
    # ==================== 指標歷史 ====================
    ('idx_metrics_date', 'metrics_history', 'timestamp DESC'),
]


def run_migration(db_path: str = None):
    """運行遷移"""
    db_path = db_path or os.environ.get(
        'DATABASE_PATH',
        os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
    )
    
    if not os.path.exists(db_path):
        logger.warning(f"Database not found: {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    created = 0
    skipped = 0
    errors = 0
    
    for idx_name, table, columns in INDEXES:
        try:
            # 檢查表是否存在
            cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
            if not cursor.fetchone():
                logger.debug(f"Table {table} not found, skipping index {idx_name}")
                skipped += 1
                continue
            
            # 創建索引
            sql = f"CREATE INDEX IF NOT EXISTS {idx_name} ON {table} ({columns})"
            cursor.execute(sql)
            
            # 檢查是否新創建
            cursor.execute(f"SELECT name FROM sqlite_master WHERE type='index' AND name='{idx_name}'")
            if cursor.fetchone():
                created += 1
                logger.info(f"Created index: {idx_name}")
                
        except Exception as e:
            logger.error(f"Error creating index {idx_name}: {e}")
            errors += 1
    
    conn.commit()
    conn.close()
    
    logger.info(f"Index migration complete: {created} created, {skipped} skipped, {errors} errors")
    return {'created': created, 'skipped': skipped, 'errors': errors}


def analyze_tables(db_path: str = None):
    """分析表統計信息"""
    db_path = db_path or os.environ.get(
        'DATABASE_PATH',
        os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
    )
    
    if not os.path.exists(db_path):
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 更新統計信息
    cursor.execute("ANALYZE")
    
    conn.commit()
    conn.close()
    
    logger.info("Table statistics updated")


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    run_migration()
    analyze_tables()
