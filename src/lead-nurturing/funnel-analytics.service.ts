/**
 * TG-AI智控王 銷售漏斗分析服務
 * Funnel Analytics Service v1.0
 * 
 * 功能：
 * - 漏斗階段可視化數據
 * - 階段轉化分析
 * - 瓶頸識別
 * - 轉化預測
 * - 優化建議
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { LeadService } from './lead.service';
import { AnalyticsDataService, TimeRange } from './analytics-data.service';
import { Lead, FunnelStage } from './lead.models';

// ============ 類型定義 ============

/** 漏斗階段數據 */
export interface FunnelStageData {
  stage: FunnelStage;
  name: string;
  count: number;
  percentage: number;
  value: number; // 潛在價值
  avgTimeInStage: number; // 平均停留時間
  conversionRate: number; // 到下一階段的轉化率
  dropoffRate: number; // 流失率
  color: string;
}

/** 漏斗數據 */
export interface FunnelData {
  stages: FunnelStageData[];
  totalLeads: number;
  totalValue: number;
  overallConversionRate: number;
  avgCycleTime: number;
}

/** 瓶頸分析 */
export interface BottleneckAnalysis {
  stage: FunnelStage;
  severity: 'critical' | 'warning' | 'info';
  issue: string;
  impact: string;
  suggestion: string;
  potentialGain: number; // 改善後預計增加的轉化數
}

/** 轉化路徑 */
export interface ConversionPath {
  leadId: string;
  displayName: string;
  stages: {
    stage: FunnelStage;
    enteredAt: Date;
    duration: number;
  }[];
  totalDuration: number;
  isConverted: boolean;
}

/** 預測數據 */
export interface FunnelPrediction {
  period: string;
  predictedConversions: number;
  predictedRevenue: number;
  confidence: number;
  factors: {
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    description: string;
  }[];
}

/** 階段配置 */
const STAGE_CONFIG: Record<FunnelStage, { name: string; color: string; value: number }> = {
  stranger: { name: '陌生人', color: '#64748b', value: 10 },
  visitor: { name: '訪客', color: '#6366f1', value: 50 },
  lead: { name: '潛在客戶', color: '#8b5cf6', value: 200 },
  qualified: { name: '合格客戶', color: '#ec4899', value: 500 },
  customer: { name: '客戶', color: '#10b981', value: 1000 },
  advocate: { name: '推薦者', color: '#f59e0b', value: 2000 },
  dormant: { name: '休眠', color: '#94a3b8', value: 0 }
};

@Injectable({
  providedIn: 'root'
})
export class FunnelAnalyticsService {
  private leadService = inject(LeadService);
  private analyticsData = inject(AnalyticsDataService);
  
  // ============ 計算屬性 ============
  
  // 漏斗數據
  funnelData = computed(() => this.calculateFunnelData());
  
  // 瓶頸分析
  bottlenecks = computed(() => this.analyzeBottlenecks());
  
  // 轉化路徑
  topConversionPaths = computed(() => this.getTopConversionPaths(10));
  
  // ============ 漏斗數據計算 ============
  
  /**
   * 計算漏斗數據
   */
  private calculateFunnelData(): FunnelData {
    const leads = this.leadService.leads();
    const totalLeads = leads.length || 1;
    
    const activeStages: FunnelStage[] = ['stranger', 'visitor', 'lead', 'qualified', 'customer', 'advocate'];
    
    const stages: FunnelStageData[] = activeStages.map((stage, index) => {
      const stageLeads = leads.filter(l => l.stage === stage);
      const count = stageLeads.length;
      const config = STAGE_CONFIG[stage];
      
      // 計算到下一階段的轉化率
      let conversionRate = 0;
      if (index < activeStages.length - 1) {
        const nextStages = activeStages.slice(index + 1);
        const convertedCount = leads.filter(l => nextStages.includes(l.stage)).length;
        const baseCount = leads.filter(l => 
          activeStages.slice(index).includes(l.stage)
        ).length || 1;
        conversionRate = Math.round((convertedCount / baseCount) * 100);
      }
      
      // 計算流失率
      const lostInStage = leads.filter(l => l.stage === stage && l.doNotContact).length;
      const dropoffRate = count > 0 ? Math.round((lostInStage / count) * 100) : 0;
      
      // 計算平均停留時間
      const avgTimeInStage = this.calculateAvgTimeInStage(stageLeads);
      
      return {
        stage,
        name: config.name,
        count,
        percentage: Math.round((count / totalLeads) * 100),
        value: count * config.value,
        avgTimeInStage,
        conversionRate,
        dropoffRate,
        color: config.color
      };
    });
    
    // 計算整體指標
    const customerCount = leads.filter(l => l.stage === 'customer' || l.stage === 'advocate').length;
    const overallConversionRate = Math.round((customerCount / totalLeads) * 100);
    const totalValue = stages.reduce((sum, s) => sum + s.value, 0);
    const avgCycleTime = this.calculateAvgCycleTime(leads);
    
    return {
      stages,
      totalLeads: leads.length,
      totalValue,
      overallConversionRate,
      avgCycleTime
    };
  }
  
