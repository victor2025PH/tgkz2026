/**
 * TG-AI智控王 意圖識別與情感分析
 * Intent Analyzer v1.0
 * 
 * 功能：
 * - 用戶意圖識別
 * - 情感分析
 * - 實體提取
 * - 關鍵詞提取
 * - 緊急程度判斷
 */

import { Injectable, signal, computed } from '@angular/core';
import { IntentResult, SentimentResult, ExtractedEntity } from './ai-reply-engine';

// ============ 類型定義 ============

export type IntentCategory = 
  | 'inquiry'       // 諮詢
  | 'complaint'     // 投訴
  | 'feedback'      // 反饋
  | 'greeting'      // 問候
  | 'farewell'      // 告別
  | 'thanks'        // 感謝
  | 'request'       // 請求
  | 'purchase'      // 購買意向
  | 'support'       // 技術支持
  | 'other';        // 其他

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export interface MessageAnalysis {
  // 原文
  originalText: string;
  
  // 意圖
  intent: IntentResult;
  intents: IntentResult[];  // 多意圖
  
  // 情感
  sentiment: SentimentResult;
  
  // 實體
  entities: ExtractedEntity[];
  
  // 關鍵詞
  keywords: string[];
  
  // 緊急程度
  urgency: UrgencyLevel;
  
  // 語言
  language: string;
  
  // 是否需要人工介入
  needsHumanReview: boolean;
  
  // 建議的標籤
  suggestedTags: string[];
  
  // 分析時間
  analyzedAt: Date;
}

export interface IntentPattern {
  intent: IntentCategory;
  patterns: RegExp[];
  keywords: string[];
  weight: number;
}

export interface SentimentWord {
  word: string;
  sentiment: 'positive' | 'negative';
  intensity: number;  // 0-1
}

// ============ 意圖模式 ============

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: 'inquiry',
    patterns: [
      /怎麼|如何|什麼|哪裡|請問|能不能|可以嗎/,
      /how|what|where|when|why|can i|could you/i
    ],
    keywords: ['詢問', '問題', '知道', '了解', 'question', 'ask'],
    weight: 1.0
  },
  {
    intent: 'complaint',
    patterns: [
      /投訴|不滿|差評|太差|垃圾|騙子|退款/,
      /complain|terrible|awful|worst|scam|refund/i
    ],
    keywords: ['生氣', '失望', '不好', 'bad', 'poor', 'angry'],
    weight: 1.2
  },
  {
    intent: 'feedback',
    patterns: [
      /建議|反饋|意見|希望|改進/,
      /suggest|feedback|recommend|improve/i
    ],
    keywords: ['建議', '意見', 'suggestion', 'idea'],
    weight: 0.9
  },
  {
    intent: 'greeting',
    patterns: [
      /^(你好|嗨|哈囉|早安|晚安|午安)/,
      /^(hi|hello|hey|good morning|good evening)/i
    ],
    keywords: ['你好', 'hello', 'hi'],
    weight: 0.8
  },
  {
    intent: 'farewell',
    patterns: [
      /再見|拜拜|掰掰|下次見|晚安/,
      /bye|goodbye|see you|good night/i
    ],
    keywords: ['再見', 'bye'],
    weight: 0.8
  },
  {
    intent: 'thanks',
    patterns: [
      /謝謝|感謝|感恩|多謝|辛苦了/,
      /thank|thanks|appreciate/i
    ],
    keywords: ['謝謝', 'thanks'],
    weight: 0.7
  },
  {
    intent: 'request',
    patterns: [
      /請|麻煩|幫我|能否|可否/,
      /please|help me|could you|would you/i
    ],
    keywords: ['請求', '幫助', 'help', 'request'],
    weight: 1.0
  },
  {
    intent: 'purchase',
    patterns: [
      /購買|下單|買|訂購|價格|多少錢/,
      /buy|purchase|order|price|cost|how much/i
    ],
    keywords: ['購買', '價格', 'buy', 'price'],
    weight: 1.1
  },
  {
    intent: 'support',
    patterns: [
      /故障|錯誤|無法|不能|問題|bug/,
      /error|bug|crash|fail|broken|doesn't work/i
    ],
    keywords: ['問題', '錯誤', 'error', 'problem'],
    weight: 1.1
  }
];

