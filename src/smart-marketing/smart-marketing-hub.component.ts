/**
 * 智能營銷中心組件
 * Smart Marketing Hub Component
 * 
 * 整合多角色協作和AI中心的功能，提供統一的營銷任務入口
 * 
 * 設計原則：
 * - 一鍵啟動：用戶選擇目標 → AI 自動完成後續
 * - 統一監控：所有任務統計在同一面板
 * - 流程簡化：從 8+ 步驟減少到 2 步驟
 */

import { Component, signal, computed, inject, OnInit, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavBridgeService } from '../services/nav-bridge.service';
import { MarketingTaskService } from '../services/marketing-task.service';
import { MarketingStateService } from '../services/marketing-state.service';
import { AICenterService } from '../ai-center/ai-center.service';
import { MultiRoleService } from '../multi-role/multi-role.service';
import { DynamicScriptEngineService } from '../multi-role/dynamic-script-engine.service';
import { ToastService } from '../toast.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { TaskWizardComponent } from './task-wizard.component';
import { ConversionFunnelComponent } from './conversion-funnel.component';
import { 
  MarketingTask, 
  GoalType, 
  ExecutionMode,
  GOAL_TYPE_CONFIG,
  TaskStatus
} from '../models/marketing-task.models';

@Component({
  selector: 'app-smart-marketing-hub',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskWizardComponent, ConversionFunnelComponent],
  template: `
    <div class="smart-marketing-hub h-full flex flex-col bg-slate-900">
      <!-- 頂部標題欄 -->
      <div class="p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-2xl">🚀</span>
              智能營銷中心
            </h1>
            
            <!-- AI 狀態 -->
            <div class="flex items-center gap-2">
              @if (aiConnected()) {
                <span class="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
                  <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  AI 就緒
                </span>
              } @else {
                <span class="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                  未配置 AI
                </span>
              }
              
              @if (activeTasks().length > 0) {
                <span class="flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                  <span class="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                  {{ activeTasks().length }} 任務執行中
                </span>
              }
            </div>
          </div>
          
          <!-- 快速統計 -->
          <div class="flex items-center gap-4 px-4 py-2 bg-slate-800/80 rounded-xl border border-slate-700/50">
            <div class="text-center">
              <div class="text-lg font-bold text-cyan-400">{{ todayStats().contacted }}</div>
              <div class="text-xs text-slate-500">今日接觸</div>
            </div>
            <div class="w-px h-8 bg-slate-700"></div>
            <div class="text-center">
              <div class="text-lg font-bold text-emerald-400">{{ todayStats().converted }}</div>
              <div class="text-xs text-slate-500">今日轉化</div>
            </div>
            <div class="w-px h-8 bg-slate-700"></div>
            <div class="text-center">
              <div class="text-lg font-bold text-purple-400">{{ overallConversionRate() }}%</div>
              <div class="text-xs text-slate-500">轉化率</div>
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
      
      <!-- 內容區 -->
      <div class="flex-1 overflow-y-auto p-4">
        @switch (activeTab()) {
          @case ('quick-start') {
            <!-- 快速啟動區 -->
            <div class="max-w-4xl mx-auto space-y-6">
              
              <!-- 一鍵啟動卡片 -->
              <div class="bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 rounded-2xl border border-purple-500/30 p-6">
                <div class="text-center mb-6">
                  <h2 class="text-2xl font-bold text-white mb-2">🎯 選擇您的營銷目標</h2>
                  <p class="text-slate-400">AI 將自動配置角色、選擇策略並開始執行</p>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  @for (goal of goalTypes; track goal.type) {
                    <button (click)="quickStartTask(goal.type)"
                            class="p-6 rounded-xl transition-all text-center border-2 hover:scale-105"
                            [class.border-purple-500]="selectedGoal() === goal.type"
                            [class.bg-purple-500/20]="selectedGoal() === goal.type"
                            [class.border-slate-600]="selectedGoal() !== goal.type"
                            [class.bg-slate-800/50]="selectedGoal() !== goal.type"
                            [class.hover:border-purple-400]="selectedGoal() !== goal.type">
                      <div class="text-4xl mb-3">{{ goal.icon }}</div>
                      <div class="font-semibold text-white mb-1">{{ goal.label }}</div>
                      <div class="text-xs text-slate-400">{{ goal.description }}</div>
                    </button>
                  }
                </div>
                
                @if (selectedGoal()) {
                  <div class="mt-6 flex justify-center">
                    <button (click)="launchQuickTask()"
                            [disabled]="isLaunching()"
                            class="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg rounded-xl hover:opacity-90 transition-all shadow-lg disabled:opacity-50 flex items-center gap-3">
                      @if (isLaunching()) {
                        <span class="animate-spin">⟳</span>
                        AI 正在配置...
                      } @else {
                        <span>🚀</span>
                        一鍵啟動
                      }
                    </button>
                  </div>
                }
              </div>
              
              <!-- AI 自動化開關（整合自 AI 中心） -->
              <div class="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl border border-cyan-500/30 p-6">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-xl bg-cyan-500/30 flex items-center justify-center text-3xl">
                      🧠
                    </div>
                    <div>
                      <h3 class="text-xl font-bold text-white flex items-center gap-2">
                        AI 智能托管
                        <span class="px-2 py-0.5 text-xs bg-cyan-500/30 text-cyan-400 rounded-full">整合</span>
                      </h3>
                      <p class="text-slate-400 text-sm">AI 自動處理新 Lead、回覆私信、調整策略</p>
                    </div>
                  </div>
                  <button (click)="toggleAIHosting()"
                          class="relative w-16 h-8 rounded-full transition-all"
                          [class.bg-cyan-500]="aiHostingEnabled()"
                          [class.bg-slate-600]="!aiHostingEnabled()">
                    <span class="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform"
                          [class.translate-x-8]="aiHostingEnabled()"></span>
                  </button>
                </div>
                
                @if (aiHostingEnabled()) {
                  <div class="mt-6 pt-6 border-t border-cyan-500/30">
                    <div class="grid grid-cols-3 gap-4 text-center">
                      <div class="p-3 bg-slate-800/50 rounded-xl">
                        <div class="text-2xl mb-1">🎯</div>
                        <div class="text-sm font-medium text-white">意向評估</div>
                        <div class="text-xs text-slate-400">實時分析</div>
                      </div>
                      <div class="p-3 bg-slate-800/50 rounded-xl">
                        <div class="text-2xl mb-1">🎭</div>
                        <div class="text-sm font-medium text-white">動態人格</div>
                        <div class="text-xs text-slate-400">自動匹配</div>
                      </div>
                      <div class="p-3 bg-slate-800/50 rounded-xl">
                        <div class="text-2xl mb-1">👥</div>
                        <div class="text-sm font-medium text-white">智能協作</div>
                        <div class="text-xs text-slate-400">自動引入</div>
                      </div>
                    </div>
                  </div>
                }
              </div>
              
              <!-- 執行模式選擇 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
                  <span>⚙️</span> 執行模式偏好
                </h3>
                <div class="grid grid-cols-3 gap-4">
                  @for (mode of executionModes; track mode.id) {
                    <button (click)="setPreferredMode(mode.id)"
                            class="p-4 rounded-xl border-2 transition-all text-center"
                            [class.border-purple-500]="preferredMode() === mode.id"
                            [class.bg-purple-500/20]="preferredMode() === mode.id"
                            [class.border-slate-600]="preferredMode() !== mode.id"
                            [class.bg-slate-700/50]="preferredMode() !== mode.id">
                      <div class="text-2xl mb-2">{{ mode.icon }}</div>
                      <div class="font-medium text-white text-sm">{{ mode.label }}</div>
                      <div class="text-xs text-slate-400 mt-1">{{ mode.description }}</div>
                    </button>
                  }
                </div>
              </div>
            </div>
          }
          
          @case ('tasks') {
            <!-- 任務列表 -->
            <div class="max-w-5xl mx-auto space-y-4">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-bold text-white">營銷任務</h2>
                <div class="flex gap-2">
                  <select [(ngModel)]="taskFilter"
                          class="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                    <option value="all">全部任務</option>
                    <option value="running">執行中</option>
                    <option value="completed">已完成</option>
                    <option value="draft">草稿</option>
                  </select>
                  <button (click)="createNewTask()"
                          class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30">
                    + 新建任務
                  </button>
                </div>
              </div>
              
              @if (filteredTasks().length === 0) {
                <div class="text-center py-16 text-slate-400">
                  <div class="text-6xl mb-4">📋</div>
                  <p class="text-lg mb-2">暫無營銷任務</p>
                  <p class="text-sm mb-4">使用上方「快速啟動」創建您的第一個任務</p>
                  <button (click)="activeTab.set('quick-start')"
                          class="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-400">
                    🚀 開始創建
                  </button>
                </div>
              } @else {
                <div class="space-y-3">
                  @for (task of filteredTasks(); track task.id) {
                    <div class="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                      <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                             [class.bg-emerald-500/20]="task.status === 'running'"
                             [class.bg-purple-500/20]="task.status === 'completed'"
                             [class.bg-slate-700]="task.status === 'draft' || task.status === 'paused'">
                          {{ getGoalIcon(task.goalType) }}
                        </div>
                        <div>
                          <div class="font-medium text-white">{{ task.name }}</div>
                          <div class="text-sm text-slate-400 flex items-center gap-2">
                            <span>{{ getGoalLabel(task.goalType) }}</span>
                            <span class="text-slate-600">·</span>
                            <span>{{ task.stats.totalContacts }} 目標</span>
                            <span class="text-slate-600">·</span>
                            <span class="text-emerald-400">{{ task.stats.converted }} 轉化</span>
                          </div>
                        </div>
                      </div>
                      
                      <div class="flex items-center gap-4">
                        <!-- 狀態標籤 -->
                        <span class="px-3 py-1 rounded-full text-xs font-medium"
                              [class.bg-emerald-500/20]="task.status === 'running'"
                              [class.text-emerald-400]="task.status === 'running'"
                              [class.bg-purple-500/20]="task.status === 'completed'"
                              [class.text-purple-400]="task.status === 'completed'"
                              [class.bg-yellow-500/20]="task.status === 'paused'"
                              [class.text-yellow-400]="task.status === 'paused'"
                              [class.bg-slate-600]="task.status === 'draft'"
                              [class.text-slate-300]="task.status === 'draft'">
                          {{ getStatusLabel(task.status) }}
                        </span>
                        
                        <!-- 操作按鈕 -->
                        <div class="flex gap-2">
                          @if (task.status === 'running') {
                            <button (click)="pauseTask(task.id)"
                                    class="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm">
                              暫停
                            </button>
                          } @else if (task.status === 'paused' || task.status === 'draft') {
                            <button (click)="startTask(task.id)"
                                    class="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm">
                              啟動
                            </button>
                          }
                          <button (click)="viewTaskDetails(task)"
                                  class="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm">
                            詳情
                          </button>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
          
          @case ('monitor') {
            <!-- 統一監控面板 -->
            <div class="max-w-6xl mx-auto space-y-6">
              <!-- 總體指標 -->
              <div class="grid grid-cols-5 gap-4">
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div class="text-3xl font-bold text-purple-400">{{ overallStats().totalTasks }}</div>
                  <div class="text-sm text-slate-400">總任務數</div>
                </div>
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div class="text-3xl font-bold text-cyan-400">{{ overallStats().activeTasks }}</div>
                  <div class="text-sm text-slate-400">活躍任務</div>
                </div>
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div class="text-3xl font-bold text-emerald-400">{{ overallStats().totalConverted }}</div>
                  <div class="text-sm text-slate-400">總轉化</div>
                </div>
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div class="text-3xl font-bold text-amber-400">{{ overallConversionRate() }}%</div>
                  <div class="text-sm text-slate-400">轉化率</div>
                </div>
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
                  <div class="text-3xl font-bold text-pink-400">{{ overallStats().totalMessagesSent }}</div>
                  <div class="text-sm text-slate-400">消息發送</div>
                </div>
              </div>
              
              <!-- 🆕 優化 2-1: 轉化漏斗 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <app-conversion-funnel
                  [targets]="funnelTargets()"
                  [contacted]="overallStats().totalContacted"
                  [replied]="funnelReplied()"
                  [converted]="overallStats().totalConverted"
                  [period]="'本週數據'"
                  [showAnalysis]="true" />
              </div>
              
              <!-- 趨勢圖表區域 -->
              <div class="grid grid-cols-2 gap-6">
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                  <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
                    <span>📈</span> 轉化趨勢
                  </h3>
                  <div class="h-48 flex items-end justify-around gap-2">
                    @for (day of last7DaysData(); track day.label) {
                      <div class="flex flex-col items-center gap-2">
                        <div class="w-12 rounded-t transition-all"
                             [style.height.px]="day.converted * 15 + 20"
                             [class.bg-purple-500]="true"></div>
                        <span class="text-xs text-slate-400">{{ day.label }}</span>
                      </div>
                    }
                  </div>
                </div>
                
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                  <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
                    <span>🎯</span> 目標類型分布
                  </h3>
                  <div class="space-y-3">
                    @for (goal of goalDistribution(); track goal.type) {
                      <div class="flex items-center gap-3">
                        <span class="text-xl">{{ goal.icon }}</span>
                        <div class="flex-1">
                          <div class="flex justify-between text-sm mb-1">
                            <span class="text-white">{{ goal.label }}</span>
                            <span class="text-slate-400">{{ goal.count }} 任務</span>
                          </div>
                          <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div class="h-full bg-purple-500 rounded-full transition-all"
                                 [style.width.%]="goal.percentage"></div>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>
              
              <!-- AI 系統狀態 -->
              <div class="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-xl border border-cyan-500/30 p-6">
                <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
                  <span>🧠</span> AI 系統狀態
                </h3>
                <div class="grid grid-cols-4 gap-4">
                  <div class="bg-slate-800/50 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-cyan-400">{{ aiStats().conversations }}</div>
                    <div class="text-xs text-slate-400">今日對話</div>
                  </div>
                  <div class="bg-slate-800/50 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-purple-400">{{ aiStats().intentsRecognized }}</div>
                    <div class="text-xs text-slate-400">意圖識別</div>
                  </div>
                  <div class="bg-slate-800/50 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-emerald-400">{{ aiStats().avgResponseTime }}ms</div>
                    <div class="text-xs text-slate-400">平均響應</div>
                  </div>
                  <div class="bg-slate-800/50 rounded-lg p-4 text-center">
                    <div class="text-2xl font-bold text-amber-400">¥{{ aiStats().cost.toFixed(2) }}</div>
                    <div class="text-xs text-slate-400">今日成本</div>
                  </div>
                </div>
              </div>
            </div>
          }
          
          @case ('settings') {
            <!-- 設置頁面 -->
            <div class="max-w-3xl mx-auto space-y-6">
              <!-- AI 引擎設置 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
                  <span>🤖</span> AI 引擎配置
                </h3>
                <button (click)="goToAICenter()"
                        class="w-full p-4 bg-slate-700/50 rounded-xl text-left hover:bg-slate-700 transition-colors flex items-center justify-between">
                  <div>
                    <div class="font-medium text-white">模型配置</div>
                    <div class="text-sm text-slate-400">配置 AI 模型、API Key 等</div>
                  </div>
                  <span class="text-slate-400">→</span>
                </button>
              </div>
              
              <!-- 角色庫入口 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
                  <span>🎭</span> 角色管理
                </h3>
                <button (click)="goToRoleLibrary()"
                        class="w-full p-4 bg-slate-700/50 rounded-xl text-left hover:bg-slate-700 transition-colors flex items-center justify-between">
                  <div>
                    <div class="font-medium text-white">角色庫與劇本</div>
                    <div class="text-sm text-slate-400">管理角色定義、劇本模板</div>
                  </div>
                  <span class="text-slate-400">→</span>
                </button>
              </div>
              
              <!-- 默認設置 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 class="font-semibold text-white mb-6 flex items-center gap-2">
                  <span>⚙️</span> 默認設置
                </h3>
                
                  <div class="space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="text-sm text-slate-400 block mb-2">意向閾值</label>
                        <div class="flex items-center gap-2">
                          <input type="range" 
                                 [value]="intentThreshold()"
                                 (input)="updateIntentThreshold($any($event.target).valueAsNumber)"
                                 min="50" max="100" step="5"
                                 class="flex-1">
                          <span class="text-white w-12 text-right">{{ intentThreshold() }}%</span>
                        </div>
                      </div>
                      <div>
                        <label class="text-sm text-slate-400 block mb-2">最大同時任務</label>
                        <input type="number"
                               [value]="maxConcurrentTasks()"
                               (input)="updateMaxConcurrentTasks($any($event.target).valueAsNumber)"
                               min="1" max="10"
                               class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                      </div>
                    </div>
                  
                  <button (click)="saveSettings()"
                          class="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity">
                    💾 保存設置
                  </button>
                </div>
              </div>
            </div>
          }
        }
      </div>
      
      <!-- 🆕 優化 1-1: 任務創建向導 -->
      @if (showWizard()) {
        <app-task-wizard 
          [initialGoal]="wizardInitialGoal()"
          (close)="closeWizard()"
          (taskCreated)="onTaskCreated($event)" />
      }
    </div>
  `
})
export class SmartMarketingHubComponent implements OnInit {
  private taskService = inject(MarketingTaskService);
  private stateService = inject(MarketingStateService);
  private aiService = inject(AICenterService);
  private multiRoleService = inject(MultiRoleService);
  private dynamicEngine = inject(DynamicScriptEngineService);
  private toast = inject(ToastService);
  private ipc = inject(ElectronIpcService);
  private navBridge = inject(NavBridgeService);
  
