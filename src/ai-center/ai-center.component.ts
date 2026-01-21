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

type AITab = 'quick' | 'models' | 'knowledge' | 'strategy' | 'rules' | 'multi-role' | 'stats';

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
          @case ('quick') {
            <!-- 快速設置 -->
            <div class="max-w-4xl mx-auto space-y-6">
              <!-- 自動聊天總開關 -->
              <div class="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl border border-purple-500/30 p-6">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-xl bg-purple-500/30 flex items-center justify-center text-3xl">
                      🤖
                    </div>
                    <div>
                      <h3 class="text-xl font-bold text-white">AI 自動聊天</h3>
                      <p class="text-slate-400 text-sm">開啟後，AI 將自動問候新 Lead 並回覆私信</p>
                    </div>
                  </div>
                  <button (click)="toggleAutoChat()"
                          class="relative w-16 h-8 rounded-full transition-all"
                          [class.bg-emerald-500]="autoChatEnabled()"
                          [class.bg-slate-600]="!autoChatEnabled()">
                    <span class="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform"
                          [class.translate-x-8]="autoChatEnabled()"></span>
                  </button>
                </div>
                
                @if (autoChatEnabled()) {
                  <div class="mt-6 pt-6 border-t border-purple-500/30 space-y-4">
                    <!-- 模式選擇 -->
                    <div>
                      <label class="text-sm text-slate-400 block mb-2">聊天模式</label>
                      <div class="grid grid-cols-3 gap-3">
                        <button (click)="setAutoChatMode('full')"
                                class="p-4 rounded-xl border transition-all text-center"
                                [class.bg-emerald-500/20]="autoChatMode() === 'full'"
                                [class.border-emerald-500]="autoChatMode() === 'full'"
                                [class.bg-slate-700/50]="autoChatMode() !== 'full'"
                                [class.border-slate-600]="autoChatMode() !== 'full'">
                          <div class="text-2xl mb-1">🚀</div>
                          <div class="font-medium text-white">全自動</div>
                          <div class="text-xs text-slate-400">AI 自動發送回覆</div>
                        </button>
                        <button (click)="setAutoChatMode('semi')"
                                class="p-4 rounded-xl border transition-all text-center"
                                [class.bg-cyan-500/20]="autoChatMode() === 'semi'"
                                [class.border-cyan-500]="autoChatMode() === 'semi'"
                                [class.bg-slate-700/50]="autoChatMode() !== 'semi'"
                                [class.border-slate-600]="autoChatMode() !== 'semi'">
                          <div class="text-2xl mb-1">👥</div>
                          <div class="font-medium text-white">半自動</div>
                          <div class="text-xs text-slate-400">生成建議後確認發送</div>
                        </button>
                        <button (click)="setAutoChatMode('assist')"
                                class="p-4 rounded-xl border transition-all text-center"
                                [class.bg-amber-500/20]="autoChatMode() === 'assist'"
                                [class.border-amber-500]="autoChatMode() === 'assist'"
                                [class.bg-slate-700/50]="autoChatMode() !== 'assist'"
                                [class.border-slate-600]="autoChatMode() !== 'assist'">
                          <div class="text-2xl mb-1">💡</div>
                          <div class="font-medium text-white">輔助模式</div>
                          <div class="text-xs text-slate-400">僅提供建議不發送</div>
                        </button>
                      </div>
                    </div>
                    
                    <!-- 功能開關 -->
                    <div class="grid grid-cols-2 gap-4">
                      <div class="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                        <div class="flex items-center gap-3">
                          <span class="text-xl">👋</span>
                          <div>
                            <div class="font-medium text-white">自動問候</div>
                            <div class="text-xs text-slate-400">新 Lead 自動發送問候</div>
                          </div>
                        </div>
                        <input type="checkbox" [checked]="autoGreetingEnabled()" 
                               (change)="toggleAutoGreeting()"
                               class="w-5 h-5 rounded bg-slate-600 border-slate-500">
                      </div>
                      <div class="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                        <div class="flex items-center gap-3">
                          <span class="text-xl">💬</span>
                          <div>
                            <div class="font-medium text-white">自動回覆</div>
                            <div class="text-xs text-slate-400">用戶私信自動回覆</div>
                          </div>
                        </div>
                        <input type="checkbox" [checked]="autoReplyEnabled()"
                               (change)="toggleAutoReply()"
                               class="w-5 h-5 rounded bg-slate-600 border-slate-500">
                      </div>
                    </div>
                  </div>
                }
              </div>
              
              <!-- 發送帳號配置 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div class="flex items-center gap-3 mb-4">
                  <span class="text-2xl">📤</span>
                  <div>
                    <h3 class="font-semibold text-white">發送帳號</h3>
                    <p class="text-sm text-slate-400">選擇用於發送消息的帳號</p>
                  </div>
                </div>
                
                <div class="space-y-2">
                  @for (account of senderAccounts(); track account.phone) {
                    <div class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center overflow-hidden">
                          @if (account.avatar) {
                            <img [src]="account.avatar" alt="Avatar" class="w-full h-full object-cover">
                          } @else {
                            <span class="text-cyan-400">{{ account.username?.charAt(0) || '?' }}</span>
                          }
                        </div>
                        <div>
                          <div class="font-medium text-white">{{ account.username || account.phone }}</div>
                          <div class="text-xs text-slate-400">今日: {{ account.sentToday || 0 }}/{{ account.dailyLimit || 50 }} 條</div>
                        </div>
                      </div>
                      <span class="flex items-center gap-1 text-emerald-400 text-sm">
                        <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        在線
                      </span>
                    </div>
                  } @empty {
                    <div class="text-center py-8 text-slate-400">
                      <div class="text-3xl mb-2">📤</div>
                      <p>沒有可用的發送帳號</p>
                      <p class="text-sm text-slate-500">請在帳號管理中添加並設置為「發送」角色</p>
                    </div>
                  }
                </div>
              </div>
              
              <!-- AI 模型狀態 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <span class="text-2xl">🧠</span>
                    <div>
                      <h3 class="font-semibold text-white">AI 模型</h3>
                      <p class="text-sm text-slate-400">當前使用的 AI 模型</p>
                    </div>
                  </div>
                  <button (click)="activeTab.set('models')"
                          class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm">
                    配置模型 →
                  </button>
                </div>
                
                @if (aiService.defaultModel()) {
                  <div class="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <div class="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-2xl">
                      {{ getProviderIcon(aiService.defaultModel()!.provider) }}
                    </div>
                    <div class="flex-1">
                      <div class="font-medium text-white">{{ aiService.defaultModel()!.modelName }}</div>
                      <div class="text-sm text-slate-400">{{ getProviderName(aiService.defaultModel()!.provider) }}</div>
                    </div>
                    <span class="flex items-center gap-1 text-emerald-400">
                      <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      已連接
                    </span>
                  </div>
                } @else {
                  <div class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <div class="flex items-center gap-3">
                      <span class="text-2xl">⚠️</span>
                      <div>
                        <div class="font-medium text-amber-400">未配置 AI 模型</div>
                        <div class="text-sm text-slate-400">請先添加 AI 模型才能使用自動聊天功能</div>
                      </div>
                    </div>
                  </div>
                }
              </div>
              
              <!-- 保存按鈕 -->
              <div class="flex justify-end">
                <button (click)="saveQuickSettings()"
                        class="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-400 hover:to-pink-400 transition-all shadow-lg">
                  💾 保存設置
                </button>
              </div>
            </div>
          }
          @case ('models') {
            <!-- 模型配置 -->
            <div class="max-w-4xl mx-auto space-y-6">
              
              <!-- 本地 AI 區域 (推薦) -->
              <div class="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 rounded-xl border border-emerald-500/30 p-6">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-semibold text-white flex items-center gap-2">
                    <span>🦙</span> 本地 AI
                    <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">推薦 - 免費無限</span>
                  </h3>
                  <button (click)="showAddLocalModel.set(true)"
                          class="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors">
                    + 添加本地 AI
                  </button>
                </div>
                
                <div class="space-y-3">
                  @for (model of localModels(); track model.id) {
                    <div class="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                      <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                          <span class="text-2xl">🦙</span>
                        </div>
                        <div>
                          <div class="font-medium text-white">{{ $any(model).displayName || model.modelName }}</div>
                          <div class="text-xs text-slate-400 truncate max-w-xs">{{ model.apiEndpoint }}</div>
                        </div>
                      </div>
                      
                      <div class="flex items-center gap-3">
                        @if (model.isConnected) {
                          <span class="flex items-center gap-1 text-emerald-400 text-sm">
                            <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            已連接
                          </span>
                        } @else {
                          <span class="text-amber-400 text-sm">未測試</span>
                        }
                        
                        <button (click)="testModel(model)"
                                class="px-3 py-1 bg-slate-600 text-slate-300 rounded-lg text-sm hover:bg-slate-500">
                          測試
                        </button>
                        <button (click)="setAsDefault(model)"
                                class="px-3 py-1 text-sm rounded-lg transition-colors"
                                [class]="aiService.defaultModel()?.id === model.id ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'">
                          {{ aiService.defaultModel()?.id === model.id ? '默認' : '設為默認' }}
                        </button>
                        <button (click)="deleteModel(model)"
                                class="text-red-400 hover:text-red-300 p-1">
                          ✕
                        </button>
                      </div>
                    </div>
                  } @empty {
                    <div class="text-center py-6 text-slate-400">
                      <p class="text-sm mb-3">使用本地 Ollama 可免費無限調用 AI</p>
                      <button (click)="showAddLocalModel.set(true)"
                              class="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30">
                        🦙 快速配置本地 AI
                      </button>
                    </div>
                  }
                </div>
              </div>
              
              <!-- 雲端 AI 區域 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-semibold text-white flex items-center gap-2">
                    <span>☁️</span> 雲端 AI
                  </h3>
                  <button (click)="showAddModel.set(true)"
                          class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
                    + 添加雲端模型
                  </button>
                </div>
                
                <div class="space-y-3">
                  @for (model of cloudModels(); track model.id) {
                    <div class="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors">
                      <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center"
                             [class.bg-emerald-500/20]="model.provider === 'openai'"
                             [class.bg-purple-500/20]="model.provider === 'claude'"
                             [class.bg-blue-500/20]="model.provider === 'gemini'">
                          <span class="text-2xl">{{ getProviderIcon(model.provider) }}</span>
                        </div>
                        <div>
                          <div class="font-medium text-white">{{ $any(model).displayName || model.modelName }}</div>
                          <div class="text-sm text-slate-400">{{ getProviderName(model.provider) }}</div>
                        </div>
                      </div>
                      
                      <div class="flex items-center gap-3">
                        @if (model.isConnected) {
                          <span class="flex items-center gap-1 text-emerald-400 text-sm">
                            <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            已連接
                          </span>
                        } @else {
                          <span class="text-slate-500 text-sm">未連接</span>
                        }
                        
                        <button (click)="testModel(model)"
                                class="px-3 py-1 bg-slate-600 text-slate-300 rounded-lg text-sm hover:bg-slate-500">
                          測試
                        </button>
                        <button (click)="setAsDefault(model)"
                                class="px-3 py-1 text-sm rounded-lg transition-colors"
                                [class]="aiService.defaultModel()?.id === model.id ? 'bg-purple-500 text-white' : 'bg-slate-600 text-slate-300 hover:bg-slate-500'">
                          {{ aiService.defaultModel()?.id === model.id ? '默認' : '設為默認' }}
                        </button>
                        <button (click)="deleteModel(model)"
                                class="text-red-400 hover:text-red-300 p-1">
                          ✕
                        </button>
                      </div>
                    </div>
                  } @empty {
                    <div class="text-center py-6 text-slate-400">
                      <p class="text-sm mb-3">添加 OpenAI、Claude 或 Gemini 等雲端模型</p>
                      <button (click)="showAddModel.set(true)"
                              class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30">
                        + 添加雲端模型
                      </button>
                    </div>
                  }
                </div>
                
                <!-- 模型用途分配 -->
                @if (aiService.models().length > 0) {
                  <div class="mt-6 pt-6 border-t border-slate-700/50">
                    <div class="flex items-center justify-between mb-4">
                      <h4 class="text-sm font-medium text-white">模型用途分配</h4>
                      @if (isSavingUsage()) {
                        <span class="text-xs text-emerald-400 flex items-center gap-1">
                          <span class="animate-spin">⟳</span> 保存中...
                        </span>
                      } @else if (usageSaved()) {
                        <span class="text-xs text-emerald-400 flex items-center gap-1">
                          ✓ 已保存
                        </span>
                      }
                    </div>
                    <div class="grid grid-cols-3 gap-4">
                      <div>
                        <label class="text-xs text-slate-400 block mb-2">意圖識別</label>
                        <select class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                [value]="aiService.modelUsage().intentRecognition"
                                (change)="onModelUsageChange('intentRecognition', $event)">
                          <option value="">選擇模型</option>
                          @for (model of aiService.models(); track model.id) {
                            <option [value]="model.id" [selected]="model.id === aiService.modelUsage().intentRecognition">
                              {{ $any(model).displayName || model.modelName }}
                            </option>
                          }
                        </select>
                      </div>
                      <div>
                        <label class="text-xs text-slate-400 block mb-2">日常對話</label>
                        <select class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                [value]="aiService.modelUsage().dailyChat"
                                (change)="onModelUsageChange('dailyChat', $event)">
                          <option value="">選擇模型</option>
                          @for (model of aiService.models(); track model.id) {
                            <option [value]="model.id" [selected]="model.id === aiService.modelUsage().dailyChat">
                              {{ $any(model).displayName || model.modelName }}
                            </option>
                          }
                        </select>
                      </div>
                      <div>
                        <label class="text-xs text-slate-400 block mb-2">多角色劇本</label>
                        <select class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                [value]="aiService.modelUsage().multiRoleScript"
                                (change)="onModelUsageChange('multiRoleScript', $event)">
                          <option value="">選擇模型</option>
                          @for (model of aiService.models(); track model.id) {
                            <option [value]="model.id" [selected]="model.id === aiService.modelUsage().multiRoleScript">
                              {{ $any(model).displayName || model.modelName }}
                            </option>
                          }
                        </select>
                      </div>
                    </div>
                    <p class="text-xs text-slate-500 mt-3">💡 選擇後自動保存，不同用途可以使用不同的 AI 模型</p>
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
      
      <!-- 添加雲端模型對話框 -->
      @if (showAddModel()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div class="bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-700">
            <h3 class="text-xl font-bold text-white mb-6">添加雲端 AI 模型</h3>
            
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
                <label class="text-sm text-slate-400 block mb-2">選擇模型 *</label>
                <select [(ngModel)]="newModelName"
                        class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white">
                  <option value="">請選擇模型</option>
                  @for (model of currentPresetModels(); track model.name) {
                    <option [value]="model.name">{{ model.displayName }}</option>
                  }
                </select>
                <p class="text-xs text-slate-500 mt-1">💡 模型名稱將自動格式化，無需擔心大小寫</p>
              </div>
              
              <div>
                <label class="text-sm text-slate-400 block mb-2">API Key *</label>
                <input type="password" 
                       [(ngModel)]="newModelApiKey"
                       placeholder="sk-..."
                       class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500">
              </div>
              
              <div>
                <label class="text-sm text-slate-400 block mb-2">顯示名稱 (可選)</label>
                <input type="text" 
                       [(ngModel)]="newModelDisplayName"
                       placeholder="如 我的 GPT-4"
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
      
      <!-- 添加本地 AI 對話框 -->
      @if (showAddLocalModel()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div class="bg-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-xl border border-emerald-500/30">
            <h3 class="text-xl font-bold text-white mb-2 flex items-center gap-2">
              🦙 添加本地 AI
            </h3>
            <p class="text-slate-400 text-sm mb-6">配置 Ollama 或其他本地 AI 服務</p>
            
            <div class="space-y-4">
              <div>
                <label class="text-sm text-slate-400 block mb-2">API 端點 *</label>
                <input type="text" 
                       [(ngModel)]="localModelEndpoint"
                       placeholder="https://your-ollama.ts.net/api/chat"
                       class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500">
                <p class="text-xs text-slate-500 mt-1">
                  💡 使用 Tailscale Funnel 可實現遠程訪問本地 Ollama
                </p>
              </div>
              
              <div>
                <label class="text-sm text-slate-400 block mb-2">模型名稱 *</label>
                <input type="text" 
                       [(ngModel)]="localModelName"
                       placeholder="qwen2.5, llama3.2, mistral"
                       class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500">
                <p class="text-xs text-slate-500 mt-1">
                  在 Ollama 中運行 <code class="text-emerald-400">ollama list</code> 查看可用模型
                </p>
              </div>
              
              <div>
                <label class="text-sm text-slate-400 block mb-2">顯示名稱 (可選)</label>
                <input type="text" 
                       [(ngModel)]="localModelDisplayName"
                       placeholder="我的本地 AI"
                       class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500">
              </div>
              
              <!-- 測試連接按鈕 -->
              <button (click)="testLocalConnection()"
                      [disabled]="isTestingLocal()"
                      class="w-full py-2.5 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center justify-center gap-2">
                @if (isTestingLocal()) {
                  <span class="animate-spin">⟳</span> 正在測試連接...
                } @else {
                  🔗 測試連接
                }
              </button>
            </div>
            
            <div class="flex gap-3 mt-6">
              <button (click)="showAddLocalModel.set(false)"
                      class="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors">
                取消
              </button>
              <button (click)="saveLocalModel()"
                      class="flex-1 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 transition-colors">
                保存
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
  
  activeTab = signal<AITab>('quick');  // 默認顯示快速設置
  showAddModel = signal(false);
  
  // 快速設置狀態
  autoChatEnabled = signal(false);
  autoChatMode = signal<'full' | 'semi' | 'assist'>('full');
  autoGreetingEnabled = signal(true);
  autoReplyEnabled = signal(true);
  senderAccounts = signal<{phone: string; username?: string; avatar?: string; sentToday?: number; dailyLimit?: number}[]>([]);
  
  // 新模型表單
  newModelProvider = signal<AIProvider>('openai');
  newModelName = '';
  newModelApiKey = '';
  newModelEndpoint = '';
  newModelDisplayName = '';
  
  // 本地 AI 配置
  showAddLocalModel = signal(false);
  localModelEndpoint = 'https://ms-defysomwqybz.tail05a567.ts.net/api/chat';
  localModelName = 'huihui_ai/qwen2.5-abliterate';
  localModelDisplayName = '我的本地 AI';
  isTestingLocal = signal(false);
  
  // 模型用途分配保存狀態
  isSavingUsage = signal(false);
  usageSaved = signal(false);
  private usageSaveTimeout: any = null;
  
  tabs = [
    { id: 'quick' as const, icon: '⚡', label: '快速設置' },
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
  
  // 預設模型列表（按供應商分類）- 使用正確的 API 模型名稱
  presetModels: Record<string, { name: string; displayName: string }[]> = {
    'openai': [
      { name: 'gpt-4o', displayName: 'GPT-4o (推薦)' },
      { name: 'gpt-4o-mini', displayName: 'GPT-4o Mini (經濟)' },
      { name: 'gpt-4-turbo', displayName: 'GPT-4 Turbo' },
      { name: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo (快速)' },
    ],
    'claude': [
      { name: 'claude-3-5-sonnet-latest', displayName: 'Claude 3.5 Sonnet (推薦)' },
      { name: 'claude-3-opus-latest', displayName: 'Claude 3 Opus (強大)' },
      { name: 'claude-3-haiku-20240307', displayName: 'Claude 3 Haiku (快速)' },
    ],
    'gemini': [
      { name: 'gemini-1.5-flash-latest', displayName: 'Gemini 1.5 Flash (推薦)' },
      { name: 'gemini-1.5-pro-latest', displayName: 'Gemini 1.5 Pro (強大)' },
      { name: 'gemini-2.0-flash-exp', displayName: 'Gemini 2.0 Flash (實驗)' },
    ]
  };
  
  // 當前供應商的預設模型
  currentPresetModels = computed(() => this.presetModels[this.newModelProvider()] || []);
  
  // 本地 AI 模型
  localModels = this.aiService.localModels;
  cloudModels = this.aiService.cloudModels;
  
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
      apiKey: this.newModelApiKey,
      apiEndpoint: this.newModelEndpoint || undefined,
      displayName: this.newModelDisplayName || this.newModelName
    });
    
    this.showAddModel.set(false);
    this.newModelName = '';
    this.newModelApiKey = '';
    this.newModelEndpoint = '';
    this.newModelDisplayName = '';
  }
  
  // ========== 本地 AI 方法 ==========
  
  saveLocalModel() {
    if (!this.localModelEndpoint || !this.localModelName) {
      alert('請填寫 API 端點和模型名稱');
      return;
    }
    
    this.aiService.addLocalModel({
      modelName: this.localModelName,
      displayName: this.localModelDisplayName || this.localModelName,
      apiEndpoint: this.localModelEndpoint,
      isDefault: this.aiService.models().length === 0 // 如果是第一個模型，設為默認
    });
    
    this.showAddLocalModel.set(false);
    // 重置表單但保留常用值
    this.localModelDisplayName = '我的本地 AI';
  }
  
  async testLocalConnection() {
    if (!this.localModelEndpoint || !this.localModelName) {
      alert('請先填寫 API 端點和模型名稱');
      return;
    }
    
    this.isTestingLocal.set(true);
    await this.aiService.testLocalAIConnection(this.localModelEndpoint, this.localModelName);
    
    // 測試結果通過事件返回，這裡延遲重置狀態
    setTimeout(() => this.isTestingLocal.set(false), 3000);
  }
  
  // 模型用途分配變更處理（自動保存）
  onModelUsageChange(field: 'intentRecognition' | 'dailyChat' | 'multiRoleScript', event: Event) {
    const select = event.target as HTMLSelectElement;
    const modelId = select.value;
    
    // 更新本地狀態
    this.aiService.updateModelUsage({ [field]: modelId });
    
    // 顯示保存狀態
    this.isSavingUsage.set(true);
    this.usageSaved.set(false);
    
    // 防抖保存（300ms）
    if (this.usageSaveTimeout) {
      clearTimeout(this.usageSaveTimeout);
    }
    
    this.usageSaveTimeout = setTimeout(async () => {
      await this.aiService.saveModelUsageToBackend();
      this.isSavingUsage.set(false);
      this.usageSaved.set(true);
      
      // 3 秒後隱藏「已保存」提示
      setTimeout(() => this.usageSaved.set(false), 3000);
    }, 300);
  }
  
  deleteModel(model: AIModelConfig) {
    if (confirm(`確定要刪除模型「${(model as any).displayName || model.modelName}」嗎？`)) {
      this.aiService.removeModel(model.id);
    }
  }
  
  setAsDefault(model: AIModelConfig) {
    this.aiService.setDefaultModel(model.id);
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
  
  // ========== 快速設置方法 ==========
  
  toggleAutoChat() {
    this.autoChatEnabled.update(v => !v);
  }
  
  setAutoChatMode(mode: 'full' | 'semi' | 'assist') {
    this.autoChatMode.set(mode);
  }
  
  toggleAutoGreeting() {
    this.autoGreetingEnabled.update(v => !v);
  }
  
  toggleAutoReply() {
    this.autoReplyEnabled.update(v => !v);
  }
  
  saveQuickSettings() {
    // 發送設置到後端
    const settings = {
      auto_chat_enabled: this.autoChatEnabled() ? 1 : 0,
      auto_chat_mode: this.autoChatMode(),
      auto_greeting: this.autoGreetingEnabled() ? 1 : 0,
      auto_reply: this.autoReplyEnabled() ? 1 : 0
    };
    
    // 保存到 localStorage
    localStorage.setItem('ai_auto_chat_enabled', String(this.autoChatEnabled()));
    localStorage.setItem('ai_auto_chat_mode', this.autoChatMode());
    localStorage.setItem('ai_auto_greeting', String(this.autoGreetingEnabled()));
    localStorage.setItem('ai_auto_reply', String(this.autoReplyEnabled()));
    
    // 發送到後端（通過 window 事件）
    window.dispatchEvent(new CustomEvent('save-ai-settings', { detail: settings }));
    
    // 顯示成功提示
    alert('設置已保存！');
  }
  
  loadQuickSettings() {
    // 從 localStorage 加載設置
    const enabled = localStorage.getItem('ai_auto_chat_enabled');
    const mode = localStorage.getItem('ai_auto_chat_mode') as 'full' | 'semi' | 'assist' | null;
    const greeting = localStorage.getItem('ai_auto_greeting');
    const reply = localStorage.getItem('ai_auto_reply');
    
    if (enabled !== null) this.autoChatEnabled.set(enabled === 'true');
    if (mode) this.autoChatMode.set(mode);
    if (greeting !== null) this.autoGreetingEnabled.set(greeting === 'true');
    if (reply !== null) this.autoReplyEnabled.set(reply === 'true');
  }
  
  ngOnInit() {
    this.loadQuickSettings();
    this.loadSenderAccounts();
  }
  
  loadSenderAccounts() {
    // 從後端獲取發送帳號（通過 window 事件）
    window.dispatchEvent(new CustomEvent('get-sender-accounts'));
    
    // 監聽回調
    window.addEventListener('sender-accounts-loaded', ((event: CustomEvent) => {
      const accounts = event.detail || [];
      this.senderAccounts.set(accounts);
    }) as EventListener, { once: true });
  }
}
