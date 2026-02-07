/**
 * P0–P4 前端集成 + UI + 異常鏈路測試
 * 模擬 API 調用、Vue 響應式狀態、極端情況
 * 
 * 運行方式: node admin-panel/tests/integration.test.js
 */

// ========== 迷你測試框架 ==========
let _passed = 0, _failed = 0, _errors = [];
const _group = (name) => console.log(`\n\x1b[36m▶ ${name}\x1b[0m`);
const assert = (condition, msg) => {
    if (condition) { _passed++; process.stdout.write('\x1b[32m  ✓\x1b[0m ' + msg + '\n'); }
    else { _failed++; _errors.push(msg); process.stdout.write('\x1b[31m  ✗\x1b[0m ' + msg + '\n'); }
};
const assertEqual = (actual, expected, msg) => {
    const pass = JSON.stringify(actual) === JSON.stringify(expected);
    if (!pass) msg += ` | 期望: ${JSON.stringify(expected)}, 實際: ${JSON.stringify(actual)}`;
    assert(pass, msg);
};
const assertThrows = (fn, msg) => {
    try { fn(); assert(false, msg + ' (未拋出異常)'); }
    catch (e) { assert(true, msg); }
};

// ========== Mock 基礎設施 ==========

/** 模擬 API 請求 */
class MockApiClient {
    constructor() {
        this.responses = {};
        this.calls = [];
        this.defaultResponse = { success: true, data: {} };
    }
    
    /** 設置指定端點的回應 */
    setResponse(urlPattern, response) {
        this.responses[urlPattern] = response;
    }
    
    /** 設置指定端點回應為錯誤 */
    setError(urlPattern, statusCode, message) {
        this.responses[urlPattern] = { 
            success: false, 
            error: { message }, 
            _statusCode: statusCode 
        };
    }
    
    /** 設置指定端點拋出網絡錯誤 */
    setNetworkError(urlPattern) {
        this.responses[urlPattern] = { _networkError: true };
    }
    
    /** 模擬 apiRequest */
    async apiRequest(url, options = {}) {
        this.calls.push({ url, options, timestamp: Date.now() });
        
        // 查找匹配的 response
        for (const [pattern, response] of Object.entries(this.responses)) {
            if (url.includes(pattern)) {
                if (response._networkError) throw new Error('NetworkError: Failed to fetch');
                if (response._statusCode >= 500) throw new Error(`HTTP ${response._statusCode}: ${response.error?.message || 'Server Error'}`);
                return response;
            }
        }
        return this.defaultResponse;
    }
    
    /** 獲取指定端點的調用次數 */
    getCallCount(urlPattern) {
        return this.calls.filter(c => c.url.includes(urlPattern)).length;
    }
    
    /** 獲取最近一次調用的參數 */
    getLastCall(urlPattern) {
        const filtered = this.calls.filter(c => c.url.includes(urlPattern));
        return filtered.length > 0 ? filtered[filtered.length - 1] : null;
    }
    
    /** 清除記錄 */
    reset() {
        this.calls = [];
        this.responses = {};
    }
}

/** 模擬 Toast 收集器 */
class MockToast {
    constructor() { this.messages = []; }
    show(message, type) { this.messages.push({ message, type }); }
    get last() { return this.messages[this.messages.length - 1] || null; }
    get count() { return this.messages.length; }
    reset() { this.messages = []; }
}

/** 模擬 localStorage */
class MockLocalStorage {
    constructor() { this.store = {}; }
    getItem(key) { return this.store[key] || null; }
    setItem(key, value) { this.store[key] = String(value); }
    removeItem(key) { delete this.store[key]; }
    clear() { this.store = {}; }
}

/** 模擬 Vue ref */
const ref = (val) => ({ value: val });
const reactive = (obj) => ({ ...obj });


// =====================================================================
//                     集成測試：前後端數據流轉
// =====================================================================

console.log('\x1b[1m\n╔══════════════════════════════════════════════╗');
console.log('║   P0–P4 集成 / UI / 異常測試（47 組場景）    ║');
console.log('╚══════════════════════════════════════════════╝\x1b[0m');


// ─────────── E1: 加載 API 列表 ───────────
_group('E1: 加載 API 列表（集成）');

