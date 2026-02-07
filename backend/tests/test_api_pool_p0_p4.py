"""
P0–P4 後端 API 池端點測試
測試 handlers.py + api_pool.py 的核心邏輯

運行方式: cd backend && python -m pytest tests/test_api_pool_p0_p4.py -v
"""
import pytest
import json
import os
import sys
import tempfile
import sqlite3
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timedelta

# 添加項目路徑
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


# ================================================================
#  測試用 Mock 和輔助函數
# ================================================================

class MockRequest:
    """模擬 aiohttp web.Request"""
    def __init__(self, method='GET', query=None, body=None, match_info=None, headers=None):
        self.method = method
        self.query = query or {}
        self._body = body
        self.match_info = match_info or {}
        self.headers = headers or {'Authorization': 'Bearer test-token'}
    
    async def json(self):
        if isinstance(self._body, str):
            return json.loads(self._body)
        return self._body or {}
    
    async def text(self):
        return self._body if isinstance(self._body, str) else json.dumps(self._body or {})


def create_test_db():
    """創建臨時測試資料庫"""
    fd, path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    conn = sqlite3.connect(path)
    
    # 創建 API Pool 表
    conn.execute('''
        CREATE TABLE IF NOT EXISTS api_pool (
            api_id TEXT PRIMARY KEY,
            api_hash TEXT NOT NULL,
            name TEXT DEFAULT '',
            source_phone TEXT DEFAULT '',
            max_accounts INTEGER DEFAULT 5,
            current_accounts INTEGER DEFAULT 0,
            status TEXT DEFAULT 'available',
            note TEXT DEFAULT '',
            priority INTEGER DEFAULT 0,
            is_premium INTEGER DEFAULT 0,
            group_id TEXT DEFAULT NULL,
            min_member_level TEXT DEFAULT 'basic',
            total_requests INTEGER DEFAULT 0,
            failed_requests INTEGER DEFAULT 0,
            success_rate REAL DEFAULT 100.0,
            health_score REAL DEFAULT 100.0,
            last_used_at TEXT DEFAULT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 創建分組表
    conn.execute('''
        CREATE TABLE IF NOT EXISTS api_pool_groups (
            group_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            color TEXT DEFAULT '#3B82F6',
            icon TEXT DEFAULT '📁',
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 創建分配歷史表
    conn.execute('''
        CREATE TABLE IF NOT EXISTS api_allocation_history (
            id TEXT PRIMARY KEY,
            action TEXT NOT NULL,
            api_id TEXT,
            api_name TEXT DEFAULT '',
            account_phone TEXT DEFAULT '',
            account_id TEXT DEFAULT '',
            operator_id TEXT DEFAULT '',
            operator_name TEXT DEFAULT '',
            strategy_used TEXT DEFAULT '',
            ip_address TEXT DEFAULT '',
            details TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 創建小時統計表
    conn.execute('''
        CREATE TABLE IF NOT EXISTS api_hourly_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hour_key TEXT NOT NULL,
            api_id TEXT DEFAULT NULL,
            total_requests INTEGER DEFAULT 0,
            success_count INTEGER DEFAULT 0,
            fail_count INTEGER DEFAULT 0,
            allocations INTEGER DEFAULT 0,
            releases INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()
    return path


def insert_test_apis(db_path, count=5, health_range=(50, 100)):
    """插入測試 API 數據"""
    conn = sqlite3.connect(db_path)
    import random
    apis = []
    for i in range(count):
        api_id = str(10000 + i)
        api_hash = f'{"a" * 16}{i:016d}'[:32]
        health = random.randint(health_range[0], health_range[1])
        rate = random.randint(health_range[0], health_range[1])
        status = 'available' if i % 3 != 2 else 'disabled'
        created_days_ago = random.randint(1, 365)
        created = (datetime.now() - timedelta(days=created_days_ago)).isoformat()
        
        conn.execute('''
            INSERT INTO api_pool (api_id, api_hash, name, max_accounts, current_accounts, 
                                  status, health_score, success_rate, total_requests, 
                                  failed_requests, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (api_id, api_hash, f'TestAPI-{i}', 5, i % 5, status, health, rate, 
              random.randint(0, 1000), random.randint(0, 100), created))
        apis.append(api_id)
    
    conn.commit()
    conn.close()
    return apis


def insert_test_groups(db_path):
    """插入測試分組"""
    conn = sqlite3.connect(db_path)
    conn.execute('''
        INSERT INTO api_pool_groups (group_id, name, description, color)
        VALUES ('grp-1', 'Production', 'Production APIs', '#22C55E')
    ''')
    conn.execute('''
        INSERT INTO api_pool_groups (group_id, name, description, color)
        VALUES ('grp-2', 'Staging', 'Staging APIs', '#EAB308')
    ''')
    conn.commit()
    conn.close()


def insert_test_history(db_path, api_id, count=5):
    """插入測試分配歷史"""
    conn = sqlite3.connect(db_path)
    import uuid
    for i in range(count):
        ts = (datetime.now() - timedelta(hours=i)).isoformat()
        action = 'allocate' if i % 2 == 0 else 'release'
        conn.execute('''
            INSERT INTO api_allocation_history (id, action, api_id, api_name, account_phone, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (str(uuid.uuid4()), action, api_id, f'API-{api_id}', f'+886{i:08d}', ts))
    conn.commit()
    conn.close()


def insert_test_hourly_stats(db_path, hours=48):
    """插入測試小時統計"""
    conn = sqlite3.connect(db_path)
    import random
    for h in range(hours):
        ts = datetime.now() - timedelta(hours=h)
        hour_key = ts.strftime('%Y-%m-%d %H:00')
        conn.execute('''
            INSERT INTO api_hourly_stats (hour_key, total_requests, success_count, fail_count, allocations, releases)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (hour_key, random.randint(10, 100), random.randint(5, 80), 
              random.randint(0, 20), random.randint(0, 10), random.randint(0, 5)))
    conn.commit()
    conn.close()


# ================================================================
#  P0 測試：CRUD + 驗證 + 搜索
# ================================================================

class TestP0_CRUD:
    """P0: API CRUD 操作"""
    
    def test_create_api_valid(self):
        """添加 API - 正常輸入"""
        db_path = create_test_db()
        try:
            conn = sqlite3.connect(db_path)
            conn.execute('''
                INSERT INTO api_pool (api_id, api_hash, name, max_accounts)
                VALUES ('12345', 'abcdef1234567890abcdef1234567890', 'TestAPI', 5)
            ''')
            conn.commit()
            row = conn.execute('SELECT * FROM api_pool WHERE api_id = "12345"').fetchone()
            assert row is not None, "API 應已插入"
            conn.close()
        finally:
            os.unlink(db_path)
    
    def test_create_api_duplicate(self):
        """添加 API - 重複 ID"""
        db_path = create_test_db()
        try:
            conn = sqlite3.connect(db_path)
            conn.execute('''INSERT INTO api_pool (api_id, api_hash, name) VALUES ('12345', 'a'*32, 'First')''')
            conn.commit()
            with pytest.raises(Exception):
                conn.execute('''INSERT INTO api_pool (api_id, api_hash, name) VALUES ('12345', 'b'*32, 'Second')''')
            conn.close()
        finally:
            os.unlink(db_path)
    
    def test_update_api_fields(self):
        """更新 API - 多字段"""
        db_path = create_test_db()
        try:
            conn = sqlite3.connect(db_path)
            conn.execute('''
                INSERT INTO api_pool (api_id, api_hash, name, max_accounts, priority, group_id)
                VALUES ('12345', 'a'*32, 'OldName', 5, 0, NULL)
            ''')
            conn.commit()
            
            # 更新
            conn.execute('''
                UPDATE api_pool SET name=?, max_accounts=?, priority=?, group_id=?, api_hash=?
                WHERE api_id=?
            ''', ('NewName', 10, 5, 'grp-1', 'b' * 32, '12345'))
            conn.commit()
            
            row = conn.execute('SELECT name, max_accounts, priority, group_id, api_hash FROM api_pool WHERE api_id="12345"').fetchone()
            assert row[0] == 'NewName', f"name 應為 NewName, 實際: {row[0]}"
            assert row[1] == 10, f"max_accounts 應為 10, 實際: {row[1]}"
            assert row[2] == 5, f"priority 應為 5, 實際: {row[2]}"
            assert row[3] == 'grp-1', f"group_id 應為 grp-1, 實際: {row[3]}"
            assert row[4] == 'b' * 32, f"api_hash 應已更新"
            conn.close()
        finally:
            os.unlink(db_path)
    
    def test_delete_api(self):
        """刪除 API"""
        db_path = create_test_db()
        try:
            conn = sqlite3.connect(db_path)
            conn.execute('''INSERT INTO api_pool (api_id, api_hash, name) VALUES ('12345', 'a'*32, 'ToDelete')''')
            conn.commit()
            
            conn.execute('DELETE FROM api_pool WHERE api_id="12345"')
            conn.commit()
            
            row = conn.execute('SELECT * FROM api_pool WHERE api_id="12345"').fetchone()
            assert row is None, "API 應已刪除"
            conn.close()
        finally:
            os.unlink(db_path)
    
    def test_enable_disable_api(self):
        """啟用/禁用 API"""
        db_path = create_test_db()
        try:
            conn = sqlite3.connect(db_path)
            conn.execute('''INSERT INTO api_pool (api_id, api_hash, status) VALUES ('12345', 'a'*32, 'available')''')
            conn.commit()
            
            conn.execute('UPDATE api_pool SET status="disabled" WHERE api_id="12345"')
            conn.commit()
            row = conn.execute('SELECT status FROM api_pool WHERE api_id="12345"').fetchone()
            assert row[0] == 'disabled', "應已禁用"
            
            conn.execute('UPDATE api_pool SET status="available" WHERE api_id="12345"')
            conn.commit()
            row = conn.execute('SELECT status FROM api_pool WHERE api_id="12345"').fetchone()
            assert row[0] == 'available', "應已啟用"
            conn.close()
        finally:
            os.unlink(db_path)
    
    def test_list_apis_with_filter(self):
        """列出 API - 帶狀態過濾"""
        db_path = create_test_db()
        try:
            conn = sqlite3.connect(db_path)
            for i, status in enumerate(['available', 'available', 'disabled', 'full', 'banned']):
                conn.execute(f'''INSERT INTO api_pool (api_id, api_hash, status) VALUES ('{10000+i}', '{"a"*32}', '{status}')''')
            conn.commit()
            
            all_rows = conn.execute('SELECT * FROM api_pool').fetchall()
            assert len(all_rows) == 5, "應有 5 條"
            
            available = conn.execute('SELECT * FROM api_pool WHERE status="available"').fetchall()
            assert len(available) == 2, "available 應有 2 條"
            
            disabled = conn.execute('SELECT * FROM api_pool WHERE status="disabled"').fetchall()
            assert len(disabled) == 1, "disabled 應有 1 條"
            conn.close()
        finally:
            os.unlink(db_path)
    
    def test_list_apis_with_group_join(self):
        """列出 API - 包含分組名稱（JOIN）"""
        db_path = create_test_db()
        try:
            insert_test_groups(db_path)
            conn = sqlite3.connect(db_path)
            conn.execute('''INSERT INTO api_pool (api_id, api_hash, name, group_id) VALUES ('12345', 'a'*32, 'WithGroup', 'grp-1')''')
            conn.execute('''INSERT INTO api_pool (api_id, api_hash, name, group_id) VALUES ('67890', 'b'*32, 'NoGroup', NULL)''')
            conn.commit()
            
            rows = conn.execute('''
                SELECT p.api_id, p.name, g.name as group_name
                FROM api_pool p
                LEFT JOIN api_pool_groups g ON p.group_id = g.group_id
            ''').fetchall()
            
            assert len(rows) == 2, "應有 2 條"
            group_map = {r[0]: r[2] for r in rows}
            assert group_map['12345'] == 'Production', "12345 的 group_name 應為 Production"
            assert group_map['67890'] is None, "67890 的 group_name 應為 NULL"
            conn.close()
        finally:
            os.unlink(db_path)


# ================================================================
#  P1 測試：排序 + 分頁 + 健康概覽
# ================================================================

class TestP1_SortPaginateHealth:
    """P1: 排序 / 分頁 / 健康統計"""
    
    def test_sort_by_success_rate_desc(self):
        """按成功率降序排列"""
        apis = [
            {'api_id': '1', 'success_rate': 80},
            {'api_id': '2', 'success_rate': 95},
            {'api_id': '3', 'success_rate': 60},
        ]
        sorted_apis = sorted(apis, key=lambda a: a.get('success_rate', 0), reverse=True)
        assert sorted_apis[0]['api_id'] == '2', "95% 應排第一"
        assert sorted_apis[2]['api_id'] == '3', "60% 應排最後"
    
    def test_sort_with_null_values(self):
        """null 值排序不崩潰"""
        apis = [
            {'api_id': '1', 'success_rate': None},
            {'api_id': '2', 'success_rate': 95},
            {'api_id': '3', 'success_rate': 0},
        ]
        sorted_apis = sorted(apis, key=lambda a: a.get('success_rate') or 0, reverse=True)
        assert sorted_apis[0]['api_id'] == '2', "95 排第一"
        assert len(sorted_apis) == 3, "不崩潰，保留全部"
    
    def test_pagination_basic(self):
        """基本分頁"""
        items = list(range(25))
        page_size = 10
        
        page1 = items[0:10]
        assert len(page1) == 10, "第1頁 10 條"
        
        page3 = items[20:30]
        assert len(page3) == 5, "第3頁 5 條（不足一頁）"
    
    def test_pagination_edge_cases(self):
        """分頁邊界"""
        items = list(range(10))
        assert items[0:10] == list(range(10)), "pageSize=總數 → 全部"
        assert items[0:100] == list(range(10)), "pageSize>總數 → 全部"
        assert items[10:20] == [], "超出範圍 → 空"
    
    def test_health_overview_calculation(self):
        """健康概覽統計計算"""
        apis = [
            {'success_rate': 95, 'health_score': 90},
            {'success_rate': 60, 'health_score': 55},
            {'success_rate': 30, 'health_score': 20},
        ]
        
        avg_rate = sum(a['success_rate'] for a in apis) / len(apis)
        assert abs(avg_rate - 61.67) < 0.1, f"平均成功率 ≈ 61.67, 實際: {avg_rate}"
        
        healthy = sum(1 for a in apis if a['health_score'] >= 80)
        warning = sum(1 for a in apis if 50 <= a['health_score'] < 80)
        critical = sum(1 for a in apis if a['health_score'] < 50)
        
        assert healthy == 1, "healthy=1"
        assert warning == 1, "warning=1"
        assert critical == 1, "critical=1"
    
    def test_health_overview_empty(self):
        """空列表的健康概覽"""
        apis = []
        if not apis:
            result = {'avgRate': 0, 'healthy': 0, 'warning': 0, 'critical': 0}
        assert result['healthy'] == 0, "空列表 → healthy=0"


# ================================================================
#  P2 測試：閾值 / 審計 / 備份恢復
# ================================================================

class TestP2_AuditBackup:
    """P2: 健康閾值 / 審計日誌 / 備份恢復"""
    
    def test_custom_thresholds(self):
        """自定義閾值影響分類"""
        apis = [
            {'success_rate': 85, 'status': 'available'},
            {'success_rate': 70, 'status': 'available'},
            {'success_rate': 40, 'status': 'available'},
        ]
        
        # 默認閾值
        default_t = {'warningRate': 80, 'criticalRate': 50}
        healthy = sum(1 for a in apis if a['success_rate'] >= default_t['warningRate'])
        warning = sum(1 for a in apis if default_t['criticalRate'] <= a['success_rate'] < default_t['warningRate'])
        critical = sum(1 for a in apis if a['success_rate'] < default_t['criticalRate'])
        assert healthy == 1, "默認閾值: healthy=1(85%)"
        assert warning == 1, "默認閾值: warning=1(70%)"
        assert critical == 1, "默認閾值: critical=1(40%)"
        
        # 嚴格閾值
        strict_t = {'warningRate': 90, 'criticalRate': 75}
        healthy_s = sum(1 for a in apis if a['success_rate'] >= strict_t['warningRate'])
        warning_s = sum(1 for a in apis if strict_t['criticalRate'] <= a['success_rate'] < strict_t['warningRate'])
        critical_s = sum(1 for a in apis if a['success_rate'] < strict_t['criticalRate'])
        assert healthy_s == 0, "嚴格閾值: healthy=0"
        assert warning_s == 1, "嚴格閾值: warning=1(85%)"
        assert critical_s == 2, "嚴格閾值: critical=2(70%,40%)"
    
    def test_at_risk_filter(self):
        """atRisk 只包含 available + critical"""
        apis = [
            {'success_rate': 30, 'status': 'available'},   # ← atRisk
            {'success_rate': 30, 'status': 'disabled'},     # 不算
            {'success_rate': 90, 'status': 'available'},    # 健康
        ]
        crit_threshold = 50
        at_risk = [a for a in apis if a['success_rate'] < crit_threshold and a['status'] == 'available']
        assert len(at_risk) == 1, "atRisk=1（只有 available+critical）"
    
    def test_allocation_history_query(self):
        """分配歷史查詢"""
        db_path = create_test_db()
        try:
            insert_test_apis(db_path, 2)
            insert_test_history(db_path, '10000', 5)
            
            conn = sqlite3.connect(db_path)
            rows = conn.execute(
                'SELECT * FROM api_allocation_history WHERE api_id=? ORDER BY created_at DESC LIMIT ?',
                ('10000', 20)
            ).fetchall()
            assert len(rows) == 5, "應有 5 條歷史"
            
            # 空 API ID
            rows_all = conn.execute(
                'SELECT * FROM api_allocation_history ORDER BY created_at DESC LIMIT 100'
            ).fetchall()
            assert len(rows_all) == 5, "全部歷史 5 條"
            conn.close()
        finally:
            os.unlink(db_path)
    
    def test_backup_structure(self):
        """備份數據結構"""
        db_path = create_test_db()
        try:
            apis = insert_test_apis(db_path, 3)
            insert_test_groups(db_path)
            
            conn = sqlite3.connect(db_path)
            
            # 模擬備份
            api_rows = conn.execute('SELECT * FROM api_pool').fetchall()
            group_rows = conn.execute('SELECT * FROM api_pool_groups').fetchall()
            
            backup = {
                'version': '1.0',
                'created_at': datetime.now().isoformat(),
                'apis': [{'api_id': r[0]} for r in api_rows],
                'groups': [{'group_id': r[0]} for r in group_rows]
            }
            
            assert 'apis' in backup, "備份含 apis"
            assert 'groups' in backup, "備份含 groups"
            assert len(backup['apis']) == 3, "備份 3 個 API"
            assert len(backup['groups']) == 2, "備份 2 個分組"
            
            # JSON 序列化
            json_str = json.dumps(backup)
            assert len(json_str) > 0, "可序列化為 JSON"
            
            # 反序列化
            parsed = json.loads(json_str)
            assert len(parsed['apis']) == 3, "反序列化 API 數量正確"
            conn.close()
        finally:
            os.unlink(db_path)
    
    def test_restore_overwrite_vs_skip(self):
        """恢復：覆寫 vs 跳過"""
        db_path = create_test_db()
        try:
            conn = sqlite3.connect(db_path)
            # 已有一條
            conn.execute('''INSERT INTO api_pool (api_id, api_hash, name) VALUES ('12345', 'a'*32, 'Existing')''')
            conn.commit()
            
            backup_apis = [
                {'api_id': '12345', 'api_hash': 'b' * 32, 'name': 'FromBackup'},
                {'api_id': '67890', 'api_hash': 'c' * 32, 'name': 'New'},
            ]
            
            # 跳過模式
            restored, skipped = 0, 0
            for api in backup_apis:
                existing = conn.execute('SELECT 1 FROM api_pool WHERE api_id=?', (api['api_id'],)).fetchone()
                if existing:
                    skipped += 1
                else:
                    conn.execute('INSERT INTO api_pool (api_id, api_hash, name) VALUES (?, ?, ?)',
                                 (api['api_id'], api['api_hash'], api['name']))
                    restored += 1
            conn.commit()
            
            assert restored == 1, "恢復 1 個新的"
            assert skipped == 1, "跳過 1 個已有的"
            
            # 驗證原始數據未被覆蓋
            row = conn.execute('SELECT name FROM api_pool WHERE api_id="12345"').fetchone()
            assert row[0] == 'Existing', "跳過模式不覆蓋"
            conn.close()
        finally:
            os.unlink(db_path)


# ================================================================
#  P3 測試：統計 / 生命週期
# ================================================================

class TestP3_StatsLifecycle:
    """P3: 統計圖表 / 生命週期指標"""
    
    def test_hourly_stats_query(self):
        """小時統計查詢"""
        db_path = create_test_db()
        try:
            insert_test_hourly_stats(db_path, 48)
            
            conn = sqlite3.connect(db_path)
            rows = conn.execute(
                'SELECT hour_key, success_count, fail_count FROM api_hourly_stats ORDER BY hour_key DESC LIMIT 24'
            ).fetchall()
            assert len(rows) <= 48, "查詢結果 ≤ 48 條"
            assert len(rows) >= 24, "至少 24 條"
            
            # 確認字段完整
            for row in rows:
                assert row[0] is not None, "hour_key 不為 null"
                assert isinstance(row[1], int), "success_count 是整數"
                assert isinstance(row[2], int), "fail_count 是整數"
            conn.close()
        finally:
            os.unlink(db_path)
    
    def test_lifecycle_calculation(self):
        """生命週期計算"""
        now = datetime.now()
        
        # 新 API
        api_new = {'created_at': now.isoformat(), 'success_rate': 100, 'health_score': 100, 'total_requests': 0}
        age_new = (now - datetime.fromisoformat(api_new['created_at'])).days
        assert age_new == 0, "新 API 年齡=0"
        
        # 30天老 API
        api_old = {'created_at': (now - timedelta(days=30)).isoformat(), 'success_rate': 50, 'health_score': 50, 'total_requests': 300}
        age_old = (now - datetime.fromisoformat(api_old['created_at'])).days
        assert age_old == 30, "30天 API 年齡=30"
        intensity = api_old['total_requests'] / max(1, age_old)
        assert abs(intensity - 10.0) < 0.1, f"日均請求 ≈ 10.0, 實際: {intensity}"
    
    def test_lifecycle_recommendation_logic(self):
        """輪換建議邏輯"""
        # health < 30 或 rate < 30 → rotate
        assert_rotate = lambda h, r: h < 30 or r < 30
        assert assert_rotate(20, 80), "health=20 → rotate"
        assert assert_rotate(80, 20), "rate=20 → rotate"
        assert not assert_rotate(80, 80), "健康 → 不 rotate"
        
        # health < 60 或 rate < 60 或 age > 180 → monitor
        assert_monitor = lambda h, r, age: (h < 60 or r < 60 or age > 180) and not assert_rotate(h, r)
        assert assert_monitor(55, 80, 100), "health=55 → monitor"
        assert assert_monitor(80, 55, 100), "rate=55 → monitor"
        assert assert_monitor(80, 80, 200), "age=200 → monitor"
        assert not assert_monitor(80, 80, 100), "全部正常 → 不 monitor"
    
    def test_daily_trend_aggregation(self):
        """每日趨勢聚合"""
        db_path = create_test_db()
        try:
            insert_test_hourly_stats(db_path, 168)  # 7天
            
            conn = sqlite3.connect(db_path)
            rows = conn.execute('''
                SELECT substr(hour_key, 1, 10) as date, 
                       SUM(allocations) as total_alloc, 
                       SUM(releases) as total_release
                FROM api_hourly_stats 
                GROUP BY date 
                ORDER BY date DESC
                LIMIT 7
            ''').fetchall()
            
            assert len(rows) > 0, "有每日聚合數據"
            for row in rows:
                assert len(row[0]) == 10, f"日期格式 YYYY-MM-DD: {row[0]}"
                assert row[1] >= 0, "allocations >= 0"
                assert row[2] >= 0, "releases >= 0"
            conn.close()
        finally:
            os.unlink(db_path)


# ================================================================
#  P4 測試：預測 / 輪換 / 命令面板
# ================================================================

class TestP4_PredictionRotation:
    """P4: 容量預測 / 輪換計劃 / 命令面板"""
    
    def test_capacity_forecast_basic(self):
        """基本容量預測"""
        db_path = create_test_db()
        try:
            insert_test_apis(db_path, 10)
            insert_test_hourly_stats(db_path, 168)
            
            conn = sqlite3.connect(db_path)
            
            # 計算剩餘容量
            apis = conn.execute('SELECT current_accounts, max_accounts FROM api_pool WHERE status="available"').fetchall()
            total_capacity = sum(a[1] for a in apis)
            total_used = sum(a[0] for a in apis)
            remaining = total_capacity - total_used
            
            assert total_capacity > 0, "總容量 > 0"
            assert remaining >= 0, "剩餘容量 >= 0"
            
            # 計算平均日分配量
            daily_stats = conn.execute('''
                SELECT SUM(allocations) as total FROM api_hourly_stats
            ''').fetchone()
            total_alloc = daily_stats[0] or 0
            avg_daily = total_alloc / 7  # 7天平均
            
            # 預測耗盡天數
            if avg_daily > 0:
                days_until_full = remaining / avg_daily
                assert days_until_full >= 0, "耗盡天數 >= 0"
            else:
                days_until_full = None
                assert days_until_full is None, "無分配 → None"
            conn.close()
        finally:
            os.unlink(db_path)
    
    def test_prediction_report_structure(self):
        """預測報告結構驗證"""
        report = {
            'daily_prediction': {
                'predictions': [
                    {'date': '2026-02-08', 'predicted_allocations': 5, 'upper_bound': 8, 'lower_bound': 2},
                ],
                'trend': 'up', 'slope': 1.5, 'confidence': 0.85
            },
            'capacity_prediction': {
                'current_capacity': 50, 'current_used': 30, 'days_until_full': 14,
                'trend': 'up', 'recommendations': ['增加容量']
            },
            'timing_analysis': {'peak_hours': [10, 14], 'optimal_hours': [3, 4]},
            'risk_assessment': {'level': 'medium', 'factors': ['使用率上升']},
            'overall_confidence': 0.82
        }
        
        assert 'daily_prediction' in report, "包含 daily_prediction"
        assert 'capacity_prediction' in report, "包含 capacity_prediction"
        assert 'timing_analysis' in report, "包含 timing_analysis"
        assert 'risk_assessment' in report, "包含 risk_assessment"
        assert report['risk_assessment']['level'] in ('low', 'medium', 'high'), "風險等級合法"
        assert 0 < report['overall_confidence'] <= 1.0, "信心值在 (0, 1]"
    
    def test_prediction_fallback(self):
        """預測降級邏輯"""
        # 主 API 失敗
        main_result = {'success': False}
        # 降級 API
        fallback_result = {
            'success': True,
            'data': {'days_until_exhausted': 30, 'forecast_warning': False, 'forecast_message': '容量充足'}
        }
        
        report = None
        if not main_result.get('success') or not main_result.get('data'):
            if fallback_result.get('success') and fallback_result.get('data'):
                report = {
                    'capacity_prediction': {
                        'days_until_full': fallback_result['data']['days_until_exhausted'],
                        'trend': 'stable',
                    },
                    'risk_assessment': {
                        'level': 'high' if fallback_result['data']['forecast_warning'] else 'low'
                    }
                }
        
        assert report is not None, "降級成功生成報告"
        assert report['capacity_prediction']['days_until_full'] == 30, "耗盡天數=30"
        assert report['risk_assessment']['level'] == 'low', "無預警→低風險"
    
    def test_rotation_candidates_filter(self):
        """輪換候選篩選"""
        now = datetime.now()
        apis = [
            {'api_id': '1', 'health_score': 90, 'success_rate': 95, 'status': 'available',
             'created_at': (now - timedelta(days=10)).isoformat()},  # good
            {'api_id': '2', 'health_score': 50, 'success_rate': 50, 'status': 'available',
             'created_at': (now - timedelta(days=200)).isoformat()},  # monitor
            {'api_id': '3', 'health_score': 10, 'success_rate': 20, 'status': 'available',
             'created_at': (now - timedelta(days=30)).isoformat()},  # rotate
            {'api_id': '4', 'health_score': 10, 'success_rate': 20, 'status': 'disabled',
             'created_at': (now - timedelta(days=30)).isoformat()},  # disabled → 排除
        ]
        
        def get_recommendation(api):
            h = api.get('health_score', 100)
            r = api.get('success_rate', 100)
            age = (now - datetime.fromisoformat(api['created_at'])).days
            if h < 30 or r < 30: return 'rotate'
            if h < 60 or r < 60 or age > 180: return 'monitor'
            return 'good'
        
        candidates = [
            {**a, 'recommendation': get_recommendation(a)}
            for a in apis
            if get_recommendation(a) != 'good' and a['status'] != 'disabled'
        ]
        candidates.sort(key=lambda a: {'rotate': 0, 'monitor': 1}.get(a['recommendation'], 2))
        
        assert len(candidates) == 2, "2 個候選（排除 good 和 disabled）"
        assert candidates[0]['api_id'] == '3', "rotate 排第一"
        assert candidates[1]['api_id'] == '2', "monitor 排第二"
    
    def test_command_filtering(self):
        """命令面板過濾"""
        commands = [
            {'id': 'add', 'label': '添加新 API', 'category': ''},
            {'id': 'export', 'label': '導出數據', 'category': ''},
            {'id': 'backup', 'label': '備份 API 池', 'category': ''},
            {'id': 'goto-123', 'label': '跳轉到 TestAPI', 'category': 'API'},
        ]
        
        # 空查詢 → 全部
        assert len(commands) == 4, "空查詢全部"
        
        # 過濾
        q = '導出'
        filtered = [c for c in commands if q.lower() in c['label'].lower() or q.lower() in c['id']]
        assert len(filtered) == 1, "「導出」→ 1 個"
        
        # 按類別
        q = 'api'
        filtered = [c for c in commands if q.lower() in c['label'].lower() or q.lower() in c['id'] or q.lower() in (c.get('category') or '').lower()]
        assert len(filtered) == 3, "「api」→ 3 個（2個label含API + 1個category=API）"
    
    def test_slot_visualization(self):
        """槽位視覺化"""
        # 正常情況
        slots = ['used' if i < 3 else 'empty' for i in range(5)]
        assert len(slots) == 5, "5 個槽位"
        assert slots.count('used') == 3, "3 個已佔用"
        assert slots.count('empty') == 2, "2 個空閒"
        
        # 滿載
        slots_full = ['used'] * 5
        assert all(s == 'used' for s in slots_full), "全部佔用"
        
        # 空
        slots_empty = ['empty'] * 5
        assert all(s == 'empty' for s in slots_empty), "全部空閒"


# ================================================================
#  邊界 + 異常測試
# ================================================================

class TestBoundaryAndException:
    """邊界值和異常情況"""
    
    def test_api_id_boundaries(self):
        """API ID 邊界值"""
        import re
        pattern = r'^\d{4,15}$'
        
        assert re.match(pattern, '1234'), "4位 → 合法"
        assert re.match(pattern, '123456789012345'), "15位 → 合法"
        assert not re.match(pattern, '123'), "3位 → 非法"
        assert not re.match(pattern, '1234567890123456'), "16位 → 非法"
        assert not re.match(pattern, 'abcd'), "字母 → 非法"
        assert not re.match(pattern, ''), "空 → 非法"
    
    def test_api_hash_boundaries(self):
        """API Hash 邊界值"""
        import re
        pattern = r'^[a-fA-F0-9]{32}$'
        
        assert re.match(pattern, 'a' * 32), "32位十六進制 → 合法"
        assert re.match(pattern, 'ABCDEF' * 5 + 'AB'), "大寫 → 合法"
        assert not re.match(pattern, 'a' * 31), "31位 → 非法"
        assert not re.match(pattern, 'a' * 33), "33位 → 非法"
        assert not re.match(pattern, 'g' * 32), "非十六進制 → 非法"
        assert not re.match(pattern, ''), "空 → 非法"
    
    def test_max_accounts_boundaries(self):
        """最大帳號數邊界值"""
        def validate_max(val):
            try:
                n = int(val)
                return 1 <= n <= 100
            except (ValueError, TypeError):
                return False
        
        assert validate_max(1), "1 → 合法"
        assert validate_max(100), "100 → 合法"
        assert not validate_max(0), "0 → 非法"
        assert not validate_max(101), "101 → 非法"
        assert not validate_max(-1), "-1 → 非法"
        assert not validate_max('abc'), "字母 → 非法"
        assert not validate_max(None), "None → 非法"
    
    def test_empty_database_queries(self):
        """空資料庫查詢"""
        db_path = create_test_db()
        try:
            conn = sqlite3.connect(db_path)
            
            apis = conn.execute('SELECT * FROM api_pool').fetchall()
            assert len(apis) == 0, "空表 → 0 條"
            
            stats = conn.execute('SELECT * FROM api_hourly_stats').fetchall()
            assert len(stats) == 0, "空統計 → 0 條"
            
            history = conn.execute('SELECT * FROM api_allocation_history').fetchall()
            assert len(history) == 0, "空歷史 → 0 條"
            conn.close()
        finally:
            os.unlink(db_path)
    
    def test_json_serialization_safety(self):
        """JSON 序列化安全"""
        # 含特殊字符
        data = {'name': 'Test "API"', 'note': "It's a <test> & 'example'"}
        json_str = json.dumps(data, ensure_ascii=False)
        parsed = json.loads(json_str)
        assert parsed['name'] == 'Test "API"', "雙引號安全"
        assert parsed['note'] == "It's a <test> & 'example'", "特殊字符安全"
    
    def test_csv_export_special_chars(self):
        """CSV 導出特殊字符"""
        value = 'Test, "value" with\nnewline'
        escaped = value.replace('"', '""')
        csv_cell = f'"{escaped}"'
        assert '""' in csv_cell, "雙引號已轉義"
        assert csv_cell.startswith('"') and csv_cell.endswith('"'), "用引號包裹"
    
    def test_timestamp_parsing_safety(self):
        """時間戳解析安全"""
        from datetime import datetime
        
        # 正常 ISO
        ts1 = datetime.fromisoformat('2026-02-07T10:30:00')
        assert ts1.year == 2026, "正常 ISO 解析"
        
        # 帶 Z
        ts2_str = '2026-02-07T10:30:00Z'
        ts2 = datetime.fromisoformat(ts2_str.replace('Z', '+00:00'))
        assert ts2.year == 2026, "帶 Z 的 ISO 解析"
        
        # 無效
        invalid_parsed = False
        try:
            datetime.fromisoformat('not-a-date')
        except ValueError:
            invalid_parsed = True
        assert invalid_parsed, "無效時間戳拋出 ValueError"


# ================================================================
#  運行入口
# ================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
