/**
 * 智能引擎設置組件
 * AI Engine Settings Component
 * 
 * 🆕 Phase 3-1: 重構為「智能引擎設置」
 * 
 * 職責：
 * - AI 模型配置（API Key、模型選擇）
 * - 知識大腦（RAG 知識庫）
 * - AI 人格設置（說話風格、回應策略）
 * 
 * 已移至營銷任務中心：
 * - AI 自動聊天開關
 * - 聊天模式選擇
 * - 快速啟動功能
 */

import { Component, signal, computed, inject, OnInit, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AICenterService } from './ai-center.service';
import { KnowledgeManageComponent } from './knowledge-manage.component';
import { KnowledgeGapsComponent } from './knowledge-gaps.component';
import { DialogService } from '../services/dialog.service';
import { ToastService } from '../toast.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { NavBridgeService } from '../services/nav-bridge.service';
import { 
  AIModelConfig, 
  AIProvider, 
  KnowledgeBase, 
  KnowledgeItem,
  SmartRule,
  IntentType,
  ConversationStyle
} from './ai-center.models';

// 🔄 簡化標籤結構；知识大脑为独立 Tab，内含 总览/知识管理/知识缺口
type AITab = 'quick' | 'models' | 'persona' | 'stats' | 'knowledge';
type KnowledgeSubTab = 'overview' | 'manage' | 'gaps';

