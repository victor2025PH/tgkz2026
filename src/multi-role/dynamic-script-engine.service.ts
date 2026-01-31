/**
 * AI 動態劇本引擎服務
 * Dynamic Script Engine Service
 * 
 * 核心功能：
 * 1. 一句話意圖理解
 * 2. 實時對話分析（每N條消息）
 * 3. 動態策略生成和調整
 * 4. 多角色自然配合調度
 * 5. 話題生成（新聞/生活/產品）
 */

import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { MultiRoleService } from './multi-role.service';
import { AccountManagementService } from '../services/account-management.service';
import { TelegramAccount } from '../models';

// ============ 類型定義 ============

// 執行模式
// 🔧 P0-1: 添加 'private' 模式，明確區分私聊和群聊
export type ExecutionMode = 'scripted' | 'scriptless' | 'hybrid' | 'private';

// 🔧 P0-1: 聊天場景類型
export type ChatScenario = 'private_chat' | 'group_chat';

// 🔧 P0-1: 判斷是否為私聊模式（無群組，1對1）
export function isPrivateChatMode(mode: ExecutionMode): boolean {
  return mode === 'private' || mode === 'scriptless' || mode === 'hybrid';
}

// 🔧 P0-1: 私聊模式下只使用單一角色
export const PRIVATE_CHAT_MAX_ROLES = 1;

// 帳號匹配結果
export interface AccountRoleMatch {
  accountId: number;
  accountPhone: string;
  accountName: string;
  roleId: string;
  roleName: string;
  roleIcon: string;
  matchScore: number;           // 匹配度 0-100
  matchReasons: string[];       // 匹配原因
  accountFeatures: {
    profileStyle: 'professional' | 'casual' | 'friendly' | 'neutral';
    activityLevel: 'high' | 'medium' | 'low';
    successRate: number;        // 歷史成功率
    responseRate: number;       // 回覆率
  };
}

// 無劇本模式配置
export interface ScriptlessConfig {
  enabled: boolean;
  maxTurns: number;             // 最大對話輪數
  autoAdjustInterval: number;   // 自動調整間隔（消息數）
  targetConversionSignals: string[];  // 轉化信號關鍵詞
  exitConditions: {
    maxSilenceMinutes: number;
    negativeThreshold: number;
    successSignals: string[];
  };
}

// 用戶意圖類型
export type IntentType = 
  | 'sales_conversion'      // 銷售轉化
  | 'churn_recovery'        // 流失挽回
  | 'community_activation'  // 社群活躍
  | 'customer_support'      // 售後服務
  | 'brand_promotion'       // 品牌推廣
  | 'lead_nurturing'        // 潛客培育
  | 'custom';               // 自定義

// 意圖解析結果
export interface IntentAnalysis {
  type: IntentType;
  confidence: number;           // 置信度 0-100
  goal: string;                 // 理解後的目標描述
  targetAudience: string;       // 目標群體
  productType?: string;         // 產品類型
  urgency: 'high' | 'medium' | 'low';  // 緊迫程度
  suggestedDuration: string;    // 建議週期
}

// 推薦的角色配置
export interface RecommendedRole {
  id: string;
  name: string;
  icon: string;
  type: string;
  purpose: string;              // 角色目的
  personality: string;          // 性格特點
  speakingStyle: string;        // 說話風格
  entryTiming: string;          // 出場時機
  sampleMessages: string[];     // 示例消息
  accountId?: number;           // 綁定的帳號 ID
}

// 動態策略
export interface DynamicStrategy {
  id: string;
  name: string;
  description: string;
  phases: StrategyPhase[];
  adjustmentRules: AdjustmentRule[];
  constraints: StrategyConstraints;
}

// 策略階段
export interface StrategyPhase {
  id: string;
  name: string;
  duration: string;             // 如 "1-2天"
  goal: string;
  tactics: string[];
  rolesFocus: string[];         // 主要活躍的角色
  successIndicators: string[];  // 成功指標
}

// 調整規則
export interface AdjustmentRule {
  trigger: string;              // 觸發條件描述
  condition: {
    type: 'sentiment' | 'engagement' | 'keyword' | 'silence' | 'interest';
    threshold?: number;
    keywords?: string[];
  };
  action: string;               // 執行動作
  newStrategy?: Partial<DynamicStrategy>;
}

// 策略約束
export interface StrategyConstraints {
  maxDailyMessages: number;
  maxConsecutiveFromSameRole: number;
  minIntervalSeconds: number;
  maxIntervalSeconds: number;
  activeHours: { start: number; end: number };  // 活躍時間
  toneGuidelines: string[];
  forbiddenTopics: string[];
}

// 實時分析結果
export interface RealtimeAnalysis {
  timestamp: string;
  messageCount: number;         // 分析的消息數量
  
  // 用戶畫像
  userProfile: {
    engagementLevel: 'high' | 'medium' | 'low';
    sentiment: 'positive' | 'neutral' | 'negative';
    interests: string[];
    objections: string[];
    readinessScore: number;     // 購買準備度 0-100
  };
  
  // 對話質量
  conversationQuality: {
    responseRate: number;
    avgResponseTime: number;
    topicEngagement: Record<string, number>;
  };
  
  // AI 建議
  suggestions: {
    nextAction: 'continue' | 'escalate' | 'pause' | 'close';
    recommendedRole: string;
    topicSuggestion: string;
    toneAdjustment: string;
    reasoning: string;
  };
}

// 執行狀態
export interface ExecutionState {
  id: string;
  status: 'idle' | 'planning' | 'running' | 'paused' | 'completed';
  goal: string;
  intent: IntentAnalysis | null;
  strategy: DynamicStrategy | null;
  roles: RecommendedRole[];
  
  // 🆕 執行模式
  mode: ExecutionMode;
  
  // 🆕 帳號角色匹配結果
  accountMatches?: AccountRoleMatch[];
  
  // 🆕 無劇本模式配置
  scriptlessConfig?: ScriptlessConfig;
  
  // 🆕 轉化漏斗追蹤
  conversionFunnel?: {
    currentStage: 'contact' | 'response' | 'interest' | 'intent' | 'conversion';
    stageHistory: { stage: string; enteredAt: string; messageCount: number }[];
    keyMoments: { message: string; trigger: string; stage: string; timestamp: string }[];
  };
  
  // 執行統計
  stats: {
    startTime: string;
    messagesSent: number;
    responsesReceived: number;
    currentPhase: number;
    interestScore: number;
    lastAnalysis?: RealtimeAnalysis | null;
    // 🆕 新增統計
    analysisCount: number;        // 分析次數
    rolesSwitchCount: number;     // 角色切換次數
    autoAdjustments: number;      // 自動調整次數
  };
  
  // 消息歷史（用於分析）
  messageHistory?: {
    role: string;
    content: string;
    timestamp: string;
    isFromCustomer: boolean;
  }[];
  
  // 目標用戶列表（包含意向評分）
  targetUsers?: {
    id: number | string;
    username?: string;
    firstName?: string;
    lastName?: string;
    intentScore: number;
    lastContact?: string;
    source?: string;
  }[];
  
  // 🆕 任務隊列管理
  queue?: {
    totalUsers: number;           // 總目標用戶數
    processedUsers: number;       // 已處理用戶數
    currentUserIndex: number;     // 當前處理的用戶索引
    currentUser?: {               // 當前正在處理的用戶
      id: string;
      name: string;
      startTime: string;
    };
    completedUsers: {             // 已完成用戶列表
      id: string;
      name: string;
      result: 'converted' | 'interested' | 'neutral' | 'rejected' | 'no_response';
      messagesExchanged: number;
      duration: number;           // 處理時長（秒）
    }[];
    pendingUsers: string[];       // 待處理用戶 ID 列表
    pausedAt?: string;            // 暫停時間
  };
  
  // 來自 AI 營銷助手的策略數據
  marketingData?: {
    industry: string;
    targetAudience: string;
    keywords: { highIntent: string[]; mediumIntent: string[]; extended: string[] };
    customerProfile: { identity: string[]; features: string[]; needs: string[] };
    recommendedGroups: string[];
    messageTemplates: { firstTouch: string; followUp: string; closing: string };
  };
  
  // 🔧 群聊協作：聊天場景
  chatScenario?: 'private' | 'group';
  
  // 🔧 群聊協作：群組配置
  groupConfig?: {
    groupId?: string;
    groupName?: string;
    roleAccounts?: { accountId: number; accountPhone: string; roleId: string; roleName: string }[];
    chatScenario: 'group';
  };
}

