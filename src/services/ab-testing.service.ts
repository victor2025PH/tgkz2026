/**
 * A/B 測試服務
 * A/B Testing Service
 * 
 * 🆕 P5 階段：高級功能擴展
 * 
 * 功能：
 * - 創建和管理實驗
 * - 變體分配
 * - 效果統計
 * - 自動優勝選擇
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { StatePersistenceService } from './state-persistence.service';

// ============ 類型定義 ============

/** 實驗狀態 */
export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'archived';

/** 變體類型 */
export interface Variant {
  id: string;
  name: string;
  description?: string;
  weight: number;           // 分配權重 (0-100)
  config: Record<string, any>;  // 變體配置
}

/** 實驗定義 */
export interface Experiment {
  id: string;
  name: string;
  description?: string;
  status: ExperimentStatus;
  
  // 變體
  variants: Variant[];
  controlVariantId: string;  // 對照組
  
  // 目標
  primaryMetric: MetricType;
  secondaryMetrics?: MetricType[];
  
  // 時間
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  
  // 配置
  sampleSize?: number;       // 目標樣本量
  minRunDays?: number;       // 最小運行天數
  confidenceLevel?: number;  // 置信度 (0.9-0.99)
  
  // 結果
  winner?: string;           // 優勝變體 ID
  autoSelectWinner?: boolean;
}

/** 指標類型 */
export type MetricType = 
  | 'conversion_rate'    // 轉化率
  | 'response_rate'      // 回覆率
  | 'avg_interest_score' // 平均興趣度
  | 'avg_message_count'  // 平均消息數
  | 'revenue'            // 收入
  | 'engagement_time';   // 互動時長

/** 變體統計 */
export interface VariantStats {
  variantId: string;
  sampleSize: number;
  
  // 核心指標
  conversions: number;
  conversionRate: number;
  
  // 其他指標
  totalRevenue: number;
  avgInterestScore: number;
  avgResponseTime: number;
  avgMessageCount: number;
  
  // 統計顯著性
  pValue?: number;
  confidenceInterval?: [number, number];
  isSignificant?: boolean;
  
  // 相對提升
  uplift?: number;  // 相對對照組的提升
}

/** 實驗結果 */
export interface ExperimentResult {
  experimentId: string;
  variantStats: VariantStats[];
  overallSampleSize: number;
  runDays: number;
  hasSignificantWinner: boolean;
  recommendedWinner?: string;
  recommendation: string;
}

