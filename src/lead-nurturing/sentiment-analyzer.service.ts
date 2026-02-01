/**
 * TG-AI智控王 情感分析服務
 * Sentiment Analyzer Service v1.0
 * 
 * 功能：
 * - 消息情感分析
 * - 購買意圖識別
 * - 異議檢測
 * - 情緒趨勢追蹤
 * - 多語言支持
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { AIProviderService } from './ai-provider.service';

// ============ 類型定義 ============

/** 情感類型 */
export type SentimentType = 'positive' | 'neutral' | 'negative';

/** 情緒類型 */
export type EmotionType = 
  | 'happy' | 'excited' | 'satisfied' | 'grateful'  // 正面
  | 'neutral' | 'curious' | 'thoughtful'             // 中性
  | 'confused' | 'frustrated' | 'angry' | 'disappointed' | 'worried'; // 負面

/** 意圖類型 */
export type IntentType = 
  | 'purchase'      // 購買意圖
  | 'inquiry'       // 詢問
  | 'comparison'    // 比較/競品
  | 'objection'     // 異議
  | 'complaint'     // 投訴
  | 'feedback'      // 反饋
  | 'greeting'      // 問候
  | 'farewell'      // 告別
  | 'gratitude'     // 感謝
  | 'request'       // 請求
  | 'negotiation'   // 議價
  | 'unknown';      // 未知

/** 情感分析結果 */
export interface SentimentResult {
  /** 整體情感 */
  sentiment: SentimentType;
  /** 情感分數 (-1 到 1) */
  score: number;
  /** 信心度 (0 到 1) */
  confidence: number;
  /** 檢測到的情緒 */
  emotions: {
    type: EmotionType;
    intensity: number; // 0-1
  }[];
  /** 主要意圖 */
  primaryIntent: IntentType;
  /** 所有檢測到的意圖 */
  intents: {
    type: IntentType;
    confidence: number;
  }[];
  /** 關鍵詞 */
  keywords: string[];
  /** 異議點（如果有） */
  objections?: string[];
  /** 購買信號（如果有） */
  purchaseSignals?: string[];
  /** 分析時間 */
  analyzedAt: Date;
}

/** 情緒趨勢 */
export interface EmotionTrend {
  leadId: string;
  history: {
    timestamp: Date;
    sentiment: SentimentType;
    score: number;
  }[];
  overallTrend: 'improving' | 'stable' | 'declining';
  avgScore: number;
  volatility: number; // 波動性
}

// ============ 關鍵詞配置 ============

const SENTIMENT_KEYWORDS = {
  positive: {
    strong: ['太好了', '非常滿意', '太棒了', '完美', '超級喜歡', '強烈推薦', '愛死了', 'excellent', 'amazing', 'perfect', 'love it'],
    moderate: ['不錯', '挺好', '滿意', '可以', '喜歡', '好的', 'good', 'nice', 'great', 'like'],
    mild: ['還行', '行吧', '可以試試', '有點興趣', 'okay', 'fine', 'interested']
  },
  negative: {
    strong: ['太差了', '垃圾', '騙子', '投訴', '退款', '舉報', '不買了', 'terrible', 'scam', 'refund', 'report'],
    moderate: ['不滿意', '有問題', '失望', '不行', '太貴', 'disappointed', 'expensive', 'problem'],
    mild: ['還好吧', '一般', '有點猶豫', '再考慮', '不確定', 'hesitant', 'unsure', 'maybe later']
  }
};

const INTENT_KEYWORDS = {
  purchase: ['購買', '買', '下單', '付款', '怎麼買', '開通', '訂閱', 'buy', 'purchase', 'order', 'subscribe'],
  inquiry: ['請問', '想了解', '怎麼樣', '介紹一下', '什麼是', 'what is', 'how about', 'tell me'],
  comparison: ['對比', '比較', '跟XX比', '哪個好', '區別', 'compare', 'difference', 'vs', 'versus'],
  objection: ['太貴', '不需要', '考慮一下', '以後再說', '暫時不', 'too expensive', 'not now', 'later', 'think about it'],
  complaint: ['問題', '錯誤', '壞了', '不能用', '投訴', 'bug', 'broken', 'not working', 'complaint'],
  feedback: ['建議', '希望', '反饋', '意見', 'suggest', 'feedback', 'recommend'],
  greeting: ['你好', '嗨', '早上好', '晚上好', 'hello', 'hi', 'good morning', 'hey'],
  farewell: ['再見', '拜拜', '回頭聊', '下次', 'bye', 'goodbye', 'see you', 'later'],
  gratitude: ['謝謝', '感謝', '多謝', 'thanks', 'thank you', 'appreciate'],
  negotiation: ['便宜點', '優惠', '折扣', '能少點嗎', 'discount', 'cheaper', 'deal', 'offer']
};

