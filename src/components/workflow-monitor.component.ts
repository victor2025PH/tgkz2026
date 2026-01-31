/**
 * 工作流執行監控組件
 * Workflow Execution Monitor Component
 * 
 * 🆕 Phase 2：實時監控工作流執行狀態
 * 
 * 功能：
 * - 活躍執行列表
 * - 執行詳情查看
 * - 手動干預（暫停/繼續/取消）
 * - 轉化漏斗可視化
 */

import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AutomationWorkflowService, WorkflowExecution } from '../services/automation-workflow.service';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-workflow-monitor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="workflow-monitor">
      <!-- 標題和統計 -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <span class="text-3xl">📊</span>
          <div>
            <h2 class="text-xl font-bold" style="color: var(--text-primary);">執行監控</h2>
            <p class="text-sm" style="color: var(--text-muted);">實時追蹤工作流執行狀態</p>
          </div>
        </div>
        
        <!-- 快速統計 -->
        <div class="flex items-center gap-4">
          <div class="text-center">
            <div class="text-2xl font-bold" style="color: var(--success);">{{ runningCount() }}</div>
            <div class="text-xs" style="color: var(--text-muted);">進行中</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold" style="color: var(--warning);">{{ pendingCount() }}</div>
            <div class="text-xs" style="color: var(--text-muted);">等待中</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold" style="color: var(--primary);">{{ completedTodayCount() }}</div>
            <div class="text-xs" style="color: var(--text-muted);">今日完成</div>
          </div>
        </div>
      </div>
      
      <!-- 轉化漏斗 -->
      <div class="rounded-xl p-5 mb-6" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
        <h3 class="text-lg font-bold mb-4 flex items-center gap-2" style="color: var(--text-primary);">
          <span>🎯</span>
          <span>轉化漏斗</span>
        </h3>
        
        <div class="flex items-end justify-between gap-2 h-32">
          @for (stage of funnelStages(); track stage.id) {
            <div class="flex-1 flex flex-col items-center">
              <div class="w-full rounded-t-lg transition-all duration-500"
                   [style.height.%]="stage.percentage"
                   [style.background]="stage.gradient">
              </div>
              <div class="mt-2 text-center">
                <div class="text-sm font-bold" style="color: var(--text-primary);">{{ stage.count }}</div>
                <div class="text-xs" style="color: var(--text-muted);">{{ stage.name }}</div>
              </div>
            </div>
          }
        </div>
      </div>
      
      <!-- 執行列表 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        @for (execution of activeExecutions(); track execution.id) {
          <div class="rounded-xl p-4 transition-all hover:shadow-lg"
               style="background-color: var(--bg-card); border: 1px solid var(--border-color);"
               [class.border-cyan-500]="execution.status === 'running'"
               [class.border-l-4]="execution.status === 'running'">
            <!-- 執行頭部 -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="text-lg">{{ getStatusIcon(execution.status) }}</span>
                <div>
                  <div class="font-medium" style="color: var(--text-primary);">
                    @{{ execution.targetUserName }}
                  </div>
                  <div class="text-xs" style="color: var(--text-muted);">
                    {{ formatTime(execution.startedAt) }}
                  </div>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                <!-- 轉化概率 -->
                <div class="px-2 py-1 rounded-full text-xs font-medium"
                     [style.background-color]="getConversionColor(execution)"
                     style="color: white;">
                  {{ getConversionProbability(execution) }}% 轉化
                </div>
                
                <!-- 操作按鈕 -->
                @if (execution.status === 'running' || execution.status === 'pending') {
                  <button (click)="cancelExecution(execution.id)"
                          class="p-1 rounded hover:bg-red-500/20 transition-colors"
                          style="color: var(--error);"
                          title="取消執行">
                    ✕
                  </button>
                }
              </div>
            </div>
            
            <!-- 步驟進度 -->
            <div class="flex items-center gap-1 mb-3">
              @for (step of getWorkflowSteps(); track step.id; let i = $index) {
                <div class="flex items-center">
                  <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all"
                       [class.bg-emerald-500]="isStepCompleted(execution, step.id)"
                       [class.bg-cyan-500]="execution.currentStep === step.id && execution.status === 'running'"
                       [class.animate-pulse]="execution.currentStep === step.id && execution.status === 'running'"
                       [class.bg-slate-600]="!isStepCompleted(execution, step.id) && execution.currentStep !== step.id"
                       style="color: white;">
                    @if (isStepCompleted(execution, step.id)) {
                      ✓
                    } @else {
                      {{ i + 1 }}
                    }
                  </div>
                  @if (i < getWorkflowSteps().length - 1) {
                    <div class="w-4 h-0.5 transition-all"
                         [class.bg-emerald-500]="isStepCompleted(execution, step.id)"
                         [class.bg-slate-600]="!isStepCompleted(execution, step.id)">
                    </div>
                  }
                </div>
              }
            </div>
            
            <!-- 當前步驟說明 -->
            <div class="text-sm p-2 rounded-lg" style="background-color: var(--bg-secondary);">
              <span style="color: var(--text-muted);">當前：</span>
              <span style="color: var(--text-primary);">{{ getCurrentStepName(execution) }}</span>
              
              @if (execution.stepResults[execution.currentStep]?.data) {
                <span class="text-xs ml-2" style="color: var(--success);">
                  {{ getStepResultSummary(execution) }}
                </span>
              }
            </div>
            
            <!-- 詳情展開 -->
            @if (expandedExecution() === execution.id) {
              <div class="mt-3 pt-3 border-t" style="border-color: var(--border-color);">
                <h4 class="text-sm font-medium mb-2" style="color: var(--text-secondary);">執行詳情</h4>
                
                <div class="space-y-2 text-xs">
                  @for (step of getWorkflowSteps(); track step.id) {
                    @if (execution.stepResults[step.id]) {
                      <div class="flex items-center justify-between p-2 rounded" style="background-color: var(--bg-tertiary);">
                        <span style="color: var(--text-secondary);">{{ step.name }}</span>
                        <span [class.text-emerald-400]="execution.stepResults[step.id].status === 'success'"
                              [class.text-red-400]="execution.stepResults[step.id].status === 'failed'"
                              [class.text-slate-400]="execution.stepResults[step.id].status === 'skipped'">
                          {{ getStepStatusText(execution.stepResults[step.id].status) }}
                        </span>
                      </div>
                    }
                  }
                </div>
                
                @if (execution.aiPlanResult) {
                  <div class="mt-2 p-2 rounded text-xs" style="background-color: var(--bg-tertiary);">
                    <span style="color: var(--text-muted);">AI 策略：</span>
                    <span style="color: var(--text-secondary);">{{ execution.aiPlanResult.strategy || '標準營銷' }}</span>
                  </div>
                }
              </div>
            }
            
            <!-- 展開/收起按鈕 -->
            <button (click)="toggleExpand(execution.id)"
                    class="w-full mt-2 text-xs py-1 rounded transition-colors hover:bg-slate-700/50"
                    style="color: var(--text-muted);">
              {{ expandedExecution() === execution.id ? '收起 ▲' : '詳情 ▼' }}
            </button>
          </div>
        } @empty {
          <div class="col-span-2 text-center py-12" style="color: var(--text-muted);">
            <span class="text-4xl block mb-4">🎯</span>
            <p>暫無進行中的工作流</p>
            <p class="text-sm mt-2">當監控群組觸發關鍵詞時，工作流將自動開始</p>
          </div>
        }
      </div>
      
      <!-- 已完成列表 -->
      @if (completedExecutions().length > 0) {
        <div class="mt-6">
          <h3 class="text-lg font-bold mb-4 flex items-center gap-2" style="color: var(--text-primary);">
            <span>✅</span>
            <span>近期完成</span>
          </h3>
          
          <div class="rounded-xl overflow-hidden" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
            <table class="w-full text-sm">
              <thead>
                <tr style="background-color: var(--bg-secondary);">
                  <th class="text-left p-3" style="color: var(--text-muted);">用戶</th>
                  <th class="text-left p-3" style="color: var(--text-muted);">結果</th>
                  <th class="text-left p-3" style="color: var(--text-muted);">耗時</th>
                  <th class="text-left p-3" style="color: var(--text-muted);">完成時間</th>
                </tr>
              </thead>
              <tbody>
                @for (execution of completedExecutions().slice(0, 5); track execution.id) {
                  <tr class="border-t" style="border-color: var(--border-color);">
                    <td class="p-3" style="color: var(--text-primary);">@{{ execution.targetUserName }}</td>
                    <td class="p-3">
                      <span class="px-2 py-1 rounded-full text-xs"
                            [class.bg-emerald-500/20]="execution.outcome === 'converted'"
                            [class.text-emerald-400]="execution.outcome === 'converted'"
                            [class.bg-amber-500/20]="execution.outcome === 'interested'"
                            [class.text-amber-400]="execution.outcome === 'interested'"
                            [class.bg-slate-500/20]="!execution.outcome || execution.outcome === 'neutral'"
                            [class.text-slate-400]="!execution.outcome || execution.outcome === 'neutral'">
                        {{ getOutcomeText(execution.outcome) }}
                      </span>
                    </td>
                    <td class="p-3" style="color: var(--text-muted);">{{ getDuration(execution) }}</td>
                    <td class="p-3" style="color: var(--text-muted);">{{ formatTime(execution.completedAt) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .workflow-monitor {
      padding: 1.5rem;
    }
  `]
})
export class WorkflowMonitorComponent implements OnInit, OnDestroy {
  private readonly workflowService = inject(AutomationWorkflowService);
  private readonly toast = inject(ToastService);
  
  // 展開的執行
  expandedExecution = signal<string | null>(null);
  
  // 執行列表
  executions = this.workflowService.executions;
  
  // 活躍執行
  activeExecutions = computed(() => 
    this.executions().filter(e => e.status === 'running' || e.status === 'pending')
  );
  
  // 已完成執行
  completedExecutions = computed(() =>
    this.executions().filter(e => e.status === 'completed' || e.status === 'failed')
  );
  
  // 統計
  runningCount = computed(() => this.executions().filter(e => e.status === 'running').length);
  pendingCount = computed(() => this.executions().filter(e => e.status === 'pending').length);
  completedTodayCount = computed(() => {
    const today = new Date().toDateString();
    return this.executions().filter(e => 
      e.status === 'completed' && e.completedAt && new Date(e.completedAt).toDateString() === today
    ).length;
  });
  
  // 轉化漏斗數據
  funnelStages = computed(() => {
    const all = this.executions();
    const total = all.length || 1;
    
    const triggered = all.length;
    const planned = all.filter(e => e.stepResults['plan']?.status === 'success').length;
    const chatted = all.filter(e => e.stepResults['private_chat']?.status === 'success').length;
    const interested = all.filter(e => e.stepResults['detect_interest']?.status === 'success').length;
    const converted = all.filter(e => e.outcome === 'converted').length;
    
    return [
      { id: 'triggered', name: '觸發', count: triggered, percentage: 100, gradient: 'linear-gradient(to top, #6366f1, #8b5cf6)' },
      { id: 'planned', name: '策劃', count: planned, percentage: (planned / total) * 100, gradient: 'linear-gradient(to top, #3b82f6, #6366f1)' },
      { id: 'chatted', name: '私聊', count: chatted, percentage: (chatted / total) * 100, gradient: 'linear-gradient(to top, #06b6d4, #3b82f6)' },
      { id: 'interested', name: '興趣', count: interested, percentage: (interested / total) * 100, gradient: 'linear-gradient(to top, #10b981, #06b6d4)' },
      { id: 'converted', name: '轉化', count: converted, percentage: (converted / total) * 100, gradient: 'linear-gradient(to top, #22c55e, #10b981)' }
    ];
  });
  
  // 工作流步驟
  private workflowSteps = [
    { id: 'evaluate', name: '評估' },
    { id: 'plan', name: 'AI策劃' },
    { id: 'private_chat', name: '私聊' },
    { id: 'detect_interest', name: '興趣' },
    { id: 'create_group', name: '建群' },
    { id: 'group_marketing', name: '營銷' },
    { id: 'record', name: '記錄' }
  ];
  
  ngOnInit(): void {}
  ngOnDestroy(): void {}
  
  // 獲取工作流步驟
  getWorkflowSteps() {
    return this.workflowSteps;
  }
  
  // 步驟是否完成
  isStepCompleted(execution: WorkflowExecution, stepId: string): boolean {
    return execution.stepResults[stepId]?.status === 'success';
  }
  
  // 獲取當前步驟名稱
  getCurrentStepName(execution: WorkflowExecution): string {
    const step = this.workflowSteps.find(s => s.id === execution.currentStep);
    return step?.name || execution.currentStep;
  }
  
  // 獲取狀態圖標
  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'running': '🔄',
      'pending': '⏳',
      'completed': '✅',
      'failed': '❌',
      'cancelled': '🚫',
      'paused': '⏸️'
    };
    return icons[status] || '❓';
  }
  
  // 獲取步驟狀態文本
  getStepStatusText(status: string): string {
    const texts: Record<string, string> = {
      'success': '✓ 完成',
      'failed': '✗ 失敗',
      'skipped': '- 跳過'
    };
    return texts[status] || status;
  }
  
  // 獲取結果摘要
  getStepResultSummary(execution: WorkflowExecution): string {
    const result = execution.stepResults[execution.currentStep];
    if (!result?.data) return '';
    
    if (result.data.type) {
      return `信號: ${result.data.type}`;
    }
    return '';
  }
  
  // 獲取轉化概率
  getConversionProbability(execution: WorkflowExecution): number {
    return Math.round(this.workflowService.calculateConversionProbability(execution) * 100);
  }
  
  // 獲取轉化概率顏色
  getConversionColor(execution: WorkflowExecution): string {
    const prob = this.workflowService.calculateConversionProbability(execution);
    if (prob >= 0.7) return '#22c55e';
    if (prob >= 0.5) return '#f59e0b';
    return '#6b7280';
  }
  
  // 獲取結果文本
  getOutcomeText(outcome: string | undefined): string {
    const texts: Record<string, string> = {
      'converted': '已轉化',
      'interested': '有興趣',
      'neutral': '中性',
      'rejected': '拒絕',
      'no_response': '無響應'
    };
    return texts[outcome || ''] || '進行中';
  }
  
  // 計算耗時
  getDuration(execution: WorkflowExecution): string {
    if (!execution.completedAt) return '-';
    const start = new Date(execution.startedAt).getTime();
    const end = new Date(execution.completedAt).getTime();
    const minutes = Math.round((end - start) / 60000);
    return `${minutes}分鐘`;
  }
  
  // 格式化時間
  formatTime(date: Date | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  
  // 展開/收起
  toggleExpand(id: string): void {
    this.expandedExecution.update(current => current === id ? null : id);
  }
  
  // 取消執行
  cancelExecution(id: string): void {
    this.workflowService.cancelExecution(id);
  }
}
