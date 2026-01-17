/**
 * TG-AI智控王 群組質量評分系統
 * Group Scorer v1.0
 * 
 * 基於多維度指標評估群組價值
 * 
 * 評分維度：
 * 1. 規模指標 - 成員數量、增長趨勢
 * 2. 活躍指標 - 在線率、消息頻率
 * 3. 質量指標 - 真人比例、Premium比例
 * 4. 互動指標 - 互動率、回覆率
 * 5. 安全指標 - 垃圾信息、詐騙風險
 */

import { Injectable, signal, computed } from '@angular/core';
import { 
  GroupBasicInfo, 
  GroupDetailInfo, 
  GroupStats,
  MemberBasicInfo 
} from '../search.types';

// ============ 評分配置 ============

const SCORING_CONFIG = {
  // 權重配置
  weights: {
    scale: 0.20,      // 規模
    activity: 0.25,   // 活躍度
    quality: 0.25,    // 質量
    engagement: 0.15, // 互動
    safety: 0.15      // 安全
  },
  
  // 規模評分參數
  scale: {
    optimalSize: 10000,     // 最佳規模
    minSize: 100,           // 最小有效規模
    maxPenaltySize: 500000, // 超大群組開始扣分
    growthBonus: 0.1        // 增長獎勵係數
  },
  
  // 活躍度參數
  activity: {
    optimalOnlineRate: 0.15,  // 最佳在線率
    optimalDailyMessages: 100, // 最佳日消息數
    lastActivityDays: 7        // 最近活動天數閾值
  },
  
  // 質量參數
  quality: {
    minRealUserRate: 0.8,     // 最小真人率
    optimalPremiumRate: 0.1,  // 最佳 Premium 率
    hasUsernameBonus: 0.1     // 有用戶名加分
  },
  
  // 安全參數
  safety: {
    maxScamRate: 0.01,    // 最大詐騙標記率
    maxFakeRate: 0.05,    // 最大假冒標記率
    maxBotRate: 0.1       // 最大機器人率
  }
};

// ============ 評分結果類型 ============

export interface GroupScore {
  // 總分 (0-100)
  total: number;
  
  // 等級 (S/A/B/C/D/F)
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  
  // 分項得分
  dimensions: {
    scale: DimensionScore;
    activity: DimensionScore;
    quality: DimensionScore;
    engagement: DimensionScore;
    safety: DimensionScore;
  };
  
  // 標籤
  tags: GroupTag[];
  
  // 風險警告
  warnings: string[];
  
  // 推薦理由
  highlights: string[];
  
  // 評分時間
  scoredAt: Date;
}

export interface DimensionScore {
  score: number;      // 0-100
  weight: number;     // 權重
  weighted: number;   // 加權得分
  details: string[];  // 評分細節
}

export interface GroupTag {
  id: string;
  name: string;
  color: string;
  icon: string;
}

// ============ 預定義標籤 ============

const GROUP_TAGS: Record<string, GroupTag> = {
  // 規模標籤
  massive: { id: 'massive', name: '超大規模', color: '#8B5CF6', icon: '🏛️' },
  large: { id: 'large', name: '大型社群', color: '#6366F1', icon: '🏢' },
  medium: { id: 'medium', name: '中型社群', color: '#3B82F6', icon: '🏠' },
  small: { id: 'small', name: '小型社群', color: '#06B6D4', icon: '🏡' },
  
  // 活躍標籤
  veryActive: { id: 'veryActive', name: '非常活躍', color: '#10B981', icon: '🔥' },
  active: { id: 'active', name: '活躍', color: '#34D399', icon: '✨' },
  moderate: { id: 'moderate', name: '適中', color: '#FBBF24', icon: '💫' },
  quiet: { id: 'quiet', name: '較安靜', color: '#9CA3AF', icon: '🌙' },
  
  // 質量標籤
  highQuality: { id: 'highQuality', name: '高質量', color: '#F59E0B', icon: '⭐' },
  premium: { id: 'premium', name: 'Premium多', color: '#EC4899', icon: '💎' },
  verified: { id: 'verified', name: '官方認證', color: '#06B6D4', icon: '✓' },
  
  // 增長標籤
  fastGrowing: { id: 'fastGrowing', name: '快速增長', color: '#22C55E', icon: '📈' },
  stable: { id: 'stable', name: '穩定', color: '#64748B', icon: '➡️' },
  declining: { id: 'declining', name: '下降中', color: '#EF4444', icon: '📉' },
  
  // 風險標籤
  safe: { id: 'safe', name: '安全', color: '#10B981', icon: '🛡️' },
  caution: { id: 'caution', name: '需謹慎', color: '#F59E0B', icon: '⚠️' },
  risky: { id: 'risky', name: '高風險', color: '#EF4444', icon: '🚨' },
  
  // 類型標籤
  chinese: { id: 'chinese', name: '中文', color: '#DC2626', icon: '🇨🇳' },
  english: { id: 'english', name: '英文', color: '#2563EB', icon: '🇺🇸' },
  crypto: { id: 'crypto', name: '加密貨幣', color: '#F7931A', icon: '₿' },
  tech: { id: 'tech', name: '科技', color: '#8B5CF6', icon: '💻' },
  trading: { id: 'trading', name: '交易', color: '#059669', icon: '📊' }
};

