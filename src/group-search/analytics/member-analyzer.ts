/**
 * TG-AI智控王 成員行為分析
 * Member Analyzer v1.0
 * 
 * 分析成員質量、行為模式和價值
 * 
 * 分析維度：
 * 1. 活躍度分析 - 在線狀態、活躍時段
 * 2. 質量評估 - Premium、認證、帳號年齡
 * 3. 互動潛力 - 是否可能回覆/互動
 * 4. 風險識別 - 機器人、詐騙、假冒
 */

import { Injectable, signal, computed } from '@angular/core';
import { MemberBasicInfo, MemberStatus, MemberRole } from '../search.types';

// ============ 配置 ============

const ANALYZER_CONFIG = {
  // 價值權重
  valueWeights: {
    activity: 0.25,
    quality: 0.30,
    engagement: 0.25,
    safety: 0.20
  },
  // 活躍度分數
  activityScores: {
    online: 100,
    recently: 80,
    lastWeek: 50,
    lastMonth: 20,
    longAgo: 5,
    unknown: 30
  } as Record<MemberStatus, number>,
  // 角色分數
  roleScores: {
    creator: 100,
    admin: 80,
    member: 50,
    restricted: 20,
    banned: 0
  } as Record<MemberRole, number>
};

// ============ 類型定義 ============

export interface MemberAnalysis {
  member: MemberBasicInfo;
  
  // 價值評分 (0-100)
  valueScore: number;
  
  // 等級 (S/A/B/C/D)
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  
  // 分項得分
  dimensions: {
    activity: number;
    quality: number;
    engagement: number;
    safety: number;
  };
  
  // 標籤
  tags: MemberTag[];
  
  // 風險標記
  risks: string[];
  
  // 互動建議
  suggestions: string[];
}

export interface MemberTag {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface MemberSegment {
  id: string;
  name: string;
  description: string;
  count: number;
  percentage: number;
  members: MemberBasicInfo[];
  color: string;
}

export interface GroupMemberStats {
  // 基本統計
  total: number;
  withUsername: number;
  withPhoto: number;
  
  // 狀態分布
  statusDistribution: Record<MemberStatus, number>;
  
  // 角色分布
  roleDistribution: Record<MemberRole, number>;
  
  // 質量指標
  botRate: number;
  premiumRate: number;
  verifiedCount: number;
  
  // 風險指標
  scamCount: number;
  fakeCount: number;
  
  // 價值分布
  valueDistribution: {
    high: number;    // 80-100
    medium: number;  // 50-79
    low: number;     // 0-49
  };
  
  // 細分群體
  segments: MemberSegment[];
}

// ============ 預定義標籤 ============

const MEMBER_TAGS: Record<string, MemberTag> = {
  // 活躍度
  veryActive: { id: 'veryActive', name: '非常活躍', color: '#10B981', icon: '🔥' },
  active: { id: 'active', name: '活躍', color: '#34D399', icon: '✨' },
  inactive: { id: 'inactive', name: '不活躍', color: '#9CA3AF', icon: '💤' },
  
  // 質量
  premium: { id: 'premium', name: 'Premium', color: '#F59E0B', icon: '⭐' },
  verified: { id: 'verified', name: '已認證', color: '#06B6D4', icon: '✓' },
  hasUsername: { id: 'hasUsername', name: '有用戶名', color: '#3B82F6', icon: '@' },
  
  // 角色
  admin: { id: 'admin', name: '管理員', color: '#8B5CF6', icon: '👑' },
  creator: { id: 'creator', name: '創建者', color: '#EC4899', icon: '🌟' },
  
  // 風險
  bot: { id: 'bot', name: '機器人', color: '#64748B', icon: '🤖' },
  suspicious: { id: 'suspicious', name: '可疑', color: '#F59E0B', icon: '⚠️' },
  dangerous: { id: 'dangerous', name: '危險', color: '#EF4444', icon: '🚨' },
  
  // 互動潛力
  highPotential: { id: 'highPotential', name: '高潛力', color: '#22C55E', icon: '💎' },
  reachable: { id: 'reachable', name: '可觸達', color: '#3B82F6', icon: '📬' }
};

@Injectable({
  providedIn: 'root'
})
export class MemberAnalyzer {
  // 分析緩存
  private analysisCache: Map<string, MemberAnalysis> = new Map();
  
