/**
 * P0–P4 前端單元測試
 * 測試所有純邏輯函數（無 DOM / API 依賴）
 * 
 * 運行方式: node admin-panel/tests/unit.test.js
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
const assertClose = (actual, expected, delta, msg) => {
    const pass = Math.abs(actual - expected) <= delta;
    if (!pass) msg += ` | 期望: ~${expected}, 實際: ${actual}`;
    assert(pass, msg);
};

// ========== 從 app.js 提取的純函數（鏡像實現） ==========

/** P0: validateApiFields */
const validateApiFields = (form) => {
    const id = String(form.api_id).trim();
    const hash = String(form.api_hash).trim();
    if (!id || !hash) return 'API ID 和 API Hash 不能為空';
    if (!/^\d{4,15}$/.test(id)) return 'API ID 必須為 4-15 位純數字';
    if (!/^[a-fA-F0-9]{32}$/.test(hash)) return 'API Hash 必須為 32 位十六進制字符';
    const max = parseInt(form.max_accounts);
    if (isNaN(max) || max < 1 || max > 100) return '最大帳號數必須在 1-100 之間';
    return null;
};

/** P0: maskApiHash */
const maskApiHash = (hash) => {
    if (!hash || hash.length < 8) return hash || '';
    return hash.substring(0, 4) + '****' + hash.substring(hash.length - 4);
};

/** P0: formatApiTime */
const formatApiTime = (ts) => {
    if (!ts) return '-';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

/** P1: getSortIcon */
const getSortIcon = (key, currentKey, currentOrder) => {
    if (currentKey !== key) return '↕';
    return currentOrder === 'asc' ? '↑' : '↓';
};

/** P1: totalApiPages */
const totalApiPages = (listLength, pageSize) => Math.max(1, Math.ceil(listLength / pageSize));

/** P1: pagedList (slice logic) */
const pagedList = (sorted, page, pageSize) => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
};

/** P1: apiPageNumbers */
const apiPageNumbers = (total, cur) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1];
    let start = Math.max(2, cur - 2);
    let end = Math.min(total - 1, cur + 2);
    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push('...');
    pages.push(total);
    return pages;
};

/** P1: sortList */
const sortList = (list, key, order) => {
    const sorted = [...list];
    if (!key) return sorted;
    const dir = order === 'asc' ? 1 : -1;
    sorted.sort((a, b) => {
        let va = a[key], vb = b[key];
        if (va == null) va = '';
        if (vb == null) vb = '';
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        if (typeof va === 'string') return va.localeCompare(vb) * dir;
        return 0;
    });
    return sorted;
};

/** P1: apiHealthOverview */
const apiHealthOverview = (list) => {
    if (list.length === 0) return { avgRate: 0, healthy: 0, warning: 0, critical: 0, avgHealth: 0 };
    const rates = list.map(a => a.success_rate || 0);
    const avgRate = rates.reduce((s, r) => s + r, 0) / rates.length;
    const healthy = list.filter(a => (a.health_score || 100) >= 80).length;
    const warning = list.filter(a => (a.health_score || 100) >= 50 && (a.health_score || 100) < 80).length;
    const critical = list.filter(a => (a.health_score || 100) < 50).length;
    const healthScores = list.map(a => a.health_score || 100);
    const avgHealth = healthScores.reduce((s, h) => s + h, 0) / healthScores.length;
    return { avgRate: avgRate.toFixed(1), healthy, warning, critical, avgHealth: avgHealth.toFixed(0) };
};

/** P2: apiHealthOverviewP2 */
const apiHealthOverviewP2 = (list, thresholds) => {
    if (list.length === 0) return { avgRate: 0, healthy: 0, warning: 0, critical: 0, avgHealth: 0, atRisk: [] };
    const rates = list.map(a => a.success_rate || 0);
    const avgRate = rates.reduce((s, r) => s + r, 0) / rates.length;
    const warnT = thresholds.warningRate;
    const critT = thresholds.criticalRate;
    const healthy = list.filter(a => (a.success_rate || 100) >= warnT).length;
    const warning = list.filter(a => (a.success_rate || 100) >= critT && (a.success_rate || 100) < warnT).length;
    const critical = list.filter(a => (a.success_rate || 100) < critT).length;
    const healthScores = list.map(a => a.health_score || 100);
    const avgHealth = healthScores.reduce((s, h) => s + h, 0) / healthScores.length;
    const atRisk = list.filter(a => (a.success_rate || 100) < critT && a.status === 'available');
    return { avgRate: avgRate.toFixed(1), healthy, warning, critical, avgHealth: avgHealth.toFixed(0), atRisk };
};

