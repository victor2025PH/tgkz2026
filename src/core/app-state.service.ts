/**
 * 🔧 P6-6: 統一應用狀態服務（State Facade）
 * 
 * 目的：
 * 1. 提供統一的狀態訪問入口（替代同時注入 AuthService + MembershipService + QuotaService）
 * 2. 消除組件層面的狀態源選擇困惑
 * 3. 提供 dev 模式的狀態一致性檢查
 * 
 * 設計原則：
 * - AuthService = 用戶/認證狀態的唯一數據源
 * - MembershipService = 功能權限和配額配置的唯一數據源
 * - QuotaService = 配額使用量的唯一數據源
 * - AppStateService = 上述三者的統一讀取入口（只讀 facade）
 * 
 * 用法:
 *   // 以前（需要注入多個服務）
 *   authService = inject(AuthService);
 *   membershipService = inject(MembershipService);
 *   quotaService = inject(QuotaService);
 *   userName = computed(() => this.authService.user()?.displayName);
 *   canUseBatch = computed(() => this.membershipService.features().batchOperations);
 *   accountsUsed = computed(() => ...);
 * 
 *   // 現在（一個服務搞定）
 *   state = inject(AppStateService);
 *   userName = this.state.displayName;
 *   canUseBatch = this.state.canBatchOperations;
 *   accountsUsed = this.state.quotaSummary;
 */

import { Injectable, computed, inject, isDevMode } from '@angular/core';
import { AuthService } from './auth.service';
import { MembershipService, MembershipLevel, Quotas, FeatureAccess } from '../membership.service';
import { QuotaService, QuotaSummary } from '../services/quota.service';

@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  // 注入源服務
  private auth = inject(AuthService);
  private membership = inject(MembershipService);
  private quota = inject(QuotaService);

  // ==================== 用戶狀態（來源：AuthService） ====================

  /** 當前用戶（完整對象） */
  readonly user = computed(() => this.auth.user());

  /** 用戶顯示名 */
  readonly displayName = computed(() => {
    const u = this.auth.user();
    return u?.displayName || u?.display_name || u?.username || '';
  });

  /** 用戶名 */
  readonly username = computed(() => this.auth.user()?.username || '');

  /** 是否已認證 */
  readonly isAuthenticated = computed(() => this.auth.isAuthenticated());

  /** 是否加載中 */
  readonly isLoading = computed(() => this.auth.isLoading());

  // ==================== 會員狀態（來源：MembershipService + AuthService） ====================

  /** 會員等級（統一來源） */
  readonly membershipLevel = computed<MembershipLevel>(() => {
    // SaaS 模式：AuthService 為準
    // Electron 模式：MembershipService 為準
    return this.membership.level();
  });

  /** 會員名稱 */
  readonly membershipName = computed(() => this.membership.levelName());

  /** 會員圖標 */
  readonly membershipIcon = computed(() => this.membership.levelIcon());

  /** 會員是否有效 */
  readonly isMembershipActive = computed(() => this.membership.isActive());

  /** 配額配置 */
  readonly quotaConfig = computed<Quotas>(() => this.membership.quotas());

  /** 功能權限 */
  readonly features = computed<FeatureAccess>(() => this.membership.features());

  // ==================== 功能權限快捷方式 ====================

  /** 是否可使用批量操作 */
  readonly canBatchOperations = computed(() => this.features().batchOperations);

  /** 是否可使用 AI 洞察 */
  readonly canAiInsights = computed(() => this.features().aiInsights);

  /** 是否可使用數據導出 */
  readonly canDataExport = computed(() => this.features().dataExport);

  /** 是否可使用多角色 */
  readonly canMultiRole = computed(() => this.features().multiRole);

  /** 是否可使用 API */
  readonly canApiAccess = computed(() => this.features().apiAccess);

  /** 是否可使用團隊管理 */
  readonly canTeamManagement = computed(() => this.features().teamManagement);

  // ==================== 配額使用狀態（來源：QuotaService） ====================

  /** 配額摘要 */
  readonly quotaSummary = computed<QuotaSummary | null>(() => this.quota.quotaSummary());

  /** 是否有配額警告 */
  readonly hasQuotaWarnings = computed(() => this.quota.hasWarnings());

  /** 是否有配額超限 */
  readonly hasQuotaExceeded = computed(() => this.quota.hasExceeded());

  /** 未確認的配額告警數 */
  readonly unacknowledgedAlertCount = computed(() => this.quota.unacknowledgedAlerts());

  // ==================== 統一方法 ====================

  /** 刷新所有狀態 */
  async refreshAll(): Promise<void> {
    await Promise.all([
      this.auth.fetchUser(),
      this.quota.loadQuotaSummary(),
      this.quota.loadAlerts()
    ]);
  }

  /** 檢查功能是否可用 */
  hasFeature(feature: keyof FeatureAccess): boolean {
    return this.features()[feature] || false;
  }

  /** 獲取配額使用百分比 */
  getQuotaPercentage(quotaType: string): number {
    const summary = this.quotaSummary();
    if (!summary?.quotas?.[quotaType]) return 0;
    return summary.quotas[quotaType].percentage || 0;
  }

  // ==================== Dev 模式一致性檢查 ====================

  /** 
   * 檢查狀態一致性（僅 dev 模式） 
   * 檢測 AuthService 和 MembershipService 之間的等級是否一致
   */
  checkConsistency(): { consistent: boolean; issues: string[] } {
    const issues: string[] = [];

    // 檢查等級一致性
    const authLevel = this.auth.membershipLevel();
    const membershipLevel = this.membership.level();

    if (authLevel && membershipLevel && authLevel !== membershipLevel) {
      issues.push(
        `Tier mismatch: AuthService="${authLevel}" vs MembershipService="${membershipLevel}"`
      );
    }

    // 檢查配額一致性
    const quotaTier = this.quotaSummary()?.tier;
    if (quotaTier && membershipLevel && quotaTier !== membershipLevel) {
      issues.push(
        `Quota tier mismatch: QuotaService="${quotaTier}" vs MembershipService="${membershipLevel}"`
      );
    }

    if (isDevMode() && issues.length > 0) {
      console.warn('[AppState] State consistency issues detected:', issues);
    }

    return { consistent: issues.length === 0, issues };
  }
}
