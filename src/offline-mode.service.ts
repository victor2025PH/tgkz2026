/**
 * TG-AI智控王 Offline Mode Service
 * 離線模式管理服務 v2.0
 * 
 * 功能：
 * - 網絡狀態監控
 * - 自動重連機制
 * - 離線功能降級
 * - 數據緩存同步
 */
import { Injectable, signal, computed, inject, NgZone, OnDestroy } from '@angular/core';
import { ToastService } from './toast.service';
import { MembershipService } from './membership.service';

export type NetworkStatus = 'online' | 'offline' | 'reconnecting';

export interface OfflineConfig {
  // 離線寬限期（小時）
  gracePeriodHours: number;
  // 重連間隔（秒）
  reconnectInterval: number;
  // 最大重連次數
  maxReconnectAttempts: number;
  // 功能降級等級
  degradationLevel: 'none' | 'partial' | 'full';
}

export interface CachedData {
  membership: any;
  quotas: any;
  lastSync: number;
}

@Injectable({
  providedIn: 'root'
})
export class OfflineModeService implements OnDestroy {
  private ngZone = inject(NgZone);
  private toastService = inject(ToastService);
  private membershipService = inject(MembershipService);
  
  // 網絡狀態
  private _networkStatus = signal<NetworkStatus>('online');
  private _lastOnlineTime = signal<Date | null>(null);
  private _reconnectAttempts = signal(0);
  
  // 離線計時
  private _offlineDuration = signal(0);  // 分鐘
  
  // 配置
  private config: OfflineConfig = {
    gracePeriodHours: 72,  // 72小時離線寬限期
    reconnectInterval: 30,  // 30秒重連間隔
    maxReconnectAttempts: 10,
    degradationLevel: 'none'
  };
  
  // 緩存
  private cachedData: CachedData | null = null;
  private readonly CACHE_KEY = 'tgai-offline-cache';
  private readonly LAST_ONLINE_KEY = 'tgai-last-online';
  
  // 定時器
  private reconnectTimer: any = null;
  private statusCheckTimer: any = null;
  private offlineTimer: any = null;
  
  // 計算屬性
  networkStatus = computed(() => this._networkStatus());
  isOnline = computed(() => this._networkStatus() === 'online');
  isOffline = computed(() => this._networkStatus() === 'offline');
  isReconnecting = computed(() => this._networkStatus() === 'reconnecting');
  
  offlineMinutes = computed(() => this._offlineDuration());
  offlineHours = computed(() => Math.floor(this._offlineDuration() / 60));
  
  gracePeriodRemaining = computed(() => {
    const usedHours = this._offlineDuration() / 60;
    return Math.max(0, this.config.gracePeriodHours - usedHours);
  });
  
  isGracePeriodExpired = computed(() => this.gracePeriodRemaining() <= 0);
  
  degradationLevel = computed(() => {
    if (this.isOnline()) return 'none';
    if (this.isGracePeriodExpired()) return 'full';
    if (this._offlineDuration() > 60) return 'partial';  // 超過1小時部分降級
    return 'none';
  });
  
  // 離線時可用的功能
  offlineFeatures = computed(() => {
    const level = this.degradationLevel();
    
    if (level === 'none') {
      return {
        canSendMessages: true,
        canUseAI: true,
        canCreateAccounts: true,
        canExportData: true,
        canViewAnalytics: true,
        description: '所有功能正常'
      };
    }
    
    if (level === 'partial') {
      return {
        canSendMessages: true,
        canUseAI: false,  // AI 功能需要在線
        canCreateAccounts: false,
        canExportData: true,
        canViewAnalytics: false,
        description: '部分功能受限'
      };
    }
    
    // full degradation
    return {
      canSendMessages: false,
      canUseAI: false,
      canCreateAccounts: false,
      canExportData: true,  // 導出仍可用
      canViewAnalytics: false,
      description: '離線時間過長，請連接網絡'
    };
  });
  