  // ============ 狀態 ============
  /** 由路由傳入的預設 Tab（策略規劃→quick-start，自動執行→tasks） */
  initialTab = input<'quick-start' | 'tasks' | 'monitor' | 'settings' | undefined>(undefined);
  
  activeTab = signal<'quick-start' | 'tasks' | 'monitor' | 'settings'>('quick-start');
  selectedGoal = signal<GoalType | null>(null);
  isLaunching = signal(false);
  preferredMode = signal<ExecutionMode>('hybrid');
  
  // 🆕 優化 1-1: 向導狀態
  showWizard = signal(false);
  wizardInitialGoal = signal<GoalType | null>(null);
  
  // 🆕 P2-1: 使用統一狀態服務管理 AI 托管狀態
  aiHostingEnabled = computed(() => this.stateService.aiHostingEnabled());
  
  // 🆕 Phase 4-1: 使用統一設置
  intentThreshold = computed(() => this.stateService.intentThreshold());
  maxConcurrentTasks = computed(() => this.stateService.maxConcurrentTasks());
  
  taskFilter = 'all';
  
  // ============ Tab 配置 ============
  
  tabs = [
    { id: 'quick-start' as const, icon: '🚀', label: '快速啟動' },
    { id: 'tasks' as const, icon: '📋', label: '任務列表' },
    { id: 'monitor' as const, icon: '📊', label: '效果監控' },
    { id: 'settings' as const, icon: '⚙️', label: '設置' }
  ];
  
