/**
 * TG-Matrix Membership Service
 * 「王者榮耀」風格會員等級系統
 * 
 * 會員等級：
 * ⚔️ 青銅戰士 (Bronze) - 免費體驗
 * 🥈 白銀精英 (Silver) - 個人入門
 * 🥇 黃金大師 (Gold) - 個人進階
 * 💎 鑽石王牌 (Diamond) - 專業用戶
 * 🌟 星耀傳說 (Star) - 團隊用戶
 * 👑 榮耀王者 (King) - 無限尊享
 */
import { Injectable, signal, computed, WritableSignal, inject } from '@angular/core';

// ============ 類型定義 ============

export type MembershipLevel = 'bronze' | 'silver' | 'gold' | 'diamond' | 'star' | 'king';

export interface MembershipInfo {
  level: MembershipLevel;
  levelName: string;
  levelIcon: string;
  expiresAt?: Date;
  activatedAt?: Date;
  licenseKey?: string;
  email?: string;
  machineId: string;
  // 用量統計
  usage: UsageStats;
  // 邀請信息
  inviteCode: string;
  invitedBy?: string;
  inviteCount: number;
  inviteRewards: number; // 累計邀請獎勵天數
}

export interface UsageStats {
  // 今日使用
  todayMessages: number;
  todayAiCalls: number;
  todayDate: string;
  // 總計使用
  totalMessages: number;
  totalAiCalls: number;
  totalLeads: number;
}

export interface Quotas {
  maxAccounts: number;
  dailyMessages: number;
  dailyAiCalls: number;
  maxGroups: number;
  maxKeywordSets: number;
  dataRetentionDays: number;
}

export interface FeatureAccess {
  // 基礎功能
  accountManagement: boolean;
  keywordMonitoring: boolean;
  leadCapture: boolean;
  // VIP 功能
  aiAutoReply: boolean;
  adBroadcast: boolean;
  dataExport: boolean;
  batchOperations: boolean;
  // SVIP 功能
  multiRole: boolean;
  aiSalesFunnel: boolean;
  advancedAnalytics: boolean;
  smartAntiBlock: boolean;
  // MVP 功能
  apiAccess: boolean;
  teamManagement: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
}

export interface PricingPlan {
  level: MembershipLevel;
  name: string;
  icon: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  quotas: Quotas;
  recommended?: boolean;
}

// ============ 會員配置（王者榮耀風格）============