@Injectable({
  providedIn: 'root'
})
export class GroupScorer {
  // 評分緩存
  private scoreCache: Map<string, GroupScore> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000;  // 30分鐘緩存
  
  // 統計
  private _totalScored = signal(0);
  totalScored = computed(() => this._totalScored());
  
  /**
   * 評估群組質量
   */
  scoreGroup(
    group: GroupBasicInfo | GroupDetailInfo,
    members?: MemberBasicInfo[]
  ): GroupScore {
    // 檢查緩存
    const cached = this.getFromCache(group.id);
    if (cached) return cached;
    
    // 計算各維度得分
    const scaleScore = this.scoreScale(group);
    const activityScore = this.scoreActivity(group);
    const qualityScore = this.scoreQuality(group, members);
    const engagementScore = this.scoreEngagement(group);
    const safetyScore = this.scoreSafety(group, members);
    
    // 計算總分
    const total = Math.round(
      scaleScore.weighted +
      activityScore.weighted +
      qualityScore.weighted +
      engagementScore.weighted +
      safetyScore.weighted
    );
    
    // 確定等級
    const grade = this.calculateGrade(total);
    
    // 生成標籤
    const tags = this.generateTags(group, {
      scale: scaleScore,
      activity: activityScore,
      quality: qualityScore,
      engagement: engagementScore,
      safety: safetyScore
    }, members);
    
    // 生成警告和亮點
    const warnings = this.generateWarnings(group, safetyScore, members);
    const highlights = this.generateHighlights(group, total, tags);
    
    const score: GroupScore = {
      total,
      grade,
      dimensions: {
        scale: scaleScore,
        activity: activityScore,
        quality: qualityScore,
        engagement: engagementScore,
        safety: safetyScore
      },
      tags,
      warnings,
      highlights,
      scoredAt: new Date()
    };
    
    // 緩存結果
    this.addToCache(group.id, score);
    this._totalScored.update(n => n + 1);
    
    return score;
  }
  
  /**
   * 批量評分
   */
  scoreGroups(
    groups: (GroupBasicInfo | GroupDetailInfo)[]
  ): Map<string, GroupScore> {
    const results = new Map<string, GroupScore>();
    
    for (const group of groups) {
      results.set(group.id, this.scoreGroup(group));
    }
    
    return results;
  }
  
  /**
   * 快速評分（簡化版）
   */
  quickScore(group: GroupBasicInfo): number {
    // 基於有限信息快速估算
    let score = 50;
    
    // 成員數評分
    if (group.membersCount > 50000) score += 15;
    else if (group.membersCount > 10000) score += 12;
    else if (group.membersCount > 1000) score += 8;
    else if (group.membersCount > 100) score += 4;
    
    // 有用戶名加分
    if (group.username) score += 10;
    
    // 有描述加分
    if (group.description && group.description.length > 50) score += 5;
    
    // 類型評分
    if (group.type === 'channel') score += 5;
    
    return Math.min(score, 100);
  }
  
  // ============ 維度評分 ============
  
