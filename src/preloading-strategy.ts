/**
 * TG-AI智控王 預加載策略
 * Preloading Strategy - 優化路由加載性能
 * 
 * 🆕 Phase 25: 實現智能預加載
 */

import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

/**
 * 選擇性預加載策略
 * 根據路由配置的 preload 標記決定是否預加載
 */
@Injectable({
  providedIn: 'root'
})
export class SelectivePreloadingStrategy implements PreloadingStrategy {
  // 已預加載的路由
  preloadedRoutes: string[] = [];
  
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    // 檢查路由是否標記為預加載
    if (route.data?.['preload'] === true) {
      const delay = route.data?.['preloadDelay'] || 0;
      
      // 記錄預加載的路由
      if (route.path) {
        this.preloadedRoutes.push(route.path);
      }
      
      // 延遲預加載
      if (delay > 0) {
        return timer(delay).pipe(
          mergeMap(() => {
            console.log(`[Preload] Loading: ${route.path} (delayed ${delay}ms)`);
            return load();
          })
        );
      }
      
      console.log(`[Preload] Loading: ${route.path}`);
      return load();
    }
    
    return of(null);
  }
}

/**
 * 按需預加載策略
 * 當用戶 hover 導航菜單時預加載
 */
@Injectable({
  providedIn: 'root'
})
export class OnDemandPreloadingStrategy implements PreloadingStrategy {
  private preloadQueue = new Set<string>();
  private loadFunctions = new Map<string, () => Observable<any>>();
  
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    // 存儲加載函數供後續按需調用
    if (route.path) {
      this.loadFunctions.set(route.path, load);
    }
    
    // 默認不預加載
    return of(null);
  }
  
  /**
   * 觸發預加載指定路由
   */
  startPreload(path: string): void {
    if (this.preloadQueue.has(path)) return;
    
    const loadFn = this.loadFunctions.get(path);
    if (loadFn) {
      this.preloadQueue.add(path);
      console.log(`[OnDemand] Preloading: ${path}`);
      loadFn().subscribe();
    }
  }
}

/**
 * 網絡感知預加載策略
 * 根據網絡狀況決定預加載行為
 */
@Injectable({
  providedIn: 'root'
})
export class NetworkAwarePreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    // 檢查網絡狀況
    const connection = (navigator as any).connection;
    
    if (connection) {
      // 慢速網絡不預加載
      if (connection.saveData || connection.effectiveType === '2g') {
        console.log(`[NetworkAware] Skip preload (slow network): ${route.path}`);
        return of(null);
      }
      
      // 4G/WiFi 完全預加載
      if (connection.effectiveType === '4g' || connection.type === 'wifi') {
        if (route.data?.['preload'] !== false) {
          console.log(`[NetworkAware] Preloading: ${route.path}`);
          return load();
        }
      }
    }
    
    // 默認策略：只預加載標記的路由
    if (route.data?.['preload'] === true) {
      return load();
    }
    
    return of(null);
  }
}

/**
 * 🔧 P6-2: 智能預加載策略（推薦）
 * 結合多種策略的優點 + 網絡感知
 * 
 * 策略分層：
 * 1. 核心路由 → 首次空閒時立即預加載（dashboard, accounts）
 * 2. 常用路由 → 延遲 3 秒預加載（wallet, quota, settings）
 * 3. 業務路由 → 空閒時預加載（leads, automation, marketing-hub）
 * 4. 低頻路由 → 不預加載，按需加載
 * 
 * 網絡感知：
 * - 2G/saveData 模式下僅預加載核心路由
 * - 3G 模式下預加載核心 + 常用路由
 * - 4G/WiFi 完全按策略預加載
 */
@Injectable({
  providedIn: 'root'
})
export class SmartPreloadingStrategy implements PreloadingStrategy {
  private preloadedRoutes = new Set<string>();
  
  // 核心路由（立即預加載 — 登入後必到）
  private coreRoutes = new Set(['dashboard', 'accounts']);
  
  // 常用路由（延遲 3 秒 — 高頻訪問）
  private commonRoutes = new Set(['wallet', 'quota', 'settings', 'user-settings']);
  
  // 業務路由（空閒時 — 中頻訪問）
  private idleRoutes = new Set([
    'leads', 'automation', 'monitoring',
    'resource-discovery',
    'marketing-hub', 'role-library', 'ai-engine',
    'analytics', 'billing', 'upgrade'
  ]);
  
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    const path = route.path || '';
    
    // 跳過已預加載、redirect、通配符
    if (this.preloadedRoutes.has(path) || route.redirectTo || path === '**') {
      return of(null);
    }
    
    // 網絡感知
    const networkTier = this._getNetworkTier();
    
    // 核心路由：立即預加載
    if (this.coreRoutes.has(path)) {
      this.preloadedRoutes.add(path);
      return load();
    }
    
    // 慢速網絡下不預加載非核心路由
    if (networkTier === 'slow') {
      return of(null);
    }
    
    // 常用路由：延遲預加載
    if (this.commonRoutes.has(path)) {
      return timer(3000).pipe(
        mergeMap(() => {
          this.preloadedRoutes.add(path);
          return load();
        })
      );
    }
    
    // 中等網絡不預加載空閒路由
    if (networkTier === 'medium') {
      return of(null);
    }
    
    // 業務路由：空閒時預加載（僅快速網絡）
    if (this.idleRoutes.has(path)) {
      return new Observable(observer => {
        const doLoad = () => {
          this.preloadedRoutes.add(path);
          load().subscribe({
            next: (val) => observer.next(val),
            error: (err) => observer.error(err),
            complete: () => observer.complete()
          });
        };
        
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(doLoad, { timeout: 8000 });
        } else {
          setTimeout(doLoad, 6000);
        }
      });
    }
    
    // 其他路由：不預加載（按需加載）
    return of(null);
  }
  
  /**
   * 獲取已預加載的路由
   */
  getPreloadedRoutes(): string[] {
    return Array.from(this.preloadedRoutes);
  }
  
  /**
   * 檢測網絡速度等級
   */
  private _getNetworkTier(): 'slow' | 'medium' | 'fast' {
    const connection = (navigator as any).connection;
    if (!connection) return 'fast'; // 無 API 時假設快速
    
    if (connection.saveData) return 'slow';
    
    const type = connection.effectiveType;
    if (type === '2g' || type === 'slow-2g') return 'slow';
    if (type === '3g') return 'medium';
    return 'fast'; // 4g, wifi 等
  }
}
