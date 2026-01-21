/**
 * 配置進度指引組件
 * 顯示監控系統配置完整度和下一步提示
 */
import { Component, inject, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonitoringStateService, ConfigStatus, ConfigStep } from './monitoring-state.service';

@Component({
  selector: 'app-config-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- 緊湊模式：用於頂部欄 -->
    @if (mode() === 'compact') {
      <div class="flex items-center gap-3 px-4 py-2 bg-slate-800/80 rounded-xl border border-slate-700/50">
        <!-- 步驟指示器 -->
        <div class="flex items-center gap-1">
          @for (step of status().steps; track step.id; let i = $index) {
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all"
                 [class.bg-emerald-500/20]="step.isCompleted"
                 [class.text-emerald-400]="step.isCompleted"
                 [class.bg-slate-700]="!step.isCompleted"
                 [class.text-slate-500]="!step.isCompleted"
                 [title]="step.name">
              {{ step.isCompleted ? '✓' : (i + 1) }}
            </div>
            @if (i < status().steps.length - 1) {
              <div class="w-3 h-0.5 transition-all"
                   [class.bg-emerald-500]="step.isCompleted"
                   [class.bg-slate-600]="!step.isCompleted">
              </div>
            }
          }
        </div>
        
        <!-- 進度百分比 -->
        <div class="text-sm">
          <span class="text-emerald-400 font-bold">{{ status().percentage }}%</span>
        </div>
        
        <!-- 下一步提示 -->
        @if (status().nextStep) {
          <button (click)="onAction(status().nextStep!.action!)"
                  class="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1">
            <span>→</span>
            <span>{{ status().nextStep!.name }}</span>
          </button>
        }
      </div>
    }
    
    <!-- 詳細模式：用於側邊欄或面板 -->
    @if (mode() === 'detailed') {
      <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <!-- 標題 -->
        <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
          <h3 class="font-semibold text-white flex items-center gap-2">
            <span>📋</span> 配置進度
          </h3>
          <span class="text-sm">
            <span class="text-emerald-400 font-bold">{{ status().completedCount }}</span>
            <span class="text-slate-500">/{{ status().totalCount }}</span>
          </span>
        </div>
        
        <!-- 進度條 -->
        <div class="px-4 pt-4">
          <div class="relative">
            <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
                   [style.width.%]="status().percentage">
              </div>
            </div>
            <div class="mt-1 text-right text-xs text-slate-500">
              {{ status().percentage }}% 完成
            </div>
          </div>
        </div>
        
        <!-- 步驟列表 -->
        <div class="p-4 space-y-2">
          @for (step of status().steps; track step.id) {
            <div class="flex items-center gap-3 p-3 rounded-lg transition-all"
                 [class.bg-emerald-500/10]="step.isCompleted"
                 [class.bg-slate-700/30]="!step.isCompleted">
              <!-- 狀態圖標 -->
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                   [class.bg-emerald-500/20]="step.isCompleted"
                   [class.text-emerald-400]="step.isCompleted"
                   [class.bg-slate-600]="!step.isCompleted"
                   [class.text-slate-400]="!step.isCompleted">
                {{ step.isCompleted ? '✓' : step.icon }}
              </div>
              
              <!-- 步驟信息 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium"
                        [class.text-white]="step.isCompleted"
                        [class.text-slate-300]="!step.isCompleted">
                    {{ step.name }}
                  </span>
                  @if (step.count !== undefined && step.count > 0) {
                    <span class="text-xs px-1.5 py-0.5 rounded"
                          [class.bg-emerald-500/20]="step.isCompleted"
                          [class.text-emerald-400]="step.isCompleted"
                          [class.bg-slate-600/50]="!step.isCompleted"
                          [class.text-slate-400]="!step.isCompleted">
                      {{ step.count }}
                    </span>
                  }
                </div>
                <p class="text-xs text-slate-500 truncate">{{ step.description }}</p>
              </div>
              
              <!-- 操作按鈕 -->
              @if (!step.isCompleted && step.action) {
                <button (click)="onAction(step.action)"
                        class="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-xs rounded-lg transition-colors">
                  設置
                </button>
              }
            </div>
          }
        </div>
        
        <!-- 底部狀態 -->
        <div class="p-4 border-t border-slate-700/50">
          @if (status().isReady) {
            <div class="flex items-center gap-2 text-emerald-400">
              <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span class="text-sm">配置完成，可以開始監控</span>
            </div>
          } @else if (status().nextStep) {
            <div class="flex items-center justify-between">
              <span class="text-sm text-slate-400">
                下一步：{{ status().nextStep!.name }}
              </span>
              <button (click)="onAction(status().nextStep!.action!)"
                      class="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-colors">
                立即設置
              </button>
            </div>
          }
        </div>
      </div>
    }
    
    <!-- 卡片模式：用於總覽頁面 -->
    @if (mode() === 'card') {
      <div class="bg-gradient-to-br from-slate-800/80 to-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h3 class="font-semibold text-white">配置進度</h3>
            <p class="text-sm text-slate-400 mt-1">
              完成配置後即可開始自動化監控
            </p>
          </div>
          <div class="text-right">
            <div class="text-3xl font-bold text-emerald-400">{{ status().percentage }}%</div>
            <div class="text-xs text-slate-500">{{ status().completedCount }}/{{ status().totalCount }} 步驟</div>
          </div>
        </div>
        
        <!-- 環形進度 -->
        <div class="flex items-center gap-6">
          <div class="relative w-24 h-24">
            <svg class="w-24 h-24 transform -rotate-90">
              <circle cx="48" cy="48" r="40" stroke-width="8" stroke="currentColor" 
                      class="text-slate-700" fill="none"/>
              <circle cx="48" cy="48" r="40" stroke-width="8" stroke="currentColor" 
                      class="text-emerald-500" fill="none"
                      stroke-linecap="round"
                      [attr.stroke-dasharray]="circumference"
                      [attr.stroke-dashoffset]="dashOffset()"/>
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              @if (status().isReady) {
                <span class="text-2xl">✓</span>
              } @else {
                <span class="text-lg text-slate-300">{{ status().completedCount }}/{{ status().totalCount }}</span>
              }
            </div>
          </div>
          
          <!-- 步驟摘要 -->
          <div class="flex-1 space-y-2">
            @for (step of status().steps.slice(0, 4); track step.id) {
              <div class="flex items-center gap-2 text-sm">
                <span [class.text-emerald-400]="step.isCompleted"
                      [class.text-slate-500]="!step.isCompleted">
                  {{ step.isCompleted ? '✓' : '○' }}
                </span>
                <span [class.text-white]="step.isCompleted"
                      [class.text-slate-400]="!step.isCompleted">
                  {{ step.name }}
                </span>
                @if (step.count && step.count > 0) {
                  <span class="text-xs text-slate-500">({{ step.count }})</span>
                }
              </div>
            }
            @if (status().steps.length > 4) {
              <div class="text-xs text-slate-500">
                還有 {{ status().steps.length - 4 }} 個步驟...
              </div>
            }
          </div>
        </div>
        
        <!-- 下一步提示 -->
        @if (status().nextStep) {
          <div class="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm text-slate-400">
              <span>{{ status().nextStep!.icon }}</span>
              <span>下一步：{{ status().nextStep!.name }}</span>
            </div>
            <button (click)="onAction(status().nextStep!.action!)"
                    class="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 text-sm rounded-lg transition-colors">
              立即設置 →
            </button>
          </div>
        }
      </div>
    }
    
    <!-- 橫幅模式：用於提示用戶完成配置 -->
    @if (mode() === 'banner' && !status().isReady) {
      <div class="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-4 flex items-center gap-4">
        <div class="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center text-xl">
          ⚠️
        </div>
        <div class="flex-1">
          <h4 class="font-medium text-amber-300">配置未完成</h4>
          <p class="text-sm text-amber-200/70">
            還需要完成 {{ status().totalCount - status().completedCount }} 個步驟才能開始監控
            @if (status().nextStep) {
              · 下一步：{{ status().nextStep!.name }}
            }
          </p>
        </div>
        @if (status().nextStep) {
          <button (click)="onAction(status().nextStep!.action!)"
                  class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors">
            繼續配置
          </button>
        }
      </div>
    }
  `
})
export class ConfigProgressComponent {
  private stateService = inject(MonitoringStateService);
  
  // 輸入
  mode = input<'compact' | 'detailed' | 'card' | 'banner'>('detailed');
  
  // 輸出
  action = output<string>();
  
  // 從服務獲取狀態
  status = computed(() => this.stateService.configStatus());
  
  // 環形進度計算
  readonly circumference = 2 * Math.PI * 40; // r=40
  dashOffset = computed(() => {
    const percentage = this.status().percentage;
    return this.circumference * (1 - percentage / 100);
  });
  
  onAction(actionId: string) {
    this.action.emit(actionId);
  }
}
