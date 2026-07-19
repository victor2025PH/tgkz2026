/**
 * 購買訂單對賬（管理端）
 *
 * 展示 purchase_orders 全量訂單，供客服/運營對賬、退款追溯。
 * 數據源：GET /api/v1/admin/purchase-orders（JWT admin，見 api_stats_routes.http_admin_purchase_orders）。
 * 金額單位為分，展示時 /100。
 */
import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from './admin.service';
import { ToastService } from '../toast.service';

interface PurchaseOrder {
  order_id: string;
  user_id: string;
  business_type: string;
  item_id?: string;
  item_name?: string;
  amount: number;
  tier?: string;
  duration_days?: number;
  status: string;
  transaction_id?: string;
  error_message?: string;
  created_at?: string;
  completed_at?: string;
}

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="po-page">
      <header class="po-header">
        <div>
          <h1>購買訂單對賬</h1>
          <p class="subtitle">會員 / 配額 / 代理購買訂單，供客服對賬與退款追溯</p>
        </div>
        <button class="refresh-btn" (click)="reload()" [disabled]="isLoading()">
          {{ isLoading() ? '載入中…' : '刷新' }}
        </button>
      </header>

      <!-- 狀態篩選 -->
      <div class="filters">
        @for (f of statusFilters; track f.value) {
          <button
            class="filter-chip"
            [class.active]="statusFilter() === f.value"
            (click)="setStatus(f.value)"
          >{{ f.label }}</button>
        }
      </div>

      @if (error()) {
        <div class="error-banner">{{ error() }}</div>
      }

      <div class="table-wrap">
        <table class="po-table">
          <thead>
            <tr>
              <th>訂單 ID</th>
              <th>用戶</th>
              <th>類型</th>
              <th>商品</th>
              <th>金額</th>
              <th>等級</th>
              <th>狀態</th>
              <th>建立時間</th>
              <th>完成時間</th>
            </tr>
          </thead>
          <tbody>
            @for (o of orders(); track o.order_id) {
              <tr>
                <td class="mono" [title]="o.order_id">{{ shortId(o.order_id) }}</td>
                <td class="mono" [title]="o.user_id">{{ shortId(o.user_id) }}</td>
                <td>{{ businessTypeLabel(o.business_type) }}</td>
                <td>{{ o.item_name || o.item_id || '-' }}</td>
                <td class="amount">{{ formatPrice(o.amount) }}</td>
                <td>{{ o.tier || '-' }}</td>
                <td>
                  <span class="status-badge" [style.background]="statusColor(o.status)">
                    {{ statusLabel(o.status) }}
                  </span>
                </td>
                <td class="time">{{ formatTime(o.created_at) }}</td>
                <td class="time">{{ formatTime(o.completed_at) }}</td>
              </tr>
            }
            @if (!isLoading() && orders().length === 0) {
              <tr><td colspan="9" class="empty">暫無購買訂單</td></tr>
            }
          </tbody>
        </table>
      </div>

      <!-- 分頁 -->
      <div class="pagination">
        <button (click)="prevPage()" [disabled]="offset() === 0 || isLoading()">上一頁</button>
        <span>第 {{ (offset() / pageSize) + 1 }} 頁</span>
        <button (click)="nextPage()" [disabled]="!hasMore() || isLoading()">下一頁</button>
      </div>
    </div>
  `,
  styles: [`
    .po-page { padding: 24px; color: #e2e8f0; }
    .po-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .po-header h1 { font-size: 22px; margin: 0; }
    .subtitle { color: #94a3b8; font-size: 13px; margin: 4px 0 0; }
    .refresh-btn { background: #06b6d4; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
    .refresh-btn:disabled { opacity: .6; cursor: default; }
    .filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
    .filter-chip { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 6px 14px; border-radius: 999px; cursor: pointer; font-size: 13px; }
    .filter-chip.active { background: #0ea5e9; color: #fff; border-color: #0ea5e9; }
    .error-banner { background: #7f1d1d; color: #fecaca; padding: 10px 14px; border-radius: 8px; margin-bottom: 12px; }
    .table-wrap { overflow-x: auto; border: 1px solid #1e293b; border-radius: 12px; }
    .po-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .po-table th, .po-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #1e293b; white-space: nowrap; }
    .po-table th { background: #0f172a; color: #94a3b8; font-weight: 600; }
    .mono { font-family: monospace; }
    .amount { font-weight: 600; color: #22d3ee; }
    .time { color: #94a3b8; }
    .status-badge { color: #fff; padding: 3px 10px; border-radius: 999px; font-size: 12px; }
    .empty { text-align: center; color: #64748b; padding: 32px; }
    .pagination { display: flex; align-items: center; gap: 16px; justify-content: center; margin-top: 16px; }
    .pagination button { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 6px 16px; border-radius: 8px; cursor: pointer; }
    .pagination button:disabled { opacity: .5; cursor: default; }
  `]
})
export class PurchaseOrdersComponent implements OnInit {
  private admin = inject(AdminService);
  private toast = inject(ToastService);

  orders = signal<PurchaseOrder[]>([]);
  isLoading = signal(false);
  error = signal('');
  statusFilter = signal('');
  offset = signal(0);
  readonly pageSize = 50;
  // list_all 無 total：滿頁即認為可能還有下一頁
  hasMore = computed(() => this.orders().length >= this.pageSize);

  statusFilters = [
    { value: '', label: '全部' },
    { value: 'completed', label: '已完成' },
    { value: 'refunded', label: '已退款' },
    { value: 'rejected', label: '已拒絕' },
    { value: 'failed', label: '失敗' },
    { value: 'pending', label: '待完成' },
  ];

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.error.set('');
    try {
      const res = await this.admin.getPurchaseOrders(this.statusFilter(), this.pageSize, this.offset());
      if (res?.success && Array.isArray(res.data)) {
        this.orders.set(res.data as PurchaseOrder[]);
      } else {
        this.error.set(res?.error || '載入失敗');
        this.orders.set([]);
      }
    } catch (e: any) {
      this.error.set(e?.message || '網絡錯誤');
    } finally {
      this.isLoading.set(false);
    }
  }

  reload(): void {
    this.offset.set(0);
    this.load();
  }

  setStatus(v: string): void {
    if (this.statusFilter() === v) return;
    this.statusFilter.set(v);
    this.offset.set(0);
    this.load();
  }

  nextPage(): void {
    if (!this.hasMore()) return;
    this.offset.set(this.offset() + this.pageSize);
    this.load();
  }

  prevPage(): void {
    if (this.offset() === 0) return;
    this.offset.set(Math.max(0, this.offset() - this.pageSize));
    this.load();
  }

  formatPrice(cents: number): string {
    return `$${((cents || 0) / 100).toFixed(2)}`;
  }

  formatTime(t?: string): string {
    if (!t) return '-';
    try {
      return new Date(t).toLocaleString('zh-TW');
    } catch {
      return t;
    }
  }

  shortId(id?: string): string {
    if (!id) return '-';
    return id.length > 12 ? id.slice(0, 12) + '…' : id;
  }

  businessTypeLabel(t: string): string {
    const m: Record<string, string> = {
      membership: '會員', ip_proxy: 'IP 代理', quota_pack: '配額包',
    };
    return m[t] || t;
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = {
      pending: '待完成', completed: '已完成', refunded: '已退款',
      failed: '失敗', rejected: '已拒絕',
    };
    return m[s] || s;
  }

  statusColor(s: string): string {
    const m: Record<string, string> = {
      pending: '#f59e0b', completed: '#22c55e', refunded: '#8b5cf6',
      failed: '#ef4444', rejected: '#64748b',
    };
    return m[s] || '#334155';
  }
}
