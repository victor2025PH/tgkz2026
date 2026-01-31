/**
 * 🧠 RAG Brain Service - AI 知識大腦 2.0
 * 
 * 革命性的知識管理系統：
 * - 對話式知識構建
 * - 語義向量搜索
 * - 自動從對話學習
 * - 知識健康度監控
 */
import { Injectable, signal, computed } from '@angular/core';
import { IpcService } from '../ipc.service';
import { ToastService } from '../toast.service';

// ==================== 類型定義 ====================

export interface RAGKnowledge {
  id: number;
  type: 'qa' | 'script' | 'product' | 'objection' | 'greeting' | 'closing' | 'faq' | 'custom';
  question: string;
  answer: string;
  context?: string;
  keywords: string[];
  successScore: number;
  useCount: number;
  feedbackPositive: number;
  feedbackNegative: number;
  createdAt: string;
  updatedAt: string;
}

export interface RAGSearchResult {
  item: RAGKnowledge;
  similarity: number;
  source: 'vector' | 'keyword' | 'hybrid';
}

export interface RAGStats {
  totalKnowledge: number;
  totalUses: number;
  avgScore: number;
  byType: Record<string, {
    count: number;
    avgScore: number;
    uses: number;
    positiveFeedback: number;
    negativeFeedback: number;
  }>;
  vectorCount?: number;
  chromadbEnabled: boolean;
  neuralEmbedding: boolean;
  learning?: {
    sessionsProcessed: number;
    totalQaExtracted: number;
    totalScriptsExtracted: number;
    avgQualityScore: number;
  };
}

export interface LearningEvent {
  id: string;
  timestamp: string;
  type: 'new_knowledge' | 'quality_update' | 'feedback' | 'auto_learn';
  description: string;
  details: {
    userId?: string;
    knowledgeType?: string;
    count?: number;
    quality?: number;
  };
}

export interface ConversationBuildRequest {
  businessDescription: string;
  industry?: string;
  targetAudience?: string;
  keyProducts?: string[];
  uniqueAdvantages?: string[];
}

export interface ConversationBuildProgress {
  step: number;
  totalSteps: number;
  currentAction: string;
  itemsGenerated: number;
}

// 🆕 知識缺口
export interface KnowledgeGap {
  id: number;
  query: string;
  hitCount: number;
  bestSimilarity: number;
  suggestedAnswer?: string;
  suggestedType: string;
  status: 'pending' | 'resolved' | 'ignored';
  createdAt: string;
  updatedAt: string;
}

// 🆕 健康度報告
export interface HealthReport {
  overallScore: number;
  completeness: {
    score: number;
    details: Record<string, { actual: number; recommended: number; ratio: number }>;
  };
  effectiveness: {
    score: number;
    details: {
      avgScore: number;
      totalUses: number;
      satisfaction: number;
      positiveFeedback: number;
      negativeFeedback: number;
    };
  };
  freshness: {
    score: number;
    details: {
      total: number;
      recentlyUpdated: number;
      stale: number;
      staleRatio: number;
    };
  };
  gaps: {
    count: number;
    topGaps: KnowledgeGap[];
  };
  suggestions: Array<{
    type: string;
    priority: 'high' | 'medium' | 'low';
    message: string;
  }>;
}

// 🆕 引導式構建問題
export interface GuidedQuestion {
  step: number;
  totalSteps: number;
  title: string;
  question: string;
  type: 'select' | 'multiselect' | 'textarea' | 'text';
  options?: Array<{ id: string; label: string }>;
  placeholder?: string;
  suggestions?: string[];
}

// ==================== 服務實現 ====================

@Injectable({ providedIn: 'root' })
export class RAGBrainService {
  
  // ==================== 狀態信號 ====================
  
  private _isInitialized = signal(false);
  private _isLoading = signal(false);
  private _isSearching = signal(false);  // 🆕 單獨的搜索狀態
  private _stats = signal<RAGStats | null>(null);
  private _recentKnowledge = signal<RAGKnowledge[]>([]);
  private _learningEvents = signal<LearningEvent[]>([]);
  private _searchResults = signal<RAGSearchResult[]>([]);
  private _buildProgress = signal<ConversationBuildProgress | null>(null);
  private _healthScore = signal(0);
  
