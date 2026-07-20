/**
 * Settings View Component
 * 設置視圖組件 - 完整版
 *
 * 🆕 側欄優化：通知與提醒、使用幫助、語言與外觀統一在此；支持 ?tab= 深鏈
 */
import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { I18nService, SupportedLocale, SUPPORTED_LOCALES } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { AnimationSelectorComponent } from '../components/animation-selector.component';
import { NotificationCenterComponent } from '../components/notification-center.component';
import {
  SettingsService,
  BackupService,
  SchedulerService,
  AnimationConfigService
} from '../services';
import { OnboardingService } from '../services/onboarding.service';
import { ToastService } from '../toast.service';

export type SettingsTab = 'appearance' | 'notifications' | 'help' | 'backup' | 'scheduler' | 'about';

@Component({
  selector: 'app-settings-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AnimationSelectorComponent, NotificationCenterComponent],
  template: `
    <div class="max-w-6xl mx-auto p-6">
      <h2 class="text-4xl font-bold mb-8 text-white">{{ t('settings.settingsTitle') }}</h2>

      <!-- 設置標籤（與 URL ?tab= 同步） -->
      <div class="flex flex-wrap gap-2 mb-6 bg-slate-800/50 p-1 rounded-lg w-fit">
        <button (click)="setTab('appearance')"
                [class]="activeTab() === 'appearance' ? 'bg-slate-700 shadow' : 'text-slate-500 hover:text-white'"
                class="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm">
          ✨ {{ t('settings.tabs.appearance') }}
        </button>
        <button (click)="setTab('notifications')"
                [class]="activeTab() === 'notifications' ? 'bg-slate-700 shadow' : 'text-slate-500 hover:text-white'"
                class="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm">
          🔔 {{ t('settings.tabs.notifications') }}
        </button>
        <button (click)="setTab('help')"
                [class]="activeTab() === 'help' ? 'bg-slate-700 shadow' : 'text-slate-500 hover:text-white'"
                class="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm">
          ❓ {{ t('settings.tabs.help') }}
        </button>
        <button (click)="setTab('backup'); loadBackups()"
                [class]="activeTab() === 'backup' ? 'bg-slate-700 shadow' : 'text-slate-500 hover:text-white'"
                class="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm">
          💾 {{ t('settings.tabs.backup') }}
        </button>
        <button (click)="setTab('scheduler'); loadSchedulerStatus()"
                [class]="activeTab() === 'scheduler' ? 'bg-slate-700 shadow' : 'text-slate-500 hover:text-white'"
                class="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm">
          ⏰ {{ t('settings.tabs.scheduler') }}
        </button>
        <button (click)="setTab('about')"
                [class]="activeTab() === 'about' ? 'bg-slate-700 shadow' : 'text-slate-500 hover:text-white'"
                class="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm">
          ℹ️ {{ t('settings.tabs.about') }}
        </button>
      </div>
      
      <!-- 外觀設置標籤 -->
      @if (activeTab() === 'appearance') {
        <!-- 動畫選擇器 -->
        <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg mb-6">
          <app-animation-selector></app-animation-selector>
        </div>
        
        <!-- 主題設置 -->
        <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg mb-6">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-xl">🎨</span>
            <h3 class="text-lg font-semibold text-white">{{ t('settings.themeSettings') }}</h3>
          </div>
          
          <!-- P7-4: 主題套用確認提示 -->
          @if (settingApplied() === 'theme') {
            <div class="flex items-center gap-1.5 mb-3 text-emerald-400 text-sm font-medium
                         animate-[fadeIn_0.2s_ease]">
              <span>✅</span><span>主題已套用</span>
            </div>
          }

          <div class="grid grid-cols-3 gap-4">
            <button (click)="setTheme('dark')"
                    class="p-4 rounded-xl border-2 transition-all"
                    [class.border-cyan-500]="settings.settings().theme === 'dark'"
                    [class.border-slate-700]="settings.settings().theme !== 'dark'"
                    [class.bg-slate-800]="true">
              <div class="flex flex-col items-center gap-2">
                <div class="w-12 h-12 rounded-lg bg-slate-900 border border-slate-600 flex items-center justify-center">
                  <span class="text-xl">🌙</span>
                </div>
                <span class="text-sm font-medium text-white">{{ t('settings.darkTheme') }}</span>
              </div>
            </button>
            
            <button (click)="setTheme('light')"
                    class="p-4 rounded-xl border-2 transition-all"
                    [class.border-cyan-500]="settings.settings().theme === 'light'"
                    [class.border-slate-700]="settings.settings().theme !== 'light'"
                    [class.bg-slate-800]="true">
              <div class="flex flex-col items-center gap-2">
                <div class="w-12 h-12 rounded-lg bg-white border border-slate-300 flex items-center justify-center">
                  <span class="text-xl">☀️</span>
                </div>
                <span class="text-sm font-medium text-white">{{ t('settings.lightTheme') }}</span>
              </div>
            </button>
            
            <button (click)="setTheme('system')"
                    class="p-4 rounded-xl border-2 transition-all"
                    [class.border-cyan-500]="settings.settings().theme === 'system'"
                    [class.border-slate-700]="settings.settings().theme !== 'system'"
                    [class.bg-slate-800]="true">
              <div class="flex flex-col items-center gap-2">
                <div class="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-900 to-white border border-slate-600 flex items-center justify-center">
                  <span class="text-xl">💻</span>
                </div>
                <span class="text-sm font-medium text-white">{{ t('settings.followSystem') }}</span>
              </div>
            </button>
          </div>
        </div>
        
        <!-- 語言設置 -->
        <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-xl">🌐</span>
            <h3 class="text-lg font-semibold text-white">{{ t('settings.languageSettings') }}</h3>
          </div>
          
          <!-- P7-4: 語言切換確認提示 -->
          @if (settingApplied() === 'language') {
            <div class="flex items-center gap-1.5 mb-3 text-emerald-400 text-sm font-medium">
              <span>✅</span><span>語言已切換，部分文字需重啟後完整生效</span>
            </div>
          }

          <select (change)="onLocaleChange($event)"
                  class="w-full max-w-xs py-3 px-4 rounded-lg bg-slate-800 text-white border border-slate-600">
            @for (locale of supportedLocales; track locale.code) {
              <option [value]="locale.code" [selected]="i18n.locale() === locale.code">
                {{ locale.flag }} {{ locale.nativeName }}
              </option>
            }
          </select>
        </div>
      }

      <!-- 通知與提醒標籤 -->
      @if (activeTab() === 'notifications') {
        <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg mb-6">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-xl">🔔</span>
            <h3 class="text-lg font-semibold text-white">{{ t('settings.tabs.notifications') }}</h3>
          </div>
          <p class="text-slate-400 text-sm mb-4">{{ t('settings.notificationsDesc') }}</p>
          <app-notification-center></app-notification-center>
        </div>
      }

      <!-- 使用幫助標籤 -->
      @if (activeTab() === 'help') {
        <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg mb-6">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-xl">❓</span>
            <h3 class="text-lg font-semibold text-white">{{ t('settings.tabs.help') }}</h3>
          </div>
          <p class="text-slate-400 text-sm mb-6">{{ t('settings.helpDesc') }}</p>
          <div class="flex flex-wrap gap-3">
            <button (click)="openOnboarding()"
                    class="px-4 py-2.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/40 text-cyan-400 rounded-xl transition-all text-sm font-medium">
              {{ t('settings.openOnboarding') }}
            </button>
            <button (click)="replayPageTours()"
                    class="px-4 py-2.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/40 text-purple-400 rounded-xl transition-all text-sm font-medium">
              重看頁面導覽
            </button>
          </div>
        </div>

        <!-- 上手旅程回顧（數據來自本機漏斗埋點，無需後端查詢） -->
        <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg mb-6">
          <div class="flex items-center justify-between mb-1">
            <h3 class="text-lg font-semibold text-white">上手旅程</h3>
            <button (click)="refreshJourney()"
                    class="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style="background: var(--bg-tertiary); color: var(--text-secondary); border: 1px solid var(--border-default);">
              刷新
            </button>
          </div>
          <p class="text-slate-400 text-sm mb-5">你的獲客鏈路走到哪一步、每步何時完成（數據記錄在本機）</p>

          <!-- 5 步時間線 -->
          <div class="space-y-2 mb-5">
            @for (step of journeySteps(); track step.id; let i = $index; let last = $last) {
              <div class="flex items-start gap-3">
                <div class="flex flex-col items-center">
                  <span class="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold shrink-0"
                        [style.background]="step.doneAt ? 'var(--success)' : 'var(--bg-tertiary)'"
                        [style.color]="step.doneAt ? '#fff' : 'var(--text-muted)'">
                    @if (step.doneAt) { ✓ } @else { {{ i + 1 }} }
                  </span>
                  @if (!last) {
                    <span class="w-px h-5 mt-0.5" [style.background]="step.doneAt ? 'var(--success)' : 'var(--border-default)'"></span>
                  }
                </div>
                <div class="flex-1 min-w-0 flex items-center justify-between gap-3 pb-1">
                  <span class="text-sm" [style.color]="step.doneAt ? 'var(--text-primary)' : 'var(--text-muted)'">{{ step.label }}</span>
                  <span class="text-xs shrink-0" style="color: var(--text-disabled);">
                    @if (step.doneAt) { {{ step.doneAt | date:'MM-dd HH:mm' }} } @else { 未完成 }
                  </span>
                </div>
              </div>
            }
          </div>

          <!-- 摘要行：總耗時 + 導覽狀態 -->
          <div class="flex flex-wrap gap-3 text-xs">
            <span class="px-3 py-1.5 rounded-lg"
                  style="background: var(--bg-tertiary); color: var(--text-secondary); border: 1px solid var(--border-default);">
              @if (journeyTotalMs() !== null) {
                從第一步到跑通：{{ formatDuration(journeyTotalMs()!) }}
              } @else {
                鏈路尚未跑通（{{ journeyDoneCount() }}/5）
              }
            </span>
            <span class="px-3 py-1.5 rounded-lg"
                  [style.background]="tourStatus().tone === 'success' ? 'var(--success-bg)' : 'var(--bg-tertiary)'"
                  [style.color]="tourStatus().tone === 'success' ? 'var(--success)' : 'var(--text-secondary)'"
                  [style.border]="'1px solid var(--border-default)'">
              監控導覽：{{ tourStatus().label }}
            </span>
          </div>
        </div>
      }

      <!-- 備份管理標籤 -->
      @if (activeTab() === 'backup') {
        <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-semibold flex items-center gap-2 text-white">
              💾 {{ t('settings.backupManagement') }}
            </h3>
            <div class="flex gap-2">
              <button (click)="createBackup()" 
                      [disabled]="backup.isCreating()"
                      class="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg disabled:opacity-50">
                {{ backup.isCreating() ? t('settings.creating') : t('settings.createBackup') }}
              </button>
              <button (click)="loadBackups()" 
                      class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">
                {{ t('settings.refresh') }}
              </button>
            </div>
          </div>
          
          @if (backup.backups().length > 0) {
            <div class="border border-slate-600 rounded-lg overflow-hidden">
              <table class="w-full text-sm">
                <thead class="bg-slate-800/50">
                  <tr>
                    <th class="text-left p-3 text-slate-300">{{ t('settings.backupName') }}</th>
                    <th class="text-left p-3 text-slate-300">{{ t('settings.createdAt') }}</th>
                    <th class="text-left p-3 text-slate-300">{{ t('settings.size') }}</th>
                    <th class="text-right p-3 text-slate-300">{{ t('settings.action') }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (b of backup.backups(); track b.id) {
                    <tr class="border-t border-slate-600 hover:bg-slate-800/50">
                      <td class="p-3 text-white">{{ b.name }}</td>
                      <td class="p-3 text-slate-400">{{ b.created_at }}</td>
                      <td class="p-3 text-slate-400">{{ b.size || 'N/A' }}</td>
                      <td class="p-3 text-right">
                        <button (click)="restoreBackup(b.id)" 
                                class="text-cyan-400 hover:text-cyan-300 text-xs px-2 py-1">
                          {{ t('settings.restore') }}
                        </button>
                        <button (click)="deleteBackup(b.id)" 
                                class="text-red-400 hover:text-red-300 text-xs px-2 py-1">
                          {{ t('common.delete') }}
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="text-slate-400 text-center py-8">{{ t('settings.noBackups') }}</p>
          }
        </div>
      }
      
      <!-- 任務調度標籤 -->
      @if (activeTab() === 'scheduler') {
        <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-semibold flex items-center gap-2 text-white">
              ⏰ {{ t('settings.taskScheduler') }}
            </h3>
            <div class="flex gap-2">
              @if (scheduler.isRunning()) {
                <button (click)="stopScheduler()" 
                        class="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg">
                  ⏹️ {{ t('settings.stop') }}
                </button>
              } @else {
                <button (click)="startScheduler()" 
                        class="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg">
                  ▶️ {{ t('settings.start') }}
                </button>
              }
              <button (click)="loadSchedulerStatus()" 
                      class="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg">
                🔄 {{ t('settings.refresh') }}
              </button>
            </div>
          </div>
          
          <!-- 狀態概覽 -->
          <div class="grid grid-cols-4 gap-4 mb-6">
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div class="text-sm text-slate-500">{{ t('settings.status') }}</div>
              <div class="text-xl font-bold" 
                   [class.text-green-400]="scheduler.isRunning()"
                   [class.text-slate-400]="!scheduler.isRunning()">
                {{ scheduler.isRunning() ? t('settings.running') : t('settings.stopped') }}
              </div>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div class="text-sm text-slate-500">{{ t('settings.uptime') }}</div>
              <div class="text-xl font-bold text-cyan-400">{{ scheduler.uptimeFormatted() }}</div>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div class="text-sm text-slate-500">{{ t('settings.totalTasks') }}</div>
              <div class="text-xl font-bold text-blue-400">{{ scheduler.status().totalTasks }}</div>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div class="text-sm text-slate-500">{{ t('settings.activeTasks') }}</div>
              <div class="text-xl font-bold text-purple-400">{{ scheduler.status().activeTasks }}</div>
            </div>
          </div>
          
          <!-- 任務列表 -->
          @if (scheduler.tasks().length > 0) {
            <div class="border border-slate-600 rounded-lg overflow-hidden">
              <table class="w-full text-sm">
                <thead class="bg-slate-800/50">
                  <tr>
                    <th class="text-left p-3 text-slate-300">{{ t('settings.taskName') }}</th>
                    <th class="text-left p-3 text-slate-300">{{ t('settings.interval') }}</th>
                    <th class="text-left p-3 text-slate-300">{{ t('settings.lastRun') }}</th>
                    <th class="text-left p-3 text-slate-300">{{ t('settings.status') }}</th>
                    <th class="text-right p-3 text-slate-300">{{ t('settings.action') }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (task of scheduler.tasks(); track task.name) {
                    <tr class="border-t border-slate-600 hover:bg-slate-800/50">
                      <td class="p-3 font-semibold text-white">{{ task.name }}</td>
                      <td class="p-3 text-slate-400">{{ scheduler.formatInterval(task.interval) }}</td>
                      <td class="p-3 text-slate-400">{{ task.lastRun || t('settings.never') }}</td>
                      <td class="p-3">
                        <span class="px-2 py-1 text-xs rounded-full"
                              [class.bg-green-500/20]="task.status === 'running'"
                              [class.text-green-400]="task.status === 'running'"
                              [class.bg-slate-500/20]="task.status === 'idle'"
                              [class.text-slate-400]="task.status === 'idle'"
                              [class.bg-red-500/20]="task.status === 'error'"
                              [class.text-red-400]="task.status === 'error'">
                          {{ scheduler.getTaskStatusIcon(task.status) }} {{ task.status }}
                        </span>
                      </td>
                      <td class="p-3 text-right">
                        <button (click)="runTask(task.name)" 
                                [disabled]="task.status === 'running'"
                                class="text-cyan-400 hover:text-cyan-300 text-xs px-2 py-1 disabled:opacity-50">
                          {{ t('settings.execute') }}
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="text-slate-400 text-center py-8">{{ t('settings.noScheduledTasks') }}</p>
          }
        </div>
      }
      
      <!-- 關於標籤 -->
      @if (activeTab() === 'about') {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 會員信息 -->
          <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg">
            <h3 class="text-xl font-bold mb-4 text-white">{{ t('settings.membershipInfo') }}</h3>
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center text-3xl">
                {{ getMembershipIcon() }}
              </div>
              <div>
                <p class="font-bold text-lg text-white">{{ getMembershipName() }}</p>
                <p class="text-sm text-slate-400">
                  @if (membershipService.expiresAt()) {
                    {{ t('settings.validUntil') }}: {{ membershipService.expiresAt() | date:'yyyy-MM-dd' }}
                  } @else {
                    {{ t('settings.permanent') }}
                  }
                </p>
              </div>
            </div>
          </div>
          
          <!-- 版本信息 -->
          <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg">
            <h3 class="text-xl font-bold mb-4 text-white">{{ t('settings.versionInfo') }}</h3>
            <div class="space-y-2 text-sm text-slate-400">
              <p><strong class="text-white">{{ t('settings.version') }}：</strong>2.0.0</p>
              <p><strong class="text-white">{{ t('settings.buildDate') }}：</strong>2026-01</p>
              <p><strong class="text-white">{{ t('settings.techStack') }}：</strong>Angular 19 + Electron + Python</p>
              <p><strong class="text-white">{{ t('settings.animationMode') }}：</strong>{{ animationConfig.animationType() }}</p>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class SettingsViewComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  public i18n = inject(I18nService);
  public membershipService = inject(MembershipService);
  public settings = inject(SettingsService);
  public backup = inject(BackupService);
  public scheduler = inject(SchedulerService);
  public animationConfig = inject(AnimationConfigService);
  private onboardingTours = inject(OnboardingService);
  private toast = inject(ToastService);

  activeTab = signal<SettingsTab>('appearance');
  supportedLocales = SUPPORTED_LOCALES;
  private routeSub?: { unsubscribe: () => void };

  /** P7-4: 最近套用的設置類型（'theme' | 'language' | ''），顯示短暫確認提示 */
  settingApplied = signal('');
  private _settingTimer?: ReturnType<typeof setTimeout>;
  private _flashSetting(key: string): void {
    this.settingApplied.set(key);
    clearTimeout(this._settingTimer);
    this._settingTimer = setTimeout(() => this.settingApplied.set(''), 2500);
  }

  ngOnInit(): void {
    this.settings.loadSettings();
    this.syncTabFromRoute();
    this.routeSub = this.route.queryParams.subscribe(() => this.syncTabFromRoute());
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    clearTimeout(this._settingTimer); // P7-4
  }

  private syncTabFromRoute(): void {
    const tab = this.route.snapshot.queryParams['tab'] as string | undefined;
    const valid: SettingsTab[] = ['appearance', 'notifications', 'help', 'backup', 'scheduler', 'about'];
    if (tab && valid.includes(tab as SettingsTab)) {
      this.activeTab.set(tab as SettingsTab);
      if (tab === 'backup') this.loadBackups();
      if (tab === 'scheduler') this.loadSchedulerStatus();
    }
  }

  setTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  openOnboarding(): void {
    window.dispatchEvent(new CustomEvent('tg-open-onboarding'));
  }

  /** 重置頁面 spotlight 導覽進度，下次進入關鍵頁重新播放 */
  replayPageTours(): void {
    this.onboardingTours.resetAll();
    this.toast.success('頁面導覽已重置，進入監控中心即可重看');
    this.refreshJourney();
  }

  // ═══════════ 上手旅程回顧（本機漏斗埋點數據） ═══════════

  /** localStorage funnel_steps_done 快照（刷新按鈕/導覽重置時重讀） */
  private journeyRaw = signal<Record<string, number>>(this.readJourneyRaw());

  private readJourneyRaw(): Record<string, number> {
    try {
      return JSON.parse(localStorage.getItem('funnel_steps_done') || '{}');
    } catch {
      return {};
    }
  }

  refreshJourney(): void {
    this.journeyRaw.set(this.readJourneyRaw());
  }

  /** 5 步時間線（標籤復用 dashboardSetup 語言包鍵，與儀表板一致） */
  journeySteps = computed(() => {
    const raw = this.journeyRaw();
    return (['account', 'groups', 'keywords', 'rules', 'monitor'] as const).map(id => ({
      id,
      label: this.t(`dashboardSetup.steps.${id}.label`),
      doneAt: raw[id] ? new Date(raw[id]) : null
    }));
  });

  journeyDoneCount = computed(() => this.journeySteps().filter(s => s.doneAt).length);

  /** 第一步完成到全部跑通的耗時；未跑通為 null */
  journeyTotalMs = computed(() => {
    const raw = this.journeyRaw();
    if (!raw['__all__']) return null;
    const times = this.journeySteps().map(s => s.doneAt?.getTime()).filter((v): v is number => !!v);
    if (times.length < 5) return null;
    return raw['__all__'] - Math.min(...times);
  });

  /** 監控中心 spotlight 導覽狀態 */
  tourStatus = computed(() => {
    // journeyRaw 變化（刷新/重置）時一併重算
    this.journeyRaw();
    const p = this.onboardingTours.getProgress('monitoring-flow');
    if (!p) return { label: '尚未觸發', tone: 'muted' as const };
    if (p.completed) return { label: '已完成', tone: 'success' as const };
    if (p.skipped) return { label: `在第 ${p.currentStep + 1} 步跳過`, tone: 'muted' as const };
    return { label: '進行中', tone: 'muted' as const };
  });

  formatDuration(ms: number): string {
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return '不到 1 分鐘';
    if (mins < 60) return `${mins} 分鐘`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} 小時 ${mins % 60} 分鐘`;
    const days = Math.floor(hrs / 24);
    return `${days} 天 ${hrs % 24} 小時`;
  }
  
  // 翻譯方法
  t(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
  
  // 主題設置
  setTheme(theme: 'dark' | 'light' | 'system'): void {
    this.settings.setTheme(theme);
    this._flashSetting('theme'); // P7-4
  }
  
  // 語言切換
  onLocaleChange(event: Event): void {
    const locale = (event.target as HTMLSelectElement).value as SupportedLocale;
    this.i18n.setLocale(locale);
    this.settings.setLanguage(locale as any);
    this._flashSetting('language'); // P7-4
  }
  
  // 備份操作
  loadBackups(): void {
    this.backup.loadBackups();
  }
  
  createBackup(): void {
    this.backup.createBackup();
  }
  
  restoreBackup(id: string): void {
    this.backup.restoreBackup(id);
  }
  
  deleteBackup(id: string): void {
    this.backup.deleteBackup(id);
  }
  
  // 調度器操作
  loadSchedulerStatus(): void {
    this.scheduler.loadStatus();
  }
  
  startScheduler(): void {
    this.scheduler.start();
  }
  
  stopScheduler(): void {
    this.scheduler.stop();
  }
  
  runTask(taskName: string): void {
    this.scheduler.runTask(taskName);
  }
  
  // 會員信息
  getMembershipIcon(): string {
    const tier = this.membershipService.level();
    const icons: Record<string, string> = {
      'free': '🆓', 'silver': '🥈', 'gold': '🥇',
      'diamond': '💎', 'star': '🌟', 'king': '👑'
    };
    return icons[tier] || '🆓';
  }
  
  getMembershipName(): string {
    const tier = this.membershipService.level();
    const names: Record<string, string> = {
      'free': '免費體驗版', 'silver': '銀牌會員', 'gold': '黃金大師',
      'diamond': '鑽石精英', 'star': '至尊星耀', 'king': '終極王者'
    };
    return names[tier] || '免費體驗版';
  }
}