  private scoreScale(group: GroupBasicInfo | GroupDetailInfo): DimensionScore {
    const { scale: config, weights } = SCORING_CONFIG;
    const members = group.membersCount || 0;
    const details: string[] = [];
    let score = 0;
    
    // 基礎規模分數 (0-70)
    if (members >= config.optimalSize) {
      // 超過最佳規模，開始遞減
      const excess = (members - config.optimalSize) / config.maxPenaltySize;
      score = 70 - Math.min(20, excess * 20);
      details.push(`規模 ${this.formatNumber(members)}（超大規模）`);
    } else if (members >= config.minSize) {
      // 線性增長到最佳規模
      score = 30 + (members / config.optimalSize) * 40;
      details.push(`規模 ${this.formatNumber(members)}`);
    } else {
      // 低於最小規模
      score = (members / config.minSize) * 30;
      details.push(`規模較小 (${members}人)`);
    }
    
    // 增長趨勢加分 (0-30)
    if ('stats' in group && group.stats) {
      const growth = group.stats.weeklyGrowth || 0;
      if (growth > 10) {
        score += 30;
        details.push(`快速增長 (+${growth.toFixed(1)}%/週)`);
      } else if (growth > 5) {
        score += 20;
        details.push(`穩定增長 (+${growth.toFixed(1)}%/週)`);
      } else if (growth > 0) {
        score += 10;
        details.push(`緩慢增長 (+${growth.toFixed(1)}%/週)`);
      } else if (growth < -5) {
        score -= 10;
        details.push(`成員流失 (${growth.toFixed(1)}%/週)`);
      }
    }
    
    score = Math.max(0, Math.min(100, score));
    
    return {
      score,
      weight: weights.scale,
      weighted: score * weights.scale,
      details
    };
  }
  
  private scoreActivity(group: GroupBasicInfo | GroupDetailInfo): DimensionScore {
    const { activity: config, weights } = SCORING_CONFIG;
    const details: string[] = [];
    let score = 50;  // 基礎分
    
    if ('stats' in group && group.stats) {
      const stats = group.stats;
      
      // 在線率評分 (0-35)
      if (stats.onlineCount && stats.membersCount) {
        const onlineRate = stats.onlineCount / stats.membersCount;
        if (onlineRate >= config.optimalOnlineRate) {
          score += 35;
          details.push(`在線率 ${(onlineRate * 100).toFixed(1)}%（優秀）`);
        } else {
          score += Math.round((onlineRate / config.optimalOnlineRate) * 35);
          details.push(`在線率 ${(onlineRate * 100).toFixed(1)}%`);
        }
      }
      
      // 日消息數評分 (0-35)
      if (stats.dailyMessages !== undefined) {
        if (stats.dailyMessages >= config.optimalDailyMessages) {
          score += 35;
          details.push(`日消息 ${stats.dailyMessages}+（非常活躍）`);
        } else {
          score += Math.round((stats.dailyMessages / config.optimalDailyMessages) * 35);
          details.push(`日消息 ${stats.dailyMessages}`);
        }
      }
      
      // 最近活動評分 (0-20)
      if (stats.lastActivity) {
        const daysSinceActivity = (Date.now() - new Date(stats.lastActivity).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceActivity < 1) {
          score += 20;
          details.push('今日活躍');
        } else if (daysSinceActivity < config.lastActivityDays) {
          score += 10;
          details.push(`${Math.floor(daysSinceActivity)}天前活躍`);
        } else {
          score -= 10;
          details.push(`超過${Math.floor(daysSinceActivity)}天無活動`);
        }
      }
      
      // 活躍率評分
      if (stats.activeRate !== undefined) {
        if (stats.activeRate > 20) {
          score += 10;
          details.push(`活躍率 ${stats.activeRate.toFixed(1)}%`);
        }
      }
    } else {
      details.push('活躍數據不足');
    }
    
    score = Math.max(0, Math.min(100, score));
    
    return {
      score,
      weight: weights.activity,
      weighted: score * weights.activity,
      details
    };
  }
  