const OBJECTION_PATTERNS = [
  { pattern: /太貴|價格高|買不起|預算|expensive|costly/i, type: 'price' },
  { pattern: /沒時間|太忙|以後|稍後|later|busy/i, type: 'timing' },
  { pattern: /不需要|用不上|沒用|不適合/i, type: 'need' },
  { pattern: /不信任|騙子|假的|不可靠|scam/i, type: 'trust' },
  { pattern: /考慮|想想|商量|think about/i, type: 'authority' },
  { pattern: /別家|其他|競品|對手|competitor/i, type: 'competition' }
];

const PURCHASE_SIGNAL_PATTERNS = [
  { pattern: /怎麼付款|付款方式|支付|微信|支付寶|payment|pay/i, strength: 'strong' },
  { pattern: /多少錢|價格|報價|price|cost|how much/i, strength: 'medium' },
  { pattern: /有優惠嗎|折扣|促銷|discount|offer/i, strength: 'medium' },
  { pattern: /購買|買|下單|訂購|buy|order|purchase/i, strength: 'strong' },
  { pattern: /試用|體驗|demo|trial/i, strength: 'weak' },
  { pattern: /什麼時候開始|開通|啟用|activate|start/i, strength: 'strong' }
];

@Injectable({
  providedIn: 'root'
})
export class SentimentAnalyzerService {
  private aiProvider = inject(AIProviderService);
  
  // ============ 狀態 ============
  
  // 分析歷史
  private _analysisHistory = signal<Map<string, SentimentResult[]>>(new Map());
  
  // 情緒趨勢緩存
  private _emotionTrends = signal<Map<string, EmotionTrend>>(new Map());
  emotionTrends = computed(() => this._emotionTrends());
  
  // 是否使用AI增強分析
  private _useAIAnalysis = signal(true);
  useAIAnalysis = computed(() => this._useAIAnalysis());
  
  constructor() {
    this.loadData();
  }
  
  // ============ 核心分析 ============
  
  /**
   * 分析消息情感
   */
  async analyze(message: string, leadId?: string): Promise<SentimentResult> {
    // 基礎規則分析
    let result = this.ruleBasedAnalysis(message);
    
    // 如果啟用AI且基礎分析信心度不高，使用AI增強
    if (this._useAIAnalysis() && result.confidence < 0.7) {
      try {
        const aiResult = await this.aiEnhancedAnalysis(message);
        result = this.mergeResults(result, aiResult);
      } catch (error) {
        console.error('[SentimentAnalyzer] AI analysis failed:', error);
      }
    }
    
    // 記錄歷史
    if (leadId) {
      this.recordAnalysis(leadId, result);
    }
    
    return result;
  }
  
  /**
   * 基於規則的分析
   */
  private ruleBasedAnalysis(message: string): SentimentResult {
    const lowerMessage = message.toLowerCase();
    
    // 計算情感分數
    const sentimentScore = this.calculateSentimentScore(lowerMessage);
    
    // 識別情緒
    const emotions = this.detectEmotions(lowerMessage, sentimentScore);
    
    // 識別意圖
    const intents = this.detectIntents(lowerMessage);
    
    // 提取關鍵詞
    const keywords = this.extractKeywords(lowerMessage);
    
    // 檢測異議
    const objections = this.detectObjections(lowerMessage);
    
    // 檢測購買信號
    const purchaseSignals = this.detectPurchaseSignals(lowerMessage);
    
    // 確定整體情感
    const sentiment: SentimentType = 
      sentimentScore > 0.2 ? 'positive' :
      sentimentScore < -0.2 ? 'negative' : 'neutral';
    
    // 計算信心度
    const confidence = this.calculateConfidence(message, keywords.length, intents.length);
    
    return {
      sentiment,
      score: sentimentScore,
      confidence,
      emotions,
      primaryIntent: intents[0]?.type || 'unknown',
      intents,
      keywords,
      objections: objections.length > 0 ? objections : undefined,
      purchaseSignals: purchaseSignals.length > 0 ? purchaseSignals : undefined,
      analyzedAt: new Date()
    };
  }
  