@Component({
  selector: 'app-ai-center',
  standalone: true,
  imports: [CommonModule, FormsModule, KnowledgeManageComponent, KnowledgeGapsComponent],
  template: `
    <div class="ai-center h-full flex flex-col bg-slate-900">
      <!-- 頂部標題欄 -->
      <div class="p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-2xl">⚙️</span>
              智能引擎設置
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
            <button (click)="selectTab(tab.id)"
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
            <!-- 🆕 Phase 3-1: 引擎概覽 -->
            <div class="max-w-4xl mx-auto space-y-6">
              <!-- AI 自動聊天（保留，但提示用戶使用營銷任務中心） -->
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
              
              <!-- 🆕 P1-2: 智能營銷中心入口（替代 AI 自主模式） -->
              <div class="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-2xl border border-cyan-500/30 p-6">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center text-3xl">
                      🚀
                    </div>
                    <div>
                      <h3 class="text-xl font-bold text-white flex items-center gap-2">
                        智能營銷中心
                        <span class="px-2 py-0.5 text-xs bg-purple-500/30 text-purple-400 rounded-full">整合</span>
                      </h3>
                      <p class="text-slate-400 text-sm">一鍵啟動營銷任務 - AI 自動配置角色和策略</p>
                    </div>
                  </div>
                  <button (click)="goToSmartMarketing()"
                          class="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:opacity-90 transition-all shadow-lg flex items-center gap-2">
                    <span>🚀</span>
                    前往使用
                  </button>
                </div>
                
                <div class="mt-6 pt-6 border-t border-cyan-500/30">
                  <div class="grid grid-cols-4 gap-3 text-center">
                    <div class="p-3 bg-slate-800/50 rounded-xl">
                      <div class="text-xl mb-1">💰</div>
                      <div class="text-xs font-medium text-white">促進首單</div>
                    </div>
                    <div class="p-3 bg-slate-800/50 rounded-xl">
                      <div class="text-xl mb-1">💝</div>
                      <div class="text-xs font-medium text-white">挽回流失</div>
                    </div>
                    <div class="p-3 bg-slate-800/50 rounded-xl">
                      <div class="text-xl mb-1">🎉</div>
                      <div class="text-xs font-medium text-white">社群活躍</div>
                    </div>
                    <div class="p-3 bg-slate-800/50 rounded-xl">
                      <div class="text-xl mb-1">🔧</div>
                      <div class="text-xs font-medium text-white">售後服務</div>
                    </div>
                  </div>
                  <p class="text-xs text-cyan-400 mt-4 text-center">
                    💡 選擇目標 → AI 自動配置 → 一鍵啟動，已整合多角色協作和 AI 自主功能
                  </p>
                </div>
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
              
              <!-- 🔧 P0-2: 保存按鈕（REST 持久化） -->
              <div class="sticky bottom-0 z-10 mt-6 -mx-6 px-6 py-4 bg-slate-800/95 backdrop-blur-sm border-t border-slate-700/50 flex items-center justify-between rounded-b-xl">
                <div class="flex items-center gap-3 text-sm">
                  @if (quickSaving()) {
                    <span class="flex items-center gap-2 text-cyan-400">
                      <span class="inline-block w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
                      保存中...
                    </span>
                  } @else if (quickSaved()) {
                    <span class="flex items-center gap-2 text-emerald-400">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                      引擎設置已保存
                    </span>
                  } @else {
                    <span class="text-slate-500">設置保存到雲端，下次登錄自動恢復</span>
                  }
                </div>
                <button (click)="saveQuickSettings()"
                        [disabled]="quickSaving()"
                        class="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:from-purple-400 hover:to-pink-400 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  @if (quickSaving()) {
                    <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  } @else {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
                  }
                  保存設置
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
                                [disabled]="aiService.testingModelIds().has(model.id)"
                                class="px-3 py-1 bg-slate-600 text-slate-300 rounded-lg text-sm hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
                          @if (aiService.testingModelIds().has(model.id)) {
                            <span class="inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                            測試中...
                          } @else {
                            測試
                          }
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
                                [disabled]="aiService.testingModelIds().has(model.id)"
                                class="px-3 py-1 bg-slate-600 text-slate-300 rounded-lg text-sm hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">
                          @if (aiService.testingModelIds().has(model.id)) {
                            <span class="inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
                            測試中...
                          } @else {
                            測試
                          }
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
              
              <!-- 🔊 P1: 語音輸出配置 (TTS) -->
              <div class="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/30 p-6">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="font-semibold text-white flex items-center gap-2">
                    <span>🔊</span> 語音輸出 (TTS)
                    <span class="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">可選</span>
                  </h3>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" 
                           [(ngModel)]="ttsEnabled" 
                           (change)="saveTtsSettings()"
                           class="sr-only peer">
                    <div class="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                    <span class="ms-3 text-sm font-medium text-slate-300">{{ ttsEnabled ? '已啟用' : '已關閉' }}</span>
                  </label>
                </div>
                
                <p class="text-sm text-slate-400 mb-4">啟用後，AI 回覆將自動轉換為語音播放</p>
                
                @if (ttsEnabled) {
                  <div class="space-y-4">
                    <div>
                      <label class="text-sm text-slate-400 block mb-2">TTS 服務端點</label>
                      <input type="text" 
                             [(ngModel)]="ttsEndpoint"
                             placeholder="http://localhost:9881"
                             class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500">
                      <p class="text-xs text-slate-500 mt-1">支持 GPT-SoVITS、VITS 等本地語音服務</p>
                    </div>
                    
                    <div class="flex gap-3">
                      <button (click)="testTtsConnection()"
                              [disabled]="isTestingTts()"
                              class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50 flex items-center gap-2">
                        @if (isTestingTts()) {
                          <span class="inline-block w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></span>
                          測試中...
                        } @else {
                          🔗 測試連接
                        }
                      </button>
                      
                      @if (ttsConnected()) {
                        <button (click)="testTtsVoice()"
                                class="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors flex items-center gap-2">
                          🔊 試聽語音
                        </button>
                      }
                    </div>
                    
                    @if (ttsConnected()) {
                      <div class="flex items-center gap-2 text-emerald-400 text-sm">
                        <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        TTS 服務已連接
                        @if (ttsLatency() > 0) {
                          <span class="text-slate-500">· 延遲: {{ ttsLatency() }}ms</span>
                        }
                      </div>
                    }
                  </div>
                } @else {
                  <div class="text-center py-4 text-slate-400">
                    <p class="text-sm">開啟後可配置 GPT-SoVITS 等語音服務，讓 AI 擁有語音能力</p>
                  </div>
                }
              </div>
              
              <!-- 🔧 P0-2: 固定底部保存欄 -->
              <div class="sticky bottom-0 z-10 mt-6 -mx-6 px-6 py-4 bg-slate-800/95 backdrop-blur-sm border-t border-slate-700/50 flex items-center justify-between rounded-b-xl">
                <div class="flex items-center gap-3 text-sm">
                  @if (aiService.isSaving()) {
                    <span class="flex items-center gap-2 text-cyan-400">
                      <span class="inline-block w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
                      保存中...
                    </span>
                  } @else if (aiService.justSaved()) {
                    <span class="flex items-center gap-2 text-emerald-400">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                      設置已保存
                    </span>
                  } @else if (aiService.isDirty()) {
                    <span class="flex items-center gap-2 text-amber-400">
                      <span class="w-2 h-2 bg-amber-400 rounded-full"></span>
                      有未保存的更改
                    </span>
                  } @else {
                    <span class="text-slate-500">模型配置自動同步到雲端</span>
                  }
                </div>
                <button (click)="saveModelTabSettings()"
                        [disabled]="aiService.isSaving()"
                        class="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-xl hover:from-cyan-400 hover:to-blue-400 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  @if (aiService.isSaving()) {
                    <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  } @else {
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
                  }
                  保存設置
                </button>
              </div>
            </div>
          }
          
          @case ('persona') {
            <!-- 🎭 AI 人格（融合：對話策略 + 智能規則 + 多角色） -->
            <div class="max-w-4xl mx-auto space-y-6">
              
              <!-- 人格模板選擇 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div class="flex items-center justify-between mb-6">
                  <h3 class="font-semibold text-white flex items-center gap-2">
                    <span>🎭</span> 選擇 AI 人格
                  </h3>
                  <button class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
                    + 自定義人格
                  </button>
                </div>
                
                <div class="grid grid-cols-4 gap-4">
                  @for (template of personaTemplates; track template.id) {
                    <button (click)="selectPersonaTemplate(template.id)"
                            class="p-5 rounded-xl text-center transition-all border-2"
                            [class.border-purple-500]="selectedPersonaTemplate() === template.id"
                            [class.bg-purple-500/10]="selectedPersonaTemplate() === template.id"
                            [class.border-transparent]="selectedPersonaTemplate() !== template.id"
                            [class.bg-slate-700/50]="selectedPersonaTemplate() !== template.id"
                            [class.hover:bg-slate-700]="selectedPersonaTemplate() !== template.id">
                      <div class="text-3xl mb-2">{{ template.icon }}</div>
                      <div class="font-medium"
                           [class.text-purple-400]="selectedPersonaTemplate() === template.id"
                           [class.text-white]="selectedPersonaTemplate() !== template.id">
                        {{ template.name }}
                      </div>
                      <div class="text-xs text-slate-400 mt-1">{{ template.description }}</div>
                    </button>
                  }
                </div>
              </div>
              
              <!-- 對話風格設定 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 class="font-semibold text-white mb-6 flex items-center gap-2">
                  <span>💬</span> 對話風格
                </h3>
                
                <div class="grid grid-cols-2 gap-6">
                  <!-- 左側：風格選擇 -->
                  <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-3">
                      @for (style of conversationStyles; track style.id) {
                        <button (click)="setStyle(style.id); markStrategyDirty()"
                                class="p-4 rounded-xl text-center transition-all border-2"
                                [class.border-purple-500]="currentStyle() === style.id"
                                [class.bg-purple-500/10]="currentStyle() === style.id"
                                [class.border-transparent]="currentStyle() !== style.id"
                                [class.bg-slate-700/50]="currentStyle() !== style.id">
                          <div class="text-2xl mb-1">{{ style.icon }}</div>
                          <div class="text-sm font-medium"
                               [class.text-purple-400]="currentStyle() === style.id"
                               [class.text-white]="currentStyle() !== style.id">
                            {{ style.label }}
                          </div>
                        </button>
                      }
                    </div>
                    
                    <!-- 回覆長度 -->
                    <div>
                      <label class="text-sm text-slate-400 block mb-2">回覆長度</label>
                      <div class="flex gap-2">
                        @for (len of ['short', 'medium', 'long']; track len) {
                          <button (click)="setResponseLength(len); markStrategyDirty()"
                                  class="flex-1 py-2 px-4 rounded-lg text-sm transition-colors"
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
                    <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer"
                           (click)="toggleEmoji(); markStrategyDirty()">
                      <div>
                        <div class="text-white text-sm">使用 Emoji 表情</div>
                        <div class="text-xs text-slate-400">在回覆中添加表情</div>
                      </div>
                      <input type="checkbox" [checked]="useEmoji()"
                             class="w-5 h-5 rounded text-purple-500 bg-slate-700 border-slate-600 pointer-events-none">
                    </label>
                  </div>
                  
                  <!-- 右側：自定義人設 -->
                  <div>
                    <label class="text-sm text-slate-400 block mb-2">自定義人設提示詞</label>
                    <textarea 
                      rows="6"
                      [value]="customPersona()"
                      (input)="onPersonaInput($event)"
                      placeholder="例如：你是一位專業的銷售顧問，具有5年行業經驗，擅長解答客戶疑問..."
                      class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 resize-none">
                    </textarea>
                    <p class="text-xs text-slate-500 mt-2">💡 提示：選擇人格模板會自動填充此項</p>
                  </div>
                </div>
              </div>
              
              <!-- 智能行為規則 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div class="flex items-center justify-between mb-6">
                  <h3 class="font-semibold text-white flex items-center gap-2">
                    <span>⚡</span> 智能行為
                    <span class="text-xs text-slate-500 font-normal">根據情況自動觸發相應動作</span>
                  </h3>
                </div>
                
                <div class="space-y-3">
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
                             (change)="toggleRule(rule.id)"
                             class="w-5 h-5 rounded text-purple-500 bg-slate-700 border-slate-600 cursor-pointer">
                    </label>
                  }
                </div>
                
                <button class="mt-4 w-full py-3 border border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white hover:border-purple-500 transition-colors">
                  + 添加自定義行為規則
                </button>
              </div>
              
              <!-- AI 預覽 -->
              <div class="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl border border-purple-500/30 p-6">
                <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
                  <span>💬</span> AI 回覆預覽
                </h3>
                <div class="bg-slate-900/50 rounded-xl p-4">
                  <div class="mb-3">
                    <span class="text-xs text-slate-500">用戶:</span>
                    <p class="text-slate-300">你們的服務多少錢？</p>
                  </div>
                  <div class="border-t border-slate-700 pt-3">
                    <span class="text-xs text-purple-400">AI ({{ getPersonaName() }}):</span>
                    <p class="text-white">{{ getPreviewResponse() }}</p>
                  </div>
                </div>
                <button (click)="regeneratePreview()"
                        class="mt-3 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
                  🔄 重新生成預覽
                </button>
              </div>
              
              <!-- 保存按鈕 -->
              <div class="flex justify-between items-center bg-slate-800/80 rounded-xl p-4 border border-slate-700/50 sticky bottom-4">
                <div class="text-sm text-slate-400">
                  @if (strategyDirty()) {
                    💡 修改後請記得保存
                  } @else {
                    ✓ 所有更改已保存
                  }
                </div>
                <div class="flex gap-3">
                  <button (click)="resetStrategy()"
                          class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors">
                    重置
                  </button>
                  <button (click)="savePersonaSettings()"
                          [disabled]="!strategyDirty() || isSavingStrategy()"
                          class="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    @if (isSavingStrategy()) {
                      <span class="animate-spin">⟳</span> 保存中...
                    } @else {
                      💾 保存人格設定
                    }
                  </button>
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
              
              <!-- 🆕 智能系統狀態面板 -->
              <div class="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-xl border border-cyan-500/30 p-6">
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <span class="text-2xl">🧠</span>
                    <h3 class="font-semibold text-white">AI 智能系統狀態</h3>
                    @if (autonomousModeEnabled()) {
                      <span class="px-2 py-0.5 text-xs bg-emerald-500/30 text-emerald-400 rounded-full">運行中</span>
                    } @else {
                      <span class="px-2 py-0.5 text-xs bg-slate-500/30 text-slate-400 rounded-full">已關閉</span>
                    }
                  </div>
                  <button (click)="goToSmartMarketing()"
                          class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 text-sm flex items-center gap-2">
                    <span>📊</span> 查看詳細統計
                  </button>
                </div>
                
                <div class="grid grid-cols-3 gap-4">
                  <!-- 記憶系統 -->
                  <div class="bg-slate-800/50 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-lg">💭</span>
                      <span class="text-sm font-medium text-white">對話記憶</span>
                    </div>
                    <div class="text-2xl font-bold text-cyan-400">{{ smartSystemStats().memories }}</div>
                    <div class="text-xs text-slate-400">條記憶</div>
                  </div>
                  
                  <!-- 標籤系統 -->
                  <div class="bg-slate-800/50 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-lg">🏷️</span>
                      <span class="text-sm font-medium text-white">客戶標籤</span>
                    </div>
                    <div class="text-2xl font-bold text-purple-400">{{ smartSystemStats().tags }}</div>
                    <div class="text-xs text-slate-400">個標籤</div>
                  </div>
                  
                  <!-- 情緒分析 -->
                  <div class="bg-slate-800/50 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-lg">😊</span>
                      <span class="text-sm font-medium text-white">情緒分析</span>
                    </div>
                    <div class="text-2xl font-bold text-orange-400">{{ smartSystemStats().emotions }}</div>
                    <div class="text-xs text-slate-400">次分析</div>
                  </div>
                  
                  <!-- 工作流 -->
                  <div class="bg-slate-800/50 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-lg">🔄</span>
                      <span class="text-sm font-medium text-white">自動化流程</span>
                    </div>
                    <div class="text-2xl font-bold text-emerald-400">{{ smartSystemStats().workflows }}</div>
                    <div class="text-xs text-slate-400">次執行</div>
                  </div>
                  
                  <!-- 跟進任務 -->
                  <div class="bg-slate-800/50 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-lg">⏰</span>
                      <span class="text-sm font-medium text-white">待跟進</span>
                    </div>
                    <div class="text-2xl font-bold text-amber-400">{{ smartSystemStats().followups }}</div>
                    <div class="text-xs text-slate-400">個任務</div>
                  </div>
                  
                  <!-- 知識學習 -->
                  <div class="bg-slate-800/50 rounded-lg p-4">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-lg">📚</span>
                      <span class="text-sm font-medium text-white">知識庫</span>
                    </div>
                    <div class="text-2xl font-bold text-blue-400">{{ smartSystemStats().knowledge }}</div>
                    <div class="text-xs text-slate-400">條學習</div>
                  </div>
                </div>
                
                <div class="mt-4 pt-4 border-t border-slate-700/50">
                  <button (click)="refreshSmartSystemStats()" 
                          class="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-sm transition-colors">
                    🔄 刷新統計
                  </button>
                </div>
              </div>
            </div>
          }
          @case ('knowledge') {
            <!-- 知识大脑：总览 | 知识管理 | 知识缺口 -->
            <div class="max-w-5xl mx-auto space-y-4">
              <div class="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
                <button (click)="selectKnowledgeSubTab('overview')"
                        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        [class.bg-pink-500/30]="knowledgeSubTab() === 'overview'"
                        [class.text-white]="knowledgeSubTab() === 'overview'"
                        [class.text-slate-400]="knowledgeSubTab() !== 'overview'"
                        [class.hover:bg-slate-700/50]="knowledgeSubTab() !== 'overview'">
                  📊 总览
                </button>
                <button (click)="selectKnowledgeSubTab('manage')"
                        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        [class.bg-pink-500/30]="knowledgeSubTab() === 'manage'"
                        [class.text-white]="knowledgeSubTab() === 'manage'"
                        [class.text-slate-400]="knowledgeSubTab() !== 'manage'"
                        [class.hover:bg-slate-700/50]="knowledgeSubTab() !== 'manage'">
                  📝 知识管理
                </button>
                <button (click)="selectKnowledgeSubTab('gaps')"
                        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        [class.bg-pink-500/30]="knowledgeSubTab() === 'gaps'"
                        [class.text-white]="knowledgeSubTab() === 'gaps'"
                        [class.text-slate-400]="knowledgeSubTab() !== 'gaps'"
                        [class.hover:bg-slate-700/50]="knowledgeSubTab() !== 'gaps'">
                  ❓ 知识缺口
                </button>
              </div>
              @switch (knowledgeSubTab()) {
                @case ('overview') {
                  <div class="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-xl border border-cyan-500/30 p-6">
                    <h3 class="font-semibold text-white mb-4 flex items-center gap-2"><span>🧠</span> 知识大脑总览</h3>
                    <div class="grid grid-cols-3 gap-4">
                      <div class="bg-slate-800/50 rounded-lg p-4">
                        <div class="text-sm text-slate-400 mb-1">知識庫</div>
                        <div class="text-2xl font-bold text-blue-400">{{ smartSystemStats().knowledge }}</div>
                        <div class="text-xs text-slate-500">條學習</div>
                      </div>
                      <div class="bg-slate-800/50 rounded-lg p-4">
                        <div class="text-sm text-slate-400 mb-1">對話記憶</div>
                        <div class="text-2xl font-bold text-cyan-400">{{ smartSystemStats().memories }}</div>
                        <div class="text-xs text-slate-500">條記憶</div>
                      </div>
                      <div class="bg-slate-800/50 rounded-lg p-4">
                        <div class="text-sm text-slate-400 mb-1">客戶標籤</div>
                        <div class="text-2xl font-bold text-purple-400">{{ smartSystemStats().tags }}</div>
                        <div class="text-xs text-slate-500">個標籤</div>
                      </div>
                    </div>
                    <button (click)="refreshSmartSystemStats()" class="mt-4 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-sm">🔄 刷新統計</button>
                  </div>
                }
                @case ('manage') {
                  <app-knowledge-manage />
                }
                @case ('gaps') {
                  <app-knowledge-gaps />
                }
              }
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
export class AICenterComponent implements OnInit {
  aiService = inject(AICenterService);
  private dialogService = inject(DialogService);
  private toastService = inject(ToastService);
  private ipcService = inject(ElectronIpcService);  // 🔊 P1: 用於 TTS
  private navBridge = inject(NavBridgeService);
  
  /** 由路由傳入：知识大脑总览/知识管理/知识缺口 對應 knowledge Tab + knowledgeSubTab */
  initialTab = input<AITab | undefined>(undefined);
  initialKnowledgeSub = input<KnowledgeSubTab | undefined>(undefined);
  
  activeTab = signal<AITab>('models');  // 🆕 Phase 3-1: 默認顯示模型配置
  knowledgeSubTab = signal<KnowledgeSubTab>('overview');
  
  // 🔧 Phase9-5: 視圖名稱 → Tab 映射（NavBridge 驅動）
  private static readonly VIEW_TAB_MAP: Record<string, AITab> = {
    'ai-center': 'quick',
    'ai-engine': 'quick',
    'ai-models': 'models',
    'ai-persona': 'persona',
    'ai-brain': 'quick',
    'knowledge-brain': 'knowledge',
    'knowledge-manage': 'knowledge',
    'knowledge-gaps': 'knowledge',
  };
  showAddModel = signal(false);
  
  // 快速設置狀態
  autoChatEnabled = signal(false);
  autoChatMode = signal<'full' | 'semi' | 'assist'>('full');
  autoGreetingEnabled = signal(true);
  autoReplyEnabled = signal(true);
  senderAccounts = signal<{phone: string; username?: string; avatar?: string; sentToday?: number; dailyLimit?: number}[]>([]);
  
  // 🆕 AI 自主模式
  autonomousModeEnabled = signal(false);
  
  // 🆕 智能系統統計
  smartSystemStats = signal({
    memories: 0,
    tags: 0,
    emotions: 0,
    workflows: 0,
    followups: 0,
    knowledge: 0
  });
  
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
  
  // 🔊 P1: TTS 語音配置
  ttsEnabled = false;
  ttsEndpoint = 'http://localhost:9881';
  ttsConnected = signal(false);
  isTestingTts = signal(false);
  ttsLatency = signal(0);
  
  // 模型用途分配保存狀態
  isSavingUsage = signal(false);
  usageSaved = signal(false);
  private usageSaveTimeout: any = null;

  // 🔧 P0-2: 引擎概覽頁保存狀態
  quickSaving = signal(false);
  quickSaved = signal(false);
  
  // 🔧 對話策略狀態
  strategyDirty = signal(false);
  strategySaved = signal(false);
  isSavingStrategy = signal(false);
  customPersona = signal('');
  private originalStrategy: any = null;

  private router = inject(Router);
  
  // 🆕 Phase 3-1: 重新定義標籤為「智能引擎設置」焦點；🔧 知识大脑獨立 Tab
  tabs = [
    { id: 'quick' as const, icon: '🚀', label: '引擎概覽' },
    { id: 'models' as const, icon: '🤖', label: '模型配置' },
    { id: 'persona' as const, icon: '🎭', label: '人格風格' },
    { id: 'knowledge' as const, icon: '🧠', label: '知识大脑' },
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
  
  // 🆕 行業模板
  industryTemplates = [
    { id: 'payment', name: '💳 跨境支付', description: 'U兌換、代收代付、匯款服務' },
    { id: 'ecommerce', name: '🛒 電商零售', description: '商品銷售、訂單查詢、售後服務' },
    { id: 'education', name: '📖 在線教育', description: '課程諮詢、學習輔導、報名流程' },
    { id: 'realestate', name: '🏠 房產中介', description: '房源推薦、看房預約、交易流程' },
    { id: 'finance', name: '💰 金融理財', description: '投資諮詢、風險評估、產品介紹' },
    { id: 'healthcare', name: '🏥 醫療健康', description: '預約掛號、健康諮詢、用藥指導' },
    { id: 'travel', name: '✈️ 旅遊服務', description: '行程規劃、訂票酒店、導遊服務' },
    { id: 'legal', name: '⚖️ 法律諮詢', description: '法律問答、案件諮詢、文書服務' }
  ];
  
  // 🆕 知識效果統計
  knowledgeStats = computed(() => {
    const kbs = this.knowledgeBases();
    const totalItems = kbs.reduce((sum, kb) => sum + kb.items.length, 0);
    
    // 計算各分類數量
    const categoryCount: Record<string, number> = {};
    kbs.forEach(kb => {
      kb.items.forEach(item => {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      });
    });
    
    const topCategory = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '-';
    
    const categoryNames: Record<string, string> = {
      product: '產品', faq: '問答', sales: '話術', objection: '異議', custom: '其他'
    };
    
    return {
      totalItems,
      usedCount: Math.floor(totalItems * 0.7),  // TODO: 從後端獲取真實數據
      hitRate: totalItems > 0 ? 68 : 0,  // TODO: 從後端獲取真實數據
      topCategory: categoryNames[topCategory] || topCategory
    };
  });
  
  defaultRules = [
    { id: 'purchase', icon: '🛒', name: '購買意向明確 → 通知人工', description: '當識別到購買意向時立即通知', isActive: true },
    { id: 'no-response', icon: '⏰', name: '連續3次不回覆 → 暫停', description: '暫停對話，3天後再跟進', isActive: true },
    { id: 'negative', icon: '😔', name: '負面情緒 → 轉人工', description: '檢測到負面情緒時轉人工處理', isActive: true },
    { id: 'price', icon: '💰', name: '價格敏感 → 推送優惠', description: '詢問價格時推送優惠方案', isActive: false }
  ];
  
  // 🆕 Phase2: AI 人格模板
  personaTemplates = [
    { id: 'friendly', icon: '😊', name: '友好助手', description: '親切、耐心、樂於助人', prompt: '你是一位友好的客服助手，說話親切溫暖，樂於幫助客戶解決問題。' },
    { id: 'professional', icon: '👔', name: '專業顧問', description: '專業、嚴謹、值得信賴', prompt: '你是一位專業的銷售顧問，具有豐富的行業經驗，回答問題專業嚴謹。' },
    { id: 'enthusiastic', icon: '🎉', name: '熱情銷售', description: '積極、熱情、善於推薦', prompt: '你是一位充滿熱情的銷售代表，善於發現客戶需求並積極推薦合適的產品。' },
    { id: 'efficient', icon: '⚡', name: '高效簡潔', description: '直接、簡潔、效率優先', prompt: '你是一位高效的客服，回答問題直接明了，不繞彎子，節省客戶時間。' }
  ];
  
  selectedPersonaTemplate = signal<string>('friendly');
  previewResponse = signal<string>('您好呀！感謝您的諮詢 😊 我們的服務價格根據您的具體需求而定，請問您主要想了解哪方面的服務呢？');
  
  // 計算屬性 - 🔧 FIX: 從 service 的公開屬性獲取知識庫數據
  knowledgeBases = computed(() => this.aiService.knowledgeBases());
  activeKbId = computed(() => this.aiService.activeKnowledgeBaseId());
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
    // 🔧 測試狀態由 service 管理
    this.aiService.testModelConnection(model.id);
  }
  
  editModel(model: AIModelConfig) {
    // TODO: 實現編輯功能
  }
  
  async saveNewModel() {
    if (!this.newModelName || !this.newModelApiKey) return;
    
    await this.aiService.addModel({
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
  
  async saveLocalModel() {
    if (!this.localModelEndpoint || !this.localModelName) {
      alert('請填寫 API 端點和模型名稱');
      return;
    }
    
    await this.aiService.addLocalModel({
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
  
  // ========== 🔊 P1: TTS 語音方法 ==========
  
  saveTtsSettings() {
    // 🔧 P0-2: 標記為 dirty，等用戶點保存按鈕一起提交
    this.aiService.markSettingsDirty();
    // 兼容 IPC
    this.ipcService.send('save-ai-settings', {
      ttsEndpoint: this.ttsEndpoint,
      ttsEnabled: this.ttsEnabled
    });
  }
  
  async testTtsConnection() {
    if (!this.ttsEndpoint) {
      this.toastService.error('請先填寫 TTS 服務端點');
      return;
    }
    
    this.isTestingTts.set(true);
    const startTime = Date.now();
    
    // 監聽測試結果
    const listener = (data: any) => {
      this.isTestingTts.set(false);
      if (data.success) {
        this.ttsConnected.set(true);
        this.ttsLatency.set(Date.now() - startTime);
        this.toastService.success('✓ TTS 服務連接成功！');
      } else {
        this.ttsConnected.set(false);
        this.toastService.error(`TTS 連接失敗: ${data.error || '未知錯誤'}`);
      }
    };
    
    this.ipcService.once('tts-test-result', listener);
    this.ipcService.send('test-tts-service', { endpoint: this.ttsEndpoint });
    
    // 超時保護
    setTimeout(() => {
      if (this.isTestingTts()) {
        this.isTestingTts.set(false);
        this.toastService.error('TTS 測試超時');
      }
    }, 15000);
  }
  
  testTtsVoice() {
    // 監聽語音結果
    const listener = (data: any) => {
      if (data.success && data.audio) {
        // 播放 Base64 音頻
        const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
        audio.play().catch(e => {
          this.toastService.error(`播放失敗: ${e.message}`);
        });
      } else {
        this.toastService.error(`語音生成失敗: ${data.error || '未知錯誤'}`);
      }
    };
    
    this.ipcService.once('tts-result', listener);
    this.ipcService.send('text-to-speech', {
      endpoint: this.ttsEndpoint,
      text: '你好，這是一段語音測試。',
      voice: ''
    });
    
    this.toastService.info('正在生成試聽語音...');
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
    // 🔧 FIX: 使用 DialogService 替代 window.prompt()（Electron 不支持 prompt）
    this.dialogService.prompt({
      title: '新建知識庫',
      message: '請輸入知識庫名稱，用於組織和管理 AI 回覆的業務知識。',
      placeholder: '例如：產品知識庫、常見問答',
      confirmText: '創建',
      cancelText: '取消',
      validator: (value) => {
        if (!value.trim()) return '請輸入名稱';
        if (value.length > 50) return '名稱不能超過 50 個字符';
        return null;
      },
      onConfirm: (name) => {
        this.aiService.addKnowledgeBase(name);
      }
    });
  }
  
  setActiveKb(id: string) {
    this.aiService.setActiveKnowledgeBase(id);
  }
  
  editKb(kb: KnowledgeBase) {
    // 🔧 實現編輯知識庫功能
    this.dialogService.prompt({
      title: '編輯知識庫',
      message: '修改知識庫名稱',
      placeholder: '請輸入新名稱',
      defaultValue: kb.name,
      confirmText: '保存',
      cancelText: '取消',
      validator: (value) => {
        if (!value.trim()) return '名稱不能為空';
        if (value.length > 50) return '名稱不能超過 50 個字符';
        return null;
      },
      onConfirm: (newName) => {
        this.aiService.updateKnowledgeBase(kb.id, { name: newName });
        this.toastService.success(`知識庫已更新為「${newName}」`);
      }
    });
  }
  
  deleteKb(kb: KnowledgeBase) {
    // 🔧 刪除知識庫（帶確認）
    this.dialogService.confirm({
      title: '確認刪除',
      message: `確定要刪除知識庫「${kb.name}」嗎？此操作無法撤銷。`,
      confirmText: '刪除',
      cancelText: '取消',
      type: 'danger',
      onConfirm: () => {
        this.aiService.deleteKnowledgeBase(kb.id);
        this.toastService.success(`知識庫「${kb.name}」已刪除`);
      }
    });
  }
  
  deleteKnowledgeItem(kbId: string, itemId: string) {
    // 🔧 刪除知識條目
    this.dialogService.confirm({
      title: '確認刪除',
      message: '確定要刪除此知識條目嗎？',
      confirmText: '刪除',
      cancelText: '取消',
      type: 'danger',
      onConfirm: () => {
        this.aiService.deleteKnowledgeItem(kbId, itemId);
        this.toastService.success('知識條目已刪除');
      }
    });
  }
  
  addQuickContent(type: 'product' | 'faq' | 'sales' | 'objection') {
    // 🔧 快速添加知識內容
    const typeConfig = {
      product: { title: '添加產品知識', placeholder: '例如：我們的產品支持 24 小時客服...', icon: '📦' },
      faq: { title: '添加常見問答', placeholder: '例如：Q: 如何付款？A: 支持微信、支付寶...', icon: '❓' },
      sales: { title: '添加銷售話術', placeholder: '例如：當客戶說太貴時，可以回覆...', icon: '🎯' },
      objection: { title: '添加異議處理', placeholder: '例如：客戶擔心質量時，強調售後保障...', icon: '💬' }
    };
    
    const config = typeConfig[type];
    const activeKbId = this.activeKbId();
    
    if (!activeKbId) {
      this.toastService.warning('請先選擇或創建一個知識庫');
      return;
    }
    
    this.dialogService.prompt({
      title: `${config.icon} ${config.title}`,
      message: '輸入知識內容，AI 將在回覆時參考這些信息。',
      placeholder: config.placeholder,
      inputType: 'textarea',
      confirmText: '添加',
      cancelText: '取消',
      validator: (value) => {
        if (!value.trim()) return '請輸入內容';
        if (value.length > 2000) return '內容不能超過 2000 個字符';
        return null;
      },
      onConfirm: (content) => {
        this.aiService.addKnowledgeItem(activeKbId, {
          title: `${config.icon} ${type.toUpperCase()}`,
          content: content,
          category: type
        });
        this.toastService.success('知識內容已添加');
      }
    });
  }
  
  // 🆕 AI 自動生成知識庫
  openAIGenerateDialog() {
    const activeKbId = this.activeKbId();
    
    if (!activeKbId) {
      this.toastService.warning('請先選擇或創建一個知識庫');
      return;
    }
    
    this.dialogService.prompt({
      title: '🤖 AI 自動生成知識庫',
      message: '請簡單描述您的業務（1-3 句話），AI 將自動生成產品知識、常見問答、銷售話術等內容。',
      placeholder: '例如：我們是做跨境支付的，主要服務是 U 兌換和代收代付，支持微信、支付寶收款',
      inputType: 'textarea',
      confirmText: '開始生成',
      cancelText: '取消',
      validator: (value) => {
        if (!value.trim()) return '請輸入業務描述';
        if (value.length < 10) return '描述太短，請提供更多信息';
        if (value.length > 500) return '描述不能超過 500 個字符';
        return null;
      },
      onConfirm: (businessDesc) => {
        this.generateKnowledgeWithAI(activeKbId, businessDesc);
      }
    });
  }
  
  private async generateKnowledgeWithAI(kbId: string, businessDesc: string) {
    this.toastService.info('🤖 AI 正在生成知識庫，請稍候...');
    
    // 調用後端 AI 生成
    this.aiService.generateKnowledgeBase(kbId, businessDesc);
  }
  
  // 🆕 批量導入知識
  openBatchImportDialog() {
    const activeKbId = this.activeKbId();
    
    if (!activeKbId) {
      this.toastService.warning('請先選擇或創建一個知識庫');
      return;
    }
    
    this.dialogService.prompt({
      title: '📋 批量導入知識',
      message: `請貼上您的知識內容，支持以下格式：
• 每行一條知識
• Q: 問題 / A: 答案 格式
• 【產品知識】【常見問答】等分類標籤`,
      placeholder: `示例：
【產品知識】
我們的服務支持 24 小時在線客服
最低兌換金額 100U，最高無限制

【常見問答】
Q: 多久到賬？
A: 通常 5-30 分鐘到賬

Q: 支持哪些付款方式？
A: 支持微信、支付寶、銀行卡`,
      inputType: 'textarea',
      confirmText: '導入',
      cancelText: '取消',
      validator: (value) => {
        if (!value.trim()) return '請輸入要導入的內容';
        if (value.length < 10) return '內容太短';
        return null;
      },
      onConfirm: (content) => {
        this.importBatchKnowledge(activeKbId, content);
      }
    });
  }
  
  private importBatchKnowledge(kbId: string, content: string) {
    // 解析並導入知識
    const items = this.parseBatchContent(content);
    
    if (items.length === 0) {
      this.toastService.error('無法識別知識內容，請檢查格式');
      return;
    }
    
    // 批量添加
    items.forEach(item => {
      this.aiService.addKnowledgeItem(kbId, item);
    });
    
    this.toastService.success(`成功導入 ${items.length} 條知識`);
  }
  
  private parseBatchContent(content: string): Array<{ title: string; content: string; category: string }> {
    const items: Array<{ title: string; content: string; category: string }> = [];
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
    
    let currentCategory = 'custom';
    let currentQ = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 檢測分類標籤
      if (line.match(/【產品知識】|【产品知识】/)) {
        currentCategory = 'product';
        continue;
      } else if (line.match(/【常見問答】|【常见问答】|【FAQ】/i)) {
        currentCategory = 'faq';
        continue;
      } else if (line.match(/【銷售話術】|【销售话术】/)) {
        currentCategory = 'sales';
        continue;
      } else if (line.match(/【異議處理】|【异议处理】/)) {
        currentCategory = 'objection';
        continue;
      }
      
      // 檢測 Q&A 格式
      if (line.match(/^Q[:：]/i)) {
        currentQ = line.replace(/^Q[:：]\s*/i, '');
        continue;
      } else if (line.match(/^A[:：]/i) && currentQ) {
        const answer = line.replace(/^A[:：]\s*/i, '');
        items.push({
          title: `Q: ${currentQ}`,
          content: `A: ${answer}`,
          category: 'faq'
        });
        currentQ = '';
        continue;
      }
      
      // 普通行作為獨立知識
      if (line.length > 5 && !line.startsWith('#') && !line.startsWith('//')) {
        items.push({
          title: line.substring(0, 30) + (line.length > 30 ? '...' : ''),
          content: line,
          category: currentCategory
        });
      }
    }
    
    return items;
  }
  
  // 🆕 打開行業模板選擇器
  openTemplateSelector() {
    const activeKbId = this.activeKbId();
    
    if (!activeKbId) {
      this.toastService.warning('請先選擇或創建一個知識庫');
      return;
    }
    
    // 創建模板選擇列表
    const templateList = this.industryTemplates.map(t => `${t.name}\n  ${t.description}`).join('\n\n');
    
    this.dialogService.prompt({
      title: '📚 選擇行業模板',
      message: `選擇一個行業模板，系統將自動生成對應的知識庫內容：\n\n可選模板：\n${this.industryTemplates.map(t => t.name).join('、')}`,
      placeholder: '輸入模板名稱，如：跨境支付、電商零售',
      confirmText: '使用模板',
      cancelText: '取消',
      validator: (value) => {
        const template = this.industryTemplates.find(t => 
          t.name.includes(value) || t.id === value.toLowerCase()
        );
        if (!template) return '請輸入有效的模板名稱';
        return null;
      },
      onConfirm: (input) => {
        const template = this.industryTemplates.find(t => 
          t.name.includes(input) || t.id === input.toLowerCase()
        );
        if (template) {
          this.applyIndustryTemplate(activeKbId, template.id);
        }
      }
    });
  }
  
  private applyIndustryTemplate(kbId: string, templateId: string) {
    this.toastService.info('正在應用行業模板...');
    this.aiService.applyIndustryTemplate(kbId, templateId);
  }
  
  // 🆕 從聊天記錄學習
  learnFromChatHistory() {
    const activeKbId = this.activeKbId();
    
    if (!activeKbId) {
      this.toastService.warning('請先選擇或創建一個知識庫');
      return;
    }
    
    this.dialogService.confirm({
      title: '💬 從聊天記錄學習',
      message: '系統將分析近 7 天的聊天記錄，自動提取優質回覆添加到知識庫。\n\n此過程可能需要幾分鐘，是否繼續？',
      confirmText: '開始學習',
      cancelText: '取消',
      onConfirm: () => {
        this.toastService.info('正在分析聊天記錄...');
        this.aiService.learnFromChatHistory(activeKbId);
      }
    });
  }
  
  // 🆕 導出知識庫
  exportKnowledgeBase() {
    const activeKb = this.knowledgeBases().find(kb => kb.id === this.activeKbId());
    
    if (!activeKb) {
      this.toastService.warning('請先選擇一個知識庫');
      return;
    }
    
    if (activeKb.items.length === 0) {
      this.toastService.warning('知識庫為空，無法導出');
      return;
    }
    
    // 生成導出內容
    const exportContent = this.generateExportContent(activeKb);
    
    // 複製到剪貼板
    navigator.clipboard.writeText(exportContent).then(() => {
      this.toastService.success(`已複製 ${activeKb.items.length} 條知識到剪貼板`);
    }).catch(() => {
      // 如果剪貼板失敗，顯示內容
      this.dialogService.prompt({
        title: '📤 導出知識庫',
        message: '請複製以下內容：',
        defaultValue: exportContent,
        inputType: 'textarea',
        confirmText: '關閉',
        cancelText: ''
      });
    });
  }
  
  private generateExportContent(kb: KnowledgeBase): string {
    const lines: string[] = [
      `# 知識庫: ${kb.name}`,
      `# 導出時間: ${new Date().toLocaleString()}`,
      `# 條目數量: ${kb.items.length}`,
      ''
    ];
    
    const categories = ['product', 'faq', 'sales', 'objection', 'custom'];
    const categoryNames: Record<string, string> = {
      product: '【產品知識】',
      faq: '【常見問答】',
      sales: '【銷售話術】',
      objection: '【異議處理】',
      custom: '【其他】'
    };
    
    categories.forEach(cat => {
      const items = kb.items.filter(i => i.category === cat);
      if (items.length > 0) {
        lines.push(categoryNames[cat] || `【${cat}】`);
        items.forEach(item => {
          if (cat === 'faq') {
            lines.push(item.title);
            lines.push(item.content);
          } else {
            lines.push(item.content);
          }
          lines.push('');
        });
      }
    });
    
    return lines.join('\n');
  }
  
  setStyle(style: ConversationStyle) {
    this.aiService.updateConversationStrategy({ style });
  }
  
  // 🔧 對話策略方法
  setResponseLength(length: string) {
    this.aiService.updateConversationStrategy({ responseLength: length as 'short' | 'medium' | 'long' });
  }
  
  toggleEmoji() {
    this.aiService.updateConversationStrategy({ useEmoji: !this.useEmoji() });
  }
  
  onPersonaInput(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    this.customPersona.set(textarea.value);
    this.markStrategyDirty();
  }
  
  markStrategyDirty() {
    this.strategyDirty.set(true);
    this.strategySaved.set(false);
    
    // 同時保存到 localStorage 作為暫存
    this.saveStrategyToLocalStorage();
  }
  
  saveStrategyToLocalStorage() {
    const strategy = {
      style: this.currentStyle(),
      responseLength: this.responseLength(),
      useEmoji: this.useEmoji(),
      customPersona: this.customPersona()
    };
    localStorage.setItem('ai_strategy_draft', JSON.stringify(strategy));
  }
  
  loadStrategyFromLocalStorage() {
    // 先嘗試載入草稿
    const draft = localStorage.getItem('ai_strategy_draft');
    if (draft) {
      try {
        const strategy = JSON.parse(draft);
        if (strategy.customPersona) {
          this.customPersona.set(strategy.customPersona);
        }
        // 標記為有未保存的更改
        this.strategyDirty.set(true);
      } catch (e) {
        console.error('載入策略草稿失敗:', e);
      }
    }
    
    // 載入已保存的設定
    const saved = localStorage.getItem('ai_strategy_saved');
    if (saved) {
      try {
        const strategy = JSON.parse(saved);
        this.originalStrategy = strategy;
        if (strategy.customPersona && !draft) {
          this.customPersona.set(strategy.customPersona);
        }
        // 應用到服務
        this.aiService.updateConversationStrategy(strategy);
      } catch (e) {
        console.error('載入策略設定失敗:', e);
      }
    }
  }
  
  async saveStrategySettings() {
    this.isSavingStrategy.set(true);
    
    const strategy = {
      style: this.currentStyle(),
      responseLength: this.responseLength(),
      useEmoji: this.useEmoji(),
      customPersona: this.customPersona()
    };
    
    try {
      // 保存到後端
      await this.aiService.saveConversationStrategyToBackend(strategy);
      
      // 保存到 localStorage（作為持久化備份）
      localStorage.setItem('ai_strategy_saved', JSON.stringify(strategy));
      
      // 清除草稿
      localStorage.removeItem('ai_strategy_draft');
      
      this.strategyDirty.set(false);
      this.strategySaved.set(true);
      this.originalStrategy = strategy;
      
      // 3 秒後隱藏「已保存」提示
      setTimeout(() => this.strategySaved.set(false), 3000);
    } catch (error) {
      console.error('保存策略失敗:', error);
      alert('保存失敗，請重試');
    } finally {
      this.isSavingStrategy.set(false);
    }
  }
  
  resetStrategy() {
    if (this.originalStrategy) {
      this.aiService.updateConversationStrategy(this.originalStrategy);
      this.customPersona.set(this.originalStrategy.customPersona || '');
    } else {
      // 重置為默認值
      this.aiService.updateConversationStrategy({
        style: 'friendly',
        responseLength: 'medium',
        useEmoji: true
      });
      this.customPersona.set('');
    }
    
    localStorage.removeItem('ai_strategy_draft');
    this.strategyDirty.set(false);
  }
  
  // ========== 快速設置方法 ==========
  
  toggleAutoChat() {
    this.autoChatEnabled.update(v => !v);
    // 🔧 FIX: 自動保存到後端
    this.saveQuickSettings(false);
  }
  
  // 🆕 切換 AI 自主模式
  toggleAutonomousMode() {
    const newValue = !this.autonomousModeEnabled();
    this.autonomousModeEnabled.set(newValue);
    
    // 保存到 localStorage
    localStorage.setItem('ai_autonomous_mode', String(newValue));
    
    // 發送到後端
    if ((window as any).electronAPI?.send) {
      (window as any).electronAPI.send('set-autonomous-mode', { enabled: newValue });
    }
    
    this.toastService.success(newValue ? '🧠 AI 自主模式已啟用' : 'AI 自主模式已關閉');
    
    // 刷新統計
    if (newValue) {
      this.refreshSmartSystemStats();
    }
  }
  
  // 🆕 P1-2: 導航到智能營銷中心
  goToSmartMarketing() {
    // 使用 Angular Router 或 IPC 導航
    if ((window as any).electronAPI?.send) {
      (window as any).electronAPI.send('navigate-to', { path: '/smart-marketing' });
    }
    // 同時嘗試使用 URL 導航（作為備選）
    window.location.hash = '#/smart-marketing';
  }
  
  // 🆕 刷新智能系統統計
  refreshSmartSystemStats() {
    // 發送請求到後端獲取統計
    if ((window as any).electronAPI?.send) {
      (window as any).electronAPI.send('get-smart-system-stats', {});
    }
    
    // 監聯回調
    const handler = (event: CustomEvent) => {
      const stats = event.detail || {};
      this.smartSystemStats.set({
        memories: stats.memories || 0,
        tags: stats.tags || 0,
        emotions: stats.emotions || 0,
        workflows: stats.workflows || 0,
        followups: stats.followups || 0,
        knowledge: stats.knowledge || 0
      });
    };
    
    window.addEventListener('smart-system-stats', handler as EventListener, { once: true });
    
    this.toastService.success('正在刷新統計...');
  }
  
  setAutoChatMode(mode: 'full' | 'semi' | 'assist') {
    this.autoChatMode.set(mode);
    // 🔧 FIX: 自動保存到後端
    this.saveQuickSettings(false);
  }
  
  toggleAutoGreeting() {
    this.autoGreetingEnabled.update(v => !v);
    // 🔧 FIX: 自動保存到後端
    this.saveQuickSettings(false);
  }
  
  toggleAutoReply() {
    this.autoReplyEnabled.update(v => !v);
    // 🔧 FIX: 自動保存到後端
    this.saveQuickSettings(false);
  }
  
  async saveQuickSettings(showAlert = true) {
    // 🔧 P0-2: REST API 持久化 + localStorage 雙寫
    const settings = {
      auto_chat_enabled: this.autoChatEnabled() ? 1 : 0,
      auto_chat_mode: this.autoChatMode(),
      auto_greeting: this.autoGreetingEnabled() ? 1 : 0,
      auto_reply: this.autoReplyEnabled() ? 1 : 0
    };
    
    // localStorage 仍保留（離線可用 + 即時讀取）
    localStorage.setItem('ai_auto_chat_enabled', String(this.autoChatEnabled()));
    localStorage.setItem('ai_auto_chat_mode', this.autoChatMode());
    localStorage.setItem('ai_auto_greeting', String(this.autoGreetingEnabled()));
    localStorage.setItem('ai_auto_reply', String(this.autoReplyEnabled()));
    
    if (showAlert) {
      this.quickSaving.set(true);
      this.quickSaved.set(false);
    }
    
    // REST API 保存到後端（用戶級持久化）
    const ok = await this.aiService.saveQuickTabSettings(settings);
    
    if (showAlert) {
      this.quickSaving.set(false);
      if (ok) {
        this.quickSaved.set(true);
        setTimeout(() => this.quickSaved.set(false), 3000);
      }
    }
    
    // 兼容：仍發送 window 事件
    window.dispatchEvent(new CustomEvent('save-ai-settings', { detail: settings }));
  }
  
  /**
   * 🔧 P0-2: 模型配置頁「保存設置」按鈕
   */
  async saveModelTabSettings() {
    const extraSettings: Record<string, any> = {
      tts_enabled: this.ttsEnabled ? 1 : 0,
      tts_endpoint: this.ttsEndpoint
    };
    await this.aiService.saveAllModelTabSettings(extraSettings);
  }

  loadQuickSettings() {
    // 先從 localStorage 加載（秒開）
    const enabled = localStorage.getItem('ai_auto_chat_enabled');
    const mode = localStorage.getItem('ai_auto_chat_mode') as 'full' | 'semi' | 'assist' | null;
    const greeting = localStorage.getItem('ai_auto_greeting');
    const reply = localStorage.getItem('ai_auto_reply');
    const autonomous = localStorage.getItem('ai_autonomous_mode');
    
    if (enabled !== null) this.autoChatEnabled.set(enabled === 'true');
    if (mode) this.autoChatMode.set(mode);
    if (greeting !== null) this.autoGreetingEnabled.set(greeting === 'true');
    if (reply !== null) this.autoReplyEnabled.set(reply === 'true');
    if (autonomous !== null) this.autonomousModeEnabled.set(autonomous === 'true');
    
    // 🔧 P0-2: 監聽 REST 加載的設置（覆蓋 localStorage）
    window.addEventListener('ai-settings-loaded', ((e: CustomEvent) => {
      const s = e.detail;
      if (s.auto_chat_enabled !== undefined) this.autoChatEnabled.set(Number(s.auto_chat_enabled) === 1);
      if (s.auto_chat_mode) this.autoChatMode.set(s.auto_chat_mode);
      if (s.auto_greeting !== undefined) this.autoGreetingEnabled.set(Number(s.auto_greeting) === 1);
      if (s.auto_reply !== undefined) this.autoReplyEnabled.set(Number(s.auto_reply) === 1);
      if (s.tts_enabled !== undefined) this.ttsEnabled = Number(s.tts_enabled) === 1;
      if (s.tts_endpoint) this.ttsEndpoint = s.tts_endpoint;
    }) as EventListener);
  }
  
  constructor() {
    // 路由切換時同步 Tab（知识大脑 总览/知识管理/知识缺口）
    effect(() => {
      const tab = this.initialTab();
      const sub = this.initialKnowledgeSub();
      if (tab) {
        this.activeTab.set(tab);
        if (tab === 'knowledge' && sub) this.knowledgeSubTab.set(sub);
      }
    });
  }

  /** Tab 切換並同步 URL（支持刷新、分享、前進後退） */
  selectTab(tabId: AITab): void {
    this.activeTab.set(tabId);
    if (tabId === 'knowledge') {
      this.router.navigate(['/ai-engine/overview'], { replaceUrl: true });
    } else if (tabId === 'quick') {
      this.router.navigate(['/ai-engine'], { replaceUrl: true });
    } else {
      this.router.navigate(['/ai-engine'], { queryParams: { tab: tabId }, replaceUrl: true });
    }
  }

  /** 知识大脑子 Tab 切換並同步 URL */
  selectKnowledgeSubTab(subId: KnowledgeSubTab): void {
    this.knowledgeSubTab.set(subId);
    const path = subId === 'overview' ? '/ai-engine/overview' : subId === 'manage' ? '/ai-engine/knowledge' : '/ai-engine/gaps';
    this.router.navigate([path], { replaceUrl: true });
  }

  ngOnInit() {
    this.loadQuickSettings();
    this.loadSenderAccounts();
    this.loadStrategyFromLocalStorage();
    
    // 🔧 優先使用路由傳入的 initialTab
    const fromRoute = this.initialTab();
    if (fromRoute) {
      this.activeTab.set(fromRoute);
      const sub = this.initialKnowledgeSub();
      if (fromRoute === 'knowledge' && sub) this.knowledgeSubTab.set(sub);
      return;
    }
    // 否則根據 NavBridge 的視圖名稱自動切換到對應 tab
    const currentView = this.navBridge.currentView();
    const targetTab = AICenterComponent.VIEW_TAB_MAP[currentView];
    if (targetTab) {
      this.activeTab.set(targetTab);
      if (targetTab === 'knowledge') {
        if (currentView === 'knowledge-manage') this.knowledgeSubTab.set('manage');
        else if (currentView === 'knowledge-gaps') this.knowledgeSubTab.set('gaps');
        else this.knowledgeSubTab.set('overview');
      }
    }
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
  
  // ==================== 🆕 Phase 2: AI 人格方法 ====================
  
  selectPersonaTemplate(templateId: string) {
    this.selectedPersonaTemplate.set(templateId);
    
    // 自動填充人設提示詞
    const template = this.personaTemplates.find(t => t.id === templateId);
    if (template) {
      this.customPersona.set(template.prompt);
      this.markStrategyDirty();
      
      // 更新預覽回覆
      this.updatePreviewForPersona(templateId);
    }
  }
  
  private updatePreviewForPersona(personaId: string) {
    const previews: Record<string, string> = {
      'friendly': '您好呀！感謝您的諮詢 😊 我們的服務價格根據您的具體需求而定，請問您主要想了解哪方面的服務呢？',
      'professional': '感謝您的垂詢。我們提供多種服務方案，價格區間從基礎版到企業版不等。請問您的具體需求是什麼？我可以為您推薦最合適的方案。',
      'enthusiastic': '太好了！感謝您對我們服務的關注！🎉 我們有超值的優惠套餐等著您！根據您的需求，我可以為您量身定制最划算的方案！',
      'efficient': '您好。價格視需求而定。請說明具體需求，我為您報價。'
    };
    
    this.previewResponse.set(previews[personaId] || previews['friendly']);
  }
  
  toggleRule(ruleId: string) {
    const rule = this.defaultRules.find(r => r.id === ruleId);
    if (rule) {
      rule.isActive = !rule.isActive;
      this.markStrategyDirty();
    }
  }
  
  getPersonaName(): string {
    const template = this.personaTemplates.find(t => t.id === this.selectedPersonaTemplate());
    return template?.name || '友好助手';
  }
  
  getPreviewResponse(): string {
    return this.previewResponse();
  }
  
  regeneratePreview() {
    this.toastService.info('正在生成預覽...');
    // 模擬不同回覆
    const variations = [
      '您好！感謝諮詢，我們的價格非常有競爭力，具體要看您的需求哦～',
      '親，我們的服務性價比超高！您想了解哪個套餐呢？',
      '感謝您的關注！我們有多種價位可選，我幫您詳細介紹一下？'
    ];
    const random = variations[Math.floor(Math.random() * variations.length)];
    this.previewResponse.set(random);
  }
  
  async savePersonaSettings() {
    // 復用現有的保存策略方法
    await this.saveStrategySettings();
    
    // 額外保存規則狀態
    const rulesState = this.defaultRules.map(r => ({ id: r.id, isActive: r.isActive }));
    localStorage.setItem('ai_rules_state', JSON.stringify(rulesState));
    
    this.toastService.success('AI 人格設定已保存');
  }
}
