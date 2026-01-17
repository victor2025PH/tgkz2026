/**
 * TG-AI智控王 培育協調器
 * Nurturing Orchestrator Service v1.0
 * 
 * 功能：
 * - 整合所有培育服務
 * - 統一的培育工作流程
 * - 智能決策和執行
 * - 事件驅動的響應
 */

import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { LeadService } from './lead.service';
import { FollowUpSchedulerService } from './follow-up-scheduler.service';
import { NurturingEngineService } from './nurturing-engine.service';
import { NotificationCenterService } from './notification-center.service';
import { OnlineStatusMonitorService, OnlineStatusChangeEvent } from './online-status-monitor.service';
import { OptimalTimingService, TimingRecommendation } from './optimal-timing.service';
import { FatigueControllerService, ContactDecision } from './fatigue-controller.service';
import { ConversationStrategyService, ConversationStrategy } from './conversation-strategy.service';
import { Lead, ConversationType, FollowUp } from './lead.models';

// ============ 類型定義 ============

/** 培育任務 */
export interface NurturingTask {
  id: string;
  leadId: string;
  type: ConversationType;
  priority: number;
  scheduledAt: Date;
  strategy: ConversationStrategy;
  timing: TimingRecommendation;
  fatigue: ContactDecision;
  generatedContent?: string;
  status: 'pending' | 'ready' | 'executing' | 'completed' | 'skipped' | 'failed';
  createdAt: Date;
  executedAt?: Date;
  result?: {
    success: boolean;
    message?: string;
    error?: string;
  };
}

/** 協調器狀態 */
export interface OrchestratorStatus {
  isRunning: boolean;
  mode: 'auto' | 'semi-auto' | 'manual';
  activeTaskCount: number;
  pendingTaskCount: number;
  completedTodayCount: number;
  skippedTodayCount: number;
  lastCycleAt?: Date;
  nextCycleAt?: Date;
}

/** 培育報告 */
export interface NurturingReport {
  period: { start: Date; end: Date };
  summary: {
    totalTasks: number;
    completed: number;
    skipped: number;
    failed: number;
    responseRate: number;
  };
  byType: {
    business: { count: number; responseRate: number };
    casual: { count: number; responseRate: number };
  };
  topPerformers: { leadId: string; name: string; responseRate: number }[];
  suggestions: string[];
}

@Injectable({
  providedIn: 'root'
})
export class NurturingOrchestratorService implements OnDestroy {
  // 注入所有服務
  private leadService = inject(LeadService);
  private scheduler = inject(FollowUpSchedulerService);
  private nurturingEngine = inject(NurturingEngineService);
  private notificationCenter = inject(NotificationCenterService);
  private onlineMonitor = inject(OnlineStatusMonitorService);
  private optimalTiming = inject(OptimalTimingService);
  private fatigueController = inject(FatigueControllerService);
  private conversationStrategy = inject(ConversationStrategyService);
  
  // ============ 狀態 ============
  
  // 是否運行中
  private _isRunning = signal(false);
  isRunning = computed(() => this._isRunning());
  
  // 運行模式
  private _mode = signal<'auto' | 'semi-auto' | 'manual'>('semi-auto');
  mode = computed(() => this._mode());
  
  // 任務隊列
  private _taskQueue = signal<NurturingTask[]>([]);
  taskQueue = computed(() => this._taskQueue());
  
  // 今日統計
  private _todayStats = signal({
    completed: 0,
    skipped: 0,
    failed: 0,
    responses: 0
  });
  todayStats = computed(() => this._todayStats());
  
  // 協調器狀態
  status = computed<OrchestratorStatus>(() => ({
    isRunning: this._isRunning(),
    mode: this._mode(),
    activeTaskCount: this._taskQueue().filter(t => t.status === 'executing').length,
    pendingTaskCount: this._taskQueue().filter(t => t.status === 'pending' || t.status === 'ready').length,
    completedTodayCount: this._todayStats().completed,
    skippedTodayCount: this._todayStats().skipped,
    lastCycleAt: this._lastCycleAt(),
    nextCycleAt: this._nextCycleAt()
  }));
  
  private _lastCycleAt = signal<Date | undefined>(undefined);
  private _nextCycleAt = signal<Date | undefined>(undefined);
  
  // 定時器
  private orchestrationTimer: any;
  private statusUnsubscribe?: () => void;
  