  /**
   * 計算情感分數
   */
  private calculateSentimentScore(message: string): number {
    let score = 0;
    let matchCount = 0;
    
    // 正面關鍵詞
    for (const word of SENTIMENT_KEYWORDS.positive.strong) {
      if (message.includes(word.toLowerCase())) {
        score += 0.8;
        matchCount++;
      }
    }
    for (const word of SENTIMENT_KEYWORDS.positive.moderate) {
      if (message.includes(word.toLowerCase())) {
        score += 0.5;
        matchCount++;
      }
    }
    for (const word of SENTIMENT_KEYWORDS.positive.mild) {
      if (message.includes(word.toLowerCase())) {
        score += 0.2;
        matchCount++;
      }
    }
    
    // 負面關鍵詞
    for (const word of SENTIMENT_KEYWORDS.negative.strong) {
      if (message.includes(word.toLowerCase())) {
        score -= 0.8;
        matchCount++;
      }
    }
    for (const word of SENTIMENT_KEYWORDS.negative.moderate) {
      if (message.includes(word.toLowerCase())) {
        score -= 0.5;
        matchCount++;
      }
    }
    for (const word of SENTIMENT_KEYWORDS.negative.mild) {
      if (message.includes(word.toLowerCase())) {
        score -= 0.2;
        matchCount++;
      }
    }
    
    // 標準化到 -1 到 1
    if (matchCount > 0) {
      score = Math.max(-1, Math.min(1, score / matchCount));
    }
    
    // 表情符號分析
    const emojiScore = this.analyzeEmojis(message);
    score = score * 0.7 + emojiScore * 0.3;
    
    return Math.round(score * 100) / 100;
  }
  
  /**
   * 分析表情符號
   */
  private analyzeEmojis(message: string): number {
    const positiveEmojis = ['😀', '😊', '😄', '🥰', '❤️', '👍', '🎉', '✨', '💪', '🙏', '😍', '🤗'];
    const negativeEmojis = ['😢', '😭', '😡', '😤', '👎', '💔', '😞', '😔', '🙁', '😠', '🤬'];
    
    let emojiScore = 0;
    
    for (const emoji of positiveEmojis) {
      if (message.includes(emoji)) emojiScore += 0.3;
    }
    
    for (const emoji of negativeEmojis) {
      if (message.includes(emoji)) emojiScore -= 0.3;
    }
    
    return Math.max(-1, Math.min(1, emojiScore));
  }
  
  /**
   * 檢測情緒
   */
  private detectEmotions(message: string, sentimentScore: number): SentimentResult['emotions'] {
    const emotions: SentimentResult['emotions'] = [];
    
    // 基於情感分數推斷主要情緒
    if (sentimentScore > 0.5) {
      emotions.push({ type: 'happy', intensity: Math.min(1, sentimentScore) });
    } else if (sentimentScore > 0.2) {
      emotions.push({ type: 'satisfied', intensity: sentimentScore * 1.5 });
    } else if (sentimentScore < -0.5) {
      emotions.push({ type: 'frustrated', intensity: Math.min(1, -sentimentScore) });
    } else if (sentimentScore < -0.2) {
      emotions.push({ type: 'disappointed', intensity: -sentimentScore * 1.5 });
    } else {
      emotions.push({ type: 'neutral', intensity: 0.5 });
    }
    
    // 檢測特定情緒
    if (/\?|嗎|什麼|怎麼|為什麼|how|what|why/i.test(message)) {
      emotions.push({ type: 'curious', intensity: 0.6 });
    }
    
    if (/謝謝|感謝|多謝|thanks/i.test(message)) {
      emotions.push({ type: 'grateful', intensity: 0.7 });
    }
    
    if (/激動|興奮|太棒|excited|amazing/i.test(message)) {
      emotions.push({ type: 'excited', intensity: 0.8 });
    }
    
    if (/擔心|害怕|不確定|worried|afraid/i.test(message)) {
      emotions.push({ type: 'worried', intensity: 0.6 });
    }
    
    return emotions;
  }
  
