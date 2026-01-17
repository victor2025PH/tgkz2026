
export type AccountStatus = 'Online' | 'Offline' | 'Banned' | 'Logging in...' | 'Waiting Code' | 'Waiting 2FA' | 'Error' | 'Resting (Cooldown)' | 'Warming Up' | 'Proxy Error';
export type AccountRole = 'Listener' | 'Sender' | 'Unassigned';

export interface TelegramAccount {
  id: number;
  phone: string;
  proxy: string;
  status: AccountStatus;
  role: AccountRole;
  apiId?: string;
  apiHash?: string;
  dailySendCount: number;
  dailySendLimit: number;
  healthScore: number; 
  group?: string; 
  twoFactorPassword?: string;
  selected?: boolean; // For bulk actions UI
  
  // Phase 2: IP Binding Fields
  ipBindingId?: string;
  ipBoundAt?: string;
  ipLastVerifiedAt?: string;
  ipFailCount?: number;
  ipIsSticky?: boolean;  // 是否啟用 IP 粘性
  proxyCountry?: string;
  proxyType?: string;  // residential, datacenter, mobile
  
  // Phase 2: Device Fingerprint Fields
  deviceModel?: string;
  systemVersion?: string;
  appVersion?: string;
  platform?: string;  // ios, android, desktop
  fingerprintHash?: string;
  fingerprintGeneratedAt?: string;
  
  // Phase 2: API Credentials Fields
  apiCredentialsType?: 'public' | 'native';  // 公共API/原生API
  nativeApiId?: string;
  nativeApiHash?: string;
  apiCredentialsObtainedAt?: string;
  
  // Phase 2: AI Configuration Fields
  aiConfigType?: 'global' | 'independent';  // 統一配置/獨立配置
  aiConfigJson?: string;
}

export interface KeywordConfig {
  id: number;
  keyword: string;
  isRegex: boolean;
}

export interface KeywordSet {
    id: number;
    name: string;
    keywords: KeywordConfig[];
}

export interface MonitoredGroup {
    id: number;
    url: string;
    name: string;
    keywordSetIds: number[];
}

export type LeadStatus = 'New' | 'Contacted' | 'Replied' | 'Follow-up' | 'Closed-Won' | 'Closed-Lost';

export interface Interaction {
  id: number;
  timestamp: Date;
  type: 'Captured' | 'Status Change' | 'Message Sent' | 'Note Added';
  content: string;
}

export type OnlineStatus = 'Online' | 'Offline' | 'Recently' | 'Unknown';

export interface CapturedLead {
  id: number;
  userId: string;
  username: string;
  firstName?: string; 
  lastName?: string;  
  sourceGroup: string;
  triggeredKeyword: string;
  timestamp: Date;
  status: LeadStatus;
  onlineStatus: OnlineStatus; 
  assignedTemplateId?: number;
  interactionHistory: Interaction[];
  doNotContact: boolean;
  campaignId?: number;
}

