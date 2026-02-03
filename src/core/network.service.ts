/**
 * 網絡狀態服務
 * 
 * 🆕 功能：
 * 1. 監測網絡連接狀態
 * 2. 廣播在線/離線事件
 * 3. 提供友好的用戶提示
 */

import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import { Subject, Observable, fromEvent, merge } from 'rxjs';
import { map, startWith, distinctUntilChanged } from 'rxjs/operators';

// 網絡狀態類型
export type NetworkStatus = 'online' | 'offline' | 'slow';

// 網絡事件
export interface NetworkEvent {
  status: NetworkStatus;
  timestamp: number;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NetworkService implements OnDestroy {
  // 響應式狀態
  private _isOnline = signal<boolean>(navigator.onLine);
  private _status = signal<NetworkStatus>(navigator.onLine ? 'online' : 'offline');
  private _lastOfflineTime = signal<number | null>(null);
  
  // 事件主題
  private _networkEvents = new Subject<NetworkEvent>();
  
  // 公開的計算屬性
  readonly isOnline = computed(() => this._isOnline());
  readonly status = computed(() => this._status());
  readonly isOffline = computed(() => !this._isOnline());
  
  // 網絡事件流
  readonly networkEvents$: Observable<NetworkEvent> = this._networkEvents.asObservable();
  
  // 網絡狀態流（用於訂閱）
  readonly online$: Observable<boolean>;
  
  constructor() {
    // 創建在線狀態的 Observable
    this.online$ = merge(
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    ).pipe(
      startWith(navigator.onLine),
      distinctUntilChanged()
    );
    
    // 訂閱狀態變化
    this.online$.subscribe(isOnline => {
      this._isOnline.set(isOnline);
      this._status.set(isOnline ? 'online' : 'offline');
      
      if (!isOnline) {
        this._lastOfflineTime.set(Date.now());
        this._networkEvents.next({
          status: 'offline',
          timestamp: Date.now(),
          message: '網絡連接已斷開'
        });
        console.warn('[NetworkService] Network offline');
      } else {
        const offlineDuration = this._lastOfflineTime() 
          ? Math.round((Date.now() - this._lastOfflineTime()!) / 1000) 
          : 0;
        
        this._networkEvents.next({
          status: 'online',
          timestamp: Date.now(),
          message: offlineDuration > 0 
            ? `網絡已恢復（離線 ${offlineDuration} 秒）` 
            : '網絡已連接'
        });
        console.log('[NetworkService] Network online');
      }
    });
    
    // 檢測慢速網絡
    this.checkNetworkSpeed();
  }
  
  ngOnDestroy(): void {
    this._networkEvents.complete();
  }
  
  /**
   * 檢測網絡速度（使用 Navigator Connection API）
   */
  private checkNetworkSpeed(): void {
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
    
    if (connection) {
      // 監聽連接變化
      connection.addEventListener('change', () => {
        const effectiveType = connection.effectiveType; // 4g, 3g, 2g, slow-2g
        
        if (['slow-2g', '2g'].includes(effectiveType)) {
          this._status.set('slow');
          this._networkEvents.next({
            status: 'slow',
            timestamp: Date.now(),
            message: '網絡連接較慢，部分功能可能延遲'
          });
        } else if (this._status() === 'slow' && this._isOnline()) {
          this._status.set('online');
        }
      });
    }
  }
  
  /**
   * 手動觸發網絡檢查
   */
  async checkConnection(): Promise<boolean> {
    try {
      // 發送一個簡單的請求檢測連接
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-store'
      });
      
      const isOnline = response.ok;
      this._isOnline.set(isOnline);
      this._status.set(isOnline ? 'online' : 'offline');
      return isOnline;
    } catch {
      this._isOnline.set(false);
      this._status.set('offline');
      return false;
    }
  }
  
  /**
   * 獲取友好的狀態消息
   */
  getStatusMessage(): string {
    switch (this._status()) {
      case 'online':
        return '網絡連接正常';
      case 'offline':
        return '網絡已斷開，請檢查您的網絡連接';
      case 'slow':
        return '網絡連接較慢，請耐心等待';
      default:
        return '';
    }
  }
  
  /**
   * 獲取狀態圖標
   */
  getStatusIcon(): string {
    switch (this._status()) {
      case 'online':
        return '🟢';
      case 'offline':
        return '🔴';
      case 'slow':
        return '🟡';
      default:
        return '';
    }
  }
}
