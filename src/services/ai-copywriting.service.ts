/**
 * AI 話術生成服務
 * AI Copywriting Service
 * 
 * 🆕 AI優化: 智能話術生成
 * 
 * 功能：
 * - 開場白生成
 * - 回覆建議
 * - 話術優化
 * - 多風格支持
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { AICenterService } from '../ai-center/ai-center.service';

// 生成類型
export type CopywritingType = 
  | 'greeting'         // 開場白
  | 'reply'            // 回覆
  | 'follow_up'        // 跟進
  | 'objection'        // 異議處理
  | 'closing'          // 促成成交
  | 'retention';       // 挽回

// 話術風格
export type CopywritingStyle = 
  | 'professional'     // 專業正式
  | 'friendly'         // 親切友好
  | 'casual'           // 輕鬆隨意
  | 'urgent'           // 緊迫感
  | 'empathetic';      // 同理心

// 生成請求
export interface CopywritingRequest {
  type: CopywritingType;
  style?: CopywritingStyle;
  context?: {
    productName?: string;
    customerName?: string;
    previousMessages?: string[];
    objection?: string;
    goal?: string;
  };
  options?: {
    count?: number;        // 生成數量
    maxLength?: number;    // 最大長度
    includeEmoji?: boolean;
    language?: 'zh-TW' | 'zh-CN' | 'en';
  };
}

// 生成結果
export interface CopywritingResult {
  id: string;
  text: string;
  type: CopywritingType;
  style: CopywritingStyle;
  score: number;          // 質量評分
  tags: string[];
  createdAt: string;
}

// 模板
export interface CopywritingTemplate {
  id: string;
  name: string;
  type: CopywritingType;
  style: CopywritingStyle;
  template: string;
  variables: string[];
  examples: string[];
  isSystem: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AICopywritingService {
  private ipc = inject(ElectronIpcService);
  private aiService = inject(AICenterService);
  
  // 狀態
  private _isGenerating = signal(false);
  isGenerating = this._isGenerating.asReadonly();
  
  private _recentResults = signal<CopywritingResult[]>([]);
  recentResults = this._recentResults.asReadonly();
  
  private _savedTemplates = signal<CopywritingTemplate[]>([]);
  savedTemplates = this._savedTemplates.asReadonly();
  
  // 系統模板
  private systemTemplates: CopywritingTemplate[] = [
    {
      id: 'sys-greeting-1',
      name: '友好問候',
      type: 'greeting',
      style: 'friendly',
      template: '嗨 {customerName}！我是{productName}的{role}。看到您對我們產品有興趣，想了解更多嗎？😊',
      variables: ['customerName', 'productName', 'role'],
      examples: ['嗨 王先生！我是智能行銷助手的產品顧問。看到您對我們產品有興趣，想了解更多嗎？😊'],
      isSystem: true
    },
    {
      id: 'sys-greeting-2',
      name: '專業開場',
      type: 'greeting',
      style: 'professional',
      template: '您好，{customerName}。我是{company}的{role}，很高興為您服務。請問有什麼可以幫助您的嗎？',
      variables: ['customerName', 'company', 'role'],
      examples: ['您好，張經理。我是ABC公司的業務顧問，很高興為您服務。請問有什麼可以幫助您的嗎？'],
      isSystem: true
    },
    {
      id: 'sys-objection-1',
      name: '價格異議',
      type: 'objection',
      style: 'empathetic',
      template: '完全理解您的考慮！很多客戶一開始也有同樣的想法。不過實際使用後，他們發現{benefit}，投資回報其實很可觀。要不我分享幾個成功案例給您看看？',
      variables: ['benefit'],
      examples: ['完全理解您的考慮！很多客戶一開始也有同樣的想法。不過實際使用後，他們發現效率提升了3倍，投資回報其實很可觀。要不我分享幾個成功案例給您看看？'],
      isSystem: true
    },
    {
      id: 'sys-closing-1',
      name: '限時優惠',
      type: 'closing',
      style: 'urgent',
      template: '對了，現在正好有{promotion}活動，{deadline}截止！這個時候入手真的很划算。需要我幫您鎖定名額嗎？',
      variables: ['promotion', 'deadline'],
      examples: ['對了，現在正好有年終特惠活動，本月底截止！這個時候入手真的很划算。需要我幫您鎖定名額嗎？'],
      isSystem: true
    },
    {
      id: 'sys-followup-1',
      name: '溫柔跟進',
      type: 'follow_up',
      style: 'friendly',
      template: '嗨 {customerName}，好久不見！上次聊到{topic}，不知道您後來考慮得怎麼樣了？有任何問題都可以隨時問我哦～',
      variables: ['customerName', 'topic'],
      examples: ['嗨 李小姐，好久不見！上次聊到升級方案，不知道您後來考慮得怎麼樣了？有任何問題都可以隨時問我哦～'],
      isSystem: true
    },
    {
      id: 'sys-retention-1',
      name: '挽回流失',
      type: 'retention',
      style: 'empathetic',
      template: '{customerName}，好久沒看到您了，有點想念呢！是不是最近太忙了？我們最近推出了{newFeature}，覺得特別適合您，要不要來看看？',
      variables: ['customerName', 'newFeature'],
      examples: ['王先生，好久沒看到您了，有點想念呢！是不是最近太忙了？我們最近推出了智能報表功能，覺得特別適合您，要不要來看看？'],
      isSystem: true
    }
  ];
  
  constructor() {
    this.loadSavedTemplates();
  }
  
  /**
   * 生成話術
   */
  async generate(request: CopywritingRequest): Promise<CopywritingResult[]> {
    this._isGenerating.set(true);
    
    try {
      const count = request.options?.count || 3;
      const results: CopywritingResult[] = [];
      
      // 構建 prompt
      const prompt = this.buildPrompt(request);
      
      // 調用 AI 生成
      const response = await this.ipc.invoke('ai-generate-text', {
        prompt,
        maxTokens: request.options?.maxLength || 200,
        count
      });
      
      if (response.success && response.texts) {
        for (const text of response.texts) {
          const result: CopywritingResult = {
            id: `copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: this.postProcess(text, request),
            type: request.type,
            style: request.style || 'friendly',
            score: this.evaluateQuality(text, request),
            tags: this.extractTags(request),
            createdAt: new Date().toISOString()
          };
          results.push(result);
        }
        
        // 保存到最近結果
        this._recentResults.update(r => [...results, ...r].slice(0, 50));
      } else {
        // 使用模板作為回退
        const templates = this.getTemplatesForType(request.type);
        for (const template of templates.slice(0, count)) {
          const result: CopywritingResult = {
            id: `copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: this.applyTemplate(template, request.context || {}),
            type: request.type,
            style: template.style,
            score: 70,
            tags: ['模板'],
            createdAt: new Date().toISOString()
          };
          results.push(result);
        }
      }
      
      return results;
    } finally {
      this._isGenerating.set(false);
    }
  }
  
  /**
   * 優化現有話術
   */
  async optimize(text: string, style: CopywritingStyle): Promise<string> {
    this._isGenerating.set(true);
    
    try {
      const prompt = `請將以下話術優化為${this.getStyleDescription(style)}風格，保持原意但更有吸引力：

原文：${text}

優化後：`;
      
      const response = await this.ipc.invoke('ai-generate-text', {
        prompt,
        maxTokens: 300,
        count: 1
      });
      
      if (response.success && response.texts?.[0]) {
        return response.texts[0];
      }
      
      return text;
    } finally {
      this._isGenerating.set(false);
    }
  }
  
  /**
   * 生成回覆建議
   */
  async suggestReply(
    customerMessage: string,
    context?: {
      previousMessages?: string[];
      customerInfo?: any;
      productInfo?: any;
    }
  ): Promise<CopywritingResult[]> {
    return this.generate({
      type: 'reply',
      style: 'friendly',
      context: {
        previousMessages: [customerMessage, ...(context?.previousMessages || [])]
      },
      options: {
        count: 3
      }
    });
  }
  
  // ============ 模板管理 ============
  
  /**
   * 獲取所有模板
   */
  getAllTemplates(): CopywritingTemplate[] {
    return [...this.systemTemplates, ...this._savedTemplates()];
  }
  
  /**
   * 獲取特定類型的模板
   */
  getTemplatesForType(type: CopywritingType): CopywritingTemplate[] {
    return this.getAllTemplates().filter(t => t.type === type);
  }
  
  /**
   * 保存自定義模板
   */
  saveTemplate(template: Omit<CopywritingTemplate, 'id' | 'isSystem'>): void {
    const newTemplate: CopywritingTemplate = {
      ...template,
      id: `tpl-${Date.now()}`,
      isSystem: false
    };
    
    this._savedTemplates.update(t => [...t, newTemplate]);
    this.persistTemplates();
  }
  
  /**
   * 刪除模板
   */
  deleteTemplate(id: string): void {
    this._savedTemplates.update(t => t.filter(x => x.id !== id));
    this.persistTemplates();
  }
  
  /**
   * 應用模板
   */
  applyTemplate(template: CopywritingTemplate, variables: Record<string, any>): string {
    let result = template.template;
    
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value || '');
    }
    
    // 清理未替換的變量
    result = result.replace(/\{[^}]+\}/g, '');
    
    return result.trim();
  }
  
  // ============ 私有方法 ============
  
  private buildPrompt(request: CopywritingRequest): string {
    const typePrompts: Record<CopywritingType, string> = {
      greeting: '生成開場白/問候語',
      reply: '生成回覆消息',
      follow_up: '生成跟進消息',
      objection: '生成異議處理話術',
      closing: '生成促成成交話術',
      retention: '生成挽回客戶話術'
    };
    
    const styleDesc = request.style ? `風格要求：${this.getStyleDescription(request.style)}` : '';
    
    let prompt = `作為專業的銷售話術專家，請${typePrompts[request.type]}。

${styleDesc}

`;
    
    if (request.context?.productName) {
      prompt += `產品/服務：${request.context.productName}\n`;
    }
    
    if (request.context?.customerName) {
      prompt += `客戶稱呼：${request.context.customerName}\n`;
    }
    
    if (request.context?.previousMessages?.length) {
      prompt += `\n對話上下文：\n${request.context.previousMessages.join('\n')}\n`;
    }
    
    if (request.context?.objection) {
      prompt += `\n客戶異議：${request.context.objection}\n`;
    }
    
    if (request.context?.goal) {
      prompt += `\n目標：${request.context.goal}\n`;
    }
    
    prompt += `\n要求：
1. 自然口語化，不要太生硬
2. 簡潔有力，不要太長
3. 有親和力，讓客戶感到舒適
${request.options?.includeEmoji ? '4. 適當使用表情符號' : ''}

請直接給出話術，不需要解釋：`;
    
    return prompt;
  }
  
  private getStyleDescription(style: CopywritingStyle): string {
    const descriptions: Record<CopywritingStyle, string> = {
      professional: '專業正式，用詞精準，給人信賴感',
      friendly: '親切友好，像朋友聊天一樣自然',
      casual: '輕鬆隨意，口語化，不拘謹',
      urgent: '帶有適度緊迫感，促進決策',
      empathetic: '富有同理心，理解客戶處境'
    };
    return descriptions[style];
  }
  
  private postProcess(text: string, request: CopywritingRequest): string {
    let result = text.trim();
    
    // 移除可能的引號
    if (result.startsWith('"') && result.endsWith('"')) {
      result = result.slice(1, -1);
    }
    
    // 處理變量替換
    if (request.context?.customerName) {
      result = result.replace(/\{customerName\}/g, request.context.customerName);
    }
    if (request.context?.productName) {
      result = result.replace(/\{productName\}/g, request.context.productName);
    }
    
    return result;
  }
  
  private evaluateQuality(text: string, request: CopywritingRequest): number {
    let score = 70;
    
    // 長度適中
    if (text.length >= 20 && text.length <= 200) score += 10;
    
    // 包含表情（如果要求）
    if (request.options?.includeEmoji && /[\u{1F300}-\u{1F9FF}]/u.test(text)) {
      score += 5;
    }
    
    // 有問句（互動性）
    if (text.includes('？') || text.includes('?')) score += 5;
    
    // 使用客戶名稱（個性化）
    if (request.context?.customerName && text.includes(request.context.customerName)) {
      score += 5;
    }
    
    return Math.min(100, score);
  }
  
  private extractTags(request: CopywritingRequest): string[] {
    const tags: string[] = [request.type];
    
    if (request.style) tags.push(request.style);
    if (request.options?.includeEmoji) tags.push('emoji');
    if (request.context?.productName) tags.push('產品相關');
    
    return tags;
  }
  
  private loadSavedTemplates(): void {
    try {
      const saved = localStorage.getItem('copywriting_templates');
      if (saved) {
        this._savedTemplates.set(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
  }
  
  private persistTemplates(): void {
    localStorage.setItem('copywriting_templates', JSON.stringify(this._savedTemplates()));
  }
}
