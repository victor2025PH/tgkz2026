/**
 * Dashboard View Component
 * 儀表板視圖組件 - 精益版
 *
 * 設計北極星：幫用戶跑通第一條獲客鏈路（關鍵詞觸發 → AI策劃 → 私聊培育 → 興趣建群 → 組群成交）
 * - 英雄區：5步上手進度環 + 「下一步」主CTA（全部狀態驅動，數據來自真實服務）
 * - 核心數據4卡：帳號在線 / 監控群組 / 觸發規則 / 監控狀態
 * - 獲客工作流5步：橫向鏈路，高亮當前階段
 * - 更多操作：默認折疊（快速操作面板 / 工作流控制 / 快速工作流）
 * - 無 smart/classic 模式切換（隨會員等級自動解鎖對應功能）
 */
import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../i18n.service';
import { MembershipService } from '../membership.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { AccountManagementService } from '../services/account-management.service';
import { NavBridgeService, LegacyView } from '../services/nav-bridge.service';
import { MonitoringManagementService } from '../services/monitoring-management.service';
import { AutomationWorkflowService } from '../services/automation-workflow.service';

// 子組件導入
import { QuickWorkflowComponent } from '../quick-workflow.component';
import { QuickActionsPanelComponent } from '../components/quick-actions-panel.component';

export interface SystemStatus {
  accounts?: { online: number; total: number; senders_online?: number; senders_total?: number };
  monitoring?: { groups: number; active: boolean };
  ai?: { enabled: boolean; mode?: string; canReply?: boolean };
  campaigns?: { active: number; total: number };
  triggerRules?: { active: number; total: number };
  keywords?: { sets: number };
  templates?: { active: number; total: number };
  warnings?: { code: string; message: string; fix?: string }[];
}

/** 上手步驟（狀態全部來自真實數據源） */
interface SetupStep {
  id: 'account' | 'groups' | 'keywords' | 'rules' | 'monitor';
  label: string;
  desc: string;
  done: boolean;
}