  // 🆕 知識缺口和健康度
  private _knowledgeGaps = signal<KnowledgeGap[]>([]);
  private _healthReport = signal<HealthReport | null>(null);
  private _guidedQuestion = signal<GuidedQuestion | null>(null);
  private _guidedAnswers = signal<Record<string, any>>({});
  
  // 🆕 P1-2: 導入結果追蹤
  private _lastImportResult = signal<{
    success: boolean;
    totalItems: number;
    stats: Record<string, number>;
    source: string;
  } | null>(null);
  
  // 🔧 Phase 5: 錯誤狀態追蹤（用於 API Key 缺失等情況）
  private _lastError = signal<{
    type: string;
    message: string;
    action?: string;
  } | null>(null);
  
  // 公開錯誤狀態
  lastError = computed(() => this._lastError());
  
  // 清除錯誤狀態
  clearLastError(): void {
    this._lastError.set(null);
  }
  
  // 🔧 P0: 請求超時管理
  private _pendingRequests = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly REQUEST_TIMEOUT = 15000; // 15 秒超時
  
  // 🔧 P1: 請求狀態追蹤
  private _currentRequest = signal<string | null>(null);
  private _requestStartTime = signal<number>(0);
  
  // 公開的請求狀態
  currentRequest = computed(() => this._currentRequest());
  requestElapsed = computed(() => {
    const start = this._requestStartTime();
    if (!start) return 0;
    return Date.now() - start;
  });
  
  // 公開的計算屬性
  isInitialized = computed(() => this._isInitialized());
  isLoading = computed(() => this._isLoading());
  isSearching = computed(() => this._isSearching());  // 🆕 單獨的搜索狀態
  stats = computed(() => this._stats());
  recentKnowledge = computed(() => this._recentKnowledge());
  learningEvents = computed(() => this._learningEvents());
  searchResults = computed(() => this._searchResults());
  buildProgress = computed(() => this._buildProgress());
  healthScore = computed(() => this._healthScore());
  
  // 🆕 知識缺口和健康度
  knowledgeGaps = computed(() => this._knowledgeGaps());
  healthReport = computed(() => this._healthReport());
  guidedQuestion = computed(() => this._guidedQuestion());
  gapsCount = computed(() => this._knowledgeGaps().length);
  
  // 統計計算
  totalKnowledge = computed(() => this._stats()?.totalKnowledge || 0);
  hitRate = computed(() => {
    const s = this._stats();
    if (!s || s.totalKnowledge === 0) return 0;
    return Math.round((s.totalUses / Math.max(1, s.totalKnowledge * 10)) * 100);
  });
  todayLearned = computed(() => {
    return this._learningEvents().filter(e => {
      const today = new Date().toDateString();
      return new Date(e.timestamp).toDateString() === today;
    }).length;
  });
  
  constructor(
    private ipcService: IpcService,
    private toastService: ToastService
  ) {
    this.setupEventListeners();
  }
  
  // ==================== 🔧 P0: 超時管理 ====================
  
  /**
   * 開始帶超時的請求
   * @param requestId 請求標識符（用於取消）
   * @param timeoutMs 超時毫秒數（默認 15 秒）
   */
  private startRequestWithTimeout(requestId: string, timeoutMs: number = this.REQUEST_TIMEOUT): void {
    // 清除之前可能存在的同類請求
    this.cancelRequest(requestId);
    
    // 🔧 P1: 記錄當前請求
    this._currentRequest.set(requestId);
    this._requestStartTime.set(Date.now());
    
    // 設置新的超時
    const timer = setTimeout(() => {
      console.warn(`[RAGBrain] Request timeout: ${requestId}`);
      this._isLoading.set(false);
      this._currentRequest.set(null);
      this._requestStartTime.set(0);
      this._pendingRequests.delete(requestId);
      this.toastService.error(`請求超時，請稍後重試 (${this.getRequestDisplayName(requestId)})`);
      
      // 針對特定請求類型做額外清理
      if (requestId === 'build' || requestId === 'guided-build') {
        this._buildProgress.set(null);
      }
      if (requestId === 'search') {
        this._searchResults.set([]);
      }
    }, timeoutMs);
    
    this._pendingRequests.set(requestId, timer);
  }
  
  /**
   * 獲取請求的顯示名稱
   */
  private getRequestDisplayName(requestId: string): string {
    const names: Record<string, string> = {
      'initialize': '初始化',
      'search': '搜索',
      'build': '構建知識庫',
      'guided-build': '引導式構建',
      'import-url': '網頁導入',
      'import-doc': '文檔導入'
    };
    return names[requestId] || requestId;
  }
  
