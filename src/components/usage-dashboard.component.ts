/**
 * 使用量儀表板組件
 * 
 * 優化設計：
 * 1. 可視化使用量圖表
 * 2. 配額進度條
 * 3. 趨勢分析
 * 4. 響應式設計
 */

import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UsageService, UsageStats, UsageSummary } from '../core/usage.service';
import { AuthService } from '../core/auth.service';
import { I18nService } from '../i18n.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-usage-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Electron 模式不顯示 -->
    @if (showDashboard()) {
      <div class="usage-dashboard">
        <div class="dashboard-header">
          <h2>使用量統計</h2>
          <button class="refresh-btn" (click)="refresh()" [disabled]="isLoading()">
            @if (isLoading()) {
              <span class="spinner">⟳</span>
            } @else {
              ⟳
            }
          </button>
        </div>
        
        @if (isLoading() && !todayUsage()) {
          <div class="loading-state">載入中...</div>
        } @else if (todayUsage()) {
          <!-- 配額卡片 -->
          <div class="quota-cards">
            <!-- API 調用 -->
            <div class="quota-card" [class.warning]="apiWarning()" [class.exceeded]="apiExceeded()">
              <div class="card-header">
                <span class="card-icon">📊</span>
                <span class="card-title">API 調用</span>
                @if (apiWarning()) {
                  <span class="warning-badge">⚠️</span>
                }
              </div>
              <div class="card-value">
                <span class="current">{{ todayUsage()!.api_calls }}</span>
                <span class="separator">/</span>
                <span class="limit">{{ formatLimit(todayUsage()!.api_calls_limit) }}</span>
              </div>
              <div class="progress-bar">
                <div 
                  class="progress-fill"
                  [style.width.%]="todayUsage()!.api_calls_percentage"
                  [class.warning]="apiWarning()"
                  [class.exceeded]="apiExceeded()"
                ></div>
              </div>
              <div class="card-footer">
                <span>今日使用</span>
                <span>{{ todayUsage()!.api_calls_percentage.toFixed(1) }}%</span>
              </div>
            </div>
            
            <!-- 帳號數量 -->
            <div class="quota-card">
              <div class="card-header">
                <span class="card-icon">👥</span>
                <span class="card-title">帳號數量</span>
              </div>
              <div class="card-value">
                <span class="current">{{ todayUsage()!.accounts_count }}</span>
                <span class="separator">/</span>
                <span class="limit">{{ todayUsage()!.accounts_limit }}</span>
              </div>
              <div class="progress-bar">
                <div 
                  class="progress-fill"
                  [style.width.%]="todayUsage()!.accounts_percentage"
                ></div>
              </div>
              <div class="card-footer">
                <span>已使用</span>
                <span>{{ todayUsage()!.accounts_percentage.toFixed(1) }}%</span>
              </div>
            </div>
            
            <!-- 消息統計 -->
            <div class="quota-card">
              <div class="card-header">
                <span class="card-icon">💬</span>
                <span class="card-title">消息統計</span>
              </div>
              <div class="card-value">
                <span class="current">{{ todayUsage()!.messages_sent + todayUsage()!.messages_received }}</span>
              </div>
              <div class="stats-row">
                <span>發送: {{ todayUsage()!.messages_sent }}</span>
                <span>接收: {{ todayUsage()!.messages_received }}</span>
              </div>
            </div>
            
            <!-- AI 請求 -->
            <div class="quota-card">
              <div class="card-header">
                <span class="card-icon">🤖</span>
                <span class="card-title">AI 請求</span>
              </div>
              <div class="card-value">
                <span class="current">{{ todayUsage()!.ai_requests }}</span>
              </div>
              <div class="stats-row">
                <span>Token: {{ formatNumber(todayUsage()!.ai_tokens_used) }}</span>
              </div>
            </div>
          </div>
          
          <!-- 30 天摘要 -->
          @if (summary()) {
            <div class="summary-section">
              <h3>過去 30 天</h3>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="item-label">API 調用</span>
                  <span class="item-value">{{ formatNumber(summary()!.last_30_days.api_calls) }}</span>
                  <span class="item-avg">日均 {{ summary()!.last_30_days.daily_average.api_calls }}</span>
                </div>
                <div class="summary-item">
                  <span class="item-label">消息總數</span>
                  <span class="item-value">{{ formatNumber(summary()!.last_30_days.messages) }}</span>
                  <span class="item-avg">日均 {{ summary()!.last_30_days.daily_average.messages }}</span>
                </div>
                <div class="summary-item">
                  <span class="item-label">AI 請求</span>
                  <span class="item-value">{{ formatNumber(summary()!.last_30_days.ai_requests) }}</span>
                </div>
              </div>
            </div>
          }
          
          <!-- 升級提示 -->
          @if (showUpgradeHint()) {
            <div class="upgrade-hint">
              <div class="hint-content">
                <span class="hint-icon">⭐</span>
                <div class="hint-text">
                  <strong>需要更多配額？</strong>
                  <p>升級到更高方案解鎖更多功能</p>
                </div>
              </div>
              <a routerLink="/upgrade" class="upgrade-btn">查看方案</a>
            </div>
          }
        } @else {
          <div class="empty-state">
            <p>暫無使用數據</p>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .usage-dashboard {
      background: var(--bg-secondary, #1a1a1a);
      border-radius: 12px;
      padding: 1.5rem;
    }
    
    .dashboard-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }
    
    .dashboard-header h2 {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0;
    }
    
    .refresh-btn {
      padding: 0.5rem;
      background: transparent;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      color: var(--text-secondary, #888);
      transition: color 0.2s;
    }
    
    .refresh-btn:hover:not(:disabled) {
      color: var(--primary, #3b82f6);
    }
    
    .refresh-btn:disabled {
      opacity: 0.5;
    }
    
    .spinner {
      display: inline-block;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* 配額卡片網格 */
    .quota-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    
    .quota-card {
      background: var(--bg-primary, #0f0f0f);
      border-radius: 12px;
      padding: 1rem;
      border: 1px solid transparent;
      transition: all 0.2s ease;
    }
    
    .quota-card.warning {
      border-color: rgba(245, 158, 11, 0.3);
    }
    
    .quota-card.exceeded {
      border-color: rgba(239, 68, 68, 0.3);
      background: rgba(239, 68, 68, 0.05);
    }
    
    .card-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    
    .card-icon {
      font-size: 1.25rem;
    }
    
    .card-title {
      font-size: 0.875rem;
      color: var(--text-secondary, #888);
    }
    
    .warning-badge {
      margin-left: auto;
    }
    
    .card-value {
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
      margin-bottom: 0.75rem;
    }
    
    .card-value .current {
      font-size: 1.5rem;
      font-weight: 700;
    }
    
    .card-value .separator,
    .card-value .limit {
      font-size: 0.875rem;
      color: var(--text-secondary, #888);
    }
    
    .progress-bar {
      height: 4px;
      background: var(--bg-tertiary, #333);
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      border-radius: 2px;
      transition: width 0.3s ease;
    }
    
    .progress-fill.warning {
      background: linear-gradient(90deg, #f59e0b, #ef4444);
    }
    
    .progress-fill.exceeded {
      background: #ef4444;
    }
    
    .card-footer {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-muted, #666);
    }
    
    .stats-row {
      display: flex;
      gap: 1rem;
      font-size: 0.75rem;
      color: var(--text-secondary, #888);
    }
    
    /* 30 天摘要 */
    .summary-section {
      margin-bottom: 1.5rem;
    }
    
    .summary-section h3 {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary, #888);
      margin-bottom: 1rem;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    
    .summary-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .item-label {
      font-size: 0.75rem;
      color: var(--text-muted, #666);
    }
    
    .item-value {
      font-size: 1.25rem;
      font-weight: 600;
    }
    
    .item-avg {
      font-size: 0.75rem;
      color: var(--text-secondary, #888);
    }
    
    /* 升級提示 */
    .upgrade-hint {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
      border-radius: 12px;
      border: 1px solid rgba(59, 130, 246, 0.2);
    }
    
    .hint-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .hint-icon {
      font-size: 1.5rem;
    }
    
    .hint-text strong {
      display: block;
      font-size: 0.875rem;
    }
    
    .hint-text p {
      margin: 0;
      font-size: 0.75rem;
      color: var(--text-secondary, #888);
    }
    
    .upgrade-btn {
      padding: 0.5rem 1rem;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-radius: 8px;
      color: white;
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    
    .upgrade-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    /* 狀態 */
    .loading-state,
    .empty-state {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary, #888);
    }
    
    @media (max-width: 640px) {
      .quota-cards {
        grid-template-columns: 1fr;
      }
      
      .summary-grid {
        grid-template-columns: 1fr;
      }
      
      .upgrade-hint {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }
    }
  `]
})
export class UsageDashboardComponent implements OnInit {
  private usageService = inject(UsageService);
  private authService = inject(AuthService);
  private i18n = inject(I18nService);
  
  // 狀態
  isLoading = this.usageService.isLoading;
  todayUsage = this.usageService.todayUsage;
  summary = this.usageService.summary;
  
  showDashboard = signal(environment.apiMode === 'http');
  
  ngOnInit() {
    if (this.showDashboard()) {
      this.refresh();
    }
  }
  
  async refresh() {
    await this.usageService.refresh();
  }
  
  apiWarning(): boolean {
    const usage = this.todayUsage();
    if (!usage) return false;
    return usage.api_calls_percentage >= 80 && usage.api_calls_percentage < 100;
  }
  
  apiExceeded(): boolean {
    const usage = this.todayUsage();
    if (!usage) return false;
    return usage.api_calls_percentage >= 100;
  }
  
  showUpgradeHint(): boolean {
    const tier = this.authService.subscriptionTier();
    return tier === 'free' || tier === 'basic';
  }
  
  formatLimit(limit: number): string {
    if (limit === -1) return '無限';
    return this.formatNumber(limit);
  }
  
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}
