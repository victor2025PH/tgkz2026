/**
 * 角色庫管理組件
 * Role Library Management Component
 * 
 * 功能:
 * 1. 50個預設角色展示
 * 2. 分類篩選
 * 3. 搜索功能
 * 4. 角色詳情預覽
 * 5. 角色使用統計
 * 6. 一鍵添加到劇本
 */

import { Component, signal, computed, inject, OnInit, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  PRESET_ROLES, 
  PresetRole, 
  RoleCategory, 
  ROLE_CATEGORIES,
  getRolesByCategory,
  presetToRoleDefinition
} from '../preset-roles';
import { RoleDefinition } from '../multi-role.models';

@Component({
  selector: 'app-role-library',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="role-library h-full flex flex-col bg-slate-900">
      <!-- 頂部標題欄 -->
      <div class="p-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🎭</span>
            <h2 class="text-xl font-bold text-white">角色庫</h2>
            <span class="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-lg">
              {{ PRESET_ROLES.length }} 個預設角色
            </span>
          </div>
          
          <!-- 搜索框 -->
          <div class="relative">
            <input type="text" 
                   [(ngModel)]="searchQuery"
                   placeholder="搜索角色..."
                   class="w-64 bg-slate-800/50 border border-slate-600/50 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
        </div>
        
        <!-- 分類 Tab -->
        <div class="flex items-center gap-2 overflow-x-auto pb-2">
          <button (click)="selectedCategory.set(null)"
                  [class]="!selectedCategory() ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white' : 'bg-slate-800/50 text-slate-400 hover:text-white'"
                  class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap">
            <span>🌟</span>
            <span>全部</span>
            <span class="text-xs opacity-70">({{ PRESET_ROLES.length }})</span>
          </button>
          @for (cat of categoryList; track cat.key) {
            <button (click)="selectedCategory.set(cat.key)"
                    [class]="selectedCategory() === cat.key ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white' : 'bg-slate-800/50 text-slate-400 hover:text-white'"
                    class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap">
              <span>{{ cat.icon }}</span>
              <span>{{ cat.label }}</span>
              <span class="text-xs opacity-70">({{ getRoleCategoryCount(cat.key) }})</span>
            </button>
          }
        </div>
      </div>
      
      <!-- 角色卡片網格 -->
      <div class="flex-1 overflow-y-auto p-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          @for (role of filteredRoles(); track role.id) {
            <div (click)="selectRole(role)"
                 [class.ring-2]="selectedRole()?.id === role.id"
                 [class.ring-cyan-500]="selectedRole()?.id === role.id"
                 class="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 cursor-pointer 
                        hover:border-cyan-500/50 hover:bg-slate-800 transition-all group">
              <!-- 頭部：頭像和名稱 -->
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                       [class]="getCategoryBgColor(role.category)">
                    {{ getRoleEmoji(role) }}
                  </div>
                  <div>
                    <h3 class="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                      {{ role.name }}
                    </h3>
                    <span class="text-xs px-2 py-0.5 rounded"
                          [class]="getCategoryBadgeColor(role.category)">
                      {{ getCategoryLabel(role.category) }}
                    </span>
                  </div>
                </div>
                
                <!-- 快速添加按鈕 -->
                <button (click)="addRole(role); $event.stopPropagation()"
                        class="opacity-0 group-hover:opacity-100 transition-opacity
                               bg-cyan-500 hover:bg-cyan-600 text-white p-2 rounded-lg"
                        title="添加到劇本">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                </button>
              </div>
              
              <!-- 人設描述 -->
              <p class="text-sm text-slate-400 mb-3 line-clamp-2">
                {{ role.personality.description }}
              </p>
              
              <!-- 性格特點標籤 -->
              <div class="flex flex-wrap gap-1 mb-3">
                @for (trait of role.personality.traits.slice(0, 3); track trait) {
                  <span class="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300">
                    {{ trait }}
                  </span>
                }
                @if (role.personality.traits.length > 3) {
                  <span class="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-500">
                    +{{ role.personality.traits.length - 3 }}
                  </span>
                }
              </div>
              
              <!-- 適用場景 -->
              <div class="flex items-center gap-2 text-xs text-slate-500">
                <span>📍</span>
                <span>{{ role.scenarios.slice(0, 2).join(' · ') }}</span>
              </div>
            </div>
          } @empty {
            <div class="col-span-full text-center py-12 text-slate-500">
              <div class="text-4xl mb-3">🔍</div>
              <p>沒有找到匹配的角色</p>
              <p class="text-sm mt-1">嘗試調整搜索關鍵詞或切換分類</p>
            </div>
          }
        </div>
      </div>
      
      <!-- 角色詳情側邊欄 -->
      @if (selectedRole(); as role) {
        <div class="fixed inset-y-0 right-0 w-96 bg-slate-900 border-l border-slate-700/50 shadow-2xl z-50 overflow-y-auto">
          <!-- 關閉按鈕 -->
          <button (click)="selectedRole.set(null)"
                  class="absolute top-4 right-4 text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
          
          <!-- 角色頭部 -->
          <div class="p-6 border-b border-slate-700/50">
            <div class="flex items-center gap-4 mb-4">
              <div class="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                   [class]="getCategoryBgColor(role.category)">
                {{ getRoleEmoji(role) }}
              </div>
              <div>
                <h2 class="text-xl font-bold text-white">{{ role.name }}</h2>
                <span class="text-sm px-2 py-0.5 rounded"
                      [class]="getCategoryBadgeColor(role.category)">
                  {{ getCategoryLabel(role.category) }}
                </span>
              </div>
            </div>
            
            <!-- 操作按鈕 -->
            <div class="flex gap-2">
              <button (click)="addRole(role)"
                      class="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600
                             text-white font-medium py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                添加到劇本
              </button>
              <button (click)="editRole(role)"
                      class="bg-slate-700 hover:bg-slate-600 text-white py-2.5 px-4 rounded-lg transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- 詳細信息 -->
          <div class="p-6 space-y-6">
            <!-- 人設描述 -->
            <div>
              <h3 class="text-sm font-medium text-slate-400 mb-2">人設描述</h3>
              <p class="text-white">{{ role.personality.description }}</p>
            </div>
            
            <!-- 背景故事 -->
            @if (role.personality.background) {
              <div>
                <h3 class="text-sm font-medium text-slate-400 mb-2">背景故事</h3>
                <p class="text-slate-300">{{ role.personality.background }}</p>
              </div>
            }
            
            <!-- 性格特點 -->
            <div>
              <h3 class="text-sm font-medium text-slate-400 mb-2">性格特點</h3>
              <div class="flex flex-wrap gap-2">
                @for (trait of role.personality.traits; track trait) {
                  <span class="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-sm">
                    {{ trait }}
                  </span>
                }
              </div>
            </div>
            
            <!-- 職責範圍 -->
            <div>
              <h3 class="text-sm font-medium text-slate-400 mb-2">職責範圍</h3>
              <div class="space-y-1">
                @for (resp of role.responsibilities; track resp) {
                  <div class="flex items-center gap-2 text-sm text-slate-300">
                    <span class="text-cyan-400">✓</span>
                    <span>{{ resp }}</span>
                  </div>
                }
              </div>
            </div>
            
            <!-- 適用場景 -->
            <div>
              <h3 class="text-sm font-medium text-slate-400 mb-2">適用場景</h3>
              <div class="flex flex-wrap gap-2">
                @for (scenario of role.scenarios; track scenario) {
                  <span class="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-sm">
                    📍 {{ scenario }}
                  </span>
                }
              </div>
            </div>
            
            <!-- 常用語句 -->
            <div>
              <h3 class="text-sm font-medium text-slate-400 mb-2">常用語句</h3>
              <div class="space-y-2">
                @for (phrase of role.keyPhrases; track phrase) {
                  <div class="p-3 bg-slate-800/50 rounded-lg text-sm text-slate-300 italic">
                    "{{ phrase }}"
                  </div>
                }
              </div>
            </div>
            
            <!-- AI 配置 -->
            <div>
              <h3 class="text-sm font-medium text-slate-400 mb-2">AI 配置</h3>
              <div class="grid grid-cols-2 gap-3">
                <div class="p-3 bg-slate-800/50 rounded-lg">
                  <p class="text-xs text-slate-500">回覆長度</p>
                  <p class="text-sm text-white">{{ getResponseLengthLabel(role.aiConfig.responseLength) }}</p>
                </div>
                <div class="p-3 bg-slate-800/50 rounded-lg">
                  <p class="text-xs text-slate-500">Emoji 頻率</p>
                  <p class="text-sm text-white">{{ getEmojiFrequencyLabel(role.aiConfig.emojiFrequency) }}</p>
                </div>
                <div class="p-3 bg-slate-800/50 rounded-lg">
                  <p class="text-xs text-slate-500">說話風格</p>
                  <p class="text-sm text-white">{{ getSpeakingStyleLabel(role.personality.speakingStyle) }}</p>
                </div>
                <div class="p-3 bg-slate-800/50 rounded-lg">
                  <p class="text-xs text-slate-500">打字速度</p>
                  <p class="text-sm text-white">{{ getTypingSpeedLabel(role.aiConfig.typingSpeed) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class RoleLibraryComponent implements OnInit {
  // 輸出事件
  roleAdded = output<RoleDefinition>();
  roleEdit = output<PresetRole>();
  
  // 狀態
  PRESET_ROLES = PRESET_ROLES;
  searchQuery = '';
  selectedCategory = signal<RoleCategory | null>(null);
  selectedRole = signal<PresetRole | null>(null);
  
  // 分類列表
  categoryList = Object.entries(ROLE_CATEGORIES).map(([key, value]) => ({
    key: key as RoleCategory,
    ...value
  }));
  
  // 過濾後的角色列表
  filteredRoles = computed(() => {
    let roles = PRESET_ROLES;
    
    // 分類過濾
    const category = this.selectedCategory();
    if (category) {
      roles = roles.filter(r => r.category === category);
    }
    
    // 搜索過濾
    const query = this.searchQuery.toLowerCase().trim();
    if (query) {
      roles = roles.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.personality.description.toLowerCase().includes(query) ||
        r.personality.traits.some(t => t.toLowerCase().includes(query)) ||
        r.scenarios.some(s => s.toLowerCase().includes(query))
      );
    }
    
    return roles;
  });
  
  ngOnInit() {}
  
  getRoleCategoryCount(category: RoleCategory): number {
    return PRESET_ROLES.filter(r => r.category === category).length;
  }
  
  selectRole(role: PresetRole) {
    this.selectedRole.set(role);
  }
  
  addRole(role: PresetRole) {
    const roleDefinition = presetToRoleDefinition(role);
    this.roleAdded.emit(roleDefinition);
    // 可以添加 toast 提示
  }
  
  editRole(role: PresetRole) {
    this.roleEdit.emit(role);
  }
  
  getRoleEmoji(role: PresetRole): string {
    const emojiMap: Record<string, string> = {
      // 銷售類
      'sales_manager': '👔',
      'product_consultant': '🎯',
      'account_manager': '💼',
      'sales_rep': '🙋',
      'solution_expert': '📊',
      'price_specialist': '💰',
      'regional_director': '👑',
      'business_manager': '🤝',
      // 技術類
      'tech_support': '🔧',
      'product_engineer': '⚙️',
      'solution_architect': '🏗️',
      'ops_expert': '🖥️',
      'security_advisor': '🔒',
      'dev_relations': '👨‍💻',
      // 客服類
      'cs_agent': '🎧',
      'complaint_handler': '😊',
      'vip_service': '⭐',
      'presales_advisor': '💬',
      'aftersales_agent': '📋',
      'community_manager': '🏠',
      // 行業專家
      'finance_advisor': '📈',
      'ecommerce_expert': '🛒',
      'education_consultant': '📚',
      'health_advisor': '💊',
      'property_consultant': '🏠',
      'travel_expert': '✈️',
      'beauty_influencer': '💄',
      'tech_blogger': '📱',
      // 社交類
      'friendly_member': '😄',
      'loyal_customer': '❤️',
      'industry_veteran': '🎖️',
      'curious_observer': '👀',
      'opinion_leader': '🎤',
      'newbie_user': '🌱',
      // 運營類
      'event_operator': '🎉',
      'content_editor': '✍️',
      'brand_ambassador': '🏆',
      'growth_expert': '📈',
      'partner_manager': '🤝',
      'market_analyst': '📊',
      // 管理類
      'group_admin': '👮',
      'founder_ceo': '👔',
      'project_manager': '📋',
      'customer_success': '🎯',
      'trainer': '👨‍🏫',
      // 特殊場景
      'flash_sale_agent': '⏰',
      'competitor_analyst': '🔍',
      'callback_agent': '📞',
      'crisis_pr': '🛡️',
      'ai_assistant': '🤖'
    };
    return emojiMap[role.roleType] || '🎭';
  }
  
  getCategoryBgColor(category: RoleCategory): string {
    const colorMap: Record<RoleCategory, string> = {
      sales: 'bg-blue-500/20',
      tech: 'bg-purple-500/20',
      service: 'bg-green-500/20',
      expert: 'bg-amber-500/20',
      social: 'bg-pink-500/20',
      operation: 'bg-orange-500/20',
      management: 'bg-slate-500/20',
      special: 'bg-cyan-500/20'
    };
    return colorMap[category] || 'bg-slate-500/20';
  }
  
  getCategoryBadgeColor(category: RoleCategory): string {
    const colorMap: Record<RoleCategory, string> = {
      sales: 'bg-blue-500/20 text-blue-400',
      tech: 'bg-purple-500/20 text-purple-400',
      service: 'bg-green-500/20 text-green-400',
      expert: 'bg-amber-500/20 text-amber-400',
      social: 'bg-pink-500/20 text-pink-400',
      operation: 'bg-orange-500/20 text-orange-400',
      management: 'bg-slate-500/20 text-slate-400',
      special: 'bg-cyan-500/20 text-cyan-400'
    };
    return colorMap[category] || 'bg-slate-500/20 text-slate-400';
  }
  
  getCategoryLabel(category: RoleCategory): string {
    return ROLE_CATEGORIES[category]?.label || '未分類';
  }
  
  getResponseLengthLabel(length: string): string {
    const labels: Record<string, string> = {
      'short': '簡短',
      'medium': '適中',
      'long': '詳細'
    };
    return labels[length] || length;
  }
  
  getEmojiFrequencyLabel(freq: string): string {
    const labels: Record<string, string> = {
      'none': '不使用',
      'low': '偶爾',
      'medium': '適中',
      'high': '頻繁'
    };
    return labels[freq] || freq;
  }
  
  getSpeakingStyleLabel(style: string): string {
    const labels: Record<string, string> = {
      'professional': '專業正式',
      'friendly': '友好親切',
      'casual': '輕鬆隨意',
      'enthusiastic': '熱情活潑',
      'careful': '謹慎細緻',
      'curious': '好奇探索'
    };
    return labels[style] || style;
  }
  
  getTypingSpeedLabel(speed: string): string {
    const labels: Record<string, string> = {
      'fast': '快速',
      'medium': '適中',
      'slow': '慢速',
      'random': '隨機'
    };
    return labels[speed] || speed;
  }
}
