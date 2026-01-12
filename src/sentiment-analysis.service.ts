/**
 * Sentiment Analysis Service
 * 情感分析服務
 * 
 * 功能：
 * - 文本情感識別
 * - 意圖分類
 * - 實體提取
 * - 情緒趨勢追蹤
 */
import { Injectable, signal, computed } from '@angular/core';

// ============ 類型定義 ============

export type Sentiment = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
export type Intent = 'inquiry' | 'purchase' | 'complaint' | 'feedback' | 'support' | 'greeting' | 'farewell' | 'unknown';
export type Urgency = 'low' | 'normal' | 'high' | 'urgent';

export interface SentimentResult {
  sentiment: Sentiment;
  confidence: number;  // 0-1
  score: number;       // -1 到 1
  emotions: {
    joy: number;
    anger: number;
    sadness: number;
    fear: number;
    surprise: number;
  };
}

export interface IntentResult {
  intent: Intent;
  confidence: number;
  subIntents: { intent: string; confidence: number }[];
}

export interface EntityResult {
  type: string;
  value: string;
  start: number;
  end: number;
  confidence: number;
}

export interface AnalysisResult {
  text: string;
  sentiment: SentimentResult;
  intent: IntentResult;
  entities: EntityResult[];
  urgency: Urgency;
  keywords: string[];
  language: string;
  timestamp: Date;
}

// ============ 詞典定義 ============

const POSITIVE_WORDS = [
  '好', '棒', '讚', '優秀', '出色', '滿意', '喜歡', '愛', '感謝', '謝謝',
  '太好了', '很好', '非常好', '厲害', '完美', '開心', '高興', '期待',
  'good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'like', 'thanks', 'thank',
  'perfect', 'awesome', 'fantastic', 'happy', 'pleased', 'satisfied'
];

const NEGATIVE_WORDS = [
  '差', '爛', '糟糕', '失望', '不滿', '討厭', '生氣', '憤怒', '難過', '傷心',
  '不好', '很差', '太差', '垃圾', '問題', '投訴', '退款', '騙',
  'bad', 'terrible', 'awful', 'disappointed', 'angry', 'upset', 'hate', 'worst',
  'problem', 'issue', 'refund', 'complaint', 'frustrated'
];

const URGENT_WORDS = [
  '緊急', '急', '馬上', '立刻', '儘快', '今天', '現在', '趕緊',
  'urgent', 'asap', 'immediately', 'now', 'hurry', 'emergency', 'critical'
];

const INTENT_PATTERNS: { pattern: RegExp; intent: Intent }[] = [
  // 詢問
  { pattern: /(\?|？|嗎|什麼|怎麼|如何|多少|哪|能不能|可以|請問)/i, intent: 'inquiry' },
  { pattern: /(what|how|when|where|why|which|can|could|would|is there)/i, intent: 'inquiry' },
  
  // 購買意向
  { pattern: /(買|購買|下單|付款|價格|多少錢|優惠|折扣|購|訂)/i, intent: 'purchase' },
  { pattern: /(buy|purchase|order|price|cost|discount|payment)/i, intent: 'purchase' },
  
  // 投訴
  { pattern: /(投訴|舉報|差評|垃圾|騙|假|問題|故障|壞|不能用)/i, intent: 'complaint' },
  { pattern: /(complain|report|fake|broken|not working|scam)/i, intent: 'complaint' },
  
  // 反饋
  { pattern: /(建議|反饋|意見|希望|應該|可以改進)/i, intent: 'feedback' },
  { pattern: /(suggest|feedback|opinion|should|could be better)/i, intent: 'feedback' },
  
  // 支持
  { pattern: /(幫助|幫我|協助|支持|客服|技術|售後)/i, intent: 'support' },
  { pattern: /(help|assist|support|service|technical)/i, intent: 'support' },
  
  // 問候
  { pattern: /^(你好|您好|嗨|哈囉|早安|午安|晚安)/i, intent: 'greeting' },
  { pattern: /^(hi|hello|hey|good morning|good afternoon|good evening)/i, intent: 'greeting' },
  
  // 告別
  { pattern: /(再見|拜拜|掰|晚安|88|886)/i, intent: 'farewell' },
  { pattern: /(bye|goodbye|see you|good night)/i, intent: 'farewell' }
];

