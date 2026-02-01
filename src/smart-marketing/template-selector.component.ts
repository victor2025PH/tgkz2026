/**
 * 模板選擇器組件
 * Template Selector Component
 * 
 * 🆕 優化 1-2: 任務模板選擇器
 */

import { Component, signal, computed, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskTemplateService, TaskTemplate } from '../services/task-template.service';
import { GoalType, GOAL_TYPE_CONFIG } from '../models/marketing-task.models';

@Component({
  selector: 'app-template-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="template-selector">
      <!-- 搜索和篩選 -->
      <div class="flex items-center gap-3 mb-4">
        <div class="flex-1 relative">
          <input type="text"
                 [(ngModel)]="searchQuery"
                 placeholder="搜索模板..."
                 class="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        </div>
        <select [(ngModel)]="filterGoal"
                class="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm">
          <option value="">全部目標</option>
          <option value="conversion">促進首單</option>
          <option value="retention">挽回流失</option>
          <option value="engagement">社群活躍</option>
          <option value="support">售後服務</option>
        </select>
      </div>
      
      <!-- 推薦模板 -->
      @if (recommendedTemplates().length > 0 && !searchQuery && !filterGoal) {
        <div class="mb-6">
          <h4 class="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
            <span>⭐</span> 推薦模板（基於成功率）
          </h4>
          <div class="grid grid-cols-2 gap-3">
            @for (template of recommendedTemplates().slice(0, 4); track template.id) {
              <button (click)="selectTemplate.emit(template)"
                      class="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-left hover:bg-amber-500/20 transition-all">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-lg">{{ getGoalIcon(template.goalType) }}</span>
                  <span class="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                    {{ getSuccessRate(template) }}% 成功率
                  </span>
                </div>
                <div class="font-medium text-white text-sm mb-1">{{ template.name }}</div>
                <div class="text-xs text-slate-400">使用 {{ template.usageCount }} 次</div>
              </button>
            }
          </div>
        </div>
      }
      
      <!-- 系統模板 -->
      <div class="mb-6">
        <h4 class="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
          <span>📦</span> 系統模板
        </h4>
        <div class="space-y-2">
          @for (template of filteredSystemTemplates(); track template.id) {
            <button (click)="selectTemplate.emit(template)"
                    class="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-700/50 bg-slate-800/50 text-left hover:border-purple-500/50 hover:bg-purple-500/10 transition-all group">
              <div class="text-2xl">{{ getGoalIcon(template.goalType) }}</div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-white mb-0.5">{{ template.name }}</div>
                <div class="text-xs text-slate-400 truncate">{{ template.description }}</div>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded">
                  {{ getModeLabel(template.executionMode) }}
                </span>
                <span class="text-slate-400 group-hover:text-purple-400 transition-colors">→</span>
              </div>
            </button>
          }
        </div>
      </div>
      
      <!-- 我的模板 -->
      @if (filteredUserTemplates().length > 0) {
        <div class="mb-6">
          <h4 class="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
            <span>📁</span> 我的模板
          </h4>
          <div class="space-y-2">
            @for (template of filteredUserTemplates(); track template.id) {
              <div class="flex items-center gap-4 p-4 rounded-xl border border-slate-700/50 bg-slate-800/50 group">
                <button (click)="selectTemplate.emit(template)"
                        class="flex-1 flex items-center gap-4 text-left">
                  <div class="text-2xl">{{ getGoalIcon(template.goalType) }}</div>
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-white mb-0.5 flex items-center gap-2">
                      {{ template.name }}
                      @if (template.isFavorite) {
                        <span class="text-amber-400">★</span>
                      }
                    </div>
                    <div class="text-xs text-slate-400 flex items-center gap-2">
                      <span>使用 {{ template.usageCount }} 次</span>
                      @if (template.totalContacted > 0) {
                        <span class="text-emerald-400">{{ getSuccessRate(template) }}% 成功率</span>
                      }
                    </div>
                  </div>
                </button>
                
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button (click)="toggleFavorite(template)"
                          class="p-2 text-slate-400 hover:text-amber-400 transition-colors"
                          [title]="template.isFavorite ? '取消收藏' : '收藏'">
                    {{ template.isFavorite ? '★' : '☆' }}
                  </button>
                  <button (click)="deleteTemplate(template)"
                          class="p-2 text-slate-400 hover:text-red-400 transition-colors"
                          title="刪除">
                    🗑️
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }
      
      <!-- 空狀態 -->
      @if (filteredUserTemplates().length === 0 && !searchQuery) {
        <div class="text-center py-8 text-slate-400">
          <div class="text-4xl mb-3">📝</div>
          <p class="text-sm mb-2">還沒有自定義模板</p>
          <p class="text-xs text-slate-500">創建任務時勾選「保存為模板」即可保存</p>
        </div>
      }
    </div>
  `
})
export class TemplateSelectorComponent {
  private templateService = inject(TaskTemplateService);
  
  // 輸出
  selectTemplate = output<TaskTemplate>();
  
  // 狀態
  searchQuery = '';
  filterGoal: GoalType | '' = '';
  
  // 計算屬性
  recommendedTemplates = computed(() => this.templateService.recommendedTemplates());
  
  filteredSystemTemplates = computed(() => {
    let templates = this.templateService.systemTemplates();
    
    if (this.filterGoal) {
      templates = templates.filter(t => t.goalType === this.filterGoal);
    }
    
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }
    
    return templates;
  });
  
  filteredUserTemplates = computed(() => {
    let templates = this.templateService.userTemplates();
    
    if (this.filterGoal) {
      templates = templates.filter(t => t.goalType === this.filterGoal);
    }
    
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
      );
    }
    
    // 收藏的排前面
    return templates.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
  });
  
  // 輔助方法
  getGoalIcon(goalType: GoalType): string {
    return GOAL_TYPE_CONFIG[goalType]?.icon || '🎯';
  }
  
  getModeLabel(mode: string): string {
    const labels: Record<string, string> = {
      'scripted': '劇本',
      'hybrid': '混合',
      'scriptless': '無劇本'
    };
    return labels[mode] || mode;
  }
  
  getSuccessRate(template: TaskTemplate): number {
    return this.templateService.getSuccessRate(template);
  }
  
  toggleFavorite(template: TaskTemplate): void {
    this.templateService.toggleFavorite(template.id);
  }
  
  deleteTemplate(template: TaskTemplate): void {
    if (confirm(`確定要刪除模板「${template.name}」嗎？`)) {
      this.templateService.deleteTemplate(template.id);
    }
  }
}
