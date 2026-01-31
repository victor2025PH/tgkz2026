/**
 * 快捷操作面板組件
 * Quick Actions Panel Component
 * 
 * 🆕 P3 階段：智能自動化增強
 * 
 * 功能：
 * - 一鍵啟動常用營銷配置
 * - 快速狀態預覽
 * - 智能推薦
 */

import { Component, signal, computed, inject, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SmartTimingService } from '../services/smart-timing.service';
import { SmartAutomationService, RoleRecommendation } from '../services/smart-automation.service';
import { MarketingAnalyticsService } from '../services/marketing-analytics.service';

// 快捷操作配置
interface QuickAction {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  category: 'marketing' | 'automation' | 'analysis';
  action: () => void;
  badge?: string;
  disabled?: boolean;
}

// 預設配置
interface PresetConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  roleCombo?: string[];
  targetType: 'group' | 'private' | 'both';
  timing: 'now' | 'smart' | 'scheduled';
  usageCount: number;
  lastUsed?: Date;
}

@Component({
  selector: 'app-quick-actions-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="quick-actions-panel bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      <!-- 頂部狀態欄 -->
      <div class="p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-slate-700">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-white flex items-center gap-2">
              <span>⚡</span> 快速啟動
            </h3>
            <p class="text-sm text-slate-400 mt-1">一鍵開始營銷任務</p>
          </div>
          
          <!-- 時機指示器 -->
          <div class="flex items-center gap-3">
            <div class="text-right">
              <div class="text-xs text-slate-400">當前時機</div>
              <div class="flex items-center gap-1">
                <span class="text-lg font-bold" [class]="timingScoreClass()">
                  {{ timingStatus().score }}
                </span>
                <span class="text-xs text-slate-400">分</span>
              </div>
            </div>
            <div class="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                 [class]="timingBgClass()">
              {{ timingStatus().isGood ? '✓' : '⏰' }}
            </div>
          </div>
        </div>
        
        <!-- 時機建議 -->
        <div class="mt-3 p-2 bg-slate-800/50 rounded-lg text-sm" [class.text-green-400]="timingStatus().isGood" [class.text-amber-400]="!timingStatus().isGood">
          {{ timingStatus().suggestion }}
        </div>
      </div>
      
      <!-- 快捷操作網格 -->
      <div class="p-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          @for (action of quickActions; track action.id) {
            <button (click)="executeAction(action)"
                    [disabled]="action.disabled"
                    class="p-4 rounded-xl border transition-all hover:scale-105 relative"
                    [class]="getActionButtonClass(action)">
              <div class="text-3xl mb-2">{{ action.icon }}</div>
              <div class="text-sm font-medium text-white">{{ action.name }}</div>
              <div class="text-xs text-slate-400 mt-1">{{ action.description }}</div>
              @if (action.badge) {
                <span class="absolute top-2 right-2 px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">
                  {{ action.badge }}
                </span>
              }
            </button>
          }
        </div>
      </div>
      
      <!-- 預設配置 -->
      <div class="p-4 border-t border-slate-700">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-medium text-white flex items-center gap-2">
            <span>📌</span> 常用配置
          </h4>
          <button (click)="showPresetManager.set(true)" 
                  class="text-xs text-purple-400 hover:text-purple-300">
            管理配置
          </button>
        </div>
        
        <div class="flex gap-2 flex-wrap">
          @for (preset of presets(); track preset.id) {
            <button (click)="launchPreset(preset)"
                    class="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-all flex items-center gap-2">
              <span>{{ preset.icon }}</span>
              <span class="text-sm text-white">{{ preset.name }}</span>
              @if (preset.usageCount > 0) {
                <span class="text-xs text-slate-500">×{{ preset.usageCount }}</span>
              }
            </button>
          }
          
          <button (click)="createNewPreset()"
                  class="px-3 py-2 border border-dashed border-slate-600 rounded-lg hover:border-purple-500 transition-all flex items-center gap-2 text-slate-500 hover:text-purple-400">
            <span>➕</span>
            <span class="text-sm">新增</span>
          </button>
        </div>
      </div>
      
      <!-- 智能推薦 -->
      @if (recommendations().length > 0) {
        <div class="p-4 border-t border-slate-700 bg-gradient-to-r from-indigo-500/10 to-violet-500/10">
          <h4 class="text-sm font-medium text-white flex items-center gap-2 mb-3">
            <span>💡</span> AI 推薦
          </h4>
          
          @for (rec of recommendations(); track rec.roleCombo.comboId) {
            <div class="p-3 bg-slate-800/50 rounded-lg mb-2 last:mb-0">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-purple-400">🎭</span>
                  <span class="text-white font-medium">{{ rec.roleCombo.comboName }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-green-400">+{{ rec.expectedImprovement.toFixed(1) }}%</span>
                  <button (click)="applyRecommendation(rec)"
                          class="px-2 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600">
                    使用
                  </button>
                </div>
              </div>
              <div class="text-xs text-slate-400 mt-1">{{ rec.reason }}</div>
            </div>
          }
        </div>
      }
      
      <!-- 告警提示 -->
      @if (alertCount() > 0) {
        <div class="p-4 border-t border-slate-700 bg-red-500/10">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-red-400">🔔</span>
              <span class="text-sm text-white">{{ alertCount() }} 個未處理告警</span>
            </div>
            <button (click)="viewAlerts.emit()"
                    class="text-xs text-red-400 hover:text-red-300">
              查看全部
            </button>
          </div>
        </div>
      }
    </div>
    
    <!-- 預設管理彈窗 -->
    @if (showPresetManager()) {
      <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" (click)="showPresetManager.set(false)">
        <div class="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold text-white mb-4">管理常用配置</h3>
          
          <div class="space-y-3 max-h-96 overflow-y-auto">
            @for (preset of presets(); track preset.id) {
              <div class="p-3 bg-slate-800 rounded-lg flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="text-xl">{{ preset.icon }}</span>
                  <div>
                    <div class="text-white font-medium">{{ preset.name }}</div>
                    <div class="text-xs text-slate-400">{{ preset.description }}</div>
                  </div>
                </div>
                <button (click)="deletePreset(preset.id)" class="text-red-400 hover:text-red-300">
                  🗑️
                </button>
              </div>
            }
          </div>
          
          <div class="flex justify-end gap-3 mt-4">
            <button (click)="showPresetManager.set(false)"
                    class="px-4 py-2 text-slate-400 hover:text-white">
              關閉
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .quick-actions-panel {
      max-width: 100%;
    }
  `]
})
export class QuickActionsPanelComponent implements OnInit {
  private timing = inject(SmartTimingService);
  private automation = inject(SmartAutomationService);
  private analytics = inject(MarketingAnalyticsService);
  
  @Output() startMarketing = new EventEmitter<{ type: string; config: any }>();
  @Output() viewAlerts = new EventEmitter<void>();
  @Output() navigateTo = new EventEmitter<string>();
  
  // UI 狀態
  showPresetManager = signal(false);
  
  // 預設配置
  presets = signal<PresetConfig[]>([
    {
      id: 'preset_quick_group',
      name: '群組快攻',
      icon: '🚀',
      description: '顧問+專家組合快速入群',
      roleCombo: ['consultant', 'expert'],
      targetType: 'group',
      timing: 'now',
      usageCount: 12
    },
    {
      id: 'preset_private_nurture',
      name: '私聊培育',
      icon: '💬',
      description: '單角色精細化私聊',
      roleCombo: ['consultant'],
      targetType: 'private',
      timing: 'smart',
      usageCount: 8
    },
    {
      id: 'preset_scheduled',
      name: '定時營銷',
      icon: '⏰',
      description: '智能選時定時發送',
      targetType: 'both',
      timing: 'scheduled',
      usageCount: 5
    }
  ]);
  
  // 時機狀態
  timingStatus = computed(() => this.timing.isGoodTimeNow());
  
  // 告警數量
  alertCount = computed(() => this.automation.unacknowledgedCount());
  
  // 推薦
  recommendations = computed(() => this.automation.getRecommendedRoles());
  
  // 快捷操作
  quickActions: QuickAction[] = [];
  
  ngOnInit() {
    this.initQuickActions();
  }
  
  private initQuickActions() {
    this.quickActions = [
      {
        id: 'action_start_now',
        name: '立即開始',
        icon: '🚀',
        description: '現在開始營銷',
        color: 'purple',
        category: 'marketing',
        action: () => this.startMarketing.emit({ type: 'immediate', config: {} })
      },
      {
        id: 'action_smart_schedule',
        name: '智能定時',
        icon: '⏱️',
        description: '選擇最佳時機',
        color: 'blue',
        category: 'marketing',
        action: () => this.startMarketing.emit({ type: 'smart_schedule', config: {} })
      },
      {
        id: 'action_view_report',
        name: '查看報表',
        icon: '📊',
        description: '營銷效果分析',
        color: 'green',
        category: 'analysis',
        action: () => this.navigateTo.emit('marketing-report'),
        badge: this.analytics.todayStats().conversions > 0 ? `+${this.analytics.todayStats().conversions}` : undefined
      },
      {
        id: 'action_automation',
        name: '自動化設置',
        icon: '⚙️',
        description: '配置自動規則',
        color: 'slate',
        category: 'automation',
        action: () => this.navigateTo.emit('automation')
      }
    ];
  }
  
  timingScoreClass(): string {
    const score = this.timingStatus().score;
    if (score >= 75) return 'text-green-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  }
  
  timingBgClass(): string {
    const score = this.timingStatus().score;
    if (score >= 75) return 'bg-green-500/20 text-green-400';
    if (score >= 50) return 'bg-amber-500/20 text-amber-400';
    return 'bg-red-500/20 text-red-400';
  }
  
  getActionButtonClass(action: QuickAction): string {
    const base = 'border-slate-700 bg-slate-800 hover:bg-slate-700';
    if (action.disabled) return base + ' opacity-50 cursor-not-allowed';
    
    switch (action.color) {
      case 'purple': return 'border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20';
      case 'blue': return 'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20';
      case 'green': return 'border-green-500/30 bg-green-500/10 hover:bg-green-500/20';
      default: return base;
    }
  }
  
  executeAction(action: QuickAction) {
    if (!action.disabled) {
      action.action();
    }
  }
  
  launchPreset(preset: PresetConfig) {
    // 更新使用次數
    this.presets.update(presets => 
      presets.map(p => p.id === preset.id ? { ...p, usageCount: p.usageCount + 1, lastUsed: new Date() } : p)
    );
    
    this.startMarketing.emit({
      type: 'preset',
      config: {
        presetId: preset.id,
        roleCombo: preset.roleCombo,
        targetType: preset.targetType,
        timing: preset.timing
      }
    });
  }
  
  createNewPreset() {
    // TODO: 打開創建預設對話框
    console.log('創建新預設');
  }
  
  deletePreset(presetId: string) {
    this.presets.update(presets => presets.filter(p => p.id !== presetId));
  }
  
  applyRecommendation(rec: RoleRecommendation) {
    this.startMarketing.emit({
      type: 'recommended',
      config: {
        roleCombo: rec.roleCombo,
        confidence: rec.confidence
      }
    });
  }
}
