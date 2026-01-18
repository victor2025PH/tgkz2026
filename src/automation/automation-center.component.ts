/**
 * 自動化中心組件 - 整合頁面 (v3.0 側邊抽屜版)
 * Automation Center Component
 * 
 * 功能:
 * 1. Tab式導航（監控配置/資料庫/自動化規則/發送設置）
 * 2. 配置完整度指示
 * 3. 監控狀態控制
 * 4. ✨ 帳號配置抽屜
 * 5. ✨ 群組配置抽屜
 * 6. ✨ 關鍵詞集編輯抽屜
 * 7. 刪除確認彈窗
 */

import { Component, signal, computed, inject, OnInit, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResourceLibraryComponent } from './resource-library.component';
import { AutomationRulesComponent } from './automation-rules.component';
import { ResourceLibraryService, Resource } from './resource-library.service';
import { ConfirmDialogComponent, DialogType } from './components/confirm-dialog.component';
import { AccountConfigDrawerComponent, AccountData } from './components/account-config-drawer.component';
import { GroupConfigDrawerComponent, GroupDetailData, AvailableKeywordSetForGroup } from './components/group-config-drawer.component';
import { KeywordSetDrawerComponent, KeywordSetDetailData, KeywordItemData } from './components/keyword-set-drawer.component';
import { SetupWizardComponent } from './components/setup-wizard.component';
import { RealtimeStatsComponent, RealtimeStats } from './components/realtime-stats.component';
import { DraggableKeywordChipComponent, DroppableGroupCardComponent, DragDropHintComponent } from './components/drag-drop-binding.component';
import { RealtimeMatchesComponent, MatchedMessage } from './components/realtime-matches.component';

// Tab 類型
type AutomationTab = 'monitor' | 'resources' | 'rules' | 'settings';

// 配置檢查項
interface ConfigCheck {
  id: string;
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  action?: { label: string; handler: string };
}

// 確認對話框狀態
interface ConfirmState {
  isOpen: boolean;
  type: DialogType;
  title: string;
  message: string;
  confirmText: string;
  affectedItems: string[];
  requireConfirmText: boolean;
  onConfirm: () => void;
}

// 抽屜狀態
interface DrawerState {
  account: { isOpen: boolean; data: AccountData | null };
  group: { isOpen: boolean; data: GroupDetailData | null };
  keywordSet: { isOpen: boolean; data: KeywordSetDetailData | null; isNew: boolean };
}