/** P3: getApiLifecycle */
const getApiLifecycle = (api) => {
    const now = Date.now();
    const created = api.created_at ? new Date(api.created_at).getTime() : now;
    const ageDays = Math.max(0, Math.floor((now - created) / 86400000));
    const totalReqs = (api.total_requests || 0);
    const intensity = ageDays > 0 ? (totalReqs / ageDays).toFixed(1) : '0';
    const rate = api.success_rate != null ? api.success_rate : 100;
    const health = api.health_score != null ? api.health_score : 100;
    let recommendation = 'good';
    let recText = '狀態良好';
    if (health < 30 || rate < 30) { recommendation = 'rotate'; recText = '建議輪換'; }
    else if (health < 60 || rate < 60 || ageDays > 180) { recommendation = 'monitor'; recText = '需要關注'; }
    else if (ageDays > 365) { recommendation = 'monitor'; recText = '服役超一年'; }
    return { ageDays, intensity, recommendation, recText };
};

/** P4: getApiSlots */
const getApiSlots = (api) => {
    const max = api.max_accounts || 5;
    const used = api.current_accounts || 0;
    const slots = [];
    for (let i = 0; i < max; i++) {
        slots.push(i < used ? 'used' : 'empty');
    }
    return slots;
};

/** P4: getRiskColor / getRiskBg / getRiskIcon / getTrendIcon */
const getRiskColor = (level) => {
    if (level === 'high') return 'text-red-400';
    if (level === 'medium') return 'text-yellow-400';
    return 'text-green-400';
};
const getRiskBg = (level) => {
    if (level === 'high') return 'bg-red-500/20';
    if (level === 'medium') return 'bg-yellow-500/20';
    return 'bg-green-500/20';
};
const getRiskIcon = (level) => {
    if (level === 'high') return '🔴';
    if (level === 'medium') return '🟡';
    return '🟢';
};
const getTrendIcon = (trend) => {
    if (trend === 'up') return '📈';
    if (trend === 'down') return '📉';
    return '➡️';
};

/** P0: filteredApiPoolList (logic extracted) */
const filterApiList = (list, query) => {
    const q = (query || '').toLowerCase().trim();
    if (!q) return list;
    return list.filter(api =>
        (api.name || '').toLowerCase().includes(q) ||
        String(api.api_id || '').includes(q) ||
        (api.source_phone || '').includes(q) ||
        (api.note || '').toLowerCase().includes(q)
    );
};

/** P4: filterCommands (logic extracted) */
const filterCommands = (actions, query) => {
    const q = (query || '').toLowerCase().trim();
    if (!q) return actions;
    return actions.filter(a =>
        a.label.toLowerCase().includes(q) || a.id.includes(q) || (a.category || '').toLowerCase().includes(q)
    );
};

/** P4: rotationCandidates (logic extracted) */
const getRotationCandidates = (apiList) => {
    return apiList
        .map(api => ({ ...api, lifecycle: getApiLifecycle(api) }))
        .filter(a => a.lifecycle.recommendation !== 'good' && a.status !== 'disabled')
        .sort((a, b) => {
            const order = { rotate: 0, monitor: 1 };
            return (order[a.lifecycle.recommendation] ?? 2) - (order[b.lifecycle.recommendation] ?? 2);
        });
};


// =====================================================================
//                          開 始 測 試
// =====================================================================

console.log('\x1b[1m\n╔══════════════════════════════════════════╗');
console.log('║   P0–P4 前端單元測試（17 組 / ~70 用例）   ║');
console.log('╚══════════════════════════════════════════╝\x1b[0m');