  private scoreQuality(
    group: GroupBasicInfo | GroupDetailInfo,
    members?: MemberBasicInfo[]
  ): DimensionScore {
    const { quality: config, weights } = SCORING_CONFIG;
    const details: string[] = [];
    let score = 50;  // 基礎分
    
    if (members && members.length > 0) {
      // 真人率評分 (0-40)
      const realUsers = members.filter(m => !m.isBot);
      const realUserRate = realUsers.length / members.length;
      if (realUserRate >= config.minRealUserRate) {
        score += 40;
        details.push(`真人率 ${(realUserRate * 100).toFixed(1)}%（優秀）`);
      } else {
        score += Math.round((realUserRate / config.minRealUserRate) * 40);
        details.push(`真人率 ${(realUserRate * 100).toFixed(1)}%`);
      }
      
      // Premium 用戶率評分 (0-20)
      const premiumUsers = members.filter(m => m.isPremium);
      const premiumRate = premiumUsers.length / members.length;
      if (premiumRate >= config.optimalPremiumRate) {
        score += 20;
        details.push(`Premium用戶 ${(premiumRate * 100).toFixed(1)}%`);
      } else {
        score += Math.round((premiumRate / config.optimalPremiumRate) * 20);
      }
      
      // 有用戶名的用戶比例 (0-20)
      const usernameUsers = members.filter(m => m.username);
      const usernameRate = usernameUsers.length / members.length;
      if (usernameRate > 0.5) {
        score += 20;
        details.push(`${(usernameRate * 100).toFixed(0)}%用戶有用戶名`);
      } else {
        score += Math.round(usernameRate * 40);
      }
      
      // 認證用戶加分
      const verifiedUsers = members.filter(m => m.isVerified);
      if (verifiedUsers.length > 0) {
        score += 10;
        details.push(`有${verifiedUsers.length}名認證用戶`);
      }
    } else {
      // 沒有成員數據時基於群組信息評估
      if (group.username) {
        score += 15;
        details.push('公開群組（有用戶名）');
      }
      if (group.description && group.description.length > 100) {
        score += 10;
        details.push('詳細的群組介紹');
      }
      details.push('成員數據不足');
    }
    
    score = Math.max(0, Math.min(100, score));
    
    return {
      score,
      weight: weights.quality,
      weighted: score * weights.quality,
      details
    };
  }
  
  private scoreEngagement(group: GroupBasicInfo | GroupDetailInfo): DimensionScore {
    const { weights } = SCORING_CONFIG;
    const details: string[] = [];
    let score = 50;  // 基礎分
    
    if ('stats' in group && group.stats) {
      const stats = group.stats;
      
      // 互動相關指標
      // 這裡假設有更多數據可用
      if (stats.activeRate !== undefined && stats.activeRate > 15) {
        score += 25;
        details.push(`高互動率 (${stats.activeRate.toFixed(1)}%)`);
      } else if (stats.activeRate !== undefined && stats.activeRate > 5) {
        score += 15;
        details.push(`中等互動率 (${stats.activeRate.toFixed(1)}%)`);
      }
      
      // 消息密度
      if (stats.dailyMessages !== undefined && stats.membersCount) {
        const msgPerMember = stats.dailyMessages / stats.membersCount;
        if (msgPerMember > 0.05) {
          score += 25;
          details.push('消息密度高');
        } else if (msgPerMember > 0.01) {
          score += 15;
          details.push('消息密度適中');
        }
      }
    } else {
      details.push('互動數據不足');
    }
    
    score = Math.max(0, Math.min(100, score));
    
    return {
      score,
      weight: weights.engagement,
      weighted: score * weights.engagement,
      details
    };
  }
  