@Component({
  selector: 'app-automation-center',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ResourceLibraryComponent, 
    AutomationRulesComponent,
    ConfirmDialogComponent,
    AccountConfigDrawerComponent,
    GroupConfigDrawerComponent,
    KeywordSetDrawerComponent,
    SetupWizardComponent,
    RealtimeStatsComponent,
    DraggableKeywordChipComponent,
    DroppableGroupCardComponent,
    DragDropHintComponent,
    RealtimeMatchesComponent
  ],
  template: `
    <div class="automation-center h-full flex flex-col bg-slate-900">
      <!-- 頂部標題欄 -->
      <div class="p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-2xl">🤖</span>
              自動化中心
            </h1>
            
            <!-- 監控狀態 -->
            <div class="flex items-center gap-2">
              @if (isMonitoring()) {
                <span class="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm">
                  <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  監控中
                </span>
              } @else {
                <span class="px-3 py-1 bg-slate-700 text-slate-400 rounded-full text-sm">
                  監控已停止
                </span>
              }
            </div>
          </div>
          
          <!-- 監控控制按鈕 -->
          <div class="flex items-center gap-3">
            <!-- 配置完整度 (增強版) -->
            <div class="flex items-center gap-3 px-4 py-2 bg-slate-800/80 rounded-xl border border-slate-700/50">
              <!-- 步驟指示器 -->
              <div class="flex items-center gap-1">
                <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                     [class.bg-emerald-500/20]="hasListenerAccount()"
                     [class.text-emerald-400]="hasListenerAccount()"
                     [class.bg-slate-700]="!hasListenerAccount()"
                     [class.text-slate-500]="!hasListenerAccount()"
                     title="監控帳號">
                  {{ hasListenerAccount() ? '✓' : '1' }}
                </div>
                <div class="w-4 h-0.5" 
                     [class.bg-emerald-500]="hasGroups()"
                     [class.bg-slate-600]="!hasGroups()"></div>
                <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                     [class.bg-emerald-500/20]="hasGroups()"
                     [class.text-emerald-400]="hasGroups()"
                     [class.bg-slate-700]="!hasGroups()"
                     [class.text-slate-500]="!hasGroups()"
                     title="監控群組">
                  {{ hasGroups() ? '✓' : '2' }}
                </div>
                <div class="w-4 h-0.5"
                     [class.bg-emerald-500]="hasKeywords()"
                     [class.bg-slate-600]="!hasKeywords()"></div>
                <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                     [class.bg-emerald-500/20]="hasKeywords()"
                     [class.text-emerald-400]="hasKeywords()"
                     [class.bg-slate-700]="!hasKeywords()"
                     [class.text-slate-500]="!hasKeywords()"
                     title="關鍵詞">
                  {{ hasKeywords() ? '✓' : '3' }}
                </div>
                <div class="w-4 h-0.5"
                     [class.bg-emerald-500]="hasGroupBindings()"
                     [class.bg-slate-600]="!hasGroupBindings()"></div>
                <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                     [class.bg-emerald-500/20]="hasGroupBindings()"
                     [class.text-emerald-400]="hasGroupBindings()"
                     [class.bg-slate-700]="!hasGroupBindings()"
                     [class.text-slate-500]="!hasGroupBindings()"
                     title="綁定詞集">
                  {{ hasGroupBindings() ? '✓' : '4' }}
                </div>
              </div>
              <!-- 完成度百分比 -->
              <div class="flex items-center gap-1.5 pl-2 border-l border-slate-600">
                @if (isFullyConfigured()) {
                  <span class="text-emerald-400 text-sm font-medium">✓ 就緒</span>
                } @else {
                  <span class="text-sm"
                        [class.text-yellow-400]="configCompleteness() >= 50"
                        [class.text-red-400]="configCompleteness() < 50">
                    {{ configCompleteness() }}%
                  </span>
                }
              </div>
            </div>
            
            <!-- 開始/停止監控 -->
            @if (isMonitoring()) {
              <button (click)="stopMonitoring()"
                      class="px-5 py-2.5 bg-red-500 hover:bg-red-400 text-white rounded-lg 
                             transition-all flex items-center gap-2 font-medium">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" stroke-width="2"/>
                </svg>
                停止監控
              </button>
            } @else {
              <button (click)="startMonitoring()"
                      [disabled]="configCompleteness() < 50"
                      class="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 
                             text-white rounded-lg transition-all flex items-center gap-2 font-medium
                             disabled:opacity-50 disabled:cursor-not-allowed">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                開始監控
              </button>
            }
          </div>
        </div>
        
        <!-- Tab 導航 -->
        <div class="flex gap-1 mt-4 bg-slate-800/50 p-1 rounded-xl w-fit">
          @for (tab of tabs; track tab.id) {
            <button (click)="activeTab.set(tab.id)"
                    class="px-5 py-2.5 rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
                    [class.bg-gradient-to-r]="activeTab() === tab.id"
                    [class.from-cyan-500]="activeTab() === tab.id"
                    [class.to-blue-500]="activeTab() === tab.id"
                    [class.text-white]="activeTab() === tab.id"
                    [class.shadow-lg]="activeTab() === tab.id"
                    [class.text-slate-400]="activeTab() !== tab.id"
                    [class.hover:text-white]="activeTab() !== tab.id"
                    [class.hover:bg-slate-700/50]="activeTab() !== tab.id">
              <span class="text-lg">{{ tab.icon }}</span>
              <span>{{ tab.label }}</span>
              @if (tab.badge) {
                <span class="px-1.5 py-0.5 text-xs rounded-full"
                      [class.bg-white/20]="activeTab() === tab.id"
                      [class.bg-cyan-500/20]="activeTab() !== tab.id"
                      [class.text-white]="activeTab() === tab.id"
                      [class.text-cyan-400]="activeTab() !== tab.id">
                  {{ tab.badge }}
                </span>
              }
            </button>
          }
        </div>
      </div>
      
      <!-- 配置問題提示 -->
      @if (configIssues().length > 0 && !isMonitoring()) {
        <div class="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/30">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm text-yellow-400">
              <span>⚠️</span>
              <span>{{ configIssues().length }} 項配置需要完善</span>
            </div>
            <button (click)="toggleConfigIssues()"
                    class="text-xs text-yellow-400 hover:text-yellow-300">
              {{ showConfigIssues() ? '收起' : '展開' }}
            </button>
          </div>
          
          @if (showConfigIssues()) {
            <div class="mt-2 space-y-2">
              @for (issue of configIssues(); track issue.id) {
                <div class="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                  <div class="flex items-center gap-2">
                    <span [class.text-red-400]="issue.status === 'error'"
                          [class.text-yellow-400]="issue.status === 'warning'">
                      {{ issue.status === 'error' ? '✕' : '⚠' }}
                    </span>
                    <span class="text-sm text-slate-300">{{ issue.name }}</span>
                    <span class="text-xs text-slate-500">{{ issue.message }}</span>
                  </div>
                  @if (issue.action) {
                    <button (click)="handleConfigAction(issue.action.handler)"
                            class="text-xs text-cyan-400 hover:text-cyan-300">
                      {{ issue.action.label }} →
                    </button>
                  }
                </div>
              }
            </div>
          }
        </div>
      }
      
      <!-- Tab 內容區 -->
      <div class="flex-1 overflow-hidden">
        @switch (activeTab()) {
          @case ('monitor') {
            <!-- 監控配置 -->
            <div class="h-full overflow-y-auto p-4">
              <!-- 實時數據儀表盤和匹配消息 (監控中時顯示) -->
              @if (isMonitoring()) {
                <div class="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <app-realtime-stats [stats]="realtimeStats()"></app-realtime-stats>
                  <app-realtime-matches
                    [isMonitoring]="isMonitoring()"
                    [messages]="matchedMessages()"
                    (quickReply)="onQuickReplyMatch($event)"
                    (addToLeads)="onAddMatchToLeads($event)">
                  </app-realtime-matches>
                </div>
              }
              
              <!-- 快速入門向導 (配置未完成時顯示) -->
              @if (!isFullyConfigured() && !isMonitoring()) {
                <div class="mb-6">
                  <app-setup-wizard
                    [hasListenerAccount]="hasListenerAccount()"
                    [hasSenderAccount]="hasSenderAccount()"
                    [hasGroups]="hasGroups()"
                    [hasKeywordSets]="hasKeywordSets()"
                    [hasKeywords]="hasKeywords()"
                    [hasGroupBindings]="hasGroupBindings()"
                    [listenerCount]="listenerCount()"
                    [groupCount]="monitorGroups().length"
                    [keywordSetCount]="keywordSets().length"
                    [keywordCount]="totalKeywordCount()"
                    [boundGroupCount]="boundGroupCount()"
                    (action)="handleWizardAction($event)"
                    (startMonitoring)="startMonitoringClick.emit()">
                  </app-setup-wizard>
                </div>
              }
              
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- 監控帳號 -->
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                  <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
                    <h3 class="font-semibold text-white flex items-center gap-2">
                      <span>🤖</span> 監控帳號
                      <span class="text-xs text-slate-500">({{ monitorAccounts().length }})</span>
                    </h3>
                    <button (click)="addAccountClick.emit()"
                            class="text-sm text-cyan-400 hover:text-cyan-300">
                      + 添加帳號
                    </button>
                  </div>
                  <div class="p-4 space-y-3">
                    @for (account of monitorAccounts(); track account.id) {
                      <div (click)="openAccountDrawer(account)"
                           class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg 
                                  hover:bg-slate-700 transition-colors cursor-pointer group border border-transparent
                                  hover:border-cyan-500/30">
                        <div class="flex items-center gap-3">
                          @if (account.avatar) {
                            <img [src]="account.avatar" 
                                 class="w-10 h-10 rounded-full object-cover"
                                 alt="{{ account.username }}">
                          } @else {
                            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                              {{ (account.username || account.phone || '?')[0].toUpperCase() }}
                            </div>
                          }
                          <div>
                            <div class="text-sm font-medium text-white">
                              {{ account.username || account.phone }}
                            </div>
                            <div class="text-xs text-slate-500">{{ account.phone }}</div>
                            <div class="flex items-center gap-2 text-xs">
                              @if (account.isListener) {
                                <span class="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">監聽</span>
                              }
                              @if (account.isSender) {
                                <span class="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">發送</span>
                              }
                            </div>
                          </div>
                        </div>
                        <div class="flex items-center gap-3">
                          <div class="flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full"
                                  [class.bg-emerald-500]="account.status === 'connected'"
                                  [class.bg-red-500]="account.status === 'error'"
                                  [class.bg-slate-500]="account.status === 'disconnected'">
                            </span>
                            <span class="text-xs text-slate-400">
                              {{ account.status === 'connected' ? '已連接' : account.status === 'error' ? '錯誤' : '未連接' }}
                            </span>
                          </div>
                          <svg class="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" 
                               fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                          </svg>
                        </div>
                      </div>
                    } @empty {
                      <div class="text-center py-8 text-slate-400">
                        <div class="text-4xl mb-2">👤</div>
                        <p>暫無監控帳號</p>
                        <button (click)="addAccountClick.emit()"
                                class="mt-3 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors">
                          + 添加帳號
                        </button>
                      </div>
                    }
                  </div>
                </div>
                
                <!-- 監控群組 -->
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden"
                     [class.ring-2]="isDraggingKeywordSet()"
                     [class.ring-cyan-500/50]="isDraggingKeywordSet()">
                  <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
                    <h3 class="font-semibold text-white flex items-center gap-2">
                      <span>👥</span> 監控群組
                      <span class="text-xs text-slate-500">({{ monitorGroups().length }})</span>
                      @if (isDraggingKeywordSet()) {
                        <span class="text-xs text-cyan-400 animate-pulse">← 拖到這裡綁定</span>
                      }
                    </h3>
                    <button (click)="addGroupClick.emit()"
                            class="text-sm text-cyan-400 hover:text-cyan-300">
                      + 添加群組
                    </button>
                  </div>
                  <div class="p-4 space-y-3 max-h-80 overflow-y-auto">
                    @for (group of monitorGroups(); track group.id) {
                      <!-- 使用可放置的群組卡片 -->
                      <app-droppable-group-card
                        [id]="group.id"
                        [name]="group.name"
                        [memberCount]="group.memberCount"
                        [linkedSets]="getLinkedSetNames(group)"
                        [linkedSetCount]="group.linkedKeywordSets.length"
                        (keywordSetDropped)="onKeywordSetDropped($event)"
                        (click)="openGroupDrawer(group)">
                      </app-droppable-group-card>
                    }
                    @empty {
                      <div class="text-center py-8 text-slate-500">
                        <div class="text-3xl mb-2">👥</div>
                        <p>還沒有監控群組</p>
                        <button (click)="addGroupClick.emit()" 
                                class="mt-2 text-cyan-400 hover:text-cyan-300 text-sm">
                          + 添加第一個群組
                        </button>
                      </div>
                    }
                  </div>
                </div>
                
                <!-- 關鍵詞集 -->
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden lg:col-span-2">
                  <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
                    <h3 class="font-semibold text-white flex items-center gap-2">
                      <span>🔑</span> 關鍵詞集
                      <span class="text-xs text-slate-500">({{ keywordSets().length }})</span>
                      @if (totalKeywordMatches() > 0) {
                        <span class="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                          🔥 總匹配 {{ totalKeywordMatches() }}
                        </span>
                      }
                    </h3>
                    <button (click)="openNewKeywordSetDrawer()"
                            class="text-sm text-cyan-400 hover:text-cyan-300">
                      + 新建詞集
                    </button>
                  </div>
                  
                  <!-- 可拖拽的詞集芯片區 -->
                  @if (keywordSets().length > 0) {
                    <div class="px-4 pt-3 pb-2 border-b border-slate-700/30">
                      <div class="flex items-center gap-2 mb-2">
                        <span class="text-xs text-slate-500">🎯 拖拽綁定：</span>
                        <app-drag-drop-hint [isActive]="isDraggingKeywordSet()"></app-drag-drop-hint>
                      </div>
                      <div class="flex flex-wrap gap-2">
                        @for (set of keywordSets(); track set.id) {
                          <app-draggable-keyword-chip
                            [id]="set.id"
                            [name]="set.name"
                            [keywordCount]="set.keywords.length"
                            (dragStart)="onKeywordSetDragStart($event)"
                            (dragEnd)="onKeywordSetDragEnd()">
                          </app-draggable-keyword-chip>
                        }
                      </div>
                    </div>
                  }
                  
                  <div class="p-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      @for (set of keywordSets(); track set.id) {
                        <div (click)="openKeywordSetDrawer(set)"
                             class="flex items-start gap-3 p-4 bg-slate-700/50 rounded-xl 
                                    hover:bg-slate-700 transition-colors cursor-pointer group border border-transparent
                                    hover:border-cyan-500/30">
                          <!-- 圖標 -->
                          <div class="w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0"
                               [class.bg-orange-500/20]="set.isActive"
                               [class.text-orange-400]="set.isActive"
                               [class.bg-slate-600]="!set.isActive"
                               [class.text-slate-500]="!set.isActive">
                            {{ set.name.substring(0, 3) }}
                          </div>
                          
                          <!-- 內容 -->
                          <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                              <span class="font-medium text-white truncate">{{ set.name }}</span>
                              @if (set.totalMatches && set.totalMatches > 0) {
                                <span class="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full shrink-0">
                                  🔥 {{ set.totalMatches }}
                                </span>
                              }
                            </div>
                            
                            <!-- 關鍵詞預覽 -->
                            <div class="flex flex-wrap gap-1">
                              @for (kw of set.keywords.slice(0, 3); track kw.id) {
                                <span class="px-1.5 py-0.5 bg-slate-600 text-slate-300 text-xs rounded">
                                  {{ kw.text }}
                                </span>
                              }
                              @if (set.keywords.length > 3) {
                                <span class="px-1.5 py-0.5 bg-slate-600/50 text-slate-400 text-xs rounded">
                                  +{{ set.keywords.length - 3 }}
                                </span>
                              }
                            </div>
                          </div>
                          
                          <!-- 開關 -->
                          <div class="flex items-center gap-2 shrink-0">
                            <label class="relative inline-flex cursor-pointer" (click)="$event.stopPropagation()">
                              <input type="checkbox" 
                                     [checked]="set.isActive"
                                     (change)="toggleKeywordSet(set)"
                                     class="sr-only">
                              <div class="w-9 h-5 rounded-full transition-all"
                                   [class.bg-emerald-500]="set.isActive"
                                   [class.bg-slate-600]="!set.isActive">
                                <div class="absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all"
                                     [class.left-4]="set.isActive"
                                     [class.left-0.5]="!set.isActive">
                                </div>
                              </div>
                            </label>
                            <svg class="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" 
                                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                            </svg>
                          </div>
                        </div>
                      }
                      
                      <!-- 添加按鈕 -->
                      <button (click)="openNewKeywordSetDrawer()"
                              class="flex items-center justify-center gap-2 p-6 bg-slate-700/30 hover:bg-slate-700/50 
                                     border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white 
                                     transition-all min-h-[100px]">
                        <span class="text-2xl">+</span>
                        <span>新建詞集</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
          
          @case ('resources') {
            <app-resource-library 
              class="block h-full"
              (sendMessageEvent)="onSendMessage($event)">
            </app-resource-library>
          }
          
          @case ('rules') {
            <app-automation-rules class="block h-full"></app-automation-rules>
          }
          
          @case ('settings') {
            <div class="h-full overflow-y-auto p-4">
              <div class="max-w-2xl mx-auto space-y-6">
                <!-- 發送帳號 -->
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                  <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
                    <span>📤</span> 發送帳號
                  </h3>
                  <div class="space-y-3">
                    @for (account of senderAccounts(); track account.id) {
                      <div (click)="openAccountDrawer(account)"
                           class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg 
                                  hover:bg-slate-700 cursor-pointer transition-colors">
                        <div class="flex items-center gap-3">
                          <span>👤</span>
                          <span class="text-white">{{ account.username || account.phone }}</span>
                        </div>
                        <div class="flex items-center gap-4">
                          <div class="text-sm">
                            <span class="text-slate-400">今日:</span>
                            <span class="text-cyan-400 ml-1">{{ account.stats?.sentToday || 0 }}/{{ account.dailySendLimit || 50 }}</span>
                          </div>
                          <div class="text-sm">
                            <span class="text-slate-400">健康度:</span>
                            <span class="text-emerald-400 ml-1">{{ account.healthScore || 85 }}</span>
                          </div>
                          <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                          </svg>
                        </div>
                      </div>
                    } @empty {
                      <div class="text-center py-6 text-slate-400">
                        <p>暫無發送帳號</p>
                        <p class="text-xs mt-1">請在帳號設置中將帳號設為發送角色</p>
                      </div>
                    }
                  </div>
                </div>
                
                <!-- 發送策略 -->
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                  <h3 class="font-semibold text-white mb-4 flex items-center gap-2">
                    <span>⚙️</span> 發送策略
                  </h3>
                  <div class="space-y-4">
                    <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                      <div>
                        <div class="text-white">啟用 Spintax</div>
                        <div class="text-xs text-slate-400">使用 Spintax 實現消息多樣化</div>
                      </div>
                      <input type="checkbox" [(ngModel)]="sendSettings.enableSpintax"
                             class="w-5 h-5 rounded text-cyan-500 bg-slate-700 border-slate-600">
                    </label>
                    
                    <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                      <div>
                        <div class="text-white">啟用智能發送</div>
                        <div class="text-xs text-slate-400">僅在用戶在線時發送</div>
                      </div>
                      <input type="checkbox" [(ngModel)]="sendSettings.smartSend"
                             class="w-5 h-5 rounded text-cyan-500 bg-slate-700 border-slate-600">
                    </label>
                    
                    <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                      <div>
                        <div class="text-white">啟用自動回覆</div>
                        <div class="text-xs text-slate-400">用戶回覆時自動回覆</div>
                      </div>
                      <input type="checkbox" [(ngModel)]="sendSettings.autoReply"
                             class="w-5 h-5 rounded text-cyan-500 bg-slate-700 border-slate-600">
                    </label>
                  </div>
                </div>
                
                <!-- 消息模板 -->
                <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="font-semibold text-white flex items-center gap-2">
                      <span>📝</span> 消息模板
                    </h3>
                    <button class="text-sm text-cyan-400 hover:text-cyan-300">
                      + 新建模板
                    </button>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <button class="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm">
                      默認歡迎
                    </button>
                    <button class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600">
                      產品介紹
                    </button>
                    <button class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600">
                      跟進提醒
                    </button>
                    <button class="px-4 py-2 bg-slate-700/50 text-slate-400 rounded-lg text-sm border-2 border-dashed border-slate-600 hover:bg-slate-700">
                      + 新模板
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        }
      </div>
      
      <!-- 帳號配置抽屜 -->
      <app-account-config-drawer
        [isOpen]="drawerState().account.isOpen"
        [account]="drawerState().account.data"
        (close)="closeAccountDrawer()"
        (save)="saveAccount($event)"
        (remove)="confirmRemoveAccount($event)"
        (reconnect)="reconnectAccount($event)">
      </app-account-config-drawer>
      
      <!-- 群組配置抽屜 -->
      <app-group-config-drawer
        [isOpen]="drawerState().group.isOpen"
        [group]="drawerState().group.data"
        [availableKeywordSets]="availableKeywordSetsForGroup()"
        (close)="closeGroupDrawer()"
        (save)="saveGroup($event)"
        (remove)="confirmRemoveGroup($event)"
        (extractMembers)="extractGroupMembers($event)"
        (viewMessages)="viewGroupMessages($event)"
        (createKeywordSet)="openNewKeywordSetDrawer()">
      </app-group-config-drawer>
      
      <!-- 關鍵詞集編輯抽屜 -->
      <app-keyword-set-drawer
        [isOpen]="drawerState().keywordSet.isOpen"
        [keywordSet]="drawerState().keywordSet.data"
        [isNew]="drawerState().keywordSet.isNew"
        (close)="closeKeywordSetDrawer()"
        (save)="saveKeywordSet($event)"
        (delete)="confirmDeleteKeywordSet($event)">
      </app-keyword-set-drawer>
      
      <!-- 確認對話框 -->
      <app-confirm-dialog
        [isOpen]="confirmState().isOpen"
        [type]="confirmState().type"
        [title]="confirmState().title"
        [message]="confirmState().message"
        [confirmText]="confirmState().confirmText"
        [affectedItems]="confirmState().affectedItems"
        [requireConfirmText]="confirmState().requireConfirmText"
        (confirm)="onConfirmDialogConfirm()"
        (cancel)="closeConfirmDialog()">
      </app-confirm-dialog>
    </div>
  `
})
export class AutomationCenterComponent implements OnInit {
  private resourceService = inject(ResourceLibraryService);
  
