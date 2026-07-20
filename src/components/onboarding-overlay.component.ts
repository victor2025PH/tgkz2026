/**
 * 新手引導覆蓋層組件（Spotlight 導覽）
 * Onboarding Overlay Component
 *
 * 設計要點：
 * - 聚光燈鏤空：用 box-shadow 撐出全屏遮罩、中心透明，目標元素真實可見
 *   （不依賴目標元素 z-index/stacking context，任何佈局下都不會被遮罩蓋住）
 * - 定位跟隨：步驟切換/視窗縮放/頁面滾動時重測目標位置（rAF 節流）
 * - 目標容錯：目標尚未渲染時短暫重試，仍找不到則退化為居中卡片
 * - 鍵盤操作：← → 導航、ESC 跳過（與首登陸歡迎彈窗一致）
 */

import { Component, inject, computed, signal, effect, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OnboardingService } from '../services/onboarding.service';

const CARD_GAP = 16;          // 卡片與目標的間距
const SPOTLIGHT_PADDING = 8;  // 鏤空區相對目標外擴

@Component({
  selector: 'app-onboarding-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (service.isActive() && currentStep()) {
      <!-- 聚光燈遮罩：有目標時鏤空目標區域（目標保持可點擊），無目標時整屏調暗 -->
      @if (targetRect(); as rect) {
        <div class="fixed z-[9998] rounded-xl pointer-events-none transition-all duration-300"
             [style.left.px]="rect.left - spotlightPadding"
             [style.top.px]="rect.top - spotlightPadding"
             [style.width.px]="rect.width + spotlightPadding * 2"
             [style.height.px]="rect.height + spotlightPadding * 2"
             style="box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.65); border: 2px solid var(--primary, #06b6d4);">
        </div>
        <!-- 四邊條狀點擊攔截：鏤空區內的目標元素仍可點擊試用；外部僅攔截、不跳過（防誤觸） -->
        <div class="fixed z-[9997] left-0 right-0 top-0" [style.height.px]="rect.top - spotlightPadding"></div>
        <div class="fixed z-[9997] left-0 right-0 bottom-0" [style.top.px]="rect.bottom + spotlightPadding"></div>
        <div class="fixed z-[9997] left-0" [style.top.px]="rect.top - spotlightPadding" [style.height.px]="rect.height + spotlightPadding * 2" [style.width.px]="rect.left - spotlightPadding"></div>
        <div class="fixed z-[9997] right-0" [style.top.px]="rect.top - spotlightPadding" [style.height.px]="rect.height + spotlightPadding * 2" [style.left.px]="rect.right + spotlightPadding"></div>
      } @else {
        <div class="fixed inset-0 z-[9998]" style="background: rgba(0, 0, 0, 0.65);"></div>
      }

      <!-- 引導卡片 -->
      <div class="fixed z-[9999] transition-all duration-300" [style]="cardPositionStyle()">
        <div class="rounded-2xl max-w-md overflow-hidden"
             style="background: var(--bg-card, #1e293b); border: 1px solid var(--border-default, #334155); box-shadow: var(--shadow-lg, 0 10px 15px rgba(0,0,0,0.4));">

          <!-- 進度條 -->
          <div class="h-1" style="background: var(--bg-tertiary, #334155);">
            <div class="h-full transition-all"
                 style="background: linear-gradient(90deg, var(--primary, #06b6d4), var(--accent, #8b5cf6));"
                 [style.width.%]="service.progressPercent()"></div>
          </div>

          <!-- 內容 -->
          <div class="p-6">
            <div class="flex items-start justify-between mb-3">
              <h3 class="text-lg font-bold" style="color: var(--text-primary, #f8fafc);">{{ currentStep()!.title }}</h3>
              <span class="text-xs shrink-0 ml-3" style="color: var(--text-muted, #94a3b8);">
                {{ service.currentStepIndex() + 1 }} / {{ service.totalSteps() }}
              </span>
            </div>

            <p class="text-sm whitespace-pre-line mb-5 leading-relaxed" style="color: var(--text-secondary, #cbd5e1);">
              {{ currentStep()!.description }}
            </p>

            <!-- 操作按鈕 -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                @if (service.currentStepIndex() > 0) {
                  <button (click)="service.prevStep()"
                          class="px-3 py-1.5 text-sm transition-colors"
                          style="color: var(--text-muted, #94a3b8);">
                    ← 上一步
                  </button>
                }
                <button (click)="service.skipTour()"
                        class="px-3 py-1.5 text-sm transition-colors"
                        style="color: var(--text-disabled, #64748b);">
                  跳過
                </button>
              </div>

              <button (click)="service.nextStep()"
                      class="px-6 py-2 font-medium rounded-lg transition-all text-sm hover:brightness-110"
                      style="background: linear-gradient(90deg, var(--primary, #06b6d4), var(--accent, #8b5cf6)); color: #fff;">
                {{ currentStep()!.actionLabel || (isLastStep() ? '完成' : '下一步') }}
              </button>
            </div>
          </div>

          <!-- 步驟指示器 -->
          <div class="px-6 pb-4 flex justify-center gap-1.5">
            @for (step of tour()?.steps || []; track step.id; let i = $index) {
              <button (click)="service.goToStep(i)"
                      class="h-2 rounded-full transition-all"
                      [style.width.px]="i === service.currentStepIndex() ? 16 : 8"
                      [style.background]="i === service.currentStepIndex() ? 'var(--primary, #06b6d4)' : 'var(--bg-tertiary, #334155)'">
              </button>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class OnboardingOverlayComponent implements OnDestroy {
  service = inject(OnboardingService);

  readonly spotlightPadding = SPOTLIGHT_PADDING;

  tour = computed(() => this.service.currentTour());
  currentStep = computed(() => this.service.currentStep());
  isLastStep = computed(() => this.service.currentStepIndex() === this.service.totalSteps() - 1);

  /** 目標元素實測位置（null = 無目標或找不到，退化為居中） */
  targetRect = signal<DOMRect | null>(null);

  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private rafPending = false;
  private readonly onViewportChange = () => this.scheduleMeasure();

  constructor() {
    // 步驟變化時重新測量目標位置（scrollIntoView 平滑滾動需要等待）
    effect(() => {
      const step = this.currentStep();
      const active = this.service.isActive();
      this.clearRetry();
      if (!active || !step?.target || step.position === 'center') {
        this.targetRect.set(null);
        return;
      }
      // 立即測一次 + 延遲補測（等平滑滾動結束），找不到目標時重試數次
      this.measureTarget(step.target, 5);
    });

    window.addEventListener('resize', this.onViewportChange);
    // capture 監聽以捕獲內部滾動容器的滾動
    window.addEventListener('scroll', this.onViewportChange, true);
  }

  ngOnDestroy(): void {
    this.clearRetry();
    window.removeEventListener('resize', this.onViewportChange);
    window.removeEventListener('scroll', this.onViewportChange, true);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (!this.service.isActive()) return;
    switch (event.key) {
      case 'Escape':
        this.service.skipTour();
        break;
      case 'ArrowRight':
      case 'Enter':
        this.service.nextStep();
        break;
      case 'ArrowLeft':
        this.service.prevStep();
        break;
    }
  }

  /** 卡片定位：優先貼近目標，否則屏幕居中；並做視口邊界收斂 */
  cardPositionStyle = computed(() => {
    const step = this.currentStep();
    const rect = this.targetRect();

    if (!step || !rect || step.position === 'center' || !step.target) {
      return 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
    }

    // clamp 水平中心，避免卡片超出視口（卡片 max-w-md ≈ 448px）
    const halfCard = 224;
    const centerX = Math.min(Math.max(rect.left + rect.width / 2, halfCard + 8), window.innerWidth - halfCard - 8);

    switch (step.position) {
      case 'bottom':
        return `top: ${rect.bottom + CARD_GAP}px; left: ${centerX}px; transform: translateX(-50%);`;
      case 'top':
        return `bottom: ${window.innerHeight - rect.top + CARD_GAP}px; left: ${centerX}px; transform: translateX(-50%);`;
      case 'left':
        return `top: ${rect.top + rect.height / 2}px; right: ${window.innerWidth - rect.left + CARD_GAP}px; transform: translateY(-50%);`;
      case 'right':
        return `top: ${rect.top + rect.height / 2}px; left: ${rect.right + CARD_GAP}px; transform: translateY(-50%);`;
      default:
        return 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
    }
  });

  private clearRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /** 測量目標位置；目標未渲染時每 200ms 重試（最多 retries 次） */
  private measureTarget(selector: string, retries: number): void {
    const el = document.querySelector(selector);
    if (el) {
      this.targetRect.set(el.getBoundingClientRect());
      // 平滑滾動後再補測一次，確保位置準確
      this.retryTimer = setTimeout(() => {
        const el2 = document.querySelector(selector);
        if (el2) this.targetRect.set(el2.getBoundingClientRect());
      }, 400);
    } else if (retries > 0) {
      this.retryTimer = setTimeout(() => this.measureTarget(selector, retries - 1), 200);
    } else {
      this.targetRect.set(null);
    }
  }

  /** rAF 節流的視口變化重測 */
  private scheduleMeasure(): void {
    if (this.rafPending || !this.service.isActive()) return;
    const step = this.currentStep();
    if (!step?.target) return;
    this.rafPending = true;
    requestAnimationFrame(() => {
      this.rafPending = false;
      const el = document.querySelector(step.target!);
      if (el) this.targetRect.set(el.getBoundingClientRect());
    });
  }
}
