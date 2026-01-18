/**
 * 觸發動作配置組件
 * Trigger Action Config Component
 * 
 * 用於在自動化中心配置觸發動作
 */

import { Component, signal, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TriggerActionService } from '../trigger-action.service';
import { 
  TriggerActionMode, 
  TriggerActionConfig,
  TRIGGER_MODE_META,
  AccountRoleConfig
} from '../trigger-action.models';

@Component({
  selector: 'app-trigger-action-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="trigger-action-config">
      <!-- 標題 -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-semibold text-white flex items-center gap-2">
          <span>⚡</span> 觸發動作配置
        </h3>
        @if (hasChanges()) {
          <span class="text-xs text-yellow-400">有未保存的更改</span>
        }
      </div>
      
      <!-- 模式選擇 -->
      <div class="mb-6">
        <label class="text-sm text-slate-400 block mb-3">當監控到關鍵詞匹配時：</label>
        <div class="space-y-2">
          @for (mode of modes; track mode.id) {
            <button (click)="selectMode(mode.id)"
                    class="w-full flex items-center gap-4 p-4 rounded-xl transition-all border-2 text-left"
                    [class.border-cyan-500]="selectedMode() === mode.id"
                    [class.bg-cyan-500/10]="selectedMode() === mode.id"
                    [class.border-transparent]="selectedMode() !== mode.id"
                    [class.bg-slate-700/50]="selectedMode() !== mode.id"
                    [class.hover:bg-slate-700]="selectedMode() !== mode.id">
              <!-- 圖標 -->
              <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                   [class.bg-cyan-500/20]="mode.color === 'cyan'"
                   [class.bg-blue-500/20]="mode.color === 'blue'"
                   [class.bg-purple-500/20]="mode.color === 'purple'"
                   [class.bg-gray-500/20]="mode.color === 'gray'"
                   [class.bg-orange-500/20]="mode.color === 'orange'">
                <span class="text-2xl">{{ mode.icon }}</span>
              </div>
              
              <!-- 內容 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium"
                        [class.text-cyan-400]="selectedMode() === mode.id"
                        [class.text-white]="selectedMode() !== mode.id">
                    {{ mode.label }}
                  </span>
                  @if (mode.recommended) {
                    <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">推薦</span>
                  }
                  @if (mode.advanced) {
                    <span class="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">高級</span>
                  }
                </div>
                <div class="text-sm text-slate-400 mt-0.5">{{ mode.description }}</div>
              </div>
              
              <!-- 選中指示 -->
              <div class="shrink-0">
                @if (selectedMode() === mode.id) {
                  <div class="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center">
                    <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                } @else {
                  <div class="w-6 h-6 rounded-full border-2 border-slate-600"></div>
                }
              </div>
            </button>
          }
        </div>
      </div>
      
      <!-- 模式專屬配置 -->
      @switch (selectedMode()) {
        @case ('ai_smart') {
          <div class="space-y-4 p-4 bg-slate-700/30 rounded-xl">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-white">AI 智能聊天設置</h4>
              <button class="text-xs text-cyan-400 hover:text-cyan-300">
                前往 AI 中心 →
              </button>
            </div>
            
            <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer">
              <div>
                <div class="text-white text-sm">使用 AI 中心全局配置</div>
                <div class="text-xs text-slate-400">使用 AI 中心設置的模型、知識庫和策略</div>
              </div>
              <input type="checkbox" 
                     [(ngModel)]="aiSmartSettings.useGlobalConfig"
                     class="w-5 h-5 rounded text-cyan-500 bg-slate-700 border-slate-600">
            </label>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-xs text-slate-400 block mb-2">最小延遲 (秒)</label>
                <input type="number" 
                       [(ngModel)]="aiSmartSettings.delayMin"
                       min="10" max="300"
                       class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
              </div>
              <div>
                <label class="text-xs text-slate-400 block mb-2">最大延遲 (秒)</label>
                <input type="number"
                       [(ngModel)]="aiSmartSettings.delayMax" 
                       min="30" max="600"
                       class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
              </div>
            </div>
            
            <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer">
              <div>
                <div class="text-white text-sm">模擬打字效果</div>
                <div class="text-xs text-slate-400">發送前顯示「正在輸入...」狀態</div>
              </div>
              <input type="checkbox"
                     [(ngModel)]="aiSmartSettings.simulateTyping"
                     class="w-5 h-5 rounded text-cyan-500 bg-slate-700 border-slate-600">
            </label>
            
            <div class="pt-3 border-t border-slate-600/50">
              <div class="text-xs text-slate-400 mb-3">轉人工條件</div>
              <div class="space-y-2">
                <label class="flex items-center gap-3 text-sm text-slate-300">
                  <input type="checkbox"
                         [(ngModel)]="aiSmartSettings.handoffOnPurchase"
                         class="w-4 h-4 rounded text-cyan-500 bg-slate-700 border-slate-600">
                  購買意向明確
                </label>
                <label class="flex items-center gap-3 text-sm text-slate-300">
                  <input type="checkbox"
                         [(ngModel)]="aiSmartSettings.handoffOnNegative"
                         class="w-4 h-4 rounded text-cyan-500 bg-slate-700 border-slate-600">
                  負面情緒
                </label>
              </div>
            </div>
          </div>
        }
        
        @case ('template_send') {
          <div class="space-y-4 p-4 bg-slate-700/30 rounded-xl">
            <h4 class="text-sm font-medium text-white">模板發送設置</h4>
            
            <div>
              <label class="text-xs text-slate-400 block mb-2">選擇消息模板</label>
              <select class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                <option value="">選擇模板...</option>
                <option value="1">默認歡迎</option>
                <option value="2">產品介紹</option>
                <option value="3">跟進提醒</option>
              </select>
            </div>
            
            <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer">
              <div>
                <div class="text-white text-sm">使用 Spintax</div>
                <div class="text-xs text-slate-400">隨機選擇內容變體</div>
              </div>
              <input type="checkbox"
                     [(ngModel)]="templateSettings.useSpintax"
                     class="w-5 h-5 rounded text-cyan-500 bg-slate-700 border-slate-600">
            </label>
            
            <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer">
              <div>
                <div class="text-white text-sm">個性化稱呼</div>
                <div class="text-xs text-slate-400">在消息中使用用戶名稱</div>
              </div>
              <input type="checkbox"
                     [(ngModel)]="templateSettings.personalize"
                     class="w-5 h-5 rounded text-cyan-500 bg-slate-700 border-slate-600">
            </label>
          </div>
        }
        
        @case ('multi_role') {
          <div class="space-y-4 p-4 bg-slate-700/30 rounded-xl">
            <div class="flex items-center justify-between">
              <h4 class="text-sm font-medium text-white">多角色協作設置</h4>
              <span class="text-xs text-purple-400">高級功能</span>
            </div>
            
            <div class="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
              <div class="text-sm text-purple-300 mb-2">🎭 觸發條件</div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-slate-400 block mb-1">意向評分 ≥</label>
                  <input type="number"
                         [(ngModel)]="multiRoleSettings.intentThreshold"
                         min="50" max="100"
                         class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                </div>
                <div>
                  <label class="text-xs text-slate-400 block mb-1">對話輪數 ≥</label>
                  <input type="number"
                         [(ngModel)]="multiRoleSettings.minRounds"
                         min="1" max="20"
                         class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                </div>
              </div>
            </div>
            
            <div>
              <label class="text-xs text-slate-400 block mb-2">選擇劇本</label>
              <select class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                <option value="">選擇協作劇本...</option>
                <option value="1">高意向客戶轉化</option>
                <option value="2">產品推薦</option>
              </select>
            </div>
            
            <button class="w-full py-2 text-sm text-purple-400 hover:text-purple-300">
              前往多角色協作配置 →
            </button>
          </div>
        }
        
        @case ('record_only') {
          <div class="space-y-4 p-4 bg-slate-700/30 rounded-xl">
            <h4 class="text-sm font-medium text-white">僅記錄設置</h4>
            
            <div>
              <label class="text-xs text-slate-400 block mb-2">自動標籤</label>
              <div class="flex flex-wrap gap-2">
                <span class="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">待跟進</span>
                <span class="px-2 py-1 bg-slate-600 text-slate-400 text-xs rounded-full">+ 添加</span>
              </div>
            </div>
            
            <div>
              <label class="text-xs text-slate-400 block mb-2">自動階段</label>
              <select class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                <option value="new">新線索</option>
                <option value="contacted">已接觸</option>
                <option value="followup">跟進中</option>
              </select>
            </div>
            
            <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer">
              <div>
                <div class="text-white text-sm">匹配時通知</div>
                <div class="text-xs text-slate-400">有新匹配時發送通知</div>
              </div>
              <input type="checkbox"
                     [(ngModel)]="recordSettings.notifyOnMatch"
                     class="w-5 h-5 rounded text-cyan-500 bg-slate-700 border-slate-600">
            </label>
          </div>
        }
        
        @case ('notify_human') {
          <div class="space-y-4 p-4 bg-slate-700/30 rounded-xl">
            <h4 class="text-sm font-medium text-white">通知人工設置</h4>
            
            <div>
              <label class="text-xs text-slate-400 block mb-2">通知渠道</label>
              <div class="space-y-2">
                <label class="flex items-center gap-3 text-sm text-slate-300">
                  <input type="checkbox"
                         [(ngModel)]="notifySettings.app"
                         class="w-4 h-4 rounded text-cyan-500 bg-slate-700 border-slate-600">
                  應用內通知
                </label>
                <label class="flex items-center gap-3 text-sm text-slate-300">
                  <input type="checkbox"
                         [(ngModel)]="notifySettings.telegram"
                         class="w-4 h-4 rounded text-cyan-500 bg-slate-700 border-slate-600">
                  Telegram 通知
                </label>
              </div>
            </div>
            
            <div>
              <label class="text-xs text-slate-400 block mb-2">緊急程度</label>
              <div class="flex gap-2">
                @for (level of ['low', 'medium', 'high']; track level) {
                  <button (click)="notifySettings.urgency = level"
                          class="flex-1 py-2 rounded-lg text-sm transition-colors"
                          [class.bg-cyan-500]="notifySettings.urgency === level"
                          [class.text-white]="notifySettings.urgency === level"
                          [class.bg-slate-700]="notifySettings.urgency !== level"
                          [class.text-slate-300]="notifySettings.urgency !== level">
                    {{ level === 'low' ? '低' : level === 'medium' ? '中' : '高' }}
                  </button>
                }
              </div>
            </div>
          </div>
        }
      }
      
      <!-- 發送帳號設置 -->
      @if (selectedMode() !== 'record_only' && selectedMode() !== 'notify_human') {
        <div class="mt-6 p-4 bg-slate-700/30 rounded-xl">
          <h4 class="text-sm font-medium text-white mb-4">發送帳號</h4>
          
          <div class="mb-4">
            <label class="text-xs text-slate-400 block mb-2">主發送帳號</label>
            <select [(ngModel)]="senderSettings.primaryAccountId"
                    class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
              <option value="">選擇帳號...</option>
              @for (account of availableAccounts(); track account.accountId) {
                <option [value]="account.accountId">
                  {{ account.username || account.phone }} 
                  ({{ account.isOnline ? '在線' : '離線' }})
                </option>
              }
            </select>
          </div>
          
          <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer mb-3">
            <div>
              <div class="text-white text-sm">啟用帳號輪換</div>
              <div class="text-xs text-slate-400">多帳號輪換發送，防封號</div>
            </div>
            <input type="checkbox"
                   [(ngModel)]="senderSettings.enableRotation"
                   class="w-5 h-5 rounded text-cyan-500 bg-slate-700 border-slate-600">
          </label>
          
          @if (senderSettings.enableRotation) {
            <div>
              <label class="text-xs text-slate-400 block mb-2">輪換策略</label>
              <select [(ngModel)]="senderSettings.rotationStrategy"
                      class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                <option value="sequential">順序輪換</option>
                <option value="random">隨機選擇</option>
                <option value="load_balance">負載均衡</option>
              </select>
            </div>
          }
        </div>
      }
      
      <!-- 保存按鈕 -->
      <div class="mt-6 flex gap-3">
        <button (click)="resetConfig()"
                class="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors">
          重置
        </button>
        <button (click)="saveConfig()"
                [disabled]="!hasChanges()"
                class="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg 
                       hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
          保存配置
        </button>
      </div>
    </div>
  `
})
export class TriggerActionConfigComponent {
  private triggerService = inject(TriggerActionService);
  
  // 輸入
  groupId = input<string | undefined>(undefined);
  
  // 輸出
  saved = output<TriggerActionConfig>();
  
  // 狀態
  selectedMode = signal<TriggerActionMode>('ai_smart');
  
  // 模式列表
  modes = Object.entries(TRIGGER_MODE_META).map(([id, meta]) => ({
    id: id as TriggerActionMode,
    ...meta
  }));
  
  // 各模式設置
  aiSmartSettings = {
    useGlobalConfig: true,
    delayMin: 30,
    delayMax: 90,
    simulateTyping: true,
    handoffOnPurchase: true,
    handoffOnNegative: true
  };
  
  templateSettings = {
    templateId: '',
    useSpintax: true,
    personalize: true
  };
  
  multiRoleSettings = {
    intentThreshold: 70,
    minRounds: 3,
    scriptId: ''
  };
  
  recordSettings = {
    autoTags: ['待跟進'],
    autoStage: 'new',
    notifyOnMatch: false
  };
  
  notifySettings = {
    app: true,
    telegram: false,
    urgency: 'medium' as 'low' | 'medium' | 'high'
  };
  
  senderSettings = {
    primaryAccountId: '',
    enableRotation: false,
    rotationStrategy: 'load_balance' as 'sequential' | 'random' | 'load_balance'
  };
  
  // 計算屬性
  availableAccounts = computed(() => this.triggerService.availableSenderAccounts());
  
  hasChanges = computed(() => {
    // TODO: 實現變更檢測
    return true;
  });
  
  selectMode(mode: TriggerActionMode) {
    this.selectedMode.set(mode);
  }
  
  resetConfig() {
    this.selectedMode.set('ai_smart');
    // 重置各設置
  }
  
  saveConfig() {
    const config = this.triggerService.config();
    
    // 更新配置
    this.triggerService.setMode(this.selectedMode());
    
    // 發出保存事件
    this.saved.emit(this.triggerService.config());
  }
}
