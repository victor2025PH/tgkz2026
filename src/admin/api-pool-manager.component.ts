/**
 * API 池管理組件（管理員專用）
 * 
 * 功能：
 * - 查看 API 池狀態
 * - 添加/移除 API
 * - 啟用/禁用 API
 * - 監控 API 健康狀態
 */

import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

interface ApiInfo {
  id: number;
  api_id: string;
  api_hash: string;
  name: string;
  status: string;
  max_accounts: number;
  current_accounts: number;
  usage_ratio: number;
  priority: number;
  is_available: boolean;
  error_count: number;
}

interface PoolStats {
  total_apis: number;
  available_apis: number;
  full_apis: number;
  error_apis: number;
  disabled_apis: number;
  total_capacity: number;
  total_used: number;
  usage_ratio: number;
  allocation_count: number;
  error_count: number;
}

@Component({
  selector: 'app-api-pool-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="api-pool-manager">
      <div class="manager-header">
        <h2>🔐 平台 API 池管理</h2>
        <button (click)="loadPoolStatus()" class="refresh-btn">
          🔄 刷新
        </button>
      </div>

      <!-- 統計概覽 -->
      @if (stats()) {
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ stats()!.total_apis }}</div>
            <div class="stat-label">總 API 數</div>
          </div>
          <div class="stat-card available">
            <div class="stat-value">{{ stats()!.available_apis }}</div>
            <div class="stat-label">可用</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-value">{{ stats()!.full_apis }}</div>
            <div class="stat-label">已滿</div>
          </div>
          <div class="stat-card error">
            <div class="stat-value">{{ stats()!.error_apis }}</div>
            <div class="stat-label">錯誤</div>
          </div>
        </div>

        <div class="usage-bar">
          <div class="usage-label">
            總使用率：{{ stats()!.total_used }} / {{ stats()!.total_capacity }}
            ({{ (stats()!.usage_ratio * 100).toFixed(1) }}%)
          </div>
          <div class="usage-progress">
            <div 
              class="usage-fill"
              [style.width.%]="stats()!.usage_ratio * 100"
              [class.warning]="stats()!.usage_ratio > 0.7"
              [class.danger]="stats()!.usage_ratio > 0.9">
            </div>
          </div>
        </div>
      }

      <!-- 添加新 API -->
      <div class="add-section">
        <h3>➕ 添加新 API</h3>
        <div class="add-form">
          <div class="form-row">
            <div class="form-group">
              <label>API ID</label>
              <input 
                type="text" 
                [(ngModel)]="newApiId"
                placeholder="12345678"
                class="form-input">
            </div>
            <div class="form-group">
              <label>API Hash</label>
              <input 
                type="text" 
                [(ngModel)]="newApiHash"
                placeholder="a1b2c3d4e5f6..."
                class="form-input">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>名稱（可選）</label>
              <input 
                type="text" 
                [(ngModel)]="newApiName"
                placeholder="我的 API"
                class="form-input">
            </div>
            <div class="form-group small">
              <label>最大賬號數</label>
              <input 
                type="number" 
                [(ngModel)]="newMaxAccounts"
                min="1"
                max="50"
                class="form-input">
            </div>
            <div class="form-group small">
              <label>優先級</label>
              <input 
                type="number" 
                [(ngModel)]="newPriority"
                min="1"
                max="100"
                class="form-input">
            </div>
          </div>
          <button 
            (click)="addApi()" 
            [disabled]="!isAddFormValid()"
            class="add-btn">
            ➕ 添加到池中
          </button>
        </div>
      </div>

      <!-- API 列表 -->
      <div class="api-list-section">
        <h3>📋 API 列表</h3>
        
        @if (apis().length === 0) {
          <div class="empty-state">
            <p>API 池為空</p>
            <p class="hint">請添加 API 以供用戶登錄使用</p>
          </div>
        } @else {
          <div class="api-table">
            <div class="table-header">
              <div class="col-name">名稱 / API ID</div>
              <div class="col-usage">使用情況</div>
              <div class="col-status">狀態</div>
              <div class="col-actions">操作</div>
            </div>
            
            @for (api of apis(); track api.api_id) {
              <div class="table-row" [class.disabled]="api.status === 'disabled'">
                <div class="col-name">
                  <strong>{{ api.name || 'API ' + api.api_id }}</strong>
                  <span class="api-id-text">ID: {{ api.api_id }}</span>
                </div>
                <div class="col-usage">
                  <div class="mini-progress">
                    <div 
                      class="mini-fill"
                      [style.width.%]="api.usage_ratio * 100"
                      [class.warning]="api.usage_ratio > 0.7"
                      [class.full]="api.usage_ratio >= 1">
                    </div>
                  </div>
                  <span class="usage-text">{{ api.current_accounts }}/{{ api.max_accounts }}</span>
                </div>
                <div class="col-status">
                  <span class="status-badge" [class]="api.status">
                    {{ getStatusText(api.status) }}
                  </span>
                  @if (api.error_count > 0) {
                    <span class="error-badge">{{ api.error_count }} 錯誤</span>
                  }
                </div>
                <div class="col-actions">
                  @if (api.status === 'disabled') {
                    <button (click)="enableApi(api.api_id)" class="action-btn enable">
                      ✅ 啟用
                    </button>
                  } @else {
                    <button (click)="disableApi(api.api_id)" class="action-btn disable">
                      ⏸️ 禁用
                    </button>
                  }
                  <button (click)="removeApi(api.api_id)" class="action-btn remove">
                    🗑️
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- 使用說明 -->
      <div class="guide-section">
        <h3>📖 使用說明</h3>
        <ul>
          <li>每個 API 建議限制 10-20 個賬號，避免被 Telegram 檢測</li>
          <li>在 <a href="https://my.telegram.org" target="_blank">my.telegram.org</a> 申請新的 API</li>
          <li>建議使用不同手機號申請多個 API，分散風險</li>
          <li>出錯的 API 會自動進入冷卻期，冷卻後自動恢復</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .api-pool-manager {
      padding: 1.5rem;
      max-width: 1000px;
      margin: 0 auto;
    }

    .manager-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .manager-header h2 {
      margin: 0;
      color: var(--text-primary, white);
    }

    .refresh-btn {
      padding: 0.5rem 1rem;
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.5rem;
      color: var(--text-secondary, #94a3b8);
      cursor: pointer;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .stat-card {
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border-radius: 0.75rem;
      padding: 1rem;
      text-align: center;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary, white);
    }

    .stat-label {
      font-size: 0.75rem;
      color: var(--text-muted, #64748b);
      margin-top: 0.25rem;
    }

    .stat-card.available .stat-value { color: #22c55e; }
    .stat-card.warning .stat-value { color: #f59e0b; }
    .stat-card.error .stat-value { color: #ef4444; }

    /* Usage Bar */
    .usage-bar {
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border-radius: 0.75rem;
      padding: 1rem;
      margin-bottom: 1.5rem;
    }

    .usage-label {
      font-size: 0.875rem;
      color: var(--text-secondary, #cbd5e1);
      margin-bottom: 0.5rem;
    }

    .usage-progress {
      height: 8px;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 4px;
      overflow: hidden;
    }

    .usage-fill {
      height: 100%;
      background: linear-gradient(90deg, #22c55e, #06b6d4);
      border-radius: 4px;
      transition: width 0.3s;
    }

    .usage-fill.warning { background: linear-gradient(90deg, #f59e0b, #ef4444); }
    .usage-fill.danger { background: #ef4444; }

    /* Add Section */
    .add-section {
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border-radius: 0.75rem;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .add-section h3 {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      color: var(--text-primary, white);
    }

    .add-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .form-row {
      display: flex;
      gap: 0.75rem;
    }

    .form-group {
      flex: 1;
    }

    .form-group.small {
      flex: 0 0 100px;
    }

    .form-group label {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted, #64748b);
      margin-bottom: 0.25rem;
    }

    .form-input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.375rem;
      color: var(--text-primary, white);
      font-size: 0.875rem;
      box-sizing: border-box;
    }

    .add-btn {
      padding: 0.625rem 1rem;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border: none;
      border-radius: 0.5rem;
      color: white;
      font-weight: 500;
      cursor: pointer;
      align-self: flex-start;
    }

    .add-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* API List */
    .api-list-section {
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border-radius: 0.75rem;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .api-list-section h3 {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      color: var(--text-primary, white);
    }

    .empty-state {
      text-align: center;
      padding: 2rem;
      color: var(--text-muted, #64748b);
    }

    .empty-state .hint {
      font-size: 0.8rem;
    }

    .api-table {
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
      border-radius: 0.5rem;
      overflow: hidden;
    }

    .table-header {
      display: flex;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      padding: 0.75rem 1rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted, #64748b);
      text-transform: uppercase;
    }

    .table-row {
      display: flex;
      align-items: center;
      padding: 0.75rem 1rem;
      border-top: 1px solid var(--border-default, rgba(148, 163, 184, 0.1));
    }

    .table-row.disabled {
      opacity: 0.6;
    }

    .col-name { flex: 2; }
    .col-usage { flex: 1; display: flex; align-items: center; gap: 0.5rem; }
    .col-status { flex: 1; display: flex; gap: 0.5rem; align-items: center; }
    .col-actions { flex: 1; display: flex; gap: 0.5rem; justify-content: flex-end; }

    .col-name strong {
      display: block;
      color: var(--text-primary, white);
      font-size: 0.875rem;
    }

    .api-id-text {
      font-size: 0.7rem;
      color: var(--text-muted, #64748b);
    }

    .mini-progress {
      width: 60px;
      height: 6px;
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 3px;
      overflow: hidden;
    }

    .mini-fill {
      height: 100%;
      background: #22c55e;
      border-radius: 3px;
    }

    .mini-fill.warning { background: #f59e0b; }
    .mini-fill.full { background: #ef4444; }

    .usage-text {
      font-size: 0.75rem;
      color: var(--text-secondary, #94a3b8);
    }

    .status-badge {
      padding: 0.125rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.7rem;
      font-weight: 500;
    }

    .status-badge.active { background: rgba(34, 197, 94, 0.2); color: #86efac; }
    .status-badge.full { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
    .status-badge.error { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
    .status-badge.disabled { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }
    .status-badge.cooldown { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }

    .error-badge {
      padding: 0.125rem 0.375rem;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 0.25rem;
      font-size: 0.65rem;
      color: #fca5a5;
    }

    .action-btn {
      padding: 0.25rem 0.5rem;
      background: transparent;
      border: 1px solid var(--border-default, rgba(148, 163, 184, 0.2));
      border-radius: 0.25rem;
      font-size: 0.75rem;
      cursor: pointer;
    }

    .action-btn.enable { color: #22c55e; }
    .action-btn.disable { color: #f59e0b; }
    .action-btn.remove { color: #ef4444; }

    /* Guide */
    .guide-section {
      background: var(--bg-tertiary, rgba(15, 23, 42, 0.5));
      border-radius: 0.75rem;
      padding: 1rem;
    }

    .guide-section h3 {
      margin: 0 0 0.75rem 0;
      font-size: 0.875rem;
      color: var(--text-secondary, #cbd5e1);
    }

    .guide-section ul {
      margin: 0;
      padding-left: 1.25rem;
      font-size: 0.8rem;
      color: var(--text-muted, #64748b);
    }

    .guide-section li {
      margin-bottom: 0.375rem;
    }

    .guide-section a {
      color: var(--primary, #06b6d4);
    }
  `]
})
export class ApiPoolManagerComponent implements OnInit, OnDestroy {
  private ipcService = inject(ElectronIpcService);
  private toast = inject(ToastService);

  // 狀態
  stats = signal<PoolStats | null>(null);
  apis = signal<ApiInfo[]>([]);

  // 添加表單
  newApiId = '';
  newApiHash = '';
  newApiName = '';
  newMaxAccounts = 15;
  newPriority = 50;

  private ipcChannels: string[] = [];

  ngOnInit(): void {
    this.setupIpcListeners();
    this.loadPoolStatus();
  }

  ngOnDestroy(): void {
    this.ipcChannels.forEach(ch => this.ipcService.cleanup(ch));
  }

  private setupIpcListeners(): void {
    this.ipcService.on('api-pool-status', (data: any) => {
      if (data.success) {
        this.stats.set(data.data.stats);
        this.apis.set(data.data.apis || []);
      }
    });
    this.ipcChannels.push('api-pool-status');

    this.ipcService.on('api-pool-updated', () => {
      this.loadPoolStatus();
    });
    this.ipcChannels.push('api-pool-updated');
  }

  loadPoolStatus(): void {
    this.ipcService.send('api-pool:status', {});
  }

  isAddFormValid(): boolean {
    return !!this.newApiId && 
           /^\d+$/.test(this.newApiId) &&
           !!this.newApiHash && 
           /^[a-f0-9]{32}$/i.test(this.newApiHash);
  }

  addApi(): void {
    if (!this.isAddFormValid()) return;

    this.ipcService.send('api-pool:add', {
      api_id: this.newApiId,
      api_hash: this.newApiHash,
      name: this.newApiName,
      max_accounts: this.newMaxAccounts,
      priority: this.newPriority
    });

    // 清空表單
    this.newApiId = '';
    this.newApiHash = '';
    this.newApiName = '';
    this.newMaxAccounts = 15;
    this.newPriority = 50;

    this.toast.success('API 已添加');
    this.loadPoolStatus();
  }

  removeApi(apiId: string): void {
    if (!confirm(`確定要移除 API ${apiId} 嗎？`)) return;

    this.ipcService.send('api-pool:remove', { api_id: apiId });
    this.toast.success('API 已移除');
    this.loadPoolStatus();
  }

  enableApi(apiId: string): void {
    this.ipcService.send('api-pool:enable', { api_id: apiId });
    this.toast.success('API 已啟用');
    this.loadPoolStatus();
  }

  disableApi(apiId: string): void {
    this.ipcService.send('api-pool:disable', { api_id: apiId });
    this.toast.success('API 已禁用');
    this.loadPoolStatus();
  }

  getStatusText(status: string): string {
    const map: Record<string, string> = {
      'active': '正常',
      'full': '已滿',
      'error': '錯誤',
      'disabled': '禁用',
      'cooldown': '冷卻中'
    };
    return map[status] || status;
  }
}
