/**
 * 任務模板服務
 * Task Template Service
 * 
 * 🆕 優化 1-2: 任務模板系統
 * 
 * 功能：
 * - 保存成功的任務配置為模板
 * - 快速復用模板創建新任務
 * - 推薦高成功率模板
 */

import { Injectable, signal, computed } from '@angular/core';
import { GoalType, ExecutionMode } from '../models/marketing-task.models';

// 模板接口
export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  
  // 配置
  goalType: GoalType;
  executionMode: ExecutionMode;
  audienceSource: string;
  intentScoreMin: number;
  
  // 角色配置
  roles?: string[];
  
  // AI 配置
  aiHostingEnabled?: boolean;
  autoGreeting?: boolean;
  autoReply?: boolean;
  
  // 統計（用於推薦）
  usageCount: number;
  successCount: number;
  totalContacted: number;
  totalConverted: number;
  
  // 元數據
  isSystem: boolean;  // 是否系統預設
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

// 系統預設模板
const SYSTEM_TEMPLATES: TaskTemplate[] = [
  {
    id: 'sys-high-intent',
    name: '高意向客戶轉化',
    description: '針對意向分數 ≥80 的高質量潛在客戶',
    goalType: 'conversion',
    executionMode: 'hybrid',
    audienceSource: 'tags',
    intentScoreMin: 80,
    roles: ['expert', 'satisfied_customer'],
    aiHostingEnabled: true,
    autoGreeting: true,
    autoReply: true,
    usageCount: 0,
    successCount: 0,
    totalContacted: 0,
    totalConverted: 0,
    isSystem: true,
    isFavorite: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'sys-win-back',
    name: '沉默客戶喚醒',
    description: '7天內無互動的老客戶挽回策略',
    goalType: 'retention',
    executionMode: 'hybrid',
    audienceSource: 'recent',
    intentScoreMin: 30,
    roles: ['callback', 'support', 'manager'],
    aiHostingEnabled: true,
    autoGreeting: true,
    autoReply: true,
    usageCount: 0,
    successCount: 0,
    totalContacted: 0,
    totalConverted: 0,
    isSystem: true,
    isFavorite: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'sys-community',
    name: '社群活躍引爆',
    description: '在群組中製造話題，提升活躍度',
    goalType: 'engagement',
    executionMode: 'scriptless',
    audienceSource: 'group',
    intentScoreMin: 0,
    roles: ['newbie', 'satisfied_customer', 'expert'],
    aiHostingEnabled: true,
    autoGreeting: false,
    autoReply: true,
    usageCount: 0,
    successCount: 0,
    totalContacted: 0,
    totalConverted: 0,
    isSystem: true,
    isFavorite: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'sys-support',
    name: '售後服務響應',
    description: '快速響應客戶問題，提升滿意度',
    goalType: 'support',
    executionMode: 'scripted',
    audienceSource: 'recent',
    intentScoreMin: 0,
    roles: ['support', 'expert'],
    aiHostingEnabled: true,
    autoGreeting: false,
    autoReply: true,
    usageCount: 0,
    successCount: 0,
    totalContacted: 0,
    totalConverted: 0,
    isSystem: true,
    isFavorite: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }
];

@Injectable({
  providedIn: 'root'
})
export class TaskTemplateService {
  
  // 狀態
  private _templates = signal<TaskTemplate[]>([]);
  templates = this._templates.asReadonly();
  
  // 計算屬性
  userTemplates = computed(() => this._templates().filter(t => !t.isSystem));
  systemTemplates = computed(() => SYSTEM_TEMPLATES);
  favoriteTemplates = computed(() => this._templates().filter(t => t.isFavorite));
  
  // 按成功率排序的推薦模板
  recommendedTemplates = computed(() => {
    const all = [...this._templates(), ...SYSTEM_TEMPLATES];
    return all
      .filter(t => t.usageCount >= 3) // 至少使用過3次
      .sort((a, b) => {
        const rateA = a.totalContacted > 0 ? a.totalConverted / a.totalContacted : 0;
        const rateB = b.totalContacted > 0 ? b.totalConverted / b.totalContacted : 0;
        return rateB - rateA;
      })
      .slice(0, 5);
  });
  
  // 按目標類型分組
  templatesByGoal = computed(() => {
    const all = [...this._templates(), ...SYSTEM_TEMPLATES];
    return all.reduce((acc, t) => {
      if (!acc[t.goalType]) acc[t.goalType] = [];
      acc[t.goalType].push(t);
      return acc;
    }, {} as Record<GoalType, TaskTemplate[]>);
  });
  