// ============ 情感詞彙 ============

const SENTIMENT_WORDS: SentimentWord[] = [
  // 正面詞彙
  { word: '好', sentiment: 'positive', intensity: 0.6 },
  { word: '棒', sentiment: 'positive', intensity: 0.8 },
  { word: '讚', sentiment: 'positive', intensity: 0.8 },
  { word: '優秀', sentiment: 'positive', intensity: 0.9 },
  { word: '喜歡', sentiment: 'positive', intensity: 0.7 },
  { word: '愛', sentiment: 'positive', intensity: 0.9 },
  { word: '感謝', sentiment: 'positive', intensity: 0.8 },
  { word: '開心', sentiment: 'positive', intensity: 0.8 },
  { word: '滿意', sentiment: 'positive', intensity: 0.8 },
  { word: 'good', sentiment: 'positive', intensity: 0.6 },
  { word: 'great', sentiment: 'positive', intensity: 0.8 },
  { word: 'excellent', sentiment: 'positive', intensity: 0.9 },
  { word: 'amazing', sentiment: 'positive', intensity: 0.9 },
  { word: 'love', sentiment: 'positive', intensity: 0.9 },
  { word: 'happy', sentiment: 'positive', intensity: 0.8 },
  
  // 負面詞彙
  { word: '差', sentiment: 'negative', intensity: 0.6 },
  { word: '爛', sentiment: 'negative', intensity: 0.8 },
  { word: '垃圾', sentiment: 'negative', intensity: 0.9 },
  { word: '討厭', sentiment: 'negative', intensity: 0.7 },
  { word: '失望', sentiment: 'negative', intensity: 0.7 },
  { word: '生氣', sentiment: 'negative', intensity: 0.8 },
  { word: '憤怒', sentiment: 'negative', intensity: 0.9 },
  { word: '騙子', sentiment: 'negative', intensity: 0.95 },
  { word: 'bad', sentiment: 'negative', intensity: 0.6 },
  { word: 'terrible', sentiment: 'negative', intensity: 0.8 },
  { word: 'awful', sentiment: 'negative', intensity: 0.8 },
  { word: 'hate', sentiment: 'negative', intensity: 0.9 },
  { word: 'angry', sentiment: 'negative', intensity: 0.8 },
  { word: 'disappointed', sentiment: 'negative', intensity: 0.7 },
  { word: 'worst', sentiment: 'negative', intensity: 0.9 }
];

// ============ 緊急詞彙 ============

const URGENCY_KEYWORDS: Record<UrgencyLevel, string[]> = {
  critical: ['緊急', '馬上', '立刻', '救命', 'urgent', 'emergency', 'asap', 'immediately'],
  high: ['急', '盡快', '儘快', 'soon', 'quickly', 'important'],
  medium: ['請', '麻煩', '希望', 'please', 'help'],
  low: []
};

// ============ 實體類型 ============

const ENTITY_PATTERNS: Record<string, RegExp> = {
  email: /[\w.-]+@[\w.-]+\.\w+/g,
  phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/g,
  url: /https?:\/\/[^\s]+/g,
  money: /[$¥€£]\s?\d+([.,]\d{2})?|\d+\s?(元|美元|美金|塊|USD|CNY)/g,
  date: /\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日號]?|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/g,
  time: /\d{1,2}:\d{2}(:\d{2})?(\s?[AP]M)?/gi,
  orderNumber: /(訂單|單號|order)[#:\s]?\w+/gi,
  username: /@\w+/g
};

