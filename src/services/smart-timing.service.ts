/**
 * 智能時機優化服務
 * Smart Timing Service
 * 
 * 🆕 P3 階段：智能自動化增強
 * 
 * 功能：
 * - 分析用戶活躍時段
 * - 推薦最佳發送時間
 * - 自動調度營銷任務
 * - 節假日/週末智能處理
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { MarketingAnalyticsService } from './marketing-analytics.service';

// ============ 類型定義 ============

/** 時段統計 */
export interface TimeSlotStats {
  hour: number;           // 0-23
  dayOfWeek: number;      // 0=週日, 1-6=週一至週六
  totalSessions: number;
  responseRate: number;   // 用戶回覆率
  avgResponseTime: number; // 平均回覆時間（分鐘）
  conversionRate: number;
  score: number;          // 綜合評分 0-100
}

/** 推薦時段 */
export interface RecommendedSlot {
  hour: number;
  dayOfWeek: number;
  score: number;
  reason: string;
  predictedResponseRate: number;
}

/** 用戶活躍模式 */
export interface UserActivityPattern {
  userId: string;
  activeHours: number[];    // 活躍小時列表
  preferredDays: number[];  // 偏好的星期幾
  avgResponseDelay: number; // 平均回覆延遲（分鐘）
  lastActiveTime?: Date;
  reliability: number;      // 模式可靠度 0-1
}