/** 用戶分配記錄 */
interface UserAssignment {
  experimentId: string;
  variantId: string;
  assignedAt: Date;
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class ABTestingService {
  private persistence = inject(StatePersistenceService);
  
  // 實驗列表
  private _experiments = signal<Experiment[]>([]);
  experiments = this._experiments.asReadonly();
  
  // 變體統計
  private _variantStats = signal<Map<string, VariantStats[]>>(new Map());
  
  // 用戶分配
  private _userAssignments = signal<Map<string, UserAssignment>>(new Map());
  
  // 活躍實驗
  activeExperiments = computed(() => 
    this._experiments().filter(e => e.status === 'running')
  );
  
  // 🔧 兼容舊版：activeTests 別名
  activeTests = this.activeExperiments;
  
  // 已完成實驗
  completedExperiments = computed(() => 
    this._experiments().filter(e => e.status === 'completed')
  );
  
  // 🔧 兼容舊版：統計信號
  stats = computed(() => {
    const experiments = this._experiments();
    const completed = this.completedExperiments();
    
    // 計算平均提升
    let totalLift = 0;
    let liftCount = 0;
    
    completed.forEach(exp => {
      const result = this.getExperimentResult(exp.id);
      if (result?.recommendedWinner) {
        const winnerStats = result.variantStats.find(s => s.variantId === result.recommendedWinner);
        if (winnerStats?.uplift) {
          totalLift += winnerStats.uplift;
          liftCount++;
        }
      }
    });
    
    return {
      total: experiments.length,
      running: this.activeExperiments().length,
      completed: completed.length,
      draft: experiments.filter(e => e.status === 'draft').length,
      avgConversionLift: liftCount > 0 ? totalLift / liftCount : 0
    };
  });
  
  private readonly STORAGE_KEY = 'abTesting';
  
  constructor() {
    this.loadFromStorage();
  }
  
  // ============ 實驗管理 ============
  
  /**
   * 創建實驗
   */
  createExperiment(config: {
    name: string;
    description?: string;
    variants: Omit<Variant, 'id'>[];
    primaryMetric: MetricType;
    secondaryMetrics?: MetricType[];
    sampleSize?: number;
    minRunDays?: number;
    confidenceLevel?: number;
    autoSelectWinner?: boolean;
  }): Experiment {
    // 確保權重總和為 100
    const totalWeight = config.variants.reduce((sum, v) => sum + v.weight, 0);
    const normalizedVariants: Variant[] = config.variants.map((v, i) => ({
      ...v,
      id: `var_${Date.now()}_${i}`,
      weight: Math.round((v.weight / totalWeight) * 100)
    }));
    
    const experiment: Experiment = {
      id: `exp_${Date.now()}`,
      name: config.name,
      description: config.description,
      status: 'draft',
      variants: normalizedVariants,
      controlVariantId: normalizedVariants[0].id,
      primaryMetric: config.primaryMetric,
      secondaryMetrics: config.secondaryMetrics,
      createdAt: new Date(),
      sampleSize: config.sampleSize ?? 100,
      minRunDays: config.minRunDays ?? 7,
      confidenceLevel: config.confidenceLevel ?? 0.95,
      autoSelectWinner: config.autoSelectWinner ?? true
    };
    
    this._experiments.update(exps => [...exps, experiment]);
    
    // 初始化統計
    this._variantStats.update(stats => {
      const newStats = new Map(stats);
      newStats.set(experiment.id, normalizedVariants.map(v => this.createEmptyStats(v.id)));
      return newStats;
    });
    
    this.saveToStorage();
    console.log(`[ABTesting] 創建實驗: ${experiment.name}`);
    return experiment;
  }
  
  /**
   * 開始實驗
   */
  startExperiment(experimentId: string): boolean {
    const experiment = this.getExperiment(experimentId);
    if (!experiment || experiment.status !== 'draft') return false;
    
    this.updateExperiment(experimentId, {
      status: 'running',
      startedAt: new Date()
    });
    
    console.log(`[ABTesting] 開始實驗: ${experiment.name}`);
    return true;
  }
  
  /**
   * 暫停實驗
   */
  pauseExperiment(experimentId: string): boolean {
    const experiment = this.getExperiment(experimentId);
    if (!experiment || experiment.status !== 'running') return false;
    
    this.updateExperiment(experimentId, { status: 'paused' });
    return true;
  }
  
  /**
   * 恢復實驗
   */
  resumeExperiment(experimentId: string): boolean {
    const experiment = this.getExperiment(experimentId);
    if (!experiment || experiment.status !== 'paused') return false;
    
    this.updateExperiment(experimentId, { status: 'running' });
    return true;
  }
  
  /**
   * 結束實驗
   */
  endExperiment(experimentId: string, winnerId?: string): boolean {
    const experiment = this.getExperiment(experimentId);
    if (!experiment) return false;
    
    this.updateExperiment(experimentId, {
      status: 'completed',
      endedAt: new Date(),
      winner: winnerId
    });
    
    console.log(`[ABTesting] 結束實驗: ${experiment.name}, 優勝: ${winnerId}`);
    return true;
  }
  
  /**
   * 獲取實驗
   */
  getExperiment(experimentId: string): Experiment | undefined {
    return this._experiments().find(e => e.id === experimentId);
  }
  
  /**
   * 更新實驗
   */
  private updateExperiment(experimentId: string, updates: Partial<Experiment>) {
    this._experiments.update(exps => 
      exps.map(e => e.id === experimentId ? { ...e, ...updates } : e)
    );
    this.saveToStorage();
  }
  
  // ============ 變體分配 ============
  
  /**
   * 分配變體
   */
  assignVariant(experimentId: string, userId: string): Variant | null {
    const experiment = this.getExperiment(experimentId);
    if (!experiment || experiment.status !== 'running') return null;
    
    // 檢查是否已分配
    const existingKey = `${experimentId}_${userId}`;
    const existing = this._userAssignments().get(existingKey);
    if (existing) {
      return experiment.variants.find(v => v.id === existing.variantId) || null;
    }
    
    // 根據權重隨機分配
    const variant = this.selectVariantByWeight(experiment.variants);
    
    // 記錄分配
    this._userAssignments.update(assignments => {
      const newAssignments = new Map(assignments);
      newAssignments.set(existingKey, {
        experimentId,
        variantId: variant.id,
        assignedAt: new Date()
      });
      return newAssignments;
    });
    
    this.saveToStorage();
    return variant;
  }
  
  /**
   * 根據權重選擇變體
   */
  private selectVariantByWeight(variants: Variant[]): Variant {
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const variant of variants) {
      random -= variant.weight;
      if (random <= 0) {
        return variant;
      }
    }
    
    return variants[variants.length - 1];
  }
  