@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    QuickWorkflowComponent,
    QuickActionsPanelComponent
  ],
  template: `
    <div class="page-content">
      <!-- ═══════════ Header：標題 + 會員徽章 + 刷新 ═══════════ -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3 min-w-0">
          <h2 class="text-3xl font-bold truncate" style="color: var(--text-primary);">{{ t('dashboard') }}</h2>
          <button (click)="navigateTo('membership-center')"
                  class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-opacity hover:opacity-80 shrink-0"
                  style="background: var(--primary-bg); border: 1px solid var(--border-default); color: var(--text-secondary);"
                  title="會員中心">
            <span>{{ membershipService.levelIcon() }}</span>
            <span>{{ membershipService.levelName() }}</span>
          </button>
        </div>
        <button (click)="refreshStatus()"
                class="flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
                style="color: var(--text-muted); border: 1px solid var(--border-default); background-color: var(--bg-card);"
                title="刷新狀態">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </button>
      </div>

      <!-- ═══════════ 英雄區 ═══════════ -->
      @if (!setupComplete()) {
        <!-- 上手引導：進度環 + 下一步CTA + 5步清單 -->
        <div class="rounded-2xl p-6 md:p-8 mb-6"
             style="background: linear-gradient(135deg, var(--primary-bg), rgba(139, 92, 246, 0.08)); border: 1px solid var(--border-default); box-shadow: var(--shadow-lg);">
          <div class="flex flex-col lg:flex-row items-center gap-8">
            <!-- 進度環 -->
            <div class="relative shrink-0">
              <svg class="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-tertiary)" stroke-width="8"/>
                <circle cx="50" cy="50" r="42" fill="none" stroke="url(#dashSetupRingGrad)" stroke-width="8" stroke-linecap="round"
                        [attr.stroke-dasharray]="ringCircumference"
                        [attr.stroke-dashoffset]="ringOffset()"
                        style="transition: stroke-dashoffset 0.6s ease;"/>
                <defs>
                  <linearGradient id="dashSetupRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#06b6d4"/>
                    <stop offset="100%" stop-color="#8b5cf6"/>
                  </linearGradient>
                </defs>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-3xl font-bold" style="color: var(--text-primary);">{{ completedSteps() }}<span class="text-lg font-medium" style="color: var(--text-muted);">/5</span></span>
                <span class="text-xs mt-0.5" style="color: var(--text-muted);">上手進度</span>
              </div>
            </div>

            <!-- 標題 + 下一步CTA -->
            <div class="flex-1 min-w-0 text-center lg:text-left">
              <h3 class="text-2xl font-bold mb-2" style="color: var(--text-primary);">跑通你的第一條獲客鏈路</h3>
              <p class="text-sm mb-5 leading-relaxed" style="color: var(--text-muted);">
                完成 5 個上手步驟，系統將自動監控關鍵詞、AI 策劃培育並沉澱潛在客戶
              </p>
              @if (currentStep(); as step) {
                <button (click)="goNextStep()"
                        [disabled]="starting()"
                        class="inline-flex items-center gap-2 font-bold py-3 px-7 rounded-xl transition-all shadow-lg hover:shadow-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                        style="background: linear-gradient(90deg, var(--primary), var(--accent)); color: #fff;">
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  <span>下一步：{{ step.label }}</span>
                </button>
              }
            </div>

            <!-- 5步清單 -->
            <div class="w-full lg:w-80 shrink-0 space-y-2">
              @for (step of setupSteps(); track step.id; let i = $index) {
                <button (click)="goStep(step)"
                        class="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group"
                        [style.background-color]="step.done ? 'var(--success-bg)' : (currentStep()?.id === step.id ? 'var(--primary-bg)' : 'var(--bg-card)')"
                        [style.border]="currentStep()?.id === step.id ? '1px solid var(--primary)' : '1px solid var(--border-default)'"
                        [style.opacity]="!step.done && currentStep()?.id !== step.id ? '0.6' : '1'">
                  <span class="flex items-center justify-center w-7 h-7 rounded-full shrink-0 text-xs font-bold"
                        [style.background]="step.done ? 'var(--success)' : (currentStep()?.id === step.id ? 'var(--primary)' : 'var(--bg-tertiary)')"
                        [style.color]="step.done || currentStep()?.id === step.id ? '#fff' : 'var(--text-muted)'">
                    @if (step.done) {
                      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    } @else {
                      {{ i + 1 }}
                    }
                  </span>
                  <span class="flex-1 min-w-0">
                    <span class="block text-sm font-medium truncate" style="color: var(--text-primary);">{{ step.label }}</span>
                    <span class="block text-xs truncate" style="color: var(--text-muted);">{{ step.desc }}</span>
                  </span>
                  @if (!step.done) {
                    <svg class="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" style="color: var(--text-muted);"
                         viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  }
                </button>
              }
            </div>
          </div>
        </div>
      } @else {
        <!-- 全部完成：運行狀態 + 一鍵停止 -->
        <div class="rounded-2xl p-6 md:p-8 mb-6"
             style="background: linear-gradient(135deg, var(--success-bg), rgba(6, 182, 212, 0.08)); border: 1px solid var(--border-default); box-shadow: var(--shadow-lg);">
          <div class="flex flex-col md:flex-row items-center justify-between gap-6">
            <div class="flex items-center gap-4">
              <span class="relative flex h-3.5 w-3.5 shrink-0">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style="background: var(--success);"></span>
                <span class="relative inline-flex rounded-full h-3.5 w-3.5" style="background: var(--success);"></span>
              </span>
              <div>
                <h3 class="text-2xl font-bold" style="color: var(--text-primary);">獲客鏈路運行中</h3>
                <p class="text-sm mt-1" style="color: var(--text-muted);">
                  正在監控 {{ status().monitoring?.groups ?? 0 }} 個群組 ·
                  {{ triggerRulesActiveCount() }} 條規則生效 ·
                  AI {{ status().ai?.enabled ? (status().ai?.mode === 'full' ? '全自動' : '半自動') : '未啟用' }}
                </p>
              </div>
            </div>
            <div class="flex gap-3 shrink-0">
              <button (click)="navigateTo('leads')"
                      class="inline-flex items-center gap-2 font-medium py-2.5 px-5 rounded-xl transition-colors"
                      style="background-color: var(--bg-card); border: 1px solid var(--border-default); color: var(--text-primary);">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>
                </svg>
                <span>查看線索</span>
              </button>
              <button (click)="oneClickStop()"
                      class="inline-flex items-center gap-2 font-bold py-2.5 px-5 rounded-xl transition-all shadow-lg hover:brightness-110"
                      style="background: linear-gradient(90deg, var(--error), #f97316); color: #fff;">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="6" y="6" width="12" height="12" rx="1"/>
                </svg>
                <span>一鍵停止</span>
              </button>
            </div>
          </div>
        </div>
      }

      <!-- 🔧 P1: 一鍵啟動進度（保留原超時/取消控制） -->
      @if (starting()) {
        <div class="rounded-xl p-4 mb-6" style="background-color: var(--bg-card); border: 1px solid var(--primary);">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <div class="animate-spin h-5 w-5 border-2 rounded-full" style="border-color: var(--primary); border-top-color: transparent;"></div>
              <span class="font-medium" style="color: var(--primary-light);">{{ startMessage() }}</span>
            </div>
            <button (click)="cancelAndRefresh()"
                    class="px-3 py-1 text-xs rounded-lg transition-colors flex items-center gap-1"
                    style="background-color: var(--bg-tertiary); color: var(--text-secondary);"
                    title="取消並刷新狀態">
              <span>✕</span>
              <span>取消</span>
            </button>
          </div>
          <div class="w-full rounded-full h-2.5 mb-3" style="background-color: var(--bg-tertiary);">
            <div class="h-2.5 rounded-full transition-all duration-300"
                 style="background: linear-gradient(90deg, var(--primary), var(--accent));"
                 [style.width.%]="startProgress()"></div>
          </div>
          <div class="flex justify-between text-xs">
            @for (phase of startPhases; track phase.at) {
              <div class="flex items-center gap-1"
                   [style.color]="startProgress() >= phase.at ? 'var(--success)' : 'var(--text-disabled)'">
                <span>{{ startProgress() >= phase.at ? '✓' : '○' }}</span>
                <span>{{ phase.label }}</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- P1: 配置警告（保留） -->
      @if (noSenderAccountWarning(); as warning) {
        <div class="rounded-xl p-3 mb-4 flex items-center justify-between gap-3" style="background: var(--warning-bg); border: 1px solid var(--warning);">
          <span class="flex items-center gap-2 text-sm" style="color: var(--text-primary);">
            <svg class="w-4 h-4 shrink-0" style="color: var(--warning);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            {{ warning.message }}
          </span>
          <button (click)="navigateTo('accounts')" class="px-3 py-1.5 text-sm rounded-lg transition-colors shrink-0" style="background: var(--warning-bg); border: 1px solid var(--warning); color: var(--text-primary);">
            前往帳號管理
          </button>
        </div>
      }
      @if (aiFullButNoModelWarning(); as warning) {
        <div class="rounded-xl p-3 mb-4 flex items-center justify-between gap-3" style="background: var(--warning-bg); border: 1px solid var(--warning);">
          <span class="flex items-center gap-2 text-sm" style="color: var(--text-primary);">
            <svg class="w-4 h-4 shrink-0" style="color: var(--warning);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            {{ warning.message }}
          </span>
          <button (click)="navigateTo('ai-engine')" class="px-3 py-1.5 text-sm rounded-lg transition-colors shrink-0" style="background: var(--warning-bg); border: 1px solid var(--warning); color: var(--text-primary);">
            前往智能引擎
          </button>
        </div>
      }

      <!-- ═══════════ 核心數據4卡 ═══════════ -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- 帳號在線 -->
        <button (click)="navigateTo('accounts')"
                class="rounded-xl p-4 text-left transition-all hover:-translate-y-0.5 group"
                style="background-color: var(--bg-card); border: 1px solid var(--border-default); box-shadow: var(--shadow-sm);">
          <div class="flex items-center justify-between mb-3">
            <span class="flex items-center justify-center w-9 h-9 rounded-lg" style="background: var(--primary-bg); color: var(--primary-light);">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            <svg class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style="color: var(--text-muted);"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </div>
          <div class="text-2xl font-bold" [style.color]="onlineAccountsCount() > 0 ? 'var(--success)' : 'var(--text-primary)'">
            {{ onlineAccountsCount() }}<span class="text-sm font-normal" style="color: var(--text-muted);">/{{ totalAccountsCount() }}</span>
          </div>
          <div class="text-xs mt-1" style="color: var(--text-muted);">帳號在線</div>
        </button>

        <!-- 監控群組 -->
        <button (click)="navigateTo('monitoring-groups')"
                class="rounded-xl p-4 text-left transition-all hover:-translate-y-0.5 group"
                style="background-color: var(--bg-card); border: 1px solid var(--border-default); box-shadow: var(--shadow-sm);">
          <div class="flex items-center justify-between mb-3">
            <span class="flex items-center justify-center w-9 h-9 rounded-lg" style="background: rgba(139, 92, 246, 0.15); color: var(--accent-light);">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </span>
            <svg class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style="color: var(--text-muted);"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </div>
          <div class="text-2xl font-bold" style="color: var(--text-primary);">{{ status().monitoring?.groups ?? 0 }}</div>
          <div class="text-xs mt-1" style="color: var(--text-muted);">監控群組</div>
        </button>

        <!-- 觸發規則 -->
        <button (click)="navigateTo('trigger-rules')"
                class="rounded-xl p-4 text-left transition-all hover:-translate-y-0.5 group"
                style="background-color: var(--bg-card); border: 1px solid var(--border-default); box-shadow: var(--shadow-sm);">
          <div class="flex items-center justify-between mb-3">
            <span class="flex items-center justify-center w-9 h-9 rounded-lg" style="background: var(--warning-bg); color: var(--warning);">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </span>
            <svg class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style="color: var(--text-muted);"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </div>
          <div class="text-2xl font-bold" [style.color]="triggerRulesActiveCount() > 0 ? 'var(--success)' : 'var(--text-primary)'">
            {{ triggerRulesActiveCount() }}<span class="text-sm font-normal" style="color: var(--text-muted);">/{{ triggerRulesTotalCount() }}</span>
          </div>
          <div class="text-xs mt-1" [style.color]="triggerRulesTotalCount() === 0 ? 'var(--warning)' : 'var(--text-muted)'">
            {{ triggerRulesTotalCount() === 0 ? '觸發規則 · 尚未配置' : '觸發規則' }}
          </div>
        </button>

        <!-- 監控狀態 -->
        <button (click)="navigateTo('monitoring-groups')"
                class="rounded-xl p-4 text-left transition-all hover:-translate-y-0.5 group"
                style="background-color: var(--bg-card); border: 1px solid var(--border-default); box-shadow: var(--shadow-sm);">
          <div class="flex items-center justify-between mb-3">
            <span class="flex items-center justify-center w-9 h-9 rounded-lg"
                  [style.background]="isMonitoring() ? 'var(--success-bg)' : 'var(--bg-tertiary)'"
                  [style.color]="isMonitoring() ? 'var(--success)' : 'var(--text-muted)'">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </span>
            <svg class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style="color: var(--text-muted);"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </div>
          <div class="text-2xl font-bold flex items-center gap-2" [style.color]="isMonitoring() ? 'var(--success)' : 'var(--text-primary)'">
            @if (isMonitoring()) {
              <span class="w-2.5 h-2.5 rounded-full animate-pulse shrink-0" style="background: var(--success);"></span>
            }
            <span class="text-xl">{{ isMonitoring() ? '運行中' : '未啟動' }}</span>
          </div>
          <div class="text-xs mt-1" style="color: var(--text-muted);">監控狀態</div>
        </button>
      </div>

      <!-- ═══════════ 獲客工作流5步（高亮當前階段） ═══════════ -->
      <div class="rounded-xl p-6 mb-6" style="background-color: var(--bg-card); border: 1px solid var(--border-default); box-shadow: var(--shadow-sm);">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold" style="color: var(--text-primary);">獲客工作流</h3>
          @if (funnelCurrentIndex() === -1) {
            <span class="text-xs px-2.5 py-1 rounded-full font-medium" style="background: var(--success-bg); color: var(--success);">全鏈路運行中</span>
          } @else if (isMonitoring()) {
            <span class="text-xs px-2.5 py-1 rounded-full font-medium" style="background: var(--primary-bg); color: var(--primary-light);">部分運行中</span>
          } @else {
            <span class="text-xs px-2.5 py-1 rounded-full font-medium" style="background: var(--bg-tertiary); color: var(--text-muted);">未啟動</span>
          }
        </div>
        <div class="flex items-stretch gap-1 overflow-x-auto pb-1">
          @for (f of funnelSteps; track f.id; let i = $index) {
            <button (click)="navigateTo(f.view)"
                    class="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl transition-all text-center hover:-translate-y-0.5"
                    style="min-width: 7rem;"
                    [style.background-color]="funnelStates()[i] ? 'var(--success-bg)' : (funnelCurrentIndex() === i ? 'var(--primary-bg)' : 'var(--bg-secondary)')"
                    [style.border]="funnelCurrentIndex() === i ? '1px solid var(--primary)' : '1px solid transparent'"
                    [style.opacity]="!funnelStates()[i] && funnelCurrentIndex() !== i ? '0.55' : '1'">
              <span class="flex items-center justify-center w-9 h-9 rounded-full"
                    [style.background]="funnelStates()[i] ? 'var(--success)' : (funnelCurrentIndex() === i ? 'var(--primary)' : 'var(--bg-tertiary)')"
                    [style.color]="funnelStates()[i] || funnelCurrentIndex() === i ? '#fff' : 'var(--text-muted)'">
                @switch (f.icon) {
                  @case ('target') {
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                    </svg>
                  }
                  @case ('cpu') {
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
                    </svg>
                  }
                  @case ('chat') {
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                    </svg>
                  }
                  @case ('users') {
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  }
                  @case ('trend') {
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                    </svg>
                  }
                }
              </span>
              <span class="text-sm font-medium whitespace-nowrap" style="color: var(--text-primary);">{{ f.label }}</span>
              <span class="text-xs"
                    [style.color]="funnelStates()[i] ? 'var(--success)' : (funnelCurrentIndex() === i ? 'var(--primary-light)' : 'var(--text-disabled)')">
                {{ funnelStates()[i] ? '運行中' : (funnelCurrentIndex() === i ? '當前階段' : '待運行') }}
              </span>
            </button>
            @if (i < funnelSteps.length - 1) {
              <span class="flex items-center shrink-0" style="color: var(--text-disabled);">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </span>
            }
          }
        </div>
      </div>

      <!-- ═══════════ 更多操作（默認折疊） ═══════════ -->
      <div class="mb-6">
        <button (click)="showMore.set(!showMore())"
                class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-colors"
                style="background-color: var(--bg-card); border: 1px solid var(--border-default); color: var(--text-secondary);">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          <span class="text-sm font-medium">更多操作</span>
          <svg class="w-4 h-4 transition-transform" [class.rotate-180]="showMore()"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        @if (showMore()) {
          <div class="mt-4 space-y-6">
            <!-- 快捷操作面板 -->
            <app-quick-actions-panel
              (startMarketing)="handleQuickStart($event)"
              (navigateTo)="navigateTo($event)"
              (viewAlerts)="navigateTo('monitoring-groups')">
            </app-quick-actions-panel>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- 自動化工作流控制 -->
              <div class="rounded-xl p-6" style="background-color: var(--bg-card); border: 1px solid var(--border-default);">
                <div class="flex items-center gap-2 mb-1">
                  <svg class="w-5 h-5" style="color: var(--primary-light);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>
                  </svg>
                  <h3 class="text-lg font-bold" style="color: var(--text-primary);">自動化工作流</h3>
                </div>
                <p class="text-sm mb-4" style="color: var(--text-muted);">
                  觸發後自動執行 AI 策劃與多角色協作
                </p>

                @for (workflow of automationWorkflow.workflows(); track workflow.id) {
                  <div class="p-4 rounded-lg mb-3" style="background-color: var(--bg-secondary);">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="w-2 h-2 rounded-full shrink-0"
                              [style.background]="workflow.enabled ? 'var(--success)' : 'var(--text-disabled)'"></span>
                        <span class="font-medium truncate" style="color: var(--text-primary);">{{ workflow.name }}</span>
                      </div>
                      <button (click)="automationWorkflow.toggleWorkflow(workflow.id, !workflow.enabled)"
                              class="px-3 py-1 rounded-lg text-sm font-medium transition-colors shrink-0"
                              [style.background]="workflow.enabled ? 'var(--success)' : 'var(--bg-tertiary)'"
                              [style.color]="workflow.enabled ? '#fff' : 'var(--text-secondary)'">
                        {{ workflow.enabled ? '運行中' : '已暫停' }}
                      </button>
                    </div>
                    <div class="flex items-center gap-4 text-xs" style="color: var(--text-muted);">
                      <span>今日觸發: {{ workflow.stats.todayTriggers }}</span>
                      <span>進行中: {{ automationWorkflow.activeExecutionCount() }}</span>
                      <span>轉化: {{ workflow.stats.conversions }}</span>
                    </div>
                    <div class="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
                      @for (step of workflow.steps; track step.id; let si = $index) {
                        <div class="flex items-center">
                          <span class="px-2 py-1 text-xs rounded whitespace-nowrap"
                                style="background-color: var(--bg-tertiary); color: var(--text-secondary);">
                            {{ step.name }}
                          </span>
                          @if (si < workflow.steps.length - 1) {
                            <span class="mx-1" style="color: var(--text-disabled);">→</span>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }

                <div class="flex items-start gap-2 text-xs p-3 rounded-lg" style="background-color: var(--bg-tertiary); color: var(--text-muted);">
                  <svg class="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                  <span>啟用後，當監控群組觸發關鍵詞時，將自動執行 AI 策劃並開始多角色協作</span>
                </div>
              </div>

              <!-- 快速操作 -->
              <div class="rounded-xl p-6" style="background-color: var(--bg-card); border: 1px solid var(--border-default);">
                <div class="flex items-center gap-2 mb-4">
                  <svg class="w-5 h-5" style="color: var(--warning);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                  <h3 class="text-lg font-bold" style="color: var(--text-primary);">快速操作</h3>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <button (click)="navigateTo('multi-role')"
                          class="p-4 rounded-lg text-left transition-all hover:-translate-y-0.5"
                          style="background-color: var(--bg-secondary); border: 1px solid transparent;">
                    <svg class="w-5 h-5 mb-2" style="color: var(--accent-light);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>
                    </svg>
                    <div class="font-medium text-sm" style="color: var(--text-primary);">手動策劃</div>
                    <div class="text-xs mt-0.5" style="color: var(--text-muted);">開始 AI 多角色協作</div>
                  </button>

                  <button (click)="navigateTo('monitoring-groups')"
                          class="p-4 rounded-lg text-left transition-all hover:-translate-y-0.5"
                          style="background-color: var(--bg-secondary); border: 1px solid transparent;">
                    <svg class="w-5 h-5 mb-2" style="color: var(--primary-light);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <div class="font-medium text-sm" style="color: var(--text-primary);">監控群組</div>
                    <div class="text-xs mt-0.5" style="color: var(--text-muted);">配置監控來源</div>
                  </button>

                  <button (click)="navigateTo('keyword-sets')"
                          class="p-4 rounded-lg text-left transition-all hover:-translate-y-0.5"
                          style="background-color: var(--bg-secondary); border: 1px solid transparent;">
                    <svg class="w-5 h-5 mb-2" style="color: var(--warning);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                    </svg>
                    <div class="font-medium text-sm" style="color: var(--text-primary);">關鍵詞集</div>
                    <div class="text-xs mt-0.5" style="color: var(--text-muted);">設置觸發詞</div>
                  </button>

                  <button (click)="navigateTo('leads')"
                          class="p-4 rounded-lg text-left transition-all hover:-translate-y-0.5"
                          style="background-color: var(--bg-secondary); border: 1px solid transparent;">
                    <svg class="w-5 h-5 mb-2" style="color: var(--success);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>
                    </svg>
                    <div class="font-medium text-sm" style="color: var(--text-primary);">查看線索</div>
                    <div class="text-xs mt-0.5" style="color: var(--text-muted);">管理潛在客戶</div>
                  </button>
                </div>
              </div>
            </div>

            <!-- 快速工作流 -->
            <app-quick-workflow
              (navigateTo)="navigateTo($event)">
            </app-quick-workflow>
          </div>
        }
      </div>
    </div>
  `
})
export class DashboardViewComponent implements OnInit, OnDestroy {
  // 服務注入
  private i18n = inject(I18nService);
  private nav = inject(NavBridgeService);
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  private accountService = inject(AccountManagementService);
  public membershipService = inject(MembershipService);
  public automationWorkflow = inject(AutomationWorkflowService);

