/**
 * Analytics View Component
 * 數據分析視圖組件 - 完整版
 * 
 * 🆕 Phase 30: 使用服務替代 @Input/@Output
 */
import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavBridgeService, LegacyView } from '../services/nav-bridge.service';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

// 子組件導入
import { SmartAnalyticsComponent } from '../analytics/smart-analytics.component';

@Component({
  selector: 'app-analytics-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    SmartAnalyticsComponent
  ],
  template: `
    <app-smart-analytics
      (dateRangeChange)="setDateRange($event)"
      (navigateTo)="navigateTo($event)">
    </app-smart-analytics>
  `
})
export class AnalyticsViewComponent implements OnInit, OnDestroy {
  // 服務注入
  private i18n = inject(I18nService);
  private nav = inject(NavBridgeService);
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  public membershipService = inject(MembershipService);
  
  // 狀態
  dateRange = signal<{ start: Date; end: Date } | null>(null);
  
  private ipcCleanup: (() => void)[] = [];
  
  ngOnInit(): void {
    // 設置默認日期範圍（過去 30 天）
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    this.dateRange.set({ start, end });
    
    this.loadAnalyticsData();
    this.setupIpcListeners();
  }
  
  ngOnDestroy(): void {
    this.ipcCleanup.forEach(fn => fn());
  }
  
  private loadAnalyticsData(): void {
    const range = this.dateRange();
    if (range) {
      this.ipc.send('get-analytics-data', {
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString()
      });
    }
  }
  
  private setupIpcListeners(): void {
    const cleanup = this.ipc.on('analytics-data-loaded', () => {
      // 數據加載完成
    });
    this.ipcCleanup.push(cleanup);
  }
  
  // 導航
  navigateTo(view: string): void {
    this.nav.navigateTo(view as LegacyView);
  }
  
  // 設置日期範圍
  setDateRange(range: { start: Date; end: Date }): void {
    this.dateRange.set(range);
    this.loadAnalyticsData();
  }
  
  // 翻譯方法
  t(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
