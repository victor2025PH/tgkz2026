/**
 * AI 策略服務
 * AI Strategy Service - 處理真實 AI 調用，支持本地優先和回退機制
 * 
 * 優先級：
 * 1. 本地 Ollama (Tailscale Funnel)
 * 2. 已配置的雲端 AI (GPT-4/5, Claude, Gemini)
 * 3. 本地模板回退
 */

import { Injectable, signal, inject, computed } from '@angular/core';
import { AIProviderService, AIMessage, AIResponse, AI_PROVIDERS } from '../ai-provider.service';
import { AICenterService } from '../ai-center/ai-center.service';
import { ToastService } from '../toast.service';
import { ElectronIpcService } from '../electron-ipc.service';
import { AIStrategyResult } from './ai-marketing-assistant.component';

// AI 模型選項
export interface AIModelOption {
  id: string;
  name: string;
  provider: string;
  icon: string;
  isLocal: boolean;
  isConnected: boolean;
  endpoint?: string;
  capability?: 'fast' | 'powerful' | 'balanced' | 'economic'; // 能力標籤
}

// 生成狀態
export interface GenerationStatus {
  isGenerating: boolean;
  currentProvider: string;
  progress: number;
  message: string;
}

// 🔧 已保存的策略
export interface SavedStrategy {
  id: string;
  name: string;
  strategy: AIStrategyResult;
  createdAt: string;
  updatedAt: string;
  usedCount: number;
}

// 策略生成 Prompt
const STRATEGY_GENERATION_PROMPT = `你是一位專業的 Telegram 營銷策略專家，精通各行業的客戶獲取和營銷話術。

用戶需求：{USER_INPUT}

請根據用戶需求，生成一份完整的營銷策略。返回純 JSON 格式（不要 markdown 代碼塊）：

{
  "industry": "識別的目標行業",
  "targetAudience": "目標受眾描述",
  "keywords": {
    "highIntent": ["高意向關鍵詞1", "高意向關鍵詞2", "高意向關鍵詞3"],
    "mediumIntent": ["中意向關鍵詞1", "中意向關鍵詞2", "中意向關鍵詞3"],
    "extended": ["擴展關鍵詞1", "擴展關鍵詞2", "擴展關鍵詞3"]
  },
  "customerProfile": {
    "identity": ["身份特徵1", "身份特徵2", "身份特徵3"],
    "features": ["行為特徵1", "行為特徵2", "行為特徵3"],
    "needs": ["核心需求1", "核心需求2", "核心需求3"]
  },
  "recommendedGroups": ["推薦搜索的群組類型1", "推薦群組類型2"],
  "messageTemplates": {
    "firstTouch": "首次觸達消息模板（自然、專業、有吸引力）",
    "followUp": "跟進消息模板",
    "closing": "促成轉化消息模板"
  },
  "automationSettings": {
    "monitorMode": "24/7 全天候",
    "responseDelay": 30,
    "followUpInterval": 7200
  }
}

要求：
1. 關鍵詞要精準，覆蓋行業常用術語和搜索詞
2. 消息模板要自然、專業、有吸引力，避免機器人感
3. 客戶畫像要具體，便於識別目標客戶
4. 只返回 JSON，不要任何其他解釋`;

@Injectable({
  providedIn: 'root'
})
export class AIStrategyService {
  private aiProviderService = inject(AIProviderService);
  private aiCenterService = inject(AICenterService);
  private toastService = inject(ToastService);
  private ipcService = inject(ElectronIpcService);

  // ============ 狀態 ============
  
  // 可用的 AI 模型列表
  private _availableModels = signal<AIModelOption[]>([]);
  availableModels = this._availableModels.asReadonly();

  // 選中的模型 ID
  private _selectedModelId = signal<string>('local-ollama');
  selectedModelId = this._selectedModelId.asReadonly();

  // 本地 AI 配置
  private _localAIConfig = signal({
    endpoint: 'https://ms-defysomwqybz.tail05a567.ts.net/api/chat',
    model: 'huihui_ai/qwen2.5-abliterate',
    isConnected: false,
    lastChecked: ''
  });
  localAIConfig = this._localAIConfig.asReadonly();