  // 內部狀態
  starting = signal(false);
  startProgress = signal(0);
  startMessage = signal('');
  /** 「更多操作」折疊狀態（默認折疊） */
  showMore = signal(false);
  // 🔧 P0修復: 使用共享服務的監控狀態，而不是本地 signal
  private monitoringService = inject(MonitoringManagementService);
  isMonitoring = computed(() => this.monitoringService.monitoringActive());

  // 🔧 P1: 啟動超時控制
  private startTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly START_TIMEOUT_MS = 120000; // 120秒超時

  // 🔧 P2: 狀態心跳機制
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private readonly HEARTBEAT_INTERVAL_MS = 30000; // 30秒心跳

  private _status = signal<SystemStatus>({});
  status = this._status.asReadonly();

  // 🔧 P0: 計算屬性（同時檢查 is_connected 和 status）
  onlineAccountsCount = computed(() => {
    const accounts = this.accountService.accounts();
    // 優先使用 status === 'Online'，其次使用 is_connected
    return accounts.filter(a => a.status === 'Online' || a.is_connected).length;
  });

  totalAccountsCount = computed(() => this.accountService.accounts().length);

  /** 觸發規則數量：優先使用 triggerRules，與後端/觸發規則頁一致 */
  triggerRulesActiveCount = computed(() => {
    const tr = this.status().triggerRules;
    if (tr && typeof tr.active === 'number') return tr.active;
    return this.status().campaigns?.active ?? 0;
  });
  triggerRulesTotalCount = computed(() => {
    const tr = this.status().triggerRules;
    if (tr && typeof tr.total === 'number') return tr.total;
    return this.status().campaigns?.total ?? 0;
  });