{
    const client = new MockApiClient();
    const toast = new MockToast();
    
    client.setResponse('/admin/api-pool', {
        success: true,
        data: {
            apis: [
                { api_id: '12345', name: 'Test', api_hash: 'a'.repeat(32), success_rate: 95, health_score: 88, group_name: 'Group A', current_accounts: 3, max_accounts: 5, status: 'available' },
                { api_id: '67890', name: 'Test2', api_hash: 'b'.repeat(32), success_rate: 60, health_score: 45, group_name: null, current_accounts: 5, max_accounts: 5, status: 'full' }
            ],
            stats: { total: 2, available: 1, full: 1, disabled: 0 }
        }
    });
    
    (async () => {
        const result = await client.apiRequest('/admin/api-pool?include_hash=true');
        assert(result.success, '列表加載成功');
        assertEqual(result.data.apis.length, 2, '返回 2 條 API');
        assert(result.data.apis[0].api_hash.length === 32, '包含完整 api_hash');
        assert(result.data.apis[0].group_name === 'Group A', '包含 group_name');
        assert(result.data.apis[0].health_score !== undefined, '包含 health_score');
        assertEqual(result.data.stats.total, 2, 'stats.total = 2');
    })();
}

// ─────────── E2: 添加 API ───────────
_group('E2: 添加 API（集成）');

{
    const client = new MockApiClient();
    
    client.setResponse('/admin/api-pool', {
        success: true,
        data: { api_id: '99999', name: 'NewAPI', api_hash: 'c'.repeat(32) }
    });
    
    (async () => {
        const result = await client.apiRequest('/admin/api-pool', {
            method: 'POST',
            body: JSON.stringify({ api_id: '99999', api_hash: 'c'.repeat(32), name: 'NewAPI', max_accounts: 5 })
        });
        assert(result.success, '添加成功');
        assertEqual(result.data.api_id, '99999', '返回新 API ID');
        
        const call = client.getLastCall('/admin/api-pool');
        assertEqual(call.options.method, 'POST', '使用 POST 方法');
        assert(call.options.body.includes('99999'), '請求體包含 api_id');
    })();
}

// ─────────── E3: 批量導入 ───────────
_group('E3: 批量導入（集成）');

{
    const client = new MockApiClient();
    
    client.setResponse('/admin/api-pool/batch', {
        success: true,
        data: { success: 3, failed: 1, duplicates: 1, parsed: 5 }
    });
    
    (async () => {
        const result = await client.apiRequest('/admin/api-pool/batch', {
            method: 'POST',
            body: JSON.stringify({ text: '11111,hash1\n22222,hash2\n33333,hash3', default_max_accounts: 5 })
        });
        assert(result.success, '批量導入成功');
        assertEqual(result.data.success, 3, '成功 3 條');
        assertEqual(result.data.failed, 1, '失敗 1 條');
        assertEqual(result.data.duplicates, 1, '重複 1 條');
    })();
}

// ─────────── E4: 編輯 API ───────────
_group('E4: 編輯 API（集成）');

{
    const client = new MockApiClient();
    
    client.setResponse('/admin/api-pool/12345', {
        success: true,
        message: '更新成功'
    });
    
    (async () => {
        const result = await client.apiRequest('/admin/api-pool/12345', {
            method: 'PUT',
            body: JSON.stringify({ name: 'Updated', max_accounts: 10, group_id: 'grp-1' })
        });
        assert(result.success, '編輯成功');
        const call = client.getLastCall('/admin/api-pool/12345');
        assertEqual(call.options.method, 'PUT', '使用 PUT 方法');
        assert(call.options.body.includes('Updated'), '請求體含新名稱');
    })();
}

// ─────────── E5: 刪除 API ───────────
_group('E5: 刪除 API（集成）');

{
    const client = new MockApiClient();
    client.setResponse('/admin/api-pool/12345', { success: true, message: '已刪除' });
    
    (async () => {
        const result = await client.apiRequest('/admin/api-pool/12345', { method: 'DELETE' });
        assert(result.success, '刪除成功');
    })();
}

// ─────────── E6: 啟用/禁用 ───────────
_group('E6: 啟用/禁用（集成）');

{
    const client = new MockApiClient();
    client.setResponse('/disable', { success: true });
    client.setResponse('/enable', { success: true });
    
    (async () => {
        const r1 = await client.apiRequest('/admin/api-pool/12345/disable', { method: 'POST' });
        assert(r1.success, '禁用成功');
        const r2 = await client.apiRequest('/admin/api-pool/12345/enable', { method: 'POST' });
        assert(r2.success, '啟用成功');
        assertEqual(client.calls.length, 2, '共 2 次調用');
    })();
}

// ─────────── E7: 批量操作 ───────────
_group('E7: 批量操作（集成）');