  constructor() {
    this.loadData();
  }
  
  ngOnDestroy(): void {
    this.stop();
  }
  
  // ============ 生命週期控制 ============
  
  /**
   * 啟動協調器
   */
  start(mode: 'auto' | 'semi-auto' | 'manual' = 'semi-auto'): void {
    if (this._isRunning()) {
      console.log('[Orchestrator] Already running');
      return;
    }
    
    console.log(`[Orchestrator] Starting in ${mode} mode...`);
    this._isRunning.set(true);
    this._mode.set(mode);
    
    // 啟動依賴服務
    this.onlineMonitor.startMonitoring();
    this.scheduler.start();
    
    // 訂閱在線狀態變更
    this.statusUnsubscribe = this.onlineMonitor.onStatusChange((event) => {
      this.handleOnlineStatusChange(event);
    });
    
    // 立即執行一次
    this.runOrchestrationCycle();
    
    // 設置定時執行
    this.orchestrationTimer = setInterval(() => {
      this.runOrchestrationCycle();
    }, 60000); // 每分鐘
    
    console.log('[Orchestrator] Started');
  }
  
  /**
   * 停止協調器
   */
  stop(): void {
    if (!this._isRunning()) return;
    
    console.log('[Orchestrator] Stopping...');
    this._isRunning.set(false);
    
    // 停止依賴服務
    this.onlineMonitor.stopMonitoring();
    this.scheduler.stop();
    
    // 取消訂閱
    if (this.statusUnsubscribe) {
      this.statusUnsubscribe();
    }
    
    // 清除定時器
    if (this.orchestrationTimer) {
      clearInterval(this.orchestrationTimer);
      this.orchestrationTimer = null;
    }
    
    console.log('[Orchestrator] Stopped');
  }
  
  /**
   * 切換模式
   */
  setMode(mode: 'auto' | 'semi-auto' | 'manual'): void {
    this._mode.set(mode);
    console.log(`[Orchestrator] Mode changed to ${mode}`);
  }
  
  // ============ 協調週期 ============
  
  /**
   * 運行協調週期
   */
  private async runOrchestrationCycle(): Promise<void> {
    if (!this._isRunning()) return;
    
    const now = new Date();
    this._lastCycleAt.set(now);
    this._nextCycleAt.set(new Date(now.getTime() + 60000));
    
    console.log('[Orchestrator] Running cycle...');
    
    try {
      // 1. 生成新任務
      await this.generateTasks();
      
      // 2. 評估和排序任務
      this.evaluateAndSortTasks();
      
      // 3. 執行就緒任務（根據模式）
      if (this._mode() === 'auto') {
        await this.executeReadyTasks();
      }
      
      // 4. 清理過期任務
      this.cleanupTasks();
      
      // 5. 保存狀態
      this.saveData();
      
    } catch (error) {
      console.error('[Orchestrator] Cycle error:', error);
    }
  }
  
  /**
   * 生成培育任務
   */
  private async generateTasks(): Promise<void> {
    const leads = this.leadService.leads().filter(l => 
      l.isNurturing && !l.doNotContact
    );
    
    for (const lead of leads) {
      // 檢查是否已有待處理任務
      const existingTask = this._taskQueue().find(t => 
        t.leadId === lead.id && 
        (t.status === 'pending' || t.status === 'ready')
      );
      
      if (existingTask) continue;
      
      // 檢查疲勞度
      const fatigue = this.fatigueController.getFatigueStatus(lead.id);
      if (!fatigue.canContact) continue;
      
      // 獲取時機推薦
      const timing = this.optimalTiming.getRecommendation(lead);
      
      // 檢查是否應該現在創建任務
      const hoursUntilRecommended = (timing.recommendedTime.getTime() - Date.now()) / 3600000;
      if (hoursUntilRecommended > 2) continue; // 超過2小時後的先不創建
      
      // 獲取策略
      const strategy = this.conversationStrategy.getStrategy(lead);
      
      // 創建任務
      const task = this.createTask(lead, timing, strategy);
      
      this._taskQueue.update(queue => [...queue, task]);
    }
  }
  
