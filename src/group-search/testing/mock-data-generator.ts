/**
 * TG-AI智控王 模擬數據生成器
 * Mock Data Generator v1.0
 * 
 * 用於測試和演示的模擬數據生成
 */

import {
  GroupBasicInfo,
  GroupDetailInfo,
  MemberBasicInfo,
  MemberStatus,
  MemberRole,
  SearchHistory,
  FavoriteGroup
} from '../search.types';

// ============ 配置 ============

const MOCK_CONFIG = {
  // 中文名稱池
  chineseFirstNames: ['小', '大', '阿', '老', '李', '王', '張', '劉', '陳', '楊'],
  chineseLastNames: ['明', '華', '強', '偉', '芳', '娜', '敏', '靜', '麗', '軍'],
  
  // 群組名稱關鍵詞
  groupKeywords: [
    '交流', '討論', '學習', '技術', '投資', '理財', '幣圈', '區塊鏈',
    '交易', '資源', '福利', '紅包', '互助', '推廣', '引流', '營銷',
    'Crypto', 'Trading', 'NFT', 'DeFi', 'Web3', 'AI', 'Tech'
  ],
  
  // 群組描述模板
  descriptions: [
    '歡迎加入我們的社群！這裡有最新的資訊和交流。',
    '專業的技術交流平台，匯聚行業精英。',
    '分享經驗，共同成長，打造優質社群。',
    '最新資訊實時分享，機會不容錯過！',
    'Welcome to our community! Share and grow together.'
  ]
};

// ============ 生成器類 ============

export class MockDataGenerator {
  private usedIds = new Set<string>();
  
  /**
   * 生成唯一 ID
   */
  generateId(prefix: string = 'id'): string {
    let id: string;
    do {
      id = `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } while (this.usedIds.has(id));
    this.usedIds.add(id);
    return id;
  }
  
  /**
   * 生成隨機數字
   */
  randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  /**
   * 從數組中隨機選擇
   */
  randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  /**
   * 從數組中隨機選擇多個
   */
  randomChoices<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
  
  /**
   * 生成隨機中文名
   */
  generateChineseName(): string {
    const first = this.randomChoice(MOCK_CONFIG.chineseFirstNames);
    const last = this.randomChoice(MOCK_CONFIG.chineseLastNames);
    return first + last;
  }
  
  /**
   * 生成隨機用戶名
   */
  generateUsername(): string {
    const prefixes = ['user', 'tg', 'crypto', 'trade', 'king', 'vip', 'pro'];
    const prefix = this.randomChoice(prefixes);
    const suffix = this.randomInt(100, 9999);
    return `${prefix}_${suffix}`;
  }
  
  /**
   * 生成隨機電話
   */
  generatePhone(): string {
    const prefixes = ['+86', '+852', '+886', '+1', '+44'];
    const prefix = this.randomChoice(prefixes);
    const number = this.randomInt(10000000000, 99999999999);
    return `${prefix}${number}`;
  }
  
  // ============ 群組生成 ============
  
  /**
   * 生成基礎群組信息
   */
  generateGroupBasicInfo(): GroupBasicInfo {
    const keywords = this.randomChoices(MOCK_CONFIG.groupKeywords, this.randomInt(1, 3));
    const title = keywords.join('') + this.randomChoice(['群', '社群', 'Group', '頻道']);
    const membersCount = this.randomInt(100, 100000);
    
    return {
      id: this.generateId('group'),
      title,
      username: Math.random() > 0.3 ? this.generateUsername() : undefined,
      description: this.randomChoice(MOCK_CONFIG.descriptions),
      photo: Math.random() > 0.2 ? `https://picsum.photos/seed/${Date.now()}/100/100` : undefined,
      membersCount,
      type: this.randomChoice(['group', 'supergroup', 'channel']),
      accessType: this.randomChoice(['public', 'private']),
      source: this.randomChoice(['telegram', 'jiso', 'tgstat', 'local']),
      relevanceScore: Math.random()
    };
  }
  
  /**
   * 生成詳細群組信息
   */
  generateGroupDetailInfo(): GroupDetailInfo {
    const basic = this.generateGroupBasicInfo();
    const onlineCount = Math.floor(basic.membersCount * (Math.random() * 0.2));
    const dailyMessages = this.randomInt(10, 500);
    
    return {
      ...basic,
      stats: {
        membersCount: basic.membersCount,
        onlineCount,
        adminsCount: this.randomInt(1, 10),
        dailyMessages,
        weeklyGrowth: (Math.random() - 0.3) * 20,  // -6% to 14%
        activeRate: Math.random() * 30,
        lastActivity: new Date(Date.now() - this.randomInt(0, 7 * 24 * 60 * 60 * 1000))
      },
      createdAt: new Date(Date.now() - this.randomInt(30, 365 * 3) * 24 * 60 * 60 * 1000),
      lastMessageAt: new Date(Date.now() - this.randomInt(0, 24) * 60 * 60 * 1000)
    };
  }
  
  /**
   * 批量生成群組
   */
  generateGroups(count: number, detailed: boolean = false): (GroupBasicInfo | GroupDetailInfo)[] {
    return Array.from({ length: count }, () => 
      detailed ? this.generateGroupDetailInfo() : this.generateGroupBasicInfo()
    );
  }
  
  // ============ 成員生成 ============
  
