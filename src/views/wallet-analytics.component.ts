/**
 * 消費分析頁面
 * Wallet Analytics View
 * 
 * 顯示消費統計和分析圖表：
 * - 按類別餅圖
 * - 按時間趨勢圖
 * - 消費摘要
 */

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WalletService } from '../services/wallet.service';

interface CategoryData {
  name: string;
  amount: number;
  count: number;
  percent: number;
  color: string;
}

interface DailyData {
  date: string;
  amount: number;
}

@Component({
  selector: 'app-wallet-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="analytics-view">
      <!-- 頭部 -->
      <div class="view-header">
        <div class="header-left">
          <button class="back-btn" (click)="goBack()">←</button>
          <h1>消費分析</h1>
        </div>
        <select class="period-select" [(ngModel)]="selectedPeriod" (change)="onPeriodChange()">
          <option value="7">近 7 天</option>
          <option value="30">近 30 天</option>
          <option value="90">近 90 天</option>
        </select>
      </div>

      <!-- 總覽卡片 -->
      <div class="summary-cards">
        <div class="summary-card">
          <div class="card-icon">💰</div>
          <div class="card-content">
            <div class="card-label">總消費</div>
            <div class="card-value">{{ summary()?.total_display || '$0.00' }}</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon">📊</div>
          <div class="card-content">
            <div class="card-label">交易次數</div>
            <div class="card-value">{{ summary()?.total_count || 0 }}</div>
          </div>
        </div>
        <div class="summary-card">
          <div class="card-icon">📅</div>
          <div class="card-content">
            <div class="card-label">今日消費</div>
            <div class="card-value">{{ formatAmount(summary()?.today_consumed || 0) }}</div>
          </div>
        </div>
      </div>

      <!-- 按類別分析 -->
      <div class="section">
        <h2>按類別分析</h2>
        
        <!-- 簡易餅圖 -->
        <div class="pie-chart-container" *ngIf="categoryData().length > 0">
          <div class="pie-chart">
            <svg viewBox="0 0 100 100">
              <circle 
                *ngFor="let cat of categoryData(); let i = index"
                cx="50" cy="50" r="40"
                fill="transparent"
                [attr.stroke]="cat.color"
                stroke-width="20"
                [attr.stroke-dasharray]="getStrokeDasharray(cat.percent)"
                [attr.stroke-dashoffset]="getStrokeDashoffset(i)"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div class="pie-center">
              <div class="pie-total">{{ summary()?.total_display }}</div>
              <div class="pie-label">總消費</div>
            </div>
          </div>
          
          <!-- 圖例 -->
          <div class="pie-legend">
            <div class="legend-item" *ngFor="let cat of categoryData()">
              <span class="legend-dot" [style.background]="cat.color"></span>
              <span class="legend-name">{{ cat.name }}</span>
              <span class="legend-percent">{{ cat.percent.toFixed(1) }}%</span>
              <span class="legend-amount">{{ formatAmount(cat.amount) }}</span>
            </div>
          </div>
        </div>
        
        <div class="empty-chart" *ngIf="categoryData().length === 0 && !loading()">
          <span>暫無消費數據</span>
        </div>
      </div>

      <!-- 消費趨勢 -->
      <div class="section">
        <h2>消費趨勢</h2>
        
        <div class="bar-chart" *ngIf="dailyData().length > 0">
          <div class="bar-container">
            <div 
              class="bar-item" 
              *ngFor="let day of dailyData()"
              [title]="day.date + ': ' + formatAmount(day.amount)"
            >
              <div 
                class="bar" 
                [style.height]="getBarHeight(day.amount) + '%'"
              ></div>
              <div class="bar-label">{{ formatDayLabel(day.date) }}</div>
            </div>
          </div>
        </div>
        
        <div class="empty-chart" *ngIf="dailyData().length === 0 && !loading()">
          <span>暫無消費趨勢數據</span>
        </div>
      </div>

      <!-- 類別明細 -->
      <div class="section">
        <h2>消費明細</h2>
        
        <div class="category-list">
          <div class="category-item" *ngFor="let cat of categoryData()">
            <div class="category-header">
              <span class="category-icon">{{ getCategoryIcon(cat.name) }}</span>
              <span class="category-name">{{ cat.name }}</span>
            </div>
            <div class="category-stats">
              <div class="stat">
                <span class="stat-value">{{ formatAmount(cat.amount) }}</span>
                <span class="stat-label">消費金額</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ cat.count }}</span>
                <span class="stat-label">交易次數</span>
              </div>
              <div class="stat">
                <span class="stat-value">{{ formatAmount(cat.count > 0 ? cat.amount / cat.count : 0) }}</span>
                <span class="stat-label">平均單筆</span>
              </div>
            </div>
            <div class="category-bar">
              <div class="bar-fill" [style.width]="cat.percent + '%'" [style.background]="cat.color"></div>
            </div>
          </div>
        </div>
        
        <div class="empty-list" *ngIf="categoryData().length === 0 && !loading()">
          <span>暫無消費記錄</span>
        </div>
      </div>

      <!-- 導出按鈕 -->
      <div class="export-section">
        <button class="export-btn" (click)="exportData()">
          📥 導出報表
        </button>
      </div>

      <!-- 加載狀態 -->
      <div class="loading-overlay" *ngIf="loading()">
        <div class="spinner"></div>
      </div>
    </div>
  `,
  styles: [`
    .analytics-view {
      min-height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      padding: 20px;
      padding-bottom: 100px;
      color: #fff;
    }

    .view-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .back-btn {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #fff;
      font-size: 20px;
      cursor: pointer;
    }

    h1 {
      font-size: 24px;
      font-weight: 600;
      margin: 0;
    }

    .period-select {
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      color: #fff;
      font-size: 14px;
    }

    .period-select option {
      background: #1a1a2e;
    }

    /* 總覽卡片 */
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }

    .summary-card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .card-icon {
      font-size: 28px;
    }

    .card-label {
      font-size: 12px;
      opacity: 0.6;
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 18px;
      font-weight: 600;
    }

    /* 區塊 */
    .section {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .section h2 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 20px 0;
    }

    /* 餅圖 */
    .pie-chart-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
    }

    .pie-chart {
      position: relative;
      width: 200px;
      height: 200px;
    }

    .pie-chart svg {
      width: 100%;
      height: 100%;
    }

    .pie-center {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .pie-total {
      font-size: 20px;
      font-weight: 700;
      color: #667eea;
    }

    .pie-label {
      font-size: 12px;
      opacity: 0.6;
    }

    .pie-legend {
      width: 100%;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .legend-name {
      flex: 1;
      font-size: 14px;
    }

    .legend-percent {
      font-size: 13px;
      opacity: 0.7;
      width: 50px;
      text-align: right;
    }

    .legend-amount {
      font-size: 14px;
      font-weight: 500;
      width: 80px;
      text-align: right;
    }

    /* 柱狀圖 */
    .bar-chart {
      height: 160px;
      overflow-x: auto;
    }

    .bar-container {
      display: flex;
      align-items: flex-end;
      height: 100%;
      gap: 8px;
      min-width: max-content;
      padding: 0 4px;
    }

    .bar-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 32px;
      height: 100%;
    }

    .bar {
      width: 100%;
      background: linear-gradient(180deg, #667eea, #764ba2);
      border-radius: 4px 4px 0 0;
      min-height: 4px;
      transition: height 0.3s;
    }

    .bar-label {
      font-size: 10px;
      opacity: 0.5;
      margin-top: 6px;
      white-space: nowrap;
    }

    /* 類別列表 */
    .category-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .category-item {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      padding: 16px;
    }

    .category-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }

    .category-icon {
      font-size: 20px;
    }

    .category-name {
      font-size: 15px;
      font-weight: 500;
    }

    .category-stats {
      display: flex;
      gap: 24px;
      margin-bottom: 12px;
    }

    .stat {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 16px;
      font-weight: 600;
    }

    .stat-label {
      font-size: 11px;
      opacity: 0.5;
    }

    .category-bar {
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s;
    }

    /* 空狀態 */
    .empty-chart, .empty-list {
      text-align: center;
      padding: 40px 20px;
      opacity: 0.5;
    }

    /* 導出按鈕 */
    .export-section {
      text-align: center;
      margin-top: 24px;
    }

    .export-btn {
      padding: 14px 32px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      color: #fff;
      font-size: 15px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .export-btn:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    /* 加載 */
    .loading-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.2);
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class WalletAnalyticsComponent implements OnInit {
  selectedPeriod = '30';
  loading = signal(true);
  summary = signal<any>(null);
  categoryData = signal<CategoryData[]>([]);
  dailyData = signal<DailyData[]>([]);

  private categoryColors: Record<string, string> = {
    'membership': '#667eea',
    'ip_proxy': '#22c55e',
    'quota_pack': '#f59e0b',
    'other': '#8b5cf6'
  };

  private categoryNames: Record<string, string> = {
    'membership': '會員服務',
    'ip_proxy': '靜態 IP',
    'quota_pack': '配額包',
    'other': '其他'
  };

  constructor(
    private walletService: WalletService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    
    try {
      const days = parseInt(this.selectedPeriod);
      
      // 獲取消費摘要
      const summary = await this.walletService.getConsumeSummary(days);
      
      if (summary) {
        this.summary.set(summary);
        
        // 處理類別數據
        const categories: CategoryData[] = [];
        const byCategory = summary.by_category || {};
        const totalAmount = summary.total_amount || 0;
        
        for (const [key, data] of Object.entries(byCategory)) {
          const catData = data as any;
          categories.push({
            name: this.categoryNames[key] || key,
            amount: catData.total || 0,
            count: catData.count || 0,
            percent: totalAmount > 0 ? (catData.total / totalAmount) * 100 : 0,
            color: this.categoryColors[key] || '#999'
          });
        }
        
        // 按金額排序
        categories.sort((a, b) => b.amount - a.amount);
        this.categoryData.set(categories);
      }
      
      // 獲取消費分析（按日期）
      const analysis = await this.walletService.getConsumeAnalysis();
      
      if (analysis?.by_date) {
        const daily: DailyData[] = analysis.by_date.map((item: any) => ({
          date: item.date,
          amount: item.amount
        }));
        
        // 按日期排序
        daily.sort((a, b) => a.date.localeCompare(b.date));
        
        // 只取最近的天數
        const recentDays = daily.slice(-parseInt(this.selectedPeriod));
        this.dailyData.set(recentDays);
      }
      
    } catch (error) {
      console.error('Load analytics error:', error);
    } finally {
      this.loading.set(false);
    }
  }

  onPeriodChange() {
    this.loadData();
  }

  formatAmount(cents: number): string {
    return '$' + (cents / 100).toFixed(2);
  }

  formatDayLabel(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  getCategoryIcon(name: string): string {
    const icons: Record<string, string> = {
      '會員服務': '👑',
      '靜態 IP': '🌐',
      '配額包': '📊',
      '其他': '📦'
    };
    return icons[name] || '📋';
  }

  getBarHeight(amount: number): number {
    const daily = this.dailyData();
    if (daily.length === 0) return 0;
    
    const maxAmount = Math.max(...daily.map(d => d.amount));
    if (maxAmount === 0) return 0;
    
    return (amount / maxAmount) * 100;
  }

  // SVG 餅圖計算
  getStrokeDasharray(percent: number): string {
    const circumference = 2 * Math.PI * 40; // r=40
    const length = (percent / 100) * circumference;
    return `${length} ${circumference}`;
  }

  getStrokeDashoffset(index: number): number {
    const circumference = 2 * Math.PI * 40;
    let offset = 0;
    
    const categories = this.categoryData();
    for (let i = 0; i < index; i++) {
      offset += (categories[i].percent / 100) * circumference;
    }
    
    return -offset;
  }

  async exportData() {
    try {
      await this.walletService.exportTransactions();
    } catch (error) {
      console.error('Export error:', error);
      alert('導出失敗');
    }
  }

  goBack() {
    this.router.navigate(['/wallet']);
  }
}
