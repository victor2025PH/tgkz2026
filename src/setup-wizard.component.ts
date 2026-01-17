/**
 * 配置嚮導組件 - Phase 1 優化
 * Setup Wizard with Smart Diagnostics
 * 
 * 功能:
 * 1. 步驟式配置引導
 * 2. 一鍵診斷與修復建議
 * 3. 配置完整度評分
 * 4. 智能問題定位
 */

import { Component, signal, computed, inject, OnInit, OnDestroy, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// 配置步驟定義
export interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: 'pending' | 'completed' | 'warning' | 'error';
  isRequired: boolean;
  count?: number;
  targetCount?: number;
  actionLabel?: string;
  actionView?: string;
  tips?: string[];
}

// 診斷問題定義
export interface DiagnosticIssue {
  code: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  fix: string;
  actionLabel: string;
  actionView: string;
  elementId?: string;
}

// 配置摘要
export interface ConfigSummary {
  score: number;  // 0-100
  canMonitor: boolean;
  canSendMessages: boolean;
  canAutoReply: boolean;
  criticalCount: number;
  warningCount: number;
  completedSteps: number;
  totalSteps: number;
}

@Component({
  selector: 'app-setup-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="setup-wizard bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 
                rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl">
      
      <!-- 頭部 - 配置分數 -->
      <div class="p-6 border-b border-slate-700/50 bg-gradient-to-r from-cyan-500/10 to-purple-500/10">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="relative">
              <!-- 圓形進度環 -->
              <svg class="w-20 h-20 transform -rotate-90">
                <circle cx="40" cy="40" r="36" stroke-width="6" 
                        fill="none" stroke="rgba(148, 163, 184, 0.2)"/>
                <circle cx="40" cy="40" r="36" stroke-width="6"
                        fill="none" 
                        [attr.stroke]="getScoreColor()"
                        stroke-linecap="round"
                        [attr.stroke-dasharray]="getScoreDasharray()"
                        class="transition-all duration-1000"/>
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-2xl font-bold" [style.color]="getScoreColor()">
                  {{ configSummary().score }}
                </span>
              </div>
            </div>
            
            <div>
              <h2 class="text-xl font-bold text-white mb-1">配置完整度</h2>
              <p class="text-sm text-slate-400">
                {{ configSummary().completedSteps }}/{{ configSummary().totalSteps }} 步驟完成
              </p>
              <div class="flex gap-3 mt-2">
                @if (configSummary().canMonitor) {
                  <span class="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                    ✓ 可監控
                  </span>
                }
                @if (configSummary().canSendMessages) {
                  <span class="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                    ✓ 可發送
                  </span>
                }
                @if (configSummary().canAutoReply) {
                  <span class="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                    ✓ AI 回覆
                  </span>
                }
              </div>
            </div>
          </div>
          
          <div class="flex items-center gap-3">
            <button (click)="runDiagnostics()" 
                    [disabled]="isRunningDiagnostics()"
                    class="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 
                           text-white rounded-lg flex items-center gap-2 transition-all">
              @if (isRunningDiagnostics()) {
                <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
                </svg>
                <span>診斷中...</span>
              } @else {
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
                <span>一鍵診斷</span>
              }
            </button>
            
            @if (configSummary().score >= 80) {
              <button (click)="startMonitoring.emit()" 
                      class="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 
                             hover:from-green-400 hover:to-emerald-400
                             text-white rounded-lg flex items-center gap-2 transition-all
                             shadow-lg shadow-green-500/20">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                <span>開始監控</span>
              </button>
            }
          </div>
        </div>
      </div>
      
      <!-- 配置步驟 -->
      <div class="p-6">
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
          @for (step of setupSteps(); track step.id) {
            <div (click)="goToStep(step)"
                 class="relative bg-slate-800/50 rounded-xl p-4 cursor-pointer 
                        border transition-all duration-300 hover:bg-slate-700/50 group"
                 [class.border-green-500/50]="step.status === 'completed'"
                 [class.border-yellow-500/50]="step.status === 'warning'"
                 [class.border-red-500/50]="step.status === 'error'"
                 [class.border-slate-600/50]="step.status === 'pending'">
              
              <!-- 狀態指示器 -->
              <div class="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                   [class.bg-green-500]="step.status === 'completed'"
                   [class.bg-yellow-500]="step.status === 'warning'"
                   [class.bg-red-500]="step.status === 'error'"
                   [class.bg-slate-600]="step.status === 'pending'">
                @switch (step.status) {
                  @case ('completed') { ✓ }
                  @case ('warning') { ! }
                  @case ('error') { ✗ }
                  @default { {{ getStepIndex(step) }} }
                }
              </div>
              
              <!-- 圖標 -->
              <div class="text-3xl mb-3 text-center">{{ step.icon }}</div>
              
              <!-- 標題 -->
              <h3 class="font-semibold text-white text-center text-sm mb-1">{{ step.title }}</h3>
              
              <!-- 計數 -->
              @if (step.count !== undefined) {
                <div class="text-center">
                  <span class="text-lg font-bold" 
                        [class.text-green-400]="step.status === 'completed'"
                        [class.text-yellow-400]="step.status === 'warning'"
                        [class.text-red-400]="step.status === 'error'"
                        [class.text-slate-400]="step.status === 'pending'">
                    {{ step.count }}
                  </span>
                  @if (step.targetCount) {
                    <span class="text-slate-500 text-sm">/{{ step.targetCount }}</span>
                  }
                </div>
              }
              
              <!-- 描述 -->
              <p class="text-xs text-slate-400 text-center mt-2">{{ step.description }}</p>
              
              <!-- 懸停提示 -->
              @if (step.tips && step.tips.length > 0) {
                <div class="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-3 
                            bg-slate-900 rounded-lg shadow-xl border border-slate-700
                            opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  <ul class="text-xs text-slate-300 space-y-1">
                    @for (tip of step.tips; track tip) {
                      <li>💡 {{ tip }}</li>
                    }
                  </ul>
                </div>
              }
            </div>
          }
        </div>
        
        <!-- 診斷問題列表 -->
        @if (diagnosticIssues().length > 0) {
          <div class="space-y-3">
            <h3 class="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              發現 {{ diagnosticIssues().length }} 個問題需要處理
            </h3>
            
            @for (issue of diagnosticIssues(); track issue.code) {
              <div class="flex items-start gap-3 p-4 rounded-xl transition-all cursor-pointer hover:scale-[1.01]"
                   [class.bg-red-500/10]="issue.severity === 'critical'"
                   [class.border-red-500/30]="issue.severity === 'critical'"
                   [class.bg-yellow-500/10]="issue.severity === 'warning'"
                   [class.border-yellow-500/30]="issue.severity === 'warning'"
                   [class.bg-blue-500/10]="issue.severity === 'info'"
                   [class.border-blue-500/30]="issue.severity === 'info'"
                   class="border"
                   (click)="navigateToIssue(issue)">
                
                <!-- 嚴重度圖標 -->
                <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                     [class.bg-red-500/20]="issue.severity === 'critical'"
                     [class.bg-yellow-500/20]="issue.severity === 'warning'"
                     [class.bg-blue-500/20]="issue.severity === 'info'">
                  @switch (issue.severity) {
                    @case ('critical') {
                      <span class="text-red-400">✗</span>
                    }
                    @case ('warning') {
                      <span class="text-yellow-400">⚠</span>
                    }
                    @default {
                      <span class="text-blue-400">ℹ</span>
                    }
                  }
                </div>
                
                <!-- 問題詳情 -->
                <div class="flex-1 min-w-0">
                  <h4 class="font-medium text-white text-sm">{{ issue.title }}</h4>
                  <p class="text-xs text-slate-400 mt-0.5">{{ issue.description }}</p>
                  <p class="text-xs mt-1"
                     [class.text-red-300]="issue.severity === 'critical'"
                     [class.text-yellow-300]="issue.severity === 'warning'"
                     [class.text-blue-300]="issue.severity === 'info'">
                    💡 修復: {{ issue.fix }}
                  </p>
                </div>
                
                <!-- 操作按鈕 -->
                <button class="flex-shrink-0 px-3 py-1.5 text-xs rounded-lg flex items-center gap-1
                               transition-all hover:scale-105"
                        [class.bg-red-500/20]="issue.severity === 'critical'"
                        [class.text-red-300]="issue.severity === 'critical'"
                        [class.hover:bg-red-500/30]="issue.severity === 'critical'"
                        [class.bg-yellow-500/20]="issue.severity === 'warning'"
                        [class.text-yellow-300]="issue.severity === 'warning'"
                        [class.hover:bg-yellow-500/30]="issue.severity === 'warning'"
                        [class.bg-blue-500/20]="issue.severity === 'info'"
                        [class.text-blue-300]="issue.severity === 'info'"
                        [class.hover:bg-blue-500/30]="issue.severity === 'info'">
                  {{ issue.actionLabel }}
                  <span>→</span>
                </button>
              </div>
            }
          </div>
        }
        
        <!-- 全部配置正常 -->
        @if (diagnosticIssues().length === 0 && configSummary().score >= 80) {
          <div class="text-center py-8">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full 
                        bg-gradient-to-br from-green-500/20 to-emerald-500/20 mb-4">
              <span class="text-3xl">🎉</span>
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">配置已就緒！</h3>
            <p class="text-sm text-slate-400 mb-4">所有必要配置已完成，可以開始監控了</p>
            <button (click)="startMonitoring.emit()"
                    class="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 
                           hover:from-green-400 hover:to-emerald-400
                           text-white font-semibold rounded-xl flex items-center gap-2 mx-auto
                           shadow-lg shadow-green-500/20 transition-all hover:scale-105">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              開始智能監控
            </button>
          </div>
        }
        
        <!-- 快速操作區 -->
        @if (configSummary().score < 80) {
          <div class="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <h4 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              ⚡ 快速設置
            </h4>
            <div class="flex flex-wrap gap-2">
              @for (action of quickActions(); track action.id) {
                <button (click)="executeQuickAction(action)"
                        class="px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 
                               text-slate-300 hover:text-white text-sm rounded-lg
                               border border-slate-600/50 transition-all flex items-center gap-2">
                  <span>{{ action.icon }}</span>
                  <span>{{ action.label }}</span>
                </button>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .setup-wizard {
      backdrop-filter: blur(20px);
    }
  `]
})
export class SetupWizardComponent implements OnInit, OnDestroy {
  // 輸出事件
  startMonitoring = output<void>();
  navigateTo = output<{view: string, elementId?: string}>();
  
  // 狀態
  isRunningDiagnostics = signal(false);
  
  // 配置步驟
  setupSteps = signal<SetupStep[]>([
    {
      id: 'listener',
      title: '監控帳號',
      description: '設置監聽角色的帳號',
      icon: '👁️',
      status: 'pending',
      isRequired: true,
      count: 0,
      targetCount: 1,
      actionLabel: '設置帳號',
      actionView: 'accounts',
      tips: ['監控號用於監聽群組消息', '建議至少設置1個專用監控號']
    },
    {
      id: 'groups',
      title: '監控群組',
      description: '添加要監控的群組',
      icon: '💬',
      status: 'pending',
      isRequired: true,
      count: 0,
      targetCount: 1,
      actionLabel: '添加群組',
      actionView: 'automation',
      tips: ['可從資源發現中搜索群組', '監控號需已加入群組']
    },
    {
      id: 'keywords',
      title: '關鍵詞',
      description: '設置觸發關鍵詞',
      icon: '🔑',
      status: 'pending',
      isRequired: true,
      count: 0,
      targetCount: 1,
      actionLabel: '添加關鍵詞',
      actionView: 'automation',
      tips: ['支持正則表達式', '多個關鍵詞用逗號分隔']
    },
    {
      id: 'sender',
      title: '發送帳號',
      description: '設置發送消息的帳號',
      icon: '📤',
      status: 'pending',
      isRequired: false,
      count: 0,
      targetCount: 1,
      actionLabel: '設置帳號',
      actionView: 'accounts',
      tips: ['發送號用於私聊觸達', '建議與監控號分開使用']
    },
    {
      id: 'campaign',
      title: '自動活動',
      description: '配置自動化活動',
      icon: '⚡',
      status: 'pending',
      isRequired: false,
      count: 0,
      targetCount: 1,
      actionLabel: '創建活動',
      actionView: 'automation',
      tips: ['活動定義觸發後的動作', '可設置延遲和條件']
    }
  ]);
  
  // 診斷問題
  diagnosticIssues = signal<DiagnosticIssue[]>([]);
  
  // 配置摘要
  configSummary = computed<ConfigSummary>(() => {
    const steps = this.setupSteps();
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const requiredSteps = steps.filter(s => s.isRequired);
    const requiredCompleted = requiredSteps.filter(s => s.status === 'completed').length;
    
    const issues = this.diagnosticIssues();
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    
    // 計算分數
    let score = 0;
    if (requiredSteps.length > 0) {
      score = Math.round((requiredCompleted / requiredSteps.length) * 60);
    }
    const optionalSteps = steps.filter(s => !s.isRequired);
    const optionalCompleted = optionalSteps.filter(s => s.status === 'completed').length;
    if (optionalSteps.length > 0) {
      score += Math.round((optionalCompleted / optionalSteps.length) * 40);
    }
    
    // 扣除問題分數
    score = Math.max(0, score - criticalCount * 20 - warningCount * 5);
    
    return {
      score,
      canMonitor: requiredCompleted >= requiredSteps.length && criticalCount === 0,
      canSendMessages: steps.find(s => s.id === 'sender')?.status === 'completed',
      canAutoReply: steps.find(s => s.id === 'campaign')?.status === 'completed',
      criticalCount,
      warningCount,
      completedSteps,
      totalSteps: steps.length
    };
  });
  
  // 快速操作
  quickActions = signal([
    { id: 'add-account', icon: '➕', label: '添加帳號', view: 'add-account' },
    { id: 'discover-groups', icon: '🔍', label: '發現群組', view: 'resources' },
    { id: 'import-keywords', icon: '📋', label: '導入關鍵詞', view: 'automation' },
    { id: 'create-campaign', icon: '⚡', label: '創建活動', view: 'automation' }
  ]);
  
  ngOnInit() {
    // 初始化時運行診斷
    this.runDiagnostics();
  }
  
  ngOnDestroy() {}
  
  // 運行診斷
  runDiagnostics() {
    this.isRunningDiagnostics.set(true);
    
    // 模擬診斷過程（實際會調用 IPC）
    setTimeout(() => {
      // 這裡會根據實際配置更新步驟狀態
      // 實際實現時會發送 IPC 請求
      this.isRunningDiagnostics.set(false);
    }, 1500);
  }
  
  // 更新步驟狀態
  updateStepStatus(stepId: string, status: SetupStep['status'], count?: number) {
    this.setupSteps.update(steps => 
      steps.map(s => s.id === stepId ? { ...s, status, count: count ?? s.count } : s)
    );
  }
  
  // 添加診斷問題
  addDiagnosticIssue(issue: DiagnosticIssue) {
    this.diagnosticIssues.update(issues => [...issues, issue]);
  }
  
  // 清除診斷問題
  clearDiagnosticIssues() {
    this.diagnosticIssues.set([]);
  }
  
  // 獲取步驟索引
  getStepIndex(step: SetupStep): number {
    return this.setupSteps().findIndex(s => s.id === step.id) + 1;
  }
  
  // 獲取分數顏色
  getScoreColor(): string {
    const score = this.configSummary().score;
    if (score >= 80) return '#22c55e';  // green
    if (score >= 60) return '#eab308';  // yellow
    if (score >= 40) return '#f97316';  // orange
    return '#ef4444';  // red
  }
  
  // 獲取分數環形進度
  getScoreDasharray(): string {
    const circumference = 2 * Math.PI * 36;
    const score = this.configSummary().score;
    const progress = (score / 100) * circumference;
    return `${progress} ${circumference}`;
  }
  
  // 跳轉到步驟
  goToStep(step: SetupStep) {
    if (step.actionView) {
      this.navigateTo.emit({ view: step.actionView });
    }
  }
  
  // 跳轉到問題
  navigateToIssue(issue: DiagnosticIssue) {
    this.navigateTo.emit({ view: issue.actionView, elementId: issue.elementId });
  }
  
  // 執行快速操作
  executeQuickAction(action: {id: string, view: string}) {
    this.navigateTo.emit({ view: action.view });
  }
}
