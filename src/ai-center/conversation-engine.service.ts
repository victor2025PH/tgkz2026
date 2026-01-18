/**
 * 對話引擎服務
 * Conversation Engine Service
 * 
 * 整合意圖識別、知識庫和對話策略，生成智能回覆
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import { AIProviderService, AIMessage } from '../ai-provider.service';
import { IntentRecognitionService, IntentResult, ConversationContext } from './intent-recognition.service';
import { AICenterService } from './ai-center.service';
import { IntentType, ConversationStyle, SmartRule } from './ai-center.models';

// 回覆結果
export interface ReplyResult {
  content: string;
  intent: IntentResult;
  shouldHandoff: boolean;
  handoffReason?: string;
  triggeredRules: SmartRule[];
  suggestedFollowUp?: string;
  delay: number; // 建議延遲（秒）
  metadata: {
    modelUsed: string;
    tokensUsed: number;
    processingTime: number;
    knowledgeUsed: boolean;
  };
}

// 對話配置
export interface ConversationConfig {
  // 基礎設置
  userId: string;
  userName?: string;
  sourceGroup?: string;
  
  // 上下文
  previousMessages?: string[];
  
  // 策略覆蓋
  styleOverride?: ConversationStyle;
  maxTokens?: number;
  temperature?: number;
  
  // 角色扮演
  rolePrompt?: string;
  roleName?: string;
  
  // 知識庫
  useKnowledgeBase?: boolean;
  knowledgeBaseId?: string;
}

// 系統 Prompt 構建器
const buildSystemPrompt = (config: {
  style: ConversationStyle;
  roleName?: string;
  rolePrompt?: string;
  businessContext?: string;
  emojiFrequency: 'none' | 'low' | 'medium' | 'high';
  responseLength: 'short' | 'medium' | 'long';
}): string => {
  let prompt = '';
  
  // 角色定義
  if (config.rolePrompt) {
    prompt += config.rolePrompt + '\n\n';
  } else {
    prompt += `你是一位專業的銷售顧問，名叫${config.roleName || '小助手'}。`;
  }
  
  // 風格指令
  const styleInstructions: Record<ConversationStyle, string> = {
    professional: '保持專業、正式的語調，使用行業術語，注重邏輯和數據。',
    friendly: '保持友好、親切的語調，像朋友一樣交流，讓客戶感到舒適。',
    casual: '使用輕鬆、隨意的語調，可以開適當的玩笑，營造輕鬆氛圍。',
    enthusiastic: '保持熱情、積極的語調，表現出對產品和客戶的熱愛。',
    direct: '直接、簡潔地回答問題，不繞彎子，高效溝通。'
  };
  prompt += styleInstructions[config.style] + '\n\n';
  
  // 回覆長度
  const lengthInstructions = {
    short: '回覆要簡短精煉，通常1-2句話。',
    medium: '回覆適中，通常3-5句話，包含必要的信息。',
    long: '可以詳細回覆，包含充分的解釋和例子。'
  };
  prompt += lengthInstructions[config.responseLength] + '\n\n';
  
  // Emoji 使用
  if (config.emojiFrequency !== 'none') {
    const emojiInstructions = {
      low: '可以偶爾使用表情符號，但要節制。',
      medium: '適當使用表情符號來增加親和力。',
      high: '大量使用表情符號，讓對話更活潑。'
    };
    prompt += emojiInstructions[config.emojiFrequency] + '\n\n';
  } else {
    prompt += '不要使用任何表情符號。\n\n';
  }
  
  // 業務上下文
  if (config.businessContext) {
    prompt += `業務背景：\n${config.businessContext}\n\n`;
  }
  
  // 通用指令
  prompt += `重要規則：
1. 永遠不要說自己是 AI 或機器人
2. 不要使用 markdown 格式
3. 直接回覆，不要加任何前綴如"回覆："
4. 如果不確定，可以說"讓我確認一下"而不是編造信息
5. 保持對話自然流暢`;
  
  return prompt;
};

@Injectable({
  providedIn: 'root'
})
export class ConversationEngineService {
  private aiProvider = inject(AIProviderService);
  private intentService = inject(IntentRecognitionService);
  private aiCenter = inject(AICenterService);
  
  // 統計
  private stats = signal({
    totalConversations: 0,
    totalReplies: 0,
    avgResponseTime: 0,
    handoffCount: 0,
    conversionCount: 0
  });
  
  conversationStats = this.stats.asReadonly();
  
  /**
   * 生成智能回覆
   */
  async generateReply(
    userMessage: string,
    config: ConversationConfig
  ): Promise<ReplyResult> {
    const startTime = Date.now();
    
    // 1. 識別意圖
    const intent = await this.intentService.recognizeIntent(
      userMessage, 
      config.userId,
      true
    );
    
    // 2. 檢查智能規則
    const triggeredRules = await this.checkSmartRules(intent, config.userId);
    
    // 3. 檢查是否需要轉人工
    const handoffCheck = this.checkHandoff(intent, triggeredRules, config.userId);
    
    // 4. 獲取策略配置
    const strategy = this.aiCenter.strategy();
    
    // 5. 構建知識庫上下文
    let knowledgeContext = '';
    let knowledgeUsed = false;
    if (config.useKnowledgeBase !== false) {
      const kb = this.aiCenter.activeKnowledgeBase();
      if (kb) {
        knowledgeContext = this.buildKnowledgeContext(kb, userMessage, intent);
        knowledgeUsed = knowledgeContext.length > 0;
      }
    }
    
    // 6. 構建系統 Prompt
    const systemPrompt = buildSystemPrompt({
      style: config.styleOverride || strategy.style,
      roleName: config.roleName,
      rolePrompt: config.rolePrompt,
      businessContext: knowledgeContext,
      emojiFrequency: strategy.emojiFrequency,
      responseLength: strategy.responseLength
    });
    
    // 7. 構建消息歷史
    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt }
    ];
    
    // 添加對話歷史
    const context = this.intentService.getContext(config.userId);
    if (context && context.messages.length > 0) {
      const recentMessages = context.messages.slice(-6); // 最近6條
      for (const msg of recentMessages) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      }
    }
    
    // 添加當前消息
    messages.push({ role: 'user', content: userMessage });
    
    // 8. 生成回覆
    let replyContent = '';
    let tokensUsed = 0;
    let modelUsed = '';
    
    try {
      const response = await this.aiProvider.chat(messages, {
        temperature: config.temperature ?? strategy.style === 'casual' ? 0.8 : 0.7,
        maxTokens: config.maxTokens ?? (strategy.responseLength === 'long' ? 500 : 200)
      });
      
      replyContent = response.content;
      tokensUsed = response.usage.totalTokens;
      modelUsed = response.model;
    } catch (error) {
      console.error('Failed to generate reply:', error);
      replyContent = this.getFallbackReply(intent);
    }
    
    // 9. 後處理
    replyContent = this.postProcessReply(replyContent, intent, config);
    
    // 10. 更新對話上下文
    this.intentService.updateContext(config.userId, replyContent, 'assistant');
    
    // 11. 計算延遲
    const delay = this.calculateDelay(replyContent, intent);
    
    // 12. 更新統計
    const processingTime = Date.now() - startTime;
    this.updateStats(processingTime, handoffCheck.shouldHandoff);
    
    return {
      content: replyContent,
      intent,
      shouldHandoff: handoffCheck.shouldHandoff,
      handoffReason: handoffCheck.reason,
      triggeredRules,
      suggestedFollowUp: this.getSuggestedFollowUp(intent),
      delay,
      metadata: {
        modelUsed,
        tokensUsed,
        processingTime,
        knowledgeUsed
      }
    };
  }
  
  /**
   * 多角色對話生成
   */
  async generateMultiRoleReply(
    userMessage: string,
    roleConfig: {
      roleId: string;
      roleName: string;
      rolePrompt: string;
      personality: string;
    },
    config: ConversationConfig
  ): Promise<ReplyResult> {
    return this.generateReply(userMessage, {
      ...config,
      roleName: roleConfig.roleName,
      rolePrompt: roleConfig.rolePrompt
    });
  }
  
  /**
   * 檢查智能規則
   */
  private async checkSmartRules(
    intent: IntentResult, 
    userId: string
  ): Promise<SmartRule[]> {
    const rules = this.aiCenter.activeRules();
    const triggered: SmartRule[] = [];
    
    const context = this.intentService.getContext(userId);
    const conversationRounds = context?.messages.filter(m => m.role === 'user').length || 0;
    
    for (const rule of rules) {
      // 檢查意圖匹配
      if (rule.triggerIntent !== intent.intent) continue;
      
      // 檢查置信度
      if (rule.triggerConditions.intentScore && 
          intent.confidence < rule.triggerConditions.intentScore) continue;
      
      // 檢查對話輪數
      if (rule.triggerConditions.conversationRounds && 
          conversationRounds < rule.triggerConditions.conversationRounds) continue;
      
      // 檢查關鍵詞
      if (rule.triggerConditions.keywordMatch) {
        const hasKeyword = rule.triggerConditions.keywordMatch.some(
          kw => intent.keywords.includes(kw)
        );
        if (!hasKeyword) continue;
      }
      
      triggered.push(rule);
    }
    
    return triggered.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * 檢查是否需要轉人工
   */
  private checkHandoff(
    intent: IntentResult,
    triggeredRules: SmartRule[],
    userId: string
  ): { shouldHandoff: boolean; reason?: string } {
    // 規則觸發的轉人工
    const handoffRule = triggeredRules.find(r => r.actions.notifyHuman);
    if (handoffRule) {
      return { 
        shouldHandoff: true, 
        reason: `規則觸發：${handoffRule.name}` 
      };
    }
    
    // 高購買意向
    if (intent.intent === 'purchase_intent' && intent.confidence > 0.8) {
      return { 
        shouldHandoff: true, 
        reason: '高購買意向，建議人工跟進' 
      };
    }
    
    // 負面情緒
    if (intent.intent === 'negative_sentiment' || intent.sentiment === 'negative') {
      return { 
        shouldHandoff: true, 
        reason: '負面情緒，需要人工處理' 
      };
    }
    
    // 服務檢查
    if (this.intentService.shouldHandoffToHuman(userId)) {
      return { 
        shouldHandoff: true, 
        reason: '對話分析建議轉人工' 
      };
    }
    
    return { shouldHandoff: false };
  }
  
  /**
   * 構建知識庫上下文
   */
  private buildKnowledgeContext(
    kb: any, 
    message: string, 
    intent: IntentResult
  ): string {
    if (!kb || !kb.items || kb.items.length === 0) return '';
    
    // 簡單的關鍵詞匹配
    const relevantItems = kb.items.filter((item: any) => {
      if (!item.isActive) return false;
      
      // 意圖相關
      if (intent.intent === 'price_inquiry' && item.category === 'sales') return true;
      if (intent.intent === 'product_question' && item.category === 'product') return true;
      if (intent.intent === 'complaint' && item.category === 'objection') return true;
      
      // 關鍵詞匹配
      if (item.keywords && item.keywords.length > 0) {
        return item.keywords.some((kw: string) => 
          message.toLowerCase().includes(kw.toLowerCase())
        );
      }
      
      return false;
    }).slice(0, 3); // 最多3個
    
    if (relevantItems.length === 0) return '';
    
    return '相關產品知識：\n' + relevantItems.map((item: any) => 
      `- ${item.title}：${item.content}`
    ).join('\n');
  }
  
  /**
   * 後處理回覆
   */
  private postProcessReply(
    content: string, 
    intent: IntentResult,
    config: ConversationConfig
  ): string {
    let processed = content.trim();
    
    // 移除可能的前綴
    processed = processed.replace(/^(回覆[：:]\s*|Reply[：:]\s*)/i, '');
    
    // 移除 markdown
    processed = processed.replace(/\*\*/g, '');
    processed = processed.replace(/\*/g, '');
    processed = processed.replace(/`/g, '');
    processed = processed.replace(/#{1,6}\s/g, '');
    
    // 個性化
    if (config.userName) {
      // 有機會加入用戶名
      if (Math.random() < 0.3 && !processed.includes(config.userName)) {
        processed = `${config.userName}，${processed}`;
      }
    }
    
    return processed;
  }
  
  /**
   * 獲取回退回覆
   */
  private getFallbackReply(intent: IntentResult): string {
    const fallbacks: Record<IntentType, string[]> = {
      purchase_intent: [
        '感謝您的興趣！請問您想了解哪個方案呢？',
        '太好了！我可以為您詳細介紹購買流程。'
      ],
      price_inquiry: [
        '關於價格，我們有多種方案可以選擇，方便告訴我您的需求嗎？',
        '價格方面，我可以根據您的需求給出最適合的方案。'
      ],
      product_question: [
        '這是個好問題！讓我為您詳細說明。',
        '感謝您的詢問，我來為您解答。'
      ],
      complaint: [
        '非常抱歉給您帶來不便，讓我了解一下具體情況。',
        '我理解您的心情，請告訴我具體問題，我會盡力幫您解決。'
      ],
      general_chat: [
        '感謝您的訊息！有什麼我可以幫您的嗎？',
        '您好！請問有什麼問題想了解嗎？'
      ],
      negative_sentiment: [
        '我理解您的心情。請問具體是什麼問題呢？',
        '感謝您的反饋，我們會認真對待。'
      ],
      high_value: [
        '感謝您的信任！我會為您提供最好的服務。',
        '非常高興為您服務！'
      ],
      urgent: [
        '收到，我馬上為您處理！',
        '好的，我立刻幫您解決！'
      ]
    };
    
    const options = fallbacks[intent.intent] || fallbacks.general_chat;
    return options[Math.floor(Math.random() * options.length)];
  }
  
  /**
   * 獲取建議的跟進話術
   */
  private getSuggestedFollowUp(intent: IntentResult): string | undefined {
    const followUps: Partial<Record<IntentType, string>> = {
      price_inquiry: '可以問客戶的具體需求和預算',
      product_question: '可以問客戶是否還有其他問題',
      purchase_intent: '可以提供付款方式和優惠信息'
    };
    
    return followUps[intent.intent];
  }
  
  /**
   * 計算回覆延遲
   */
  private calculateDelay(content: string, intent: IntentResult): number {
    // 基礎延遲：30-60秒
    let baseDelay = 30 + Math.random() * 30;
    
    // 根據內容長度調整
    const charCount = content.length;
    const typingTime = charCount * 0.1; // 每字符0.1秒
    
    // 緊急情況減少延遲
    if (intent.urgency === 'high') {
      baseDelay = 10 + Math.random() * 10;
    }
    
    return Math.round(baseDelay + typingTime);
  }
  
  /**
   * 更新統計
   */
  private updateStats(processingTime: number, isHandoff: boolean): void {
    this.stats.update(s => ({
      totalConversations: s.totalConversations,
      totalReplies: s.totalReplies + 1,
      avgResponseTime: (s.avgResponseTime * s.totalReplies + processingTime) / (s.totalReplies + 1),
      handoffCount: s.handoffCount + (isHandoff ? 1 : 0),
      conversionCount: s.conversionCount
    }));
  }
  
  /**
   * 開始新對話
   */
  startConversation(userId: string): void {
    this.intentService.createContext(userId);
    this.stats.update(s => ({
      ...s,
      totalConversations: s.totalConversations + 1
    }));
  }
  
  /**
   * 結束對話
   */
  endConversation(userId: string, converted: boolean = false): void {
    this.intentService.clearContext(userId);
    if (converted) {
      this.stats.update(s => ({
        ...s,
        conversionCount: s.conversionCount + 1
      }));
    }
  }
  
  /**
   * 獲取對話上下文
   */
  getConversation(userId: string): ConversationContext | undefined {
    return this.intentService.getContext(userId);
  }
  
  /**
   * 獲取用戶意向評分
   */
  getUserIntentScore(userId: string): number {
    return this.intentService.getIntentScore4User(userId);
  }
}