@Injectable({
  providedIn: 'root'
})
export class IntentAnalyzer {
  // 分析統計
  private _stats = signal<{
    totalAnalyzed: number;
    intentDistribution: Record<IntentCategory, number>;
    sentimentDistribution: Record<string, number>;
    avgConfidence: number;
  }>({
    totalAnalyzed: 0,
    intentDistribution: {} as Record<IntentCategory, number>,
    sentimentDistribution: {},
    avgConfidence: 0
  });
  stats = computed(() => this._stats());
  
  // 自定義規則
  private customRules: IntentPattern[] = [];
  private customSentimentWords: SentimentWord[] = [];
  
  /**
   * 分析消息
   */
  analyze(text: string): MessageAnalysis {
    const startTime = Date.now();
    
    // 預處理
    const cleanedText = this.preprocessText(text);
    
    // 意圖識別
    const intents = this.identifyIntents(cleanedText);
    const primaryIntent = intents[0] || { intent: 'other', confidence: 0.5 };
    
    // 情感分析
    const sentiment = this.analyzeSentiment(cleanedText);
    
    // 實體提取
    const entities = this.extractEntities(text);
    
    // 關鍵詞提取
    const keywords = this.extractKeywords(cleanedText);
    
    // 緊急程度判斷
    const urgency = this.assessUrgency(cleanedText, sentiment);
    
    // 語言檢測
    const language = this.detectLanguage(text);
    
    // 是否需要人工介入
    const needsHumanReview = this.checkNeedsHumanReview(
      primaryIntent, sentiment, urgency
    );
    
    // 建議標籤
    const suggestedTags = this.generateSuggestedTags(
      primaryIntent, sentiment, keywords
    );
    
    const analysis: MessageAnalysis = {
      originalText: text,
      intent: primaryIntent,
      intents,
      sentiment,
      entities,
      keywords,
      urgency,
      language,
      needsHumanReview,
      suggestedTags,
      analyzedAt: new Date()
    };
    
    // 更新統計
    this.updateStats(analysis);
    
    return analysis;
  }
  
  /**
   * 批量分析
   */
  analyzeBatch(texts: string[]): MessageAnalysis[] {
    return texts.map(text => this.analyze(text));
  }
  
  // ============ 意圖識別 ============
  
  private identifyIntents(text: string): IntentResult[] {
    const results: IntentResult[] = [];
    const allPatterns = [...INTENT_PATTERNS, ...this.customRules];
    
    for (const pattern of allPatterns) {
      let score = 0;
      let matchCount = 0;
      
      // 模式匹配
      for (const regex of pattern.patterns) {
        if (regex.test(text)) {
          score += 0.4;
          matchCount++;
        }
      }
      
      // 關鍵詞匹配
      const lowerText = text.toLowerCase();
      for (const keyword of pattern.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          score += 0.2;
          matchCount++;
        }
      }
      
      if (matchCount > 0) {
        const confidence = Math.min(score * pattern.weight, 1.0);
        results.push({
          intent: pattern.intent,
          confidence
        });
      }
    }
    
    // 排序並返回
    results.sort((a, b) => b.confidence - a.confidence);
    
    // 如果沒有匹配，返回 other
    if (results.length === 0) {
      results.push({ intent: 'other', confidence: 0.5 });
    }
    
