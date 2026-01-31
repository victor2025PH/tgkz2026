/**
 * 協作編排服務
 * Collaboration Orchestrator Service
 * 
 * 🆕 P1 階段：完善營銷邏輯流程
 * 
 * 職責：
 * - 多角色有序入場編排
 * - 對話節奏控制
 * - 角色間互動邏輯
 * - 轉化階段追蹤
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService } from '../electron-ipc.service';
import { ToastService } from '../toast.service';
import { MarketingAnalyticsService } from '../services/marketing-analytics.service';

// ============ 類型定義 ============

// 角色入場配置
export interface RoleEntryConfig {
  roleId: string;
  roleName: string;
  roleIcon: string;
  accountId: number;
  accountPhone: string;
  entryOrder: number;           // 入場順序（1=主攻, 2+=輔助）
  entryDelaySeconds: number;    // 入場延遲（秒）
  entryType: 'opener' | 'supporter' | 'atmosphere' | 'closer';
  openingMessage?: string;      // 開場白
}

// 對話節奏配置
export interface ConversationRhythm {
  minIntervalSeconds: number;   // 最小發言間隔
  maxIntervalSeconds: number;   // 最大發言間隔
  waitForUserReply: boolean;    // 是否等待用戶回覆
  userSilenceTimeoutSeconds: number;  // 用戶沉默超時
  roleRotationStrategy: 'sequential' | 'random' | 'contextual';  // 角色輪換策略
}

// 角色互動配置
export interface RoleInteraction {
  type: 'agree' | 'complement' | 'ask_question' | 'share_experience' | 'hype';
  triggerCondition: string;     // 觸發條件
  probability: number;          // 觸發概率 (0-1)
  templates: string[];          // 回覆模板
}

// 轉化階段
export type ConversionStage = 
  | 'opening'       // 開場階段
  | 'building_trust'  // 建立信任
  | 'discovering_needs'  // 發現需求
  | 'presenting_value'   // 展示價值
  | 'handling_objections'  // 處理異議
  | 'closing'       // 促成成交
  | 'follow_up';    // 跟進服務

// 轉化階段配置
export interface StageConfig {
  stage: ConversionStage;
  primaryRole: string;          // 主要負責角色
  supportRoles: string[];       // 輔助角色
  objectives: string[];         // 階段目標
  transitionSignals: string[];  // 進入下一階段的信號
  suggestedMessages: { role: string; message: string }[];
}

// 協作會話
export interface CollaborationSession {
  id: string;
  groupId?: string;
  targetUserId: string;
  targetUserName: string;
  status: 'initializing' | 'active' | 'paused' | 'completed' | 'failed';
  
  // 角色配置
  roles: RoleEntryConfig[];
  
  // 節奏配置
  rhythm: ConversationRhythm;
  
  // 當前狀態
  currentStage: ConversionStage;
  currentSpeaker: string | null;
  lastMessageTime: Date | null;
  messageCount: number;
  userResponseCount: number;
  
  // 對話歷史
  conversationHistory: {
    role: string;
    content: string;
    timestamp: Date;
    isUser: boolean;
  }[];
  
  // 統計
  stageHistory: { stage: ConversionStage; enteredAt: Date; duration?: number }[];
  interestScore: number;        // 用戶興趣度 (0-100)
  
  createdAt: Date;
  updatedAt: Date;
}

// ============ 服務實現 ============

@Injectable({
  providedIn: 'root'
})
export class CollaborationOrchestratorService {
  private ipc = inject(ElectronIpcService);
  private toast = inject(ToastService);
  private analytics = inject(MarketingAnalyticsService);
  
  // 活躍會話
  private _sessions = signal<Map<string, CollaborationSession>>(new Map());
  sessions = computed(() => Array.from(this._sessions().values()));
  
  // 階段配置
  private stageConfigs: Map<ConversionStage, StageConfig> = new Map([
    ['opening', {
      stage: 'opening',
      primaryRole: 'consultant',
      supportRoles: [],
      objectives: ['引起注意', '建立初步聯繫'],
      transitionSignals: ['用戶回覆', '用戶表達興趣'],
      suggestedMessages: []
    }],
    ['building_trust', {
      stage: 'building_trust',
      primaryRole: 'consultant',
      supportRoles: ['oldcustomer'],
      objectives: ['建立信任', '分享成功案例'],
      transitionSignals: ['用戶詢問細節', '用戶表達顧慮'],
      suggestedMessages: []
    }],
    ['discovering_needs', {
      stage: 'discovering_needs',
      primaryRole: 'consultant',
      supportRoles: ['expert'],
      objectives: ['了解用戶需求', '挖掘痛點'],
      transitionSignals: ['用戶說明需求', '用戶提出問題'],
      suggestedMessages: []
    }],
    ['presenting_value', {
      stage: 'presenting_value',
      primaryRole: 'expert',
      supportRoles: ['consultant', 'oldcustomer'],
      objectives: ['展示產品價值', '匹配用戶需求'],
      transitionSignals: ['用戶認可價值', '用戶詢問價格'],
      suggestedMessages: []
    }],
    ['handling_objections', {
      stage: 'handling_objections',
      primaryRole: 'consultant',
      supportRoles: ['manager', 'oldcustomer'],
      objectives: ['處理用戶疑慮', '解決顧慮'],
      transitionSignals: ['用戶疑慮消除', '用戶願意嘗試'],
      suggestedMessages: []
    }],
    ['closing', {
      stage: 'closing',
      primaryRole: 'consultant',
      supportRoles: ['manager'],
      objectives: ['促成成交', '引導下單'],
      transitionSignals: ['用戶同意購買', '用戶提供信息'],
      suggestedMessages: []
    }],
    ['follow_up', {
      stage: 'follow_up',
      primaryRole: 'support',
      supportRoles: ['consultant'],
      objectives: ['售後服務', '建立長期關係'],
      transitionSignals: [],
      suggestedMessages: []
    }]
  ]);
  
  // 角色互動模板
  private roleInteractions: RoleInteraction[] = [
    {
      type: 'agree',
      triggerCondition: 'after_main_role_speaks',
      probability: 0.6,
      templates: [
        '對，{主角色}說得對',
        '沒錯，我也這麼覺得',
        '是的，這點很重要'
      ]
    },
    {
      type: 'share_experience',
      triggerCondition: 'user_shows_doubt',
      probability: 0.8,
      templates: [
        '我之前也有這個顧慮，後來用了之後發現完全沒問題',
        '說實話一開始我也猶豫，但用了幾個月真的很穩',
        '我朋友介紹我的時候我也不太信，現在自己也在推薦別人'
      ]
    },
    {
      type: 'hype',
      triggerCondition: 'user_silent_too_long',
      probability: 0.5,
      templates: [
        '最近活動力度挺大的',
        '聽說下週就恢復原價了',
        '今天諮詢的人挺多的'
      ]
    },
    {
      type: 'complement',
      triggerCondition: 'user_asks_technical',
      probability: 0.9,
      templates: [
        '這個我來補充一下...',
        '技術方面我比較了解，{問題}是這樣的...',
        '關於這個問題，我可以解釋一下...'
      ]
    }
  ];
  
  // 默認節奏配置
  private defaultRhythm: ConversationRhythm = {
    minIntervalSeconds: 15,
    maxIntervalSeconds: 45,
    waitForUserReply: true,
    userSilenceTimeoutSeconds: 180,  // 3分鐘無回覆則角色互動
    roleRotationStrategy: 'contextual'
  };
  
  constructor() {
    this.initializeListeners();
  }
  
  /**
   * 初始化監聽器
   */
  private initializeListeners() {
    // 監聽用戶消息
    this.ipc.on('collaboration:user-message', (data: { sessionId: string; message: string }) => {
      this.handleUserMessage(data.sessionId, data.message);
    });
    
    // 監聯消息發送結果
    this.ipc.on('collaboration:message-sent', (data: { sessionId: string; success: boolean }) => {
      if (data.success) {
        this.updateLastMessageTime(data.sessionId);
      }
    });
  }
  
  /**
   * 🆕 創建協作會話
   */
  createSession(config: {
    targetUserId: string;
    targetUserName: string;
    roles: RoleEntryConfig[];
    groupId?: string;
    rhythm?: Partial<ConversationRhythm>;
  }): CollaborationSession {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 按入場順序排序角色
    const sortedRoles = [...config.roles].sort((a, b) => a.entryOrder - b.entryOrder);
    
    const session: CollaborationSession = {
      id: sessionId,
      groupId: config.groupId,
      targetUserId: config.targetUserId,
      targetUserName: config.targetUserName,
      status: 'initializing',
      roles: sortedRoles,
      rhythm: { ...this.defaultRhythm, ...config.rhythm },
      currentStage: 'opening',
      currentSpeaker: null,
      lastMessageTime: null,
      messageCount: 0,
      userResponseCount: 0,
      conversationHistory: [],
      stageHistory: [{ stage: 'opening', enteredAt: new Date() }],
      interestScore: 50,  // 初始中等興趣
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this._sessions.update(sessions => {
      const newSessions = new Map(sessions);
      newSessions.set(sessionId, session);
      return newSessions;
    });
    
    console.log(`[Orchestrator] 創建協作會話: ${sessionId}, 角色數: ${sortedRoles.length}`);
    return session;
  }
  
  /**
   * 🆕 開始協作流程
   */
  async startCollaboration(sessionId: string): Promise<boolean> {
    const session = this._sessions().get(sessionId);
    if (!session) {
      this.toast.error('會話不存在');
      return false;
    }
    
    // 更新狀態
    this.updateSession(sessionId, { status: 'active' });
    
    // 執行角色有序入場
    await this.executeRoleEntry(session);
    
    return true;
  }
  
  /**
   * 🆕 執行角色有序入場
   */
  private async executeRoleEntry(session: CollaborationSession) {
    console.log(`[Orchestrator] 開始角色入場: ${session.roles.length} 個角色`);
    
    for (const role of session.roles) {
      // 等待入場延遲
      if (role.entryDelaySeconds > 0) {
        console.log(`[Orchestrator] ${role.roleName} 等待 ${role.entryDelaySeconds} 秒後入場`);
        await this.delay(role.entryDelaySeconds * 1000);
      }
      
      // 檢查會話是否仍然活躍
      const currentSession = this._sessions().get(session.id);
      if (!currentSession || currentSession.status !== 'active') {
        console.log(`[Orchestrator] 會話已停止，中斷入場`);
        break;
      }
      
      // 發送入場消息
      if (role.openingMessage) {
        await this.sendRoleMessage(session.id, role.roleId, role.openingMessage);
      } else {
        // 生成默認開場白
        const openingMessage = this.generateOpeningMessage(role, session);
        await this.sendRoleMessage(session.id, role.roleId, openingMessage);
      }
      
      // 更新當前發言者
      this.updateSession(session.id, { currentSpeaker: role.roleId });
      
      console.log(`[Orchestrator] ${role.roleName} 已入場`);
    }
    
    // 開始對話節奏控制
    this.startRhythmControl(session.id);
  }
  
  /**
   * 🆕 生成開場白
   */
  private generateOpeningMessage(role: RoleEntryConfig, session: CollaborationSession): string {
    const templates: Record<string, string[]> = {
      opener: [
        `您好 ${session.targetUserName}！我是{角色名}，很高興認識您`,
        `Hi ${session.targetUserName}，我是負責{角色職責}的{角色名}`,
        `${session.targetUserName} 您好！歡迎加入，我是{角色名}`
      ],
      supporter: [
        `大家好，我是{角色名}`,
        `{角色名}來了，有問題可以問我`,
        `我是{角色名}，很高興能幫到大家`
      ],
      atmosphere: [
        `哈囉~`,
        `來了來了`,
        `終於找到組織了`
      ],
      closer: [
        `您好，我是{角色名}，負責為您處理後續事宜`,
        `需要任何幫助隨時找我`
      ]
    };
    
    const roleTemplates = templates[role.entryType] || templates.supporter;
    const template = roleTemplates[Math.floor(Math.random() * roleTemplates.length)];
    
    return template
      .replace('{角色名}', role.roleName)
      .replace('{角色職責}', this.getRolePurpose(role.roleId));
  }
  
  /**
   * 獲取角色職責描述
   */
  private getRolePurpose(roleId: string): string {
    const purposes: Record<string, string> = {
      consultant: '業務諮詢',
      expert: '技術支持',
      oldcustomer: '客戶服務',
      support: '售後服務',
      manager: '客戶關係',
      atmosphere: '社群互動'
    };
    return purposes[roleId] || '客戶服務';
  }
  
  /**
   * 🆕 發送角色消息
   */
  private async sendRoleMessage(sessionId: string, roleId: string, content: string) {
    const session = this._sessions().get(sessionId);
    if (!session) return;
    
    const role = session.roles.find(r => r.roleId === roleId);
    if (!role) return;
    
    // 發送到後端
    this.ipc.send('collaboration:send-message', {
      sessionId,
      groupId: session.groupId,
      targetUserId: session.targetUserId,
      accountPhone: role.accountPhone,
      content,
      roleId,
      roleName: role.roleName
    });
    
    // 更新會話歷史
    this.updateSession(sessionId, {
      messageCount: session.messageCount + 1,
      lastMessageTime: new Date(),
      conversationHistory: [
        ...session.conversationHistory,
        { role: role.roleName, content, timestamp: new Date(), isUser: false }
      ]
    });
    
    console.log(`[Orchestrator] [${role.roleName}]: ${content.substring(0, 50)}...`);
  }
  
  /**
   * 🆕 開始對話節奏控制
   */
  private startRhythmControl(sessionId: string) {
    const checkInterval = setInterval(() => {
      const session = this._sessions().get(sessionId);
      if (!session || session.status !== 'active') {
        clearInterval(checkInterval);
        return;
      }
      
      this.checkAndTriggerRoleInteraction(session);
    }, 10000);  // 每10秒檢查一次
    
    console.log(`[Orchestrator] 已啟動節奏控制: ${sessionId}`);
  }
  
  /**
   * 🆕 檢查並觸發角色互動
   */
  private async checkAndTriggerRoleInteraction(session: CollaborationSession) {
    if (!session.lastMessageTime) return;
    
    const silenceSeconds = (Date.now() - session.lastMessageTime.getTime()) / 1000;
    
    // 如果用戶沉默超過閾值，觸發角色互動
    if (silenceSeconds > session.rhythm.userSilenceTimeoutSeconds) {
      console.log(`[Orchestrator] 用戶沉默 ${silenceSeconds.toFixed(0)} 秒，觸發角色互動`);
      
      // 選擇一個輔助角色發言
      const supportRole = this.selectSupportRole(session);
      if (supportRole) {
        const interaction = this.selectInteraction('user_silent_too_long');
        if (interaction) {
          const message = this.generateInteractionMessage(interaction, session);
          await this.sendRoleMessage(session.id, supportRole.roleId, message);
        }
      }
    }
  }
  
  /**
   * 🆕 處理用戶消息
   */
  private handleUserMessage(sessionId: string, message: string) {
    const session = this._sessions().get(sessionId);
    if (!session) return;
    
    console.log(`[Orchestrator] 收到用戶消息: ${message.substring(0, 50)}...`);
    
    // 更新會話
    this.updateSession(sessionId, {
      userResponseCount: session.userResponseCount + 1,
      conversationHistory: [
        ...session.conversationHistory,
        { role: 'user', content: message, timestamp: new Date(), isUser: true }
      ]
    });
    
    // 分析用戶意圖
    const intent = this.analyzeUserIntent(message);
    
    // 更新興趣度
    const newInterestScore = this.calculateInterestScore(session, message);
    this.updateSession(sessionId, { interestScore: newInterestScore });
    
    // 檢查是否需要切換階段
    this.checkStageTransition(sessionId, message, intent);
    
    // 選擇回覆角色
    const responder = this.selectResponder(session, intent);
    
    // 觸發 AI 生成回覆
    this.triggerAIResponse(sessionId, responder, message, intent);
  }
  
  /**
   * 🆕 分析用戶意圖
   */
  private analyzeUserIntent(message: string): string {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('價格') || lowerMsg.includes('多少錢') || lowerMsg.includes('費用')) {
      return 'asking_price';
    }
    if (lowerMsg.includes('怎麼用') || lowerMsg.includes('如何') || lowerMsg.includes('教程')) {
      return 'asking_usage';
    }
    if (lowerMsg.includes('安全') || lowerMsg.includes('可靠') || lowerMsg.includes('擔心')) {
      return 'expressing_concern';
    }
    if (lowerMsg.includes('好的') || lowerMsg.includes('可以') || lowerMsg.includes('行')) {
      return 'positive_response';
    }
    if (lowerMsg.includes('不') || lowerMsg.includes('算了') || lowerMsg.includes('再說')) {
      return 'negative_response';
    }
    
    return 'general_inquiry';
  }
  
  /**
   * 🆕 計算興趣度
   */
  private calculateInterestScore(session: CollaborationSession, message: string): number {
    let score = session.interestScore;
    
    // 根據用戶回覆調整興趣度
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('有興趣') || lowerMsg.includes('想了解') || lowerMsg.includes('怎麼買')) {
      score += 15;
    } else if (lowerMsg.includes('價格') || lowerMsg.includes('多少錢')) {
      score += 10;  // 詢問價格說明有意向
    } else if (lowerMsg.includes('好的') || lowerMsg.includes('可以')) {
      score += 5;
    } else if (lowerMsg.includes('不需要') || lowerMsg.includes('算了')) {
      score -= 20;
    } else if (lowerMsg.includes('再考慮') || lowerMsg.includes('再說')) {
      score -= 10;
    } else {
      score += 2;  // 只要回覆就加一點分
    }
    
    // 限制在 0-100 之間
    return Math.max(0, Math.min(100, score));
  }
  
  /**
   * 🆕 檢查階段轉換
   */
  private checkStageTransition(sessionId: string, message: string, intent: string) {
    const session = this._sessions().get(sessionId);
    if (!session) return;
    
    const currentStage = session.currentStage;
    let nextStage: ConversionStage | null = null;
    
    // 根據當前階段和用戶意圖判斷是否轉換
    switch (currentStage) {
      case 'opening':
        if (intent !== 'negative_response') {
          nextStage = 'building_trust';
        }
        break;
      case 'building_trust':
        if (intent === 'asking_usage' || intent === 'asking_price') {
          nextStage = 'discovering_needs';
        }
        break;
      case 'discovering_needs':
        if (session.messageCount >= 6) {
          nextStage = 'presenting_value';
        }
        break;
      case 'presenting_value':
        if (intent === 'expressing_concern') {
          nextStage = 'handling_objections';
        } else if (intent === 'positive_response' || intent === 'asking_price') {
          nextStage = 'closing';
        }
        break;
      case 'handling_objections':
        if (intent === 'positive_response') {
          nextStage = 'closing';
        }
        break;
      case 'closing':
        if (intent === 'positive_response') {
          nextStage = 'follow_up';
        }
        break;
    }
    
    if (nextStage && nextStage !== currentStage) {
      this.transitionToStage(sessionId, nextStage);
    }
  }
  
  /**
   * 🆕 轉換到新階段
   */
  private transitionToStage(sessionId: string, newStage: ConversionStage) {
    const session = this._sessions().get(sessionId);
    if (!session) return;
    
    console.log(`[Orchestrator] 階段轉換: ${session.currentStage} → ${newStage}`);
    
    // 更新階段歷史
    const now = new Date();
    const lastStageEntry = session.stageHistory[session.stageHistory.length - 1];
    if (lastStageEntry) {
      lastStageEntry.duration = now.getTime() - new Date(lastStageEntry.enteredAt).getTime();
    }
    
    this.updateSession(sessionId, {
      currentStage: newStage,
      stageHistory: [
        ...session.stageHistory,
        { stage: newStage, enteredAt: now }
      ]
    });
    
    this.toast.info(`🎯 進入${this.getStageName(newStage)}階段`);
  }
  
  /**
   * 獲取階段名稱
   */
  private getStageName(stage: ConversionStage): string {
    const names: Record<ConversionStage, string> = {
      opening: '開場',
      building_trust: '建立信任',
      discovering_needs: '發現需求',
      presenting_value: '展示價值',
      handling_objections: '處理異議',
      closing: '促成成交',
      follow_up: '跟進服務'
    };
    return names[stage];
  }
  
  /**
   * 🆕 選擇回覆角色
   */
  private selectResponder(session: CollaborationSession, intent: string): RoleEntryConfig {
    const stageConfig = this.stageConfigs.get(session.currentStage);
    
    // 根據意圖選擇角色
    if (intent === 'asking_usage' || intent.includes('technical')) {
      // 技術問題交給專家
      const expert = session.roles.find(r => r.roleId === 'expert');
      if (expert) return expert;
    }
    
    if (intent === 'expressing_concern') {
      // 顧慮交給老客戶分享經驗
      const oldcustomer = session.roles.find(r => r.roleId === 'oldcustomer');
      if (oldcustomer) return oldcustomer;
    }
    
    // 默認使用主要角色
    if (stageConfig) {
      const primary = session.roles.find(r => r.roleId === stageConfig.primaryRole);
      if (primary) return primary;
    }
    
    // 兜底：使用第一個角色
    return session.roles[0];
  }
  
  /**
   * 🆕 選擇輔助角色
   */
  private selectSupportRole(session: CollaborationSession): RoleEntryConfig | null {
    const stageConfig = this.stageConfigs.get(session.currentStage);
    if (!stageConfig || stageConfig.supportRoles.length === 0) {
      return null;
    }
    
    // 選擇一個與當前發言者不同的輔助角色
    const supportRoleId = stageConfig.supportRoles.find(
      id => id !== session.currentSpeaker
    ) || stageConfig.supportRoles[0];
    
    return session.roles.find(r => r.roleId === supportRoleId) || null;
  }
  
  /**
   * 🆕 選擇互動類型
   */
  private selectInteraction(condition: string): RoleInteraction | null {
    const matchingInteractions = this.roleInteractions.filter(
      i => i.triggerCondition === condition
    );
    
    if (matchingInteractions.length === 0) return null;
    
    // 根據概率選擇
    for (const interaction of matchingInteractions) {
      if (Math.random() < interaction.probability) {
        return interaction;
      }
    }
    
    return null;
  }
  
  /**
   * 🆕 生成互動消息
   */
  private generateInteractionMessage(interaction: RoleInteraction, session: CollaborationSession): string {
    const template = interaction.templates[Math.floor(Math.random() * interaction.templates.length)];
    
    // 替換變量
    return template
      .replace('{主角色}', session.roles[0]?.roleName || '顧問')
      .replace('{目標用戶}', session.targetUserName);
  }
  
  /**
   * 🆕 觸發 AI 回覆
   */
  private triggerAIResponse(sessionId: string, responder: RoleEntryConfig, userMessage: string, intent: string) {
    const session = this._sessions().get(sessionId);
    if (!session) return;
    
    // 計算回覆延遲
    const delay = this.calculateResponseDelay(session);
    
    console.log(`[Orchestrator] 將由 ${responder.roleName} 在 ${delay}ms 後回覆`);
    
    // 發送到後端請求 AI 生成回覆
    setTimeout(() => {
      this.ipc.send('collaboration:generate-response', {
        sessionId,
        roleId: responder.roleId,
        roleName: responder.roleName,
        accountPhone: responder.accountPhone,
        userMessage,
        intent,
        stage: session.currentStage,
        conversationHistory: session.conversationHistory.slice(-10)  // 最近10條
      });
    }, delay);
  }
  
  /**
   * 計算回覆延遲
   */
  private calculateResponseDelay(session: CollaborationSession): number {
    const min = session.rhythm.minIntervalSeconds * 1000;
    const max = session.rhythm.maxIntervalSeconds * 1000;
    return min + Math.random() * (max - min);
  }
  
  /**
   * 更新會話
   */
  private updateSession(sessionId: string, updates: Partial<CollaborationSession>) {
    this._sessions.update(sessions => {
      const session = sessions.get(sessionId);
      if (!session) return sessions;
      
      const newSessions = new Map(sessions);
      newSessions.set(sessionId, { ...session, ...updates, updatedAt: new Date() });
      return newSessions;
    });
  }
  
  /**
   * 更新最後消息時間
   */
  private updateLastMessageTime(sessionId: string) {
    this.updateSession(sessionId, { lastMessageTime: new Date() });
  }
  
  /**
   * 工具方法：延遲
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 停止會話
   */
  stopSession(sessionId: string) {
    this.updateSession(sessionId, { status: 'paused' });
    console.log(`[Orchestrator] 會話已暫停: ${sessionId}`);
  }
  
  /**
   * 完成會話
   */
  completeSession(sessionId: string, outcome: 'converted' | 'interested' | 'neutral' | 'rejected' | 'no_response' = 'neutral', conversionValue?: number) {
    const session = this._sessions().get(sessionId);
    if (!session) return;
    
    this.updateSession(sessionId, { status: 'completed' });
    
    // 🆕 P2: 記錄到分析服務
    this.analytics.recordSession({
      sessionId: session.id,
      targetUserId: session.targetUserId,
      targetUserName: session.targetUserName,
      roles: session.roles.map(r => ({
        roleId: r.roleId,
        roleName: r.roleName,
        roleType: r.entryType,
        accountPhone: r.accountPhone
      })),
      messages: session.conversationHistory.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        isUser: m.isUser
      })),
      outcome,
      conversionValue,
      interestScore: session.interestScore,
      stagesReached: session.stageHistory.map(s => s.stage),
      finalStage: session.currentStage
    });
    
    console.log(`[Orchestrator] 會話已完成: ${sessionId}, 結果: ${outcome}`);
    this.toast.success('🎉 協作會話已完成');
  }
  
  /**
   * 獲取會話統計
   */
  getSessionStats(sessionId: string) {
    const session = this._sessions().get(sessionId);
    if (!session) return null;
    
    return {
      duration: Date.now() - session.createdAt.getTime(),
      messageCount: session.messageCount,
      userResponseCount: session.userResponseCount,
      interestScore: session.interestScore,
      currentStage: session.currentStage,
      stageHistory: session.stageHistory
    };
  }
}
