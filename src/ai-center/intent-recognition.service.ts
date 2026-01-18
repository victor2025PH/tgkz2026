/**
 * 意圖識別服務
 * Intent Recognition Service
 * 
 * 使用 AI 分析用戶消息意圖，支持：
 * - 購買意向識別
 * - 價格敏感度
 * - 情緒分析
 * - 緊急程度判斷
 */

import { Injectable, inject, signal } from '@angular/core';
import { AIProviderService, AIMessage } from '../ai-provider.service';
import { IntentType } from './ai-center.models';

// 意圖識別結果
export interface IntentResult {
  intent: IntentType;
  confidence: number;
  subIntents: string[];
  keywords: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  urgency: 'low' | 'medium' | 'high';
  suggestedAction: string;
  rawAnalysis?: string;
}

// 對話上下文
export interface ConversationContext {
  id: string;
  userId: string;
  messages: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    intent?: IntentResult;
  }[];
  currentStage: 'initial' | 'exploring' | 'interested' | 'negotiating' | 'closing';
  intentHistory: IntentType[];
  totalScore: number;
  createdAt: Date;
  updatedAt: Date;
}

// 意圖識別 Prompt
const INTENT_RECOGNITION_PROMPT = `你是一個專業的銷售意圖分析專家。分析用戶消息並識別其意圖。

請按以下 JSON 格式回覆（不要包含任何其他文字）：
{
  "intent": "意圖類型",
  "confidence": 0.0-1.0,
  "subIntents": ["子意圖1", "子意圖2"],
  "keywords": ["關鍵詞1", "關鍵詞2"],
  "sentiment": "positive/neutral/negative",
  "urgency": "low/medium/high",
  "suggestedAction": "建議的下一步動作"
}

意圖類型必須是以下之一：
- purchase_intent: 有購買意向（詢問如何購買、下單、付款等）
- price_inquiry: 詢問價格（多少錢、費用、優惠等）
- product_question: 產品問題（功能、特性、使用方法等）
- complaint: 抱怨或不滿
- general_chat: 一般聊天
- negative_sentiment: 負面情緒
- high_value: 高價值客戶信號
- urgent: 緊急需求`;

@Injectable({
  providedIn: 'root'
})
export class IntentRecognitionService {
  private aiProvider = inject(AIProviderService);
  
  // 對話上下文存儲
  private conversations = signal<Map<string, ConversationContext>>(new Map());
  
  // 識別緩存
  private cache = new Map<string, { result: IntentResult; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1分鐘緩存
  
  /**
   * 識別用戶意圖
   */
  async recognizeIntent(
    message: string, 
    userId?: string,
    includeContext: boolean = true
  ): Promise<IntentResult> {
    // 檢查緩存
    const cacheKey = this.getCacheKey(message, userId);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.result;
    }
    
    // 構建消息
    const messages: AIMessage[] = [
      { role: 'system', content: INTENT_RECOGNITION_PROMPT }
    ];
    
    // 添加對話上下文
    if (userId && includeContext) {
      const context = this.getContext(userId);
      if (context && context.messages.length > 0) {
        const recentMessages = context.messages.slice(-5);
        messages.push({
          role: 'user',
          content: `對話歷史：\n${recentMessages.map(m => `[${m.role}]: ${m.content}`).join('\n')}\n\n請分析最新消息的意圖。`
        });
      }
    }
    
    messages.push({ role: 'user', content: `用戶消息：${message}` });
    
    try {
      // 使用 AI 分析
      const response = await this.aiProvider.chat(messages, {
        temperature: 0.3, // 較低溫度以獲得更穩定的結果
        maxTokens: 500
      });
      
      const result = this.parseIntentResponse(response.content, message);
      
      // 緩存結果
      this.cache.set(cacheKey, { result, timestamp: Date.now() });
      
      // 更新對話上下文
      if (userId) {
        this.updateContext(userId, message, 'user', result);
      }
      
      return result;
    } catch (error) {
      console.error('Intent recognition failed:', error);
      // 返回基於規則的回退結果
      return this.fallbackRecognition(message);
    }
  }
  
