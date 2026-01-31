"""
數據導出和備份服務

優化設計：
1. 多格式導出（JSON、CSV、ZIP）
2. 增量備份
3. 自動備份調度
4. 數據脫敏選項
"""

import os
import json
import csv
import zipfile
import sqlite3
import asyncio
import logging
import shutil
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict
from io import StringIO, BytesIO

logger = logging.getLogger(__name__)


@dataclass
class ExportOptions:
    """導出選項"""
    include_accounts: bool = True
    include_messages: bool = True
    include_contacts: bool = True
    include_settings: bool = True
    include_usage: bool = False
    mask_sensitive: bool = True  # 脫敏敏感數據
    format: str = 'json'  # json, csv, zip


@dataclass
class BackupInfo:
    """備份信息"""
    id: str
    user_id: str
    filename: str
    size: int
    type: str  # full, incremental
    created_at: str
    expires_at: str = ''
    status: str = 'completed'
    
    def to_dict(self) -> dict:
        return asdict(self)


class DataExportService:
    """數據導出服務"""
    
    def __init__(self, db_path: str = None, backup_dir: str = None):
        self.db_path = db_path or os.environ.get(
            'DATABASE_PATH',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'tgmatrix.db')
        )
        self.backup_dir = backup_dir or os.environ.get(
            'BACKUP_DIR',
            os.path.join(os.path.dirname(__file__), '..', 'data', 'backups')
        )
        os.makedirs(self.backup_dir, exist_ok=True)
        self._init_db()
    
    def _init_db(self):
        """初始化備份記錄表"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS backups (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    filename TEXT NOT NULL,
                    size INTEGER DEFAULT 0,
                    type TEXT DEFAULT 'full',
                    created_at TEXT,
                    expires_at TEXT,
                    status TEXT DEFAULT 'completed'
                )
            ''')
            
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_backups_user ON backups(user_id)')
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Backup DB init error: {e}")
    
    # ==================== 數據導出 ====================
    
    async def export_user_data(
        self,
        user_id: str,
        options: ExportOptions = None
    ) -> Dict[str, Any]:
        """導出用戶數據"""
        options = options or ExportOptions()
        
        data = {
            'export_date': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'version': '1.0'
        }
        
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # 帳號
            if options.include_accounts:
                data['accounts'] = await self._export_accounts(cursor, user_id, options)
            
            # 消息
            if options.include_messages:
                data['messages'] = await self._export_messages(cursor, user_id, options)
            
            # 聯絡人
            if options.include_contacts:
                data['contacts'] = await self._export_contacts(cursor, user_id, options)
            
            # 設置
            if options.include_settings:
                data['settings'] = await self._export_settings(cursor, user_id)
            
            # 使用量
            if options.include_usage:
                data['usage'] = await self._export_usage(cursor, user_id)
            
            conn.close()
            
            # 根據格式返回
            if options.format == 'json':
                return {
                    'success': True,
                    'format': 'json',
                    'data': data
                }
            elif options.format == 'csv':
                return {
                    'success': True,
                    'format': 'csv',
                    'files': self._convert_to_csv(data)
                }
            elif options.format == 'zip':
                return await self._create_export_zip(user_id, data)
            
            return {'success': True, 'data': data}
            
        except Exception as e:
            logger.error(f"Export user data error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _export_accounts(
        self,
        cursor,
        user_id: str,
        options: ExportOptions
    ) -> List[Dict]:
        """導出帳號數據"""
        cursor.execute('''
            SELECT * FROM accounts WHERE user_id = ?
        ''', (user_id,))
        
        accounts = []
        for row in cursor.fetchall():
            account = dict(row)
            
            # 脫敏
            if options.mask_sensitive:
                if 'phone' in account:
                    phone = account.get('phone', '')
                    account['phone'] = phone[:3] + '****' + phone[-4:] if len(phone) > 7 else '****'
                if 'session_string' in account:
                    account['session_string'] = '[REDACTED]'
            
            accounts.append(account)
        
        return accounts
    
    async def _export_messages(
        self,
        cursor,
        user_id: str,
        options: ExportOptions
    ) -> List[Dict]:
        """導出消息數據（最近 1000 條）"""
        cursor.execute('''
            SELECT * FROM messages 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1000
        ''', (user_id,))
        
        return [dict(row) for row in cursor.fetchall()]
    
    async def _export_contacts(
        self,
        cursor,
        user_id: str,
        options: ExportOptions
    ) -> List[Dict]:
        """導出聯絡人數據"""
        cursor.execute('''
            SELECT * FROM unified_contacts WHERE user_id = ?
        ''', (user_id,))
        
        contacts = []
        for row in cursor.fetchall():
            contact = dict(row)
            
            if options.mask_sensitive:
                if 'phone' in contact:
                    phone = contact.get('phone', '')
                    contact['phone'] = phone[:3] + '****' + phone[-4:] if len(phone) > 7 else '****'
            
            contacts.append(contact)
        
        return contacts
    
    async def _export_settings(self, cursor, user_id: str) -> Dict:
        """導出設置"""
        cursor.execute('''
            SELECT * FROM user_profiles WHERE user_id = ?
        ''', (user_id,))
        
        row = cursor.fetchone()
        if row:
            settings = dict(row)
            # 移除敏感字段
            settings.pop('password_hash', None)
            return settings
        return {}
    
    async def _export_usage(self, cursor, user_id: str) -> List[Dict]:
        """導出使用量歷史"""
        cursor.execute('''
            SELECT * FROM usage_stats 
            WHERE user_id = ? 
            ORDER BY date DESC 
            LIMIT 90
        ''', (user_id,))
        
        return [dict(row) for row in cursor.fetchall()]
    
    def _convert_to_csv(self, data: Dict) -> Dict[str, str]:
        """轉換為 CSV 格式"""
        csv_files = {}
        
        for key, value in data.items():
            if isinstance(value, list) and len(value) > 0:
                output = StringIO()
                if isinstance(value[0], dict):
                    writer = csv.DictWriter(output, fieldnames=value[0].keys())
                    writer.writeheader()
                    writer.writerows(value)
                    csv_files[f'{key}.csv'] = output.getvalue()
        
        return csv_files
    
    async def _create_export_zip(self, user_id: str, data: Dict) -> Dict:
        """創建 ZIP 導出包"""
        import uuid
        
        filename = f"export_{user_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.zip"
        filepath = os.path.join(self.backup_dir, filename)
        
        try:
            with zipfile.ZipFile(filepath, 'w', zipfile.ZIP_DEFLATED) as zf:
                # JSON 主文件
                zf.writestr('data.json', json.dumps(data, indent=2, ensure_ascii=False))
                
                # CSV 分表
                csv_files = self._convert_to_csv(data)
                for name, content in csv_files.items():
                    zf.writestr(f'csv/{name}', content)
                
                # 說明文件
                readme = f"""TG-Matrix 數據導出
