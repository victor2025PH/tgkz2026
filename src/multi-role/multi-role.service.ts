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
  
  // 協作任務（含進行中/已完成/失敗）
  private _allGroups = signal<CollaborationGroup[]>([]);
  private _isLoadingGroups = signal(false);

  // 計算屬性
  roles = computed(() => this.config().roles);
  scripts = computed(() => this.config().scripts);

  /** 所有協作任務（後端數據 + 本地新建） */
  allGroups = computed(() => this._allGroups());

  /** 進行中的協作任務計數 */
  activeGroupCount = computed(() =>
    this._allGroups().filter(g => g.status === 'creating' || g.status === 'inviting' || g.status === 'running').length
  );

  /** 是否正在加載後端任務 */
  isLoadingGroups = computed(() => this._isLoadingGroups());

  // 可用角色（已綁定帳號且活躍）
  availableRoles = computed(() => 
    this.config().roles.filter(r => r.isActive && r.boundAccountId)
  );
  
  // 角色類型元數據
  roleTypeMeta = ROLE_TYPE_META;

  // ========== 後端數據同步 ==========

  /**
   * 從後端加載協作任務列表
   */
  loadGroupsFromBackend(): void {
    this._isLoadingGroups.set(true);
    this.ipc.invoke('get-collab-groups', {}).then((data: any) => {
      if (Array.isArray(data)) {
        // 將後端格式轉為前端格式，合併本地新建的任務
        const backendGroups: CollaborationGroup[] = data.map((g: any) => ({
          id: g.id || `collab_${Date.now()}`,
          telegramGroupId: g.telegram_group_id || g.telegramGroupId,
          groupTitle: g.group_title || g.groupTitle || g.name || '協作群組',
          targetCustomer: {
            id: g.target_user_id || g.targetCustomer?.id || '',
            username: g.target_username || g.targetCustomer?.username,
            firstName: g.target_name || g.targetCustomer?.firstName,
            intentScore: g.intent_score || g.targetCustomer?.intentScore || 50,
            source: g.source || g.targetCustomer?.source || 'ai-planner'
          },
          participants: g.participants || [],
          scriptId: g.script_id || g.scriptId || '',
          scriptName: g.script_name || g.scriptName || g.goal || '協作任務',
          status: this._normalizeStatus(g.status),
          currentStageId: g.current_stage_id || g.currentStageId,
          currentStageOrder: g.current_stage_order ?? g.currentStageOrder,
          messagesSent: g.messages_sent || g.messagesSent || 0,
          customerMessages: g.customer_messages || g.customerMessages || 0,
          outcome: g.outcome,
          createdAt: g.created_at || g.createdAt || new Date().toISOString(),
          completedAt: g.completed_at || g.completedAt
        }));
        // 保留本地剛創建（後端可能尚未有）的任務
        const localOnly = this._allGroups().filter(
          local => !backendGroups.some(bg => bg.id === local.id)
        );
        this._allGroups.set([...backendGroups, ...localOnly]);
      }
    }).catch(() => {
      // 後端離線時靜默失敗，保留本地任務
    }).finally(() => {
      this._isLoadingGroups.set(false);
    });
  }

  private _normalizeStatus(raw: string): CollaborationGroup['status'] {
    const map: Record<string, CollaborationGroup['status']> = {
      creating: 'creating', inviting: 'inviting', running: 'running',
      active: 'running', paused: 'paused', completed: 'completed',
      done: 'completed', failed: 'failed', error: 'failed'
    };
    return map[raw?.toLowerCase()] || 'running';
  }

  /**
   * 新增本地協作任務記錄（AI 策劃完成時調用）
   */
  addTaskRecord(task: {
    goal: string;
    rolesUsed: { roleId: string; roleName: string; roleIcon: string; accountId: number; accountPhone: string }[];
    targetUsers: { id: string; username?: string; firstName?: string; intentScore: number }[];
    scriptName?: string;
  }): string {
    const id = `task_${Date.now()}`;
    const firstTarget = task.targetUsers[0];

    const group: CollaborationGroup = {
      id,
      groupTitle: firstTarget
        ? `${firstTarget.firstName || firstTarget.username || 'VIP客戶'} 協作`
        : task.goal.substring(0, 20),
      targetCustomer: {
        id: firstTarget?.id || id,
        username: firstTarget?.username,
        firstName: firstTarget?.firstName,
        intentScore: firstTarget?.intentScore || 70,
        source: 'ai-planner'
      },
      participants: task.rolesUsed.map(r => ({
        roleId: r.roleId,
        roleName: r.roleName,
        accountId: r.accountId,
        accountPhone: r.accountPhone
      })),
      scriptId: id,
      scriptName: task.scriptName || task.goal,
      status: 'running',
      messagesSent: 0,
      customerMessages: 0,
      createdAt: new Date().toISOString()
    };

    this._allGroups.update(list => [group, ...list]);

    // 同步到後端
    this.ipc.send('collab-task-created', {
      id,
      goal: task.goal,
      participants: group.participants,
      targetUser: group.targetCustomer,
      scriptName: group.scriptName
    });

    return id;
  }

  /**
   * 監聽後端推送的任務狀態更新
   */
  setupGroupIpcListeners(): (() => void)[] {
    const cleanups: (() => void)[] = [];

    cleanups.push(this.ipc.on('collab-group-updated', (data: any) => {
      if (!data?.id) return;
      this._allGroups.update(list =>
        list.map(g => g.id === data.id ? {
          ...g,
          status: this._normalizeStatus(data.status),
          messagesSent: data.messages_sent ?? g.messagesSent,
          customerMessages: data.customer_messages ?? g.customerMessages,
          currentStageOrder: data.stage_order ?? g.currentStageOrder,
          outcome: data.outcome ?? g.outcome,
          completedAt: data.completed_at ?? g.completedAt
        } : g)
      );
    }));

    cleanups.push(this.ipc.on('collab-group-completed', (data: any) => {
      if (!data?.id) return;
      this._allGroups.update(list =>
        list.map(g => g.id === data.id ? {
          ...g, status: 'completed',
          outcome: data.outcome || 'pending',
          completedAt: new Date().toISOString()
        } : g)
      );
    }));

    return cleanups;
  }
  
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
    const runningCount = this._allGroups().filter(g => 
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
    
    this._allGroups.update(groups => [...groups, newGroup]);
    
    // 同步到後端
    this.ipc.send('collab-task-created', { id: newGroup.id, scriptName: script.name, targetUser: params.targetCustomer });
    
    return newGroup;
  }
  
  updateGroupStatus(groupId: string, status: CollaborationGroup['status']) {
    this._allGroups.update(groups => 
      groups.map(g => g.id === groupId ? { ...g, status } : g)
    );
    this.ipc.send('collab-task-updated', { id: groupId, status });
  }
  
  completeGroup(groupId: string, outcome: CollaborationGroup['outcome']) {
    this._allGroups.update(groups => 
      groups.map(g => g.id === groupId ? { 
        ...g, 
        status: 'completed',
        outcome,
        completedAt: new Date().toISOString()
      } : g)
    );
    this.ipc.send('collab-task-updated', { id: groupId, status: 'completed', outcome });
  }
  
  // ========== 劇本執行 ==========
  
  /**
   * 開始執行劇本
   */
  async startScriptExecution(groupId: string): Promise<boolean> {
    const group = this._allGroups().find(g => g.id === groupId);
    if (!group || group.status !== 'running') return false;
    
    const script = this.config().scripts.find(s => s.id === group.scriptId);
    if (!script || script.stages.length === 0) return false;
    
    // 設置當前階段為第一個階段
    this._allGroups.update(groups => 
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
      this._allGroups.update(groups => 
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
    this._allGroups.set([]);
  }
}