  // ============ 目標類型配置 ============
  
  goalTypes = [
    { type: 'conversion' as GoalType, icon: '💰', label: '促進首單', description: '轉化潛在客戶' },
    { type: 'retention' as GoalType, icon: '💝', label: '挽回流失', description: '召回老客戶' },
    { type: 'engagement' as GoalType, icon: '🎉', label: '社群活躍', description: '提升互動' },
    { type: 'support' as GoalType, icon: '🔧', label: '售後服務', description: '解決問題' }
  ];
  
  executionModes = [
    { id: 'scripted' as ExecutionMode, icon: '📜', label: '劇本模式', description: '按預設流程' },
    { id: 'hybrid' as ExecutionMode, icon: '🔄', label: '混合模式', description: '推薦' },
    { id: 'scriptless' as ExecutionMode, icon: '🤖', label: '無劇本', description: 'AI 即興' }
  ];
  
  // ============ 計算屬性 ============
  
  aiConnected = computed(() => this.aiService.isConnected());
  
  activeTasks = computed(() => this.taskService.activeTasks());
  
  todayStats = computed(() => this.taskService.todayStats());
  
  overallStats = computed(() => this.taskService.getOverallStats());
  
  overallConversionRate = computed(() => this.taskService.overallConversionRate());
  
  filteredTasks = computed(() => {
    const tasks = this.taskService.tasks();
    if (this.taskFilter === 'all') return tasks;
    return tasks.filter(t => t.status === this.taskFilter);
  });
  
