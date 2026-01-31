"""
TG-Matrix Legacy Proxy
舊處理器代理層

自動將新命令路由器的命令委託到現有的 BackendService.handle_* 方法
提供無縫遷移，同時獲得新架構的好處（日誌、中間件、事件）

使用方式:
    from api.legacy_proxy import create_legacy_handlers
    
    # 在 BackendService 初始化後調用
    create_legacy_handlers(backend_service)
"""

import sys
import asyncio
from typing import Dict, Any, Optional, Callable, List
from functools import wraps

from api.command_router import get_command_router, CommandCategory
from core.logging import get_logger
from core.event_bus import get_event_bus

logger = get_logger('LegacyProxy')

# ============ 命令分類映射 ============

# 帳號相關命令
ACCOUNT_COMMANDS = [
    'add-account', 'login-account', 'logout-account', 'remove-account',
    'check-account-status', 'update-account', 'update-account-data',
    'sync-account-info', 'test-proxy', 'get-accounts',
    'bulk-assign-role', 'bulk-assign-group', 'bulk-delete-accounts',
    'batch-update-accounts', 'save-tags', 'get-tags', 
    'save-groups', 'get-groups', 'save-personas', 'get-personas',
    # QR Login
    'qr-login-create', 'qr-login-status', 'qr-login-refresh',
    'qr-login-submit-2fa', 'qr-login-cancel',
    # IP Binding
    'ip-bind', 'ip-unbind', 'ip-get-binding', 'ip-get-all-bindings',
    'ip-get-statistics', 'ip-verify-binding',
    # Credential Scraper
    'credential-start-scrape', 'credential-submit-code',
    'credential-get-status', 'credential-get-all', 'credential-cancel-scrape',
    # 驗證碼
    'verify-code', 'submit-2fa-password', 'resend-code',
]

# 消息相關命令
MESSAGING_COMMANDS = [
    'send-message', 'send-private-message', 'send-group-message',
    'send-direct-message', 'queue-message', 'get-queue-status',
    'clear-queue', 'pause-queue', 'resume-queue',
    'get-chat-history', 'save-chat-history', 'get-private-messages',
    # 模板
    'add-template', 'remove-template', 'toggle-template-status',
    'get-chat-templates', 'save-chat-template', 'delete-chat-template',
]

# 自動化相關命令
AUTOMATION_COMMANDS = [
    'start-monitoring', 'stop-monitoring', 'pause-monitoring', 'resume-monitoring',
    'one-click-start', 'one-click-stop', 'get-system-status',
    # 群組
    'add-group', 'remove-group', 'join-group', 'leave-group',
    'get-monitored-groups', 'search-groups', 'get-group-members',
    # 關鍵詞
    'add-keyword-set', 'remove-keyword-set', 'get-keyword-sets',
    'save-keyword-set', 'delete-keyword-set', 'bind-keyword-set', 'unbind-keyword-set',
    'add-keyword', 'remove-keyword',
    # 觸發規則
    'get-trigger-rules', 'save-trigger-rule', 'delete-trigger-rule',
    'toggle-trigger-rule', 'test-trigger-rule',
    # 營銷活動
    'add-campaign', 'remove-campaign', 'start-campaign', 'stop-campaign',
    'get-campaigns', 'get-campaign-stats',
]

# AI 相關命令
AI_COMMANDS = [
    'ai-generate-response', 'ai-generate-message', 'ai-generate-group-names',
    'ai-generate-welcome', 'ai-analyze-conversation', 'ai-suggest-reply',
    'get-ai-settings', 'save-ai-settings', 'test-ai-connection',
    'get-ai-models', 'get-ai-usage',
    # 知識庫
    'learn-from-history', 'get-knowledge-stats', 'search-knowledge',
    'add-knowledge', 'remove-knowledge', 'clear-knowledge',
    'add-knowledge-base', 'add-knowledge-item', 'get-knowledge-items',  # 🆕 新增
    # RAG
    'rag-search', 'rag-add-document', 'rag-get-status',
    # 記憶
    'ai-memory-get', 'ai-memory-save', 'ai-memory-clear',
    # 策略
    'ai-get-strategies', 'ai-save-strategy', 'ai-apply-strategy',
]

