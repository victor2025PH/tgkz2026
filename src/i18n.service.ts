/**
 * Internationalization (i18n) Service
 * 國際化服務 - 多語言支持
 * 
 * 支持語言：
 * - en: English
 * - zh-CN: 简体中文
 * - zh-TW: 繁體中文
 */
import { Injectable, signal, computed, effect } from '@angular/core';

export type SupportedLocale = 'en' | 'zh-CN' | 'zh-TW';

export interface LocaleInfo {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'zh-CN', name: 'Simplified Chinese', nativeName: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', name: 'Traditional Chinese', nativeName: '繁體中文', flag: '🇹🇼' }
];

type TranslationKey = string;
type TranslationValue = string | Record<string, any>;
type Translations = Record<TranslationKey, TranslationValue>;

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  // 當前語言
  private _locale = signal<SupportedLocale>('zh-TW');
  locale = this._locale.asReadonly();
  
  // 語言包緩存
  private translations = signal<Record<SupportedLocale, Translations>>({
    'en': {},
    'zh-CN': {},
    'zh-TW': {}
  });
  
  // 加載狀態
  private _loading = signal(false);
  loading = this._loading.asReadonly();
  
  // 計算屬性
  currentLocaleInfo = computed(() => 
    SUPPORTED_LOCALES.find(l => l.code === this._locale()) || SUPPORTED_LOCALES[2]
  );
  
  supportedLocales = SUPPORTED_LOCALES;
  
  constructor() {
    this.initLocale();
    this.loadTranslations();
    
    // 監聽語言變化，自動保存
    effect(() => {
      const locale = this._locale();
      localStorage.setItem('tg-matrix-locale', locale);
      document.documentElement.lang = locale;
    });
  }
  
  /**
   * 初始化語言設置
   */
  private initLocale(): void {
    // 優先從本地存儲讀取
    const stored = localStorage.getItem('tg-matrix-locale') as SupportedLocale;
    if (stored && SUPPORTED_LOCALES.some(l => l.code === stored)) {
      this._locale.set(stored);
      return;
    }
    
    // 自動檢測瀏覽器語言
    const browserLang = navigator.language;
    if (browserLang.startsWith('zh')) {
      // 區分簡繁體
      if (browserLang === 'zh-CN' || browserLang === 'zh-Hans') {
        this._locale.set('zh-CN');
      } else {
        this._locale.set('zh-TW');
      }
    } else {
      this._locale.set('en');
    }
  }
  
  /**
   * 加載語言包
   */
  private async loadTranslations(): Promise<void> {
    this._loading.set(true);
    
    try {
      // 內置語言包（也可以改為從服務器加載）
      const translations: Record<SupportedLocale, Translations> = {
        'en': await this.getEnglishTranslations(),
        'zh-CN': await this.getSimplifiedChineseTranslations(),
        'zh-TW': await this.getTraditionalChineseTranslations()
      };
      
      this.translations.set(translations);
    } catch (e) {
      console.error('Failed to load translations:', e);
    } finally {
      this._loading.set(false);
    }
  }
  
  /**
   * 切換語言
   */
  setLocale(locale: SupportedLocale): void {
    if (SUPPORTED_LOCALES.some(l => l.code === locale)) {
      this._locale.set(locale);
    }
  }
  
  /**
   * 翻譯文本
   * @param key 翻譯鍵，支持點號分隔的嵌套鍵 (如 'menu.dashboard')，也支持舊的扁平鍵 (如 'dashboard')
   * @param params 插值參數
   */
  t(key: string, params?: Record<string, string | number>): string {
    const locale = this._locale();
    const allTranslations = this.translations();
    const localeTranslations = allTranslations[locale] || {};
    
    // 輔助函數：檢查值是否為有效字符串
    const isValidString = (v: any): v is string => typeof v === 'string';
    
    let value: any;
    
    // 1. 首先嘗試從扁平翻譯表獲取（優先級最高，因為這是舊代碼使用的格式）
    value = this.getFlatTranslation(key, locale);
    if (isValidString(value)) {
      return this.interpolate(value, params);
    }
    
    // 2. 嘗試嵌套鍵（如 'menu.dashboard'）
    value = this.getNestedValue(localeTranslations, key);
    if (isValidString(value)) {
      return this.interpolate(value, params);
    }
    
    // 3. 嘗試扁平鍵映射（如 'dashboard' -> 'menu.dashboard'）
    const flatKey = this.getFlatKeyMapping(key);
    if (flatKey) {
      value = this.getNestedValue(localeTranslations, flatKey);
      if (isValidString(value)) {
        return this.interpolate(value, params);
      }
    }
    
    // 4. 從繁體中文回退
    if (locale !== 'zh-TW') {
      value = this.getFlatTranslation(key, 'zh-TW');
      if (isValidString(value)) {
        return this.interpolate(value, params);
      }
      
      value = this.getNestedValue(allTranslations['zh-TW'], key);
      if (isValidString(value)) {
        return this.interpolate(value, params);
      }
      
      if (flatKey) {
        value = this.getNestedValue(allTranslations['zh-TW'], flatKey);
        if (isValidString(value)) {
          return this.interpolate(value, params);
        }
      }
    }
    
    // 5. 還是找不到，返回鍵名
    return key;
  }
  
  /**
   * 參數插值
   */
  private interpolate(value: string, params?: Record<string, string | number>): string {
    if (!params) return value;
    let result = value;
    Object.entries(params).forEach(([k, v]) => {
      result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
    });
    return result;
  }
  
  /**
   * 舊扁平鍵到新嵌套鍵的映射
   */
  private getFlatKeyMapping(flatKey: string): string | undefined {
    const mapping: Record<string, string> = {
      'dashboard': 'menu.dashboard',
      'accounts': 'menu.accounts',
      'automation': 'menu.automation',
      'leads': 'menu.leads',
      'analytics': 'menu.analytics',
      'logs': 'menu.logs',
      'performance': 'menu.performance',
      'alerts': 'menu.alerts',
      'settings': 'settings.title',
      'aiCenter': 'menu.aiCenter',
    };
    return mapping[flatKey];
  }
  
  /**
   * 扁平翻譯表（兼容舊代碼）
   * 包含所有舊 TranslationService 中的翻譯鍵
   */
  private getFlatTranslation(key: string, locale: SupportedLocale): string | undefined {
    const flatTranslations: Record<SupportedLocale, Record<string, string>> = {
      'en': {
        // 基本
        title: 'TG-AI智控王',
        subtitle: 'AI Smart Control System',
        
        // 菜單
        dashboard: 'Dashboard',
        accounts: 'Accounts',
        automation: 'Automation',
        leads: 'Leads',
        analytics: 'Analytics',
        logs: 'Logs',
        performance: 'Performance',
        alerts: 'Alerts',
        settings: 'Settings',
        
        // 菜單分類
        resourceManagement: 'Resource Management',
        marketingAutomation: 'Marketing Automation',
        aiIntelligence: 'AI & Intelligence',
        systemMonitor: 'System Monitor',
        resourceDiscoveryMenu: 'Resource Discovery',
        aiCenter: 'AI Center',
        monitoringCenter: 'Monitoring Center',
        
        // 外觀
        appearance: 'Appearance',
        language: 'Language',
        light: 'Light',
        dark: 'Dark',
        
        // 儀表板
        totalAccounts: 'Total Accounts',
        onlineAccounts: 'Online Accounts',
        leadsToday: 'Leads Today',
        messagesSentToday: 'Messages Sent Today',
        leadsCaptured: 'Leads Captured',
        keywords: 'Keywords',
        monitoredGroups: 'Monitored Groups',
        systemControl: 'System Control',
        monitoringStatus: 'Monitoring Status',
        active: 'Active',
        inactive: 'Inactive',
        start: 'Start',
        stop: 'Stop',
        recentLogs: 'Recent Logs',
        recentLeads: 'Recent Leads',
        noRecentActivity: 'No recent activity',
        
        // 帳號管理
        manageAccounts: 'Manage Accounts',
        addNewAccount: 'Add New Account',
        phoneNumber: 'Phone Number',
        apiId: 'API ID',
        apiHash: 'API Hash',
        proxy: 'Proxy (Optional)',
        addAccount: 'Add Account',
        phone: 'Phone',
        status: 'Status',
        login: 'Login',
        enableWarmup: 'Enable Warmup',
        dailySends: 'Daily Sends',
        twoFactorPassword: '2FA Password',
        accountGroup: 'Account Group',
        allAccounts: 'All Accounts',
        importSession: 'Import Session',
        exportSession: 'Export Session',
        downloadTemplate: 'Download Template',
        uploadExcel: 'Upload Excel',
        reloadSessions: 'Reload Sessions',
        health: 'Health',
        group: 'Group',
        role: 'Role',
        
        // 自動化
        automationHub: 'Automation Hub',
        monitoringTargets: 'Monitoring Targets',
        automationRules: 'Automation Rules',
        globalSendingConfig: 'Global Sending Config',
        keywordSets: 'Keyword Sets',
        newKeywordSet: 'New Keyword Set',
        add: 'Add',
        groups: 'Groups',
        groupUrl: 'Group URL',
        triggers: 'Triggers',
        campaignTriggerHint: 'Campaign triggers when all conditions match',
        sourceGroups: 'Source Groups',
        actions: 'Actions',
        messageTemplate: 'Message Template',
        selectTemplate: 'Select Template',
        createCampaign: 'Create Campaign',
        campaignName: 'Campaign Name',
        campaigns: 'Campaigns',
        sendingDelays: 'Sending Delays',
        min: 'Min',
        max: 'Max',
        enableSpintax: 'Enable Spintax',
        spintaxHint: 'Enable spintax for message variations',
        enableSmartSending: 'Enable Smart Sending',
        smartSendingHint: 'Only send when user is online',
        enableAutoReply: 'Enable Auto Reply',
        autoReplyHint: 'Auto reply when user responds',
        autoReplyEditHint: 'Edit auto reply message',
        saveAutoReply: 'Save Auto Reply',
        accountStatus: 'Account Status',
        activeListenerAccounts: 'Active Listener Accounts',
        noActiveListeners: 'No active listeners',
        activeSenderAccounts: 'Active Sender Accounts',
        noActiveSenders: 'No active senders',
        addGroup: 'Add Group',
        
        // 潛在客戶
        leadPipeline: 'Lead Pipeline',
        newLeadCaptured: 'New Lead Captured',
        username: 'Username',
        sourceGroup: 'Source Group',
        keyword: 'Keyword',
        message: 'Message',
        contacted: 'Contacted',
        kanbanView: 'Kanban View',
        listView: 'List View',
        exportToExcel: 'Export to Excel',
        'New': 'New',
        'Contacted': 'Contacted',
        'Replied': 'Replied',
        'Follow-up': 'Follow-up',
        'Closed-Won': 'Closed-Won',
        'Closed-Lost': 'Closed-Lost',
        
        // 資源發現
        resourceDiscoveryTitle: 'Resource Discovery',
        totalResources: 'Total Resources',
        todayDiscovered: 'Discovered Today',
        pendingJoins: 'Pending Joins',
        joinedCount: 'Joined',
        initResourceDiscovery: 'Initialize',
        processJoinQueue: 'Process Queue',
        noResourcesFound: 'No resources found',
        chineseSearch: 'Chinese Search',
        tgstatAnalysis: 'TGStat Analysis',
        
        // Keyword related
        addKeywordPlaceholder: 'Enter keyword or phrase (e.g., bitcoin, payment)',
        regexTooltip: 'Regular Expression: Use pattern matching instead of exact text. Example: bitcoin|BTC matches "bitcoin" or "BTC"',
        regexExamples: 'Regex Examples',
        regexExample1: 'bitcoin|BTC - matches bitcoin or BTC',
        regexExample2: 'pay.*ment - matches payment, payments, etc.',
        regexExample3: '\\d+.*USD - matches numbers followed by USD',
        addKeywordButton: 'Add',
        keywordAdded: 'Keyword added',
        keywordAddFailed: 'Failed to add keyword',
        invalidRegex: 'Invalid regex syntax',
        selectKeywordSetFirst: 'Please select a keyword set first',
        keywordEmpty: 'Keyword cannot be empty',

        // AI 中心
        aiConfiguration: 'AI Configuration',
        aiConfigurationHint: 'Configure AI API for message generation',
        aiProvider: 'AI Provider',
        customApi: 'Custom API',
        localAi: 'Local AI',
        aiAutoChat: 'AI Auto Chat',
        ragKnowledge: 'RAG Knowledge',
        voiceService: 'Voice Service',
        testConnection: 'Test Connection',
        saveSettings: 'Save Settings',
        customApiKey: 'API Key',
        customApiHint: 'Enter your API key',
        
        // 語音服務
        voiceServices: 'Voice Services',
        voiceServicesHint: 'Configure TTS and STT services',
        ttsService: 'TTS Service',
        ttsEnabled: 'TTS Enabled',
        ttsEndpoint: 'TTS Endpoint',
        ttsVoice: 'TTS Voice',
        testTts: 'Test TTS',
        sttService: 'STT Service',
        sttEnabled: 'STT Enabled',
        sttEndpoint: 'STT Endpoint',
        testStt: 'Test STT',
        remoteEndpointHint: 'Remote endpoint URL',
        saveLocalSettings: 'Save Local Settings',
        voiceClone: 'Voice Clone',
        voiceCloneHint: 'Clone voices from audio samples',
        recordVoice: 'Record Voice',
        orUploadFile: 'Or Upload File',
        clonedVoices: 'Cloned Voices',
        
        // RAG 知識庫
        ragEnabled: 'RAG Enabled',
        ragHint: 'Enable RAG for knowledge-enhanced AI',
        telegramRagTitle: 'Telegram RAG',
        telegramRagHint: 'Auto-learn from chat history',
        totalKnowledge: 'Total Knowledge',
        qaLearned: 'Q&A Learned',
        scriptsLearned: 'Scripts Learned',
        totalUses: 'Total Uses',
        ragSystemOffline: 'RAG System Offline',
        vectorDb: 'Vector DB',
        embedding: 'Embedding',
        initRagSystem: 'Initialize RAG',
        learnFromChats: 'Learn from Chats',
        reindexHighValue: 'Reindex High Value',
        cleanupRag: 'Cleanup RAG',
        refreshStats: 'Refresh Stats',
        searchRagPlaceholder: 'Search knowledge...',
        addManualKnowledge: 'Add Manual Knowledge',
        
        // A/B 測試
        abTesting: 'A/B Testing',
        abTestingHint: 'Test different message templates',
        templateName: 'Template Name',
        prompt: 'Prompt',
        saveTemplate: 'Save Template',
        
        // 分析
        analyticsTitle: 'Performance Analytics',
        allCampaigns: 'All Campaigns',
        last7Days: 'Last 7 Days',
        
        // 設定
        settingsTitle: 'Settings',
        settingsAutoSaveHint: 'Settings auto-save on change',
        localAiConfiguration: 'Local AI Configuration',
        
        // 通用
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        remove: 'Remove',
        close: 'Close',
        confirm: 'Confirm',
        search: 'Search',
        loading: 'Loading...',
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        refresh: 'Refresh',
        
        // 狀態
        'Online': 'Online',
        'Offline': 'Offline',
        'Recently': 'Recently',
        'Unknown': 'Unknown',
        'Listener': 'Listener (Monitor)',
        'Sender': 'Sender',
        'Explorer': 'Explorer',
        'AI': 'AI Account',
        'Backup': 'Backup Account',
        'Unassigned': 'Unassigned',
        'Banned': 'Banned',
        'Warming Up': 'Warming Up',
      },
      'zh-CN': {
        // 基本
        title: 'TG-AI智控王',
        subtitle: 'AI 智能营销系统',
        
        // 菜單
        dashboard: '仪表盘',
        accounts: '账户管理',
        automation: '自动化中心',
        leads: '潜在客户',
        analytics: '分析',
        logs: '日志',
        performance: '性能监控',
        alerts: '告警',
        settings: '设置',
        
        // 菜單分類
        resourceManagement: '资源管理',
        marketingAutomation: '营销自动化',
        aiIntelligence: 'AI 智能',
        systemMonitor: '系统监控',
        resourceDiscoveryMenu: '资源发现',
        aiCenter: 'AI 中心',
        monitoringCenter: '监控中心',
        
        // 外觀
        appearance: '外观',
        language: '语言',
        light: '浅色',
        dark: '深色',
        
        // 儀表板
        totalAccounts: '总账户数',
        onlineAccounts: '在线账户',
        leadsToday: '今日获客',
        messagesSentToday: '今日已发',
        leadsCaptured: '捕获客户',
        keywords: '关键词',
        monitoredGroups: '监控群组',
        systemControl: '系统控制',
        monitoringStatus: '监控状态',
        active: '运行中',
        inactive: '已停止',
        start: '启动',
        stop: '停止',
        recentLogs: '最近日志',
        recentLeads: '最近客户',
        noRecentActivity: '暂无最近活动',
        
        // 帳號管理
        manageAccounts: '管理账户',
        addNewAccount: '添加新账户',
        phoneNumber: '电话号码',
        apiId: 'API ID',
        apiHash: 'API Hash',
        proxy: '代理 (可选)',
        addAccount: '添加账户',
        phone: '电话',
        status: '状态',
        login: '登录',
        enableWarmup: '启用预热',
        dailySends: '今日已发',
        twoFactorPassword: '2FA 密码',
        accountGroup: '账户分组',
        allAccounts: '所有账户',
        importSession: '导入会话',
        exportSession: '导出会话',
        downloadTemplate: '下载模板',
        uploadExcel: '上传 Excel',
        reloadSessions: '重新加载会话',
        health: '健康度',
        role: '角色',
        
        // 自動化
        automationHub: '自动化中心',
        monitoringTargets: '监控目标',
        automationRules: '自动化规则',
        globalSendingConfig: '全局发送配置',
        keywordSets: '关键词集',
        newKeywordSet: '新关键词集',
        add: '添加',
        groups: '群组',
        groupUrl: '群组链接',
        triggers: '触发器',
        campaignTriggerHint: '满足所有条件时触发活动',
        sourceGroups: '来源群组',
        actions: '动作',
        messageTemplate: '消息模板',
        selectTemplate: '选择模板',
        createCampaign: '创建活动',
        campaignName: '活动名称',
        campaigns: '活动列表',
        sendingDelays: '发送延迟',
        min: '最小',
        max: '最大',
        enableSpintax: '启用 Spintax',
        spintaxHint: '启用 Spintax 实现消息多样化',
        enableSmartSending: '启用智能发送',
        smartSendingHint: '仅在用户在线时发送',
        enableAutoReply: '启用自动回复',
        autoReplyHint: '用户回复时自动回复',
        autoReplyEditHint: '编辑自动回复消息',
        saveAutoReply: '保存自动回复',
        accountStatus: '账户状态',
        activeListenerAccounts: '活跃监控账户',
        noActiveListeners: '无活跃监控账户',
        activeSenderAccounts: '活跃发送账户',
        noActiveSenders: '无活跃发送账户',
        addGroup: '添加群组',
        
        // 潛在客戶
        leadPipeline: '潜在客户漏斗',
        newLeadCaptured: '捕获新客户',
        username: '用户名',
        sourceGroup: '来源群组',
        keyword: '关键词',
        message: '消息',
        contacted: '已联系',
        kanbanView: '看板视图',
        listView: '列表视图',
        exportToExcel: '导出到 Excel',
        'New': '新客户',
        'Contacted': '已联系',
        'Replied': '已回复',
        'Follow-up': '需跟进',
        'Closed-Won': '已成交',
        'Closed-Lost': '已流失',
        
        // 資源發現
        resourceDiscoveryTitle: '资源发现',
        totalResources: '总资源数',
        todayDiscovered: '今日发现',
        pendingJoins: '待加入',
        joinedCount: '已加入',
        initResourceDiscovery: '初始化',
        processJoinQueue: '处理队列',
        noResourcesFound: '暂无资源',
        chineseSearch: '中文搜索',
        tgstatAnalysis: 'TGStat数据分析',
        // 资源表格
        resourceType: '类型',
        resourceTitle: '标题',
        memberCount: '成员数',
        overallScore: '评分',
        resourceStatus: '状态',
        resourceActions: '操作',
        // 搜索渠道
        searchChannelSelect: '搜索渠道选择',
        canMultiSelect: '可多选',
        officialSearch: '官方搜索',
        chineseGroups: '中文群组',
        dataAnalysis: '数据分析',
        localIndex: '本地索引',
        cached: '已缓存',
        selectedChannels: '已选择',
        channels: '个渠道',
        selectAll: '全选',
        // 筛选选项
        allStatus: '全部状态',
        discovered: '已发现',
        queued: '队列中',
        joined: '已加入',
        blocked: '被封禁',
        allTypes: '全部类型',
        group: '群组',
        supergroup: '超级群组',
        channel: '频道',
        // 搜索选项
        replaceMode: '替换模式',
        replaceModeHint: '每次搜索清空旧结果',
        resourceTypeLabel: '资源类型',
        minMembers: '最小成员数',
        resetFilter: '重置筛选',
        // 操作按钮
        refresh: '刷新',
        refreshing: '刷新中...',
        clearResults: '清空结果',
        batchOperation: '批量操作',
        enterGroup: '进入群组',
        batchJoin: '批量加入',
        addToQueue: '加入队列',
        joinNow: '立即加入',
        joinAndMonitor: '加入+监控',
        batchSend: '批量群发',
        batchInvite: '批量拉群',
        selected: '已选',
        groupsUnit: '个群组',
        person: '人',
        useSearchAbove: '使用上方搜索框开始搜索群组和频道',
        processing: '处理中...',
        systemOnline: '系统在线',
        notInitialized: '未初始化',
        // 批量操作工具栏
        selectAllResources: '全选',
        selectedResources: '已选择',
        resourcesUnit: '个资源',
        clearSelection: '清除选择',
        batchApprove: '批量批准',
        batchReject: '批量拒绝',
        batchSetPriority: '设置优先级',
        batchDelete: '批量删除',
        highPriority: '高优先级',
        mediumPriority: '中优先级',
        lowPriority: '低优先级',
        // 搜索框
        searchPlaceholder: '输入关键词搜索（多个用逗号分隔，如：支付,收款,USDT）',
        searchOptions: '搜索选项',
        search: '搜索',
        searching: '搜索中...',
        // 资源发现页面
        groupsAndChannels: '群组/频道',
        discussionMonitor: '讨论组监控',
        useAccount: '使用账号',
        selectAccount: '选择执行账号',
        noOnlineAccount: '没有在线的账号',
        goToAccountManagement: '请先到账号管理登录账号',
        noAvailableAccount: '没有可用账号',
        // 操作按钮title
        enterGroupTitle: '进入群组查看成员',
        openInTelegram: '在 Telegram 打开',
        joinGroupTitle: '加入群组',
        sendToGroup: '发送消息到群组',
        inviteToGroup: '邀请成员加入群组',
        // 批量群发对话框
        batchSendTitle: '批量群发消息',
        willSendTo: '将发送到',
        groupsCount: '个群组',
        enterMessageContent: '输入要发送的消息内容...\n支持变量：{group_name}, {member_count}',
        variableHint: '支持变量替换：{group_name} - 群组名称, {member_count} - 成员数',
        sendInterval: '发送间隔',
        smartAntiBlock: '智能防封（动态延迟、消息变体）',
        startSending: '开始发送',
        // 添加关键词对话框
        addKeywordTitle: '添加关键词',
        enterKeyword: '输入搜索关键词...',
        // 更多操作
        copyLink: '复制链接',
        confirmAdd: '确认添加',
        // 批量消息相关
        messageContent: '消息内容',
        dailyLimit: '每日上限',
        messages: '条',
        seconds: '秒',
        minutes: '分钟',
        willInviteTo: '将邀请成员加入',
        // 批量拉群相关
        selectMembersToInvite: '选择要邀请的成员',
        noAvailableMembers: '暂无可用成员，请先提取成员',
        moreMembers: '还有 {count} 位成员，请在成员管理页面选择',
        selectedMembers: '已选择',
        membersUnit: '位成员',
        inviteInterval: '邀请间隔',
        perGroupLimit: '每群上限',
        startInvite: '开始邀请',
        smartAntiBlockInvite: '智能防封（分批邀请、动态延迟）',
        
        // 关键词相关
        addKeywordPlaceholder: '输入关键词或短语（例如：bitcoin, 付款）',
        regexTooltip: '正则表达式：使用模式匹配而非精确文字。例如：bitcoin|BTC 可匹配 "bitcoin" 或 "BTC"',
        regexExamples: '正则示例',
        regexExample1: 'bitcoin|BTC - 匹配 bitcoin 或 BTC',
        regexExample2: 'pay.*ment - 匹配 payment, payments 等',
        regexExample3: '\\d+.*USD - 匹配数字后跟 USD',
        addKeywordButton: '添加',
        keywordAdded: '关键词已添加',
        keywordAddFailed: '添加关键词失败',
        invalidRegex: '正则表达式语法错误',
        selectKeywordSetFirst: '请先点击关键词集以选择',
        keywordEmpty: '关键词不能为空',
        
        // AI 中心
        aiConfiguration: 'AI 配置',
        aiConfigurationHint: '配置 AI API 以启用消息生成',
        aiProvider: 'AI 服务商',
        customApi: '自定义 API',
        localAi: '本地 AI',
        aiAutoChat: 'AI 自动聊天',
        ragKnowledge: 'RAG 知识库',
        voiceService: '语音服务',
        testConnection: '测试连接',
        saveSettings: '保存设置',
        customApiKey: 'API 密钥',
        customApiHint: '输入您的 API 密钥',
        
        // 語音服務
        voiceServices: '语音服务',
        voiceServicesHint: '配置 TTS 和 STT 服务',
        ttsService: 'TTS 服务',
        ttsEnabled: '启用 TTS',
        ttsEndpoint: 'TTS 端点',
        ttsVoice: 'TTS 语音',
        testTts: '测试 TTS',
        sttService: 'STT 服务',
        sttEnabled: '启用 STT',
        sttEndpoint: 'STT 端点',
        testStt: '测试 STT',
        remoteEndpointHint: '远程端点 URL',
        saveLocalSettings: '保存本地设置',
        voiceClone: '声音克隆',
        voiceCloneHint: '从音频样本克隆声音',
        recordVoice: '录制声音',
        orUploadFile: '或上传文件',
        clonedVoices: '已克隆的声音',
        
        // RAG 知識庫
        ragEnabled: '启用 RAG',
        ragHint: '启用 RAG 增强 AI 知识',
        telegramRagTitle: 'Telegram RAG',
        telegramRagHint: '自动从聊天历史学习',
        totalKnowledge: '总知识量',
        qaLearned: '学习的问答',
        scriptsLearned: '学习的话术',
        totalUses: '总使用次数',
        ragSystemOffline: 'RAG 系统离线',
        vectorDb: '向量库',
        embedding: '嵌入模型',
        initRagSystem: '初始化 RAG',
        learnFromChats: '从聊天学习',
        reindexHighValue: '重建高价值索引',
        cleanupRag: '清理 RAG',
        refreshStats: '刷新统计',
        searchRagPlaceholder: '搜索知识...',
        addManualKnowledge: '手动添加知识',
        
        // A/B 測試
        abTesting: 'A/B 测试',
        abTestingHint: '测试不同的消息模板',
        templateName: '模板名称',
        prompt: '提示语',
        saveTemplate: '保存模板',
        
        // 分析
        analyticsTitle: '性能分析',
        allCampaigns: '所有活动',
        last7Days: '过去 7 天',
        
        // 設定
        settingsTitle: '设置',
        settingsAutoSaveHint: '设置会自动保存',
        localAiConfiguration: '本地 AI 配置',
        
        // 通用
        save: '保存',
        edit: '编辑',
        remove: '移除',
        close: '关闭',
        confirm: '确认',
        loading: '加载中...',
        success: '成功',
        error: '错误',
        warning: '警告',
        
        // 狀態
        'Online': '在线',
        'Offline': '离线',
        'Recently': '最近在线',
        'Unknown': '未知',
        'Listener': '监控号',
        'Sender': '发送号',
        'Explorer': '探索号',
        'AI': 'AI号',
        'Backup': '备用号',
        'Unassigned': '未分配',
        'Banned': '已封禁',
        'Warming Up': '预热中',
      },
      'zh-TW': {
        // 基本
        title: 'TG-AI智控王',
        subtitle: 'AI 智能行銷系統',
        
        // 菜單
        dashboard: '儀表板',
        accounts: '帳號管理',
        automation: '自動化中心',
        leads: '潛在客戶',
        analytics: '分析',
        logs: '日誌',
        performance: '效能監控',
        alerts: '告警',
        settings: '設定',
        
        // 菜單分類
        resourceManagement: '資源管理',
        marketingAutomation: '行銷自動化',
        aiIntelligence: 'AI 智能',
        systemMonitor: '系統監控',
        resourceDiscoveryMenu: '資源發現',
        aiCenter: 'AI 中心',
        monitoringCenter: '監控中心',
        
        // 外觀
        appearance: '外觀',
        language: '語言',
        light: '淺色',
        dark: '深色',
        
        // 儀表板
        totalAccounts: '總帳號數',
        onlineAccounts: '線上帳號',
        leadsToday: '今日獲客',
        messagesSentToday: '今日已發',
        leadsCaptured: '擷取客戶',
        keywords: '關鍵字',
        monitoredGroups: '監控群組',
        systemControl: '系統控制',
        monitoringStatus: '監控狀態',
        active: '運行中',
        inactive: '已停止',
        start: '啟動',
        stop: '停止',
        recentLogs: '最近日誌',
        recentLeads: '最近客戶',
        noRecentActivity: '暫無最近活動',
        
        // 帳號管理
        manageAccounts: '管理帳號',
        addNewAccount: '新增帳號',
        phoneNumber: '電話號碼',
        apiId: 'API ID',
        apiHash: 'API Hash',
        proxy: '代理 (選填)',
        addAccount: '新增帳號',
        phone: '電話',
        status: '狀態',
        login: '登入',
        enableWarmup: '啟用預熱',
        dailySends: '今日已發',
        twoFactorPassword: '2FA 密碼',
        accountGroup: '帳號分組',
        allAccounts: '所有帳號',
        importSession: '匯入 Session',
        exportSession: '匯出 Session',
        downloadTemplate: '下載範本',
        uploadExcel: '上傳 Excel',
        reloadSessions: '重新載入 Session',
        health: '健康度',
        group: '分組',
        role: '角色',
        
        // 自動化
        automationHub: '自動化中心',
        monitoringTargets: '監控目標',
        automationRules: '自動化規則',
        globalSendingConfig: '全域發送設定',
        keywordSets: '關鍵字集',
        newKeywordSet: '新關鍵字集',
        add: '新增',
        groups: '群組',
        groupUrl: '群組連結',
        triggers: '觸發器',
        campaignTriggerHint: '滿足所有條件時觸發活動',
        sourceGroups: '來源群組',
        actions: '動作',
        messageTemplate: '訊息範本',
        selectTemplate: '選擇範本',
        createCampaign: '建立活動',
        campaignName: '活動名稱',
        campaigns: '活動清單',
        sendingDelays: '發送延遲',
        min: '最小',
        max: '最大',
        enableSpintax: '啟用 Spintax',
        spintaxHint: '啟用 Spintax 實現訊息多樣化',
        enableSmartSending: '啟用智慧發送',
        smartSendingHint: '僅在使用者線上時發送',
        enableAutoReply: '啟用自動回覆',
        autoReplyHint: '使用者回覆時自動回覆',
        autoReplyEditHint: '編輯自動回覆訊息',
        saveAutoReply: '儲存自動回覆',
        accountStatus: '帳號狀態',
        activeListenerAccounts: '活躍監控帳號',
        noActiveListeners: '無活躍監控帳號',
        activeSenderAccounts: '活躍發送帳號',
        noActiveSenders: '無活躍發送帳號',
        addGroup: '新增群組',
        
        // 潛在客戶
        leadPipeline: '潛在客戶漏斗',
        newLeadCaptured: '擷取新客戶',
        username: '使用者名稱',
        sourceGroup: '來源群組',
        keyword: '關鍵字',
        message: '訊息',
        contacted: '已聯繫',
        kanbanView: '看板檢視',
        listView: '清單檢視',
        exportToExcel: '匯出到 Excel',
        'New': '新客戶',
        'Contacted': '已聯繫',
        'Replied': '已回覆',
        'Follow-up': '需跟進',
        'Closed-Won': '已成交',
        'Closed-Lost': '已流失',
        
        // 資源發現
        resourceDiscoveryTitle: '資源發現',
        totalResources: '總資源數',
        todayDiscovered: '今日發現',
        pendingJoins: '待加入',
        joinedCount: '已加入',
        initResourceDiscovery: '初始化',
        processJoinQueue: '處理佇列',
        noResourcesFound: '暫無資源',
        chineseSearch: '中文搜索',
        tgstatAnalysis: 'TGStat數據分析',
        
        // 關鍵字相關
        addKeywordPlaceholder: '輸入關鍵字或短語（例如：bitcoin, 付款）',
        regexTooltip: '正則表達式：使用模式匹配而非精確文字。例如：bitcoin|BTC 可匹配 "bitcoin" 或 "BTC"',
        regexExamples: '正則示例',
        regexExample1: 'bitcoin|BTC - 匹配 bitcoin 或 BTC',
        regexExample2: 'pay.*ment - 匹配 payment, payments 等',
        regexExample3: '\\d+.*USD - 匹配數字後跟 USD',
        addKeywordButton: '新增',
        keywordAdded: '關鍵字已新增',
        keywordAddFailed: '新增關鍵字失敗',
        invalidRegex: '正則表達式語法錯誤',
        selectKeywordSetFirst: '請先點擊關鍵字集以選擇',
        keywordEmpty: '關鍵字不能為空',

        // AI 中心
        aiConfiguration: 'AI 設定',
        aiConfigurationHint: '設定 AI API 以啟用訊息生成',
        aiProvider: 'AI 服務商',
        customApi: '自訂 API',
        localAi: '本地 AI',
        aiAutoChat: 'AI 自動聊天',
        ragKnowledge: 'RAG 知識庫',
        voiceService: '語音服務',
        testConnection: '測試連線',
        saveSettings: '儲存設定',
        customApiKey: 'API 金鑰',
        customApiHint: '輸入您的 API 金鑰',
        
        // 語音服務
        voiceServices: '語音服務',
        voiceServicesHint: '設定 TTS 和 STT 服務',
        ttsService: 'TTS 服務',
        ttsEnabled: '啟用 TTS',
        ttsEndpoint: 'TTS 端點',
        ttsVoice: 'TTS 語音',
        testTts: '測試 TTS',
        sttService: 'STT 服務',
        sttEnabled: '啟用 STT',
        sttEndpoint: 'STT 端點',
        testStt: '測試 STT',
        remoteEndpointHint: '遠端端點 URL',
        saveLocalSettings: '儲存本地設定',
        voiceClone: '聲音複製',
        voiceCloneHint: '從音訊樣本複製聲音',
        recordVoice: '錄製聲音',
        orUploadFile: '或上傳檔案',
        clonedVoices: '已複製的聲音',
        
        // RAG 知識庫
        ragEnabled: '啟用 RAG',
        ragHint: '啟用 RAG 增強 AI 知識',
        telegramRagTitle: 'Telegram RAG',
        telegramRagHint: '自動從聊天歷史學習',
        totalKnowledge: '總知識量',
        qaLearned: '學習的問答',
        scriptsLearned: '學習的話術',
        totalUses: '總使用次數',
        ragSystemOffline: 'RAG 系統離線',
        vectorDb: '向量庫',
        embedding: '嵌入模型',
        initRagSystem: '初始化 RAG',
        learnFromChats: '從聊天學習',
        reindexHighValue: '重建高價值索引',
        cleanupRag: '清理 RAG',
        refreshStats: '重新整理統計',
        searchRagPlaceholder: '搜尋知識...',
        addManualKnowledge: '手動新增知識',
        
        // A/B 測試
        abTesting: 'A/B 測試',
        abTestingHint: '測試不同的訊息範本',
        templateName: '範本名稱',
        prompt: '提示語',
        saveTemplate: '儲存範本',
        
        // 分析
        analyticsTitle: '效能分析',
        allCampaigns: '所有活動',
        last7Days: '過去 7 天',
        
        // 設定
        settingsTitle: '設定',
        settingsAutoSaveHint: '設定會自動儲存',
        localAiConfiguration: '本地 AI 設定',
        
        // 通用
        save: '儲存',
        cancel: '取消',
        delete: '刪除',
        edit: '編輯',
        remove: '移除',
        close: '關閉',
        confirm: '確認',
        search: '搜尋',
        loading: '載入中...',
        success: '成功',
        error: '錯誤',
        warning: '警告',
        refresh: '重新整理',
        
        // 狀態
        'Online': '線上',
        'Offline': '離線',
        'Recently': '最近線上',
        'Unknown': '未知',
        'Listener': '監控號',
        'Sender': '發送號',
        'Explorer': '探索號',
        'AI': 'AI號',
        'Backup': '備用號',
        'Unassigned': '未分配',
        'Banned': '已封禁',
        'Warming Up': '預熱中',
      }
    };
    return flatTranslations[locale]?.[key];
  }
  
  /**
   * 獲取嵌套值
   */
  private getNestedValue(obj: any, key: string): any {
    if (!key || typeof key !== 'string') return undefined;
    return key.split('.').reduce((o, k) => o?.[k], obj);
  }
  
  // ============ 語言包定義 ============
  
  private async getEnglishTranslations(): Promise<Translations> {
    return {
      // 通用
      common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        add: 'Add',
        close: 'Close',
        confirm: 'Confirm',
        search: 'Search',
        loading: 'Loading...',
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info',
        yes: 'Yes',
        no: 'No',
        all: 'All',
        none: 'None',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        submit: 'Submit',
        reset: 'Reset',
        refresh: 'Refresh',
        export: 'Export',
        import: 'Import',
        download: 'Download',
        upload: 'Upload',
        copy: 'Copy',
        paste: 'Paste',
        select: 'Select',
        selectAll: 'Select All',
        view: 'View',
        more: 'More',
        less: 'Less',
        expand: 'Expand',
        collapse: 'Collapse',
        enable: 'Enable',
        disable: 'Disable',
        enabled: 'Enabled',
        disabled: 'Disabled',
        active: 'Active',
        inactive: 'Inactive',
        online: 'Online',
        offline: 'Offline',
        status: 'Status',
        action: 'Action',
        actions: 'Actions',
        name: 'Name',
        description: 'Description',
        type: 'Type',
        date: 'Date',
        time: 'Time',
        created: 'Created',
        updated: 'Updated',
        total: 'Total',
        count: 'Count',
        amount: 'Amount',
        price: 'Price',
        free: 'Free'
      },
      
      // 導航菜單
      menu: {
        dashboard: 'Dashboard',
        accounts: 'Accounts',
        resources: 'Resources',
        automation: 'Automation',
        leads: 'Leads',
        ads: 'Ads',
        userTracking: 'User Tracking',
        campaigns: 'Campaigns',
        multiRole: 'Multi-Role',
        aiCenter: 'AI Center',
        monitoring: 'Monitoring',
        alerts: 'Alerts',
        settings: 'Settings',
        analytics: 'Analytics',
        logs: 'Logs',
        performance: 'Performance'
      },
      
      // 儀表板
      dashboard: {
        title: 'Dashboard',
        welcome: 'Welcome to TG-AI智控王',
        totalAccounts: 'Total Accounts',
        activeAccounts: 'Active Accounts',
        totalLeads: 'Total Leads',
        newLeadsToday: 'New Leads Today',
        messagesent: 'Messages Sent',
        aiCalls: 'AI Calls',
        conversionRate: 'Conversion Rate',
        recentActivity: 'Recent Activity',
        quickActions: 'Quick Actions'
      },
      
      // 賬號管理
      accounts: {
        title: 'Account Management',
        addAccount: 'Add Account',
        importSession: 'Import Session',
        exportSession: 'Export Session',
        phoneNumber: 'Phone Number',
        username: 'Username',
        status: 'Status',
        lastActive: 'Last Active',
        proxy: 'Proxy',
        noProxy: 'No Proxy',
        connected: 'Connected',
        disconnected: 'Disconnected',
        connecting: 'Connecting...',
        loginRequired: 'Login Required',
        banned: 'Banned',
        limited: 'Limited',
        apiId: 'API ID',
        apiHash: 'API Hash',
        sessionFile: 'Session File',
        connectionTest: 'Test Connection',
        deleteConfirm: 'Are you sure you want to delete this account?'
      },
      
      // 潛在客戶
      leads: {
        title: 'Lead Management',
        newLead: 'New Lead',
        allLeads: 'All Leads',
        hotLeads: 'Hot Leads',
        contacted: 'Contacted',
        followUp: 'Follow Up',
        converted: 'Converted',
        lost: 'Lost',
        source: 'Source',
        lastContact: 'Last Contact',
        notes: 'Notes',
        sendMessage: 'Send Message',
        viewHistory: 'View History',
        addNote: 'Add Note',
        markAsHot: 'Mark as Hot',
        assignTo: 'Assign To',
        kanbanView: 'Kanban View',
        listView: 'List View'
      },
      
      // AI 中心
      aiCenter: {
        title: 'AI Center',
        provider: 'AI Provider',
        apiKey: 'API Key',
        model: 'Model',
        testConnection: 'Test Connection',
        persona: 'AI Persona',
        personaDescription: 'Define how AI should respond',
        knowledgeBase: 'Knowledge Base',
        addKnowledge: 'Add Knowledge',
        ragEnabled: 'RAG Enabled',
        temperature: 'Temperature',
        maxTokens: 'Max Tokens',
        generateMessage: 'Generate Message',
        generatedMessage: 'Generated Message',
        regenerate: 'Regenerate',
        applyMessage: 'Apply Message'
      },
      
      // 自動化
      automation: {
        title: 'Automation',
        createCampaign: 'Create Campaign',
        activeCampaigns: 'Active Campaigns',
        pausedCampaigns: 'Paused Campaigns',
        completedCampaigns: 'Completed Campaigns',
        trigger: 'Trigger',
        action: 'Action',
        condition: 'Condition',
        schedule: 'Schedule',
        startNow: 'Start Now',
        pause: 'Pause',
        resume: 'Resume',
        stop: 'Stop',
        messagesSent: 'Messages Sent',
        successRate: 'Success Rate'
      },
      
      // 監控
      monitoring: {
        title: 'Monitoring',
        keywords: 'Keywords',
        addKeyword: 'Add Keyword',
        groups: 'Groups',
        addGroup: 'Add Group',
        capturedMessages: 'Captured Messages',
        matchedKeywords: 'Matched Keywords',
        monitoringActive: 'Monitoring Active',
        monitoringPaused: 'Monitoring Paused'
      },
      
      // 設置
      settings: {
        title: 'Settings',
        general: 'General',
        appearance: 'Appearance',
        language: 'Language',
        theme: 'Theme',
        darkMode: 'Dark Mode',
        lightMode: 'Light Mode',
        notifications: 'Notifications',
        enableNotifications: 'Enable Notifications',
        soundEnabled: 'Sound Enabled',
        backup: 'Backup',
        createBackup: 'Create Backup',
        restoreBackup: 'Restore Backup',
        autoBackup: 'Auto Backup',
        security: 'Security',
        changePassword: 'Change Password',
        twoFactorAuth: 'Two-Factor Auth',
        about: 'About',
        version: 'Version',
        checkUpdate: 'Check for Updates',
        license: 'License',
        help: 'Help'
      },
      
      // 會員
      membership: {
        title: 'Membership',
        currentPlan: 'Current Plan',
        upgrade: 'Upgrade',
        free: 'Free',
        vip: 'VIP',
        svip: 'SVIP',
        mvp: 'MVP',
        newStar: 'New Star',
        silverStar: 'Silver Star',
        goldStar: 'Gold Star',
        starKing: 'Star King',
        expiresOn: 'Expires on',
        daysRemaining: '{{days}} days remaining',
        accountQuota: 'Account Quota',
        dailyMessages: 'Daily Messages',
        dailyAiCalls: 'Daily AI Calls',
        features: 'Features',
        activateCode: 'Activate Code',
        enterCode: 'Enter activation code',
        activate: 'Activate',
        inviteCode: 'Invite Code',
        inviteFriends: 'Invite Friends',
        earnRewards: 'Earn Rewards'
      },
      
      // 支付
      payment: {
        title: 'Payment',
        selectPlan: 'Select Plan',
        selectPayment: 'Select Payment Method',
        alipay: 'Alipay',
        wechat: 'WeChat Pay',
        stripe: 'Credit Card',
        usdt: 'USDT',
        amount: 'Amount',
        orderNumber: 'Order Number',
        payNow: 'Pay Now',
        scanToPay: 'Scan to Pay',
        paymentPending: 'Payment Pending',
        paymentSuccess: 'Payment Successful',
        paymentFailed: 'Payment Failed',
        retry: 'Retry'
      },
      
      // 備份
      backup: {
        title: 'Backup Management',
        createBackup: 'Create Backup',
        restoreBackup: 'Restore Backup',
        exportBackup: 'Export Backup',
        importBackup: 'Import Backup',
        autoBackup: 'Auto Backup',
        backupList: 'Backup List',
        backupName: 'Backup Name',
        backupDate: 'Backup Date',
        backupSize: 'Size',
        noBackups: 'No backups found',
        restoreConfirm: 'Are you sure you want to restore this backup? Current data will be replaced.',
        deleteConfirm: 'Are you sure you want to delete this backup?'
      },
      
      // 新手引導
      onboarding: {
        welcome: 'Welcome to TG-AI智控王',
        welcomeDesc: 'Powerful Telegram marketing automation tool',
        addAccount: 'Add Your First Account',
        addAccountDesc: 'Connect your Telegram account to get started',
        setupKeywords: 'Set Up Keywords',
        setupKeywordsDesc: 'Configure keywords to capture potential leads',
        configureAi: 'Configure AI Assistant',
        configureAiDesc: 'Set up AI for intelligent auto-replies',
        upgradeMembership: 'Unlock More Features',
        upgradeMembershipDesc: 'Upgrade membership for full access',
        ready: 'You are ready!',
        readyDesc: 'Start your marketing journey now',
        skip: 'Skip Tutorial',
        next: 'Next',
        previous: 'Previous',
        getStarted: 'Get Started 🚀'
      },
      
      // 錯誤消息
      errors: {
        networkError: 'Network connection failed. Please check your connection.',
        serverError: 'Server error. Please try again later.',
        validationError: 'Validation failed. Please check your input.',
        unauthorized: 'Session expired. Please login again.',
        forbidden: 'You do not have permission to perform this action.',
        notFound: 'Resource not found.',
        unknown: 'An unknown error occurred.'
      },
      
      // 成功消息
      success: {
        saved: 'Saved successfully',
        deleted: 'Deleted successfully',
        updated: 'Updated successfully',
        copied: 'Copied to clipboard',
        exported: 'Exported successfully',
        imported: 'Imported successfully',
        sent: 'Sent successfully',
        activated: 'Activated successfully'
      }
    };
  }
  
  private async getSimplifiedChineseTranslations(): Promise<Translations> {
    return {
      // 通用
      common: {
        save: '保存',
        cancel: '取消',
        delete: '删除',
        edit: '编辑',
        add: '添加',
        close: '关闭',
        confirm: '确认',
        search: '搜索',
        loading: '加载中...',
        success: '成功',
        error: '错误',
        warning: '警告',
        info: '提示',
        yes: '是',
        no: '否',
        all: '全部',
        none: '无',
        back: '返回',
        next: '下一步',
        previous: '上一步',
        submit: '提交',
        reset: '重置',
        refresh: '刷新',
        export: '导出',
        import: '导入',
        download: '下载',
        upload: '上传',
        copy: '复制',
        paste: '粘贴',
        select: '选择',
        selectAll: '全选',
        view: '查看',
        more: '更多',
        less: '收起',
        expand: '展开',
        collapse: '折叠',
        enable: '启用',
        disable: '禁用',
        enabled: '已启用',
        disabled: '已禁用',
        active: '活跃',
        inactive: '不活跃',
        online: '在线',
        offline: '离线',
        status: '状态',
        action: '操作',
        actions: '操作',
        name: '名称',
        description: '描述',
        type: '类型',
        date: '日期',
        time: '时间',
        created: '创建时间',
        updated: '更新时间',
        total: '总计',
        count: '数量',
        amount: '金额',
        price: '价格',
        free: '免费'
      },
      
      // 导航菜单
      menu: {
        dashboard: '仪表板',
        accounts: '账号管理',
        resources: '资源管理',
        automation: '自动化',
        leads: '潜在客户',
        ads: '广告投放',
        userTracking: '用户追踪',
        campaigns: '营销活动',
        multiRole: '多角色',
        aiCenter: 'AI 中心',
        monitoring: '监控',
        alerts: '告警',
        settings: '设置',
        analytics: '分析',
        logs: '日志',
        performance: '性能'
      },
      
      // 仪表板
      dashboard: {
        title: '仪表板',
        welcome: '欢迎使用 TG-AI智控王',
        totalAccounts: '总账号数',
        activeAccounts: '活跃账号',
        totalLeads: '总潜在客户',
        newLeadsToday: '今日新增',
        messagesent: '已发送消息',
        aiCalls: 'AI 调用次数',
        conversionRate: '转化率',
        recentActivity: '最近活动',
        quickActions: '快捷操作'
      },
      
      // 账号管理
      accounts: {
        title: '账号管理',
        addAccount: '添加账号',
        importSession: '导入 Session',
        exportSession: '导出 Session',
        phoneNumber: '手机号',
        username: '用户名',
        status: '状态',
        lastActive: '最后活跃',
        proxy: '代理',
        noProxy: '无代理',
        connected: '已连接',
        disconnected: '已断开',
        connecting: '连接中...',
        loginRequired: '需要登录',
        banned: '已封禁',
        limited: '受限',
        apiId: 'API ID',
        apiHash: 'API Hash',
        sessionFile: 'Session 文件',
        connectionTest: '测试连接',
        deleteConfirm: '确定要删除这个账号吗？'
      },
      
      // 潜在客户
      leads: {
        title: '潜在客户管理',
        newLead: '新客户',
        allLeads: '全部客户',
        hotLeads: '热门客户',
        contacted: '已联系',
        followUp: '待跟进',
        converted: '已转化',
        lost: '已流失',
        source: '来源',
        lastContact: '最后联系',
        notes: '备注',
        sendMessage: '发送消息',
        viewHistory: '查看历史',
        addNote: '添加备注',
        markAsHot: '标记为热门',
        assignTo: '分配给',
        kanbanView: '看板视图',
        listView: '列表视图'
      },
      
      // AI 中心
      aiCenter: {
        title: 'AI 中心',
        provider: 'AI 提供商',
        apiKey: 'API 密钥',
        model: '模型',
        testConnection: '测试连接',
        persona: 'AI 人设',
        personaDescription: '定义 AI 如何回复',
        knowledgeBase: '知识库',
        addKnowledge: '添加知识',
        ragEnabled: 'RAG 已启用',
        temperature: '温度',
        maxTokens: '最大 Token',
        generateMessage: '生成消息',
        generatedMessage: '生成的消息',
        regenerate: '重新生成',
        applyMessage: '应用消息'
      },
      
      // 自动化
      automation: {
        title: '自动化',
        createCampaign: '创建活动',
        activeCampaigns: '进行中的活动',
        pausedCampaigns: '已暂停的活动',
        completedCampaigns: '已完成的活动',
        trigger: '触发器',
        action: '动作',
        condition: '条件',
        schedule: '计划',
        startNow: '立即开始',
        pause: '暂停',
        resume: '恢复',
        stop: '停止',
        messagesSent: '已发送消息',
        successRate: '成功率'
      },
      
      // 监控
      monitoring: {
        title: '监控',
        keywords: '关键词',
        addKeyword: '添加关键词',
        groups: '群组',
        addGroup: '添加群组',
        capturedMessages: '捕获的消息',
        matchedKeywords: '匹配的关键词',
        monitoringActive: '监控中',
        monitoringPaused: '监控已暂停'
      },
      
      // 设置
      settings: {
        title: '设置',
        general: '通用',
        appearance: '外观',
        language: '语言',
        theme: '主题',
        darkMode: '深色模式',
        lightMode: '浅色模式',
        notifications: '通知',
        enableNotifications: '启用通知',
        soundEnabled: '启用声音',
        backup: '备份',
        createBackup: '创建备份',
        restoreBackup: '恢复备份',
        autoBackup: '自动备份',
        security: '安全',
        changePassword: '修改密码',
        twoFactorAuth: '两步验证',
        about: '关于',
        version: '版本',
        checkUpdate: '检查更新',
        license: '许可证',
        help: '帮助'
      },
      
      // 会员
      membership: {
        title: '会员',
        currentPlan: '当前方案',
        upgrade: '升级',
        free: '免费版',
        vip: 'VIP',
        svip: 'SVIP',
        mvp: 'MVP',
        newStar: '新星',
        silverStar: '银星',
        goldStar: '金星',
        starKing: '星王',
        expiresOn: '到期时间',
        daysRemaining: '剩余 {{days}} 天',
        accountQuota: '账号配额',
        dailyMessages: '每日消息',
        dailyAiCalls: '每日 AI 调用',
        features: '功能',
        activateCode: '激活码',
        enterCode: '输入激活码',
        activate: '激活',
        inviteCode: '邀请码',
        inviteFriends: '邀请好友',
        earnRewards: '赚取奖励'
      },
      
      // 支付
      payment: {
        title: '支付',
        selectPlan: '选择方案',
        selectPayment: '选择支付方式',
        alipay: '支付宝',
        wechat: '微信支付',
        stripe: '信用卡',
        usdt: 'USDT',
        amount: '金额',
        orderNumber: '订单号',
        payNow: '立即支付',
        scanToPay: '扫码支付',
        paymentPending: '等待支付',
        paymentSuccess: '支付成功',
        paymentFailed: '支付失败',
        retry: '重试'
      },
      
      // 备份
      backup: {
        title: '备份管理',
        createBackup: '创建备份',
        restoreBackup: '恢复备份',
        exportBackup: '导出备份',
        importBackup: '导入备份',
        autoBackup: '自动备份',
        backupList: '备份列表',
        backupName: '备份名称',
        backupDate: '备份日期',
        backupSize: '大小',
        noBackups: '暂无备份',
        restoreConfirm: '确定要恢复此备份吗？当前数据将被替换。',
        deleteConfirm: '确定要删除此备份吗？'
      },
      
      // 新手引导
      onboarding: {
        welcome: '欢迎使用 TG-AI智控王',
        welcomeDesc: '强大的 Telegram 营销自动化工具',
        addAccount: '添加您的第一个账号',
        addAccountDesc: '连接 Telegram 账号开始使用',
        setupKeywords: '设置监控关键词',
        setupKeywordsDesc: '配置关键词捕获潜在客户',
        configureAi: '配置 AI 助手',
        configureAiDesc: '设置 AI 实现智能回复',
        upgradeMembership: '解锁更多功能',
        upgradeMembershipDesc: '升级会员享受完整功能',
        ready: '准备就绪！',
        readyDesc: '开始您的营销之旅',
        skip: '跳过教程',
        next: '下一步',
        previous: '上一步',
        getStarted: '开始使用 🚀'
      },
      
      // 错误消息
      errors: {
        networkError: '网络连接失败，请检查网络设置',
        serverError: '服务器错误，请稍后重试',
        validationError: '验证失败，请检查输入',
        unauthorized: '会话已过期，请重新登录',
        forbidden: '您没有权限执行此操作',
        notFound: '资源未找到',
        unknown: '发生未知错误'
      },
      
      // 成功消息
      success: {
        saved: '保存成功',
        deleted: '删除成功',
        updated: '更新成功',
        copied: '已复制到剪贴板',
        exported: '导出成功',
        imported: '导入成功',
        sent: '发送成功',
        activated: '激活成功'
      }
    };
  }
  
  private async getTraditionalChineseTranslations(): Promise<Translations> {
    return {
      // 通用
      common: {
        save: '儲存',
        cancel: '取消',
        delete: '刪除',
        edit: '編輯',
        add: '新增',
        close: '關閉',
        confirm: '確認',
        search: '搜尋',
        loading: '載入中...',
        success: '成功',
        error: '錯誤',
        warning: '警告',
        info: '提示',
        yes: '是',
        no: '否',
        all: '全部',
        none: '無',
        back: '返回',
        next: '下一步',
        previous: '上一步',
        submit: '提交',
        reset: '重置',
        refresh: '重新整理',
        export: '匯出',
        import: '匯入',
        download: '下載',
        upload: '上傳',
        copy: '複製',
        paste: '貼上',
        select: '選擇',
        selectAll: '全選',
        view: '檢視',
        more: '更多',
        less: '收起',
        expand: '展開',
        collapse: '收合',
        enable: '啟用',
        disable: '停用',
        enabled: '已啟用',
        disabled: '已停用',
        active: '活躍',
        inactive: '不活躍',
        online: '線上',
        offline: '離線',
        status: '狀態',
        action: '操作',
        actions: '操作',
        name: '名稱',
        description: '描述',
        type: '類型',
        date: '日期',
        time: '時間',
        created: '建立時間',
        updated: '更新時間',
        total: '總計',
        count: '數量',
        amount: '金額',
        price: '價格',
        free: '免費'
      },
      
      // 導航選單
      menu: {
        dashboard: '儀表板',
        accounts: '帳號管理',
        resources: '資源管理',
        automation: '自動化',
        leads: '潛在客戶',
        ads: '廣告投放',
        userTracking: '用戶追蹤',
        campaigns: '行銷活動',
        multiRole: '多角色',
        aiCenter: 'AI 中心',
        monitoring: '監控',
        alerts: '告警',
        settings: '設定',
        analytics: '分析',
        logs: '日誌',
        performance: '效能'
      },
      
      // 儀表板
      dashboard: {
        title: '儀表板',
        welcome: '歡迎使用 TG-AI智控王',
        totalAccounts: '總帳號數',
        activeAccounts: '活躍帳號',
        totalLeads: '總潛在客戶',
        newLeadsToday: '今日新增',
        messagesent: '已發送訊息',
        aiCalls: 'AI 呼叫次數',
        conversionRate: '轉換率',
        recentActivity: '最近活動',
        quickActions: '快捷操作'
      },
      
      // 帳號管理
      accounts: {
        title: '帳號管理',
        addAccount: '新增帳號',
        importSession: '匯入 Session',
        exportSession: '匯出 Session',
        phoneNumber: '手機號碼',
        username: '使用者名稱',
        status: '狀態',
        lastActive: '最後活躍',
        proxy: '代理',
        noProxy: '無代理',
        connected: '已連線',
        disconnected: '已斷線',
        connecting: '連線中...',
        loginRequired: '需要登入',
        banned: '已封禁',
        limited: '受限',
        apiId: 'API ID',
        apiHash: 'API Hash',
        sessionFile: 'Session 檔案',
        connectionTest: '測試連線',
        deleteConfirm: '確定要刪除此帳號嗎？'
      },
      
      // 潛在客戶
      leads: {
        title: '潛在客戶管理',
        newLead: '新客戶',
        allLeads: '全部客戶',
        hotLeads: '熱門客戶',
        contacted: '已聯繫',
        followUp: '待跟進',
        converted: '已轉換',
        lost: '已流失',
        source: '來源',
        lastContact: '最後聯繫',
        notes: '備註',
        sendMessage: '發送訊息',
        viewHistory: '檢視歷史',
        addNote: '新增備註',
        markAsHot: '標記為熱門',
        assignTo: '分配給',
        kanbanView: '看板檢視',
        listView: '清單檢視'
      },
      
      // AI 中心
      aiCenter: {
        title: 'AI 中心',
        provider: 'AI 提供商',
        apiKey: 'API 金鑰',
        model: '模型',
        testConnection: '測試連線',
        persona: 'AI 人設',
        personaDescription: '定義 AI 如何回覆',
        knowledgeBase: '知識庫',
        addKnowledge: '新增知識',
        ragEnabled: 'RAG 已啟用',
        temperature: '溫度',
        maxTokens: '最大 Token',
        generateMessage: '產生訊息',
        generatedMessage: '產生的訊息',
        regenerate: '重新產生',
        applyMessage: '套用訊息'
      },
      
      // 自動化
      automation: {
        title: '自動化',
        createCampaign: '建立活動',
        activeCampaigns: '進行中的活動',
        pausedCampaigns: '已暫停的活動',
        completedCampaigns: '已完成的活動',
        trigger: '觸發器',
        action: '動作',
        condition: '條件',
        schedule: '排程',
        startNow: '立即開始',
        pause: '暫停',
        resume: '恢復',
        stop: '停止',
        messagesSent: '已發送訊息',
        successRate: '成功率'
      },
      
      // 監控
      monitoring: {
        title: '監控',
        keywords: '關鍵字',
        addKeyword: '新增關鍵字',
        groups: '群組',
        addGroup: '新增群組',
        capturedMessages: '擷取的訊息',
        matchedKeywords: '符合的關鍵字',
        monitoringActive: '監控中',
        monitoringPaused: '監控已暫停'
      },
      
      // 設定
      settings: {
        title: '設定',
        general: '一般',
        appearance: '外觀',
        language: '語言',
        theme: '主題',
        darkMode: '深色模式',
        lightMode: '淺色模式',
        notifications: '通知',
        enableNotifications: '啟用通知',
        soundEnabled: '啟用音效',
        backup: '備份',
        createBackup: '建立備份',
        restoreBackup: '還原備份',
        autoBackup: '自動備份',
        security: '安全性',
        changePassword: '變更密碼',
        twoFactorAuth: '兩步驟驗證',
        about: '關於',
        version: '版本',
        checkUpdate: '檢查更新',
        license: '授權',
        help: '說明'
      },
      
      // 會員
      membership: {
        title: '會員',
        currentPlan: '目前方案',
        upgrade: '升級',
        free: '免費版',
        vip: 'VIP',
        svip: 'SVIP',
        mvp: 'MVP',
        newStar: '新星',
        silverStar: '銀星',
        goldStar: '金星',
        starKing: '星王',
        expiresOn: '到期時間',
        daysRemaining: '剩餘 {{days}} 天',
        accountQuota: '帳號配額',
        dailyMessages: '每日訊息',
        dailyAiCalls: '每日 AI 呼叫',
        features: '功能',
        activateCode: '啟用碼',
        enterCode: '輸入啟用碼',
        activate: '啟用',
        inviteCode: '邀請碼',
        inviteFriends: '邀請好友',
        earnRewards: '賺取獎勵'
      },
      
      // 支付
      payment: {
        title: '付款',
        selectPlan: '選擇方案',
        selectPayment: '選擇付款方式',
        alipay: '支付寶',
        wechat: '微信支付',
        stripe: '信用卡',
        usdt: 'USDT',
        amount: '金額',
        orderNumber: '訂單編號',
        payNow: '立即付款',
        scanToPay: '掃碼付款',
        paymentPending: '等待付款',
        paymentSuccess: '付款成功',
        paymentFailed: '付款失敗',
        retry: '重試'
      },
      
      // 備份
      backup: {
        title: '備份管理',
        createBackup: '建立備份',
        restoreBackup: '還原備份',
        exportBackup: '匯出備份',
        importBackup: '匯入備份',
        autoBackup: '自動備份',
        backupList: '備份清單',
        backupName: '備份名稱',
        backupDate: '備份日期',
        backupSize: '大小',
        noBackups: '暫無備份',
        restoreConfirm: '確定要還原此備份嗎？目前資料將被取代。',
        deleteConfirm: '確定要刪除此備份嗎？'
      },
      
      // 新手引導
      onboarding: {
        welcome: '歡迎使用 TG-AI智控王',
        welcomeDesc: '強大的 Telegram 行銷自動化工具',
        addAccount: '新增您的第一個帳號',
        addAccountDesc: '連結 Telegram 帳號開始使用',
        setupKeywords: '設定監控關鍵字',
        setupKeywordsDesc: '設定關鍵字擷取潛在客戶',
        configureAi: '設定 AI 助手',
        configureAiDesc: '設定 AI 實現智慧回覆',
        upgradeMembership: '解鎖更多功能',
        upgradeMembershipDesc: '升級會員享受完整功能',
        ready: '準備就緒！',
        readyDesc: '開始您的行銷之旅',
        skip: '跳過教學',
        next: '下一步',
        previous: '上一步',
        getStarted: '開始使用 🚀'
      },
      
      // 錯誤訊息
      errors: {
        networkError: '網路連線失敗，請檢查網路設定',
        serverError: '伺服器錯誤，請稍後重試',
        validationError: '驗證失敗，請檢查輸入',
        unauthorized: '工作階段已過期，請重新登入',
        forbidden: '您沒有權限執行此操作',
        notFound: '資源未找到',
        unknown: '發生未知錯誤'
      },
      
      // 成功訊息
      success: {
        saved: '儲存成功',
        deleted: '刪除成功',
        updated: '更新成功',
        copied: '已複製到剪貼簿',
        exported: '匯出成功',
        imported: '匯入成功',
        sent: '發送成功',
        activated: '啟用成功'
      }
    };
  }
}