  /**
   * 獲取用戶的變體
   */
  getUserVariant(experimentId: string, userId: string): Variant | null {
    const experiment = this.getExperiment(experimentId);
    if (!experiment) return null;
    
    const key = `${experimentId}_${userId}`;
    const assignment = this._userAssignments().get(key);
    if (!assignment) return null;
    
    return experiment.variants.find(v => v.id === assignment.variantId) || null;
  }
  
  // ============ 結果記錄 ============
  
  /**
   * 記錄轉化
   */
  recordConversion(experimentId: string, userId: string, data: {
    revenue?: number;
    interestScore?: number;
    messageCount?: number;
    responseTime?: number;
  }) {
    const variant = this.getUserVariant(experimentId, userId);
    if (!variant) return;
    
    this._variantStats.update(stats => {
      const newStats = new Map(stats);
      const expStats = newStats.get(experimentId) || [];
      
      const variantStats = expStats.find(s => s.variantId === variant.id);
      if (variantStats) {
        variantStats.sampleSize++;
        variantStats.conversions++;
        variantStats.conversionRate = variantStats.conversions / variantStats.sampleSize;
        variantStats.totalRevenue += data.revenue || 0;
        
        // 更新平均值
        if (data.interestScore !== undefined) {
          variantStats.avgInterestScore = 
            (variantStats.avgInterestScore * (variantStats.sampleSize - 1) + data.interestScore) / variantStats.sampleSize;
        }
        if (data.messageCount !== undefined) {
          variantStats.avgMessageCount = 
            (variantStats.avgMessageCount * (variantStats.sampleSize - 1) + data.messageCount) / variantStats.sampleSize;
        }
      }
      
      newStats.set(experimentId, expStats);
      return newStats;
    });
    
    this.saveToStorage();
    this.checkAutoComplete(experimentId);
  }
  
  /**
   * 記錄曝光（無轉化）
   */
  recordExposure(experimentId: string, userId: string) {
    const variant = this.getUserVariant(experimentId, userId);
    if (!variant) return;
    
    this._variantStats.update(stats => {
      const newStats = new Map(stats);
      const expStats = newStats.get(experimentId) || [];
      
      const variantStats = expStats.find(s => s.variantId === variant.id);
      if (variantStats) {
        variantStats.sampleSize++;
        variantStats.conversionRate = variantStats.conversions / variantStats.sampleSize;
      }
      
      newStats.set(experimentId, expStats);
      return newStats;
    });
    
    this.saveToStorage();
  }
  
  // ============ 統計分析 ============
  
