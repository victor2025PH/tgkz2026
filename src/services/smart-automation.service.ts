/**
 * 智能自動化服務
 * Smart Automation Service
 * 
 * 🆕 P3 階段：智能自動化增強
 * 
 * 功能：
 * - P3-2: 自動角色調整
 * - P3-3: 對話節奏自適應
 * - P3-4: 異常告警機制
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { MarketingAnalyticsService, RoleComboStats } from './marketing-analytics.service';
import { SmartTimingService } from './smart-timing.service';
import { ToastService } from '../toast.service';

// ============ 類型定義 ============

/** 自動化規則 */
export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  type: 'role_switch' | 'rhythm_adjust' | 'alert';
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
  lastTriggered?: Date;
  triggerCount: number;
}

/** 規則條件 */
export interface RuleCondition {
  metric: 'conversion_rate' | 'response_rate' | 'interest_score' | 'message_count' | 'no_response_count';
  operator: 'lt' | 'gt' | 'eq' | 'lte' | 'gte';
  value: number;
  timeWindow?: number;  // 分鐘
}

/** 規則動作 */
export interface RuleAction {
  type: 'switch_role' | 'adjust_delay' | 'send_alert' | 'pause' | 'escalate';
  params: Record<string, any>;
}

/** 對話節奏配置 */
export interface RhythmConfig {
  baseDelay: number;       // 基礎延遲（秒）
  varianceRatio: number;   // 變化比例 0-1
  minDelay: number;        // 最小延遲
  maxDelay: number;        // 最大延遲
  adaptiveMode: boolean;   // 是否啟用自適應
}

/** 告警信息 */
export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  metric?: string;
  value?: number;
  threshold?: number;
  timestamp: Date;
  acknowledged: boolean;
  actionTaken?: string;
}

/** 角色推薦 */
export interface RoleRecommendation {
  roleCombo: RoleComboStats;
  confidence: number;      // 0-1
  reason: string;
  expectedImprovement: number;  // 預期提升百分比
}

// ============ 預設規則 ============