  // 輸入
  isMonitoring = input(false);
  // 真實數據輸入（從 app.component 傳入）
  realKeywordSets = input<any[]>([]);  // 後端返回的詞集數據
  realMonitoredGroups = input<any[]>([]);  // 後端返回的群組數據
  realAccounts = input<any[]>([]);  // 後端返回的帳號數據
  
  // 輸出
  startMonitoringClick = output<void>();
  stopMonitoringClick = output<void>();
  addAccountClick = output<void>();
  addGroupClick = output<void>();
  addKeywordSetClick = output<void>();
  sendMessageEvent = output<Resource>();
  // 群組配置保存事件
  saveGroupConfig = output<{ groupId: number; keywordSetIds: number[] }>();
  // 關鍵詞集保存事件
  saveKeywordSetConfig = output<{ setId: number; keywords: string[] }>();
  
  // 狀態
  activeTab = signal<AutomationTab>('monitor');
  showConfigIssues = signal(false);
  
  // 抽屜狀態
  drawerState = signal<DrawerState>({
    account: { isOpen: false, data: null },
    group: { isOpen: false, data: null },
    keywordSet: { isOpen: false, data: null, isNew: false }
  });
  
  // 確認對話框狀態
  confirmState = signal<ConfirmState>({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: '確認',
    affectedItems: [],
    requireConfirmText: false,
    onConfirm: () => {}
  });
  
