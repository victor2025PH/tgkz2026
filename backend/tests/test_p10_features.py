"""
🔧 P10: 部署與運維 — 測試套件

覆蓋：
- P10-2: 環境變量校驗器
- P10-3: 備份驗證器
- P10-4: 健康檢查增強
"""

import os
import sys
import json
import sqlite3
import tempfile
import shutil
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock

# 確保後端模組可導入
sys.path.insert(0, str(Path(__file__).parent.parent))


# ==================== P10-2: 環境變量校驗 ====================

class TestEnvValidator:
    """測試環境變量校驗器"""

    def test_import_env_validator(self):
        """env_validator 模組應可導入"""
        from core.env_validator import validate_environment, EnvValidationResult
        assert validate_environment is not None
        assert EnvValidationResult is not None

    @patch.dict(os.environ, {
        'SECRET_KEY': 'a-very-secure-key-here-123',
        'JWT_SECRET': 'another-very-secure-jwt-key',
        'ENCRYPTION_KEY': 'super-secret-encryption-key',
        'PORT': '8000',
    }, clear=False)
    def test_valid_environment(self):
        """有效環境應通過校驗"""
        from core.env_validator import validate_environment
        result = validate_environment()
        assert result.is_valid is True
        assert len(result.errors) == 0

    @patch.dict(os.environ, {
        'SECRET_KEY': 'your-secret-key-change-this',
        'JWT_SECRET': 'good-key-here-12345678',
        'ENCRYPTION_KEY': 'good-key-here-12345678',
        'ENVIRONMENT': 'production',
    }, clear=False)
    def test_unsafe_default_in_production(self):
        """生產環境使用默認密鑰應報錯"""
        from core.env_validator import validate_environment
        result = validate_environment()
        assert not result.is_valid
        assert any('UNSAFE' in e for e in result.errors)

    @patch.dict(os.environ, {
        'PORT': '99999',
        'SECRET_KEY': 'valid-key-here-16chars',
        'JWT_SECRET': 'valid-key-here-16chars',
        'ENCRYPTION_KEY': 'valid-key-here-16chars',
    }, clear=False)
    def test_invalid_port(self):
        """無效端口號應報錯"""
        from core.env_validator import validate_environment
        result = validate_environment()
        assert any('PORT' in e for e in result.errors)

    @patch.dict(os.environ, {
        'SECRET_KEY': 'short',
        'JWT_SECRET': 'valid-key-here-16chars',
        'ENCRYPTION_KEY': 'valid-key-here-16chars',
    }, clear=False)
    def test_short_key_warning(self):
        """過短的密鑰應產生警告"""
        from core.env_validator import validate_environment
        result = validate_environment()
        assert any('too short' in w for w in result.warnings)

    @patch.dict(os.environ, {
        'ELECTRON_MODE': 'true',
    }, clear=False)
    def test_electron_mode_relaxed(self):
        """Electron 模式應放寬要求"""
        from core.env_validator import validate_environment
        result = validate_environment()
        assert any('Electron' in i for i in result.info)

    def test_validation_result_summary(self):
        """ValidationResult summary 應正確格式化"""
        from core.env_validator import EnvValidationResult
        result = EnvValidationResult()
        result.add_error("test error")
        result.add_warning("test warning")
        summary = result.summary()
        assert "error" in summary.lower()
        assert "warning" in summary.lower()
        assert not result.is_valid

    def test_validate_on_startup(self):
        """validate_on_startup 應返回 bool"""
        from core.env_validator import validate_on_startup
        # 在測試環境中應返回 True 或 False
        result = validate_on_startup()
        assert isinstance(result, bool)


# ==================== P10-3: 備份驗證器 ====================

