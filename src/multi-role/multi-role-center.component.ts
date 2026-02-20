/**
 * 角色資源庫組件
 * Role Library Component
 * 
 * 🆕 Phase 3-2: 重構為「角色資源庫」
 * 
 * 職責：
 * - 角色定義管理（系統角色 + 自定義角色）
 * - 場景模板管理
 * - 劇本編排
 * 
 * 已移至營銷任務中心：
 * - 協作群組監控（現在是任務的一部分）
 * - 任務執行控制
 */

import { Component, signal, computed, inject, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiRoleService } from './multi-role.service';
import { AutoGroupService } from './auto-group.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { CollaborationExecutorService } from './collaboration-executor.service';
import { DynamicScriptEngineService } from './dynamic-script-engine.service';
import { CollaborationOrchestratorService, RoleEntryConfig } from './collaboration-orchestrator.service';
import { RoleEditorComponent } from './components/role-editor.component';
import { ScriptEditorComponent } from './components/script-editor.component';
import { RoleLibraryComponent } from './components/role-library.component';
import { ScenarioSelectorComponent } from './components/scenario-selector.component';
import { ToastService } from '../toast.service';
import { UnifiedContactsService, UnifiedContact } from '../services/unified-contacts.service';
import { AccountManagementService } from '../services/account-management.service';
import { 
  RoleDefinition, 
  ScriptTemplate, 
  CollaborationGroup,
  RoleType,
  ROLE_TYPE_META
} from './multi-role.models';
import { PresetScenario } from './preset-scenarios';

// 🆕 P0: Emoji shortcode 到 Unicode 的映射表
const EMOJI_SHORTCODE_MAP: Record<string, string> = {
  ':payment:': '💳',
  ':money:': '💰',
  ':dollar:': '💵',
  ':credit_card:': '💳',
  ':moneybag:': '💰',
  ':chart:': '📊',
  ':briefcase:': '💼',
  ':handshake:': '🤝',
  ':star:': '⭐',
  ':heart:': '❤️',
  ':fire:': '🔥',
  ':rocket:': '🚀',
  ':crown:': '👑',
  ':trophy:': '🏆',
  ':phone:': '📞',
  ':headphone:': '🎧',
  ':headphones:': '🎧',
  ':wrench:': '🔧',
  ':gear:': '⚙️',
  ':speech_balloon:': '💬',
  ':bulb:': '💡',
  ':lightbulb:': '💡',
  ':target:': '🎯',
  ':dart:': '🎯',
  ':man_office_worker:': '👨‍💼',
  ':woman_office_worker:': '👩‍💼',
  ':person:': '👤',
  ':people:': '👥',
  ':smile:': '😊',
  ':thumbsup:': '👍',
  ':ok_hand:': '👌',
  ':wave:': '👋',
  ':clipboard:': '📋',
  ':memo:': '📝',
  ':book:': '📚',
  ':graduation_cap:': '🎓',
  ':sparkles:': '✨',
  ':party_popper:': '🎉',
  ':gift:': '🎁',
  ':house:': '🏠',
  ':office:': '🏢',
  ':bank:': '🏦',
  ':shopping_cart:': '🛒',
  ':package:': '📦',
  ':truck:': '🚚',
  ':clock:': '⏰',
  ':calendar:': '📅',
  ':lock:': '🔒',
  ':key:': '🔑',
  ':shield:': '🛡️',
  ':check:': '✅',
  ':x:': '❌',
  ':warning:': '⚠️',
  ':question:': '❓',
  ':info:': 'ℹ️',
};

/**
 * 🆕 P0: 清理並轉換 icon 欄位
 * - 將 :shortcode: 轉換為 Unicode emoji
 * - 如果無法識別，返回默認 icon
 */
function sanitizeIcon(icon: string | undefined, defaultIcon: string = '💼'): string {
  if (!icon) return defaultIcon;
  
  // 如果已經是 emoji（非 ASCII），直接返回
  if (!/^[\x00-\x7F]*$/.test(icon) && !icon.includes(':')) {
    return icon;
  }
  
  // 嘗試從映射表中查找
  const normalized = icon.toLowerCase().trim();
  if (EMOJI_SHORTCODE_MAP[normalized]) {
    return EMOJI_SHORTCODE_MAP[normalized];
  }
  
  // 嘗試匹配 :xxx: 格式
  const match = normalized.match(/^:([a-z_]+):$/);
  if (match) {
    const key = `:${match[1]}:`;
    if (EMOJI_SHORTCODE_MAP[key]) {
      return EMOJI_SHORTCODE_MAP[key];
    }
  }
  
  // 如果是純文字或無法識別的 shortcode，返回默認值
  if (icon.startsWith(':') && icon.endsWith(':')) {
    console.warn(`[MultiRole] 未識別的 emoji shortcode: ${icon}，使用默認值`);
    return defaultIcon;
  }
  
  return icon;
}

/**
 * 🆕 P0: 清理 AI 返回的角色列表中的 icon
 */
function sanitizeRoleIcons(roles: any[]): any[] {
  if (!Array.isArray(roles)) return [];
  
  return roles.map(role => ({
    ...role,
    icon: sanitizeIcon(role.icon, '💼')
  }));
}

// 目標用戶類型（用於多角色協作）
interface TargetUser {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  intentScore: number;
  source?: string;
}

type MultiRoleTab = 'overview' | 'roles' | 'scripts' | 'tasks';

