/**
 * TG-AI智控王 權限控制服務
 * Permission Service v1.0
 * 
 * 💡 設計思考：
 * 1. RBAC 模型 - 基於角色的訪問控制
 * 2. 細粒度權限 - 支持到操作級別
 * 3. 動態權限 - 運行時可調整
 * 4. 權限繼承 - 角色可繼承權限
 * 5. 上下文感知 - 根據上下文動態調整
 */

import { Injectable, signal, computed, inject } from '@angular/core';
import { AuditService } from './audit.service';

// ============ 類型定義 ============

/** 資源類型 */
export type Resource = 
  | 'search'          // 搜索功能
  | 'member'          // 成員管理
  | 'group'           // 群組管理
  | 'message'         // 消息功能
  | 'export'          // 導出功能
  | 'automation'      // 自動化功能
  | 'analytics'       // 分析功能
  | 'account'         // 帳號管理
  | 'settings'        // 系統設置
  | 'admin';          // 管理員功能

/** 操作類型 */
export type Action = 
  | 'view'            // 查看
  | 'create'          // 創建
  | 'edit'            // 編輯
  | 'delete'          // 刪除
  | 'execute'         // 執行
  | 'export'          // 導出
  | 'import'          // 導入
  | 'manage';         // 管理

/** 權限定義 */
export interface Permission {
  resource: Resource;
  action: Action;
  conditions?: PermissionCondition[];
}

/** 權限條件 */
export interface PermissionCondition {
  type: 'time' | 'quota' | 'membership' | 'custom';
  params: Record<string, any>;
}

/** 角色定義 */
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  inherits?: string[];  // 繼承的角色
  isBuiltIn: boolean;
}

/** 用戶權限上下文 */
export interface PermissionContext {
  userId?: string;
  membershipLevel?: string;
  accountCount?: number;
  dailyUsage?: Record<string, number>;
  timeOfDay?: number;
  deviceTrust?: 'high' | 'medium' | 'low';
}

