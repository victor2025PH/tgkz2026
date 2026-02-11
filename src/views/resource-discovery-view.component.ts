/**
 * Resource Discovery View Component
 * 資源發現視圖組件 - 完整版
 *
 * 🆕 资源中心与搜索发现区分：资源中心使用独立数据源（SavedResourcesService），
 * 首屏以「我的收藏」为主；搜索发现以搜索与发现为主。
 */
import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavBridgeService, LegacyView } from '../services/nav-bridge.service';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { AccountManagementService, ResourceService } from '../services';
import { SavedResourcesService } from '../services/saved-resources.service';

// 子組件導入
import { SearchDiscoveryComponent } from '../search-discovery/search-discovery.component';
import type { DiscoveredResource } from '../search-discovery/search-discovery.component';

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
      [resources]="resourceCenterList()"
      (resourceSelected)="selectResource($event)"
      (batchJoin)="batchJoin($event)"
      (navigateTo)="navigateTo($event)"
      (saveResourceEvent)="onSaveResource($event)"
      (unsaveResourceEvent)="onUnsaveResource($event)">
    </app-search-discovery>
  `
})
export class ResourceDiscoveryViewComponent implements OnInit, OnDestroy {
  // 服務注入
  private i18n = inject(I18nService);
  private nav = inject(NavBridgeService);
  private route = inject(ActivatedRoute);
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  public membershipService = inject(MembershipService);
  public accountService = inject(AccountManagementService);
  public resourceService = inject(ResourceService);
  private savedResources = inject(SavedResourcesService);
  private routeDataSub: Subscription | null = null;

  // 🔧 由路由決定：/resource-discovery → 資源中心，/search-discovery → 搜索發現
  initialView = signal<string>('search-discovery');

  /** 资源中心模式下传给子组件的已收藏列表（与 DiscoveredResource 兼容） */
  resourceCenterList = computed(() => {
    if (this.initialView() !== 'resource-center') return [];
    const list = this.savedResources.list();
    return list.map((r, i) => ({
      id: r.id ?? i,
      telegram_id: r.telegram_id || '',
      title: r.title || '',
      username: r.username,
      description: r.description,
      member_count: r.member_count ?? 0,
      resource_type: (r.resource_type as any) || 'group',
      status: (r.status as any) || 'discovered',
      is_saved: true,
      invite_link: r.invite_link,
      discovery_source: r.discovery_source,
      discovery_keyword: r.discovery_keyword,
      created_at: r.created_at
    }));
  });

  private setModeFromRoute(): void {
    const mode = this.route.snapshot.data['discoveryMode'] as string | undefined;
    if (mode === 'resource-center' || mode === 'search-discovery') {
      this.initialView.set(mode);
    } else {
      const currentView = this.nav.currentView();
      if (currentView === 'resource-center' || currentView === 'resources') {
        this.initialView.set('resource-center');
      } else {
        this.initialView.set('search-discovery');
      }
    }
  }
  
  ngOnInit(): void {
    this.setModeFromRoute();
    this.routeDataSub = this.route.data.subscribe(() => this.setModeFromRoute());
  }

  ngOnDestroy(): void {
    this.routeDataSub?.unsubscribe();
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

  /** 收藏资源：写入资源中心列表并持久化 */
  onSaveResource(resource: DiscoveredResource): void {
    const tid = (resource.telegram_id || '').toString().trim();
    if (!tid) return;
    this.savedResources.add(resource as any);
    this.toast.success(`已收藏「${resource.title || resource.telegram_id}」`);
  }

  /** 取消收藏：从资源中心列表移除 */
  onUnsaveResource(resource: DiscoveredResource): void {
    const tid = (resource.telegram_id || '').toString().trim();
    if (!tid) return;
    this.savedResources.remove(tid);
    this.toast.info(`已取消收藏「${resource.title || resource.telegram_id}」`);
  }

  // 翻譯方法
  t(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
