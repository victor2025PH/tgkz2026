/**
 * TG-AI智控王 動態話題生成器
 * Dynamic Topic Generator Service v1.0
 * 
 * 功能：
 * - 基於用戶畫像生成話題
 * - 時事熱點話題
 * - 節日/季節性話題
 * - 行業相關話題
 * - 個性化開場白生成
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { AIProviderService } from './ai-provider.service';
import { LeadService } from './lead.service';
import { Lead, FunnelStage, ConversationType } from './lead.models';

// ============ 類型定義 ============

/** 話題類別 */
export type TopicCategory = 
  | 'greeting'      // 問候
  | 'seasonal'      // 季節/節日
  | 'trending'      // 熱點
  | 'interest'      // 興趣
  | 'industry'      // 行業
  | 'personal'      // 個人
  | 'business'      // 業務
  | 'support'       // 關懷
  | 'followup';     // 跟進

/** 話題 */
export interface Topic {
  id: string;
  category: TopicCategory;
  title: string;
  description?: string;
  templates: string[];
  keywords: string[];
  suitableStages: FunnelStage[];
  priority: number;
  expiresAt?: Date;
  usageCount: number;
  lastUsed?: Date;
}

/** 開場白 */
export interface Opener {
  content: string;
  topic: Topic;
  style: 'casual' | 'professional' | 'warm' | 'curious';
  length: 'short' | 'medium' | 'long';
  hasQuestion: boolean;
}

/** 話題推薦 */
export interface TopicRecommendation {
  topic: Topic;
  score: number;
  reason: string;
  suggestedOpener: string;
}

// ============ 話題庫 ============

