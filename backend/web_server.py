#!/usr/bin/env python3
"""
TG-Matrix Web Server - 入口點
使用 aiohttp 的統一 HTTP API 服務器
"""

import asyncio
import logging
import os
import sys

# 設置日誌
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 確保能導入本地模組
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


async def init_backend():
    """初始化後端服務"""
    try:
        from main import BackendService
        backend = BackendService()
        await backend.initialize()
        logger.info("✅ Backend service initialized")
        return backend
    except Exception as e:
        logger.warning(f"⚠️ Backend initialization failed: {e}")
        logger.info("Running in demo mode without full backend")
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
