/**
 * 工作流配置組件
 * Workflow Configuration Component
 * 
 * 🆕 Phase 2：工作流可視化配置
 * 
 * 功能：
 * - 觸發條件配置
 * - 步驟流程可視化
 * - 興趣信號自定義
 * - 營銷目標設置
 */

import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutomationWorkflowService, AutomationWorkflow, WorkflowConfig } from '../services/automation-workflow.service';
import { ToastService } from '../toast.service';
import { ElectronIpcService } from '../electron-ipc.service';

// 興趣信號類型
interface InterestSignalType {
  id: string;
  name: string;
  icon: string;
  keywords: string[];
  enabled: boolean;
}

// 營銷目標選項
interface MarketingGoalOption {
  id: string;
  name: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-workflow-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="workflow-config">
      <!-- 標題 -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <span class="text-3xl">⚙️</span>
          <div>
            <h2 class="text-xl font-bold" style="color: var(--text-primary);">工作流配置</h2>
            <p class="text-sm" style="color: var(--text-muted);">自定義自動化營銷流程</p>
          </div>
        </div>
        <button (click)="saveConfig()" 
                class="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all flex items-center gap-2">
          <span>💾</span>
          <span>保存配置</span>
        </button>
      </div>
      
      @if (currentWorkflow()) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- 左側：觸發條件 -->
          <div class="space-y-6">
            <!-- 🎯 觸發條件 -->
            <div class="rounded-xl p-5" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
              <h3 class="text-lg font-bold mb-4 flex items-center gap-2" style="color: var(--text-primary);">
                <span>🎯</span>
                <span>觸發條件</span>
              </h3>
              
              <!-- 最低意向分 -->
              <div class="mb-4">
                <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
                  最低意向分 ({{ triggerConfig().minIntentScore }})
                </label>
                <input type="range" 
                       [ngModel]="triggerConfig().minIntentScore"
                       (ngModelChange)="updateTriggerConfig('minIntentScore', $event)"
                       min="30" max="90" step="5"
                       class="w-full h-2 rounded-lg appearance-none cursor-pointer"
                       style="background: linear-gradient(to right, var(--success), var(--warning), var(--error));">
                <div class="flex justify-between text-xs mt-1" style="color: var(--text-muted);">
                  <span>低門檻 (30)</span>
                  <span>高門檻 (90)</span>
                </div>
              </div>
              
              <!-- 冷卻時間 -->
              <div class="mb-4">
                <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
                  同用戶冷卻時間
                </label>
                <div class="flex items-center gap-2">
                  <input type="number" 
                         [ngModel]="triggerConfig().cooldownMinutes"
                         (ngModelChange)="updateTriggerConfig('cooldownMinutes', $event)"
                         min="60" max="10080"
                         class="flex-1 px-3 py-2 rounded-lg border text-sm"
                         style="background-color: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary);">
                  <span class="text-sm" style="color: var(--text-muted);">分鐘</span>
                </div>
                <p class="text-xs mt-1" style="color: var(--text-muted);">
                  推薦: 1440 分鐘 (24小時)
                </p>
              </div>
              
              <!-- 排除選項 -->
              <div class="space-y-2">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" 
                         [ngModel]="triggerConfig().excludeContacted"
                         (ngModelChange)="updateTriggerConfig('excludeContacted', $event)"
                         class="w-4 h-4 rounded accent-cyan-500">
                  <span class="text-sm" style="color: var(--text-secondary);">排除已聯繫用戶</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" 
                         [ngModel]="triggerConfig().excludeBlacklist"
                         (ngModelChange)="updateTriggerConfig('excludeBlacklist', $event)"
                         class="w-4 h-4 rounded accent-cyan-500">
                  <span class="text-sm" style="color: var(--text-secondary);">排除黑名單用戶</span>
                </label>
              </div>
            </div>
            
            <!-- ⏱️ 執行時機 -->
            <div class="rounded-xl p-5" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
              <h3 class="text-lg font-bold mb-4 flex items-center gap-2" style="color: var(--text-primary);">
                <span>⏱️</span>
                <span>執行時機</span>
              </h3>
              