  // Tab 配置
  tabs = [
    { id: 'monitor' as const, icon: '📡', label: '監控配置', badge: null as string | null },
    { id: 'resources' as const, icon: '📦', label: '資料庫', badge: null as string | null },
    { id: 'rules' as const, icon: '⚡', label: '自動化規則', badge: '3' },
    { id: 'settings' as const, icon: '⚙️', label: '發送設置', badge: null as string | null }
  ];
  
  // 帳號數據 - 會被真實數據覆蓋
  monitorAccounts = signal<AccountData[]>([]);
  
  // 同步真實帳號數據到本地 signal
  private syncRealAccounts = effect(() => {
    const realAccs = this.realAccounts();
    if (realAccs && realAccs.length > 0) {
      const convertedAccounts: AccountData[] = realAccs.map((acc: any) => ({
        id: acc.id || acc.phone,
        phone: acc.phone || '',
        username: acc.nickname || acc.username || acc.firstName || acc.phone || '未知',
        avatar: acc.avatar || acc.photo || '',
        status: (acc.status === 'Online' ? 'connected' : 'disconnected') as 'connected' | 'disconnected' | 'error',
        isListener: acc.role === 'Listener',
        isSender: acc.role === 'Sender',
        healthScore: acc.healthScore || 100,
        dailySendLimit: acc.dailySendLimit || 50,
        dailySendCount: acc.dailySendCount || 0,
        stats: { sentToday: 0, sentWeek: 0, repliesWeek: 0, conversionsWeek: 0 }
      }));
      this.monitorAccounts.set(convertedAccounts);
    }
  });
  
