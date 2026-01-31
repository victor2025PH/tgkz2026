/**
 * Smart Marketing View Component
 * 智能營銷中心視圖組件
 * 
 * 🆕 P1-1: 整合多角色協作和AI中心的功能
 */
import { Component, inject, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    <app-smart-marketing-hub></app-smart-marketing-hub>
  `
})
export class SmartMarketingViewComponent implements OnInit {
  // 服務注入
  private i18n = inject(I18nService);
  private nav = inject(NavBridgeService);
  public membershipService = inject(MembershipService);
  
  ngOnInit(): void {
    // 視圖初始化邏輯
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
