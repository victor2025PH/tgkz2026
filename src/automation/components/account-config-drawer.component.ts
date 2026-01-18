/**
 * 帳號配置抽屜組件
 * Account Config Drawer Component
 * 
 * 功能:
 * 1. 帳號基本信息顯示
 * 2. 角色設置 (監聽/發送)
 * 3. 發送配額配置
 * 4. 健康度顯示
 * 5. 7天統計數據
 */

import { Component, input, output, signal, computed, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SlideDrawerComponent } from './slide-drawer.component';

export interface AccountData {
  id: number;
  phone: string;
  username?: string;
  firstName?: string;
  avatar?: string;
  status: 'connected' | 'disconnected' | 'error';
  isListener: boolean;
  isSender: boolean;
  // 擴展數據
  joinedAt?: string;
  lastActiveAt?: string;
  healthScore?: number;
  dailySendLimit?: number;
  dailySendCount?: number;
  cooldownMin?: number;
  cooldownMax?: number;
  // 統計
  stats?: {
    sentToday: number;
    sentWeek: number;
    repliesWeek: number;
    conversionsWeek: number;
  };
}

@Component({
  selector: 'app-account-config-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, SlideDrawerComponent],
  template: `
    <app-slide-drawer
      [isOpen]="isOpen()"
      [title]="account()?.username || account()?.phone || '帳號配置'"
      subtitle="帳號詳情與配置"
      icon="👤"
      size="md"
      [hasUnsavedChanges]="hasChanges()"
      (close)="onClose()">
      
      @if (account()) {
        <div class="p-4 space-y-6">
          <!-- 基本信息 -->
          <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 class="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <span>📋</span> 基本信息
            </h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm text-slate-400">手機號</span>
                <span class="text-sm text-white font-mono">{{ account()!.phone }}</span>
              </div>
              @if (account()!.username) {
                <div class="flex items-center justify-between">
                  <span class="text-sm text-slate-400">用戶名</span>
                  <span class="text-sm text-cyan-400">&#64;{{ account()!.username }}</span>
                </div>
              }
              <div class="flex items-center justify-between">
                <span class="text-sm text-slate-400">狀態</span>
                <span class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full"
                        [class.bg-emerald-500]="account()!.status === 'connected'"
                        [class.bg-red-500]="account()!.status === 'error'"
                        [class.bg-slate-500]="account()!.status === 'disconnected'">
                  </span>
                  <span class="text-sm"
                        [class.text-emerald-400]="account()!.status === 'connected'"
                        [class.text-red-400]="account()!.status === 'error'"
                        [class.text-slate-400]="account()!.status === 'disconnected'">
                    {{ account()!.status === 'connected' ? '已連接' : 
                       account()!.status === 'error' ? '連接錯誤' : '未連接' }}
                  </span>
                </span>
              </div>
              @if (account()!.joinedAt) {
                <div class="flex items-center justify-between">
                  <span class="text-sm text-slate-400">加入時間</span>
                  <span class="text-sm text-slate-300">{{ account()!.joinedAt }}</span>
                </div>
              }
            </div>
          </div>
          
          <!-- 角色設置 -->
          <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 class="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <span>🎭</span> 角色設置
            </h3>
            <div class="space-y-3">
              <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer 
                            hover:bg-slate-700 transition-colors group">
                <div class="flex items-center gap-3">
                  <span class="text-xl">👂</span>
                  <div>
                    <div class="text-sm text-white font-medium">監聽帳號</div>
                    <div class="text-xs text-slate-400">監控群組消息，捕獲關鍵詞匹配</div>
                  </div>
                </div>
                <input type="checkbox" 
                       [(ngModel)]="editData.isListener"
                       (change)="markChanged()"
                       class="w-5 h-5 rounded text-blue-500 bg-slate-600 border-slate-500 
                              focus:ring-blue-500 focus:ring-offset-0">
              </label>
              
              <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer 
                            hover:bg-slate-700 transition-colors group">
                <div class="flex items-center gap-3">
                  <span class="text-xl">📤</span>
                  <div>
                    <div class="text-sm text-white font-medium">發送帳號</div>
                    <div class="text-xs text-slate-400">用於發送私信和自動回覆</div>
                  </div>
                </div>
                <input type="checkbox" 
                       [(ngModel)]="editData.isSender"
                       (change)="markChanged()"
                       class="w-5 h-5 rounded text-green-500 bg-slate-600 border-slate-500 
                              focus:ring-green-500 focus:ring-offset-0">
              </label>
            </div>
          </div>
          
          <!-- 發送配額 (僅發送帳號) -->
          @if (editData.isSender) {
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <h3 class="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <span>⚙️</span> 發送配額
              </h3>
              <div class="space-y-4">
                <!-- 今日進度 -->
                <div>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm text-slate-400">今日發送</span>
                    <span class="text-sm">
                      <span class="text-cyan-400 font-medium">{{ account()!.stats?.sentToday || 0 }}</span>
                      <span class="text-slate-500"> / {{ editData.dailySendLimit }}</span>
                    </span>
                  </div>
                  <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
                         [style.width.%]="sendProgress()">
                    </div>
                  </div>
                </div>
                
                <!-- 每日限制 -->
                <div>
                  <label class="block text-sm text-slate-400 mb-2">每日發送上限</label>
                  <div class="flex items-center gap-3">
                    <input type="range" 
                           [(ngModel)]="editData.dailySendLimit"
                           (input)="markChanged()"
                           min="10" max="200" step="10"
                           class="flex-1 h-2 bg-slate-700 rounded-full appearance-none cursor-pointer
                                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                                  [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full 
                                  [&::-webkit-slider-thumb]:bg-cyan-500">
                    <span class="w-12 text-center text-white font-medium">{{ editData.dailySendLimit }}</span>
                  </div>
                </div>
                
                <!-- 冷卻時間 -->
                <div>
                  <label class="block text-sm text-slate-400 mb-2">消息間隔 (秒)</label>
                  <div class="flex items-center gap-3">
                    <input type="number" 
                           [(ngModel)]="editData.cooldownMin"
                           (input)="markChanged()"
                           min="10" max="300"
                           class="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg 
                                  text-white text-center focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500">
                    <span class="text-slate-400">~</span>
                    <input type="number" 
                           [(ngModel)]="editData.cooldownMax"
                           (input)="markChanged()"
                           min="10" max="600"
                           class="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg 
                                  text-white text-center focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500">
                    <span class="text-sm text-slate-500">秒</span>
                  </div>
                </div>
              </div>
            </div>
          }
          
          <!-- 健康度 -->
          <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 class="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <span>💚</span> 帳號健康度
            </h3>
            <div class="flex items-center gap-4">
              <div class="relative w-20 h-20">
                <svg class="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="36" stroke-width="8" 
                          class="fill-none stroke-slate-700"/>
                  <circle cx="40" cy="40" r="36" stroke-width="8" 
                          class="fill-none transition-all duration-500"
                          [class.stroke-emerald-500]="healthScore() >= 80"
                          [class.stroke-yellow-500]="healthScore() >= 50 && healthScore() < 80"
                          [class.stroke-red-500]="healthScore() < 50"
                          stroke-linecap="round"
                          [style.stroke-dasharray]="'226.2'"
                          [style.stroke-dashoffset]="226.2 - (226.2 * healthScore() / 100)"/>
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                  <span class="text-xl font-bold"
                        [class.text-emerald-400]="healthScore() >= 80"
                        [class.text-yellow-400]="healthScore() >= 50 && healthScore() < 80"
                        [class.text-red-400]="healthScore() < 50">
                    {{ healthScore() }}
                  </span>
                </div>
              </div>
              <div class="flex-1 space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-slate-400">狀態</span>
                  <span [class.text-emerald-400]="healthScore() >= 80"
                        [class.text-yellow-400]="healthScore() >= 50 && healthScore() < 80"
                        [class.text-red-400]="healthScore() < 50">
                    {{ healthScore() >= 80 ? '良好' : healthScore() >= 50 ? '一般' : '風險' }}
                  </span>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-slate-400">建議</span>
                  <span class="text-slate-300">
                    {{ healthScore() >= 80 ? '保持當前節奏' : 
                       healthScore() >= 50 ? '適當降低發送頻率' : '暫停發送，等待恢復' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 7天統計 -->
          @if (account()!.stats) {
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <h3 class="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <span>📊</span> 7天統計
              </h3>
              <div class="grid grid-cols-3 gap-3">
                <div class="p-3 bg-slate-700/50 rounded-lg text-center">
                  <div class="text-2xl font-bold text-cyan-400">{{ account()!.stats!.sentWeek }}</div>
                  <div class="text-xs text-slate-400 mt-1">發送消息</div>
                </div>
                <div class="p-3 bg-slate-700/50 rounded-lg text-center">
                  <div class="text-2xl font-bold text-purple-400">{{ account()!.stats!.repliesWeek }}</div>
                  <div class="text-xs text-slate-400 mt-1">收到回覆</div>
                </div>
                <div class="p-3 bg-slate-700/50 rounded-lg text-center">
                  <div class="text-2xl font-bold text-emerald-400">{{ account()!.stats!.conversionsWeek }}</div>
                  <div class="text-xs text-slate-400 mt-1">轉化</div>
                </div>
              </div>
            </div>
          }
        </div>
      }
      
      <!-- 底部操作欄 -->
      <div drawer-footer class="flex items-center justify-between">
        <div class="flex gap-2">
          @if (account()?.status === 'error' || account()?.status === 'disconnected') {
            <button (click)="onReconnect()"
                    class="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 
                           rounded-lg transition-colors flex items-center gap-2 text-sm">
              🔄 重新連接
            </button>
          }
          <button (click)="onRemove()"
                  class="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 
                         rounded-lg transition-colors flex items-center gap-2 text-sm">
            🗑️ 移除帳號
          </button>
        </div>
        <button (click)="onSave()"
                [disabled]="!hasChanges()"
                class="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg 
                       transition-colors flex items-center gap-2 text-sm font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed">
          💾 保存更改
        </button>
      </div>
    </app-slide-drawer>
  `
})
export class AccountConfigDrawerComponent implements OnInit, OnChanges {
  // 輸入
  isOpen = input(false);
  account = input<AccountData | null>(null);
  
