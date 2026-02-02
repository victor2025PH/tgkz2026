"""
多租戶系統異常定義

🆕 優化設計：
1. 定義明確的異常層次結構
2. 禁止返回 None，改為拋出異常
3. 提供詳細的錯誤信息
4. 支持錯誤追蹤和日誌
"""

from typing import Optional, Dict, Any


class TenantError(Exception):
    """多租戶系統基礎異常"""
    
    def __init__(
        self,
        message: str,
        error_code: str = "TENANT_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "error": self.error_code,
            "message": self.message,
            "details": self.details
        }


# ============ 連接相關異常 ============

class TenantConnectionError(TenantError):
    """租戶數據庫連接錯誤"""
    
    def __init__(
        self,
        message: str,
        tenant_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.tenant_id = tenant_id
        super().__init__(
            message=message,
            error_code="TENANT_CONNECTION_ERROR",
            details={"tenant_id": tenant_id, **(details or {})}
        )


class SystemConnectionError(TenantError):
    """系統數據庫連接錯誤"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="SYSTEM_CONNECTION_ERROR",
            details=details
        )


class ConnectionPoolExhaustedError(TenantError):
    """連接池耗盡錯誤"""
    
    def __init__(self, max_connections: int, active_connections: int):
        super().__init__(
            message=f"連接池已滿 ({active_connections}/{max_connections})",
            error_code="CONNECTION_POOL_EXHAUSTED",
            details={
                "max_connections": max_connections,
                "active_connections": active_connections
            }
        )


# ============ 上下文相關異常 ============

class TenantContextError(TenantError):
    """租戶上下文錯誤"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="TENANT_CONTEXT_ERROR",
            details=details
        )


class TenantNotFoundError(TenantError):
    """租戶不存在"""
    
    def __init__(self, tenant_id: str):
        super().__init__(
            message=f"租戶不存在: {tenant_id}",
            error_code="TENANT_NOT_FOUND",
            details={"tenant_id": tenant_id}
        )


class TenantNotAuthenticatedError(TenantError):
    """租戶未認證"""
    
    def __init__(self, message: str = "用戶未認證"):
        super().__init__(
            message=message,
            error_code="TENANT_NOT_AUTHENTICATED"
        )


# ============ 遷移相關異常 ============

class MigrationError(TenantError):
    """遷移錯誤基類"""
    
    def __init__(
        self,
        message: str,
        error_code: str = "MIGRATION_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=error_code,
            details=details
        )


class MigrationInProgressError(MigrationError):
    """遷移正在進行中"""
    
    def __init__(self, started_at: str):
        super().__init__(
            message="數據遷移正在進行中，請稍後重試",
            error_code="MIGRATION_IN_PROGRESS",
            details={"started_at": started_at}
        )


class MigrationValidationError(MigrationError):
    """遷移驗證失敗"""
    
    def __init__(
        self,
        user_id: str,
        table: str,
        expected: int,
        actual: int
    ):
        super().__init__(
            message=f"數據驗證失敗: {table} 表記錄數不匹配",
            error_code="MIGRATION_VALIDATION_FAILED",
            details={
                "user_id": user_id,
                "table": table,
                "expected_count": expected,
                "actual_count": actual
            }
        )


class MigrationRollbackError(MigrationError):
    """遷移回滾錯誤"""
    
    def __init__(self, message: str, original_error: Optional[str] = None):
        super().__init__(
            message=message,
            error_code="MIGRATION_ROLLBACK_ERROR",
            details={"original_error": original_error}
        )


class BackupError(MigrationError):
    """備份錯誤"""
    
    def __init__(self, message: str, path: Optional[str] = None):
        super().__init__(
            message=message,
            error_code="BACKUP_ERROR",
            details={"path": path}
        )


class RestoreError(MigrationError):
    """恢復錯誤"""
    
    def __init__(self, message: str, backup_path: Optional[str] = None):
        super().__init__(
            message=message,
            error_code="RESTORE_ERROR",
            details={"backup_path": backup_path}
        )


# ============ 配額相關異常 ============

class QuotaExceededError(TenantError):
    """配額超限"""
    
    def __init__(
        self,
        quota_type: str,
        current: int,
        limit: int
    ):
        super().__init__(
            message=f"{quota_type} 配額已用完 ({current}/{limit})",
            error_code="QUOTA_EXCEEDED",
            details={
                "quota_type": quota_type,
                "current": current,
                "limit": limit
            }
        )


class FeatureNotAvailableError(TenantError):
    """功能不可用"""
    
    def __init__(self, feature: str, required_tier: str, current_tier: str):
        super().__init__(
            message=f"功能 {feature} 需要 {required_tier} 或更高訂閱等級",
            error_code="FEATURE_NOT_AVAILABLE",
            details={
                "feature": feature,
                "required_tier": required_tier,
                "current_tier": current_tier
            }
        )


# ============ 數據相關異常 ============

class DataIntegrityError(TenantError):
    """數據完整性錯誤"""
    
    def __init__(self, message: str, table: Optional[str] = None):
        super().__init__(
            message=message,
            error_code="DATA_INTEGRITY_ERROR",
            details={"table": table}
        )


class TableNotFoundError(TenantError):
    """表不存在"""
    
    def __init__(self, table_name: str):
        super().__init__(
            message=f"表不存在: {table_name}",
            error_code="TABLE_NOT_FOUND",
            details={"table": table_name}
        )


class InvalidTableCategoryError(TenantError):
    """無效的表分類"""
    
    def __init__(self, table_name: str, expected_category: str):
        super().__init__(
            message=f"表 {table_name} 的分類不正確，期望: {expected_category}",
            error_code="INVALID_TABLE_CATEGORY",
            details={
                "table": table_name,
                "expected_category": expected_category
            }
        )