  /**
   * 創建培育任務
   */
  private createTask(
    lead: Lead,
    timing: TimingRecommendation,
    strategy: ConversationStrategy
  ): NurturingTask {
    const fatigue = this.fatigueController.requestContactPermission(
      lead.id,
      strategy.type === 'business' ? 'businessMessage' : 'casualMessage'
    );
    
    return {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      leadId: lead.id,
      type: strategy.type,
      priority: timing.score.score,
      scheduledAt: timing.recommendedTime,
      strategy,
      timing,
      fatigue,
      status: timing.recommendedTime <= new Date() ? 'ready' : 'pending',
      createdAt: new Date()
    };
  }
  
  /**
   * 評估和排序任務
   */
  private evaluateAndSortTasks(): void {
    const now = new Date();
    
    this._taskQueue.update(queue => {
      return queue
        .map(task => {
          // 更新狀態
          if (task.status === 'pending' && task.scheduledAt <= now) {
            return { ...task, status: 'ready' as const };
          }
          return task;
        })
        .sort((a, b) => {
          // 就緒的優先
          if (a.status === 'ready' && b.status !== 'ready') return -1;
          if (b.status === 'ready' && a.status !== 'ready') return 1;
          // 按優先級排序
          return b.priority - a.priority;
        });
    });
  }
  
  /**
   * 執行就緒任務
   */
  private async executeReadyTasks(): Promise<void> {
    const readyTasks = this._taskQueue().filter(t => t.status === 'ready');
    
    for (const task of readyTasks.slice(0, 5)) { // 每次最多執行5個
      await this.executeTask(task);
      // 任務間延遲
      await this.delay(2000);
    }
  }
  
  /**
   * 執行單個任務
   */
  async executeTask(task: NurturingTask): Promise<void> {
    const lead = this.leadService.getLead(task.leadId);
    if (!lead) {
      this.updateTaskStatus(task.id, 'failed', { success: false, error: '客戶不存在' });
      return;
    }
    
    // 再次檢查疲勞度
    const fatigueCheck = this.fatigueController.requestContactPermission(
      lead.id,
      task.type === 'business' ? 'businessMessage' : 'casualMessage'
    );
    
    if (!fatigueCheck.allowed) {
      this.updateTaskStatus(task.id, 'skipped', { success: false, message: fatigueCheck.reason });
      this._todayStats.update(s => ({ ...s, skipped: s.skipped + 1 }));
      return;
    }
    
    // 標記為執行中
    this.updateTaskStatus(task.id, 'executing');
    
    try {
      // 生成內容（如果還沒有）
      let content = task.generatedContent;
      if (!content) {
        const response = await this.nurturingEngine.generateContent({
          leadId: lead.id,
          type: task.type,
          context: {
            specificTopic: task.strategy.topics[0]
          }
        });
        content = response.content;
        
        // 如果需要人工審核且不是全自動模式
        if (response.requiresHumanReview && this._mode() !== 'auto') {
          // 保存內容並等待人工確認
          this._taskQueue.update(queue =>
            queue.map(t => t.id === task.id 
              ? { ...t, generatedContent: content, status: 'pending' as const }
              : t
            )
          );
          
          // 發送通知
          this.notificationCenter.notify({
            leadId: lead.id,
            type: 'ai_needs_help',
            priority: 'important',
            title: '🤖 AI需要確認',
            message: `給 ${lead.displayName} 的消息需要您確認`,
            suggestedActions: [
              { label: '確認發送', action: 'confirm_send', params: { taskId: task.id } },
              { label: '編輯', action: 'edit_content', params: { taskId: task.id } },
              { label: '跳過', action: 'skip_task', params: { taskId: task.id } }
            ]
          });
          
          return;
        }
      }
      
      // 發送消息
      this.leadService.addMessage(lead.id, content, 'assistant', {
        isAIGenerated: true,
        conversationType: task.type
      });
      
      // 記錄疲勞度
      this.fatigueController.recordContact(
        lead.id,
        task.type === 'business' ? 'businessMessage' : 'casualMessage'
      );
      
      // 更新對話策略狀態
      this.conversationStrategy.updateStateAfterMessage(
        lead.id,
        task.type,
        task.strategy.topics[0]
      );
      
      // 記錄時機結果
      this.optimalTiming.recordContactResult(lead.id, new Date(), false); // 回覆會後續更新
      
      // 完成任務
      this.updateTaskStatus(task.id, 'completed', { 
        success: true,
        message: '消息已發送'
      });
      
      this._todayStats.update(s => ({ ...s, completed: s.completed + 1 }));
      
      console.log(`[Orchestrator] Task completed for ${lead.displayName}`);
      
    } catch (error: any) {
      this.updateTaskStatus(task.id, 'failed', { 
        success: false,
        error: error.message 
      });
      this._todayStats.update(s => ({ ...s, failed: s.failed + 1 }));
      console.error(`[Orchestrator] Task failed:`, error);
    }
  }
  
