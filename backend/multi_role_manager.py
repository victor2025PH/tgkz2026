"""
多角色協作管理器
Multi-Role Collaboration Manager

管理角色定義、劇本模板和協作群組
"""

import json
import os
import asyncio
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path


class MultiRoleManager:
    """多角色協作管理器"""
    
    def __init__(self, data_dir: str = None):
        """初始化管理器"""
        self.data_dir = Path(data_dir) if data_dir else Path("data/multi_role")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # 數據文件路徑
        self.roles_file = self.data_dir / "roles.json"
        self.scripts_file = self.data_dir / "scripts.json"
        self.groups_file = self.data_dir / "groups.json"
        self.stats_file = self.data_dir / "stats.json"
        
        # 內存緩存
        self._roles: Dict[str, Dict] = {}
        self._scripts: Dict[str, Dict] = {}
        self._groups: Dict[str, Dict] = {}
        self._stats: Dict[str, Any] = {
            "total_groups": 0,
            "active_groups": 0,
            "completed_groups": 0,
            "total_conversions": 0,
            "conversion_rate": 0.0,
            "total_messages_sent": 0,
            "avg_messages_per_group": 0.0,
            "by_role": {},
            "by_script": {}
        }
        
        # 加載數據
        self._load_data()
    
    def _load_data(self):
        """加載所有數據"""
        self._roles = self._load_json(self.roles_file, {})
        self._scripts = self._load_json(self.scripts_file, {})
        self._groups = self._load_json(self.groups_file, {})
        self._stats = self._load_json(self.stats_file, self._stats)
    
    def _load_json(self, path: Path, default: Any) -> Any:
        """加載 JSON 文件"""
        try:
            if path.exists():
                with open(path, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            print(f"Error loading {path}: {e}")
        return default
    
    def _save_json(self, path: Path, data: Any):
        """保存 JSON 文件"""
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False, default=str)
        except Exception as e:
            print(f"Error saving {path}: {e}")
    
    # ========== 角色管理 ==========
    
    async def add_role(self, role_data: Dict) -> Dict:
        """添加新角色"""
        role_id = role_data.get('id') or f"role_{int(datetime.now().timestamp() * 1000)}"
        
        role = {
            "id": role_id,
            "name": role_data.get("name", ""),
            "type": role_data.get("type", "custom"),
            "personality": role_data.get("personality", {
                "description": "",
                "speakingStyle": "friendly",
                "traits": []
            }),
            "aiConfig": role_data.get("aiConfig", {
                "useGlobalAI": True,
                "customPrompt": "",
                "responseLength": "medium",
                "emojiFrequency": "low",
                "typingSpeed": "medium"
            }),
            "responsibilities": role_data.get("responsibilities", []),
            "boundAccountId": role_data.get("boundAccountId"),
            "boundAccountPhone": role_data.get("boundAccountPhone"),
            "isActive": role_data.get("isActive", True),
            "usageCount": 0,
            "successCount": 0,
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat()
        }
        
        self._roles[role_id] = role
        self._save_json(self.roles_file, self._roles)
        
        return {"success": True, "role": role}
    
    async def update_role(self, role_id: str, updates: Dict) -> Dict:
        """更新角色"""
        if role_id not in self._roles:
            return {"success": False, "error": "角色不存在"}
        
        role = self._roles[role_id]
        
        # 更新允許的字段
        allowed_fields = [
            "name", "type", "personality", "aiConfig", "responsibilities",
            "boundAccountId", "boundAccountPhone", "isActive"
        ]
        
        for field in allowed_fields:
            if field in updates:
                if field in ["personality", "aiConfig"]:
                    role[field] = {**role.get(field, {}), **updates[field]}
                else:
                    role[field] = updates[field]
        
        role["updatedAt"] = datetime.now().isoformat()
        
        self._save_json(self.roles_file, self._roles)
        
        return {"success": True, "role": role}
    
    async def delete_role(self, role_id: str) -> Dict:
        """刪除角色"""
        if role_id not in self._roles:
            return {"success": False, "error": "角色不存在"}
        
        del self._roles[role_id]
        self._save_json(self.roles_file, self._roles)
        
        return {"success": True}
    
    async def get_role(self, role_id: str) -> Optional[Dict]:
        """獲取角色"""
        return self._roles.get(role_id)
    
    async def get_all_roles(self) -> List[Dict]:
        """獲取所有角色"""
        return list(self._roles.values())
    
    # ========== 劇本管理 ==========
    
    async def add_script(self, script_data: Dict) -> Dict:
        """添加新劇本"""
        script_id = script_data.get('id') or f"script_{int(datetime.now().timestamp() * 1000)}"
        
        script = {
            "id": script_id,
            "name": script_data.get("name", ""),
            "description": script_data.get("description", ""),
            "scenario": script_data.get("scenario", "custom"),
            "requiredRoles": script_data.get("requiredRoles", []),
            "minRoleCount": script_data.get("minRoleCount", 1),
            "stages": script_data.get("stages", []),
            "stats": {
                "useCount": 0,
                "successCount": 0,
                "avgDuration": 0,
                "conversionRate": 0
            },
            "isActive": script_data.get("isActive", True),
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat()
        }
        
        self._scripts[script_id] = script
        self._save_json(self.scripts_file, self._scripts)
        
        return {"success": True, "script": script}
    
    async def update_script(self, script_id: str, updates: Dict) -> Dict:
        """更新劇本"""
        if script_id not in self._scripts:
            return {"success": False, "error": "劇本不存在"}
        
        script = self._scripts[script_id]
        
        allowed_fields = [
            "name", "description", "scenario", "requiredRoles",
            "minRoleCount", "stages", "isActive"
        ]
        
        for field in allowed_fields:
            if field in updates:
                script[field] = updates[field]
        
        script["updatedAt"] = datetime.now().isoformat()
        
        self._save_json(self.scripts_file, self._scripts)
        
        return {"success": True, "script": script}
    
    async def delete_script(self, script_id: str) -> Dict:
        """刪除劇本"""
        if script_id not in self._scripts:
            return {"success": False, "error": "劇本不存在"}
        
        del self._scripts[script_id]
        self._save_json(self.scripts_file, self._scripts)
        
        return {"success": True}
    
    async def get_script(self, script_id: str) -> Optional[Dict]:
        """獲取劇本"""
        return self._scripts.get(script_id)
    
    async def get_all_scripts(self) -> List[Dict]:
        """獲取所有劇本"""
        return list(self._scripts.values())
    
    # ========== 群組管理 ==========
    
    async def create_group(self, group_data: Dict) -> Dict:
        """創建協作群組"""
        group_id = group_data.get('id') or f"group_{int(datetime.now().timestamp() * 1000)}"
        
        group = {
            "id": group_id,
            "telegramGroupId": group_data.get("telegramGroupId"),
            "groupTitle": group_data.get("groupTitle", ""),
            "targetCustomer": group_data.get("targetCustomer", {}),
            "participants": group_data.get("participants", []),
            "scriptId": group_data.get("scriptId", ""),
            "scriptName": group_data.get("scriptName", ""),
            "status": "creating",
            "currentStageId": None,
            "currentStageOrder": 0,
            "messagesSent": 0,
            "customerMessages": 0,
            "outcome": "pending",
            "messageHistory": [],
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat()
        }
        
        self._groups[group_id] = group
        self._save_json(self.groups_file, self._groups)
        
        # 更新統計
        self._stats["total_groups"] += 1
        self._stats["active_groups"] += 1
        self._save_json(self.stats_file, self._stats)
        
        return {"success": True, "group": group}
    
    async def update_group(self, group_id: str, updates: Dict) -> Dict:
        """更新群組"""
        if group_id not in self._groups:
            return {"success": False, "error": "群組不存在"}
        
        group = self._groups[group_id]
        old_status = group.get("status")
        
        allowed_fields = [
            "telegramGroupId", "groupTitle", "status", "currentStageId",
            "currentStageOrder", "messagesSent", "customerMessages", "outcome"
        ]
        
        for field in allowed_fields:
            if field in updates:
                group[field] = updates[field]
        
        group["updatedAt"] = datetime.now().isoformat()
        
        # 狀態變化處理
        new_status = group.get("status")
        if old_status != new_status:
            await self._handle_status_change(group_id, old_status, new_status)
        
        self._save_json(self.groups_file, self._groups)
        
        return {"success": True, "group": group}
    
    async def _handle_status_change(self, group_id: str, old_status: str, new_status: str):
        """處理狀態變化"""
        if new_status == "completed":
            self._stats["active_groups"] = max(0, self._stats["active_groups"] - 1)
            self._stats["completed_groups"] += 1
            
            # 檢查是否轉化
            group = self._groups.get(group_id)
            if group and group.get("outcome") == "converted":
                self._stats["total_conversions"] += 1
        
        elif new_status == "failed":
            self._stats["active_groups"] = max(0, self._stats["active_groups"] - 1)
        
        # 更新轉化率
        if self._stats["completed_groups"] > 0:
            self._stats["conversion_rate"] = (
                self._stats["total_conversions"] / self._stats["completed_groups"] * 100
            )
        
        self._save_json(self.stats_file, self._stats)
    
    async def add_message_to_group(self, group_id: str, message: Dict) -> Dict:
        """添加消息到群組歷史"""
        if group_id not in self._groups:
            return {"success": False, "error": "群組不存在"}
        
        group = self._groups[group_id]
        
        msg = {
            "id": f"msg_{int(datetime.now().timestamp() * 1000)}",
            "senderId": message.get("senderId"),
            "senderName": message.get("senderName"),
            "roleId": message.get("roleId"),
            "content": message.get("content", ""),
            "isFromTarget": message.get("isFromTarget", False),
            "timestamp": datetime.now().isoformat()
        }
        
        if "messageHistory" not in group:
            group["messageHistory"] = []
        
        group["messageHistory"].append(msg)
        
        # 更新統計
        if message.get("isFromTarget"):
            group["customerMessages"] = group.get("customerMessages", 0) + 1
        else:
            group["messagesSent"] = group.get("messagesSent", 0) + 1
            self._stats["total_messages_sent"] += 1
        
        group["updatedAt"] = datetime.now().isoformat()
        
        self._save_json(self.groups_file, self._groups)
        
        return {"success": True, "message": msg}
    
    async def get_group(self, group_id: str) -> Optional[Dict]:
        """獲取群組"""
        return self._groups.get(group_id)
    
    async def get_all_groups(self, status: str = None) -> List[Dict]:
        """獲取所有群組（可按狀態篩選）"""
        groups = list(self._groups.values())
        
        if status:
            groups = [g for g in groups if g.get("status") == status]
        
        return groups
    
    async def get_active_groups(self) -> List[Dict]:
        """獲取活躍群組"""
        return await self.get_all_groups(status="running")
    
    # ========== 統計 ==========
    
    async def get_stats(self) -> Dict:
        """獲取統計數據"""
        # 更新即時統計
        self._stats["active_groups"] = len([
            g for g in self._groups.values() 
            if g.get("status") in ["creating", "inviting", "running"]
        ])
        
        if self._stats["total_groups"] > 0:
            self._stats["avg_messages_per_group"] = (
                self._stats["total_messages_sent"] / self._stats["total_groups"]
            )
        
        return self._stats
    
    async def update_role_stats(self, role_id: str, success: bool):
        """更新角色統計"""
        if role_id in self._roles:
            role = self._roles[role_id]
            role["usageCount"] = role.get("usageCount", 0) + 1
            if success:
                role["successCount"] = role.get("successCount", 0) + 1
            self._save_json(self.roles_file, self._roles)
    
    async def update_script_stats(self, script_id: str, success: bool, duration: int = 0):
        """更新劇本統計"""
        if script_id in self._scripts:
            script = self._scripts[script_id]
            stats = script.get("stats", {})
            
            stats["useCount"] = stats.get("useCount", 0) + 1
            if success:
                stats["successCount"] = stats.get("successCount", 0) + 1
            
            # 更新平均時長
            if duration > 0:
                old_avg = stats.get("avgDuration", 0)
                old_count = stats.get("useCount", 1) - 1
                if old_count > 0:
                    stats["avgDuration"] = (old_avg * old_count + duration) / stats["useCount"]
                else:
                    stats["avgDuration"] = duration
            
            # 更新轉化率
            if stats["useCount"] > 0:
                stats["conversionRate"] = stats["successCount"] / stats["useCount"] * 100
            
            script["stats"] = stats
            self._save_json(self.scripts_file, self._scripts)
    
    # ========== 數據導出 ==========
    
    async def export_data(self) -> Dict:
        """導出所有數據"""
        return {
            "roles": list(self._roles.values()),
            "scripts": list(self._scripts.values()),
            "groups": list(self._groups.values()),
            "stats": self._stats,
            "exportedAt": datetime.now().isoformat()
        }
    
    async def import_data(self, data: Dict) -> Dict:
        """導入數據"""
        try:
            if "roles" in data:
                for role in data["roles"]:
                    self._roles[role["id"]] = role
                self._save_json(self.roles_file, self._roles)
            
            if "scripts" in data:
                for script in data["scripts"]:
                    self._scripts[script["id"]] = script
                self._save_json(self.scripts_file, self._scripts)
            
            if "groups" in data:
                for group in data["groups"]:
                    self._groups[group["id"]] = group
                self._save_json(self.groups_file, self._groups)
            
            return {"success": True, "imported": {
                "roles": len(data.get("roles", [])),
                "scripts": len(data.get("scripts", [])),
                "groups": len(data.get("groups", []))
            }}
        except Exception as e:
            return {"success": False, "error": str(e)}


# 單例實例
_manager_instance: Optional[MultiRoleManager] = None


def get_multi_role_manager(data_dir: str = None) -> MultiRoleManager:
    """獲取管理器單例"""
    global _manager_instance
    if _manager_instance is None:
        _manager_instance = MultiRoleManager(data_dir)
    return _manager_instance
