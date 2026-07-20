/**
 * 統一空狀態組件
 * Empty State Component
 *
 * 全站空狀態的唯一實現，統一視覺結構：圖標圓底 → 標題 → 描述 → 自定義內容 → CTA。
 * - 顏色/邊框全部走 CSS token，自動跟隨主題
 * - iconKind：可選線性 SVG（與儀表板/側邊欄風格一致）；未指定時回退 icon emoji（兼容舊用法）
 * - <ng-content> 插槽承載頁面特有內容（如步驟引導、條件提示）
 * - compact 模式適配小容器
 *
 * 用法：
 * <app-empty-state iconKind="radar" title="還沒有監控群組"
 *                  description="監控群組可以自動監聽關鍵詞"
 *                  ctaLabel="前往搜索發現" (cta)="go()">
 * </app-empty-state>
 */
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

/** 內建線性圖標種類（與側邊欄 SVG 風格一致，不引新依賴） */
export type EmptyStateIconKind =
  | 'users' | 'user' | 'radar' | 'key' | 'bolt' | 'chat'
  | 'inbox' | 'search' | 'plus' | 'send' | 'package' | 'alert';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center text-center"
         [class.py-12]="!compact()"
         [class.py-6]="compact()">
      <!-- 圖標圓底：優先線性 SVG，否則 emoji -->
      <div class="flex items-center justify-center rounded-full"
           [class.w-20]="!compact()"
           [class.h-20]="!compact()"
           [class.mb-4]="!compact()"
           [class.w-14]="compact()"
           [class.h-14]="compact()"
           [class.mb-3]="compact()"
           style="background-color: var(--bg-tertiary); color: var(--primary-light);">
        @if (iconKind()) {
          <svg [attr.width]="compact() ? 28 : 36" [attr.height]="compact() ? 28 : 36"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            @switch (iconKind()) {
              @case ('users') {
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              }
              @case ('user') {
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              }
              @case ('radar') {
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              }
              @case ('key') {
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
              }
              @case ('bolt') {
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              }
              @case ('chat') {
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              }
              @case ('inbox') {
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
              }
              @case ('search') {
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              }
              @case ('plus') {
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              }
              @case ('send') {
                <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>
              }
              @case ('package') {
                <path d="M16.5 9.4l-9-5.19"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
              }
              @case ('alert') {
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              }
            }
          </svg>
        } @else {
          <span [class.text-4xl]="!compact()" [class.text-2xl]="compact()">{{ icon() }}</span>
        }
      </div>

      <h3 class="font-medium mb-2"
          [class.text-lg]="!compact()"
          [class.text-base]="compact()"
          style="color: var(--text-primary);">{{ title() }}</h3>

      @if (description()) {
        <p class="text-sm max-w-md whitespace-pre-line leading-relaxed"
           [class.mb-6]="!compact()"
           [class.mb-4]="compact()"
           style="color: var(--text-muted);">{{ description() }}</p>
      }

      <ng-content></ng-content>

      @if (ctaLabel() || secondaryLabel()) {
        <div class="flex items-center justify-center gap-3 flex-wrap mt-2">
          @if (ctaLabel()) {
            <button (click)="cta.emit()"
                    class="font-medium rounded-xl transition-all shadow-lg hover:brightness-110"
                    [class.px-6]="!compact()"
                    [class.py-2.5]="!compact()"
                    [class.px-4]="compact()"
                    [class.py-2]="compact()"
                    [class.text-sm]="compact()"
                    style="background: linear-gradient(90deg, var(--primary), var(--accent)); color: #fff;">
              {{ ctaLabel() }}
            </button>
          }
          @if (secondaryLabel()) {
            <button (click)="secondaryCta.emit()"
                    class="rounded-xl transition-colors"
                    [class.px-5]="!compact()"
                    [class.py-2.5]="!compact()"
                    [class.px-4]="compact()"
                    [class.py-2]="compact()"
                    [class.text-sm]="compact()"
                    style="background-color: var(--bg-tertiary); color: var(--text-secondary); border: 1px solid var(--border-default);">
              {{ secondaryLabel() }}
            </button>
          }
        </div>
      }
    </div>
  `
})
export class EmptyStateComponent {
  /** 線性圖標種類；指定後優先於 icon emoji */
  iconKind = input<EmptyStateIconKind | ''>('');
  /** 圖標（emoji），未指定 iconKind 時使用；兼容舊用法 */
  icon = input<string>('📭');
  title = input.required<string>();
  description = input<string>('');
  ctaLabel = input<string>('');
  secondaryLabel = input<string>('');
  compact = input<boolean>(false);

  cta = output<void>();
  secondaryCta = output<void>();
}
