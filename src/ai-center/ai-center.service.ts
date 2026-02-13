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
  KnowledgeItem,
  SmartRule, 
  AIUsageStats,
  DEFAULT_AI_CONFIG,
  AIProvider,
  IntentType,
  ConversationStrategy
} from './ai-center.models';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { AiSettingsService, SaveState } from './ai-settings.service';

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
  private aiSettings = inject(AiSettingsService);
  
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
  // 🔧 FIX: 暴露知識庫列表供組件使用
  knowledgeBases = computed(() => this.config().knowledgeBases);
  activeKnowledgeBaseId = computed(() => this.config().activeKnowledgeBaseId);
  activeKnowledgeBase = computed(() => 
    this.config().knowledgeBases.find(kb => kb.id === this.config().activeKnowledgeBaseId)
  );
  activeRules = computed(() => 
    this.config().smartRules.filter(r => r.isActive)
  );
  stats = computed(() => this.usageStats());
  strategy = computed(() => this.config().conversationStrategy);
  settings = computed(() => this.config().settings);
  
  // 後端返回的「已配置」狀態（模型 is_connected 或 ai_settings 有 local_ai_endpoint）
  private _aiConfiguredFromBackend = signal<boolean>(false);
  // 連接狀態：任一模型已連接，或後端標記已配置（避免切換菜單後誤顯示未配置）
  isConnected = computed(() => 
    this.config().models.some(m => m.isConnected) || this._aiConfiguredFromBackend()
  );
  
  // 🔧 正在測試的模型 ID 列表
  private _testingModelIds = signal<Set<string>>(new Set());
  testingModelIds = computed(() => this._testingModelIds());
  
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

  // 🔧 P0-2: REST 保存狀態（供組件顯示保存按鈕狀態）
  modelSaveState = computed(() => this.aiSettings.modelSaveState());
  settingsSaveState = computed(() => this.aiSettings.settingsSaveState());
  isDirty = computed(() => this.aiSettings.isDirty());
  isSaving = computed(() => this.aiSettings.isSaving());
  justSaved = computed(() => this.aiSettings.justSaved());
  
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
    
    // 監聽模型測試結果（IPC 回調路徑，REST 路徑由 _handleTestResult 直接處理）
    this.ipcService.on('ai-model-tested', (data: any) => {
      console.log('[AI] IPC 測試結果:', data);
      
      // 🔧 如果 REST 已經處理過（模型已不在 testingIds 中），跳過避免重複 Toast
      if (data.modelId && !this._testingModelIds().has(String(data.modelId))) {
        console.log('[AI] 測試結果已由 REST 處理，跳過 IPC 回調');
        return;
      }
      
      // IPC 路徑處理（Electron 模式 / REST fallback 場景）
      this._handleTestResult(data);
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
    
    // 監聯模型用途分配保存結果
    this.ipcService.on('model-usage-saved', (data: any) => {
      if (data.success) {
        console.log('[AI] 模型用途分配已保存');
      } else {
        this.toastService.error(`保存失敗: ${data.error || '未知錯誤'}`);
      }
    });
    
    // 🆕 監聽知識庫創建結果
    this.ipcService.on('knowledge-base-added', (data: any) => {
      console.log('[AI] 知識庫創建結果:', data);
      if (data.success) {
        this.toastService.success(`知識庫「${data.name}」創建成功`);
        // 刷新知識庫列表（如果有的話）
      } else {
        this.toastService.error(`創建失敗: ${data.error || '未知錯誤'}`);
      }
    });
    
    // 🆕 監聽知識庫條目添加結果
    this.ipcService.on('knowledge-item-added', (data: any) => {
      console.log('[AI] 知識條目添加結果:', data);
      if (data.success) {
        this.toastService.success(`知識條目「${data.title}」已添加`);
      } else {
        this.toastService.error(`添加失敗: ${data.error || '未知錯誤'}`);
      }
    });
    
    // 🆕 監聽 AI 生成知識庫結果
    this.ipcService.on('ai-knowledge-generated', (data: any) => {
      console.log('[AI] AI 生成知識庫結果:', data);
      if (data.success && data.items) {
        this.handleGeneratedKnowledge(data.kbId, data.items);
        this.toastService.success(`✨ AI 已生成 ${data.items.length} 條知識`);
      } else {
        this.toastService.error(`生成失敗: ${data.error || '未知錯誤'}`);
      }
    });
    
    // 🆕 監聽行業模板應用結果
    this.ipcService.on('industry-template-applied', (data: any) => {
      console.log('[AI] 行業模板應用結果:', data);
      if (data.success && data.items) {
        this.handleGeneratedKnowledge(data.kbId, data.items);
        this.toastService.success(`📚 已應用「${data.templateName}」模板，添加 ${data.items.length} 條知識`);
      } else {
        this.toastService.error(`應用失敗: ${data.error || '未知錯誤'}`);
      }
    });
    
    // 🆕 監聽從聊天學習結果
    this.ipcService.on('chat-learning-complete', (data: any) => {
      console.log('[AI] 聊天學習結果:', data);
      if (data.success && data.items) {
        this.handleGeneratedKnowledge(data.kbId, data.items);
        this.toastService.success(`💬 從聊天記錄學習了 ${data.items.length} 條知識`);
      } else if (data.success && (!data.items || data.items.length === 0)) {
        this.toastService.info('未發現可學習的優質回覆');
      } else {
        this.toastService.error(`學習失敗: ${data.error || '未知錯誤'}`);
      }
    });
  }
  
  /**
   * 從後端加載已保存的模型配置
   * 🔧 P0-2: 優先使用 REST API，fallback 到 IPC
   */
  async loadModelsFromBackend(): Promise<void> {
    this._isLoading.set(true);
    try {
      const { models, aiConfigured } = await this.aiSettings.getModelsWithMeta();
      const mapped: AIModelConfig[] = (models || []).map((m: any) => ({
        id: String(m.id),
        provider: m.provider as AIProvider,
        modelName: m.modelName,
        apiKey: m.apiKey || '',
        apiEndpoint: m.apiEndpoint || '',
        isConnected: m.isConnected || false,
        usageToday: 0,
        costToday: 0
      }));
      this.config.update(c => ({ ...c, models: mapped }));
      this._aiConfiguredFromBackend.set(aiConfigured === true);
      this._isLoading.set(false);
      console.log('[AI] REST 加載模型成功:', mapped.length, '個, aiConfigured=', aiConfigured);
      return;
    } catch (e) {
      console.warn('[AI] REST 加載模型失敗，fallback 到 IPC:', e);
    }
    // Fallback: IPC
    this.ipcService.send('get-ai-models', {});
  }
  
  // ========== 模型管理 ==========
  
  /**
   * 添加新模型（持久化到後端）
   */
  async addModel(model: Omit<AIModelConfig, 'id' | 'isConnected' | 'usageToday' | 'costToday'> & { isLocal?: boolean; displayName?: string; isDefault?: boolean }): Promise<string> {
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
    
    // 🔧 P0-2: 優先 REST API 持久化
    const res = await this.aiSettings.addModel({
      provider: model.provider,
      modelName: model.modelName,
      displayName: (model as any).displayName || model.modelName,
      apiKey: model.apiKey,
      apiEndpoint: model.apiEndpoint,
      isLocal: (model as any).isLocal || false,
      isDefault: (model as any).isDefault || false
    });
    
    if (res.success) {
      // 重新從後端加載，獲取真實 ID
      await this.loadModelsFromBackend();
      // 🔧 Toast 由 IPC 'ai-model-saved' 事件統一處理，避免重複通知
      // SaaS 模式下如果 IPC 事件不觸發，模型列表刷新本身就是成功反饋
    } else {
      // REST 失敗，Fallback 到 IPC
      console.warn('[AI] REST 保存失敗，fallback 到 IPC:', res.error);
      this.ipcService.send('save-ai-model', {
        provider: model.provider,
        modelName: model.modelName,
        displayName: (model as any).displayName || model.modelName,
        apiKey: model.apiKey,
        apiEndpoint: model.apiEndpoint,
        isLocal: (model as any).isLocal || false,
        isDefault: (model as any).isDefault || false
      });
    }
    
    return id;
  }
  
  /**
   * 添加本地 AI 模型
   */
  async addLocalModel(config: {
    modelName: string;
    displayName?: string;
    apiEndpoint: string;
    isDefault?: boolean;
  }): Promise<string> {
    return await this.addModel({
      provider: 'custom' as AIProvider,
      modelName: config.modelName,
      displayName: config.displayName || config.modelName,
      apiKey: '', // 本地 AI 不需要 API Key
      apiEndpoint: config.apiEndpoint,
      isLocal: true,
      isDefault: config.isDefault
    });
  }
  
  async updateModel(id: string, updates: Partial<AIModelConfig>): Promise<void> {
    this.config.update(c => ({
      ...c,
      models: c.models.map(m => m.id === id ? { ...m, ...updates } : m)
    }));
    
    // 🔧 P0-2: 優先 REST 更新
    if (!isNaN(Number(id))) {
      const res = await this.aiSettings.updateModel(Number(id), {
        provider: updates.provider,
        modelName: updates.modelName,
        apiKey: updates.apiKey,
        apiEndpoint: updates.apiEndpoint
      });
      if (!res.success) {
        // Fallback IPC
        this.ipcService.send('update-ai-model', {
          id: Number(id),
          ...updates
        });
      }
    }
  }
  
  async removeModel(id: string): Promise<void> {
    this.config.update(c => ({
      ...c,
      models: c.models.filter(m => m.id !== id),
      defaultModelId: c.defaultModelId === id ? '' : c.defaultModelId
    }));
    
    // 🔧 P0-2: 優先 REST 刪除
    if (!isNaN(Number(id))) {
      const res = await this.aiSettings.deleteModel(Number(id));
      if (!res.success) {
        // Fallback IPC
        this.ipcService.send('delete-ai-model', { id: Number(id) });
      }
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
   * 🔧 P0-2: 使用 REST API
   */
  async saveModelUsageToBackend(): Promise<void> {
    const usage = this.config().modelUsage;
    console.log('[AI] 保存模型用途分配:', usage);
    // REST API 保存
    await this.aiSettings.saveSettings({
      model_usage_intent: usage.intentRecognition,
      model_usage_chat: usage.dailyChat,
      model_usage_script: usage.multiRoleScript
    });
    // 同時 IPC 保持兼容
    this.ipcService.send('save-model-usage', usage);
  }
  
  /**
   * 從後端加載模型用途分配
   * 🔧 P0-2: 優先 REST，fallback IPC
   */
  async loadModelUsageFromBackend(): Promise<void> {
    console.log('[AI] 加載模型用途分配...');
    try {
      const settings = await this.aiSettings.getSettings();
      if (settings.model_usage_intent || settings.model_usage_chat || settings.model_usage_script) {
        this.config.update(c => ({
          ...c,
          modelUsage: {
            ...c.modelUsage,
            intentRecognition: settings.model_usage_intent || c.modelUsage.intentRecognition,
            dailyChat: settings.model_usage_chat || c.modelUsage.dailyChat,
            multiRoleScript: settings.model_usage_script || c.modelUsage.multiRoleScript
          }
        }));
        console.log('[AI] REST 加載用途分配成功');
        
        // 同時加載其他持久化設置
        if (settings.tts_enabled !== undefined) {
          // 觸發事件供組件消費
          window.dispatchEvent(new CustomEvent('ai-settings-loaded', { detail: settings }));
        }
        return;
      }
    } catch (e) {
      console.warn('[AI] REST 加載用途失敗，fallback IPC:', e);
    }
    this.ipcService.send('get-model-usage', {});
  }

  /**
   * 🔧 P0-2: 一鍵保存模型配置頁全部設置
   * 包含：模型用途分配 + TTS + 其他通用設置
   */
  async saveAllModelTabSettings(extraSettings: Record<string, any> = {}): Promise<boolean> {
    const usage = this.config().modelUsage;
    const allSettings: Record<string, any> = {
      model_usage_intent: usage.intentRecognition,
      model_usage_chat: usage.dailyChat,
      model_usage_script: usage.multiRoleScript,
      ...extraSettings
    };
    console.log('[AI] 一鍵保存模型配置頁設置:', allSettings);
    const ok = await this.aiSettings.saveSettings(allSettings);
    if (ok) {
      this.toastService.success('模型配置已保存');
    }
    return ok;
  }

  /**
   * 🔧 P0-2: 保存引擎概覽頁設置（自動聊天、模式等）
   */
  async saveQuickTabSettings(settings: Record<string, any>): Promise<boolean> {
    console.log('[AI] 保存引擎概覽設置:', settings);
    const ok = await this.aiSettings.saveSettings(settings);
    if (ok) {
      this.toastService.success('引擎設置已保存');
    }
    return ok;
  }

  /**
   * 🔧 P0-2: 標記有未保存更改
   */
  markSettingsDirty(): void {
    this.aiSettings.markDirty('settings');
  }
  
  /**
   * 測試模型連接
   * 🔧 P2 優化：REST 優先（後端自動從 DB 補全模型信息），IPC 作為 fallback
   */
  async testModelConnection(id: string): Promise<boolean> {
    const model = this.config().models.find(m => m.id === id);
    if (!model) return false;
    
    // 🔧 檢查是否已在測試中
    if (this._testingModelIds().has(id)) {
      console.log('[AI] 模型已在測試中，跳過:', id);
      return false;
    }
    
    // 🔧 添加到測試中列表
    this._testingModelIds.update(set => {
      const newSet = new Set(set);
      newSet.add(id);
      return newSet;
    });
    
    // 🔧 REST 優先（SaaS 模式 + 已持久化的模型）
    if (!isNaN(Number(id))) {
      try {
        const result = await this.aiSettings.testModel(Number(id));
        if (result.success) {
          // REST 成功 — 直接處理結果（_handleTestResult 會移除 testingId）
          this._handleTestResult({
            modelId: id,
            isConnected: result.isConnected,
            latencyMs: result.latencyMs,
            responsePreview: result.responsePreview,
            availableModels: result.availableModels,
            modelName: result.modelName || model.modelName,
            error: result.error,
          });
          return result.isConnected ?? false;
        }
        // REST 返回失敗（如後端未就緒），fall through 到 IPC
        console.warn('[AI] REST 測試返回失敗，嘗試 IPC:', result.error);
      } catch (e) {
        console.warn('[AI] REST 測試異常，fallback 到 IPC:', e);
      }
    }
    
    // Fallback: IPC（Electron 模式 / 未持久化的模型）
    const extModel = model as ExtendedAIModelConfig;
    this.ipcService.send('test-ai-model', {
      id: !isNaN(Number(id)) ? Number(id) : undefined,
      provider: model.provider,
      modelName: model.modelName,
      apiKey: model.apiKey,
      apiEndpoint: model.apiEndpoint,
      isLocal: extModel.isLocal
    });
    
    // 🔧 60 秒超時保護（自動移除測試中狀態）
    setTimeout(() => {
      this._testingModelIds.update(set => {
        const newSet = new Set(set);
        newSet.delete(id);
        return newSet;
      });
    }, 60000);
    
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
    
    // 🆕 同步到後端數據庫（Toast 由事件監聽器處理，避免重複）
    this.ipcService.send('add-knowledge-base', {
      id,
      name,
      description,
      category: 'general'
    });
    
    // 🔧 FIX: 移除這裡的 Toast，由 knowledge-base-added 事件統一處理
    
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
  
  // 🆕 添加知識條目
  addKnowledgeItem(kbId: string, item: { title: string; content: string; category?: string }) {
    const itemId = `item_${Date.now()}`;
    const now = new Date().toISOString();
    const newItem: KnowledgeItem = {
      id: itemId,
      title: item.title,
      content: item.content,
      category: (item.category || 'custom') as 'product' | 'faq' | 'sales' | 'objection' | 'custom',
      keywords: [],
      priority: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    
    // 更新本地狀態
    this.config.update(c => ({
      ...c,
      knowledgeBases: c.knowledgeBases.map(kb => 
        kb.id === kbId 
          ? { ...kb, items: [...kb.items, newItem], updatedAt: new Date().toISOString() }
          : kb
      )
    }));
    
    // 同步到後端
    this.ipcService.send('add-knowledge-item', {
      kbId,
      id: itemId,
      title: item.title,
      content: item.content,
      category: item.category || 'general'
    });
    
    return itemId;
  }
  
  // 🆕 刪除知識條目
  deleteKnowledgeItem(kbId: string, itemId: string) {
    this.config.update(c => ({
      ...c,
      knowledgeBases: c.knowledgeBases.map(kb => 
        kb.id === kbId 
          ? { ...kb, items: kb.items.filter(i => i.id !== itemId), updatedAt: new Date().toISOString() }
          : kb
      )
    }));
    
    // 同步到後端
    this.ipcService.send('delete-knowledge-item', {
      kbId,
      itemId
    });
  }
  
  // 🆕 AI 自動生成知識庫
  generateKnowledgeBase(kbId: string, businessDescription: string) {
    // 發送到後端進行 AI 生成
    this.ipcService.send('ai-generate-knowledge', {
      kbId,
      businessDescription
    });
  }
  
  // 🆕 處理 AI 生成的知識條目
  handleGeneratedKnowledge(kbId: string, items: Array<{ title: string; content: string; category: string }>) {
    const now = new Date().toISOString();
    
    const newItems: KnowledgeItem[] = items.map((item, index) => ({
      id: `item_${Date.now()}_${index}`,
      title: item.title,
      content: item.content,
      category: (item.category || 'custom') as 'product' | 'faq' | 'sales' | 'objection' | 'custom',
      keywords: [],
      priority: 1,
      isActive: true,
      createdAt: now,
      updatedAt: now
    }));
    
    // 更新本地狀態
    this.config.update(c => ({
      ...c,
      knowledgeBases: c.knowledgeBases.map(kb => 
        kb.id === kbId 
          ? { ...kb, items: [...kb.items, ...newItems], updatedAt: now }
          : kb
      )
    }));
  }
  
  // 🆕 應用行業模板
  applyIndustryTemplate(kbId: string, templateId: string) {
    this.ipcService.send('apply-industry-template', {
      kbId,
      templateId
    });
  }
  
  // 🆕 從聊天記錄學習
  learnFromChatHistory(kbId: string) {
    this.ipcService.send('learn-from-chat-history', {
      kbId,
      days: 7  // 最近 7 天
    });
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
  
  /**
   * 🔧 保存對話策略到後端
   */
  async saveConversationStrategyToBackend(strategy: {
    style: string;
    responseLength: string;
    useEmoji: boolean;
    customPersona: string;
  }): Promise<void> {
    console.log('[AI] 保存對話策略:', strategy);
    
    // 🔧 P0-2: REST 持久化
    await this.aiSettings.saveSettings({
      persona_style: strategy.style,
      persona_length: strategy.responseLength,
      persona_emoji: strategy.useEmoji ? 1 : 0,
      persona_custom: strategy.customPersona
    });
    
    // 兼容 IPC
    this.ipcService.send('save-conversation-strategy', strategy);
    
    // 同時更新本地狀態
    this.updateConversationStrategy({
      style: strategy.style as any,
      responseLength: strategy.responseLength as any,
      useEmoji: strategy.useEmoji,
      customPromptPrefix: strategy.customPersona  // 🔧 FIX: 使用正確的屬性名
    });
    
    this.toastService.success('對話策略已保存');
  }
  
  /**
   * 🔧 從後端載入對話策略
   */
  loadConversationStrategyFromBackend(): void {
    console.log('[AI] 載入對話策略...');
    this.ipcService.send('get-conversation-strategy', {});
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
  
  // ========== 測試結果處理（REST 和 IPC 共用） ==========

  /**
   * 統一處理模型測試結果
   * 可從 REST 響應或 IPC 事件中調用
   */
  private _handleTestResult(data: any): void {
    const modelId = data.modelId ? String(data.modelId) : '';
    
    // 移除測試中狀態
    if (modelId) {
      this._testingModelIds.update(set => {
        const newSet = new Set(set);
        newSet.delete(modelId);
        return newSet;
      });
    }
    
    // Toast 通知
    if (data.isConnected) {
      const latency = data.latencyMs ? `延遲: ${data.latencyMs}ms` : '';
      const preview = data.responsePreview
        ? `\n回覆: "${data.responsePreview.substring(0, 50)}${data.responsePreview.length > 50 ? '...' : ''}"`
        : '';
      const models = data.availableModels?.length > 0
        ? `\n可用模型: ${data.availableModels.slice(0, 3).join(', ')}${data.availableModels.length > 3 ? '...' : ''}`
        : '';
      this.toastService.success(`✓ AI 模型 ${data.modelName || ''} 連接成功！\n${latency}${preview}${models}`);
    } else {
      this.toastService.error(`連接失敗: ${data.error || '未知錯誤'}`);
    }
    
    // 更新本地模型狀態
    if (modelId) {
      this.updateModel(modelId, {
        isConnected: data.isConnected,
        lastTestedAt: new Date().toISOString()
      });
    }
  }

  // ========== 重置 ==========
  
  resetToDefault() {
    this.config.set(DEFAULT_AI_CONFIG);
  }
}
