/**
 * 新手引導服務
 * Onboarding Service
 * 
 * 🆕 體驗優化: 新手引導系統
 * 
 * 功能：
 * - 步驟式引導流程
 * - 高亮目標元素
 * - 進度追蹤
 * - 可跳過和重新開始
 */

import { Injectable, signal, computed } from '@angular/core';

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
  trigger?: 'first_visit' | 'manual' | 'feature_unlock';
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
  private tours: OnboardingTour[] = [
    {
      id: 'welcome',
      name: '歡迎使用',
      description: '快速了解系統的核心功能',
      trigger: 'first_visit',
      version: 1,
      steps: [
        {
          id: 'welcome-intro',
          title: '歡迎使用智能營銷系統！ 🎉',
          description: '這是您的智能營銷助手，讓我們花2分鐘快速了解核心功能。',
          position: 'center',
          skipable: true
        },
        {
          id: 'welcome-accounts',
          title: '1. 添加帳號',
          description: '首先，您需要添加 Telegram 帳號。點擊這裡開始添加您的第一個帳號。',
          target: '[data-tour="accounts"]',
          position: 'bottom',
          actionLabel: '了解了'
        },
        {
          id: 'welcome-marketing',
          title: '2. 營銷任務中心',
          description: '這是您的營銷任務指揮中心。選擇目標、配置 AI，一鍵啟動營銷任務。',
          target: '[data-tour="marketing-hub"]',
          position: 'bottom',
          actionLabel: '下一步'
        },
        {
          id: 'welcome-roles',
          title: '3. 角色資源庫',
          description: '這裡管理 AI 角色和劇本。系統預設了50+專業角色，您也可以自定義。',
          target: '[data-tour="role-library"]',
          position: 'bottom',
          actionLabel: '下一步'
        },
        {
          id: 'welcome-ai',
          title: '4. 智能引擎',
          description: '配置 AI 模型、知識庫和人格風格。建議先完成這裡的配置。',
          target: '[data-tour="ai-engine"]',
          position: 'bottom',
          actionLabel: '下一步'
        },
        {
          id: 'welcome-done',
          title: '準備就緒！ 🚀',
          description: '您已了解基本功能。建議先添加帳號，然後嘗試創建您的第一個營銷任務。\n\n隨時可以在設置中重新查看引導。',
          position: 'center',
          actionLabel: '開始使用'
        }
      ]
    },
    {
      id: 'monitoring-setup',
      name: '群組監控入門',
      description: '學習如何搜索群組、加入並設置關鍵詞監控',
      trigger: 'manual',
      version: 1,
      steps: [
        {
          id: 'monitor-intro',
          title: '群組監控入門 📡',
          description: '群組監控是獲取精準客戶的核心功能。\n\n只需 3 步：搜索群組 → 加入並監控 → 配置關鍵詞，系統會自動捕捉潛在客戶。',
          position: 'center',
          skipable: true
        },
        {
          id: 'monitor-search',
          title: '1. 搜索目標群組',
          description: '在搜索發現頁面輸入行業關鍵詞（如 USDT、代購等），系統會從 Telegram 和第三方搜索引擎同時搜索。',
          target: '[data-tour="search-discovery"]',
          position: 'right',
          actionLabel: '了解了'
        },
        {
          id: 'monitor-join',
          title: '2. 加入並監控',
          description: '在搜索結果中點擊「加入」按鈕。系統會自動加入群組並添加到監控列表。\n\n建議每個 IP 綁定不超過 3 個帳號，降低風控風險。',
          target: '[data-tour="search-results"]',
          position: 'bottom',
          actionLabel: '下一步'
        },
        {
          id: 'monitor-keywords',
          title: '3. 設置監控關鍵詞',
          description: '在監控中心為群組綁定關鍵詞集。當群組中出現匹配的消息時，系統會自動捕捉並生成 Lead。',
          target: '[data-tour="monitoring-center"]',
          position: 'right',
          actionLabel: '下一步'
        },
        {
          id: 'monitor-done',
          title: '設置完成！ 🎯',
          description: '現在您可以：\n• 在「監控中心」管理所有群組\n• 在「關鍵詞集」頁面管理觸發詞\n• 在「潛在客戶」頁面查看捕捉到的 Lead\n\n啟動監控後，系統會 24 小時自動運行。',
          position: 'center',
          actionLabel: '開始使用'
        }
      ]
    },
    {
      id: 'create-task',
      name: '創建營銷任務',
      description: '學習如何創建和配置營銷任務',
      trigger: 'manual',
      version: 1,
      steps: [
        {
          id: 'task-goal',
          title: '選擇營銷目標',
          description: '首先選擇您要達成的目標。不同目標會有不同的 AI 策略。',
          target: '.goal-selector',
          position: 'bottom'
        },
        {
          id: 'task-audience',
          title: '選擇目標客群',
          description: '指定這次任務要觸達的客戶。可以按標籤、群組或意向分數篩選。',
          target: '.audience-selector',
          position: 'bottom'
        },
        {
          id: 'task-config',
          title: '確認 AI 配置',
          description: 'AI 會根據目標自動推薦配置，您也可以手動調整。',
          target: '.config-panel',
          position: 'left'
        },
        {
          id: 'task-launch',
          title: '啟動任務',
          description: '確認無誤後，點擊啟動按鈕。AI 會開始自動執行營銷任務。',
          target: '.launch-button',
          position: 'top'
        }
      ]
    },
    {
      id: 'ai-config',
      name: '配置 AI 引擎',
      description: '學習如何配置 AI 模型和知識庫',
      trigger: 'manual',
      version: 1,
      steps: [
        {
          id: 'ai-model',
          title: '選擇 AI 模型',
          description: '選擇要使用的 AI 模型。GPT-4 效果最好，GPT-3.5 成本最低。',
          target: '[data-tour="ai-model"]',
          position: 'bottom'
        },
        {
          id: 'ai-apikey',
          title: '配置 API Key',
          description: '輸入您的 OpenAI 或其他 AI 服務的 API Key。',
          target: '[data-tour="api-key"]',
          position: 'bottom'
        },
        {
          id: 'ai-knowledge',
          title: '添加知識庫',
          description: '上傳產品資料、FAQ 等文檔，AI 會學習這些知識來回答客戶問題。',
          target: '[data-tour="knowledge-base"]',
          position: 'right'
        },
        {
          id: 'ai-persona',
          title: '設置 AI 人格',
          description: '調整 AI 的說話風格和人格特點，讓回覆更自然。',
          target: '[data-tour="ai-persona"]',
          position: 'bottom'
        }
      ]
    }
  ];
  
  constructor() {
    this.loadProgress();
    this.checkAutoStart();
  }
  
  // ============ 引導控制 ============
  
  /**
   * 開始引導
   */
  startTour(tourId: string): void {
    const tour = this.tours.find(t => t.id === tourId);
    if (!tour) return;
    
    this._currentTour.set(tour);
    this._currentStepIndex.set(0);
    this._isActive.set(true);
    
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
  
  private checkAutoStart(): void {
    // 檢查是否需要自動啟動引導
    for (const tour of this.tours) {
      if (tour.trigger !== 'first_visit') continue;
      
      const progress = this._progress().get(tour.id);
      
      // 如果未完成且未跳過，或者版本更新了
      if (!progress || (progress.version !== tour.version && !progress.completed)) {
        setTimeout(() => this.startTour(tour.id), 1000);
        break;
      }
    }
  }
  
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