  // 模擬數據 - 監控群組
  // 本地群組數據 - 會被真實數據覆蓋
  monitorGroups = signal<GroupDetailData[]>([]);
  
  // 同步真實群組數據到本地 signal
  private syncRealMonitoredGroups = effect(() => {
    const realGroups = this.realMonitoredGroups();
    if (realGroups && realGroups.length > 0) {
      const convertedGroups = realGroups.map((group: any) => ({
        id: String(group.id),
        name: group.name || group.url || '未知群組',
        memberCount: group.memberCount || 0,
        isMonitoring: true,
        linkedKeywordSets: (group.keywordSetIds || []).map((id: number) => String(id)),
        activityLevel: 'medium' as const,
        dailyMessages: 0,
        stats: { matchesToday: 0, matchesWeek: 0, leadsToday: 0, leadsWeek: 0, conversions: 0 }
      }));
      this.monitorGroups.set(convertedGroups);
    }
  });
  
  // 模擬數據 - 關鍵詞集
  // 本地詞集數據 - 會被真實數據覆蓋
  keywordSets = signal<KeywordSetDetailData[]>([]);
  
  // 同步真實數據到本地 signal
  private syncRealKeywordSets = effect(() => {
    const realSets = this.realKeywordSets();
    if (realSets && realSets.length > 0) {
      const convertedSets = realSets.map((set: any) => ({
        id: String(set.id),
        name: set.name,
        keywords: (set.keywords || []).map((k: any) => ({
          id: String(k.id),
          text: k.text || k.keyword || '',
          matchCount: k.matchCount || 0,
          isNew: false
        })),
        matchMode: 'fuzzy' as const,
        isActive: true,
        totalMatches: (set.keywords || []).reduce((sum: number, k: any) => sum + (k.matchCount || 0), 0),
        stats: { matchesToday: 0, matchesWeek: 0, leadsGenerated: 0 },
        linkedGroups: []
      }));
      this.keywordSets.set(convertedSets);
    }
  });
  
