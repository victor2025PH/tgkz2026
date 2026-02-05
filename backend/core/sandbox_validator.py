"""
TG-Matrix Sandbox Validator
沙盒隔離驗證服務

功能：
1. 驗證賬號的沙盒隔離狀態
2. 檢查設備指紋一致性
3. 驗證代理配置
4. 檢測潛在的關聯風險
"""
import sys
import hashlib
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

from config import SandboxConfig, SESSIONS_DIR


@dataclass
class SandboxCheckResult:
    """沙盒檢查結果"""
    check_name: str
    passed: bool
    message: str
    severity: str  # 'info', 'warning', 'error', 'critical'
    details: Optional[Dict[str, Any]] = None


class SandboxValidator:
    """沙盒隔離驗證器"""
    
    def __init__(self):
        self.config = SandboxConfig
    
    def validate_account(self, account: Dict[str, Any]) -> List[SandboxCheckResult]:
        """
        驗證單個賬號的沙盒隔離狀態
        
        Args:
            account: 賬號數據字典
            
        Returns:
            檢查結果列表
        """
        results = []
        phone = account.get('phone', '')
        
        # 1. 檢查目錄隔離
        results.append(self._check_directory_isolation(phone))
        
        # 2. 檢查設備指紋
        results.append(self._check_device_fingerprint(account))
        
        # 3. 檢查代理配置
        results.append(self._check_proxy_config(account))
        
        # 4. 檢查指紋持久化
        results.append(self._check_fingerprint_persistence(account))
        
        return results
    
    def validate_all_accounts(self, accounts: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        驗證所有賬號的沙盒隔離狀態
        
        Args:
            accounts: 賬號列表
            
        Returns:
            總體報告
        """
        all_results = {}
        ip_account_map: Dict[str, List[str]] = {}  # IP -> [phones]
        
        for account in accounts:
            phone = account.get('phone', '')
            results = self.validate_account(account)
            all_results[phone] = results
            
            # 統計每個 IP 下的賬號數
            proxy = account.get('proxy', '')
            if proxy:
                # 提取代理 IP
                proxy_ip = self._extract_proxy_ip(proxy)
                if proxy_ip:
                    if proxy_ip not in ip_account_map:
                        ip_account_map[proxy_ip] = []
                    ip_account_map[proxy_ip].append(phone)
        
        # 檢查 IP 關聯風險
        ip_risks = []
        for ip, phones in ip_account_map.items():
            if len(phones) > self.config.MAX_ACCOUNTS_PER_IP:
                ip_risks.append({
                    'ip': ip,
                    'accounts': phones,
                    'count': len(phones),
                    'max_allowed': self.config.MAX_ACCOUNTS_PER_IP,
                    'severity': 'warning' if len(phones) <= self.config.MAX_ACCOUNTS_PER_IP + 2 else 'error'
                })
        
        # 計算總體分數
        total_checks = sum(len(results) for results in all_results.values())
        passed_checks = sum(
            sum(1 for r in results if r.passed)
            for results in all_results.values()
        )
        
        score = (passed_checks / total_checks * 100) if total_checks > 0 else 0
        
        return {
            'timestamp': datetime.now().isoformat(),
            'total_accounts': len(accounts),
            'total_checks': total_checks,
            'passed_checks': passed_checks,
            'score': round(score, 1),
            'ip_risks': ip_risks,
            'config': self.config.get_status(),
            'account_results': {
                phone: [
                    {
                        'check': r.check_name,
                        'passed': r.passed,
                        'message': r.message,
                        'severity': r.severity
                    }
                    for r in results
                ]
                for phone, results in all_results.items()
            }
        }
    
    def _check_directory_isolation(self, phone: str) -> SandboxCheckResult:
        """檢查目錄隔離"""
        if not self.config.USE_ISOLATED_DIRS:
            return SandboxCheckResult(
                check_name="目錄隔離",
                passed=True,
                message="目錄隔離已禁用（兼容模式）",
                severity="info"
            )
        
        account_dir = self.config.get_account_dir(phone)
        session_path = self.config.get_session_path(phone)
        
        if account_dir.exists():
            # 檢查所有子目錄
            cache_dir = self.config.get_cache_dir(phone)
            temp_dir = self.config.get_temp_dir(phone)
            media_dir = self.config.get_media_dir(phone)
            
            missing_dirs = []
            if not cache_dir.exists():
                missing_dirs.append('cache')
            if not temp_dir.exists():
                missing_dirs.append('temp')
            if not media_dir.exists():
                missing_dirs.append('media')
            
            if missing_dirs:
                return SandboxCheckResult(
                    check_name="目錄隔離",
                    passed=False,
                    message=f"缺少子目錄: {', '.join(missing_dirs)}",
                    severity="warning",
                    details={'missing_dirs': missing_dirs}
                )
            
            return SandboxCheckResult(
                check_name="目錄隔離",
                passed=True,
                message="目錄隔離正常",
                severity="info",
                details={'account_dir': str(account_dir)}
            )
        else:
            return SandboxCheckResult(
                check_name="目錄隔離",
                passed=False,
                message="賬號目錄不存在",
                severity="warning",
                details={'expected_dir': str(account_dir)}
            )
    
    def _check_device_fingerprint(self, account: Dict[str, Any]) -> SandboxCheckResult:
        """檢查設備指紋"""
        device_model = account.get('deviceModel') or account.get('device_model')
        system_version = account.get('systemVersion') or account.get('system_version')
        app_version = account.get('appVersion') or account.get('app_version')
        
        if not device_model or not system_version or not app_version:
            return SandboxCheckResult(
                check_name="設備指紋",
                passed=False,
                message="設備指紋不完整",
                severity="error",
                details={
                    'device_model': device_model,
                    'system_version': system_version,
                    'app_version': app_version
                }
            )
        
        return SandboxCheckResult(
            check_name="設備指紋",
            passed=True,
            message=f"{device_model}, {system_version}",
            severity="info",
            details={
                'device_model': device_model,
                'system_version': system_version,
                'app_version': app_version
            }
        )
    
    def _check_proxy_config(self, account: Dict[str, Any]) -> SandboxCheckResult:
        """檢查代理配置"""
        proxy = account.get('proxy', '')
        
        if self.config.REQUIRE_PROXY:
            if not proxy:
                return SandboxCheckResult(
                    check_name="代理配置",
                    passed=False,
                    message="需要代理但未配置",
                    severity="critical"
                )
            return SandboxCheckResult(
                check_name="代理配置",
                passed=True,
                message="代理已配置",
                severity="info",
                details={'proxy': self._mask_proxy(proxy)}
            )
        else:
            if not proxy:
                return SandboxCheckResult(
                    check_name="代理配置",
                    passed=True,
                    message="未配置代理（允許直連）",
                    severity="warning"
                )
            return SandboxCheckResult(
                check_name="代理配置",
                passed=True,
                message="代理已配置",
                severity="info",
                details={'proxy': self._mask_proxy(proxy)}
            )
    
    def _check_fingerprint_persistence(self, account: Dict[str, Any]) -> SandboxCheckResult:
        """檢查指紋持久化"""
        fingerprint_hash = account.get('fingerprint_hash') or account.get('fingerprintHash')
        fingerprint_version = account.get('fingerprint_version') or account.get('fingerprintVersion')
        
        if not self.config.PERSIST_FINGERPRINT:
            return SandboxCheckResult(
                check_name="指紋持久化",
                passed=True,
                message="指紋持久化已禁用",
                severity="info"
            )
        
        if not fingerprint_hash:
            return SandboxCheckResult(
                check_name="指紋持久化",
                passed=False,
                message="指紋未持久化",
                severity="warning"
            )
        
        return SandboxCheckResult(
            check_name="指紋持久化",
            passed=True,
            message=f"版本: {fingerprint_version or 'unknown'}",
            severity="info",
            details={
                'hash': fingerprint_hash[:8] + '...' if fingerprint_hash else None,
                'version': fingerprint_version
            }
        )
    
    def _extract_proxy_ip(self, proxy: str) -> Optional[str]:
        """從代理字符串提取 IP"""
        if not proxy:
            return None
        
        # 格式: protocol://user:pass@host:port 或 protocol://host:port
        try:
            if '@' in proxy:
                host_part = proxy.split('@')[1]
            else:
                host_part = proxy.split('://')[1] if '://' in proxy else proxy
            
            # 提取 host
            if ':' in host_part:
                return host_part.split(':')[0]
            return host_part
        except:
            return None
    
    def _mask_proxy(self, proxy: str) -> str:
        """遮罩代理敏感信息"""
        if not proxy:
            return ''
        
        # 遮罩密碼
        if '@' in proxy:
            prefix = proxy.split('@')[0]
            suffix = proxy.split('@')[1]
            if ':' in prefix:
                protocol_user = prefix.rsplit(':', 1)[0]
                return f"{protocol_user}:****@{suffix}"
        return proxy


# 全局實例
_validator_instance: Optional[SandboxValidator] = None


def get_sandbox_validator() -> SandboxValidator:
    """獲取沙盒驗證器實例"""
    global _validator_instance
    if _validator_instance is None:
        _validator_instance = SandboxValidator()
    return _validator_instance

