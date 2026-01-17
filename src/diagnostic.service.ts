/**
 * 配置診斷服務 - Phase 1 優化
 * Diagnostic Service for Configuration Validation
 * 
 * 功能:
 * 1. 配置完整性檢查
 * 2. 智能問題識別
 * 3. 修復建議生成
 * 4. 配置評分計算
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { ElectronIpcService } from './electron-ipc.service';

// 診斷問題嚴重程度
export type IssueSeverity = 'critical' | 'warning' | 'info';

// 診斷問題
export interface DiagnosticIssue {
  code: string;
  severity: IssueSeverity;
  title: string;
  description: string;
  fix: string;
  actionLabel: string;
  actionView: string;
  elementId?: string;
}

// 配置步驟狀態
export type StepStatus = 'pending' | 'completed' | 'warning' | 'error';

// 配置步驟
export interface ConfigStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: StepStatus;
  isRequired: boolean;
  count: number;
  targetCount: number;
  tips: string[];
}

// 配置摘要
export interface ConfigSummary {
  score: number;
  canMonitor: boolean;
  canSendMessages: boolean;
  canAutoReply: boolean;
  criticalCount: number;
  warningCount: number;
  completedSteps: number;
  totalSteps: number;
}

// 診斷結果
export interface DiagnosticResult {
  timestamp: Date;
  steps: ConfigStep[];
  issues: DiagnosticIssue[];
  summary: ConfigSummary;
}

@Injectable({
  providedIn: 'root'
})
export class DiagnosticService {
  private ipcService = inject(ElectronIpcService);
  
  // 狀態
  private _isRunning = signal(false);
  private _lastResult = signal<DiagnosticResult | null>(null);
  
  // 公開狀態
  isRunning = this._isRunning.asReadonly();
  lastResult = this._lastResult.asReadonly();
  
  // 計算屬性
  configScore = computed(() => this._lastResult()?.summary.score ?? 0);
  canMonitor = computed(() => this._lastResult()?.summary.canMonitor ?? false);
  issues = computed(() => this._lastResult()?.issues ?? []);
  steps = computed(() => this._lastResult()?.steps ?? []);
  
  constructor() {
    // 監聽後端診斷結果
    this.ipcService.on('diagnostic-result', (data: any) => {
      this._isRunning.set(false);
      if (data.success) {
        this._lastResult.set(this.parseBackendResult(data));
      }
    });
  }
  
  /**
   * 運行配置診斷
   */
  runDiagnostics(accounts: any[], groups: any[], keywords: any[], campaigns: any[], settings: any): void {
    this._isRunning.set(true);
    
    // 本地診斷
    const result = this.performLocalDiagnostics(accounts, groups, keywords, campaigns, settings);
    this._lastResult.set(result);
    this._isRunning.set(false);
    
    // 也發送到後端進行更深入的檢查
    this.ipcService.send('run-diagnostics', {
      accounts: accounts.map(a => ({ phone: a.phone, role: a.role, status: a.status })),
      groups: groups.length,
      keywords: keywords.length,
      campaigns: campaigns.length
    });
  }
  
  /**
   * 本地診斷邏輯
   */
  private performLocalDiagnostics(
    accounts: any[], 
    groups: any[], 
    keywords: any[], 
    campaigns: any[],
    settings: any
  ): DiagnosticResult {
    const steps: ConfigStep[] = [];
    const issues: DiagnosticIssue[] = [];
    
    // 步驟1: 監控帳號檢查
    const listenerAccounts = accounts.filter(a => a.role === 'Listener');
    const onlineListeners = listenerAccounts.filter(a => a.status === 'Online');
    
    const listenerStep: ConfigStep = {
      id: 'listener',
      title: '監控帳號',
      description: '設置監聽角色的帳號',
      icon: '👁️',
      status: this.getStepStatus(onlineListeners.length, 1, listenerAccounts.length),
      isRequired: true,
      count: onlineListeners.length,
      targetCount: 1,
      tips: ['監控號用於監聽群組消息', '建議至少設置1個專用監控號']
    };
    steps.push(listenerStep);
    
    if (listenerAccounts.length === 0) {
      issues.push({
        code: 'NO_LISTENER',
        severity: 'critical',
        title: '無監控帳號',
        description: '沒有設置任何監控角色的帳號',
        fix: '前往帳號管理，將至少一個帳號設置為「監聽」角色',
        actionLabel: '設置監控號',
        actionView: 'accounts'
      });
    } else if (onlineListeners.length === 0) {
      issues.push({
        code: 'LISTENER_OFFLINE',
        severity: 'critical',
        title: '監控帳號離線',
        description: `有 ${listenerAccounts.length} 個監控帳號，但都未在線`,
        fix: '請登錄監控帳號使其在線',
        actionLabel: '登錄帳號',
        actionView: 'accounts'
      });
    }
    
    // 步驟2: 監控群組檢查
    const groupStep: ConfigStep = {
      id: 'groups',
      title: '監控群組',
      description: '添加要監控的群組',
      icon: '💬',
      status: groups.length >= 1 ? 'completed' : 'error',
      isRequired: true,
      count: groups.length,
      targetCount: 1,
      tips: ['可從資源發現中搜索群組', '監控號需已加入群組']
    };
    steps.push(groupStep);
    
    if (groups.length === 0) {
      issues.push({
        code: 'NO_GROUPS',
        severity: 'critical',
        title: '無監控群組',
        description: '沒有添加任何監控群組',
        fix: '在自動化中心添加要監控的群組，或從資源發現中搜索',
        actionLabel: '添加群組',
        actionView: 'automation'
      });
    }
    
    // 步驟3: 關鍵詞檢查
    const keywordStep: ConfigStep = {
      id: 'keywords',
      title: '關鍵詞',
      description: '設置觸發關鍵詞',
      icon: '🔑',
      status: keywords.length >= 1 ? 'completed' : 'error',
      isRequired: true,
      count: keywords.length,
      targetCount: 1,
      tips: ['支持正則表達式', '多個關鍵詞用逗號分隔']
    };
    steps.push(keywordStep);
    
    if (keywords.length === 0) {
      issues.push({
        code: 'NO_KEYWORDS',
        severity: 'critical',
        title: '無關鍵詞',
        description: '沒有設置任何觸發關鍵詞',
        fix: '在自動化中心添加關鍵詞集',
        actionLabel: '添加關鍵詞',
        actionView: 'automation'
      });
    }
    
    // 步驟4: 發送帳號檢查
    const senderAccounts = accounts.filter(a => a.role === 'Sender');
    const onlineSenders = senderAccounts.filter(a => a.status === 'Online');
    
    const senderStep: ConfigStep = {
      id: 'sender',
      title: '發送帳號',
      description: '設置發送消息的帳號',
      icon: '📤',
      status: this.getStepStatus(onlineSenders.length, 1, senderAccounts.length),
      isRequired: false,
      count: onlineSenders.length,
      targetCount: 1,
      tips: ['發送號用於私聊觸達', '建議與監控號分開使用']
    };
    steps.push(senderStep);
    
    if (senderAccounts.length === 0) {
      issues.push({
        code: 'NO_SENDER',
        severity: 'warning',
        title: '無發送帳號',
        description: '沒有設置發送角色的帳號，將無法自動發送消息',
        fix: '建議設置專用發送帳號以實現自動觸達',
        actionLabel: '設置發送號',
        actionView: 'accounts'
      });
    } else if (onlineSenders.length === 0) {
      issues.push({
        code: 'SENDER_OFFLINE',
        severity: 'warning',
        title: '發送帳號離線',
        description: `有 ${senderAccounts.length} 個發送帳號，但都未在線`,
        fix: '請登錄發送帳號使其在線',
        actionLabel: '登錄帳號',
        actionView: 'accounts'
      });
    }
    
    // 步驟5: 活動配置檢查
    const activeCampaigns = campaigns.filter((c: any) => c.isActive);
    
    const campaignStep: ConfigStep = {
      id: 'campaign',
      title: '自動活動',
      description: '配置自動化活動',
      icon: '⚡',
      status: activeCampaigns.length >= 1 ? 'completed' : 'pending',
      isRequired: false,
      count: activeCampaigns.length,
      targetCount: 1,
      tips: ['活動定義觸發後的動作', '可設置延遲和條件']
    };
    steps.push(campaignStep);
    
    if (campaigns.length > 0 && activeCampaigns.length === 0) {
      issues.push({
        code: 'NO_ACTIVE_CAMPAIGN',
        severity: 'info',
        title: '無活躍活動',
        description: `有 ${campaigns.length} 個活動，但都未啟用`,
        fix: '啟用至少一個活動以實現自動響應',
        actionLabel: '管理活動',
        actionView: 'automation'
      });
    }
    
    // 計算摘要
    const requiredSteps = steps.filter(s => s.isRequired);
    const requiredCompleted = requiredSteps.filter(s => s.status === 'completed').length;
    const optionalSteps = steps.filter(s => !s.isRequired);
    const optionalCompleted = optionalSteps.filter(s => s.status === 'completed').length;
    
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    
    // 計算分數
    let score = 0;
    if (requiredSteps.length > 0) {
      score += (requiredCompleted / requiredSteps.length) * 60;
    }
    if (optionalSteps.length > 0) {
      score += (optionalCompleted / optionalSteps.length) * 40;
    }
    score = Math.max(0, Math.round(score - criticalCount * 20 - warningCount * 5));
    
    const summary: ConfigSummary = {
      score,
      canMonitor: criticalCount === 0 && onlineListeners.length > 0 && groups.length > 0 && keywords.length > 0,
      canSendMessages: onlineSenders.length > 0,
      canAutoReply: activeCampaigns.length > 0,
      criticalCount,
      warningCount,
      completedSteps: steps.filter(s => s.status === 'completed').length,
      totalSteps: steps.length
    };
    
    return {
      timestamp: new Date(),
      steps,
      issues,
      summary
    };
  }
  
  /**
   * 獲取步驟狀態
   */
  private getStepStatus(current: number, target: number, total: number): StepStatus {
    if (current >= target) return 'completed';
    if (current > 0) return 'warning';
    if (total > 0) return 'warning';  // 有配置但沒有在線的
    return 'error';
  }
  
  /**
   * 解析後端結果
   */
  private parseBackendResult(data: any): DiagnosticResult {
    return {
      timestamp: new Date(),
      steps: data.steps || [],
      issues: data.issues || [],
      summary: data.summary || {
        score: 0,
        canMonitor: false,
        canSendMessages: false,
        canAutoReply: false,
        criticalCount: 0,
        warningCount: 0,
        completedSteps: 0,
        totalSteps: 0
      }
    };
  }
  
  /**
   * 清除診斷結果
   */
  clear(): void {
    this._lastResult.set(null);
  }
}