  // 計算屬性
  senderAccounts = computed(() => 
    this.monitorAccounts().filter(a => a.isSender)
  );
  
  // === 向導相關計算屬性 ===
  hasListenerAccount = computed(() => 
    this.monitorAccounts().some(a => a.isListener && a.status === 'connected')
  );
  
  hasSenderAccount = computed(() => 
    this.monitorAccounts().some(a => a.isSender && a.status === 'connected')
  );
  
  hasGroups = computed(() => this.monitorGroups().length > 0);
  
  hasKeywordSets = computed(() => this.keywordSets().length > 0);
  
  hasKeywords = computed(() => 
    this.keywordSets().some(s => s.keywords.length > 0)
  );
  
  hasGroupBindings = computed(() => 
    this.monitorGroups().some(g => g.linkedKeywordSets.length > 0)
  );
  
  listenerCount = computed(() => 
    this.monitorAccounts().filter(a => a.isListener).length
  );
  
  totalKeywordCount = computed(() => 
    this.keywordSets().reduce((sum, s) => sum + s.keywords.length, 0)
  );
  
  boundGroupCount = computed(() => 
    this.monitorGroups().filter(g => g.linkedKeywordSets.length > 0).length
  );
  
  isFullyConfigured = computed(() => 
    this.hasListenerAccount() && 
    this.hasGroups() && 
    this.hasKeywords() && 
    this.hasGroupBindings()
  );
  
  // 實時統計數據 (模擬數據，後續可從後端獲取)
  realtimeStats = computed<RealtimeStats>(() => ({
    matchesToday: this.keywordSets().reduce((sum, s) => sum + (s.stats?.matchesToday || 0), 0),
    matchesYesterday: Math.floor(this.keywordSets().reduce((sum, s) => sum + (s.stats?.matchesToday || 0), 0) * 0.8),
    leadsToday: this.monitorGroups().reduce((sum, g) => sum + (g.stats?.leadsToday || 0), 0),
    leadsYesterday: Math.floor(this.monitorGroups().reduce((sum, g) => sum + (g.stats?.leadsToday || 0), 0) * 0.9),
    repliestoday: Math.floor(this.monitorGroups().reduce((sum, g) => sum + (g.stats?.leadsToday || 0), 0) * 0.3),
    repliesYesterday: 0,
    conversionsToday: this.monitorGroups().reduce((sum, g) => sum + (g.stats?.conversions || 0), 0),
    conversionsYesterday: 0
  }));
  
  availableKeywordSetsForGroup = computed<AvailableKeywordSetForGroup[]>(() => 
    this.keywordSets().map(s => ({
      id: s.id,
      name: s.name,
      keywordCount: s.keywords.length,
      totalMatches: s.totalMatches || 0,
      isActive: s.isActive
    }))
  );
  
  totalKeywordMatches = computed(() => 
    this.keywordSets().reduce((sum, s) => sum + (s.totalMatches || 0), 0)
  );
  
  // 發送設置
  sendSettings = {
    enableSpintax: true,
    smartSend: true,
    autoReply: false,
    autoReplyMessage: "Thanks for getting back to me!"
  };
  
  // 配置完整度計算
  configCompleteness = computed(() => {
    let score = 0;
    const total = 5;
    
    if (this.monitorAccounts().some(a => a.isListener && a.status === 'connected')) score++;
    if (this.monitorAccounts().some(a => a.isSender && a.status === 'connected')) score++;
    if (this.monitorGroups().some(g => g.isMonitoring)) score++;
    if (this.keywordSets().some(k => k.isActive && k.keywords.length > 0)) score++;
    if (this.monitorGroups().some(g => g.isMonitoring && g.linkedKeywordSets.length > 0)) score++;
    
    return Math.round((score / total) * 100);
  });
  
  // 配置問題列表
  configIssues = computed<ConfigCheck[]>(() => {
    const issues: ConfigCheck[] = [];
    
    if (!this.monitorAccounts().some(a => a.isListener)) {
      issues.push({
        id: 'no-listener', name: '沒有監聽帳號', status: 'error',
        message: '需要至少一個監聽帳號',
        action: { label: '添加帳號', handler: 'add-account' }
      });
    }
    
    if (!this.keywordSets().some(k => k.isActive && k.keywords.length > 0)) {
      issues.push({
        id: 'no-keywords', name: '關鍵詞集沒有任何關鍵詞', status: 'error',
        message: '在關鍵詞集中添加要監控的關鍵詞',
        action: { label: '點擊前往', handler: 'add-keywords' }
      });
    }
    
    const unlinkedGroups = this.monitorGroups().filter(g => g.isMonitoring && g.linkedKeywordSets.length === 0);
    if (unlinkedGroups.length > 0) {
      issues.push({
        id: 'unlinked-groups', name: `${unlinkedGroups.length} 個群組未綁定關鍵詞集`, status: 'warning',
        message: '在「監控群組」中為群組勾選關鍵詞集',
        action: { label: '點擊前往', handler: 'link-keywords' }
      });
    }
    
    if (!this.monitorAccounts().some(a => a.isSender)) {
      issues.push({
        id: 'no-sender', name: '沒有發送帳號', status: 'warning',
        message: '需要發送帳號才能自動回覆',
        action: { label: '設置發送帳號', handler: 'set-sender' }
      });
    }
    
    return issues;
  });
  
