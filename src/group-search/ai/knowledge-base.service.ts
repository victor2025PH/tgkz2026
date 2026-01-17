/**
 * TG-AI智控王 知識庫服務
 * Knowledge Base Service v1.0
 * 
 * 💡 設計思考：
 * 1. 文檔分塊 - 智能分割長文檔為可檢索片段
 * 2. 向量嵌入 - 使用本地或遠程模型生成嵌入
 * 3. 混合搜索 - 關鍵詞 + 語義雙重搜索
 * 4. 上下文增強 - 檢索結果增強 AI 回答
 * 5. 增量更新 - 支持部分更新，無需全量重建
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { IndexedDBService } from '../performance/indexed-db.service';
import { WorkerPoolService } from '../performance/worker-pool.service';

// ============ 類型定義 ============

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'markdown' | 'faq' | 'product' | 'policy';
  metadata: {
    source?: string;
    author?: string;
    createdAt: number;
    updatedAt: number;
    tags?: string[];
    language?: string;
  };
  chunks: DocumentChunk[];
  status: 'pending' | 'processing' | 'indexed' | 'error';
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  index: number;
  startPosition: number;
  endPosition: number;
  embedding?: number[];
  metadata: {
    section?: string;
    heading?: string;
  };
}

export interface SearchResult {
  chunk: DocumentChunk;
  document: KnowledgeDocument;
  score: number;
  matchType: 'semantic' | 'keyword' | 'hybrid';
  highlights: string[];
}

export interface KnowledgeBaseConfig {
  chunkSize: number;           // 分塊大小（字符數）
  chunkOverlap: number;        // 分塊重疊
  maxResults: number;          // 最大結果數
  minScore: number;            // 最小相關度分數
  embeddingModel: 'local' | 'openai' | 'custom';
  hybridWeight: number;        // 混合搜索權重（0-1，1=純語義）
}

export interface KnowledgeStats {
  totalDocuments: number;
  totalChunks: number;
  totalTokens: number;
  lastUpdated: number;
  indexSize: number;
}

// ============ 默認配置 ============

const DEFAULT_CONFIG: KnowledgeBaseConfig = {
  chunkSize: 500,
  chunkOverlap: 50,
  maxResults: 5,
  minScore: 0.3,
  embeddingModel: 'local',
  hybridWeight: 0.7
};

// ============ 本地嵌入計算 ============

/**
 * 💡 思考：使用 TF-IDF 作為本地嵌入方案
 * 優點：無需 API 調用，隱私安全，離線可用
 * 缺點：語義理解不如深度學習模型
 * 折中：使用混合搜索（TF-IDF + 關鍵詞）提高準確性
 */
class LocalEmbedding {
  private vocabulary = new Map<string, number>();
  private idf = new Map<string, number>();
  private documentCount = 0;
  
  /**
   * 構建詞彙表
   */
  buildVocabulary(documents: string[]): void {
    const docFreq = new Map<string, number>();
    
    this.documentCount = documents.length;
    
    for (const doc of documents) {
      const terms = this.tokenize(doc);
      const uniqueTerms = new Set(terms);
      
      for (const term of uniqueTerms) {
        docFreq.set(term, (docFreq.get(term) || 0) + 1);
      }
      
      for (const term of terms) {
        if (!this.vocabulary.has(term)) {
          this.vocabulary.set(term, this.vocabulary.size);
        }
      }
    }
    
    // 計算 IDF
    for (const [term, freq] of docFreq) {
      this.idf.set(term, Math.log((this.documentCount + 1) / (freq + 1)) + 1);
    }
  }
  
  /**
   * 計算文本的 TF-IDF 向量
   */
  embed(text: string): number[] {
    const terms = this.tokenize(text);
    const tf = new Map<string, number>();
    
    // 計算 TF
    for (const term of terms) {
      tf.set(term, (tf.get(term) || 0) + 1);
    }
    
    // 歸一化 TF
    const maxTf = Math.max(...tf.values());
    
    // 生成向量
    const vector = new Array(this.vocabulary.size).fill(0);
    
    for (const [term, freq] of tf) {
      const idx = this.vocabulary.get(term);
      if (idx !== undefined) {
        const normalizedTf = freq / maxTf;
        const idf = this.idf.get(term) || 1;
        vector[idx] = normalizedTf * idf;
      }
    }
    
    // L2 歸一化
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }
    
