/**
 * 快速入門向導組件
 * Quick Setup Wizard Component
 * 
 * 功能:
 * 1. 4步配置引導
 * 2. 實時狀態檢測
 * 3. 一鍵修復建議
 * 4. 進度可視化
 */

import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  action?: { label: string; handler: string };
  details?: string;
}

@Component({
  selector: 'app-setup-wizard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="setup-wizard bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl border border-slate-700/50 overflow-hidden">
      <!-- 標題欄 -->
      <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <span class="text-xl">🚀</span>
          </div>
          <div>
            <h3 class="text-lg font-semibold text-white">快速開始監控</h3>
            <p class="text-sm text-slate-400">完成以下配置即可開始自動監控</p>
          </div>
        </div>
        
        <!-- 進度指示 -->
        <div class="flex items-center gap-3">
          <div class="text-right">
            <div class="text-2xl font-bold" 
                 [class.text-emerald-400]="completedSteps() === totalSteps()"
                 [class.text-cyan-400]="completedSteps() < totalSteps()">
              {{ completedSteps() }}/{{ totalSteps() }}
            </div>
            <div class="text-xs text-slate-500">已完成</div>
          </div>
          <div class="w-16 h-16 relative">
            <svg class="w-16 h-16 transform -rotate-90">
              <circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="4" 
                      fill="none" class="text-slate-700"/>
              <circle cx="32" cy="32" r="28" stroke="currentColor" stroke-width="4" 
                      fill="none" class="text-cyan-500"
                      [style.strokeDasharray]="circumference"
                      [style.strokeDashoffset]="strokeDashoffset()"
                      stroke-linecap="round"/>
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              @if (completedSteps() === totalSteps()) {
                <span class="text-xl">✅</span>
              } @else {
                <span class="text-lg">{{ progressPercent() }}%</span>
              }
            </div>
          </div>
        </div>
      </div>
      
      <!-- 步驟列表 -->
      <div class="p-4 space-y-3">
        @for (step of steps(); track step.id; let i = $index) {
          <div class="step-item flex items-center gap-4 p-3 rounded-xl transition-all"
               [class.bg-slate-700/30]="step.status === 'pending'"
               [class.bg-cyan-500/10]="step.status === 'in_progress'"
               [class.bg-emerald-500/10]="step.status === 'completed'"
               [class.bg-red-500/10]="step.status === 'error'">
            
            <!-- 步驟圖標 -->
            <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                 [class.bg-slate-600]="step.status === 'pending'"
                 [class.bg-cyan-500/20]="step.status === 'in_progress'"
                 [class.bg-emerald-500/20]="step.status === 'completed'"
                 [class.bg-red-500/20]="step.status === 'error'">
              @switch (step.status) {
                @case ('completed') { <span>✅</span> }
                @case ('error') { <span>❌</span> }
                @case ('in_progress') { <span class="animate-pulse">{{ step.icon }}</span> }
                @default { <span>{{ step.icon }}</span> }
              }
            </div>
            
            <!-- 步驟內容 -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-xs text-slate-500">步驟 {{ i + 1 }}</span>
                @if (step.status === 'completed') {
                  <span class="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">已完成</span>
                } @else if (step.status === 'error') {
                  <span class="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">需修復</span>
                }
              </div>
              <h4 class="font-medium text-white truncate">{{ step.title }}</h4>
              <p class="text-sm text-slate-400 truncate">{{ step.description }}</p>
              @if (step.details) {
                <p class="text-xs text-slate-500 mt-1">{{ step.details }}</p>
              }
            </div>
            
            <!-- 操作按鈕 -->
            @if (step.action && step.status !== 'completed') {
              <button (click)="onAction(step.action.handler)"
                      class="px-4 py-2 text-sm font-medium rounded-lg transition-colors shrink-0"
                      [class.bg-cyan-500]="step.status === 'in_progress'"
                      [class.hover:bg-cyan-400]="step.status === 'in_progress'"
                      [class.text-white]="step.status === 'in_progress'"
                      [class.bg-slate-600]="step.status !== 'in_progress'"
                      [class.hover:bg-slate-500]="step.status !== 'in_progress'"
                      [class.text-slate-300]="step.status !== 'in_progress'">
                {{ step.action.label }}
              </button>
            }
          </div>
        }
      </div>
      
      <!-- 底部操作 -->
      @if (completedSteps() === totalSteps()) {
        <div class="p-4 border-t border-slate-700/50 bg-emerald-500/5">
          <button (click)="onStartMonitoring()"
                  class="w-full py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400
                         text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2
                         shadow-lg shadow-emerald-500/20">
            <span class="text-xl">▶️</span>
            開始監控
          </button>
        </div>
      } @else {
        <div class="p-4 border-t border-slate-700/50">
          <div class="flex items-center gap-2 text-sm text-slate-400">
            <span>💡</span>
            <span>完成所有步驟後即可開始監控</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .setup-wizard {
      backdrop-filter: blur(12px);
    }
  `]
})
export class SetupWizardComponent {
  // 輸入
  hasListenerAccount = input(false);
  hasSenderAccount = input(false);
  hasGroups = input(false);
  hasKeywordSets = input(false);
  hasKeywords = input(false);
  hasGroupBindings = input(false);
  
  listenerCount = input(0);
  groupCount = input(0);
  keywordSetCount = input(0);
  keywordCount = input(0);
  boundGroupCount = input(0);
  
  // 輸出
  action = output<string>();
  startMonitoring = output<void>();
  
  // 圓形進度條參數
  circumference = 2 * Math.PI * 28;
  
  // 計算步驟
  steps = computed<SetupStep[]>(() => {
    return [
      {
        id: 'listener',
        title: '添加監控帳號',
        description: '設置用於監控群組消息的帳號',
        icon: '👁️',
        status: this.hasListenerAccount() ? 'completed' : 'pending',
        action: { label: '添加帳號', handler: 'add-account' },
        details: this.hasListenerAccount() ? `已有 ${this.listenerCount()} 個監控號` : '還沒有監控帳號'
      },
      {
        id: 'groups',
        title: '添加監控群組',
        description: '添加要監控的 Telegram 群組',
        icon: '👥',
        status: this.hasGroups() ? 'completed' : (this.hasListenerAccount() ? 'in_progress' : 'pending'),
        action: { label: '添加群組', handler: 'add-group' },
        details: this.hasGroups() ? `已添加 ${this.groupCount()} 個群組` : '還沒有監控群組'
      },
      {
        id: 'keywords',
        title: '創建關鍵詞集',
        description: '設置要監控的關鍵詞',
        icon: '🔑',
        status: this.hasKeywords() ? 'completed' : (this.hasGroups() ? 'in_progress' : 'pending'),
        action: { label: '創建詞集', handler: 'add-keyword-set' },
        details: this.hasKeywords() ? `已有 ${this.keywordSetCount()} 個詞集，${this.keywordCount()} 個關鍵詞` : '還沒有關鍵詞'
      },
      {
        id: 'binding',
        title: '綁定詞集到群組',
        description: '將關鍵詞集應用到監控群組',
        icon: '🔗',
        status: this.hasGroupBindings() ? 'completed' : (this.hasKeywords() ? 'in_progress' : 'pending'),
        action: { label: '開始綁定', handler: 'bind-keywords' },
        details: this.hasGroupBindings() ? `${this.boundGroupCount()} 個群組已綁定詞集` : '群組尚未綁定詞集'
      }
    ];
  });
  
  totalSteps = computed(() => this.steps().length);
  
  completedSteps = computed(() => 
    this.steps().filter(s => s.status === 'completed').length
  );
  
  progressPercent = computed(() => 
    Math.round((this.completedSteps() / this.totalSteps()) * 100)
  );
  
  strokeDashoffset = computed(() => 
    this.circumference - (this.progressPercent() / 100) * this.circumference
  );
  
  onAction(handler: string) {
    this.action.emit(handler);
  }
  
  onStartMonitoring() {
    this.startMonitoring.emit();
  }
}
