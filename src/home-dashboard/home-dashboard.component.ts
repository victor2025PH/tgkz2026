/**
 * 首頁儀表盤 - 情景感知首頁
 * Home Dashboard - Situational Awareness
 *
 * 展示今日重要狀態、需關注項目和快捷操作
 */
import {
  Component, OnInit, OnDestroy, inject, signal, computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ElectronIpcService } from '../electron-ipc.service';
import { AICenterService } from '../ai-center/ai-center.service';
import { TelegramAccount } from '../models';

interface AccountSummary {
  total: number;
  online: number;
  disconnected: number;
}

interface AttentionItem {
  type: 'error' | 'warning' | 'info';
  icon: string;
  title: string;
  desc: string;
  action?: string;
  actionView?: string;
}

interface QuickAction {
  icon: string;
  label: string;
  desc: string;
  view: string;
  color: string;
  badge?: string;
}

@Component({
  selector: 'app-home-dashboard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="home-dashboard h-full overflow-y-auto bg-slate-900 text-white">
  <div class="max-w-6xl mx-auto p-6 space-y-6">

    <!-- ══════════════════ Header ══════════════════ -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-white flex items-center gap-3">
          <span class="text-3xl">{{ greetingEmoji() }}</span>
          <span>{{ greeting() }}</span>
        </h1>
        <p class="text-slate-400 text-sm mt-1">{{ todayStr() }}</p>
      </div>
      <button (click)="refresh()"
              class="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700
                     border border-slate-700 rounded-xl text-sm text-slate-300 transition-colors">
        <span [class.animate-spin]="loading()">🔄</span>
        <span>{{ loading() ? '載入中...' : '刷新' }}</span>
      </button>
    </div>

    <!-- ══════════════════ System Status Bar ══════════════════ -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <!-- 帳號狀態 -->
      <div class="status-card p-4 rounded-xl border"
           [class]="accountSummary().online > 0
             ? 'bg-emerald-500/10 border-emerald-500/30'
             : 'bg-red-500/10 border-red-500/30'">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
               [class]="accountSummary().online > 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'">
            📱
          </div>
          <div>
            <div class="text-xs text-slate-400">Telegram 帳號</div>
            <div class="font-bold text-lg"
                 [class]="accountSummary().online > 0 ? 'text-emerald-400' : 'text-red-400'">
              {{ accountSummary().online }}/{{ accountSummary().total }}
            </div>
            <div class="text-xs text-slate-500">在線</div>
          </div>
        </div>
      </div>

      <!-- AI 狀態 -->
      <div class="status-card p-4 rounded-xl border"
           [class]="aiStatusClass()">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
               [class]="aiStatusIconClass()">
            🧠
          </div>
          <div>
            <div class="text-xs text-slate-400">AI 引擎</div>
            <div class="font-bold text-sm" [class]="aiStatusTextClass()">
              {{ aiStatusLabel() }}
            </div>
            @if (aiService.defaultModel()) {
              <div class="text-xs text-slate-500 truncate max-w-20">
                {{ aiService.defaultModel()!.modelName }}
              </div>
            }
          </div>
        </div>
      </div>

      <!-- 監控狀態 -->
      <div class="status-card p-4 rounded-xl border"
           [class]="monitoringCount() > 0
             ? 'bg-cyan-500/10 border-cyan-500/30'
             : 'bg-slate-700/30 border-slate-600/30'">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
               [class]="monitoringCount() > 0 ? 'bg-cyan-500/20' : 'bg-slate-700/30'">
            📡
          </div>
          <div>
            <div class="text-xs text-slate-400">監控群組</div>
            <div class="font-bold text-lg"
                 [class]="monitoringCount() > 0 ? 'text-cyan-400' : 'text-slate-400'">
              {{ monitoringCount() }}
            </div>
            <div class="text-xs text-slate-500">正在監控</div>
          </div>
        </div>
      </div>

      <!-- 觸發規則狀態 -->
      <div class="status-card p-4 rounded-xl border"
           [class]="activeRulesCount() > 0
             ? 'bg-amber-500/10 border-amber-500/30'
             : 'bg-slate-700/30 border-slate-600/30'">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
               [class]="activeRulesCount() > 0 ? 'bg-amber-500/20' : 'bg-slate-700/30'">
            ⚡
          </div>
          <div>
            <div class="text-xs text-slate-400">觸發規則</div>
            <div class="font-bold text-lg"
                 [class]="activeRulesCount() > 0 ? 'text-amber-400' : 'text-slate-400'">
              {{ activeRulesCount() }}/{{ totalRulesCount() }}
            </div>
            <div class="text-xs text-slate-500">啟用</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════ Needs Attention ══════════════════ -->
    @if (attentionItems().length > 0) {
      <div>
        <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span>⚠️</span> 需要關注
        </h2>
        <div class="space-y-2">
          @for (item of attentionItems(); track item.title) {
            <div class="flex items-start gap-4 p-4 rounded-xl border transition-all"
                 [class]="item.type === 'error'
                   ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15'
                   : item.type === 'warning'
                   ? 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15'
                   : 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15'">
              <span class="text-2xl flex-shrink-0 mt-0.5">{{ item.icon }}</span>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-white text-sm">{{ item.title }}</div>
                <div class="text-slate-400 text-xs mt-0.5">{{ item.desc }}</div>
              </div>
              @if (item.action && item.actionView) {
                <button (click)="navigate(item.actionView)"
                        class="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                        [class]="item.type === 'error'
                          ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300'
                          : item.type === 'warning'
                          ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                          : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300'">
                  {{ item.action }} →
                </button>
              }
            </div>
          }
        </div>
      </div>
    }

    <!-- ══════════════════ Two Columns: Today + Quick Actions ══════════════════ -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

      <!-- 今日 AI 運作 -->
      <div class="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
        <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>🤖</span> AI 今日為您處理
        </h2>
        <div class="space-y-3">
          <div class="flex items-center justify-between py-2 border-b border-slate-700/50">
            <div class="flex items-center gap-3">
              <span class="text-lg">💬</span>
              <span class="text-sm text-slate-300">自動回覆</span>
            </div>
            <div class="text-right">
              <span class="font-bold text-white">{{ todayStats().autoReplies }}</span>
              <span class="text-slate-500 text-xs ml-1">條</span>
            </div>
          </div>
          <div class="flex items-center justify-between py-2 border-b border-slate-700/50">
            <div class="flex items-center gap-3">
              <span class="text-lg">🎯</span>
              <span class="text-sm text-slate-300">觸發規則</span>
            </div>
            <div class="text-right">
              <span class="font-bold text-white">{{ todayStats().rulesFired }}</span>
              <span class="text-slate-500 text-xs ml-1">次</span>
            </div>
          </div>
          <div class="flex items-center justify-between py-2 border-b border-slate-700/50">
            <div class="flex items-center gap-3">
              <span class="text-lg">👤</span>
              <span class="text-sm text-slate-300">新採集用戶</span>
            </div>
            <div class="text-right">
              <span class="font-bold text-white">{{ todayStats().capturedUsers }}</span>
              <span class="text-slate-500 text-xs ml-1">人</span>
            </div>
          </div>
          <div class="flex items-center justify-between py-2">
            <div class="flex items-center gap-3">
              <span class="text-lg">📤</span>
              <span class="text-sm text-slate-300">已發送消息</span>
            </div>
            <div class="text-right">
              <span class="font-bold text-white">{{ todayStats().messagesSent }}</span>
              <span class="text-slate-500 text-xs ml-1">條</span>
            </div>
          </div>
        </div>

        @if (!aiService.isConnected() && !aiService.isLoading()) {
          <div class="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <p class="text-amber-400 text-xs">⚠️ AI 未連接，以上數據來自本地記錄</p>
            <button (click)="navigate('ai-engine')"
                    class="mt-2 text-xs text-amber-300 underline hover:text-amber-200">
              前往配置 AI →
            </button>
          </div>
        }
      </div>

      <!-- 快捷操作 -->
      <div class="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
        <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>⚡</span> 快捷操作
        </h2>
        <div class="grid grid-cols-2 gap-2">
          @for (action of quickActions; track action.view) {
            <button (click)="navigate(action.view)"
                    class="group flex flex-col items-center gap-2 p-3 rounded-xl border transition-all
                           bg-slate-700/30 hover:bg-slate-700/60 border-slate-600/40 hover:border-slate-500/60
                           text-center relative overflow-hidden">
              <span class="text-2xl">{{ action.icon }}</span>
              <div>
                <div class="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors">
                  {{ action.label }}
                </div>
                <div class="text-xs text-slate-500">{{ action.desc }}</div>
              </div>
              @if (action.badge) {
                <span class="absolute top-2 right-2 text-xs px-1.5 py-0.5 rounded-full
                             bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  {{ action.badge }}
                </span>
              }
            </button>
          }
        </div>
      </div>
    </div>

    <!-- ══════════════════ P4-1: 任務啟動器 ══════════════════ -->
    <div class="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <span>🚀</span> 快速啟動行銷場景
        </h2>
        <button (click)="navigate('campaigns')"
                class="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
          查看所有任務 →
        </button>
      </div>

      @if (activeCampaignCount() > 0) {
        <!-- 有活躍任務時展示 -->
        <div class="mb-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-xl animate-pulse">⚡</span>
            <div>
              <span class="text-cyan-300 font-medium text-sm">{{ activeCampaignCount() }} 個任務執行中</span>
              <p class="text-xs text-slate-400 mt-0.5">今日已觸達 {{ campaignStats().contacted }} 人，轉化 {{ campaignStats().converted }} 人</p>
            </div>
          </div>
          <button (click)="navigate('multi-role')"
                  class="px-3 py-1.5 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg transition-colors">
            查看進度
          </button>
        </div>
      }

      <!-- 3大場景快速入口 -->
      <div class="grid grid-cols-3 gap-3">
        <button (click)="navigate('campaigns')"
                class="group flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-600/40
                       bg-gradient-to-b from-purple-500/10 to-slate-700/20
                       hover:from-purple-500/20 hover:border-purple-500/40 transition-all text-center">
          <span class="text-2xl group-hover:scale-110 transition-transform">📢</span>
          <div>
            <div class="text-xs font-semibold text-white group-hover:text-purple-300">群廣播</div>
            <div class="text-[10px] text-slate-500 mt-0.5">向所有監控群發送</div>
          </div>
          @if (monitoringCount() > 0) {
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
              {{ monitoringCount() }} 群
            </span>
          }
        </button>

        <button (click)="navigate('lead-nurturing')"
                class="group flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-600/40
                       bg-gradient-to-b from-pink-500/10 to-slate-700/20
                       hover:from-pink-500/20 hover:border-pink-500/40 transition-all text-center">
          <span class="text-2xl group-hover:scale-110 transition-transform">💌</span>
          <div>
            <div class="text-xs font-semibold text-white group-hover:text-pink-300">線索培育</div>
            <div class="text-[10px] text-slate-500 mt-0.5">私信跟進潛在客戶</div>
          </div>
          @if (totalLeadsCount() > 0) {
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30">
              {{ totalLeadsCount() }} 線索
            </span>
          }
        </button>

        <button (click)="navigate('trigger-rules')"
                class="group flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-600/40
                       bg-gradient-to-b from-amber-500/10 to-slate-700/20
                       hover:from-amber-500/20 hover:border-amber-500/40 transition-all text-center">
          <span class="text-2xl group-hover:scale-110 transition-transform">⏰</span>
          <div>
            <div class="text-xs font-semibold text-white group-hover:text-amber-300">自動觸發</div>
            <div class="text-[10px] text-slate-500 mt-0.5">規則驅動定時回覆</div>
          </div>
          @if (activeRulesCount() > 0) {
            <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {{ activeRulesCount() }} 規則
            </span>
          }
        </button>
      </div>
    </div>

    <!-- ══════════════════ Lead Journey Funnel ══════════════════ -->
    @if (hasFunnelData()) {
      <div class="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <span>🔽</span> 線索旅程分布
          </h2>
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-500">總轉化率</span>
            <span class="text-sm font-bold text-emerald-400">{{ overallConversionRate() }}%</span>
            <button (click)="navigate('lead-nurturing')"
                    class="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
              查看看板 →
            </button>
          </div>
        </div>

        <!-- 漏斗條形圖 -->
        <div class="space-y-2">
          @for (stage of funnelStages(); track stage.key) {
            <div class="flex items-center gap-3">
              <div class="w-20 text-right text-xs flex-shrink-0">
                <span [class]="stage.textClass">{{ stage.icon }} {{ stage.label }}</span>
              </div>
              <div class="flex-1 relative h-7 bg-slate-700/50 rounded-lg overflow-hidden">
                <div class="absolute inset-y-0 left-0 rounded-lg transition-all duration-700 flex items-center"
                     [class]="stage.barClass"
                     [style.width.%]="stage.pct">
                </div>
                <div class="absolute inset-0 flex items-center px-3 justify-between">
                  <span class="text-xs font-bold text-white mix-blend-luminosity">
                    {{ stage.count }} 人
                  </span>
                  <span class="text-xs text-white/70">{{ stage.pct }}%</span>
                </div>
              </div>
              @if (stage.dropRate !== null && stage.dropRate > 0) {
                <div class="w-16 text-xs text-right flex-shrink-0"
                     [class.text-red-400]="stage.dropRate > 60"
                     [class.text-amber-400]="stage.dropRate > 30 && stage.dropRate <= 60"
                     [class.text-slate-500]="stage.dropRate <= 30">
                  ↓{{ stage.dropRate }}%
                </div>
              } @else {
                <div class="w-16"></div>
              }
            </div>
          }
        </div>

        <!-- 底部說明 -->
        <div class="flex items-center gap-4 mt-4 pt-3 border-t border-slate-700/50">
          <span class="text-xs text-slate-500">↓ 表示從上一階段的流失率</span>
          <button (click)="navigate('analytics-center')"
                  class="ml-auto text-xs text-slate-500 hover:text-slate-300 transition-colors">
            查看詳細報告 →
          </button>
        </div>
      </div>
    }

    <!-- ══════════════════ Workflow Guide (first-time / low engagement) ══════════════════ -->
    @if (showWorkflowGuide()) {
      <div class="bg-gradient-to-r from-indigo-900/40 to-purple-900/40
                  border border-indigo-500/30 rounded-2xl p-6">
        <div class="flex items-start justify-between mb-4">
          <div>
            <h2 class="font-semibold text-white flex items-center gap-2">
              <span>🚀</span> 開始您的 AI 自動化之旅
            </h2>
            <p class="text-slate-400 text-sm mt-1">三步設置，讓 AI 24小時為您工作</p>
          </div>
          <button (click)="dismissGuide()"
                  class="text-slate-500 hover:text-slate-300 transition-colors text-lg">✕</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          @for (step of workflowSteps(); track step.num) {
            <div class="flex items-start gap-3 p-4 rounded-xl"
                 [class]="step.done
                   ? 'bg-emerald-500/10 border border-emerald-500/20'
                   : 'bg-slate-700/40 border border-slate-600/30'">
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                   [class]="step.done ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'">
                {{ step.done ? '✓' : step.num }}
              </div>
              <div>
                <div class="font-medium text-sm" [class]="step.done ? 'text-emerald-300' : 'text-white'">
                  {{ step.title }}
                </div>
                <div class="text-xs text-slate-400 mt-0.5">{{ step.desc }}</div>
                @if (!step.done) {
                  <button (click)="navigate(step.view)"
                          class="mt-2 text-xs text-cyan-400 hover:text-cyan-300 underline transition-colors">
                    前往設置 →
                  </button>
                }
              </div>
            </div>
          }
        </div>
      </div>
    }

  </div>
</div>
  `,
  styles: [`
    .home-dashboard {
      scrollbar-width: thin;
      scrollbar-color: #334155 transparent;
    }
    .status-card {
      transition: all 0.2s ease;
    }
    .status-card:hover {
      transform: translateY(-1px);
    }
  `]
})
export class HomeDashboardComponent implements OnInit, OnDestroy {
  readonly aiService = inject(AICenterService);
  private ipc = inject(ElectronIpcService);

  loading = signal(true);
  accountSummary = signal<AccountSummary>({ total: 0, online: 0, disconnected: 0 });
  monitoringCount = signal(0);
  activeRulesCount = signal(0);
  totalRulesCount = signal(0);
  todayStats = signal({ autoReplies: 0, rulesFired: 0, capturedUsers: 0, messagesSent: 0 });

  // 🆕 Phase 3: 線索旅程數據
  contactStageMap = signal<Record<string, number>>({});
  _showGuide = signal(true);

  // 🆕 P4-1: 行銷任務數據
  activeCampaignCount = signal(0);
  campaignStats = signal({ contacted: 0, converted: 0 });
  totalLeadsCount = computed(() => Object.values(this.contactStageMap()).reduce((s, v) => s + v, 0));

  private cleanups: Array<() => void> = [];

  // ── Greeting ──────────────────────────────────────────────
  greeting = computed(() => {
    const h = new Date().getHours();
    if (h < 6) return '夜深了，注意休息';
    if (h < 12) return '早上好，今天也要加油！';
    if (h < 14) return '午安，工作順利！';
    if (h < 18) return '下午好，繼續努力！';
    return '晚上好，今天辛苦了！';
  });

  greetingEmoji = computed(() => {
    const h = new Date().getHours();
    if (h < 6) return '🌙';
    if (h < 12) return '☀️';
    if (h < 18) return '🌤️';
    return '🌆';
  });

  todayStr = computed(() => {
    return new Date().toLocaleDateString('zh-TW', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });
  });

  // ── AI Status ─────────────────────────────────────────────
  aiStatusLabel = computed(() => {
    if (this.aiService.isLoading()) return '載入中...';
    if (this.aiService.isConnected()) {
      const m = this.aiService.defaultModel();
      return m?.latencyMs ? `已就緒 · ${m.latencyMs}ms` : '已就緒';
    }
    if (this.aiService.hasStaleConnections()) return '需重新驗證';
    if (this.aiService.isConfigured()) return '已配置 (未測試)';
    return '未配置';
  });

  aiStatusClass = computed(() => {
    if (this.aiService.isConnected()) return 'bg-emerald-500/10 border-emerald-500/30';
    if (this.aiService.hasStaleConnections()) return 'bg-amber-500/10 border-amber-500/30';
    if (this.aiService.isConfigured()) return 'bg-orange-500/10 border-orange-500/30';
    return 'bg-slate-700/30 border-slate-600/30';
  });

  aiStatusIconClass = computed(() => {
    if (this.aiService.isConnected()) return 'bg-emerald-500/20';
    if (this.aiService.hasStaleConnections()) return 'bg-amber-500/20';
    if (this.aiService.isConfigured()) return 'bg-orange-500/20';
    return 'bg-slate-700/30';
  });

  aiStatusTextClass = computed(() => {
    if (this.aiService.isConnected()) return 'text-emerald-400';
    if (this.aiService.hasStaleConnections()) return 'text-amber-400';
    if (this.aiService.isConfigured()) return 'text-orange-400';
    return 'text-slate-400';
  });

  // ── Lead Journey Funnel ───────────────────────────────────
  funnelStages = computed(() => {
    const m = this.contactStageMap();
    const stages = [
      { key: 'new',         label: '新線索', icon: '🌱', barClass: 'bg-cyan-500/70',    textClass: 'text-cyan-400'    },
      { key: 'contacted',   label: '已接觸', icon: '💬', barClass: 'bg-purple-500/70',  textClass: 'text-purple-400'  },
      { key: 'interested',  label: '有意向', icon: '🎯', barClass: 'bg-amber-500/70',   textClass: 'text-amber-400'   },
      { key: 'negotiating', label: '談判中', icon: '🤝', barClass: 'bg-pink-500/70',    textClass: 'text-pink-400'    },
      { key: 'converted',   label: '已轉化', icon: '✅', barClass: 'bg-emerald-500/70', textClass: 'text-emerald-400' },
    ];
    const total = stages.reduce((s, st) => s + (m[st.key] ?? 0), 0) || 1;
    return stages.map((st, i) => {
      const count = m[st.key] ?? 0;
      const prev = i === 0 ? total : (m[stages[i - 1].key] ?? 0);
      const dropRate = i > 0 && prev > 0 ? Math.round((1 - count / prev) * 100) : null;
      return { ...st, count, pct: Math.round(count / total * 100), dropRate };
    });
  });

  hasFunnelData = computed(() => this.funnelStages().some(s => s.count > 0));

  overallConversionRate = computed(() => {
    const m = this.contactStageMap();
    const total = Object.values(m).reduce((s, v) => s + v, 0);
    if (total === 0) return 0;
    return Math.round((m['converted'] ?? 0) / total * 100);
  });

  // ── Needs Attention ───────────────────────────────────────
  attentionItems = computed<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    const acct = this.accountSummary();

    if (acct.total === 0) {
      items.push({
        type: 'error',
        icon: '📱',
        title: '尚未添加 Telegram 帳號',
        desc: '添加帳號後才能開始監控群組和發送消息',
        action: '前往添加',
        actionView: 'accounts'
      });
    } else if (acct.online === 0) {
      items.push({
        type: 'error',
        icon: '🔴',
        title: `${acct.total} 個帳號全部離線`,
        desc: '請檢查帳號狀態，點擊一鍵登入恢復連接',
        action: '帳號管理',
        actionView: 'accounts'
      });
    } else if (acct.disconnected > 0) {
      items.push({
        type: 'warning',
        icon: '⚠️',
        title: `${acct.disconnected} 個帳號已斷線`,
        desc: '部分帳號連接異常，可能影響消息接收',
        action: '查看帳號',
        actionView: 'accounts'
      });
    }

    if (!this.aiService.isLoading()) {
      if (!this.aiService.isConfigured()) {
        items.push({
          type: 'warning',
          icon: '🧠',
          title: '未配置 AI 模型',
          desc: '配置 AI 模型後可開啟自動回覆和智能分析功能',
          action: '配置 AI',
          actionView: 'ai-engine'
        });
      } else if (!this.aiService.isConnected()) {
        items.push({
          type: 'warning',
          icon: '⚡',
          title: 'AI 模型連接待驗證',
          desc: this.aiService.hasStaleConnections()
            ? '上次驗證已超過30分鐘，請重新測試連接'
            : 'AI 模型尚未通過連接測試',
          action: '前往驗證',
          actionView: 'ai-engine'
        });
      }
    }

    if (acct.total > 0 && this.monitoringCount() === 0) {
      items.push({
        type: 'info',
        icon: '📡',
        title: '尚未設置監控群組',
        desc: '監控群組後 AI 可自動識別關鍵詞並觸發回覆',
        action: '設置監控',
        actionView: 'monitoring-groups'
      });
    }

    return items;
  });

  // ── Workflow Guide ────────────────────────────────────────
  showWorkflowGuide = computed(() => {
    return this._showGuide() && (
      this.accountSummary().total === 0 ||
      !this.aiService.isConfigured() ||
      this.monitoringCount() === 0
    );
  });

  workflowSteps = computed(() => [
    {
      num: 1,
      title: '添加 Telegram 帳號',
      desc: '連接您的 Telegram 帳號作為監控和發送賬戶',
      view: 'accounts',
      done: this.accountSummary().total > 0
    },
    {
      num: 2,
      title: '配置 AI 引擎',
      desc: '接入 AI 模型，讓系統具備智能回覆能力',
      view: 'ai-engine',
      done: this.aiService.isConnected()
    },
    {
      num: 3,
      title: '設置觸發規則',
      desc: '定義關鍵詞匹配後的自動響應行為',
      view: 'trigger-rules',
      done: this.activeRulesCount() > 0
    }
  ]);

  readonly quickActions: QuickAction[] = [
    {
      icon: '📤',
      label: '發送控制台',
      desc: '批量發送消息',
      view: 'leads',
      color: 'cyan'
    },
    {
      icon: '📡',
      label: '監控群組',
      desc: '查看群組動態',
      view: 'monitoring-groups',
      color: 'blue'
    },
    {
      icon: '⚡',
      label: '觸發規則',
      desc: '管理自動回覆',
      view: 'trigger-rules',
      color: 'amber'
    },
    {
      icon: '🌱',
      label: '線索管理',
      desc: '跟進潛在客戶',
      view: 'lead-nurturing',
      color: 'pink'
    },
    {
      icon: '🧠',
      label: 'AI 助手',
      desc: '配置智能引擎',
      view: 'ai-engine',
      color: 'purple'
    },
    {
      icon: '📊',
      label: '數據報告',
      desc: '查看分析數據',
      view: 'analytics-center',
      color: 'indigo'
    }
  ];

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.cleanups.forEach(fn => fn());
  }

  refresh() {
    this.loadData();
  }

  dismissGuide() {
    this._showGuide.set(false);
  }

  navigate(view: string) {
    window.dispatchEvent(new CustomEvent('changeView', { detail: view }));
  }

  private loadData() {
    this.loading.set(true);

    // Load accounts
    const cleanupAccounts = this.ipc.on('accounts-data', (rawAccounts: any[]) => {
      const accounts: any[] = rawAccounts || [];
      const total = accounts.length;
      const online = accounts.filter(a =>
        String(a.status) === 'connected' || String(a.status) === 'online' || a.isConnected
      ).length;
      const disconnected = accounts.filter(a =>
        String(a.status) === 'disconnected' || String(a.status) === 'error'
      ).length;
      this.accountSummary.set({ total, online, disconnected });
      this.loading.set(false);
    });
    this.cleanups.push(cleanupAccounts);

    this.ipc.send('get-accounts', {});

    // Load monitoring groups count
    const cleanupMonitoring = this.ipc.on('monitored-groups-data', (data: any) => {
      const groups = Array.isArray(data) ? data : (data?.groups ?? []);
      this.monitoringCount.set(groups.filter((g: any) => g.isActive || g.active).length);
    });
    this.cleanups.push(cleanupMonitoring);
    this.ipc.send('get-monitored-groups', {});

    // Load trigger rules count
    const cleanupRules = this.ipc.on('trigger-rules-data', (data: any) => {
      const rules = Array.isArray(data) ? data : (data?.rules ?? []);
      this.totalRulesCount.set(rules.length);
      this.activeRulesCount.set(rules.filter((r: any) => r.isEnabled || r.enabled).length);
    });
    this.cleanups.push(cleanupRules);
    this.ipc.send('get-trigger-rules', {});

    // Load today's stats
    const cleanupStats = this.ipc.on('today-stats-data', (data: any) => {
      if (data) {
        this.todayStats.set({
          autoReplies: data.autoReplies ?? data.auto_replies ?? 0,
          rulesFired: data.rulesFired ?? data.rules_fired ?? 0,
          capturedUsers: data.capturedUsers ?? data.captured_users ?? 0,
          messagesSent: data.messagesSent ?? data.messages_sent ?? 0
        });
      }
    });
    this.cleanups.push(cleanupStats);
    this.ipc.send('get-today-stats', {});

    // 🆕 P4-1: Load campaign / task overview
    const cleanupCampaigns = this.ipc.on('campaigns-data', (data: any) => {
      const list: any[] = Array.isArray(data) ? data : (data?.campaigns ?? []);
      const active = list.filter((c: any) => c.status === 'running' || c.status === 'scheduled');
      this.activeCampaignCount.set(active.length);
      const contacted = active.reduce((s: number, c: any) => s + (c.stats?.totalSent || c.stats?.contacted || 0), 0);
      const converted = active.reduce((s: number, c: any) => s + (c.stats?.successCount || c.stats?.converted || 0), 0);
      this.campaignStats.set({ contacted, converted });
    });
    this.cleanups.push(cleanupCampaigns);
    this.ipc.send('get-campaigns', {});

    // 🆕 Phase 3: Load contact stage distribution for funnel
    const cleanupContacts = this.ipc.on('unified-contacts-loaded', (data: any) => {
      const contacts: any[] = Array.isArray(data) ? data : (data?.contacts ?? []);
      const users = contacts.filter((c: any) => c.contact_type === 'user' || !c.contact_type);
      const stageMap: Record<string, number> = {};
      users.forEach((c: any) => {
        const st = c.status || 'new';
        stageMap[st] = (stageMap[st] ?? 0) + 1;
      });
      this.contactStageMap.set(stageMap);
    });
    this.cleanups.push(cleanupContacts);
    this.ipc.send('get-unified-contacts', { limit: 2000 });

    // Fallback: mark loading done after 3 seconds if IPC doesn't respond
    setTimeout(() => this.loading.set(false), 3000);
  }
}
