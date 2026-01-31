/**
 * 統一營銷任務服務
 * Unified Marketing Task Service
 * 
 * 整合多角色協作和AI中心的功能，提供統一的任務管理API
 * 
 * 設計原則：
 * - 單一數據源（Single Source of Truth）
 * - 統一的狀態機管理
 * - 統一的統計口徑
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import {
  MarketingTask,
  TaskTarget,
  TaskStats,
  TaskStatus,
  GoalType,
  ExecutionMode,
  RoleConfig,
  GOAL_TYPE_CONFIG,
  createDefaultTask,
  calculateTaskStats
} from '../models/marketing-task.models';

@Injectable({
  providedIn: 'root'
})
export class MarketingTaskService {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  
  // ============ 狀態管理 ============
  
  // 任務列表
  private _tasks = signal<MarketingTask[]>([]);
  tasks = this._tasks.asReadonly();
  
  // 當前任務
  private _currentTask = signal<MarketingTask | null>(null);
  currentTask = this._currentTask.asReadonly();
  
  // 加載狀態
  private _isLoading = signal(false);
  isLoading = this._isLoading.asReadonly();
  
  // ============ 計算屬性 ============
  
  // 活躍任務數
  activeTasks = computed(() => 
    this._tasks().filter(t => t.status === 'running' || t.status === 'scheduled')
  );
  
  // 今日統計
  todayStats = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = this._tasks().filter(t => 
      t.createdAt.startsWith(today) || t.startedAt?.startsWith(today)
    );
    
    return {
      totalTasks: todayTasks.length,
      contacted: todayTasks.reduce((sum, t) => sum + t.stats.contacted, 0),
      converted: todayTasks.reduce((sum, t) => sum + t.stats.converted, 0),
      messagesSent: todayTasks.reduce((sum, t) => sum + t.stats.messagesSent, 0),
      aiCost: todayTasks.reduce((sum, t) => sum + t.stats.aiCost, 0)
    };
  });
  
  // 按目標類型分組
  tasksByGoal = computed(() => {
    const grouped: Record<GoalType, MarketingTask[]> = {
      conversion: [],
      retention: [],
      engagement: [],
      support: []
    };
    
    this._tasks().forEach(t => {
      grouped[t.goalType]?.push(t);
    });
    
    return grouped;
  });
  
  // 總體轉化率
  overallConversionRate = computed(() => {
    const allTasks = this._tasks().filter(t => t.stats.contacted > 0);
    if (allTasks.length === 0) return 0;
    
    const totalContacted = allTasks.reduce((sum, t) => sum + t.stats.contacted, 0);
    const totalConverted = allTasks.reduce((sum, t) => sum + t.stats.converted, 0);
    
    return totalContacted > 0 ? Math.round((totalConverted / totalContacted) * 100) : 0;
  });
  
  constructor() {
    this.setupIpcListeners();
    this.loadTasks();
  }
  
  private setupIpcListeners(): void {
    // 監聽任務列表更新
    this.ipc.on('marketing-tasks-loaded', (data: any) => {
      if (data.success && data.tasks) {
        this._tasks.set(data.tasks.map(this.normalizeTask));
      }
      this._isLoading.set(false);
    });
    
    // 監聽任務創建結果
    this.ipc.on('marketing-task-created', (data: any) => {
      if (data.success && data.task) {
        this._tasks.update(tasks => [...tasks, this.normalizeTask(data.task)]);
        this.toast.success(`任務「${data.task.name}」創建成功`);
      } else {
        this.toast.error(`創建失敗: ${data.error}`);
      }
    });
    
    // 監聯任務狀態更新
    this.ipc.on('marketing-task-updated', (data: any) => {
      if (data.success && data.task) {
        this._tasks.update(tasks => 
          tasks.map(t => t.id === data.task.id ? this.normalizeTask(data.task) : t)
        );
      }
    });
    
    // 監聽任務統計更新（實時）
    this.ipc.on('marketing-task-stats', (data: any) => {
      if (data.taskId && data.stats) {
        this._tasks.update(tasks => 
          tasks.map(t => t.id === data.taskId 
            ? { ...t, stats: { ...t.stats, ...data.stats } } 
            : t
          )
        );
      }
    });
    
    // 監聽任務刪除
    this.ipc.on('marketing-task-deleted', (data: any) => {
      if (data.success && data.taskId) {
        this._tasks.update(tasks => tasks.filter(t => t.id !== data.taskId));
        this.toast.success('任務已刪除');
      }
    });
  }
  
  // ============ CRUD 操作 ============
  
  /**
   * 加載所有任務
   */
  loadTasks(): void {
    this._isLoading.set(true);
    this.ipc.send('get-marketing-tasks', {});
  }
  
  /**
   * 創建新任務
   */
  async createTask(params: {
    name: string;
    goalType: GoalType;
    executionMode?: ExecutionMode;
    description?: string;
    targetCriteria?: any;
    roleConfig?: RoleConfig[];
    scheduleConfig?: any;
  }): Promise<string | null> {
    const task = {
      ...createDefaultTask(params.goalType),
      ...params,
      createdAt: new Date().toISOString()
    };
    
    return new Promise((resolve) => {
      const cleanup = this.ipc.on('marketing-task-created', (data: any) => {
        cleanup();
        resolve(data.success ? data.task?.id : null);
      });
      
      this.ipc.send('create-marketing-task', task);
      
      // 超時處理
      setTimeout(() => {
        cleanup();
        resolve(null);
      }, 10000);
    });
  }
  
  /**
   * 快速創建任務（基於目標類型）
   */
  async quickCreate(goalType: GoalType, targetUsers?: any[]): Promise<string | null> {
    const config = GOAL_TYPE_CONFIG[goalType];
    
    return this.createTask({
      name: `${config.label} - ${new Date().toLocaleDateString()}`,
      goalType,
      executionMode: config.suggestedMode,
      description: config.description,
      roleConfig: config.suggestedRoles.map(roleType => ({
        roleType,
        roleName: roleType
      }))
    });
  }
  
  /**
   * 更新任務
   */
  updateTask(taskId: string, updates: Partial<MarketingTask>): void {
    this.ipc.send('update-marketing-task', { id: taskId, ...updates });
  }
  
  /**
   * 刪除任務
   */
  deleteTask(taskId: string): void {
    this.ipc.send('delete-marketing-task', { id: taskId });
  }
  
  // ============ 狀態控制 ============
  
  /**
   * 啟動任務
   */
  startTask(taskId: string): void {
    this.updateTask(taskId, { 
      status: 'running',
      startedAt: new Date().toISOString()
    });
    this.ipc.send('start-marketing-task', { id: taskId });
  }
  
  /**
   * 暫停任務
   */
  pauseTask(taskId: string): void {
    this.updateTask(taskId, { status: 'paused' });
    this.ipc.send('pause-marketing-task', { id: taskId });
  }
  
  /**
   * 恢復任務
   */
  resumeTask(taskId: string): void {
    this.updateTask(taskId, { status: 'running' });
    this.ipc.send('resume-marketing-task', { id: taskId });
  }
  
  /**
   * 完成任務
   */
  completeTask(taskId: string): void {
    this.updateTask(taskId, { 
      status: 'completed',
      completedAt: new Date().toISOString()
    });
    this.ipc.send('complete-marketing-task', { id: taskId });
  }
  
  // ============ 🆕 優化 3-1: 批量操作 ============
  
  /**
   * 批量啟動任務
   */
  batchStartTasks(taskIds: string[]): void {
    taskIds.forEach(id => this.startTask(id));
  }
  
  /**
   * 批量暫停任務
   */
  batchPauseTasks(taskIds: string[]): void {
    taskIds.forEach(id => this.pauseTask(id));
  }
  
  /**
   * 批量恢復任務
   */
  batchResumeTasks(taskIds: string[]): void {
    taskIds.forEach(id => this.resumeTask(id));
  }
  
  /**
   * 批量完成任務
   */
  batchCompleteTasks(taskIds: string[]): void {
    taskIds.forEach(id => this.completeTask(id));
  }
  
  /**
   * 批量刪除任務
   */
  batchDeleteTasks(taskIds: string[]): void {
    taskIds.forEach(id => this.deleteTask(id));
  }
  
  /**
   * 批量複製任務
   */
  async batchDuplicateTasks(taskIds: string[]): Promise<string[]> {
    const newIds: string[] = [];
    
    for (const taskId of taskIds) {
      const original = this._tasks().find(t => t.id === taskId);
      if (!original) continue;
      
      const newId = await this.createTask({
        name: `${original.name} (複製)`,
        description: original.description,
        goalType: original.goalType,
        executionMode: original.executionMode,
        roleConfig: original.roleConfig,
        targetCriteria: original.targetCriteria,
        scheduleConfig: original.scheduleConfig
      });
      
      if (newId) newIds.push(newId);
    }
    
    return newIds;
  }
  
  /**
   * 獲取可批量操作的任務
   */
  getBatchOperationTasks(status?: string): MarketingTask[] {
    if (!status) return this._tasks();
    return this._tasks().filter(t => t.status === status);
  }
  
  // ============ 目標用戶管理 ============
  
  /**
   * 添加目標用戶
   */
  addTargets(taskId: string, targets: TaskTarget[]): void {
    this.ipc.send('add-marketing-task-targets', { taskId, targets });
  }
  
  /**
   * 更新目標狀態
   */
  updateTargetStatus(taskId: string, targetId: string, status: string, outcome?: string): void {
    this.ipc.send('update-marketing-task-target', { 
      taskId, 
      targetId, 
      status,
      outcome 
    });
  }
  
  /**
   * 獲取任務目標用戶
   */
  async getTaskTargets(taskId: string): Promise<TaskTarget[]> {
    return new Promise((resolve) => {
      const cleanup = this.ipc.on('marketing-task-targets-loaded', (data: any) => {
        cleanup();
        resolve(data.success ? data.targets : []);
      });
      
      this.ipc.send('get-marketing-task-targets', { taskId });
      
      setTimeout(() => {
        cleanup();
        resolve([]);
      }, 5000);
    });
  }
  
  // ============ 角色管理 ============
  
  /**
   * 分配角色到任務
   */
  assignRole(taskId: string, roleConfig: RoleConfig): void {
    this.ipc.send('assign-marketing-task-role', { taskId, ...roleConfig });
  }
  
  /**
   * 智能匹配角色帳號
   */
  async autoAssignRoles(taskId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const cleanup = this.ipc.on('marketing-task-roles-assigned', (data: any) => {
        cleanup();
        if (data.success) {
          this.toast.success(`已自動分配 ${data.assignedCount} 個角色`);
        }
        resolve(data.success);
      });
      
      this.ipc.send('auto-assign-marketing-task-roles', { taskId });
      
      setTimeout(() => {
        cleanup();
        resolve(false);
      }, 10000);
    });
  }
  
  // ============ 統計查詢 ============
  
  /**
   * 獲取任務詳細統計
   */
  async getTaskStats(taskId: string): Promise<TaskStats | null> {
    return new Promise((resolve) => {
      const cleanup = this.ipc.on('marketing-task-stats-loaded', (data: any) => {
        cleanup();
        resolve(data.success ? data.stats : null);
      });
      
      this.ipc.send('get-marketing-task-stats', { taskId });
      
      setTimeout(() => {
        cleanup();
        resolve(null);
      }, 5000);
    });
  }
  
  /**
   * 獲取總體統計
   */
  getOverallStats(): {
    totalTasks: number;
    activeTasks: number;
    totalContacted: number;
    totalConverted: number;
    conversionRate: number;
    totalMessagesSent: number;
    totalAiCost: number;
  } {
    const tasks = this._tasks();
    
    return {
      totalTasks: tasks.length,
      activeTasks: this.activeTasks().length,
      totalContacted: tasks.reduce((sum, t) => sum + t.stats.contacted, 0),
      totalConverted: tasks.reduce((sum, t) => sum + t.stats.converted, 0),
      conversionRate: this.overallConversionRate(),
      totalMessagesSent: tasks.reduce((sum, t) => sum + t.stats.messagesSent, 0),
      totalAiCost: tasks.reduce((sum, t) => sum + t.stats.aiCost, 0)
    };
  }
  
  // ============ 輔助方法 ============
  
  /**
   * 標準化任務數據
   */
  private normalizeTask(raw: any): MarketingTask {
    return {
      id: String(raw.id),
      name: raw.name || '未命名任務',
      description: raw.description,
      goalType: raw.goal_type || raw.goalType || 'conversion',
      aiConfigId: raw.ai_config_id || raw.aiConfigId,
      executionMode: raw.execution_mode || raw.executionMode || 'hybrid',
      status: raw.status || 'draft',
      currentStage: raw.current_stage || raw.currentStage,
      targetCount: raw.target_count || raw.targetCount || 0,
      targetCriteria: raw.target_criteria ? JSON.parse(raw.target_criteria) : raw.targetCriteria,
      roleConfig: raw.role_config ? JSON.parse(raw.role_config) : raw.roleConfig,
      scriptId: raw.script_id || raw.scriptId,
      scheduleConfig: raw.schedule_config ? JSON.parse(raw.schedule_config) : raw.scheduleConfig,
      triggerConditions: raw.trigger_conditions ? JSON.parse(raw.trigger_conditions) : raw.triggerConditions,
      stats: {
        totalContacts: raw.stats_total_contacts || raw.stats?.totalContacts || 0,
        contacted: raw.stats_contacted || raw.stats?.contacted || 0,
        replied: raw.stats_replied || raw.stats?.replied || 0,
        converted: raw.stats_converted || raw.stats?.converted || 0,
        messagesSent: raw.stats_messages_sent || raw.stats?.messagesSent || 0,
        aiCost: raw.stats_ai_cost || raw.stats?.aiCost || 0,
        contactRate: 0,
        replyRate: 0,
        conversionRate: 0
      },
      createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
      startedAt: raw.started_at || raw.startedAt,
      completedAt: raw.completed_at || raw.completedAt,
      updatedAt: raw.updated_at || raw.updatedAt || new Date().toISOString(),
      createdBy: raw.created_by || raw.createdBy
    };
  }
  
  /**
   * 設置當前查看的任務
   */
  setCurrentTask(task: MarketingTask | null): void {
    this._currentTask.set(task);
  }
  
  /**
   * 根據ID獲取任務
   */
  getTaskById(taskId: string): MarketingTask | undefined {
    return this._tasks().find(t => t.id === taskId);
  }
}