    return vector;
  }
  
  /**
   * 計算餘弦相似度
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    
    return dot; // 已經 L2 歸一化，直接返回點積
  }
  
  /**
   * 分詞（支持中英文）
   */
  private tokenize(text: string): string[] {
    // 中文分詞 + 英文分詞
    const normalized = text.toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ')
      .trim();
    
    const tokens: string[] = [];
    
    // 處理中文（按字切分，並提取 n-gram）
    const chineseRegex = /[\u4e00-\u9fa5]+/g;
    let match;
    while ((match = chineseRegex.exec(normalized)) !== null) {
      const chinese = match[0];
      // 單字
      for (const char of chinese) {
        tokens.push(char);
      }
      // 二字詞
      for (let i = 0; i < chinese.length - 1; i++) {
        tokens.push(chinese.substr(i, 2));
      }
    }
    
    // 處理英文
    const englishRegex = /[a-z0-9]+/g;
    while ((match = englishRegex.exec(normalized)) !== null) {
      if (match[0].length >= 2) {
        tokens.push(match[0]);
      }
    }
    
    return tokens;
  }
  
  /**
   * 獲取詞彙表大小
   */
  getVocabularySize(): number {
    return this.vocabulary.size;
  }
}

@Injectable({
  providedIn: 'root'
})
export class KnowledgeBaseService {
  private db = inject(IndexedDBService);
  private workerPool = inject(WorkerPoolService);
  
  private config: KnowledgeBaseConfig;
  private localEmbedding = new LocalEmbedding();
  private isInitialized = false;
  
  // 文檔緩存
  private documents = new Map<string, KnowledgeDocument>();
  
  // 狀態
  private _stats = signal<KnowledgeStats>({
    totalDocuments: 0,
    totalChunks: 0,
    totalTokens: 0,
    lastUpdated: 0,
    indexSize: 0
  });
  stats = computed(() => this._stats());
  