  /**
   * 🔧 P1: 獲取當前請求的顯示名稱
   */
  getCurrentRequestName(): string {
    const current = this._currentRequest();
    return current ? this.getRequestDisplayName(current) : '';
  }
  
  /**
   * 請求完成，取消超時計時器
   */
  private completeRequest(requestId: string): void {
    const timer = this._pendingRequests.get(requestId);
    if (timer) {
      clearTimeout(timer);
      this._pendingRequests.delete(requestId);
    }
    // 🔧 P1: 清除請求狀態
    if (this._currentRequest() === requestId) {
      this._currentRequest.set(null);
      this._requestStartTime.set(0);
    }
  }
  
  /**
   * 取消特定請求的超時計時器
   */
  private cancelRequest(requestId: string): void {
    const timer = this._pendingRequests.get(requestId);
    if (timer) {
      clearTimeout(timer);
      this._pendingRequests.delete(requestId);
    }
    // 🔧 P1: 清除請求狀態
    if (this._currentRequest() === requestId) {
      this._currentRequest.set(null);
      this._requestStartTime.set(0);
    }
  }
  
  /**
   * 取消所有待處理請求
   */
  private cancelAllRequests(): void {
    this._pendingRequests.forEach((timer) => clearTimeout(timer));
    this._pendingRequests.clear();
    // 🔧 P1: 清除請求狀態
    this._currentRequest.set(null);
    this._requestStartTime.set(0);
  }
  
  /**
   * 🔧 P1: 公開取消當前請求的方法
   */
  cancelCurrentRequest(): void {
    const current = this._currentRequest();
    if (current) {
      this.cancelRequest(current);
      this._isLoading.set(false);
      this._buildProgress.set(null);
      this.toastService.info('已取消請求');
    }
  }
  
  // ==================== 事件監聽 ====================
  
