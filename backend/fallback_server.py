#!/usr/bin/env python3
"""
TG-Matrix Fallback Server
基礎 HTTP 服務器（無 aiohttp 時使用）
"""

import asyncio
import json
import os
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from threading import Thread
from socketserver import ThreadingMixIn
import logging

logger = logging.getLogger(__name__)

# 全局後端引用
_backend = None


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


class FallbackHandler(BaseHTTPRequestHandler):
    """基礎 HTTP 處理器"""
    
    def log_message(self, format, *args):
        logger.info(f"{self.address_string()} - {format % args}")
    
    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False, default=str).encode('utf-8'))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def get_body(self):
        length = int(self.headers.get('Content-Length', 0))
        if length > 0:
            try:
                return json.loads(self.rfile.read(length).decode('utf-8'))
            except:
                pass
        return {}
    
    def do_GET(self):
        path = self.path.split('?')[0]
        
        if path in ['/', '/health', '/api/health']:
            self.send_json({
                'status': 'ok',
                'service': 'TG-Matrix API (Fallback)',
                'version': '2.1.1',
                'timestamp': datetime.now().isoformat()
            })
        elif path == '/api/v1/accounts':
            self.handle_command('get-accounts', {})
        elif path == '/api/v1/credentials':
            self.handle_command('get-api-credentials', {})
        elif path == '/api/v1/initial-state':
            self.handle_command('get-initial-state', {})
        elif path == '/api/v1/settings':
            self.handle_command('get-settings', {})
        else:
            self.send_json({'success': False, 'error': 'Not Found'}, 404)
    
    def do_POST(self):
        path = self.path.split('?')[0]
        data = self.get_body()
        
        if path in ['/api/command', '/api/v1/command']:
            command = data.get('command', '')
            payload = data.get('payload', {})
            self.handle_command(command, payload)
        elif path == '/api/v1/accounts':
            self.handle_command('add-account', data)
        elif path == '/api/v1/auth/send-code':
            self.handle_command('send-code', data)
        elif path == '/api/v1/auth/verify-code':
            self.handle_command('verify-code', data)
        else:
            self.send_json({'success': False, 'error': 'Not Found'}, 404)
    
    def handle_command(self, command, payload):
        """處理命令"""
        global _backend
        
        if _backend:
            try:
                # 使用 asyncio 運行後端命令
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                result = loop.run_until_complete(
                    _backend.handle_command({'command': command, 'payload': payload})
                )
                loop.close()
                self.send_json(result)
                return
            except Exception as e:
                logger.error(f"Command error: {e}")
                self.send_json({'success': False, 'error': str(e)}, 500)
                return
        
        # 演示模式
        demo_responses = {
            'get-accounts': {'success': True, 'data': []},
            'get-initial-state': {
                'success': True,
                'data': {
                    'accounts': [],
                    'settings': {},
                    'monitoring_status': False,
                    'version': '2.1.1'
                }
            },
            'get-api-credentials': {'success': True, 'data': []},
            'get-settings': {'success': True, 'data': {}},
        }
        
        if command in demo_responses:
            self.send_json(demo_responses[command])
        else:
            self.send_json({
                'success': True,
                'message': f'Command received: {command}',
                'demo_mode': True
            })


async def run_fallback_server(backend=None, port=8000):
    """運行降級服務器"""
    global _backend
    _backend = backend
    
    def run():
        server = ThreadedHTTPServer(('0.0.0.0', port), FallbackHandler)
        logger.info(f"🚀 Fallback HTTP Server running on http://0.0.0.0:{port}")
        server.serve_forever()
    
    thread = Thread(target=run, daemon=True)
    thread.start()
    
    # 保持運行
    while True:
        await asyncio.sleep(3600)
