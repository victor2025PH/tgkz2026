#!/usr/bin/env python3
"""
使用 Telethon 發送媒體文件
繞過 Pyrogram 的 is_premium bug
"""
import asyncio
import sys
import os
from typing import Optional, Dict, Any

# 添加 backend 目錄到路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


class TelethonMediaSender:
    """使用 Telethon 發送媒體"""
    
    def __init__(self):
        self.clients: Dict[str, Any] = {}
    
    async def get_or_create_client(self, phone: str, session_path: str):
        """獲取或創建 Telethon 客戶端"""
        from telethon import TelegramClient
        from telethon.sessions import SQLiteSession
        
        if phone in self.clients:
            client = self.clients[phone]
            if client.is_connected():
                return client
        
        # 從 Pyrogram session 文件創建 Telethon 客戶端
        # 注意：Telethon 和 Pyrogram 使用不同的 session 格式
        # 我們需要使用 API credentials
        
        from config_loader import get_config
        config = get_config()
        
        api_id = config.telegram.api_id
        api_hash = config.telegram.api_hash
        
        # 使用不同的 session 文件名以避免衝突
        safe_phone = phone.replace('+', '').replace('-', '').replace(' ', '')
        telethon_session = os.path.join(session_path, f"{safe_phone}_telethon")
        
        client = TelegramClient(
            telethon_session,
            api_id,
            api_hash,
            system_version="4.16.30-vxCUSTOM"
        )
        
        await client.connect()
        
        if not await client.is_user_authorized():
            print(f"[TelethonSender] Client not authorized for {phone}", file=sys.stderr)
            return None
        
        self.clients[phone] = client
        return client
    
    async def send_photo(
        self,
        phone: str,
        session_path: str,
        user_id: str,
        file_path: str,
        caption: str = ""
    ) -> Dict[str, Any]:
        """發送圖片"""
        try:
            client = await self.get_or_create_client(phone, session_path)
            if not client:
                return {"success": False, "error": "Client not authorized"}
            
            target = int(user_id) if user_id.lstrip('-').isdigit() else user_id
            
            print(f"[TelethonSender] Sending photo to {target}", file=sys.stderr)
            
            result = await client.send_file(
                target,
                file_path,
                caption=caption if caption else None,
                force_document=False  # 作為圖片發送
            )
            
            print(f"[TelethonSender] Photo sent! ID: {result.id}", file=sys.stderr)
            
            return {
                "success": True,
                "message_id": result.id,
                "date": result.date.isoformat() if result.date else None
            }
            
        except Exception as e:
            print(f"[TelethonSender] Error: {e}", file=sys.stderr)
            return {"success": False, "error": str(e)}
    
    async def send_document(
        self,
        phone: str,
        session_path: str,
        user_id: str,
        file_path: str,
        caption: str = "",
        file_name: str = ""
    ) -> Dict[str, Any]:
        """發送文檔"""
        try:
            client = await self.get_or_create_client(phone, session_path)
            if not client:
                return {"success": False, "error": "Client not authorized"}
            
            target = int(user_id) if user_id.lstrip('-').isdigit() else user_id
            
            print(f"[TelethonSender] Sending document to {target}", file=sys.stderr)
            
            result = await client.send_file(
                target,
                file_path,
                caption=caption if caption else None,
                force_document=True,
                attributes=None  # 讓 Telethon 自動處理
            )
            
            print(f"[TelethonSender] Document sent! ID: {result.id}", file=sys.stderr)
            
            return {
                "success": True,
                "message_id": result.id,
                "date": result.date.isoformat() if result.date else None
            }
            
        except Exception as e:
            print(f"[TelethonSender] Error: {e}", file=sys.stderr)
            return {"success": False, "error": str(e)}
    
    async def close_all(self):
        """關閉所有客戶端"""
        for phone, client in self.clients.items():
            try:
                await client.disconnect()
            except:
                pass
        self.clients.clear()


# 全局實例
_telethon_sender: Optional[TelethonMediaSender] = None


def get_telethon_sender() -> TelethonMediaSender:
    """獲取全局 Telethon 發送器"""
    global _telethon_sender
    if _telethon_sender is None:
        _telethon_sender = TelethonMediaSender()
    return _telethon_sender


async def send_media_with_telethon(
    phone: str,
    user_id: str,
    file_path: str,
    caption: str = "",
    is_image: bool = True,
    file_name: str = ""
) -> Dict[str, Any]:
    """使用 Telethon 發送媒體的便捷函數"""
    from config import SESSIONS_DIR
    
    sender = get_telethon_sender()
    session_path = str(SESSIONS_DIR)
    
    if is_image:
        return await sender.send_photo(phone, session_path, user_id, file_path, caption)
    else:
        return await sender.send_document(phone, session_path, user_id, file_path, caption, file_name)
