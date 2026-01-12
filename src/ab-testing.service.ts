/**
 * A/B Testing Service
 * A/B 測試服務
 * 
 * 功能：
 * - 創建和管理 A/B 測試
 * - 變體分配
 * - 結果追蹤
 * - 統計顯著性計算
 */
import { Injectable, signal, computed } from '@angular/core';

// ============ 類型定義 ============

export type TestStatus = 'draft' | 'running' | 'paused' | 'completed';
export type MetricType = 'response_rate' | 'conversion_rate' | 'click_rate' | 'engagement';

export interface TestVariant {
  id: string;
  name: string;
  content: string;
  weight: number;  // 分配權重 (0-100)
  stats: VariantStats;
}

export interface VariantStats {
  impressions: number;      // 發送次數
  responses: number;        // 回覆次數
  conversions: number;      // 轉化次數
  clicks: number;           // 點擊次數
  responseRate: number;     // 回覆率
  conversionRate: number;   // 轉化率
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  type: 'message' | 'template' | 'timing' | 'persona';
  status: TestStatus;
  variants: TestVariant[];
  targetMetric: MetricType;
  minimumSampleSize: number;
  confidenceLevel: number;  // 0-1, 通常 0.95
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  winnerVariantId?: string;
}

export interface TestResult {
  testId: string;
  isSignificant: boolean;
  confidence: number;
  winnerVariantId?: string;
  improvement: number;  // 相對基準的改善百分比
  variants: {
    variantId: string;
    mean: number;
    standardError: number;
    confidenceInterval: [number, number];
  }[];
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class ABTestingService {
  
  // 所有測試
  private _tests = signal<ABTest[]>([]);
  tests = this._tests.asReadonly();
  
  // 計算屬性
  activeTests = computed(() => 
    this._tests().filter(t => t.status === 'running')
  );
  
  completedTests = computed(() => 
    this._tests().filter(t => t.status === 'completed')
  );
  
  constructor() {
    this.loadTests();
  }
  
  // ============ 測試管理 ============
  
  /**
   * 創建新測試
   */
  createTest(params: {
    name: string;
    description: string;
    type: ABTest['type'];
    variants: { name: string; content: string; weight?: number }[];
    targetMetric: MetricType;
    minimumSampleSize?: number;
    confidenceLevel?: number;
  }): ABTest {
    const totalWeight = params.variants.reduce((sum, v) => sum + (v.weight || 50), 0);
    
    const test: ABTest = {
      id: 'test-' + Date.now().toString(36),
      name: params.name,
      description: params.description,
      type: params.type,
      status: 'draft',
      targetMetric: params.targetMetric,
      minimumSampleSize: params.minimumSampleSize || 100,
      confidenceLevel: params.confidenceLevel || 0.95,
      createdAt: new Date(),
      variants: params.variants.map((v, i) => ({
        id: `variant-${i}`,
        name: v.name || (i === 0 ? '對照組 A' : `變體 ${String.fromCharCode(65 + i)}`),
        content: v.content,
        weight: Math.round(((v.weight || 50) / totalWeight) * 100),
        stats: {
          impressions: 0,
          responses: 0,
          conversions: 0,
          clicks: 0,
          responseRate: 0,
          conversionRate: 0
        }
      }))
    };
    
    this._tests.update(tests => [...tests, test]);
    this.saveTests();
    
    return test;
  }
  
  /**
   * 開始測試
   */
  startTest(testId: string): void {
    this._tests.update(tests => 
      tests.map(t => 
        t.id === testId 
          ? { ...t, status: 'running' as TestStatus, startedAt: new Date() }
          : t
      )
    );
    this.saveTests();
  }
  
  /**
   * 暫停測試
   */
  pauseTest(testId: string): void {
    this._tests.update(tests => 
      tests.map(t => 
        t.id === testId ? { ...t, status: 'paused' as TestStatus } : t
      )
    );
    this.saveTests();
  }
  
  /**
   * 結束測試
   */
  completeTest(testId: string): void {
    const test = this._tests().find(t => t.id === testId);
    if (!test) return;
    
    const result = this.analyzeTest(testId);
    
    this._tests.update(tests => 
      tests.map(t => 
        t.id === testId 
          ? { 
              ...t, 
              status: 'completed' as TestStatus, 
              completedAt: new Date(),
              winnerVariantId: result?.winnerVariantId
            }
          : t
      )
    );
    this.saveTests();
  }
  
  /**
   * 刪除測試
   */
  deleteTest(testId: string): void {
    this._tests.update(tests => tests.filter(t => t.id !== testId));
    this.saveTests();
  }
  
  // ============ 變體分配 ============
  
  /**
   * 獲取隨機變體（根據權重）
   */
  getVariant(testId: string): TestVariant | null {
    const test = this._tests().find(t => t.id === testId);
    if (!test || test.status !== 'running') return null;
    
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (const variant of test.variants) {
      cumulative += variant.weight;
      if (random <= cumulative) {
        return variant;
      }
    }
    
    return test.variants[test.variants.length - 1];
  }
  
  /**
   * 記錄展示（發送）
   */
  recordImpression(testId: string, variantId: string): void {
    this.updateVariantStats(testId, variantId, stats => ({
      ...stats,
      impressions: stats.impressions + 1
    }));
  }
  
  /**
   * 記錄回覆
   */
  recordResponse(testId: string, variantId: string): void {
    this.updateVariantStats(testId, variantId, stats => {
      const responses = stats.responses + 1;
      return {
        ...stats,
        responses,
        responseRate: stats.impressions > 0 ? (responses / stats.impressions) * 100 : 0
      };
    });
  }
  
  /**
   * 記錄轉化
   */
  recordConversion(testId: string, variantId: string): void {
    this.updateVariantStats(testId, variantId, stats => {
      const conversions = stats.conversions + 1;
      return {
        ...stats,
        conversions,
        conversionRate: stats.impressions > 0 ? (conversions / stats.impressions) * 100 : 0
      };
    });
  }
  
  /**
   * 記錄點擊
   */
  recordClick(testId: string, variantId: string): void {
    this.updateVariantStats(testId, variantId, stats => ({
      ...stats,
      clicks: stats.clicks + 1
    }));
  }
  
  private updateVariantStats(
    testId: string, 
    variantId: string, 
    updater: (stats: VariantStats) => VariantStats
  ): void {
    this._tests.update(tests => 
      tests.map(t => {
        if (t.id !== testId) return t;
        return {
          ...t,
          variants: t.variants.map(v => 
            v.id === variantId ? { ...v, stats: updater(v.stats) } : v
          )
        };
      })
    );
    this.saveTests();
  }
  
  // ============ 統計分析 ============
  
  /**
   * 分析測試結果
   */
  analyzeTest(testId: string): TestResult | null {
    const test = this._tests().find(t => t.id === testId);
    if (!test || test.variants.length < 2) return null;
    
    const metric = test.targetMetric;
    const variants = test.variants;
    
    // 計算每個變體的指標
    const variantResults = variants.map(v => {
      const rate = this.getMetricValue(v.stats, metric);
      const n = v.stats.impressions;
      const se = n > 0 ? Math.sqrt((rate * (100 - rate)) / n) : 0;
      
      return {
        variantId: v.id,
        mean: rate,
        n,
        standardError: se,
        confidenceInterval: this.calculateCI(rate, se, test.confidenceLevel) as [number, number]
      };
    });
    
    // 找出最佳變體
    const sorted = [...variantResults].sort((a, b) => b.mean - a.mean);
    const best = sorted[0];
    const control = variantResults[0];  // 假設第一個是對照組
    
    // 計算統計顯著性 (z-test)
    const zScore = this.calculateZScore(
      best.mean, control.mean,
      best.standardError, control.standardError
    );
    const pValue = this.zToPValue(zScore);
    const isSignificant = pValue < (1 - test.confidenceLevel);
    
    // 計算改善幅度
    const improvement = control.mean > 0 
      ? ((best.mean - control.mean) / control.mean) * 100 
      : 0;
    
    return {
      testId,
      isSignificant,
      confidence: 1 - pValue,
      winnerVariantId: isSignificant ? best.variantId : undefined,
      improvement,
      variants: variantResults
    };
  }
  
  /**
   * 獲取指標值
   */
  private getMetricValue(stats: VariantStats, metric: MetricType): number {
    switch (metric) {
      case 'response_rate':
        return stats.responseRate;
      case 'conversion_rate':
        return stats.conversionRate;
      case 'click_rate':
        return stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0;
      case 'engagement':
        return stats.impressions > 0 
          ? ((stats.responses + stats.clicks) / stats.impressions) * 100 
          : 0;
      default:
        return 0;
    }
  }
  
  /**
   * 計算置信區間
   */
  private calculateCI(mean: number, se: number, confidence: number): [number, number] {
    const z = this.getZScore(confidence);
    return [
      Math.max(0, mean - z * se),
      Math.min(100, mean + z * se)
    ];
  }
  
  /**
   * 獲取 Z 分數
   */
  private getZScore(confidence: number): number {
    // 常用置信度對應的 Z 分數
    const zScores: Record<number, number> = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576
    };
    return zScores[confidence] || 1.96;
  }
  
