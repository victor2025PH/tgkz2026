/**
 * Multi-Role View Component
 * 多角色協作視圖組件 - 完整版
 * 
 * 🆕 Phase 32: 修復組件綁定
 */
import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavBridgeService, LegacyView } from '../services/nav-bridge.service';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { AccountManagementService } from '../services';

// 子組件導入
import { MultiRoleCenterComponent } from '../multi-role/multi-role-center.component';

@Component({
  selector: 'app-multi-role-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MultiRoleCenterComponent
  ],
  template: `
    <app-multi-role-center
      (navigateTo)="navigateTo($event)">
    </app-multi-role-center>
  `
})
export class MultiRoleViewComponent {
  // 服務注入
  private i18n = inject(I18nService);
  private nav = inject(NavBridgeService);
  public membershipService = inject(MembershipService);
  public accountService = inject(AccountManagementService);
  
  // 導航
  navigateTo(view: string): void {
    this.nav.navigateTo(view as LegacyView);
  }
  
  // 翻譯方法
  t(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
