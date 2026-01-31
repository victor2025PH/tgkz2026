/**
 * 協作監控儀表板組件
 * Collaboration Dashboard Component
 * 
 * 實時監控多角色協作狀態和統計
 * 
 * 🔄 P1-1: 整合統一營銷任務數據源
 * - 從 MarketingTaskService 獲取統一的任務統計
 * - 保留現有協作群組監控功能
 * - 新增 AI 系統狀態顯示
 */

import { Component, signal, computed, inject, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiRoleService } from '../multi-role.service';
import { AutoGroupService } from '../auto-group.service';
import { CollaborationExecutorService } from '../collaboration-executor.service';
import { DynamicScriptEngineService, ExecutionState, ExecutionMode } from '../dynamic-script-engine.service';
import { IpcService } from '../../ipc.service';
import { ToastService } from '../../toast.service';
import { CollaborationGroup } from '../multi-role.models';
// 🆕 整合統一營銷任務服務
import { MarketingTaskService } from '../../services/marketing-task.service';
import { AICenterService } from '../../ai-center/ai-center.service';
import { MarketingTask, GoalType, GOAL_TYPE_CONFIG } from '../../models/marketing-task.models';

interface DashboardStats {
  totalGroups: number;
  activeGroups: number;
  completedGroups: number;
  totalConversions: number;
  conversionRate: number;
  totalMessagesSent: number;
  avgMessagesPerGroup: number;
  todayGroups: number;
  todayConversions: number;
}

