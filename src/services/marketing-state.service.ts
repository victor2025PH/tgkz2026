/**
 * 統一營銷狀態服務
 * Unified Marketing State Service
 * 
 * 🆕 P2-1: 統一狀態管理
 * 
 * 職責：
 * - 作為多角色協作和AI中心的狀態協調中心
 * - 提供統一的任務執行狀態
 * - 聚合多個服務的統計數據
 * - 處理跨服務的事件同步
 */

import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { MarketingTaskService } from './marketing-task.service';
import { AICenterService } from '../ai-center/ai-center.service';
import { ElectronIpcService } from '../electron-ipc.service';

// 統一狀態類型
export interface UnifiedMarketingState {
  // 任務狀態
  activeTasks: number;
  totalTasks: number;
  todayContacted: number;
  todayConverted: number;
  
  // AI 狀態
  aiConnected: boolean;
  aiHostingEnabled: boolean;
  todayAiCost: number;
  todayConversations: number;
  
  // 協作狀態
  activeCollaborations: number;
  collaborationSuccessRate: number;
  
  // 系統狀態
  isProcessing: boolean;
  lastSyncTime: string;
}

// 聚合統計
export interface AggregatedStats {
  totalContacted: number;
  totalConverted: number;
  totalMessagesSent: number;
  totalAiCost: number;
  overallConversionRate: number;
  
  // 按日期統計
  daily: {
    date: string;
    contacted: number;
    converted: number;
    messages: number;
    cost: number;
  }[];
  