    return results;
  }
  
  // ============ 情感分析 ============
  
  private analyzeSentiment(text: string): SentimentResult {
    let positiveScore = 0;
    let negativeScore = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    
    const lowerText = text.toLowerCase();
    const allWords = [...SENTIMENT_WORDS, ...this.customSentimentWords];
    
    // 詞彙匹配
    for (const { word, sentiment, intensity } of allWords) {
      if (lowerText.includes(word.toLowerCase())) {
        if (sentiment === 'positive') {
          positiveScore += intensity;
          positiveCount++;
        } else {
          negativeScore += intensity;
          negativeCount++;
        }
      }
    }
    
    // 否定詞檢測
    const negationWords = ['不', '沒', '無', '別', "don't", "doesn't", "not", "never"];
    for (const negation of negationWords) {
      if (lowerText.includes(negation)) {
        // 翻轉情感
        [positiveScore, negativeScore] = [negativeScore * 0.7, positiveScore * 0.7];
      }
    }
    
    // 表情符號分析
    const positiveEmojis = /[😊😄😁🎉👍❤️💕🙏✨🌟💪]/g;
    const negativeEmojis = /[😢😭😡😠💔😞😔👎]/g;
    
    const posEmojiCount = (text.match(positiveEmojis) || []).length;
    const negEmojiCount = (text.match(negativeEmojis) || []).length;
    
    positiveScore += posEmojiCount * 0.3;
    negativeScore += negEmojiCount * 0.3;
    
    // 計算最終得分
    const totalScore = positiveScore + negativeScore;
    let score: number;
    let sentiment: SentimentResult['sentiment'];
    
    if (totalScore === 0) {
      score = 0;
      sentiment = 'neutral';
    } else {
      score = (positiveScore - negativeScore) / totalScore;
      
      if (Math.abs(score) < 0.2) {
        sentiment = 'neutral';
      } else if (score > 0) {
        sentiment = positiveScore > negativeScore * 2 ? 'positive' : 'mixed';
      } else {
        sentiment = negativeScore > positiveScore * 2 ? 'negative' : 'mixed';
      }
    }
    
    // 情緒分析
    const emotions = this.analyzeEmotions(text, positiveScore, negativeScore);
    
    return {
      sentiment,
      score,
      emotions
    };
  }
  
  private analyzeEmotions(
    text: string,
    positiveScore: number,
    negativeScore: number
  ): SentimentResult['emotions'] {
    const emotions: SentimentResult['emotions'] = {
      joy: 0,
      anger: 0,
      sadness: 0,
      fear: 0,
      surprise: 0
    };
    
    const lowerText = text.toLowerCase();
    
    // 喜悅
    if (/開心|快樂|高興|太好了|happy|joy|excited/.test(lowerText)) {
      emotions.joy = 0.8;
    } else if (positiveScore > 0) {
      emotions.joy = Math.min(positiveScore * 0.5, 1);
    }
    
    // 憤怒
    if (/生氣|憤怒|氣死|可惡|angry|furious/.test(lowerText)) {
      emotions.anger = 0.8;
    } else if (/投訴|差評|垃圾/.test(lowerText)) {
      emotions.anger = 0.5;
    }
    
    // 悲傷
    if (/難過|傷心|失望|sad|disappointed/.test(lowerText)) {
      emotions.sadness = 0.7;
    }
    
    // 恐懼
    if (/害怕|擔心|worried|scared|afraid/.test(lowerText)) {
      emotions.fear = 0.6;
    }
    
    // 驚訝
    if (/驚訝|天啊|wow|omg|surprised/.test(lowerText) || /[!！]{2,}/.test(text)) {
      emotions.surprise = 0.6;
    }
    
    return emotions;
  }
  
  // ============ 實體提取 ============
  
  private extractEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    
    for (const [type, pattern] of Object.entries(ENTITY_PATTERNS)) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          type,
          value: match[0],
          start: match.index,
          end: match.index + match[0].length,
          confidence: 0.9
        });
      }
    }
    
    return entities;
  }
  
  // ============ 關鍵詞提取 ============
  
  private extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    
    // 中文關鍵詞
    const chineseWords = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    
    // 過濾停用詞
    const stopWords = ['的', '了', '是', '在', '和', '有', '我', '你', '他', '這', '那', '都', '也', '就', '不', '很', '會', '可以', '什麼', '怎麼'];
    const filteredChinese = chineseWords.filter(w => !stopWords.includes(w));
    
    // 英文關鍵詞
    const englishWords = text.match(/[a-zA-Z]{3,}/g) || [];
    const englishStopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'will', 'this', 'that', 'with', 'from', 'your', 'they'];
    const filteredEnglish = englishWords.filter(w => !englishStopWords.includes(w.toLowerCase()));
    
    // 合併並去重
    const allKeywords = [...new Set([...filteredChinese, ...filteredEnglish])];
    
    // 返回前 10 個
    return allKeywords.slice(0, 10);
  }
  
  // ============ 緊急程度 ============
  
  private assessUrgency(text: string, sentiment: SentimentResult): UrgencyLevel {
    const lowerText = text.toLowerCase();
    
    // 檢查緊急關鍵詞
    for (const [level, keywords] of Object.entries(URGENCY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          return level as UrgencyLevel;
        }
      }
    }
    
    // 根據情感調整
    if (sentiment.sentiment === 'negative' && sentiment.score < -0.6) {
      return 'high';
    }
    
    if (sentiment.emotions?.anger && sentiment.emotions.anger > 0.7) {
      return 'high';
    }
    
    // 多個感嘆號
    if ((text.match(/[!！]/g) || []).length >= 3) {
      return 'medium';
    }
    
    return 'low';
  }
  
  // ============ 輔助方法 ============
  
  private preprocessText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }
  
  private detectLanguage(text: string): string {
    if (/[\u4e00-\u9fa5]/.test(text)) {
      // 簡繁區分可以用更複雜的邏輯
      return 'zh';
    }
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
      return 'ja';
    }
    if (/[\uac00-\ud7af]/.test(text)) {
      return 'ko';
    }
    return 'en';
  }
  
  private checkNeedsHumanReview(
    intent: IntentResult,
    sentiment: SentimentResult,
    urgency: UrgencyLevel
  ): boolean {
    // 投訴需要人工審核
    if (intent.intent === 'complaint') return true;
    
    // 強烈負面情緒需要人工審核
    if (sentiment.sentiment === 'negative' && sentiment.score < -0.7) return true;
    
    // 緊急情況需要人工審核
    if (urgency === 'critical' || urgency === 'high') return true;
    
    // 低置信度需要人工審核
    if (intent.confidence < 0.4) return true;
    
    return false;
  }
  
  private generateSuggestedTags(
    intent: IntentResult,
    sentiment: SentimentResult,
    keywords: string[]
  ): string[] {
    const tags: string[] = [];
    
    // 意圖標籤
    tags.push(intent.intent);
    
    // 情感標籤
    tags.push(sentiment.sentiment);
    
    // 關鍵詞標籤（前3個）
    tags.push(...keywords.slice(0, 3));
    
    return [...new Set(tags)];
  }
  
  private updateStats(analysis: MessageAnalysis): void {
    this._stats.update(stats => {
      const newStats = { ...stats };
      newStats.totalAnalyzed++;
      
      // 意圖分布
      const intent = analysis.intent.intent as IntentCategory;
      newStats.intentDistribution[intent] = (newStats.intentDistribution[intent] || 0) + 1;
      
      // 情感分布
      newStats.sentimentDistribution[analysis.sentiment.sentiment] = 
        (newStats.sentimentDistribution[analysis.sentiment.sentiment] || 0) + 1;
      
      // 平均置信度
      newStats.avgConfidence = (
        newStats.avgConfidence * (newStats.totalAnalyzed - 1) + analysis.intent.confidence
      ) / newStats.totalAnalyzed;
      
      return newStats;
    });
  }
  
  // ============ 自定義規則 ============
  
  /**
   * 添加自定義意圖規則
   */
  addCustomIntentRule(rule: IntentPattern): void {
    this.customRules.push(rule);
  }
  
  /**
   * 添加自定義情感詞
   */
  addCustomSentimentWord(word: SentimentWord): void {
    this.customSentimentWords.push(word);
  }
  
  /**
   * 清除自定義規則
   */
  clearCustomRules(): void {
    this.customRules = [];
    this.customSentimentWords = [];
  }
}