  /** P1: 無發送帳號警告（模板不可用箭頭函數，故用 computed） */
  noSenderAccountWarning = computed(() => {
    const w = this.status().warnings;
    if (!w?.length) return null;
    return w.find((x: { code: string }) => x.code === 'NO_SENDER_ACCOUNT') ?? null;
  });

  aiFullButNoModelWarning = computed(() => {
    const w = this.status().warnings;
    if (!w?.length) return null;
    return w.find((x: { code: string }) => x.code === 'AI_FULL_BUT_NO_MODEL') ?? null;
  });

  // ═══════════ 5步上手（狀態驅動，全部真實數據源） ═══════════

  /** 進度環參數：r=42, 周長=2πr */
  readonly ringCircumference = 2 * Math.PI * 42;

  /** 一鍵啟動分步指示（進度百分比節點） */
  readonly startPhases = [
    { at: 10, label: '帳號' },
    { at: 40, label: '群組' },
    { at: 60, label: '監控' },
    { at: 80, label: 'AI' },
    { at: 100, label: '完成' }
  ];

  /** 獲客價值鏈5階段（點擊導航到對應頁面） */
  readonly funnelSteps = [
    { id: 'trigger', label: '關鍵詞觸發', view: 'monitoring-groups', icon: 'target' },
    { id: 'plan', label: 'AI 策劃', view: 'multi-role', icon: 'cpu' },
    { id: 'nurture', label: '私聊培育', view: 'lead-nurturing', icon: 'chat' },
    { id: 'group', label: '興趣建群', view: 'automation', icon: 'users' },
    { id: 'deal', label: '組群成交', view: 'leads', icon: 'trend' }
  ] as const;

