/**
 * AI Center View Component
 * AI 中心視圖組件 - 完整版
 * 
 * 🆕 Phase 29: 使用服務替代 @Input/@Output
 * 🔧 知识大脑：根据路由 enginePanel 传入 initialTab / initialKnowledgeSub
 */
import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
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
      [initialTab]="initialTab()"
      [initialKnowledgeSub]="initialKnowledgeSub()"
      (tabChange)="setActiveTab($event)"
      (navigate)="navigateTo($event)">
    </app-ai-center>
  `
})
export class AiCenterViewComponent implements OnInit, OnDestroy {
  // 服務注入
  private i18n = inject(I18nService);
  private nav = inject(NavBridgeService);
  private route = inject(ActivatedRoute);
  public membershipService = inject(MembershipService);
  public aiService = inject(AiChatService);
  private routeDataSub: Subscription | null = null;
  private queryParamsSub: Subscription | null = null;

  /** 由路由 data.enginePanel 決定：overview/knowledge/gaps → knowledge Tab，default → 不傳 */
  initialTab = signal<'quick' | 'models' | 'persona' | 'stats' | 'knowledge' | undefined>(undefined);
  initialKnowledgeSub = signal<'overview' | 'manage' | 'gaps' | undefined>(undefined);

  private setPanelFromRoute(): void {
    const panel = this.route.snapshot.data['enginePanel'] as string | undefined;
    const queryTab = this.route.snapshot.queryParams['tab'] as string | undefined;
    const validTabs = ['quick', 'models', 'persona', 'stats', 'knowledge'];
    if (panel === 'overview') {
      this.initialTab.set('knowledge');
      this.initialKnowledgeSub.set('overview');
    } else if (panel === 'knowledge') {
      this.initialTab.set('knowledge');
      this.initialKnowledgeSub.set('manage');
    } else if (panel === 'gaps') {
      this.initialTab.set('knowledge');
      this.initialKnowledgeSub.set('gaps');
    } else if (queryTab && validTabs.includes(queryTab)) {
      this.initialTab.set(queryTab as 'quick' | 'models' | 'persona' | 'stats' | 'knowledge');
      this.initialKnowledgeSub.set(queryTab === 'knowledge' ? 'overview' : undefined);
    } else {
      this.initialTab.set(undefined);
      this.initialKnowledgeSub.set(undefined);
    }
  }

  // 狀態（供 tabChange 回調）
  activeTab = signal<string>('config');
  
  ngOnInit(): void {
    this.setPanelFromRoute();
    this.routeDataSub = this.route.data.subscribe(() => this.setPanelFromRoute());
    this.queryParamsSub = this.route.queryParams.subscribe(() => this.setPanelFromRoute());
    this.aiService.loadSettings();
  }

  ngOnDestroy(): void {
    this.routeDataSub?.unsubscribe();
    this.queryParamsSub?.unsubscribe();
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
