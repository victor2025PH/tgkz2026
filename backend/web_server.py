#!/usr/bin/env python3
"""
TG-Matrix Web Server
簡單的 HTTP API 服務器，用於 SaaS 部署
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from threading import Thread
import logging

# 設置日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 全局後端服務實例
backend_service = None


class APIHandler(BaseHTTPRequestHandler):
    """HTTP 請求處理器"""
    
    def log_message(self, format, *args):
        """自定義日誌格式"""
        logger.info(f"{self.address_string()} - {format % args}")
    
    def send_json_response(self, data, status=200):
        """發送 JSON 響應"""
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
    def do_OPTIONS(self):
        """處理 CORS 預檢請求"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        """處理 GET 請求"""
        if self.path == '/' or self.path == '/health':
            self.send_json_response({
                'status': 'ok',
                'service': 'TG-Matrix API',
                'version': '1.0.0',
                'timestamp': datetime.now().isoformat()
            })
        elif self.path == '/api/status':
            self.send_json_response({
                'status': 'running',
                'backend_initialized': backend_service is not None,
                'timestamp': datetime.now().isoformat()
            })
        elif self.path == '/api/info':
            self.send_json_response({
                'name': 'TG-Matrix',
                'description': '全鏈路智能營銷自動化系統',
                'features': [
                    'AI 智能對話',
                    '多角色協作',
                    '自動化工作流',
                    '數據分析'
                ],
                'version': '1.0.0'
            })
        else:
            self.send_json_response({'error': 'Not Found'}, 404)
    
    def do_POST(self):
        """處理 POST 請求"""
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'
        
        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            self.send_json_response({'error': 'Invalid JSON'}, 400)
            return
        
        if self.path == '/api/command':
            # 轉發命令到後端服務
            command = data.get('command')
            payload = data.get('payload', {})
            
            if not command:
                self.send_json_response({'error': 'Missing command'}, 400)
                return
            
            # TODO: 實現命令轉發
            self.send_json_response({
                'status': 'received',
                'command': command,
                'message': 'Command processing not yet implemented in web mode'
            })
        else:
            self.send_json_response({'error': 'Not Found'}, 404)


def run_http_server(port=8000):
    """運行 HTTP 服務器"""
    server = HTTPServer(('0.0.0.0', port), APIHandler)
    logger.info(f"🚀 TG-Matrix API Server starting on http://0.0.0.0:{port}")
    server.serve_forever()


async def initialize_backend():
    """初始化後端服務"""
    global backend_service
    
    try:
        from main import BackendService
        backend_service = BackendService()
        await backend_service.initialize()
        logger.info("✅ Backend service initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize backend: {e}")


async def main():
    """主入口"""
    logger.info("=" * 50)
    logger.info("  TG-Matrix Web Server")
    logger.info("=" * 50)
    
    # 初始化後端
    await initialize_backend()
    
    # 獲取端口
    port = int(os.environ.get('PORT', 8000))
    
    # 在單獨的線程中運行 HTTP 服務器
    http_thread = Thread(target=run_http_server, args=(port,), daemon=True)
    http_thread.start()
    
    logger.info(f"✅ Server is running on port {port}")
    logger.info(f"   Health check: http://localhost:{port}/health")
    logger.info(f"   API info: http://localhost:{port}/api/info")
    
    # 保持主線程運行
    try:
        while True:
            await asyncio.sleep(60)
            logger.info(f"💓 Server heartbeat - {datetime.now().isoformat()}")
    except KeyboardInterrupt:
        logger.info("Shutting down...")


if __name__ == "__main__":
    asyncio.run(main())
