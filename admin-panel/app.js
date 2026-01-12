/**
 * TG-Matrix 管理後台
 * Vue 3 應用
 */

const { createApp, ref, computed, onMounted } = Vue;

// API 基礎URL（根據實際部署修改）
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:8080' 
    : '';

createApp({
    setup() {
        // ============ 狀態 ============
        const currentPage = ref('dashboard');
        const showGenerateModal = ref(false);
        
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
            totalUsers: 1256,
            newUsersToday: 45,
            paidUsers: 328,
            conversionRate: 26.1,
            totalRevenue: 156800,
            revenueToday: 4580,
            totalLicenses: 500,
            unusedLicenses: 342
        });
        
        // 用戶數據
        const users = ref([
            { id: 1, email: 'user1@example.com', machineId: 'mid-abc123456789', level: 'king', expiresAt: '2026-12-31', totalSpent: 6999, createdAt: '2026-01-01' },
            { id: 2, email: 'user2@example.com', machineId: 'mid-def456789012', level: 'diamond', expiresAt: '2026-06-15', totalSpent: 1599, createdAt: '2026-01-05' },
            { id: 3, email: 'user3@example.com', machineId: 'mid-ghi789012345', level: 'gold', expiresAt: '2026-02-28', totalSpent: 799, createdAt: '2026-01-10' },
            { id: 4, email: null, machineId: 'mid-jkl012345678', level: 'silver', expiresAt: '2026-02-15', totalSpent: 49, createdAt: '2026-01-12' },
            { id: 5, email: 'free@example.com', machineId: 'mid-mno345678901', level: 'bronze', expiresAt: null, totalSpent: 0, createdAt: '2026-01-12' },
        ]);
        
        const userSearch = ref('');
        const userFilter = ref('all');
        
        // 卡密數據
        const licenses = ref([
            { key: 'TGM-K2-ABCD-EFGH-IJKL', typeName: '👑 王者月卡', level: 'king', days: 30, price: 999, status: 'unused', createdAt: '2026-01-12', usedAt: null },
            { key: 'TGM-D2-MNOP-QRST-UVWX', typeName: '💎 鑽石月卡', level: 'diamond', days: 30, price: 199, status: 'unused', createdAt: '2026-01-12', usedAt: null },
            { key: 'TGM-G3-YZAB-CDEF-GHIJ', typeName: '🥇 黃金季卡', level: 'gold', days: 90, price: 249, status: 'used', createdAt: '2026-01-10', usedAt: '2026-01-11' },
            { key: 'TGM-B2-KLMN-OPQR-STUV', typeName: '🥈 白銀月卡', level: 'silver', days: 30, price: 49, status: 'used', createdAt: '2026-01-08', usedAt: '2026-01-09' },
        ]);
        
        const licenseFilter = ref('all');
        
        // 卡密統計
        const licenseStats = ref({
            silver: { name: '白銀精英', icon: '🥈', total: 100, unused: 85 },
            gold: { name: '黃金大師', icon: '🥇', total: 80, unused: 62 },
            diamond: { name: '鑽石王牌', icon: '💎', total: 50, unused: 38 },
            star: { name: '星耀傳說', icon: '🌟', total: 30, unused: 22 },
            king: { name: '榮耀王者', icon: '👑', total: 20, unused: 15 },
        });
        
        // 訂單數據
        const orders = ref([
            { id: 1, orderId: 'TGM1736648400ABCD', productName: '👑 王者年卡', amount: 6999, paymentMethod: '支付寶', status: 'paid', createdAt: '2026-01-12 10:00' },
            { id: 2, orderId: 'TGM1736645000EFGH', productName: '💎 鑽石月卡', amount: 199, paymentMethod: '微信支付', status: 'paid', createdAt: '2026-01-12 09:30' },
            { id: 3, orderId: 'TGM1736641600IJKL', productName: '🥇 黃金月卡', amount: 99, paymentMethod: 'USDT', status: 'pending', createdAt: '2026-01-12 09:00' },
        ]);
        
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
                expired: '⏰ 已過期'
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
        
        const disableLicense = (key) => {
            if (confirm('確定要禁用此卡密嗎？')) {
                const license = licenses.value.find(l => l.key === key);
                if (license) {
                    license.status = 'disabled';
                }
            }
        };
        
        const exportLicenses = () => {
            const data = filteredLicenses.value;
            let csv = '卡密,類型,狀態,創建時間,使用時間\n';
            data.forEach(l => {
                csv += `${l.key},${l.typeName},${l.status},${l.createdAt},${l.usedAt || ''}\n`;
            });
            
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'licenses.csv';
            link.click();
        };
        
        const generateLicenses = async () => {
            const typeCode = generateForm.value.level + generateForm.value.duration;
            const count = generateForm.value.count;
            
            // 模擬生成
            const levelNames = {
                B: '🥈 白銀', G: '🥇 黃金', D: '💎 鑽石', S: '🌟 星耀', K: '👑 王者'
            };
            const durationNames = {
                '1': '周卡', '2': '月卡', '3': '季卡', 'Y': '年卡'
            };
            
            const typeName = levelNames[generateForm.value.level] + durationNames[generateForm.value.duration];
            
            for (let i = 0; i < count; i++) {
                const key = `TGM-${typeCode}-${randomStr()}-${randomStr()}-${randomStr()}`;
                licenses.value.unshift({
                    key,
                    typeName,
                    level: generateForm.value.level.toLowerCase(),
                    days: { '1': 7, '2': 30, '3': 90, 'Y': 365 }[generateForm.value.duration],
                    status: 'unused',
                    createdAt: new Date().toISOString().split('T')[0],
                    usedAt: null
                });
            }
            
            showGenerateModal.value = false;
            alert(`成功生成 ${count} 個 ${typeName} 卡密！`);
        };
        
        const randomStr = () => {
            return Math.random().toString(36).substring(2, 6).toUpperCase();
        };
        
        // ============ 圖表 ============
        const initCharts = () => {
            // 收入趨勢圖
            const revenueCtx = document.getElementById('revenueChart');
            if (revenueCtx) {
                new Chart(revenueCtx, {
                    type: 'line',
                    data: {
                        labels: ['1/6', '1/7', '1/8', '1/9', '1/10', '1/11', '1/12'],
                        datasets: [{
                            label: '收入 (¥)',
                            data: [3200, 4500, 3800, 5200, 4800, 6100, 4580],
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
                new Chart(levelCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['青銅戰士', '白銀精英', '黃金大師', '鑽石王牌', '星耀傳說', '榮耀王者'],
                        datasets: [{
                            data: [928, 180, 85, 42, 15, 6],
                            backgroundColor: [
                                '#CD7F32', '#C0C0C0', '#FFD700', 
                                '#B9F2FF', '#9B59B6', '#FF6B6B'
                            ]
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
        
        // ============ 生命週期 ============
        onMounted(() => {
            // 延遲初始化圖表，等待 DOM 渲染
            setTimeout(initCharts, 100);
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
            getLevelDisplay,
            isExpired,
            getStatusClass,
            getStatusText,
            editUser,
            extendUser,
            copyLicense,
            disableLicense,
            exportLicenses,
            generateLicenses
        };
    }
}).mount('#app');
