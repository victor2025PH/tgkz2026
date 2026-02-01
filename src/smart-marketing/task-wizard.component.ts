/**
 * 任務創建向導組件
 * Task Creation Wizard Component
 * 
 * 🆕 優化 1-1: 引導式任務創建
 * 
 * 步驟流程：
 * 1. 選擇目標類型（促首單/挽回/活躍/服務）
 * 2. 選擇目標客群（導入/群組/標籤篩選）
 * 3. AI 配置確認（角色/模式/閾值）
 * 4. 預覽並啟動
 */

import { Component, signal, computed, inject, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketingTaskService } from '../services/marketing-task.service';
import { MarketingStateService } from '../services/marketing-state.service';
import { AICenterService } from '../ai-center/ai-center.service';
import { ToastService } from '../toast.service';
import { 
  GoalType, 
  ExecutionMode,
  GOAL_TYPE_CONFIG,
  TargetCriteria
} from '../models/marketing-task.models';

// 向導步驟
type WizardStep = 'goal' | 'audience' | 'config' | 'preview';

// 目標客群來源
type AudienceSource = 'import' | 'group' | 'tags' | 'recent';

@Component({
  selector: 'app-task-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="task-wizard fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
         (click)="onBackdropClick($event)">
      <div class="wizard-content w-full max-w-3xl bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden"
           (click)="$event.stopPropagation()">
        
        <!-- 頂部進度條 -->
        <div class="wizard-header p-6 border-b border-slate-700/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-white flex items-center gap-3">
              <span class="text-2xl">✨</span>
              創建營銷任務
            </h2>
            <button (click)="close.emit()" 
                    class="text-slate-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>
          
          <!-- 步驟指示器 -->
          <div class="flex items-center gap-2">
            @for (step of steps; track step.id; let i = $index) {
              <div class="flex items-center">
                <div class="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all"
                     [class.bg-purple-500]="currentStep() === step.id"
                     [class.text-white]="currentStep() === step.id"
                     [class.bg-slate-700]="currentStep() !== step.id && isStepCompleted(step.id)"
                     [class.text-slate-300]="currentStep() !== step.id && isStepCompleted(step.id)"
                     [class.bg-slate-800]="currentStep() !== step.id && !isStepCompleted(step.id)"
                     [class.text-slate-500]="currentStep() !== step.id && !isStepCompleted(step.id)">
                  <span class="w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium"
                        [class.bg-white]="currentStep() === step.id"
                        [class.text-purple-500]="currentStep() === step.id"
                        [class.bg-emerald-500]="currentStep() !== step.id && isStepCompleted(step.id)"
                        [class.text-white]="currentStep() !== step.id && isStepCompleted(step.id)"
                        [class.bg-slate-600]="currentStep() !== step.id && !isStepCompleted(step.id)">
                    @if (isStepCompleted(step.id) && currentStep() !== step.id) {
                      ✓
                    } @else {
                      {{ i + 1 }}
                    }
                  </span>
                  <span class="text-sm font-medium">{{ step.label }}</span>
                </div>
                @if (i < steps.length - 1) {
                  <div class="w-8 h-0.5 mx-2"
                       [class.bg-purple-500]="isStepCompleted(step.id)"
                       [class.bg-slate-700]="!isStepCompleted(step.id)"></div>
                }
              </div>
            }
          </div>
        </div>
        
        <!-- 內容區域 -->
        <div class="wizard-body p-6 max-h-[60vh] overflow-y-auto">
          @switch (currentStep()) {
            <!-- 步驟 1: 選擇目標 -->
            @case ('goal') {
              <div class="space-y-6">
                <div class="text-center mb-6">
                  <h3 class="text-lg font-semibold text-white mb-2">您想達成什麼目標？</h3>
                  <p class="text-slate-400 text-sm">選擇目標後，AI 將自動推薦最佳配置</p>
                </div>
                
                <div class="grid grid-cols-2 gap-4">
                  @for (goal of goalTypes; track goal.type) {
                    <button (click)="selectGoal(goal.type)"
                            class="p-6 rounded-xl border-2 transition-all text-left hover:scale-[1.02]"
                            [class.border-purple-500]="selectedGoal() === goal.type"
                            [class.bg-purple-500/20]="selectedGoal() === goal.type"
                            [class.ring-2]="selectedGoal() === goal.type"
                            [class.ring-purple-500/50]="selectedGoal() === goal.type"
                            [class.border-slate-600]="selectedGoal() !== goal.type"
                            [class.bg-slate-800/50]="selectedGoal() !== goal.type">
                      <div class="flex items-start gap-4">
                        <div class="text-4xl">{{ goal.icon }}</div>
                        <div class="flex-1">
                          <div class="font-semibold text-white text-lg mb-1">{{ goal.label }}</div>
                          <div class="text-sm text-slate-400 mb-3">{{ goal.description }}</div>
                          <div class="flex flex-wrap gap-1">
                            @for (role of goal.suggestedRoles; track role) {
                              <span class="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded">
                                {{ getRoleLabel(role) }}
                              </span>
                            }
                          </div>
                        </div>
                      </div>
                    </button>
                  }
                </div>
              </div>
            }
            
            <!-- 步驟 2: 選擇客群 -->
            @case ('audience') {
              <div class="space-y-6">
                <div class="text-center mb-6">
                  <h3 class="text-lg font-semibold text-white mb-2">選擇目標客群</h3>
                  <p class="text-slate-400 text-sm">指定這次任務要觸達的客戶群體</p>
                </div>
                
                <!-- 客群來源選擇 -->
                <div class="grid grid-cols-2 gap-4">
                  <button (click)="setAudienceSource('recent')"
                          class="p-4 rounded-xl border transition-all text-left"
                          [class.border-cyan-500]="audienceSource() === 'recent'"
                          [class.bg-cyan-500/20]="audienceSource() === 'recent'"
                          [class.border-slate-600]="audienceSource() !== 'recent'"
                          [class.bg-slate-800/50]="audienceSource() !== 'recent'">
                    <div class="text-2xl mb-2">🕐</div>
                    <div class="font-medium text-white">最近互動</div>
                    <div class="text-xs text-slate-400">7天內有互動的客戶</div>
                  </button>
                  
                  <button (click)="setAudienceSource('tags')"
                          class="p-4 rounded-xl border transition-all text-left"
                          [class.border-cyan-500]="audienceSource() === 'tags'"
                          [class.bg-cyan-500/20]="audienceSource() === 'tags'"
                          [class.border-slate-600]="audienceSource() !== 'tags'"
                          [class.bg-slate-800/50]="audienceSource() !== 'tags'">
                    <div class="text-2xl mb-2">🏷️</div>
                    <div class="font-medium text-white">按標籤篩選</div>
                    <div class="text-xs text-slate-400">選擇特定標籤的客戶</div>
                  </button>
                  
                  <button (click)="setAudienceSource('group')"
                          class="p-4 rounded-xl border transition-all text-left"
                          [class.border-cyan-500]="audienceSource() === 'group'"
                          [class.bg-cyan-500/20]="audienceSource() === 'group'"
                          [class.border-slate-600]="audienceSource() !== 'group'"
                          [class.bg-slate-800/50]="audienceSource() !== 'group'">
                    <div class="text-2xl mb-2">👥</div>
                    <div class="font-medium text-white">從群組選擇</div>
                    <div class="text-xs text-slate-400">選擇特定群組的成員</div>
                  </button>
                  
                  <button (click)="setAudienceSource('import')"
                          class="p-4 rounded-xl border transition-all text-left"
                          [class.border-cyan-500]="audienceSource() === 'import'"
                          [class.bg-cyan-500/20]="audienceSource() === 'import'"
                          [class.border-slate-600]="audienceSource() !== 'import'"
                          [class.bg-slate-800/50]="audienceSource() !== 'import'">
                    <div class="text-2xl mb-2">📥</div>
                    <div class="font-medium text-white">導入客戶</div>
                    <div class="text-xs text-slate-400">上傳客戶列表或手動添加</div>
                  </button>
                </div>
                
                <!-- 意向分數篩選 -->
                <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-sm text-white font-medium">意向分數門檻</span>
                    <span class="text-cyan-400 font-bold">≥ {{ intentScoreMin() }}分</span>
                  </div>
                  <input type="range" 
                         [value]="intentScoreMin()" 
                         (input)="setIntentScoreMin($any($event.target).valueAsNumber)"
                         min="0" max="100" step="10"
                         class="w-full">
                  <div class="flex justify-between text-xs text-slate-500 mt-1">
                    <span>低意向</span>
                    <span>高意向</span>
                  </div>
                </div>
                
                <!-- 預估數量 -->
                <div class="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <div class="flex items-center gap-3">
                    <span class="text-2xl">👥</span>
                    <div>
                      <div class="font-medium text-white">預估觸達人數</div>
                      <div class="text-sm text-slate-400">符合條件的潛在客戶</div>
                    </div>
                  </div>
                  <div class="text-3xl font-bold text-emerald-400">{{ estimatedAudience() }}</div>
                </div>
              </div>
            }
            
            <!-- 步驟 3: AI 配置 -->
            @case ('config') {
              <div class="space-y-6">
                <div class="text-center mb-6">
                  <h3 class="text-lg font-semibold text-white mb-2">確認 AI 配置</h3>
                  <p class="text-slate-400 text-sm">根據目標自動推薦，您可以調整</p>
                </div>
                
                <!-- 執行模式 -->
                <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div class="text-sm text-slate-400 mb-3">執行模式</div>
                  <div class="grid grid-cols-3 gap-3">
                    @for (mode of executionModes; track mode.id) {
                      <button (click)="setExecutionMode(mode.id)"
                              class="p-3 rounded-lg border transition-all text-center"
                              [class.border-purple-500]="selectedMode() === mode.id"
                              [class.bg-purple-500/20]="selectedMode() === mode.id"
                              [class.border-slate-600]="selectedMode() !== mode.id"
                              [class.bg-slate-700/50]="selectedMode() !== mode.id">
                        <div class="text-xl mb-1">{{ mode.icon }}</div>
                        <div class="text-sm font-medium text-white">{{ mode.label }}</div>
                        <div class="text-xs text-slate-400">{{ mode.description }}</div>
                      </button>
                    }
                  </div>
                </div>
                
                <!-- 推薦角色配置 -->
                <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-sm text-slate-400">AI 推薦角色組合</span>
                    <span class="text-xs text-purple-400">基於「{{ getGoalLabel(selectedGoal()!) }}」目標</span>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    @for (role of suggestedRoles(); track role) {
                      <div class="flex items-center gap-2 px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                        <span class="text-lg">{{ getRoleIcon(role) }}</span>
                        <span class="text-sm text-white">{{ getRoleLabel(role) }}</span>
                      </div>
                    }
                  </div>
                </div>
                
                <!-- AI 模型狀態 -->
                <div class="p-4 rounded-xl"
                     [class.bg-emerald-500/10]="aiConnected()"
                     [class.border-emerald-500/30]="aiConnected()"
                     [class.bg-amber-500/10]="!aiConnected()"
                     [class.border-amber-500/30]="!aiConnected()"
                     [class.border]="true">
                  <div class="flex items-center gap-3">
                    @if (aiConnected()) {
                      <span class="text-2xl">✅</span>
                      <div>
                        <div class="font-medium text-emerald-400">AI 模型已就緒</div>
                        <div class="text-sm text-slate-400">使用智能引擎中配置的默認模型</div>
                      </div>
                    } @else {
                      <span class="text-2xl">⚠️</span>
                      <div>
                        <div class="font-medium text-amber-400">未配置 AI 模型</div>
                        <div class="text-sm text-slate-400">請先在智能引擎中配置 AI 模型</div>
                      </div>
                    }
                  </div>
                </div>
                
                <!-- 高級選項 -->
                <details class="bg-slate-800/30 rounded-xl border border-slate-700/50">
                  <summary class="p-4 cursor-pointer text-slate-400 hover:text-white transition-colors">
                    ⚙️ 高級選項
                  </summary>
                  <div class="p-4 pt-0 space-y-4">
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-slate-400">啟用 AI 托管</span>
                      <button (click)="toggleAiHosting()"
                              class="relative w-12 h-6 rounded-full transition-all"
                              [class.bg-cyan-500]="aiHostingEnabled()"
                              [class.bg-slate-600]="!aiHostingEnabled()">
                        <span class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                              [class.translate-x-6]="aiHostingEnabled()"></span>
                      </button>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-slate-400">自動問候新客戶</span>
                      <input type="checkbox" [(ngModel)]="autoGreeting" class="w-5 h-5 rounded">
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-slate-400">自動回覆私信</span>
                      <input type="checkbox" [(ngModel)]="autoReply" class="w-5 h-5 rounded">
                    </div>
                  </div>
                </details>
              </div>
            }
            
            <!-- 步驟 4: 預覽確認 -->
            @case ('preview') {
              <div class="space-y-6">
                <div class="text-center mb-6">
                  <h3 class="text-lg font-semibold text-white mb-2">確認任務配置</h3>
                  <p class="text-slate-400 text-sm">檢查配置後點擊啟動</p>
                </div>
                
                <!-- 任務摘要 -->
                <div class="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/30">
                  <div class="grid grid-cols-2 gap-6">
                    <div>
                      <div class="text-sm text-slate-400 mb-1">營銷目標</div>
                      <div class="flex items-center gap-2">
                        <span class="text-2xl">{{ getGoalIcon(selectedGoal()!) }}</span>
                        <span class="text-lg font-semibold text-white">{{ getGoalLabel(selectedGoal()!) }}</span>
                      </div>
                    </div>
                    <div>
                      <div class="text-sm text-slate-400 mb-1">目標人數</div>
                      <div class="text-2xl font-bold text-cyan-400">{{ estimatedAudience() }} 人</div>
                    </div>
                    <div>
                      <div class="text-sm text-slate-400 mb-1">執行模式</div>
                      <div class="text-white">{{ getModeLabel(selectedMode()) }}</div>
                    </div>
                    <div>
                      <div class="text-sm text-slate-400 mb-1">角色數量</div>
                      <div class="text-white">{{ suggestedRoles().length }} 個角色</div>
                    </div>
                  </div>
                </div>
                
                <!-- 任務名稱 -->
                <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <label class="text-sm text-slate-400 block mb-2">任務名稱</label>
                  <input type="text" 
                         [(ngModel)]="taskName"
                         [placeholder]="defaultTaskName()"
                         class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400">
                </div>
                
                <!-- 預估效果 -->
                <div class="grid grid-cols-3 gap-4">
                  <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
                    <div class="text-2xl font-bold text-emerald-400">{{ estimatedContacts() }}</div>
                    <div class="text-xs text-slate-400">預估接觸</div>
                  </div>
                  <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
                    <div class="text-2xl font-bold text-cyan-400">{{ estimatedReplies() }}</div>
                    <div class="text-xs text-slate-400">預估回覆</div>
                  </div>
                  <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 text-center">
                    <div class="text-2xl font-bold text-purple-400">{{ estimatedConversions() }}</div>
                    <div class="text-xs text-slate-400">預估轉化</div>
                  </div>
                </div>
                
                <!-- 保存為模板選項 -->
                <div class="flex items-center gap-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                  <input type="checkbox" [(ngModel)]="saveAsTemplate" id="saveTemplate" class="w-5 h-5 rounded">
                  <label for="saveTemplate" class="text-sm text-slate-300">保存此配置為模板，方便下次快速使用</label>
                </div>
              </div>
            }
          }
        </div>
        
        <!-- 底部按鈕 -->
        <div class="wizard-footer p-6 border-t border-slate-700/50 bg-slate-800/50">
          <div class="flex items-center justify-between">
            <button (click)="previousStep()"
                    [disabled]="currentStep() === 'goal'"
                    class="px-6 py-3 text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              ← 上一步
            </button>
            
            <div class="flex gap-3">
              <button (click)="close.emit()"
                      class="px-6 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors">
                取消
              </button>
              
              @if (currentStep() !== 'preview') {
                <button (click)="nextStep()"
                        [disabled]="!canProceed()"
                        class="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  下一步 →
                </button>
              } @else {
                <button (click)="launchTask()"
                        [disabled]="isLaunching()"
                        class="px-8 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
                  @if (isLaunching()) {
                    <span class="animate-spin">⟳</span>
                    啟動中...
                  } @else {
                    <span>🚀</span>
                    立即啟動
                  }
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TaskWizardComponent {
  private taskService = inject(MarketingTaskService);
  private stateService = inject(MarketingStateService);
  private aiService = inject(AICenterService);
  private toast = inject(ToastService);
  
  // 輸入/輸出
  initialGoal = input<GoalType | null>(null);
  close = output<void>();
  taskCreated = output<string>();
  
  // 狀態
  currentStep = signal<WizardStep>('goal');
  selectedGoal = signal<GoalType | null>(null);
  audienceSource = signal<AudienceSource>('recent');
  intentScoreMin = signal(50);
  selectedMode = signal<ExecutionMode>('hybrid');
  isLaunching = signal(false);
  
  // 表單數據
  taskName = '';
  autoGreeting = true;
  autoReply = true;
  saveAsTemplate = false;
  
  // 步驟配置
  steps: { id: WizardStep; label: string }[] = [
    { id: 'goal', label: '選擇目標' },
    { id: 'audience', label: '選擇客群' },
    { id: 'config', label: 'AI 配置' },
    { id: 'preview', label: '確認啟動' }
  ];
  
  // 目標類型
  goalTypes = Object.entries(GOAL_TYPE_CONFIG).map(([type, config]) => ({
    type: type as GoalType,
    ...config
  }));
  
  // 執行模式
  executionModes = [
    { id: 'scripted' as ExecutionMode, icon: '📜', label: '劇本模式', description: '按預設流程' },
    { id: 'hybrid' as ExecutionMode, icon: '🔄', label: '混合模式', description: '推薦' },
    { id: 'scriptless' as ExecutionMode, icon: '🤖', label: '無劇本', description: 'AI 即興' }
  ];
  
  // 計算屬性
  aiConnected = computed(() => this.aiService.isConnected());
  aiHostingEnabled = computed(() => this.stateService.aiHostingEnabled());
  
  suggestedRoles = computed(() => {
    const goal = this.selectedGoal();
    if (!goal) return [];
    return GOAL_TYPE_CONFIG[goal].suggestedRoles;
  });
  
  estimatedAudience = computed(() => {
    // TODO: 從後端獲取真實數據
    const base = this.audienceSource() === 'recent' ? 150 : 
                 this.audienceSource() === 'tags' ? 80 :
                 this.audienceSource() === 'group' ? 200 : 50;
    const multiplier = (100 - this.intentScoreMin()) / 100;
    return Math.floor(base * multiplier) + 10;
  });
  
  estimatedContacts = computed(() => Math.floor(this.estimatedAudience() * 0.8));
  estimatedReplies = computed(() => Math.floor(this.estimatedContacts() * 0.35));
  estimatedConversions = computed(() => Math.floor(this.estimatedReplies() * 0.25));
  
  defaultTaskName = computed(() => {
    const goal = this.selectedGoal();
    if (!goal) return '新營銷任務';
    const date = new Date().toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
    return `${GOAL_TYPE_CONFIG[goal].label} - ${date}`;
  });
  
  constructor() {
    // 如果有初始目標，設置它
    const initial = this.initialGoal();
    if (initial) {
      this.selectedGoal.set(initial);
    }
  }
  
  // 步驟控制
  isStepCompleted(step: WizardStep): boolean {
    const stepOrder = ['goal', 'audience', 'config', 'preview'];
    const currentIndex = stepOrder.indexOf(this.currentStep());
    const stepIndex = stepOrder.indexOf(step);
    return stepIndex < currentIndex;
  }
  
  canProceed(): boolean {
    switch (this.currentStep()) {
      case 'goal':
        return this.selectedGoal() !== null;
      case 'audience':
        return this.audienceSource() !== null;
      case 'config':
        return true; // 配置步驟總是可以繼續
      case 'preview':
        return true;
      default:
        return false;
    }
  }
  
  nextStep(): void {
    const stepOrder: WizardStep[] = ['goal', 'audience', 'config', 'preview'];
    const currentIndex = stepOrder.indexOf(this.currentStep());
    if (currentIndex < stepOrder.length - 1) {
      this.currentStep.set(stepOrder[currentIndex + 1]);
    }
  }
  
  previousStep(): void {
    const stepOrder: WizardStep[] = ['goal', 'audience', 'config', 'preview'];
    const currentIndex = stepOrder.indexOf(this.currentStep());
    if (currentIndex > 0) {
      this.currentStep.set(stepOrder[currentIndex - 1]);
    }
  }
  
  // 選擇操作
  selectGoal(goal: GoalType): void {
    this.selectedGoal.set(goal);
    // 自動設置推薦的執行模式
    this.selectedMode.set(GOAL_TYPE_CONFIG[goal].suggestedMode);
  }
  
  setAudienceSource(source: AudienceSource): void {
    this.audienceSource.set(source);
  }
  
  setIntentScoreMin(score: number): void {
    this.intentScoreMin.set(score);
  }
  
  setExecutionMode(mode: ExecutionMode): void {
    this.selectedMode.set(mode);
  }
  
  toggleAiHosting(): void {
    const newValue = !this.stateService.aiHostingEnabled();
    this.stateService.setAiHostingEnabled(newValue);
  }
  
  // 輔助方法
  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      'expert': '產品專家',
      'satisfied_customer': '滿意老客戶',
      'support': '客服助理',
      'manager': '經理',
      'newbie': '好奇新人',
      'hesitant': '猶豫者',
      'sales': '銷售',
      'callback': '回訪專員'
    };
    return labels[role] || role;
  }
  
  getRoleIcon(role: string): string {
    const icons: Record<string, string> = {
      'expert': '👨‍💼',
      'satisfied_customer': '😊',
      'support': '👩‍💻',
      'manager': '👔',
      'newbie': '🙋',
      'hesitant': '🤔',
      'sales': '💼',
      'callback': '📞'
    };
    return icons[role] || '🎭';
  }
  
  getGoalLabel(goal: GoalType): string {
    return GOAL_TYPE_CONFIG[goal]?.label || goal;
  }
  
  getGoalIcon(goal: GoalType): string {
    return GOAL_TYPE_CONFIG[goal]?.icon || '🎯';
  }
  
  getModeLabel(mode: ExecutionMode): string {
    const labels: Record<ExecutionMode, string> = {
      'scripted': '劇本模式',
      'hybrid': '混合模式',
      'scriptless': '無劇本模式'
    };
    return labels[mode];
  }
  
  // 啟動任務
  async launchTask(): Promise<void> {
    this.isLaunching.set(true);
    
    try {
      const goal = this.selectedGoal();
      if (!goal) return;
      
      const name = this.taskName || this.defaultTaskName();
      
      // 創建任務
      const taskId = await this.taskService.createTask({
        name,
        goalType: goal,
        executionMode: this.selectedMode(),
        targetCriteria: {
          intentScoreMin: this.intentScoreMin(),
          sources: [this.audienceSource()]
        }
      });
      
      if (taskId) {
        // 啟動任務
        this.taskService.startTask(taskId);
        
        // 保存為模板
        if (this.saveAsTemplate) {
          this.saveTaskTemplate(name, goal);
        }
        
        this.toast.success(`🚀 任務「${name}」已啟動！`);
        this.taskCreated.emit(taskId);
        this.close.emit();
      } else {
        this.toast.error('創建任務失敗');
      }
    } catch (error) {
      this.toast.error('啟動失敗，請重試');
    } finally {
      this.isLaunching.set(false);
    }
  }
  
  private saveTaskTemplate(name: string, goal: GoalType): void {
    const templates = JSON.parse(localStorage.getItem('task_templates') || '[]');
    templates.push({
      id: Date.now().toString(),
      name: `${name} 模板`,
      goalType: goal,
      executionMode: this.selectedMode(),
      audienceSource: this.audienceSource(),
      intentScoreMin: this.intentScoreMin(),
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('task_templates', JSON.stringify(templates));
  }
  
  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }
}