// ─────────── U1: validateApiFields ───────────
_group('U1: validateApiFields（P0 驗證函數）');

assert(validateApiFields({ api_id: '', api_hash: 'a'.repeat(32), max_accounts: 5 }) !== null,
    '空 api_id → 返回錯誤');
assert(validateApiFields({ api_id: '1234', api_hash: '', max_accounts: 5 }) !== null,
    '空 api_hash → 返回錯誤');
assert(validateApiFields({ api_id: '12', api_hash: 'a'.repeat(32), max_accounts: 5 }) !== null,
    '太短的 api_id (2位) → 返回錯誤');
assert(validateApiFields({ api_id: '1234567890123456', api_hash: 'a'.repeat(32), max_accounts: 5 }) !== null,
    '太長的 api_id (16位) → 返回錯誤');
assert(validateApiFields({ api_id: '1234abc', api_hash: 'a'.repeat(32), max_accounts: 5 }) !== null,
    '非純數字 api_id → 返回錯誤');
assert(validateApiFields({ api_id: '12345', api_hash: 'zzzz'.repeat(8), max_accounts: 5 }) !== null,
    '非十六進制 api_hash → 返回錯誤');
assert(validateApiFields({ api_id: '12345', api_hash: 'a'.repeat(31), max_accounts: 5 }) !== null,
    '31位 api_hash → 返回錯誤');
assert(validateApiFields({ api_id: '12345', api_hash: 'a'.repeat(32), max_accounts: 0 }) !== null,
    'max_accounts=0 → 返回錯誤');
assert(validateApiFields({ api_id: '12345', api_hash: 'a'.repeat(32), max_accounts: -1 }) !== null,
    'max_accounts=-1 → 返回錯誤');
assert(validateApiFields({ api_id: '12345', api_hash: 'a'.repeat(32), max_accounts: 101 }) !== null,
    'max_accounts=101 → 返回錯誤');
assert(validateApiFields({ api_id: '12345', api_hash: 'a'.repeat(32), max_accounts: 'abc' }) !== null,
    'max_accounts=非數字 → 返回錯誤');
assertEqual(validateApiFields({ api_id: '12345', api_hash: 'abcdef1234567890abcdef1234567890', max_accounts: 5 }), null,
    '正常輸入 → 返回 null（無錯誤）');
assertEqual(validateApiFields({ api_id: '1234', api_hash: 'ABCDEF1234567890ABCDEF1234567890', max_accounts: 1 }), null,
    '邊界值：4位ID + 大寫Hash + max=1 → 通過');
assertEqual(validateApiFields({ api_id: '123456789012345', api_hash: 'abcdef1234567890abcdef1234567890', max_accounts: 100 }), null,
    '邊界值：15位ID + max=100 → 通過');

// ─────────── U2: maskApiHash ───────────
_group('U2: maskApiHash（P0 遮罩函數）');

assertEqual(maskApiHash('abcdef1234567890abcdef1234567890'), 'abcd****7890',
    '32字符 → 前4後4遮罩');
assertEqual(maskApiHash(''), '',
    '空字符串 → 空');
assertEqual(maskApiHash(null), '',
    'null → 空');
assertEqual(maskApiHash(undefined), '',
    'undefined → 空');
assertEqual(maskApiHash('abcd'), 'abcd',
    '4字符 (< 8) → 原樣返回');
assertEqual(maskApiHash('abcdefgh'), 'abcd****efgh',
    '剛好8字符 → 遮罩');
assertEqual(maskApiHash('12345678901234567890'), '1234****7890',
    '20字符 → 遮罩');

// ─────────── U3: formatApiTime ───────────
_group('U3: formatApiTime（P0 時間格式化）');

assertEqual(formatApiTime(null), '-',
    'null → "-"');
assertEqual(formatApiTime(undefined), '-',
    'undefined → "-"');
assertEqual(formatApiTime(''), '-',
    '空字符串 → "-"');
assert(formatApiTime('not-a-date') === 'not-a-date',
    '無效日期字符串 → 原樣返回');
assert(formatApiTime('2026-01-15T10:30:00Z') !== '-',
    '有效 ISO 日期 → 格式化');
