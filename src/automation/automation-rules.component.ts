/**
 * 自動化規則組件 - 規則管理和編輯器
 * Automation Rules Component
 * 
 * 功能:
 * 1. 規則列表展示
 * 2. 規則創建/編輯
 * 3. 觸發器配置
 * 4. 動作配置
 * 5. 規則啟用/禁用
 */

import { Component, signal, computed, inject, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// 觸發器類型
export type TriggerType = 'keyword_match' | 'lead_status_change' | 'resource_added' | 'schedule' | 'manual';

// 動作類型
export type ActionType = 'send_message' | 'add_tag' | 'update_status' | 'add_to_queue' | 'notify' | 'add_to_leads';

// 觸發器配置
export interface RuleTrigger {
  type: TriggerType;
  config: Record<string, any>;
}

// 動作配置
export interface RuleAction {
  type: ActionType;
  config: Record<string, any>;
}

// 自動化規則
export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  trigger: RuleTrigger;
  actions: RuleAction[];
  conditions?: Record<string, any>;
  stats: {
    triggeredCount: number;
    successCount: number;
    failedCount: number;
    lastTriggered?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

@Component({
  selector: 'app-automation-rules',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="automation-rules h-full flex flex-col">
      <!-- 頂部工具欄 -->
      <div class="flex items-center justify-between p-4 border-b border-slate-700/50">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-semibold text-white flex items-center gap-2">
            <span>⚡</span> 自動化規則
          </h3>
          <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-sm rounded-full">
            {{ activeRulesCount() }} 條啟用中
          </span>
        </div>
        
        <button (click)="showRuleEditor.set(true); editingRule.set(null)"
                class="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 
                       text-white text-sm rounded-lg transition-all flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          創建新規則
        </button>
      </div>
      
      <!-- 規則列表 -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        @for (rule of rules(); track rule.id) {
          <div class="rule-card bg-slate-800/50 rounded-xl border transition-all"
               [class.border-emerald-500/30]="rule.isActive"
               [class.border-slate-700/50]="!rule.isActive">
            <div class="p-4">
              <div class="flex items-start justify-between">
                <!-- 規則信息 -->
                <div class="flex items-start gap-4">
                  <!-- 狀態指示器 -->
                  <div class="mt-1">
                    <button (click)="toggleRuleActive(rule)"
                            class="w-10 h-6 rounded-full transition-all relative"
                            [class.bg-emerald-500]="rule.isActive"
                            [class.bg-slate-600]="!rule.isActive">
                      <div class="absolute w-4 h-4 bg-white rounded-full top-1 transition-all"
                           [class.left-5]="rule.isActive"
                           [class.left-1]="!rule.isActive">
                      </div>
                    </button>
                  </div>
                  
                  <!-- 規則詳情 -->
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <h4 class="font-medium text-white">{{ rule.name }}</h4>
                      <span class="px-2 py-0.5 text-xs rounded-full"
                            [class.bg-emerald-500/20]="rule.isActive"
                            [class.text-emerald-400]="rule.isActive"
                            [class.bg-slate-600]="!rule.isActive"
                            [class.text-slate-400]="!rule.isActive">
                        {{ rule.isActive ? '啟用中' : '已禁用' }}
                      </span>
                    </div>
                    
                    <!-- 觸發器信息 -->
                    <div class="flex items-center gap-2 text-sm text-slate-400 mb-2">
                      <span class="text-lg">{{ getTriggerIcon(rule.trigger.type) }}</span>
                      <span>觸發：{{ getTriggerDescription(rule.trigger) }}</span>
                    </div>
                    
                    <!-- 動作列表 -->
                    <div class="flex items-center gap-2 text-sm text-slate-400">
                      <span class="text-lg">⚡</span>
                      <span>動作：</span>
                      @for (action of rule.actions; track $index; let isLast = $last) {
                        <span class="px-2 py-0.5 bg-slate-700 rounded text-xs">
                          {{ getActionName(action.type) }}
                        </span>
                        @if (!isLast) {
                          <span class="text-slate-600">→</span>
                        }
                      }
                    </div>
                    
                    <!-- 統計信息 -->
                    <div class="flex items-center gap-4 mt-3 text-xs text-slate-500">
                      <span>觸發 {{ rule.stats.triggeredCount }} 次</span>
                      <span class="text-emerald-400">成功 {{ rule.stats.successCount }}</span>
                      @if (rule.stats.failedCount > 0) {
                        <span class="text-red-400">失敗 {{ rule.stats.failedCount }}</span>
                      }
                      @if (rule.stats.lastTriggered) {
                        <span>最後觸發：{{ formatTime(rule.stats.lastTriggered) }}</span>
                      }
                    </div>
                  </div>
                </div>
                
                <!-- 操作按鈕 -->
                <div class="flex items-center gap-2">
                  <button (click)="editRule(rule)"
                          class="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all">
                    ✏️
                  </button>
                  <button (click)="duplicateRule(rule)"
                          class="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                          title="複製">
                    📋
                  </button>
                  <button (click)="deleteRule(rule)"
                          class="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-all">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          </div>
        } @empty {
          <div class="flex items-center justify-center h-full">
            <div class="text-center">
              <div class="text-5xl mb-3">⚡</div>
              <p class="text-slate-400">暫無自動化規則</p>
              <p class="text-sm text-slate-500 mt-1">點擊「創建新規則」開始自動化</p>
            </div>
          </div>
        }
      </div>
      
      <!-- 規則模板快捷入口 -->
      <div class="p-4 border-t border-slate-700/50 bg-slate-800/30">
        <div class="text-xs text-slate-400 mb-2">快速創建：</div>
        <div class="flex flex-wrap gap-2">
          @for (template of ruleTemplates; track template.id) {
            <button (click)="createFromTemplate(template)"
                    class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-all flex items-center gap-1">
              <span>{{ template.icon }}</span>
              <span>{{ template.name }}</span>
            </button>
          }
        </div>
      </div>
    </div>
    
    <!-- 規則編輯器對話框 -->
    @if (showRuleEditor()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
           (click)="showRuleEditor.set(false)">
        <div class="bg-slate-800 rounded-xl w-[600px] max-h-[85vh] overflow-hidden shadow-2xl"
             (click)="$event.stopPropagation()">
          <!-- 標題 -->
          <div class="p-4 border-b border-slate-700 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-white">
              {{ editingRule() ? '編輯規則' : '創建新規則' }}
            </h3>
            <button (click)="showRuleEditor.set(false)"
                    class="text-slate-400 hover:text-white">✕</button>
          </div>
          
          <!-- 內容 -->
          <div class="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <!-- 規則名稱 -->
            <div>
              <label class="block text-sm text-slate-400 mb-2">規則名稱 *</label>
              <input type="text" 
                     [(ngModel)]="ruleForm.name"
                     placeholder="例如：新客戶歡迎"
                     class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg 
                            text-white placeholder-slate-400 focus:border-cyan-500">
            </div>
            
            <!-- 規則描述 -->
            <div>
              <label class="block text-sm text-slate-400 mb-2">描述（可選）</label>
              <input type="text" 
                     [(ngModel)]="ruleForm.description"
                     placeholder="簡要描述這個規則的用途"
                     class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg 
                            text-white placeholder-slate-400 focus:border-cyan-500">
            </div>
            
            <!-- 觸發器 -->
            <div class="p-4 bg-slate-700/50 rounded-xl border border-slate-600">
              <label class="block text-sm font-medium text-white mb-3">📍 觸發條件</label>
              
              <select [(ngModel)]="ruleForm.triggerType"
                      (ngModelChange)="onTriggerTypeChange($event)"
                      class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg 
                             text-white mb-3">
                @for (trigger of triggerTypes; track trigger.type) {
                  <option [value]="trigger.type">{{ trigger.icon }} {{ trigger.name }}</option>
                }
              </select>
              
              <!-- 根據觸發器類型顯示不同配置 -->
              @switch (ruleForm.triggerType) {
                @case ('keyword_match') {
                  <div class="space-y-3">
                    <div>
                      <label class="block text-xs text-slate-400 mb-1">選擇關鍵詞集</label>
                      <select [(ngModel)]="ruleForm.triggerConfig['keywordSetId']"
                              class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                        <option value="">選擇關鍵詞集...</option>
                        <option value="001">001 (3個關鍵詞)</option>
                        <option value="002">002 (5個關鍵詞)</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-xs text-slate-400 mb-1">來源群組（可選）</label>
                      <select [(ngModel)]="ruleForm.triggerConfig['sourceGroupId']"
                              class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                        <option value="">所有群組</option>
                        <option value="g1">測試miniapp</option>
                        <option value="g2">白資高價收USDT</option>
                      </select>
                    </div>
                  </div>
                }
                @case ('lead_status_change') {
                  <div class="space-y-3">
                    <div>
                      <label class="block text-xs text-slate-400 mb-1">當狀態變為</label>
                      <select [(ngModel)]="ruleForm.triggerConfig['newStatus']"
                              class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                        <option value="interested">有興趣</option>
                        <option value="contacted">已聯繫</option>
                        <option value="negotiating">洽談中</option>
                        <option value="converted">已轉化</option>
                      </select>
                    </div>
                  </div>
                }
                @case ('resource_added') {
                  <div class="space-y-3">
                    <div>
                      <label class="block text-xs text-slate-400 mb-1">資源類型</label>
                      <select [(ngModel)]="ruleForm.triggerConfig['resourceType']"
                              class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                        <option value="">所有類型</option>
                        <option value="user">個人用戶</option>
                        <option value="group">群組</option>
                        <option value="channel">頻道</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-xs text-slate-400 mb-1">來源</label>
                      <select [(ngModel)]="ruleForm.triggerConfig['sourceType']"
                              class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                        <option value="">所有來源</option>
                        <option value="group_member">群組成員提取</option>
                        <option value="keyword_match">關鍵詞匹配</option>
                        <option value="import">手動導入</option>
                      </select>
                    </div>
                  </div>
                }
                @case ('schedule') {
                  <div class="space-y-3">
                    <div>
                      <label class="block text-xs text-slate-400 mb-1">執行頻率</label>
                      <select [(ngModel)]="ruleForm.triggerConfig['frequency']"
                              class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                        <option value="hourly">每小時</option>
                        <option value="daily">每天</option>
                        <option value="weekly">每週</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-xs text-slate-400 mb-1">執行時間</label>
                      <input type="time" 
                             [(ngModel)]="ruleForm.triggerConfig['time']"
                             class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                    </div>
                  </div>
                }
              }
            </div>
            
            <!-- 動作 -->
            <div class="p-4 bg-slate-700/50 rounded-xl border border-slate-600">
              <div class="flex items-center justify-between mb-3">
                <label class="text-sm font-medium text-white">⚡ 執行動作</label>
                <button (click)="addAction()"
                        class="text-xs text-cyan-400 hover:text-cyan-300">
                  + 添加動作
                </button>
              </div>
              
              <div class="space-y-3">
                @for (action of ruleForm.actions; track $index; let i = $index) {
                  <div class="p-3 bg-slate-700 rounded-lg">
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs text-slate-400">動作 {{ i + 1 }}</span>
                      <button (click)="removeAction(i)"
                              class="text-xs text-red-400 hover:text-red-300">
                        移除
                      </button>
                    </div>
                    
                    <select [(ngModel)]="action.type"
                            class="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm mb-2">
                      @for (actionType of actionTypes; track actionType.type) {
                        <option [value]="actionType.type">{{ actionType.icon }} {{ actionType.name }}</option>
                      }
                    </select>
                    
                    <!-- 動作配置 -->
                    @switch (action.type) {
                      @case ('send_message') {
                        <div>
                          <select [(ngModel)]="action.config['templateId']"
                                  class="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm">
                            <option value="">選擇消息模板...</option>
                            <option value="t1">默認歡迎</option>
                            <option value="t2">產品介紹</option>
                            <option value="t3">跟進提醒</option>
                          </select>
                        </div>
                      }
                      @case ('add_tag') {
                        <div>
                          <input type="text"
                                 [(ngModel)]="action.config['tags']"
                                 placeholder="輸入標籤，用逗號分隔"
                                 class="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm">
                        </div>
                      }
                      @case ('update_status') {
                        <div>
                          <select [(ngModel)]="action.config['status']"
                                  class="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm">
                            <option value="contacted">已聯繫</option>
                            <option value="interested">有興趣</option>
                            <option value="converted">已轉化</option>
                          </select>
                        </div>
                      }
                    }
                  </div>
                }
              </div>
            </div>
          </div>
          
          <!-- 底部按鈕 -->
          <div class="p-4 border-t border-slate-700 flex justify-end gap-3">
            <button (click)="showRuleEditor.set(false)"
                    class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">
              取消
            </button>
            <button (click)="saveRule()"
                    [disabled]="!ruleForm.name || ruleForm.actions.length === 0"
                    class="px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 
                           text-white rounded-lg disabled:opacity-50">
              {{ editingRule() ? '保存修改' : '創建規則' }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class AutomationRulesComponent implements OnInit {
  // 規則列表
  rules = signal<AutomationRule[]>([
    {
      id: 'r1',
      name: '新客戶歡迎',
      description: '匹配關鍵詞後自動發送歡迎消息',
      isActive: true,
      trigger: { type: 'keyword_match', config: { keywordSetId: '001' } },
      actions: [
        { type: 'send_message', config: { templateId: 't1' } },
        { type: 'add_to_leads', config: {} }
      ],
      stats: { triggeredCount: 156, successCount: 142, failedCount: 14, lastTriggered: new Date() },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'r2',
      name: '高意向跟進',
      description: 'Lead標記為高意向後自動加入跟進隊列',
      isActive: true,
      trigger: { type: 'lead_status_change', config: { newStatus: 'interested' } },
      actions: [
        { type: 'add_tag', config: { tags: '高意向' } },
        { type: 'notify', config: { message: '有新的高意向客戶' } }
      ],
      stats: { triggeredCount: 45, successCount: 45, failedCount: 0 },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'r3',
      name: '資源入庫自動標記',
      description: '新資源加入資料庫時自動標記來源',
      isActive: false,
      trigger: { type: 'resource_added', config: { resourceType: 'user' } },
      actions: [
        { type: 'add_tag', config: { tags: '新發現' } }
      ],
      stats: { triggeredCount: 1234, successCount: 1234, failedCount: 0 },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);
  
  // 編輯狀態
  showRuleEditor = signal(false);
  editingRule = signal<AutomationRule | null>(null);
  
  // 表單數據
  ruleForm = {
    name: '',
    description: '',
    triggerType: 'keyword_match' as TriggerType,
    triggerConfig: {} as Record<string, any>,
    actions: [{ type: 'send_message' as ActionType, config: {} }] as RuleAction[]
  };
  
  // 觸發器類型選項
  triggerTypes = [
    { type: 'keyword_match' as TriggerType, name: '關鍵詞匹配', icon: '🔑' },
    { type: 'lead_status_change' as TriggerType, name: 'Lead狀態變更', icon: '📊' },
    { type: 'resource_added' as TriggerType, name: '新資源入庫', icon: '📦' },
    { type: 'schedule' as TriggerType, name: '定時執行', icon: '⏰' },
    { type: 'manual' as TriggerType, name: '手動觸發', icon: '👆' }
  ];
  
  // 動作類型選項
  actionTypes = [
    { type: 'send_message' as ActionType, name: '發送消息', icon: '💬' },
    { type: 'add_tag' as ActionType, name: '添加標籤', icon: '🏷️' },
    { type: 'update_status' as ActionType, name: '更新狀態', icon: '📋' },
    { type: 'add_to_queue' as ActionType, name: '加入發送隊列', icon: '📤' },
    { type: 'add_to_leads' as ActionType, name: '加入潛在客戶', icon: '👥' },
    { type: 'notify' as ActionType, name: '發送通知', icon: '🔔' }
  ];
  
  // 規則模板
  ruleTemplates = [
    { id: 't1', name: '關鍵詞自動回覆', icon: '🔑' },
    { id: 't2', name: '新Lead自動標記', icon: '🏷️' },
    { id: 't3', name: '定時批量發送', icon: '⏰' },
    { id: 't4', name: '資源自動分類', icon: '📦' }
  ];
  
  // 計算屬性
  activeRulesCount = computed(() => this.rules().filter(r => r.isActive).length);
  
  ngOnInit() {}
  
  // 切換規則啟用狀態
  toggleRuleActive(rule: AutomationRule) {
    this.rules.update(rules => 
      rules.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r)
    );
  }
  
  // 編輯規則
  editRule(rule: AutomationRule) {
    this.editingRule.set(rule);
    this.ruleForm = {
      name: rule.name,
      description: rule.description || '',
      triggerType: rule.trigger.type,
      triggerConfig: { ...rule.trigger.config },
      actions: rule.actions.map(a => ({ ...a, config: { ...a.config } }))
    };
    this.showRuleEditor.set(true);
  }
  
  // 複製規則
  duplicateRule(rule: AutomationRule) {
    const newRule: AutomationRule = {
      ...rule,
      id: `r${Date.now()}`,
      name: `${rule.name} (複製)`,
      isActive: false,
      stats: { triggeredCount: 0, successCount: 0, failedCount: 0 },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.rules.update(rules => [...rules, newRule]);
  }
  
  // 刪除規則
  deleteRule(rule: AutomationRule) {
    if (confirm(`確定要刪除規則「${rule.name}」嗎？`)) {
      this.rules.update(rules => rules.filter(r => r.id !== rule.id));
    }
  }
  
  // 從模板創建
  createFromTemplate(template: { id: string; name: string }) {
    this.editingRule.set(null);
    this.ruleForm = {
      name: template.name,
      description: '',
      triggerType: 'keyword_match',
      triggerConfig: {},
      actions: [{ type: 'send_message', config: {} }]
    };
    this.showRuleEditor.set(true);
  }
  
  // 觸發器類型變更
  onTriggerTypeChange(type: TriggerType) {
    this.ruleForm.triggerConfig = {};
  }
  
  // 添加動作
  addAction() {
    this.ruleForm.actions.push({ type: 'send_message', config: {} });
  }
  
  // 移除動作
  removeAction(index: number) {
    this.ruleForm.actions.splice(index, 1);
  }
  
  // 保存規則
  saveRule() {
    const rule: AutomationRule = {
      id: this.editingRule()?.id || `r${Date.now()}`,
      name: this.ruleForm.name,
      description: this.ruleForm.description,
      isActive: this.editingRule()?.isActive ?? true,
      trigger: {
        type: this.ruleForm.triggerType,
        config: this.ruleForm.triggerConfig
      },
      actions: this.ruleForm.actions,
      stats: this.editingRule()?.stats || { triggeredCount: 0, successCount: 0, failedCount: 0 },
      createdAt: this.editingRule()?.createdAt || new Date(),
      updatedAt: new Date()
    };
    
    if (this.editingRule()) {
      this.rules.update(rules => rules.map(r => r.id === rule.id ? rule : r));
    } else {
      this.rules.update(rules => [...rules, rule]);
    }
    
    this.showRuleEditor.set(false);
    this.resetForm();
  }
  
  // 重置表單
  resetForm() {
    this.ruleForm = {
      name: '',
      description: '',
      triggerType: 'keyword_match',
      triggerConfig: {},
      actions: [{ type: 'send_message', config: {} }]
    };
  }
  
  // 輔助方法
  getTriggerIcon(type: TriggerType): string {
    const trigger = this.triggerTypes.find(t => t.type === type);
    return trigger?.icon || '📍';
  }
  
  getTriggerDescription(trigger: RuleTrigger): string {
    switch (trigger.type) {
      case 'keyword_match':
        return `匹配關鍵詞集 ${trigger.config['keywordSetId'] || ''}`;
      case 'lead_status_change':
        return `Lead狀態變為「${trigger.config['newStatus'] || ''}」`;
      case 'resource_added':
        return '新資源加入資料庫';
      case 'schedule':
        return `${trigger.config['frequency'] || '定時'}執行`;
      case 'manual':
        return '手動觸發';
      default:
        return trigger.type;
    }
  }
  
  getActionName(type: ActionType): string {
    const action = this.actionTypes.find(a => a.type === type);
    return action?.name || type;
  }
  
  formatTime(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes}分鐘前`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}小時前`;
    return `${Math.floor(minutes / 1440)}天前`;
  }
}
