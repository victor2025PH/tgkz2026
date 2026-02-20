/**
 * Automation View Component
 * 自動化中心視圖組件 - 完整版
 * 
 * 🆕 Phase 29: 使用服務替代 @Input/@Output
 */
import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavBridgeService, LegacyView } from '../services/nav-bridge.service';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { MonitoringManagementService } from '../services/monitoring-management.service';

// 子組件導入
import { DashboardOverviewComponent } from '../automation/dashboard-overview.component';

export interface MonitoringStats {
  groups: number;
  keywords: number;
  messages: number;
  triggered: number;
}

@Component({
  selector: 'app-automation-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    DashboardOverviewComponent
  ],
  template: `
    <app-dashboard-overview
      [isMonitoring]="isMonitoring()"
      (startMonitoringClick)="startMonitoring()"
      (stopMonitoringClick)="stopMonitoring()"
      (navigateToPage)="navigateTo($event)">
    </app-dashboard-overview>
  `
})
export class AutomationViewComponent implements OnInit, OnDestroy {
  // 服務注入
  private i18n = inject(I18nService);
  private nav = inject(NavBridgeService);
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  public membershipService = inject(MembershipService);
  // 🔧 P0修復: 使用共享服務的監控狀態
  private monitoringMgmt = inject(MonitoringManagementService);
  
  // 狀態
  isMonitoring = computed(() => this.monitoringMgmt.monitoringActive());
  monitoringStats = signal<MonitoringStats>({
    groups: 0,
    keywords: 0,
    messages: 0,
    triggered: 0
  });
  
  private ipcCleanup: (() => void)[] = [];
  
  ngOnInit(): void {
    this.loadStatus();
    this.setupIpcListeners();
  }
  
  ngOnDestroy(): void {
    this.ipcCleanup.forEach(fn => fn());
  }
  
  private loadStatus(): void {
    this.ipc.send('get-monitoring-status');
    this.ipc.send('get-monitoring-stats');
  }
  
  private setupIpcListeners(): void {
    // 🔧 P0修復: 狀態由 MonitoringManagementService 統一管理
    // 這裡只保留 toast 通知和統計數據更新
    
    const cleanup2 = this.ipc.on('monitoring-stats', (data: MonitoringStats) => {
      this.monitoringStats.set(data);
    });
    
    // 🔧 P0修復: 監聽 monitoring-started 事件（只顯示 toast）
    const cleanup3 = this.ipc.on('monitoring-started', (data: { success?: boolean; message?: string } | undefined) => {
      const msg = typeof data === 'object' && data?.message ? data.message : '監控已啟動';
      this.toast.success(msg);
    });
    
    const cleanup4 = this.ipc.on('monitoring-stopped', () => {
      this.toast.info('監控已停止');
    });
    
    // 🔧 P0修復: 監聽 monitoring-start-failed 事件
    const cleanup6 = this.ipc.on('monitoring-start-failed', (data: { reason: string; message: string; issues?: any[] }) => {
      console.log('[AutomationView] 監控啟動失敗:', data);
      
      let errorMsg = data.message || '監控啟動失敗';
      if (data.reason === 'config_check_failed' && data.issues?.length) {
        errorMsg = `配置錯誤: ${data.issues[0]?.message || errorMsg}`;
      } else if (data.reason === 'no_accessible_groups') {
        errorMsg = '無法訪問監控群組，請確保帳號已加入群組';
      } else if (data.reason === 'all_accounts_failed') {
        errorMsg = '所有監控帳號都無法啟動';
      }
      
      this.toast.error(errorMsg, 5000);
    });
    
    this.ipcCleanup.push(cleanup2, cleanup3, cleanup4, cleanup6);
  }
  
  // 翻譯方法
  t(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
  
  // 導航 — 必須透過 app.component 的 changeView() 才會觸發 Router 導航
  // NavBridgeService.navigateTo() 只更新信號，不做路由跳轉，故改用 CustomEvent
  navigateTo(view: string): void {
    window.dispatchEvent(new CustomEvent('changeView', { detail: view }));
  }
  
  // 啟動監控
  startMonitoring(): void {
    this.ipc.send('start-monitoring');
  }
  
  // 停止監控
  stopMonitoring(): void {
    this.ipc.send('stop-monitoring');
  }
}