# 客戶相關命令
CONTACTS_COMMANDS = [
    'get-leads', 'add-lead', 'update-lead', 'delete-lead',
    'get-lead-details', 'update-lead-stage', 'assign-lead',
    # 用戶追蹤
    'get-tracked-users', 'track-user', 'untrack-user', 'get-user-activity',
    # 收集用戶
    'get-collected-users', 'export-collected-users', 'blacklist-user',
    # 成員提取
    'extract-members', 'get-extraction-status', 'cancel-extraction',
    # 漏斗
    'get-funnel-stats', 'update-funnel-stage', 'get-funnel-users',
]

# 系統相關命令
SYSTEM_COMMANDS = [
    'get-initial-state', 'graceful-shutdown',
    'get-settings', 'save-settings', 'reset-settings',
    'get-logs', 'clear-logs', 'export-logs',
    'get-performance', 'get-system-info',
    'backup-database', 'restore-database', 'get-backup-status',
    'run-migrations', 'get-migration-status',
    'get-alerts', 'dismiss-alert', 'clear-alerts',
    # API 憑證
    'get-api-credentials', 'save-api-credential', 'delete-api-credential',
    'test-api-credential',
    # 建群
    'create-group', 'get-created-groups',
]

# 多角色相關命令
MULTI_ROLE_COMMANDS = [
    'get-roles', 'save-role', 'delete-role',
    'get-scenarios', 'save-scenario', 'delete-scenario',
    'get-scripts', 'save-script', 'delete-script',
    'start-collaboration', 'stop-collaboration', 'get-collaboration-status',
    'get-swarm-status', 'start-swarm', 'stop-swarm',
]

# 廣告相關命令
ADS_COMMANDS = [
    'get-ad-campaigns', 'create-ad-campaign', 'update-ad-campaign',
    'delete-ad-campaign', 'start-ad-campaign', 'stop-ad-campaign',
    'get-ad-stats', 'get-ad-templates', 'preview-ad',
]

# 分析相關命令
ANALYTICS_COMMANDS = [
    'get-analytics', 'get-dashboard-stats', 'get-conversion-stats',
    'get-message-stats', 'get-user-stats', 'get-group-stats',
    'export-report', 'schedule-report',
]


def get_category_for_command(command: str) -> CommandCategory:
    """根據命令名獲取分類 - 使用智能匹配"""
    # 優先檢查靜態列表
    if command in ACCOUNT_COMMANDS:
        return CommandCategory.ACCOUNTS
    elif command in MESSAGING_COMMANDS:
        return CommandCategory.MESSAGING
    elif command in AUTOMATION_COMMANDS:
        return CommandCategory.AUTOMATION
    elif command in AI_COMMANDS:
        return CommandCategory.AI
    elif command in CONTACTS_COMMANDS:
        return CommandCategory.CONTACTS
    elif command in SYSTEM_COMMANDS:
        return CommandCategory.SYSTEM
    elif command in MULTI_ROLE_COMMANDS:
        return CommandCategory.AUTOMATION
    elif command in ADS_COMMANDS:
        return CommandCategory.MESSAGING
    elif command in ANALYTICS_COMMANDS:
        return CommandCategory.ANALYTICS
    
    # 🆕 Phase 7: 智能分類 - 根據命令前綴自動分類
    cmd_lower = command.lower()
    
    # 帳號相關
    if any(kw in cmd_lower for kw in ['account', 'login', 'logout', 'session', 'tdata', 'proxy', 'credential', 'ip-bind', 'qr-login']):
        return CommandCategory.ACCOUNTS
    
    # 消息相關
    if any(kw in cmd_lower for kw in ['message', 'send', 'queue', 'template', 'chat', 'greeting']):
        return CommandCategory.MESSAGING
    
    # 自動化相關
    if any(kw in cmd_lower for kw in ['monitor', 'trigger', 'keyword', 'group', 'campaign', 'automation', 'rule', 'schedule', 'ad-']):
        return CommandCategory.AUTOMATION
    
    # AI 相關
    if any(kw in cmd_lower for kw in ['ai', 'rag', 'knowledge', 'memory', 'strategy', 'ollama', 'model', 'tts', 'stt', 'voice']):
        return CommandCategory.AI
    
    # 客戶相關
    if any(kw in cmd_lower for kw in ['lead', 'contact', 'user', 'member', 'funnel', 'track', 'collect', 'extract', 'dnc']):
        return CommandCategory.CONTACTS
    
    # 分析相關
    if any(kw in cmd_lower for kw in ['analytics', 'stats', 'report', 'performance', 'health', 'metric', 'trend']):
        return CommandCategory.ANALYTICS
    
    # 設置相關
    if any(kw in cmd_lower for kw in ['setting', 'config', 'preference']):
        return CommandCategory.SETTINGS
    
    # 多角色相關
    if any(kw in cmd_lower for kw in ['role', 'script', 'collab', 'multi-role', 'swarm', 'execution']):
        return CommandCategory.AUTOMATION
    
    # 資源發現相關
    if any(kw in cmd_lower for kw in ['resource', 'discovery', 'search', 'jiso', 'channel']):
        return CommandCategory.AUTOMATION
    
    # 默認歸類為系統
    return CommandCategory.SYSTEM


