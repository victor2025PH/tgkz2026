/**
 * 聊天模板管理頁面
 * 獨立管理自動回覆使用的聊天模板
 * 數據格式與自動化中心保持一致
 */
import { Component, signal, computed, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { ConfirmDialogService } from '../confirm-dialog.service';
import { MonitoringStateService } from './monitoring-state.service';

// 模板數據接口
export interface ChatTemplateData {
  id: string;
  name: string;
  content: string;
  templateType: 'greeting' | 'follow_up' | 'promotion' | 'custom';
  variables: string[];
  usageCount: number;
  lastUsed?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// 模板類型配置
const TEMPLATE_TYPES = {
  greeting: { label: '問候語', icon: '👋', color: 'emerald' },
  follow_up: { label: '跟進消息', icon: '📩', color: 'blue' },
  promotion: { label: '推廣消息', icon: '📢', color: 'amber' },
  custom: { label: '自定義', icon: '✏️', color: 'purple' }
};

@Component({
  selector: 'app-chat-templates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex bg-slate-900">
      <!-- 左側模板列表 -->
      <div class="w-80 flex-shrink-0 border-r border-slate-700/50 flex flex-col">
        <!-- 標題 -->
        <div class="p-4 border-b border-slate-700/50">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <span class="text-xl">💬</span>
              <h2 class="font-bold text-white">聊天模板</h2>
              <span class="text-xs text-slate-500">({{ templates().length }})</span>
            </div>
            <button (click)="createNewTemplate()"
                    class="w-8 h-8 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 rounded-lg flex items-center justify-center transition-colors">
              +
            </button>
          </div>
          
          <!-- 類型篩選 -->
          <div class="flex flex-wrap gap-2 mb-3">
            <button (click)="filterType = 'all'"
                    class="px-2 py-1 rounded-lg text-xs transition-colors"
                    [class.bg-pink-500/20]="filterType === 'all'"
                    [class.text-pink-400]="filterType === 'all'"
                    [class.bg-slate-700/50]="filterType !== 'all'"
                    [class.text-slate-400]="filterType !== 'all'">
              全部
            </button>
            @for (entry of templateTypeEntries; track entry.key) {
              <button (click)="filterType = entry.key"
                      class="px-2 py-1 rounded-lg text-xs transition-colors flex items-center gap-1"
                      [class.bg-pink-500/20]="filterType === entry.key"
                      [class.text-pink-400]="filterType === entry.key"
                      [class.bg-slate-700/50]="filterType !== entry.key"
                      [class.text-slate-400]="filterType !== entry.key">
                {{ entry.value.icon }} {{ entry.value.label }}
              </button>
            }
          </div>
          
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">🔍</span>
            <input type="text"
                   [(ngModel)]="searchQuery"
                   placeholder="搜索模板..."
                   class="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-pink-500 text-sm">
          </div>
        </div>

        <!-- 模板列表 -->
        <div class="flex-1 overflow-y-auto p-2">
          @if (filteredTemplates().length === 0) {
            <div class="p-4 text-center text-slate-500">
              <p>{{ searchQuery || filterType !== 'all' ? '沒有符合的模板' : '還沒有模板' }}</p>
              <button (click)="createNewTemplate()" class="mt-2 text-pink-400 hover:underline text-sm">
                + 創建第一個模板
              </button>
            </div>
          } @else {
            @for (template of filteredTemplates(); track template.id) {
              <div (click)="selectTemplate(template)"
                   class="p-3 rounded-xl mb-2 cursor-pointer transition-all"
                   [class.bg-pink-500/20]="selectedTemplate()?.id === template.id"
                   [class.border-pink-500/50]="selectedTemplate()?.id === template.id"
                   [class.bg-slate-800/50]="selectedTemplate()?.id !== template.id"
                   [class.hover:bg-slate-700/50]="selectedTemplate()?.id !== template.id"
                   [class.border]="true"
                   [class.border-slate-700/50]="selectedTemplate()?.id !== template.id">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span>{{ getTypeConfig(template.templateType).icon }}</span>
                    <span class="font-medium text-white">{{ template.name }}</span>
                  </div>
                  <span class="text-xs px-2 py-0.5 rounded-full"
                        [class.bg-emerald-500/20]="template.isActive"
                        [class.text-emerald-400]="template.isActive"
                        [class.bg-slate-600/50]="!template.isActive"
                        [class.text-slate-400]="!template.isActive">
                    {{ template.isActive ? '啟用' : '停用' }}
                  </span>
                </div>
                <p class="text-xs text-slate-400 line-clamp-2 mb-2">{{ template.content }}</p>
                <div class="flex items-center gap-3 text-xs text-slate-500">
                  <span>📊 {{ template.usageCount }} 次使用</span>
                  @if (template.lastUsed) {
                    <span>⏰ {{ formatDate(template.lastUsed) }}</span>
                  }
                </div>
              </div>
            }
          }
        </div>
      </div>

      <!-- 右側詳情/編輯區 -->
      <div class="flex-1 flex flex-col">
        @if (!selectedTemplate() && !isCreating()) {
          <!-- 空狀態 -->
          <div class="flex-1 flex items-center justify-center">
            <div class="text-center">
              <div class="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="text-5xl">💬</span>
              </div>
              <h3 class="text-lg font-medium text-white mb-2">選擇或創建聊天模板</h3>
              <p class="text-slate-400 mb-4">從左側選擇一個模板查看詳情，或創建新模板</p>
              <button (click)="createNewTemplate()"
                      class="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg">
                + 創建新模板
              </button>
            </div>
          </div>
        } @else {
          <!-- 編輯區頂部 -->
          <div class="p-6 border-b border-slate-700/50">
            <div class="flex items-center justify-between">
              <div class="flex-1 flex items-center gap-4">
                <input type="text"
                       [(ngModel)]="editingTemplate.name"
                       placeholder="模板名稱"
                       class="text-xl font-bold text-white bg-transparent border-none focus:ring-0 p-0">
                <select [(ngModel)]="editingTemplate.templateType"
                        class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white">
                  @for (entry of templateTypeEntries; track entry.key) {
                    <option [value]="entry.key">{{ entry.value.icon }} {{ entry.value.label }}</option>
                  }
                </select>
              </div>
              <div class="flex items-center gap-3">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox"
                         [(ngModel)]="editingTemplate.isActive"
                         class="w-4 h-4 rounded border-slate-600 bg-slate-700 text-pink-500 focus:ring-pink-500">
                  <span class="text-sm text-slate-400">啟用</span>
                </label>
                <button (click)="saveTemplate()"
                        class="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-lg transition-colors">
                  {{ isCreating() ? '創建' : '保存' }}
                </button>
                @if (!isCreating()) {
                  <button (click)="deleteTemplate()"
                          class="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors">
                    刪除
                  </button>
                }
              </div>
            </div>
          </div>

          <!-- 模板編輯區 -->
          <div class="flex-1 overflow-y-auto p-6">
            <!-- 模板內容 -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-slate-300 mb-2">模板內容</label>
              <textarea [(ngModel)]="editingTemplate.content"
                        rows="8"
                        [attr.placeholder]="'輸入模板內容，使用 {{變量名}} 插入變量'"
                        class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-pink-500 resize-none">
              </textarea>
            </div>

            <!-- 變量說明 -->
            <div class="mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <h4 class="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <span>📝</span> 可用變量
              </h4>
              <div class="grid grid-cols-2 lg:grid-cols-3 gap-2">
                @for (variable of availableVariables; track variable.name) {
                  <div (click)="insertVariable(variable.name)"
                       class="p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg cursor-pointer transition-colors group">
                    <div class="flex items-center justify-between">
                      <code class="text-pink-400 text-sm">{{ '{{' + variable.name + '}}' }}</code>
                      <span class="text-xs text-slate-500 opacity-0 group-hover:opacity-100">點擊插入</span>
                    </div>
                    <p class="text-xs text-slate-400 mt-1">{{ variable.description }}</p>
                  </div>
                }
              </div>
            </div>

            <!-- 預覽 -->
            <div class="mb-6">
              <h4 class="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <span>👁️</span> 預覽
              </h4>
              <div class="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div class="flex gap-3">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white">
                    🤖
                  </div>
                  <div class="flex-1">
                    <div class="bg-slate-700/50 rounded-2xl rounded-tl-md p-3 max-w-md">
                      <p class="text-white whitespace-pre-wrap">{{ previewContent() }}</p>
                    </div>
                    <div class="text-xs text-slate-500 mt-1">剛剛</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 使用統計 -->
            @if (!isCreating()) {
              <div class="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <h4 class="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <span>📊</span> 使用統計
                </h4>
                <div class="grid grid-cols-3 gap-4">
                  <div class="text-center">
                    <div class="text-2xl font-bold text-pink-400">{{ editingTemplate.usageCount }}</div>
                    <div class="text-xs text-slate-500">總使用次數</div>
                  </div>
                  <div class="text-center">
                    <div class="text-2xl font-bold text-blue-400">{{ editingTemplate.variables.length }}</div>
                    <div class="text-xs text-slate-500">變量數量</div>
                  </div>
                  <div class="text-center">
                    <div class="text-sm font-medium text-slate-300">
                      {{ editingTemplate.lastUsed ? formatDate(editingTemplate.lastUsed) : '從未使用' }}
                    </div>
                    <div class="text-xs text-slate-500">最後使用</div>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class ChatTemplatesComponent implements OnInit, OnDestroy {
  private ipcService = inject(ElectronIpcService);
  private toastService = inject(ToastService);
  private confirmDialog = inject(ConfirmDialogService);
  private stateService = inject(MonitoringStateService);  // 🔧 FIX: 注入 StateService

  // 狀態
  templates = signal<ChatTemplateData[]>([]);
  selectedTemplate = signal<ChatTemplateData | null>(null);
  isCreating = signal(false);
  isLoading = signal(false);
  
  // 🔧 FIX: 從 StateService 同步數據
  private stateEffect = effect(() => {
    const stateTemplates = this.stateService.chatTemplates();
    if (stateTemplates.length > 0 && this.templates().length === 0) {
      console.log('[ChatTemplates] Syncing from StateService:', stateTemplates.length, 'templates');
      this.updateTemplates(stateTemplates);
    }
  });
  
  // 編輯狀態
  editingTemplate: ChatTemplateData = this.createEmptyTemplate();
  searchQuery = '';
  filterType: 'all' | 'greeting' | 'follow_up' | 'promotion' | 'custom' = 'all';

  // 模板類型配置
  templateTypeEntries = Object.entries(TEMPLATE_TYPES).map(([key, value]) => ({ key, value }));

  // 可用變量
  availableVariables = [
    { name: 'username', description: '對方用戶名' },
    { name: 'firstName', description: '對方名字' },
    { name: 'groupName', description: '群組名稱' },
    { name: 'keyword', description: '匹配的關鍵詞' },
    { name: 'date', description: '當前日期' },
    { name: 'time', description: '當前時間' }
  ];

  // 計算屬性
  filteredTemplates = computed(() => {
    let result = this.templates();
    
    if (this.filterType !== 'all') {
      result = result.filter(t => t.templateType === this.filterType);
    }
    
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.content.toLowerCase().includes(query)
      );
    }
    
    return result;
  });

  previewContent = computed(() => {
    let content = this.editingTemplate.content || '在這裡輸入模板內容...';
    // 替換變量為示例值
    content = content.replace(/\{\{username\}\}/g, 'John_Doe');
    content = content.replace(/\{\{firstName\}\}/g, 'John');
    content = content.replace(/\{\{groupName\}\}/g, '加密貨幣交流群');
    content = content.replace(/\{\{keyword\}\}/g, '投資');
    content = content.replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
    content = content.replace(/\{\{time\}\}/g, new Date().toLocaleTimeString());
    return content;
  });

  // 🔧 FIX: 清理監聽器用
  private listeners: (() => void)[] = [];
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;

  ngOnInit() {
    // 🔧 FIX: 先設置監聯器，再發送請求，確保不會丟失事件
    this.setupListeners();
    
    // 🔧 FIX: 先檢查 StateService 是否已有數據（從 initial-state 加載）
    const stateTemplates = this.stateService.chatTemplates();
    if (stateTemplates.length > 0) {
      console.log('[ChatTemplates] Using existing StateService data:', stateTemplates.length, 'templates');
      this.updateTemplates(stateTemplates);
    } else {
      // 沒有數據則請求加載
      this.stateService.loadAll();
    }
    
    this.loadTemplates();
  }

  ngOnDestroy() {
    // 🔧 FIX: 清理監聽器防止內存洩漏
    this.listeners.forEach(cleanup => cleanup());
  }

  setupListeners() {
    // 監聽模板數據更新
    const cleanup1 = this.ipcService.on('get-chat-templates-result', (data: any) => {
      console.log('[ChatTemplates] Received get-chat-templates-result:', data);
      this.isLoading.set(false);
      this.retryCount = 0;  // 重置重試計數
      if (data.templates) {
        this.updateTemplates(data.templates);
      } else if (data.error) {
        console.error('[ChatTemplates] Error loading templates:', data.error);
        this.toastService.error('加載模板失敗: ' + data.error);
      }
    });
    this.listeners.push(cleanup1);

    // 從 initial-state 獲取數據
    const cleanup2 = this.ipcService.on('initial-state', (data: any) => {
      if (data.chatTemplates) {
        console.log('[ChatTemplates] Received from initial-state:', data.chatTemplates.length, 'templates');
        this.updateTemplates(data.chatTemplates);
      }
    });
    this.listeners.push(cleanup2);

    // 🔧 FIX: 監聽 initial-state-config（漸進式加載的第二階段）
    const cleanup3 = this.ipcService.on('initial-state-config', (data: any) => {
      if (data.chatTemplates) {
        console.log('[ChatTemplates] Received from initial-state-config:', data.chatTemplates.length, 'templates');
        this.updateTemplates(data.chatTemplates);
      }
    });
    this.listeners.push(cleanup3);

    const cleanup4 = this.ipcService.on('save-chat-template-result', (data: any) => {
      if (data.success) {
        this.toastService.success(this.isCreating() ? '模板創建成功' : '模板保存成功');
        this.loadTemplates();
        this.isCreating.set(false);
      } else {
        this.toastService.error(data.error || '保存失敗');
      }
    });
    this.listeners.push(cleanup4);

    const cleanup5 = this.ipcService.on('delete-chat-template-result', (data: any) => {
      if (data.success) {
        this.toastService.success('模板已刪除');
        this.selectedTemplate.set(null);
        this.loadTemplates();
      }
    });
    this.listeners.push(cleanup5);
  }

  loadTemplates() {
    this.isLoading.set(true);
    console.log('[ChatTemplates] Sending get-chat-templates request');
    this.ipcService.send('get-chat-templates');
    
    // 🔧 FIX: 添加超時重試機制
    setTimeout(() => {
      if (this.isLoading() && this.templates().length === 0 && this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        console.log(`[ChatTemplates] Retrying... (${this.retryCount}/${this.MAX_RETRIES})`);
        this.ipcService.send('get-chat-templates');
      } else if (this.isLoading()) {
        this.isLoading.set(false);
      }
    }, 3000);
  }

  // 轉換後端數據為本地格式
  updateTemplates(rawTemplates: any[]) {
    const templates: ChatTemplateData[] = rawTemplates.map(t => {
      // 解析 variables
      let variables: string[] = [];
      if (t.variables) {
        if (typeof t.variables === 'string') {
          try {
            variables = JSON.parse(t.variables);
          } catch {
            variables = [];
          }
        } else if (Array.isArray(t.variables)) {
          variables = t.variables;
        }
      }

      return {
        id: String(t.id),
        name: t.name,
        content: t.content || '',
        templateType: (t.template_type || t.templateType || 'custom') as ChatTemplateData['templateType'],
        variables,
        usageCount: t.usage_count || t.usageCount || 0,
        lastUsed: t.last_used || t.lastUsed,
        isActive: t.is_active !== false && t.isActive !== false,
        createdAt: t.created_at || t.createdAt,
        updatedAt: t.updated_at || t.updatedAt
      };
    });
    
    this.templates.set(templates);
    this.isLoading.set(false);

    // 如果有選中的模板，更新它
    const current = this.selectedTemplate();
    if (current) {
      const updated = templates.find(t => t.id === current.id);
      if (updated) {
        this.selectedTemplate.set(updated);
        this.editingTemplate = { ...updated };
      }
    }
  }

  createEmptyTemplate(): ChatTemplateData {
    return {
      id: '',
      name: '',
      content: '',
      templateType: 'custom',
      variables: [],
      usageCount: 0,
      isActive: true
    };
  }

  getTypeConfig(type: string) {
    return TEMPLATE_TYPES[type as keyof typeof TEMPLATE_TYPES] || TEMPLATE_TYPES.custom;
  }

  formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  }

  createNewTemplate() {
    this.selectedTemplate.set(null);
    this.isCreating.set(true);
    this.editingTemplate = this.createEmptyTemplate();
  }

  selectTemplate(template: ChatTemplateData) {
    this.selectedTemplate.set(template);
    this.isCreating.set(false);
    this.editingTemplate = { ...template };
  }

  insertVariable(variableName: string) {
    this.editingTemplate.content += `{{${variableName}}}`;
  }

  saveTemplate() {
    console.log('[ChatTemplates] saveTemplate called, isCreating:', this.isCreating());
    console.log('[ChatTemplates] editingTemplate:', this.editingTemplate);
    
    if (!this.editingTemplate.name.trim()) {
      this.toastService.error('請輸入模板名稱');
      return;
    }
    if (!this.editingTemplate.content.trim()) {
      this.toastService.error('請輸入模板內容');
      return;
    }

    // 提取使用的變量
    const usedVariables: string[] = [];
    const regex = /\{\{(\w+)\}\}/g;
    let match;
    while ((match = regex.exec(this.editingTemplate.content)) !== null) {
      if (!usedVariables.includes(match[1])) {
        usedVariables.push(match[1]);
      }
    }

    const payload = {
      id: this.isCreating() ? null : parseInt(this.editingTemplate.id),
      name: this.editingTemplate.name,
      content: this.editingTemplate.content,
      category: this.editingTemplate.templateType, // 後端使用 category 字段
      variables: usedVariables,
      isActive: this.editingTemplate.isActive
    };
    
    console.log('[ChatTemplates] Sending save-chat-template:', payload);
    this.ipcService.send('save-chat-template', payload);
    this.toastService.info('正在保存...');
  }

  async deleteTemplate() {
    if (!this.selectedTemplate()) return;
    
    const template = this.selectedTemplate()!;
    const confirmed = await this.confirmDialog.danger(
      '刪除聊天模板',
      `確定要刪除模板「${template.name}」嗎？\n此操作無法撤銷。`,
      [template.name]
    );
    
    if (confirmed) {
      this.ipcService.send('delete-chat-template', { id: parseInt(template.id) });
    }
  }
}
