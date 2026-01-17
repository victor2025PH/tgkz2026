/**
 * TG-AI智控王 智能推薦引擎
 * Recommendation Engine v1.0
 * 
 * 基於用戶行為和群組特徵的智能推薦
 * 
 * 推薦策略：
 * 1. 協同過濾 - 相似用戶喜歡的群組
 * 2. 內容相似 - 與收藏群組相似
 * 3. 熱門趨勢 - 近期熱門群組
 * 4. 個性化 - 基於用戶畫像
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { GroupBasicInfo, GroupDetailInfo, FavoriteGroup, SearchHistory } from '../search.types';
import { GroupScorer, GroupScore } from './group-scorer';

// ============ 推薦配置 ============

const RECOMMENDATION_CONFIG = {
  // 最大推薦數
  maxRecommendations: 20,
  // 最小相似度閾值
  minSimilarity: 0.3,
  // 策略權重
  strategyWeights: {
    similar: 0.35,      // 相似群組
    trending: 0.25,     // 熱門趨勢
    category: 0.20,     // 同類推薦
    personalized: 0.20  // 個性化
  },
  // 衰減因子
  decayFactor: {
    time: 0.05,         // 時間衰減（每天）
    frequency: 0.1      // 頻率衰減
  }
};

// ============ 類型定義 ============

export interface Recommendation {
  group: GroupBasicInfo;
  score: number;             // 推薦分數 (0-1)
  reason: string;            // 推薦理由
  source: RecommendationSource;
  confidence: number;        // 置信度 (0-1)
  tags?: string[];
}

export type RecommendationSource = 
  | 'similar'        // 相似群組
  | 'trending'       // 熱門趨勢
  | 'category'       // 同類推薦
  | 'personalized'   // 個性化
  | 'discovery';     // 發現

export interface UserProfile {
  // 興趣標籤
  interests: Map<string, number>;  // tag -> weight
  // 偏好類型
  preferredTypes: Map<string, number>;  // type -> weight
  // 規模偏好
  sizePreference: {
    min: number;
    max: number;
    optimal: number;
  };
  // 語言偏好
  languagePreference: string[];
  // 最近活動
  recentActivity: {
    searches: string[];
    viewed: string[];
    joined: string[];
  };
}

export interface TrendingGroup {
  group: GroupBasicInfo;
  trendScore: number;
  growth: number;
  momentum: number;
}

// ============ 推薦引擎 ============

@Injectable({
  providedIn: 'root'
})
export class RecommendationEngine {
  private groupScorer = inject(GroupScorer);
  
  // 用戶畫像
  private _userProfile = signal<UserProfile>(this.createDefaultProfile());
  userProfile = computed(() => this._userProfile());
  
  // 推薦緩存
  private recommendationCache: Recommendation[] = [];
  private lastUpdateTime = 0;
  private readonly CACHE_DURATION = 10 * 60 * 1000;  // 10分鐘
  
  // 群組索引（用於快速檢索）
  private groupIndex: Map<string, GroupBasicInfo> = new Map();
  private categoryIndex: Map<string, Set<string>> = new Map();
  
  // 熱門群組
  private _trendingGroups = signal<TrendingGroup[]>([]);
  trendingGroups = computed(() => this._trendingGroups());
  
  constructor() {
    this.loadUserProfile();
  }
  
  // ============ 推薦生成 ============
  
  /**
   * 生成推薦列表
   */
  async generateRecommendations(
    favorites: FavoriteGroup[],
    searchHistory: SearchHistory[],
    candidateGroups: GroupBasicInfo[]
  ): Promise<Recommendation[]> {
    // 檢查緩存
    if (this.isCacheValid()) {
      return this.recommendationCache;
    }
    
    console.log('[Recommendation] Generating recommendations...');
    
    // 更新群組索引
    this.updateGroupIndex(candidateGroups);
    
    // 更新用戶畫像
    this.updateUserProfile(favorites, searchHistory);
    
    // 收集所有推薦候選
    const candidates: Map<string, Recommendation> = new Map();
    
    // 策略1: 相似群組推薦
    const similarRecs = this.getSimilarRecommendations(favorites, candidateGroups);
    this.mergeRecommendations(candidates, similarRecs, 'similar');
    
    // 策略2: 熱門趨勢推薦
    const trendingRecs = this.getTrendingRecommendations(candidateGroups);
    this.mergeRecommendations(candidates, trendingRecs, 'trending');
    
    // 策略3: 同類推薦
    const categoryRecs = this.getCategoryRecommendations(favorites, candidateGroups);
    this.mergeRecommendations(candidates, categoryRecs, 'category');
    
    // 策略4: 個性化推薦
    const personalizedRecs = this.getPersonalizedRecommendations(candidateGroups);
    this.mergeRecommendations(candidates, personalizedRecs, 'personalized');
    
    // 過濾已收藏的群組
    const favoriteIds = new Set(favorites.map(f => f.group.id));
    const filteredCandidates = [...candidates.values()]
      .filter(r => !favoriteIds.has(r.group.id));
    
    // 排序並取 Top N
    const recommendations = filteredCandidates
      .sort((a, b) => b.score - a.score)
      .slice(0, RECOMMENDATION_CONFIG.maxRecommendations);
    
    // 緩存結果
    this.recommendationCache = recommendations;
    this.lastUpdateTime = Date.now();
    
    console.log(`[Recommendation] Generated ${recommendations.length} recommendations`);
    
    return recommendations;
  }
  
  /**
   * 快速推薦（基於單個群組）
   */
  getQuickRecommendations(
    baseGroup: GroupBasicInfo,
    candidateGroups: GroupBasicInfo[],
    limit: number = 5
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    for (const candidate of candidateGroups) {
      if (candidate.id === baseGroup.id) continue;
      
      const similarity = this.calculateGroupSimilarity(baseGroup, candidate);
      
      if (similarity >= RECOMMENDATION_CONFIG.minSimilarity) {
        recommendations.push({
          group: candidate,
          score: similarity,
          reason: this.generateSimilarityReason(baseGroup, candidate),
          source: 'similar',
          confidence: similarity
        });
      }
    }
    
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
  
  // ============ 推薦策略 ============
  
  private getSimilarRecommendations(
    favorites: FavoriteGroup[],
    candidates: GroupBasicInfo[]
  ): Recommendation[] {
    if (favorites.length === 0) return [];
    
    const recommendations: Recommendation[] = [];
    const weight = RECOMMENDATION_CONFIG.strategyWeights.similar;
    
    for (const candidate of candidates) {
      let maxSimilarity = 0;
      let mostSimilar: GroupBasicInfo | null = null;
      
      for (const fav of favorites) {
        const similarity = this.calculateGroupSimilarity(fav.group, candidate);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          mostSimilar = fav.group;
        }
      }
      
      if (maxSimilarity >= RECOMMENDATION_CONFIG.minSimilarity && mostSimilar) {
        recommendations.push({
          group: candidate,
          score: maxSimilarity * weight,
          reason: `與「${mostSimilar.title}」相似`,
          source: 'similar',
          confidence: maxSimilarity
        });
      }
    }
    
    return recommendations;
  }
  
  private getTrendingRecommendations(
    candidates: GroupBasicInfo[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const weight = RECOMMENDATION_CONFIG.strategyWeights.trending;
    
    // 計算趨勢分數
    const trending = candidates
      .map(group => ({
        group,
        trendScore: this.calculateTrendScore(group)
      }))
      .filter(t => t.trendScore > 0.3)
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, 10);
    
    // 更新熱門列表
    this._trendingGroups.set(trending.map(t => ({
      group: t.group,
      trendScore: t.trendScore,
      growth: this.getGrowthRate(t.group),
      momentum: t.trendScore
    })));
    
    for (const { group, trendScore } of trending) {
      recommendations.push({
        group,
        score: trendScore * weight,
        reason: '熱門趨勢群組',
        source: 'trending',
        confidence: trendScore,
        tags: ['🔥 熱門']
      });
    }
    
    return recommendations;
  }
  
  private getCategoryRecommendations(
    favorites: FavoriteGroup[],
    candidates: GroupBasicInfo[]
  ): Recommendation[] {
    if (favorites.length === 0) return [];
    
    const recommendations: Recommendation[] = [];
    const weight = RECOMMENDATION_CONFIG.strategyWeights.category;
    
    // 分析用戶偏好的類別
    const preferredCategories = this.analyzePreferredCategories(favorites);
    
    for (const candidate of candidates) {
      const categories = this.extractCategories(candidate);
      let categoryScore = 0;
      let matchedCategory = '';
      
      for (const category of categories) {
        const preference = preferredCategories.get(category) || 0;
        if (preference > categoryScore) {
          categoryScore = preference;
          matchedCategory = category;
        }
      }
      
      if (categoryScore > 0.2) {
        recommendations.push({
          group: candidate,
          score: categoryScore * weight,
          reason: `${matchedCategory}類群組`,
          source: 'category',
          confidence: categoryScore,
          tags: [matchedCategory]
        });
      }
    }
    
    return recommendations;
  }
  
  private getPersonalizedRecommendations(
    candidates: GroupBasicInfo[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const weight = RECOMMENDATION_CONFIG.strategyWeights.personalized;
    const profile = this._userProfile();
    
    for (const candidate of candidates) {
      const personalizedScore = this.calculatePersonalizedScore(candidate, profile);
      
      if (personalizedScore > 0.3) {
        recommendations.push({
          group: candidate,
          score: personalizedScore * weight,
          reason: '根據您的偏好推薦',
          source: 'personalized',
          confidence: personalizedScore
        });
      }
    }
    
    return recommendations;
  }
  
  // ============ 相似度計算 ============
  
  private calculateGroupSimilarity(
    group1: GroupBasicInfo,
    group2: GroupBasicInfo
  ): number {
    let similarity = 0;
    let weights = 0;
    
    // 1. 名稱相似度 (權重 0.25)
    const titleSim = this.calculateTextSimilarity(group1.title, group2.title);
    similarity += titleSim * 0.25;
    weights += 0.25;
    
    // 2. 描述相似度 (權重 0.20)
    if (group1.description && group2.description) {
      const descSim = this.calculateTextSimilarity(group1.description, group2.description);
      similarity += descSim * 0.20;
      weights += 0.20;
    }
    
    // 3. 規模相似度 (權重 0.20)
    const sizeSim = this.calculateSizeSimilarity(group1.membersCount, group2.membersCount);
    similarity += sizeSim * 0.20;
    weights += 0.20;
    
    // 4. 類型相似度 (權重 0.15)
    if (group1.type === group2.type) {
      similarity += 0.15;
    }
    weights += 0.15;
    
    // 5. 關鍵詞相似度 (權重 0.20)
    const keywords1 = this.extractKeywords(group1);
    const keywords2 = this.extractKeywords(group2);
    const keywordSim = this.calculateSetSimilarity(keywords1, keywords2);
    similarity += keywordSim * 0.20;
    weights += 0.20;
    
    return similarity / weights;
  }
  
  private calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;
    
    // 簡單的 Jaccard 相似度
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    return this.calculateSetSimilarity(words1, words2);
  }
  
  private calculateSetSimilarity(set1: Set<string>, set2: Set<string>): number {
    if (set1.size === 0 || set2.size === 0) return 0;
    
    let intersection = 0;
    for (const item of set1) {
      if (set2.has(item)) intersection++;
    }
    
    const union = set1.size + set2.size - intersection;
    return intersection / union;
  }
  
  private calculateSizeSimilarity(size1: number, size2: number): number {
    if (size1 === 0 || size2 === 0) return 0;
    
    const ratio = Math.min(size1, size2) / Math.max(size1, size2);
    return ratio;
  }
  
  // ============ 趨勢計算 ============
  
  private calculateTrendScore(group: GroupBasicInfo): number {
    let score = 0;
    
    // 規模基礎分
    const members = group.membersCount || 0;
    if (members > 10000) score += 0.3;
    else if (members > 1000) score += 0.2;
    else if (members > 100) score += 0.1;
    
    // 增長分數
    const growth = this.getGrowthRate(group);
    if (growth > 10) score += 0.4;
    else if (growth > 5) score += 0.3;
    else if (growth > 0) score += 0.1;
    
    // 活躍度分數
    if ('stats' in group && (group as GroupDetailInfo).stats) {
      const stats = (group as GroupDetailInfo).stats;
      if (stats.activeRate && stats.activeRate > 15) score += 0.2;
      if (stats.dailyMessages && stats.dailyMessages > 100) score += 0.1;
    }
    
    return Math.min(score, 1);
  }
  
  private getGrowthRate(group: GroupBasicInfo): number {
    if ('stats' in group && (group as GroupDetailInfo).stats) {
      return (group as GroupDetailInfo).stats.weeklyGrowth || 0;
    }
    return 0;
  }
  
  // ============ 個性化評分 ============
  
  private calculatePersonalizedScore(
    group: GroupBasicInfo,
    profile: UserProfile
  ): number {
    let score = 0;
    let factors = 0;
    
    // 興趣匹配
    const keywords = this.extractKeywords(group);
    let interestScore = 0;
    for (const keyword of keywords) {
      const weight = profile.interests.get(keyword) || 0;
      interestScore += weight;
    }
    if (keywords.size > 0) {
      score += (interestScore / keywords.size) * 0.4;
      factors += 0.4;
    }
    
    // 類型偏好
    const typeWeight = profile.preferredTypes.get(group.type) || 0;
    score += typeWeight * 0.2;
    factors += 0.2;
    
    // 規模偏好
    const members = group.membersCount || 0;
    if (members >= profile.sizePreference.min && members <= profile.sizePreference.max) {
      const optimalDist = Math.abs(members - profile.sizePreference.optimal);
      const maxDist = profile.sizePreference.max - profile.sizePreference.min;
      const sizeScore = 1 - (optimalDist / maxDist);
      score += sizeScore * 0.2;
    }
    factors += 0.2;
    
    // 語言偏好
    const text = `${group.title} ${group.description || ''}`;
    for (const lang of profile.languagePreference) {
      if (lang === 'zh' && /[\u4e00-\u9fff]/.test(text)) {
        score += 0.2;
        break;
      }
      if (lang === 'en' && /[a-zA-Z]/.test(text)) {
        score += 0.1;
        break;
      }
    }
    factors += 0.2;
    
    return factors > 0 ? score / factors : 0;
  }
  
  // ============ 用戶畫像 ============
  
  updateUserProfile(
    favorites: FavoriteGroup[],
    searchHistory: SearchHistory[]
  ): void {
    const profile = this._userProfile();
    
    // 從收藏中學習興趣
    for (const fav of favorites) {
      const keywords = this.extractKeywords(fav.group);
      for (const keyword of keywords) {
        const current = profile.interests.get(keyword) || 0;
        profile.interests.set(keyword, Math.min(current + 0.2, 1));
      }
      
      // 類型偏好
      const current = profile.preferredTypes.get(fav.group.type) || 0;
      profile.preferredTypes.set(fav.group.type, Math.min(current + 0.1, 1));
      
      // 規模偏好
      if (fav.group.membersCount) {
        const members = fav.group.membersCount;
        profile.sizePreference.min = Math.min(profile.sizePreference.min, members * 0.5);
        profile.sizePreference.max = Math.max(profile.sizePreference.max, members * 2);
        profile.sizePreference.optimal = 
          (profile.sizePreference.optimal * 0.8) + (members * 0.2);
      }
    }
    
    // 從搜索歷史中學習
    const recentSearches = searchHistory.slice(0, 20).map(h => h.query.keyword);
    profile.recentActivity.searches = recentSearches;
    
    // 分析搜索關鍵詞
    for (const keyword of recentSearches) {
      const words = keyword.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length > 1) {
          const current = profile.interests.get(word) || 0;
          profile.interests.set(word, Math.min(current + 0.1, 1));
        }
      }
    }
    
    // 應用時間衰減
    this.applyDecay(profile);
    
    this._userProfile.set({ ...profile });
    this.saveUserProfile(profile);
  }
  
  private applyDecay(profile: UserProfile): void {
    const decayFactor = RECOMMENDATION_CONFIG.decayFactor.time;
    
    // 興趣衰減
    for (const [key, value] of profile.interests) {
      const newValue = value * (1 - decayFactor);
      if (newValue < 0.05) {
        profile.interests.delete(key);
      } else {
        profile.interests.set(key, newValue);
      }
    }
    
    // 類型偏好衰減
    for (const [key, value] of profile.preferredTypes) {
      profile.preferredTypes.set(key, value * (1 - decayFactor * 0.5));
    }
  }
  
  private createDefaultProfile(): UserProfile {
    return {
      interests: new Map(),
      preferredTypes: new Map([
        ['supergroup', 0.5],
        ['channel', 0.5]
      ]),
      sizePreference: {
        min: 100,
        max: 100000,
        optimal: 5000
      },
      languagePreference: ['zh', 'en'],
      recentActivity: {
        searches: [],
        viewed: [],
        joined: []
      }
    };
  }
  
  // ============ 輔助方法 ============
  
  private mergeRecommendations(
    target: Map<string, Recommendation>,
    source: Recommendation[],
    sourceName: RecommendationSource
  ): void {
    for (const rec of source) {
      const existing = target.get(rec.group.id);
      if (existing) {
        // 合併分數
        existing.score = Math.max(existing.score, rec.score);
        if (rec.confidence > existing.confidence) {
          existing.reason = rec.reason;
          existing.source = sourceName;
          existing.confidence = rec.confidence;
        }
      } else {
        target.set(rec.group.id, rec);
      }
    }
  }
  
  private updateGroupIndex(groups: GroupBasicInfo[]): void {
    for (const group of groups) {
      this.groupIndex.set(group.id, group);
      
      // 更新類別索引
      const categories = this.extractCategories(group);
      for (const category of categories) {
        if (!this.categoryIndex.has(category)) {
          this.categoryIndex.set(category, new Set());
        }
        this.categoryIndex.get(category)!.add(group.id);
      }
    }
  }
  
  private extractKeywords(group: GroupBasicInfo): Set<string> {
    const text = `${group.title} ${group.description || ''}`.toLowerCase();
    const keywords = new Set<string>();
    
    // 提取中文關鍵詞
    const chineseWords = text.match(/[\u4e00-\u9fff]+/g) || [];
    chineseWords.forEach(w => {
      if (w.length >= 2 && w.length <= 4) {
        keywords.add(w);
      }
    });
    
    // 提取英文關鍵詞
    const englishWords = text.match(/[a-zA-Z]{3,}/g) || [];
    englishWords.forEach(w => keywords.add(w.toLowerCase()));
    
    return keywords;
  }
  
  private extractCategories(group: GroupBasicInfo): string[] {
    const categories: string[] = [];
    const text = `${group.title} ${group.description || ''}`.toLowerCase();
    
    // 類別關鍵詞映射
    const categoryKeywords: Record<string, string[]> = {
      '加密貨幣': ['crypto', '幣', 'coin', 'btc', 'eth', 'blockchain', '區塊鏈'],
      '投資理財': ['invest', '投資', '理財', '股票', 'stock', 'trade'],
      '科技': ['tech', '技術', '開發', 'code', 'programming', '程式'],
      '電商': ['ecommerce', '電商', '淘寶', '拼多多', '跨境'],
      '遊戲': ['game', '遊戲', 'gaming', '電競'],
      '社群': ['community', '社群', '交流', 'chat'],
      '新聞': ['news', '新聞', '資訊', 'media'],
      '教育': ['education', '教育', '學習', 'learn', 'course']
    };
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          categories.push(category);
          break;
        }
      }
    }
    
    return categories;
  }
  
  private analyzePreferredCategories(favorites: FavoriteGroup[]): Map<string, number> {
    const categoryCount = new Map<string, number>();
    
    for (const fav of favorites) {
      const categories = this.extractCategories(fav.group);
      for (const category of categories) {
        const count = categoryCount.get(category) || 0;
        categoryCount.set(category, count + 1);
      }
    }
    
    // 轉換為權重
    const total = favorites.length || 1;
    const weights = new Map<string, number>();
    for (const [category, count] of categoryCount) {
      weights.set(category, count / total);
    }
    
    return weights;
  }
  
  private generateSimilarityReason(base: GroupBasicInfo, similar: GroupBasicInfo): string {
    const reasons: string[] = [];
    
    // 類型相似
    if (base.type === similar.type) {
      reasons.push('同類型');
    }
    
    // 規模相似
    const sizeRatio = Math.min(base.membersCount, similar.membersCount) / 
                     Math.max(base.membersCount, similar.membersCount);
    if (sizeRatio > 0.5) {
      reasons.push('規模相近');
    }
    
    // 名稱相似
    const keywords = this.extractKeywords(base);
    const similarKeywords = this.extractKeywords(similar);
    const common = [...keywords].filter(k => similarKeywords.has(k));
    if (common.length > 0) {
      reasons.push(`相關主題`);
    }
    
    return reasons.length > 0 
      ? `與「${base.title}」${reasons.join('、')}` 
      : `與「${base.title}」相似`;
  }
  
  private isCacheValid(): boolean {
    return (
      this.recommendationCache.length > 0 &&
      Date.now() - this.lastUpdateTime < RECOMMENDATION_CONFIG.CACHE_DURATION
    );
  }
  
  // ============ 持久化 ============
  
  private saveUserProfile(profile: UserProfile): void {
    try {
      const serialized = {
        interests: [...profile.interests.entries()],
        preferredTypes: [...profile.preferredTypes.entries()],
        sizePreference: profile.sizePreference,
        languagePreference: profile.languagePreference,
        recentActivity: profile.recentActivity
      };
      localStorage.setItem('tgai-user-profile', JSON.stringify(serialized));
    } catch (e) {}
  }
  
  private loadUserProfile(): void {
    try {
      const data = localStorage.getItem('tgai-user-profile');
      if (data) {
        const parsed = JSON.parse(data);
        this._userProfile.set({
          interests: new Map(parsed.interests),
          preferredTypes: new Map(parsed.preferredTypes),
          sizePreference: parsed.sizePreference,
          languagePreference: parsed.languagePreference,
          recentActivity: parsed.recentActivity
        });
      }
    } catch (e) {}
  }
  
  /**
   * 重置用戶畫像
   */
  resetProfile(): void {
    this._userProfile.set(this.createDefaultProfile());
    localStorage.removeItem('tgai-user-profile');
  }
  
  /**
   * 清除推薦緩存
   */
  clearCache(): void {
    this.recommendationCache = [];
    this.lastUpdateTime = 0;
  }
}