/** 調度任務 */
export interface ScheduledTask {
  id: string;
  targetUserId: string;
  targetUserName: string;
  scheduledTime: Date;
  taskType: 'message' | 'follow_up' | 'campaign';
  config: any;
  status: 'pending' | 'executed' | 'cancelled';
  createdAt: Date;
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class SmartTimingService {
  private analytics = inject(MarketingAnalyticsService);
  
  // 時段統計數據
  private _timeSlotStats = signal<Map<string, TimeSlotStats>>(new Map());
  
  // 用戶活躍模式
  private _userPatterns = signal<Map<string, UserActivityPattern>>(new Map());
  
  // 調度任務
  private _scheduledTasks = signal<ScheduledTask[]>([]);
  
  // 計算屬性
  timeSlotStats = computed(() => Array.from(this._timeSlotStats().values()));
  scheduledTasks = this._scheduledTasks.asReadonly();
  
  // 最佳時段（按評分排序）
  topTimeSlots = computed(() => {
    return this.timeSlotStats()
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  });
  
  // 當前時段評分
  currentSlotScore = computed(() => {
    const now = new Date();
    const key = this.getSlotKey(now.getHours(), now.getDay());
    const stats = this._timeSlotStats().get(key);
    return stats?.score ?? 50;
  });
  
  private readonly STORAGE_KEY = 'smartTiming';
  private schedulerInterval: any = null;
  
  constructor() {
    this.loadFromStorage();
    this.startScheduler();
  }
  
  // ============ 時段分析 ============
  
  /**
   * 記錄用戶活動
   */
  recordUserActivity(userId: string, timestamp: Date = new Date()) {
    const hour = timestamp.getHours();
    const dayOfWeek = timestamp.getDay();
    
    // 更新用戶活躍模式
    const existing = this._userPatterns().get(userId);
    if (existing) {
      const activeHours = [...new Set([...existing.activeHours, hour])].slice(-24);
      const preferredDays = [...new Set([...existing.preferredDays, dayOfWeek])].slice(-7);
      
      this._userPatterns.update(m => {
        const newMap = new Map(m);
        newMap.set(userId, {
          ...existing,
          activeHours,
          preferredDays,
          lastActiveTime: timestamp,
          reliability: Math.min(existing.reliability + 0.1, 1)
        });
        return newMap;
      });
    } else {
      this._userPatterns.update(m => {
        const newMap = new Map(m);
        newMap.set(userId, {
          userId,
          activeHours: [hour],
          preferredDays: [dayOfWeek],
          avgResponseDelay: 30,
          lastActiveTime: timestamp,
          reliability: 0.3
        });
        return newMap;
      });
    }
    
    this.saveToStorage();
  }
  
  /**
   * 記錄會話結果（用於更新時段統計）
   */
  recordSessionResult(data: {
    timestamp: Date;
    responded: boolean;
    responseTime?: number;  // 分鐘
    converted: boolean;
  }) {
    const hour = data.timestamp.getHours();
    const dayOfWeek = data.timestamp.getDay();
    const key = this.getSlotKey(hour, dayOfWeek);
    
    const existing = this._timeSlotStats().get(key);
    
    if (existing) {
      const newTotal = existing.totalSessions + 1;
      const responded = data.responded ? 1 : 0;
      const converted = data.converted ? 1 : 0;
      
      const updated: TimeSlotStats = {
        ...existing,
        totalSessions: newTotal,
        responseRate: (existing.responseRate * existing.totalSessions + responded) / newTotal,
        conversionRate: (existing.conversionRate * existing.totalSessions + converted) / newTotal,
        avgResponseTime: data.responseTime 
          ? (existing.avgResponseTime * existing.totalSessions + data.responseTime) / newTotal
          : existing.avgResponseTime,
        score: 0 // 稍後重新計算
      };
      updated.score = this.calculateSlotScore(updated);
      
      this._timeSlotStats.update(m => {
        const newMap = new Map(m);
        newMap.set(key, updated);
        return newMap;
      });
    } else {
      const newStats: TimeSlotStats = {
        hour,
        dayOfWeek,
        totalSessions: 1,
        responseRate: data.responded ? 1 : 0,
        avgResponseTime: data.responseTime ?? 30,
        conversionRate: data.converted ? 1 : 0,
        score: 0
      };
      newStats.score = this.calculateSlotScore(newStats);
      
      this._timeSlotStats.update(m => {
        const newMap = new Map(m);
        newMap.set(key, newStats);
        return newMap;
      });
    }
    
    this.saveToStorage();
  }
  
  /**
   * 計算時段評分
   */
  private calculateSlotScore(stats: TimeSlotStats): number {
    if (stats.totalSessions < 2) {
      return 50; // 數據不足，返回中性分數
    }
    
    let score = 0;
    
    // 回覆率權重 40%
    score += stats.responseRate * 40;
    
    // 轉化率權重 40%
    score += stats.conversionRate * 40;
    
    // 回覆速度權重 20%（越快越好）
    const speedScore = Math.max(0, 1 - stats.avgResponseTime / 120); // 2小時內
    score += speedScore * 20;
    
    // 工作時間加成
    if (stats.hour >= 9 && stats.hour <= 21) {
      score *= 1.1;
    }
    
    // 週末略微降權
    if (stats.dayOfWeek === 0 || stats.dayOfWeek === 6) {
      score *= 0.9;
    }
    
    return Math.min(100, Math.round(score));
  }
  
  // ============ 推薦功能 ============
  
  /**
   * 獲取最佳發送時間
   */
  getBestTimeToSend(targetUserId?: string): RecommendedSlot[] {
    const recommendations: RecommendedSlot[] = [];
    const now = new Date();
    
    // 如果有目標用戶的歷史數據，優先使用
    if (targetUserId) {
      const userPattern = this._userPatterns().get(targetUserId);
      if (userPattern && userPattern.reliability > 0.5) {
        for (const hour of userPattern.activeHours) {
          recommendations.push({
            hour,
            dayOfWeek: now.getDay(),
            score: 85 + Math.random() * 10,
            reason: '基於該用戶的歷史活躍時段',
            predictedResponseRate: 0.7 + Math.random() * 0.2
          });
        }
      }
    }
    
    // 使用全局時段統計
    const topSlots = this.topTimeSlots();
    for (const slot of topSlots.slice(0, 5)) {
      const existingIdx = recommendations.findIndex(r => r.hour === slot.hour);
      if (existingIdx === -1) {
        recommendations.push({
          hour: slot.hour,
          dayOfWeek: slot.dayOfWeek,
          score: slot.score,
          reason: `歷史數據顯示該時段回覆率 ${(slot.responseRate * 100).toFixed(0)}%`,
          predictedResponseRate: slot.responseRate
        });
      }
    }
    
    // 如果沒有足夠數據，使用默認推薦
    if (recommendations.length < 3) {
      const defaultHours = [10, 14, 19, 20];
      for (const hour of defaultHours) {
        if (!recommendations.some(r => r.hour === hour)) {
          recommendations.push({
            hour,
            dayOfWeek: now.getDay(),
            score: 60,
            reason: '基於一般用戶習慣的推薦時段',
            predictedResponseRate: 0.5
          });
        }
      }
    }
    
    return recommendations.sort((a, b) => b.score - a.score).slice(0, 5);
  }
  
  /**
   * 獲取下一個最佳發送時間
   */
  getNextBestTime(targetUserId?: string): Date {
    const recommendations = this.getBestTimeToSend(targetUserId);
    const now = new Date();
    const currentHour = now.getHours();
    
    // 找到今天還未過的最佳時段
    for (const rec of recommendations) {
      if (rec.hour > currentHour) {
        const result = new Date(now);
        result.setHours(rec.hour, 0, 0, 0);
        return result;
      }
    }
    
    // 如果今天沒有更好的時段，返回明天的最佳時段
    const bestHour = recommendations[0]?.hour ?? 10;
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(bestHour, 0, 0, 0);
    return tomorrow;
  }
  
  /**
   * 判斷當前是否是好時機
   */
  isGoodTimeNow(): { isGood: boolean; score: number; suggestion: string } {
    const score = this.currentSlotScore();
    
    if (score >= 75) {
      return { isGood: true, score, suggestion: '✅ 當前是絕佳時機，建議立即發送' };
    } else if (score >= 50) {
      return { isGood: true, score, suggestion: '👌 當前時機尚可，可以發送' };
    } else {
      const nextBest = this.getNextBestTime();
      const hours = Math.round((nextBest.getTime() - Date.now()) / (1000 * 60 * 60));
      return { 
        isGood: false, 
        score, 
        suggestion: `⏰ 建議等待 ${hours} 小時後發送，效果更佳` 
      };
    }
  }
  
  // ============ 調度功能 ============
  
  /**
   * 創建調度任務
   */
  scheduleTask(task: Omit<ScheduledTask, 'id' | 'status' | 'createdAt'>): ScheduledTask {
    const newTask: ScheduledTask = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: new Date()
    };
    
    this._scheduledTasks.update(tasks => [...tasks, newTask]);
    this.saveToStorage();
    
    console.log(`[SmartTiming] 已創建調度任務: ${newTask.id}, 預計執行時間: ${newTask.scheduledTime}`);
    return newTask;
  }
  
