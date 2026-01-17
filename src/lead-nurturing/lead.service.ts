/**
 * TG-AI智控王 潛在客戶服務
 * Lead Service v1.0
 * 
 * 功能：
 * - 潛在客戶 CRUD 操作
 * - 評分計算和更新
 * - 階段管理
 * - 對話記錄管理
 * - 跟進計劃管理
 */

import { Injectable, signal, computed } from '@angular/core';
import {
  Lead,
  LeadScores,
  LeadProfile,
  LeadConversation,
  LeadMessage,
  FollowUp,
  LeadActivity,
  LeadNotification,
  FunnelStage,
  CreateLeadInput,
  UpdateLeadInput,
  LeadFilters,
  LeadSortOptions,
  ConversationType,
  FollowUpStatus,
  NotificationPriority,
  NotificationType,
  PurchaseSignal
} from './lead.models';

// ============ 配置 ============

const LEAD_CONFIG = {
  // 默認評分
  defaultScores: {
    overall: 30,
    trust: 20,
    engagement: 20,
    intent: 10,
    urgency: 10
  },
  
  // 默認培育配置
  defaultNurturingConfig: {
    enabled: true,
    businessFollowUpDays: 3,
    casualFollowUpDays: 5,
    maxFollowUps: 10,
    currentFollowUpCount: 0
  },
  
  // 階段對應的默認跟進間隔
  stageFollowUpDays: {
    stranger: { business: 3, casual: 7 },
    visitor: { business: 2, casual: 5 },
    lead: { business: 2, casual: 5 },
    qualified: { business: 1, casual: 3 },
    customer: { business: 7, casual: 7 },
    advocate: { business: 14, casual: 14 },
    dormant: { business: 14, casual: 30 }
  } as Record<FunnelStage, { business: number; casual: number }>,
  
  // 存儲key
  storageKeys: {
    leads: 'tgai-leads',
    conversations: 'tgai-lead-conversations',
    followUps: 'tgai-follow-ups',
    activities: 'tgai-lead-activities',
    notifications: 'tgai-lead-notifications'
  }
};

// ============ 購買信號關鍵詞 ============

const PURCHASE_SIGNALS = {
  strong: [
    '購買', '買', '下單', '付款', '付费', '怎麼買', '如何購買',
    '想要', '我要', '給我', '開通', '訂閱', '升級'
  ],
  medium: [
    '價格', '多少錢', '收費', '費用', '報價', '優惠', '折扣',
    '試用', '體驗', '演示', 'demo', '案例', '效果'
  ],
  weak: [
    '了解', '介紹', '功能', '特點', '區別', '對比', '適合'
  ]
};

@Injectable({
  providedIn: 'root'
})
export class LeadService {
  // ============ 狀態 ============
  
  // 潛在客戶列表
  private _leads = signal<Lead[]>([]);
  leads = computed(() => this._leads());
  
  // 對話記錄
  private _conversations = signal<Map<string, LeadConversation[]>>(new Map());
  conversations = computed(() => this._conversations());
  
  // 跟進計劃
  private _followUps = signal<FollowUp[]>([]);
  followUps = computed(() => this._followUps());
  
  // 活動記錄
  private _activities = signal<LeadActivity[]>([]);
  activities = computed(() => this._activities());
  
  // 通知
  private _notifications = signal<LeadNotification[]>([]);
  notifications = computed(() => this._notifications());
  
  // ============ 計算屬性 ============
  
  // 未讀通知數
  unreadNotificationCount = computed(() => 
    this._notifications().filter(n => !n.isRead).length
  );
  
  // 緊急通知
  urgentNotifications = computed(() =>
    this._notifications().filter(n => n.priority === 'urgent' && !n.isHandled)
  );
  
  // 需要跟進的客戶
  leadsNeedingFollowUp = computed(() => {
    const now = new Date();
    return this._leads().filter(lead => {
      if (!lead.isNurturing || lead.doNotContact) return false;
      if (!lead.nextFollowUpAt) return false;
      return new Date(lead.nextFollowUpAt) <= now;
    });
  });
  
