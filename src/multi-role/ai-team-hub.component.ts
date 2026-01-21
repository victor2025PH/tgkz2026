/**
 * AI 團隊中心組件
 * AI Team Hub Component
 * 
 * 極簡化設計：
 * - 一句話啟動
 * - 實時監控
 * - 智能調整
 */

import { Component, signal, computed, inject, OnInit, OnDestroy, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DynamicScriptEngineService, ExecutionState, RecommendedRole } from './dynamic-script-engine.service';
import { AutoGroupService, CreateGroupRequest } from './auto-group.service';
import { ToastService } from '../toast.service';

// 從 AI 營銷助手傳入的策略
export interface IncomingStrategy {
  industry: string;
  targetAudience: string;
  keywords: {
    highIntent: string[];
    mediumIntent: string[];
    extended: string[];
  };
  customerProfile: {
    identity: string[];
    features: string[];
    needs: string[];
  };
  recommendedGroups: string[];
  messageTemplates: {
    firstTouch: string;
    followUp: string;
    closing: string;
  };
}

type HubTab = 'start' | 'running' | 'history';

@Component({
  selector: 'app-ai-team-hub',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="ai-team-hub h-full flex flex-col bg-slate-900">
      <!-- 頂部標題 -->
      <div class="p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-2xl">🤖</span>
              AI 團隊銷售
            </h1>
            
            @if (engine.currentExecution()?.status === 'running') {
              <span class="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm animate-pulse">
                <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                執行中
              </span>
            }
          </div>
          
          <!-- 快速統計 -->
          <div class="flex items-center gap-4 px-4 py-2 bg-slate-800/80 rounded-xl border border-slate-700/50">
            <div class="text-center">
              <div class="text-lg font-bold text-green-400">{{ runningCount() }}</div>
              <div class="text-xs text-slate-500">執行中</div>
            </div>
            <div class="w-px h-8 bg-slate-700"></div>
            <div class="text-center">
              <div class="text-lg font-bold text-cyan-400">{{ todayMessages() }}</div>
              <div class="text-xs text-slate-500">今日消息</div>
            </div>
            <div class="w-px h-8 bg-slate-700"></div>
            <div class="text-center">
              <div class="text-lg font-bold text-purple-400">{{ todayConversions() }}</div>
              <div class="text-xs text-slate-500">成交</div>
            </div>
          </div>
        </div>
        
        <!-- 簡化的 Tab -->
        <div class="flex gap-1 mt-4 bg-slate-800/50 p-1 rounded-xl w-fit">
          <button (click)="activeTab.set('start')"
                  class="px-6 py-2.5 rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
                  [class.bg-gradient-to-r]="activeTab() === 'start'"
                  [class.from-purple-500]="activeTab() === 'start'"
                  [class.to-pink-500]="activeTab() === 'start'"
                  [class.text-white]="activeTab() === 'start'"
                  [class.text-slate-400]="activeTab() !== 'start'">
            <span>🚀</span> 一鍵啟動
          </button>
          <button (click)="activeTab.set('running')"
                  class="px-6 py-2.5 rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
                  [class.bg-gradient-to-r]="activeTab() === 'running'"
                  [class.from-green-500]="activeTab() === 'running'"
                  [class.to-emerald-500]="activeTab() === 'running'"
                  [class.text-white]="activeTab() === 'running'"
                  [class.text-slate-400]="activeTab() !== 'running'">
            <span>📊</span> 執行監控
            @if (runningCount() > 0) {
              <span class="bg-white/20 px-2 py-0.5 rounded-full text-xs">{{ runningCount() }}</span>
            }
          </button>
          <button (click)="activeTab.set('history')"
                  class="px-6 py-2.5 rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
                  [class.bg-gradient-to-r]="activeTab() === 'history'"
                  [class.from-slate-600]="activeTab() === 'history'"
                  [class.to-slate-500]="activeTab() === 'history'"
                  [class.text-white]="activeTab() === 'history'"
                  [class.text-slate-400]="activeTab() !== 'history'">
            <span>📜</span> 歷史記錄
          </button>
        </div>
      </div>
      
      <!-- 內容區 -->
      <div class="flex-1 overflow-y-auto p-6">
        @switch (activeTab()) {
          @case ('start') {
            <!-- 一句話啟動 -->
            <div class="max-w-3xl mx-auto space-y-8">
              
              <!-- 來自 AI 營銷助手的策略提示 -->
              @if (hasIncomingStrategy()) {
                <div class="p-4 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 rounded-2xl">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <span class="text-2xl">🔗</span>
                      <div>
                        <p class="text-emerald-400 font-medium">已接收 AI 營銷助手的策略</p>
                        <p class="text-slate-400 text-sm">策略已自動填入，確認後即可開始執行</p>
                      </div>
                    </div>
                    <button (click)="clearIncomingStrategy()"
                            class="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                      ✕ 清除
                    </button>
                  </div>
                </div>
              }
              
              <!-- 主輸入區 -->
              <div class="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-cyan-500/10 rounded-3xl border border-purple-500/30 p-8">
                <div class="text-center mb-6">
                  <h2 class="text-2xl font-bold text-white mb-2">🎯 一句話，啟動你的 AI 銷售團隊</h2>
                  <p class="text-slate-400">告訴 AI 你想要什麼，剩下的交給我們</p>
                </div>
                
                <div class="relative">
                  <textarea rows="3"
                            [(ngModel)]="userGoal"
                            (keydown.enter)="onEnterKey($event)"
                            placeholder="例如：我想讓群裡那些看過產品但還沒下單的人購買..."
                            class="w-full px-6 py-4 bg-slate-800/80 border border-slate-600 rounded-2xl text-white text-lg placeholder-slate-500 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                  </textarea>
                  
                  <button (click)="startFromGoal()"
                          [disabled]="!userGoal.trim() || engine.isProcessing()"
                          class="absolute right-3 bottom-3 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    @if (engine.isProcessing()) {
                      <span class="animate-spin">⏳</span> 策劃中...
                    } @else {
                      <span>🚀</span> AI 開始工作
                    }
                  </button>
                </div>
              </div>
              
              <!-- 快速目標選擇 -->
              <div>
                <h3 class="text-sm text-slate-400 mb-4 flex items-center gap-2">
                  <span>💡</span> 或選擇常見目標，一鍵開始
                </h3>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                  @for (preset of presetGoals; track preset.id) {
                    <button (click)="quickStart(preset.goal)"
                            class="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-left hover:bg-slate-800 hover:border-purple-500/30 transition-all group">
                      <div class="text-2xl mb-2">{{ preset.icon }}</div>
                      <div class="font-medium text-white group-hover:text-purple-400 transition-colors">{{ preset.name }}</div>
                      <div class="text-xs text-slate-400 mt-1">{{ preset.description }}</div>
                    </button>
                  }
                </div>
              </div>
              
              <!-- AI 特點說明 -->
              <div class="grid grid-cols-3 gap-4">
                <div class="p-4 bg-slate-800/30 rounded-xl text-center">
                  <div class="text-2xl mb-2">🎭</div>
                  <div class="text-sm text-white font-medium">像真人一樣</div>
                  <div class="text-xs text-slate-400 mt-1">聊生活、聊新聞、自然引導</div>
                </div>
                <div class="p-4 bg-slate-800/30 rounded-xl text-center">
                  <div class="text-2xl mb-2">🔄</div>
                  <div class="text-sm text-white font-medium">實時調整</div>
                  <div class="text-xs text-slate-400 mt-1">每10條消息分析一次</div>
                </div>
                <div class="p-4 bg-slate-800/30 rounded-xl text-center">
                  <div class="text-2xl mb-2">🤝</div>
                  <div class="text-sm text-white font-medium">多角色配合</div>
                  <div class="text-xs text-slate-400 mt-1">AI 自動協調最佳組合</div>
                </div>
              </div>
            </div>
          }
          
          @case ('running') {
            <!-- 執行監控 -->
            <div class="space-y-6">
              @if (activeExecutions().length === 0) {
                <div class="text-center py-16">
                  <div class="text-6xl mb-4">🚀</div>
                  <p class="text-xl text-white mb-2">暫無執行中的任務</p>
                  <p class="text-slate-400 mb-6">前往「一鍵啟動」創建新任務</p>
                  <button (click)="activeTab.set('start')"
                          class="px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-400 transition-colors">
                    🚀 創建任務
                  </button>
                </div>
              } @else {
                @for (execution of activeExecutions(); track execution.id) {
                  @if (true) {
                    <div class="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
                      <!-- 任務頭部 -->
                      <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
                        <div class="flex items-center gap-4">
                          <div class="w-3 h-3 rounded-full"
                               [class.bg-green-500]="execution.status === 'running'"
                               [class.bg-yellow-500]="execution.status === 'planning'"
                               [class.bg-orange-500]="execution.status === 'paused'"
                               [class.animate-pulse]="execution.status === 'running'">
                          </div>
                          <div>
                            <div class="font-medium text-white">{{ execution.goal }}</div>
                            <div class="text-xs text-slate-400 flex items-center gap-2">
                              <span>{{ getStatusLabel(execution.status) }}</span>
                              <span>·</span>
                              <span>{{ getExecutionDuration(execution) }}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div class="flex items-center gap-2">
                          @if (execution.status === 'planning') {
                            <button (click)="confirmStart(execution)"
                                    class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-400 transition-colors text-sm">
                              ▶️ 確認開始
                            </button>
                          }
                          @if (execution.status === 'running') {
                            <button (click)="pauseExecution(execution)"
                                    class="px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors text-sm">
                              ⏸️ 暫停
                            </button>
                          }
                          @if (execution.status === 'paused') {
                            <button (click)="resumeExecution(execution)"
                                    class="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm">
                              ▶️ 繼續
                            </button>
                          }
                          <button (click)="stopExecution(execution)"
                                  class="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm">
                            ⏹️ 停止
                          </button>
                        </div>
                      </div>
                      
                      <!-- 任務內容 -->
                      <div class="p-4">
                        <!-- 意圖分析結果 -->
                        @if (execution.intent) {
                          <div class="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                            <div class="flex items-center gap-2 text-purple-400 text-sm mb-2">
                              <span>🤖</span> AI 理解
                            </div>
                            <p class="text-white">{{ execution.intent.goal }}</p>
                            <div class="flex items-center gap-4 mt-2 text-xs text-slate-400">
                              <span>置信度: {{ execution.intent.confidence }}%</span>
                              <span>目標群體: {{ execution.intent.targetAudience }}</span>
                              <span>建議週期: {{ execution.intent.suggestedDuration }}</span>
                            </div>
                          </div>
                        }
                        
                        <!-- 角色團隊 -->
                        @if (execution.roles.length > 0) {
                          <div class="mb-4">
                            <div class="text-sm text-slate-400 mb-2">🎭 AI 團隊</div>
                            <div class="flex flex-wrap gap-2">
                              @for (role of execution.roles; track role.id) {
                                <div class="flex items-center gap-2 px-3 py-2 bg-slate-700/50 rounded-lg">
                                  <span class="text-xl">{{ role.icon }}</span>
                                  <div>
                                    <div class="text-sm text-white">{{ role.name }}</div>
                                    <div class="text-xs text-slate-400">{{ role.purpose }}</div>
                                  </div>
                                </div>
                              }
                            </div>
                          </div>
                        }
                        
                        <!-- 策略階段 -->
                        @if (execution.strategy) {
                          <div class="mb-4">
                            <div class="text-sm text-slate-400 mb-2">📋 執行階段</div>
                            <div class="flex items-center gap-2">
                              @for (phase of execution.strategy.phases; track phase.id; let i = $index) {
                                <div class="flex items-center">
                                  <div class="px-3 py-1.5 rounded-lg text-xs"
                                       [class.bg-green-500]="i < execution.stats.currentPhase"
                                       [class.text-white]="i < execution.stats.currentPhase"
                                       [class.bg-purple-500]="i === execution.stats.currentPhase"
                                       [class.text-white]="i === execution.stats.currentPhase"
                                       [class.bg-slate-700]="i > execution.stats.currentPhase"
                                       [class.text-slate-400]="i > execution.stats.currentPhase">
                                    {{ phase.name }}
                                  </div>
                                  @if (i < execution.strategy!.phases.length - 1) {
                                    <svg class="w-4 h-4 text-slate-500 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                    </svg>
                                  }
                                </div>
                              }
                            </div>
                          </div>
                        }
                        
                        <!-- 實時統計 -->
                        <div class="grid grid-cols-4 gap-4">
                          <div class="p-3 bg-slate-700/30 rounded-lg text-center">
                            <div class="text-lg font-bold text-cyan-400">{{ execution.stats.messagesSent }}</div>
                            <div class="text-xs text-slate-400">已發消息</div>
                          </div>
                          <div class="p-3 bg-slate-700/30 rounded-lg text-center">
                            <div class="text-lg font-bold text-green-400">{{ execution.stats.responsesReceived }}</div>
                            <div class="text-xs text-slate-400">收到回覆</div>
                          </div>
                          <div class="p-3 bg-slate-700/30 rounded-lg text-center">
                            <div class="text-lg font-bold text-purple-400">{{ execution.stats.interestScore }}%</div>
                            <div class="text-xs text-slate-400">興趣度</div>
                          </div>
                          <div class="p-3 bg-slate-700/30 rounded-lg text-center">
                            <div class="text-lg font-bold text-yellow-400">{{ execution.stats.currentPhase + 1 }}/{{ execution.strategy?.phases?.length || 0 }}</div>
                            <div class="text-xs text-slate-400">當前階段</div>
                          </div>
                        </div>
                        
                        <!-- 最新分析 -->
                        @if (execution.stats.lastAnalysis) {
                          <div class="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                            <div class="flex items-center gap-2 text-cyan-400 text-sm mb-2">
                              <span>🔍</span> AI 最新分析
                            </div>
                            <p class="text-white text-sm">{{ execution.stats.lastAnalysis.suggestions.reasoning }}</p>
                            <div class="text-xs text-slate-400 mt-2">
                              建議: {{ execution.stats.lastAnalysis.suggestions.topicSuggestion }}
                            </div>
                          </div>
                        }
                        
                        <!-- 高意向客戶建群 -->
                        @if (execution.stats.interestScore >= 50 && execution.status === 'running') {
                          <div class="mt-4 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl">
                            <div class="flex items-center justify-between">
                              <div>
                                <div class="flex items-center gap-2 text-amber-400 text-sm mb-1">
                                  <span>🎯</span> 高意向客戶
                                </div>
                                <p class="text-white text-sm">檢測到高意向客戶，建議創建專屬群組進行多角色協作成交</p>
                              </div>
                              <button (click)="createGroupForExecution(execution)"
                                      class="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-400 hover:to-orange-400 transition-all text-sm font-medium flex items-center gap-2 whitespace-nowrap">
                                <span>👥</span> 一鍵建群
                              </button>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }
                }
              }
            </div>
          }
          
          @case ('history') {
            <!-- 歷史記錄 -->
            <div class="space-y-4">
              @if (completedExecutions().length === 0) {
                <div class="text-center py-16">
                  <div class="text-6xl mb-4">📜</div>
                  <p class="text-xl text-white mb-2">暫無歷史記錄</p>
                  <p class="text-slate-400">完成的任務會顯示在這裡</p>
                </div>
              } @else {
                @for (execution of completedExecutions(); track execution.id) {
                  <div class="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="font-medium text-white">{{ execution.goal }}</div>
                        <div class="text-sm text-slate-400 mt-1">
                          {{ execution.intent?.goal }} · {{ execution.stats.messagesSent }} 條消息
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="text-sm text-slate-400">{{ formatDate(execution.stats.startTime) }}</div>
                        <div class="text-xs text-green-400">已完成</div>
                      </div>
                    </div>
                  </div>
                }
              }
            </div>
          }
        }
      </div>
      
      <!-- 策劃結果確認對話框 -->
      @if (showPlanningResult()) {
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-purple-500/30 overflow-hidden max-h-[90vh] overflow-y-auto">
            <!-- 頭部 -->
            <div class="p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-slate-700/50">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
                  🤖
                </div>
                <div>
                  <h2 class="text-xl font-bold text-white">AI 策劃完成！</h2>
                  <p class="text-slate-400">確認以下方案，即可開始執行</p>
                </div>
              </div>
            </div>
            
            <!-- 內容 -->
            @if (pendingExecution()) {
              <div class="p-6 space-y-6">
                <!-- 目標理解 -->
                <div class="p-4 bg-slate-800/50 rounded-xl">
                  <div class="text-sm text-slate-400 mb-2">🎯 AI 理解的目標</div>
                  <p class="text-white">{{ pendingExecution()?.intent?.goal }}</p>
                  <div class="flex items-center gap-4 mt-2 text-xs">
                    <span class="text-purple-400">置信度: {{ pendingExecution()?.intent?.confidence }}%</span>
                    <span class="text-cyan-400">建議週期: {{ pendingExecution()?.intent?.suggestedDuration }}</span>
                  </div>
                </div>
                
                <!-- 推薦團隊 -->
                <div>
                  <div class="text-sm text-slate-400 mb-3">🎭 AI 推薦的團隊</div>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    @for (role of pendingExecution()?.roles; track role.id) {
                      <div class="p-4 bg-slate-800/50 rounded-xl">
                        <div class="flex items-center gap-2 mb-2">
                          <span class="text-2xl">{{ role.icon }}</span>
                          <span class="text-white font-medium">{{ role.name }}</span>
                        </div>
                        <p class="text-xs text-slate-400">{{ role.purpose }}</p>
                        <p class="text-xs text-cyan-400 mt-1">{{ role.entryTiming }}</p>
                      </div>
                    }
                  </div>
                </div>
                
                <!-- 執行計劃 -->
                <div>
                  <div class="text-sm text-slate-400 mb-3">📋 執行計劃</div>
                  <div class="space-y-3">
                    @for (phase of pendingExecution()?.strategy?.phases; track phase.id; let i = $index) {
                      <div class="flex items-start gap-4 p-3 bg-slate-800/50 rounded-lg">
                        <div class="w-8 h-8 rounded-full bg-purple-500/30 text-purple-400 flex items-center justify-center flex-shrink-0">
                          {{ i + 1 }}
                        </div>
                        <div class="flex-1">
                          <div class="flex items-center justify-between">
                            <span class="text-white font-medium">{{ phase.name }}</span>
                            <span class="text-xs text-slate-400">{{ phase.duration }}</span>
                          </div>
                          <p class="text-sm text-slate-400 mt-1">{{ phase.goal }}</p>
                        </div>
                      </div>
                    }
                  </div>
                </div>
                
                <!-- AI 說明 -->
                <div class="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                  <div class="flex items-center gap-2 text-cyan-400 text-sm mb-2">
                    <span>💡</span> AI 會這樣做
                  </div>
                  <ul class="text-sm text-slate-300 space-y-1">
                    <li>• 像真人一樣在群裡聊天，聊生活、聊新聞</li>
                    <li>• 自然地引入產品話題，不生硬推銷</li>
                    <li>• 每 10 條消息分析一次，動態調整策略</li>
                    <li>• 根據客戶反應靈活切換角色</li>
                  </ul>
                </div>
              </div>
            }
            
            <!-- 底部按鈕 -->
            <div class="p-6 border-t border-slate-700/50 flex gap-3">
              <button (click)="cancelPendingExecution()"
                      class="flex-1 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors">
                取消
              </button>
              <button (click)="confirmPendingExecution()"
                      class="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                <span>▶️</span> 確認開始
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AiTeamHubComponent implements OnInit, OnDestroy {
  engine = inject(DynamicScriptEngineService);
  private toast = inject(ToastService);
  private autoGroup = inject(AutoGroupService);
  
  // 輸入：從 AI 營銷助手傳入的策略
  incomingStrategy = input<IncomingStrategy | null>(null);
  
  // UI 狀態
  activeTab = signal<HubTab>('start');
  userGoal = '';
  
  // 來自 AI 營銷助手的策略標記
  hasIncomingStrategy = signal(false);
  receivedStrategy: IncomingStrategy | null = null;  // 保存完整策略
  
  constructor() {
    // 監聽傳入策略變化
    effect(() => {
      const strategy = this.incomingStrategy();
      if (strategy) {
        this.handleIncomingStrategy(strategy);
      }
    });
  }
  
  // 策劃結果對話框
  showPlanningResult = signal(false);
  pendingExecution = signal<ExecutionState | null>(null);
  
  // 預設目標
  presetGoals = [
    {
      id: 'convert',
      icon: '💰',
      name: '促進成交',
      description: '多角色配合，促成猶豫客戶下單',
      goal: '讓群裡對產品感興趣但還沒下單的潛在客戶完成購買'
    },
    {
      id: 'recovery',
      icon: '💝',
      name: '挽回流失',
      description: '關懷回訪 + 特別優惠',
      goal: '挽回已經流失或沉默的老客戶，讓他們重新購買'
    },
    {
      id: 'active',
      icon: '🎉',
      name: '社群活躍',
      description: '話題引導 + 互動激勵',
      goal: '提升社群活躍度，讓群成員更願意互動和討論'
    },
    {
      id: 'support',
      icon: '🔧',
      name: '售後服務',
      description: '快速響應 + 問題解決',
      goal: '高效處理客戶售後問題，提升客戶滿意度'
    },
    {
      id: 'nurture',
      icon: '🌱',
      name: '潛客培育',
      description: '價值輸出 + 信任建立',
      goal: '通過持續的價值輸出培育潛在客戶，提升購買意願'
    },
    {
      id: 'brand',
      icon: '🏆',
      name: '品牌推廣',
      description: '口碑傳播 + 形象建立',
      goal: '提升品牌知名度和好感度，讓更多人了解我們'
    }
  ];
  
  // 計算屬性
  runningCount = computed(() => 
    this.engine.executions().filter(e => e.status === 'running').length
  );
  
  todayMessages = computed(() => {
    // TODO: 從後端獲取今日消息數
    return this.engine.executions()
      .filter(e => e.status === 'running')
      .reduce((sum, e) => sum + e.stats.messagesSent, 0);
  });
  
  todayConversions = computed(() => {
    // TODO: 從後端獲取今日成交數
    return 0;
  });
  
  completedExecutions = computed(() =>
    this.engine.executions().filter(e => e.status === 'completed')
  );
  
  activeExecutions = computed(() =>
    this.engine.executions().filter(e => 
      e.status === 'running' || e.status === 'planning' || e.status === 'paused'
    )
  );
  
  ngOnInit() {
    // 初始化
  }
  
  ngOnDestroy() {
    // 清理
  }
  
  // ============ 方法 ============
  
  onEnterKey(event: Event) {
    const keyEvent = event as KeyboardEvent;
    if (!keyEvent.shiftKey) {
      keyEvent.preventDefault();
      this.startFromGoal();
    }
  }
  
  async startFromGoal() {
    if (!this.userGoal.trim()) return;
    
    const result = await this.engine.startFromOnePhrase(this.userGoal);
    if (result) {
      this.pendingExecution.set(result);
      this.showPlanningResult.set(true);
    }
  }
  
  quickStart(goal: string) {
    this.userGoal = goal;
    this.startFromGoal();
  }
  
  confirmPendingExecution() {
    const execution = this.pendingExecution();
    if (execution) {
      this.engine.confirmAndStart(execution.id);
      this.showPlanningResult.set(false);
      this.pendingExecution.set(null);
      this.userGoal = '';
      this.activeTab.set('running');
    }
  }
  
  cancelPendingExecution() {
    const execution = this.pendingExecution();
    if (execution) {
      this.engine.stopExecution(execution.id);
    }
    this.showPlanningResult.set(false);
    this.pendingExecution.set(null);
  }
  
  confirmStart(execution: ExecutionState) {
    this.engine.confirmAndStart(execution.id);
  }
  
  pauseExecution(execution: ExecutionState) {
    this.engine.pauseExecution(execution.id);
    this.toast.info('已暫停執行');
  }
  
  resumeExecution(execution: ExecutionState) {
    this.engine.resumeExecution(execution.id);
    this.toast.success('已恢復執行');
  }
  
  stopExecution(execution: ExecutionState) {
    if (confirm('確定要停止這個任務嗎？')) {
      this.engine.stopExecution(execution.id);
      this.toast.info('任務已停止');
    }
  }
  
  getStatusLabel(status: ExecutionState['status']): string {
    const labels: Record<ExecutionState['status'], string> = {
      idle: '待命',
      planning: '策劃中',
      running: '執行中',
      paused: '已暫停',
      completed: '已完成'
    };
    return labels[status];
  }
  
  getExecutionDuration(execution: ExecutionState): string {
    const start = new Date(execution.stats.startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} 分鐘`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} 小時`;
    return `${Math.floor(diffHours / 24)} 天`;
  }
  
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  /**
   * 為執行中的任務創建協作群組
   */
  async createGroupForExecution(execution: ExecutionState) {
    if (!execution.targetUsers || execution.targetUsers.length === 0) {
      this.toast.warning('暫無高意向目標用戶，請繼續等待...');
      return;
    }
    
    // 獲取高意向客戶
    const highIntentUsers = execution.targetUsers.filter(u => u.intentScore >= 50);
    
    if (highIntentUsers.length === 0) {
      this.toast.warning('暫無高意向用戶可建群');
      return;
    }
    
    // 取第一個高意向用戶
    const targetUser = highIntentUsers[0];
    
    // 構建建群請求
    const request: CreateGroupRequest = {
      targetCustomer: {
        id: targetUser.id.toString(),
        username: targetUser.username,
        firstName: targetUser.firstName || targetUser.username
      },
      groupName: this.autoGroup.generateGroupName(
        targetUser.firstName || targetUser.username || 'VIP',
        '{客戶名}專屬服務群'
      ),
      roleAccounts: execution.roles.map((role, idx) => ({
        roleId: role.id,
        accountId: role.accountId || idx + 1  // 使用角色配置的帳號 ID
      })),
      scriptId: undefined,  // 使用 AI 自由對話模式
      inviteMessage: `您好 ${targetUser.firstName || ''}！我們為您創建了專屬服務群組，我們的專業團隊將為您提供一對一服務。`,
      intentScore: targetUser.intentScore
    };
    
    this.toast.info('正在為高意向客戶創建專屬群組...');
    
    const result = await this.autoGroup.createGroup(request);
    
    if (result.success) {
      this.toast.success(`🎉 已為 ${targetUser.firstName || targetUser.username} 創建專屬群組！`);
    } else {
      this.toast.error(`建群失敗: ${result.error}`);
    }
  }
  
  /**
   * 處理從 AI 營銷助手傳入的策略
   */
  private handleIncomingStrategy(strategy: IncomingStrategy) {
    console.log('[AITeamHub] 收到 AI 營銷助手策略:', strategy);
    
    this.hasIncomingStrategy.set(true);
    this.receivedStrategy = strategy;  // 保存完整策略
    
    // 自動生成目標描述
    const goalParts = [
      `在${strategy.industry}行業`,
      `尋找${strategy.targetAudience}`,
    ];
    
    if (strategy.keywords.highIntent.length > 0) {
      goalParts.push(`關注「${strategy.keywords.highIntent.slice(0, 3).join('、')}」等關鍵詞`);
    }
    
    if (strategy.customerProfile.needs.length > 0) {
      goalParts.push(`滿足客戶「${strategy.customerProfile.needs[0]}」的需求`);
    }
    
    const generatedGoal = goalParts.join('，') + '，促成成交';
    this.userGoal = generatedGoal;
    
    // 顯示提示
    this.toast.success(`🤖 已接收 AI 營銷助手的策略！行業: ${strategy.industry}`);
    
    // 切換到啟動頁
    this.activeTab.set('start');
    
    // 自動開始策劃（使用完整策略）
    setTimeout(() => {
      this.startWithFullStrategy();
    }, 500);
  }
  
  /**
   * 清除傳入策略標記
   */
  clearIncomingStrategy() {
    this.hasIncomingStrategy.set(false);
    this.receivedStrategy = null;
    this.userGoal = '';
  }
  
  /**
   * 使用完整策略啟動（從 AI 營銷助手傳入）
   */
  async startWithFullStrategy() {
    if (!this.receivedStrategy) {
      // 回退到普通模式
      this.startFromGoal();
      return;
    }
    
    const strategy = this.receivedStrategy;
    
    // 使用完整策略創建執行狀態
    const result = await this.engine.startWithMarketingStrategy(
      this.userGoal,
      strategy
    );
    
    if (result) {
      this.pendingExecution.set(result);
      this.showPlanningResult.set(true);
      
      // 清除傳入策略標記（已使用）
      this.hasIncomingStrategy.set(false);
    }
  }
}