@Component({
  selector: 'app-multi-role-center',
  standalone: true,
  imports: [CommonModule, FormsModule, RoleEditorComponent, ScriptEditorComponent, RoleLibraryComponent, ScenarioSelectorComponent],
  template: `
    <div class="multi-role-center h-full flex flex-col bg-slate-900">
      <!-- 頂部標題欄 -->
      <div class="p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-2xl">🎭</span>
              多角色協作
            </h1>
            
            <!-- 活躍群組數 -->
            <div class="flex items-center gap-2">
              @if (multiRoleService.activeGroupCount() > 0) {
                <span class="flex items-center gap-2 px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                  <span class="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                  {{ multiRoleService.activeGroupCount() }} 個協作進行中
                </span>
              } @else {
                <span class="px-3 py-1 bg-slate-700 text-slate-400 rounded-full text-sm">
                  無活躍協作
                </span>
              }
            </div>
          </div>
          
          <!-- 快速統計 -->
          <div class="flex items-center gap-4 px-4 py-2 bg-slate-800/80 rounded-xl border border-slate-700/50">
            <div class="text-center">
              <div class="text-lg font-bold text-purple-400">{{ multiRoleService.roles().length }}</div>
              <div class="text-xs text-slate-500">角色</div>
            </div>
            <div class="w-px h-8 bg-slate-700"></div>
            <div class="text-center">
              <div class="text-lg font-bold text-cyan-400">{{ multiRoleService.scripts().length }}</div>
              <div class="text-xs text-slate-500">劇本</div>
            </div>
            <div class="w-px h-8 bg-slate-700"></div>
            <div class="text-center">
              <div class="text-lg font-bold text-emerald-400">{{ multiRoleService.availableRoles().length }}</div>
              <div class="text-xs text-slate-500">已就緒</div>
            </div>
          </div>
        </div>
        
        <!-- Tab 導航 (4 核心 tab) -->
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

          <!-- ═══════════════════════════════════════════
               Tab 1: 快速開始 (overview)
               - AI 策劃入口
               - 就緒狀態檢查
               - 近期協作任務
               - 跳轉到其他功能模組
          ══════════════════════════════════════════════ -->
          @case ('overview') {
            <div class="space-y-5 max-w-4xl mx-auto">

              <!-- 快速統計行 -->
              <div class="grid grid-cols-3 gap-4">
                <div class="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4 text-center">
                  <div class="text-2xl font-bold text-purple-400">{{ multiRoleService.activeGroupCount() }}</div>
                  <div class="text-xs text-slate-400 mt-1">進行中協作</div>
                </div>
                <div class="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4 text-center">
                  <div class="text-2xl font-bold text-emerald-400">{{ multiRoleService.availableRoles().length }}</div>
                  <div class="text-xs text-slate-400 mt-1">已就緒角色</div>
                </div>
                <div class="bg-slate-800/60 rounded-xl border border-slate-700/50 p-4 text-center">
                  <div class="text-2xl font-bold text-cyan-400">{{ multiRoleService.scripts().length }}</div>
                  <div class="text-xs text-slate-400 mt-1">可用劇本</div>
                </div>
              </div>

              <!-- AI 一鍵策劃卡片 -->
              <div class="bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 rounded-2xl border border-purple-500/30 p-6">
                <div class="flex items-center justify-between">
                  <div>
                    <h2 class="text-xl font-bold text-white flex items-center gap-3">
                      <span class="text-2xl">🤖</span>
                      AI 智能策劃
                      <span class="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded-full">智能</span>
                    </h2>
                    <p class="text-slate-400 mt-1">告訴 AI 你的目標，自動生成最佳角色組合和執行策略</p>
                  </div>
                  <button (click)="openAIPlanner()"
                          class="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2">
                    <span>🚀</span>
                    開始策劃
                  </button>
                </div>
                <!-- 快速目標選擇 -->
                <div class="mt-4 flex flex-wrap gap-2">
                  <span class="text-sm text-slate-500">快速選擇：</span>
                  <button (click)="quickAIPlan('促進首單成交')"
                          class="px-3 py-1.5 bg-slate-700/50 text-slate-300 text-sm rounded-lg hover:bg-slate-700 transition-colors">
                    💰 促進首單
                  </button>
                  <button (click)="quickAIPlan('挽回流失客戶')"
                          class="px-3 py-1.5 bg-slate-700/50 text-slate-300 text-sm rounded-lg hover:bg-slate-700 transition-colors">
                    💝 挽回流失
                  </button>
                  <button (click)="quickAIPlan('提升社群活躍度')"
                          class="px-3 py-1.5 bg-slate-700/50 text-slate-300 text-sm rounded-lg hover:bg-slate-700 transition-colors">
                    🎉 社群活躍
                  </button>
                  <button (click)="quickAIPlan('處理售後問題')"
                          class="px-3 py-1.5 bg-slate-700/50 text-slate-300 text-sm rounded-lg hover:bg-slate-700 transition-colors">
                    🔧 售後服務
                  </button>
                </div>
              </div>

              <!-- 就緒狀態檢查 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
                <h3 class="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <span>✅</span> 協作準備狀態
                </h3>
                <div class="space-y-3">
                  <!-- 角色就緒 -->
                  <div class="flex items-center justify-between py-2 border-b border-slate-700/30">
                    <div class="flex items-center gap-3">
                      @if (multiRoleService.roles().length > 0) {
                        <span class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">✓</span>
                      } @else {
                        <span class="w-6 h-6 rounded-full bg-slate-600 text-slate-400 flex items-center justify-center text-xs">!</span>
                      }
                      <span class="text-sm text-slate-300">已定義角色</span>
                    </div>
                    @if (multiRoleService.roles().length > 0) {
                      <span class="text-xs text-emerald-400">{{ multiRoleService.roles().length }} 個角色</span>
                    } @else {
                      <button (click)="activeTab.set('roles'); rolesSubTab.set('mine')"
                              class="text-xs text-purple-400 hover:text-purple-300">去添加 →</button>
                    }
                  </div>
                  <!-- 帳號綁定 -->
                  <div class="flex items-center justify-between py-2 border-b border-slate-700/30">
                    <div class="flex items-center gap-3">
                      @if (multiRoleService.availableRoles().length > 0) {
                        <span class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">✓</span>
                      } @else {
                        <span class="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-xs">!</span>
                      }
                      <span class="text-sm text-slate-300">角色已綁定帳號</span>
                    </div>
                    @if (multiRoleService.availableRoles().length > 0) {
                      <span class="text-xs text-emerald-400">{{ multiRoleService.availableRoles().length }} 個就緒</span>
                    } @else {
                      <button (click)="activeTab.set('roles'); rolesSubTab.set('mine')"
                              class="text-xs text-yellow-400 hover:text-yellow-300">去綁定帳號 →</button>
                    }
                  </div>
                  <!-- 劇本就緒 -->
                  <div class="flex items-center justify-between py-2">
                    <div class="flex items-center gap-3">
                      @if (multiRoleService.scripts().length > 0) {
                        <span class="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">✓</span>
                      } @else {
                        <span class="w-6 h-6 rounded-full bg-slate-600 text-slate-400 flex items-center justify-center text-xs">!</span>
                      }
                      <span class="text-sm text-slate-300">已設計劇本</span>
                    </div>
                    @if (multiRoleService.scripts().length > 0) {
                      <span class="text-xs text-emerald-400">{{ multiRoleService.scripts().length }} 個劇本</span>
                    } @else {
                      <button (click)="activeTab.set('scripts'); scriptsSubTab.set('mine')"
                              class="text-xs text-purple-400 hover:text-purple-300">去創建 →</button>
                    }
                  </div>
                </div>
              </div>

              <!-- 快捷跳轉到其他模組 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
                <h3 class="text-sm font-semibold text-slate-400 mb-3">相關功能模組</h3>
                <div class="grid grid-cols-2 gap-3">
                  <button (click)="goTo('trigger-rules')"
                          class="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors text-left">
                    <span class="text-xl">🔄</span>
                    <div>
                      <div class="text-sm text-white">觸發規則</div>
                      <div class="text-xs text-slate-500">配置自動觸發條件</div>
                    </div>
                    <span class="ml-auto text-slate-500">→</span>
                  </button>
                  <button (click)="goTo('monitoring-groups')"
                          class="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors text-left">
                    <span class="text-xl">📈</span>
                    <div>
                      <div class="text-sm text-white">執行監控</div>
                      <div class="text-xs text-slate-500">查看群組執行狀態</div>
                    </div>
                    <span class="ml-auto text-slate-500">→</span>
                  </button>
                  <button (click)="goTo('analytics-center')"
                          class="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors text-left">
                    <span class="text-xl">📊</span>
                    <div>
                      <div class="text-sm text-white">數據分析</div>
                      <div class="text-xs text-slate-500">協作效果報告</div>
                    </div>
                    <span class="ml-auto text-slate-500">→</span>
                  </button>
                  <button (click)="showSettings.set(!showSettings())"
                          class="flex items-center gap-3 p-3 rounded-lg transition-colors text-left"
                          [class.bg-purple-500/20]="showSettings()"
                          [class.border]="showSettings()"
                          [class.border-purple-500/30]="showSettings()"
                          [class.bg-slate-700/50]="!showSettings()"
                          [class.hover:bg-slate-700]="!showSettings()">
                    <span class="text-xl">⚙️</span>
                    <div>
                      <div class="text-sm text-white">協作設置</div>
                      <div class="text-xs text-slate-500">觸發條件、群名模板</div>
                    </div>
                    <span class="ml-auto text-slate-400 text-xs">{{ showSettings() ? '▲' : '▼' }}</span>
                  </button>
                </div>
              </div>

              <!-- 協作設置折疊面板 -->
              @if (showSettings()) {
                <div class="bg-slate-800/50 rounded-xl border border-purple-500/20 p-5 space-y-5">
                  <h3 class="font-semibold text-white flex items-center gap-2">
                    <span>⚙️</span> 協作設置
                  </h3>

                  <!-- 自動建群設置 -->
                  <div class="space-y-4">
                    <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">自動建群</div>
                    <div>
                      <label class="text-sm text-slate-400 block mb-1.5">群名模板</label>
                      <input type="text"
                             [(ngModel)]="autoGroupNameTemplate"
                             placeholder="VIP專屬服務群 - &#123;客戶名&#125;"
                             class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm">
                      <p class="text-xs text-slate-500 mt-1">可用變量: {{ '{' }}客戶名{{ '}' }}</p>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="text-sm text-slate-400 block mb-1.5">最大同時協作數</label>
                        <input type="number" [(ngModel)]="maxConcurrent" min="1" max="20"
                               class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                      </div>
                      <div>
                        <label class="text-sm text-slate-400 block mb-1.5">自動關閉天數</label>
                        <input type="number" [(ngModel)]="autoCloseDays" min="1" max="30"
                               class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                      </div>
                    </div>
                  </div>

                  <!-- 觸發條件 -->
                  <div class="space-y-4">
                    <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">觸發條件</div>
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="text-sm text-slate-400 block mb-1.5">意向評分閾值</label>
                        <div class="flex items-center gap-2">
                          <input type="range" [(ngModel)]="intentThreshold" min="50" max="100" step="5" class="flex-1">
                          <span class="text-white text-sm w-10 text-right">{{ intentThreshold }}%</span>
                        </div>
                      </div>
                      <div>
                        <label class="text-sm text-slate-400 block mb-1.5">最少對話輪數</label>
                        <input type="number" [(ngModel)]="minRounds" min="1" max="20"
                               class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                      </div>
                    </div>
                    <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer">
                      <div>
                        <div class="text-sm text-white">需要詢問過價格</div>
                        <div class="text-xs text-slate-400">只有詢問過價格的客戶才觸發</div>
                      </div>
                      <input type="checkbox" [(ngModel)]="requirePriceInquiry"
                             class="w-5 h-5 rounded text-purple-500 bg-slate-700 border-slate-600">
                    </label>
                  </div>

                  <!-- AI 設置 -->
                  <div class="space-y-3">
                    <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI 設置</div>
                    <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer">
                      <div>
                        <div class="text-sm text-white">使用 AI 中心配置</div>
                        <div class="text-xs text-slate-400">從智能引擎獲取模型配置</div>
                      </div>
                      <input type="checkbox" [(ngModel)]="useAICenter"
                             class="w-5 h-5 rounded text-purple-500 bg-slate-700 border-slate-600">
                    </label>
                    <div>
                      <label class="text-sm text-slate-400 block mb-1.5">協作模式</label>
                      <div class="flex gap-2">
                        <button (click)="coordinationMode = 'sequential'"
                                class="flex-1 py-2 px-4 rounded-lg text-sm transition-colors"
                                [class.bg-purple-500]="coordinationMode === 'sequential'"
                                [class.text-white]="coordinationMode === 'sequential'"
                                [class.bg-slate-700]="coordinationMode !== 'sequential'"
                                [class.text-slate-300]="coordinationMode !== 'sequential'">
                          順序執行
                        </button>
                        <button (click)="coordinationMode = 'responsive'"
                                class="flex-1 py-2 px-4 rounded-lg text-sm transition-colors"
                                [class.bg-purple-500]="coordinationMode === 'responsive'"
                                [class.text-white]="coordinationMode === 'responsive'"
                                [class.bg-slate-700]="coordinationMode !== 'responsive'"
                                [class.text-slate-300]="coordinationMode !== 'responsive'">
                          響應式
                        </button>
                      </div>
                    </div>
                  </div>

                  <button (click)="saveSettings()"
                          class="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity font-medium text-sm">
                    保存設置
                  </button>
                </div>
              }
            </div>
          }

          <!-- ═══════════════════════════════════════════
               Tab 2: 角色管理 (roles)
               - 子標籤: 我的角色 / 角色庫(50+)
          ══════════════════════════════════════════════ -->
          @case ('roles') {
            <div class="space-y-4">
              <!-- 子標籤切換 -->
              <div class="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
                <button (click)="rolesSubTab.set('mine')"
                        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        [class.bg-slate-700]="rolesSubTab() === 'mine'"
                        [class.text-white]="rolesSubTab() === 'mine'"
                        [class.text-slate-400]="rolesSubTab() !== 'mine'">
                  🎭 我的角色
                  @if (multiRoleService.roles().length > 0) {
                    <span class="ml-1.5 px-1.5 py-0.5 bg-purple-500/30 text-purple-300 text-xs rounded-full">
                      {{ multiRoleService.roles().length }}
                    </span>
                  }
                </button>
                <button (click)="rolesSubTab.set('library')"
                        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        [class.bg-slate-700]="rolesSubTab() === 'library'"
                        [class.text-white]="rolesSubTab() === 'library'"
                        [class.text-slate-400]="rolesSubTab() !== 'library'">
                  📚 角色庫 (50+)
                </button>
              </div>

              <!-- 我的角色 -->
              @if (rolesSubTab() === 'mine') {
                <div class="max-w-4xl space-y-5">
                  <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                    <div class="flex items-center justify-between mb-6">
                      <h3 class="font-semibold text-white flex items-center gap-2">
                        <span>🎭</span> 我的角色定義
                      </h3>
                      <div class="flex gap-2">
                        <button (click)="rolesSubTab.set('library')"
                                class="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors">
                          從角色庫添加
                        </button>
                        <button (click)="showAddRole.set(true)"
                                class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
                          + 自定義角色
                        </button>
                      </div>
                    </div>

                    <div class="space-y-4">
                      @for (role of multiRoleService.roles(); track role.id) {
                        <div class="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors">
                          <div class="flex items-center gap-4">
                            <div class="w-14 h-14 rounded-xl flex items-center justify-center text-3xl"
                                 [class.bg-purple-500/20]="role.type === 'expert'"
                                 [class.bg-emerald-500/20]="role.type === 'satisfied_customer'"
                                 [class.bg-cyan-500/20]="role.type === 'support'"
                                 [class.bg-orange-500/20]="role.type === 'manager'"
                                 [class.bg-slate-600]="role.type === 'custom'">
                              {{ getRoleIcon(role.type) }}
                            </div>
                            <div>
                              <div class="font-medium text-white">{{ role.name }}</div>
                              <div class="text-sm text-slate-400">{{ role.personality.description }}</div>
                              <div class="flex items-center gap-2 mt-1">
                                @if (role.boundAccountPhone) {
                                  <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                                    綁定: {{ role.boundAccountPhone }}
                                  </span>
                                } @else {
                                  <span class="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                                    未綁定帳號
                                  </span>
                                }
                                <span class="px-2 py-0.5 bg-slate-600 text-slate-300 text-xs rounded">
                                  {{ getRoleStyleLabel(role.personality.speakingStyle) }}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div class="flex items-center gap-3">
                            <button (click)="editRole(role)"
                                    class="px-3 py-1.5 bg-slate-600 text-slate-300 rounded-lg text-sm hover:bg-slate-500">
                              編輯
                            </button>
                            <button (click)="deleteRole(role)" class="text-slate-500 hover:text-red-400">
                              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      } @empty {
                        <div class="text-center py-12 text-slate-400">
                          <div class="text-5xl mb-4">🎭</div>
                          <p class="text-lg mb-2">尚未定義角色</p>
                          <p class="text-sm mb-6">從角色庫選擇預設角色，或自定義新角色</p>
                          <div class="flex gap-3 justify-center">
                            <button (click)="rolesSubTab.set('library')"
                                    class="px-5 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors">
                              📚 瀏覽角色庫
                            </button>
                            <button (click)="showAddRole.set(true)"
                                    class="px-5 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-400 transition-colors">
                              + 自定義角色
                            </button>
                          </div>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- 快速添加預設角色類型 -->
                  @if (multiRoleService.roles().length > 0) {
                    <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
                      <h4 class="text-sm font-medium text-white mb-4">快速添加預設角色類型</h4>
                      <div class="grid grid-cols-3 gap-3">
                        @for (type of roleTypes; track type.id) {
                          <button (click)="quickAddRole(type.id)"
                                  class="p-4 bg-slate-700/50 rounded-xl text-center hover:bg-slate-700 transition-colors">
                            <div class="text-3xl mb-2">{{ type.icon }}</div>
                            <div class="text-sm text-white font-medium">{{ type.label }}</div>
                            <div class="text-xs text-slate-400 mt-1">{{ type.description }}</div>
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              }

              <!-- 角色庫 (50+) -->
              @if (rolesSubTab() === 'library') {
                <app-role-library
                  (roleAdded)="onPresetRoleAdded($event)"
                  (roleEdit)="onPresetRoleEdit($event)">
                </app-role-library>
              }
            </div>
          }

          <!-- ═══════════════════════════════════════════
               Tab 3: 劇本設計 (scripts)
               - 子標籤: 我的劇本 / 場景模板
          ══════════════════════════════════════════════ -->
          @case ('scripts') {
            <div class="space-y-4">
              <!-- 子標籤切換 -->
              <div class="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
                <button (click)="scriptsSubTab.set('mine')"
                        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        [class.bg-slate-700]="scriptsSubTab() === 'mine'"
                        [class.text-white]="scriptsSubTab() === 'mine'"
                        [class.text-slate-400]="scriptsSubTab() !== 'mine'">
                  📜 我的劇本
                  @if (multiRoleService.scripts().length > 0) {
                    <span class="ml-1.5 px-1.5 py-0.5 bg-purple-500/30 text-purple-300 text-xs rounded-full">
                      {{ multiRoleService.scripts().length }}
                    </span>
                  }
                </button>
                <button (click)="scriptsSubTab.set('presets')"
                        class="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        [class.bg-slate-700]="scriptsSubTab() === 'presets'"
                        [class.text-white]="scriptsSubTab() === 'presets'"
                        [class.text-slate-400]="scriptsSubTab() !== 'presets'">
                  🎬 場景模板
                </button>
              </div>

              <!-- 我的劇本 -->
              @if (scriptsSubTab() === 'mine') {
                <div class="max-w-4xl space-y-5">
                  <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                    <div class="flex items-center justify-between mb-6">
                      <h3 class="font-semibold text-white flex items-center gap-2">
                        <span>📜</span> 我的協作劇本
                      </h3>
                      <div class="flex gap-2">
                        <button (click)="scriptsSubTab.set('presets')"
                                class="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors">
                          從模板創建
                        </button>
                        <button (click)="addScript()"
                                class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
                          + 新建劇本
                        </button>
                      </div>
                    </div>

                    <div class="space-y-4">
                      @for (script of multiRoleService.scripts(); track script.id) {
                        <div class="p-4 bg-slate-700/50 rounded-xl">
                          <div class="flex items-center justify-between mb-3">
                            <div>
                              <div class="font-medium text-white">{{ script.name }}</div>
                              <div class="text-sm text-slate-400">{{ script.description }}</div>
                            </div>
                            <div class="flex items-center gap-2">
                              <span class="px-2 py-1 bg-slate-600 text-slate-300 text-xs rounded">
                                {{ script.stages.length }} 個階段
                              </span>
                              <button (click)="editScript(script)" class="text-purple-400 hover:text-purple-300 text-sm">編輯</button>
                              <button (click)="deleteScript(script)" class="text-red-400 hover:text-red-300 text-sm">刪除</button>
                            </div>
                          </div>
                          @if (script.stages.length > 0) {
                            <div class="flex items-center gap-2 mt-3 flex-wrap">
                              @for (stage of script.stages; track stage.id; let i = $index) {
                                <div class="flex items-center gap-1">
                                  <div class="px-3 py-1.5 bg-slate-600/50 rounded-lg text-xs text-slate-300">{{ stage.name }}</div>
                                  @if (i < script.stages.length - 1) {
                                    <svg class="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                    </svg>
                                  }
                                </div>
                              }
                            </div>
                          }
                          <div class="flex items-center gap-4 mt-3 pt-3 border-t border-slate-600/50 text-xs text-slate-400">
                            <span>使用 {{ script.stats.useCount }} 次</span>
                            <span>成功率 {{ (script.stats.conversionRate * 100).toFixed(0) }}%</span>
                            <span>平均 {{ script.stats.avgDuration }} 分鐘</span>
                          </div>
                        </div>
                      } @empty {
                        <div class="text-center py-10 text-slate-400">
                          <div class="text-4xl mb-3">📜</div>
                          <p class="text-base mb-2">尚未創建劇本</p>
                          <p class="text-sm mb-5">劇本定義角色如何分步驟協作互動</p>
                          <div class="flex gap-3 justify-center">
                            <button (click)="scriptsSubTab.set('presets')"
                                    class="px-5 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors">
                              🎬 選場景模板
                            </button>
                            <button (click)="addScript()"
                                    class="px-5 py-2.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
                              + 空白創建
                            </button>
                          </div>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- 快速使用預設模板 -->
                  @if (multiRoleService.scripts().length > 0) {
                    <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
                      <h4 class="text-sm font-medium text-white mb-4">快速使用預設模板</h4>
                      <div class="grid grid-cols-2 gap-3">
                        <button (click)="useTemplate('high_intent')"
                                class="p-4 bg-slate-700/50 rounded-xl text-left hover:bg-slate-700 transition-colors">
                          <div class="flex items-center gap-3 mb-1.5">
                            <span class="text-2xl">🎯</span>
                            <span class="font-medium text-white text-sm">高意向客戶轉化</span>
                          </div>
                          <p class="text-xs text-slate-400">專家介紹 + 老客戶背書 + 客服促單</p>
                        </button>
                        <button (click)="useTemplate('product_demo')"
                                class="p-4 bg-slate-700/50 rounded-xl text-left hover:bg-slate-700 transition-colors">
                          <div class="flex items-center gap-3 mb-1.5">
                            <span class="text-2xl">📦</span>
                            <span class="font-medium text-white text-sm">產品演示推薦</span>
                          </div>
                          <p class="text-xs text-slate-400">功能展示 + 使用場景 + 效果分享</p>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              }

              <!-- 場景模板 -->
              @if (scriptsSubTab() === 'presets') {
                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <h2 class="text-xl font-bold text-white flex items-center gap-2">
                        <span>🎬</span> 場景模板庫
                      </h2>
                      <p class="text-sm text-slate-400 mt-1">選擇預設場景，自動配置角色和劇本</p>
                    </div>
                  </div>
                  <app-scenario-selector
                    (scenarioApplied)="onScenarioApplied($event)">
                  </app-scenario-selector>
                </div>
              }
            </div>
          }

          <!-- ═══════════════════════════════════════════
               Tab 4: 協作任務 (tasks)
               - 進行中 / 已完成協作群組
               - 啟動新協作的入口
          ══════════════════════════════════════════════ -->
          @case ('tasks') {
            <div class="max-w-4xl mx-auto space-y-5">
              <!-- 操作列 -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-sm text-slate-400">協作任務</span>
                  @if (multiRoleService.activeGroupCount() > 0) {
                    <span class="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                      {{ multiRoleService.activeGroupCount() }} 個進行中
                    </span>
                  }
                </div>
                <button (click)="openAIPlanner()"
                        class="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                  <span>🤖</span> AI 策劃新協作
                </button>
              </div>

              <!-- 就緒檢查（若未配置角色/劇本） -->
              @if (multiRoleService.roles().length === 0 || multiRoleService.availableRoles().length === 0) {
                <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5">
                  <div class="flex items-start gap-3">
                    <span class="text-2xl">⚠️</span>
                    <div class="flex-1">
                      <div class="font-medium text-yellow-400 mb-1">啟動協作前需完成配置</div>
                      <div class="text-sm text-slate-400 mb-3">
                        @if (multiRoleService.roles().length === 0) {
                          <span>尚未添加任何角色。</span>
                        } @else {
                          <span>已有 {{ multiRoleService.roles().length }} 個角色，但沒有綁定帳號的就緒角色。</span>
                        }
                      </div>
                      <div class="flex gap-2">
                        <button (click)="activeTab.set('roles'); rolesSubTab.set('mine')"
                                class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30 transition-colors">
                          🎭 配置角色
                        </button>
                        @if (multiRoleService.roles().length > 0) {
                          <button (click)="goTo('monitoring-accounts')"
                                  class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors">
                            📱 管理帳號綁定
                          </button>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              }

              <!-- 協作任務列表 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div class="text-center py-12 text-slate-400">
                  <div class="text-6xl mb-4">🤝</div>
                  <p class="text-lg mb-2">暫無進行中的協作任務</p>
                  <p class="text-sm mb-6 text-slate-500">
                    @if (multiRoleService.availableRoles().length > 0 && multiRoleService.scripts().length > 0) {
                      您已就緒！點擊「AI 策劃新協作」開始
                    } @else {
                      完成角色和劇本配置後，即可啟動多角色協作
                    }
                  </p>
                  @if (multiRoleService.availableRoles().length > 0) {
                    <button (click)="openAIPlanner()"
                            class="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity">
                      🤖 AI 智能策劃協作
                    </button>
                  }
                </div>
              </div>
            </div>
          }
        }
      </div>
      
      <!-- 添加角色對話框 -->
      @if (showAddRole()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div class="bg-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-xl border border-slate-700 max-h-[90vh] overflow-y-auto">
            <h3 class="text-xl font-bold text-white mb-6">添加角色</h3>
            
            <div class="space-y-4">
              <div>
                <label class="text-sm text-slate-400 block mb-2">角色類型</label>
                <div class="grid grid-cols-3 gap-2">
                  @for (type of roleTypes; track type.id) {
                    <button (click)="newRoleType.set(type.id)"
                            class="p-3 rounded-lg text-center transition-all border-2"
                            [class.border-purple-500]="newRoleType() === type.id"
                            [class.bg-purple-500/10]="newRoleType() === type.id"
                            [class.border-transparent]="newRoleType() !== type.id"
                            [class.bg-slate-700]="newRoleType() !== type.id">
                      <div class="text-2xl mb-1">{{ type.icon }}</div>
                      <div class="text-xs"
                           [class.text-purple-400]="newRoleType() === type.id"
                           [class.text-slate-300]="newRoleType() !== type.id">
                        {{ type.label }}
                      </div>
                    </button>
                  }
                </div>
              </div>
              
              <div>
                <label class="text-sm text-slate-400 block mb-2">角色名稱</label>
                <input type="text"
                       [(ngModel)]="newRoleName"
                       placeholder="如：產品專家 Mira"
                       class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500">
              </div>
              
              <div>
                <label class="text-sm text-slate-400 block mb-2">人設描述</label>
                <textarea rows="3"
                          [(ngModel)]="newRoleDescription"
                          placeholder="描述這個角色的背景和性格..."
                          class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 resize-none">
                </textarea>
              </div>
              
              <div>
                <label class="text-sm text-slate-400 block mb-2">AI 人設 Prompt</label>
                <textarea rows="4"
                          [(ngModel)]="newRolePrompt"
                          placeholder="你是一位..."
                          class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 resize-none">
                </textarea>
              </div>
            </div>
            
            <div class="flex gap-3 mt-6">
              <button (click)="showAddRole.set(false)"
                      class="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors">
                取消
              </button>
              <button (click)="saveNewRole()"
                      class="flex-1 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-400 transition-colors">
                添加
              </button>
            </div>
          </div>
        </div>
      }
      
      <!-- 角色編輯器 -->
      @if (showRoleEditor()) {
        <app-role-editor
          [role]="editingRole()"
          [availableAccounts]="availableAccounts()"
          (saved)="onRoleSaved($event)"
          (cancelled)="onRoleEditorCancelled()">
        </app-role-editor>
      }
      
      <!-- 劇本編輯器 -->
      @if (showScriptEditor()) {
        <app-script-editor
          [script]="editingScript()"
          (saved)="onScriptSaved($event)"
          (cancelled)="onScriptEditorCancelled()">
        </app-script-editor>
      }
      
      <!-- AI 策劃對話框 -->
      @if (showAIPlannerDialog()) {
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div class="bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-purple-500/30 overflow-hidden">
            <!-- 頭部 -->
            <div class="p-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-slate-700/50">
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-bold text-white flex items-center gap-3">
                  <span class="text-2xl">🤖</span>
                  AI 智能策劃
                </h2>
                <button (click)="closeAIPlanner()"
                        class="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg">
                  ✕
                </button>
              </div>
            </div>
            
            <!-- 內容 -->
            <div class="p-6 space-y-6">
              @if (aiPlannerStatus() === 'idle') {
                <!-- 輸入目標 -->
                <div>
                  <label class="text-sm text-slate-400 block mb-2">🎯 告訴 AI 你想達成什麼目標</label>
                  <textarea #goalInput
                            rows="3"
                            [(ngModel)]="aiPlannerGoal"
                            placeholder="例如：把對產品有興趣但還在猶豫的客戶轉化成付費用戶..."
                            class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            (click)="$event.stopPropagation()">
                  </textarea>
                </div>
                
                <!-- 預設目標快捷選擇 -->
                <div>
                  <label class="text-sm text-slate-400 block mb-2">或選擇常見目標</label>
                  <div class="grid grid-cols-2 gap-3">
                    <button (click)="aiPlannerGoal = '把猶豫不決的潛在客戶轉化為付費用戶'"
                            class="p-3 bg-slate-800 rounded-xl text-left hover:bg-slate-700 transition-colors border border-slate-700">
                      <div class="text-lg mb-1">💰</div>
                      <div class="text-sm text-white font-medium">促進首單成交</div>
                      <div class="text-xs text-slate-400">多角色配合促進猶豫客戶下單</div>
                    </button>
                    <button (click)="aiPlannerGoal = '挽回已流失的老客戶，讓他們重新購買'"
                            class="p-3 bg-slate-800 rounded-xl text-left hover:bg-slate-700 transition-colors border border-slate-700">
                      <div class="text-lg mb-1">💝</div>
                      <div class="text-sm text-white font-medium">挽回流失客戶</div>
                      <div class="text-xs text-slate-400">關懷回訪 + 特別優惠</div>
                    </button>
                    <button (click)="aiPlannerGoal = '讓社群更活躍，增加用戶互動和粘性'"
                            class="p-3 bg-slate-800 rounded-xl text-left hover:bg-slate-700 transition-colors border border-slate-700">
                      <div class="text-lg mb-1">🎉</div>
                      <div class="text-sm text-white font-medium">提升社群活躍</div>
                      <div class="text-xs text-slate-400">話題引導 + 互動激勵</div>
                    </button>
                    <button (click)="aiPlannerGoal = '高效處理客戶售後問題，提升滿意度'"
                            class="p-3 bg-slate-800 rounded-xl text-left hover:bg-slate-700 transition-colors border border-slate-700">
                      <div class="text-lg mb-1">🔧</div>
                      <div class="text-sm text-white font-medium">售後問題處理</div>
                      <div class="text-xs text-slate-400">快速響應 + 滿意度跟進</div>
                    </button>
                  </div>
                </div>
              }
              
              @if (aiPlannerStatus() === 'planning') {
                <!-- 策劃中動畫 -->
                <div class="text-center py-8">
                  <div class="inline-block animate-spin text-4xl mb-4">🤖</div>
                  <p class="text-white font-medium">{{ aiPlanningProgress() }}</p>
                  <p class="text-slate-400 text-sm mt-2">分析目標 → 選擇角色 → 設計流程</p>
                  <!-- 🔧 P0: 顯示進度時間 -->
                  @if (aiPlanningElapsed() > 0) {
                    <div class="mt-4 flex items-center justify-center gap-2">
                      <div class="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" 
                             [style.width.%]="Math.min(aiPlanningElapsed() / 45 * 100, 95)"></div>
                      </div>
                      <span class="text-xs text-slate-500">{{ aiPlanningElapsed() }}秒</span>
                    </div>
                  }
                  <p class="text-slate-500 text-xs mt-3">AI 調用可能需要 30-45 秒，請耐心等待</p>
                </div>
              }
              
              @if (aiPlannerStatus() === 'ready' && aiPlanResult()) {
                <!-- 策劃結果 -->
                <div class="space-y-4 max-h-[60vh] overflow-y-auto">
                  <!-- 🔧 P0: 目標分析區塊（新增） -->
                  @if (aiPlanResult()?.goalAnalysis) {
                    <div class="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                      <h4 class="text-sm text-indigo-400 font-medium mb-3 flex items-center gap-2">
                        <span>🎯</span> 目標分析
                      </h4>
                      <div class="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div class="text-slate-500 text-xs mb-1">產品類型</div>
                          <div class="text-white">{{ aiPlanResult()?.goalAnalysis?.productType }}</div>
                        </div>
                        <div>
                          <div class="text-slate-500 text-xs mb-1">目標客戶</div>
                          <div class="text-white">{{ aiPlanResult()?.goalAnalysis?.targetAudience }}</div>
                        </div>
                      </div>
                      @if (aiPlanResult()?.goalAnalysis?.painPoints?.length) {
                        <div class="mt-3">
                          <div class="text-slate-500 text-xs mb-1">客戶痛點</div>
                          <div class="flex flex-wrap gap-2">
                            @for (pain of aiPlanResult()!.goalAnalysis!.painPoints!; track pain) {
                              <span class="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">{{ pain }}</span>
                            }
                          </div>
                        </div>
                      }
                      @if (aiPlanResult()?.goalAnalysis?.keySellingPoints?.length) {
                        <div class="mt-3">
                          <div class="text-slate-500 text-xs mb-1">產品優勢</div>
                          <div class="flex flex-wrap gap-2">
                            @for (point of aiPlanResult()!.goalAnalysis!.keySellingPoints!; track point) {
                              <span class="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">{{ point }}</span>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                  
                  <!-- 策略概述 -->
                  <div class="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2 text-green-400">
                        <span>✓</span>
                        <span class="font-medium">策劃完成！</span>
                      </div>
                      <!-- 🆕 顯示 AI 調用狀態 -->
                      @if (aiPlanningSource() === 'ai') {
                        <span class="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full flex items-center gap-1">
                          🤖 AI 生成
                        </span>
                      } @else if (aiPlanningSource() === 'template') {
                        <span class="px-2 py-1 bg-slate-600/50 text-slate-400 text-xs rounded-full flex items-center gap-1">
                          📋 模板策略
                        </span>
                      }
                    </div>
                    <p class="text-slate-300">{{ aiPlanResult()?.strategy }}</p>
                  </div>
                  
                  <!-- 🔧 群聊協作：場景選擇（用戶主動選擇） -->
                  <div>
                    <h4 class="text-sm text-slate-400 mb-3">🎯 選擇協作場景</h4>
                    <div class="grid grid-cols-2 gap-3">
                      <!-- 私聊模式 -->
                      <button (click)="selectedChatScenario.set('private')"
                              class="p-4 rounded-xl border-2 transition-all text-left"
                              [class.border-blue-500]="selectedChatScenario() === 'private'"
                              [class.bg-blue-500/10]="selectedChatScenario() === 'private'"
                              [class.border-slate-700]="selectedChatScenario() !== 'private'"
                              [class.bg-slate-800]="selectedChatScenario() !== 'private'">
                        <div class="flex items-center gap-2 mb-2">
                          <span class="text-2xl">💬</span>
                          <div>
                            <div class="text-white font-medium">私聊模式</div>
                            <div class="text-xs text-slate-400">1v1 對話</div>
                          </div>
                        </div>
                        <ul class="text-xs text-slate-400 space-y-1 mt-3">
                          <li>• 單一角色與客戶對話</li>
                          <li>• 適合首次接觸、快速篩選</li>
                          <li>• 低成本批量觸達</li>
                        </ul>
                        <div class="mt-3 text-xs text-blue-400">
                          需要帳號：1 個
                        </div>
                      </button>
                      
                      <!-- 群聊協作模式 -->
                      <button (click)="selectedChatScenario.set('group')"
                              class="p-4 rounded-xl border-2 transition-all text-left"
                              [class.border-green-500]="selectedChatScenario() === 'group'"
                              [class.bg-green-500/10]="selectedChatScenario() === 'group'"
                              [class.border-slate-700]="selectedChatScenario() !== 'group'"
                              [class.bg-slate-800]="selectedChatScenario() !== 'group'">
                        <div class="flex items-center gap-2 mb-2">
                          <span class="text-2xl">👥</span>
                          <div>
                            <div class="text-white font-medium">群聊協作</div>
                            <div class="text-xs text-green-400">多角色協同</div>
                          </div>
                        </div>
                        <ul class="text-xs text-slate-400 space-y-1 mt-3">
                          <li>• 建群邀請客戶 + 多角色</li>
                          <li>• 角色分工協作服務</li>
                          <li>• 高轉化深度營銷</li>
                        </ul>
                        <div class="mt-3 text-xs" 
                             [class.text-green-400]="hasEnoughAccounts()"
                             [class.text-amber-400]="!hasEnoughAccounts()">
                          需要帳號：{{ requiredAccountsForGroup() }} 個
                          @if (!hasEnoughAccounts() && selectedChatScenario() === 'group') {
                            <span class="text-red-400">（不足！）</span>
                          }
                        </div>
                      </button>
                    </div>
                    
                    <!-- 群聊模式下的帳號不足提示 -->
                    @if (isGroupChatMode() && !hasEnoughAccounts()) {
                      <div class="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <div class="flex items-center gap-2 text-amber-400 text-sm">
                          <span>⚠️</span>
                          <span>帳號不足！需要 {{ requiredAccountsForGroup() }} 個帳號，當前只有 {{ availableAccountCount() }} 個在線。</span>
                        </div>
                        <button (click)="goToAccountManagement()" 
                                class="mt-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 text-sm">
                          ➕ 添加更多帳號
                        </button>
                      </div>
                    }
                    
                    <!-- 群聊模式流程說明 -->
                    @if (isGroupChatMode() && hasEnoughAccounts()) {
                      <div class="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div class="text-xs text-green-400 font-medium mb-2">🎬 群聊協作流程</div>
                        <div class="flex items-center gap-2 text-xs text-slate-400">
                          <span class="px-2 py-1 bg-slate-700 rounded">① 建群</span>
                          <span>→</span>
                          <span class="px-2 py-1 bg-slate-700 rounded">② 邀請客戶</span>
                          <span>→</span>
                          <span class="px-2 py-1 bg-slate-700 rounded">③ 邀請角色</span>
                          <span>→</span>
                          <span class="px-2 py-1 bg-slate-700 rounded">④ 協作服務</span>
                        </div>
                      </div>
                    }
                  </div>
                  
                  <!-- 🔧 群聊協作：執行模式選擇 -->
                  <div>
                    <h4 class="text-sm text-slate-400 mb-3">⚙️ AI 對話模式</h4>
                    <div class="grid grid-cols-2 gap-3">
                      <button (click)="selectedExecutionMode.set('hybrid')"
                              class="p-3 rounded-lg border transition-all text-left"
                              [class.border-cyan-500]="selectedExecutionMode() === 'hybrid'"
                              [class.bg-cyan-500/10]="selectedExecutionMode() === 'hybrid'"
                              [class.border-slate-700]="selectedExecutionMode() !== 'hybrid'"
                              [class.bg-slate-800]="selectedExecutionMode() !== 'hybrid'">
                        <div class="flex items-center gap-2 mb-1">
                          <span>📋</span>
                          <span class="text-sm text-white font-medium">引導式</span>
                          <span class="px-1.5 py-0.5 bg-cyan-500 text-white text-xs rounded">推薦</span>
                        </div>
                        <p class="text-xs text-slate-400">預設話術 + AI 靈活補充</p>
                      </button>
                      <button (click)="selectedExecutionMode.set('scriptless')"
                              class="p-3 rounded-lg border transition-all text-left"
                              [class.border-pink-500]="selectedExecutionMode() === 'scriptless'"
                              [class.bg-pink-500/10]="selectedExecutionMode() === 'scriptless'"
                              [class.border-slate-700]="selectedExecutionMode() !== 'scriptless'"
                              [class.bg-slate-800]="selectedExecutionMode() !== 'scriptless'">
                        <div class="flex items-center gap-2 mb-1">
                          <span>🤖</span>
                          <span class="text-sm text-white font-medium">純 AI</span>
                        </div>
                        <p class="text-xs text-slate-400">每條消息即時生成</p>
                      </button>
                    </div>
                  </div>
                  
                  <!-- 🆕 目標用戶選擇 -->
                  <div>
                    <h4 class="text-sm text-slate-400 mb-3">👤 選擇營銷目標</h4>
                    <div class="p-3 bg-slate-800 rounded-lg">
                      @if (selectedTargetUsers().length === 0) {
                        <div class="text-center py-4">
                          <div class="text-slate-500 mb-3">請選擇要進行營銷的目標用戶</div>
                          <div class="flex gap-2 justify-center flex-wrap">
                            <button (click)="openTargetUserSelector()"
                                    class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 text-sm">
                              📒 從通訊錄選擇
                            </button>
                            <button (click)="selectHighIntentUsers()"
                                    class="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 text-sm">
                              ⭐ 自動選高意向
                            </button>
                            <button (click)="triggerImportFile()"
                                    class="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 text-sm">
                              📥 批量導入
                            </button>
                          </div>
                          <input #importFileInput type="file" accept=".csv,.txt" (change)="handleImportFile($event)" class="hidden">
                        </div>
                      } @else {
                        <div class="flex items-center justify-between mb-2">
                          <span class="text-emerald-400 text-sm">
                            ✓ 已選擇 {{ selectedTargetUsers().length }} 個目標
                          </span>
                          <div class="flex gap-2">
                            <button (click)="openTargetUserSelector()"
                                    class="text-xs text-slate-400 hover:text-white">
                              修改
                            </button>
                            <button (click)="clearSelectedUsers()"
                                    class="text-xs text-red-400 hover:text-red-300">
                              清空
                            </button>
                          </div>
                        </div>
                        <div class="flex flex-wrap gap-2">
                          @for (user of selectedTargetUsers().slice(0, 5); track user.telegramId) {
                            <span class="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                              {{ user.firstName || user.username || user.telegramId }}
                              <span class="text-amber-400 ml-1">{{ user.intentScore }}分</span>
                            </span>
                          }
                          @if (selectedTargetUsers().length > 5) {
                            <span class="px-2 py-1 bg-slate-600 rounded text-xs text-slate-400">
                              +{{ selectedTargetUsers().length - 5 }} 更多
                            </span>
                          }
                        </div>
                      }
                    </div>
                  </div>
                  
                  <!-- 🆕 P0: 帳號矩陣配置 -->
                  <div class="border border-slate-700/50 rounded-xl overflow-hidden">
                    <button (click)="showAdvancedAccountSettings.set(!showAdvancedAccountSettings())"
                            class="w-full p-3 bg-slate-800/50 flex items-center justify-between hover:bg-slate-800 transition-colors">
                      <div class="flex items-center gap-2">
                        <span>👥</span>
                        <span class="text-sm text-white font-medium">帳號配置</span>
                        @if (plannerAutoAssign()) {
                          <span class="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">AI 自動分配</span>
                        } @else {
                          <span class="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded">
                            已選 {{ plannerSelectedAccounts().length }} 個帳號
                          </span>
                        }
                      </div>
                      <span class="text-slate-400 text-sm">{{ showAdvancedAccountSettings() ? '▲' : '▼' }}</span>
                    </button>
                    
                    @if (showAdvancedAccountSettings()) {
                      <div class="p-4 space-y-4 bg-slate-800/30">
                        <!-- 帳號數量選擇 -->
                        <div>
                          <div class="flex items-center justify-between mb-2">
                            <label class="text-sm text-slate-400">參與帳號數量</label>
                            <div class="flex items-center gap-2">
                              <span class="text-white font-medium">{{ plannerAccountCount() }}</span>
                              <span class="text-xs text-slate-500">/ {{ availableAccountCount() }} 可用</span>
                            </div>
                          </div>
                          <div class="flex items-center gap-3">
                            <input type="range" 
                                   [min]="1" 
                                   [max]="Math.min(5, availableAccountCount())"
                                   [value]="plannerAccountCount()"
                                   (input)="onAccountCountChange($event)"
                                   class="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500">
                            <div class="flex gap-1">
                              @for (n of [1,2,3,4,5]; track n) {
                                <button (click)="plannerAccountCount.set(Math.min(n, availableAccountCount()))"
                                        [class.bg-purple-500]="plannerAccountCount() === n"
                                        [class.text-white]="plannerAccountCount() === n"
                                        [class.bg-slate-700]="plannerAccountCount() !== n"
                                        [class.text-slate-400]="plannerAccountCount() !== n"
                                        [disabled]="n > availableAccountCount()"
                                        class="w-8 h-8 rounded-lg text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed">
                                  {{ n }}
                                </button>
                              }
                            </div>
                          </div>
                          <div class="mt-2 text-xs text-slate-500">
                            🤖 AI 推薦：{{ getRecommendedAccountCount() }} 個帳號（基於目標分析）
                          </div>
                        </div>
                        
                        <!-- 自動/手動切換 -->
                        <div class="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                          <div>
                            <div class="text-sm text-white">AI 自動分配帳號和角色</div>
                            <div class="text-xs text-slate-500">關閉後可手動選擇帳號並指定角色</div>
                          </div>
                          <button (click)="plannerAutoAssign.set(!plannerAutoAssign())"
                                  class="w-12 h-6 rounded-full transition-colors relative"
                                  [class.bg-purple-500]="plannerAutoAssign()"
                                  [class.bg-slate-600]="!plannerAutoAssign()">
                            <span class="absolute top-1 w-4 h-4 bg-white rounded-full transition-all"
                                  [class.left-1]="!plannerAutoAssign()"
                                  [class.left-7]="plannerAutoAssign()"></span>
                          </button>
                        </div>
                        
                        <!-- 手動選擇帳號 -->
                        @if (!plannerAutoAssign()) {
                          <div>
                            <div class="flex items-center justify-between mb-2">
                              <label class="text-sm text-slate-400">選擇帳號（點擊選擇/取消）</label>
                              <div class="flex gap-2">
                                <button (click)="selectAllOnlineAccounts()" 
                                        class="text-xs text-purple-400 hover:text-purple-300">全選在線</button>
                                <button (click)="plannerSelectedAccounts.set([])" 
                                        class="text-xs text-slate-400 hover:text-slate-300">清空</button>
                              </div>
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                              @for (account of accountService.accounts(); track account.id) {
                                @if (account.status === 'Online') {
                                  <button (click)="toggleAccountSelection(account.id)"
                                          class="p-3 rounded-lg border-2 transition-all text-left"
                                          [class.border-purple-500]="plannerSelectedAccounts().includes(account.id)"
                                          [class.bg-purple-500/10]="plannerSelectedAccounts().includes(account.id)"
                                          [class.border-slate-700]="!plannerSelectedAccounts().includes(account.id)"
                                          [class.bg-slate-800]="!plannerSelectedAccounts().includes(account.id)">
                                    <div class="flex items-center gap-2">
                                      <span class="w-2 h-2 bg-green-500 rounded-full"></span>
                                      <span class="text-sm text-white truncate">{{ account.phone }}</span>
                                    </div>
                                    @if (plannerSelectedAccounts().includes(account.id)) {
                                      <!-- 角色選擇下拉框 -->
                                      <div class="mt-2">
                                        <select (click)="$event.stopPropagation()"
                                                (change)="onAccountRoleChange(account.id, $event)"
                                                [value]="plannerAccountRoles().get(account.id) || ''"
                                                class="w-full px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs text-white">
                                          <option value="">🤖 AI 分配角色</option>
                                          @for (role of availableRoleTypes; track role.id) {
                                            <option [value]="role.id">{{ role.icon }} {{ role.name }}</option>
                                          }
                                        </select>
                                      </div>
                                    }
                                  </button>
                                }
                              }
                            </div>
                            @if (plannerSelectedAccounts().length > 0) {
                              <div class="mt-3 p-2 bg-slate-900/50 rounded-lg">
                                <div class="text-xs text-slate-400 mb-1">已選帳號角色預覽：</div>
                                <div class="flex flex-wrap gap-2">
                                  @for (accId of plannerSelectedAccounts(); track accId) {
                                    <span class="px-2 py-1 bg-slate-700 rounded text-xs text-white flex items-center gap-1">
                                      {{ getAccountPhone(accId) }}
                                      <span class="text-purple-400">→</span>
                                      {{ getAssignedRoleName(accId) }}
                                    </span>
                                  }
                                </div>
                              </div>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                  
                  <!-- 🔧 P1 優化：角色分配表格 -->
                  <div>
                    <div class="flex items-center justify-between mb-3">
                      <h4 class="text-sm text-slate-400">👥 角色分配預覽 ({{ getDisplayedRolesCount() }}/{{ plannerAccountCount() }} 帳號)</h4>
                      <!-- 🆕 P2: 說明為何推薦此數量 -->
                      @if (aiPlanResult()?.recommendedRoles?.length !== plannerAccountCount()) {
                        <button (click)="toggleAccountExplanation()"
                                class="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                          💡 為什麼？
                        </button>
                      }
                    </div>
                    
                    <!-- 🆕 P2: 帳號數量說明（可折疊） -->
                    @if (showAccountExplanation()) {
                      <div class="mb-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-sm">
                        <div class="flex items-start gap-2">
                          <span class="text-purple-400">💡</span>
                          <div class="text-slate-300">
                            <p class="mb-1">AI 推薦 <strong class="text-purple-400">{{ aiPlanResult()?.recommendedRoles?.length || 0 }}</strong> 個角色：</p>
                            <ul class="text-xs text-slate-400 space-y-1 ml-4 list-disc">
                              <li>過多帳號可能導致過度曝光，引起用戶警覺</li>
                              <li>角色分工明確，每個角色有獨特作用</li>
                              <li>剩餘帳號可作為備用，隨時替補</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    }
                    
                    <!-- 🔧 P1: 角色分配表格 -->
                    <div class="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                      <table class="w-full text-sm">
                        <thead class="bg-slate-900/50">
                          <tr class="text-slate-400 text-xs">
                            <th class="px-3 py-2 text-left">帳號</th>
                            <th class="px-3 py-2 text-left">角色</th>
                            <th class="px-3 py-2 text-center">狀態</th>
                            <th class="px-3 py-2 text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-700/50">
                          <!-- 已分配的角色 -->
                          @for (role of aiPlanResult()?.recommendedRoles; track $index; let i = $index) {
                            <tr class="hover:bg-slate-700/30">
                              <td class="px-3 py-2">
                                @if (accountMatchResults().length > i) {
                                  <div class="flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <span class="text-white">{{ accountMatchResults()[i].accountPhone }}</span>
                                  </div>
                                } @else {
                                  <span class="text-slate-500 italic">待分配...</span>
                                }
                              </td>
                              <td class="px-3 py-2">
                                <div class="flex items-center gap-2">
                                  <span class="text-lg">{{ role.icon }}</span>
                                  <div>
                                    <div class="text-white">{{ role.name }}</div>
                                    <div class="text-xs text-slate-500">{{ role.purpose }}</div>
                                  </div>
                                </div>
                              </td>
                              <td class="px-3 py-2 text-center">
                                @if (i === 0) {
                                  <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded">主導</span>
                                } @else if (accountMatchResults().length > i) {
                                  <span class="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded">待命</span>
                                } @else {
                                  <span class="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">匹配中</span>
                                }
                              </td>
                              <td class="px-3 py-2 text-right relative">
                                <!-- 🆕 P0: 更換角色下拉選單 -->
                                <div class="relative inline-block">
                                  <button (click)="toggleRoleDropdown(i, $event)"
                                          class="text-xs text-purple-400 hover:text-purple-300 px-2 py-1 hover:bg-purple-500/10 rounded flex items-center gap-1">
                                    更換 
                                    <span [class.rotate-180]="roleChangeModalIndex() === i">▼</span>
                                  </button>
                                  
                                  <!-- 下拉選單 -->
                                  @if (roleChangeModalIndex() === i) {
                                    <div class="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden"
                                         (click)="$event.stopPropagation()">
                                      <div class="px-3 py-2 bg-slate-900/50 border-b border-slate-700">
                                        <span class="text-xs text-slate-400">🔄 選擇新角色</span>
                                      </div>
                                      <div class="max-h-48 overflow-y-auto">
                                        @for (roleType of availableRoleTypes; track roleType.id) {
                                          <button (click)="changeRoleForIndex(i, roleType)"
                                                  [class.bg-purple-500/20]="role.name === roleType.name"
                                                  class="w-full px-3 py-2 text-left hover:bg-slate-700/50 flex items-center gap-2 text-sm">
                                            <span class="text-lg">{{ roleType.icon }}</span>
                                            <div class="flex-1">
                                              <div class="text-white">{{ roleType.name }}</div>
                                              <div class="text-xs text-slate-500">{{ roleType.desc }}</div>
                                            </div>
                                            @if (role.name === roleType.name) {
                                              <span class="text-xs text-purple-400">當前</span>
                                            }
                                          </button>
                                        }
                                      </div>
                                      <div class="border-t border-slate-700">
                                        <button (click)="removeRoleAssignment(i)"
                                                class="w-full px-3 py-2 text-left hover:bg-red-500/10 text-red-400 text-sm flex items-center gap-2">
                                          <span>🗑️</span>
                                          <span>移為備用</span>
                                        </button>
                                      </div>
                                    </div>
                                  }
                                </div>
                              </td>
                            </tr>
                          }
                          
                          <!-- 🆕 P4: 備用帳號（未分配角色的帳號） -->
                          @for (acc of getBackupAccounts(); track acc.id) {
                            <tr class="hover:bg-slate-700/30 opacity-60">
                              <td class="px-3 py-2">
                                <div class="flex items-center gap-2">
                                  <span class="w-2 h-2 rounded-full bg-slate-500"></span>
                                  <span class="text-slate-400">{{ acc.phone }}</span>
                                </div>
                              </td>
                              <td class="px-3 py-2">
                                <span class="text-slate-500 italic">⚪ 備用帳號</span>
                              </td>
                              <td class="px-3 py-2 text-center">
                                <span class="px-2 py-0.5 bg-slate-500/20 text-slate-400 text-xs rounded">閒置</span>
                              </td>
                              <td class="px-3 py-2 text-right relative">
                                <!-- 🆕 P1: 分配備用帳號下拉選單 -->
                                <div class="relative inline-block">
                                  <button (click)="toggleBackupDropdown(acc.id, $event)"
                                          class="text-xs text-slate-400 hover:text-white px-2 py-1 hover:bg-slate-500/10 rounded flex items-center gap-1">
                                    分配 
                                    <span [class.rotate-180]="backupDropdownId() === acc.id">▼</span>
                                  </button>
                                  
                                  <!-- 下拉選單 -->
                                  @if (backupDropdownId() === acc.id) {
                                    <div class="absolute right-0 top-full mt-1 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden"
                                         (click)="$event.stopPropagation()">
                                      <div class="px-3 py-2 bg-slate-900/50 border-b border-slate-700">
                                        <span class="text-xs text-slate-400">📋 分配角色</span>
                                      </div>
                                      <div class="max-h-48 overflow-y-auto">
                                        @for (roleType of availableRoleTypes; track roleType.id) {
                                          <button (click)="assignBackupToRole(acc.id, roleType)"
                                                  class="w-full px-3 py-2 text-left hover:bg-slate-700/50 flex items-center gap-2 text-sm">
                                            <span class="text-lg">{{ roleType.icon }}</span>
                                            <div class="flex-1">
                                              <div class="text-white">{{ roleType.name }}</div>
                                              <div class="text-xs text-slate-500">{{ roleType.desc }}</div>
                                            </div>
                                          </button>
                                        }
                                      </div>
                                      <div class="border-t border-slate-700">
                                        <button (click)="closeBackupDropdown()"
                                                class="w-full px-3 py-2 text-left hover:bg-slate-700/50 text-slate-400 text-sm flex items-center gap-2">
                                          <span>⚪</span>
                                          <span>保持備用</span>
                                        </button>
                                      </div>
                                    </div>
                                  }
                                </div>
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                    
                    <!-- 話術預覽（只顯示第一個角色的開場白） -->
                    @if (aiPlanResult()?.recommendedRoles?.[0]?.openingLine) {
                      <div class="mt-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
                        <div class="text-xs text-slate-500 mb-2">💬 開場白預覽</div>
                        <div class="text-sm text-slate-300 italic">"{{ aiPlanResult()?.recommendedRoles?.[0]?.openingLine }}"</div>
                      </div>
                    }
                    <!-- 🆕 匹配狀態顯示 -->
                    @if (accountMatchResults().length === 0 && !matchFailureReason()) {
                      <div class="mt-3 text-center py-2 text-slate-400 text-sm">
                        <span class="animate-pulse">🔄 正在智能匹配帳號...</span>
                      </div>
                    }
                    
                    <!-- 🆕 匹配失敗引導 -->
                    @if (matchFailureReason()) {
                      <div class="mt-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        @if (matchFailureReason() === 'no_accounts') {
                          <div class="flex items-start gap-3">
                            <span class="text-2xl">⚠️</span>
                            <div>
                              <div class="text-amber-400 font-medium mb-1">無可用帳號</div>
                              <div class="text-sm text-slate-300 mb-3">
                                請先添加 Telegram 帳號並設置為 AI 角色，才能執行多角色協作。
                              </div>
                              <div class="flex gap-2">
                                <button (click)="goToAccountManagement()"
                                        class="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600">
                                  ➕ 添加帳號
                                </button>
                                <button (click)="performAccountMatching()"
                                        class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600">
                                  🔄 重新匹配
                                </button>
                              </div>
                            </div>
                          </div>
                        } @else {
                          <div class="text-amber-400 text-sm">
                            匹配過程出錯，請重試
                            <button (click)="performAccountMatching()" class="ml-2 text-purple-400 hover:text-purple-300">
                              🔄 重新匹配
                            </button>
                          </div>
                        }
                      </div>
                    }
                    
                    <!-- 🆕 一號多角模式提示 -->
                    @if (matchMode() === 'multi-role' && accountMatchResults().length > 0) {
                      <div class="mt-3 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-sm">
                        <div class="flex items-center gap-2 text-cyan-400">
                          <span>🔄</span>
                          <span>一號多角模式已啟用</span>
                        </div>
                        <div class="text-slate-400 mt-1 text-xs">
                          帳號數量不足，同一帳號將輪換扮演多個角色
                        </div>
                      </div>
                    }
                  </div>
                  
                  <!-- 🔧 P1: 建議流程 + 話術預覽（僅劇本/混合模式顯示） -->
                  @if (selectedExecutionMode() !== 'scriptless') {
                    <div>
                      <h4 class="text-sm text-slate-400 mb-3">🎬 執行流程</h4>
                      <div class="space-y-3">
                        @for (step of aiPlanResult()?.suggestedFlow; track step.step) {
                          <div class="p-3 bg-slate-800 rounded-lg border border-slate-700">
                            <div class="flex items-center gap-3">
                              <div class="w-7 h-7 rounded-full bg-purple-500/30 text-purple-400 text-sm flex items-center justify-center font-medium">
                                {{ step.step }}
                              </div>
                              <div class="flex-1">
                                <div class="text-sm text-white">{{ step.action }}</div>
                                <div class="text-xs text-slate-500 mt-0.5">執行者: {{ step.role }}</div>
                              </div>
                            </div>
                            <!-- 🔧 P1: 話術預覽（新增） -->
                            @if (step.scriptPreview) {
                              <div class="mt-2 p-2 bg-slate-900/50 rounded border-l-2 border-cyan-500 ml-10">
                                <div class="text-xs text-slate-500 mb-1">💬 話術預覽</div>
                                <div class="text-sm text-slate-300 italic">"{{ step.scriptPreview }}"</div>
                              </div>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }
                  
                  <!-- 無劇本模式說明 -->
                  @if (selectedExecutionMode() === 'scriptless') {
                    <div class="p-4 bg-pink-500/10 border border-pink-500/30 rounded-xl">
                      <h4 class="text-sm text-pink-400 font-medium mb-2">🤖 無劇本模式特性</h4>
                      <ul class="text-xs text-slate-300 space-y-1">
                        <li>• AI 根據對話上下文即時生成回覆</li>
                        <li>• 每 10 條消息自動分析客戶興趣和情緒</li>
                        <li>• 智能切換角色和調整策略</li>
                        <li>• 檢測到轉化信號自動切換銷售模式</li>
                      </ul>
                    </div>
                  }
                  
                  <!-- 🔧 P1: 預估成功率 + 依據說明 -->
                  <div class="p-3 bg-slate-800 rounded-lg">
                    <div class="flex items-center justify-between">
                      <span class="text-slate-400">預估成功率</span>
                      <span class="text-lg font-bold" 
                            [class.text-green-400]="(aiPlanResult()?.estimatedSuccessRate || 0) >= 70"
                            [class.text-amber-400]="(aiPlanResult()?.estimatedSuccessRate || 0) >= 40 && (aiPlanResult()?.estimatedSuccessRate || 0) < 70"
                            [class.text-red-400]="(aiPlanResult()?.estimatedSuccessRate || 0) < 40">
                        {{ aiPlanResult()?.estimatedSuccessRate }}%
                      </span>
                    </div>
                    @if (aiPlanResult()?.successRateReason) {
                      <div class="mt-2 text-xs text-slate-500 border-t border-slate-700 pt-2">
                        📊 {{ aiPlanResult()?.successRateReason }}
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
            
            <!-- 底部按鈕 -->
            <div class="p-6 border-t border-slate-700/50 flex gap-3">
              @if (aiPlannerStatus() === 'idle') {
                <button (click)="closeAIPlanner()"
                        class="flex-1 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors">
                  取消
                </button>
                <button (click)="startAIPlanning()"
                        [disabled]="!aiPlannerGoal.trim()"
                        class="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                  🤖 開始策劃
                </button>
              }
              @if (aiPlannerStatus() === 'ready') {
                <button (click)="resetAIPlanner()"
                        class="flex-1 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors">
                  重新策劃
                </button>
                <!-- 🔧 群聊協作：根據場景顯示不同按鈕 -->
                @if (isPrivateChatMode()) {
                  <button (click)="applyAIPlan()"
                          class="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity">
                    💬 開始私聊
                  </button>
                } @else {
                  <button (click)="startGroupCollaboration()"
                          [disabled]="!hasEnoughAccounts() || selectedTargetUsers().length === 0"
                          class="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                    @if (groupCreationStatus() === 'creating') {
                      <span class="inline-block animate-spin mr-2">⏳</span> 創建群組中...
                    } @else if (groupCreationStatus() === 'inviting_target') {
                      <span class="inline-block animate-pulse mr-2">📨</span> 邀請客戶中...
                    } @else if (groupCreationStatus() === 'inviting_roles') {
                      <span class="inline-block animate-pulse mr-2">👥</span> 邀請角色中...
                    } @else {
                      👥 開始群聊協作
                    }
                  </button>
                }
              }
            </div>
          </div>
        </div>
      }
      
      <!-- 🆕 目標用戶選擇器對話框 -->
      @if (showTargetUserSelector()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div class="bg-slate-800 rounded-2xl w-full max-w-2xl shadow-xl border border-slate-700 flex flex-col max-h-[80vh]">
            <div class="p-6 border-b border-slate-700/50">
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="text-xl font-bold text-white flex items-center gap-2">
                    <span>👤</span> 選擇營銷目標用戶
                  </h3>
                  <p class="text-slate-400 text-sm mt-1">從發送控制台同步最新的目標客戶數據</p>
                </div>
                <!-- 🆕 P1: 數據同步按鈕 -->
                <button (click)="syncTargetUsersFromSendConsole()"
                        [disabled]="isSyncingTargetUsers()"
                        class="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 disabled:opacity-50 flex items-center gap-1">
                  @if (isSyncingTargetUsers()) {
                    <span class="animate-spin">⟳</span> 同步中...
                  } @else {
                    🔄 同步數據
                  }
                </button>
              </div>
            </div>
            
            <div class="p-4 border-b border-slate-700/50">
              <!-- 搜索框 -->
              <div class="flex gap-3">
                <div class="flex-1 relative">
                  <input type="text"
                         [(ngModel)]="targetUserSearchQuery"
                         placeholder="搜索用戶名、姓名或 Telegram ID..."
                         class="w-full px-4 py-2.5 pr-10 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500"
                         (keyup.enter)="searchTargetUsers()">
                  @if (targetUserSearchQuery) {
                    <button (click)="clearSearchQuery()"
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                      ✕
                    </button>
                  }
                </div>
                <button (click)="searchTargetUsers()"
                        class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 text-sm flex items-center gap-1">
                  🔍 搜索
                </button>
                <button (click)="toggleSelectAll()"
                        class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm">
                  {{ isAllSelected() ? '取消全選' : '全選' }}
                </button>
              </div>
              
              <!-- 快速篩選 -->
              <div class="flex gap-2 mt-3">
                <button (click)="selectHighIntentUsers()"
                        class="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-sm hover:bg-amber-500/30">
                  ⭐ 高意向
                </button>
                <span class="text-slate-500 text-sm flex items-center">
                  已選: {{ selectedTargetUsers().length }} 個
                </span>
              </div>
            </div>
            
            <div class="flex-1 overflow-y-auto p-4">
              @if (filteredTargetUsers().length === 0) {
                <div class="text-center py-8 text-slate-500">
                  <div class="text-4xl mb-3">📭</div>
                  <p>暫無可選用戶</p>
                  <p class="text-sm mt-1">請先從群組提取成員或導入聯繫人</p>
                </div>
              } @else {
                <div class="space-y-2">
                  @for (user of filteredTargetUsers(); track user.telegramId) {
                    <div (click)="toggleTargetUser(user)"
                         class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all"
                         [class.bg-purple-500/20]="isUserSelected(user)"
                         [class.border-purple-500]="isUserSelected(user)"
                         [class.bg-slate-700/50]="!isUserSelected(user)"
                         [class.hover:bg-slate-700]="!isUserSelected(user)"
                         [class.border]="true"
                         [class.border-transparent]="!isUserSelected(user)">
                      <!-- 選中狀態 -->
                      <div class="w-5 h-5 rounded border-2 flex items-center justify-center"
                           [class.bg-purple-500]="isUserSelected(user)"
                           [class.border-purple-500]="isUserSelected(user)"
                           [class.border-slate-500]="!isUserSelected(user)">
                        @if (isUserSelected(user)) {
                          <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                          </svg>
                        }
                      </div>
                      
                      <!-- 頭像 -->
                      <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium">
                        {{ (user.firstName || user.username || '?')[0].toUpperCase() }}
                      </div>
                      
                      <!-- 用戶信息 -->
                      <div class="flex-1">
                        <div class="text-white font-medium">
                          {{ user.firstName || user.username || 'Unknown' }}
                          @if (user.lastName) { {{ user.lastName }} }
                        </div>
                        <div class="text-xs text-slate-400">
                          @if (user.username) { @{{ user.username }} · }
                          ID: {{ user.telegramId }}
                        </div>
                      </div>
                      
                      <!-- 意向分數 -->
                      <div class="text-right">
                        <div class="text-sm font-bold"
                             [class.text-emerald-400]="user.intentScore >= 60"
                             [class.text-amber-400]="user.intentScore >= 40 && user.intentScore < 60"
                             [class.text-slate-400]="user.intentScore < 40">
                          {{ user.intentScore }}分
                        </div>
                        <div class="text-xs text-slate-500">{{ user.source }}</div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
            
            <div class="p-6 border-t border-slate-700/50 flex gap-3">
              <button (click)="closeTargetUserSelector()"
                      class="flex-1 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors">
                取消
              </button>
              <button (click)="confirmTargetUsers()"
                      [disabled]="selectedTargetUsers().length === 0"
                      class="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50">
                確認選擇 ({{ selectedTargetUsers().length }})
              </button>
            </div>
          </div>
        </div>
      }
      
      <!-- 新建劇本對話框 -->
      @if (showNewScriptDialog()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div class="bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-700">
            <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span>📜</span> 新建劇本
            </h3>
            
            <div class="space-y-4">
              <div>
                <label class="text-sm text-slate-400 block mb-2">劇本名稱 *</label>
                <input type="text"
                       [(ngModel)]="newScriptName"
                       placeholder="如：新客戶轉化劇本"
                       class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500">
              </div>
              
              <div>
                <label class="text-sm text-slate-400 block mb-2">劇本描述</label>
                <textarea rows="3"
                          [(ngModel)]="newScriptDescription"
                          placeholder="描述這個劇本的使用場景和目標..."
                          class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 resize-none">
                </textarea>
              </div>
              
              <!-- 快速選擇模板 -->
              <div>
                <label class="text-sm text-slate-400 block mb-2">或從模板創建</label>
                <div class="grid grid-cols-2 gap-2">
                  <button (click)="createFromTemplate('high_intent')"
                          class="p-3 bg-slate-700/50 rounded-lg text-left hover:bg-slate-700 transition-colors">
                    <div class="text-lg mb-1">🎯</div>
                    <div class="text-sm text-white">高意向轉化</div>
                  </button>
                  <button (click)="createFromTemplate('product_demo')"
                          class="p-3 bg-slate-700/50 rounded-lg text-left hover:bg-slate-700 transition-colors">
                    <div class="text-lg mb-1">📦</div>
                    <div class="text-sm text-white">產品演示</div>
                  </button>
                  <button (click)="createFromTemplate('customer_support')"
                          class="p-3 bg-slate-700/50 rounded-lg text-left hover:bg-slate-700 transition-colors">
                    <div class="text-lg mb-1">🔧</div>
                    <div class="text-sm text-white">售後服務</div>
                  </button>
                  <button (click)="createFromTemplate('community')"
                          class="p-3 bg-slate-700/50 rounded-lg text-left hover:bg-slate-700 transition-colors">
                    <div class="text-lg mb-1">🎉</div>
                    <div class="text-sm text-white">社群活躍</div>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="flex gap-3 mt-6">
              <button (click)="cancelAddScript()"
                      class="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors">
                取消
              </button>
              <button (click)="confirmAddScript()"
                      [disabled]="!newScriptName.trim()"
                      class="flex-1 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                創建劇本
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class MultiRoleCenterComponent implements OnInit, OnDestroy {
  @ViewChild('importFileInput') importFileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('goalInput') goalInput?: ElementRef<HTMLTextAreaElement>;
  
  // 🆕 P0: 點擊外部關閉下拉選單
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // 關閉所有下拉選單
    this.roleChangeModalIndex.set(-1);
    this.backupDropdownId.set(-1);
  }
  
  // 🔧 P0: 用於模板中的 Math
  Math = Math;
  
  multiRoleService = inject(MultiRoleService);
  autoGroupService = inject(AutoGroupService);
  executorService = inject(CollaborationExecutorService);
  dynamicEngine = inject(DynamicScriptEngineService);
  orchestrator = inject(CollaborationOrchestratorService);  // 🆕 P1: 協作編排服務
  toast = inject(ToastService);
  contactsService = inject(UnifiedContactsService);
  private accountService = inject(AccountManagementService);
  private ipc = inject(ElectronIpcService);
  private ipcCleanup: (() => void)[] = [];
  
  activeTab = signal<MultiRoleTab>('overview');
  rolesSubTab = signal<'mine' | 'library'>('mine');
  scriptsSubTab = signal<'mine' | 'presets'>('mine');
  showSettings = signal(false);
  showAddRole = signal(false);
  showCreateGroupDialog = signal(false);
  
  // 🆕 目標用戶選擇
  showTargetUserSelector = signal(false);
  selectedTargetUsers = signal<TargetUser[]>([]);
  targetUserSearchQuery = '';
  isSyncingTargetUsers = signal(false);  // 🆕 同步狀態
  
  // 可選的目標用戶列表（從通訊錄）
  availableTargetUsers = computed(() => {
    const contacts = this.contactsService.contacts();
    return contacts
      .filter(c => c.telegram_id) // 只選有 Telegram ID 的
      .map(c => ({
        id: c.id?.toString() || c.telegram_id,
        telegramId: c.telegram_id,
        username: c.username,
        firstName: c.display_name?.split(' ')[0] || c.first_name || c.username,
        lastName: c.display_name?.split(' ')[1] || c.last_name,
        intentScore: this.calculateContactIntent(c),
        source: c.source_type || 'contacts'
      }))
      .sort((a, b) => b.intentScore - a.intentScore); // 高意向優先
  });
  
  // 過濾後的目標用戶
  filteredTargetUsers = computed(() => {
    const query = this.targetUserSearchQuery.toLowerCase().trim();
    const users = this.availableTargetUsers();
    if (!query) return users.slice(0, 50); // 最多顯示 50 個
    return users.filter(u => 
      u.username?.toLowerCase().includes(query) ||
      u.firstName?.toLowerCase().includes(query) ||
      u.telegramId?.includes(query)
    ).slice(0, 50);
  });
  
  // 編輯器狀態
  showRoleEditor = signal(false);
  editingRole = signal<RoleDefinition | null>(null);
  showScriptEditor = signal(false);
  editingScript = signal<ScriptTemplate | null>(null);
  
  tabs = [
    { id: 'overview' as const, icon: '🚀', label: '快速開始' },
    { id: 'roles' as const, icon: '🎭', label: '角色管理' },
    { id: 'scripts' as const, icon: '📜', label: '劇本設計' },
    { id: 'tasks' as const, icon: '🤝', label: '協作任務' }
  ];
  
  roleTypes = Object.entries(ROLE_TYPE_META)
    .filter(([id]) => id !== 'custom')
    .map(([id, meta]) => ({
      id: id as RoleType,
      ...meta
    }));
  
  // 可用帳號
  availableAccounts = computed(() => {
    // 從服務獲取已登錄帳號
    return [];
  });
  
  // 新角色表單
  newRoleType = signal<RoleType>('expert');
  newRoleName = '';
  newRoleDescription = '';
  newRolePrompt = '';
  
  // AI 策劃
  showAIPlannerDialog = signal(false);
  aiPlannerGoal = '';
  aiPlannerStatus = signal<'idle' | 'planning' | 'ready' | 'matching'>('idle');
  
  // 🔧 P0: AI 調用進度反饋
  aiPlanningProgress = signal<string>('AI 正在分析您的目標...');
  aiPlanningElapsed = signal<number>(0);
  
  // 🆕 P0: 帳號矩陣選擇
  plannerAccountCount = signal<number>(3);  // 參與帳號數量（1-5）
  plannerSelectedAccounts = signal<number[]>([]);  // 手動選中的帳號 ID
  plannerAccountRoles = signal<Map<number, string>>(new Map());  // 帳號 -> 角色映射
  plannerAutoAssign = signal<boolean>(true);  // 是否 AI 自動分配
  
  // 🆕 P1/P2: 角色表格相關
  showAccountExplanation = signal<boolean>(false);  // 顯示帳號數量說明
  roleChangeModalIndex = signal<number>(-1);  // 當前正在更換角色的索引
  backupDropdownId = signal<number>(-1);  // 當前打開的備用帳號下拉選單 ID
  
  // 🆕 P0: 草稿保存相關
  private readonly DRAFT_STORAGE_KEY = 'aiPlannerDraft';
  hasDraft = signal<boolean>(false);
  
  // 🆕 P0: 可選角色列表
  availableRoleTypes = [
    { id: 'consultant', name: '支付顧問', icon: '💼', desc: '負責核心營銷' },
    { id: 'expert', name: '技術專家', icon: '🔧', desc: '解答技術問題' },
    { id: 'oldcustomer', name: '老客戶', icon: '👤', desc: '提供真實體驗' },
    { id: 'support', name: '客服', icon: '🎧', desc: '解決售後問題' },
    { id: 'manager', name: '經理', icon: '👔', desc: '處理特殊情況' },
    { id: 'atmosphere', name: '氣氛組', icon: '🎉', desc: '活躍群組氣氛' },
  ];
  
  // 🆕 P0: 展開高級設置
  showAdvancedAccountSettings = signal<boolean>(false);
  
  // 🆕 執行模式選擇
  selectedExecutionMode = signal<'scripted' | 'scriptless' | 'hybrid'>('hybrid');
  
  // 🔧 群聊協作：用戶可選擇聊天場景
  selectedChatScenario = signal<'private' | 'group'>('private');
  
  // 🔧 P0-2: 可用帳號數量（用於充足性檢查）
  availableAccountCount = computed(() => {
    const accounts = this.accountService.accounts();
    return accounts.filter(a => a.status === 'Online').length;
  });
  
  // 🔧 群聊協作：是否為私聊模式（現在由用戶選擇，而非自動判斷）
  isPrivateChatMode = computed(() => {
    return this.selectedChatScenario() === 'private';
  });
  
  // 🔧 群聊協作：是否為群聊模式
  isGroupChatMode = computed(() => {
    return this.selectedChatScenario() === 'group';
  });
  
  // 🔧 群聊協作：群聊模式所需帳號數
  requiredAccountsForGroup = computed(() => {
    return this.aiPlanResult()?.recommendedRoles?.length || 2;
  });
  
  // 🔧 P0-2: 帳號是否充足
  hasEnoughAccounts = computed(() => {
    const available = this.availableAccountCount();
    const required = this.isPrivateChatMode() ? 1 : this.requiredAccountsForGroup();
    return available >= required;
  });
  
  // 🔧 群聊協作：群組創建狀態
  groupCreationStatus = signal<'idle' | 'creating' | 'inviting_target' | 'inviting_roles' | 'ready' | 'error'>('idle');
  groupCreationProgress = signal<string>('');
  createdGroupId = signal<string | null>(null);
  
  // 🆕 帳號匹配結果
  accountMatchResults = signal<{
    roleId: string;
    roleName: string;
    roleIcon: string;
    accountId: number;
    accountPhone: string;
    accountName: string;
    matchScore: number;
    matchReasons: string[];
  }[]>([]);
  
  // 🔧 P0 優化：擴展 AI 策劃結果類型
  aiPlanResult = signal<{
    // 目標分析（新增）
    goalAnalysis?: {
      productType: string;
      targetAudience: string;
      painPoints?: string[];
      keySellingPoints?: string[];
    };
    strategy: string;
    // 推薦角色（擴展 openingLine）
    recommendedRoles: { 
      type: string; 
      name: string; 
      icon: string; 
      purpose: string;
      openingLine?: string;  // 新增：開場白預覽
    }[];
    // 執行流程（擴展 scriptPreview）
    suggestedFlow: { 
      step: number; 
      action: string; 
      role: string;
      scriptPreview?: string;  // 新增：話術預覽
    }[];
    estimatedSuccessRate: number;
    successRateReason?: string;  // 新增：成功率依據
  } | null>(null);
  
  // 設置
  autoGroupNameTemplate = 'VIP專屬服務群 - {客戶名}';
  inviteMessage = '為了更好地服務您，我們特別建立了VIP群！';
  maxConcurrent = 5;
  autoCloseDays = 7;
  intentThreshold = 70;
  minRounds = 3;
  requirePriceInquiry = false;
  useAICenter = true;
  coordinationMode: 'sequential' | 'responsive' = 'sequential';
  
  ngOnInit(): void {
    // 檢查是否有從發送控制台傳來的目標用戶
    this.checkIncomingTargetUsers();
    
    // 監聽 IPC 事件
    this.ipcCleanup.push(
      this.ipc.on('multi-role:open-ai-planner', (data: { targetUsers: TargetUser[] }) => {
        console.log('[MultiRoleCenter] 收到目標用戶:', data.targetUsers?.length);
        if (data.targetUsers && data.targetUsers.length > 0) {
          this.selectedTargetUsers.set(data.targetUsers);
          this.openAIPlanner();
          this.toast.info(`已加載 ${data.targetUsers.length} 個目標用戶`);
        }
      })
    );
  }
  
  ngOnDestroy(): void {
    this.ipcCleanup.forEach(cleanup => cleanup());
  }
  
  /**
   * 檢查並加載從其他頁面傳來的目標用戶
   */
  private checkIncomingTargetUsers(): void {
    const stored = sessionStorage.getItem('multiRoleTargetUsers');
    if (stored) {
      try {
        const targetUsers = JSON.parse(stored) as TargetUser[];
        if (targetUsers.length > 0) {
          this.selectedTargetUsers.set(targetUsers);
          sessionStorage.removeItem('multiRoleTargetUsers');
          
          // 自動打開 AI 策劃對話框
          setTimeout(() => {
            this.openAIPlanner();
            this.toast.info(`已加載 ${targetUsers.length} 個目標用戶，請開始策劃`);
          }, 300);
        }
      } catch (e) {
        console.error('[MultiRoleCenter] 解析目標用戶失敗:', e);
      }
    }
  }
  
  getRoleIcon(type: RoleType): string {
    return ROLE_TYPE_META[type]?.icon || '🎭';
  }
  
  getRoleStyleLabel(style: string): string {
    const labels: Record<string, string> = {
      professional: '專業正式',
      friendly: '友好親切',
      casual: '輕鬆隨意',
      enthusiastic: '熱情',
      careful: '謹慎',
      curious: '好奇'
    };
    return labels[style] || style;
  }
  
  quickAddRole(type: RoleType) {
    const meta = ROLE_TYPE_META[type];
    this.multiRoleService.addRole({
      name: meta.label,
      type,
      personality: {
        description: meta.description,
        speakingStyle: meta.defaultStyle,
        traits: []
      },
      aiConfig: {
        useGlobalAI: true,
        customPrompt: meta.defaultPrompt,
        responseLength: 'medium',
        emojiFrequency: 'low',
        typingSpeed: 'medium'
      },
      responsibilities: []
    });
  }
  
  saveNewRole() {
    const type = this.newRoleType();
    const meta = ROLE_TYPE_META[type];
    
    this.multiRoleService.addRole({
      name: this.newRoleName || meta.label,
      type,
      personality: {
        description: this.newRoleDescription || meta.description,
        speakingStyle: meta.defaultStyle,
        traits: []
      },
      aiConfig: {
        useGlobalAI: true,
        customPrompt: this.newRolePrompt || meta.defaultPrompt,
        responseLength: 'medium',
        emojiFrequency: 'low',
        typingSpeed: 'medium'
      },
      responsibilities: []
    });
    
    this.showAddRole.set(false);
    this.newRoleName = '';
    this.newRoleDescription = '';
    this.newRolePrompt = '';
  }
  
  editRole(role: RoleDefinition) {
    this.editingRole.set(role);
    this.showRoleEditor.set(true);
  }
  
  openNewRoleEditor() {
    this.editingRole.set(null);
    this.showRoleEditor.set(true);
  }
  
  onRoleSaved(role: RoleDefinition) {
    this.showRoleEditor.set(false);
    this.editingRole.set(null);
    this.showAddRole.set(false);
  }
  
  onRoleEditorCancelled() {
    this.showRoleEditor.set(false);
    this.editingRole.set(null);
  }
  
  deleteRole(role: RoleDefinition) {
    if (confirm(`確定要刪除角色「${role.name}」嗎？`)) {
      this.multiRoleService.deleteRole(role.id);
    }
  }
  
  // 劇本編輯
  openNewScriptEditor() {
    this.editingScript.set(null);
    this.showScriptEditor.set(true);
  }
  
  editScript(script: ScriptTemplate) {
    this.editingScript.set(script);
    this.showScriptEditor.set(true);
  }
  
  onScriptSaved(script: ScriptTemplate) {
    this.showScriptEditor.set(false);
    this.editingScript.set(null);
  }
  
  onScriptEditorCancelled() {
    this.showScriptEditor.set(false);
    this.editingScript.set(null);
  }
  
  deleteScript(script: ScriptTemplate) {
    if (confirm(`確定要刪除劇本「${script.name}」嗎？`)) {
      this.multiRoleService.deleteScript(script.id);
    }
  }
  
  // 預設角色和場景處理
  /**
   * 導航到主平台其他頁面
   */
  goTo(view: string): void {
    window.dispatchEvent(new CustomEvent('changeView', { detail: view }));
  }

  onPresetRoleAdded(role: RoleDefinition) {
    this.multiRoleService.addRole({
      name: role.name,
      type: role.type,
      personality: role.personality,
      aiConfig: role.aiConfig,
      responsibilities: role.responsibilities
    });
    // 切換到「我的角色」子標籤查看
    this.activeTab.set('roles');
    this.rolesSubTab.set('mine');
  }
  
  onPresetRoleEdit(preset: any) {
    // 先添加然後打開編輯器
    const roleId = this.multiRoleService.addRole({
      name: preset.name,
      type: preset.type,
      personality: preset.personality,
      aiConfig: preset.aiConfig,
      responsibilities: preset.responsibilities
    });
    if (roleId) {
      // 查找剛添加的角色
      const role = this.multiRoleService.roles().find(r => r.id === roleId);
      if (role) {
        this.editRole(role);
      }
    }
  }
  
  onScenarioApplied(scenario: PresetScenario) {
    // 1. 添加場景中的所有角色
    scenario.roles.forEach(roleConfig => {
      const presetRoles = (window as any).PRESET_ROLES || [];
      const preset = presetRoles.find((r: any) => r.roleType === roleConfig.roleType);
      if (preset) {
        this.multiRoleService.addRole({
          name: preset.name,
          type: preset.type,
          personality: preset.personality,
          aiConfig: preset.aiConfig,
          responsibilities: preset.responsibilities
        });
      }
    });
    
    // 2. 創建對應的劇本
    this.multiRoleService.addScript({
      name: scenario.name,
      description: scenario.description,
      scenario: scenario.type as any
    });
    
    // 3. 切換到「我的劇本」子標籤查看
    this.activeTab.set('scripts');
    this.scriptsSubTab.set('mine');
  }
  
  // 群組操作
  pauseGroup(group: CollaborationGroup) {
    this.autoGroupService.pauseGroup(group.id);
    this.executorService.pauseExecution(group.id);
  }
  
  resumeGroup(group: CollaborationGroup) {
    this.autoGroupService.resumeGroup(group.id);
    this.executorService.resumeExecution(group.id);
  }
  
  markGroupConverted(group: CollaborationGroup) {
    this.autoGroupService.markAsConverted(group.id);
  }
  
  // 新建劇本對話框
  showNewScriptDialog = signal(false);
  newScriptName = '';
  newScriptDescription = '';
  
  addScript() {
    // 打開新建劇本對話框（替代 prompt）
    this.newScriptName = '';
    this.newScriptDescription = '';
    this.showNewScriptDialog.set(true);
  }
  
  confirmAddScript() {
    if (this.newScriptName.trim()) {
      const scriptId = this.multiRoleService.addScript({ 
        name: this.newScriptName.trim(),
        description: this.newScriptDescription.trim()
      });
      this.showNewScriptDialog.set(false);
      // 可選：自動打開劇本編輯器
      if (scriptId) {
        const script = this.multiRoleService.scripts().find(s => s.id === scriptId);
        if (script) {
          this.editScript(script);
        }
      }
    }
  }
  
  cancelAddScript() {
    this.showNewScriptDialog.set(false);
  }
  
  useTemplate(type: string) {
    this.createFromTemplate(type);
  }
  
  createFromTemplate(templateType: string) {
    // 預設劇本模板
    const templates: Record<string, { name: string; description: string; stages: any[] }> = {
      'high_intent': {
        name: '高意向客戶轉化',
        description: '專家介紹 + 老客戶背書 + 客服促單的經典轉化流程',
        stages: [
          { id: 'stage_1', name: '專業介紹', order: 1, trigger: { type: 'manual' as const }, messages: [] },
          { id: 'stage_2', name: '老客戶背書', order: 2, trigger: { type: 'time' as const, delaySeconds: 120 }, messages: [] },
          { id: 'stage_3', name: '促單跟進', order: 3, trigger: { type: 'message' as const }, messages: [] }
        ]
      },
      'product_demo': {
        name: '產品演示推薦',
        description: '功能展示 + 使用場景 + 效果分享的產品推介流程',
        stages: [
          { id: 'stage_1', name: '功能展示', order: 1, trigger: { type: 'manual' as const }, messages: [] },
          { id: 'stage_2', name: '場景應用', order: 2, trigger: { type: 'time' as const, delaySeconds: 180 }, messages: [] },
          { id: 'stage_3', name: '效果見證', order: 3, trigger: { type: 'time' as const, delaySeconds: 120 }, messages: [] }
        ]
      },
      'customer_support': {
        name: '售後問題處理',
        description: '問題記錄 + 技術排查 + 滿意度確認的售後服務流程',
        stages: [
          { id: 'stage_1', name: '問題記錄', order: 1, trigger: { type: 'message' as const }, messages: [] },
          { id: 'stage_2', name: '技術排查', order: 2, trigger: { type: 'time' as const, delaySeconds: 60 }, messages: [] },
          { id: 'stage_3', name: '滿意確認', order: 3, trigger: { type: 'time' as const, delaySeconds: 300 }, messages: [] }
        ]
      },
      'community': {
        name: '社群活躍引導',
        description: '話題發起 + 互動響應 + 價值總結的社群運營流程',
        stages: [
          { id: 'stage_1', name: '話題發起', order: 1, trigger: { type: 'time' as const }, messages: [] },
          { id: 'stage_2', name: '互動響應', order: 2, trigger: { type: 'time' as const, delaySeconds: 60 }, messages: [] },
          { id: 'stage_3', name: '價值總結', order: 3, trigger: { type: 'time' as const, delaySeconds: 300 }, messages: [] }
        ]
      }
    };
    
    const template = templates[templateType];
    if (template) {
      const scriptId = this.multiRoleService.addScript({
        name: template.name,
        description: template.description,
        stages: template.stages
      });
      this.showNewScriptDialog.set(false);
      
      // 自動打開編輯器
      if (scriptId) {
        const script = this.multiRoleService.scripts().find(s => s.id === scriptId);
        if (script) {
          this.editScript(script);
        }
      }
    }
  }
  
  // ========== AI 策劃功能 ==========
  
  openAIPlanner() {
    // 🆕 P0: 嘗試恢復草稿
    const hasStoredDraft = this.restoreDraft();
    
    if (!hasStoredDraft) {
      // 沒有草稿，重置為初始狀態
      this.aiPlannerGoal = '';
      this.plannerAccountCount.set(3);
      this.plannerSelectedAccounts.set([]);
      this.plannerAccountRoles.set(new Map());
      this.plannerAutoAssign.set(true);
    } else {
      this.toast.info('📋 已恢復上次未完成的策劃');
    }
    
    this.aiPlannerStatus.set('idle');
    this.aiPlanResult.set(null);
    this.showAIPlannerDialog.set(true);
    
    // 🆕 P0: 延遲聚焦輸入框，確保對話框已渲染
    setTimeout(() => {
      this.goalInput?.nativeElement?.focus();
    }, 100);
  }
  
  closeAIPlanner() {
    // 🆕 P0: 關閉時保存草稿（如果有內容）
    if (this.aiPlannerGoal.trim() || this.selectedTargetUsers().length > 0) {
      this.saveDraft();
      this.toast.info('💾 草稿已自動保存');
    }
    this.showAIPlannerDialog.set(false);
  }
  
  quickAIPlan(goal: string) {
    this.aiPlannerGoal = goal;
    this.openAIPlanner();
    // 自動開始策劃
    setTimeout(() => this.startAIPlanning(), 100);
  }
  
  // 🆕 AI 調用狀態
  aiPlanningSource = signal<'ai' | 'template' | null>(null);
  
  async startAIPlanning() {
    if (!this.aiPlannerGoal.trim()) return;
    
    this.aiPlannerStatus.set('planning');
    this.aiPlanningSource.set(null);
    
    // 🆕 嘗試調用真正的 AI
    let result = await this.callAIForPlanning(this.aiPlannerGoal);
    
    // 如果 AI 調用失敗，使用模板回退
    if (!result) {
      console.log('[MultiRole] AI 調用失敗，使用模板回退');
      result = this.getFallbackPlanByKeywords(this.aiPlannerGoal);
      this.aiPlanningSource.set('template');
      // 🆕 P1: 顯示明確提示
      this.toast.warning('⚠️ AI 服務暫不可用，已使用智能模板策略');
    } else {
      this.aiPlanningSource.set('ai');
      this.toast.success('🤖 AI 策劃完成！');
    }
    
    this.aiPlanResult.set(result);
    
    // 🆕 P0: AI 規劃完成後自動觸發帳號匹配
    await this.performAccountMatching();
  }
  
  resetAIPlanner() {
    this.aiPlannerStatus.set('idle');
    this.aiPlanResult.set(null);
    this.accountMatchResults.set([]);
    this.aiPlanningSource.set(null);
    // 🆕 P0: 重置帳號選擇
    this.plannerSelectedAccounts.set([]);
    this.plannerAccountRoles.set(new Map());
    this.showAdvancedAccountSettings.set(false);
  }
  
  // 🆕 P0: 帳號數量變更
  onAccountCountChange(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.plannerAccountCount.set(value);
    this.saveDraft();
  }
  
  // 🆕 P0: 切換帳號選擇
  toggleAccountSelection(accountId: number) {
    const current = this.plannerSelectedAccounts();
    const maxCount = this.plannerAccountCount();
    
    if (current.includes(accountId)) {
      // 取消選擇
      this.plannerSelectedAccounts.set(current.filter(id => id !== accountId));
      const roles = new Map(this.plannerAccountRoles());
      roles.delete(accountId);
      this.plannerAccountRoles.set(roles);
    } else {
      // 添加選擇（檢查數量限制）
      if (current.length >= maxCount) {
        this.toast.warning(`最多選擇 ${maxCount} 個帳號`);
        return;
      }
      this.plannerSelectedAccounts.set([...current, accountId]);
    }
    this.saveDraft();
  }
  
  // 🆕 P0: 選擇所有在線帳號
  selectAllOnlineAccounts() {
    const onlineAccounts = this.accountService.accounts()
      .filter(a => a.status === 'Online')
      .slice(0, this.plannerAccountCount())
      .map(a => a.id);
    this.plannerSelectedAccounts.set(onlineAccounts);
    this.saveDraft();
  }
  
  // 🆕 P0: 變更帳號角色
  onAccountRoleChange(accountId: number, event: Event) {
    const roleId = (event.target as HTMLSelectElement).value;
    const roles = new Map(this.plannerAccountRoles());
    if (roleId) {
      roles.set(accountId, roleId);
    } else {
      roles.delete(accountId);
    }
    this.plannerAccountRoles.set(roles);
    this.saveDraft();
  }
  
  // 🆕 P0: 獲取帳號電話
  getAccountPhone(accountId: number): string {
    const account = this.accountService.accounts().find(a => a.id === accountId);
    return account?.phone || '未知';
  }
  
  // 🆕 P0: 獲取分配的角色名稱
  getAssignedRoleName(accountId: number): string {
    const roleId = this.plannerAccountRoles().get(accountId);
    if (!roleId) return '🤖 AI 分配';
    const role = this.availableRoleTypes.find(r => r.id === roleId);
    return role ? `${role.icon} ${role.name}` : '🤖 AI 分配';
  }
  
  // 🆕 P0: 獲取推薦帳號數量
  getRecommendedAccountCount(): number {
    const targetUsers = this.selectedTargetUsers();
    if (targetUsers.length === 0) return 3;
    
    // 根據目標用戶評分推薦
    const avgScore = targetUsers.reduce((sum, u) => sum + u.intentScore, 0) / targetUsers.length;
    if (avgScore >= 80) return Math.min(5, this.availableAccountCount());
    if (avgScore >= 60) return Math.min(4, this.availableAccountCount());
    if (avgScore >= 40) return Math.min(3, this.availableAccountCount());
    return Math.min(2, this.availableAccountCount());
  }
  
  // 🆕 P1: 獲取顯示的角色數量
  getDisplayedRolesCount(): number {
    return this.aiPlanResult()?.recommendedRoles?.length || 0;
  }
  
  // 🆕 P2: 切換帳號數量說明顯示
  toggleAccountExplanation(): void {
    this.showAccountExplanation.set(!this.showAccountExplanation());
  }
  
  // 🆕 P0: 切換角色更換下拉選單
  toggleRoleDropdown(index: number, event: Event): void {
    event.stopPropagation();
    if (this.roleChangeModalIndex() === index) {
      this.roleChangeModalIndex.set(-1);
    } else {
      this.roleChangeModalIndex.set(index);
      this.backupDropdownId.set(-1);  // 關閉其他下拉選單
    }
  }
  
  // 🆕 P0: 更換指定索引的角色
  changeRoleForIndex(index: number, newRoleType: { id: string; name: string; icon: string; desc: string }): void {
    const currentMatches = this.accountMatchResults();
    if (index >= currentMatches.length) {
      this.toast.error('無法更換：帳號未匹配');
      this.roleChangeModalIndex.set(-1);
      return;
    }
    
    // 檢查是否選擇了相同的角色
    if (currentMatches[index].roleName === newRoleType.name) {
      this.roleChangeModalIndex.set(-1);
      return;
    }
    
    // 檢查是否有衝突（其他帳號已使用此角色）
    const conflictIndex = currentMatches.findIndex((m, i) => i !== index && m.roleName === newRoleType.name);
    
    if (conflictIndex >= 0) {
      // 有衝突，執行交換
      const updatedMatches = [...currentMatches];
      const oldRoleName = updatedMatches[index].roleName;
      const oldRoleIcon = updatedMatches[index].roleIcon;
      
      // 交換角色
      updatedMatches[index] = {
        ...updatedMatches[index],
        roleName: newRoleType.name,
        roleIcon: newRoleType.icon,
        roleId: newRoleType.id
      };
      updatedMatches[conflictIndex] = {
        ...updatedMatches[conflictIndex],
        roleName: oldRoleName,
        roleIcon: oldRoleIcon,
        roleId: currentMatches[index].roleId
      };
      
      this.accountMatchResults.set(updatedMatches);
      this.toast.success(`🔄 已交換角色：${newRoleType.name} ↔ ${oldRoleName}`);
    } else {
      // 無衝突，直接更換
      const updatedMatches = [...currentMatches];
      updatedMatches[index] = {
        ...updatedMatches[index],
        roleName: newRoleType.name,
        roleIcon: newRoleType.icon,
        roleId: newRoleType.id
      };
      
      this.accountMatchResults.set(updatedMatches);
      this.toast.success(`✓ 已更換為 ${newRoleType.icon} ${newRoleType.name}`);
    }
    
    // 同時更新 AI 計劃結果中的角色
    this.updateAiPlanRoles();
    
    this.roleChangeModalIndex.set(-1);
    this.saveDraft();
  }
  
  // 🆕 P0: 移除角色分配（移為備用）
  removeRoleAssignment(index: number): void {
    const currentMatches = this.accountMatchResults();
    if (index >= currentMatches.length) return;
    
    const removedAccount = currentMatches[index];
    const updatedMatches = currentMatches.filter((_, i) => i !== index);
    
    this.accountMatchResults.set(updatedMatches);
    this.toast.info(`⚪ ${removedAccount.accountPhone} 已移為備用帳號`);
    
    this.roleChangeModalIndex.set(-1);
    this.saveDraft();
  }
  
  // 🆕 P1: 切換備用帳號下拉選單
  toggleBackupDropdown(accountId: number, event: Event): void {
    event.stopPropagation();
    if (this.backupDropdownId() === accountId) {
      this.backupDropdownId.set(-1);
    } else {
      this.backupDropdownId.set(accountId);
      this.roleChangeModalIndex.set(-1);  // 關閉其他下拉選單
    }
  }
  
  // 🆕 P1: 關閉備用帳號下拉選單
  closeBackupDropdown(): void {
    this.backupDropdownId.set(-1);
  }
  
  // 🆕 P1: 分配備用帳號到角色
  assignBackupToRole(accountId: number, roleType: { id: string; name: string; icon: string; desc: string }): void {
    const accounts = this.accountService.accounts();
    const account = accounts.find(a => a.id === accountId);
    
    if (!account) {
      this.toast.error('找不到帳號');
      this.backupDropdownId.set(-1);
      return;
    }
    
    // 檢查角色是否已被占用
    const currentMatches = this.accountMatchResults();
    const existingIndex = currentMatches.findIndex(m => m.roleName === roleType.name);
    
    if (existingIndex >= 0) {
      // 角色已被占用，詢問是否替換
      const existing = currentMatches[existingIndex];
      if (confirm(`${roleType.name} 已被 ${existing.accountPhone} 使用。\n是否替換？`)) {
        // 替換
        const updatedMatches = [...currentMatches];
        updatedMatches[existingIndex] = {
          roleId: roleType.id,
          roleName: roleType.name,
          roleIcon: roleType.icon,
          accountId: accountId,
          accountPhone: account.phone,
          accountName: account.name || account.phone,
          matchScore: 80,
          matchReasons: ['手動分配']
        };
        this.accountMatchResults.set(updatedMatches);
        this.toast.success(`✓ ${account.phone} 已替換為 ${roleType.icon} ${roleType.name}`);
      }
    } else {
      // 添加新的匹配
      const newMatch = {
        roleId: roleType.id,
        roleName: roleType.name,
        roleIcon: roleType.icon,
        accountId: accountId,
        accountPhone: account.phone,
        accountName: account.name || account.phone,
        matchScore: 80,
        matchReasons: ['手動分配']
      };
      
      this.accountMatchResults.set([...currentMatches, newMatch]);
      this.toast.success(`✓ ${account.phone} 已分配為 ${roleType.icon} ${roleType.name}`);
    }
    
    this.backupDropdownId.set(-1);
    this.saveDraft();
  }
  
  // 🆕 P0: 更新 AI 計劃結果中的角色（同步）
  private updateAiPlanRoles(): void {
    const result = this.aiPlanResult();
    if (!result) return;
    
    const matches = this.accountMatchResults();
    const updatedRoles = matches.map(m => ({
      type: m.roleId,
      name: m.roleName,
      icon: m.roleIcon,
      purpose: result.recommendedRoles?.find(r => r.name === m.roleName)?.purpose || '協助營銷',
      openingLine: result.recommendedRoles?.find(r => r.name === m.roleName)?.openingLine
    }));
    
    this.aiPlanResult.set({
      ...result,
      recommendedRoles: updatedRoles
    });
  }
  
  // 🆕 P4: 獲取備用帳號列表
  getBackupAccounts(): { id: number; phone: string; name: string }[] {
    const result = this.aiPlanResult();
    if (!result) return [];
    
    const roleCount = result.recommendedRoles?.length || 0;
    const accountCount = this.plannerAccountCount();
    
    // 如果用戶選擇的帳號數 > AI 推薦的角色數，顯示備用帳號
    if (accountCount <= roleCount) return [];
    
    const assignedAccountIds = new Set(
      this.accountMatchResults().map(m => m.accountId)
    );
    
    // 獲取未被分配的帳號
    const allAccounts = this.accountService.accounts();
    const backupAccounts = allAccounts
      .filter(a => a.status === 'Online' && !assignedAccountIds.has(a.id))
      .slice(0, accountCount - roleCount)
      .map(a => ({
        id: a.id,
        phone: a.phone,
        name: a.name || a.phone
      }));
    
    return backupAccounts;
  }
  
  
  // 🆕 P0: 保存草稿
  private saveDraft() {
    const draft = {
      goal: this.aiPlannerGoal,
      accountCount: this.plannerAccountCount(),
      selectedAccounts: this.plannerSelectedAccounts(),
      accountRoles: Array.from(this.plannerAccountRoles().entries()),
      autoAssign: this.plannerAutoAssign(),
      targetUsers: this.selectedTargetUsers(),
      chatScenario: this.selectedChatScenario(),
      executionMode: this.selectedExecutionMode(),
      savedAt: Date.now()
    };
    localStorage.setItem(this.DRAFT_STORAGE_KEY, JSON.stringify(draft));
    this.hasDraft.set(true);
  }
  
  // 🆕 P0: 恢復草稿
  private restoreDraft(): boolean {
    try {
      const stored = localStorage.getItem(this.DRAFT_STORAGE_KEY);
      if (!stored) return false;
      
      const draft = JSON.parse(stored);
      // 檢查草稿是否過期（24 小時）
      if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(this.DRAFT_STORAGE_KEY);
        return false;
      }
      
      this.aiPlannerGoal = draft.goal || '';
      this.plannerAccountCount.set(draft.accountCount || 3);
      this.plannerSelectedAccounts.set(draft.selectedAccounts || []);
      this.plannerAccountRoles.set(new Map(draft.accountRoles || []));
      this.plannerAutoAssign.set(draft.autoAssign !== false);
      if (draft.targetUsers?.length > 0) {
        this.selectedTargetUsers.set(draft.targetUsers);
      }
      if (draft.chatScenario) {
        this.selectedChatScenario.set(draft.chatScenario);
      }
      if (draft.executionMode) {
        this.selectedExecutionMode.set(draft.executionMode);
      }
      
      return true;
    } catch (e) {
      console.error('[MultiRole] 恢復草稿失敗:', e);
      return false;
    }
  }
  
  // 🆕 P0: 清除草稿
  clearDraft() {
    localStorage.removeItem(this.DRAFT_STORAGE_KEY);
    this.hasDraft.set(false);
  }
  
  /**
   * 🆕 調用真正的 AI 進行策劃
   */
  private async callAIForPlanning(goal: string): Promise<any> {
    return new Promise((resolve) => {
      // 🔧 P0 優化：重構 Prompt，生成與目標強相關的角色和策略
      const prompt = `你是一位資深的 Telegram 營銷專家。請根據以下營銷目標，設計一個高度針對性的多角色協作策略。

【營銷目標】
${goal}

【分析要求】
1. 首先分析目標，識別：
   - 產品/服務類型
   - 目標客戶群體
   - 客戶可能的痛點和顧慮
   
2. 然後設計針對性角色（每個角色必須與目標產品直接相關）：
   - 角色名稱必須包含產品關鍵詞（如"支付顧問"而非"銷售專員"）
   - 每個角色有明確的分工和話術定位
   
3. 設計開場話術預覽（讓用戶預判執行效果）

【JSON 返回格式】
{
  "goalAnalysis": {
    "productType": "識別的產品類型",
    "targetAudience": "目標客戶描述",
    "painPoints": ["客戶痛點1", "客戶痛點2"],
    "keySellingPoints": ["產品優勢1", "產品優勢2"]
  },
  "strategy": "1-2句話的整體策略",
  "recommendedRoles": [
    {
      "type": "角色類型如consultant/user/analyst",
      "name": "與產品相關的角色名稱",
      "icon": "emoji",
      "purpose": "這個角色的具體作用",
      "openingLine": "這個角色的開場白示例"
    }
  ],
  "suggestedFlow": [
    {"step": 1, "action": "具體行動", "role": "角色名", "scriptPreview": "話術預覽"}
  ],
  "estimatedSuccessRate": 數字,
  "successRateReason": "成功率預估依據"
}

【重要】
- 角色必須與「${goal}」直接相關，不要用通用角色如"內容營銷專家"
- 話術預覽要包含產品關鍵詞
- 如果是支付類產品，角色應該是"支付顧問"、"費率分析師"等
- 如果是教育類產品，角色應該是"課程導師"、"學員代表"等`;

      this.ipc.send('ai:generate-text', {
        prompt,
        maxTokens: 1500,  // 🔧 P0: 增加 token 數以支持更詳細的響應
        responseFormat: 'json',
        callback: 'multi-role:ai-plan-result'
      });
      
      // 🔧 P0 修復: 超時從 15 秒改為 45 秒（AI 調用需要更多時間）
      const AI_TIMEOUT_MS = 45000;
      
      // 🔧 P0: 添加進度更新（同時更新 UI）
      let progressInterval: any = null;
      let elapsedSeconds = 0;
      this.aiPlanningElapsed.set(0);
      this.aiPlanningProgress.set('🔍 AI 正在分析您的目標...');
      
      const progressMessages = [
        '🔍 AI 正在分析您的目標...',
        '🤔 正在識別最佳策略...',
        '👥 正在選擇合適的角色組合...',
        '📋 正在設計執行流程...',
        '⚡ 即將完成，請稍候...',
        '🎯 最後優化中...'
      ];
      
      progressInterval = setInterval(() => {
        elapsedSeconds += 1;
        this.aiPlanningElapsed.set(elapsedSeconds);
        
        // 每 7 秒更換進度消息
        const msgIndex = Math.min(Math.floor(elapsedSeconds / 7), progressMessages.length - 1);
        this.aiPlanningProgress.set(progressMessages[msgIndex]);
        
        if (elapsedSeconds % 5 === 0) {
          console.log(`[MultiRole] AI 處理中... ${elapsedSeconds}秒`);
        }
      }, 1000);
      
      // 設置超時
      const timeout = setTimeout(() => {
        console.log(`[MultiRole] AI 調用超時 (${AI_TIMEOUT_MS / 1000}秒)`);
        if (progressInterval) clearInterval(progressInterval);
        this.aiPlanningProgress.set('⚠️ AI 響應超時，使用智能模板...');
        cleanup();
        resolve(null);
      }, AI_TIMEOUT_MS);
      
      const cleanup = this.ipc.on('multi-role:ai-plan-result', (data: any) => {
        clearTimeout(timeout);
        if (progressInterval) clearInterval(progressInterval);
        this.aiPlanningProgress.set('✅ AI 處理完成！');
        cleanup();
        
        console.log('[MultiRole] 收到 AI 響應:', data);
        
        // 🆕 P1: 更好的錯誤處理
        if (!data.success) {
          console.log('[MultiRole] AI 調用失敗:', data.error);
          resolve(null);
          return;
        }
        
        try {
          // 解析 AI 返回的 JSON
          if (data.text) {
            // 嘗試從文本中提取 JSON
            const jsonMatch = data.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              
              // 🆕 P0: 清理 AI 返回的 icon 欄位（修復 :payment: 等 shortcode）
              if (parsed.recommendedRoles && Array.isArray(parsed.recommendedRoles)) {
                parsed.recommendedRoles = sanitizeRoleIcons(parsed.recommendedRoles);
              }
              
              console.log('[MultiRole] AI 結果解析成功:', parsed);
              resolve(parsed);
              return;
            }
          }
          console.log('[MultiRole] AI 返回內容無法解析為 JSON');
          resolve(null);
        } catch (e) {
          console.error('[MultiRole] AI 結果解析失敗:', e);
          resolve(null);
        }
      });
    });
  }
  
  /**
   * 🆕 根據關鍵詞獲取回退方案（模板）
   */
  private getFallbackPlanByKeywords(goal: string): any {
    const lowerGoal = goal.toLowerCase();
    
    if (lowerGoal.includes('成交') || lowerGoal.includes('付費') || lowerGoal.includes('購買') || lowerGoal.includes('首單')) {
      return {
        strategy: '採用「信任建立 + 價值展示 + 限時促單」三段式策略，通過老客戶背書建立信任，專家展示價值，最後由促銷專員提供限時優惠促成成交。',
        recommendedRoles: [
          { type: 'loyal_customer', name: '老用戶', icon: '❤️', purpose: '分享真實體驗' },
          { type: 'expert', name: '產品專家', icon: '🎓', purpose: '專業價值展示' },
          { type: 'sales', name: '促銷專員', icon: '💰', purpose: '限時優惠促單' }
        ],
        suggestedFlow: [
          { step: 1, action: '老用戶自然分享使用體驗，建立信任', role: '老用戶' },
          { step: 2, action: '產品專家詳細介紹功能和價值', role: '產品專家' },
          { step: 3, action: '根據客戶反饋解答疑慮', role: '產品專家' },
          { step: 4, action: '提供限時優惠，營造緊迫感', role: '促銷專員' }
        ],
        estimatedSuccessRate: 65
      };
    } else if (lowerGoal.includes('流失') || lowerGoal.includes('挽回')) {
      return {
        strategy: '採用「關懷回訪 + 問題解決 + 特別優惠」策略，先表達關心了解離開原因，針對性解決問題，最後提供誠意優惠促進回歸。',
        recommendedRoles: [
          { type: 'callback', name: '回訪專員', icon: '📞', purpose: '真誠關懷回訪' },
          { type: 'support', name: '客服經理', icon: '🎧', purpose: '解決問題' },
          { type: 'director', name: '區域總監', icon: '👑', purpose: '特別挽留' }
        ],
        suggestedFlow: [
          { step: 1, action: '真誠關懷，了解離開原因', role: '回訪專員' },
          { step: 2, action: '針對問題提供解決方案', role: '客服經理' },
          { step: 3, action: '高層出面表達誠意', role: '區域總監' },
          { step: 4, action: '提供專屬回歸優惠', role: '區域總監' }
        ],
        estimatedSuccessRate: 45
      };
    }
    
    // 通用默認方案
    return {
      strategy: '採用「需求了解 + 方案展示 + 跟進服務」通用策略，先了解客戶需求，提供定制化方案，持續跟進直到目標達成。',
      recommendedRoles: [
        { type: 'account_manager', name: '客戶經理', icon: '💼', purpose: '了解需求' },
        { type: 'solution_expert', name: '方案專家', icon: '📋', purpose: '提供方案' }
      ],
      suggestedFlow: [
        { step: 1, action: '了解客戶具體需求和痛點', role: '客戶經理' },
        { step: 2, action: '根據需求提供定制方案', role: '方案專家' },
        { step: 3, action: '解答疑問並持續跟進', role: '客戶經理' }
      ],
      estimatedSuccessRate: 50
    };
  }
  
  // 🆕 匹配狀態信息
  matchFailureReason = signal<string | null>(null);
  matchMode = signal<'normal' | 'multi-role' | 'insufficient'>('normal');
  
  /**
   * 🆕 執行帳號智能匹配（優化版）
   * P0: 自動觸發 + 智能降級 + 失敗引導
   * P1: 匹配前先同步帳號狀態
   */
  async performAccountMatching() {
    const result = this.aiPlanResult();
    if (!result) return;
    
    this.aiPlannerStatus.set('matching');
    this.matchFailureReason.set(null);
    this.matchMode.set('normal');
    
    try {
      // 🆕 P1: 匹配前刷新帳號狀態（確保數據最新）
      await this.syncAccountStatusBeforeMatch();
      
      // 🆕 P0: 檢查是否為手動選擇模式
      if (!this.plannerAutoAssign() && this.plannerSelectedAccounts().length > 0) {
        // 使用用戶手動選擇的帳號和角色
        const manualMatches = this.buildManualAccountMatches(result.recommendedRoles);
        this.accountMatchResults.set(manualMatches);
        
        if (manualMatches.length < result.recommendedRoles.length) {
          this.matchMode.set('multi-role');
          this.toast.info(`📋 已使用手動選擇的 ${manualMatches.length} 個帳號`);
        } else {
          this.toast.success('✓ 已應用手動帳號配置');
        }
        this.aiPlannerStatus.set('ready');
        return;
      }
      
      // 調用動態引擎服務進行智能匹配
      const intent = {
        type: 'sales_conversion' as const,
        confidence: 80,
        goal: this.aiPlannerGoal,
        targetAudience: '潛在客戶',
        urgency: 'medium' as const,
        suggestedDuration: '3-5天'
      };
      
      // 🆕 P0: 根據用戶設置的帳號數量調整推薦角色數量
      const accountCount = this.plannerAccountCount();
      const rolesToMatch = result.recommendedRoles.slice(0, accountCount);
      
      const recommendedRoles = rolesToMatch.map((r, i) => ({
        id: `role_${i}`,
        name: r.name,
        icon: r.icon,
        type: r.type,
        purpose: r.purpose,
        personality: '專業友好',
        speakingStyle: '自然對話',
        entryTiming: '適時切入',
        sampleMessages: ['你好！', '有什麼可以幫您的？']
      }));
      
      // 🆕 優化: 使用增強版匹配（支持降級策略）
      const matches = await this.dynamicEngine.smartMatchAccountsToRolesEnhanced(
        recommendedRoles, 
        intent,
        { allowMultiRole: true, allowOffline: true }
      );
      
      if (matches.length === 0) {
        // 無可用帳號 - 顯示引導
        this.matchFailureReason.set('no_accounts');
        this.accountMatchResults.set([]);
      } else if (matches.length < recommendedRoles.length) {
        // 部分匹配 - 一號多角模式
        this.matchMode.set('multi-role');
        this.accountMatchResults.set(matches.map(m => ({
          roleId: m.roleId,
          roleName: m.roleName,
          roleIcon: m.roleIcon,
          accountId: m.accountId,
          accountPhone: m.accountPhone,
          accountName: m.accountName,
          matchScore: m.matchScore,
          matchReasons: m.matchReasons
        })));
        this.toast.info(`🔄 帳號不足，已啟用一號多角模式（${matches.length} 帳號輪換 ${recommendedRoles.length} 角色）`);
      } else {
        // 完全匹配
        this.accountMatchResults.set(matches.map(m => ({
          roleId: m.roleId,
          roleName: m.roleName,
          roleIcon: m.roleIcon,
          accountId: m.accountId,
          accountPhone: m.accountPhone,
          accountName: m.accountName,
          matchScore: m.matchScore,
          matchReasons: m.matchReasons
        })));
      }
    } catch (error) {
      console.error('[MultiRole] 帳號匹配失敗:', error);
      this.matchFailureReason.set('error');
    }
    
    this.aiPlannerStatus.set('ready');
  }
  
  // 🆕 P0: 構建手動帳號匹配結果
  private buildManualAccountMatches(roles: { type: string; name: string; icon: string; purpose: string }[]) {
    const selectedAccounts = this.plannerSelectedAccounts();
    const accountRoles = this.plannerAccountRoles();
    const accounts = this.accountService.accounts();
    
    const matches: {
      roleId: string;
      roleName: string;
      roleIcon: string;
      accountId: number;
      accountPhone: string;
      accountName: string;
      matchScore: number;
      matchReasons: string[];
    }[] = [];
    
    // 先處理有指定角色的帳號
    const usedAccounts = new Set<number>();
    const usedRoles = new Set<number>();
    
    selectedAccounts.forEach(accId => {
      const assignedRoleId = accountRoles.get(accId);
      if (assignedRoleId) {
        // 找到對應的角色索引
        const roleIndex = roles.findIndex(r => r.type === assignedRoleId || this.availableRoleTypes.find(rt => rt.id === assignedRoleId)?.name === r.name);
        const roleInfo = this.availableRoleTypes.find(r => r.id === assignedRoleId);
        const account = accounts.find(a => a.id === accId);
        
        if (account && roleInfo && !usedRoles.has(roleIndex)) {
          matches.push({
            roleId: `role_${matches.length}`,
            roleName: roleInfo.name,
            roleIcon: roleInfo.icon,
            accountId: accId,
            accountPhone: account.phone,
            accountName: account.phone,
            matchScore: 100,
            matchReasons: ['手動指定']
          });
          usedAccounts.add(accId);
          if (roleIndex >= 0) usedRoles.add(roleIndex);
        }
      }
    });
    
    // 再處理沒有指定角色的帳號（按順序分配剩餘角色）
    let roleIdx = 0;
    selectedAccounts.forEach(accId => {
      if (usedAccounts.has(accId)) return;
      
      // 找下一個未使用的角色
      while (roleIdx < roles.length && usedRoles.has(roleIdx)) {
        roleIdx++;
      }
      
      if (roleIdx < roles.length) {
        const role = roles[roleIdx];
        const account = accounts.find(a => a.id === accId);
        
        if (account) {
          matches.push({
            roleId: `role_${roleIdx}`,
            roleName: role.name,
            roleIcon: role.icon,
            accountId: accId,
            accountPhone: account.phone,
            accountName: account.phone,
            matchScore: 85,
            matchReasons: ['AI 自動分配']
          });
          usedRoles.add(roleIdx);
        }
        roleIdx++;
      }
    });
    
    return matches;
  }
  
  // 🆕 導航到帳號管理
  goToAccountManagement() {
    this.closeAIPlanner();
    this.ipc.send('navigate-to-accounts', {});
  }
  
  /**
   * 🔧 群聊協作：發送命令並等待結果
   * @param command 發送的命令
   * @param resultEvent 等待的結果事件
   * @param payload 數據
   * @param timeoutMs 超時時間
   */
  private sendAndWaitForResult(command: string, resultEvent: string, payload: any, timeoutMs = 30000): Promise<any> {
    return new Promise((resolve) => {
      // 設置超時
      const timeout = setTimeout(() => {
        console.warn(`[MultiRole] ${command} 超時 (${timeoutMs}ms)`);
        cleanup();
        resolve({ success: false, error: '操作超時' });
      }, timeoutMs);
      
      // 監聽結果
      const cleanup = this.ipc.on(resultEvent, (data: any) => {
        clearTimeout(timeout);
        cleanup();
        console.log(`[MultiRole] ${command} 結果:`, data);
        resolve(data);
      });
      
      // 發送命令
      console.log(`[MultiRole] 發送 ${command}:`, payload);
      this.ipc.send(command, payload);
    });
  }
  
  // 🆕 P1: 匹配前同步帳號狀態
  private async syncAccountStatusBeforeMatch(): Promise<void> {
    return new Promise((resolve) => {
      // 發送帳號狀態同步請求到後端
      this.ipc.send('sync-account-status', {});
      
      // 重新加載帳號數據
      this.accountService.loadAccounts();
      
      // 等待數據更新（生產環境應使用 IPC 響應回調）
      setTimeout(() => {
        console.log('[MultiRole] 帳號狀態已同步');
        resolve();
      }, 800);
    });
  }
  
  applyAIPlan() {
    const result = this.aiPlanResult();
    if (!result) return;
    
    const mode = this.selectedExecutionMode();
    
    // 私聊模式：只使用第一個角色
    const rolesToUse = this.isPrivateChatMode() 
      ? result.recommendedRoles.slice(0, 1) 
      : result.recommendedRoles;
    
    // 1. 添加推薦的角色（帶帳號綁定）
    for (let i = 0; i < rolesToUse.length; i++) {
      const roleConfig = rolesToUse[i];
      const match = this.accountMatchResults()[i];
      
      const existingRole = this.multiRoleService.roles().find(r => r.name === roleConfig.name);
      if (!existingRole) {
        this.multiRoleService.addRole({
          name: roleConfig.name,
          type: 'custom',
          boundAccountId: match?.accountId,
          boundAccountPhone: match?.accountPhone,
          personality: {
            description: roleConfig.purpose,
            speakingStyle: 'friendly',
            traits: []
          },
          aiConfig: {
            useGlobalAI: true,
            customPrompt: `你是${roleConfig.name}，負責${roleConfig.purpose}。請用專業但友好的方式與客戶交流。`,
            responseLength: 'medium',
            emojiFrequency: 'low',
            typingSpeed: 'medium'
          },
          responsibilities: [roleConfig.purpose]
        });
      }
    }
    
    // 2. 創建對應的劇本（僅劇本和混合模式）
    if (mode !== 'scriptless') {
      const stages = result.suggestedFlow.map((step, index) => ({
        id: `stage_${index + 1}`,
        name: step.action.substring(0, 20) + '...',
        order: step.step,
        trigger: { type: index === 0 ? 'manual' as const : 'time' as const, delaySeconds: 120 },
        messages: []
      }));
      
      this.multiRoleService.addScript({
        name: `AI 策劃 - ${this.aiPlannerGoal.substring(0, 15)}...`,
        description: result.strategy,
        stages
      });
    }
    
    // 3. 🆕 啟動執行（帶目標用戶）
    const targetUsers = this.selectedTargetUsers();
    this.dynamicEngine.startFromOnePhrase(this.aiPlannerGoal, mode, targetUsers.length > 0 ? targetUsers : undefined).then(async (execution) => {
      if (execution) {
        const targetInfo = targetUsers.length > 0 ? `，目標 ${targetUsers.length} 人` : '';
        this.toast.success(`🚀 私聊模式已就緒！${targetInfo}`);
        
        // 🆕 P1: 為每個目標用戶創建協作會話（增強版營銷流程）
        if (targetUsers.length > 0) {
          const accounts = this.accountMatchResults();
          const mainAccount = accounts[0];
          
          for (const target of targetUsers) {
            const orchestratorRoles: RoleEntryConfig[] = [{
              roleId: mainAccount?.roleId || 'consultant',
              roleName: mainAccount?.roleName || '顧問',
              roleIcon: mainAccount?.roleIcon || '💼',
              accountId: mainAccount?.accountId || 0,
              accountPhone: mainAccount?.accountPhone || '',
              entryOrder: 1,
              entryDelaySeconds: 0,
              entryType: 'opener',
              openingMessage: result.recommendedRoles[0]?.openingLine
            }];
            
            const session = this.orchestrator.createSession({
              targetUserId: target.telegramId || target.id,
              targetUserName: target.firstName || target.username || 'Customer',
              roles: orchestratorRoles,
              rhythm: {
                minIntervalSeconds: 15,
                maxIntervalSeconds: 45,
                waitForUserReply: true,
                userSilenceTimeoutSeconds: 120
              }
            });
            
            await this.orchestrator.startCollaboration(session.id);
            console.log('[MultiRole] 🎯 私聊協作會話已創建:', session.id, target.firstName || target.username);
          }
        }
      }
    });
    
    // 4. 關閉對話框並切換到監控中心
    this.closeAIPlanner();
    this.activeTab.set('dashboard');
    
    // 清空選擇
    this.selectedTargetUsers.set([]);
  }
  
  /**
   * 🔧 群聊協作：開始群組協作流程
   */
  async startGroupCollaboration() {
    const result = this.aiPlanResult();
    if (!result) return;
    
    const targetUsers = this.selectedTargetUsers();
    if (targetUsers.length === 0) {
      this.toast.error('請先選擇目標用戶');
      return;
    }
    
    if (!this.hasEnoughAccounts()) {
      this.toast.error(`帳號不足！需要 ${this.requiredAccountsForGroup()} 個帳號`);
      return;
    }
    
    const mode = this.selectedExecutionMode();
    const accounts = this.accountMatchResults();
    
    // 主帳號（第一個角色的帳號用於建群）
    const mainAccount = accounts[0];
    if (!mainAccount) {
      this.toast.error('沒有可用的主帳號');
      return;
    }
    
    console.log('[MultiRole] 開始群聊協作流程');
    console.log('[MultiRole] 主帳號:', mainAccount.accountPhone);
    console.log('[MultiRole] 目標用戶:', targetUsers.length);
    console.log('[MultiRole] 角色帳號:', accounts.length);
    
    try {
      // Phase 1: 創建群組（使用現有的 create-group 命令）
      this.groupCreationStatus.set('creating');
      this.groupCreationProgress.set('正在創建群組...');
      
      const firstTarget = targetUsers[0];
      const groupName = `VIP服務群 - ${firstTarget.firstName || firstTarget.username || 'Customer'}`;
      
      // 🔧 P1: 使用普通群組（group）而非超級群組（supergroup）
      // 普通群組對成員邀請限制更少，更容易拉人入群
      const createResult = await this.sendAndWaitForResult('create-group', 'create-group-result', {
        name: groupName,
        description: result.strategy,
        type: 'group',  // 使用普通群組
        accountPhone: mainAccount.accountPhone
      });
      
      if (!createResult.success) {
        throw new Error(createResult.error || '創建群組失敗');
      }
      
      const groupId = createResult.groupId || createResult.chatId;
      this.createdGroupId.set(groupId);
      console.log('[MultiRole] 群組創建成功:', groupId);
      
      // Phase 2: 邀請目標用戶（直接拉入群組）
      this.groupCreationStatus.set('inviting_target');
      this.groupCreationProgress.set('正在邀請客戶加入...');
      
      const groupUrl = createResult.groupUrl || '';
      let successInvites = 0;
      let failedInvites = 0;
      
      for (const target of targetUsers) {
        try {
          // 直接將用戶拉入群組
          const inviteResult = await this.sendAndWaitForResult('group:invite-user', 'group:invite-user-result', {
            groupId: groupId,
            groupName: groupName,  // 🆕 P0: 傳遞群名用於記錄操作上下文
            inviterPhone: mainAccount.accountPhone,
            targetUserId: target.telegramId || target.id,
            targetUsername: target.username
          }, 15000);
          
          if (inviteResult.success) {
            successInvites++;
            console.log('[MultiRole] 成功邀請用戶:', target.firstName || target.username);
            
            // 🆕 P1-1: 邀請成功後發送私聊通知，引導用戶到群聊
            try {
              this.ipc.send('send-message', {
                accountPhone: mainAccount.accountPhone,
                userId: target.telegramId || target.id,
                content: `嗨 ${target.firstName || target.username || ''}！我們剛剛為您創建了專屬 VIP 服務群「${groupName}」🎉\n\n群裡有我們的專業團隊，可以更快速地為您解答問題。歡迎到群裡聊！`
              });
              console.log('[MultiRole] 已發送入群通知給:', target.firstName || target.username);
            } catch (notifyError) {
              console.warn('[MultiRole] 發送入群通知失敗:', notifyError);
            }
          } else {
            failedInvites++;
            const errorMsg = inviteResult.error || '未知錯誤';
            console.warn('[MultiRole] 邀請失敗:', errorMsg);
            
            // 🔧 Phase 8: 顯示具體失敗原因
            const userName = target.firstName || target.username || target.id;
            if (errorMsg.includes('PRIVACY') || errorMsg.includes('隱私')) {
              this.toast.warning(`⚠️ ${userName} 的隱私設置不允許邀請，正在發送群邀請連結...`);
            } else if (errorMsg.includes('MUTUAL') || errorMsg.includes('好友')) {
              this.toast.warning(`⚠️ 需要先與 ${userName} 互相添加好友，正在發送群邀請連結...`);
            } else if (errorMsg.includes('FLOOD') || errorMsg.includes('頻繁')) {
              this.toast.error(`❌ 請求過於頻繁，請稍後再試`);
            } else if (errorMsg.includes('未連接')) {
              this.toast.error(`❌ 邀請帳號未連接，請檢查帳號狀態`);
            }
            
            // 🔧 P1: 邀請失敗時發送邀請連結（支持多種錯誤類型）
            if (groupUrl) {
              try {
                this.ipc.send('send-message', {
                  accountPhone: mainAccount.accountPhone,
                  userId: target.telegramId || target.id,
                  content: `您好！誠邀您加入我們的 VIP 專屬服務群：\n${groupUrl}\n\n👆 點擊上方連結即可加入，我們的專業團隊將為您提供一對一服務！`
                });
                console.log('[MultiRole] 已發送邀請連結給:', target.firstName || target.username);
                
                // 🔧 Phase 8: 發送連結成功也算作一種成功
                failedInvites--;  // 減少失敗計數
                successInvites++; // 增加成功計數（發送連結成功）
                
                // 🆕 P0: 通知後端記錄發送邀請連結的操作
                this.ipc.send('record-action', {
                  userId: target.telegramId || target.id,
                  actionType: 'group_invite_link',
                  actionDetails: {
                    group_id: groupId,
                    group_name: groupName,
                    group_url: groupUrl
                  },
                  performedBy: mainAccount.accountPhone
                });
              } catch (sendError) {
                console.warn('[MultiRole] 發送邀請連結失敗:', sendError);
              }
            } else {
              // 沒有群連結可發送
              this.toast.warning(`⚠️ 無法直接邀請 ${userName}，且沒有群邀請連結可發送`);
            }
          }
        } catch (inviteError) {
          failedInvites++;
          console.warn('[MultiRole] 邀請客戶異常:', target, inviteError);
        }
      }
      
      console.log(`[MultiRole] 邀請完成: 成功/已發邀請 ${successInvites}, 失敗 ${failedInvites}`);
      
      // Phase 3: 邀請角色帳號加入群組
      this.groupCreationStatus.set('inviting_roles');
      this.groupCreationProgress.set('正在邀請協作帳號...');
      
      // 跳過第一個帳號（主帳號已經在群組中）
      // 🔧 Phase 8: 添加重試機制
      const MAX_RETRIES = 3;
      const RETRY_DELAY = 3000; // 3秒
      let addedCount = 0;
      
      for (let i = 1; i < accounts.length; i++) {
        const roleAccount = accounts[i];
        let success = false;
        
        for (let attempt = 1; attempt <= MAX_RETRIES && !success; attempt++) {
          try {
            console.log(`[MultiRole] 嘗試添加角色帳號 (${attempt}/${MAX_RETRIES}):`, roleAccount.accountPhone);
            
            const addResult = await this.sendAndWaitForResult('group:add-member', 'group:add-member-result', {
              groupId: groupId,
              adderPhone: mainAccount.accountPhone,
              memberPhone: roleAccount.accountPhone
            }, 15000);
            
            if (addResult.success) {
              console.log('[MultiRole] ✓ 成功添加角色帳號:', roleAccount.accountPhone, roleAccount.roleName);
              success = true;
              addedCount++;
            } else {
              console.warn(`[MultiRole] ⚠ 添加角色帳號失敗 (嘗試 ${attempt}):`, roleAccount.accountPhone, addResult.error);
              
              // 如果不是最後一次嘗試，等待後重試
              if (attempt < MAX_RETRIES) {
                console.log(`[MultiRole] 等待 ${RETRY_DELAY/1000} 秒後重試...`);
                await new Promise(r => setTimeout(r, RETRY_DELAY));
              }
            }
          } catch (addError) {
            console.warn(`[MultiRole] ❌ 添加角色帳號異常 (嘗試 ${attempt}):`, roleAccount.accountPhone, addError);
            
            // 如果不是最後一次嘗試，等待後重試
            if (attempt < MAX_RETRIES) {
              await new Promise(r => setTimeout(r, RETRY_DELAY));
            }
          }
        }
        
        if (!success) {
          this.toast.warning(`⚠️ 無法添加帳號 ${roleAccount.accountPhone} 到群組，將使用現有帳號繼續`);
        }
      }
      
      console.log(`[MultiRole] 📊 角色帳號添加結果: ${addedCount}/${accounts.length - 1} 成功`);
      
      // Phase 4: 發送歡迎消息到群組
      this.groupCreationProgress.set('發送歡迎消息...');
      
      this.ipc.send('send-group-message', {
        resourceId: groupId,
        content: `歡迎加入 VIP 專屬服務群！🎉\n\n我們的專業團隊將為您提供一對一的專屬服務。有任何問題都可以直接在群內提出！`,
        accountPhone: mainAccount.accountPhone
      });
      
      // 🆕 P1-2: 啟動群聊消息監聽，讓多角色在群內回覆
      this.groupCreationProgress.set('啟動協作監聽...');
      
      const roleConfigs = accounts.map((acc, idx) => ({
        phone: acc.accountPhone,
        roleId: acc.roleId || `role_${idx}`,
        roleName: acc.roleName || result.recommendedRoles[idx]?.name || '助手',
        prompt: result.recommendedRoles[idx]?.purpose || '協助服務客戶'
      }));
      
      this.ipc.send('group:monitor-messages', {
        groupId: groupId,
        roles: roleConfigs,
        mainAccountPhone: mainAccount.accountPhone
      });
      
      console.log('[MultiRole] 已啟動群聊監聽，角色數:', roleConfigs.length);
      
      // 添加角色配置
      for (const roleConfig of result.recommendedRoles) {
        const match = accounts.find(a => a.roleName === roleConfig.name);
        const existingRole = this.multiRoleService.roles().find(r => r.name === roleConfig.name);
        if (!existingRole) {
          this.multiRoleService.addRole({
            name: roleConfig.name,
            type: 'custom',
            boundAccountId: match?.accountId,
            boundAccountPhone: match?.accountPhone,
            personality: {
              description: roleConfig.purpose,
              speakingStyle: 'friendly',
              traits: []
            },
            aiConfig: {
              useGlobalAI: true,
              customPrompt: `你是${roleConfig.name}，在群聊中負責${roleConfig.purpose}。請配合其他角色協作服務客戶。`,
              responseLength: 'medium',
              emojiFrequency: 'low',
              typingSpeed: 'medium'
            },
            responsibilities: [roleConfig.purpose]
          });
        }
      }
      
      // 啟動群聊協作引擎
      await this.dynamicEngine.startFromOnePhrase(
        this.aiPlannerGoal, 
        mode, 
        targetUsers,
        { 
          chatScenario: 'group', 
          groupId,
          roleAccounts: accounts 
        }
      );
      
      // 🆕 P1: 使用新的協作編排服務（增強版營銷流程）
      // 使用已定義的 firstTarget 變量
      const orchestratorRoles: RoleEntryConfig[] = accounts.map((acc, idx) => ({
        roleId: acc.roleId || `role_${idx}`,
        roleName: acc.roleName,
        roleIcon: acc.roleIcon || '👤',
        accountId: acc.accountId,
        accountPhone: acc.accountPhone,
        entryOrder: idx + 1,
        entryDelaySeconds: idx === 0 ? 0 : 30 + (idx * 15),  // 主角色立即入場，輔助角色延遲入場
        entryType: idx === 0 ? 'opener' : (idx === 1 ? 'supporter' : 'atmosphere') as 'opener' | 'supporter' | 'atmosphere',
        openingMessage: result.recommendedRoles[idx]?.openingLine
      }));
      
      const session = this.orchestrator.createSession({
        targetUserId: firstTarget.telegramId || firstTarget.id,
        targetUserName: firstTarget.firstName || firstTarget.username || 'Customer',
        groupId,
        roles: orchestratorRoles,
        rhythm: {
          minIntervalSeconds: 20,
          maxIntervalSeconds: 60,
          waitForUserReply: true,
          userSilenceTimeoutSeconds: 180
        }
      });
      
      // 啟動協作流程（角色有序入場）
      await this.orchestrator.startCollaboration(session.id);
      console.log('[MultiRole] 🎯 協作編排服務已啟動，會話ID:', session.id);
      
      this.groupCreationStatus.set('ready');
      this.toast.success(`🎉 群聊協作已啟動！群組: ${groupName}`);
      
      // 關閉對話框並切換到監控中心
      this.closeAIPlanner();
      this.activeTab.set('dashboard');
      
      // 清空選擇
      this.selectedTargetUsers.set([]);
      
    } catch (error: any) {
      console.error('[MultiRole] 群聊協作失敗:', error);
      this.groupCreationStatus.set('error');
      this.toast.error(`群聊協作失敗: ${error.message || error}`);
    }
  }
  
  saveSettings() {
    this.multiRoleService.updateAutoGroupSettings({
      nameTemplate: this.autoGroupNameTemplate,
      inviteMessageTemplate: this.inviteMessage,
      maxConcurrentGroups: this.maxConcurrent,
      autoCloseAfterDays: this.autoCloseDays
    });
    
    this.multiRoleService.updateTriggerConditions({
      intentScoreThreshold: this.intentThreshold,
      minConversationRounds: this.minRounds,
      requirePriceInquiry: this.requirePriceInquiry
    });
    
    this.multiRoleService.updateAISettings({
      useAICenter: this.useAICenter,
      coordinationMode: this.coordinationMode
    });
  }
  
  // ============ 🆕 目標用戶選擇相關方法 ============
  
  /**
   * 計算聯繫人的意向評分
   */
  private calculateContactIntent(contact: UnifiedContact): number {
    let score = 30; // 基礎分
    
    // 根據狀態加分
    if (contact.status === 'replied') score += 30;
    else if (contact.status === 'contacted') score += 15;
    else if (contact.status === 'new') score += 10;
    
    // 根據來源加分
    if (contact.source_type === 'lead') score += 20;
    else if (contact.source_type === 'member') score += 10;
    
    // 根據標籤加分
    if (contact.tags?.includes('高意向')) score += 25;
    else if (contact.tags?.includes('有興趣')) score += 15;
    
    // 有互動記錄加分
    if (contact.last_message_at) score += 10;
    
    return Math.min(100, score);
  }
  
  /**
   * 打開目標用戶選擇器
   */
  openTargetUserSelector() {
    // 🆕 P0: 使用與發送控制台相同的數據源
    this.syncTargetUsersFromSendConsole();
    this.showTargetUserSelector.set(true);
  }
  
  /**
   * 🆕 P1: 從發送控制台同步目標用戶數據
   */
  syncTargetUsersFromSendConsole() {
    if (this.isSyncingTargetUsers()) return;
    
    this.isSyncingTargetUsers.set(true);
    
    // 發送 IPC 事件獲取最新的 leads 數據
    this.ipc.send('get-leads-paginated', {
      page: 1,
      pageSize: 500,
      status: null,
      search: null
    });
    
    // 監聯一次性響應
    const cleanup = this.ipc.on('leads-paginated', (data: { leads: any[], total: number }) => {
      cleanup();
      this.isSyncingTargetUsers.set(false);
      
      if (data.leads && data.leads.length > 0) {
        console.log('[MultiRole] 從發送控制台同步數據:', data.leads.length);
        // 同步到 contactsService
        this.contactsService.importLeadsDirectly(data.leads);
        this.toast.success(`✅ 已同步 ${data.leads.length} 個目標用戶`);
      } else {
        this.toast.warning('⚠️ 發送控制台暫無數據，請先添加目標客戶');
      }
    });
    
    // 超時處理
    setTimeout(() => {
      if (this.isSyncingTargetUsers()) {
        this.isSyncingTargetUsers.set(false);
        this.toast.error('同步超時，請重試');
      }
    }, 10000);
  }
  
  /**
   * 關閉目標用戶選擇器
   */
  closeTargetUserSelector() {
    this.showTargetUserSelector.set(false);
    this.targetUserSearchQuery = '';
  }
  
  /**
   * 切換選中狀態
   */
  toggleTargetUser(user: TargetUser) {
    const current = this.selectedTargetUsers();
    const exists = current.find(u => u.telegramId === user.telegramId);
    
    if (exists) {
      this.selectedTargetUsers.set(current.filter(u => u.telegramId !== user.telegramId));
    } else {
      this.selectedTargetUsers.set([...current, user]);
    }
  }
  
  /**
   * 確認選擇目標用戶
   */
  confirmTargetUsers() {
    const selected = this.selectedTargetUsers();
    if (selected.length === 0) {
      this.toast.warning('請至少選擇一個目標用戶');
      return;
    }
    
    this.toast.success(`已選擇 ${selected.length} 個目標用戶`);
    this.closeTargetUserSelector();
  }
  
  /**
   * 檢查用戶是否被選中
   */
  isUserSelected(user: TargetUser): boolean {
    return this.selectedTargetUsers().some(u => u.telegramId === user.telegramId);
  }
  
  /**
   * 全選/取消全選
   */
  toggleSelectAll() {
    const filtered = this.filteredTargetUsers();
    const allSelected = filtered.every(u => this.isUserSelected(u));
    
    if (allSelected) {
      // 取消選擇當前過濾的用戶
      const filteredIds = new Set(filtered.map(u => u.telegramId));
      this.selectedTargetUsers.set(
        this.selectedTargetUsers().filter(u => !filteredIds.has(u.telegramId))
      );
    } else {
      // 添加所有過濾的用戶
      const currentIds = new Set(this.selectedTargetUsers().map(u => u.telegramId));
      const newUsers = filtered.filter(u => !currentIds.has(u.telegramId));
      this.selectedTargetUsers.set([...this.selectedTargetUsers(), ...newUsers]);
    }
  }
  
  /**
   * 清空選擇
   */
  clearSelectedUsers() {
    this.selectedTargetUsers.set([]);
  }
  
  /**
   * 快速選擇高意向用戶
   */
  selectHighIntentUsers() {
    const highIntent = this.availableTargetUsers().filter(u => u.intentScore >= 60);
    this.selectedTargetUsers.set(highIntent.slice(0, 20)); // 最多 20 個
    this.toast.info(`已選擇 ${this.selectedTargetUsers().length} 個高意向用戶`);
  }
  
  /**
   * 🆕 搜索目標用戶
   */
  searchTargetUsers() {
    // 搜索邏輯已在 filteredTargetUsers computed 中處理
    // 這裡只需確保輸入框有值時自動觸發過濾
    if (this.targetUserSearchQuery.trim()) {
      this.toast.info(`找到 ${this.filteredTargetUsers().length} 個匹配用戶`);
    }
  }
  
  /**
   * 🆕 清除搜索內容
   */
  clearSearchQuery() {
    this.targetUserSearchQuery = '';
  }
  
  /**
   * 🆕 判斷是否全選
   */
  isAllSelected(): boolean {
    const filtered = this.filteredTargetUsers();
    const selected = this.selectedTargetUsers();
    return filtered.length > 0 && filtered.every(u => selected.some(s => s.id === u.id));
  }
  
  // 🆕 批量導入功能
  triggerImportFile() {
    this.importFileInput?.nativeElement?.click();
  }
  
  handleImportFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      this.parseImportFile(content, file.name);
    };
    reader.onerror = () => {
      this.toast.error('讀取文件失敗');
    };
    reader.readAsText(file);
    
    // 清空 input 以允許重新選擇相同文件
    input.value = '';
  }
  
  private parseImportFile(content: string, fileName: string) {
    const lines = content.split('\n').filter(line => line.trim());
    const importedUsers: TargetUser[] = [];
    
    // 跳過標題行（如果看起來像標題）
    let startIndex = 0;
    const firstLine = lines[0]?.toLowerCase() || '';
    if (firstLine.includes('telegram') || firstLine.includes('username') || firstLine.includes('id') || firstLine.includes('用戶')) {
      startIndex = 1;
    }
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // 嘗試解析 CSV 格式 (telegramId, username, firstName, intentScore)
      // 或簡單格式 (每行一個 telegramId 或 username)
      const parts = line.split(',').map(p => p.trim().replace(/"/g, ''));
      
      if (parts.length >= 1) {
        const telegramId = parts[0];
        const username = parts[1] || '';
        const firstName = parts[2] || parts[1] || telegramId;
        const intentScore = parseInt(parts[3]) || 50; // 默認意向分 50
        
        // 驗證 telegramId（數字或 @username）
        if (telegramId && (telegramId.match(/^\d+$/) || telegramId.startsWith('@'))) {
          importedUsers.push({
            id: telegramId,
            telegramId: telegramId.startsWith('@') ? '' : telegramId,
            username: telegramId.startsWith('@') ? telegramId.slice(1) : username,
            firstName: firstName,
            lastName: '',
            intentScore: intentScore,
            source: 'import'
          });
        }
      }
    }
    
    if (importedUsers.length === 0) {
      this.toast.error('未能從文件中解析出有效用戶');
      return;
    }
    
    // 合併到已選用戶（去重）
    const current = this.selectedTargetUsers();
    const existingIds = new Set(current.map(u => u.telegramId || u.id));
    const newUsers = importedUsers.filter(u => !existingIds.has(u.telegramId || u.id));
    
    this.selectedTargetUsers.set([...current, ...newUsers]);
    this.toast.success(`📥 已導入 ${newUsers.length} 個用戶（共 ${this.selectedTargetUsers().length} 個）`);
  }
}
