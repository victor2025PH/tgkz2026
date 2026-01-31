"""
TG-Matrix 自動備份服務
Phase A: Database 備份系統

功能：
1. 自動定時備份
2. 備份驗證
3. 備份清理
4. 恢復功能
"""

import os
import shutil
import hashlib
import json
import asyncio
import aiosqlite
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from dataclasses import dataclass, field
from enum import Enum
import gzip
import tempfile

from .logging import get_logger

logger = get_logger("backup_service")


class BackupType(Enum):
    """備份類型"""
    FULL = "full"          # 完整備份
    INCREMENTAL = "incremental"  # 增量備份（WAL）


class BackupStatus(Enum):
    """備份狀態"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    VERIFIED = "verified"


@dataclass
class BackupRecord:
    """備份記錄"""
    id: str
    backup_type: BackupType
    status: BackupStatus
    created_at: datetime
    completed_at: Optional[datetime] = None
    file_path: Optional[str] = None
    file_size: int = 0
    checksum: Optional[str] = None
    source_db: str = ""
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "backup_type": self.backup_type.value,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "file_path": self.file_path,
            "file_size": self.file_size,
            "checksum": self.checksum,
            "source_db": self.source_db,
            "error_message": self.error_message,
            "metadata": self.metadata
        }


@dataclass
class BackupConfig:
    """備份配置"""
    backup_dir: str = "backups"
    # 完整備份：每日
    full_backup_interval_hours: int = 24
    # 保留完整備份天數
    full_backup_retention_days: int = 30
    # WAL 備份間隔：4 小時
    wal_backup_interval_hours: int = 4
    # WAL 備份保留天數
    wal_backup_retention_days: int = 7
    # 是否壓縮備份
    compress: bool = True
    # 是否驗證備份
    verify_backup: bool = True
    # 最大備份大小 MB（超過則警告）
    max_backup_size_mb: int = 500


class BackupService:
    """備份服務"""
    
    def __init__(
        self,
        db_paths: List[str],
        config: Optional[BackupConfig] = None
    ):
        """
        初始化備份服務
        
        Args:
            db_paths: 要備份的數據庫文件路徑列表
            config: 備份配置
        """
        self.db_paths = db_paths
        self.config = config or BackupConfig()
        self.backup_dir = Path(self.config.backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # 備份記錄
        self.records: List[BackupRecord] = []
        self._records_file = self.backup_dir / "backup_records.json"
        self._load_records()
        
        # 後台任務
        self._scheduler_task: Optional[asyncio.Task] = None
        self._running = False
    
    def _load_records(self):
        """加載備份記錄"""
        if self._records_file.exists():
            try:
                with open(self._records_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for item in data:
                        record = BackupRecord(
                            id=item['id'],
                            backup_type=BackupType(item['backup_type']),
                            status=BackupStatus(item['status']),
                            created_at=datetime.fromisoformat(item['created_at']),
                            completed_at=datetime.fromisoformat(item['completed_at']) if item.get('completed_at') else None,
                            file_path=item.get('file_path'),
                            file_size=item.get('file_size', 0),
                            checksum=item.get('checksum'),
                            source_db=item.get('source_db', ''),
                            error_message=item.get('error_message'),
                            metadata=item.get('metadata', {})
                        )
                        self.records.append(record)
            except Exception as e:
                logger.error(f"Failed to load backup records: {e}")
    
    def _save_records(self):
        """保存備份記錄"""
        try:
            data = [r.to_dict() for r in self.records[-1000:]]  # 只保留最近 1000 條
            with open(self._records_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Failed to save backup records: {e}")
    
    def _generate_backup_id(self) -> str:
        """生成備份 ID"""
        return datetime.now().strftime("%Y%m%d_%H%M%S")
    
    def _calculate_checksum(self, file_path: str) -> str:
        """計算文件 MD5 校驗和"""
        md5 = hashlib.md5()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                md5.update(chunk)
        return md5.hexdigest()
    
    async def create_backup(
        self,
        backup_type: BackupType = BackupType.FULL,
        db_path: Optional[str] = None
    ) -> BackupRecord:
        """
        創建備份
        
        Args:
            backup_type: 備份類型
            db_path: 指定數據庫路徑，None 則備份所有
        
        Returns:
            BackupRecord: 備份記錄
        """
        backup_id = self._generate_backup_id()
        
        # 要備份的數據庫
        dbs_to_backup = [db_path] if db_path else self.db_paths
        
        for db in dbs_to_backup:
            record = BackupRecord(
                id=f"{backup_id}_{Path(db).stem}",
                backup_type=backup_type,
                status=BackupStatus.IN_PROGRESS,
                created_at=datetime.now(),
                source_db=db
            )
            self.records.append(record)
            
            try:
                if backup_type == BackupType.FULL:
                    await self._create_full_backup(record, db)
                else:
                    await self._create_wal_backup(record, db)
                
                record.status = BackupStatus.COMPLETED
                record.completed_at = datetime.now()
                
                # 驗證備份
                if self.config.verify_backup:
                    verified = await self._verify_backup(record)
                    if verified:
                        record.status = BackupStatus.VERIFIED
                    else:
                        record.status = BackupStatus.FAILED
                        record.error_message = "Backup verification failed"
                
                logger.info(f"Backup completed: {record.id}, size: {record.file_size} bytes")
                
            except Exception as e:
                record.status = BackupStatus.FAILED
                record.error_message = str(e)
                record.completed_at = datetime.now()
                logger.error(f"Backup failed: {record.id}, error: {e}")
            
            self._save_records()
        
        return record
    
    async def _create_full_backup(self, record: BackupRecord, db_path: str):
        """創建完整備份"""
        db_name = Path(db_path).stem
        timestamp = record.created_at.strftime("%Y%m%d_%H%M%S")
        
        # 備份文件路徑
        if self.config.compress:
            backup_filename = f"{db_name}_{timestamp}.db.gz"
        else:
            backup_filename = f"{db_name}_{timestamp}.db"
        
        backup_path = self.backup_dir / "full" / backup_filename
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 使用 SQLite 的備份 API
        async with aiosqlite.connect(db_path) as source_db:
            # 獲取數據庫信息
            async with source_db.execute("PRAGMA page_count") as cursor:
                page_count = (await cursor.fetchone())[0]
            async with source_db.execute("PRAGMA page_size") as cursor:
                page_size = (await cursor.fetchone())[0]
            
            record.metadata["page_count"] = page_count
            record.metadata["page_size"] = page_size
            record.metadata["estimated_size"] = page_count * page_size
            
            # 創建臨時備份
            temp_backup = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
            temp_backup.close()
            
            try:
                # 使用 VACUUM INTO 創建備份（SQLite 3.27+）
                try:
                    await source_db.execute(f"VACUUM INTO '{temp_backup.name}'")
                except Exception:
                    # 回退到傳統複製方式
                    shutil.copy2(db_path, temp_backup.name)
                
                # 壓縮（如果啟用）
                if self.config.compress:
                    with open(temp_backup.name, 'rb') as f_in:
                        with gzip.open(str(backup_path), 'wb') as f_out:
                            shutil.copyfileobj(f_in, f_out)
                else:
                    shutil.copy2(temp_backup.name, str(backup_path))
                
            finally:
                # 清理臨時文件
                if os.path.exists(temp_backup.name):
                    os.unlink(temp_backup.name)
        
        # 記錄備份信息
        record.file_path = str(backup_path)
        record.file_size = os.path.getsize(backup_path)
        record.checksum = self._calculate_checksum(str(backup_path))
        
        # 檢查備份大小
        size_mb = record.file_size / (1024 * 1024)
        if size_mb > self.config.max_backup_size_mb:
            logger.warning(f"Backup size ({size_mb:.2f} MB) exceeds limit ({self.config.max_backup_size_mb} MB)")
    
    async def _create_wal_backup(self, record: BackupRecord, db_path: str):
        """創建 WAL 備份"""
        db_name = Path(db_path).stem
        wal_path = f"{db_path}-wal"
        
        if not os.path.exists(wal_path):
            record.error_message = "No WAL file found"
            record.status = BackupStatus.COMPLETED
            record.metadata["no_wal"] = True
            return
        
        timestamp = record.created_at.strftime("%Y%m%d_%H%M%S")
        backup_filename = f"{db_name}_wal_{timestamp}.gz"
        backup_path = self.backup_dir / "wal" / backup_filename
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 壓縮 WAL 文件
        with open(wal_path, 'rb') as f_in:
            with gzip.open(str(backup_path), 'wb') as f_out:
                shutil.copyfileobj(f_in, f_out)
        
        record.file_path = str(backup_path)
        record.file_size = os.path.getsize(backup_path)
        record.checksum = self._calculate_checksum(str(backup_path))
    
    async def _verify_backup(self, record: BackupRecord) -> bool:
        """驗證備份完整性"""
        if not record.file_path or not os.path.exists(record.file_path):
            return False
        
        # 驗證校驗和
        current_checksum = self._calculate_checksum(record.file_path)
        if current_checksum != record.checksum:
            logger.error(f"Checksum mismatch for {record.id}")
            return False
        
        # 如果是完整備份，嘗試打開驗證
        if record.backup_type == BackupType.FULL:
            try:
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
                temp_file.close()
                
                try:
                    # 解壓（如果需要）
                    if record.file_path.endswith('.gz'):
                        with gzip.open(record.file_path, 'rb') as f_in:
                            with open(temp_file.name, 'wb') as f_out:
                                shutil.copyfileobj(f_in, f_out)
                    else:
                        shutil.copy2(record.file_path, temp_file.name)
                    
                    # 嘗試打開數據庫
                    async with aiosqlite.connect(temp_file.name) as db:
                        # 執行完整性檢查
                        async with db.execute("PRAGMA integrity_check") as cursor:
                            result = await cursor.fetchone()
                            if result[0] != 'ok':
                                logger.error(f"Integrity check failed: {result[0]}")
                                return False
                        
                        # 獲取表數量
                        async with db.execute(
                            "SELECT COUNT(*) FROM sqlite_master WHERE type='table'"
                        ) as cursor:
                            table_count = (await cursor.fetchone())[0]
                            record.metadata["table_count"] = table_count
                    
                    return True
                    
                finally:
                    if os.path.exists(temp_file.name):
                        os.unlink(temp_file.name)
                        
            except Exception as e:
                logger.error(f"Backup verification failed: {e}")
                return False
        
        return True
    
    async def cleanup_old_backups(self):
        """清理過期備份"""
        now = datetime.now()
        
        # 清理完整備份
        full_cutoff = now - timedelta(days=self.config.full_backup_retention_days)
        full_dir = self.backup_dir / "full"
        if full_dir.exists():
            for file in full_dir.iterdir():
                if file.stat().st_mtime < full_cutoff.timestamp():
                    try:
                        file.unlink()
                        logger.info(f"Deleted old full backup: {file.name}")
                    except Exception as e:
                        logger.error(f"Failed to delete backup {file.name}: {e}")
        
        # 清理 WAL 備份
        wal_cutoff = now - timedelta(days=self.config.wal_backup_retention_days)
        wal_dir = self.backup_dir / "wal"
        if wal_dir.exists():
            for file in wal_dir.iterdir():
                if file.stat().st_mtime < wal_cutoff.timestamp():
                    try:
                        file.unlink()
                        logger.info(f"Deleted old WAL backup: {file.name}")
                    except Exception as e:
                        logger.error(f"Failed to delete backup {file.name}: {e}")
        
        # 清理記錄
        self.records = [
            r for r in self.records
            if r.created_at > full_cutoff or r.status == BackupStatus.VERIFIED
        ]
        self._save_records()
    
    async def restore_backup(
        self,
        backup_id: str,
        target_path: str
    ) -> Tuple[bool, str]:
        """
        恢復備份
        
        Args:
            backup_id: 備份 ID
            target_path: 恢復目標路徑
        
        Returns:
            (是否成功, 消息)
        """
        # 查找備份記錄
        record = next((r for r in self.records if r.id == backup_id), None)
        if not record:
            return False, f"Backup not found: {backup_id}"
        
        if not record.file_path or not os.path.exists(record.file_path):
            return False, f"Backup file not found: {record.file_path}"
        
        try:
            # 創建目標目錄
            Path(target_path).parent.mkdir(parents=True, exist_ok=True)
            
            # 解壓（如果需要）
            if record.file_path.endswith('.gz'):
                with gzip.open(record.file_path, 'rb') as f_in:
                    with open(target_path, 'wb') as f_out:
                        shutil.copyfileobj(f_in, f_out)
            else:
                shutil.copy2(record.file_path, target_path)
            
            # 驗證恢復的數據庫
            async with aiosqlite.connect(target_path) as db:
                async with db.execute("PRAGMA integrity_check") as cursor:
                    result = await cursor.fetchone()
                    if result[0] != 'ok':
                        return False, f"Restored database integrity check failed: {result[0]}"
            
            logger.info(f"Backup restored: {backup_id} -> {target_path}")
            return True, f"Backup restored successfully to {target_path}"
            
        except Exception as e:
            logger.error(f"Restore failed: {e}")
            return False, f"Restore failed: {str(e)}"
    
    def get_backup_status(self) -> Dict[str, Any]:
        """獲取備份狀態"""
        now = datetime.now()
        
        # 最近的完整備份
        full_backups = [
            r for r in self.records
            if r.backup_type == BackupType.FULL and r.status in (BackupStatus.COMPLETED, BackupStatus.VERIFIED)
        ]
        last_full = full_backups[-1] if full_backups else None
        
        # 最近的 WAL 備份
        wal_backups = [
            r for r in self.records
            if r.backup_type == BackupType.INCREMENTAL and r.status in (BackupStatus.COMPLETED, BackupStatus.VERIFIED)
        ]
        last_wal = wal_backups[-1] if wal_backups else None
        
        # 計算備份總大小
        total_size = sum(r.file_size for r in self.records if r.file_path and os.path.exists(r.file_path))
        
        return {
            "last_full_backup": last_full.to_dict() if last_full else None,
            "last_wal_backup": last_wal.to_dict() if last_wal else None,
            "total_backups": len(self.records),
            "verified_backups": len([r for r in self.records if r.status == BackupStatus.VERIFIED]),
            "failed_backups": len([r for r in self.records if r.status == BackupStatus.FAILED]),
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "backup_dir": str(self.backup_dir),
            "config": {
                "full_interval_hours": self.config.full_backup_interval_hours,
                "full_retention_days": self.config.full_backup_retention_days,
                "wal_interval_hours": self.config.wal_backup_interval_hours,
                "wal_retention_days": self.config.wal_backup_retention_days,
                "compress": self.config.compress,
                "verify": self.config.verify_backup
            }
        }
    
    async def start_scheduler(self):
        """啟動備份調度器"""
        if self._running:
            return
        
        self._running = True
        self._scheduler_task = asyncio.create_task(self._run_scheduler())
        logger.info("Backup scheduler started")
    
    async def stop_scheduler(self):
        """停止備份調度器"""
        self._running = False
        if self._scheduler_task:
            self._scheduler_task.cancel()
            try:
                await self._scheduler_task
            except asyncio.CancelledError:
                pass
        logger.info("Backup scheduler stopped")
    
    async def _run_scheduler(self):
        """運行備份調度"""
        last_full_backup = datetime.now() - timedelta(hours=self.config.full_backup_interval_hours)
        last_wal_backup = datetime.now() - timedelta(hours=self.config.wal_backup_interval_hours)
        
        # 檢查是否有最近的備份
        for record in reversed(self.records):
            if record.backup_type == BackupType.FULL and record.status in (BackupStatus.COMPLETED, BackupStatus.VERIFIED):
                last_full_backup = record.created_at
                break
        
        for record in reversed(self.records):
            if record.backup_type == BackupType.INCREMENTAL and record.status in (BackupStatus.COMPLETED, BackupStatus.VERIFIED):
                last_wal_backup = record.created_at
                break
        
        while self._running:
            try:
                now = datetime.now()
                
                # 檢查是否需要完整備份
                if (now - last_full_backup).total_seconds() >= self.config.full_backup_interval_hours * 3600:
                    logger.info("Starting scheduled full backup...")
                    await self.create_backup(BackupType.FULL)
                    last_full_backup = now
                    
                    # 清理舊備份
                    await self.cleanup_old_backups()
                
                # 檢查是否需要 WAL 備份
                if (now - last_wal_backup).total_seconds() >= self.config.wal_backup_interval_hours * 3600:
                    logger.info("Starting scheduled WAL backup...")
                    await self.create_backup(BackupType.INCREMENTAL)
                    last_wal_backup = now
                
                # 每分鐘檢查一次
                await asyncio.sleep(60)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Backup scheduler error: {e}")
                await asyncio.sleep(300)  # 錯誤後等待 5 分鐘


# 全局實例
_backup_service: Optional[BackupService] = None


def init_backup_service(
    db_paths: List[str],
    config: Optional[BackupConfig] = None
) -> BackupService:
    """初始化備份服務"""
    global _backup_service
    _backup_service = BackupService(db_paths, config)
    return _backup_service


def get_backup_service() -> Optional[BackupService]:
    """獲取備份服務實例"""
    return _backup_service


__all__ = [
    'BackupType',
    'BackupStatus',
    'BackupRecord',
    'BackupConfig',
    'BackupService',
    'init_backup_service',
    'get_backup_service'
]