const TOPIC_LIBRARY: Omit<Topic, 'id' | 'usageCount'>[] = [
  // 問候類
  {
    category: 'greeting',
    title: '早安問候',
    templates: [
      '早安！☀️ 新的一天開始了，有什麼計劃嗎？',
      '早上好！希望你今天一切順利！',
      '早安～昨晚休息得好嗎？'
    ],
    keywords: ['早安', '早上'],
    suitableStages: ['stranger', 'visitor', 'lead', 'qualified', 'customer', 'advocate', 'dormant'],
    priority: 80
  },
  {
    category: 'greeting',
    title: '午安問候',
    templates: [
      '午安！工作順利嗎？',
      '下午好！別忘了休息一下哦～',
      '午安～忙了一上午，該放鬆一下了'
    ],
    keywords: ['午安', '下午'],
    suitableStages: ['stranger', 'visitor', 'lead', 'qualified', 'customer', 'advocate', 'dormant'],
    priority: 75
  },
  {
    category: 'greeting',
    title: '晚安問候',
    templates: [
      '晚上好！今天過得怎麼樣？',
      '晚安！忙了一天辛苦了～',
      '晚上好！有時間聊聊嗎？'
    ],
    keywords: ['晚安', '晚上'],
    suitableStages: ['stranger', 'visitor', 'lead', 'qualified', 'customer', 'advocate', 'dormant'],
    priority: 75
  },
  
  // 季節/節日類
  {
    category: 'seasonal',
    title: '週末愉快',
    templates: [
      '週末愉快！🎉 有什麼安排嗎？',
      '週末到了，好好放鬆一下吧！',
      '週末好！準備做什麼有趣的事？'
    ],
    keywords: ['週末', '休息'],
    suitableStages: ['visitor', 'lead', 'customer', 'advocate'],
    priority: 85
  },
  {
    category: 'seasonal',
    title: '天氣話題',
    templates: [
      '今天天氣真不錯，適合出去走走',
      '最近天氣變化大，要注意身體哦',
      '這幾天好熱啊，記得多喝水'
    ],
    keywords: ['天氣', '溫度'],
    suitableStages: ['stranger', 'visitor', 'lead', 'customer'],
    priority: 60
  },
  {
    category: 'seasonal',
    title: '新年話題',
    templates: [
      '新年快樂！🎊 新的一年有什麼新計劃嗎？',
      '祝你新年大吉大利！今年的目標是什麼？',
      '新年新氣象，一起加油！'
    ],
    keywords: ['新年', '新春'],
    suitableStages: ['visitor', 'lead', 'qualified', 'customer', 'advocate'],
    priority: 95,
    expiresAt: new Date(new Date().getFullYear(), 1, 15) // 2月15日過期
  },
  
  // 興趣類
  {
    category: 'interest',
    title: '加密貨幣',
    templates: [
      '最近加密市場挺有意思的，有在關注嗎？',
      'BTC最近的走勢你怎麼看？',
      '看到一個有趣的區塊鏈項目，想分享給你'
    ],
    keywords: ['加密', 'crypto', 'btc', '比特幣', '區塊鏈'],
    suitableStages: ['visitor', 'lead', 'qualified', 'customer'],
    priority: 70
  },
  {
    category: 'interest',
    title: '投資理財',
    templates: [
      '最近有什麼好的投資機會嗎？',
      '看到一份不錯的市場分析報告，有興趣看看嗎？',
      '投資方面最近有什麼心得？'
    ],
    keywords: ['投資', '理財', '股票', '基金'],
    suitableStages: ['visitor', 'lead', 'qualified', 'customer'],
    priority: 70
  },
  {
    category: 'interest',
    title: '科技動態',
    templates: [
      '看到一個有趣的新技術，讓我想到你',
      '最近AI發展好快，你有在用嗎？',
      '科技圈又有新動態了，聊聊？'
    ],
    keywords: ['科技', '技術', 'AI', '人工智能'],
    suitableStages: ['visitor', 'lead', 'qualified', 'customer'],
    priority: 70
  },
  
  // 業務類
  {
    category: 'business',
    title: '產品介紹',
    templates: [
      '對了，想跟你分享一下我們最近的新功能...',
      '不知道你有沒有這方面的需求，我們正好可以幫到你',
      '突然想到有個工具可能對你很有用'
    ],
    keywords: ['產品', '功能', '服務'],
    suitableStages: ['visitor', 'lead', 'qualified'],
    priority: 65
  },
  {
    category: 'business',
    title: '案例分享',
    templates: [
      '有個客戶情況和你類似，分享一下他的經驗',
      '最近有個很成功的案例，你可能會感興趣',
      '說個真實的例子給你聽...'
    ],
    keywords: ['案例', '客戶', '成功'],
    suitableStages: ['lead', 'qualified'],
    priority: 75
  },
  {
    category: 'business',
    title: '促銷優惠',
    templates: [
      '對了，我們現在有個限時優惠活動',
      '想到你可能感興趣，現在購買有特別折扣',
      '活動快結束了，想提醒你一下'
    ],
    keywords: ['優惠', '促銷', '折扣'],
    suitableStages: ['lead', 'qualified'],
    priority: 80
  },
  {
    category: 'business',
    title: '跟進詢問',
    templates: [
      '上次說的那個，你考慮得怎麼樣了？',
      '還有什麼疑問嗎？我可以幫你解答',
      '需要我提供更多信息嗎？'
    ],
    keywords: ['跟進', '考慮', '疑問'],
    suitableStages: ['lead', 'qualified'],
    priority: 70
  },
  
  // 關懷類
  {
    category: 'support',
    title: '使用回訪',
    templates: [
      '用得還順利嗎？有什麼問題隨時找我',
      '最近使用體驗怎麼樣？有什麼建議嗎？',
      '來看看你，有需要幫忙的地方嗎？'
    ],
    keywords: ['使用', '體驗', '反饋'],
    suitableStages: ['customer', 'advocate'],
    priority: 75
  },
  {
    category: 'support',
    title: '新功能通知',
    templates: [
      '我們上線了新功能，想第一時間告訴你',
      '有個很棒的更新，你一定會喜歡',
      '專門來分享一個好消息～'
    ],
    keywords: ['新功能', '更新', '升級'],
    suitableStages: ['customer', 'advocate'],
    priority: 80
  },
  
  // 跟進類
  {
    category: 'followup',
    title: '久未聯繫',
    templates: [
      '好久沒聊了，最近怎麼樣？',
      '突然想起你，來問候一下～',
      '有段時間沒見了，一切都好嗎？'
    ],
    keywords: ['好久', '想念', '問候'],
    suitableStages: ['dormant', 'customer'],
    priority: 70
  },
  {
    category: 'followup',
    title: '重新激活',
    templates: [
      '我們有些新的變化想跟你分享',
      '最近有個特別優惠，想到你可能感興趣',
      '好久沒聯繫了，有個好消息要告訴你'
    ],
    keywords: ['新變化', '特別', '好消息'],
    suitableStages: ['dormant'],
    priority: 65
  }
];