  constructor() {
    this.loadTemplates();
  }
  
  /**
   * 從本地存儲加載模板
   */
  private loadTemplates(): void {
    try {
      const saved = localStorage.getItem('task_templates');
      if (saved) {
        this._templates.set(JSON.parse(saved));
      }
    } catch (error) {
      console.error('加載模板失敗:', error);
    }
  }
  
  /**
   * 保存模板到本地存儲
   */
  private saveTemplates(): void {
    localStorage.setItem('task_templates', JSON.stringify(this._templates()));
  }
  
  /**
   * 創建新模板
   */
  createTemplate(template: Omit<TaskTemplate, 'id' | 'usageCount' | 'successCount' | 'totalContacted' | 'totalConverted' | 'isSystem' | 'createdAt' | 'updatedAt'>): TaskTemplate {
    const newTemplate: TaskTemplate = {
      ...template,
      id: `tpl-${Date.now()}`,
      usageCount: 0,
      successCount: 0,
      totalContacted: 0,
      totalConverted: 0,
      isSystem: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this._templates.update(templates => [...templates, newTemplate]);
    this.saveTemplates();
    
    return newTemplate;
  }
  
  /**
   * 從現有任務創建模板
   */
  createFromTask(task: any, name: string, description?: string): TaskTemplate {
    return this.createTemplate({
      name,
      description,
      goalType: task.goalType,
      executionMode: task.executionMode,
      audienceSource: task.targetCriteria?.sources?.[0] || 'recent',
      intentScoreMin: task.targetCriteria?.intentScoreMin || 50,
      roles: task.roleConfig?.map((r: any) => r.roleType),
      aiHostingEnabled: true,
      autoGreeting: true,
      autoReply: true,
      isFavorite: false
    });
  }
  
  /**
   * 更新模板
   */
  updateTemplate(id: string, updates: Partial<TaskTemplate>): void {
    this._templates.update(templates => 
      templates.map(t => 
        t.id === id 
          ? { ...t, ...updates, updatedAt: new Date().toISOString() }
          : t
      )
    );
    this.saveTemplates();
  }
  
  /**
   * 刪除模板
   */
  deleteTemplate(id: string): void {
    this._templates.update(templates => templates.filter(t => t.id !== id));
    this.saveTemplates();
  }
  
  /**
   * 切換收藏
   */
  toggleFavorite(id: string): void {
    this._templates.update(templates =>
      templates.map(t =>
        t.id === id ? { ...t, isFavorite: !t.isFavorite } : t
      )
    );
    this.saveTemplates();
  }
  
  /**
   * 記錄模板使用
   */
  recordUsage(id: string): void {
    this._templates.update(templates =>
      templates.map(t =>
        t.id === id ? { ...t, usageCount: t.usageCount + 1 } : t
      )
    );
    this.saveTemplates();
  }
  
  /**
   * 記錄任務結果
   */
  recordResult(id: string, contacted: number, converted: number, success: boolean): void {
    this._templates.update(templates =>
      templates.map(t =>
        t.id === id 
          ? { 
              ...t, 
              totalContacted: t.totalContacted + contacted,
              totalConverted: t.totalConverted + converted,
              successCount: success ? t.successCount + 1 : t.successCount
            }
          : t
      )
    );
    this.saveTemplates();
  }
  
  /**
   * 獲取模板
   */
  getTemplate(id: string): TaskTemplate | undefined {
    // 先從用戶模板找
    const userTemplate = this._templates().find(t => t.id === id);
    if (userTemplate) return userTemplate;
    
    // 再從系統模板找
    return SYSTEM_TEMPLATES.find(t => t.id === id);
  }
  
  /**
   * 獲取模板成功率
   */
  getSuccessRate(template: TaskTemplate): number {
    if (template.totalContacted === 0) return 0;
    return Math.round((template.totalConverted / template.totalContacted) * 100);
  }
  
  /**
   * 搜索模板
   */
  searchTemplates(query: string): TaskTemplate[] {
    const lowerQuery = query.toLowerCase();
    const all = [...this._templates(), ...SYSTEM_TEMPLATES];
    return all.filter(t => 
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description?.toLowerCase().includes(lowerQuery)
    );
  }
}
