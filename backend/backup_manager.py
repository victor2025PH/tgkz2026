"""
Backup Manager
數據備份管理器 - 自動定期備份和恢復
"""
import shutil
import asyncio
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any, Callable
import json


# 全局備份管理器實例（用於兼容舊代碼）
_backup_manager: Optional['BackupManager'] = None


class BackupManager:
    """數據備份管理器"""
    
    def __init__(self, db_path: Path, backup_dir: Path, log_callback: Optional[callable] = None):
        """
        初始化備份管理器
        
        Args:
            db_path: 數據庫文件路徑
            backup_dir: 備份目錄路徑
            log_callback: 日誌回調函數
        """
        self.db_path = db_path
        self.backup_dir = backup_dir
        self.log_callback = log_callback
        self.backup_task: Optional[asyncio.Task] = None
        self._ensure_backup_dir()
    
    def _ensure_backup_dir(self):
        """確保備份目錄存在"""
        self.backup_dir.mkdir(parents=True, exist_ok=True)
    
    def log(self, message: str, level: str = "info"):
        """記錄日誌"""
        if self.log_callback:
            self.log_callback(message, level)
        else:
            print(f"[BackupManager] [{level}] {message}", file=sys.stderr)
    
    async def create_backup(
        self, 
        backup_type: str = 'full',
        compress: bool = True
    ) -> Path:
        """
        創建備份
        
        Args:
            backup_type: 備份類型（'full', 'incremental', 'scheduled'）
            compress: 是否壓縮備份
            
        Returns:
            備份文件路徑
        """
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f"backup_{backup_type}_{timestamp}.db"
        backup_path = self.backup_dir / backup_filename
        
        try:
            self.log(f"開始創建備份: {backup_type}")
            
            # 複製數據庫文件
            if not self.db_path.exists():
                self.log(f"數據庫文件不存在: {self.db_path}", "error")
                raise FileNotFoundError(f"Database file not found: {self.db_path}")
            
            shutil.copy2(self.db_path, backup_path)
            self.log(f"數據庫文件已複製: {backup_path}")
            
            # 壓縮備份（可選）
            if compress:
                archive_path = backup_path.with_suffix('.zip')
                shutil.make_archive(
                    str(backup_path.with_suffix('')),
                    'zip',
                    self.backup_dir,
                    backup_filename
                )
                # 刪除未壓縮文件
                backup_path.unlink()
                backup_path = archive_path
                self.log(f"備份已壓縮: {backup_path}")
            
            # 創建備份元數據
            metadata = {
                'backup_type': backup_type,
                'timestamp': timestamp,
                'datetime': datetime.now().isoformat(),
                'db_path': str(self.db_path),
                'backup_path': str(backup_path),
                'file_size': backup_path.stat().st_size,
                'compressed': compress
            }
            
            metadata_path = backup_path.with_suffix('.json')
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)
            
            self.log(f"✓ 備份創建成功: {backup_path} ({backup_path.stat().st_size / 1024 / 1024:.2f} MB)", "success")
            
            # 清理舊備份（保留最近30天）
            await self.cleanup_old_backups(days=30)
            
            return backup_path
            
        except Exception as e:
            self.log(f"✗ 備份創建失敗: {str(e)}", "error")
            raise
    
    async def restore_backup(self, backup_path: Path, create_pre_restore_backup: bool = True) -> bool:
        """
        恢復備份
        
        Args:
            backup_path: 備份文件路徑
            create_pre_restore_backup: 是否在恢復前創建當前備份
            
        Returns:
            是否成功恢復
        """
        try:
            self.log(f"開始恢復備份: {backup_path}")
            
            # 檢查備份文件是否存在
            if not backup_path.exists():
                self.log(f"備份文件不存在: {backup_path}", "error")
                return False
            
            # 恢復前先備份當前數據庫
            current_backup = None
            if create_pre_restore_backup:
                try:
                    current_backup = await self.create_backup('pre_restore')
                    self.log(f"已創建恢復前備份: {current_backup}")
                except Exception as e:
                    self.log(f"創建恢復前備份失敗: {str(e)}", "warning")
            
            # 如果是壓縮文件，先解壓
            db_backup_path = backup_path
            if backup_path.suffix == '.zip':
                # 解壓到臨時目錄
                temp_dir = self.backup_dir / 'temp_restore'
                temp_dir.mkdir(exist_ok=True)
                
                shutil.unpack_archive(backup_path, temp_dir)
                
                # 找到 .db 文件
                db_files = list(temp_dir.glob('*.db'))
                if not db_files:
                    self.log("壓縮文件中未找到數據庫文件", "error")
                    return False
                
                db_backup_path = db_files[0]
            
            # 恢復數據庫文件
            shutil.copy2(db_backup_path, self.db_path)
            self.log(f"✓ 備份已恢復: {self.db_path}", "success")
            
            # 清理臨時文件
            if backup_path.suffix == '.zip' and temp_dir.exists():
                shutil.rmtree(temp_dir)
            
            return True
            
        except Exception as e:
            self.log(f"✗ 備份恢復失敗: {str(e)}", "error")
            
            # 如果失敗，嘗試恢復當前備份
            if current_backup:
                try:
                    self.log("嘗試恢復恢復前的備份...", "warning")
                    await self.restore_backup(current_backup, create_pre_restore_backup=False)
                except:
                    pass
            
            return False
    
    async def cleanup_old_backups(self, days: int = 30):
        """
        清理舊備份（保留最近 N 天）
        
        Args:
            days: 保留天數
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            deleted_count = 0
            total_size_freed = 0
            
            # 查找所有備份文件
            backup_files = list(self.backup_dir.glob('backup_*.db')) + list(self.backup_dir.glob('backup_*.zip'))
            
            for backup_file in backup_files:
                # 獲取文件修改時間
                file_time = datetime.fromtimestamp(backup_file.stat().st_mtime)
                
                if file_time < cutoff_date:
                    file_size = backup_file.stat().st_size
                    backup_file.unlink()
                    
                    # 也刪除對應的元數據文件
                    metadata_file = backup_file.with_suffix('.json')
                    if metadata_file.exists():
                        metadata_file.unlink()
                    
                    deleted_count += 1
                    total_size_freed += file_size
            
            if deleted_count > 0:
                self.log(f"已清理 {deleted_count} 個舊備份，釋放空間 {total_size_freed / 1024 / 1024:.2f} MB", "info")
            
        except Exception as e:
            self.log(f"清理舊備份時發生錯誤: {str(e)}", "error")
    
    async def list_backups(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        列出所有備份
        
        Args:
            limit: 返回數量限制
            
        Returns:
            備份列表
        """
        backups = []
        
        # 查找所有備份文件
        backup_files = list(self.backup_dir.glob('backup_*.db')) + list(self.backup_dir.glob('backup_*.zip'))
        
        for backup_file in backup_files:
            try:
                # 讀取元數據
                metadata_file = backup_file.with_suffix('.json')
                metadata = {}
                if metadata_file.exists():
                    with open(metadata_file, 'r', encoding='utf-8') as f:
                        metadata = json.load(f)
                
                file_stat = backup_file.stat()
                backups.append({
                    'path': str(backup_file),
                    'filename': backup_file.name,
                    'size': file_stat.st_size,
                    'modified': datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
                    'type': metadata.get('backup_type', 'unknown'),
                    'compressed': backup_file.suffix == '.zip',
                    **metadata
                })
            except Exception as e:
                self.log(f"讀取備份信息失敗: {backup_file} - {str(e)}", "warning")
        
        # 按修改時間排序（最新的在前）
        backups.sort(key=lambda x: x['modified'], reverse=True)
        
        return backups[:limit]
    
    async def schedule_backups(
        self, 
        interval_hours: int = 24,
        backup_type: str = 'scheduled'
    ):
        """
        定期備份任務
        
        Args:
            interval_hours: 備份間隔（小時）
            backup_type: 備份類型
        """
        while True:
            try:
                await asyncio.sleep(interval_hours * 3600)
                await self.create_backup(backup_type=backup_type)
            except asyncio.CancelledError:
                self.log("定期備份任務已取消")
                break
            except Exception as e:
                self.log(f"定期備份失敗: {str(e)}", "error")
                # 繼續執行，不中斷任務
                await asyncio.sleep(60)  # 等待1分鐘後繼續
    
    async def start_scheduled_backups(self, interval_hours: int = 24):
        """啟動定期備份任務"""
        if self.backup_task and not self.backup_task.done():
            self.log("定期備份任務已在運行", "warning")
            return
        
        self.backup_task = asyncio.create_task(
            self.schedule_backups(interval_hours=interval_hours)
        )
        self.log(f"定期備份任務已啟動（每 {interval_hours} 小時一次）")
    
    async def stop_scheduled_backups(self):
        """停止定期備份任務"""
        if self.backup_task and not self.backup_task.done():
            self.backup_task.cancel()
            try:
                await self.backup_task
            except asyncio.CancelledError:
                pass
            self.log("定期備份任務已停止")
    
    def get_backup_stats(self) -> Dict[str, Any]:
        """獲取備份統計信息"""
        try:
            backups = []
            backup_files = list(self.backup_dir.glob('backup_*.db')) + list(self.backup_dir.glob('backup_*.zip'))
            
            total_size = sum(f.stat().st_size for f in backup_files)
            oldest_backup = min((f.stat().st_mtime for f in backup_files), default=None)
            newest_backup = max((f.stat().st_mtime for f in backup_files), default=None)
            
            return {
                'backup_count': len(backup_files),
                'total_size_mb': round(total_size / 1024 / 1024, 2),
                'oldest_backup': datetime.fromtimestamp(oldest_backup).isoformat() if oldest_backup else None,
                'newest_backup': datetime.fromtimestamp(newest_backup).isoformat() if newest_backup else None,
                'scheduled_backup_running': self.backup_task is not None and not self.backup_task.done()
            }
        except Exception as e:
            return {
                'error': str(e)
            }


