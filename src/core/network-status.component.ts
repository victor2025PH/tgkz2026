/**
 * 網絡狀態提示組件
 * 
 * 🆕 功能：
 * 1. 顯示離線提示橫幅
 * 2. 自動隱藏恢復提示
 * 3. 支持動畫效果
 */

import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NetworkService, NetworkStatus } from './network.service';

@Component({
  selector: 'app-network-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (showBanner()) {
      <div class="network-banner" [class]="'status-' + status()">
        <span class="icon">{{ getIcon() }}</span>
        <span class="message">{{ message() }}</span>
        @if (status() === 'online') {
          <button class="dismiss-btn" (click)="dismiss()">✕</button>
        }
      </div>
    }
  `,
  styles: [`
    .network-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      animation: slideDown 0.3s ease-out;
    }
    
    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    .status-offline {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
    }
    
    .status-online {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      color: white;
    }
    
    .status-slow {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
    }
    
    .icon {
      font-size: 1rem;
    }
    
    .message {
      flex: 1;
      text-align: center;
    }
    
    .dismiss-btn {
      background: transparent;
      border: none;
      color: white;
      opacity: 0.8;
      cursor: pointer;
      padding: 0.25rem;
      font-size: 0.875rem;
    }
    
    .dismiss-btn:hover {
      opacity: 1;
    }
  `]
})
export class NetworkStatusComponent implements OnInit, OnDestroy {
  private networkService = inject(NetworkService);
  private subscription: Subscription | null = null;
  
  // 狀態
  showBanner = signal(false);
  status = signal<NetworkStatus>('online');
  message = signal('');
  
  private dismissTimer: any = null;
  
  ngOnInit(): void {
    // 訂閱網絡事件
    this.subscription = this.networkService.networkEvents$.subscribe(event => {
      this.status.set(event.status);
      this.message.set(event.message || '');
      this.showBanner.set(true);
      
      // 清除之前的定時器
      if (this.dismissTimer) {
        clearTimeout(this.dismissTimer);
      }
      
      // 如果恢復在線，3秒後自動隱藏
      if (event.status === 'online') {
        this.dismissTimer = setTimeout(() => {
          this.showBanner.set(false);
        }, 3000);
      }
    });
  }
  
  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
    }
  }
  
  getIcon(): string {
    return this.networkService.getStatusIcon();
  }
  
  dismiss(): void {
    this.showBanner.set(false);
  }
}