              <!-- 首次接觸延遲 -->
              <div class="mb-4">
                <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
                  首次接觸延遲 (分鐘)
                </label>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <span class="text-xs" style="color: var(--text-muted);">最短</span>
                    <input type="number" 
                           [ngModel]="workflowConfig().firstContactDelay.min"
                           (ngModelChange)="updateDelayConfig('min', $event)"
                           min="1" max="60"
                           class="w-full px-3 py-2 rounded-lg border text-sm"
                           style="background-color: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary);">
                  </div>
                  <div>
                    <span class="text-xs" style="color: var(--text-muted);">最長</span>
                    <input type="number" 
                           [ngModel]="workflowConfig().firstContactDelay.max"
                           (ngModelChange)="updateDelayConfig('max', $event)"
                           min="1" max="120"
                           class="w-full px-3 py-2 rounded-lg border text-sm"
                           style="background-color: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary);">
                  </div>
                </div>
                <p class="text-xs mt-1" style="color: var(--text-muted);">
                  系統會在此範圍內隨機延遲，更自然
                </p>
              </div>
            </div>
            
            <!-- 🎭 角色配置 -->
            <div class="rounded-xl p-5" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
              <h3 class="text-lg font-bold mb-4 flex items-center gap-2" style="color: var(--text-primary);">
                <span>🎭</span>
                <span>角色配置</span>
              </h3>
              
              <!-- 角色數量 -->
              <div class="mb-4">
                <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
                  參與角色數量
                </label>
                <div class="flex gap-2">
                  <button (click)="setRoleCount('auto')"
                          class="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          [class.bg-cyan-500]="workflowConfig().roleCount === 'auto'"
                          [class.text-white]="workflowConfig().roleCount === 'auto'"
                          [class.bg-slate-700]="workflowConfig().roleCount !== 'auto'"
                          [class.text-slate-300]="workflowConfig().roleCount !== 'auto'">
                    🤖 AI 自動
                  </button>
                  @for (n of [2, 3, 4, 5]; track n) {
                    <button (click)="setRoleCount(n)"
                            class="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                            [class.bg-cyan-500]="workflowConfig().roleCount === n"
                            [class.text-white]="workflowConfig().roleCount === n"
                            [class.bg-slate-700]="workflowConfig().roleCount !== n"
                            [class.text-slate-300]="workflowConfig().roleCount !== n">
                      {{ n }}
                    </button>
                  }
                </div>
              </div>
              
              <!-- 帳號選擇方式 -->
              <div>
                <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
                  帳號選擇方式
                </label>
                <div class="flex gap-2">
                  <button (click)="setAccountSelection('auto')"
                          class="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          [class.bg-cyan-500]="workflowConfig().accountSelection === 'auto'"
                          [class.text-white]="workflowConfig().accountSelection === 'auto'"
                          [class.bg-slate-700]="workflowConfig().accountSelection !== 'auto'"
                          [class.text-slate-300]="workflowConfig().accountSelection !== 'auto'">
                    🤖 AI 自動選擇
                  </button>
                  <button (click)="setAccountSelection('manual')"
                          class="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          [class.bg-cyan-500]="workflowConfig().accountSelection === 'manual'"
                          [class.text-white]="workflowConfig().accountSelection === 'manual'"
                          [class.bg-slate-700]="workflowConfig().accountSelection !== 'manual'"
                          [class.text-slate-300]="workflowConfig().accountSelection !== 'manual'">
                    👤 手動指定
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 右側：營銷配置 -->
          <div class="space-y-6">
            <!-- 🚀 營銷目標 -->
            <div class="rounded-xl p-5" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
              <h3 class="text-lg font-bold mb-4 flex items-center gap-2" style="color: var(--text-primary);">
                <span>🚀</span>
                <span>營銷目標</span>
              </h3>
              