  // 各階段客戶數量
  leadsByStage = computed(() => {
    const counts: Record<FunnelStage, number> = {
      stranger: 0,
      visitor: 0,
      lead: 0,
      qualified: 0,
      customer: 0,
      advocate: 0,
      dormant: 0
    };
    for (const lead of this._leads()) {
      counts[lead.stage]++;
    }
    return counts;
  });
  
  // 高意向客戶
  qualifiedLeads = computed(() =>
    this._leads().filter(l => l.stage === 'qualified' && !l.doNotContact)
  );
  
  // 今日待跟進
  todayFollowUps = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this._followUps().filter(f => {
      if (f.status !== 'scheduled' && f.status !== 'pending') return false;
      const scheduled = new Date(f.scheduledAt);
      return scheduled >= today && scheduled < tomorrow;
    });
  });
  
  constructor() {
    this.loadData();
  }
  
  // ============ CRUD 操作 ============
  
  /**
   * 創建潛在客戶
   */
  createLead(input: CreateLeadInput): Lead {
    const now = new Date();
    const id = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const lead: Lead = {
      id,
      peerId: input.peerId,
      username: input.username,
      displayName: input.displayName,
      firstName: input.firstName,
      lastName: input.lastName,
      avatar: input.avatar,
      
      stage: 'stranger',
      onlineStatus: 'unknown',
      isNurturing: input.startNurturing ?? true,
      doNotContact: false,
      
      scores: {
        ...LEAD_CONFIG.defaultScores,
        updatedAt: now
      },
      
      profile: this.createDefaultProfile(),
      source: input.source,
      tags: input.tags || [],
      
      nurturingConfig: { ...LEAD_CONFIG.defaultNurturingConfig },
      
      stats: {
        totalConversations: 0,
        messagesSent: 0,
        messagesReceived: 0,
        responseRate: 0,
        avgResponseTime: 0
      },
      
      firstContactAt: now,
      assignedAccountPhone: input.assignedAccountPhone,
      notes: input.notes,
      
      createdAt: now,
      updatedAt: now
    };
    
    // 如果啟用培育，計算下次跟進時間
    if (lead.isNurturing) {
      lead.nextFollowUpAt = this.calculateNextFollowUp(lead, 'business');
    }
    
    this._leads.update(leads => [...leads, lead]);
    
    // 記錄活動
    this.addActivity(lead.id, 'first_contact', '首次接觸客戶', {
      source: input.source.type,
      sourceGroup: input.source.groupTitle
    });
    
    this.saveData();
    
    console.log(`[LeadService] Created lead: ${lead.displayName} (${lead.id})`);
    
    return lead;
  }
  
  /**
   * 獲取潛在客戶
   */
  getLead(id: string): Lead | undefined {
    return this._leads().find(l => l.id === id);
  }
  
  /**
   * 通過 peerId 獲取潛在客戶
   */
  getLeadByPeerId(peerId: string): Lead | undefined {
    return this._leads().find(l => l.peerId === peerId);
  }
  
  /**
   * 更新潛在客戶
   */
  updateLead(id: string, input: UpdateLeadInput): boolean {
    const lead = this.getLead(id);
    if (!lead) return false;
    
    const oldStage = lead.stage;
    
    this._leads.update(leads =>
      leads.map(l => {
        if (l.id !== id) return l;
        
        // 正確合併 nurturingConfig，確保保留所有必需屬性
        const mergedNurturingConfig = input.nurturingConfig
          ? { ...l.nurturingConfig, ...input.nurturingConfig }
          : l.nurturingConfig;
        
        const updated: Lead = {
          ...l,
          ...input,
          nurturingConfig: mergedNurturingConfig,
          updatedAt: new Date()
        };
        
        // 如果更新了培育配置，重新計算下次跟進時間
        if (input.nurturingConfig || input.isNurturing !== undefined) {
          if (updated.isNurturing) {
            updated.nextFollowUpAt = this.calculateNextFollowUp(updated, 'business');
          } else {
            updated.nextFollowUpAt = undefined;
          }
        }
        
        return updated;
      })
    );
    
    // 記錄階段變更
    if (input.stage && input.stage !== oldStage) {
      this.addActivity(id, 'stage_changed', `階段從 ${this.getStageName(oldStage)} 變更為 ${this.getStageName(input.stage)}`, {
        from: oldStage,
        to: input.stage
      });
      
      // 發送階段變更通知
      if (input.stage === 'qualified') {
        this.addNotification({
          leadId: id,
          type: 'stage_change',
          priority: 'important',
          title: '🎯 新的高意向客戶',
          message: `${lead.displayName} 已標記為高意向客戶`,
          suggestedActions: [
            { label: '查看詳情', action: 'view_lead', params: { leadId: id } },
            { label: '立即跟進', action: 'follow_up', params: { leadId: id } }
          ]
        });
      }
    }
    
    this.saveData();
    return true;
  }
  
  /**
   * 刪除潛在客戶
   */
  deleteLead(id: string): boolean {
    const exists = this._leads().some(l => l.id === id);
    if (!exists) return false;
    
    this._leads.update(leads => leads.filter(l => l.id !== id));
    
    // 刪除相關數據
    this._conversations.update(map => {
      const newMap = new Map(map);
      newMap.delete(id);
      return newMap;
    });
    
    this._followUps.update(fus => fus.filter(f => f.leadId !== id));
    this._activities.update(acts => acts.filter(a => a.leadId !== id));
    this._notifications.update(notifs => notifs.filter(n => n.leadId !== id));
    
    this.saveData();
    return true;
  }
  
  /**
   * 獲取過濾後的潛在客戶列表
   */
  getFilteredLeads(filters: LeadFilters, sort?: LeadSortOptions): Lead[] {
    let result = [...this._leads()];
    
    // 應用過濾器
    if (filters.stage) {
      const stages = Array.isArray(filters.stage) ? filters.stage : [filters.stage];
      result = result.filter(l => stages.includes(l.stage));
    }
    
    if (filters.tags && filters.tags.length > 0) {
      result = result.filter(l => 
        filters.tags!.some(tag => l.tags.includes(tag))
      );
    }
    
    if (filters.isNurturing !== undefined) {
      result = result.filter(l => l.isNurturing === filters.isNurturing);
    }
    
    if (filters.scoreRange) {
      result = result.filter(l => 
        l.scores.overall >= filters.scoreRange!.min &&
        l.scores.overall <= filters.scoreRange!.max
      );
    }
    
    if (filters.source) {
      result = result.filter(l => l.source.type === filters.source);
    }
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(l =>
        l.displayName.toLowerCase().includes(search) ||
        l.username?.toLowerCase().includes(search) ||
        l.peerId.includes(search)
      );
    }
    
    if (filters.needsFollowUp) {
      const now = new Date();
      result = result.filter(l => 
        l.isNurturing && 
        l.nextFollowUpAt && 
        new Date(l.nextFollowUpAt) <= now
      );
    }
    
    // 應用排序
    if (sort) {
      result.sort((a, b) => {
        let comparison = 0;
        
        switch (sort.field) {
          case 'score':
            comparison = a.scores.overall - b.scores.overall;
            break;
          case 'lastInteraction':
            comparison = (a.lastInteractionAt?.getTime() || 0) - (b.lastInteractionAt?.getTime() || 0);
            break;
          case 'nextFollowUp':
            comparison = (a.nextFollowUpAt?.getTime() || Infinity) - (b.nextFollowUpAt?.getTime() || Infinity);
            break;
          case 'createdAt':
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
            break;
          case 'name':
            comparison = a.displayName.localeCompare(b.displayName);
            break;
        }
        
        return sort.direction === 'desc' ? -comparison : comparison;
      });
    }
    
    return result;
  }
  
  // ============ 評分管理 ============
  
  /**
   * 更新評分
   */
  updateScores(leadId: string, scores: Partial<LeadScores>): void {
    this._leads.update(leads =>
      leads.map(l => {
        if (l.id !== leadId) return l;
        
        const newScores = {
          ...l.scores,
          ...scores,
          updatedAt: new Date()
        };
        
        // 重新計算綜合評分
        newScores.overall = this.calculateOverallScore(newScores);
        
        return { ...l, scores: newScores, updatedAt: new Date() };
      })
    );
    
    this.addActivity(leadId, 'score_updated', '評分已更新');
    this.saveData();
  }
  
  /**
   * 計算綜合評分
   */
  private calculateOverallScore(scores: LeadScores): number {
    const weights = {
      trust: 0.25,
      engagement: 0.25,
      intent: 0.35,
      urgency: 0.15
    };
    
    return Math.round(
      scores.trust * weights.trust +
      scores.engagement * weights.engagement +
      scores.intent * weights.intent +
      scores.urgency * weights.urgency
    );
  }
  
  /**
   * 根據對話分析自動更新評分
   */
  analyzeAndUpdateScores(leadId: string, message: string, isFromLead: boolean): void {
    const lead = this.getLead(leadId);
    if (!lead) return;
    
    const scores = { ...lead.scores };
    
    if (isFromLead) {
      // 用戶回覆，提高參與度
      scores.engagement = Math.min(100, scores.engagement + 5);
      scores.trust = Math.min(100, scores.trust + 2);
      
      // 檢測購買信號
      const signal = this.detectPurchaseSignal(message);
      if (signal) {
        if (signal.type === 'strong') {
          scores.intent = Math.min(100, scores.intent + 20);
          scores.urgency = Math.min(100, scores.urgency + 15);
        } else if (signal.type === 'medium') {
          scores.intent = Math.min(100, scores.intent + 10);
          scores.urgency = Math.min(100, scores.urgency + 5);
        } else {
          scores.intent = Math.min(100, scores.intent + 5);
        }
        
        // 發送購買信號通知
        if (signal.type === 'strong') {
          this.addNotification({
            leadId,
            type: 'purchase_intent',
            priority: 'urgent',
            title: '💰 檢測到強購買意向',
            message: `${lead.displayName}: "${message.substring(0, 50)}..."`,
            data: { signal },
            suggestedActions: [
              { label: '立即回覆', action: 'reply', params: { leadId } },
              { label: '人工接管', action: 'takeover', params: { leadId } }
            ]
          });
        }
      }
    }
    
    this.updateScores(leadId, scores);
  }
  
  /**
   * 檢測購買信號
   */
  detectPurchaseSignal(message: string): PurchaseSignal | null {
    const lowerMessage = message.toLowerCase();
    
    for (const keyword of PURCHASE_SIGNALS.strong) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        return {
          type: 'strong',
          signal: keyword,
          message,
          detectedAt: new Date(),
          confidence: 0.9
        };
      }
    }
    
    for (const keyword of PURCHASE_SIGNALS.medium) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        return {
          type: 'medium',
          signal: keyword,
          message,
          detectedAt: new Date(),
          confidence: 0.7
        };
      }
    }
    
    for (const keyword of PURCHASE_SIGNALS.weak) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        return {
          type: 'weak',
          signal: keyword,
          message,
          detectedAt: new Date(),
          confidence: 0.5
        };
      }
    }
    
    return null;
  }
  
  // ============ 對話管理 ============
  
  /**
   * 添加消息到對話
   */
  addMessage(
    leadId: string,
    content: string,
    role: 'user' | 'assistant',
    options?: {
      isAIGenerated?: boolean;
      aiModel?: string;
      conversationType?: ConversationType;
    }
  ): LeadMessage {
    const lead = this.getLead(leadId);
    if (!lead) throw new Error(`Lead not found: ${leadId}`);
    
    const message: LeadMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
      isAIGenerated: options?.isAIGenerated ?? false,
      aiModel: options?.aiModel,
      isRead: role === 'assistant'
    };
    
    // 獲取或創建當前對話
    let conversations = this._conversations().get(leadId) || [];
    let currentConversation = conversations.find(c => !c.endedAt);
    
    if (!currentConversation) {
      currentConversation = {
        id: `conv_${Date.now()}`,
        leadId,
        type: options?.conversationType || 'nurture',
        messages: [],
        startedAt: new Date(),
        topics: [],
        sentimentTrend: 'unknown',
        purchaseSignals: []
      };
      conversations = [...conversations, currentConversation];
    }
    
    currentConversation.messages.push(message);
    
    // 檢測購買信號
    if (role === 'user') {
      const signal = this.detectPurchaseSignal(content);
      if (signal) {
        currentConversation.purchaseSignals.push(signal);
      }
      
      // 分析並更新評分
      this.analyzeAndUpdateScores(leadId, content, true);
    }
    
    // 更新對話列表
    this._conversations.update(map => {
      const newMap = new Map(map);
      newMap.set(leadId, conversations);
      return newMap;
    });
    
    // 更新客戶統計
    this._leads.update(leads =>
      leads.map(l => {
        if (l.id !== leadId) return l;
        
        const stats = { ...l.stats };
        if (role === 'assistant') {
          stats.messagesSent++;
        } else {
          stats.messagesReceived++;
          stats.totalConversations = conversations.length;
        }
        stats.responseRate = stats.messagesReceived / Math.max(1, stats.messagesSent);
        
        return {
          ...l,
          stats,
          lastInteractionAt: new Date(),
          updatedAt: new Date()
        };
      })
    );
    
    // 記錄活動
    this.addActivity(
      leadId,
      role === 'assistant' ? 'message_sent' : 'message_received',
      role === 'assistant' ? '發送消息' : '收到回覆',
      { preview: content.substring(0, 50) }
    );
    
    // 如果是用戶回覆，更新階段
    if (role === 'user' && lead.stage === 'stranger') {
      this.updateLead(leadId, { stage: 'visitor' });
    }
    
    this.saveData();
    
    return message;
  }
  
  /**
   * 獲取客戶對話列表
   */
  getConversations(leadId: string): LeadConversation[] {
    return this._conversations().get(leadId) || [];
  }
  
  /**
   * 結束當前對話
   */
  endConversation(leadId: string, outcome?: {
    type: 'positive' | 'neutral' | 'negative';
    notes?: string;
  }): void {
    this._conversations.update(map => {
      const newMap = new Map(map);
      const conversations = newMap.get(leadId) || [];
      const currentConversation = conversations.find(c => !c.endedAt);
      
      if (currentConversation) {
        currentConversation.endedAt = new Date();
        if (outcome) {
          currentConversation.outcome = outcome;
        }
      }
      
      newMap.set(leadId, conversations);
      return newMap;
    });
    
    this.saveData();
  }
  
  // ============ 跟進管理 ============
  
  /**
   * 創建跟進計劃
   */
  createFollowUp(
    leadId: string,
    type: ConversationType,
    scheduledAt: Date,
    content?: Partial<FollowUp['content']>
  ): FollowUp {
    const followUp: FollowUp = {
      id: `fu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      leadId,
      type,
      scheduledAt,
      content: {
        suggestedTopics: [],
        ...content
      },
      priority: type === 'business' ? 'important' : 'normal',
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this._followUps.update(fus => [...fus, followUp]);
    
    // 更新客戶的下次跟進時間
    this._leads.update(leads =>
      leads.map(l => {
        if (l.id !== leadId) return l;
        
        // 如果沒有下次跟進時間，或新的更早，則更新
        if (!l.nextFollowUpAt || scheduledAt < l.nextFollowUpAt) {
          return { ...l, nextFollowUpAt: scheduledAt, updatedAt: new Date() };
        }
        return l;
      })
    );
    
    this.addActivity(leadId, 'follow_up_created', `創建${this.getTypeName(type)}跟進計劃`);
    this.saveData();
    
    return followUp;
  }
  
  /**
   * 更新跟進狀態
   */
  updateFollowUpStatus(
    followUpId: string,
    status: FollowUpStatus,
    result?: FollowUp['result']
  ): void {
    this._followUps.update(fus =>
      fus.map(f => {
        if (f.id !== followUpId) return f;
        
        return {
          ...f,
          status,
          result,
          executedAt: status === 'executed' ? new Date() : f.executedAt,
          updatedAt: new Date()
        };
      })
    );
    
    const followUp = this._followUps().find(f => f.id === followUpId);
    if (followUp && status === 'executed') {
      // 更新客戶的最後跟進時間
      this._leads.update(leads =>
        leads.map(l => {
          if (l.id !== followUp.leadId) return l;
          
          const config = { ...l.nurturingConfig };
          config.currentFollowUpCount++;
          
          // 計算下次跟進時間
          const nextFollowUp = this.calculateNextFollowUp(l, 'business');
          
          return {
            ...l,
            lastFollowUpAt: new Date(),
            nextFollowUpAt: nextFollowUp,
            nurturingConfig: config,
            updatedAt: new Date()
          };
        })
      );
      
      this.addActivity(followUp.leadId, 'follow_up_executed', `執行了${this.getTypeName(followUp.type)}跟進`);
    }
    
    this.saveData();
  }
  
  /**
   * 獲取客戶的跟進計劃
   */
  getFollowUps(leadId: string): FollowUp[] {
    return this._followUps().filter(f => f.leadId === leadId);
  }
  
  /**
   * 獲取待執行的跟進
   */
  getPendingFollowUps(): FollowUp[] {
    const now = new Date();
    return this._followUps()
      .filter(f => 
        (f.status === 'scheduled' || f.status === 'pending') &&
        new Date(f.scheduledAt) <= now
      )
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }
  
  /**
   * 計算下次跟進時間
   */
  calculateNextFollowUp(lead: Lead, type: 'business' | 'casual'): Date {
    const config = LEAD_CONFIG.stageFollowUpDays[lead.stage];
    const days = type === 'business' ? config.business : config.casual;
    
    const next = new Date();
    next.setDate(next.getDate() + days);
    
    // 設置到合適的時間（上午10點）
    next.setHours(10, 0, 0, 0);
    
    return next;
  }
  
  // ============ 活動記錄 ============
  
  /**
   * 添加活動記錄
   */
  addActivity(
    leadId: string,
    type: LeadActivity['type'],
    description: string,
    details?: Record<string, any>
  ): void {
    const activity: LeadActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      leadId,
      type,
      description,
      details,
      createdAt: new Date(),
      createdBy: 'system'
    };
    
    this._activities.update(acts => [activity, ...acts.slice(0, 999)]);
  }
  
  /**
   * 獲取客戶活動記錄
   */
  getActivities(leadId: string, limit = 50): LeadActivity[] {
    return this._activities()
      .filter(a => a.leadId === leadId)
      .slice(0, limit);
  }
  
  // ============ 通知管理 ============
  
  /**
   * 添加通知
   */
  addNotification(params: {
    leadId: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    data?: Record<string, any>;
    suggestedActions?: LeadNotification['suggestedActions'];
  }): LeadNotification {
    const notification: LeadNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...params,
      isRead: false,
      isHandled: false,
      createdAt: new Date()
    };
    
    this._notifications.update(notifs => [notification, ...notifs.slice(0, 199)]);
    this.saveData();
    
    console.log(`[LeadService] Notification: ${notification.title}`);
    
    return notification;
  }
  
  /**
   * 標記通知已讀
   */
  markNotificationRead(notificationId: string): void {
    this._notifications.update(notifs =>
      notifs.map(n => {
        if (n.id !== notificationId) return n;
        return { ...n, isRead: true, readAt: new Date() };
      })
    );
    this.saveData();
  }
  
  /**
   * 標記通知已處理
   */
  markNotificationHandled(notificationId: string): void {
    this._notifications.update(notifs =>
      notifs.map(n => {
        if (n.id !== notificationId) return n;
        return { ...n, isHandled: true, handledAt: new Date() };
      })
    );
    this.saveData();
  }
  
  /**
   * 標記所有通知已讀
   */
  markAllNotificationsRead(): void {
    const now = new Date();
    this._notifications.update(notifs =>
      notifs.map(n => ({ ...n, isRead: true, readAt: now }))
    );
    this.saveData();
  }
  
  // ============ 標籤管理 ============
  
  /**
   * 添加標籤
   */
  addTag(leadId: string, tag: string): void {
    this._leads.update(leads =>
      leads.map(l => {
        if (l.id !== leadId) return l;
        if (l.tags.includes(tag)) return l;
        return { ...l, tags: [...l.tags, tag], updatedAt: new Date() };
      })
    );
    
    this.addActivity(leadId, 'tag_added', `添加標籤: ${tag}`);
    this.saveData();
  }
  
  /**
   * 移除標籤
   */
  removeTag(leadId: string, tag: string): void {
    this._leads.update(leads =>
      leads.map(l => {
        if (l.id !== leadId) return l;
        return { ...l, tags: l.tags.filter(t => t !== tag), updatedAt: new Date() };
      })
    );
    
    this.addActivity(leadId, 'tag_removed', `移除標籤: ${tag}`);
    this.saveData();
  }
  
  /**
   * 獲取所有標籤
   */
  getAllTags(): string[] {
    const tagSet = new Set<string>();
    for (const lead of this._leads()) {
      for (const tag of lead.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }
  
  // ============ 統計 ============
  
  /**
   * 獲取培育統計
   */
  getNurturingStats(): {
    total: number;
    byStage: Record<FunnelStage, number>;
    activeNurturing: number;
    todayFollowUps: number;
    pendingFollowUps: number;
    avgScore: number;
    conversionRate: number;
  } {
    const leads = this._leads();
    const byStage = this.leadsByStage();
    
    const activeNurturing = leads.filter(l => l.isNurturing && !l.doNotContact).length;
    const todayFUs = this.todayFollowUps().length;
    const pendingFUs = this.getPendingFollowUps().length;
    
    const avgScore = leads.length > 0
      ? Math.round(leads.reduce((sum, l) => sum + l.scores.overall, 0) / leads.length)
      : 0;
    
    const customers = leads.filter(l => l.stage === 'customer' || l.stage === 'advocate').length;
    const conversionRate = leads.length > 0 ? (customers / leads.length) * 100 : 0;
    
    return {
      total: leads.length,
      byStage,
      activeNurturing,
      todayFollowUps: todayFUs,
      pendingFollowUps: pendingFUs,
      avgScore,
      conversionRate: Math.round(conversionRate * 10) / 10
    };
  }
  
  // ============ 輔助方法 ============
  
  /**
   * 創建默認用戶畫像
   */
  private createDefaultProfile(): LeadProfile {
    return {
      interests: [],
      communicationStyle: 'unknown',
      activeHours: [],
      responsePattern: {
        avgResponseTime: 0,
        responseRate: 0,
        avgMessageLength: 0,
        preferredHours: []
      },
      topicPreferences: [],
      personalInfo: {},
      preferredLanguage: 'zh-TW',
      updatedAt: new Date()
    };
  }
  
  /**
   * 獲取階段名稱
   */
  getStageName(stage: FunnelStage): string {
    const names: Record<FunnelStage, string> = {
      stranger: '陌生人',
      visitor: '訪客',
      lead: '潛在客戶',
      qualified: '高意向',
      customer: '客戶',
      advocate: '忠實客戶',
      dormant: '沉默用戶'
    };
    return names[stage];
  }
  
  /**
   * 獲取對話類型名稱
   */
  private getTypeName(type: ConversationType): string {
    const names: Record<ConversationType, string> = {
      business: '業務',
      casual: '情感維護',
      greeting: '問候',
      nurture: '培育',
      support: '售後',
      manual: '手動'
    };
    return names[type];
  }
  
  // ============ 持久化 ============
  
  private saveData(): void {
    try {
      // 保存客戶
      localStorage.setItem(
        LEAD_CONFIG.storageKeys.leads,
        JSON.stringify(this._leads())
      );
      
      // 保存對話
      const conversationsArray = Array.from(this._conversations().entries());
      localStorage.setItem(
        LEAD_CONFIG.storageKeys.conversations,
        JSON.stringify(conversationsArray)
      );
      
      // 保存跟進計劃（只保存最近的）
      localStorage.setItem(
        LEAD_CONFIG.storageKeys.followUps,
        JSON.stringify(this._followUps().slice(0, 500))
      );
      
      // 保存活動（只保存最近的）
      localStorage.setItem(
        LEAD_CONFIG.storageKeys.activities,
        JSON.stringify(this._activities().slice(0, 500))
      );
      
      // 保存通知
      localStorage.setItem(
        LEAD_CONFIG.storageKeys.notifications,
        JSON.stringify(this._notifications().slice(0, 100))
      );
    } catch (e) {
      console.error('[LeadService] Failed to save data:', e);
    }
  }
  
  private loadData(): void {
    try {
      // 載入客戶
      const leadsData = localStorage.getItem(LEAD_CONFIG.storageKeys.leads);
      if (leadsData) {
        const leads = JSON.parse(leadsData).map((l: any) => ({
          ...l,
          firstContactAt: new Date(l.firstContactAt),
          lastInteractionAt: l.lastInteractionAt ? new Date(l.lastInteractionAt) : undefined,
          lastFollowUpAt: l.lastFollowUpAt ? new Date(l.lastFollowUpAt) : undefined,
          nextFollowUpAt: l.nextFollowUpAt ? new Date(l.nextFollowUpAt) : undefined,
          convertedAt: l.convertedAt ? new Date(l.convertedAt) : undefined,
          createdAt: new Date(l.createdAt),
          updatedAt: new Date(l.updatedAt),
          scores: { ...l.scores, updatedAt: new Date(l.scores.updatedAt) },
          profile: { ...l.profile, updatedAt: new Date(l.profile.updatedAt) },
          source: { ...l.source, discoveredAt: new Date(l.source.discoveredAt) }
        }));
        this._leads.set(leads);
      }
      
      // 載入對話
      const conversationsData = localStorage.getItem(LEAD_CONFIG.storageKeys.conversations);
      if (conversationsData) {
        const entries = JSON.parse(conversationsData).map(([k, v]: [string, any[]]) => [
          k,
          v.map((c: any) => ({
            ...c,
            startedAt: new Date(c.startedAt),
            endedAt: c.endedAt ? new Date(c.endedAt) : undefined,
            messages: c.messages.map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            })),
            purchaseSignals: c.purchaseSignals.map((s: any) => ({
              ...s,
              detectedAt: new Date(s.detectedAt)
            }))
          }))
        ]);
        this._conversations.set(new Map(entries));
      }
      
      // 載入跟進計劃
      const followUpsData = localStorage.getItem(LEAD_CONFIG.storageKeys.followUps);
      if (followUpsData) {
        const followUps = JSON.parse(followUpsData).map((f: any) => ({
          ...f,
          scheduledAt: new Date(f.scheduledAt),
          executedAt: f.executedAt ? new Date(f.executedAt) : undefined,
          createdAt: new Date(f.createdAt),
          updatedAt: new Date(f.updatedAt)
        }));
        this._followUps.set(followUps);
      }
      
      // 載入活動
      const activitiesData = localStorage.getItem(LEAD_CONFIG.storageKeys.activities);
      if (activitiesData) {
        const activities = JSON.parse(activitiesData).map((a: any) => ({
          ...a,
          createdAt: new Date(a.createdAt)
        }));
        this._activities.set(activities);
      }
      
      // 載入通知
      const notificationsData = localStorage.getItem(LEAD_CONFIG.storageKeys.notifications);
      if (notificationsData) {
        const notifications = JSON.parse(notificationsData).map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          readAt: n.readAt ? new Date(n.readAt) : undefined,
          handledAt: n.handledAt ? new Date(n.handledAt) : undefined
        }));
        this._notifications.set(notifications);
      }
      
      console.log(`[LeadService] Loaded ${this._leads().length} leads`);
    } catch (e) {
      console.error('[LeadService] Failed to load data:', e);
    }
  }
}
