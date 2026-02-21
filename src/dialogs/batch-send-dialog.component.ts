/**
 * 批量發送對話框組件
 * Batch Send Dialog Component
 * 
 * 優化功能：
 * - 支持調用聊天模板
 * - 支持 AI 智能生成
 * - 支持自定義消息
 */

import { Component, signal, input, output, inject, OnInit, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { BusinessApiService, ABTestResult } from '../services/business-api.service';

export interface BatchSendTarget {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  // 來源信息（用於變量替換）
  groupName?: string;
  keyword?: string;
  source?: string;
}

export interface BatchSendConfig {
  message: string;
  attachments: { name: string; path?: string; type: string }[];
  minInterval: number;
  maxInterval: number;
  accountRotation: boolean;
  selectedAccountPhone?: string;
}

export interface ChatTemplate {
  id: number;
  name: string;
  content: string;
  category: string;
  isEnabled: boolean;
  usageCount: number;
}

export type MessageSource = 'template' | 'custom' | 'ai';

@Component({
  selector: 'app-batch-send-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
           (click)="onBackdropClick($event)">
        <div class="bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-700/50 overflow-hidden max-h-[90vh] flex flex-col">
          
          <!-- 頭部 -->
          <div class="p-5 border-b border-slate-700/50 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xl">
                  📨
                </div>
                <div>
                  <h2 class="text-lg font-bold text-white">批量發送消息</h2>
                  <p class="text-sm text-slate-400">向 {{ targets().length }} 個用戶發送消息</p>
                </div>
              </div>
              <button (click)="close()" class="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- 內容 - 增加底部 padding 防止被底部按鈕擋住 -->
          <div class="flex-1 overflow-y-auto p-5 pb-8 space-y-5">
            
            <!-- 消息來源選擇 -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-3">
                📝 消息來源
              </label>
              <div class="flex gap-2">
                <button 
                  (click)="setMessageSource('template')"
                  class="flex-1 py-3 rounded-xl border transition-all flex items-center justify-center gap-2"
                  [class.border-blue-500]="messageSource() === 'template'"
                  [class.bg-blue-500/20]="messageSource() === 'template'"
                  [class.text-blue-400]="messageSource() === 'template'"
                  [class.border-slate-600]="messageSource() !== 'template'"
                  [class.bg-slate-800/50]="messageSource() !== 'template'"
                  [class.text-slate-400]="messageSource() !== 'template'">
                  📄 聊天模板
                </button>
                <button 
                  (click)="setMessageSource('custom')"
                  class="flex-1 py-3 rounded-xl border transition-all flex items-center justify-center gap-2"
                  [class.border-cyan-500]="messageSource() === 'custom'"
                  [class.bg-cyan-500/20]="messageSource() === 'custom'"
                  [class.text-cyan-400]="messageSource() === 'custom'"
                  [class.border-slate-600]="messageSource() !== 'custom'"
                  [class.bg-slate-800/50]="messageSource() !== 'custom'"
                  [class.text-slate-400]="messageSource() !== 'custom'">
                  ✏️ 自定義
                </button>
                <button 
                  (click)="setMessageSource('ai')"
                  class="flex-1 py-3 rounded-xl border transition-all flex items-center justify-center gap-2"
                  [class.border-purple-500]="messageSource() === 'ai'"
                  [class.bg-purple-500/20]="messageSource() === 'ai'"
                  [class.text-purple-400]="messageSource() === 'ai'"
                  [class.border-slate-600]="messageSource() !== 'ai'"
                  [class.bg-slate-800/50]="messageSource() !== 'ai'"
                  [class.text-slate-400]="messageSource() !== 'ai'">
                  🤖 AI 生成
                </button>
              </div>
            </div>
            
            <!-- 模板選擇區域 -->
            @if (messageSource() === 'template') {
              <div class="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <div class="flex items-center justify-between mb-3">
                  <label class="text-sm font-medium text-slate-300">選擇聊天模板</label>
                  <button (click)="loadTemplates()" class="text-xs text-cyan-400 hover:text-cyan-300">
                    🔄 刷新
                  </button>
                </div>
                
                <!-- 模板分類過濾 -->
                <div class="flex gap-2 mb-3 flex-wrap">
                  @for (cat of templateCategories; track cat.key) {
                    <button 
                      (click)="filterTemplateCategory.set(cat.key)"
                      class="px-3 py-1 text-xs rounded-lg transition-all"
                      [class.bg-blue-500]="filterTemplateCategory() === cat.key"
                      [class.text-white]="filterTemplateCategory() === cat.key"
                      [class.bg-slate-700]="filterTemplateCategory() !== cat.key"
                      [class.text-slate-400]="filterTemplateCategory() !== cat.key">
                      {{ cat.icon }} {{ cat.label }}
                    </button>
                  }
                </div>
                
                <!-- 模板列表 -->
                @if (isLoadingTemplates()) {
                  <div class="flex items-center justify-center py-6">
                    <svg class="animate-spin h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    <span class="ml-2 text-slate-400 text-sm">載入模板...</span>
                  </div>
                } @else if (filteredTemplates().length === 0) {
                  <div class="text-center py-6 text-slate-500">
                    <p>沒有找到模板</p>
                    <p class="text-xs mt-1">請先到「聊天模板」頁面創建模板</p>
                  </div>
                } @else {
                  <div class="space-y-2 max-h-40 overflow-y-auto">
                    @for (template of filteredTemplates(); track template.id) {
                      <button 
                        (click)="selectTemplate(template)"
                        class="w-full p-3 rounded-lg border transition-all text-left"
                        [class.border-blue-500]="selectedTemplate()?.id === template.id"
                        [class.bg-blue-500/10]="selectedTemplate()?.id === template.id"
                        [class.border-slate-600]="selectedTemplate()?.id !== template.id"
                        [class.bg-slate-800/50]="selectedTemplate()?.id !== template.id"
                        [class.hover:border-slate-500]="selectedTemplate()?.id !== template.id">
                        <div class="flex items-center justify-between mb-1">
                          <span class="font-medium text-white text-sm">{{ template.name }}</span>
                          <span class="text-xs text-slate-500">使用 {{ template.usageCount }} 次</span>
                        </div>
                        <p class="text-xs text-slate-400 line-clamp-2">{{ template.content }}</p>
                      </button>
                    }
                  </div>
                }
              </div>
            }
            
            <!-- AI 生成區域 -->
            @if (messageSource() === 'ai') {
              <div class="p-4 bg-purple-500/10 rounded-xl border border-purple-500/30">
                <div class="flex items-center justify-between mb-3">
                  <label class="text-sm font-medium text-purple-300">🤖 AI 智能生成</label>
                  
                  <!-- AI 狀態指示器 -->
                  @if (aiStatus().source !== 'unknown') {
                    <div class="flex items-center gap-2 px-2 py-1 rounded-lg text-xs"
                         [class.bg-green-500/20]="aiStatus().connected"
                         [class.text-green-400]="aiStatus().connected"
                         [class.bg-amber-500/20]="!aiStatus().connected"
                         [class.text-amber-400]="!aiStatus().connected">
                      @if (aiStatus().connected) {
                        <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span>已連接 {{ aiStatus().model }}</span>
                      } @else {
                        <span class="w-2 h-2 bg-amber-500 rounded-full"></span>
                        <span>使用本地模板</span>
                      }
                    </div>
                  }
                </div>
                
                <div class="space-y-3">
                  <!-- 語言風格 -->
                  <div>
                    <span class="text-xs text-slate-400 mb-2 block">語言風格：</span>
                    <div class="flex flex-wrap gap-2">
                      @for (style of aiStyles; track style.key) {
                        <button 
                          (click)="selectedAiStyle.set(style.key)"
                          class="px-3 py-1.5 text-xs rounded-lg transition-all"
                          [class.bg-purple-500]="selectedAiStyle() === style.key"
                          [class.text-white]="selectedAiStyle() === style.key"
                          [class.bg-slate-700]="selectedAiStyle() !== style.key"
                          [class.text-slate-400]="selectedAiStyle() !== style.key">
                          {{ style.label }}
                        </button>
                      }
                    </div>
                  </div>
                  
                  <!-- 主題輸入 -->
                  <div>
                    <span class="text-xs text-slate-400 mb-2 block">消息主題：</span>
                    <input 
                      type="text"
                      [(ngModel)]="aiTopic"
                      placeholder="例如：打個招呼、介紹產品、邀請加群..."
                      class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-purple-500">
                  </div>
                  
                  <!-- 生成按鈕 -->
                  <button 
                    (click)="generateAiMessage()"
                    [disabled]="isGeneratingAi() || !aiTopic.trim()"
                    class="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                    @if (isGeneratingAi()) {
                      <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      生成中...
                    } @else {
                      ✨ 生成 5 種不同表達
                    }
                  </button>
                  
                  <!-- AI 生成結果（支持多選） -->
                  @if (aiGeneratedMessages().length > 0) {
                    <div class="space-y-3 mt-3">
                      <div class="flex items-center justify-between">
                        <span class="text-xs text-slate-400">可多選模板（已選 {{ selectedMessages().size }} 個）：</span>
                        <div class="flex gap-2">
                          <button 
                            (click)="selectAllMessages()"
                            class="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30">
                            全選
                          </button>
                          <button 
                            (click)="clearSelectedMessages()"
                            class="text-xs px-2 py-1 bg-slate-700 text-slate-400 rounded hover:bg-slate-600">
                            清除
                          </button>
                        </div>
                      </div>
                      @for (msg of aiGeneratedMessages(); track $index) {
                        <label 
                          class="flex items-start gap-3 w-full p-3 rounded-lg border transition-all cursor-pointer"
                          [class.border-purple-500]="isMessageSelected(msg)"
                          [class.bg-purple-500/10]="isMessageSelected(msg)"
                          [class.border-slate-600]="!isMessageSelected(msg)"
                          [class.bg-slate-800/50]="!isMessageSelected(msg)">
                          <input 
                            type="checkbox" 
                            [checked]="isMessageSelected(msg)"
                            (change)="toggleMessageSelection(msg)"
                            class="mt-1 w-4 h-4 rounded bg-slate-700 border-slate-500 text-purple-500 focus:ring-purple-500">
                          <span class="flex-1 text-sm text-slate-300">{{ msg }}</span>
                        </label>
                      }
                      
                      <!-- 發送策略選擇 -->
                      @if (selectedMessages().size > 1) {
                        <div class="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                          <span class="text-xs text-slate-400 block mb-2">📤 發送策略：</span>
                          <div class="flex gap-2 flex-wrap">
                            @for (strategy of sendStrategies; track strategy.key) {
                              <button 
                                (click)="setSendStrategy(strategy.key)"
                                class="px-3 py-1.5 rounded-lg text-xs transition-all"
                                [class.bg-purple-500]="sendStrategy() === strategy.key"
                                [class.text-white]="sendStrategy() === strategy.key"
                                [class.bg-slate-700]="sendStrategy() !== strategy.key"
                                [class.text-slate-400]="sendStrategy() !== strategy.key"
                                [title]="strategy.desc">
                                {{ strategy.label }}
                              </button>
                            }
                          </div>
                          <p class="text-xs text-slate-500 mt-2">
                            {{ getStrategyDescription() }}
                          </p>
                        </div>
                      }

                      <!-- P15-3: A/B 測試選擇器 -->
                      @if (abTestsLoaded() && abTests().length > 0 && selectedMessages().size > 1) {
                        <div class="mt-3 p-3 bg-gradient-to-r from-purple-500/5 to-blue-500/5 
                                    rounded-lg border border-purple-500/20">
                          <span class="text-xs text-purple-400 block mb-2">🧪 A/B 測試（可選）：</span>
                          <div class="flex gap-2 flex-wrap">
                            <button 
                              (click)="abTestId.set('')"
                              class="px-3 py-1.5 rounded-lg text-xs transition-all"
                              [class.bg-slate-600]="!abTestId()"
                              [class.text-white]="!abTestId()"
                              [class.bg-slate-700/50]="abTestId()"
                              [class.text-slate-400]="abTestId()">
                              不使用
                            </button>
                            @for (test of abTests(); track test.test_id) {
                              <button 
                                (click)="abTestId.set(test.test_id)"
                                class="px-3 py-1.5 rounded-lg text-xs transition-all"
                                [class.bg-purple-500]="abTestId() === test.test_id"
                                [class.text-white]="abTestId() === test.test_id"
                                [class.bg-slate-700/50]="abTestId() !== test.test_id"
                                [class.text-slate-400]="abTestId() !== test.test_id"
                                [title]="'使用 A/B 測試: ' + test.name">
                                🧪 {{ test.name }}
                              </button>
                            }
                          </div>
                          @if (abTestId()) {
                            <p class="text-xs text-purple-400/70 mt-2">
                              將由後端 A/B 測試引擎自動選擇模板變體並記錄效果
                            </p>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            }
            
            <!-- 消息編輯區域 -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                📝 消息內容 
                @if (messageSource() === 'template' && selectedTemplate()) {
                  <span class="text-xs text-blue-400 ml-2">（使用模板：{{ selectedTemplate()?.name }}）</span>
                }
              </label>
              <textarea 
                [(ngModel)]="messageContent"
                rows="5"
                class="w-full bg-slate-800/50 border border-slate-600 rounded-xl p-4 text-white placeholder-slate-500 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="輸入消息內容...&#10;&#10;點擊下方變量按鈕可快速插入，例如：&#10;{greeting}{name}，很高興認識你！">
              </textarea>
              
              <!-- 變量提示 -->
              <div class="mt-2 flex flex-wrap gap-2 items-center">
                <span class="text-xs text-slate-500">可用變量：</span>
                @for (variable of availableVariables; track variable.key) {
                  <button 
                    (click)="insertVariable(variable.key)"
                    class="px-2.5 py-1 text-xs bg-slate-700/80 text-cyan-400 rounded-lg hover:bg-cyan-500/20 hover:text-cyan-300 transition-all border border-slate-600 hover:border-cyan-500/50 flex items-center gap-1"
                    [title]="'插入 ' + variable.key">
                    <span class="text-slate-400">{{ variable.key }}</span>
                    <span class="text-slate-500">|</span>
                    <span class="text-white">{{ variable.label }}</span>
                  </button>
                }
              </div>
            </div>
            
            <!-- 附件 -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                📎 附件（可選）
              </label>
              <div class="flex gap-3">
                <button 
                  (click)="selectImages()"
                  class="flex-1 py-3 bg-slate-800/50 border border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white hover:border-slate-500 transition-colors flex items-center justify-center gap-2">
                  🖼️ 添加圖片
                </button>
                <button 
                  (click)="selectFiles()"
                  class="flex-1 py-3 bg-slate-800/50 border border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white hover:border-slate-500 transition-colors flex items-center justify-center gap-2">
                  📄 添加文件
                </button>
              </div>
              
              <!-- 附件列表 -->
              @if (attachments().length > 0) {
                <div class="mt-3 flex flex-wrap gap-2">
                  @for (attachment of attachments(); track attachment.name; let i = $index) {
                    <div class="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
                      <span class="text-lg">{{ attachment.type.startsWith('image') ? '🖼️' : '📄' }}</span>
                      <span class="text-sm text-white max-w-[150px] truncate">{{ attachment.name }}</span>
                      <button (click)="removeAttachment(i)" class="text-slate-400 hover:text-red-400">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
            
            <!-- 發送設置 -->
            <div class="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <label class="block text-sm font-medium text-slate-300 mb-3">
                ⚙️ 發送設置
              </label>
              
              <div class="space-y-4">
                <!-- 發送間隔 -->
                <div class="flex items-center gap-3">
                  <span class="text-sm text-slate-400 w-24">發送間隔：</span>
                  <input 
                    type="number" 
                    [(ngModel)]="minInterval"
                    min="10" max="300"
                    class="w-20 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-center focus:ring-2 focus:ring-blue-500">
                  <span class="text-slate-400">-</span>
                  <input 
                    type="number" 
                    [(ngModel)]="maxInterval"
                    min="10" max="600"
                    class="w-20 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-center focus:ring-2 focus:ring-blue-500">
                  <span class="text-sm text-slate-400">秒（隨機）</span>
                </div>
                
                <!-- 帳號輪換 -->
                <div class="flex items-center gap-3">
                  <span class="text-sm text-slate-400 w-24">帳號輪換：</span>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" [(ngModel)]="accountRotation" class="sr-only peer">
                    <div class="w-11 h-6 bg-slate-700 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                  <span class="text-sm text-slate-400">啟用多帳號輪換發送</span>
                </div>
              </div>
            </div>
            
            <!-- 目標用戶預覽 -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                👥 發送目標（{{ targets().length }} 人）
              </label>
              <div class="max-h-32 overflow-y-auto p-3 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <div class="flex flex-wrap gap-2">
                  @for (target of targets().slice(0, 20); track $index) {
                    <span class="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">
                      {{ target.displayName || target.firstName || target.username || target.telegramId }}
                    </span>
                  }
                  @if (targets().length > 20) {
                    <span class="px-2 py-1 text-slate-400 text-xs">
                      +{{ targets().length - 20 }} 更多...
                    </span>
                  }
                </div>
              </div>
            </div>
            
          </div>
          
          <!-- 發送進度 -->
          @if (isSending()) {
            <div class="p-4 bg-slate-800/50 border-t border-slate-700/50">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-white">發送進度</span>
                <span class="text-sm text-slate-400">{{ sentCount() }} / {{ targets().length }}</span>
              </div>
              <div class="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                  [style.width.%]="progressPercent()">
                </div>
              </div>
              <div class="mt-2 flex items-center gap-4 text-xs text-slate-400">
                <span>✅ 成功: {{ successCount() }}</span>
                <span>❌ 失敗: {{ failedCount() }}</span>
                <span>⏳ 預計剩餘: {{ estimatedRemaining() }}</span>
              </div>
              @if (currentTarget()) {
                <div class="mt-2 text-xs text-cyan-400">
                  📨 正在發送給: {{ currentTarget() }}
                </div>
              }
              <!-- 失敗原因統計 -->
              @if (failedCount() > 0 && failureReasonsList().length > 0) {
                <div class="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div class="text-xs text-red-400 font-medium mb-1">失敗原因：</div>
                  <div class="flex flex-wrap gap-2">
                    @for (reason of failureReasonsList(); track $index) {
                      <span class="text-xs px-2 py-0.5 bg-red-500/20 text-red-300 rounded">
                        {{ reason.label }}: {{ reason.count }}
                      </span>
                    }
                  </div>
                </div>
              }
            </div>
          }
          
          <!-- 底部按鈕 - 固定在底部，使用更高的z-index確保可見 -->
          <div class="sticky bottom-0 left-0 right-0 p-4 border-t border-slate-700/50 bg-slate-900 flex gap-3 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.3)]">
            <button 
              (click)="close()"
              [disabled]="isSending()"
              class="px-4 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors disabled:opacity-50">
              {{ isSending() ? '⏳ 進行中' : '取消' }}
            </button>
            <button 
              (click)="previewMessage()"
              [disabled]="!canSend() || isSending()"
              class="px-4 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors disabled:opacity-50">
              👁️ 預覽
            </button>
            <button 
              (click)="startSending()"
              [disabled]="!canSend() || isSending()"
              class="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 text-base shadow-lg shadow-blue-500/20">
              @if (isSending()) {
                <span class="animate-spin">⏳</span> 發送中...
              } @else {
                📨 開始發送 ({{ targets().length }} 人)
              }
            </button>
          </div>
          
        </div>
      </div>
    }
    
    <!-- 預覽對話框 -->
    @if (showPreview()) {
      <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
        <div class="bg-slate-900 rounded-xl p-6 max-w-md w-full border border-slate-700">
          <h3 class="text-lg font-bold text-white mb-4">📱 消息預覽</h3>
          <div class="p-4 bg-slate-800 rounded-lg text-white whitespace-pre-wrap">
            {{ previewText() }}
          </div>
          @if (attachments().length > 0) {
            <div class="mt-3 text-sm text-slate-400">
              📎 包含 {{ attachments().length }} 個附件
            </div>
          }
          <button 
            (click)="showPreview.set(false)"
            class="mt-4 w-full py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors">
            關閉
          </button>
        </div>
      </div>
    }
  `
})
export class BatchSendDialogComponent implements OnInit, OnDestroy {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  private bizApi = inject(BusinessApiService);
  private listeners: (() => void)[] = [];
  
  // 輸入
  isOpen = input<boolean>(false);
  targets = input<BatchSendTarget[]>([]);
  
  // 輸出
  closeDialog = output<void>();
  sendComplete = output<{ success: number; failed: number }>();
  
  // 消息來源
  messageSource = signal<MessageSource>('custom');
  
  // 聊天模板相關
  chatTemplates = signal<ChatTemplate[]>([]);
  isLoadingTemplates = signal(false);
  selectedTemplate = signal<ChatTemplate | null>(null);
  filterTemplateCategory = signal<string>('all');
  
  templateCategories = [
    { key: 'all', icon: '📋', label: '全部' },
    { key: 'greeting', icon: '👋', label: '問候語' },
    { key: 'follow_up', icon: '📩', label: '跟進消息' },
    { key: 'promotion', icon: '📢', label: '推廣消息' },
    { key: 'custom', icon: '✏️', label: '自定義' },
  ];
  
  filteredTemplates = computed(() => {
    const category = this.filterTemplateCategory();
    const templates = this.chatTemplates();
    if (category === 'all') return templates.filter(t => t.isEnabled);
    return templates.filter(t => t.isEnabled && t.category === category);
  });
  
  // AI 生成相關
  selectedAiStyle = signal<string>('friendly');
  aiTopic = '';
  isGeneratingAi = signal(false);
  aiGeneratedMessages = signal<string[]>([]);
  
  // AI 狀態
  aiStatus = signal<{ connected: boolean; model: string | null; source: 'ai' | 'local' | 'unknown' }>({
    connected: false,
    model: null,
    source: 'unknown'
  });
  
  // 多模板選擇（支持多選）
  selectedMessages = signal<Set<string>>(new Set());
  
  // 發送策略
  sendStrategy = signal<'random' | 'rotate' | 'sequential'>('random');
  sendStrategies = [
    { key: 'random', label: '🎲 隨機發送', desc: '每個用戶隨機選擇一個模板' },
    { key: 'rotate', label: '🔄 輪轉發送', desc: '依次使用模板（1→2→3→1...）' },
    { key: 'sequential', label: '📋 順序發送', desc: '按順序用完再重複' },
  ];
  
  // P15-3: A/B 測試集成
  abTestId = signal<string>('');
  abTests = signal<ABTestResult[]>([]);
  abTestsLoaded = signal(false);
  
  aiStyles = [
    { key: 'friendly', label: '友好親切' },
    { key: 'formal', label: '正式商務' },
    { key: 'humorous', label: '輕鬆幽默' },
    { key: 'concise', label: '簡潔明了' },
    { key: 'enthusiastic', label: '熱情洋溢' },
  ];
  
  // 消息內容
  messageContent = '';
  attachments = signal<{ name: string; path?: string; type: string }[]>([]);
  
  // 發送設置
  minInterval = 30;
  maxInterval = 60;
  accountRotation = true;
  
  // 可用變量（中英文對照）- 支持駝峰式和下劃線兩種格式
  availableVariables = [
    { key: '{firstName}', label: '名字' },
    { key: '{lastName}', label: '姓氏' },
    { key: '{username}', label: '用戶名' },
    { key: '{name}', label: '顯示名' },
    { key: '{fullName}', label: '全名' },
    { key: '{groupName}', label: '來源群組' },
    { key: '{keyword}', label: '觸發關鍵詞' },
    { key: '{source}', label: '來源渠道' },
    { key: '{greeting}', label: '問候語' },
    { key: '{date}', label: '日期' },
    { key: '{time}', label: '時間' },
    { key: '{day}', label: '星期' },
  ];
  
  // 發送狀態
  isSending = signal(false);
  sentCount = signal(0);
  successCount = signal(0);
  failedCount = signal(0);
  currentTarget = signal<string>('');
  failureReasons = signal<Record<string, number>>({});
  
  // 失敗原因標籤
  failureReasonLabels: Record<string, string> = {
    'privacy_restricted': '🔒 隱私限制',
    'flood_wait': '⏱️ API 限制',
    'user_not_found': '❓ 用戶不存在',
    'user_blocked': '🚫 被封鎖',
    'invalid_id': '⚠️ 無效 ID',
    'no_account': '📱 無可用帳號',
    'cancelled': '⏹️ 已取消',
    'other': '❌ 其他錯誤',
  };
  
  // 預覽
  showPreview = signal(false);
  
  // 計算屬性
  progressPercent = computed(() => {
    const total = this.targets().length;
    return total > 0 ? (this.sentCount() / total) * 100 : 0;
  });
  
  // 失敗原因列表
  failureReasonsList = computed(() => {
    const reasons = this.failureReasons();
    return Object.keys(reasons).map(key => ({
      key,
      label: this.failureReasonLabels[key] || key,
      count: reasons[key]
    }));
  });
  
  estimatedRemaining = computed(() => {
    const remaining = this.targets().length - this.sentCount();
    const avgInterval = (this.minInterval + this.maxInterval) / 2;
    const seconds = remaining * avgInterval;
    if (seconds < 60) return `${Math.round(seconds)} 秒`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} 分鐘`;
    return `${Math.round(seconds / 3600)} 小時`;
  });
  
  previewText = computed(() => {
    const sample = this.targets()[0] || {};
    return this.replaceVariables(this.messageContent, sample);
  });
  
  ngOnInit() {
    this.setupIpcListeners();
    this.loadTemplates();
    this.loadABTests();
  }
  
  /** P15-3: 加載進行中的 A/B 測試 */
  private async loadABTests() {
    try {
      const tests = await this.bizApi.loadABTests();
      // 只顯示進行中的測試
      this.abTests.set(tests.filter(t => t.status === 'running'));
      this.abTestsLoaded.set(true);
    } catch {
      this.abTestsLoaded.set(true);
    }
  }
  
  ngOnDestroy() {
    this.listeners.forEach(cleanup => cleanup());
  }
  
  private setupIpcListeners() {
    const cleanup1 = this.ipc.on('batch-send:progress', (data: any) => {
      this.sentCount.set(data.sent);
      this.successCount.set(data.success);
      this.failedCount.set(data.failed);
      if (data.currentTarget) {
        this.currentTarget.set(data.currentTarget);
      }
      if (data.failureReasons) {
        this.failureReasons.set(data.failureReasons);
      }
    });
    this.listeners.push(cleanup1);
    
    const cleanup2 = this.ipc.on('batch-send:complete', (data: any) => {
      this.isSending.set(false);
      this.sendComplete.emit({ success: data.success, failed: data.failed });
      
      // 🔧 P0：顯示詳細的完成信息（區分確認送達 vs 不確定）
      const confirmed = data.confirmed ?? data.success;
      const uncertain = data.uncertain ?? 0;
      
      if (data.error) {
        // 有錯誤（如沒有可用帳號）
        this.toast.error(`❌ 發送失敗：${data.error}`);
      } else if (data.failed > 0 || uncertain > 0) {
        // 有失敗或不確定
        const parts: string[] = [];
        if (confirmed > 0) parts.push(`確認送達 ${confirmed}`);
        if (uncertain > 0) parts.push(`可能送達 ${uncertain}`);
        if (data.failed > 0) {
          const summary = data.failureSummary || `失敗 ${data.failed}`;
          parts.push(summary);
        }
        this.toast.warning(`⚠️ 批量發送完成：${parts.join('，')}`);
      } else {
        // 全部確認成功
        this.toast.success(`✅ 批量發送完成：全部確認送達 ${data.success} 個`);
      }
      
      // 保存失敗信息用於顯示
      if (data.failureReasons) {
        this.failureReasons.set(data.failureReasons);
      }
    });
    this.listeners.push(cleanup2);
    
    // 監聽模板列表
    const cleanup3 = this.ipc.on('get-chat-templates-result', (data: any) => {
      this.isLoadingTemplates.set(false);
      if (data.templates) {
        this.chatTemplates.set(data.templates);
      }
    });
    this.listeners.push(cleanup3);
    
    // 監聯 AI 生成結果
    const cleanup4 = this.ipc.on('ai-generate-message-result', (data: any) => {
      console.log('[AI] 收到生成結果:', data);
      
      // 清除超時計時器
      if (this.aiGenerateTimeout) {
        clearTimeout(this.aiGenerateTimeout);
        this.aiGenerateTimeout = null;
      }
      
      this.isGeneratingAi.set(false);
      if (data.success && data.messages) {
        this.aiGeneratedMessages.set(data.messages);
        
        // 更新 AI 狀態信息
        if (data.source === 'ai' && data.model) {
          this.aiStatus.set({ connected: true, model: data.model, source: 'ai' });
          this.toast.success(`🤖 ${data.model} 生成了 ${data.messages.length} 條消息！`);
        } else {
          this.aiStatus.set({ connected: false, model: null, source: 'local' });
          this.toast.info('📋 已使用本地模板生成消息');
        }
      } else {
        this.toast.error(data.error || 'AI 生成失敗');
      }
    });
    this.listeners.push(cleanup4);
  }
  
  // 設置消息來源
  setMessageSource(source: MessageSource) {
    this.messageSource.set(source);
    if (source === 'template') {
      this.loadTemplates();
    }
  }
  
  // 載入聊天模板
  loadTemplates() {
    this.isLoadingTemplates.set(true);
    this.ipc.send('get-chat-templates', {});
  }
  
  // 選擇模板
  selectTemplate(template: ChatTemplate) {
    this.selectedTemplate.set(template);
    this.messageContent = template.content;
    this.toast.info(`已選擇模板：${template.name}`);
  }
  
  // AI 生成超時計時器
  private aiGenerateTimeout: any = null;
  
  // 生成 AI 消息
  generateAiMessage() {
    if (!this.aiTopic.trim()) {
      this.toast.warning('請輸入消息主題');
      return;
    }
    
    this.isGeneratingAi.set(true);
    this.aiGeneratedMessages.set([]);
    
    // 設置 10 秒超時
    if (this.aiGenerateTimeout) {
      clearTimeout(this.aiGenerateTimeout);
    }
    this.aiGenerateTimeout = setTimeout(() => {
      if (this.isGeneratingAi()) {
        this.isGeneratingAi.set(false);
        this.toast.warning('AI 生成超時，已使用本地模板');
        // 使用本地預設模板作為回退
        this.useLocalAiTemplates();
      }
    }, 10000);
    
    console.log('[AI] 發送生成請求:', {
      topic: this.aiTopic,
      style: this.selectedAiStyle()
    });
    
    this.ipc.send('ai-generate-message', {
      topic: this.aiTopic,
      style: this.selectedAiStyle(),
      count: 5,
      context: {
        targetCount: this.targets().length,
        sampleTarget: this.targets()[0]
      }
    });
  }
  
  // 本地 AI 模板回退方案
  private useLocalAiTemplates() {
    const topic = this.aiTopic || '打招呼';
    const style = this.selectedAiStyle();
    
    const templates: { [key: string]: string[] } = {
      'friendly': [
        `{greeting}！我是在群裡看到你的，想認識一下~`,
        `Hi {name}！很高興能認識你，希望以後多多交流 😊`,
        `{greeting}{name}，我覺得我們可能有共同話題，方便聊聊嗎？`,
        `嗨！看到你的資料覺得很有趣，想跟你交個朋友~`,
        `{greeting}！我是${topic}相關的，看到你也對這個感興趣？`
      ],
      'formal': [
        `{greeting}，很高興認識您。我注意到我們可能有共同的興趣點，不知是否方便交流？`,
        `您好 {name}，冒昧打擾。我專注於${topic}領域，希望能與您建立聯繫。`,
        `{greeting}，我是通過群組認識到您的。如有合作機會，期待進一步溝通。`,
        `尊敬的 {name}，很榮幸能夠與您取得聯繫。期待未來有機會合作。`,
        `{greeting}，我對${topic}很感興趣，看到您也在這個領域，想向您請教。`
      ],
      'humorous': [
        `{greeting}！我不是推銷員，只是覺得你看起來很酷想認識一下 😎`,
        `Hi {name}！別擔心，我只是想聊聊${topic}而已，不會推銷任何東西 🤣`,
        `{greeting}！能遇到對${topic}感興趣的人真是太難得了！`,
        `嗨！看到你在群裡的發言覺得很有趣，忍不住來打個招呼~`,
        `{greeting}！難得遇到同好，必須認識一下！`
      ],
      'concise': [
        `{greeting}，想認識一下。`,
        `Hi {name}，關於${topic}想和你聊聊。`,
        `您好，看到你對${topic}感興趣，方便交流嗎？`,
        `{greeting}，我也關注${topic}，交個朋友？`,
        `Hi，想請教一下${topic}相關的問題。`
      ],
      'enthusiastic': [
        `{greeting}！！太開心能認識你了！🎉`,
        `哇！{name}！終於找到同樣喜歡${topic}的人了！✨`,
        `{greeting}！看到你的資料超興奮的！我們一定有很多共同話題！`,
        `Hi {name}！❤️ 超級期待和你聊${topic}！`,
        `{greeting}！遇到你簡直太棒了！🌟`
      ]
    };
    
    const messages = templates[style] || templates['friendly'];
    this.aiGeneratedMessages.set(messages);
    this.toast.info('已生成本地模板供選擇');
  }
  
  // 選擇 AI 生成的消息（單選模式 - 兼容）
  selectAiMessage(message: string) {
    this.messageContent = message;
  }
  
  // 多選相關方法
  isMessageSelected(msg: string): boolean {
    return this.selectedMessages().has(msg);
  }
  
  toggleMessageSelection(msg: string) {
    const current = new Set(this.selectedMessages());
    if (current.has(msg)) {
      current.delete(msg);
    } else {
      current.add(msg);
    }
    this.selectedMessages.set(current);
    
    // 如果只選了一個，自動設置為消息內容
    if (current.size === 1) {
      this.messageContent = Array.from(current)[0];
    } else if (current.size > 1) {
      this.messageContent = `[多模板模式] 已選擇 ${current.size} 個模板`;
    } else {
      this.messageContent = '';
    }
  }
  
  selectAllMessages() {
    const all = new Set(this.aiGeneratedMessages());
    this.selectedMessages.set(all);
    this.messageContent = `[多模板模式] 已選擇 ${all.size} 個模板`;
  }
  
  clearSelectedMessages() {
    this.selectedMessages.set(new Set());
    this.messageContent = '';
  }
  
  setSendStrategy(strategy: 'random' | 'rotate' | 'sequential') {
    this.sendStrategy.set(strategy);
  }
  
  getStrategyDescription(): string {
    const descs: { [key: string]: string } = {
      'random': `將隨機選擇模板發送給 ${this.targets().length} 個用戶，增加消息多樣性`,
      'rotate': `模板將輪流使用，確保每個模板被均勻使用`,
      'sequential': `按順序依次使用每個模板`
    };
    return descs[this.sendStrategy()] || '';
  }
  
  canSend(): boolean {
    // 支持多模板模式
    if (this.selectedMessages().size > 0) return true;
    return this.messageContent.trim().length > 0 || this.attachments().length > 0;
  }
  
  insertVariable(variable: string) {
    this.messageContent += variable;
  }
  
  async selectImages() {
    try {
      const result = await this.ipc.invoke('select-file-for-attachment', { 
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
        multiSelections: true
      });
      
      if (result && result.length > 0) {
        const newAttachments = result.map((file: any) => ({
          name: file.fileName,
          path: file.filePath,
          type: file.fileType
        }));
        this.attachments.update(arr => [...arr, ...newAttachments]);
      }
    } catch (e) {
      console.error('Select images failed:', e);
    }
  }
  
  async selectFiles() {
    try {
      const result = await this.ipc.invoke('select-file-for-attachment', { 
        filters: [{ name: 'All Files', extensions: ['*'] }],
        multiSelections: true
      });
      
      if (result && result.length > 0) {
        const newAttachments = result.map((file: any) => ({
          name: file.fileName,
          path: file.filePath,
          type: file.fileType
        }));
        this.attachments.update(arr => [...arr, ...newAttachments]);
      }
    } catch (e) {
      console.error('Select files failed:', e);
    }
  }
  
  removeAttachment(index: number) {
    this.attachments.update(arr => arr.filter((_, i) => i !== index));
  }
  
  previewMessage() {
    this.showPreview.set(true);
  }
  
  replaceVariables(template: string, user: any): string {
    let result = template;
    
    // 用戶信息變量
    const firstName = user.firstName || user.first_name || '';
    const lastName = user.lastName || user.last_name || '';
    const username = user.username || '';
    const displayName = user.displayName || user.name || firstName || username || '朋友';
    const fullName = `${firstName} ${lastName}`.trim() || displayName;
    
    // 來源信息變量
    const groupName = user.groupName || user.sourceGroup || user.source || '群組';
    const keyword = user.keyword || user.triggeredKeyword || user.matchedKeyword || '';
    const source = user.source || user.sourceType || '';
    
    // 支持駝峰式和下劃線兩種格式 - 用戶信息
    result = result.replace(/{firstName}/g, firstName);
    result = result.replace(/{first_name}/g, firstName);
    result = result.replace(/{lastName}/g, lastName);
    result = result.replace(/{last_name}/g, lastName);
    result = result.replace(/{username}/g, username);
    result = result.replace(/{displayName}/g, displayName);
    result = result.replace(/{name}/g, displayName);
    result = result.replace(/{fullName}/g, fullName);
    result = result.replace(/{full_name}/g, fullName);
    
    // 來源信息變量
    result = result.replace(/{groupName}/g, groupName);
    result = result.replace(/{group_name}/g, groupName);
    result = result.replace(/{keyword}/g, keyword);
    result = result.replace(/{source}/g, source);
    
    // 時間相關變量
    const now = new Date();
    const hour = now.getHours();
    let greeting = '您好';
    if (hour >= 5 && hour < 12) greeting = '早上好';
    else if (hour >= 12 && hour < 14) greeting = '中午好';
    else if (hour >= 14 && hour < 18) greeting = '下午好';
    else if (hour >= 18 && hour < 22) greeting = '晚上好';
    else greeting = '夜深了';
    
    const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const dateStr = `${now.getMonth() + 1}月${now.getDate()}日`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const dayStr = days[now.getDay()];
    
    result = result.replace(/{greeting}/g, greeting);
    result = result.replace(/{date}/g, dateStr);
    result = result.replace(/{time}/g, timeStr);
    result = result.replace(/{day}/g, dayStr);
    
    return result;
  }
  
  startSending() {
    if (!this.canSend()) return;
    
    // 重置狀態
    this.isSending.set(true);
    this.sentCount.set(0);
    this.successCount.set(0);
    this.failedCount.set(0);
    this.currentTarget.set('');
    this.failureReasons.set({});
    
    // 處理多模板模式
    const selectedMsgs = Array.from(this.selectedMessages());
    const isMultiTemplate = selectedMsgs.length > 1;
    
    // 構建發送數據
    const sendData: any = {
      targets: this.targets().map(t => ({
        telegramId: t.telegramId,
        username: t.username,
        firstName: t.firstName,
        lastName: t.lastName,
        displayName: t.displayName,
        // 添加來源信息
        groupName: t.groupName,
        keyword: t.keyword,
        source: t.source
      })),
      attachments: this.attachments(),
      config: {
        minInterval: this.minInterval,
        maxInterval: this.maxInterval,
        accountRotation: this.accountRotation,
        // P14-2: A/B 測試 ID
        ...(this.abTestId() ? { abTestId: this.abTestId() } : {}),
      }
    };
    
    // 根據是否多模板決定發送方式
    if (isMultiTemplate) {
      // 多模板模式
      sendData.messages = selectedMsgs;
      sendData.sendStrategy = this.sendStrategy();
      sendData.message = ''; // 清空單消息字段
      this.toast.info(`📨 使用 ${selectedMsgs.length} 個模板${this.sendStrategy() === 'random' ? '隨機' : this.sendStrategy() === 'rotate' ? '輪轉' : '順序'}發送...`);
    } else if (selectedMsgs.length === 1) {
      // 單模板（從多選中選了一個）
      sendData.message = selectedMsgs[0];
    } else {
      // 普通單消息模式
      sendData.message = this.messageContent;
    }
    
    // 發送到後端
    this.ipc.send('batch-send:start', sendData);
    
    if (!isMultiTemplate) {
      this.toast.info(`📨 開始批量發送 ${this.targets().length} 條消息...`);
    }
  }
  
  close() {
    if (this.isSending()) {
      // 確認是否要中斷
      if (!confirm('發送正在進行中，確定要取消嗎？')) {
        return;
      }
      this.ipc.send('batch-send:cancel', {});
    }
    this.closeDialog.emit();
  }
  
  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget && !this.isSending()) {
      this.close();
    }
  }
}