  // 統計
  private _totalAnalyzed = signal(0);
  totalAnalyzed = computed(() => this._totalAnalyzed());
  
  /**
   * 分析單個成員
   */
  analyzeMember(member: MemberBasicInfo): MemberAnalysis {
    // 檢查緩存
    const cached = this.analysisCache.get(member.id);
    if (cached) return cached;
    
    // 計算各維度得分
    const activityScore = this.calculateActivityScore(member);
    const qualityScore = this.calculateQualityScore(member);
    const engagementScore = this.calculateEngagementScore(member);
    const safetyScore = this.calculateSafetyScore(member);
    
    // 計算總價值分數
    const valueScore = Math.round(
      activityScore * ANALYZER_CONFIG.valueWeights.activity +
      qualityScore * ANALYZER_CONFIG.valueWeights.quality +
      engagementScore * ANALYZER_CONFIG.valueWeights.engagement +
      safetyScore * ANALYZER_CONFIG.valueWeights.safety
    );
    
    // 確定等級
    const grade = this.calculateGrade(valueScore);
    
    // 生成標籤
    const tags = this.generateTags(member, {
      activity: activityScore,
      quality: qualityScore,
      engagement: engagementScore,
      safety: safetyScore
    });
    
    // 識別風險
    const risks = this.identifyRisks(member, safetyScore);
    
    // 生成建議
    const suggestions = this.generateSuggestions(member, valueScore, tags);
    
    const analysis: MemberAnalysis = {
      member,
      valueScore,
      grade,
      dimensions: {
        activity: activityScore,
        quality: qualityScore,
        engagement: engagementScore,
        safety: safetyScore
      },
      tags,
      risks,
      suggestions
    };
    
    // 緩存
    this.analysisCache.set(member.id, analysis);
    this._totalAnalyzed.update(n => n + 1);
    
    return analysis;
  }
  
  /**
   * 批量分析成員
   */
  analyzeMembers(members: MemberBasicInfo[]): MemberAnalysis[] {
    return members.map(m => this.analyzeMember(m));
  }
  
  /**
   * 分析群組成員統計
   */
  analyzeGroupMembers(members: MemberBasicInfo[]): GroupMemberStats {
    const total = members.length;
    
    // 基本統計
    const withUsername = members.filter(m => m.username).length;
    const withPhoto = members.filter(m => m.photo).length;
    
    // 狀態分布
    const statusDistribution: Record<MemberStatus, number> = {
      online: 0,
      recently: 0,
      lastWeek: 0,
      lastMonth: 0,
      longAgo: 0,
      unknown: 0
    };
    members.forEach(m => {
      statusDistribution[m.status]++;
    });
    
    // 角色分布
    const roleDistribution: Record<MemberRole, number> = {
      creator: 0,
      admin: 0,
      member: 0,
      restricted: 0,
      banned: 0
    };
    members.forEach(m => {
      roleDistribution[m.role]++;
    });
    
    // 質量指標
    const bots = members.filter(m => m.isBot);
    const premiumUsers = members.filter(m => m.isPremium);
    const verifiedUsers = members.filter(m => m.isVerified);
    const scamUsers = members.filter(m => m.isScam);
    const fakeUsers = members.filter(m => m.isFake);
    
    // 價值分布
    const analyses = this.analyzeMembers(members);
    const valueDistribution = {
      high: analyses.filter(a => a.valueScore >= 80).length,
      medium: analyses.filter(a => a.valueScore >= 50 && a.valueScore < 80).length,
      low: analyses.filter(a => a.valueScore < 50).length
    };
    
    // 細分群體
    const segments = this.createSegments(members, analyses);
    
    return {
      total,
      withUsername,
      withPhoto,
      statusDistribution,
      roleDistribution,
      botRate: bots.length / total,
      premiumRate: premiumUsers.length / total,
      verifiedCount: verifiedUsers.length,
      scamCount: scamUsers.length,
      fakeCount: fakeUsers.length,
      valueDistribution,
      segments
    };
  }
  
