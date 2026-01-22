/**
 * 🐝 蜂群監控組件
 * Swarm Marketing Monitor Component
 * 
 * 實時監控蜂群營銷狀態：
 * - 啟用的群組
 * - 回覆日誌
 * - TTS 服務狀態
 * - 快捷控制
 */

import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SwarmService, SwarmGroupState, SwarmResponseLog } from '../swarm.service';
import { ElectronIpcService } from '../../electron-ipc.service';
import { MonitoringStateService } from '../../monitoring/monitoring-state.service';

@Component({
  selector: 'app-swarm-monitor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="swarm-monitor p-6 bg-slate-900 min-h-full">
      <!-- 標題 -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 class="text-2xl font-bold text-white flex items-center gap-3">
            <span class="text-2xl">🐝</span>
            蜂群營銷控制中心
          </h2>
          <p class="text-slate-400 mt-1">多角色自動協作 · 語音狙擊 · 智能分流</p>
        </div>
        
        <div class="flex items-center gap-3">
          <!-- 全局開關 -->
          <div class="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-xl border border-slate-700">
            <span class="text-sm text-slate-400">蜂群狀態</span>
            @if (swarmService.activeGroupCount() > 0) {
              <span class="flex items-center gap-2 text-emerald-400">
                <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                運行中
              </span>
            } @else {
              <span class="text-slate-500">待命</span>
            }
          </div>
          
          <!-- 刷新按鈕 -->
          <button (click)="refresh()"
                  class="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">
            <svg class="w-5 h-5" [class.animate-spin]="isRefreshing()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- 頂部統計卡片 -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <!-- 活躍群組 -->
        <div class="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-4 border border-purple-500/30">
          <div class="flex items-center gap-2">
            <span class="text-3xl">🐝</span>
            <div>
              <div class="text-3xl font-bold text-purple-400">{{ swarmService.activeGroupCount() }}</div>
              <div class="text-sm text-slate-400">活躍蜂群</div>
            </div>
          </div>
        </div>
        
        <!-- 今日回覆 -->
        <div class="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-xl p-4 border border-emerald-500/30">
          <div class="flex items-center gap-2">
            <span class="text-3xl">💬</span>
            <div>
              <div class="text-3xl font-bold text-emerald-400">{{ swarmService.stats().todayMessages }}</div>
              <div class="text-sm text-slate-400">今日回覆</div>
            </div>
          </div>
        </div>
        
        <!-- 語音回覆 -->
        <div class="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 rounded-xl p-4 border border-cyan-500/30">
          <div class="flex items-center gap-2">
            <span class="text-3xl">🔊</span>
            <div>
              <div class="text-3xl font-bold text-cyan-400">{{ voiceCount() }}</div>
              <div class="text-sm text-slate-400">語音狙擊</div>
            </div>
          </div>
        </div>
        
        <!-- TTS 狀態 -->
        <div class="rounded-xl p-4 border"
             [class.bg-gradient-to-br]="true"
             [class.from-amber-500/20]="swarmService.ttsConnected()"
             [class.to-amber-600/10]="swarmService.ttsConnected()"
             [class.border-amber-500/30]="swarmService.ttsConnected()"
             [class.from-red-500/20]="!swarmService.ttsConnected()"
             [class.to-red-600/10]="!swarmService.ttsConnected()"
             [class.border-red-500/30]="!swarmService.ttsConnected()">
          <div class="flex items-center gap-2">
            <span class="text-3xl">🎙️</span>
            <div>
              <div class="text-lg font-bold" 
                   [class.text-amber-400]="swarmService.ttsConnected()"
                   [class.text-red-400]="!swarmService.ttsConnected()">
                {{ swarmService.ttsConnected() ? '已連接' : '未連接' }}
              </div>
              <div class="text-sm text-slate-400">GPT-SoVITS</div>
            </div>
          </div>
          
          <!-- TTS 端點配置 -->
          @if (!swarmService.ttsConnected() || showTtsConfig()) {
            <div class="mt-2">
              <input type="text"
                     [(ngModel)]="ttsEndpointInput"
                     placeholder="http://192.168.x.x:9880"
                     class="w-full px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500">
              <button (click)="saveTtsEndpoint()" 
                      class="mt-1 w-full px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded hover:bg-amber-500/30">
                保存並測試
              </button>
            </div>
          } @else {
            <button (click)="showTtsConfig.set(true)" 
                    class="mt-2 text-xs text-slate-400 hover:text-white">
              點擊檢測 →
            </button>
          }
        </div>
      </div>
      
      <div class="grid grid-cols-3 gap-6">
        <!-- 左側：活躍群組 -->
        <div class="col-span-2 space-y-6">
          <!-- 快速啟用蜂群 -->
          <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-white flex items-center gap-2">
                <span>⚡</span> 快速啟用
              </h3>
              
              <!-- 輸入模式切換 -->
              <div class="flex items-center gap-1 bg-slate-700 rounded-lg p-1">
                <button (click)="inputMode.set('id')"
                        class="px-3 py-1 text-xs rounded-md transition-colors"
                        [class.bg-purple-500]="inputMode() === 'id'"
                        [class.text-white]="inputMode() === 'id'"
                        [class.text-slate-400]="inputMode() !== 'id'">
                  群組 ID
                </button>
                <button (click)="inputMode.set('link')"
                        class="px-3 py-1 text-xs rounded-md transition-colors"
                        [class.bg-purple-500]="inputMode() === 'link'"
                        [class.text-white]="inputMode() === 'link'"
                        [class.text-slate-400]="inputMode() !== 'link'">
                  群組連結
                </button>
                <button (click)="inputMode.set('select')"
                        class="px-3 py-1 text-xs rounded-md transition-colors"
                        [class.bg-purple-500]="inputMode() === 'select'"
                        [class.text-white]="inputMode() === 'select'"
                        [class.text-slate-400]="inputMode() !== 'select'">
                  已有群組
                </button>
              </div>
            </div>
            
            <div class="flex gap-3">
              @switch (inputMode()) {
                @case ('id') {
                  <input type="text" 
                         [(ngModel)]="newGroupId"
                         placeholder="輸入群組 ID（如：-1001234567890）"
                         class="flex-1 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 font-mono">
                }
                @case ('link') {
                  <div class="flex-1 relative">
                    <input type="text" 
                           [(ngModel)]="groupLink"
                           (input)="parseGroupLink()"
                           placeholder="輸入群組連結（如：https://t.me/groupname）"
                           class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500">
                    @if (parsedGroupId()) {
                      <div class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400">
                        ✓ ID: {{ parsedGroupId() }}
                      </div>
                    }
                  </div>
                }
                @case ('select') {
                  <select [(ngModel)]="selectedGroupId"
                          class="flex-1 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white">
                    <option value="">選擇已監控的群組...</option>
                    @for (group of monitoringState.groups(); track group.id) {
                      <option [value]="group.telegramId || group.id">
                        {{ group.name }} {{ group.telegramId ? '(TG: ' + group.telegramId + ')' : '' }}
                      </option>
                    }
                  </select>
                }
              }
              
              <button (click)="enableSwarmForGroup()"
                      [disabled]="!canEnableSwarm()"
                      class="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                🐝 啟用蜂群
              </button>
            </div>
            
            <!-- 已選群組顯示 -->
            @if (inputMode() === 'select' && selectedGroupId) {
              <div class="mt-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                @if (getSelectedGroup(); as group) {
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="text-white font-medium">{{ group.name }}</div>
                      <div class="text-xs text-slate-400">{{ group.url }}</div>
                    </div>
                    <div class="text-right">
                      @if (group.telegramId) {
                        <div class="text-xs text-cyan-400 font-mono">TG ID: {{ group.telegramId }}</div>
                      }
                      <div class="text-xs text-slate-500">{{ group.memberCount }} 成員</div>
                    </div>
                  </div>
                }
              </div>
            }
            
            <!-- 配置選項 -->
            <div class="flex items-center gap-6 mt-4 text-sm">
              <label class="flex items-center gap-2 text-slate-400">
                <input type="checkbox" 
                       [(ngModel)]="voiceEnabled"
                       class="rounded bg-slate-700 border-slate-600 text-purple-500">
                啟用語音狙擊
              </label>
              
              <div class="flex items-center gap-2 text-slate-400">
                <span>冷卻時間:</span>
                <input type="number" 
                       [(ngModel)]="cooldownSeconds"
                       min="5" max="120"
                       class="w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-center">
                <span>秒</span>
              </div>
            </div>
          </div>
          
          <!-- 活躍蜂群列表 -->
          <div class="bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div class="p-5 border-b border-slate-700/50 flex items-center justify-between">
              <h3 class="text-lg font-semibold text-white">🐝 活躍蜂群</h3>
              <span class="text-sm text-slate-400">{{ swarmService.activeGroupCount() }} 個群組</span>
            </div>
            
            <div class="divide-y divide-slate-700/50 max-h-80 overflow-y-auto">
              @for (group of swarmService.activeGroups(); track group.groupId) {
                <div class="p-4 hover:bg-slate-700/30 transition-colors">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <span class="text-xl">🐝</span>
                      </div>
                      <div>
                        <div class="font-medium text-white">{{ group.groupId }}</div>
                        <div class="text-sm text-slate-400 flex items-center gap-2">
                          @if (group.voiceEnabled) {
                            <span class="text-cyan-400">🔊 語音</span>
                          }
                          @if (group.lastSpeaker) {
                            <span>上次: {{ group.lastSpeaker }}</span>
                          }
                        </div>
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-3">
                      <!-- 狀態 -->
                      <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full animate-pulse"
                              [class.bg-emerald-500]="group.isActive"
                              [class.bg-slate-500]="!group.isActive">
                        </span>
                        <span class="text-sm"
                              [class.text-emerald-400]="group.isActive"
                              [class.text-slate-400]="!group.isActive">
                          {{ group.isActive ? '運行中' : '已暫停' }}
                        </span>
                      </div>
                      
                      <!-- 禁用按鈕 -->
                      <button (click)="disableSwarm(group.groupId)"
                              class="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              }
              
              @if (swarmService.activeGroupCount() === 0) {
                <div class="p-8 text-center text-slate-500">
                  <div class="text-4xl mb-2">🐝</div>
                  <div>暫無活躍的蜂群</div>
                  <div class="text-sm mt-1">輸入群組 ID 並點擊「啟用蜂群」開始</div>
                </div>
              }
            </div>
          </div>
        </div>
        
        <!-- 右側：實時日誌 -->
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div class="p-5 border-b border-slate-700/50 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-white flex items-center gap-2">
              <span>📜</span> 實時動態
            </h3>
            <button (click)="clearLogs()" 
                    class="text-xs text-slate-400 hover:text-white">
              清空
            </button>
          </div>
          
          <div class="p-4 space-y-3 max-h-96 overflow-y-auto">
            @for (log of swarmService.responseLogs(); track log.id) {
              <div class="p-3 bg-slate-700/30 rounded-lg">
                <div class="flex items-center justify-between mb-1">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">{{ log.responseType === 'voice' ? '🔊' : '💬' }}</span>
                    <span class="font-medium text-white">{{ log.roleName }}</span>
                    <span class="text-xs px-2 py-0.5 rounded bg-slate-600 text-slate-300">
                      {{ log.roleType }}
                    </span>
                  </div>
                  <span class="text-xs text-slate-500">
                    {{ formatTime(log.timestamp) }}
                  </span>
                </div>
                <div class="text-sm text-slate-400 truncate">
                  {{ log.contentPreview }}
                </div>
                @if (log.matchInfo.keywords && log.matchInfo.keywords.length > 0) {
                  <div class="mt-1 flex flex-wrap gap-1">
                    @for (kw of log.matchInfo.keywords; track kw) {
                      <span class="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                        {{ kw }}
                      </span>
                    }
                  </div>
                }
              </div>
            }
            
            @if (swarmService.responseLogs().length === 0) {
              <div class="text-center py-8 text-slate-500">
                <div class="text-3xl mb-2">📜</div>
                <div>等待蜂群響應...</div>
              </div>
            }
          </div>
        </div>
      </div>
      
      <!-- 底部：測試區域 -->
      <div class="mt-6 bg-slate-800/50 rounded-xl border border-slate-700/50 p-5">
        <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>🧪</span> 測試蜂群響應
        </h3>
        
        <div class="flex gap-3">
          <input type="text"
                 [(ngModel)]="testGroupId"
                 placeholder="目標群組 ID"
                 class="w-48 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500">
          
          <input type="text"
                 [(ngModel)]="testMessage"
                 placeholder="模擬消息內容（如：這個產品多少錢？）"
                 class="flex-1 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500">
          
          <button (click)="testSwarmResponse()"
                  [disabled]="!testGroupId.trim() || !testMessage.trim()"
                  class="px-6 py-2.5 bg-cyan-500 text-white font-medium rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            🧪 測試
          </button>
        </div>
        
        @if (testResult()) {
          <div class="mt-4 p-4 rounded-lg"
               [class.bg-emerald-500/10]="testResult()?.success"
               [class.border-emerald-500/30]="testResult()?.success"
               [class.bg-red-500/10]="!testResult()?.success"
               [class.border-red-500/30]="!testResult()?.success"
               [class.border]="true">
            @if (testResult()?.success) {
              <div class="text-emerald-400 font-medium mb-2">✅ 測試成功</div>
              <div class="text-sm text-slate-400">
                角色: {{ testResult()?.role?.name }} ({{ testResult()?.role?.type }})<br>
                回覆方式: {{ testResult()?.responseType === 'voice' ? '🔊 語音' : '💬 文字' }}<br>
                內容: {{ testResult()?.content }}
              </div>
            } @else {
              <div class="text-red-400 font-medium">❌ 測試失敗</div>
              <div class="text-sm text-slate-400">{{ testResult()?.error }}</div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class SwarmMonitorComponent implements OnInit, OnDestroy {
  swarmService = inject(SwarmService);
  monitoringState = inject(MonitoringStateService);
  private ipc = inject(ElectronIpcService);
  
  // 狀態
  isRefreshing = signal(false);
  
  // 輸入模式：id | link | select
  inputMode = signal<'id' | 'link' | 'select'>('select');
  
  // 快速啟用表單
  newGroupId = '';
  groupLink = '';
  selectedGroupId = '';
  parsedGroupId = signal('');
  voiceEnabled = true;
  cooldownSeconds = 30;
  
  // TTS 配置
  showTtsConfig = signal(false);
  ttsEndpointInput = '';
  
  // 測試表單
  testGroupId = '';
  testMessage = '';
  testResult = signal<any>(null);
  
  // 計算屬性
  voiceCount = computed(() => {
    return this.swarmService.responseLogs().filter(l => l.responseType === 'voice').length;
  });
  
  // 刷新間隔
  private refreshInterval: any = null;
  
  ngOnInit() {
    // 載入已保存的 TTS 端點
    this.ttsEndpointInput = localStorage.getItem('tts_endpoint') || 'http://127.0.0.1:9880';
    
    // 如果有遠程端點，自動發送給後端
    if (this.ttsEndpointInput && this.ttsEndpointInput !== 'http://127.0.0.1:9880') {
      this.swarmService.checkTTSConnection(this.ttsEndpointInput);
    }
    
    this.refresh();
    
    // 定期刷新
    this.refreshInterval = setInterval(() => {
      this.swarmService.refreshStatus();
      this.swarmService.refreshStats();
    }, 10000);
    
    // 監聯測試結果
    this.ipc.on('swarm-test-result', (data: any) => {
      this.testResult.set(data);
    });
  }
  
  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
  
  refresh() {
    this.isRefreshing.set(true);
    this.swarmService.refreshStatus();
    this.swarmService.refreshStats();
    this.swarmService.checkTTSConnection();
    
    setTimeout(() => this.isRefreshing.set(false), 1000);
  }
  
  enableSwarmForGroup() {
    // 根據輸入模式獲取群組 ID
    let groupId = '';
    
    switch (this.inputMode()) {
      case 'id':
        groupId = this.newGroupId.trim();
        break;
      case 'link':
        groupId = this.parsedGroupId() || this.extractGroupIdFromLink(this.groupLink);
        break;
      case 'select':
        groupId = this.selectedGroupId;
        break;
    }
    
    if (!groupId) return;
    
    this.swarmService.enableSwarmForGroup(groupId, {
      cooldownSeconds: this.cooldownSeconds,
      globalCooldown: 5,
      voiceEnabled: this.voiceEnabled
    });
    
    // 清空輸入
    this.newGroupId = '';
    this.groupLink = '';
    this.selectedGroupId = '';
    this.parsedGroupId.set('');
  }
  
  // 判斷是否可以啟用蜂群
  canEnableSwarm(): boolean {
    switch (this.inputMode()) {
      case 'id':
        return !!this.newGroupId.trim();
      case 'link':
        return !!this.parsedGroupId() || !!this.extractGroupIdFromLink(this.groupLink);
      case 'select':
        return !!this.selectedGroupId;
      default:
        return false;
    }
  }
  
  // 解析群組連結
  parseGroupLink() {
    const groupId = this.extractGroupIdFromLink(this.groupLink);
    this.parsedGroupId.set(groupId);
  }
  
  // 從連結中提取群組 ID
  extractGroupIdFromLink(link: string): string {
    if (!link) return '';
    
    // 嘗試匹配 t.me/+xxxx 或 t.me/joinchat/xxxx 格式
    const joinMatch = link.match(/t\.me\/(\+[\w-]+|joinchat\/[\w-]+)/i);
    if (joinMatch) {
      // 這種格式無法直接獲取 ID，需要後端解析
      return '';
    }
    
    // 嘗試匹配 t.me/groupname 格式
    const groupMatch = link.match(/t\.me\/([\w_]+)/i);
    if (groupMatch) {
      // 返回用戶名，後端會解析為 ID
      return '@' + groupMatch[1];
    }
    
    // 如果是純數字（可能是群組 ID）
    const idMatch = link.match(/^-?\d+$/);
    if (idMatch) {
      return link;
    }
    
    return '';
  }
  
  // 獲取選中的群組詳情
  getSelectedGroup() {
    if (!this.selectedGroupId) return null;
    return this.monitoringState.groups().find(g => g.id === this.selectedGroupId);
  }
  
  disableSwarm(groupId: string) {
    this.swarmService.disableSwarmForGroup(groupId);
  }
  
  checkTTS() {
    this.swarmService.checkTTSConnection(this.ttsEndpointInput);
  }
  
  saveTtsEndpoint() {
    if (!this.ttsEndpointInput.trim()) return;
    
    // 保存到 localStorage
    localStorage.setItem('tts_endpoint', this.ttsEndpointInput.trim());
    
    // 更新後端 TTS 端點並測試連接
    this.swarmService.updateTTSEndpoint(this.ttsEndpointInput.trim());
    this.swarmService.checkTTSConnection(this.ttsEndpointInput.trim());
    
    // 隱藏配置輸入框
    this.showTtsConfig.set(false);
  }
  
  clearLogs() {
    this.swarmService.clearLogs();
  }
  
  testSwarmResponse() {
    if (!this.testGroupId.trim() || !this.testMessage.trim()) return;
    
    this.testResult.set(null);
    
    this.swarmService.testSwarmResponse(
      this.testGroupId.trim(),
      {
        text: this.testMessage.trim(),
        userId: 'test_user',
        username: 'TestUser'
      }
    );
  }
  
  formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }
}
