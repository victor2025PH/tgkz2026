/**
 * 角色編輯器組件
 * Role Editor Component
 * 
 * 完整的角色定義和編輯功能
 */

import { Component, signal, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  RoleDefinition, 
  RoleType, 
  SpeakingStyle,
  ROLE_TYPE_META 
} from '../multi-role.models';
import { MultiRoleService } from '../multi-role.service';

@Component({
  selector: 'app-role-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="role-editor fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl border border-slate-700">
        <!-- 標題欄 -->
        <div class="p-6 border-b border-slate-700 flex items-center justify-between">
          <h2 class="text-xl font-bold text-white flex items-center gap-3">
            <span class="text-2xl">{{ isNew() ? '🎭' : getRoleIcon(editData.type) }}</span>
            {{ isNew() ? '創建新角色' : '編輯角色' }}
          </h2>
          <button (click)="cancel()" class="text-slate-400 hover:text-white">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        
        <!-- 內容區 -->
        <div class="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <!-- 步驟 1: 基礎信息 -->
          <div class="mb-8">
            <h3 class="text-sm font-semibold text-purple-400 mb-4 flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs">1</span>
              基礎信息
            </h3>
            
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label class="text-sm text-slate-400 block mb-2">角色類型 *</label>
                <div class="grid grid-cols-3 gap-2">
                  @for (type of roleTypes; track type.id) {
                    <button (click)="editData.type = type.id; onTypeChange()"
                            class="p-2 rounded-lg text-center transition-all border-2"
                            [class.border-purple-500]="editData.type === type.id"
                            [class.bg-purple-500/10]="editData.type === type.id"
                            [class.border-transparent]="editData.type !== type.id"
                            [class.bg-slate-700]="editData.type !== type.id">
                      <div class="text-xl mb-0.5">{{ type.icon }}</div>
                      <div class="text-xs"
                           [class.text-purple-400]="editData.type === type.id"
                           [class.text-slate-400]="editData.type !== type.id">
                        {{ type.label }}
                      </div>
                    </button>
                  }
                </div>
              </div>
              
              <div>
                <label class="text-sm text-slate-400 block mb-2">角色名稱 *</label>
                <input type="text"
                       [(ngModel)]="editData.name"
                       placeholder="如：產品專家 Mira"
                       class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500">
              </div>
            </div>
            
            <div>
              <label class="text-sm text-slate-400 block mb-2">人設描述</label>
              <textarea rows="2"
                        [(ngModel)]="editData.personality.description"
                        placeholder="描述這個角色的背景和特點..."
                        class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 resize-none">
              </textarea>
            </div>
          </div>
          
          <!-- 步驟 2: 性格特徵 -->
          <div class="mb-8">
            <h3 class="text-sm font-semibold text-purple-400 mb-4 flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs">2</span>
              性格特徵
            </h3>
            
            <div class="mb-4">
              <label class="text-sm text-slate-400 block mb-2">說話風格</label>
              <div class="flex flex-wrap gap-2">
                @for (style of speakingStyles; track style.id) {
                  <button (click)="editData.personality.speakingStyle = style.id"
                          class="px-4 py-2 rounded-lg transition-all"
                          [class.bg-purple-500]="editData.personality.speakingStyle === style.id"
                          [class.text-white]="editData.personality.speakingStyle === style.id"
                          [class.bg-slate-700]="editData.personality.speakingStyle !== style.id"
                          [class.text-slate-300]="editData.personality.speakingStyle !== style.id">
                    {{ style.icon }} {{ style.label }}
                  </button>
                }
              </div>
            </div>
            
            <div>
              <label class="text-sm text-slate-400 block mb-2">性格標籤</label>
              <div class="flex flex-wrap gap-2">
                @for (trait of availableTraits; track trait) {
                  <button (click)="toggleTrait(trait)"
                          class="px-3 py-1.5 rounded-lg text-sm transition-all"
                          [class.bg-purple-500/20]="editData.personality.traits.includes(trait)"
                          [class.text-purple-400]="editData.personality.traits.includes(trait)"
                          [class.bg-slate-700]="!editData.personality.traits.includes(trait)"
                          [class.text-slate-400]="!editData.personality.traits.includes(trait)">
                    {{ trait }}
                  </button>
                }
              </div>
            </div>
          </div>
          
          <!-- 步驟 3: AI 配置 -->
          <div class="mb-8">
            <h3 class="text-sm font-semibold text-purple-400 mb-4 flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs">3</span>
              AI 配置
            </h3>
            
            <div class="mb-4">
              <label class="text-sm text-slate-400 block mb-2">AI 人設 Prompt *</label>
              <textarea rows="4"
                        [(ngModel)]="editData.aiConfig.customPrompt"
                        placeholder="你是一位..."
                        class="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 resize-none font-mono text-sm">
              </textarea>
              <p class="text-xs text-slate-500 mt-1">定義這個角色說話的方式和行為特點</p>
            </div>
            
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label class="text-sm text-slate-400 block mb-2">回覆長度</label>
                <select [(ngModel)]="editData.aiConfig.responseLength"
                        class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                  <option value="short">簡短</option>
                  <option value="medium">適中</option>
                  <option value="long">詳細</option>
                </select>
              </div>
              
              <div>
                <label class="text-sm text-slate-400 block mb-2">Emoji 頻率</label>
                <select [(ngModel)]="editData.aiConfig.emojiFrequency"
                        class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                  <option value="none">不使用</option>
                  <option value="low">偶爾</option>
                  <option value="medium">適中</option>
                  <option value="high">頻繁</option>
                </select>
              </div>
              
              <div>
                <label class="text-sm text-slate-400 block mb-2">打字速度</label>
                <select [(ngModel)]="editData.aiConfig.typingSpeed"
                        class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white">
                  <option value="fast">快速</option>
                  <option value="medium">中等</option>
                  <option value="slow">慢速</option>
                  <option value="random">隨機</option>
                </select>
              </div>
            </div>
          </div>
          
          <!-- 步驟 4: 帳號綁定 -->
          <div class="mb-4">
            <h3 class="text-sm font-semibold text-purple-400 mb-4 flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs">4</span>
              帳號綁定
            </h3>
            
            <div>
              <label class="text-sm text-slate-400 block mb-2">綁定 Telegram 帳號</label>
              <select [(ngModel)]="editData.boundAccountId"
                      (ngModelChange)="onAccountSelect($event)"
                      class="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white">
                <option [value]="undefined">暫不綁定</option>
                @for (account of availableAccounts(); track account.id) {
                  <option [value]="account.id">
                    {{ account.phone }} {{ account.username ? '(@' + account.username + ')' : '' }}
                  </option>
                }
              </select>
              <p class="text-xs text-slate-500 mt-1">綁定帳號後，該角色將使用此帳號發送消息</p>
            </div>
          </div>
        </div>
        
        <!-- 底部操作 -->
        <div class="p-6 border-t border-slate-700 flex items-center justify-between">
          <div class="text-sm text-slate-400">
            @if (!isFormValid()) {
              <span class="text-yellow-400">⚠ 請填寫必要信息</span>
            }
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
              {{ isNew() ? '創建角色' : '保存更改' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RoleEditorComponent {
  private multiRoleService = inject(MultiRoleService);
  
  // 輸入
  role = input<RoleDefinition | null>(null);
  availableAccounts = input<{ id: number; phone: string; username?: string }[]>([]);
  
  // 輸出
  saved = output<RoleDefinition>();
  cancelled = output<void>();
  
  // 編輯數據
  editData: Partial<RoleDefinition> = this.getDefaultData();
  
  // 計算屬性
  isNew = computed(() => !this.role());
  
  roleTypes = Object.entries(ROLE_TYPE_META)
    .filter(([id]) => id !== 'custom')
    .map(([id, meta]) => ({
      id: id as RoleType,
      icon: meta.icon,
      label: meta.label
    }));
  
  speakingStyles: { id: SpeakingStyle; icon: string; label: string }[] = [
    { id: 'professional', icon: '👔', label: '專業正式' },
    { id: 'friendly', icon: '😊', label: '友好親切' },
    { id: 'casual', icon: '😎', label: '輕鬆隨意' },
    { id: 'enthusiastic', icon: '🔥', label: '熱情' },
    { id: 'careful', icon: '🤔', label: '謹慎' },
    { id: 'curious', icon: '❓', label: '好奇' }
  ];
  
  availableTraits = [
    '專業', '耐心', '熱情', '細心', '幽默', '真誠',
    '善於傾聽', '善於說服', '邏輯清晰', '經驗豐富'
  ];
  
  constructor() {
    // 監聽輸入變化
    const roleInput = this.role;
    if (roleInput()) {
      this.loadRole(roleInput()!);
    }
  }
  
  ngOnInit() {
    const role = this.role();
    if (role) {
      this.loadRole(role);
    }
  }
  
  private getDefaultData(): Partial<RoleDefinition> {
    return {
      name: '',
      type: 'expert',
      personality: {
        description: '',
        speakingStyle: 'friendly',
        traits: []
      },
      aiConfig: {
        useGlobalAI: true,
        customPrompt: ROLE_TYPE_META.expert.defaultPrompt,
        responseLength: 'medium',
        emojiFrequency: 'low',
        typingSpeed: 'medium'
      },
      responsibilities: [],
      isActive: true
    };
  }
  
  private loadRole(role: RoleDefinition) {
    this.editData = {
      ...role,
      personality: { ...role.personality },
      aiConfig: { ...role.aiConfig }
    };
  }
  
  getRoleIcon(type: RoleType): string {
    return ROLE_TYPE_META[type]?.icon || '🎭';
  }
  
  onTypeChange() {
    const type = this.editData.type!;
    const meta = ROLE_TYPE_META[type];
    
    // 如果名稱為空或是默認名稱，自動更新
    if (!this.editData.name || this.roleTypes.some(t => t.label === this.editData.name)) {
      this.editData.name = meta.label;
    }
    
    // 更新默認描述和 Prompt
    if (!this.editData.personality!.description) {
      this.editData.personality!.description = meta.description;
    }
    
    if (!this.editData.aiConfig!.customPrompt || 
        Object.values(ROLE_TYPE_META).some(m => m.defaultPrompt === this.editData.aiConfig!.customPrompt)) {
      this.editData.aiConfig!.customPrompt = meta.defaultPrompt;
    }
    
    this.editData.personality!.speakingStyle = meta.defaultStyle;
  }
  
  toggleTrait(trait: string) {
    const traits = this.editData.personality!.traits;
    const index = traits.indexOf(trait);
    
    if (index >= 0) {
      traits.splice(index, 1);
    } else {
      traits.push(trait);
    }
  }
  
  onAccountSelect(accountId: number) {
    const account = this.availableAccounts().find(a => a.id === accountId);
    if (account) {
      this.editData.boundAccountId = account.id;
      this.editData.boundAccountPhone = account.phone;
    } else {
      this.editData.boundAccountId = undefined;
      this.editData.boundAccountPhone = undefined;
    }
  }
  
  isFormValid(): boolean {
    return !!(
      this.editData.name?.trim() &&
      this.editData.type &&
      this.editData.aiConfig?.customPrompt?.trim()
    );
  }
  
  save() {
    if (!this.isFormValid()) return;
    
    const roleData: Partial<RoleDefinition> = {
      ...this.editData,
      updatedAt: new Date().toISOString()
    };
    
    if (this.isNew()) {
      const id = this.multiRoleService.addRole(roleData);
      const newRole = this.multiRoleService.roles().find(r => r.id === id);
      if (newRole) {
        this.saved.emit(newRole);
      }
    } else {
      this.multiRoleService.updateRole(this.role()!.id, roleData);
      this.saved.emit({ ...this.role()!, ...roleData } as RoleDefinition);
    }
  }
  
  cancel() {
    this.cancelled.emit();
  }
}
