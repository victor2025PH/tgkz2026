/**
 * 劇本編輯器組件
 * Script Editor Component
 * 
 * 可視化劇本編排，支持多階段、多分支
 */

import { Component, signal, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  ScriptTemplate, 
  ScriptStage, 
  ScriptMessage,
  RoleDefinition,
  ROLE_TYPE_META 
} from '../multi-role.models';
import { MultiRoleService } from '../multi-role.service';

@Component({
  selector: 'app-script-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="script-editor fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl border border-slate-700">
        <!-- 標題欄 -->
        <div class="p-6 border-b border-slate-700 flex items-center justify-between">
          <h2 class="text-xl font-bold text-white flex items-center gap-3">
            <span class="text-2xl">📝</span>
            {{ isNew() ? '創建新劇本' : '編輯劇本' }}
          </h2>
          <div class="flex items-center gap-4">
            <!-- 預覽按鈕 -->
            <button (click)="togglePreview()"
                    class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2">
              <span>👁</span> {{ showPreview() ? '關閉預覽' : '預覽' }}
            </button>
            <button (click)="cancel()" class="text-slate-400 hover:text-white">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        
        <!-- 主體內容 -->
        <div class="flex h-[calc(90vh-180px)]">
          <!-- 左側：劇本信息和階段列表 -->
          <div class="w-72 border-r border-slate-700 p-4 overflow-y-auto">
            <!-- 基礎信息 -->
            <div class="mb-6">
              <h4 class="text-sm font-semibold text-slate-400 mb-3">劇本信息</h4>
              
              <div class="mb-3">
                <label class="text-xs text-slate-500 block mb-1">劇本名稱</label>
                <input type="text"
                       [(ngModel)]="editData.name"
                       placeholder="如：VIP客戶轉化劇本"
                       class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
              </div>
              
              <div class="mb-3">
                <label class="text-xs text-slate-500 block mb-1">描述</label>
                <textarea rows="2"
                          [(ngModel)]="editData.description"
                          placeholder="劇本用途..."
                          class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm resize-none">
                </textarea>
              </div>
              
              <div>
                <label class="text-xs text-slate-500 block mb-1">適用場景</label>
                <select [(ngModel)]="editData.scenario"
                        class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                  <option value="high_intent_conversion">高意向轉化</option>
                  <option value="product_introduction">產品介紹</option>
                  <option value="objection_handling">異議處理</option>
                  <option value="custom">自定義</option>
                </select>
              </div>
            </div>
            
            <!-- 階段列表 -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-semibold text-slate-400">階段列表</h4>
                <button (click)="addStage()"
                        class="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs hover:bg-purple-500/30">
                  + 添加
                </button>
              </div>
              
              <div class="space-y-2">
                @for (stage of editData.stages; track stage.id; let i = $index) {
                  <div (click)="selectStage(i)"
                       class="p-3 rounded-lg cursor-pointer transition-all"
                       [class.bg-purple-500/20]="selectedStageIndex() === i"
                       [class.border-purple-500]="selectedStageIndex() === i"
                       [class.border]="selectedStageIndex() === i"
                       [class.bg-slate-700/50]="selectedStageIndex() !== i">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-sm font-medium"
                            [class.text-purple-400]="selectedStageIndex() === i"
                            [class.text-white]="selectedStageIndex() !== i">
                        {{ i + 1 }}. {{ stage.name }}
                      </span>
                      <button (click)="removeStage(i); $event.stopPropagation()"
                              class="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                    <div class="text-xs text-slate-500">
                      {{ stage.messages.length }} 條消息
                    </div>
                  </div>
                }
                
                @if (editData.stages.length === 0) {
                  <div class="text-center py-8 text-slate-500 text-sm">
                    點擊上方添加第一個階段
                  </div>
                }
              </div>
            </div>
          </div>
          
          <!-- 中間：階段編輯區 -->
          <div class="flex-1 p-6 overflow-y-auto">
            @if (currentStage(); as stage) {
              <!-- 階段信息 -->
              <div class="mb-6">
                <div class="flex items-center gap-4 mb-4">
                  <input type="text"
                         [(ngModel)]="stage.name"
                         placeholder="階段名稱"
                         class="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white flex-1">
                  
                  <select [(ngModel)]="stage.trigger.type"
                          class="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                    <option value="time">時間觸發</option>
                    <option value="message">消息觸發</option>
                    <option value="keyword">關鍵詞觸發</option>
                    <option value="manual">手動觸發</option>
                  </select>
                </div>
                
                @if (stage.trigger.type === 'time') {
                  <div class="flex items-center gap-2 text-sm text-slate-400 mb-4">
                    <span>延遲</span>
                    <input type="number"
                           [(ngModel)]="stage.trigger.delaySeconds"
                           min="0"
                           class="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-center">
                    <span>秒後執行</span>
                  </div>
                }
                
                @if (stage.trigger.type === 'keyword') {
                  <div class="flex items-center gap-2 text-sm text-slate-400 mb-4">
                    <span>關鍵詞（逗號分隔）</span>
                    <input type="text"
                           [ngModel]="getKeywordsString(stage)"
                           (ngModelChange)="setKeywords(stage, $event)"
                           placeholder="購買, 價格, 優惠"
                           class="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white">
                  </div>
                }
              </div>
              
              <!-- 消息列表 -->
              <div class="space-y-4">
                @for (msg of stage.messages; track msg.id; let j = $index) {
                  <div class="bg-slate-700/50 rounded-xl p-4 border border-slate-600/50">
                    <div class="flex items-start gap-4">
                      <!-- 角色選擇 -->
                      <div class="w-28">
                        <select [(ngModel)]="msg.roleId"
                                class="w-full px-2 py-1.5 bg-slate-600 border border-slate-500 rounded text-white text-sm">
                          @for (role of availableRoles(); track role.id) {
                            <option [value]="role.id">
                              {{ getRoleIcon(role.type) }} {{ role.name }}
                            </option>
                          }
                        </select>
                      </div>
                      
                      <!-- 消息內容 -->
                      <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                          <select [(ngModel)]="msg.content.type"
                                  class="px-2 py-1 bg-slate-600 border border-slate-500 rounded text-white text-xs">
                            <option value="text">固定文本</option>
                            <option value="ai_generate">AI 生成</option>
                            <option value="template">模板變量</option>
                          </select>
                          
                          <div class="flex items-center gap-2 text-xs text-slate-400">
                            <span>延遲</span>
                            <input type="number"
                                   [(ngModel)]="msg.timing.delayAfterPrevious"
                                   min="0"
                                   class="w-12 px-1 py-0.5 bg-slate-600 border border-slate-500 rounded text-white text-center">
                            <span>秒</span>
                          </div>
                        </div>
                        
                        @if (msg.content.type === 'text' || msg.content.type === 'template') {
                          <textarea rows="2"
                                    [(ngModel)]="msg.content.text"
                                    placeholder="輸入消息內容..."
                                    class="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm resize-none">
                          </textarea>
                          @if (msg.content.type === 'template') {
                            <div class="text-xs text-slate-500 mt-1">
                              可用變量: {{ '{' }}客戶名{{ '}' }}, {{ '{' }}產品名{{ '}' }}, {{ '{' }}價格{{ '}' }}
                            </div>
                          }
                        }
                        
                        @if (msg.content.type === 'ai_generate') {
                          <textarea rows="2"
                                    [(ngModel)]="msg.content.aiPrompt"
                                    placeholder="AI 生成指令，如：根據對話上下文回答客戶問題..."
                                    class="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm resize-none">
                          </textarea>
                        }
                      </div>
                      
                      <!-- 刪除按鈕 -->
                      <button (click)="removeMessage(stage, j)"
                              class="text-red-400 hover:text-red-300 mt-1">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                }
                
                <!-- 添加消息按鈕 -->
                <button (click)="addMessage(stage)"
                        class="w-full py-3 border-2 border-dashed border-slate-600 rounded-xl text-slate-400 
                               hover:border-purple-500 hover:text-purple-400 transition-colors flex items-center justify-center gap-2">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                  添加消息
                </button>
              </div>
            } @else {
              <div class="flex flex-col items-center justify-center h-full text-slate-500">
                <div class="text-5xl mb-4">📝</div>
                <div class="text-lg mb-2">選擇或創建一個階段</div>
                <div class="text-sm">在左側選擇階段開始編輯</div>
              </div>
            }
          </div>
          
          <!-- 右側：預覽區（可選顯示） -->
          @if (showPreview()) {
            <div class="w-80 border-l border-slate-700 p-4 bg-slate-900/50 overflow-y-auto">
              <h4 class="text-sm font-semibold text-slate-400 mb-4">對話預覽</h4>
              
              <div class="space-y-3">
                @for (stage of editData.stages; track stage.id) {
                  <div class="mb-4">
                    <div class="text-xs text-purple-400 mb-2">{{ stage.name }}</div>
                    
                    @for (msg of stage.messages; track msg.id) {
                      <div class="flex gap-2 mb-2">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 
                                    flex items-center justify-center text-white text-xs flex-shrink-0">
                          {{ getRoleIcon(getRoleById(msg.roleId)?.type || 'custom') }}
                        </div>
                        <div class="flex-1">
                          <div class="text-xs text-slate-400 mb-0.5">
                            {{ getRoleById(msg.roleId)?.name || '未知角色' }}
                          </div>
                          <div class="bg-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                            @if (msg.content.type === 'ai_generate') {
                              <span class="text-purple-400">[AI 生成]</span>
                            } @else {
                              {{ msg.content.text || '...' }}
                            }
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
        
        <!-- 底部操作 -->
        <div class="p-6 border-t border-slate-700 flex items-center justify-between">
          <div class="flex items-center gap-4 text-sm text-slate-400">
            <span>{{ editData.stages.length }} 個階段</span>
            <span>{{ getTotalMessages() }} 條消息</span>
          </div>
          
          <div class="flex gap-3">
            <button (click)="cancel()"
                    class="px-6 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors">
              取消
            </button>
            <button (click)="save()"
                    [disabled]="!isFormValid()"
                    class="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg 
                           hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
              {{ isNew() ? '創建劇本' : '保存劇本' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ScriptEditorComponent {
  private multiRoleService = inject(MultiRoleService);
  
  // 輸入
  script = input<ScriptTemplate | null>(null);
  
  // 輸出
  saved = output<ScriptTemplate>();
  cancelled = output<void>();
  
  // 狀態
  showPreview = signal(false);
  selectedStageIndex = signal(-1);
  
  // 編輯數據
  editData: Partial<ScriptTemplate> = this.getDefaultData();
  
  // 計算屬性
  isNew = computed(() => !this.script());
  availableRoles = computed(() => this.multiRoleService.roles());
  
  currentStage = computed(() => {
    const index = this.selectedStageIndex();
    if (index >= 0 && index < this.editData.stages!.length) {
      return this.editData.stages![index];
    }
    return null;
  });
  
  ngOnInit() {
    const script = this.script();
    if (script) {
      this.loadScript(script);
    }
  }
  
  private getDefaultData(): Partial<ScriptTemplate> {
    return {
      name: '',
      description: '',
      scenario: 'custom',
      stages: [],
      requiredRoles: [],
      minRoleCount: 1,
      stats: {
        useCount: 0,
        successCount: 0,
        avgDuration: 0,
        conversionRate: 0
      },
      isActive: true
    };
  }
  
  private loadScript(script: ScriptTemplate) {
    this.editData = {
      ...script,
      stages: script.stages.map(s => ({
        ...s,
        messages: s.messages.map(m => ({ ...m, content: { ...m.content }, timing: { ...m.timing } }))
      }))
    };
    
    if (this.editData.stages!.length > 0) {
      this.selectedStageIndex.set(0);
    }
  }
  
  getRoleIcon(type: string): string {
    return ROLE_TYPE_META[type as keyof typeof ROLE_TYPE_META]?.icon || '🎭';
  }
  
  getRoleById(roleId: string): RoleDefinition | undefined {
    return this.availableRoles().find(r => r.id === roleId);
  }
  
  // ========== 階段操作 ==========
  
  selectStage(index: number) {
    this.selectedStageIndex.set(index);
  }
  
  addStage() {
    const newStage: ScriptStage = {
      id: `stage_${Date.now()}`,
      name: `階段 ${this.editData.stages!.length + 1}`,
      order: this.editData.stages!.length,
      trigger: {
        type: 'time',
        delaySeconds: 0
      },
      messages: []
    };
    
    this.editData.stages!.push(newStage);
    this.selectedStageIndex.set(this.editData.stages!.length - 1);
  }
  
  removeStage(index: number) {
    this.editData.stages!.splice(index, 1);
    if (this.selectedStageIndex() >= this.editData.stages!.length) {
      this.selectedStageIndex.set(Math.max(0, this.editData.stages!.length - 1));
    }
  }
  
  // ========== 消息操作 ==========
  
  addMessage(stage: ScriptStage) {
    const roles = this.availableRoles();
    const defaultRoleId = roles.length > 0 ? roles[0].id : '';
    
    const newMessage: ScriptMessage = {
      id: `msg_${Date.now()}`,
      roleId: defaultRoleId,
      content: {
        type: 'text',
        text: ''
      },
      timing: {
        delayAfterPrevious: 5
      }
    };
    
    stage.messages.push(newMessage);
  }
  
  removeMessage(stage: ScriptStage, index: number) {
    stage.messages.splice(index, 1);
  }
  
  // ========== 其他 ==========
  
  togglePreview() {
    this.showPreview.update(v => !v);
  }
  
  getTotalMessages(): number {
    return this.editData.stages!.reduce((sum, stage) => sum + stage.messages.length, 0);
  }
  
  isFormValid(): boolean {
    return !!(
      this.editData.name?.trim() &&
      this.editData.stages!.length > 0 &&
      this.editData.stages!.some(s => s.messages.length > 0)
    );
  }
  
  save() {
    if (!this.isFormValid()) return;
    
    // 計算所需角色
    const roleIds = new Set<string>();
    const roles = this.availableRoles();
    
    this.editData.stages!.forEach(stage => {
      stage.messages.forEach(msg => {
        if (msg.roleId) {
          const role = roles.find(r => r.id === msg.roleId);
          if (role) roleIds.add(role.type);
        }
      });
    });
    this.editData.requiredRoles = Array.from(roleIds) as any;
    
    // 估算平均時長（秒轉分鐘）
    const totalSeconds = this.editData.stages!.reduce((sum, stage) => {
      const stageDelay = stage.trigger?.delaySeconds || 0;
      const messageDelays = stage.messages.reduce((s, m) => s + (m.timing.delayAfterPrevious || 0), 0);
      return sum + stageDelay + messageDelays;
    }, 0);
    
    if (this.editData.stats) {
      this.editData.stats.avgDuration = Math.ceil(totalSeconds / 60);
    }
    
    const scriptData: Partial<ScriptTemplate> = {
      ...this.editData,
      updatedAt: new Date().toISOString()
    };
    
    if (this.isNew()) {
      const id = this.multiRoleService.addScript(scriptData);
      const newScript = this.multiRoleService.scripts().find(s => s.id === id);
      if (newScript) {
        this.saved.emit(newScript);
      }
    } else {
      this.multiRoleService.updateScript(this.script()!.id, scriptData);
      this.saved.emit({ ...this.script()!, ...scriptData } as ScriptTemplate);
    }
  }
  
  cancel() {
    this.cancelled.emit();
  }
  
  // 輔助方法
  getKeywordsString(stage: ScriptStage): string {
    return stage.trigger?.keywords?.join(', ') || '';
  }
  
  setKeywords(stage: ScriptStage, value: string) {
    stage.trigger.keywords = value.split(',').map(s => s.trim()).filter(s => s);
  }
}
