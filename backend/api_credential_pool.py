"""
TG-Matrix API Credential Pool Manager
API 憑據池管理器 - 用於管理多個 API ID/Hash 組合

功能：
1. 管理多個 API ID/Hash
2. 智能分配 API 憑據給帳號
3. 追蹤每個 API ID 的使用情況
4. 負載均衡和風險分散
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime
import random

@dataclass
class ApiCredential:
    """API 憑據"""
    api_id: str
    api_hash: str
    name: str  # 備註名稱，例如 "MyApp1"
    source: str  # 來源，例如申請帳號的手機號
    created_at: str
    is_active: bool = True
    account_count: int = 0  # 已分配的帳號數量
    max_accounts: int = 5  # 最大帳號數量（推薦值）
    is_public: bool = False  # 是否為公共 API（不推薦使用）
    owner_user_id: str = ""  # 🆕 多租戶支持：擁有者用戶 ID


class ApiCredentialPool:
    """API 憑據池管理器"""
    
    # 內置公共 API 憑據（僅作為後備，不推薦使用）
    PUBLIC_CREDENTIALS = [
        ApiCredential(
            api_id="2040",
            api_hash="b18441a1ff607e10a989891a5462e627",
            name="Telegram Desktop (Public)",
            source="public",
            created_at="2020-01-01",
            is_active=True,
            is_public=True,
            max_accounts=0  # 公共 API 不建議使用
        ),
        ApiCredential(
            api_id="21724",
            api_hash="3e0cb5efcd52300aec5994fdfc5bdc16",
            name="Telegram Android (Public)",
            source="public",
            created_at="2020-01-01",
            is_active=True,
            is_public=True,
            max_accounts=0
        ),
    ]
    
    def __init__(self, data_dir: str = "./data"):
        """
        初始化 API 憑據池
        
        Args:
            data_dir: 數據目錄
        """
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.pool_file = self.data_dir / "api_credentials.json"
        
        # 加載憑據池
        self.credentials: List[ApiCredential] = []
        self.load()
        
    def load(self) -> None:
        """從文件加載憑據池"""
        if self.pool_file.exists():
            try:
                with open(self.pool_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.credentials = []
                    for cred in data.get("credentials", []):
                        # 🆕 清理可能的亂碼名稱
                        cred['name'] = self._sanitize_name(cred.get('name', ''), cred.get('api_id', ''))
                        self.credentials.append(ApiCredential(**cred))
                print(f"[ApiCredentialPool] Loaded {len(self.credentials)} custom credentials", file=sys.stderr)
            except Exception as e:
                print(f"[ApiCredentialPool] Error loading credentials: {e}", file=sys.stderr)
                self.credentials = []
        else:
            self.credentials = []
            
    def _sanitize_name(self, name: str, api_id: str) -> str:
        """
        清理並驗證 API 名稱，處理編碼問題
        
        Args:
            name: 原始名稱
            api_id: API ID（用於生成備用名稱）
            
        Returns:
            清理後的名稱
        """
        if not name:
            return f"API {api_id}"
        
        try:
            # 嘗試檢測和修復編碼問題
            # 檢查是否包含常見的亂碼字符
            import re
            
            # 檢測 Unicode 替換字符、控制字符、私用區字符
            if re.search(r'[\uFFFD\u0000-\u001F\uE000-\uF8FF]', name):
                return f"API {api_id}"
            
            # 檢測 � 符號（顯示為替換字符的文字形式）
            if '�' in name:
                return f"API {api_id}"
            
            # 嘗試編碼測試 - 如果無法正確編碼為 UTF-8 則視為亂碼
            name.encode('utf-8').decode('utf-8')
            
            return name
        except (UnicodeDecodeError, UnicodeEncodeError):
            return f"API {api_id}"
            
    def save(self) -> None:
        """保存憑據池到文件"""
        try:
            data = {
                "credentials": [asdict(cred) for cred in self.credentials],
                "updated_at": datetime.now().isoformat()
            }
            with open(self.pool_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"[ApiCredentialPool] Saved {len(self.credentials)} credentials", file=sys.stderr)
        except Exception as e:
            print(f"[ApiCredentialPool] Error saving credentials: {e}", file=sys.stderr)
            
    def add_credential(
        self,
        api_id: str,
        api_hash: str,
        name: str = "",
        source: str = "",
        max_accounts: int = 5,
        owner_user_id: str = ""
    ) -> bool:
        """
        添加新的 API 憑據
        
        Args:
            api_id: API ID
            api_hash: API Hash
            name: 備註名稱
            source: 來源（申請的手機號等）
            max_accounts: 最大帳號數量
            owner_user_id: 🆕 擁有者用戶 ID（多租戶隔離）
            
        Returns:
            是否添加成功
        """
        # 🆕 多租戶：同一用戶不能重複添加相同 API ID
        for cred in self.credentials:
            if cred.api_id == api_id and cred.owner_user_id == owner_user_id:
                print(f"[ApiCredentialPool] API ID {api_id} already exists for user {owner_user_id}", file=sys.stderr)
                return False
                
        # 驗證格式
        if not api_id.isdigit():
            print(f"[ApiCredentialPool] Invalid API ID format: {api_id}", file=sys.stderr)
            return False
            
        if len(api_hash) != 32:
            print(f"[ApiCredentialPool] Invalid API Hash length: {len(api_hash)}", file=sys.stderr)
            return False
            
        # 🆕 清理並驗證名稱
        clean_name = self._sanitize_name(name, api_id) if name else f"API_{api_id[-4:]}"
        
        # 添加新憑據
        new_cred = ApiCredential(
            api_id=api_id,
            api_hash=api_hash,
            name=clean_name,
            source=source,
            created_at=datetime.now().isoformat(),
            is_active=True,
            account_count=0,
            max_accounts=max_accounts,
            is_public=False,
            owner_user_id=owner_user_id  # 🆕 多租戶隔離
        )
        
        self.credentials.append(new_cred)
        self.save()
        
        print(f"[ApiCredentialPool] Added new credential: {api_id}", file=sys.stderr)
        return True
        
    def remove_credential(self, api_id: str, owner_user_id: str = None) -> bool:
        """移除 API 憑據
        
        Args:
            api_id: API ID
            owner_user_id: 🆕 擁有者用戶 ID（多租戶：只能刪除自己的憑據）
        """
        for i, cred in enumerate(self.credentials):
            if cred.api_id == api_id:
                # 🆕 多租戶檢查：如果指定了 owner_user_id，只能刪除自己的憑據
                if owner_user_id and cred.owner_user_id and cred.owner_user_id != owner_user_id:
                    print(f"[ApiCredentialPool] Cannot remove: not owner ({cred.owner_user_id} != {owner_user_id})", file=sys.stderr)
                    return False
                self.credentials.pop(i)
                self.save()
                print(f"[ApiCredentialPool] Removed credential: {api_id}", file=sys.stderr)
                return True
        return False
        
    def get_credential(self, api_id: str) -> Optional[ApiCredential]:
        """獲取指定的 API 憑據"""
        for cred in self.credentials:
            if cred.api_id == api_id:
                return cred
        return None
        
    def get_best_credential(self) -> Optional[ApiCredential]:
        """
        獲取最佳的 API 憑據（負載均衡）
        
        優先選擇：
        1. 自定義憑據（非公共）
        2. 帳號數量未滿的
        3. 帳號數量最少的
        
        Returns:
            最佳的 API 憑據，如果沒有可用的返回 None
        """
        # 過濾活躍的自定義憑據
        available = [
            cred for cred in self.credentials
            if cred.is_active and not cred.is_public and cred.account_count < cred.max_accounts
        ]
        
        if not available:
            print(f"[ApiCredentialPool] No available custom credentials!", file=sys.stderr)
            return None
            
        # 按帳號數量排序，選擇最少的
        available.sort(key=lambda x: x.account_count)
        
        best = available[0]
        print(f"[ApiCredentialPool] Selected credential {best.api_id} (accounts: {best.account_count}/{best.max_accounts})", file=sys.stderr)
        return best
        
    def allocate_credential(self, api_id: str) -> bool:
        """
        為帳號分配憑據（增加計數）
        
        Args:
            api_id: API ID
            
        Returns:
            是否分配成功
        """
        for cred in self.credentials:
            if cred.api_id == api_id:
                cred.account_count += 1
                self.save()
                return True
        return False
        
    def release_credential(self, api_id: str) -> bool:
        """
        釋放憑據（減少計數）
        
        Args:
            api_id: API ID
            
        Returns:
            是否釋放成功
        """
        for cred in self.credentials:
            if cred.api_id == api_id and cred.account_count > 0:
                cred.account_count -= 1
                self.save()
                return True
        return False
        
    def get_statistics(self) -> Dict[str, Any]:
        """獲取憑據池統計信息"""
        custom_creds = [c for c in self.credentials if not c.is_public]
        active_creds = [c for c in custom_creds if c.is_active]
        
        total_capacity = sum(c.max_accounts for c in active_creds)
        total_used = sum(c.account_count for c in active_creds)
        
        return {
            "total_credentials": len(self.credentials),
            "custom_credentials": len(custom_creds),
            "active_credentials": len(active_creds),
            "total_capacity": total_capacity,
            "total_used": total_used,
            "available_slots": total_capacity - total_used,
            "utilization_rate": (total_used / total_capacity * 100) if total_capacity > 0 else 0,
            "credentials": [
                {
                    "api_id": c.api_id,
                    "name": c.name,
                    "account_count": c.account_count,
                    "max_accounts": c.max_accounts,
                    "is_active": c.is_active,
                    "is_public": c.is_public
                }
                for c in self.credentials
            ]
        }
        
    def list_credentials(self, include_hash: bool = True, accounts: List[Dict[str, Any]] = None, owner_user_id: str = None) -> List[Dict[str, Any]]:
        """
        列出所有憑據

        Args:
            include_hash: 是否包含 api_hash（本地應用需要）
            accounts: 帳號列表，用於獲取每個 API 綁定的帳號詳情
            owner_user_id: 🆕 擁有者用戶 ID（多租戶過濾）
        """
        # 構建 API ID 到帳號列表的映射
        api_to_accounts: Dict[str, List[Dict[str, Any]]] = {}
        if accounts:
            for account in accounts:
                api_id = str(account.get('apiId') or account.get('api_id') or '')
                if api_id:
                    if api_id not in api_to_accounts:
                        api_to_accounts[api_id] = []
                    api_to_accounts[api_id].append({
                        'phone': account.get('phone', ''),
                        'firstName': account.get('firstName') or account.get('first_name') or '',
                        'lastName': account.get('lastName') or account.get('last_name') or '',
                        'username': account.get('username') or '',
                        'status': account.get('status', 'Offline'),
                        'id': account.get('id'),
                        'boundAt': account.get('created_at') or account.get('createdAt') or ''
                    })
        
        result = []
        for c in self.credentials:
            # 🆕 多租戶過濾：只返回屬於當前用戶的憑據
            if owner_user_id and c.owner_user_id and c.owner_user_id != owner_user_id:
                continue
            api_id_str = str(c.api_id)
            bound_accounts = api_to_accounts.get(api_id_str, [])
            
            item = {
                "api_id": c.api_id,
                "name": c.name,
                "source": c.source,
                "account_count": len(bound_accounts),  # 使用實際綁定數量
                "max_accounts": c.max_accounts,
                "is_active": c.is_active,
                "is_public": c.is_public,
                "created_at": c.created_at,
                "bound_accounts": bound_accounts  # 添加綁定帳號詳情
            }
            if include_hash:
                item["api_hash"] = c.api_hash
            result.append(item)
        return result
        
    def get_recommendation(self, account_count: int) -> Dict[str, Any]:
        """
        根據帳號數量獲取建議
        
        Args:
            account_count: 計劃管理的帳號數量
            
        Returns:
            建議信息
        """
        # 計算需要的 API ID 數量
        recommended = max(1, account_count // 5)  # 每 5 個帳號 1 個
        minimum = max(1, account_count // 10)  # 最少每 10 個帳號 1 個
        
        # 當前狀態
        stats = self.get_statistics()
        current = stats["active_credentials"]
        available = stats["available_slots"]
        
        return {
            "account_count": account_count,
            "recommended_api_count": recommended,
            "minimum_api_count": minimum,
            "current_api_count": current,
            "available_slots": available,
            "needs_more_apis": current < minimum,
            "message": self._get_recommendation_message(account_count, current, minimum, recommended)
        }
        
    def _get_recommendation_message(
        self,
        accounts: int,
        current: int,
        minimum: int,
        recommended: int
    ) -> str:
        """生成建議消息"""
        if current == 0:
            return f"⚠️ 您還沒有添加任何專屬 API 憑據！管理 {accounts} 個帳號建議至少添加 {recommended} 個 API ID。"
        elif current < minimum:
            need = minimum - current
            return f"⚠️ API 憑據不足！當前 {current} 個，管理 {accounts} 個帳號至少需要 {minimum} 個，建議添加 {need} 個以上。"
        elif current < recommended:
            return f"📊 當前 {current} 個 API 憑據可用，管理 {accounts} 個帳號建議有 {recommended} 個，風險中等。"
        else:
            return f"✅ 當前 {current} 個 API 憑據充足，管理 {accounts} 個帳號風險較低。"
    
    def sync_usage_counts(self, accounts: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        根據帳號列表同步使用計數
        
        Args:
            accounts: 帳號列表，每個帳號需包含 apiId 字段
            
        Returns:
            更新後的使用計數 {api_id: count}
        """
        # 統計每個 API ID 的使用次數
        usage_counts: Dict[str, int] = {}
        for account in accounts:
            api_id = account.get('apiId')
            if api_id:
                usage_counts[api_id] = usage_counts.get(api_id, 0) + 1
        
        # 更新憑據池中的計數
        updated = False
        for cred in self.credentials:
            new_count = usage_counts.get(cred.api_id, 0)
            if cred.account_count != new_count:
                print(f"[ApiCredentialPool] Syncing {cred.api_id}: {cred.account_count} -> {new_count}", file=sys.stderr)
                cred.account_count = new_count
                updated = True
        
        if updated:
            self.save()
            print(f"[ApiCredentialPool] Usage counts synced successfully", file=sys.stderr)
        
        return usage_counts


# 全局實例
_pool: Optional[ApiCredentialPool] = None


def get_api_credential_pool(data_dir: str = "./data") -> ApiCredentialPool:
    """獲取 API 憑據池實例（單例）"""
    global _pool
    if _pool is None:
        _pool = ApiCredentialPool(data_dir)
    return _pool
