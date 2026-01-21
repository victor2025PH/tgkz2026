#!/usr/bin/env python3
"""
獨立的媒體發送腳本
用於繞過 Pyrogram 主進程中的 is_premium bug
"""
import asyncio
import sys
import os
import json
import argparse

# 添加 backend 目錄到路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def send_media(session_path: str, phone: str, user_id: str, file_path: str, caption: str = "", is_image: bool = True):
    """發送媒體文件"""
    from pyrogram import Client
    
    # 創建客戶端
    session_file = os.path.join(session_path, phone.replace('+', ''))
    
    print(f"[SendMedia] Session file: {session_file}", file=sys.stderr)
    print(f"[SendMedia] Target: {user_id}, File: {file_path}", file=sys.stderr)
    
    try:
        # 使用現有的 session 文件
        client = Client(
            session_file,
            no_updates=True,  # 不接收更新，減少問題
            in_memory=False
        )
        
        await client.start()
        print(f"[SendMedia] Client started", file=sys.stderr)
        
        try:
            target = int(user_id) if user_id.isdigit() else user_id
            
            if is_image:
                result = await client.send_photo(
                    chat_id=target,
                    photo=file_path,
                    caption=caption if caption else None
                )
            else:
                result = await client.send_document(
                    chat_id=target,
                    document=file_path,
                    caption=caption if caption else None
                )
            
            print(f"[SendMedia] Success! Message ID: {result.id}", file=sys.stderr)
            return {"success": True, "message_id": result.id}
            
        except Exception as send_err:
            print(f"[SendMedia] Send error: {send_err}", file=sys.stderr)
            return {"success": False, "error": str(send_err)}
        finally:
            await client.stop()
            
    except Exception as e:
        print(f"[SendMedia] Error: {e}", file=sys.stderr)
        return {"success": False, "error": str(e)}


def main():
    parser = argparse.ArgumentParser(description='Send media via Telegram')
    parser.add_argument('--session-path', required=True, help='Path to session files')
    parser.add_argument('--phone', required=True, help='Phone number')
    parser.add_argument('--user-id', required=True, help='Target user ID')
    parser.add_argument('--file', required=True, help='File path to send')
    parser.add_argument('--caption', default='', help='Caption for the media')
    parser.add_argument('--type', default='image', choices=['image', 'document'], help='Media type')
    
    args = parser.parse_args()
    
    result = asyncio.run(send_media(
        session_path=args.session_path,
        phone=args.phone,
        user_id=args.user_id,
        file_path=args.file,
        caption=args.caption,
        is_image=(args.type == 'image')
    ))
    
    # 輸出 JSON 結果
    print(json.dumps(result))


if __name__ == '__main__':
    main()