  // 按目標類型統計
  byGoalType: Record<string, {
    count: number;
    contacted: number;
    converted: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class MarketingStateService implements OnDestroy {
  private taskService = inject(MarketingTaskService);
  private aiService = inject(AICenterService);
  private ipc = inject(ElectronIpcService);
  
  // ============ 統一狀態信號 ============
  
  // AI 托管狀態（跨組件共享）
  private _aiHostingEnabled = signal(false);
  aiHostingEnabled = this._aiHostingEnabled.asReadonly();
  
  // 處理中狀態
  private _isProcessing = signal(false);
  isProcessing = this._isProcessing.asReadonly();
  
  // 最後同步時間
  private _lastSyncTime = signal(new Date().toISOString());
  lastSyncTime = this._lastSyncTime.asReadonly();
  
  // 🆕 Phase 4-1: 統一設置（一處配置，處處生效）
  private _intentThreshold = signal(70);
  intentThreshold = this._intentThreshold.asReadonly();
  
  private _maxConcurrentTasks = signal(5);
  maxConcurrentTasks = this._maxConcurrentTasks.asReadonly();
  
  private _preferredExecutionMode = signal<'scripted' | 'hybrid' | 'scriptless'>('hybrid');
  preferredExecutionMode = this._preferredExecutionMode.asReadonly();
  
  // ============ 計算屬性（聚合多個服務的數據） ============
  
  /**
   * 統一營銷狀態
   */
  unifiedState = computed<UnifiedMarketingState>(() => {
    const taskStats = this.taskService.getOverallStats();
    const aiStats = this.aiService.stats();
    const todayStats = this.taskService.todayStats();
    
    return {
      // 任務狀態
      activeTasks: taskStats.activeTasks,
      totalTasks: taskStats.totalTasks,
      todayContacted: todayStats.contacted,
      todayConverted: todayStats.converted,
      
      // AI 狀態
      aiConnected: this.aiService.isConnected(),
      aiHostingEnabled: this._aiHostingEnabled(),
      todayAiCost: aiStats.today.cost,
      todayConversations: aiStats.today.conversations,
      
      // 協作狀態
      activeCollaborations: taskStats.activeTasks,
      collaborationSuccessRate: taskStats.conversionRate,
      
      // 系統狀態
      isProcessing: this._isProcessing(),
      lastSyncTime: this._lastSyncTime()
    };
  });
  
  /**
   * 聚合統計數據
   */
  aggregatedStats = computed<AggregatedStats>(() => {
    const taskStats = this.taskService.getOverallStats();
    const tasksByGoal = this.taskService.tasksByGoal();
    const tasks = this.taskService.tasks();
    
    // 按目標類型統計
    const byGoalType: Record<string, { count: number; contacted: number; converted: number }> = {};
    
    Object.entries(tasksByGoal).forEach(([goalType, goalTasks]) => {
      byGoalType[goalType] = {
        count: goalTasks.length,
        contacted: goalTasks.reduce((sum, t) => sum + t.stats.contacted, 0),
        converted: goalTasks.reduce((sum, t) => sum + t.stats.converted, 0)
      };
    });
    
    // 按日期統計（最近7天）
    const daily: AggregatedStats['daily'] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayTasks = tasks.filter(t => 
        t.createdAt.startsWith(dateStr) || t.startedAt?.startsWith(dateStr)
      );
      
      daily.push({
        date: dateStr,
        contacted: dayTasks.reduce((sum, t) => sum + t.stats.contacted, 0),
        converted: dayTasks.reduce((sum, t) => sum + t.stats.converted, 0),
        messages: dayTasks.reduce((sum, t) => sum + t.stats.messagesSent, 0),
        cost: dayTasks.reduce((sum, t) => sum + t.stats.aiCost, 0)
      });
    }
    
    return {
      totalContacted: taskStats.totalContacted,
      totalConverted: taskStats.totalConverted,
      totalMessagesSent: taskStats.totalMessagesSent,
      totalAiCost: taskStats.totalAiCost,
      overallConversionRate: taskStats.conversionRate,
      daily,
      byGoalType
    };
  });
  
  /**
   * 是否有活躍任務
   */
  hasActiveTasks = computed(() => this.taskService.activeTasks().length > 0);
  
  /**
   * 今日統計摘要
   */
  todaySummary = computed(() => {
    const today = this.taskService.todayStats();
    const aiStats = this.aiService.stats().today;
    
    return {
      contacted: today.contacted,
      converted: today.converted,
      messagesSent: today.messagesSent,
      conversations: aiStats.conversations,
      aiCost: aiStats.cost,
      conversionRate: today.contacted > 0 
        ? Math.round((today.converted / today.contacted) * 100) 
        : 0
    };
  });
  
  // ============ IPC 訂閱 ============
  
  private cleanups: (() => void)[] = [];
  
  constructor() {
    this.initialize();
  }
  
  private initialize(): void {
    // 從 localStorage 恢復狀態
    this.loadPersistedState();
    
    // 監聽 AI 托管狀態變化
    this.cleanups.push(
      this.ipc.on('ai-hosting-changed', (data: { enabled: boolean }) => {
        this._aiHostingEnabled.set(data.enabled);
      })
    );
    
    // 監聽任務狀態變化
    this.cleanups.push(
      this.ipc.on('marketing-task-started', () => {
        this._isProcessing.set(true);
        this._lastSyncTime.set(new Date().toISOString());
      })
    );
    
    this.cleanups.push(
      this.ipc.on('marketing-task-completed', () => {
        this._isProcessing.set(false);
        this._lastSyncTime.set(new Date().toISOString());
      })
    );
    
    this.cleanups.push(
      this.ipc.on('marketing-task-paused', () => {
        this._isProcessing.set(false);
      })
    );
  }
  
  private loadPersistedState(): void {
    const hosting = localStorage.getItem('ai_hosting_enabled');
    if (hosting !== null) {
      this._aiHostingEnabled.set(hosting === 'true');
    }
    
    // 🆕 Phase 4-1: 加載統一設置
    const threshold = localStorage.getItem('intent_threshold');
    if (threshold) {
      this._intentThreshold.set(parseInt(threshold));
    }
    
    const maxTasks = localStorage.getItem('max_concurrent_tasks');
    if (maxTasks) {
      this._maxConcurrentTasks.set(parseInt(maxTasks));
    }
    
    const mode = localStorage.getItem('preferred_execution_mode');
    if (mode && ['scripted', 'hybrid', 'scriptless'].includes(mode)) {
      this._preferredExecutionMode.set(mode as 'scripted' | 'hybrid' | 'scriptless');
    }
  }
  
  ngOnDestroy(): void {
    this.cleanups.forEach(cleanup => cleanup());
  }
  
  // ============ 狀態操作方法 ============
  
  /**
   * 設置 AI 托管狀態
   */
  setAiHostingEnabled(enabled: boolean): void {
    this._aiHostingEnabled.set(enabled);
    localStorage.setItem('ai_hosting_enabled', String(enabled));
    this.ipc.send('set-ai-hosting', { enabled });
  }
  
  // 🆕 Phase 4-1: 統一設置方法
  
  /**
   * 設置意向閾值
   */
  setIntentThreshold(threshold: number): void {
    this._intentThreshold.set(threshold);
    localStorage.setItem('intent_threshold', String(threshold));
  }
  
  /**
   * 設置最大同時任務數
   */
  setMaxConcurrentTasks(count: number): void {
    this._maxConcurrentTasks.set(count);
    localStorage.setItem('max_concurrent_tasks', String(count));
  }
  
  /**
   * 設置偏好執行模式
   */
  setPreferredExecutionMode(mode: 'scripted' | 'hybrid' | 'scriptless'): void {
    this._preferredExecutionMode.set(mode);
    localStorage.setItem('preferred_execution_mode', mode);
  }
  
  /**
   * 保存所有設置到後端
   */
  saveSettingsToBackend(): void {
    this.ipc.send('save-marketing-settings', {
      intentThreshold: this._intentThreshold(),
      maxConcurrentTasks: this._maxConcurrentTasks(),
      preferredExecutionMode: this._preferredExecutionMode(),
      aiHostingEnabled: this._aiHostingEnabled()
    });
  }
  
  /**
   * 手動觸發狀態同步
   */
  syncState(): void {
    this.taskService.loadTasks();
    this._lastSyncTime.set(new Date().toISOString());
  }
  
  /**
   * 獲取快照統計
   */
  getSnapshot(): UnifiedMarketingState {
    return this.unifiedState();
  }
  
  /**
   * 快速啟動任務（代理到 MarketingTaskService）
   */
  async quickStartTask(goalType: string): Promise<string | null> {
    return this.taskService.quickCreate(goalType as any);
  }
  
  /**
   * 檢查是否可以啟動新任務
   */
  canStartNewTask(): boolean {
    const maxConcurrent = parseInt(localStorage.getItem('max_concurrent_tasks') || '5');
    return this.taskService.activeTasks().length < maxConcurrent;
  }
  
  /**
   * 獲取推薦的下一步操作
   */
  getRecommendedAction(): { type: string; description: string; action: () => void } | null {
    const state = this.unifiedState();
    
    // 沒有配置 AI
    if (!state.aiConnected) {
      return {
        type: 'setup',
        description: '請先配置 AI 模型',
        action: () => this.ipc.send('navigate-to', { path: '/ai-engine' })
      };
    }
    
    // 沒有活躍任務
    if (state.activeTasks === 0) {
      return {
        type: 'start',
        description: '創建您的第一個營銷任務',
        action: () => this.ipc.send('navigate-to', { path: '/smart-marketing' })
      };
    }
    
    // 轉化率低
    if (state.collaborationSuccessRate < 10 && state.totalTasks > 5) {
      return {
        type: 'optimize',
        description: '轉化率偏低，建議優化 AI 人格設置',
        action: () => this.ipc.send('navigate-to', { path: '/ai-engine', query: { tab: 'persona' } })
      };
    }
    
    return null;
  }
}