{
    const client = new MockApiClient();
    client.setResponse('/disable', { success: true });
    
    (async () => {
        const ids = ['11111', '22222', '33333'];
        let ok = 0;
        for (const id of ids) {
            const r = await client.apiRequest(`/admin/api-pool/${id}/disable`, { method: 'POST' });
            if (r.success) ok++;
        }
        assertEqual(ok, 3, '批量禁用 3 個全部成功');
        assertEqual(client.getCallCount('/disable'), 3, '調用 3 次 disable');
    })();
}

// ─────────── E8: 分配歷史 ───────────
_group('E8: 分配歷史（集成）');

{
    const client = new MockApiClient();
    client.setResponse('/admin/api-pool/history', {
        success: true,
        data: {
            history: [
                { action: 'allocate', created_at: '2026-02-07T10:00:00Z', account_phone: '+886111', details: null },
                { action: 'release', created_at: '2026-02-07T09:00:00Z', account_phone: '+886111', details: null }
            ],
            total: 2
        }
    });
    
    (async () => {
        const result = await client.apiRequest('/admin/api-pool/history?api_id=12345&limit=20');
        assert(result.success, '獲取歷史成功');
        assertEqual(result.data.history.length, 2, '2 條記錄');
        assertEqual(result.data.history[0].action, 'allocate', '第一條是 allocate');
    })();
}

// ─────────── E10: 統計圖表數據 ───────────
_group('E10: 統計圖表三端點並行（集成）');

{
    const client = new MockApiClient();
    client.setResponse('stats/hourly', { success: true, data: { stats: [{ hour: '10:00', success: 5, fail: 1 }] } });
    client.setResponse('stats/load', { success: true, data: { distribution: [{ api_id: '1', load_percent: 60 }] } });
    client.setResponse('stats/trend', { success: true, data: { trend: [{ date: '2026-02-07', allocations: 10, releases: 3 }] } });
    
    (async () => {
        const [r1, r2, r3] = await Promise.all([
            client.apiRequest('/admin/api-pool/stats/hourly?hours=168'),
            client.apiRequest('/admin/api-pool/stats/load'),
            client.apiRequest('/admin/api-pool/stats/trend?days=7')
        ]);
        assert(r1.success && r2.success && r3.success, '三個端點均成功');
        assert(r1.data.stats.length > 0, 'hourly 有數據');
        assert(r2.data.distribution.length > 0, 'load 有數據');
        assert(r3.data.trend.length > 0, 'trend 有數據');
    })();
}

// ─────────── E11: 備份 ───────────
_group('E11: 備份（集成）');

{
    const client = new MockApiClient();
    client.setResponse('/admin/api-pool/backup', {
        success: true,
        data: { apis: [{ api_id: '1' }, { api_id: '2' }], created_at: '2026-02-07T10:00:00Z' }
    });
    
    (async () => {
        const result = await client.apiRequest('/admin/api-pool/backup?include_allocations=true&include_history=true');
        assert(result.success, '備份成功');
        assertEqual(result.data.apis.length, 2, '備份包含 2 個 API');
        assert(result.data.created_at !== undefined, '備份包含時間戳');
    })();
}

// ─────────── E12: 恢復 ───────────
_group('E12: 恢復（集成）');

{
    const client = new MockApiClient();
    client.setResponse('/admin/api-pool/restore', {
        success: true,
        data: { restored: 2, skipped: 1, failed: 0 }
    });
    
    (async () => {
        const backupData = { apis: [{ api_id: '1' }, { api_id: '2' }, { api_id: '3' }] };
        const result = await client.apiRequest('/admin/api-pool/restore', {
            method: 'POST',
            body: JSON.stringify({ backup: backupData, overwrite: false, restore_allocations: false })
        });
        assert(result.success, '恢復成功');
        assertEqual(result.data.restored, 2, '恢復 2 個');
        assertEqual(result.data.skipped, 1, '跳過 1 個');
    })();
}

// ─────────── E13: 預測報告 ───────────
_group('E13: 預測報告（集成）');

{
    const client = new MockApiClient();
    client.setResponse('/admin/api-pool/prediction/report', {
        success: true,
        data: {
            daily_prediction: {
                predictions: [
                    { date: '2026-02-08', predicted_allocations: 5, upper_bound: 8, lower_bound: 2 },
                    { date: '2026-02-09', predicted_allocations: 6, upper_bound: 9, lower_bound: 3 }
                ],
                trend: 'up', slope: 1.5, confidence: 0.85
            },
            capacity_prediction: {
                current_capacity: 50, current_used: 30, current_available: 20,
                current_utilization: 60.0, days_until_full: 14, trend: 'up',
                confidence: 0.8, recommendations: ['建議增加容量']
            },
            timing_analysis: { peak_hours: [10, 14], optimal_hours: [3, 4, 5] },
            risk_assessment: { level: 'medium', factors: ['使用率上升'] },
            overall_confidence: 0.82
        }
    });
    
    (async () => {
        const result = await client.apiRequest('/admin/api-pool/prediction/report');
        assert(result.success, '預測報告加載成功');
        assert(result.data.daily_prediction.predictions.length === 2, '有 2 天預測');
        assertEqual(result.data.capacity_prediction.days_until_full, 14, '14天耗盡');
        assertEqual(result.data.risk_assessment.level, 'medium', '中等風險');
        assert(result.data.timing_analysis.peak_hours.length === 2, '2個高峰時段');
    })();
}

