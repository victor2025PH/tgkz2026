/**
 * 自動建群服務
 * Auto Group Service
 * 
 * 管理自動建群和多角色協作群組
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { ElectronIpcService as IpcService } from '../electron-ipc.service';
import { CollaborationGroup, RoleDefinition, ScriptTemplate } from './multi-role.models';
import { MultiRoleService } from './multi-role.service';

// 建群請求
export interface CreateGroupRequest {
  targetCustomer: {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
  groupName: string;
  roleAccounts: { roleId: string; accountId: number }[];
  scriptId?: string;
  inviteMessage?: string;
  sourceGroupId?: string;
  intentScore?: number;
}

// 建群結果
export interface CreateGroupResult {
  success: boolean;
  groupId?: string;
  telegramGroupId?: string;
  error?: string;
  inviteLink?: string;
}

// 群組成員
export interface GroupMember {
  id: string;
  isBot: boolean;
  role?: RoleDefinition;
  accountId?: number;
  joinedAt: Date;
}

// 群組消息
export interface GroupMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  isFromTarget: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AutoGroupService {
  private ipc = inject(IpcService);
  private multiRoleService = inject(MultiRoleService);
  
  // 活躍群組
  private activeGroups = signal<CollaborationGroup[]>([]);
  
  // 待處理的建群請求
  private pendingRequests = signal<CreateGroupRequest[]>([]);
  
  // 群組消息歷史
  private messageHistory = signal<Map<string, GroupMessage[]>>(new Map());
  
  // 統計
  private stats = signal({
    totalGroups: 0,
    activeGroups: 0,
    successfulConversions: 0,
    pendingRequests: 0
  });
  
  // 計算屬性
  groups = this.activeGroups.asReadonly();
  pending = this.pendingRequests.asReadonly();
  statistics = this.stats.asReadonly();
  
  constructor() {
    this.initializeListeners();
    this.loadActiveGroups();
  }
  
  /**
   * 初始化 IPC 監聽
   */
  private initializeListeners() {
    // 監聽群組創建結果
    this.ipc.on('multi-role-group-created', (data: any) => {
      this.handleGroupCreated(data);
    });
    
    // 監聽群組消息
    this.ipc.on('multi-role-group-message', (data: any) => {
      this.handleGroupMessage(data);
    });
    
    // 監聯成員加入/離開
    this.ipc.on('multi-role-member-joined', (data: any) => {
      this.handleMemberJoined(data);
    });
    
    this.ipc.on('multi-role-member-left', (data: any) => {
      this.handleMemberLeft(data);
    });
  }
  
  /**
   * 載入活躍群組
   */
  private async loadActiveGroups() {
    try {
      const stored = localStorage.getItem('tg-matrix-multi-role-groups');
      if (stored) {
        const groups = JSON.parse(stored);
        this.activeGroups.set(groups);
        this.updateStats();
      }
    } catch (e) {
      console.error('Failed to load active groups:', e);
    }
  }
  
  /**
   * 保存群組數據
   */
  private saveGroups() {
    try {
      localStorage.setItem(
        'tg-matrix-multi-role-groups', 
        JSON.stringify(this.activeGroups())
      );
    } catch (e) {
      console.error('Failed to save groups:', e);
    }
  }
  
  /**
   * 創建多角色協作群組
   */
  async createGroup(request: CreateGroupRequest): Promise<CreateGroupResult> {
    try {
      // 驗證角色帳號
      if (!request.roleAccounts || request.roleAccounts.length === 0) {
        return { success: false, error: '未配置角色帳號' };
      }
      
      // 添加到待處理隊列
      this.pendingRequests.update(reqs => [...reqs, request]);
      this.updateStats();
      
      // 發送創建群組請求到後端
      this.ipc.send('create-multi-role-group', {
        groupName: request.groupName,
        targetUserId: request.targetCustomer.id,
        targetUsername: request.targetCustomer.username,
        roleAccounts: request.roleAccounts,
        inviteMessage: request.inviteMessage || `您好 ${request.targetCustomer.firstName || ''}，我們為您創建了專屬服務群組！`
      });
      
      // 模擬成功（實際由 IPC 回調處理）
      // 這裡先返回 pending 狀態
      return {
        success: true,
        groupId: `pending_${Date.now()}`
      };
    } catch (error) {
      console.error('Failed to create group:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '建群失敗'
      };
    }
  }
  
  /**
   * 處理群組創建結果
   */
  private handleGroupCreated(data: {
    success: boolean;
    groupId?: string;
    telegramGroupId?: string;
    inviteLink?: string;
    request: CreateGroupRequest;
    error?: string;
  }) {
    // 從待處理隊列移除
    this.pendingRequests.update(reqs => 
      reqs.filter(r => r.targetCustomer.id !== data.request.targetCustomer.id)
    );
    
    if (data.success && data.groupId) {
      // 創建協作群組記錄
      const newGroup: CollaborationGroup = {
        id: data.groupId,
        targetCustomer: {
          id: data.request.targetCustomer.id,
          username: data.request.targetCustomer.username,
          firstName: data.request.targetCustomer.firstName,
          intentScore: data.request.intentScore || 0,
          source: data.request.sourceGroupId || 'unknown'
        },
        groupTitle: data.request.groupName,
        telegramGroupId: data.telegramGroupId,
        participants: data.request.roleAccounts.map(ra => ({
          roleId: ra.roleId,
          roleName: '',  // TODO: 從角色列表獲取
          accountId: ra.accountId,
          accountPhone: ''  // TODO: 從帳號列表獲取
        })),
        scriptId: data.request.scriptId || '',
        scriptName: '',  // TODO: 從劇本列表獲取
        status: 'running',
        currentStageId: undefined,
        currentStageOrder: 0,
        messagesSent: 0,
        customerMessages: 0,
        outcome: 'pending',
        createdAt: new Date().toISOString()
      };
      
      this.activeGroups.update(groups => [...groups, newGroup]);
      this.saveGroups();
      
      // 如果有劇本，通知開始執行
      if (data.request.scriptId) {
        this.ipc.send('multi-role-start-script', {
          groupId: newGroup.id,
          scriptId: data.request.scriptId
        });
      }
    }
    
    this.updateStats();
  }
  
  /**
   * 處理群組消息
   */
  private handleGroupMessage(data: {
    groupId: string;
    senderId: string;
    senderName: string;
    content: string;
    isFromTarget: boolean;
  }) {
    const message: GroupMessage = {
      id: `msg_${Date.now()}`,
      senderId: data.senderId,
      senderName: data.senderName,
      content: data.content,
      timestamp: new Date(),
      isFromTarget: data.isFromTarget
    };
    
    // 更新消息歷史
    this.messageHistory.update(history => {
      const newHistory = new Map(history);
      const groupMessages = newHistory.get(data.groupId) || [];
      newHistory.set(data.groupId, [...groupMessages, message]);
      return newHistory;
    });
    
    // 更新群組統計
    if (data.isFromTarget) {
      this.activeGroups.update(groups =>
        groups.map(g => g.id === data.groupId
          ? { ...g, customerMessages: g.customerMessages + 1, updatedAt: new Date() }
          : g
        )
      );
    }
    
    // 如果是目標客戶的消息，觸發 AI 回覆
    if (data.isFromTarget) {
      this.handleCustomerMessage(data.groupId, message);
    }
  }
  
  /**
   * 處理客戶消息
   */
  private async handleCustomerMessage(groupId: string, message: GroupMessage) {
    const group = this.activeGroups().find(g => g.id === groupId);
    if (!group || group.status !== 'running') return;
    
    // 通知多角色服務處理
    // 這裡會觸發劇本的下一步或 AI 回覆
    if (group.scriptId) {
      // 劇本模式：檢查是否匹配下一階段的觸發條件
      const script = this.multiRoleService.scripts().find(s => s.id === group.scriptId);
      const stageOrder = group.currentStageOrder || 0;
      
      if (script && script.stages[stageOrder]) {
        const currentStage = script.stages[stageOrder];
        
        if (currentStage.trigger?.type === 'message') {
          // 用戶回覆觸發下一階段
          // 發送事件讓執行器處理
          this.ipc.send('multi-role-advance-stage', {
            groupId,
            nextStageOrder: stageOrder + 1
          });
        }
      }
    } else {
      // 自由對話模式：使用 AI 生成回覆
      // 實際由後端處理
      this.ipc.send('multi-role-ai-reply', {
        groupId,
        message: message.content,
        customerId: group.targetCustomer.id
      });
    }
  }
  
  /**
   * 處理成員加入
   */
  private handleMemberJoined(data: {
    groupId: string;
    memberId: string;
    isTarget: boolean;
  }) {
    if (data.isTarget) {
      // 目標客戶加入，更新狀態
      this.activeGroups.update(groups =>
        groups.map(g => g.id === data.groupId
          ? { ...g, status: 'running' as const, updatedAt: new Date() }
          : g
        )
      );
    }
  }
  
  /**
   * 處理成員離開
   */
  private handleMemberLeft(data: {
    groupId: string;
    memberId: string;
    isTarget: boolean;
  }) {
    if (data.isTarget) {
      // 目標客戶離開，標記為失敗
      this.activeGroups.update(groups =>
        groups.map(g => g.id === data.groupId
          ? { ...g, status: 'failed' as const, updatedAt: new Date() }
          : g
        )
      );
      this.saveGroups();
    }
  }
  
  /**
   * 發送消息到群組
   */
  async sendMessage(
    groupId: string, 
    roleId: string, 
    content: string
  ): Promise<boolean> {
    const group = this.activeGroups().find(g => g.id === groupId);
    if (!group) return false;
    
    const participant = group.participants?.find(p => p.roleId === roleId);
    if (!participant) return false;
    
    this.ipc.send('multi-role-send-message', {
      groupId,
      telegramGroupId: group.telegramGroupId,
      accountId: participant.accountId,
      content
    });
    
    // 更新統計
    this.activeGroups.update(groups =>
      groups.map(g => g.id === groupId
        ? { ...g, messagesSent: g.messagesSent + 1, updatedAt: new Date() }
        : g
      )
    );
    
    return true;
  }
  
  /**
   * 標記群組為成功轉化
   */
  markAsConverted(groupId: string) {
    this.activeGroups.update(groups =>
      groups.map(g => g.id === groupId
        ? { ...g, status: 'completed' as const, updatedAt: new Date() }
        : g
      )
    );
    this.saveGroups();
    
    this.stats.update(s => ({
      ...s,
      successfulConversions: s.successfulConversions + 1
    }));
  }
  
  /**
   * 暫停群組
   */
  pauseGroup(groupId: string) {
    this.activeGroups.update(groups =>
      groups.map(g => g.id === groupId
        ? { ...g, status: 'paused' as const, updatedAt: new Date() }
        : g
      )
    );
    this.saveGroups();
  }
  
  /**
   * 恢復群組
   */
  resumeGroup(groupId: string) {
    this.activeGroups.update(groups =>
      groups.map(g => g.id === groupId
        ? { ...g, status: 'running' as const, updatedAt: new Date() }
        : g
      )
    );
    this.saveGroups();
  }
  
  /**
   * 關閉群組
   */
  closeGroup(groupId: string) {
    this.activeGroups.update(groups =>
      groups.map(g => g.id === groupId
        ? { ...g, status: 'completed' as const, updatedAt: new Date() }
        : g
      )
    );
    this.saveGroups();
    this.updateStats();
  }
  
  /**
   * 獲取群組消息歷史
   */
  getMessages(groupId: string): GroupMessage[] {
    return this.messageHistory().get(groupId) || [];
  }
  
  /**
   * 獲取群組詳情
   */
  getGroup(groupId: string): CollaborationGroup | undefined {
    return this.activeGroups().find(g => g.id === groupId);
  }
  
  /**
   * 更新統計
   */
  private updateStats() {
    const groups = this.activeGroups();
    this.stats.set({
      totalGroups: groups.length,
      activeGroups: groups.filter(g => g.status === 'running').length,
      successfulConversions: groups.filter(g => g.status === 'completed').length,
      pendingRequests: this.pendingRequests().length
    });
  }
  
  /**
   * 根據意向評分決定是否建群
   */
  shouldCreateGroup(intentScore: number, config?: {
    minScore?: number;
    minConversations?: number;
  }): boolean {
    const minScore = config?.minScore || 50;
    return intentScore >= minScore;
  }
  
  /**
   * 生成群組名稱
   */
  generateGroupName(
    customerName: string,
    template: string = '{客戶名}專屬服務群'
  ): string {
    return template.replace('{客戶名}', customerName || 'VIP客戶');
  }
}