  private _isProcessing = signal(false);
  isProcessing = computed(() => this._isProcessing());
  
  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.initialize();
  }
  
  // ============ 初始化 ============
  
  private async initialize(): Promise<void> {
    try {
      // 載入已索引的文檔
      await this.loadDocuments();
      
      // 構建詞彙表
      if (this.documents.size > 0) {
        const allChunks = [...this.documents.values()]
          .flatMap(doc => doc.chunks.map(c => c.content));
        this.localEmbedding.buildVocabulary(allChunks);
      }
      
      this.isInitialized = true;
      console.log('[KnowledgeBase] Initialized with', this.documents.size, 'documents');
      
    } catch (error) {
      console.error('[KnowledgeBase] Initialization failed:', error);
    }
  }
  
  private async loadDocuments(): Promise<void> {
    const stored = await this.db.getAll<KnowledgeDocument>('knowledgeBase');
    
    for (const doc of stored) {
      this.documents.set(doc.id, doc);
    }
    
    this.updateStats();
  }
  
  // ============ 文檔管理 ============
  
  /**
   * 添加文檔到知識庫
   */
  async addDocument(
    title: string,
    content: string,
    type: KnowledgeDocument['type'] = 'text',
    metadata?: Partial<KnowledgeDocument['metadata']>
  ): Promise<KnowledgeDocument> {
    this._isProcessing.set(true);
    
    try {
      const doc: KnowledgeDocument = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title,
        content,
        type,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          ...metadata
        },
        chunks: [],
        status: 'pending'
      };
      
      // 分塊處理
      doc.chunks = await this.chunkDocument(doc);
      
      // 生成嵌入
      await this.embedChunks(doc.chunks);
      
      // 更新詞彙表
      this.localEmbedding.buildVocabulary([
        ...this.getAllChunkContents(),
        ...doc.chunks.map(c => c.content)
      ]);
      
      doc.status = 'indexed';
      
      // 保存
      this.documents.set(doc.id, doc);
      await this.db.put('knowledgeBase', doc);
      
      this.updateStats();
      
      return doc;
      
    } finally {
      this._isProcessing.set(false);
    }
  }
  
  /**
   * 批量添加文檔
   */
  async addDocuments(
    documents: Array<{
      title: string;
      content: string;
      type?: KnowledgeDocument['type'];
      metadata?: Partial<KnowledgeDocument['metadata']>;
    }>
  ): Promise<KnowledgeDocument[]> {
    this._isProcessing.set(true);
    
    try {
      const results: KnowledgeDocument[] = [];
      
      for (const item of documents) {
        const doc = await this.addDocument(
          item.title,
          item.content,
          item.type || 'text',
          item.metadata
        );
        results.push(doc);
      }
      
      return results;
      
    } finally {
      this._isProcessing.set(false);
    }
  }
  
  /**
   * 更新文檔
   */
  async updateDocument(
    id: string,
    updates: {
      title?: string;
      content?: string;
      metadata?: Partial<KnowledgeDocument['metadata']>;
    }
  ): Promise<KnowledgeDocument | null> {
    const doc = this.documents.get(id);
    if (!doc) return null;
    
    this._isProcessing.set(true);
    
    try {
      if (updates.title) doc.title = updates.title;
      if (updates.metadata) {
        doc.metadata = { ...doc.metadata, ...updates.metadata };
      }
      
      // 如果內容更新，需要重新分塊和嵌入
      if (updates.content) {
        doc.content = updates.content;
        doc.chunks = await this.chunkDocument(doc);
        await this.embedChunks(doc.chunks);
        
        // 重建詞彙表
        this.localEmbedding.buildVocabulary(this.getAllChunkContents());
      }
      
      doc.metadata.updatedAt = Date.now();
      
      await this.db.put('knowledgeBase', doc);
      this.updateStats();
      
      return doc;
      
    } finally {
      this._isProcessing.set(false);
    }
  }
  
  /**
   * 刪除文檔
   */
  async deleteDocument(id: string): Promise<boolean> {
    if (!this.documents.has(id)) return false;
    
    this.documents.delete(id);
    await this.db.delete('knowledgeBase', id);
    
    // 重建詞彙表
    this.localEmbedding.buildVocabulary(this.getAllChunkContents());
    
    this.updateStats();
    return true;
  }
  
  /**
   * 獲取文檔
   */
  getDocument(id: string): KnowledgeDocument | undefined {
    return this.documents.get(id);
  }
  
  /**
   * 獲取所有文檔
   */
  getAllDocuments(): KnowledgeDocument[] {
    return [...this.documents.values()];
  }
  
  // ============ 文檔分塊 ============
  
  /**
   * 智能分塊
   * 
   * 💡 思考：使用多種策略確保分塊質量
   * 1. 按段落分割
   * 2. 按標題分割（Markdown）
   * 3. 按固定大小分割（帶重疊）
   * 4. 保持語義完整性
   */
  private async chunkDocument(doc: KnowledgeDocument): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    let content = doc.content;
    
    // 根據文檔類型選擇分塊策略
    switch (doc.type) {
      case 'markdown':
        return this.chunkMarkdown(doc);
      case 'faq':
        return this.chunkFAQ(doc);
      default:
        return this.chunkBySize(doc);
    }
  }
  
  /**
   * Markdown 分塊（按標題）
   */
  private chunkMarkdown(doc: KnowledgeDocument): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const lines = doc.content.split('\n');
    
    let currentSection = '';
    let currentHeading = '';
    let currentContent = '';
    let startPosition = 0;
    
    for (const line of lines) {
      // 檢測標題
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headingMatch) {
        // 保存前一個部分
        if (currentContent.trim()) {
          chunks.push(this.createChunk(
            doc.id,
            currentContent.trim(),
            chunks.length,
            startPosition,
            startPosition + currentContent.length,
            { section: currentSection, heading: currentHeading }
          ));
        }
        
        currentHeading = headingMatch[2];
        currentSection = headingMatch[1].length <= 2 ? currentHeading : currentSection;
        currentContent = '';
        startPosition = doc.content.indexOf(line, startPosition);
      } else {
        currentContent += line + '\n';
      }
    }
    
    // 保存最後一個部分
    if (currentContent.trim()) {
      chunks.push(this.createChunk(
        doc.id,
        currentContent.trim(),
        chunks.length,
        startPosition,
        doc.content.length,
        { section: currentSection, heading: currentHeading }
      ));
    }
    
    // 如果某些塊太大，進一步分割
    return chunks.flatMap(chunk => {
      if (chunk.content.length > this.config.chunkSize * 2) {
        return this.splitLargeChunk(chunk);
      }
      return [chunk];
    });
  }
  
  /**
   * FAQ 分塊（按問答對）
   */
  private chunkFAQ(doc: KnowledgeDocument): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    
    // 匹配 Q: A: 或 問: 答: 格式
    const qaRegex = /(?:Q:|問:|问:)\s*(.+?)[\n\r]+(?:A:|答:)\s*(.+?)(?=(?:Q:|問:|问:)|$)/gis;
    let match;
    let index = 0;
    
    while ((match = qaRegex.exec(doc.content)) !== null) {
      const question = match[1].trim();
      const answer = match[2].trim();
      const content = `問：${question}\n答：${answer}`;
      
      chunks.push(this.createChunk(
        doc.id,
        content,
        index++,
        match.index,
        match.index + match[0].length,
        { heading: question }
      ));
    }
    
    // 如果沒有匹配到 QA 格式，使用普通分塊
    if (chunks.length === 0) {
      return this.chunkBySize(doc);
    }
    
    return chunks;
  }
  
  /**
   * 按大小分塊（帶重疊）
   */
  private chunkBySize(doc: KnowledgeDocument): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const content = doc.content;
    const { chunkSize, chunkOverlap } = this.config;
    
    let start = 0;
    let index = 0;
    
    while (start < content.length) {
      // 嘗試在句子邊界處分割
      let end = Math.min(start + chunkSize, content.length);
      
      if (end < content.length) {
        // 向後找句子結束
        const sentenceEnd = content.slice(start, end + 100)
          .search(/[。！？.!?]\s*(?=[^。！？.!?]|$)/);
        
        if (sentenceEnd > 0 && sentenceEnd < chunkSize + 100) {
          end = start + sentenceEnd + 1;
        }
      }
      
      const chunkContent = content.slice(start, end).trim();
      
      if (chunkContent) {
        chunks.push(this.createChunk(
          doc.id,
          chunkContent,
          index++,
          start,
          end,
          {}
        ));
      }
      
      // 下一塊開始位置（帶重疊）
      start = end - chunkOverlap;
      if (start <= chunks[chunks.length - 1]?.startPosition) {
        start = end;
      }
    }
    
    return chunks;
  }
  
  /**
   * 分割過大的塊
   */
  private splitLargeChunk(chunk: DocumentChunk): DocumentChunk[] {
    const result: DocumentChunk[] = [];
    const { chunkSize, chunkOverlap } = this.config;
    
    let start = 0;
    let index = 0;
    
    while (start < chunk.content.length) {
      const end = Math.min(start + chunkSize, chunk.content.length);
      const content = chunk.content.slice(start, end).trim();
      
      if (content) {
        result.push({
          ...chunk,
          id: `${chunk.id}_${index}`,
          content,
          index: chunk.index + index * 0.1,
          startPosition: chunk.startPosition + start,
          endPosition: chunk.startPosition + end
        });
      }
      
      start = end - chunkOverlap;
      index++;
    }
    
    return result;
  }
  
  private createChunk(
    documentId: string,
    content: string,
    index: number,
    start: number,
    end: number,
    metadata: DocumentChunk['metadata']
  ): DocumentChunk {
    return {
      id: `chunk_${documentId}_${index}`,
      documentId,
      content,
      index,
      startPosition: start,
      endPosition: end,
      metadata
    };
  }
  
  // ============ 嵌入計算 ============
  
  /**
   * 為分塊生成嵌入向量
   */
  private async embedChunks(chunks: DocumentChunk[]): Promise<void> {
    for (const chunk of chunks) {
      switch (this.config.embeddingModel) {
        case 'local':
          chunk.embedding = this.localEmbedding.embed(chunk.content);
          break;
        case 'openai':
          // TODO: 調用 OpenAI API
          chunk.embedding = this.localEmbedding.embed(chunk.content);
          break;
        default:
          chunk.embedding = this.localEmbedding.embed(chunk.content);
      }
    }
  }
  
  // ============ 搜索 ============
  
  /**
   * 搜索知識庫
   * 
   * 💡 使用混合搜索策略
   * 1. 語義搜索（基於嵌入向量）
   * 2. 關鍵詞搜索（基於 BM25）
   * 3. 融合排序（加權組合）
   */
  async search(query: string, options?: {
    maxResults?: number;
    minScore?: number;
    documentTypes?: KnowledgeDocument['type'][];
    documentIds?: string[];
  }): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const maxResults = options?.maxResults ?? this.config.maxResults;
    const minScore = options?.minScore ?? this.config.minScore;
    
    // 獲取所有可搜索的塊
    let chunks = this.getAllChunks();
    
    // 按文檔類型過濾
    if (options?.documentTypes?.length) {
      const docIds = new Set(
        [...this.documents.values()]
          .filter(d => options.documentTypes!.includes(d.type))
          .map(d => d.id)
      );
      chunks = chunks.filter(c => docIds.has(c.documentId));
    }
    
    // 按文檔 ID 過濾
    if (options?.documentIds?.length) {
      const docIds = new Set(options.documentIds);
      chunks = chunks.filter(c => docIds.has(c.documentId));
    }
    
    // 語義搜索
    const queryEmbedding = this.localEmbedding.embed(query);
    const semanticScores = chunks.map(chunk => ({
      chunk,
      score: chunk.embedding 
        ? this.localEmbedding.cosineSimilarity(queryEmbedding, chunk.embedding)
        : 0
    }));
    
    // 關鍵詞搜索
    const keywordScores = this.keywordSearch(query, chunks);
    
    // 融合分數
    const { hybridWeight } = this.config;
    const fusedResults = chunks.map((chunk, i) => {
      const semanticScore = semanticScores[i].score;
      const keywordScore = keywordScores.get(chunk.id) || 0;
      const fusedScore = hybridWeight * semanticScore + (1 - hybridWeight) * keywordScore;
      
      return {
        chunk,
        document: this.documents.get(chunk.documentId)!,
        score: fusedScore,
        matchType: this.getMatchType(semanticScore, keywordScore) as SearchResult['matchType'],
        highlights: this.extractHighlights(query, chunk.content)
      };
    });
    
    // 排序和過濾
    return fusedResults
      .filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }
  
  /**
   * 關鍵詞搜索（BM25 風格）
   */
  private keywordSearch(
    query: string,
    chunks: DocumentChunk[]
  ): Map<string, number> {
    const scores = new Map<string, number>();
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    const avgLength = chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length;
    const k1 = 1.5;
    const b = 0.75;
    
    for (const chunk of chunks) {
      let score = 0;
      const content = chunk.content.toLowerCase();
      const docLength = content.length;
      
      for (const term of queryTerms) {
        if (term.length < 2) continue;
        
        // 計算詞頻
        const regex = new RegExp(term, 'gi');
        const matches = content.match(regex);
        const tf = matches ? matches.length : 0;
        
        if (tf > 0) {
          // BM25 公式
          const idf = Math.log((chunks.length - this.getDocFreq(term, chunks) + 0.5) / 
                              (this.getDocFreq(term, chunks) + 0.5) + 1);
          const tfNorm = (tf * (k1 + 1)) / 
                        (tf + k1 * (1 - b + b * docLength / avgLength));
          score += idf * tfNorm;
        }
      }
      
      // 歸一化
      scores.set(chunk.id, Math.min(1, score / queryTerms.length));
    }
    
    return scores;
  }
  
  private getDocFreq(term: string, chunks: DocumentChunk[]): number {
    return chunks.filter(c => 
      c.content.toLowerCase().includes(term.toLowerCase())
    ).length;
  }
  
  private getMatchType(semantic: number, keyword: number): string {
    if (semantic > keyword * 1.5) return 'semantic';
    if (keyword > semantic * 1.5) return 'keyword';
    return 'hybrid';
  }
  
  /**
   * 提取高亮片段
   */
  private extractHighlights(query: string, content: string): string[] {
    const highlights: string[] = [];
    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length >= 2);
    
    for (const term of terms) {
      const regex = new RegExp(`(.{0,30})(${term})(.{0,30})`, 'gi');
      let match;
      
      while ((match = regex.exec(content)) !== null && highlights.length < 3) {
        highlights.push(`...${match[1]}【${match[2]}】${match[3]}...`);
      }
    }
    
    return highlights;
  }
  
  // ============ 上下文增強 ============
  
  /**
   * 獲取回答上下文
   * 
   * 💡 為 AI 回答提供相關知識上下文
   */
  async getContext(query: string, maxTokens = 2000): Promise<string> {
    const results = await this.search(query, { maxResults: 5 });
    
    if (results.length === 0) {
      return '';
    }
    
    let context = '以下是相關的知識庫內容：\n\n';
    let currentTokens = 0;
    
    for (const result of results) {
      const chunk = result.chunk;
      const doc = result.document;
      const estimatedTokens = chunk.content.length / 2; // 估算 token 數
      
      if (currentTokens + estimatedTokens > maxTokens) break;
      
      context += `【來源：${doc.title}】\n`;
      context += chunk.content + '\n\n';
      currentTokens += estimatedTokens;
    }
    
    return context;
  }
  
  /**
   * 增強問題回答
   */
  async enhanceAnswer(
    question: string,
    baseAnswer: string
  ): Promise<{ enhanced: string; sources: SearchResult[] }> {
    const results = await this.search(question, { maxResults: 3 });
    
    if (results.length === 0) {
      return { enhanced: baseAnswer, sources: [] };
    }
    
    // 構建增強回答
    let enhanced = baseAnswer;
    
    // 添加來源引用
    if (results.length > 0) {
      enhanced += '\n\n📚 相關參考：\n';
      for (let i = 0; i < Math.min(3, results.length); i++) {
        const r = results[i];
        enhanced += `${i + 1}. ${r.document.title}`;
        if (r.chunk.metadata.heading) {
          enhanced += ` - ${r.chunk.metadata.heading}`;
        }
        enhanced += '\n';
      }
    }
    
    return { enhanced, sources: results };
  }
  
  // ============ 輔助方法 ============
  
  private getAllChunks(): DocumentChunk[] {
    return [...this.documents.values()].flatMap(doc => doc.chunks);
  }
  
  private getAllChunkContents(): string[] {
    return this.getAllChunks().map(c => c.content);
  }
  
  private updateStats(): void {
    const allChunks = this.getAllChunks();
    const totalTokens = allChunks.reduce((sum, c) => sum + c.content.length / 2, 0);
    
    this._stats.set({
      totalDocuments: this.documents.size,
      totalChunks: allChunks.length,
      totalTokens: Math.round(totalTokens),
      lastUpdated: Date.now(),
      indexSize: this.localEmbedding.getVocabularySize()
    });
  }
  
  /**
   * 導出知識庫
   */
  async export(): Promise<string> {
    const data = {
      version: '1.0',
      exportedAt: Date.now(),
      documents: [...this.documents.values()]
    };
    return JSON.stringify(data, null, 2);
  }
  
  /**
   * 導入知識庫
   */
  async import(jsonData: string): Promise<number> {
    const data = JSON.parse(jsonData);
    let imported = 0;
    
    for (const doc of data.documents) {
      // 重新生成嵌入
      await this.embedChunks(doc.chunks);
      this.documents.set(doc.id, doc);
      await this.db.put('knowledgeBase', doc);
      imported++;
    }
    
    // 重建詞彙表
    this.localEmbedding.buildVocabulary(this.getAllChunkContents());
    this.updateStats();
    
    return imported;
  }
  
  /**
   * 清空知識庫
   */
  async clear(): Promise<void> {
    this.documents.clear();
    await this.db.clear('knowledgeBase');
    this.updateStats();
  }
}