  private setupEventListeners() {
    // RAG 系統初始化完成
    this.ipcService.on('rag-initialized', (data: any) => {
      console.log('[RAGBrain] System initialized:', data);
      this.completeRequest('initialize'); // 🔧 P0: 取消超時
      this._isLoading.set(false);
      
      if (data.success) {
        this._isInitialized.set(true);
        this.refreshStats();
        this.toastService.success('🧠 AI 知識大腦已啟動');
      } else {
        this.toastService.error(`初始化失敗: ${data.error || '未知錯誤'}`);
      }
    });
    
    // RAG 搜索結果
    this.ipcService.on('rag-search-results', (data: any) => {
      console.log('[RAGBrain] Search results:', data);
      this.completeRequest('search'); // 🔧 P0: 取消超時
      this._isLoading.set(false);
      
      if (data.success && data.results) {
        this._searchResults.set(data.results.map(this.mapSearchResult));
      } else if (!data.success) {
        this.toastService.error(`搜索失敗: ${data.error || '未知錯誤'}`);
        this._searchResults.set([]);
      }
    });
    
    // RAG 統計更新
    this.ipcService.on('rag-stats-updated', (data: any) => {
      console.log('[RAGBrain] Stats updated:', data);
      if (data.success && data.stats) {
        this._stats.set(this.mapStats(data.stats));
        this.calculateHealthScore();
      }
    });
    
    // 知識添加成功
    this.ipcService.on('rag-knowledge-added', (data: any) => {
      console.log('[RAGBrain] Knowledge added:', data);
      if (data.success) {
        this.addLearningEvent({
          type: 'new_knowledge',
          description: `添加了新${this.getTypeName(data.knowledgeType)}知識`,
          details: { knowledgeType: data.knowledgeType }
        });
        this.refreshStats();
      }
    });
    
    // 自動學習事件
    this.ipcService.on('rag-auto-learned', (data: any) => {
      console.log('[RAGBrain] Auto learned:', data);
      if (data.success && data.result) {
        const r = data.result;
        const total = (r.qa_extracted || 0) + (r.scripts_extracted || 0) + (r.objections_extracted || 0);
        
        if (total > 0) {
          this.addLearningEvent({
            type: 'auto_learn',
            description: `從對話學習了 ${total} 條知識`,
            details: {
              userId: data.userId,
              count: total,
              quality: r.quality_score
            }
          });
          this.refreshStats();
          
          // 顯示學習通知
          this.toastService.info(`💬 從對話學習了 ${total} 條知識`);
        }
      }
    });
    
    // 對話式構建進度
    this.ipcService.on('rag-build-progress', (data: any) => {
      console.log('[RAGBrain] Build progress:', data);
      if (data.progress) {
        this._buildProgress.set(data.progress);
      }
    });
    
    // 對話式構建完成
    this.ipcService.on('rag-build-complete', (data: any) => {
      console.log('[RAGBrain] Build complete:', data);
      this.completeRequest('build'); // 🔧 P0: 取消超時
      this._buildProgress.set(null);
      this._isLoading.set(false);
      
      if (data.success) {
        this.addLearningEvent({
          type: 'new_knowledge',
          description: `通過對話構建了 ${data.totalItems} 條知識`,
          details: { count: data.totalItems }
        });
        this.refreshStats();
        
        // 🆕 P1-2: 顯示詳細的導入結果彈窗
        this._lastImportResult.set({
          success: true,
          totalItems: data.totalItems || 0,
          stats: data.stats || {},
          source: 'conversation'
        });
        this.toastService.success(`✨ 知識大腦構建完成！共 ${data.totalItems} 條知識`);
      } else {
        this.toastService.error(`構建失敗: ${data.error || '未知錯誤'}`);
      }
    });
    
    // URL 導入完成（Phase 5 增強：更好的 API Key 錯誤提示）
    this.ipcService.on('rag-url-imported', (data: any) => {
      console.log('[RAGBrain] URL imported:', data);
      this.completeRequest('import-url'); // 🔧 P0: 取消超時
      this._isLoading.set(false);
      
      if (data.success) {
        this.addLearningEvent({
          type: 'new_knowledge',
          description: `從網頁導入了 ${data.itemsCount} 條知識`,
          details: { count: data.itemsCount }
        });
        this.refreshStats();
        this.toastService.success(`🌐 已從網頁導入 ${data.itemsCount} 條知識`);
      } else {
        // 🔧 Phase 5: 針對 API Key 缺失提供更明確的指引
        if (data.needsApiKey) {
          this.toastService.error(`⚠️ ${data.error}`, 8000);
          // 觸發事件通知 UI 顯示配置指引
          this._lastError.set({
            type: 'api_key_missing',
            message: data.error,
            action: 'configure_ai'
          });
        } else {
          this.toastService.error(`導入失敗: ${data.error || '未知錯誤'}`);
        }
      }
    });
    
    // 文檔導入完成
    this.ipcService.on('rag-document-imported', (data: any) => {
      console.log('[RAGBrain] Document imported:', data);
      this.completeRequest('import-doc'); // 🔧 P0: 取消超時
      this._isLoading.set(false);
      
      if (data.success) {
        this.addLearningEvent({
          type: 'new_knowledge',
          description: `從文檔導入了 ${data.itemsCount} 條知識`,
          details: { count: data.itemsCount }
        });
        this.refreshStats();
        this.toastService.success(`📄 已從文檔導入 ${data.itemsCount} 條知識`);
      } else {
        this.toastService.error(`導入失敗: ${data.error || '未知錯誤'}`);
      }
    });
    
    // 🆕 知識缺口列表
    this.ipcService.on('rag-gaps-list', (data: any) => {
      console.log('[RAGBrain] Gaps list:', data);
      if (data.success && data.gaps) {
        this._knowledgeGaps.set(data.gaps);
      }
    });
    
    // 🆕 缺口已解決
    this.ipcService.on('rag-gap-resolved', (data: any) => {
      console.log('[RAGBrain] Gap resolved:', data);
      if (data.success) {
        this._knowledgeGaps.update(gaps => 
          gaps.filter(g => g.id !== data.gapId)
        );
        this.toastService.success('✅ 知識缺口已解決！');
        this.refreshStats();
      }
    });
    
    // 🆕 缺口已忽略
    this.ipcService.on('rag-gap-ignored', (data: any) => {
      if (data.success) {
        this._knowledgeGaps.update(gaps => 
          gaps.filter(g => g.id !== data.gapId)
        );
      }
    });
    
    // 🆕 缺口建議答案
    this.ipcService.on('rag-gap-suggestion', (data: any) => {
      console.log('[RAGBrain] Gap suggestion:', data);
      if (data.success && data.suggestedAnswer) {
        this._knowledgeGaps.update(gaps => 
          gaps.map(g => g.id === data.gapId 
            ? { ...g, suggestedAnswer: data.suggestedAnswer }
            : g
          )
        );
      }
    });
    
    // 🆕 健康度報告
    this.ipcService.on('rag-health-report', (data: any) => {
      console.log('[RAGBrain] Health report:', data);
      if (data.success && data.report) {
        this._healthReport.set(data.report);
        this._healthScore.set(data.report.overallScore || 0);
      }
    });
    
    // 🆕 引導式構建問題
    this.ipcService.on('rag-guided-question', (data: any) => {
      console.log('[RAGBrain] Guided question:', data);
      this.completeRequest('guided-build'); // 🔧 P0: 取消超時
      this._isLoading.set(false);
      
      if (data.success) {
        this._guidedQuestion.set({
          step: data.step,
          totalSteps: data.totalSteps,
          title: data.title,
          question: data.question,
          type: data.type,
          options: data.options,
          placeholder: data.placeholder,
          suggestions: data.suggestions
        });
      } else {
        this.toastService.error(`引導式構建失敗: ${data.error || '未知錯誤'}`);
      }
    });
    
    // 🔧 P0: 通用錯誤處理 - 監聽所有 RAG 相關失敗事件
    this.ipcService.on('rag-error', (data: any) => {
      console.error('[RAGBrain] Error event:', data);
      this.cancelAllRequests();
      this._isLoading.set(false);
      this._buildProgress.set(null);
      this.toastService.error(`RAG 錯誤: ${data.error || '操作失敗'}`);
    });
    
    // 🆕 P0: 監聽後端狀態 - 如果後端斷開連接，重置所有狀態
    this.ipcService.on('backend-status', (data: any) => {
      if (!data.running) {
        console.warn('[RAGBrain] Backend disconnected, resetting states');
        this.cancelAllRequests();
        this._isLoading.set(false);
        this._isInitialized.set(false);
        this._buildProgress.set(null);
      }
    });
  }
  