  private scoreSafety(
    group: GroupBasicInfo | GroupDetailInfo,
    members?: MemberBasicInfo[]
  ): DimensionScore {
    const { safety: config, weights } = SCORING_CONFIG;
    const details: string[] = [];
    let score = 80;  // 基礎分（預設安全）
    
    if (members && members.length > 0) {
      // 詐騙標記檢查
      const scamUsers = members.filter(m => m.isScam);
      const scamRate = scamUsers.length / members.length;
      if (scamRate > config.maxScamRate) {
        score -= 40;
        details.push(`⚠️ 發現詐騙標記用戶 (${scamUsers.length}人)`);
      }
      
      // 假冒標記檢查
      const fakeUsers = members.filter(m => m.isFake);
      const fakeRate = fakeUsers.length / members.length;
      if (fakeRate > config.maxFakeRate) {
        score -= 20;
        details.push(`⚠️ 發現假冒標記用戶 (${fakeUsers.length}人)`);
      }
      
      // 機器人比例檢查
      const bots = members.filter(m => m.isBot);
      const botRate = bots.length / members.length;
      if (botRate > config.maxBotRate) {
        score -= 15;
        details.push(`機器人較多 (${(botRate * 100).toFixed(1)}%)`);
      } else {
        details.push(`機器人比例正常 (${(botRate * 100).toFixed(1)}%)`);
      }
      
      // 無風險加分
      if (scamUsers.length === 0 && fakeUsers.length === 0) {
        score += 20;
        details.push('✓ 未發現風險用戶');
      }
    } else {
      // 基於群組基本信息評估
      if (group.accessType === 'public' && group.username) {
        score += 10;
        details.push('公開群組，相對透明');
      }
      details.push('安全數據不足');
    }
    
    score = Math.max(0, Math.min(100, score));
    
    return {
      score,
      weight: weights.safety,
      weighted: score * weights.safety,
      details
    };
  }
  
  // ============ 輔助方法 ============
  
  private calculateGrade(total: number): GroupScore['grade'] {
    if (total >= 90) return 'S';
    if (total >= 80) return 'A';
    if (total >= 70) return 'B';
    if (total >= 60) return 'C';
    if (total >= 50) return 'D';
    return 'F';
  }
  
  private generateTags(
    group: GroupBasicInfo | GroupDetailInfo,
    dimensions: GroupScore['dimensions'],
    members?: MemberBasicInfo[]
  ): GroupTag[] {
    const tags: GroupTag[] = [];
    
    // 規模標籤
    const memberCount = group.membersCount || 0;
    if (memberCount >= 100000) tags.push(GROUP_TAGS.massive);
    else if (memberCount >= 10000) tags.push(GROUP_TAGS.large);
    else if (memberCount >= 1000) tags.push(GROUP_TAGS.medium);
    else tags.push(GROUP_TAGS.small);
    
    // 活躍度標籤
    if (dimensions.activity.score >= 80) tags.push(GROUP_TAGS.veryActive);
    else if (dimensions.activity.score >= 60) tags.push(GROUP_TAGS.active);
    else if (dimensions.activity.score >= 40) tags.push(GROUP_TAGS.moderate);
    else tags.push(GROUP_TAGS.quiet);
    
    // 質量標籤
    if (dimensions.quality.score >= 80) tags.push(GROUP_TAGS.highQuality);
    
    // 增長標籤
    if ('stats' in group && group.stats?.weeklyGrowth !== undefined) {
      const growth = group.stats.weeklyGrowth;
      if (growth > 5) tags.push(GROUP_TAGS.fastGrowing);
      else if (growth >= -2) tags.push(GROUP_TAGS.stable);
      else tags.push(GROUP_TAGS.declining);
    }
    
    // 安全標籤
    if (dimensions.safety.score >= 80) tags.push(GROUP_TAGS.safe);
    else if (dimensions.safety.score >= 50) tags.push(GROUP_TAGS.caution);
    else tags.push(GROUP_TAGS.risky);
    
    // Premium 標籤
    if (members) {
      const premiumRate = members.filter(m => m.isPremium).length / members.length;
      if (premiumRate > 0.1) tags.push(GROUP_TAGS.premium);
    }
    
    // 語言標籤（基於名稱/描述檢測）
    const text = `${group.title} ${group.description || ''}`;
    if (/[\u4e00-\u9fff]/.test(text)) tags.push(GROUP_TAGS.chinese);
    else if (/[a-zA-Z]/.test(text)) tags.push(GROUP_TAGS.english);
    
    // 主題標籤
    const lowerText = text.toLowerCase();
    if (/crypto|幣|coin|btc|eth/i.test(lowerText)) tags.push(GROUP_TAGS.crypto);
    if (/tech|技術|開發|程序/i.test(lowerText)) tags.push(GROUP_TAGS.tech);
    if (/trade|交易|投資|股票/i.test(lowerText)) tags.push(GROUP_TAGS.trading);
    
    return tags;
  }
  
