/**
 * Settings View Component
 * 設置視圖組件 - 完整版
 * 
 * 🆕 Phase 27: 完善為獨立視圖組件，使用服務
 */
import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService, SupportedLocale, SUPPORTED_LOCALES } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { AnimationSelectorComponent } from '../components/animation-selector.component';
import { 
  SettingsService, 
  BackupService, 
  SchedulerService,
  AnimationConfigService 
} from '../services';

@Component({
  selector: 'app-settings-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, AnimationSelectorComponent],
  template: `
    <div class="max-w-6xl mx-auto p-6">
      <h2 class="text-4xl font-bold mb-8 text-white">{{ t('settingsTitle') }}</h2>
      
      <!-- 設置標籤 -->
      <div class="flex gap-2 mb-6 bg-slate-800/50 p-1 rounded-lg w-fit">
        <button (click)="activeTab.set('appearance')" 
                [class]="activeTab() === 'appearance' ? 'bg-slate-700 shadow' : 'text-slate-500 hover:text-white'"
                class="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm">
          ✨ 外觀設置
        </button>
        <button (click)="activeTab.set('backup'); loadBackups()" 
                [class]="activeTab() === 'backup' ? 'bg-slate-700 shadow' : 'text-slate-500 hover:text-white'"
                class="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm">
          💾 備份管理
        </button>
        <button (click)="activeTab.set('scheduler'); loadSchedulerStatus()" 
                [class]="activeTab() === 'scheduler' ? 'bg-slate-700 shadow' : 'text-slate-500 hover:text-white'"
                class="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm">
          ⏰ 任務調度
        </button>
        <button (click)="activeTab.set('about')" 
                [class]="activeTab() === 'about' ? 'bg-slate-700 shadow' : 'text-slate-500 hover:text-white'"
                class="px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm">
          ℹ️ 關於
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
            <h3 class="text-lg font-semibold text-white">主題設置</h3>
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
                <span class="text-sm font-medium text-white">深色主題</span>
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
                <span class="text-sm font-medium text-white">淺色主題</span>
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
                <span class="text-sm font-medium text-white">跟隨系統</span>
              </div>
            </button>
          </div>
        </div>
        
        <!-- 語言設置 -->
        <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg">
          <div class="flex items-center gap-2 mb-4">
            <span class="text-xl">🌐</span>
            <h3 class="text-lg font-semibold text-white">語言設置</h3>
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
      
      <!-- 備份管理標籤 -->
      @if (activeTab() === 'backup') {
        <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-semibold flex items-center gap-2 text-white">
              💾 備份管理
            </h3>
            <div class="flex gap-2">
              <button (click)="createBackup()" 
                      [disabled]="backup.isCreating()"
                      class="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg disabled:opacity-50">
                {{ backup.isCreating() ? '創建中...' : '創建備份' }}
              </button>
              <button (click)="loadBackups()" 
                      class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">
                刷新
              </button>
            </div>
          </div>
          
          @if (backup.backups().length > 0) {
            <div class="border border-slate-600 rounded-lg overflow-hidden">
              <table class="w-full text-sm">
                <thead class="bg-slate-800/50">
                  <tr>
                    <th class="text-left p-3 text-slate-300">備份名稱</th>
                    <th class="text-left p-3 text-slate-300">創建時間</th>
                    <th class="text-left p-3 text-slate-300">大小</th>
                    <th class="text-right p-3 text-slate-300">操作</th>
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
                          恢復
                        </button>
                        <button (click)="deleteBackup(b.id)" 
                                class="text-red-400 hover:text-red-300 text-xs px-2 py-1">
                          刪除
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="text-slate-400 text-center py-8">暫無備份</p>
          }
        </div>
      }
      
      <!-- 任務調度標籤 -->
      @if (activeTab() === 'scheduler') {
        <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-xl font-semibold flex items-center gap-2 text-white">
              ⏰ 任務調度
            </h3>
            <div class="flex gap-2">
              @if (scheduler.isRunning()) {
                <button (click)="stopScheduler()" 
                        class="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg">
                  ⏹️ 停止
                </button>
              } @else {
                <button (click)="startScheduler()" 
                        class="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg">
                  ▶️ 啟動
                </button>
              }
              <button (click)="loadSchedulerStatus()" 
                      class="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg">
                🔄 刷新
              </button>
            </div>
          </div>
          
          <!-- 狀態概覽 -->
          <div class="grid grid-cols-4 gap-4 mb-6">
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div class="text-sm text-slate-500">狀態</div>
              <div class="text-xl font-bold" 
                   [class.text-green-400]="scheduler.isRunning()"
                   [class.text-slate-400]="!scheduler.isRunning()">
                {{ scheduler.isRunning() ? '運行中' : '已停止' }}
              </div>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div class="text-sm text-slate-500">運行時間</div>
              <div class="text-xl font-bold text-cyan-400">{{ scheduler.uptimeFormatted() }}</div>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div class="text-sm text-slate-500">總任務</div>
              <div class="text-xl font-bold text-blue-400">{{ scheduler.status().totalTasks }}</div>
            </div>
            <div class="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div class="text-sm text-slate-500">活躍任務</div>
              <div class="text-xl font-bold text-purple-400">{{ scheduler.status().activeTasks }}</div>
            </div>
          </div>
          
          <!-- 任務列表 -->
          @if (scheduler.tasks().length > 0) {
            <div class="border border-slate-600 rounded-lg overflow-hidden">
              <table class="w-full text-sm">
                <thead class="bg-slate-800/50">
                  <tr>
                    <th class="text-left p-3 text-slate-300">任務名稱</th>
                    <th class="text-left p-3 text-slate-300">間隔</th>
                    <th class="text-left p-3 text-slate-300">上次執行</th>
                    <th class="text-left p-3 text-slate-300">狀態</th>
                    <th class="text-right p-3 text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody>
                  @for (task of scheduler.tasks(); track task.name) {
                    <tr class="border-t border-slate-600 hover:bg-slate-800/50">
                      <td class="p-3 font-semibold text-white">{{ task.name }}</td>
                      <td class="p-3 text-slate-400">{{ scheduler.formatInterval(task.interval) }}</td>
                      <td class="p-3 text-slate-400">{{ task.lastRun || '從未' }}</td>
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
                          執行
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="text-slate-400 text-center py-8">暫無調度任務</p>
          }
        </div>
      }
      
      <!-- 關於標籤 -->
      @if (activeTab() === 'about') {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 會員信息 -->
          <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg">
            <h3 class="text-xl font-bold mb-4 text-white">會員信息</h3>
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center text-3xl">
                {{ getMembershipIcon() }}
              </div>
              <div>
                <p class="font-bold text-lg text-white">{{ getMembershipName() }}</p>
                <p class="text-sm text-slate-400">
                  @if (membershipService.expiresAt()) {
                    有效期至: {{ membershipService.expiresAt() | date:'yyyy-MM-dd' }}
                  } @else {
                    永久有效
                  }
                </p>
              </div>
            </div>
          </div>
          
          <!-- 版本信息 -->
          <div class="bg-slate-900/50 backdrop-blur-sm border border-slate-700 p-6 rounded-xl shadow-lg">
            <h3 class="text-xl font-bold mb-4 text-white">版本信息</h3>
            <div class="space-y-2 text-sm text-slate-400">
              <p><strong class="text-white">版本：</strong>2.0.0</p>
              <p><strong class="text-white">構建日期：</strong>2026-01</p>
              <p><strong class="text-white">技術棧：</strong>Angular 19 + Electron + Python</p>
              <p><strong class="text-white">動畫模式：</strong>{{ animationConfig.animationType() }}</p>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class SettingsViewComponent implements OnInit {
  // 服務注入
  public i18n = inject(I18nService);
  public membershipService = inject(MembershipService);
  public settings = inject(SettingsService);
  public backup = inject(BackupService);
  public scheduler = inject(SchedulerService);
  public animationConfig = inject(AnimationConfigService);
  
  // 狀態
  activeTab = signal<'appearance' | 'backup' | 'scheduler' | 'about'>('appearance');
  supportedLocales = SUPPORTED_LOCALES;
  
  ngOnInit(): void {
    this.settings.loadSettings();
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
