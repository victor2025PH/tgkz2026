/**
 * TG-AI智控王 管理後台
 * Vue 3 應用 v2.0
 * 
 * 配置說明：
 * - 本地部署：API_BASE = '/api'（默認）
 * - GitHub Pages：需要設置 localStorage['api_server'] = 'https://your-server.com'
 */

const { createApp, ref, computed, onMounted, watch, reactive } = Vue;

// API 基礎URL（支持從 localStorage 讀取遠程服務器地址）
const API_SERVER = localStorage.getItem('api_server') || '';
const API_BASE = API_SERVER ? `${API_SERVER}/api` : '/api';

// 如果未配置服務器且是 GitHub Pages，顯示配置提示
if (!API_SERVER && window.location.hostname.endsWith('.github.io')) {
    console.warn('⚠️ 未配置 API 服務器地址，請在瀏覽器控制台執行：');
    console.warn('localStorage.setItem("api_server", "https://your-api-server.com")');
}

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
    window.location.href = 'login.html';  // 使用相對路徑
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
        const showUserModal = ref(false);
        const showCouponModal = ref(false);
        const isLoading = ref(true);
        const isGenerating = ref(false);
        const lastUpdate = ref(null);
        const adminUser = ref(getCurrentUser());
        
        // 用戶詳情
        const userDetail = ref(null);
        
        // 確認對話框
        const confirmDialog = reactive({
            show: false,
            title: '',
            message: '',
            icon: '⚠️',
            type: 'normal',
            onConfirm: () => {}
        });
        
        // 公告表單
        const announcementForm = ref({
            id: null,
            title: '',
            content: '',
            type: 'info',
            status: 'draft',
            is_pinned: false,
            is_popup: false
        });
        
        // 優惠券表單
        const couponForm = ref({
            code: '',
            discount_type: 'percent',
            discount_value: 10,
            min_amount: 0,
            max_uses: 100,
            expires_at: ''
        });
        
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
            { id: 'expiring', name: '即將到期', icon: '⏰', badge: null },
            { id: 'licenses', name: '卡密管理', icon: '🎟️' },
            { id: 'orders', name: '訂單管理', icon: '💰' },
            { id: 'revenue', name: '收入報表', icon: '💹' },
            { id: 'analytics', name: '用戶分析', icon: '📈' },
            { id: 'quotas', name: '配額監控', icon: '📉' },
            { id: 'referrals', name: '邀請管理', icon: '🎁' },
            { id: 'notifications', name: '批量通知', icon: '📨' },
            { id: 'announcements', name: '公告管理', icon: '📢' },
            { id: 'devices', name: '設備管理', icon: '💻' },
            { id: 'logs', name: '操作日誌', icon: '📝' },
            { id: 'admins', name: '管理員', icon: '👤' },
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
        const userPagination = ref({ total: 0, page: 1, page_size: 50, total_pages: 1 });
        
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
        const orderSearch = ref('');
        const orderStatusFilter = ref('');
        
        // 日誌數據
        const logs = ref([]);
        
        // 即將到期用戶
        const expiringUsers = ref([]);
        const expiringDays = ref(7);
        
        // 配額監控
        const quotaStats = ref([]);
        const quotaFilter = ref('all');
        
        // 批量通知
        const notificationForm = ref({
            targetLevel: 'all',
            targetExpiring: false,
            expiringDays: 7,
            title: '',
            content: '',
            type: 'info'
        });
        const notificationHistory = ref([]);
        
        // 設備管理
        const devices = ref([]);
        const deviceFilter = ref('all');
        
        // 管理員列表
        const admins = ref([]);
        const showAdminModal = ref(false);
        const editingAdmin = ref(null);
        const adminForm = ref({
            username: '',
            password: '',
            name: '',
            email: '',
            role: 'admin',
            permissions: []
        });
        
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
        
        // 收入報表
        const revenueReportDays = ref(30);
        const revenueReport = ref({
            summary: {},
            trend: [],
            byLevel: [],
            byDuration: []
        });
        
        // 用戶分析
        const userAnalytics = ref({
            userGrowth: [],
            activeTrend: [],
            retention: {},
            conversion: {},
            arpu: 0,
            arppu: 0,
            levelDistribution: {},
            referralStats: {}
        });
        
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
        
        // 價格編輯狀態
        const editingPrices = ref(false);
        
        // 密碼修改表單
        const passwordForm = ref({
            old_password: '',
            new_password: '',
            confirm_password: ''
        });
        
        // Telegram 配置
        const telegramConfig = ref({
            bot_token: '',
            chat_id: ''
        });
        
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
                const data = result.data || result;  // 兼容新舊格式
                // 合併 stats，保留默認值
                stats.value = {
                    totalUsers: data.stats?.totalUsers ?? 0,
                    newUsersToday: data.stats?.newUsersToday ?? 0,
                    paidUsers: data.stats?.paidUsers ?? 0,
                    conversionRate: data.stats?.conversionRate ?? 0,
                    totalRevenue: data.stats?.totalRevenue ?? 0,
                    revenueToday: data.stats?.revenueToday ?? 0,
                    totalLicenses: data.stats?.totalLicenses ?? data.licenseStats?.total ?? 0,
                    unusedLicenses: data.stats?.unusedLicenses ?? data.licenseStats?.unused ?? 0
                };
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
                // 兼容新舊 API 格式
                const rawUsers = result.data?.users || result.data || result.users || [];
                
                // 等級配置
                const levelConfig = {
                    free: { icon: '⚔️', name: '青銅戰士' },
                    bronze: { icon: '⚔️', name: '青銅戰士' },
                    silver: { icon: '🥈', name: '白銀精英' },
                    gold: { icon: '🥇', name: '黃金大師' },
                    diamond: { icon: '💎', name: '鑽石王牌' },
                    star: { icon: '🌟', name: '星耀傳說' },
                    king: { icon: '👑', name: '榮耀王者' }
                };
                
                // 標準化用戶數據，添加 Fallback
                users.value = rawUsers.map(user => {
                    const level = user.level || user.membership_level || user.subscription_tier || 'free';
                    const config = levelConfig[level] || levelConfig.free;
                    const userId = user.userId || user.user_id || user.id || '';
                    
                    // 顯示名 Fallback 鏈
                    const displayName = user.nickname || user.display_name || user.name || 
                                       user.telegramUsername || user.telegram_username || 
                                       user.email?.split('@')[0] || 
                                       (userId ? `用戶_${userId.slice(-6)}` : '匿名用戶');
                    
                    return {
                        ...user,
                        userId,
                        displayName,
                        // 首字母（用於頭像）
                        avatarLetter: (displayName[0] || '?').toUpperCase(),
                        // 等級信息
                        level,
                        levelIcon: config.icon,
                        levelName: config.name,
                        // 狀態
                        isBanned: !!(user.isBanned || user.is_banned) || user.is_active === 0,
                        isLifetime: level === 'king' || user.isLifetime,
                        // 到期時間
                        expiresAt: user.expiresAt || user.expires_at || user.subscription_expires || '',
                        // Telegram 信息
                        telegramUsername: user.telegramUsername || user.telegram_username || '',
                        telegramId: user.telegramId || user.telegram_id || '',
                        // 邀請和消費
                        totalInvites: user.totalInvites || user.total_invites || 0,
                        totalSpent: user.totalSpent || user.total_spent || 0,
                        // 時間
                        createdAt: user.createdAt || user.created_at || '',
                        lastLoginAt: user.lastLoginAt || user.last_login_at || ''
                    };
                });
                
                // 保存分頁信息
                if (result.data?.pagination) {
                    userPagination.value = result.data.pagination;
                }
            }
        };
        
        const loadLicenses = async () => {
            const result = await apiRequest('/admin/licenses');
            if (result.success) {
                // 兼容新舊格式
                const rawLicenses = result.data?.licenses || result.data || result.licenses || [];
                licenses.value = Array.isArray(rawLicenses) ? rawLicenses.map(l => ({
                    ...l,
                    // 標準化字段
                    key: l.key || l.license_key,
                    level: l.level || 'S',
                    status: l.status || 'unused',
                    createdAt: l.createdAt || l.created_at || '',
                    usedAt: l.usedAt || l.used_at || '',
                    usedBy: l.usedBy || l.used_by || ''
                })) : [];
            }
        };
        
        const loadOrders = async () => {
            let url = '/admin/orders';
            if (orderStatusFilter.value) {
                url += `?status=${orderStatusFilter.value}`;
            }
            const result = await apiRequest(url);
            if (result.success) {
                // 兼容新舊格式
                const rawOrders = result.data?.orders || result.data || result.orders || [];
                orders.value = Array.isArray(rawOrders) ? rawOrders.map(o => ({
                    ...o,
                    orderId: o.orderId || o.order_id || o.id,
                    userId: o.userId || o.user_id,
                    amount: o.amount || 0,
                    status: o.status || 'pending',
                    createdAt: o.createdAt || o.created_at || '',
                    paidAt: o.paidAt || o.paid_at || ''
                })) : [];
            }
        };
        
        const confirmPayment = async (orderId) => {
            if (!confirm(`確認將訂單 ${orderId} 標記為已支付？\n這將為用戶激活會員！`)) {
                return;
            }
            
            const result = await apiRequest('/admin/orders/confirm', {
                method: 'POST',
                body: JSON.stringify({ order_id: orderId })
            });
            
            if (result.success) {
                showToast('支付確認成功，會員已激活', 'success');
                await loadOrders();
            }
        };
        
        const loadLogs = async () => {
            const result = await apiRequest('/admin/logs');
            if (result.success) {
                logs.value = result.data;
            }
        };
        
        const loadAdmins = async () => {
            const result = await apiRequest('/admin/admins');
            if (result.success) {
                admins.value = result.data;
            }
        };
        
        const openNewAdminModal = () => {
            editingAdmin.value = null;
            adminForm.value = {
                username: '',
                password: '',
                name: '',
                email: '',
                role: 'admin',
                permissions: []
            };
            showAdminModal.value = true;
        };
        
        const editAdmin = (admin) => {
            editingAdmin.value = admin;
            adminForm.value = {
                username: admin.username,
                password: '',
                name: admin.name || '',
                email: admin.email || '',
                role: admin.role || 'admin',
                permissions: admin.permissions ? admin.permissions.split(',') : []
            };
            showAdminModal.value = true;
        };
        
        const saveAdmin = async () => {
            if (editingAdmin.value) {
                // 更新
                const data = { ...adminForm.value };
                if (!data.password) delete data.password;
                
                const result = await apiRequest(`/admin/admins/${editingAdmin.value.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
                if (result.success) {
                    showToast('管理員更新成功', 'success');
                    showAdminModal.value = false;
                    await loadAdmins();
                }
            } else {
                // 創建
                if (!adminForm.value.username || !adminForm.value.password) {
                    showToast('用戶名和密碼必填', 'error');
                    return;
                }
                
                const result = await apiRequest('/admin/admins', {
                    method: 'POST',
                    body: JSON.stringify(adminForm.value)
                });
                if (result.success) {
                    showToast('管理員創建成功', 'success');
                    showAdminModal.value = false;
                    await loadAdmins();
                }
            }
        };
        
        const toggleAdminStatus = async (admin) => {
            const result = await apiRequest(`/admin/admins/${admin.id}`, {
                method: 'PUT',
                body: JSON.stringify({ is_active: !admin.is_active })
            });
            if (result.success) {
                showToast(admin.is_active ? '管理員已禁用' : '管理員已啟用', 'success');
                await loadAdmins();
            }
        };
        
        const deleteAdmin = async (admin) => {
            if (!confirm(`確定刪除管理員 ${admin.username}？`)) return;
            
            const result = await apiRequest(`/admin/admins/${admin.id}`, {
                method: 'DELETE'
            });
            if (result.success) {
                showToast('管理員已刪除', 'success');
                await loadAdmins();
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
        
        const loadRevenueReport = async () => {
            const result = await apiRequest(`/admin/revenue-report?days=${revenueReportDays.value}`);
            if (result.success) {
                revenueReport.value = result.data;
                setTimeout(initRevenueCharts, 100);
            }
        };
        
        const loadUserAnalytics = async () => {
            const result = await apiRequest('/admin/user-analytics?days=30');
            if (result.success) {
                userAnalytics.value = result.data;
                setTimeout(initAnalyticsCharts, 100);
            }
        };
        
        // ============ 即將到期用戶 ============
        const loadExpiringUsers = async () => {
            const result = await apiRequest(`/admin/expiring-users?days=${expiringDays.value}`);
            if (result.success) {
                expiringUsers.value = result.data || [];
                // 更新菜單徽章
                const menuItem = menuItems.value.find(m => m.id === 'expiring');
                if (menuItem) {
                    menuItem.badge = expiringUsers.value.length > 0 ? expiringUsers.value.length : null;
                }
            }
        };
        
        const sendExpiryReminder = async (userId) => {
            const result = await apiRequest('/admin/notifications/send', {
                method: 'POST',
                body: JSON.stringify({
                    user_ids: [userId],
                    title: '會員即將到期提醒',
                    content: '您的會員即將到期，續費享優惠！',
                    type: 'warning'
                })
            });
            if (result.success) {
                showToast('提醒已發送', 'success');
            } else {
                showToast(result.message || '發送失敗', 'error');
            }
        };
        
        const batchSendExpiryReminders = async () => {
            if (expiringUsers.value.length === 0) {
                showToast('沒有即將到期的用戶', 'warning');
                return;
            }
            
            if (!confirm(`確定向 ${expiringUsers.value.length} 個即將到期用戶發送提醒？`)) return;
            
            const userIds = expiringUsers.value.map(u => u.user_id);
            const result = await apiRequest('/admin/notifications/send', {
                method: 'POST',
                body: JSON.stringify({
                    user_ids: userIds,
                    title: '會員即將到期提醒',
                    content: `您的會員將在 ${expiringDays.value} 天內到期，立即續費享受優惠！`,
                    type: 'warning'
                })
            });
            if (result.success) {
                showToast(`已向 ${userIds.length} 個用戶發送提醒`, 'success');
            } else {
                showToast(result.message || '發送失敗', 'error');
            }
        };
        
        // ============ 配額監控 ============
        const loadQuotaStats = async () => {
            const result = await apiRequest('/admin/quota-usage');
            if (result.success) {
                quotaStats.value = result.data || [];
            }
        };
        
        const filteredQuotaStats = computed(() => {
            if (quotaFilter.value === 'all') return quotaStats.value;
            return quotaStats.value.filter(u => {
                if (quotaFilter.value === 'exceeded') {
                    return u.messagesPercent >= 90 || u.aiPercent >= 90;
                }
                return u.level === quotaFilter.value;
            });
        });
        
        // ============ 批量通知 ============
        const sendBatchNotification = async () => {
            if (!notificationForm.value.title || !notificationForm.value.content) {
                showToast('請填寫標題和內容', 'error');
                return;
            }
            
            const result = await apiRequest('/admin/notifications/batch', {
                method: 'POST',
                body: JSON.stringify({
                    target_level: notificationForm.value.targetLevel,
                    target_expiring: notificationForm.value.targetExpiring,
                    expiring_days: notificationForm.value.expiringDays,
                    title: notificationForm.value.title,
                    content: notificationForm.value.content,
                    type: notificationForm.value.type
                })
            });
            
            if (result.success) {
                showToast(`通知已發送給 ${result.data?.count || 0} 個用戶`, 'success');
                notificationForm.value = {
                    targetLevel: 'all',
                    targetExpiring: false,
                    expiringDays: 7,
                    title: '',
                    content: '',
                    type: 'info'
                };
                await loadNotificationHistory();
            } else {
                showToast(result.message || '發送失敗', 'error');
            }
        };
        
        const loadNotificationHistory = async () => {
            const result = await apiRequest('/admin/notifications/history');
            if (result.success) {
                notificationHistory.value = result.data || [];
            }
        };
        
        // ============ 設備管理 ============
        const loadDevices = async () => {
            const result = await apiRequest('/admin/devices');
            if (result.success) {
                devices.value = result.data || [];
            }
        };
        
        const filteredDevices = computed(() => {
            if (deviceFilter.value === 'all') return devices.value;
            if (deviceFilter.value === 'online') {
                return devices.value.filter(d => d.isOnline);
            }
            if (deviceFilter.value === 'offline') {
                return devices.value.filter(d => !d.isOnline);
            }
            return devices.value.filter(d => d.level === deviceFilter.value);
        });
        
        const revokeDevice = async (deviceId) => {
            if (!confirm('確定要解綁此設備？用戶需要重新激活。')) return;
            
            const result = await apiRequest(`/admin/devices/${deviceId}/revoke`, {
                method: 'POST'
            });
            if (result.success) {
                showToast('設備已解綁', 'success');
                await loadDevices();
            } else {
                showToast(result.message || '操作失敗', 'error');
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
            if (currentPage.value === 'expiring') await loadExpiringUsers();
            if (currentPage.value === 'quotas') await loadQuotaStats();
            if (currentPage.value === 'notifications') await loadNotificationHistory();
            if (currentPage.value === 'devices') await loadDevices();
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
        
        const filteredOrders = computed(() => {
            let result = orders.value;
            
            if (orderSearch.value) {
                const search = orderSearch.value.toLowerCase();
                result = result.filter(o => 
                    (o.order_id && o.order_id.toLowerCase().includes(search)) ||
                    (o.user_id && o.user_id.toLowerCase().includes(search))
                );
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
                userDetail.value = result.data;
                showUserModal.value = true;
            } else {
                showToast('獲取用戶詳情失敗', 'error');
            }
        };
        
        // 獲取配額標籤
        const getQuotaLabel = (key) => {
            const labels = {
                tg_accounts: 'TG帳號',
                daily_messages: '日消息',
                ai_calls: 'AI調用',
                devices: '設備數',
                groups: '群組數',
                auto_reply_rules: '自動回覆',
                scheduled_tasks: '定時任務',
                data_retention_days: '數據保留天數'
            };
            return labels[key] || key;
        };
        
        // 確認操作
        const showConfirm = (title, message, onConfirm, type = 'normal', icon = '⚠️') => {
            confirmDialog.title = title;
            confirmDialog.message = message;
            confirmDialog.icon = icon;
            confirmDialog.type = type;
            confirmDialog.onConfirm = onConfirm;
            confirmDialog.show = true;
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
            const userId = user.userId || user.user_id;
            showConfirm(
                '封禁用戶',
                `確定要封禁用戶 ${user.email || userId} 嗎？封禁後該用戶將無法使用服務。`,
                async () => {
                    const result = await apiRequest(`/admin/users/${userId}/ban`, {
                        method: 'POST',
                        body: JSON.stringify({ is_banned: true, reason: '管理員封禁' })
                    });
                    
                    if (result.success) {
                        showToast('用戶已封禁', 'success');
                        await loadUsers();
                    } else {
                        showToast('操作失敗: ' + result.message, 'error');
                    }
                },
                'danger',
                '🚫'
            );
        };
        
        const unbanUser = async (user) => {
            const userId = user.userId || user.user_id;
            const result = await apiRequest(`/admin/users/${userId}/ban`, {
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
            showConfirm(
                '禁用卡密',
                `確定要禁用卡密 ${key} 嗎？禁用後無法恢復。`,
                async () => {
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
                },
                'danger',
                '⛔'
            );
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
            announcementForm.value = {
                id: ann.id,
                title: ann.title,
                content: ann.content,
                type: ann.announcement_type || 'info',
                status: ann.status || 'draft',
                is_pinned: !!ann.is_pinned,
                is_popup: !!ann.is_popup
            };
            showAnnouncementModal.value = true;
        };
        
        const resetAnnouncementForm = () => {
            announcementForm.value = {
                id: null,
                title: '',
                content: '',
                type: 'info',
                status: 'draft',
                is_pinned: false,
                is_popup: false
            };
        };
        
        const saveAnnouncement = async () => {
            const form = announcementForm.value;
            if (!form.title || !form.content) {
                showToast('標題和內容不能為空', 'error');
                return;
            }
            
            const endpoint = form.id 
                ? `/admin/announcements/${form.id}/update`
                : '/admin/announcements';
            
            const result = await apiRequest(endpoint, {
                method: 'POST',
                body: JSON.stringify({
                    title: form.title,
                    content: form.content,
                    type: form.type,
                    status: form.status,
                    is_pinned: form.is_pinned,
                    is_popup: form.is_popup
                })
            });
            
            if (result.success) {
                showToast(form.id ? '公告已更新' : '公告已發布', 'success');
                showAnnouncementModal.value = false;
                resetAnnouncementForm();
                await loadAnnouncements();
            } else {
                showToast('操作失敗: ' + result.message, 'error');
            }
        };
        
        const deleteAnnouncement = async (id) => {
            showConfirm(
                '刪除公告',
                '確定要刪除此公告嗎？此操作無法撤銷。',
                async () => {
                    const result = await apiRequest(`/admin/announcements/${id}/delete`, {
                        method: 'POST'
                    });
                    
                    if (result.success) {
                        showToast('公告已刪除', 'success');
                        await loadAnnouncements();
                    } else {
                        showToast('刪除失敗: ' + result.message, 'error');
                    }
                },
                'danger',
                '🗑️'
            );
        };
        
        // 優惠券操作
        const createCoupon = async () => {
            const form = couponForm.value;
            
            const result = await apiRequest('/admin/coupons', {
                method: 'POST',
                body: JSON.stringify(form)
            });
            
            if (result.success) {
                showToast('優惠券已創建: ' + (result.data?.code || ''), 'success');
                showCouponModal.value = false;
                couponForm.value = {
                    code: '',
                    discount_type: 'percent',
                    discount_value: 10,
                    min_amount: 0,
                    max_uses: 100,
                    expires_at: ''
                };
            } else {
                showToast('創建失敗: ' + result.message, 'error');
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
        
        // 保存價格配置
        const savePrices = async () => {
            if (!editingPrices.value) {
                // 進入編輯模式前，確保每個等級都有 prices 對象
                for (const [level, config] of Object.entries(quotaConfig.value)) {
                    if (!config.prices) {
                        config.prices = { week: 0, month: 0, quarter: 0, year: 0, lifetime: 0 };
                    }
                }
                editingPrices.value = true;
                return;
            }
            
            // 正在編輯，點擊保存
            const pricesToSave = {};
            for (const [level, config] of Object.entries(quotaConfig.value)) {
                if (level !== 'bronze' && config.prices) {
                    pricesToSave[level] = {
                        week: config.prices.week || 0,
                        month: config.prices.month || 0,
                        quarter: config.prices.quarter || 0,
                        year: config.prices.year || 0,
                        lifetime: config.prices.lifetime || 0
                    };
                }
            }
            
            const result = await apiRequest('/admin/prices/save', {
                method: 'POST',
                body: JSON.stringify({ prices: pricesToSave })
            });
            
            if (result.success) {
                showToast('價格配置已保存', 'success');
                editingPrices.value = false;
            } else {
                showToast('保存價格失敗: ' + result.message, 'error');
            }
        };
        
        const changePassword = async () => {
            if (!passwordForm.value.old_password || !passwordForm.value.new_password) {
                showToast('請輸入舊密碼和新密碼', 'error');
                return;
            }
            if (passwordForm.value.new_password !== passwordForm.value.confirm_password) {
                showToast('兩次輸入的密碼不一致', 'error');
                return;
            }
            if (passwordForm.value.new_password.length < 6) {
                showToast('密碼長度至少 6 位', 'error');
                return;
            }
            
            const result = await apiRequest('/admin/change-password', {
                method: 'POST',
                body: JSON.stringify(passwordForm.value)
            });
            
            if (result.success) {
                showToast('密碼修改成功', 'success');
                passwordForm.value = { old_password: '', new_password: '', confirm_password: '' };
            }
        };
        
        const saveTelegramConfig = async () => {
            const result = await apiRequest('/admin/telegram/config', {
                method: 'POST',
                body: JSON.stringify(telegramConfig.value)
            });
            if (result.success) {
                showToast('Telegram 配置已保存', 'success');
            }
        };
        
        const testTelegram = async () => {
            const result = await apiRequest('/admin/telegram/test', {
                method: 'POST'
            });
            if (result.success) {
                showToast('測試消息發送成功！', 'success');
            }
        };
        
        const exportData = (type, status = '') => {
            let url = `${API_BASE}/admin/export/${type}?`;
            if (status) url += `status=${status}&`;
            
            const token = localStorage.getItem('admin_token');
            
            fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(response => response.blob())
            .then(blob => {
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `${type}_export.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(downloadUrl);
                showToast(`${type} 數據導出成功`, 'success');
            })
            .catch(err => {
                showToast('導出失敗: ' + err.message, 'error');
            });
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
                            label: '收入 (USDT)',
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
        
        // ============ 輔助函數 ============
        
        const getLevelName = (level) => {
            const names = {
                bronze: '⚔️ 青銅戰士',
                silver: '🥈 白銀精英',
                gold: '🥇 黃金大師',
                diamond: '💎 鑽石王牌',
                star: '🌟 星耀傳說',
                king: '👑 榮耀王者'
            };
            return names[level] || level;
        };
        
        const getDurationName = (duration) => {
            const names = {
                week: '周卡',
                month: '月卡',
                quarter: '季卡',
                year: '年卡',
                lifetime: '終身',
                custom: '自定義'
            };
            return names[duration] || duration;
        };
        
        // ============ 圖表初始化 ============
        
        let revenueTrendChart = null;
        let revenueByLevelChart = null;
        let userGrowthChart = null;
        let userLevelChart = null;
        
        const initRevenueCharts = () => {
            // 收入趨勢圖
            const trendCtx = document.getElementById('revenueTrendChart');
            if (trendCtx) {
                if (revenueTrendChart) revenueTrendChart.destroy();
                
                const data = revenueReport.value.trend || [];
                revenueTrendChart = new Chart(trendCtx, {
                    type: 'bar',
                    data: {
                        labels: data.map(d => d.period).reverse(),
                        datasets: [{
                            label: '收入 (USDT)',
                            data: data.map(d => d.revenue).reverse(),
                            backgroundColor: 'rgba(34, 197, 94, 0.6)',
                            borderColor: '#22C55E',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#9CA3AF' } },
                            x: { grid: { display: false }, ticks: { color: '#9CA3AF' } }
                        }
                    }
                });
            }
            
            // 等級收入分布
            const levelCtx = document.getElementById('revenueByLevelChart');
            if (levelCtx) {
                if (revenueByLevelChart) revenueByLevelChart.destroy();
                
                const data = revenueReport.value.byLevel || [];
                const levelColors = {
                    bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700',
                    diamond: '#00CED1', star: '#9B59B6', king: '#FF6B6B'
                };
                
                revenueByLevelChart = new Chart(levelCtx, {
                    type: 'pie',
                    data: {
                        labels: data.map(d => getLevelName(d.product_level)),
                        datasets: [{
                            data: data.map(d => d.revenue),
                            backgroundColor: data.map(d => levelColors[d.product_level] || '#666')
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'right', labels: { color: '#9CA3AF' } }
                        }
                    }
                });
            }
        };
        
        const initAnalyticsCharts = () => {
            // 用戶增長圖
            const growthCtx = document.getElementById('userGrowthChart');
            if (growthCtx) {
                if (userGrowthChart) userGrowthChart.destroy();
                
                const data = userAnalytics.value.userGrowth || [];
                userGrowthChart = new Chart(growthCtx, {
                    type: 'line',
                    data: {
                        labels: data.map(d => d.date?.slice(5)).reverse(),
                        datasets: [{
                            label: '新用戶',
                            data: data.map(d => d.new_users).reverse(),
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
                            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#9CA3AF' } },
                            x: { grid: { display: false }, ticks: { color: '#9CA3AF' } }
                        }
                    }
                });
            }
            
            // 等級分布圖
            const levelCtx = document.getElementById('userLevelChart');
            if (levelCtx) {
                if (userLevelChart) userLevelChart.destroy();
                
                const data = userAnalytics.value.levelDistribution || {};
                const levelColors = {
                    bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700',
                    diamond: '#00CED1', star: '#9B59B6', king: '#FF6B6B'
                };
                
                const labels = Object.keys(data);
                userLevelChart = new Chart(levelCtx, {
                    type: 'doughnut',
                    data: {
                        labels: labels.map(l => getLevelName(l)),
                        datasets: [{
                            data: Object.values(data),
                            backgroundColor: labels.map(l => levelColors[l] || '#666')
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: { position: 'right', labels: { color: '#9CA3AF' } }
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
            else if (newPage === 'expiring') await loadExpiringUsers();
            else if (newPage === 'licenses') await loadLicenses();
            else if (newPage === 'orders') await loadOrders();
            else if (newPage === 'revenue') await loadRevenueReport();
            else if (newPage === 'analytics') await loadUserAnalytics();
            else if (newPage === 'quotas') await loadQuotaStats();
            else if (newPage === 'notifications') await loadNotificationHistory();
            else if (newPage === 'devices') await loadDevices();
            else if (newPage === 'logs') await loadLogs();
            else if (newPage === 'admins') await loadAdmins();
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
        
        // 打開新建公告彈窗
        const openNewAnnouncement = () => {
            resetAnnouncementForm();
            showAnnouncementModal.value = true;
        };
        
        return {
            // 狀態
            currentPage,
            menuItems,
            stats,
            users,
            userSearch,
            userFilter,
            userPagination,
            filteredUsers,
            licenses,
            licenseFilter,
            licenseLevelFilter,
            licenseStats,
            filteredLicenses,
            orders,
            orderSearch,
            orderStatusFilter,
            filteredOrders,
            confirmPayment,
            logs,
            admins,
            showAdminModal,
            editingAdmin,
            adminForm,
            loadAdmins,
            openNewAdminModal,
            editAdmin,
            saveAdmin,
            toggleAdminStatus,
            deleteAdmin,
            referralStats,
            announcements,
            settings,
            quotaConfig,
            editingPrices,
            revenueReportDays,
            revenueReport,
            userAnalytics,
            showGenerateModal,
            showExtendModal,
            showAnnouncementModal,
            showUserModal,
            showCouponModal,
            generateForm,
            extendForm,
            isLoading,
            isGenerating,
            lastUpdate,
            adminUser,
            toast,
            
            // 新增狀態
            userDetail,
            confirmDialog,
            announcementForm,
            couponForm,
            
            // 格式化方法
            formatDate,
            formatQuota,
            isExpired,
            getStatusClass,
            getStatusText,
            getActionClass,
            getQuotaLabel,
            
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
            openNewAnnouncement,
            editAnnouncement,
            saveAnnouncement,
            deleteAnnouncement,
            
            // 優惠券操作
            createCoupon,
            
            // 確認操作
            showConfirm,
            
            // 設置操作
            saveSettings,
            savePrices,
            passwordForm,
            changePassword,
            telegramConfig,
            saveTelegramConfig,
            testTelegram,
            exportData,
            
            // 報表和分析
            loadRevenueReport,
            loadUserAnalytics,
            getLevelName,
            getDurationName,
            
            // 即將到期用戶
            expiringUsers,
            expiringDays,
            loadExpiringUsers,
            sendExpiryReminder,
            batchSendExpiryReminders,
            
            // 配額監控
            quotaStats,
            quotaFilter,
            filteredQuotaStats,
            loadQuotaStats,
            
            // 批量通知
            notificationForm,
            notificationHistory,
            sendBatchNotification,
            loadNotificationHistory,
            
            // 設備管理
            devices,
            deviceFilter,
            filteredDevices,
            loadDevices,
            revokeDevice,
            
            // 其他
            refreshData,
            handleLogout
        };
    }
}).mount('#app');