  /**
   * 檢測意圖
   */
  private detectIntents(message: string): SentimentResult['intents'] {
    const intents: SentimentResult['intents'] = [];
    
    for (const [intentType, keywords] of Object.entries(INTENT_KEYWORDS)) {
      let matchScore = 0;
      let matchCount = 0;
      
      for (const keyword of keywords) {
        if (message.includes(keyword.toLowerCase())) {
          matchScore += 1;
          matchCount++;
        }
      }
      
      if (matchCount > 0) {
        intents.push({
          type: intentType as IntentType,
          confidence: Math.min(1, matchScore / 2)
        });
      }
    }
    
    // 按信心度排序
    intents.sort((a, b) => b.confidence - a.confidence);
    
    // 如果沒有匹配，添加unknown
    if (intents.length === 0) {
      intents.push({ type: 'unknown', confidence: 0.3 });
    }
    
    return intents;
  }
  
  /**
   * 提取關鍵詞
   */
  private extractKeywords(message: string): string[] {
    const keywords: string[] = [];
    
    // 所有意圖關鍵詞
    for (const intentKeywords of Object.values(INTENT_KEYWORDS)) {
      for (const keyword of intentKeywords) {
        if (message.includes(keyword.toLowerCase()) && !keywords.includes(keyword)) {
          keywords.push(keyword);
        }
      }
    }
    
    // 情感關鍵詞
    for (const category of Object.values(SENTIMENT_KEYWORDS)) {
      for (const level of Object.values(category)) {
        for (const keyword of level) {
          if (message.includes(keyword.toLowerCase()) && !keywords.includes(keyword)) {
            keywords.push(keyword);
          }
        }
      }
    }
    
    return keywords.slice(0, 10); // 最多10個
  }
  
  /**
   * 檢測異議
   */
  private detectObjections(message: string): string[] {
    const objections: string[] = [];
    
    for (const pattern of OBJECTION_PATTERNS) {
      if (pattern.pattern.test(message)) {
        objections.push(pattern.type);
      }
    }
    
    return objections;
  }
  
  /**
   * 檢測購買信號
   */
  private detectPurchaseSignals(message: string): string[] {
    const signals: string[] = [];
    
    for (const pattern of PURCHASE_SIGNAL_PATTERNS) {
      if (pattern.pattern.test(message)) {
        signals.push(`${pattern.strength}: ${pattern.pattern.source.slice(0, 20)}`);
      }
    }
    
    return signals;
  }
  
  /**
   * 計算信心度
   */
  private calculateConfidence(message: string, keywordCount: number, intentCount: number): number {
    let confidence = 0.3; // 基礎信心
    
    // 消息長度影響
    if (message.length > 10) confidence += 0.1;
    if (message.length > 30) confidence += 0.1;
    
    // 關鍵詞匹配影響
    confidence += Math.min(0.3, keywordCount * 0.1);
    
    // 意圖識別影響
    if (intentCount > 0) confidence += 0.1;
    
    return Math.min(1, confidence);
  }
  
  // ============ AI增強分析 ============
  