  /**
   * 解析 AI 回覆
   */
  private parseIntentResponse(response: string, originalMessage: string): IntentResult {
    try {
      // 嘗試解析 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          intent: this.validateIntent(parsed.intent),
          confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
          subIntents: parsed.subIntents || [],
          keywords: parsed.keywords || [],
          sentiment: parsed.sentiment || 'neutral',
          urgency: parsed.urgency || 'medium',
          suggestedAction: parsed.suggestedAction || '',
          rawAnalysis: response
        };
      }
    } catch (e) {
      console.warn('Failed to parse intent response:', e);
    }
    
    // 解析失敗，使用回退
    return this.fallbackRecognition(originalMessage);
  }
  
  /**
   * 驗證意圖類型
   */
  private validateIntent(intent: string): IntentType {
    const validIntents: IntentType[] = [
      'purchase_intent', 'price_inquiry', 'product_question',
      'complaint', 'general_chat', 'negative_sentiment', 
      'high_value', 'urgent'
    ];
    
    if (validIntents.includes(intent as IntentType)) {
      return intent as IntentType;
    }
    
    return 'general_chat';
  }
  
  /**
   * 基於規則的回退識別
   */
  private fallbackRecognition(message: string): IntentResult {
    const lowerMessage = message.toLowerCase();
    
    let intent: IntentType = 'general_chat';
    let confidence = 0.5;
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    let urgency: 'low' | 'medium' | 'high' = 'medium';
    const keywords: string[] = [];
    
    // 購買意向關鍵詞
    const purchaseKeywords = ['購買', '下單', '買', '怎麼買', '付款', '訂購', 'buy', 'purchase', 'order'];
    if (purchaseKeywords.some(k => lowerMessage.includes(k))) {
      intent = 'purchase_intent';
      confidence = 0.85;
      urgency = 'high';
      keywords.push(...purchaseKeywords.filter(k => lowerMessage.includes(k)));
    }
    
    // 價格詢問關鍵詞
    const priceKeywords = ['價格', '多少錢', '費用', '價錢', '優惠', '折扣', 'price', 'cost', 'discount'];
    if (priceKeywords.some(k => lowerMessage.includes(k))) {
      intent = 'price_inquiry';
      confidence = 0.8;
      keywords.push(...priceKeywords.filter(k => lowerMessage.includes(k)));
    }
    
    // 產品問題關鍵詞
    const questionKeywords = ['怎麼', '如何', '什麼', '能不能', '可以', '功能', 'how', 'what', 'can'];
    if (questionKeywords.some(k => lowerMessage.includes(k))) {
      if (intent === 'general_chat') {
        intent = 'product_question';
        confidence = 0.7;
      }
      keywords.push(...questionKeywords.filter(k => lowerMessage.includes(k)));
    }
    
    // 負面情緒檢測
    const negativeKeywords = ['不好', '差', '爛', '騙', '垃圾', '退款', 'bad', 'terrible', 'refund'];
    if (negativeKeywords.some(k => lowerMessage.includes(k))) {
      sentiment = 'negative';
      if (negativeKeywords.filter(k => lowerMessage.includes(k)).length >= 2) {
        intent = 'negative_sentiment';
        confidence = 0.8;
      }
    }
    
    // 正面情緒
    const positiveKeywords = ['好', '棒', '讚', '謝謝', '感謝', 'great', 'thanks', 'good'];
    if (positiveKeywords.some(k => lowerMessage.includes(k))) {
      sentiment = 'positive';
    }
    
    // 緊急程度
    const urgentKeywords = ['急', '馬上', '立刻', '現在', 'urgent', 'immediately', 'now', 'asap'];
    if (urgentKeywords.some(k => lowerMessage.includes(k))) {
      urgency = 'high';
      if (intent === 'general_chat') {
        intent = 'urgent';
        confidence = 0.75;
      }
    }
    
    return {
      intent,
      confidence,
      subIntents: [],
      keywords,
      sentiment,
      urgency,
      suggestedAction: this.getSuggestedAction(intent)
    };
  }
  
  /**
   * 獲取建議動作
   */
  private getSuggestedAction(intent: IntentType): string {
    const actions: Record<IntentType, string> = {
      purchase_intent: '提供購買鏈接或聯繫方式，準備促成交易',
      price_inquiry: '提供價格信息和優惠方案',
      product_question: '詳細解答產品相關問題',
      complaint: '表達歉意，了解具體問題，提供解決方案',
      general_chat: '友好回應，嘗試引導到產品話題',
      negative_sentiment: '轉人工處理，避免自動回覆',
      high_value: '重點跟進，提供VIP服務',
      urgent: '優先處理，快速回應'
    };
    
    return actions[intent] || '繼續對話';
  }
  
  /**
   * 緩存鍵生成
   */
  private getCacheKey(message: string, userId?: string): string {
    return `${userId || 'anonymous'}_${message.substring(0, 100)}`;
  }
  
  // ========== 對話上下文管理 ==========
  
  /**
   * 獲取對話上下文
   */
  getContext(userId: string): ConversationContext | undefined {
    return this.conversations().get(userId);
  }
  
  /**
   * 創建新對話
   */
  createContext(userId: string): ConversationContext {
    const context: ConversationContext = {
      id: `conv_${Date.now()}`,
      userId,
      messages: [],
      currentStage: 'initial',
      intentHistory: [],
      totalScore: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.conversations.update(map => {
      const newMap = new Map(map);
      newMap.set(userId, context);
      return newMap;
    });
    
    return context;
  }
  
  /**
   * 更新對話上下文
   */
  updateContext(
    userId: string, 
    message: string, 
    role: 'user' | 'assistant',
    intent?: IntentResult
  ): void {
    let context = this.conversations().get(userId);
    if (!context) {
      context = this.createContext(userId);
    }
    
    const newMessage = {
      role,
      content: message,
      timestamp: new Date(),
      intent
    };
    
    // 更新意圖歷史
    if (intent && role === 'user') {
      context.intentHistory.push(intent.intent);
      context.totalScore += this.getIntentScore(intent);
      context.currentStage = this.determineStage(context);
    }
    
    context.messages.push(newMessage);
    context.updatedAt = new Date();
    
    this.conversations.update(map => {
      const newMap = new Map(map);
      newMap.set(userId, { ...context! });
      return newMap;
    });
  }
  
  /**
   * 獲取意圖評分
   */
  private getIntentScore(intent: IntentResult): number {
    const scores: Record<IntentType, number> = {
      purchase_intent: 30,
      price_inquiry: 20,
      product_question: 10,
      high_value: 25,
      urgent: 15,
      general_chat: 5,
      complaint: -10,
      negative_sentiment: -20
    };
    
    const baseScore = scores[intent.intent] || 0;
    return Math.round(baseScore * intent.confidence);
  }
  
  /**
   * 確定對話階段
   */
  private determineStage(context: ConversationContext): ConversationContext['currentStage'] {
    const { totalScore, intentHistory } = context;
    
    if (intentHistory.includes('purchase_intent')) {
      return 'closing';
    }
    
    if (intentHistory.includes('price_inquiry')) {
      return 'negotiating';
    }
    
    if (totalScore >= 30 || intentHistory.includes('high_value')) {
      return 'interested';
    }
    
    if (context.messages.length > 2) {
      return 'exploring';
    }
    
    return 'initial';
  }
  
  /**
   * 清除對話上下文
   */
  clearContext(userId: string): void {
    this.conversations.update(map => {
      const newMap = new Map(map);
      newMap.delete(userId);
      return newMap;
    });
  }
  
  /**
   * 獲取用戶意向評分
   */
  getIntentScore4User(userId: string): number {
    const context = this.conversations().get(userId);
    return context?.totalScore || 0;
  }
  
  /**
   * 檢查是否應該轉人工
   */
  shouldHandoffToHuman(userId: string): boolean {
    const context = this.conversations().get(userId);
    if (!context) return false;
    
    // 高購買意向
    if (context.currentStage === 'closing') return true;
    
    // 負面情緒
    if (context.intentHistory.includes('negative_sentiment')) return true;
    if (context.intentHistory.includes('complaint')) return true;
    
    // 高分值
    if (context.totalScore >= 50) return true;
    
    return false;
  }
}