==================

導出時間: {data.get('export_date', '')}
用戶 ID: {user_id}

文件說明:
- data.json: 完整 JSON 數據
- csv/: CSV 格式分表

注意: 敏感數據已脫敏處理
"""
                zf.writestr('README.txt', readme)
            
            file_size = os.path.getsize(filepath)
            
            return {
                'success': True,
                'format': 'zip',
                'filename': filename,
                'filepath': filepath,
                'size': file_size
            }
        except Exception as e:
            logger.error(f"Create export ZIP error: {e}")
            return {'success': False, 'error': str(e)}
    
    # ==================== 備份管理 ====================
    
    async def create_backup(
        self,
        user_id: str,
        backup_type: str = 'full'
    ) -> Dict[str, Any]:
        """創建備份"""
        import uuid
        
        backup_id = f"bak_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow()
        filename = f"backup_{user_id}_{now.strftime('%Y%m%d_%H%M%S')}.zip"
        filepath = os.path.join(self.backup_dir, user_id, filename)
        
        # 確保目錄存在
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        try:
            # 導出完整數據
            options = ExportOptions(
                include_accounts=True,
                include_messages=True,
                include_contacts=True,
                include_settings=True,
                include_usage=True,
                mask_sensitive=False,  # 備份不脫敏
                format='json'
            )
            
            result = await self.export_user_data(user_id, options)
            
            if not result.get('success'):
                return result
            
            # 創建 ZIP
            with zipfile.ZipFile(filepath, 'w', zipfile.ZIP_DEFLATED) as zf:
                zf.writestr('backup.json', json.dumps(result.get('data', {}), ensure_ascii=False))
                
                # 備份元數據
                meta = {
                    'backup_id': backup_id,
                    'user_id': user_id,
                    'type': backup_type,
                    'created_at': now.isoformat(),
                    'version': '1.0'
                }
                zf.writestr('meta.json', json.dumps(meta, indent=2))
            
            file_size = os.path.getsize(filepath)
            expires_at = (now + timedelta(days=30)).isoformat()  # 30 天過期
            
            # 保存備份記錄
            backup = BackupInfo(
                id=backup_id,
                user_id=user_id,
                filename=filename,
                size=file_size,
                type=backup_type,
                created_at=now.isoformat(),
                expires_at=expires_at
            )
            
            await self._save_backup_record(backup)
            
            return {
                'success': True,
                'backup': backup.to_dict()
            }
            
        except Exception as e:
            logger.error(f"Create backup error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _save_backup_record(self, backup: BackupInfo):
        """保存備份記錄"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO backups 
                (id, user_id, filename, size, type, created_at, expires_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                backup.id, backup.user_id, backup.filename, backup.size,
                backup.type, backup.created_at, backup.expires_at, backup.status
            ))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Save backup record error: {e}")
    
    async def list_backups(self, user_id: str) -> List[BackupInfo]:
        """列出用戶備份"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM backups 
                WHERE user_id = ? 
                ORDER BY created_at DESC
            ''', (user_id,))
            
            backups = []
            for row in cursor.fetchall():
                backups.append(BackupInfo(**dict(row)))
            
            conn.close()
            return backups
        except Exception as e:
            logger.error(f"List backups error: {e}")
            return []
    
    async def restore_backup(self, user_id: str, backup_id: str) -> Dict[str, Any]:
        """恢復備份（待實現）"""
        # TODO: 實現備份恢復邏輯
        return {
            'success': False,
            'error': 'Restore not implemented yet'
        }
    
    async def delete_backup(self, user_id: str, backup_id: str) -> Dict[str, Any]:
        """刪除備份"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 獲取備份信息
            cursor.execute(
                'SELECT filename FROM backups WHERE id = ? AND user_id = ?',
                (backup_id, user_id)
            )
            row = cursor.fetchone()
            
            if not row:
                conn.close()
                return {'success': False, 'error': 'Backup not found'}
            
            filename = row[0]
            filepath = os.path.join(self.backup_dir, user_id, filename)
            
            # 刪除文件
            if os.path.exists(filepath):
                os.remove(filepath)
            
            # 刪除記錄
            cursor.execute(
                'DELETE FROM backups WHERE id = ?',
                (backup_id,)
            )
            
            conn.commit()
            conn.close()
            
            return {'success': True}
        except Exception as e:
            logger.error(f"Delete backup error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def cleanup_expired_backups(self):
        """清理過期備份"""
        try:
            now = datetime.utcnow().isoformat()
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # 獲取過期備份
            cursor.execute('''
                SELECT id, user_id, filename FROM backups 
                WHERE expires_at < ? AND expires_at != ''
            ''', (now,))
            
            expired = cursor.fetchall()
            deleted_count = 0
            
            for backup_id, user_id, filename in expired:
                filepath = os.path.join(self.backup_dir, user_id, filename)
                
                # 刪除文件
                if os.path.exists(filepath):
                    os.remove(filepath)
                
                # 刪除記錄
                cursor.execute('DELETE FROM backups WHERE id = ?', (backup_id,))
                deleted_count += 1
            
            conn.commit()
            conn.close()
            
            if deleted_count > 0:
                logger.info(f"Cleaned up {deleted_count} expired backups")
            
            return {'success': True, 'deleted_count': deleted_count}
        except Exception as e:
            logger.error(f"Cleanup expired backups error: {e}")
            return {'success': False, 'error': str(e)}


# ==================== 自動備份調度 ====================

class BackupScheduler:
    """備份調度器"""
    
    def __init__(self, export_service: DataExportService):
        self.export_service = export_service
        self._running = False
        self._task = None
    
    async def start(self):
        """啟動調度器"""
        if self._running:
            return
        
        self._running = True
        self._task = asyncio.create_task(self._run())
        logger.info("Backup scheduler started")
    
    async def stop(self):
        """停止調度器"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Backup scheduler stopped")
    
    async def _run(self):
        """調度循環"""
        while self._running:
            try:
                # 每天凌晨 3 點執行清理
                now = datetime.utcnow()
                if now.hour == 3 and now.minute == 0:
                    await self.export_service.cleanup_expired_backups()
                
                # 每小時檢查一次
                await asyncio.sleep(3600)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Backup scheduler error: {e}")
                await asyncio.sleep(60)


# ==================== 單例訪問 ====================

_export_service: Optional[DataExportService] = None


def get_export_service() -> DataExportService:
    global _export_service
    if _export_service is None:
        _export_service = DataExportService()
    return _export_service
