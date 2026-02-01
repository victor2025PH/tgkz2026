/**
 * 配額超限對話框
 * 
 * 當用戶操作因配額不足被阻止時顯示
 */

import { Component, Inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuotaService, MembershipLevel } from '../services/quota.service';

export interface QuotaExceededData {
  quotaType: string;
  message: string;
  quota: {
    limit: number;
    used: number;
    remaining: number;
    percentage: number;
    reset_at?: string;
  };
  upgradeSuggestion?: string;
}

@Component({
  selector: 'app-quota-exceeded-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dialog-overlay" (click)="close()">
      <div class="dialog-content" (click)="$event.stopPropagation()">
        <!-- 頭部 -->
        <div class="dialog-header">
          <div class="icon-container exceeded">
            <span class="icon">🚫</span>
          </div>
          <h2>配額已用盡</h2>
          <p class="subtitle">{{ data.message || '您的配額已達上限' }}</p>
        </div>
        
        <!-- 配額詳情 -->
        <div class="quota-details">
          <div class="quota-type">
            <span class="type-icon">{{ getQuotaIcon() }}</span>
            <span class="type-name">{{ quotaService.getQuotaDisplayName(data.quotaType) }}</span>
          </div>
          
          <div class="usage-bar">
            <div class="bar-fill" [style.width.%]="100"></div>
          </div>
          
          <div class="usage-stats">
            <span class="stat">
              <strong>{{ data.quota.used }}</strong> / {{ data.quota.limit }} 已使用
            </span>
            <span class="stat reset" *ngIf="data.quota.reset_at">
              重置時間: {{ formatResetTime() }}
            </span>
          </div>
        </div>
        
        <!-- 升級選項 -->
        <div class="upgrade-section">
          <h3>升級獲取更多配額</h3>
          
          <div class="upgrade-options" *ngIf="upgradeOptions().length > 0">
            <div class="upgrade-option" *ngFor="let level of upgradeOptions().slice(0, 3)" 
                 [class.recommended]="isRecommended(level)"
                 (click)="selectUpgrade(level)">
              <div class="option-header">
                <span class="level-icon">{{ level.icon }}</span>
                <span class="level-name">{{ level.name }}</span>
                <span class="recommended-badge" *ngIf="isRecommended(level)">推薦</span>
              </div>
              
              <div class="option-quota">
                <span class="new-quota">
                  {{ getNewQuotaValue(level) }}
                </span>
                <span class="quota-label">{{ quotaService.getQuotaDisplayName(data.quotaType) }}</span>
              </div>
              
              <div class="option-price">
                <span class="price">¥{{ level.prices?.month || 0 }}</span>
                <span class="period">/月</span>
              </div>
            </div>
          </div>
          
          <p class="upgrade-hint" *ngIf="data.upgradeSuggestion">
            {{ data.upgradeSuggestion }}
          </p>
        </div>
        
        <!-- 操作按鈕 -->
        <div class="dialog-actions">
          <button class="btn-secondary" (click)="close()">
            稍後再說
          </button>
          <button class="btn-primary" (click)="goToUpgrade()">
            查看方案
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .dialog-content {
      background: var(--panel-bg, #1e1e2e);
      border-radius: 16px;
      padding: 24px;
      max-width: 440px;
      width: 90%;
      animation: slideUp 0.3s ease;
    }
    
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    .dialog-header {
      text-align: center;
      margin-bottom: 20px;
    }
    
    .icon-container {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
    }
    
    .icon-container.exceeded {
      background: linear-gradient(135deg, #ef4444, #dc2626);
    }
    
    .icon {
      font-size: 32px;
    }
    
    .dialog-header h2 {
      margin: 0 0 8px;
      font-size: 20px;
      color: var(--text-primary, #fff);
    }
    
    .subtitle {
      margin: 0;
      color: var(--text-secondary, #888);
      font-size: 14px;
    }
    
    .quota-details {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }
    
    .quota-type {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    
    .type-icon {
      font-size: 20px;
    }
    
    .type-name {
      font-weight: 600;
      color: var(--text-primary, #fff);
    }
    
    .usage-bar {
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }
    
    .bar-fill {
      height: 100%;
      background: #ef4444;
      border-radius: 4px;
    }
    
    .usage-stats {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text-secondary, #888);
    }
    
    .upgrade-section {
      margin-bottom: 20px;
    }
    
    .upgrade-section h3 {
      font-size: 14px;
      color: var(--text-secondary, #888);
      margin: 0 0 12px;
    }
    
    .upgrade-options {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding-bottom: 8px;
    }
    
    .upgrade-option {
      flex: 1;
      min-width: 120px;
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid transparent;
      border-radius: 12px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .upgrade-option:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    
    .upgrade-option.recommended {
      border-color: #8b5cf6;
      background: rgba(139, 92, 246, 0.1);
    }
    
    .option-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }
    
    .level-icon {
      font-size: 16px;
    }
    
    .level-name {
      font-weight: 600;
      font-size: 13px;
      color: var(--text-primary, #fff);
    }
    
    .recommended-badge {
      font-size: 10px;
      background: #8b5cf6;
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
    }
    
    .option-quota {
      margin-bottom: 8px;
    }
    
    .new-quota {
      font-size: 18px;
      font-weight: 700;
      color: #22c55e;
    }
    
    .quota-label {
      font-size: 11px;
      color: var(--text-secondary, #888);
      display: block;
    }
    
    .option-price {
      font-size: 12px;
      color: var(--text-secondary, #888);
    }
    
    .option-price .price {
      color: var(--text-primary, #fff);
      font-weight: 600;
    }
    
    .upgrade-hint {
      font-size: 12px;
      color: var(--text-secondary, #888);
      margin: 12px 0 0;
      text-align: center;
    }
    
    .dialog-actions {
      display: flex;
      gap: 12px;
    }
    
    .dialog-actions button {
      flex: 1;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    
    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid var(--border-color, #333);
      color: var(--text-primary, #fff);
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      border: none;
      color: white;
    }
    
    .btn-primary:hover {
      opacity: 0.9;
    }
  `]
})
export class QuotaExceededDialogComponent implements OnInit {
  data: QuotaExceededData = {
    quotaType: 'daily_messages',
    message: '',
    quota: { limit: 0, used: 0, remaining: 0, percentage: 100 }
  };
  
  private onCloseCallback?: () => void;
  
  private quotaIcons: Record<string, string> = {
    daily_messages: '💬',
    ai_calls: '🤖',
    tg_accounts: '📱',
    groups: '👥',
    devices: '💻',
  };

  constructor(public quotaService: QuotaService) {}

  ngOnInit() {
    this.quotaService.loadMembershipLevels();
  }

  // 設置對話框數據
  setData(data: QuotaExceededData, onClose?: () => void) {
    this.data = data;
    this.onCloseCallback = onClose;
  }

  upgradeOptions = computed(() => this.quotaService.getUpgradeOptions());

  getQuotaIcon(): string {
    return this.quotaIcons[this.data.quotaType] || '📊';
  }

  formatResetTime(): string {
    if (!this.data.quota.reset_at) return '';
    try {
      const date = new Date(this.data.quota.reset_at);
      return date.toLocaleString('zh-TW', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '';
    }
  }

  isRecommended(level: MembershipLevel): boolean {
    // 推薦下一個等級
    const options = this.upgradeOptions();
    return options.length > 0 && options[0].level === level.level;
  }

  getNewQuotaValue(level: MembershipLevel): string {
    const quota = level.quotas?.[this.data.quotaType];
    if (quota === -1) return '∞';
    return quota?.toString() || '更多';
  }

  selectUpgrade(level: MembershipLevel) {
    console.log('Selected upgrade:', level.level);
    this.goToUpgrade();
  }

  goToUpgrade() {
    // TODO: 導航到升級頁面
    console.log('Navigate to upgrade page');
    this.close();
  }

  close() {
    this.onCloseCallback?.();
  }
}
