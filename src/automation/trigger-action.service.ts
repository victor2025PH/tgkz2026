/**
 * 觸發動作服務
 * Trigger Action Service - 管理觸發動作配置和執行
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import {
  TriggerActionConfig,
  TriggerActionMode,
  GroupTriggerConfig,
  AccountRoleConfig,
  ExtendedAccountRole,
  DEFAULT_TRIGGER_CONFIG,
  TRIGGER_MODE_META
} from './trigger-action.models';
import { AICenterService } from '../ai-center/ai-center.service';
import { ConversationEngineService, ReplyResult } from '../ai-center/conversation-engine.service';
import { IntentRecognitionService } from '../ai-center/intent-recognition.service';

@Injectable({
  providedIn: 'root'
})
export class TriggerActionService {
  private aiCenter = inject(AICenterService);
  private conversationEngine = inject(ConversationEngineService);
  private intentService = inject(IntentRecognitionService);
  
  // 全局觸發動作配置
  private globalConfig = signal<TriggerActionConfig>(DEFAULT_TRIGGER_CONFIG);
  
  // 群組專屬配置
  private groupConfigs = signal<Map<string, GroupTriggerConfig>>(new Map());
  
  // 帳號角色配置
  private accountRoles = signal<AccountRoleConfig[]>([]);
  
  // 可用發送帳號（角色為 sender 或 ai_chat）
  availableSenderAccounts = computed(() => 
    this.accountRoles().filter(a => 
      a.roles.includes('sender') || a.roles.includes('ai_chat')
    )
  );
  
  // 可用監控帳號
  availableMonitorAccounts = computed(() => 
    this.accountRoles().filter(a => a.roles.includes('monitor'))
  );
  
  // 可用角色帳號
  availableRoleAccounts = computed(() => 
    this.accountRoles().filter(a => a.roles.includes('role_play'))
  );
  
  // 當前全局配置
  config = computed(() => this.globalConfig());
  
  // 當前模式
  currentMode = computed(() => this.globalConfig().mode);
  
  // 模式元數據
  modeMeta = TRIGGER_MODE_META;
  
  // ========== 全局配置管理 ==========
  
  updateGlobalConfig(updates: Partial<TriggerActionConfig>) {
    this.globalConfig.update(c => ({
      ...c,
      ...updates,
      updatedAt: new Date().toISOString()
    }));
  }
  
  setMode(mode: TriggerActionMode) {
    this.globalConfig.update(c => ({ ...c, mode }));
  }
  
  setSenderAccounts(accountIds: number[]) {
    this.globalConfig.update(c => ({
      ...c,
      senderAccountIds: accountIds
    }));
  }
  
  setRotationStrategy(strategy: 'sequential' | 'random' | 'load_balance') {
    this.globalConfig.update(c => ({
      ...c,
      accountRotationStrategy: strategy
    }));
  }
  
  // ========== 群組專屬配置管理 ==========
  
  getGroupConfig(groupId: string): GroupTriggerConfig | undefined {
    return this.groupConfigs().get(groupId);
  }
  
  setGroupConfig(groupId: string, config: GroupTriggerConfig) {
    this.groupConfigs.update(map => {
      const newMap = new Map(map);
      newMap.set(groupId, config);
      return newMap;
    });
  }
  
  removeGroupConfig(groupId: string) {
    this.groupConfigs.update(map => {
      const newMap = new Map(map);
      newMap.delete(groupId);
      return newMap;
    });
  }
  
  toggleGroupUseGlobal(groupId: string, useGlobal: boolean) {
    const config = this.groupConfigs().get(groupId);
    if (config) {
      this.setGroupConfig(groupId, { ...config, useGlobalConfig: useGlobal });
    }
  }
  
  // 獲取群組的有效配置（考慮全局/專屬）
  getEffectiveConfig(groupId: string): TriggerActionConfig {
    const groupConfig = this.groupConfigs().get(groupId);
    
    if (!groupConfig || groupConfig.useGlobalConfig) {
      return this.globalConfig();
    }
    
    // 合併覆蓋選項
    const baseConfig = groupConfig.customConfig || this.globalConfig();
    const overrides = groupConfig.overrides;
    
    if (!overrides) return baseConfig;
    
    return {
      ...baseConfig,
      mode: overrides.mode || baseConfig.mode,
      senderAccountIds: overrides.senderAccountIds || baseConfig.senderAccountIds
    };
  }
  
  // ========== 帳號角色管理 ==========
  
  setAccountRoles(accounts: AccountRoleConfig[]) {
    this.accountRoles.set(accounts);
  }
  
  updateAccountRole(accountId: number, updates: Partial<AccountRoleConfig>) {
    this.accountRoles.update(accounts => 
      accounts.map(a => a.accountId === accountId ? { ...a, ...updates } : a)
    );
  }
  
  assignRole(accountId: number, role: ExtendedAccountRole) {
    this.accountRoles.update(accounts => 
      accounts.map(a => {
        if (a.accountId !== accountId) return a;
        const roles = a.roles.includes(role) ? a.roles : [...a.roles, role];
        return { ...a, roles };
      })
    );
  }
  
  removeRole(accountId: number, role: ExtendedAccountRole) {
    this.accountRoles.update(accounts => 
      accounts.map(a => {
        if (a.accountId !== accountId) return a;
        const roles = a.roles.filter(r => r !== role);
        const primaryRole = a.primaryRole === role ? (roles[0] || 'backup') : a.primaryRole;
        return { ...a, roles, primaryRole };
      })
    );
  }
  
  setPrimaryRole(accountId: number, role: ExtendedAccountRole) {
    this.accountRoles.update(accounts => 
      accounts.map(a => {
        if (a.accountId !== accountId) return a;
        // 確保角色列表中包含該角色
        const roles = a.roles.includes(role) ? a.roles : [...a.roles, role];
        return { ...a, roles, primaryRole: role };
      })
    );
  }
  
  // ========== 觸發執行 ==========
  
  /**
   * 執行觸發動作
   */
  async executeTrigger(params: {
    groupId: string;
    userId: string;
    userName: string;
    message: string;
    matchedKeyword: string;
  }): Promise<{
    success: boolean;
    action: TriggerActionMode;
    result?: any;
    error?: string;
  }> {
    const config = this.getEffectiveConfig(params.groupId);
    
    if (!config.isActive) {
      return { success: false, action: config.mode, error: '觸發動作未啟用' };
    }
    
    try {
      switch (config.mode) {
        case 'ai_smart':
          return await this.executeAISmartAction(params, config);
        
        case 'template_send':
          return await this.executeTemplateSendAction(params, config);
        
        case 'multi_role':
          return await this.executeMultiRoleAction(params, config);
        
        case 'record_only':
          return await this.executeRecordOnlyAction(params, config);
        
        case 'notify_human':
          return await this.executeNotifyHumanAction(params, config);
        
        default:
          return { success: false, action: config.mode, error: '未知的動作模式' };
      }
    } catch (error) {
      return { 
        success: false, 
        action: config.mode, 
        error: error instanceof Error ? error.message : '執行失敗' 
      };
    }
  }
  
  private async executeAISmartAction(
    params: { groupId: string; userId: string; userName: string; message: string },
    config: TriggerActionConfig
  ) {
    const aiConfig = config.aiSmartConfig;
    if (!aiConfig) {
      return { success: false, action: 'ai_smart' as const, error: 'AI 配置缺失' };
    }
    
    try {
      // 使用對話引擎生成完整回覆
      const replyResult = await this.conversationEngine.generateReply(
        params.message,
        {
          userId: params.userId,
          userName: params.userName,
          sourceGroup: params.groupId,
          useKnowledgeBase: aiConfig.useAICenterConfig
        }
      );
      
      // 檢查是否需要轉人工
      if (replyResult.shouldHandoff) {
        // 檢查配置是否允許自動轉人工
        const shouldHandoff = 
          (aiConfig.humanHandoff.onPurchaseIntent && replyResult.intent.intent === 'purchase_intent') ||
          (aiConfig.humanHandoff.onNegativeSentiment && replyResult.intent.sentiment === 'negative');
        
        if (shouldHandoff) {
          return { 
            success: true, 
            action: 'ai_smart' as const, 
            result: { 
              type: 'handoff',
              intent: replyResult.intent.intent,
              reason: replyResult.handoffReason || '需要人工處理',
              content: replyResult.content // 仍然提供回覆內容作為參考
            } 
          };
        }
      }
      
      // 計算延遲（使用配置或對話引擎建議的延遲）
      const delay = aiConfig.replyStrategy.simulateTyping 
        ? replyResult.delay 
        : this.calculateDelay(aiConfig.replyStrategy.delayMin, aiConfig.replyStrategy.delayMax);
      
      return {
        success: true,
        action: 'ai_smart' as const,
        result: {
          type: 'reply',
          content: replyResult.content,
          delay,
          senderAccountId: this.selectSenderAccount(config),
          intent: replyResult.intent.intent,
          confidence: replyResult.intent.confidence,
          sentiment: replyResult.intent.sentiment,
          triggeredRules: replyResult.triggeredRules.map(r => r.name),
          suggestedFollowUp: replyResult.suggestedFollowUp,
          metadata: replyResult.metadata
        }
      };
    } catch (error) {
      console.error('AI Smart Action failed:', error);
      return { 
        success: false, 
        action: 'ai_smart' as const, 
        error: error instanceof Error ? error.message : 'AI 處理失敗' 
      };
    }
  }
  
  private async executeTemplateSendAction(
    params: { groupId: string; userId: string; userName: string },
    config: TriggerActionConfig
  ) {
    const templateConfig = config.templateSendConfig;
    if (!templateConfig) {
      return { success: false, action: 'template_send' as const, error: '模板配置缺失' };
    }
    
    let content = templateConfig.templateContent;
    
    // 個性化處理
    if (templateConfig.sendStrategy.personalizeWithName) {
      content = content.replace('{name}', params.userName);
    }
    
    // Spintax 處理
    if (templateConfig.sendStrategy.useSpintax) {
      content = this.processSpintax(content);
    }
    
    const delay = this.calculateDelay(
      templateConfig.sendStrategy.delayMin,
      templateConfig.sendStrategy.delayMax
    );
    
    return {
      success: true,
      action: 'template_send' as const,
      result: {
        type: 'send',
        content,
        delay,
        senderAccountId: this.selectSenderAccount(config)
      }
    };
  }
  
  private async executeMultiRoleAction(
    params: { groupId: string; userId: string; userName: string; message: string },
    config: TriggerActionConfig
  ) {
    const multiConfig = config.multiRoleConfig;
    if (!multiConfig) {
      return { success: false, action: 'multi_role' as const, error: '多角色配置缺失' };
    }
    
    try {
      // 1. 識別意圖評分（使用對話引擎）
      const intentResult = await this.intentService.recognizeIntent(
        params.message, 
        params.userId,
        true
      );
      
      // 獲取用戶意向評分
      const userScore = this.intentService.getIntentScore4User(params.userId);
      
      // 2. 檢查是否滿足建群條件
      if (userScore < multiConfig.triggerConditions.intentScoreThreshold) {
        // 未達閾值，先進行普通 AI 對話
        const replyResult = await this.conversationEngine.generateReply(
          params.message,
          {
            userId: params.userId,
            userName: params.userName,
            sourceGroup: params.groupId
          }
        );
        
        return {
          success: true,
          action: 'multi_role' as const,
          result: {
            type: 'waiting',
            reason: '意向評分未達閾值，繼續培育',
            score: userScore,
            threshold: multiConfig.triggerConditions.intentScoreThreshold,
            reply: replyResult.content,
            delay: replyResult.delay
          }
        };
      }
      
      // 檢查對話輪數
      const context = this.intentService.getContext(params.userId);
      const conversationRounds = context?.messages.filter(m => m.role === 'user').length || 0;
      
      if (conversationRounds < multiConfig.triggerConditions.minConversationRounds) {
        return {
          success: true,
          action: 'multi_role' as const,
          result: {
            type: 'waiting',
            reason: `對話輪數不足（${conversationRounds}/${multiConfig.triggerConditions.minConversationRounds}）`,
            score: userScore
          }
        };
      }
      
      // 3. 滿足條件，創建協作群組
      const groupName = multiConfig.groupSettings.nameTemplate
        .replace('{客戶名}', params.userName);
      
      return {
        success: true,
        action: 'multi_role' as const,
        result: {
          type: 'create_group',
          groupName,
          targetUserId: params.userId,
          targetUserName: params.userName,
          roleAccounts: multiConfig.roleAccounts,
          scriptId: multiConfig.scriptId,
          intentScore: userScore,
          intent: intentResult.intent,
          inviteMessage: multiConfig.groupSettings.inviteMessage
        }
      };
    } catch (error) {
      console.error('Multi-role action failed:', error);
      return { 
        success: false, 
        action: 'multi_role' as const, 
        error: error instanceof Error ? error.message : '多角色處理失敗' 
      };
    }
  }
  
  private async executeRecordOnlyAction(
    params: { groupId: string; userId: string; userName: string; matchedKeyword: string },
    config: TriggerActionConfig
  ) {
    const recordConfig = config.recordOnlyConfig;
    
    return {
      success: true,
      action: 'record_only' as const,
      result: {
        type: 'record',
        leadData: {
          userId: params.userId,
          userName: params.userName,
          sourceGroup: params.groupId,
          matchedKeyword: params.matchedKeyword,
          tags: recordConfig?.autoTag || [],
          stage: recordConfig?.autoStage || 'New'
        }
      }
    };
  }
  
  private async executeNotifyHumanAction(
    params: { groupId: string; userId: string; userName: string; message: string },
    config: TriggerActionConfig
  ) {
    const notifyConfig = config.notifyHumanConfig;
    if (!notifyConfig) {
      return { success: false, action: 'notify_human' as const, error: '通知配置缺失' };
    }
    
    return {
      success: true,
      action: 'notify_human' as const,
      result: {
        type: 'notify',
        channels: notifyConfig.notificationChannels,
        recipients: notifyConfig.notifyUserIds,
        urgency: notifyConfig.urgencyLevel,
        assignTo: notifyConfig.autoAssignTo,
        data: {
          userId: params.userId,
          userName: params.userName,
          message: params.message,
          groupId: params.groupId
        }
      }
    };
  }
  
  // ========== 輔助方法 ==========
  
  private calculateDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  private selectSenderAccount(config: TriggerActionConfig): number | undefined {
    const accounts = config.senderAccountIds;
    if (accounts.length === 0) return undefined;
    
    switch (config.accountRotationStrategy) {
      case 'random':
        return accounts[Math.floor(Math.random() * accounts.length)];
      case 'sequential':
        // TODO: 實現順序輪換邏輯
        return accounts[0];
      case 'load_balance':
        // TODO: 實現負載均衡邏輯
        return accounts[0];
      default:
        return accounts[0];
    }
  }
  
  private processSpintax(text: string): string {
    // 處理 {選項1|選項2|選項3} 格式
    return text.replace(/\{([^{}]+)\}/g, (_, options) => {
      const choices = options.split('|');
      return choices[Math.floor(Math.random() * choices.length)];
    });
  }
  
  // ========== 統計更新 ==========
  
  updateStats(mode: TriggerActionMode, success: boolean, conversion: boolean = false) {
    this.globalConfig.update(c => ({
      ...c,
      stats: {
        triggered: c.stats.triggered + 1,
        successful: c.stats.successful + (success ? 1 : 0),
        failed: c.stats.failed + (success ? 0 : 1),
        conversions: c.stats.conversions + (conversion ? 1 : 0)
      }
    }));
  }
}