  /**
   * 計算階段平均停留時間
   */
  private calculateAvgTimeInStage(leads: Lead[]): number {
    if (leads.length === 0) return 0;
    
    const now = new Date();
    const totalTime = leads.reduce((sum, lead) => {
      const created = new Date(lead.createdAt);
      const updated = new Date(lead.updatedAt);
      // 如果已離開階段，使用更新時間；否則使用當前時間
      const endTime = lead.stage === 'customer' || lead.stage === 'advocate' ? updated : now;
      return sum + (endTime.getTime() - created.getTime());
    }, 0);
    
    return totalTime / leads.length;
  }
  
  /**
   * 計算平均轉化週期
   */
  private calculateAvgCycleTime(leads: Lead[]): number {
    const converted = leads.filter(l => l.stage === 'customer' || l.stage === 'advocate');
    if (converted.length === 0) return 0;
    
    const totalTime = converted.reduce((sum, lead) => {
      const created = new Date(lead.createdAt);
      const updated = new Date(lead.updatedAt);
      return sum + (updated.getTime() - created.getTime());
    }, 0);
    
    return totalTime / converted.length;
  }
  
  // ============ 瓶頸分析 ============
  
  /**
   * 分析漏斗瓶頸
   */
  private analyzeBottlenecks(): BottleneckAnalysis[] {
    const funnel = this.funnelData();
    const bottlenecks: BottleneckAnalysis[] = [];
    
    const stages = funnel.stages.filter(s => s.stage !== 'advocate');
    
    for (let i = 0; i < stages.length - 1; i++) {
      const current = stages[i];
      const next = stages[i + 1];
      
      // 檢查轉化率過低
      if (current.conversionRate < 30 && current.count > 5) {
        bottlenecks.push({
          stage: current.stage,
          severity: current.conversionRate < 15 ? 'critical' : 'warning',
          issue: `${current.name} → ${next.name} 轉化率僅 ${current.conversionRate}%`,
          impact: `約 ${Math.round(current.count * (1 - current.conversionRate / 100))} 位客戶在此階段流失`,
          suggestion: this.getSuggestion(current.stage, 'low_conversion'),
          potentialGain: Math.round(current.count * 0.1) // 假設改善10%
        });
      }
      
      // 檢查停留時間過長
      const avgDays = current.avgTimeInStage / (24 * 60 * 60 * 1000);
      if (avgDays > 7 && current.count > 3) {
        bottlenecks.push({
          stage: current.stage,
          severity: avgDays > 14 ? 'warning' : 'info',
          issue: `${current.name} 階段平均停留 ${Math.round(avgDays)} 天`,
          impact: '客戶興趣可能隨時間降低',
          suggestion: this.getSuggestion(current.stage, 'long_duration'),
          potentialGain: Math.round(current.count * 0.05)
        });
      }
      
      // 檢查流失率過高
      if (current.dropoffRate > 20 && current.count > 5) {
        bottlenecks.push({
          stage: current.stage,
          severity: current.dropoffRate > 40 ? 'critical' : 'warning',
          issue: `${current.name} 階段流失率達 ${current.dropoffRate}%`,
          impact: `${Math.round(current.count * current.dropoffRate / 100)} 位客戶已流失`,
          suggestion: this.getSuggestion(current.stage, 'high_dropoff'),
          potentialGain: Math.round(current.count * current.dropoffRate / 100 * 0.3)
        });
      }
    }
    
    // 按嚴重程度排序
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    bottlenecks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    
    return bottlenecks;
  }
  
