/**
 * 操作反饋服務
 * Feedback Service
 * 
 * 🆕 P4 階段：用戶體驗優化
 * 
 * 功能：
 * - 成功/失敗動畫
 * - 進度指示
 * - 微互動反饋
 * - 骨架屏加載
 */

import { Injectable, signal } from '@angular/core';

// ============ 類型定義 ============

/** 反饋類型 */
export type FeedbackType = 'success' | 'error' | 'warning' | 'info' | 'loading';

/** 動畫配置 */
export interface AnimationConfig {
  duration: number;      // 毫秒
  easing: string;
  delay?: number;
}

/** 成功覆蓋層配置 */
export interface SuccessOverlay {
  icon: string;
  title: string;
  subtitle?: string;
  duration?: number;
  confetti?: boolean;
}

/** 進度配置 */
export interface ProgressConfig {
  id: string;
  title: string;
  current: number;
  total: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  details?: string;
}

/** 骨架屏配置 */
export interface SkeletonConfig {
  rows: number;
  columns?: number;
  height?: number;
  animated?: boolean;
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  
  // 成功覆蓋層
  private _successOverlay = signal<SuccessOverlay | null>(null);
  successOverlay = this._successOverlay.asReadonly();
  
  // 全局加載狀態
  private _globalLoading = signal(false);
  private _loadingMessage = signal('');
  globalLoading = this._globalLoading.asReadonly();
  loadingMessage = this._loadingMessage.asReadonly();
  
  // 進度追蹤
  private _progressItems = signal<Map<string, ProgressConfig>>(new Map());
  progressItems = this._progressItems.asReadonly();
  
  // 頁面加載狀態
  private _pageLoading = signal<Map<string, boolean>>(new Map());
  
  // ============ 成功動畫 ============
  
  /**
   * 顯示成功覆蓋層
   */
  showSuccess(config: SuccessOverlay) {
    this._successOverlay.set(config);
    
    // 可選：觸發撒花效果
    if (config.confetti) {
      this.triggerConfetti();
    }
    
    // 自動隱藏
    const duration = config.duration ?? 2000;
    setTimeout(() => {
      this._successOverlay.set(null);
    }, duration);
  }
  
  /**
   * 快捷成功提示
   */
  success(title: string, subtitle?: string) {
    this.showSuccess({
      icon: '✅',
      title,
      subtitle,
      duration: 1500
    });
  }
  
  /**
   * 轉化成功
   */
  conversionSuccess(amount?: number) {
    this.showSuccess({
      icon: '🎉',
      title: '恭喜！成功轉化',
      subtitle: amount ? `成交金額: ¥${amount}` : '客戶已成功轉化',
      duration: 3000,
      confetti: true
    });
  }
  
  /**
   * 任務完成
   */
  taskComplete(taskName: string, count?: number) {
    this.showSuccess({
      icon: '🏆',
      title: taskName,
      subtitle: count ? `完成 ${count} 項任務` : '任務已完成',
      duration: 2000
    });
  }
  
  /**
   * 隱藏成功覆蓋層
   */
  hideSuccess() {
    this._successOverlay.set(null);
  }
  
  // ============ 加載狀態 ============
  
  /**
   * 顯示全局加載
   */
  showLoading(message = '處理中...') {
    this._globalLoading.set(true);
    this._loadingMessage.set(message);
  }
  
  /**
   * 隱藏全局加載
   */
  hideLoading() {
    this._globalLoading.set(false);
    this._loadingMessage.set('');
  }
  
  /**
   * 帶加載的操作
   */
  async withLoading<T>(
    operation: () => Promise<T>,
    message = '處理中...'
  ): Promise<T> {
    this.showLoading(message);
    try {
      return await operation();
    } finally {
      this.hideLoading();
    }
  }
  
  /**
   * 頁面級加載狀態
   */
  setPageLoading(pageId: string, loading: boolean) {
    this._pageLoading.update(map => {
      const newMap = new Map(map);
      if (loading) {
        newMap.set(pageId, true);
      } else {
        newMap.delete(pageId);
      }
      return newMap;
    });
  }
  
  /**
   * 檢查頁面是否加載中
   */
  isPageLoading(pageId: string): boolean {
    return this._pageLoading().get(pageId) ?? false;
  }
  
  // ============ 進度追蹤 ============
  
  /**
   * 開始進度追蹤
   */
  startProgress(id: string, title: string, total: number): ProgressConfig {
    const config: ProgressConfig = {
      id,
      title,
      current: 0,
      total,
      status: 'running'
    };
    
    this._progressItems.update(map => {
      const newMap = new Map(map);
      newMap.set(id, config);
      return newMap;
    });
    
    return config;
  }
  
