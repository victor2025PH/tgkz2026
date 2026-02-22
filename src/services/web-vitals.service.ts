/**
 * 🔧 P7-6: 前端性能監控服務
 * 
 * 採集 Core Web Vitals + 自定義指標，上報到後端。
 * 
 * 指標說明：
 * - LCP (Largest Contentful Paint): 最大內容渲染時間，衡量加載性能
 * - FID (First Input Delay): 首次輸入延遲，衡量交互性
 * - CLS (Cumulative Layout Shift): 累積布局偏移，衡量視覺穩定性
 * - FCP (First Contentful Paint): 首次內容渲染
 * - TTFB (Time to First Byte): 首字節時間
 * - INP (Interaction to Next Paint): 下一次繪製的交互延遲（FID 替代）
 * 
 * 使用 PerformanceObserver API（無需第三方依賴）
 */

import { Injectable, OnDestroy } from '@angular/core';

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface PerformanceReport {
  metrics: PerformanceMetric[];
  navigation: {
    type: string;
    redirectCount: number;
    loadTime: number;
    domContentLoaded: number;
    domInteractive: number;
  } | null;
  url: string;
  userAgent: string;
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
}

// Web Vitals 閾值（Google 推薦值）
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
};

@Injectable({
  providedIn: 'root'
})
export class WebVitalsService implements OnDestroy {
  private observers: PerformanceObserver[] = [];
  private metrics: PerformanceMetric[] = [];
  private reported = false;
  private reportTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // 在瀏覽器環境才初始化
    if (typeof window !== 'undefined' && typeof PerformanceObserver !== 'undefined') {
      this.initObservers();
      this.scheduleReport();
    }
  }

  ngOnDestroy(): void {
    this.observers.forEach(obs => {
      try { obs.disconnect(); } catch { /* ignore */ }
    });
    if (this.reportTimeout) {
      clearTimeout(this.reportTimeout);
    }
  }

  /**
   * 初始化 PerformanceObserver 來採集各項指標
   */
  private initObservers(): void {
    // LCP (Largest Contentful Paint)
    this.observe('largest-contentful-paint', (entries) => {
      const last = entries[entries.length - 1];
      if (last) {
        this.recordMetric('LCP', last.startTime);
      }
    });

    // FID (First Input Delay) — 使用 Event Timing API
    this.observe('first-input', (entries) => {
      const first = entries[0] as any;
      if (first) {
        const fid = first.processingStart - first.startTime;
        this.recordMetric('FID', fid);
      }
    });

    // CLS (Cumulative Layout Shift)
    let clsValue = 0;
    let clsEntries: PerformanceEntry[] = [];
    this.observe('layout-shift', (entries) => {
      for (const entry of entries) {
        const lsEntry = entry as any;
        // 只計算非用戶交互觸發的布局偏移
        if (!lsEntry.hadRecentInput) {
          clsValue += lsEntry.value;
          clsEntries.push(entry);
        }
      }
      this.recordMetric('CLS', clsValue);
    });

    // FCP (First Contentful Paint)
    this.observe('paint', (entries) => {
      for (const entry of entries) {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric('FCP', entry.startTime);
        }
      }
    });

    // Navigation Timing（TTFB 等）
    this.observe('navigation', (entries) => {
      const nav = entries[0] as PerformanceNavigationTiming;
      if (nav) {
        const ttfb = nav.responseStart - nav.requestStart;
        this.recordMetric('TTFB', ttfb);
      }
    });

    // INP (Interaction to Next Paint) — Event Timing with duration
    this.observe('event', (entries) => {
      let maxDuration = 0;
      for (const entry of entries) {
        const eventEntry = entry as any;
        if (eventEntry.duration > maxDuration) {
          maxDuration = eventEntry.duration;
        }
      }
      if (maxDuration > 0) {
        this.recordMetric('INP', maxDuration);
      }
    }, { durationThreshold: 40 });
  }

  /**
   * 安全地創建 PerformanceObserver
   */
  private observe(
    type: string,
    callback: (entries: PerformanceEntryList) => void,
    options?: any
  ): void {
    try {
      // 檢查瀏覽器是否支持該類型
      if (!PerformanceObserver.supportedEntryTypes?.includes(type)) {
        return;
      }

      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });

      const observeOptions: PerformanceObserverInit = {
        type,
        buffered: true,
        ...options
      };

      observer.observe(observeOptions);
      this.observers.push(observer);
    } catch {
      // 不支持的類型，靜默跳過
    }
  }

  /**
   * 記錄指標
   */
  private recordMetric(name: string, value: number): void {
    const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
    let rating: 'good' | 'needs-improvement' | 'poor' = 'good';

    if (threshold) {
      if (value > threshold.poor) {
        rating = 'poor';
      } else if (value > threshold.good) {
        rating = 'needs-improvement';
      }
    }

    // 更新已有指標或添加新的
    const existing = this.metrics.findIndex(m => m.name === name);
    const metric: PerformanceMetric = {
      name,
      value: Math.round(value * 100) / 100, // 保留 2 位小數
      rating,
      timestamp: Date.now()
    };

    if (existing >= 0) {
      this.metrics[existing] = metric;
    } else {
      this.metrics.push(metric);
    }
  }

  /**
   * 延遲上報（頁面加載完成 10 秒後）
   */
  private scheduleReport(): void {
    // 頁面完全加載後 10 秒上報
    if (document.readyState === 'complete') {
      this.reportTimeout = setTimeout(() => this.sendReport(), 10000);
    } else {
      window.addEventListener('load', () => {
        this.reportTimeout = setTimeout(() => this.sendReport(), 10000);
      }, { once: true });
    }

    // 頁面關閉前也嘗試上報
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && !this.reported) {
        this.sendReport();
      }
    });
  }

  /**
   * 發送性能報告到後端
   * 開發/桌面版（localhost:4200 或無 HTTP API）時跳過，避免 404
   */
  private sendReport(): void {
    if (this.reported || this.metrics.length === 0) return;
    const isDevServer = window.location.port === '4200' && window.location.hostname === 'localhost';
    let isElectron = !!(window as any).electronAPI || !!(window as any).electron;
    try {
      if (!isElectron && (window as any).require) isElectron = !!(window as any).require('electron');
    } catch {}
    if (isDevServer || isElectron) return;
    this.reported = true;

    const report: PerformanceReport = {
      metrics: [...this.metrics],
      navigation: this.getNavigationTiming(),
      url: window.location.pathname,
      userAgent: navigator.userAgent,
      connection: this.getConnectionInfo()
    };

    // 使用 sendBeacon 確保頁面關閉時也能發送
    const payload = JSON.stringify(report);

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/v1/performance', payload);
      } else {
        fetch('/api/v1/performance', {
          method: 'POST',
          body: payload,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true
        }).catch(() => { /* 靜默失敗 */ });
      }
    } catch {
      // 靜默失敗 — 性能監控不應影響用戶體驗
    }
  }

  /**
   * 獲取導航計時
   */
  private getNavigationTiming(): PerformanceReport['navigation'] {
    try {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (!nav) return null;

      return {
        type: nav.type,
        redirectCount: nav.redirectCount,
        loadTime: Math.round(nav.loadEventEnd - nav.startTime),
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
        domInteractive: Math.round(nav.domInteractive - nav.startTime)
      };
    } catch {
      return null;
    }
  }

  /**
   * 獲取網絡信息
   */
  private getConnectionInfo(): PerformanceReport['connection'] {
    try {
      const conn = (navigator as any).connection;
      if (!conn) return undefined;

      return {
        effectiveType: conn.effectiveType || 'unknown',
        downlink: conn.downlink || 0,
        rtt: conn.rtt || 0
      };
    } catch {
      return undefined;
    }
  }

  // ==================== 公開 API ====================

  /**
   * 獲取當前採集到的指標（用於調試）
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * 手動記錄自定義指標
   */
  recordCustomMetric(name: string, value: number): void {
    this.recordMetric(name, value);
  }

  /**
   * 測量操作耗時
   */
  measureDuration(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(label, duration);
    };
  }
}
