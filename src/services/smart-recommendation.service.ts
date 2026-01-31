/**
 * 智能推薦服務
 * Smart Recommendation Service
 * 
 * 🆕 優化 1-3: 智能推薦
 * 
 * 功能：
 * - 基於歷史數據推薦最優配置
 * - 分析成功任務的共性
 * - 提供個性化建議
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { MarketingTaskService } from './marketing-task.service';
import { TaskTemplateService } from './task-template.service';
import { GoalType, ExecutionMode, GOAL_TYPE_CONFIG } from '../models/marketing-task.models';

// 推薦項目
export interface Recommendation {
  id: string;
  type: 'goal' | 'mode' | 'roles' | 'audience' | 'timing';
  title: string;
  description: string;
  confidence: number;  // 0-100
  reason: string;
  action?: {
    label: string;
    data: any;
  };
}

// 任務分析結果
export interface TaskAnalysis {
  totalTasks: number;
  successfulTasks: number;
  avgConversionRate: number;
  
  // 按目標類型
  byGoal: Record<GoalType, {
    count: number;
    avgConversionRate: number;
    bestExecutionMode: ExecutionMode;
    bestRoles: string[];
  }>;
  
  // 最佳時段
  bestHours: number[];
  
  // 最成功的配置
  topConfigs: {
    goalType: GoalType;
    executionMode: ExecutionMode;
    roles: string[];
    conversionRate: number;
    sampleSize: number;
  }[];
}

// 智能建議
export interface SmartSuggestion {
  goalType: GoalType;
  executionMode: ExecutionMode;
  suggestedRoles: string[];
  intentThreshold: number;
  audienceSource: string;
  reason: string;
  expectedConversionRate: number;
}

@Injectable({
  providedIn: 'root'
})
export class SmartRecommendationService {
  private taskService = inject(MarketingTaskService);
  private templateService = inject(TaskTemplateService);
  
  // 分析結果緩存
  private _analysis = signal<TaskAnalysis | null>(null);
  analysis = this._analysis.asReadonly();
  
  // 上次分析時間
  private lastAnalysisTime = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分鐘緩存
  
  constructor() {
    // 初始分析
    this.analyzeHistory();
  }
  
  /**
   * 分析歷史任務數據
   */
  async analyzeHistory(): Promise<TaskAnalysis> {
    const now = Date.now();
    
    // 使用緩存
    if (this._analysis() && now - this.lastAnalysisTime < this.CACHE_DURATION) {
      return this._analysis()!;
    }
    
    const tasks = this.taskService.tasks();
    const completedTasks = tasks.filter(t => t.status === 'completed');
    
    // 初始化分析結果
    const analysis: TaskAnalysis = {
      totalTasks: tasks.length,
      successfulTasks: completedTasks.filter(t => t.stats.converted > 0).length,
      avgConversionRate: 0,
      byGoal: {} as any,
      bestHours: [],
      topConfigs: []
    };
    
    // 計算總體轉化率
    const totalContacted = completedTasks.reduce((sum, t) => sum + t.stats.contacted, 0);
    const totalConverted = completedTasks.reduce((sum, t) => sum + t.stats.converted, 0);
    analysis.avgConversionRate = totalContacted > 0 ? (totalConverted / totalContacted) * 100 : 0;
    
    // 按目標類型分析
    const goalTypes: GoalType[] = ['conversion', 'retention', 'engagement', 'support'];
    for (const goal of goalTypes) {
      const goalTasks = completedTasks.filter(t => t.goalType === goal);
      const contacted = goalTasks.reduce((sum, t) => sum + t.stats.contacted, 0);
      const converted = goalTasks.reduce((sum, t) => sum + t.stats.converted, 0);
      
      // 找出最佳執行模式
      const modeStats = new Map<ExecutionMode, { contacted: number; converted: number }>();
      goalTasks.forEach(t => {
        const current = modeStats.get(t.executionMode) || { contacted: 0, converted: 0 };
        modeStats.set(t.executionMode, {
          contacted: current.contacted + t.stats.contacted,
          converted: current.converted + t.stats.converted
        });
      });
      
      let bestMode: ExecutionMode = 'hybrid';
      let bestModeRate = 0;
      modeStats.forEach((stats, mode) => {
        const rate = stats.contacted > 0 ? stats.converted / stats.contacted : 0;
        if (rate > bestModeRate) {
          bestModeRate = rate;
          bestMode = mode;
        }
      });
      
      // 找出最佳角色組合
      const roleCounts = new Map<string, number>();
      goalTasks.forEach(t => {
        t.roleConfig?.forEach(r => {
          const current = roleCounts.get(r.roleType) || 0;
          roleCounts.set(r.roleType, current + (t.stats.converted > 0 ? 1 : 0));
        });
      });
      
      const bestRoles = Array.from(roleCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([role]) => role);
      
      analysis.byGoal[goal] = {
        count: goalTasks.length,
        avgConversionRate: contacted > 0 ? (converted / contacted) * 100 : 0,
        bestExecutionMode: bestMode,
        bestRoles: bestRoles.length > 0 ? bestRoles : GOAL_TYPE_CONFIG[goal].suggestedRoles
      };
    }
    
    // 分析最佳時段（基於任務創建時間）
    const hourCounts = new Array(24).fill(0);
    const hourSuccess = new Array(24).fill(0);
    completedTasks.forEach(t => {
      const hour = new Date(t.createdAt).getHours();
      hourCounts[hour]++;
      if (t.stats.converted > 0) {
        hourSuccess[hour]++;
      }
    });
    
    const hourRates = hourCounts.map((count, i) => ({
      hour: i,
      rate: count > 0 ? hourSuccess[i] / count : 0
    }));
    
    analysis.bestHours = hourRates
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3)
      .map(h => h.hour);
    
    // 找出最成功的配置
    const configMap = new Map<string, { goalType: GoalType; executionMode: ExecutionMode; roles: string[]; contacted: number; converted: number; count: number }>();
    
    completedTasks.forEach(t => {
      const roles = t.roleConfig?.map(r => r.roleType).sort().join(',') || '';
      const key = `${t.goalType}|${t.executionMode}|${roles}`;
      
      const current = configMap.get(key) || {
        goalType: t.goalType,
        executionMode: t.executionMode,
        roles: t.roleConfig?.map(r => r.roleType) || [],
        contacted: 0,
        converted: 0,
        count: 0
      };
      
      configMap.set(key, {
        ...current,
        contacted: current.contacted + t.stats.contacted,
        converted: current.converted + t.stats.converted,
        count: current.count + 1
      });
    });
    
    analysis.topConfigs = Array.from(configMap.values())
      .filter(c => c.count >= 2) // 至少使用2次
      .map(c => ({
        goalType: c.goalType,
        executionMode: c.executionMode,
        roles: c.roles,
        conversionRate: c.contacted > 0 ? (c.converted / c.contacted) * 100 : 0,
        sampleSize: c.count
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 5);
    
    this._analysis.set(analysis);
    this.lastAnalysisTime = now;
    
    return analysis;
  }
  
  /**
   * 獲取推薦列表
   */
  getRecommendations(): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const analysis = this._analysis();
    
    if (!analysis || analysis.totalTasks < 3) {
      // 新用戶推薦
      recommendations.push({
        id: 'new-user-conversion',
        type: 'goal',
        title: '開始您的第一個轉化任務',
        description: '「促進首單」是最常用的營銷目標',
        confidence: 80,
        reason: '基於系統默認推薦',
        action: {
          label: '創建任務',
          data: { goalType: 'conversion' }
        }
      });
      return recommendations;
    }
    
    // 基於最佳配置推薦
    if (analysis.topConfigs.length > 0) {
      const best = analysis.topConfigs[0];
      recommendations.push({
        id: 'best-config',
        type: 'goal',
        title: `使用您的最佳配置`,
        description: `${GOAL_TYPE_CONFIG[best.goalType].label} + ${this.getModeLabel(best.executionMode)}`,
        confidence: Math.min(90, 50 + best.sampleSize * 10),
        reason: `歷史轉化率 ${best.conversionRate.toFixed(1)}%（${best.sampleSize} 次任務）`,
        action: {
          label: '使用此配置',
          data: best
        }
      });
    }
    
    // 基於目標類型推薦
    const goalEntries = Object.entries(analysis.byGoal) as [GoalType, typeof analysis.byGoal[GoalType]][];
    const bestGoal = goalEntries
      .filter(([_, data]) => data.count >= 2)
      .sort((a, b) => b[1].avgConversionRate - a[1].avgConversionRate)[0];
    
    if (bestGoal) {
      const [goalType, data] = bestGoal;
      recommendations.push({
        id: 'best-goal',
        type: 'goal',
        title: `${GOAL_TYPE_CONFIG[goalType].label} 表現最佳`,
        description: `平均轉化率 ${data.avgConversionRate.toFixed(1)}%`,
        confidence: Math.min(85, 40 + data.count * 5),
        reason: `基於 ${data.count} 次歷史任務分析`
      });
    }
    
    // 最佳時段推薦
    if (analysis.bestHours.length > 0) {
      const hours = analysis.bestHours.map(h => `${h}:00`).join('、');
      recommendations.push({
        id: 'best-timing',
        type: 'timing',
        title: '最佳啟動時段',
        description: hours,
        confidence: 70,
        reason: '這些時段的任務成功率較高'
      });
    }
    
    return recommendations;
  }
  
  /**
   * 為特定目標獲取智能建議
   */
  getSuggestionForGoal(goalType: GoalType): SmartSuggestion {
    const analysis = this._analysis();
    const goalData = analysis?.byGoal[goalType];
    const defaultConfig = GOAL_TYPE_CONFIG[goalType];
    
    if (!goalData || goalData.count < 2) {
      // 使用默認建議
      return {
        goalType,
        executionMode: defaultConfig.suggestedMode,
        suggestedRoles: defaultConfig.suggestedRoles,
        intentThreshold: 70,
        audienceSource: 'recent',
        reason: '基於系統默認推薦',
        expectedConversionRate: 15
      };
    }
    
    return {
      goalType,
      executionMode: goalData.bestExecutionMode,
      suggestedRoles: goalData.bestRoles,
      intentThreshold: 60,
      audienceSource: 'tags',
      reason: `基於 ${goalData.count} 次歷史任務分析`,
      expectedConversionRate: Math.round(goalData.avgConversionRate)
    };
  }
  
  /**
   * 獲取下一個最優目標建議
   */
  getNextBestAction(): { goalType: GoalType; reason: string } | null {
    const tasks = this.taskService.tasks();
    const activeTasks = tasks.filter(t => t.status === 'running');
    
    // 如果沒有活躍任務，建議開始
    if (activeTasks.length === 0) {
      const analysis = this._analysis();
      if (analysis && analysis.topConfigs.length > 0) {
        const best = analysis.topConfigs[0];
        return {
          goalType: best.goalType,
          reason: `您的「${GOAL_TYPE_CONFIG[best.goalType].label}」任務歷史表現最佳`
        };
      }
      return {
        goalType: 'conversion',
        reason: '開始一個新的轉化任務'
      };
    }
    
    // 檢查是否有缺失的目標類型
    const activeGoals = new Set(activeTasks.map(t => t.goalType));
    const missingGoals: GoalType[] = ['conversion', 'retention', 'engagement', 'support']
      .filter(g => !activeGoals.has(g as GoalType)) as GoalType[];
    
    if (missingGoals.length > 0) {
      // 推薦歷史表現最好的缺失目標
      const analysis = this._analysis();
      if (analysis) {
        const bestMissing = missingGoals
          .filter(g => analysis.byGoal[g]?.count > 0)
          .sort((a, b) => analysis.byGoal[b].avgConversionRate - analysis.byGoal[a].avgConversionRate)[0];
        
        if (bestMissing) {
          return {
            goalType: bestMissing,
            reason: `補充一個「${GOAL_TYPE_CONFIG[bestMissing].label}」任務以覆蓋更多場景`
          };
        }
      }
    }
    
    return null;
  }
  
  // 輔助方法
  private getModeLabel(mode: ExecutionMode): string {
    const labels: Record<ExecutionMode, string> = {
      'scripted': '劇本模式',
      'hybrid': '混合模式',
      'scriptless': '無劇本模式'
    };
    return labels[mode];
  }
}