  /** 5步上手清單（每步完成狀態來自真實服務/IPC狀態） */
  setupSteps = computed<SetupStep[]>(() => {
    const s = this.status();
    return [
      { id: 'account', label: '添加帳號', desc: '連接你的 Telegram 帳號', done: this.totalAccountsCount() > 0 },
      { id: 'groups', label: '添加監控群組', desc: '選擇要監聽的目標群組', done: (s.monitoring?.groups ?? 0) > 0 },
      { id: 'keywords', label: '設置關鍵詞', desc: '定義觸發線索的關鍵詞', done: (s.keywords?.sets ?? 0) > 0 },
      { id: 'rules', label: '配置觸發規則', desc: '設定命中後的自動動作', done: this.triggerRulesTotalCount() > 0 },
      { id: 'monitor', label: '啟動監控', desc: '一鍵啟動，開始自動獲客', done: this.isMonitoring() }
    ];
  });

  completedSteps = computed(() => this.setupSteps().filter(s => s.done).length);
  progressPct = computed(() => Math.round((this.completedSteps() / 5) * 100));
  /** 第一個未完成步驟（英雄區主CTA目標）；全部完成時為 null */
  currentStep = computed(() => this.setupSteps().find(s => !s.done) ?? null);
  setupComplete = computed(() => this.completedSteps() === 5);
  /** 進度環偏移量 */
  ringOffset = computed(() => this.ringCircumference * (1 - this.completedSteps() / 5));

