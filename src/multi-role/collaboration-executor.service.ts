/**
 * 協作執行器服務
 * Collaboration Executor Service
 * 
 * 協調多角色協作執行，管理劇本進度和 AI 回覆
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { MultiRoleService } from './multi-role.service';
import { AutoGroupService } from './auto-group.service';
import { ConversationEngineService, ReplyResult } from '../ai-center/conversation-engine.service';
import { IntentRecognitionService } from '../ai-center/intent-recognition.service';
import { CollaborationGroup, RoleDefinition, ScriptStage, ScriptMessage } from './multi-role.models';
import { ElectronIpcService as IpcService } from '../electron-ipc.service';

// 執行任務
interface ExecutionTask {
  id: string;
  groupId: string;
  type: 'script_message' | 'ai_reply' | 'scheduled';
  roleId: string;
  content: string;
  delay: number;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  scheduledTime: Date;
  error?: string;
}

// 群組執行狀態
interface GroupExecutionState {
  groupId: string;
  isRunning: boolean;
  currentStage: number;
  currentMessageIndex: number;
  lastMessageTime: Date | null;
  pendingTasks: ExecutionTask[];
  completedTasks: ExecutionTask[];
}

@Injectable({
  providedIn: 'root'
})
export class CollaborationExecutorService {
  private multiRoleService = inject(MultiRoleService);
  private autoGroupService = inject(AutoGroupService);
  private conversationEngine = inject(ConversationEngineService);
  private intentService = inject(IntentRecognitionService);
  private ipc = inject(IpcService);
  
  // 執行狀態
  private executionStates = signal<Map<string, GroupExecutionState>>(new Map());
  
  // 任務隊列
  private taskQueue = signal<ExecutionTask[]>([]);
  
  // 執行統計
  private stats = signal({
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    avgResponseTime: 0
  });
  
  // 執行間隔（毫秒）
  private executionInterval: any = null;
  
  // 計算屬性
  states = this.executionStates.asReadonly();
  queue = this.taskQueue.asReadonly();
  statistics = this.stats.asReadonly();
  
  constructor() {
    this.startExecutionLoop();
    this.initializeListeners();
  }
  
  /**
   * 初始化監聽器
   */
  private initializeListeners() {
    // 監聽客戶消息
    this.ipc.on('multi-role-customer-message', (data: any) => {
      this.handleCustomerMessage(data.groupId, data.message);
    });
    
    // 監聽消息發送結果
    this.ipc.on('multi-role-message-sent', (data: any) => {
      this.handleMessageSent(data.taskId, data.success, data.error);
    });
  }
  
  /**
   * 開始執行循環
   */
  private startExecutionLoop() {
    // 每秒檢查一次任務隊列
    this.executionInterval = setInterval(() => {
      this.processTaskQueue();
    }, 1000);
  }
  
  /**
   * 處理任務隊列
   */
  private async processTaskQueue() {
    const now = new Date();
    const queue = this.taskQueue();
    
    // 找出所有到期的任務
    const dueTasks = queue.filter(
      task => task.status === 'pending' && task.scheduledTime <= now
    );
    
    for (const task of dueTasks) {
      await this.executeTask(task);
    }
    
    // 清理已完成的任務
    this.taskQueue.update(q => 
      q.filter(t => t.status !== 'completed' && t.status !== 'failed')
    );
  }
  
  /**
   * 執行單個任務
   */
  private async executeTask(task: ExecutionTask) {
    // 標記為執行中
    this.updateTaskStatus(task.id, 'executing');
    
    try {
      const startTime = Date.now();
      
      // 發送消息
      const success = await this.autoGroupService.sendMessage(
        task.groupId,
        task.roleId,
        task.content
      );
      
      if (success) {
        this.updateTaskStatus(task.id, 'completed');
        
        // 更新統計
        const duration = Date.now() - startTime;
        this.stats.update(s => ({
          totalExecutions: s.totalExecutions + 1,
          successfulExecutions: s.successfulExecutions + 1,
          failedExecutions: s.failedExecutions,
          avgResponseTime: (s.avgResponseTime * s.totalExecutions + duration) / (s.totalExecutions + 1)
        }));
        
        // 檢查是否需要執行下一條消息
        this.checkNextMessage(task.groupId);
      } else {
        throw new Error('消息發送失敗');
      }
    } catch (error) {
      this.updateTaskStatus(task.id, 'failed', error instanceof Error ? error.message : '未知錯誤');
      
      this.stats.update(s => ({
        ...s,
        totalExecutions: s.totalExecutions + 1,
        failedExecutions: s.failedExecutions + 1
      }));
    }
  }
  
  /**
   * 開始執行劇本
   */
  async startScriptExecution(groupId: string, scriptId: string) {
    const group = this.autoGroupService.getGroup(groupId);
    const script = this.multiRoleService.scripts().find(s => s.id === scriptId);
    
    if (!group || !script) {
      console.error('Group or script not found');
      return;
    }
    
    // 初始化執行狀態
    const state: GroupExecutionState = {
      groupId,
      isRunning: true,
      currentStage: 0,
      currentMessageIndex: 0,
      lastMessageTime: null,
      pendingTasks: [],
      completedTasks: []
    };
    
    this.executionStates.update(states => {
      const newStates = new Map(states);
      newStates.set(groupId, state);
      return newStates;
    });
    
    // 開始執行第一個階段
    await this.executeStage(groupId, script.stages[0]);
  }
  
  /**
   * 執行劇本階段
   */
  private async executeStage(groupId: string, stage: ScriptStage) {
    const state = this.executionStates().get(groupId);
    if (!state || !state.isRunning) return;
    
    // 檢查觸發條件
    if (stage.trigger?.type === 'time' && stage.trigger.delaySeconds) {
      // 延遲執行
      setTimeout(() => this.executeStageMessages(groupId, stage), stage.trigger.delaySeconds * 1000);
    } else if (stage.trigger?.type === 'message') {
      // 等待用戶回覆
      // 實際觸發由 handleCustomerMessage 處理
    } else {
      // 立即執行
      await this.executeStageMessages(groupId, stage);
    }
  }
  
  /**
   * 執行階段消息
   */
  private async executeStageMessages(groupId: string, stage: ScriptStage) {
    const state = this.executionStates().get(groupId);
    if (!state || !state.isRunning) return;
    
    let cumulativeDelay = 0;
    
    for (let i = 0; i < stage.messages.length; i++) {
      const message = stage.messages[i];
      cumulativeDelay += message.timing.delayAfterPrevious || 0;
      
      // 計算隨機延遲
      if (message.timing.randomDelay) {
        const { min, max } = message.timing.randomDelay;
        cumulativeDelay += Math.floor(Math.random() * (max - min + 1)) + min;
      }
      
      // 生成消息內容
      let content: string;
      if (message.content.type === 'ai_generate') {
        // AI 生成
        const group = this.autoGroupService.getGroup(groupId);
        const role = this.multiRoleService.roles().find(r => r.id === message.roleId);
        
        if (group && role) {
          const replyResult = await this.conversationEngine.generateMultiRoleReply(
            message.content.aiPrompt || '',
            {
              roleId: role.id,
              roleName: role.name,
              rolePrompt: role.aiConfig.customPrompt,
              personality: role.personality.description
            },
            {
              userId: group.targetCustomer.id,
              userName: group.targetCustomer.firstName || group.targetCustomer.username
            }
          );
          content = replyResult.content;
        } else {
          content = message.content.text || '';
        }
      } else if (message.content.type === 'template') {
        // 模板變量替換
        const group = this.autoGroupService.getGroup(groupId);
        content = this.processTemplate(
          message.content.text || '',
          group?.targetCustomer
        );
      } else {
        content = message.content.text || '';
      }
      
      // 創建任務
      const task: ExecutionTask = {
        id: `task_${Date.now()}_${i}`,
        groupId,
        type: 'script_message',
        roleId: message.roleId,
        content,
        delay: cumulativeDelay,
        status: 'pending',
        scheduledTime: new Date(Date.now() + cumulativeDelay * 1000)
      };
      
      // 添加到隊列
      this.taskQueue.update(q => [...q, task]);
    }
    
    // 更新狀態
    this.executionStates.update(states => {
      const newStates = new Map(states);
      const state = newStates.get(groupId);
      if (state) {
        newStates.set(groupId, {
          ...state,
          currentStage: state.currentStage + 1
        });
      }
      return newStates;
    });
  }
  
  /**
   * 處理客戶消息
   */
  async handleCustomerMessage(groupId: string, message: string) {
    const group = this.autoGroupService.getGroup(groupId);
    if (!group || group.status !== 'running') return;
    
    const state = this.executionStates().get(groupId);
    
    // 意圖識別
    const intent = await this.intentService.recognizeIntent(
      message,
      group.targetCustomer.id,
      true
    );
    
    if (group.scriptId && state?.isRunning) {
      // 劇本模式
      const script = this.multiRoleService.scripts().find(s => s.id === group.scriptId);
      
      if (script && state.currentStage < script.stages.length) {
        const currentStage = script.stages[state.currentStage];
        
        // 檢查是否匹配觸發條件
        if (currentStage.trigger?.type === 'message') {
          // 用戶回覆觸發
          await this.executeStage(groupId, currentStage);
        } else if (currentStage.trigger?.type === 'keyword') {
          // 關鍵詞匹配觸發
          const hasKeyword = currentStage.trigger.keywords?.some(
            kw => intent.keywords?.includes(kw)
          );
          if (hasKeyword) {
            await this.executeStage(groupId, currentStage);
          }
        }
      }
    } else {
      // 自由對話模式：選擇合適的角色回覆
      await this.generateFreeReply(groupId, group, message, intent);
    }
  }
  
  /**
   * 生成自由對話回覆
   */
  private async generateFreeReply(
    groupId: string,
    group: CollaborationGroup,
    customerMessage: string,
    intent: any
  ) {
    // 選擇最適合的角色
    const roles = this.multiRoleService.roles();
    const participant = group.participants?.[0]; // 簡化：使用第一個參與者
    
    if (!participant) return;
    
    const role = roles.find(r => r.id === participant.roleId);
    if (!role) return;
    
    // 生成回覆
    const replyResult = await this.conversationEngine.generateMultiRoleReply(
      customerMessage,
      {
        roleId: role.id,
        roleName: role.name,
        rolePrompt: role.aiConfig.customPrompt,
        personality: role.personality.description
      },
      {
        userId: group.targetCustomer.id,
        userName: group.targetCustomer.firstName || group.targetCustomer.username,
        sourceGroup: groupId
      }
    );
    
    // 創建任務
    const task: ExecutionTask = {
      id: `task_${Date.now()}`,
      groupId,
      type: 'ai_reply',
      roleId: role.id,
      content: replyResult.content,
      delay: replyResult.delay,
      status: 'pending',
      scheduledTime: new Date(Date.now() + replyResult.delay * 1000)
    };
    
    this.taskQueue.update(q => [...q, task]);
    
    // 檢查是否需要轉人工
    if (replyResult.shouldHandoff) {
      this.notifyHandoff(groupId, replyResult.handoffReason || '需要人工介入');
    }
  }
  
  /**
   * 處理模板變量
   */
  private processTemplate(
    template: string,
    customer?: { firstName?: string; username?: string; id: string }
  ): string {
    return template
      .replace(/{客戶名}/g, customer?.firstName || customer?.username || 'VIP客戶')
      .replace(/{用戶名}/g, customer?.username || '用戶')
      .replace(/{客戶ID}/g, customer?.id || '');
  }
  
  /**
   * 更新任務狀態
   */
  private updateTaskStatus(taskId: string, status: ExecutionTask['status'], error?: string) {
    this.taskQueue.update(q =>
      q.map(t => t.id === taskId ? { ...t, status, error } : t)
    );
  }
  
  /**
   * 檢查下一條消息
   */
  private checkNextMessage(groupId: string) {
    const state = this.executionStates().get(groupId);
    if (!state) return;
    
    // 更新最後消息時間
    this.executionStates.update(states => {
      const newStates = new Map(states);
      const s = newStates.get(groupId);
      if (s) {
        newStates.set(groupId, {
          ...s,
          lastMessageTime: new Date()
        });
      }
      return newStates;
    });
  }
  
  /**
   * 處理消息發送結果
   */
  private handleMessageSent(taskId: string, success: boolean, error?: string) {
    if (success) {
      this.updateTaskStatus(taskId, 'completed');
    } else {
      this.updateTaskStatus(taskId, 'failed', error);
    }
  }
  
  /**
   * 通知轉人工
   */
  private notifyHandoff(groupId: string, reason: string) {
    this.ipc.send('multi-role-handoff', {
      groupId,
      reason,
      timestamp: new Date().toISOString()
    });
    
    // 暫停執行
    this.pauseExecution(groupId);
  }
  
  /**
   * 暫停執行
   */
  pauseExecution(groupId: string) {
    this.executionStates.update(states => {
      const newStates = new Map(states);
      const state = newStates.get(groupId);
      if (state) {
        newStates.set(groupId, { ...state, isRunning: false });
      }
      return newStates;
    });
  }
  
  /**
   * 恢復執行
   */
  resumeExecution(groupId: string) {
    this.executionStates.update(states => {
      const newStates = new Map(states);
      const state = newStates.get(groupId);
      if (state) {
        newStates.set(groupId, { ...state, isRunning: true });
      }
      return newStates;
    });
  }
  
  /**
   * 停止執行
   */
  stopExecution(groupId: string) {
    // 移除所有待處理任務
    this.taskQueue.update(q => q.filter(t => t.groupId !== groupId));
    
    // 移除執行狀態
    this.executionStates.update(states => {
      const newStates = new Map(states);
      newStates.delete(groupId);
      return newStates;
    });
  }
  
  /**
   * 手動發送消息
   */
  async sendManualMessage(
    groupId: string,
    roleId: string,
    content: string,
    delay: number = 0
  ) {
    const task: ExecutionTask = {
      id: `task_${Date.now()}`,
      groupId,
      type: 'scheduled',
      roleId,
      content,
      delay,
      status: 'pending',
      scheduledTime: new Date(Date.now() + delay * 1000)
    };
    
    this.taskQueue.update(q => [...q, task]);
  }
  
  /**
   * 清理資源
   */
  ngOnDestroy() {
    if (this.executionInterval) {
      clearInterval(this.executionInterval);
    }
  }
}