const DEFAULT_RULES: AutomationRule[] = [
  {
    id: 'rule_low_conversion',
    name: '低轉化率告警',
    enabled: true,
    type: 'alert',
    condition: { metric: 'conversion_rate', operator: 'lt', value: 10, timeWindow: 60 },
    action: { type: 'send_alert', params: { level: 'warning', message: '近1小時轉化率低於10%' } },
    priority: 1,
    triggerCount: 0
  },
  {
    id: 'rule_no_response',
    name: '連續無回覆切換角色',
    enabled: true,
    type: 'role_switch',
    condition: { metric: 'no_response_count', operator: 'gte', value: 3 },
    action: { type: 'switch_role', params: { strategy: 'next_best' } },
    priority: 2,
    triggerCount: 0
  },
  {
    id: 'rule_slow_response',
    name: '用戶回覆慢時減緩節奏',
    enabled: true,
    type: 'rhythm_adjust',
    condition: { metric: 'response_rate', operator: 'lt', value: 0.3 },
    action: { type: 'adjust_delay', params: { multiplier: 1.5 } },
    priority: 3,
    triggerCount: 0
  },
  {
    id: 'rule_high_interest',
    name: '高興趣度加快節奏',
    enabled: true,
    type: 'rhythm_adjust',
    condition: { metric: 'interest_score', operator: 'gt', value: 80 },
    action: { type: 'adjust_delay', params: { multiplier: 0.7 } },
    priority: 4,
    triggerCount: 0
  }
];

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class SmartAutomationService {
  private analytics = inject(MarketingAnalyticsService);
  private timing = inject(SmartTimingService);
  private toast = inject(ToastService);
  
  // 自動化規則
  private _rules = signal<AutomationRule[]>(DEFAULT_RULES);
  rules = this._rules.asReadonly();
  
  // 當前節奏配置
  private _rhythmConfig = signal<RhythmConfig>({
    baseDelay: 5,
    varianceRatio: 0.3,
    minDelay: 2,
    maxDelay: 30,
    adaptiveMode: true
  });
  rhythmConfig = this._rhythmConfig.asReadonly();
  
  // 告警列表
  private _alerts = signal<Alert[]>([]);
  alerts = this._alerts.asReadonly();
  
  // 未確認告警數
  unacknowledgedCount = computed(() => 
    this._alerts().filter(a => !a.acknowledged).length
  );
  
  // 當前會話的上下文（用於自適應）
  private sessionContext = signal<{
    noResponseCount: number;
    userResponseTimes: number[];
    interestScores: number[];
  }>({
    noResponseCount: 0,
    userResponseTimes: [],
    interestScores: []
  });
  
  private readonly STORAGE_KEY = 'smartAutomation';
  
  // 🔧 防止規則觸發過於頻繁
  private lastRuleCheck = 0;
  private readonly RULE_CHECK_COOLDOWN = 60000;  // 1分鐘冷卻
  private ruleCheckTimeout: any = null;
  
  constructor() {
    this.loadFromStorage();
    
    // 🔧 使用定時器而不是 effect，避免循環觸發
    // 每分鐘檢查一次規則
    setInterval(() => {
      const stats = this.analytics.totalStats();
      this.checkRulesWithCooldown(stats);
    }, this.RULE_CHECK_COOLDOWN);
  }
  
  /**
   * 帶冷卻的規則檢查
   */
  private checkRulesWithCooldown(stats: any) {
    const now = Date.now();
    if (now - this.lastRuleCheck < this.RULE_CHECK_COOLDOWN) {
      return;  // 冷卻中，跳過
    }
    this.lastRuleCheck = now;
    this.checkRules(stats);
  }
  
  // ============ 規則管理 ============
  
  /**
   * 添加規則
   */
  addRule(rule: Omit<AutomationRule, 'id' | 'triggerCount'>) {
    const newRule: AutomationRule = {
      ...rule,
      id: `rule_${Date.now()}`,
      triggerCount: 0
    };
    this._rules.update(rules => [...rules, newRule]);
    this.saveToStorage();
  }
  
  /**
   * 更新規則
   */
  updateRule(ruleId: string, updates: Partial<AutomationRule>) {
    this._rules.update(rules => 
      rules.map(r => r.id === ruleId ? { ...r, ...updates } : r)
    );
    this.saveToStorage();
  }
  
  /**
   * 啟用/禁用規則
   */
  toggleRule(ruleId: string) {
    this._rules.update(rules => 
      rules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r)
    );
    this.saveToStorage();
  }
  
  /**
   * 檢查規則
   */
  private checkRules(stats: any) {
    const enabledRules = this._rules()
      .filter(r => r.enabled)
      .sort((a, b) => a.priority - b.priority);
    
    for (const rule of enabledRules) {
      if (this.evaluateCondition(rule.condition, stats)) {
        this.executeAction(rule);
      }
    }
  }
  
  /**
   * 評估條件
   */
  private evaluateCondition(condition: RuleCondition, stats: any): boolean {
    let value: number;
    
    switch (condition.metric) {
      case 'conversion_rate':
        value = stats.conversionRate;
        break;
      case 'response_rate':
        value = stats.avgEngagementScore / 100;
        break;
      case 'interest_score':
        value = stats.avgInterestScore;
        break;
      case 'no_response_count':
        value = this.sessionContext().noResponseCount;
        break;
      case 'message_count':
        value = stats.totalSessions;
        break;
      default:
        return false;
    }
    
    switch (condition.operator) {
      case 'lt': return value < condition.value;
      case 'gt': return value > condition.value;
      case 'eq': return value === condition.value;
      case 'lte': return value <= condition.value;
      case 'gte': return value >= condition.value;
      default: return false;
    }
  }
  
  /**
   * 執行動作
   */
  private executeAction(rule: AutomationRule) {
    console.log(`[SmartAutomation] 觸發規則: ${rule.name}`);
    
    // 更新觸發次數
    this._rules.update(rules => 
      rules.map(r => r.id === rule.id ? { 
        ...r, 
        triggerCount: r.triggerCount + 1,
        lastTriggered: new Date()
      } : r)
    );
    
    switch (rule.action.type) {
      case 'send_alert':
        this.createAlert({
          type: rule.action.params.level || 'warning',
          title: rule.name,
          message: rule.action.params.message
        });
        break;
        
      case 'switch_role':
        this.triggerRoleSwitch(rule.action.params.strategy);
        break;
        
      case 'adjust_delay':
        this.adjustRhythm(rule.action.params.multiplier);
        break;
        
      case 'pause':
        window.dispatchEvent(new CustomEvent('automation:pause', { detail: rule }));
        break;
        
      case 'escalate':
        this.createAlert({
          type: 'error',
          title: '需要人工介入',
          message: `規則「${rule.name}」建議暫停自動化，請人工處理`
        });
        break;
    }
    
    this.saveToStorage();
  }
  
  // ============ 角色自動調整 ============
  
  /**
   * 獲取角色推薦
   */
  getRecommendedRoles(): RoleRecommendation[] {
    const allCombos = this.analytics.roleComboStats();
    const topCombos = this.analytics.topRoleCombos();
    
    if (topCombos.length === 0) {
      return [];
    }
    
    const currentAvg = allCombos.length > 0
      ? allCombos.reduce((sum, c) => sum + c.conversionRate, 0) / allCombos.length
      : 10;
    
    return topCombos.slice(0, 3).map((combo, idx) => ({
      roleCombo: combo,
      confidence: Math.min(0.9 - idx * 0.1, combo.totalSessions / 20),
      reason: this.getRecommendationReason(combo, idx),
      expectedImprovement: Math.max(0, combo.conversionRate - currentAvg)
    }));
  }
  
  /**
   * 獲取推薦原因
   */
  private getRecommendationReason(combo: RoleComboStats, rank: number): string {
    if (rank === 0) {
      return `轉化率最高 (${combo.conversionRate.toFixed(1)}%)，基於 ${combo.totalSessions} 次使用`;
    }
    if (combo.trend === 'up') {
      return `效果持續上升，近期表現優秀`;
    }
    return `穩定表現，轉化率 ${combo.conversionRate.toFixed(1)}%`;
  }
  
  /**
   * 觸發角色切換
   */
  private triggerRoleSwitch(strategy: string) {
    const recommendations = this.getRecommendedRoles();
    if (recommendations.length > 0) {
      window.dispatchEvent(new CustomEvent('automation:role-switch', {
        detail: {
          strategy,
          recommended: recommendations[0].roleCombo
        }
      }));
      
      this.toast.info(`💡 建議切換至角色組合: ${recommendations[0].roleCombo.comboName}`);
    }
  }
  
  // ============ 節奏自適應 ============
  
  /**
   * 更新節奏配置
   */
  updateRhythmConfig(config: Partial<RhythmConfig>) {
    this._rhythmConfig.update(c => ({ ...c, ...config }));
    this.saveToStorage();
  }
  
  /**
   * 調整節奏
   */
  private adjustRhythm(multiplier: number) {
    const current = this._rhythmConfig();
    const newDelay = Math.max(
      current.minDelay,
      Math.min(current.maxDelay, current.baseDelay * multiplier)
    );
    
    this._rhythmConfig.update(c => ({ ...c, baseDelay: newDelay }));
    console.log(`[SmartAutomation] 節奏調整: ${current.baseDelay}s → ${newDelay}s`);
  }
  
  /**
   * 計算自適應延遲
   */
  getAdaptiveDelay(context?: { userResponseTime?: number; interestScore?: number }): number {
    const config = this._rhythmConfig();
    
    if (!config.adaptiveMode) {
      return config.baseDelay;
    }
    
    let delay = config.baseDelay;
    
    // 根據用戶回覆速度調整
    if (context?.userResponseTime !== undefined) {
      if (context.userResponseTime < 30) {
        delay *= 0.8;  // 用戶回覆快，我們也加快
      } else if (context.userResponseTime > 120) {
        delay *= 1.3;  // 用戶回覆慢，我們也放慢
      }
    }
    
    // 根據興趣度調整
    if (context?.interestScore !== undefined) {
      if (context.interestScore > 80) {
        delay *= 0.7;  // 高興趣度，加快節奏
      } else if (context.interestScore < 30) {
        delay *= 1.2;  // 低興趣度，稍微放慢
      }
    }
    
    // 添加隨機變化
    const variance = delay * config.varianceRatio * (Math.random() - 0.5);
    delay += variance;
    
    // 限制在範圍內
    return Math.max(config.minDelay, Math.min(config.maxDelay, delay));
  }
  
  /**
   * 記錄用戶回覆（用於自適應）
   */
  recordUserResponse(responded: boolean, responseTime?: number, interestScore?: number) {
    this.sessionContext.update(ctx => ({
      noResponseCount: responded ? 0 : ctx.noResponseCount + 1,
      userResponseTimes: responseTime 
        ? [...ctx.userResponseTimes.slice(-9), responseTime] 
        : ctx.userResponseTimes,
      interestScores: interestScore 
        ? [...ctx.interestScores.slice(-9), interestScore]
        : ctx.interestScores
    }));
  }
  
  /**
   * 重置會話上下文
   */
  resetSessionContext() {
    this.sessionContext.set({
      noResponseCount: 0,
      userResponseTimes: [],
      interestScores: []
    });
  }
  
  // ============ 告警管理 ============
  
  /**
   * 創建告警
   */
  createAlert(data: { type: Alert['type']; title: string; message: string; metric?: string; value?: number; threshold?: number }) {
    const alert: Alert = {
      id: `alert_${Date.now()}`,
      ...data,
      timestamp: new Date(),
      acknowledged: false
    };
    
    this._alerts.update(alerts => [alert, ...alerts].slice(0, 50));
    this.saveToStorage();
    
    // 顯示 toast
    if (data.type === 'error') {
      this.toast.error(`🚨 ${data.title}: ${data.message}`);
    } else if (data.type === 'warning') {
      this.toast.warning(`⚠️ ${data.title}: ${data.message}`);
    }
    
    console.log(`[SmartAutomation] 新告警: ${data.title}`);
    return alert;
  }
  
  /**
   * 確認告警
   */
  acknowledgeAlert(alertId: string, actionTaken?: string) {
    this._alerts.update(alerts => 
      alerts.map(a => a.id === alertId ? { ...a, acknowledged: true, actionTaken } : a)
    );
    this.saveToStorage();
  }
  
  /**
   * 確認所有告警
   */
  acknowledgeAllAlerts() {
    this._alerts.update(alerts => 
      alerts.map(a => ({ ...a, acknowledged: true }))
    );
    this.saveToStorage();
  }
  
  /**
   * 清除已確認的告警
   */
  clearAcknowledgedAlerts() {
    this._alerts.update(alerts => alerts.filter(a => !a.acknowledged));
    this.saveToStorage();
  }
  
  // ============ 持久化 ============
  
  private saveToStorage() {
    const data = {
      rules: this._rules(),
      rhythmConfig: this._rhythmConfig(),
      alerts: this._alerts().slice(0, 20),
      savedAt: Date.now()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }
  
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;
      
      const data = JSON.parse(stored);
      
      if (data.rules) {
        // 合併默認規則和存儲的規則
        const storedIds = new Set(data.rules.map((r: AutomationRule) => r.id));
        const mergedRules = [
          ...data.rules.map((r: any) => ({
            ...r,
            lastTriggered: r.lastTriggered ? new Date(r.lastTriggered) : undefined
          })),
          ...DEFAULT_RULES.filter(r => !storedIds.has(r.id))
        ];
        this._rules.set(mergedRules);
      }
      
      if (data.rhythmConfig) {
        this._rhythmConfig.set(data.rhythmConfig);
      }
      
      if (data.alerts) {
        this._alerts.set(data.alerts.map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp)
        })));
      }
      
      console.log('[SmartAutomation] 已從存儲恢復數據');
    } catch (e) {
      console.error('[SmartAutomation] 恢復數據失敗:', e);
    }
  }
}
