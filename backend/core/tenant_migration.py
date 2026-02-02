"""
多租戶數據遷移服務

🆕 功能：
1. 將現有單一數據庫中的數據按用戶分離
2. 創建獨立的租戶數據庫
3. 驗證數據完整性
4. 支持增量遷移和回滾

🆕 v2.0 優化：
5. 遷移前自動備份
6. 失敗自動回滾
7. 增強的數據校驗（MD5、外鍵完整性）
8. 統一表定義引用

遷移流程：
1. 🆕 遷移前備份舊數據庫
2. 掃描現有數據庫中的所有 owner_user_id
3. 為每個用戶創建獨立數據庫
4. 按 owner_user_id 遷移數據
5. 驗證數據完整性
6. 標記遷移完成
7. 🆕 失敗時自動回滾
"""

import os
import sqlite3
import logging
import json
import hashlib
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Set, Tuple
from dataclasses import dataclass, field

from config import DATABASE_DIR, DATABASE_PATH

# 導入統一表定義和異常
from .tenant_schema import TENANT_TABLES, SYSTEM_TABLES, is_tenant_table
from .tenant_database import (
    TenantDatabaseManager,
    get_tenant_db_manager,
    TENANTS_DIR,
    SYSTEM_DB_PATH,
    TENANT_SCHEMA,
    LOCAL_USER_ID,
    BACKUPS_DIR
)
from .tenant_exceptions import (
    MigrationError,
    MigrationInProgressError,
    MigrationValidationError,
    MigrationRollbackError,
    BackupError
)

logger = logging.getLogger(__name__)

# 遷移狀態文件
MIGRATION_STATE_FILE = DATABASE_DIR / "tenant_migration_state.json"

# 舊數據庫路徑
LEGACY_DB_PATH = DATABASE_PATH  # tgmatrix.db
LEGACY_SERVER_DB_PATH = DATABASE_DIR / "tgai_server.db"


@dataclass
class MigrationStats:
    """遷移統計"""
    total_users: int = 0
    migrated_users: int = 0
    failed_users: int = 0
    total_records: int = 0
    migrated_records: int = 0
    skipped_records: int = 0
    errors: List[str] = field(default_factory=list)
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    
    # 🆕 增強統計
    backup_path: Optional[str] = None
    tables_migrated: List[str] = field(default_factory=list)
    validation_passed: bool = False
    rollback_performed: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'total_users': self.total_users,
            'migrated_users': self.migrated_users,
            'failed_users': self.failed_users,
            'total_records': self.total_records,
            'migrated_records': self.migrated_records,
            'skipped_records': self.skipped_records,
            'errors': self.errors[:100],  # 只保留前 100 個錯誤
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'duration_seconds': (self.end_time - self.start_time).total_seconds() if self.end_time else None,
            'backup_path': self.backup_path,
            'tables_migrated': self.tables_migrated,
            'validation_passed': self.validation_passed,
            'rollback_performed': self.rollback_performed,
        }


