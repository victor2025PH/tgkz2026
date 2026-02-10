/**
 * Resource Discovery View Component
 * 資源發現視圖組件 - 完整版
 * 
 * 🆕 Phase 32: 修復組件綁定和服務調用
 */
import { Component, inject, signal, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavBridgeService, LegacyView } from '../services/nav-bridge.service';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { AccountManagementService, ResourceService } from '../services';

// 子組件導入
import { SearchDiscoveryComponent } from '../search-discovery/search-discovery.component';

@Component({
  selector: 'app-resource-discovery-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    SearchDiscoveryComponent
  ],
  template: `
    <app-search-discovery
      [initialView]="initialView()"
      (resourceSelected)="selectResource($event)"
      (batchJoin)="batchJoin($event)"
      (navigateTo)="navigateTo($event)">
    </app-search-discovery>
  `
})
export class ResourceDiscoveryViewComponent implements OnInit {
  // 服務注入
  private i18n = inject(I18nService);
  private nav = inject(NavBridgeService);
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  public membershipService = inject(MembershipService);
  public accountService = inject(AccountManagementService);
  public resourceService = inject(ResourceService);
  
  // 🔧 Phase9-5: 根據 NavBridge 區分「資源中心」vs「搜索發現」
  initialView = signal<string>('search-discovery');
  
  ngOnInit(): void {
    const currentView = this.nav.currentView();
    if (currentView === 'resource-center' || currentView === 'resources') {
      this.initialView.set('resource-center');
    } else {
      this.initialView.set('search-discovery');
    }
  }
  
  // 導航
  navigateTo(view: string): void {
    this.nav.navigateTo(view as LegacyView);
  }
  
  // 選擇資源
  selectResource(resource: any): void {
    // 處理資源選擇
    this.resourceService.toggleSelection(resource.id);
  }
  
  // 批量加入
  batchJoin(resources: any[]): void {
    const ids = resources.map(r => r.id).join(',');
    this.resourceService.batchJoin(ids);
  }
  
  // 翻譯方法
  t(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