  /**
   * 計算兩組之間的 Z 分數
   */
  private calculateZScore(mean1: number, mean2: number, se1: number, se2: number): number {
    const seDiff = Math.sqrt(se1 * se1 + se2 * se2);
    return seDiff > 0 ? (mean1 - mean2) / seDiff : 0;
  }
  
  /**
   * Z 分數轉 P 值
   */
  private zToPValue(z: number): number {
    // 使用近似公式
    const absZ = Math.abs(z);
    const t = 1 / (1 + 0.2316419 * absZ);
    const d = 0.3989423 * Math.exp(-absZ * absZ / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return 2 * p;  // 雙尾測試
  }
  
  /**
   * 檢查是否達到樣本量
   */
  hasSufficientSample(testId: string): boolean {
    const test = this._tests().find(t => t.id === testId);
    if (!test) return false;
    
    return test.variants.every(v => v.stats.impressions >= test.minimumSampleSize);
  }
  
  /**
   * 獲取測試進度
   */
  getTestProgress(testId: string): number {
    const test = this._tests().find(t => t.id === testId);
    if (!test) return 0;
    
    const minImpressions = Math.min(...test.variants.map(v => v.stats.impressions));
    return Math.min(100, (minImpressions / test.minimumSampleSize) * 100);
  }
  
  // ============ 持久化 ============
  
  private loadTests(): void {
    try {
      const stored = localStorage.getItem('tg-matrix-ab-tests');
      if (stored) {
        const tests = JSON.parse(stored);
        this._tests.set(tests.map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          startedAt: t.startedAt ? new Date(t.startedAt) : undefined,
          completedAt: t.completedAt ? new Date(t.completedAt) : undefined
        })));
      }
    } catch (e) {
      console.error('Failed to load A/B tests:', e);
    }
  }
  
  private saveTests(): void {
    try {
      localStorage.setItem('tg-matrix-ab-tests', JSON.stringify(this._tests()));
    } catch (e) {
      console.error('Failed to save A/B tests:', e);
    }
  }
}
