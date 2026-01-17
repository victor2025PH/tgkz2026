/**
 * 線索自動分類服務
 * Lead Classifier Service
 * 
 * 功能:
 * 1. 根據來源自動分類
 * 2. 根據關鍵詞自動打標籤
 * 3. 自動計算優先級
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { Lead, LeadSource, FunnelStage } from './lead.models';

// 分類規則
export interface ClassificationRule {
  id: string;
  name: string;
  description: string;
  conditions: ClassificationCondition[];
  actions: ClassificationAction[];
  isActive: boolean;
  priority: number; // 越小優先級越高
}

// 條件類型
export type ConditionType = 
  | 'source_type'       // 來源類型
  | 'source_group'      // 來源群組
  | 'keyword_match'     // 關鍵詞匹配
  | 'message_contains'  // 消息包含
  | 'score_range'       // 評分範圍
  | 'stage_is'          // 階段是
  | 'has_tag'           // 有標籤
  | 'no_tag';           // 無標籤

// 分類條件
export interface ClassificationCondition {
  type: ConditionType;
  value: any;
  operator?: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex' | 'in' | 'not_in' | 'gte' | 'lte';
}

// 動作類型
export type ActionType = 
  | 'add_tag'           // 添加標籤
  | 'remove_tag'        // 移除標籤
  | 'set_stage'         // 設置階段
  | 'set_priority'      // 設置優先級
  | 'assign_account'    // 分配帳號
  | 'start_nurturing'   // 開始培育
  | 'send_notification';// 發送通知

// 分類動作
export interface ClassificationAction {
  type: ActionType;
  value: any;
}

// 分類結果
export interface ClassificationResult {
  leadId: string;
  appliedRules: string[];
  addedTags: string[];
  removedTags: string[];
  stageChanged?: { from: FunnelStage; to: FunnelStage };
  prioritySet?: number;
  timestamp: Date;
}

// 預設標籤類別
export interface TagCategory {
  id: string;
  name: string;
  color: string;
  tags: string[];
}

@Injectable({
  providedIn: 'root'
})
export class LeadClassifierService {
  
  // 分類規則
  rules = signal<ClassificationRule[]>([
    // 預設規則：根據來源分類
    {
      id: 'source-group-search',
      name: '群組搜索來源',
      description: '從群組搜索發現的線索',
      conditions: [{ type: 'source_type', value: 'group_search' }],
      actions: [{ type: 'add_tag', value: '群組發現' }],
      isActive: true,
      priority: 100
    },
    {
      id: 'source-keyword-trigger',
      name: '關鍵詞觸發來源',
      description: '通過關鍵詞監控捕獲的線索',
      conditions: [{ type: 'source_type', value: 'keyword_trigger' }],
      actions: [{ type: 'add_tag', value: '關鍵詞觸發' }],
      isActive: true,
      priority: 100
    },
    {
      id: 'source-manual',
      name: '手動添加來源',
      description: '手動添加的線索',
      conditions: [{ type: 'source_type', value: 'manual' }],
      actions: [{ type: 'add_tag', value: '手動添加' }],
      isActive: true,
      priority: 100
    },
    // 預設規則：根據評分分類
    {
      id: 'high-intent',
      name: '高意向客戶',
      description: '購買意向評分高於 70',
      conditions: [{ type: 'score_range', value: { field: 'intent', min: 70, max: 100 } }],
      actions: [
        { type: 'add_tag', value: '🔥 高意向' },
        { type: 'set_priority', value: 1 }
      ],
      isActive: true,
      priority: 10
    },
    {
      id: 'high-engagement',
      name: '高活躍客戶',
      description: '參與度評分高於 80',
      conditions: [{ type: 'score_range', value: { field: 'engagement', min: 80, max: 100 } }],
      actions: [{ type: 'add_tag', value: '⭐ 高活躍' }],
      isActive: true,
      priority: 20
    }
  ]);
  
  // 標籤類別
  tagCategories = signal<TagCategory[]>([
    {
      id: 'source',
      name: '來源',
      color: '#8B5CF6', // purple
      tags: ['群組發現', '關鍵詞觸發', '手動添加', '導入', '推薦']
    },
    {
      id: 'intent',
      name: '意向',
      color: '#F59E0B', // amber
      tags: ['🔥 高意向', '💎 VIP', '⭐ 高活躍', '🎯 精準客戶']
    },
    {
      id: 'product',
      name: '產品興趣',
      color: '#10B981', // emerald
      tags: ['產品A', '產品B', '產品C', '全系列']
    },
    {
      id: 'status',
      name: '狀態',
      color: '#EF4444', // red
      tags: ['待跟進', '已聯繫', '等待回覆', '已成交', '已流失']
    },
    {
      id: 'custom',
      name: '自定義',
      color: '#6B7280', // gray
      tags: []
    }
  ]);
  
  // 所有可用標籤
  allTags = computed(() => {
    const tags: string[] = [];
    for (const category of this.tagCategories()) {
      tags.push(...category.tags);
    }
    return tags;
  });
  
  // 分類歷史
  classificationHistory = signal<ClassificationResult[]>([]);
  
  /**
   * 對線索進行自動分類
   */
  classifyLead(lead: Lead): ClassificationResult {
    const result: ClassificationResult = {
      leadId: lead.id,
      appliedRules: [],
      addedTags: [],
      removedTags: [],
      timestamp: new Date()
    };
    
    // 按優先級排序規則
    const sortedRules = [...this.rules()].sort((a, b) => a.priority - b.priority);
    
    for (const rule of sortedRules) {
      if (!rule.isActive) continue;
      
      // 檢查所有條件是否滿足
      const conditionsMet = rule.conditions.every(condition => 
        this.evaluateCondition(lead, condition)
      );
      
      if (conditionsMet) {
        // 執行所有動作
        for (const action of rule.actions) {
          this.executeAction(lead, action, result);
        }
        result.appliedRules.push(rule.id);
      }
    }
    
    // 記錄分類歷史
    if (result.appliedRules.length > 0) {
      this.classificationHistory.update(history => 
        [result, ...history.slice(0, 99)]
      );
    }
    
    return result;
  }
  
  /**
   * 批量分類線索
   */
  classifyLeads(leads: Lead[]): ClassificationResult[] {
    return leads.map(lead => this.classifyLead(lead));
  }
  
  /**
   * 根據關鍵詞自動打標籤
   */
  autoTagByKeyword(lead: Lead, matchedKeyword: string, keywordSetName: string): string[] {
    const newTags: string[] = [];
    
    // 添加關鍵詞集名稱作為標籤
    if (!lead.tags.includes(keywordSetName)) {
      newTags.push(keywordSetName);
    }
    
    // 根據關鍵詞匹配特定標籤
    const keywordTagMappings: Record<string, string[]> = {
      '買': ['🔥 高意向', '購買意向'],
      '購買': ['🔥 高意向', '購買意向'],
      '價格': ['詢價', '🔥 高意向'],
      '多少錢': ['詢價', '🔥 高意向'],
      '怎麼買': ['🔥 高意向', '購買意向'],
      '有貨': ['庫存諮詢'],
      '優惠': ['優惠敏感'],
      '折扣': ['優惠敏感'],
      '代理': ['代理意向'],
      '批發': ['批發客戶'],
      '合作': ['合作意向']
    };
    
    for (const [keyword, tags] of Object.entries(keywordTagMappings)) {
      if (matchedKeyword.toLowerCase().includes(keyword.toLowerCase())) {
        for (const tag of tags) {
          if (!lead.tags.includes(tag) && !newTags.includes(tag)) {
            newTags.push(tag);
          }
        }
      }
    }
    
    return newTags;
  }
  
  /**
   * 添加自定義標籤
   */
  addCustomTag(tag: string) {
    const categories = this.tagCategories();
    const customCategory = categories.find(c => c.id === 'custom');
    if (customCategory && !customCategory.tags.includes(tag)) {
      const updatedCategories = categories.map(c => 
        c.id === 'custom' 
          ? { ...c, tags: [...c.tags, tag] }
          : c
      );
      this.tagCategories.set(updatedCategories);
    }
  }
  
  /**
   * 添加分類規則
   */
  addRule(rule: Omit<ClassificationRule, 'id'>) {
    const newRule: ClassificationRule = {
      ...rule,
      id: `rule_${Date.now()}`
    };
    this.rules.update(rules => [...rules, newRule]);
  }
  
  /**
   * 更新分類規則
   */
  updateRule(id: string, updates: Partial<ClassificationRule>) {
    this.rules.update(rules => 
      rules.map(r => r.id === id ? { ...r, ...updates } : r)
    );
  }
  
  /**
   * 刪除分類規則
   */
  deleteRule(id: string) {
    this.rules.update(rules => rules.filter(r => r.id !== id));
  }
  
  // 評估條件
  private evaluateCondition(lead: Lead, condition: ClassificationCondition): boolean {
    switch (condition.type) {
      case 'source_type':
        return lead.source.type === condition.value;
        
      case 'source_group':
        return lead.source.groupTitle === condition.value || 
               lead.source.groupId === condition.value;
        
      case 'keyword_match':
        return lead.source.triggerKeyword?.toLowerCase().includes(
          condition.value.toLowerCase()
        ) ?? false;
        
      case 'score_range': {
        const { field, min, max } = condition.value;
        const score = (lead.scores as any)[field] ?? 0;
        return score >= min && score <= max;
      }
        
      case 'stage_is':
        return lead.stage === condition.value;
        
      case 'has_tag':
        return lead.tags.includes(condition.value);
        
      case 'no_tag':
        return !lead.tags.includes(condition.value);
        
      default:
        return false;
    }
  }
  
  // 執行動作
  private executeAction(lead: Lead, action: ClassificationAction, result: ClassificationResult) {
    switch (action.type) {
      case 'add_tag':
        if (!lead.tags.includes(action.value)) {
          lead.tags.push(action.value);
          result.addedTags.push(action.value);
        }
        break;
        
      case 'remove_tag': {
        const index = lead.tags.indexOf(action.value);
        if (index > -1) {
          lead.tags.splice(index, 1);
          result.removedTags.push(action.value);
        }
        break;
      }
        
      case 'set_stage':
        if (lead.stage !== action.value) {
          result.stageChanged = { from: lead.stage, to: action.value };
          lead.stage = action.value;
        }
        break;
        
      case 'set_priority':
        result.prioritySet = action.value;
        break;
        
      case 'start_nurturing':
        lead.isNurturing = true;
        lead.nurturingConfig.enabled = true;
        break;
    }
  }
  
  /**
   * 獲取標籤的顏色
   */
  getTagColor(tag: string): string {
    for (const category of this.tagCategories()) {
      if (category.tags.includes(tag)) {
        return category.color;
      }
    }
    return '#6B7280'; // 默認灰色
  }
  
  /**
   * 獲取標籤的類別
   */
  getTagCategory(tag: string): TagCategory | undefined {
    return this.tagCategories().find(c => c.tags.includes(tag));
  }
}
