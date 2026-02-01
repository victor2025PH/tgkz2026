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
 * 智能預加載策略（推薦）
 * 結合多種策略的優點
 * 
 * 1. 核心路由立即預加載
 * 2. 常用路由延遲預加載
 * 3. 低優先級路由空閒時預加載
 */
@Injectable({
  providedIn: 'root'
})
export class SmartPreloadingStrategy implements PreloadingStrategy {
  private preloadedRoutes = new Set<string>();
  
  // 核心路由（立即預加載）
  private coreRoutes = ['dashboard', 'accounts'];
  
  // 常用路由（延遲 2 秒預加載）
  private commonRoutes = ['leads', 'automation', 'monitoring'];
  
  // 其他路由（空閒時預加載）
  private idleRoutes = ['analytics', 'ai-center', 'multi-role', 'settings'];
  
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    const path = route.path || '';
    
    // 已預加載則跳過
    if (this.preloadedRoutes.has(path)) {
      return of(null);
    }
    
    // 核心路由：立即預加載
    if (this.coreRoutes.includes(path)) {
      this.preloadedRoutes.add(path);
      console.log(`[Smart] Core preload: ${path}`);
      return load();
    }
    
    // 常用路由：延遲預加載
    if (this.commonRoutes.includes(path)) {
      return timer(2000).pipe(
        mergeMap(() => {
          this.preloadedRoutes.add(path);
          console.log(`[Smart] Common preload: ${path}`);
          return load();
        })
      );
    }
    
    // 其他路由：空閒時預加載
    if (this.idleRoutes.includes(path)) {
      return new Observable(observer => {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => {
            this.preloadedRoutes.add(path);
            console.log(`[Smart] Idle preload: ${path}`);
            load().subscribe({
              next: (val) => observer.next(val),
              error: (err) => observer.error(err),
              complete: () => observer.complete()
            });
          }, { timeout: 5000 });
        } else {
          // 回退到 setTimeout
          setTimeout(() => {
            this.preloadedRoutes.add(path);
            console.log(`[Smart] Fallback preload: ${path}`);
            load().subscribe({
              next: (val) => observer.next(val),
              error: (err) => observer.error(err),
              complete: () => observer.complete()
            });
          }, 5000);
        }
      });
    }
    
    return of(null);
  }
  
  /**
   * 獲取已預加載的路由
   */
  getPreloadedRoutes(): string[] {
    return Array.from(this.preloadedRoutes);
  }
}