  aiStats = computed(() => this.aiService.stats().today);
  
  // 🆕 優化 2-1: 漏斗數據
  funnelTargets = computed(() => this.overallStats().totalContacted + 50);
  funnelReplied = computed(() => Math.floor(this.overallStats().totalContacted * 0.35));
  
  last7DaysData = computed(() => {
    // TODO: 從後端獲取真實數據
    const days = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
    return days.map((label, i) => ({
      label,
      converted: Math.floor(Math.random() * 10) + 1
    }));
  });
  
  goalDistribution = computed(() => {
    const tasksByGoal = this.taskService.tasksByGoal();
    const total = this.taskService.tasks().length || 1;
    
    return this.goalTypes.map(goal => ({
      ...goal,
      count: tasksByGoal[goal.type]?.length || 0,
      percentage: ((tasksByGoal[goal.type]?.length || 0) / total) * 100
    }));
  });
  
  // ============ 生命週期 ============
  
  // 🔧 Phase9-5: 視圖名稱 → Tab 映射（NavBridge 驅動）
  private static readonly VIEW_TAB_MAP: Record<string, 'quick-start' | 'tasks' | 'monitor' | 'settings'> = {
    'ai-assistant': 'quick-start',
    'marketing-hub': 'quick-start',
    'ai-team': 'tasks',
    'marketing-tasks': 'tasks',
    'marketing-monitor': 'monitor',
    'marketing-report': 'settings',
  };

