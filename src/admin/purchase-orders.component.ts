/**
 * 購買訂單對賬（管理端）
 *
 * 展示 purchase_orders 全量訂單，供客服/運營對賬、退款追溯。
 * 數據源：GET /api/v1/admin/purchase-orders（JWT admin，見 api_stats_routes.http_admin_purchase_orders）。
 * 金額單位為分，展示時 /100。
 */
import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  imports: [CommonModule, FormsModule],
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
              <th>操作</th>
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
                <td class="ops">
                  <button class="op-btn" (click)="viewDetail(o)">詳情</button>
                  @if (o.status === 'completed') {
                    <button class="op-btn danger" (click)="openRefund(o)">退款</button>
                  }
                </td>
              </tr>
            }
            @if (!isLoading() && orders().length === 0) {
              <tr><td colspan="10" class="empty">暫無購買訂單</td></tr>
            }
          </tbody>
        </table>
      </div>

      <!-- 分頁 -->
      <div class="pagination">
        <button (click)="prevPage()" [disabled]="offset() === 0 || isLoading()">上一頁</button>
        <span>第 {{ (offset() / pageSize) + 1 }} 頁 / 共 {{ total() }} 筆</span>
        <button (click)="nextPage()" [disabled]="!hasMore() || isLoading()">下一頁</button>
      </div>

      <!-- 訂單詳情彈窗 -->
      @if (detailOrder()) {
        <div class="modal-overlay" (click)="detailOrder.set(null)">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>訂單詳情</h3>
              <button class="close-btn" (click)="detailOrder.set(null)">×</button>
            </div>
            <div class="detail-grid">
              <div class="dl">訂單 ID</div><div class="dv mono">{{ detailOrder()!.order_id }}</div>
              <div class="dl">用戶 ID</div><div class="dv mono">{{ detailOrder()!.user_id }}</div>
              <div class="dl">業務類型</div><div class="dv">{{ businessTypeLabel(detailOrder()!.business_type) }}</div>
              <div class="dl">商品</div><div class="dv">{{ detailOrder()!.item_name || detailOrder()!.item_id || '-' }}</div>
              <div class="dl">金額</div><div class="dv amount">{{ formatPrice(detailOrder()!.amount) }}</div>
              <div class="dl">等級</div><div class="dv">{{ detailOrder()!.tier || '-' }}</div>
              <div class="dl">時長(天)</div><div class="dv">{{ detailOrder()!.duration_days || '-' }}</div>
              <div class="dl">狀態</div><div class="dv"><span class="status-badge" [style.background]="statusColor(detailOrder()!.status)">{{ statusLabel(detailOrder()!.status) }}</span></div>
              <div class="dl">流水號</div><div class="dv mono">{{ detailOrder()!.transaction_id || '-' }}</div>
              <div class="dl">建立時間</div><div class="dv">{{ formatTime(detailOrder()!.created_at) }}</div>
              <div class="dl">完成時間</div><div class="dv">{{ formatTime(detailOrder()!.completed_at) }}</div>
              @if (detailOrder()!.error_message) {
                <div class="dl">錯誤/備註</div><div class="dv err">{{ detailOrder()!.error_message }}</div>
              }
            </div>
          </div>
        </div>
      }

      <!-- 退款對話框 -->
      @if (refundOrder()) {
        <div class="modal-overlay" (click)="closeRefund()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>確認退款</h3>
              <button class="close-btn" (click)="closeRefund()">×</button>
            </div>
            <p class="refund-info">
              將退回 <strong class="amount">{{ formatPrice(refundOrder()!.amount) }}</strong>
              至用戶錢包（訂單 {{ shortId(refundOrder()!.order_id) }}）。
            </p>
            <p class="refund-warn">⚠️ 會員/配額權益不會自動撤銷，如需撤銷請另行在用戶管理處理。</p>
            <label class="refund-label">退款原因</label>
            <input class="refund-input" [(ngModel)]="refundReason" placeholder="請輸入退款原因" />
            <div class="modal-actions">
              <button class="btn-cancel" (click)="closeRefund()" [disabled]="refunding()">取消</button>
              <button class="btn-confirm" (click)="confirmRefund()" [disabled]="refunding()">
                {{ refunding() ? '處理中…' : '確認退款' }}
              </button>
            </div>
          </div>
        </div>
      }
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
    .ops { display: flex; gap: 6px; }
    .op-btn { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; }
    .op-btn.danger { background: #7f1d1d; color: #fecaca; border-color: #991b1b; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 20px; width: min(560px, 92vw); max-height: 86vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .modal-header h3 { margin: 0; font-size: 18px; }
    .close-btn { background: none; border: none; color: #94a3b8; font-size: 22px; cursor: pointer; line-height: 1; }
    .detail-grid { display: grid; grid-template-columns: 96px 1fr; gap: 8px 12px; font-size: 13px; }
    .dl { color: #94a3b8; }
    .dv { color: #e2e8f0; word-break: break-all; }
    .dv.err { color: #fca5a5; }
    .refund-info { font-size: 14px; margin: 4px 0 8px; }
    .refund-warn { font-size: 12px; color: #fbbf24; background: #422006; padding: 8px 10px; border-radius: 8px; margin: 8px 0; }
    .refund-label { display: block; font-size: 13px; color: #94a3b8; margin: 8px 0 4px; }
    .refund-input { width: 100%; box-sizing: border-box; background: #1e293b; border: 1px solid #334155; color: #e2e8f0; padding: 8px 10px; border-radius: 8px; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
    .btn-cancel { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
    .btn-confirm { background: #dc2626; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
    .btn-confirm:disabled, .btn-cancel:disabled { opacity: .6; cursor: default; }
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
  total = signal(0);
  readonly pageSize = 50;
  // 用後端返回的 total 精確判斷是否還有下一頁
  hasMore = computed(() => this.offset() + this.orders().length < this.total());

  // 詳情 / 退款
  detailOrder = signal<PurchaseOrder | null>(null);
  refundOrder = signal<PurchaseOrder | null>(null);
  refundReason = '';
  refunding = signal(false);

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
        this.total.set(typeof res.total === 'number' ? res.total : res.data.length);
      } else {
        this.error.set(res?.error || '載入失敗');
        this.orders.set([]);
        this.total.set(0);
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

  viewDetail(o: PurchaseOrder): void {
    this.detailOrder.set(o);
  }

  openRefund(o: PurchaseOrder): void {
    this.refundReason = '';
    this.refundOrder.set(o);
  }

  closeRefund(): void {
    if (this.refunding()) return;
    this.refundOrder.set(null);
  }

  async confirmRefund(): Promise<void> {
    const o = this.refundOrder();
    if (!o || this.refunding()) return;
    this.refunding.set(true);
    try {
      const res = await this.admin.refundPurchaseOrder(o.order_id, this.refundReason || '客服後台退款');
      if (res?.success) {
        this.toast.success(res.message || '退款成功');
        this.refundOrder.set(null);
        await this.load();
      } else {
        this.toast.error(res?.error || '退款失敗');
      }
    } catch (e: any) {
      this.toast.error(e?.message || '退款失敗');
    } finally {
      this.refunding.set(false);
    }
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