  /**
   * 生成成員信息
   */
  generateMember(): MemberBasicInfo {
    const statuses: MemberStatus[] = ['online', 'recently', 'lastWeek', 'lastMonth', 'longAgo', 'unknown'];
    const roles: MemberRole[] = ['member', 'member', 'member', 'member', 'admin', 'creator'];
    
    const isBot = Math.random() < 0.05;
    const isPremium = Math.random() < 0.1;
    
    return {
      id: this.generateId('user'),
      firstName: this.generateChineseName(),
      lastName: Math.random() > 0.5 ? this.generateChineseName().charAt(0) : undefined,
      username: Math.random() > 0.3 ? this.generateUsername() : undefined,
      phone: Math.random() > 0.7 ? this.generatePhone() : undefined,
      photo: Math.random() > 0.4 ? `https://i.pravatar.cc/100?u=${Date.now() + Math.random()}` : undefined,
      bio: Math.random() > 0.7 ? '這是一段個人簡介...' : undefined,
      status: this.randomChoice(statuses),
      role: this.randomChoice(roles),
      isBot,
      isPremium,
      isVerified: Math.random() < 0.02,
      isScam: Math.random() < 0.01,
      isFake: Math.random() < 0.02,
      joinedAt: new Date(Date.now() - this.randomInt(1, 365) * 24 * 60 * 60 * 1000)
    };
  }
  
  /**
   * 批量生成成員
   */
  generateMembers(count: number): MemberBasicInfo[] {
    return Array.from({ length: count }, () => this.generateMember());
  }
  
  /**
   * 生成高質量成員（用於測試篩選）
   */
  generateHighQualityMember(): MemberBasicInfo {
    return {
      id: this.generateId('user'),
      firstName: this.generateChineseName(),
      username: this.generateUsername(),
      photo: `https://i.pravatar.cc/100?u=${Date.now() + Math.random()}`,
      bio: '專業人士，歡迎交流合作',
      status: 'online',
      role: 'member',
      isBot: false,
      isPremium: true,
      isVerified: false,
      isScam: false,
      isFake: false,
      joinedAt: new Date(Date.now() - this.randomInt(30, 180) * 24 * 60 * 60 * 1000)
    };
  }
  
  // ============ 歷史記錄生成 ============
  
  /**
   * 生成搜索歷史
   */
  generateSearchHistory(): SearchHistory {
    const keywords = ['幣圈交流', 'Crypto Trading', '投資理財', 'NFT社群', 'Web3開發'];
    
    return {
      id: this.generateId('history'),
      query: {
        keyword: this.randomChoice(keywords),
        sources: this.randomChoices(['telegram', 'jiso', 'tgstat'], this.randomInt(1, 3)) as any,
        filters: {}
      },
      timestamp: new Date(Date.now() - this.randomInt(0, 30) * 24 * 60 * 60 * 1000),
      resultsCount: this.randomInt(5, 100)
    };
  }
  
  /**
   * 批量生成搜索歷史
   */
  generateSearchHistories(count: number): SearchHistory[] {
    return Array.from({ length: count }, () => this.generateSearchHistory());
  }
  
  /**
   * 生成收藏群組
   */
  generateFavorite(): FavoriteGroup {
    return {
      id: this.generateId('fav'),
      group: this.generateGroupBasicInfo(),
      addedAt: new Date(Date.now() - this.randomInt(0, 60) * 24 * 60 * 60 * 1000),
      notes: Math.random() > 0.5 ? '這是一個優質群組' : undefined,
      tags: this.randomChoices(['重要', '活躍', '高質量', '待觀察'], this.randomInt(0, 2))
    };
  }
  
  /**
   * 批量生成收藏
   */
  generateFavorites(count: number): FavoriteGroup[] {
    return Array.from({ length: count }, () => this.generateFavorite());
  }
  
  // ============ 消息生成 ============
  
  /**
   * 生成測試消息
   */
  generateTestMessages(): { text: string; expectedIntent: string; expectedSentiment: string }[] {
    return [
      { text: '你好，請問有什麼可以幫助您的嗎？', expectedIntent: 'greeting', expectedSentiment: 'neutral' },
      { text: '這個產品太棒了！非常滿意！', expectedIntent: 'feedback', expectedSentiment: 'positive' },
      { text: '你們的服務太差了，我要投訴！', expectedIntent: 'complaint', expectedSentiment: 'negative' },
      { text: '請問這個產品多少錢？', expectedIntent: 'inquiry', expectedSentiment: 'neutral' },
      { text: '謝謝你的幫助，非常感謝！', expectedIntent: 'thanks', expectedSentiment: 'positive' },
      { text: '我想購買這個產品，怎麼下單？', expectedIntent: 'purchase', expectedSentiment: 'neutral' },
      { text: '系統出現錯誤，無法正常使用', expectedIntent: 'support', expectedSentiment: 'negative' },
      { text: '建議增加更多功能選項', expectedIntent: 'feedback', expectedSentiment: 'neutral' },
      { text: '緊急！馬上需要處理這個問題！', expectedIntent: 'support', expectedSentiment: 'negative' },
      { text: '再見，下次聊', expectedIntent: 'farewell', expectedSentiment: 'neutral' }
    ];
  }
  
  // ============ 完整測試數據集 ============
  
  /**
   * 生成完整測試數據集
   */
  generateTestDataset(): {
    groups: GroupDetailInfo[];
    members: MemberBasicInfo[];
    searchHistory: SearchHistory[];
    favorites: FavoriteGroup[];
    messages: { text: string; expectedIntent: string; expectedSentiment: string }[];
  } {
    return {
      groups: this.generateGroups(20, true) as GroupDetailInfo[],
      members: this.generateMembers(100),
      searchHistory: this.generateSearchHistories(10),
      favorites: this.generateFavorites(5),
      messages: this.generateTestMessages()
    };
  }
}

// ============ 導出單例 ============

export const mockGenerator = new MockDataGenerator();
