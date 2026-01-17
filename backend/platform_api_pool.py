"""
TG-Matrix 平台 API 池服務
Platform API Pool Service

功能：
1. 平台 API 憑據管理（管理員添加）
2. 會員配額驗證與分配
3. 智能負載均衡
4. 健康監控與自動隔離
5. 使用統計與計費

會員配額：
- 青銅戰士 (Bronze): 0 API / 0 帳號（需自備 API）
- 白銀精英 (Silver): 1 API / 3 帳號
- 黃金大師 (Gold): 3 API / 9 帳號
- 鑽石王牌 (Diamond): 10 API / 30 帳號
- 星耀傳說 (Star): 30 API / 90 帳號
- 榮耀王者 (King): 無限 API / 無限帳號
"""

import os
import sys
import json
import hashlib
import asyncio
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field, asdict
from datetime import datetime
from enum import Enum


class MembershipLevel(Enum):
    """會員等級"""
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    DIAMOND = "diamond"
    STAR = "star"
    KING = "king"


# 會員 API 配額配置
MEMBERSHIP_API_QUOTAS = {
    MembershipLevel.BRONZE: {"api_quota": 0, "max_accounts": 0},
    MembershipLevel.SILVER: {"api_quota": 1, "max_accounts": 3},
    MembershipLevel.GOLD: {"api_quota": 3, "max_accounts": 9},
    MembershipLevel.DIAMOND: {"api_quota": 10, "max_accounts": 30},
    MembershipLevel.STAR: {"api_quota": 30, "max_accounts": 90},
    MembershipLevel.KING: {"api_quota": -1, "max_accounts": -1},  # 無限
}


@dataclass
class PlatformApiCredential:
    """平台 API 憑據"""
    api_id: str
    api_hash: str
    name: str
    status: str = "active"  # active, suspended, banned
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    max_accounts_per_api: int = 3  # 每個 API 最多綁定帳號數
    current_accounts: int = 0
    bound_users: List[str] = field(default_factory=list)  # 綁定的用戶 ID 列表
    bound_phones: List[str] = field(default_factory=list)  # 綁定的手機號列表
    health_score: int = 100
    last_used: Optional[str] = None
    fail_count: int = 0
    success_count: int = 0


@dataclass
class UserApiAllocation:
    """用戶 API 分配記錄"""
    user_id: str
    phone: str
    api_id: str
    allocated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    status: str = "active"