  /**
   * 更新進度
   */
  updateProgress(id: string, current: number, details?: string) {
    this._progressItems.update(map => {
      const newMap = new Map(map);
      const existing = newMap.get(id);
      if (existing) {
        newMap.set(id, {
          ...existing,
          current,
          details,
          status: current >= existing.total ? 'completed' : 'running'
        });
      }
      return newMap;
    });
  }
  
  /**
   * 完成進度
   */
  completeProgress(id: string, success = true) {
    this._progressItems.update(map => {
      const newMap = new Map(map);
      const existing = newMap.get(id);
      if (existing) {
        newMap.set(id, {
          ...existing,
          current: existing.total,
          status: success ? 'completed' : 'error'
        });
      }
      return newMap;
    });
    
    // 2秒後移除
    setTimeout(() => {
      this.removeProgress(id);
    }, 2000);
  }
  
  /**
   * 移除進度
   */
  removeProgress(id: string) {
    this._progressItems.update(map => {
      const newMap = new Map(map);
      newMap.delete(id);
      return newMap;
    });
  }
  
  // ============ 微互動 ============
  
  /**
   * 按鈕點擊反饋
   */
  buttonClick(element: HTMLElement) {
    element.style.transform = 'scale(0.95)';
    setTimeout(() => {
      element.style.transform = '';
    }, 100);
  }
  
  /**
   * 搖晃效果（錯誤提示）
   */
  shake(element: HTMLElement) {
    element.classList.add('animate-shake');
    setTimeout(() => {
      element.classList.remove('animate-shake');
    }, 500);
  }
  
  /**
   * 高亮效果
   */
  highlight(element: HTMLElement, color = '#8b5cf6') {
    const originalBg = element.style.backgroundColor;
    element.style.backgroundColor = color;
    element.style.transition = 'background-color 0.3s';
    setTimeout(() => {
      element.style.backgroundColor = originalBg;
    }, 300);
  }
  
  /**
   * 脈動效果
   */
  pulse(element: HTMLElement) {
    element.classList.add('animate-pulse');
    setTimeout(() => {
      element.classList.remove('animate-pulse');
    }, 1000);
  }
  
  // ============ 撒花效果 ============
  
  /**
   * 觸發撒花
   */
  private triggerConfetti() {
    const colors = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'];
    const container = document.createElement('div');
    container.className = 'confetti-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10000;
      overflow: hidden;
    `;
    document.body.appendChild(container);
    
    // 創建撒花片
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.style.cssText = `
        position: absolute;
        width: ${Math.random() * 10 + 5}px;
        height: ${Math.random() * 10 + 5}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: ${Math.random() * 100}%;
        top: -20px;
        transform: rotate(${Math.random() * 360}deg);
        animation: confetti-fall ${Math.random() * 2 + 2}s linear forwards;
        opacity: ${Math.random() * 0.5 + 0.5};
      `;
      container.appendChild(confetti);
    }
    
    // 添加動畫樣式
    if (!document.getElementById('confetti-style')) {
      const style = document.createElement('style');
      style.id = 'confetti-style';
      style.textContent = `
        @keyframes confetti-fall {
          to {
            top: 100%;
            opacity: 0;
            transform: rotate(720deg) translateX(${Math.random() * 200 - 100}px);
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `;
      document.head.appendChild(style);
    }
    
    // 清理
    setTimeout(() => {
      container.remove();
    }, 4000);
  }
  
  // ============ 骨架屏 ============
  
  /**
   * 生成骨架屏 HTML
   */
  generateSkeleton(config: SkeletonConfig): string {
    const { rows, columns = 1, height = 20, animated = true } = config;
    const animClass = animated ? 'animate-pulse' : '';
    
    let html = '<div class="skeleton-container space-y-3">';
    
    for (let r = 0; r < rows; r++) {
      if (columns > 1) {
        html += '<div class="flex gap-3">';
        for (let c = 0; c < columns; c++) {
          const width = Math.random() * 30 + 50; // 50-80%
          html += `<div class="bg-slate-700 rounded ${animClass}" style="height: ${height}px; width: ${width}%"></div>`;
        }
        html += '</div>';
      } else {
        const width = Math.random() * 40 + 60; // 60-100%
        html += `<div class="bg-slate-700 rounded ${animClass}" style="height: ${height}px; width: ${width}%"></div>`;
      }
    }
    
    html += '</div>';
    return html;
  }
}
