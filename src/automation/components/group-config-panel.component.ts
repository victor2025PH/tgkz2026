/**
 * 群組配置面板組件
 * Group Config Panel Component
 * 
 * 功能:
 * 1. 群組詳情顯示
 * 2. 關鍵詞集綁定編輯
 * 3. 監控設置配置
 * 4. 統計數據顯示
 */

import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface GroupData {
  id: string;
  name: string;
  memberCount: number;
  isMonitoring: boolean;
  linkedKeywordSets: string[];
  // 擴展數據
  avatarUrl?: string;
  joinedAt?: string;
  activityLevel?: 'low' | 'medium' | 'high';
  dailyMessages?: number;
  // 統計
  stats?: {
    matchesToday: number;
    leadsToday: number;
    conversions: number;
    matchesWeek: number;
    leadsWeek: number;
  };
}

export interface AvailableKeywordSet {
  id: string;
  name: string;
  keywordCount: number;
  isActive: boolean;
}

@Component({
  selector: 'app-group-config-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="group-config-panel">
      <!-- 查看模式 -->
      @if (!isEditing()) {
        <div class="flex items-start gap-3">
          <!-- 頭像 -->
          <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
               [class.bg-purple-500/20]="data().isMonitoring"
               [class.text-purple-400]="data().isMonitoring"
               [class.bg-slate-700]="!data().isMonitoring"
               [class.text-slate-500]="!data().isMonitoring">
            @if (data().avatarUrl) {
              <img [src]="data().avatarUrl" class="w-full h-full rounded-xl object-cover">
            } @else {
              <span class="text-xl">👥</span>
            }
          </div>
          
          <!-- 內容 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-medium text-white truncate">{{ data().name }}</span>
              @if (data().activityLevel === 'high') {
                <span class="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">🔥 活躍</span>
              }
            </div>
            
            <div class="flex items-center gap-3 text-xs text-slate-400 mb-2">
              <span>{{ data().memberCount }} 成員</span>
              @if (data().stats) {
                <span>今日匹配: {{ data().stats.matchesToday }}</span>
              }
            </div>
            
            <!-- 綁定的詞集 -->
            <div class="flex flex-wrap gap-1.5">
              @for (setId of data().linkedKeywordSets; track setId) {
                @if (getKeywordSetById(setId); as set) {
                  <span class="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
                    {{ set.name }}
                  </span>
                }
              }
              @if (data().linkedKeywordSets.length === 0) {
                <span class="text-xs text-slate-500">未綁定詞集</span>
              }
            </div>
          </div>
          
          <!-- 開關 -->
          <label class="relative inline-flex cursor-pointer shrink-0">
            <input type="checkbox" 
                   [checked]="data().isMonitoring"
                   (change)="toggleMonitoring()"
                   class="sr-only">
            <div class="w-11 h-6 rounded-full transition-all"
                 [class.bg-emerald-500]="data().isMonitoring"
                 [class.bg-slate-600]="!data().isMonitoring">
              <div class="absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all shadow"
                   [class.left-5]="data().isMonitoring"
                   [class.left-0.5]="!data().isMonitoring">
              </div>
            </div>
          </label>
        </div>
      }
      
      <!-- 編輯/詳情模式 -->
      @if (isEditing()) {
        <div class="space-y-4">
          <!-- 群組資訊 -->
          <div class="flex items-center gap-4 pb-4 border-b border-slate-700">
            <div class="w-16 h-16 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl">
              👥
            </div>
            <div>
              <h3 class="text-lg font-semibold text-white">{{ data().name }}</h3>
              <div class="flex items-center gap-4 text-sm text-slate-400 mt-1">
                <span>👤 {{ data().memberCount }} 成員</span>
                @if (data().activityLevel) {
                  <span [class.text-emerald-400]="data().activityLevel === 'high'"
                        [class.text-yellow-400]="data().activityLevel === 'medium'"
                        [class.text-slate-500]="data().activityLevel === 'low'">
                    {{ data().activityLevel === 'high' ? '🔥 高活躍' : 
                       data().activityLevel === 'medium' ? '📊 中活躍' : '💤 低活躍' }}
                  </span>
                }
                @if (data().dailyMessages) {
                  <span>💬 日均 {{ data().dailyMessages }} 條</span>
                }
              </div>
            </div>
          </div>
          
          <!-- 綁定關鍵詞集 -->
          <div>
            <label class="block text-sm text-slate-300 mb-2 font-medium">
              🔑 綁定關鍵詞集 <span class="text-slate-500 font-normal">(點擊切換)</span>
            </label>
            <div class="flex flex-wrap gap-2">
              @for (set of availableKeywordSets(); track set.id) {
                <button (click)="toggleKeywordSet(set.id)"
                        [disabled]="!set.isActive"
                        class="px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-2"
                        [class.bg-cyan-500/30]="isKeywordSetLinked(set.id)"
                        [class.text-cyan-300]="isKeywordSetLinked(set.id)"
                        [class.border]="isKeywordSetLinked(set.id)"
                        [class.border-cyan-500/50]="isKeywordSetLinked(set.id)"
                        [class.bg-slate-700]="!isKeywordSetLinked(set.id)"
                        [class.text-slate-400]="!isKeywordSetLinked(set.id)"
                        [class.hover:bg-slate-600]="!isKeywordSetLinked(set.id) && set.isActive"
                        [class.opacity-50]="!set.isActive"
                        [class.cursor-not-allowed]="!set.isActive">
                  @if (isKeywordSetLinked(set.id)) {
                    <span class="text-xs">✓</span>
                  }
                  {{ set.name }}
                  <span class="text-xs opacity-60">({{ set.keywordCount }})</span>
                </button>
              }
            </div>
          </div>
          
          <!-- 監控設置 -->
          <div>
            <label class="block text-sm text-slate-300 mb-2 font-medium">⚙️ 監控設置</label>
            <div class="space-y-2">
              <label class="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                <input type="checkbox" 
                       [(ngModel)]="editSettings.isMonitoring"
                       class="rounded text-cyan-500 bg-slate-600 border-slate-500">
                <div>
                  <span class="text-sm text-white">啟用監控</span>
                  <p class="text-xs text-slate-500">監控此群組的消息</p>
                </div>
              </label>
              
              <label class="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                <input type="checkbox" 
                       [(ngModel)]="editSettings.autoExtract"
                       class="rounded text-cyan-500 bg-slate-600 border-slate-500">
                <div>
                  <span class="text-sm text-white">自動提取發言者</span>
                  <p class="text-xs text-slate-500">匹配關鍵詞時自動將發言者添加到資料庫</p>
                </div>
              </label>
              
              <label class="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
                <input type="checkbox" 
                       [(ngModel)]="editSettings.adminOnly"
                       class="rounded text-cyan-500 bg-slate-600 border-slate-500">
                <div>
                  <span class="text-sm text-white">只監控管理員消息</span>
                  <p class="text-xs text-slate-500">只匹配群管理員發送的消息</p>
                </div>
              </label>
            </div>
          </div>
          
          <!-- 統計數據 -->
          @if (data().stats) {
            <div>
              <label class="block text-sm text-slate-300 mb-2 font-medium">📈 統計 (最近7天)</label>
              <div class="grid grid-cols-3 gap-3">
                <div class="p-3 bg-slate-700/50 rounded-lg text-center">
                  <div class="text-2xl font-bold text-cyan-400">{{ data().stats.matchesWeek }}</div>
                  <div class="text-xs text-slate-400">匹配次數</div>
                </div>
                <div class="p-3 bg-slate-700/50 rounded-lg text-center">
                  <div class="text-2xl font-bold text-purple-400">{{ data().stats.leadsWeek }}</div>
                  <div class="text-xs text-slate-400">新 Leads</div>
                </div>
                <div class="p-3 bg-slate-700/50 rounded-lg text-center">
                  <div class="text-2xl font-bold text-emerald-400">{{ data().stats.conversions }}</div>
                  <div class="text-xs text-slate-400">轉化</div>
                </div>
              </div>
            </div>
          }
          
          <!-- 操作按鈕 -->
          <div class="flex justify-between pt-4 border-t border-slate-700">
            <button (click)="onExtractMembers()"
                    class="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 
                           text-sm rounded-lg transition-all flex items-center gap-2">
              📥 批量提取成員
            </button>
            <div class="flex gap-2">
              <button (click)="cancelEdit()"
                      class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                ↩️ 取消
              </button>
              <button (click)="saveEdit()"
                      class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white text-sm rounded-lg transition-all">
                💾 保存
              </button>
            </div>
          </div>
          
          <!-- 危險操作 -->
          <div class="pt-4 border-t border-red-500/20">
            <button (click)="onRemoveGroup()"
                    class="w-full px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 
                           text-sm rounded-lg transition-all border border-red-500/20">
              🗑️ 從監控列表移除
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class GroupConfigPanelComponent {
  // 輸入
  data = input.required<GroupData>();
  availableKeywordSets = input<AvailableKeywordSet[]>([]);
  isEditing = input(false);
  
  // 輸出
  save = output<{ linkedKeywordSets: string[]; settings: typeof this.editSettings }>();
  cancel = output<void>();
  toggleMonitor = output<boolean>();
  extractMembers = output<void>();
  removeGroup = output<void>();
  
  // 編輯狀態
  editLinkedSets: string[] = [];
  editSettings = {
    isMonitoring: true,
    autoExtract: true,
    adminOnly: false
  };
  
  ngOnInit() {
    this.resetEditState();
  }
  
  resetEditState() {
    const d = this.data();
    this.editLinkedSets = [...d.linkedKeywordSets];
    this.editSettings = {
      isMonitoring: d.isMonitoring,
      autoExtract: true,
      adminOnly: false
    };
  }
  
  getKeywordSetById(id: string): AvailableKeywordSet | undefined {
    return this.availableKeywordSets().find(s => s.id === id);
  }
  
  isKeywordSetLinked(id: string): boolean {
    return this.editLinkedSets.includes(id);
  }
  
  toggleKeywordSet(id: string) {
    const index = this.editLinkedSets.indexOf(id);
    if (index >= 0) {
      this.editLinkedSets.splice(index, 1);
    } else {
      this.editLinkedSets.push(id);
    }
  }
  
  toggleMonitoring() {
    this.toggleMonitor.emit(!this.data().isMonitoring);
  }
  
  saveEdit() {
    this.save.emit({
      linkedKeywordSets: [...this.editLinkedSets],
      settings: { ...this.editSettings }
    });
  }
  
  cancelEdit() {
    this.resetEditState();
    this.cancel.emit();
  }
  
  onExtractMembers() {
    this.extractMembers.emit();
  }
  
  onRemoveGroup() {
    this.removeGroup.emit();
  }
}
