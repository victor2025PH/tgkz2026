/**
 * Smart Marketing View Component
 * 智能營銷中心視圖組件
 * 
 * 🆕 P1-1: 整合多角色協作和AI中心的功能
 */
import { Component, inject, signal, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { NavBridgeService, LegacyView } from '../services/nav-bridge.service';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';

// 子組件導入
import { SmartMarketingHubComponent } from '../smart-marketing/smart-marketing-hub.component';

@Component({
  selector: 'app-smart-marketing-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    SmartMarketingHubComponent
  ],
  template: `
    <app-smart-marketing-hub [initialTab]="initialTab()"></app-smart-marketing-hub>
  `
})
export class SmartMarketingViewComponent implements OnInit, OnDestroy {
  // 服務注入
  private i18n = inject(I18nService);
  private nav = inject(NavBridgeService);
  private route = inject(ActivatedRoute);
  public membershipService = inject(MembershipService);
  private routeDataSub: Subscription | null = null;

  /** 根據路由 data.hubMode 決定預設 Tab：execution → 任務列表，strategy → 快速啟動 */
  initialTab = signal<'quick-start' | 'tasks' | 'monitor' | 'settings'>('quick-start');

  private setTabFromRoute(): void {
    const mode = this.route.snapshot.data['hubMode'] as string | undefined;
    this.initialTab.set(mode === 'execution' ? 'tasks' : 'quick-start');
  }

  ngOnInit(): void {
    this.setTabFromRoute();
    this.routeDataSub = this.route.data.subscribe(() => this.setTabFromRoute());
  }

  ngOnDestroy(): void {
    this.routeDataSub?.unsubscribe();
  }
  
  // 翻譯方法
  t(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
  
  // 導航
  navigateTo(view: string): void {
    this.nav.navigateTo(view as LegacyView);
  }
}