export interface LogEntry {
  id: number;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface QueueStatus {
  phone: string;
  pending: number;
  processing: number;
  retrying: number;
  failed: number;
  total: number;
  paused?: boolean;
  stats: {
    total: number;
    completed: number;
    failed: number;
    retries: number;
    avg_time: number;
  };
}

export interface QueueMessage {
  id: string;
  phone: string;
  user_id: string;
  text: string;
  attachment?: string;
  priority: 'HIGH' | 'NORMAL' | 'LOW';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  created_at: string;
  scheduled_at?: string;
  attempts: number;
  max_attempts: number;
  last_error?: string;
}

export interface Alert {
  id: number;
  alert_type: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  acknowledged: boolean;
  acknowledged_at?: string;
  resolved: boolean;
  resolved_at?: string;
}

export interface Attachment {
    name: string;
    type: 'image' | 'file';
    dataUrl: string; // base64 encoded
}

export interface GenerationState {
    status: 'idle' | 'loading' | 'success' | 'error';
    lead: CapturedLead | null;
    generatedMessage: string;
    error: string | null;
    customPrompt: string;
    attachment: Attachment | null;
}

export interface MessageTemplate {
  id: number;
  name: string;
  prompt: string;
  isActive: boolean;
}

// --- Stage 2: Automation Campaigns ---

export interface CampaignTrigger {
    sourceGroupIds: number[];
    keywordSetIds: number[];
}

export interface CampaignAction {
    type: 'sendMessage';
    templateId: number;
    minDelaySeconds: number;
    maxDelaySeconds: number;
}

export interface AutomationCampaign {
    id: number;
    name: string;
    isActive: boolean;
    trigger: CampaignTrigger;
    actions: CampaignAction[]; // For now, will contain only one action
}

// Performance Monitoring Interfaces
export interface PerformanceMetric {
  timestamp: string;
  cpu_percent: number;
  memory_percent: number;
  memory_mb?: number;
  disk_usage_percent: number;
  active_connections: number;
  queue_length: number;
  avg_query_time_ms: number;
  avg_send_delay_ms: number;
}

export interface PerformanceSummary {
  status: string;
  collection_period: {
    start: string;
    end: string;
    duration_seconds: number;
  };
  cpu: {
    current: number;
    average: number;
    max: number;
    min: number;
  };
  memory: {
    current_percent: number;
    average_percent: number;
    max_percent: number;
    min_percent: number;
  };
  query_performance: {
    average_time_ms: number;
    max_time_ms: number;
    min_time_ms: number;
    sample_count: number;
  };
  send_performance: {
    average_delay_ms: number;
    max_delay_ms: number;
    min_delay_ms: number;
    sample_count: number;
  };
  connections: {
    active: number;
    total_registered: number;
  };
  queue: {
    current_length: number;
    average_length: number;
    max_length: number;
  };
}

export interface PerformanceAlert {
  timestamp: string;
  alerts: string[];
  metrics: PerformanceMetric;
}

// Batch Operations Interfaces
export interface Tag {
  id: number;
  name: string;
  color: string;
  usageCount?: number;
}

export interface BatchOperationRecord {
  id: string;
  operationType: string;
  targetType: string;
  itemCount: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  createdBy: string;
  isReversible: boolean;
  reversed: boolean;
  reversedAt?: string;
}

// Ad System Interfaces (廣告發送系統)
export type MediaType = 'text' | 'photo' | 'video' | 'document' | 'animation';
export type SendMode = 'scheduled' | 'triggered' | 'relay' | 'interval';
export type ScheduleType = 'once' | 'daily' | 'interval' | 'cron';
export type AccountStrategy = 'single' | 'rotate' | 'relay' | 'random';

export interface AdTemplate {
  id: number;
  name: string;
  content: string;
  mediaType: MediaType;
  mediaFileId?: string;
  mediaPath?: string;
  isActive: boolean;
  useCount: number;
  successCount: number;
  failCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdSchedule {
  id: number;
  templateId: number;
  name: string;
  targetGroups: string[];
  sendMode: SendMode;
  scheduleType: ScheduleType;
  scheduleTime?: string;
  intervalMinutes: number;
  triggerKeywords: string[];
  accountStrategy: AccountStrategy;
  assignedAccounts: string[];
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  runCount: number;
  successCount: number;
  failCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdSendLog {
  id: number;
  templateId: number;
  scheduleId?: number;
  accountPhone: string;
  targetGroupId: string;
  targetGroupTitle: string;
  messageId?: number;
  variantContent: string;
  status: 'sent' | 'failed' | 'deleted' | 'banned';
  errorMessage?: string;
  sentAt: string;
}

export interface AdOverviewStats {
  totalSends: number;
  successfulSends: number;
  failedSends: number;
  bannedSends: number;
  deletedSends: number;
  successRate: number;
  todaySends: number;
  todaySuccess: number;
  activeTemplates: number;
  activeSchedules: number;
  groupsReached: number;
}

// User Tracking Interfaces (用戶追蹤系統)
export type UserValueLevel = 'low' | 'medium' | 'high' | 'vip';
export type TrackingStatus = 'pending' | 'tracking' | 'completed' | 'failed';

export interface TrackedUser {
  id: number;
  userId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  valueLevel: UserValueLevel;
  trackingStatus: TrackingStatus;
  groupsCount: number;
  highValueGroups: number;
  lastTrackedAt?: string;
  source: string;
  sourceGroupId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserGroup {
  id: number;
  userId: string;
  groupId: string;
  groupTitle: string;
  groupUsername?: string;
  memberCount: number;
  isHighValue: boolean;
  valueScore: number;
  discoveredAt: string;
}

export interface TrackingStats {
  totalUsers: number;
  byValueLevel: {
    vip: number;
    high: number;
    medium: number;
    low: number;
  };
  byStatus: {
    pending: number;
    tracking: number;
    completed: number;
    failed: number;
  };
  totalGroupsDiscovered: number;
  highValueGroups: number;
  todayTracked: number;
}

// Campaign Interfaces (營銷活動協調器)
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
export type CampaignPhase = 'discovery' | 'monitoring' | 'outreach' | 'tracking' | 'conversion';

export interface CampaignStep {
  id: string;
  phase: CampaignPhase;
  actionType: string;
  config: Record<string, any>;
  order: number;
  isCompleted: boolean;
  completedAt?: string;
  result?: Record<string, any>;
  error?: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  status: CampaignStatus;
  phases: CampaignPhase[];
  steps: CampaignStep[];
  targetGroups: string[];
  assignedAccounts: string[];
  keywords: string[];
  adTemplateId?: number;
  settings: Record<string, any>;
  stats: {
    groupsDiscovered: number;
    leadsGenerated: number;
    adsSent: number;
    usersTracked: number;
    conversions: number;
  };
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface UnifiedOverview {
  period: string;
  totals: {
    resourcesDiscovered: number;
    leadsGenerated: number;
    adsSent: number;
    usersTracked: number;
    highValueGroups: number;
    activeCampaigns: number;
  };
  discovery: Record<string, any>;
  monitoring: Record<string, any>;
  ads: Record<string, any>;
  tracking: Record<string, any>;
  leads: Record<string, any>;
  campaigns: Record<string, any>;
}

// Multi-Role Interfaces (多角色協作)
export type RoleType = 'seller' | 'expert' | 'satisfied' | 'hesitant' | 'converted' | 'curious' | 'manager' | 'support';
export type SpeakingStyle = 'professional' | 'friendly' | 'casual' | 'enthusiastic' | 'careful' | 'curious';
export type ResponseSpeed = 'fast' | 'medium' | 'slow' | 'random';
export type EmojiFrequency = 'none' | 'low' | 'medium' | 'high';

export interface MultiRoleConfig {
  id: number;
  accountPhone: string;
  roleType: RoleType;
  roleName: string;
  icon: string;
  personality: Record<string, boolean>;
  speakingStyle: SpeakingStyle;
  emojiFrequency: EmojiFrequency;
  responseSpeed: ResponseSpeed;
  customPrompt?: string;
  bio?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleTemplate {
  roleType: RoleType;
  icon: string;
  displayName: string;
  defaultStyle: SpeakingStyle;
  defaultEmoji: EmojiFrequency;
  defaultSpeed: ResponseSpeed;
}

export interface ScriptStage {
  id: string;
  name: string;
  order: number;
  requiredRoles: string[];
  triggerType: string;
  triggerConfig: Record<string, any>;
  messages: Array<{role: string; template: string}>;
  durationSeconds: number;
  successConditions: Record<string, any>;
}

export interface ScriptTemplate {
  id: number;
  name: string;
  description: string;
  scenario: string;
  stages: ScriptStage[];
  requiredRoles: string[];
  minRoles: number;
  durationMinutes: number;
  successRate: number;
  useCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CollabGroup {
  id: number;
  groupId: string;
  groupTitle: string;
  createdByPhone: string;
  purpose: string;
  status: string;
  targetUserId?: string;
  targetUsername?: string;
  memberCount: number;
  createdAt: string;
  completedAt?: string;
  outcome?: string;
}