# ==================== 兼容性函數（用於舊代碼） ====================

def get_backup_manager() -> Optional[BackupManager]:
    """獲取全局備份管理器實例（兼容舊代碼）"""
    global _backup_manager
    return _backup_manager


def set_backup_manager(manager: BackupManager):
    """設置全局備份管理器實例"""
    global _backup_manager
    _backup_manager = manager


class LegacyBackupManager:
    """舊版備份管理器接口（兼容性）"""
    
    def __init__(self, manager: BackupManager):
        self.manager = manager
    
    def should_backup_on_startup(self) -> bool:
        """是否應該在啟動時備份"""
        # 檢查上次備份時間，如果超過24小時則備份
        try:
            backups = asyncio.run(self.manager.list_backups(limit=1))
            if not backups:
                return True
            
            last_backup_time = datetime.fromisoformat(backups[0]['modified'])
            hours_since_backup = (datetime.now() - last_backup_time).total_seconds() / 3600
            return hours_since_backup >= 24
        except:
            return True
    
    async def create_backup(self, suffix: str = 'manual'):
        """創建備份（兼容舊接口）"""
        return await self.manager.create_backup(backup_type=suffix, compress=True)
    
    def get_backup_info(self):
        """獲取備份信息（兼容舊接口）"""
        return self.manager.get_backup_stats()
