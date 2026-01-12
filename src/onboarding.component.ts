/**
 * Onboarding Component
 * 新手引導組件
 */
import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  action?: () => void;
  actionLabel?: string;
  tips?: string[];
}

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if(show()) {
      <div class="fixed inset-0 bg-black/80 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
        <div class="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl border border-slate-600 w-full max-w-2xl overflow-hidden">
          
          <!-- 頂部進度 -->
          <div class="px-8 pt-6">
            <div class="flex items-center gap-2">
              @for(step of steps; track step.id; let i = $index) {
                <div class="flex-1 h-1.5 rounded-full transition-all duration-300"
                     [class.bg-gradient-to-r]="i <= currentIndex()"
                     [class.from-cyan-500]="i <= currentIndex()"
                     [class.to-purple-500]="i <= currentIndex()"
                     [class.bg-slate-700]="i > currentIndex()">
                </div>
              }
            </div>
            <div class="flex justify-between mt-2 text-xs text-slate-500">
              <span>步驟 {{ currentIndex() + 1 }} / {{ steps.length }}</span>
              <button (click)="skip()" class="hover:text-slate-300 transition-colors">跳過教程</button>
            </div>
          </div>
          
          <!-- 內容區 -->
          <div class="p-8">
            @if(currentStep(); as step) {
              <div class="text-center">
                <!-- 圖標 -->
                <div class="text-7xl mb-6 animate-bounce-slow">{{ step.icon }}</div>
                
                <!-- 標題 -->
                <h2 class="text-3xl font-bold text-white mb-4">{{ step.title }}</h2>
                
                <!-- 描述 -->
                <p class="text-slate-300 text-lg mb-6 max-w-md mx-auto">{{ step.description }}</p>
                
                <!-- 提示列表 -->
                @if(step.tips && step.tips.length > 0) {
                  <div class="bg-slate-800/50 rounded-xl p-4 mb-6 text-left max-w-md mx-auto">
                    <ul class="space-y-2">
                      @for(tip of step.tips; track tip) {
                        <li class="flex items-start gap-2 text-slate-400">
                          <span class="text-cyan-400 mt-0.5">✓</span>
                          <span>{{ tip }}</span>
                        </li>
                      }
                    </ul>
                  </div>
                }
                
                <!-- 操作按鈕 -->
                @if(step.action && step.actionLabel) {
                  <button (click)="step.action()"
                          class="mb-4 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
                    {{ step.actionLabel }}
                  </button>
                }
              </div>
            }
          </div>
          
          <!-- 底部導航 -->
          <div class="px-8 pb-8 flex justify-between">
            <button (click)="previous()"
                    [disabled]="currentIndex() === 0"
                    class="px-6 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              上一步
            </button>
            
            @if(currentIndex() < steps.length - 1) {
              <button (click)="next()"
                      class="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
                下一步 →
              </button>
            } @else {
              <button (click)="complete()"
                      class="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity">
                開始使用 🚀
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes bounce-slow {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    .animate-bounce-slow {
      animation: bounce-slow 2s ease-in-out infinite;
    }
  `]
})
export class OnboardingComponent implements OnInit {
  show = signal(false);
  currentIndex = signal(0);
  
  steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: '歡迎使用 TG-AI智控王',
      description: '強大的 Telegram 營銷自動化工具，讓您的營銷更智能、更高效',
      icon: '🚀',
      tips: [
        '自動化客戶獲取和跟進',
        'AI 智能回復和銷售漏斗',
        '多賬號協作和群組管理'
      ]
    },
    {
      id: 'add-account',
      title: '添加您的第一個賬號',
      description: '綁定 Telegram 賬號開始使用所有功能',
      icon: '📱',
      tips: [
        '支持多個 Telegram 賬號',
        '安全的 Session 管理',
        '代理設置確保穩定連接'
      ],
      actionLabel: '去添加賬號',
      action: () => {
        // 導航到賬號頁面
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'accounts' }));
      }
    },
    {
      id: 'setup-keywords',
      title: '設置監控關鍵詞',
      description: '配置關鍵詞自動捕獲潛在客戶',
      icon: '🔍',
      tips: [
        '支持正則表達式',
        '多關鍵詞組合監控',
        '自動過濾垃圾信息'
      ]
    },
    {
      id: 'ai-config',
      title: '配置 AI 助手',
      description: '設置 AI 實現智能自動回復',
      icon: '🤖',
      tips: [
        '支持 Gemini、OpenAI、本地模型',
        '自定義 AI 人設和話術',
        'RAG 知識庫增強回復質量'
      ],
      actionLabel: '配置 AI',
      action: () => {
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'ai-center' }));
      }
    },
    {
      id: 'membership',
      title: '解鎖更多功能',
      description: '升級會員享受完整功能體驗',
      icon: '👑',
      tips: [
        '更多賬號配額',
        '無限 AI 調用',
        '高級數據分析'
      ],
      actionLabel: '查看會員方案',
      action: () => {
        window.dispatchEvent(new CustomEvent('open-membership-dialog'));
      }
    },
    {
      id: 'complete',
      title: '準備就緒！',
      description: '您已經完成基礎設置，開始您的營銷之旅吧',
      icon: '🎉',
      tips: [
        '查看儀表板了解整體狀態',
        '使用快捷鍵提高效率 (Ctrl+?)',
        '遇到問題可查看幫助文檔'
      ]
    }
  ];
  
  currentStep = computed(() => this.steps[this.currentIndex()]);
  
  ngOnInit(): void {
    this.checkFirstRun();
  }
  
  /**
   * 檢查是否首次運行
   */
  checkFirstRun(): void {
    const hasCompleted = localStorage.getItem('tg-matrix-onboarding-completed');
    if (!hasCompleted) {
      // 延遲顯示，等待應用加載完成
      setTimeout(() => this.show.set(true), 1000);
    }
  }
  
  /**
   * 手動顯示引導
   */
  open(): void {
    this.currentIndex.set(0);
    this.show.set(true);
  }
  
  /**
   * 下一步
   */
  next(): void {
    if (this.currentIndex() < this.steps.length - 1) {
      this.currentIndex.update(i => i + 1);
    }
  }
  
  /**
   * 上一步
   */
  previous(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(i => i - 1);
    }
  }
  
  /**
   * 跳過
   */
  skip(): void {
    this.complete();
  }
  
  /**
   * 完成引導
   */
  complete(): void {
    localStorage.setItem('tg-matrix-onboarding-completed', 'true');
    localStorage.setItem('tg-matrix-onboarding-date', new Date().toISOString());
    this.show.set(false);
  }
  
  /**
   * 重置引導（用於測試或重新顯示）
   */
  reset(): void {
    localStorage.removeItem('tg-matrix-onboarding-completed');
    localStorage.removeItem('tg-matrix-onboarding-date');
  }
}

/**
 * Feature Highlight Component
 * 功能高亮提示組件
 */
@Component({
  selector: 'app-feature-highlight',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if(show()) {
      <div class="fixed z-[9998]" [style.top.px]="position.top" [style.left.px]="position.left">
        <!-- 高亮遮罩 -->
        <div class="absolute -inset-2 bg-cyan-500/20 rounded-xl animate-pulse"></div>
        
        <!-- 提示框 -->
        <div class="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-64 bg-slate-800 rounded-xl shadow-xl border border-slate-600 p-4 z-10">
          <div class="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
          <h4 class="font-bold text-white mb-2">{{ title }}</h4>
          <p class="text-sm text-slate-400 mb-3">{{ description }}</p>
          <button (click)="dismiss()" class="text-sm text-cyan-400 hover:underline">知道了</button>
        </div>
      </div>
    }
  `
})
export class FeatureHighlightComponent {
  show = signal(false);
  title = '';
  description = '';
  position = { top: 0, left: 0 };
  
  highlight(element: HTMLElement, title: string, description: string): void {
    const rect = element.getBoundingClientRect();
    this.position = {
      top: rect.top,
      left: rect.left
    };
    this.title = title;
    this.description = description;
    this.show.set(true);
  }
  
  dismiss(): void {
    this.show.set(false);
  }
}