  /**
   * 篩選高價值成員
   */
  filterHighValueMembers(
    members: MemberBasicInfo[],
    minScore: number = 70
  ): MemberBasicInfo[] {
    return members.filter(m => {
      const analysis = this.analyzeMember(m);
      return analysis.valueScore >= minScore;
    });
  }
  
  /**
   * 篩選可觸達成員
   */
  filterReachableMembers(members: MemberBasicInfo[]): MemberBasicInfo[] {
    return members.filter(m => 
      !m.isBot &&
      !m.isScam &&
      !m.isFake &&
      m.username &&
      ['online', 'recently', 'lastWeek'].includes(m.status)
    );
  }
  
  /**
   * 按價值排序成員
   */
  sortByValue(members: MemberBasicInfo[], descending: boolean = true): MemberBasicInfo[] {
    const sorted = [...members].sort((a, b) => {
      const scoreA = this.analyzeMember(a).valueScore;
      const scoreB = this.analyzeMember(b).valueScore;
      return descending ? scoreB - scoreA : scoreA - scoreB;
    });
    return sorted;
  }
  
  // ============ 評分計算 ============
  
  private calculateActivityScore(member: MemberBasicInfo): number {
    let score = ANALYZER_CONFIG.activityScores[member.status] || 30;
    
    // 角色加分
    if (member.role === 'admin' || member.role === 'creator') {
      score = Math.min(100, score + 20);
    }
    
    return score;
  }
  
