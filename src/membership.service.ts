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
 * 
 * ============ 🔧 P2 數據源說明 ============
 * 
 * 數據源優先級：
 * 1. SaaS 模式（非 Electron）：AuthService 是唯一數據源
 *    - 會員等級從 /api/v1/auth/me 獲取
 *    - 本服務僅提供配額和功能配置查詢
 * 
 * 2. Electron 模式：本服務為主要數據源
 *    - 支持本地卡密激活
 *    - 數據存儲在 localStorage (tg-matrix-membership)
 * 
 * 重要：當需要顯示會員等級時，優先使用 AuthService.membershipLevel()
 * ==========================================
 */
import { Injectable, signal, computed, WritableSignal, inject, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthEventsService } from './core/auth-events.service';
import { AuthService } from './core/auth.service';
import { isElectronRuntime } from './utils/runtime-env.util';

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
  // 平台 API 配額（新增）
  platformApiQuota: number;        // 可使用的平台 API 數量
  platformApiMaxAccounts: number;  // 每個平台 API 可綁定的帳號數
}

export interface FeatureAccess {
  // 基礎功能
  accountManagement: boolean;
  keywordMonitoring: boolean;
  leadCapture: boolean;
  // 白銀功能
  aiAutoReply: boolean;
  adBroadcast: boolean;
  hotLeads: boolean;            // 熱門客戶分析
  // 黃金功能
  smartMode: boolean;           // 智能模式儀表盤
  aiInsights: boolean;          // AI智能洞察
  dataExport: boolean;
  batchOperations: boolean;
  dataInsightsBasic: boolean;   // 基礎數據洞察
  // 鑽石功能
  strategyPlanning: boolean;    // 策略規劃 (AI營銷助手)
  autoExecution: boolean;       // 自動執行 (AI團隊銷售)
  dataInsightsAdvanced: boolean;// 進階數據洞察
  abTesting: boolean;           // A/B測試
  multiRole: boolean;
  aiSalesFunnel: boolean;
  advancedAnalytics: boolean;
  smartAntiBlock: boolean;
  // 星耀功能
  apiAccess: boolean;
  teamManagement: boolean;
  // 王者功能
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
      dataRetentionDays: 7,
      platformApiQuota: 0,
      platformApiMaxAccounts: 0
    },
    features: {
      // 基礎功能
      accountManagement: true,
      keywordMonitoring: true,
      leadCapture: true,
      // 白銀功能
      aiAutoReply: true,
      adBroadcast: false,
      hotLeads: false,
      // 黃金功能
      smartMode: false,
      aiInsights: false,
      dataExport: false,
      batchOperations: false,
      dataInsightsBasic: false,
      // 鑽石功能
      strategyPlanning: false,
      autoExecution: false,
      dataInsightsAdvanced: false,
      abTesting: false,
      multiRole: false,
      aiSalesFunnel: false,
      advancedAnalytics: false,
      smartAntiBlock: false,
      // 星耀功能
      apiAccess: false,
      teamManagement: false,
      // 王者功能
      customBranding: false,
      prioritySupport: false
    }
  },
  silver: {
    name: '白銀精英',
    icon: '🥈',
    rank: 2,
    monthlyPrice: 4.99,
    yearlyPrice: 49.9,
    quotas: {
      maxAccounts: 5,
      dailyMessages: 100,
      dailyAiCalls: 50,
      maxGroups: 10,
      maxKeywordSets: 5,
      dataRetentionDays: 30,
      platformApiQuota: 1,
      platformApiMaxAccounts: 3
    },
    features: {
      // 基礎功能
      accountManagement: true,
      keywordMonitoring: true,
      leadCapture: true,
      // 白銀功能 ✓
      aiAutoReply: true,
      adBroadcast: true,
      hotLeads: true,              // 解鎖熱門客戶
      // 黃金功能
      smartMode: false,
      aiInsights: false,
      dataExport: false,
      batchOperations: false,
      dataInsightsBasic: false,
      // 鑽石功能
      strategyPlanning: false,
      autoExecution: false,
      dataInsightsAdvanced: false,
      abTesting: false,
      multiRole: false,
      aiSalesFunnel: false,
      advancedAnalytics: false,
      smartAntiBlock: false,
      // 星耀功能
      apiAccess: false,
      teamManagement: false,
      // 王者功能
      customBranding: false,
      prioritySupport: false
    }
  },
  gold: {
    name: '黃金大師',
    icon: '🥇',
    rank: 3,
    monthlyPrice: 19.9,  // 主推產品
    yearlyPrice: 199,
    quotas: {
      maxAccounts: 15,
      dailyMessages: 500,
      dailyAiCalls: 300,
      maxGroups: 30,
      maxKeywordSets: 20,
      dataRetentionDays: 60,
      platformApiQuota: 3,
      platformApiMaxAccounts: 9
    },
    features: {
      // 基礎功能
      accountManagement: true,
      keywordMonitoring: true,
      leadCapture: true,
      // 白銀功能 ✓
      aiAutoReply: true,
      adBroadcast: true,
      hotLeads: true,
      // 黃金功能 ✓
      smartMode: true,             // 解鎖智能模式
      aiInsights: true,            // 解鎖AI智能洞察
      dataExport: true,
      batchOperations: true,
      dataInsightsBasic: true,     // 解鎖基礎數據洞察
      // 鑽石功能
      strategyPlanning: false,
      autoExecution: false,
      dataInsightsAdvanced: false,
      abTesting: false,
      multiRole: false,
      aiSalesFunnel: false,
      advancedAnalytics: false,
      smartAntiBlock: false,
      // 星耀功能
      apiAccess: false,
      teamManagement: false,
      // 王者功能
      customBranding: false,
      prioritySupport: false
    }
  },
  diamond: {
    name: '鑽石王牌',
    icon: '💎',
    rank: 4,
    monthlyPrice: 59.9,
    yearlyPrice: 599,
    quotas: {
      maxAccounts: 50,
      dailyMessages: 2000,
      dailyAiCalls: -1,
      maxGroups: 100,
      maxKeywordSets: 50,
      dataRetentionDays: 90,
      platformApiQuota: 10,
      platformApiMaxAccounts: 30
    },
    features: {
      // 基礎功能
      accountManagement: true,
      keywordMonitoring: true,
      leadCapture: true,
      // 白銀功能 ✓
      aiAutoReply: true,
      adBroadcast: true,
      hotLeads: true,
      // 黃金功能 ✓
      smartMode: true,
      aiInsights: true,
      dataExport: true,
      batchOperations: true,
      dataInsightsBasic: true,
      // 鑽石功能 ✓
      strategyPlanning: true,      // 解鎖策略規劃
      autoExecution: true,         // 解鎖自動執行
      dataInsightsAdvanced: true,  // 解鎖進階數據洞察
      abTesting: true,             // 解鎖A/B測試
      multiRole: true,
      aiSalesFunnel: true,
      advancedAnalytics: true,
      smartAntiBlock: false,
      // 星耀功能
      apiAccess: false,
      teamManagement: false,
      // 王者功能
      customBranding: false,
      prioritySupport: true        // 優先支持
    }
  },
  star: {
    name: '星耀傳說',
    icon: '🌟',
    rank: 5,
    monthlyPrice: 199,
    yearlyPrice: 1999,
    quotas: {
      maxAccounts: 100,
      dailyMessages: 10000,
      dailyAiCalls: -1,
      maxGroups: 300,
      maxKeywordSets: 100,
      dataRetentionDays: 180,
      platformApiQuota: 30,
      platformApiMaxAccounts: 90
    },
    features: {
      // 基礎功能
      accountManagement: true,
      keywordMonitoring: true,
      leadCapture: true,
      // 白銀功能 ✓
      aiAutoReply: true,
      adBroadcast: true,
      hotLeads: true,
      // 黃金功能 ✓
      smartMode: true,
      aiInsights: true,
      dataExport: true,
      batchOperations: true,
      dataInsightsBasic: true,
      // 鑽石功能 ✓
      strategyPlanning: true,
      autoExecution: true,
      dataInsightsAdvanced: true,
      abTesting: true,
      multiRole: true,
      aiSalesFunnel: true,
      advancedAnalytics: true,
      smartAntiBlock: true,
      // 星耀功能 ✓
      apiAccess: true,             // 解鎖API接口
      teamManagement: true,        // 解鎖團隊管理
      // 王者功能
      customBranding: false,
      prioritySupport: true
    }
  },
  king: {
    name: '榮耀王者',
    icon: '👑',
    rank: 6,
    monthlyPrice: 599,
    yearlyPrice: 5999,
    quotas: {
      maxAccounts: -1,  // 無限
      dailyMessages: -1,
      dailyAiCalls: -1,
      maxGroups: -1,
      maxKeywordSets: -1,
      dataRetentionDays: 365,
      platformApiQuota: -1,
      platformApiMaxAccounts: -1
    },
    features: {
      // 所有功能全部解鎖
      accountManagement: true,
      keywordMonitoring: true,
      leadCapture: true,
      // 白銀功能 ✓
      aiAutoReply: true,
      adBroadcast: true,
      hotLeads: true,
      // 黃金功能 ✓
      smartMode: true,
      aiInsights: true,
      dataExport: true,
      batchOperations: true,
      dataInsightsBasic: true,
      // 鑽石功能 ✓
      strategyPlanning: true,
      autoExecution: true,
      dataInsightsAdvanced: true,
      abTesting: true,
      multiRole: true,
      aiSalesFunnel: true,
      advancedAnalytics: true,
      smartAntiBlock: true,
      // 星耀功能 ✓
      apiAccess: true,
      teamManagement: true,
      // 王者功能 ✓
      customBranding: true,        // 解鎖自定義品牌
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
  
  // ========== 免登錄完整版配置 ==========
  // 與 AuthService 保持一致：免登錄模式下默認為榮耀王者
  // 僅在 Electron/IPC 模式下啟用免登錄
  // 🔧 用統一偵測（含 window.require），與 Guard 判斷一致，避免時鬆時緊
  private readonly SKIP_LOGIN = isElectronRuntime();
  private readonly DEFAULT_LEVEL: MembershipLevel = 'king';
  // ========================================
  
  // 狀態
  private _membership: WritableSignal<MembershipInfo | null> = signal(null);
  private _isLoading: WritableSignal<boolean> = signal(true);
  
  // 計算屬性
  membership = computed(() => this._membership());
  isLoading = computed(() => this._isLoading());
  
  level = computed(() => {
    // 免登錄模式默認為榮耀王者
    const defaultLevel = this.SKIP_LOGIN ? this.DEFAULT_LEVEL : 'bronze';
    const rawLevel = this._membership()?.level || defaultLevel;
    // 確保返回有效的會員等級，處理舊版數據兼容
    if (rawLevel in MEMBERSHIP_CONFIG) {
      return rawLevel as MembershipLevel;
    }
    // 舊版等級映射
    const legacyMap: Record<string, MembershipLevel> = {
      'free': 'bronze',
      'vip': 'silver',
      'svip': 'diamond',
      'mvp': 'king'
    };
    return legacyMap[rawLevel] || defaultLevel;
  });
  levelName = computed(() => MEMBERSHIP_CONFIG[this.level()]?.name || (this.SKIP_LOGIN ? '榮耀王者' : '青銅戰士'));
  levelIcon = computed(() => MEMBERSHIP_CONFIG[this.level()]?.icon || (this.SKIP_LOGIN ? '👑' : '⚔️'));
  levelRank = computed(() => MEMBERSHIP_CONFIG[this.level()]?.rank || (this.SKIP_LOGIN ? 6 : 1));
  
  isActive = computed(() => {
    const m = this._membership();
    if (!m) return false;
    if (m.level === 'bronze') return true; // 青銅戰士永遠有效
    // 如果沒有設置過期日期，視為永久會員（開發模式或終身會員）
    if (!m.expiresAt) return true;
    return new Date() < m.expiresAt;
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
  
  // 🆕 事件訂閱管理
  private authEventsService = inject(AuthEventsService);
  private authService = inject(AuthService, { optional: true });
  private eventSubscription: Subscription | null = null;
  
  constructor() {
    this.loadMembership();
    this.subscribeToAuthEvents();
    // 🔧 延遲同步：若 AuthService 已載入用戶（emit 早於訂閱），立即同步 isLifetime
    if (!this.SKIP_LOGIN) {
      setTimeout(() => this.syncFromAuthIfReady(), 0);
    }
  }
  
  /** 若 AuthService 已有用戶，立即同步（處理「訂閱晚於 emit」的情況） */
  private syncFromAuthIfReady(): void {
    try {
      const auth = this.authService;
      const u = auth?.user?.();
      if (u) {
        const level = this.tierToLevel(u.membershipLevel || u.subscription_tier || 'free');
        const expires = u.membershipExpires || u.subscription_expires;
        const isLifetime = !!(u as { isLifetime?: boolean }).isLifetime;
        this.syncFromAuthService(level, expires, isLifetime);
      }
    } catch {
      // AuthService 可能尚未就緒，忽略
    }
  }
  
  /**
   * 🆕 訂閱認證事件
   * 在 SaaS 模式下，當用戶登入或數據更新時自動同步會員狀態
   */
  private subscribeToAuthEvents(): void {
    // Electron 模式不需要訂閱（使用本地卡密）
    if (this.SKIP_LOGIN) {
      return;
    }
    
    this.eventSubscription = this.authEventsService.authEvents$.subscribe(event => {
      if (event.type === 'login' || event.type === 'user_update') {
        const user = event.payload?.user;
        if (user) {
          const tier = user.membershipLevel || user.subscription_tier || 'free';
          const level = this.tierToLevel(tier);
          const expires = user.membershipExpires || user.membership_expires;
          const isLifetime = !!(user as { isLifetime?: boolean }).isLifetime;
          console.log(`[MembershipService] 🔄 收到 ${event.type} 事件，同步會員: ${level}${isLifetime ? ' (終身)' : ''}`);
          this.syncFromAuthService(level, expires, isLifetime);
        }
      } else if (event.type === 'logout') {
        // 登出時重置為青銅
        console.log('[MembershipService] 收到 logout 事件，重置會員狀態');
        this.initializeFreeMembership();
      }
    });
  }
  
  /**
   * 🆕 將 subscription_tier 轉換為 MembershipLevel
   */
  private tierToLevel(tier: string): MembershipLevel {
    const tierMap: Record<string, MembershipLevel> = {
      'free': 'bronze',
      'basic': 'silver',
      'pro': 'gold',
      'enterprise': 'diamond',
      'bronze': 'bronze',
      'silver': 'silver',
      'gold': 'gold',
      'diamond': 'diamond',
      'star': 'star',
      'king': 'king'
    };
    return tierMap[tier] || 'bronze';
  }
  
  /**
   * 🆕 清理訂閱
   */
  ngOnDestroy(): void {
    this.eventSubscription?.unsubscribe();
  }
  
  // ============ 🔧 P2: 數據同步 ============
  
  /**
   * 從 AuthService 同步會員數據
   * 用於 SaaS 模式下確保數據一致性
   * 
   * @param authLevel 從 AuthService 獲取的會員等級
   * @param authExpires 從 AuthService 獲取的過期時間
   * @param isLifetime 後台標記為終身會員時為 true，前端顯示「終身」不顯示剩餘天數
   */
  syncFromAuthService(authLevel: MembershipLevel, authExpires?: string, isLifetime?: boolean): void {
    // Electron 模式下不同步（本地卡密優先）
    if (this.SKIP_LOGIN) {
      console.log('[MembershipService] Electron 模式，跳過 AuthService 同步');
      return;
    }
    
    const currentMembership = this._membership();
    const currentLevel = currentMembership?.level;
    
    // 🔧 修復：始終更新會員數據，確保 expiresAt 等屬性也被同步
    // 終身會員不設過期日（daysRemaining 為 -1，前端顯示「終身」）
    const levelConfig = MEMBERSHIP_CONFIG[authLevel];
    const newMembership: MembershipInfo = {
      level: authLevel,
      levelName: levelConfig?.name || '未知',
      levelIcon: levelConfig?.icon || '?',
      expiresAt: isLifetime
        ? undefined
        : (authExpires ? new Date(authExpires) : (authLevel !== 'bronze' ? new Date(Date.now() + 365 * 100 * 24 * 60 * 60 * 1000) : undefined)),
      activatedAt: currentMembership?.activatedAt || new Date(),
      machineId: this.getMachineId(),
      usage: currentMembership?.usage || this.getDefaultUsage(),
      inviteCode: currentMembership?.inviteCode || this.generateInviteCode(),
      inviteCount: currentMembership?.inviteCount || 0,
      inviteRewards: currentMembership?.inviteRewards || 0,
    };
    
    // 檢查是否有變化（用於日誌）
    if (currentLevel !== authLevel) {
      console.log(`[MembershipService] 🔄 會員等級變更: ${currentLevel} → ${authLevel}`);
    } else {
      console.log(`[MembershipService] ✓ 會員同步確認: ${authLevel} (expiresAt: ${newMembership.expiresAt || '永久'})`);
    }
    
    this._membership.set(newMembership);
    
    // 🔧 修復：在 SaaS 模式下保存到 localStorage，確保刷新後立即可用
    // 這樣用戶刷新頁面後，在 AuthService 完成初始化前就能有正確的會員狀態
    this.saveMembership(newMembership);
  }
  
  /**
   * 檢查是否為 SaaS 模式（非 Electron）
   */
  isSaaSMode(): boolean {
    return !this.SKIP_LOGIN;
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
        
        // 免登錄模式：自動升級到榮耀王者
        if (this.SKIP_LOGIN && parsed.level !== this.DEFAULT_LEVEL) {
          console.log(`[MembershipService] 免登錄模式：從 ${parsed.level} 升級到 ${this.DEFAULT_LEVEL}`);
          parsed.level = this.DEFAULT_LEVEL;
          parsed.levelName = MEMBERSHIP_CONFIG[this.DEFAULT_LEVEL].name;
          parsed.levelIcon = MEMBERSHIP_CONFIG[this.DEFAULT_LEVEL].icon;
          parsed.expiresAt = new Date(Date.now() + 365 * 100 * 24 * 60 * 60 * 1000); // 100年
          this.saveMembership(parsed);
        }
        
        // 檢查並重置每日用量
        this.checkAndResetDailyUsage(parsed);
        
        this._membership.set(parsed);
      } else {
        // 首次使用，創建會員
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
   * 初始化會員
   * 免登錄模式：榮耀王者（無限制）
   * 正常模式：青銅戰士（免費試用）
   */
  private initializeFreeMembership(): void {
    const level = this.SKIP_LOGIN ? this.DEFAULT_LEVEL : 'bronze';
    const config = MEMBERSHIP_CONFIG[level];
    
    const membership: MembershipInfo = {
      level: level,
      levelName: config.name,
      levelIcon: config.icon,
      activatedAt: new Date(),
      // 免登錄模式：100年後過期（相當於永久）
      expiresAt: this.SKIP_LOGIN ? new Date(Date.now() + 365 * 100 * 24 * 60 * 60 * 1000) : undefined,
      machineId: this.getMachineId(),
      usage: this.getDefaultUsage(),
      inviteCode: this.generateInviteCode(),
      inviteCount: 0,
      inviteRewards: 0
    };
    
    console.log(`[MembershipService] 初始化會員: ${config.icon} ${config.name}`);
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
    // 新格式: TGAI-[類型]-[XXXX]-[XXXX]-[XXXX]
    // 舊格式: TGM-[類型]-[XXXX]-[XXXX]-[XXXX]
    // 類型: B=白銀/G=黃金/D=鑽石/S=星耀/K=王者, 1=周/2=月/3=季/Y=年/L=終身
    const newKeyRegex = /^TGAI-([BGDSK][123YL]|EXT)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
    const oldKeyRegex = /^TGM-([BGDSK][123Y])-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
    
    let match = licenseKey.toUpperCase().match(newKeyRegex);
    if (!match) {
      match = licenseKey.toUpperCase().match(oldKeyRegex);
    }
    
    if (!match) {
      return { success: false, message: '⚔️ 卡密格式不正確，請檢查後重試' };
    }
    
    const typeCode = match[1];
    const levelCode = typeCode[0];
    const durationCode = typeCode[1] || '2';
    
    // 解析等級
    const levelMap: Record<string, MembershipLevel> = {
      'B': 'silver',   // 白銀精英
      'G': 'gold',     // 黃金大師
      'D': 'diamond',  // 鑽石王牌
      'S': 'star',     // 星耀傳說
      'K': 'king',     // 榮耀王者
      'E': 'gold',     // EXT 手動續費默認黃金
    };
    
    // 解析時長
    const durationMap: Record<string, number> = {
      '1': 7,     // 周卡
      '2': 30,    // 月卡
      '3': 90,    // 季卡
      'Y': 365,   // 年卡
      'L': 36500, // 終身
      'X': 30,    // EXT 默認30天
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
          '3 個群組 / 1 個關鍵詞集',
          '基礎監控功能'
        ]
      },
      {
        level: 'silver',
        name: '🥈 白銀精英',
        icon: '🥈',
        monthlyPrice: 4.99,
        yearlyPrice: 49.9,
        quotas: MEMBERSHIP_CONFIG.silver.quotas,
        features: [
          '5 個賬戶',
          '每日 100 條消息',
          '每日 50 次 AI',
          '10 個群組 / 5 個關鍵詞集',
          '廣告發送功能',
          '熱門客戶分析'
        ]
      },
      {
        level: 'gold',
        name: '🥇 黃金大師',
        icon: '🥇',
        monthlyPrice: 19.9,
        yearlyPrice: 199,
        quotas: MEMBERSHIP_CONFIG.gold.quotas,
        recommended: true,
        features: [
          '15 個賬戶',
          '每日 500 條消息 / 300 次 AI',
          '30 個群組 / 20 個關鍵詞集',
          '🆕 智能模式儀表盤',
          '🆕 AI 智能洞察',
          '數據導出 + 批量操作'
        ]
      },
      {
        level: 'diamond',
        name: '💎 鑽石王牌',
        icon: '💎',
        monthlyPrice: 59.9,
        yearlyPrice: 599,
        quotas: MEMBERSHIP_CONFIG.diamond.quotas,
        features: [
          '50 個賬戶',
          '每日 2000 條消息 / 無限 AI',
          '100 個群組 / 50 個關鍵詞集',
          '🆕 AI 策略規劃',
          '🆕 AI 自動執行',
          '多角色協作 + A/B測試'
        ]
      },
      {
        level: 'star',
        name: '🌟 星耀傳說',
        icon: '🌟',
        monthlyPrice: 199,
        yearlyPrice: 1999,
        quotas: MEMBERSHIP_CONFIG.star.quotas,
        features: [
          '100 個賬戶',
          '每日 10000 條消息 / 無限 AI',
          '300 個群組 / 100 個關鍵詞集',
          'API 接口',
          '團隊管理',
          '智能防封',
          '優先支持'
        ]
      },
      {
        level: 'king',
        name: '👑 榮耀王者',
        icon: '👑',
        monthlyPrice: 599,
        yearlyPrice: 5999,
        quotas: MEMBERSHIP_CONFIG.king.quotas,
        features: [
          '無限賬戶 / 消息 / AI',
          '無限群組 / 關鍵詞集 / 規則',
          '所有功能全部解鎖',
          '自定義品牌',
          '1對1 專屬顧問',
          '新功能內測體驗'
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
