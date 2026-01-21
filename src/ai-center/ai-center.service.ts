/**
 * AI 中心服務
 * AI Center Service - 統一管理所有 AI 功能
 * 
 * 更新：支持持久化存儲和本地 AI
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { 
  AICenterConfig, 
  AIModelConfig, 
  KnowledgeBase, 
  SmartRule, 
  AIUsageStats,
  DEFAULT_AI_CONFIG,
  AIProvider,
  IntentType,
  ConversationStrategy
} from './ai-center.models';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';

// 擴展 AIModelConfig 以支持本地 AI
export interface ExtendedAIModelConfig extends AIModelConfig {
  isLocal?: boolean;
  displayName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AICenterService {
  private ipcService = inject(ElectronIpcService);
  private toastService = inject(ToastService);
  
  // 配置狀態
  private config = signal<AICenterConfig>(DEFAULT_AI_CONFIG);
  
  // 模型加載狀態
  private _isLoading = signal(false);
  isLoading = this._isLoading.asReadonly();
  
  // 統計數據
  private usageStats = signal<AIUsageStats>({
    today: {
      conversations: 0,
      messages: 0,
      intentsRecognized: 0,
      conversions: 0,
      cost: 0,
      avgResponseTime: 0
    },
    weekly: {
      conversations: 0,
      messages: 0,
      intentsRecognized: 0,
      conversions: 0,
      cost: 0,
      conversionRate: 0
    },
    byModel: []
  });
  
  // 計算屬性
  models = computed(() => this.config().models);
  defaultModel = computed(() => 
    this.config().models.find(m => m.id === this.config().defaultModelId)
  );
  activeKnowledgeBase = computed(() => 
    this.config().knowledgeBases.find(kb => kb.id === this.config().activeKnowledgeBaseId)
  );
  activeRules = computed(() => 
    this.config().smartRules.filter(r => r.isActive)
  );
  stats = computed(() => this.usageStats());
  strategy = computed(() => this.config().conversationStrategy);
  settings = computed(() => this.config().settings);
  
  // 連接狀態
  isConnected = computed(() => 
    this.config().models.some(m => m.isConnected)
  );
  
  // 本地 AI 模型
  localModels = computed(() => 
    this.config().models.filter(m => (m as ExtendedAIModelConfig).isLocal)
  );
  
  // 雲端 AI 模型
  cloudModels = computed(() => 
    this.config().models.filter(m => !(m as ExtendedAIModelConfig).isLocal)
  );
  
  // 模型用途分配
  modelUsage = computed(() => this.config().modelUsage);
  
  constructor() {
    this.setupIpcListeners();
    // 延遲加載模型配置和用途分配
    setTimeout(() => {
      this.loadModelsFromBackend();
      this.loadModelUsageFromBackend();
    }, 100);
  }
  
  private setupIpcListeners(): void {
    // 監聽模型列表更新
    this.ipcService.on('ai-models-list', (data: any) => {
      if (data.success && data.models) {
        const models: AIModelConfig[] = data.models.map((m: any) => ({
          id: String(m.id),
          provider: m.provider as AIProvider,
          modelName: m.modelName,
          apiKey: m.apiKey || '',
          apiEndpoint: m.apiEndpoint,
          isConnected: m.isConnected,
          lastTestedAt: m.lastTestedAt,
          usageToday: 0,
          costToday: 0,
          // 擴展屬性
          isLocal: m.isLocal,
          displayName: m.displayName
        }));
        
        this.config.update(c => ({
          ...c,
          models,
          defaultModelId: models.find(m => (m as any).isDefault)?.id || c.defaultModelId
        }));
        
        this._isLoading.set(false);
      }
    });
    
    // 監聯模型保存結果
    this.ipcService.on('ai-model-saved', (data: any) => {
      if (data.success) {
        this.toastService.success(`AI 模型已保存: ${data.modelName || data.provider}`);
      } else {
        this.toastService.error(`保存失敗: ${data.error}`);
      }
    });
    
    // 監聽模型測試結果
    this.ipcService.on('ai-model-tested', (data: any) => {
      console.log('[AI] 測試結果:', data);
      if (data.isConnected) {
        const preview = data.responsePreview ? ` (${data.responsePreview})` : '';
        this.toastService.success(`AI 模型 ${data.modelName || ''} 連接成功！${preview}`);
      } else {
        this.toastService.error(`連接失敗: ${data.error || '未知錯誤'}`);
      }
      // 更新本地狀態
      if (data.modelId) {
        this.updateModel(String(data.modelId), { isConnected: data.isConnected });
      }
    });
    
    // 監聽模型用途分配加載
    this.ipcService.on('model-usage-loaded', (data: any) => {
      console.log('[AI] 模型用途分配已加載:', data);
      if (data.success && data.usage) {
        this.config.update(c => ({
          ...c,
          modelUsage: {
            intentRecognition: data.usage.intentRecognition || '',
            dailyChat: data.usage.dailyChat || '',
            multiRoleScript: data.usage.multiRoleScript || ''
          }
        }));
      }
    });
    
    // 監聽模型用途分配保存結果
    this.ipcService.on('model-usage-saved', (data: any) => {
      if (data.success) {
        console.log('[AI] 模型用途分配已保存');
      } else {
        this.toastService.error(`保存失敗: ${data.error || '未知錯誤'}`);
      }
    });
  }
  
  /**
   * 從後端加載已保存的模型配置
   */
  loadModelsFromBackend(): void {
    this._isLoading.set(true);
    this.ipcService.send('get-ai-models', {});
  }
  
  // ========== 模型管理 ==========
  
  /**
   * 添加新模型（持久化到後端）
   */
  addModel(model: Omit<AIModelConfig, 'id' | 'isConnected' | 'usageToday' | 'costToday'> & { isLocal?: boolean; displayName?: string; isDefault?: boolean }): string {
    const id = `model_${Date.now()}`;
    const newModel: AIModelConfig = {
      ...model,
      id,
      isConnected: false,
      usageToday: 0,
      costToday: 0
    };
    
    // 先更新本地狀態
    this.config.update(c => ({
      ...c,
      models: [...c.models, newModel]
    }));
    
    // 持久化到後端
    this.ipcService.send('save-ai-model', {
      provider: model.provider,
      modelName: model.modelName,
      displayName: model.displayName || model.modelName,
      apiKey: model.apiKey,
      apiEndpoint: model.apiEndpoint,
      isLocal: model.isLocal || false,
      isDefault: model.isDefault || false
    });
    
    return id;
  }
  
  /**
   * 添加本地 AI 模型
   */
  addLocalModel(config: {
    modelName: string;
    displayName?: string;
    apiEndpoint: string;
    isDefault?: boolean;
  }): string {
    return this.addModel({
      provider: 'custom' as AIProvider,
      modelName: config.modelName,
      displayName: config.displayName || config.modelName,
      apiKey: '', // 本地 AI 不需要 API Key
      apiEndpoint: config.apiEndpoint,
      isLocal: true,
      isDefault: config.isDefault
    });
  }
  
  updateModel(id: string, updates: Partial<AIModelConfig>) {
    this.config.update(c => ({
      ...c,
      models: c.models.map(m => m.id === id ? { ...m, ...updates } : m)
    }));
    
    // 如果是數據庫 ID，同步到後端
    if (!isNaN(Number(id))) {
      this.ipcService.send('update-ai-model', {
        id: Number(id),
        ...updates
      });
    }
  }
  
  removeModel(id: string) {
    this.config.update(c => ({
      ...c,
      models: c.models.filter(m => m.id !== id),
      defaultModelId: c.defaultModelId === id ? '' : c.defaultModelId
    }));
    
    // 如果是數據庫 ID，從後端刪除
    if (!isNaN(Number(id))) {
      this.ipcService.send('delete-ai-model', { id: Number(id) });
    }
  }
  
  setDefaultModel(id: string) {
    this.config.update(c => ({ ...c, defaultModelId: id }));
    
    // 同步到後端
    if (!isNaN(Number(id))) {
      this.ipcService.send('set-default-ai-model', { id: Number(id) });
    }
  }
  
  /**
   * 更新模型用途分配（本地狀態）
   */
  updateModelUsage(updates: Partial<{ intentRecognition: string; dailyChat: string; multiRoleScript: string }>) {
    this.config.update(c => ({
      ...c,
      modelUsage: { ...c.modelUsage, ...updates }
    }));
  }
  
  /**
   * 保存模型用途分配到後端
   */
  async saveModelUsageToBackend(): Promise<void> {
    const usage = this.config().modelUsage;
    console.log('[AI] 保存模型用途分配:', usage);
    this.ipcService.send('save-model-usage', usage);
  }
  
  /**
   * 從後端加載模型用途分配
   */
  loadModelUsageFromBackend(): void {
    console.log('[AI] 加載模型用途分配...');
    this.ipcService.send('get-model-usage', {});
  }
  
  /**
   * 測試模型連接（通過後端測試）
   */
  async testModelConnection(id: string): Promise<boolean> {
    const model = this.config().models.find(m => m.id === id);
    if (!model) return false;
    
    const extModel = model as ExtendedAIModelConfig;
    
    // 通過後端測試連接
    this.ipcService.send('test-ai-model', {
      id: !isNaN(Number(id)) ? Number(id) : undefined,
      provider: model.provider,
      modelName: model.modelName,
      apiKey: model.apiKey,
      apiEndpoint: model.apiEndpoint,
      isLocal: extModel.isLocal
    });
    
    // 返回 true 表示測試請求已發送，實際結果通過事件返回
    return true;
  }
  
  /**
   * 測試本地 AI 連接
   */
  async testLocalAIConnection(endpoint: string, modelName: string): Promise<boolean> {
    this.ipcService.send('test-ai-model', {
      provider: 'ollama',
      modelName: modelName,
      apiEndpoint: endpoint,
      isLocal: true
    });
    return true;
  }
  
  // ========== 知識庫管理 ==========
  
  addKnowledgeBase(name: string, description: string = ''): string {
    const id = `kb_${Date.now()}`;
    const newKB: KnowledgeBase = {
      id,
      name,
      description,
      items: [],
      isDefault: this.config().knowledgeBases.length === 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.config.update(c => ({
      ...c,
      knowledgeBases: [...c.knowledgeBases, newKB],
      activeKnowledgeBaseId: c.activeKnowledgeBaseId || id
    }));
    
    return id;
  }
  
  updateKnowledgeBase(id: string, updates: Partial<KnowledgeBase>) {
    this.config.update(c => ({
      ...c,
      knowledgeBases: c.knowledgeBases.map(kb => 
        kb.id === id ? { ...kb, ...updates, updatedAt: new Date().toISOString() } : kb
      )
    }));
  }
  
  deleteKnowledgeBase(id: string) {
    this.config.update(c => ({
      ...c,
      knowledgeBases: c.knowledgeBases.filter(kb => kb.id !== id),
      activeKnowledgeBaseId: c.activeKnowledgeBaseId === id 
        ? (c.knowledgeBases.find(kb => kb.id !== id)?.id || '')
        : c.activeKnowledgeBaseId
    }));
  }
  
  setActiveKnowledgeBase(id: string) {
    this.config.update(c => ({ ...c, activeKnowledgeBaseId: id }));
  }
  
  // ========== 智能規則管理 ==========
  
  addSmartRule(rule: Omit<SmartRule, 'id'>): string {
    const id = `rule_${Date.now()}`;
    const newRule: SmartRule = { ...rule, id };
    
    this.config.update(c => ({
      ...c,
      smartRules: [...c.smartRules, newRule]
    }));
    
    return id;
  }
  
  updateSmartRule(id: string, updates: Partial<SmartRule>) {
    this.config.update(c => ({
      ...c,
      smartRules: c.smartRules.map(r => r.id === id ? { ...r, ...updates } : r)
    }));
  }
  
  deleteSmartRule(id: string) {
    this.config.update(c => ({
      ...c,
      smartRules: c.smartRules.filter(r => r.id !== id)
    }));
  }
  
  toggleSmartRule(id: string) {
    this.config.update(c => ({
      ...c,
      smartRules: c.smartRules.map(r => 
        r.id === id ? { ...r, isActive: !r.isActive } : r
      )
    }));
  }
  
  // ========== 對話策略管理 ==========
  
  updateConversationStrategy(updates: Partial<ConversationStrategy>) {
    this.config.update(c => ({
      ...c,
      conversationStrategy: { ...c.conversationStrategy, ...updates }
    }));
  }
  
  // ========== 設置管理 ==========
  
  updateSettings(updates: Partial<AICenterConfig['settings']>) {
    this.config.update(c => ({
      ...c,
      settings: { ...c.settings, ...updates }
    }));
  }
  
  // ========== AI 核心功能（供其他模塊調用）==========
  
  /**
   * 識別用戶意圖
   */
  async recognizeIntent(message: string, context?: string[]): Promise<{
    intent: IntentType;
    confidence: number;
    keywords: string[];
  }> {
    // TODO: 調用實際 AI API
    // 暫時返回模擬結果
    const keywords = this.extractKeywords(message);
    
    let intent: IntentType = 'general_chat';
    let confidence = 0.5;
    
    if (message.includes('價格') || message.includes('多少錢') || message.includes('費用')) {
      intent = 'price_inquiry';
      confidence = 0.9;
    } else if (message.includes('購買') || message.includes('下單') || message.includes('怎麼買')) {
      intent = 'purchase_intent';
      confidence = 0.95;
    } else if (message.includes('?') || message.includes('？') || message.includes('什麼')) {
      intent = 'product_question';
      confidence = 0.7;
    }
    
    // 更新統計
    this.usageStats.update(s => ({
      ...s,
      today: { ...s.today, intentsRecognized: s.today.intentsRecognized + 1 }
    }));
    
    return { intent, confidence, keywords };
  }
  
  /**
   * 生成 AI 回覆
   */
  async generateReply(
    message: string, 
    context: string[] = [],
    options?: {
      useKnowledgeBase?: boolean;
      rolePrompt?: string;
      maxTokens?: number;
    }
  ): Promise<string> {
    const strategy = this.config().conversationStrategy;
    const kb = this.activeKnowledgeBase();
    
    // TODO: 調用實際 AI API
    // 暫時返回模擬結果
    let reply = `感謝您的訊息！`;
    
    if (options?.rolePrompt) {
      reply = `[${options.rolePrompt}] ${reply}`;
    }
    
    if (strategy.useEmoji) {
      reply += ' 😊';
    }
    
    // 更新統計
    this.usageStats.update(s => ({
      ...s,
      today: { 
        ...s.today, 
        messages: s.today.messages + 1,
        cost: s.today.cost + 0.01 
      }
    }));
    
    return reply;
  }
  
  /**
   * 檢查智能規則並執行動作
   */
  async checkAndExecuteRules(
    intent: IntentType,
    confidence: number,
    conversationRounds: number
  ): Promise<SmartRule | null> {
    const activeRules = this.activeRules()
      .sort((a, b) => b.priority - a.priority);
    
    for (const rule of activeRules) {
      if (rule.triggerIntent !== intent) continue;
      
      const conditions = rule.triggerConditions;
      
      if (conditions.intentScore && confidence < conditions.intentScore) continue;
      if (conditions.conversationRounds && conversationRounds < conditions.conversationRounds) continue;
      
      // 規則匹配
      return rule;
    }
    
    return null;
  }
  
  // ========== 輔助方法 ==========
  
  private extractKeywords(text: string): string[] {
    // 簡單的關鍵詞提取
    const words = text.split(/[\s,，。！？!?]+/).filter(w => w.length > 1);
    return words.slice(0, 5);
  }
  
  // ========== 導入/導出 ==========
  
  exportConfig(): string {
    return JSON.stringify(this.config(), null, 2);
  }
  
  importConfig(jsonStr: string) {
    try {
      const config = JSON.parse(jsonStr) as AICenterConfig;
      this.config.set(config);
      return true;
    } catch {
      return false;
    }
  }
  
  // ========== 重置 ==========
  
  resetToDefault() {
    this.config.set(DEFAULT_AI_CONFIG);
  }
}
