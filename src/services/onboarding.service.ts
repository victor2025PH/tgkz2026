/**
 * 新手引導服務（Spotlight 導覽）
 * Onboarding Service
 *
 * 職責邊界（與其他引導系統的分工）：
 * - 首登陸歡迎：OnboardingComponent（3步彈窗，app.component.html 掛載）
 * - 下一步引導：儀表板 5 步上手進度環（狀態驅動）
 * - 頁面內引導：各頁空狀態引導卡
 * - 本服務：關鍵頁「首訪 spotlight」——僅在用戶尚未配置該頁功能時，
 *   高亮頁面元素做一次性定向導覽（可跳過、ESC 關閉、進度持久化）
 *
 * 使用方式：頁面組件在數據載入後調用 startTourIfFirstVisit(tourId)，
 * 已完成/已跳過的 tour 不會重複出現。
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { AuditTrackerService } from './audit-tracker.service';

// 引導步驟
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string;           // CSS 選擇器
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: string;           // 需要用戶執行的動作
  actionLabel?: string;
  skipable?: boolean;
  beforeShow?: () => void;
  afterComplete?: () => void;
}

// 引導流程
export interface OnboardingTour {
  id: string;
  name: string;
  description: string;
  steps: OnboardingStep[];
  version?: number;          // 版本號，用於重新觸發
}

// 用戶進度
export interface OnboardingProgress {
  tourId: string;
  currentStep: number;
  completed: boolean;
  skipped: boolean;
  completedAt?: string;
  version?: number;
}

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  private audit = inject(AuditTrackerService);
  /** 當前 tour 開始時間（埋點耗時用） */
  private tourStartedAt = 0;

  // 狀態
  private _isActive = signal(false);
  isActive = this._isActive.asReadonly();
  
  private _currentTour = signal<OnboardingTour | null>(null);
  currentTour = this._currentTour.asReadonly();
  
  private _currentStepIndex = signal(0);
  currentStepIndex = this._currentStepIndex.asReadonly();
  
  private _progress = signal<Map<string, OnboardingProgress>>(new Map());
  
  // 計算屬性
  currentStep = computed(() => {
    const tour = this._currentTour();
    const index = this._currentStepIndex();
    return tour?.steps[index] || null;
  });
  
  totalSteps = computed(() => this._currentTour()?.steps.length || 0);
  
  progressPercent = computed(() => {
    const total = this.totalSteps();
    if (total === 0) return 0;
    return Math.round((this._currentStepIndex() / total) * 100);
  });
  
  // 預設引導流程
  // 注意：target 選擇器必須是頁面上真實存在的 data-tour 錨點，
  // 錨點不存在時該步驟會自動退化為居中卡片（不會壞，但體驗打折）
  private tours: OnboardingTour[] = [
    {
      id: 'monitoring-flow',
      name: '監控中心導覽',
      description: '了解群組、關鍵詞、觸發規則三者如何協作',
      version: 1,
      steps: [
        {
          id: 'flow-intro',
          title: '歡迎來到監控中心 📡',
          description: '自動獲客的核心配置都在這裡，只有三件事：\n\n監控群組（在哪裡聽）→ 關鍵詞集（聽什麼）→ 觸發規則（聽到後做什麼）',
          position: 'center',
          skipable: true,
          actionLabel: '帶我看看'
        },
        {
          id: 'flow-groups',
          title: '1. 監控群組',
          description: '選擇要監聽的目標群組。可以從「搜索發現」加入新群組，也可以添加帳號已在的群組。',
          target: '[data-tour="monitoring-tab-groups"]',
          position: 'bottom',
          actionLabel: '下一步'
        },
        {
          id: 'flow-keywords',
          title: '2. 關鍵詞集',
          description: '定義要捕捉的觸發詞（如行業詞、意向詞）。群組消息命中關鍵詞時，系統自動生成潛在客戶線索。',
          target: '[data-tour="monitoring-tab-keywords"]',
          position: 'bottom',
          actionLabel: '下一步'
        },
        {
          id: 'flow-rules',
          title: '3. 觸發規則',
          description: '設定命中後的自動動作（AI 回覆、私聊培育、通知等）。\n\n配置完成後，回到儀表板點「一鍵啟動」即可開始自動獲客。',
          target: '[data-tour="monitoring-tab-rules"]',
          position: 'bottom',
          actionLabel: '開始配置'
        }
      ]
    }
  ];
  
  constructor() {
    this.loadProgress();
  }
  
  // ============ 引導控制 ============
  
  /**
   * 關鍵頁首訪觸發：僅當該 tour 從未完成/跳過（或版本更新）時啟動。
   * 由頁面組件在數據載入完成後調用，避免對已配置的老用戶彈導覽。
   */
  startTourIfFirstVisit(tourId: string): boolean {
    const tour = this.tours.find(t => t.id === tourId);
    if (!tour) return false;
    if (this._isActive()) return false;
    
    const progress = this._progress().get(tourId);
    const seen = progress && (progress.completed || progress.skipped) && progress.version === tour.version;
    if (seen) return false;
    
    this.startTour(tourId);
    return true;
  }
  
  /**
   * 開始引導
   */
  startTour(tourId: string): void {
    const tour = this.tours.find(t => t.id === tourId);
    if (!tour) return;
    
    this._currentTour.set(tour);
    this._currentStepIndex.set(0);
    this._isActive.set(true);
    this.tourStartedAt = Date.now();
    this.audit.trackTour('started', tour.id, { totalSteps: tour.steps.length });

    const step = tour.steps[0];
    step.beforeShow?.();
    
    this.highlightTarget(step.target);
  }
  
  /**
   * 下一步
   */
  nextStep(): void {
    const tour = this._currentTour();
    if (!tour) return;
    
    const currentStep = this.currentStep();
    currentStep?.afterComplete?.();
    
    const nextIndex = this._currentStepIndex() + 1;
    
    if (nextIndex >= tour.steps.length) {
      this.completeTour();
    } else {
      this._currentStepIndex.set(nextIndex);
      const step = tour.steps[nextIndex];
      step.beforeShow?.();
      this.highlightTarget(step.target);
    }
  }
  
  /**
   * 上一步
   */
  prevStep(): void {
    const prevIndex = this._currentStepIndex() - 1;
    if (prevIndex < 0) return;
    
    this._currentStepIndex.set(prevIndex);
    const step = this._currentTour()?.steps[prevIndex];
    if (step) {
      step.beforeShow?.();
      this.highlightTarget(step.target);
    }
  }
  
  /**
   * 跳到指定步驟
   */
  goToStep(index: number): void {
    const tour = this._currentTour();
    if (!tour || index < 0 || index >= tour.steps.length) return;
    
    this._currentStepIndex.set(index);
    const step = tour.steps[index];
    step.beforeShow?.();
    this.highlightTarget(step.target);
  }
  
  /**
   * 跳過引導
   */
  skipTour(): void {
    const tour = this._currentTour();
    if (!tour) return;
    
    // 埋點：跳過時記錄卡在哪一步 + 停留時長（完成率分析核心數據）
    this.audit.trackTour('skipped', tour.id, {
      atStep: this._currentStepIndex(),
      totalSteps: tour.steps.length,
      durationMs: this.tourStartedAt ? Date.now() - this.tourStartedAt : 0
    });

    this.updateProgress(tour.id, {
      tourId: tour.id,
      currentStep: this._currentStepIndex(),
      completed: false,
      skipped: true,
      version: tour.version
    });
    
    this.closeTour();
  }
  
  /**
   * 完成引導
   */
  completeTour(): void {
    const tour = this._currentTour();
    if (!tour) return;
    
    this.audit.trackTour('completed', tour.id, {
      durationMs: this.tourStartedAt ? Date.now() - this.tourStartedAt : 0
    });

    this.updateProgress(tour.id, {
      tourId: tour.id,
      currentStep: tour.steps.length,
      completed: true,
      skipped: false,
      completedAt: new Date().toISOString(),
      version: tour.version
    });
    
    this.closeTour();
  }
  
  /**
   * 關閉引導
   */
  closeTour(): void {
    this.clearHighlight();
    this._isActive.set(false);
    this._currentTour.set(null);
    this._currentStepIndex.set(0);
  }
  
  // ============ 進度管理 ============
  
  /**
   * 檢查是否已完成
   */
  isCompleted(tourId: string): boolean {
    const progress = this._progress().get(tourId);
    return progress?.completed || false;
  }
  
  /**
   * 重置引導
   */
  resetTour(tourId: string): void {
    this._progress.update(p => {
      const newMap = new Map(p);
      newMap.delete(tourId);
      return newMap;
    });
    this.saveProgress();
  }
  
  /**
   * 重置所有引導
   */
  resetAll(): void {
    this._progress.set(new Map());
    this.saveProgress();
  }
  
  /**
   * 獲取可用的引導列表
   */
  getAvailableTours(): OnboardingTour[] {
    return this.tours;
  }
  
  // ============ 私有方法 ============
  
  private updateProgress(tourId: string, progress: OnboardingProgress): void {
    this._progress.update(p => {
      const newMap = new Map(p);
      newMap.set(tourId, progress);
      return newMap;
    });
    this.saveProgress();
  }
  
  private highlightTarget(selector?: string): void {
    this.clearHighlight();
    
    if (!selector) return;
    
    const element = document.querySelector(selector);
    if (element) {
      element.classList.add('onboarding-highlight');
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  private clearHighlight(): void {
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });
  }
  
  private loadProgress(): void {
    try {
      const saved = localStorage.getItem('onboarding_progress');
      if (saved) {
        const data = JSON.parse(saved);
        this._progress.set(new Map(Object.entries(data)));
      }
    } catch (e) {
      console.error('Failed to load onboarding progress:', e);
    }
  }
  
  private saveProgress(): void {
    const data = Object.fromEntries(this._progress());
    localStorage.setItem('onboarding_progress', JSON.stringify(data));
  }
}
