/**
 * TG-AI智控王 潛在客戶培育系統
 * Lead Nurturing System - Module Exports
 */

// 數據模型
export * from './lead.models';

// Phase 1 核心服務
export { LeadService } from './lead.service';
export { FollowUpSchedulerService } from './follow-up-scheduler.service';
export { NurturingEngineService } from './nurturing-engine.service';
export { NotificationCenterService } from './notification-center.service';

// Phase 2 智能調度服務
export { OnlineStatusMonitorService, type OnlineStatusChangeEvent, type UserActivityPattern } from './online-status-monitor.service';
export { OptimalTimingService, type TimingRecommendation, type TimingScore } from './optimal-timing.service';
export { FatigueControllerService, type FatigueStatus, type ContactDecision } from './fatigue-controller.service';
export { ConversationStrategyService, type ConversationStrategy, type ConversationState } from './conversation-strategy.service';

// Phase 3 AI增強服務
export { AIProviderService, type AIProviderConfig, type AIGenerateRequest, type AIGenerateResponse } from './ai-provider.service';
export { SentimentAnalyzerService, type SentimentResult, type EmotionTrend, type IntentType } from './sentiment-analyzer.service';
export { DynamicTopicGeneratorService, type Topic, type TopicRecommendation, type Opener } from './dynamic-topic-generator.service';
export { AIConversationManagerService, type ConversationContext, type ReplyGenerationResult, type SystemPromptConfig } from './ai-conversation-manager.service';

// 協調器
export { NurturingOrchestratorService, type NurturingTask, type OrchestratorStatus } from './nurturing-orchestrator.service';

// Phase 4 分析與報表服務
export { AnalyticsDataService, type TimeRange, type AnalyticsSnapshot, type TrendData } from './analytics-data.service';
export { FunnelAnalyticsService, type FunnelData, type FunnelStageData, type BottleneckAnalysis, type FunnelPrediction } from './funnel-analytics.service';
export { AIPerformanceService, type AIEffectSummary, type AIPerformanceReport, type TopicEffectiveness } from './ai-performance.service';
export { ReportGeneratorService, type ComprehensiveReport, type ReportConfig, type ExportFormat } from './report-generator.service';

// UI 組件
export { LeadManagementComponent } from './lead-management.component';
export { AnalyticsDashboardComponent } from './analytics-dashboard.component';