@Injectable({
  providedIn: 'root'
})
export class DynamicTopicGeneratorService {
  private aiProvider = inject(AIProviderService);
  private leadService = inject(LeadService);
  
  // ============ 狀態 ============
  
  // 話題庫（帶使用統計）
  private _topics = signal<Topic[]>(
    TOPIC_LIBRARY.map((t, i) => ({
      ...t,
      id: `topic_${i}`,
      usageCount: 0
    }))
  );
  topics = computed(() => this._topics());
  
  // 用戶話題使用歷史
  private _topicUsageHistory = signal<Map<string, { topicId: string; usedAt: Date }[]>>(new Map());
  
  // 熱點話題緩存
  private _trendingTopics = signal<Topic[]>([]);
  trendingTopics = computed(() => this._trendingTopics());
  
  // 是否使用AI生成
  private _useAIGeneration = signal(true);
  
  constructor() {
    this.loadData();
    this.updateSeasonalTopics();
  }
  
  // ============ 話題推薦 ============
  
  /**
   * 為用戶推薦話題
   */
  getRecommendations(
    lead: Lead,
    type: ConversationType,
    count: number = 5
  ): TopicRecommendation[] {
    const recommendations: TopicRecommendation[] = [];
    
    // 獲取可用話題
    const availableTopics = this.getAvailableTopics(lead, type);
    
    // 計算每個話題的評分
    for (const topic of availableTopics) {
      const score = this.calculateTopicScore(topic, lead, type);
      const reason = this.generateRecommendationReason(topic, lead, score);
      const suggestedOpener = this.selectOpener(topic, lead);
      
      recommendations.push({
        topic,
        score,
        reason,
        suggestedOpener
      });
    }
    
    // 按評分排序並返回
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
  }
  
  /**
   * 獲取可用話題
   */
  private getAvailableTopics(lead: Lead, type: ConversationType): Topic[] {
    const now = new Date();
    const recentUsed = this.getRecentlyUsedTopics(lead.id);
    
    return this._topics().filter(topic => {
      // 檢查是否過期
      if (topic.expiresAt && topic.expiresAt < now) {
        return false;
      }
      
      // 檢查是否適合當前階段
      if (!topic.suitableStages.includes(lead.stage)) {
        return false;
      }
      
      // 根據對話類型過濾
      if (type === 'business') {
        return ['business', 'followup', 'greeting'].includes(topic.category);
      } else if (type === 'casual') {
        return ['greeting', 'seasonal', 'trending', 'interest', 'personal', 'support'].includes(topic.category);
      }
      
      // 避免最近使用過的話題
      if (recentUsed.includes(topic.id)) {
        return false;
      }
      
      return true;
    });
  }
  
