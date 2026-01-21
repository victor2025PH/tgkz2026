/**
 * 互動式新手引導服務
 * Guided Tour Service
 * 
 * 功能：
 * 1. 步驟式引導
 * 2. 高亮目標元素
 * 3. 動態定位提示框
 * 4. 跳過/完成/重啟
 * 5. 進度追蹤
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ToastService } from '../toast.service';

// 引導步驟
export interface TourStep {
  id: string;
  target: string;           // CSS 選擇器
  title: string;
  content: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: 'click' | 'input' | 'navigate';
  actionTarget?: string;    // 導航目標或輸入框選擇器
  highlight?: boolean;      // 是否高亮目標
  allowSkip?: boolean;      // 是否允許跳過此步
  waitFor?: string;         // 等待某元素出現
  onEnter?: () => void;     // 進入步驟時執行
  onExit?: () => void;      // 離開步驟時執行
}

// 引導旅程
export interface Tour {
  id: string;
  name: string;
  description: string;
  icon: string;
  steps: TourStep[];
  category: 'basics' | 'marketing' | 'ai' | 'advanced';
  estimatedTime: number;    // 預計分鐘數
  requiredLevel?: string;   // 需要會員等級
}

// 引導狀態
export interface TourState {
  tourId: string;
  currentStep: number;
  startedAt: string;
  completedSteps: string[];
  skippedSteps: string[];
}

// 預設引導旅程
const DEFAULT_TOURS: Tour[] = [
  {
    id: 'quick-start',
    name: '快速入門',
    description: '5 分鐘了解 TG-Matrix 核心功能',
    icon: '🚀',
    category: 'basics',
    estimatedTime: 5,
    steps: [
      {
        id: 'welcome',
        target: 'body',
        title: '歡迎使用 TG-Matrix！',
        content: '這是一個強大的 Telegram 智能營銷平台。讓我們一起探索它的核心功能吧！',
        placement: 'center',
        highlight: false
      },
      {
        id: 'sidebar',
        target: '.sidebar',
        title: '側邊導航欄',
        content: '這裡是主導航區域。您可以快速切換到不同功能模塊。',
        placement: 'right',
        highlight: true
      },
      {
        id: 'dashboard',
        target: '[data-tour="dashboard"]',
        title: '智能儀表板',
        content: '儀表板展示系統概覽、關鍵指標和 AI 智能洞察。點擊「智能模式」體驗全新界面！',
        placement: 'right',
        highlight: true
      },
      {
        id: 'accounts',
        target: '[data-tour="accounts"]',
        title: '帳戶管理',
        content: '在這裡添加和管理您的 Telegram 帳號。支持手機號登錄和 Session 文件導入。',
        placement: 'right',
        highlight: true
      },
      {
        id: 'ai-section',
        target: '[data-tour="ai-section"]',
        title: 'AI 智能營銷',
        content: '這是核心功能區！包括策略規劃、自動執行和數據洞察三大模塊。',
        placement: 'right',
        highlight: true
      },
      {
        id: 'complete',
        target: 'body',
        title: '🎉 入門完成！',
        content: '您已了解基本功能。接下來可以添加帳號開始使用，或繼續探索更多進階功能！',
        placement: 'center',
        highlight: false
      }
    ]
  },
  {
    id: 'ai-marketing',
    name: 'AI 營銷之旅',
    description: '學習如何使用 AI 自動化營銷',
    icon: '🤖',
    category: 'ai',
    estimatedTime: 8,
    steps: [
      {
        id: 'intro',
        target: 'body',
        title: 'AI 營銷自動化',
        content: 'TG-Matrix 提供完整的 AI 營銷解決方案，從策略規劃到自動執行，一站式完成！',
        placement: 'center'
      },
      {
        id: 'strategy',
        target: '[data-tour="ai-assistant"]',
        title: '步驟 1: 策略規劃',
        content: '首先使用 AI 營銷助手，輸入您的產品/服務信息，AI 會自動生成完整營銷策略。',
        placement: 'right',
        highlight: true,
        action: 'navigate',
        actionTarget: 'ai-assistant'
      },
      {
        id: 'generate',
        target: '.strategy-input',
        title: '輸入營銷需求',
        content: '描述您的目標客戶、產品特點、營銷目標。AI 會分析並生成策略方案。',
        placement: 'bottom',
        highlight: true,
        waitFor: '.strategy-input'
      },
      {
        id: 'handover',
        target: '.handover-btn',
        title: '交給 AI 團隊',
        content: '策略生成後，點擊「交給 AI 團隊」，將策略自動傳遞給執行模塊。',
        placement: 'top',
        highlight: true,
        waitFor: '.handover-btn'
      },
      {
        id: 'execution',
        target: '[data-tour="ai-team"]',
        title: '步驟 2: 自動執行',
        content: 'AI 團隊銷售會接收策略，自動規劃執行計劃，包括角色分配、消息模板、發送節奏。',
        placement: 'right',
        highlight: true
      },
      {
        id: 'analytics',
        target: '[data-tour="analytics"]',
        title: '步驟 3: 數據洞察',
        content: '實時追蹤營銷效果，AI 分析轉化數據，提供優化建議。',
        placement: 'right',
        highlight: true
      },
      {
        id: 'complete',
        target: 'body',
        title: '✨ AI 營銷已就緒！',
        content: '現在您已掌握 AI 營銷流程。開始創建您的第一個營銷策略吧！',
        placement: 'center'
      }
    ]
  },
  {
    id: 'resource-management',
    name: '資源管理指南',
    description: '高效管理聯繫人和群組',
    icon: '📇',
    category: 'basics',
    estimatedTime: 6,
    steps: [
      {
        id: 'intro',
        target: 'body',
        title: '資源管理中心',
        content: '資源中心是管理所有聯繫人、群組和潛在客戶的統一平台。',
        placement: 'center'
      },
      {
        id: 'navigate',
        target: '[data-tour="resource-center"]',
        title: '進入資源中心',
        content: '點擊這裡進入資源中心，管理您的所有 Telegram 資源。',
        placement: 'right',
        highlight: true,
        action: 'navigate',
        actionTarget: 'resource-center'
      },
      {
        id: 'tabs',
        target: '.resource-tabs',
        title: '資源分類',
        content: '資源分為：全部聯繫人、用戶、群組、頻道、捕獲的潛客。使用標籤快速篩選。',
        placement: 'bottom',
        highlight: true,
        waitFor: '.resource-tabs'
      },
      {
        id: 'search',
        target: '.resource-search',
        title: '智能搜索',
        content: '使用搜索框快速查找聯繫人。支持用戶名、顯示名稱、來源群組等多維搜索。',
        placement: 'bottom',
        highlight: true,
        waitFor: '.resource-search'
      },
      {
        id: 'batch',
        target: '.batch-actions',
        title: '批量操作',
        content: '選擇多個聯繫人後，可以批量發送消息或加入 AI 銷售隊列。',
        placement: 'top',
        highlight: true,
        waitFor: '.batch-actions'
      },
      {
        id: 'complete',
        target: 'body',
        title: '💪 資源管理就緒！',
        content: '您已掌握資源管理技巧。現在可以高效管理您的營銷資源了！',
        placement: 'center'
      }
    ]
  },
  {
    id: 'automation-rules',
    name: '自動化規則設置',
    description: '創建智能監控和自動回復規則',
    icon: '⚙️',
    category: 'advanced',
    estimatedTime: 10,
    steps: [
      {
        id: 'intro',
        target: 'body',
        title: '自動化監控系統',
        content: '設置關鍵詞監控、自動回復、觸發動作，讓系統 24/7 自動運行。',
        placement: 'center'
      },
      {
        id: 'automation',
        target: '[data-tour="automation"]',
        title: '進入監控規則',
        content: '點擊這裡配置監控規則和自動化動作。',
        placement: 'right',
        highlight: true,
        action: 'navigate',
        actionTarget: 'automation'
      },
      {
        id: 'keywords',
        target: '.keyword-sets',
        title: '關鍵詞集',
        content: '創建關鍵詞集，系統會監控群組消息中包含這些關鍵詞的用戶。',
        placement: 'bottom',
        highlight: true,
        waitFor: '.keyword-sets'
      },
      {
        id: 'triggers',
        target: '.trigger-rules',
        title: '觸發規則',
        content: '設置觸發條件和對應動作：自動發送消息、添加到列表、通知等。',
        placement: 'bottom',
        highlight: true,
        waitFor: '.trigger-rules'
      },
      {
        id: 'groups',
        target: '.monitored-groups',
        title: '監控群組',
        content: '選擇要監控的 Telegram 群組。支持通過連結或搜索添加。',
        placement: 'bottom',
        highlight: true,
        waitFor: '.monitored-groups'
      },
      {
        id: 'complete',
        target: 'body',
        title: '🔄 自動化就緒！',
        content: '開啟監控後，系統會自動捕獲潛在客戶並執行設定的動作。',
        placement: 'center'
      }
    ]
  }
];

@Injectable({
  providedIn: 'root'
})
export class GuidedTourService {
  private toast = inject(ToastService);
  
  // 所有可用旅程
  private _tours = signal<Tour[]>(DEFAULT_TOURS);
  tours = this._tours.asReadonly();
  
  // 當前狀態
  private _isActive = signal(false);
  private _currentTour = signal<Tour | null>(null);
  private _currentStepIndex = signal(0);
  private _tourState = signal<TourState | null>(null);
  
  // 公開狀態
  isActive = this._isActive.asReadonly();
  currentTour = this._currentTour.asReadonly();
  currentStepIndex = this._currentStepIndex.asReadonly();
  
  // 當前步驟
  currentStep = computed(() => {
    const tour = this._currentTour();
    const index = this._currentStepIndex();
    if (!tour || index < 0 || index >= tour.steps.length) return null;
    return tour.steps[index];
  });
  
  // 進度
  progress = computed(() => {
    const tour = this._currentTour();
    const index = this._currentStepIndex();
    if (!tour) return 0;
    return Math.round(((index + 1) / tour.steps.length) * 100);
  });
  
  // 是否第一步/最後一步
  isFirstStep = computed(() => this._currentStepIndex() === 0);
  isLastStep = computed(() => {
    const tour = this._currentTour();
    return tour ? this._currentStepIndex() === tour.steps.length - 1 : true;
  });
  
  // 已完成的旅程
  private _completedTours = signal<string[]>([]);
  completedTours = this._completedTours.asReadonly();
  
  // 按類別分組的旅程
  toursByCategory = computed(() => {
    const tours = this._tours();
    return {
      basics: tours.filter(t => t.category === 'basics'),
      marketing: tours.filter(t => t.category === 'marketing'),
      ai: tours.filter(t => t.category === 'ai'),
      advanced: tours.filter(t => t.category === 'advanced')
    };
  });
  
  constructor() {
    this.loadCompletedTours();
  }
  
  /**
   * 載入已完成旅程
   */
  private loadCompletedTours() {
    try {
      const completed = localStorage.getItem('tg-matrix-completed-tours');
      if (completed) {
        this._completedTours.set(JSON.parse(completed));
      }
    } catch (e) {
      console.error('Failed to load completed tours:', e);
    }
  }
  
  /**
   * 保存已完成旅程
   */
  private saveCompletedTours() {
    try {
      localStorage.setItem('tg-matrix-completed-tours', JSON.stringify(this._completedTours()));
    } catch (e) {
      console.error('Failed to save completed tours:', e);
    }
  }
  
  /**
   * 開始旅程
   */
  startTour(tourId: string): boolean {
    const tour = this._tours().find(t => t.id === tourId);
    if (!tour) {
      this.toast.error('找不到指定的引導旅程');
      return false;
    }
    
    this._currentTour.set(tour);
    this._currentStepIndex.set(0);
    this._isActive.set(true);
    this._tourState.set({
      tourId,
      currentStep: 0,
      startedAt: new Date().toISOString(),
      completedSteps: [],
      skippedSteps: []
    });
    
    // 執行第一步的 onEnter
    const firstStep = tour.steps[0];
    if (firstStep.onEnter) {
      firstStep.onEnter();
    }
    
    return true;
  }
  
  /**
   * 下一步
   */
  nextStep(): boolean {
    const tour = this._currentTour();
    const currentIndex = this._currentStepIndex();
    
    if (!tour) return false;
    
    // 執行當前步驟的 onExit
    const currentStep = tour.steps[currentIndex];
    if (currentStep.onExit) {
      currentStep.onExit();
    }
    
    // 記錄已完成
    this._tourState.update(state => {
      if (!state) return state;
      return {
        ...state,
        completedSteps: [...state.completedSteps, currentStep.id]
      };
    });
    
    // 檢查是否最後一步
    if (currentIndex >= tour.steps.length - 1) {
      this.completeTour();
      return false;
    }
    
    // 進入下一步
    const nextIndex = currentIndex + 1;
    this._currentStepIndex.set(nextIndex);
    
    // 執行下一步的 onEnter
    const nextStep = tour.steps[nextIndex];
    if (nextStep.onEnter) {
      nextStep.onEnter();
    }
    
    return true;
  }
  
  /**
   * 上一步
   */
  prevStep(): boolean {
    const tour = this._currentTour();
    const currentIndex = this._currentStepIndex();
    
    if (!tour || currentIndex <= 0) return false;
    
    // 執行當前步驟的 onExit
    const currentStep = tour.steps[currentIndex];
    if (currentStep.onExit) {
      currentStep.onExit();
    }
    
    // 回到上一步
    const prevIndex = currentIndex - 1;
    this._currentStepIndex.set(prevIndex);
    
    // 執行上一步的 onEnter
    const prevStep = tour.steps[prevIndex];
    if (prevStep.onEnter) {
      prevStep.onEnter();
    }
    
    return true;
  }
  
  /**
   * 跳過當前步驟
   */
  skipStep(): boolean {
    const tour = this._currentTour();
    const currentIndex = this._currentStepIndex();
    
    if (!tour) return false;
    
    const currentStep = tour.steps[currentIndex];
    
    // 記錄跳過
    this._tourState.update(state => {
      if (!state) return state;
      return {
        ...state,
        skippedSteps: [...state.skippedSteps, currentStep.id]
      };
    });
    
    // 跳到下一步
    return this.nextStep();
  }
  
  /**
   * 跳到指定步驟
   */
  goToStep(stepIndex: number): boolean {
    const tour = this._currentTour();
    if (!tour || stepIndex < 0 || stepIndex >= tour.steps.length) return false;
    
    this._currentStepIndex.set(stepIndex);
    
    const step = tour.steps[stepIndex];
    if (step.onEnter) {
      step.onEnter();
    }
    
    return true;
  }
  
  /**
   * 完成旅程
   */
  completeTour(): void {
    const tour = this._currentTour();
    if (!tour) return;
    
    // 標記為已完成
    if (!this._completedTours().includes(tour.id)) {
      this._completedTours.update(completed => [...completed, tour.id]);
      this.saveCompletedTours();
    }
    
    // 重置狀態
    this._isActive.set(false);
    this._currentTour.set(null);
    this._currentStepIndex.set(0);
    this._tourState.set(null);
    
    this.toast.success(`🎉 恭喜完成「${tour.name}」引導！`);
  }
  
  /**
   * 退出旅程
   */
  exitTour(): void {
    this._isActive.set(false);
    this._currentTour.set(null);
    this._currentStepIndex.set(0);
    this._tourState.set(null);
  }
  
  /**
   * 重置已完成記錄
   */
  resetProgress(): void {
    this._completedTours.set([]);
    this.saveCompletedTours();
    this.toast.success('引導進度已重置');
  }
  
  /**
   * 檢查是否已完成
   */
  isTourCompleted(tourId: string): boolean {
    return this._completedTours().includes(tourId);
  }
  
  /**
   * 獲取目標元素位置
   */
  getTargetRect(selector: string): DOMRect | null {
    const element = document.querySelector(selector);
    return element ? element.getBoundingClientRect() : null;
  }
  
  /**
   * 滾動到目標元素
   */
  scrollToTarget(selector: string): void {
    const element = document.querySelector(selector);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  /**
   * 獲取提示框位置
   */
  getTooltipPosition(targetRect: DOMRect, placement: TourStep['placement']): { top: number; left: number } {
    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 180;
    
    switch (placement) {
      case 'top':
        return {
          top: targetRect.top - tooltipHeight - padding,
          left: targetRect.left + (targetRect.width - tooltipWidth) / 2
        };
      case 'bottom':
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left + (targetRect.width - tooltipWidth) / 2
        };
      case 'left':
        return {
          top: targetRect.top + (targetRect.height - tooltipHeight) / 2,
          left: targetRect.left - tooltipWidth - padding
        };
      case 'right':
        return {
          top: targetRect.top + (targetRect.height - tooltipHeight) / 2,
          left: targetRect.right + padding
        };
      case 'center':
      default:
        return {
          top: window.innerHeight / 2 - tooltipHeight / 2,
          left: window.innerWidth / 2 - tooltipWidth / 2
        };
    }
  }
}