assert(formatApiTime('2026-01-15T10:30:00Z').includes('2026'),
    '格式化結果包含年份');

// ─────────── U4: getApiLifecycle ───────────
_group('U4: getApiLifecycle（P3 生命週期指標）');

{
    // 新建 API（今天創建）
    const now = new Date().toISOString();
    const lc1 = getApiLifecycle({ created_at: now, success_rate: 100, health_score: 100, total_requests: 0 });
    assertEqual(lc1.ageDays, 0, '今天創建 → ageDays=0');
    assertEqual(lc1.recommendation, 'good', '全部滿分 → good');

    // 200天 + 高成功率
    const old200 = new Date(Date.now() - 200 * 86400000).toISOString();
    const lc2 = getApiLifecycle({ created_at: old200, success_rate: 95, health_score: 90, total_requests: 1000 });
    assertEqual(lc2.recommendation, 'monitor', '200天 > 180天 → monitor');

    // 30天 + 低成功率
    const old30 = new Date(Date.now() - 30 * 86400000).toISOString();
    const lc3 = getApiLifecycle({ created_at: old30, success_rate: 20, health_score: 20, total_requests: 50 });
    assertEqual(lc3.recommendation, 'rotate', '成功率20% + 健康20 → rotate');

    // 50天 + 中等
    const old50 = new Date(Date.now() - 50 * 86400000).toISOString();
    const lc4 = getApiLifecycle({ created_at: old50, success_rate: 55, health_score: 55, total_requests: 200 });
    assertEqual(lc4.recommendation, 'monitor', '成功率55% → monitor');

    // 沒有 created_at
    const lc5 = getApiLifecycle({ total_requests: 100 });
    assertEqual(lc5.ageDays, 0, '無 created_at → ageDays=0');

    // health_score=0
    const lc6 = getApiLifecycle({ created_at: old30, health_score: 0, success_rate: 80, total_requests: 100 });
    assertEqual(lc6.recommendation, 'rotate', 'health_score=0 < 30 → rotate');

    // 400天 + 好成績
    const old400 = new Date(Date.now() - 400 * 86400000).toISOString();
    const lc7 = getApiLifecycle({ created_at: old400, success_rate: 95, health_score: 90, total_requests: 5000 });
    assertEqual(lc7.recommendation, 'monitor', '400天 > 365 → monitor');

    // 強度計算
    assertClose(parseFloat(lc2.intensity), 1000 / 200, 0.1, '1000次/200天 ≈ 5.0');
}

// ─────────── U5: getApiSlots ───────────
_group('U5: getApiSlots（P4 槽位視覺化）');

assertEqual(getApiSlots({ max_accounts: 5, current_accounts: 3 }),
    ['used', 'used', 'used', 'empty', 'empty'],
    'max=5, used=3 → 3個used+2個empty');
assertEqual(getApiSlots({ max_accounts: 3, current_accounts: 3 }),
    ['used', 'used', 'used'],
    'max=3, used=3 → 全部used（滿載）');
assertEqual(getApiSlots({ max_accounts: 3, current_accounts: 0 }),
    ['empty', 'empty', 'empty'],
    'max=3, used=0 → 全部empty');
assertEqual(getApiSlots({}),
    ['empty', 'empty', 'empty', 'empty', 'empty'],
    '未指定 → 默認 max=5, used=0');
assertEqual(getApiSlots({ max_accounts: 0, current_accounts: 0 }).length,
    5,
    'max=0 → 默認5（|| 5 行為）');
// 超分配情況
{
    const slots = getApiSlots({ max_accounts: 3, current_accounts: 5 });
    assertEqual(slots.length, 3, '超分配時陣列長度仍=max');
    assertEqual(slots.filter(s => s === 'used').length, 3, '超分配時所有位都是used');
}

// ─────────── U6: getSortIcon ───────────
_group('U6: getSortIcon（P1 排序圖標）');

assertEqual(getSortIcon('name', 'name', 'asc'), '↑', '當前鍵 asc → ↑');
assertEqual(getSortIcon('name', 'name', 'desc'), '↓', '當前鍵 desc → ↓');
assertEqual(getSortIcon('name', 'status', 'asc'), '↕', '非當前鍵 → ↕');
assertEqual(getSortIcon('rate', 'rate', 'asc'), '↑', '另一個鍵 asc → ↑');