  // ==================== 公開方法 ====================
  
  /**
   * 初始化 RAG 系統
   */
  async initialize(): Promise<void> {
    if (this._isInitialized()) return;
    if (this._isLoading()) return; // 🔧 P0: 防止重複請求
    
    console.log('[RAGBrain] Initializing...');
    this._isLoading.set(true);
    this.startRequestWithTimeout('initialize', 30000); // 初始化給 30 秒
    
    this.ipcService.send('rag-initialize', { 
      useChromadb: true, 
      useNeural: true 
    });
  }
  
  /**
   * 刷新統計數據
   */
  refreshStats(): void {
    this.ipcService.send('rag-get-stats', {});
  }
  
  /**
   * 語義搜索知識
   */
  search(query: string, options?: {
    limit?: number;
    type?: string;
    minScore?: number;
  }): void {
    if (this._isLoading()) return; // 🔧 P0: 防止重複請求
    
    this._isLoading.set(true);
    this._searchResults.set([]);
    this.startRequestWithTimeout('search'); // 🔧 P0: 啟動超時
    
    this.ipcService.send('rag-search', {
      query,
      limit: options?.limit || 5,
      knowledgeType: options?.type,
      minScore: options?.minScore || 0.3
    });
  }
  
  /**
   * 🌟 對話式知識構建
   * 用戶只需描述業務，AI 自動生成完整知識庫
   */
  async buildFromConversation(request: ConversationBuildRequest): Promise<void> {
    if (this._isLoading()) return; // 🔧 P0: 防止重複請求
    
    this._isLoading.set(true);
    this._buildProgress.set({
      step: 1,
      totalSteps: 5,
      currentAction: '分析業務描述...',
      itemsGenerated: 0
    });
    this.startRequestWithTimeout('build', 120000); // 🔧 P0: 構建給 2 分鐘
    
    this.ipcService.send('rag-build-from-conversation', request);
  }
  
  /**
   * 🌐 從 URL 導入知識
   */
  importFromUrl(url: string): void {
    if (this._isLoading()) return; // 🔧 P0: 防止重複請求
    
    this._isLoading.set(true);
    this.startRequestWithTimeout('import-url', 60000); // 🔧 P0: URL 導入給 1 分鐘
    this.toastService.info('🔍 正在解析網頁內容...');
    this.ipcService.send('rag-import-url', { url });
  }
  
