/**
 * 成員提取配置對話框組件
 * Member Extraction Dialog Component
 * 
 * 功能：
 * - 提取數量選擇
 * - 在線狀態篩選
 * - 成員屬性篩選（機器人、華人、用戶名等）
 * - 快速模板選擇
 * - 進度顯示與結果摘要
 */

import { Component, signal, input, output, inject, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

// 提取配置接口
export interface MemberExtractionConfig {
  // 基本配置
  limit: number;              // 提取數量上限
  
  // 篩選條件
  filters: {
    onlineStatus: 'all' | 'online' | 'recently' | 'offline';
    hasChinese: boolean | null;
    hasUsername: boolean | null;
    isPremium: boolean | null;
    excludeBots: boolean;
    excludeAdmins: boolean;
    minActivityDays: number | null;
  };
  
  // 高級選項
  advanced: {
    shuffleOrder: boolean;
    skipDuplicates: boolean;
    autoSaveToResources: boolean;
    extractAvatar: boolean;
  };
  
  // 提取帳號
  accountPhone?: string;
}

// 群組信息接口
export interface ExtractionGroupInfo {
  id: string;
  name: string;
  url?: string;
  telegramId?: string;  // 🔧 添加 Telegram 數字 ID
  memberCount: number;
  accountPhone?: string;
  resourceType?: 'group' | 'channel' | 'supergroup';  // 🆕 資源類型
}

// 提取結果接口
export interface ExtractionResult {
  success: boolean;
  count: number;
  online: number;
  recently: number;
  premium: number;
  hasUsername: number;
  chinese: number;
}

// 快速模板類型
type QuickTemplate = 'quick' | 'deep' | 'precise';

@Component({
  selector: 'app-member-extraction-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
           (click)="onBackdropClick($event)">
        <div class="bg-slate-900 rounded-2xl w-full max-w-xl shadow-2xl border border-slate-700/50 overflow-hidden max-h-[90vh] flex flex-col"
             (click)="$event.stopPropagation()">
          
          <!-- 頭部 -->
          <div class="p-5 border-b border-slate-700/50 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-xl">
                  👥
                </div>
                <div>
                  <h2 class="text-lg font-bold text-white">提取群組成員</h2>
                  <p class="text-sm text-slate-400">配置提取選項和篩選條件</p>
                </div>
              </div>
              <button (click)="close()" 
                      class="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- 內容區域 -->
          <div class="flex-1 overflow-y-auto p-5 space-y-5">
            
            <!-- 群組信息 -->
            @if (group()) {
              <div class="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center text-2xl">
                    {{ group()!.name[0] }}
                  </div>
                  <div class="flex-1">
                    <h3 class="font-medium text-white">{{ group()!.name }}</h3>
                    <p class="text-sm text-slate-400">{{ group()!.url || '私密群組' }}</p>
                  </div>
                  <div class="text-right">
                    @if (group()!.memberCount > 0) {
                      <p class="text-lg font-bold text-emerald-400">{{ group()!.memberCount | number }}</p>
                      <p class="text-xs text-slate-500">成員數</p>
                    } @else {
                      <p class="text-lg font-bold text-amber-400">?</p>
                      <p class="text-xs text-amber-400">無數據</p>
                    }
                  </div>
                </div>
              </div>
              
              <!-- 🆕 成員數為 0 時的錯誤提示 -->
              @if (group()!.memberCount === 0) {
                <div class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <div class="flex items-start gap-3">
                    <span class="text-xl">⚠️</span>
                    <div class="flex-1">
                      <p class="font-medium text-amber-400 mb-1">無法獲取成員數據</p>
                      <p class="text-sm text-slate-400 mb-3">可能原因：</p>
                      <ul class="text-sm text-slate-400 space-y-1 list-disc list-inside mb-3">
                        <li>尚未加入該群組</li>
                        <li>群組已變為私有</li>
                        <li>頻道類型不支持提取成員</li>
                        <li>帳號被踢出群組</li>
                      </ul>
                      <div class="flex gap-2">
                        <button (click)="refreshMemberCount()"
                                [disabled]="isRefreshingCount()"
                                class="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm transition-colors flex items-center gap-1">
                          @if (isRefreshingCount()) {
                            <span class="animate-spin">⏳</span>
                            <span>獲取中...</span>
                          } @else {
                            <span>🔄</span>
                            <span>重新獲取成員數</span>
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              }
              
              <!-- 🆕 頻道類型警告 -->
              @if (isChannel()) {
                <div class="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <div class="flex items-start gap-3">
                    <span class="text-xl">🚫</span>
                    <div class="flex-1">
                      <p class="font-medium text-red-400 mb-1">頻道不支持成員提取</p>
                      <p class="text-sm text-slate-400">
                        Telegram 頻道（Channel）沒有成員列表，只有訂閱者。
                        如需獲取訂閱者信息，請使用頻道分析功能。
                      </p>
                    </div>
                  </div>
                </div>
              }
              
              <!-- 🆕 權限錯誤提示（API 返回的錯誤） -->
              @if (extractionError()) {
                <div class="p-4 rounded-xl"
                     [class.bg-red-500/10]="extractionError()!.code === 'ADMIN_REQUIRED'"
                     [class.border-red-500/30]="extractionError()!.code === 'ADMIN_REQUIRED'"
                     [class.bg-amber-500/10]="extractionError()!.code !== 'ADMIN_REQUIRED'"
                     [class.border-amber-500/30]="extractionError()!.code !== 'ADMIN_REQUIRED'"
                     class="border">
                  <div class="flex items-start gap-3">
                    <span class="text-xl">{{ extractionError()!.code === 'ADMIN_REQUIRED' ? '🔒' : '⚠️' }}</span>
                    <div class="flex-1">
                      <p class="font-medium mb-1"
                         [class.text-red-400]="extractionError()!.code === 'ADMIN_REQUIRED'"
                         [class.text-amber-400]="extractionError()!.code !== 'ADMIN_REQUIRED'">
                        {{ extractionError()!.title }}
                      </p>
                      <p class="text-sm text-slate-400 mb-2">{{ extractionError()!.reason }}</p>
                      
                      <!-- 🔧 修改：提供實際可行的替代方案 -->
                      @if (extractionError()!.code === 'ADMIN_REQUIRED') {
                        <div class="p-3 bg-slate-800/50 rounded-lg mb-3">
                          <p class="text-sm text-slate-300 mb-2">📋 替代方案：</p>
                          <ul class="text-sm text-slate-400 space-y-1.5">
                            <li class="flex items-start gap-2">
                              <span class="text-emerald-400">1.</span>
                              <span>確保群組監控已開啟，系統會自動記錄發言用戶</span>
                            </li>
                            <li class="flex items-start gap-2">
                              <span class="text-emerald-400">2.</span>
                              <span>在「已收集用戶」標籤頁查看監控期間收集的用戶</span>
                            </li>
                            <li class="flex items-start gap-2">
                              <span class="text-emerald-400">3.</span>
                              <span>或聯繫群主獲取管理員權限</span>
                            </li>
                          </ul>
                        </div>
                        <div class="flex flex-wrap gap-2">
                          <button (click)="checkMonitoringStatus()"
                                  class="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm transition-colors flex items-center gap-2">
                            <span>📡</span>
                            <span>確認監控狀態</span>
                          </button>
                          <button (click)="collectFromHistory()"
                                  class="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-sm transition-colors flex items-center gap-2">
                            <span>🔄</span>
                            <span>從歷史收集</span>
                          </button>
                          <button (click)="viewCollectedUsers()"
                                  class="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-sm transition-colors flex items-center gap-2">
                            <span>👥</span>
                            <span>查看已收集 ({{ collectedUsersCount() }})</span>
                          </button>
                        </div>
                      } @else {
                        <div class="p-3 bg-slate-800/50 rounded-lg">
                          <p class="text-sm text-cyan-400 flex items-center gap-2">
                            <span>💡</span>
                            <span>{{ extractionError()!.suggestion }}</span>
                          </p>
                        </div>
                      }
                      
                      @if (extractionError()!.canAutoJoin) {
                        <button (click)="joinGroup()"
                                class="mt-3 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm transition-colors flex items-center gap-2">
                          <span>➕</span>
                          <span>加入群組</span>
                        </button>
                      }
                    </div>
                  </div>
                </div>
              }
            }
            
            <!-- 快速模板 -->
            @if (!isChannel()) {
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-3">
                ⚡ 快速模板
              </label>
              <div class="grid grid-cols-3 gap-3">
                <button (click)="selectTemplate('quick')"
                        class="p-4 rounded-xl border transition-all text-center group"
                        [class.border-emerald-500]="selectedTemplate() === 'quick'"
                        [class.bg-emerald-500/20]="selectedTemplate() === 'quick'"
                        [class.border-slate-700]="selectedTemplate() !== 'quick'"
                        [class.bg-slate-800/50]="selectedTemplate() !== 'quick'">
                  <div class="text-2xl mb-1">⚡</div>
                  <p class="font-medium text-white text-sm">快速提取</p>
                  <p class="text-xs text-slate-400 mt-1">100人 · 僅在線</p>
                </button>
                <button (click)="selectTemplate('deep')"
                        class="p-4 rounded-xl border transition-all text-center group"
                        [class.border-blue-500]="selectedTemplate() === 'deep'"
                        [class.bg-blue-500/20]="selectedTemplate() === 'deep'"
                        [class.border-slate-700]="selectedTemplate() !== 'deep'"
                        [class.bg-slate-800/50]="selectedTemplate() !== 'deep'">
                  <div class="text-2xl mb-1">🔍</div>
                  <p class="font-medium text-white text-sm">深度提取</p>
                  <p class="text-xs text-slate-400 mt-1">500人 · 全狀態</p>
                </button>
                <button (click)="selectTemplate('precise')"
                        class="p-4 rounded-xl border transition-all text-center group"
                        [class.border-purple-500]="selectedTemplate() === 'precise'"
                        [class.bg-purple-500/20]="selectedTemplate() === 'precise'"
                        [class.border-slate-700]="selectedTemplate() !== 'precise'"
                        [class.bg-slate-800/50]="selectedTemplate() !== 'precise'">
                  <div class="text-2xl mb-1">🎯</div>
                  <p class="font-medium text-white text-sm">精準提取</p>
                  <p class="text-xs text-slate-400 mt-1">自定義條件</p>
                </button>
              </div>
            </div>
            
            <!-- 提取數量 -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-3">
                🔢 提取數量
              </label>
              <div class="flex flex-wrap gap-2">
                @for (option of limitOptions; track option.value) {
                  <button (click)="setLimit(option.value)"
                          class="px-4 py-2 rounded-lg border transition-all text-sm"
                          [class.border-emerald-500]="config().limit === option.value"
                          [class.bg-emerald-500/20]="config().limit === option.value"
                          [class.text-emerald-400]="config().limit === option.value"
                          [class.border-slate-700]="config().limit !== option.value"
                          [class.bg-slate-800/50]="config().limit !== option.value"
                          [class.text-slate-400]="config().limit !== option.value"
                          [disabled]="option.value > maxLimit()">
                    {{ option.label }}
                    @if (option.value > maxLimit()) {
                      <span class="ml-1 text-xs text-orange-400">🔒</span>
                    }
                  </button>
                }
              </div>
            </div>
            
            <!-- 在線狀態 -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-3">
                📍 在線狀態
              </label>
              <div class="grid grid-cols-4 gap-2">
                @for (option of onlineStatusOptions; track option.value) {
                  <button (click)="setOnlineStatus(option.value)"
                          class="px-3 py-2 rounded-lg border transition-all text-sm text-center"
                          [class.border-cyan-500]="config().filters.onlineStatus === option.value"
                          [class.bg-cyan-500/20]="config().filters.onlineStatus === option.value"
                          [class.text-cyan-400]="config().filters.onlineStatus === option.value"
                          [class.border-slate-700]="config().filters.onlineStatus !== option.value"
                          [class.bg-slate-800/50]="config().filters.onlineStatus !== option.value"
                          [class.text-slate-400]="config().filters.onlineStatus !== option.value">
                    {{ option.icon }} {{ option.label }}
                  </button>
                }
              </div>
            </div>
            
            <!-- 成員屬性篩選 -->
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-3">
                🏷️ 成員屬性
              </label>
              <div class="grid grid-cols-2 gap-3">
                <label class="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors">
                  <input type="checkbox"
                         [checked]="config().filters.excludeBots"
                         (change)="toggleFilter('excludeBots')"
                         class="rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500">
                  <div>
                    <p class="text-sm text-white">排除機器人</p>
                    <p class="text-xs text-slate-500">過濾 Bot 帳號</p>
                  </div>
                </label>
                
                <label class="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors">
                  <input type="checkbox"
                         [checked]="config().filters.hasUsername === true"
                         (change)="toggleFilter('hasUsername')"
                         class="rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500">
                  <div>
                    <p class="text-sm text-white">需有用戶名</p>
                    <p class="text-xs text-slate-500">僅提取有 &#64;username</p>
                  </div>
                </label>
                
                <label class="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors">
                  <input type="checkbox"
                         [checked]="config().filters.hasChinese === true"
                         (change)="toggleFilter('hasChinese')"
                         class="rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500">
                  <div>
                    <p class="text-sm text-white">僅華人用戶</p>
                    <p class="text-xs text-slate-500">中文名稱優先</p>
                  </div>
                </label>
                
                <label class="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 cursor-pointer hover:bg-slate-800 transition-colors">
                  <input type="checkbox"
                         [checked]="config().filters.isPremium === true"
                         (change)="toggleFilter('isPremium')"
                         class="rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500">
                  <div>
                    <p class="text-sm text-white">Premium 用戶</p>
                    <p class="text-xs text-slate-500">僅付費會員 ⭐</p>
                  </div>
                </label>
              </div>
            </div>
            
            <!-- 高級選項 (可折疊) -->
            <div class="border border-slate-700/50 rounded-xl overflow-hidden">
              <button (click)="showAdvanced.set(!showAdvanced())"
                      class="w-full p-4 bg-slate-800/30 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                <span class="text-sm font-medium text-slate-300">⚙️ 高級選項</span>
                <svg class="w-4 h-4 text-slate-400 transition-transform"
                     [class.rotate-180]="showAdvanced()"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              @if (showAdvanced()) {
                <div class="p-4 space-y-4 border-t border-slate-700/50">
                  <!-- 活躍度篩選 -->
                  <div>
                    <label class="block text-sm text-slate-400 mb-2">⏰ 活躍度篩選</label>
                    <div class="flex items-center gap-2">
                      <span class="text-sm text-slate-300">最近</span>
                      <select [value]="config().filters.minActivityDays || ''"
                              (change)="setActivityDays($event)"
                              class="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white focus:ring-emerald-500 focus:border-emerald-500">
                        <option value="">不限</option>
                        <option value="3">3 天</option>
                        <option value="7">7 天</option>
                        <option value="14">14 天</option>
                        <option value="30">30 天</option>
                      </select>
                      <span class="text-sm text-slate-300">內活動</span>
                    </div>
                  </div>
                  
                  <!-- 其他選項 -->
                  <div class="grid grid-cols-2 gap-3">
                    <label class="flex items-center gap-3 cursor-pointer p-2 bg-slate-700/30 rounded-lg hover:bg-slate-700/50">
                      <input type="checkbox"
                             [checked]="config().advanced.autoSaveToResources"
                             (change)="toggleAdvanced('autoSaveToResources')"
                             class="rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500">
                      <div>
                        <p class="text-sm text-white">自動保存</p>
                        <p class="text-xs text-slate-500">同步到資源中心</p>
                      </div>
                    </label>
                    
                    <label class="flex items-center gap-3 cursor-pointer p-2 bg-slate-700/30 rounded-lg hover:bg-slate-700/50">
                      <input type="checkbox"
                             [checked]="config().advanced.skipDuplicates"
                             (change)="toggleAdvanced('skipDuplicates')"
                             class="rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500">
                      <div>
                        <p class="text-sm text-white">跳過重複</p>
                        <p class="text-xs text-slate-500">已存在的成員</p>
                      </div>
                    </label>
                    
                    <label class="flex items-center gap-3 cursor-pointer p-2 bg-slate-700/30 rounded-lg hover:bg-slate-700/50">
                      <input type="checkbox"
                             [checked]="config().filters.excludeAdmins"
                             (change)="toggleFilter('excludeAdmins')"
                             class="rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500">
                      <div>
                        <p class="text-sm text-white">排除管理員</p>
                        <p class="text-xs text-slate-500">群主和管理員</p>
                      </div>
                    </label>
                    
                    <label class="flex items-center gap-3 cursor-pointer p-2 bg-slate-700/30 rounded-lg hover:bg-slate-700/50">
                      <input type="checkbox"
                             [checked]="config().advanced.shuffleOrder"
                             (change)="toggleAdvanced('shuffleOrder')"
                             class="rounded bg-slate-700 border-slate-600 text-emerald-500 focus:ring-emerald-500">
                      <div>
                        <p class="text-sm text-white">隨機順序</p>
                        <p class="text-xs text-slate-500">打亂提取順序</p>
                      </div>
                    </label>
                  </div>
                </div>
              }
            </div>
            }
            
          </div>
          
          <!-- 底部預估和按鈕 -->
          <div class="p-5 border-t border-slate-700/50 bg-slate-800/30">
            <!-- 預估信息 -->
            <div class="flex items-center justify-between mb-4 text-sm">
              <div class="flex items-center gap-4">
                <span class="text-slate-400">
                  💡 預計提取：
                  <span class="text-emerald-400 font-medium">{{ estimatedCount() }}</span> 人
                </span>
              </div>
              <div class="text-slate-400">
                📊 今日配額：
                <span class="text-cyan-400 font-medium">{{ remainingQuota() }}</span> / {{ dailyQuota() }}
              </div>
            </div>
            
            <!-- 按鈕 -->
            <div class="flex gap-3">
              <button (click)="close()"
                      class="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-colors font-medium">
                取消
              </button>
              <button (click)="startExtraction()"
                      [disabled]="!canStart()"
                      class="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <span>👥</span>
                <span>開始提取 ({{ config().limit }} 人)</span>
              </button>
            </div>
          </div>
          
        </div>
      </div>
    }
  `
})
export class MemberExtractionDialogComponent implements OnInit, OnDestroy {
  // 輸入輸出
  isOpen = input<boolean>(false);
  group = input<ExtractionGroupInfo | null>(null);
  
  closeDialog = output<void>();
  startExtractionEvent = output<{ group: ExtractionGroupInfo; config: MemberExtractionConfig }>();
  memberCountRefreshed = output<{ groupId: string; memberCount: number }>();  // 🆕 成員數刷新事件
  enableMonitoringEvent = output<ExtractionGroupInfo>();  // 🆕 開啟監控事件
  joinGroupEvent = output<ExtractionGroupInfo>();  // 🆕 加入群組事件
  viewCollectedUsersEvent = output<ExtractionGroupInfo>();  // 🆕 查看已收集用戶事件
  
  // 服務注入
  private ipcService = inject(ElectronIpcService);
  private toast = inject(ToastService);
  
  // 狀態
  showAdvanced = signal(false);
  selectedTemplate = signal<QuickTemplate>('quick');
  isRefreshingCount = signal(false);  // 🆕 刷新成員數狀態
  
  // 🆕 提取錯誤狀態
  extractionError = signal<{
    code: string;
    title: string;
    reason: string;
    suggestion: string;
    alternative?: string;
    canAutoJoin?: boolean;
  } | null>(null);
  
  // 🆕 已收集用戶數量
  collectedUsersCount = signal(0);
  
  // 🆕 監控狀態
  isMonitoring = signal(false);
  
  // 配置數據
  config = signal<MemberExtractionConfig>({
    limit: 100,
    filters: {
      onlineStatus: 'all',  // 🔧 FIX: 默認提取所有成員，而非只提取在線
      hasChinese: null,
      hasUsername: null,
      isPremium: null,
      excludeBots: true,
      excludeAdmins: false,
      minActivityDays: null
    },
    advanced: {
      shuffleOrder: false,
      skipDuplicates: true,
      autoSaveToResources: true,
      extractAvatar: false
    }
  });
  
  // 選項配置
  limitOptions = [
    { value: 50, label: '50' },
    { value: 100, label: '100' },
    { value: 200, label: '200' },
    { value: 500, label: '500' },
    { value: -1, label: '全部' }
  ];
  
  onlineStatusOptions = [
    { value: 'all' as const, label: '全部', icon: '📊' },
    { value: 'online' as const, label: '在線', icon: '🟢' },
    { value: 'recently' as const, label: '最近', icon: '🟡' },
    { value: 'offline' as const, label: '離線', icon: '⚫' }
  ];
  
  // 計算屬性
  maxLimit = computed(() => {
    // 根據群組規模限制最大提取數
    const groupSize = this.group()?.memberCount || 0;
    return Math.min(groupSize, 10000);
  });
  
  dailyQuota = signal(1000);
  remainingQuota = signal(800);
  
  estimatedCount = computed(() => {
    const limit = this.config().limit;
    const groupSize = this.group()?.memberCount || 0;
    
    if (limit === -1) {
      return Math.min(groupSize, this.remainingQuota());
    }
    return Math.min(limit, groupSize, this.remainingQuota());
  });
  
  // 🆕 是否是頻道類型（頻道不支持成員提取）
  isChannel = computed(() => {
    return this.group()?.resourceType === 'channel';
  });
  
  canStart = computed(() => {
    const group = this.group();
    if (!group) return false;
    if (this.isChannel()) return false;  // 🆕 頻道不可提取
    return this.estimatedCount() > 0;
  });
  
  private listeners: (() => void)[] = [];
  
  ngOnInit() {
    this.loadQuota();
    this.listenForExtractionErrors();
    this.loadCollectedUsersCount();  // 🆕 加載已收集用戶數量
  }
  
  ngOnDestroy() {
    this.listeners.forEach(fn => fn());
  }
  
  // 載入配額信息
  private loadQuota() {
    // 從 IPC 獲取配額
    const cleanup = this.ipcService.on('extraction-quota', (data: any) => {
      if (data) {
        this.dailyQuota.set(data.daily || 1000);
        this.remainingQuota.set(data.remaining || 800);
      }
    });
    this.listeners.push(cleanup);
    
    this.ipcService.send('get-extraction-quota', {});
  }
  
  // 🆕 監聽提取錯誤
  private listenForExtractionErrors() {
    const cleanup = this.ipcService.on('members-extracted', (data: {
      success: boolean;
      resourceId?: string | number;
      error?: string;
      error_code?: string;
      error_details?: {
        reason?: string;
        suggestion?: string;
        can_auto_join?: boolean;
        alternative?: string;
      };
    }) => {
      const group = this.group();
      if (!group || String(data.resourceId) !== String(group.id)) return;
      
      if (!data.success && data.error_code) {
        // 🆕 解析並顯示詳細錯誤
        const details = data.error_details || {};
        const errorMap: Record<string, { title: string; defaultReason: string }> = {
          'ADMIN_REQUIRED': {
            title: '需要管理員權限',
            defaultReason: '此群組設置了成員列表只對管理員可見'
          },
          'PEER_ID_INVALID': {
            title: '帳號尚未連接此群組',
            defaultReason: 'Telegram 要求帳號必須先加入群組'
          },
          'NOT_PARTICIPANT': {
            title: '帳號不是群組成員',
            defaultReason: '當前帳號尚未加入此群組'
          },
          'CHANNEL_PRIVATE': {
            title: '私有群組',
            defaultReason: '這是一個私有群組，需要先加入'
          },
          'CHANNEL_INVALID': {
            title: '無效的群組',
            defaultReason: '群組可能已被刪除或 ID 無效'
          },
          'USERNAME_NOT_OCCUPIED': {
            title: '無法解析群組',
            defaultReason: '這可能是私有群組，沒有公開的 username'
          }
        };
        
        const errorInfo = errorMap[data.error_code] || {
          title: '提取失敗',
          defaultReason: data.error || '未知錯誤'
        };
        
        this.extractionError.set({
          code: data.error_code,
          title: errorInfo.title,
          reason: details.reason || errorInfo.defaultReason,
          suggestion: details.suggestion || '請稍後重試或嘗試其他方式',
          alternative: details.alternative === 'monitor_messages' ? 'monitor' : undefined,
          canAutoJoin: details.can_auto_join
        });
      } else if (data.success) {
        // 成功時清除錯誤
        this.extractionError.set(null);
      }
    });
    this.listeners.push(cleanup);
  }
  
  // 🆕 開啟消息監控（替代方案）
  enableMonitoring() {
    const group = this.group();
    if (group) {
      this.enableMonitoringEvent.emit(group);
      this.toast.info('📡 正在開啟消息監控，將自動收集發言用戶');
      this.close();
    }
  }
  
  // 🆕 加入群組
  joinGroup() {
    const group = this.group();
    if (group) {
      this.joinGroupEvent.emit(group);
      this.toast.info('➕ 正在嘗試加入群組...');
    }
  }
  
  // 選擇快速模板
  selectTemplate(template: QuickTemplate) {
    this.selectedTemplate.set(template);
    
    switch (template) {
      case 'quick':
        this.config.update(c => ({
          ...c,
          limit: 100,
          filters: {
            ...c.filters,
            onlineStatus: 'online',
            excludeBots: true
          }
        }));
        break;
        
      case 'deep':
        this.config.update(c => ({
          ...c,
          limit: 500,
          filters: {
            ...c.filters,
            onlineStatus: 'all',
            excludeBots: true
          }
        }));
        break;
        
      case 'precise':
        // 保持當前配置，讓用戶自定義
        break;
    }
  }
  
  // 設置提取數量
  setLimit(limit: number) {
    this.selectedTemplate.set('precise');
    this.config.update(c => ({ ...c, limit }));
  }
  
  // 設置在線狀態
  setOnlineStatus(status: 'all' | 'online' | 'recently' | 'offline') {
    this.selectedTemplate.set('precise');
    this.config.update(c => ({
      ...c,
      filters: { ...c.filters, onlineStatus: status }
    }));
  }
  
  // 切換篩選條件
  toggleFilter(key: string) {
    this.selectedTemplate.set('precise');
    this.config.update(c => {
      const filters = { ...c.filters } as any;
      
      if (key === 'excludeBots' || key === 'excludeAdmins') {
        filters[key] = !filters[key];
      } else {
        // 對於可選布爾值，循環 null -> true -> false -> null
        if (filters[key] === null || filters[key] === undefined) {
          filters[key] = true;
        } else if (filters[key] === true) {
          filters[key] = false;
        } else {
          filters[key] = null;
        }
      }
      
      return { ...c, filters };
    });
  }
  
  // 切換高級選項
  toggleAdvanced(key: keyof MemberExtractionConfig['advanced']) {
    this.config.update(c => ({
      ...c,
      advanced: { ...c.advanced, [key]: !c.advanced[key] }
    }));
  }
  
  // 設置活躍度天數
  setActivityDays(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    const days = value ? parseInt(value, 10) : null;
    this.selectedTemplate.set('precise');
    this.config.update(c => ({
      ...c,
      filters: { ...c.filters, minActivityDays: days }
    }));
  }
  
  // 🆕 刷新成員數
  refreshMemberCount() {
    const groupInfo = this.group();
    if (!groupInfo) return;
    
    this.isRefreshingCount.set(true);
    
    // 監聯後端回應
    const cleanup = this.ipcService.on('group-member-count-result', (data: any) => {
      this.isRefreshingCount.set(false);
      cleanup();
      
      if (data.success && data.memberCount > 0) {
        // 更新本地群組信息
        this.toast.success(`✅ 成功獲取成員數：${data.memberCount} 人`);
        // 觸發父組件更新
        this.memberCountRefreshed.emit({
          groupId: groupInfo.id,
          memberCount: data.memberCount
        });
      } else {
        this.toast.error(data.error || '無法獲取成員數，請確認已加入該群組');
      }
    });
    this.listeners.push(cleanup);
    
    // 發送刷新請求 - 🔧 修復：同時傳入 telegramId
    this.ipcService.send('get-group-member-count', {
      groupId: groupInfo.id,
      url: groupInfo.url,
      telegramId: groupInfo.telegramId || groupInfo.id,
      accountPhone: groupInfo.accountPhone
    });
    
    // 超時處理
    setTimeout(() => {
      if (this.isRefreshingCount()) {
        this.isRefreshingCount.set(false);
        this.toast.error('獲取成員數超時，請稍後重試');
      }
    }, 15000);
  }
  
  // 開始提取
  startExtraction() {
    const groupInfo = this.group();
    if (!groupInfo) {
      this.toast.error('群組信息不存在');
      return;
    }
    
    if (this.estimatedCount() === 0) {
      this.toast.warning('成員數據不可用，請先點擊「重新獲取成員數」');
      return;
    }
    
    this.startExtractionEvent.emit({
      group: groupInfo,
      config: this.config()
    });
    
    this.close();
  }
  
  // 關閉對話框
  close() {
    this.closeDialog.emit();
  }
  
  // 背景點擊關閉
  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
  
  // 🆕 確認監控狀態
  checkMonitoringStatus() {
    const group = this.group();
    if (!group) return;
    
    // 發送檢查監控狀態請求
    this.ipcService.send('get-group-monitoring-status', {
      groupId: group.id,
      telegramId: group.telegramId
    });
    
    // 監聽響應
    const cleanup = this.ipcService.on('group-monitoring-status', (data: {
      groupId: string;
      isMonitoring: boolean;
      collectedUsers: number;
    }) => {
      if (String(data.groupId) === String(group.id)) {
        this.isMonitoring.set(data.isMonitoring);
        this.collectedUsersCount.set(data.collectedUsers || 0);
        
        if (data.isMonitoring) {
          this.toast.success(`✅ 監控已開啟，已收集 ${data.collectedUsers} 位用戶`);
        } else {
          this.toast.warning('⚠️ 監控未開啟，請在群組詳情中開啟監控');
        }
        cleanup();
      }
    });
    this.listeners.push(cleanup);
    
    this.toast.info('🔍 正在檢查監控狀態...');
  }
  
  // 🆕 查看已收集用戶
  viewCollectedUsers() {
    const group = this.group();
    if (group) {
      this.viewCollectedUsersEvent.emit(group);
      this.close();
    }
  }
  
  // 🆕 從歷史消息收集用戶
  collectFromHistory() {
    const group = this.group();
    if (!group) return;
    
    this.toast.info('🔄 正在從歷史消息中收集用戶...');
    
    this.ipcService.send('collect-users-from-history', {
      groupId: group.id,
      telegramId: group.telegramId,
      limit: 500
    });
    
    const cleanup = this.ipcService.on('collect-from-history-result', (data: {
      groupId: string;
      success: boolean;
      collected?: number;
      newUsers?: number;
      error?: string;
    }) => {
      if (String(data.groupId) === String(group.id)) {
        cleanup();
        
        if (data.success) {
          this.toast.success(`✅ 收集完成！共 ${data.collected} 位用戶，新增 ${data.newUsers || 0} 位`);
          // 更新已收集用戶數量
          this.collectedUsersCount.update(c => c + (data.newUsers || 0));
        } else {
          this.toast.error(data.error || '收集失敗');
        }
      }
    });
    this.listeners.push(cleanup);
  }
  
  // 🆕 加載已收集用戶數量
  private loadCollectedUsersCount() {
    const group = this.group();
    if (!group) return;
    
    // 發送請求獲取已收集用戶數量
    this.ipcService.send('get-collected-users-count', {
      groupId: group.id,
      sourceType: 'monitoring'
    });
    
    const cleanup = this.ipcService.on('collected-users-count', (data: {
      groupId: string;
      count: number;
    }) => {
      if (String(data.groupId) === String(group.id)) {
        this.collectedUsersCount.set(data.count || 0);
        cleanup();
      }
    });
    this.listeners.push(cleanup);
  }
}
