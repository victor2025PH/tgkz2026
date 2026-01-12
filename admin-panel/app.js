/**
 * TG-AI智控王 管理後台
 * Vue 3 應用 v2.0
 */

const { createApp, ref, computed, onMounted, watch, reactive } = Vue;

// API 基礎URL
const API_BASE = '/api';

// ============ 工具函數 ============

function getToken() {
    return localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
}

function getCurrentUser() {
    const userStr = localStorage.getItem('admin_user') || sessionStorage.getItem('admin_user');
    try {
        return userStr ? JSON.parse(userStr) : null;
    } catch {
        return null;
    }
}

function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
    window.location.href = '/login.html';
}

async function apiRequest(endpoint, options = {}) {
    try {
        const token = getToken();
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
                ...options.headers
            },
            ...options
        });
        
        if (response.status === 401) {
            logout();
            return { success: false, message: '登錄已過期' };
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: error.message };
    }
}

// ============ Vue 應用 ============

createApp({
    setup() {
        // ============ 狀態 ============
        const currentPage = ref('dashboard');
        const showGenerateModal = ref(false);
        const showExtendModal = ref(false);
        const showAnnouncementModal = ref(false);
        const isLoading = ref(true);
        const isGenerating = ref(false);
        const lastUpdate = ref(null);
        const adminUser = ref(getCurrentUser());
        
        // Toast 通知
        const toast = reactive({
            show: false,
            message: '',
            type: 'success'
        });
        
        const showToast = (message, type = 'success') => {
            toast.message = message;
            toast.type = type;
            toast.show = true;
            setTimeout(() => { toast.show = false; }, 3000);
        };
        
        // 菜單項
        const menuItems = ref([
            { id: 'dashboard', name: '儀表盤', icon: '📊' },
            { id: 'users', name: '用戶管理', icon: '👥' },
            { id: 'licenses', name: '卡密管理', icon: '🎟️' },
            { id: 'orders', name: '訂單管理', icon: '💰' },
            { id: 'referrals', name: '邀請管理', icon: '🎁' },
            { id: 'announcements', name: '公告管理', icon: '📢' },
            { id: 'logs', name: '操作日誌', icon: '📝' },
            { id: 'settings', name: '系統設置', icon: '⚙️' },
        ]);
        
        // 統計數據
        const stats = ref({
            totalUsers: 0,
            newUsersToday: 0,
            paidUsers: 0,
            conversionRate: 0,
            totalRevenue: 0,
            revenueToday: 0,
            totalLicenses: 0,
            unusedLicenses: 0
        });
        
        // 用戶數據
        const users = ref([]);
        const userSearch = ref('');
        const userFilter = ref('all');
        
        // 卡密數據
        const licenses = ref([]);
        const licenseFilter = ref('all');
        const licenseLevelFilter = ref('all');
        
        // 卡密統計
        const licenseStats = ref({
            silver: { name: '白銀精英', icon: '🥈', total: 0, unused: 0 },
            gold: { name: '黃金大師', icon: '🥇', total: 0, unused: 0 },
            diamond: { name: '鑽石王牌', icon: '💎', total: 0, unused: 0 },
            star: { name: '星耀傳說', icon: '🌟', total: 0, unused: 0 },
            king: { name: '榮耀王者', icon: '👑', total: 0, unused: 0 },
        });
        
        // 訂單數據
        const orders = ref([]);
        
        // 日誌數據
        const logs = ref([]);
        
        // 邀請統計
        const referralStats = ref({
            totalReferrals: 0,
            totalEarnings: 0,
            leaderboard: []
        });
        
        // 公告數據
        const announcements = ref([]);
        
        // 圖表數據
        const revenueTrend = ref([]);
        const levelDistribution = ref({});
        
        // 設置
        const settings = ref({
            usdt_trc20_address: '',
            usdt_rate: '7.2',
            alipay_enabled: false,
            wechat_enabled: false,
            trial_days: 3,
            registration_enabled: true,
            referral_enabled: true,
            maintenance_mode: false
        });
        
        // 配額配置
        const quotaConfig = ref({});
        
        // 生成卡密表單
        const generateForm = ref({
            level: 'G',
            duration: '2',
            count: 10,
            notes: ''
        });
        
        // 續費表單
        const extendForm = ref({
            userId: '',
            userDisplay: '',
            days: 30,
            level: ''
        });
        
        // ============ API 方法 ============
        
        const loadDashboard = async () => {
            isLoading.value = true;
            const result = await apiRequest('/admin/dashboard');
            if (result.success) {
                const data = result.data;
                stats.value = data.stats;
                licenseStats.value = data.licenseStats || licenseStats.value;
                revenueTrend.value = data.revenueTrend || [];
                levelDistribution.value = data.levelDistribution || {};
                lastUpdate.value = new Date().toLocaleString('zh-TW');
                
                setTimeout(initCharts, 100);
            }
            isLoading.value = false;
        };
        
        const loadUsers = async () => {
            const result = await apiRequest('/admin/users');
            if (result.success) {
                users.value = result.data;
            }
        };
        
        const loadLicenses = async () => {
            const result = await apiRequest('/admin/licenses');
            if (result.success) {
                licenses.value = result.data;
            }
        };
        
        const loadOrders = async () => {
            const result = await apiRequest('/admin/orders');
            if (result.success) {
                orders.value = result.data;
            }
        };
        
        const loadLogs = async () => {
            const result = await apiRequest('/admin/logs');
            if (result.success) {
                logs.value = result.data;
            }
        };
        
        const loadReferralStats = async () => {
            const result = await apiRequest('/admin/referral-stats');
            if (result.success) {
                referralStats.value = result.data;
            }
        };
        
        const loadAnnouncements = async () => {
            const result = await apiRequest('/admin/announcements');
            if (result.success) {
                announcements.value = result.data;
            }
        };
        
        const loadSettings = async () => {
            const result = await apiRequest('/admin/settings');
            if (result.success) {
                const data = result.data;
                // 合併設置
                if (data.payment) {
                    settings.value.usdt_trc20_address = data.payment.usdt_trc20_address || '';
                    settings.value.usdt_rate = data.payment.usdt_rate || '7.2';
                    settings.value.alipay_enabled = data.payment.alipay_enabled === '1';
                    settings.value.wechat_enabled = data.payment.wechat_enabled === '1';
                }
                if (data.general) {
                    settings.value.registration_enabled = data.general.registration_enabled === '1';
                    settings.value.maintenance_mode = data.general.maintenance_mode === '1';
                }
                if (data.membership) {
                    settings.value.trial_days = parseInt(data.membership.trial_days) || 3;
                }
                if (data.referral) {
                    settings.value.referral_enabled = data.referral.referral_enabled === '1';
                }
                
                // 配額配置
                if (data.prices) {
                    quotaConfig.value = data.prices;
                }
            }
            
            // 也加載配額
            const quotaResult = await apiRequest('/admin/quotas');
            if (quotaResult.success) {
                quotaConfig.value = quotaResult.data;
            }
        };
        
        const refreshData = async () => {
            await loadDashboard();
            if (currentPage.value === 'users') await loadUsers();
            if (currentPage.value === 'licenses') await loadLicenses();
            if (currentPage.value === 'orders') await loadOrders();
            if (currentPage.value === 'logs') await loadLogs();
            if (currentPage.value === 'referrals') await loadReferralStats();
            if (currentPage.value === 'announcements') await loadAnnouncements();
        };
        
        // ============ 計算屬性 ============
        
        const filteredUsers = computed(() => {
            let result = users.value;
            
            if (userFilter.value !== 'all') {
                result = result.filter(u => u.level === userFilter.value);
            }
            
            if (userSearch.value) {
                const search = userSearch.value.toLowerCase();
                result = result.filter(u => 
                    (u.email && u.email.toLowerCase().includes(search)) ||
                    (u.nickname && u.nickname.toLowerCase().includes(search)) ||
                    (u.machineId && u.machineId.toLowerCase().includes(search)) ||
                    (u.userId && u.userId.toLowerCase().includes(search))
                );
            }
            
            return result;
        });
        
        const filteredLicenses = computed(() => {
            let result = licenses.value;
            
            if (licenseFilter.value !== 'all') {
                result = result.filter(l => l.status === licenseFilter.value);
            }
            
            if (licenseLevelFilter.value !== 'all') {
                result = result.filter(l => l.level === licenseLevelFilter.value);
            }
            
            return result;
        });
        
        // ============ 格式化方法 ============
        
        const formatDate = (date) => {
            if (!date) return '';
            try {
                const d = new Date(date);
                return d.toLocaleDateString('zh-TW');
            } catch {
                return date.slice(0, 10);
            }
        };
        
        const formatQuota = (value) => {
            if (value === -1) return '∞';
            return value?.toLocaleString() || '0';
        };
        
        const isExpired = (date) => {
            if (!date) return false;
            return new Date(date) < new Date();
        };
        
        const getStatusClass = (status) => {
            const classes = {
                unused: 'bg-green-600/30 text-green-400',
                used: 'bg-blue-600/30 text-blue-400',
                disabled: 'bg-red-600/30 text-red-400',
                expired: 'bg-gray-600/30 text-gray-400'
            };
            return classes[status] || 'bg-gray-600/30 text-gray-400';
        };
        
        const getStatusText = (status) => {
            const texts = {
                unused: '✅ 未使用',
                used: '✓ 已使用',
                disabled: '⛔ 已禁用',
                expired: '⏰ 已過期'
            };
            return texts[status] || status;
        };
        
        const getActionClass = (action) => {
            const classes = {
                login: 'bg-green-600/30 text-green-400',
                logout: 'bg-gray-600/30 text-gray-400',
                generate_licenses: 'bg-blue-600/30 text-blue-400',
                extend_user: 'bg-purple-600/30 text-purple-400',
                change_password: 'bg-yellow-600/30 text-yellow-400',
                ban_user: 'bg-red-600/30 text-red-400',
                unban_user: 'bg-green-600/30 text-green-400',
                disable_license: 'bg-red-600/30 text-red-400',
                save_settings: 'bg-blue-600/30 text-blue-400'
            };
            return classes[action] || 'bg-gray-600/30 text-gray-400';
        };
        
        // ============ 用戶操作 ============
        
        const viewUser = async (user) => {
            const result = await apiRequest(`/admin/users/${user.userId}`);
            if (result.success) {
                // TODO: 顯示用戶詳情彈窗
                alert(`用戶詳情:\n用戶ID: ${user.userId}\n郵箱: ${user.email || '未設置'}\n等級: ${user.levelName}\n邀請碼: ${user.inviteCode}`);
            }
        };
        
        const extendUser = (user) => {
            extendForm.value.userId = user.userId;
            extendForm.value.userDisplay = user.email || user.nickname || user.userId;
            extendForm.value.days = 30;
            extendForm.value.level = '';
            showExtendModal.value = true;
        };
        
        const submitExtend = async () => {
            const result = await apiRequest(`/admin/users/${extendForm.value.userId}/extend`, {
                method: 'POST',
                body: JSON.stringify({
                    days: extendForm.value.days,
                    level: extendForm.value.level || null
                })
            });
            
            if (result.success) {
                showExtendModal.value = false;
                showToast(result.message, 'success');
                await loadUsers();
            } else {
                showToast('操作失敗: ' + result.message, 'error');
            }
        };
        
        const banUser = async (user) => {
            if (!confirm(`確定要封禁用戶 ${user.email || user.userId} 嗎？`)) return;
            
            const result = await apiRequest(`/admin/users/${user.userId}/ban`, {
                method: 'POST',
                body: JSON.stringify({ is_banned: true, reason: '管理員封禁' })
            });
            
            if (result.success) {
                showToast('用戶已封禁', 'success');
                await loadUsers();
            } else {
                showToast('操作失敗: ' + result.message, 'error');
            }
        };
        
        const unbanUser = async (user) => {
            const result = await apiRequest(`/admin/users/${user.userId}/ban`, {
                method: 'POST',
                body: JSON.stringify({ is_banned: false })
            });
            
            if (result.success) {
                showToast('用戶已解封', 'success');
                await loadUsers();
            } else {
                showToast('操作失敗: ' + result.message, 'error');
            }
        };
        
        // ============ 卡密操作 ============
        
        const copyLicense = (key) => {
            navigator.clipboard.writeText(key);
            showToast('已複製卡密: ' + key, 'success');
        };
        
        const disableLicense = async (key) => {
            if (!confirm('確定要禁用此卡密嗎？')) return;
            
            const result = await apiRequest('/admin/licenses/disable', {
                method: 'POST',
                body: JSON.stringify({ license_key: key })
            });
            
            if (result.success) {
                showToast('卡密已禁用', 'success');
                await loadLicenses();
                await loadDashboard();
            } else {
                showToast('操作失敗: ' + result.message, 'error');
            }
        };
        
        const exportLicenses = () => {
            const data = filteredLicenses.value;
            let csv = '卡密,等級,類型,價格,狀態,創建時間,使用時間\n';
            data.forEach(l => {
                csv += `${l.key},${l.level},${l.typeName},${l.price},${l.status},${l.createdAt},${l.usedAt || ''}\n`;
            });
            
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `TGAI_licenses_${new Date().toISOString().slice(0,10)}.csv`;
            link.click();
            
            showToast(`已導出 ${data.length} 個卡密`, 'success');
        };
        
        const generateLicenses = async () => {
            isGenerating.value = true;
            
            const result = await apiRequest('/admin/licenses/generate', {
                method: 'POST',
                body: JSON.stringify({
                    level: generateForm.value.level,
                    duration: generateForm.value.duration,
                    count: generateForm.value.count,
                    notes: generateForm.value.notes
                })
            });
            
            isGenerating.value = false;
            
            if (result.success) {
                showGenerateModal.value = false;
                showToast(result.message, 'success');
                
                // 詢問是否複製卡密
                if (result.data && result.data.keys && result.data.keys.length > 0) {
                    if (confirm(`是否複製 ${result.data.keys.length} 個卡密到剪貼板？`)) {
                        const keys = result.data.keys.join('\n');
                        navigator.clipboard.writeText(keys);
                        showToast('已複製所有卡密到剪貼板', 'success');
                    }
                }
                
                await loadLicenses();
                await loadDashboard();
            } else {
                showToast('生成失敗: ' + result.message, 'error');
            }
        };
        
        // ============ 公告操作 ============
        
        const editAnnouncement = (ann) => {
            // TODO: 實現公告編輯
            alert('編輯公告: ' + ann.title);
        };
        
        const deleteAnnouncement = async (id) => {
            if (!confirm('確定要刪除此公告嗎？')) return;
            
            const result = await apiRequest(`/admin/announcements/${id}/delete`, {
                method: 'POST'
            });
            
            if (result.success) {
                showToast('公告已刪除', 'success');
                await loadAnnouncements();
            } else {
                showToast('刪除失敗: ' + result.message, 'error');
            }
        };
        
        // ============ 設置操作 ============
        
        const saveSettings = async () => {
            const settingsToSave = {
                usdt_trc20_address: settings.value.usdt_trc20_address,
                usdt_rate: settings.value.usdt_rate.toString(),
                alipay_enabled: settings.value.alipay_enabled ? '1' : '0',
                wechat_enabled: settings.value.wechat_enabled ? '1' : '0',
                trial_days: settings.value.trial_days.toString(),
                registration_enabled: settings.value.registration_enabled ? '1' : '0',
                referral_enabled: settings.value.referral_enabled ? '1' : '0',
                maintenance_mode: settings.value.maintenance_mode ? '1' : '0'
            };
            
            const result = await apiRequest('/admin/settings/save', {
                method: 'POST',
                body: JSON.stringify(settingsToSave)
            });
            
            if (result.success) {
                showToast('設置已保存', 'success');
            } else {
                showToast('保存失敗: ' + result.message, 'error');
            }
        };
        
        // ============ 其他 ============
        
        const handleLogout = () => {
            if (confirm('確定要登出嗎？')) {
                apiRequest('/admin/logout', { method: 'POST' });
                logout();
            }
        };
        
        // ============ 圖表 ============
        
        let revenueChart = null;
        let levelChart = null;
        
        const initCharts = () => {
            if (revenueChart) revenueChart.destroy();
            if (levelChart) levelChart.destroy();
            
            // 收入趨勢圖
            const revenueCtx = document.getElementById('revenueChart');
            if (revenueCtx) {
                const labels = revenueTrend.value.map(d => d.date.slice(5));
                const data = revenueTrend.value.map(d => d.revenue);
                
                revenueChart = new Chart(revenueCtx, {
                    type: 'line',
                    data: {
                        labels: labels.length ? labels : ['1/6', '1/7', '1/8', '1/9', '1/10', '1/11', '1/12'],
                        datasets: [{
                            label: '收入 (¥)',
                            data: data.length ? data : [0, 0, 0, 0, 0, 0, 0],
                            borderColor: '#8B5CF6',
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                            fill: true,
                            tension: 0.4,
                            pointBackgroundColor: '#8B5CF6',
                            pointRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { 
                                beginAtZero: true,
                                grid: { color: 'rgba(255,255,255,0.1)' },
                                ticks: { color: '#9CA3AF' }
                            },
                            x: { 
                                grid: { display: false },
                                ticks: { color: '#9CA3AF' }
                            }
                        }
                    }
                });
            }
            
            // 會員等級分布圖
            const levelCtx = document.getElementById('levelChart');
            if (levelCtx) {
                const levelNames = {
                    free: '青銅戰士', bronze: '青銅戰士', silver: '白銀精英', 
                    gold: '黃金大師', diamond: '鑽石王牌', star: '星耀傳說', king: '榮耀王者'
                };
                const levelColors = {
                    free: '#CD7F32', bronze: '#CD7F32', silver: '#C0C0C0', 
                    gold: '#FFD700', diamond: '#00CED1', star: '#9B59B6', king: '#FF6B6B'
                };
                
                const labels = [];
                const data = [];
                const colors = [];
                
                for (const [level, count] of Object.entries(levelDistribution.value)) {
                    if (count > 0) {
                        labels.push(levelNames[level] || level);
                        data.push(count);
                        colors.push(levelColors[level] || '#666');
                    }
                }
                
                if (labels.length === 0) {
                    labels.push('暫無數據');
                    data.push(1);
                    colors.push('#4B5563');
                }
                
                levelChart = new Chart(levelCtx, {
                    type: 'doughnut',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: data,
                            backgroundColor: colors,
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: { 
                                    color: '#9CA3AF',
                                    padding: 15,
                                    font: { size: 12 }
                                }
                            }
                        }
                    }
                });
            }
        };
        
        // ============ 頁面切換監聽 ============
        
        watch(currentPage, async (newPage) => {
            isLoading.value = true;
            
            if (newPage === 'dashboard') await loadDashboard();
            else if (newPage === 'users') await loadUsers();
            else if (newPage === 'licenses') await loadLicenses();
            else if (newPage === 'orders') await loadOrders();
            else if (newPage === 'logs') await loadLogs();
            else if (newPage === 'referrals') await loadReferralStats();
            else if (newPage === 'announcements') await loadAnnouncements();
            else if (newPage === 'settings') await loadSettings();
            
            isLoading.value = false;
        });
        
        // ============ 生命週期 ============
        
        onMounted(async () => {
            await loadDashboard();
        });
        
        // ============ 返回 ============
        
        return {
            // 狀態
            currentPage,
            menuItems,
            stats,
            users,
            userSearch,
            userFilter,
            filteredUsers,
            licenses,
            licenseFilter,
            licenseLevelFilter,
            licenseStats,
            filteredLicenses,
            orders,
            logs,
            referralStats,
            announcements,
            settings,
            quotaConfig,
            showGenerateModal,
            showExtendModal,
            showAnnouncementModal,
            generateForm,
            extendForm,
            isLoading,
            isGenerating,
            lastUpdate,
            adminUser,
            toast,
            
            // 格式化方法
            formatDate,
            formatQuota,
            isExpired,
            getStatusClass,
            getStatusText,
            getActionClass,
            
            // 用戶操作
            viewUser,
            extendUser,
            submitExtend,
            banUser,
            unbanUser,
            
            // 卡密操作
            copyLicense,
            disableLicense,
            exportLicenses,
            generateLicenses,
            
            // 公告操作
            editAnnouncement,
            deleteAnnouncement,
            
            // 設置操作
            saveSettings,
            
            // 其他
            refreshData,
            handleLogout
        };
    }
}).mount('#app');
