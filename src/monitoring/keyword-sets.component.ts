/**
 * 關鍵詞集管理頁面
 * 使用 MonitoringStateService 統一管理數據
 */
import { Component, signal, computed, inject, OnInit, OnDestroy, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MonitoringStateService, KeywordSet, KeywordItem } from './monitoring-state.service';
import { ConfigProgressComponent } from './config-progress.component';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { ConfirmDialogService } from '../confirm-dialog.service';

@Component({
  selector: 'app-keyword-sets',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfigProgressComponent],
  template: `
    <div class="h-full flex flex-col bg-slate-900 p-6">
      <!-- 頂部標題 -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
            <span class="text-2xl">🔑</span>
          </div>
          <div>
            <h1 class="text-2xl font-bold text-white">關鍵詞集管理</h1>
            <p class="text-sm text-slate-400">管理用於監控匹配的關鍵詞集</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <!-- 配置進度（緊湊模式） -->
          <app-config-progress 
            mode="compact" 
            (action)="handleConfigAction($event)">
          </app-config-progress>
          
          <button (click)="refreshData()"
                  class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2">
            <span [class.animate-spin]="stateService.isLoading()">🔄</span>
            <span>刷新</span>
          </button>
        </div>
      </div>

      <!-- 統計卡片 -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <span class="text-purple-400">🔑</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-purple-400">{{ stateService.keywordSets().length }}</div>
              <div class="text-xs text-slate-500">詞集數</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <span class="text-cyan-400">🔤</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-cyan-400">{{ stateService.totalKeywords() }}</div>
              <div class="text-xs text-slate-500">總關鍵詞</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <span class="text-orange-400">🔥</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-orange-400">{{ stateService.totalKeywordMatches() }}</div>
              <div class="text-xs text-slate-500">總匹配</div>
            </div>
          </div>
        </div>
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <span class="text-emerald-400">✓</span>
            </div>
            <div>
              <div class="text-2xl font-bold text-emerald-400">{{ stateService.activeKeywordSets().length }}</div>
              <div class="text-xs text-slate-500">已啟用</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 主內容區 -->
      <div class="flex-1 overflow-hidden">
        <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden h-full flex flex-col">
          <div class="p-4 border-b border-slate-700/50 flex items-center justify-between">
            <h3 class="font-semibold text-white flex items-center gap-2">
              <span>🔑</span> 關鍵詞集
              <span class="text-xs text-slate-500">({{ stateService.keywordSets().length }})</span>
              @if (stateService.totalKeywordMatches() > 0) {
                <span class="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                  🔥 總匹配 {{ stateService.totalKeywordMatches() }}
                </span>
              }
            </h3>
            <button (click)="createNewSet()"
                    class="text-sm text-cyan-400 hover:text-cyan-300">
              + 新建詞集
            </button>
          </div>
          
          <!-- 可拖拽的詞集芯片區 -->
          @if (stateService.keywordSets().length > 0) {
            <div class="px-4 pt-3 pb-2 border-b border-slate-700/30">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-xs text-slate-500">🎯 拖拽綁定：</span>
                <span class="text-xs text-slate-400">💡 拖拽詞集到群組可快速綁定</span>
              </div>
              <div class="flex flex-wrap gap-2">
                @for (set of stateService.keywordSets(); track set.id) {
                  <div draggable="true"
                       class="px-3 py-1.5 rounded-lg text-sm cursor-grab active:cursor-grabbing transition-all flex items-center gap-2"
                       [class.bg-purple-500/20]="set.isActive"
                       [class.text-purple-400]="set.isActive"
                       [class.border-purple-500/30]="set.isActive"
                       [class.bg-slate-700/50]="!set.isActive"
                       [class.text-slate-400]="!set.isActive"
                       [class.border-slate-600/30]="!set.isActive"
                       style="border-width: 1px;">
                    <span>🔑</span>
                    <span>{{ set.name }}</span>
                    <span class="text-xs opacity-70">({{ set.keywords.length }})</span>
                  </div>
                }
              </div>
            </div>
          }
          
          <!-- 詞集列表 -->
          <div class="flex-1 overflow-y-auto p-4">
            @if (stateService.keywordSets().length === 0) {
              <!-- 🆕 空狀態引導卡 -->
              <div class="flex flex-col items-center justify-center text-center py-12">
                <div class="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center mb-4">
                  <span class="text-4xl">🔑</span>
                </div>
                <h3 class="text-lg font-medium text-white mb-2">還沒有關鍵詞集</h3>
                <p class="text-slate-400 mb-6 max-w-md text-sm">
                  關鍵詞集定義了系統要在監控群組中捕捉的觸發詞。<br>
                  當群組消息命中關鍵詞時，會自動生成潛在客戶線索。
                </p>
                <button (click)="createNewSet()"
                        class="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl text-sm font-medium transition-all shadow-lg">
                  + 創建第一個關鍵詞集
                </button>
              </div>
            } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              @for (set of stateService.keywordSets(); track set.id) {
                <div (click)="selectSet(set)"
                     class="flex items-start gap-3 p-4 bg-slate-700/50 rounded-xl 
                            hover:bg-slate-700 transition-colors cursor-pointer group border border-transparent
                            hover:border-cyan-500/30"
                     [class.border-cyan-500/50]="selectedSet()?.id === set.id"
                     [class.bg-slate-700]="selectedSet()?.id === set.id">
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
                             (change)="toggleSetActive(set)"
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
              <button (click)="createNewSet()"
                      class="flex items-center justify-center gap-2 p-6 bg-slate-700/30 hover:bg-slate-700/50 
                             border-2 border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white 
                             transition-all min-h-[100px]">
                <span class="text-2xl">+</span>
                <span>新建詞集</span>
              </button>
            </div>
            }
          </div>
        </div>
      </div>

      <!-- 編輯抽屜 -->
      @if (isEditing()) {
        <div class="fixed inset-0 bg-black/50 z-50 flex justify-end" (click)="closeEditor()">
          <div class="w-[500px] bg-slate-900 h-full flex flex-col" (click)="$event.stopPropagation()">
            <!-- 標題 -->
            <div class="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                {{ isCreating() ? '新建關鍵詞集' : '編輯關鍵詞集' }}
                @if (hasUnsavedChanges()) {
                  <span class="w-2 h-2 bg-orange-500 rounded-full" title="有未保存的變更"></span>
                }
              </h3>
              <button (click)="closeEditor()" class="p-2 hover:bg-slate-700 rounded-lg text-slate-400">
                ✕
              </button>
            </div>
            
            <!-- 內容 -->
            <div class="flex-1 overflow-y-auto p-4 space-y-4">
              <!-- 名稱 -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">詞集名稱</label>
                <input type="text"
                       [(ngModel)]="editingSet.name"
                       (ngModelChange)="markAsChanged()"
                       placeholder="例如：支付相關"
                       class="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500">
              </div>
              
              <!-- 匹配模式 -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">匹配模式</label>
                <select [(ngModel)]="editingSet.matchMode"
                        (ngModelChange)="markAsChanged()"
                        class="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-purple-500">
                  <option value="fuzzy">模糊匹配</option>
                  <option value="exact">精確匹配</option>
                  <option value="regex">正則表達式</option>
                </select>
              </div>
              
              <!-- 添加關鍵詞 -->
              <div>
                <label class="block text-sm font-medium text-slate-300 mb-2">添加關鍵詞</label>
                <div class="flex gap-2">
                  <input type="text"
                         [(ngModel)]="newKeyword"
                         (keyup.enter)="addKeyword()"
                         placeholder="輸入關鍵詞，按 Enter 添加"
                         class="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500">
                  <button (click)="addKeyword()"
                          [disabled]="!newKeyword.trim()"
                          class="px-4 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors disabled:opacity-50">
                    + 添加
                  </button>
                </div>
              </div>
              
              <!-- 關鍵詞列表 -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-slate-300">
                    關鍵詞列表 ({{ editingSet.keywords.length }})
                  </span>
                  @if (editingSet.keywords.length > 0) {
                    <button (click)="clearAllKeywords()"
                            class="text-xs text-red-400 hover:underline">
                      清空全部
                    </button>
                  }
                </div>
                
                @if (editingSet.keywords.length === 0) {
                  <div class="p-6 text-center text-slate-500 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
                    <p>還沒有關鍵詞</p>
                  </div>
                } @else {
                  <div class="space-y-2 max-h-64 overflow-y-auto">
                    @for (keyword of editingSet.keywords; track keyword.id) {
                      <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 group hover:border-purple-500/30">
                        <div class="flex items-center gap-2">
                          <span class="text-white">{{ keyword.text }}</span>
                          @if (keyword.isNew) {
                            <span class="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">新</span>
                          }
                        </div>
                        <button (click)="removeKeyword(keyword)"
                                class="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-red-400 transition-all">
                          ✕
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
            
            <!-- 底部按鈕 -->
            <div class="p-4 border-t border-slate-700 flex items-center gap-3">
              <button (click)="saveSet()"
                      [disabled]="isSaving()"
                      class="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                @if (isSaving()) {
                  <span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>保存中...</span>
                } @else {
                  <span>{{ isCreating() ? '創建' : '保存' }}</span>
                }
              </button>
              @if (!isCreating()) {
                <button (click)="deleteSet()"
                        [disabled]="isSaving()"
                        class="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50">
                  刪除
                </button>
              }
              <button (click)="closeEditor()"
                      [disabled]="isSaving()"
                      class="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50">
                取消
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class KeywordSetsComponent implements OnInit, OnDestroy {
  stateService = inject(MonitoringStateService);
  private ipcService = inject(ElectronIpcService);
  private toastService = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);

  // 配置動作事件
  configAction = output<string>();

  // 本地狀態
  selectedSet = signal<KeywordSet | null>(null);
  isEditing = signal(false);
  isCreating = signal(false);
  isSaving = signal(false);  // 🔧 新增：保存中狀態
  hasUnsavedChanges = signal(false);  // 🔧 新增：未保存變更標記
  
  // 編輯狀態
  editingSet: KeywordSet = this.createEmptySet();
  originalSet: KeywordSet | null = null;  // 🔧 新增：原始數據，用於比較變更
  newKeyword = '';

  private listeners: (() => void)[] = [];

  ngOnInit() {
    this.stateService.loadAll();
    this.setupListeners();
  }

  ngOnDestroy() {
    this.listeners.forEach(cleanup => cleanup());
  }

  setupListeners() {
    // 監聽保存結果
    const cleanup1 = this.ipcService.on('save-keyword-set-result', (data: any) => {
      this.isSaving.set(false);  // 🔧 重置保存狀態
      
      if (data.success) {
        this.toastService.success(this.isCreating() ? '✅ 詞集創建成功' : '✅ 詞集保存成功');
        this.hasUnsavedChanges.set(false);  // 🔧 清除未保存標記
        this.stateService.refresh();
        // 🔧 直接關閉編輯器（不觸發未保存確認）
        this.isEditing.set(false);
        this.newKeyword = '';
      } else {
        const msg = (data.error || '未知錯誤') as string;
        const friendly = (msg.includes('locked') || msg.includes('busy') || msg.includes('繁忙'))
          ? '系統繁忙，請稍後再試'
          : msg;
        this.toastService.error(`❌ 保存失敗: ${friendly}`);
      }
    });
    this.listeners.push(cleanup1);

    // 監聽刪除結果
    const cleanup2 = this.ipcService.on('delete-keyword-set-result', (data: any) => {
      if (data.success) {
        this.toastService.success('🗑️ 詞集已刪除');
        this.selectedSet.set(null);
        this.hasUnsavedChanges.set(false);
        this.stateService.refresh();
        this.isEditing.set(false);
        this.newKeyword = '';
      } else {
        this.toastService.error(`❌ 刪除失敗: ${data.error || '未知錯誤'}`);
      }
    });
    this.listeners.push(cleanup2);
  }

  refreshData() {
    this.stateService.refresh();
    this.toastService.info('正在刷新關鍵詞集...');
  }

  handleConfigAction(action: string) {
    this.configAction.emit(action);
  }

  createEmptySet(): KeywordSet {
    return {
      id: '',
      name: '',
      keywords: [],
      matchMode: 'fuzzy',
      isActive: true,
      totalMatches: 0
    };
  }

  selectSet(set: KeywordSet) {
    this.selectedSet.set(set);
    this.editingSet = { ...set, keywords: [...set.keywords] };
    this.originalSet = JSON.parse(JSON.stringify(set));  // 🔧 深拷貝原始數據
    this.isCreating.set(false);
    this.isEditing.set(true);
    this.hasUnsavedChanges.set(false);
  }

  createNewSet() {
    this.selectedSet.set(null);
    this.editingSet = this.createEmptySet();
    this.originalSet = null;
    this.isCreating.set(true);
    this.isEditing.set(true);
    this.hasUnsavedChanges.set(false);
  }

  async closeEditor() {
    // 🔧 檢查是否有未保存的變更
    if (this.hasUnsavedChanges()) {
      const confirmed = await this.confirmDialog.warning(
        '未保存的變更',
        '您有未保存的變更，確定要關閉嗎？'
      );
      if (!confirmed) return;
    }
    this.isEditing.set(false);
    this.newKeyword = '';
    this.hasUnsavedChanges.set(false);
  }
  
  // 🔧 新增：標記有變更
  markAsChanged() {
    this.hasUnsavedChanges.set(true);
  }

  toggleSetActive(set: KeywordSet) {
    const newActive = !set.isActive;
    this.ipcService.send('save-keyword-set', {
      id: parseInt(set.id),
      name: set.name,
      keywords: set.keywords.map(k => ({ text: k.text })),
      isActive: newActive,
      matchMode: set.matchMode
    });
    
    this.toastService.success(newActive ? `✅ 已啟用 ${set.name}` : `⏸️ 已停用 ${set.name}`);
  }

  addKeyword() {
    const text = this.newKeyword.trim();
    if (!text) return;

    if (this.editingSet.keywords.some(k => k.text === text)) {
      this.toastService.error('關鍵詞已存在');
      return;
    }

    this.editingSet.keywords = [...this.editingSet.keywords, {
      id: `new-${Date.now()}`,
      text,
      matchCount: 0,
      isNew: true
    }];
    this.newKeyword = '';
    this.markAsChanged();  // 🔧 標記有變更
  }

  removeKeyword(keyword: KeywordItem) {
    this.editingSet.keywords = this.editingSet.keywords.filter(k => k.id !== keyword.id);
    this.markAsChanged();  // 🔧 標記有變更
  }

  async clearAllKeywords() {
    const confirmed = await this.confirmDialog.warning(
      '清空關鍵詞',
      '確定要清空所有關鍵詞嗎？此操作無法撤銷。'
    );
    if (confirmed) {
      this.editingSet.keywords = [];
      this.markAsChanged();  // 🔧 標記有變更
    }
  }

  saveSet() {
    console.log('[KeywordSets] saveSet called, isCreating:', this.isCreating());
    console.log('[KeywordSets] editingSet:', this.editingSet);
    
    if (!this.editingSet.name.trim()) {
      this.toastService.error('請輸入詞集名稱');
      return;
    }
    
    // 🔧 防止重複提交
    if (this.isSaving()) {
      return;
    }

    const payload = {
      id: this.isCreating() ? null : parseInt(this.editingSet.id),
      name: this.editingSet.name.trim(),
      keywords: this.editingSet.keywords.map(k => ({ text: k.text })),
      isActive: this.editingSet.isActive,
      matchMode: this.editingSet.matchMode
    };
    
    console.log('[KeywordSets] Sending save-keyword-set:', payload);
    
    // 🔧 顯示保存中狀態
    this.isSaving.set(true);
    this.ipcService.send('save-keyword-set', payload);
    this.toastService.info('⏳ 正在保存...');
  }

  async deleteSet() {
    if (!this.selectedSet()) return;
    
    const set = this.selectedSet()!;
    const confirmed = await this.confirmDialog.danger(
      '刪除關鍵詞集',
      `確定要刪除詞集「${set.name}」嗎？\n此操作無法撤銷。`,
      [`${set.name} (${set.keywords.length} 個關鍵詞)`]
    );
    
    if (confirmed) {
      this.ipcService.send('delete-keyword-set', { id: parseInt(set.id) });
    }
  }
}
