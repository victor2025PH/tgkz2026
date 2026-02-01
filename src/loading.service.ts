/**
 * Loading Service
 * 全局加載狀態管理服務
 */
import { Injectable, signal, computed } from '@angular/core';

export interface LoadingTask {
  id: string;
  message: string;
  progress?: number;  // 0-100
  startTime: number;
  type: 'spinner' | 'progress' | 'skeleton';
  blocking?: boolean;  // 🆕 是否阻塞 UI（全屏遮罩）
}

// 🆕 連接階段
export type ConnectionStage = 'connecting' | 'loading-data' | 'initializing' | 'ready' | 'error';

export interface ConnectionState {
  stage: ConnectionStage;
  progress: number;
  message: string;
  startTime: number;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  // 活動的加載任務
  private tasks = signal<Map<string, LoadingTask>>(new Map());
  
  // 🆕 非阻塞式連接狀態（用於初始啟動）
  connectionState = signal<ConnectionState>({
    stage: 'connecting',
    progress: 0,
    message: '正在連接後端服務...',
    startTime: Date.now()
  });
  
  // 🆕 是否顯示連接狀態（非阻塞式，顯示在主內容區）
  showConnectionStatus = signal(true);
  
  // 計算屬性 - 🆕 只有阻塞式任務才顯示全屏遮罩
  isLoading = computed(() => {
    const taskMap = this.tasks();
    for (const task of taskMap.values()) {
      if (task.blocking !== false) {
        return true;
      }
    }
    return false;
  });
  
  currentTask = computed(() => {
    const taskMap = this.tasks();
    if (taskMap.size === 0) return null;
    
    // 返回最新的任務
    const tasksArray = Array.from(taskMap.values());
    return tasksArray[tasksArray.length - 1];
  });
  
  message = computed(() => this.currentTask()?.message || '');
  progress = computed(() => this.currentTask()?.progress);
  
  taskCount = computed(() => this.tasks().size);
  
  /**
   * 開始加載
   */
  start(message: string = '載入中...', id?: string): string {
    const taskId = id || this.generateId();
    
    this.tasks.update(tasks => {
      const newTasks = new Map(tasks);
      newTasks.set(taskId, {
        id: taskId,
        message,
        startTime: Date.now(),
        type: 'spinner'
      });
      return newTasks;
    });
    
    return taskId;
  }
  
  /**
   * 開始帶進度的加載
   */
  startWithProgress(message: string, id?: string): string {
    const taskId = id || this.generateId();
    
    this.tasks.update(tasks => {
      const newTasks = new Map(tasks);
      newTasks.set(taskId, {
        id: taskId,
        message,
        progress: 0,
        startTime: Date.now(),
        type: 'progress'
      });
      return newTasks;
    });
    
    return taskId;
  }
  
  /**
   * 更新進度
   */
  updateProgress(taskId: string, progress: number, message?: string): void {
    this.tasks.update(tasks => {
      const newTasks = new Map(tasks);
      const task = newTasks.get(taskId);
      
      if (task) {
        newTasks.set(taskId, {
          ...task,
          progress: Math.min(100, Math.max(0, progress)),
          message: message || task.message
        });
      }
      
      return newTasks;
    });
  }
  
  /**
   * 更新消息
   */
  updateMessage(taskId: string, message: string): void {
    this.tasks.update(tasks => {
      const newTasks = new Map(tasks);
      const task = newTasks.get(taskId);
      
      if (task) {
        newTasks.set(taskId, { ...task, message });
      }
      
      return newTasks;
    });
  }
  
  /**
   * 結束加載
   */
  stop(taskId: string): void {
    this.tasks.update(tasks => {
      const newTasks = new Map(tasks);
      newTasks.delete(taskId);
      return newTasks;
    });
  }
  
  /**
   * 結束所有加載
   */
  stopAll(): void {
    this.tasks.set(new Map());
  }
  
  /**
   * 包裝異步操作
   */
  async wrap<T>(
    promise: Promise<T>,
    message: string = '載入中...'
  ): Promise<T> {
    const taskId = this.start(message);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.stop(taskId);
    }
  }
  
  /**
   * 包裝帶進度的異步操作
   */
  async wrapWithProgress<T>(
    operation: (updateProgress: (progress: number, message?: string) => void) => Promise<T>,
    message: string = '處理中...'
  ): Promise<T> {
    const taskId = this.startWithProgress(message);
    
    try {
      const result = await operation((progress, msg) => {
        this.updateProgress(taskId, progress, msg);
      });
      return result;
    } finally {
      this.stop(taskId);
    }
  }
  
  private generateId(): string {
    return 'load-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
  
  // ========== 🆕 非阻塞式連接狀態管理 ==========
  
  /**
   * 開始非阻塞式連接（不顯示全屏遮罩）
   */
  startConnection(): void {
    this.showConnectionStatus.set(true);
    this.connectionState.set({
      stage: 'connecting',
      progress: 5,
      message: '正在連接後端服務...',
      startTime: Date.now()
    });
    
    // 自動進度模擬（給用戶即時反饋）
    this.simulateConnectionProgress();
  }
  
  /**
   * 模擬連接進度（避免卡在 0%）
   */
  private connectionProgressTimer: any = null;
  private simulateConnectionProgress(): void {
    if (this.connectionProgressTimer) {
      clearInterval(this.connectionProgressTimer);
    }
    
    this.connectionProgressTimer = setInterval(() => {
      const state = this.connectionState();
      if (state.stage === 'connecting' && state.progress < 25) {
        this.connectionState.update(s => ({
          ...s,
          progress: Math.min(25, s.progress + 2)
        }));
      } else if (state.stage === 'loading-data' && state.progress < 75) {
        this.connectionState.update(s => ({
          ...s,
          progress: Math.min(75, s.progress + 1)
        }));
      }
    }, 200);
  }
  
  /**
   * 更新連接階段
   */
  updateConnectionStage(stage: ConnectionStage, message?: string): void {
    const progressMap: Record<ConnectionStage, number> = {
      'connecting': 10,
      'loading-data': 40,
      'initializing': 70,
      'ready': 100,
      'error': 0
    };
    
    this.connectionState.update(s => ({
      ...s,
      stage,
      progress: progressMap[stage],
      message: message || this.getStageMessage(stage)
    }));
    
    if (stage === 'ready' || stage === 'error') {
      if (this.connectionProgressTimer) {
        clearInterval(this.connectionProgressTimer);
        this.connectionProgressTimer = null;
      }
      
      // 成功後延遲隱藏
      if (stage === 'ready') {
        setTimeout(() => {
          this.showConnectionStatus.set(false);
        }, 500);
      }
    }
  }
  
  /**
   * 連接失敗
   */
  connectionError(error: string): void {
    if (this.connectionProgressTimer) {
      clearInterval(this.connectionProgressTimer);
    }
    
    this.connectionState.set({
      stage: 'error',
      progress: 0,
      message: '連接失敗',
      startTime: Date.now(),
      error
    });
  }
  
  /**
   * 隱藏連接狀態
   */
  hideConnectionStatus(): void {
    this.showConnectionStatus.set(false);
  }
  
  private getStageMessage(stage: ConnectionStage): string {
    switch (stage) {
      case 'connecting': return '正在連接後端服務...';
      case 'loading-data': return '正在載入數據...';
      case 'initializing': return '正在初始化...';
      case 'ready': return '連接成功';
      case 'error': return '連接失敗';
    }
  }
}