  ngOnInit() {
    this.updateResourceBadge();
  }
  
  // === 基礎操作 ===
  
  toggleConfigIssues() {
    this.showConfigIssues.update(v => !v);
  }
  
  updateResourceBadge() {
    const count = this.resourceService.stats().total;
    if (count > 0) {
      this.tabs = this.tabs.map(t => 
        t.id === 'resources' ? { ...t, badge: count.toString() } : t
      );
    }
  }
  
  startMonitoring() {
    this.startMonitoringClick.emit();
  }
  
  stopMonitoring() {
    this.stopMonitoringClick.emit();
  }
  
  handleConfigAction(handler: string) {
    switch (handler) {
      case 'add-account': this.addAccountClick.emit(); break;
      case 'add-keywords': this.openNewKeywordSetDrawer(); break;
      case 'link-keywords': this.activeTab.set('monitor'); break;
      case 'set-sender': this.activeTab.set('settings'); break;
    }
  }
  
  handleWizardAction(handler: string) {
    switch (handler) {
      case 'add-account': 
        this.addAccountClick.emit(); 
        break;
      case 'add-group': 
        this.addGroupClick.emit(); 
        break;
      case 'add-keyword-set': 
        this.openNewKeywordSetDrawer(); 
        break;
      case 'bind-keywords':
        // 打開第一個未綁定的群組
        const unboundGroup = this.monitorGroups().find(g => g.linkedKeywordSets.length === 0);
        if (unboundGroup) {
          this.openGroupDrawer(unboundGroup);
        }
        break;
    }
  }
  
  // === 實時匹配消息 ===
  matchedMessages = signal<MatchedMessage[]>([]);
  
  // 模擬接收匹配消息 (實際應該從 IPC 接收)
  addMatchedMessage(msg: MatchedMessage) {
    const current = this.matchedMessages();
    this.matchedMessages.set([{ ...msg, isNew: true }, ...current.slice(0, 49)]);
    // 3秒後移除 isNew 標記
    setTimeout(() => {
      const updated = this.matchedMessages().map(m => 
        m.id === msg.id ? { ...m, isNew: false } : m
      );
      this.matchedMessages.set(updated);
    }, 3000);
  }
  
  onQuickReplyMatch(msg: MatchedMessage) {
    // 觸發快速回覆
    window.dispatchEvent(new CustomEvent('open-quick-reply', {
      detail: { userId: msg.senderId, userName: msg.senderName, message: msg.text }
    }));
  }
  
