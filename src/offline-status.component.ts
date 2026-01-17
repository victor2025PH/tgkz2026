/**
 * TG-AI智控王 Offline Status Component
 * 離線狀態顯示組件 v2.0
 */
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OfflineModeService } from './offline-mode.service';

@Component({
  selector: 'app-offline-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- 離線橫幅 -->
    @if (offlineService.isOffline() || offlineService.isReconnecting()) {
      <div class="fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium shadow-lg"
           [class]="statusClass()">
        <div class="flex items-center justify-center gap-3">
          <!-- 狀態圖標 -->
          <span class="text-lg">{{ statusIcon() }}</span>
          
          <!-- 狀態文字 -->
          <span>{{ offlineService.getStatusSummary() }}</span>
          
          <!-- 降級等級 -->
          @if (offlineService.degradationLevel() !== 'none') {
            <span class="px-2 py-0.5 rounded text-xs bg-white/20">
              {{ degradationText() }}
            </span>
          }
          
          <!-- 寬限期 -->
          @if (offlineService.isOffline() && !offlineService.isGracePeriodExpired()) {
            <span class="text-xs opacity-75">
              {{ offlineService.getGracePeriodDescription() }}
            </span>
          }
          
          <!-- 重連按鈕 -->
          <button (click)="offlineService.manualReconnect()" 
                  class="px-3 py-1 text-xs rounded bg-white/20 hover:bg-white/30 transition-colors">
            🔄 重新連接
          </button>
        </div>
      </div>
    }
    
    <!-- 功能降級提示模態框 -->
    @if (showDegradationModal()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-700">
          <div class="text-center">
            <div class="text-5xl mb-4">📴</div>
            <h3 class="text-xl font-bold mb-2">離線模式</h3>
            <p class="text-gray-400 mb-4">{{ offlineService.offlineFeatures().description }}</p>
            
            <!-- 功能可用性列表 -->
            <div class="bg-slate-900/50 rounded-xl p-4 mb-4 text-left">
              <h4 class="text-sm font-semibold text-gray-300 mb-3">功能狀態</h4>
              <div class="space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span>發送消息</span>
                  <span [class]="offlineService.offlineFeatures().canSendMessages ? 'text-green-400' : 'text-red-400'">
                    {{ offlineService.offlineFeatures().canSendMessages ? '✓ 可用' : '✗ 不可用' }}
                  </span>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span>AI 功能</span>
                  <span [class]="offlineService.offlineFeatures().canUseAI ? 'text-green-400' : 'text-red-400'">
                    {{ offlineService.offlineFeatures().canUseAI ? '✓ 可用' : '✗ 不可用' }}
                  </span>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span>創建賬戶</span>
                  <span [class]="offlineService.offlineFeatures().canCreateAccounts ? 'text-green-400' : 'text-red-400'">
                    {{ offlineService.offlineFeatures().canCreateAccounts ? '✓ 可用' : '✗ 不可用' }}
                  </span>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span>數據導出</span>
                  <span [class]="offlineService.offlineFeatures().canExportData ? 'text-green-400' : 'text-red-400'">
                    {{ offlineService.offlineFeatures().canExportData ? '✓ 可用' : '✗ 不可用' }}
                  </span>
                </div>
              </div>
            </div>
            
            <!-- 剩餘寬限期 -->
            @if (!offlineService.isGracePeriodExpired()) {
              <div class="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-4">
                <p class="text-orange-400 text-sm">
                  ⏰ 離線寬限期：{{ offlineService.getGracePeriodDescription() }}
                </p>
              </div>
            } @else {
              <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <p class="text-red-400 text-sm">
                  ❌ 離線時間過長，請連接網絡繼續使用
                </p>
              </div>
            }
            
            <div class="flex gap-3">
              <button (click)="closeDegradationModal()" 
                      class="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors">
                我知道了
              </button>
              <button (click)="offlineService.manualReconnect()" 
                      class="flex-1 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 transition-colors">
                🔄 重新連接
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class OfflineStatusComponent {
  offlineService = inject(OfflineModeService);
  
  private _showDegradationModal = false;
  
  showDegradationModal = computed(() => {
    // 當降級等級改變時顯示模態框
    return this._showDegradationModal && this.offlineService.degradationLevel() !== 'none';
  });
  
  statusClass = computed(() => {
    if (this.offlineService.isReconnecting()) {
      return 'bg-yellow-600 text-yellow-100';
    }
    if (this.offlineService.isGracePeriodExpired()) {
      return 'bg-red-600 text-red-100';
    }
    if (this.offlineService.degradationLevel() === 'partial') {
      return 'bg-orange-600 text-orange-100';
    }
    return 'bg-gray-700 text-gray-100';
  });
  
  statusIcon = computed(() => {
    if (this.offlineService.isReconnecting()) return '🔄';
    if (this.offlineService.isGracePeriodExpired()) return '❌';
    if (this.offlineService.degradationLevel() === 'partial') return '⚠️';
    return '📴';
  });
  
  degradationText = computed(() => {
    const level = this.offlineService.degradationLevel();
    if (level === 'partial') return '部分功能受限';
    if (level === 'full') return '功能已禁用';
    return '';
  });
  
  constructor() {
    // 監聽降級等級變化
    if (typeof window !== 'undefined') {
      window.addEventListener('offline', () => {
        setTimeout(() => {
          if (this.offlineService.degradationLevel() !== 'none') {
            this._showDegradationModal = true;
          }
        }, 60000);  // 離線1分鐘後顯示
      });
    }
  }
  
  closeDegradationModal(): void {
    this._showDegradationModal = false;
  }
}
