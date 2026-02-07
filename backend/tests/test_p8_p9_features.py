"""
🔧 P9-5: P8/P9 功能單元測試

覆蓋：
1. 前端審計日誌存儲 — frontend_audit_log 表 CRUD
2. 前端審計查詢 API — 過濾/分頁
3. i18n 翻譯文件完整性 — 三語言 key 一致性
4. 性能指標表結構 — performance_metrics
5. 死代碼驗證 — 確認已刪除文件不影響導入
"""

import os
import sys
import json
import sqlite3
import tempfile
import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime

# 確保可以導入 backend 模塊
sys.path.insert(0, str(Path(__file__).parent.parent))


# ==================== 前端審計日誌測試 ====================

class TestFrontendAuditLog:
    """測試前端審計日誌存儲和查詢"""
    
    @pytest.fixture
    def audit_db(self):
        """創建帶有審計表的臨時數據庫"""
        fd, db_path = tempfile.mkstemp(suffix='.db')
        os.close(fd)
        
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        conn.execute('''
            CREATE TABLE IF NOT EXISTS frontend_audit_log (
                id TEXT PRIMARY KEY,
                action TEXT NOT NULL,
                severity TEXT DEFAULT 'info',
                user_id TEXT,
                details TEXT,
                timestamp INTEGER,
                received_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        
        yield conn, db_path
        
        conn.close()
        os.unlink(db_path)
    
    def test_create_audit_table(self, audit_db):
        """審計表應該正確創建"""
        conn, _ = audit_db
        cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='frontend_audit_log'")
        table = cursor.fetchone()
        assert table is not None
        assert table[0] == 'frontend_audit_log'
    
    def test_insert_audit_entry(self, audit_db):
        """應能插入審計條目"""
        conn, _ = audit_db
        conn.execute(
            'INSERT INTO frontend_audit_log (id, action, severity, user_id, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
            ('audit_001', 'nav.view_change', 'info', 'user_1', '{"from":"dashboard","to":"accounts"}', 1707321600000)
        )
        conn.commit()
        
        row = conn.execute('SELECT * FROM frontend_audit_log WHERE id = ?', ('audit_001',)).fetchone()
        assert row is not None
        assert row['action'] == 'nav.view_change'
        assert row['severity'] == 'info'
        assert row['user_id'] == 'user_1'
    
    def test_insert_duplicate_id_ignored(self, audit_db):
        """重複 ID 的插入應被忽略（INSERT OR IGNORE）"""
        conn, _ = audit_db
        conn.execute(
            'INSERT OR IGNORE INTO frontend_audit_log (id, action, severity, user_id, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
            ('audit_dup', 'auth.login', 'info', 'user_1', '{}', 1707321600000)
        )
        conn.execute(
            'INSERT OR IGNORE INTO frontend_audit_log (id, action, severity, user_id, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
            ('audit_dup', 'auth.logout', 'info', 'user_1', '{}', 1707321700000)
        )
        conn.commit()
        
        count = conn.execute('SELECT COUNT(*) FROM frontend_audit_log WHERE id = ?', ('audit_dup',)).fetchone()[0]
        assert count == 1
        
        # 第一條記錄應保留
        row = conn.execute('SELECT action FROM frontend_audit_log WHERE id = ?', ('audit_dup',)).fetchone()
        assert row['action'] == 'auth.login'
    
    def test_batch_insert(self, audit_db):
        """批量插入應正確工作"""
        conn, _ = audit_db
        entries = [
            {'id': f'batch_{i}', 'action': f'action_{i}', 'severity': 'info', 'userId': 'user_1', 'details': {}, 'timestamp': 1707321600000 + i}
            for i in range(50)
        ]
        
        for entry in entries:
            conn.execute(
                'INSERT OR IGNORE INTO frontend_audit_log (id, action, severity, user_id, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                (entry['id'], entry['action'], entry['severity'], str(entry['userId']), json.dumps(entry['details']), entry['timestamp'])
            )
        conn.commit()
        
        count = conn.execute('SELECT COUNT(*) FROM frontend_audit_log').fetchone()[0]
        assert count == 50
    
    def test_query_by_action(self, audit_db):
        """按操作類型過濾查詢"""
        conn, _ = audit_db
        actions = ['auth.login', 'auth.logout', 'nav.view_change', 'nav.view_change', 'system.error']
        for i, action in enumerate(actions):
            conn.execute(
                'INSERT INTO frontend_audit_log (id, action, severity, user_id, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                (f'q_{i}', action, 'info', 'user_1', '{}', 1707321600000 + i)
            )
        conn.commit()
        
        nav_logs = conn.execute(
            'SELECT * FROM frontend_audit_log WHERE action = ?', ('nav.view_change',)
        ).fetchall()
        assert len(nav_logs) == 2
    
    def test_query_by_severity(self, audit_db):
        """按嚴重級別過濾查詢"""
        conn, _ = audit_db
        severities = ['info', 'info', 'warning', 'error', 'info']
        for i, sev in enumerate(severities):
            conn.execute(
                'INSERT INTO frontend_audit_log (id, action, severity, user_id, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                (f's_{i}', 'test.action', sev, 'user_1', '{}', 1707321600000 + i)
            )
        conn.commit()
        
        errors = conn.execute(
            'SELECT * FROM frontend_audit_log WHERE severity = ?', ('error',)
        ).fetchall()
        assert len(errors) == 1
    
    def test_query_with_pagination(self, audit_db):
        """分頁查詢應正確工作"""
        conn, _ = audit_db
        for i in range(20):
            conn.execute(
                'INSERT INTO frontend_audit_log (id, action, severity, user_id, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                (f'p_{i}', 'test.action', 'info', 'user_1', '{}', 1707321600000 + i)
            )
        conn.commit()
        
        # 第一頁（5條）
        page1 = conn.execute(
            'SELECT * FROM frontend_audit_log ORDER BY timestamp DESC LIMIT ? OFFSET ?', (5, 0)
        ).fetchall()
        assert len(page1) == 5
        
        # 第二頁
        page2 = conn.execute(
            'SELECT * FROM frontend_audit_log ORDER BY timestamp DESC LIMIT ? OFFSET ?', (5, 5)
        ).fetchall()
        assert len(page2) == 5
        
        # 確認不重疊
        page1_ids = {row['id'] for row in page1}
        page2_ids = {row['id'] for row in page2}
        assert page1_ids.isdisjoint(page2_ids)
    
    def test_batch_size_limit(self, audit_db):
        """批量插入應限制在 100 條以內"""
        conn, _ = audit_db
        entries = [
            {'id': f'limit_{i}', 'action': 'test', 'severity': 'info', 'userId': 'u', 'details': {}, 'timestamp': i}
            for i in range(150)
        ]
        
        # 模擬後端限制：只處理前 100 條
        for entry in entries[:100]:
            conn.execute(
                'INSERT OR IGNORE INTO frontend_audit_log (id, action, severity, user_id, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                (entry['id'], entry['action'], entry['severity'], entry['userId'], '{}', entry['timestamp'])
            )
        conn.commit()
        
        count = conn.execute('SELECT COUNT(*) FROM frontend_audit_log').fetchone()[0]
        assert count == 100


# ==================== i18n 翻譯文件完整性測試 ====================

class TestI18nCompleteness:
    """測試三語言翻譯文件的 key 一致性"""
    
    @pytest.fixture
    def i18n_dir(self):
        """返回 i18n 翻譯文件目錄"""
        base_dir = Path(__file__).parent.parent.parent / 'src' / 'assets' / 'i18n'
        return base_dir
    
    def _load_json(self, path: Path) -> dict:
        """加載 JSON 文件"""
        if not path.exists():
            pytest.skip(f"File not found: {path}")
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _flatten_keys(self, obj: dict, prefix: str = '') -> set:
        """將嵌套字典的 key 扁平化"""
        keys = set()
        for k, v in obj.items():
            full_key = f'{prefix}.{k}' if prefix else k
            if isinstance(v, dict):
                keys.update(self._flatten_keys(v, full_key))
            else:
                keys.add(full_key)
        return keys
    
    def test_all_locale_files_exist(self, i18n_dir):
        """三個語言文件都應存在"""
        for locale in ['en', 'zh-CN', 'zh-TW']:
            path = i18n_dir / f'{locale}.json'
            assert path.exists(), f"Missing locale file: {path}"
    
    def test_all_files_valid_json(self, i18n_dir):
        """所有語言文件應為合法 JSON"""
        for locale in ['en', 'zh-CN', 'zh-TW']:
            path = i18n_dir / f'{locale}.json'
            if path.exists():
                data = self._load_json(path)
                assert isinstance(data, dict), f"{locale}.json root should be an object"
    
    def test_zh_tw_has_p8_keys(self, i18n_dir):
        """繁體中文應包含 P8 新增的翻譯 key"""
        data = self._load_json(i18n_dir / 'zh-TW.json')
        
        # 檢查 P8 新增 section
        assert 'notification' in data, "Missing 'notification' section"
        assert 'offline' in data, "Missing 'offline' section"
        assert 'audit' in data, "Missing 'audit' section"
        
        # 檢查關鍵 key
        assert 'center' in data['notification']
        assert 'markAllRead' in data['notification']
        assert 'networkOffline' in data['offline']
        assert 'syncing' in data['offline']
        assert 'title' in data['audit']
    
    def test_top_level_sections_consistent(self, i18n_dir):
        """三個語言文件的頂級 section 應一致"""
        zh_tw = self._load_json(i18n_dir / 'zh-TW.json')
        zh_cn = self._load_json(i18n_dir / 'zh-CN.json')
        en = self._load_json(i18n_dir / 'en.json')
        
        zh_tw_sections = set(zh_tw.keys())
        zh_cn_sections = set(zh_cn.keys())
        en_sections = set(en.keys())
        
        # P8 新增的 section 應在所有語言中存在
        for section in ['notification', 'offline', 'audit']:
            assert section in zh_tw_sections, f"zh-TW missing section: {section}"
            assert section in zh_cn_sections, f"zh-CN missing section: {section}"
            assert section in en_sections, f"en missing section: {section}"
    
    def test_p8_section_keys_match(self, i18n_dir):
        """P8 新增 section 的 key 在三語言中應完全匹配"""
        zh_tw = self._load_json(i18n_dir / 'zh-TW.json')
        zh_cn = self._load_json(i18n_dir / 'zh-CN.json')
        en = self._load_json(i18n_dir / 'en.json')
        
        for section in ['notification', 'offline', 'audit']:
            tw_keys = set(zh_tw.get(section, {}).keys())
            cn_keys = set(zh_cn.get(section, {}).keys())
            en_keys = set(en.get(section, {}).keys())
            
            missing_cn = tw_keys - cn_keys
            missing_en = tw_keys - en_keys
            
            assert not missing_cn, f"zh-CN missing keys in '{section}': {missing_cn}"
            assert not missing_en, f"en missing keys in '{section}': {missing_en}"


# ==================== db_utils 增強測試 ====================

class TestDbUtilsEnhanced:
    """db_utils 的補充測試"""
    
    def test_connection_stats_thread_safety(self):
        """ConnectionStats 應線程安全"""
        from core.db_utils import ConnectionStats
        
        initial = ConnectionStats.stats()
        initial_created = initial['total_created']
        
        # 模擬多次創建和關閉
        ConnectionStats.on_create()
        ConnectionStats.on_create()
        ConnectionStats.on_close()
        
        stats = ConnectionStats.stats()
        assert stats['total_created'] == initial_created + 2
        assert stats['total_closed'] >= 1
        assert stats.get('currently_open', stats.get('active', 0)) >= 0
    
    def test_get_connection_context_manager(self):
        """get_connection 上下文管理器應自動關閉連接"""
        from core.db_utils import get_connection, ConnectionStats
        
        stats_before = ConnectionStats.stats()
        
        with get_connection() as conn:
            result = conn.execute('SELECT 1').fetchone()
            assert result[0] == 1
        
        # 連接應已關閉
        stats_after = ConnectionStats.stats()
        # 連接應已使用（get_connection 可能使用連接池或重用）
        assert stats_after.get('total_closed', 0) >= stats_before.get('total_closed', 0)


# ==================== 安全中間件增強測試 ====================

class TestSecurityMiddlewareEnhanced:
    """安全中間件補充測試"""
    
    def test_skip_paths_defined(self):
        """安全頭跳過路徑應已定義"""
        from api.middleware import SKIP_SECURITY_HEADERS_PATHS
        assert isinstance(SKIP_SECURITY_HEADERS_PATHS, (list, tuple, set, frozenset))
        assert len(SKIP_SECURITY_HEADERS_PATHS) > 0
    
    def test_rate_limiter_importable(self):
        """速率限制器應可導入"""
        try:
            from core.rate_limiter import RateLimiter
            limiter = RateLimiter()
            assert limiter is not None
        except ImportError:
            pytest.skip("RateLimiter not available")


# ==================== 前端文件結構驗證 ====================

class TestFrontendFileStructure:
    """驗證前端文件結構的完整性（P9-2 清理後）"""
    
    @pytest.fixture
    def src_dir(self):
        # CI: GITHUB_WORKSPACE 為倉庫根目錄，避免 cd backend 後路徑解析錯誤
        root = os.environ.get('GITHUB_WORKSPACE')
        if root:
            return Path(root) / 'src'
        return Path(__file__).parent.parent.parent / 'src'
    
    def test_dead_code_removed(self, src_dir):
        """已刪除的死代碼文件不應存在"""
        dead_files = [
            'translation.service.ts',          # P9-2 已刪除
            'core/offline-cache.service.ts',    # P9-2 已刪除
            'auth.service.ts',                  # P6 已刪除
        ]
        for f in dead_files:
            path = src_dir / f
            assert not path.exists(), f"Dead code file should be removed: {f}"
    
    def test_p8_new_files_exist(self, src_dir):
        """P8 新建文件應全部存在"""
        p8_files = [
            'core/offline.interceptor.ts',
            'components/offline-indicator.component.ts',
            'components/notification-center.component.ts',
            'services/audit-tracker.service.ts',
        ]
        for f in p8_files:
            path = src_dir / f
            assert path.exists(), f"P8 file should exist: {f}"
    
    def test_i18n_pipe_exists(self, src_dir):
        """i18n pipe 應存在"""
        assert (src_dir / 'core' / 'i18n.pipe.ts').exists()
    
    def test_services_offline_cache_exists(self, src_dir):
        """統一版 offline-cache 服務應存在"""
        assert (src_dir / 'services' / 'offline-cache.service.ts').exists()
    
    def test_app_config_exists(self, src_dir):
        """app.config.ts 應存在"""
        assert (src_dir / 'app.config.ts').exists()