  /**
   * 獲取優化建議
   */
  private getSuggestion(stage: FunnelStage, issueType: string): string {
    const suggestions: Record<string, Record<string, string>> = {
      stranger: {
        low_conversion: '優化首次接觸話術，增加價值主張的吸引力',
        long_duration: '加快首次回覆速度，在24小時內主動聯繫',
        high_dropoff: '檢查初次接觸的內容是否太過銷售導向'
      },
      visitor: {
        low_conversion: '提供更多有價值的內容，建立信任關係',
        long_duration: '增加互動頻率，但不要過於頻繁',
        high_dropoff: '優化內容相關性，確保符合客戶興趣'
      },
      lead: {
        low_conversion: '深入了解客戶需求，提供針對性解決方案',
        long_duration: '安排演示或試用，推動決策進程',
        high_dropoff: '加強異議處理，及時解答疑慮'
      },
      qualified: {
        low_conversion: '提供限時優惠或增值服務，製造緊迫感',
        long_duration: '識別決策障礙，提供競爭對比分析',
        high_dropoff: '檢視報價策略，考慮分期或折扣方案'
      },
      customer: {
        low_conversion: '建立推薦機制，提供推薦獎勵',
        long_duration: '定期回訪，保持良好關係',
        high_dropoff: '提升客戶服務質量，主動解決問題'
      },
      advocate: {
        low_conversion: '',
        long_duration: '',
        high_dropoff: ''
      },
      dormant: {
        low_conversion: '設計喚醒計劃，提供回歸優惠',
        long_duration: '減少聯繫頻率，避免騷擾',
        high_dropoff: '分析流失原因，改進產品或服務'
      }
    };
    
    return suggestions[stage]?.[issueType] || '持續優化客戶體驗';
  }
  
  // ============ 轉化路徑分析 ============
  
  /**
   * 獲取轉化路徑
   */
  getConversionPath(leadId: string): ConversionPath | null {
    const lead = this.leadService.getLead(leadId);
    if (!lead) return null;
    
    const activities = this.leadService.getActivities(leadId);
    const stageChanges = activities.filter(a => a.type === 'stage_changed');
    
    const stages: ConversionPath['stages'] = [];
    let currentStage: FunnelStage = 'stranger';
    let stageStartTime = new Date(lead.createdAt);
    
    // 初始階段
    stages.push({
      stage: 'stranger',
      enteredAt: stageStartTime,
      duration: 0
    });
    
    // 記錄階段變化
    stageChanges.forEach(change => {
      const changeTime = new Date(change.createdAt);
      
      // 更新上一階段的持續時間
      if (stages.length > 0) {
        stages[stages.length - 1].duration = changeTime.getTime() - stageStartTime.getTime();
      }
      
      // 添加新階段
      const newStage = change.details?.to as FunnelStage;
      if (newStage) {
        stages.push({
          stage: newStage,
          enteredAt: changeTime,
          duration: 0
        });
        currentStage = newStage;
        stageStartTime = changeTime;
      }
    });
    
    // 更新最後階段的持續時間
    if (stages.length > 0) {
      stages[stages.length - 1].duration = new Date().getTime() - stageStartTime.getTime();
    }
    
    const totalDuration = stages.reduce((sum, s) => sum + s.duration, 0);
    
    return {
      leadId,
      displayName: lead.displayName,
      stages,
      totalDuration,
      isConverted: lead.stage === 'customer' || lead.stage === 'advocate'
    };
  }
  
  /**
   * 獲取頂部轉化路徑
   */
  private getTopConversionPaths(limit: number): ConversionPath[] {
    const leads = this.leadService.leads()
      .filter(l => l.stage === 'customer' || l.stage === 'advocate')
      .slice(0, limit);
    
    return leads
      .map(l => this.getConversionPath(l.id))
      .filter((p): p is ConversionPath => p !== null)
      .sort((a, b) => a.totalDuration - b.totalDuration);
  }
  
  // ============ 預測分析 ============
  