  /**
   * 獲客工作流各階段是否運行中：
   * 觸發=監控開啟；策劃/培育=監控+AI；建群/成交=監控+AI+自動化工作流啟用
   */
  funnelStates = computed<boolean[]>(() => {
    const monitoring = this.isMonitoring();
    const ai = !!this.status().ai?.enabled;
    const wfEnabled = this.automationWorkflow.workflows().some(w => w.enabled);
    return [
      monitoring,
      monitoring && ai,
      monitoring && ai,
      monitoring && ai && wfEnabled,
      monitoring && ai && wfEnabled
    ];
  });
  /** 當前（第一個未運行）階段索引；-1 表示全鏈路運行中 */
  funnelCurrentIndex = computed(() => this.funnelStates().findIndex(active => !active));

  private ipcCleanup: (() => void)[] = [];

  ngOnInit(): void {
    console.log('[DashboardView] Component initialized');
    this.loadInitialData();
    this.setupIpcListeners();
    this.startHeartbeat(); // 🔧 P2: 啟動心跳
  }

  ngOnDestroy(): void {
    this.ipcCleanup.forEach(fn => fn());
    this.clearStartTimeout(); // 🔧 P1: 清理超時計時器
    this.stopHeartbeat(); // 🔧 P2: 停止心跳
  }

