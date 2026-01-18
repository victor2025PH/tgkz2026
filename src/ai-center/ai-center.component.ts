/**
 * AI 中心組件
 * AI Center Component - 統一管理所有 AI 功能
 */

import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AICenterService } from './ai-center.service';
import { 
  AIModelConfig, 
  AIProvider, 
  KnowledgeBase, 
  KnowledgeItem,
  SmartRule,
  IntentType,
  ConversationStyle
} from './ai-center.models';

type AITab = 'models' | 'knowledge' | 'strategy' | 'rules' | 'multi-role' | 'stats';

@Component({
  selector: 'app-ai-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ai-center h-full flex flex-col bg-slate-900">
      <!-- 頂部標題欄 -->
      <div class="p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-2xl">🧠</span>
              AI 中心
            </h1>
            
            <!-- 連接狀態 -->
            <div class="flex items-center gap-2">
              @if (aiService.isConnected()) {
                <span class="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
                  <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  AI 已連接
                </span>
              } @else {
                <span class="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                  未配置 AI
                </span>
              }
            </div>
          </div>
          
          <!-- 快速統計 -->
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-6 px-4 py-2 bg-slate-800/80 rounded-xl border border-slate-700/50">
              <div class="text-center">
                <div class="text-lg font-bold text-cyan-400">{{ aiService.stats().today.conversations }}</div>
                <div class="text-xs text-slate-500">今日對話</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-bold text-emerald-400">{{ (aiService.stats().weekly.conversionRate * 100).toFixed(1) }}%</div>
                <div class="text-xs text-slate-500">轉化率</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-bold text-purple-400">¥{{ aiService.stats().today.cost.toFixed(2) }}</div>
                <div class="text-xs text-slate-500">今日成本</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Tab 導航 -->
        <div class="flex gap-1 mt-4 bg-slate-800/50 p-1 rounded-xl w-fit">
          @for (tab of tabs; track tab.id) {
            <button (click)="activeTab.set(tab.id)"
                    class="px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
                    [class.bg-gradient-to-r]="activeTab() === tab.id"
                    [class.from-purple-500]="activeTab() === tab.id"
                    [class.to-pink-500]="activeTab() === tab.id"
                    [class.text-white]="activeTab() === tab.id"
                    [class.shadow-lg]="activeTab() === tab.id"
                    [class.text-slate-400]="activeTab() !== tab.id"
                    [class.hover:text-white]="activeTab() !== tab.id"
                    [class.hover:bg-slate-700/50]="activeTab() !== tab.id">
              <span class="text-lg">{{ tab.icon }}</span>
              <span>{{ tab.label }}</span>
            </button>
          }
        </div>
      </div>
      
      <!-- Tab 內容區 -->
      <div class="flex-1 overflow-y-auto p-4">
        @switch (activeTab()) {
          @case ('models') {
            <!-- 模型配置 -->
            <div class="max-w-4xl mx-auto space-y-6">
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div class="flex items-center justify-between mb-6">
                  <h3 class="font-semibold text-white flex items-center gap-2">
                    <span>🤖</span> AI 模型配置
                  </h3>
                  <button (click)="showAddModel.set(true)"
                          class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
                    + 添加模型
                  </button>
                </div>
                
                <div class="space-y-4">
                  @for (model of aiService.models(); track model.id) {
                    <div class="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors">
                      <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center"
                             [class.bg-emerald-500/20]="model.provider === 'openai'"
                             [class.bg-purple-500/20]="model.provider === 'claude'"
                             [class.bg-blue-500/20]="model.provider === 'gemini'">
                          <span class="text-2xl">{{ getProviderIcon(model.provider) }}</span>
                        </div>
                        <div>
                          <div class="font-medium text-white">{{ model.modelName }}</div>
                          <div class="text-sm text-slate-400">{{ getProviderName(model.provider) }}</div>
                        </div>
                      </div>
                      
                      <div class="flex items-center gap-4">
                        <div class="flex items-center gap-2">
                          @if (model.isConnected) {
                            <span class="flex items-center gap-1 text-emerald-400 text-sm">
                              <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                              已連接
                            </span>
                          } @else {
                            <span class="text-slate-500 text-sm">未連接</span>
                          }
                        </div>
                        
                        <button (click)="testModel(model)"
                                class="px-3 py-1 bg-slate-600 text-slate-300 rounded-lg text-sm hover:bg-slate-500">
                          測試
                        </button>
                        
                        <button (click)="editModel(model)"
                                class="text-slate-400 hover:text-white">
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  } @empty {
                    <div class="text-center py-12 text-slate-400">
                      <div class="text-5xl mb-4">🤖</div>
                      <p class="text-lg mb-2">尚未配置 AI 模型</p>
                      <p class="text-sm mb-4">添加 OpenAI、Claude 或 Gemini 模型開始使用 AI 功能</p>
                      <button (click)="showAddModel.set(true)"
                              class="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-400 transition-colors">
                        + 添加第一個模型
                      </button>
                    </div>
                  }
                </div>
                
                <!-- 模型用途分配 -->
                @if (aiService.models().length > 0) {
                  <div class="mt-6 pt-6 border-t border-slate-700/50">
                    <h4 class="text-sm font-medium text-white mb-4">模型用途分配</h4>
                    <div class="grid grid-cols-3 gap-4">
                      <div>
                        <label class="text-xs text-slate-400 block mb-2">意圖識別</label>
                        <select class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                          <option value="">選擇模型</option>
                          @for (model of aiService.models(); track model.id) {
                            <option [value]="model.id">{{ model.modelName }}</option>
                          }
                        </select>
                      </div>
                      <div>
                        <label class="text-xs text-slate-400 block mb-2">日常對話</label>
                        <select class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                          <option value="">選擇模型</option>
                          @for (model of aiService.models(); track model.id) {
                            <option [value]="model.id">{{ model.modelName }}</option>
                          }
                        </select>
                      </div>
                      <div>
                        <label class="text-xs text-slate-400 block mb-2">多角色劇本</label>
                        <select class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                          <option value="">選擇模型</option>
                          @for (model of aiService.models(); track model.id) {
                            <option [value]="model.id">{{ model.modelName }}</option>
                          }
                        </select>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
          
          @case ('knowledge') {
            <!-- 知識庫管理 -->
            <div class="max-w-4xl mx-auto space-y-6">
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div class="flex items-center justify-between mb-6">
                  <h3 class="font-semibold text-white flex items-center gap-2">
                    <span>📚</span> 業務知識庫
                  </h3>
                  <button (click)="addKnowledgeBase()"
                          class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
                    + 新建知識庫
                  </button>
                </div>
                
                <!-- 知識庫列表 -->
                <div class="space-y-4">
                  @for (kb of knowledgeBases(); track kb.id) {
                    <div class="p-4 bg-slate-700/50 rounded-xl"
                         [class.ring-2]="kb.id === activeKbId()"
                         [class.ring-purple-500/50]="kb.id === activeKbId()">
                      <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-3">
                          <span class="text-2xl">📦</span>
                          <div>
                            <div class="font-medium text-white">{{ kb.name }}</div>
                            <div class="text-xs text-slate-400">{{ kb.items.length }} 項內容</div>
                          </div>
                        </div>
                        <div class="flex items-center gap-2">
                          <button (click)="setActiveKb(kb.id)"
                                  class="px-3 py-1 rounded-lg text-sm transition-colors"
                                  [class.bg-purple-500]="kb.id === activeKbId()"
                                  [class.text-white]="kb.id === activeKbId()"
                                  [class.bg-slate-600]="kb.id !== activeKbId()"
                                  [class.text-slate-300]="kb.id !== activeKbId()">
                            {{ kb.id === activeKbId() ? '使用中' : '啟用' }}
                          </button>
                          <button (click)="editKb(kb)"
                                  class="text-slate-400 hover:text-white">
                            編輯
                          </button>
                        </div>
                      </div>
                      
                      <!-- 知識項目預覽 -->
                      @if (kb.items.length > 0) {
                        <div class="flex flex-wrap gap-2 mt-3">
                          @for (item of kb.items.slice(0, 5); track item.id) {
                            <span class="px-2 py-1 bg-slate-600/50 text-slate-300 text-xs rounded">
                              {{ item.title }}
                            </span>
                          }
                          @if (kb.items.length > 5) {
                            <span class="px-2 py-1 bg-slate-600/30 text-slate-500 text-xs rounded">
                              +{{ kb.items.length - 5 }} 更多
                            </span>
                          }
                        </div>
                      }
                    </div>
                  } @empty {
                    <div class="text-center py-8 text-slate-400">
                      <div class="text-4xl mb-2">📚</div>
                      <p>尚未創建知識庫</p>
                      <button (click)="addKnowledgeBase()"
                              class="mt-3 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg">
                        + 創建知識庫
                      </button>
                    </div>
                  }
                </div>
              </div>
              
              <!-- 快速添加內容 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h4 class="font-semibold text-white mb-4 flex items-center gap-2">
                  <span>➕</span> 快速添加內容
                </h4>
                <div class="grid grid-cols-4 gap-3">
                  <button class="p-4 bg-slate-700/50 rounded-xl text-center hover:bg-slate-700 transition-colors">
                    <div class="text-2xl mb-2">📦</div>
                    <div class="text-sm text-white">產品知識</div>
                  </button>
                  <button class="p-4 bg-slate-700/50 rounded-xl text-center hover:bg-slate-700 transition-colors">
                    <div class="text-2xl mb-2">❓</div>
                    <div class="text-sm text-white">常見問答</div>
                  </button>
                  <button class="p-4 bg-slate-700/50 rounded-xl text-center hover:bg-slate-700 transition-colors">
                    <div class="text-2xl mb-2">🎯</div>
                    <div class="text-sm text-white">銷售話術</div>
                  </button>
                  <button class="p-4 bg-slate-700/50 rounded-xl text-center hover:bg-slate-700 transition-colors">
                    <div class="text-2xl mb-2">💬</div>
                    <div class="text-sm text-white">異議處理</div>
                  </button>
                </div>
              </div>
            </div>
          }
          
          @case ('strategy') {
            <!-- 對話策略 -->
            <div class="max-w-3xl mx-auto space-y-6">
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 class="font-semibold text-white mb-6 flex items-center gap-2">
                  <span>💬</span> 對話風格
                </h3>
                
                <div class="grid grid-cols-4 gap-3 mb-6">
                  @for (style of conversationStyles; track style.id) {
                    <button (click)="setStyle(style.id)"
                            class="p-4 rounded-xl text-center transition-all border-2"
                            [class.border-purple-500]="currentStyle() === style.id"
                            [class.bg-purple-500/10]="currentStyle() === style.id"
                            [class.border-transparent]="currentStyle() !== style.id"
                            [class.bg-slate-700/50]="currentStyle() !== style.id"
                            [class.hover:bg-slate-700]="currentStyle() !== style.id">
                      <div class="text-2xl mb-2">{{ style.icon }}</div>
                      <div class="text-sm font-medium"
                           [class.text-purple-400]="currentStyle() === style.id"
                           [class.text-white]="currentStyle() !== style.id">
                        {{ style.label }}
                      </div>
                    </button>
                  }
                </div>
                
                <!-- 回覆長度 -->
                <div class="mb-6">
                  <label class="text-sm text-slate-400 block mb-3">回覆長度</label>
                  <div class="flex gap-2">
                    @for (len of ['short', 'medium', 'long']; track len) {
                      <button class="flex-1 py-2 px-4 rounded-lg text-sm transition-colors"
                              [class.bg-purple-500]="responseLength() === len"
                              [class.text-white]="responseLength() === len"
                              [class.bg-slate-700]="responseLength() !== len"
                              [class.text-slate-300]="responseLength() !== len">
                        {{ len === 'short' ? '簡短' : len === 'medium' ? '適中' : '詳細' }}
                      </button>
                    }
                  </div>
                </div>
                
                <!-- Emoji 設置 -->
                <div class="mb-6">
                  <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer">
                    <div>
                      <div class="text-white">使用 Emoji 表情</div>
                      <div class="text-xs text-slate-400">在回覆中適當添加表情符號</div>
                    </div>
                    <input type="checkbox" [checked]="useEmoji()"
                           class="w-5 h-5 rounded text-purple-500 bg-slate-700 border-slate-600">
                  </label>
                </div>
                
                <!-- 自定義 Prompt -->
                <div>
                  <label class="text-sm text-slate-400 block mb-2">自定義人設 (可選)</label>
                  <textarea 
                    rows="4"
                    placeholder="例如：你是一位專業的銷售顧問，具有5年行業經驗..."
                    class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 resize-none">
                  </textarea>
                </div>
              </div>
            </div>
          }
          
          @case ('rules') {
            <!-- 智能規則 -->
            <div class="max-w-4xl mx-auto space-y-6">
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div class="flex items-center justify-between mb-6">
                  <h3 class="font-semibold text-white flex items-center gap-2">
                    <span>⚡</span> 智能規則
                  </h3>
                  <button class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
                    + 添加規則
                  </button>
                </div>
                
                <div class="space-y-3">
                  <!-- 預設規則 -->
                  @for (rule of defaultRules; track rule.id) {
                    <label class="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl cursor-pointer hover:bg-slate-700 transition-colors">
                      <div class="flex items-center gap-3">
                        <span class="text-xl">{{ rule.icon }}</span>
                        <div>
                          <div class="text-white">{{ rule.name }}</div>
                          <div class="text-xs text-slate-400">{{ rule.description }}</div>
                        </div>
                      </div>
                      <input type="checkbox" [checked]="rule.isActive"
                             class="w-5 h-5 rounded text-purple-500 bg-slate-700 border-slate-600">
                    </label>
                  }
                </div>
              </div>
            </div>
          }
          
          @case ('multi-role') {
            <!-- 多角色 AI 設置 -->
            <div class="max-w-4xl mx-auto space-y-6">
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 class="font-semibold text-white mb-6 flex items-center gap-2">
                  <span>🎭</span> 多角色 AI 人設
                  <span class="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">高級</span>
                </h3>
                
                <p class="text-slate-400 mb-6">
                  為多角色協作定義 AI 人設。每個角色將使用獨特的說話風格和人設進行對話。
                </p>
                
                <div class="text-center py-8 text-slate-500">
                  <div class="text-5xl mb-4">🎭</div>
                  <p class="mb-2">多角色 AI 設置將在「多角色協作」模塊中配置</p>
                  <p class="text-sm">AI 中心提供基礎 AI 能力供多角色模塊調用</p>
                </div>
              </div>
            </div>
          }
          
          @case ('stats') {
            <!-- 使用統計 -->
            <div class="max-w-4xl mx-auto space-y-6">
              <!-- 今日統計 -->
              <div class="grid grid-cols-4 gap-4">
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div class="text-3xl font-bold text-cyan-400">{{ aiService.stats().today.conversations }}</div>
                  <div class="text-sm text-slate-400">今日對話</div>
                </div>
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div class="text-3xl font-bold text-emerald-400">{{ aiService.stats().today.intentsRecognized }}</div>
                  <div class="text-sm text-slate-400">意圖識別</div>
                </div>
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div class="text-3xl font-bold text-purple-400">{{ aiService.stats().today.conversions }}</div>
                  <div class="text-sm text-slate-400">轉化</div>
                </div>
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div class="text-3xl font-bold text-orange-400">¥{{ aiService.stats().today.cost.toFixed(2) }}</div>
                  <div class="text-sm text-slate-400">成本</div>
                </div>
              </div>
              
              <!-- 週統計 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 class="font-semibold text-white mb-4">本週概覽</h3>
                <div class="grid grid-cols-2 gap-6">
                  <div>
                    <div class="text-4xl font-bold text-white mb-1">
                      {{ aiService.stats().weekly.conversations }}
                    </div>
                    <div class="text-slate-400">總對話</div>
                  </div>
                  <div>
                    <div class="text-4xl font-bold text-emerald-400 mb-1">
                      {{ (aiService.stats().weekly.conversionRate * 100).toFixed(1) }}%
                    </div>
                    <div class="text-slate-400">轉化率</div>
                  </div>
                </div>
              </div>
            </div>
          }
        }
      </div>
      
      <!-- 添加模型對話框 -->
      @if (showAddModel()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div class="bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-700">
            <h3 class="text-xl font-bold text-white mb-6">添加 AI 模型</h3>
            
            <div class="space-y-4">
              <div>
                <label class="text-sm text-slate-400 block mb-2">選擇供應商</label>
                <div class="grid grid-cols-3 gap-2">
                  @for (provider of providers; track provider.id) {
                    <button (click)="newModelProvider.set(provider.id)"
                            class="p-3 rounded-lg text-center transition-all border-2"
                            [class.border-purple-500]="newModelProvider() === provider.id"
                            [class.bg-purple-500/10]="newModelProvider() === provider.id"
                            [class.border-transparent]="newModelProvider() !== provider.id"
                            [class.bg-slate-700]="newModelProvider() !== provider.id">
                      <div class="text-2xl mb-1">{{ provider.icon }}</div>
                      <div class="text-xs"
                           [class.text-purple-400]="newModelProvider() === provider.id"
                           [class.text-slate-300]="newModelProvider() !== provider.id">
                        {{ provider.name }}
                      </div>
                    </button>
                  }
                </div>
              </div>
              
              <div>
                <label class="text-sm text-slate-400 block mb-2">模型名稱</label>
                <input type="text" 
                       [(ngModel)]="newModelName"
                       placeholder="如 gpt-4, claude-3-opus"
                       class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500">
              </div>
              
              <div>
                <label class="text-sm text-slate-400 block mb-2">API Key</label>
                <input type="password" 
                       [(ngModel)]="newModelApiKey"
                       placeholder="sk-..."
                       class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500">
              </div>
            </div>
            
            <div class="flex gap-3 mt-6">
              <button (click)="showAddModel.set(false)"
                      class="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors">
                取消
              </button>
              <button (click)="saveNewModel()"
                      class="flex-1 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-400 transition-colors">
                添加
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AICenterComponent {
  aiService = inject(AICenterService);
  
  activeTab = signal<AITab>('models');
  showAddModel = signal(false);
  
  // 新模型表單
  newModelProvider = signal<AIProvider>('openai');
  newModelName = '';
  newModelApiKey = '';
  
  tabs = [
    { id: 'models' as const, icon: '🤖', label: '模型配置' },
    { id: 'knowledge' as const, icon: '📚', label: '知識庫' },
    { id: 'strategy' as const, icon: '💬', label: '對話策略' },
    { id: 'rules' as const, icon: '⚡', label: '智能規則' },
    { id: 'multi-role' as const, icon: '🎭', label: '多角色AI' },
    { id: 'stats' as const, icon: '📊', label: '使用統計' }
  ];
  
  providers = [
    { id: 'openai' as const, name: 'OpenAI', icon: '🟢' },
    { id: 'claude' as const, name: 'Claude', icon: '🟣' },
    { id: 'gemini' as const, name: 'Gemini', icon: '🔵' }
  ];
  
  conversationStyles = [
    { id: 'professional' as const, icon: '👔', label: '專業正式' },
    { id: 'friendly' as const, icon: '😊', label: '友好親切' },
    { id: 'casual' as const, icon: '😎', label: '輕鬆幽默' },
    { id: 'direct' as const, icon: '🎯', label: '直接簡潔' }
  ];
  
  defaultRules = [
    { id: 'purchase', icon: '🛒', name: '購買意向明確 → 通知人工', description: '當識別到購買意向時立即通知', isActive: true },
    { id: 'no-response', icon: '⏰', name: '連續3次不回覆 → 暫停', description: '暫停對話，3天後再跟進', isActive: true },
    { id: 'negative', icon: '😔', name: '負面情緒 → 轉人工', description: '檢測到負面情緒時轉人工處理', isActive: true },
    { id: 'price', icon: '💰', name: '價格敏感 → 推送優惠', description: '詢問價格時推送優惠方案', isActive: false }
  ];
  
  // 計算屬性
  knowledgeBases = computed(() => [] as KnowledgeBase[]);
  activeKbId = computed(() => '');
  currentStyle = computed(() => this.aiService.strategy().style);
  responseLength = computed(() => this.aiService.strategy().responseLength);
  useEmoji = computed(() => this.aiService.strategy().useEmoji);
  
  getProviderIcon(provider: AIProvider): string {
    return this.providers.find(p => p.id === provider)?.icon || '🤖';
  }
  
  getProviderName(provider: AIProvider): string {
    return this.providers.find(p => p.id === provider)?.name || provider;
  }
  
  testModel(model: AIModelConfig) {
    this.aiService.testModelConnection(model.id);
  }
  
  editModel(model: AIModelConfig) {
    // TODO: 實現編輯功能
  }
  
  saveNewModel() {
    if (!this.newModelName || !this.newModelApiKey) return;
    
    this.aiService.addModel({
      provider: this.newModelProvider(),
      modelName: this.newModelName,
      apiKey: this.newModelApiKey
    });
    
    this.showAddModel.set(false);
    this.newModelName = '';
    this.newModelApiKey = '';
  }
  
  addKnowledgeBase() {
    const name = prompt('請輸入知識庫名稱：');
    if (name) {
      this.aiService.addKnowledgeBase(name);
    }
  }
  
  setActiveKb(id: string) {
    this.aiService.setActiveKnowledgeBase(id);
  }
  
  editKb(kb: KnowledgeBase) {
    // TODO: 實現編輯功能
  }
  
  setStyle(style: ConversationStyle) {
    this.aiService.updateConversationStrategy({ style });
  }
}