  private generateWarnings(
    group: GroupBasicInfo | GroupDetailInfo,
    safetyScore: DimensionScore,
    members?: MemberBasicInfo[]
  ): string[] {
    const warnings: string[] = [];
    
    // 安全警告
    if (safetyScore.score < 50) {
      warnings.push('⚠️ 該群組存在安全風險，請謹慎操作');
    }
    
    // 成員警告
    if (members) {
      const scamCount = members.filter(m => m.isScam).length;
      if (scamCount > 0) {
        warnings.push(`🚨 發現 ${scamCount} 名詐騙標記用戶`);
      }
      
      const botRate = members.filter(m => m.isBot).length / members.length;
      if (botRate > 0.2) {
        warnings.push(`🤖 機器人比例過高 (${(botRate * 100).toFixed(0)}%)`);
      }
    }
    
    // 規模警告
    if (group.membersCount && group.membersCount < 50) {
      warnings.push('📉 群組規模過小，價值有限');
    }
    
    // 增長警告
    if ('stats' in group && group.stats?.weeklyGrowth !== undefined) {
      if (group.stats.weeklyGrowth < -10) {
        warnings.push('📉 成員流失嚴重，群組可能衰退中');
      }
    }
    
    return warnings;
  }
  
  private generateHighlights(
    group: GroupBasicInfo | GroupDetailInfo,
    totalScore: number,
    tags: GroupTag[]
  ): string[] {
    const highlights: string[] = [];
    
    // 高分亮點
    if (totalScore >= 80) {
      highlights.push('🏆 優質群組，強烈推薦');
    } else if (totalScore >= 70) {
      highlights.push('⭐ 質量不錯，值得關注');
    }
    
    // 基於標籤的亮點
    if (tags.some(t => t.id === 'fastGrowing')) {
      highlights.push('📈 快速增長中，潛力巨大');
    }
    
    if (tags.some(t => t.id === 'veryActive')) {
      highlights.push('🔥 社群非常活躍');
    }
    
    if (tags.some(t => t.id === 'highQuality')) {
      highlights.push('💎 成員質量高');
    }
    
    if (tags.some(t => t.id === 'premium')) {
      highlights.push('✨ Premium 用戶比例高');
    }
    
    // 規模亮點
    if (group.membersCount && group.membersCount > 50000) {
      highlights.push(`👥 超大規模社群 (${this.formatNumber(group.membersCount)}人)`);
    }
    
    return highlights;
  }
  
  // ============ 緩存管理 ============
  
  private getFromCache(groupId: string): GroupScore | null {
    const cached = this.scoreCache.get(groupId);
    if (cached && Date.now() - cached.scoredAt.getTime() < this.CACHE_DURATION) {
      return cached;
    }
    this.scoreCache.delete(groupId);
    return null;
  }
  
  private addToCache(groupId: string, score: GroupScore): void {
    this.scoreCache.set(groupId, score);
    
    // 限制緩存大小
    if (this.scoreCache.size > 1000) {
      const oldest = [...this.scoreCache.entries()]
        .sort((a, b) => a[1].scoredAt.getTime() - b[1].scoredAt.getTime())[0];
      this.scoreCache.delete(oldest[0]);
    }
  }
  
  clearCache(): void {
    this.scoreCache.clear();
  }
  
  // ============ 工具方法 ============
  
  private formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  }
  
  /**
   * 獲取評分顏色
   */
  getGradeColor(grade: GroupScore['grade']): string {
    const colors: Record<GroupScore['grade'], string> = {
      'S': '#FFD700',  // 金色
      'A': '#22C55E',  // 綠色
      'B': '#3B82F6',  // 藍色
      'C': '#F59E0B',  // 橙色
      'D': '#EF4444',  // 紅色
      'F': '#6B7280'   // 灰色
    };
    return colors[grade];
  }
  
  /**
   * 獲取評分描述
   */
  getGradeDescription(grade: GroupScore['grade']): string {
    const descriptions: Record<GroupScore['grade'], string> = {
      'S': '頂級優質',
      'A': '優秀',
      'B': '良好',
      'C': '一般',
      'D': '較差',
      'F': '不推薦'
    };
    return descriptions[grade];
  }
}
