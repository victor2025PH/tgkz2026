/**
 * 觸發規則管理頁面
 * 定義關鍵詞匹配後的響應動作
 */
import { Component, signal, computed, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MonitoringStateService } from './monitoring-state.service';
import { ConfigProgressComponent } from './config-progress.component';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { ConfirmDialogService } from '../confirm-dialog.service';

// 觸發規則接口
interface TriggerRule {
  id?: number;
  name: string;
  description?: string;
  priority: number;
  isActive: boolean;
  sourceType: 'all' | 'specific';
  sourceGroupIds: (number | string)[];
  keywordSetIds: (number | string)[];
  conditions: {
    newMemberOnly?: boolean;
    excludeAdmin?: boolean;
    timeRange?: { start: string; end: string };
    oncePerUser?: boolean;
  };
  responseType: 'ai_chat' | 'template' | 'script' | 'record_only';
  responseConfig: {
    templateId?: number;
    scriptId?: number;
    aiMode?: 'full' | 'semi';
  };
  senderType: 'auto' | 'specific';
  senderAccountIds: string[];
  delayMin: number;
  delayMax: number;
  dailyLimit: number;
  autoAddLead: boolean;
  notifyMe: boolean;
  triggerCount?: number;
  successCount?: number;
  lastTriggered?: string;
  createdAt?: string;
  updatedAt?: string;
  /** P2: 與其他規則重疊時後端返回的提示 */
  overlapWarning?: string;
}

