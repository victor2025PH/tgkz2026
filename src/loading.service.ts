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
}

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  // 活動的加載任務
  private tasks = signal<Map<string, LoadingTask>>(new Map());
  
  // 計算屬性
  isLoading = computed(() => this.tasks().size > 0);
  
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
}