// 話題類型
export interface TopicSuggestion {
  type: 'news' | 'weather' | 'life' | 'holiday' | 'product' | 'casual';
  content: string;
  context: string;
  suitableRoles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DynamicScriptEngineService {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  private multiRoleService = inject(MultiRoleService);
  private accountService = inject(AccountManagementService);
  
  // ============ 狀態 ============
  
  // 當前執行狀態
  private _currentExecution = signal<ExecutionState | null>(null);
  currentExecution = computed(() => this._currentExecution());
  
  // 所有執行歷史
  private _executions = signal<ExecutionState[]>([]);
  executions = computed(() => this._executions());
  
  // 是否正在處理
  private _isProcessing = signal(false);
  isProcessing = computed(() => this._isProcessing());
  
  // 🆕 當前執行模式
  private _executionMode = signal<ExecutionMode>('hybrid');
  executionMode = computed(() => this._executionMode());
  
  // 🆕 帳號匹配結果
  private _accountMatches = signal<AccountRoleMatch[]>([]);
  accountMatches = computed(() => this._accountMatches());
  
  // 🆕 任務隊列狀態
  queueProgress = computed(() => {
    const exec = this._currentExecution();
    if (!exec?.queue) return null;
    return {
      total: exec.queue.totalUsers,
      processed: exec.queue.processedUsers,
      current: exec.queue.currentUser,
      pending: exec.queue.pendingUsers.length,
      completed: exec.queue.completedUsers,
      progress: exec.queue.totalUsers > 0 
        ? Math.round((exec.queue.processedUsers / exec.queue.totalUsers) * 100)
        : 0
    };
  });
  
  // 分析間隔（每N條消息分析一次）
  private analysisInterval = 10;
  
  /**
   * 🔧 Phase 4: 強制更新執行狀態（觸發 UI 刷新）
   */
  forceUpdateExecution(execution: ExecutionState): void {
    this._currentExecution.set({ ...execution });
    // 🔧 Phase 4: 同時持久化到數據庫
    this.persistExecution(execution);
  }
  
  /**
   * 🔧 Phase 4: 持久化執行狀態到數據庫
   */
  private persistExecution(execution: ExecutionState): void {
    try {
      this.ipc.send('ai-execution:save', {
        id: execution.id,
        executionType: execution.chatScenario || 'private',
        status: execution.status,
        mode: execution.mode,
        goal: execution.goal,
        targetUsers: JSON.stringify(execution.targetUsers || []),
        roleAccounts: JSON.stringify(execution.accountMatches || []),
        groupId: execution.groupConfig?.groupId,
        groupName: execution.groupConfig?.groupId ? `群組 ${execution.groupConfig.groupId}` : undefined,
        messageHistory: JSON.stringify(execution.messageHistory || []),
        stats: JSON.stringify(execution.stats || {})
      });
    } catch (error) {
      console.warn('[DynamicEngine] 持久化執行狀態失敗:', error);
    }
  }
  
  /**
   * 🔧 Phase 4: 從數據庫恢復執行狀態
   */
  async restoreExecutions(): Promise<void> {
    try {
      console.log('[DynamicEngine] 🔄 嘗試恢復執行狀態...');
      const result = await this.ipc.invoke('ai-execution:get-active');
      
      if (result && result.executions && result.executions.length > 0) {
        console.log(`[DynamicEngine] 找到 ${result.executions.length} 個活躍執行`);
        
        for (const saved of result.executions) {
          const execution: ExecutionState = {
            id: saved.id,
            status: saved.status === 'running' ? 'executing' : saved.status,
            goal: saved.goal || '',
            mode: saved.mode || 'hybrid',
            chatScenario: saved.executionType || 'private',
            targetUsers: JSON.parse(saved.targetUsers || '[]'),
            accountMatches: JSON.parse(saved.roleAccounts || '[]'),
            messageHistory: JSON.parse(saved.messageHistory || '[]'),
            stats: JSON.parse(saved.stats || '{}'),
            intent: { 
              type: 'sales_conversion', 
              confidence: 80, 
              goal: saved.goal || '',
              targetAudience: '潛在客戶',
              urgency: 'medium' as const,
              suggestedDuration: '1-2週'
            },
            strategy: { 
              id: 'restored_strategy',
              name: '恢復策略',
              description: '從數據庫恢復的執行策略',
              phases: [], 
              adjustmentRules: [],
              constraints: {
                maxDailyMessages: 20,
                maxConsecutiveFromSameRole: 3,
                minIntervalSeconds: 30,
                maxIntervalSeconds: 300,
                activeHours: { start: 8, end: 22 },
                toneGuidelines: ['友好', '專業'],
                forbiddenTopics: []
              }
            },
            roles: [],
            groupConfig: saved.groupId ? { groupId: saved.groupId, chatScenario: 'group' } : undefined
          };
          
          this._currentExecution.set(execution);
          this._executions.update(list => [execution, ...list.filter(e => e.id !== execution.id)]);
          console.log(`[DynamicEngine] ✅ 已恢復執行: ${execution.id}`);
        }
        
        this.toast.info(`🔄 已恢復 ${result.executions.length} 個進行中的任務`);
      } else {
        console.log('[DynamicEngine] 沒有需要恢復的執行');
      }
    } catch (error) {
      console.warn('[DynamicEngine] 恢復執行狀態失敗:', error);
    }
  }
  
  // 🆕 無劇本模式默認配置
  private defaultScriptlessConfig: ScriptlessConfig = {
    enabled: false,
    maxTurns: 50,
    autoAdjustInterval: 10,
    targetConversionSignals: ['怎麼買', '在哪買', '多少錢', '想買', '下單', '付款'],
    exitConditions: {
      maxSilenceMinutes: 60,
      negativeThreshold: 30,
      successSignals: ['買了', '已付款', '成交', '謝謝', '收到']
    }
  };
  
  constructor() {
    this.setupMessageAnalysisListener();
  }
  
  // ============ 🆕 消息分析監聽 ============
  
  /**
   * 設置消息分析監聯（每 N 條消息自動分析）
   */
  private setupMessageAnalysisListener(): void {
    // 監聽來自協作群組的新消息
    this.ipc.on('collab:new-message', async (data: any) => {
      const execution = this._currentExecution();
      if (!execution || execution.status !== 'running') return;
      
      // 添加到消息歷史
      const newMessage = {
        role: data.role || 'customer',
        content: data.content,
        timestamp: new Date().toISOString(),
        isFromCustomer: data.isFromCustomer ?? true
      };
      
      execution.messageHistory = [...(execution.messageHistory || []), newMessage];
      this._currentExecution.set({ ...execution });
      
      // 檢查是否達到分析間隔
      const messageCount = execution.messageHistory?.length || 0;
      if (messageCount > 0 && messageCount % this.analysisInterval === 0) {
        console.log(`[DynamicEngine] 觸發第 ${execution.stats.analysisCount + 1} 次分析 (${messageCount} 條消息)`);
        await this.performDynamicAnalysis(execution);
      }
      
      // 無劇本模式：檢查轉化信號
      if (execution.mode === 'scriptless' && data.isFromCustomer) {
        await this.checkConversionSignals(execution, data.content);
      }
    });
    
    // 監聯客戶回覆
    this.ipc.on('collab:customer-reply', async (data: any) => {
      const execution = this._currentExecution();
      if (!execution) return;
      
      // 更新回覆統計
      execution.stats.responsesReceived++;
      this._currentExecution.set({ ...execution });
      
      // 更新轉化漏斗
      if (execution.conversionFunnel?.currentStage === 'contact') {
        this.updateConversionStage(execution, 'response', data.content);
      }
    });
  }
  
  // ============ 意圖預設庫 ============
  
  private intentTemplates: Record<IntentType, {
    keywords: string[];
    description: string;
    defaultRoles: RecommendedRole[];
    defaultPhases: StrategyPhase[];
  }> = {
    sales_conversion: {
      // 🔧 擴展關鍵詞：增加更多營銷相關詞彙
      keywords: ['成交', '購買', '下單', '付費', '轉化', '買', '訂單', '付款', 
                 '營銷', '銷售', '推廣', '支付', '代收', '代付', '產品', '服務',
                 '客戶', '用戶', '興趣', '合作', '業務', '開發', '拓展', '簽約'],
      description: '促進潛在客戶完成購買',
      defaultRoles: [
        {
          id: 'friendly_member',
          name: '熱心群友',
          icon: '😄',
          type: 'atmosphere',
          purpose: '活躍氣氛，自然引入話題',
          personality: '熱情開朗，愛分享，好奇心強',
          speakingStyle: '口語化，帶表情符號，像朋友聊天',
          entryTiming: '開場和氣氛冷場時',
          sampleMessages: [
            '大家早安！今天天氣真好～',
            '哈哈這個有意思，我也遇到過',
            '對了，最近有人用過XX嗎？想聽聽意見'
          ]
        },
        {
          id: 'loyal_customer',
          name: '老用戶',
          icon: '❤️',
          type: 'endorsement',
          purpose: '分享真實使用體驗，建立信任',
          personality: '真誠可靠，樂於助人',
          speakingStyle: '平實自然，分享個人經歷',
          entryTiming: '話題轉到產品相關時',
          sampleMessages: [
            '我用了大概三個月吧，感覺還不錯',
            '一開始也是朋友推薦的，沒想到真的好用',
            '說實話剛開始也有點猶豫，後來覺得值得'
          ]
        },
        {
          id: 'sales_expert',
          name: '顧問專家',
          icon: '💼',
          type: 'professional',
          purpose: '專業解答，促成成交',
          personality: '專業可靠，耐心細緻',
          speakingStyle: '專業但不生硬，有親和力',
          entryTiming: '客戶表現出明確興趣時',
          sampleMessages: [
            '這個問題問得好，我來詳細說明一下',
            '根據您的需求，我建議...',
            '現在正好有活動，可以了解一下'
          ]
        }
      ],
      defaultPhases: [
        {
          id: 'phase_1',
          name: '氛圍營造',
          duration: '1-2天',
          goal: '建立存在感，活躍群氣氛',
          tactics: ['日常問候', '分享趣事', '參與討論'],
          rolesFocus: ['friendly_member'],
          successIndicators: ['群活躍度提升', '有人回覆互動']
        },
        {
          id: 'phase_2',
          name: '話題引入',
          duration: '1-2天',
          goal: '自然引入產品相關話題',
          tactics: ['場景分享', '痛點討論', '經驗交流'],
          rolesFocus: ['friendly_member', 'loyal_customer'],
          successIndicators: ['目標客戶參與討論', '提及產品相關需求']
        },
        {
          id: 'phase_3',
          name: '價值展示',
          duration: '1-2天',
          goal: '展示產品價值，建立信任',
          tactics: ['使用體驗分享', '效果見證', '專業解答'],
          rolesFocus: ['loyal_customer', 'sales_expert'],
          successIndicators: ['客戶詢問詳情', '興趣度上升']
        },
        {
          id: 'phase_4',
          name: '促成成交',
          duration: '靈活',
          goal: '把握時機，促成購買',
          tactics: ['優惠告知', '限時刺激', '異議處理'],
          rolesFocus: ['sales_expert'],
          successIndicators: ['客戶詢價', '達成購買']
        }
      ]
    },
    churn_recovery: {
      keywords: ['流失', '挽回', '回來', '再次', '重新', '老客戶', '續費'],
      description: '挽回流失或沉默的老客戶',
      defaultRoles: [
        {
          id: 'callback_agent',
          name: '回訪專員',
          icon: '📞',
          type: 'care',
          purpose: '真誠關懷，了解離開原因',
          personality: '溫暖真誠，善於傾聽',
          speakingStyle: '親切關懷，不急躁',
          entryTiming: '開場',
          sampleMessages: [
            '好久沒聯繫了，最近怎麼樣？',
            '想起您了，特意來問候一下',
            '之前用著還順利嗎？有什麼可以幫忙的？'
          ]
        },
        {
          id: 'customer_success',
          name: '客戶成功',
          icon: '🎯',
          type: 'solution',
          purpose: '解決問題，展示改進',
          personality: '專業負責，積極主動',
          speakingStyle: '問題導向，提供方案',
          entryTiming: '客戶說出離開原因後',
          sampleMessages: [
            '感謝您的反饋，這個問題我們已經優化了',
            '針對這個情況，我們現在有新的解決方案',
            '來，我幫您看看現在怎麼處理最好'
          ]
        },
        {
          id: 'vip_manager',
          name: 'VIP經理',
          icon: '👑',
          type: 'retention',
          purpose: '高層出面，誠意挽留',
          personality: '有權威但親和，誠意十足',
          speakingStyle: '正式但不生硬，展現誠意',
          entryTiming: '需要特別優惠或決策時',
          sampleMessages: [
            '我是VIP經理，特意來跟您聊聊',
            '您是我們的重要客戶，這個優惠是專門為您申請的',
            '有什麼顧慮都可以說，我們一定盡力解決'
          ]
        }
      ],
      defaultPhases: [
        { id: 'phase_1', name: '關懷回訪', duration: '1天', goal: '真誠問候，了解近況', tactics: ['問候', '關心', '傾聽'], rolesFocus: ['callback_agent'], successIndicators: ['客戶回覆', '說出離開原因'] },
        { id: 'phase_2', name: '問題解決', duration: '1-2天', goal: '針對問題提供方案', tactics: ['問題確認', '方案提供', '改進說明'], rolesFocus: ['customer_success'], successIndicators: ['客戶認可改進', '願意再試'] },
        { id: 'phase_3', name: '誠意挽留', duration: '靈活', goal: '提供優惠，促成回歸', tactics: ['專屬優惠', 'VIP待遇', '承諾保障'], rolesFocus: ['vip_manager'], successIndicators: ['客戶同意回歸', '續費成功'] }
      ]
    },
    community_activation: {
      keywords: ['活躍', '社群', '氣氛', '互動', '討論', '冷清', '帶動'],
      description: '提升社群活躍度和用戶粘性',
      defaultRoles: [
        {
          id: 'community_host',
          name: '社群管家',
          icon: '🏠',
          type: 'host',
          purpose: '發起話題，維護秩序',
          personality: '熱情負責，有組織能力',
          speakingStyle: '親切有序，引導討論',
          entryTiming: '開場和話題轉換時',
          sampleMessages: [
            '早安各位！新的一天開始了～',
            '今天來聊聊XXX，大家怎麼看？',
            '感謝分享！還有其他想法嗎？'
          ]
        },
        {
          id: 'active_member_1',
          name: '活躍群友A',
          icon: '🤗',
          type: 'participant',
          purpose: '積極互動，帶動氣氛',
          personality: '外向活潑，愛分享',
          speakingStyle: '輕鬆隨意，多用表情',
          entryTiming: '話題發起後積極響應',
          sampleMessages: [
            '這個話題我有話說！',
            '哈哈確實是這樣',
            '我也有類似的經歷～'
          ]
        },
        {
          id: 'active_member_2',
          name: '活躍群友B',
          icon: '😎',
          type: 'participant',
          purpose: '補充觀點，延續討論',
          personality: '幽默風趣，見解獨到',
          speakingStyle: '有趣有料，偶爾抖機靈',
          entryTiming: '討論進行中補充',
          sampleMessages: [
            '樓上說得對，我補充一點',
            '換個角度想想...',
            '這讓我想起一個有意思的事'
          ]
        },
        {
          id: 'opinion_leader',
          name: '意見領袖',
          icon: '🎤',
          type: 'expert',
          purpose: '輸出價值，總結觀點',
          personality: '專業權威，有深度',
          speakingStyle: '有見地，能總結提升',
          entryTiming: '討論需要總結或升華時',
          sampleMessages: [
            '看了大家的討論，我來總結一下',
            '這個問題的關鍵在於...',
            '分享一個我的思考框架'
          ]
        }
      ],
      defaultPhases: [
        { id: 'phase_1', name: '話題發起', duration: '持續', goal: '發起有價值的討論話題', tactics: ['熱點話題', '經驗分享', '問題討論'], rolesFocus: ['community_host'], successIndicators: ['有人參與討論'] },
        { id: 'phase_2', name: '互動響應', duration: '持續', goal: '帶動討論氛圍', tactics: ['積極回覆', '補充觀點', '表達認同'], rolesFocus: ['active_member_1', 'active_member_2'], successIndicators: ['多人參與', '討論深入'] },
        { id: 'phase_3', name: '價值輸出', duration: '適時', goal: '總結討論價值', tactics: ['觀點總結', '經驗提煉', '知識分享'], rolesFocus: ['opinion_leader'], successIndicators: ['獲得認可', '被收藏轉發'] }
      ]
    },
    customer_support: {
      keywords: ['售後', '問題', '投訴', '故障', '不滿', '解決', '處理', '退'],
      description: '高效處理客戶售後問題',
      defaultRoles: [
        {
          id: 'cs_agent',
          name: '客服專員',
          icon: '🎧',
          type: 'frontline',
          purpose: '快速響應，記錄問題',
          personality: '耐心細緻，態度好',
          speakingStyle: '禮貌專業，表達歉意',
          entryTiming: '問題出現時立即響應',
          sampleMessages: [
            '您好，非常抱歉給您帶來不便！',
            '請問具體是什麼問題呢？我來幫您處理',
            '我已經記錄下來了，馬上為您跟進'
          ]
        },
        {
          id: 'tech_support',
          name: '技術支持',
          icon: '🔧',
          type: 'technical',
          purpose: '技術排查，解決問題',
          personality: '專業嚴謹，邏輯清晰',
          speakingStyle: '技術專業但易懂',
          entryTiming: '需要技術解答時',
          sampleMessages: [
            '根據您描述的情況，請您嘗試以下步驟',
            '這個問題我來看一下，稍等',
            '找到原因了，是因為XXX，解決方案是...'
          ]
        },
        {
          id: 'satisfaction_manager',
          name: '滿意度經理',
          icon: '😊',
          type: 'recovery',
          purpose: '確認滿意，補償挽回',
          personality: '溫暖真誠，有誠意',
          speakingStyle: '真誠道歉，積極補償',
          entryTiming: '問題解決後',
          sampleMessages: [
            '問題解決了嗎？給您造成不便真的很抱歉',
            '為表歉意，我們為您申請了一份小禮物',
            '以後有任何問題都可以隨時找我'
          ]
        }
      ],
      defaultPhases: [
        { id: 'phase_1', name: '快速響應', duration: '立即', goal: '第一時間響應，安撫情緒', tactics: ['表達歉意', '確認問題', '表示重視'], rolesFocus: ['cs_agent'], successIndicators: ['客戶情緒緩和'] },
        { id: 'phase_2', name: '問題解決', duration: '盡快', goal: '排查並解決問題', tactics: ['技術排查', '提供方案', '確認解決'], rolesFocus: ['tech_support'], successIndicators: ['問題解決'] },
        { id: 'phase_3', name: '滿意確認', duration: '問題解決後', goal: '確認滿意，適當補償', tactics: ['確認滿意', '補償挽回', '建立好感'], rolesFocus: ['satisfaction_manager'], successIndicators: ['客戶滿意', '好評反饋'] }
      ]
    },
    brand_promotion: {
      keywords: ['推廣', '品牌', '宣傳', '知名度', '曝光', '傳播'],
      description: '提升品牌知名度和好感度',
      defaultRoles: [
        {
          id: 'brand_ambassador',
          name: '品牌大使',
          icon: '🏆',
          type: 'promotion',
          purpose: '傳播品牌價值',
          personality: '專業自信，有感染力',
          speakingStyle: '積極正面，有號召力',
          entryTiming: '品牌相關話題',
          sampleMessages: ['這個品牌我一直關注，理念很好', '他們家的品質確實沒話說']
        }
      ],
      defaultPhases: [
        { id: 'phase_1', name: '品牌曝光', duration: '持續', goal: '自然傳播品牌', tactics: ['價值分享', '故事講述'], rolesFocus: ['brand_ambassador'], successIndicators: ['被討論', '好評'] }
      ]
    },
    lead_nurturing: {
      keywords: ['培育', '潛客', '跟進', '預熱', '教育'],
      description: '培育潛在客戶，提升購買意願',
      defaultRoles: [
        {
          id: 'content_sharer',
          name: '內容達人',
          icon: '📚',
          type: 'education',
          purpose: '分享有價值內容',
          personality: '知識豐富，樂於分享',
          speakingStyle: '有料有趣，不說教',
          entryTiming: '持續',
          sampleMessages: ['分享一個很有用的方法', '這篇文章寫得太好了']
        }
      ],
      defaultPhases: [
        { id: 'phase_1', name: '價值輸出', duration: '持續', goal: '通過內容建立信任', tactics: ['知識分享', '案例分析'], rolesFocus: ['content_sharer'], successIndicators: ['被關注', '主動詢問'] }
      ]
    },
    custom: {
      keywords: [],
      description: '自定義目標',
      // 🔧 修復: custom 類型使用通用銷售角色作為默認值，避免空角色問題
      defaultRoles: [
        {
          id: 'account_manager',
          name: '客戶經理',
          icon: '💼',
          type: 'account_manager',
          purpose: '了解需求，建立關係',
          personality: '專業友好，善於傾聽',
          speakingStyle: '專業但不生硬，像朋友般交流',
          entryTiming: '首次接觸和重要節點',
          sampleMessages: [
            '您好！我是您的專屬客戶經理',
            '請問有什麼可以幫到您的嗎？',
            '有任何問題都可以隨時問我'
          ]
        },
        {
          id: 'solution_expert',
          name: '方案專家',
          icon: '📋',
          type: 'professional',
          purpose: '提供專業方案和建議',
          personality: '專業權威，有深度',
          speakingStyle: '清晰簡潔，重點突出',
          entryTiming: '客戶有具體需求時',
          sampleMessages: [
            '根據您的情況，我建議...',
            '這個方案可以滿足您的需求',
            '讓我來詳細說明一下'
          ]
        }
      ],
      defaultPhases: [
        { id: 'phase_1', name: '了解需求', duration: '1-2天', goal: '建立聯繫，了解客戶需求', tactics: ['開場問候', '需求挖掘'], rolesFocus: ['account_manager'], successIndicators: ['客戶回覆', '說出需求'] },
        { id: 'phase_2', name: '提供方案', duration: '1-2天', goal: '根據需求提供定制方案', tactics: ['方案介紹', '價值說明'], rolesFocus: ['solution_expert'], successIndicators: ['客戶認可', '詢問細節'] },
        { id: 'phase_3', name: '促成轉化', duration: '靈活', goal: '解答疑慮，促成成交', tactics: ['異議處理', '優惠促單'], rolesFocus: ['account_manager'], successIndicators: ['客戶同意', '成交'] }
      ]
    }
  };
  
  // ============ 🆕 智能帳號匹配 ============
  
  /**
   * P0: 智能匹配帳號到角色
   * 根據帳號特徵自動選擇最適合的角色
   */
  async smartMatchAccountsToRoles(
    recommendedRoles: RecommendedRole[],
    targetIntent: IntentAnalysis
  ): Promise<AccountRoleMatch[]> {
    return this.smartMatchAccountsToRolesEnhanced(recommendedRoles, targetIntent, {});
  }
  
  /**
   * 🆕 P0: 增強版智能匹配（支持降級策略）
   * - allowMultiRole: 允許一號多角
   * - allowOffline: 允許匹配離線帳號
   */
  async smartMatchAccountsToRolesEnhanced(
    recommendedRoles: RecommendedRole[],
    targetIntent: IntentAnalysis,
    options: { allowMultiRole?: boolean; allowOffline?: boolean }
  ): Promise<AccountRoleMatch[]> {
    const { allowMultiRole = false, allowOffline = false } = options;
    const accounts = this.accountService.accounts();
    
    // 🔧 Phase 3 優化: 使用所有在線帳號進行匹配
    // 優先級: AI號 > 發送號 > 監控號
    const onlineAccounts = accounts.filter(a => a.status === 'Online');
    
    // 🔧 Phase 3: 使用所有在線帳號（包括 Listener），按優先級排序
    const rolePriority: Record<string, number> = { 'AI': 1, 'Sender': 2, 'Listener': 3 };
    let availableAccounts = onlineAccounts
      .sort((a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99));
    
    console.log(`[DynamicEngine] 🔍 Phase 3 帳號篩選: 在線 ${onlineAccounts.length} 個, 全部可用於多角色`);
    console.log(`[DynamicEngine] 🔍 可用帳號明細:`, availableAccounts.map(a => `${a.phone}(${a.role})`));
    
    if (availableAccounts.length === 0 && allowOffline) {
      // 降級: 嘗試離線但健康的帳號
      availableAccounts = accounts.filter(a => 
        a.status === 'Offline' && 
        !a.status.toLowerCase().includes('error') &&
        !a.status.toLowerCase().includes('banned')
      );
      if (availableAccounts.length > 0) {
        console.log('[DynamicEngine] 降級: 使用離線帳號（需要先連線）');
      }
    }
    
    if (availableAccounts.length === 0) {
      console.log('[DynamicEngine] 無可用帳號');
      return [];
    }
    
    const matches: AccountRoleMatch[] = [];
    const usedAccounts = new Set<number>();
    const accountUsageCount = new Map<number, number>();
    
    // 🔧 P0-3: 嚴格模式下，一個帳號只能分配一個角色
    const strictOneAccountOneRole = !allowMultiRole;
    if (strictOneAccountOneRole) {
      console.log('[DynamicEngine] 🔒 嚴格模式：一帳號一角色');
    }
    
    for (const role of recommendedRoles) {
      // 找到最適合這個角色的帳號
      let bestMatch: { account: TelegramAccount; score: number; reasons: string[] } | null = null;
      
      for (const account of availableAccounts) {
        // 🔧 P0-3: 嚴格模式下，已使用的帳號不能再次使用
        if (strictOneAccountOneRole && usedAccounts.has(account.id)) {
          console.log(`[DynamicEngine] ⏭️ 跳過已使用帳號: ${account.phone}`);
          continue;
        }
        
        // 如果已經使用過，降低分數
        const usageCount = accountUsageCount.get(account.id) || 0;
        const usagePenalty = usageCount * 20;
        
        const { score, reasons } = this.calculateAccountRoleMatch(account, role, targetIntent);
        const adjustedScore = Math.max(0, score - usagePenalty);
        
        if (!bestMatch || adjustedScore > bestMatch.score) {
          bestMatch = { account, score: adjustedScore, reasons };
        }
      }
      
      // 🔧 Phase 3 優化: 降低匹配門檻到 10，並強制分配剩餘帳號
      if (bestMatch && bestMatch.score >= 10) {
        usedAccounts.add(bestMatch.account.id);
        accountUsageCount.set(
          bestMatch.account.id, 
          (accountUsageCount.get(bestMatch.account.id) || 0) + 1
        );
        
        const features = this.analyzeAccountFeatures(bestMatch.account);
        const usageCount = accountUsageCount.get(bestMatch.account.id) || 1;
        
        matches.push({
          accountId: bestMatch.account.id,
          accountPhone: bestMatch.account.phone,
          accountName: bestMatch.account.name || bestMatch.account.phone,
          roleId: role.id,
          roleName: role.name,
          roleIcon: role.icon,
          matchScore: bestMatch.score,
          matchReasons: usageCount > 1 
            ? [...bestMatch.reasons, `一號多角 (${usageCount} 角色)`]
            : bestMatch.reasons,
          accountFeatures: features
        });
      } else if (bestMatch) {
        // 🔧 Phase 3: 分數不足也要分配，確保帳號被使用
        console.log(`[DynamicEngine] ⚡ 強制分配低分帳號: ${bestMatch.account.phone} (分數: ${bestMatch.score})`);
        usedAccounts.add(bestMatch.account.id);
        accountUsageCount.set(
          bestMatch.account.id, 
          (accountUsageCount.get(bestMatch.account.id) || 0) + 1
        );
        
        matches.push({
          accountId: bestMatch.account.id,
          accountPhone: bestMatch.account.phone,
          accountName: bestMatch.account.name || bestMatch.account.phone,
          roleId: role.id,
          roleName: role.name,
          roleIcon: role.icon,
          matchScore: bestMatch.score,
          matchReasons: [...bestMatch.reasons, '強制分配(分數較低)'],
          accountFeatures: this.analyzeAccountFeatures(bestMatch.account)
        });
      } else if (allowMultiRole && availableAccounts.length > 0) {
        // 🆕 強制分配: 如果沒有合適的，隨機分配第一個可用帳號
        const fallbackAccount = availableAccounts[0];
        accountUsageCount.set(
          fallbackAccount.id, 
          (accountUsageCount.get(fallbackAccount.id) || 0) + 1
        );
        const usageCount = accountUsageCount.get(fallbackAccount.id) || 1;
        
        matches.push({
          accountId: fallbackAccount.id,
          accountPhone: fallbackAccount.phone,
          accountName: fallbackAccount.name || fallbackAccount.phone,
          roleId: role.id,
          roleName: role.name,
          roleIcon: role.icon,
          matchScore: 30,
          matchReasons: ['自動分配', `一號多角 (${usageCount} 角色)`],
          accountFeatures: this.analyzeAccountFeatures(fallbackAccount)
        });
      }
    }
    
    this._accountMatches.set(matches);
    
    // 🆕 Phase 2.3: 增加帳號匹配透明度
    const excludedAccounts = accounts.filter(a => 
      a.status === 'Online' && 
      !matches.some(m => m.accountId === a.id)
    );
    
    console.log('[DynamicEngine] ✅ 智能匹配結果:', matches.length, '個帳號');
    matches.forEach(m => {
      console.log(`  - ${m.accountPhone} → ${m.roleName} (分數: ${m.matchScore})`);
    });
    
    if (excludedAccounts.length > 0) {
      console.log('[DynamicEngine] ⚠️ 未使用的在線帳號:', excludedAccounts.length, '個');
      excludedAccounts.forEach(a => {
        const reason = a.role === 'Listener' ? '監控號(保留用於監控)' : 
                       usedAccounts.has(a.id) ? '已分配其他角色' : '匹配分數不足';
        console.log(`  - ${a.phone} (${a.role}): ${reason}`);
      });
    }
    
    return matches;
  }
  
  /**
   * 計算帳號與角色的匹配度
   */
  private calculateAccountRoleMatch(
    account: TelegramAccount,
    role: RecommendedRole,
    intent: IntentAnalysis
  ): { score: number; reasons: string[] } {
    let score = 50; // 基礎分
    const reasons: string[] = [];
    
    // 1. 帳號狀態檢查
    if (account.status === 'Online') {
      score += 10;
      reasons.push('帳號在線');
    }
    
    // 2. 頭像/名稱風格匹配
    const nameStyle = this.analyzeNameStyle(account.name);
    const roleStyle = this.getRoleExpectedStyle(role.type);
    
    if (nameStyle === roleStyle) {
      score += 20;
      reasons.push(`名稱風格匹配 (${nameStyle})`);
    } else if (nameStyle === 'neutral') {
      score += 10;
      reasons.push('名稱風格中性，適應性強');
    }
    
    // 3. 角色類型特殊匹配
    if (role.type === 'professional' && this.looksLikeProfessional(account)) {
      score += 15;
      reasons.push('帳號看起來專業');
    }
    
    if (role.type === 'endorsement' && this.looksLikeFriendly(account)) {
      score += 15;
      reasons.push('帳號看起來親和');
    }
    
    if (role.type === 'atmosphere' && this.looksLikeCasual(account)) {
      score += 15;
      reasons.push('帳號看起來輕鬆');
    }
    
    // 4. 歷史表現（如果有）
    // TODO: 從數據庫讀取帳號歷史表現數據
    
    return { score: Math.min(100, score), reasons };
  }
  
  /**
   * 分析帳號特徵
   */
  private analyzeAccountFeatures(account: TelegramAccount): AccountRoleMatch['accountFeatures'] {
    const nameStyle = this.analyzeNameStyle(account.name);
    
    return {
      profileStyle: nameStyle as 'professional' | 'casual' | 'friendly' | 'neutral',
      activityLevel: 'medium',  // TODO: 從歷史數據計算
      successRate: 0,           // TODO: 從歷史數據計算
      responseRate: 0           // TODO: 從歷史數據計算
    };
  }
  
  /**
   * 分析名稱風格
   */
  private analyzeNameStyle(name?: string): string {
    const fullName = (name || '').toLowerCase();
    
    // 專業風格指標
    const professionalIndicators = ['manager', 'director', 'expert', 'consultant', '經理', '顧問', '專家', '總監'];
    if (professionalIndicators.some(ind => fullName.includes(ind))) {
      return 'professional';
    }
    
    // 友好風格指標
    const friendlyIndicators = ['小', '阿', '哥', '姐', '寶', '萌', 'happy', 'sunny', 'sweet'];
    if (friendlyIndicators.some(ind => fullName.includes(ind))) {
      return 'friendly';
    }
    
    // 隨性風格指標
    const casualIndicators = ['cool', 'chill', '懶', '隨', 'random', 'just'];
    if (casualIndicators.some(ind => fullName.includes(ind))) {
      return 'casual';
    }
    
    return 'neutral';
  }
  
  /**
   * 獲取角色期望的帳號風格
   */
  private getRoleExpectedStyle(roleType: string): string {
    const styleMap: Record<string, string> = {
      'professional': 'professional',
      'endorsement': 'friendly',
      'atmosphere': 'casual',
      'care': 'friendly',
      'solution': 'professional',
      'retention': 'professional',
      'host': 'friendly',
      'participant': 'casual',
      'expert': 'professional'
    };
    return styleMap[roleType] || 'neutral';
  }
  
  private looksLikeProfessional(account: TelegramAccount): boolean {
    const name = (account.name || '').toLowerCase();
    return name.includes('manager') || name.includes('經理') || name.includes('顧問') || 
           name.includes('director') || name.includes('總監');
  }
  
  private looksLikeFriendly(account: TelegramAccount): boolean {
    const name = (account.name || '').toLowerCase();
    return name.includes('小') || name.includes('阿') || name.includes('姐') || 
           name.includes('happy') || name.includes('sunny');
  }
  
  private looksLikeCasual(account: TelegramAccount): boolean {
    const name = (account.name || '').toLowerCase();
    return name.includes('cool') || name.includes('chill') || name.length <= 3;
  }
  
  // ============ 核心方法 ============
  
  /**
   * 設置執行模式
   */
  setExecutionMode(mode: ExecutionMode): void {
    this._executionMode.set(mode);
    console.log('[DynamicEngine] 執行模式設置為:', mode);
  }
  
  /**
   * 一句話啟動：解析用戶意圖並生成執行計劃（增強版）
   * @param userInput 用戶輸入的目標
   * @param mode 執行模式
   * @param targetUsers 目標用戶列表（可選）
   * @param options 額外選項（群聊協作配置）
   */
  async startFromOnePhrase(
    userInput: string, 
    mode: ExecutionMode = 'hybrid',
    targetUsers?: { id: string; telegramId: string; username?: string; firstName?: string; lastName?: string; intentScore: number; source?: string }[],
    options?: {
      chatScenario?: 'private' | 'group';
      groupId?: string;
      roleAccounts?: { accountId: number; accountPhone: string; roleId: string; roleName: string }[];
    }
  ): Promise<ExecutionState | null> {
    if (!userInput.trim()) {
      this.toast.error('請輸入您的目標');
      return null;
    }
    
    this._isProcessing.set(true);
    this._executionMode.set(mode);
    
    // 🔧 群聊協作：記錄場景
    const chatScenario = options?.chatScenario || 'private';
    console.log(`[DynamicEngine] 啟動模式: ${mode}, 場景: ${chatScenario}`);
    
    try {
      // 1. 解析意圖
      const intent = await this.analyzeIntent(userInput);
      
      // 2. 生成策略
      const strategy = this.generateStrategy(intent);
      
      // 3. 推薦角色
      let roles = this.recommendRoles(intent);
      console.log('[DynamicEngine] 🔍 推薦角色:', roles?.length, roles);
      
      // 🔧 P0-1: 私聊模式強制限制為單一角色
      // 私聊模式 = 沒有群組，直接與目標用戶 1v1 對話
      const isPrivateChat = !targetUsers || targetUsers.length <= 1;
      if (isPrivateChat) {
        console.log('[DynamicEngine] 🔒 私聊模式：限制為單一角色');
        // 只保留第一個角色（通常是客戶經理）
        roles = roles.slice(0, PRIVATE_CHAT_MAX_ROLES);
        this.toast.info('💬 私聊模式：使用單一角色與目標用戶對話');
      }
      
      // 4. 🆕 智能匹配帳號到角色
      const accountMatches = await this.smartMatchAccountsToRoles(roles, intent);
      console.log('[DynamicEngine] 🔍 帳號匹配結果:', accountMatches?.length, accountMatches);
      
      // 🔧 P0-2: 帳號充足性檢查
      if (accountMatches.length < roles.length) {
        const shortage = roles.length - accountMatches.length;
        console.warn(`[DynamicEngine] ⚠️ 帳號不足：需要 ${roles.length} 個，只有 ${accountMatches.length} 個`);
        this.toast.warning(`⚠️ 帳號不足！需要再登入 ${shortage} 個帳號才能完整執行多角色協作`);
        
        // 如果是群聊模式且帳號嚴重不足，阻止執行
        if (!isPrivateChat && accountMatches.length === 0) {
          this.toast.error('❌ 沒有可用帳號，無法啟動。請先添加並登入帳號。');
          return null;
        }
        
        // 縮減角色到可用帳號數量
        roles = roles.slice(0, Math.max(1, accountMatches.length));
      }
      
      // 5. 🆕 將匹配結果更新到角色
      const rolesWithAccounts = roles.map(role => {
        const match = accountMatches.find(m => m.roleId === role.id);
        if (match) {
          return { ...role, accountId: match.accountId, accountPhone: match.accountPhone };
        }
        return role;
      });
      
      // 6. 🆕 處理目標用戶
      // 🔧 Phase 3 修復：確保同時設置 id 和 telegramId
      const formattedTargetUsers = targetUsers?.map(u => ({
        id: u.telegramId || u.id,
        telegramId: u.telegramId || u.id,  // 🔧 確保後端可以匹配
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        intentScore: u.intentScore,
        source: u.source
      }));
      
      // 🔧 調試日誌
      if (formattedTargetUsers && formattedTargetUsers.length > 0) {
        console.log('[DynamicEngine] 🎯 格式化目標用戶:');
        formattedTargetUsers.forEach(u => {
          console.log(`  - ${u.firstName || u.username || 'unknown'}: id=${u.id}, telegramId=${u.telegramId}`);
        });
      }
      
      // 7. 創建執行狀態
      // 🆕 初始化任務隊列
      const targetUserIds = formattedTargetUsers?.map(u => String(u.id)) || [];
      const queueConfig = targetUserIds.length > 0 ? {
        totalUsers: targetUserIds.length,
        processedUsers: 0,
        currentUserIndex: 0,
        currentUser: formattedTargetUsers?.[0] ? {
          id: String(formattedTargetUsers[0].id),
          name: formattedTargetUsers[0].firstName || formattedTargetUsers[0].username || String(formattedTargetUsers[0].id),
          startTime: new Date().toISOString()
        } : undefined,
        completedUsers: [],
        pendingUsers: targetUserIds.slice(1)  // 第一個已在處理，其餘待處理
      } : undefined;
      
      const execution: ExecutionState = {
        id: `exec_${Date.now()}`,
        status: 'planning',
        goal: userInput,
        intent,
        strategy,
        roles: rolesWithAccounts,
        mode,
        accountMatches,
        targetUsers: formattedTargetUsers,
        scriptlessConfig: mode === 'scriptless' ? { ...this.defaultScriptlessConfig, enabled: true } : undefined,
        conversionFunnel: {
          currentStage: 'contact',
          stageHistory: [{ stage: 'contact', enteredAt: new Date().toISOString(), messageCount: 0 }],
          keyMoments: []
        },
        queue: queueConfig,  // 🆕 添加隊列
        // 🔧 群聊協作：添加群聊配置
        groupConfig: chatScenario === 'group' ? {
          groupId: options?.groupId,
          roleAccounts: options?.roleAccounts,
          chatScenario: 'group'
        } : undefined,
        chatScenario,  // 🔧 群聊協作：記錄場景類型
        stats: {
          startTime: new Date().toISOString(),
          messagesSent: 0,
          responsesReceived: 0,
          currentPhase: 0,
          interestScore: 0,
          lastAnalysis: null,
          analysisCount: 0,
          rolesSwitchCount: 0,
          autoAdjustments: 0
        },
        messageHistory: []
      };
      
      this._currentExecution.set(execution);
      this._executions.update(list => [execution, ...list]);
      
      // 🔧 Phase 4: 持久化執行狀態
      this.persistExecution(execution);
      
      const modeLabel = mode === 'scriptless' ? '無劇本' : mode === 'scripted' ? '劇本' : '混合';
      const targetCount = formattedTargetUsers?.length || 0;
      this.toast.success(`AI 已理解您的目標，${modeLabel}模式準備就緒，匹配了 ${accountMatches.length} 個帳號${targetCount > 0 ? `，目標 ${targetCount} 個用戶` : ''}`);
      
      // 🆕 P0: 自動開始私聊執行（如果有目標用戶）
      if (formattedTargetUsers && formattedTargetUsers.length > 0) {
        // 延遲一小段時間後開始，讓用戶看到成功提示
        setTimeout(() => {
          this.beginPrivateChatExecution(execution);
        }, 1500);
      }
      
      return execution;
      
    } catch (error) {
      this.toast.error('策劃失敗，請重試');
      console.error('[DynamicEngine] Start failed:', error);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }
  
  /**
   * 使用 AI 營銷助手策略啟動（完整策略數據）
   */
  async startWithMarketingStrategy(
    userGoal: string,
    marketingStrategy: {
      industry: string;
      targetAudience: string;
      keywords: { highIntent: string[]; mediumIntent: string[]; extended: string[] };
      customerProfile: { identity: string[]; features: string[]; needs: string[] };
      recommendedGroups: string[];
      messageTemplates: { firstTouch: string; followUp: string; closing: string };
    }
  ): Promise<ExecutionState | null> {
    this._isProcessing.set(true);
    
    try {
      console.log('[DynamicEngine] 接收 AI 營銷策略:', marketingStrategy);
      
      // 1. 構建增強版意圖分析
      const intent: IntentAnalysis = {
        type: 'sales_conversion',
        confidence: 90,  // 來自 AI 營銷助手，置信度高
        goal: `在${marketingStrategy.industry}行業，促進${marketingStrategy.targetAudience}成交`,
        targetAudience: marketingStrategy.targetAudience,
        productType: marketingStrategy.industry,
        urgency: 'medium',
        suggestedDuration: '3-5天'
      };
      
      // 2. 使用策略中的關鍵詞和消息模板生成增強策略
      const strategy = this.generateEnhancedStrategy(intent, marketingStrategy);
      
      // 3. 推薦角色（可能根據行業調整）
      const roles = this.recommendRoles(intent);
      
      // 4. 創建執行狀態
      const execution: ExecutionState = {
        id: `exec_${Date.now()}`,
        status: 'planning',
        goal: userGoal,
        intent,
        strategy,
        roles,
        mode: 'hybrid',
        stats: {
          startTime: new Date().toISOString(),
          messagesSent: 0,
          responsesReceived: 0,
          currentPhase: 0,
          interestScore: 0,
          lastAnalysis: null,
          analysisCount: 0,
          rolesSwitchCount: 0,
          autoAdjustments: 0
        },
        // 保存原始營銷策略用於執行
        marketingData: marketingStrategy
      };
      
      this._currentExecution.set(execution);
      this._executions.update(list => [execution, ...list]);
      
      this.toast.success('🤖 AI 已整合營銷策略，準備執行最優方案！');
      
      return execution;
      
    } catch (error) {
      this.toast.error('策略整合失敗，請重試');
      console.error('[DynamicEngine] Marketing strategy start failed:', error);
      return null;
    } finally {
      this._isProcessing.set(false);
    }
  }
  
  /**
   * 生成增強版策略（使用 AI 營銷助手數據）
   */
  private generateEnhancedStrategy(
    intent: IntentAnalysis,
    marketingData: any
  ): DynamicStrategy {
    const baseStrategy = this.generateStrategy(intent);
    
    // 使用營銷數據增強策略
    return {
      ...baseStrategy,
      name: `${marketingData.industry} - AI 營銷策略`,
      description: `針對「${marketingData.targetAudience}」的智能營銷策略，使用關鍵詞：${marketingData.keywords.highIntent.slice(0, 3).join('、')}`,
      // 將消息模板注入到策略中
      messageTemplates: marketingData.messageTemplates,
      keywords: marketingData.keywords
    } as DynamicStrategy;
  }
  
  /**
   * 解析用戶意圖
   */
  private async analyzeIntent(userInput: string): Promise<IntentAnalysis> {
    const input = userInput.toLowerCase();
    
    // 關鍵詞匹配確定意圖類型
    let matchedType: IntentType = 'custom';
    let maxScore = 0;
    
    for (const [type, template] of Object.entries(this.intentTemplates)) {
      const score = template.keywords.filter(kw => input.includes(kw)).length;
      if (score > maxScore) {
        maxScore = score;
        matchedType = type as IntentType;
      }
    }
    
    // 構建意圖分析結果
    const template = this.intentTemplates[matchedType];
    
    return {
      type: matchedType,
      confidence: Math.min(95, 50 + maxScore * 15),
      goal: matchedType === 'custom' ? userInput : template.description,
      targetAudience: this.extractTargetAudience(input),
      productType: this.extractProductType(input),
      urgency: this.determineUrgency(input),
      suggestedDuration: this.suggestDuration(matchedType)
    };
  }
  
  /**
   * 生成動態策略
   */
  private generateStrategy(intent: IntentAnalysis): DynamicStrategy {
    const template = this.intentTemplates[intent.type];
    
    return {
      id: `strategy_${Date.now()}`,
      name: `${intent.goal} - 動態策略`,
      description: `AI 根據「${intent.goal}」自動生成的動態執行策略`,
      phases: template.defaultPhases,
      adjustmentRules: this.generateAdjustmentRules(intent),
      constraints: {
        maxDailyMessages: 50,
        maxConsecutiveFromSameRole: 3,
        minIntervalSeconds: 60,
        maxIntervalSeconds: 300,
        activeHours: { start: 9, end: 22 },
        toneGuidelines: ['友好自然', '不過度推銷', '像朋友聊天'],
        forbiddenTopics: ['政治', '敏感話題']
      }
    };
  }
  
  /**
   * 推薦角色
   */
  private recommendRoles(intent: IntentAnalysis): RecommendedRole[] {
    const template = this.intentTemplates[intent.type];
    return template.defaultRoles;
  }
  
  /**
   * 生成調整規則
   */
  private generateAdjustmentRules(intent: IntentAnalysis): AdjustmentRule[] {
    return [
      {
        trigger: '客戶情緒負面',
        condition: { type: 'sentiment', threshold: 30 },
        action: '暫停推銷，切換到關懷模式'
      },
      {
        trigger: '客戶詢問價格',
        condition: { type: 'keyword', keywords: ['多少錢', '價格', '費用', '貴不貴'] },
        action: '這是成交信號！引入銷售專家'
      },
      {
        trigger: '客戶提到競品',
        condition: { type: 'keyword', keywords: ['其他', '別家', '競品', '對比'] },
        action: '引入對比分析，突出優勢'
      },
      {
        trigger: '對話沉默',
        condition: { type: 'silence', threshold: 3600 },
        action: '發起新話題或換角色活躍'
      },
      {
        trigger: '興趣度上升',
        condition: { type: 'interest', threshold: 70 },
        action: '可以開始價值展示和促單'
      }
    ];
  }
  
  /**
   * 實時分析對話（每N條消息調用一次）
   */
  async analyzeConversation(messages: { role: string; content: string; isFromCustomer: boolean }[]): Promise<RealtimeAnalysis> {
    // 統計基礎數據
    const customerMessages = messages.filter(m => m.isFromCustomer);
    const responseRate = messages.length > 0 ? customerMessages.length / messages.length * 100 : 0;
    
    // 情感分析（簡化版，實際應調用AI）
    const sentiment = this.analyzeSentiment(customerMessages);
    
    // 興趣點提取
    const interests = this.extractInterests(customerMessages);
    
    // 計算準備度
    const readinessScore = this.calculateReadiness(customerMessages, sentiment);
    
    // 生成建議
    const suggestions = this.generateSuggestions(sentiment, readinessScore, interests);
    
    return {
      timestamp: new Date().toISOString(),
      messageCount: messages.length,
      userProfile: {
        engagementLevel: responseRate > 50 ? 'high' : responseRate > 20 ? 'medium' : 'low',
        sentiment,
        interests,
        objections: this.extractObjections(customerMessages),
        readinessScore
      },
      conversationQuality: {
        responseRate,
        avgResponseTime: 0, // 需要時間戳計算
        topicEngagement: {}
      },
      suggestions
    };
  }
  
  /**
   * 生成下一條消息（動態編劇）
   */
  async generateNextMessage(execution: ExecutionState): Promise<{
    role: RecommendedRole;
    content: string;
    type: 'casual' | 'value' | 'close' | 'objection_handling';
  } | null> {
    if (!execution.strategy || execution.roles.length === 0) return null;
    
    const lastAnalysis = execution.stats.lastAnalysis;
    const currentPhase = execution.strategy.phases[execution.stats.currentPhase];
    
    // 選擇合適的角色
    const suitableRoles = currentPhase?.rolesFocus || [];
    const role = execution.roles.find(r => suitableRoles.includes(r.id)) || execution.roles[0];
    
    // 根據分析結果決定消息類型
    let messageType: 'casual' | 'value' | 'close' | 'objection_handling' = 'casual';
    if (lastAnalysis) {
      if (lastAnalysis.userProfile.readinessScore > 70) {
        messageType = 'close';
      } else if (lastAnalysis.userProfile.objections.length > 0) {
        messageType = 'objection_handling';
      } else if (lastAnalysis.userProfile.engagementLevel === 'high') {
        messageType = 'value';
      }
    }
    
    // 生成消息內容（使用示例消息，實際應調用AI）
    const content = role.sampleMessages[Math.floor(Math.random() * role.sampleMessages.length)];
    
    return { role, content, type: messageType };
  }
  
  /**
   * 生成話題建議
   */
  generateTopicSuggestions(): TopicSuggestion[] {
    const now = new Date();
    const hour = now.getHours();
    
    const suggestions: TopicSuggestion[] = [];
    
    // 根據時間生成話題
    if (hour >= 6 && hour < 10) {
      suggestions.push({
        type: 'casual',
        content: '早安問候，聊聊今天的計劃',
        context: '早晨適合輕鬆問候',
        suitableRoles: ['friendly_member', 'community_host']
      });
    } else if (hour >= 11 && hour < 13) {
      suggestions.push({
        type: 'life',
        content: '午餐話題，聊聊美食',
        context: '午餐時間話題',
        suitableRoles: ['active_member_1', 'active_member_2']
      });
    } else if (hour >= 18 && hour < 20) {
      suggestions.push({
        type: 'casual',
        content: '下班話題，聊聊今天的趣事',
        context: '晚間輕鬆聊天',
        suitableRoles: ['friendly_member']
      });
    }
    
    // 添加通用話題
    suggestions.push({
      type: 'news',
      content: '最近的熱點新聞討論',
      context: '可以結合產品場景',
      suitableRoles: ['opinion_leader', 'community_host']
    });
    
    return suggestions;
  }
  
  // ============ 🆕 P2: 轉化追蹤增強 ============
  
  /**
   * 獲取轉化漏斗統計
   */
  getConversionFunnelStats(): {
    totalExecutions: number;
    funnelData: { stage: string; count: number; rate: number }[];
    avgTimePerStage: Record<string, number>;
    topKeyMoments: { trigger: string; count: number }[];
  } {
    const executions = this._executions();
    
    // 統計各階段數量
    const stageCounts: Record<string, number> = {
      'contact': 0,
      'response': 0,
      'interest': 0,
      'intent': 0,
      'conversion': 0
    };
    
    const stageTimings: Record<string, number[]> = {
      'contact': [],
      'response': [],
      'interest': [],
      'intent': [],
      'conversion': []
    };
    
    const keyMomentCounts: Record<string, number> = {};
    
    for (const exec of executions) {
      if (!exec.conversionFunnel) continue;
      
      // 統計最終階段
      stageCounts[exec.conversionFunnel.currentStage]++;
      
      // 統計各階段停留時間
      const history = exec.conversionFunnel.stageHistory;
      for (let i = 0; i < history.length - 1; i++) {
        const current = history[i];
        const next = history[i + 1];
        const duration = new Date(next.enteredAt).getTime() - new Date(current.enteredAt).getTime();
        stageTimings[current.stage]?.push(duration / 1000 / 60); // 分鐘
      }
      
      // 統計關鍵時刻
      for (const moment of exec.conversionFunnel.keyMoments) {
        keyMomentCounts[moment.trigger] = (keyMomentCounts[moment.trigger] || 0) + 1;
      }
    }
    
    // 計算漏斗轉化率
    const stages = ['contact', 'response', 'interest', 'intent', 'conversion'];
    const total = executions.length || 1;
    
    let cumulativeCount = total;
    const funnelData = stages.map(stage => {
      const count = stageCounts[stage];
      const rate = Math.round((cumulativeCount / total) * 100);
      cumulativeCount = cumulativeCount - count + stageCounts[stage];
      return { stage, count, rate };
    });
    
    // 計算平均時間
    const avgTimePerStage: Record<string, number> = {};
    for (const [stage, times] of Object.entries(stageTimings)) {
      avgTimePerStage[stage] = times.length > 0 
        ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
        : 0;
    }
    
    // 排序關鍵時刻
    const topKeyMoments = Object.entries(keyMomentCounts)
      .map(([trigger, count]) => ({ trigger, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalExecutions: executions.length,
      funnelData,
      avgTimePerStage,
      topKeyMoments
    };
  }
  
  /**
   * 記錄關鍵時刻
   */
  recordKeyMoment(executionId: string, message: string, trigger: string): void {
    const execution = this._executions().find(e => e.id === executionId);
    if (!execution || !execution.conversionFunnel) return;
    
    execution.conversionFunnel.keyMoments.push({
      message,
      trigger,
      stage: execution.conversionFunnel.currentStage,
      timestamp: new Date().toISOString()
    });
    
    this._executions.update(list => list.map(e => e.id === executionId ? execution : e));
    
    if (this._currentExecution()?.id === executionId) {
      this._currentExecution.set({ ...execution });
    }
    
    console.log(`[DynamicEngine] 記錄關鍵時刻: ${trigger} - ${message.substring(0, 30)}...`);
  }
  
  /**
   * 獲取執行詳情報表
   */
  getExecutionReport(executionId: string): {
    summary: {
      goal: string;
      mode: string;
      duration: string;
      messagesSent: number;
      responsesReceived: number;
      analysisCount: number;
      finalInterestScore: number;
      outcome: string;
    };
    rolePerformance: {
      roleId: string;
      roleName: string;
      messageCount: number;
      responseRate: number;
    }[];
    funnelProgress: {
      stage: string;
      enteredAt: string;
      duration: string;
    }[];
    keyMoments: {
      message: string;
      trigger: string;
      stage: string;
      timestamp: string;
    }[];
    aiAdjustments: {
      timestamp: string;
      action: string;
      reason: string;
    }[];
  } | null {
    const execution = this._executions().find(e => e.id === executionId);
    if (!execution) return null;
    
    // 計算持續時間
    const startTime = new Date(execution.stats.startTime);
    const endTime = execution.status === 'completed' ? new Date() : new Date();
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = Math.round(durationMs / 1000 / 60);
    
    // 角色表現統計
    const roleMessages: Record<string, number> = {};
    const roleResponses: Record<string, number> = {};
    
    for (const msg of execution.messageHistory || []) {
      if (!msg.isFromCustomer) {
        roleMessages[msg.role] = (roleMessages[msg.role] || 0) + 1;
      }
    }
    
    const rolePerformance = execution.roles.map(role => ({
      roleId: role.id,
      roleName: role.name,
      messageCount: roleMessages[role.id] || 0,
      responseRate: roleMessages[role.id] > 0 
        ? Math.round((roleResponses[role.id] || 0) / roleMessages[role.id] * 100)
        : 0
    }));
    
    // 漏斗進度
    const funnelProgress = (execution.conversionFunnel?.stageHistory || []).map((stage, i, arr) => {
      const nextStage = arr[i + 1];
      const duration = nextStage 
        ? Math.round((new Date(nextStage.enteredAt).getTime() - new Date(stage.enteredAt).getTime()) / 1000 / 60)
        : 0;
      return {
        stage: stage.stage,
        enteredAt: stage.enteredAt,
        duration: duration > 0 ? `${duration} 分鐘` : '進行中'
      };
    });
    
    // 確定結果
    let outcome = '進行中';
    if (execution.status === 'completed') {
      const finalStage = execution.conversionFunnel?.currentStage;
      if (finalStage === 'conversion') {
        outcome = '✅ 轉化成功';
      } else if (execution.stats.interestScore < 30) {
        outcome = '❌ 未轉化 - 興趣度低';
      } else {
        outcome = '⏸️ 未轉化 - 待跟進';
      }
    }
    
    return {
      summary: {
        goal: execution.goal,
        mode: execution.mode,
        duration: durationMinutes > 60 
          ? `${Math.floor(durationMinutes / 60)} 小時 ${durationMinutes % 60} 分鐘`
          : `${durationMinutes} 分鐘`,
        messagesSent: execution.stats.messagesSent,
        responsesReceived: execution.stats.responsesReceived,
        analysisCount: execution.stats.analysisCount,
        finalInterestScore: execution.stats.interestScore,
        outcome
      },
      rolePerformance,
      funnelProgress,
      keyMoments: execution.conversionFunnel?.keyMoments || [],
      aiAdjustments: [] // TODO: 從執行歷史提取
    };
  }
  
  /**
   * 獲取所有執行的統計摘要
   */
  getOverallStats(): {
    totalExecutions: number;
    completedExecutions: number;
    conversionRate: number;
    avgMessagesPerExecution: number;
    avgInterestScore: number;
    modeDistribution: { mode: string; count: number }[];
    topGoals: { goal: string; count: number }[];
  } {
    const executions = this._executions();
    const completed = executions.filter(e => e.status === 'completed');
    const converted = completed.filter(e => 
      e.conversionFunnel?.currentStage === 'conversion'
    );
    
    const totalMessages = executions.reduce((sum, e) => sum + e.stats.messagesSent, 0);
    const totalInterest = executions.reduce((sum, e) => sum + e.stats.interestScore, 0);
    
    // 模式分佈
    const modeCount: Record<string, number> = {};
    for (const e of executions) {
      modeCount[e.mode] = (modeCount[e.mode] || 0) + 1;
    }
    
    // 目標統計
    const goalCount: Record<string, number> = {};
    for (const e of executions) {
      const goal = e.goal.substring(0, 20);
      goalCount[goal] = (goalCount[goal] || 0) + 1;
    }
    
    return {
      totalExecutions: executions.length,
      completedExecutions: completed.length,
      conversionRate: completed.length > 0 
        ? Math.round((converted.length / completed.length) * 100)
        : 0,
      avgMessagesPerExecution: executions.length > 0
        ? Math.round(totalMessages / executions.length)
        : 0,
      avgInterestScore: executions.length > 0
        ? Math.round(totalInterest / executions.length)
        : 0,
      modeDistribution: Object.entries(modeCount).map(([mode, count]) => ({ mode, count })),
      topGoals: Object.entries(goalCount)
        .map(([goal, count]) => ({ goal, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    };
  }
  
  // ============ 輔助方法 ============
  
  private extractTargetAudience(input: string): string {
    if (input.includes('群')) return '群成員';
    if (input.includes('客戶')) return '潛在客戶';
    if (input.includes('老')) return '老客戶';
    return '目標用戶';
  }
  
  private extractProductType(input: string): string {
    if (input.includes('課程') || input.includes('教育')) return '教育課程';
    if (input.includes('產品')) return '實體產品';
    if (input.includes('服務')) return '服務類';
    return '產品/服務';
  }
  
  private determineUrgency(input: string): 'high' | 'medium' | 'low' {
    if (input.includes('馬上') || input.includes('立即') || input.includes('今天')) return 'high';
    if (input.includes('盡快') || input.includes('這週')) return 'medium';
    return 'low';
  }
  
  private suggestDuration(type: IntentType): string {
    const durations: Record<IntentType, string> = {
      sales_conversion: '3-7天',
      churn_recovery: '1-3天',
      community_activation: '持續進行',
      customer_support: '即時處理',
      brand_promotion: '持續進行',
      lead_nurturing: '2-4週',
      custom: '根據情況調整'
    };
    return durations[type];
  }
  
  private analyzeSentiment(messages: { content: string }[]): 'positive' | 'neutral' | 'negative' {
    const text = messages.map(m => m.content).join(' ');
    const positiveWords = ['好', '棒', '喜歡', '謝謝', '感謝', '讚', '不錯'];
    const negativeWords = ['不好', '差', '失望', '生氣', '投訴', '退', '爛'];
    
    const positiveCount = positiveWords.filter(w => text.includes(w)).length;
    const negativeCount = negativeWords.filter(w => text.includes(w)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
  
  private extractInterests(messages: { content: string }[]): string[] {
    const interests: string[] = [];
    const text = messages.map(m => m.content).join(' ');
    
    if (text.includes('價格') || text.includes('多少錢')) interests.push('價格敏感');
    if (text.includes('效果') || text.includes('有用嗎')) interests.push('效果關注');
    if (text.includes('怎麼用') || text.includes('使用')) interests.push('使用方法');
    
    return interests;
  }
  
  private extractObjections(messages: { content: string }[]): string[] {
    const objections: string[] = [];
    const text = messages.map(m => m.content).join(' ');
    
    if (text.includes('太貴') || text.includes('貴了')) objections.push('價格顧慮');
    if (text.includes('沒用') || text.includes('不需要')) objections.push('需求不明確');
    if (text.includes('考慮') || text.includes('再說')) objections.push('決策猶豫');
    
    return objections;
  }
  
  private calculateReadiness(messages: { content: string }[], sentiment: string): number {
    let score = 30; // 基礎分
    
    const text = messages.map(m => m.content).join(' ');
    
    // 積極信號加分
    if (text.includes('怎麼買') || text.includes('在哪買')) score += 30;
    if (text.includes('多少錢') || text.includes('價格')) score += 20;
    if (text.includes('有活動嗎') || text.includes('優惠')) score += 15;
    if (sentiment === 'positive') score += 10;
    
    // 消極信號減分
    if (text.includes('不需要') || text.includes('不用了')) score -= 20;
    if (sentiment === 'negative') score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }
  
  private generateSuggestions(
    sentiment: string, 
    readiness: number, 
    interests: string[]
  ): RealtimeAnalysis['suggestions'] {
    let nextAction: 'continue' | 'escalate' | 'pause' | 'close' = 'continue';
    let recommendedRole = 'friendly_member';
    let topicSuggestion = '繼續輕鬆聊天';
    let toneAdjustment = '保持友好';
    let reasoning = '對話進行正常';
    
    if (readiness > 70) {
      nextAction = 'close';
      recommendedRole = 'sales_expert';
      topicSuggestion = '產品價值和優惠';
      toneAdjustment = '可以更直接';
      reasoning = '客戶準備度高，可以促單';
    } else if (sentiment === 'negative') {
      nextAction = 'pause';
      recommendedRole = 'cs_agent';
      topicSuggestion = '關心和傾聽';
      toneAdjustment = '更加溫和耐心';
      reasoning = '客戶情緒負面，需要關懷';
    } else if (interests.includes('價格敏感')) {
      nextAction = 'escalate';
      recommendedRole = 'sales_expert';
      topicSuggestion = '價值優先，再談價格';
      reasoning = '客戶關注價格，需要強調價值';
    }
    
    return { nextAction, recommendedRole, topicSuggestion, toneAdjustment, reasoning };
  }
  
  // ============ 🆕 動態分析閉環 ============
  
  /**
   * P1: 執行動態分析（每 N 條消息觸發）
   */
  private async performDynamicAnalysis(execution: ExecutionState): Promise<void> {
    if (!execution.messageHistory || execution.messageHistory.length === 0) return;
    
    console.log('[DynamicEngine] 執行動態分析...');
    
    // 1. 分析最近的消息
    const recentMessages = execution.messageHistory.slice(-this.analysisInterval);
    const analysis = await this.analyzeConversation(recentMessages);
    
    // 2. 更新統計
    execution.stats.lastAnalysis = analysis;
    execution.stats.analysisCount++;
    execution.stats.interestScore = analysis.userProfile.readinessScore;
    
    // 3. 🆕 自動決策和調整
    const adjustment = this.makeAutoAdjustment(execution, analysis);
    
    if (adjustment.shouldAdjust) {
      execution.stats.autoAdjustments++;
      
      // 通知前端分析結果
      this.toast.info(`📊 第 ${execution.stats.analysisCount} 次分析: ${adjustment.reason}`);
      
      // 發送調整指令到後端
      this.ipc.send('ai-team:adjust-strategy', {
        executionId: execution.id,
        adjustment: adjustment
      });
    }
    
    // 4. 更新轉化漏斗
    this.updateFunnelFromAnalysis(execution, analysis);
    
    this._currentExecution.set({ ...execution });
    this._executions.update(list => list.map(e => e.id === execution.id ? execution : e));
  }
  
  /**
   * 自動調整決策
   */
  private makeAutoAdjustment(
    execution: ExecutionState,
    analysis: RealtimeAnalysis
  ): { shouldAdjust: boolean; action: string; reason: string; newRole?: string; newPhase?: number } {
    const { suggestions, userProfile } = analysis;
    
    // 規則 1: 興趣度高，推進到下一階段
    if (userProfile.readinessScore > 70 && execution.strategy) {
      const nextPhase = Math.min(
        execution.stats.currentPhase + 1,
        execution.strategy.phases.length - 1
      );
      if (nextPhase > execution.stats.currentPhase) {
        return {
          shouldAdjust: true,
          action: 'advance_phase',
          reason: `客戶興趣度 ${userProfile.readinessScore}%，推進到促單階段`,
          newPhase: nextPhase
        };
      }
    }
    
    // 規則 2: 情緒負面，切換到關懷角色
    if (userProfile.sentiment === 'negative') {
      return {
        shouldAdjust: true,
        action: 'switch_role',
        reason: '客戶情緒負面，切換到關懷模式',
        newRole: 'cs_agent'
      };
    }
    
    // 規則 3: 互動度低，換角色活躍
    if (userProfile.engagementLevel === 'low' && execution.stats.messagesSent > 5) {
      return {
        shouldAdjust: true,
        action: 'activate_atmosphere',
        reason: '互動度低，引入活躍角色',
        newRole: 'friendly_member'
      };
    }
    
    // 規則 4: 客戶有價格顧慮，引入專家
    if (userProfile.objections.includes('價格顧慮')) {
      return {
        shouldAdjust: true,
        action: 'handle_objection',
        reason: '客戶有價格顧慮，引入專家處理',
        newRole: 'sales_expert'
      };
    }
    
    return { shouldAdjust: false, action: 'continue', reason: '保持當前策略' };
  }
  
  /**
   * 根據分析更新轉化漏斗
   */
  private updateFunnelFromAnalysis(execution: ExecutionState, analysis: RealtimeAnalysis): void {
    if (!execution.conversionFunnel) return;
    
    const { readinessScore, interests } = analysis.userProfile;
    const currentStage = execution.conversionFunnel.currentStage;
    
    // 根據信號推進漏斗
    if (currentStage === 'response' && interests.length > 0) {
      this.updateConversionStage(execution, 'interest', '客戶表現出興趣');
    } else if (currentStage === 'interest' && readinessScore > 60) {
      this.updateConversionStage(execution, 'intent', '客戶有購買意向');
    } else if (currentStage === 'intent' && readinessScore > 85) {
      this.updateConversionStage(execution, 'conversion', '即將成交');
    }
  }
  
  /**
   * 更新轉化階段
   */
  private updateConversionStage(execution: ExecutionState, newStage: string, trigger: string): void {
    if (!execution.conversionFunnel) return;
    
    const messageCount = execution.messageHistory?.length || 0;
    
    execution.conversionFunnel.currentStage = newStage as any;
    execution.conversionFunnel.stageHistory.push({
      stage: newStage,
      enteredAt: new Date().toISOString(),
      messageCount
    });
    execution.conversionFunnel.keyMoments.push({
      message: trigger,
      trigger: `進入 ${newStage} 階段`,
      stage: newStage,
      timestamp: new Date().toISOString()
    });
    
    console.log(`[DynamicEngine] 轉化漏斗: ${newStage}`, trigger);
  }
  
  // 🆕 轉化信號關鍵詞庫
  private conversionSignals = {
    // 高意向信號（80分+）
    high: ['怎麼買', '多少錢', '價格', '付款', '下單', '想買', '購買', '訂購', '付費', '支付'],
    // 中意向信號（50-80分）
    medium: ['有興趣', '想了解', '介紹一下', '詳細說說', '發給我', '有什麼優惠', '怎麼使用'],
    // 正面信號（30-50分）
    positive: ['不錯', '挺好', '有道理', '可以', '好的', '謝謝', '感謝'],
    // 負面信號（減分）
    negative: ['不需要', '不用了', '不感興趣', '別打擾', '取關', '拉黑', '騷擾'],
    // 成交信號（確認轉化）
    converted: ['買了', '已付款', '付好了', '下單了', '成交', '訂好了']
  };
  
  /**
   * 🆕 P1: 檢測轉化信號
   */
  private detectConversionSignal(message: string): {
    hasSignal: boolean;
    signalType: 'high' | 'medium' | 'positive' | 'negative' | 'converted' | null;
    matchedKeyword: string | null;
    score: number;
  } {
    const lowerMsg = message.toLowerCase();
    
    // 按優先級檢測
    for (const keyword of this.conversionSignals.converted) {
      if (lowerMsg.includes(keyword)) {
        return { hasSignal: true, signalType: 'converted', matchedKeyword: keyword, score: 100 };
      }
    }
    
    for (const keyword of this.conversionSignals.high) {
      if (lowerMsg.includes(keyword)) {
        return { hasSignal: true, signalType: 'high', matchedKeyword: keyword, score: 85 };
      }
    }
    
    for (const keyword of this.conversionSignals.medium) {
      if (lowerMsg.includes(keyword)) {
        return { hasSignal: true, signalType: 'medium', matchedKeyword: keyword, score: 60 };
      }
    }
    
    for (const keyword of this.conversionSignals.positive) {
      if (lowerMsg.includes(keyword)) {
        return { hasSignal: true, signalType: 'positive', matchedKeyword: keyword, score: 40 };
      }
    }
    
    for (const keyword of this.conversionSignals.negative) {
      if (lowerMsg.includes(keyword)) {
        return { hasSignal: true, signalType: 'negative', matchedKeyword: keyword, score: -30 };
      }
    }
    
    return { hasSignal: false, signalType: null, matchedKeyword: null, score: 0 };
  }
  
  /**
   * 🆕 P1: 處理轉化信號
   */
  private handleConversionSignal(
    execution: ExecutionState,
    customerData: any,
    signal: { signalType: string | null; matchedKeyword: string | null; score: number }
  ): void {
    console.log('[DynamicEngine] 🎯 轉化信號:', signal);
    
    // 記錄關鍵時刻
    if (execution.conversionFunnel) {
      execution.conversionFunnel.keyMoments.push({
        message: customerData.text,
        trigger: `${signal.signalType}: ${signal.matchedKeyword}`,
        stage: signal.signalType || 'unknown',
        timestamp: new Date().toISOString()
      });
    }
    
    // 根據信號類型處理
    switch (signal.signalType) {
      case 'converted':
        // 客戶已成交
        this.toast.success(`🎉 客戶 ${customerData.firstName || '用戶'} 已成交！`);
        this.updateConversionStage(execution, 'conversion', customerData.text);
        
        // 標記當前用戶為轉化成功
        if (this.completeCurrentUser) {
          this.completeCurrentUser('converted');
        }
        break;
        
      case 'high':
        // 高意向 - 發送通知，切換到銷售專家
        this.toast.success(`🎯 高轉化信號！${customerData.firstName || '用戶'}: "${signal.matchedKeyword}"`);
        this.updateConversionStage(execution, 'intent', customerData.text);
        
        // 發送前端通知
        this.ipc.send('ai-team:conversion-signal', {
          executionId: execution.id,
          userId: customerData.userId,
          userName: customerData.firstName || customerData.username,
          signal: signal.matchedKeyword,
          signalType: signal.signalType,
          score: signal.score
        });
        break;
        
      case 'medium':
        // 中意向 - 繼續跟進
        this.updateConversionStage(execution, 'interest', customerData.text);
        break;
        
      case 'positive':
        // 正面反饋 - 更新興趣分
        if (execution.conversionFunnel?.currentStage === 'contact') {
          this.updateConversionStage(execution, 'response', customerData.text);
        }
        break;
        
      case 'negative':
        // 負面反饋 - 考慮停止或切換策略
        this.toast.warning(`⚠️ 客戶 ${customerData.firstName || '用戶'} 表達了拒絕意向`);
        
        // 可以考慮自動跳過此用戶
        // this.skipCurrentUser();
        break;
    }
    
    // 更新執行狀態
    this._currentExecution.set({ ...execution });
  }
  
  /**
   * 🆕 更新意向評分
   */
  private updateIntentScore(execution: ExecutionState, message: string): void {
    const signal = this.detectConversionSignal(message);
    if (signal.score !== 0) {
      execution.stats.interestScore = Math.max(0, Math.min(100, 
        (execution.stats.interestScore || 0) + signal.score
      ));
      this._currentExecution.set({ ...execution });
    }
  }
  
  /**
   * 檢查轉化信號（無劇本模式）- 舊版兼容
   */
  private async checkConversionSignals(execution: ExecutionState, customerMessage: string): Promise<void> {
    if (!execution.scriptlessConfig) return;
    
    const lowerMsg = customerMessage.toLowerCase();
    
    // 檢查轉化信號
    const hasConversionSignal = execution.scriptlessConfig.targetConversionSignals.some(
      signal => lowerMsg.includes(signal)
    );
    
    if (hasConversionSignal) {
      console.log('[DynamicEngine] 檢測到轉化信號:', customerMessage);
      
      execution.conversionFunnel?.keyMoments.push({
        message: customerMessage,
        trigger: '轉化信號',
        stage: 'conversion_signal',
        timestamp: new Date().toISOString()
      });
      
      // 自動切換到促單角色
      this.ipc.send('ai-team:conversion-signal', {
        executionId: execution.id,
        signal: customerMessage,
        recommendedRole: 'sales_expert'
      });
      
      this.toast.success('🎯 檢測到轉化信號！正在安排銷售專家跟進...');
    }
    
    // 檢查成功信號
    const hasSuccessSignal = execution.scriptlessConfig.exitConditions.successSignals.some(
      signal => lowerMsg.includes(signal)
    );
    
    if (hasSuccessSignal) {
      console.log('[DynamicEngine] 檢測到成功信號:', customerMessage);
      this.updateConversionStage(execution, 'conversion', customerMessage);
      this.toast.success('🎉 恭喜！客戶已轉化成功！');
    }
    
    this._currentExecution.set({ ...execution });
  }
  
  // ============ 🆕 無劇本模式對話生成 ============
  
  /**
   * P0: 無劇本模式 - AI 自主生成下一條對話
   */
  async generateScriptlessMessage(execution: ExecutionState): Promise<{
    roleId: string;
    roleName: string;
    content: string;
    reasoning: string;
  } | null> {
    if (execution.mode !== 'scriptless' || !execution.scriptlessConfig?.enabled) {
      return null;
    }
    
    const lastAnalysis = execution.stats.lastAnalysis;
    const messageHistory = execution.messageHistory || [];
    const currentPhase = execution.stats.currentPhase;
    
    // 選擇最適合的角色
    const selectedRole = this.selectRoleForScriptless(execution, lastAnalysis);
    if (!selectedRole) return null;
    
    // 構建 AI 生成 Prompt
    const prompt = this.buildScriptlessPrompt(execution, selectedRole, messageHistory);
    
    // 調用後端 AI 生成
    return new Promise((resolve) => {
      this.ipc.send('ai-team:generate-scriptless-message', {
        executionId: execution.id,
        roleId: selectedRole.id,
        roleName: selectedRole.name,
        rolePersonality: selectedRole.personality,
        roleSpeakingStyle: selectedRole.speakingStyle,
        prompt,
        context: {
          goal: execution.goal,
          intent: execution.intent,
          messageCount: messageHistory.length,
          interestScore: execution.stats.interestScore,
          currentStage: execution.conversionFunnel?.currentStage
        }
      });
      
      // 監聽生成結果
      this.ipc.once('ai-team:scriptless-message-generated', (data: any) => {
        if (data.executionId === execution.id) {
          resolve({
            roleId: selectedRole.id,
            roleName: selectedRole.name,
            content: data.content,
            reasoning: data.reasoning || '根據上下文自動生成'
          });
        } else {
          resolve(null);
        }
      });
      
      // 超時處理
      setTimeout(() => resolve(null), 30000);
    });
  }
  
  /**
   * 為無劇本模式選擇角色
   */
  private selectRoleForScriptless(
    execution: ExecutionState,
    analysis: RealtimeAnalysis | null | undefined
  ): RecommendedRole | null {
    if (execution.roles.length === 0) return null;
    
    // 根據分析建議選擇角色
    if (analysis?.suggestions.recommendedRole) {
      const recommended = execution.roles.find(r => r.id === analysis.suggestions.recommendedRole);
      if (recommended) return recommended;
    }
    
    // 避免連續使用同一個角色（最多 3 條）
    const recentRoles = (execution.messageHistory || [])
      .slice(-3)
      .filter(m => !m.isFromCustomer)
      .map(m => m.role);
    
    const lastRole = recentRoles[recentRoles.length - 1];
    const sameRoleCount = recentRoles.filter(r => r === lastRole).length;
    
    if (sameRoleCount >= 3) {
      // 換一個角色
      const otherRoles = execution.roles.filter(r => r.id !== lastRole);
      if (otherRoles.length > 0) {
        return otherRoles[Math.floor(Math.random() * otherRoles.length)];
      }
    }
    
    // 根據轉化階段選擇
    const stage = execution.conversionFunnel?.currentStage;
    if (stage === 'interest' || stage === 'intent') {
      const expert = execution.roles.find(r => r.type === 'professional');
      if (expert) return expert;
    }
    
    // 默認返回第一個角色
    return execution.roles[0];
  }
  
  /**
   * 構建無劇本模式 Prompt
   */
  private buildScriptlessPrompt(
    execution: ExecutionState,
    role: RecommendedRole,
    messageHistory: { role: string; content: string; isFromCustomer: boolean }[]
  ): string {
    const recentMessages = messageHistory.slice(-20);
    const historyText = recentMessages.map(m => 
      `${m.isFromCustomer ? '【客戶】' : `【${m.role}】`}: ${m.content}`
    ).join('\n');
    
    const stage = execution.conversionFunnel?.currentStage || 'contact';
    const stageGoals: Record<string, string> = {
      'contact': '建立聯繫，自然開場',
      'response': '保持互動，了解需求',
      'interest': '深入介紹，強調價值',
      'intent': '處理異議，推動決策',
      'conversion': '促成成交，確認訂單'
    };
    
    return `你是 ${role.name}，${role.personality}。

【說話風格】
${role.speakingStyle}

【當前目標】
${execution.goal}

【當前階段】
${stage} - ${stageGoals[stage] || '繼續對話'}

【客戶興趣度】
${execution.stats.interestScore}/100

【對話歷史】
${historyText || '（暫無對話）'}

【任務】
作為 ${role.name}，根據上下文生成一條自然的回覆。
- 保持角色人設
- 推進對話目標
- 不要生硬推銷
- 像真人聊天一樣自然
- 單條消息不超過 100 字

請直接輸出消息內容，不要有任何前綴或解釋：`;
  }
  
  // ============ 執行控制 ============
  
  /**
   * 確認並開始執行
   */
  confirmAndStart(executionId: string): boolean {
    const execution = this._executions().find(e => e.id === executionId);
    if (!execution) return false;
    
    execution.status = 'running';
    this._currentExecution.set(execution);
    this._executions.update(list => list.map(e => e.id === executionId ? execution : e));
    
    this.toast.success('AI 團隊已開始工作！');
    
    // 啟動後端 AI 執行任務
    this.startBackendExecution(execution);
    
    return true;
  }
  
  /**
   * 🆕 P0: 開始私聊轉化執行
   * 自動發送首條消息給目標用戶
   * 🔧 Phase 7: 修復為並行發送給所有目標用戶
   */
  beginPrivateChatExecution(execution: ExecutionState): void {
    if (!execution.targetUsers || execution.targetUsers.length === 0) {
      this.toast.warning('沒有目標用戶，無法開始私聊');
      return;
    }
    
    // 更新執行狀態為運行中
    execution.status = 'running';
    this._currentExecution.set({ ...execution });
    
    console.log('[DynamicEngine] 🚀 開始私聊執行:', {
      executionId: execution.id,
      targetUsers: execution.targetUsers.length,
      mode: execution.mode,
      roles: execution.roles?.length
    });
    
    // 啟動後端執行
    this.startBackendExecution(execution);
    
    // 🔧 Phase 7: 並行發送首條消息給所有目標用戶
    this.sendFirstMessageToAllUsers(execution);
    
    this.toast.success(`🚀 開始私聊轉化！目標：${execution.targetUsers.length} 人`);
  }
  
  /**
   * 🔧 Phase 7: 並行發送首條消息給所有目標用戶
   */
  private async sendFirstMessageToAllUsers(execution: ExecutionState): Promise<void> {
    const targetUsers = execution.targetUsers || [];
    const accountMatches = execution.accountMatches || [];
    
    if (targetUsers.length === 0) {
      console.log('[DynamicEngine] 無目標用戶');
      return;
    }
    
    if (accountMatches.length === 0) {
      this.toast.error('無可用帳號發送消息');
      return;
    }
    
    console.log(`[DynamicEngine] 🔄 並行發送首條消息給 ${targetUsers.length} 個目標用戶`);
    
    // 為每個目標用戶發送消息（使用不同帳號輪換）
    for (let i = 0; i < targetUsers.length; i++) {
      const targetUser = targetUsers[i];
      // 輪換使用帳號
      const accountMatch = accountMatches[i % accountMatches.length];
      
      const userName = targetUser.firstName || targetUser.username || targetUser.id;
      console.log(`[DynamicEngine] 📤 發送給用戶 ${i + 1}/${targetUsers.length}: ${userName}`);
      
      // 生成並發送首條消息
      this.sendFirstMessageToUser(execution, targetUser, accountMatch, i);
      
      // 短暫延遲避免 Telegram 限制（100-300ms）
      if (i < targetUsers.length - 1) {
        await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
      }
    }
    
    this.toast.info(`📤 已發送首條消息給 ${targetUsers.length} 個目標用戶`);
  }
  
  /**
   * 🔧 Phase 7: 發送首條消息給指定用戶
   */
  private async sendFirstMessageToUser(
    execution: ExecutionState,
    targetUser: any,
    accountMatch: any,
    userIndex: number
  ): Promise<void> {
    const userName = targetUser.firstName || targetUser.username || targetUser.id;
    const targetUserId = targetUser.telegramId || targetUser.id;
    
    // 生成首條消息
    const firstMessage = await this.generateFirstTouchMessage(execution, {
      id: targetUserId,
      name: userName
    });
    
    if (firstMessage) {
      // 發送到後端執行實際的私聊發送
      this.ipc.send('ai-team:send-private-message', {
        executionId: execution.id,
        accountId: accountMatch.accountId,
        accountPhone: accountMatch.accountPhone,
        roleId: accountMatch.roleId,
        roleName: accountMatch.roleName,
        targetUserId: targetUserId,
        targetUserName: userName,
        content: firstMessage,
        isFirstTouch: true,
        userIndex: userIndex
      });
      
      // 記錄到消息歷史
      if (!execution.messageHistory) execution.messageHistory = [];
      execution.messageHistory.push({
        role: accountMatch.roleName,
        content: firstMessage,
        timestamp: new Date().toISOString(),
        isFromCustomer: false
      });
      
      execution.stats.messagesSent++;
      this._currentExecution.set({ ...execution });
      
      console.log(`[DynamicEngine] ✓ 首條消息已發送給 ${userName}:`, firstMessage.substring(0, 50) + '...');
    }
  }
  
  /**
   * 🆕 P0: 發送首條觸達消息
   */
  private async sendFirstMessage(execution: ExecutionState): Promise<void> {
    const currentUser = execution.queue?.currentUser;
    if (!currentUser) {
      console.log('[DynamicEngine] 無當前目標用戶');
      return;
    }
    
    // 選擇第一個角色（通常是客戶經理）發送首條消息
    const firstRole = execution.roles?.[0];
    const firstMatch = execution.accountMatches?.find(m => m.roleId === firstRole?.id) || execution.accountMatches?.[0];
    
    if (!firstMatch) {
      this.toast.error('無可用帳號發送消息');
      return;
    }
    
    // 生成首條消息
    const firstMessage = await this.generateFirstTouchMessage(execution, currentUser);
    
    if (firstMessage) {
      // 發送到後端執行實際的私聊發送
      this.ipc.send('ai-team:send-private-message', {
        executionId: execution.id,
        accountId: firstMatch.accountId,
        accountPhone: firstMatch.accountPhone,
        roleId: firstMatch.roleId,
        roleName: firstMatch.roleName,
        targetUserId: currentUser.id,
        targetUserName: currentUser.name,
        content: firstMessage,
        isFirstTouch: true
      });
      
      // 記錄到消息歷史
      if (!execution.messageHistory) execution.messageHistory = [];
      execution.messageHistory.push({
        role: firstMatch.roleName,
        content: firstMessage,
        timestamp: new Date().toISOString(),
        isFromCustomer: false
      });
      
      execution.stats.messagesSent++;
      this._currentExecution.set({ ...execution });
      
      console.log('[DynamicEngine] 首條消息已發送:', firstMessage.substring(0, 50) + '...');
    }
  }
  
  /**
   * 🆕 P0: 生成首次觸達消息
   */
  private async generateFirstTouchMessage(
    execution: ExecutionState,
    targetUser: { id: string; name: string }
  ): Promise<string | null> {
    // 如果有營銷數據中的模板，使用模板
    if (execution.marketingData?.messageTemplates?.firstTouch) {
      return execution.marketingData.messageTemplates.firstTouch
        .replace('{name}', targetUser.name)
        .replace('{goal}', execution.goal);
    }
    
    // 否則使用 AI 生成
    return new Promise((resolve) => {
      const prompt = `你是一個專業的客戶經理，需要主動聯繫一位潛在客戶。

目標：${execution.goal}
客戶名稱：${targetUser.name}

請生成一條簡短、友好、自然的首次問候消息。要求：
1. 不要太銷售化，像朋友一樣打招呼
2. 可以提及對方可能感興趣的話題
3. 簡短（1-2句話）
4. 引起對方回覆的興趣

直接輸出消息內容：`;

      this.ipc.send('ai:generate-text', {
        prompt,
        maxTokens: 100,
        callback: 'ai-team:first-message-generated'
      });
      
      // 設置超時，如果 AI 沒響應則使用默認模板
      const timeout = setTimeout(() => {
        const defaultMessage = `您好！我是${execution.roles?.[0]?.name || '客戶經理'}，注意到您可能對我們的服務感興趣，方便聊聊嗎？`;
        resolve(defaultMessage);
      }, 5000);
      
      // 監聽一次性響應
      const cleanup = this.ipc.on('ai-team:first-message-generated', (data: { text: string }) => {
        clearTimeout(timeout);
        cleanup();
        resolve(data.text || `您好！請問有什麼可以幫您的嗎？`);
      });
    });
  }
  
  /**
   * 啟動後端 AI 執行任務（增強版）
   */
  private startBackendExecution(execution: ExecutionState): void {
    console.log('[DynamicEngine] 啟動後端執行:', execution.id, '模式:', execution.mode);
    console.log('[DynamicEngine] 🔍 調試 - roles:', execution.roles?.length, execution.roles);
    console.log('[DynamicEngine] 🔍 調試 - accountMatches:', execution.accountMatches?.length, execution.accountMatches);
    console.log('[DynamicEngine] 🔍 調試 - targetUsers:', execution.targetUsers?.length);
    
    // 發送到後端開始 AI 團隊執行
    this.ipc.send('ai-team:start-execution', {
      executionId: execution.id,
      goal: execution.goal,
      intent: execution.intent,
      strategy: execution.strategy,
      roles: execution.roles,
      marketingData: execution.marketingData,
      // 🆕 新增參數
      mode: execution.mode,
      accountMatches: execution.accountMatches,
      scriptlessConfig: execution.scriptlessConfig,
      analysisInterval: this.analysisInterval,
      targetUsers: execution.targetUsers  // 🆕 目標用戶列表
    });
    
    // 監聽執行進度更新
    this.setupExecutionListeners(execution.id);
    
    // 🆕 無劇本模式：啟動自動對話生成循環
    if (execution.mode === 'scriptless') {
      this.startScriptlessLoop(execution);
    }
  }
  
  /**
   * 🆕 啟動無劇本模式對話循環
   */
  private async startScriptlessLoop(execution: ExecutionState): Promise<void> {
    console.log('[DynamicEngine] 啟動無劇本模式對話循環');
    
    // 生成第一條消息
    const firstMessage = await this.generateScriptlessMessage(execution);
    if (firstMessage) {
      this.ipc.send('ai-team:send-scriptless-message', {
        executionId: execution.id,
        roleId: firstMessage.roleId,
        content: firstMessage.content
      });
      
      execution.stats.messagesSent++;
      this._currentExecution.set({ ...execution });
    }
  }
  
  /**
   * 設置執行監聽器
   */
  private setupExecutionListeners(executionId: string): void {
    // 監聽消息發送成功
    this.ipc.on('ai-team:message-sent', (data: any) => {
      if (data.executionId === executionId) {
        this.updateExecutionStats(executionId, {
          messagesSent: data.totalSent
        });
      }
    });
    
    // 監聽收到回覆
    this.ipc.on('ai-team:response-received', (data: any) => {
      if (data.executionId === executionId) {
        this.updateExecutionStats(executionId, {
          responsesReceived: data.totalResponses,
          interestScore: data.interestScore
        });
      }
    });
    
    // 監聽階段變化
    this.ipc.on('ai-team:phase-changed', (data: any) => {
      if (data.executionId === executionId) {
        this.updateExecutionStats(executionId, {
          currentPhase: data.phase
        });
        this.toast.info(`📊 進入階段 ${data.phase + 1}: ${data.phaseName}`);
      }
    });
    
    // 監聽執行完成
    this.ipc.on('ai-team:execution-completed', (data: any) => {
      if (data.executionId === executionId) {
        this.updateExecutionStatus(executionId, 'completed');
        this.toast.success(`🎉 任務完成！發送 ${data.totalSent} 條消息，收到 ${data.totalResponses} 個回覆`);
      }
    });
    
    // 🆕 監聽客戶回覆（增強版：含轉化信號檢測）
    this.ipc.on('ai-team:customer-reply', async (data: any) => {
      if (data.executionId === executionId) {
        console.log('[DynamicEngine] 收到客戶回覆:', data.firstName, data.text?.substring(0, 50));
        
        // 更新統計
        this.updateExecutionStats(executionId, {
          responsesReceived: data.totalResponses
        });
        
        // 添加到消息歷史
        const execution = this._currentExecution();
        if (execution) {
          if (!execution.messageHistory) execution.messageHistory = [];
          execution.messageHistory.push({
            role: 'customer',
            content: data.text,
            timestamp: new Date().toISOString(),
            isFromCustomer: true
          });
          this._currentExecution.set({ ...execution });
          
          // 🆕 P1: 檢測轉化信號
          const signalResult = this.detectConversionSignal(data.text);
          if (signalResult.hasSignal) {
            this.handleConversionSignal(execution, data, signalResult);
          }
          
          // 🆕 更新意向評分
          this.updateIntentScore(execution, data.text);
        }
        
        this.toast.info(`💬 客戶 ${data.firstName || data.username} 回覆了消息`);
      }
    });
    
    // 🆕 監聽觸發下一條消息的事件（增強版：私聊 + 角色切換 + 擬人化延遲）
    this.ipc.on('ai-team:trigger-next-message', async (data: any) => {
      if (data.executionId === executionId) {
        console.log('[DynamicEngine] 觸發下一條消息:', data.customerName);
        
        const execution = this._currentExecution();
        if (!execution || execution.status !== 'running') return;
        
        // 劇本模式跳過自動生成
        if (execution.mode === 'scripted') return;
        
        // 🆕 添加擬人化延遲（15-45秒隨機，模擬思考和打字時間）
        const thinkDelay = 15000 + Math.random() * 30000;
        console.log(`[DynamicEngine] 擬人化延遲 ${(thinkDelay / 1000).toFixed(1)} 秒後回覆`);
        
        await new Promise(resolve => setTimeout(resolve, thinkDelay));
        
        // 再次檢查狀態（可能已被暫停）
        const currentExec = this._currentExecution();
        if (!currentExec || currentExec.status !== 'running') return;
        
        // 執行動態分析（如果達到間隔）
        const messageCount = currentExec.messageHistory?.length || 0;
        if (messageCount > 0 && messageCount % this.analysisInterval === 0) {
          await this.performDynamicAnalysis(currentExec);
        }
        
        // 🆕 智能選擇角色（基於對話內容）
        const selectedRole = this.selectRoleForAutoReply(currentExec, data.customerMessage);
        const match = currentExec.accountMatches?.find(m => m.roleId === selectedRole?.id) || currentExec.accountMatches?.[0];
        
        if (!match) {
          console.log('[DynamicEngine] 無可用帳號發送回覆');
          return;
        }
        
        // 生成回覆消息
        const nextMessage = await this.generateScriptlessMessage(currentExec);
        
        if (nextMessage) {
          // 🆕 使用私聊發送
          this.ipc.send('ai-team:send-private-message', {
            executionId: currentExec.id,
            accountId: match.accountId,
            accountPhone: match.accountPhone,
            roleId: match.roleId,
            roleName: match.roleName,
            targetUserId: data.customerId,
            targetUserName: data.customerName,
            content: nextMessage.content,
            isFirstTouch: false
          });
          
          // 記錄到消息歷史
          if (!currentExec.messageHistory) currentExec.messageHistory = [];
          currentExec.messageHistory.push({
            role: match.roleName,
            content: nextMessage.content,
            timestamp: new Date().toISOString(),
            isFromCustomer: false
          });
          
          currentExec.stats.messagesSent++;
          this._currentExecution.set({ ...currentExec });
        }
      }
    });
    
    // 🆕 監聽私聊消息發送成功
    this.ipc.on('ai-team:private-message-sent', (data: any) => {
      if (data.executionId === executionId && data.success) {
        console.log('[DynamicEngine] ✅ 私聊發送成功:', data.targetUserName);
      }
    });
  }
  
  /**
   * 🆕 智能選擇回覆角色
   */
  private selectRoleForAutoReply(
    execution: ExecutionState,
    customerMessage?: string
  ): RecommendedRole | undefined {
    const roles = execution.roles || [];
    if (roles.length === 0) return undefined;
    if (roles.length === 1) return roles[0];
    
    const lowerMsg = customerMessage?.toLowerCase() || '';
    
    // 價格/購買相關 → 服務專員
    if (lowerMsg.includes('多少錢') || lowerMsg.includes('價格') || lowerMsg.includes('買') || lowerMsg.includes('付款')) {
      return roles.find(r => r.name.includes('服務') || r.name.includes('專員')) || roles[0];
    }
    
    // 專業問題 → 方案專家
    if (lowerMsg.includes('怎麼') || lowerMsg.includes('如何') || lowerMsg.includes('什麼')) {
      return roles.find(r => r.name.includes('專家') || r.name.includes('顧問')) || roles[0];
    }
    
    // 輪換角色，避免連續使用同一角色
    const recentRoles = (execution.messageHistory || [])
      .filter(m => !m.isFromCustomer)
      .slice(-3)
      .map(m => m.role);
    
    const lastRole = recentRoles[recentRoles.length - 1];
    const availableRoles = roles.filter(r => r.name !== lastRole);
    
    return availableRoles.length > 0 
      ? availableRoles[Math.floor(Math.random() * availableRoles.length)]
      : roles[0];
  }
  
  /**
   * 更新執行統計
   */
  private updateExecutionStats(executionId: string, updates: Partial<ExecutionState['stats']>): void {
    const execution = this._executions().find(e => e.id === executionId);
    if (!execution) return;
    
    execution.stats = { ...execution.stats, ...updates };
    this._executions.update(list => list.map(e => e.id === executionId ? execution : e));
    
    if (this._currentExecution()?.id === executionId) {
      this._currentExecution.set(execution);
    }
  }
  
  /**
   * 暫停執行
   */
  pauseExecution(executionId: string): boolean {
    return this.updateExecutionStatus(executionId, 'paused');
  }
  
  /**
   * 恢復執行
   */
  resumeExecution(executionId: string): boolean {
    return this.updateExecutionStatus(executionId, 'running');
  }
  
  /**
   * 停止執行
   */
  stopExecution(executionId: string): boolean {
    return this.updateExecutionStatus(executionId, 'completed');
  }
  
  private updateExecutionStatus(executionId: string, status: ExecutionState['status']): boolean {
    const execution = this._executions().find(e => e.id === executionId);
    if (!execution) return false;
    
    execution.status = status;
    this._executions.update(list => list.map(e => e.id === executionId ? execution : e));
    
    if (this._currentExecution()?.id === executionId) {
      this._currentExecution.set(execution);
    }
    
    return true;
  }
  
  // ============ 🆕 任務隊列管理 ============
  
  /**
   * 標記當前用戶完成並移動到下一個
   */
  completeCurrentUser(result: 'converted' | 'interested' | 'neutral' | 'rejected' | 'no_response'): boolean {
    const execution = this._currentExecution();
    if (!execution?.queue?.currentUser) return false;
    
    const currentUser = execution.queue.currentUser;
    const startTime = new Date(currentUser.startTime).getTime();
    const duration = Math.round((Date.now() - startTime) / 1000);
    
    // 添加到已完成列表
    execution.queue.completedUsers.push({
      id: currentUser.id,
      name: currentUser.name,
      result,
      messagesExchanged: execution.messageHistory?.length || 0,
      duration
    });
    
    execution.queue.processedUsers++;
    
    // 通知後端
    this.ipc.send('ai-team:user-completed', {
      executionId: execution.id,
      userId: currentUser.id,
      result,
      duration
    });
    
    // 移動到下一個用戶
    return this.moveToNextUser();
  }
  
  /**
   * 移動到隊列中的下一個用戶
   */
  moveToNextUser(): boolean {
    const execution = this._currentExecution();
    if (!execution?.queue || !execution.targetUsers) return false;
    
    const nextUserId = execution.queue.pendingUsers.shift();
    if (!nextUserId) {
      // 隊列已完成
      this.toast.success(`🎉 所有 ${execution.queue.totalUsers} 個目標用戶處理完畢！`);
      execution.queue.currentUser = undefined;
      this._currentExecution.set({ ...execution });
      
      // 發送完成事件
      this.ipc.send('ai-team:queue-completed', {
        executionId: execution.id,
        stats: {
          total: execution.queue.totalUsers,
          completed: execution.queue.completedUsers.length,
          results: this.calculateQueueResults(execution.queue.completedUsers)
        }
      });
      
      return false;
    }
    
    // 找到下一個用戶
    const nextUser = execution.targetUsers.find(u => String(u.id) === nextUserId);
    if (!nextUser) return false;
    
    execution.queue.currentUserIndex++;
    execution.queue.currentUser = {
      id: nextUserId,
      name: nextUser.firstName || nextUser.username || nextUserId,
      startTime: new Date().toISOString()
    };
    
    // 清空消息歷史（新用戶）
    execution.messageHistory = [];
    execution.conversionFunnel = {
      currentStage: 'contact',
      stageHistory: [{ stage: 'contact', enteredAt: new Date().toISOString(), messageCount: 0 }],
      keyMoments: []
    };
    
    this._currentExecution.set({ ...execution });
    
    // 通知後端開始處理新用戶
    this.ipc.send('ai-team:next-user', {
      executionId: execution.id,
      userId: nextUserId,
      userName: execution.queue.currentUser.name,
      userIndex: execution.queue.currentUserIndex,
      remaining: execution.queue.pendingUsers.length
    });
    
    this.toast.info(`📋 開始處理第 ${execution.queue.currentUserIndex + 1}/${execution.queue.totalUsers} 個用戶：${execution.queue.currentUser.name}`);
    
    return true;
  }
  
  /**
   * 跳過當前用戶
   */
  skipCurrentUser(): boolean {
    return this.completeCurrentUser('no_response');
  }
  
  /**
   * 計算隊列結果統計
   */
  private calculateQueueResults(completedUsers: { result: string }[]): { [key: string]: number } {
    const results: { [key: string]: number } = {
      converted: 0,
      interested: 0,
      neutral: 0,
      rejected: 0,
      no_response: 0
    };
    
    completedUsers.forEach(u => {
      if (results[u.result] !== undefined) {
        results[u.result]++;
      }
    });
    
    return results;
  }
}
