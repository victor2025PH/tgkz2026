/**
 * 多角色協作中心組件
 * Multi-Role Collaboration Center Component
 */

import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiRoleService } from './multi-role.service';
import { AutoGroupService } from './auto-group.service';
import { CollaborationExecutorService } from './collaboration-executor.service';
import { RoleEditorComponent } from './components/role-editor.component';
import { ScriptEditorComponent } from './components/script-editor.component';
import { CollaborationDashboardComponent } from './components/collaboration-dashboard.component';
import { RoleLibraryComponent } from './components/role-library.component';
import { ScenarioSelectorComponent } from './components/scenario-selector.component';
import { 
  RoleDefinition, 
  ScriptTemplate, 
  CollaborationGroup,
  RoleType,
  ROLE_TYPE_META
} from './multi-role.models';
import { PresetScenario } from './preset-scenarios';

type MultiRoleTab = 'dashboard' | 'library' | 'roles' | 'scenarios' | 'scripts' | 'groups' | 'settings';

@Component({
  selector: 'app-multi-role-center',
  standalone: true,
  imports: [CommonModule, FormsModule, RoleEditorComponent, ScriptEditorComponent, CollaborationDashboardComponent, RoleLibraryComponent, ScenarioSelectorComponent],
  template: `
    <div class="multi-role-center h-full flex flex-col bg-slate-900">
      <!-- 頂部標題欄 -->
      <div class="p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold text-white flex items-center gap-3">
              <span class="text-2xl">👥</span>
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
          @case ('dashboard') {
            <!-- 監控儀表板 + AI 策劃入口 -->
            <div class="space-y-6">
              <!-- AI 一鍵策劃卡片 -->
              <div class="bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-cyan-500/20 rounded-2xl border border-purple-500/30 p-6">
                <div class="flex items-center justify-between">
                  <div>
                    <h2 class="text-xl font-bold text-white flex items-center gap-3">
                      <span class="text-2xl">🤖</span>
                      AI 智能策劃
                      <span class="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded-full">NEW</span>
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
              
              <!-- 原有的監控儀表板 -->
              <app-collaboration-dashboard></app-collaboration-dashboard>
            </div>
          }
          
          @case ('library') {
            <!-- 角色庫 (50個預設角色) -->
            <app-role-library 
              (roleAdded)="onPresetRoleAdded($event)"
              (roleEdit)="onPresetRoleEdit($event)">
            </app-role-library>
          }
          
          @case ('scenarios') {
            <!-- 場景模板 (10個預設場景) -->
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-xl font-bold text-white flex items-center gap-2">
                    <span>🎬</span> 場景模板庫
                  </h2>
                  <p class="text-sm text-slate-400 mt-1">10個預設場景，快速啟動多角色協作</p>
                </div>
              </div>
              <app-scenario-selector 
                (scenarioApplied)="onScenarioApplied($event)">
              </app-scenario-selector>
            </div>
          }
          
          @case ('roles') {
            <!-- 角色管理 -->
            <div class="max-w-4xl mx-auto space-y-6">
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div class="flex items-center justify-between mb-6">
                  <h3 class="font-semibold text-white flex items-center gap-2">
                    <span>🎭</span> 角色定義
                  </h3>
                  <button (click)="showAddRole.set(true)"
                          class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
                    + 添加角色
                  </button>
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
                        <button (click)="deleteRole(role)"
                                class="text-slate-500 hover:text-red-400">
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
                      <p class="text-sm mb-4">創建角色來組建多角色協作團隊</p>
                      <button (click)="showAddRole.set(true)"
                              class="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-400 transition-colors">
                        + 創建第一個角色
                      </button>
                    </div>
                  }
                </div>
              </div>
              
              <!-- 快速添加角色 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h4 class="text-sm font-medium text-white mb-4">快速添加預設角色</h4>
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
            </div>
          }
          
          @case ('scripts') {
            <!-- 劇本編排 -->
            <div class="max-w-4xl mx-auto space-y-6">
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div class="flex items-center justify-between mb-6">
                  <h3 class="font-semibold text-white flex items-center gap-2">
                    <span>📜</span> 協作劇本
                  </h3>
                  <button (click)="addScript()"
                          class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
                    + 新建劇本
                  </button>
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
                          <button (click)="editScript(script)"
                                  class="text-purple-400 hover:text-purple-300 text-sm">
                            編輯
                          </button>
                          <button (click)="deleteScript(script)"
                                  class="text-red-400 hover:text-red-300 text-sm">
                            刪除
                          </button>
                        </div>
                      </div>
                      
                      <!-- 劇本階段預覽 -->
                      @if (script.stages.length > 0) {
                        <div class="flex items-center gap-2 mt-3">
                          @for (stage of script.stages; track stage.id; let i = $index) {
                            <div class="flex items-center gap-2">
                              <div class="px-3 py-1.5 bg-slate-600/50 rounded-lg text-xs text-slate-300">
                                {{ stage.name }}
                              </div>
                              @if (i < script.stages.length - 1) {
                                <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                </svg>
                              }
                            </div>
                          }
                        </div>
                      }
                      
                      <!-- 統計 -->
                      <div class="flex items-center gap-4 mt-3 pt-3 border-t border-slate-600/50 text-xs text-slate-400">
                        <span>使用 {{ script.stats.useCount }} 次</span>
                        <span>成功率 {{ (script.stats.conversionRate * 100).toFixed(0) }}%</span>
                        <span>平均 {{ script.stats.avgDuration }} 分鐘</span>
                      </div>
                    </div>
                  } @empty {
                    <div class="text-center py-8 text-slate-400">
                      <div class="text-4xl mb-2">📜</div>
                      <p>尚未創建劇本</p>
                      <button (click)="addScript()"
                              class="mt-3 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg">
                        + 創建劇本
                      </button>
                    </div>
                  }
                </div>
              </div>
              
              <!-- 預設劇本模板 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h4 class="text-sm font-medium text-white mb-4">使用預設模板</h4>
                <div class="grid grid-cols-2 gap-4">
                  <button (click)="useTemplate('high_intent')"
                          class="p-4 bg-slate-700/50 rounded-xl text-left hover:bg-slate-700 transition-colors">
                    <div class="flex items-center gap-3 mb-2">
                      <span class="text-2xl">🎯</span>
                      <span class="font-medium text-white">高意向客戶轉化</span>
                    </div>
                    <p class="text-sm text-slate-400">專家介紹 + 老客戶背書 + 客服促單</p>
                  </button>
                  <button (click)="useTemplate('product_demo')"
                          class="p-4 bg-slate-700/50 rounded-xl text-left hover:bg-slate-700 transition-colors">
                    <div class="flex items-center gap-3 mb-2">
                      <span class="text-2xl">📦</span>
                      <span class="font-medium text-white">產品演示推薦</span>
                    </div>
                    <p class="text-sm text-slate-400">功能展示 + 使用場景 + 效果分享</p>
                  </button>
                </div>
              </div>
            </div>
          }
          
          @case ('groups') {
            <!-- 協作群組 -->
            <div class="max-w-4xl mx-auto space-y-6">
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <div class="flex items-center justify-between mb-6">
                  <h3 class="font-semibold text-white flex items-center gap-2">
                    <span>🏠</span> 協作群組
                  </h3>
                  <button class="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
                    + 手動創建
                  </button>
                </div>
                
                @if (multiRoleService.roles().length === 0) {
                  <div class="text-center py-12 text-slate-400">
                    <div class="text-5xl mb-4">🏠</div>
                    <p class="text-lg mb-2">暫無協作群組</p>
                    <p class="text-sm mb-4">當觸發多角色協作時，系統會自動建立協作群組</p>
                    <p class="text-xs text-slate-500">💡 提示：先在「我的角色」中添加角色並綁定帳號</p>
                  </div>
                } @else {
                  <div class="text-center py-12 text-slate-400">
                    <div class="text-5xl mb-4">🏠</div>
                    <p class="text-lg mb-2">暫無協作群組</p>
                    <p class="text-sm mb-4">您已有 {{ multiRoleService.roles().length }} 個角色就緒</p>
                    <button (click)="showCreateGroupDialog.set(true)"
                            class="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-400 transition-colors">
                      + 創建協作群組
                    </button>
                  </div>
                }
              </div>
            </div>
          }
          
          @case ('settings') {
            <!-- 設置 -->
            <div class="max-w-3xl mx-auto space-y-6">
              <!-- 自動建群設置 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 class="font-semibold text-white mb-6 flex items-center gap-2">
                  <span>⚙️</span> 自動建群設置
                </h3>
                
                <div class="space-y-4">
                  <div>
                    <label class="text-sm text-slate-400 block mb-2">群名模板</label>
                    <input type="text" 
                           [(ngModel)]="autoGroupNameTemplate"
                           placeholder="VIP專屬服務群 - &#123;客戶名&#125;"
                           class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500">
                    <p class="text-xs text-slate-500 mt-1">可用變量: {{ '{' }}客戶名{{ '}' }}</p>
                  </div>
                  
                  <div>
                    <label class="text-sm text-slate-400 block mb-2">邀請話術</label>
                    <textarea rows="3"
                              [(ngModel)]="inviteMessage"
                              placeholder="為了更好地服務您..."
                              class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 resize-none">
                    </textarea>
                  </div>
                  
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="text-sm text-slate-400 block mb-2">最大同時協作數</label>
                      <input type="number" 
                             [(ngModel)]="maxConcurrent"
                             min="1" max="20"
                             class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white">
                    </div>
                    <div>
                      <label class="text-sm text-slate-400 block mb-2">自動關閉天數</label>
                      <input type="number"
                             [(ngModel)]="autoCloseDays"
                             min="1" max="30"
                             class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white">
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 觸發條件 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 class="font-semibold text-white mb-6 flex items-center gap-2">
                  <span>🎯</span> 默認觸發條件
                </h3>
                
                <div class="space-y-4">
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="text-sm text-slate-400 block mb-2">意向評分閾值</label>
                      <div class="flex items-center gap-2">
                        <input type="range" 
                               [(ngModel)]="intentThreshold"
                               min="50" max="100" step="5"
                               class="flex-1">
                        <span class="text-white w-12 text-right">{{ intentThreshold }}%</span>
                      </div>
                    </div>
                    <div>
                      <label class="text-sm text-slate-400 block mb-2">最少對話輪數</label>
                      <input type="number"
                             [(ngModel)]="minRounds"
                             min="1" max="20"
                             class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white">
                    </div>
                  </div>
                  
                  <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer">
                    <div>
                      <div class="text-white">需要詢問過價格</div>
                      <div class="text-xs text-slate-400">只有詢問過價格的客戶才觸發</div>
                    </div>
                    <input type="checkbox"
                           [(ngModel)]="requirePriceInquiry"
                           class="w-5 h-5 rounded text-purple-500 bg-slate-700 border-slate-600">
                  </label>
                </div>
              </div>
              
              <!-- AI 設置 -->
              <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
                <h3 class="font-semibold text-white mb-6 flex items-center gap-2">
                  <span>🤖</span> AI 設置
                </h3>
                
                <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer mb-4">
                  <div>
                    <div class="text-white">使用 AI 中心配置</div>
                    <div class="text-xs text-slate-400">從 AI 中心獲取模型和知識庫配置</div>
                  </div>
                  <input type="checkbox"
                         [(ngModel)]="useAICenter"
                         class="w-5 h-5 rounded text-purple-500 bg-slate-700 border-slate-600">
                </label>
                
                <div>
                  <label class="text-sm text-slate-400 block mb-2">協作模式</label>
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
              
              <!-- 保存按鈕 -->
              <button (click)="saveSettings()"
                      class="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity font-medium">
                保存設置
              </button>
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
                  <textarea rows="3"
                            [(ngModel)]="aiPlannerGoal"
                            placeholder="例如：把對產品有興趣但還在猶豫的客戶轉化成付費用戶..."
                            class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
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
                  <p class="text-white font-medium">AI 正在為您策劃最佳方案...</p>
                  <p class="text-slate-400 text-sm mt-2">分析目標 → 選擇角色 → 設計流程</p>
                </div>
              }
              
              @if (aiPlannerStatus() === 'ready' && aiPlanResult()) {
                <!-- 策劃結果 -->
                <div class="space-y-4">
                  <div class="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <div class="flex items-center gap-2 text-green-400 mb-2">
                      <span>✓</span>
                      <span class="font-medium">策劃完成！</span>
                    </div>
                    <p class="text-slate-300">{{ aiPlanResult()?.strategy }}</p>
                  </div>
                  
                  <!-- 推薦角色 -->
                  <div>
                    <h4 class="text-sm text-slate-400 mb-3">📋 推薦角色組合</h4>
                    <div class="grid grid-cols-3 gap-3">
                      @for (role of aiPlanResult()?.recommendedRoles; track role.type) {
                        <div class="p-3 bg-slate-800 rounded-lg text-center">
                          <div class="text-2xl mb-1">{{ role.icon }}</div>
                          <div class="text-sm text-white font-medium">{{ role.name }}</div>
                          <div class="text-xs text-slate-400">{{ role.purpose }}</div>
                        </div>
                      }
                    </div>
                  </div>
                  
                  <!-- 建議流程 -->
                  <div>
                    <h4 class="text-sm text-slate-400 mb-3">🎬 執行流程</h4>
                    <div class="space-y-2">
                      @for (step of aiPlanResult()?.suggestedFlow; track step.step) {
                        <div class="flex items-center gap-3 p-2 bg-slate-800 rounded-lg">
                          <div class="w-6 h-6 rounded-full bg-purple-500/30 text-purple-400 text-sm flex items-center justify-center">
                            {{ step.step }}
                          </div>
                          <div class="flex-1 text-sm text-slate-300">{{ step.action }}</div>
                          <div class="text-xs text-slate-500">{{ step.role }}</div>
                        </div>
                      }
                    </div>
                  </div>
                  
                  <!-- 預估成功率 -->
                  <div class="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <span class="text-slate-400">預估成功率</span>
                    <span class="text-lg font-bold text-green-400">{{ aiPlanResult()?.estimatedSuccessRate }}%</span>
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
                <button (click)="applyAIPlan()"
                        class="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity">
                  ✓ 應用方案
                </button>
              }
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
export class MultiRoleCenterComponent {
  multiRoleService = inject(MultiRoleService);
  autoGroupService = inject(AutoGroupService);
  executorService = inject(CollaborationExecutorService);
  
  activeTab = signal<MultiRoleTab>('dashboard');
  showAddRole = signal(false);
  showCreateGroupDialog = signal(false);
  
  // 編輯器狀態
  showRoleEditor = signal(false);
  editingRole = signal<RoleDefinition | null>(null);
  showScriptEditor = signal(false);
  editingScript = signal<ScriptTemplate | null>(null);
  
  tabs = [
    { id: 'dashboard' as const, icon: '📊', label: '監控中心' },
    { id: 'library' as const, icon: '📚', label: '角色庫 (50+)' },
    { id: 'roles' as const, icon: '🎭', label: '我的角色' },
    { id: 'scenarios' as const, icon: '🎬', label: '場景模板' },
    { id: 'scripts' as const, icon: '📜', label: '劇本編排' },
    { id: 'groups' as const, icon: '🏠', label: '協作群組' },
    { id: 'settings' as const, icon: '⚙️', label: '設置' }
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
  aiPlannerStatus = signal<'idle' | 'planning' | 'ready'>('idle');
  aiPlanResult = signal<{
    strategy: string;
    recommendedRoles: { type: string; name: string; icon: string; purpose: string }[];
    suggestedFlow: { step: number; action: string; role: string }[];
    estimatedSuccessRate: number;
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
  onPresetRoleAdded(role: RoleDefinition) {
    this.multiRoleService.addRole({
      name: role.name,
      type: role.type,
      personality: role.personality,
      aiConfig: role.aiConfig,
      responsibilities: role.responsibilities
    });
    // 切換到我的角色標籤查看
    this.activeTab.set('roles');
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
      // 查找預設角色
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
    
    // 3. 切換到劇本編排標籤
    this.activeTab.set('scripts');
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
    this.aiPlannerGoal = '';
    this.aiPlannerStatus.set('idle');
    this.aiPlanResult.set(null);
    this.showAIPlannerDialog.set(true);
  }
  
  closeAIPlanner() {
    this.showAIPlannerDialog.set(false);
  }
  
  quickAIPlan(goal: string) {
    this.aiPlannerGoal = goal;
    this.openAIPlanner();
    // 自動開始策劃
    setTimeout(() => this.startAIPlanning(), 100);
  }
  
  async startAIPlanning() {
    if (!this.aiPlannerGoal.trim()) return;
    
    this.aiPlannerStatus.set('planning');
    
    // 模擬 AI 策劃過程（實際應調用後端 AI）
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 根據目標生成策劃結果
    const goal = this.aiPlannerGoal.toLowerCase();
    let result;
    
    if (goal.includes('成交') || goal.includes('付費') || goal.includes('購買') || goal.includes('首單')) {
      result = {
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
    } else if (goal.includes('流失') || goal.includes('挽回')) {
      result = {
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
    } else if (goal.includes('社群') || goal.includes('活躍')) {
      result = {
        strategy: '採用「話題引導 + 互動響應 + 價值輸出」策略，通過多個活躍成員配合帶動討論氛圍，最後由意見領袖總結價值。',
        recommendedRoles: [
          { type: 'community', name: '社群管家', icon: '🏠', purpose: '發起話題' },
          { type: 'member1', name: '熱心群友A', icon: '😄', purpose: '積極互動' },
          { type: 'member2', name: '熱心群友B', icon: '🤗', purpose: '補充討論' },
          { type: 'leader', name: '意見領袖', icon: '🎤', purpose: '價值總結' }
        ],
        suggestedFlow: [
          { step: 1, action: '社群管家發起有價值的話題', role: '社群管家' },
          { step: 2, action: '熱心群友積極響應討論', role: '熱心群友A' },
          { step: 3, action: '更多成員參與互動', role: '熱心群友B' },
          { step: 4, action: '意見領袖總結討論價值', role: '意見領袖' }
        ],
        estimatedSuccessRate: 80
      };
    } else {
      result = {
        strategy: '採用「需求了解 + 方案展示 + 跟進服務」通用策略，先了解客戶需求，提供定制化方案，持續跟進直到目標達成。',
        recommendedRoles: [
          { type: 'account', name: '客戶經理', icon: '💼', purpose: '了解需求' },
          { type: 'expert', name: '方案專家', icon: '📊', purpose: '設計方案' },
          { type: 'support', name: '服務專員', icon: '🎧', purpose: '持續跟進' }
        ],
        suggestedFlow: [
          { step: 1, action: '客戶經理深入了解需求', role: '客戶經理' },
          { step: 2, action: '方案專家設計定制方案', role: '方案專家' },
          { step: 3, action: '解答疑問，調整方案', role: '方案專家' },
          { step: 4, action: '服務專員持續跟進', role: '服務專員' }
        ],
        estimatedSuccessRate: 55
      };
    }
    
    this.aiPlanResult.set(result);
    this.aiPlannerStatus.set('ready');
  }
  
  resetAIPlanner() {
    this.aiPlannerStatus.set('idle');
    this.aiPlanResult.set(null);
  }
  
  applyAIPlan() {
    const result = this.aiPlanResult();
    if (!result) return;
    
    // 1. 添加推薦的角色
    for (const roleConfig of result.recommendedRoles) {
      const existingRole = this.multiRoleService.roles().find(r => r.name === roleConfig.name);
      if (!existingRole) {
        this.multiRoleService.addRole({
          name: roleConfig.name,
          type: 'custom',
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
    
    // 2. 創建對應的劇本
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
    
    // 3. 關閉對話框並切換到角色標籤
    this.closeAIPlanner();
    this.activeTab.set('roles');
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
}