  // 生成狀態
  private _generationStatus = signal<GenerationStatus>({
    isGenerating: false,
    currentProvider: '',
    progress: 0,
    message: ''
  });
  generationStatus = this._generationStatus.asReadonly();
  
  // 🔧 已保存的策略列表
  private _savedStrategies = signal<SavedStrategy[]>([]);
  savedStrategies = this._savedStrategies.asReadonly();
  
  // 🔧 當前策略
  private _currentStrategy = signal<AIStrategyResult | null>(null);
  currentStrategy = this._currentStrategy.asReadonly();

  // 計算屬性
  selectedModel = computed(() => 
    this._availableModels().find(m => m.id === this._selectedModelId())
  );

  constructor() {
    this.loadConfig();
    this.refreshAvailableModels();
  }

  // ============ 模型管理 ============

  /**
   * 刷新可用模型列表
   */
  async refreshAvailableModels(): Promise<void> {
    const models: AIModelOption[] = [];

    // 1. 從 AI 中心獲取已配置的本地模型
    const configuredModels = this.aiCenterService.models();
    const localModelsFromCenter = configuredModels.filter(m => (m as any).isLocal);
    
    if (localModelsFromCenter.length > 0) {
      // 使用 AI 中心配置的本地模型
      for (const local of localModelsFromCenter) {
        models.push({
          id: local.id,
          name: (local as any).displayName || local.modelName,
          provider: 'Ollama (本地)',
          icon: '🦙',
          isLocal: true,
          isConnected: local.isConnected,
          endpoint: local.apiEndpoint
        });
        
        // 同步到本地配置
        if (local.apiEndpoint) {
          this._localAIConfig.update(c => ({
            ...c,
            endpoint: local.apiEndpoint!,
            model: local.modelName,
            isConnected: local.isConnected
          }));
        }
      }
    } else {
      // 使用默認本地配置
      const localConfig = this._localAIConfig();
      models.push({
        id: 'local-ollama',
        name: `本地 AI (${localConfig.model})`,
        provider: 'Ollama (Tailscale)',
        icon: '🦙',
        isLocal: true,
        isConnected: localConfig.isConnected,
        endpoint: localConfig.endpoint
      });
    }

    // 2. 從 AI 中心獲取已配置的雲端模型
    const cloudModels = configuredModels.filter(m => !(m as any).isLocal);
    for (const model of cloudModels) {
      const providerInfo = this.getProviderInfo(model.provider);
      const capability = this.getModelCapability(model.modelName);
      models.push({
        id: model.id,
        name: (model as any).displayName || model.modelName,
        provider: providerInfo.name,
        icon: providerInfo.icon,
        isLocal: false,
        isConnected: model.isConnected,
        capability
      });
    }

    // 3. 只使用 AI 中心配置的模型，不添加未配置的推薦模型
    // 如果沒有任何模型，添加提示
    if (models.length === 0) {
      console.log('[AIStrategy] 沒有配置任何 AI 模型，請前往 AI 中心配置');
    }

    // 按連接狀態排序：已連接的在前
    models.sort((a, b) => {
      if (a.isConnected && !b.isConnected) return -1;
      if (!a.isConnected && b.isConnected) return 1;
      if (a.isLocal && !b.isLocal) return -1; // 本地模型優先
      return 0;
    });

    this._availableModels.set(models);
    
    // 如果當前選中的模型不在列表中，自動選擇第一個已連接的模型
    const currentSelected = this._selectedModelId();
    const availableIds = models.map(m => m.id);
    if (!availableIds.includes(currentSelected)) {
      const firstConnected = models.find(m => m.isConnected);
      if (firstConnected) {
        this._selectedModelId.set(firstConnected.id);
      } else if (models.length > 0) {
        this._selectedModelId.set(models[0].id);
      }
    }
  }

  /**
   * 選擇模型
   */
  selectModel(modelId: string): void {
    this._selectedModelId.set(modelId);
    this.saveConfig();
  }

  /**
   * 更新本地 AI 配置
   */
  updateLocalAIConfig(config: Partial<typeof this._localAIConfig extends () => infer R ? R : never>): void {
    this._localAIConfig.update(c => ({ ...c, ...config }));
    this.saveConfig();
    this.refreshAvailableModels();
  }

