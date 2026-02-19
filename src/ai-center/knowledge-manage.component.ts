/**
 * 📝 知識管理頁面
 * 
 * 展示所有已導入的知識，支持查看、編輯、刪除
 */
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RAGBrainService } from '../services/rag-brain.service';
import { DialogService } from '../services/dialog.service';
import { ToastService } from '../toast.service';
import { IpcService } from '../ipc.service';

interface KnowledgeItem {
  id: number;
  type: string;
  question: string;
  answer: string;
  context?: string;
  successScore: number;
  useCount: number;
  feedbackPositive: number;
  feedbackNegative: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

type TypeFilter = 'all' | 'qa' | 'product' | 'script' | 'faq' | 'objection' | 'greeting' | 'closing';
type SortOption = 'createdAt' | 'useCount' | 'successScore' | 'type';

@Component({
  selector: 'app-knowledge-manage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="knowledge-page">
      <!-- 頁面頭部 -->
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">
            <span class="title-icon">📝</span>
            知識管理
          </h1>
          <p class="page-desc">查看和管理已導入的所有知識，支持編輯和刪除</p>
        </div>
        <div class="header-actions">
          <button class="action-btn add" (click)="addKnowledge()">
            ➕ 添加知識
          </button>
          <button class="action-btn refresh" (click)="loadKnowledge()">
            🔄 刷新
          </button>
        </div>
      </div>
      
      <!-- 📊 統計概覽 -->
      <div class="stats-overview">
        <div class="stat-card total">
          <div class="stat-icon">📚</div>
          <div class="stat-info">
            <span class="stat-value">{{ totalKnowledge() }}</span>
            <span class="stat-label">知識總數</span>
          </div>
        </div>
        <div class="stat-card product">
          <div class="stat-icon">📦</div>
          <div class="stat-info">
            <span class="stat-value">{{ typeStats().product }}</span>
            <span class="stat-label">產品信息</span>
          </div>
        </div>
        <div class="stat-card qa">
          <div class="stat-icon">💬</div>
          <div class="stat-info">
            <span class="stat-value">{{ typeStats().qa }}</span>
            <span class="stat-label">問答</span>
          </div>
        </div>
        <div class="stat-card script">
          <div class="stat-icon">📜</div>
          <div class="stat-info">
            <span class="stat-value">{{ typeStats().script }}</span>
            <span class="stat-label">話術</span>
          </div>
        </div>
        <div class="stat-card score">
          <div class="stat-icon">⭐</div>
          <div class="stat-info">
            <span class="stat-value">{{ avgScore().toFixed(1) }}</span>
            <span class="stat-label">平均評分</span>
          </div>
        </div>
      </div>
      
      <!-- 🔧 過濾和操作欄 -->
      <div class="filter-bar">
        <div class="filter-left">
          <div class="search-box">
            <input type="text" 
                   [(ngModel)]="searchQuery" 
                   placeholder="搜索知識..."
                   (input)="applyFilters()">
          </div>
          
          <div class="filter-group">
            <label>類型：</label>
            <select [(ngModel)]="typeFilter" (change)="applyFilters()">
              <option value="all">全部</option>
              <option value="product">📦 產品</option>
              <option value="qa">💬 問答</option>
              <option value="script">📜 話術</option>
              <option value="faq">❓ FAQ</option>
              <option value="objection">🛡️ 異議處理</option>
              <option value="greeting">👋 開場白</option>
              <option value="closing">🎯 成交</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>排序：</label>
            <select [(ngModel)]="sortOption" (change)="applyFilters()">
              <option value="createdAt">🕐 時間</option>
              <option value="useCount">📊 使用次數</option>
              <option value="successScore">⭐ 評分</option>
              <option value="type">📂 類型</option>
            </select>
          </div>
        </div>
        
        <div class="filter-right">
          @if (selectedIds().length > 0) {
            <button class="batch-btn delete" (click)="deleteSelected()">
              🗑️ 刪除選中 ({{ selectedIds().length }})
            </button>
          }
        </div>
      </div>
      
      <!-- 📋 知識列表 -->
      <div class="knowledge-list">
        @if (isLoading()) {
          <div class="loading-state">
            <span class="spinner"></span>
            <span>載入中...</span>
          </div>
        } @else if (filteredKnowledge().length === 0) {
          <!-- 🆕 Phase 1: 豐富的空狀態設計 -->
          <div class="empty-knowledge-state">
            <div class="empty-hero">
              <div class="empty-brain-icon">🧠</div>
              <h3>知識庫還是空的</h3>
              <p>知識庫是 AI 自動回覆的"大腦"——越豐富，AI 回覆越精準</p>
            </div>

            <!-- 快速添加方式 -->
            <div class="empty-actions-grid">
              <button class="empty-action-card" (click)="addKnowledge()">
                <span class="action-icon">✏️</span>
                <strong>手動添加</strong>
                <span>自定義問答對</span>
              </button>
              <button class="empty-action-card empty-action-secondary">
                <span class="action-icon">📄</span>
                <strong>批量導入</strong>
                <span>上傳 CSV / Excel</span>
              </button>
              <button class="empty-action-card empty-action-secondary">
                <span class="action-icon">💬</span>
                <strong>從對話提取</strong>
                <span>分析歷史聊天記錄</span>
              </button>
            </div>

            <!-- 建議知識類型 -->
            <div class="empty-suggestions">
              <p class="suggestions-title">💡 建議先添加以下類型的知識：</p>
              <div class="suggestion-tags">
                <button class="suggestion-tag" (click)="addKnowledge()">產品介紹</button>
                <button class="suggestion-tag" (click)="addKnowledge()">常見問題</button>
                <button class="suggestion-tag" (click)="addKnowledge()">價格說明</button>
                <button class="suggestion-tag" (click)="addKnowledge()">開場白話術</button>
                <button class="suggestion-tag" (click)="addKnowledge()">異議處理</button>
              </div>
            </div>
          </div>
        } @else {
          @for (item of paginatedKnowledge(); track item.id; let i = $index) {
            <div class="knowledge-row" [class.selected]="isSelected(item.id)">
              <!-- 選擇框 -->
              <div class="item-checkbox">
                <input type="checkbox" 
                       [checked]="isSelected(item.id)" 
                       (change)="toggleSelect(item.id)">
              </div>
              
              <!-- 類型標籤 -->
              <div class="item-type">
                <span class="type-tag" [class]="'type-' + item.type">
                  {{ getTypeIcon(item.type) }} {{ getTypeName(item.type) }}
                </span>
              </div>
              
              <!-- 問題/關鍵詞 -->
              <div class="item-question" [title]="item.question">
                {{ truncateText(item.question, 60) }}
              </div>
              
              <!-- 答案 -->
              <div class="item-answer" [title]="item.answer">
                {{ truncateText(item.answer, 80) }}
              </div>
              
              <!-- 評分 -->
              <div class="item-score">
                <span class="score-badge" [class.high]="item.successScore >= 0.7" [class.low]="item.successScore < 0.4">
                  {{ (item.successScore * 10).toFixed(1) }}
                </span>
              </div>
              
              <!-- 使用次數 -->
              <div class="item-usage">
                {{ item.useCount }}次
              </div>
              
              <!-- 操作按鈕 -->
              <div class="item-actions">
                <button class="btn-icon edit" (click)="editKnowledge(item)" title="編輯">
                  ✏️
                </button>
                <button class="btn-icon delete" (click)="deleteKnowledge(item)" title="刪除">
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
                （共 {{ filteredKnowledge().length }} 條）
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
    .knowledge-page {
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
    
    .title-icon { font-size: 28px; }
    
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
    
    .action-btn.add {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
    }
    
    .action-btn.refresh {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
    }
    
    .action-btn:hover { filter: brightness(1.2); transform: translateY(-1px); }
    
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
    }
    
    .stat-icon { font-size: 28px; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-value { font-size: 22px; font-weight: 700; color: #fff; }
    .stat-label { font-size: 12px; color: #888; }
    
    .stat-card.total .stat-value { color: #a78bfa; }
    .stat-card.product .stat-value { color: #34d399; }
    .stat-card.qa .stat-value { color: #60a5fa; }
    .stat-card.script .stat-value { color: #fbbf24; }
    .stat-card.score .stat-value { color: #f87171; }
    
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
      gap: 16px;
    }
    
    .search-box input {
      padding: 8px 14px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: #fff;
      font-size: 13px;
      width: 200px;
    }
    
    .filter-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .filter-group label { font-size: 13px; color: #888; }
    
    .filter-group select {
      padding: 6px 12px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: #fff;
      font-size: 13px;
    }
    
    .batch-btn {
      padding: 8px 14px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      cursor: pointer;
    }
    
    .batch-btn.delete {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }
    
    /* 知識列表 */
    .knowledge-list {
      background: rgba(255, 255, 255, 0.03);
      border-radius: 14px;
      overflow: hidden;
    }
    
    .knowledge-row {
      display: grid;
      grid-template-columns: 40px 100px 1fr 1.5fr 60px 60px 80px;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      transition: all 0.15s;
    }
    
    .knowledge-row:hover { background: rgba(255, 255, 255, 0.04); }
    .knowledge-row.selected { background: rgba(168, 85, 247, 0.1); }
    .knowledge-row:last-child { border-bottom: none; }
    
    .item-checkbox input {
      width: 18px;
      height: 18px;
      accent-color: #a855f7;
    }
    
    .type-tag {
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
    }
    
    .type-tag.type-product { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .type-tag.type-qa { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
    .type-tag.type-script { background: rgba(234, 179, 8, 0.2); color: #fbbf24; }
    .type-tag.type-faq { background: rgba(168, 85, 247, 0.2); color: #c4b5fd; }
    .type-tag.type-objection { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .type-tag.type-greeting { background: rgba(6, 182, 212, 0.2); color: #22d3ee; }
    .type-tag.type-closing { background: rgba(236, 72, 153, 0.2); color: #f472b6; }
    
    .item-question { font-size: 14px; color: #e0e0e0; }
    .item-answer { font-size: 13px; color: #888; }
    
    .score-badge {
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 12px;
      background: rgba(100, 116, 139, 0.2);
      color: #94a3b8;
    }
    
    .score-badge.high { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .score-badge.low { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    
    .item-usage { font-size: 12px; color: #666; text-align: center; }
    
    .item-actions { display: flex; gap: 6px; justify-content: flex-end; }
    
    .btn-icon {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .btn-icon.edit { background: rgba(59, 130, 246, 0.2); }
    .btn-icon.delete { background: rgba(239, 68, 68, 0.2); }
    .btn-icon:hover { filter: brightness(1.3); transform: scale(1.08); }
    
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
    }
    
    .page-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.12); color: #fff; }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-info { font-size: 13px; color: #888; }
    
    /* 🆕 Phase 1: 豐富的空狀態 */
    .empty-knowledge-state {
      padding: 40px 20px;
      text-align: center;
    }
    .empty-hero { margin-bottom: 32px; }
    .empty-brain-icon { font-size: 72px; margin-bottom: 16px; filter: drop-shadow(0 0 20px rgba(168,85,247,0.3)); }
    .empty-hero h3 { font-size: 22px; font-weight: 700; color: #e0e0e0; margin: 0 0 8px; }
    .empty-hero p { font-size: 14px; color: #888; max-width: 360px; margin: 0 auto; line-height: 1.6; }

    .empty-actions-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      max-width: 520px;
      margin: 0 auto 28px;
    }
    .empty-action-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 16px 12px;
      background: linear-gradient(135deg, rgba(103,78,234,0.15), rgba(118,75,162,0.15));
      border: 1px solid rgba(103,78,234,0.3);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      color: #e0e0e0;
    }
    .empty-action-card:hover { background: linear-gradient(135deg, rgba(103,78,234,0.3), rgba(118,75,162,0.3)); transform: translateY(-2px); }
    .empty-action-secondary {
      background: rgba(255,255,255,0.04);
      border-color: rgba(255,255,255,0.1);
    }
    .empty-action-secondary:hover { background: rgba(255,255,255,0.08); }
    .action-icon { font-size: 28px; }
    .empty-action-card strong { font-size: 13px; font-weight: 600; }
    .empty-action-card span:last-child { font-size: 11px; color: #888; }

    .empty-suggestions { max-width: 520px; margin: 0 auto; text-align: left; }
    .suggestions-title { font-size: 13px; color: #888; margin: 0 0 10px; }
    .suggestion-tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .suggestion-tag {
      padding: 6px 14px;
      background: rgba(6,182,212,0.1);
      border: 1px solid rgba(6,182,212,0.25);
      border-radius: 20px;
      font-size: 13px;
      color: #22d3ee;
      cursor: pointer;
      transition: all 0.15s;
    }
    .suggestion-tag:hover { background: rgba(6,182,212,0.2); }

    /* 舊版空狀態（保留兼容） */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }
    .empty-icon { font-size: 64px; display: block; margin-bottom: 16px; }
    .empty-state h3 { font-size: 18px; margin: 0 0 8px 0; color: #e0e0e0; }
    .empty-state p { font-size: 14px; color: #888; margin: 0 0 20px 0; }
    
    .add-btn {
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border: none;
      border-radius: 10px;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
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
    
    @keyframes spin { to { transform: rotate(360deg); } }
    
    /* 響應式 */
    @media (max-width: 1200px) {
      .stats-overview { grid-template-columns: repeat(3, 1fr); }
      .knowledge-row { grid-template-columns: 40px 80px 1fr 60px 60px; }
      .item-answer { display: none; }
    }
    
    @media (max-width: 768px) {
      .stats-overview { grid-template-columns: repeat(2, 1fr); }
      .filter-bar { flex-direction: column; gap: 12px; }
      .knowledge-row { grid-template-columns: 40px 1fr 60px 60px; }
      .item-type { display: none; }
    }
  `]
})
export class KnowledgeManageComponent implements OnInit {
  private ragService = inject(RAGBrainService);
  private dialogService = inject(DialogService);
  private toastService = inject(ToastService);
  private ipc = inject(IpcService);
  
  // 狀態
  isLoading = signal(false);
  knowledge = signal<KnowledgeItem[]>([]);
  selectedIds = signal<number[]>([]);
  currentPage = signal(1);
  pageSize = 20;
  
  // 過濾
  searchQuery = '';
  typeFilter: TypeFilter = 'all';
  sortOption: SortOption = 'createdAt';
  
  // 計算屬性
  filteredKnowledge = computed(() => {
    let result = [...this.knowledge()];
    
    // 搜索
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(k => 
        k.question.toLowerCase().includes(query) ||
        k.answer.toLowerCase().includes(query)
      );
    }
    
    // 類型過濾
    if (this.typeFilter !== 'all') {
      result = result.filter(k => k.type === this.typeFilter);
    }
    
    // 排序
    result.sort((a, b) => {
      switch (this.sortOption) {
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'useCount':
          return b.useCount - a.useCount;
        case 'successScore':
          return b.successScore - a.successScore;
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });
    
    return result;
  });
  
  paginatedKnowledge = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredKnowledge().slice(start, start + this.pageSize);
  });
  
  totalPages = computed(() => Math.ceil(this.filteredKnowledge().length / this.pageSize));
  totalKnowledge = computed(() => this.knowledge().length);
  
  typeStats = computed(() => {
    const stats = { product: 0, qa: 0, script: 0, faq: 0, objection: 0, greeting: 0, closing: 0 };
    this.knowledge().forEach(k => {
      const type = k.type as keyof typeof stats;
      if (stats[type] !== undefined) stats[type]++;
    });
    return stats;
  });
  
  avgScore = computed(() => {
    const items = this.knowledge();
    if (items.length === 0) return 0;
    return items.reduce((sum, k) => sum + k.successScore, 0) / items.length;
  });
  
  ngOnInit() {
    this.loadKnowledge();
  }
  
  async loadKnowledge() {
    this.isLoading.set(true);
    try {
      const result = await this.ipc.invoke('rag-get-all-knowledge', {});
      if (result?.success && result.knowledge) {
        this.knowledge.set(result.knowledge.map((k: any) => ({
          id: k.id,
          type: k.knowledge_type || k.type || 'qa',
          question: k.question || '',
          answer: k.answer || '',
          context: k.context || '',
          successScore: k.success_score || k.successScore || 0.5,
          useCount: k.use_count || k.useCount || 0,
          feedbackPositive: k.feedback_positive || 0,
          feedbackNegative: k.feedback_negative || 0,
          isActive: k.is_active !== false,
          createdAt: k.created_at || k.createdAt || new Date().toISOString(),
          updatedAt: k.updated_at || k.updatedAt
        })));
      }
    } catch (err) {
      console.error('Failed to load knowledge:', err);
      this.toastService.error('載入知識失敗');
    } finally {
      this.isLoading.set(false);
    }
  }
  
  applyFilters() {
    this.currentPage.set(1);
    this.selectedIds.set([]);
  }
  
  // 選擇操作
  isSelected(id: number): boolean { return this.selectedIds().includes(id); }
  
  toggleSelect(id: number): void {
    const current = this.selectedIds();
    if (current.includes(id)) {
      this.selectedIds.set(current.filter(i => i !== id));
    } else {
      this.selectedIds.set([...current, id]);
    }
  }
  
  // 操作
  addKnowledge() {
    this.dialogService.prompt({
      title: '添加知識',
      message: '請輸入問題：',
      placeholder: '例如：費率是多少？',
      confirmText: '下一步',
      onConfirm: (question) => {
        if (question) {
          this.dialogService.prompt({
            title: '添加知識',
            message: `問題: "${question}"\n\n請輸入答案：`,
            placeholder: '專業的回答...',
            confirmText: '添加',
            onConfirm: async (answer) => {
              if (answer) {
                try {
                  await this.ipc.invoke('rag-add-knowledge', {
                    type: 'qa',
                    question,
                    answer
                  });
                  this.toastService.success('添加成功');
                  this.loadKnowledge();
                } catch {
                  this.toastService.error('添加失敗');
                }
              }
            }
          });
        }
      }
    });
  }
  
  editKnowledge(item: KnowledgeItem) {
    this.dialogService.prompt({
      title: '編輯知識',
      message: `問題: "${item.question}"\n\n請修改答案：`,
      placeholder: item.answer,
      defaultValue: item.answer,
      confirmText: '保存',
      onConfirm: async (newAnswer) => {
        if (newAnswer && newAnswer !== item.answer) {
          try {
            await this.ipc.invoke('rag-update-knowledge', {
              id: item.id,
              answer: newAnswer
            });
            this.toastService.success('更新成功');
            this.loadKnowledge();
          } catch {
            this.toastService.error('更新失敗');
          }
        }
      }
    });
  }
  
  async deleteKnowledge(item: KnowledgeItem) {
    try {
      await this.ipc.invoke('rag-delete-knowledge', { id: item.id });
      this.knowledge.set(this.knowledge().filter(k => k.id !== item.id));
      this.toastService.success('已刪除');
    } catch {
      this.toastService.error('刪除失敗');
    }
  }
  
  async deleteSelected() {
    const ids = this.selectedIds();
    if (ids.length === 0) return;
    
    try {
      await this.ipc.invoke('rag-delete-knowledge-batch', { ids });
      this.knowledge.set(this.knowledge().filter(k => !ids.includes(k.id)));
      this.selectedIds.set([]);
      this.toastService.success(`已刪除 ${ids.length} 條`);
    } catch {
      this.toastService.error('刪除失敗');
    }
  }
  
  // 分頁
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }
  
  // 輔助方法
  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }
  
  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'product': '📦', 'qa': '💬', 'script': '📜', 'faq': '❓',
      'objection': '🛡️', 'greeting': '👋', 'closing': '🎯'
    };
    return icons[type] || '📝';
  }
  
  getTypeName(type: string): string {
    const names: Record<string, string> = {
      'product': '產品', 'qa': '問答', 'script': '話術', 'faq': 'FAQ',
      'objection': '異議', 'greeting': '開場', 'closing': '成交'
    };
    return names[type] || type;
  }
}