// ─────────── U7: getRiskColor / getRiskBg / getRiskIcon ───────────
_group('U7: 風險等級函數（P4）');

assertEqual(getRiskColor('high'), 'text-red-400', 'high → 紅色');
assertEqual(getRiskColor('medium'), 'text-yellow-400', 'medium → 黃色');
assertEqual(getRiskColor('low'), 'text-green-400', 'low → 綠色');
assertEqual(getRiskColor(undefined), 'text-green-400', 'undefined → 默認綠色');
assertEqual(getRiskBg('high'), 'bg-red-500/20', 'high → 紅底');
assertEqual(getRiskBg('medium'), 'bg-yellow-500/20', 'medium → 黃底');
assertEqual(getRiskBg('low'), 'bg-green-500/20', 'low → 綠底');
assertEqual(getRiskIcon('high'), '🔴', 'high → 紅圈');
assertEqual(getRiskIcon('medium'), '🟡', 'medium → 黃圈');
assertEqual(getRiskIcon('low'), '🟢', 'low → 綠圈');

// ─────────── U8: getTrendIcon ───────────
_group('U8: getTrendIcon（P4 趨勢圖標）');

assertEqual(getTrendIcon('up'), '📈', 'up → 📈');
assertEqual(getTrendIcon('down'), '📉', 'down → 📉');
assertEqual(getTrendIcon('stable'), '➡️', 'stable → ➡️');
assertEqual(getTrendIcon(null), '➡️', 'null → 默認 ➡️');
assertEqual(getTrendIcon(undefined), '➡️', 'undefined → 默認 ➡️');

// ─────────── U9: filteredApiPoolList (filterApiList) ───────────
_group('U9: filteredApiPoolList（P0 搜索過濾）');

{
    const list = [
        { api_id: '11111', name: 'Alpha API', source_phone: '+886123', note: '主要接口' },
        { api_id: '22222', name: 'Beta Api', source_phone: '+886456', note: '備用' },
        { api_id: '33333', name: 'Gamma', source_phone: '+886789', note: null },
    ];
    assertEqual(filterApiList(list, '').length, 3, '空搜索 → 全部返回');
    assertEqual(filterApiList(list, '  ').length, 3, '空白搜索 → 全部返回');
    assertEqual(filterApiList(list, 'alpha').length, 1, '按名稱搜索（不分大小寫）');
    assertEqual(filterApiList(list, 'Alpha').length, 1, '按名稱搜索（原始大小寫）');
    assertEqual(filterApiList(list, '22222').length, 1, '按 api_id 搜索');
    assertEqual(filterApiList(list, '+886123').length, 1, '按手機號搜索');
    assertEqual(filterApiList(list, '主要').length, 1, '按備註搜索');
    assertEqual(filterApiList(list, 'api').length, 2, '"api" 匹配 Alpha API 和 Beta Api');
    assertEqual(filterApiList(list, 'zzzzz').length, 0, '無匹配 → 空');
    assertEqual(filterApiList([], 'test').length, 0, '空列表 → 空');
}

// ─────────── U10: sortedApiPoolList (sortList) ───────────
_group('U10: sortedApiPoolList（P1 排序）');

{
    const list = [
        { name: 'Charlie', success_rate: 80, current_accounts: 3 },
        { name: 'Alpha', success_rate: 95, current_accounts: 1 },
        { name: 'Beta', success_rate: null, current_accounts: 5 },
    ];
    const byNameAsc = sortList(list, 'name', 'asc');
    assertEqual(byNameAsc[0].name, 'Alpha', 'name asc → 第一個是 Alpha');
    assertEqual(byNameAsc[2].name, 'Charlie', 'name asc → 最後是 Charlie');

    const byRateDesc = sortList(list, 'success_rate', 'desc');
    assertEqual(byRateDesc[0].success_rate, 95, 'success_rate desc → 95 在第一');

    const byAccounts = sortList(list, 'current_accounts', 'asc');
    assertEqual(byAccounts[0].current_accounts, 1, 'current_accounts asc → 1 在第一');

    // null 值不崩潰
    const withNull = [{ name: null }, { name: 'Z' }, { name: 'A' }];
    const sorted = sortList(withNull, 'name', 'asc');
    assert(sorted.length === 3, 'null 值排序不崩潰');

    // 不排序
    const noSort = sortList(list, '', 'asc');
    assertEqual(noSort[0].name, 'Charlie', '無排序鍵 → 原始順序');
}