const MEMBERSHIP_CONFIG: Record<MembershipLevel, {
  name: string;
  icon: string;
  rank: number;
  quotas: Quotas;
  features: FeatureAccess;
  monthlyPrice: number;
  yearlyPrice: number;
}> = {
  bronze: {
    name: '青銅戰士',
    icon: '⚔️',
    rank: 1,
    monthlyPrice: 0,
    yearlyPrice: 0,
    quotas: {
      maxAccounts: 2,
      dailyMessages: 20,
      dailyAiCalls: 10,
      maxGroups: 3,
      maxKeywordSets: 1,
      dataRetentionDays: 7
    },
    features: {
      accountManagement: true,
      keywordMonitoring: true,
      leadCapture: true,
      aiAutoReply: true,
      adBroadcast: false,
      dataExport: false,
      batchOperations: false,
      multiRole: false,
      aiSalesFunnel: false,
      advancedAnalytics: false,
      smartAntiBlock: false,
      apiAccess: false,
      teamManagement: false,
      customBranding: false,
      prioritySupport: false
    }
  },
  silver: {
    name: '白銀精英',
    icon: '🥈',
    rank: 2,
    monthlyPrice: 49,
    yearlyPrice: 399,
    quotas: {
      maxAccounts: 5,
      dailyMessages: 100,
      dailyAiCalls: 50,
      maxGroups: 10,
      maxKeywordSets: 3,
      dataRetentionDays: 15
    },
    features: {
      accountManagement: true,
      keywordMonitoring: true,
      leadCapture: true,
      aiAutoReply: true,
      adBroadcast: true,
      dataExport: false,
      batchOperations: false,
      multiRole: false,
      aiSalesFunnel: false,
      advancedAnalytics: false,
      smartAntiBlock: false,
      apiAccess: false,
      teamManagement: false,
      customBranding: false,
      prioritySupport: false
    }
  },
  gold: {
    name: '黃金大師',
    icon: '🥇',
    rank: 3,
    monthlyPrice: 99,
    yearlyPrice: 799,
    quotas: {
      maxAccounts: 10,
      dailyMessages: 300,
      dailyAiCalls: 200,
      maxGroups: 30,
      maxKeywordSets: 10,
      dataRetentionDays: 30
    },
    features: {
      accountManagement: true,
      keywordMonitoring: true,
      leadCapture: true,
      aiAutoReply: true,
      adBroadcast: true,
      dataExport: true,
      batchOperations: true,
      multiRole: false,
      aiSalesFunnel: false,
      advancedAnalytics: false,
      smartAntiBlock: false,
      apiAccess: false,
      teamManagement: false,
      customBranding: false,
      prioritySupport: false
    }
  },
  diamond: {
    name: '鑽石王牌',
    icon: '💎',
    rank: 4,
    monthlyPrice: 199,
    yearlyPrice: 1599,
    quotas: {
      maxAccounts: 20,
      dailyMessages: 1000,
      dailyAiCalls: -1,
      maxGroups: 100,
      maxKeywordSets: -1,
      dataRetentionDays: 60
    },
    features: {
      accountManagement: true,
      keywordMonitoring: true,
      leadCapture: true,
      aiAutoReply: true,
      adBroadcast: true,
      dataExport: true,
      batchOperations: true,
      multiRole: true,
      aiSalesFunnel: true,
      advancedAnalytics: true,
      smartAntiBlock: false,
      apiAccess: false,
      teamManagement: false,
      customBranding: false,
      prioritySupport: false
    }
  },
  star: {
    name: '星耀傳說',
    icon: '🌟',
    rank: 5,
    monthlyPrice: 399,
    yearlyPrice: 2999,
    quotas: {
      maxAccounts: 50,
      dailyMessages: -1,
      dailyAiCalls: -1,
      maxGroups: -1,
      maxKeywordSets: -1,
      dataRetentionDays: 180
    },
    features: {
      accountManagement: true,
      keywordMonitoring: true,
      leadCapture: true,
      aiAutoReply: true,
      adBroadcast: true,
      dataExport: true,
      batchOperations: true,
      multiRole: true,
      aiSalesFunnel: true,
      advancedAnalytics: true,
      smartAntiBlock: true,
      apiAccess: false,
      teamManagement: true,
      customBranding: false,
      prioritySupport: true
    }
  },
  king: {
    name: '榮耀王者',
    icon: '👑',
    rank: 6,
    monthlyPrice: 999,
    yearlyPrice: 6999,
    quotas: {
      maxAccounts: -1,
      dailyMessages: -1,
      dailyAiCalls: -1,
      maxGroups: -1,
      maxKeywordSets: -1,
      dataRetentionDays: 365
    },
    features: {
      accountManagement: true,
      keywordMonitoring: true,
      leadCapture: true,
      aiAutoReply: true,
      adBroadcast: true,
      dataExport: true,
      batchOperations: true,
      multiRole: true,
      aiSalesFunnel: true,
      advancedAnalytics: true,
      smartAntiBlock: true,
      apiAccess: true,
      teamManagement: true,
      customBranding: true,
      prioritySupport: true
    }
  }
};

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class MembershipService {
  private static readonly STORAGE_KEY = 'tg-matrix-membership';
  private static readonly USAGE_KEY = 'tg-matrix-usage';
  private static readonly TRIAL_DAYS = 7; // 免費試用天數
  
  // 狀態
  private _membership: WritableSignal<MembershipInfo | null> = signal(null);
  private _isLoading: WritableSignal<boolean> = signal(true);
  
  // 計算屬性
  membership = computed(() => this._membership());
  isLoading = computed(() => this._isLoading());
  
  level = computed(() => this._membership()?.level || 'bronze');
  levelName = computed(() => MEMBERSHIP_CONFIG[this.level()].name);
  levelIcon = computed(() => MEMBERSHIP_CONFIG[this.level()].icon);
  levelRank = computed(() => MEMBERSHIP_CONFIG[this.level()].rank);
  
  isActive = computed(() => {
    const m = this._membership();
    if (!m) return false;
    if (m.level === 'bronze') return true; // 青銅戰士永遠有效
    return m.expiresAt ? new Date() < m.expiresAt : false;
  });
  
  daysRemaining = computed(() => {
    const m = this._membership();
    if (!m || !m.expiresAt || m.level === 'bronze') return -1; // -1 表示永久/無限
    const diff = m.expiresAt.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  });
  
  quotas = computed<Quotas>(() => {
    const effectiveLevel = this.isActive() ? this.level() : 'bronze';
    return MEMBERSHIP_CONFIG[effectiveLevel].quotas;
  });
  
  features = computed<FeatureAccess>(() => {
    const effectiveLevel = this.isActive() ? this.level() : 'bronze';
    return MEMBERSHIP_CONFIG[effectiveLevel].features;
  });
  
  usage = computed<UsageStats>(() => {
    return this._membership()?.usage || this.getDefaultUsage();
  });
  
  constructor() {
    this.loadMembership();
  }
  
  // ============ 會員管理 ============
  
  /**
   * 加載會員信息
   */
  private loadMembership(): void {
    try {
      const stored = localStorage.getItem(MembershipService.STORAGE_KEY);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        parsed.expiresAt = parsed.expiresAt ? new Date(parsed.expiresAt) : undefined;
        parsed.activatedAt = parsed.activatedAt ? new Date(parsed.activatedAt) : undefined;
        
        // 檢查並重置每日用量
        this.checkAndResetDailyUsage(parsed);
        
        this._membership.set(parsed);
      } else {
        // 首次使用，創建免費會員
        this.initializeFreeMembership();
      }
    } catch (e) {
      console.error('Failed to load membership:', e);
      this.initializeFreeMembership();
    } finally {
      this._isLoading.set(false);
    }
  }
  
  /**
   * 初始化免費會員（青銅戰士）
   */
  private initializeFreeMembership(): void {
    const membership: MembershipInfo = {
      level: 'bronze',
      levelName: MEMBERSHIP_CONFIG.bronze.name,
      levelIcon: MEMBERSHIP_CONFIG.bronze.icon,
      activatedAt: new Date(),
      machineId: this.getMachineId(),
      usage: this.getDefaultUsage(),
      inviteCode: this.generateInviteCode(),
      inviteCount: 0,
      inviteRewards: 0
    };
    
    this.saveMembership(membership);
  }
  
  /**
   * 激活會員（王者榮耀風格）
   */
  async activateMembership(
    licenseKey: string,
    email: string
  ): Promise<{ success: boolean; message: string }> {
    // 驗證卡密格式
    // 格式: TGM-[類型]-[XXXX]-[XXXX]-[XXXX]
    // 類型: B=白銀/G=黃金/D=鑽石/S=星耀/K=王者, 1=周/2=月/3=季/Y=年
    const keyRegex = /^TGM-([BGDSK][123Y])-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
    const match = licenseKey.toUpperCase().match(keyRegex);
    
    if (!match) {
      return { success: false, message: '⚔️ 卡密格式不正確，請檢查後重試' };
    }
    
    const typeCode = match[1];
    const levelCode = typeCode[0];
    const durationCode = typeCode[1];
    
    // 解析等級
    const levelMap: Record<string, MembershipLevel> = {
      'B': 'silver',   // 白銀精英
      'G': 'gold',     // 黃金大師
      'D': 'diamond',  // 鑽石王牌
      'S': 'star',     // 星耀傳說
      'K': 'king',     // 榮耀王者
    };
    
    // 解析時長
    const durationMap: Record<string, number> = {
      '1': 7,    // 周卡
      '2': 30,   // 月卡
      '3': 90,   // 季卡
      'Y': 365,  // 年卡
    };
    
    const level = levelMap[levelCode] || 'silver';
    const durationDays = durationMap[durationCode] || 30;
    
    // TODO: 在生產環境中，這裡應該調用服務器API驗證卡密
    // const response = await this.verifyLicenseKey(licenseKey, email);
    
    // 計算到期時間
    const currentMembership = this._membership();
    let expiresAt = new Date();
    
    // 如果當前會員未過期，則在現有基礎上延長
    if (currentMembership?.expiresAt && currentMembership.expiresAt > new Date()) {
      expiresAt = new Date(currentMembership.expiresAt);
    }
    expiresAt.setDate(expiresAt.getDate() + durationDays);
    
    const config = MEMBERSHIP_CONFIG[level];
    
    const membership: MembershipInfo = {
      ...currentMembership!,
      level,
      levelName: config.name,
      levelIcon: config.icon,
      expiresAt,
      activatedAt: new Date(),
      licenseKey: licenseKey.toUpperCase(),
      email,
      machineId: this.getMachineId()
    };
    
    this.saveMembership(membership);
    
    return {
      success: true,
      message: `🎉 ${config.icon} ${config.name} 激活成功！有效期至 ${expiresAt.toLocaleDateString()}`
    };
  }
  
  /**
   * 使用邀請碼
   */
  async applyInviteCode(code: string): Promise<{ success: boolean; message: string }> {
    if (!code || code.length !== 8) {
      return { success: false, message: '邀請碼格式不正確' };
    }
    
    const currentMembership = this._membership();
    if (currentMembership?.invitedBy) {
      return { success: false, message: '您已經使用過邀請碼' };
    }
    
    // TODO: 服務器驗證邀請碼
    
    // 獎勵被邀請者：7天白銀精英
    let expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const membership: MembershipInfo = {
      ...currentMembership!,
      level: 'silver',
      levelName: MEMBERSHIP_CONFIG.silver.name,
      levelIcon: MEMBERSHIP_CONFIG.silver.icon,
      expiresAt,
      invitedBy: code
    };
    
    this.saveMembership(membership);
    
    return {
      success: true,
      message: '🎁 邀請碼使用成功！獲得 7 天白銀精英體驗'
    };
  }
  
  /**
   * 添加邀請獎勵
   */
  addInviteReward(days: number = 3): void {
    const membership = this._membership();
    if (!membership) return;
    
    // 延長會員時間
    let expiresAt = membership.expiresAt || new Date();
    if (expiresAt < new Date()) {
      expiresAt = new Date();
    }
    expiresAt.setDate(expiresAt.getDate() + days);
    
    const updated: MembershipInfo = {
      ...membership,
      expiresAt,
      inviteCount: (membership.inviteCount || 0) + 1,
      inviteRewards: (membership.inviteRewards || 0) + days
    };
    
    // 如果是青銅用戶，升級為白銀
    if (updated.level === 'bronze') {
      updated.level = 'silver';
      updated.levelName = MEMBERSHIP_CONFIG.silver.name;
      updated.levelIcon = MEMBERSHIP_CONFIG.silver.icon;
    }
    
    this.saveMembership(updated);
  }
  
  // ============ 配額管理 ============
  
  /**
   * 檢查是否可以添加賬戶
   */
  canAddAccount(currentCount: number): { allowed: boolean; message?: string } {
    const maxAccounts = this.quotas().maxAccounts;
    if (maxAccounts === -1) return { allowed: true };
    
    if (currentCount >= maxAccounts) {
      return {
        allowed: false,
        message: `${this.levelIcon()} ${this.levelName()} 最多支持 ${maxAccounts} 個賬戶，升級解鎖更多`
      };
    }
    return { allowed: true };
  }
  
  /**
   * 檢查是否可以發送消息
   */
  canSendMessage(): { allowed: boolean; remaining: number; message?: string } {
    const daily = this.quotas().dailyMessages;
    if (daily === -1) return { allowed: true, remaining: -1 };
    
    const usage = this.usage();
    const remaining = daily - usage.todayMessages;
    
    if (remaining <= 0) {
      return {
        allowed: false,
        remaining: 0,
        message: `今日消息配額已用完 (${daily}條)，明天重置或升級會員`
      };
    }
    
    return { allowed: true, remaining };
  }
  
  /**
   * 檢查是否可以使用AI
   */
  canUseAi(): { allowed: boolean; remaining: number; message?: string } {
    const daily = this.quotas().dailyAiCalls;
    if (daily === -1) return { allowed: true, remaining: -1 };
    
    const usage = this.usage();
    const remaining = daily - usage.todayAiCalls;
    
    if (remaining <= 0) {
      return {
        allowed: false,
        remaining: 0,
        message: `今日AI配額已用完 (${daily}次)，明天重置或升級會員`
      };
    }
    
    return { allowed: true, remaining };
  }
  
  /**
   * 檢查功能是否可用
   */
  hasFeature(feature: keyof FeatureAccess): boolean {
    if (!this.isActive()) {
      return MEMBERSHIP_CONFIG.bronze.features[feature];
    }
    return this.features()[feature];
  }
  
  /**
   * 記錄消息發送
   */
  recordMessageSent(count: number = 1): void {
    const membership = this._membership();
    if (!membership) return;
    
    const usage = { ...membership.usage };
    usage.todayMessages += count;
    usage.totalMessages += count;
    
    this.saveMembership({ ...membership, usage });
  }
  
  /**
   * 記錄AI調用
   */
  recordAiCall(count: number = 1): void {
    const membership = this._membership();
    if (!membership) return;
    
    const usage = { ...membership.usage };
    usage.todayAiCalls += count;
    usage.totalAiCalls += count;
    
    this.saveMembership({ ...membership, usage });
  }
  
  /**
   * 記錄獲取Lead
   */
  recordLeadCaptured(count: number = 1): void {
    const membership = this._membership();
    if (!membership) return;
    
    const usage = { ...membership.usage };
    usage.totalLeads += count;
    
    this.saveMembership({ ...membership, usage });
  }
  
  // ============ 定價信息 ============
  
  /**
   * 獲取所有定價方案（王者榮耀風格）
   */
  getPricingPlans(): PricingPlan[] {
    return [
      {
        level: 'bronze',
        name: '⚔️ 青銅戰士',
        icon: '⚔️',
        monthlyPrice: 0,
        yearlyPrice: 0,
        quotas: MEMBERSHIP_CONFIG.bronze.quotas,
        features: [
          '2 個賬戶',
          '每日 20 條消息',
          '每日 10 次 AI',
          '3 個群組',
          '基礎功能體驗'
        ]
      },
      {
        level: 'silver',
        name: '🥈 白銀精英',
        icon: '🥈',
        monthlyPrice: 49,
        yearlyPrice: 399,
        quotas: MEMBERSHIP_CONFIG.silver.quotas,
        features: [
          '5 個賬戶',
          '每日 100 條消息',
          '每日 50 次 AI',
          '10 個群組',
          '廣告發送'
        ]
      },
      {
        level: 'gold',
        name: '🥇 黃金大師',
        icon: '🥇',
        monthlyPrice: 99,
        yearlyPrice: 799,
        quotas: MEMBERSHIP_CONFIG.gold.quotas,
        features: [
          '10 個賬戶',
          '每日 300 條消息',
          '每日 200 次 AI',
          '30 個群組',
          '數據導出',
          '批量操作'
        ]
      },
      {
        level: 'diamond',
        name: '💎 鑽石王牌',
        icon: '💎',
        monthlyPrice: 199,
        yearlyPrice: 1599,
        quotas: MEMBERSHIP_CONFIG.diamond.quotas,
        recommended: true,
        features: [
          '20 個賬戶',
          '每日 1000 條消息',
          '無限 AI 調用',
          '100 個群組',
          '多角色協作',
          'AI 銷售漏斗',
          '高級分析'
        ]
      },
      {
        level: 'star',
        name: '🌟 星耀傳說',
        icon: '🌟',
        monthlyPrice: 399,
        yearlyPrice: 2999,
        quotas: MEMBERSHIP_CONFIG.star.quotas,
        features: [
          '50 個賬戶',
          '無限消息',
          '無限 AI',
          '無限群組',
          '團隊管理',
          '智能防封',
          '優先支持'
        ]
      },
      {
        level: 'king',
        name: '👑 榮耀王者',
        icon: '👑',
        monthlyPrice: 999,
        yearlyPrice: 6999,
        quotas: MEMBERSHIP_CONFIG.king.quotas,
        features: [
          '無限賬戶',
          '無限一切',
          'API 接口',
          '自定義品牌',
          '1對1 專屬顧問',
          '新功能內測',
          '尊享特權'
        ]
      }
    ];
  }
  
  /**
   * 獲取升級建議（王者榮耀風格）
   */
  getUpgradeSuggestion(): { nextLevel: MembershipLevel | null; benefits: string[]; price: number } | null {
    const current = this.level();
    
    const upgradeMap: Record<MembershipLevel, MembershipLevel | null> = {
      bronze: 'silver',
      silver: 'gold',
      gold: 'diamond',
      diamond: 'star',
      star: 'king',
      king: null
    };
    
    const nextLevel = upgradeMap[current];
    if (!nextLevel) return null;
    
    const currentConfig = MEMBERSHIP_CONFIG[current];
    const nextConfig = MEMBERSHIP_CONFIG[nextLevel];
    
    const benefits: string[] = [];
    
    // 比較配額
    const currAccounts = currentConfig.quotas.maxAccounts === -1 ? '無限' : currentConfig.quotas.maxAccounts;
    const nextAccounts = nextConfig.quotas.maxAccounts === -1 ? '無限' : nextConfig.quotas.maxAccounts;
    if (nextAccounts !== currAccounts) {
      benefits.push(`賬戶數量 ${currAccounts} → ${nextAccounts}`);
    }
    
    const currMsg = currentConfig.quotas.dailyMessages === -1 ? '無限' : currentConfig.quotas.dailyMessages;
    const nextMsg = nextConfig.quotas.dailyMessages === -1 ? '無限' : nextConfig.quotas.dailyMessages;
    if (nextMsg !== currMsg) {
      benefits.push(`每日消息 ${currMsg} → ${nextMsg}`);
    }
    
    if (nextConfig.quotas.dailyAiCalls === -1 && currentConfig.quotas.dailyAiCalls !== -1) {
      benefits.push(`AI 調用 ${currentConfig.quotas.dailyAiCalls} → 無限`);
    }
    
    // 比較功能
    if (nextConfig.features.adBroadcast && !currentConfig.features.adBroadcast) {
      benefits.push('⚡ 解鎖廣告發送');
    }
    if (nextConfig.features.multiRole && !currentConfig.features.multiRole) {
      benefits.push('🎭 解鎖多角色協作');
    }
    if (nextConfig.features.aiSalesFunnel && !currentConfig.features.aiSalesFunnel) {
      benefits.push('🎯 解鎖 AI 銷售漏斗');
    }
    if (nextConfig.features.smartAntiBlock && !currentConfig.features.smartAntiBlock) {
      benefits.push('🛡️ 解鎖智能防封');
    }
    if (nextConfig.features.apiAccess && !currentConfig.features.apiAccess) {
      benefits.push('🔌 解鎖 API 接口');
    }
    
    return {
      nextLevel,
      benefits,
      price: nextConfig.monthlyPrice
    };
  }
  
  // ============ 輔助方法 ============
  
  private saveMembership(membership: MembershipInfo): void {
    this._membership.set(membership);
    localStorage.setItem(MembershipService.STORAGE_KEY, JSON.stringify(membership));
  }
  
  private getMachineId(): string {
    let machineId = localStorage.getItem('tg-matrix-machine-id');
    if (!machineId) {
      machineId = 'mid-' + this.generateId();
      localStorage.setItem('tg-matrix-machine-id', machineId);
    }
    return machineId;
  }
  
  private generateId(): string {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  private generateInviteCode(): string {
    return this.generateId().substring(0, 8).toUpperCase();
  }
  
  private getDefaultUsage(): UsageStats {
    return {
      todayMessages: 0,
      todayAiCalls: 0,
      todayDate: new Date().toDateString(),
      totalMessages: 0,
      totalAiCalls: 0,
      totalLeads: 0
    };
  }
  
  private checkAndResetDailyUsage(membership: MembershipInfo): void {
    const today = new Date().toDateString();
    if (membership.usage.todayDate !== today) {
      membership.usage.todayMessages = 0;
      membership.usage.todayAiCalls = 0;
      membership.usage.todayDate = today;
    }
  }
  
  /**
   * 獲取會員狀態顯示文字
   */
  getStatusText(): string {
    const m = this._membership();
    if (!m) return '未知';
    
    if (m.level === 'bronze') {
      return `${m.levelIcon} ${m.levelName}`;
    }
    
    if (!this.isActive()) {
      return `${m.levelIcon} ${m.levelName} (已過期)`;
    }
    
    const days = this.daysRemaining();
    if (days <= 7) {
      return `${m.levelIcon} ${m.levelName} (${days}天後到期)`;
    }
    
    return `${m.levelIcon} ${m.levelName}`;
  }
  
  /**
   * 獲取段位顯示文字（王者榮耀風格）
   */
  getRankDisplay(): { name: string; icon: string; rank: number; color: string } {
    const level = this.level();
    const config = MEMBERSHIP_CONFIG[level];
    
    const colorMap: Record<MembershipLevel, string> = {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
      diamond: '#B9F2FF',
      star: '#9B59B6',
      king: '#FF6B6B'
    };
    
    return {
      name: config.name,
      icon: config.icon,
      rank: config.rank,
      color: colorMap[level]
    };
  }
  
  /**
   * 獲取使用量百分比
   */
  getUsagePercentage(): { messages: number; ai: number } {
    const quotas = this.quotas();
    const usage = this.usage();
    
    return {
      messages: quotas.dailyMessages === -1 ? 0 : Math.min(100, (usage.todayMessages / quotas.dailyMessages) * 100),
      ai: quotas.dailyAiCalls === -1 ? 0 : Math.min(100, (usage.todayAiCalls / quotas.dailyAiCalls) * 100)
    };
  }
}