  constructor() {
    // 路由切換時同步 Tab（策略規劃 ↔ 自動執行）
    effect(() => {
      const tab = this.initialTab();
      if (tab) this.activeTab.set(tab);
    });
  }

  ngOnInit(): void {
    this.loadSettings();
    
    // 🔧 優先使用路由傳入的 initialTab（策略規劃 / 自動執行 對應不同 Tab）
    const fromRoute = this.initialTab();
    if (fromRoute) {
      this.activeTab.set(fromRoute);
      return;
    }
    // 否則根據 NavBridge 的視圖名稱切換到對應 tab
    const currentView = this.navBridge.currentView();
    const targetTab = SmartMarketingHubComponent.VIEW_TAB_MAP[currentView];
    if (targetTab) {
      this.activeTab.set(targetTab);
    }
  }
  
  // ============ 快速啟動 ============
  
  quickStartTask(goalType: GoalType): void {
    // 🆕 優化 1-1: 打開向導而不是直接設置
    this.wizardInitialGoal.set(goalType);
    this.showWizard.set(true);
  }
  
  // 🆕 優化 1-1: 向導操作方法
  openWizard(): void {
    this.wizardInitialGoal.set(null);
    this.showWizard.set(true);
  }
  
  closeWizard(): void {
    this.showWizard.set(false);
    this.wizardInitialGoal.set(null);
  }
  