// ─────────── U11: pagedApiPoolList (pagedList) ───────────
_group('U11: pagedApiPoolList（P1 分頁）');

{
    const items = Array.from({ length: 25 }, (_, i) => ({ id: i }));
    assertEqual(pagedList(items, 1, 10).length, 10, '第1頁：10條');
    assertEqual(pagedList(items, 2, 10).length, 10, '第2頁：10條');
    assertEqual(pagedList(items, 3, 10).length, 5, '第3頁：5條（不足一頁）');
    assertEqual(pagedList(items, 1, 100).length, 25, 'pageSize > 總數 → 全部');
    assertEqual(pagedList([], 1, 10).length, 0, '空列表 → 空');
    assertEqual(pagedList(items, 1, 10)[0].id, 0, '第1頁起始 id=0');
    assertEqual(pagedList(items, 2, 10)[0].id, 10, '第2頁起始 id=10');
}

// ─────────── U12: totalApiPages ───────────
_group('U12: totalApiPages（P1 總頁數）');

assertEqual(totalApiPages(20, 10), 2, '20/10=2頁');
assertEqual(totalApiPages(21, 10), 3, '21/10=3頁（向上取整）');
assertEqual(totalApiPages(0, 10), 1, '0條=至少1頁');
assertEqual(totalApiPages(10, 10), 1, '10/10=1頁');
assertEqual(totalApiPages(1, 10), 1, '1/10=1頁');
assertEqual(totalApiPages(100, 20), 5, '100/20=5頁');

// ─────────── U13: apiPageNumbers ───────────
_group('U13: apiPageNumbers（P1 頁碼列表）');

assertEqual(apiPageNumbers(5, 3), [1, 2, 3, 4, 5], '總頁≤7 → 完整列出');
assertEqual(apiPageNumbers(1, 1), [1], '只有1頁');
assertEqual(apiPageNumbers(7, 4), [1, 2, 3, 4, 5, 6, 7], '剛好7頁 → 完整列出');
{
    const p = apiPageNumbers(20, 10);
    assert(p[0] === 1, '20頁中第10頁 → 首位是1');
    assert(p[p.length - 1] === 20, '20頁中第10頁 → 末位是20');
    assert(p.includes(10), '20頁中第10頁 → 包含10');
    assert(p.includes('...'), '20頁中第10頁 → 有省略號');
}
{
    const p = apiPageNumbers(20, 1);
    assert(p[0] === 1, '20頁中第1頁 → 首位是1');
    assert(p[p.length - 1] === 20, '20頁中第1頁 → 末位是20');
}
{
    const p = apiPageNumbers(20, 20);
    assert(p[0] === 1, '20頁中第20頁 → 首位是1');
    assert(p[p.length - 1] === 20, '20頁中第20頁 → 末位是20');
}

// ─────────── U14: apiHealthOverviewP2 ───────────
_group('U14: apiHealthOverviewP2（P2 自定義閾值健康概覽）');