def command_to_method_name(command: str) -> str:
    """
    將命令名轉換為方法名
    例如: 'add-account' -> 'handle_add_account'
    """
    return 'handle_' + command.replace('-', '_')


def create_legacy_handler(backend_service, command: str, method_name: str):
    """
    創建舊處理器的代理函數
    """
    async def legacy_handler(payload: Any, context: Dict[str, Any]) -> Any:
        """代理到 BackendService 的舊處理器"""
        # 🔧 P0: 添加詳細日誌
        print(f"[LegacyProxy] Routing command '{command}' to method '{method_name}'", file=sys.stderr)
        
        method = getattr(backend_service, method_name, None)
        
        if method is None:
            print(f"[LegacyProxy] ❌ Method not found: {method_name}", file=sys.stderr)
            logger.warning(f"Method not found: {method_name}")
            return None
        
        print(f"[LegacyProxy] ✓ Method found, calling {method_name}", file=sys.stderr)
        
        try:
            # 調用舊處理器
            if payload is not None:
                result = await method(payload)
            else:
                result = await method()
            
            # 發布事件
            event_bus = get_event_bus()
            await event_bus.publish(f'command.{command}.completed', {
                'command': command,
                'success': True
            })
            
            return result
            
        except Exception as e:
            # 發布錯誤事件
            event_bus = get_event_bus()
            await event_bus.publish(f'command.{command}.failed', {
                'command': command,
                'error': str(e)
            })
            raise
    
    return legacy_handler


def create_legacy_handlers(backend_service) -> int:
    """
    為所有已知命令創建舊處理器代理
    
    Args:
        backend_service: BackendService 實例
        
    Returns:
        已註冊的命令數量
    """
    router = get_command_router()
    if router is None:
        logger.error("Command router not initialized")
        return 0
    
    # 🆕 Phase 7: 自動發現所有 handle_* 方法，而不是使用手動列表
    # 這樣可以確保覆蓋所有命令，無需維護命令列表
    
    registered = 0
    skipped = 0
    auto_discovered = 0
    
    # 獲取所有 handle_* 方法
    for attr_name in dir(backend_service):
        if not attr_name.startswith('handle_'):
            continue
        
        method = getattr(backend_service, attr_name, None)
        if method is None or not callable(method):
            continue
        
        # 將方法名轉換為命令名
        # handle_add_account -> add-account
        command = attr_name[7:].replace('_', '-')  # 移除 'handle_' 前綴
        
        # 檢查命令是否已註冊
        if router.has_command(command):
            skipped += 1
            continue
        
        # 獲取分類
        category = get_category_for_command(command)
        
        # 創建代理處理器
        handler = create_legacy_handler(backend_service, command, attr_name)
        
        # 註冊到路由器
        try:
            router.register(command, category=category)(handler)
            registered += 1
            auto_discovered += 1
        except Exception as e:
            logger.error(f"Failed to register {command}: {e}")
    
    logger.info(f"Legacy handlers auto-discovered: {auto_discovered}, registered: {registered}, skipped: {skipped}")
    return registered


def get_all_known_commands() -> List[str]:
    """獲取所有已知命令列表"""
    return (
        ACCOUNT_COMMANDS + MESSAGING_COMMANDS + AUTOMATION_COMMANDS +
        AI_COMMANDS + CONTACTS_COMMANDS + SYSTEM_COMMANDS +
        MULTI_ROLE_COMMANDS + ADS_COMMANDS + ANALYTICS_COMMANDS
    )


def get_command_categories() -> Dict[str, List[str]]:
    """獲取命令分類"""
    return {
        'account': ACCOUNT_COMMANDS,
        'messaging': MESSAGING_COMMANDS,
        'automation': AUTOMATION_COMMANDS,
        'ai': AI_COMMANDS,
        'contacts': CONTACTS_COMMANDS,
        'system': SYSTEM_COMMANDS,
        'multi_role': MULTI_ROLE_COMMANDS,
        'ads': ADS_COMMANDS,
        'analytics': ANALYTICS_COMMANDS,
    }