  /**
   * AI增強分析
   */
  private async aiEnhancedAnalysis(message: string): Promise<Partial<SentimentResult>> {
    const prompt = `分析以下消息的情感和意圖，返回JSON格式：
{
  "sentiment": "positive/neutral/negative",
  "score": -1到1的數字,
  "emotions": ["情緒1", "情緒2"],
  "primaryIntent": "意圖類型",
  "objections": ["異議1"] 或 null,
  "purchaseSignals": ["信號1"] 或 null
}

消息: "${message}"`;

    try {
      const response = await this.aiProvider.chat([
        { role: 'user', content: prompt }
      ]);
      const responseContent = response.content;
      
      // 嘗試解析JSON
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          sentiment: parsed.sentiment,
          score: parsed.score,
          primaryIntent: parsed.primaryIntent,
          objections: parsed.objections,
          purchaseSignals: parsed.purchaseSignals
        };
      }
    } catch (error) {
      console.error('[SentimentAnalyzer] AI parse error:', error);
    }
    
    return {};
  }
  
  /**
   * 合併規則分析和AI分析結果
   */
  private mergeResults(
    ruleResult: SentimentResult,
    aiResult: Partial<SentimentResult>
  ): SentimentResult {
    return {
      ...ruleResult,
      // AI結果優先（如果有）
      sentiment: aiResult.sentiment || ruleResult.sentiment,
      score: aiResult.score ?? ruleResult.score,
      primaryIntent: aiResult.primaryIntent || ruleResult.primaryIntent,
      objections: aiResult.objections || ruleResult.objections,
      purchaseSignals: aiResult.purchaseSignals || ruleResult.purchaseSignals,
      // 提高信心度
      confidence: Math.min(1, ruleResult.confidence + 0.2)
    };
  }
  
  // ============ 趨勢分析 ============
  
  /**
   * 記錄分析結果
   */
  private recordAnalysis(leadId: string, result: SentimentResult): void {
    this._analysisHistory.update(history => {
      const newHistory = new Map(history);
      const leadHistory = newHistory.get(leadId) || [];
      leadHistory.push(result);
      // 保留最近50條
      newHistory.set(leadId, leadHistory.slice(-50));
      return newHistory;
    });
    
    // 更新趨勢
    this.updateEmotionTrend(leadId);
    this.saveData();
  }
  
  /**
   * 更新情緒趨勢
   */
  private updateEmotionTrend(leadId: string): void {
    const history = this._analysisHistory().get(leadId) || [];
    
    if (history.length < 2) return;
    
    const recent = history.slice(-20);
    const scores = recent.map(r => r.score);
    
    // 計算平均分
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    // 計算波動性
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
    const volatility = Math.sqrt(variance);
    
    // 判斷趨勢
    let trend: EmotionTrend['overallTrend'] = 'stable';
    if (scores.length >= 3) {
      const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
      const secondHalf = scores.slice(Math.floor(scores.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      if (secondAvg - firstAvg > 0.15) trend = 'improving';
      else if (firstAvg - secondAvg > 0.15) trend = 'declining';
    }
    
    this._emotionTrends.update(trends => {
      const newTrends = new Map(trends);
      newTrends.set(leadId, {
        leadId,
        history: recent.map(r => ({
          timestamp: r.analyzedAt,
          sentiment: r.sentiment,
          score: r.score
        })),
        overallTrend: trend,
        avgScore,
        volatility
      });
      return newTrends;
    });
  }
  
  /**
   * 獲取情緒趨勢
   */
  getEmotionTrend(leadId: string): EmotionTrend | undefined {
    return this._emotionTrends().get(leadId);
  }
  
  /**
   * 獲取分析歷史
   */
  getAnalysisHistory(leadId: string): SentimentResult[] {
    return this._analysisHistory().get(leadId) || [];
  }
  
  // ============ 批量分析 ============
  
  /**
   * 批量分析消息
   */
  async batchAnalyze(messages: { id: string; content: string; leadId?: string }[]): Promise<Map<string, SentimentResult>> {
    const results = new Map<string, SentimentResult>();
    
    for (const msg of messages) {
      const result = await this.analyze(msg.content, msg.leadId);
      results.set(msg.id, result);
    }
    
    return results;
  }
  
  /**
   * 快速情感判斷（不使用AI）
   */
  quickSentiment(message: string): SentimentType {
    const result = this.ruleBasedAnalysis(message);
    return result.sentiment;
  }
  
  /**
   * 檢查是否有強購買信號
   */
  hasStrongPurchaseSignal(message: string): boolean {
    return PURCHASE_SIGNAL_PATTERNS
      .filter(p => p.strength === 'strong')
      .some(p => p.pattern.test(message));
  }
  
  /**
   * 檢查是否有異議
   */
  hasObjection(message: string): boolean {
    return OBJECTION_PATTERNS.some(p => p.pattern.test(message));
  }
  
  // ============ 設置 ============
  
  /**
   * 切換AI分析
   */
  toggleAIAnalysis(enabled: boolean): void {
    this._useAIAnalysis.set(enabled);
  }
  
  // ============ 持久化 ============
  
  private saveData(): void {
    try {
      const history = Array.from(this._analysisHistory().entries())
        .map(([k, v]) => [k, v.slice(-20)]); // 每個用戶只保留20條
      localStorage.setItem('tgai-sentiment-history', JSON.stringify(history));
    } catch (e) {
      console.error('[SentimentAnalyzer] Save error:', e);
    }
  }
  
  private loadData(): void {
    try {
      const data = localStorage.getItem('tgai-sentiment-history');
      if (data) {
        const entries = JSON.parse(data).map(([k, v]: [string, any[]]) => [
          k,
          v.map((r: any) => ({ ...r, analyzedAt: new Date(r.analyzedAt) }))
        ]);
        this._analysisHistory.set(new Map(entries));
        
        // 重建趨勢
        for (const [leadId] of entries) {
          this.updateEmotionTrend(leadId);
        }
      }
    } catch (e) {
      console.error('[SentimentAnalyzer] Load error:', e);
    }
  }
}
