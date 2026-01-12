/**
 * TG-Matrix 管理後台
 * Vue 3 應用 - 真實數據版本
 */

const { createApp, ref, computed, onMounted, watch } = Vue;

// API 基礎URL
const API_BASE = '/api';

// 通用 API 請求函數
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: error.message };
    }
}

createApp({
    setup() {
        // ============ 狀態 ============
        const currentPage = ref('dashboard');
        const showGenerateModal = ref(false);
        const isLoading = ref(true);
        const lastUpdate = ref(null);
        
        // 菜單項
        const menuItems = [
            { id: 'dashboard', name: '儀表盤', icon: '📊' },
            { id: 'users', name: '用戶管理', icon: '👥' },
            { id: 'licenses', name: '卡密管理', icon: '🎟️' },
            { id: 'orders', name: '訂單管理', icon: '💰' },
            { id: 'settings', name: '系統設置', icon: '⚙️' },
        ];
        
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
        
        // 收入趨勢數據
        const revenueTrend = ref([]);
        
        // 會員等級分布
        const levelDistribution = ref({});
        
        // 價格設置
        const prices = ref({
            silver: { name: '🥈 白銀精英', monthly: 49 },
            gold: { name: '🥇 黃金大師', monthly: 99 },
            diamond: { name: '💎 鑽石王牌', monthly: 199 },
            star: { name: '🌟 星耀傳說', monthly: 399 },
            king: { name: '👑 榮耀王者', monthly: 999 },
        });
        
        // 支付配置
        const paymentConfig = ref({
            alipayAppId: '',
            wechatMchId: '',
            usdtAddress: ''
        });
        
        // 生成卡密表單
        const generateForm = ref({
            level: 'G',
            duration: '2',
            count: 10,
            notes: ''
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
                lastUpdate.value = new Date().toLocaleString();
                
                // 重新初始化圖表
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
        
        const loadSettings = async () => {
            const result = await apiRequest('/admin/settings');
            if (result.success) {
                prices.value = result.data.prices || prices.value;
                paymentConfig.value = result.data.payment || paymentConfig.value;
            }
        };
        
        const refreshData = async () => {
            await loadDashboard();
            if (currentPage.value === 'users') await loadUsers();
            if (currentPage.value === 'licenses') await loadLicenses();
            if (currentPage.value === 'orders') await loadOrders();
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
                    u.machineId.toLowerCase().includes(search)
                );
            }
            
            return result;
        });
        
        const filteredLicenses = computed(() => {
            if (licenseFilter.value === 'all') {
                return licenses.value;
            }
            return licenses.value.filter(l => l.status === licenseFilter.value);
        });
        
        // ============ 方法 ============
        const getLevelDisplay = (level) => {
            const levels = {
                free: '⚔️ 青銅戰士',
                bronze: '⚔️ 青銅戰士',
                silver: '🥈 白銀精英',
                gold: '🥇 黃金大師',
                diamond: '💎 鑽石王牌',
                star: '🌟 星耀傳說',
                king: '👑 榮耀王者'
            };
            return levels[level] || level;
        };
        
        const isExpired = (date) => {
            if (!date) return false;
            return new Date(date) < new Date();
        };
        
        const getStatusClass = (status) => {
            const classes = {
                unused: 'text-green-400',
                used: 'text-blue-400',
                disabled: 'text-red-400',
                expired: 'text-gray-400'
            };
            return classes[status] || 'text-gray-400';
        };
        
        const getStatusText = (status) => {
            const texts = {
                unused: '✅ 未使用',
                used: '✓ 已使用',
                disabled: '⛔ 已禁用',
                expired: '⏰ 已過期',
                pending: '⏳ 待支付',
                paid: '✅ 已支付'
            };
            return texts[status] || status;
        };
        
        const editUser = (user) => {
            alert(`編輯用戶: ${user.email || user.machineId}`);
        };
        
        const extendUser = (user) => {
            alert(`為用戶 ${user.email || user.machineId} 續費`);
        };
        
        const copyLicense = (key) => {
            navigator.clipboard.writeText(key);
            alert('已複製卡密: ' + key);
        };
        
        const disableLicense = async (key) => {
            if (confirm('確定要禁用此卡密嗎？')) {
                const result = await apiRequest('/admin/licenses/disable', {
                    method: 'POST',
                    body: JSON.stringify({ license_key: key })
                });
                
                if (result.success) {
                    alert('卡密已禁用');
                    await loadLicenses();
                } else {
                    alert('操作失敗: ' + result.message);
                }
            }
        };
        
        const exportLicenses = () => {
            const data = filteredLicenses.value;
            let csv = '卡密,類型,狀態,創建時間,使用時間\n';
            data.forEach(l => {
                csv += `${l.key},${l.typeName},${l.status},${l.createdAt},${l.usedAt || ''}\n`;
            });
            
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `licenses_${new Date().toISOString().slice(0,10)}.csv`;
            link.click();
        };
        
        const generateLicenses = async () => {
            const result = await apiRequest('/admin/licenses/generate', {
                method: 'POST',
                body: JSON.stringify({
                    level: generateForm.value.level,
                    duration: generateForm.value.duration,
                    count: generateForm.value.count,
                    notes: generateForm.value.notes
                })
            });
            
            if (result.success) {
                showGenerateModal.value = false;
                alert(result.message);
                
                // 顯示生成的卡密
                if (result.data && result.data.keys) {
                    const keys = result.data.keys.join('\n');
                    const showKeys = confirm('是否複製所有卡密到剪貼板？');
                    if (showKeys) {
                        navigator.clipboard.writeText(keys);
                        alert('已複製 ' + result.data.keys.length + ' 個卡密到剪貼板');
                    }
                }
                
                await loadLicenses();
                await loadDashboard();
            } else {
                alert('生成失敗: ' + result.message);
            }
        };
        
        const saveSettings = async () => {
            const result = await apiRequest('/admin/settings/save', {
                method: 'POST',
                body: JSON.stringify({
                    prices: prices.value,
                    payment: paymentConfig.value
                })
            });
            
            if (result.success) {
                alert('設置已保存');
            } else {
                alert('保存失敗: ' + result.message);
            }
        };
        
        // ============ 圖表 ============
        let revenueChart = null;
        let levelChart = null;
        
        const initCharts = () => {
            // 銷毀舊圖表
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
                            tension: 0.4
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
                    gold: '#FFD700', diamond: '#B9F2FF', star: '#9B59B6', king: '#FF6B6B'
                };
                
                const labels = [];
                const data = [];
                const colors = [];
                
                for (const [level, count] of Object.entries(levelDistribution.value)) {
                    labels.push(levelNames[level] || level);
                    data.push(count);
                    colors.push(levelColors[level] || '#666');
                }
                
                // 如果沒有數據，顯示默認
                if (labels.length === 0) {
                    labels.push('暫無數據');
                    data.push(1);
                    colors.push('#666');
                }
                
                levelChart = new Chart(levelCtx, {
                    type: 'doughnut',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: data,
                            backgroundColor: colors
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: { color: '#9CA3AF' }
                            }
                        }
                    }
                });
            }
        };
        
        // ============ 頁面切換時加載數據 ============
        watch(currentPage, async (newPage) => {
            if (newPage === 'dashboard') await loadDashboard();
            else if (newPage === 'users') await loadUsers();
            else if (newPage === 'licenses') await loadLicenses();
            else if (newPage === 'orders') await loadOrders();
            else if (newPage === 'settings') await loadSettings();
        });
        
        // ============ 生命週期 ============
        onMounted(async () => {
            await loadDashboard();
        });
        
        // ============ 返回 ============
        return {
            currentPage,
            menuItems,
            stats,
            users,
            userSearch,
            userFilter,
            filteredUsers,
            licenses,
            licenseFilter,
            licenseStats,
            filteredLicenses,
            orders,
            prices,
            paymentConfig,
            showGenerateModal,
            generateForm,
            isLoading,
            lastUpdate,
            getLevelDisplay,
            isExpired,
            getStatusClass,
            getStatusText,
            editUser,
            extendUser,
            copyLicense,
            disableLicense,
            exportLicenses,
            generateLicenses,
            saveSettings,
            refreshData
        };
    }
}).mount('#app');