  onAddMatchToLeads(msg: MatchedMessage) {
    // 添加到線索
    window.dispatchEvent(new CustomEvent('add-lead', {
      detail: { 
        userId: msg.senderId, 
        userName: msg.senderName, 
        source: msg.groupName,
        matchedKeyword: msg.matchedKeyword
      }
    }));
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message: `已將 ${msg.senderName} 添加到線索庫`, type: 'success' }
    }));
  }
  
  // === 拖拽綁定功能 ===
  isDraggingKeywordSet = signal(false);
  draggingSetName = signal('');
  
  onKeywordSetDragStart(event: { id: string; name: string }) {
    this.isDraggingKeywordSet.set(true);
    this.draggingSetName.set(event.name);
  }
  
  onKeywordSetDragEnd() {
    this.isDraggingKeywordSet.set(false);
    this.draggingSetName.set('');
  }
  
  onKeywordSetDropped(event: { groupId: string; keywordSetId: string; keywordSetName: string }) {
    // 找到群組並添加詞集綁定
    const group = this.monitorGroups().find(g => g.id === event.groupId);
    if (group) {
      const currentLinkedSets = [...group.linkedKeywordSets];
      if (!currentLinkedSets.includes(event.keywordSetId)) {
        currentLinkedSets.push(event.keywordSetId);
        
        // 更新本地狀態
        const updatedGroups = this.monitorGroups().map(g => 
          g.id === event.groupId 
            ? { ...g, linkedKeywordSets: currentLinkedSets }
            : g
        );
        this.monitorGroups.set(updatedGroups);
        
        // 發送到後端保存
        this.saveGroupConfig.emit({
          groupId: parseInt(event.groupId),
          keywordSetIds: currentLinkedSets.map(id => parseInt(id))
        });
        
        // 顯示成功提示 (通過 DOM 事件)
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { message: `已將「${event.keywordSetName}」綁定到「${group.name}」`, type: 'success' }
        }));
      } else {
        // 已經綁定
        window.dispatchEvent(new CustomEvent('show-toast', {
          detail: { message: `「${event.keywordSetName}」已經綁定到該群組`, type: 'warning' }
        }));
      }
    }
  }
  
  // 獲取群組已綁定的詞集名稱
  getLinkedSetNames(group: any): string[] {
    return group.linkedKeywordSets
      .map((id: string) => this.keywordSets().find(s => s.id === id)?.name)
      .filter((name: string | undefined): name is string => !!name);
  }
  
  onSendMessage(resource: Resource) {
    this.sendMessageEvent.emit(resource);
  }
  
  // === 帳號抽屜操作 ===
  
  openAccountDrawer(account: AccountData) {
    this.drawerState.update(s => ({
      ...s,
      account: { isOpen: true, data: account }
    }));
  }
  
  closeAccountDrawer() {
    this.drawerState.update(s => ({
      ...s,
      account: { isOpen: false, data: null }
    }));
  }
  
  saveAccount(account: AccountData) {
    this.monitorAccounts.update(accounts =>
      accounts.map(a => a.id === account.id ? account : a)
    );
    this.closeAccountDrawer();
  }
  
  confirmRemoveAccount(account: AccountData) {
    this.confirmState.set({
      isOpen: true,
      type: 'danger',
      title: '移除帳號',
      message: `確定要移除帳號「${account.username || account.phone}」嗎？`,
      confirmText: '移除',
      affectedItems: [],
      requireConfirmText: false,
      onConfirm: () => {
        this.monitorAccounts.update(accounts => accounts.filter(a => a.id !== account.id));
        this.closeAccountDrawer();
        this.closeConfirmDialog();
      }
    });
  }
  
  reconnectAccount(account: AccountData) {
    // TODO: 實現重新連接邏輯
    console.log('Reconnect account:', account.id);
  }
  
  // === 群組抽屜操作 ===
  
  openGroupDrawer(group: GroupDetailData) {
    this.drawerState.update(s => ({
      ...s,
      group: { isOpen: true, data: group }
    }));
  }
  
  closeGroupDrawer() {
    this.drawerState.update(s => ({
      ...s,
      group: { isOpen: false, data: null }
    }));
  }
  
  saveGroup(data: { group: GroupDetailData; linkedKeywordSets: string[]; settings: any }) {
    // 更新本地狀態
    this.monitorGroups.update(groups =>
      groups.map(g => g.id === data.group.id ? {
        ...g,
        linkedKeywordSets: data.linkedKeywordSets,
        isMonitoring: data.settings.isMonitoring
      } : g)
    );
    
    // 發送事件到父組件以同步到後端
    // 將字符串 ID 轉換為數字
    const keywordSetIds = data.linkedKeywordSets.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    this.saveGroupConfig.emit({
      groupId: parseInt(data.group.id, 10),
      keywordSetIds: keywordSetIds
    });
    
    this.closeGroupDrawer();
  }
  
  toggleGroupMonitoring(group: GroupDetailData) {
    this.monitorGroups.update(groups =>
      groups.map(g => g.id === group.id ? { ...g, isMonitoring: !g.isMonitoring } : g)
    );
  }
  
  confirmRemoveGroup(group: GroupDetailData) {
    this.confirmState.set({
      isOpen: true,
      type: 'warning',
      title: '移除監控群組',
      message: `確定要將「${group.name}」從監控列表移除嗎？`,
      confirmText: '移除',
      affectedItems: group.linkedKeywordSets.length > 0 
        ? [`已綁定 ${group.linkedKeywordSets.length} 個關鍵詞集`] : [],
      requireConfirmText: false,
      onConfirm: () => {
        this.monitorGroups.update(groups => groups.filter(g => g.id !== group.id));
        this.closeGroupDrawer();
        this.closeConfirmDialog();
      }
    });
  }
  
  extractGroupMembers(group: GroupDetailData) {
    // TODO: 實現成員提取邏輯
    console.log('Extract members from:', group.name);
  }
  
  viewGroupMessages(group: GroupDetailData) {
    // TODO: 實現查看消息邏輯
    console.log('View messages from:', group.name);
  }
  
  // === 關鍵詞集抽屜操作 ===
  
  openKeywordSetDrawer(set: KeywordSetDetailData) {
    this.drawerState.update(s => ({
      ...s,
      keywordSet: { isOpen: true, data: set, isNew: false }
    }));
  }
  
  openNewKeywordSetDrawer() {
    // 使用父組件的對話框來創建詞集（已連接後端）
    this.addKeywordSetClick.emit();
  }
  
  closeKeywordSetDrawer() {
    this.drawerState.update(s => ({
      ...s,
      keywordSet: { isOpen: false, data: null, isNew: false }
    }));
  }
  
  saveKeywordSet(set: KeywordSetDetailData) {
    const isNew = this.drawerState().keywordSet.isNew;
    
    if (isNew) {
      this.keywordSets.update(sets => [...sets, set]);
    } else {
      this.keywordSets.update(sets =>
        sets.map(s => s.id === set.id ? set : s)
      );
    }
    
    // 發送事件到父組件以同步到後端
    const setId = parseInt(set.id, 10);
    if (!isNaN(setId) && setId > 0) {
      const keywords = set.keywords.map(k => k.text);
      this.saveKeywordSetConfig.emit({ setId, keywords });
    }
    
    this.closeKeywordSetDrawer();
  }
  
  toggleKeywordSet(set: KeywordSetDetailData) {
    this.keywordSets.update(sets =>
      sets.map(s => s.id === set.id ? { ...s, isActive: !s.isActive } : s)
    );
  }
  
  confirmDeleteKeywordSet(set: KeywordSetDetailData) {
    const linkedGroups = this.monitorGroups().filter(g => 
      g.linkedKeywordSets.includes(set.id)
    );
    
    this.confirmState.set({
      isOpen: true,
      type: 'danger',
      title: '刪除關鍵詞集',
      message: `確定要刪除「${set.name}」嗎？此操作無法撤銷。`,
      confirmText: '刪除',
      affectedItems: linkedGroups.length > 0 
        ? [`將解除 ${linkedGroups.length} 個群組的綁定`, ...linkedGroups.map(g => g.name)]
        : [],
      requireConfirmText: linkedGroups.length > 0,
      onConfirm: () => {
        // 先解除群組綁定
        this.monitorGroups.update(groups =>
          groups.map(g => ({
            ...g,
            linkedKeywordSets: g.linkedKeywordSets.filter(sid => sid !== set.id)
          }))
        );
        // 刪除詞集
        this.keywordSets.update(sets => sets.filter(s => s.id !== set.id));
        this.closeKeywordSetDrawer();
        this.closeConfirmDialog();
      }
    });
  }
  
  // === 確認對話框 ===
  
  onConfirmDialogConfirm() {
    const state = this.confirmState();
    if (state.onConfirm) {
      state.onConfirm();
    }
  }
  
  closeConfirmDialog() {
    this.confirmState.update(s => ({ ...s, isOpen: false }));
  }
}
