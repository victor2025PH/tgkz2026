/**
 * Onboarding Component - 新手引导组件
 * 
 * 功能：
 * 1. 首次使用时自动触发 5 步引导
 * 2. 支持跳过、以后不再提示
 * 3. 可通过帮助按钮重新打开
 * 4. 移动端适配
 */
import { Component, signal, computed, OnInit, HostListener, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  targetSelector?: string;      // 高亮目标元素选择器
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  actionLabel?: string;
  actionTarget?: string;        // 导航目标
  tips?: string[];
}

// 存储键名
const STORAGE_KEY = 'tg-ai-onboarding';
const STORAGE_NEVER_SHOW = 'tg-ai-onboarding-never-show';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (show()) {
      <div class="fixed inset-0 z-[10000] flex items-center justify-center"
           (click)="onBackdropClick($event)">
        <!-- 背景遮罩 -->
        <div class="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
        
        <!-- 高亮元素（如果有） -->
        @if (currentStep()?.targetSelector && highlightRect()) {
          <div class="absolute border-2 border-cyan-400 rounded-xl shadow-[0_0_20px_rgba(34,211,238,0.5)] animate-pulse pointer-events-none"
               [style.left.px]="highlightRect()!.left - 8"
               [style.top.px]="highlightRect()!.top - 8"
               [style.width.px]="highlightRect()!.width + 16"
               [style.height.px]="highlightRect()!.height + 16">
          </div>
        }
        
        <!-- 引导卡片 - 移动端适配 -->
        <div class="relative w-full max-w-lg mx-4 sm:mx-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-600/50 overflow-hidden"
             (click)="$event.stopPropagation()">
          
          <!-- 顶部进度条 -->
          <div class="px-4 sm:px-6 pt-4 sm:pt-5">
            <div class="flex items-center gap-1.5 sm:gap-2">
              @for (step of steps; track step.id; let i = $index) {
                <div class="flex-1 h-1 sm:h-1.5 rounded-full transition-all duration-300 cursor-pointer"
                     [class.bg-gradient-to-r]="i <= currentIndex()"
                     [class.from-cyan-500]="i <= currentIndex()"
                     [class.to-blue-500]="i <= currentIndex()"
                     [class.bg-slate-700]="i > currentIndex()"
                     (click)="goToStep(i)">
                </div>
              }
            </div>
            <div class="flex justify-between items-center mt-2 text-xs text-slate-500">
              <span>步骤 {{ currentIndex() + 1 }} / {{ steps.length }}</span>
              <button (click)="skipAll()" 
                      class="hover:text-slate-300 transition-colors px-2 py-1 -mr-2">
                跳过引导
              </button>
            </div>
          </div>
          
          <!-- 内容区 - 移动端优化间距 -->
          <div class="p-4 sm:p-6">
            @if (currentStep(); as step) {
              <div class="text-center">
                <!-- 图标 -->
                <div class="text-5xl sm:text-6xl mb-4 sm:mb-5 animate-bounce-slow">
                  {{ step.icon }}
                </div>
                
                <!-- 标题 -->
                <h2 class="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">
                  {{ step.title }}
                </h2>
                
                <!-- 描述 -->
                <p class="text-slate-300 text-sm sm:text-base mb-4 sm:mb-5 max-w-sm mx-auto leading-relaxed">
                  {{ step.description }}
                </p>
                
                <!-- 提示列表 -->
                @if (step.tips && step.tips.length > 0) {
                  <div class="bg-slate-800/60 rounded-xl p-3 sm:p-4 mb-4 sm:mb-5 text-left max-w-sm mx-auto border border-slate-700/50">
                    <ul class="space-y-2">
                      @for (tip of step.tips; track tip) {
                        <li class="flex items-start gap-2 text-slate-400 text-sm">
                          <span class="text-cyan-400 mt-0.5 flex-shrink-0">✓</span>
                          <span>{{ tip }}</span>
                        </li>
                      }
                    </ul>
                  </div>
                }
                
                <!-- 快捷操作按钮 -->
                @if (step.actionLabel && step.actionTarget) {
                  <button (click)="handleAction(step.actionTarget)"
                          class="mb-3 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl text-sm font-medium hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/25">
                    {{ step.actionLabel }} →
                  </button>
                }
              </div>
            }
          </div>
          
          <!-- 底部导航 -->
          <div class="px-4 sm:px-6 pb-4 sm:pb-5">
            <!-- 以后不再提示 -->
            <div class="flex items-center justify-center mb-4">
              <label class="flex items-center gap-2 cursor-pointer text-sm text-slate-500 hover:text-slate-400 transition-colors">
                <input type="checkbox" 
                       [checked]="neverShowAgain()"
                       (change)="toggleNeverShow()"
                       class="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500/50">
                <span>以后不再提示</span>
              </label>
            </div>
            
            <!-- 导航按钮 -->
            <div class="flex justify-between gap-3">
              <button (click)="previous()"
                      [disabled]="currentIndex() === 0"
                      class="flex-1 px-4 py-2.5 sm:py-3 bg-slate-700/80 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm sm:text-base">
                ← 上一步
              </button>
              
              @if (currentIndex() < steps.length - 1) {
                <button (click)="next()"
                        class="flex-1 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium hover:from-cyan-600 hover:to-blue-600 transition-all text-sm sm:text-base shadow-lg shadow-cyan-500/25">
                  下一步 →
                </button>
              } @else {
                <button (click)="complete()"
                        class="flex-1 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all text-sm sm:text-base shadow-lg shadow-green-500/25">
                  开始使用 🚀
                </button>
              }
            </div>
          </div>
          
          <!-- 键盘快捷键提示 - 仅桌面端显示 -->
          <div class="hidden sm:block px-6 pb-4 text-center text-xs text-slate-600">
            按 <kbd class="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">←</kbd> 
            <kbd class="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">→</kbd> 导航 · 
            <kbd class="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">ESC</kbd> 关闭
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes bounce-slow {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    .animate-bounce-slow {
      animation: bounce-slow 2s ease-in-out infinite;
    }
  `]
})
export class OnboardingComponent implements OnInit {
  // 显示状态
  show = signal(false);
  currentIndex = signal(0);
  neverShowAgain = signal(false);
  highlightRect = signal<DOMRect | null>(null);
  
  // 导航事件输出
  navigateEvent = output<string>();
  
  // 5 步引导内容（简体中文）
  steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: '欢迎使用 TG-AI智控王',
      description: '智能 Telegram 营销系统，帮助您高效获客、自动化运营',
      icon: '🎉',
      position: 'center',
      tips: [
        '支持多账号管理和协作',
        'AI 智能营销和自动回复',
        '群组搜索和资源管理'
      ]
    },
    {
      id: 'add-account',
      title: '第一步：添加账号',
      description: '绑定您的 Telegram 账号，这是使用所有功能的前提',
      icon: '📱',
      targetSelector: '[data-tour="accounts"]',
      position: 'right',
      tips: [
        '支持手机号验证登录',
        '可添加多个账号同时运营',
        '建议使用独立营销号'
      ],
      actionLabel: '去添加账号',
      actionTarget: 'accounts'
    },
    {
      id: 'search-discovery',
      title: '第二步：搜索发现',
      description: '搜索目标群组和频道，发现潜在客户资源',
      icon: '🔍',
      targetSelector: '[data-tour="search-discovery"]',
      position: 'right',
      tips: [
        '支持多渠道搜索（官方/中文搜索）',
        '一键加入目标群组',
        '收藏和管理搜索结果'
      ],
      actionLabel: '去搜索发现',
      actionTarget: 'search-discovery'
    },
    {
      id: 'monitoring-setup',
      title: '第三步：监控与关键词',
      description: '为已加入的群组设置关键词监控，自动捕捉潜在客户',
      icon: '📡',
      targetSelector: '[data-tour="monitoring-center"]',
      position: 'right',
      tips: [
        '监控中心统一管理所有群组',
        '绑定关键词集，自动匹配消息',
        '系统内置行业预设关键词（加密货币、电商等）'
      ],
      actionLabel: '去设置监控',
      actionTarget: 'automation'
    },
    {
      id: 'ai-marketing',
      title: '第四步：AI 智能营销',
      description: '让 AI 帮您制定营销策略，自动执行营销任务',
      icon: '🤖',
      targetSelector: '[data-tour="ai-assistant"]',
      position: 'right',
      tips: [
        'AI 一键生成营销策略',
        '自动化执行和跟进',
        '数据分析和效果追踪'
      ],
      actionLabel: '体验 AI 营销',
      actionTarget: 'ai-assistant'
    },
    {
      id: 'complete',
      title: '准备就绪！',
      description: '您已了解核心功能，现在可以开始您的营销之旅了',
      icon: '🚀',
      position: 'center',
      tips: [
        '添加账号 → 搜索群组 → 设置监控 → 获得 Lead',
        '仪表盘查看整体数据',
        '有问题随时点击右上角 ❓ 帮助'
      ]
    }
  ];
  
  currentStep = computed(() => this.steps[this.currentIndex()]);
  
  ngOnInit(): void {
    this.checkFirstRun();
    this.loadNeverShowSetting();
  }
  
  /**
   * 键盘事件处理
   */
  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (!this.show()) return;
    
    switch (event.key) {
      case 'Escape':
        this.skipAll();
        break;
      case 'ArrowRight':
      case 'Enter':
        if (this.currentIndex() < this.steps.length - 1) {
          this.next();
        } else {
          this.complete();
        }
        break;
      case 'ArrowLeft':
        this.previous();
        break;
    }
  }
  
  /**
   * 检查是否首次运行
   */
  checkFirstRun(): void {
    const hasCompleted = localStorage.getItem(STORAGE_KEY);
    const neverShow = localStorage.getItem(STORAGE_NEVER_SHOW);
    
    // 如果设置了以后不再提示，则不显示
    if (neverShow === 'true') {
      return;
    }
    
    // 首次使用时显示引导
    if (!hasCompleted) {
      setTimeout(() => this.show.set(true), 800);
    }
  }
  
  /**
   * 加载"以后不再提示"设置
   */
  loadNeverShowSetting(): void {
    const neverShow = localStorage.getItem(STORAGE_NEVER_SHOW);
    this.neverShowAgain.set(neverShow === 'true');
  }
  
  /**
   * 切换"以后不再提示"
   */
  toggleNeverShow(): void {
    const newValue = !this.neverShowAgain();
    this.neverShowAgain.set(newValue);
    localStorage.setItem(STORAGE_NEVER_SHOW, String(newValue));
  }
  
  /**
   * 手动打开引导
   */
  open(): void {
    this.currentIndex.set(0);
    this.show.set(true);
    this.updateHighlight();
  }
  
  /**
   * 关闭引导
   */
  close(): void {
    this.show.set(false);
    this.highlightRect.set(null);
  }
  
  /**
   * 下一步
   */
  next(): void {
    if (this.currentIndex() < this.steps.length - 1) {
      this.currentIndex.update(i => i + 1);
      this.updateHighlight();
    }
  }
  
  /**
   * 上一步
   */
  previous(): void {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(i => i - 1);
      this.updateHighlight();
    }
  }
  
  /**
   * 跳转到指定步骤
   */
  goToStep(index: number): void {
    if (index >= 0 && index < this.steps.length) {
      this.currentIndex.set(index);
      this.updateHighlight();
    }
  }
  
  /**
   * 跳过全部引导
   */
  skipAll(): void {
    this.markAsCompleted();
    this.close();
  }
  
  /**
   * 完成引导
   */
  complete(): void {
    this.markAsCompleted();
    this.close();
  }
  
  /**
   * 标记为已完成
   */
  private markAsCompleted(): void {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    
    // 如果勾选了以后不再提示，保存设置
    if (this.neverShowAgain()) {
      localStorage.setItem(STORAGE_NEVER_SHOW, 'true');
    }
  }
  
  /**
   * 处理快捷操作
   */
  handleAction(target: string): void {
    this.navigateEvent.emit(target);
    // 继续到下一步，不关闭引导
    this.next();
  }
  
  /**
   * 点击背景关闭（可选）
   */
  onBackdropClick(event: Event): void {
    // 可以选择点击背景关闭或不关闭
    // this.skipAll();
  }
  
  /**
   * 更新高亮元素位置
   */
  private updateHighlight(): void {
    const step = this.currentStep();
    if (step?.targetSelector) {
      setTimeout(() => {
        const element = document.querySelector(step.targetSelector!);
        if (element) {
          this.highlightRect.set(element.getBoundingClientRect());
          // 滚动到目标元素
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          this.highlightRect.set(null);
        }
      }, 100);
    } else {
      this.highlightRect.set(null);
    }
  }
  
  /**
   * 重置引导（用于测试或从帮助按钮重新打开）
   */
  reset(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_NEVER_SHOW);
    this.neverShowAgain.set(false);
    this.currentIndex.set(0);
  }
  
  /**
   * 检查是否需要显示引导
   */
  shouldShowOnboarding(): boolean {
    const neverShow = localStorage.getItem(STORAGE_NEVER_SHOW);
    return neverShow !== 'true';
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