@Component({
  selector: 'app-collaboration-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="collaboration-dashboard p-6 bg-slate-900 min-h-full">
      <!-- 🆕 轉化通知彈窗 -->
      @if (showConversionAlert() && conversionAlertData()) {
        <div class="fixed top-4 right-4 z-50 animate-slide-in-right">
          <div class="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 shadow-2xl max-w-sm">
            <div class="flex items-start gap-3">
              <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-2xl">
                🎯
              </div>
              <div class="flex-1">
                <div class="font-bold text-white text-lg">高轉化信號!</div>
                <div class="text-white/90 text-sm mt-1">
                  <span class="font-medium">{{ conversionAlertData()?.userName }}</span>
                </div>
                <div class="text-white/80 text-xs mt-1">{{ conversionAlertData()?.signal }}</div>
                <div class="flex gap-2 mt-3">
                  <button (click)="focusOnUser(conversionAlertData()!.userId)"
                          class="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg">
                    查看對話
                  </button>
                  <button (click)="dismissConversionAlert()"
                          class="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 text-xs rounded-lg">
                    關閉
                  </button>
                </div>
              </div>
              <button (click)="dismissConversionAlert()" class="text-white/60 hover:text-white">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      }
      
      <!-- 標題 -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-2xl font-bold text-white flex items-center gap-3">
            <span class="text-2xl">📊</span>
            協作監控中心
          </h2>
          <p class="text-slate-400 mt-1">實時監控多角色協作狀態</p>
        </div>
        
        <div class="flex items-center gap-3">
          <button (click)="refreshData()"
                  class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 flex items-center gap-2">
            <svg class="w-4 h-4" [class.animate-spin]="isRefreshing()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            刷新
          </button>
          
          <div class="text-sm text-slate-500">
            最後更新: {{ lastUpdate() | date:'HH:mm:ss' }}
          </div>
        </div>
      </div>
      
      <!-- 🆕 P1-1: 視圖切換 -->
      <div class="flex items-center gap-2 mb-4">
        <button (click)="viewMode.set('unified')"
                class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                [class.bg-purple-500]="viewMode() === 'unified'"
                [class.text-white]="viewMode() === 'unified'"
                [class.bg-slate-700]="viewMode() !== 'unified'"
                [class.text-slate-400]="viewMode() !== 'unified'">
          📊 統一任務視圖
        </button>
        <button (click)="viewMode.set('legacy')"
                class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                [class.bg-purple-500]="viewMode() === 'legacy'"
                [class.text-white]="viewMode() === 'legacy'"
                [class.bg-slate-700]="viewMode() !== 'legacy'"
                [class.text-slate-400]="viewMode() !== 'legacy'">
          🎭 協作群組視圖
        </button>
        
        <!-- AI 連接狀態 -->
        <div class="ml-auto flex items-center gap-2">
          @if (aiConnected()) {
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
      
      <!-- 🆕 P1-1: 統一任務視圖統計卡片 -->
      @if (viewMode() === 'unified') {
        <div class="grid grid-cols-6 gap-4 mb-8">
          <!-- 總任務數 -->
          <div class="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-4 border border-purple-500/30">
            <div class="text-3xl font-bold text-purple-400">{{ unifiedStats().totalTasks }}</div>
            <div class="text-sm text-slate-400 mt-1">總任務數</div>
          </div>
          
          <!-- 活躍任務 -->
          <div class="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-xl p-4 border border-emerald-500/30">
            <div class="flex items-center gap-2">
              <div class="text-3xl font-bold text-emerald-400">{{ unifiedStats().activeTasks }}</div>
              @if (unifiedStats().activeTasks > 0) {
                <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              }
            </div>
            <div class="text-sm text-slate-400 mt-1">執行中</div>
          </div>
          
          <!-- 總接觸數 -->
          <div class="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 rounded-xl p-4 border border-cyan-500/30">
            <div class="text-3xl font-bold text-cyan-400">{{ unifiedStats().totalContacted }}</div>
            <div class="text-sm text-slate-400 mt-1">總接觸</div>
          </div>
          
          <!-- 總轉化 -->
          <div class="bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-xl p-4 border border-amber-500/30">
            <div class="text-3xl font-bold text-amber-400">{{ unifiedStats().totalConverted }}</div>
            <div class="text-sm text-slate-400 mt-1">總轉化</div>
          </div>
          
          <!-- 轉化率 -->
          <div class="bg-gradient-to-br from-pink-500/20 to-pink-600/10 rounded-xl p-4 border border-pink-500/30">
            <div class="text-3xl font-bold text-pink-400">{{ unifiedConversionRate() }}%</div>
            <div class="text-sm text-slate-400 mt-1">轉化率</div>
            <div class="h-1.5 bg-slate-700 rounded-full mt-2 overflow-hidden">
              <div class="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all"
                   [style.width.%]="unifiedConversionRate()"></div>
            </div>
          </div>
          
          <!-- 消息發送 -->
          <div class="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-4 border border-blue-500/30">
            <div class="text-3xl font-bold text-blue-400">{{ unifiedStats().totalMessagesSent }}</div>
            <div class="text-sm text-slate-400 mt-1">消息發送</div>
          </div>
        </div>
        
        <!-- 🆕 AI 系統狀態 -->
        <div class="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl border border-cyan-500/30 p-4 mb-8">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-white flex items-center gap-2">
              <span>🧠</span> AI 系統狀態
            </h3>
            <div class="flex items-center gap-2 text-sm text-slate-400">
              今日統計
            </div>
          </div>
          <div class="grid grid-cols-5 gap-4">
            <div class="bg-slate-800/50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-cyan-400">{{ aiStats().today.conversations }}</div>
              <div class="text-xs text-slate-400">對話數</div>
            </div>
            <div class="bg-slate-800/50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-purple-400">{{ aiStats().today.intentsRecognized }}</div>
              <div class="text-xs text-slate-400">意圖識別</div>
            </div>
            <div class="bg-slate-800/50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-emerald-400">{{ aiStats().today.conversions }}</div>
              <div class="text-xs text-slate-400">AI 轉化</div>
            </div>
            <div class="bg-slate-800/50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-amber-400">{{ aiStats().today.avgResponseTime }}ms</div>
              <div class="text-xs text-slate-400">響應時間</div>
            </div>
            <div class="bg-slate-800/50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-pink-400">¥{{ aiStats().today.cost.toFixed(2) }}</div>
              <div class="text-xs text-slate-400">AI 成本</div>
            </div>
          </div>
        </div>
        
        <!-- 🆕 統一任務列表 -->
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 mb-8">
          <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
            <h3 class="font-semibold text-white flex items-center gap-2">
              <span>📋</span> 營銷任務
            </h3>
            <div class="flex items-center gap-2">
              <span class="text-sm text-slate-400">{{ unifiedTasks().length }} 個任務</span>
              <button (click)="goToSmartMarketingHub()"
                      class="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30">
                + 新建任務
              </button>
            </div>
          </div>
          
          <div class="divide-y divide-slate-700/50 max-h-[400px] overflow-y-auto">
            @for (task of unifiedTasks().slice(0, 10); track task.id) {
              <div class="p-4 hover:bg-slate-700/30 transition-colors">
                <div class="flex items-center justify-between">
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
                    <!-- 進度指標 -->
                    <div class="text-right">
                      <div class="text-lg font-bold" 
                           [class.text-emerald-400]="task.stats.conversionRate >= 20"
                           [class.text-amber-400]="task.stats.conversionRate >= 10 && task.stats.conversionRate < 20"
                           [class.text-slate-400]="task.stats.conversionRate < 10">
                        {{ task.stats.conversionRate || 0 }}%
                      </div>
                      <div class="text-xs text-slate-500">轉化率</div>
                    </div>
                    
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
                      {{ getTaskStatusLabel(task.status) }}
                    </span>
                    
                    <!-- 操作 -->
                    <div class="flex gap-2">
                      @if (task.status === 'running') {
                        <button (click)="pauseUnifiedTask(task.id)"
                                class="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/30">
                          暫停
                        </button>
                      } @else if (task.status === 'paused' || task.status === 'draft') {
                        <button (click)="startUnifiedTask(task.id)"
                                class="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30">
                          啟動
                        </button>
                      }
                    </div>
                  </div>
                </div>
              </div>
            }
            
            @if (unifiedTasks().length === 0) {
              <div class="p-8 text-center text-slate-500">
                <div class="text-4xl mb-2">📋</div>
                <div>暫無營銷任務</div>
                <button (click)="goToSmartMarketingHub()"
                        class="mt-4 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30">
                  🚀 創建第一個任務
                </button>
              </div>
            }
          </div>
        </div>
      }
      
      <!-- 舊版統計卡片（協作群組視圖） -->
      @if (viewMode() === 'legacy') {
        <div class="grid grid-cols-5 gap-4 mb-8">
          <!-- 總群組數 -->
          <div class="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-4 border border-purple-500/30">
            <div class="text-4xl font-bold text-purple-400">{{ stats().totalGroups }}</div>
            <div class="text-sm text-slate-400 mt-1">總群組數</div>
            <div class="text-xs text-purple-400/70 mt-2">
              今日 +{{ stats().todayGroups }}
            </div>
          </div>
          
          <!-- 活躍協作 -->
          <div class="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-xl p-4 border border-emerald-500/30">
            <div class="flex items-center gap-2">
              <div class="text-4xl font-bold text-emerald-400">{{ stats().activeGroups }}</div>
              @if (stats().activeGroups > 0) {
                <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              }
            </div>
            <div class="text-sm text-slate-400 mt-1">活躍協作</div>
            <div class="text-xs text-emerald-400/70 mt-2">
              運行中
            </div>
          </div>
          
          <!-- 已完成 -->
          <div class="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 rounded-xl p-4 border border-cyan-500/30">
            <div class="text-4xl font-bold text-cyan-400">{{ stats().completedGroups }}</div>
            <div class="text-sm text-slate-400 mt-1">已完成</div>
            <div class="text-xs text-cyan-400/70 mt-2">
              歷史累計
            </div>
          </div>
          
          <!-- 成功轉化 -->
          <div class="bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-xl p-4 border border-amber-500/30">
            <div class="text-4xl font-bold text-amber-400">{{ stats().totalConversions }}</div>
            <div class="text-sm text-slate-400 mt-1">成功轉化</div>
            <div class="text-xs text-amber-400/70 mt-2">
              今日 +{{ stats().todayConversions }}
            </div>
          </div>
          
          <!-- 轉化率 -->
          <div class="bg-gradient-to-br from-pink-500/20 to-pink-600/10 rounded-xl p-4 border border-pink-500/30">
            <div class="text-4xl font-bold text-pink-400">{{ stats().conversionRate | number:'1.1-1' }}%</div>
            <div class="text-sm text-slate-400 mt-1">轉化率</div>
            <div class="h-1.5 bg-slate-700 rounded-full mt-3 overflow-hidden">
              <div class="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-500"
                   [style.width.%]="stats().conversionRate">
              </div>
            </div>
          </div>
        </div>
      }
      
      <!-- 🆕 AI 團隊執行狀態 -->
      @if (currentExecution()) {
        <div class="mb-8 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/30 overflow-hidden">
          <div class="p-4 border-b border-purple-500/20 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
              <h3 class="text-lg font-semibold text-white">🤖 AI 團隊執行中</h3>
              <span class="px-2 py-0.5 bg-purple-500/30 text-purple-300 text-xs rounded-full">
                {{ currentExecution()?.mode === 'scriptless' ? '無劇本' : currentExecution()?.mode === 'hybrid' ? '混合' : '劇本' }}模式
              </span>
            </div>
            <div class="flex items-center gap-2">
              @if (currentExecution()?.status === 'paused') {
                <button (click)="resumeExecution()" class="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30">
                  ▶️ 恢復
                </button>
              } @else {
                <button (click)="pauseExecution()" class="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-sm hover:bg-amber-500/30">
                  ⏸️ 暫停
                </button>
              }
              <button (click)="stopExecution()" class="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30">
                ⏹️ 停止
              </button>
            </div>
          </div>
          
          <div class="p-4">
            <!-- 執行目標 -->
            <div class="mb-4">
              <div class="text-sm text-slate-400 mb-1">營銷目標</div>
              <div class="text-white font-medium">{{ currentExecution()?.goal }}</div>
            </div>
            
            <!-- 統計數據 -->
            <div class="grid grid-cols-6 gap-3 mb-4">
              <div class="bg-slate-800/50 rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-purple-400">{{ currentExecution()?.stats?.messagesSent || 0 }}</div>
                <div class="text-xs text-slate-400">已發送</div>
              </div>
              <div class="bg-slate-800/50 rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-emerald-400">{{ currentExecution()?.stats?.responsesReceived || 0 }}</div>
                <div class="text-xs text-slate-400">客戶回覆</div>
              </div>
              <div class="bg-slate-800/50 rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-cyan-400">{{ getReplyRate() | number:'1.0-0' }}%</div>
                <div class="text-xs text-slate-400">回覆率</div>
              </div>
              <div class="bg-slate-800/50 rounded-lg p-3 text-center">
                <div class="text-2xl font-bold" [class.text-emerald-400]="(currentExecution()?.stats?.interestScore || 0) >= 60"
                     [class.text-amber-400]="(currentExecution()?.stats?.interestScore || 0) >= 30 && (currentExecution()?.stats?.interestScore || 0) < 60"
                     [class.text-slate-400]="(currentExecution()?.stats?.interestScore || 0) < 30">
                  {{ currentExecution()?.stats?.interestScore || 0 }}
                </div>
                <div class="text-xs text-slate-400">意向分</div>
              </div>
              <div class="bg-slate-800/50 rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-cyan-400">{{ currentExecution()?.roles?.length || 0 }}</div>
                <div class="text-xs text-slate-400">參與角色</div>
              </div>
              <div class="bg-slate-800/50 rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-pink-400">{{ currentExecution()?.targetUsers?.length || 0 }}</div>
                <div class="text-xs text-slate-400">目標用戶</div>
              </div>
            </div>
            
            <!-- 🆕 轉化漏斗進度 -->
            @if (currentExecution()?.conversionFunnel) {
              <div class="mb-4 p-3 bg-slate-800/30 rounded-lg">
                <div class="text-sm text-slate-400 mb-2">轉化漏斗</div>
                <div class="flex items-center gap-1">
                  @for (stage of conversionStages; track stage.id) {
                    <div class="flex-1 relative">
                      <div class="h-2 rounded-full transition-all"
                           [class.bg-emerald-500]="isStageCompleted(stage.id)"
                           [class.bg-purple-500]="isCurrentStage(stage.id)"
                           [class.bg-slate-700]="!isStageCompleted(stage.id) && !isCurrentStage(stage.id)">
                      </div>
                      <div class="text-xs text-center mt-1"
                           [class.text-emerald-400]="isStageCompleted(stage.id)"
                           [class.text-purple-400]="isCurrentStage(stage.id)"
                           [class.text-slate-500]="!isStageCompleted(stage.id) && !isCurrentStage(stage.id)">
                        {{ stage.label }}
                      </div>
                    </div>
                    @if (!$last) {
                      <div class="w-4 h-px bg-slate-600"></div>
                    }
                  }
                </div>
              </div>
            }
            
            <!-- 🆕 任務隊列進度 -->
            @if (queueProgress()) {
              <div class="mb-4 p-3 bg-slate-800/50 rounded-lg">
                <div class="flex items-center justify-between mb-2">
                  <div class="text-sm text-slate-400">隊列進度</div>
                  <div class="text-sm text-white font-medium">
                    {{ queueProgress()?.processed }}/{{ queueProgress()?.total }}
                    <span class="text-slate-500 ml-1">({{ queueProgress()?.progress }}%)</span>
                  </div>
                </div>
                <!-- 進度條 -->
                <div class="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
                  <div class="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                       [style.width.%]="queueProgress()?.progress || 0"></div>
                </div>
                <!-- 當前處理用戶 -->
                @if (queueProgress()?.current) {
                  <div class="flex items-center justify-between text-sm">
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      <span class="text-white">正在處理：{{ queueProgress()?.current?.name }}</span>
                    </div>
                    <div class="flex gap-2">
                      <button (click)="skipCurrentUser()" class="px-2 py-1 bg-slate-600 text-slate-300 text-xs rounded hover:bg-slate-500">
                        跳過
                      </button>
                      <button (click)="markAsConverted()" class="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded hover:bg-emerald-500/30">
                        標記轉化
                      </button>
                    </div>
                  </div>
                }
                <!-- 待處理數量 -->
                <div class="text-xs text-slate-500 mt-2">
                  待處理：{{ queueProgress()?.pending }} 人
                </div>
                
                <!-- 🆕 結果統計 -->
                @if (queueProgress()?.completed && queueProgress()!.completed!.length > 0) {
                  <div class="mt-3 pt-3 border-t border-slate-700">
                    <div class="text-xs text-slate-400 mb-2">處理結果</div>
                    <div class="flex flex-wrap gap-2">
                      @if (getResultCount('converted') > 0) {
                        <span class="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                          🎯 轉化 {{ getResultCount('converted') }}
                        </span>
                      }
                      @if (getResultCount('interested') > 0) {
                        <span class="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full flex items-center gap-1">
                          ⭐ 有興趣 {{ getResultCount('interested') }}
                        </span>
                      }
                      @if (getResultCount('neutral') > 0) {
                        <span class="px-2 py-1 bg-slate-500/20 text-slate-400 text-xs rounded-full flex items-center gap-1">
                          😐 中立 {{ getResultCount('neutral') }}
                        </span>
                      }
                      @if (getResultCount('rejected') > 0) {
                        <span class="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1">
                          ❌ 拒絕 {{ getResultCount('rejected') }}
                        </span>
                      }
                      @if (getResultCount('no_response') > 0) {
                        <span class="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full flex items-center gap-1">
                          💤 無回應 {{ getResultCount('no_response') }}
                        </span>
                      }
                    </div>
                    <!-- 查看詳情按鈕 -->
                    <button (click)="showResultsPanel.set(true)" 
                            class="mt-2 text-xs text-purple-400 hover:text-purple-300">
                      查看詳細結果 →
                    </button>
                  </div>
                }
              </div>
            }
            
            <!-- 目標用戶列表 -->
            @if (currentExecution()?.targetUsers && currentExecution()!.targetUsers!.length > 0) {
              <div class="mb-4">
                <div class="text-sm text-slate-400 mb-2">目標用戶</div>
                <div class="flex flex-wrap gap-2">
                  @for (user of currentExecution()!.targetUsers!.slice(0, 10); track user.id) {
                    <span class="px-2 py-1 bg-slate-700 rounded-full text-xs text-slate-300 flex items-center gap-1">
                      <span class="w-2 h-2 rounded-full" 
                            [class.bg-green-500]="user.intentScore >= 60"
                            [class.bg-amber-500]="user.intentScore >= 40 && user.intentScore < 60"
                            [class.bg-slate-500]="user.intentScore < 40"></span>
                      {{ user.firstName || user.username || user.id }}
                    </span>
                  }
                  @if (currentExecution()!.targetUsers!.length > 10) {
                    <span class="px-2 py-1 bg-slate-600 rounded-full text-xs text-slate-400">
                      +{{ currentExecution()!.targetUsers!.length - 10 }} 更多
                    </span>
                  }
                </div>
              </div>
            }
            
            <!-- 最近對話 + 展開按鈕 -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <div class="text-sm text-slate-400">最近對話</div>
                <button (click)="toggleConversationPanel()" 
                        class="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                  {{ showConversationPanel() ? '收起' : '展開完整對話' }}
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                       [class.rotate-180]="showConversationPanel()">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
              </div>
              @if (currentExecution()?.messageHistory && currentExecution()!.messageHistory!.length > 0) {
                <div class="space-y-2 max-h-48 overflow-y-auto">
                  @for (msg of currentExecution()!.messageHistory!.slice(-5).reverse(); track msg.timestamp) {
                    <div class="flex gap-3 p-2 rounded-lg"
                         [class.bg-slate-700/50]="!msg.isFromCustomer"
                         [class.bg-emerald-500/10]="msg.isFromCustomer">
                      <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                           [class.bg-purple-500/30]="!msg.isFromCustomer"
                           [class.text-purple-400]="!msg.isFromCustomer"
                           [class.bg-emerald-500/30]="msg.isFromCustomer"
                           [class.text-emerald-400]="msg.isFromCustomer">
                        {{ msg.isFromCustomer ? '👤' : '🤖' }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="text-xs text-slate-400 mb-0.5">
                          {{ msg.isFromCustomer ? '客戶' : msg.role }}
                        </div>
                        <div class="text-sm text-white truncate">{{ msg.content }}</div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="text-center py-4 text-slate-500 text-sm">暫無對話記錄</div>
              }
            </div>
          </div>
        </div>
      }
      
      <!-- 🆕 完整對話面板（滑出抽屜） -->
      @if (showConversationPanel() && currentExecution()) {
        <div class="fixed inset-0 z-50 flex">
          <!-- 遮罩 -->
          <div class="absolute inset-0 bg-black/50" (click)="toggleConversationPanel()"></div>
          
          <!-- 對話面板 -->
          <div class="absolute right-0 top-0 bottom-0 w-[500px] bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl">
            <!-- 標題欄 -->
            <div class="p-4 border-b border-slate-700 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-xl">💬</span>
                <div>
                  <h3 class="text-lg font-semibold text-white">完整對話記錄</h3>
                  <p class="text-xs text-slate-400">{{ currentExecution()?.goal }}</p>
                </div>
              </div>
              <button (click)="toggleConversationPanel()" class="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <!-- 對話列表 -->
            <div #conversationContainer class="flex-1 overflow-y-auto p-4 space-y-3">
              @for (msg of currentExecution()!.messageHistory || []; track msg.timestamp) {
                <div class="flex gap-3" [class.flex-row-reverse]="!msg.isFromCustomer">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                       [class.bg-purple-500/30]="!msg.isFromCustomer"
                       [class.bg-emerald-500/30]="msg.isFromCustomer">
                    {{ msg.isFromCustomer ? '👤' : '🤖' }}
                  </div>
                  <div class="max-w-[70%] rounded-xl p-3"
                       [class.bg-purple-500/20]="!msg.isFromCustomer"
                       [class.bg-emerald-500/20]="msg.isFromCustomer">
                    <div class="text-xs mb-1"
                         [class.text-purple-400]="!msg.isFromCustomer"
                         [class.text-emerald-400]="msg.isFromCustomer">
                      {{ msg.isFromCustomer ? '客戶' : msg.role }}
                      <span class="text-slate-500 ml-2">{{ formatTime(msg.timestamp) }}</span>
                    </div>
                    <div class="text-sm text-white whitespace-pre-wrap">{{ msg.content }}</div>
                  </div>
                </div>
              }
              
              @if (!currentExecution()?.messageHistory?.length) {
                <div class="text-center py-8 text-slate-500">
                  <div class="text-4xl mb-2">💬</div>
                  <div>對話尚未開始</div>
                </div>
              }
            </div>
            
            <!-- 🆕 手動介入區域 -->
            <div class="border-t border-slate-700 p-4">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-xs px-2 py-0.5 rounded-full"
                      [class.bg-amber-500/20]="isManualMode()"
                      [class.text-amber-400]="isManualMode()"
                      [class.bg-emerald-500/20]="!isManualMode()"
                      [class.text-emerald-400]="!isManualMode()">
                  {{ isManualMode() ? '🖐️ 手動模式' : '🤖 AI 自動模式' }}
                </span>
                <button (click)="toggleManualMode()" 
                        class="text-xs text-purple-400 hover:text-purple-300">
                  {{ isManualMode() ? '切換自動' : '接管對話' }}
                </button>
              </div>
              
              <!-- 選擇角色 -->
              @if (isManualMode()) {
                <div class="mb-3">
                  <label class="text-xs text-slate-400 mb-1 block">選擇角色</label>
                  <select [(ngModel)]="manualSendRole" 
                          class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm">
                    @for (role of currentExecution()?.roles || []; track $index) {
                      <option [value]="role.id">{{ role.name }} ({{ role.type }})</option>
                    }
                  </select>
                </div>
              }
              
              <!-- 消息輸入 -->
              <div class="flex gap-2">
                <input [(ngModel)]="manualMessage"
                       (keydown.enter)="sendManualMessage()"
                       [disabled]="!isManualMode()"
                       placeholder="{{ isManualMode() ? '輸入消息並發送...' : '啟用手動模式後可發送消息' }}"
                       class="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm 
                              placeholder:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <button (click)="sendManualMessage()" 
                        [disabled]="!isManualMode() || !manualMessage.trim()"
                        class="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 
                               disabled:opacity-50 disabled:cursor-not-allowed">
                  發送
                </button>
              </div>
              
              <!-- AI 建議 -->
              @if (isManualMode() && aiSuggestion()) {
                <div class="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div class="text-xs text-purple-400 mb-1">💡 AI 建議：</div>
                  <div class="text-sm text-white">{{ aiSuggestion() }}</div>
                  <button (click)="useAiSuggestion()" 
                          class="mt-2 text-xs text-purple-400 hover:text-purple-300">
                    使用此建議
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      }
      
      <!-- 🆕 結果統計面板 -->
      @if (showResultsPanel()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" (click)="showResultsPanel.set(false)"></div>
          <div class="relative bg-slate-900 rounded-xl border border-slate-700 w-[700px] max-h-[80vh] overflow-hidden shadow-2xl">
            <!-- 標題欄 -->
            <div class="p-4 border-b border-slate-700 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-xl">📊</span>
                <h3 class="text-lg font-semibold text-white">隊列執行結果</h3>
              </div>
              <button (click)="showResultsPanel.set(false)" class="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <!-- 統計概覽 -->
            <div class="p-4 border-b border-slate-700">
              <div class="grid grid-cols-5 gap-3">
                <div class="bg-emerald-500/10 rounded-lg p-3 text-center border border-emerald-500/30">
                  <div class="text-2xl font-bold text-emerald-400">{{ getResultCount('converted') }}</div>
                  <div class="text-xs text-emerald-400/70">轉化成功</div>
                </div>
                <div class="bg-amber-500/10 rounded-lg p-3 text-center border border-amber-500/30">
                  <div class="text-2xl font-bold text-amber-400">{{ getResultCount('interested') }}</div>
                  <div class="text-xs text-amber-400/70">有興趣</div>
                </div>
                <div class="bg-slate-500/10 rounded-lg p-3 text-center border border-slate-500/30">
                  <div class="text-2xl font-bold text-slate-400">{{ getResultCount('neutral') }}</div>
                  <div class="text-xs text-slate-400/70">中立</div>
                </div>
                <div class="bg-red-500/10 rounded-lg p-3 text-center border border-red-500/30">
                  <div class="text-2xl font-bold text-red-400">{{ getResultCount('rejected') }}</div>
                  <div class="text-xs text-red-400/70">拒絕</div>
                </div>
                <div class="bg-gray-500/10 rounded-lg p-3 text-center border border-gray-500/30">
                  <div class="text-2xl font-bold text-gray-400">{{ getResultCount('no_response') }}</div>
                  <div class="text-xs text-gray-400/70">無回應</div>
                </div>
              </div>
              
              <!-- 轉化率 -->
              <div class="mt-4 flex items-center gap-4">
                <div class="flex-1">
                  <div class="text-sm text-slate-400 mb-1">轉化率</div>
                  <div class="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                         [style.width.%]="getConversionRate()"></div>
                  </div>
                </div>
                <div class="text-2xl font-bold text-emerald-400">{{ getConversionRate() | number:'1.1-1' }}%</div>
              </div>
            </div>
            
            <!-- 用戶列表 -->
            <div class="p-4 max-h-[400px] overflow-y-auto">
              <table class="w-full">
                <thead class="text-xs text-slate-400 border-b border-slate-700">
                  <tr>
                    <th class="text-left py-2 px-2">用戶</th>
                    <th class="text-left py-2 px-2">結果</th>
                    <th class="text-right py-2 px-2">消息數</th>
                    <th class="text-right py-2 px-2">時長</th>
                  </tr>
                </thead>
                <tbody class="text-sm">
                  @for (user of queueProgress()?.completed || []; track user.id) {
                    <tr class="border-b border-slate-800 hover:bg-slate-800/50">
                      <td class="py-2 px-2 text-white">{{ user.name }}</td>
                      <td class="py-2 px-2">
                        <span class="px-2 py-0.5 rounded-full text-xs"
                              [class.bg-emerald-500/20]="user.result === 'converted'"
                              [class.text-emerald-400]="user.result === 'converted'"
                              [class.bg-amber-500/20]="user.result === 'interested'"
                              [class.text-amber-400]="user.result === 'interested'"
                              [class.bg-slate-500/20]="user.result === 'neutral'"
                              [class.text-slate-400]="user.result === 'neutral'"
                              [class.bg-red-500/20]="user.result === 'rejected'"
                              [class.text-red-400]="user.result === 'rejected'"
                              [class.bg-gray-500/20]="user.result === 'no_response'"
                              [class.text-gray-400]="user.result === 'no_response'">
                          {{ getResultLabel(user.result) }}
                        </span>
                      </td>
                      <td class="py-2 px-2 text-right text-slate-300">{{ user.messagesExchanged }}</td>
                      <td class="py-2 px-2 text-right text-slate-400">{{ formatDuration(user.duration) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
              
              @if (!queueProgress()?.completed?.length) {
                <div class="text-center py-8 text-slate-500">暫無已完成用戶</div>
              }
            </div>
            
            <!-- 操作按鈕 -->
            <div class="p-4 border-t border-slate-700 flex justify-between">
              <button (click)="exportResults()" class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 flex items-center gap-2">
                <span>📥</span> 導出結果
              </button>
              <button (click)="showResultsPanel.set(false)" class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
                關閉
              </button>
            </div>
          </div>
        </div>
      }
      
      <!-- 圖表區域 -->
      <div class="grid grid-cols-3 gap-6 mb-8">
        <!-- 趨勢圖 -->
        <div class="col-span-2 bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white">協作趨勢</h3>
            <div class="flex gap-2">
              <button (click)="chartPeriod.set('week')"
                      class="px-3 py-1 text-sm rounded-lg"
                      [class.bg-purple-500]="chartPeriod() === 'week'"
                      [class.text-white]="chartPeriod() === 'week'"
                      [class.bg-slate-700]="chartPeriod() !== 'week'"
                      [class.text-slate-400]="chartPeriod() !== 'week'">
                7天
              </button>
              <button (click)="chartPeriod.set('month')"
                      class="px-3 py-1 text-sm rounded-lg"
                      [class.bg-purple-500]="chartPeriod() === 'month'"
                      [class.text-white]="chartPeriod() === 'month'"
                      [class.bg-slate-700]="chartPeriod() !== 'month'"
                      [class.text-slate-400]="chartPeriod() !== 'month'">
                30天
              </button>
            </div>
          </div>
          
          <!-- 簡化圖表展示 -->
          <div class="h-48 flex items-end gap-2">
            @for (day of chartData(); track day.date; let i = $index) {
              <div class="flex-1 flex flex-col items-center gap-1">
                <div class="w-full bg-slate-700 rounded-t relative flex flex-col justify-end"
                     [style.height.px]="Math.max(day.groups * 10, 4)"
                     [class.bg-gradient-to-t]="true"
                     [class.from-purple-600]="true"
                     [class.to-purple-400]="true">
                  <div class="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-slate-400">
                    {{ day.groups }}
                  </div>
                </div>
                <div class="text-xs text-slate-500">{{ day.label }}</div>
              </div>
            }
          </div>
          
          <div class="flex justify-center gap-6 mt-4 text-sm">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded bg-purple-500"></div>
              <span class="text-slate-400">新建群組</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded bg-emerald-500"></div>
              <span class="text-slate-400">成功轉化</span>
            </div>
          </div>
        </div>
        
        <!-- 角色效果 -->
        <div class="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
          <h3 class="text-lg font-semibold text-white mb-4">角色效果排名</h3>
          
          <div class="space-y-3">
            @for (role of topRoles(); track $index; let i = $index) {
              <div class="flex items-center gap-3">
                <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                     [class.bg-amber-500]="i === 0"
                     [class.text-amber-900]="i === 0"
                     [class.bg-slate-600]="i === 1"
                     [class.text-white]="i === 1"
                     [class.bg-amber-700]="i === 2"
                     [class.text-amber-200]="i === 2"
                     [class.bg-slate-700]="i > 2"
                     [class.text-slate-400]="i > 2">
                  {{ i + 1 }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-white truncate">{{ role.name }}</div>
                  <div class="text-xs text-slate-500">{{ role.usageCount }} 次使用</div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-bold text-emerald-400">{{ role.successRate }}%</div>
                  <div class="text-xs text-slate-500">成功率</div>
                </div>
              </div>
            }
            
            @if (topRoles().length === 0) {
              <div class="text-center py-8 text-slate-500">暫無數據</div>
            }
          </div>
        </div>
      </div>
      
      <!-- 🆕 執行歷史 -->
      <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 mb-8">
        <div class="p-5 border-b border-slate-700/50 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white flex items-center gap-2">
            <span>📜</span> 執行歷史
          </h3>
          <div class="flex items-center gap-3">
            @if (selectedForCompare().length >= 2) {
              <button (click)="openABTestPanel()" 
                      class="px-3 py-1.5 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 flex items-center gap-1">
                <span>📊</span> 對比 ({{ selectedForCompare().length }})
              </button>
            }
            @if (selectedForCompare().length > 0) {
              <button (click)="clearCompareSelection()" class="text-xs text-slate-400 hover:text-white">
                清除選擇
              </button>
            }
            <span class="text-sm text-slate-400">共 {{ executionHistory().length }} 條記錄</span>
          </div>
        </div>
        
        <div class="divide-y divide-slate-700/50 max-h-[300px] overflow-y-auto">
          @for (exec of executionHistory().slice(0, 10); track exec.id) {
            <div class="p-4 hover:bg-slate-700/30 transition-colors cursor-pointer" (click)="viewExecutionHistory(exec)">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <!-- A/B 對比選擇框 -->
                  <input type="checkbox" 
                         [checked]="isSelectedForCompare(exec)"
                         (click)="$event.stopPropagation()"
                         (change)="toggleCompareSelection(exec)"
                         class="w-4 h-4 rounded border-slate-500 bg-slate-700 text-purple-500 focus:ring-purple-500">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center"
                       [class.bg-emerald-500/20]="exec.status === 'completed'"
                       [class.bg-red-500/20]="exec.status === 'failed'"
                       [class.bg-slate-500/20]="exec.status === 'idle'">
                    <span class="text-lg">
                      {{ exec.status === 'completed' ? '✅' : exec.status === 'failed' ? '❌' : '⏸️' }}
                    </span>
                  </div>
                  <div>
                    <div class="text-white font-medium">{{ exec.goal | slice:0:40 }}{{ exec.goal.length > 40 ? '...' : '' }}</div>
                    <div class="text-xs text-slate-400 flex items-center gap-2">
                      <span>{{ exec.stats.startTime | date:'MM/dd HH:mm' }}</span>
                      <span>•</span>
                      <span>{{ exec.mode === 'scriptless' ? '無劇本' : exec.mode === 'hybrid' ? '混合' : '劇本' }}</span>
                      <span>•</span>
                      <span>{{ exec.targetUsers?.length || 0 }} 目標</span>
                    </div>
                  </div>
                </div>
                
                <div class="flex items-center gap-4">
                  <div class="text-right">
                    <div class="text-sm font-bold text-purple-400">{{ exec.stats.messagesSent }} 消息</div>
                    <div class="text-xs text-slate-500">{{ exec.stats.responsesReceived }} 回覆</div>
                  </div>
                  <button (click)="viewExecutionHistory(exec); $event.stopPropagation()"
                          class="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          }
          
          @if (executionHistory().length === 0) {
            <div class="p-8 text-center text-slate-500">
              <div class="text-4xl mb-2">📝</div>
              <div>暫無執行歷史</div>
            </div>
          }
        </div>
      </div>
      
      <!-- 🆕 歷史回放面板 -->
      @if (showHistoryPanel() && selectedHistory()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" (click)="showHistoryPanel.set(false)"></div>
          <div class="relative bg-slate-900 rounded-xl border border-slate-700 w-[800px] max-h-[85vh] overflow-hidden shadow-2xl">
            <!-- 標題欄 -->
            <div class="p-4 border-b border-slate-700 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-xl">📜</span>
                <div>
                  <h3 class="text-lg font-semibold text-white">執行歷史回放</h3>
                  <p class="text-xs text-slate-400">{{ selectedHistory()?.goal }}</p>
                </div>
              </div>
              <button (click)="showHistoryPanel.set(false)" class="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <!-- 執行統計 -->
            <div class="p-4 border-b border-slate-700 grid grid-cols-5 gap-3">
              <div class="bg-slate-800 rounded-lg p-3 text-center">
                <div class="text-xl font-bold text-purple-400">{{ selectedHistory()?.stats?.messagesSent || 0 }}</div>
                <div class="text-xs text-slate-400">已發送</div>
              </div>
              <div class="bg-slate-800 rounded-lg p-3 text-center">
                <div class="text-xl font-bold text-emerald-400">{{ selectedHistory()?.stats?.responsesReceived || 0 }}</div>
                <div class="text-xs text-slate-400">客戶回覆</div>
              </div>
              <div class="bg-slate-800 rounded-lg p-3 text-center">
                <div class="text-xl font-bold text-cyan-400">{{ selectedHistory()?.roles?.length || 0 }}</div>
                <div class="text-xs text-slate-400">參與角色</div>
              </div>
              <div class="bg-slate-800 rounded-lg p-3 text-center">
                <div class="text-xl font-bold text-amber-400">{{ selectedHistory()?.stats?.analysisCount || 0 }}</div>
                <div class="text-xs text-slate-400">分析次數</div>
              </div>
              <div class="bg-slate-800 rounded-lg p-3 text-center">
                <div class="text-xl font-bold text-pink-400">{{ selectedHistory()?.targetUsers?.length || 0 }}</div>
                <div class="text-xs text-slate-400">目標用戶</div>
              </div>
            </div>
            
            <!-- 完整對話歷史 -->
            <div class="p-4 max-h-[400px] overflow-y-auto space-y-3">
              @for (msg of selectedHistory()?.messageHistory || []; track msg.timestamp) {
                <div class="flex gap-3" [class.flex-row-reverse]="!msg.isFromCustomer">
                  <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                       [class.bg-purple-500/30]="!msg.isFromCustomer"
                       [class.bg-emerald-500/30]="msg.isFromCustomer">
                    {{ msg.isFromCustomer ? '👤' : '🤖' }}
                  </div>
                  <div class="max-w-[70%] rounded-xl p-3"
                       [class.bg-purple-500/20]="!msg.isFromCustomer"
                       [class.bg-emerald-500/20]="msg.isFromCustomer">
                    <div class="text-xs mb-1"
                         [class.text-purple-400]="!msg.isFromCustomer"
                         [class.text-emerald-400]="msg.isFromCustomer">
                      {{ msg.isFromCustomer ? '客戶' : msg.role }}
                      <span class="text-slate-500 ml-2">{{ formatTime(msg.timestamp) }}</span>
                    </div>
                    <div class="text-sm text-white whitespace-pre-wrap">{{ msg.content }}</div>
                  </div>
                </div>
              }
              
              @if (!selectedHistory()?.messageHistory?.length) {
                <div class="text-center py-8 text-slate-500">
                  <div class="text-4xl mb-2">💬</div>
                  <div>此次執行無對話記錄</div>
                </div>
              }
            </div>
            
            <!-- 操作按鈕 -->
            <div class="p-4 border-t border-slate-700 flex justify-between">
              <button (click)="rerunExecution(selectedHistory()!)" 
                      class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 flex items-center gap-2">
                <span>🔄</span> 以此策略重新執行
              </button>
              <button (click)="showHistoryPanel.set(false)" class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">
                關閉
              </button>
            </div>
          </div>
        </div>
      }
      
      <!-- 🆕 A/B 測試對比面板 -->
      @if (showABTestPanel() && selectedForCompare().length >= 2) {
        <div class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" (click)="showABTestPanel.set(false)"></div>
          <div class="relative bg-slate-900 rounded-xl border border-slate-700 w-[900px] max-h-[85vh] overflow-hidden shadow-2xl">
            <!-- 標題欄 -->
            <div class="p-4 border-b border-slate-700 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-xl">📊</span>
                <h3 class="text-lg font-semibold text-white">A/B 測試對比</h3>
                <span class="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                  {{ selectedForCompare().length }} 個策略
                </span>
              </div>
              <button (click)="showABTestPanel.set(false)" class="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <!-- 對比內容 -->
            <div class="p-4 overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="text-slate-400 border-b border-slate-700">
                  <tr>
                    <th class="text-left py-3 px-3 w-32">指標</th>
                    @for (exec of selectedForCompare(); track exec.id; let i = $index) {
                      <th class="text-center py-3 px-3">
                        <div class="flex flex-col items-center">
                          <span class="px-2 py-0.5 rounded-full text-xs mb-1"
                                [class.bg-purple-500/20]="i === 0"
                                [class.text-purple-400]="i === 0"
                                [class.bg-cyan-500/20]="i === 1"
                                [class.text-cyan-400]="i === 1"
                                [class.bg-amber-500/20]="i === 2"
                                [class.text-amber-400]="i === 2">
                            策略 {{ i + 1 }}
                          </span>
                          <span class="text-white text-xs">{{ exec.goal | slice:0:20 }}...</span>
                        </div>
                      </th>
                    }
                  </tr>
                </thead>
                <tbody class="text-white">
                  <!-- 執行模式 -->
                  <tr class="border-b border-slate-800">
                    <td class="py-3 px-3 text-slate-400">執行模式</td>
                    @for (exec of selectedForCompare(); track exec.id) {
                      <td class="py-3 px-3 text-center">
                        {{ exec.mode === 'scriptless' ? '無劇本' : exec.mode === 'hybrid' ? '混合' : '劇本' }}
                      </td>
                    }
                  </tr>
                  <!-- 目標用戶 -->
                  <tr class="border-b border-slate-800">
                    <td class="py-3 px-3 text-slate-400">目標用戶</td>
                    @for (exec of selectedForCompare(); track exec.id) {
                      <td class="py-3 px-3 text-center">{{ exec.targetUsers?.length || 0 }}</td>
                    }
                  </tr>
                  <!-- 消息發送 -->
                  <tr class="border-b border-slate-800">
                    <td class="py-3 px-3 text-slate-400">消息發送</td>
                    @for (exec of selectedForCompare(); track exec.id; let i = $index) {
                      <td class="py-3 px-3 text-center font-bold" 
                          [class.text-emerald-400]="isHighestValue('messagesSent', i)"
                          [class.text-white]="!isHighestValue('messagesSent', i)">
                        {{ exec.stats.messagesSent }}
                      </td>
                    }
                  </tr>
                  <!-- 客戶回覆 -->
                  <tr class="border-b border-slate-800">
                    <td class="py-3 px-3 text-slate-400">客戶回覆</td>
                    @for (exec of selectedForCompare(); track exec.id; let i = $index) {
                      <td class="py-3 px-3 text-center font-bold"
                          [class.text-emerald-400]="isHighestValue('responsesReceived', i)"
                          [class.text-white]="!isHighestValue('responsesReceived', i)">
                        {{ exec.stats.responsesReceived }}
                      </td>
                    }
                  </tr>
                  <!-- 回覆率 -->
                  <tr class="border-b border-slate-800">
                    <td class="py-3 px-3 text-slate-400">回覆率</td>
                    @for (exec of selectedForCompare(); track exec.id; let i = $index) {
                      <td class="py-3 px-3 text-center font-bold"
                          [class.text-emerald-400]="isHighestValue('responseRate', i)"
                          [class.text-white]="!isHighestValue('responseRate', i)">
                        {{ getResponseRate(exec) | number:'1.1-1' }}%
                      </td>
                    }
                  </tr>
                  <!-- 分析次數 -->
                  <tr class="border-b border-slate-800">
                    <td class="py-3 px-3 text-slate-400">AI 分析次數</td>
                    @for (exec of selectedForCompare(); track exec.id) {
                      <td class="py-3 px-3 text-center">{{ exec.stats.analysisCount || 0 }}</td>
                    }
                  </tr>
                  <!-- 角色數量 -->
                  <tr class="border-b border-slate-800">
                    <td class="py-3 px-3 text-slate-400">參與角色</td>
                    @for (exec of selectedForCompare(); track exec.id) {
                      <td class="py-3 px-3 text-center">{{ exec.roles?.length || 0 }}</td>
                    }
                  </tr>
                  <!-- 執行時間 -->
                  <tr>
                    <td class="py-3 px-3 text-slate-400">執行時間</td>
                    @for (exec of selectedForCompare(); track exec.id) {
                      <td class="py-3 px-3 text-center text-slate-300">
                        {{ exec.stats.startTime | date:'MM/dd HH:mm' }}
                      </td>
                    }
                  </tr>
                </tbody>
              </table>
            </div>
            
            <!-- 結論 -->
            <div class="p-4 border-t border-slate-700 bg-slate-800/50">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-lg">🏆</span>
                <span class="text-white font-medium">最佳策略：</span>
                <span class="text-emerald-400 font-bold">
                  策略 {{ getBestStrategyIndex() + 1 }}
                </span>
              </div>
              <p class="text-sm text-slate-400">
                基於回覆率和客戶互動表現，策略 {{ getBestStrategyIndex() + 1 }} 表現最優。
                建議使用此策略的執行模式和角色配置。
              </p>
            </div>
            
            <!-- 操作按鈕 -->
            <div class="p-4 border-t border-slate-700 flex justify-end gap-3">
              <button (click)="showABTestPanel.set(false)" class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">
                關閉
              </button>
            </div>
          </div>
        </div>
      }
      
      <!-- 活躍群組列表 -->
      <div class="bg-slate-800/50 rounded-xl border border-slate-700/50">
        <div class="p-5 border-b border-slate-700/50 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">活躍協作群組</h3>
          <span class="text-sm text-slate-400">共 {{ activeGroups().length }} 個</span>
        </div>
        
        <div class="divide-y divide-slate-700/50">
          @for (group of activeGroups(); track group.id) {
            <div class="p-4 hover:bg-slate-700/30 transition-colors">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <!-- 狀態指示燈 -->
                  <div class="w-10 h-10 rounded-full flex items-center justify-center"
                       [class.bg-emerald-500/20]="group.status === 'running'"
                       [class.bg-amber-500/20]="group.status === 'paused'"
                       [class.bg-cyan-500/20]="group.status === 'inviting'">
                    <span class="w-3 h-3 rounded-full"
                          [class.bg-emerald-500]="group.status === 'running'"
                          [class.animate-pulse]="group.status === 'running'"
                          [class.bg-amber-500]="group.status === 'paused'"
                          [class.bg-cyan-500]="group.status === 'inviting'">
                    </span>
                  </div>
                  
                  <div>
                    <div class="font-medium text-white">{{ group.groupTitle }}</div>
                    <div class="text-sm text-slate-400">
                      客戶: {{ group.targetCustomer.firstName || group.targetCustomer.username || group.targetCustomer.id }}
                    </div>
                  </div>
                </div>
                
                <div class="flex items-center gap-6">
                  <!-- 消息統計 -->
                  <div class="text-center">
                    <div class="text-lg font-bold text-purple-400">{{ group.messagesSent }}</div>
                    <div class="text-xs text-slate-500">已發送</div>
                  </div>
                  
                  <div class="text-center">
                    <div class="text-lg font-bold text-cyan-400">{{ group.customerMessages }}</div>
                    <div class="text-xs text-slate-500">客戶回覆</div>
                  </div>
                  
                  <!-- 狀態標籤 -->
                  <div class="px-3 py-1 rounded-full text-xs font-medium"
                       [class.bg-emerald-500/20]="group.status === 'running'"
                       [class.text-emerald-400]="group.status === 'running'"
                       [class.bg-amber-500/20]="group.status === 'paused'"
                       [class.text-amber-400]="group.status === 'paused'"
                       [class.bg-cyan-500/20]="group.status === 'inviting'"
                       [class.text-cyan-400]="group.status === 'inviting'">
                    {{ getStatusLabel(group.status) }}
                  </div>
                  
                  <!-- 操作按鈕 -->
                  <div class="flex gap-2">
                    @if (group.status === 'running') {
                      <button (click)="pauseGroup(group)"
                              class="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </button>
                    }
                    @if (group.status === 'paused') {
                      <button (click)="resumeGroup(group)"
                              class="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                        </svg>
                      </button>
                    }
                    <button (click)="viewGroupDetails(group)"
                            class="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
          
          @if (activeGroups().length === 0) {
            <div class="p-8 text-center text-slate-500">
              <div class="text-4xl mb-2">🎭</div>
              <div>暫無活躍的協作群組</div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class CollaborationDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('conversationContainer') conversationContainer?: ElementRef<HTMLDivElement>;
  
  private multiRoleService = inject(MultiRoleService);
  private autoGroupService = inject(AutoGroupService);
  private executorService = inject(CollaborationExecutorService);
  private dynamicEngine = inject(DynamicScriptEngineService);
  private ipc = inject(IpcService);
  private toast = inject(ToastService);
  
  // 🆕 P1-1: 整合統一營銷任務服務
  private taskService = inject(MarketingTaskService);
  private aiService = inject(AICenterService);
  
  // 🆕 AI 團隊執行狀態
  currentExecution = computed(() => {
    const execution = this.dynamicEngine.currentExecution();
    return execution?.status === 'running' || execution?.status === 'paused' ? execution : null;
  });
  
  // 🆕 任務隊列進度
  queueProgress = computed(() => this.dynamicEngine.queueProgress());
  
  // 🆕 對話面板狀態
  showConversationPanel = signal(false);
  isManualMode = signal(false);
  manualMessage = '';
  manualSendRole = '';
  aiSuggestion = signal<string | null>(null);
  
  // 🆕 轉化通知
  showConversionAlert = signal(false);
  conversionAlertData = signal<{ userId: string; userName: string; signal: string } | null>(null);
  
  // 🆕 結果統計面板
  showResultsPanel = signal(false);
  
  // 🆕 歷史回放
  showHistoryPanel = signal(false);
  selectedHistory = signal<ExecutionState | null>(null);
  
  // 🆕 執行歷史
  executionHistory = computed(() => this.dynamicEngine.executions());
  
  // 🆕 A/B 測試對比
  showABTestPanel = signal(false);
  selectedForCompare = signal<ExecutionState[]>([]);
  
  // 🆕 轉化漏斗階段
  conversionStages = [
    { id: 'contact', label: '觸達' },
    { id: 'response', label: '回覆' },
    { id: 'interest', label: '興趣' },
    { id: 'intent', label: '意向' },
    { id: 'conversion', label: '轉化' }
  ];
  
  // 🆕 IPC 清理
  private ipcCleanup: (() => void)[] = [];
  
  // ============ 🆕 P1-1: 統一營銷任務統計 ============
  
  // 統一任務列表
  unifiedTasks = computed(() => this.taskService.tasks());
  
  // 活躍統一任務
  activeUnifiedTasks = computed(() => this.taskService.activeTasks());
  
  // 統一任務統計
  unifiedStats = computed(() => this.taskService.getOverallStats());
  
  // 今日統計（來自統一任務服務）
  unifiedTodayStats = computed(() => this.taskService.todayStats());
  
  // 按目標類型分組的任務
  tasksByGoal = computed(() => this.taskService.tasksByGoal());
  
  // 總體轉化率（來自統一任務服務）
  unifiedConversionRate = computed(() => this.taskService.overallConversionRate());
  
  // AI 服務統計
  aiStats = computed(() => this.aiService.stats());
  
  // AI 連接狀態
  aiConnected = computed(() => this.aiService.isConnected());
  
  // 顯示模式：legacy（舊協作群組）或 unified（統一任務）
  viewMode = signal<'legacy' | 'unified'>('unified');
  
  // 狀態
  isRefreshing = signal(false);
  lastUpdate = signal(new Date());
  chartPeriod = signal<'week' | 'month'>('week');
  
  // 統計數據
  stats = signal<DashboardStats>({
    totalGroups: 0,
    activeGroups: 0,
    completedGroups: 0,
    totalConversions: 0,
    conversionRate: 0,
    totalMessagesSent: 0,
    avgMessagesPerGroup: 0,
    todayGroups: 0,
    todayConversions: 0
  });
  
  // 圖表數據
  chartData = signal<{ date: string; label: string; groups: number; conversions: number }[]>([]);
  
  // 角色排名
  topRoles = computed(() => {
    const roles = this.multiRoleService.roles();
    return roles
      .map(r => ({
        ...r,
        successRate: r.usageCount && r.usageCount > 0 
          ? Math.round((r.successCount || 0) / r.usageCount * 100) 
          : 0
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);
  });
  
  // 活躍群組
  activeGroups = computed(() => {
    return this.autoGroupService.groups().filter(
      g => ['creating', 'inviting', 'running', 'paused'].includes(g.status)
    );
  });
  
  // 刷新間隔
  private refreshInterval: any = null;
  
  // Math 引用
  Math = Math;
  
  ngOnInit() {
    this.refreshData();
    
    // 🔧 Phase 4: 嘗試恢復之前的執行狀態（非阻塞）
    setTimeout(() => {
      this.dynamicEngine.restoreExecutions().catch(err => {
        console.warn('[CollabDashboard] 恢復執行狀態失敗:', err);
      });
    }, 2000);
    
    // 🔧 P1-1: 縮短刷新間隔到 5 秒，實現近實時更新
    this.refreshInterval = setInterval(() => {
      this.refreshData();
    }, 5000);
    
    // 🆕 監聽轉化信號
    this.ipcCleanup.push(
      this.ipc.on('ai-team:conversion-signal', (data: any) => {
        this.showConversionNotification(data);
      })
    );
    
    // 🆕 監聯 AI 建議更新
    this.ipcCleanup.push(
      this.ipc.on('ai-team:suggestion-update', (data: { suggestion: string }) => {
        if (this.isManualMode()) {
          this.aiSuggestion.set(data.suggestion);
        }
      })
    );
    
    // 🔧 P1-1: 監聽消息發送成功事件，立即更新對話
    this.ipcCleanup.push(
      this.ipc.on('ai-team:message-sent', (data: any) => {
        console.log('[CollabDashboard] 收到消息發送事件:', data);
        // 立即刷新對話記錄
        this.refreshData();
      })
    );
    
    // 🔧 P1-1: 監聽私聊消息發送事件（Phase 4 增強：直接更新對話歷史）
    this.ipcCleanup.push(
      this.ipc.on('ai-team:private-message-sent', (data: any) => {
        console.log('[CollabDashboard] 收到私聊消息事件:', data);
        
        // 🔧 Phase 4: 立即更新對話歷史 UI（AI 發送的消息）
        const execution = this.dynamicEngine.currentExecution();
        if (execution && data.executionId === execution.id && data.success) {
          // 確保消息被添加到歷史（防止重複）
          const existingMsg = execution.messageHistory?.find(
            m => m.content === data.content && !m.isFromCustomer
          );
          
          if (!existingMsg) {
            console.log('[CollabDashboard] 📤 添加 AI 消息到歷史:', data.content?.substring(0, 30));
            if (!execution.messageHistory) execution.messageHistory = [];
            execution.messageHistory.push({
              role: data.roleName || 'AI',
              content: data.content,
              timestamp: new Date().toISOString(),
              isFromCustomer: false
            });
            // 強制觸發 signal 更新
            this.dynamicEngine.forceUpdateExecution(execution);
          }
          
          // 滾動到底部
          this.scrollToBottom();
        }
        
        this.refreshData();
      })
    );
    
    // 🔧 P1-1: 監聯客戶回覆事件（Phase 4 增強：直接更新對話歷史）
    this.ipcCleanup.push(
      this.ipc.on('ai-team:customer-reply', (data: any) => {
        console.log('[CollabDashboard] 收到客戶回覆:', data);
        
        // 🔧 Phase 4: 立即更新對話歷史 UI
        const execution = this.dynamicEngine.currentExecution();
        if (execution && data.executionId === execution.id) {
          // 確保消息被添加到歷史（防止重複）
          const existingMsg = execution.messageHistory?.find(
            m => m.content === data.text && m.isFromCustomer
          );
          
          if (!existingMsg) {
            console.log('[CollabDashboard] 📝 添加客戶消息到歷史:', data.text?.substring(0, 30));
            if (!execution.messageHistory) execution.messageHistory = [];
            execution.messageHistory.push({
              role: 'customer',
              content: data.text,
              timestamp: new Date().toISOString(),
              isFromCustomer: true
            });
            // 強制觸發 signal 更新
            this.dynamicEngine.forceUpdateExecution(execution);
          }
          
          // 滾動到底部
          this.scrollToBottom();
        }
        
        this.refreshData();
      })
    );
  }
  
  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    // 🆕 清理 IPC 監聽
    this.ipcCleanup.forEach(cleanup => cleanup());
  }
  
  async refreshData() {
    this.isRefreshing.set(true);
    
    try {
      // 獲取統計數據
      const groupStats = this.autoGroupService.statistics();
      
      this.stats.set({
        totalGroups: groupStats.totalGroups,
        activeGroups: groupStats.activeGroups,
        completedGroups: groupStats.totalGroups - groupStats.activeGroups - groupStats.pendingRequests,
        totalConversions: groupStats.successfulConversions,
        conversionRate: groupStats.totalGroups > 0 
          ? (groupStats.successfulConversions / groupStats.totalGroups * 100) 
          : 0,
        totalMessagesSent: this.executorService.statistics().totalExecutions,
        avgMessagesPerGroup: groupStats.totalGroups > 0 
          ? this.executorService.statistics().totalExecutions / groupStats.totalGroups 
          : 0,
        todayGroups: 0, // TODO: 從後端獲取
        todayConversions: 0 // TODO: 從後端獲取
      });
      
      // 生成圖表數據
      this.generateChartData();
      
      this.lastUpdate.set(new Date());
    } catch (e) {
      console.error('Failed to refresh dashboard data:', e);
    } finally {
      this.isRefreshing.set(false);
    }
  }
  
  private generateChartData() {
    const days = this.chartPeriod() === 'week' ? 7 : 30;
    const data: { date: string; label: string; groups: number; conversions: number }[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        label: i === 0 ? '今天' : (days === 7 ? 
          ['日', '一', '二', '三', '四', '五', '六'][date.getDay()] : 
          `${date.getMonth() + 1}/${date.getDate()}`),
        groups: Math.floor(Math.random() * 10), // TODO: 從後端獲取真實數據
        conversions: Math.floor(Math.random() * 5)
      });
    }
    
    this.chartData.set(data);
  }
  
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'creating': '創建中',
      'inviting': '邀請中',
      'running': '進行中',
      'paused': '已暫停',
      'completed': '已完成',
      'failed': '失敗'
    };
    return labels[status] || status;
  }
  
  pauseGroup(group: CollaborationGroup) {
    this.autoGroupService.pauseGroup(group.id);
    this.executorService.pauseExecution(group.id);
  }
  
  resumeGroup(group: CollaborationGroup) {
    this.autoGroupService.resumeGroup(group.id);
    this.executorService.resumeExecution(group.id);
  }
  
  viewGroupDetails(group: CollaborationGroup) {
    // TODO: 打開群組詳情對話框
    console.log('View group details:', group);
  }
  
  // 🆕 AI 團隊執行控制
  pauseExecution() {
    const execution = this.currentExecution();
    if (execution) {
      this.dynamicEngine.pauseExecution(execution.id);
      this.toast.info('⏸️ 已暫停 AI 團隊執行');
    }
  }
  
  resumeExecution() {
    const execution = this.currentExecution();
    if (execution) {
      this.dynamicEngine.resumeExecution(execution.id);
      this.isManualMode.set(false);
      this.toast.success('▶️ 已恢復 AI 團隊執行');
    }
  }
  
  stopExecution() {
    const execution = this.currentExecution();
    if (execution) {
      if (confirm('確定要停止執行嗎？這將結束當前的 AI 團隊任務。')) {
        this.dynamicEngine.stopExecution(execution.id);
        this.showConversationPanel.set(false);
        this.isManualMode.set(false);
        this.toast.info('⏹️ 已停止 AI 團隊執行');
      }
    }
  }
  
  // 🆕 對話面板操作
  toggleConversationPanel() {
    this.showConversationPanel.update(v => !v);
    
    // 打開時自動滾動到底部
    if (this.showConversationPanel()) {
      setTimeout(() => {
        this.scrollToBottom();
      }, 100);
    }
  }
  
  private scrollToBottom() {
    if (this.conversationContainer?.nativeElement) {
      const container = this.conversationContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }
  
  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  }
  
  // 🆕 手動介入操作
  toggleManualMode() {
    const newMode = !this.isManualMode();
    this.isManualMode.set(newMode);
    
    const execution = this.currentExecution();
    if (!execution) return;
    
    if (newMode) {
      // 進入手動模式：暫停 AI
      this.dynamicEngine.pauseExecution(execution.id);
      this.toast.info('🖐️ 已切換到手動模式，AI 已暫停');
      
      // 設置預設角色
      if (execution.roles?.length) {
        this.manualSendRole = execution.roles[0].id;
      }
      
      // 請求 AI 建議
      this.requestAiSuggestion();
    } else {
      // 退出手動模式：恢復 AI
      this.dynamicEngine.resumeExecution(execution.id);
      this.aiSuggestion.set(null);
      this.toast.success('🤖 已切換回 AI 自動模式');
    }
  }
  
  requestAiSuggestion() {
    const execution = this.currentExecution();
    if (!execution) return;
    
    this.ipc.send('ai-team:request-suggestion', {
      executionId: execution.id,
      messageHistory: execution.messageHistory?.slice(-10),
      currentStage: execution.conversionFunnel?.currentStage
    });
  }
  
  useAiSuggestion() {
    const suggestion = this.aiSuggestion();
    if (suggestion) {
      this.manualMessage = suggestion;
    }
  }
  
  sendManualMessage() {
    if (!this.manualMessage.trim() || !this.isManualMode()) return;
    
    const execution = this.currentExecution();
    if (!execution) return;
    
    const roleId = this.manualSendRole;
    const role = execution.roles?.find(r => r.id === roleId);
    
    if (!role) {
      this.toast.error('請選擇一個角色');
      return;
    }
    
    // 發送手動消息
    this.ipc.send('ai-team:send-manual-message', {
      executionId: execution.id,
      roleId: roleId,
      roleName: role.name,
      content: this.manualMessage.trim(),
      targetUserId: execution.targetUsers?.[0]?.id // 當前目標用戶
    });
    
    this.toast.success(`📤 已以 ${role.name} 身份發送消息`);
    this.manualMessage = '';
    
    // 請求新的建議
    setTimeout(() => {
      this.requestAiSuggestion();
    }, 1000);
  }
  
  // 🆕 轉化通知
  showConversionNotification(data: { userId: string; userName: string; signal: string; score: number }) {
    this.conversionAlertData.set({
      userId: data.userId,
      userName: data.userName,
      signal: data.signal
    });
    this.showConversionAlert.set(true);
    
    // 顯示 toast 通知
    this.toast.success(`🎯 高轉化信號！${data.userName}: ${data.signal}`);
    
    // 5秒後自動隱藏
    setTimeout(() => {
      this.showConversionAlert.set(false);
    }, 5000);
  }
  
  dismissConversionAlert() {
    this.showConversionAlert.set(false);
  }
  
  focusOnUser(userId: string) {
    // 聚焦到特定用戶的對話
    this.showConversationPanel.set(true);
    this.showConversionAlert.set(false);
    this.toast.info('已切換到該用戶的對話');
  }
  
  // 🆕 隊列管理操作
  skipCurrentUser() {
    if (this.dynamicEngine.skipCurrentUser()) {
      this.toast.info('已跳過當前用戶，處理下一個');
    }
  }
  
  markAsConverted() {
    if (this.dynamicEngine.completeCurrentUser('converted')) {
      this.toast.success('🎉 已標記為轉化成功！');
    }
  }
  
  markAsInterested() {
    if (this.dynamicEngine.completeCurrentUser('interested')) {
      this.toast.info('已標記為有興趣，處理下一個用戶');
    }
  }
  
  // 🆕 回覆率計算
  getReplyRate(): number {
    const exec = this.currentExecution();
    if (!exec || !exec.stats.messagesSent) return 0;
    return (exec.stats.responsesReceived / exec.stats.messagesSent) * 100;
  }
  
  // 🆕 轉化漏斗階段判斷
  isStageCompleted(stageId: string): boolean {
    const exec = this.currentExecution();
    if (!exec?.conversionFunnel) return false;
    
    const stageOrder = ['contact', 'response', 'interest', 'intent', 'conversion'];
    const currentIndex = stageOrder.indexOf(exec.conversionFunnel.currentStage);
    const checkIndex = stageOrder.indexOf(stageId);
    
    return checkIndex < currentIndex;
  }
  
  isCurrentStage(stageId: string): boolean {
    const exec = this.currentExecution();
    return exec?.conversionFunnel?.currentStage === stageId;
  }
  
  // 🆕 結果統計方法
  getResultCount(result: string): number {
    const completed = this.queueProgress()?.completed || [];
    return completed.filter(u => u.result === result).length;
  }
  
  getConversionRate(): number {
    const completed = this.queueProgress()?.completed || [];
    if (completed.length === 0) return 0;
    const converted = completed.filter(u => u.result === 'converted').length;
    return (converted / completed.length) * 100;
  }
  
  getResultLabel(result: string): string {
    const labels: Record<string, string> = {
      'converted': '轉化',
      'interested': '有興趣',
      'neutral': '中立',
      'rejected': '拒絕',
      'no_response': '無回應'
    };
    return labels[result] || result;
  }
  
  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分${seconds % 60}秒`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}時${mins}分`;
  }
  
  exportResults() {
    const completed = this.queueProgress()?.completed || [];
    if (completed.length === 0) {
      this.toast.info('暫無可導出的結果');
      return;
    }
    
    // 生成 CSV 內容
    const headers = ['用戶', '結果', '消息數', '時長(秒)'];
    const rows = completed.map(u => [u.name, this.getResultLabel(u.result), u.messagesExchanged, u.duration]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    // 下載
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-team-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.toast.success('結果已導出為 CSV 文件');
  }
  
  // 🆕 歷史回放方法
  viewExecutionHistory(exec: ExecutionState) {
    this.selectedHistory.set(exec);
    this.showHistoryPanel.set(true);
  }
  
  rerunExecution(exec: ExecutionState) {
    this.showHistoryPanel.set(false);
    
    // 使用相同的策略重新執行
    this.dynamicEngine.startFromOnePhrase(
      exec.goal,
      exec.mode as ExecutionMode,
      exec.targetUsers?.map(u => ({
        id: String(u.id),
        telegramId: String(u.id),
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        intentScore: u.intentScore,
        source: u.source
      }))
    ).then(newExec => {
      if (newExec) {
        this.toast.success('🔄 已使用相同策略重新啟動執行');
      }
    });
  }
  
  // 🆕 A/B 測試對比方法
  isSelectedForCompare(exec: ExecutionState): boolean {
    return this.selectedForCompare().some(e => e.id === exec.id);
  }
  
  toggleCompareSelection(exec: ExecutionState) {
    const current = this.selectedForCompare();
    const exists = current.find(e => e.id === exec.id);
    
    if (exists) {
      this.selectedForCompare.set(current.filter(e => e.id !== exec.id));
    } else {
      if (current.length >= 3) {
        this.toast.info('最多只能選擇 3 個策略進行對比');
        return;
      }
      this.selectedForCompare.set([...current, exec]);
    }
  }
  
  clearCompareSelection() {
    this.selectedForCompare.set([]);
  }
  
  openABTestPanel() {
    if (this.selectedForCompare().length < 2) {
      this.toast.info('請至少選擇 2 個執行記錄進行對比');
      return;
    }
    this.showABTestPanel.set(true);
  }
  
  getResponseRate(exec: ExecutionState): number {
    if (!exec.stats.messagesSent) return 0;
    return (exec.stats.responsesReceived / exec.stats.messagesSent) * 100;
  }
  
  isHighestValue(metric: string, index: number): boolean {
    const executions = this.selectedForCompare();
    
    let values: number[];
    switch (metric) {
      case 'messagesSent':
        values = executions.map(e => e.stats.messagesSent);
        break;
      case 'responsesReceived':
        values = executions.map(e => e.stats.responsesReceived);
        break;
      case 'responseRate':
        values = executions.map(e => this.getResponseRate(e));
        break;
      default:
        return false;
    }
    
    const maxValue = Math.max(...values);
    return values[index] === maxValue && maxValue > 0;
  }
  
  getBestStrategyIndex(): number {
    const executions = this.selectedForCompare();
    if (executions.length === 0) return 0;
    
    // 計算綜合得分（回覆率權重 60%，消息數權重 40%）
    const scores = executions.map(exec => {
      const responseRate = this.getResponseRate(exec);
      const messages = exec.stats.messagesSent;
      return responseRate * 0.6 + (messages > 0 ? messages * 0.4 : 0);
    });
    
    return scores.indexOf(Math.max(...scores));
  }
  
  // ============ 🆕 P1-1: 統一任務操作方法 ============
  
  /**
   * 獲取目標類型圖標
   */
  getGoalIcon(goalType: GoalType): string {
    return GOAL_TYPE_CONFIG[goalType]?.icon || '🎯';
  }
  
  /**
   * 獲取目標類型標籤
   */
  getGoalLabel(goalType: GoalType): string {
    return GOAL_TYPE_CONFIG[goalType]?.label || goalType;
  }
  
  /**
   * 獲取任務狀態標籤
   */
  getTaskStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'draft': '草稿',
      'scheduled': '已計劃',
      'running': '執行中',
      'paused': '已暫停',
      'completed': '已完成',
      'failed': '失敗'
    };
    return labels[status] || status;
  }
  
  /**
   * 啟動統一任務
   */
  startUnifiedTask(taskId: string): void {
    this.taskService.startTask(taskId);
    this.toast.success('任務已啟動');
  }
  
  /**
   * 暫停統一任務
   */
  pauseUnifiedTask(taskId: string): void {
    this.taskService.pauseTask(taskId);
    this.toast.info('任務已暫停');
  }
  
  /**
   * 導航到智能營銷中心
   */
  goToSmartMarketingHub(): void {
    this.ipc.send('navigate-to', { path: '/smart-marketing' });
  }
}
