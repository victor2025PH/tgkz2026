#!/usr/bin/env python3
"""
TG-Matrix Web Server - 入口點
使用 aiohttp 的統一 HTTP API 服務器
"""

import asyncio
import logging
import os
import sys
import time

# 設置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 確保能導入本地模組
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 🆕 診斷: 檢查 wallet 目錄
wallet_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'wallet')
if os.path.exists(wallet_dir):
    wallet_files = os.listdir(wallet_dir)
    logger.info(f"✅ Wallet directory found: {len(wallet_files)} files")
else:
    logger.warning(f"⚠️ Wallet directory NOT found: {wallet_dir}")


async def init_backend():
    """初始化後端服務"""
    # 🆕 確保 auth 數據庫表已遷移（添加 telegram_id 等列）
    try:
        from auth.service import get_auth_service
        auth_service = get_auth_service()
        logger.info("✅ Auth service initialized (database migrated)")
    except Exception as e:
        logger.warning(f"⚠️ Auth service init warning: {e}")
    
    try:
        logger.info("📦 Step 1: Importing BackendService...")
        from main import BackendService
        logger.info("📦 Step 2: BackendService imported, creating instance...")
        backend = BackendService()
        logger.info("📦 Step 3: BackendService instance created, calling initialize()...")
        await backend.initialize()
        logger.info("✅ Step 4: Backend service FULLY initialized")
        # 初始化成功，清理旧的错误文件
        try:
            error_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'backend_init_error.json')
            if os.path.exists(error_path):
                os.remove(error_path)
                logger.info("🧹 Cleaned up old init error file")
        except Exception:
            pass
        return backend
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        # 🔧 P1: 寫入文件 + 環境變量以便診斷端點讀取
        try:
            error_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'backend_init_error.json')
            os.makedirs(os.path.dirname(error_path), exist_ok=True)
            import json as _json
            with open(error_path, 'w') as f:
                _json.dump({
                    'error': str(e),
                    'type': type(e).__name__,
                    'traceback': error_detail,
                    'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S')
                }, f, indent=2)
            logger.info(f"📝 Init error saved to {error_path}")
        except Exception as write_err:
            logger.error(f"Could not save init error: {write_err}")
        
        logger.error(f"❌ Backend initialization FAILED: {e}")
        logger.error(f"❌ Full traceback:\n{error_detail}")
        logger.warning("⚠️ Running in DEMO MODE — accounts and all commands will return empty data!")
        return None


async def main():
    """主入口"""
    logger.info("=" * 60)
    logger.info("  TG-Matrix Web Server v2.1.1")
    logger.info("  Unified HTTP API + WebSocket")
    logger.info("=" * 60)
    
    # 初始化後端
    backend = await init_backend()
    
    # 檢查是否有 aiohttp
    try:
        from api.http_server import HttpApiServer
        
        port = int(os.environ.get('PORT', 8000))
        server = HttpApiServer(backend_service=backend, port=port)
        await server.start()
        
        logger.info(f"✅ HTTP API Server running on port {port}")
        
        # 🆕 Phase 2: 啟動錢包調度器（USDT 監聽 + 訂單過期處理）
        try:
            from wallet.scheduler import get_scheduler
            wallet_scheduler = get_scheduler()
            await wallet_scheduler.start()
            logger.info("✅ Wallet scheduler started (USDT watcher + order expiry)")
        except Exception as e:
            logger.warning(f"⚠️ Wallet scheduler start failed: {e}")
        
        # 保持運行
        while True:
            await asyncio.sleep(3600)
            
    except ImportError as e:
        logger.warning(f"aiohttp not available, using fallback server: {e}")
        
        # 降級到基礎 HTTP 服務器
        from fallback_server import run_fallback_server
        await run_fallback_server(backend)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server shutdown requested")
    except Exception as e:
        logger.exception(f"Server error: {e}")
        sys.exit(1)