/** 權限檢查結果 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredLevel?: string;
  suggestions?: string[];
}

// ============ 預定義角色 ============

const BUILT_IN_ROLES: Role[] = [
  {
    id: 'free',
    name: '免費用戶',
    description: '基礎功能',
    isBuiltIn: true,
    permissions: [
      { resource: 'search', action: 'view' },
      { resource: 'search', action: 'execute', conditions: [{ type: 'quota', params: { max: 10, period: 'day' } }] },
      { resource: 'member', action: 'view' },
      { resource: 'group', action: 'view' },
      { resource: 'settings', action: 'view' },
      { resource: 'settings', action: 'edit' }
    ]
  },
  {
    id: 'vip',
    name: 'VIP 用戶',
    description: '進階功能',
    isBuiltIn: true,
    inherits: ['free'],
    permissions: [
      { resource: 'search', action: 'execute', conditions: [{ type: 'quota', params: { max: 100, period: 'day' } }] },
      { resource: 'member', action: 'export', conditions: [{ type: 'quota', params: { max: 1000, period: 'day' } }] },
      { resource: 'message', action: 'execute', conditions: [{ type: 'quota', params: { max: 50, period: 'day' } }] },
      { resource: 'export', action: 'execute' },
      { resource: 'analytics', action: 'view' }
    ]
  },
  {
    id: 'svip',
    name: 'SVIP 用戶',
    description: '專業功能',
    isBuiltIn: true,
    inherits: ['vip'],
    permissions: [
      { resource: 'search', action: 'execute', conditions: [{ type: 'quota', params: { max: 500, period: 'day' } }] },
      { resource: 'member', action: 'export', conditions: [{ type: 'quota', params: { max: 5000, period: 'day' } }] },
      { resource: 'message', action: 'execute', conditions: [{ type: 'quota', params: { max: 200, period: 'day' } }] },
      { resource: 'automation', action: 'view' },
      { resource: 'automation', action: 'execute' },
      { resource: 'account', action: 'manage', conditions: [{ type: 'quota', params: { max: 5 } }] }
    ]
  },
  {
    id: 'mvp',
    name: 'MVP 用戶',
    description: '頂級功能',
    isBuiltIn: true,
    inherits: ['svip'],
    permissions: [
      { resource: 'search', action: 'execute' },  // 無限制
      { resource: 'member', action: 'export' },   // 無限制
      { resource: 'message', action: 'execute' }, // 無限制
      { resource: 'automation', action: 'manage' },
      { resource: 'analytics', action: 'manage' },
      { resource: 'account', action: 'manage' }   // 無限制
    ]
  },
  {
    id: 'admin',
    name: '管理員',
    description: '完全控制',
    isBuiltIn: true,
    permissions: [
      { resource: 'search', action: 'manage' },
      { resource: 'member', action: 'manage' },
      { resource: 'group', action: 'manage' },
      { resource: 'message', action: 'manage' },
      { resource: 'export', action: 'manage' },
      { resource: 'automation', action: 'manage' },
      { resource: 'analytics', action: 'manage' },
      { resource: 'account', action: 'manage' },
      { resource: 'settings', action: 'manage' },
      { resource: 'admin', action: 'manage' }
    ]
  }
];

// ============ 操作層級 ============

const ACTION_HIERARCHY: Record<Action, Action[]> = {
  'manage': ['view', 'create', 'edit', 'delete', 'execute', 'export', 'import'],
  'delete': ['view'],
  'edit': ['view'],
  'create': ['view'],
  'execute': ['view'],
  'export': ['view'],
  'import': ['view'],
  'view': []
};

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private audit = inject(AuditService);
  
  // 角色列表
  private roles = new Map<string, Role>();
  
  // 當前用戶角色
  private _currentRole = signal<Role | null>(null);
  currentRole = computed(() => this._currentRole());
  
  // 權限上下文
  private _context = signal<PermissionContext>({});
  context = computed(() => this._context());
  
  // 日用量追蹤
  private dailyUsage = new Map<string, number>();
  
  constructor() {
    this.initializeRoles();
    this.loadDailyUsage();
  }
  
  // ============ 初始化 ============
  
  private initializeRoles(): void {
    for (const role of BUILT_IN_ROLES) {
      this.roles.set(role.id, role);
    }
  }
  
  private loadDailyUsage(): void {
    const stored = localStorage.getItem('tgai-daily-usage');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        // 檢查是否是今天的數據
        if (data.date === new Date().toDateString()) {
          this.dailyUsage = new Map(Object.entries(data.usage));
        }
      } catch {
        // 忽略解析錯誤
      }
    }
  }
  
  private saveDailyUsage(): void {
    localStorage.setItem('tgai-daily-usage', JSON.stringify({
      date: new Date().toDateString(),
      usage: Object.fromEntries(this.dailyUsage)
    }));
  }
  
  // ============ 角色管理 ============
  
  /**
   * 設置當前用戶角色
   */
  setRole(roleId: string): boolean {
    const role = this.roles.get(roleId);
    if (role) {
      this._currentRole.set(role);
      return true;
    }
    return false;
  }
  
  /**
   * 根據會員等級設置角色
   */
  setRoleByMembership(level: string): void {
    const mapping: Record<string, string> = {
      'free': 'free',
      'bronze': 'free',
      'silver': 'vip',
      'gold': 'svip',
      'diamond': 'svip',
      'star': 'mvp',
      'king': 'admin'
    };
    
    const roleId = mapping[level.toLowerCase()] || 'free';
    this.setRole(roleId);
    this.updateContext({ membershipLevel: level });
  }
  
  /**
   * 獲取角色的所有權限（包括繼承）
   */
  getRolePermissions(roleId: string): Permission[] {
    const role = this.roles.get(roleId);
    if (!role) return [];
    
    const permissions: Permission[] = [...role.permissions];
    
    // 處理繼承
    if (role.inherits) {
      for (const inheritedRoleId of role.inherits) {
        const inheritedPermissions = this.getRolePermissions(inheritedRoleId);
        for (const perm of inheritedPermissions) {
          // 避免重複
          if (!permissions.some(p => 
            p.resource === perm.resource && p.action === perm.action
          )) {
            permissions.push(perm);
          }
        }
      }
    }
    
    return permissions;
  }
  
  /**
   * 添加自定義角色
   */
  addRole(role: Role): void {
    if (role.isBuiltIn) {
      throw new Error('Cannot add built-in role');
    }
    this.roles.set(role.id, role);
  }
  
  // ============ 權限檢查 ============
  
  /**
   * 檢查是否有權限
   */
  check(resource: Resource, action: Action): PermissionCheckResult {
    const role = this._currentRole();
    
    if (!role) {
      return {
        allowed: false,
        reason: '未登錄或角色未設置',
        suggestions: ['請先登錄']
      };
    }
    
    const permissions = this.getRolePermissions(role.id);
    
    // 查找匹配的權限
    const matchingPermission = this.findMatchingPermission(permissions, resource, action);
    
    if (!matchingPermission) {
      return {
        allowed: false,
        reason: `無 ${resource}/${action} 權限`,
        requiredLevel: this.findRequiredLevel(resource, action),
        suggestions: this.getSuggestions(resource, action)
      };
    }
    
    // 檢查條件
    if (matchingPermission.conditions) {
      const conditionResult = this.checkConditions(matchingPermission.conditions, resource, action);
      if (!conditionResult.allowed) {
        return conditionResult;
      }
    }
    
    return { allowed: true };
  }
  
  /**
   * 便捷方法：是否有權限
   */
  can(resource: Resource, action: Action): boolean {
    return this.check(resource, action).allowed;
  }
  
  /**
   * 便捷方法：無權限時拋出錯誤
   */
  require(resource: Resource, action: Action): void {
    const result = this.check(resource, action);
    if (!result.allowed) {
      throw new Error(result.reason || `Permission denied: ${resource}/${action}`);
    }
  }
  
  /**
   * 執行帶權限檢查的操作
   */
  async execute<T>(
    resource: Resource,
    action: Action,
    operation: () => T | Promise<T>
  ): Promise<T> {
    const result = this.check(resource, action);
    
    if (!result.allowed) {
      // 記錄審計日誌
      await this.audit.warn('security_alert', {
        type: 'permission_denied',
        resource,
        action,
        reason: result.reason
      });
      
      throw new Error(result.reason);
    }
    
    // 執行操作
    const returnValue = await operation();
    
    // 更新用量
    this.incrementUsage(`${resource}:${action}`);
    
    return returnValue;
  }
  
  // ============ 條件檢查 ============
  
  private findMatchingPermission(
    permissions: Permission[],
    resource: Resource,
    action: Action
  ): Permission | undefined {
    // 直接匹配
    let match = permissions.find(p => 
      p.resource === resource && p.action === action
    );
    
    if (match) return match;
    
    // 檢查 manage 權限（包含所有操作）
    match = permissions.find(p => 
      p.resource === resource && p.action === 'manage'
    );
    
    if (match) return match;
    
    // 檢查操作層級
    for (const [parentAction, childActions] of Object.entries(ACTION_HIERARCHY)) {
      if (childActions.includes(action)) {
        match = permissions.find(p => 
          p.resource === resource && p.action === parentAction
        );
        if (match) return match;
      }
    }
    
    return undefined;
  }
  
  private checkConditions(
    conditions: PermissionCondition[],
    resource: Resource,
    action: Action
  ): PermissionCheckResult {
    for (const condition of conditions) {
      switch (condition.type) {
        case 'quota': {
          const key = `${resource}:${action}`;
          const current = this.dailyUsage.get(key) || 0;
          const max = condition.params.max;
          
          if (current >= max) {
            return {
              allowed: false,
              reason: `已達到每日限額 (${current}/${max})`,
              suggestions: ['升級會員以獲得更高配額', '等待明天重置']
            };
          }
          break;
        }
        
        case 'time': {
          const now = new Date();
          const hour = now.getHours();
          const { startHour, endHour } = condition.params;
          
          if (hour < startHour || hour >= endHour) {
            return {
              allowed: false,
              reason: `此功能僅在 ${startHour}:00 - ${endHour}:00 可用`,
              suggestions: ['在指定時間段內使用']
            };
          }
          break;
        }
        
        case 'membership': {
          const ctx = this._context();
          const requiredLevel = condition.params.minLevel;
          
          if (!this.meetsMembershipLevel(ctx.membershipLevel, requiredLevel)) {
            return {
              allowed: false,
              reason: `需要 ${requiredLevel} 或更高會員等級`,
              requiredLevel,
              suggestions: [`升級到 ${requiredLevel} 會員`]
            };
          }
          break;
        }
        
        case 'custom': {
          const checkFn = condition.params.check;
          if (typeof checkFn === 'function') {
            const result = checkFn(this._context());
            if (!result) {
              return {
                allowed: false,
                reason: condition.params.message || '自定義條件不滿足'
              };
            }
          }
          break;
        }
      }
    }
    
    return { allowed: true };
  }
  
  // ============ 用量管理 ============
  
  /**
   * 增加用量計數
   */
  incrementUsage(key: string, count = 1): void {
    const current = this.dailyUsage.get(key) || 0;
    this.dailyUsage.set(key, current + count);
    this.saveDailyUsage();
  }
  
  /**
   * 獲取當前用量
   */
  getUsage(resource: Resource, action: Action): number {
    return this.dailyUsage.get(`${resource}:${action}`) || 0;
  }
  
  /**
   * 獲取剩餘配額
   */
  getRemainingQuota(resource: Resource, action: Action): number | 'unlimited' {
    const permission = this.findMatchingPermission(
      this.getRolePermissions(this._currentRole()?.id || ''),
      resource,
      action
    );
    
    if (!permission) return 0;
    
    const quotaCondition = permission.conditions?.find(c => c.type === 'quota');
    if (!quotaCondition) return 'unlimited';
    
    const max = quotaCondition.params.max;
    const used = this.getUsage(resource, action);
    
    return Math.max(0, max - used);
  }
  
  // ============ 上下文管理 ============
  
  /**
   * 更新權限上下文
   */
  updateContext(updates: Partial<PermissionContext>): void {
    this._context.update(ctx => ({ ...ctx, ...updates }));
  }
  
  // ============ 輔助方法 ============
  
  private findRequiredLevel(resource: Resource, action: Action): string | undefined {
    // 從高到低檢查哪個等級有此權限
    const levels = ['free', 'vip', 'svip', 'mvp'];
    
    for (const level of levels) {
      const permissions = this.getRolePermissions(level);
      if (this.findMatchingPermission(permissions, resource, action)) {
        return level.toUpperCase();
      }
    }
    
    return 'MVP';
  }
  
  private getSuggestions(resource: Resource, action: Action): string[] {
    const suggestions: string[] = [];
    const requiredLevel = this.findRequiredLevel(resource, action);
    
    if (requiredLevel) {
      suggestions.push(`升級到 ${requiredLevel} 會員以解鎖此功能`);
    }
    
    return suggestions;
  }
  
  private meetsMembershipLevel(current?: string, required?: string): boolean {
    if (!required) return true;
    if (!current) return false;
    
    const levels = ['free', 'bronze', 'silver', 'gold', 'diamond', 'star', 'king'];
    const currentIndex = levels.indexOf(current.toLowerCase());
    const requiredIndex = levels.indexOf(required.toLowerCase());
    
    return currentIndex >= requiredIndex;
  }
  
  // ============ 權限信息 ============
  
  /**
   * 獲取當前角色的所有權限摘要
   */
  getPermissionSummary(): Record<Resource, Action[]> {
    const role = this._currentRole();
    if (!role) return {} as Record<Resource, Action[]>;
    
    const permissions = this.getRolePermissions(role.id);
    const summary: Record<Resource, Action[]> = {} as Record<Resource, Action[]>;
    
    for (const perm of permissions) {
      if (!summary[perm.resource]) {
        summary[perm.resource] = [];
      }
      if (!summary[perm.resource].includes(perm.action)) {
        summary[perm.resource].push(perm.action);
      }
    }
    
    return summary;
  }
  
  /**
   * 獲取功能可用性列表
   */
  getFeatureAvailability(): Record<string, boolean> {
    const features: Array<{ key: string; resource: Resource; action: Action }> = [
      { key: 'basicSearch', resource: 'search', action: 'execute' },
      { key: 'advancedSearch', resource: 'search', action: 'manage' },
      { key: 'memberExport', resource: 'member', action: 'export' },
      { key: 'bulkMessage', resource: 'message', action: 'execute' },
      { key: 'automation', resource: 'automation', action: 'execute' },
      { key: 'analytics', resource: 'analytics', action: 'view' },
      { key: 'multiAccount', resource: 'account', action: 'manage' },
      { key: 'adminPanel', resource: 'admin', action: 'view' }
    ];
    
    const availability: Record<string, boolean> = {};
    
    for (const feature of features) {
      availability[feature.key] = this.can(feature.resource, feature.action);
    }
    
    return availability;
  }
}
