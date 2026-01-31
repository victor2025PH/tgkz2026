"""
API 憑據自動獲取服務 (Credential Scraper)
使用 Playwright 自動從 my.telegram.org 獲取原生 API ID 和 Hash

功能：
1. 自動登入 my.telegram.org
2. 自動接收驗證碼（通過 Telethon 監聽）
3. 自動創建/獲取 API 憑據
4. 後台靜默運行，不在前端顯示

注意：此模組需要已登入的 Telegram Session 才能接收驗證碼
"""
import asyncio
import json
import random
import string
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple, Callable
from dataclasses import dataclass, asdict


@dataclass
class APICredential:
    """API 憑據記錄"""
    api_id: str
    api_hash: str
    app_title: str
    app_short_name: str
    obtained_at: str
    phone: str


@dataclass
class CredentialLog:
    """憑據獲取日誌"""
    id: Optional[int]
    account_id: int
    phone: str
    action: str  # 'scrape_started', 'code_received', 'credentials_obtained', 'error'
    api_id: Optional[str]
    api_hash: Optional[str]
    status: str  # 'pending', 'in_progress', 'success', 'failed'
    error_message: Optional[str]
    created_at: str
    details_json: Optional[str]


class CredentialScraper:
    """
    API 憑據自動獲取器
    
    使用 Playwright 自動化瀏覽器操作，配合 Telethon 接收驗證碼
    """
    
    # 隨機應用名稱生成配置
    APP_NAME_PREFIXES = [
        "My", "Smart", "Pro", "Super", "Mega", "Ultra", "Fast", "Quick",
        "Easy", "Simple", "Cool", "Best", "Top", "Prime", "Elite", "Max"
    ]
    APP_NAME_SUFFIXES = [
        "App", "Tool", "Helper", "Bot", "Client", "Manager", "Assistant",
        "Utility", "Service", "Hub", "Center", "Studio", "Lab", "Works"
    ]
    
    def __init__(
        self,
        sessions_dir: str = "./sessions",
        data_dir: str = "./data",
        event_callback: Optional[Callable] = None,
        db_callback: Optional[Callable] = None  # 用於保存日誌到數據庫
    ):
        """
        初始化憑據獲取器
        
        Args:
            sessions_dir: Session 文件目錄
            data_dir: 數據存儲目錄
            event_callback: 事件回調（用於發送狀態更新）
            db_callback: 數據庫回調（用於保存日誌）
        """
        self.sessions_dir = Path(sessions_dir)
        self.data_dir = Path(data_dir)
        self.credentials_file = self.data_dir / "api_credentials.json"
        self.event_callback = event_callback
        self.db_callback = db_callback
        
        # 內存緩存
        self._credentials: Dict[str, APICredential] = {}  # phone -> APICredential
        self._active_scrapes: Dict[str, asyncio.Task] = {}  # phone -> Task
        self._pending_codes: Dict[str, asyncio.Future] = {}  # phone -> Future for verification code
        
        # 確保目錄存在
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # 加載現有憑據
        self._load_credentials()
        
        print(f"[CredentialScraper] Initialized with {len(self._credentials)} credentials", file=sys.stderr)
    
    def _load_credentials(self) -> None:
        """從文件加載憑據"""
        try:
            if self.credentials_file.exists():
                with open(self.credentials_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for item in data:
                        # 🔧 確保 item 是字典格式
                        if isinstance(item, dict):
                            try:
                                cred = APICredential(**item)
                                self._credentials[cred.phone] = cred
                            except Exception as item_error:
                                print(f"[CredentialScraper] Skip invalid credential: {item_error}", file=sys.stderr)
                        else:
                            print(f"[CredentialScraper] Skip non-dict item: {type(item)}", file=sys.stderr)
                print(f"[CredentialScraper] Loaded {len(self._credentials)} credentials", file=sys.stderr)
        except Exception as e:
            print(f"[CredentialScraper] Error loading credentials: {e}", file=sys.stderr)
    
    def _save_credentials(self) -> None:
        """保存憑據到文件"""
        try:
            with open(self.credentials_file, 'w', encoding='utf-8') as f:
                json.dump([asdict(c) for c in self._credentials.values()], f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[CredentialScraper] Error saving credentials: {e}", file=sys.stderr)
    
    def _generate_app_name(self) -> Tuple[str, str]:
        """
        生成隨機應用名稱
        
        Returns:
            (app_title, app_short_name)
        """
        prefix = random.choice(self.APP_NAME_PREFIXES)
        suffix = random.choice(self.APP_NAME_SUFFIXES)
        random_id = ''.join(random.choices(string.digits, k=4))
        
        app_title = f"{prefix} {suffix} {random_id}"
        app_short_name = f"{prefix.lower()}{suffix.lower()}{random_id}"
        
        return app_title, app_short_name
    
    async def _log_action(
        self,
        account_id: int,
        phone: str,
        action: str,
        status: str,
        api_id: Optional[str] = None,
        api_hash: Optional[str] = None,
        error_message: Optional[str] = None,
        details: Optional[Dict] = None
    ) -> None:
        """記錄操作日誌"""
        log = CredentialLog(
            id=None,
            account_id=account_id,
            phone=phone,
            action=action,
            api_id=api_id,
            api_hash=api_hash,
            status=status,
            error_message=error_message,
            created_at=datetime.utcnow().isoformat(),
            details_json=json.dumps(details) if details else None
        )
        
        # 如果有數據庫回調，保存到數據庫
        if self.db_callback:
            try:
                await self.db_callback(log)
            except Exception as e:
                print(f"[CredentialScraper] Error saving log to database: {e}", file=sys.stderr)
        
        # 發送事件
        if self.event_callback:
            self.event_callback("credential-scrape-log", asdict(log))
    
    def get_credential(self, phone: str) -> Optional[APICredential]:
        """獲取帳號的 API 憑據"""
        return self._credentials.get(phone)
    
    def has_native_credential(self, phone: str) -> bool:
        """檢查帳號是否有原生 API 憑據"""
        return phone in self._credentials
    
    async def start_scrape(
        self,
        account_id: int,
        phone: str,
        telegram_client: Any = None,  # Telethon client for receiving code
        proxy: Optional[str] = None,
        headless: bool = True
    ) -> Dict[str, Any]:
        """
        開始獲取 API 憑據
        
        Args:
            account_id: 帳號 ID
            phone: 電話號碼
            telegram_client: 已登入的 Telethon 客戶端（用於接收驗證碼）
            proxy: 代理設置
            headless: 是否使用無頭模式
        
        Returns:
            操作結果
        """
        # 檢查是否已有憑據
        if phone in self._credentials:
            return {
                "success": True,
                "message": "已有原生 API 憑據",
                "credential": asdict(self._credentials[phone])
            }
        
        # 檢查是否正在獲取
        if phone in self._active_scrapes:
            return {
                "success": False,
                "message": "正在獲取中，請稍候"
            }
        
        # 記錄開始
        await self._log_action(
            account_id=account_id,
            phone=phone,
            action="scrape_started",
            status="in_progress",
            details={"headless": headless, "has_proxy": proxy is not None}
        )
        
        # 創建異步任務
        task = asyncio.create_task(
            self._do_scrape(account_id, phone, telegram_client, proxy, headless)
        )
        self._active_scrapes[phone] = task
        
        return {
            "success": True,
            "message": "已開始獲取 API 憑據",
            "status": "in_progress"
        }
    
    async def _do_scrape(
        self,
        account_id: int,
        phone: str,
        telegram_client: Any,
        proxy: Optional[str],
        headless: bool
    ) -> None:
        """
        執行實際的憑據獲取操作
        
        這個方法在後台運行，不阻塞主線程
        """
        try:
            # 嘗試導入 Playwright
            try:
                from playwright.async_api import async_playwright
            except ImportError:
                await self._log_action(
                    account_id=account_id,
                    phone=phone,
                    action="error",
                    status="failed",
                    error_message="Playwright 未安裝，請運行 pip install playwright && playwright install chromium"
                )
                return
            
            async with async_playwright() as p:
                # 配置瀏覽器
                browser_args = ["--disable-blink-features=AutomationControlled"]
                if proxy:
                    # 解析代理
                    proxy_config = self._parse_proxy(proxy)
                else:
                    proxy_config = None
                
                # 啟動瀏覽器
                browser = await p.chromium.launch(
                    headless=headless,
                    args=browser_args
                )
                
                context = await browser.new_context(
                    viewport={"width": 1280, "height": 720},
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    locale="en-US",
                    proxy=proxy_config
                )
                
                page = await context.new_page()
                
                try:
                    # 步驟 1: 訪問 my.telegram.org
                    await page.goto("https://my.telegram.org/auth", timeout=30000)
                    await asyncio.sleep(2)
                    
                    # 步驟 2: 輸入電話號碼
                    phone_input = await page.wait_for_selector('input[name="phone"]', timeout=10000)
                    await phone_input.fill(phone)
                    await asyncio.sleep(1)
                    
                    # 點擊下一步
                    await page.click('button[type="submit"]')
                    await asyncio.sleep(3)
                    
                    # 步驟 3: 等待驗證碼
                    # 設置代碼接收器（如果有 Telegram 客戶端）
                    code = None
                    if telegram_client:
                        code = await self._wait_for_code(phone, telegram_client, timeout=120)
                    else:
                        # 創建 Future 等待手動輸入
                        code_future: asyncio.Future = asyncio.Future()
                        self._pending_codes[phone] = code_future
                        
                        # 發送等待驗證碼事件
                        if self.event_callback:
                            self.event_callback("credential-scrape-waiting-code", {
                                "phone": phone,
                                "message": "等待驗證碼"
                            })
                        
                        try:
                            code = await asyncio.wait_for(code_future, timeout=120)
                        except asyncio.TimeoutError:
                            await self._log_action(
                                account_id=account_id,
                                phone=phone,
                                action="error",
                                status="failed",
                                error_message="等待驗證碼超時"
                            )
                            return
                        finally:
                            self._pending_codes.pop(phone, None)
                    
                    if not code:
                        await self._log_action(
                            account_id=account_id,
                            phone=phone,
                            action="error",
                            status="failed",
                            error_message="未能獲取驗證碼"
                        )
                        return
                    
                    await self._log_action(
                        account_id=account_id,
                        phone=phone,
                        action="code_received",
                        status="in_progress",
                        details={"code_length": len(code)}
                    )
                    
                    # 步驟 4: 輸入驗證碼
                    code_input = await page.wait_for_selector('input[name="password"]', timeout=10000)
                    await code_input.fill(code)
                    await asyncio.sleep(1)
                    
                    # 點擊提交
                    await page.click('button[type="submit"]')
                    await asyncio.sleep(3)
                    
                    # 步驟 5: 進入 API Development Tools
                    try:
                        await page.click('a[href="/apps"]', timeout=10000)
                    except Exception:
                        # 嘗試直接訪問
                        await page.goto("https://my.telegram.org/apps", timeout=30000)
                    
                    await asyncio.sleep(2)
                    
                    # 步驟 6: 檢查是否已有應用
                    api_id = None
                    api_hash = None
                    app_title = None
                    app_short_name = None
                    
                    # 查找現有憑據
                    try:
                        api_id_element = await page.query_selector('span.form-control:has-text("App api_id")')
                        if api_id_element:
                            # 已有應用，獲取憑據
                            api_id_row = await page.query_selector('label:has-text("App api_id") + div')
                            if api_id_row:
                                api_id = await api_id_row.inner_text()
                            
                            api_hash_row = await page.query_selector('label:has-text("App api_hash") + div')
                            if api_hash_row:
                                api_hash = await api_hash_row.inner_text()
                    except Exception:
                        pass
                    
                    # 如果沒有現有應用，創建新的
                    if not api_id or not api_hash:
                        # 檢查是否有創建表單
                        create_form = await page.query_selector('form[action="/apps"]')
                        if create_form:
                            app_title, app_short_name = self._generate_app_name()
                            
                            # 填寫表單
                            await page.fill('input[name="app_title"]', app_title)
                            await page.fill('input[name="app_shortname"]', app_short_name)
                            
                            # 選擇平台
                            platform_select = await page.query_selector('select[name="app_platform"]')
                            if platform_select:
                                await platform_select.select_option("desktop")
                            
                            # 填寫描述（可選）
                            try:
                                await page.fill('textarea[name="app_desc"]', "Personal use application")
                            except Exception:
                                pass
                            
                            # 提交表單
                            await page.click('button[type="submit"]')
                            await asyncio.sleep(3)
                            
                            # 獲取新創建的憑據
                            try:
                                # 重新加載頁面
                                await page.goto("https://my.telegram.org/apps", timeout=30000)
                                await asyncio.sleep(2)
                                
                                # 獲取 API ID
                                api_id_elements = await page.query_selector_all('strong')
                                for el in api_id_elements:
                                    text = await el.inner_text()
                                    if text.isdigit() and len(text) >= 5:
                                        api_id = text
                                        break
                                
                                # 獲取 API Hash (通常是 32 字符的十六進制字符串)
                                all_text = await page.inner_text('body')
                                import re
                                hash_match = re.search(r'[a-f0-9]{32}', all_text)
                                if hash_match:
                                    api_hash = hash_match.group(0)
                            except Exception as e:
                                print(f"[CredentialScraper] Error getting credentials: {e}", file=sys.stderr)
                    
                    # 驗證憑據
                    if api_id and api_hash:
                        # 保存憑據
                        credential = APICredential(
                            api_id=api_id.strip(),
                            api_hash=api_hash.strip(),
                            app_title=app_title or "Unknown",
                            app_short_name=app_short_name or "unknown",
                            obtained_at=datetime.utcnow().isoformat(),
                            phone=phone
                        )
                        self._credentials[phone] = credential
                        self._save_credentials()
                        
                        await self._log_action(
                            account_id=account_id,
                            phone=phone,
                            action="credentials_obtained",
                            status="success",
                            api_id=api_id,
                            api_hash=api_hash[:8] + "..." if api_hash else None,
                            details={
                                "app_title": app_title,
                                "app_short_name": app_short_name
                            }
                        )
                        
                        # 發送成功事件
                        if self.event_callback:
                            self.event_callback("credential-scrape-success", {
                                "phone": phone,
                                "api_id": api_id,
                                "api_hash": api_hash[:8] + "...",
                                "app_title": app_title
                            })
                    else:
                        await self._log_action(
                            account_id=account_id,
                            phone=phone,
                            action="error",
                            status="failed",
                            error_message="無法獲取 API 憑據"
                        )
                        
                finally:
                    await browser.close()
                    
        except Exception as e:
            print(f"[CredentialScraper] Scrape error for {phone}: {e}", file=sys.stderr)
            await self._log_action(
                account_id=account_id,
                phone=phone,
                action="error",
                status="failed",
                error_message=str(e)
            )
        finally:
            # 清理
            self._active_scrapes.pop(phone, None)
    
    async def _wait_for_code(
        self,
        phone: str,
        telegram_client: Any,
        timeout: int = 120
    ) -> Optional[str]:
        """
        使用 Telethon 客戶端等待驗證碼
        
        Telegram 會從 777000 發送驗證碼
        """
        try:
            from telethon import events
            
            code_future: asyncio.Future = asyncio.Future()
            
            @telegram_client.on(events.NewMessage(from_users=777000))
            async def code_handler(event):
                # 提取驗證碼（通常是 5 位數字）
                import re
                text = event.raw_text
                match = re.search(r'(\d{5})', text)
                if match and not code_future.done():
                    code_future.set_result(match.group(1))
            
            try:
                code = await asyncio.wait_for(code_future, timeout=timeout)
                return code
            except asyncio.TimeoutError:
                return None
            finally:
                telegram_client.remove_event_handler(code_handler)
                
        except Exception as e:
            print(f"[CredentialScraper] Error waiting for code: {e}", file=sys.stderr)
            return None
    
    def submit_code(self, phone: str, code: str) -> bool:
        """
        手動提交驗證碼（用於沒有 Telegram 客戶端的情況）
        """
        if phone in self._pending_codes:
            future = self._pending_codes[phone]
            if not future.done():
                future.set_result(code)
                return True
        return False
    
    async def cancel_scrape(self, phone: str) -> bool:
        """取消正在進行的獲取操作"""
        if phone in self._active_scrapes:
            task = self._active_scrapes[phone]
            task.cancel()
            self._active_scrapes.pop(phone, None)
            self._pending_codes.pop(phone, None)
            return True
        return False
    
    def _parse_proxy(self, proxy_str: str) -> Optional[Dict[str, str]]:
        """解析代理字符串為 Playwright 格式"""
        try:
            # 格式: socks5://user:pass@host:port 或 http://host:port
            if "://" in proxy_str:
                protocol, rest = proxy_str.split("://", 1)
            else:
                protocol = "http"
                rest = proxy_str
            
            server = rest
            username = None
            password = None
            
            if "@" in rest:
                auth, server = rest.rsplit("@", 1)
                if ":" in auth:
                    username, password = auth.split(":", 1)
            
            result = {"server": f"{protocol}://{server}"}
            if username:
                result["username"] = username
            if password:
                result["password"] = password
            
            return result
        except Exception:
            return None
    
    def get_all_credentials(self) -> List[Dict[str, Any]]:
        """獲取所有憑據"""
        return [asdict(c) for c in self._credentials.values()]
    
    def get_scrape_status(self, phone: str) -> Dict[str, Any]:
        """獲取獲取狀態"""
        if phone in self._active_scrapes:
            return {
                "status": "in_progress",
                "waiting_code": phone in self._pending_codes
            }
        if phone in self._credentials:
            return {
                "status": "completed",
                "credential": asdict(self._credentials[phone])
            }
        return {"status": "not_started"}


# 全局實例
_credential_scraper: Optional[CredentialScraper] = None


def init_credential_scraper(
    sessions_dir: str = "./sessions",
    data_dir: str = "./data",
    event_callback: Optional[Callable] = None,
    db_callback: Optional[Callable] = None
) -> CredentialScraper:
    """初始化全局憑據獲取器"""
    global _credential_scraper
    _credential_scraper = CredentialScraper(sessions_dir, data_dir, event_callback, db_callback)
    return _credential_scraper


def get_credential_scraper() -> Optional[CredentialScraper]:
    """獲取全局憑據獲取器"""
    return _credential_scraper
