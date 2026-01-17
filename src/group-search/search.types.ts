/**
 * TG-AI智控王 群組搜索類型定義
 * Group Search Types v1.0
 */

// ============ 搜索源類型 ============

export type SearchSource = 
  | 'telegram'    // TG 官方搜索
  | 'jiso'        // 極搜 Bot（神馬搜索 @smss）
  | 'local';      // 本地索引庫

export type SearchSourceStatus = 'available' | 'unavailable' | 'limited' | 'checking';

export interface SearchSourceConfig {
  id: SearchSource;
  name: string;
  icon: string;
  enabled: boolean;
  status: SearchSourceStatus;
  rateLimit: number;      // 每分鐘請求限制
  lastCheck?: Date;
  description: string;
  requiredLevel: string;  // 所需會員等級
}

// ============ 群組類型 ============

export type GroupType = 'group' | 'supergroup' | 'channel';
export type GroupAccessType = 'public' | 'private';

export interface GroupBasicInfo {
  id: string;                    // 群組 ID
  accessHash?: string;           // 訪問哈希
  title: string;                 // 群組名稱
  username?: string;             // @用戶名
  type: GroupType;               // 類型
  accessType: GroupAccessType;   // 公開/私有
  photo?: GroupPhoto;            // 頭像
  membersCount: number;          // 成員數
  description?: string;          // 描述
  inviteLink?: string;           // 邀請鏈接
}

export interface GroupPhoto {
  smallUrl?: string;
  bigUrl?: string;
  localPath?: string;
}

export interface GroupStats {
  membersCount: number;
  onlineCount?: number;
  messagesCount?: number;
  dailyMessages?: number;
  weeklyGrowth?: number;
  monthlyGrowth?: number;
  activeRate?: number;           // 活躍率 (%)
  lastActivity?: Date;
}

export interface GroupDetailInfo extends GroupBasicInfo {
  stats: GroupStats;
  tags: string[];
  language?: string;
  createdAt?: Date;
  source: SearchSource;
  sourceUrl?: string;
  isFavorite?: boolean;
  lastUpdated: Date;
  
  // 額外信息
  admins?: MemberBasicInfo[];
  pinnedMessage?: string;
  rules?: string;
  relatedGroups?: GroupBasicInfo[];
}

// ============ 成員類型 ============

export type MemberStatus = 'online' | 'recently' | 'lastWeek' | 'lastMonth' | 'longAgo' | 'unknown';
export type MemberRole = 'creator' | 'admin' | 'member' | 'restricted' | 'banned';

export interface MemberBasicInfo {
  id: string;
  accessHash?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  photo?: {
    smallUrl?: string;
    bigUrl?: string;
  };
  status: MemberStatus;
  role: MemberRole;
  isBot: boolean;
  isPremium?: boolean;
  isVerified?: boolean;
  isScam?: boolean;
  isFake?: boolean;
  bio?: string;
  joinedDate?: Date;
}

export interface MemberDetailInfo extends MemberBasicInfo {
  commonGroupsCount?: number;
  commonGroups?: GroupBasicInfo[];
  lastSeen?: Date;
  restrictionReason?: string;
}

// ============ 搜索類型 ============

export interface SearchQuery {
  keyword: string;
  sources: SearchSource[];
  filters: SearchFilters;
  page: number;
  limit: number;
}

export interface SearchFilters {
  type?: GroupType[];
  language?: string[];
  minMembers?: number;
  maxMembers?: number;
  hasUsername?: boolean;
  isActive?: boolean;           // 近期有活動
  createdAfter?: Date;
  createdBefore?: Date;
  sortBy?: 'relevance' | 'members' | 'activity' | 'growth';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  query: SearchQuery;
  groups: GroupSearchItem[];
  totalCount: number;
  hasMore: boolean;
  sources: {
    source: SearchSource;
    count: number;
    status: 'success' | 'error' | 'timeout';
    error?: string;
  }[];
  searchTime: number;           // 搜索耗時 (ms)
  timestamp: Date;
}

export interface GroupSearchItem extends GroupBasicInfo {
  source: SearchSource;
  relevanceScore?: number;
  matchedKeywords?: string[];
  highlight?: {
    title?: string;
    description?: string;
  };
  // 標記群組是否需要驗證（無真實鏈接時為 true）
  needsVerification?: boolean;
}

// ============ 搜索歷史與收藏 ============

export interface SearchHistory {
  id: string;
  query: SearchQuery;
  resultsCount: number;
  timestamp: Date;
}

export interface FavoriteGroup {
  id: string;
  group: GroupBasicInfo;
  addedAt: Date;
  notes?: string;
  tags?: string[];
  folder?: string;
}

// ============ 成員提取 ============

export interface MemberExtractionRequest {
  groupId: string;
  filters?: MemberFilters;
  limit?: number;
  offset?: number;
}

export interface MemberFilters {
  status?: MemberStatus[];
  role?: MemberRole[];
  hasUsername?: boolean;
  hasPhoto?: boolean;
  isNotBot?: boolean;
  isPremium?: boolean;
  joinedAfter?: Date;
  joinedBefore?: Date;
}

export interface MemberExtractionResult {
  groupId: string;
  groupTitle: string;
  members: MemberBasicInfo[];
  totalCount: number;
  extractedCount: number;
  hasMore: boolean;
  timestamp: Date;
}

// ============ 導出類型 ============

export type ExportFormat = 'excel' | 'csv' | 'json' | 'txt';

export interface ExportConfig {
  format: ExportFormat;
  fields: (keyof MemberBasicInfo)[];
  includeHeaders: boolean;
  filename?: string;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  recordCount: number;
  error?: string;
}

// ============ 批量操作 ============

export type BatchOperationType = 'message' | 'invite' | 'tag';
export type BatchOperationStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface BatchOperation {
  id: string;
  type: BatchOperationType;
  targetMembers: MemberBasicInfo[];
  config: BatchOperationConfig;
  status: BatchOperationStatus;
  progress: {
    total: number;
    processed: number;
    success: number;
    failed: number;
  };
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface BatchOperationConfig {
  // 消息配置
  messageTemplate?: string;
  messageVariables?: Record<string, string>;
  
  // 邀請配置
  targetGroupId?: string;
  
  // 通用配置
  delayMin: number;           // 最小間隔（秒）
  delayMax: number;           // 最大間隔（秒）
  dailyLimit: number;         // 每日上限
  retryOnFail: boolean;
  smartAntiBlock: boolean;    // 智能防封
}

// ============ 緩存類型 ============

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
  source: SearchSource;
}

export interface SearchCache {
  key: string;
  query: SearchQuery;
  result: SearchResult;
  timestamp: Date;
  expiresAt: Date;
}
