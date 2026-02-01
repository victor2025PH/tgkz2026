/**
 * 配額儀表板視圖
 * 
 * 完整的配額管理界面，包含：
 * 1. 配額使用概覽
 * 2. 趨勢圖表
 * 3. 重置倒計時
 * 4. 歷史記錄
 * 5. 升級引導
 */

import { Component, OnInit, OnDestroy, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { QuotaService, QuotaInfo, QuotaSummary } from '../services/quota.service';
import { AuthService } from '../core/auth.service';
import { ElectronIpcService } from '../electron-ipc.service';

interface QuotaHistoryItem {
  date: string;
  quota_type: string;
  used: number;
  limit: number;
}

interface TrendData {
  labels: string[];
  datasets: {
    name: string;
    data: number[];
    color: string;
  }[];
}

@Component({
  selector: 'app-quota-dashboard-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="quota-dashboard">
      <!-- 頁面頭部 -->
      <header class="page-header">
        <div class="header-left">
          <h1>配額管理</h1>
          <p>查看和管理您的資源配額</p>
        </div>
        <div class="header-right">
          <div class="tier-badge" [style.background]="tierGradient()">
            <span class="tier-icon">{{ tierIcon() }}</span>
            <span class="tier-name">{{ tierName() }}</span>
          </div>
          <button class="upgrade-btn" (click)="goToUpgrade()">
            升級方案
          </button>
        </div>
      </header>
      
      <!-- 重置倒計時 -->
      <div class="reset-countdown" *ngIf="nextResetTime()">
        <div class="countdown-icon">⏰</div>
        <div class="countdown-info">
          <span class="countdown-label">每日配額重置</span>
          <span class="countdown-time">{{ nextResetTime() }}</span>
        </div>
      </div>
      
      <!-- 配額卡片網格 -->
      <div class="quota-grid">
        <div class="quota-card" *ngFor="let quota of displayQuotas()"
             [class.warning]="quota.status === 'warning' || quota.status === 'critical'"
             [class.exceeded]="quota.status === 'exceeded'"
             [class.unlimited]="quota.unlimited">
          <div class="card-header">
            <div class="quota-icon">{{ getQuotaIcon(quota.type) }}</div>
            <div class="quota-info">
              <h3>{{ quotaService.getQuotaDisplayName(quota.type) }}</h3>
              <span class="quota-status" [style.color]="getStatusColor(quota.status)">
                {{ getStatusText(quota.status) }}
              </span>
            </div>
          </div>
          
          <div class="card-body">
            <div class="quota-value" *ngIf="!quota.unlimited">
              <span class="used">{{ formatNumber(quota.used) }}</span>
              <span class="separator">/</span>
              <span class="limit">{{ formatNumber(quota.limit) }}</span>
            </div>
            <div class="quota-value unlimited" *ngIf="quota.unlimited">
              <span class="infinity">∞</span>
              <span class="used-text">已使用 {{ formatNumber(quota.used) }}</span>
            </div>
            
            <div class="progress-container" *ngIf="!quota.unlimited">
              <div class="progress-bar">
                <div class="progress-fill" 
                     [style.width.%]="quota.percentage"
                     [style.background]="getProgressGradient(quota.status)">
                </div>
              </div>
              <span class="percentage">{{ quota.percentage.toFixed(1) }}%</span>
            </div>
            
            <div class="quota-details">
              <span class="remaining" *ngIf="!quota.unlimited">
                剩餘: {{ formatNumber(quota.remaining) }}
              </span>
              <span class="reset-hint" *ngIf="quota.resetAt">
                {{ formatResetTime(quota.resetAt) }} 重置
              </span>
            </div>
          </div>
          
          <!-- Mini 趨勢圖 -->
          <div class="mini-trend" *ngIf="getTrendData(quota.type) as trend">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none">
              <polyline
                [attr.points]="trend"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
      
      <!-- 使用趨勢圖表 -->
      <section class="trend-section">
        <div class="section-header">
          <h2>使用趨勢</h2>
          <div class="period-selector">
            <button 
              *ngFor="let period of periods" 
              [class.active]="selectedPeriod() === period.value"
              (click)="selectedPeriod.set(period.value)">
              {{ period.label }}
            </button>
          </div>
        </div>
        
        <div class="chart-container">
          <div class="chart-legend">
            <div class="legend-item" *ngFor="let dataset of trendData()?.datasets || []">
              <span class="legend-color" [style.background]="dataset.color"></span>
              <span class="legend-label">{{ dataset.name }}</span>
            </div>
          </div>
          
          <div class="chart-area">
            <svg viewBox="0 0 400 150" preserveAspectRatio="none" class="trend-chart">
              <!-- 背景網格 -->
              <g class="grid">
                <line *ngFor="let i of [0,1,2,3,4]" 
                      [attr.y1]="i * 37.5" [attr.y2]="i * 37.5"
                      x1="0" x2="400" />
              </g>
              
              <!-- 趨勢線 -->
              <g *ngFor="let dataset of trendData()?.datasets || []; let idx = index">
                <polyline
                  [attr.points]="generateChartPoints(dataset.data)"
                  fill="none"
                  [attr.stroke]="dataset.color"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
                <!-- 數據點 -->
                <circle *ngFor="let point of dataset.data; let i = index"
                        [attr.cx]="(i / (dataset.data.length - 1 || 1)) * 400"
                        [attr.cy]="150 - (point / maxTrendValue()) * 150"
                        r="4"
                        [attr.fill]="dataset.color"
                        class="data-point"
                />
              </g>
            </svg>
            
            <!-- X 軸標籤 -->
            <div class="chart-labels">
              <span *ngFor="let label of trendData()?.labels || []">{{ label }}</span>
            </div>
          </div>
        </div>
      </section>
      
      <!-- 使用歷史 -->
      <section class="history-section">
        <div class="section-header">
          <h2>使用歷史</h2>
          <button class="view-all-btn" (click)="showAllHistory = !showAllHistory">
            {{ showAllHistory ? '收起' : '查看全部' }}
          </button>
        </div>
        
        <div class="history-table">
          <div class="table-header">
            <span>日期</span>
            <span>類型</span>
            <span>使用量</span>
            <span>配額</span>
            <span>使用率</span>
          </div>
          <div class="table-body">
            <div class="table-row" *ngFor="let item of displayHistory()">
              <span class="date">{{ item.date }}</span>
              <span class="type">
                <span class="type-icon">{{ getQuotaIcon(item.quota_type) }}</span>
                {{ quotaService.getQuotaDisplayName(item.quota_type) }}
              </span>
              <span class="used">{{ formatNumber(item.used) }}</span>
              <span class="limit">{{ formatNumber(item.limit) }}</span>
              <span class="percentage" [class.warning]="getHistoryPercentage(item) > 80">
                {{ getHistoryPercentage(item).toFixed(1) }}%
              </span>
            </div>
            
            <div class="empty-history" *ngIf="(displayHistory() || []).length === 0">
              暫無歷史記錄
            </div>
          </div>
        </div>
      </section>
      
      <!-- 配額告警 -->
      <section class="alerts-section" *ngIf="(quotaService.alerts() || []).length > 0">
        <div class="section-header">
          <h2>配額告警</h2>
          <button class="clear-btn" (click)="clearAlerts()">全部確認</button>
        </div>
        
        <div class="alerts-list">
          <div class="alert-item" *ngFor="let alert of quotaService.alerts()"
               [class.acknowledged]="alert.acknowledged">
            <div class="alert-icon">⚠️</div>
            <div class="alert-content">
              <span class="alert-type">{{ quotaService.getQuotaDisplayName(alert.quota_type) }}</span>
              <span class="alert-message">{{ alert.message }}</span>
            </div>
            <button class="ack-btn" *ngIf="!alert.acknowledged" 
                    (click)="acknowledgeAlert(alert.id)">
              確認
            </button>
          </div>
        </div>
      </section>
      
      <!-- 升級引導 -->
      <section class="upgrade-section" *ngIf="showUpgradeHint()">
        <div class="upgrade-content">
          <div class="upgrade-icon">🚀</div>
          <div class="upgrade-text">
            <h3>解鎖更多配額</h3>
            <p>升級到更高等級，獲得更多資源配額和高級功能</p>
          </div>
          <div class="upgrade-features">
            <span class="feature" *ngFor="let feature of upgradeFeatures">
              ✓ {{ feature }}
            </span>
          </div>
        </div>
        <button class="upgrade-cta" (click)="goToUpgrade()">
          查看升級方案
          <span class="arrow">→</span>
        </button>
      </section>
    </div>
  `,
  styles: [`
    .quota-dashboard {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    /* 頁面頭部 */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    
    .header-left h1 {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 4px;
    }
    
    .header-left p {
      margin: 0;
      color: var(--text-secondary, #888);
      font-size: 14px;
    }
    
    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .tier-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 20px;
      color: white;
      font-weight: 600;
    }
    
    .tier-icon {
      font-size: 18px;
    }
    
    .upgrade-btn {
      padding: 10px 20px;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      border: none;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .upgrade-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }
    
    /* 重置倒計時 */
    .reset-countdown {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 12px;
      margin-bottom: 24px;
    }
    
    .countdown-icon {
      font-size: 24px;
    }
    
    .countdown-label {
      display: block;
      font-size: 12px;
      color: var(--text-secondary, #888);
    }
    
    .countdown-time {
      font-size: 18px;
      font-weight: 700;
      color: var(--primary, #3b82f6);
    }
    
    /* 配額卡片網格 */
    .quota-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    
    .quota-card {
      background: var(--bg-secondary, #1a1a1a);
      border: 1px solid var(--border-color, #333);
      border-radius: 16px;
      padding: 20px;
      transition: all 0.3s;
      position: relative;
      overflow: hidden;
    }
    
    .quota-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    }
    
    .quota-card.warning {
      border-color: rgba(245, 158, 11, 0.5);
    }
    
    .quota-card.exceeded {
      border-color: rgba(239, 68, 68, 0.5);
      background: rgba(239, 68, 68, 0.05);
    }
    
    .quota-card.unlimited {
      border-color: rgba(139, 92, 246, 0.3);
    }
    
    .card-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .quota-icon {
      font-size: 32px;
    }
    
    .quota-info h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    
    .quota-status {
      font-size: 12px;
    }
    
    .card-body .quota-value {
      display: flex;
      align-items: baseline;
      gap: 4px;
      margin-bottom: 12px;
    }
    
    .quota-value .used {
      font-size: 32px;
      font-weight: 700;
    }
    
    .quota-value .separator {
      font-size: 18px;
      color: var(--text-secondary, #888);
    }
    
    .quota-value .limit {
      font-size: 18px;
      color: var(--text-secondary, #888);
    }
    
    .quota-value.unlimited {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
    
    .infinity {
      font-size: 36px;
      color: #8b5cf6;
    }
    
    .used-text {
      font-size: 14px;
      color: var(--text-secondary, #888);
    }
    
    .progress-container {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .progress-bar {
      flex: 1;
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      overflow: hidden;
    }
    
    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s;
    }
    
    .percentage {
      font-size: 14px;
      font-weight: 600;
      min-width: 50px;
      text-align: right;
    }
    
    .quota-details {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text-secondary, #888);
    }
    
    .mini-trend {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      opacity: 0.3;
      color: var(--primary, #3b82f6);
    }
    
    .mini-trend svg {
      width: 100%;
      height: 100%;
    }
    
    /* 趨勢圖表區 */
    .trend-section, .history-section, .alerts-section {
      background: var(--bg-secondary, #1a1a1a);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .section-header h2 {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }
    
    .period-selector {
      display: flex;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 4px;
    }
    
    .period-selector button {
      padding: 6px 12px;
      background: transparent;
      border: none;
      border-radius: 6px;
      color: var(--text-secondary, #888);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .period-selector button.active {
      background: var(--primary, #3b82f6);
      color: white;
    }
    
    .chart-container {
      position: relative;
    }
    
    .chart-legend {
      display: flex;
      gap: 20px;
      margin-bottom: 16px;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }
    
    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }
    
    .chart-area {
      position: relative;
    }
    
    .trend-chart {
      width: 100%;
      height: 150px;
    }
    
    .trend-chart .grid line {
      stroke: rgba(255, 255, 255, 0.1);
      stroke-width: 1;
    }
    
    .data-point {
      opacity: 0;
      transition: opacity 0.2s;
    }
    
    .trend-chart:hover .data-point {
      opacity: 1;
    }
    
    .chart-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 11px;
      color: var(--text-muted, #666);
    }
    
    /* 歷史記錄表格 */
    .view-all-btn, .clear-btn {
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 6px;
      color: var(--text-secondary, #888);
      font-size: 13px;
      cursor: pointer;
    }
    
    .history-table {
      border: 1px solid var(--border-color, #333);
      border-radius: 12px;
      overflow: hidden;
    }
    
    .table-header {
      display: grid;
      grid-template-columns: 100px 1fr 80px 80px 80px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.05);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary, #888);
    }
    
    .table-row {
      display: grid;
      grid-template-columns: 100px 1fr 80px 80px 80px;
      padding: 12px 16px;
      border-top: 1px solid var(--border-color, #333);
      font-size: 13px;
      transition: background 0.2s;
    }
    
    .table-row:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    
    .table-row .type {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .table-row .percentage.warning {
      color: #f59e0b;
    }
    
    .empty-history {
      padding: 32px;
      text-align: center;
      color: var(--text-secondary, #888);
    }
    
    /* 告警列表 */
    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .alert-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: rgba(245, 158, 11, 0.1);
      border-radius: 12px;
      transition: opacity 0.2s;
    }
    
    .alert-item.acknowledged {
      opacity: 0.5;
    }
    
    .alert-icon {
      font-size: 24px;
    }
    
    .alert-content {
      flex: 1;
    }
    
    .alert-type {
      display: block;
      font-weight: 600;
      font-size: 14px;
    }
    
    .alert-message {
      font-size: 13px;
      color: var(--text-secondary, #888);
    }
    
    .ack-btn {
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 6px;
      color: white;
      font-size: 12px;
      cursor: pointer;
    }
    
    /* 升級引導 */
    .upgrade-section {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1));
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 16px;
      padding: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .upgrade-content {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .upgrade-icon {
      font-size: 48px;
    }
    
    .upgrade-text h3 {
      margin: 0 0 4px;
      font-size: 18px;
    }
    
    .upgrade-text p {
      margin: 0;
      font-size: 14px;
      color: var(--text-secondary, #888);
    }
    
    .upgrade-features {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    
    .upgrade-features .feature {
      font-size: 13px;
      color: #22c55e;
    }
    
    .upgrade-cta {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 28px;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      border: none;
      border-radius: 12px;
      color: white;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .upgrade-cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4);
    }
    
    .upgrade-cta .arrow {
      transition: transform 0.2s;
    }
    
    .upgrade-cta:hover .arrow {
      transform: translateX(4px);
    }
    
    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }
      
      .quota-grid {
        grid-template-columns: 1fr;
      }
      
      .table-header, .table-row {
        grid-template-columns: 80px 1fr 60px 60px 60px;
        font-size: 12px;
      }
      
      .upgrade-section {
        flex-direction: column;
        text-align: center;
        gap: 20px;
      }
      
      .upgrade-content {
        flex-direction: column;
      }
    }
  `]
})
export class QuotaDashboardViewComponent implements OnInit, OnDestroy {
  public quotaService = inject(QuotaService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private ipc = inject(ElectronIpcService);
  
  // 狀態
  selectedPeriod = signal<'7d' | '30d' | '90d'>('7d');
  showAllHistory = false;
  
  private refreshInterval: any;
  private countdownInterval: any;
  
  // 趨勢數據
  private _trendData = signal<TrendData | null>(null);
  trendData = this._trendData.asReadonly();
  
  // 歷史數據
  private _history = signal<QuotaHistoryItem[]>([]);
  
  // 倒計時
  private _nextResetTime = signal<string | null>(null);
  nextResetTime = this._nextResetTime.asReadonly();
  
  // 週期選項
  periods = [
    { value: '7d' as const, label: '7天' },
    { value: '30d' as const, label: '30天' },
    { value: '90d' as const, label: '90天' }
  ];
  
  // 升級功能列表
  upgradeFeatures = [
    '更多 TG 帳號',
    '更高消息配額',
    '無限 AI 調用',
    '高級功能'
  ];
  
  // 圖標映射
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
  
  // 等級配置
  private tierConfig: Record<string, { icon: string; gradient: string; name: string }> = {
    bronze: { icon: '🥉', gradient: 'linear-gradient(135deg, #CD7F32, #8B4513)', name: '青銅戰士' },
    silver: { icon: '🥈', gradient: 'linear-gradient(135deg, #C0C0C0, #808080)', name: '白銀衛士' },
    gold: { icon: '🥇', gradient: 'linear-gradient(135deg, #FFD700, #FFA500)', name: '黃金獵手' },
    diamond: { icon: '💎', gradient: 'linear-gradient(135deg, #00CED1, #4169E1)', name: '鑽石王者' },
    star: { icon: '⭐', gradient: 'linear-gradient(135deg, #9B59B6, #8E44AD)', name: '星耀傳奇' },
    king: { icon: '👑', gradient: 'linear-gradient(135deg, #FF6B6B, #EE5A24)', name: '王者至尊' },
  };

  ngOnInit() {
    this.loadData();
    this.startRefreshInterval();
    this.startCountdown();
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  async loadData() {
    await Promise.all([
      this.quotaService.loadQuotaSummary(),
      this.quotaService.loadAlerts(),
      this.quotaService.loadMembershipLevels(),
      this.loadTrendData(),
      this.loadHistory(),
    ]);
  }

  private startRefreshInterval() {
    this.refreshInterval = setInterval(() => {
      this.quotaService.loadQuotaSummary();
    }, 60000); // 每分鐘刷新
  }

  private startCountdown() {
    this.updateCountdown();
    this.countdownInterval = setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  private updateCountdown() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    this._nextResetTime.set(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
  }

  private async loadTrendData() {
    // 模擬趨勢數據（實際應從 API 獲取）
    const days = this.selectedPeriod() === '7d' ? 7 : this.selectedPeriod() === '30d' ? 30 : 90;
    const labels: string[] = [];
    const messagesData: number[] = [];
    const aiData: number[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(`${date.getMonth() + 1}/${date.getDate()}`);
      messagesData.push(Math.floor(Math.random() * 100) + 20);
      aiData.push(Math.floor(Math.random() * 50) + 5);
    }
    
    this._trendData.set({
      labels,
      datasets: [
        { name: '每日消息', data: messagesData, color: '#3b82f6' },
        { name: 'AI 調用', data: aiData, color: '#8b5cf6' },
      ]
    });
  }

  private async loadHistory() {
    // 模擬歷史數據
    const history: QuotaHistoryItem[] = [];
    for (let i = 0; i < 10; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      history.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        quota_type: i % 2 === 0 ? 'daily_messages' : 'ai_calls',
        used: Math.floor(Math.random() * 80) + 20,
        limit: 100,
      });
    }
    this._history.set(history);
  }

  // 計算屬性
  tierIcon = computed(() => {
    const tier = this.authService.subscriptionTier() || 'bronze';
    return this.tierConfig[tier]?.icon || '🥉';
  });

  tierGradient = computed(() => {
    const tier = this.authService.subscriptionTier() || 'bronze';
    return this.tierConfig[tier]?.gradient || this.tierConfig.bronze.gradient;
  });

  tierName = computed(() => {
    const tier = this.authService.subscriptionTier() || 'bronze';
    return this.tierConfig[tier]?.name || '青銅戰士';
  });

  displayQuotas = computed(() => {
    const summary = this.quotaService.quotaSummary();
    if (!summary?.quotas) return [];
    
    return Object.entries(summary.quotas).map(([type, info]) => ({
      type,
      ...info as QuotaInfo,
    }));
  });

  displayHistory = computed(() => {
    const history = this._history();
    return this.showAllHistory ? history : history.slice(0, 5);
  });

  maxTrendValue = computed(() => {
    const trend = this._trendData();
    if (!trend) return 100;
    
    let max = 0;
    trend.datasets.forEach(ds => {
      ds.data.forEach(v => {
        if (v > max) max = v;
      });
    });
    return max || 100;
  });

  // 輔助方法
  getQuotaIcon(type: string): string {
    return this.quotaIcons[type] || '📊';
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      ok: '#22c55e',
      warning: '#f59e0b',
      critical: '#ef4444',
      exceeded: '#dc2626',
      unlimited: '#8b5cf6',
    };
    return colors[status] || '#888';
  }

  getStatusText(status: string): string {
    const texts: Record<string, string> = {
      ok: '正常',
      warning: '即將達限',
      critical: '接近上限',
      exceeded: '已超限',
      unlimited: '無限制',
    };
    return texts[status] || '';
  }

  getProgressGradient(status: string): string {
    if (status === 'exceeded') return '#ef4444';
    if (status === 'critical' || status === 'warning') return 'linear-gradient(90deg, #f59e0b, #ef4444)';
    return 'linear-gradient(90deg, #3b82f6, #8b5cf6)';
  }

  formatNumber(num: number): string {
    if (num === -1) return '∞';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }

  formatResetTime(isoTime: string): string {
    try {
      const date = new Date(isoTime);
      return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  getTrendData(quotaType: string): string | null {
    // 生成簡化的 mini 趨勢線
    const points: string[] = [];
    for (let i = 0; i < 7; i++) {
      const x = (i / 6) * 100;
      const y = 30 - Math.random() * 25;
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  }

  generateChartPoints(data: number[]): string {
    if (!data || data.length === 0) return '';
    
    const max = this.maxTrendValue();
    const points: string[] = [];
    
    data.forEach((value, i) => {
      const x = (i / (data.length - 1 || 1)) * 400;
      const y = 150 - (value / max) * 150;
      points.push(`${x},${y}`);
    });
    
    return points.join(' ');
  }

  getHistoryPercentage(item: QuotaHistoryItem): number {
    if (item.limit === 0) return 0;
    return (item.used / item.limit) * 100;
  }

  showUpgradeHint(): boolean {
    const tier = this.authService.subscriptionTier();
    return tier !== 'king' && tier !== 'star' && tier !== 'diamond';
  }

  async acknowledgeAlert(alertId: number) {
    await this.quotaService.acknowledgeAlert(alertId);
  }

  async clearAlerts() {
    const alerts = this.quotaService.alerts();
    for (const alert of alerts) {
      if (!alert.acknowledged) {
        await this.quotaService.acknowledgeAlert(alert.id);
      }
    }
  }

  goToUpgrade() {
    this.router.navigate(['/upgrade']);
  }
}