  // 🔧 P2: 啟動狀態心跳
  private startHeartbeat(): void {
    this.stopHeartbeat(); // 確保不重複
    this.heartbeatIntervalId = setInterval(() => {
      console.log('[DashboardView] 心跳：刷新狀態');
      this.refreshStatus();
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  // 🔧 P2: 停止狀態心跳
  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
  }

  private loadInitialData(): void {
    this.refreshStatus();
  }

  private setupIpcListeners(): void {
    const cleanup1 = this.ipc.on('system-status', (data: SystemStatus) => {
      this._status.set(data);
    });

    // 🔧 P0修復: 狀態由 MonitoringManagementService 統一管理
    // 這裡只保留 toast 通知

    // 🔧 P0修復: 監聽 monitoring-started 事件（只顯示 toast）
    const cleanup2c = this.ipc.on('monitoring-started', (data: { success: boolean; message: string }) => {
      console.log('[DashboardView] 監控已啟動:', data);
      this.toast.success(data.message || '監控已成功啟動');
    });

    // 🔧 P0修復: 監聽 monitoring-start-failed 事件
    const cleanup2d = this.ipc.on('monitoring-start-failed', (data: { reason: string; message: string; issues?: any[] }) => {
      console.log('[DashboardView] 監控啟動失敗:', data);

      // 根據失敗原因顯示不同的提示
      let errorMsg = data.message || '監控啟動失敗';
      if (data.reason === 'config_check_failed' && data.issues?.length) {
        errorMsg = `配置錯誤: ${data.issues[0]?.message || errorMsg}`;
      } else if (data.reason === 'no_accessible_groups') {
        errorMsg = '無法訪問監控群組，請確保帳號已加入群組';
      } else if (data.reason === 'all_accounts_failed') {
        errorMsg = '所有監控帳號都無法啟動';
      }

      this.toast.error(errorMsg, 5000);
    });

    // 🔧 P0修復: 監聽 monitoring-stopped 事件（只顯示 toast）
    const cleanup2e = this.ipc.on('monitoring-stopped', () => {
      console.log('[DashboardView] 監控已停止');
      this.toast.info('監控已停止');
    });

    // 🔧 P0: 修正事件名稱為 one-click-start-progress（與後端一致）
    const cleanup3 = this.ipc.on('one-click-start-progress', (data: { step: string; progress: number; message: string }) => {
      console.log('[DashboardView] 收到一鍵啟動進度:', data);
      this.startProgress.set(data.progress);
      this.startMessage.set(data.message);

      // 如果是完成或錯誤狀態，重置 starting
      if (data.step === 'complete' || data.step === 'error' || data.progress >= 100) {
        setTimeout(() => {
          this.starting.set(false);
          this.refreshStatus(); // 刷新狀態確保 UI 同步
        }, 500);
      }
    });

    // 🔧 P0: 監聽一鍵啟動結果事件（確保狀態重置）
    const cleanup4 = this.ipc.on('one-click-start-result', (data: any) => {
      console.log('[DashboardView] 收到一鍵啟動結果:', data);
      this.clearStartTimeout(); // 🔧 P1: 清除超時計時器
      this.starting.set(false);
      this.startProgress.set(100);
      this.startMessage.set(data.overall_success ? '✅ 啟動完成' : '⚠️ 部分啟動失敗');

      // 🔧 P0修復: 監控狀態由 MonitoringManagementService 統一管理
      if (data.monitoring?.success !== undefined) {
        console.log('[DashboardView] 一鍵啟動結果監控狀態:', data.monitoring.success);
      }

      // 🔧 P0: 立即刷新狀態（不等待）
      this.refreshStatus();

      // 延遲清除消息
      setTimeout(() => {
        this.startMessage.set('');
      }, 3000);
    });

    this.ipcCleanup.push(cleanup1, cleanup2c, cleanup2d, cleanup2e, cleanup3, cleanup4);
  }

  // 翻譯方法
  t(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }

  // ═══════════ 5步上手導航 ═══════════

  /** 執行「下一步」：導航到第一個未完成步驟 */
  goNextStep(): void {
    const step = this.currentStep();
    if (step) this.goStep(step);
  }

  /** 點擊清單中的某一步 */
  goStep(step: SetupStep): void {
    switch (step.id) {
      case 'account':
        this.navigateTo('add-account');
        break;
      case 'groups':
        this.navigateTo('monitoring-groups');
        break;
      case 'keywords':
        this.navigateTo('keyword-sets');
        break;
      case 'rules':
        this.navigateTo('trigger-rules');
        break;
      case 'monitor':
        // 已在運行中則不重複啟動
        if (this.isMonitoring()) return;
        this.oneClickStart();
        break;
    }
  }

  // 🔧 P0: 修復導航方法，支持對象類型 { view, handler }
  navigateTo(event: string | { view: string; handler?: string }): void {
    // 兼容字符串和對象類型
    const rawView = typeof event === 'string' ? event : event.view;
    const handler = typeof event === 'string' ? undefined : event.handler;

    // 視圖名稱映射（QuickWorkflow 使用的名稱 → LegacyView）
    const viewMap: Record<string, string> = {
      'resources': 'resource-center',
      'accounts': 'accounts',
      'add-account': 'add-account',  // 🔧 P0: 現在有對應的 @case 分支
      'automation': 'automation',
      'ads': 'leads',  // 批量發送導向發送控制台
      'leads': 'leads',
      'nurturing-analytics': 'nurturing-analytics',
      'ai-center': 'ai-engine',
      'ai-engine': 'ai-engine',
      'multi-role': 'multi-role',
      'monitoring': 'monitoring-groups'
    };
    const view = viewMap[rawView] || rawView;

    console.log('[DashboardView] navigateTo:', { rawView, view, handler });

    // 先處理 handler（如果有）
    if (handler) {
      this.executeHandler(handler);
    }

    // 然後導航到視圖（由 AppComponent 的 effect 處理同步）
    if (view) {
      this.nav.navigateTo(view as LegacyView);
    }
  }

  // 🔧 P0: 執行 handler 操作
  private executeHandler(handler: string): void {
    console.log('[DashboardView] executeHandler:', handler);
    switch (handler) {
      // QuickWorkflowComponent 定義的 handler
      case 'scan-sessions':
        this.ipc.send('scan-orphan-sessions');
        this.toast.info('🔍 正在掃描可恢復的 Session...');
        break;
      case 'new-campaign':
        this.ipc.send('open-add-campaign-dialog');
        this.toast.info('⚡ 正在打開創建活動對話框...');
        break;
      case 'export-leads':
        this.ipc.send('open-export-dialog');
        this.toast.info('📥 正在打開導出對話框...');
        break;
      case 'start-monitoring':
        this.startMonitoring();
        break;
      case 'run-script':
        this.toast.info('🎬 正在啟動劇本執行...');
        this.ipc.send('run-multi-role-script');
        break;
      // 兼容其他可能的 handler
      case 'openAddAccountDialog':
        this.ipc.send('open-add-account-dialog');
        break;
      case 'stopMonitoring':
        this.stopMonitoring();
        break;
      default:
        console.warn('[DashboardView] Unknown handler:', handler);
        this.toast.info(`正在處理: ${handler}...`);
    }
  }

  // 刷新狀態
  refreshStatus(): void {
    this.ipc.send('get-system-status');
    this.ipc.send('get-monitoring-status');
  }

  // 🔧 P0 v2: 一鍵啟動（不在前端阻止，讓後端處理帳號連接）
  oneClickStart(): void {
    if (this.starting()) {
      this.toast.warning('正在啟動中，請稍候...', 2000);
      return;
    }

    // 檢查是否有任何帳號配置
    const totalAccounts = this.totalAccountsCount();
    if (totalAccounts === 0) {
      this.toast.error('❌ 沒有配置任何帳號，請先添加帳號', 4000);
      return;
    }

    this.starting.set(true);
    this.startProgress.set(0);
    this.startMessage.set(`🚀 開始啟動 (${totalAccounts} 個帳號)...`);

    // 🔧 P1: 設置超時自動恢復
    this.clearStartTimeout();
    this.startTimeoutId = setTimeout(() => {
      if (this.starting()) {
        console.warn('[DashboardView] 一鍵啟動超時，自動恢復');
        this.starting.set(false);
        this.startMessage.set('⚠️ 啟動超時，請檢查後端狀態');
        this.toast.warning('啟動超時，正在刷新狀態...', 3000);
        this.refreshStatus();
      }
    }, this.START_TIMEOUT_MS);

    // 直接發送啟動命令，後端會嘗試連接所有帳號
    this.ipc.send('one-click-start', { forceRefresh: true });
    this.toast.info(`🚀 開始一鍵啟動，後端將自動連接 ${totalAccounts} 個帳號`, 3000);
  }

  // 🔧 P1: 清除超時計時器
  private clearStartTimeout(): void {
    if (this.startTimeoutId) {
      clearTimeout(this.startTimeoutId);
      this.startTimeoutId = null;
    }
  }

  // 🔧 P1: 取消啟動並刷新狀態
  cancelAndRefresh(): void {
    console.log('[DashboardView] 用戶取消啟動');
    this.clearStartTimeout();
    this.starting.set(false);
    this.startProgress.set(0);
    this.startMessage.set('');
    this.toast.info('已取消，正在刷新狀態...', 2000);
    this.refreshStatus();
  }

  // 一鍵停止
  oneClickStop(): void {
    this.ipc.send('one-click-stop');
    this.toast.info('正在停止所有服務...');
  }

  // 啟動監控
  startMonitoring(): void {
    this.ipc.send('start-monitoring');
  }

  // 停止監控
  stopMonitoring(): void {
    this.ipc.send('stop-monitoring');
  }

  // 🆕 P3: 處理快捷啟動
  handleQuickStart(event: { type: string; config: any }): void {
    console.log('[Dashboard] 快捷啟動:', event);

    switch (event.type) {
      case 'immediate':
        this.toast.info('🚀 正在啟動即時營銷...');
        this.navigateTo('multi-role');
        break;
      case 'smart_schedule':
        this.toast.info('⏱️ 正在配置智能定時...');
        this.navigateTo('multi-role');
        break;
      case 'preset':
        this.toast.success(`📌 使用預設配置: ${event.config.presetId}`);
        this.navigateTo('multi-role');
        break;
      case 'recommended':
        this.toast.success(`💡 使用推薦組合: ${event.config.roleCombo?.comboName}`);
        this.navigateTo('multi-role');
        break;
      default:
        this.navigateTo('multi-role');
    }
  }
}
