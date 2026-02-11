/**
 * Settings View Component
 * 設置視圖組件 - 完整版
 *
 * 🆕 側欄優化：通知與提醒、使用幫助、語言與外觀統一在此；支持 ?tab= 深鏈
 */
import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
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

  activeTab = signal<SettingsTab>('appearance');
  supportedLocales = SUPPORTED_LOCALES;
  private routeSub?: { unsubscribe: () => void };

  ngOnInit(): void {
    this.settings.loadSettings();
    this.syncTabFromRoute();
    this.routeSub = this.route.queryParams.subscribe(() => this.syncTabFromRoute());
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
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
  
  // 翻譯方法
  t(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
  
  // 主題設置
  setTheme(theme: 'dark' | 'light' | 'system'): void {
    this.settings.setTheme(theme);
  }
  
  // 語言切換
  onLocaleChange(event: Event): void {
    const locale = (event.target as HTMLSelectElement).value as SupportedLocale;
    this.i18n.setLocale(locale);
    this.settings.setLanguage(locale as any);
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