const ENTITY_PATTERNS: { type: string; pattern: RegExp }[] = [
  { type: 'email', pattern: /[\w.-]+@[\w.-]+\.\w+/g },
  { type: 'phone', pattern: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/g },
  { type: 'url', pattern: /https?:\/\/[^\s]+/g },
  { type: 'price', pattern: /(?:¥|￥|\$|USD|CNY|RMB)?\s*\d+(?:[.,]\d+)?(?:\s*(?:元|塊|美元|刀))?/gi },
  { type: 'date', pattern: /\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?|\d{1,2}[-/月]\d{1,2}[日]?/g },
  { type: 'time', pattern: /\d{1,2}[:：]\d{2}(?:[:：]\d{2})?(?:\s*[AP]M)?/gi },
  { type: 'percentage', pattern: /\d+(?:\.\d+)?%/g },
  { type: 'number', pattern: /\d+(?:[.,]\d+)?/g }
];

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class SentimentAnalysisService {
  
  // 分析歷史
  private _history = signal<AnalysisResult[]>([]);
  
  // 統計
  private _stats = signal({
    totalAnalyzed: 0,
    sentimentDistribution: {
      very_positive: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      very_negative: 0
    },
    intentDistribution: {} as Record<Intent, number>
  });
  
  history = this._history.asReadonly();
  stats = this._stats.asReadonly();
  
  constructor() {
    this.loadHistory();
  }
  
  // ============ 主要分析方法 ============
  
  /**
   * 完整分析
   */
  analyze(text: string): AnalysisResult {
    const sentiment = this.analyzeSentiment(text);
    const intent = this.analyzeIntent(text);
    const entities = this.extractEntities(text);
    const urgency = this.detectUrgency(text, sentiment);
    const keywords = this.extractKeywords(text);
    const language = this.detectLanguage(text);
    
    const result: AnalysisResult = {
      text,
      sentiment,
      intent,
      entities,
      urgency,
      keywords,
      language,
      timestamp: new Date()
    };
    
    // 更新歷史和統計
    this.updateHistory(result);
    this.updateStats(result);
    
    return result;
  }
  
  /**
   * 情感分析
   */
  analyzeSentiment(text: string): SentimentResult {
    const lowerText = text.toLowerCase();
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    // 統計正面詞
    for (const word of POSITIVE_WORDS) {
      if (lowerText.includes(word.toLowerCase())) {
        positiveCount++;
      }
    }
    
    // 統計負面詞
    for (const word of NEGATIVE_WORDS) {
      if (lowerText.includes(word.toLowerCase())) {
        negativeCount++;
      }
    }
    
    // 計算分數 (-1 到 1)
    const total = positiveCount + negativeCount || 1;
    const score = (positiveCount - negativeCount) / total;
    
    // 確定情感類別
    let sentiment: Sentiment;
    if (score >= 0.5) sentiment = 'very_positive';
    else if (score >= 0.2) sentiment = 'positive';
    else if (score <= -0.5) sentiment = 'very_negative';
    else if (score <= -0.2) sentiment = 'negative';
    else sentiment = 'neutral';
    
    // 計算置信度
    const confidence = Math.min(1, (positiveCount + negativeCount) / 3);
    
    // 情緒分析
    const emotions = this.analyzeEmotions(text, score);
    
    return {
      sentiment,
      confidence,
      score,
      emotions
    };
  }
  
  /**
   * 情緒分析
   */
  private analyzeEmotions(text: string, sentimentScore: number): SentimentResult['emotions'] {
    const lowerText = text.toLowerCase();
    
    // 基礎情緒值
    const emotions = {
      joy: 0,
      anger: 0,
      sadness: 0,
      fear: 0,
      surprise: 0
    };
    
    // Joy 詞彙
    const joyWords = ['開心', '高興', '快樂', '幸福', 'happy', 'joy', 'glad', '哈哈', '嘻嘻'];
    for (const word of joyWords) {
      if (lowerText.includes(word)) emotions.joy += 0.3;
    }
    
    // Anger 詞彙
    const angerWords = ['生氣', '憤怒', '火大', '煩', 'angry', 'mad', 'furious', '氣死'];
    for (const word of angerWords) {
      if (lowerText.includes(word)) emotions.anger += 0.3;
    }
    
    // Sadness 詞彙
    const sadWords = ['難過', '傷心', '失望', '沮喪', 'sad', 'disappointed', 'upset', '哭'];
    for (const word of sadWords) {
      if (lowerText.includes(word)) emotions.sadness += 0.3;
    }
    
    // Fear 詞彙
    const fearWords = ['害怕', '擔心', '焦慮', 'afraid', 'worried', 'anxious', '怕'];
    for (const word of fearWords) {
      if (lowerText.includes(word)) emotions.fear += 0.3;
    }
    
    // Surprise 詞彙
    const surpriseWords = ['驚訝', '震驚', '沒想到', 'surprised', 'shocked', 'wow', '天啊'];
    for (const word of surpriseWords) {
      if (lowerText.includes(word)) emotions.surprise += 0.3;
    }
    
    // 根據情感分數調整
    if (sentimentScore > 0) {
      emotions.joy = Math.min(1, emotions.joy + sentimentScore * 0.5);
    } else {
      emotions.sadness = Math.min(1, emotions.sadness + Math.abs(sentimentScore) * 0.3);
      emotions.anger = Math.min(1, emotions.anger + Math.abs(sentimentScore) * 0.2);
    }
    
    // 歸一化
    const max = Math.max(...Object.values(emotions), 0.1);
    for (const key in emotions) {
      emotions[key as keyof typeof emotions] = emotions[key as keyof typeof emotions] / max;
    }
    
    return emotions;
  }
  
  /**
   * 意圖分析
   */
  analyzeIntent(text: string): IntentResult {
    const matches: { intent: Intent; confidence: number }[] = [];
    
    for (const { pattern, intent } of INTENT_PATTERNS) {
      if (pattern.test(text)) {
        matches.push({
          intent,
          confidence: 0.7 + Math.random() * 0.3  // 模擬置信度
        });
      }
    }
    
    if (matches.length === 0) {
      return {
        intent: 'unknown',
        confidence: 0.5,
        subIntents: []
      };
    }
    
    // 按置信度排序
    matches.sort((a, b) => b.confidence - a.confidence);
    
    return {
      intent: matches[0].intent,
      confidence: matches[0].confidence,
      subIntents: matches.slice(1)
    };
  }
  
  /**
   * 實體提取
   */
  extractEntities(text: string): EntityResult[] {
    const entities: EntityResult[] = [];
    
    for (const { type, pattern } of ENTITY_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        // 避免數字與價格重複
        if (type === 'number' && entities.some(e => 
          e.type === 'price' && e.start <= match!.index && e.end >= match!.index + match![0].length
        )) {
          continue;
        }
        
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
  
  /**
   * 緊急度檢測
   */
  detectUrgency(text: string, sentiment: SentimentResult): Urgency {
    const lowerText = text.toLowerCase();
    
    let urgencyScore = 0;
    
    // 檢查緊急詞彙
    for (const word of URGENT_WORDS) {
      if (lowerText.includes(word.toLowerCase())) {
        urgencyScore += 2;
      }
    }
    
    // 負面情感增加緊急度
    if (sentiment.sentiment === 'very_negative') urgencyScore += 2;
    else if (sentiment.sentiment === 'negative') urgencyScore += 1;
    
    // 感嘆號增加緊急度
    const exclamationCount = (text.match(/[!！]/g) || []).length;
    urgencyScore += Math.min(2, exclamationCount * 0.5);
    
    // 全大寫（英文）增加緊急度
    if (text === text.toUpperCase() && /[A-Z]/.test(text)) {
      urgencyScore += 1;
    }
    
    if (urgencyScore >= 4) return 'urgent';
    if (urgencyScore >= 2) return 'high';
    if (urgencyScore >= 1) return 'normal';
    return 'low';
  }
  
  /**
   * 關鍵詞提取
   */
  extractKeywords(text: string, maxKeywords: number = 5): string[] {
    // 簡單的關鍵詞提取（基於詞頻）
    // 移除停用詞
    const stopWords = new Set([
      '的', '了', '是', '在', '我', '你', '他', '她', '它', '這', '那', '有', '和', '與',
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those'
    ]);
    
    // 分詞（簡單按空格和標點分割）
    const words = text
      .toLowerCase()
      .split(/[\s\.,!?;:，。！？；：\n]+/)
      .filter(w => w.length >= 2 && !stopWords.has(w));
    
    // 統計詞頻
    const wordCount: Record<string, number> = {};
    for (const word of words) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
    
    // 按頻率排序
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }
  
  /**
   * 語言檢測
   */
  detectLanguage(text: string): string {
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    
    if (chineseChars > englishChars * 0.5) {
      // 區分簡繁體
      const simplifiedChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
      return simplifiedChars > chineseChars * 0.8 ? 'zh-CN' : 'zh-TW';
    }
    
    return 'en';
  }
  
  // ============ 歷史和統計 ============
  
  private updateHistory(result: AnalysisResult): void {
    this._history.update(history => {
      const newHistory = [result, ...history].slice(0, 1000);
      this.saveHistory();
      return newHistory;
    });
  }
  
  private updateStats(result: AnalysisResult): void {
    this._stats.update(stats => ({
      ...stats,
      totalAnalyzed: stats.totalAnalyzed + 1,
      sentimentDistribution: {
        ...stats.sentimentDistribution,
        [result.sentiment.sentiment]: stats.sentimentDistribution[result.sentiment.sentiment] + 1
      },
      intentDistribution: {
        ...stats.intentDistribution,
        [result.intent.intent]: (stats.intentDistribution[result.intent.intent] || 0) + 1
      }
    }));
  }
  
  /**
   * 獲取情感趨勢
   */
  getSentimentTrend(hours: number = 24): { time: Date; score: number }[] {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    
    return this._history()
      .filter(r => r.timestamp > cutoff)
      .map(r => ({
        time: r.timestamp,
        score: r.sentiment.score
      }))
      .reverse();
  }
  
  // ============ 持久化 ============
  
  private loadHistory(): void {
    try {
      const stored = localStorage.getItem('tg-matrix-sentiment-history');
      if (stored) {
        const history = JSON.parse(stored).map((r: any) => ({
          ...r,
          timestamp: new Date(r.timestamp)
        }));
        this._history.set(history);
      }
    } catch (e) {
      console.error('Failed to load sentiment history:', e);
    }
  }
  
  private saveHistory(): void {
    try {
      const recent = this._history().slice(0, 100);  // 只保存最近 100 條
      localStorage.setItem('tg-matrix-sentiment-history', JSON.stringify(recent));
    } catch (e) {
      console.error('Failed to save sentiment history:', e);
    }
  }
}