@Component({
  selector: 'app-trigger-rules',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfigProgressComponent],
  template: `
    <div class="h-full flex flex-col bg-slate-900 p-6">
      <!-- 頂部標題 -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
            <span class="text-2xl">⚡</span>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">觸發規則</h1>
            <p class="text-sm text-slate-400">定義關鍵詞匹配後的響應動作</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <app-config-progress 
            mode="compact" 
            (action)="handleConfigAction($event)">
          </app-config-progress>
          
          <button (click)="refreshData()"
                  class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2">
            <span [class.animate-spin]="isLoading()">🔄</span>
            <span>刷新</span>
          </button>
          
          <button (click)="openCreateWizard()"
                  class="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg transition-colors flex items-center gap-2">
            <span>+</span>
            <span>創建規則</span>
          </button>
        </div>
      </div>

      <!-- 統計卡片 -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <span class="text-amber-400">⚡</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-amber-400">{{ rules().length }}</div>
              <div class="text-xs text-slate-500">總規則數</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <span class="text-emerald-400">✓</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-emerald-400">{{ activeRules().length }}</div>
              <div class="text-xs text-slate-500">活躍規則</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <span class="text-cyan-400">🎯</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-cyan-400">{{ totalTriggerCount() }}</div>
              <div class="text-xs text-slate-500">總觸發次數</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <span class="text-purple-400">📊</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-purple-400">{{ averageSuccessRate() }}%</div>
              <div class="text-xs text-slate-500">平均成功率</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 🆕 P4-2: 主視圖模式切換 -->
      <div class="flex items-center gap-1 mb-4 p-1 bg-slate-800/60 rounded-xl border border-slate-700/50 w-fit">
        <button (click)="mainView.set('rules')"
                class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                [class.bg-amber-500]="mainView() === 'rules'"
                [class.text-white]="mainView() === 'rules'"
                [class.shadow-lg]="mainView() === 'rules'"
                [class.text-slate-400]="mainView() !== 'rules'"
                [class.hover:text-white]="mainView() !== 'rules'">
          📋 規則列表
        </button>
        <button (click)="mainView.set('history')"
                class="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                [class.bg-purple-500]="mainView() === 'history'"
                [class.text-white]="mainView() === 'history'"
                [class.shadow-lg]="mainView() === 'history'"
                [class.text-slate-400]="mainView() !== 'history'"
                [class.hover:text-white]="mainView() !== 'history'">
          📜 觸發歷史
          @if (sessionLog().length > 0) {
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20">{{ sessionLog().length }}</span>
          }
        </button>
      </div>

      @if (mainView() === 'rules') {

      <!-- AI 自動聊天提示 -->
      @if (aiChatEnabled()) {
        <div class="mb-4 p-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-xl border border-emerald-500/30">
          <div class="flex items-start gap-3">
            <span class="text-2xl">🤖</span>
            <div class="flex-1">
              <p class="text-emerald-400 font-medium">AI 自動聊天已啟用（{{ aiChatMode() === 'full' ? '全自動' : '半自動' }}模式）</p>
              <p class="text-slate-400 text-sm mt-1">
                未匹配特定規則的關鍵詞將使用 AI 自動回覆。
                如需針對特定關鍵詞使用不同響應方式，請創建觸發規則。
              </p>
            </div>
          </div>
        </div>
      }

      <!-- 🆕 Phase 3: 規則效果分析面板 -->
      @if (rules().length > 0) {
        <div class="mb-4 rounded-xl border overflow-hidden"
             [class.border-amber-500/30]="sleepingRules().length > 0"
             [class.border-slate-700/50]="sleepingRules().length === 0">
          <!-- 折疊標題 -->
          <button (click)="showAnalysisPanel.set(!showAnalysisPanel())"
                  class="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-white/5"
                  [class.bg-amber-500/5]="sleepingRules().length > 0"
                  [class.bg-slate-800/50]="sleepingRules().length === 0">
            <div class="flex items-center gap-3">
              <span class="text-lg">📊</span>
              <div>
                <span class="font-medium text-white text-sm">規則效果分析</span>
                @if (sleepingRules().length > 0) {
                  <span class="ml-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                    {{ sleepingRules().length }} 條規則需注意
                  </span>
                } @else {
                  <span class="ml-2 text-xs text-emerald-400">✓ 規則健康</span>
                }
              </div>
            </div>
            <div class="flex items-center gap-3">
              <!-- 引擎健康分 -->
              <div class="text-right">
                <span class="text-lg font-bold"
                      [class.text-emerald-400]="engineHealthScore() >= 70"
                      [class.text-amber-400]="engineHealthScore() >= 40 && engineHealthScore() < 70"
                      [class.text-red-400]="engineHealthScore() < 40">
                  {{ engineHealthScore() }}
                </span>
                <span class="text-xs text-slate-500 ml-0.5">/ 100</span>
              </div>
              <svg class="w-4 h-4 text-slate-500 transition-transform"
                   [class.rotate-180]="showAnalysisPanel()"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </button>

          @if (showAnalysisPanel()) {
            <div class="p-4 border-t border-slate-700/50 space-y-4 bg-slate-800/30">

              <!-- 引擎總體健康評分 -->
              <div class="flex items-center gap-4 p-4 rounded-xl bg-slate-700/30">
                <div class="text-center w-20 flex-shrink-0">
                  <div class="text-3xl font-bold"
                       [class.text-emerald-400]="engineHealthScore() >= 70"
                       [class.text-amber-400]="engineHealthScore() >= 40 && engineHealthScore() < 70"
                       [class.text-red-400]="engineHealthScore() < 40">
                    {{ engineHealthScore() }}
                  </div>
                  <div class="text-xs text-slate-500 mt-0.5">規則引擎健康分</div>
                </div>
                <div class="flex-1">
                  <div class="h-3 bg-slate-700 rounded-full overflow-hidden mb-2">
                    <div class="h-3 rounded-full transition-all duration-700"
                         [class.bg-emerald-500]="engineHealthScore() >= 70"
                         [class.bg-amber-500]="engineHealthScore() >= 40 && engineHealthScore() < 70"
                         [class.bg-red-500]="engineHealthScore() < 40"
                         [style.width.%]="engineHealthScore()">
                    </div>
                  </div>
                  <div class="grid grid-cols-3 gap-2 text-xs">
                    <div class="text-center">
                      <div class="font-medium text-white">{{ activeRules().length }}</div>
                      <div class="text-slate-500">活躍規則</div>
                    </div>
                    <div class="text-center">
                      <div class="font-medium text-cyan-400">{{ totalTriggerCount() }}</div>
                      <div class="text-slate-500">總觸發次數</div>
                    </div>
                    <div class="text-center">
                      <div class="font-medium text-purple-400">{{ averageSuccessRate() }}%</div>
                      <div class="text-slate-500">平均命中率</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 兩列：沉睡規則 + 最佳規則 -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- 沉睡規則 -->
                <div class="rounded-xl border p-4"
                     [class.border-amber-500/30]="sleepingRules().length > 0"
                     [class.border-slate-700/30]="sleepingRules().length === 0"
                     [class.bg-amber-500/5]="sleepingRules().length > 0">
                  <div class="flex items-center gap-2 mb-3">
                    <span class="text-base">😴</span>
                    <span class="text-sm font-medium text-white">沉睡規則</span>
                    @if (sleepingRules().length > 0) {
                      <span class="ml-auto px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                        {{ sleepingRules().length }} 條
                      </span>
                    }
                  </div>
                  @if (sleepingRules().length === 0) {
                    <p class="text-xs text-emerald-400">✓ 所有活躍規則均有效觸發</p>
                  } @else {
                    <div class="space-y-2">
                      @for (rule of sleepingRules().slice(0, 3); track rule.id) {
                        <div class="flex items-center justify-between py-1.5">
                          <span class="text-sm text-white truncate flex-1 mr-2">{{ rule.name }}</span>
                          <span class="text-xs text-amber-400 flex-shrink-0">
                            {{ rule.triggerCount === 0 ? '從未觸發' : '7天未觸發' }}
                          </span>
                        </div>
                      }
                      @if (sleepingRules().length > 3) {
                        <p class="text-xs text-slate-500">還有 {{ sleepingRules().length - 3 }} 條沉睡規則...</p>
                      }
                    </div>
                    <div class="mt-3 p-2 rounded-lg bg-amber-500/10 text-xs text-amber-400/90">
                      💡 建議：檢查關鍵詞集是否正確配置，或調整監控群組設置
                    </div>
                  }
                </div>

                <!-- 最佳表現規則 -->
                <div class="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div class="flex items-center gap-2 mb-3">
                    <span class="text-base">🏆</span>
                    <span class="text-sm font-medium text-white">最佳表現規則</span>
                  </div>
                  @if (topPerformingRule()) {
                    <div>
                      <div class="font-medium text-white text-sm mb-1">{{ topPerformingRule()!.name }}</div>
                      <div class="flex items-center gap-2 text-xs text-slate-400">
                        <span>命中率</span>
                        <div class="flex-1 h-1.5 bg-slate-700 rounded-full">
                          <div class="h-1.5 bg-emerald-400 rounded-full"
                               [style.width.%]="getRuleSuccessRate(topPerformingRule()!)"></div>
                        </div>
                        <span class="text-emerald-400 font-bold">
                          {{ getRuleSuccessRate(topPerformingRule()!) }}%
                        </span>
                      </div>
                      <div class="text-xs text-slate-500 mt-2">
                        觸發 {{ topPerformingRule()!.triggerCount || 0 }} 次 ·
                        成功 {{ topPerformingRule()!.successCount || 0 }} 次
                      </div>
                    </div>
                  } @else {
                    <p class="text-xs text-slate-400">尚無足夠數據</p>
                  }
                </div>
              </div>

              <!-- 優化建議 -->
              @if (ruleOptimizationTips().length > 0) {
                <div class="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-sm">💡</span>
                    <span class="text-sm font-medium text-white">優化建議</span>
                  </div>
                  <ul class="space-y-1.5">
                    @for (tip of ruleOptimizationTips(); track tip) {
                      <li class="flex items-start gap-2 text-xs text-slate-300">
                        <span class="text-blue-400 flex-shrink-0 mt-0.5">→</span>
                        {{ tip }}
                      </li>
                    }
                  </ul>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- 主內容區 -->
      <div class="flex-1 overflow-hidden">
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden h-full flex flex-col">
          <!-- 🆕 Phase 2: 場景分類標籤頁 + 狀態篩選 -->
          <div class="p-4 border-b border-slate-700/50">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-semibold text-white flex items-center gap-2">
                <span>⚡</span> 觸發規則列表
                <span class="text-xs text-slate-500">({{ scenedRules().length }}/{{ rules().length }})</span>
              </h3>
              <select [(ngModel)]="filterStatus"
                      class="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white">
                <option value="all">全部狀態</option>
                <option value="active">活躍中</option>
                <option value="inactive">已停用</option>
              </select>
            </div>
            <!-- 場景分類標籤 -->
            <div class="flex items-center gap-2 flex-wrap">
              @for (tab of sceneTabs; track tab.value) {
                <button (click)="sceneFilter.set(tab.value)"
                        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                        [class.text-white]="sceneFilter() === tab.value"
                        [class.border-transparent]="sceneFilter() !== tab.value"
                        [style.background-color]="sceneFilter() === tab.value ? tab.activeColor : 'transparent'"
                        [style.border-color]="sceneFilter() === tab.value ? tab.activeColor : 'rgba(100,116,139,0.3)'"
                        [style.color]="sceneFilter() === tab.value ? 'white' : '#94a3b8'">
                  <span>{{ tab.icon }}</span>
                  <span>{{ tab.label }}</span>
                  <span class="ml-0.5 opacity-70">({{ getRuleCountForScene(tab.value) }})</span>
                </button>
              }
            </div>
          </div>
          
          <!-- 規則列表 -->
          <div class="flex-1 overflow-y-auto p-4">
            @if (scenedRules().length > 0) {
              <div class="space-y-4">
                @for (rule of scenedRules(); track rule.id) {
                  <div class="bg-slate-700/50 rounded-xl border transition-all hover:border-amber-500/30"
                       [class.border-slate-600/50]="rule.isActive"
                       [class.border-slate-700/50]="!rule.isActive"
                       [class.opacity-60]="!rule.isActive">
                    <!-- 規則頭部 -->
                    <div class="p-4 flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg flex items-center justify-center"
                             [class.bg-emerald-500/20]="rule.isActive"
                             [class.bg-slate-600/50]="!rule.isActive">
                          <span class="text-lg">{{ getResponseIcon(rule.responseType) }}</span>
                        </div>
                        <div>
                          <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-medium text-white">{{ rule.name }}</span>
                            @if (rule.isActive) {
                              <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">活躍</span>
                            } @else {
                              <span class="px-2 py-0.5 bg-slate-600 text-slate-400 text-xs rounded-full">已停用</span>
                            }
                            <span class="px-2 py-0.5 text-xs rounded-full"
                                  [class.bg-red-500/20]="rule.priority === 3"
                                  [class.text-red-400]="rule.priority === 3"
                                  [class.bg-amber-500/20]="rule.priority === 2"
                                  [class.text-amber-400]="rule.priority === 2"
                                  [class.bg-slate-500/20]="rule.priority === 1"
                                  [class.text-slate-400]="rule.priority === 1">
                              {{ getPriorityLabel(rule.priority) }}
                            </span>
                            <!-- 🆕 Phase 2: 命中率健康徽章 -->
                            @if (rule.triggerCount && rule.triggerCount > 0) {
                              <span class="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full"
                                    [class]="getRuleHealthClass(rule)"
                                    [title]="'命中率: ' + getRuleSuccessRate(rule) + '% (' + rule.successCount + '/' + rule.triggerCount + '次)'">
                                <span class="w-1.5 h-1.5 rounded-full inline-block"
                                      [class.bg-emerald-400]="getRuleSuccessRate(rule) >= 70"
                                      [class.bg-amber-400]="getRuleSuccessRate(rule) >= 30 && getRuleSuccessRate(rule) < 70"
                                      [class.bg-red-400]="getRuleSuccessRate(rule) < 30"></span>
                                {{ getRuleSuccessRate(rule) }}% 命中
                              </span>
                            } @else if (rule.triggerCount === 0 && rule.isActive) {
                              <span class="px-2 py-0.5 bg-slate-600/50 text-slate-500 text-xs rounded-full" title="尚無觸發記錄">
                                未觸發
                              </span>
                            }
                          </div>
                          <p class="text-sm text-slate-400 mt-0.5">{{ rule.description || '無描述' }}</p>
                          @if (rule.overlapWarning) {
                            <p class="text-sm text-amber-400/90 mt-1">⚠️ {{ rule.overlapWarning }}</p>
                          }
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <button (click)="openTestDialog(rule)"
                                class="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm rounded-lg transition-colors"
                                title="測試規則">
                          🧪 測試
                        </button>
                        <button (click)="editRule(rule)"
                                class="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg transition-colors">
                          編輯
                        </button>
                        <button (click)="toggleRule(rule)"
                                class="px-3 py-1.5 text-sm rounded-lg transition-colors"
                                [class.bg-amber-500/20]="rule.isActive"
                                [class.text-amber-400]="rule.isActive"
                                [class.hover:bg-amber-500/30]="rule.isActive"
                                [class.bg-emerald-500/20]="!rule.isActive"
                                [class.text-emerald-400]="!rule.isActive"
                                [class.hover:bg-emerald-500/30]="!rule.isActive">
                          {{ rule.isActive ? '暫停' : '啟用' }}
                        </button>
                        <button (click)="deleteRule(rule)"
                                class="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg transition-colors">
                          刪除
                        </button>
                      </div>
                    </div>
                    
                    <!-- 規則流程可視化 -->
                    <div class="px-4 pb-4">
                      <div class="flex items-center gap-4 p-3 bg-slate-800/50 rounded-lg">
                        <!-- 監控來源 -->
                        <div class="flex-1 text-center">
                          <div class="text-xs text-slate-500 mb-1">監控來源</div>
                          <div class="text-sm text-slate-300">
                            {{ rule.sourceType === 'all' ? '全部群組' : (rule.sourceGroupIds.length + ' 個群組') }}
                          </div>
                        </div>
                        <div class="text-slate-600">→</div>
                        <!-- 觸發條件 -->
                        <div class="flex-1 text-center">
                          <div class="text-xs text-slate-500 mb-1">關鍵詞集</div>
                          <div class="text-sm text-slate-300">
                            {{ getKeywordSetNames(rule.keywordSetIds) }}
                          </div>
                        </div>
                        <div class="text-slate-600">→</div>
                        <!-- 響應動作 -->
                        <div class="flex-1 text-center">
                          <div class="text-xs text-slate-500 mb-1">響應方式</div>
                          <div class="text-sm text-slate-300">
                            {{ getResponseDetail(rule) }}
                          </div>
                        </div>
                      </div>
                      
                      <!-- 統計信息 -->
                      <div class="flex items-center justify-between mt-3 text-xs text-slate-500">
                        <div class="flex items-center gap-4">
                          <span>觸發: {{ rule.triggerCount || 0 }} 次</span>
                          <span>成功: {{ rule.successCount || 0 }} 次</span>
                          <span>成功率: {{ getSuccessRate(rule) }}%</span>
                        </div>
                        <span>{{ rule.lastTriggered ? '最近: ' + formatTime(rule.lastTriggered) : '尚未觸發' }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <!-- 🆕 Phase 1: 豐富的空狀態 -->
              <div class="flex flex-col items-center justify-center h-full text-center py-10 px-6">
                <!-- 圖示 -->
                <div class="w-24 h-24 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
                  <span class="text-5xl">⚡</span>
                </div>
                <h3 class="text-xl font-semibold text-white mb-2">還沒有觸發規則</h3>
                <p class="text-slate-400 mb-4 max-w-sm text-sm leading-relaxed">
                  觸發規則讓 AI 在偵測到特定關鍵詞時自動採取行動——
                  回覆消息、發送模板、或開始私聊培育
                </p>

                @if (aiChatEnabled()) {
                  <div class="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm mb-5">
                    <span class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    AI 自動聊天已開啟，作為兜底響應方式
                  </div>
                }

                <!-- 使用場景示例 -->
                <div class="grid grid-cols-3 gap-3 max-w-lg mb-6 text-left">
                  <div class="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                    <div class="text-base mb-1.5">🔑</div>
                    <div class="text-xs font-medium text-white mb-0.5">詢盤識別</div>
                    <div class="text-xs text-slate-500">「多少錢」→ 發送報價</div>
                  </div>
                  <div class="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                    <div class="text-base mb-1.5">🤝</div>
                    <div class="text-xs font-medium text-white mb-0.5">意向跟進</div>
                    <div class="text-xs text-slate-500">「有興趣」→ 私聊邀請</div>
                  </div>
                  <div class="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                    <div class="text-base mb-1.5">🚫</div>
                    <div class="text-xs font-medium text-white mb-0.5">異議處理</div>
                    <div class="text-xs text-slate-500">「太貴了」→ AI 話術</div>
                  </div>
                </div>

                <button (click)="openCreateWizard()"
                        class="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl transition-all shadow-lg hover:shadow-amber-500/20 flex items-center gap-2 font-medium">
                  <span>🚀</span> 創建第一個規則
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    </div>

      } @else {
      <!-- 🆕 P4-2: 觸發歷史視圖 -->
      <div class="flex-1 overflow-y-auto space-y-4">

        <!-- 今日規則活躍概覽 -->
        <div class="grid grid-cols-3 gap-3">
          <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 text-center">
            <div class="text-2xl font-bold text-purple-400">{{ sessionLog().length }}</div>
            <div class="text-xs text-slate-500 mt-1">本次會話觸發</div>
          </div>
          <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 text-center">
            <div class="text-2xl font-bold text-emerald-400">{{ sessionLog().filter(e => e.success).length }}</div>
            <div class="text-xs text-slate-500 mt-1">成功執行</div>
          </div>
          <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 text-center">
            <div class="text-2xl font-bold text-amber-400">{{ totalTriggerCount() }}</div>
            <div class="text-xs text-slate-500 mt-1">累計觸發</div>
          </div>
        </div>

        <!-- 本次會話事件流 -->
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
            <h3 class="font-semibold text-white flex items-center gap-2">
              <span>⚡</span> 本次會話觸發記錄
            </h3>
            @if (sessionLog().length > 0) {
              <button (click)="clearSessionLog()"
                      class="text-xs text-slate-500 hover:text-red-400 transition-colors">
                清除記錄
              </button>
            }
          </div>
          <div class="max-h-64 overflow-y-auto">
            @if (sessionLog().length === 0) {
              <div class="p-8 text-center">
                <div class="text-4xl mb-3">📭</div>
                <p class="text-slate-400 text-sm">本次會話尚無觸發記錄</p>
                <p class="text-slate-500 text-xs mt-1">規則匹配關鍵詞後，記錄將實時顯示在此</p>
              </div>
            } @else {
              <div class="divide-y divide-slate-700/50">
                @for (event of sessionLog(); track event.id) {
                  <div class="flex items-center gap-4 px-4 py-3 hover:bg-slate-700/20 transition-colors">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                         [class.bg-emerald-500/20]="event.success"
                         [class.bg-red-500/20]="!event.success">
                      {{ event.success ? '✅' : '❌' }}
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-medium text-white truncate">{{ event.ruleName }}</div>
                      <div class="text-xs text-slate-500 mt-0.5">
                        <span class="text-slate-400">{{ event.keyword }}</span>
                        <span class="mx-1.5">→</span>
                        <span>{{ getActionLabel(event.responseType) }}</span>
                      </div>
                    </div>
                    <div class="text-xs text-slate-500 flex-shrink-0">
                      {{ formatEventTime(event.time) }}
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <!-- 全局規則活躍度排行 -->
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          <div class="p-4 border-b border-slate-700/50">
            <h3 class="font-semibold text-white flex items-center gap-2">
              <span>🏆</span> 規則活躍度排行
              <span class="text-xs text-slate-500 font-normal">(按觸發次數排序)</span>
            </h3>
          </div>
          <div class="divide-y divide-slate-700/50">
            @if (rules().length === 0) {
              <div class="p-8 text-center">
                <p class="text-slate-400 text-sm">尚未創建任何規則</p>
              </div>
            } @else {
              @for (rule of sortedByTriggerCount(); track rule.id) {
                <div class="flex items-center gap-4 px-4 py-3 hover:bg-slate-700/20 transition-colors">
                  <div class="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-bold"
                       [class.bg-amber-500/20]="rule.isActive"
                       [class.bg-slate-700/50]="!rule.isActive"
                       [class.text-amber-400]="rule.isActive"
                       [class.text-slate-500]="!rule.isActive">
                    {{ getResponseTypeIcon(rule.responseType) }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium text-white truncate">{{ rule.name }}</span>
                      @if (!rule.isActive) {
                        <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-500">已停用</span>
                      }
                    </div>
                    <div class="flex items-center gap-3 mt-1">
                      <!-- 命中率條形 -->
                      <div class="flex-1 h-1.5 bg-slate-700/60 rounded-full overflow-hidden max-w-32">
                        <div class="h-full rounded-full transition-all"
                             [class.bg-emerald-400]="getRuleSuccessRate(rule) >= 70"
                             [class.bg-amber-400]="getRuleSuccessRate(rule) >= 40 && getRuleSuccessRate(rule) < 70"
                             [class.bg-red-400]="getRuleSuccessRate(rule) < 40"
                             [style.width.%]="getRuleSuccessRate(rule)">
                        </div>
                      </div>
                      <span class="text-xs text-slate-500">{{ getRuleSuccessRate(rule) }}% 命中率</span>
                    </div>
                  </div>
                  <div class="text-right flex-shrink-0">
                    <div class="text-sm font-bold text-white">{{ rule.triggerCount || 0 }}</div>
                    <div class="text-[10px] text-slate-500">觸發次數</div>
                  </div>
                  @if (rule.lastTriggered) {
                    <div class="text-xs text-slate-500 flex-shrink-0 w-20 text-right">
                      {{ formatLastTriggered(rule.lastTriggered) }}
                    </div>
                  } @else {
                    <div class="text-xs text-slate-600 flex-shrink-0 w-20 text-right">從未觸發</div>
                  }
                </div>
              }
            }
          </div>
        </div>

      </div>
      } <!-- end mainView history -->
    </div>
    
    <!-- 創建/編輯規則對話框 -->
    @if (showWizard()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="closeWizard()">
        <div class="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl" 
             (click)="$event.stopPropagation()">
          <!-- 標題 -->
          <div class="p-6 border-b border-slate-700 flex items-center justify-between">
            <div>
              <h2 class="text-xl font-bold text-white">{{ editingRule() ? '編輯規則' : '創建觸發規則' }}</h2>
              <p class="text-sm text-slate-400 mt-1">Step {{ wizardStep() }}/4: {{ getStepTitle() }}</p>
            </div>
            <button (click)="closeWizard()" class="text-slate-400 hover:text-white">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <!-- 步驟指示器 -->
          <div class="px-6 py-4 border-b border-slate-700/50">
            <div class="flex items-center justify-between">
              @for (step of [1,2,3,4]; track step) {
                <div class="flex items-center">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors"
                       [class.bg-amber-500]="wizardStep() >= step"
                       [class.text-white]="wizardStep() >= step"
                       [class.bg-slate-700]="wizardStep() < step"
                       [class.text-slate-400]="wizardStep() < step">
                    {{ step }}
                  </div>
                  @if (step < 4) {
                    <div class="w-16 h-0.5 mx-2"
                         [class.bg-amber-500]="wizardStep() > step"
                         [class.bg-slate-700]="wizardStep() <= step">
                    </div>
                  }
                </div>
              }
            </div>
          </div>
          
          <!-- 步驟內容 -->
          <div class="p-6 overflow-y-auto" style="max-height: calc(90vh - 250px);">
            @switch (wizardStep()) {
              @case (1) {
                <!-- Step 1: 基本信息 -->
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">規則名稱 *</label>
                    <input type="text" [(ngModel)]="formData.name"
                           class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                           placeholder="例如：USDT 交易諮詢">
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">規則描述</label>
                    <textarea [(ngModel)]="formData.description" rows="3"
                              class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-amber-500 focus:outline-none resize-none"
                              placeholder="描述這個規則的用途..."></textarea>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">優先級</label>
                    <div class="flex gap-3">
                      <button (click)="formData.priority = 3"
                              class="flex-1 px-4 py-3 rounded-lg border transition-colors"
                              [class.bg-red-500/20]="formData.priority === 3"
                              [class.border-red-500/50]="formData.priority === 3"
                              [class.text-red-400]="formData.priority === 3"
                              [class.bg-slate-700]="formData.priority !== 3"
                              [class.border-slate-600]="formData.priority !== 3"
                              [class.text-slate-300]="formData.priority !== 3">
                        高優先
                      </button>
                      <button (click)="formData.priority = 2"
                              class="flex-1 px-4 py-3 rounded-lg border transition-colors"
                              [class.bg-amber-500/20]="formData.priority === 2"
                              [class.border-amber-500/50]="formData.priority === 2"
                              [class.text-amber-400]="formData.priority === 2"
                              [class.bg-slate-700]="formData.priority !== 2"
                              [class.border-slate-600]="formData.priority !== 2"
                              [class.text-slate-300]="formData.priority !== 2">
                        中優先
                      </button>
                      <button (click)="formData.priority = 1"
                              class="flex-1 px-4 py-3 rounded-lg border transition-colors"
                              [class.bg-slate-500/20]="formData.priority === 1"
                              [class.border-slate-500/50]="formData.priority === 1"
                              [class.text-slate-400]="formData.priority === 1"
                              [class.bg-slate-700]="formData.priority !== 1"
                              [class.border-slate-600]="formData.priority !== 1"
                              [class.text-slate-300]="formData.priority !== 1">
                        低優先
                      </button>
                    </div>
                  </div>
                </div>
              }
              
              @case (2) {
                <!-- Step 2: 觸發條件 -->
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">監控來源</label>
                    <div class="space-y-2">
                      <label class="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                        <input type="radio" name="sourceType" value="all" 
                               [(ngModel)]="formData.sourceType"
                               class="w-4 h-4 text-amber-500">
                        <span class="text-slate-300">全部監控群組（{{ stateService.groups().length }} 個）</span>
                      </label>
                      <label class="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                        <input type="radio" name="sourceType" value="specific"
                               [(ngModel)]="formData.sourceType"
                               class="w-4 h-4 text-amber-500">
                        <span class="text-slate-300">指定群組</span>
                      </label>
                    </div>
                    @if (formData.sourceType === 'specific') {
                      <div class="mt-3 p-3 bg-slate-700/50 rounded-lg max-h-40 overflow-y-auto">
                        @for (group of stateService.groups(); track group.id) {
                          <label class="flex items-center gap-2 p-2 hover:bg-slate-600/50 rounded cursor-pointer">
                            <input type="checkbox" 
                                   [checked]="isGroupSelected(group.id)"
                                   (change)="toggleGroupSelection(group.id)"
                                   class="w-4 h-4 text-amber-500">
                            <span class="text-slate-300 text-sm">{{ group.name }}</span>
                          </label>
                        }
                      </div>
                    }
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">關鍵詞集 *</label>
                    <div class="p-3 bg-slate-700/50 rounded-lg max-h-48 overflow-y-auto">
                      @for (set of stateService.keywordSets(); track set.id) {
                        <label class="flex items-center gap-2 p-2 hover:bg-slate-600/50 rounded cursor-pointer">
                          <input type="checkbox"
                                 [checked]="isKeywordSetSelected(set.id)"
                                 (change)="toggleKeywordSetSelection(set.id)"
                                 class="w-4 h-4 text-amber-500">
                          <span class="text-slate-300 text-sm">{{ set.name }}</span>
                          <span class="text-slate-500 text-xs">({{ set.keywords?.length || 0 }} 個關鍵詞)</span>
                        </label>
                      }
                      @if (stateService.keywordSets().length === 0) {
                        <p class="text-slate-500 text-sm text-center py-4">
                          暫無關鍵詞集，請先創建
                        </p>
                      }
                    </div>
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">附加條件</label>
                    <div class="space-y-2">
                      <label class="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                        <input type="checkbox" [(ngModel)]="formData.conditions.oncePerUser"
                               class="w-4 h-4 text-amber-500">
                        <span class="text-slate-300 text-sm">每用戶只觸發一次</span>
                      </label>
                      <label class="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                        <input type="checkbox" [(ngModel)]="formData.conditions.excludeAdmin"
                               class="w-4 h-4 text-amber-500">
                        <span class="text-slate-300 text-sm">排除群管理員</span>
                      </label>
                    </div>
                  </div>
                </div>
              }
              
              @case (3) {
                <!-- Step 3: 響應動作 -->
                <div class="space-y-4">
                  <label class="block text-sm font-medium text-slate-300 mb-2">響應方式 *</label>
                  
                  <div class="space-y-3">
                    <!-- AI 智能對話 -->
                    <div (click)="formData.responseType = 'ai_chat'"
                         class="p-4 rounded-lg border cursor-pointer transition-colors"
                         [class.bg-amber-500/10]="formData.responseType === 'ai_chat'"
                         [class.border-amber-500/50]="formData.responseType === 'ai_chat'"
                         [class.bg-slate-700]="formData.responseType !== 'ai_chat'"
                         [class.border-slate-600]="formData.responseType !== 'ai_chat'">
                      <div class="flex items-start gap-3">
                        <span class="text-2xl">🤖</span>
                        <div class="flex-1">
                          <div class="font-medium text-white">AI 智能對話</div>
                          <p class="text-sm text-slate-400 mt-1">讓 AI 根據上下文智能回覆，更自然更個性化</p>
                          @if (formData.responseType === 'ai_chat') {
                            <div class="mt-3 flex gap-2">
                              <button (click)="formData.responseConfig.aiMode = 'full'; $event.stopPropagation()"
                                      class="px-3 py-1.5 rounded text-sm"
                                      [class.bg-emerald-500/20]="formData.responseConfig.aiMode === 'full'"
                                      [class.text-emerald-400]="formData.responseConfig.aiMode === 'full'"
                                      [class.bg-slate-600]="formData.responseConfig.aiMode !== 'full'"
                                      [class.text-slate-300]="formData.responseConfig.aiMode !== 'full'">
                                全自動
                              </button>
                              <button (click)="formData.responseConfig.aiMode = 'semi'; $event.stopPropagation()"
                                      class="px-3 py-1.5 rounded text-sm"
                                      [class.bg-amber-500/20]="formData.responseConfig.aiMode === 'semi'"
                                      [class.text-amber-400]="formData.responseConfig.aiMode === 'semi'"
                                      [class.bg-slate-600]="formData.responseConfig.aiMode !== 'semi'"
                                      [class.text-slate-300]="formData.responseConfig.aiMode !== 'semi'">
                                半自動（需確認）
                              </button>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                    
                    <!-- 使用固定模板 -->
                    <div (click)="formData.responseType = 'template'"
                         class="p-4 rounded-lg border cursor-pointer transition-colors"
                         [class.bg-amber-500/10]="formData.responseType === 'template'"
                         [class.border-amber-500/50]="formData.responseType === 'template'"
                         [class.bg-slate-700]="formData.responseType !== 'template'"
                         [class.border-slate-600]="formData.responseType !== 'template'">
                      <div class="flex items-start gap-3">
                        <span class="text-2xl">📝</span>
                        <div class="flex-1">
                          <div class="font-medium text-white">使用固定模板</div>
                          <p class="text-sm text-slate-400 mt-1">發送預設的聊天模板，效果穩定可控</p>
                          @if (formData.responseType === 'template') {
                            <div class="mt-3">
                              <select [(ngModel)]="formData.responseConfig.templateId"
                                      (click)="$event.stopPropagation()"
                                      class="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-sm text-white">
                                <option [ngValue]="undefined">選擇模板...</option>
                                @for (template of stateService.chatTemplates(); track template.id) {
                                  <option [ngValue]="template.id">{{ template.name }}</option>
                                }
                              </select>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                    
                    <!-- 僅記錄 -->
                    <div (click)="formData.responseType = 'record_only'"
                         class="p-4 rounded-lg border cursor-pointer transition-colors"
                         [class.bg-amber-500/10]="formData.responseType === 'record_only'"
                         [class.border-amber-500/50]="formData.responseType === 'record_only'"
                         [class.bg-slate-700]="formData.responseType !== 'record_only'"
                         [class.border-slate-600]="formData.responseType !== 'record_only'">
                      <div class="flex items-start gap-3">
                        <span class="text-2xl">📋</span>
                        <div class="flex-1">
                          <div class="font-medium text-white">僅記錄</div>
                          <p class="text-sm text-slate-400 mt-1">只將用戶加入 Lead 庫，不自動發送任何消息</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              }
              
              @case (4) {
                <!-- Step 4: 確認和發送設置 -->
                <div class="space-y-4">
                  <!-- 規則摘要 -->
                  <div class="p-4 bg-slate-700/50 rounded-lg">
                    <h4 class="font-medium text-white mb-3">📋 規則摘要</h4>
                    <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                      <div class="text-center flex-1">
                        <div class="text-xs text-slate-500">監控來源</div>
                        <div class="text-sm text-slate-300 mt-1">
                          {{ formData.sourceType === 'all' ? '全部群組' : (formData.sourceGroupIds.length + ' 個群組') }}
                        </div>
                      </div>
                      <div class="text-slate-600">→</div>
                      <div class="text-center flex-1">
                        <div class="text-xs text-slate-500">關鍵詞集</div>
                        <div class="text-sm text-slate-300 mt-1">{{ formData.keywordSetIds.length }} 個詞集</div>
                      </div>
                      <div class="text-slate-600">→</div>
                      <div class="text-center flex-1">
                        <div class="text-xs text-slate-500">響應方式</div>
                        <div class="text-sm text-slate-300 mt-1">{{ getResponseLabel(formData.responseType) }}</div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- 發送設置 -->
                  @if (formData.responseType !== 'record_only') {
                    <div>
                      <h4 class="font-medium text-white mb-3">⚙️ 發送設置</h4>
                      <div class="space-y-3">
                        <div>
                          <label class="block text-sm text-slate-400 mb-2">發送延遲（秒）</label>
                          <div class="flex items-center gap-3">
                            <input type="number" [(ngModel)]="formData.delayMin" min="0" max="300"
                                   class="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-center">
                            <span class="text-slate-500">-</span>
                            <input type="number" [(ngModel)]="formData.delayMax" min="0" max="600"
                                   class="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-center">
                            <span class="text-slate-500 text-sm">秒</span>
                          </div>
                        </div>
                        <div>
                          <label class="block text-sm text-slate-400 mb-2">每帳號每日限制</label>
                          <input type="number" [(ngModel)]="formData.dailyLimit" min="1" max="500"
                                 class="w-32 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white">
                          <span class="text-slate-500 text-sm ml-2">條消息</span>
                        </div>
                      </div>
                    </div>
                  }
                  
                  <!-- 附加動作 -->
                  <div>
                    <h4 class="font-medium text-white mb-3">📌 附加動作</h4>
                    <div class="space-y-2">
                      <label class="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                        <input type="checkbox" [(ngModel)]="formData.autoAddLead"
                               class="w-4 h-4 text-amber-500">
                        <span class="text-slate-300 text-sm">自動加入 Lead 庫</span>
                      </label>
                      <label class="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer hover:bg-slate-600 transition-colors">
                        <input type="checkbox" [(ngModel)]="formData.notifyMe"
                               class="w-4 h-4 text-amber-500">
                        <span class="text-slate-300 text-sm">發送通知給我</span>
                      </label>
                    </div>
                  </div>
                </div>
              }
            }
          </div>
          
          <!-- 底部按鈕 -->
          <div class="p-6 border-t border-slate-700 flex items-center justify-between">
            <button (click)="prevStep()" 
                    [disabled]="wizardStep() === 1"
                    class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              ← 上一步
            </button>
            <div class="flex gap-3">
              <button (click)="closeWizard()"
                      class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                取消
              </button>
              @if (wizardStep() < 4) {
                <button (click)="nextStep()"
                        [disabled]="!canProceed()"
                        class="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  下一步 →
                </button>
              } @else {
                <button (click)="saveRule()"
                        [disabled]="!canSave()"
                        class="px-6 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  <span>🚀</span> {{ editingRule() ? '保存修改' : '立即啟用' }}
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    }
    
    <!-- 測試規則對話框 -->
    @if (showTestDialog()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" (click)="closeTestDialog()">
        <div class="bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-700/50" (click)="$event.stopPropagation()">
          <!-- 標題 -->
          <div class="p-6 border-b border-slate-700/50">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <span class="text-xl">🧪</span>
              </div>
              <div>
                <h3 class="text-lg font-bold text-white">測試規則</h3>
                <p class="text-sm text-slate-400">{{ testingRule()?.name }}</p>
              </div>
            </div>
          </div>
          
          <!-- 內容 -->
          <div class="p-6 space-y-4">
            <!-- 測試消息輸入 -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">模擬消息內容</label>
              <textarea [(ngModel)]="testMessage"
                        rows="3"
                        placeholder="輸入要測試的消息內容，例如：我想了解更多關於投資的信息..."
                        class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500">
              </textarea>
            </div>
            
            <!-- 測試結果 -->
            @if (testResult()) {
              <div class="bg-slate-700/50 rounded-lg p-4 space-y-3">
                <div class="flex items-center gap-2">
                  @if (testResult()!.matched) {
                    <span class="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                      <span class="text-emerald-400">✓</span>
                    </span>
                    <span class="text-emerald-400 font-medium">關鍵詞匹配成功</span>
                  } @else {
                    <span class="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center">
                      <span class="text-red-400">✗</span>
                    </span>
                    <span class="text-red-400 font-medium">未匹配任何關鍵詞</span>
                  }
                </div>
                
                @if (testResult()!.matched) {
                  <!-- 匹配的關鍵詞 -->
                  <div class="text-sm">
                    <span class="text-slate-400">匹配的關鍵詞：</span>
                    <span class="text-amber-400">{{ testResult()!.matchedKeywords.join(', ') }}</span>
                  </div>
                  
                  <!-- 條件檢查 -->
                  <div class="text-sm">
                    <span class="text-slate-400">額外條件：</span>
                    @if (testResult()!.conditionsMet) {
                      <span class="text-emerald-400">全部滿足 ✓</span>
                    } @else {
                      <span class="text-amber-400">部分條件可能不滿足</span>
                    }
                  </div>
                  
                  <!-- 響應預覽 -->
                  @if (testResult()!.responsePreview) {
                    <div class="mt-3 p-3 bg-slate-800 rounded-lg">
                      <div class="text-xs text-slate-500 mb-1">響應預覽</div>
                      <div class="text-sm text-slate-300 whitespace-pre-wrap">{{ testResult()!.responsePreview }}</div>
                    </div>
                  }
                }
              </div>
            }
          </div>
          
          <!-- 按鈕 -->
          <div class="p-6 border-t border-slate-700/50 flex justify-end gap-3">
            <button (click)="closeTestDialog()"
                    class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
              關閉
            </button>
            <button (click)="runTest()"
                    [disabled]="!testMessage.trim() || isTestingRule()"
                    class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              @if (isTestingRule()) {
                <span class="animate-spin">⏳</span> 測試中...
              } @else {
                <span>🚀</span> 執行測試
              }
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class TriggerRulesComponent implements OnInit, OnDestroy {
  stateService = inject(MonitoringStateService);
  private ipcService = inject(ElectronIpcService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmDialogService);
  
  // 狀態
  rules = signal<TriggerRule[]>([]);
  isLoading = signal(false);
  filterStatus = 'all';
  
  // 🔧 FIX: 從 StateService 同步數據
  private stateEffect = effect(() => {
    const stateRules = this.stateService.triggerRules();
    if (stateRules.length > 0 && this.rules().length === 0) {
      console.log('[TriggerRules] Syncing from StateService:', stateRules.length, 'rules');
      this.rules.set(stateRules as TriggerRule[]);
      this.isLoading.set(false);
    }
  });
  
  // 向導狀態
  showWizard = signal(false);
  wizardStep = signal(1);
  editingRule = signal<TriggerRule | null>(null);
  
  // 表單數據
  formData: TriggerRule = this.getEmptyFormData();
  
  // AI 設置
  aiChatEnabled = signal(false);
  aiChatMode = signal<'full' | 'semi'>('semi');
  
  // 測試功能
  showTestDialog = signal(false);
  testingRule = signal<TriggerRule | null>(null);
  testMessage = '';
  testResult = signal<{
    matched: boolean;
    matchedKeywords: string[];
    conditionsMet: boolean;
    responsePreview: string;
  } | null>(null);
  isTestingRule = signal(false);
  
  // 計算屬性
  activeRules = computed(() => this.rules().filter(r => r.isActive));
  
  totalTriggerCount = computed(() => 
    this.rules().reduce((sum, r) => sum + (r.triggerCount || 0), 0)
  );
  
  averageSuccessRate = computed(() => {
    const rules = this.rules().filter(r => (r.triggerCount || 0) > 0);
    if (rules.length === 0) return 0;
    const total = rules.reduce((sum, r) => {
      const rate = r.triggerCount ? (r.successCount || 0) / r.triggerCount * 100 : 0;
      return sum + rate;
    }, 0);
    return Math.round(total / rules.length);
  });
  
  // 🆕 Phase 2: 場景分類標籤
  sceneFilter = signal<'all' | 'ai' | 'template' | 'record' | 'high'>('all');

  readonly sceneTabs = [
    { value: 'all' as const,      icon: '⚡', label: '全部',    activeColor: 'rgba(245,158,11,0.7)' },
    { value: 'ai' as const,       icon: '🤖', label: 'AI 響應', activeColor: 'rgba(139,92,246,0.7)' },
    { value: 'template' as const, icon: '📝', label: '模板發送', activeColor: 'rgba(6,182,212,0.7)'  },
    { value: 'record' as const,   icon: '📊', label: '僅記錄',  activeColor: 'rgba(100,116,139,0.7)' },
    { value: 'high' as const,     icon: '🔥', label: '高優先',  activeColor: 'rgba(239,68,68,0.7)'  },
  ];

  filteredRules = computed(() => {
    const all = this.rules();
    if (this.filterStatus === 'active') return all.filter(r => r.isActive);
    if (this.filterStatus === 'inactive') return all.filter(r => !r.isActive);
    return all;
  });

  scenedRules = computed(() => {
    const base = this.filteredRules();
    const scene = this.sceneFilter();
    if (scene === 'all') return base;
    if (scene === 'ai') return base.filter(r => r.responseType === 'ai_chat');
    if (scene === 'template') return base.filter(r => r.responseType === 'template' || r.responseType === 'script');
    if (scene === 'record') return base.filter(r => r.responseType === 'record_only');
    if (scene === 'high') return base.filter(r => r.priority === 3);
    return base;
  });

  // 🆕 Phase 3: 規則效果分析
  showAnalysisPanel = signal(true);

  // 🆕 P4-2: 觸發歷史視圖
  mainView = signal<'rules' | 'history'>('rules');

  sessionLog = signal<Array<{
    id: string; time: Date; ruleName: string;
    keyword: string; responseType: string; success: boolean;
  }>>([]);

  sortedByTriggerCount = computed(() =>
    [...this.rules()].sort((a, b) => (b.triggerCount || 0) - (a.triggerCount || 0))
  );

  /** 沉睡規則：啟用中但從未觸發，或最近 7 天未觸發 */
  sleepingRules = computed(() => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return this.activeRules().filter(rule => {
      if (!rule.triggerCount || rule.triggerCount === 0) return true;
      if (rule.lastTriggered) {
        const last = new Date(rule.lastTriggered).getTime();
        return (now - last) > sevenDays;
      }
      return false;
    });
  });

  /** 最佳表現規則（成功率最高且有觸發記錄） */
  topPerformingRule = computed(() => {
    const withData = this.rules().filter(r => (r.triggerCount || 0) > 0);
    if (withData.length === 0) return null;
    return withData.reduce((best, r) =>
      this.getRuleSuccessRate(r) > this.getRuleSuccessRate(best) ? r : best
    );
  });

  /** 規則引擎健康分 (0-100) */
  engineHealthScore = computed(() => {
    const all = this.rules();
    if (all.length === 0) return 0;
    const active = this.activeRules();
    if (active.length === 0) return 10;

    // 因素1：活躍比例 (30分)
    const activeRatio = active.length / all.length;
    const score1 = activeRatio * 30;

    // 因素2：平均命中率 (40分)
    const score2 = (this.averageSuccessRate() / 100) * 40;

    // 因素3：沉睡規則懲罰 (30分)
    const sleepRatio = this.sleepingRules().length / Math.max(active.length, 1);
    const score3 = (1 - sleepRatio) * 30;

    return Math.round(score1 + score2 + score3);
  });

  /** 自動優化建議 */
  ruleOptimizationTips = computed(() => {
    const tips: string[] = [];
    const sleeping = this.sleepingRules();
    const avgRate = this.averageSuccessRate();
    const total = this.totalTriggerCount();

    if (sleeping.length > 0) {
      tips.push(`${sleeping.length} 條規則長期未觸發，建議檢查關鍵詞集或監控群組配置`);
    }
    if (avgRate < 50 && total > 10) {
      tips.push('整體命中率低於 50%，建議優化響應類型或精簡關鍵詞');
    }
    if (this.activeRules().length === 0 && this.rules().length > 0) {
      tips.push('所有規則已停用，AI 將使用默認回覆，建議啟用至少一條規則');
    }
    if (this.rules().filter(r => r.responseType === 'record_only').length === this.rules().length) {
      tips.push('所有規則僅記錄不回覆，建議添加 AI 響應或模板回覆規則');
    }
    return tips;
  });

  // 🆕 P4-2: History view helpers
  clearSessionLog() {
    this.sessionLog.set([]);
  }

  getActionLabel(responseType: string): string {
    const map: Record<string, string> = {
      'ai_chat': '🤖 AI 回覆',
      'template': '📄 模板發送',
      'script': '📝 腳本執行',
      'record_only': '📋 僅記錄'
    };
    return map[responseType] || responseType;
  }

  getResponseTypeIcon(responseType: string): string {
    const map: Record<string, string> = {
      'ai_chat': '🤖',
      'template': '📄',
      'script': '📝',
      'record_only': '📋'
    };
    return map[responseType] || '⚡';
  }

  formatEventTime(time: Date): string {
    return time.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  formatLastTriggered(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}分鐘前`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}小時前`;
    return `${Math.floor(hrs / 24)}天前`;
  }

  getRuleCountForScene(scene: string): number {
    const base = this.filteredRules();
    if (scene === 'all') return base.length;
    if (scene === 'ai') return base.filter(r => r.responseType === 'ai_chat').length;
    if (scene === 'template') return base.filter(r => r.responseType === 'template' || r.responseType === 'script').length;
    if (scene === 'record') return base.filter(r => r.responseType === 'record_only').length;
    if (scene === 'high') return base.filter(r => r.priority === 3).length;
    return 0;
  }

  getRuleSuccessRate(rule: TriggerRule): number {
    if (!rule.triggerCount || rule.triggerCount === 0) return 0;
    return Math.round((rule.successCount || 0) / rule.triggerCount * 100);
  }

  getRuleHealthClass(rule: TriggerRule): string {
    const rate = this.getRuleSuccessRate(rule);
    if (rate >= 70) return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
    if (rate >= 30) return 'bg-amber-500/15 text-amber-400 border border-amber-500/20';
    return 'bg-red-500/15 text-red-400 border border-red-500/20';
  }
  
  private listeners: (() => void)[] = [];
  // 🔧 FIX: 添加重試計數
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;
  
  ngOnInit() {
    // 🔧 FIX: 先設置監聯器，再發送請求，確保不會丟失事件
    this.setupListeners();
    
    // 🔧 FIX: 先檢查 StateService 是否已有數據
    const stateRules = this.stateService.triggerRules();
    if (stateRules.length > 0) {
      console.log('[TriggerRules] Using existing StateService data:', stateRules.length, 'rules');
      this.rules.set(stateRules as TriggerRule[]);
    } else {
      // 沒有數據則請求加載
      this.stateService.loadAll();
    }
    
    this.loadRules();
    this.loadAISettings();
  }
  
  ngOnDestroy() {
    this.listeners.forEach(cleanup => cleanup());
  }
  
  private setupListeners() {
    const cleanup1 = this.ipcService.on('trigger-rules-result', (data: any) => {
      console.log('[TriggerRules] Received trigger-rules-result:', data);
      this.isLoading.set(false);
      this.retryCount = 0;  // 重置重試計數
      if (data.success) {
        this.rules.set(data.rules || []);
      } else if (data.error) {
        console.error('[TriggerRules] Error loading rules:', data.error);
        this.toastService.error('加載規則失敗: ' + data.error);
      }
    });
    this.listeners.push(cleanup1);
    
    const cleanup2 = this.ipcService.on('save-trigger-rule-result', (data: any) => {
      console.log('[TriggerRules] Received save-trigger-rule-result:', data);
      if (data.success) {
        this.toastService.success(data.message || '規則已保存');
        this.closeWizard();
      } else {
        const msg = (data.error || '保存失敗') as string;
        const friendly = msg.toLowerCase().includes('locked') || msg.toLowerCase().includes('database is locked')
          ? '系統繁忙，請稍後再試'
          : msg;
        this.toastService.error(friendly);
      }
    });
    this.listeners.push(cleanup2);
    
    const cleanup3 = this.ipcService.on('delete-trigger-rule-result', (data: any) => {
      if (data.success) {
        this.toastService.success('規則已刪除');
      }
    });
    this.listeners.push(cleanup3);
    
    const cleanup4 = this.ipcService.on('toggle-trigger-rule-result', (data: any) => {
      if (data.success) {
        // 規則列表會自動刷新
      }
    });
    this.listeners.push(cleanup4);

    
    
    // 🆕 P4-2: 實時觸發事件監聽（累積本次會話記錄）
    const cleanupTrigger = this.ipcService.on('rule-triggered', (data: any) => {
      if (data?.ruleName || data?.rule_name) {
        this.sessionLog.update(prev => [{
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          time: new Date(),
          ruleName: data.ruleName || data.rule_name || '未知規則',
          keyword: data.keyword || data.matched_keyword || '',
          responseType: data.responseType || data.response_type || 'record_only',
          success: data.success !== false
        }, ...prev].slice(0, 50));
      }
    });
    this.listeners.push(cleanupTrigger);

    // AI 設置監聽
    const cleanup5 = this.ipcService.on('ai-settings-loaded', (data: any) => {
      if (data) {
        // 從數據庫 AI 設置中讀取（注意字段名映射）
        const autoEnabled = data.auto_chat_enabled === 1 || data.autoChatEnabled === true;
        this.aiChatEnabled.set(autoEnabled);
        this.aiChatMode.set(data.auto_chat_mode || data.autoChatMode || 'semi');
      }
    });
    this.listeners.push(cleanup5);
  }
  
  loadRules() {
    this.isLoading.set(true);
    console.log('[TriggerRules] Sending get-trigger-rules request');
    this.ipcService.send('get-trigger-rules', {});
    
    // 🔧 FIX: 添加超時重試機制
    setTimeout(() => {
      if (this.isLoading() && this.rules().length === 0 && this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        console.log(`[TriggerRules] Retrying... (${this.retryCount}/${this.MAX_RETRIES})`);
        this.ipcService.send('get-trigger-rules', {});
      } else if (this.isLoading()) {
        this.isLoading.set(false);
      }
    }, 3000);
  }
  
  loadAISettings() {
    // 使用 send/on 模式獲取 AI 設置
    this.ipcService.send('get-ai-settings', {});
  }
  
  refreshData() {
    this.retryCount = 0;  // 🔧 FIX: 刷新時重置重試計數
    this.loadRules();
    this.stateService.loadAll();
  }
  
  handleConfigAction(action: string) {
    // 處理配置動作
  }
  
  // 向導相關
  openCreateWizard() {
    this.editingRule.set(null);
    this.formData = this.getEmptyFormData();
    this.wizardStep.set(1);
    this.showWizard.set(true);
  }
  
  editRule(rule: TriggerRule) {
    this.editingRule.set(rule);
    this.formData = { ...rule };
    this.wizardStep.set(1);
    this.showWizard.set(true);
  }
  
  closeWizard() {
    this.showWizard.set(false);
    this.editingRule.set(null);
    this.formData = this.getEmptyFormData();
  }
  
  getEmptyFormData(): TriggerRule {
    return {
      name: '',
      description: '',
      priority: 2,
      isActive: true,
      sourceType: 'all',
      sourceGroupIds: [],
      keywordSetIds: [],
      conditions: {
        oncePerUser: false,
        excludeAdmin: false
      },
      responseType: 'ai_chat',
      responseConfig: {
        aiMode: 'full'
      },
      senderType: 'auto',
      senderAccountIds: [],
      delayMin: 30,
      delayMax: 120,
      dailyLimit: 50,
      autoAddLead: true,
      notifyMe: false
    };
  }
  
  getStepTitle(): string {
    const titles: Record<number, string> = {
      1: '基本信息',
      2: '觸發條件',
      3: '響應動作',
      4: '確認設置'
    };
    return titles[this.wizardStep()] || '';
  }
  
  prevStep() {
    if (this.wizardStep() > 1) {
      this.wizardStep.update(s => s - 1);
    }
  }
  
  nextStep() {
    if (this.wizardStep() < 4 && this.canProceed()) {
      this.wizardStep.update(s => s + 1);
    }
  }
  
  canProceed(): boolean {
    switch (this.wizardStep()) {
      case 1:
        return this.formData.name.trim().length > 0;
      case 2:
        return this.formData.keywordSetIds.length > 0;
      case 3:
        if (this.formData.responseType === 'template') {
          return !!this.formData.responseConfig.templateId;
        }
        return true;
      default:
        return true;
    }
  }
  
  canSave(): boolean {
    return this.formData.name.trim().length > 0 && this.formData.keywordSetIds.length > 0;
  }
  
  isGroupSelected(groupId: number | string): boolean {
    return this.formData.sourceGroupIds.some(id => String(id) === String(groupId));
  }
  
  isKeywordSetSelected(setId: number | string): boolean {
    return this.formData.keywordSetIds.some(id => String(id) === String(setId));
  }
  
  toggleGroupSelection(groupId: number | string) {
    const idx = this.formData.sourceGroupIds.findIndex(id => String(id) === String(groupId));
    if (idx === -1) {
      this.formData.sourceGroupIds.push(groupId);
    } else {
      this.formData.sourceGroupIds.splice(idx, 1);
    }
  }
  
  toggleKeywordSetSelection(setId: number | string) {
    const idx = this.formData.keywordSetIds.findIndex(id => String(id) === String(setId));
    if (idx === -1) {
      this.formData.keywordSetIds.push(setId);
    } else {
      this.formData.keywordSetIds.splice(idx, 1);
    }
  }
  
  saveRule() {
    const payload = {
      ...this.formData,
      id: this.editingRule()?.id
    };
    this.ipcService.send('save-trigger-rule', payload);
  }
  
  async toggleRule(rule: TriggerRule) {
    this.ipcService.send('toggle-trigger-rule', {
      id: rule.id,
      isActive: !rule.isActive
    });
  }
  
  async deleteRule(rule: TriggerRule) {
    const confirmed = await this.confirmService.confirm({
      title: '刪除規則',
      message: `確定要刪除規則「${rule.name}」嗎？此操作無法撤銷。`,
      confirmText: '刪除',
      cancelText: '取消',
      type: 'danger'
    });
    
    if (confirmed) {
      this.ipcService.send('delete-trigger-rule', { id: rule.id });
    }
  }
  
  // 輔助方法
  getResponseIcon(type: string): string {
    const icons: Record<string, string> = {
      'ai_chat': '🤖',
      'template': '📝',
      'script': '📖',
      'record_only': '📋'
    };
    return icons[type] || '⚡';
  }
  
  getResponseLabel(type: string): string {
    const labels: Record<string, string> = {
      'ai_chat': 'AI 智能對話',
      'template': '固定模板',
      'script': '執行劇本',
      'record_only': '僅記錄'
    };
    return labels[type] || type;
  }
  
  getResponseDetail(rule: TriggerRule): string {
    const baseLabel = this.getResponseLabel(rule.responseType);
    
    if (rule.responseType === 'template' && rule.responseConfig?.templateId) {
      const templateName = this.getTemplateName(rule.responseConfig.templateId);
      return `${baseLabel}: ${templateName}`;
    }
    
    if (rule.responseType === 'ai_chat' && rule.responseConfig?.aiMode) {
      const modeLabel = rule.responseConfig.aiMode === 'full' ? '全自動' : '半自動';
      return `${baseLabel} (${modeLabel})`;
    }
    
    return baseLabel;
  }
  
  getTemplateName(templateId: number | string | undefined): string {
    if (!templateId) return '未選擇';
    const templates = this.stateService.chatTemplates();
    const template = templates.find(t => String(t.id) === String(templateId));
    return template?.name || `模板 #${templateId}`;
  }
  
  getPriorityLabel(priority: number): string {
    const labels: Record<number, string> = {
      3: '高優先',
      2: '中優先',
      1: '低優先'
    };
    return labels[priority] || '中優先';
  }
  
  getKeywordSetNames(ids: (number | string)[]): string {
    if (!ids || ids.length === 0) return '未選擇';
    const sets = this.stateService.keywordSets();
    const names = ids.map(id => {
      const idStr = String(id);
      const set = sets.find(s => String(s.id) === idStr);
      return set?.name || `#${id}`;
    });
    if (names.length > 2) {
      return `${names.slice(0, 2).join(', ')} 等 ${names.length} 個`;
    }
    return names.join(', ');
  }
  
  getSuccessRate(rule: TriggerRule): number {
    if (!rule.triggerCount || rule.triggerCount === 0) return 0;
    return Math.round((rule.successCount || 0) / rule.triggerCount * 100);
  }
  
  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '剛剛';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
    return date.toLocaleDateString();
  }
  
  // ============ 測試功能 ============
  
  openTestDialog(rule: TriggerRule) {
    this.testingRule.set(rule);
    this.testMessage = '';
    this.testResult.set(null);
    this.showTestDialog.set(true);
  }
  
  closeTestDialog() {
    this.showTestDialog.set(false);
    this.testingRule.set(null);
    this.testMessage = '';
    this.testResult.set(null);
  }
  
  runTest() {
    const rule = this.testingRule();
    if (!rule || !this.testMessage.trim()) return;
    
    this.isTestingRule.set(true);
    
    // 獲取規則的關鍵詞集
    const keywordSets = this.stateService.keywordSets();
    const ruleKeywordSets = keywordSets.filter(ks => 
      rule.keywordSetIds.includes(ks.id) || rule.keywordSetIds.includes(String(ks.id))
    );
    
    // 模擬關鍵詞匹配
    const matchedKeywords: string[] = [];
    const messageText = this.testMessage.toLowerCase();
    
    for (const ks of ruleKeywordSets) {
      for (const kw of (ks.keywords || [])) {
        // KeywordItem 使用 text 字段存儲關鍵詞
        const keywordText = (kw as any).keyword?.toLowerCase() || kw.text?.toLowerCase() || '';
        if (!keywordText) continue;
        
        let matched = false;
        const isRegex = (kw as any).isRegex || false;
        if (isRegex) {
          try {
            const regex = new RegExp(keywordText, 'i');
            matched = regex.test(this.testMessage);
          } catch {
            matched = messageText.includes(keywordText);
          }
        } else {
          matched = messageText.includes(keywordText);
        }
        
        if (matched) {
          matchedKeywords.push((kw as any).keyword || kw.text);
        }
      }
    }
    
    // 模擬條件檢查
    const conditionsMet = this.checkConditions(rule);
    
    // 生成響應預覽
    let responsePreview = '';
    if (matchedKeywords.length > 0) {
      if (rule.responseType === 'template' && rule.responseConfig?.templateId) {
        const templates = this.stateService.chatTemplates();
        const template = templates.find(t => String(t.id) === String(rule.responseConfig.templateId));
        if (template) {
          responsePreview = this.generatePreview(template.content || '', matchedKeywords[0]);
        }
      } else if (rule.responseType === 'ai_chat') {
        responsePreview = '[AI 將根據消息內容智能生成回復]';
      } else if (rule.responseType === 'record_only') {
        responsePreview = '[僅記錄，不發送任何消息]';
      } else if (rule.responseType === 'script') {
        responsePreview = '[將執行配置的劇本腳本]';
      }
    }
    
    // 設置結果（模擬延遲）
    setTimeout(() => {
      this.testResult.set({
        matched: matchedKeywords.length > 0,
        matchedKeywords: [...new Set(matchedKeywords)],
        conditionsMet,
        responsePreview
      });
      this.isTestingRule.set(false);
    }, 500);
  }
  
  private checkConditions(rule: TriggerRule): boolean {
    const conditions = rule.conditions || {};
    
    // 時間範圍檢查
    if (conditions.timeRange) {
      const now = new Date();
      const hour = now.getHours();
      const [startHour, endHour] = [
        parseInt(conditions.timeRange.start?.split(':')[0] || '0'),
        parseInt(conditions.timeRange.end?.split(':')[0] || '24')
      ];
      if (hour < startHour || hour >= endHour) {
        return false;
      }
    }
    
    // 其他條件在實際運行時檢查
    return true;
  }
  
  private generatePreview(template: string, keyword: string): string {
    // 簡單的變量替換
    let preview = template;
    preview = preview.replace(/\{\{?username\}?\}/g, '@TestUser');
    preview = preview.replace(/\{\{?firstName\}?\}/g, 'Test');
    preview = preview.replace(/\{\{?keyword\}?\}/g, keyword);
    preview = preview.replace(/\{\{?groupName\}?\}/g, '測試群組');
    preview = preview.replace(/\{\{?[^}]+\}?\}/g, '');
    return preview.trim();
  }
}
