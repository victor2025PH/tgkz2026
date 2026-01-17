/**
 * TG-AI智控王 數據分析模塊
 * Analytics Module Export
 */

// 群組評分
export { GroupScorer, GroupScore, GroupTag, DimensionScore } from './group-scorer';

// 成員分析
export { 
  MemberAnalyzer, 
  MemberAnalysis, 
  MemberTag, 
  MemberSegment, 
  GroupMemberStats 
} from './member-analyzer';

// 推薦引擎
export { 
  RecommendationEngine, 
  Recommendation, 
  RecommendationSource, 
  UserProfile,
  TrendingGroup 
} from './recommendation-engine';

// 儀表板組件
export { AnalyticsDashboardComponent } from './analytics-dashboard.component';
