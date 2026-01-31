/**
 * 配額告警組件
 * 
 * 優化設計：
 * 1. 全局配額告警顯示
 * 2. 可關閉的提示
 * 3. 快速升級入口
 */

import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UsageService } from '../core/usage.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-quota-alert',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showAlert() && !dismissed()) {
      <div class="quota-alert" [class.warning]="isWarning()" [class.exceeded]="isExceeded()">
        <div class="alert-content">
          <span class="alert-icon">{{ isExceeded() ? '🚫' : '⚠️' }}</span>
          <div class="alert-text">
            @if (isExceeded()) {
              <strong>配額已用盡</strong>
              <p>您的 API 調用已達今日上限，部分功能暫時無法使用</p>
            } @else {
              <strong>配額即將用盡</strong>
              <p>您的 API 調用已使用 {{ percentage() }}%，請及時升級</p>
            }
          </div>
        </div>
        <div class="alert-actions">
          <a routerLink="/upgrade" class="upgrade-link">升級方案</a>
          <button class="dismiss-btn" (click)="dismiss()">×</button>
        </div>
      </div>
    }
  `,
  styles: [`
    .quota-alert {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      max-width: 400px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      animation: slideIn 0.3s ease;
    }
    
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .quota-alert.warning {
      background: linear-gradient(135deg, #78350f, #451a03);
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    
    .quota-alert.exceeded {
      background: linear-gradient(135deg, #7f1d1d, #450a0a);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    
    .alert-content {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }
    
    .alert-icon {
      font-size: 1.5rem;
    }
    
    .alert-text strong {
      display: block;
      font-size: 0.875rem;
      margin-bottom: 0.25rem;
    }
    
    .alert-text p {
      margin: 0;
      font-size: 0.75rem;
      opacity: 0.8;
    }
    
    .alert-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .upgrade-link {
      padding: 0.5rem 1rem;
      background: white;
      border-radius: 6px;
      color: #1a1a1a;
      text-decoration: none;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
      transition: all 0.2s ease;
    }
    
    .upgrade-link:hover {
      transform: scale(1.05);
    }
    
    .dismiss-btn {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 50%;
      color: white;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .dismiss-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    @media (max-width: 640px) {
      .quota-alert {
        left: 1rem;
        right: 1rem;
        max-width: none;
        flex-direction: column;
        text-align: center;
      }
      
      .alert-content {
        flex-direction: column;
        align-items: center;
      }
      
      .alert-actions {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class QuotaAlertComponent implements OnInit, OnDestroy {
  private usageService = inject(UsageService);
  
  dismissed = signal(false);
  showAlert = signal(false);
  percentage = signal(0);
  
  private refreshInterval: any = null;
  private quotaExceededHandler: ((e: Event) => void) | null = null;
  
  ngOnInit() {
    // Electron 模式不顯示
    if (environment.apiMode === 'ipc') {
      return;
    }
    
    // 定期檢查配額
    this.checkQuota();
    this.refreshInterval = setInterval(() => this.checkQuota(), 60000); // 每分鐘
    
    // 監聽配額超限事件
    this.quotaExceededHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        this.showAlert.set(true);
        this.dismissed.set(false);
      }
    };
    window.addEventListener('quota-exceeded', this.quotaExceededHandler);
  }
  
  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.quotaExceededHandler) {
      window.removeEventListener('quota-exceeded', this.quotaExceededHandler);
    }
  }
  
  async checkQuota() {
    const usage = await this.usageService.fetchTodayUsage();
    if (usage) {
      this.percentage.set(usage.api_calls_percentage);
      
      // 80% 以上顯示告警
      if (usage.api_calls_percentage >= 80) {
        this.showAlert.set(true);
      } else {
        this.showAlert.set(false);
      }
    }
  }
  
  isWarning(): boolean {
    const pct = this.percentage();
    return pct >= 80 && pct < 100;
  }
  
  isExceeded(): boolean {
    return this.percentage() >= 100;
  }
  
  dismiss() {
    this.dismissed.set(true);
    
    // 30 分鐘後重新顯示
    setTimeout(() => {
      if (this.percentage() >= 80) {
        this.dismissed.set(false);
      }
    }, 30 * 60 * 1000);
  }
}
