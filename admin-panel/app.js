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
        const showPasswordModal = ref(false);
        const isLoading = ref(true);
        const isGenerating = ref(false);
        const lastUpdate = ref(null);
        const adminUser = ref(getCurrentUser());
        
        // 密碼修改表單
        const passwordForm = reactive({
            oldPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
        const passwordErrors = ref([]);
        const passwordStrength = ref({ score: 0, label: '', errors: [], suggestions: [] });
        
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
        
        // 菜單項（API對接池、代理池管理 提前以利發現）
        const menuItems = ref([
            { id: 'dashboard', name: '儀表盤', icon: '📊' },
            { id: 'users', name: '用戶管理', icon: '👥' },
            { id: 'apiPool', name: 'API 管理 (ID/Hash 池)', icon: '🔑' },
            { id: 'proxies', name: '代理池管理', icon: '🌐' },
            { id: 'expiring', name: '即將到期', icon: '⏰', badge: null },
            { id: 'licenses', name: '卡密管理', icon: '🎟️' },
            { id: 'orders', name: '訂單管理', icon: '💰' },
            { id: 'payment', name: '支付配置', icon: '💎' },  // 🆕 Phase 1.1: 支付地址管理
            { id: 'walletOps', name: '錢包運營', icon: '💳' },  // 🆕 Phase 3
            { id: 'alerts', name: '告警監控', icon: '🚨', badge: null },  // 🆕 Phase 3
            { id: 'campaigns', name: '營銷活動', icon: '🎯' },  // 🆕 Phase 3
            { id: 'revenue', name: '收入報表', icon: '💹' },
            { id: 'analytics', name: '用戶分析', icon: '📈' },
            { id: 'quotas', name: '配額監控', icon: '📉' },
            { id: 'referrals', name: '邀請管理', icon: '🎁' },
            { id: 'notifications', name: '批量通知', icon: '📨' },
            { id: 'announcements', name: '公告管理', icon: '📢' },
            { id: 'sysSettings', name: '系統設置', icon: '⚙️' },  // 🆕 Phase 5
            { id: 'smartOps', name: '智能運維', icon: '🧠' },  // 🆕 Phase 7
            { id: 'serviceDashboard', name: '服務狀態', icon: '🏥' },  // 🆕 Phase 9
            { id: 'analyticsCenter', name: '分析中心', icon: '🔬' },  // 🆕 Phase 10
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
        
        // 🆕 雙池健康度統計（儀表盤用）
        const dashboardPoolStats = ref({
            api: { total: 0, available: 0, full: 0, banned: 0, total_allocations: 0, healthPercent: 100 },
            proxy: { total: 0, available: 0, assigned: 0, testing: 0, failed: 0, healthPercent: 100 }
        });
        
        // 🆕 系統告警（儀表盤用）
        const systemAlerts = ref({
            alert_level: 'normal',
            alerts: [],
            stats: {}
        });
        const capacityForecast = ref({
            avg_daily_allocations: 0,
            remaining_capacity: 0,
            days_until_exhausted: null,
            forecast_message: ''
        });
        const alertsDismissed = ref(false);
        
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
        
        // 日誌數據（審計日誌）
        const logs = ref([]);
        const logsPagination = ref({ total: 0, page: 1, page_size: 20, total_pages: 1 });
        const logsFilter = reactive({
            category: '',
            status: '',
            adminId: ''
        });
        
        // 🆕 代理池數據
        const proxies = ref([]);
        const proxyStats = ref({ total: 0, available: 0, assigned: 0, failed: 0 });
        const proxyPagination = ref({ total: 0, page: 1, page_size: 50, total_pages: 1 });
        const proxyFilter = ref('');  // all, available, assigned, failed
        const showProxyModal = ref(false);
        const proxyForm = reactive({
            text: '',  // 批量添加的文本
            provider: '',
            country: ''
        });
        const logsStats = ref({});
        
        // 🆕 API 對接池數據
        const apiPoolList = ref([]);
        const apiPoolStats = ref({ total: 0, available: 0, full: 0, disabled: 0, banned: 0, available_for_assign: 0, total_allocations: 0 });
        const showApiPoolModal = ref(false);
        const apiPoolForm = reactive({
            api_id: '',
            api_hash: '',
            name: '',
            source_phone: '',
            max_accounts: 5,
            note: ''
        });
        const showApiPoolBatchModal = ref(false);
        const apiPoolBatchForm = reactive({
            text: '',
            default_max_accounts: 5
        });
        const apiPoolBatchResult = ref(null);
        const apiPoolFilter = ref('');  // all, available, full, disabled
        const apiPoolStrategy = ref('balanced');  // 🆕 分配策略
        const apiSearchQuery = ref('');  // 搜索關鍵詞
        const selectedApis = ref([]);   // 批量選擇
        const showEditApiModal = ref(false);
        const editApiForm = reactive({
            api_id: '', api_hash: '', name: '', source_phone: '',
            max_accounts: 5, note: '', priority: 0, is_premium: false,
            min_member_level: 'free', group_id: ''
        });
        const expandedApiId = ref(null);  // 展開詳情的 API ID
        
        // 🆕 API 分組管理
        const apiGroups = ref([]);
        const apiPoolGroupFilter = ref('');
        const showGroupManagerModal = ref(false);
        const newGroupForm = ref({
            name: '',
            description: '',
            color: '#3B82F6',
            icon: '📁'
        });
        
        // 🆕 系統設置
        const alertConfig = ref({
            enabled: true,
            webhook_url: '',
            webhook_secret: '',
            email_enabled: false,
            email_smtp_host: '',
            email_smtp_port: 587,
            email_smtp_user: '',
            email_smtp_password: '',
            email_from: '',
            email_to: '',
            telegram_bot_token: '',
            telegram_chat_id: '',
            throttle_minutes: 30,
            min_level: 'warning'
        });
        const scheduledTasks = ref([]);
        const alertChannels = ref({
            webhook: false,
            email: false,
            telegram: false
        });
        
        // 🆕 Phase 3: 錢包運營工具
        const walletOperations = ref([]);
        const walletAnalytics = ref({
            overview: { total_wallets: 0, active_wallets: 0, frozen_wallets: 0, total_balance: 0 },
            recharge_trend: [],
            consume_trend: [],
            category_distribution: []
        });
        const showBatchAdjustModal = ref(false);
        const batchAdjustForm = reactive({
            userIds: '',
            amount: 0,
            reason: '',
            isBonus: false
        });
        
        // 🆕 Phase 3: 告警監控
        const alerts = ref([]);
        const alertSummary = ref({ total: 0, unacknowledged: 0, recent_24h: 0, by_severity: {} });
        const alertFilter = ref('');
        
        // 🆕 Phase 1.1: 支付配置
        const paymentAddresses = ref([]);
        const paymentChannels = ref([]);
        const paymentStats = ref({ by_network: {}, today: { allocations: 0, confirmed: 0, confirmed_amount: 0 } });
        const showAddressModal = ref(false);
        const addressForm = reactive({
            network: 'trc20',
            address: '',
            label: '',
            priority: 0,
            max_usage: 0
        });
        const pendingRecharges = ref([]);
        const pendingRechargeStats = ref({ pending: 0, paid: 0 });
        
        // 🆕 Phase 3: 營銷活動
        const showCampaignModal = ref(false);
        const campaignForm = reactive({
            campaignId: '',
            campaignName: '',
            userIds: '',
            rewardAmount: 100,
            rewardType: 'bonus'
        });
        
        // 🆕 Phase 7: 智能運維
        const healthScores = ref([]);
        const healthSummary = ref({ total_apis: 0, average_score: 0, grade_distribution: {} });
        const anomalies = ref([]);
        const predictionReport = ref(null);
        const webhookSubscribers = ref([]);
        const webhookEvents = ref([]);
        const webhookStats = ref({ total_events: 0, success_rate: 100 });
        const billingPlans = ref([]);
        const invoices = ref([]);
        const scalingPolicies = ref([]);
        const scalingRecommendations = ref([]);
        const scalingHistory = ref([]);
        const showWebhookModal = ref(false);
        const webhookForm = reactive({
            name: '',
            url: '',
            secret: '',
            events: ['*']
        });
        const showScalingModal = ref(false);
        const scalingForm = reactive({
            name: '',
            scale_up_threshold: 80,
            scale_down_threshold: 30,
            group_id: null
        });
        
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
                
                // 🆕 加載雙池健康度和告警
                await loadPoolHealthStats();
                await loadSystemAlerts();
                
                setTimeout(initCharts, 100);
            }
            isLoading.value = false;
        };
        
        const loadUsers = async () => {
            const result = await apiRequest('/admin/users');
            console.log('[loadUsers] API result:', result);
            if (result.success) {
                // 兼容新舊 API 格式
                const rawUsers = result.data?.users || result.data || result.users || [];
                console.log('[loadUsers] rawUsers count:', rawUsers.length, 'first user:', rawUsers[0]);
                
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
                        // 錢包信息
                        walletBalance: user.walletBalance || 0,
                        walletBalanceDisplay: user.walletBalanceDisplay || '$0.00',
                        walletBonus: user.walletBonus || 0,
                        walletBonusDisplay: user.walletBonusDisplay || '$0.00',
                        walletStatus: user.walletStatus || 'none',
                        totalConsumed: user.totalConsumed || 0,
                        totalConsumedDisplay: user.totalConsumedDisplay || '$0.00',
                        // 時間
                        createdAt: user.createdAt || user.created_at || '',
                        lastLoginAt: user.lastLoginAt || user.last_login_at || ''
                    };
                });
                
                console.log('[loadUsers] processed users count:', users.value.length, 'first:', users.value[0]);
                
                // 保存分頁信息
                if (result.data?.pagination) {
                    userPagination.value = result.data.pagination;
                    console.log('[loadUsers] pagination:', userPagination.value);
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
        
        const loadLogs = async (page = 1) => {
            // 構建查詢參數
            let url = `/admin/audit-logs?page=${page}&page_size=20`;
            if (logsFilter.category) url += `&category=${logsFilter.category}`;
            if (logsFilter.status) url += `&status=${logsFilter.status}`;
            if (logsFilter.adminId) url += `&admin_id=${logsFilter.adminId}`;
            
            const result = await apiRequest(url);
            if (result.success) {
                const data = result.data || result;
                logs.value = (data.logs || []).map(log => ({
                    ...log,
                    // 格式化時間
                    formattedTime: log.created_at ? new Date(log.created_at).toLocaleString('zh-TW') : '',
                    // 操作類型圖標
                    actionIcon: getActionIcon(log.action_category),
                    // 狀態樣式
                    statusClass: log.status === 'success' ? 'text-green-400' : 'text-red-400'
                }));
                if (data.pagination) {
                    logsPagination.value = data.pagination;
                }
            }
        };
        
        const loadLogsStats = async () => {
            const result = await apiRequest('/admin/audit-stats?days=7');
            if (result.success) {
                logsStats.value = result.data || result;
            }
        };
        
        // ============ 代理池管理 ============
        
        const loadProxies = async () => {
            const params = new URLSearchParams();
            if (proxyFilter.value) params.append('status', proxyFilter.value);
            params.append('page', proxyPagination.value.page);
            params.append('page_size', proxyPagination.value.page_size);
            
            const result = await apiRequest(`/admin/proxies?${params}`);
            if (result.success) {
                const data = result.data || result;
                proxies.value = data.proxies || [];
                proxyStats.value = data.stats || { total: 0, available: 0, assigned: 0, failed: 0 };
                proxyPagination.value = data.pagination || proxyPagination.value;
            }
        };
        
        const openProxyModal = () => {
            proxyForm.text = '';
            proxyForm.provider = '';
            proxyForm.country = '';
            showProxyModal.value = true;
        };
        
        const addProxies = async () => {
            if (!proxyForm.text.trim()) {
                showToast('請輸入代理列表', 'error');
                return;
            }
            
            // 解析輸入：每行一個代理
            const lines = proxyForm.text.split('\n').filter(l => l.trim());
            const proxyList = lines.map(line => {
                const trimmed = line.trim();
                // 支持格式：socks5://host:port 或 host:port:user:pass
                if (trimmed.includes('://')) {
                    return trimmed;
                } else {
                    // 簡單格式：host:port 或 host:port:user:pass
                    const parts = trimmed.split(':');
                    if (parts.length >= 2) {
                        const [host, port, user, pass] = parts;
                        let url = `socks5://${host}:${port}`;
                        if (user && pass) {
                            url = `socks5://${user}:${pass}@${host}:${port}`;
                        }
                        return {
                            type: 'socks5',
                            host,
                            port: parseInt(port),
                            username: user || null,
                            password: pass || null,
                            provider: proxyForm.provider || null,
                            country: proxyForm.country || null
                        };
                    }
                }
                return trimmed;
            });
            
            const result = await apiRequest('/admin/proxies', {
                method: 'POST',
                body: JSON.stringify({ proxies: proxyList })
            });
            
            if (result.success) {
                const data = result.data || result;
                showToast(`成功添加 ${data.success} 個代理，失敗 ${data.failed} 個`, 'success');
                showProxyModal.value = false;
                await loadProxies();
            } else {
                showToast('添加代理失敗: ' + (result.message || result.error?.message), 'error');
            }
        };
        
        const deleteProxy = async (proxyId) => {
            if (!confirm('確定要刪除此代理嗎？')) return;
            
            const result = await apiRequest(`/admin/proxies/${proxyId}`, {
                method: 'DELETE'
            });
            
            if (result.success) {
                showToast('代理已刪除', 'success');
                await loadProxies();
            }
        };
        
        const testProxy = async (proxyId) => {
            showToast('正在測試代理...', 'info');
            
            const result = await apiRequest(`/admin/proxies/${proxyId}/test`, {
                method: 'POST'
            });
            
            if (result.success && result.data?.success) {
                showToast(`測試成功！延遲: ${result.data.latency}ms`, 'success');
                await loadProxies();
            } else {
                showToast('測試失敗: ' + (result.data?.error || '連接失敗'), 'error');
                await loadProxies();
            }
        };
        
        const releaseProxy = async (proxy) => {
            if (!confirm(`確定要釋放此代理 ${proxy.host}:${proxy.port} 嗎？`)) return;
            
            const result = await apiRequest('/admin/proxies/release', {
                method: 'POST',
                body: JSON.stringify({
                    phone: proxy.assigned_phone,
                    account_id: proxy.assigned_account_id
                })
            });
            
            if (result.success) {
                showToast('代理已釋放', 'success');
                await loadProxies();
            }
        };
        
        const getProxyStatusClass = (status) => {
            const classes = {
                'available': 'text-green-400',
                'assigned': 'text-blue-400',
                'testing': 'text-yellow-400',
                'failed': 'text-red-400',
                'disabled': 'text-gray-400'
            };
            return classes[status] || 'text-gray-400';
        };
        
        const getProxyStatusText = (status) => {
            const texts = {
                'available': '可用',
                'assigned': '已分配',
                'testing': '測試中',
                'failed': '失敗',
                'disabled': '已禁用'
            };
            return texts[status] || status;
        };
        
        // ============ 🆕 API 對接池管理 ============
        
        // 🆕 加載雙池健康度統計（用於儀表盤）
        const loadPoolHealthStats = async () => {
            try {
                // 並行加載 API 池和代理池統計
                const [apiResult, proxyResult] = await Promise.all([
                    apiRequest('/admin/api-pool?include_hash=false'),
                    apiRequest('/admin/proxies')
                ]);
                
                // API 池統計
                if (apiResult.success) {
                    const apiStats = apiResult.data?.stats || apiResult.stats || {};
                    const total = apiStats.total || 0;
                    const available = apiStats.available_for_assign || apiStats.available || 0;
                    const full = apiStats.full || 0;
                    const banned = apiStats.banned || 0;
                    const disabled = apiStats.disabled || 0;
                    
                    // 健康度 = (可用 + 已分配) / 總數 * 100（排除封禁和禁用）
                    const healthy = total - banned - disabled;
                    const healthPercent = total > 0 ? Math.round(healthy / total * 100) : 100;
                    
                    dashboardPoolStats.value.api = {
                        total,
                        available,
                        full,
                        banned,
                        disabled,
                        total_allocations: apiStats.total_allocations || 0,
                        healthPercent
                    };
                }
                
                // 代理池統計
                if (proxyResult.success) {
                    const proxyStats = proxyResult.data?.stats || proxyResult.stats || {};
                    const total = proxyStats.total || 0;
                    const available = proxyStats.available || 0;
                    const assigned = proxyStats.assigned || 0;
                    const failed = proxyStats.failed || 0;
                    const testing = proxyStats.testing || 0;
                    
                    // 健康度 = (可用 + 已分配) / 總數 * 100
                    const healthy = available + assigned;
                    const healthPercent = total > 0 ? Math.round(healthy / total * 100) : 100;
                    
                    dashboardPoolStats.value.proxy = {
                        total,
                        available,
                        assigned,
                        testing,
                        failed,
                        healthPercent
                    };
                }
            } catch (e) {
                console.error('加載池健康度失敗:', e);
            }
        };
        
        // 🆕 加載系統告警
        const loadSystemAlerts = async () => {
            if (alertsDismissed.value) return;
            
            try {
                // 並行加載告警和預測
                const [alertsResult, forecastResult] = await Promise.all([
                    apiRequest('/admin/api-pool/alerts'),
                    apiRequest('/admin/api-pool/forecast')
                ]);
                
                if (alertsResult.success) {
                    const data = alertsResult.data || alertsResult;
                    systemAlerts.value = {
                        alert_level: data.alert_level || 'normal',
                        alerts: data.alerts || [],
                        stats: data.stats || {}
                    };
                }
                
                if (forecastResult.success) {
                    const data = forecastResult.data || forecastResult;
                    capacityForecast.value = {
                        avg_daily_allocations: data.avg_daily_allocations || 0,
                        remaining_capacity: data.remaining_capacity || 0,
                        days_until_exhausted: data.days_until_exhausted,
                        forecast_message: data.forecast_message || ''
                    };
                }
            } catch (e) {
                console.error('加載系統告警失敗:', e);
            }
        };
        
        // 🆕 暫時忽略告警
        const dismissAlerts = () => {
            alertsDismissed.value = true;
            systemAlerts.value = { alert_level: 'normal', alerts: [], stats: {} };
            showToast('告警已暫時忽略，下次刷新時會重新顯示', 'info');
        };
        
        // 🆕 加載系統設置
        const loadSystemSettings = async () => {
            try {
                const [configResult, tasksResult] = await Promise.all([
                    apiRequest('/admin/alerts/config'),
                    apiRequest('/admin/scheduler/tasks')
                ]);
                
                if (configResult.success) {
                    const data = configResult.data || configResult;
                    alertChannels.value = data.channels || {};
                    // 從已保存的配置更新表單（注意：敏感信息可能被隱藏）
                    if (data.config) {
                        alertConfig.value.enabled = data.config.enabled ?? true;
                        alertConfig.value.throttle_minutes = data.config.throttle_minutes || 30;
                        alertConfig.value.min_level = data.config.min_level || 'warning';
                    }
                }
                
                if (tasksResult.success) {
                    const data = tasksResult.data || tasksResult;
                    scheduledTasks.value = data.tasks || [];
                }
            } catch (e) {
                console.error('加載系統設置失敗:', e);
            }
        };
        
        // 🆕 保存告警配置
        const saveAlertConfig = async () => {
            try {
                // 處理郵件收件人（逗號分隔轉數組）
                const config = { ...alertConfig.value };
                if (typeof config.email_to === 'string') {
                    config.email_to = config.email_to.split(',').map(e => e.trim()).filter(e => e);
                }
                
                const result = await apiRequest('/admin/alerts/config', {
                    method: 'POST',
                    body: JSON.stringify(config)
                });
                
                if (result.success) {
                    showToast('告警配置已保存', 'success');
                    await loadSystemSettings();
                } else {
                    showToast(result.error || '保存失敗', 'error');
                }
            } catch (e) {
                showToast('保存失敗: ' + e.message, 'error');
            }
        };
        
        // 🆕 測試告警渠道
        const testAlertChannel = async (channel) => {
            try {
                const result = await apiRequest('/admin/alerts/test', {
                    method: 'POST',
                    body: JSON.stringify({ channel })
                });
                
                if (result.success) {
                    showToast(`${channel} 測試告警已發送`, 'success');
                } else {
                    showToast(result.error || '發送失敗', 'error');
                }
            } catch (e) {
                showToast('測試失敗: ' + e.message, 'error');
            }
        };
        
        // 🆕 更新定時任務
        const updateScheduledTask = async (taskId, updates) => {
            try {
                const result = await apiRequest(`/admin/scheduler/tasks/${taskId}`, {
                    method: 'PUT',
                    body: JSON.stringify(updates)
                });
                
                if (result.success) {
                    showToast('任務設置已更新', 'success');
                    await loadSystemSettings();
                } else {
                    showToast(result.error || '更新失敗', 'error');
                }
            } catch (e) {
                showToast('更新失敗: ' + e.message, 'error');
            }
        };
        
        // 🆕 立即執行任務
        const runTaskNow = async (taskId) => {
            try {
                const result = await apiRequest(`/admin/scheduler/tasks/${taskId}/run`, {
                    method: 'POST'
                });
                
                if (result.success) {
                    showToast('任務已執行', 'success');
                    await loadSystemSettings();
                } else {
                    showToast(result.error || '執行失敗', 'error');
                }
            } catch (e) {
                showToast('執行失敗: ' + e.message, 'error');
            }
        };
        
        // 🆕 導出數據
        const exportData = async (type, format = 'csv') => {
            try {
                const endpoints = {
                    'api-pool': '/admin/export/api-pool',
                    'allocation-history': '/admin/export/allocation-history',
                    'alert-history': '/admin/export/alert-history'
                };
                
                const url = `${endpoints[type]}?format=${format}`;
                const result = await apiRequest(url);
                
                if (format === 'csv') {
                    // 對於 CSV，下載文件
                    const blob = new Blob([result], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `${type}_export.csv`;
                    link.click();
                    showToast('導出成功', 'success');
                } else {
                    showToast(`已導出 ${result.data?.total || 0} 條記錄`, 'success');
                }
            } catch (e) {
                showToast('導出失敗: ' + e.message, 'error');
            }
        };
        
        // ==================== 🆕 P7: 智能運維功能 ====================
        
        // 加載健康評分
        const loadHealthScores = async () => {
            try {
                const [scoresRes, summaryRes, anomaliesRes] = await Promise.all([
                    apiRequest('/admin/api-pool/health-scores'),
                    apiRequest('/admin/api-pool/health-summary'),
                    apiRequest('/admin/api-pool/anomalies')
                ]);
                
                if (scoresRes.success) {
                    healthScores.value = scoresRes.data?.scores || [];
                }
                if (summaryRes.success) {
                    healthSummary.value = summaryRes.data || {};
                }
                if (anomaliesRes.success) {
                    anomalies.value = anomaliesRes.data?.anomalies || [];
                }
            } catch (e) {
                console.error('加載健康評分失敗:', e);
            }
        };
        
        // 加載預測報告
        const loadPredictionReport = async () => {
            try {
                const result = await apiRequest('/admin/api-pool/prediction/report');
                if (result.success) {
                    predictionReport.value = result.data;
                }
            } catch (e) {
                console.error('加載預測報告失敗:', e);
            }
        };
        
        // 加載 Webhook 訂閱者
        const loadWebhookSubscribers = async () => {
            try {
                const [subsRes, eventsRes, statsRes] = await Promise.all([
                    apiRequest('/admin/webhooks/subscribers'),
                    apiRequest('/admin/webhooks/events?limit=50'),
                    apiRequest('/admin/webhooks/stats')
                ]);
                
                if (subsRes.success) {
                    webhookSubscribers.value = subsRes.data?.subscribers || [];
                }
                if (eventsRes.success) {
                    webhookEvents.value = eventsRes.data?.events || [];
                }
                if (statsRes.success) {
                    webhookStats.value = statsRes.data || {};
                }
            } catch (e) {
                console.error('加載 Webhook 數據失敗:', e);
            }
        };
        
        // 添加 Webhook 訂閱者
        const addWebhookSubscriber = async () => {
            if (!webhookForm.url.trim()) {
                showToast('請輸入 Webhook URL', 'error');
                return;
            }
            
            try {
                const result = await apiRequest('/admin/webhooks/subscribers', {
                    method: 'POST',
                    body: JSON.stringify(webhookForm)
                });
                
                if (result.success) {
                    showToast('Webhook 訂閱者已添加', 'success');
                    showWebhookModal.value = false;
                    Object.assign(webhookForm, { name: '', url: '', secret: '', events: ['*'] });
                    await loadWebhookSubscribers();
                } else {
                    showToast(result.error || '添加失敗', 'error');
                }
            } catch (e) {
                showToast('添加失敗: ' + e.message, 'error');
            }
        };
        
        // 刪除 Webhook 訂閱者
        const deleteWebhookSubscriber = async (id) => {
            if (!confirm('確定要刪除此訂閱者嗎？')) return;
            
            try {
                const result = await apiRequest(`/admin/webhooks/subscribers/${id}`, {
                    method: 'DELETE'
                });
                
                if (result.success) {
                    showToast('已刪除', 'success');
                    await loadWebhookSubscribers();
                } else {
                    showToast(result.error || '刪除失敗', 'error');
                }
            } catch (e) {
                showToast('刪除失敗: ' + e.message, 'error');
            }
        };
        
        // 測試 Webhook
        const testWebhook = async (id) => {
            try {
                const result = await apiRequest(`/admin/webhooks/test/${id}`, {
                    method: 'POST'
                });
                
                if (result.success) {
                    showToast('測試事件已發送', 'success');
                } else {
                    showToast(result.error || '測試失敗', 'error');
                }
            } catch (e) {
                showToast('測試失敗: ' + e.message, 'error');
            }
        };
        
        // 加載計費方案
        const loadBillingPlans = async () => {
            try {
                const [plansRes, invoicesRes] = await Promise.all([
                    apiRequest('/admin/billing/plans'),
                    apiRequest('/admin/billing/invoices?limit=50')
                ]);
                
                if (plansRes.success) {
                    billingPlans.value = plansRes.data?.plans || [];
                }
                if (invoicesRes.success) {
                    invoices.value = invoicesRes.data?.invoices || [];
                }
            } catch (e) {
                console.error('加載計費數據失敗:', e);
            }
        };
        
        // 加載擴縮容策略
        const loadScalingPolicies = async () => {
            try {
                const [policiesRes, historyRes, evalRes] = await Promise.all([
                    apiRequest('/admin/scaling/policies'),
                    apiRequest('/admin/scaling/history?limit=50'),
                    apiRequest('/admin/scaling/evaluate')
                ]);
                
                if (policiesRes.success) {
                    scalingPolicies.value = policiesRes.data?.policies || [];
                }
                if (historyRes.success) {
                    scalingHistory.value = historyRes.data?.events || [];
                }
                if (evalRes.success) {
                    scalingRecommendations.value = evalRes.data?.recommendations || [];
                }
            } catch (e) {
                console.error('加載擴縮容數據失敗:', e);
            }
        };
        
        // 創建擴縮容策略
        const createScalingPolicy = async () => {
            if (!scalingForm.name.trim()) {
                showToast('請輸入策略名稱', 'error');
                return;
            }
            
            try {
                const result = await apiRequest('/admin/scaling/policies', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: scalingForm.name,
                        scale_up: { threshold: scalingForm.scale_up_threshold },
                        scale_down: { threshold: scalingForm.scale_down_threshold },
                        group_id: scalingForm.group_id
                    })
                });
                
                if (result.success) {
                    showToast('策略已創建', 'success');
                    showScalingModal.value = false;
                    Object.assign(scalingForm, { name: '', scale_up_threshold: 80, scale_down_threshold: 30, group_id: null });
                    await loadScalingPolicies();
                } else {
                    showToast(result.error || '創建失敗', 'error');
                }
            } catch (e) {
                showToast('創建失敗: ' + e.message, 'error');
            }
        };
        
        // 執行擴縮容
        const executeScaling = async (recommendation) => {
            if (!confirm(`確定要執行 ${recommendation.action === 'scale_up' ? '擴容' : '縮容'} 操作嗎？`)) return;
            
            try {
                const result = await apiRequest('/admin/scaling/execute', {
                    method: 'POST',
                    body: JSON.stringify({
                        policy_id: recommendation.policy_id,
                        action: recommendation.action,
                        capacity_change: recommendation.recommended_change,
                        trigger_value: recommendation.current_utilization
                    })
                });
                
                if (result.success) {
                    showToast(result.message || '操作成功', 'success');
                    await loadScalingPolicies();
                } else {
                    showToast(result.error || '操作失敗', 'error');
                }
            } catch (e) {
                showToast('操作失敗: ' + e.message, 'error');
            }
        };
        
        // 加載智能運維頁面所有數據
        const loadSmartOpsData = async () => {
            await Promise.all([
                loadHealthScores(),
                loadPredictionReport(),
                loadWebhookSubscribers(),
                loadBillingPlans(),
                loadScalingPolicies()
            ]);
        };
        
        // 🆕 P9: 服務健康儀表盤
        const serviceDashboard = ref({});
        const showIncidentModal = ref(false);
        const showMaintenanceModal = ref(false);
        const incidentForm = ref({ title: '', message: '', status: 'degraded' });
        const maintenanceForm = ref({ title: '', description: '', scheduled_start: '', scheduled_end: '' });
        
        const loadServiceDashboard = async () => {
            try {
                const result = await apiRequest('/admin/service-dashboard');
                if (result.success) {
                    serviceDashboard.value = result.data || {};
                }
            } catch (e) {
                console.error('加載服務儀表盤失敗:', e);
            }
        };
        
        const createStatusUpdate = async () => {
            try {
                const result = await apiRequest('/admin/service-dashboard/updates', 'POST', incidentForm.value);
                if (result.success) {
                    showIncidentModal.value = false;
                    incidentForm.value = { title: '', message: '', status: 'degraded' };
                    await loadServiceDashboard();
                }
            } catch (e) {
                console.error('創建狀態更新失敗:', e);
            }
        };
        
        const scheduleMaintenance = async () => {
            try {
                const result = await apiRequest('/admin/service-dashboard/maintenance', 'POST', maintenanceForm.value);
                if (result.success) {
                    showMaintenanceModal.value = false;
                    maintenanceForm.value = { title: '', description: '', scheduled_start: '', scheduled_end: '' };
                    await loadServiceDashboard();
                }
            } catch (e) {
                console.error('排程維護失敗:', e);
            }
        };
        
        // 🆕 P10: 分析中心
        const analyticsCenter = ref({
            predictions: {},
            costSummary: {},
            performanceSummary: {},
            reports: [],
            drStats: {}
        });
        const analyticsActiveTab = ref('predictions');
        const showReportModal = ref(false);
        const reportForm = ref({ type: 'daily', date: '', tenant_id: '' });
        
        const loadAnalyticsCenter = async () => {
            try {
                // 並行加載多個數據
                const [predResult, costResult, perfResult, reportResult, drResult] = await Promise.all([
                    apiRequest('/admin/ml/predict/usage?metric=api_calls&periods=24').catch(() => ({ data: {} })),
                    apiRequest('/admin/cost/summary?days=30').catch(() => ({ data: {} })),
                    apiRequest('/admin/performance/summary').catch(() => ({ data: {} })),
                    apiRequest('/admin/reports?limit=10').catch(() => ({ data: { reports: [] } })),
                    apiRequest('/admin/dr/stats').catch(() => ({ data: {} }))
                ]);
                
                analyticsCenter.value = {
                    predictions: predResult.data || {},
                    costSummary: costResult.data || {},
                    performanceSummary: perfResult.data || {},
                    reports: reportResult.data?.reports || [],
                    drStats: drResult.data || {}
                };
            } catch (e) {
                console.error('加載分析中心失敗:', e);
            }
        };
        
        const generateReport = async () => {
            try {
                const endpoint = reportForm.value.type === 'daily' ? '/admin/reports/daily' : '/admin/reports/weekly';
                const result = await apiRequest(endpoint, 'POST', reportForm.value);
                if (result.success) {
                    showReportModal.value = false;
                    reportForm.value = { type: 'daily', date: '', tenant_id: '' };
                    await loadAnalyticsCenter();
                }
            } catch (e) {
                console.error('生成報告失敗:', e);
            }
        };
        
        const detectBottlenecks = async () => {
            try {
                const result = await apiRequest('/admin/performance/bottlenecks/detect', 'POST');
                if (result.success) {
                    alert('瓶頸檢測完成，發現 ' + (result.data?.bottlenecks?.length || 0) + ' 個瓶頸');
                }
            } catch (e) {
                console.error('檢測瓶頸失敗:', e);
            }
        };
        
        // 🆕 加載 API 分組
        const loadApiGroups = async () => {
            try {
                const result = await apiRequest('/admin/api-pool/groups');
                if (result.success) {
                    apiGroups.value = result.data?.groups || result.groups || [];
                }
            } catch (e) {
                console.error('加載分組失敗:', e);
            }
        };
        
        // 🆕 打開分組管理彈窗
        const openGroupManagerModal = async () => {
            await loadApiGroups();
            showGroupManagerModal.value = true;
        };
        
        // 🆕 創建分組
        const createApiGroup = async () => {
            if (!newGroupForm.value.name.trim()) {
                showToast('請輸入分組名稱', 'error');
                return;
            }
            
            try {
                const result = await apiRequest('/admin/api-pool/groups', {
                    method: 'POST',
                    body: JSON.stringify(newGroupForm.value)
                });
                
                if (result.success) {
                    showToast(result.message || '分組創建成功', 'success');
                    newGroupForm.value = { name: '', description: '', color: '#3B82F6', icon: '📁' };
                    await loadApiGroups();
                } else {
                    showToast(result.error || '創建失敗', 'error');
                }
            } catch (e) {
                showToast('創建失敗: ' + e.message, 'error');
            }
        };
        
        // 🆕 刪除分組
        const deleteApiGroup = async (groupId) => {
            if (!confirm('確定要刪除此分組嗎？該分組內的 API 將移至默認分組。')) return;
            
            try {
                const result = await apiRequest(`/admin/api-pool/groups/${groupId}`, {
                    method: 'DELETE'
                });
                
                if (result.success) {
                    showToast(result.message || '分組已刪除', 'success');
                    await loadApiGroups();
                } else {
                    showToast(result.error || '刪除失敗', 'error');
                }
            } catch (e) {
                showToast('刪除失敗: ' + e.message, 'error');
            }
        };
        
        // 🆕 編輯分組（簡單實現：彈出 prompt）
        const editApiGroup = async (group) => {
            const newName = prompt('輸入新的分組名稱:', group.name);
            if (!newName || newName === group.name) return;
            
            try {
                const result = await apiRequest(`/admin/api-pool/groups/${group.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({ name: newName })
                });
                
                if (result.success) {
                    showToast('分組已更新', 'success');
                    await loadApiGroups();
                } else {
                    showToast(result.error || '更新失敗', 'error');
                }
            } catch (e) {
                showToast('更新失敗: ' + e.message, 'error');
            }
        };
        
        const loadApiPool = async () => {
            const params = new URLSearchParams();
            if (apiPoolFilter.value) params.append('status', apiPoolFilter.value);
            params.append('include_hash', 'true');
            
            // 🆕 加載分組列表
            await loadApiGroups();
            
            const result = await apiRequest(`/admin/api-pool?${params}`);
            if (result.success) {
                const data = result.data || result;
                let apis = data.apis || [];
                
                // 🆕 前端過濾分組
                if (apiPoolGroupFilter.value) {
                    apis = apis.filter(api => api.group_id === apiPoolGroupFilter.value);
                }
                
                apiPoolList.value = apis;
                apiPoolStats.value = data.stats || apiPoolStats.value;
                // 🆕 更新當前策略
                if (data.stats?.allocation_strategy) {
                    apiPoolStrategy.value = data.stats.allocation_strategy;
                }
            }
        };
        
        // 🆕 設置分配策略
        const setApiPoolStrategy = async () => {
            const result = await apiRequest('/admin/api-pool/strategy', {
                method: 'POST',
                body: JSON.stringify({ strategy: apiPoolStrategy.value })
            });
            
            if (result.success) {
                showToast(`分配策略已更改`, 'success');
            } else {
                showToast('設置失敗: ' + (result.message || result.error?.message), 'error');
                await loadApiPool();  // 重新加載以恢復正確的策略
            }
        };
        
        const openApiPoolModal = () => {
            apiPoolForm.api_id = '';
            apiPoolForm.api_hash = '';
            apiPoolForm.name = '';
            apiPoolForm.source_phone = '';
            apiPoolForm.max_accounts = 5;
            apiPoolForm.note = '';
            showApiPoolModal.value = true;
        };
        
        const addApiToPool = async () => {
            const validErr = validateApiFields(apiPoolForm);
            if (validErr) { showToast(validErr, 'error'); return; }
            
            const result = await apiRequest('/admin/api-pool', {
                method: 'POST',
                body: JSON.stringify({
                    api_id: apiPoolForm.api_id.trim(),
                    api_hash: apiPoolForm.api_hash.trim(),
                    name: apiPoolForm.name.trim() || `API-${apiPoolForm.api_id}`,
                    source_phone: apiPoolForm.source_phone.trim() || null,
                    max_accounts: parseInt(apiPoolForm.max_accounts) || 5,
                    note: apiPoolForm.note.trim() || null
                })
            });
            
            if (result.success) {
                showToast('API 憑據添加成功', 'success');
                showApiPoolModal.value = false;
                await loadApiPool();
            } else {
                const errMsg = result.message || result.error?.message || result.detail || JSON.stringify(result.error || result);
                showToast('添加失敗: ' + errMsg, 'error');
            }
        };
        
        const openApiPoolBatchModal = () => {
            apiPoolBatchForm.text = '';
            apiPoolBatchForm.default_max_accounts = 5;
            apiPoolBatchResult.value = null;
            showApiPoolBatchModal.value = true;
        };
        
        // 下載 CSV 模板
        const downloadApiTemplate = () => {
            const template = 'api_id,api_hash,name,source_phone,max_accounts\n' +
                '12345678,abc123def4567890abcdef1234567890,MyApp1,+8613800138000,5\n' +
                '87654321,xyz789abc1234567890abcdef12345678,MyApp2,,3\n';
            const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'api_import_template.csv';
            link.click();
            URL.revokeObjectURL(link.href);
        };
        
        // 文件上傳讀取
        const handleApiFileUpload = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                apiPoolBatchForm.text = e.target.result;
                showToast(`已讀取文件: ${file.name}`, 'success');
            };
            reader.onerror = () => {
                showToast('文件讀取失敗', 'error');
            };
            reader.readAsText(file);
        };
        
        const importApisFromText = async () => {
            if (!apiPoolBatchForm.text.trim()) {
                showToast('請輸入 API 列表', 'error');
                return;
            }
            
            const result = await apiRequest('/admin/api-pool/batch', {
                method: 'POST',
                body: JSON.stringify({
                    text: apiPoolBatchForm.text,
                    default_max_accounts: parseInt(apiPoolBatchForm.default_max_accounts) || 5
                })
            });
            
            if (result.success) {
                const data = result.data || result;
                apiPoolBatchResult.value = data;
                
                if (data.success > 0) {
                    showToast(`成功導入 ${data.success} 個 API 憑據`, 'success');
                    await loadApiPool();
                } else if (data.duplicates > 0) {
                    showToast(`全部 ${data.duplicates} 個已存在，無需重複導入`, 'info');
                } else {
                    showToast('導入失敗，請檢查格式', 'error');
                }
            } else {
                const errMsg = result.message || result.error?.message || result.detail || JSON.stringify(result.error || result);
                showToast('導入失敗: ' + errMsg, 'error');
            }
        };
        
        const deleteApiFromPool = async (apiId) => {
            if (!confirm('確定要刪除此 API 憑據嗎？\n如有帳號綁定，需先釋放。')) return;
            
            const result = await apiRequest(`/admin/api-pool/${apiId}`, {
                method: 'DELETE'
            });
            
            if (result.success) {
                showToast('API 憑據已刪除', 'success');
                await loadApiPool();
            } else {
                showToast('刪除失敗: ' + (result.message || result.error?.message), 'error');
            }
        };
        
        const toggleApiStatus = async (api) => {
            const isDisabled = api.status === 'disabled';
            const endpoint = isDisabled ? 'enable' : 'disable';
            
            const result = await apiRequest(`/admin/api-pool/${api.api_id}/${endpoint}`, {
                method: 'POST'
            });
            
            if (result.success) {
                showToast(isDisabled ? 'API 已啟用' : 'API 已禁用', 'success');
                await loadApiPool();
            }
        };
        
        const getApiStatusClass = (status) => {
            const classes = {
                'available': 'text-green-400',
                'full': 'text-yellow-400',
                'disabled': 'text-gray-400',
                'banned': 'text-red-400'
            };
            return classes[status] || 'text-gray-400';
        };
        
        const getApiStatusText = (status) => {
            const texts = {
                'available': '可用',
                'full': '已滿',
                'disabled': '已禁用',
                'banned': '已封禁'
            };
            return texts[status] || status;
        };
        
        // ============ P0 增強：編輯 / 搜索 / 批量 / 詳情 ============
        
        // 字段校驗
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
        
        // Hash 遮罩顯示
        const maskApiHash = (hash) => {
            if (!hash || hash.length < 8) return hash || '';
            return hash.substring(0, 4) + '****' + hash.substring(hash.length - 4);
        };
        
        // 搜索過濾 (computed)
        const filteredApiPoolList = Vue.computed(() => {
            const q = apiSearchQuery.value.toLowerCase().trim();
            if (!q) return apiPoolList.value;
            return apiPoolList.value.filter(api =>
                (api.name || '').toLowerCase().includes(q) ||
                String(api.api_id || '').includes(q) ||
                (api.source_phone || '').includes(q) ||
                (api.note || '').toLowerCase().includes(q)
            );
        });
        
        // 展開/收起詳情
        const toggleApiDetail = (apiId) => {
            expandedApiId.value = expandedApiId.value === apiId ? null : apiId;
        };
        
        // 編輯 API
        const openEditApiModal = (api) => {
            editApiForm.api_id = api.api_id;
            editApiForm.api_hash = api.api_hash || '';
            editApiForm.name = api.name || '';
            editApiForm.source_phone = api.source_phone || '';
            editApiForm.max_accounts = api.max_accounts || 5;
            editApiForm.note = api.note || '';
            editApiForm.priority = api.priority || 0;
            editApiForm.is_premium = !!api.is_premium;
            editApiForm.group_id = api.group_id || '';
            showEditApiModal.value = true;
        };
        
        const updateApiInPool = async () => {
            const err = validateApiFields(editApiForm);
            if (err) { showToast(err, 'error'); return; }
            
            const result = await apiRequest(`/admin/api-pool/${editApiForm.api_id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    api_hash: editApiForm.api_hash.trim(),
                    name: editApiForm.name.trim() || `API-${editApiForm.api_id}`,
                    source_phone: editApiForm.source_phone.trim() || null,
                    max_accounts: parseInt(editApiForm.max_accounts) || 5,
                    note: editApiForm.note.trim() || null,
                    priority: parseInt(editApiForm.priority) || 0,
                    is_premium: editApiForm.is_premium,
                    group_id: editApiForm.group_id || null
                })
            });
            
            if (result.success) {
                showToast('API 憑據更新成功', 'success');
                showEditApiModal.value = false;
                await loadApiPool();
            } else {
                const errMsg = result.message || result.error?.message || result.detail || JSON.stringify(result.error || result);
                showToast('更新失敗: ' + errMsg, 'error');
            }
        };
        
        // 批量選擇
        const isAllApisSelected = Vue.computed(() => {
            const list = filteredApiPoolList.value;
            return list.length > 0 && selectedApis.value.length === list.length;
        });
        
        const toggleAllApis = () => {
            if (isAllApisSelected.value) {
                selectedApis.value = [];
            } else {
                selectedApis.value = filteredApiPoolList.value.map(a => a.api_id);
            }
        };
        
        const toggleApiSelection = (apiId) => {
            const idx = selectedApis.value.indexOf(apiId);
            if (idx >= 0) {
                selectedApis.value.splice(idx, 1);
            } else {
                selectedApis.value.push(apiId);
            }
        };
        
        // 批量操作
        const batchApiAction = async (action) => {
            if (selectedApis.value.length === 0) {
                showToast('請先勾選要操作的 API', 'error');
                return;
            }
            const count = selectedApis.value.length;
            const actionTexts = {
                enable: '啟用', disable: '禁用', delete: '刪除'
            };
            if (action === 'delete') {
                if (!confirm(`確定要刪除選中的 ${count} 個 API 嗎？此操作不可恢復！`)) return;
            } else {
                if (!confirm(`確定要${actionTexts[action]}選中的 ${count} 個 API 嗎？`)) return;
            }
            
            let success = 0, fail = 0;
            for (const apiId of selectedApis.value) {
                try {
                    let result;
                    if (action === 'delete') {
                        result = await apiRequest(`/admin/api-pool/${apiId}`, { method: 'DELETE' });
                    } else {
                        result = await apiRequest(`/admin/api-pool/${apiId}/${action}`, { method: 'POST' });
                    }
                    if (result.success) success++; else fail++;
                } catch (e) { fail++; }
            }
            
            showToast(`${actionTexts[action]}完成：成功 ${success}，失敗 ${fail}`, success > 0 ? 'success' : 'error');
            selectedApis.value = [];
            await loadApiPool();
        };
        
        // 批量分配到分組
        const batchAssignGroup = async (groupId) => {
            if (selectedApis.value.length === 0) {
                showToast('請先勾選要操作的 API', 'error');
                return;
            }
            let success = 0, fail = 0;
            for (const apiId of selectedApis.value) {
                try {
                    const result = await apiRequest(`/admin/api-pool/${apiId}`, {
                        method: 'PUT',
                        body: JSON.stringify({ group_id: groupId || null })
                    });
                    if (result.success) success++; else fail++;
                } catch (e) { fail++; }
            }
            showToast(`分組分配完成：成功 ${success}，失敗 ${fail}`, success > 0 ? 'success' : 'error');
            selectedApis.value = [];
            await loadApiPool();
        };
        
        // 複製 API Hash 到剪貼板
        const copyApiHash = async (hash) => {
            try {
                await navigator.clipboard.writeText(hash);
                showToast('已複製到剪貼板', 'success');
            } catch (e) {
                showToast('複製失敗，請手動複製', 'error');
            }
        };
        
        // 格式化時間
        const formatApiTime = (ts) => {
            if (!ts) return '-';
            const d = new Date(ts);
            if (isNaN(d.getTime())) return ts;
            return d.toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        };
        
        // ============ Phase 3: 錢包運營工具 ============
        
        const loadWalletAnalytics = async () => {
            const result = await apiRequest('/admin/wallet/analytics?days=30');
            if (result.success) {
                walletAnalytics.value = result.data || {
                    overview: { total_wallets: 0, active_wallets: 0, frozen_wallets: 0, total_balance: 0 },
                    recharge_trend: [],
                    consume_trend: [],
                    category_distribution: []
                };
            }
        };
        
        const loadWalletOperations = async () => {
            const result = await apiRequest('/admin/wallet/operations?limit=50');
            if (result.success) {
                walletOperations.value = result.data?.operations || [];
            }
        };
        
        const executeBatchAdjust = async () => {
            if (!batchAdjustForm.userIds || !batchAdjustForm.amount) {
                showToast('請填寫完整信息', 'error');
                return;
            }
            
            const userIds = batchAdjustForm.userIds.split(/[\n,;]/).map(id => id.trim()).filter(id => id);
            
            if (userIds.length === 0) {
                showToast('用戶ID列表為空', 'error');
                return;
            }
            
            if (userIds.length > 1000) {
                showToast('單次最多1000個用戶', 'error');
                return;
            }
            
            isLoading.value = true;
            
            const result = await apiRequest('/admin/wallet/batch/adjust', {
                method: 'POST',
                body: JSON.stringify({
                    user_ids: userIds,
                    amount: parseInt(batchAdjustForm.amount),
                    reason: batchAdjustForm.reason || '批量調賬',
                    is_bonus: batchAdjustForm.isBonus
                })
            });
            
            isLoading.value = false;
            
            if (result.success) {
                const data = result.data || result;
                showToast(`批量調賬完成: ${data.success}/${data.total} 成功`, 'success');
                showBatchAdjustModal.value = false;
                batchAdjustForm.userIds = '';
                batchAdjustForm.amount = 0;
                batchAdjustForm.reason = '';
                await loadWalletOperations();
            } else {
                showToast('批量調賬失敗: ' + (result.message || result.error), 'error');
            }
        };
        
        const executeBatchFreeze = async () => {
            const userIdsInput = prompt('請輸入要凍結的用戶ID（用逗號或換行分隔）:');
            if (!userIdsInput) return;
            
            const reason = prompt('請輸入凍結原因:') || '管理員操作';
            const userIds = userIdsInput.split(/[\n,;]/).map(id => id.trim()).filter(id => id);
            
            if (userIds.length === 0) return;
            
            isLoading.value = true;
            
            const result = await apiRequest('/admin/wallet/batch/freeze', {
                method: 'POST',
                body: JSON.stringify({ user_ids: userIds, reason })
            });
            
            isLoading.value = false;
            
            if (result.success) {
                const data = result.data || result;
                showToast(`批量凍結完成: ${data.success}/${data.total} 成功`, 'success');
                await loadWalletOperations();
            }
        };
        
        const executeBatchUnfreeze = async () => {
            const userIdsInput = prompt('請輸入要解凍的用戶ID（用逗號或換行分隔）:');
            if (!userIdsInput) return;
            
            const userIds = userIdsInput.split(/[\n,;]/).map(id => id.trim()).filter(id => id);
            if (userIds.length === 0) return;
            
            isLoading.value = true;
            
            const result = await apiRequest('/admin/wallet/batch/unfreeze', {
                method: 'POST',
                body: JSON.stringify({ user_ids: userIds })
            });
            
            isLoading.value = false;
            
            if (result.success) {
                const data = result.data || result;
                showToast(`批量解凍完成: ${data.success}/${data.total} 成功`, 'success');
                await loadWalletOperations();
            }
        };
        
        // ============ 🆕 Phase 3: 告警監控 ============
        
        const loadAlerts = async () => {
            const params = alertFilter.value ? `?severity=${alertFilter.value}` : '';
            const result = await apiRequest(`/admin/wallet/alerts${params}&limit=100`);
            if (result.success) {
                alerts.value = result.data?.alerts || [];
            }
        };
        
        const loadAlertSummary = async () => {
            const result = await apiRequest('/admin/wallet/alerts/summary');
            if (result.success) {
                alertSummary.value = result.data || { total: 0, unacknowledged: 0, recent_24h: 0, by_severity: {} };
                // 更新菜單徽章
                const menuItem = menuItems.value.find(m => m.id === 'alerts');
                if (menuItem) {
                    menuItem.badge = alertSummary.value.unacknowledged > 0 ? alertSummary.value.unacknowledged : null;
                }
            }
        };
        
        const acknowledgeAlert = async (alertId) => {
            const result = await apiRequest(`/admin/wallet/alerts/${alertId}/acknowledge`, {
                method: 'POST'
            });
            
            if (result.success) {
                showToast('告警已確認', 'success');
                await loadAlerts();
                await loadAlertSummary();
            }
        };
        
        const triggerAnomalyScan = async () => {
            isLoading.value = true;
            const result = await apiRequest('/admin/wallet/alerts/scan', { method: 'POST' });
            isLoading.value = false;
            
            if (result.success) {
                showToast(`掃描完成，發現 ${result.data?.new_alerts || 0} 個異常`, 'success');
                await loadAlerts();
                await loadAlertSummary();
            }
        };
        
        const getAlertSeverityClass = (severity) => {
            const classes = {
                'info': 'text-blue-400',
                'warning': 'text-yellow-400',
                'critical': 'text-red-400'
            };
            return classes[severity] || 'text-gray-400';
        };
        
        // ============ 🆕 Phase 1.1: 支付配置管理 ============
        
        const loadPaymentAddresses = async () => {
            const result = await apiRequest('/admin/payment/addresses?page_size=100');
            if (result.success) {
                paymentAddresses.value = result.data?.addresses || [];
            }
        };
        
        const loadPaymentChannels = async () => {
            const result = await apiRequest('/admin/payment/channels');
            if (result.success) {
                paymentChannels.value = result.data?.channels || [];
            }
        };
        
        const loadPaymentStats = async () => {
            const result = await apiRequest('/admin/payment/stats');
            if (result.success) {
                paymentStats.value = result.data || { by_network: {}, today: {} };
            }
        };
        
        const loadPendingRecharges = async () => {
            const result = await apiRequest('/admin/orders?status=pending&page_size=50');
            if (result.success) {
                pendingRecharges.value = result.data?.orders || [];
                pendingRechargeStats.value = {
                    pending: (result.data?.orders || []).filter(o => o.status === 'pending').length,
                    paid: (result.data?.orders || []).filter(o => o.status === 'paid').length
                };
            }
        };
        
        const addPaymentAddress = async () => {
            if (!addressForm.address || !addressForm.network) {
                showToast('請填寫完整信息', 'error');
                return;
            }
            
            const result = await apiRequest('/admin/payment/addresses', {
                method: 'POST',
                body: JSON.stringify(addressForm)
            });
            
            if (result.success) {
                showToast('地址添加成功', 'success');
                showAddressModal.value = false;
                addressForm.address = '';
                addressForm.label = '';
                addressForm.priority = 0;
                addressForm.max_usage = 0;
                await loadPaymentAddresses();
                await loadPaymentStats();
            } else {
                showToast(result.error || '添加失敗', 'error');
            }
        };
        
        const togglePaymentAddress = async (address) => {
            const newStatus = address.status === 'active' ? 'disabled' : 'active';
            const result = await apiRequest(`/admin/payment/addresses/${address.id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            
            if (result.success) {
                showToast(newStatus === 'active' ? '地址已啟用' : '地址已停用', 'success');
                await loadPaymentAddresses();
            }
        };
        
        const deletePaymentAddress = async (address) => {
            showConfirmDialog(
                '確認刪除',
                `確定要刪除地址 ${address.address_masked || address.address.substring(0, 10)}... 嗎？`,
                async () => {
                    const result = await apiRequest(`/admin/payment/addresses/${address.id}`, {
                        method: 'DELETE'
                    });
                    
                    if (result.success) {
                        showToast('地址已刪除', 'success');
                        await loadPaymentAddresses();
                        await loadPaymentStats();
                    }
                }
            );
        };
        
        const togglePaymentChannel = async (channel) => {
            const result = await apiRequest(`/admin/payment/channels/${channel.channel_type}/toggle`, {
                method: 'POST'
            });
            
            if (result.success) {
                showToast(result.data?.enabled ? '渠道已啟用' : '渠道已停用', 'success');
                await loadPaymentChannels();
            }
        };
        
        const confirmRechargeOrder = async (order) => {
            showConfirmDialog(
                '確認入賬',
                `確定要確認訂單 ${order.order_no} 入賬嗎？金額: $${(order.amount / 100).toFixed(2)}`,
                async () => {
                    const result = await apiRequest(`/admin/orders/${order.order_no}/confirm`, {
                        method: 'POST',
                        body: JSON.stringify({})
                    });
                    
                    if (result.success) {
                        showToast('訂單已確認入賬', 'success');
                        await loadPendingRecharges();
                        await loadPaymentStats();
                    } else {
                        showToast(result.error || '確認失敗', 'error');
                    }
                }
            );
        };
        
        const getNetworkBadgeClass = (network) => {
            const classes = {
                'trc20': 'bg-purple-600',
                'erc20': 'bg-blue-600',
                'bep20': 'bg-yellow-600'
            };
            return classes[network] || 'bg-gray-600';
        };
        
        // ============ 🆕 Phase 3: 營銷活動 ============
        
        const executeCampaignReward = async () => {
            if (!campaignForm.campaignId || !campaignForm.campaignName || !campaignForm.userIds) {
                showToast('請填寫完整活動信息', 'error');
                return;
            }
            
            const userIds = campaignForm.userIds.split(/[\n,;]/).map(id => id.trim()).filter(id => id);
            
            if (userIds.length === 0) {
                showToast('用戶ID列表為空', 'error');
                return;
            }
            
            isLoading.value = true;
            
            const result = await apiRequest('/admin/wallet/campaign/reward', {
                method: 'POST',
                body: JSON.stringify({
                    campaign_id: campaignForm.campaignId,
                    campaign_name: campaignForm.campaignName,
                    user_ids: userIds,
                    reward_amount: parseInt(campaignForm.rewardAmount),
                    reward_type: campaignForm.rewardType
                })
            });
            
            isLoading.value = false;
            
            if (result.success) {
                const data = result.data || result;
                showToast(`活動獎勵發放完成: ${data.success}/${data.total} 成功`, 'success');
                showCampaignModal.value = false;
                campaignForm.campaignId = '';
                campaignForm.campaignName = '';
                campaignForm.userIds = '';
                await loadWalletOperations();
            } else {
                showToast('發放失敗: ' + (result.message || result.error), 'error');
            }
        };
        
        const getActionIcon = (category) => {
            const icons = {
                'auth': '🔐',
                'user': '👤',
                'license': '🎟️',
                'order': '💰',
                'system': '⚙️',
                'notification': '📨'
            };
            return icons[category] || '📝';
        };
        
        const goToLogsPage = (page) => {
            if (page >= 1 && page <= logsPagination.value.total_pages) {
                loadLogs(page);
            }
        };
        
        const filterLogs = () => {
            loadLogs(1);
        };
        
        // ============ 密碼修改 ============
        
        const openPasswordModal = () => {
            passwordForm.oldPassword = '';
            passwordForm.newPassword = '';
            passwordForm.confirmPassword = '';
            passwordErrors.value = [];
            passwordStrength.value = { score: 0, label: '', errors: [], suggestions: [] };
            showPasswordModal.value = true;
        };
        
        const checkPasswordStrength = () => {
            const pwd = passwordForm.newPassword;
            let score = 0;
            const errors = [];
            const suggestions = [];
            
            // 長度檢查
            if (pwd.length < 8) {
                errors.push('密碼長度至少 8 個字符');
            } else if (pwd.length >= 12) {
                score += 2;
            } else {
                score += 1;
            }
            
            // 複雜度檢查
            if (/[A-Z]/.test(pwd)) score += 1; else errors.push('需要包含大寫字母');
            if (/[a-z]/.test(pwd)) score += 1; else errors.push('需要包含小寫字母');
            if (/\d/.test(pwd)) score += 1; else errors.push('需要包含數字');
            if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(pwd)) {
                score += 1;
            } else {
                suggestions.push('添加特殊字符可以提高安全性');
            }
            
            // 常見密碼檢查
            const weakPasswords = ['password', 'admin888', '123456', 'qwerty'];
            if (weakPasswords.some(w => pwd.toLowerCase().includes(w))) {
                errors.push('密碼過於常見');
                score = Math.max(0, score - 2);
            }
            
            // 確定強度標籤
            let label = 'weak';
            if (score >= 5) label = 'strong';
            else if (score >= 3) label = 'medium';
            
            passwordStrength.value = { score, label, errors, suggestions };
        };
        
        const changePassword = async () => {
            passwordErrors.value = [];
            
            // 驗證
            if (!passwordForm.oldPassword) {
                passwordErrors.value.push('請輸入舊密碼');
            }
            if (!passwordForm.newPassword) {
                passwordErrors.value.push('請輸入新密碼');
            }
            if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                passwordErrors.value.push('兩次輸入的密碼不一致');
            }
            if (passwordStrength.value.errors.length > 0) {
                passwordErrors.value.push(...passwordStrength.value.errors);
            }
            
            if (passwordErrors.value.length > 0) {
                return;
            }
            
            const result = await apiRequest('/admin/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    old_password: passwordForm.oldPassword,
                    new_password: passwordForm.newPassword,
                    confirm_password: passwordForm.confirmPassword
                })
            });
            
            if (result.success) {
                showToast('密碼修改成功', 'success');
                showPasswordModal.value = false;
                // 更新 token
                if (result.data?.token) {
                    localStorage.setItem('admin_token', result.data.token);
                }
            } else {
                passwordErrors.value.push(result.error?.message || result.message || '密碼修改失敗');
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
            if (currentPage.value === 'sysSettings') await loadSystemSettings();
            if (currentPage.value === 'smartOps') await loadSmartOpsData();
            if (currentPage.value === 'serviceDashboard') await loadServiceDashboard();
            if (currentPage.value === 'analyticsCenter') await loadAnalyticsCenter();
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
        
        // 確認操作（保證 onConfirm 為函數，避免點擊確認時報錯導致無法關閉）
        // 防止空對話框：若 title 或 message 為空則不顯示，避免出現空白遮罩阻塞按鈕
        const showConfirm = (title, message, onConfirm, type = 'normal', icon = '⚠️') => {
            const t = typeof title === 'string' ? title : (title != null ? String(title) : '');
            const m = typeof message === 'string' ? message : (message != null ? String(message) : '');
            if (!t.trim() || !m.trim()) {
                console.warn('showConfirm: 跳過空對話框，title/message 不能為空');
                return;
            }
            confirmDialog.title = t;
            confirmDialog.message = m;
            confirmDialog.icon = icon || '⚠️';
            confirmDialog.type = type;
            confirmDialog.onConfirm = typeof onConfirm === 'function' ? onConfirm : () => {};
            confirmDialog.show = true;
        };
        const showConfirmDialog = showConfirm;  // 別名，供支付配置等處調用
        const closeConfirmDialog = () => { 
            confirmDialog.show = false; 
            confirmDialog.title = ''; 
            confirmDialog.message = ''; 
        };
        const handleConfirmOk = () => {
            try { confirmDialog.onConfirm(); } catch (e) { console.error(e); }
            confirmDialog.show = false;
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
        
        // ============ 錢包操作 ============
        
        // 調賬彈窗狀態
        const showAdjustModal = ref(false);
        const adjustForm = ref({
            userId: '',
            userDisplay: '',
            currentBalance: '$0.00',
            currentBalanceNum: 0,
            walletStatus: 'active',
            amount: 0,
            reason: ''
        });
        
        // 打開調賬彈窗
        const adjustUserBalance = async (detail) => {
            const userId = detail.userId || detail.user?.userId || detail.user?.id;
            const wallet = detail.wallet || {};
            
            // 設置表單數據
            adjustForm.value = {
                userId: userId,
                userDisplay: detail.user?.email || detail.email || userId,
                currentBalance: wallet.total_display || `$${((wallet.balance || 0) + (wallet.bonus_balance || 0)) / 100}`,
                currentBalanceNum: ((wallet.balance || 0) + (wallet.bonus_balance || 0)) / 100,
                walletStatus: wallet.status || 'active',
                amount: 0,
                reason: ''
            };
            
            showAdjustModal.value = true;
        };
        
        // 計算新餘額
        const calculateNewBalance = () => {
            return adjustForm.value.currentBalanceNum + (adjustForm.value.amount || 0);
        };
        
        // 獲取新餘額樣式
        const getNewBalanceClass = () => {
            const newBal = calculateNewBalance();
            if (newBal < 0) return 'text-red-400';
            if (adjustForm.value.amount > 0) return 'text-green-400';
            return 'text-yellow-400';
        };
        
        // 提交調賬
        const submitAdjustBalance = async () => {
            const { userId, amount, reason } = adjustForm.value;
            
            if (!amount || amount === 0) {
                showToast('請輸入有效的金額', 'error');
                return;
            }
            
            if (!reason) {
                showToast('請輸入調賬原因', 'error');
                return;
            }
            
            isLoading.value = true;
            
            const result = await apiRequest(`/admin/wallets/${userId}/adjust`, {
                method: 'POST',
                body: JSON.stringify({
                    amount: Math.round(amount * 100), // 轉換為分
                    reason: reason
                })
            });
            
            isLoading.value = false;
            
            if (result.success) {
                const data = result.data || result;
                showToast(result.message || `調賬成功: ${amount > 0 ? '+' : ''}$${Math.abs(amount).toFixed(2)}`, 'success');
                showAdjustModal.value = false;
                
                // 更新用戶詳情
                if (userDetail.value && userDetail.value.userId === userId) {
                    // 刷新用戶詳情
                    const userResult = await apiRequest(`/admin/users/${userId}`);
                    if (userResult.success) {
                        userDetail.value = userResult.data;
                    }
                }
            } else {
                showToast('調賬失敗: ' + (result.error || result.message), 'error');
            }
        };
        
        const freezeUserWallet = async (detail) => {
            const userId = detail.userId || detail.user?.userId || detail.user?.id;
            showConfirm(
                '凍結錢包',
                '確定要凍結該用戶的錢包嗎？凍結後用戶將無法進行任何消費操作。',
                async () => {
                    const result = await apiRequest(`/admin/wallets/${userId}/freeze`, {
                        method: 'POST',
                        body: JSON.stringify({ reason: '管理員凍結' })
                    });
                    
                    if (result.success) {
                        showToast('錢包已凍結', 'success');
                        await viewUser(detail.user || detail);
                    } else {
                        showToast('操作失敗: ' + (result.error || result.message), 'error');
                    }
                },
                'danger',
                '🔒'
            );
        };
        
        const unfreezeUserWallet = async (detail) => {
            const userId = detail.userId || detail.user?.userId || detail.user?.id;
            const result = await apiRequest(`/admin/wallets/${userId}/unfreeze`, {
                method: 'POST'
            });
            
            if (result.success) {
                showToast('錢包已解凍', 'success');
                await viewUser(detail.user || detail);
            } else {
                showToast('操作失敗: ' + (result.error || result.message), 'error');
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
        const openCouponModal = () => {
            showCouponModal.value = true;
            // 備用：直接操作 DOM 確保顯示
            const el = document.getElementById('coupon-modal');
            if (el) el.style.display = 'flex';
        };
        const closeCouponModal = () => {
            showCouponModal.value = false;
            // 備用：直接操作 DOM 確保隱藏
            const el = document.getElementById('coupon-modal');
            if (el) el.style.display = 'none';
        };
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
        
        const exportCsvData = (type, status = '') => {
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
            else if (newPage === 'payment') { await loadPaymentAddresses(); await loadPaymentChannels(); await loadPaymentStats(); await loadPendingRecharges(); }  // 🆕 Phase 1.1
            else if (newPage === 'walletOps') { await loadWalletAnalytics(); await loadWalletOperations(); }  // 🆕
            else if (newPage === 'alerts') { await loadAlerts(); await loadAlertSummary(); }  // 🆕
            else if (newPage === 'campaigns') { await loadWalletOperations(); }  // 🆕
            else if (newPage === 'revenue') await loadRevenueReport();
            else if (newPage === 'analytics') await loadUserAnalytics();
            else if (newPage === 'quotas') await loadQuotaStats();
            else if (newPage === 'notifications') await loadNotificationHistory();
            else if (newPage === 'devices') await loadDevices();
            else if (newPage === 'logs') { await loadLogs(); await loadLogsStats(); }
            else if (newPage === 'proxies') await loadProxies();
            else if (newPage === 'apiPool') await loadApiPool();
            else if (newPage === 'admins') await loadAdmins();
            else if (newPage === 'referrals') await loadReferralStats();
            else if (newPage === 'announcements') await loadAnnouncements();
            else if (newPage === 'settings') await loadSettings();
            
            isLoading.value = false;
        });
        
        // ============ 生命週期 ============
        
        onMounted(async () => {
            // 隱藏載入提示（Vue 已成功掛載）
            if (window.__hideLoading) window.__hideLoading();
            // 確保登錄後不彈出優惠券面板（僅通過點擊「創建優惠券」按鈕打開）
            showCouponModal.value = false;
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
            dashboardPoolStats,
            systemAlerts,
            capacityForecast,
            dismissAlerts,
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
            logsPagination,
            logsFilter,
            logsStats,
            loadLogs,
            loadLogsStats,
            goToLogsPage,
            filterLogs,
            getActionIcon,
            // 代理池
            proxies,
            proxyStats,
            proxyPagination,
            proxyFilter,
            showProxyModal,
            proxyForm,
            loadProxies,
            openProxyModal,
            addProxies,
            deleteProxy,
            testProxy,
            releaseProxy,
            getProxyStatusClass,
            getProxyStatusText,
            // 🆕 API 對接池
            apiPoolList,
            apiPoolStats,
            apiPoolFilter,
            apiPoolStrategy,
            apiGroups,
            apiPoolGroupFilter,
            showGroupManagerModal,
            newGroupForm,
            openGroupManagerModal,
            createApiGroup,
            deleteApiGroup,
            editApiGroup,
            alertConfig,
            scheduledTasks,
            alertChannels,
            loadSystemSettings,
            saveAlertConfig,
            testAlertChannel,
            updateScheduledTask,
            runTaskNow,
            exportData,
            showApiPoolModal,
            apiPoolForm,
            showApiPoolBatchModal,
            apiPoolBatchForm,
            apiPoolBatchResult,
            loadApiPool,
            openApiPoolModal,
            addApiToPool,
            openApiPoolBatchModal,
            importApisFromText,
            downloadApiTemplate,
            handleApiFileUpload,
            setApiPoolStrategy,
            deleteApiFromPool,
            toggleApiStatus,
            getApiStatusClass,
            getApiStatusText,
            // P0 增強
            apiSearchQuery,
            selectedApis,
            showEditApiModal,
            editApiForm,
            expandedApiId,
            filteredApiPoolList,
            toggleApiDetail,
            openEditApiModal,
            updateApiInPool,
            isAllApisSelected,
            toggleAllApis,
            toggleApiSelection,
            batchApiAction,
            batchAssignGroup,
            copyApiHash,
            maskApiHash,
            formatApiTime,
            validateApiFields,
            // 🆕 Phase 3: 錢包運營
            walletOperations,
            walletAnalytics,
            showBatchAdjustModal,
            batchAdjustForm,
            loadWalletAnalytics,
            loadWalletOperations,
            executeBatchAdjust,
            executeBatchFreeze,
            executeBatchUnfreeze,
            // 🆕 Phase 3: 告警監控
            alerts,
            alertSummary,
            alertFilter,
            loadAlerts,
            loadAlertSummary,
            acknowledgeAlert,
            triggerAnomalyScan,
            getAlertSeverityClass,
            // 🆕 Phase 1.1: 支付配置
            paymentAddresses,
            paymentChannels,
            paymentStats,
            pendingRecharges,
            pendingRechargeStats,
            showAddressModal,
            addressForm,
            loadPaymentAddresses,
            loadPaymentChannels,
            loadPaymentStats,
            loadPendingRecharges,
            addPaymentAddress,
            togglePaymentAddress,
            deletePaymentAddress,
            togglePaymentChannel,
            confirmRechargeOrder,
            getNetworkBadgeClass,
            // 🆕 Phase 3: 營銷活動
            showCampaignModal,
            campaignForm,
            executeCampaignReward,
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
            showPasswordModal,
            passwordForm,
            passwordErrors,
            passwordStrength,
            openPasswordModal,
            checkPasswordStrength,
            changePassword,
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
            closeConfirmDialog,
            handleConfirmOk,
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
            
            // 錢包操作
            adjustUserBalance,
            showAdjustModal,
            adjustForm,
            calculateNewBalance,
            getNewBalanceClass,
            submitAdjustBalance,
            freezeUserWallet,
            unfreezeUserWallet,
            
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
            openCouponModal,
            closeCouponModal,
            createCoupon,
            
            // 確認操作
            showConfirm,
            
            // 設置操作
            saveSettings,
            savePrices,
            telegramConfig,
            saveTelegramConfig,
            testTelegram,
            exportCsvData,
            
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
            
            // 🆕 P7: 智能運維
            healthScores,
            healthSummary,
            anomalies,
            predictionReport,
            webhookSubscribers,
            webhookEvents,
            webhookStats,
            billingPlans,
            invoices,
            scalingPolicies,
            scalingRecommendations,
            scalingHistory,
            showWebhookModal,
            webhookForm,
            showScalingModal,
            scalingForm,
            loadHealthScores,
            loadPredictionReport,
            loadWebhookSubscribers,
            addWebhookSubscriber,
            deleteWebhookSubscriber,
            testWebhook,
            loadBillingPlans,
            loadScalingPolicies,
            createScalingPolicy,
            executeScaling,
            loadSmartOpsData,
            
            // 🆕 P9: 服務健康儀表盤
            serviceDashboard,
            showIncidentModal,
            showMaintenanceModal,
            incidentForm,
            maintenanceForm,
            loadServiceDashboard,
            createStatusUpdate,
            scheduleMaintenance,
            
            // 🆕 P10: 分析中心
            analyticsCenter,
            analyticsActiveTab,
            showReportModal,
            reportForm,
            loadAnalyticsCenter,
            generateReport,
            detectBottlenecks,
            
            // 其他
            refreshData,
            handleLogout
        };
    }
}).mount('#app');
