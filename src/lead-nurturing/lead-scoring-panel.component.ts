/**
 * 🔧 P13-3: 線索評分 & 去重面板組件
 * 
 * 功能：
 * 1. 顯示線索評分統計（hot/warm/neutral/cold 分佈）
 * 2. 一鍵批量評分
 * 3. 掃描重複線索
 * 4. 一鍵合併重複
 */

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusinessApiService, LeadScoreResult, DuplicateGroup, DedupStats } from '../services/business-api.service';

@Component({
  selector: 'app-lead-scoring-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      <!-- 評分區域 -->
      <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-white flex items-center gap-2">
            <span>⭐</span> 線索智能評分
          </h3>
          <button (click)="runBatchScoring()"
                  [disabled]="isScoring()"
                  class="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 
                         hover:from-cyan-400 hover:to-blue-400 text-white text-sm rounded-lg 
                         transition-all disabled:opacity-50 flex items-center gap-2">
            @if (isScoring()) {
              <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span>評分中...</span>
            } @else {
              <span>🔄 批量評分</span>
            }
          </button>
        </div>

        @if (scoreResults().length > 0) {
          <!-- 評分分佈 -->
          <div class="grid grid-cols-4 gap-3 mb-4">
            <div class="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
              <div class="text-2xl font-bold text-red-400">{{ hotCount() }}</div>
              <div class="text-xs text-red-400/70 mt-1">🔥 Hot</div>
            </div>
            <div class="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-center">
              <div class="text-2xl font-bold text-orange-400">{{ warmCount() }}</div>
              <div class="text-xs text-orange-400/70 mt-1">🌡️ Warm</div>
            </div>
            <div class="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center">
              <div class="text-2xl font-bold text-blue-400">{{ neutralCount() }}</div>
              <div class="text-xs text-blue-400/70 mt-1">😐 Neutral</div>
            </div>
            <div class="p-3 bg-slate-500/10 border border-slate-500/20 rounded-xl text-center">
              <div class="text-2xl font-bold text-slate-400">{{ coldCount() }}</div>
              <div class="text-xs text-slate-400/70 mt-1">❄️ Cold</div>
            </div>
          </div>

          <!-- 評分詳情列表 -->
          <div class="space-y-2 max-h-60 overflow-y-auto">
            @for (lead of scoreResults().slice(0, 20); track lead.id) {
              <div class="flex items-center gap-3 p-2 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold"
                     [class]="getScoreBgClass(lead.intent_level)">
                  {{ lead.lead_score }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm text-white">#{{ lead.id }} {{ lead.telegram_id || '' }}</div>
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-xs px-1.5 py-0.5 rounded"
                          [class]="getIntentBadgeClass(lead.intent_level)">
                      {{ lead.intent_level }}
                    </span>
                    <span class="text-xs px-1.5 py-0.5 rounded bg-slate-600/50 text-slate-300">
                      {{ lead.value_level }}
                    </span>
                  </div>
                </div>
                <div class="text-right text-xs text-slate-400">
                  <div>意向 {{ lead.intent_score }}</div>
                  <div>質量 {{ lead.quality_score }}</div>
                </div>
              </div>
            }
          </div>
          <div class="text-xs text-slate-500 mt-2 text-center">
            已評分 {{ scoreResults().length }} 條線索
          </div>
        } @else {
          <div class="text-center py-8 text-slate-500">
            <p class="text-lg mb-2">📊</p>
            <p>點擊「批量評分」對未評分線索自動打分</p>
            <p class="text-xs mt-1">將基於完整度、活躍度、意向信號等 5 個維度評分</p>
          </div>
        }
      </div>

      <!-- 去重區域 -->
      <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-white flex items-center gap-2">
            <span>🔍</span> 線索去重
          </h3>
          <button (click)="scanDuplicates()"
                  [disabled]="isScanning()"
                  class="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 
                         hover:from-amber-400 hover:to-orange-400 text-white text-sm rounded-lg 
                         transition-all disabled:opacity-50 flex items-center gap-2">
            @if (isScanning()) {
              <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span>掃描中...</span>
            } @else {
              <span>🔎 掃描重複</span>
            }
          </button>
        </div>

        @if (dedupStats(); as stats) {
          <div class="grid grid-cols-3 gap-3 mb-4">
            <div class="p-3 bg-slate-700/30 rounded-lg text-center">
              <div class="text-xl font-bold text-white">{{ stats.total_contacts }}</div>
              <div class="text-xs text-slate-400 mt-1">總聯繫人</div>
            </div>
            <div class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center">
              <div class="text-xl font-bold text-amber-400">{{ stats.duplicate_username_groups }}</div>
              <div class="text-xs text-amber-400/70 mt-1">重複組</div>
            </div>
            <div class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
              <div class="text-xl font-bold text-red-400">{{ stats.estimated_duplicates }}</div>
              <div class="text-xs text-red-400/70 mt-1">預估重複</div>
            </div>
          </div>
        }

        @if (duplicateGroups().length > 0) {
          <div class="space-y-3 max-h-60 overflow-y-auto">
            @for (group of duplicateGroups(); track group.primary_id; let i = $index) {
              <div class="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-xs px-2 py-0.5 rounded"
                          [class]="group.match_type === 'exact_phone' ? 'bg-purple-500/20 text-purple-400' :
                                   group.match_type === 'exact_telegram_id' ? 'bg-blue-500/20 text-blue-400' :
                                   'bg-amber-500/20 text-amber-400'">
                      {{ group.match_type === 'exact_phone' ? '📞 電話重複' :
                         group.match_type === 'exact_telegram_id' ? '🆔 ID重複' : '👤 用戶名重複' }}
                    </span>
                    <span class="text-xs text-slate-400">
                      信心度 {{ (group.confidence * 100).toFixed(0) }}%
                    </span>
                  </div>
                  <button (click)="mergeGroup(group)"
                          [disabled]="isMerging()"
                          class="px-3 py-1 text-xs bg-amber-500/20 hover:bg-amber-500/30 
                                 text-amber-400 rounded-lg transition-all disabled:opacity-50">
                    合併
                  </button>
                </div>
                <div class="text-xs text-slate-300">
                  保留 #{{ group.primary_id }}，合併 
                  @for (did of group.duplicate_ids; track did; let last = $last) {
                    <span class="text-amber-400">#{{ did }}</span>{{ last ? '' : ', ' }}
                  }
                </div>
                @if (group.details) {
                  <div class="text-xs text-slate-500 mt-1">
                    @if (group.details['username']) {
                      用戶名: {{ group.details['username'] }}
                    }
                    @if (group.details['phone']) {
                      電話: {{ group.details['phone'] }}
                    }
                    @if (group.details['count']) {
                      ({{ group.details['count'] }} 條記錄)
                    }
                  </div>
                }
              </div>
            }
          </div>
        } @else if (dedupStats()) {
          <div class="text-center py-6 text-slate-500">
            <p>✅ 未發現重複線索</p>
          </div>
        } @else {
          <div class="text-center py-6 text-slate-500">
            <p class="text-lg mb-2">🔍</p>
            <p>點擊「掃描重複」檢查線索數據庫</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class LeadScoringPanelComponent implements OnInit {
  private bizApi = inject(BusinessApiService);

  // 評分狀態
  isScoring = signal(false);
  scoreResults = signal<LeadScoreResult[]>([]);

  // 去重狀態
  isScanning = signal(false);
  isMerging = signal(false);
  duplicateGroups = this.bizApi.duplicateGroups;
  dedupStats = this.bizApi.dedupStats;

  // 計算屬性
  hotCount = computed(() => this.scoreResults().filter(r => r.intent_level === 'hot').length);
  warmCount = computed(() => this.scoreResults().filter(r => r.intent_level === 'warm').length);
  neutralCount = computed(() => this.scoreResults().filter(r => r.intent_level === 'neutral').length);
  coldCount = computed(() => this.scoreResults().filter(r => r.intent_level === 'cold').length);

  ngOnInit() {
    // 可選：初始化時自動加載去重統計
  }

  async runBatchScoring() {
    this.isScoring.set(true);
    try {
      const results = await this.bizApi.scoreLeads();
      this.scoreResults.set(results);
    } finally {
      this.isScoring.set(false);
    }
  }

  async scanDuplicates() {
    this.isScanning.set(true);
    try {
      await this.bizApi.scanDuplicates(50);
    } finally {
      this.isScanning.set(false);
    }
  }

  async mergeGroup(group: DuplicateGroup) {
    this.isMerging.set(true);
    try {
      await this.bizApi.mergeDuplicates(group.primary_id, group.duplicate_ids);
    } finally {
      this.isMerging.set(false);
    }
  }

  getScoreBgClass(level: string): string {
    switch (level) {
      case 'hot': return 'bg-red-500/20 text-red-400';
      case 'warm': return 'bg-orange-500/20 text-orange-400';
      case 'neutral': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  }

  getIntentBadgeClass(level: string): string {
    switch (level) {
      case 'hot': return 'bg-red-500/20 text-red-400';
      case 'warm': return 'bg-orange-500/20 text-orange-400';
      case 'neutral': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  }
}
