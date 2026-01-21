/**
 * A/B 測試服務
 * A/B Testing Service
 * 
 * 功能：
 * 1. 創建和管理 A/B 測試
 * 2. 自動分配變體
 * 3. 統計和分析結果
 * 4. 確定勝出方案
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

// A/B 測試狀態
export type ABTestStatus = 'draft' | 'running' | 'paused' | 'completed' | 'archived';

// 變體類型
export interface ABVariant {
  id: string;
  name: string;              // 如 "A", "B", "C"
  content: string;           // 消息內容
  weight: number;            // 分配權重 (0-100)
  
  // 統計數據
  stats: {
    sent: number;            // 已發送
    delivered: number;       // 已送達
    opened: number;          // 已打開（如可追蹤）
    replied: number;         // 已回覆
    converted: number;       // 已轉化
    
    // 計算指標
    deliveryRate: number;    // 送達率
    replyRate: number;       // 回覆率
    conversionRate: number;  // 轉化率
  };
}

// A/B 測試
export interface ABTest {
  id: string;
  name: string;
  description?: string;
  status: ABTestStatus;
  
  // 測試設置
  templateId?: string;       // 關聯的模板 ID
  targetAudience?: string;   // 目標受眾描述
  sampleSize: number;        // 目標樣本量
  confidenceLevel: number;   // 置信度 (如 95)
  
  // 變體
  variants: ABVariant[];
  
  // 結果
  winner?: string;           // 勝出變體 ID
  winnerConfidence?: number; // 勝出置信度
  
  // 時間
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  
  // 備註
  notes?: string;
}

// A/B 測試創建請求
export interface CreateABTestRequest {
  name: string;
  description?: string;
  variants: {
    name: string;
    content: string;
    weight?: number;
  }[];
  sampleSize?: number;
  confidenceLevel?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ABTestingService {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  
  // 所有測試
  private _tests = signal<ABTest[]>([]);
  tests = this._tests.asReadonly();
  
  // 活躍測試
  activeTests = computed(() => 
    this._tests().filter(t => t.status === 'running')
  );
  
  // 已完成測試
  completedTests = computed(() =>
    this._tests().filter(t => t.status === 'completed')
  );
  
  // 當前選中的測試
  private _selectedTest = signal<ABTest | null>(null);
  selectedTest = this._selectedTest.asReadonly();
  
  // 統計
  stats = computed(() => {
    const tests = this._tests();
    return {
      total: tests.length,
      running: tests.filter(t => t.status === 'running').length,
      completed: tests.filter(t => t.status === 'completed').length,
      avgConversionLift: this.calculateAvgConversionLift(tests)
    };
  });
  
  constructor() {
    this.loadTests();
    this.setupIpcListeners();
  }
  
  /**
   * 設置 IPC 監聽器
   */
  private setupIpcListeners() {
    // 監聽消息發送結果
    this.ipc.on('ab-test:message-sent', (data: { testId: string; variantId: string }) => {
      this.incrementStat(data.testId, data.variantId, 'sent');
    });
    
    // 監聯回覆
    this.ipc.on('ab-test:reply-received', (data: { testId: string; variantId: string }) => {
      this.incrementStat(data.testId, data.variantId, 'replied');
      this.checkTestCompletion(data.testId);
    });
    
    // 監聽轉化
    this.ipc.on('ab-test:conversion', (data: { testId: string; variantId: string }) => {
      this.incrementStat(data.testId, data.variantId, 'converted');
    });
  }
  
  /**
   * 載入測試列表
   */
  private loadTests() {
    try {
      const stored = localStorage.getItem('tg-matrix-ab-tests');
      if (stored) {
        this._tests.set(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load A/B tests:', e);
    }
  }
  
  /**
   * 保存測試列表
   */
  private saveTests() {
    try {
      localStorage.setItem('tg-matrix-ab-tests', JSON.stringify(this._tests()));
    } catch (e) {
      console.error('Failed to save A/B tests:', e);
    }
  }
  
  /**
   * 創建新測試
   */
  createTest(request: CreateABTestRequest): ABTest {
    const id = `abt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 處理變體權重
    const totalWeight = request.variants.reduce((sum, v) => sum + (v.weight || 0), 0);
    const defaultWeight = Math.floor(100 / request.variants.length);
    
    const variants: ABVariant[] = request.variants.map((v, i) => ({
      id: `var_${i}_${Math.random().toString(36).substr(2, 9)}`,
      name: v.name || String.fromCharCode(65 + i), // A, B, C...
      content: v.content,
      weight: totalWeight > 0 ? v.weight || 0 : defaultWeight,
      stats: {
        sent: 0,
        delivered: 0,
        opened: 0,
        replied: 0,
        converted: 0,
        deliveryRate: 0,
        replyRate: 0,
        conversionRate: 0
      }
    }));
    
    const test: ABTest = {
      id,
      name: request.name,
      description: request.description,
      status: 'draft',
      sampleSize: request.sampleSize || 100,
      confidenceLevel: request.confidenceLevel || 95,
      variants,
      createdAt: new Date().toISOString()
    };
    
    this._tests.update(tests => [test, ...tests]);
    this.saveTests();
    
    this.toast.success(`A/B 測試 "${test.name}" 已創建`);
    return test;
  }
  
  /**
   * 開始測試
   */
  startTest(testId: string): void {
    this._tests.update(tests =>
      tests.map(t => t.id === testId ? {
        ...t,
        status: 'running' as ABTestStatus,
        startedAt: new Date().toISOString()
      } : t)
    );
    this.saveTests();
    this.toast.success('A/B 測試已開始');
  }
  
  /**
   * 暫停測試
   */
  pauseTest(testId: string): void {
    this._tests.update(tests =>
      tests.map(t => t.id === testId ? {
        ...t,
        status: 'paused' as ABTestStatus
      } : t)
    );
    this.saveTests();
    this.toast.info('A/B 測試已暫停');
  }
  
  /**
   * 恢復測試
   */
  resumeTest(testId: string): void {
    this._tests.update(tests =>
      tests.map(t => t.id === testId ? {
        ...t,
        status: 'running' as ABTestStatus
      } : t)
    );
    this.saveTests();
    this.toast.success('A/B 測試已恢復');
  }
  
  /**
   * 結束測試並確定勝出者
   */
  completeTest(testId: string): ABTest | null {
    const test = this._tests().find(t => t.id === testId);
    if (!test) return null;
    
    // 計算勝出者
    const { winner, confidence } = this.determineWinner(test);
    
    this._tests.update(tests =>
      tests.map(t => t.id === testId ? {
        ...t,
        status: 'completed' as ABTestStatus,
        completedAt: new Date().toISOString(),
        winner,
        winnerConfidence: confidence
      } : t)
    );
    this.saveTests();
    
    if (winner) {
      const winnerVariant = test.variants.find(v => v.id === winner);
      this.toast.success(`測試完成！勝出方案: ${winnerVariant?.name} (${confidence?.toFixed(1)}% 置信度)`);
    } else {
      this.toast.info('測試完成，但無法確定明顯勝出者');
    }
    
    return this._tests().find(t => t.id === testId) || null;
  }
  
  /**
   * 刪除測試
   */
  deleteTest(testId: string): void {
    this._tests.update(tests => tests.filter(t => t.id !== testId));
    this.saveTests();
    this.toast.info('A/B 測試已刪除');
  }
  
  /**
   * 選擇測試
   */
  selectTest(testId: string): void {
    const test = this._tests().find(t => t.id === testId);
    this._selectedTest.set(test || null);
  }
  
  /**
   * 根據權重分配變體
   */
  assignVariant(testId: string): ABVariant | null {
    const test = this._tests().find(t => t.id === testId);
    if (!test || test.status !== 'running') return null;
    
    // 加權隨機選擇
    const totalWeight = test.variants.reduce((sum, v) => sum + v.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const variant of test.variants) {
      random -= variant.weight;
      if (random <= 0) {
        return variant;
      }
    }
    
    return test.variants[0];
  }
  
  /**
   * 增加統計
   */
  private incrementStat(
    testId: string,
    variantId: string,
    stat: 'sent' | 'delivered' | 'opened' | 'replied' | 'converted'
  ): void {
    this._tests.update(tests =>
      tests.map(t => {
        if (t.id !== testId) return t;
        
        return {
          ...t,
          variants: t.variants.map(v => {
            if (v.id !== variantId) return v;
            
            const newStats = { ...v.stats };
            newStats[stat]++;
            
            // 重新計算比率
            newStats.deliveryRate = newStats.sent > 0 ? (newStats.delivered / newStats.sent) * 100 : 0;
            newStats.replyRate = newStats.sent > 0 ? (newStats.replied / newStats.sent) * 100 : 0;
            newStats.conversionRate = newStats.sent > 0 ? (newStats.converted / newStats.sent) * 100 : 0;
            
            return { ...v, stats: newStats };
          })
        };
      })
    );
    this.saveTests();
  }
  
  /**
   * 手動更新統計
   */
  updateVariantStats(
    testId: string,
    variantId: string,
    stats: Partial<ABVariant['stats']>
  ): void {
    this._tests.update(tests =>
      tests.map(t => {
        if (t.id !== testId) return t;
        
        return {
          ...t,
          variants: t.variants.map(v => {
            if (v.id !== variantId) return v;
            
            const newStats = { ...v.stats, ...stats };
            
            // 重新計算比率
            newStats.deliveryRate = newStats.sent > 0 ? (newStats.delivered / newStats.sent) * 100 : 0;
            newStats.replyRate = newStats.sent > 0 ? (newStats.replied / newStats.sent) * 100 : 0;
            newStats.conversionRate = newStats.sent > 0 ? (newStats.converted / newStats.sent) * 100 : 0;
            
            return { ...v, stats: newStats };
          })
        };
      })
    );
    this.saveTests();
  }
  
  /**
   * 檢查測試是否達到樣本量
   */
  private checkTestCompletion(testId: string): void {
    const test = this._tests().find(t => t.id === testId);
    if (!test || test.status !== 'running') return;
    
    const totalSent = test.variants.reduce((sum, v) => sum + v.stats.sent, 0);
    
    if (totalSent >= test.sampleSize) {
      this.completeTest(testId);
    }
  }
  
  /**
   * 確定勝出者
   * 使用簡化的統計顯著性計算
   */
  private determineWinner(test: ABTest): { winner: string | undefined; confidence: number | undefined } {
    if (test.variants.length < 2) {
      return { winner: test.variants[0]?.id, confidence: 100 };
    }
    
    // 按轉化率排序
    const sorted = [...test.variants].sort(
      (a, b) => b.stats.conversionRate - a.stats.conversionRate
    );
    
    const best = sorted[0];
    const second = sorted[1];
    
    // 計算簡化的置信度
    // 真正的 A/B 測試應該使用 Chi-square 或 Z-test
    const bestSample = best.stats.sent;
    const secondSample = second.stats.sent;
    
    if (bestSample < 30 || secondSample < 30) {
      // 樣本量不足
      return { winner: undefined, confidence: undefined };
    }
    
    const diff = best.stats.conversionRate - second.stats.conversionRate;
    
    if (diff < 1) {
      // 差異太小
      return { winner: undefined, confidence: undefined };
    }
    
    // 簡化的置信度估算
    const confidence = Math.min(99, 50 + diff * 5 + Math.min(bestSample, 100) / 5);
    
    if (confidence >= test.confidenceLevel) {
      return { winner: best.id, confidence };
    }
    
    return { winner: undefined, confidence };
  }
  
  /**
   * 計算平均轉化提升
   */
  private calculateAvgConversionLift(tests: ABTest[]): number {
    const completedWithWinner = tests.filter(t => t.status === 'completed' && t.winner);
    if (completedWithWinner.length === 0) return 0;
    
    const lifts = completedWithWinner.map(test => {
      const winner = test.variants.find(v => v.id === test.winner);
      const others = test.variants.filter(v => v.id !== test.winner);
      
      if (!winner || others.length === 0) return 0;
      
      const avgOther = others.reduce((sum, v) => sum + v.stats.conversionRate, 0) / others.length;
      
      if (avgOther === 0) return 0;
      
      return ((winner.stats.conversionRate - avgOther) / avgOther) * 100;
    });
    
    return lifts.reduce((sum, lift) => sum + lift, 0) / lifts.length;
  }
  
  /**
   * 獲取測試報告
   */
  getTestReport(testId: string): string {
    const test = this._tests().find(t => t.id === testId);
    if (!test) return '';
    
    let report = `# A/B 測試報告: ${test.name}\n\n`;
    report += `狀態: ${test.status}\n`;
    report += `創建時間: ${new Date(test.createdAt).toLocaleString()}\n`;
    
    if (test.startedAt) {
      report += `開始時間: ${new Date(test.startedAt).toLocaleString()}\n`;
    }
    
    if (test.completedAt) {
      report += `完成時間: ${new Date(test.completedAt).toLocaleString()}\n`;
    }
    
    report += `\n## 變體結果\n\n`;
    report += `| 變體 | 發送 | 回覆 | 轉化 | 回覆率 | 轉化率 |\n`;
    report += `|------|------|------|------|--------|--------|\n`;
    
    for (const v of test.variants) {
      const isWinner = v.id === test.winner;
      report += `| ${v.name}${isWinner ? ' 🏆' : ''} | ${v.stats.sent} | ${v.stats.replied} | ${v.stats.converted} | ${v.stats.replyRate.toFixed(1)}% | ${v.stats.conversionRate.toFixed(1)}% |\n`;
    }
    
    if (test.winner) {
      const winner = test.variants.find(v => v.id === test.winner);
      report += `\n## 結論\n\n`;
      report += `勝出方案: **${winner?.name}** (置信度 ${test.winnerConfidence?.toFixed(1)}%)\n`;
    }
    
    return report;
  }
}