{
    const thresholds = { warningRate: 80, criticalRate: 50 };
    const empty = apiHealthOverviewP2([], thresholds);
    assertEqual(empty.healthy, 0, '空列表 → healthy=0');
    assertEqual(empty.atRisk.length, 0, '空列表 → atRisk=[]');

    const allGood = [
        { success_rate: 90, health_score: 95, status: 'available' },
        { success_rate: 85, health_score: 88, status: 'available' },
    ];
    const r1 = apiHealthOverviewP2(allGood, thresholds);
    assertEqual(r1.healthy, 2, '全部健康 → healthy=2');
    assertEqual(r1.warning, 0, '全部健康 → warning=0');
    assertEqual(r1.critical, 0, '全部健康 → critical=0');

    const mixed = [
        { success_rate: 90, health_score: 95, status: 'available' },
        { success_rate: 60, health_score: 55, status: 'available' },
        { success_rate: 30, health_score: 20, status: 'available' },
        { success_rate: 40, health_score: 30, status: 'disabled' },
    ];
    const r2 = apiHealthOverviewP2(mixed, thresholds);
    assertEqual(r2.healthy, 1, '混合 → healthy=1');
    assertEqual(r2.warning, 1, '混合 → warning=1 (60%)');
    assertEqual(r2.critical, 2, '混合 → critical=2 (30%, 40%)');
    assertEqual(r2.atRisk.length, 1, '混合 → atRisk=1（只計 available+critical）');

    // 自定義閾值（更嚴格）
    const strict = { warningRate: 95, criticalRate: 80 };
    const r3 = apiHealthOverviewP2(allGood, strict);
    assertEqual(r3.healthy, 0, '嚴格閾值 → 90%和85%都 < 95% → healthy=0');
}

// ─────────── U15: rotationCandidates ───────────
_group('U15: rotationCandidates（P4 輪換候選）');

{
    const now = Date.now();
    const list = [
        { api_id: '1', created_at: new Date(now - 10 * 86400000).toISOString(), success_rate: 95, health_score: 90, status: 'available' },
        { api_id: '2', created_at: new Date(now - 200 * 86400000).toISOString(), success_rate: 50, health_score: 50, status: 'available' },
        { api_id: '3', created_at: new Date(now - 30 * 86400000).toISOString(), success_rate: 10, health_score: 10, status: 'available' },
        { api_id: '4', created_at: new Date(now - 30 * 86400000).toISOString(), success_rate: 10, health_score: 10, status: 'disabled' },
    ];
    const candidates = getRotationCandidates(list);
    assertEqual(candidates.length, 2, '4個API → 2個候選（排除 good 和 disabled）');
    // rotate (api_id=3) 應排在 monitor (api_id=2) 前面
    assert(candidates[0].lifecycle.recommendation === 'rotate', 'rotate 排在第一');
    assert(candidates[1].lifecycle.recommendation === 'monitor', 'monitor 排在第二');

    // 全部 good
    const goodList = [
        { api_id: '1', created_at: new Date().toISOString(), success_rate: 95, health_score: 90, status: 'available' },
    ];
    assertEqual(getRotationCandidates(goodList).length, 0, '全部 good → 空');

    // 空列表
    assertEqual(getRotationCandidates([]).length, 0, '空列表 → 空');
}

// ─────────── U16: filteredCommands ───────────
_group('U16: filteredCommands（P4 命令過濾）');

{
    const actions = [
        { id: 'add', label: '添加新 API', category: '' },
        { id: 'export', label: '導出數據', category: '' },
        { id: 'backup', label: '備份 API 池', category: '' },
        { id: 'goto-123', label: '跳轉到 TestAPI', category: 'API' },
    ];
    assertEqual(filterCommands(actions, '').length, 4, '空查詢 → 全部');
    assertEqual(filterCommands(actions, '導出').length, 1, '"導出" → 1個匹配');
    assertEqual(filterCommands(actions, 'export').length, 1, '"export" → 按 ID 匹配');
    assertEqual(filterCommands(actions, 'api').length, 3, '"api" → 匹配標籤(2個含API) + 類別(1個)');
    assertEqual(filterCommands(actions, 'zzzzz').length, 0, '無匹配 → 空');
    assertEqual(filterCommands(actions, 'API').length, 3, '大小寫不敏感');
}

// ─────────── U17: isAllApisSelected (logic) ───────────
_group('U17: isAllApisSelected（P0 全選判斷）');

{
    const isAll = (listLen, selectedLen) => listLen > 0 && selectedLen === listLen;
    assert(isAll(3, 3), '3選3 → true');
    assert(!isAll(3, 2), '3選2 → false');
    assert(!isAll(0, 0), '空列表 → false');
    assert(!isAll(5, 0), '5選0 → false');
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