class TestBackupVerifier:
    """測試備份驗證器"""

    @pytest.fixture
    def backup_db(self):
        """創建臨時備份數據庫"""
        temp_dir = tempfile.mkdtemp()
        db_path = os.path.join(temp_dir, 'test_backup.db')

        conn = sqlite3.connect(db_path)
        conn.execute('CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT)')
        conn.execute('CREATE TABLE accounts (id TEXT PRIMARY KEY, phone TEXT)')
        conn.execute('CREATE TABLE schema_version (version INTEGER, applied_at TEXT)')
        conn.execute("INSERT INTO users VALUES ('u1', 'Test User')")
        conn.execute("INSERT INTO accounts VALUES ('a1', '+1234567890')")
        conn.execute("INSERT INTO schema_version VALUES (26, '2026-02-07')")
        conn.commit()
        conn.close()

        yield db_path, temp_dir

        shutil.rmtree(temp_dir, ignore_errors=True)

    def test_import_backup_verifier(self):
        """backup_verifier 模組應可導入"""
        from core.backup_verifier import BackupVerifier, VerificationResult
        assert BackupVerifier is not None
        assert VerificationResult is not None

    def test_verify_valid_backup(self, backup_db):
        """有效備份應通過驗證"""
        from core.backup_verifier import BackupVerifier
        db_path, _ = backup_db

        verifier = BackupVerifier()
        result = verifier.verify_backup(db_path)

        assert result.is_valid
        assert result.checks_passed > 0
        assert result.file_size > 0
        assert 'tables' in result.details
        assert 'users' in result.details['tables']
        assert 'accounts' in result.details['tables']

    def test_verify_nonexistent_file(self):
        """不存在的文件應驗證失敗"""
        from core.backup_verifier import BackupVerifier

        verifier = BackupVerifier()
        result = verifier.verify_backup('/nonexistent/backup.db')

        assert not result.is_valid
        assert len(result.errors) > 0

    def test_verify_empty_file(self):
        """空文件應驗證失敗"""
        from core.backup_verifier import BackupVerifier

        fd, path = tempfile.mkstemp(suffix='.db')
        os.close(fd)
        try:
            verifier = BackupVerifier()
            result = verifier.verify_backup(path)
            assert not result.is_valid
        finally:
            os.unlink(path)

    def test_verify_corrupted_file(self):
        """損壞文件應驗證失敗"""
        from core.backup_verifier import BackupVerifier

        temp_dir = tempfile.mkdtemp()
        path = os.path.join(temp_dir, 'corrupt.db')
        with open(path, 'wb') as f:
            f.write(b'this is not a sqlite database at all')
        try:
            verifier = BackupVerifier()
            result = verifier.verify_backup(path)
            assert not result.is_valid
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    def test_verify_with_full_restore(self, backup_db):
        """完整恢復測試應通過"""
        from core.backup_verifier import BackupVerifier
        db_path, _ = backup_db

        verifier = BackupVerifier()
        result = verifier.verify_backup(db_path, full_restore_test=True)

        assert result.is_valid
        assert result.details.get('restore_test') == 'passed'

    def test_verify_schema_version(self, backup_db):
        """應檢測到 schema_version"""
        from core.backup_verifier import BackupVerifier
        db_path, _ = backup_db

        verifier = BackupVerifier()
        result = verifier.verify_backup(db_path)

        assert result.details.get('latest_schema_version') == 26

    def test_verify_row_counts(self, backup_db):
        """應報告行數"""
        from core.backup_verifier import BackupVerifier
        db_path, _ = backup_db

        verifier = BackupVerifier()
        result = verifier.verify_backup(db_path)

        assert result.details['total_rows'] > 0
        assert result.details['row_counts']['users'] == 1

    def test_result_to_dict(self, backup_db):
        """to_dict 應返回完整字典"""
        from core.backup_verifier import BackupVerifier
        db_path, _ = backup_db

        verifier = BackupVerifier()
        result = verifier.verify_backup(db_path)
        d = result.to_dict()

        assert 'is_valid' in d
        assert 'file_size' in d
        assert 'duration_ms' in d
        assert d['is_valid'] is True

    def test_verify_latest_backup(self, backup_db):
        """verify_latest_backup 應找到最新備份"""
        from core.backup_verifier import BackupVerifier
        _, temp_dir = backup_db

        verifier = BackupVerifier()
        result = verifier.verify_latest_backup(temp_dir)

        assert result is not None
        assert result.is_valid


# ==================== P10-4: 健康檢查增強 ====================

class TestHealthServiceEnhanced:
    """測試健康服務增強"""

    def test_health_service_has_new_checks(self):
        """HealthService 應包含新的檢查項"""
        from core.health_service import get_health_service
        service = get_health_service()

        check_names = list(service._health_checks.keys())
        assert 'redis' in check_names
        assert 'backup' in check_names
        assert 'db_performance' in check_names

    def test_health_history_empty(self):
        """初始歷史應為空"""
        from core.health_service import HealthService
        # 創建新實例測試
        service = HealthService.__new__(HealthService)
        service._initialized = False
        service._health_history = []
        service._max_history = 100

        history = service.get_health_history()
        assert isinstance(history, list)
        assert len(history) == 0

    def test_health_history_limit(self):
        """歷史應受 limit 限制"""
        from core.health_service import HealthService
        service = HealthService.__new__(HealthService)
        service._health_history = [
            {'status': 'healthy', 'timestamp': f't{i}'} for i in range(50)
        ]

        history = service.get_health_history(10)
        assert len(history) == 10

    def test_record_history_ring_buffer(self):
        """歷史應保持環形緩衝區大小"""
        from core.health_service import HealthService, ServiceHealth, HealthStatus, HealthCheck
        service = HealthService.__new__(HealthService)
        service._health_history = []
        service._max_history = 5

        for i in range(10):
            health = ServiceHealth(
                status=HealthStatus.HEALTHY,
                version='1.0.0',
                uptime_seconds=float(i),
                checks=[],
                timestamp=f't{i}'
            )
            service._record_history(health)

        assert len(service._health_history) <= 5
        # 應保留最新的
        assert service._health_history[-1]['timestamp'] == 't9'


# ==================== 文件結構驗證 ====================

class TestP10FileStructure:
    """驗證 P10 新增文件"""

    @pytest.fixture
    def project_root(self):
        return Path(__file__).parent.parent.parent

    def test_env_validator_exists(self, project_root):
        assert (project_root / 'backend' / 'core' / 'env_validator.py').exists()

    def test_backup_verifier_exists(self, project_root):
        assert (project_root / 'backend' / 'core' / 'backup_verifier.py').exists()

    def test_ci_yml_exists(self, project_root):
        assert (project_root / '.github' / 'workflows' / 'ci.yml').exists()

    def test_operations_md_exists(self, project_root):
        assert (project_root / 'deploy' / 'OPERATIONS.md').exists()

    def test_rollback_script_exists(self, project_root):
        assert (project_root / 'scripts' / 'rollback.sh').exists()
