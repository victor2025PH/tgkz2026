/**
 * 配額指示器組件
 * 
 * 顯示當前用戶的配額使用情況和告警
 */

import { Component, OnInit, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuotaService, QuotaInfo } from '../services/quota.service';

@Component({
  selector: 'app-quota-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="quota-indicator" [class.compact]="compact" [class.warning]="hasWarnings()" [class.exceeded]="hasExceeded()">
      <!-- 緊湊模式 - 只顯示圖標 -->
      <div class="indicator-trigger" (click)="toggleExpand()" *ngIf="compact">
        <span class="indicator-icon" [style.color]="indicatorColor()">
          {{ indicatorIcon() }}
        </span>
        <span class="alert-badge" *ngIf="alertCount() > 0">{{ alertCount() }}</span>
      </div>
      
      <!-- 展開模式 - 顯示詳細信息 -->
      <div class="quota-panel" *ngIf="!compact || expanded()">
        <div class="panel-header">
          <h4>配額使用</h4>
          <span class="tier-badge" [style.background]="tierColor()">
            {{ quotaService.currentTierName() }}
          </span>
          <button class="close-btn" *ngIf="compact && expanded()" (click)="expanded.set(false)">×</button>
        </div>
        
        <div class="quota-list">
          <div class="quota-item" *ngFor="let quotaType of displayQuotaTypes" 
               [class.warning]="isWarning(quotaType)"
               [class.exceeded]="isExceeded(quotaType)">
            <div class="quota-label">
              <span class="quota-icon">{{ getIcon(quotaType) }}</span>
              <span class="quota-name">{{ quotaService.getQuotaDisplayName(quotaType) }}</span>
            </div>
            <div class="quota-value">
              <ng-container *ngIf="isUnlimited(quotaType); else limitedQuota">
                <span class="unlimited">∞</span>
              </ng-container>
              <ng-template #limitedQuota>
                <span class="used">{{ getUsed(quotaType) }}</span>
                <span class="separator">/</span>
                <span class="limit">{{ getLimit(quotaType) }}</span>
              </ng-template>
            </div>
            <div class="quota-bar">
              <div class="bar-fill" 
                   [style.width.%]="getPercentage(quotaType)"
                   [style.background]="getBarColor(quotaType)">
              </div>
            </div>
          </div>
        </div>
        
        <!-- 告警區域 -->
        <div class="alerts-section" *ngIf="quotaService.alerts().length > 0">
          <h5>配額告警</h5>
          <div class="alert-item" *ngFor="let alert of quotaService.alerts()">
            <span class="alert-icon">⚠️</span>
            <span class="alert-message">{{ alert.message }}</span>
            <button class="ack-btn" *ngIf="!alert.acknowledged" 
                    (click)="acknowledgeAlert(alert.id)">✓</button>
          </div>
        </div>
        
        <!-- 升級提示 -->
        <div class="upgrade-section" *ngIf="showUpgradeHint()">
          <button class="upgrade-btn" (click)="openUpgradeDialog()">
            升級方案獲取更多配額 →
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .quota-indicator {
      position: relative;
      font-size: 14px;
    }
    
    .indicator-trigger {
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      position: relative;
      transition: background 0.2s;
    }
    
    .indicator-trigger:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    
    .indicator-icon {
      font-size: 20px;
    }
    
    .alert-badge {
      position: absolute;
      top: 0;
      right: 0;
      background: #ef4444;
      color: white;
      font-size: 10px;
      min-width: 16px;
      height: 16px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .quota-panel {
      background: var(--panel-bg, #1e1e2e);
      border: 1px solid var(--border-color, #333);
      border-radius: 12px;
      padding: 16px;
      min-width: 280px;
    }
    
    .compact .quota-panel {
      position: absolute;
      top: 100%;
      right: 0;
      z-index: 1000;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    
    .panel-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    
    .panel-header h4 {
      margin: 0;
      flex: 1;
      font-size: 14px;
      color: var(--text-secondary, #888);
    }
    
    .tier-badge {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      color: white;
    }
    
    .close-btn {
      background: none;
      border: none;
      color: var(--text-secondary, #888);
      cursor: pointer;
      font-size: 18px;
      padding: 0 4px;
    }
    
    .quota-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .quota-item {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 4px 12px;
    }
    
    .quota-item.warning .quota-name,
    .quota-item.warning .used {
      color: #f59e0b;
    }
    
    .quota-item.exceeded .quota-name,
    .quota-item.exceeded .used {
      color: #ef4444;
    }
    
    .quota-label {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .quota-icon {
      font-size: 14px;
    }
    
    .quota-name {
      color: var(--text-primary, #fff);
    }
    
    .quota-value {
      text-align: right;
      font-family: monospace;
    }
    
    .used {
      color: var(--text-primary, #fff);
    }
    
    .separator {
      color: var(--text-secondary, #888);
      margin: 0 2px;
    }
    
    .limit {
      color: var(--text-secondary, #888);
    }
    
    .unlimited {
      color: #8b5cf6;
      font-size: 16px;
    }
    
    .quota-bar {
      grid-column: 1 / -1;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: hidden;
    }
    
    .bar-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.3s;
    }
    
    .alerts-section {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid var(--border-color, #333);
    }
    
    .alerts-section h5 {
      margin: 0 0 8px;
      font-size: 12px;
      color: var(--text-secondary, #888);
    }
    
    .alert-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      background: rgba(245, 158, 11, 0.1);
      border-radius: 6px;
      margin-bottom: 6px;
    }
    
    .alert-message {
      flex: 1;
      font-size: 12px;
    }
    
    .ack-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #22c55e;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
    }
    
    .upgrade-section {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid var(--border-color, #333);
    }
    
    .upgrade-btn {
      width: 100%;
      padding: 10px;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    
    .upgrade-btn:hover {
      opacity: 0.9;
    }
  `]
})
export class QuotaIndicatorComponent implements OnInit {
  @Input() compact = false;
  
  expanded = signal(false);
  
  displayQuotaTypes = [
    'daily_messages',
    'ai_calls',
    'tg_accounts',
    'groups'
  ];
  
  private quotaIcons: Record<string, string> = {
    daily_messages: '💬',
    ai_calls: '🤖',
    tg_accounts: '📱',
    groups: '👥',
    devices: '💻',
    keyword_sets: '🔑',
    auto_reply_rules: '🔄',
    scheduled_tasks: '⏰',
  };

  constructor(public quotaService: QuotaService) {}

  ngOnInit() {
    this.quotaService.loadQuotaSummary();
    this.quotaService.loadAlerts();
  }

  toggleExpand() {
    this.expanded.update(v => !v);
  }

  // 計算屬性
  hasWarnings = computed(() => this.quotaService.hasWarnings());
  hasExceeded = computed(() => this.quotaService.hasExceeded());
  alertCount = computed(() => this.quotaService.unacknowledgedAlerts());
  
  indicatorColor = computed(() => {
    if (this.hasExceeded()) return '#ef4444';
    if (this.hasWarnings()) return '#f59e0b';
    return '#22c55e';
  });
  
  indicatorIcon = computed(() => {
    if (this.hasExceeded()) return '🚫';
    if (this.hasWarnings()) return '⚠️';
    return '📊';
  });
  
  tierColor = computed(() => {
    const colors: Record<string, string> = {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
      diamond: '#00CED1',
      star: '#9B59B6',
      king: '#FF6B6B',
    };
    return colors[this.quotaService.currentTier()] || '#666';
  });

  getIcon(quotaType: string): string {
    return this.quotaIcons[quotaType] || '📊';
  }

  getUsed(quotaType: string): string {
    const info = this.quotaService.getQuotaInfo(quotaType);
    return info ? this.quotaService.formatQuotaValue(info.used) : '0';
  }

  getLimit(quotaType: string): string {
    const info = this.quotaService.getQuotaInfo(quotaType);
    return info ? this.quotaService.formatQuotaValue(info.limit) : '0';
  }

  getPercentage(quotaType: string): number {
    const info = this.quotaService.getQuotaInfo(quotaType);
    return info?.percentage ?? 0;
  }

  isUnlimited(quotaType: string): boolean {
    const info = this.quotaService.getQuotaInfo(quotaType);
    return info?.unlimited ?? false;
  }

  isWarning(quotaType: string): boolean {
    const info = this.quotaService.getQuotaInfo(quotaType);
    return info?.status === 'warning' || info?.status === 'critical';
  }

  isExceeded(quotaType: string): boolean {
    const info = this.quotaService.getQuotaInfo(quotaType);
    return info?.status === 'exceeded';
  }

  getBarColor(quotaType: string): string {
    const info = this.quotaService.getQuotaInfo(quotaType);
    return this.quotaService.getStatusColor(info?.status || 'ok');
  }

  async acknowledgeAlert(alertId: number) {
    await this.quotaService.acknowledgeAlert(alertId);
  }

  showUpgradeHint(): boolean {
    return this.hasWarnings() || this.hasExceeded();
  }

  openUpgradeDialog() {
    // TODO: 打開升級對話框
    console.log('Open upgrade dialog');
  }
}