  onTaskCreated(taskId: string): void {
    this.activeTab.set('tasks');
    this.taskService.loadTasks();
  }
  
  async launchQuickTask(): Promise<void> {
    const goal = this.selectedGoal();
    if (!goal) return;
    
    this.isLaunching.set(true);
    
    try {
      const taskId = await this.taskService.quickCreate(goal);
      
      if (taskId) {
        // 自動啟動任務
        this.taskService.startTask(taskId);
        
        this.toast.success(`🚀 ${GOAL_TYPE_CONFIG[goal].label} 任務已啟動！`);
        this.selectedGoal.set(null);
        this.activeTab.set('tasks');
      } else {
        this.toast.error('任務創建失敗');
      }
    } catch (error) {
      this.toast.error('啟動失敗，請重試');
    } finally {
      this.isLaunching.set(false);
    }
  }
  
  // ============ AI 托管 ============
  
  toggleAIHosting(): void {
    // 🆕 P2-1: 使用統一狀態服務管理 AI 托管狀態
    const newValue = !this.stateService.aiHostingEnabled();
    this.stateService.setAiHostingEnabled(newValue);
    
    this.toast.success(newValue ? '🧠 AI 智能托管已啟用' : 'AI 智能托管已關閉');
  }
  
  setPreferredMode(mode: ExecutionMode): void {
    this.preferredMode.set(mode);
    localStorage.setItem('preferred_execution_mode', mode);
  }
  
