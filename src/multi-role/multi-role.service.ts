/**
 * 多角色協作服務
 * Multi-Role Collaboration Service
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import {
  MultiRoleConfig,
  RoleDefinition,
  ScriptTemplate,
  CollaborationGroup,
  RoleType,
  SpeakingStyle,
  ROLE_TYPE_META,
  DEFAULT_MULTI_ROLE_CONFIG,
  ScriptStage
} from './multi-role.models';
import { AICenterService } from '../ai-center/ai-center.service';
import { ConversationEngineService } from '../ai-center/conversation-engine.service';
import { ElectronIpcService } from '../electron-ipc.service';

@Injectable({
  providedIn: 'root'
})
export class MultiRoleService {
  private aiCenter = inject(AICenterService);
  private conversationEngine = inject(ConversationEngineService);
  private ipc = inject(ElectronIpcService);
  
  // 配置
  private config = signal<MultiRoleConfig>(DEFAULT_MULTI_ROLE_CONFIG);
  
  // 活躍的協作群組
  private activeGroups = signal<CollaborationGroup[]>([]);
  
  // 計算屬性
  roles = computed(() => this.config().roles);
  scripts = computed(() => this.config().scripts);
  activeGroupCount = computed(() => 
    this.activeGroups().filter(g => g.status === 'running').length
  );
  
  // 可用角色（已綁定帳號且活躍）
  availableRoles = computed(() => 
    this.config().roles.filter(r => r.isActive && r.boundAccountId)
  );
  
  // 角色類型元數據
  roleTypeMeta = ROLE_TYPE_META;
  
  // ========== 角色管理 ==========
  
  addRole(roleData: Partial<RoleDefinition>): string {
    const id = `role_${Date.now()}`;
    const roleType = roleData.type || 'custom';
    const meta = ROLE_TYPE_META[roleType];
    
    const newRole: RoleDefinition = {
      id,
      name: roleData.name || meta.label,
      type: roleType,
      boundAccountId: roleData.boundAccountId,
      boundAccountPhone: roleData.boundAccountPhone,
      personality: {
        description: roleData.personality?.description || meta.description,
        speakingStyle: roleData.personality?.speakingStyle || meta.defaultStyle,
        traits: roleData.personality?.traits || [],
        background: roleData.personality?.background
      },
      aiConfig: {
        useGlobalAI: true,
        customPrompt: meta.defaultPrompt,
        responseLength: 'medium',
        emojiFrequency: 'low',
        typingSpeed: 'medium',
        ...roleData.aiConfig
      },
      responsibilities: roleData.responsibilities || [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.config.update(c => ({
      ...c,
      roles: [...c.roles, newRole]
    }));
    
    // 同步到後端
    this.ipc.send('multi-role-add-role', newRole);
    
    return id;
  }
  
  updateRole(id: string, updates: Partial<RoleDefinition>) {
    this.config.update(c => ({
      ...c,
      roles: c.roles.map(r => 
        r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
      )
    }));
    
    // 同步到後端
    this.ipc.send('multi-role-update-role', { id, ...updates });
  }
  
  deleteRole(id: string) {
    this.config.update(c => ({
      ...c,
      roles: c.roles.filter(r => r.id !== id)
    }));
    
    // 同步到後端
    this.ipc.send('multi-role-delete-role', { id });
  }
  
  bindAccountToRole(roleId: string, accountId: number, accountPhone: string) {
    this.updateRole(roleId, { 
      boundAccountId: accountId, 
      boundAccountPhone: accountPhone 
    });
  }
  
  unbindAccountFromRole(roleId: string) {
    this.updateRole(roleId, { 
      boundAccountId: undefined, 
      boundAccountPhone: undefined 
    });
  }
  
  // ========== 劇本管理 ==========
  
  addScript(scriptData: Partial<ScriptTemplate>): string {
    const id = `script_${Date.now()}`;
    
    const newScript: ScriptTemplate = {
      id,
      name: scriptData.name || '新劇本',
      description: scriptData.description || '',
      scenario: scriptData.scenario || 'custom',
      requiredRoles: scriptData.requiredRoles || ['expert', 'satisfied_customer'],
      minRoleCount: scriptData.minRoleCount || 2,
      stages: scriptData.stages || [],
      stats: {
        useCount: 0,
        successCount: 0,
        avgDuration: 0,
        conversionRate: 0
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.config.update(c => ({
      ...c,
      scripts: [...c.scripts, newScript]
    }));
    
    // 同步到後端
    this.ipc.send('multi-role-add-script', newScript);
    
    return id;
  }
  
  updateScript(id: string, updates: Partial<ScriptTemplate>) {
    this.config.update(c => ({
      ...c,
      scripts: c.scripts.map(s => 
        s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
      )
    }));
    
    // 同步到後端
    this.ipc.send('multi-role-update-script', { id, ...updates });
  }
  
  deleteScript(id: string) {
    this.config.update(c => ({
      ...c,
      scripts: c.scripts.filter(s => s.id !== id)
    }));
    
    // 同步到後端
    this.ipc.send('multi-role-delete-script', { id });
  }
  
  addStageToScript(scriptId: string, stage: ScriptStage) {
    this.config.update(c => ({
      ...c,
      scripts: c.scripts.map(s => {
        if (s.id !== scriptId) return s;
        return {
          ...s,
          stages: [...s.stages, stage],
          updatedAt: new Date().toISOString()
        };
      })
    }));
  }
  
  // ========== 協作群組管理 ==========
  
  /**
   * 創建協作群組（自動建群）
   */
  async createCollaborationGroup(params: {
    targetCustomer: CollaborationGroup['targetCustomer'];
    scriptId: string;
    roleIds: string[];
  }): Promise<CollaborationGroup | null> {
    const script = this.config().scripts.find(s => s.id === params.scriptId);
    if (!script) return null;
    
    const roles = this.config().roles.filter(r => params.roleIds.includes(r.id));
    if (roles.length < script.minRoleCount) return null;
    
    // 檢查是否超過最大同時協作數
    const runningCount = this.activeGroups().filter(g => 
      g.status === 'creating' || g.status === 'inviting' || g.status === 'running'
    ).length;
    
    if (runningCount >= this.config().autoGroupSettings.maxConcurrentGroups) {
      return null;
    }
    
    const settings = this.config().autoGroupSettings;
    const groupTitle = settings.nameTemplate
      .replace('{客戶名}', params.targetCustomer.firstName || params.targetCustomer.username || 'VIP客戶');
    
    const newGroup: CollaborationGroup = {
      id: `collab_${Date.now()}`,
      groupTitle,
      targetCustomer: params.targetCustomer,
      participants: roles.map(r => ({
        roleId: r.id,
        roleName: r.name,
        accountId: r.boundAccountId!,
        accountPhone: r.boundAccountPhone!
      })),
      scriptId: params.scriptId,
      scriptName: script.name,
      status: 'creating',
      messagesSent: 0,
      customerMessages: 0,
      createdAt: new Date().toISOString()
    };
    
    this.activeGroups.update(groups => [...groups, newGroup]);
    
    // TODO: 實際創建 Telegram 群組
    // await this.createTelegramGroup(newGroup);
    
    return newGroup;
  }
  
  updateGroupStatus(groupId: string, status: CollaborationGroup['status']) {
    this.activeGroups.update(groups => 
      groups.map(g => g.id === groupId ? { ...g, status } : g)
    );
  }
  
  completeGroup(groupId: string, outcome: CollaborationGroup['outcome']) {
    this.activeGroups.update(groups => 
      groups.map(g => g.id === groupId ? { 
        ...g, 
        status: 'completed',
        outcome,
        completedAt: new Date().toISOString()
      } : g)
    );
  }
  
  // ========== 劇本執行 ==========
  
  /**
   * 開始執行劇本
   */
  async startScriptExecution(groupId: string): Promise<boolean> {
    const group = this.activeGroups().find(g => g.id === groupId);
    if (!group || group.status !== 'running') return false;
    
    const script = this.config().scripts.find(s => s.id === group.scriptId);
    if (!script || script.stages.length === 0) return false;
    
    // 設置當前階段為第一個階段
    this.activeGroups.update(groups => 
      groups.map(g => g.id === groupId ? { 
        ...g, 
        currentStageId: script.stages[0].id,
        currentStageOrder: 0
      } : g)
    );
    
    // TODO: 開始執行第一個階段
    // await this.executeStage(group, script.stages[0]);
    
    return true;
  }
  
  /**
   * 執行劇本階段
   */
  private async executeStage(group: CollaborationGroup, stage: ScriptStage) {
    const roles = this.config().roles;
    
    for (const message of stage.messages) {
      const role = roles.find(r => r.id === message.roleId);
      if (!role) continue;
      
      // 計算延遲
      let delay = message.timing.delayAfterPrevious;
      if (message.timing.randomDelay) {
        const { min, max } = message.timing.randomDelay;
        delay += Math.floor(Math.random() * (max - min + 1)) + min;
      }
      
      // 等待延遲
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
      
      // 生成消息內容
      let content: string;
      if (message.content.type === 'text') {
        content = message.content.text || '';
        // 處理變量替換
        if (message.content.variables) {
          content = content
            .replace('{客戶名}', group.targetCustomer.firstName || group.targetCustomer.username || 'VIP客戶')
            .replace('{群名}', group.groupTitle);
        }
      } else if (message.content.type === 'ai_generate') {
        // 使用對話引擎生成多角色回覆
        const replyResult = await this.conversationEngine.generateMultiRoleReply(
          message.content.aiPrompt || '請根據當前對話上下文生成合適的回覆',
          {
            roleId: role.id,
            roleName: role.name,
            rolePrompt: role.aiConfig.customPrompt || '',
            personality: role.personality.description
          },
          {
            userId: group.targetCustomer.id,
            userName: group.targetCustomer.firstName || group.targetCustomer.username,
            sourceGroup: group.telegramGroupId || group.id
          }
        );
        content = replyResult.content;
      } else {
        content = message.content.text || '';
      }
      
      // TODO: 發送消息
      // await this.sendMessage(group, role, content);
      console.log(`[MultiRole] ${role.name}: ${content}`);
      
      // 更新統計
      this.activeGroups.update(groups => 
        groups.map(g => g.id === group.id ? { 
          ...g, 
          messagesSent: g.messagesSent + 1 
        } : g)
      );
    }
  }
  
  // ========== 設置管理 ==========
  
  updateAutoGroupSettings(updates: Partial<MultiRoleConfig['autoGroupSettings']>) {
    this.config.update(c => ({
      ...c,
      autoGroupSettings: { ...c.autoGroupSettings, ...updates }
    }));
  }
  
  updateTriggerConditions(updates: Partial<MultiRoleConfig['defaultTriggerConditions']>) {
    this.config.update(c => ({
      ...c,
      defaultTriggerConditions: { ...c.defaultTriggerConditions, ...updates }
    }));
  }
  
  updateAISettings(updates: Partial<MultiRoleConfig['aiSettings']>) {
    this.config.update(c => ({
      ...c,
      aiSettings: { ...c.aiSettings, ...updates }
    }));
  }
  
  // ========== 導入/導出 ==========
  
  exportConfig(): string {
    return JSON.stringify(this.config(), null, 2);
  }
  
  importConfig(jsonStr: string): boolean {
    try {
      const config = JSON.parse(jsonStr) as MultiRoleConfig;
      this.config.set(config);
      return true;
    } catch {
      return false;
    }
  }
  
  // ========== 重置 ==========
  
  resetToDefault() {
    this.config.set(DEFAULT_MULTI_ROLE_CONFIG);
    this.activeGroups.set([]);
  }
}