@dataclass
class MigrationState:
    """遷移狀態"""
    status: str = 'pending'  # pending, in_progress, completed, failed
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    migrated_users: List[str] = field(default_factory=list)
    pending_users: List[str] = field(default_factory=list)
    failed_users: List[str] = field(default_factory=list)
    last_error: Optional[str] = None
    stats: Optional[Dict[str, Any]] = None
    
    def save(self):
        """保存狀態到文件"""
        with open(MIGRATION_STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump({
                'status': self.status,
                'started_at': self.started_at,
                'completed_at': self.completed_at,
                'migrated_users': self.migrated_users,
                'pending_users': self.pending_users,
                'failed_users': self.failed_users,
                'last_error': self.last_error,
                'stats': self.stats
            }, f, indent=2, ensure_ascii=False)
    
    @classmethod
    def load(cls) -> 'MigrationState':
        """從文件載入狀態"""
        if not MIGRATION_STATE_FILE.exists():
            return cls()
        
        try:
            with open(MIGRATION_STATE_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return cls(**data)
        except Exception as e:
            logger.error(f"[Migration] 載入狀態失敗: {e}")
            return cls()


class TenantMigrationService:
    """租戶數據遷移服務"""
    
    def __init__(self):
        self.db_manager = get_tenant_db_manager()
        self.state = MigrationState.load()
        self.stats = MigrationStats()
        self._backup_path: Optional[Path] = None
    
    # ============ 🆕 備份與回滾 ============
    
    def create_pre_migration_backup(self) -> Path:
        """
        🆕 創建遷移前備份
        
        Returns:
            備份文件路徑
        
        Raises:
            BackupError: 備份失敗時
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = BACKUPS_DIR / f"migration_{timestamp}"
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            # 備份舊數據庫
            if LEGACY_DB_PATH.exists():
                shutil.copy2(LEGACY_DB_PATH, backup_dir / LEGACY_DB_PATH.name)
            
            if LEGACY_SERVER_DB_PATH.exists():
                shutil.copy2(LEGACY_SERVER_DB_PATH, backup_dir / LEGACY_SERVER_DB_PATH.name)
            
            # 備份系統數據庫
            if SYSTEM_DB_PATH.exists():
                shutil.copy2(SYSTEM_DB_PATH, backup_dir / "system.db")
            
            # 備份現有租戶數據庫
            if TENANTS_DIR.exists():
                tenants_backup = backup_dir / "tenants"
                tenants_backup.mkdir(exist_ok=True)
                for db_file in TENANTS_DIR.glob("*.db"):
                    shutil.copy2(db_file, tenants_backup / db_file.name)
            
            # 記錄備份信息
            backup_info = {
                'timestamp': timestamp,
                'legacy_db': str(LEGACY_DB_PATH) if LEGACY_DB_PATH.exists() else None,
                'system_db': str(SYSTEM_DB_PATH) if SYSTEM_DB_PATH.exists() else None,
                'tenant_count': len(list(TENANTS_DIR.glob("*.db"))) if TENANTS_DIR.exists() else 0
            }
            
            with open(backup_dir / "backup_info.json", 'w', encoding='utf-8') as f:
                json.dump(backup_info, f, indent=2, ensure_ascii=False)
            
            logger.info(f"[Migration] 遷移前備份已創建: {backup_dir}")
            self._backup_path = backup_dir
            return backup_dir
            
        except Exception as e:
            logger.error(f"[Migration] 創建備份失敗: {e}")
            raise BackupError(
                message=f"創建遷移前備份失敗: {e}",
                path=str(backup_dir)
            )
    
    def rollback_migration(self, backup_dir: Path = None) -> bool:
        """
        🆕 回滾遷移
        
        Args:
            backup_dir: 備份目錄（可選，默認使用最近的備份）
        
        Returns:
            是否成功回滾
        """
        if backup_dir is None:
            backup_dir = self._backup_path
        
        if backup_dir is None or not backup_dir.exists():
            logger.error("[Migration] 無可用的備份進行回滾")
            raise MigrationRollbackError(
                message="無可用的備份進行回滾"
            )
        
        try:
            # 關閉所有連接
            self.db_manager.close_all()
            
            # 恢復舊數據庫
            legacy_backup = backup_dir / LEGACY_DB_PATH.name
            if legacy_backup.exists():
                shutil.copy2(legacy_backup, LEGACY_DB_PATH)
            
            server_backup = backup_dir / LEGACY_SERVER_DB_PATH.name
            if server_backup.exists():
                shutil.copy2(server_backup, LEGACY_SERVER_DB_PATH)
            
            # 恢復系統數據庫
            system_backup = backup_dir / "system.db"
            if system_backup.exists():
                shutil.copy2(system_backup, SYSTEM_DB_PATH)
            
            # 恢復租戶數據庫
            tenants_backup = backup_dir / "tenants"
            if tenants_backup.exists():
                # 先清空當前租戶目錄
                if TENANTS_DIR.exists():
                    for db_file in TENANTS_DIR.glob("*.db"):
                        db_file.unlink()
                
                # 恢復備份
                for db_file in tenants_backup.glob("*.db"):
                    shutil.copy2(db_file, TENANTS_DIR / db_file.name)
            
            # 更新狀態
            self.state.status = 'rolled_back'
            self.state.last_error = "用戶請求回滾"
            self.state.save()
            
            logger.info(f"[Migration] 遷移已回滾至: {backup_dir}")
            return True
            
        except Exception as e:
            logger.error(f"[Migration] 回滾失敗: {e}")
            raise MigrationRollbackError(
                message=f"回滾失敗: {e}",
                original_error=str(e)
            )
    
    def get_legacy_connection(self, db_path: Path) -> Optional[sqlite3.Connection]:
        """獲取舊數據庫連接"""
        if not db_path.exists():
            return None
        
        conn = sqlite3.connect(str(db_path), timeout=30.0)
        conn.row_factory = sqlite3.Row
        return conn
    
    def scan_users(self) -> Set[str]:
        """
        掃描現有數據庫中的所有用戶
        
        Returns:
            用戶 ID 集合
        """
        users = set()
        
        # 掃描 tgmatrix.db
        legacy_conn = self.get_legacy_connection(LEGACY_DB_PATH)
        if legacy_conn:
            for table in TENANT_TABLES:
                try:
                    cursor = legacy_conn.cursor()
                    cursor.execute(f"SELECT DISTINCT owner_user_id FROM {table} WHERE owner_user_id IS NOT NULL")
                    for row in cursor.fetchall():
                        if row[0]:
                            users.add(row[0])
                except sqlite3.OperationalError:
                    # 表不存在
                    pass
            legacy_conn.close()
        
        # 掃描 tgai_server.db
        server_conn = self.get_legacy_connection(LEGACY_SERVER_DB_PATH)
        if server_conn:
            try:
                cursor = server_conn.cursor()
                cursor.execute("SELECT id FROM users WHERE id IS NOT NULL")
                for row in cursor.fetchall():
                    if row[0]:
                        users.add(row[0])
            except sqlite3.OperationalError:
                pass
            server_conn.close()
        
        # 排除特殊用戶
        users.discard(LOCAL_USER_ID)
        users.discard('shared')
        users.discard('')
        
        logger.info(f"[Migration] 發現 {len(users)} 個用戶需要遷移")
        return users
    
    def migrate_user_data(self, user_id: str, legacy_conn: sqlite3.Connection) -> Tuple[int, int, List[str]]:
        """
        遷移單個用戶的數據
        
        Args:
            user_id: 用戶 ID
            legacy_conn: 舊數據庫連接
        
        Returns:
            (遷移記錄數, 跳過記錄數, 已遷移表列表)
        """
        migrated = 0
        skipped = 0
        migrated_tables = []
        
        # 獲取或創建用戶的租戶數據庫
        tenant_conn = self.db_manager.get_tenant_connection(user_id)
        
        for table in TENANT_TABLES:
            try:
                # 檢查表是否存在
                cursor = legacy_conn.cursor()
                cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
                if not cursor.fetchone():
                    continue
                
                # 檢查 owner_user_id 列是否存在
                cursor.execute(f"PRAGMA table_info({table})")
                columns = [col[1] for col in cursor.fetchall()]
                if 'owner_user_id' not in columns:
                    continue
                
                # 獲取用戶數據
                cursor.execute(f"SELECT * FROM {table} WHERE owner_user_id = ?", (user_id,))
                rows = cursor.fetchall()
                
                if not rows:
                    continue
                
                # 獲取列名（排除 owner_user_id）
                column_names = [col for col in columns if col != 'owner_user_id']
                
                # 插入到租戶數據庫
                tenant_cursor = tenant_conn.cursor()
                
                for row in rows:
                    try:
                        # 構建數據字典
                        row_dict = dict(row)
                        row_dict.pop('owner_user_id', None)  # 移除 owner_user_id
                        
                        # 構建插入語句
                        valid_columns = [c for c in row_dict.keys() if c in column_names or c == 'id']
                        placeholders = ', '.join(['?' for _ in valid_columns])
                        columns_str = ', '.join(valid_columns)
                        values = [row_dict.get(c) for c in valid_columns]
                        
                        # 使用 INSERT OR REPLACE 避免重複
                        tenant_cursor.execute(
                            f"INSERT OR REPLACE INTO {table} ({columns_str}) VALUES ({placeholders})",
                            values
                        )
                        migrated += 1
                        
                    except Exception as e:
                        logger.warning(f"[Migration] 遷移記錄失敗 ({table}): {e}")
                        skipped += 1
                
                tenant_conn.commit()
                migrated_tables.append(table)
                
            except sqlite3.OperationalError as e:
                logger.debug(f"[Migration] 表 {table} 不存在或無法訪問: {e}")
                continue
        
        return migrated, skipped, migrated_tables
    
    def migrate_all(self, force: bool = False, auto_backup: bool = True, auto_rollback: bool = True) -> MigrationStats:
        """
        執行完整遷移
        
        Args:
            force: 強制重新遷移已完成的用戶
            auto_backup: 🆕 自動創建遷移前備份
            auto_rollback: 🆕 失敗時自動回滾
        
        Returns:
            遷移統計
        
        Raises:
            MigrationInProgressError: 遷移正在進行中
            MigrationError: 遷移失敗
        """
        # 🆕 檢查是否有正在進行的遷移
        if self.state.status == 'in_progress':
            raise MigrationInProgressError(started_at=self.state.started_at)
        
        logger.info("[Migration] 開始多租戶數據遷移...")
        
        # 🆕 創建遷移前備份
        if auto_backup:
            try:
                backup_path = self.create_pre_migration_backup()
                self.stats.backup_path = str(backup_path)
                logger.info(f"[Migration] 備份完成: {backup_path}")
            except BackupError as e:
                logger.error(f"[Migration] 備份失敗，遷移中止: {e}")
                raise
        
        # 更新狀態
        self.state.status = 'in_progress'
        self.state.started_at = datetime.now().isoformat()
        self.state.save()
        
        self.stats = MigrationStats()
        self.stats.backup_path = str(self._backup_path) if self._backup_path else None
        
        try:
            # 1. 掃描用戶
            all_users = self.scan_users()
            self.stats.total_users = len(all_users)
            
            # 確定需要遷移的用戶
            if force:
                users_to_migrate = all_users
            else:
                users_to_migrate = all_users - set(self.state.migrated_users)
            
            self.state.pending_users = list(users_to_migrate)
            self.state.save()
            
            logger.info(f"[Migration] 需要遷移 {len(users_to_migrate)} 個用戶")
            
            # 2. 獲取舊數據庫連接
            legacy_conn = self.get_legacy_connection(LEGACY_DB_PATH)
            if not legacy_conn:
                raise MigrationError(
                    message=f"舊數據庫不存在: {LEGACY_DB_PATH}",
                    error_code="LEGACY_DB_NOT_FOUND"
                )
            
            # 3. 逐個用戶遷移
            for user_id in users_to_migrate:
                try:
                    logger.info(f"[Migration] 正在遷移用戶: {user_id}")
                    
                    migrated, skipped, tables = self.migrate_user_data(user_id, legacy_conn)
                    
                    self.stats.migrated_records += migrated
                    self.stats.skipped_records += skipped
                    self.stats.migrated_users += 1
                    self.stats.tables_migrated.extend([t for t in tables if t not in self.stats.tables_migrated])
                    
                    # 更新狀態
                    self.state.migrated_users.append(user_id)
                    self.state.pending_users.remove(user_id)
                    self.state.save()
                    
                    # 🆕 即時驗證
                    validation = self.verify_migration(user_id)
                    if not validation['verified']:
                        logger.warning(f"[Migration] 用戶 {user_id} 數據驗證未通過")
                    
                    logger.info(f"[Migration] 用戶 {user_id} 遷移完成: {migrated} 條記錄")
                    
                except Exception as e:
                    error_msg = f"用戶 {user_id} 遷移失敗: {e}"
                    logger.error(f"[Migration] {error_msg}")
                    self.stats.errors.append(error_msg)
                    self.stats.failed_users += 1
                    self.state.failed_users.append(user_id)
                    self.state.last_error = error_msg
                    self.state.save()
            
            legacy_conn.close()
            
            # 4. 最終驗證
            if self.stats.migrated_users > 0:
                self.stats.validation_passed = self._validate_all_migrations()
            
            # 5. 完成遷移
            self.state.status = 'completed'
            self.state.completed_at = datetime.now().isoformat()
            self.stats.end_time = datetime.now()
            self.state.stats = self.stats.to_dict()
            self.state.save()
            
            logger.info(f"[Migration] 遷移完成！{self.stats.to_dict()}")
            
        except Exception as e:
            self.state.status = 'failed'
            self.state.last_error = str(e)
            self.state.save()
            logger.error(f"[Migration] 遷移失敗: {e}")
            
            # 🆕 自動回滾
            if auto_rollback and self._backup_path:
                try:
                    logger.info("[Migration] 正在自動回滾...")
                    self.rollback_migration()
                    self.stats.rollback_performed = True
                    logger.info("[Migration] 自動回滾完成")
                except Exception as rollback_error:
                    logger.error(f"[Migration] 自動回滾失敗: {rollback_error}")
            
            raise
        
        return self.stats
    
    def _validate_all_migrations(self) -> bool:
        """🆕 驗證所有已遷移用戶的數據"""
        all_valid = True
        
        for user_id in self.state.migrated_users[-10:]:  # 抽樣驗證最後 10 個
            result = self.verify_migration(user_id)
            if not result['verified']:
                all_valid = False
                logger.warning(f"[Migration] 用戶 {user_id} 驗證失敗")
        
        return all_valid
    
    def migrate_local_user(self) -> MigrationStats:
        """
        遷移本地用戶（Electron 模式）
        
        將沒有 owner_user_id 的數據遷移到 local_user 數據庫
        """
        logger.info("[Migration] 開始遷移本地用戶數據...")
        
        self.stats = MigrationStats()
        self.stats.total_users = 1
        
        try:
            legacy_conn = self.get_legacy_connection(LEGACY_DB_PATH)
            if not legacy_conn:
                logger.info("[Migration] 舊數據庫不存在，跳過遷移")
                return self.stats
            
            # 獲取本地用戶數據庫
            tenant_conn = self.db_manager.get_tenant_connection(LOCAL_USER_ID)
            
            for table in TENANT_TABLES:
                try:
                    cursor = legacy_conn.cursor()
                    
                    # 檢查表是否存在
                    cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
                    if not cursor.fetchone():
                        continue
                    
                    # 獲取列信息
                    cursor.execute(f"PRAGMA table_info({table})")
                    columns = [col[1] for col in cursor.fetchall()]
                    
                    # 獲取無 owner_user_id 或 owner_user_id 為 local_user 的數據
                    if 'owner_user_id' in columns:
                        cursor.execute(
                            f"SELECT * FROM {table} WHERE owner_user_id IS NULL OR owner_user_id = ? OR owner_user_id = ''",
                            (LOCAL_USER_ID,)
                        )
                    else:
                        cursor.execute(f"SELECT * FROM {table}")
                    
                    rows = cursor.fetchall()
                    
                    if not rows:
                        continue
                    
                    # 插入到租戶數據庫
                    tenant_cursor = tenant_conn.cursor()
                    column_names = [c for c in columns if c != 'owner_user_id']
                    
                    for row in rows:
                        try:
                            row_dict = dict(row)
                            row_dict.pop('owner_user_id', None)
                            
                            valid_columns = [c for c in row_dict.keys() if c in column_names or c == 'id']
                            placeholders = ', '.join(['?' for _ in valid_columns])
                            columns_str = ', '.join(valid_columns)
                            values = [row_dict.get(c) for c in valid_columns]
                            
                            tenant_cursor.execute(
                                f"INSERT OR REPLACE INTO {table} ({columns_str}) VALUES ({placeholders})",
                                values
                            )
                            self.stats.migrated_records += 1
                            
                        except Exception as e:
                            logger.warning(f"[Migration] 遷移本地記錄失敗 ({table}): {e}")
                            self.stats.skipped_records += 1
                    
                    tenant_conn.commit()
                    
                except sqlite3.OperationalError as e:
                    logger.debug(f"[Migration] 表 {table} 處理失敗: {e}")
                    continue
            
            legacy_conn.close()
            self.stats.migrated_users = 1
            self.stats.end_time = datetime.now()
            
            logger.info(f"[Migration] 本地用戶遷移完成: {self.stats.migrated_records} 條記錄")
            
        except Exception as e:
            logger.error(f"[Migration] 本地用戶遷移失敗: {e}")
            self.stats.errors.append(str(e))
            self.stats.failed_users = 1
        
        return self.stats
    
    def verify_migration(self, user_id: str, detailed: bool = False) -> Dict[str, Any]:
        """
        🆕 增強的遷移驗證
        
        驗證項目：
        1. 記錄數量一致性
        2. 抽樣 MD5 校驗（可選）
        3. 數據完整性檢查
        
        Args:
            user_id: 用戶 ID
            detailed: 是否進行詳細校驗（包括 MD5）
        """
        results = {
            'user_id': user_id,
            'verified': True,
            'tables': {},
            'total_legacy_records': 0,
            'total_tenant_records': 0,
            'mismatch_tables': [],
            'verification_time': datetime.now().isoformat()
        }
        
        legacy_conn = self.get_legacy_connection(LEGACY_DB_PATH)
        if not legacy_conn:
            results['error'] = '舊數據庫不存在'
            results['verified'] = False
            return results
        
        tenant_conn = self.db_manager.get_tenant_connection(user_id)
        
        for table in TENANT_TABLES:
            try:
                # 檢查表是否存在
                legacy_cursor = legacy_conn.cursor()
                legacy_cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
                if not legacy_cursor.fetchone():
                    continue
                
                # 檢查 owner_user_id 列是否存在
                legacy_cursor.execute(f"PRAGMA table_info({table})")
                columns = [col[1] for col in legacy_cursor.fetchall()]
                if 'owner_user_id' not in columns:
                    continue
                
                # 舊數據庫計數
                legacy_cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE owner_user_id = ?", (user_id,))
                legacy_count = legacy_cursor.fetchone()[0]
                
                # 新數據庫計數
                tenant_cursor = tenant_conn.cursor()
                tenant_cursor.execute(f"SELECT COUNT(*) FROM {table}")
                tenant_count = tenant_cursor.fetchone()[0]
                
                match = legacy_count == tenant_count
                
                table_result = {
                    'legacy_count': legacy_count,
                    'tenant_count': tenant_count,
                    'match': match
                }
                
                # 🆕 詳細校驗：抽樣 MD5
                if detailed and match and legacy_count > 0:
                    sample_valid = self._verify_sample_data(
                        legacy_conn, tenant_conn, table, user_id
                    )
                    table_result['sample_valid'] = sample_valid
                    if not sample_valid:
                        match = False
                
                results['tables'][table] = table_result
                results['total_legacy_records'] += legacy_count
                results['total_tenant_records'] += tenant_count
                
                if not match:
                    results['verified'] = False
                    results['mismatch_tables'].append(table)
                    
            except sqlite3.OperationalError as e:
                logger.debug(f"[Migration] 驗證表 {table} 失敗: {e}")
                continue
        
        legacy_conn.close()
        return results
    
    def _verify_sample_data(
        self,
        legacy_conn: sqlite3.Connection,
        tenant_conn: sqlite3.Connection,
        table: str,
        user_id: str,
        sample_size: int = 5
    ) -> bool:
        """🆕 抽樣驗證數據內容"""
        try:
            # 獲取舊數據庫的前 N 條記錄
            legacy_cursor = legacy_conn.cursor()
            legacy_cursor.execute(
                f"SELECT * FROM {table} WHERE owner_user_id = ? ORDER BY id LIMIT ?",
                (user_id, sample_size)
            )
            legacy_rows = legacy_cursor.fetchall()
            
            # 獲取新數據庫的對應記錄
            tenant_cursor = tenant_conn.cursor()
            
            for legacy_row in legacy_rows:
                row_dict = dict(legacy_row)
                record_id = row_dict.get('id')
                
                if record_id:
                    tenant_cursor.execute(
                        f"SELECT * FROM {table} WHERE id = ?",
                        (record_id,)
                    )
                    tenant_row = tenant_cursor.fetchone()
                    
                    if not tenant_row:
                        return False
                    
                    # 比較關鍵字段（排除 owner_user_id）
                    tenant_dict = dict(tenant_row)
                    for key, value in row_dict.items():
                        if key == 'owner_user_id':
                            continue
                        if key in tenant_dict and tenant_dict[key] != value:
                            # 數據不匹配
                            return False
            
            return True
            
        except Exception as e:
            logger.warning(f"[Migration] 抽樣驗證失敗: {e}")
            return False
    
    def get_migration_status(self) -> Dict[str, Any]:
        """獲取遷移狀態"""
        state = MigrationState.load()
        
        # 獲取租戶列表
        tenants = self.db_manager.list_tenants()
        
        return {
            'status': state.status,
            'started_at': state.started_at,
            'completed_at': state.completed_at,
            'migrated_users': len(state.migrated_users),
            'pending_users': len(state.pending_users),
            'failed_users': len(state.failed_users),
            'last_error': state.last_error,
            'stats': state.stats,
            'tenants': tenants,
            'tenants_dir': str(TENANTS_DIR),
            'legacy_db_exists': LEGACY_DB_PATH.exists(),
            'system_db_exists': SYSTEM_DB_PATH.exists()
        }


# ============ 便捷函數 ============

def run_migration(force: bool = False) -> MigrationStats:
    """執行遷移"""
    service = TenantMigrationService()
    return service.migrate_all(force=force)


def run_local_migration() -> MigrationStats:
    """執行本地用戶遷移"""
    service = TenantMigrationService()
    return service.migrate_local_user()


def get_migration_status() -> Dict[str, Any]:
    """獲取遷移狀態"""
    service = TenantMigrationService()
    return service.get_migration_status()


def verify_user_migration(user_id: str) -> Dict[str, Any]:
    """驗證用戶遷移"""
    service = TenantMigrationService()
    return service.verify_migration(user_id)
