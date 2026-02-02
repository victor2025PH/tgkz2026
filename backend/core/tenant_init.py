"""
多租戶系統初始化

🆕 功能：
1. 應用啟動時自動初始化多租戶系統
2. 檢測並執行必要的數據遷移
3. 確保向後兼容性

使用方法：
    from core.tenant_init import initialize_tenant_system
    
    # 在應用啟動時調用
    await initialize_tenant_system()
"""

import os
import logging
from pathlib import Path
from typing import Dict, Any

logger = logging.getLogger(__name__)


async def initialize_tenant_system(auto_migrate: bool = True) -> Dict[str, Any]:
    """
    初始化多租戶系統
    
    Args:
        auto_migrate: 是否自動執行本地用戶遷移（Electron 模式）
    
    Returns:
        初始化結果
    """
    from config import DATABASE_DIR
    
    result = {
        'success': True,
        'mode': 'unknown',
        'migration_status': None,
        'db_manager_ready': False,
        'errors': []
    }
    
    try:
        # 1. 確定運行模式
        is_electron = os.environ.get('ELECTRON_MODE', 'false').lower() == 'true'
        result['mode'] = 'electron' if is_electron else 'saas'
        
        logger.info(f"[TenantInit] 初始化多租戶系統 (模式: {result['mode']})")
        
        # 2. 初始化數據庫管理器
        from .tenant_database import get_tenant_db_manager, TENANTS_DIR
        
        db_manager = get_tenant_db_manager()
        result['db_manager_ready'] = True
        
        # 確保租戶目錄存在
        TENANTS_DIR.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"[TenantInit] 租戶目錄: {TENANTS_DIR}")
        
        # 3. 獲取遷移狀態
        from .tenant_migration import get_migration_status, run_local_migration
        
        migration_status = get_migration_status()
        result['migration_status'] = migration_status['status']
        
        # 4. 處理 Electron 本地模式
        if is_electron and auto_migrate:
            # 檢查是否需要遷移本地用戶數據
            from .tenant_database import LOCAL_USER_ID
            
            local_db_path = db_manager._get_tenant_db_path(LOCAL_USER_ID)
            
            if not local_db_path.exists() or local_db_path.stat().st_size < 1024:
                logger.info("[TenantInit] 檢測到需要遷移本地用戶數據...")
                
                try:
                    stats = run_local_migration()
                    result['migration_result'] = stats.to_dict()
                    logger.info(f"[TenantInit] 本地用戶遷移完成: {stats.migrated_records} 條記錄")
                except Exception as e:
                    logger.warning(f"[TenantInit] 本地用戶遷移失敗（非致命）: {e}")
                    result['errors'].append(f"本地遷移失敗: {e}")
        
        # 5. 輸出統計信息
        stats = db_manager.get_stats()
        result['db_stats'] = stats
        
        logger.info(f"[TenantInit] 初始化完成 - 活躍連接: {stats['active_connections']}")
        
    except Exception as e:
        logger.error(f"[TenantInit] 初始化失敗: {e}")
        result['success'] = False
        result['errors'].append(str(e))
    
    return result


def check_migration_needed() -> bool:
    """
    檢查是否需要執行遷移
    
    Returns:
        True 如果需要遷移
    """
    try:
        from .tenant_migration import get_migration_status
        
        status = get_migration_status()
        
        # 如果有待處理的用戶，需要遷移
        if status['pending_users'] > 0:
            return True
        
        # 如果遷移失敗，需要重試
        if status['status'] == 'failed':
            return True
        
        # 如果舊數據庫存在但沒有租戶數據庫，需要遷移
        if status['legacy_db_exists'] and not status['tenants']:
            return True
        
        return False
        
    except Exception as e:
        logger.error(f"[TenantInit] 檢查遷移狀態失敗: {e}")
        return False


def get_tenant_system_status() -> Dict[str, Any]:
    """
    獲取多租戶系統狀態
    
    Returns:
        系統狀態信息
    """
    try:
        from .tenant_database import get_tenant_db_manager
        from .tenant_migration import get_migration_status
        
        db_manager = get_tenant_db_manager()
        
        return {
            'initialized': True,
            'db_stats': db_manager.get_stats(),
            'migration': get_migration_status(),
            'mode': 'electron' if os.environ.get('ELECTRON_MODE', 'false').lower() == 'true' else 'saas'
        }
        
    except Exception as e:
        return {
            'initialized': False,
            'error': str(e)
        }


# ============ 向後兼容層 ============

def get_database_connection(table_name: str = None, tenant_id: str = None):
    """
    向後兼容的數據庫連接獲取函數
    
    自動根據表名和租戶上下文選擇正確的數據庫連接
    
    Args:
        table_name: 表名（可選）
        tenant_id: 租戶 ID（可選，自動從上下文獲取）
    
    Returns:
        數據庫連接
    """
    from .tenant_database import (
        get_tenant_db_manager,
        is_system_table,
        LOCAL_USER_ID
    )
    from .tenant_context import get_user_id
    
    db_manager = get_tenant_db_manager()
    
    # 確定租戶 ID
    if not tenant_id:
        tenant_id = get_user_id() or LOCAL_USER_ID
    
    # 根據表名選擇數據庫
    if table_name and is_system_table(table_name):
        return db_manager.get_system_connection()
    else:
        return db_manager.get_tenant_connection(tenant_id)


# ============ CLI 支持 ============

if __name__ == '__main__':
    import asyncio
    import argparse
    
    parser = argparse.ArgumentParser(description='多租戶系統管理')
    parser.add_argument('command', choices=['init', 'status', 'migrate', 'verify'],
                        help='命令：init=初始化, status=查看狀態, migrate=執行遷移, verify=驗證遷移')
    parser.add_argument('--force', action='store_true', help='強制重新遷移')
    parser.add_argument('--user', type=str, help='指定用戶 ID（用於驗證）')
    
    args = parser.parse_args()
    
    logging.basicConfig(level=logging.INFO)
    
    if args.command == 'init':
        result = asyncio.run(initialize_tenant_system())
        print(f"初始化結果: {result}")
        
    elif args.command == 'status':
        status = get_tenant_system_status()
        import json
        print(json.dumps(status, indent=2, ensure_ascii=False, default=str))
        
    elif args.command == 'migrate':
        from .tenant_migration import run_migration
        stats = run_migration(force=args.force)
        print(f"遷移結果: {stats.to_dict()}")
        
    elif args.command == 'verify':
        if not args.user:
            print("請使用 --user 指定用戶 ID")
        else:
            from .tenant_migration import verify_user_migration
            result = verify_user_migration(args.user)
            import json
            print(json.dumps(result, indent=2, ensure_ascii=False))