class PlatformApiPool:
    """平台 API 池管理器"""
    
    def __init__(self, data_dir: str = "./data"):
        """
        初始化平台 API 池
        
        Args:
            data_dir: 數據存儲目錄
        """
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        self.pool_file = self.data_dir / "platform_api_pool.json"
        self.allocations_file = self.data_dir / "platform_api_allocations.json"
        
        self.credentials: Dict[str, PlatformApiCredential] = {}
        self.allocations: Dict[str, UserApiAllocation] = {}  # key: phone
        
        self._load()
    
    def _load(self) -> None:
        """從文件加載數據"""
        # 加載 API 池
        if self.pool_file.exists():
            try:
                with open(self.pool_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for api_id, cred_data in data.get("credentials", {}).items():
                        self.credentials[api_id] = PlatformApiCredential(**cred_data)
            except Exception as e:
                print(f"[PlatformApiPool] Error loading pool: {e}", file=sys.stderr)
        
        # 加載分配記錄
        if self.allocations_file.exists():
            try:
                with open(self.allocations_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for phone, alloc_data in data.get("allocations", {}).items():
                        self.allocations[phone] = UserApiAllocation(**alloc_data)
            except Exception as e:
                print(f"[PlatformApiPool] Error loading allocations: {e}", file=sys.stderr)
    
    def _save(self) -> None:
        """保存數據到文件"""
        # 保存 API 池
        pool_data = {
            "credentials": {k: asdict(v) for k, v in self.credentials.items()},
            "updated_at": datetime.now().isoformat()
        }
        with open(self.pool_file, 'w', encoding='utf-8') as f:
            json.dump(pool_data, f, indent=2, ensure_ascii=False)
        
        # 保存分配記錄
        alloc_data = {
            "allocations": {k: asdict(v) for k, v in self.allocations.items()},
            "updated_at": datetime.now().isoformat()
        }
        with open(self.allocations_file, 'w', encoding='utf-8') as f:
            json.dump(alloc_data, f, indent=2, ensure_ascii=False)
    
    # ==================== 管理員功能 ====================
    
    def add_platform_api(
        self,
        api_id: str,
        api_hash: str,
        name: str,
        max_accounts: int = 3
    ) -> Tuple[bool, str]:
        """
        添加平台 API（管理員操作）
        
        Args:
            api_id: API ID
            api_hash: API Hash
            name: API 名稱
            max_accounts: 最大綁定帳號數
            
        Returns:
            (是否成功, 消息)
        """
        if api_id in self.credentials:
            return False, f"API {api_id} 已存在"
        
        self.credentials[api_id] = PlatformApiCredential(
            api_id=api_id,
            api_hash=api_hash,
            name=name,
            max_accounts_per_api=max_accounts
        )
        self._save()
        
        print(f"[PlatformApiPool] Added platform API: {api_id} ({name})", file=sys.stderr)
        return True, f"已添加平台 API: {name}"
    
    def remove_platform_api(self, api_id: str) -> Tuple[bool, str]:
        """移除平台 API"""
        if api_id not in self.credentials:
            return False, f"API {api_id} 不存在"
        
        cred = self.credentials[api_id]
        if cred.current_accounts > 0:
            return False, f"API {api_id} 仍有 {cred.current_accounts} 個帳號綁定，無法刪除"
        
        del self.credentials[api_id]
        self._save()
        return True, f"已移除平台 API: {api_id}"
    
    def suspend_platform_api(self, api_id: str) -> Tuple[bool, str]:
        """暫停平台 API"""
        if api_id not in self.credentials:
            return False, f"API {api_id} 不存在"
        
        self.credentials[api_id].status = "suspended"
        self._save()
        return True, f"已暫停平台 API: {api_id}"
    
    def activate_platform_api(self, api_id: str) -> Tuple[bool, str]:
        """啟用平台 API"""
        if api_id not in self.credentials:
            return False, f"API {api_id} 不存在"
        
        self.credentials[api_id].status = "active"
        self._save()
        return True, f"已啟用平台 API: {api_id}"
    
    def list_platform_apis(self) -> List[Dict[str, Any]]:
        """列出所有平台 API"""
        return [
            {
                "api_id": cred.api_id,
                "name": cred.name,
                "status": cred.status,
                "current_accounts": cred.current_accounts,
                "max_accounts": cred.max_accounts_per_api,
                "health_score": cred.health_score,
                "success_rate": (
                    cred.success_count / (cred.success_count + cred.fail_count) * 100
                    if (cred.success_count + cred.fail_count) > 0 else 100
                )
            }
            for cred in self.credentials.values()
        ]
    
    # ==================== 用戶功能 ====================
    
    def check_user_quota(
        self,
        user_id: str,
        membership_level: str
    ) -> Dict[str, Any]:
        """
        檢查用戶配額
        
        Args:
            user_id: 用戶 ID
            membership_level: 會員等級
            
        Returns:
            配額信息
        """
        try:
            level = MembershipLevel(membership_level)
        except ValueError:
            level = MembershipLevel.BRONZE
        
        quota = MEMBERSHIP_API_QUOTAS[level]
        
        # 計算用戶已使用的配額
        user_allocations = [
            alloc for alloc in self.allocations.values()
            if alloc.user_id == user_id and alloc.status == "active"
        ]
        
        used_accounts = len(user_allocations)
        used_apis = len(set(alloc.api_id for alloc in user_allocations))
        
        total_accounts = quota["max_accounts"]
        total_apis = quota["api_quota"]
        
        # -1 表示無限
        if total_accounts == -1:
            can_add_more = True
            remaining_slots = 999999
        else:
            can_add_more = used_accounts < total_accounts
            remaining_slots = max(0, total_accounts - used_accounts)
        
        return {
            "success": True,
            "membership_level": membership_level,
            "usedApis": used_apis,
            "totalApis": total_apis,
            "usedAccounts": used_accounts,
            "totalAccounts": total_accounts,
            "canAddMore": can_add_more,
            "remainingSlots": remaining_slots
        }
    
    def allocate_api_for_user(
        self,
        user_id: str,
        phone: str,
        membership_level: str
    ) -> Dict[str, Any]:
        """
        為用戶分配平台 API
        
        Args:
            user_id: 用戶 ID
            phone: 手機號
            membership_level: 會員等級
            
        Returns:
            分配結果，包含 api_id 和 api_hash
        """
        # 檢查配額
        quota_info = self.check_user_quota(user_id, membership_level)
        if not quota_info["canAddMore"]:
            return {
                "success": False,
                "error": "配額已滿，請升級會員或使用專家模式"
            }
        
        # 檢查是否已經分配
        if phone in self.allocations and self.allocations[phone].status == "active":
            existing = self.allocations[phone]
            cred = self.credentials.get(existing.api_id)
            if cred:
                return {
                    "success": True,
                    "api_id": cred.api_id,
                    "api_hash": cred.api_hash,
                    "message": "已有分配"
                }
        
        # 找到最佳 API（負載最低的活躍 API）
        best_api = self._find_best_api()
        if not best_api:
            return {
                "success": False,
                "error": "平台 API 池暫無可用資源，請使用專家模式"
            }
        
        # 創建分配記錄
        allocation = UserApiAllocation(
            user_id=user_id,
            phone=phone,
            api_id=best_api.api_id
        )
        self.allocations[phone] = allocation
        
        # 更新 API 使用計數
        best_api.current_accounts += 1
        best_api.bound_users.append(user_id)
        best_api.bound_phones.append(phone)
        best_api.last_used = datetime.now().isoformat()
        
        self._save()
        
        print(f"[PlatformApiPool] Allocated API {best_api.api_id} to user {user_id} for phone {phone}", file=sys.stderr)
        
        return {
            "success": True,
            "api_id": best_api.api_id,
            "api_hash": best_api.api_hash,
            "message": "已分配平台 API"
        }
    
    def _find_best_api(self) -> Optional[PlatformApiCredential]:
        """找到最佳可用 API（負載均衡）"""
        available_apis = [
            cred for cred in self.credentials.values()
            if cred.status == "active" and 
               cred.current_accounts < cred.max_accounts_per_api and
               cred.health_score >= 50
        ]
        
        if not available_apis:
            return None
        
        # 按負載率和健康分數排序
        available_apis.sort(
            key=lambda x: (
                x.current_accounts / x.max_accounts_per_api,  # 負載率越低越好
                -x.health_score  # 健康分數越高越好
            )
        )
        
        return available_apis[0]
    
    def release_allocation(self, phone: str) -> Tuple[bool, str]:
        """釋放用戶的 API 分配"""
        if phone not in self.allocations:
            return False, f"未找到 {phone} 的分配記錄"
        
        allocation = self.allocations[phone]
        api_id = allocation.api_id
        
        # 更新 API 計數
        if api_id in self.credentials:
            cred = self.credentials[api_id]
            cred.current_accounts = max(0, cred.current_accounts - 1)
            if allocation.user_id in cred.bound_users:
                cred.bound_users.remove(allocation.user_id)
            if phone in cred.bound_phones:
                cred.bound_phones.remove(phone)
        
        # 標記分配為已釋放
        allocation.status = "released"
        
        self._save()
        return True, f"已釋放 {phone} 的 API 分配"
    
    def get_user_allocations(self, user_id: str) -> List[Dict[str, Any]]:
        """獲取用戶的所有分配"""
        return [
            {
                "phone": alloc.phone,
                "api_id": alloc.api_id,
                "allocated_at": alloc.allocated_at,
                "status": alloc.status
            }
            for alloc in self.allocations.values()
            if alloc.user_id == user_id
        ]
    
    # ==================== 健康監控 ====================
    
    def report_api_success(self, api_id: str) -> None:
        """報告 API 成功使用"""
        if api_id in self.credentials:
            cred = self.credentials[api_id]
            cred.success_count += 1
            cred.health_score = min(100, cred.health_score + 1)
            cred.fail_count = max(0, cred.fail_count - 1)
            self._save()
    
    def report_api_failure(self, api_id: str, is_ban: bool = False) -> None:
        """報告 API 使用失敗"""
        if api_id in self.credentials:
            cred = self.credentials[api_id]
            cred.fail_count += 1
            
            if is_ban:
                # 封號，嚴重降低健康分數
                cred.health_score = max(0, cred.health_score - 30)
                if cred.health_score < 20:
                    cred.status = "suspended"
                    print(f"[PlatformApiPool] API {api_id} suspended due to ban", file=sys.stderr)
            else:
                cred.health_score = max(0, cred.health_score - 5)
            
            self._save()
    
    def get_pool_statistics(self) -> Dict[str, Any]:
        """獲取 API 池統計信息"""
        total_apis = len(self.credentials)
        active_apis = len([c for c in self.credentials.values() if c.status == "active"])
        total_capacity = sum(c.max_accounts_per_api for c in self.credentials.values() if c.status == "active")
        total_used = sum(c.current_accounts for c in self.credentials.values())
        
        return {
            "total_apis": total_apis,
            "active_apis": active_apis,
            "suspended_apis": total_apis - active_apis,
            "total_capacity": total_capacity,
            "total_used": total_used,
            "available_slots": total_capacity - total_used,
            "utilization_rate": (total_used / total_capacity * 100) if total_capacity > 0 else 0,
            "total_allocations": len([a for a in self.allocations.values() if a.status == "active"])
        }


# 全局實例
_platform_pool: Optional[PlatformApiPool] = None


def get_platform_api_pool(data_dir: str = "./data") -> PlatformApiPool:
    """獲取平台 API 池實例"""
    global _platform_pool
    if _platform_pool is None:
        _platform_pool = PlatformApiPool(data_dir)
    return _platform_pool