  /**
   * 📄 從文檔導入知識
   */
  importFromDocument(filePath: string, fileType: string): void {
    if (this._isLoading()) return; // 🔧 P0: 防止重複請求
    
    this._isLoading.set(true);
    this.startRequestWithTimeout('import-doc', 60000); // 🔧 P0: 文檔導入給 1 分鐘
    this.toastService.info('📖 正在解析文檔...');
    this.ipcService.send('rag-import-document', { filePath, fileType });
  }
  
  /**
   * 手動添加知識
   */
  addKnowledge(type: string, question: string, answer: string, context?: string): void {
    this.ipcService.send('rag-add-knowledge', {
      knowledgeType: type,
      question,
      answer,
      context: context || ''
    });
  }
  
  /**
   * 記錄知識反饋
   */
  recordFeedback(knowledgeId: number, isPositive: boolean): void {
    this.ipcService.send('rag-record-feedback', {
      knowledgeId,
      isPositive
    });
    
    this.addLearningEvent({
      type: 'feedback',
      description: `收到${isPositive ? '正面' : '負面'}反饋`,
      details: {}
    });
  }
  
  /**
   * 獲取最近知識列表
   */
  getRecentKnowledge(limit: number = 20): void {
    this.ipcService.send('rag-get-recent', { limit });
  }
  
  /**
   * 清理低質量知識
   */
  cleanupLowQuality(): void {
    this.ipcService.send('rag-cleanup', {
      minScore: 0.2,
      minUses: 0,
      daysOld: 30
    });
  }
  
  /**
   * 合併相似知識
   */
  mergeSimilar(): void {
    this.ipcService.send('rag-merge-similar', {
      similarityThreshold: 0.9
    });
  }
  
  // ==================== 🆕 知識缺口管理 ====================
  
  /**
   * 獲取知識缺口列表
   */
  getKnowledgeGaps(minHits: number = 1): void {
    // 🆕 P0-2: 降低 minHits 為 1，顯示更多缺口
    this.ipcService.send('rag-get-gaps', { 
      status: 'pending',
      limit: 50,  // 增加限制
      minHits 
    });
  }
  
  /**
   * 解決知識缺口
   */
  resolveGap(gapId: number, knowledgeType: string, question: string, answer: string): void {
    this.ipcService.send('rag-resolve-gap', {
      gapId,
      knowledgeType,
      question,
      answer
    });
  }
  
  /**
   * 忽略知識缺口
   */
  ignoreGap(gapId: number): void {
    this.ipcService.send('rag-ignore-gap', { gapId });
  }
  
  /**
   * 🆕 刪除單條知識缺口（無需確認）
   */
  deleteGap(gapId: number): void {
    this.ipcService.send('rag-delete-gap', { gapId });
    // 從本地列表移除
    this._knowledgeGaps.update(gaps => gaps.filter(g => g.id !== gapId));
  }
  
  /**
   * 🆕 批量刪除知識缺口
   */
  deleteGapsBatch(gapIds: number[]): void {
    this.ipcService.send('rag-delete-gaps-batch', { gapIds });
    // 從本地列表移除
    this._knowledgeGaps.update(gaps => gaps.filter(g => !gapIds.includes(g.id)));
  }
  
  /**
   * 🆕 清理重複的知識缺口
   */
  cleanupDuplicateGaps(): void {
    this.ipcService.send('rag-cleanup-duplicate-gaps', {});
    // 清理後重新加載
    setTimeout(() => this.getKnowledgeGaps(), 1000);
  }
  
  /**
   * 請求 AI 生成缺口建議答案
   */
  suggestGapAnswer(gapId: number, query: string): void {
    this.ipcService.send('rag-suggest-gap-answer', { gapId, query });
  }
  
  // ==================== 🆕 健康度報告 ====================
  
  /**
   * 獲取知識庫健康度報告
   */
  getHealthReport(): void {
    this.ipcService.send('rag-get-health-report', {});
  }
  
  // ==================== 🆕 引導式構建 ====================
  
  /**
   * 開始引導式多輪構建
   */
  startGuidedBuild(): void {
    if (this._isLoading()) return; // 🔧 P0: 防止重複請求
    
    this._guidedAnswers.set({});
    this._isLoading.set(true);
    this.startRequestWithTimeout('guided-build', 30000); // 🔧 P0: 每步給 30 秒
    this.ipcService.send('rag-start-guided-build', { step: 1, answers: {} });
  }
  