  constructor() {
    this.loadCachedData();
    this.initNetworkListeners();
    this.startStatusCheck();
    this.calculateOfflineDuration();
  }
  
  ngOnDestroy(): void {
    this.stopAllTimers();
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
  
  // ============ 初始化 ============
  
  private loadCachedData(): void {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        this.cachedData = JSON.parse(cached);
      }
      
      const lastOnline = localStorage.getItem(this.LAST_ONLINE_KEY);
      if (lastOnline) {
        this._lastOnlineTime.set(new Date(parseInt(lastOnline)));
      }
    } catch {
      this.cachedData = null;
    }
  }
  
  private initNetworkListeners(): void {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // 初始狀態
    if (navigator.onLine) {
      this._networkStatus.set('online');
      this.updateLastOnlineTime();
    } else {
      this._networkStatus.set('offline');
      this.startOfflineTimer();
    }
  }
  
  private handleOnline = (): void => {
    this.ngZone.run(() => {
      this._networkStatus.set('online');
      this._reconnectAttempts.set(0);
      this._offlineDuration.set(0);
      this.updateLastOnlineTime();
      this.stopOfflineTimer();
      
      this.toastService.success('🟢 網絡已恢復', 3000);
      
      // 觸發數據同步
      window.dispatchEvent(new CustomEvent('network-restored'));
      
      // 同步離線期間的數據
      this.syncOfflineData();
    });
  };
  
  private handleOffline = (): void => {
    this.ngZone.run(() => {
      this._networkStatus.set('offline');
      this.startOfflineTimer();
      this.startReconnectTimer();
      
      this.toastService.warning('📴 網絡已斷開，進入離線模式', 5000);
    });
  };
  
  // ============ 重連機制 ============
  
  private startReconnectTimer(): void {
    this.stopReconnectTimer();
    
    this.reconnectTimer = setInterval(() => {
      this.attemptReconnect();
    }, this.config.reconnectInterval * 1000);
  }
  
  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  private async attemptReconnect(): Promise<void> {
    if (this._reconnectAttempts() >= this.config.maxReconnectAttempts) {
      this.stopReconnectTimer();
      return;
    }
    
    this._networkStatus.set('reconnecting');
    this._reconnectAttempts.update(n => n + 1);
    
    try {
      // 嘗試連接服務器
      const serverUrl = localStorage.getItem('tgai-license-server');
      if (serverUrl) {
        const response = await fetch(`${serverUrl}/api/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          this.handleOnline();
          return;
        }
      }
      
      // 檢查基本網絡
      const testResponse = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: AbortSignal.timeout(3000)
      });
      
      // 如果能訪問外網但不能訪問服務器
      this._networkStatus.set('offline');
    } catch {
      this._networkStatus.set('offline');
    }
  }
  
  /**
   * 手動觸發重連
   */
  manualReconnect(): void {
    this._reconnectAttempts.set(0);
    this.attemptReconnect();
  }
  
  // ============ 離線計時 ============
  
  private startOfflineTimer(): void {
    this.stopOfflineTimer();
    
    this.offlineTimer = setInterval(() => {
      this.ngZone.run(() => {
        this._offlineDuration.update(n => n + 1);
        
        // 檢查是否超過寬限期
        if (this._offlineDuration() === 60) {
          this.toastService.warning('⚠️ 離線超過1小時，部分功能已受限', 5000);
        }
        
        if (this.isGracePeriodExpired()) {
          this.toastService.error('❌ 離線時間過長，請連接網絡繼續使用', 0);
          this.stopOfflineTimer();
        }
      });
    }, 60000);  // 每分鐘更新
  }
  
  private stopOfflineTimer(): void {
    if (this.offlineTimer) {
      clearInterval(this.offlineTimer);
      this.offlineTimer = null;
    }
  }
  
  private calculateOfflineDuration(): void {
    if (!navigator.onLine && this._lastOnlineTime()) {
      const now = Date.now();
      const lastOnline = this._lastOnlineTime()!.getTime();
      const durationMinutes = Math.floor((now - lastOnline) / (1000 * 60));
      this._offlineDuration.set(durationMinutes);
    }
  }
  
  // ============ 狀態檢查 ============
  
  private startStatusCheck(): void {
    // 每 5 分鐘檢查一次服務器連接
    this.statusCheckTimer = setInterval(() => {
      if (this.isOnline()) {
        this.checkServerConnection();
      }
    }, 5 * 60 * 1000);
  }
  
  private async checkServerConnection(): Promise<void> {
    const serverUrl = localStorage.getItem('tgai-license-server');
    if (!serverUrl) return;
    
    try {
      const response = await fetch(`${serverUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        this.updateLastOnlineTime();
      } else {
        this._networkStatus.set('offline');
        this.startOfflineTimer();
      }
    } catch {
      // 服務器不可達，但可能還有網絡
      if (!navigator.onLine) {
        this._networkStatus.set('offline');
        this.startOfflineTimer();
      }
    }
  }
  
  // ============ 數據緩存 ============
  
  /**
   * 緩存重要數據
   */
  cacheData(data: Partial<CachedData>): void {
    this.cachedData = {
      ...this.cachedData,
      ...data,
      lastSync: Date.now()
    } as CachedData;
    
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(this.cachedData));
  }
  
  /**
   * 獲取緩存數據
   */
  getCachedData(): CachedData | null {
    return this.cachedData;
  }
  
  /**
   * 同步離線期間的數據
   */
  private async syncOfflineData(): Promise<void> {
    // 觸發各服務的同步
    window.dispatchEvent(new CustomEvent('sync-offline-data'));
  }
  
  // ============ 工具方法 ============
  
  private updateLastOnlineTime(): void {
    const now = new Date();
    this._lastOnlineTime.set(now);
    localStorage.setItem(this.LAST_ONLINE_KEY, now.getTime().toString());
  }
  
  private stopAllTimers(): void {
    this.stopReconnectTimer();
    this.stopOfflineTimer();
    if (this.statusCheckTimer) {
      clearInterval(this.statusCheckTimer);
      this.statusCheckTimer = null;
    }
  }
  
  // ============ 功能降級檢查 ============
  
  /**
   * 檢查功能是否可用
   */
  canUseFeature(feature: keyof ReturnType<typeof this.offlineFeatures>): boolean {
    const features = this.offlineFeatures();
    return features[feature] as boolean;
  }
  
  /**
   * 獲取功能不可用原因
   */
  getFeatureUnavailableReason(feature: string): string {
    if (this.isOnline()) return '';
    
    if (this.isGracePeriodExpired()) {
      return `離線時間超過 ${this.config.gracePeriodHours} 小時，請連接網絡`;
    }
    
    if (this.degradationLevel() === 'partial') {
      return '離線超過1小時，此功能暫時不可用';
    }
    
    return '離線模式下此功能不可用';
  }
  
  // ============ 公開方法 ============
  
  /**
   * 獲取離線狀態摘要
   */
  getStatusSummary(): string {
    if (this.isOnline()) return '🟢 在線';
    if (this.isReconnecting()) return '🟡 重連中...';
    
    const hours = this.offlineHours();
    if (hours < 1) return `🔴 離線 ${this._offlineDuration()}分鐘`;
    return `🔴 離線 ${hours}小時`;
  }
  
  /**
   * 獲取剩餘寬限期描述
   */
  getGracePeriodDescription(): string {
    const remaining = this.gracePeriodRemaining();
    if (remaining <= 0) return '寬限期已結束';
    if (remaining < 1) return `剩餘 ${Math.round(remaining * 60)} 分鐘`;
    return `剩餘 ${Math.round(remaining)} 小時`;
  }
}
