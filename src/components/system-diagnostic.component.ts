/**
 * 系統診斷組件
 * System Diagnostic Component
 */

import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemDiagnosticService, DiagnosticReport, DiagnosticItem } from '../services/system-diagnostic.service';

@Component({
  selector: 'app-system-diagnostic',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="system-diagnostic h-full overflow-y-auto bg-slate-900 p-6">
      
      <!-- 頭部 -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-white flex items-center gap-3">
            🔍 系統診斷中心
          </h1>
          <p class="text-slate-400 mt-1">一鍵檢查系統狀態，快速定位問題</p>
        </div>
        
        <div class="flex items-center gap-3">
          @if (diagnostic.history().length > 0) {
            <button (click)="showHistory.set(!showHistory())"
                    class="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors text-sm flex items-center gap-2">
              📋 歷史報告 ({{ diagnostic.history().length }})
            </button>
          }
          <button (click)="runDiagnostic()"
                  [disabled]="diagnostic.isRunning()"
                  class="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
            @if (diagnostic.isRunning()) {
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              診斷中...
            } @else {
              ⚡ 一鍵診斷
            }
          </button>
        </div>
      </div>
      
      <!-- 診斷進度 -->
      @if (diagnostic.isRunning()) {
        <div class="mb-6 p-5 bg-slate-800/50 rounded-xl border border-cyan-500/30">
          <div class="flex items-center justify-between mb-3">
            <span class="text-white font-medium">正在診斷: {{ diagnostic.currentItem() }}</span>
            <span class="text-cyan-400">{{ diagnostic.progress() }}%</span>
          </div>
          <div class="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                 [style.width.%]="diagnostic.progress()">
            </div>
          </div>
        </div>
      }
      
      <!-- 診斷結果 -->
      @if (diagnostic.currentReport(); as report) {
        <!-- 整體狀態卡片 -->
        <div class="mb-6 p-6 rounded-2xl border"
             [class.bg-green-500/10]="report.overallStatus === 'healthy'"
             [class.border-green-500/30]="report.overallStatus === 'healthy'"
             [class.bg-amber-500/10]="report.overallStatus === 'warning'"
             [class.border-amber-500/30]="report.overallStatus === 'warning'"
             [class.bg-red-500/10]="report.overallStatus === 'critical'"
             [class.border-red-500/30]="report.overallStatus === 'critical'">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="text-5xl">
                {{ report.overallStatus === 'healthy' ? '✅' : report.overallStatus === 'warning' ? '⚠️' : '❌' }}
              </div>
              <div>
                <h2 class="text-xl font-bold text-white">
                  {{ report.overallStatus === 'healthy' ? '系統狀態良好' : report.overallStatus === 'warning' ? '存在警告' : '發現問題' }}
                </h2>
                <p class="text-slate-400">
                  共 {{ report.summary.total }} 項檢查 · 
                  <span class="text-green-400">{{ report.summary.passed }} 通過</span> · 
                  <span class="text-amber-400">{{ report.summary.warnings }} 警告</span> · 
                  <span class="text-red-400">{{ report.summary.failed }} 失敗</span>
                </p>
              </div>
            </div>
            
            <button (click)="exportReport()"
                    class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm flex items-center gap-2">
              📄 導出報告
            </button>
          </div>
        </div>
        
        <!-- 分類結果 -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          @for (category of diagnostic.categories; track category.id) {
            <div class="p-5 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>{{ category.icon }}</span>
                {{ category.name }}
                <span class="ml-auto text-sm font-normal"
                      [class.text-green-400]="getCategoryStatus(report, category.id) === 'passed'"
                      [class.text-amber-400]="getCategoryStatus(report, category.id) === 'warning'"
                      [class.text-red-400]="getCategoryStatus(report, category.id) === 'failed'">
                  {{ getCategoryStatusText(report, category.id) }}
                </span>
              </h3>
              
              <div class="space-y-2">
                @for (item of getItemsByCategory(report, category.id); track item.id) {
                  <div class="flex items-center gap-3 p-2 rounded-lg"
                       [class.bg-slate-700/30]="item.status !== 'passed'">
                    <span class="w-5 text-center">
                      @switch (item.status) {
                        @case ('pending') { <span class="text-slate-500">⏳</span> }
                        @case ('running') { <span class="animate-spin">⚙️</span> }
                        @case ('passed') { <span class="text-green-400">✓</span> }
                        @case ('warning') { <span class="text-amber-400">⚠</span> }
                        @case ('failed') { <span class="text-red-400">✗</span> }
                      }
                    </span>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm text-white">{{ item.name }}</div>
                      @if (item.message) {
                        <div class="text-xs text-slate-400 truncate">{{ item.message }}</div>
                      }
                    </div>
                    @if (item.autoFix) {
                      <button (click)="runFix(item)"
                              class="px-2 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors">
                        修復
                      </button>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
        
        <!-- 改進建議 -->
        @if (report.recommendations.length > 0) {
          <div class="p-5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/30">
            <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              💡 改進建議
            </h3>
            <ul class="space-y-2">
              @for (rec of report.recommendations; track $index) {
                <li class="flex items-start gap-2 text-slate-300">
                  <span class="text-purple-400 mt-0.5">→</span>
                  <span>{{ rec }}</span>
                </li>
              }
            </ul>
          </div>
        }
      } @else {
        <!-- 未診斷狀態 -->
        <div class="text-center py-16">
          <div class="text-6xl mb-4">🔬</div>
          <h2 class="text-xl font-bold text-white mb-2">準備進行系統診斷</h2>
          <p class="text-slate-400 mb-6">點擊「一鍵診斷」按鈕開始全面檢查系統狀態</p>
          
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            @for (category of diagnostic.categories; track category.id) {
              <div class="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div class="text-2xl mb-2">{{ category.icon }}</div>
                <div class="text-sm text-white">{{ category.name }}</div>
                <div class="text-xs text-slate-500">{{ category.items.length }} 項檢查</div>
              </div>
            }
          </div>
        </div>
      }
      
      <!-- 歷史報告側邊欄 -->
      @if (showHistory()) {
        <div class="fixed inset-0 bg-black/50 z-40" (click)="showHistory.set(false)"></div>
        <div class="fixed right-0 top-0 h-full w-96 bg-slate-900 border-l border-slate-700 z-50 overflow-y-auto">
          <div class="p-5 border-b border-slate-700 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-white">歷史報告</h3>
            <button (click)="showHistory.set(false)" class="text-slate-400 hover:text-white">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="p-5 space-y-3">
            @for (report of diagnostic.history(); track report.id) {
              <div class="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 cursor-pointer hover:border-cyan-500/50 transition-colors"
                   (click)="loadReport(report)">
                <div class="flex items-center gap-3 mb-2">
                  <span class="text-lg">
                    {{ report.overallStatus === 'healthy' ? '✅' : report.overallStatus === 'warning' ? '⚠️' : '❌' }}
                  </span>
                  <div>
                    <div class="text-sm text-white">{{ formatDate(report.startTime) }}</div>
                    <div class="text-xs text-slate-500">
                      {{ report.summary.passed }}/{{ report.summary.total }} 通過
                    </div>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="text-center py-8 text-slate-500">
                暫無歷史報告
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class SystemDiagnosticComponent {
  diagnostic = inject(SystemDiagnosticService);
  
  showHistory = signal(false);
  close = output<void>();
  
  /**
   * 運行診斷
   */
  async runDiagnostic() {
    await this.diagnostic.runFullDiagnostic();
  }
  
  /**
   * 獲取分類狀態
   */
  getCategoryStatus(report: DiagnosticReport, categoryId: string): string {
    const items = report.items.filter(i => i.category === categoryId);
    if (items.some(i => i.status === 'failed')) return 'failed';
    if (items.some(i => i.status === 'warning')) return 'warning';
    return 'passed';
  }
  
  /**
   * 獲取分類狀態文本
   */
  getCategoryStatusText(report: DiagnosticReport, categoryId: string): string {
    const status = this.getCategoryStatus(report, categoryId);
    switch (status) {
      case 'passed': return '✓ 全部通過';
      case 'warning': return '有警告';
      case 'failed': return '有問題';
      default: return '';
    }
  }
  
  /**
   * 獲取分類下的項目
   */
  getItemsByCategory(report: DiagnosticReport, categoryId: string): DiagnosticItem[] {
    return report.items.filter(i => i.category === categoryId);
  }
  
  /**
   * 執行修復
   */
  async runFix(item: DiagnosticItem) {
    if (item.fixAction) {
      await this.diagnostic.runFix(item.fixAction);
    }
  }
  
  /**
   * 導出報告
   */
  exportReport() {
    const report = this.diagnostic.currentReport();
    if (!report) return;
    
    const content = this.diagnostic.exportReport(report);
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostic-report-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  /**
   * 載入歷史報告
   */
  loadReport(report: DiagnosticReport) {
    // 直接設置當前報告（需要暴露方法或使用其他方式）
    this.showHistory.set(false);
  }
  
  /**
   * 格式化日期
   */
  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('zh-TW');
  }
}