              <div class="grid grid-cols-2 gap-3">
                @for (goal of marketingGoals; track goal.id) {
                  <button (click)="setMarketingGoal(goal.id)"
                          class="p-3 rounded-lg text-left transition-all border"
                          [class.border-cyan-500]="workflowConfig().marketingGoal === goal.id"
                          [class.bg-cyan-500/10]="workflowConfig().marketingGoal === goal.id"
                          [style.border-color]="workflowConfig().marketingGoal !== goal.id ? 'var(--border-color)' : ''"
                          [style.background-color]="workflowConfig().marketingGoal !== goal.id ? 'var(--bg-secondary)' : ''">
                    <div class="text-xl mb-1">{{ goal.icon }}</div>
                    <div class="font-medium text-sm" style="color: var(--text-primary);">{{ goal.name }}</div>
                    <div class="text-xs" style="color: var(--text-muted);">{{ goal.description }}</div>
                  </button>
                }
              </div>
            </div>
            
            <!-- 🔍 興趣信號 -->
            <div class="rounded-xl p-5" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
              <h3 class="text-lg font-bold mb-4 flex items-center gap-2" style="color: var(--text-primary);">
                <span>🔍</span>
                <span>興趣信號識別</span>
              </h3>
              
              <div class="space-y-3">
                @for (signal of interestSignals(); track signal.id) {
                  <div class="p-3 rounded-lg" style="background-color: var(--bg-secondary);">
                    <div class="flex items-center justify-between mb-2">
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" 
                               [checked]="signal.enabled"
                               (change)="toggleSignal(signal.id)"
                               class="w-4 h-4 rounded accent-cyan-500">
                        <span class="text-lg">{{ signal.icon }}</span>
                        <span class="font-medium text-sm" style="color: var(--text-primary);">{{ signal.name }}</span>
                      </label>
                      <button (click)="toggleSignalExpand(signal.id)"
                              class="text-xs px-2 py-1 rounded"
                              style="color: var(--text-muted);">
                        {{ expandedSignals().has(signal.id) ? '收起' : '編輯' }}
                      </button>
                    </div>
                    
                    @if (expandedSignals().has(signal.id)) {
                      <div class="mt-2">
                        <textarea [ngModel]="signal.keywords.join(', ')"
                                  (ngModelChange)="updateSignalKeywords(signal.id, $event)"
                                  rows="2"
                                  class="w-full px-3 py-2 rounded-lg border text-sm"
                                  style="background-color: var(--bg-tertiary); border-color: var(--border-color); color: var(--text-primary);"
                                  placeholder="用逗號分隔關鍵詞"></textarea>
                        <p class="text-xs mt-1" style="color: var(--text-muted);">
                          當用戶消息包含這些詞時，識別為興趣信號
                        </p>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
            
            <!-- 👥 建群設置 -->
            <div class="rounded-xl p-5" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
              <h3 class="text-lg font-bold mb-4 flex items-center gap-2" style="color: var(--text-primary);">
                <span>👥</span>
                <span>自動建群設置</span>
              </h3>
              
              <div class="mb-4">
                <label class="block text-sm font-medium mb-2" style="color: var(--text-secondary);">
                  群組名稱模板
                </label>
                <input type="text" 
                       [ngModel]="workflowConfig().groupNameTemplate || groupNameDefault"
                       (ngModelChange)="updateWorkflowConfig('groupNameTemplate', $event)"
                       class="w-full px-3 py-2 rounded-lg border text-sm"
                       style="background-color: var(--bg-secondary); border-color: var(--border-color); color: var(--text-primary);"
                       [placeholder]="groupNameDefault">
                <p class="text-xs mt-1" style="color: var(--text-muted);">
                  可用變量: {{ '{' }}user{{ '}' }} = 用戶名, {{ '{' }}date{{ '}' }} = 日期
                </p>
              </div>
              
              <div class="p-3 rounded-lg" style="background-color: var(--bg-secondary);">
                <p class="text-xs" style="color: var(--text-muted);">
                  💡 當檢測到用戶有購買意向時，系統會自動創建 VIP 群並邀請用戶加入
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 工作流預覽 -->
        <div class="mt-6 rounded-xl p-5" style="background-color: var(--bg-card); border: 1px solid var(--border-color);">
          <h3 class="text-lg font-bold mb-4 flex items-center gap-2" style="color: var(--text-primary);">
            <span>📊</span>
            <span>工作流預覽</span>
          </h3>
          
          <div class="flex items-center justify-center gap-2 overflow-x-auto py-4">
            @for (step of currentWorkflow()?.steps; track step.id; let i = $index) {
              <div class="flex items-center">
                <div class="px-4 py-3 rounded-lg text-center min-w-[100px] transition-all"
                     [class.bg-gradient-to-r]="i === 0"
                     [class.from-cyan-500]="i === 0"
                     [class.to-blue-500]="i === 0"
                     [class.text-white]="i === 0"
                     [style.background-color]="i !== 0 ? 'var(--bg-secondary)' : ''">
                  <div class="text-xl mb-1">{{ getStepIcon(step.type) }}</div>
                  <div class="text-sm font-medium" [style.color]="i !== 0 ? 'var(--text-primary)' : ''">{{ step.name }}</div>
                </div>
                @if (i < (currentWorkflow()?.steps?.length || 0) - 1) {
                  <div class="mx-2 text-xl" style="color: var(--text-muted);">→</div>
                }
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="text-center py-12" style="color: var(--text-muted);">
          <span class="text-4xl block mb-4">⚙️</span>
          <p>無可用工作流</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .workflow-config {
      padding: 1.5rem;
    }
    
    input[type="range"] {
      -webkit-appearance: none;
    }
    
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: white;
      cursor: pointer;
      border: 2px solid var(--primary);
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
  `]
})
export class WorkflowConfigComponent implements OnInit, OnDestroy {
  private readonly workflowService = inject(AutomationWorkflowService);
  private readonly toast = inject(ToastService);
  private readonly ipc = inject(ElectronIpcService);
  
  // 當前工作流
  currentWorkflow = computed(() => this.workflowService.workflows()[0]);
  
  // 觸發配置
  triggerConfig = computed(() => this.currentWorkflow()?.trigger || {
    minIntentScore: 60,
    cooldownMinutes: 1440,
    excludeContacted: true,
    excludeBlacklist: true
  });
  
  // 工作流配置
  workflowConfig = computed(() => this.currentWorkflow()?.config || {
    marketingGoal: '促進成交',
    roleCount: 'auto' as const,
    accountSelection: 'auto' as const,
    firstContactDelay: { min: 5, max: 15 },
    interestSignals: [],
    groupNameTemplate: 'VIP 服務群 - {user}'
  });
  
  // 營銷目標選項
  marketingGoals: MarketingGoalOption[] = [
    { id: '促進成交', name: '促進成交', icon: '💰', description: '引導用戶購買產品' },
    { id: '品牌推廣', name: '品牌推廣', icon: '📢', description: '提升品牌知名度' },
    { id: '用戶培育', name: '用戶培育', icon: '🌱', description: '建立信任關係' },
    { id: '收集反饋', name: '收集反饋', icon: '📋', description: '了解用戶需求' }
  ];
  
  // 興趣信號配置
  interestSignals = signal<InterestSignalType[]>([
    { id: 'price_inquiry', name: '價格詢問', icon: '💰', keywords: ['多少錢', '什麼價格', '價格', '費用', '收費'], enabled: true },
    { id: 'product_detail', name: '產品細節', icon: '📦', keywords: ['怎麼用', '有什麼功能', '詳細介紹', '了解一下'], enabled: true },
    { id: 'purchase_intent', name: '購買意向', icon: '🛒', keywords: ['怎麼買', '在哪買', '我要', '我想買', '下單'], enabled: true },
    { id: 'positive_feedback', name: '正面反饋', icon: '👍', keywords: ['不錯', '挺好', '可以', '行', '感興趣'], enabled: true },
    { id: 'comparison', name: '比較諮詢', icon: '⚖️', keywords: ['比', '對比', '區別', '差別', '哪個好'], enabled: false }
  ]);
  
  // 展開的信號
  expandedSignals = signal<Set<string>>(new Set());
  
  // 群名模板默認值
  groupNameDefault = 'VIP 服務群 - {user}';
  
  // 本地配置緩存
  private localTriggerConfig = signal<any>({});
  private localWorkflowConfig = signal<any>({});
  
  ngOnInit(): void {
    // 載入配置到本地
    const workflow = this.currentWorkflow();
    if (workflow) {
      this.localTriggerConfig.set({ ...workflow.trigger });
      this.localWorkflowConfig.set({ ...workflow.config });
      
      // 載入興趣信號配置
      this.loadInterestSignals(workflow.config.interestSignals || []);
    }
  }
  
  ngOnDestroy(): void {}
  
  // 載入興趣信號配置
  private loadInterestSignals(enabledIds: string[]): void {
    this.interestSignals.update(signals => 
      signals.map(s => ({
        ...s,
        enabled: enabledIds.length === 0 || enabledIds.includes(s.id)
      }))
    );
  }
  
  // 更新觸發配置
  updateTriggerConfig(key: string, value: any): void {
    this.localTriggerConfig.update(config => ({
      ...config,
      [key]: value
    }));
  }
  
  // 更新延遲配置
  updateDelayConfig(key: 'min' | 'max', value: number): void {
    this.localWorkflowConfig.update(config => ({
      ...config,
      firstContactDelay: {
        ...config.firstContactDelay,
        [key]: value
      }
    }));
  }
  
  // 更新工作流配置
  updateWorkflowConfig(key: string, value: any): void {
    this.localWorkflowConfig.update(config => ({
      ...config,
      [key]: value
    }));
  }
  
  // 設置角色數量
  setRoleCount(count: number | 'auto'): void {
    this.updateWorkflowConfig('roleCount', count);
  }
  
  // 設置帳號選擇方式
  setAccountSelection(mode: 'auto' | 'manual'): void {
    this.updateWorkflowConfig('accountSelection', mode);
  }
  
  // 設置營銷目標
  setMarketingGoal(goal: string): void {
    this.updateWorkflowConfig('marketingGoal', goal);
  }
  
  // 切換信號啟用
  toggleSignal(id: string): void {
    this.interestSignals.update(signals =>
      signals.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
    );
  }
  
  // 切換信號展開
  toggleSignalExpand(id: string): void {
    this.expandedSignals.update(set => {
      const newSet = new Set(set);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }
  
  // 更新信號關鍵詞
  updateSignalKeywords(id: string, value: string): void {
    const keywords = value.split(',').map(k => k.trim()).filter(k => k);
    this.interestSignals.update(signals =>
      signals.map(s => s.id === id ? { ...s, keywords } : s)
    );
  }
  
  // 保存配置
  saveConfig(): void {
    const workflow = this.currentWorkflow();
    if (!workflow) return;
    
    // 構建新的興趣信號配置
    const enabledSignals = this.interestSignals().filter(s => s.enabled).map(s => s.id);
    
    // 這裡應該調用 workflowService 的更新方法
    // 暫時通過 IPC 保存到後端
    const config = {
      workflowId: workflow.id,
      trigger: this.localTriggerConfig(),
      config: {
        ...this.localWorkflowConfig(),
        interestSignals: enabledSignals
      },
      interestSignalKeywords: this.interestSignals().reduce((acc, s) => {
        acc[s.id] = s.keywords;
        return acc;
      }, {} as Record<string, string[]>)
    };
    
    console.log('[WorkflowConfig] 保存配置:', config);
    
    // 更新本地存儲
    try {
      localStorage.setItem('workflowConfig', JSON.stringify(config));
      this.toast.success('✅ 工作流配置已保存');
    } catch (e) {
      this.toast.error('保存失敗');
    }
  }
  
  // 獲取步驟圖標
  getStepIcon(stepType: string): string {
    const icons: Record<string, string> = {
      'evaluate': '📊',
      'plan': '🎯',
      'private_chat': '💬',
      'detect_interest': '🔍',
      'create_group': '👥',
      'group_marketing': '🚀',
      'record': '📝'
    };
    return icons[stepType] || '▶️';
  }
}
