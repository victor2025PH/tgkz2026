"""
TG-Matrix TData Importer
TData 導入器 - 支持導入 Telegram Desktop 的 session 文件

功能：
1. 解析 TData 文件夾結構
2. 提取帳號信息
3. 使用 opentele 轉換為 Pyrogram session
4. 支持批量導入
5. 支持 ZIP 壓縮包
"""

import os
import sys
import json
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime

# 檢查 opentele 是否可用
HAS_OPENTELE = False
try:
    from opentele.td import TDesktop
    from opentele.tl import TelegramClient as OpenTeleClient
    from opentele.api import API, CreateNewSession, UseCurrentSession
    HAS_OPENTELE = True
except ImportError:
    print("[TDataImporter] opentele not installed. Native TData import will be limited.", file=sys.stderr)
    print("[TDataImporter] Install with: pip install opentele", file=sys.stderr)


@dataclass
class TDataAccount:
    """TData 帳號信息"""
    phone: str
    user_id: int
    dc_id: int
    first_name: str = ""
    last_name: str = ""
    username: str = ""
    folder_name: str = ""
    folder_path: str = ""
    account_index: int = 0
    is_valid: bool = True
    error: str = ""


class TDataImporter:
    """TData 導入器"""
    
    def __init__(self, sessions_dir: str = None):
        """
        初始化導入器
        
        Args:
            sessions_dir: Session 文件存儲目錄
        """
        if sessions_dir is None:
            sessions_dir = str(Path(__file__).parent / "data" / "sessions")
        self.sessions_dir = Path(sessions_dir)
        self.sessions_dir.mkdir(parents=True, exist_ok=True)
        self._temp_dirs: List[Path] = []
        
    def __del__(self):
        """清理臨時目錄"""
        self._cleanup_temp_dirs()
        
    def _cleanup_temp_dirs(self):
        """清理所有臨時目錄"""
        for temp_dir in self._temp_dirs:
            try:
                if temp_dir.exists():
                    shutil.rmtree(temp_dir)
            except Exception as e:
                print(f"[TDataImporter] Error cleaning temp dir: {e}", file=sys.stderr)
        self._temp_dirs.clear()
    
    def _is_tdata_folder(self, path: Path) -> bool:
        """
        檢查路徑是否是有效的 TData 文件夾
        
        Args:
            path: 要檢查的路徑
            
        Returns:
            是否是有效的 TData 文件夾
        """
        if not path.is_dir():
            return False
            
        # 檢查是否有 key_datas 文件（TData 必需）
        key_datas = path / "key_datas"
        if key_datas.exists():
            return True
            
        # 檢查是否有 16 位十六進制命名的帳號目錄
        for item in path.iterdir():
            if item.is_dir() and len(item.name) == 16:
                try:
                    int(item.name, 16)
                    # 檢查目錄內是否有 map 文件
                    if (item / "map0").exists() or (item / "map1").exists():
                        return True
                except ValueError:
                    continue
                    
        return False
    
    def _find_tdata_in_path(self, path: Path) -> Optional[Path]:
        """
        在給定路徑中查找 TData 目錄
        
        Args:
            path: 要搜索的路徑
            
        Returns:
            找到的 TData 目錄路徑，未找到返回 None
        """
        # 直接是 tdata 目錄
        if path.name.lower() == "tdata" and self._is_tdata_folder(path):
            return path
            
        # 檢查當前目錄是否是 TData
        if self._is_tdata_folder(path):
            return path
            
        # 在子目錄中查找 tdata
        tdata_path = path / "tdata"
        if tdata_path.exists() and self._is_tdata_folder(tdata_path):
            return tdata_path
            
        # 遞歸搜索（最多 2 層）
        for item in path.iterdir():
            if item.is_dir():
                if item.name.lower() == "tdata" and self._is_tdata_folder(item):
                    return item
                # 檢查子目錄
                sub_tdata = item / "tdata"
                if sub_tdata.exists() and self._is_tdata_folder(sub_tdata):
                    return sub_tdata
                    
        return None
    
    def extract_zip(self, zip_path: str) -> Tuple[bool, str, Optional[Path]]:
        """
        解壓 ZIP 文件並查找 TData
        
        Args:
            zip_path: ZIP 文件路徑
            
        Returns:
            (成功, 消息, TData路徑)
        """
        try:
            zip_file = Path(zip_path)
            if not zip_file.exists():
                return False, f"文件不存在: {zip_path}", None
                
            if not zipfile.is_zipfile(zip_path):
                return False, "不是有效的 ZIP 文件", None
                
            # 創建臨時目錄
            temp_dir = Path(tempfile.mkdtemp(prefix="tdata_import_"))
            self._temp_dirs.append(temp_dir)
            
            # 解壓
            with zipfile.ZipFile(zip_path, 'r') as zf:
                zf.extractall(temp_dir)
                
            # 查找 TData
            tdata_path = self._find_tdata_in_path(temp_dir)
            
            if tdata_path:
                return True, f"已解壓並找到 TData: {tdata_path}", tdata_path
            else:
                return False, "ZIP 中未找到有效的 TData 目錄", None
                
        except Exception as e:
            print(f"[TDataImporter] Error extracting ZIP: {e}", file=sys.stderr)
            return False, f"解壓失敗: {str(e)}", None
    
    def scan_tdata(self, path: str) -> Dict[str, Any]:
        """
        掃描 TData 目錄，返回帳號列表
        
        Args:
            path: TData 目錄或 ZIP 文件路徑
            
        Returns:
            掃描結果
        """
        result = {
            "success": False,
            "tdata_path": None,
            "accounts": [],
            "error": None,
            "is_zip": False
        }
        
        try:
            input_path = Path(path)
            
            # 檢查是否是 ZIP 文件
            if input_path.suffix.lower() == ".zip" or (input_path.is_file() and zipfile.is_zipfile(str(input_path))):
                result["is_zip"] = True
                success, message, tdata_path = self.extract_zip(str(input_path))
                if not success:
                    result["error"] = message
                    return result
                input_path = tdata_path
            else:
                # 查找 TData 目錄
                tdata_path = self._find_tdata_in_path(input_path)
                if not tdata_path:
                    result["error"] = "未找到有效的 TData 目錄"
                    return result
                input_path = tdata_path
                
            result["tdata_path"] = str(input_path)
            
            # 使用 opentele 解析帳號
            if HAS_OPENTELE:
                accounts = self._scan_with_opentele(input_path)
            else:
                accounts = self._scan_basic(input_path)
                
            result["accounts"] = accounts
            result["success"] = len(accounts) > 0
            
            if not accounts:
                result["error"] = "未找到任何帳號"
                
            return result
            
        except Exception as e:
            print(f"[TDataImporter] Error scanning TData: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            result["error"] = str(e)
            return result
    
    def _scan_with_opentele(self, tdata_path: Path) -> List[Dict[str, Any]]:
        """
        使用 opentele 掃描 TData
        
        Args:
            tdata_path: TData 目錄路徑
            
        Returns:
            帳號列表
        """
        accounts = []
        
        try:
            # 使用 opentele 載入 TData
            tdesk = TDesktop(str(tdata_path))
            
            if not tdesk.isLoaded():
                print(f"[TDataImporter] Failed to load TData from {tdata_path}", file=sys.stderr)
                return self._scan_basic(tdata_path)
            
            # 獲取所有帳號
            for i, account in enumerate(tdesk.accounts):
                try:
                    user = account.UserId
                    
                    # 獲取帳號信息
                    account_info = {
                        "index": i,
                        "user_id": user if user else 0,
                        "phone": f"+{user}" if user else f"Account_{i+1}",
                        "first_name": "",
                        "last_name": "",
                        "username": "",
                        "dc_id": account.MainDcId if hasattr(account, 'MainDcId') else 0,
                        "folder_name": "",
                        "type": "tdata_native",
                        "is_valid": True,
                        "can_import": True,
                        "error": ""
                    }
                    
                    # 嘗試獲取更多信息
                    if hasattr(account, 'owner'):
                        owner = account.owner
                        if hasattr(owner, 'dataName'):
                            account_info["folder_name"] = owner.dataName
                    
                    accounts.append(account_info)
                    
                except Exception as e:
                    print(f"[TDataImporter] Error reading account {i}: {e}", file=sys.stderr)
                    accounts.append({
                        "index": i,
                        "user_id": 0,
                        "phone": f"Account_{i+1}",
                        "type": "tdata_native",
                        "is_valid": False,
                        "can_import": False,
                        "error": str(e)
                    })
                    
        except Exception as e:
            print(f"[TDataImporter] Error with opentele: {e}", file=sys.stderr)
            return self._scan_basic(tdata_path)
            
        return accounts
    
    def _scan_basic(self, tdata_path: Path) -> List[Dict[str, Any]]:
        """
        基本掃描方法（不使用 opentele）
        
        Args:
            tdata_path: TData 目錄路徑
            
        Returns:
            帳號列表
        """
        accounts = []
        account_index = 0
        
        # 查找 16 位十六進制命名的目錄
        for item in tdata_path.iterdir():
            if item.is_dir() and len(item.name) == 16:
                try:
                    int(item.name, 16)
                    
                    # 檢查是否有 map 文件
                    has_map = (item / "map0").exists() or (item / "map1").exists()
                    
                    # 排除帶 's' 後綴的目錄（這些是附加數據目錄）
                    if item.name.endswith('s'):
                        continue
                        
                    if has_map:
                        accounts.append({
                            "index": account_index,
                            "user_id": 0,
                            "phone": f"TData_{item.name[:8]}",
                            "first_name": "",
                            "last_name": "",
                            "username": "",
                            "folder_name": item.name,
                            "folder_path": str(item),
                            "type": "tdata_native",
                            "is_valid": True,
                            "can_import": HAS_OPENTELE,
                            "error": "" if HAS_OPENTELE else "需要安裝 opentele 庫"
                        })
                        account_index += 1
                        
                except ValueError:
                    continue
                    
        # 同時查找 session 文件
        for session_file in tdata_path.glob("*.session"):
            phone = session_file.stem
            accounts.append({
                "index": account_index,
                "user_id": 0,
                "phone": phone,
                "type": "pyrogram",
                "folder_path": str(session_file),
                "is_valid": True,
                "can_import": True,
                "error": ""
            })
            account_index += 1
            
        for session_file in tdata_path.glob("*.telethon.session"):
            try:
                with open(session_file, 'r') as f:
                    data = json.load(f)
                phone = data.get("phone", session_file.stem.replace(".telethon", ""))
                user_info = data.get("user_info", {})
                accounts.append({
                    "index": account_index,
                    "user_id": 0,
                    "phone": phone,
                    "first_name": user_info.get("firstName", ""),
                    "last_name": user_info.get("lastName", ""),
                    "type": "telethon",
                    "folder_path": str(session_file),
                    "is_valid": True,
                    "can_import": True,
                    "error": ""
                })
                account_index += 1
            except Exception:
                pass
                
        return accounts
    
    async def import_account(
        self,
        tdata_path: str,
        account_index: int,
        api_id: int = None,
        api_hash: str = None
    ) -> Dict[str, Any]:
        """
        導入單個帳號
        
        Args:
            tdata_path: TData 目錄路徑
            account_index: 帳號索引
            api_id: API ID（可選，使用官方 API）
            api_hash: API Hash（可選）
            
        Returns:
            導入結果
        """
        result = {
            "success": False,
            "phone": None,
            "session_path": None,
            "error": None
        }
        
        try:
            if not HAS_OPENTELE:
                result["error"] = "opentele 庫未安裝，無法導入原生 TData"
                return result
                
            tdata_dir = Path(tdata_path)
            
            # 載入 TData
            tdesk = TDesktop(str(tdata_dir))
            
            if not tdesk.isLoaded():
                result["error"] = "無法載入 TData"
                return result
                
            if account_index >= len(tdesk.accounts):
                result["error"] = f"帳號索引超出範圍: {account_index}"
                return result
                
            account = tdesk.accounts[account_index]
            
            # 獲取用戶 ID 作為文件名
            user_id = account.UserId
            if not user_id:
                user_id = f"account_{account_index}"
                
            session_path = self.sessions_dir / f"{user_id}.session"
            
            # 使用 opentele 轉換為 Pyrogram session
            # 選擇 API
            if api_id and api_hash:
                api = API.CustomApi(api_id=api_id, api_hash=api_hash)
            else:
                # 使用 Telegram Desktop 的 API（更安全）
                api = API.TelegramDesktop
                
            # 轉換為 Pyrogram client
            client = await account.ToTelethon(
                session=str(session_path).replace('.session', ''),
                flag=UseCurrentSession
            )
            
            # 連接以驗證
            await client.connect()
            
            # 獲取用戶信息
            me = await client.get_me()
            
            phone = f"+{me.phone}" if me.phone else str(user_id)
            
            await client.disconnect()
            
            # 重命名 session 文件（使用電話號碼）
            if me.phone:
                new_session_path = self.sessions_dir / f"{me.phone}.session"
                if session_path.exists() and session_path != new_session_path:
                    shutil.move(session_path, new_session_path)
                    session_path = new_session_path
                    
            result["success"] = True
            result["phone"] = phone
            result["user_id"] = me.id
            result["first_name"] = me.first_name or ""
            result["last_name"] = me.last_name or ""
            result["username"] = me.username or ""
            result["session_path"] = str(session_path)
            
            print(f"[TDataImporter] Successfully imported account: {phone}", file=sys.stderr)
            
        except Exception as e:
            print(f"[TDataImporter] Error importing account: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            result["error"] = str(e)
            
        return result
    
    async def import_session_file(
        self,
        source_path: str,
        session_type: str
    ) -> Dict[str, Any]:
        """
        導入 session 文件
        
        Args:
            source_path: 源文件路徑
            session_type: Session 類型
            
        Returns:
            導入結果
        """
        result = {
            "success": False,
            "phone": None,
            "session_path": None,
            "error": None
        }
        
        try:
            source = Path(source_path)
            
            if not source.exists():
                result["error"] = f"文件不存在: {source_path}"
                return result
                
            phone = source.stem.replace(".telethon", "")
            
            if session_type == "pyrogram" or session_type == "session":
                dest = self.sessions_dir / f"{phone}.session"
                shutil.copy2(source, dest)
                result["success"] = True
                result["phone"] = phone
                result["session_path"] = str(dest)
                
            elif session_type == "telethon":
                # Telethon JSON 格式需要轉換
                with open(source, 'r') as f:
                    data = json.load(f)
                    
                phone = data.get("phone", phone)
                dest = self.sessions_dir / f"{phone}.telethon.session"
                shutil.copy2(source, dest)
                
                result["success"] = True
                result["phone"] = phone
                result["session_path"] = str(dest)
                result["first_name"] = data.get("user_info", {}).get("firstName", "")
                result["last_name"] = data.get("user_info", {}).get("lastName", "")
                
            else:
                result["error"] = f"不支持的 session 類型: {session_type}"
                
        except Exception as e:
            print(f"[TDataImporter] Error importing session file: {e}", file=sys.stderr)
            result["error"] = str(e)
            
        return result
    
    async def import_batch(
        self,
        tdata_path: str,
        account_indices: List[int],
        api_id: int = None,
        api_hash: str = None,
        progress_callback = None
    ) -> Dict[str, Any]:
        """
        批量導入帳號
        
        Args:
            tdata_path: TData 目錄路徑
            account_indices: 要導入的帳號索引列表
            api_id: API ID
            api_hash: API Hash
            progress_callback: 進度回調函數
            
        Returns:
            批量導入結果
        """
        results = {
            "total": len(account_indices),
            "success_count": 0,
            "fail_count": 0,
            "accounts": []
        }
        
        for i, index in enumerate(account_indices):
            if progress_callback:
                progress_callback(i, len(account_indices), f"正在導入帳號 {i+1}/{len(account_indices)}")
                
            account_result = await self.import_account(
                tdata_path,
                index,
                api_id,
                api_hash
            )
            
            if account_result["success"]:
                results["success_count"] += 1
            else:
                results["fail_count"] += 1
                
            results["accounts"].append(account_result)
            
        return results
    
    def get_default_tdata_path(self) -> str:
        """
        獲取系統默認的 TData 路徑
        
        Returns:
            默認 TData 路徑
        """
        import platform
        
        system = platform.system()
        
        if system == "Windows":
            appdata = os.environ.get("APPDATA", "")
            return os.path.join(appdata, "Telegram Desktop", "tdata")
        elif system == "Darwin":  # macOS
            home = os.path.expanduser("~")
            return os.path.join(home, "Library", "Application Support", "Telegram Desktop", "tdata")
        elif system == "Linux":
            home = os.path.expanduser("~")
            return os.path.join(home, ".local", "share", "TelegramDesktop", "tdata")
        else:
            return ""
            
    def check_default_tdata(self) -> Dict[str, Any]:
        """
        檢查系統默認 TData 是否存在
        
        Returns:
            檢查結果
        """
        default_path = self.get_default_tdata_path()
        
        result = {
            "path": default_path,
            "exists": False,
            "is_valid": False,
            "account_count": 0
        }
        
        if default_path and os.path.exists(default_path):
            result["exists"] = True
            result["is_valid"] = self._is_tdata_folder(Path(default_path))
            
            if result["is_valid"]:
                scan_result = self.scan_tdata(default_path)
                result["account_count"] = len(scan_result.get("accounts", []))
                
        return result


# 全局實例
_importer: Optional[TDataImporter] = None


def get_tdata_importer(sessions_dir: str = None) -> TDataImporter:
    """獲取 TData 導入器實例"""
    global _importer
    if _importer is None:
        _importer = TDataImporter(sessions_dir)
    return _importer
