#!/usr/bin/env python3
"""
TG-Matrix Web Server
完整的 HTTP API 服務器，用於 SaaS 部署
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from threading import Thread
from socketserver import ThreadingMixIn
import logging
import traceback

# 設置日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 全局後端服務實例
backend_service = None
db = None
telegram_client = None
api_pool = None


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """支持多線程的 HTTP 服務器"""
    daemon_threads = True


class APIHandler(BaseHTTPRequestHandler):
    """HTTP 請求處理器"""
    
    def log_message(self, format, *args):
        """自定義日誌格式"""
        logger.info(f"{self.address_string()} - {format % args}")
    
    def send_json_response(self, data, status=200):
        """發送 JSON 響應"""
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        response = json.dumps(data, ensure_ascii=False, default=str)
        self.wfile.write(response.encode('utf-8'))
    
    def do_OPTIONS(self):
        """處理 CORS 預檢請求"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def parse_path(self):
        """解析路徑和查詢參數"""
        if '?' in self.path:
            path, query = self.path.split('?', 1)
            params = dict(p.split('=') for p in query.split('&') if '=' in p)
        else:
            path, params = self.path, {}
        return path, params
    
    def get_body(self):
        """獲取請求體"""
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 0:
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                return json.loads(body)
            except:
                return {}
        return {}
    
    def do_GET(self):
        """處理 GET 請求"""
        path, params = self.parse_path()
        
        try:
            # 健康檢查
            if path in ['/', '/health', '/api/health']:
                self.send_json_response({
                    'status': 'ok',
                    'service': 'TG-Matrix API',
                    'version': '2.1.1',
                    'timestamp': datetime.now().isoformat()
                })
            
            # 獲取帳號列表
            elif path == '/api/accounts':
                accounts = self.get_accounts()
                self.send_json_response({'success': True, 'data': accounts})
            
            # 獲取 API 憑證池
            elif path == '/api/credentials':
                credentials = self.get_credentials()
                self.send_json_response({'success': True, 'data': credentials})
            
            # 獲取 API 憑證池狀態
            elif path == '/api/credentials/pool':
                pool_status = self.get_credential_pool_status()
                self.send_json_response({'success': True, 'data': pool_status})
            
            # 智能推薦 API
            elif path == '/api/credentials/recommend':
                recommended = self.get_recommended_credential()
                self.send_json_response({'success': True, 'data': recommended})
            
            # 獲取分組
            elif path == '/api/groups':
                groups = self.get_groups()
                self.send_json_response({'success': True, 'data': groups})
            
            # 獲取標籤
            elif path == '/api/tags':
                tags = self.get_tags()
                self.send_json_response({'success': True, 'data': tags})
            
            # 系統狀態
            elif path == '/api/status':
                self.send_json_response({
                    'success': True,
                    'data': {
                        'status': 'running',
                        'backend_initialized': backend_service is not None,
                        'db_connected': db is not None,
                        'timestamp': datetime.now().isoformat()
                    }
                })
            
            # 系統信息
            elif path == '/api/info':
                self.send_json_response({
                    'success': True,
                    'data': {
                        'name': 'TG-Matrix',
                        'description': '全鏈路智能營銷自動化系統',
                        'version': '2.1.1',
                        'features': ['AI 智能對話', '多角色協作', '自動化工作流', '數據分析']
                    }
                })
            
            else:
                self.send_json_response({'success': False, 'error': 'Not Found'}, 404)
                
        except Exception as e:
            logger.error(f"GET error: {e}\n{traceback.format_exc()}")
            self.send_json_response({'success': False, 'error': str(e)}, 500)
    
    def do_POST(self):
        """處理 POST 請求"""
        path, params = self.parse_path()
        data = self.get_body()
        
        try:
            # 發送驗證碼
            if path == '/api/send-code':
                result = self.send_verification_code(data)
                self.send_json_response(result)
            
            # 驗證驗證碼
            elif path == '/api/verify-code':
                result = self.verify_code(data)
                self.send_json_response(result)
            
            # 添加帳號
            elif path == '/api/accounts':
                result = self.add_account(data)
                self.send_json_response(result)
            
            # 登入帳號
            elif path == '/api/accounts/login':
                result = self.login_account(data)
                self.send_json_response(result)
            
            # 登出帳號
            elif path == '/api/accounts/logout':
                result = self.logout_account(data)
                self.send_json_response(result)
            
            # 添加 API 憑證
            elif path == '/api/credentials':
                result = self.add_credential(data)
                self.send_json_response(result)
            
            # 通用命令處理
            elif path == '/api/command':
                result = self.handle_command(data)
                self.send_json_response(result)
            
            else:
                self.send_json_response({'success': False, 'error': 'Not Found'}, 404)
                
        except Exception as e:
            logger.error(f"POST error: {e}\n{traceback.format_exc()}")
            self.send_json_response({'success': False, 'error': str(e)}, 500)
    
    def do_DELETE(self):
        """處理 DELETE 請求"""
        path, params = self.parse_path()
        
        try:
            if path.startswith('/api/accounts/'):
                account_id = path.split('/')[-1]
                result = self.delete_account(account_id)
                self.send_json_response(result)
            
            elif path.startswith('/api/credentials/'):
                credential_id = path.split('/')[-1]
                result = self.delete_credential(credential_id)
                self.send_json_response(result)
            
            else:
                self.send_json_response({'success': False, 'error': 'Not Found'}, 404)
                
        except Exception as e:
            logger.error(f"DELETE error: {e}\n{traceback.format_exc()}")
            self.send_json_response({'success': False, 'error': str(e)}, 500)
    
    # ========== 帳號管理 API ==========
    
    def get_accounts(self):
        """獲取帳號列表"""
        if db:
            try:
                accounts = db.execute("SELECT * FROM accounts ORDER BY id DESC").fetchall()
                return [dict(a) for a in accounts]
            except Exception as e:
                logger.error(f"Get accounts error: {e}")
        return []
    
    def add_account(self, data):
        """添加帳號"""
        phone = data.get('phone')
        api_id = data.get('apiId')
        api_hash = data.get('apiHash')
        
        if not phone:
            return {'success': False, 'error': '手機號碼不能為空'}
        
        if db:
            try:
                db.execute(
                    "INSERT INTO accounts (phone, api_id, api_hash, status) VALUES (?, ?, ?, ?)",
                    (phone, api_id, api_hash, 'Offline')
                )
                db.commit()
                return {'success': True, 'message': '帳號添加成功'}
            except Exception as e:
                logger.error(f"Add account error: {e}")
                return {'success': False, 'error': str(e)}
        
        return {'success': False, 'error': '數據庫未連接'}
    
    def delete_account(self, account_id):
        """刪除帳號"""
        if db:
            try:
                db.execute("DELETE FROM accounts WHERE id = ?", (account_id,))
                db.commit()
                return {'success': True, 'message': '帳號已刪除'}
            except Exception as e:
                return {'success': False, 'error': str(e)}
        return {'success': False, 'error': '數據庫未連接'}
    
    def login_account(self, data):
        """登入帳號"""
        account_id = data.get('accountId')
        return {'success': True, 'message': '登入請求已發送', 'needCode': True}
    
    def logout_account(self, data):
        """登出帳號"""
        account_id = data.get('accountId')
        if db:
            try:
                db.execute("UPDATE accounts SET status = 'Offline' WHERE id = ?", (account_id,))
                db.commit()
                return {'success': True, 'message': '已登出'}
            except Exception as e:
                return {'success': False, 'error': str(e)}
        return {'success': False, 'error': '數據庫未連接'}
    
    # ========== 驗證碼 API ==========
    
    def send_verification_code(self, data):
        """發送驗證碼"""
        phone = data.get('phone')
        api_id = data.get('apiId')
        api_hash = data.get('apiHash')
        
        if not phone:
            return {'success': False, 'error': '手機號碼不能為空'}
        
        # 嘗試使用 telegram_client 發送驗證碼
        if telegram_client:
            try:
                # TODO: 實現 Telegram 驗證碼發送
                logger.info(f"Sending verification code to {phone}")
                return {'success': True, 'message': '驗證碼已發送', 'phoneCodeHash': 'demo_hash'}
            except Exception as e:
                logger.error(f"Send code error: {e}")
                return {'success': False, 'error': str(e)}
        
        # Demo 模式
        logger.warning("Telegram client not initialized, using demo mode")
        return {
            'success': True, 
            'message': '驗證碼已發送（演示模式）',
            'phoneCodeHash': 'demo_hash',
            'demo': True
        }
    
    def verify_code(self, data):
        """驗證驗證碼"""
        phone = data.get('phone')
        code = data.get('code')
        phone_code_hash = data.get('phoneCodeHash')
        
        if not code:
            return {'success': False, 'error': '驗證碼不能為空'}
        
        # Demo 模式
        return {'success': True, 'message': '驗證成功（演示模式）', 'demo': True}
    
    # ========== API 憑證管理 ==========
    
    def get_credentials(self):
        """獲取 API 憑證列表"""
        if db:
            try:
                creds = db.execute("SELECT * FROM api_credentials ORDER BY id DESC").fetchall()
                return [dict(c) for c in creds]
            except Exception as e:
                logger.error(f"Get credentials error: {e}")
        return []
    
    def get_credential_pool_status(self):
        """獲取憑證池狀態"""
        credentials = self.get_credentials()
        return {
            'total': len(credentials),
            'available': len([c for c in credentials if c.get('status') == 'active']),
            'credentials': credentials
        }
    
    def get_recommended_credential(self):
        """獲取推薦的 API 憑證"""
        credentials = self.get_credentials()
        if credentials:
            # 返回第一個可用的憑證
            for cred in credentials:
                if cred.get('status') == 'active':
                    return cred
            return credentials[0]
        
        # 返回默認憑證（如果配置了）
        default_api_id = os.environ.get('DEFAULT_API_ID')
        default_api_hash = os.environ.get('DEFAULT_API_HASH')
        if default_api_id and default_api_hash:
            return {
                'id': 0,
                'api_id': default_api_id,
                'api_hash': default_api_hash,
                'name': 'Default API',
                'status': 'active'
            }
        
        return None
    
    def add_credential(self, data):
        """添加 API 憑證"""
        api_id = data.get('apiId')
        api_hash = data.get('apiHash')
        name = data.get('name', 'My API')
        
        if not api_id or not api_hash:
            return {'success': False, 'error': 'API ID 和 API Hash 不能為空'}
        
        if db:
            try:
                db.execute(
                    "INSERT INTO api_credentials (api_id, api_hash, name, status) VALUES (?, ?, ?, ?)",
                    (api_id, api_hash, name, 'active')
                )
                db.commit()
                return {'success': True, 'message': 'API 憑證添加成功'}
            except Exception as e:
                return {'success': False, 'error': str(e)}
        
        return {'success': False, 'error': '數據庫未連接'}
    
    def delete_credential(self, credential_id):
        """刪除 API 憑證"""
        if db:
            try:
                db.execute("DELETE FROM api_credentials WHERE id = ?", (credential_id,))
                db.commit()
                return {'success': True, 'message': '憑證已刪除'}
            except Exception as e:
                return {'success': False, 'error': str(e)}
        return {'success': False, 'error': '數據庫未連接'}
    
    # ========== 其他 API ==========
    
    def get_groups(self):
        """獲取分組列表"""
        if db:
            try:
                groups = db.execute("SELECT * FROM account_groups ORDER BY name").fetchall()
                return [dict(g) for g in groups]
            except:
                pass
        return []
    
    def get_tags(self):
        """獲取標籤列表"""
        if db:
            try:
                tags = db.execute("SELECT * FROM tags ORDER BY name").fetchall()
                return [dict(t) for t in tags]
            except:
                pass
        return []
    
    def handle_command(self, data):
        """處理通用命令"""
        command = data.get('command')
        payload = data.get('payload', {})
        
        logger.info(f"Received command: {command}")
        
        # 根據命令類型分發
        command_handlers = {
            'get_accounts': lambda: {'success': True, 'data': self.get_accounts()},
            'get_credentials': lambda: {'success': True, 'data': self.get_credentials()},
            'get_groups': lambda: {'success': True, 'data': self.get_groups()},
            'get_tags': lambda: {'success': True, 'data': self.get_tags()},
        }
        
        handler = command_handlers.get(command)
        if handler:
            return handler()
        
        return {
            'success': True,
            'message': f'Command received: {command}',
            'note': 'Some features may be limited in web mode'
        }


