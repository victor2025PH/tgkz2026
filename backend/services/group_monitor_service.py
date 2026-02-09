"""
GroupMonitorService - 群組加入與監控的核心服務層
P1: 提取自 main.py 中 handle_join_and_monitor_resource / handle_join_and_monitor_with_account 的重複邏輯
"""
import json
import sys
import time
from typing import Dict, Any, Optional, Tuple, List


class GroupMonitorService:
    """統一處理群組加入、監控寫入、狀態同步"""

    def __init__(self, db, telegram_manager=None):
        self.db = db
        self.telegram_manager = telegram_manager

    # ───────── 查找 ─────────

    async def find_monitored_group(self, telegram_id: Optional[str] = None,
                                    link: Optional[str] = None) -> Optional[Dict]:
        """精確查找已監控的群組（替代 LIKE 模糊匹配）"""
        if telegram_id:
            row = await self.db.fetch_one(
                "SELECT * FROM monitored_groups WHERE telegram_id = ?",
                (str(telegram_id),)
            )
            if row:
                return dict(row) if not isinstance(row, dict) else row
        if link:
            row = await self.db.fetch_one(
                "SELECT * FROM monitored_groups WHERE link = ?",
                (link,)
            )
            if row:
                return dict(row) if not isinstance(row, dict) else row
        return None

    async def find_resource(self, resource_id: int = 0,
                            username: str = '',
                            telegram_id: str = '',
                            invite_link: str = '') -> Optional[Dict]:
        """精確查找 discovered_resources"""
        if resource_id and resource_id > 0:
            rows = await self.db.fetch_all(
                "SELECT * FROM discovered_resources WHERE id = ?", (resource_id,))
            if rows:
                return rows[0]
        if username:
            rows = await self.db.fetch_all(
                "SELECT * FROM discovered_resources WHERE username = ?", (username,))
            if rows:
                return rows[0]
        if telegram_id:
            rows = await self.db.fetch_all(
                "SELECT * FROM discovered_resources WHERE telegram_id = ?", (telegram_id,))
            if rows:
                return rows[0]
        if invite_link:
            rows = await self.db.fetch_all(
                "SELECT * FROM discovered_resources WHERE invite_link = ?", (invite_link,))
            if rows:
                return rows[0]
        return None

    # ───────── 核心寫入（事務） ─────────

    async def add_to_monitoring(
        self,
        *,
        title: str,
        link: str,
        phone: str,
        telegram_id: Optional[str] = None,
        resource_id: Optional[int] = None,
        resource_type: str = 'group',
        member_count: int = 0,
        keyword_set_ids: Optional[List] = None,
        keywords: Optional[List[str]] = None,
        is_active: bool = True,
        can_extract: bool = True,
    ) -> Dict[str, Any]:
        """
        原子操作：同步更新 discovered_resources + 插入/更新 monitored_groups
        返回 {"success": True/False, "monitored_group_id": int, "is_new": bool}
        """
        keyword_set_ids = keyword_set_ids or []
        keywords = keywords or []
        keywords_str = ','.join(keywords)
        kw_json = json.dumps(keyword_set_ids)
        tg_id_str = str(telegram_id) if telegram_id else None
        active_int = 1 if is_active else 0
        extract_int = 1 if can_extract else 0
        new_status = 'monitoring' if is_active else 'joined'

        try:
            await self.db.begin_transaction()

            # 1. 更新 discovered_resources
            if resource_id:
                await self.db.execute(
                    """UPDATE discovered_resources
                       SET status = ?, monitoring_keywords = ?, monitoring_enabled = ?,
                           member_count = ?, resource_type = ?, joined_by_phone = ?,
                           joined_at = COALESCE(joined_at, CURRENT_TIMESTAMP),
                           telegram_id = COALESCE(telegram_id, ?)
                       WHERE id = ?""",
                    (new_status, keywords_str, active_int,
                     member_count, resource_type, phone,
                     tg_id_str, resource_id),
                    auto_commit=False
                )

            # 2. 插入/更新 monitored_groups（精確匹配）
            existing = await self.find_monitored_group(
                telegram_id=tg_id_str, link=link)

            is_new = existing is None
            if is_new:
                await self.db.execute(
                    """INSERT INTO monitored_groups
                       (name, link, phone, is_active, keywords, keyword_set_ids,
                        member_count, telegram_id, resource_type,
                        can_extract_members, resource_id,
                        last_active, created_at)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)""",
                    (title, link, phone, active_int, keywords_str, kw_json,
                     member_count, tg_id_str, resource_type,
                     extract_int, resource_id),
                    auto_commit=False
                )
            else:
                mg_id = existing['id']
                if keyword_set_ids:
                    await self.db.execute(
                        """UPDATE monitored_groups
                           SET keywords = ?, keyword_set_ids = ?, phone = ?,
                               is_active = ?, member_count = ?,
                               telegram_id = COALESCE(telegram_id, ?),
                               resource_type = ?, can_extract_members = ?,
                               resource_id = COALESCE(resource_id, ?)
                           WHERE id = ?""",
                        (keywords_str, kw_json, phone, active_int,
                         member_count, tg_id_str, resource_type,
                         extract_int, resource_id, mg_id),
                        auto_commit=False
                    )
                else:
                    await self.db.execute(
                        """UPDATE monitored_groups
                           SET phone = ?, is_active = ?, member_count = ?,
                               telegram_id = COALESCE(telegram_id, ?),
                               resource_type = ?, can_extract_members = ?,
                               resource_id = COALESCE(resource_id, ?)
                           WHERE id = ?""",
                        (phone, active_int, member_count,
                         tg_id_str, resource_type,
                         extract_int, resource_id, mg_id),
                        auto_commit=False
                    )

            await self.db.commit_transaction()
            return {"success": True, "is_new": is_new}

        except Exception as e:
            try:
                await self.db.rollback_transaction()
            except Exception:
                pass
            print(f"[GroupMonitorService] add_to_monitoring error: {e}", file=sys.stderr)
            return {"success": False, "error": str(e)}

    # ───────── Telegram 加入 ─────────

    async def join_group(self, phone: str, group_url: str) -> Dict[str, Any]:
        """通過 TelegramManager 加入群組"""
        if not self.telegram_manager:
            return {"success": False, "error": "TelegramManager 未設置"}
        return await self.telegram_manager.join_group(phone, group_url)

    async def get_chat_info(self, phone: str, chat_target) -> Dict[str, Any]:
        """獲取群組的成員數、類型、telegram_id"""
        info = {"members_count": 0, "telegram_id": None, "resource_type": "group"}
        if not self.telegram_manager:
            return info
        try:
            client = self.telegram_manager.clients.get(phone)
            if not client or not client.is_connected:
                # fallback to any connected client
                for c in self.telegram_manager.clients.values():
                    if c and c.is_connected:
                        client = c
                        break
            if not client:
                return info

            chat_info = await client.get_chat(chat_target)
            if chat_info:
                from pyrogram.enums import ChatType
                info["members_count"] = getattr(chat_info, 'members_count', 0) or 0
                info["telegram_id"] = chat_info.id
                if chat_info.type == ChatType.CHANNEL:
                    info["resource_type"] = "channel"
                elif chat_info.type == ChatType.SUPERGROUP:
                    info["resource_type"] = "supergroup"
        except Exception as e:
            print(f"[GroupMonitorService] get_chat_info error: {e}", file=sys.stderr)
        return info

    # ───────── 組合操作 ─────────

    async def join_and_monitor(
        self,
        *,
        phone: str,
        group_url: str,
        title: str = '',
        username: str = '',
        telegram_id: str = '',
        resource_id: int = 0,
        keyword_set_ids: Optional[List] = None,
        keywords: Optional[List[str]] = None,
        auto_enable: bool = True,
    ) -> Dict[str, Any]:
        """
        完整的 加入 + 寫入監控 組合操作
        """
        # 1. 加入 Telegram
        join_result = await self.join_group(phone, group_url)
        if not join_result.get('success'):
            return {"success": False, "error": join_result.get('error', '加入失敗')}

        # 2. 獲取聊天信息
        chat_target = username or telegram_id
        if chat_target:
            chat_info = await self.get_chat_info(phone, chat_target)
        else:
            chat_info = {"members_count": 0, "telegram_id": None, "resource_type": "group"}

        effective_tg_id = str(chat_info["telegram_id"]) if chat_info["telegram_id"] else telegram_id
        link = f"https://t.me/{username}" if username else group_url

        # 3. 寫入數據庫
        is_active = bool(auto_enable or keywords or keyword_set_ids)
        result = await self.add_to_monitoring(
            title=title or username or 'Unknown',
            link=link,
            phone=phone,
            telegram_id=effective_tg_id,
            resource_id=resource_id if resource_id else None,
            resource_type=chat_info["resource_type"],
            member_count=chat_info["members_count"],
            keyword_set_ids=keyword_set_ids,
            keywords=keywords,
            is_active=is_active,
            can_extract=chat_info["resource_type"] != 'channel',
        )

        result["member_count"] = chat_info["members_count"]
        result["resource_type"] = chat_info["resource_type"]
        result["telegram_id"] = effective_tg_id
        return result


# 單例
_instance: Optional[GroupMonitorService] = None


def get_group_monitor_service(db=None, telegram_manager=None) -> GroupMonitorService:
    global _instance
    if _instance is None:
        if db is None:
            from database import db as default_db
            db = default_db
        _instance = GroupMonitorService(db, telegram_manager)
    if telegram_manager and _instance.telegram_manager is None:
        _instance.telegram_manager = telegram_manager
    return _instance
