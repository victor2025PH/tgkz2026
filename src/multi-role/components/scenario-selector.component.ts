/**
 * 場景模板選擇組件
 * Scenario Template Selector Component
 * 
 * 功能:
 * 1. 10個預設場景展示
 * 2. 場景詳情預覽
 * 3. 一鍵應用場景模板
 */

import { Component, signal, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  PRESET_SCENARIOS, 
  PresetScenario, 
  SCENARIO_META, 
  ScenarioType 
} from '../preset-scenarios';

@Component({
  selector: 'app-scenario-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="scenario-selector">
      <!-- 場景卡片網格 -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 p-4">
        @for (scenario of PRESET_SCENARIOS; track scenario.id) {
          <div (click)="selectScenario(scenario)"
               [class.ring-2]="selectedScenario()?.id === scenario.id"
               [class.ring-cyan-500]="selectedScenario()?.id === scenario.id"
               class="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 cursor-pointer 
                      hover:border-cyan-500/50 hover:bg-slate-800 transition-all group">
            <!-- 場景圖標和名稱 -->
            <div class="flex items-center gap-3 mb-3">
              <div class="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 
                          flex items-center justify-center text-2xl">
                {{ getScenarioMeta(scenario.type).icon }}
              </div>
              <div>
                <h3 class="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                  {{ scenario.name }}
                </h3>
                <div class="flex items-center gap-2 text-xs">
                  <span [class]="getDifficultyColor(getScenarioMeta(scenario.type).difficulty)">
                    {{ getDifficultyLabel(getScenarioMeta(scenario.type).difficulty) }}
                  </span>
                  <span class="text-slate-500">·</span>
                  <span class="text-slate-400">{{ getScenarioMeta(scenario.type).duration }}</span>
                </div>
              </div>
            </div>
            
            <!-- 場景描述 -->
            <p class="text-sm text-slate-400 mb-3 line-clamp-2">
              {{ getScenarioMeta(scenario.type).description }}
            </p>
            
            <!-- 參與角色 -->
            <div class="flex items-center gap-1 mb-3">
              @for (role of scenario.roles.slice(0, 3); track $index) {
                <div class="w-7 h-7 rounded-full bg-slate-700/50 flex items-center justify-center text-sm"
                     [title]="getRoleLabel(role.roleType)">
                  {{ getRoleEmoji(role.roleType) }}
                </div>
              }
              @if (scenario.roles.length > 3) {
                <div class="w-7 h-7 rounded-full bg-slate-700/50 flex items-center justify-center text-xs text-slate-400">
                  +{{ scenario.roles.length - 3 }}
                </div>
              }
            </div>
            
            <!-- 成功率 -->
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">成功率</span>
              <span class="text-cyan-400 font-medium">{{ getScenarioMeta(scenario.type).successRate }}</span>
            </div>
          </div>
        }
      </div>
      
      <!-- 場景詳情彈窗 -->
      @if (selectedScenario(); as scenario) {
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
             (click)="selectedScenario.set(null)">
          <div class="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
               (click)="$event.stopPropagation()">
            <!-- 頭部 -->
            <div class="p-6 border-b border-slate-700/50 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div class="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 
                              flex items-center justify-center text-3xl">
                    {{ getScenarioMeta(scenario.type).icon }}
                  </div>
                  <div>
                    <h2 class="text-xl font-bold text-white">{{ scenario.name }}</h2>
                    <p class="text-slate-400">{{ scenario.description }}</p>
                  </div>
                </div>
                <button (click)="selectedScenario.set(null)"
                        class="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
            
            <!-- 內容區 -->
            <div class="p-6 overflow-y-auto max-h-[60vh] space-y-6">
              <!-- 角色配置 -->
              <div>
                <h3 class="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                  <span>👥</span> 參與角色
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                  @for (role of scenario.roles; track $index) {
                    <div class="bg-slate-800/50 rounded-lg p-3">
                      <div class="flex items-center gap-2 mb-2">
                        <span class="text-xl">{{ getRoleEmoji(role.roleType) }}</span>
                        <span class="text-white font-medium">{{ getRoleLabel(role.roleType) }}</span>
                        @if (role.isRequired) {
                          <span class="text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">必需</span>
                        }
                      </div>
                      <p class="text-xs text-slate-400">{{ role.purpose }}</p>
                    </div>
                  }
                </div>
              </div>
              
              <!-- 流程階段 -->
              <div>
                <h3 class="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                  <span>📋</span> 流程階段
                </h3>
                <div class="relative">
                  <!-- 連接線 -->
                  <div class="absolute left-6 top-8 bottom-8 w-0.5 bg-slate-700"></div>
                  
                  <div class="space-y-4">
                    @for (stage of scenario.stages; track stage.id; let i = $index) {
                      <div class="relative flex gap-4">
                        <!-- 序號 -->
                        <div class="relative z-10 w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 
                                    flex items-center justify-center text-white font-bold flex-shrink-0">
                          {{ i + 1 }}
                        </div>
                        
                        <!-- 階段內容 -->
                        <div class="flex-1 bg-slate-800/50 rounded-lg p-4">
                          <div class="flex items-center justify-between mb-2">
                            <h4 class="font-medium text-white">{{ stage.name }}</h4>
                            <div class="flex items-center gap-2 text-xs">
                              <span class="text-slate-400">{{ getRoleEmoji(stage.roleType) }} {{ getRoleLabel(stage.roleType) }}</span>
                              @if (stage.delaySeconds) {
                                <span class="text-cyan-400">{{ formatDelay(stage.delaySeconds) }}</span>
                              }
                            </div>
                          </div>
                          <p class="text-sm text-slate-300 italic">"{{ stage.messageTemplate }}"</p>
                          @if (stage.successCondition) {
                            <p class="text-xs text-green-400 mt-2">✓ {{ stage.successCondition }}</p>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              </div>
              
              <!-- 使用提示 -->
              <div>
                <h3 class="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                  <span>💡</span> 使用提示
                </h3>
                <div class="space-y-2">
                  @for (tip of scenario.tips; track tip) {
                    <div class="flex items-start gap-2 text-sm text-slate-300">
                      <span class="text-amber-400 flex-shrink-0">•</span>
                      <span>{{ tip }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
            
            <!-- 底部操作 -->
            <div class="p-6 border-t border-slate-700/50 bg-slate-900/50 flex justify-end gap-3">
              <button (click)="selectedScenario.set(null)"
                      class="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
                取消
              </button>
              <button (click)="applyScenario(scenario)"
                      class="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600
                             text-white font-medium rounded-lg transition-all flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                </svg>
                應用此場景
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class ScenarioSelectorComponent {
  // 輸出事件
  scenarioApplied = output<PresetScenario>();
  
  // 數據
  PRESET_SCENARIOS = PRESET_SCENARIOS;
  
  // 狀態
  selectedScenario = signal<PresetScenario | null>(null);
  
  selectScenario(scenario: PresetScenario) {
    this.selectedScenario.set(scenario);
  }
  
  applyScenario(scenario: PresetScenario) {
    this.scenarioApplied.emit(scenario);
    this.selectedScenario.set(null);
  }
  
  getScenarioMeta(type: ScenarioType) {
    return SCENARIO_META[type];
  }
  
  getDifficultyColor(difficulty: string): string {
    const colors: Record<string, string> = {
      'easy': 'text-green-400',
      'medium': 'text-yellow-400',
      'hard': 'text-red-400'
    };
    return colors[difficulty] || 'text-slate-400';
  }
  
  getDifficultyLabel(difficulty: string): string {
    const labels: Record<string, string> = {
      'easy': '簡單',
      'medium': '中等',
      'hard': '困難'
    };
    return labels[difficulty] || difficulty;
  }
  
  getRoleEmoji(roleType: string): string {
    const emojiMap: Record<string, string> = {
      'friendly_member': '😄',
      'loyal_customer': '❤️',
      'sales_manager': '👔',
      'account_manager': '💼',
      'price_specialist': '💰',
      'regional_director': '👑',
      'cs_agent': '🎧',
      'tech_support': '🔧',
      'complaint_handler': '😊',
      'vip_service': '⭐',
      'solution_expert': '📊',
      'founder_ceo': '👔',
      'community_manager': '🏠',
      'opinion_leader': '🎤',
      'brand_ambassador': '🏆',
      'tech_blogger': '📱',
      'event_operator': '🎉',
      'education_consultant': '📚',
      'trainer': '👨‍🏫',
      'business_manager': '🤝',
      'solution_architect': '🏗️',
      'project_manager': '📋',
      'competitor_analyst': '🔍',
      'product_engineer': '⚙️',
      'callback_agent': '📞',
      'customer_success': '🎯'
    };
    return emojiMap[roleType] || '🎭';
  }
  
  getRoleLabel(roleType: string): string {
    const labelMap: Record<string, string> = {
      'friendly_member': '熱心群友',
      'loyal_customer': '老用戶',
      'sales_manager': '銷售經理',
      'account_manager': '客戶經理',
      'price_specialist': '價格專員',
      'regional_director': '區域總監',
      'cs_agent': '客服專員',
      'tech_support': '技術支持',
      'complaint_handler': '投訴處理專員',
      'vip_service': 'VIP客服',
      'solution_expert': '方案專家',
      'founder_ceo': '創始人',
      'community_manager': '社群管家',
      'opinion_leader': '意見領袖',
      'brand_ambassador': '品牌大使',
      'tech_blogger': '科技博主',
      'event_operator': '活動運營',
      'education_consultant': '教育諮詢師',
      'trainer': '培訓講師',
      'business_manager': '招商經理',
      'solution_architect': '解決方案架構師',
      'project_manager': '項目經理',
      'competitor_analyst': '競品分析師',
      'product_engineer': '產品工程師',
      'callback_agent': '回訪專員',
      'customer_success': '客戶成功經理'
    };
    return labelMap[roleType] || roleType;
  }
  
  formatDelay(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}秒後`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}分鐘後`;
    } else if (seconds < 86400) {
      return `${Math.floor(seconds / 3600)}小時後`;
    } else {
      return `${Math.floor(seconds / 86400)}天後`;
    }
  }
}