  /**
   * 獲取實驗結果
   */
  getExperimentResult(experimentId: string): ExperimentResult | null {
    const experiment = this.getExperiment(experimentId);
    if (!experiment) return null;
    
    const variantStats = this._variantStats().get(experimentId) || [];
    const controlStats = variantStats.find(s => s.variantId === experiment.controlVariantId);
    
    // 計算每個變體的統計顯著性
    const enrichedStats = variantStats.map(stats => {
      if (stats.variantId === experiment.controlVariantId) {
        return stats;
      }
      
      // 計算相對提升
      const uplift = controlStats && controlStats.conversionRate > 0
        ? ((stats.conversionRate - controlStats.conversionRate) / controlStats.conversionRate) * 100
        : 0;
      
      // 簡化的顯著性檢驗
      const significance = this.calculateSignificance(stats, controlStats);
      
      return {
        ...stats,
        uplift,
        ...significance
      };
    });
    
    // 判斷是否有顯著優勝者
    const significantWinners = enrichedStats.filter(s => 
      s.isSignificant && (s.uplift || 0) > 0
    );
    
    const runDays = experiment.startedAt 
      ? Math.floor((Date.now() - experiment.startedAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    const totalSampleSize = enrichedStats.reduce((sum, s) => sum + s.sampleSize, 0);
    
    let recommendation = '';
    let recommendedWinner: string | undefined;
    
    if (totalSampleSize < (experiment.sampleSize || 100)) {
      recommendation = `樣本量不足，建議繼續收集數據（當前 ${totalSampleSize}/${experiment.sampleSize}）`;
    } else if (runDays < (experiment.minRunDays || 7)) {
      recommendation = `運行時間不足，建議至少運行 ${experiment.minRunDays} 天`;
    } else if (significantWinners.length === 0) {
      recommendation = '暫無統計顯著的優勝者，建議繼續觀察或調整變體';
    } else if (significantWinners.length === 1) {
      recommendedWinner = significantWinners[0].variantId;
      recommendation = `建議選擇變體 ${this.getVariantName(experiment, recommendedWinner)}，提升 ${significantWinners[0].uplift?.toFixed(1)}%`;
    } else {
      const best = significantWinners.sort((a, b) => (b.uplift || 0) - (a.uplift || 0))[0];
      recommendedWinner = best.variantId;
      recommendation = `多個變體表現優秀，建議選擇 ${this.getVariantName(experiment, recommendedWinner)}`;
    }
    
    return {
      experimentId,
      variantStats: enrichedStats,
      overallSampleSize: totalSampleSize,
      runDays,
      hasSignificantWinner: significantWinners.length > 0,
      recommendedWinner,
      recommendation
    };
  }
  
  /**
   * 計算統計顯著性（簡化版）
   */
  private calculateSignificance(variant: VariantStats, control?: VariantStats): {
    pValue?: number;
    isSignificant?: boolean;
    confidenceInterval?: [number, number];
  } {
    if (!control || control.sampleSize < 30 || variant.sampleSize < 30) {
      return {};
    }
    
    // 使用 Z 檢驗近似
    const p1 = variant.conversionRate;
    const p2 = control.conversionRate;
    const n1 = variant.sampleSize;
    const n2 = control.sampleSize;
    
    const pooledP = (variant.conversions + control.conversions) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));
    
    if (se === 0) return {};
    
    const z = (p1 - p2) / se;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));
    
    // 置信區間
    const margin = 1.96 * se;
    const diff = p1 - p2;
    
    return {
      pValue,
      isSignificant: pValue < 0.05,
      confidenceInterval: [diff - margin, diff + margin]
    };
  }
  
  /**
   * 標準正態分佈 CDF（近似）
   */
  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return 0.5 * (1.0 + sign * y);
  }
  
  /**
   * 檢查自動完成
   */
  private checkAutoComplete(experimentId: string) {
    const experiment = this.getExperiment(experimentId);
    if (!experiment || !experiment.autoSelectWinner) return;
    
    const result = this.getExperimentResult(experimentId);
    if (!result) return;
    
    // 檢查是否達到條件
    if (result.hasSignificantWinner && 
        result.overallSampleSize >= (experiment.sampleSize || 100) &&
        result.runDays >= (experiment.minRunDays || 7)) {
      
      this.endExperiment(experimentId, result.recommendedWinner);
      console.log(`[ABTesting] 自動選擇優勝者: ${result.recommendedWinner}`);
    }
  }
  
  // ============ 輔助方法 ============
  
  private getVariantName(experiment: Experiment, variantId: string): string {
    return experiment.variants.find(v => v.id === variantId)?.name || variantId;
  }
  
  private createEmptyStats(variantId: string): VariantStats {
    return {
      variantId,
      sampleSize: 0,
      conversions: 0,
      conversionRate: 0,
      totalRevenue: 0,
      avgInterestScore: 0,
      avgResponseTime: 0,
      avgMessageCount: 0
    };
  }
  
  // ============ 持久化 ============
  
  private saveToStorage() {
    const data = {
      experiments: this._experiments(),
      variantStats: Array.from(this._variantStats().entries()),
      userAssignments: Array.from(this._userAssignments().entries()),
      savedAt: Date.now()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }
  
  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;
      
      const data = JSON.parse(stored);
      
      if (data.experiments) {
        this._experiments.set(data.experiments.map((e: any) => ({
          ...e,
          createdAt: new Date(e.createdAt),
          startedAt: e.startedAt ? new Date(e.startedAt) : undefined,
          endedAt: e.endedAt ? new Date(e.endedAt) : undefined
        })));
      }
      
      if (data.variantStats) {
        this._variantStats.set(new Map(data.variantStats));
      }
      
      if (data.userAssignments) {
        this._userAssignments.set(new Map(data.userAssignments.map((e: any) => [
          e[0],
          { ...e[1], assignedAt: new Date(e[1].assignedAt) }
        ])));
      }
      
      console.log('[ABTesting] 已從存儲恢復數據');
    } catch (e) {
      console.error('[ABTesting] 恢復數據失敗:', e);
    }
  }
}
