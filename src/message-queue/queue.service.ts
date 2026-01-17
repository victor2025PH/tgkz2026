/**
 * 消息隊列服務
 * Message Queue Service
 * 
 * 功能:
 * 1. 消息排隊管理
 * 2. 自動重試失敗消息
 * 3. 優先級排序
 * 4. 發送速率控制
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { QueuedMessage, QueueStats, MessageStatus } from './queue-dashboard.component';

// 隊列設置
export interface QueueSettings {
  sendInterval: number;      // 發送間隔（秒）
  maxRetries: number;        // 最大重試次數
  randomDelay: boolean;      // 隨機延遲
  randomDelayRange: [number, number]; // 隨機延遲範圍（秒）
  autoRetry: boolean;        // 自動重試
  retryDelay: number;        // 重試延遲（秒）
  maxConcurrent: number;     // 最大並發數
  dailyLimit: number;        // 每日限制
}

// 重試策略
export interface RetryStrategy {
  maxRetries: number;
  delays: number[];  // 每次重試的延遲（秒）
  shouldRetry: (error: string) => boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MessageQueueService {
  
  // 隊列
  private queue = signal<QueuedMessage[]>([]);
  
  // 設置
  settings = signal<QueueSettings>({
    sendInterval: 5,
    maxRetries: 3,
    randomDelay: true,
    randomDelayRange: [3, 10],
    autoRetry: true,
    retryDelay: 30,
    maxConcurrent: 1,
    dailyLimit: 500
  });
  
  // 處理狀態
  isProcessing = signal(false);
  
  // 今日統計
  todayStats = signal({
    sent: 0,
    failed: 0,
    startTime: new Date()
  });
  
  // 重試策略
  private retryStrategies: Record<string, RetryStrategy> = {
    default: {
      maxRetries: 3,
      delays: [30, 60, 120], // 30秒, 1分鐘, 2分鐘
      shouldRetry: () => true
    },
    floodWait: {
      maxRetries: 5,
      delays: [60, 120, 300, 600, 900], // 遞增延遲
      shouldRetry: (error) => error.includes('FloodWait')
    },
    rateLimit: {
      maxRetries: 3,
      delays: [60, 180, 300],
      shouldRetry: (error) => error.includes('rate') || error.includes('limit')
    },
    networkError: {
      maxRetries: 5,
      delays: [10, 20, 30, 60, 120],
      shouldRetry: (error) => error.includes('network') || error.includes('timeout')
    }
  };
  
  // 計算屬性
  messages = computed(() => this.queue());
  
  stats = computed<QueueStats>(() => {
    const msgs = this.queue();
    const pending = msgs.filter(m => m.status === 'pending').length;
    const sending = msgs.filter(m => m.status === 'sending').length;
    const sent = msgs.filter(m => m.status === 'sent').length;
    const failed = msgs.filter(m => m.status === 'failed').length;
    const retrying = msgs.filter(m => m.status === 'retrying').length;
    const total = sent + failed;
    
    return {
      pending,
      sending,
      sent,
      failed,
      retrying,
      totalToday: this.todayStats().sent + pending + sending + failed + retrying,
      successRate: total > 0 ? Math.round((sent / total) * 100) : 100,
      avgSendTime: 0
    };
  });
  
  /**
   * 添加消息到隊列
   */
  enqueue(message: Omit<QueuedMessage, 'id' | 'status' | 'retryCount' | 'createdAt'>): string {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queuedMessage: QueuedMessage = {
      ...message,
      id,
      status: 'pending',
      retryCount: 0,
      maxRetries: this.settings().maxRetries,
      createdAt: new Date()
    };
    
    this.queue.update(q => {
      const newQueue = [...q, queuedMessage];
      // 按優先級排序
      return newQueue.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    });
    
    return id;
  }
  
  /**
   * 批量添加消息
   */
  enqueueBatch(messages: Omit<QueuedMessage, 'id' | 'status' | 'retryCount' | 'createdAt'>[]): string[] {
    return messages.map(m => this.enqueue(m));
  }
  
  /**
   * 重試消息
   */
  retry(messageId: string): boolean {
    const message = this.queue().find(m => m.id === messageId);
    if (!message || message.status !== 'failed') return false;
    
    if (message.retryCount >= message.maxRetries) {
      console.warn(`Message ${messageId} has exceeded max retries`);
      return false;
    }
    
    this.queue.update(q => q.map(m => 
      m.id === messageId 
        ? { ...m, status: 'retrying' as MessageStatus, retryCount: m.retryCount + 1 }
        : m
    ));
    
    // 計算重試延遲
    const strategy = this.getRetryStrategy(message.failReason || '');
    const delay = strategy.delays[Math.min(message.retryCount, strategy.delays.length - 1)] * 1000;
    
    setTimeout(() => {
      this.queue.update(q => q.map(m => 
        m.id === messageId && m.status === 'retrying'
          ? { ...m, status: 'pending' as MessageStatus }
          : m
      ));
    }, delay);
    
    return true;
  }
  
  /**
   * 重試所有失敗消息
   */
  retryAllFailed(): number {
    const failed = this.queue().filter(m => m.status === 'failed' && m.retryCount < m.maxRetries);
    let count = 0;
    
    for (const msg of failed) {
      if (this.retry(msg.id)) count++;
    }
    
    return count;
  }
  
  /**
   * 取消消息
   */
  cancel(messageId: string): boolean {
    const message = this.queue().find(m => m.id === messageId);
    if (!message || (message.status !== 'pending' && message.status !== 'failed')) {
      return false;
    }
    
    this.queue.update(q => q.map(m => 
      m.id === messageId 
        ? { ...m, status: 'cancelled' as MessageStatus }
        : m
    ));
    
    return true;
  }
  
  /**
   * 清除失敗消息
   */
  clearFailed(): void {
    this.queue.update(q => q.filter(m => m.status !== 'failed'));
  }
  
  /**
   * 清除已完成消息
   */
  clearCompleted(): void {
    this.queue.update(q => q.filter(m => m.status !== 'sent' && m.status !== 'cancelled'));
  }
  
  /**
   * 標記消息為發送中
   */
  markSending(messageId: string): void {
    this.queue.update(q => q.map(m => 
      m.id === messageId 
        ? { ...m, status: 'sending' as MessageStatus }
        : m
    ));
  }
  
  /**
   * 標記消息為已發送
   */
  markSent(messageId: string): void {
    this.queue.update(q => q.map(m => 
      m.id === messageId 
        ? { ...m, status: 'sent' as MessageStatus, sentAt: new Date() }
        : m
    ));
    this.todayStats.update(s => ({ ...s, sent: s.sent + 1 }));
  }
  
  /**
   * 標記消息為失敗
   */
  markFailed(messageId: string, reason: string): void {
    this.queue.update(q => q.map(m => 
      m.id === messageId 
        ? { ...m, status: 'failed' as MessageStatus, failedAt: new Date(), failReason: reason }
        : m
    ));
    this.todayStats.update(s => ({ ...s, failed: s.failed + 1 }));
    
    // 自動重試
    if (this.settings().autoRetry) {
      const message = this.queue().find(m => m.id === messageId);
      if (message && message.retryCount < message.maxRetries) {
        const strategy = this.getRetryStrategy(reason);
        if (strategy.shouldRetry(reason)) {
          setTimeout(() => this.retry(messageId), 1000);
        }
      }
    }
  }
  
  /**
   * 獲取下一個待發送消息
   */
  getNext(): QueuedMessage | undefined {
    return this.queue().find(m => m.status === 'pending');
  }
  
  /**
   * 開始處理隊列
   */
  startProcessing(): void {
    this.isProcessing.set(true);
  }
  
  /**
   * 暫停處理隊列
   */
  pauseProcessing(): void {
    this.isProcessing.set(false);
  }
  
  /**
   * 更新設置
   */
  updateSettings(newSettings: Partial<QueueSettings>): void {
    this.settings.update(s => ({ ...s, ...newSettings }));
  }
  
  /**
   * 獲取隨機延遲
   */
  getRandomDelay(): number {
    if (!this.settings().randomDelay) {
      return this.settings().sendInterval * 1000;
    }
    const [min, max] = this.settings().randomDelayRange;
    return (Math.random() * (max - min) + min) * 1000;
  }
  
  /**
   * 獲取重試策略
   */
  private getRetryStrategy(error: string): RetryStrategy {
    for (const [_, strategy] of Object.entries(this.retryStrategies)) {
      if (strategy.shouldRetry(error)) {
        return strategy;
      }
    }
    return this.retryStrategies['default'];
  }
  
  /**
   * 重置今日統計
   */
  resetTodayStats(): void {
    this.todayStats.set({
      sent: 0,
      failed: 0,
      startTime: new Date()
    });
  }
  
  /**
   * 檢查是否達到每日限制
   */
  isAtDailyLimit(): boolean {
    return this.todayStats().sent >= this.settings().dailyLimit;
  }
}