  // ============ 任務操作 ============
  
  createNewTask(): void {
    // 🆕 優化 1-1: 打開向導
    this.openWizard();
  }
  
  startTask(taskId: string): void {
    this.taskService.startTask(taskId);
    this.toast.success('任務已啟動');
  }
  
  pauseTask(taskId: string): void {
    this.taskService.pauseTask(taskId);
    this.toast.info('任務已暫停');
  }
  
  viewTaskDetails(task: MarketingTask): void {
    this.taskService.setCurrentTask(task);
    // TODO: 打開詳情面板
    this.toast.info(`查看任務: ${task.name}`);
  }
  
  // ============ 導航 ============
  
  goToAICenter(): void {
    this.ipc.send('navigate-to', { path: '/ai-engine' });
  }
  
  goToRoleLibrary(): void {
    this.ipc.send('navigate-to', { path: '/multi-role' });
  }
  
  // ============ 設置 ============
  
  loadSettings(): void {
    // 🆕 Phase 4-1: 所有設置由 MarketingStateService 管理
    // 只需加載本地執行模式偏好
    const mode = localStorage.getItem('preferred_execution_mode') as ExecutionMode;
    if (mode) this.preferredMode.set(mode);
  }
  
  saveSettings(): void {
    // 🆕 Phase 4-1: 使用統一狀態服務保存設置
    this.stateService.saveSettingsToBackend();
    this.toast.success('設置已保存');
  }
  
  // 🆕 Phase 4-1: 設置更新方法
  updateIntentThreshold(value: number): void {
    this.stateService.setIntentThreshold(value);
  }
  
  updateMaxConcurrentTasks(value: number): void {
    this.stateService.setMaxConcurrentTasks(value);
  }
  
  // ============ 輔助方法 ============
  
  getGoalIcon(goalType: GoalType): string {
    return GOAL_TYPE_CONFIG[goalType]?.icon || '🎯';
  }
  
  getGoalLabel(goalType: GoalType): string {
    return GOAL_TYPE_CONFIG[goalType]?.label || goalType;
  }
  
  getStatusLabel(status: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
      draft: '草稿',
      scheduled: '已計劃',
      running: '執行中',
      paused: '已暫停',
      completed: '已完成',
      failed: '失敗'
    };
    return labels[status] || status;
  }
}
