/**
 * 🔧 P8-1: 離線狀態指示器組件
 * 
 * 功能：
 * - 離線時顯示黃色提示條（固定底部）
 * - 顯示待處理操作數量
 * - 網絡恢復時顯示綠色同步中提示
 * - 在線正常時自動隱藏
 */

import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineCacheService } from '../services/offline-cache.service';
import { I18nPipe } from '../core/i18n.pipe';

@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [CommonModule, I18nPipe],
  template: `
    @if (shouldShow()) {
      <div class="offline-bar" [class]="barClass()" role="alert" aria-live="assertive">
        <div class="offline-content">
          <!-- 離線 -->
          @if (status() === 'offline') {
            <span class="offline-icon">📴</span>
            <span class="offline-text">
              {{ 'offline.networkOffline' | i18n }}
              @if (pendingCount() > 0) {
                · {{ 'offline.pendingSync' | i18n:{ count: pendingCount() } }}
              }
            </span>
          }
          
          <!-- 慢速網絡 -->
          @if (status() === 'slow') {
            <span class="offline-icon">🐌</span>
            <span class="offline-text">{{ 'offline.slowNetwork' | i18n }}</span>
          }
          
          <!-- 恢復在線 + 有待同步操作 -->
          @if (status() === 'online' && pendingCount() > 0) {
            <span class="offline-icon sync-spin">🔄</span>
            <span class="offline-text">{{ 'offline.syncing' | i18n:{ count: pendingCount() } }}</span>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .offline-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.3s ease;
      backdrop-filter: blur(8px);
    }
    
    .offline-bar.bar-offline {
      background: rgba(234, 179, 8, 0.95);
      color: #92400e;
    }
    
    .offline-bar.bar-slow {
      background: rgba(249, 115, 22, 0.9);
      color: #7c2d12;
    }
    
    .offline-bar.bar-syncing {
      background: rgba(34, 197, 94, 0.9);
      color: #14532d;
    }
    
    .offline-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    
    .offline-icon {
      font-size: 16px;
    }
    
    .sync-spin {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class OfflineIndicatorComponent {
  private offlineCache = inject(OfflineCacheService);
  
  readonly status = computed(() => this.offlineCache.networkStatus());
  readonly pendingCount = computed(() => this.offlineCache.pendingOperations().length);
  
  readonly shouldShow = computed(() => {
    const s = this.status();
    const p = this.pendingCount();
    return s === 'offline' || s === 'slow' || (s === 'online' && p > 0);
  });
  
  readonly barClass = computed(() => {
    const s = this.status();
    const p = this.pendingCount();
    if (s === 'offline') return 'bar-offline';
    if (s === 'slow') return 'bar-slow';
    if (s === 'online' && p > 0) return 'bar-syncing';
    return '';
  });
}
