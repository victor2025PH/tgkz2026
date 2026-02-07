"""
🔧 P10-3: 備份驗證器

功能：
1. 驗證備份文件完整性（SQLite quick_check）
2. 驗證表結構一致性
3. 驗證數據行數合理性
4. 可選：模擬恢復到臨時目錄
5. 定期自動驗證（集成到 daily maintenance）
"""

import os
import sys
import time
import sqlite3
import tempfile
import shutil
import logging
import zipfile
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class VerificationResult:
    """備份驗證結果"""
    backup_path: str
    is_valid: bool = True
    file_size: int = 0
    checks_passed: int = 0
    checks_failed: int = 0
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    details: Dict[str, Any] = field(default_factory=dict)
    duration_ms: float = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            'backup_path': self.backup_path,
            'is_valid': self.is_valid,
            'file_size': self.file_size,
            'checks_passed': self.checks_passed,
            'checks_failed': self.checks_failed,
            'errors': self.errors,
            'warnings': self.warnings,
            'details': self.details,
            'duration_ms': self.duration_ms,
        }


class BackupVerifier:
    """備份驗證器"""

    # 核心表列表 — 這些表在任何有效備份中都應存在
    CORE_TABLES = [
        'users',
        'accounts',
    ]

    # 已知的可選表（不強制要求存在）
    OPTIONAL_TABLES = [
        'keyword_sets', 'keywords', 'monitored_groups',
        'templates', 'campaigns', 'captured_leads',
        'schema_version', 'frontend_audit_log',
        'performance_metrics',
    ]

    def __init__(self):
        pass

    def verify_backup(self, backup_path: str, full_restore_test: bool = False) -> VerificationResult:
        """
        驗證備份文件

        Args:
            backup_path: 備份文件路徑（.db 或 .zip）
            full_restore_test: 是否執行完整恢復測試

        Returns:
            VerificationResult
        """
        start_time = time.time()
        result = VerificationResult(backup_path=backup_path)

        try:
            # 1. 文件存在性和大小
            if not os.path.exists(backup_path):
                result.errors.append(f"Backup file not found: {backup_path}")
                result.is_valid = False
                return result

            result.file_size = os.path.getsize(backup_path)
            if result.file_size == 0:
                result.errors.append("Backup file is empty (0 bytes)")
                result.is_valid = False
                return result

            result.checks_passed += 1

            # 2. 處理 ZIP 格式
            db_path = backup_path
            temp_dir = None

            if backup_path.endswith('.zip'):
                temp_dir = tempfile.mkdtemp(prefix='backup_verify_')
                try:
                    with zipfile.ZipFile(backup_path, 'r') as zf:
                        # 查找 .db 文件
                        db_files = [f for f in zf.namelist() if f.endswith('.db')]
                        if not db_files:
                            result.errors.append("ZIP backup contains no .db file")
                            result.is_valid = False
                            return result
                        zf.extract(db_files[0], temp_dir)
                        db_path = os.path.join(temp_dir, db_files[0])
                    result.checks_passed += 1
                except zipfile.BadZipFile:
                    result.errors.append("Corrupt ZIP file")
                    result.is_valid = False
                    return result

            # 3. SQLite 完整性檢查
            try:
                conn = sqlite3.connect(db_path, timeout=10)
                conn.row_factory = sqlite3.Row

                # quick_check
                integrity = conn.execute('PRAGMA quick_check').fetchone()
                if integrity and integrity[0] == 'ok':
                    result.checks_passed += 1
                    result.details['integrity'] = 'ok'
                else:
                    result.errors.append(f"Integrity check failed: {integrity}")
                    result.is_valid = False

                # 4. 表結構檢查
                tables = [row[0] for row in conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
                ).fetchall()]
                result.details['tables'] = tables
                result.details['table_count'] = len(tables)

                for core_table in self.CORE_TABLES:
                    if core_table in tables:
                        result.checks_passed += 1
                    else:
                        result.warnings.append(f"Core table missing: {core_table}")

                # 5. 數據行數檢查
                row_counts = {}
                for table in tables:
                    try:
                        count = conn.execute(f'SELECT COUNT(*) FROM [{table}]').fetchone()[0]
                        row_counts[table] = count
                    except Exception:
                        row_counts[table] = -1

                result.details['row_counts'] = row_counts
                total_rows = sum(c for c in row_counts.values() if c > 0)
                result.details['total_rows'] = total_rows

                if total_rows > 0:
                    result.checks_passed += 1
                else:
                    result.warnings.append("Backup contains 0 data rows")

                # 6. schema_version 檢查
                if 'schema_version' in tables:
                    versions = conn.execute(
                        'SELECT version, applied_at FROM schema_version ORDER BY version DESC LIMIT 1'
                    ).fetchone()
                    if versions:
                        result.details['latest_schema_version'] = versions[0]
                        result.details['latest_migration_date'] = versions[1]
                        result.checks_passed += 1

                conn.close()

            except sqlite3.DatabaseError as db_err:
                result.errors.append(f"SQLite error: {db_err}")
                result.is_valid = False

            # 7. 完整恢復測試（可選）
            if full_restore_test and result.is_valid:
                restore_result = self._test_full_restore(db_path)
                if restore_result:
                    result.checks_passed += 1
                    result.details['restore_test'] = 'passed'
                else:
                    result.warnings.append("Full restore test failed")
                    result.details['restore_test'] = 'failed'

            # 清理臨時目錄
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)

        except Exception as e:
            result.errors.append(f"Unexpected error: {e}")
            result.is_valid = False

        result.duration_ms = (time.time() - start_time) * 1000
        result.checks_failed = len(result.errors)
        return result

    def _test_full_restore(self, db_path: str) -> bool:
        """模擬完整恢復：複製到臨時位置並驗證可讀"""
        temp_db = None
        try:
            fd, temp_db = tempfile.mkstemp(suffix='.db')
            os.close(fd)
            shutil.copy2(db_path, temp_db)

            conn = sqlite3.connect(temp_db, timeout=5)
            # 嘗試一個基本讀取操作
            conn.execute('SELECT 1')
            tables = conn.execute(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table'"
            ).fetchone()[0]
            conn.close()

            return tables > 0

        except Exception as e:
            logger.warning(f"Full restore test failed: {e}")
            return False
        finally:
            if temp_db and os.path.exists(temp_db):
                os.unlink(temp_db)

    def verify_latest_backup(self, backup_dir: str) -> Optional[VerificationResult]:
        """驗證最新的備份文件"""
        backup_path = Path(backup_dir)
        if not backup_path.exists():
            return None

        # 找到最新的備份文件
        backup_files = sorted(
            [f for f in backup_path.glob('**/*.db')] +
            [f for f in backup_path.glob('**/*.zip')],
            key=lambda f: f.stat().st_mtime,
            reverse=True
        )

        if not backup_files:
            return None

        return self.verify_backup(str(backup_files[0]))


def verify_backup_on_schedule(backup_dir: str) -> Dict[str, Any]:
    """
    定時備份驗證（集成到 daily maintenance）

    Returns:
        驗證結果字典
    """
    verifier = BackupVerifier()
    result = verifier.verify_latest_backup(backup_dir)

    if result is None:
        return {'status': 'no_backups', 'message': 'No backup files found'}

    summary = result.to_dict()
    if result.is_valid:
        print(f"[BackupVerify] ✅ Latest backup valid: {result.backup_path} "
              f"({result.file_size} bytes, {result.checks_passed} checks passed, "
              f"{result.duration_ms:.0f}ms)", file=sys.stderr)
    else:
        print(f"[BackupVerify] ❌ Backup INVALID: {result.backup_path} "
              f"Errors: {result.errors}", file=sys.stderr)

    return summary
