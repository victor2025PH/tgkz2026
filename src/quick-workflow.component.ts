/**
 * 快速工作流組件 - Phase 1 優化
 * Quick Workflow for Cross-Module Operations
 * 
 * 功能:
 * 1. 一鍵流程執行
 * 2. 跨模塊操作聯動
 * 3. 智能推薦下一步
 * 4. 操作歷史記錄
 */

import { Component, signal, computed, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

// 工作流步驟
export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: 'pending' | 'active' | 'completed' | 'skipped' | 'error';
  isOptional: boolean;
  actionView?: string;
  actionHandler?: string;
}

// 工作流定義
export interface Workflow {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'acquisition' | 'conversion' | 'automation';
  steps: WorkflowStep[];
  estimatedTime: string;
  difficulty: 'easy' | 'medium' | 'advanced';
}

// 快速操作
export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  actionView: string;
  actionHandler?: string;
  badge?: string;
  isRecommended?: boolean;
}

@Component({
  selector: 'app-quick-workflow',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="quick-workflow">
      <!-- 模式切換 -->
      <div class="flex items-center gap-3 mb-6">
        <button (click)="mode.set('workflows')"
                class="flex-1 py-3 rounded-xl border transition-all text-center"
                [class.bg-gradient-to-r]="mode() === 'workflows'"
                [class.from-cyan-500/20]="mode() === 'workflows'"
                [class.to-blue-500/20]="mode() === 'workflows'"
                [class.border-cyan-500/50]="mode() === 'workflows'"
                [class.text-white]="mode() === 'workflows'"
                [class.bg-slate-800/50]="mode() !== 'workflows'"
                [class.border-slate-600/50]="mode() !== 'workflows'"
                [class.text-slate-400]="mode() !== 'workflows'">
          <span class="text-xl block mb-1">🎯</span>
          <span class="text-sm font-medium">引導式工作流</span>
        </button>
        
        <button (click)="mode.set('actions')"
                class="flex-1 py-3 rounded-xl border transition-all text-center"
                [class.bg-gradient-to-r]="mode() === 'actions'"
                [class.from-purple-500/20]="mode() === 'actions'"
                [class.to-pink-500/20]="mode() === 'actions'"
                [class.border-purple-500/50]="mode() === 'actions'"
                [class.text-white]="mode() === 'actions'"
                [class.bg-slate-800/50]="mode() !== 'actions'"
                [class.border-slate-600/50]="mode() !== 'actions'"
                [class.text-slate-400]="mode() !== 'actions'">
          <span class="text-xl block mb-1">⚡</span>
          <span class="text-sm font-medium">快速操作</span>
        </button>
      </div>
      
      <!-- 工作流模式 -->
      @if (mode() === 'workflows') {
        <div class="space-y-4">
          <!-- 推薦工作流 -->
          @if (recommendedWorkflow()) {
            <div class="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 
                        border border-cyan-500/30 rounded-xl">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-lg">💡</span>
                <span class="text-sm font-semibold text-cyan-400">AI 推薦</span>
              </div>
              <h3 class="text-white font-semibold mb-1">{{ recommendedWorkflow()!.title }}</h3>
              <p class="text-sm text-slate-400 mb-3">{{ recommendedWorkflow()!.description }}</p>
              <button (click)="startWorkflow(recommendedWorkflow()!)"
                      class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white 
                             text-sm font-medium rounded-lg transition-all">
                開始此流程
              </button>
            </div>
          }
          
          <!-- 工作流列表 -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            @for (workflow of workflows(); track workflow.id) {
              <div (click)="startWorkflow(workflow)"
                   class="group p-4 bg-slate-800/50 hover:bg-slate-700/50 
                          border border-slate-600/50 hover:border-cyan-500/30
                          rounded-xl cursor-pointer transition-all">
                <div class="flex items-start gap-3">
                  <span class="text-2xl">{{ workflow.icon }}</span>
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <h4 class="font-medium text-white group-hover:text-cyan-400 transition-colors">
                        {{ workflow.title }}
                      </h4>
                      <span class="text-xs px-1.5 py-0.5 rounded"
                            [class.bg-green-500/20]="workflow.difficulty === 'easy'"
                            [class.text-green-400]="workflow.difficulty === 'easy'"
                            [class.bg-yellow-500/20]="workflow.difficulty === 'medium'"
                            [class.text-yellow-400]="workflow.difficulty === 'medium'"
                            [class.bg-red-500/20]="workflow.difficulty === 'advanced'"
                            [class.text-red-400]="workflow.difficulty === 'advanced'">
                        {{ getDifficultyLabel(workflow.difficulty) }}
                      </span>
                    </div>
                    <p class="text-xs text-slate-400 mb-2">{{ workflow.description }}</p>
                    <div class="flex items-center gap-3 text-xs text-slate-500">
                      <span>{{ workflow.steps.length }} 步驟</span>
                      <span>約 {{ workflow.estimatedTime }}</span>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      }
      
      <!-- 快速操作模式 -->
      @if (mode() === 'actions') {
        <div class="space-y-4">
          <!-- 分類標籤 -->
          <div class="flex gap-2 overflow-x-auto pb-2">
            @for (category of categories; track category.id) {
              <button (click)="activeCategory.set(category.id)"
                      class="px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all"
                      [class.bg-purple-500]="activeCategory() === category.id"
                      [class.text-white]="activeCategory() === category.id"
                      [class.bg-slate-700/50]="activeCategory() !== category.id"
                      [class.text-slate-400]="activeCategory() !== category.id"
                      [class.hover:bg-slate-600/50]="activeCategory() !== category.id">
                {{ category.icon }} {{ category.label }}
              </button>
            }
          </div>
          
          <!-- 操作網格 -->
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            @for (action of filteredActions(); track action.id) {
              <div (click)="executeAction(action)"
                   class="group relative p-4 bg-slate-800/50 hover:bg-slate-700/50 
                          border border-slate-600/50 hover:border-purple-500/30
                          rounded-xl cursor-pointer transition-all text-center">
                
                <!-- 推薦標籤 -->
                @if (action.isRecommended) {
                  <div class="absolute -top-2 -right-2 px-1.5 py-0.5 bg-gradient-to-r 
                              from-yellow-500 to-orange-500 text-white text-xs 
                              font-semibold rounded-full">
                    ⭐
                  </div>
                }
                
                <!-- 徽章 -->
                @if (action.badge) {
                  <div class="absolute -top-2 -left-2 px-1.5 py-0.5 bg-red-500 
                              text-white text-xs font-bold rounded-full">
                    {{ action.badge }}
                  </div>
                }
                
                <div class="text-3xl mb-2">{{ action.icon }}</div>
                <h4 class="text-sm font-medium text-white group-hover:text-purple-400 
                           transition-colors mb-1">
                  {{ action.title }}
                </h4>
                <p class="text-xs text-slate-500">{{ action.description }}</p>
              </div>
            }
          </div>
        </div>
      }
      
      <!-- 活躍工作流進度 -->
      @if (activeWorkflow()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
             (click)="closeWorkflow()">
          <div class="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
               (click)="$event.stopPropagation()">
            
            <!-- 工作流頭部 -->
            <div class="p-6 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 
                        border-b border-slate-700/50">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="text-3xl">{{ activeWorkflow()!.icon }}</span>
                  <div>
                    <h2 class="text-xl font-bold text-white">{{ activeWorkflow()!.title }}</h2>
                    <p class="text-sm text-slate-400">{{ activeWorkflow()!.description }}</p>
                  </div>
                </div>
                <button (click)="closeWorkflow()"
                        class="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 
                               rounded-lg transition-all">
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              
              <!-- 進度條 -->
              <div class="mt-4 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                     [style.width.%]="workflowProgress()"></div>
              </div>
              <div class="mt-2 text-xs text-slate-400 text-right">
                {{ completedStepsCount() }}/{{ activeWorkflow()!.steps.length }} 步驟完成
              </div>
            </div>
            
            <!-- 步驟列表 -->
            <div class="p-6 max-h-[400px] overflow-y-auto">
              <div class="space-y-4">
                @for (step of activeWorkflow()!.steps; track step.id; let i = $index) {
                  <div class="flex items-start gap-4">
                    <!-- 步驟編號 -->
                    <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center 
                                font-bold text-sm transition-all"
                         [class.bg-green-500]="step.status === 'completed'"
                         [class.text-white]="step.status === 'completed'"
                         [class.bg-cyan-500]="step.status === 'active'"
                         [class.text-white]="step.status === 'active'"
                         [class.animate-pulse]="step.status === 'active'"
                         [class.bg-slate-600]="step.status === 'pending'"
                         [class.text-slate-400]="step.status === 'pending'"
                         [class.bg-slate-700]="step.status === 'skipped'"
                         [class.text-slate-500]="step.status === 'skipped'"
                         [class.bg-red-500]="step.status === 'error'"
                         [class.text-white]="step.status === 'error'">
                      @switch (step.status) {
                        @case ('completed') { ✓ }
                        @case ('active') { {{ i + 1 }} }
                        @case ('error') { ✗ }
                        @default { {{ i + 1 }} }
                      }
                    </div>
                    
                    <!-- 步驟內容 -->
                    <div class="flex-1 pb-4"
                         [class.border-l-2]="i < activeWorkflow()!.steps.length - 1"
                         [class.border-green-500]="step.status === 'completed'"
                         [class.border-cyan-500]="step.status === 'active'"
                         [class.border-slate-600]="step.status === 'pending' || step.status === 'skipped'"
                         [class.ml-5]="i < activeWorkflow()!.steps.length - 1"
                         [class.pl-8]="i < activeWorkflow()!.steps.length - 1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-lg">{{ step.icon }}</span>
                        <h4 class="font-medium"
                            [class.text-white]="step.status === 'active'"
                            [class.text-green-400]="step.status === 'completed'"
                            [class.text-slate-400]="step.status === 'pending'"
                            [class.text-slate-500]="step.status === 'skipped'">
                          {{ step.title }}
                        </h4>
                        @if (step.isOptional) {
                          <span class="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-400 rounded">可選</span>
                        }
                      </div>
                      <p class="text-sm text-slate-400 mb-3">{{ step.description }}</p>
                      
                      <!-- 活躍步驟的操作按鈕 -->
                      @if (step.status === 'active') {
                        <div class="flex gap-2">
                          <button (click)="executeStep(step)"
                                  class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white 
                                         text-sm font-medium rounded-lg transition-all">
                            執行此步驟
                          </button>
                          @if (step.isOptional) {
                            <button (click)="skipStep(step)"
                                    class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 
                                           text-sm rounded-lg transition-all">
                              跳過
                            </button>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
            
            <!-- 底部操作 -->
            <div class="p-4 border-t border-slate-700/50 flex justify-between">
              <button (click)="closeWorkflow()"
                      class="px-4 py-2 text-slate-400 hover:text-white transition-all">
                稍後繼續
              </button>
              
              @if (isWorkflowComplete()) {
                <button (click)="finishWorkflow()"
                        class="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 
                               hover:from-green-400 hover:to-emerald-400 text-white 
                               font-medium rounded-lg transition-all">
                  🎉 完成工作流
                </button>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class QuickWorkflowComponent implements OnInit {
  // 輸出事件
  navigateTo = output<{view: string, handler?: string}>();
  workflowCompleted = output<Workflow>();
  
  // 狀態
  mode = signal<'workflows' | 'actions'>('actions');
  activeCategory = signal('all');
  activeWorkflow = signal<Workflow | null>(null);
  
  // 分類
  categories = [
    { id: 'all', icon: '📋', label: '全部' },
    { id: 'account', icon: '👤', label: '帳號' },
    { id: 'resource', icon: '🔍', label: '資源' },
    { id: 'automation', icon: '⚡', label: '自動化' },
    { id: 'message', icon: '💬', label: '消息' },
    { id: 'analysis', icon: '📊', label: '分析' }
  ];
  
  // 工作流列表
  workflows = signal<Workflow[]>([
    {
      id: 'quick-start',
      title: '快速開始監控',
      description: '從添加帳號到開始監控的完整流程',
      icon: '🚀',
      category: 'automation',
      estimatedTime: '10分鐘',
      difficulty: 'easy',
      steps: [
        { id: 's1', title: '添加監控帳號', description: '添加並登錄一個 Telegram 帳號', icon: '👤', status: 'pending', isOptional: false, actionView: 'add-account' },
        { id: 's2', title: '發現目標群組', description: '搜索並添加要監控的群組', icon: '🔍', status: 'pending', isOptional: false, actionView: 'resources' },
        { id: 's3', title: '設置關鍵詞', description: '配置觸發消息的關鍵詞', icon: '🔑', status: 'pending', isOptional: false, actionView: 'automation' },
        { id: 's4', title: '開始監控', description: '啟動監控系統', icon: '▶️', status: 'pending', isOptional: false, actionHandler: 'start-monitoring' }
      ]
    },
    {
      id: 'full-automation',
      title: '完整自動化營銷',
      description: '設置從監控到自動跟進的全流程',
      icon: '🎯',
      category: 'automation',
      estimatedTime: '20分鐘',
      difficulty: 'medium',
      steps: [
        { id: 's1', title: '配置帳號角色', description: '設置監控號和發送號', icon: '👥', status: 'pending', isOptional: false, actionView: 'accounts' },
        { id: 's2', title: '添加監控群組', description: '添加目標群組', icon: '💬', status: 'pending', isOptional: false, actionView: 'resources' },
        { id: 's3', title: '設置關鍵詞', description: '配置觸發關鍵詞', icon: '🔑', status: 'pending', isOptional: false, actionView: 'automation' },
        { id: 's4', title: '創建活動', description: '設置自動回覆活動', icon: '⚡', status: 'pending', isOptional: false, actionView: 'automation' },
        { id: 's5', title: '配置 AI 回覆', description: '設置 AI 自動問候', icon: '🤖', status: 'pending', isOptional: true, actionView: 'ai-engine' },
        { id: 's6', title: '開始監控', description: '啟動自動化系統', icon: '▶️', status: 'pending', isOptional: false, actionHandler: 'start-monitoring' }
      ]
    },
    {
      id: 'multi-role',
      title: '多角色協作設置',
      description: '配置多帳號劇本式協作',
      icon: '🎭',
      category: 'conversion',
      estimatedTime: '30分鐘',
      difficulty: 'advanced',
      steps: [
        { id: 's1', title: '準備多個帳號', description: '添加至少3個帳號', icon: '👥', status: 'pending', isOptional: false, actionView: 'accounts' },
        { id: 's2', title: '分配角色', description: '為帳號分配銷售、專家等角色', icon: '🎭', status: 'pending', isOptional: false, actionView: 'multi-role' },
        { id: 's3', title: '選擇劇本', description: '選擇或創建協作劇本', icon: '📜', status: 'pending', isOptional: false, actionView: 'multi-role' },
        { id: 's4', title: '創建協作群組', description: '設置協作目標群組', icon: '💬', status: 'pending', isOptional: false, actionView: 'multi-role' },
        { id: 's5', title: '執行劇本', description: '啟動多角色協作', icon: '🎬', status: 'pending', isOptional: false, actionHandler: 'run-script' }
      ]
    }
  ]);
  
  // 快速操作
  quickActions = signal<QuickAction[]>([
    { id: 'add-account', title: '添加帳號', description: '添加 Telegram 帳號', icon: '➕', category: 'account', actionView: 'add-account', isRecommended: true },
    { id: 'scan-session', title: '恢復帳號', description: '掃描並恢復 Session', icon: '🔄', category: 'account', actionView: 'accounts', actionHandler: 'scan-sessions' },
    { id: 'discover-groups', title: '發現群組', description: '搜索新群組資源', icon: '🔍', category: 'resource', actionView: 'resources' },
    { id: 'add-group', title: '添加群組', description: '手動添加監控群組', icon: '💬', category: 'resource', actionView: 'automation' },
    { id: 'add-keyword', title: '添加關鍵詞', description: '設置觸發關鍵詞', icon: '🔑', category: 'automation', actionView: 'automation' },
    { id: 'create-campaign', title: '創建活動', description: '新建自動化活動', icon: '⚡', category: 'automation', actionView: 'automation', actionHandler: 'new-campaign' },
    { id: 'send-batch', title: '批量發送', description: '發送批量消息', icon: '📤', category: 'message', actionView: 'ads' },
    { id: 'view-leads', title: '查看線索', description: '管理潛在客戶', icon: '👥', category: 'message', actionView: 'leads' },
    { id: 'view-stats', title: '數據分析', description: '查看統計報表', icon: '📊', category: 'analysis', actionView: 'nurturing-analytics' },
    { id: 'export-data', title: '導出數據', description: '導出客戶數據', icon: '📥', category: 'analysis', actionView: 'leads', actionHandler: 'export-leads' },
    { id: 'start-monitoring', title: '開始監控', description: '啟動自動監控', icon: '▶️', category: 'automation', actionView: 'automation', actionHandler: 'start-monitoring', isRecommended: true },
    { id: 'ai-settings', title: 'AI 設置', description: '配置 AI 回覆', icon: '🤖', category: 'automation', actionView: 'ai-engine' }
  ]);
  
  // 推薦工作流
  recommendedWorkflow = computed(() => {
    // 這裡可以根據當前配置狀態智能推薦
    return this.workflows().find(w => w.id === 'quick-start');
  });
  
  // 過濾後的操作
  filteredActions = computed(() => {
    const category = this.activeCategory();
    if (category === 'all') return this.quickActions();
    return this.quickActions().filter(a => a.category === category);
  });
  
  // 工作流進度
  workflowProgress = computed(() => {
    const workflow = this.activeWorkflow();
    if (!workflow) return 0;
    const completed = workflow.steps.filter(s => s.status === 'completed' || s.status === 'skipped').length;
    return (completed / workflow.steps.length) * 100;
  });
  
  completedStepsCount = computed(() => {
    const workflow = this.activeWorkflow();
    if (!workflow) return 0;
    return workflow.steps.filter(s => s.status === 'completed' || s.status === 'skipped').length;
  });
  
  isWorkflowComplete = computed(() => {
    const workflow = this.activeWorkflow();
    if (!workflow) return false;
    return workflow.steps.every(s => s.status === 'completed' || s.status === 'skipped');
  });
  
  ngOnInit() {}
  
  // 獲取難度標籤
  getDifficultyLabel(difficulty: string): string {
    const labels: Record<string, string> = {
      easy: '簡單',
      medium: '中等',
      advanced: '進階'
    };
    return labels[difficulty] || difficulty;
  }
  
  // 開始工作流
  startWorkflow(workflow: Workflow) {
    // 重置所有步驟狀態
    const resetWorkflow = {
      ...workflow,
      steps: workflow.steps.map((s, i) => ({
        ...s,
        status: i === 0 ? 'active' as const : 'pending' as const
      }))
    };
    this.activeWorkflow.set(resetWorkflow);
  }
  
  // 關閉工作流
  closeWorkflow() {
    this.activeWorkflow.set(null);
  }
  
  // 執行步驟
  executeStep(step: WorkflowStep) {
    if (step.actionView) {
      this.navigateTo.emit({ view: step.actionView, handler: step.actionHandler });
    }
    
    // 標記當前步驟為完成，激活下一步
    this.activeWorkflow.update(workflow => {
      if (!workflow) return null;
      const stepIndex = workflow.steps.findIndex(s => s.id === step.id);
      return {
        ...workflow,
        steps: workflow.steps.map((s, i) => {
          if (i === stepIndex) return { ...s, status: 'completed' as const };
          if (i === stepIndex + 1) return { ...s, status: 'active' as const };
          return s;
        })
      };
    });
  }
  
  // 跳過步驟
  skipStep(step: WorkflowStep) {
    this.activeWorkflow.update(workflow => {
      if (!workflow) return null;
      const stepIndex = workflow.steps.findIndex(s => s.id === step.id);
      return {
        ...workflow,
        steps: workflow.steps.map((s, i) => {
          if (i === stepIndex) return { ...s, status: 'skipped' as const };
          if (i === stepIndex + 1) return { ...s, status: 'active' as const };
          return s;
        })
      };
    });
  }
  
  // 完成工作流
  finishWorkflow() {
    const workflow = this.activeWorkflow();
    if (workflow) {
      this.workflowCompleted.emit(workflow);
    }
    this.closeWorkflow();
  }
  
  // 執行快速操作
  executeAction(action: QuickAction) {
    this.navigateTo.emit({ view: action.actionView, handler: action.actionHandler });
  }
}