  /**
   * 智能調度 - 自動選擇最佳時間
   */
  smartSchedule(task: {
    targetUserId: string;
    targetUserName: string;
    taskType: 'message' | 'follow_up' | 'campaign';
    config: any;
  }): ScheduledTask {
    const bestTime = this.getNextBestTime(task.targetUserId);
    return this.scheduleTask({
      ...task,
      scheduledTime: bestTime
    });
  }
  
  /**
   * 取消調度任務
   */
  cancelTask(taskId: string) {
    this._scheduledTasks.update(tasks => 
      tasks.map(t => t.id === taskId ? { ...t, status: 'cancelled' as const } : t)
    );
    this.saveToStorage();
  }
  
  /**
   * 啟動調度器
   */
  private startScheduler() {
    if (this.schedulerInterval) return;
    
    this.schedulerInterval = setInterval(() => {
      this.checkAndExecuteTasks();
    }, 60000); // 每分鐘檢查一次
    
    console.log('[SmartTiming] 調度器已啟動');
  }
  
  /**
   * 檢查並執行到期任務
   */
  private checkAndExecuteTasks() {
    const now = new Date();
    const pendingTasks = this._scheduledTasks().filter(t => 
      t.status === 'pending' && new Date(t.scheduledTime) <= now
    );
    
    for (const task of pendingTasks) {
      this.executeTask(task);
    }
  }
  
  /**
   * 執行任務
   */
  private executeTask(task: ScheduledTask) {
    console.log(`[SmartTiming] 執行調度任務: ${task.id}`);
    
    // 標記為已執行
    this._scheduledTasks.update(tasks => 
      tasks.map(t => t.id === task.id ? { ...t, status: 'executed' as const } : t)
    );
    
    // 發送事件通知
    window.dispatchEvent(new CustomEvent('scheduled-task-execute', {
      detail: task
    }));
    
    this.saveToStorage();
  }
  
  // ============ 時段可視化數據 ============
  
  /**
   * 獲取熱力圖數據
   */
  getHeatmapData(): { hour: number; day: number; score: number }[] {
    const data: { hour: number; day: number; score: number }[] = [];
    
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const key = this.getSlotKey(hour, day);
        const stats = this._timeSlotStats().get(key);
        data.push({
          hour,
          day,
          score: stats?.score ?? 50
        });
      }
    }
    
    return data;
  }
  
  /**
   * 獲取今日各時段統計
   */
  getTodaySlots(): TimeSlotStats[] {
    const today = new Date().getDay();
    const slots: TimeSlotStats[] = [];
    
    for (let hour = 0; hour < 24; hour++) {
      const key = this.getSlotKey(hour, today);
      const stats = this._timeSlotStats().get(key);
      slots.push(stats ?? {
        hour,
        dayOfWeek: today,
        totalSessions: 0,
        responseRate: 0,
        avgResponseTime: 0,
        conversionRate: 0,
        score: 50
      });
    }
    
    return slots;
  }
  
  // ============ 輔助方法 ============
  
  private getSlotKey(hour: number, dayOfWeek: number): string {
    return `${dayOfWeek}_${hour}`;
  }
  
  private saveToStorage() {
    const data = {
      timeSlotStats: Array.from(this._timeSlotStats().entries()),
      userPatterns: Array.from(this._userPatterns().entries()),
      scheduledTasks: this._scheduledTasks(),
      savedAt: Date.now()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }
  
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;
      
      const data = JSON.parse(stored);
      
      if (data.timeSlotStats) {
        this._timeSlotStats.set(new Map(data.timeSlotStats));
      }
      if (data.userPatterns) {
        const patterns = new Map<string, UserActivityPattern>();
        for (const [k, v] of data.userPatterns) {
          patterns.set(k, {
            ...v,
            lastActiveTime: v.lastActiveTime ? new Date(v.lastActiveTime) : undefined
          });
        }
        this._userPatterns.set(patterns);
      }
      if (data.scheduledTasks) {
        this._scheduledTasks.set(data.scheduledTasks.map((t: any) => ({
          ...t,
          scheduledTime: new Date(t.scheduledTime),
          createdAt: new Date(t.createdAt)
        })));
      }
      
      console.log('[SmartTiming] 已從存儲恢復數據');
    } catch (e) {
      console.error('[SmartTiming] 恢復數據失敗:', e);
    }
  }
}
