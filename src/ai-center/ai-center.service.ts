/**
 * AI 中心服務
 * AI Center Service - 統一管理所有 AI 功能
 */

import { Injectable, signal, computed } from '@angular/core';
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

@Injectable({
  providedIn: 'root'
})
export class AICenterService {
  // 配置狀態
  private config = signal<AICenterConfig>(DEFAULT_AI_CONFIG);
  
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
  
  // ========== 模型管理 ==========
  
  addModel(model: Omit<AIModelConfig, 'id' | 'isConnected' | 'usageToday' | 'costToday'>): string {
    const id = `model_${Date.now()}`;
    const newModel: AIModelConfig = {
      ...model,
      id,
      isConnected: false,
      usageToday: 0,
      costToday: 0
    };
    
    this.config.update(c => ({
      ...c,
      models: [...c.models, newModel]
    }));
    
    return id;
  }
  
  updateModel(id: string, updates: Partial<AIModelConfig>) {
    this.config.update(c => ({
      ...c,
      models: c.models.map(m => m.id === id ? { ...m, ...updates } : m)
    }));
  }
  
  removeModel(id: string) {
    this.config.update(c => ({
      ...c,
      models: c.models.filter(m => m.id !== id),
      defaultModelId: c.defaultModelId === id ? '' : c.defaultModelId
    }));
  }
  
  setDefaultModel(id: string) {
    this.config.update(c => ({ ...c, defaultModelId: id }));
  }
  
  async testModelConnection(id: string): Promise<boolean> {
    const model = this.config().models.find(m => m.id === id);
    if (!model) return false;
    
    // TODO: 實際測試 API 連接
    // 模擬測試
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const isConnected = model.apiKey.length > 10;
    this.updateModel(id, { 
      isConnected, 
      lastTestedAt: new Date().toISOString() 
    });
    
    return isConnected;
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
