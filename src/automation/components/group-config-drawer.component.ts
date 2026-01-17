/**
 * 群組配置抽屜組件
 * Group Config Drawer Component
 * 
 * 功能:
 * 1. 群組基本信息顯示
 * 2. 關鍵詞集綁定 (可視化多選)
 * 3. 監控設置配置
 * 4. 數據統計展示
 * 5. 成員提取入口
 */

import { Component, input, output, signal, computed, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SlideDrawerComponent } from './slide-drawer.component';

export interface GroupDetailData {
  id: string;
  name: string;
  memberCount: number;
  isMonitoring: boolean;
  linkedKeywordSets: string[];
  // 擴展數據
  avatarUrl?: string;
  joinedAt?: string;
  groupLink?: string;
  activityLevel?: 'low' | 'medium' | 'high';
  dailyMessages?: number;
  // 統計
  stats?: {
    matchesToday: number;
    matchesWeek: number;
    leadsToday: number;
    leadsWeek: number;
    conversions: number;
  };
}

export interface AvailableKeywordSetForGroup {
  id: string;
  name: string;
  keywordCount: number;
  totalMatches: number;
  isActive: boolean;
}

@Component({
  selector: 'app-group-config-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, SlideDrawerComponent],
  template: `
    <app-slide-drawer
      [isOpen]="isOpen()"
      [title]="group()?.name || '群組配置'"
      [subtitle]="group() ? group()!.memberCount + ' 成員' : ''"
      icon="👥"
      size="lg"
      [hasUnsavedChanges]="hasChanges()"
      (close)="onClose()">
      
      @if (group()) {
        <div class="p-4 space-y-6">
          <!-- 基本信息 -->
          <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 class="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <span>📋</span> 基本信息
            </h3>
            <div class="flex gap-4">
              <!-- 群組頭像 -->
              <div class="w-16 h-16 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                @if (group()!.avatarUrl) {
                  <img [src]="group()!.avatarUrl" class="w-full h-full rounded-xl object-cover">
                } @else {
                  <span class="text-3xl">👥</span>
                }
              </div>
              
              <!-- 信息列表 -->
              <div class="flex-1 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-slate-400">成員數</span>
                  <span class="text-sm text-white font-medium">{{ group()!.memberCount | number }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-slate-400">活躍度</span>
                  <span class="text-sm flex items-center gap-1"
                        [class.text-red-400]="group()!.activityLevel === 'high'"
                        [class.text-yellow-400]="group()!.activityLevel === 'medium'"
                        [class.text-slate-400]="group()!.activityLevel === 'low'">
                    {{ group()!.activityLevel === 'high' ? '🔥 高活躍' : 
                       group()!.activityLevel === 'medium' ? '📊 中等' : '💤 低活躍' }}
                    @if (group()!.dailyMessages) {
                      <span class="text-slate-500">(日均 {{ group()!.dailyMessages }} 條)</span>
                    }
                  </span>
                </div>
                @if (group()!.groupLink) {
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-slate-400">群組連結</span>
                    <a [href]="group()!.groupLink" target="_blank" 
                       class="text-sm text-cyan-400 hover:text-cyan-300 truncate max-w-[200px]">
                      {{ group()!.groupLink }}
                    </a>
                  </div>
                }
                @if (group()!.joinedAt) {
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-slate-400">加入時間</span>
                    <span class="text-sm text-slate-300">{{ group()!.joinedAt }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
          
          <!-- 綁定關鍵詞集 -->
          <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 class="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <span>🔑</span> 綁定關鍵詞集
              <span class="text-xs text-slate-500 font-normal">(點擊切換綁定狀態)</span>
            </h3>
            
            @if (availableKeywordSets().length > 0) {
              <div class="space-y-2">
                @for (set of availableKeywordSets(); track set.id) {
                  <label class="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all"
                         [class.bg-cyan-500/20]="isLinked(set.id)"
                         [class.border]="isLinked(set.id)"
                         [class.border-cyan-500/50]="isLinked(set.id)"
                         [class.bg-slate-700/50]="!isLinked(set.id)"
                         [class.hover:bg-slate-700]="!isLinked(set.id)"
                         [class.opacity-50]="!set.isActive"
                         (click)="toggleKeywordSet(set.id, set.isActive)">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm"
                           [class.bg-orange-500/20]="set.isActive"
                           [class.text-orange-400]="set.isActive"
                           [class.bg-slate-600]="!set.isActive"
                           [class.text-slate-500]="!set.isActive">
                        {{ set.name.substring(0, 3) }}
                      </div>
                      <div>
                        <div class="text-sm font-medium text-white flex items-center gap-2">
                          {{ set.name }}
                          @if (set.totalMatches > 0) {
                            <span class="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                              🔥 {{ set.totalMatches }}
                            </span>
                          }
                        </div>
                        <div class="text-xs text-slate-400">{{ set.keywordCount }} 個關鍵詞</div>
                      </div>
                    </div>
                    <div class="flex items-center gap-3">
                      @if (!set.isActive) {
                        <span class="text-xs text-slate-500">已禁用</span>
                      }
                      <div class="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                           [class.bg-cyan-500]="isLinked(set.id)"
                           [class.text-white]="isLinked(set.id)"
                           [class.bg-slate-600]="!isLinked(set.id)"
                           [class.text-slate-400]="!isLinked(set.id)">
                        @if (isLinked(set.id)) {
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                          </svg>
                        }
                      </div>
                    </div>
                  </label>
                }
              </div>
              
              <div class="mt-3 pt-3 border-t border-slate-700/50">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-slate-400">已綁定</span>
                  <span class="text-cyan-400 font-medium">{{ editLinkedSets.length }} 個詞集</span>
                </div>
              </div>
            } @else {
              <div class="text-center py-6 text-slate-400">
                <p>暫無可用的關鍵詞集</p>
                <button (click)="onCreateKeywordSet()"
                        class="mt-2 text-cyan-400 hover:text-cyan-300 text-sm">
                  + 創建關鍵詞集
                </button>
              </div>
            }
          </div>
          
          <!-- 監控設置 -->
          <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 class="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
              <span>⚙️</span> 監控設置
            </h3>
            <div class="space-y-3">
              <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer 
                            hover:bg-slate-700 transition-colors">
                <div class="flex items-center gap-3">
                  <span class="text-xl">📡</span>
                  <div>
                    <div class="text-sm text-white font-medium">啟用監控</div>
                    <div class="text-xs text-slate-400">監控此群組的消息</div>
                  </div>
                </div>
                <input type="checkbox" 
                       [(ngModel)]="editSettings.isMonitoring"
                       (change)="markChanged()"
                       class="w-5 h-5 rounded text-emerald-500 bg-slate-600 border-slate-500 
                              focus:ring-emerald-500 focus:ring-offset-0">
              </label>
              
              <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer 
                            hover:bg-slate-700 transition-colors">
                <div class="flex items-center gap-3">
                  <span class="text-xl">📥</span>
                  <div>
                    <div class="text-sm text-white font-medium">自動提取發言者</div>
                    <div class="text-xs text-slate-400">匹配關鍵詞時自動將發言者添加到資料庫</div>
                  </div>
                </div>
                <input type="checkbox" 
                       [(ngModel)]="editSettings.autoExtract"
                       (change)="markChanged()"
                       class="w-5 h-5 rounded text-cyan-500 bg-slate-600 border-slate-500 
                              focus:ring-cyan-500 focus:ring-offset-0">
              </label>
              
              <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer 
                            hover:bg-slate-700 transition-colors">
                <div class="flex items-center gap-3">
                  <span class="text-xl">👑</span>
                  <div>
                    <div class="text-sm text-white font-medium">只監控管理員消息</div>
                    <div class="text-xs text-slate-400">只匹配群管理員發送的消息</div>
                  </div>
                </div>
                <input type="checkbox" 
                       [(ngModel)]="editSettings.adminOnly"
                       (change)="markChanged()"
                       class="w-5 h-5 rounded text-purple-500 bg-slate-600 border-slate-500 
                              focus:ring-purple-500 focus:ring-offset-0">
              </label>
              
              <label class="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg cursor-pointer 
                            hover:bg-slate-700 transition-colors">
                <div class="flex items-center gap-3">
                  <span class="text-xl">💬</span>
                  <div>
                    <div class="text-sm text-white font-medium">匹配時自動發送私信</div>
                    <div class="text-xs text-slate-400">當匹配到關鍵詞時自動向發言者發送消息</div>
                  </div>
                </div>
                <input type="checkbox" 
                       [(ngModel)]="editSettings.autoMessage"
                       (change)="markChanged()"
                       class="w-5 h-5 rounded text-blue-500 bg-slate-600 border-slate-500 
                              focus:ring-blue-500 focus:ring-offset-0">
              </label>
            </div>
          </div>
          
          <!-- 數據統計 -->
          @if (group()!.stats) {
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-medium text-slate-400 flex items-center gap-2">
                  <span>📊</span> 數據統計
                </h3>
                <select [(ngModel)]="statsTimeRange"
                        class="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white">
                  <option value="today">今天</option>
                  <option value="week">7天</option>
                  <option value="month">30天</option>
                </select>
              </div>
              
              <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="p-3 bg-slate-700/50 rounded-lg text-center">
                  <div class="text-2xl font-bold text-cyan-400">
                    {{ statsTimeRange === 'today' ? group()!.stats!.matchesToday : group()!.stats!.matchesWeek }}
                  </div>
                  <div class="text-xs text-slate-400 mt-1">匹配次數</div>
                </div>
                <div class="p-3 bg-slate-700/50 rounded-lg text-center">
                  <div class="text-2xl font-bold text-purple-400">
                    {{ statsTimeRange === 'today' ? group()!.stats!.leadsToday : group()!.stats!.leadsWeek }}
                  </div>
                  <div class="text-xs text-slate-400 mt-1">新 Leads</div>
                </div>
                <div class="p-3 bg-slate-700/50 rounded-lg text-center">
                  <div class="text-2xl font-bold text-emerald-400">{{ group()!.stats!.conversions }}</div>
                  <div class="text-xs text-slate-400 mt-1">轉化</div>
                </div>
              </div>
              
              <!-- 簡易趨勢圖 -->
              <div class="h-20 bg-slate-700/30 rounded-lg flex items-end justify-between px-2 pb-2 gap-1">
                @for (i of [1,2,3,4,5,6,7]; track i) {
                  <div class="flex-1 bg-gradient-to-t from-cyan-500/50 to-cyan-500/20 rounded-t transition-all"
                       [style.height.%]="20 + Math.random() * 60">
                  </div>
                }
              </div>
              <div class="flex justify-between text-xs text-slate-500 mt-1 px-1">
                <span>7天前</span>
                <span>今天</span>
              </div>
            </div>
          }
        </div>
      }
      
      <!-- 底部操作欄 -->
      <div drawer-footer class="flex items-center justify-between">
        <div class="flex gap-2">
          <button (click)="onExtractMembers()"
                  class="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 
                         rounded-lg transition-colors flex items-center gap-2 text-sm">
            📥 提取成員
          </button>
          <button (click)="onViewMessages()"
                  class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 
                         rounded-lg transition-colors flex items-center gap-2 text-sm">
            📋 查看消息
          </button>
          <button (click)="onRemove()"
                  class="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 
                         rounded-lg transition-colors flex items-center gap-2 text-sm">
            🗑️ 移除
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
export class GroupConfigDrawerComponent implements OnInit, OnChanges {
  Math = Math; // 供模板使用
  
  // 輸入
  isOpen = input(false);
  group = input<GroupDetailData | null>(null);
  availableKeywordSets = input<AvailableKeywordSetForGroup[]>([]);
  
  // 輸出
  close = output<void>();
  save = output<{ group: GroupDetailData; linkedKeywordSets: string[]; settings: typeof this.editSettings }>();
  remove = output<GroupDetailData>();
  extractMembers = output<GroupDetailData>();
  viewMessages = output<GroupDetailData>();
  createKeywordSet = output<void>();
  
  // 編輯狀態
  editLinkedSets: string[] = [];
  editSettings = {
    isMonitoring: true,
    autoExtract: true,
    adminOnly: false,
    autoMessage: false
  };
  statsTimeRange: 'today' | 'week' | 'month' = 'week';
  
  hasChanges = signal(false);
  
  ngOnInit() {
    this.resetEditData();
  }
  
  ngOnChanges() {
    if (this.group()) {
      this.resetEditData();
    }
  }
  
  resetEditData() {
    const g = this.group();
    if (g) {
      this.editLinkedSets = [...g.linkedKeywordSets];
      this.editSettings = {
        isMonitoring: g.isMonitoring,
        autoExtract: true,
        adminOnly: false,
        autoMessage: false
      };
      this.hasChanges.set(false);
    }
  }
  
  isLinked(id: string): boolean {
    return this.editLinkedSets.includes(id);
  }
  
  toggleKeywordSet(id: string, isActive: boolean) {
    if (!isActive) return; // 禁用的詞集不能操作
    
    const index = this.editLinkedSets.indexOf(id);
    if (index >= 0) {
      this.editLinkedSets.splice(index, 1);
    } else {
      this.editLinkedSets.push(id);
    }
    this.markChanged();
  }
  
  markChanged() {
    this.hasChanges.set(true);
  }
  
  onClose() {
    this.close.emit();
  }
  
  onSave() {
    if (!this.group()) return;
    
    this.save.emit({
      group: this.group()!,
      linkedKeywordSets: [...this.editLinkedSets],
      settings: { ...this.editSettings }
    });
    this.hasChanges.set(false);
  }
  
  onRemove() {
    if (this.group()) {
      this.remove.emit(this.group()!);
    }
  }
  
  onExtractMembers() {
    if (this.group()) {
      this.extractMembers.emit(this.group()!);
    }
  }
  
  onViewMessages() {
    if (this.group()) {
      this.viewMessages.emit(this.group()!);
    }
  }
  
  onCreateKeywordSet() {
    this.createKeywordSet.emit();
  }
}