  private calculateQualityScore(member: MemberBasicInfo): number {
    let score = 50;  // 基礎分
    
    // Premium 用戶
    if (member.isPremium) {
      score += 25;
    }
    
    // 已認證
    if (member.isVerified) {
      score += 20;
    }
    
    // 有用戶名
    if (member.username) {
      score += 15;
    }
    
    // 有頭像
    if (member.photo) {
      score += 10;
    }
    
    // 有簡介
    if (member.bio) {
      score += 10;
    }
    
    // 機器人扣分
    if (member.isBot) {
      score -= 30;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  private calculateEngagementScore(member: MemberBasicInfo): number {
    let score = 50;  // 基礎分
    
    // 活躍狀態加分
    if (member.status === 'online') {
      score += 30;
    } else if (member.status === 'recently') {
      score += 20;
    } else if (member.status === 'lastWeek') {
      score += 10;
    }
    
    // 有用戶名（可被私信）
    if (member.username) {
      score += 15;
    }
    
    // 非機器人
    if (!member.isBot) {
      score += 10;
    }
    
    // Premium 用戶更可能互動
    if (member.isPremium) {
      score += 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  private calculateSafetyScore(member: MemberBasicInfo): number {
    let score = 100;  // 基礎分（預設安全）
    
    // 詐騙標記
    if (member.isScam) {
      score -= 80;
    }
    
    // 假冒標記
    if (member.isFake) {
      score -= 60;
    }
    
    // 機器人（輕微扣分）
    if (member.isBot) {
      score -= 20;
    }
    
    // 受限用戶
    if (member.role === 'restricted') {
      score -= 30;
    }
    
    // 被封禁
    if (member.role === 'banned') {
      score -= 50;
    }
    
    // 沒有用戶名（可能是新帳號或假帳號）
    if (!member.username) {
      score -= 10;
    }
    
    return Math.max(0, score);
  }
  
  private calculateGrade(score: number): MemberAnalysis['grade'] {
    if (score >= 80) return 'S';
    if (score >= 65) return 'A';
    if (score >= 50) return 'B';
    if (score >= 35) return 'C';
    return 'D';
  }
  
  // ============ 標籤生成 ============
  
  private generateTags(
    member: MemberBasicInfo,
    scores: MemberAnalysis['dimensions']
  ): MemberTag[] {
    const tags: MemberTag[] = [];
    
    // 活躍度標籤
    if (member.status === 'online' || scores.activity >= 80) {
      tags.push(MEMBER_TAGS.veryActive);
    } else if (member.status === 'recently' || scores.activity >= 60) {
      tags.push(MEMBER_TAGS.active);
    } else if (scores.activity < 30) {
      tags.push(MEMBER_TAGS.inactive);
    }
    
    // 質量標籤
    if (member.isPremium) {
      tags.push(MEMBER_TAGS.premium);
    }
    if (member.isVerified) {
      tags.push(MEMBER_TAGS.verified);
    }
    if (member.username) {
      tags.push(MEMBER_TAGS.hasUsername);
    }
    
    // 角色標籤
    if (member.role === 'creator') {
      tags.push(MEMBER_TAGS.creator);
    } else if (member.role === 'admin') {
      tags.push(MEMBER_TAGS.admin);
    }
    
    // 風險標籤
    if (member.isBot) {
      tags.push(MEMBER_TAGS.bot);
    }
    if (member.isScam || member.isFake) {
      tags.push(MEMBER_TAGS.dangerous);
    } else if (scores.safety < 60) {
      tags.push(MEMBER_TAGS.suspicious);
    }
    
    // 潛力標籤
    if (scores.engagement >= 80 && scores.safety >= 70) {
      tags.push(MEMBER_TAGS.highPotential);
    }
    if (member.username && !member.isBot && scores.safety >= 70) {
      tags.push(MEMBER_TAGS.reachable);
    }
    
    return tags;
  }
  
  // ============ 風險識別 ============
  
  private identifyRisks(member: MemberBasicInfo, safetyScore: number): string[] {
    const risks: string[] = [];
    
    if (member.isScam) {
      risks.push('🚨 被標記為詐騙用戶');
    }
    
    if (member.isFake) {
      risks.push('⚠️ 被標記為假冒帳號');
    }
    
    if (member.isBot) {
      risks.push('🤖 這是一個機器人');
    }
    
    if (member.role === 'banned') {
      risks.push('🚫 已被封禁');
    }
    
    if (member.role === 'restricted') {
      risks.push('⛔ 權限受限');
    }
    
    if (!member.username && member.status === 'longAgo') {
      risks.push('❓ 可能是無效帳號');
    }
    
    return risks;
  }
  
  // ============ 建議生成 ============
  
  private generateSuggestions(
    member: MemberBasicInfo,
    valueScore: number,
    tags: MemberTag[]
  ): string[] {
    const suggestions: string[] = [];
    
    // 高價值用戶建議
    if (valueScore >= 80) {
      suggestions.push('💎 優質用戶，優先觸達');
      if (member.isPremium) {
        suggestions.push('⭐ Premium用戶，可能對付費服務有興趣');
      }
    }
    
    // 活躍用戶建議
    if (tags.some(t => t.id === 'veryActive' || t.id === 'active')) {
      suggestions.push('🔥 活躍用戶，回覆率較高');
    }
    
    // 可觸達建議
    if (tags.some(t => t.id === 'reachable')) {
      suggestions.push('📬 可直接發送私信');
    } else if (!member.username) {
      suggestions.push('❌ 沒有用戶名，無法直接私信');
    }
    
    // 管理員建議
    if (member.role === 'admin' || member.role === 'creator') {
      suggestions.push('👑 群組管理者，可建立合作關係');
    }
    
    // 風險建議
    if (tags.some(t => t.id === 'dangerous' || t.id === 'suspicious')) {
      suggestions.push('⚠️ 存在風險，謹慎操作');
    }
    
    // 機器人建議
    if (member.isBot) {
      suggestions.push('🤖 機器人，跳過不處理');
    }
    
    return suggestions;
  }
  
  // ============ 細分群體 ============
  
  private createSegments(
    members: MemberBasicInfo[],
    analyses: MemberAnalysis[]
  ): MemberSegment[] {
    const total = members.length;
    const segments: MemberSegment[] = [];
    
    // 1. 高價值活躍用戶
    const highValueActive = members.filter((m, i) => 
      analyses[i].valueScore >= 70 &&
      ['online', 'recently'].includes(m.status)
    );
    if (highValueActive.length > 0) {
      segments.push({
        id: 'highValueActive',
        name: '🌟 高價值活躍',
        description: '高質量且近期活躍的用戶',
        count: highValueActive.length,
        percentage: highValueActive.length / total * 100,
        members: highValueActive,
        color: '#22C55E'
      });
    }
    
    // 2. Premium 用戶
    const premiumUsers = members.filter(m => m.isPremium);
    if (premiumUsers.length > 0) {
      segments.push({
        id: 'premium',
        name: '⭐ Premium用戶',
        description: 'Telegram Premium 訂閱用戶',
        count: premiumUsers.length,
        percentage: premiumUsers.length / total * 100,
        members: premiumUsers,
        color: '#F59E0B'
      });
    }
    
    // 3. 可觸達用戶
    const reachable = members.filter(m => 
      m.username &&
      !m.isBot &&
      !m.isScam &&
      !m.isFake
    );
    segments.push({
      id: 'reachable',
      name: '📬 可觸達',
      description: '有用戶名且安全的用戶',
      count: reachable.length,
      percentage: reachable.length / total * 100,
      members: reachable,
      color: '#3B82F6'
    });
    
    // 4. 管理層
    const admins = members.filter(m => 
      m.role === 'admin' || m.role === 'creator'
    );
    if (admins.length > 0) {
      segments.push({
        id: 'admins',
        name: '👑 管理層',
        description: '群組管理員和創建者',
        count: admins.length,
        percentage: admins.length / total * 100,
        members: admins,
        color: '#8B5CF6'
      });
    }
    
    // 5. 機器人
    const bots = members.filter(m => m.isBot);
    if (bots.length > 0) {
      segments.push({
        id: 'bots',
        name: '🤖 機器人',
        description: '自動化帳號',
        count: bots.length,
        percentage: bots.length / total * 100,
        members: bots,
        color: '#64748B'
      });
    }
    
    // 6. 不活躍用戶
    const inactive = members.filter(m => 
      ['lastMonth', 'longAgo'].includes(m.status)
    );
    if (inactive.length > 0) {
      segments.push({
        id: 'inactive',
        name: '💤 不活躍',
        description: '超過一週未上線的用戶',
        count: inactive.length,
        percentage: inactive.length / total * 100,
        members: inactive,
        color: '#9CA3AF'
      });
    }
    
    // 7. 風險用戶
    const risky = members.filter(m => m.isScam || m.isFake);
    if (risky.length > 0) {
      segments.push({
        id: 'risky',
        name: '🚨 風險用戶',
        description: '被標記為詐騙或假冒的用戶',
        count: risky.length,
        percentage: risky.length / total * 100,
        members: risky,
        color: '#EF4444'
      });
    }
    
    return segments.sort((a, b) => b.count - a.count);
  }
  
  // ============ 工具方法 ============
  
  /**
   * 獲取價值分數顏色
   */
  getValueColor(score: number): string {
    if (score >= 80) return '#22C55E';  // 綠色
    if (score >= 60) return '#3B82F6';  // 藍色
    if (score >= 40) return '#F59E0B';  // 橙色
    return '#EF4444';  // 紅色
  }
  
  /**
   * 獲取等級顏色
   */
  getGradeColor(grade: MemberAnalysis['grade']): string {
    const colors: Record<MemberAnalysis['grade'], string> = {
      'S': '#FFD700',
      'A': '#22C55E',
      'B': '#3B82F6',
      'C': '#F59E0B',
      'D': '#EF4444'
    };
    return colors[grade];
  }
  
  /**
   * 清除緩存
   */
  clearCache(): void {
    this.analysisCache.clear();
  }
}