  /**
   * 回答引導式問題並進入下一步
   */
  answerGuidedQuestion(answer: any): void {
    const currentQuestion = this._guidedQuestion();
    if (!currentQuestion) return;
    
    // 保存答案
    const stepKey = `step${currentQuestion.step}`;
    this._guidedAnswers.update(answers => ({
      ...answers,
      [stepKey]: answer
    }));
    
    // 進入下一步或完成
    const nextStep = currentQuestion.step + 1;
    this._isLoading.set(true);
    
    // 🔧 P0: 最後一步給更長時間（生成知識庫）
    const timeout = nextStep > currentQuestion.totalSteps ? 120000 : 30000;
    this.startRequestWithTimeout('guided-build', timeout);
    
    if (nextStep <= currentQuestion.totalSteps) {
      this.ipcService.send('rag-start-guided-build', { 
        step: nextStep, 
        answers: this._guidedAnswers()
      });
    } else {
      // 完成所有問題，開始生成
      this._guidedQuestion.set(null);
      this.ipcService.send('rag-start-guided-build', { 
        step: nextStep, 
        answers: this._guidedAnswers()
      });
    }
  }
  
  /**
   * 取消引導式構建
   */
  cancelGuidedBuild(): void {
    this.cancelRequest('guided-build'); // 🔧 P0: 取消超時
    this._guidedQuestion.set(null);
    this._guidedAnswers.set({});
    this._isLoading.set(false);
  }
  
  // ==================== 輔助方法 ====================
  
  private addLearningEvent(event: Omit<LearningEvent, 'id' | 'timestamp'>): void {
    const newEvent: LearningEvent = {
      id: `event_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...event
    };
    
    this._learningEvents.update(events => [newEvent, ...events].slice(0, 50));
  }
  
  private calculateHealthScore(): void {
    const stats = this._stats();
    if (!stats) {
      this._healthScore.set(0);
      return;
    }
    
    let score = 0;
    
    // 知識數量 (0-25 分)
    score += Math.min(25, stats.totalKnowledge * 0.5);
    
    // 平均質量 (0-25 分)
    score += stats.avgScore * 25;
    
    // 使用率 (0-25 分)
    const useRate = stats.totalUses / Math.max(1, stats.totalKnowledge);
    score += Math.min(25, useRate * 5);
    
    // 類型覆蓋 (0-25 分)
    const typeCount = Object.keys(stats.byType).length;
    score += Math.min(25, typeCount * 5);
    
    this._healthScore.set(Math.round(score));
  }
  
  private mapSearchResult(data: any): RAGSearchResult {
    return {
      item: {
        id: data.item.id,
        type: data.item.knowledge_type || data.item.type,
        question: data.item.question,
        answer: data.item.answer,
        context: data.item.context,
        keywords: data.item.keywords || [],
        successScore: data.item.success_score || data.item.successScore || 0.5,
        useCount: data.item.use_count || data.item.useCount || 0,
        feedbackPositive: data.item.feedback_positive || 0,
        feedbackNegative: data.item.feedback_negative || 0,
        createdAt: data.item.created_at || data.item.createdAt || '',
        updatedAt: data.item.updated_at || data.item.updatedAt || ''
      },
      similarity: data.similarity,
      source: data.source
    };
  }
  
  private mapStats(data: any): RAGStats {
    return {
      totalKnowledge: data.total_knowledge || data.totalKnowledge || 0,
      totalUses: data.total_uses || data.totalUses || 0,
      avgScore: data.avg_score || data.avgScore || 0,
      byType: data.by_type || data.byType || {},
      vectorCount: data.vector_count || data.vectorCount,
      chromadbEnabled: data.chromadb_enabled ?? data.chromadbEnabled ?? false,
      neuralEmbedding: data.neural_embedding ?? data.neuralEmbedding ?? false,
      learning: data.learning ? {
        sessionsProcessed: data.learning.sessions_processed || 0,
        totalQaExtracted: data.learning.total_qa_extracted || 0,
        totalScriptsExtracted: data.learning.total_scripts_extracted || 0,
        avgQualityScore: data.learning.avg_quality_score || 0
      } : undefined
    };
  }
  
  private getTypeName(type: string): string {
    const names: Record<string, string> = {
      'qa': '問答',
      'script': '話術',
      'product': '產品',
      'objection': '異議處理',
      'greeting': '開場白',
      'closing': '成交',
      'faq': 'FAQ',
      'custom': '自定義'
    };
    return names[type] || type;
  }
}