  /**
   * 生成轉化預測
   */
  generatePrediction(period: 'week' | 'month' = 'month'): FunnelPrediction {
    const funnel = this.funnelData();
    const conversionRate = funnel.overallConversionRate / 100;
    
    // 基於當前漏斗數據預測
    const qualifiedCount = funnel.stages.find(s => s.stage === 'qualified')?.count || 0;
    const leadCount = funnel.stages.find(s => s.stage === 'lead')?.count || 0;
    
    // 預測轉化數
    const multiplier = period === 'week' ? 1 : 4;
    const predictedFromQualified = Math.round(qualifiedCount * 0.4 * multiplier);
    const predictedFromLead = Math.round(leadCount * 0.15 * multiplier);
    const predictedConversions = predictedFromQualified + predictedFromLead;
    
    // 預測收入（假設平均客戶價值）
    const avgCustomerValue = STAGE_CONFIG.customer.value;
    const predictedRevenue = predictedConversions * avgCustomerValue;
    
    // 計算信心度
    let confidence = 70;
    if (funnel.totalLeads > 50) confidence += 10;
    if (funnel.totalLeads > 100) confidence += 10;
    
    // 分析影響因素
    const factors: FunnelPrediction['factors'] = [];
    
    const bottlenecks = this.bottlenecks();
    if (bottlenecks.some(b => b.severity === 'critical')) {
      factors.push({
        name: '漏斗瓶頸',
        impact: 'negative',
        description: '存在嚴重瓶頸問題，可能影響轉化'
      });
      confidence -= 10;
    }
    
    if (qualifiedCount > 10) {
      factors.push({
        name: '合格客戶儲備',
        impact: 'positive',
        description: '有充足的合格客戶等待轉化'
      });
    }
    
    if (funnel.avgCycleTime < 7 * 24 * 60 * 60 * 1000) {
      factors.push({
        name: '轉化速度',
        impact: 'positive',
        description: '轉化週期較短，效率較高'
      });
    }
    
    return {
      period: period === 'week' ? '未來一週' : '未來一月',
      predictedConversions,
      predictedRevenue,
      confidence: Math.max(30, Math.min(95, confidence)),
      factors
    };
  }
  
  // ============ 階段比較 ============
  
  /**
   * 獲取階段比較數據
   */
  getStageComparison(): {
    best: FunnelStageData | null;
    worst: FunnelStageData | null;
    avgConversionRate: number;
  } {
    const stages = this.funnelData().stages.filter(s => 
      s.stage !== 'advocate' && s.stage !== 'dormant' && s.count > 0
    );
    
    if (stages.length === 0) {
      return { best: null, worst: null, avgConversionRate: 0 };
    }
    
    const sortedByConversion = [...stages].sort((a, b) => b.conversionRate - a.conversionRate);
    const avgConversionRate = Math.round(
      stages.reduce((sum, s) => sum + s.conversionRate, 0) / stages.length
    );
    
    return {
      best: sortedByConversion[0],
      worst: sortedByConversion[sortedByConversion.length - 1],
      avgConversionRate
    };
  }
  
  // ============ 漏斗健康度 ============
  
  /**
   * 計算漏斗健康度
   */
  calculateFunnelHealth(): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    summary: string;
  } {
    const funnel = this.funnelData();
    const bottlenecks = this.bottlenecks();
    
    let score = 100;
    
    // 根據轉化率扣分
    if (funnel.overallConversionRate < 10) score -= 30;
    else if (funnel.overallConversionRate < 20) score -= 20;
    else if (funnel.overallConversionRate < 30) score -= 10;
    
    // 根據瓶頸扣分
    const criticalCount = bottlenecks.filter(b => b.severity === 'critical').length;
    const warningCount = bottlenecks.filter(b => b.severity === 'warning').length;
    score -= criticalCount * 15;
    score -= warningCount * 5;
    
    // 根據週期時間扣分
    const avgDays = funnel.avgCycleTime / (24 * 60 * 60 * 1000);
    if (avgDays > 30) score -= 15;
    else if (avgDays > 14) score -= 10;
    else if (avgDays > 7) score -= 5;
    
    score = Math.max(0, Math.min(100, score));
    
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';
    
    let summary = '';
    if (grade === 'A') summary = '漏斗表現優秀，繼續保持';
    else if (grade === 'B') summary = '漏斗運作良好，有小幅優化空間';
    else if (grade === 'C') summary = '漏斗需要關注，建議處理瓶頸問題';
    else if (grade === 'D') summary = '漏斗效率較低，需要重點優化';
    else summary = '漏斗存在嚴重問題，需要立即處理';
    
    return { score, grade, summary };
  }
}
