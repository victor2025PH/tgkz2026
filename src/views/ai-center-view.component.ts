/**
 * AI Center View Component
 * AI 中心視圖組件 - 完整版
 * 
 * 🆕 Phase 29: 使用服務替代 @Input/@Output
 */
import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavBridgeService, LegacyView } from '../services/nav-bridge.service';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { AiChatService } from '../services';

// 子組件導入
import { AICenterComponent } from '../ai-center/ai-center.component';

@Component({
  selector: 'app-ai-center-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    AICenterComponent
  ],
  template: `
    <app-ai-center
      (tabChange)="setActiveTab($event)"
      (navigate)="navigateTo($event)">
    </app-ai-center>
  `
})
export class AiCenterViewComponent implements OnInit {
  // 服務注入
  private i18n = inject(I18nService);
  private nav = inject(NavBridgeService);
  public membershipService = inject(MembershipService);
  public aiService = inject(AiChatService);
  
  // 狀態
  activeTab = signal<string>('config');
  
  ngOnInit(): void {
    // 從 URL 參數讀取初始標籤
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) {
      this.activeTab.set(tab);
    }
    
    // 加載 AI 設置
    this.aiService.loadSettings();
  }
  
  // 翻譯方法
  t(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
  
  // 導航
  navigateTo(view: string): void {
    this.nav.navigateTo(view as LegacyView);
  }
  
  // 設置活動標籤
  setActiveTab(tab: string): void {
    this.activeTab.set(tab);
    // 注意：URL 查詢參數更新暫時禁用（使用 @switch 視圖系統）
  }
}