  /**
   * 計算話題評分
   */
  private calculateTopicScore(topic: Topic, lead: Lead, type: ConversationType): number {
    let score = topic.priority;
    
    // 興趣匹配加分
    const interestMatch = lead.profile.interests.some(interest =>
      topic.keywords.some(kw => interest.toLowerCase().includes(kw.toLowerCase()))
    );
    if (interestMatch) {
      score += 20;
    }
    
    // 時間適配加分
    const hour = new Date().getHours();
    if (topic.title.includes('早') && hour >= 6 && hour < 12) {
      score += 15;
    } else if (topic.title.includes('午') && hour >= 12 && hour < 18) {
      score += 15;
    } else if (topic.title.includes('晚') && hour >= 18) {
      score += 15;
    }
    
    // 週末加分
    const dayOfWeek = new Date().getDay();
    if ((dayOfWeek === 0 || dayOfWeek === 6) && topic.title.includes('週末')) {
      score += 20;
    }
    
    // 階段適配
    if (lead.stage === 'qualified' && topic.category === 'business') {
      score += 15;
    }
    if (lead.stage === 'customer' && topic.category === 'support') {
      score += 15;
    }
    if (lead.stage === 'dormant' && topic.category === 'followup') {
      score += 20;
    }
    
    // 使用頻率懲罰
    score -= topic.usageCount * 2;
    
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * 生成推薦原因
   */
  private generateRecommendationReason(topic: Topic, lead: Lead, score: number): string {
    const reasons: string[] = [];
    
    if (topic.category === 'greeting') {
      reasons.push('適合作為開場');
    }
    
    if (topic.category === 'seasonal') {
      reasons.push('符合當前時節');
    }
    
    const interestMatch = lead.profile.interests.some(interest =>
      topic.keywords.some(kw => interest.toLowerCase().includes(kw.toLowerCase()))
    );
    if (interestMatch) {
      reasons.push('匹配用戶興趣');
    }
    
    if (topic.suitableStages.length <= 2) {
      reasons.push(`適合${this.leadService.getStageName(lead.stage)}階段`);
    }
    
    if (score >= 80) {
      reasons.push('高度推薦');
    }
    
    return reasons.length > 0 ? reasons.join('，') : '一般推薦';
  }
  
  /**
   * 選擇開場白
   */
  private selectOpener(topic: Topic, lead: Lead): string {
    const templates = topic.templates;
    if (templates.length === 0) return '';
    
    // 根據用戶特徵選擇模板
    let template = templates[Math.floor(Math.random() * templates.length)];
    
    // 個性化替換
    template = this.personalizeTemplate(template, lead);
    
    return template;
  }
  
  /**
   * 個性化模板
   */
  private personalizeTemplate(template: string, lead: Lead): string {
    const name = lead.firstName || lead.displayName.split(' ')[0] || '';
    
    // 替換變量
    template = template.replace(/\{\{name\}\}/g, name);
    template = template.replace(/\{\{username\}\}/g, lead.username || name);
    
    return template;
  }
  
  // ============ AI增強生成 ============
  
  /**
   * AI生成個性化開場白
   */
  async generatePersonalizedOpener(
    lead: Lead,
    type: ConversationType,
    topic?: Topic
  ): Promise<Opener> {
    const selectedTopic = topic || this.getRecommendations(lead, type, 1)[0]?.topic;
    
    if (!selectedTopic) {
      // 返回默認開場白
      return {
        content: type === 'business' ? '你好，有個好消息想跟你分享' : '嗨，最近怎麼樣？',
        topic: this._topics()[0],
        style: 'casual',
        length: 'short',
        hasQuestion: type !== 'business'
      };
    }
    
    // 如果啟用AI生成
    if (this._useAIGeneration()) {
      try {
        const aiOpener = await this.aiGenerateOpener(lead, selectedTopic, type);
        return aiOpener;
      } catch (error) {
        console.error('[TopicGenerator] AI generation failed:', error);
      }
    }
    
    // 使用模板
    const content = this.selectOpener(selectedTopic, lead);
    
    return {
      content,
      topic: selectedTopic,
      style: this.determineStyle(lead, type),
      length: 'medium',
      hasQuestion: content.includes('?') || content.includes('？')
    };
  }
  
  /**
   * AI生成開場白
   */
  private async aiGenerateOpener(
    lead: Lead,
    topic: Topic,
    type: ConversationType
  ): Promise<Opener> {
    const prompt = `為一位潛在客戶生成一個開場消息。

用戶信息:
- 稱呼: ${lead.firstName || lead.displayName}
- 階段: ${this.leadService.getStageName(lead.stage)}
- 興趣: ${lead.profile.interests.join(', ') || '未知'}

話題: ${topic.title}
話題描述: ${topic.description || topic.templates[0]}
對話類型: ${type === 'business' ? '業務跟進' : '情感維護'}

要求:
1. 自然親切，不要太正式
2. 簡潔，控制在50字以內
3. 如果是情感維護，可以問一個開放性問題
4. 如果是業務跟進，要自然地引入話題

只返回消息內容，不要其他說明。`;

    try {
      const content = await this.aiProvider.chat(prompt);
      
      return {
        content: content.trim(),
        topic,
        style: this.determineStyle(lead, type),
        length: content.length < 30 ? 'short' : content.length < 80 ? 'medium' : 'long',
        hasQuestion: content.includes('?') || content.includes('？')
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * 確定風格
   */
  private determineStyle(lead: Lead, type: ConversationType): Opener['style'] {
    if (type === 'business' && lead.stage === 'qualified') {
      return 'professional';
    }
    if (lead.stage === 'customer' || lead.stage === 'advocate') {
      return 'warm';
    }
    if (lead.stage === 'stranger') {
      return 'curious';
    }
    return 'casual';
  }
  
  // ============ 話題管理 ============
  
  /**
   * 記錄話題使用
   */
  recordTopicUsage(leadId: string, topicId: string): void {
    // 更新話題使用計數
    this._topics.update(topics =>
      topics.map(t => {
        if (t.id !== topicId) return t;
        return {
          ...t,
          usageCount: t.usageCount + 1,
          lastUsed: new Date()
        };
      })
    );
    
    // 記錄用戶歷史
    this._topicUsageHistory.update(history => {
      const newHistory = new Map(history);
      const leadHistory = newHistory.get(leadId) || [];
      leadHistory.push({ topicId, usedAt: new Date() });
      newHistory.set(leadId, leadHistory.slice(-20));
      return newHistory;
    });
    
    this.saveData();
  }
  
  /**
   * 獲取最近使用的話題
   */
  private getRecentlyUsedTopics(leadId: string): string[] {
    const history = this._topicUsageHistory().get(leadId) || [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    
    return history
      .filter(h => h.usedAt > cutoff)
      .map(h => h.topicId);
  }
  
  /**
   * 添加自定義話題
   */
  addCustomTopic(topic: Omit<Topic, 'id' | 'usageCount'>): Topic {
    const newTopic: Topic = {
      ...topic,
      id: `custom_${Date.now()}`,
      usageCount: 0
    };
    
    this._topics.update(topics => [...topics, newTopic]);
    this.saveData();
    
    return newTopic;
  }
  
  /**
   * 刪除自定義話題
   */
  removeCustomTopic(topicId: string): boolean {
    if (!topicId.startsWith('custom_')) return false;
    
    this._topics.update(topics => topics.filter(t => t.id !== topicId));
    this.saveData();
    
    return true;
  }
  
  // ============ 季節/熱點更新 ============
  
  /**
   * 更新季節性話題
   */
  private updateSeasonalTopics(): void {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    
    const seasonalTopics: Topic[] = [];
    
    // 春節（農曆新年附近）
    if (month === 1 && day >= 20 || month === 2 && day <= 10) {
      seasonalTopics.push({
        id: 'seasonal_cny',
        category: 'seasonal',
        title: '春節祝福',
        templates: [
          '新年快樂！🧧 祝你龍年大吉！',
          '春節愉快！新的一年萬事如意！',
          '過年好！有沒有回家團聚？'
        ],
        keywords: ['春節', '新年', '過年'],
        suitableStages: ['visitor', 'lead', 'customer', 'advocate'],
        priority: 100,
        usageCount: 0,
        expiresAt: new Date(now.getFullYear(), 1, 15)
      });
    }
    
    // 情人節
    if (month === 2 && day >= 10 && day <= 14) {
      seasonalTopics.push({
        id: 'seasonal_valentine',
        category: 'seasonal',
        title: '情人節',
        templates: [
          '情人節快樂！💕',
          '今天有什麼特別的安排嗎？',
          '情人節愉快！'
        ],
        keywords: ['情人節', '214'],
        suitableStages: ['visitor', 'lead', 'customer', 'advocate'],
        priority: 90,
        usageCount: 0,
        expiresAt: new Date(now.getFullYear(), 1, 15)
      });
    }
    
    // 雙十一
    if (month === 11 && day >= 1 && day <= 11) {
      seasonalTopics.push({
        id: 'seasonal_1111',
        category: 'seasonal',
        title: '雙十一',
        templates: [
          '雙十一來了，有什麼想買的嗎？',
          '購物節準備好剁手了嗎？😄',
          '雙十一有搶到什麼好東西嗎？'
        ],
        keywords: ['雙十一', '購物節', '1111'],
        suitableStages: ['visitor', 'lead', 'customer'],
        priority: 85,
        usageCount: 0,
        expiresAt: new Date(now.getFullYear(), 10, 12)
      });
    }
    
    // 更新話題庫
    if (seasonalTopics.length > 0) {
      this._topics.update(topics => {
        // 移除過期的季節話題
        const filtered = topics.filter(t => !t.id.startsWith('seasonal_'));
        return [...filtered, ...seasonalTopics];
      });
    }
  }
  
  /**
   * 添加熱點話題
   */
  addTrendingTopic(
    title: string,
    templates: string[],
    keywords: string[],
    expiresInDays: number = 3
  ): Topic {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    const topic: Topic = {
      id: `trending_${Date.now()}`,
      category: 'trending',
      title,
      templates,
      keywords,
      suitableStages: ['visitor', 'lead', 'customer', 'advocate'],
      priority: 90,
      usageCount: 0,
      expiresAt
    };
    
    this._trendingTopics.update(topics => [...topics, topic]);
    this._topics.update(topics => [...topics, topic]);
    
    return topic;
  }
  
  // ============ 設置 ============
  
  /**
   * 切換AI生成
   */
  toggleAIGeneration(enabled: boolean): void {
    this._useAIGeneration.set(enabled);
  }
  
  // ============ 統計 ============
  
  /**
   * 獲取話題使用統計
   */
  getTopicStats(): {
    totalTopics: number;
    byCategory: Record<TopicCategory, number>;
    mostUsed: { topic: Topic; count: number }[];
  } {
    const topics = this._topics();
    const byCategory: Record<TopicCategory, number> = {
      greeting: 0,
      seasonal: 0,
      trending: 0,
      interest: 0,
      industry: 0,
      personal: 0,
      business: 0,
      support: 0,
      followup: 0
    };
    
    for (const topic of topics) {
      byCategory[topic.category]++;
    }
    
    const mostUsed = [...topics]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map(t => ({ topic: t, count: t.usageCount }));
    
    return {
      totalTopics: topics.length,
      byCategory,
      mostUsed
    };
  }
  
  // ============ 持久化 ============
  
  private saveData(): void {
    try {
      // 保存自定義話題
      const customTopics = this._topics().filter(t => t.id.startsWith('custom_'));
      localStorage.setItem('tgai-custom-topics', JSON.stringify(customTopics));
      
      // 保存使用歷史
      const history = Array.from(this._topicUsageHistory().entries());
      localStorage.setItem('tgai-topic-usage-history', JSON.stringify(history));
      
      // 保存話題使用計數
      const usageCounts = this._topics().map(t => ({ id: t.id, count: t.usageCount, lastUsed: t.lastUsed }));
      localStorage.setItem('tgai-topic-usage-counts', JSON.stringify(usageCounts));
    } catch (e) {
      console.error('[TopicGenerator] Save error:', e);
    }
  }
  
  private loadData(): void {
    try {
      // 載入自定義話題
      const customData = localStorage.getItem('tgai-custom-topics');
      if (customData) {
        const customTopics = JSON.parse(customData);
        this._topics.update(topics => [...topics, ...customTopics]);
      }
      
      // 載入使用歷史
      const historyData = localStorage.getItem('tgai-topic-usage-history');
      if (historyData) {
        const entries = JSON.parse(historyData).map(([k, v]: [string, any[]]) => [
          k,
          v.map((h: any) => ({ ...h, usedAt: new Date(h.usedAt) }))
        ]);
        this._topicUsageHistory.set(new Map(entries));
      }
      
      // 載入話題使用計數
      const countsData = localStorage.getItem('tgai-topic-usage-counts');
      if (countsData) {
        const counts = JSON.parse(countsData);
        this._topics.update(topics =>
          topics.map(t => {
            const saved = counts.find((c: any) => c.id === t.id);
            if (saved) {
              return {
                ...t,
                usageCount: saved.count,
                lastUsed: saved.lastUsed ? new Date(saved.lastUsed) : undefined
              };
            }
            return t;
          })
        );
      }
    } catch (e) {
      console.error('[TopicGenerator] Load error:', e);
    }
  }
}