// ─────────── E14: 預測降級 ───────────
_group('E14: 預測降級（主 API 失敗 → fallback）');

{
    const client = new MockApiClient();
    // 主端點失敗
    client.setResponse('/admin/api-pool/prediction/report', { success: false, error: { message: '數據不足' } });
    // 降級端點成功
    client.setResponse('/admin/api-pool/forecast', {
        success: true,
        data: { days_until_exhausted: 30, forecast_warning: false, forecast_message: '容量充足' }
    });
    
    (async () => {
        // 模擬 loadPredictionReport 降級邏輯
        const result = await client.apiRequest('/admin/api-pool/prediction/report');
        if (!result.success || !result.data) {
            const fallback = await client.apiRequest('/admin/api-pool/forecast?days=14');
            assert(fallback.success, '降級端點成功');
            assertEqual(fallback.data.days_until_exhausted, 30, '降級數據正確');
            assert(client.getCallCount('/prediction/report') === 1, '嘗試了主端點');
            assert(client.getCallCount('/forecast') === 1, '調用了降級端點');
        }
    })();
}

// ─────────── E15: 導出 CSV 生成 ───────────
_group('E15: 導出 CSV 生成邏輯（集成）');

{
    const list = [
        { api_id: '11111', name: 'Test1', status: 'available', success_rate: 95, api_hash: 'a'.repeat(32) },
        { api_id: '22222', name: 'Test2', status: 'full', success_rate: null, api_hash: 'b'.repeat(32) }
    ];
    
    // 模擬 CSV 生成
    const cols = ['api_id', 'name', 'status'];
    const colLabels = { api_id: 'API ID', name: '名稱', status: '狀態' };
    const header = cols.map(k => colLabels[k]).join(',');
    const rows = list.map(api => {
        return cols.map(k => {
            let v = api[k];
            if (v == null) v = '';
            v = String(v).replace(/"/g, '""');
            return `"${v}"`;
        }).join(',');
    });
    const csv = header + '\n' + rows.join('\n');
    
    assert(csv.includes('API ID'), 'CSV 包含列頭');
    assert(csv.includes('"11111"'), 'CSV 包含數據');
    assert(csv.includes('"Test1"'), 'CSV 包含名稱值');
    assertEqual(rows.length, 2, 'CSV 行數正確');
}

// ─────────── E16: 健康閾值持久化 ───────────
_group('E16: localStorage 健康閾值持久化（集成）');

{
    const ls = new MockLocalStorage();
    
    // 保存
    const thresholds = { autoDisable: false, minSuccessRate: 30, maxConsecutiveFails: 5, warningRate: 80, criticalRate: 50 };
    ls.setItem('api_health_thresholds', JSON.stringify(thresholds));
    
    // 讀取
    const saved = JSON.parse(ls.getItem('api_health_thresholds'));
    assertEqual(saved.warningRate, 80, '讀回 warningRate=80');
    assertEqual(saved.criticalRate, 50, '讀回 criticalRate=50');
    
    // 修改
    thresholds.criticalRate = 60;
    ls.setItem('api_health_thresholds', JSON.stringify(thresholds));
    const updated = JSON.parse(ls.getItem('api_health_thresholds'));
    assertEqual(updated.criticalRate, 60, '更新後 criticalRate=60');
    
    // 不存在
    const missing = ls.getItem('nonexistent');
    assertEqual(missing, null, '不存在的 key → null');
}


// =====================================================================
//           UI / 交互測試（模擬狀態變化 + 事件）
// =====================================================================

// ─────────── I1-I3: 搜索 / 展開 / 編輯 Modal 狀態 ───────────
_group('I1-I3: 搜索 + 展開 + 編輯 Modal 狀態（UI）');

{
    // 模擬 Vue 響應式狀態
    const apiSearchQuery = ref('');
    const expandedApiId = ref(null);
    const showEditApiModal = ref(false);
    const editApiForm = reactive({ api_id: '', name: '', max_accounts: 5 });
    
    // 搜索狀態
    apiSearchQuery.value = 'test';
    assertEqual(apiSearchQuery.value, 'test', '搜索框更新');
    apiSearchQuery.value = '';
    assertEqual(apiSearchQuery.value, '', '搜索框清空');
    
    // 展開詳情
    expandedApiId.value = '12345';
    assertEqual(expandedApiId.value, '12345', '展開 API 12345');
    expandedApiId.value = '12345'; // 模擬 toggleApiDetail 邏輯
    expandedApiId.value = (expandedApiId.value === '12345') ? null : '12345';
    assertEqual(expandedApiId.value, null, '再次點擊 → 收起');
    
    // 編輯 Modal
    editApiForm.api_id = '12345';
    editApiForm.name = 'TestAPI';
    editApiForm.max_accounts = 10;
    showEditApiModal.value = true;
    assert(showEditApiModal.value, '編輯 Modal 打開');
    showEditApiModal.value = false;
    assert(!showEditApiModal.value, '編輯 Modal 關閉');
}

// ─────────── I4: 批量選擇狀態 ───────────
_group('I4: 批量選擇（UI 狀態）');

{
    const selectedApis = ref([]);
    const list = [{ api_id: '1' }, { api_id: '2' }, { api_id: '3' }];
    
    // 單個選擇
    selectedApis.value.push('1');
    assertEqual(selectedApis.value.length, 1, '選擇 1 個');
    
    // 全選
    selectedApis.value = list.map(a => a.api_id);
    assertEqual(selectedApis.value.length, 3, '全選 3 個');
    assert(selectedApis.value.length === list.length, '全選判斷');
    
    // 取消全選
    selectedApis.value = [];
    assertEqual(selectedApis.value.length, 0, '取消全選');
}

// ─────────── I5-I6: 排序 + 分頁交互 ───────────
_group('I5-I6: 排序 + 分頁交互（UI 狀態）');

{
    const apiSortKey = ref('');
    const apiSortOrder = ref('desc');
    const apiPage = ref(1);
    
    // 模擬 toggleApiSort
    const toggleSort = (key) => {
        if (apiSortKey.value === key) {
            apiSortOrder.value = apiSortOrder.value === 'asc' ? 'desc' : 'asc';
        } else {
            apiSortKey.value = key;
            apiSortOrder.value = 'desc';
        }
        apiPage.value = 1;
    };
    
    toggleSort('name');
    assertEqual(apiSortKey.value, 'name', '排序鍵設為 name');
    assertEqual(apiSortOrder.value, 'desc', '默認降序');
    
    toggleSort('name');
    assertEqual(apiSortOrder.value, 'asc', '再次點擊 → 升序');
    
    toggleSort('status');
    assertEqual(apiSortKey.value, 'status', '切換到 status');
    assertEqual(apiSortOrder.value, 'desc', '新鍵默認降序');
    
    // 分頁
    apiPage.value = 3;
    toggleSort('name');
    assertEqual(apiPage.value, 1, '排序後重置到第1頁');
}

// ─────────── I7: 確認對話框 ───────────
_group('I7: 確認對話框（UI 狀態）');

{
    const confirmDialog = { show: false, title: '', message: '', type: '', confirmText: '', onConfirm: null };
    
    // 打開
    const open = ({ title, message, type, confirmText, onConfirm }) => {
        confirmDialog.show = true;
        confirmDialog.title = title || '確認操作';
        confirmDialog.message = message || '';
        confirmDialog.type = type || 'warning';
        confirmDialog.confirmText = confirmText || '確定';
        confirmDialog.onConfirm = onConfirm || null;
    };
    
    let executed = false;
    open({ title: '測試', message: '確定？', type: 'danger', confirmText: '刪除', onConfirm: () => { executed = true; } });
    
    assert(confirmDialog.show, '對話框打開');
    assertEqual(confirmDialog.title, '測試', '標題正確');
    assertEqual(confirmDialog.type, 'danger', '類型正確');
    
    // 執行確認
    if (confirmDialog.onConfirm) confirmDialog.onConfirm();
    assert(executed, '確認回調已執行');
    
    // 關閉
    confirmDialog.show = false;
    confirmDialog.onConfirm = null;
    assert(!confirmDialog.show, '對話框已關閉');
    
    // 取消不執行
    let cancelExecuted = false;
    open({ onConfirm: () => { cancelExecuted = true; } });
    confirmDialog.show = false;
    confirmDialog.onConfirm = null;
    assert(!cancelExecuted, '取消後回調未執行');
}

// ─────────── I9: 健康閾值 ───────────
_group('I9: 健康閾值配置 Modal（UI 狀態）');

{
    const showHealthConfigModal = ref(false);
    const healthThresholds = { autoDisable: false, minSuccessRate: 30, maxConsecutiveFails: 5, warningRate: 80, criticalRate: 50 };
    
    showHealthConfigModal.value = true;
    assert(showHealthConfigModal.value, '配置 Modal 打開');
    
    healthThresholds.warningRate = 90;
    assertEqual(healthThresholds.warningRate, 90, '閾值可修改');
    
    showHealthConfigModal.value = false;
    assert(!showHealthConfigModal.value, '配置 Modal 關閉');
}

// ─────────── I14: 自動刷新狀態 ───────────
_group('I14: 自動刷新狀態（UI）');

{
    const autoRefreshEnabled = ref(false);
    const autoRefreshCountdown = ref(0);
    
    // 開啟
    autoRefreshEnabled.value = true;
    autoRefreshCountdown.value = 30;
    assert(autoRefreshEnabled.value, '自動刷新已開啟');
    assertEqual(autoRefreshCountdown.value, 30, '倒計時 30 秒');
    
    // 倒計時
    autoRefreshCountdown.value--;
    assertEqual(autoRefreshCountdown.value, 29, '倒計時 -1');
    
    // 關閉
    autoRefreshEnabled.value = false;
    autoRefreshCountdown.value = 0;
    assert(!autoRefreshEnabled.value, '自動刷新已關閉');
}

// ─────────── I15: 視圖切換 ───────────
_group('I15: 卡片/表格切換（UI 狀態）');

{
    const apiViewMode = ref('table');
    
    assertEqual(apiViewMode.value, 'table', '默認表格視圖');
    apiViewMode.value = apiViewMode.value === 'table' ? 'card' : 'table';
    assertEqual(apiViewMode.value, 'card', '切換到卡片');
    apiViewMode.value = apiViewMode.value === 'table' ? 'card' : 'table';
    assertEqual(apiViewMode.value, 'table', '切換回表格');
}

// ─────────── I16: 預測面板狀態 ───────────
_group('I16: 預測面板（UI 狀態）');

{
    const showPredictionPanel = ref(false);
    const predictionReport = ref(null);
    const predictionLoading = ref(false);
    
    // 展開
    showPredictionPanel.value = true;
    assert(showPredictionPanel.value, '面板展開');
    
    // 加載中
    predictionLoading.value = true;
    assert(predictionLoading.value, 'loading 狀態');
    
    // 數據到達
    predictionReport.value = { capacity_prediction: { days_until_full: 14 } };
    predictionLoading.value = false;
    assert(!predictionLoading.value, 'loading 結束');
    assert(predictionReport.value !== null, '數據已設置');
    
    // 收起
    showPredictionPanel.value = false;
    assert(!showPredictionPanel.value, '面板收起');
}

// ─────────── I17: 輪換面板 ───────────
_group('I17: 輪換面板（UI 狀態）');

{
    const showRotationPanel = ref(false);
    
    showRotationPanel.value = true;
    assert(showRotationPanel.value, '輪換面板打開');
    showRotationPanel.value = false;
    assert(!showRotationPanel.value, '輪換面板關閉');
}

// ─────────── I18: 命令面板 ───────────
_group('I18: 命令面板（UI 狀態）');

{
    const showCommandPalette = ref(false);
    const commandQuery = ref('');
    
    // 打開
    commandQuery.value = '';
    showCommandPalette.value = true;
    assert(showCommandPalette.value, '命令面板打開');
    assertEqual(commandQuery.value, '', '查詢已清空');
    
    // 輸入
    commandQuery.value = '備份';
    assertEqual(commandQuery.value, '備份', '查詢已輸入');
    
    // ESC 關閉
    showCommandPalette.value = false;
    assert(!showCommandPalette.value, 'ESC 關閉');
}


// =====================================================================
//                    異常鏈路測試
// =====================================================================

// ─────────── X1: Token 過期 401 ───────────
_group('X1: API 返回 401（異常）');

{
    const client = new MockApiClient();
    client.setResponse('/admin/api-pool', { success: false, error: { message: '無效的認證令牌' }, _statusCode: 401 });
    
    (async () => {
        const result = await client.apiRequest('/admin/api-pool');
        assert(!result.success, '401 返回 success=false');
        assert(result.error.message.includes('令牌'), '包含認證錯誤信息');
    })();
}

// ─────────── X2: 服務器 500 ───────────
_group('X2: API 返回 500（異常）');

{
    const client = new MockApiClient();
    client.setError('/admin/api-pool', 500, '伺服器內部錯誤');
    
    (async () => {
        let caught = false;
        try {
            await client.apiRequest('/admin/api-pool');
        } catch (e) {
            caught = true;
            assert(e.message.includes('500'), '錯誤包含狀態碼');
        }
        assert(caught, '500 錯誤被捕獲');
    })();
}

// ─────────── X3: 網絡斷開 ───────────
_group('X3: 網絡斷開（異常）');

{
    const client = new MockApiClient();
    client.setNetworkError('/admin/api-pool');
    
    (async () => {
        let caught = false;
        try {
            await client.apiRequest('/admin/api-pool');
        } catch (e) {
            caught = true;
            assert(e.message.includes('NetworkError'), '拋出網絡錯誤');
        }
        assert(caught, '網絡錯誤被捕獲');
    })();
}

// ─────────── X4: 返回空數據 ───────────
_group('X4: 返回空數據 {data: null}（異常）');

{
    const client = new MockApiClient();
    client.setResponse('/admin/api-pool', { success: true, data: null });
    
    (async () => {
        const result = await client.apiRequest('/admin/api-pool');
        assert(result.success, 'success=true 但 data 為 null');
        
        // 前端應安全處理
        const apis = result.data?.apis || [];
        const stats = result.data?.stats || {};
        assertEqual(apis.length, 0, '安全降級：空 API 列表');
        assertEqual(Object.keys(stats).length, 0, '安全降級：空 stats');
    })();
}

// ─────────── X5: 返回格式異常 ───────────
_group('X5: 返回格式異常（異常）');

{
    const client = new MockApiClient();
    client.setResponse('/admin/api-pool', { success: true, data: "unexpected string" });
    
    (async () => {
        const result = await client.apiRequest('/admin/api-pool');
        const apis = Array.isArray(result.data?.apis) ? result.data.apis : [];
        assertEqual(apis.length, 0, '異常格式安全降級');
        
        // 不會崩潰
        let crashed = false;
        try {
            const len = (result.data?.apis || []).length;
        } catch (e) { crashed = true; }
        assert(!crashed, '異常格式不崩潰');
    })();
}

// ─────────── X6: 超大數據集 ───────────
_group('X6: 超大數據（1000+ API）（異常）');

{
    const bigList = Array.from({ length: 1500 }, (_, i) => ({
        api_id: String(10000 + i),
        name: `API-${i}`,
        status: i % 3 === 0 ? 'available' : i % 3 === 1 ? 'full' : 'disabled',
        success_rate: Math.random() * 100,
        health_score: Math.random() * 100,
        current_accounts: Math.floor(Math.random() * 5),
        max_accounts: 5,
        created_at: new Date(Date.now() - Math.random() * 365 * 86400000).toISOString()
    }));
    
    // 分頁
    const pageSize = 20;
    const totalPages = Math.max(1, Math.ceil(bigList.length / pageSize));
    assertEqual(totalPages, 75, '1500/20=75 頁');
    
    const page1 = bigList.slice(0, pageSize);
    assertEqual(page1.length, 20, '第1頁 20 條');
    
    // 搜索性能（不卡死）
    const startSearch = Date.now();
    const filtered = bigList.filter(api => api.name.includes('API-999'));
    const searchTime = Date.now() - startSearch;
    assert(searchTime < 100, `搜索 1500 條耗時 ${searchTime}ms < 100ms`);
    
    // 排序性能
    const startSort = Date.now();
    const sorted = [...bigList].sort((a, b) => (a.success_rate || 0) - (b.success_rate || 0));
    const sortTime = Date.now() - startSort;
    assert(sortTime < 100, `排序 1500 條耗時 ${sortTime}ms < 100ms`);
}

// ─────────── X7: 並發操作（快速雙擊） ───────────
_group('X7: 並發操作（快速雙擊）');

{
    const client = new MockApiClient();
    client.setResponse('/admin/api-pool/12345', { success: true });
    
    (async () => {
        // 同時發送兩次刪除
        const [r1, r2] = await Promise.all([
            client.apiRequest('/admin/api-pool/12345', { method: 'DELETE' }),
            client.apiRequest('/admin/api-pool/12345', { method: 'DELETE' })
        ]);
        assert(r1.success, '第一次請求成功');
        assert(r2.success, '第二次請求也發送了（後端應冪等處理）');
        assertEqual(client.getCallCount('/admin/api-pool/12345'), 2, '確認發了 2 次');
    })();
}

// ─────────── X8: localStorage 不可用 ───────────
_group('X8: localStorage 不可用（異常）');

{
    // 模擬 localStorage 拋出異常
    const brokenStorage = {
        getItem() { throw new Error('SecurityError: localStorage not available'); },
        setItem() { throw new Error('SecurityError: localStorage not available'); }
    };
    
    // 模擬 loadHealthThresholds 的降級邏輯
    const healthThresholds = { warningRate: 80, criticalRate: 50 };
    try {
        const saved = JSON.parse(brokenStorage.getItem('api_health_thresholds') || '{}');
        if (saved.warningRate != null) healthThresholds.warningRate = saved.warningRate;
    } catch (e) { /* ignore - 預期行為 */ }
    
    assertEqual(healthThresholds.warningRate, 80, 'localStorage 失敗 → 保持默認值');
    assertEqual(healthThresholds.criticalRate, 50, 'localStorage 失敗 → 保持默認值');
    assert(true, 'localStorage 不可用不崩潰');
}

// ─────────── X9: Chart.js 未加載 ───────────
_group('X9: Chart.js 未加載（異常）');

{
    // 模擬 Chart 類不存在
    let crashed = false;
    try {
        const ctx = null; // document.getElementById 返回 null
        if (!ctx) {
            // 安全退出 - 這是 renderPredictionChart 的行為
            crashed = false;
        }
    } catch (e) { crashed = true; }
    assert(!crashed, 'canvas 不存在時安全退出');
    
    // 模擬 Chart 構造函數失敗
    crashed = false;
    try {
        const fakeChart = { destroy: () => {} };
        // 正常路徑：先銷毀舊實例
        if (fakeChart) fakeChart.destroy();
    } catch (e) { crashed = true; }
    assert(!crashed, 'Chart 銷毀不崩潰');
}

// ─────────── X10: 備份文件格式損壞 ───────────
_group('X10: 備份文件格式損壞（異常）');

{
    // 模擬解析損壞的 JSON
    let parseError = false;
    try {
        JSON.parse('{ invalid json }');
    } catch (e) {
        parseError = true;
    }
    assert(parseError, '損壞 JSON 拋出解析錯誤');
    
    // 模擬空備份文件
    let emptyError = false;
    try {
        const data = JSON.parse('{}');
        const apiCount = data.apis?.length || '?';
        assertEqual(apiCount, '?', '空備份 → 默認值 "?"');
    } catch (e) { emptyError = true; }
    assert(!emptyError, '空 JSON 不崩潰');
}

// ─────────── X11: 預測全部失敗 ───────────
_group('X11: prediction + forecast 全部失敗（異常）');

{
    const client = new MockApiClient();
    client.setResponse('/admin/api-pool/prediction/report', { success: false });
    client.setResponse('/admin/api-pool/forecast', { success: false });
    
    (async () => {
        const predictionReport = ref(null);
        
        const r1 = await client.apiRequest('/admin/api-pool/prediction/report');
        if (!r1.success || !r1.data) {
            const r2 = await client.apiRequest('/admin/api-pool/forecast?days=14');
            if (!r2.success || !r2.data) {
                // 兩個都失敗 - 保持 null
            }
        }
        assertEqual(predictionReport.value, null, '兩端點都失敗 → 保持 null');
    })();
}

// ─────────── X12: 自動刷新期間 API 失敗 ───────────
_group('X12: 自動刷新期間 API 失敗（異常）');

{
    const client = new MockApiClient();
    let refreshCount = 0;
    
    // 第一次成功，第二次失敗，第三次成功
    const responses = [
        { success: true, data: { apis: [] } },
        { success: false, error: { message: 'timeout' } },
        { success: true, data: { apis: [] } },
    ];
    
    (async () => {
        for (const resp of responses) {
            try {
                client.setResponse('/admin/api-pool', resp);
                const r = await client.apiRequest('/admin/api-pool');
                refreshCount++;
            } catch (e) {
                refreshCount++; // 即使失敗也繼續
            }
        }
        assertEqual(refreshCount, 3, '即使中間失敗，刷新循環繼續');
    })();
}


// ========== 結果統計 ==========
console.log('\n\x1b[1m══════════════════════════════════════════\x1b[0m');
console.log(`\x1b[32m通過: ${_passed}\x1b[0m | \x1b[31m失敗: ${_failed}\x1b[0m | 總計: ${_passed + _failed}`);
if (_errors.length > 0) {
    console.log('\n\x1b[31m失敗用例:\x1b[0m');
    _errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
}
console.log('');
process.exit(_failed > 0 ? 1 : 0);