  // 輸出
  close = output<void>();
  save = output<AccountData>();
  remove = output<AccountData>();
  reconnect = output<AccountData>();
  
  // 編輯狀態
  editData = {
    isListener: false,
    isSender: false,
    dailySendLimit: 50,
    cooldownMin: 30,
    cooldownMax: 60
  };
  
  hasChanges = signal(false);
  
  // 計算屬性
  healthScore = computed(() => this.account()?.healthScore || 85);
  
  sendProgress = computed(() => {
    const sent = this.account()?.stats?.sentToday || 0;
    const limit = this.editData.dailySendLimit;
    return Math.min((sent / limit) * 100, 100);
  });
  
  ngOnInit() {
    this.resetEditData();
  }
  
  ngOnChanges() {
    if (this.account()) {
      this.resetEditData();
    }
  }
  
  resetEditData() {
    const acc = this.account();
    if (acc) {
      this.editData = {
        isListener: acc.isListener,
        isSender: acc.isSender,
        dailySendLimit: acc.dailySendLimit || 50,
        cooldownMin: acc.cooldownMin || 30,
        cooldownMax: acc.cooldownMax || 60
      };
      this.hasChanges.set(false);
    }
  }
  
  markChanged() {
    this.hasChanges.set(true);
  }
  
  onClose() {
    this.close.emit();
  }
  
  onSave() {
    if (!this.account()) return;
    
    const updated: AccountData = {
      ...this.account()!,
      isListener: this.editData.isListener,
      isSender: this.editData.isSender,
      dailySendLimit: this.editData.dailySendLimit,
      cooldownMin: this.editData.cooldownMin,
      cooldownMax: this.editData.cooldownMax
    };
    
    this.save.emit(updated);
    this.hasChanges.set(false);
  }
  
  onRemove() {
    if (this.account()) {
      this.remove.emit(this.account()!);
    }
  }
  
  onReconnect() {
    if (this.account()) {
      this.reconnect.emit(this.account()!);
    }
  }
}