def run_http_server(port=8000):
    """運行 HTTP 服務器"""
    server = ThreadedHTTPServer(('0.0.0.0', port), APIHandler)
    logger.info(f"🚀 TG-Matrix API Server running on http://0.0.0.0:{port}")
    server.serve_forever()


def init_database():
    """初始化數據庫連接"""
    global db
    
    try:
        import sqlite3
        
        # 確保數據目錄存在
        os.makedirs('/app/data', exist_ok=True)
        db_path = '/app/data/tgmatrix.db'
        
        # 連接數據庫
        db = sqlite3.connect(db_path, check_same_thread=False)
        db.row_factory = sqlite3.Row
        
        # 創建基本表
        db.executescript('''
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT UNIQUE NOT NULL,
                api_id TEXT,
                api_hash TEXT,
                status TEXT DEFAULT 'Offline',
                session_string TEXT,
                first_name TEXT,
                last_name TEXT,
                username TEXT,
                telegram_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS api_credentials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                api_id TEXT NOT NULL,
                api_hash TEXT NOT NULL,
                name TEXT,
                status TEXT DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS account_groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                color TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                color TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        ''')
        db.commit()
        
        logger.info(f"✅ Database connected: {db_path}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Database error: {e}")
        return False


async def main():
    """主入口"""
    logger.info("=" * 50)
    logger.info("  TG-Matrix Web Server v2.1.1")
    logger.info("=" * 50)
    
    # 初始化數據庫
    init_database()
    
    # 獲取端口
    port = int(os.environ.get('PORT', 8000))
    
    # 在單獨的線程中運行 HTTP 服務器
    http_thread = Thread(target=run_http_server, args=(port,), daemon=True)
    http_thread.start()
    
    logger.info(f"✅ Server is running on port {port}")
    logger.info(f"   Health check: http://localhost:{port}/health")
    logger.info(f"   API endpoints:")
    logger.info(f"   - GET  /api/accounts     - 獲取帳號列表")
    logger.info(f"   - POST /api/accounts     - 添加帳號")
    logger.info(f"   - GET  /api/credentials  - 獲取 API 憑證")
    logger.info(f"   - POST /api/send-code    - 發送驗證碼")
    
    # 保持主線程運行
    try:
        while True:
            await asyncio.sleep(300)
            logger.info(f"💓 Server heartbeat - {datetime.now().isoformat()}")
    except KeyboardInterrupt:
        logger.info("Shutting down...")


if __name__ == "__main__":
    asyncio.run(main())