  /**
   * 更新任務狀態
   */
  private updateTaskStatus(
    taskId: string, 
    status: NurturingTask['status'],
    result?: NurturingTask['result']
  ): void {
    this._taskQueue.update(queue =>
      queue.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          status,
          result,
          executedAt: status === 'completed' || status === 'failed' ? new Date() : t.executedAt
        };
      })
    );
  }
  
  /**
   * 清理過期任務
   */
  private cleanupTasks(): void {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24);
    
    this._taskQueue.update(queue =>
      queue.filter(t => {
        // 保留未完成的任務
        if (t.status === 'pending' || t.status === 'ready' || t.status === 'executing') {
          return true;
        }
        // 只保留24小時內完成的任務
        return t.executedAt && t.executedAt > cutoff;
      })
    );
  }
  
  // ============ 事件處理 ============
  
  /**
   * 處理在線狀態變更
   */
  private handleOnlineStatusChange(event: OnlineStatusChangeEvent): void {
    // 用戶上線時
    if (event.currentStatus === 'online' && event.previousStatus !== 'online') {
      const lead = this.leadService.getLead(event.leadId);
      if (!lead || !lead.isNurturing) return;
      
      // 檢查是否有待處理任務
      const pendingTask = this._taskQueue().find(t => 
        t.leadId === event.leadId && 
        (t.status === 'pending' || t.status === 'ready')
      );
      
      if (pendingTask) {
        // 提升優先級
        this._taskQueue.update(queue =>
          queue.map(t => {
            if (t.id !== pendingTask.id) return t;
            return { ...t, priority: t.priority + 20, status: 'ready' as const };
          })
        );
        
        console.log(`[Orchestrator] Boosted task priority for online user: ${lead.displayName}`);
        
        // 如果是自動模式，立即執行
        if (this._mode() === 'auto') {
          this.executeTask(pendingTask);
        } else {
          // 發送通知
          this.notificationCenter.notify({
            leadId: lead.id,
            type: 'follow_up_due',
            priority: 'important',
            title: `🟢 ${lead.displayName} 已上線`,
            message: '現在是聯繫的好時機',
            suggestedActions: [
              { label: '立即跟進', action: 'execute_task', params: { taskId: pendingTask.id } },
              { label: '稍後', action: 'dismiss', params: {} }
            ]
          });
        }
      }
    }
  }
  
  /**
   * 處理用戶回覆
   */
  handleUserReply(leadId: string, message: string, sentiment: 'positive' | 'neutral' | 'negative'): void {
    // 更新疲勞度
    this.fatigueController.recordUserReply(leadId);
    
    // 檢測購買信號
    const purchaseSignal = this.leadService.detectPurchaseSignal(message);
    
    // 更新對話策略狀態
    this.conversationStrategy.updateStateAfterReply(
      leadId,
      sentiment,
      !!purchaseSignal
    );
    
    // 更新時機學習
    this.optimalTiming.recordContactResult(leadId, new Date(), true);
    
    // 更新今日統計
    this._todayStats.update(s => ({ ...s, responses: s.responses + 1 }));
    
    // 如果是負面情緒，觸發暫停
    if (sentiment === 'negative') {
      this.fatigueController.recordNegativeSentiment(leadId);
    }
    
    // 如果有購買信號，發送通知
    if (purchaseSignal && purchaseSignal.type === 'strong') {
      this.notificationCenter.notifyPurchaseIntent({
        leadId,
        signal: purchaseSignal.signal,
        message,
        signalType: purchaseSignal.type
      });
    }
  }
  
  // ============ 手動操作 ============
  
  /**
   * 手動觸發跟進
   */
  async triggerFollowUp(leadId: string, type?: ConversationType): Promise<NurturingTask | null> {
    const lead = this.leadService.getLead(leadId);
    if (!lead) return null;
    
    const timing = this.optimalTiming.getRecommendation(lead, type);
    const strategy = this.conversationStrategy.getStrategy(lead);
    
    if (type) {
      strategy.type = type;
    }
    
    const task = this.createTask(lead, timing, strategy);
    task.status = 'ready';
    task.scheduledAt = new Date();
    
    this._taskQueue.update(queue => [...queue, task]);
    
    // 如果是自動模式，立即執行
    if (this._mode() === 'auto') {
      await this.executeTask(task);
    }
    
    return task;
  }
  
  /**
   * 確認發送任務
   */
  async confirmTask(taskId: string, editedContent?: string): Promise<void> {
    const task = this._taskQueue().find(t => t.id === taskId);
    if (!task) return;
    
    if (editedContent) {
      this._taskQueue.update(queue =>
        queue.map(t => t.id === taskId ? { ...t, generatedContent: editedContent } : t)
      );
    }
    
    await this.executeTask({ ...task, generatedContent: editedContent || task.generatedContent });
  }
  
  /**
   * 跳過任務
   */
  skipTask(taskId: string, reason?: string): void {
    this.updateTaskStatus(taskId, 'skipped', { success: false, message: reason || '手動跳過' });
    this._todayStats.update(s => ({ ...s, skipped: s.skipped + 1 }));
  }
  
  /**
   * 獲取任務詳情
   */
  getTask(taskId: string): NurturingTask | undefined {
    return this._taskQueue().find(t => t.id === taskId);
  }
  
  /**
   * 獲取客戶的待處理任務
   */
  getLeadTasks(leadId: string): NurturingTask[] {
    return this._taskQueue().filter(t => t.leadId === leadId);
  }
  
  // ============ 報告 ============
  
  /**
   * 生成培育報告
   */
  generateReport(days: number = 7): NurturingReport {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // 這裡需要從歷史數據計算
    // 目前使用今日統計作為示例
    const stats = this._todayStats();
    
    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalTasks: stats.completed + stats.skipped + stats.failed,
        completed: stats.completed,
        skipped: stats.skipped,
        failed: stats.failed,
        responseRate: stats.completed > 0 ? stats.responses / stats.completed : 0
      },
      byType: {
        business: { count: 0, responseRate: 0 },
        casual: { count: 0, responseRate: 0 }
      },
      topPerformers: [],
      suggestions: this.generateSuggestions()
    };
  }
  
  /**
   * 生成建議
   */
  private generateSuggestions(): string[] {
    const suggestions: string[] = [];
    const stats = this._todayStats();
    const fatigueStats = this.fatigueController.getFatigueStats();
    
    if (stats.completed > 0 && stats.responses / stats.completed < 0.2) {
      suggestions.push('回覆率較低，建議增加情感維護比例');
    }
    
    if (fatigueStats.fatigued > fatigueStats.totalLeads * 0.3) {
      suggestions.push('較多客戶疲勞度較高，建議降低跟進頻率');
    }
    
    if (stats.skipped > stats.completed) {
      suggestions.push('跳過任務較多，建議檢查跟進策略');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('培育進展良好，繼續保持');
    }
    
    return suggestions;
  }
  
  // ============ 輔助方法 ============
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // ============ 持久化 ============
  
  private saveData(): void {
    try {
      // 只保存待處理的任務
      const pendingTasks = this._taskQueue().filter(t => 
        t.status === 'pending' || t.status === 'ready'
      );
      
      localStorage.setItem('tgai-nurturing-tasks', JSON.stringify(pendingTasks));
      localStorage.setItem('tgai-nurturing-today-stats', JSON.stringify({
        date: new Date().toDateString(),
        stats: this._todayStats()
      }));
    } catch (e) {
      console.error('[Orchestrator] Save error:', e);
    }
  }
  
  private loadData(): void {
    try {
      const tasksData = localStorage.getItem('tgai-nurturing-tasks');
      if (tasksData) {
        const tasks = JSON.parse(tasksData).map((t: any) => ({
          ...t,
          scheduledAt: new Date(t.scheduledAt),
          createdAt: new Date(t.createdAt)
        }));
        this._taskQueue.set(tasks);
      }
      
      const statsData = localStorage.getItem('tgai-nurturing-today-stats');
      if (statsData) {
        const { date, stats } = JSON.parse(statsData);
        if (date === new Date().toDateString()) {
          this._todayStats.set(stats);
        }
      }
    } catch (e) {
      console.error('[Orchestrator] Load error:', e);
    }
  }
}
