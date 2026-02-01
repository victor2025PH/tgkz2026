/**
 * 🔍 知識缺口管理頁面
 * 
 * 獨立頁面，專注於知識缺口的管理和處理
 * - 開發工程師視角：清晰的數據結構和 API
 * - 市場經理視角：業務價值導向的統計
 * - 用戶視角：簡潔高效的操作體驗
 */
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RAGBrainService } from '../services/rag-brain.service';
import { DialogService } from '../services/dialog.service';
import { ToastService } from '../toast.service';

interface KnowledgeGap {
  id: number;
  query: string;
  hitCount: number;
  bestSimilarity: number;
  suggestedAnswer?: string;
  suggestedType?: string;
  status: string;
  category?: string;
  createdAt: string;
  updatedAt?: string;
}

type CategoryFilter = 'all' | 'price' | 'process' | 'product' | 'support' | 'other';
type SortOption = 'hitCount' | 'createdAt' | 'category';

@Component({
  selector: 'app-knowledge-gaps',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="gaps-page">
      <!-- 頁面頭部 -->
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">
            <span class="title-icon">❓</span>
            知識缺口管理
          </h1>
          <p class="page-desc">用戶問了但知識庫沒有答案的問題，優先處理熱門問題可提升 AI 回覆質量</p>
        </div>
        <div class="header-actions">
          <button class="action-btn cleanup" (click)="cleanupAllInvalid()">
            🧹 深度清理
          </button>
          <button class="action-btn refresh" (click)="refreshGaps()">
            🔄 刷新
          </button>
        </div>
      </div>
      
      <!-- 📊 統計概覽 -->
      <div class="stats-overview">
        <div class="stat-card total">
          <div class="stat-icon">📋</div>
          <div class="stat-info">
            <span class="stat-value">{{ totalGaps() }}</span>
            <span class="stat-label">待處理</span>
          </div>
        </div>
        <div class="stat-card hot">
          <div class="stat-icon">🔥</div>
          <div class="stat-info">
            <span class="stat-value">{{ hotGapsCount() }}</span>
            <span class="stat-label">熱門問題</span>
          </div>
        </div>
        <div class="stat-card price">
          <div class="stat-icon">💰</div>
          <div class="stat-info">
            <span class="stat-value">{{ categoryStats().price }}</span>
            <span class="stat-label">價格相關</span>
          </div>
        </div>
        <div class="stat-card process">
          <div class="stat-icon">📋</div>
          <div class="stat-info">
            <span class="stat-value">{{ categoryStats().process }}</span>
            <span class="stat-label">流程相關</span>
          </div>
        </div>
        <div class="stat-card product">
          <div class="stat-icon">📦</div>
          <div class="stat-info">
            <span class="stat-value">{{ categoryStats().product }}</span>
            <span class="stat-label">產品相關</span>
          </div>
        </div>
      </div>
      
      <!-- 🔧 過濾和操作欄 -->
      <div class="filter-bar">
        <div class="filter-left">
          <label class="select-all">
            <input type="checkbox" 
                   [checked]="isAllSelected()" 
                   [indeterminate]="isPartialSelected()"
                   (change)="toggleSelectAll()">
            <span>全選</span>
          </label>
          
          <div class="filter-group">
            <label>分類：</label>
            <select [(ngModel)]="categoryFilter" (change)="applyFilters()">
              <option value="all">全部</option>
              <option value="price">💰 價格</option>
              <option value="process">📋 流程</option>
              <option value="product">📦 產品</option>
              <option value="support">🛠️ 售後</option>
              <option value="other">❓ 其他</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>排序：</label>
            <select [(ngModel)]="sortOption" (change)="applyFilters()">
              <option value="hitCount">🔥 熱度</option>
              <option value="createdAt">🕐 時間</option>
              <option value="category">📂 分類</option>
            </select>
          </div>
        </div>
        
        <div class="filter-right">
          @if (selectedIds().length > 0) {
            <button class="batch-btn delete" (click)="deleteSelected()">
              🗑️ 刪除選中 ({{ selectedIds().length }})
            </button>
            <button class="batch-btn resolve" (click)="batchResolve()">
              ✅ 批量採用
            </button>
          }
        </div>
      </div>
      
      <!-- 📋 缺口列表 -->
      <div class="gaps-list">
        @if (isLoading()) {
          <div class="loading-state">
            <span class="spinner"></span>
            <span>載入中...</span>
          </div>
        } @else if (filteredGaps().length === 0) {
          <div class="empty-state">
            <span class="empty-icon">✨</span>
            <h3>沒有待處理的知識缺口</h3>
            <p>知識庫覆蓋良好，繼續保持！</p>
          </div>
        } @else {
          @for (gap of paginatedGaps(); track gap.id; let i = $index) {
            <div class="gap-row" [class.selected]="isSelected(gap.id)">
              <!-- 選擇框 -->
              <div class="gap-checkbox">
                <input type="checkbox" 
                       [checked]="isSelected(gap.id)" 
                       (change)="toggleSelect(gap.id)">
              </div>
              
              <!-- 序號 -->
              <div class="gap-index">{{ (currentPage() - 1) * pageSize + i + 1 }}</div>
              
              <!-- 分類標籤 -->
              <div class="gap-category">
                <span class="category-tag" [class]="'cat-' + (gap.category || 'other')">
                  {{ getCategoryIcon(gap.category) }}
                </span>
              </div>
              
              <!-- 問題內容 -->
              <div class="gap-content">
                <div class="gap-query" [title]="gap.query">
                  {{ truncateText(gap.query, 80) }}
                </div>
                @if (gap.suggestedAnswer) {
                  <div class="gap-answer">
                    <span class="answer-label">💡 AI:</span>
                    {{ truncateText(gap.suggestedAnswer, 100) }}
                  </div>
                }
              </div>
              
              <!-- 熱度 -->
              <div class="gap-hits">
                <span class="hits-badge" [class.hot]="gap.hitCount >= 5">
                  {{ gap.hitCount }}次
                </span>
                @if (gap.hitCount >= 5) {
                  <span class="hot-tag">🔥</span>
                }
              </div>
              
              <!-- 時間 -->
              <div class="gap-time">
                {{ formatTime(gap.createdAt) }}
              </div>
              
              <!-- 操作按鈕 -->
              <div class="gap-actions">
                @if (!gap.suggestedAnswer) {
                  <button class="btn-icon generate" 
                          (click)="generateAnswer(gap)" 
                          title="AI 生成答案">
                    🤖
                  </button>
                }
                <button class="btn-icon resolve" 
                        (click)="resolveGap(gap)" 
                        title="採用並添加到知識庫">
                  ✅
                </button>
                <button class="btn-icon delete" 
                        (click)="deleteGap(gap)" 
                        title="刪除">
                  🗑️
                </button>
              </div>
            </div>
          }
          
          <!-- 分頁 -->
          @if (totalPages() > 1) {
            <div class="pagination">
              <button class="page-btn" 
                      [disabled]="currentPage() === 1"
                      (click)="goToPage(currentPage() - 1)">
                ← 上一頁
              </button>
              <span class="page-info">
                第 {{ currentPage() }} / {{ totalPages() }} 頁
                （共 {{ filteredGaps().length }} 條）
              </span>
              <button class="page-btn" 
                      [disabled]="currentPage() === totalPages()"
                      (click)="goToPage(currentPage() + 1)">
                下一頁 →
              </button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .gaps-page {
      padding: 24px;
      background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
      min-height: 100vh;
      color: #fff;
    }
    
    /* 頁面頭部 */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
    }
    
    .page-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 8px 0;
    }
    
    .title-icon {
      font-size: 28px;
    }
    
    .page-desc {
      color: #888;
      font-size: 14px;
      margin: 0;
    }
    
    .header-actions {
      display: flex;
      gap: 10px;
    }
    
    .action-btn {
      padding: 10px 16px;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .action-btn.cleanup {
      background: rgba(234, 179, 8, 0.2);
      color: #fbbf24;
    }
    
    .action-btn.refresh {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
    }
    
    .action-btn:hover {
      filter: brightness(1.2);
      transform: translateY(-1px);
    }
    
    /* 統計概覽 */
    .stats-overview {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .stat-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px 20px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: all 0.2s;
    }
    
    .stat-card:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
    }
    
    .stat-icon {
      font-size: 28px;
    }
    
    .stat-info {
      display: flex;
      flex-direction: column;
    }
    
    .stat-value {
      font-size: 22px;
      font-weight: 700;
      color: #fff;
    }
    
    .stat-label {
      font-size: 12px;
      color: #888;
    }
    
    .stat-card.total .stat-value { color: #a78bfa; }
    .stat-card.hot .stat-value { color: #f87171; }
    .stat-card.price .stat-value { color: #fbbf24; }
    .stat-card.process .stat-value { color: #60a5fa; }
    .stat-card.product .stat-value { color: #34d399; }
    
    /* 過濾欄 */
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
      margin-bottom: 16px;
    }
    
    .filter-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    
    .select-all {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 14px;
      color: #aaa;
    }
    
    .select-all input {
      width: 18px;
      height: 18px;
      accent-color: #a855f7;
    }
    
    .filter-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .filter-group label {
      font-size: 13px;
      color: #888;
    }
    
    .filter-group select {
      padding: 6px 12px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: #fff;
      font-size: 13px;
      cursor: pointer;
    }
    
    .filter-right {
      display: flex;
      gap: 10px;
    }
    
    .batch-btn {
      padding: 8px 14px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .batch-btn.delete {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }
    
    .batch-btn.resolve {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
    }
    
    .batch-btn:hover {
      filter: brightness(1.2);
    }
    
    /* 缺口列表 */
    .gaps-list {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 14px;
      overflow: hidden;
    }
    
    .gap-row {
      display: grid;
      grid-template-columns: 40px 40px 50px 1fr 80px 80px 100px;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      transition: all 0.15s;
    }
    
    .gap-row:hover {
      background: rgba(255, 255, 255, 0.04);
    }
    
    .gap-row.selected {
      background: rgba(168, 85, 247, 0.1);
    }
    
    .gap-row:last-child {
      border-bottom: none;
    }
    
    .gap-checkbox input {
      width: 18px;
      height: 18px;
      accent-color: #a855f7;
      cursor: pointer;
    }
    
    .gap-index {
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    
    .gap-category {
      text-align: center;
    }
    
    .category-tag {
      font-size: 18px;
    }
    
    .gap-content {
      min-width: 0;
    }
    
    .gap-query {
      font-size: 14px;
      color: #e0e0e0;
      line-height: 1.4;
      margin-bottom: 4px;
    }
    
    .gap-answer {
      font-size: 12px;
      color: #888;
      padding: 6px 10px;
      background: rgba(168, 85, 247, 0.1);
      border-radius: 6px;
      margin-top: 6px;
    }
    
    .answer-label {
      color: #a855f7;
      margin-right: 4px;
    }
    
    .gap-hits {
      display: flex;
      align-items: center;
      gap: 4px;
      justify-content: center;
    }
    
    .hits-badge {
      padding: 3px 8px;
      background: rgba(100, 116, 139, 0.2);
      border-radius: 10px;
      font-size: 12px;
      color: #94a3b8;
    }
    
    .hits-badge.hot {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }
    
    .hot-tag {
      font-size: 14px;
    }
    
    .gap-time {
      font-size: 12px;
      color: #666;
      text-align: center;
    }
    
    .gap-actions {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
    }
    
    .btn-icon {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .btn-icon.generate {
      background: rgba(168, 85, 247, 0.2);
    }
    
    .btn-icon.resolve {
      background: rgba(16, 185, 129, 0.2);
    }
    
    .btn-icon.delete {
      background: rgba(239, 68, 68, 0.2);
    }
    
    .btn-icon:hover {
      filter: brightness(1.3);
      transform: scale(1.08);
    }
    
    /* 分頁 */
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .page-btn {
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.08);
      border: none;
      border-radius: 8px;
      color: #aaa;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .page-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
    }
    
    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    
    .page-info {
      font-size: 13px;
      color: #888;
    }
    
    /* 空狀態 */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }
    
    .empty-icon {
      font-size: 64px;
      display: block;
      margin-bottom: 16px;
    }
    
    .empty-state h3 {
      font-size: 18px;
      margin: 0 0 8px 0;
      color: #e0e0e0;
    }
    
    .empty-state p {
      font-size: 14px;
      color: #888;
      margin: 0;
    }
    
    /* 載入狀態 */
    .loading-state {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 60px;
      color: #888;
    }
    
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-top-color: #a855f7;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    /* 響應式 */
    @media (max-width: 1200px) {
      .stats-overview {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    
    @media (max-width: 900px) {
      .gap-row {
        grid-template-columns: 40px 40px 1fr 60px 80px;
      }
      
      .gap-category, .gap-time {
        display: none;
      }
      
      .stats-overview {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    @media (max-width: 600px) {
      .page-header {
        flex-direction: column;
        gap: 16px;
      }
      
      .filter-bar {
        flex-direction: column;
        gap: 12px;
      }
      
      .filter-left, .filter-right {
        width: 100%;
        justify-content: space-between;
      }
      
      .stats-overview {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class KnowledgeGapsComponent implements OnInit {
  private ragService = inject(RAGBrainService);
  private dialogService = inject(DialogService);
  private toastService = inject(ToastService);
  
  // 狀態
  isLoading = signal(false);
  gaps = signal<KnowledgeGap[]>([]);
  selectedIds = signal<number[]>([]);
  currentPage = signal(1);
  pageSize = 20;
  
  // 過濾
  categoryFilter: CategoryFilter = 'all';
  sortOption: SortOption = 'hitCount';
  
  // 計算屬性
  filteredGaps = computed(() => {
    let result = [...this.gaps()];
    
    // 過濾分類
    if (this.categoryFilter !== 'all') {
      result = result.filter(g => (g.category || 'other') === this.categoryFilter);
    }
    
    // 排序
    result.sort((a, b) => {
      switch (this.sortOption) {
        case 'hitCount':
          return b.hitCount - a.hitCount;
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'category':
          return (a.category || 'z').localeCompare(b.category || 'z');
        default:
          return 0;
      }
    });
    
    return result;
  });
  
  paginatedGaps = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredGaps().slice(start, start + this.pageSize);
  });
  
  totalPages = computed(() => Math.ceil(this.filteredGaps().length / this.pageSize));
  totalGaps = computed(() => this.gaps().length);
  hotGapsCount = computed(() => this.gaps().filter(g => g.hitCount >= 5).length);
  
  categoryStats = computed(() => {
    const stats = { price: 0, process: 0, product: 0, support: 0, other: 0 };
    this.gaps().forEach(g => {
      const cat = (g.category || 'other') as keyof typeof stats;
      if (stats[cat] !== undefined) stats[cat]++;
    });
    return stats;
  });
  
  ngOnInit() {
    this.loadGaps();
  }
  
  async loadGaps() {
    this.isLoading.set(true);
    try {
      // 從 RAG 服務獲取缺口
      await this.ragService.getKnowledgeGaps();
      // 監聽服務中的數據變化
      this.gaps.set(this.ragService.knowledgeGaps() as KnowledgeGap[]);
    } finally {
      this.isLoading.set(false);
    }
  }
  
  refreshGaps() {
    this.loadGaps();
    this.toastService.success('已刷新');
  }
  
  applyFilters() {
    this.currentPage.set(1);
    this.selectedIds.set([]);
  }
  
  // ==================== 選擇操作 ====================
  
  isSelected(id: number): boolean {
    return this.selectedIds().includes(id);
  }
  
  toggleSelect(id: number): void {
    const current = this.selectedIds();
    if (current.includes(id)) {
      this.selectedIds.set(current.filter(i => i !== id));
    } else {
      this.selectedIds.set([...current, id]);
    }
  }
  
  isAllSelected(): boolean {
    const current = this.paginatedGaps();
    return current.length > 0 && current.every(g => this.selectedIds().includes(g.id));
  }
  
  isPartialSelected(): boolean {
    const current = this.paginatedGaps();
    const selected = current.filter(g => this.selectedIds().includes(g.id));
    return selected.length > 0 && selected.length < current.length;
  }
  
  toggleSelectAll(): void {
    const current = this.paginatedGaps();
    if (this.isAllSelected()) {
      // 取消當前頁全選
      const currentIds = current.map(g => g.id);
      this.selectedIds.set(this.selectedIds().filter(id => !currentIds.includes(id)));
    } else {
      // 選中當前頁全部
      const newIds = [...new Set([...this.selectedIds(), ...current.map(g => g.id)])];
      this.selectedIds.set(newIds);
    }
  }
  
  // ==================== 操作方法 ====================
  
  generateAnswer(gap: KnowledgeGap) {
    this.ragService.suggestGapAnswer(gap.id, gap.query);
    this.toastService.info('正在生成 AI 建議...');
  }
  
  resolveGap(gap: KnowledgeGap) {
    const answer = gap.suggestedAnswer || '';
    
    this.dialogService.prompt({
      title: '解決知識缺口',
      message: `問題: "${this.truncateText(gap.query, 60)}"\n\n請輸入回答:`,
      placeholder: answer || '專業的回答...',
      defaultValue: answer,
      confirmText: '添加到知識庫',
      onConfirm: (finalAnswer) => {
        if (finalAnswer) {
          this.ragService.resolveGap(gap.id, 'faq', gap.query, finalAnswer);
          this.toastService.success('已添加到知識庫');
          this.loadGaps();
        }
      }
    });
  }
  
  deleteGap(gap: KnowledgeGap) {
    this.ragService.deleteGap(gap.id);
    this.gaps.set(this.gaps().filter(g => g.id !== gap.id));
    this.toastService.success('已刪除');
  }
  
  deleteSelected() {
    const ids = this.selectedIds();
    if (ids.length === 0) return;
    
    this.ragService.deleteGapsBatch(ids);
    this.gaps.set(this.gaps().filter(g => !ids.includes(g.id)));
    this.selectedIds.set([]);
    this.toastService.success(`已刪除 ${ids.length} 條`);
  }
  
  batchResolve() {
    const selected = this.paginatedGaps().filter(g => 
      this.selectedIds().includes(g.id) && g.suggestedAnswer
    );
    
    if (selected.length === 0) {
      this.toastService.warning('請選擇有 AI 建議的缺口');
      return;
    }
    
    // 批量採用
    selected.forEach(gap => {
      this.ragService.resolveGap(gap.id, 'faq', gap.query, gap.suggestedAnswer!);
    });
    
    this.selectedIds.set([]);
    this.toastService.success(`已批量採用 ${selected.length} 條`);
    this.loadGaps();
  }
  
  cleanupAllInvalid() {
    this.ragService.cleanupDuplicateGaps();
    this.toastService.info('正在深度清理...');
    
    // 延遲刷新
    setTimeout(() => this.loadGaps(), 1500);
  }
  
  // ==================== 分頁 ====================
  
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.selectedIds.set([]);
    }
  }
  
  // ==================== 輔助方法 ====================
  
  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }
  
  getCategoryIcon(category?: string): string {
    const icons: Record<string, string> = {
      'price': '💰',
      'process': '📋',
      'product': '📦',
      'support': '🛠️',
      'other': '❓'
    };
    return icons[category || 'other'] || '❓';
  }
  
  formatTime(timestamp: string): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '剛剛';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
    
    return date.toLocaleDateString('zh-TW');
  }
}