  /**
   * 測試本地 AI 連接
   */
  async testLocalAIConnection(): Promise<boolean> {
    const config = this._localAIConfig();
    
    try {
      this._generationStatus.set({
        isGenerating: true,
        currentProvider: '本地 Ollama',
        progress: 50,
        message: '正在測試連接...'
      });

      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: 'user', content: 'Hi, please respond with OK.' }],
          stream: false,
          options: { temperature: 0.1, num_predict: 10 }
        }),
        signal: AbortSignal.timeout(10000) // 10秒超時
      });

      if (response.ok) {
        const data = await response.json();
        if (data.message?.content) {
          this._localAIConfig.update(c => ({ 
            ...c, 
            isConnected: true, 
            lastChecked: new Date().toISOString() 
          }));
          this.refreshAvailableModels();
          this.toastService.success('本地 AI 連接成功！');
          return true;
        }
      }

      throw new Error('無效響應');
    } catch (error: any) {
      this._localAIConfig.update(c => ({ 
        ...c, 
        isConnected: false, 
        lastChecked: new Date().toISOString() 
      }));
      this.refreshAvailableModels();
      this.toastService.error(`本地 AI 連接失敗: ${error.message}`);
      return false;
    } finally {
      this._generationStatus.set({
        isGenerating: false,
        currentProvider: '',
        progress: 0,
        message: ''
      });
    }
  }

  // ============ 策略生成 ============

  /**
   * 生成 AI 營銷策略
   * 🔧 根據用戶選擇的模型來調用 AI
   */
  async generateStrategy(userInput: string): Promise<AIStrategyResult | null> {
    const prompt = STRATEGY_GENERATION_PROMPT.replace('{USER_INPUT}', userInput);
    const messages: AIMessage[] = [
      { role: 'system', content: '你是一位專業的 Telegram 營銷策略專家，只返回 JSON 格式的策略分析結果。' },
      { role: 'user', content: prompt }
    ];

    // 🔧 獲取用戶選擇的模型
    const selected = this.selectedModel();
    const modelName = selected?.name || '本地 AI';
    const isLocal = selected?.isLocal ?? true;
    
    console.log(`[AIStrategy] 使用模型: ${modelName}, isLocal: ${isLocal}`);

    // 🔧 根據選擇的模型類型調用
    if (isLocal) {
      // ========== 本地 AI ==========
      this._generationStatus.set({
        isGenerating: true,
        currentProvider: modelName,
        progress: 20,
        message: `正在使用 ${modelName} 分析...`
      });

      try {
        const localResult = await this.callLocalAI(messages);
        if (localResult) {
          const strategy = this.parseStrategyResponse(localResult);
          if (strategy) {
            this._generationStatus.set({
              isGenerating: false,
              currentProvider: modelName,
              progress: 100,
              message: '生成完成！'
            });
            return strategy;
          }
        }
      } catch (error: any) {
        console.warn(`[AIStrategy] ${modelName} 失敗:`, error.message);
        this.toastService.warning(`${modelName} 調用失敗，嘗試雲端回退...`);
      }
      
      // 本地失敗，回退到雲端
      this._generationStatus.set({
        isGenerating: true,
        currentProvider: '雲端 AI (回退)',
        progress: 50,
        message: '本地 AI 不可用，正在使用雲端 AI...'
      });

      try {
        const cloudResult = await this.callCloudAI(messages);
        if (cloudResult) {
          const strategy = this.parseStrategyResponse(cloudResult);
          if (strategy) {
            this._generationStatus.set({
              isGenerating: false,
              currentProvider: '雲端 AI',
              progress: 100,
              message: '生成完成！'
            });
            return strategy;
          }
        }
      } catch (error: any) {
        console.warn('[AIStrategy] 雲端 AI 回退失敗:', error.message);
      }
    } else {
      // ========== 雲端 AI（用戶明確選擇） ==========
      this._generationStatus.set({
        isGenerating: true,
        currentProvider: modelName,
        progress: 30,
        message: `正在使用 ${modelName} 分析...`
      });

      try {
        // 🔧 使用選定的模型調用
        const cloudResult = await this.callSelectedCloudModel(messages, selected!);
        if (cloudResult) {
          const strategy = this.parseStrategyResponse(cloudResult);
          if (strategy) {
            this._generationStatus.set({
              isGenerating: false,
              currentProvider: modelName,
              progress: 100,
              message: '生成完成！'
            });
            return strategy;
          }
        }
      } catch (error: any) {
        console.warn(`[AIStrategy] ${modelName} 失敗:`, error.message);
        this.toastService.warning(`${modelName} 調用失敗，嘗試其他模型...`);
      }

      // 選定的雲端模型失敗，嘗試其他雲端模型
      this._generationStatus.set({
        isGenerating: true,
        currentProvider: '其他雲端模型',
        progress: 60,
        message: '嘗試其他可用模型...'
      });

      try {
        const cloudResult = await this.callCloudAI(messages);
        if (cloudResult) {
          const strategy = this.parseStrategyResponse(cloudResult);
          if (strategy) {
            this._generationStatus.set({
              isGenerating: false,
              currentProvider: '雲端 AI',
              progress: 100,
              message: '生成完成！'
            });
            return strategy;
          }
        }
      } catch (error: any) {
        console.warn('[AIStrategy] 所有雲端 AI 失敗:', error.message);
      }
    }

    // 3. 最終回退到模板
    this._generationStatus.set({
      isGenerating: true,
      currentProvider: '模板回退',
      progress: 80,
      message: 'AI 不可用，使用智能模板...'
    });

    const templateResult = this.generateFromTemplate(userInput);
    
    this._generationStatus.set({
      isGenerating: false,
      currentProvider: '模板回退',
      progress: 100,
      message: '生成完成（模板模式）'
    });

    return templateResult;
  }

  /**
   * 調用本地 Ollama AI
   */
  private async callLocalAI(messages: AIMessage[]): Promise<string | null> {
    const config = this._localAIConfig();
    
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 2048,
          top_p: 0.9
        }
      }),
      signal: AbortSignal.timeout(30000) // 30秒超時
    });

    if (!response.ok) {
      throw new Error(`本地 AI 請求失敗: ${response.status}`);
    }

    const data = await response.json();
    return data.message?.content || null;
  }

  /**
   * 調用雲端 AI
   * 🔧 優先使用後端 IPC 代理，保護 API Key 並避免 CORS 問題
   */
  private async callCloudAI(messages: AIMessage[]): Promise<string | null> {
    // 🔧 方式 1：通過後端 IPC 代理調用（推薦）
    try {
      console.log('[AIStrategy] 嘗試通過後端 IPC 調用 AI...');
      const result = await this.callAIViaBackend(messages);
      if (result) {
        console.log('[AIStrategy] 後端 IPC 調用成功');
        return result;
      }
    } catch (error) {
      console.warn('[AIStrategy] 後端 IPC 調用失敗:', error);
    }
    
    // 🔧 方式 2：前端直接調用（備用）
    const allModels = this.aiCenterService.models();
    const connectedModels = allModels.filter(m => m.isConnected && !(m as any).isLocal);
    const modelsToTry = connectedModels.length > 0 ? connectedModels : allModels.filter(m => !(m as any).isLocal && m.apiKey);
    
    for (const model of modelsToTry) {
      try {
        console.log(`[AIStrategy] 嘗試雲端模型: ${model.modelName}`);
        
        // 使用 AIProviderService 調用
        this.aiProviderService.setConfig({
          provider: model.provider as any,
          model: model.modelName,
          apiKey: model.apiKey,
          baseUrl: model.apiEndpoint
        });
        
        const response = await this.aiProviderService.chat(messages);
        if (response.content) {
          return response.content;
        }
      } catch (error) {
        console.warn(`[AIStrategy] 雲端模型 ${model.modelName} 失敗:`, error);
      }
    }

    // 嘗試直接使用 AIProviderService 的當前配置
    if (this.aiProviderService.isConnected()) {
      try {
        const response = await this.aiProviderService.chat(messages);
        return response.content;
      } catch (error) {
        console.warn('[AIStrategy] AIProviderService 調用失敗:', error);
      }
    }

    return null;
  }
  
  /**
   * 🔧 通過後端 IPC 調用 AI（保護 API Key）
   */
  private callAIViaBackend(messages: AIMessage[]): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.ipcService.off('ai-response', handler);
        reject(new Error('後端 AI 調用超時'));
      }, 60000); // 60 秒超時
      
      const handler = (result: any) => {
        clearTimeout(timeout);
        this.ipcService.off('ai-response', handler);
        
        if (result.success && result.response) {
          resolve(result.response);
        } else if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(null);
        }
      };
      
      this.ipcService.on('ai-response', handler);
      
      // 🔧 轉換消息格式為後端期望的格式
      const systemMessage = messages.find(m => m.role === 'system');
      const userMessage = messages.find(m => m.role === 'user');
      
      // 獲取本地 AI 配置
      const localConfig = this._localAIConfig();
      
      // 發送請求到後端
      this.ipcService.send('generate-ai-response', {
        userId: 'strategy-generator',
        message: userMessage?.content || '',
        systemPrompt: systemMessage?.content || '',
        localAiEndpoint: localConfig.endpoint,
        localAiModel: localConfig.model
      });
    });
  }
  
  /**
   * 🔧 調用選定的雲端模型
   */
  private async callSelectedCloudModel(messages: AIMessage[], selectedModel: AIModelOption): Promise<string | null> {
    // 從 AI 中心找到對應的完整模型配置
    const allModels = this.aiCenterService.models();
    const modelConfig = allModels.find(m => m.id === selectedModel.id);
    
    if (!modelConfig) {
      console.warn(`[AIStrategy] 找不到模型配置: ${selectedModel.id}`);
      return null;
    }
    
    if (!modelConfig.apiKey && !modelConfig.isConnected) {
      console.warn(`[AIStrategy] 模型 ${selectedModel.name} 未配置 API Key`);
      this.toastService.error(`請先在 AI 中心配置 ${selectedModel.name} 的 API Key`);
      return null;
    }
    
    console.log(`[AIStrategy] 調用選定模型: ${modelConfig.modelName}, provider: ${modelConfig.provider}`);
    
    // 使用 AIProviderService 調用
    this.aiProviderService.setConfig({
      provider: modelConfig.provider as any,
      model: modelConfig.modelName,
      apiKey: modelConfig.apiKey,
      baseUrl: modelConfig.apiEndpoint
    });
    
    const response = await this.aiProviderService.chat(messages);
    return response.content;
  }
  
  /**
   * 從 AI 中心獲取已配置的本地 AI
   */
  getLocalAIFromCenter(): { endpoint: string; model: string } | null {
    const localModels = this.aiCenterService.models().filter(m => (m as any).isLocal);
    if (localModels.length > 0) {
      const local = localModels[0];
      return {
        endpoint: local.apiEndpoint || '',
        model: local.modelName
      };
    }
    return null;
  }
  
  /**
   * 同步本地 AI 配置從 AI 中心
   */
  syncLocalAIFromCenter(): void {
    const localFromCenter = this.getLocalAIFromCenter();
    if (localFromCenter && localFromCenter.endpoint) {
      this._localAIConfig.update(c => ({
        ...c,
        endpoint: localFromCenter.endpoint,
        model: localFromCenter.model
      }));
    }
  }

  /**
   * 解析 AI 返回的策略 JSON
   */
  private parseStrategyResponse(response: string): AIStrategyResult | null {
    try {
      // 嘗試提取 JSON（可能被包在 markdown 代碼塊中）
      let jsonStr = response;
      
      // 移除 markdown 代碼塊
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      // 嘗試找到 JSON 對象
      const jsonStart = jsonStr.indexOf('{');
      const jsonEnd = jsonStr.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);
      }

      const parsed = JSON.parse(jsonStr);

      // 驗證必要字段
      if (!parsed.industry || !parsed.keywords) {
        throw new Error('缺少必要字段');
      }

      // 補充缺失字段
      return {
        industry: parsed.industry || '未識別行業',
        targetAudience: parsed.targetAudience || '目標客戶群體',
        keywords: {
          highIntent: parsed.keywords?.highIntent || [],
          mediumIntent: parsed.keywords?.mediumIntent || [],
          extended: parsed.keywords?.extended || []
        },
        customerProfile: {
          identity: parsed.customerProfile?.identity || [],
          features: parsed.customerProfile?.features || [],
          needs: parsed.customerProfile?.needs || []
        },
        recommendedGroups: parsed.recommendedGroups || [],
        messageTemplates: {
          firstTouch: parsed.messageTemplates?.firstTouch || '',
          followUp: parsed.messageTemplates?.followUp || '',
          closing: parsed.messageTemplates?.closing || ''
        },
        automationSettings: {
          monitorMode: parsed.automationSettings?.monitorMode || '24/7 全天候',
          responseDelay: parsed.automationSettings?.responseDelay || 30,
          followUpInterval: parsed.automationSettings?.followUpInterval || 7200
        }
      };
    } catch (error) {
      console.error('[AIStrategy] 解析 AI 響應失敗:', error, response);
      return null;
    }
  }

  /**
   * 從模板生成策略（回退方案）
   */
  private generateFromTemplate(userInput: string): AIStrategyResult {
    // 智能識別行業
    let industry = '通用行業';
    let keywords = {
      highIntent: ['合作', '代理', '對接'],
      mediumIntent: ['資源', '渠道', '業務'],
      extended: ['交流', '了解', '咨詢']
    };

    if (userInput.includes('支付') || userInput.includes('換匯') || userInput.includes('跑分')) {
      industry = '支付/換匯';
      keywords = {
        highIntent: ['支付通道', 'U商', '換匯', 'USDT', '代收代付', '跑分'],
        mediumIntent: ['四方支付', '三方支付', 'API對接', '承兌商'],
        extended: ['OTC', '收款', '出款', '費率', 'T+0', 'T+1']
      };
    } else if (userInput.includes('幣') || userInput.includes('加密') || userInput.includes('BTC')) {
      industry = '加密貨幣';
      keywords = {
        highIntent: ['BTC', 'ETH', '合約', '現貨', '交易所'],
        mediumIntent: ['DeFi', 'NFT', '錢包', '公鏈'],
        extended: ['挖礦', '質押', '空投', 'IDO']
      };
    } else if (userInput.includes('電商') || userInput.includes('跨境') || userInput.includes('亞馬遜')) {
      industry = '電商/跨境';
      keywords = {
        highIntent: ['亞馬遜', '獨立站', 'Shopify', '物流', '選品'],
        mediumIntent: ['FBA', '海外倉', '清關', '支付'],
        extended: ['測評', '刷單', '站外推廣']
      };
    }

    return {
      industry,
      targetAudience: this.extractAudience(userInput),
      keywords,
      customerProfile: {
        identity: ['代理商', '項目方', '運營人員'],
        features: ['活躍在相關群組', '經常發業務消息', '有明確需求'],
        needs: ['尋找合作夥伴', '解決業務痛點', '獲取更多資源']
      },
      recommendedGroups: [`${industry}交流群`, '業務對接群', '項目合作群'],
      messageTemplates: {
        firstTouch: `您好！看到您在群裡的消息，我們專注${industry}行業，能為您提供專業服務。方便聊聊嗎？`,
        followUp: '請問您目前業務上有什麼具體需求嗎？我們可以根據您的情況提供定制方案。',
        closing: '要不這樣，我先給您開個測試賬號/發個資料，您體驗一下？'
      },
      automationSettings: {
        monitorMode: '24/7 全天候',
        responseDelay: 30,
        followUpInterval: 7200
      }
    };
  }

  private extractAudience(input: string): string {
    if (input.includes('代理')) return '代理商/渠道商';
    if (input.includes('客戶')) return '終端客戶';
    if (input.includes('項目')) return '項目方/運營商';
    return '目標客戶群體';
  }

  private getProviderInfo(provider: string): { name: string; icon: string } {
    switch (provider) {
      case 'openai': return { name: 'OpenAI', icon: '🤖' };
      case 'claude': return { name: 'Anthropic', icon: '🧠' };
      case 'gemini': return { name: 'Google', icon: '✨' };
      default: return { name: provider, icon: '🔧' };
    }
  }
  
  /**
   * 根據模型名稱判斷能力標籤
   */
  private getModelCapability(modelName: string): 'fast' | 'powerful' | 'balanced' | 'economic' {
    const name = modelName.toLowerCase();
    
    // 快速模型
    if (name.includes('flash') || name.includes('mini') || name.includes('haiku') || name.includes('3.5-turbo')) {
      return 'fast';
    }
    
    // 強大模型
    if (name.includes('opus') || name.includes('pro') || name.includes('gpt-4o') || name.includes('ultra')) {
      return 'powerful';
    }
    
    // 經濟模型
    if (name.includes('mini') || name.includes('nano') || name.includes('lite')) {
      return 'economic';
    }
    
    return 'balanced';
  }

  // ============ 配置持久化 ============

  private loadConfig(): void {
    try {
      const stored = localStorage.getItem('ai-strategy-config');
      if (stored) {
        const config = JSON.parse(stored);
        if (config.localAIConfig) {
          this._localAIConfig.set(config.localAIConfig);
        }
        if (config.selectedModelId) {
          this._selectedModelId.set(config.selectedModelId);
        }
      }
      
      // 🔧 加載已保存的策略
      this.loadSavedStrategies();
    } catch (e) {
      console.error('Failed to load AI strategy config:', e);
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('ai-strategy-config', JSON.stringify({
        localAIConfig: this._localAIConfig(),
        selectedModelId: this._selectedModelId()
      }));
    } catch (e) {
      console.error('Failed to save AI strategy config:', e);
    }
  }
  
  // ============ 🔧 策略持久化 ============
  
  /**
   * 加載已保存的策略
   */
  private loadSavedStrategies(): void {
    try {
      const stored = localStorage.getItem('ai-saved-strategies');
      if (stored) {
        const strategies = JSON.parse(stored) as SavedStrategy[];
        this._savedStrategies.set(strategies);
        console.log(`[AIStrategy] 已加載 ${strategies.length} 個保存的策略`);
      }
    } catch (e) {
      console.error('Failed to load saved strategies:', e);
    }
  }
  
  /**
   * 保存策略
   */
  saveStrategy(strategy: AIStrategyResult, name?: string): SavedStrategy {
    const savedStrategy: SavedStrategy = {
      id: `strategy-${Date.now()}`,
      name: name || `${strategy.industry} - ${new Date().toLocaleDateString('zh-TW')}`,
      strategy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usedCount: 0
    };
    
    const strategies = [...this._savedStrategies(), savedStrategy];
    this._savedStrategies.set(strategies);
    this._currentStrategy.set(strategy);
    
    // 保存到 localStorage
    try {
      localStorage.setItem('ai-saved-strategies', JSON.stringify(strategies));
    } catch (e) {
      console.error('Failed to save strategies:', e);
    }
    
    this.toastService.success('策略已保存！');
    return savedStrategy;
  }
  
  /**
   * 加載策略
   */
  loadStrategy(strategyId: string): AIStrategyResult | null {
    const saved = this._savedStrategies().find(s => s.id === strategyId);
    if (saved) {
      // 更新使用次數
      saved.usedCount++;
      saved.updatedAt = new Date().toISOString();
      
      this._currentStrategy.set(saved.strategy);
      this.persistStrategies();
      
      return saved.strategy;
    }
    return null;
  }
  
  /**
   * 刪除策略
   */
  deleteStrategy(strategyId: string): void {
    const strategies = this._savedStrategies().filter(s => s.id !== strategyId);
    this._savedStrategies.set(strategies);
    this.persistStrategies();
    this.toastService.success('策略已刪除');
  }
  
  /**
   * 設置當前策略
   */
  setCurrentStrategy(strategy: AIStrategyResult | null): void {
    this._currentStrategy.set(strategy);
  }
  
  /**
   * 持久化策略列表
   */
  private persistStrategies(): void {
    try {
      localStorage.setItem('ai-saved-strategies', JSON.stringify(this._savedStrategies()));
    } catch (e) {
      console.error('Failed to persist strategies:', e);
    }
  }
}
