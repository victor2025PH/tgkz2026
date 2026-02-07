/**
 * 🔧 P13-4: A/B 測試管理面板
 * 
 * 與後端 P12-5 同步的 A/B 測試管理界面
 * - 創建新測試
 * - 查看所有測試
 * - 對比變體效果
 * - 結束測試選出贏家
 */

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BusinessApiService, ABTestResult, ABVariantResult } from '../services/business-api.service';

@Component({
  selector: 'app-ab-test-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white flex items-center gap-2">
          <span>🧪</span> A/B 測試管理
        </h3>
        <div class="flex items-center gap-2">
          <button (click)="loadTests()"
                  [disabled]="isLoading()"
                  class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-all disabled:opacity-50">
            🔄
          </button>
          <button (click)="showCreateForm.set(!showCreateForm())"
                  class="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 
                         hover:from-purple-400 hover:to-pink-400 text-white text-sm rounded-lg transition-all">
            {{ showCreateForm() ? '取消' : '+ 新測試' }}
          </button>
        </div>
      </div>

      <!-- 創建表單 -->
      @if (showCreateForm()) {
        <div class="mb-4 p-4 bg-slate-700/30 rounded-xl border border-purple-500/20">
          <h4 class="text-sm font-medium text-purple-400 mb-3">創建 A/B 測試</h4>
          <div class="space-y-3">
            <div>
              <label class="text-xs text-slate-400 mb-1 block">測試名稱</label>
              <input type="text" [(ngModel)]="newTestName"
                     placeholder="例：春節促銷模板對比"
                     class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500">
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">模板 ID（逗號分隔，至少 2 個）</label>
              <input type="text" [(ngModel)]="newTestTemplateIds"
                     placeholder="例：1,2,3"
                     class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500">
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">模板名稱（可選，逗號分隔）</label>
              <input type="text" [(ngModel)]="newTestTemplateNames"
                     placeholder="例：方案A,方案B,方案C"
                     class="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500">
            </div>
            <button (click)="createTest()"
                    [disabled]="isCreating()"
                    class="w-full py-2 bg-purple-500 hover:bg-purple-400 text-white text-sm rounded-lg
                           transition-all disabled:opacity-50">
              {{ isCreating() ? '創建中...' : '確認創建' }}
            </button>
          </div>
        </div>
      }

      <!-- 測試列表 -->
      @if (isLoading()) {
        <div class="flex items-center justify-center py-8">
          <svg class="w-6 h-6 animate-spin text-purple-400" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span class="ml-2 text-slate-400 text-sm">加載中...</span>
        </div>
      } @else if (tests().length === 0) {
        <div class="text-center py-8 text-slate-500">
          <p class="text-lg mb-2">🧪</p>
          <p>尚未創建任何 A/B 測試</p>
          <p class="text-xs mt-1">創建測試來對比不同模板的效果</p>
        </div>
      } @else {
        <div class="space-y-3">
          @for (test of tests(); track test.test_id) {
            <div class="p-4 bg-slate-700/30 rounded-xl border transition-all"
                 [class.border-purple-500/30]="test.status === 'running'"
                 [class.border-emerald-500/30]="test.status === 'completed'"
                 [class.border-slate-600/30]="test.status === 'draft'">
              <!-- 測試標題 -->
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-medium text-white">{{ test.name }}</span>
                  <span class="text-xs px-2 py-0.5 rounded-full"
                        [class]="test.status === 'running' ? 'bg-purple-500/20 text-purple-400' :
                                 test.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                 'bg-slate-500/20 text-slate-400'">
                    {{ test.status === 'running' ? '進行中' : test.status === 'completed' ? '已完成' : '草稿' }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500">{{ test.test_id }}</span>
                  @if (test.status === 'running') {
                    <button (click)="completeTest(test.test_id)"
                            class="px-3 py-1 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 
                                   text-emerald-400 rounded-lg transition-all">
                      結束測試
                    </button>
                  }
                </div>
              </div>

              <!-- 變體對比 -->
              <div class="grid gap-2" [style.grid-template-columns]="'repeat(' + test.variants.length + ', 1fr)'">
                @for (variant of test.variants; track variant.variant_index) {
                  <div class="p-3 rounded-lg text-center relative"
                       [class]="test.winner?.variant_index === variant.variant_index 
                                ? 'bg-emerald-500/10 border border-emerald-500/30' 
                                : 'bg-slate-600/30'">
                    @if (test.winner?.variant_index === variant.variant_index) {
                      <span class="absolute -top-2 -right-2 text-lg">🏆</span>
                    }
                    <div class="text-xs text-slate-400 mb-1 truncate">{{ variant.template_name }}</div>
                    <div class="text-xl font-bold" 
                         [class]="variant.success_rate >= 70 ? 'text-emerald-400' : 
                                  variant.success_rate >= 40 ? 'text-yellow-400' : 'text-red-400'">
                      {{ variant.success_rate.toFixed(1) }}%
                    </div>
                    <div class="text-xs text-slate-500 mt-1">
                      {{ variant.sent }} 發送 · {{ variant.success }} 成功
                    </div>
                    @if (variant.replies > 0) {
                      <div class="text-xs text-blue-400 mt-0.5">
                        {{ variant.reply_rate.toFixed(1) }}% 回覆率
                      </div>
                    }
                  </div>
                }
              </div>

              <!-- 贏家提示 -->
              @if (test.winner) {
                <div class="mt-3 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
                  <span class="text-xs text-emerald-400">
                    🏆 贏家: {{ test.winner.template_name }} 
                    (成功率 {{ test.winner.success_rate.toFixed(1) }}%)
                  </span>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class ABTestPanelComponent implements OnInit {
  private bizApi = inject(BusinessApiService);

  // 狀態
  isLoading = signal(false);
  isCreating = signal(false);
  showCreateForm = signal(false);
  tests = this.bizApi.abTests;

  // 創建表單
  newTestName = '';
  newTestTemplateIds = '';
  newTestTemplateNames = '';

  ngOnInit() {
    this.loadTests();
  }

  async loadTests() {
    this.isLoading.set(true);
    try {
      await this.bizApi.loadABTests();
    } finally {
      this.isLoading.set(false);
    }
  }

  async createTest() {
    const ids = this.newTestTemplateIds.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    if (ids.length < 2) {
      return; // 至少 2 個模板
    }
    const names = this.newTestTemplateNames 
      ? this.newTestTemplateNames.split(',').map(s => s.trim()) 
      : undefined;

    this.isCreating.set(true);
    try {
      await this.bizApi.createABTest(this.newTestName || 'Untitled', ids, names);
      this.showCreateForm.set(false);
      this.newTestName = '';
      this.newTestTemplateIds = '';
      this.newTestTemplateNames = '';
    } finally {
      this.isCreating.set(false);
    }
  }

  async completeTest(testId: string) {
    await this.bizApi.completeABTest(testId);
  }
}
